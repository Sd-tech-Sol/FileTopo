import { invoke } from "@tauri-apps/api/core";
import { useEffect, useRef, useState } from "react";
import type {
  ApplicationMode,
  BrainNodeRef,
  ChangeEvent,
  ChangeJournalPage,
  ChangeNature,
  ChangeSummary,
  MapNodeKind,
  MarkAllSeenResult,
  MarkChangeSeenResult,
} from "./types";

/**
 * « Changements » — `TASK-0037` F, `P-16`.
 *
 * The journal is **read**, never computed here: every entry comes from the
 * brain's own Index through `map_change_journal`, one bounded page at a time
 * (50 at most, keyset cursor, newest first). The panel names a brain by its
 * id and a node by a {@link BrainNodeRef}; it never receives, builds or
 * displays an absolute path — only names and **relative** paths.
 *
 * Two honesty rules the wording keeps: the date is the instant FileTopo
 * **detected** a difference, not the instant the disk changed; and the order
 * inside one detection is the order of publication, not a real chronology.
 *
 * `TASK-0038` adds the seen/unseen state of each change (`DEC-0036`): a
 * per-change « Marquer vu », and « Tout marquer vu » behind an **explicit
 * inline confirmation** — the first gesture only opens the confirmation, and
 * « Annuler » never calls the backend. Nothing here marks anything seen by
 * being displayed, opened or paged. After every acknowledgement the visible
 * state is **re-read from the backend**, never assumed. A `Vu`/`Non vu` state
 * is always a word and a symbol, never a colour alone.
 */

const PAGE_LIMIT = 50;

export const NATURE_LABELS: Record<ChangeNature, string> = {
  CREATED: "Créé",
  MODIFIED: "Modifié",
  RENAMED: "Renommé",
  MOVED: "Déplacé",
  DELETED: "Supprimé",
};

const NATURE_ORDER: ChangeNature[] = ["CREATED", "MODIFIED", "RENAMED", "MOVED", "DELETED"];

const KIND_LABELS: Record<MapNodeKind, string> = {
  root: "racine",
  directory: "dossier",
  file: "fichier",
  skipped: "ignoré",
};

/** The one-line counters an Actualiser/Reconstruire report shows. */
export function describeChangeSummary(summary: ChangeSummary): string {
  if (summary.baselineEstablished) {
    return "Référence établie — les changements sont comptés à partir de l'actualisation suivante.";
  }
  if (summary.total === 0) return "Aucun changement détecté.";
  return (
    `${summary.total} changement(s) détecté(s) : ${summary.created} créé(s) · ` +
    `${summary.modified} modifié(s) · ${summary.renamed} renommé(s) · ` +
    `${summary.moved} déplacé(s) · ${summary.deleted} supprimé(s)`
  );
}

/**
 * `TASK-0041` — the discreet diagnostic naming how the last scan reached the
 * Index. A closed set of words; it says nothing about the tree.
 */
export function describeApplicationMode(mode: ApplicationMode): string {
  switch (mode) {
    case "BASELINE_FULL":
      return "Première indexation";
    case "INCREMENTAL":
      return "Mise à jour incrémentale";
    case "IDENTITY_RESTAMP_FULL":
      return "Ré-estampillage complet (ancien index)";
    case "EXPLICIT_REBUILD_FULL":
      return "Reconstruction complète";
  }
}

function detectedAt(unixMs: number): string {
  return new Intl.DateTimeFormat("fr-CA", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(unixMs),
  );
}

function shown(path: string | null): string {
  return path === null ? "—" : path === "" ? "(racine)" : path;
}

/** Relative paths and names only — what the event says about the node. */
function describe(event: ChangeEvent): string {
  switch (event.nature) {
    case "CREATED":
    case "MODIFIED":
      return shown(event.newRelativePath);
    case "DELETED":
      return shown(event.oldRelativePath);
    case "RENAMED":
    case "MOVED":
      return event.oldRelativePath === event.newRelativePath
        ? `${event.oldName ?? "—"} → ${event.newName ?? "—"}`
        : `${shown(event.oldRelativePath)} → ${shown(event.newRelativePath)}`;
  }
}

interface RevisionGroup {
  revision: number;
  detectedUnixMs: number;
  events: ChangeEvent[];
}

/** Consecutive events of one detection, in the order the page carries them. */
function groupByDetection(items: ChangeEvent[]): RevisionGroup[] {
  const groups: RevisionGroup[] = [];
  for (const event of items) {
    const last = groups[groups.length - 1];
    if (last && last.revision === event.detectedRevision) {
      last.events.push(event);
    } else {
      groups.push({
        revision: event.detectedRevision,
        detectedUnixMs: event.detectedUnixMs,
        events: [event],
      });
    }
  }
  return groups;
}

interface Props {
  brainId: string | null;
  /** The brain's current Index revision: a change of it reloads the first page. */
  revision: number | null;
  onSelect: (reference: BrainNodeRef) => void;
  /**
   * Bumped by whoever else marked something seen (the selected element's
   * panel): the page is then re-read from the backend.
   */
  seenRevision?: number;
  /** Called after this panel acknowledged something, so siblings re-read. */
  onSeenChange?: () => void;
}

export default function ChangeJournalPanel({
  brainId,
  revision,
  onSelect,
  seenRevision = 0,
  onSeenChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [natures, setNatures] = useState<ChangeNature[]>([]);
  // The `after` cursors used to reach the current page — the last entry is the
  // current page's own (`null` for the first) — so « Page précédente » pops.
  const [cursorStack, setCursorStack] = useState<(string | null)[]>([null]);
  const [page, setPage] = useState<ChangeJournalPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // `TASK-0038` — a re-read after an acknowledgement, and the state of the
  // one mutation in flight (they never overlap) and of the confirmation.
  const [reload, setReload] = useState(0);
  const [marking, setMarking] = useState(false);
  const [markError, setMarkError] = useState<string | null>(null);
  const [confirmingAll, setConfirmingAll] = useState(false);
  const ticket = useRef(0);

  // Another brain: nothing of the previous one — filter, position, page,
  // pending confirmation — is carried over.
  useEffect(() => {
    ticket.current += 1;
    setNatures([]);
    setCursorStack([null]);
    setPage(null);
    setError(null);
    setMarking(false);
    setMarkError(null);
    setConfirmingAll(false);
  }, [brainId]);

  // A new revision (Actualiser/Reconstruire) appended events at the top:
  // start again from the newest page, keeping the filters.
  useEffect(() => {
    setCursorStack([null]);
  }, [revision]);

  const after = cursorStack[cursorStack.length - 1] ?? null;

  useEffect(() => {
    if (!open || !brainId) return;
    const mine = ++ticket.current;
    setLoading(true);
    setError(null);
    invoke<ChangeJournalPage>("map_change_journal", {
      brainId,
      natures,
      after,
      limit: PAGE_LIMIT,
    })
      .then((next) => {
        if (mine !== ticket.current) return;
        if (next.brainId !== brainId) {
          setPage(null);
          setError("journal d'un autre cerveau refusé");
          return;
        }
        setPage(next);
      })
      .catch((reason) => {
        if (mine === ticket.current) setError(String(reason));
      })
      .finally(() => {
        if (mine === ticket.current) setLoading(false);
      });
  }, [open, brainId, revision, natures, after, reload, seenRevision]);

  /** Re-reads the visible page from the backend and lets siblings do the same. */
  function acknowledged() {
    setReload((current) => current + 1);
    onSeenChange?.();
  }

  async function markChangeSeen(eventId: number) {
    if (!brainId || marking) return;
    setMarking(true);
    setMarkError(null);
    try {
      const result = await invoke<MarkChangeSeenResult>("map_change_mark_seen", {
        brainId,
        eventId,
      });
      if (result.brainId !== brainId || result.eventId !== eventId) {
        setMarkError("réponse d'un autre cerveau refusée");
        return;
      }
      acknowledged();
    } catch (reason) {
      setMarkError(String(reason));
    } finally {
      setMarking(false);
    }
  }

  async function markAllSeen() {
    if (!brainId || marking) return;
    setMarking(true);
    setMarkError(null);
    try {
      const result = await invoke<MarkAllSeenResult>("map_change_mark_all_seen", { brainId });
      if (result.brainId !== brainId) {
        setMarkError("réponse d'un autre cerveau refusée");
        return;
      }
      setConfirmingAll(false);
      acknowledged();
    } catch (reason) {
      setMarkError(String(reason));
    } finally {
      setMarking(false);
    }
  }

  function toggleNature(nature: ChangeNature) {
    setNatures((current) =>
      current.includes(nature) ? current.filter((n) => n !== nature) : [...current, nature],
    );
    setCursorStack([null]);
  }

  function clearFilters() {
    setNatures([]);
    setCursorStack([null]);
  }

  const groups = page ? groupByDetection(page.items) : [];
  const pageNumber = cursorStack.length;
  const filtered = natures.length > 0;

  return (
    <section className="journal" aria-label="Changements" data-testid="change-journal">
      <h2 className="journal__title">Changements</h2>
      <button
        type="button"
        className="journal__toggle"
        data-testid="journal-toggle"
        aria-expanded={open}
        disabled={!brainId}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? "Masquer les changements" : "Afficher les changements"}
      </button>
      <p className="journal__boundary" data-testid="journal-boundary">
        <strong>Changements détectés à chaque actualisation.</strong> La date est celle de la
        détection par FileTopo, pas celle de la modification sur le disque; l'ordre dans une même
        actualisation n'est pas la chronologie réelle des opérations.
      </p>
      {open ? (
        <div className="journal__body">
          <div role="group" aria-label="Filtrer par nature" className="journal__filters">
            {NATURE_ORDER.map((nature) => (
              <label key={nature} className="journal__filter">
                <input
                  type="checkbox"
                  data-testid={`journal-filter-${nature}`}
                  checked={natures.includes(nature)}
                  onChange={() => toggleNature(nature)}
                />{" "}
                {NATURE_LABELS[nature]}
              </label>
            ))}
            {filtered ? (
              <button type="button" data-testid="journal-clear-filters" onClick={clearFilters}>
                Retirer les filtres
              </button>
            ) : null}
          </div>

          {error ? (
            <p role="alert" data-testid="journal-error">
              Journal indisponible : {error}{" "}
              <button type="button" onClick={() => setCursorStack([null])}>
                Recommencer
              </button>
            </p>
          ) : null}
          {loading && page === null ? <p>Lecture du journal…</p> : null}

          {page ? (
            <>
              <p
                data-testid="journal-total"
                data-total={page.total}
                data-limit={page.limit}
                data-index-revision={page.indexRevision}
                aria-live="polite"
              >
                {page.total} changement(s){filtered ? " pour ces filtres" : ""} · page {pageNumber}
              </p>
              <div className="journal__seen" data-testid="journal-seen-controls">
                <p
                  data-testid="journal-unseen-total"
                  data-unseen-total={page.unseenTotal}
                  aria-live="polite"
                >
                  {page.unseenTotal === 0
                    ? "Tous les changements sont vus."
                    : `${page.unseenTotal} changement(s) non vu(s) dans ce cerveau.`}
                </p>
                {confirmingAll ? (
                  <div role="alertdialog" aria-label="Confirmer : tout marquer vu" data-testid="journal-mark-all-confirm">
                    <p>
                      Marquer <strong>les {page.unseenTotal} changement(s) non vu(s)</strong> de ce
                      cerveau comme vus ? Les changements détectés ensuite resteront non vus.
                    </p>
                    <button
                      type="button"
                      data-testid="journal-mark-all-confirm-yes"
                      disabled={marking}
                      onClick={() => void markAllSeen()}
                    >
                      {marking ? "Marquage…" : "Confirmer : tout marquer vu"}
                    </button>{" "}
                    <button
                      type="button"
                      data-testid="journal-mark-all-cancel"
                      disabled={marking}
                      onClick={() => setConfirmingAll(false)}
                    >
                      Annuler
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    data-testid="journal-mark-all"
                    disabled={page.unseenTotal === 0 || marking}
                    onClick={() => setConfirmingAll(true)}
                  >
                    Tout marquer vu
                  </button>
                )}
                {markError ? (
                  <p role="alert" data-testid="journal-mark-error">
                    Marquage impossible : {markError}
                  </p>
                ) : null}
              </div>
              {page.items.length === 0 ? (
                <p data-testid="journal-empty">
                  {filtered
                    ? "Aucun changement pour ces filtres."
                    : "Aucun changement enregistré. Le premier index établit la référence : les changements sont détectés à partir de l'actualisation suivante."}
                </p>
              ) : (
                <ul className="journal__groups">
                  {groups.map((group) => (
                    <li key={`${group.revision}`} data-testid="journal-group" data-revision={group.revision}>
                      <h3 className="journal__group-title">
                        Détecté à la révision {group.revision} · {detectedAt(group.detectedUnixMs)}
                      </h3>
                      <ul className="journal__events">
                        {group.events.map((event) => (
                          <li
                            key={event.eventId}
                            data-testid="journal-event"
                            data-event-id={event.eventId}
                            data-nature={event.nature}
                            data-node-id={event.nodeId}
                            data-node-present={event.nodePresent}
                            data-seen={event.seen}
                          >
                            <span
                              className={`journal__seen-badge journal__seen-badge--${event.seen ? "seen" : "unseen"}`}
                              data-testid="journal-seen-badge"
                            >
                              <span aria-hidden="true">{event.seen ? "✓" : "●"}</span>{" "}
                              {event.seen ? "Vu" : "Non vu"}
                            </span>{" "}
                            <strong>{NATURE_LABELS[event.nature]}</strong>
                            <span> · {KIND_LABELS[event.nodeKind]}</span>
                            <span> · {describe(event)}</span>{" "}
                            {event.seen ? null : (
                              <>
                                <button
                                  type="button"
                                  data-testid="journal-mark-seen"
                                  disabled={marking}
                                  onClick={() => void markChangeSeen(event.eventId)}
                                >
                                  Marquer vu
                                </button>{" "}
                              </>
                            )}
                            {event.nature !== "DELETED" && event.nodePresent ? (
                              <button
                                type="button"
                                data-testid="journal-select"
                                onClick={() => onSelect({ brainId: event.brainId, nodeId: event.nodeId })}
                              >
                                Afficher
                              </button>
                            ) : (
                              <span data-testid="journal-gone">
                                {" "}
                                — absent de l'index actuel, historique seulement
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
              <div className="journal__paging">
                <button
                  type="button"
                  data-testid="journal-prev"
                  disabled={cursorStack.length <= 1 || loading}
                  onClick={() => setCursorStack((stack) => stack.slice(0, -1))}
                >
                  Page précédente
                </button>
                <button
                  type="button"
                  data-testid="journal-next"
                  disabled={page.nextCursor === null || loading}
                  onClick={() =>
                    page.nextCursor !== null &&
                    setCursorStack((stack) => [...stack, page.nextCursor])
                  }
                >
                  Page suivante
                </button>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
