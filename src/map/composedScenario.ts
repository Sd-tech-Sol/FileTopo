import { prepareScenarioIndex } from "./lifecycle";
/**
 * `L12` — the composed view in the **real host**, unattended.
 *
 * The seventeen steps of `TASK-0019` §4.9 run in the order they were frozen,
 * driven through the composition bar and the commands a person would use.
 * Every count comes back from a command or off the DOM; nothing here recomputes
 * one, and nothing asserts what it did not read.
 *
 * **Two passes, because step 16 says « redémarrer réellement ».** A restart
 * cannot be faked from inside a page: steps 1 to 14 run in the first process
 * and write their evidence, the host is really closed — step 15 — and step 17
 * runs in the second process and reads the catalogue back.
 * `scripts/l12-run-real-host.ps1` is what closes and relaunches; the two
 * artefacts stand on their own and name the process that produced them.
 *
 * **`L10` — real keystrokes.** Steps 3, 8, 13 and 14 are performed by keys the
 * operating system delivers, not by anything the page dispatches: the control
 * is focused, a marker is printed, and `scripts/j12-send-real-key.ps1` sends
 * the key through `WScript.Shell`. The same three instruments as `J12` are read
 * — `isTrusted`, the count of programmatic clicks over the whole window, and
 * the observable change. If a keystroke never arrives, the pass fails; it never
 * falls back to a click.
 *
 * **Step 14 expects a refusal, and that is a result.** The same gesture that
 * removes a brain at step 13 is refused at step 14, so what the driver reports
 * is what happened, and this file decides what it means.
 */

import {
  activeDescendant,
  addByRealKey,
  canvasCount,
  displayedBrainIds,
  edgeEndpointBrains,
  focusedChipBrainId,
  focusedChipText,
  nodeCountOf,
  nodeDomIdsOf,
  nodeRect,
  pressRemoveByRealKey,
  removeButtonOf,
  removeByRealKey,
  settle,
  statusText,
  territoryBrainIds,
  territoryLabel,
  territoryOffset,
  waitForCompositionReady,
} from "./compositionDriver";
import { domNodeId, type ComposedView } from "./composedView";
import { afterPaint } from "./measure";
import { waitUntil } from "./realInput";
import {
  sameCompositionSession,
  type CompositionSessionState,
} from "./compositionSession";
import type { ScenarioLog } from "./realInput";
import { l12Artifact } from "./runArtifacts";
import type {
  BrainCatalogView,
  BrainNodeRef,
  HostInfo,
  MapOpenReport,
  MapSnapshot,
  RelationsOverview,
} from "./types";
import type { View } from "./viewState";

export interface ComposedScenarioDeps {
  invoke: <T>(command: string, args?: Record<string, unknown>) => Promise<T>;
  host: HostInfo | null;
  /** The product's own « show this brain alone », used to prepare step 1. */
  showOnly: (brainId: string) => void;
  /** The product's own `× Retirer`, for the removals that are not keyboard ones. */
  remove: (brainId: string) => void;
  /** The product's own selection, which moves the focus with it — `L7`. */
  select: (reference: BrainNodeRef) => void;
  setView: (view: View) => void;
  /** What the page currently holds, read at the moment it is asked for. */
  readSession: () => CompositionSessionState;
  readComposition: () => ComposedView | null;
  setStatus: (message: string) => void;
  log: ScenarioLog;
}

const MARKER = "L12-KEY-READY";

/** The frozen node counts of §4.2. */
const EXPECTED_NODES: Record<string, number> = {
  "brain-alpha": 12,
  "brain-beta": 157,
  "brain-gamma": 12,
};

/** The two views §4.7's scenario asks to be kept apart, frozen here. */
const C2_VIEW: View = { scale: 1.7, tx: -220, ty: 75 };
const C3_VIEW: View = { scale: 0.55, tx: 40, ty: -30 };

/**
 * Waits until the page stops moving, **without saying where it should stop**.
 *
 * A change of composition lands in two commits: the state applied while the
 * composition is loaded, then the effect that restores or fits the view one
 * render later. Reading between the two publishes the *previous* composition's
 * pan and zoom — which is exactly what the first real run of this scenario did,
 * recording `restoredExactly=false` for a view that was restored correctly a
 * frame afterwards. That is a measurement defect of the kind `TASK-0016` §13.4
 * documents, and `J12` learnt the same lesson about its relations panel.
 *
 * Waiting for a **specific** value would be assuming the answer. Waiting for
 * the value to **stop changing** is not: if the product never restores
 * anything, this returns what is actually on screen and the criterion fails on
 * a true reading.
 */
async function settledSession(
  read: () => CompositionSessionState,
  budgetMs = 5_000,
): Promise<{ state: CompositionSessionState; settled: boolean; waitedMs: number }> {
  const started = performance.now();
  let previous = JSON.stringify(read());
  let stable = 0;
  while (performance.now() - started < budgetMs) {
    await afterPaint();
    const now = JSON.stringify(read());
    if (now === previous) {
      stable += 1;
      // Three consecutive identical frames: the render that follows a commit
      // has had its chance, and so has the one after it.
      if (stable >= 3) {
        return { state: read(), settled: true, waitedMs: performance.now() - started };
      }
    } else {
      stable = 0;
      previous = now;
    }
  }
  return { state: read(), settled: false, waitedMs: performance.now() - started };
}

function detailsName(): string {
  return document.querySelector(".details__name")?.textContent?.trim() ?? "";
}

function detailsPath(): string {
  return document.querySelector(".details__path")?.textContent?.trim() ?? "";
}

/** How many rectangles one territory currently draws as selected. */
function selectedCountOf(brainId: string): number {
  return document.querySelectorAll(`.map-node--selected[data-brain-id="${brainId}"]`).length;
}

/** The rectangles of one brain, keyed by node id, as the DOM holds them. */
function rectsOf(brainId: string): Record<string, unknown> {
  const rects: Record<string, unknown> = {};
  for (const element of document.querySelectorAll<HTMLElement>(
    `.map-node[data-brain-id="${brainId}"]`,
  )) {
    const nodeId = Number(element.dataset.nodeId);
    rects[String(nodeId)] = nodeRect(brainId, nodeId);
  }
  return rects;
}

/** Whether two rectangle maps are identical — `L5` asks for identical, not close. */
function sameRects(left: Record<string, unknown>, right: Record<string, unknown>): boolean {
  const keys = Object.keys(left);
  if (keys.length === 0 || keys.length !== Object.keys(right).length) return false;
  return keys.every((key) => JSON.stringify(left[key]) === JSON.stringify(right[key]));
}

/**
 * Steps 1 to 14, in the first process.
 *
 * The evidence object comes **from the caller**. A pass that fails half way has
 * still established something — which composition was reached, which key was
 * trusted, what the counts were — and that has to reach the artefact rather
 * than die with the exception.
 */
async function firstPass(
  deps: ComposedScenarioDeps,
  evidence: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const { invoke, showOnly, remove, select, setView, readSession, readComposition, log } = deps;
  evidence.steps = "L12.1 a L12.14";
  const keyFailures: unknown[] = [];
  evidence.keyFailures = keyFailures;

  // --- 1. Alpha active, deterministically ----------------------------------
  log("info", "L12.1: preparation, Alpha seul et actif");
  evidence.step1_compositionReady = await waitForCompositionReady();
  showOnly("brain-alpha");
  await settle();
  await waitForCompositionReady();
  const catalogAtStart = await invoke<BrainCatalogView>("map_brains");
  evidence.step1_prepared = {
    activeBrainId: catalogAtStart.activeBrainId,
    alphaIsActive: catalogAtStart.activeBrainId === "brain-alpha",
    catalogPath: catalogAtStart.catalogPath,
    brainsInCatalogue: catalogAtStart.brains.length,
  };

  // --- 2. start on Alpha ALONE ---------------------------------------------
  const alphaAlone = displayedBrainIds();
  const alphaRectsAlone = rectsOf("brain-alpha");
  evidence.step2_alphaAlone = {
    displayedBrainIds: alphaAlone,
    aloneOnScreen: alphaAlone.length === 1 && alphaAlone[0] === "brain-alpha",
    canvases: canvasCount(),
    territories: territoryBrainIds(),
    nodesDrawn: nodeCountOf("brain-alpha"),
    territoryOffset: territoryOffset("brain-alpha"),
    focusedChip: focusedChipText(),
  };

  // --- 3. add Gamma BY A REAL KEYSTROKE ------------------------------------
  log("info", "L12.3: ajout de Gamma par frappe reelle");
  const addGamma = await addByRealKey("brain-gamma", log, MARKER, keyFailures);
  await settle();
  await waitForCompositionReady();
  evidence.step3_addGammaByKey = {
    activationIsTrusted: addGamma.choose.activationIsTrusted,
    keydownIsTrusted: addGamma.choose.keydownIsTrusted,
    programmaticClickCalls:
      addGamma.open.programmaticClickCalls + addGamma.choose.programmaticClickCalls,
    programmaticClickDispatches:
      addGamma.open.programmaticClickDispatches + addGamma.choose.programmaticClickDispatches,
    noProgrammaticActivationUsed:
      addGamma.open.programmaticClickCalls + addGamma.choose.programmaticClickCalls === 0 &&
      addGamma.open.programmaticClickDispatches + addGamma.choose.programmaticClickDispatches === 0,
    displayedAfter: displayedBrainIds(),
    isC2:
      JSON.stringify(displayedBrainIds()) === JSON.stringify(["brain-alpha", "brain-gamma"]),
    // §4.1 rule 6: reading a secondary brain's data does not make it active.
    focusStayedOnAlpha: focusedChipBrainId() === "brain-alpha",
  };

  // --- 4. one SVG, two territories, 12 + 12 --------------------------------
  const alphaSnapshot = await invoke<MapSnapshot>("map_snapshot", { brainId: "brain-alpha" });
  const gammaSnapshot = await invoke<MapSnapshot>("map_snapshot", { brainId: "brain-gamma" });
  const alphaReport = await prepareScenarioIndex(invoke, "brain-alpha", "map_refresh");
  const gammaReport = await prepareScenarioIndex(invoke, "brain-gamma", "map_refresh");
  const alphaRectsComposed = rectsOf("brain-alpha");
  evidence.step4_c2 = {
    canvases: canvasCount(),
    singleCanvas: canvasCount() === 1,
    territories: territoryBrainIds(),
    twoTerritories: territoryBrainIds().length === 2,
    alphaTerritoryLabel: territoryLabel("brain-alpha"),
    gammaTerritoryLabel: territoryLabel("brain-gamma"),
    alphaNodesDrawn: nodeCountOf("brain-alpha"),
    gammaNodesDrawn: nodeCountOf("brain-gamma"),
    countsAre12And12:
      nodeCountOf("brain-alpha") === EXPECTED_NODES["brain-alpha"] &&
      nodeCountOf("brain-gamma") === EXPECTED_NODES["brain-gamma"],
    // `L2` — two independent snapshots, and two files on disk.
    alphaSnapshotNodes: alphaSnapshot.nodeCount,
    gammaSnapshotNodes: gammaSnapshot.nodeCount,
    alphaIndexPath: alphaReport.indexPath,
    gammaIndexPath: gammaReport.indexPath,
    indexPathsDistinct: alphaReport.indexPath !== gammaReport.indexPath,
    sameSource: alphaReport.sourceRef === gammaReport.sourceRef,
    // `L5` — composing translates a territory; it never relays out a brain.
    alphaOffsetComposed: territoryOffset("brain-alpha"),
    gammaOffsetComposed: territoryOffset("brain-gamma"),
    alphaRectanglesUnchanged: sameRects(alphaRectsAlone, alphaRectsComposed),
  };

  // --- 5. the same node id, in Alpha then in Gamma --------------------------
  const sharedId = alphaSnapshot.nodes[3]?.id ?? alphaSnapshot.rootId;
  const gammaHasIt = gammaSnapshot.nodes.some((node) => node.id === sharedId);
  select({ brainId: "brain-alpha", nodeId: sharedId });
  await settle();
  // The panel reads its detail through a command, so it is a frame or more
  // behind the selection. Reported rather than thrown: if it never arrives the
  // evidence says so, and the reader sees an empty panel for what it is.
  const alphaDetailSettled = await waitUntil(() => detailsName().length > 0, 5_000);
  const inAlpha = {
    activeDescendant: activeDescendant(),
    focusedBrainId: focusedChipBrainId(),
    detailsName: detailsName(),
    detailsPath: detailsPath(),
    selectedInAlpha: selectedCountOf("brain-alpha"),
    selectedInGamma: selectedCountOf("brain-gamma"),
    detailSettled: alphaDetailSettled.settled,
  };
  select({ brainId: "brain-gamma", nodeId: sharedId });
  await settle();
  const gammaDetailSettled = await waitUntil(() => detailsName().length > 0, 5_000);
  const inGamma = {
    activeDescendant: activeDescendant(),
    focusedBrainId: focusedChipBrainId(),
    detailsName: detailsName(),
    detailsPath: detailsPath(),
    selectedInAlpha: selectedCountOf("brain-alpha"),
    selectedInGamma: selectedCountOf("brain-gamma"),
    detailSettled: gammaDetailSettled.settled,
  };
  const alphaDomIds = nodeDomIdsOf("brain-alpha");
  const gammaDomIds = nodeDomIdsOf("brain-gamma");
  evidence.step5_collision = {
    sharedNodeId: sharedId,
    theSameIdExistsInBothBrains: gammaHasIt,
    inAlpha,
    inGamma,
    expectedAlphaDomId: domNodeId("brain-alpha", sharedId),
    expectedGammaDomId: domNodeId("brain-gamma", sharedId),
    domIdsAreDistinct: domNodeId("brain-alpha", sharedId) !== domNodeId("brain-gamma", sharedId),
    // `L3` — selecting one never selects the other.
    selectingAlphaLeftGammaUnselected: inAlpha.selectedInGamma === 0,
    selectingGammaLeftAlphaUnselected: inGamma.selectedInAlpha === 0,
    // No id is shared between the two territories, over the whole canvas.
    noDomIdIsSharedAcrossTerritories:
      alphaDomIds.length > 0 &&
      gammaDomIds.length > 0 &&
      alphaDomIds.every((id) => !gammaDomIds.includes(id)),
    allDomIdsUnique:
      new Set([...alphaDomIds, ...gammaDomIds]).size === alphaDomIds.length + gammaDomIds.length,
  };

  // --- 6. a pan and zoom that belong to C2 ---------------------------------
  setView(C2_VIEW);
  await settle();
  const rectsAfterPan = rectsOf("brain-alpha");
  evidence.step6_c2View = {
    asked: C2_VIEW,
    onScreen: readSession(),
    // `L5` — a pan or a zoom never recomputes an internal layout.
    internalLayoutUnchangedByPanZoom: sameRects(alphaRectsComposed, rectsAfterPan),
  };

  // --- 7. approve S-005 in Alpha; Gamma is untouched ------------------------
  const alphaBefore = await invoke<RelationsOverview>("map_relations_open", {
    brainId: "brain-alpha",
  });
  const gammaBefore = await invoke<RelationsOverview>("map_relations_open", {
    brainId: "brain-gamma",
  });
  const s005WasPending = alphaBefore.pendingSuggestions.some(
    (entry) => entry.suggestionKey === "S-005",
  );
  let approvalError: string | null = null;
  if (s005WasPending) {
    try {
      await invoke<RelationsOverview>("map_relations_approve", {
        brainId: "brain-alpha",
        suggestionKey: "S-005",
      });
    } catch (error) {
      approvalError = String(error);
    }
  }
  const alphaAfter = await invoke<RelationsOverview>("map_relations_open", {
    brainId: "brain-alpha",
  });
  const gammaAfter = await invoke<RelationsOverview>("map_relations_open", {
    brainId: "brain-gamma",
  });
  const gammaPendingBefore = gammaBefore.pendingSuggestions.map((entry) => entry.suggestionKey);
  const gammaPendingAfter = gammaAfter.pendingSuggestions.map((entry) => entry.suggestionKey);
  evidence.step7_approvalIsolated = {
    // `L12.7` names `S-005`, and the sandbox is persistent: an earlier run of
    // the `K12` regression approves the same suggestion in the same brain, and
    // nothing in the runtime un-approves one. When that has happened, the state
    // the criterion asks for is already reached and the **act** cannot be
    // replayed here. Said in full rather than left to be inferred from a
    // `false`.
    s005WasPending,
    approvalReplayable: s005WasPending,
    approvalNotReplayableReason: s005WasPending
      ? null
      : "S-005 etait deja approuvee dans brain-alpha au demarrage de cette passe — bac a sable persistant, aucune commande de remise a zero",
    s005IsApprovedInAlpha:
      !alphaAfter.pendingSuggestions.some((entry) => entry.suggestionKey === "S-005"),
    approvalError,
    alphaApprovedBefore: alphaBefore.approvedCount,
    alphaApprovedAfter: alphaAfter.approvedCount,
    alphaPendingBefore: alphaBefore.pendingSuggestionCount,
    alphaPendingAfter: alphaAfter.pendingSuggestionCount,
    alphaMovedByExactlyOne:
      s005WasPending &&
      alphaAfter.approvedCount === alphaBefore.approvedCount + 1 &&
      alphaAfter.pendingSuggestionCount === alphaBefore.pendingSuggestionCount - 1,
    gammaApprovedBefore: gammaBefore.approvedCount,
    gammaApprovedAfter: gammaAfter.approvedCount,
    gammaPendingBefore,
    gammaPendingAfter,
    gammaStrictlyUnchanged:
      gammaAfter.approvedCount === gammaBefore.approvedCount &&
      gammaAfter.pendingSuggestionCount === gammaBefore.pendingSuggestionCount &&
      JSON.stringify(gammaPendingAfter) === JSON.stringify(gammaPendingBefore),
    alphaRelationsPath: alphaAfter.relationsPath,
    gammaRelationsPath: gammaAfter.relationsPath,
    separateStores: alphaAfter.relationsPath !== gammaAfter.relationsPath,
    gammaS005StillPending: gammaPendingAfter.includes("S-005"),
  };

  // What C2 is being left at, so step 12 can say whether it came back.
  const c2Left = readSession();
  evidence.step7_c2Left = c2Left;

  // --- 8. add Bêta BY A REAL KEYSTROKE → C3 --------------------------------
  log("info", "L12.8: ajout de Beta par frappe reelle");
  const addBeta = await addByRealKey("brain-beta", log, MARKER, keyFailures);
  await settle();
  await waitForCompositionReady();
  const betaSnapshot = await invoke<MapSnapshot>("map_snapshot", { brainId: "brain-beta" });
  const drawn = {
    alpha: nodeCountOf("brain-alpha"),
    beta: nodeCountOf("brain-beta"),
    gamma: nodeCountOf("brain-gamma"),
  };
  evidence.step8_c3 = {
    activationIsTrusted: addBeta.choose.activationIsTrusted,
    keydownIsTrusted: addBeta.choose.keydownIsTrusted,
    programmaticClickCalls:
      addBeta.open.programmaticClickCalls + addBeta.choose.programmaticClickCalls,
    programmaticClickDispatches:
      addBeta.open.programmaticClickDispatches + addBeta.choose.programmaticClickDispatches,
    displayedAfter: displayedBrainIds(),
    // §4.1 rule 1 — catalogue order, never the order things were added in.
    inCatalogueOrder:
      JSON.stringify(displayedBrainIds()) ===
      JSON.stringify(["brain-alpha", "brain-beta", "brain-gamma"]),
    canvases: canvasCount(),
    singleCanvas: canvasCount() === 1,
    territories: territoryBrainIds(),
    drawn,
    total: drawn.alpha + drawn.beta + drawn.gamma,
    countsAre12_157_12:
      drawn.alpha === 12 && drawn.beta === 157 && drawn.gamma === 12,
    totalIs181: drawn.alpha + drawn.beta + drawn.gamma === 181,
    betaSnapshotNodes: betaSnapshot.nodeCount,
    reportedTotal:
      document.querySelector('[data-testid="composed-total"]')?.textContent?.trim() ?? "",
  };

  // --- 9. no INTRA-brain edge leaves its territory -------------------------
  //
  // `L8`'s subject, unchanged: a relation of `TASK-0017` has both ends inside
  // one brain, and the edge drawn for it never crosses a boundary. `.map-edge`
  // selects exactly those — `TASK-0020`'s inter-brain edges carry
  // `map-cross-edge` and no `map-edge`, so this count means today what it meant
  // when `L8` was frozen. The second layer is reported beside it rather than
  // folded into it: it exists, it is supposed to cross, and it is not what this
  // criterion is about.
  const edges = edgeEndpointBrains();
  const crossing = edges.filter((edge) => edge.from !== edge.to || edge.from === "");
  const crossLayer = [...document.querySelectorAll<HTMLElement>('[data-cross="true"]')];
  evidence.step9_noCrossBrainEdges = {
    edgesDrawn: edges.length,
    crossingEdges: crossing.length,
    crossingSamples: crossing.slice(0, 5),
    everyEdgeStaysInOneBrain: crossing.length === 0,
    brainsCarryingEdges: [...new Set(edges.map((edge) => edge.from))],
    // Declared, not hidden: TASK-0020 added a second kind of edge.
    interBrainLayerPresent: crossLayer.length,
    interBrainLayerCarriesNoMapEdgeClass: crossLayer.every(
      (element) => !element.classList.contains("map-edge"),
    ),
    interBrainRelationsAreAnotherLayer:
      "TASK-0020 / DEC-0018 — les aretes inter-cerveaux portent map-cross-edge, " +
      "jamais map-edge; L8 continue de mesurer les relations INTRA-cerveau",
  };

  // --- 10. select a Bêta node ----------------------------------------------
  const betaNodeId = betaSnapshot.nodes[10]?.id ?? betaSnapshot.rootId;
  select({ brainId: "brain-beta", nodeId: betaNodeId });
  await settle();
  const catalogAfterBeta = await invoke<BrainCatalogView>("map_brains");
  evidence.step10_betaSelection = {
    nodeId: betaNodeId,
    activeDescendant: activeDescendant(),
    expectedActiveDescendant: domNodeId("brain-beta", betaNodeId),
    detailsName: detailsName(),
    detailsPath: detailsPath(),
    focusedBrainId: focusedChipBrainId(),
    focusFollowedTheSelection: focusedChipBrainId() === "brain-beta",
    // §4.1 rule 5 — the focused brain **is** the active brain, and it persists.
    activeBrainId: catalogAfterBeta.activeBrainId,
    activeBrainFollowedTheFocus: catalogAfterBeta.activeBrainId === "brain-beta",
    composition: readComposition(),
    selectedElsewhere: selectedCountOf("brain-alpha") + selectedCountOf("brain-gamma"),
  };

  // --- 11. another pan and zoom, this one C3's -----------------------------
  setView(C3_VIEW);
  await settle();
  const c3Left = readSession();
  evidence.step11_c3View = {
    asked: C3_VIEW,
    onScreen: c3Left,
    differsFromC2: !sameCompositionSession(c3Left, c2Left),
  };

  // --- 12. back to C2, restored exactly ------------------------------------
  remove("brain-beta");
  await settle();
  await waitForCompositionReady();
  const settledBack = await settledSession(readSession);
  const c2Back = settledBack.state;
  evidence.step12_backToC2 = {
    displayed: displayedBrainIds(),
    settled: settledBack.settled,
    waitedMs: Math.round(settledBack.waitedMs),
    isC2: JSON.stringify(displayedBrainIds()) === JSON.stringify(["brain-alpha", "brain-gamma"]),
    left: c2Left,
    back: c2Back,
    restoredExactly: sameCompositionSession(c2Back, c2Left),
    // `L6` — removing touched the view and nothing else.
    betaStillInCatalogue: (await invoke<BrainCatalogView>("map_brains")).brains.some(
      (brain) => brain.brainId === "brain-beta",
    ),
    betaIndexStillThere: (await invoke<MapOpenReport>("map_open", { brainId: "brain-beta" })).indexId,
    betaNodesStillThere: (
      await invoke<MapSnapshot>("map_snapshot", { brainId: "brain-beta" })
    ).nodeCount,
  };

  // --- 13. remove Alpha BY A REAL KEYSTROKE --------------------------------
  log("info", "L12.13: retrait d'Alpha par frappe reelle");
  const removeAlpha = await removeByRealKey("brain-alpha", log, MARKER, keyFailures);
  await settle();
  await waitForCompositionReady();
  const catalogAfterRemoval = await invoke<BrainCatalogView>("map_brains");
  evidence.step13_removeAlphaByKey = {
    activationIsTrusted: removeAlpha.activationIsTrusted,
    keydownIsTrusted: removeAlpha.keydownIsTrusted,
    programmaticClickCalls: removeAlpha.programmaticClickCalls,
    programmaticClickDispatches: removeAlpha.programmaticClickDispatches,
    displayedAfter: displayedBrainIds(),
    gammaAlone:
      JSON.stringify(displayedBrainIds()) === JSON.stringify(["brain-gamma"]),
    focusedBrainId: focusedChipBrainId(),
    gammaIsFocused: focusedChipBrainId() === "brain-gamma",
    activeBrainId: catalogAfterRemoval.activeBrainId,
    gammaIsActive: catalogAfterRemoval.activeBrainId === "brain-gamma",
    // `L6` — Alpha left the view and nothing else.
    alphaStillInCatalogue: catalogAfterRemoval.brains.some(
      (brain) => brain.brainId === "brain-alpha",
    ),
  };

  // --- 14. removing the last brain is refused ------------------------------
  log("info", "L12.14: tentative de retrait du dernier cerveau");
  const ariaDisabled = removeButtonOf("brain-gamma")?.getAttribute("aria-disabled") ?? null;
  const focusableAnyway = removeButtonOf("brain-gamma")?.disabled === false;
  // A short budget on purpose: what is expected here is that **nothing**
  // changes, and `pressRealKey` waits out its whole budget when the predicate
  // never becomes true. Ninety seconds of waiting for a refusal that arrives
  // instantly would be ninety seconds of nothing.
  const refusalKey = await pressRemoveByRealKey("brain-gamma", log, MARKER, 20_000);
  await settle();
  evidence.step14_lastRemovalRefused = {
    ariaDisabled,
    stillFocusable: focusableAnyway,
    keydownIsTrusted: refusalKey.keydownIsTrusted,
    activationIsTrusted: refusalKey.activationIsTrusted,
    focusReached: refusalKey.focusReached,
    // The chip is still there: `observedChange` watches for its disappearance.
    chipDisappeared: refusalKey.observedChange,
    displayedAfter: displayedBrainIds(),
    stillDisplayed:
      JSON.stringify(displayedBrainIds()) === JSON.stringify(["brain-gamma"]),
    status: statusText(),
    refusalIsExplicit: statusText().length > 0,
    composition: readComposition(),
    refused: refusalKey.observedChange === false && displayedBrainIds().length === 1,
  };

  // --- 15, 16. outside the page --------------------------------------------
  evidence.step15to16_restart =
    "fermeture et redemarrage reels: hors de la page, par scripts/l12-run-real-host.ps1";

  return evidence;
}

/** Step 17, in the **second** process, after a real restart. */
async function secondPass(
  deps: ComposedScenarioDeps,
  evidence: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const { invoke } = deps;
  const ready = await waitForCompositionReady();
  const catalog = await invoke<BrainCatalogView>("map_brains");
  const active = catalog.brains.find((brain) => brain.brainId === catalog.activeBrainId) ?? null;
  const displayed = displayedBrainIds();

  return Object.assign(evidence, {
    steps: "L12.17 — apres une fermeture et un redemarrage reels",
    compositionReady: ready,
    activeBrainId: catalog.activeBrainId,
    // `K9`, unchanged by this slice: the active brain survives a restart.
    gammaStillActive: catalog.activeBrainId === "brain-gamma",
    interfaceShowsTheActiveBrain: active ? focusedChipText().includes(active.displayName) : false,
    displayedBrainIds: displayed,
    // §3, declared in advance: the composition is session-only, so the
    // application comes back on the active brain **alone**. This is the limit
    // being confirmed, not a defect being discovered.
    compositionIsGammaAlone: displayed.length === 1 && displayed[0] === "brain-gamma",
    canvases: canvasCount(),
    territories: territoryBrainIds(),
    composedViewPersistence: "non implementee dans TASK-0019 — P-19",
    seededOnThisStart: catalog.seeded,
    seedCreatedNothing: catalog.seeded === 0,
  });
}

/**
 * Runs one pass of `L12` and writes its artefact.
 *
 * `pass` comes from the host — `FILETOPO_AUTO_COMPOSED=1` or `=2` — because
 * only the host knows whether this process is the one before the restart or
 * the one after it.
 */
export async function runComposedScenario(
  deps: ComposedScenarioDeps,
  pass: 1 | 2,
): Promise<void> {
  const { invoke, host, setStatus, log } = deps;
  // Filled in place, so a throw still leaves behind everything gathered up to
  // the point of failure.
  const evidence: Record<string, unknown> = { pass };

  try {
    log("info", `L12: debut de la passe ${pass}`);
    if (pass === 1) {
      await firstPass(deps, evidence);
    } else {
      await secondPass(deps, evidence);
    }

    const written = await invoke<string>("map_write_run_artifact", {
      name: l12Artifact(pass, "written"),
      contents: JSON.stringify(
        {
          task: "TASK-0026",
          criterion: "L12",
          nature: "criterion evidence",
          replacesCanonicalEvidence: false,
          pass,
          capturedAtIso: new Date().toISOString(),
          host,
          evidence,
        },
        null,
        2,
      ),
    });
    log("info", `L12: passe ${pass} terminee, artefact ecrit: ${written}`);
    setStatus(`Scénario L12 (passe ${pass}) écrit dans ${written}`);
  } catch (error) {
    // A failed pass is still a result, and it is written down.
    log("error", `L12: passe ${pass} interrompue: ${String(error)}`);
    setStatus(`Scénario L12 interrompu : ${String(error)}`);
    try {
      await invoke<string>("map_write_run_artifact", {
        name: l12Artifact(pass, "abandoned"),
        contents: JSON.stringify(
          {
            task: "TASK-0026",
            criterion: "L12",
            pass,
            outcome: "abandoned",
            reason: String(error),
            host,
            evidence,
          },
          null,
          2,
        ),
      });
    } catch {
      // The status line already carries the reason.
    }
  }
}
