import { invoke } from "@tauri-apps/api/core";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Locale } from "../lib/locale";
import { formatDateTime } from "./localeText";
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
 *
 * `TASK-0046` — the words follow the interface language (`locale`). The locale is
 * **not** a dependency of the effect that reads the journal: switching language
 * changes what is said about the page already held, and reads nothing again.
 */

const PAGE_LIMIT = 50;

export const NATURE_LABELS: Record<Locale, Record<ChangeNature, string>> = {
  fr: {
    CREATED: "Créé",
    MODIFIED: "Modifié",
    RENAMED: "Renommé",
    MOVED: "Déplacé",
    DELETED: "Supprimé",
  },
  en: {
    CREATED: "Created",
    MODIFIED: "Modified",
    RENAMED: "Renamed",
    MOVED: "Moved",
    DELETED: "Deleted",
  },
};

const NATURE_ORDER: ChangeNature[] = ["CREATED", "MODIFIED", "RENAMED", "MOVED", "DELETED"];

const KIND_LABELS: Record<Locale, Record<MapNodeKind, string>> = {
  fr: { root: "racine", directory: "dossier", file: "fichier", skipped: "ignoré" },
  en: { root: "root", directory: "folder", file: "file", skipped: "skipped" },
};

/** The words of the panel that are not one of the tables above. */
interface ChangeJournalStrings {
  baseline: string;
  noChange: string;
  summary: (summary: ChangeSummary) => string;
  modes: Record<ApplicationMode, string>;
  root: string;
  title: string;
  hide: string;
  show: string;
  boundary: ReactNode;
  filterByNature: string;
  clearFilters: string;
  unavailable: string;
  retry: string;
  reading: string;
  total: (total: number, filtered: boolean, pageNumber: number) => string;
  allSeen: string;
  unseenTotal: (count: number) => string;
  confirmLabel: string;
  confirmQuestion: (count: number) => ReactNode;
  confirmYes: string;
  marking: string;
  cancel: string;
  markAll: string;
  markFailed: string;
  emptyFiltered: string;
  empty: string;
  detectedAt: (revision: number, instant: string) => string;
  seen: string;
  unseen: string;
  markSeen: string;
  showNode: string;
  gone: string;
  previous: string;
  next: string;
  otherBrainJournal: string;
  otherBrainAnswer: string;
}

const CHANGE_JOURNAL_STRINGS: Record<Locale, ChangeJournalStrings> = {
  fr: {
    baseline: "Référence établie — les changements sont comptés à partir de l'actualisation suivante.",
    noChange: "Aucun changement détecté.",
    summary: (s) =>
      `${s.total} changement(s) détecté(s) : ${s.created} créé(s) · ` +
      `${s.modified} modifié(s) · ${s.renamed} renommé(s) · ` +
      `${s.moved} déplacé(s) · ${s.deleted} supprimé(s)`,
    modes: {
      BASELINE_FULL: "Première indexation",
      INCREMENTAL: "Mise à jour incrémentale",
      IDENTITY_RESTAMP_FULL: "Ré-estampillage complet (ancien index)",
      EXPLICIT_REBUILD_FULL: "Reconstruction complète",
    },
    root: "(racine)",
    title: "Changements",
    hide: "Masquer les changements",
    show: "Afficher les changements",
    boundary: (
      <>
        <strong>Changements détectés à chaque actualisation.</strong> La date est celle de la
        détection par FileTopo, pas celle de la modification sur le disque; l'ordre dans une même
        actualisation n'est pas la chronologie réelle des opérations.
      </>
    ),
    filterByNature: "Filtrer par nature",
    clearFilters: "Retirer les filtres",
    unavailable: "Journal indisponible :",
    retry: "Recommencer",
    reading: "Lecture du journal…",
    total: (total, filtered, pageNumber) =>
      `${total} changement(s)${filtered ? " pour ces filtres" : ""} · page ${pageNumber}`,
    allSeen: "Tous les changements sont vus.",
    unseenTotal: (count) => `${count} changement(s) non vu(s) dans ce cerveau.`,
    confirmLabel: "Confirmer : tout marquer vu",
    confirmQuestion: (count) => (
      <>
        Marquer <strong>les {count} changement(s) non vu(s)</strong> de ce cerveau comme vus ? Les
        changements détectés ensuite resteront non vus.
      </>
    ),
    confirmYes: "Confirmer : tout marquer vu",
    marking: "Marquage…",
    cancel: "Annuler",
    markAll: "Tout marquer vu",
    markFailed: "Marquage impossible :",
    emptyFiltered: "Aucun changement pour ces filtres.",
    empty:
      "Aucun changement enregistré. Le premier index établit la référence : les changements sont détectés à partir de l'actualisation suivante.",
    detectedAt: (revision, instant) => `Détecté à la révision ${revision} · ${instant}`,
    seen: "Vu",
    unseen: "Non vu",
    markSeen: "Marquer vu",
    showNode: "Afficher",
    gone: "— absent de l'index actuel, historique seulement",
    previous: "Page précédente",
    next: "Page suivante",
    otherBrainJournal: "journal d'un autre cerveau refusé",
    otherBrainAnswer: "réponse d'un autre cerveau refusée",
  },
  en: {
    baseline: "Baseline established — changes are counted from the next refresh.",
    noChange: "No change detected.",
    summary: (s) =>
      `${s.total} change(s) detected: ${s.created} created · ` +
      `${s.modified} modified · ${s.renamed} renamed · ` +
      `${s.moved} moved · ${s.deleted} deleted`,
    modes: {
      BASELINE_FULL: "First indexing",
      INCREMENTAL: "Incremental update",
      IDENTITY_RESTAMP_FULL: "Full re-stamp (old index)",
      EXPLICIT_REBUILD_FULL: "Full rebuild",
    },
    root: "(root)",
    title: "Changes",
    hide: "Hide changes",
    show: "Show changes",
    boundary: (
      <>
        <strong>Changes detected at each refresh.</strong> The date is when FileTopo detected the
        difference, not when the file changed on disk; the order within one refresh is not the
        real chronology of the operations.
      </>
    ),
    filterByNature: "Filter by nature",
    clearFilters: "Remove filters",
    unavailable: "Journal unavailable:",
    retry: "Try again",
    reading: "Reading the journal…",
    total: (total, filtered, pageNumber) =>
      `${total} change(s)${filtered ? " for these filters" : ""} · page ${pageNumber}`,
    allSeen: "All changes are seen.",
    unseenTotal: (count) => `${count} unseen change(s) in this brain.`,
    confirmLabel: "Confirm: mark all as seen",
    confirmQuestion: (count) => (
      <>
        Mark <strong>the {count} unseen change(s)</strong> of this brain as seen? Changes detected
        afterwards will stay unseen.
      </>
    ),
    confirmYes: "Confirm: mark all as seen",
    marking: "Marking…",
    cancel: "Cancel",
    markAll: "Mark all as seen",
    markFailed: "Could not mark:",
    emptyFiltered: "No change for these filters.",
    empty:
      "No change recorded. The first index establishes the baseline: changes are detected from the next refresh.",
    detectedAt: (revision, instant) => `Detected at revision ${revision} · ${instant}`,
    seen: "Seen",
    unseen: "Unseen",
    markSeen: "Mark as seen",
    showNode: "Show",
    gone: "— absent from the current index, history only",
    previous: "Previous page",
    next: "Next page",
    otherBrainJournal: "journal of another brain refused",
    otherBrainAnswer: "answer from another brain refused",
  },
};

/** The one-line counters an Actualiser/Reconstruire report shows. */
export function describeChangeSummary(summary: ChangeSummary, locale: Locale): string {
  const words = CHANGE_JOURNAL_STRINGS[locale];
  if (summary.baselineEstablished) return words.baseline;
  if (summary.total === 0) return words.noChange;
  return words.summary(summary);
}

/**
 * `TASK-0041` — the discreet diagnostic naming how the last scan reached the
 * Index. A closed set of words; it says nothing about the tree.
 */
export function describeApplicationMode(mode: ApplicationMode, locale: Locale): string {
  return CHANGE_JOURNAL_STRINGS[locale].modes[mode];
}

function shown(path: string | null, locale: Locale): string {
  return path === null ? "—" : path === "" ? CHANGE_JOURNAL_STRINGS[locale].root : path;
}

/** Relative paths and names only — what the event says about the node. */
function describe(event: ChangeEvent, locale: Locale): string {
  switch (event.nature) {
    case "CREATED":
    case "MODIFIED":
      return shown(event.newRelativePath, locale);
    case "DELETED":
      return shown(event.oldRelativePath, locale);
    case "RENAMED":
    case "MOVED":
      return event.oldRelativePath === event.newRelativePath
        ? `${event.oldName ?? "—"} → ${event.newName ?? "—"}`
        : `${shown(event.oldRelativePath, locale)} → ${shown(event.newRelativePath, locale)}`;
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

/**
 * What went wrong, kept as a **fact** rather than as a sentence: a mismatch is said in
 * the language of the moment it is shown, a backend diagnostic is shown as it came.
 */
type PanelError = { kind: "mismatch" } | { kind: "backend"; detail: string };

interface Props {
  /** The interface language. */
  locale: Locale;
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
  locale,
  brainId,
  revision,
  onSelect,
  seenRevision = 0,
  onSeenChange,
}: Props) {
  const words = CHANGE_JOURNAL_STRINGS[locale];
  const [open, setOpen] = useState(false);
  const [natures, setNatures] = useState<ChangeNature[]>([]);
  // The `after` cursors used to reach the current page — the last entry is the
  // current page's own (`null` for the first) — so « Page précédente » pops.
  const [cursorStack, setCursorStack] = useState<(string | null)[]>([null]);
  const [page, setPage] = useState<ChangeJournalPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<PanelError | null>(null);
  // `TASK-0038` — a re-read after an acknowledgement, and the state of the
  // one mutation in flight (they never overlap) and of the confirmation.
  const [reload, setReload] = useState(0);
  const [marking, setMarking] = useState(false);
  const [markError, setMarkError] = useState<PanelError | null>(null);
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
          setError({ kind: "mismatch" });
          return;
        }
        setPage(next);
      })
      .catch((reason) => {
        if (mine === ticket.current) setError({ kind: "backend", detail: String(reason) });
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
        setMarkError({ kind: "mismatch" });
        return;
      }
      acknowledged();
    } catch (reason) {
      setMarkError({ kind: "backend", detail: String(reason) });
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
        setMarkError({ kind: "mismatch" });
        return;
      }
      setConfirmingAll(false);
      acknowledged();
    } catch (reason) {
      setMarkError({ kind: "backend", detail: String(reason) });
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
    <section className="journal" aria-label={words.title} data-testid="change-journal">
      <h2 className="journal__title">{words.title}</h2>
      <button
        type="button"
        className="journal__toggle"
        data-testid="journal-toggle"
        aria-expanded={open}
        disabled={!brainId}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? words.hide : words.show}
      </button>
      <p className="journal__boundary" data-testid="journal-boundary">
        {words.boundary}
      </p>
      {open ? (
        <div className="journal__body">
          <div role="group" aria-label={words.filterByNature} className="journal__filters">
            {NATURE_ORDER.map((nature) => (
              <label key={nature} className="journal__filter">
                <input
                  type="checkbox"
                  data-testid={`journal-filter-${nature}`}
                  checked={natures.includes(nature)}
                  onChange={() => toggleNature(nature)}
                />{" "}
                {NATURE_LABELS[locale][nature]}
              </label>
            ))}
            {filtered ? (
              <button type="button" data-testid="journal-clear-filters" onClick={clearFilters}>
                {words.clearFilters}
              </button>
            ) : null}
          </div>

          {error ? (
            <p role="alert" data-testid="journal-error">
              {words.unavailable} {error.kind === "mismatch" ? words.otherBrainJournal : error.detail}{" "}
              <button type="button" onClick={() => setCursorStack([null])}>
                {words.retry}
              </button>
            </p>
          ) : null}
          {loading && page === null ? <p>{words.reading}</p> : null}

          {page ? (
            <>
              <p
                data-testid="journal-total"
                data-total={page.total}
                data-limit={page.limit}
                data-index-revision={page.indexRevision}
                aria-live="polite"
              >
                {words.total(page.total, filtered, pageNumber)}
              </p>
              <div className="journal__seen" data-testid="journal-seen-controls">
                <p
                  data-testid="journal-unseen-total"
                  data-unseen-total={page.unseenTotal}
                  aria-live="polite"
                >
                  {page.unseenTotal === 0 ? words.allSeen : words.unseenTotal(page.unseenTotal)}
                </p>
                {confirmingAll ? (
                  <div role="alertdialog" aria-label={words.confirmLabel} data-testid="journal-mark-all-confirm">
                    <p>{words.confirmQuestion(page.unseenTotal)}</p>
                    <button
                      type="button"
                      data-testid="journal-mark-all-confirm-yes"
                      disabled={marking}
                      onClick={() => void markAllSeen()}
                    >
                      {marking ? words.marking : words.confirmYes}
                    </button>{" "}
                    <button
                      type="button"
                      data-testid="journal-mark-all-cancel"
                      disabled={marking}
                      onClick={() => setConfirmingAll(false)}
                    >
                      {words.cancel}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    data-testid="journal-mark-all"
                    disabled={page.unseenTotal === 0 || marking}
                    onClick={() => setConfirmingAll(true)}
                  >
                    {words.markAll}
                  </button>
                )}
                {markError ? (
                  <p role="alert" data-testid="journal-mark-error">
                    {words.markFailed}{" "}
                    {markError.kind === "mismatch" ? words.otherBrainAnswer : markError.detail}
                  </p>
                ) : null}
              </div>
              {page.items.length === 0 ? (
                <p data-testid="journal-empty">{filtered ? words.emptyFiltered : words.empty}</p>
              ) : (
                <ul className="journal__groups">
                  {groups.map((group) => (
                    <li key={`${group.revision}`} data-testid="journal-group" data-revision={group.revision}>
                      <h3 className="journal__group-title">
                        {words.detectedAt(group.revision, formatDateTime(group.detectedUnixMs, locale))}
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
                              {event.seen ? words.seen : words.unseen}
                            </span>{" "}
                            <strong>{NATURE_LABELS[locale][event.nature]}</strong>
                            <span> · {KIND_LABELS[locale][event.nodeKind]}</span>
                            <span> · {describe(event, locale)}</span>{" "}
                            {event.seen ? null : (
                              <>
                                <button
                                  type="button"
                                  data-testid="journal-mark-seen"
                                  disabled={marking}
                                  onClick={() => void markChangeSeen(event.eventId)}
                                >
                                  {words.markSeen}
                                </button>{" "}
                              </>
                            )}
                            {event.nature !== "DELETED" && event.nodePresent ? (
                              <button
                                type="button"
                                data-testid="journal-select"
                                onClick={() => onSelect({ brainId: event.brainId, nodeId: event.nodeId })}
                              >
                                {words.showNode}
                              </button>
                            ) : (
                              <span data-testid="journal-gone"> {words.gone}</span>
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
                  {words.previous}
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
                  {words.next}
                </button>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
