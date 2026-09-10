import { runLifecycle, type LifecycleAction } from "./lifecycle";
import { prepareScenarioIndex } from "./lifecycle";
import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CompositionBar from "./CompositionBar";
import DetailsPanel, { type PanelStrings } from "./DetailsPanel";
import MapView, { type RenderedBrain } from "./MapView";
import CrossRelationsPanel from "./CrossRelationsPanel";
import RelationsPanel from "./RelationsPanel";
import ReviewQueuePanel from "./ReviewQueuePanel";
import ExactDuplicateExplorer from "./ExactDuplicateExplorer";
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
import { composeTerritories, type Composition } from "./territories";
import { buildHierarchy, type Hierarchy } from "./hierarchy";
import { establishedNeighbours, relationSegments } from "./relations";
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
import "./map.css";
import type {
  BrainCatalogView,
  BrainNodeRef,
  BrainRecord,
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
  NodeDetail,
  NodeRelations,
  RelationsOverview,
  RelationsSelfCheck,
  RelationEngineReport,
  RelationEngineStatus,
  SuggestionReviewQueue,
} from "./types";
import { fitToBox, fitView, panBy, zoomAbout, type View, type Viewport } from "./viewState";

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

const strings = {
  fr: {
    appTitle: "FileTopo — carte de blocs",
    subtitle: "Tranche verticale TASK-0019 · vue composée, cerveaux synthétiques seulement",
    composition: "Cerveaux affichés",
    compositionFocused: "actif",
    compositionFocus: "rendre actif",
    compositionAdd: "Ajouter",
    compositionAddEmpty: "Tous les cerveaux du catalogue sont déjà affichés",
    compositionRemove: "Retirer de la vue",
    compositionRemoveRefused: "Impossible de retirer le dernier cerveau affiché",
    compositionSource: "source",
    compositionBusy: "Chargement…",
    brainsDiagnostic: "Diagnostic développeur · sources synthétiques",
    fixtures: "Fixtures synthétiques",
    open: "Ouvrir",
    rebuild: "Reconstruire l'index",
    building: "Construction…",
    map: "Graphique composé",
    zoomIn: "Zoom avant",
    zoomOut: "Zoom arrière",
    fit: "Ajuster",
    fitSelection: "Cadrer la sélection",
    reset: "Réinitialiser la vue",
    selectRoot: "Sélectionner la racine",
    measure: "Mesurer dans WebView2",
    measuring: "Mesure en cours…",
    selfCheck: "Contrôler H1–H5",
    relationsCheck: "Contrôler J1–J5, J10",
    crossCheck: "Contrôler M1–M5",
    relations: "Relations",
    territory: "territoire",
    nodesWord: "nœuds",
    keyboardTitle: "Clavier",
    keyboard:
      "Flèches : parent, enfant, frères · N / P : territoire suivant, précédent · " +
      "Alt+flèches : panoramique · + / − : zoom · F : ajuster · R : réinitialiser · Origine : racine",
    nodes: "nœuds",
    depth: "profondeur",
    ceiling: "plafond",
    readOnly: "Empreinte identique avant et après le scan",
    readOnlyFailed: "EMPREINTE DIFFÉRENTE — la source a changé",
    noArtifacts: "Aucun fichier de FileTopo dans la racine analysée",
    artifactsFound: "Fichiers de FileTopo trouvés dans la racine analysée",
    scan: "scan",
    layout: "calepinage",
    index: "index",
    engine: "Moteur de rendu",
    sandbox: "Bac à sable",
    panel: {
      title: "Détails de la sélection",
      empty: "Sélectionnez un bloc sur la carte, ou appuyez sur Origine.",
      loading: "Lecture de l'index…",
      name: "Nom",
      kind: "Type",
      path: "Chemin relatif",
      size: "Taille",
      modified: "Modifié",
      parent: "Parent",
      children: "Enfants directs",
      diagnostic: "Diagnostic d'accès",
      noDiagnostic: "aucun",
      noParent: "Ce nœud est la racine.",
      noChildren: "Aucun enfant direct.",
      rootPath: "(racine)",
      kinds: {
        root: "racine",
        directory: "dossier",
        file: "fichier",
        skipped: "ignoré",
      },
    } satisfies PanelStrings,
  },
} as const;

const t = strings.fr;

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
}

/**
 * Sends a line to the host's terminal.
 *
 * Fire-and-forget on purpose: logging must never be able to fail a run.
 */
function hostLog(level: "info" | "error", message: string): void {
  void invoke("map_log", { level, message }).catch(() => {});
}

function fixtureLabel(fixture: FixtureSummary): string {
  return `${fixture.labelFr} · ${fixture.plannedNodes} ${t.nodes} (${t.ceiling} ${fixture.maxNodes})`;
}

export default function MapApp() {
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
  const [contentObservedBrains, setContentObservedBrains] = useState<ReadonlySet<string>>(new Set());
  const [selfCheck, setSelfCheck] = useState<MapSelfCheck | null>(null);
  const [viewport, setViewport] = useState<Viewport>({ width: 1, height: 1 });
  const [view, setView] = useState<View>({ scale: 1, tx: 0, ty: 0 });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
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
    () => crossSegmentsOf(crossOverview, nodesByBrain, selected),
    [crossOverview, nodesByBrain, selected],
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
          segments: relationSegments(brain.relations, brain.hierarchy.byId, localSelection),
          relationNeighbours: establishedNeighbours(brain.relations, localSelection),
          crossNeighbours: crossNeighbours.get(brainId) ?? new Set<number>(),
          nodeCount: brain.snapshot.materializedCount,
          aggregates: brain.snapshot.aggregates,
        },
      ];
    });
  }, [composed, crossNeighbours, loaded, selected]);

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
    document.documentElement.lang = "fr";
    hostLog("info", "interface montée, lecture des fixtures et de l'hôte");
    Promise.all([
      invoke<FixtureSummary[]>("map_fixtures"),
      invoke<HostInfo>("map_host_info"),
      invoke<BrainCatalogView>("map_brains"),
    ])
      .then(([nextFixtures, nextHost, nextCatalog]) => {
        setFixtures(nextFixtures);
        setHost(nextHost);
        setCatalog(nextCatalog);
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
        setStatus(`Hôte indisponible : ${String(error)}`);
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
    async (brainId: string, action: LifecycleAction): Promise<LoadedBrain> => {
      projectionRequest.current.set(brainId, (projectionRequest.current.get(brainId) ?? 0) + 1);
      const record = catalogRef.current?.brains.find((brain) => brain.brainId === brainId);
      if (!record) throw new Error(`cerveau absent du catalogue : ${brainId}`);
      const report = await runLifecycle(invoke, brainId, action);
      const snapshot = await invoke<MapProjection>("map_view", { brainId });
      const integrity = null; // Opening must never read or fingerprint the source.

      // The snapshot has to be the one that was asked for. A mismatch here
      // would be exactly the leak `K3` and `L2` forbid, so it is refused
      // rather than displayed.
      if (snapshot.brainId !== brainId || report.brainId !== brainId) {
        throw new Error(`incohérence de cerveau: demandé ${brainId}, reçu ${snapshot.brainId}`);
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
        record,
        report,
        snapshot,
        integrity,
        relations,
        hierarchy: buildHierarchy(snapshot.nodes, snapshot.rootId),
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

        const nextLoaded = new Map(loadedRef.current);
        for (const brainId of next.displayedBrainIds) {
          if (options.action || !nextLoaded.has(brainId)) {
            nextLoaded.set(brainId, await loadBrain(brainId, options.action ?? "open"));
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
            } else setStatus("Extrémité absente de l'index courant.");
          }
        }

        const restored = recallComposition(sessionsRef.current, nextKey);
        const focusedRoot = nextLoaded.get(next.focusedBrainId)?.snapshot.rootId ?? null;
        const restoredSelection =
          restored && selectionIsStillValid(next, restored.selected) && restored.selected
            ? nextLoaded
                .get(restored.selected.brainId)
                ?.hierarchy.byId.has(restored.selected.nodeId)
              ? restored.selected
              : null
            : null;

        restoreViewRef.current = restored ? { ...restored.view } : null;
        setLoaded(nextLoaded);
        setComposed(next);
        setSelected(
          forced ??
            restoredSelection ??
            (focusedRoot === null
              ? null
              : { brainId: next.focusedBrainId, nodeId: focusedRoot }),
        );
        setSelfCheck(null);
        setRelationsCheck(null);
        setMeasurement(null);
      } catch (error) {
        setComposed(next);
        setStatus(String(error).includes("map_not_built")
          ? "Index absent. Préparez l’exemple synthétique si nécessaire, puis choisissez Actualiser pour construire l’index."
          : `Échec : ${String(error)}. Le dernier index enregistré reste disponible via Ouvrir.`);
        hostLog("info", `composition refusée: ${String(error)}`);
      } finally {
        setBusy(false);
      }
    },
    [activate, loadBrain],
  );

  /**
   * Turns a refusal from the model into a message, rather than a stack trace.
   *
   * `L1` and `L6` demand explicit errors; an explicit error nobody can read is
   * only half of that.
   */
  const refuse = useCallback((error: unknown) => {
    if (error instanceof ComposedViewError) {
      setStatus(`Composition refusée — ${error.message}`);
      hostLog("info", `composition refusée: ${error.code}`);
      return;
    }
    setStatus(`Composition refusée — ${String(error)}`);
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
      try {
        const next = focusBrain(current, order, brainId);
        setComposed(next);
        const root = loadedRef.current.get(brainId)?.snapshot.rootId ?? null;
        if (root !== null) setSelected({ brainId, nodeId: root });
        // The focused brain is the active brain, and that is persisted.
        void activate(brainId).catch((error) =>
          setStatus(`Cerveau actif non enregistré : ${String(error)}`),
        );
      } catch (error) {
        refuse(error);
      }
    },
    [activate, order, refuse],
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
    const ticket = (projectionRequest.current.get(brainId) ?? 0) + 1;
    projectionRequest.current.set(brainId, ticket);
    try {
      const snapshot = await invoke<MapProjection>("map_view", { brainId, focusId, after });
      if (projectionRequest.current.get(brainId) !== ticket || !loadedRef.current.has(brainId)) return;
      if (snapshot.brainId !== brainId) throw new Error("projection d'un autre cerveau refusée");
      setLoaded(current => {
        const previous = current.get(brainId);
        if (!previous) return current;
        const next = new Map(current);
        next.set(brainId, { ...previous, snapshot, hierarchy: buildHierarchy(snapshot.nodes, snapshot.rootId) });
        return next;
      });
      const current = composedRef.current;
      if (current?.displayedBrainIds.includes(brainId)) {
        setComposed(focusBrain(current, order, brainId));
        await activate(brainId);
      }
      setSelected({ brainId, nodeId: focusId });
      setStatus(`${snapshot.materializedCount} éléments visibles sur ${snapshot.nodeCount}`);
    } catch (error) {
      if (projectionRequest.current.get(brainId) === ticket) setStatus(`Projection refusée : ${String(error)}`);
    }
  }, [activate, order]);

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
      setComposed(focusBrain(current, order, reference.brainId));
      void activate(reference.brainId).catch((error) =>
        setStatus(`Cerveau actif non enregistré : ${String(error)}`),
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

  // A fresh composition opens fitted, and that view is the one `reset`
  // reproduces — unless this composition was already visited in this session,
  // in which case `L9` asks for the view it was left at.
  //
  // The guard is not decoration. Without it the fit runs again when the
  // viewport settles a frame later, and that second fit erased the view a
  // composition had just been given back.
  const compositionId = composed ? compositionKey(composed.displayedBrainIds) : null;
  useEffect(() => {
    if (!compositionId || composition.territories.length === 0) return;
    const restored = restoreViewRef.current;
    if (restored) {
      restoreViewRef.current = null;
      positionedRef.current = {
        key: compositionId,
        width: viewport.width,
        height: viewport.height,
      };
      setView(restored);
      return;
    }
    if (!shouldFitComposition(positionedRef.current, compositionId)) return;
    positionedRef.current = {
      key: compositionId,
      width: viewport.width,
      height: viewport.height,
    };
    setView(fitView(world, viewport));
    // `world` is derived from the composition, so it changes exactly when the
    // composition does; listing it would refit on every identity change of a
    // memo without adding a case this does not already cover.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compositionId, composition.territories.length, viewport.width, viewport.height]);

  const projectionKey = renderedBrains.map(b => `${b.brainId}:${loaded.get(b.brainId)?.snapshot.focusId}:${loaded.get(b.brainId)?.snapshot.indexRevision}:${b.hierarchy.drawOrder.map(n => n.id).join(",")}`).join("|");
  useEffect(() => { if (projectionKey) setView(fitView(world, viewportRef.current)); }, [projectionKey]);

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
      .catch((error) => live && setStatus(`Détail indisponible : ${String(error)}`))
      .finally(() => live && setDetailLoading(false));
    return () => {
      live = false;
    };
  }, [selected]);

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
        `${report.hashedCount}/${report.indexedFileCount} fichiers observés · ${report.generationId}`,
      );
    } catch (error) {
      setStatus(`Observation de contenu impossible : ${String(error)}`);
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
        `${report.engineVersion} : ${report.deterministicRelationsProduced} relation(s), ${report.suggestionsProduced} suggestion(s).`,
      );
    } catch (error) {
      setStatus(`Analyse des relations impossible : ${String(error)}`);
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
        setStatus(
          `Suggestion ${suggestionKey} approuvée dans ${brainId} : elle est désormais une relation APPROVED.`,
        );
      } catch (error) {
        setStatus(`Approbation refusée : ${String(error)}`);
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
        setStatus(
          `Suggestion ${suggestionKey} confirmée dans ${brainId} : une relation APPROVED existe désormais.`,
        );
      } catch (error) {
        setStatus(`Confirmation refusée : ${String(error)}`);
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
        setStatus(
          `Suggestion ${suggestionKey} rejetée dans ${brainId} : aucune relation créée, la décision est conservée.`,
        );
      } catch (error) {
        setStatus(`Rejet refusé : ${String(error)}`);
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
    setStatus("Suggestion laissée en attente : aucune décision enregistrée.");
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
      setStatus(
        `Suggestion inter-cerveaux ${suggestionKey} approuvée : elle est désormais une relation APPROVED.`,
      );
    } catch (error) {
      setStatus(`Approbation inter-cerveaux refusée : ${String(error)}`);
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
          .then(reference => { if (reference) selectNode(reference); else setStatus("Extrémité absente de l'index courant."); })
          .catch(error => setStatus(`Résolution refusée : ${String(error)}`));
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
          setStatus(
            `Navigation inter-cerveaux : ${brainId} rejoint la vue. ` +
              `Aucune relation n'est créée, modifiée ni approuvée.`,
          ),
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
      setStatus(`Contrôle inter-cerveaux impossible : ${String(error)}`);
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
      setStatus(`Contrôle des relations impossible : ${String(error)}`);
    }
  }, [composed]);

  const runSelfCheck = useCallback(async () => {
    const brainId = composed?.focusedBrainId;
    if (!brainId) return;
    try {
      setSelfCheck(await invoke<MapSelfCheck>("map_self_check", { brainId }));
    } catch (error) {
      setStatus(`Contrôle impossible : ${String(error)}`);
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
          fixtureId: first.fixtureId,
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
          h6_fingerprintBefore: first.fingerprintBefore,
          h6_fingerprintAfterRebuild: rebuilt.fingerprintAfter,
          h6_fingerprintUnchanged: first.fingerprintBefore === rebuilt.fingerprintAfter,
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
      setStatus(`Vérification écrite dans ${written}`);
    } catch (error) {
      hostLog("error", `vérification interrompue: ${String(error)}`);
      setStatus(`Vérification interrompue : ${String(error)}`);
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
        if (!loadedBrain) throw new Error(`cerveau non chargé : ${brain.brainId}`);

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
      setStatus(`Mesures écrites dans ${written}`);
      hostLog("info", `campagne terminée, artefact écrit: ${written}`);
    } catch (error) {
      // A failed campaign is still a result, and it is written down.
      setStatus(`Mesure interrompue : ${String(error)}`);
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

  const labelFor = useCallback(
    (node: MapNode, brain: BrainRecord) =>
      // The brain's name is part of every node's accessible name: in a composed
      // graph, "dossier-b" alone does not say which brain it belongs to, and
      // `L4` asks that origin never rest on colour.
      `${brain.displayName} · ${node.name}, ${t.panel.kinds[node.kind]}, ${t.depth} ${node.depth}, ` +
      `${node.childCount} ${t.panel.children.toLowerCase()}` +
      (node.accessDiagnostic ? `, ${t.panel.diagnostic} ${node.accessDiagnostic}` : ""),
    [],
  );

  const territoryLabelFor = useCallback(
    (brain: BrainRecord, nodeCount: number, isFocused: boolean) =>
      `${t.territory} ${brain.displayName}, icône ${brain.icon}, ${nodeCount} ${t.nodesWord}` +
      (isFocused ? `, ${t.compositionFocused}` : ""),
    [],
  );

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <h1 className="app__title">{t.appTitle}</h1>
          <p className="app__subtitle">{t.subtitle}</p>
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
              <dd className="app__sandbox">{host.sandboxRoot}</dd>
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
        <div className="app__actions">
          <button type="button" data-testid="lifecycle-open" disabled={!composed || busy || measuring}
            onClick={() => composed && void applyComposition(composed, { action: "open" })}>Ouvrir</button>
          <button type="button" data-testid="lifecycle-refresh" disabled={!composed || busy || measuring}
            onClick={() => composed && void applyComposition(composed, { action: "refresh" })}>Actualiser</button>
          <button type="button" data-testid="lifecycle-prepare" disabled={!composed || busy || measuring}
            onClick={async () => {
              if (!composed) return;
              setBusy(true);
              try {
                for (const brainId of composed.displayedBrainIds) await invoke("map_prepare_synthetic_source", { brainId });
                setStatus("Exemple synthétique préparé. Choisissez Actualiser pour construire l’index.");
              } catch (error) { setStatus(`Préparation refusée : ${String(error)}`); }
              finally { setBusy(false); }
            }}>Préparer l’exemple synthétique</button>
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
              <li key={fixture.id}>{fixtureLabel(fixture)}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {report ? (
        <section className="app__report" aria-label="Dernier index enregistré">
          <span data-testid="report-brain">
            {report.brainId} · révision {report.revision}
          </span>
          <span data-testid="composed-total">
            {renderedBrains.length} territoire(s) ·{" "}
            {renderedBrains.reduce((total, brain) => total + brain.nodeCount, 0)} {t.nodes}
          </span>
          <span>
            {report.nodeCount} éléments indexés
          </span>
          <span data-testid="layout-algorithm">
            schema {report.schemaVersion} · {focusedBrain?.snapshot.layoutAlgorithm}
          </span>
          <span>Dernier index enregistré · source non vérifiée · fraîcheur inconnue</span>
          {integrity ? (
            <span className={integrity.filetopoArtifacts.length === 0 ? "ok" : "ko"}>
              {integrity.filetopoArtifacts.length === 0 ? t.noArtifacts : t.artifactsFound}
            </span>
          ) : null}
        </section>
      ) : null}

      {selfCheck ? (
        <section className="app__report" aria-label="Contrôle H1 à H5">
          <span className={selfCheck.pathsAgree ? "ok" : "ko"}>
            H1 · plan {selfCheck.plannedPaths} / disque {selfCheck.observedPaths} / index{" "}
            {selfCheck.indexedPaths}
          </span>
          <span className={selfCheck.layoutViolations.length === 0 ? "ok" : "ko"}>
            N3 · {selfCheck.layoutViolations.length} violation(s)
          </span>
          <span className={selfCheck.hierarchyMismatches.length === 0 ? "ok" : "ko"}>
            H3 · {selfCheck.hierarchyMismatches.length} écart(s)
          </span>
          <span className={selfCheck.detailMismatches.length === 0 ? "ok" : "ko"}>
            H5 · {selfCheck.detailMismatches.length} écart(s)
          </span>
        </section>
      ) : null}

      {relationsCheck ? (
        <section className="app__report" aria-label="Contrôle J1 à J5 et J10">
          <span className={relationsCheck.allRejected ? "ok" : "ko"}>
            J1–J3 · {relationsCheck.rejections.filter((entry) => entry.rejected).length}/
            {relationsCheck.rejections.length} tentative(s) invalide(s) rejetée(s)
          </span>
          <span className={relationsCheck.suggestionsInEstablished.length === 0 ? "ok" : "ko"}>
            J2 · {relationsCheck.pendingSuggestionTotal} suggestion(s) en attente, hors des comptes
          </span>
          <span className={relationsCheck.replayStable ? "ok" : "ko"}>
            J3 · rejeu {relationsCheck.replayStable ? "identique" : "DIVERGENT"}
          </span>
          <span className={relationsCheck.countsAgree ? "ok" : "ko"}>
            J5 · {relationsCheck.counts.filter((entry) => entry.matches).length}/
            {relationsCheck.counts.length} nœud(s) conformes à l'attendu gelé
          </span>
          <span className={relationsCheck.inventedInverses.length === 0 ? "ok" : "ko"}>
            J5 · {relationsCheck.inventedInverses.length} inverse(s) inventé(s)
          </span>
          <span className={relationsCheck.unresolvedEndpoints.length === 0 ? "ok" : "ko"}>
            J10 · {relationsCheck.unresolvedEndpoints.length} extrémité(s) non résolue(s)
          </span>
        </section>
      ) : null}

      {crossCheck ? (
        <section className="app__report" aria-label="Contrôle M1 à M5">
          <span className={crossCheck.allRejected ? "ok" : "ko"}>
            M1–M3 · {crossCheck.rejections.filter((entry) => entry.rejected).length}/
            {crossCheck.rejections.length} tentative(s) invalide(s) rejetée(s)
          </span>
          <span className={crossCheck.sameBrainRelations.length === 0 ? "ok" : "ko"}>
            M1 · {crossCheck.sameBrainRelations.length} relation(s) à un seul cerveau
          </span>
          <span className={crossCheck.replayStable ? "ok" : "ko"}>
            M2 · {crossCheck.deterministicTotal} déterministe(s), rejeu{" "}
            {crossCheck.replayStable ? "identique" : "DIVERGENT"}
          </span>
          <span className={crossCheck.suggestionsInEstablished.length === 0 ? "ok" : "ko"}>
            M3 · {crossCheck.approvedTotal} approuvée(s),{" "}
            {crossCheck.pendingSuggestionTotal} suggestion(s) hors des comptes
          </span>
          <span className={crossCheck.countsAgree ? "ok" : "ko"}>
            M4 · {crossCheck.counts.filter((entry) => entry.matches).length}/
            {crossCheck.counts.length} extrémité(s) conformes à l'attendu gelé
          </span>
          <span className={crossCheck.inventedInverses.length === 0 ? "ok" : "ko"}>
            M2 · {crossCheck.inventedInverses.length} inverse(s) inventé(s)
          </span>
          <span className={crossCheck.unresolvedEndpoints.length === 0 ? "ok" : "ko"}>
            M5 · {crossCheck.unresolvedEndpoints.length} extrémité(s) non résolue(s)
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
            <button type="button" onClick={() => setView(fitView(world, viewport))}>
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
              {contentCampaignRunning ? "Observation…" : "Observer le contenu"}
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
            <section aria-label="Navigation progressive" data-testid="projection-controls">
              <p>{focusedBrain.snapshot.materializedCount} éléments visibles sur {focusedBrain.snapshot.nodeCount}; {focusedBrain.snapshot.nonMaterializedCount} hors de la vue courante.</p>
              <button type="button" disabled={!selected || selected.brainId !== focusedBrain.record.brainId}
                onClick={() => selected && void changeProjection(selected.brainId, selected.nodeId)}>Explorer la sélection</button>
              <button type="button" onClick={() => void changeProjection(focusedBrain.record.brainId, focusedBrain.snapshot.rootId)}>Revenir à la racine</button>
              {focusedBrain.snapshot.aggregates.map(a => <button type="button" key={a.parentId}
                data-testid="expand-aggregate" data-parent-id={a.parentId}
                onClick={() => void changeProjection(focusedBrain.record.brainId, a.parentId, a.nextCursor)}>
                {a.omittedDirectChildren} enfants directs hors vue — {a.nextCursor ? "page suivante" : "ouvrir la première page"}
              </button>)}
            </section>
          ) : null}
          {renderedBrains.length > 0 && composed ? (
            <MapView
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
            brainId={composed?.focusedBrainId ?? null}
            revision={contentRevision}
            onSelect={selectNode}
          />

          <DetailsPanel
            detail={detail}
            loading={detailLoading}
            onSelect={selectInSelectedBrain}
            locale="fr"
            strings={t.panel}
            contentObservation={contentObservation}
            contentSummary={contentSummary}
            identicalContentMemberCount={identicalContentMemberCount}
            contentLoading={contentLoading}
            contentObservedThisSession={
              selected ? contentObservedBrains.has(selected.brainId) : false
            }
          />

          <section aria-label="Extrémités hors de la vue courante">
            {renderedBrains.flatMap(b => (loaded.get(b.brainId)?.relations?.established ?? []).flatMap(edge =>
              [edge.source, edge.target].filter(e => e.nodeId !== null && !b.hierarchy.byId.has(e.nodeId)).map((e, i) =>
                <p key={`${b.brainId}:${edge.id}:${i}`}>{e.name} — relation hors de la vue courante.
                  <button type="button" onClick={() => selectNode({brainId:b.brainId,nodeId:e.nodeId!})}>Afficher {e.name}</button>
                </p>)))}
            {(nodeCross ? [...nodeCross.outgoing, ...nodeCross.incoming] : []).filter(e => e.other.nodeId !== null && !loaded.get(e.other.brainId)?.hierarchy.byId.has(e.other.nodeId)).map((e,i) =>
              <p key={`cross:${i}`}>{e.other.name} — relation hors de la vue courante.
                <button type="button" onClick={() => navigateCross({brainId:e.other.brainId,endpointKey:e.other.key})}>Afficher {e.other.name}</button>
              </p>)}
          </section>

          <RelationsPanel
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
            <section className="measure" aria-label="Mesures H9 — régression du runtime composé">
              <h2>H9 · WebView2 · régression du runtime composé</h2>
              <table>
                <thead>
                  <tr>
                    <th scope="col">Cerveau</th>
                    <th scope="col">Image méd.</th>
                    <th scope="col">Image min–max</th>
                    <th scope="col">Sélection méd.</th>
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
