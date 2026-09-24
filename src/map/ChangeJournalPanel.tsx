import { invoke } from "@tauri-apps/api/core";
import { useEffect, useRef, useState } from "react";
import type {
  BrainNodeRef,
  ChangeEvent,
  ChangeJournalPage,
  ChangeNature,
  ChangeSummary,
  MapNodeKind,
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
}

export default function ChangeJournalPanel({ brainId, revision, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [natures, setNatures] = useState<ChangeNature[]>([]);
  // The `after` cursors used to reach the current page — the last entry is the
  // current page's own (`null` for the first) — so « Page précédente » pops.
  const [cursorStack, setCursorStack] = useState<(string | null)[]>([null]);
  const [page, setPage] = useState<ChangeJournalPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ticket = useRef(0);

  // Another brain: nothing of the previous one — filter, position, page —
  // is carried over.
  useEffect(() => {
    ticket.current += 1;
    setNatures([]);
    setCursorStack([null]);
    setPage(null);
    setError(null);
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
  }, [open, brainId, revision, natures, after]);

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
                          >
                            <strong>{NATURE_LABELS[event.nature]}</strong>
                            <span> · {KIND_LABELS[event.nodeKind]}</span>
                            <span> · {describe(event)}</span>{" "}
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
