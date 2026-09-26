import { readSourceObservation, runLifecycle, type LifecycleAction } from "./lifecycle";
import SourceObservationBadge from "./SourceObservationBadge";
import WatchStatusBadge from "./WatchStatusBadge";
import {
  ReloadCoordinator,
  WatchTracker,
  parseWatchStatus,
  subscribeToWatchStatus,
} from "./watchStatus";
import { prepareScenarioIndex } from "./lifecycle";
import { canonicalizeSearchQuery, runCoordinatedSearch, SearchCoordinator } from "./searchCoordinator";
import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveInitialLocale, storeLocale, type Locale } from "../lib/locale";
import { LocalizedError, describeError, resolveStatus, type StatusMessage } from "./localeText";
import { strings, type MapStrings } from "./mapStrings";
import BrainIdentityEditor, { type BrainIdentityValues } from "./BrainIdentityEditor";
import ExclusionsPanel from "./ExclusionsPanel";
import CompositionBar from "./CompositionBar";
import DetailsPanel from "./DetailsPanel";
import FilterPanel from "./FilterPanel";
import { filterRoles } from "./filters";
import MapView, { aggregateLabel, type RenderedBrain } from "./MapView";
import { useProjectionFilter } from "./useProjectionFilter";
import {
  ResumeWriter,
  isStorableView,
  parseResumeRestore,
  parseResumeState,
  type ResumeState,
} from "./resumeState";
import CrossRelationsPanel from "./CrossRelationsPanel";
import RelationsPanel from "./RelationsPanel";
import ReviewQueuePanel from "./ReviewQueuePanel";
import ExactDuplicateExplorer from "./ExactDuplicateExplorer";
import ChangeJournalPanel, {
  describeApplicationMode,
  describeChangeSummary,
} from "./ChangeJournalPanel";
import NodeChangeState from "./NodeChangeState";
import {
  ComposedViewError,
  addBrain,
  catalogueOrder,
  composeView,
  focusBrain,
  removeBrain,
  sameNodeRef,
  selectionIsStillValid,
  singleBrainView,
  type ComposedView,
} from "./composedView";
import {
  compositionKey,
  emptyCompositionMemory,
  recallComposition,
  rememberComposition,
  shouldFitComposition,
  type CompositionPositioning,
  type CompositionSessionMemory,
} from "./compositionSession";
import { composeTerritories, placeRect, territoryOf, type Composition } from "./territories";
import { buildHierarchy, type Hierarchy } from "./hierarchy";
import { establishedNeighbours, relationKey, relationSegments } from "./relations";
import {
  crossNeighbours as crossNeighboursOf,
  crossSegments as crossSegmentsOf,
  splitCrossEndpointKey,
} from "./crossRelations";
import { runBrainScenario as runBrains } from "./brainScenario";
import { runComposedScenario as runComposed } from "./composedScenario";
import { runCrossScenario as runCross } from "./crossScenario";
import { runRelationScenario as runScenario } from "./relationScenario";
import { runTopographicScenario as runTopographic } from "./topographicScenario";
import { runContentScenario as runContent } from "./contentScenario";
import { runDreScenario as runDre } from "./dreScenario";
import { runReviewScenario as runReview } from "./reviewScenario";
import { runGenericRelationScenario as runGeneric } from "./genericRelationScenario";
import { runExactDuplicateScenario as runExactDuplicates } from "./exactDuplicateScenario";
import {
  H9_REGRESSION_ABANDON_ARTIFACT,
  H9_REGRESSION_ARTIFACT,
  K11_ARTIFACT,
} from "./runArtifacts";
import {
  FRAMES_PER_RUN,
  RUNS_PER_FIXTURE,
  SELECTIONS_PER_RUN,
  WARMUP_FRAMES,
  aggregate,
  afterPaint,
  awaitLaidOutViewport,
  nextFrame,
  scriptedStep,
  selectionTargets,
  type FixtureMeasurement,
  type RunSample,
} from "./measure";
import { useRestoreFocusAfterDisabled } from "./focusRestore";
import "./map.css";
import type {
  WatchStatus,
  ApplicationMode,
  BrainCatalogView,
  BrainNodeRef,
  BrainRecord,
  ChangeSummary,
  FixtureIntegrity,
  FixtureSummary,
  HostInfo,
  MapOpenReport,
  MapNode,
  MapSelfCheck,
  MapProjection,
  CrossRelationsOverview,
  ContentObservation,
  ContentObservationReport,
  ContentObservationSummary,
  CrossRelationsSelfCheck,
  NodeCrossRelations,
  NodeChildrenPage,
  NodeDetail,
  NodeRelations,
  Rect,
  RelationsOverview,
  RelationsSelfCheck,
  RelationEngineReport,
  RelationEngineStatus,
  SearchHit,
  SearchPage,
  SourceObservation,
  SuggestionReviewQueue,
  UiPreferences,
} from "./types";
import {
  clampView,
  fitToBox,
  fitView,
  panBy,
  readableView,
  recenterOnFocus,
  sameView,
  zoomAbout,
  type View,
  type Viewport,
} from "./viewState";

/**
 * The vertical slice of `TASK-0019`, end to end.
 *
 * Source of data: **synthetic fixtures, and nothing else**. There is no folder
 * picker anywhere in this screen, deliberately — real data is a stop point
 * reserved to Sébastien, and a picker that merely goes unused is still a
 * picker.
 *
 * **The screen is a composition, always.** One brain is a composition of one;
 * three are a composition of three. There is no single-brain code path beside
 * the composed one, because a second path is a second set of bugs and the one
 * nobody exercises is the one that rots.
 */

/**
 * `TASK-0046` — the words of this screen live in `mapStrings.ts`, one typed contract with
 * exactly two implementations. What is said in the status area is kept as a **function of
 * the locale** and resolved when it is rendered, so a line said in French reads in English
 * the moment the person switches, without anything being read or said again.
 */
function say(compose: (t: MapStrings, locale: Locale) => string): StatusMessage {
  return (locale) => compose(strings[locale], locale);
}

/**
 * One brain, fully loaded and kept **separate** — `TASK-0019` §4.1 rule 3.
 *
 * Nothing merges these. Two brains in one composition are two of these objects
 * side by side; there is no combined snapshot, no combined index, and no place
 * where one brain's rows could be read through another brain's identity.
 */
export interface LoadedBrain {
  record: BrainRecord;
  report: MapOpenReport;
  snapshot: MapProjection;
  integrity: FixtureIntegrity | null;
  relations: RelationsOverview | null;
  hierarchy: Hierarchy;
  /**
   * `TASK-0044` — the resume state the backend restored this brain from, validated
   * against its **current** Index, and the fresh filter cursor of the page the
   * selection sits on. Absent when the projection was read the plain way.
   */
  resume?: ResumeState | null;
  filterCursor?: string | null;
}

/**
 * Sends a line to the host's terminal.
 *
 * Fire-and-forget on purpose: logging must never be able to fail a run.
 */
function hostLog(level: "info" | "error", message: string): void {
  void invoke("map_log", { level, message }).catch(() => {});
}

/**
 * The backend labels a sandbox path with a token standing for the repository (`<dépôt>`),
 * a closed marker and not a path: it is said in the current language, and the rest of the
 * path — a folder name — is shown as it is.
 */
function sandboxDisplay(sandboxRoot: string, t: MapStrings): string {
  return sandboxRoot.startsWith("<dépôt>")
    ? t.sandboxRepoToken + sandboxRoot.slice("<dépôt>".length)
    : sandboxRoot;
}

function fixtureLabel(fixture: FixtureSummary, t: MapStrings, locale: Locale): string {
  const label = locale === "fr" ? fixture.labelFr : fixture.labelEn;
  return `${label} · ${fixture.plannedNodes} ${t.nodes} (${t.ceiling} ${fixture.maxNodes})`;
}

export default function MapApp() {
  // `TASK-0046` — the interface language is one global preference (`DEC-0044`): resolved
  // once at start by `resolveInitialLocale` (explicit choice, then system, then English),
  // and written by `storeLocale` **only** when the person chooses. Nothing is written at
  // start, and changing it reaches no backend command.
  const [locale, setLocale] = useState<Locale>(() => resolveInitialLocale());
  // `TASK-0047` — a control disabled while its action runs must not strand the keyboard on <body>.
  useRestoreFocusAfterDisabled();
  const t = strings[locale];
  const chooseLocale = useCallback((next: Locale) => {
    setLocale(next);
    // A refused write (blocked or full storage) is not an error: the choice still holds
    // for this session, and the next start resolves the normal way.
    storeLocale(next);
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const [fixtures, setFixtures] = useState<FixtureSummary[]>([]);
  const [host, setHost] = useState<HostInfo | null>(null);
  // `TASK-0018`. The catalogue is the source of a brain's identity; a displayed
  // brain is a **record**, not an identifier, so name, colour and icon on
  // screen are the ones the catalogue holds — `K7`.
  const [catalog, setCatalog] = useState<BrainCatalogView | null>(null);
  // `TASK-0019`. Which brains are on screen, and which one is focused.
  const [composed, setComposed] = useState<ComposedView | null>(null);
  const [loaded, setLoaded] = useState<ReadonlyMap<string, LoadedBrain>>(new Map());
  // The one semantic selection of the whole composed graph — `L7`. A pair,
  // never a bare row number: the same id exists in another brain.
  const [selected, setSelected] = useState<BrainNodeRef | null>(null);
  const [detail, setDetail] = useState<NodeDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [contentObservation, setContentObservation] = useState<ContentObservation | null>(null);
  const [contentSummary, setContentSummary] = useState<ContentObservationSummary | null>(null);
  const [identicalContentMemberCount, setIdenticalContentMemberCount] = useState(0);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentCampaignRunning, setContentCampaignRunning] = useState(false);
  const [contentReport, setContentReport] = useState<ContentObservationReport | null>(null);
  const [contentRevision, setContentRevision] = useState(0);
  // `TASK-0038` — bumped whenever one of the two seen/unseen surfaces (the
  // journal panel, the selected element's state) acknowledged something, so the
  // other re-reads the backend rather than showing a stale answer.
  const [seenRevision, setSeenRevision] = useState(0);
  const notifySeenChange = useCallback(() => setSeenRevision((current) => current + 1), []);
  // `TASK-0039` — the map filters (`DEC-0037`). The hook keeps the filter, the
  // brain it belongs to and a stack of page cursors, nothing else: the bounded
  // filtered page goes into `loaded` exactly as any other projection does.
  const filterBrainId = composed?.focusedBrainId ?? null;
  const filterRevision = filterBrainId ? (loaded.get(filterBrainId)?.snapshot.indexRevision ?? null) : null;
  const activeFilterBrain = useRef<string | null>(null);
  const restoreTicket = useRef(new Map<string, number>());
  const acceptFilteredProjection = useCallback((brainId: string, snapshot: MapProjection) => {
    setLoaded((current) => {
      const previous = current.get(brainId);
      if (!previous) return current;
      const next = new Map(current);
      next.set(brainId, { ...previous, snapshot, hierarchy: buildHierarchy(snapshot.nodes, snapshot.rootId) });
      return next;
    });
    const total = snapshot.filtered?.filteredTotal ?? 0;
    setStatus(
      say((t) => t.status.matches(total, snapshot.materializedCount, snapshot.nodeCount)),
    );
  }, []);
  // The filter was dropped: read that brain's **normal** projection again, unless
  // a filter was applied to it again in the meantime.
  const restoreNormalProjection = useCallback((brainId: string) => {
    const ticket = (restoreTicket.current.get(brainId) ?? 0) + 1;
    restoreTicket.current.set(brainId, ticket);
    void invoke<MapProjection>("map_view", { brainId })
      .then((snapshot) => {
        if (restoreTicket.current.get(brainId) !== ticket) return;
        if (activeFilterBrain.current === brainId || snapshot.brainId !== brainId) return;
        setLoaded((current) => {
          const previous = current.get(brainId);
          if (!previous) return current;
          const next = new Map(current);
          next.set(brainId, { ...previous, snapshot, hierarchy: buildHierarchy(snapshot.nodes, snapshot.rootId) });
          return next;
        });
      })
      .catch((error) =>
        setStatus(say((t, l) => t.status.normalProjectionUnreadable(describeError(error, l)))),
      );
  }, []);
  // `TASK-0044` — the per-brain resume state (`DEC-0042`): one writer for the whole page,
  // latest-wins and bounded, that talks to the catalogue and to nothing else.
  const resumeWriter = useRef(
    new ResumeWriter({
      write: (brainId, state) => invoke("map_brain_resume_update", { brainId, state }),
      read: async (brainId) =>
        parseResumeState(await invoke<unknown>("map_brain_resume_state", { brainId })),
      onError: (brainId, error) =>
        hostLog("error", `état de reprise non enregistré pour ${brainId}: ${String(error)}`),
    }),
  ).current;
  const filter = useProjectionFilter({
    brainId: filterBrainId,
    revision: filterRevision,
    seenRevision,
    onProjection: acceptFilteredProjection,
    onRestore: restoreNormalProjection,
    onError: (message) => setStatus(message),
    onFilterChanged: (brainId, next) => resumeWriter.patch(brainId, { filter: next }, { immediate: true }),
  });
  activeFilterBrain.current = filter.session?.brainId ?? null;
  const [contentObservedBrains, setContentObservedBrains] = useState<ReadonlySet<string>>(new Set());
  const [selfCheck, setSelfCheck] = useState<MapSelfCheck | null>(null);
  const [viewport, setViewport] = useState<Viewport>({ width: 1, height: 1 });
  const [view, setView] = useState<View>({ scale: 1, tx: 0, ty: 0 });
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  // A function is stored as a value, never run as an updater — hence the wrapper.
  const setStatus = useCallback(
    (message: StatusMessage | null) => setStatusMessage(() => message),
    [],
  );
  const status = statusMessage === null ? null : resolveStatus(statusMessage, locale);
  const [measurement, setMeasurement] = useState<FixtureMeasurement[] | null>(null);
  const [measuring, setMeasuring] = useState(false);
  const [nodeRelations, setNodeRelations] = useState<NodeRelations | null>(null);
  const [relationsLoading, setRelationsLoading] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);
  const [relationsCheck, setRelationsCheck] = useState<RelationsSelfCheck | null>(null);
  const [relationEngineStatus, setRelationEngineStatus] =
    useState<RelationEngineStatus | null>(null);
  const [relationEngineReport, setRelationEngineReport] =
    useState<RelationEngineReport | null>(null);
  const [relationEngineRunning, setRelationEngineRunning] = useState(false);
  // `TASK-0025` / `F-044`. The queue of the focused brain, read from the
  // backend and never assembled from the overview: `totalPending` is a
  // measurement of the store, and the interface has no business deriving it.
  const [reviewQueue, setReviewQueue] = useState<SuggestionReviewQueue | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  // Where « Plus tard » left the reader. Local, and deliberately so: it is the
  // one action of the queue that decides nothing, so nothing about it belongs
  // in the store — `DEC-0027` §B.
  const [reviewCursor, setReviewCursor] = useState(0);
  const [deciding, setDeciding] = useState<string | null>(null);
  // `TASK-0020`. The COMMON store, read once for the whole catalogue — never
  // per brain, and never per composition: a relation exists whether or not
  // either of its brains is on screen.
  const [crossOverview, setCrossOverview] = useState<CrossRelationsOverview | null>(null);
  const [nodeCross, setNodeCross] = useState<NodeCrossRelations | null>(null);
  const [crossLoading, setCrossLoading] = useState(false);
  const [approvingCross, setApprovingCross] = useState<string | null>(null);
  const [crossCheck, setCrossCheck] = useState<CrossRelationsSelfCheck | null>(null);
  // `L9` — where each **composition** was left, for the length of this session
  // only. Not persisted: composition persistence is out of scope, and only the
  // **active brain** survives a restart, in the catalogue.
  const [sessions, setSessions] = useState<CompositionSessionMemory>(emptyCompositionMemory);
  // `TASK-0034` A/B. Search is scoped to the focused brain; a query, its
  // bounded page and the offset it was fetched at. Cleared on a brain switch
  // or a revision change (refresh/rebuild) — never carried across either.
  const [searchQuery, setSearchQuery] = useState("");
  const [searchPage, setSearchPage] = useState<SearchPage | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  // Declared here — with the other refs, not down by `runSearch` where it
  // used to live — so `onFocusBrain`, `selectNode` and `changeProjection`
  // can invalidate a search still in flight the instant focus changes, in
  // the exact same call stack as that change, rather than waiting on a
  // `useEffect` reacting to the resulting state on a later render —
  // `ACTION-0053`.
  const searchCoordinator = useRef(new SearchCoordinator()).current;
  const [revealBusy, setRevealBusy] = useState(false);
  // The wire code, not a sentence: the words are picked at render, in the current language.
  const [revealErrorCode, setRevealErrorCode] = useState<string | null>(null);
  // `TASK-0035` A — visible by default until the real preference loads, so a
  // fresh profile never flashes hidden before the bootstrap effect answers. Since
  // `TASK-0044` the value is the **foreground brain's own**: the legacy global
  // preference only seeds a brain that has no resume state yet.
  const [detailsPanelVisible, setDetailsPanelVisible] = useState(true);
  // `TASK-0035` B — the dedicated, exact and paginated page of the current
  // selection's direct children; independent of `detail.children`, which
  // comes from the bounded map projection. `childrenCursorStack` is the
  // sequence of `after` cursors used to reach the current page — its last
  // entry is the current page's own `after` (`null` for the first page) —
  // so `Page précédente` can pop back to the one before it.
  const [childrenPage, setChildrenPage] = useState<NodeChildrenPage | null>(null);
  const [childrenLoading, setChildrenLoading] = useState(false);
  const [childrenCursorStack, setChildrenCursorStack] = useState<(string | null)[]>([null]);
  const childrenRequestTicket = useRef(0);
  const [copyBusy, setCopyBusy] = useState(false);
  const [copyErrorCode, setCopyErrorCode] = useState<string | null>(null);
  // `TASK-0037` — the change counters of each brain's **last** Actualiser or
  // Reconstruire in this session. Counters only: the events themselves are
  // read page by page from the brain's journal (`ChangeJournalPanel`).
  const [lastChanges, setLastChanges] = useState<ReadonlyMap<string, ChangeSummary>>(new Map());
  // `TASK-0041` — and the closed word saying which path applied that scan.
  const [lastApplicationModes, setLastApplicationModes] = useState<
    ReadonlyMap<string, ApplicationMode>
  >(new Map());
  // `TASK-0042` — the **last observation** of each brain's source. Read from the
  // backend's own persisted record (with every `map_open`, and after a failed
  // Actualiser through `map_source_observation`); never derived here, and never a
  // claim about the source *now*.
  const [sourceObservations, setSourceObservations] = useState<
    ReadonlyMap<string, SourceObservation>
  >(new Map());
  // `TASK-0043` — the **automatic watcher** of each brain, as the backend last said it
  // (one closed event, plus one read when a brain is first shown). The interface never
  // starts a watcher, never polls one, and never derives its state.
  const [watchStatuses, setWatchStatuses] = useState<ReadonlyMap<string, WatchStatus>>(
    new Map(),
  );
  const watchStatusesRef = useRef<ReadonlyMap<string, WatchStatus>>(new Map());
  const watchTracker = useRef(new WatchTracker()).current;
  const watchReloads = useRef(new ReloadCoordinator()).current;
  // Bumped when the watcher reloaded the selected brain, so the detail of the selected
  // element is read again rather than showing a stale size or date.
  const [detailRefresh, setDetailRefresh] = useState(0);

  // The measurement loop drives the same state the interface does, so what it
  // times is what a person would experience — not a parallel code path.
  const viewRef = useRef(view);
  viewRef.current = view;
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;
  // Read when leaving a composition, so what is stored is what was on screen at
  // the moment of the change rather than whatever a later render produced.
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const composedRef = useRef(composed);
  composedRef.current = composed;
  const loadedRef = useRef(loaded);
  loadedRef.current = loaded;
  const catalogRef = useRef(catalog);
  catalogRef.current = catalog;
  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;
  /** A view to restore once the next composition has landed — `L9`. */
  const restoreViewRef = useRef<View | null>(null);
  /**
   * `TASK-0044` — a camera the **catalogue** remembered, waiting for a measured
   * viewport: it is clamped against the real world and viewport, never applied blind.
   */
  const resumeViewRef = useRef<View | null>(null);
  /**
   * The composition whose camera is worth persisting, and the view object that was on
   * screen just before it was positioned (`stale`): the render that still shows it
   * writes nothing.
   */
  const viewArmedRef = useRef<{ key: string; stale: View | null } | null>(null);
  /**
   * The camera the catalogue remembered, kept for a short while after it was applied.
   * The viewport is not final the first time it is measured (a panel opens or closes, a
   * row grows), and a `clampView` against a transient viewport would move the camera for
   * good: while the person has not touched the camera, it is applied again from the
   * ORIGINAL remembered value each time the viewport changes.
   */
  const resumeTargetRef = useRef<{ key: string; view: View; applied: View | null; at: number } | null>(null);
  /** Which composition the current view was positioned for, and at which size. */
  const positionedRef = useRef<CompositionPositioning | null>(null);
  // Declared before the runners exist so the auto-start effect can reach them
  // without depending on declaration order.
  const runMeasurementRef = useRef<(() => Promise<void>) | null>(null);
  const runVerificationRef = useRef<(() => Promise<void>) | null>(null);
  const runRelationScenarioRef = useRef<(() => Promise<void>) | null>(null);
  const runBrainScenarioRef = useRef<(() => Promise<void>) | null>(null);
  const runComposedScenarioRef = useRef<(() => Promise<void>) | null>(null);
  const runCrossScenarioRef = useRef<(() => Promise<void>) | null>(null);
  const runTopographicScenarioRef = useRef<(() => Promise<void>) | null>(null);
  const runContentScenarioRef = useRef<(() => Promise<void>) | null>(null);
  const runDreScenarioRef = useRef<(() => Promise<void>) | null>(null);
  const runReviewScenarioRef = useRef<(() => Promise<void>) | null>(null);
  const runGenericRelationScenarioRef = useRef<(() => Promise<void>) | null>(null);
  const runExactDuplicateScenarioRef = useRef<(() => Promise<void>) | null>(null);

  const order = useMemo(() => catalogueOrder(catalog?.brains ?? []), [catalog]);

  /**
   * Whether the focused brain has no index yet — `DEC-0033` E.
   *
   * Read from what the composition **managed to load**, not from a guess: a
   * brain whose `map_open` answered `map_not_built` is absent from `loaded`,
   * and that absence is the fact. Nothing here probes the source to find out.
   */
  const focusedNeedsIndex =
    composed !== null && !loaded.has(composed.focusedBrainId);

  /** The territories of the current composition — `§4.3`. */
  const composition: Composition = useMemo(() => {
    if (!composed) return { territories: [], world: { x: 0, y: 0, w: 1, h: 1 } };
    return composeTerritories(
      composed.displayedBrainIds.flatMap((brainId) => {
        const brain = loaded.get(brainId);
        return brain
          ? [
              {
                brainId,
                layoutWidth: brain.snapshot.layoutWidth,
                layoutHeight: brain.snapshot.layoutHeight,
              },
            ]
          : [];
      }),
    );
  }, [composed, loaded]);

  const world = composition.world;

  /**
   * What a camera change anchors on: the selection when there is one and its
   * brain is loaded, else the focused brain's root — never the whole
   * composition, which stays `Ajuster à l'écran`'s job alone — `DEC-0034` E.
   *
   * Reads through refs rather than `selected`/`composed`/`loaded` directly so
   * callers can use it from an effect without adding a dependency that would
   * make the effect refire for reasons that have nothing to do with the
   * camera — the same reason `viewportRef` exists already, just below.
   */
  const focusAnchorRect = useCallback(
    (compositionAt: Composition): Rect | null => {
      const brainId = selectedRef.current?.brainId ?? composedRef.current?.focusedBrainId ?? null;
      if (!brainId) return null;
      const brain = loadedRef.current.get(brainId);
      const territory = territoryOf(compositionAt, brainId);
      if (!brain || !territory) return null;
      const nodeId =
        selectedRef.current && selectedRef.current.brainId === brainId
          ? selectedRef.current.nodeId
          : brain.snapshot.rootId;
      const node = brain.hierarchy.byId.get(nodeId);
      return node ? placeRect(territory, node.rect) : null;
    },
    [],
  );

  /**
   * Every displayed brain's rectangles, keyed by brain then by node id.
   *
   * Built once here rather than looked up through `loaded` inside the
   * projection: an inter-brain segment reads **two** brains, and a lookup that
   * fell back to "the current brain" would place one end of an edge in the
   * wrong territory — which is precisely what `M6` counts.
   */
  const nodesByBrain = useMemo(() => {
    const index = new Map<string, ReadonlyMap<number, MapNode>>();
    if (!composed) return index;
    for (const brainId of composed.displayedBrainIds) {
      const brain = loaded.get(brainId);
      if (brain) index.set(brainId, brain.hierarchy.byId);
    }
    return index;
  }, [composed, loaded]);

  /** Inter-brain segments — `M6`. Only pairs whose two ends are displayed. */
  const crossSegments = useMemo(
    () => crossSegmentsOf(crossOverview, nodesByBrain, selected, locale),
    [crossOverview, nodesByBrain, selected, locale],
  );

  /** Inter-brain neighbours of the selection, per brain — `M`. */
  const crossNeighbours = useMemo(
    () => crossNeighboursOf(crossOverview, selected),
    [crossOverview, selected],
  );

  /** Everything the single canvas needs, one entry per displayed brain. */
  const renderedBrains: RenderedBrain[] = useMemo(() => {
    if (!composed) return [];
    return composed.displayedBrainIds.flatMap((brainId) => {
      const brain = loaded.get(brainId);
      if (!brain) return [];
      const localSelection =
        selected && selected.brainId === brainId ? selected.nodeId : null;
      return [
        {
          brainId,
          record: brain.record,
          hierarchy: brain.hierarchy,
          // Projected from this brain's own projection rectangles. Rebuilt when
          // its tree, its relations or the selection change — never for a pan
          // or a zoom, and never by recomputing a layout.
          segments: relationSegments(brain.relations, brain.hierarchy.byId, localSelection, locale),
          relationNeighbours: establishedNeighbours(brain.relations, localSelection),
          crossNeighbours: crossNeighbours.get(brainId) ?? new Set<number>(),
          nodeCount: brain.snapshot.materializedCount,
          aggregates: brain.snapshot.aggregates,
          // `TASK-0039`: match / context of a filtered page, empty otherwise.
          filterRoles: filterRoles(brain.snapshot.filtered),
        },
      ];
    });
  }, [composed, crossNeighbours, loaded, locale, selected]);

  // Anything the page throws becomes a line in the host log, so an unattended
  // run leaves a trace instead of a silent stall.
  useEffect(() => {
    const onError = (event: ErrorEvent) =>
      hostLog("error", `exception: ${event.message} @ ${event.filename}:${event.lineno}`);
    const onRejection = (event: PromiseRejectionEvent) =>
      hostLog("error", `promesse rejetée: ${String(event.reason)}`);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  useEffect(() => {
    hostLog("info", "interface montée, lecture des fixtures et de l'hôte");
    Promise.all([
      invoke<FixtureSummary[]>("map_fixtures"),
      invoke<HostInfo>("map_host_info"),
      invoke<BrainCatalogView>("map_brains"),
      invoke<UiPreferences>("map_ui_preferences"),
    ])
      .then(([nextFixtures, nextHost, nextCatalog, nextPreferences]) => {
        setFixtures(nextFixtures);
        setHost(nextHost);
        setCatalog(nextCatalog);
        setDetailsPanelVisible(nextPreferences.detailsPanelVisible);
        hostLog(
          "info",
          `hôte prêt: ${nextCatalog.brains.length} cerveaux, cerveau actif ` +
            `${nextCatalog.activeBrainId}, ${nextFixtures.length} fixtures, ` +
            `WebView2 ${nextHost.webviewVersion}, ` +
            `mesure automatique=${nextHost.autoMeasure}, visibilité=${document.visibilityState}`,
        );
      })
      .catch((error) => {
        hostLog("error", `hôte indisponible: ${String(error)}`);
        setStatus(say((t, l) => t.status.hostUnavailable(describeError(error, l))));
      });
  }, []);

  // Unattended runs: the host asked for a scenario, so start it as soon as the
  // fixtures are known. Same code paths as the buttons.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (autoStarted.current || fixtures.length === 0 || !host) return;
    if (host.autoEd15Pass === 1 || host.autoEd15Pass === 2) {
      autoStarted.current = true;
      hostLog("info", `démarrage automatique du scénario ED15, passe ${host.autoEd15Pass}`);
      void runExactDuplicateScenarioRef.current?.();
      return;
    }
    if (host.autoSr15Pass === 1 || host.autoSr15Pass === 2) {
      autoStarted.current = true;
      hostLog("info", `démarrage automatique du scénario SR15, passe ${host.autoSr15Pass}`);
      void runReviewScenarioRef.current?.();
      return;
    }
    if (host.autoDrePass === 1 || host.autoDrePass === 2) {
      autoStarted.current = true;
      hostLog("info", `démarrage automatique du scénario DR15, passe ${host.autoDrePass}`);
      void runDreScenarioRef.current?.();
      return;
    }
    if (host.autoGenericRelations) {
      autoStarted.current = true;
      hostLog("info", "démarrage automatique du scénario X11 sur brain-beta");
      void runGenericRelationScenarioRef.current?.();
      return;
    }
    if (host.autoVerify) {
      autoStarted.current = true;
      hostLog("info", "démarrage automatique de la vérification L11");
      void runVerificationRef.current?.();
      return;
    }
    if (host.autoRelations) {
      autoStarted.current = true;
      hostLog("info", "démarrage automatique du scénario J12");
      void runRelationScenarioRef.current?.();
      return;
    }
    if (host.autoContentPass === 1 || host.autoContentPass === 2) {
      autoStarted.current = true;
      hostLog("info", `démarrage automatique du scénario EC15, passe ${host.autoContentPass}`);
      void runContentScenarioRef.current?.();
      return;
    }
    if (host.autoTopographicPass === 1 || host.autoTopographicPass === 2) {
      autoStarted.current = true;
      hostLog(
        "info",
        `démarrage automatique du scénario N15, passe ${host.autoTopographicPass}`,
      );
      void runTopographicScenarioRef.current?.();
      return;
    }
    if (host.autoCrossPass === 1 || host.autoCrossPass === 2) {
      autoStarted.current = true;
      hostLog("info", `démarrage automatique du scénario M12, passe ${host.autoCrossPass}`);
      void runCrossScenarioRef.current?.();
      return;
    }
    if (host.autoComposedPass === 1 || host.autoComposedPass === 2) {
      autoStarted.current = true;
      hostLog("info", `démarrage automatique du scénario L12, passe ${host.autoComposedPass}`);
      void runComposedScenarioRef.current?.();
      return;
    }
    if (host.autoBrainsPass === 1 || host.autoBrainsPass === 2) {
      autoStarted.current = true;
      hostLog("info", `démarrage automatique du scénario K12, passe ${host.autoBrainsPass}`);
      void runBrainScenarioRef.current?.();
      return;
    }
    if (host.autoMeasure) {
      autoStarted.current = true;
      hostLog("info", "démarrage automatique de la campagne H9");
      void runMeasurementRef.current?.();
    }
  }, [fixtures.length, host]);

  /**
   * Loads a brain — and **does not make it active**.
   *
   * `§4.1` rule 6: reading a brain's data is not choosing it. `map_open`,
   * `map_view` and `map_relations_open` all take a
   * `brain_id` and none of them touches the catalogue's active brain, so
   * bringing Gamma into the view alongside Alpha leaves Alpha active.
   */
  const loadBrain = useCallback(
    async (brainId: string, action: LifecycleAction, focusId?: number): Promise<LoadedBrain> => {
      projectionRequest.current.set(brainId, (projectionRequest.current.get(brainId) ?? 0) + 1);
      const record = catalogRef.current?.brains.find((brain) => brain.brainId === brainId);
      if (!record) {
        throw new LocalizedError((l) => strings[l].invariants.brainMissingFromCatalogue(brainId));
      }
      let report: Awaited<ReturnType<typeof runLifecycle>>;
      try {
        report = await runLifecycle(invoke, brainId, action);
      } catch (error) {
        // `TASK-0042` — a failed Actualiser/Reconstruire keeps the map that is
        // already loaded (nothing below runs, so `loaded` is never replaced) and
        // asks the backend, from its local state alone, what it just observed.
        if (action !== "open") {
          const observed = await readSourceObservation(invoke, brainId);
          if (observed) setSourceObservations((current) => new Map(current).set(brainId, observed));
        }
        throw error;
      }
      if (report.sourceObservation) {
        const observed = report.sourceObservation;
        setSourceObservations((current) => new Map(current).set(brainId, observed));
      }
      if (report.changeSummary) {
        const summary = report.changeSummary;
        setLastChanges((current) => new Map(current).set(brainId, summary));
      }
      if (report.applicationMode) {
        const mode = report.applicationMode;
        setLastApplicationModes((current) => new Map(current).set(brainId, mode));
      }
      // `TASK-0044` — the catalogue says where this brain was left and the backend checks
      // it against the brain's **current** Index: the branch, the selection, the filter
      // (and, past the first page, a fresh cursor). Anything that cannot be restored falls
      // back to the plain read below; a damaged record never keeps a brain from opening.
      let snapshot: MapProjection | null = null;
      let resume: ResumeState | null = null;
      let filterCursor: string | null = null;
      try {
        // What the person just did is in the catalogue before it is read back.
        await resumeWriter.flush(brainId);
        const restored = parseResumeRestore(
          await invoke<unknown>("map_brain_resume_restore", { brainId }),
          brainId,
        );
        if (restored) {
          snapshot = restored.projection;
          resume = restored.resume;
          filterCursor = restored.filterCursor;
          resumeWriter.seed(brainId, restored.resume);
          if (restored.corrections.length > 0) {
            hostLog("info", `état de reprise corrigé pour ${brainId}: ${restored.corrections.join(",")}`);
          }
        }
      } catch (error) {
        hostLog("info", `reprise indisponible pour ${brainId}, lecture simple: ${String(error)}`);
      }
      // A reload the watcher asked for keeps the branch the person is on; when that
      // branch no longer exists the root is read instead, never an error.
      if (!snapshot) {
        try {
          snapshot = await invoke<MapProjection>(
            "map_view",
            focusId === undefined ? { brainId } : { brainId, focusId },
          );
        } catch (error) {
          if (focusId === undefined) throw error;
          snapshot = await invoke<MapProjection>("map_view", { brainId });
        }
      }
      const integrity = null; // Opening must never read or fingerprint the source.

      // The snapshot has to be the one that was asked for. A mismatch here
      // would be exactly the leak `K3` and `L2` forbid, so it is refused
      // rather than displayed.
      if (snapshot.brainId !== brainId || report.brainId !== brainId) {
        throw new LocalizedError((l) =>
          strings[l].invariants.brainMismatch(brainId, snapshot.brainId),
        );
      }

      // Relations are opened separately. Since `TASK-0024` this succeeds for
      // **any** valid source: a brain outside the frozen legacy fixture simply
      // carries no legacy relations, which the panel states in one sentence.
      // A failure here stays a stated outcome, not an error banner.
      let relations: RelationsOverview | null = null;
      try {
        relations = await invoke<RelationsOverview>("map_relations_open", { brainId });
      } catch (error) {
        hostLog("info", `relations indisponibles pour ${brainId}: ${String(error)}`);
      }

      return {
        // Read again: an identity saved while this load was in flight is the catalogue's.
        record: catalogRef.current?.brains.find((brain) => brain.brainId === brainId) ?? record,
        report,
        snapshot,
        integrity,
        relations,
        hierarchy: buildHierarchy(snapshot.nodes, snapshot.rootId),
        resume,
        filterCursor,
      };
    },
    [],
  );

  /** Makes a brain active **in the catalogue**, so the choice survives a restart. */
  const activate = useCallback(async (brainId: string) => {
    const record = await invoke<BrainRecord>("map_brain_activate", { brainId });
    setCatalog((current) =>
      current
        ? {
            ...current,
            activeBrainId: brainId,
            brains: current.brains.map((brain) => (brain.brainId === brainId ? record : brain)),
          }
        : current,
    );
    return record;
  }, []);

  /**
   * `TASK-0043` — the watcher committed a new revision of a brain that is **on screen**:
   * read it again, in place. `map_open` and `map_view` only (the source is never touched),
   * the branch the person is on is kept, and the journal, the new / unseen filters and the
   * selected element re-read because their revision moved. A brain that is not displayed
   * is not read at all: it is loaded when it is shown.
   */
  const reloadForWatch = useCallback(
    async (brainId: string) => {
      const before = loadedRef.current.get(brainId);
      if (!before) return;
      const focusId =
        before.snapshot.focusId !== before.snapshot.rootId ? before.snapshot.focusId : undefined;
      const fresh = await loadBrain(brainId, "open", focusId);
      // The brain may have left the view while it was being read.
      if (!loadedRef.current.has(brainId)) return;
      setLoaded((current) => (current.has(brainId) ? new Map(current).set(brainId, fresh) : current));
      // `TASK-0044` — the catalogue's state was checked against the **new** revision: a
      // filter is read again (a selected match past the first page comes back on its own
      // fresh page), and a selection that is gone falls back to what the backend kept.
      if (fresh.resume) {
        filter.adopt(brainId, fresh.resume.filter, fresh.filterCursor ?? null, fresh.snapshot.indexRevision);
      }
      setSelected((current) =>
        current && current.brainId === brainId && !fresh.hierarchy.byId.has(current.nodeId)
          ? {
              brainId,
              nodeId:
                fresh.resume?.selectedNodeId != null &&
                fresh.hierarchy.byId.has(fresh.resume.selectedNodeId)
                  ? fresh.resume.selectedNodeId
                  : fresh.snapshot.rootId,
            }
          : current,
      );
      setDetailRefresh((count) => count + 1);
      // The journal and the selected element's state re-read on their revision; the
      // active filter re-reads its page on the same change.
      setSeenRevision((count) => count + 1);
    },
    [filter.adopt, loadBrain],
  );

  /** One closed event of the backend watcher, or one read of its state. */
  const onWatchStatus = useCallback(
    (status: WatchStatus) => {
      if (!watchTracker.accept(status)) return; // an older generation, arrived late
      const previous = watchStatusesRef.current.get(status.brainId);
      watchStatusesRef.current = new Map(watchStatusesRef.current).set(status.brainId, status);
      setWatchStatuses(watchStatusesRef.current);
      const shown = loadedRef.current.get(status.brainId);
      if (!shown) return; // not on screen: only its state is kept
      if (status.indexRevision !== null && status.indexRevision !== shown.snapshot.indexRevision) {
        void watchReloads.request(status.brainId, () => reloadForWatch(status.brainId));
      } else if (
        previous !== undefined &&
        previous.state !== status.state &&
        (status.state === "DEGRADED" ||
          status.state === "WATCHING" ||
          status.state === "PERIODIC" ||
          previous.state === "DEGRADED")
      ) {
        // No new revision, but the source's own observation may have moved: the guard saw
        // the root leave (`DEGRADED`), or a verification of a returned root finished
        // without changing a thing (`WATCHING` again, same revision — nothing to reload,
        // yet the observation is `SYNCED` again). The map stays, the badge follows. Only a
        // change of state asks, and only into a settled one (or out of a degraded one):
        // `STARTING` and `VERIFYING` leave the observation exactly as it was.
        void readSourceObservation(invoke, status.brainId).then((observed) => {
          if (observed) setSourceObservations((current) => new Map(current).set(status.brainId, observed));
        });
      }
    },
    [reloadForWatch, watchReloads, watchTracker],
  );

  // One subscription for the life of the page: the interface listens, it does not poll.
  const onWatchStatusRef = useRef(onWatchStatus);
  onWatchStatusRef.current = onWatchStatus;
  useEffect(() => {
    let live = true;
    let unlisten: (() => void) | null = null;
    void subscribeToWatchStatus((status) => {
      if (live) onWatchStatusRef.current(status);
    }).then((stop) => {
      if (live) unlisten = stop;
      else stop();
    });
    return () => {
      live = false;
      unlisten?.();
    };
  }, []);

  // The state of a watcher is read **once** for each brain shown, so a page that opens
  // after the backend already started (or already lost) a watcher does not have to wait
  // for the next event. Never repeated: everything after that comes from the event.
  const shownRealRoots = composed
    ? composed.displayedBrainIds.filter(
        (brainId) =>
          catalog?.brains.find((brain) => brain.brainId === brainId)?.sourceKind === "REAL_ROOT" &&
          loaded.has(brainId),
      )
    : [];
  const shownRealRootsKey = shownRealRoots.join("|");
  useEffect(() => {
    for (const brainId of shownRealRootsKey === "" ? [] : shownRealRootsKey.split("|")) {
      if (watchTracker.has(brainId)) continue;
      void invoke<unknown>("map_watch_status", { brainId })
        .then((payload) => {
          // Never trusted as it arrives: only the closed envelope is accepted.
          const status = parseWatchStatus(payload);
          if (status) onWatchStatusRef.current(status);
        })
        .catch(() => {});
    }
  }, [shownRealRootsKey, watchTracker]);

  /**
   * `TASK-0044` — writes down what is on screen for the brain about to be left, so the
   * outgoing state is in the catalogue **before** the focus changes. The camera is a
   * brain's own only while that brain is alone on screen: in a composition the pan and
   * zoom belong to the composition, whose coordinates mean nothing to a single brain.
   */
  const captureLiveResume = useCallback(() => {
    const chosen = selectedRef.current;
    if (chosen && resumeWriter.isKnown(chosen.brainId)) {
      resumeWriter.patch(chosen.brainId, { selectedNodeId: chosen.nodeId });
    }
    const current = composedRef.current;
    if (current && current.displayedBrainIds.length === 1) {
      const brainId = current.displayedBrainIds[0];
      const armed = viewArmedRef.current;
      if (
        armed &&
        armed.stale === null &&
        armed.key === compositionKey(current.displayedBrainIds) &&
        resumeWriter.isKnown(brainId) &&
        isStorableView(viewRef.current)
      ) {
        resumeWriter.patch(brainId, { view: { ...viewRef.current } });
      }
    }
  }, [resumeWriter]);

  /**
   * Applies a composition: loads what is missing, drops what left, restores.
   *
   * Deliberately dependency-free over the mutable state — everything it reads
   * comes from a ref — so a change of composition never races a stale closure
   * over the session memory, the way `K8` taught in the previous slice.
   */
  const applyComposition = useCallback(
    async (
      next: ComposedView,
      options: {
        action?: LifecycleAction;
        /**
         * An endpoint to land on once the composition is loaded — `M9`.
         *
         * Given as a `cek1` **key**, not a `nodeId`: the brain being brought
         * into the view may not have an index yet, and a row number for an
         * index that does not exist is meaningless. The path is resolved
         * against the snapshot that has just been loaded.
         */
        selectEndpoint?: { brainId: string; endpointKey: string };
      } = {},
    ) => {
      setBusy(true);
      setStatus(null);
      try {
        // `L9` — remember where the composition being left was, before
        // anything changes.
        const current = composedRef.current;
        // `ACTION-0054` — the common gate: every transition that reaches
        // this function and actually changes the focused brain invalidates
        // the search coordinator right here, before the first `await` below
        // and before any composition state changes. `onFocusBrain`,
        // `selectNode` and `changeProjection` (`ACTION-0053`) each guard
        // their own direct focus change, but `removeBrain()` (focus
        // transferred off a removed brain), `navigateCross` (a composition
        // focused on a brain not yet displayed) and any other caller of
        // `applyComposition` reach a changed focus through here instead —
        // catching it centrally, once, is safer than adding one more
        // handler-specific guard each time a new transition is found. A
        // transition that keeps the same focused brain invalidates nothing.
        if (current && current.focusedBrainId !== next.focusedBrainId) {
          searchCoordinator.invalidate();
        }
        const nextKey = compositionKey(next.displayedBrainIds);
        if (current) {
          const currentKey = compositionKey(current.displayedBrainIds);
          if (currentKey !== nextKey) {
            setSessions((memory) =>
              rememberComposition(memory, currentKey, {
                view: { ...viewRef.current },
                selected: selectedRef.current,
              }),
            );
          }
        }

        // `TASK-0044` — what is on screen goes into the catalogue before anything changes.
        captureLiveResume();
        await resumeWriter.flushAll();

        const nextLoaded = new Map(loadedRef.current);
        // The brains this very call read from the catalogue's state: only those carry a
        // restored state that is newer than anything this page remembers.
        const loadedNow = new Map<string, LoadedBrain>();
        for (const brainId of next.displayedBrainIds) {
          if (options.action || !nextLoaded.has(brainId)) {
            const brain = await loadBrain(brainId, options.action ?? "open");
            nextLoaded.set(brainId, brain);
            loadedNow.set(brainId, brain);
          }
        }
        // A brain removed from the view keeps nothing on screen. Its index,
        // its relations and its catalogue entry are untouched — `L6`.
        for (const brainId of [...nextLoaded.keys()]) {
          if (!next.displayedBrainIds.includes(brainId)) nextLoaded.delete(brainId);
        }

        // The focused brain **is** the active brain — `§4.1` rule 5.
        await activate(next.focusedBrainId);

        // `M9` — an explicit destination wins over the remembered one. This is
        // a navigation the user just asked for; restoring where the composition
        // was last left would land them somewhere else entirely.
        let forced: BrainNodeRef | null = null;
        if (options.selectEndpoint) {
          const parsed = splitCrossEndpointKey(options.selectEndpoint.endpointKey);
          const brain = nextLoaded.get(options.selectEndpoint.brainId);
          if (parsed && brain) {
            const reference = await invoke<BrainNodeRef | null>("map_resolve_node", {brainId:brain.record.brainId,relativePath:parsed.relativePath});
            if (reference) {
              if (!brain.hierarchy.byId.has(reference.nodeId)) {
                const snapshot = await invoke<MapProjection>("map_view", {brainId:reference.brainId,focusId:reference.nodeId});
                nextLoaded.set(reference.brainId,{...brain,snapshot,hierarchy:buildHierarchy(snapshot.nodes,snapshot.rootId)});
              }
              forced=reference;
            } else setStatus(say((t) => t.status.endpointAbsent));
          }
        }

        const restored = recallComposition(sessionsRef.current, nextKey);
        const focusedRoot = nextLoaded.get(next.focusedBrainId)?.snapshot.rootId ?? null;
        // `TASK-0044` — a composition of ONE brain is where the catalogue says that brain was
        // left: the same memory `L9` keeps (a composition of one has the key of its brain) with
        // the catalogue behind it, not a second one beside it. A brain read by this very call
        // brings its restored state; one already on screen (it was in a composition of several,
        // where only the focused brain's selection is on screen) has it in the writer's memory,
        // which every restore seeds and every change updates.
        const single = next.displayedBrainIds.length === 1 ? next.displayedBrainIds[0] : null;
        const fromCatalogue = single
          ? (loadedNow.get(single)?.resume ?? resumeWriter.current(single))
          : null;
        const memorySelection =
          restored && selectionIsStillValid(next, restored.selected) && restored.selected
            ? nextLoaded
                .get(restored.selected.brainId)
                ?.hierarchy.byId.has(restored.selected.nodeId)
              ? restored.selected
              : null
            : null;
        const catalogueSelection: BrainNodeRef | null =
          single && fromCatalogue && fromCatalogue.selectedNodeId !== null
            ? nextLoaded.get(single)?.hierarchy.byId.has(fromCatalogue.selectedNodeId)
              ? { brainId: single, nodeId: fromCatalogue.selectedNodeId }
              : null
            : null;
        const restoredSelection = fromCatalogue ? catalogueSelection : memorySelection;
        // A focused brain never falls back to its root while the catalogue remembers a
        // selection the map still shows: that root would be written over it.
        const focusedRemembered = loadedNow.get(next.focusedBrainId)?.resume ?? resumeWriter.current(next.focusedBrainId);
        const rememberedSelection: BrainNodeRef | null =
          focusedRemembered && focusedRemembered.selectedNodeId !== null &&
          nextLoaded.get(next.focusedBrainId)?.hierarchy.byId.has(focusedRemembered.selectedNodeId)
            ? { brainId: next.focusedBrainId, nodeId: focusedRemembered.selectedNodeId }
            : null;

        const compositionChanged = !current || compositionKey(current.displayedBrainIds) !== nextKey;
        restoreViewRef.current = restored ? { ...restored.view } : null;
        if (compositionChanged) {
          // A camera from the catalogue waits for a measured viewport (see the positioning
          // effect); it replaces the session memory's for a brain read from the catalogue.
          resumeViewRef.current = fromCatalogue?.view ? { ...fromCatalogue.view } : null;
          if (resumeViewRef.current) restoreViewRef.current = null;
          resumeTargetRef.current = null;
          viewArmedRef.current = null;
        }
        setLoaded(nextLoaded);
        setComposed(next);
        // The foreground brain's own panel choice is on screen from the first layout, so the
        // viewport a restored camera meets is the final one, not one that moves a moment later.
        const focusedPanel = (loadedNow.get(next.focusedBrainId)?.resume ?? resumeWriter.current(next.focusedBrainId))
          ?.detailsPanelVisible;
        if (focusedPanel !== undefined) setDetailsPanelVisible(focusedPanel);
        for (const [brainId, brain] of loadedNow) {
          if (brain.resume) {
            filter.adopt(brainId, brain.resume.filter, brain.filterCursor ?? null, brain.snapshot.indexRevision);
          }
        }
        setSelected(
          forced ??
            restoredSelection ??
            rememberedSelection ??
            (focusedRoot === null
              ? null
              : { brainId: next.focusedBrainId, nodeId: focusedRoot }),
        );
        setSelfCheck(null);
        setRelationsCheck(null);
        setMeasurement(null);
      } catch (error) {
        setComposed(next);
        setStatus(
          String(error).includes("map_not_built")
            ? say((t) => t.status.indexMissing)
            : say((t, l) => t.status.failed(describeError(error, l))),
        );
        hostLog("info", `composition refusée: ${String(error)}`);
      } finally {
        setBusy(false);
      }
    },
    [activate, captureLiveResume, filter.adopt, loadBrain, resumeWriter],
  );

  /**
   * Turns a refusal from the model into a message, rather than a stack trace.
   *
   * `L1` and `L6` demand explicit errors; an explicit error nobody can read is
   * only half of that.
   */
  const refuse = useCallback((error: unknown) => {
    if (error instanceof ComposedViewError) {
      // The closed code is what is translated; the brain it is about, an identifier, is
      // shown as it is.
      setStatus(
        say((t) =>
          t.status.compositionRefused(
            t.compositionRefusals[error.code] + (error.brainId ? ` (${error.brainId})` : ""),
          ),
        ),
      );
      hostLog("info", `composition refusée: ${error.code}`);
      return;
    }
    setStatus(say((t, l) => t.status.compositionRefused(describeError(error, l))));
  }, []);

  const onAddBrain = useCallback(
    (brainId: string) => {
      const current = composedRef.current;
      if (!current) return;
      try {
        void applyComposition(addBrain(current, order, brainId));
      } catch (error) {
        refuse(error);
      }
    },
    [applyComposition, order, refuse],
  );

  /**
   * **Ajouter un dossier** — `DEC-0033` A, the whole gesture in one place.
   *
   * The command takes no argument: the page cannot name a folder, only ask for
   * the native dialogue. Cancelling returns `null` and nothing is created, so
   * that branch says so and stops.
   *
   * Registering **scans nothing**. The new brain is brought into the view and
   * its `map_open` answers `map_not_built`, which the composition reports as
   * the "not indexed yet" state — the person then presses **Indexer**.
   */
  const onAddRealRoot = useCallback(async () => {
    setBusy(true);
    setStatus(null);
    try {
      const record = await invoke<BrainRecord | null>("map_brain_choose_real_root");
      if (!record) {
        setStatus(say((t) => t.addRealRootCancelled));
        return;
      }
      hostLog("info", `cerveau REAL_ROOT enregistré: ${record.brainId}, aucun scan`);
      const catalogue = await invoke<BrainCatalogView>("map_brains");
      setCatalog(catalogue);
      const nextOrder = catalogueOrder(catalogue.brains);
      const current = composedRef.current;
      await applyComposition(
        current
          ? addBrain(current, nextOrder, record.brainId)
          : singleBrainView(nextOrder, record.brainId),
      );
      setStatus(say((t) => t.notBuilt));
    } catch (error) {
      setStatus(say((t, l) => t.status.addRefused(describeError(error, l))));
      hostLog("info", `ajout de dossier refusé: ${String(error)}`);
    } finally {
      setBusy(false);
    }
  }, [applyComposition]);

  const onRemoveBrain = useCallback(
    (brainId: string) => {
      const current = composedRef.current;
      if (!current) return;
      try {
        void applyComposition(removeBrain(current, order, brainId));
      } catch (error) {
        refuse(error);
      }
    },
    [applyComposition, order, refuse],
  );

  const onFocusBrain = useCallback(
    (brainId: string) => {
      const current = composedRef.current;
      if (!current || current.focusedBrainId === brainId) return;
      // A brain switch changes what "the current search" means — invalidate
      // synchronously, here, so a response still in flight for the brain
      // being left can never publish under the newly focused one —
      // `ACTION-0053`.
      searchCoordinator.invalidate();
      try {
        const next = focusBrain(current, order, brainId);
        setComposed(next);
        // `TASK-0044` — each brain comes back with **its own** selection when the map
        // still shows it; the root only when it does not.
        const shownBrain = loadedRef.current.get(brainId);
        const root = shownBrain?.snapshot.rootId ?? null;
        const remembered = resumeWriter.current(brainId)?.selectedNodeId ?? null;
        if (root !== null) {
          setSelected({
            brainId,
            nodeId:
              remembered !== null && shownBrain?.hierarchy.byId.has(remembered) ? remembered : root,
          });
        }
        // The focused brain is the active brain, and that is persisted.
        void activate(brainId).catch((error) =>
          setStatus(say((t, l) => t.status.activeBrainNotSaved(describeError(error, l)))),
        );
      } catch (error) {
        refuse(error);
      }
    },
    [activate, order, refuse, resumeWriter],
  );

  /**
   * The one selection of the composed graph — `L7`.
   *
   * Selecting a node of another territory moves the focus with it, and the
   * focused brain is the active brain. A selection that changed the details
   * panel without changing the focus would leave the interface saying two
   * different things about which brain the user is in.
   */
  const projectionRequest = useRef(new Map<string, number>());
  const changeProjection = useCallback(async (brainId: string, focusId: number, after: string | null = null) => {
    // Navigating is leaving the filtered view: this call loads its own projection.
    filter.dropForNavigation(brainId);
    const ticket = (projectionRequest.current.get(brainId) ?? 0) + 1;
    projectionRequest.current.set(brainId, ticket);
    try {
      const snapshot = await invoke<MapProjection>("map_view", { brainId, focusId, after });
      if (projectionRequest.current.get(brainId) !== ticket || !loadedRef.current.has(brainId)) return;
      if (snapshot.brainId !== brainId) throw new LocalizedError((l) => strings[l].invariants.projectionOfAnotherBrain);
      setLoaded(current => {
        const previous = current.get(brainId);
        if (!previous) return current;
        const next = new Map(current);
        next.set(brainId, { ...previous, snapshot, hierarchy: buildHierarchy(snapshot.nodes, snapshot.rootId) });
        return next;
      });
      const current = composedRef.current;
      if (current?.displayedBrainIds.includes(brainId)) {
        // Same guard/reason as `onFocusBrain` — only an actual brain switch
        // invalidates; re-focusing the already-focused brain (e.g. a search
        // hit activated within it) must not cancel a search that has
        // nothing to do with this navigation.
        if (current.focusedBrainId !== brainId) searchCoordinator.invalidate();
        setComposed(focusBrain(current, order, brainId));
        await activate(brainId);
      }
      setSelected({ brainId, nodeId: focusId });
      setStatus(say((t) => t.status.visible(snapshot.materializedCount, snapshot.nodeCount)));
    } catch (error) {
      if (projectionRequest.current.get(brainId) === ticket) {
        setStatus(say((t, l) => t.status.projectionRefused(describeError(error, l))));
      }
    }
  }, [activate, filter.dropForNavigation, order]);

  const selectNode = useCallback(
    (reference: BrainNodeRef) => {
      const brain = loadedRef.current.get(reference.brainId);
      if (brain && !brain.hierarchy.byId.has(reference.nodeId)) {
        void changeProjection(reference.brainId, reference.nodeId);
        return;
      }
      setSelected((current) => (sameNodeRef(current, reference) ? current : reference));
      const current = composedRef.current;
      if (!current || current.focusedBrainId === reference.brainId) return;
      if (!current.displayedBrainIds.includes(reference.brainId)) return;
      // Same reason as `onFocusBrain` — invalidate synchronously here, the
      // instant this selection moves focus to another brain.
      searchCoordinator.invalidate();
      setComposed(focusBrain(current, order, reference.brainId));
      void activate(reference.brainId).catch((error) =>
        setStatus(say((t, l) => t.status.activeBrainNotSaved(describeError(error, l)))),
      );
    },
    [activate, order, changeProjection],
  );

  /** Selection helper for the panels, which only ever describe one brain. */
  const selectInSelectedBrain = useCallback(
    (nodeId: number) => {
      const brainId = selectedRef.current?.brainId ?? composedRef.current?.focusedBrainId;
      if (brainId) selectNode({ brainId, nodeId });
    },
    [selectNode],
  );

  // `K9` — the application starts on the brain the catalogue calls active, and
  // on **that brain alone**: the composition is session-only, so a restart
  // never restores a multi-brain view. Stated in `§3`, and true here.
  const booted = useRef(false);
  useEffect(() => {
    if (booted.current || !catalog || order.length === 0) return;
    booted.current = true;
    hostLog("info", `cerveau actif au démarrage: ${catalog.activeBrainId}, affiché seul`);
    try {
      void applyComposition(singleBrainView(order, catalog.activeBrainId));
    } catch (error) {
      refuse(error);
    }
  }, [applyComposition, catalog, order, refuse]);

  // A fresh composition opens at a readable scale centred on root/focus, and
  // that view is what `reset` reproduces — unless this composition was
  // already visited in this session, in which case `L9` asks for the view it
  // was left at. `DEC-0034` E reserves an exhaustive fit of the whole world
  // for the explicit `Ajuster à l'écran` action alone, never an opening.
  //
  // The guard is not decoration. Without it the camera moves again when the
  // viewport settles a frame later, and that second move erased the view a
  // composition had just been given back.
  const compositionId = composed ? compositionKey(composed.displayedBrainIds) : null;
  const projectionKey = renderedBrains.map(b => `${b.brainId}:${loaded.get(b.brainId)?.snapshot.focusId}:${loaded.get(b.brainId)?.snapshot.indexRevision}:${b.hierarchy.drawOrder.map(n => n.id).join(",")}`).join("|");
  /**
   * `TASK-0044` — the projection the camera was just restored for. The follow-the-focus pan
   * below reveals a selection that is out of view; for a camera the person left exactly as it
   * was, that pan would undo the restore, so it skips the one projection the restore landed on.
   */
  const restoredProjectionRef = useRef<string | null>(null);
  useEffect(() => {
    if (!compositionId || composition.territories.length === 0) return;
    // `TASK-0044` — a camera the catalogue remembered is applied only once **both** the
    // world and the viewport are known, and only after `clampView`: a window that changed
    // size since it was saved, or a corrupted number, can never leave the map unreachable.
    const measured = viewport.width > 1 && viewport.height > 1;
    const remembered = resumeViewRef.current;
    if (remembered) {
      if (!measured) return;
      resumeViewRef.current = null;
      positionedRef.current = {
        key: compositionId,
        width: viewport.width,
        height: viewport.height,
      };
      viewArmedRef.current = { key: compositionId, stale: viewRef.current };
      restoredProjectionRef.current = projectionKey;
      const placed = clampView(remembered, world, viewport);
      resumeTargetRef.current = { key: compositionId, view: { ...remembered }, applied: placed, at: Date.now() };
      setView(placed);
      return;
    }
    const target = resumeTargetRef.current;
    if (target && target.applied) {
      // Untouched since it was applied, and only for a few seconds: the same remembered
      // camera, clamped against the viewport as it is now.
      if (
        target.key === compositionId &&
        measured &&
        viewRef.current === target.applied &&
        Date.now() - target.at < 4000
      ) {
        const again = clampView(target.view, world, viewport);
        if (!sameView(again, viewRef.current)) {
          target.applied = again;
          setView(again);
        }
        return;
      }
      resumeTargetRef.current = null;
    }
    const restored = restoreViewRef.current;
    if (restored) {
      restoreViewRef.current = null;
      positionedRef.current = {
        key: compositionId,
        width: viewport.width,
        height: viewport.height,
      };
      viewArmedRef.current = measured ? { key: compositionId, stale: viewRef.current } : null;
      setView(restored);
      return;
    }
    if (!shouldFitComposition(positionedRef.current, compositionId)) return;
    positionedRef.current = {
      key: compositionId,
      width: viewport.width,
      height: viewport.height,
    };
    const anchor = focusAnchorRect(composition);
    viewArmedRef.current = measured ? { key: compositionId, stale: viewRef.current } : null;
    setView(anchor ? readableView(anchor, world, viewport) : fitView(world, viewport));
    // `world`/`focusAnchorRect` are derived from the composition, so they
    // change exactly when the composition does; listing them would reopen on
    // every identity change of a memo without adding a case this does not
    // already cover.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compositionId, composition.territories.length, viewport.width, viewport.height]);

  // `TASK-0044` — the camera of a brain that is alone on screen is written to the catalogue,
  // through the bounded writer (never one write per frame). The render that still shows the
  // camera from before the positioning writes nothing.
  useEffect(() => {
    const armed = viewArmedRef.current;
    const shown = composedRef.current;
    if (!armed || !shown || shown.displayedBrainIds.length !== 1) return;
    if (armed.key !== compositionKey(shown.displayedBrainIds)) return;
    if (armed.stale !== null) {
      if (view === armed.stale) return;
      armed.stale = null;
    }
    const brainId = shown.displayedBrainIds[0];
    if (!resumeWriter.isKnown(brainId) || !isStorableView(view)) return;
    resumeWriter.patch(brainId, { view: { ...view } });
  }, [view, resumeWriter]);

  // `TASK-0044` — the selection of a brain is its own: it goes to the catalogue under that
  // brain's id, never as a bare number.
  useEffect(() => {
    if (!selected || !resumeWriter.isKnown(selected.brainId)) return;
    resumeWriter.patch(selected.brainId, { selectedNodeId: selected.nodeId });
  }, [selected, resumeWriter]);

  // `TASK-0044` — the branch each brain is on. A filtered page carries no branch: the one
  // the person was on stays as it was until the filter is dropped.
  useEffect(() => {
    for (const [brainId, brain] of loaded) {
      if (!resumeWriter.isKnown(brainId) || brain.snapshot.filtered) continue;
      const branch = brain.snapshot.focusId === brain.snapshot.rootId ? null : brain.snapshot.focusId;
      resumeWriter.patch(brainId, { focusNodeId: branch });
    }
  }, [loaded, resumeWriter]);

  // The panel belongs to the brain in the foreground: read from what the catalogue holds for
  // it, so switching brains shows each one's own choice.
  useEffect(() => {
    if (!filterBrainId) return;
    let live = true;
    void resumeWriter.load(filterBrainId).then((state) => {
      if (live && composedRef.current?.focusedBrainId === filterBrainId) {
        setDetailsPanelVisible(state.detailsPanelVisible);
      }
    });
    return () => {
      live = false;
    };
  }, [filterBrainId, resumeWriter]);

  // Best effort on a normal close: whatever is still waiting goes to the catalogue. It is
  // not a promise about a crash — the debounce keeps the wait short, nothing more.
  useEffect(() => {
    const flush = () => {
      captureLiveResume();
      void resumeWriter.flushAll();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", onVisibility);
      // The page goes away: nothing waits behind a timer that will never be read.
      flush();
    };
  }, [captureLiveResume, resumeWriter]);

  // `.map-view` can grow after this composition was already positioned — the
  // aside panel filling in with real data (relations, content observations)
  // changes `.app__main`'s grid row height, and the canvas follows it. This
  // never re-centres — `shouldFitComposition` above already decided this
  // composition keeps its view — it only keeps the existing pan/zoom valid
  // against whatever the viewport actually measures now, so a projection
  // positioned before that growth cannot end up stranded outside the visible
  // canvas.
  useEffect(() => {
    if (composition.territories.length === 0) return;
    // The same object when nothing moves: a camera that was just restored is recognised as
    // untouched by its identity.
    setView((current) => {
      const clamped = clampView(current, world, viewport);
      return sameView(clamped, current) ? current : clamped;
    });
    // `world` changes with the composition, not the viewport; reacting to it
    // here too would refire this for reasons `shouldFitComposition` above
    // already owns.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewport.width, viewport.height]);

  // A branch navigation, an expanded indicator or a refresh replaces the
  // projection under the same budget — `DEC-0034` C — and the camera follows
  // the new focus without shrinking the map to fit it: no `fitView` here any
  // more, only a pan that keeps the user's own zoom when it is still
  // spatially coherent — `DEC-0034` E.
  useEffect(() => {
    const restoredHere = restoredProjectionRef.current === projectionKey;
    restoredProjectionRef.current = null;
    if (!projectionKey || restoredHere) return;
    const anchor = focusAnchorRect(composition);
    if (!anchor) return;
    setView((current) => recenterOnFocus(anchor, current, world, viewportRef.current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectionKey]);

  /**
   * The common inter-brain store, re-read whenever the loaded brains change.
   *
   * **Not because the composition changes what the store holds** — it does not,
   * and that is the point of §4.1. It changes what can be **resolved**: an
   * endpoint in a brain whose index has just been built stops being a bare key
   * and becomes a node the map can draw. What comes back is the same set of
   * relations either way; only `nodeId` and `brainIndexed` move.
   */
  useEffect(() => {
    let live = true;
    invoke<CrossRelationsOverview>("map_cross_relations_open")
      .then((next) => live && setCrossOverview(next))
      .catch((error) => {
        if (!live) return;
        hostLog("error", `relations inter-cerveaux indisponibles: ${String(error)}`);
        setCrossOverview(null);
      });
    return () => {
      live = false;
    };
  }, [loaded]);

  useEffect(() => {
    if (!selected) {
      setDetail(null);
      return;
    }
    let live = true;
    setDetailLoading(true);
    // The **pair** goes to the backend, never a loose row number: the same id
    // exists in another brain and would resolve there — `TASK-0018` §4.1
    // rule 5, `TASK-0019` `L3`.
    invoke<NodeDetail>("map_node_detail", { reference: selected })
      .then((next) => live && setDetail(next))
      .catch(
        (error) =>
          live && setStatus(say((t, l) => t.status.detailUnavailable(describeError(error, l)))),
      )
      .finally(() => live && setDetailLoading(false));
    return () => {
      live = false;
    };
  }, [selected, detailRefresh]);

  // Content facts are read from the selected brain's own signals store. The
  // query is deliberately separate from relation loading: equal digests never
  // enter either relation overview.
  useEffect(() => {
    if (
      !selected ||
      !detail ||
      detail.node.id !== selected.nodeId ||
      detail.node.kind !== "file"
    ) {
      setContentObservation(null);
      setContentSummary(null);
      setIdenticalContentMemberCount(0);
      setContentLoading(false);
      return;
    }
    let live = true;
    setContentLoading(true);
    Promise.all([
      invoke<ContentObservationSummary>("map_content_summary", { brainId: selected.brainId }),
      invoke<ContentObservation | null>("map_content_observation_for_path", {
        brainId: selected.brainId,
        relativePath: detail.node.relativePath,
      }),
    ])
      .then(async ([summary, observation]) => {
        if (!live) return;
        setContentSummary(summary);
        setContentObservation(observation);
        if (observation?.observationStatus === "HASHED" && observation.hashHex) {
          const members = await invoke<ContentObservation[]>("map_content_identical_members", {
            brainId: selected.brainId,
            hash: observation.hashHex,
          });
          if (live) setIdenticalContentMemberCount(members.length);
        } else {
          setIdenticalContentMemberCount(0);
        }
      })
      .catch((error) => {
        if (!live) return;
        hostLog("error", `observation de contenu indisponible: ${String(error)}`);
        setContentObservation(null);
        setIdenticalContentMemberCount(0);
      })
      .finally(() => live && setContentLoading(false));
    return () => {
      live = false;
    };
  }, [contentRevision, detail, selected]);

  const observeFocusedContent = useCallback(async () => {
    const brainId = composedRef.current?.focusedBrainId;
    if (!brainId) return;
    setContentCampaignRunning(true);
    try {
      const report = await invoke<ContentObservationReport>("map_content_observe", { brainId });
      setContentReport(report);
      setContentObservedBrains((current) => new Set([...current, brainId]));
      setContentRevision((current) => current + 1);
      setStatus(
        say((t) =>
          t.status.contentObserved(report.hashedCount, report.indexedFileCount, report.generationId),
        ),
      );
    } catch (error) {
      setStatus(say((t, l) => t.status.contentObservationFailed(describeError(error, l))));
    } finally {
      setContentCampaignRunning(false);
    }
  }, []);

  // The panel reads the relations of the selection from the store, on every
  // change of selection and after every approval. The loaded brain is in the
  // dependency list on purpose: an approval replaces its overview, and that is
  // what makes the panel show counts that came back rather than counts it
  // guessed.
  const selectedBrain = selected ? loaded.get(selected.brainId) ?? null : null;
  const selectedOverview = selectedBrain?.relations ?? null;
  useEffect(() => {
    const brainId = selected?.brainId ?? composed?.focusedBrainId;
    if (!brainId) {
      setRelationEngineStatus(null);
      return;
    }
    let live = true;
    invoke<RelationEngineStatus>("map_relation_engine_status", { brainId })
      .then((next) => live && setRelationEngineStatus(next))
      .catch((error) => {
        if (live) hostLog("error", `statut du moteur indisponible: ${String(error)}`);
      });
    return () => {
      live = false;
    };
  }, [composed?.focusedBrainId, contentRevision, selected?.brainId, selectedOverview?.engineCurrent]);

  const analyzeRelations = useCallback(async () => {
    const brainId = selectedRef.current?.brainId ?? composedRef.current?.focusedBrainId;
    if (!brainId) return;
    setRelationEngineRunning(true);
    try {
      const report = await invoke<RelationEngineReport>("map_relation_engine_run", { brainId });
      const [engineStatus, overview] = await Promise.all([
        invoke<RelationEngineStatus>("map_relation_engine_status", { brainId }),
        invoke<RelationsOverview>("map_relations_open", { brainId }),
      ]);
      setRelationEngineReport(report);
      setRelationEngineStatus(engineStatus);
      setLoaded((current) => {
        const brain = current.get(brainId);
        if (!brain) return current;
        const updated = new Map(current);
        updated.set(brainId, { ...brain, relations: overview });
        return updated;
      });
      setStatus(
        say((t) =>
          t.status.analysisDone(
            report.engineVersion,
            report.deterministicRelationsProduced,
            report.suggestionsProduced,
          ),
        ),
      );
    } catch (error) {
      setStatus(say((t, l) => t.status.analysisFailed(describeError(error, l))));
    } finally {
      setRelationEngineRunning(false);
    }
  }, []);
  useEffect(() => {
    if (!selected || !selectedOverview) {
      setNodeRelations(null);
      return;
    }
    let live = true;
    setRelationsLoading(true);
    invoke<NodeRelations>("map_relations_for_node", { reference: selected })
      .then((next) => live && setNodeRelations(next))
      .catch(() => live && setNodeRelations(null))
      .finally(() => live && setRelationsLoading(false));
    return () => {
      live = false;
    };
  }, [selected, selectedOverview]);

  // The inter-brain section of the panel, read from the COMMON store for the
  // selected node. Kept apart from the intra-brain effect above: the two ask
  // two different commands of two different stores, and folding them together
  // is exactly how one would end up reporting the other's counts.
  useEffect(() => {
    if (!selected) {
      setNodeCross(null);
      return;
    }
    let live = true;
    setCrossLoading(true);
    invoke<NodeCrossRelations>("map_cross_relations_for_node", { reference: selected })
      .then((next) => live && setNodeCross(next))
      .catch(() => live && setNodeCross(null))
      .finally(() => live && setCrossLoading(false));
    return () => {
      live = false;
    };
  }, [selected, crossOverview]);

  /**
   * The one explicit act that turns a suggestion into a relation.
   *
   * The whole overview is replaced by what the command returns, so the counts
   * on screen are the store's, never an optimistic increment — **and only the
   * approving brain's entry is replaced**, which is `L8` in one line: approving
   * `S-005` in Alpha cannot reach Gamma's overview because it never writes to
   * it.
   */
  const approveSuggestion = useCallback(
    async (suggestionKey: string) => {
      const reference = selectedRef.current;
      if (!reference) return;
      const brainId = reference.brainId;
      setApproving(suggestionKey);
      try {
        const next = await invoke<RelationsOverview>("map_relations_approve", {
          brainId,
          suggestionKey,
        });
        setLoaded((current) => {
          const brain = current.get(brainId);
          if (!brain) return current;
          const updated = new Map(current);
          updated.set(brainId, { ...brain, relations: next });
          return updated;
        });
        setStatus(say((t) => t.status.approved(suggestionKey, brainId)));
      } catch (error) {
        setStatus(say((t, l) => t.status.approvalRefused(describeError(error, l))));
      } finally {
        setApproving(null);
      }
    },
    [],
  );

  /**
   * The brain the review queue is about — `TASK-0025` §9.
   *
   * The selected node's brain when there is one, the focused brain of the
   * composition otherwise. The same rule `analyzeRelations` already uses, so
   * the queue and the engine control never disagree about whose relations are
   * on screen.
   */
  const reviewBrainId = selected?.brainId ?? composed?.focusedBrainId ?? null;

  /**
   * Reads one page of the queue from the backend — `F-044`.
   *
   * Called after every decision, and never replaced by an in-place edit of the
   * page already held: `SR6` and `SR7` require the pending count to fall
   * because the store says so.
   */
  const loadReviewQueue = useCallback(async (brainId: string) => {
    setReviewLoading(true);
    try {
      const queue = await invoke<SuggestionReviewQueue>("map_relations_review_queue", {
        brainId,
      });
      setReviewQueue(queue);
      return queue;
    } catch {
      setReviewQueue(null);
      return null;
    } finally {
      setReviewLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!reviewBrainId) {
      setReviewQueue(null);
      return;
    }
    let live = true;
    setReviewLoading(true);
    invoke<SuggestionReviewQueue>("map_relations_review_queue", { brainId: reviewBrainId })
      .then((queue) => live && setReviewQueue(queue))
      .catch(() => live && setReviewQueue(null))
      .finally(() => live && setReviewLoading(false));
    return () => {
      live = false;
    };
    // `selectedOverview` and the engine report are in the dependency list
    // because approving, rejecting and running the engine all move what is
    // pending. The queue is re-read rather than adjusted.
  }, [reviewBrainId, selectedOverview, relationEngineReport]);

  useEffect(() => {
    // A different brain is a different queue; the cursor of the previous one
    // means nothing here.
    setReviewCursor(0);
  }, [reviewBrainId]);

  /**
   * **Confirmer** — the approval path `TASK-0024` was verified on, reached
   * from the queue.
   *
   * Nothing new happens to the store: the same command, the same single
   * `APPROVED` relation. What is new is only that the queue is re-read
   * afterwards, so its count comes back from the backend.
   */
  const confirmFromQueue = useCallback(
    async (suggestionKey: string) => {
      const brainId = reviewBrainId;
      if (!brainId) return;
      setDeciding(suggestionKey);
      try {
        const next = await invoke<RelationsOverview>("map_relations_approve", {
          brainId,
          suggestionKey,
        });
        setLoaded((current) => {
          const brain = current.get(brainId);
          if (!brain) return current;
          const updated = new Map(current);
          updated.set(brainId, { ...brain, relations: next });
          return updated;
        });
        // The cursor is **not** reset: the decided item left the page, so the
        // index the reader was on now holds the next one. Sending them back to
        // the top after every decision would make a queue of any length
        // unusable.
        await loadReviewQueue(brainId);
        setStatus(say((t) => t.status.confirmed(suggestionKey, brainId)));
      } catch (error) {
        setStatus(say((t, l) => t.status.confirmationRefused(describeError(error, l))));
      } finally {
        setDeciding(null);
      }
    },
    [loadReviewQueue, reviewBrainId],
  );

  /**
   * **Rejeter** — the recorded refusal of `F-045`.
   *
   * Creates no relation, of any provenance. The decision lives in the
   * suggestion's own row, which is what stops an unchanged rerun of `dre-v1`
   * from proposing it again.
   */
  const rejectFromQueue = useCallback(
    async (suggestionKey: string) => {
      const brainId = reviewBrainId;
      if (!brainId) return;
      setDeciding(suggestionKey);
      try {
        const next = await invoke<RelationsOverview>("map_relations_reject", {
          brainId,
          suggestionKey,
        });
        setLoaded((current) => {
          const brain = current.get(brainId);
          if (!brain) return current;
          const updated = new Map(current);
          updated.set(brainId, { ...brain, relations: next });
          return updated;
        });
        await loadReviewQueue(brainId);
        setStatus(say((t) => t.status.rejected(suggestionKey, brainId)));
      } catch (error) {
        setStatus(say((t, l) => t.status.rejectionRefused(describeError(error, l))));
      } finally {
        setDeciding(null);
      }
    },
    [loadReviewQueue, reviewBrainId],
  );

  /**
   * **Plus tard** — the one control of the queue that decides nothing.
   *
   * No command, no write, no state. The cursor moves and the suggestion stays
   * `PENDING`, exactly as `DEC-0027` §B requires: there is no `DEFERRED` to
   * put it in, and inventing one would be a durable decision the user did not
   * make.
   */
  const laterFromQueue = useCallback(() => {
    setReviewCursor((cursor) => cursor + 1);
    setStatus(say((t) => t.status.later));
  }, []);

  /**
   * The one explicit act that turns an **inter-brain** suggestion into a
   * relation — `M10`.
   *
   * The whole overview is replaced by what the command returns, so the counts
   * on screen are the store's, never an optimistic increment. No `brainId` is
   * passed: a suggestion joins two brains, and the store is common.
   */
  const approveCrossSuggestion = useCallback(async (suggestionKey: string) => {
    setApprovingCross(suggestionKey);
    try {
      const next = await invoke<CrossRelationsOverview>("map_cross_relations_approve", {
        suggestionKey,
      });
      setCrossOverview(next);
      setStatus(say((t) => t.status.crossApproved(suggestionKey)));
    } catch (error) {
      setStatus(say((t, l) => t.status.crossApprovalRefused(describeError(error, l))));
    } finally {
      setApprovingCross(null);
    }
  }, []);

  /**
   * Following an inter-brain relation — **a navigation, and nothing else**.
   *
   * `M8`: the target brain is displayed, so this selects the other
   * `BrainNodeRef` and the focus follows the selection, as it does for any
   * selection.
   *
   * `M9`: the target brain is **not** displayed, so it is added to the view in
   * **catalogue order**, loaded without merging anything, focused, and the
   * exact endpoint is selected. Nothing is created, modified or approved: the
   * common store is not written to on this path at all.
   */
  const navigateCross = useCallback(
    (target: BrainNodeRef | { brainId: string; endpointKey: string }) => {
      const current = composedRef.current;
      if (!current) return;
      const { brainId } = target;

      if (current.displayedBrainIds.includes(brainId)) {
        if ("nodeId" in target) {
          selectNode(target);
          return;
        }
        // Displayed but handed as a key — resolve it in the brain already on
        // hand rather than reloading the composition for nothing.
        const parsed = splitCrossEndpointKey(target.endpointKey);
        if (parsed) void invoke<BrainNodeRef | null>("map_resolve_node", {brainId,relativePath:parsed.relativePath})
          .then(reference => { if (reference) selectNode(reference); else setStatus(say((t) => t.status.endpointAbsent)); })
          .catch(error => setStatus(say((t, l) => t.status.resolutionRefused(describeError(error, l)))));
        return;
      }

      try {
        // Added, then focused. `addBrain` deliberately leaves the focus where
        // it was — displaying a brain is not choosing it — so following a
        // relation says so explicitly instead of relying on a side effect.
        const next = focusBrain(addBrain(current, order, brainId), order, brainId);
        const endpointKey =
          "endpointKey" in target
            ? target.endpointKey
            : `cek1|${brainId}|${
                loadedRef.current.get(brainId)?.hierarchy.byId.get(target.nodeId)
                  ?.relativePath ?? ""
              }`;
        // Said AFTER the composition lands, not before: `applyComposition`
        // clears the status line on entry, so a message set here would be wiped
        // by the very act it describes — which is what the first real M12 run
        // published, as an empty string.
        void applyComposition(next, { selectEndpoint: { brainId, endpointKey } }).then(() =>
          setStatus(say((t) => t.status.crossNavigation(brainId))),
        );
      } catch (error) {
        refuse(error);
      }
    },
    [applyComposition, order, refuse, selectNode],
  );

  const runCrossCheck = useCallback(async () => {
    try {
      setCrossCheck(await invoke<CrossRelationsSelfCheck>("map_cross_relations_self_check"));
    } catch (error) {
      setStatus(say((t, l) => t.status.crossCheckFailed(describeError(error, l))));
    }
  }, []);

  const runRelationsCheck = useCallback(async () => {
    const brainId = selectedRef.current?.brainId ?? composed?.focusedBrainId;
    if (!brainId) return;
    try {
      setRelationsCheck(
        await invoke<RelationsSelfCheck>("map_relations_self_check", { brainId }),
      );
    } catch (error) {
      setStatus(say((t, l) => t.status.relationsCheckFailed(describeError(error, l))));
    }
  }, [composed]);

  const runSelfCheck = useCallback(async () => {
    const brainId = composed?.focusedBrainId;
    if (!brainId) return;
    try {
      setSelfCheck(await invoke<MapSelfCheck>("map_self_check", { brainId }));
    } catch (error) {
      setStatus(say((t, l) => t.status.checkFailed(describeError(error, l))));
    }
  }, [composed]);

  /**
   * Replays `H1` to `H7`, `H10` and `H11` against the running host, and writes
   * what it found — `L11`.
   *
   * The unit tests already check the same properties in temporary directories.
   * This runs them where it actually matters — through the real commands, on
   * the real sandbox, in the engine that ships — and publishes the result
   * rather than asserting it away.
   */
  const runVerification = useCallback(async () => {
    const brains = catalog?.brains ?? [];
    if (brains.length === 0) return;
    const findings: unknown[] = [];
    try {
      for (const brain of brains) {
        const fixture = fixtures.find((entry) => entry.id === brain.sourceRef) ?? null;
        hostLog("info", `vérification ${brain.brainId}: ouverture`);
        const first = await prepareScenarioIndex(invoke, brain.brainId, "map_refresh");
        const check = await invoke<MapSelfCheck>("map_self_check", { brainId: brain.brainId });
        const before = await invoke<FixtureIntegrity>("map_integrity", {
          brainId: brain.brainId,
        });

        hostLog("info", `vérification ${brain.brainId}: reconstruction transactionnelle explicite`);
        const rebuilt = await prepareScenarioIndex(invoke, brain.brainId, "map_rebuild");
        const after = await invoke<FixtureIntegrity>("map_integrity", { brainId: brain.brainId });

        const entry = {
          brainId: brain.brainId,
          indexPath: first.indexPath,
          fixtureId: first.sourceRef,
          declaredCeiling: fixture?.maxNodes ?? first.nodeCeiling,
          nodeCount: first.nodeCount,
          plannedNodes: first.plannedNodes,
          maxDepth: first.maxDepth,
          depthCeiling: first.depthCeiling,
          nodeCeiling: first.nodeCeiling,
          schemaVersion: first.schemaVersion,
          layoutInvocations: first.layoutInvocations,
          timingsMs: { scan: first.scanMs, layout: first.layoutMs, index: first.indexMs },
          rebuiltTimingsMs: {
            scan: rebuilt.scanMs,
            layout: rebuilt.layoutMs,
            index: rebuilt.indexMs,
          },
          h1_pathsAgree: check.pathsAgree,
          h1_counts: {
            planned: check.plannedPaths,
            onDisk: check.observedPaths,
            indexed: check.indexedPaths,
          },
          h1_missingFromIndex: check.missingFromIndex,
          h1_unexpectedInIndex: check.unexpectedInIndex,
          h2_layoutViolations: check.layoutViolations,
          h3_hierarchyMismatches: check.hierarchyMismatches,
          h5_detailMismatches: check.detailMismatches,
          h6_readOnlyConfirmed: first.readOnlyConfirmed && rebuilt.readOnlyConfirmed,
          // These four brains are synthetic, so a fingerprint is always taken
          // and is never null; `??` states the fallback rather than asserting
          // it away, and `h6_readOnlyConfirmed` above is false if it ever were.
          h6_fingerprintBefore: first.fingerprintBefore ?? "",
          h6_fingerprintAfterRebuild: rebuilt.fingerprintAfter ?? "",
          h6_fingerprintUnchanged:
            first.fingerprintBefore !== null &&
            first.fingerprintBefore === rebuilt.fingerprintAfter,
          h6_filetopoArtifactsInRoot: after.filetopoArtifacts,
          h7_digestBefore: first.reconstructibleDigest,
          h7_digestAfterRebuild: rebuilt.reconstructibleDigest,
          h7_equivalent: first.reconstructibleDigest === rebuilt.reconstructibleDigest,
          h7_nonReconstructible: rebuilt.nonReconstructible,
          h11_withinCeilings:
            first.nodeCount <= (fixture?.maxNodes ?? first.nodeCeiling) &&
            first.nodeCount <= first.nodeCeiling &&
            first.maxDepth <= first.depthCeiling,
          integrityBefore: before,
        };
        findings.push(entry);
        hostLog(
          "info",
          `vérification ${brain.brainId}: H1=${entry.h1_pathsAgree} ` +
            `H2=${entry.h2_layoutViolations.length} H3=${entry.h3_hierarchyMismatches.length} ` +
            `H5=${entry.h5_detailMismatches.length} H6=${entry.h6_fingerprintUnchanged} ` +
            `H7=${entry.h7_equivalent} H10=${entry.layoutInvocations} H11=${entry.h11_withinCeilings}`,
        );
      }

      // `L2`, read off the real reports: three brains, three distinct index
      // files, and two of them on the same source. Published beside the
      // read-only findings because it is the same reading of the same disk.
      const indexPaths = findings.map((entry) => (entry as { indexPath: string }).indexPath);
      const written = await invoke<string>("map_write_run_artifact", {
        name: K11_ARTIFACT,
        contents: JSON.stringify(
          {
          task: "TASK-0026",
            criteria: ["L11", "L2", "K11", "K3", "H1", "H2", "H3", "H5", "H6", "H7", "H8", "H10", "H11"],
            sourceCriterion: "TASK-0018/K11",
            nature: "regression / compatibility replay",
            doesNotReplace:
              "docs/performance/runs/TASK-0018-K11-readonly-and-isolation.json, " +
              "docs/performance/runs/TASK-0019-K11-readonly-regression-webview2.json",
            replacesCanonicalEvidence: false,
            note:
              "Read-only and isolation, replayed on the composed runtime. Driven by brain: " +
              "the runtime exposes no fixture-keyed command. TASK-0018's own K11 artefact is " +
              "the canonical evidence of a VERIFIED task and is protected at the write gate.",
            capturedAtIso: new Date().toISOString(),
            host,
            l2_indexPaths: indexPaths,
            l2_indexPathsDistinct: new Set(indexPaths).size === indexPaths.length,
            findings,
          },
          null,
          2,
        ),
      });
      hostLog("info", `vérification terminée, artefact écrit: ${written}`);
      setStatus(say((t) => t.status.verificationWritten(written)));
    } catch (error) {
      hostLog("error", `vérification interrompue: ${String(error)}`);
      setStatus(say((t, l) => t.status.verificationInterrupted(describeError(error, l))));
    }
  }, [catalog, fixtures, host]);

  runVerificationRef.current = runVerification;

  /**
   * The `H9` loop, migrated again — now it walks the **composed** runtime.
   *
   * Kept so the runtime stays measurable, and renamed so it cannot overwrite
   * anything — reserve `X5`, extended. `TASK-0019` **does not run it**: it
   * takes no measurement decision and sets no threshold, and `R8` stays whole.
   */
  const runMeasurement = useCallback(async () => {
    const brains = catalog?.brains ?? [];
    if (measuring || brains.length === 0) return;
    setMeasuring(true);
    setStatus(null);
    const results: FixtureMeasurement[] = [];

    try {
      for (const brain of brains) {
        hostLog("info", `cerveau ${brain.brainId}: composition d'un seul cerveau`);
        await prepareScenarioIndex(invoke, brain.brainId);
        await applyComposition(singleBrainView(order, brain.brainId), { action: "open" });
        await afterPaint();
        const measuredViewport = await awaitLaidOutViewport(() => viewportRef.current);
        const loadedBrain = loadedRef.current.get(brain.brainId);
        if (!loadedBrain) {
          throw new LocalizedError((l) => strings[l].invariants.brainNotLoaded(brain.brainId));
        }

        const box = { x: 0, y: 0, w: world.w, h: world.h };
        const targets = selectionTargets(
          loadedBrain.snapshot.nodes.map((node) => node.id),
          SELECTIONS_PER_RUN,
        );
        const runs: RunSample[] = [];

        for (let run = 1; run <= RUNS_PER_FIXTURE; run += 1) {
          hostLog("info", `cerveau ${brain.brainId}: exécution ${run}/${RUNS_PER_FIXTURE}`);
          setView(fitView(box, viewportRef.current));
          for (let warm = 0; warm < WARMUP_FRAMES; warm += 1) await nextFrame();

          const frameTimesMs: number[] = [];
          let previous = performance.now();
          for (let frame = 0; frame < FRAMES_PER_RUN; frame += 1) {
            const step = scriptedStep(frame);
            const centre = {
              x: viewportRef.current.width / 2,
              y: viewportRef.current.height / 2,
            };
            const zoomed = zoomAbout(viewRef.current, step.zoom, centre, box, viewportRef.current);
            setView(panBy(zoomed, step.dx, step.dy, box, viewportRef.current));
            await nextFrame();
            const now = performance.now();
            frameTimesMs.push(now - previous);
            previous = now;
          }

          const selectionLatenciesMs: number[] = [];
          for (const target of targets) {
            const started = performance.now();
            setSelected({ brainId: brain.brainId, nodeId: target });
            await afterPaint();
            selectionLatenciesMs.push(performance.now() - started);
          }

          runs.push({ run, frameTimesMs, selectionLatenciesMs });
        }

        results.push(
          aggregate(brain.brainId, loadedBrain.snapshot.nodeCount, measuredViewport, runs),
        );
      }

      const artifact = {
        task: "TASK-0026",
        sourceCriterion: "TASK-0016/H9",
        nature: "regression / compatibility replay",
        doesNotReplace:
          "docs/performance/runs/TASK-0016-H9-webview2.json, " +
          "docs/performance/runs/TASK-0019-H9-composed-runtime-regression-webview2.json",
        replacesCanonicalEvidence: false,
        capturedAtIso: new Date().toISOString(),
        host,
        framesPerRun: FRAMES_PER_RUN,
        runsPerFixture: RUNS_PER_FIXTURE,
        selectionsPerRun: SELECTIONS_PER_RUN,
        warmupFrames: WARMUP_FRAMES,
        note:
          "Replay of the H9 loop on the composed runtime, one brain displayed at a time. It " +
          "does NOT replace TASK-0016's frozen H9 campaign. TASK-0019 takes no measurement " +
          "decision and sets no threshold; R8 is untouched. No fps target is set anywhere.",
        measurements: results,
      };
      const written = await invoke<string>("map_write_run_artifact", {
        name: H9_REGRESSION_ARTIFACT,
        contents: JSON.stringify(artifact, null, 2),
      });
      setMeasurement(results);
      setStatus(say((t) => t.status.measurementWritten(written)));
      hostLog("info", `campagne terminée, artefact écrit: ${written}`);
    } catch (error) {
      // A failed campaign is still a result, and it is written down.
      setStatus(say((t, l) => t.status.measurementInterrupted(describeError(error, l))));
      hostLog("error", `campagne interrompue: ${String(error)}`);
      try {
        await invoke<string>("map_write_run_artifact", {
          name: H9_REGRESSION_ABANDON_ARTIFACT,
          contents: JSON.stringify(
            {
              task: "TASK-0026",
              sourceCriterion: "TASK-0016/H9",
              nature: "regression / compatibility replay",
              doesNotReplace:
          "docs/performance/runs/TASK-0016-H9-webview2.json, " +
          "docs/performance/runs/TASK-0019-H9-composed-runtime-regression-webview2.json",
              replacesCanonicalEvidence: false,
              outcome: "abandoned",
              reason: String(error),
              host,
              partialMeasurements: results,
            },
            null,
            2,
          ),
        });
      } catch {
        // Nothing further to do: the status line already carries the reason.
      }
    } finally {
      setMeasuring(false);
    }
  }, [applyComposition, catalog, host, measuring, order, world.h, world.w]);

  runMeasurementRef.current = runMeasurement;

  const showOnly = useCallback(
    (brainId: string) => applyComposition(singleBrainView(order, brainId)),
    [applyComposition, order],
  );

  // Explicit proof preparation, invoked only by scenario actions/automation.
  const prepareScenarioBrains = useCallback(async (allowBuild: boolean) => {
    const current = await invoke<BrainCatalogView>("map_brains");
    for (const brain of current.brains) {
      try { await invoke<MapOpenReport>("map_open", { brainId: brain.brainId }); }
      catch (error) {
        if (!allowBuild || !String(error).includes("map_not_built")) throw error;
        await prepareScenarioIndex(invoke, brain.brainId);
      }
    }
    await applyComposition(singleBrainView(current.brains.map(brain => brain.brainId), current.activeBrainId), { action: "open" });
  }, [applyComposition]);

  const runRelationScenario = useCallback(
    async () => {
      await prepareScenarioBrains(true);
      return runScenario({
        invoke: (command, args) => invoke(command, args),
        host,
        showOnly,
        setSelected: (reference) => setSelected(reference),
        setStatus,
        log: hostLog,
      });
    },
    [host, showOnly, prepareScenarioBrains],
  );

  runRelationScenarioRef.current = runRelationScenario;

  const runBrainScenario = useCallback(async () => {
    const pass = host?.autoBrainsPass === 2 ? 2 : 1;
    await prepareScenarioBrains(pass === 1);
    return runBrains(
      {
        invoke: (command, args) => invoke(command, args),
        host,
        showOnly,
        setSelected: (reference) => setSelected(reference),
        setView,
        // Read at the moment it is asked for, so what the scenario publishes is
        // the state on screen rather than a value captured a render earlier.
        readSession: () => ({ view: viewRef.current, selected: selectedRef.current }),
        setStatus,
        log: hostLog,
      },
      pass,
    );
  }, [host, showOnly, prepareScenarioBrains]);

  runBrainScenarioRef.current = runBrainScenario;

  const runComposedScenario = useCallback(async () => {
    const pass = host?.autoComposedPass === 2 ? 2 : 1;
    await prepareScenarioBrains(pass === 1);
    return runComposed(
      {
        invoke: (command, args) => invoke(command, args),
        host,
        showOnly,
        remove: onRemoveBrain,
        select: selectNode,
        setView,
        readSession: () => ({ view: viewRef.current, selected: selectedRef.current }),
        readComposition: () => composedRef.current,
        setStatus,
        log: hostLog,
      },
      pass,
    );
  }, [host, onRemoveBrain, selectNode, showOnly, prepareScenarioBrains]);

  runComposedScenarioRef.current = runComposedScenario;

  const runCrossScenario = useCallback(async () => {
    const pass = host?.autoCrossPass === 2 ? 2 : 1;
    await prepareScenarioBrains(pass === 1);
    return runCross(
      {
        invoke: (command, args) => invoke(command, args),
        host,
        showOnly,
        remove: onRemoveBrain,
        select: selectNode,
        readComposition: () => composedRef.current,
        setStatus,
        log: hostLog,
      },
      pass,
    );
  }, [host, onRemoveBrain, selectNode, showOnly, prepareScenarioBrains]);

  runCrossScenarioRef.current = runCrossScenario;

  const runTopographicScenario = useCallback(async () => {
    const pass = host?.autoTopographicPass === 2 ? 2 : 1;
    await prepareScenarioBrains(pass === 1);
    return runTopographic(
      {
        invoke: (command, args) => invoke(command, args),
        host,
        showOnly,
        remove: onRemoveBrain,
        select: selectNode,
        readComposition: () => composedRef.current,
        readView: () => viewRef.current,
        setStatus,
        log: hostLog,
      },
      pass,
    );
  }, [host, onRemoveBrain, selectNode, showOnly, prepareScenarioBrains]);

  runTopographicScenarioRef.current = runTopographicScenario;

  const runContentScenario = useCallback(async () => {
    const pass = host?.autoContentPass === 2 ? 2 : 1;
    await prepareScenarioBrains(pass === 1);
    return runContent(
      {
        invoke: (command, args) => invoke(command, args),
        host,
        showOnly,
        select: selectNode,
        readComposition: () => composedRef.current,
        setStatus,
        log: hostLog,
      },
      pass,
    );
  }, [host, selectNode, showOnly, prepareScenarioBrains]);

  runContentScenarioRef.current = runContentScenario;

  const runExactDuplicateScenario = useCallback(async () => {
    const pass = host?.autoEd15Pass === 2 ? 2 : 1;
    await prepareScenarioBrains(pass === 1);
    return runExactDuplicates(
      {
        invoke: (command, args) => invoke(command, args),
        host,
        refreshContent: () => setContentRevision((current) => current + 1),
        readSelection: () => selectedRef.current,
        setStatus,
        log: hostLog,
      },
      pass,
    );
  }, [host, prepareScenarioBrains]);

  runExactDuplicateScenarioRef.current = runExactDuplicateScenario;

  const runDreScenario = useCallback(async () => {
    const pass = host?.autoDrePass === 2 ? 2 : 1;
    await prepareScenarioBrains(pass === 1);
    return runDre({
      invoke: (command, args) => invoke(command, args),
      host,
      showOnly,
      select: selectNode,
      setStatus,
      log: hostLog,
      pass,
    });
  }, [host, selectNode, showOnly, prepareScenarioBrains]);

  runDreScenarioRef.current = runDreScenario;

  // `SR15`. The same wiring as DR15, on the review queue: two passes on one
  // variant, every decision taken by a real keystroke.
  const runReviewScenario = useCallback(async () => {
    const pass = host?.autoSr15Pass === 2 ? 2 : 1;
    await prepareScenarioBrains(pass === 1);
    return runReview({
      invoke: (command, args) => invoke(command, args),
      host,
      showOnly,
      select: selectNode,
      setStatus,
      log: hostLog,
      pass,
    });
  }, [host, selectNode, showOnly, prepareScenarioBrains]);

  runReviewScenarioRef.current = runReviewScenario;

  // Reserve `X11`. The same wiring as DR15, on the brain the legacy fixture
  // never covered — same commands, same panel, same real-keystroke mechanism.
  const runGenericRelationScenario = useCallback(async () => {
    await prepareScenarioBrains(true);
    return runGeneric({
      invoke: (command, args) => invoke(command, args),
      host,
      showOnly,
      select: selectNode,
      setStatus,
      log: hostLog,
    });
  }, [host, selectNode, showOnly, prepareScenarioBrains]);

  runGenericRelationScenarioRef.current = runGenericRelationScenario;

  const selectedNode: MapNode | null =
    selected && selectedBrain ? selectedBrain.hierarchy.byId.get(selected.nodeId) ?? null : null;
  const selectedTerritory = selected
    ? composition.territories.find((entry) => entry.brainId === selected.brainId) ?? null
    : null;

  const focusedBrain = composed ? loaded.get(composed.focusedBrainId) ?? null : null;
  const report = focusedBrain?.report ?? null;
  const integrity = focusedBrain?.integrity ?? null;
  const focusedBrainId = focusedBrain?.record.brainId ?? null;
  const focusedBrainRevision = focusedBrain?.snapshot.indexRevision ?? null;

  // `TASK-0034` A — bounded local search, behind the current runtime only.
  // Corrective pass (`ACTION-0052`/`ACTION-0053`): a stale response could
  // otherwise replace the current one, or a legitimate one be silently
  // rejected for carrying the backend's own normalized query — see
  // `searchCoordinator.ts`. `searchCoordinator` (declared above, with the
  // other refs) is the single source of truth for which request is still
  // current; a new launch here always supersedes whatever was in flight
  // before it. The query is canonicalized with the exact same semantics the
  // backend applies (`trim()` + a 200-codepoint bound) before it becomes the
  // identity the response is checked against — a query with leading/trailing
  // spaces, or over that bound, is otherwise indistinguishable from a stale
  // one once Rust normalizes it back.
  const runSearch = useCallback(
    (brainId: string, query: string, offset: number) =>
      runCoordinatedSearch<SearchPage>(searchCoordinator, { brainId, query: canonicalizeSearchQuery(query), offset }, {
        fetch: (params) => invoke<SearchPage>("map_search_nodes", { ...params, limit: 50 }),
        onLoadingChange: setSearchLoading,
        onPage: setSearchPage,
        onError: (error) => {
          hostLog("error", `recherche refusée: ${String(error)}`);
          setSearchPage(null);
        },
        currentRevision: (id) => loadedRef.current.get(id)?.snapshot.indexRevision,
      }),
    [searchCoordinator],
  );

  // The field itself changes intent the instant the user types — invalidate
  // synchronously, in this same event handler, rather than only in the
  // `useEffect` below that reacts to `searchQuery`. Waiting for that effect
  // leaves a window, between this event and React's next render, where a
  // response already in flight for the previous query can still settle and
  // publish under the new one — `ACTION-0053`'s remaining lock.
  const updateSearchQuery = useCallback(
    (value: string) => {
      searchCoordinator.invalidate();
      setSearchQuery(value);
    },
    [searchCoordinator],
  );

  // The query text is scoped to whichever brain is focused — switching
  // brains starts a fresh search rather than carrying one over.
  useEffect(() => {
    setSearchQuery("");
  }, [focusedBrainId]);

  // Re-issued on every keystroke and on every revision change: a
  // refresh/rebuild re-runs the same query against the new index instead of
  // leaving a page read from a superseded revision on screen — `TASK-0034` E.
  // The empty-query branch never calls `runSearch`, so it must invalidate the
  // coordinator itself — otherwise a request already in flight from a
  // non-empty query could still land after the field was emptied.
  useEffect(() => {
    if (!focusedBrainId || searchQuery.trim().length === 0) {
      searchCoordinator.invalidate();
      setSearchPage(null);
      setSearchLoading(false);
      return;
    }
    void runSearch(focusedBrainId, searchQuery, 0);
  }, [focusedBrainId, focusedBrainRevision, searchQuery, runSearch, searchCoordinator]);

  const goToSearchPage = useCallback(
    (offset: number) => {
      if (!focusedBrainId) return;
      void runSearch(focusedBrainId, searchQuery, Math.max(0, offset));
    },
    [focusedBrainId, searchQuery, runSearch],
  );

  const clearSearch = useCallback(() => {
    searchCoordinator.invalidate();
    setSearchQuery("");
    setSearchPage(null);
    setSearchLoading(false);
  }, [searchCoordinator]);

  // Activation replaces the projection and selects the result — `TASK-0034`
  // B — but only after re-checking the revision the page was read against:
  // the effect above already re-searches on a revision change, so this is a
  // defensive backstop against the narrow window before that finishes, never
  // the primary guard.
  const activateSearchHit = useCallback(
    (hit: SearchHit) => {
      const currentRevision = loadedRef.current.get(hit.brainId)?.snapshot.indexRevision;
      if (searchPage && currentRevision !== undefined && currentRevision !== searchPage.indexRevision) {
        setSearchPage(null);
        setStatus(say((t) => t.searchStale));
        return;
      }
      void changeProjection(hit.brainId, hit.nodeId);
    },
    [changeProjection, searchPage],
  );

  // `TASK-0034` C/D — "Ouvrir dans l'Explorateur", from the details panel.
  const revealInExplorer = useCallback(async (reference: BrainNodeRef) => {
    setRevealBusy(true);
    setRevealErrorCode(null);
    try {
      await invoke("map_reveal_node", { reference });
    } catch (error) {
      setRevealErrorCode(String(error).replace(/^map_reveal_refused:\s*/, "").trim());
    } finally {
      setRevealBusy(false);
    }
  }, []);

  useEffect(() => {
    setRevealErrorCode(null);
  }, [selected]);

  // `TASK-0035` C — "Copier le chemin", from the details panel. Same
  // BrainNodeRef-only boundary and the same error-code table as reveal:
  // both actions share `map_reveal_refused: <code>` on the wire, since the
  // Rust side shares one confinement walk for both — see `copyError`'s
  // definition above for why the displayed wording still differs.
  const copyNodePath = useCallback(async (reference: BrainNodeRef) => {
    setCopyBusy(true);
    setCopyErrorCode(null);
    try {
      await invoke("map_copy_node_path", { reference });
    } catch (error) {
      setCopyErrorCode(String(error).replace(/^map_reveal_refused:\s*/, "").trim());
    } finally {
      setCopyBusy(false);
    }
  }, []);

  useEffect(() => {
    setCopyErrorCode(null);
  }, [selected]);

  // `TASK-0035` B — the dedicated, exact and paginated page of the current
  // selection's direct children. A ticket, on the same principle as
  // `projectionRequest`: only the still-current request may publish a page,
  // so a page fetched for a selection already left behind can never
  // overwrite the one for the selection now current.
  const fetchChildrenPage = useCallback((reference: BrainNodeRef, after: string | null) => {
    const ticket = ++childrenRequestTicket.current;
    setChildrenLoading(true);
    invoke<NodeChildrenPage>("map_node_children", { reference, after, limit: 50 })
      .then((page) => {
        if (childrenRequestTicket.current !== ticket) return;
        setChildrenPage(page);
      })
      .catch((error) => {
        if (childrenRequestTicket.current !== ticket) return;
        setStatus(say((t, l) => t.status.childrenUnavailable(describeError(error, l))));
        setChildrenPage(null);
      })
      .finally(() => {
        if (childrenRequestTicket.current === ticket) setChildrenLoading(false);
      });
  }, []);

  // Re-issued whenever the selection changes — mirrors the sibling `detail`
  // effect just above it exactly: always the first page, `after: null`.
  // Pagination beyond that is `goToChildrenPage`'s job, never this effect's.
  useEffect(() => {
    setChildrenCursorStack([null]);
    if (!selected) {
      childrenRequestTicket.current += 1;
      setChildrenPage(null);
      setChildrenLoading(false);
      return;
    }
    fetchChildrenPage(selected, null);
  }, [selected, fetchChildrenPage]);

  const goToChildrenPage = useCallback(
    (direction: "next" | "previous") => {
      if (!selected) return;
      if (direction === "next") {
        const after = childrenPage?.nextCursor ?? null;
        if (!after) return;
        setChildrenCursorStack((stack) => [...stack, after]);
        fetchChildrenPage(selected, after);
      } else {
        setChildrenCursorStack((stack) => {
          if (stack.length <= 1) return stack;
          const next = stack.slice(0, -1);
          fetchChildrenPage(selected, next[next.length - 1]);
          return next;
        });
      }
    },
    [selected, childrenPage, fetchChildrenPage],
  );

  const hasPreviousChildrenPage = childrenCursorStack.length > 1;

  // `TASK-0035` A, per brain since `TASK-0044` — masking/showing never touches selection,
  // search, projection, relations or composition: this handler reaches nothing but the
  // foreground brain's own panel choice, both in state and in the catalogue.
  const detailsPanelVisibleRef = useRef(detailsPanelVisible);
  detailsPanelVisibleRef.current = detailsPanelVisible;
  const toggleDetailsPanel = useCallback(() => {
    const next = !detailsPanelVisibleRef.current;
    setDetailsPanelVisible(next);
    const brainId = composedRef.current?.focusedBrainId ?? null;
    if (brainId) resumeWriter.patch(brainId, { detailsPanelVisible: next }, { immediate: true });
  }, [resumeWriter]);

  /**
   * `TASK-0045` — saves the identity of **one** brain through the only command that
   * exists for it, waits for the answer, and publishes **the record it returned**: never
   * the form's values. The catalogue and the loaded brain are replaced in place; nothing
   * is opened, read, refreshed or rebuilt, and neither the resume state nor the journal
   * is touched. A refusal throws before any state changes.
   */
  const saveBrainIdentity = useCallback(async (brainId: string, values: BrainIdentityValues) => {
    const record = await invoke<BrainRecord>("map_brain_update", {
      brainId,
      displayName: values.displayName,
      color: values.color,
      icon: values.icon,
    });
    if (record.brainId !== brainId) {
      throw new LocalizedError((l) => strings[l].invariants.brainMismatch(brainId, record.brainId));
    }
    const current = catalogRef.current;
    if (current) {
      const next = {
        ...current,
        brains: current.brains.map((brain) => (brain.brainId === brainId ? record : brain)),
      };
      catalogRef.current = next;
      setCatalog(next);
    }
    setLoaded((previous) => {
      const brain = previous.get(brainId);
      return brain ? new Map(previous).set(brainId, { ...brain, record }) : previous;
    });
    setStatus(say((t) => t.status.identitySaved(record.icon, record.displayName)));
  }, []);

  // Both depend on the locale and on nothing that is read: a switch only rebuilds the words.
  const labelFor = useCallback(
    (node: MapNode, brain: BrainRecord) =>
      t.nodeLabel(
        brain.displayName,
        node.name,
        t.panel.kinds[node.kind],
        node.depth,
        node.childCount,
        node.accessDiagnostic ?? null,
      ),
    [t],
  );

  const territoryLabelFor = useCallback(
    (brain: BrainRecord, nodeCount: number, isFocused: boolean) =>
      t.territoryLabel(brain.displayName, brain.icon, nodeCount, isFocused),
    [t],
  );

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <h1 className="app__title">{t.appTitle}</h1>
          <p className="app__subtitle">{t.subtitle}</p>
        </div>
        {/* `TASK-0046` — the one explicit choice of the interface language. A native
            button per language, so it is in the keyboard order because of what it is;
            `aria-pressed` says which one holds; each carries its own `lang`. */}
        <div
          className="app__language"
          role="group"
          aria-label={t.language.label}
          data-testid="language-switch"
        >
          {(["fr", "en"] as const).map((option) => (
            <button
              key={option}
              type="button"
              lang={option}
              data-testid={`language-${option}`}
              aria-pressed={locale === option}
              onClick={() => chooseLocale(option)}
            >
              {t.language[option]}
            </button>
          ))}
        </div>
        {host ? (
          <dl className="app__host">
            <div>
              <dt>{t.engine}</dt>
              <dd>
                WebView2 {host.webviewVersion} · {host.platform}
              </dd>
            </div>
            <div>
              <dt>Tauri · SQLite</dt>
              <dd>
                {host.tauriVersion} · {host.sqliteVersion}
              </dd>
            </div>
            <div>
              <dt>{t.sandbox}</dt>
              <dd className="app__sandbox">{sandboxDisplay(host.sandboxRoot, t)}</dd>
            </div>
          </dl>
        ) : null}
      </header>

      <nav className="app__brains" aria-label={t.composition}>
        {composed ? (
          <CompositionBar
            brains={catalog?.brains ?? []}
            view={composed}
            disabled={busy || measuring}
            busy={busy}
            onFocus={onFocusBrain}
            onAdd={onAddBrain}
            onRemove={onRemoveBrain}
            strings={{
              label: t.composition,
              focused: t.compositionFocused,
              focus: t.compositionFocus,
              add: t.compositionAdd,
              addEmpty: t.compositionAddEmpty,
              remove: t.compositionRemove,
              removeRefused: t.compositionRemoveRefused,
              source: t.compositionSource,
              busy: t.compositionBusy,
            }}
            showSource
          />
        ) : null}
        {composed ? (
          <BrainIdentityEditor
            brains={catalog?.brains ?? []}
            focusedBrainId={composed.focusedBrainId}
            disabled={busy || measuring}
            onSave={saveBrainIdentity}
            onNotice={() => setStatus(say((words) => words.identity.unchanged))}
            strings={t.identity}
          />
        ) : null}
        {composed ? (
          <ExclusionsPanel
            brainId={composed.focusedBrainId}
            locale={locale}
            disabled={busy || measuring}
            onApplied={reloadForWatch}
          />
        ) : null}
        <div className="app__actions">
          {/* `DEC-0033` A — the only way a real folder enters FileTopo, and it
              creates a brain without reading a single byte of it. */}
          <button
            type="button"
            data-testid="brain-add-real-root"
            disabled={busy || measuring}
            onClick={() => void onAddRealRoot()}
          >
            {busy ? t.addRealRootBusy : t.addRealRoot}
          </button>
          <button type="button" data-testid="lifecycle-open" disabled={!composed || busy || measuring}
            onClick={() => composed && void applyComposition(composed, { action: "open" })}>{t.open}</button>
          {/* One action, two names for one honest reason: on a brain that has
              never been indexed this **is** the first indexing, and calling it
              "Actualiser" there would describe something that never happened. */}
          <button type="button" data-testid="lifecycle-refresh" disabled={!composed || busy || measuring}
            onClick={() => composed && void applyComposition(composed, { action: "refresh" })}>
            {focusedNeedsIndex ? t.indexBrain : t.refresh}
          </button>
          <button type="button" data-testid="lifecycle-prepare" disabled={!composed || busy || measuring}
            onClick={async () => {
              if (!composed) return;
              setBusy(true);
              try {
                for (const brainId of composed.displayedBrainIds) await invoke("map_prepare_synthetic_source", { brainId });
                setStatus(say((words) => words.status.syntheticPrepared));
              } catch (error) { setStatus(say((words, l) => words.status.syntheticRefused(describeError(error, l)))); }
              finally { setBusy(false); }
            }}>{t.prepareSynthetic}</button>
          <button
            type="button"
            disabled={!composed || busy || measuring}
            data-testid="lifecycle-rebuild"
            onClick={() => composed && void applyComposition(composed, { action: "rebuild" })}
          >
            {busy ? t.building : t.rebuild}
          </button>
          <button type="button" disabled={!composed || measuring} onClick={runSelfCheck}>
            {t.selfCheck}
          </button>
          <button
            type="button"
            disabled={!selectedOverview || measuring}
            onClick={runRelationsCheck}
          >
            {t.relationsCheck}
          </button>
          <button
            type="button"
            data-testid="cross-check"
            disabled={measuring}
            onClick={runCrossCheck}
          >
            {t.crossCheck}
          </button>
          <button type="button" disabled={measuring || busy} onClick={runMeasurement}>
            {measuring ? t.measuring : t.measure}
          </button>
        </div>
      </nav>

      {status ? (
        <p className="app__status" role="status">
          {status}
        </p>
      ) : null}

      {/*
        The synthetic sources, kept on screen as a **developer diagnostic** —
        `TASK-0018` §4.6. They are no longer the user-facing concept, and they
        are not clickable: brains are composed above, and the source each one
        reads is the backend's business.
      */}
      {fixtures.length > 0 ? (
        <section className="app__sources" aria-label={t.brainsDiagnostic}>
          <span className="app__sources-title">{t.brainsDiagnostic}</span>
          <ul>
            {fixtures.map((fixture) => (
              <li key={fixture.id}>{fixtureLabel(fixture, t, locale)}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {report ? (
        <section className="app__report" aria-label={t.report.label}>
          <span data-testid="report-brain">{t.report.revision(report.brainId, report.revision)}</span>
          <span data-testid="composed-total">
            {t.report.territories(
              renderedBrains.length,
              renderedBrains.reduce((total, brain) => total + brain.nodeCount, 0),
            )}
          </span>
          <span>{t.report.indexed(report.nodeCount)}</span>
          <span data-testid="layout-algorithm">
            schema {report.schemaVersion} · {focusedBrain?.snapshot.layoutAlgorithm}
          </span>
          <span>{t.report.lastRecorded}</span>
          <SourceObservationBadge
            observation={
              composed ? (sourceObservations.get(composed.focusedBrainId) ?? null) : null
            }
            locale={locale}
          />
          <WatchStatusBadge
            status={composed ? (watchStatuses.get(composed.focusedBrainId) ?? null) : null}
            locale={locale}
          />
          {composed && lastChanges.has(composed.focusedBrainId) ? (
            <span data-testid="change-summary" data-summary={JSON.stringify(lastChanges.get(composed.focusedBrainId))}>
              {describeChangeSummary(lastChanges.get(composed.focusedBrainId)!, locale)}
            </span>
          ) : null}
          {composed && lastApplicationModes.has(composed.focusedBrainId) ? (
            <span
              data-testid="application-mode"
              data-application-mode={lastApplicationModes.get(composed.focusedBrainId)}
            >
              {describeApplicationMode(lastApplicationModes.get(composed.focusedBrainId)!, locale)}
            </span>
          ) : null}
          {integrity ? (
            <span className={integrity.filetopoArtifacts.length === 0 ? "ok" : "ko"}>
              {integrity.filetopoArtifacts.length === 0 ? t.noArtifacts : t.artifactsFound}
            </span>
          ) : null}
        </section>
      ) : null}

      {selfCheck ? (
        <section className="app__report" aria-label={t.checks.h.label}>
          <span className={selfCheck.pathsAgree ? "ok" : "ko"}>
            {t.checks.h.paths(selfCheck.plannedPaths, selfCheck.observedPaths, selfCheck.indexedPaths)}
          </span>
          <span className={selfCheck.layoutViolations.length === 0 ? "ok" : "ko"}>
            {t.checks.h.violations(selfCheck.layoutViolations.length)}
          </span>
          <span className={selfCheck.hierarchyMismatches.length === 0 ? "ok" : "ko"}>
            {t.checks.h.mismatches(selfCheck.hierarchyMismatches.length, "H3")}
          </span>
          <span className={selfCheck.detailMismatches.length === 0 ? "ok" : "ko"}>
            {t.checks.h.mismatches(selfCheck.detailMismatches.length, "H5")}
          </span>
        </section>
      ) : null}

      {relationsCheck ? (
        <section className="app__report" aria-label={t.checks.j.label}>
          <span className={relationsCheck.allRejected ? "ok" : "ko"}>
            {t.checks.j.rejected(
              relationsCheck.rejections.filter((entry) => entry.rejected).length,
              relationsCheck.rejections.length,
            )}
          </span>
          <span className={relationsCheck.suggestionsInEstablished.length === 0 ? "ok" : "ko"}>
            {t.checks.j.pending(relationsCheck.pendingSuggestionTotal)}
          </span>
          <span className={relationsCheck.replayStable ? "ok" : "ko"}>
            {t.checks.j.replay(relationsCheck.replayStable)}
          </span>
          <span className={relationsCheck.countsAgree ? "ok" : "ko"}>
            {t.checks.j.conform(
              relationsCheck.counts.filter((entry) => entry.matches).length,
              relationsCheck.counts.length,
            )}
          </span>
          <span className={relationsCheck.inventedInverses.length === 0 ? "ok" : "ko"}>
            {t.checks.j.inverses(relationsCheck.inventedInverses.length)}
          </span>
          <span className={relationsCheck.unresolvedEndpoints.length === 0 ? "ok" : "ko"}>
            {t.checks.j.unresolved(relationsCheck.unresolvedEndpoints.length)}
          </span>
        </section>
      ) : null}

      {crossCheck ? (
        <section className="app__report" aria-label={t.checks.m.label}>
          <span className={crossCheck.allRejected ? "ok" : "ko"}>
            {t.checks.m.rejected(
              crossCheck.rejections.filter((entry) => entry.rejected).length,
              crossCheck.rejections.length,
            )}
          </span>
          <span className={crossCheck.sameBrainRelations.length === 0 ? "ok" : "ko"}>
            {t.checks.m.singleBrain(crossCheck.sameBrainRelations.length)}
          </span>
          <span className={crossCheck.replayStable ? "ok" : "ko"}>
            {t.checks.m.deterministic(crossCheck.deterministicTotal, crossCheck.replayStable)}
          </span>
          <span className={crossCheck.suggestionsInEstablished.length === 0 ? "ok" : "ko"}>
            {t.checks.m.approved(crossCheck.approvedTotal, crossCheck.pendingSuggestionTotal)}
          </span>
          <span className={crossCheck.countsAgree ? "ok" : "ko"}>
            {t.checks.m.conform(
              crossCheck.counts.filter((entry) => entry.matches).length,
              crossCheck.counts.length,
            )}
          </span>
          <span className={crossCheck.inventedInverses.length === 0 ? "ok" : "ko"}>
            {t.checks.m.inverses(crossCheck.inventedInverses.length)}
          </span>
          <span className={crossCheck.unresolvedEndpoints.length === 0 ? "ok" : "ko"}>
            {t.checks.m.unresolved(crossCheck.unresolvedEndpoints.length)}
          </span>
          <span data-testid="cross-store-path">{crossCheck.storePath}</span>
        </section>
      ) : null}

      <main className="app__main">
        <div className="app__map">
          <div className="toolbar" role="toolbar" aria-label={t.map}>
            <button
              type="button"
              onClick={() =>
                setView((current) =>
                  zoomAbout(
                    current,
                    1.35,
                    { x: viewport.width / 2, y: viewport.height / 2 },
                    world,
                    viewport,
                  ),
                )
              }
            >
              {t.zoomIn}
            </button>
            <button
              type="button"
              onClick={() =>
                setView((current) =>
                  zoomAbout(
                    current,
                    1 / 1.35,
                    { x: viewport.width / 2, y: viewport.height / 2 },
                    world,
                    viewport,
                  ),
                )
              }
            >
              {t.zoomOut}
            </button>
            {/* `Ajuster` frames the whole composition, never one territory. */}
            <button
              type="button"
              data-testid="fit-composition"
              onClick={() => setView(fitView(world, viewport))}
            >
              {t.fit}
            </button>
            <button
              type="button"
              disabled={!selectedNode || !selectedTerritory}
              onClick={() =>
                selectedNode &&
                selectedTerritory &&
                setView(
                  fitToBox(
                    {
                      x: selectedNode.rect.x + selectedTerritory.offsetX,
                      y: selectedNode.rect.y + selectedTerritory.offsetY,
                      w: selectedNode.rect.w,
                      h: selectedNode.rect.h,
                    },
                    world,
                    viewport,
                  ),
                )
              }
            >
              {t.fitSelection}
            </button>
            <button
              type="button"
              data-testid="reset-view"
              onClick={() => {
                const anchor = focusAnchorRect(composition);
                setView(anchor ? readableView(anchor, world, viewport) : fitView(world, viewport));
              }}
            >
              {t.reset}
            </button>
            <button
              type="button"
              disabled={!focusedBrain}
              onClick={() =>
                focusedBrain &&
                selectNode({
                  brainId: focusedBrain.record.brainId,
                  nodeId: focusedBrain.snapshot.rootId,
                })
              }
            >
              {t.selectRoot}
            </button>
            <button
              type="button"
              data-testid="observe-content"
              disabled={!focusedBrain || contentCampaignRunning}
              onClick={() => void observeFocusedContent()}
            >
              {contentCampaignRunning ? t.observing : t.observe}
            </button>
          </div>

          {contentReport ? (
            <output
              className="content-report"
              data-testid="content-report"
              data-brain-id={contentReport.brainId}
              data-generation-id={contentReport.generationId}
              data-files-opened={contentReport.filesOpenedForHash}
              data-bytes-read={contentReport.bytesRead}
              data-digests-computed={contentReport.digestsComputed}
              data-report={JSON.stringify(contentReport)}
            >
              {contentReport.hashedCount}/{contentReport.indexedFileCount} · {contentReport.hashAlgorithm}
            </output>
          ) : null}

          {focusedBrain ? (
            <section aria-label={t.searchLabel} data-testid="search-panel">
              <label htmlFor="map-search-input">{t.searchLabel}</label>
              <input
                id="map-search-input"
                type="text"
                data-testid="search-input"
                value={searchQuery}
                placeholder={t.searchPlaceholder}
                onChange={(event) => updateSearchQuery(event.target.value)}
              />
              <button
                type="button"
                data-testid="search-clear"
                onClick={clearSearch}
                disabled={searchQuery.length === 0}
              >
                {t.searchClear}
              </button>
              {searchQuery.trim().length > 0 ? (
                <div data-testid="search-results" aria-live="polite">
                  {searchLoading ? (
                    <p>{t.compositionBusy}</p>
                  ) : !searchPage || searchPage.items.length === 0 ? (
                    <p>{t.searchEmpty}</p>
                  ) : (
                    <>
                      <p
                        data-testid="search-total"
                        data-total={searchPage.total}
                        data-offset={searchPage.offset}
                        data-limit={searchPage.limit}
                        data-index-revision={searchPage.indexRevision}
                      >
                        {t.searchTotal(searchPage.total)}
                      </p>
                      <ul>
                        {searchPage.items.map((hit) => (
                          <li key={`${hit.brainId}:${hit.nodeId}`}>
                            <button
                              type="button"
                              data-testid="search-hit"
                              data-node-id={hit.nodeId}
                              onClick={() => activateSearchHit(hit)}
                            >
                              {hit.name}
                              <span> · {t.panel.kinds[hit.kind]}</span>
                              <span> · {hit.relativePath}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                      {searchPage.total > searchPage.limit ? (
                        <p>
                          <button
                            type="button"
                            data-testid="search-prev"
                            disabled={searchPage.offset === 0}
                            onClick={() => goToSearchPage(searchPage.offset - searchPage.limit)}
                          >
                            {t.searchPrevious}
                          </button>
                          <button
                            type="button"
                            data-testid="search-next"
                            disabled={searchPage.offset + searchPage.items.length >= searchPage.total}
                            onClick={() => goToSearchPage(searchPage.offset + searchPage.limit)}
                          >
                            {t.searchNext}
                          </button>
                        </p>
                      ) : null}
                    </>
                  )}
                </div>
              ) : null}
            </section>
          ) : null}

          <FilterPanel
            locale={locale}
            filter={filter.filter}
            active={filter.active}
            disabled={!focusedBrain}
            filtered={
              focusedBrain && filter.session?.brainId === focusedBrain.record.brainId
                ? (focusedBrain.snapshot.filtered ?? null)
                : null
            }
            nodes={focusedBrain?.snapshot.nodes ?? []}
            pageNumber={filter.pageNumber}
            resumed={filter.resumed}
            canPrevious={filter.canPrevious}
            selectedNodeId={selected && selected.brainId === focusedBrain?.record.brainId ? selected.nodeId : null}
            onChange={filter.change}
            onReset={filter.reset}
            onPrevious={filter.previous}
            onNext={() => filter.next(focusedBrain?.snapshot.filtered?.filterNextCursor ?? null)}
            onSelect={selectInSelectedBrain}
          />

          {focusedBrain ? (
            <section aria-label={t.projection.label} data-testid="projection-controls">
              <p>
                {t.projection.summary(
                  focusedBrain.snapshot.materializedCount,
                  focusedBrain.snapshot.nodeCount,
                  focusedBrain.snapshot.nonMaterializedCount,
                )}
              </p>
              <button type="button" disabled={!selected || selected.brainId !== focusedBrain.record.brainId}
                onClick={() => selected && void changeProjection(selected.brainId, selected.nodeId)}>{t.projection.exploreSelection}</button>
              <button type="button" onClick={() => void changeProjection(focusedBrain.record.brainId, focusedBrain.snapshot.rootId)}>{t.projection.backToRoot}</button>
              {focusedBrain.snapshot.aggregates.map(a => <button type="button" key={a.parentId}
                data-testid="expand-aggregate" data-parent-id={a.parentId}
                onClick={() => void changeProjection(focusedBrain.record.brainId, a.parentId, a.nextCursor)}>
                {aggregateLabel(a.omittedDirectChildren, locale)}
              </button>)}
            </section>
          ) : null}
          {renderedBrains.length > 0 && composed ? (
            <MapView
              locale={locale}
              brains={renderedBrains}
              crossSegments={crossSegments}
              composition={composition}
              view={view}
              viewport={viewport}
              selected={selected}
              focusedBrainId={composed.focusedBrainId}
              onExpand={(brainId, aggregate) => void changeProjection(brainId, aggregate.parentId, aggregate.nextCursor)}
              onViewChange={setView}
              onSelect={selectNode}
              onViewportChange={setViewport}
              labelFor={labelFor}
              territoryLabelFor={territoryLabelFor}
              ariaLabel={`${t.map} — ${renderedBrains
                .map((brain) => brain.record.displayName)
                .join(", ")}`}
            />
          ) : (
            <p className="app__empty">
              {t.fixtures} — {t.open}
            </p>
          )}

          <p className="toolbar__hint">
            <strong>{t.keyboardTitle} :</strong> {t.keyboard}
          </p>
        </div>

        <aside className="app__aside">
          <ExactDuplicateExplorer
            locale={locale}
            brainId={composed?.focusedBrainId ?? null}
            revision={contentRevision}
            onSelect={selectNode}
          />

          <ChangeJournalPanel
            locale={locale}
            brainId={composed?.focusedBrainId ?? null}
            revision={focusedBrain?.report.revision ?? null}
            onSelect={selectNode}
            seenRevision={seenRevision}
            onSeenChange={notifySeenChange}
          />

          <button
            type="button"
            data-testid="details-panel-toggle"
            onClick={toggleDetailsPanel}
          >
            {detailsPanelVisible ? t.detailsPanelHide : t.detailsPanelShow}
          </button>

          {detailsPanelVisible ? (
            <DetailsPanel
              detail={detail}
              loading={detailLoading}
              onSelect={selectInSelectedBrain}
              locale={locale}
              strings={t.panel}
              contentObservation={contentObservation}
              contentSummary={contentSummary}
              identicalContentMemberCount={identicalContentMemberCount}
              contentLoading={contentLoading}
              contentObservedThisSession={
                selected ? contentObservedBrains.has(selected.brainId) : false
              }
              reference={selected}
              onReveal={revealInExplorer}
              revealBusy={revealBusy}
              revealError={
                revealErrorCode === null
                  ? null
                  : (t.revealError[revealErrorCode] ?? t.revealErrorGeneric)
              }
              revealActionLabel={t.revealAction}
              revealBusyLabel={t.revealBusy}
              childrenPage={childrenPage}
              childrenLoading={childrenLoading}
              onNextChildrenPage={() => goToChildrenPage("next")}
              onPreviousChildrenPage={() => goToChildrenPage("previous")}
              hasPreviousChildrenPage={hasPreviousChildrenPage}
              onCopyPath={copyNodePath}
              copyBusy={copyBusy}
              copyError={
                copyErrorCode === null ? null : (t.copyError[copyErrorCode] ?? t.copyErrorGeneric)
              }
              copyActionLabel={t.copyAction}
              copyBusyLabel={t.copyBusy}
              changeState={
                <NodeChangeState
                  locale={locale}
                  reference={selected}
                  revision={focusedBrain?.report.revision ?? null}
                  seenRevision={seenRevision}
                  onSeenChange={notifySeenChange}
                />
              }
            />
          ) : null}

          <section aria-label={t.offscreen.label}>
            {renderedBrains.flatMap(b => (loaded.get(b.brainId)?.relations?.established ?? []).flatMap(edge =>
              [edge.source, edge.target].filter(e => e.nodeId !== null && !b.hierarchy.byId.has(e.nodeId)).map((e, i) =>
                // Keyed by the relation's own identity, not by its row id: two tables each number their
                // rows from 1, and two lines with one key are updated as one (a stale line survives).
                <p key={`${b.brainId}:${relationKey(edge)}:${i}`}>{t.offscreen.relation(e.name)}
                  <button type="button" onClick={() => selectNode({brainId:b.brainId,nodeId:e.nodeId!})}>{t.offscreen.show(e.name)}</button>
                </p>)))}
            {(nodeCross ? [...nodeCross.outgoing, ...nodeCross.incoming] : []).filter(e => e.other.nodeId !== null && !loaded.get(e.other.brainId)?.hierarchy.byId.has(e.other.nodeId)).map((e,i) =>
              <p key={`cross:${i}`}>{t.offscreen.relation(e.other.name)}
                <button type="button" onClick={() => navigateCross({brainId:e.other.brainId,endpointKey:e.other.key})}>{t.offscreen.show(e.other.name)}</button>
              </p>)}
          </section>

          <RelationsPanel
            locale={locale}
            relations={nodeRelations}
            loading={relationsLoading}
            available={selectedOverview !== null}
            // The legacy TASK-0017 perimeter, and only that. It adds a
            // sentence to the panel; it never takes the engine, the core
            // relations or their approval away — TASK-0024.
            legacyInScope={selectedOverview?.legacyInScope ?? false}
            onSelect={selectInSelectedBrain}
            onApprove={approveSuggestion}
            approving={approving}
            engineStatus={relationEngineStatus}
            engineReport={relationEngineReport}
            engineRunning={relationEngineRunning}
            onAnalyze={analyzeRelations}
          />

          <ReviewQueuePanel
            locale={locale}
            queue={reviewQueue}
            loading={reviewLoading}
            cursor={reviewCursor}
            open={reviewOpen}
            onToggle={() => setReviewOpen((current) => !current)}
            onConfirm={confirmFromQueue}
            onReject={rejectFromQueue}
            onLater={laterFromQueue}
            deciding={deciding}
          />

          <CrossRelationsPanel
            locale={locale}
            relations={nodeCross}
            loading={crossLoading}
            // What is on screen, so the panel can say « hors de la vue ». The
            // store never learns this: it is the interface's question, not the
            // model's — §4.1, §4.8.
            displayedBrainIds={composed?.displayedBrainIds ?? []}
            onNavigate={navigateCross}
            onApprove={approveCrossSuggestion}
            approving={approvingCross}
          />

          {measurement ? (
            <section className="measure" aria-label={t.measureReport.label}>
              <h2>{t.measureReport.title}</h2>
              <table>
                <thead>
                  <tr>
                    <th scope="col">{t.measureReport.brain}</th>
                    <th scope="col">{t.measureReport.frameMedian}</th>
                    <th scope="col">{t.measureReport.frameRange}</th>
                    <th scope="col">{t.measureReport.selectionMedian}</th>
                  </tr>
                </thead>
                <tbody>
                  {measurement.map((entry) => (
                    <tr key={entry.fixtureId}>
                      <th scope="row">{entry.fixtureId}</th>
                      <td>{entry.frameTime.median.toFixed(2)} ms</td>
                      <td>
                        {entry.frameTime.min.toFixed(2)} – {entry.frameTime.max.toFixed(2)} ms
                      </td>
                      <td>{entry.selectionLatency.median.toFixed(2)} ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}
        </aside>
      </main>
    </div>
  );
}

export { composeView };
