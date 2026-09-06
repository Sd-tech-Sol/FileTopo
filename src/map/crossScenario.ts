/**
 * `M12` — inter-brain relations in the **real host**, unattended.
 *
 * The twenty-eight steps of `TASK-0020` §4.12 run in the order they were
 * frozen, driven through the composition bar and the panel a person would use.
 * Every count comes back from a command or off the DOM; nothing here recomputes
 * one, and nothing asserts what it did not read.
 *
 * **Two passes, because step 23 says « fermer réellement ».** A restart cannot
 * be faked from inside a page: steps 1 to 22 run in the first process and write
 * their evidence, the host is really closed — step 23 — and steps 24 to 28 run
 * in the second process and read the common store back.
 * `scripts/m12-run-real-host.ps1` is what closes and relaunches; the two
 * artefacts stand on their own and name the process that produced them.
 *
 * **Real keystrokes.** Adding a brain, following a relation and approving a
 * suggestion are performed by keys the operating system delivers, not by
 * anything the page dispatches: the control is focused, a marker is printed,
 * and `scripts/j12-send-real-key.ps1` sends the key through `WScript.Shell`.
 * The same three instruments as `J12` are read — `isTrusted`, the count of
 * programmatic clicks over the whole window, and the observable change. If a
 * keystroke never arrives, the pass fails; it never falls back to a click.
 */

import {
  addByRealKey,
  canvasCount,
  displayedBrainIds,
  focusedChipBrainId,
  settle,
  statusText,
  territoryBrainIds,
  waitForCompositionReady,
} from "./compositionDriver";
import { domNodeId, type ComposedView } from "./composedView";
import { pressRealKey, waitUntil, type ScenarioLog } from "./realInput";
import { artifactTaskId, m12Artifact, runtimeWriteOwnership } from "./runArtifacts";
import type {
  BrainNodeRef,
  CrossRelationsOverview,
  CrossRelationsSelfCheck,
  FrozenCrossReference,
  HostInfo,
  MapSnapshot,
} from "./types";

export interface CrossScenarioDeps {
  invoke: <T>(command: string, args?: Record<string, unknown>) => Promise<T>;
  host: HostInfo | null;
  /** The product's own « show this brain alone », used to prepare step 1. */
  showOnly: (brainId: string) => void;
  /** The product's own `× Retirer`, for step 13. */
  remove: (brainId: string) => void;
  /** The product's own selection, which moves the focus with it. */
  select: (reference: BrainNodeRef) => void;
  readComposition: () => ComposedView | null;
  setStatus: (message: string) => void;
  log: ScenarioLog;
}

const MARKER = "M12-KEY-READY";

/* --- reading the inter-brain layer off the DOM ----------------------------- */

/** Every inter-brain edge drawn, as the pair of brains its ends belong to. */
function crossEdges(): { from: string; to: string; kind: string; provenance: string }[] {
  return [...document.querySelectorAll<HTMLElement>('[data-cross="true"]')].map((element) => ({
    from: element.dataset.fromBrainId ?? "",
    to: element.dataset.toBrainId ?? "",
    kind: element.dataset.kind ?? "",
    provenance: element.dataset.provenance ?? "",
  }));
}

/**
 * Every **intra-brain** edge. `.map-edge` selects those and only those: an
 * inter-brain edge carries `map-cross-edge` and no `map-edge`, so the two kinds
 * cannot contaminate each other's counts — the same separation the two panels
 * have, for the same reason.
 */
function intraEdges(): { from: string; to: string }[] {
  return [...document.querySelectorAll<HTMLElement>(".map-edge")].map((element) => ({
    from: element.dataset.fromBrainId ?? "",
    to: element.dataset.toBrainId ?? "",
  }));
}

/** The controls the inter-brain panel exposes, with everything `M7` asks for. */
function crossEntries(): {
  element: HTMLButtonElement;
  endpointKey: string;
  brainId: string;
  nodeId: string;
  displayed: boolean;
  direction: string;
  provenance: string;
  relationType: string;
  label: string;
  ruleText: string;
}[] {
  return [...document.querySelectorAll<HTMLButtonElement>('[data-cross-entry="true"]')].map(
    (element) => ({
      element,
      endpointKey: element.dataset.endpointKey ?? "",
      brainId: element.dataset.endpointBrainId ?? "",
      nodeId: element.dataset.endpointNodeId ?? "",
      displayed: element.dataset.endpointDisplayed === "true",
      direction: element.dataset.direction ?? "",
      provenance: element.dataset.provenance ?? "",
      relationType: element.dataset.relationType ?? "",
      label: element.getAttribute("aria-label") ?? "",
      ruleText:
        element.parentElement?.querySelector(".cross-relation__rule")?.textContent?.trim() ?? "",
    }),
  );
}

function textOf(selector: string): string {
  return document.querySelector(selector)?.textContent?.trim() ?? "";
}

function crossTotals(): string {
  return textOf('[data-testid="cross-relation-totals"]');
}

/**
 * How many entries each panel exposes, counted with the selectors that panel
 * actually uses.
 *
 * The two namespaces do not overlap — `CrossRelationsPanel` carries no
 * `relation__*` class — so these two numbers cannot contaminate each other.
 * Published side by side because `M7` is about telling the two apart, and two
 * counts that could not be confused is the evidence for it.
 */
function panelEntryCounts(): { internal: number; cross: number } {
  return {
    internal: document.querySelectorAll(".relations__direction .relation__link").length,
    cross: document.querySelectorAll(".cross-relations__direction .cross-relation__link").length,
  };
}

function intraTotals(): string {
  return textOf('[data-testid="relation-totals"]');
}

/** The whole inter-brain panel as text — where « hors de la vue » must appear. */
function crossPanelText(): string {
  return document.querySelector(".cross-relations")?.textContent?.trim() ?? "";
}

function crossApproveButton(suggestionKey: string): HTMLButtonElement | null {
  return document.querySelector<HTMLButtonElement>(`[data-cross-approve="${suggestionKey}"]`);
}

function activeDescendant(): string | null {
  return (
    document.querySelector(".map-view__canvas")?.getAttribute("aria-activedescendant") ?? null
  );
}

/** How many rectangles one territory currently draws as selected. */
function selectedCountOf(brainId: string): number {
  return document.querySelectorAll(`.map-node--selected[data-brain-id="${brainId}"]`).length;
}

/** How many rectangles are accentuated as inter-brain neighbours — `M`. */
function crossLinkedCountOf(brainId: string): number {
  return document.querySelectorAll(
    `.map-node[data-brain-id="${brainId}"][data-cross-linked="true"]`,
  ).length;
}

/** Waits for the inter-brain panel to describe the node that is selected. */
async function waitForCrossPanel(endpointKeyOrEmpty: string): Promise<boolean> {
  const outcome = await waitUntil(() => {
    if (crossTotals().length === 0) return false;
    if (endpointKeyOrEmpty.length === 0) return true;
    return crossEntries().some((entry) => entry.endpointKey === endpointKeyOrEmpty);
  }, 8_000);
  return outcome.settled;
}

/**
 * The panel control for one endpoint, fetched **at the moment it is pressed**.
 *
 * A control captured earlier and pressed after an `await` may have been
 * replaced by a re-render, and focusing a detached node sends the key nowhere.
 * The first real `M12` run lost step 16 exactly that way: the element was read
 * at step 14, an `invoke` in between let the panel re-render, and the keystroke
 * went to the window. Re-querying costs nothing and removes the whole class of
 * failure.
 */
async function liveCrossEntry(endpointKey: string): Promise<HTMLButtonElement> {
  const outcome = await waitUntil(() => {
    const found = crossEntries().find((candidate) => candidate.endpointKey === endpointKey);
    return found !== undefined && found.element.isConnected;
  }, 8_000);
  const entry = crossEntries().find((candidate) => candidate.endpointKey === endpointKey);
  if (!entry || !entry.element.isConnected) {
    throw new Error(
      `aucun controle vivant pour ${endpointKey} (stabilise=${outcome.settled})`,
    );
  }
  return entry.element;
}

/** A node id, by relative path, in one brain's snapshot. */
function nodeIdOf(snapshot: MapSnapshot, relativePath: string): number | null {
  return snapshot.nodes.find((node) => node.relativePath === relativePath)?.id ?? null;
}

/* --- pass 1: steps 1 to 22 ------------------------------------------------- */

async function firstPass(
  deps: CrossScenarioDeps,
  evidence: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const { invoke, showOnly, remove, select, readComposition, log } = deps;
  evidence.steps = "M12.1 a M12.22";
  const keyFailures: unknown[] = [];
  evidence.keyFailures = keyFailures;

  // --- 1. Alpha alone, and active -----------------------------------------
  log("info", "M12.1: preparation, Alpha seul et actif");
  await waitForCompositionReady();
  showOnly("brain-alpha");
  await settle();
  await waitForCompositionReady();
  evidence.step1_alphaAlone = {
    displayedBrainIds: displayedBrainIds(),
    aloneOnScreen:
      JSON.stringify(displayedBrainIds()) === JSON.stringify(["brain-alpha"]),
    focusedBrainId: focusedChipBrainId(),
    canvases: canvasCount(),
  };

  // --- 2. the six deterministic relations, in the COMMON store -------------
  const frozen = await invoke<FrozenCrossReference[]>("map_cross_relations_frozen");
  const opened = await invoke<CrossRelationsOverview>("map_cross_relations_open");
  const foundEach = frozen.map((reference) => ({
    reference: reference.reference,
    present: opened.established.some(
      (edge) =>
        edge.source.key === reference.sourceKey &&
        edge.target.key === reference.targetKey &&
        edge.relationType === reference.relationType &&
        edge.provenance === "DETERMINISTIC" &&
        edge.ruleName === reference.ruleName &&
        edge.ruleVersion === reference.ruleVersion,
    ),
  }));
  evidence.step2_sixDeterministic = {
    storePath: opened.storePath,
    // §4.1 — the common store is neither a brain's own nor the catalogue.
    storeIsCommon: opened.storePath === "brains/interbrain/relations.sqlite",
    schemaVersion: opened.schemaVersion,
    endpointKeyScheme: opened.endpointKeyScheme,
    deterministicCount: opened.deterministicCount,
    approvedCount: opened.approvedCount,
    pendingSuggestionCount: opened.pendingSuggestionCount,
    sixDeterministic: opened.deterministicCount === 6,
    eachFrozenRelationPresent: foundEach,
    allSixPresent: foundEach.every((entry) => entry.present),
    everyRelationJoinsTwoBrains: opened.established.every(
      (edge) => edge.source.brainId !== edge.target.brainId,
    ),
    resolvedBrainIds: opened.resolvedBrainIds,
    deterministicDigest: opened.deterministicDigest,
  };

  // --- 3. add Gamma BY A REAL KEYSTROKE → C2 -------------------------------
  log("info", "M12.3: ajout de Gamma par frappe reelle");
  const addGamma = await addByRealKey("brain-gamma", log, MARKER, keyFailures);
  await settle();
  await waitForCompositionReady();
  evidence.step3_addGammaByKey = {
    keydownIsTrusted: addGamma.choose.keydownIsTrusted,
    activationIsTrusted: addGamma.choose.activationIsTrusted,
    programmaticClickCalls:
      addGamma.open.programmaticClickCalls + addGamma.choose.programmaticClickCalls,
    programmaticClickDispatches:
      addGamma.open.programmaticClickDispatches + addGamma.choose.programmaticClickDispatches,
    displayedAfter: displayedBrainIds(),
    isC2: JSON.stringify(displayedBrainIds()) === JSON.stringify(["brain-alpha", "brain-gamma"]),
    territories: territoryBrainIds(),
  };

  // --- 4. at least one Alpha → Gamma edge crossing the territories ---------
  // The overview is re-read by the page when the loaded brains change; wait for
  // the edge rather than assuming the render already happened.
  const drawn = await waitUntil(
    () => crossEdges().some((edge) => edge.from === "brain-alpha" && edge.to === "brain-gamma"),
    10_000,
  );
  const edgesNow = crossEdges();
  const intraNow = intraEdges();
  evidence.step4_crossingEdges = {
    settled: drawn.settled,
    waitedMs: Math.round(drawn.waitedMs),
    crossEdgesDrawn: edgesNow.length,
    alphaToGamma: edgesNow.filter(
      (edge) => edge.from === "brain-alpha" && edge.to === "brain-gamma",
    ).length,
    atLeastOneCrossing: edgesNow.some(
      (edge) => edge.from === "brain-alpha" && edge.to === "brain-gamma",
    ),
    // `M6` — every cross edge names two DIFFERENT brains, and none is drawn
    // inside a single one.
    everyCrossEdgeNamesTwoBrains: edgesNow.every(
      (edge) => edge.from.length > 0 && edge.to.length > 0 && edge.from !== edge.to,
    ),
    crossEdgesDrawnInsideOneBrain: edgesNow.filter((edge) => edge.from === edge.to).length,
    // And the intra-brain edges are still confined, exactly as `L8` required.
    intraEdgesDrawn: intraNow.length,
    intraEdgesLeavingTheirBrain: intraNow.filter((edge) => edge.from !== edge.to).length,
    canvases: canvasCount(),
    singleCanvas: canvasCount() === 1,
  };

  // --- 5. select the source of XB-D01 --------------------------------------
  const alphaSnapshot = await invoke<MapSnapshot>("map_snapshot", { brainId: "brain-alpha" });
  const gammaSnapshot = await invoke<MapSnapshot>("map_snapshot", { brainId: "brain-gamma" });
  const xbd01 = frozen.find((reference) => reference.reference === "XB-D01");
  if (!xbd01) throw new Error("XB-D01 absente des references gelees");
  const sourceNodeId = nodeIdOf(alphaSnapshot, "dossier-a/note-1.txt");
  const targetNodeId = nodeIdOf(gammaSnapshot, "dossier-b/note-1.txt");
  if (sourceNodeId === null || targetNodeId === null) {
    throw new Error("les extremites de XB-D01 ne se resolvent pas");
  }
  select({ brainId: "brain-alpha", nodeId: sourceNodeId });
  await settle();
  const panelSettled = await waitForCrossPanel(xbd01.targetKey);
  evidence.step5_selectSource = {
    reference: "XB-D01",
    sourceNodeId,
    targetNodeId,
    activeDescendant: activeDescendant(),
    expectedActiveDescendant: domNodeId("brain-alpha", sourceNodeId),
    panelSettled,
    // `M` — the inter-brain neighbour is accentuated, in the OTHER territory.
    crossLinkedInGamma: crossLinkedCountOf("brain-gamma"),
    crossLinkedInAlpha: crossLinkedCountOf("brain-alpha"),
    neighbourAccentuated: crossLinkedCountOf("brain-gamma") >= 1,
  };

  // --- 6. the panel: internal separate from cross, both directions ---------
  const entries = crossEntries();
  const towardsGamma = entries.find((entry) => entry.endpointKey === xbd01.targetKey);
  evidence.step6_panel = {
    // `M7` — two panels, two totals, read from two different elements.
    internalSectionPresent: document.querySelector('[aria-label="Relations internes au cerveau"]') !== null,
    crossSectionPresent: document.querySelector('[aria-label="Relations inter-cerveaux"]') !== null,
    sectionsAreDistinct:
      document.querySelector('[aria-label="Relations internes au cerveau"]') !==
      document.querySelector('[aria-label="Relations inter-cerveaux"]'),
    internalTotals: intraTotals(),
    crossTotals: crossTotals(),
    totalsDiffer: intraTotals() !== crossTotals(),
    outgoingEntries: entries.filter((entry) => entry.direction === "outgoing").length,
    incomingEntries: entries.filter((entry) => entry.direction === "incoming").length,
    // The two panels share no class name, so a selector written for one cannot
    // match the other. These two counts are read with two disjoint selectors.
    entryCounts: panelEntryCounts(),
    crossEntriesCarryNoIntraClass:
      document.querySelectorAll(".relations__direction .cross-relation__link").length === 0 &&
      document.querySelectorAll(".cross-relations__direction .relation__link").length === 0,
    entryTowardsGamma: towardsGamma
      ? {
          endpointKey: towardsGamma.endpointKey,
          targetBrainId: towardsGamma.brainId,
          direction: towardsGamma.direction,
          provenance: towardsGamma.provenance,
          relationType: towardsGamma.relationType,
          displayed: towardsGamma.displayed,
          ruleText: towardsGamma.ruleText,
          accessibleName: towardsGamma.label,
        }
      : null,
    // Everything `M7` names, read off the control that is actually activated.
    showsSourceAndTargetBrain:
      (towardsGamma?.label ?? "").includes("Cerveau Gamma") &&
      (towardsGamma?.label ?? "").includes("inter-cerveaux"),
    showsDirection: (towardsGamma?.label ?? "").includes("sortante"),
    showsType: towardsGamma?.relationType === "reference",
    showsProvenance: towardsGamma?.provenance === "DETERMINISTIC",
    showsRuleAndVersion:
      (towardsGamma?.ruleText ?? "").includes("cross-homonymes") &&
      (towardsGamma?.ruleText ?? "").includes("v1"),
  };

  // --- 7. follow XB-D01 BY A REAL KEYSTROKE --------------------------------
  log("info", "M12.7: activation de XB-D01 par frappe reelle");
  if (!towardsGamma) throw new Error("aucune entree du panneau ne mene a Gamma");
  const followControl = await liveCrossEntry(xbd01.targetKey);
  const followKey = await pressRealKey(
    followControl,
    "{ENTER}",
    () => activeDescendant() === domNodeId("brain-gamma", targetNodeId),
    log,
    90_000,
    MARKER,
  );
  await settle();
  const catalogAfterFollow = await invoke<{ activeBrainId: string }>("map_brains");
  evidence.step7_followByKey = {
    keydownIsTrusted: followKey.keydownIsTrusted,
    activationIsTrusted: followKey.activationIsTrusted,
    programmaticClickCalls: followKey.programmaticClickCalls,
    programmaticClickDispatches: followKey.programmaticClickDispatches,
    noProgrammaticActivationUsed:
      followKey.programmaticClickCalls === 0 && followKey.programmaticClickDispatches === 0,
    observedChange: followKey.observedChange,
    waitedMs: followKey.waitedMs,
  };

  // --- 8. the selection landed in Gamma, exactly, and Gamma is active ------
  evidence.step8_landedInGamma = {
    activeDescendant: activeDescendant(),
    expectedActiveDescendant: domNodeId("brain-gamma", targetNodeId),
    exactEndpointSelected: activeDescendant() === domNodeId("brain-gamma", targetNodeId),
    selectedInGamma: selectedCountOf("brain-gamma"),
    selectedInAlpha: selectedCountOf("brain-alpha"),
    // The same row number exists in Alpha; only one node may be selected.
    onlyOneNodeSelected:
      selectedCountOf("brain-gamma") === 1 && selectedCountOf("brain-alpha") === 0,
    focusedBrainId: focusedChipBrainId(),
    gammaIsFocused: focusedChipBrainId() === "brain-gamma",
    activeBrainId: catalogAfterFollow.activeBrainId,
    gammaIsActive: catalogAfterFollow.activeBrainId === "brain-gamma",
    composition: readComposition(),
    // A navigation creates nothing.
    crossCountsUnchanged: (await invoke<CrossRelationsOverview>("map_cross_relations_open"))
      .deterministicCount,
  };

  // --- 9. back to Alpha -----------------------------------------------------
  // The source of `XB-S01`, so step 10 can look at the suggestion that step 11
  // approves. Refused rather than asserted away: a missing node here would make
  // every later step describe the wrong selection.
  const suggestionSourceId = nodeIdOf(alphaSnapshot, "dossier-a/note-2.txt");
  if (suggestionSourceId === null) {
    throw new Error("la source de XB-S01 ne se resout pas dans brain-alpha");
  }
  select({ brainId: "brain-alpha", nodeId: suggestionSourceId });
  await settle();
  await waitForCrossPanel("");
  evidence.step9_backToAlpha = {
    suggestionSourceId,
    focusedBrainId: focusedChipBrainId(),
    activeDescendant: activeDescendant(),
    expectedActiveDescendant: domNodeId("brain-alpha", suggestionSourceId),
    backOnAlpha: focusedChipBrainId() === "brain-alpha",
  };

  // --- 10. XB-S01 pending, and NOT counted ---------------------------------
  const beforeApproval = await invoke<CrossRelationsOverview>("map_cross_relations_open");
  const s01Pending = beforeApproval.pendingSuggestions.find(
    (entry) => entry.suggestionKey === "XB-S01",
  );
  const crossTotalsBefore = crossTotals();
  const suggestionEdgesBefore = crossEdges().filter((edge) => edge.kind === "suggestion").length;
  const establishedEdgesBefore = crossEdges().filter(
    (edge) => edge.kind === "established",
  ).length;
  evidence.step10_suggestionNotCounted = {
    xbS01IsPending: s01Pending?.state === "pending",
    xbS01Source: s01Pending?.source.key ?? null,
    xbS01Target: s01Pending?.target.key ?? null,
    approvedCountBefore: beforeApproval.approvedCount,
    pendingCountBefore: beforeApproval.pendingSuggestionCount,
    // `M10` — a suggestion is a suggestion on screen, and in no count.
    panelSaysNotEstablished: crossPanelText().includes("non établie"),
    approveControlPresent: crossApproveButton("XB-S01") !== null,
    crossTotalsBefore,
    establishedEdgesBefore,
    suggestionEdgesBefore,
    // The counts line reports zero outgoing for this node before approval.
    outgoingIsZeroBefore: crossTotalsBefore.startsWith("0 sortante"),
  };

  // --- 11. approve XB-S01 BY A REAL KEYSTROKE ------------------------------
  log("info", "M12.11: approbation de XB-S01 par frappe reelle");
  const approveControl = crossApproveButton("XB-S01");
  if (!approveControl) throw new Error("le controle d'approbation de XB-S01 est absent");
  const approveKey = await pressRealKey(
    approveControl,
    "{ENTER}",
    () => crossApproveButton("XB-S01") === null,
    log,
    90_000,
    MARKER,
  );
  await settle();
  evidence.step11_approveByKey = {
    keydownIsTrusted: approveKey.keydownIsTrusted,
    activationIsTrusted: approveKey.activationIsTrusted,
    programmaticClickCalls: approveKey.programmaticClickCalls,
    programmaticClickDispatches: approveKey.programmaticClickDispatches,
    noProgrammaticActivationUsed:
      approveKey.programmaticClickCalls === 0 && approveKey.programmaticClickDispatches === 0,
    observedChange: approveKey.observedChange,
    status: statusText(),
  };

  // --- 12. exactly one APPROVED relation, +1, the suggestion gone ----------
  const afterApproval = await invoke<CrossRelationsOverview>("map_cross_relations_open");
  const approvedEdge = afterApproval.established.find(
    (edge) => edge.suggestionKey === "XB-S01",
  );
  // The panel goes through its loading state after an approval, and reading
  // between the two renders publishes an empty totals line — which is what the
  // first real run of this scenario did. Wait for the panel to have settled AND
  // for the edge to be drawn, then read.
  const settledAfterApproval = await waitUntil(
    () =>
      crossTotals().length > 0 &&
      crossEdges().filter((edge) => edge.kind === "established").length >
        establishedEdgesBefore,
    8_000,
  );
  evidence.step12_approvedExactly = {
    approvedCountAfter: afterApproval.approvedCount,
    pendingCountAfter: afterApproval.pendingSuggestionCount,
    movedByExactlyOne:
      afterApproval.approvedCount === beforeApproval.approvedCount + 1 &&
      afterApproval.pendingSuggestionCount === beforeApproval.pendingSuggestionCount - 1,
    deterministicUnchanged:
      afterApproval.deterministicCount === beforeApproval.deterministicCount,
    approvedRelation: approvedEdge
      ? {
          sourceBrainId: approvedEdge.source.brainId,
          sourceKey: approvedEdge.source.key,
          targetBrainId: approvedEdge.target.brainId,
          targetKey: approvedEdge.target.key,
          relationType: approvedEdge.relationType,
          provenance: approvedEdge.provenance,
          ruleName: approvedEdge.ruleName,
          ruleVersion: approvedEdge.ruleVersion,
        }
      : null,
    // `M10` — the relation matches its suggestion exactly, and no rule was
    // invented for it.
    matchesTheSuggestion:
      approvedEdge?.source.key === s01Pending?.source.key &&
      approvedEdge?.target.key === s01Pending?.target.key &&
      approvedEdge?.relationType === s01Pending?.relationType,
    provenanceIsApproved: approvedEdge?.provenance === "APPROVED",
    noDeterministicRuleInvented:
      approvedEdge?.ruleName === null && approvedEdge?.ruleVersion === null,
    suggestionGoneFromPending: !afterApproval.pendingSuggestions.some(
      (entry) => entry.suggestionKey === "XB-S01",
    ),
    approveControlGone: crossApproveButton("XB-S01") === null,
    establishedEdgesAfter: crossEdges().filter((edge) => edge.kind === "established").length,
    suggestionEdgesAfter: crossEdges().filter((edge) => edge.kind === "suggestion").length,
    establishedEdgeAppeared:
      crossEdges().filter((edge) => edge.kind === "established").length >
      establishedEdgesBefore,
    panelSettledAfterApproval: settledAfterApproval.settled,
    crossTotalsAfter: crossTotals(),
    // `M10` — the count the PANEL shows moved with the store's, not on its own.
    outgoingIsOneAfter: crossTotals().startsWith("1 sortante"),
  };

  // --- 13. remove Gamma from the view --------------------------------------
  remove("brain-gamma");
  await settle();
  await waitForCompositionReady();
  evidence.step13_removeGamma = {
    displayedAfter: displayedBrainIds(),
    alphaAlone: JSON.stringify(displayedBrainIds()) === JSON.stringify(["brain-alpha"]),
    // Removing is an act of display: the store is untouched.
    storeAfterRemoval: {
      deterministic: (await invoke<CrossRelationsOverview>("map_cross_relations_open"))
        .deterministicCount,
      approved: (await invoke<CrossRelationsOverview>("map_cross_relations_open"))
        .approvedCount,
    },
  };

  // --- 14. select a source of a relation towards Gamma ---------------------
  select({ brainId: "brain-alpha", nodeId: sourceNodeId });
  await settle();
  await waitForCrossPanel(xbd01.targetKey);
  const offScreenEntry = crossEntries().find((entry) => entry.endpointKey === xbd01.targetKey);
  evidence.step14_sourceSelectedAlone = {
    activeDescendant: activeDescendant(),
    entryStillListed: offScreenEntry !== undefined,
    crossTotals: crossTotals(),
  };

  // --- 15. « Gamma — hors de la vue » --------------------------------------
  evidence.step15_offScreenIsSaid = {
    entryMarkedNotDisplayed: offScreenEntry?.displayed === false,
    panelSaysOffScreen: crossPanelText().includes("hors de la vue"),
    accessibleNameSaysOffScreen: (offScreenEntry?.label ?? "").includes("hors de la vue"),
    brainNamedInWords: crossPanelText().includes("Cerveau Gamma"),
    // The relation is still there in full — it did not become a suggestion or
    // a lesser thing because nobody is looking at its other end.
    provenance: offScreenEntry?.provenance ?? null,
    relationType: offScreenEntry?.relationType ?? null,
    // And no edge is drawn to a territory that is not on screen.
    crossEdgesDrawn: crossEdges().length,
    noEdgeToAnAbsentTerritory: crossEdges().every((edge) =>
      displayedBrainIds().includes(edge.to) && displayedBrainIds().includes(edge.from),
    ),
  };

  // --- 16. activate it BY A REAL KEYSTROKE ---------------------------------
  log("info", "M12.16: activation d'une relation hors vue par frappe reelle");
  if (!offScreenEntry) throw new Error("l'entree hors vue est absente du panneau");
  const beforeNavigation = await invoke<CrossRelationsOverview>("map_cross_relations_open");
  // Re-queried AFTER the await above, not reused from step 14.
  const navigateControl = await liveCrossEntry(xbd01.targetKey);
  const navigateKey = await pressRealKey(
    navigateControl,
    "{ENTER}",
    () => displayedBrainIds().includes("brain-gamma"),
    log,
    90_000,
    MARKER,
  );
  await settle();
  await waitForCompositionReady();
  await waitUntil(() => activeDescendant() === domNodeId("brain-gamma", targetNodeId), 10_000);
  const afterNavigation = await invoke<CrossRelationsOverview>("map_cross_relations_open");
  evidence.step16_navigateByKey = {
    keydownIsTrusted: navigateKey.keydownIsTrusted,
    activationIsTrusted: navigateKey.activationIsTrusted,
    programmaticClickCalls: navigateKey.programmaticClickCalls,
    programmaticClickDispatches: navigateKey.programmaticClickDispatches,
    noProgrammaticActivationUsed:
      navigateKey.programmaticClickCalls === 0 &&
      navigateKey.programmaticClickDispatches === 0,
    observedChange: navigateKey.observedChange,
  };

  // --- 17. Gamma added, target selected, Gamma focused ---------------------
  const catalogAfterNavigation = await invoke<{ activeBrainId: string }>("map_brains");
  evidence.step17_navigationLanded = {
    displayedAfter: displayedBrainIds(),
    gammaAddedAutomatically: displayedBrainIds().includes("brain-gamma"),
    // §4.1 rule 1 — catalogue order, never the order things were added in.
    inCatalogueOrder:
      JSON.stringify(displayedBrainIds()) === JSON.stringify(["brain-alpha", "brain-gamma"]),
    activeDescendant: activeDescendant(),
    expectedActiveDescendant: domNodeId("brain-gamma", targetNodeId),
    exactEndpointSelected: activeDescendant() === domNodeId("brain-gamma", targetNodeId),
    focusedBrainId: focusedChipBrainId(),
    gammaIsFocused: focusedChipBrainId() === "brain-gamma",
    activeBrainId: catalogAfterNavigation.activeBrainId,
    // The whole point: a navigation creates, modifies and approves NOTHING.
    deterministicBefore: beforeNavigation.deterministicCount,
    deterministicAfter: afterNavigation.deterministicCount,
    approvedBefore: beforeNavigation.approvedCount,
    approvedAfter: afterNavigation.approvedCount,
    pendingBefore: beforeNavigation.pendingSuggestionCount,
    pendingAfter: afterNavigation.pendingSuggestionCount,
    navigationCreatedNothing:
      afterNavigation.deterministicCount === beforeNavigation.deterministicCount &&
      afterNavigation.approvedCount === beforeNavigation.approvedCount &&
      afterNavigation.pendingSuggestionCount === beforeNavigation.pendingSuggestionCount &&
      afterNavigation.deterministicDigest === beforeNavigation.deterministicDigest,
    status: statusText(),
  };

  // --- 18. add Bêta → C3 ---------------------------------------------------
  log("info", "M12.18: ajout de Beta par frappe reelle");
  const addBeta = await addByRealKey("brain-beta", log, MARKER, keyFailures);
  await settle();
  await waitForCompositionReady();
  evidence.step18_c3 = {
    keydownIsTrusted: addBeta.choose.keydownIsTrusted,
    activationIsTrusted: addBeta.choose.activationIsTrusted,
    displayedAfter: displayedBrainIds(),
    isC3:
      JSON.stringify(displayedBrainIds()) ===
      JSON.stringify(["brain-alpha", "brain-beta", "brain-gamma"]),
    territories: territoryBrainIds(),
    canvases: canvasCount(),
    singleCanvas: canvasCount() === 1,
  };

  // --- 19. the Alpha/Bêta and Bêta/Gamma relations -------------------------
  await waitUntil(
    () =>
      crossEdges().some((edge) => edge.from === "brain-alpha" && edge.to === "brain-beta") &&
      crossEdges().some((edge) => edge.from === "brain-beta" && edge.to === "brain-gamma"),
    10_000,
  );
  const c3Edges = crossEdges();
  const pairs = c3Edges.map((edge) => `${edge.from}→${edge.to}`);
  evidence.step19_pairsInC3 = {
    crossEdgesDrawn: c3Edges.length,
    pairs: [...new Set(pairs)].sort(),
    alphaToBeta: c3Edges.some(
      (edge) => edge.from === "brain-alpha" && edge.to === "brain-beta",
    ),
    betaToGamma: c3Edges.some(
      (edge) => edge.from === "brain-beta" && edge.to === "brain-gamma",
    ),
    gammaToBeta: c3Edges.some(
      (edge) => edge.from === "brain-gamma" && edge.to === "brain-beta",
    ),
    everyEdgeJoinsTwoBrains: c3Edges.every((edge) => edge.from !== edge.to),
    crossEdgesDrawnInsideOneBrain: c3Edges.filter((edge) => edge.from === edge.to).length,
    intraEdgesLeavingTheirBrain: intraEdges().filter((edge) => edge.from !== edge.to).length,
  };

  // --- 20. no inverse was invented -----------------------------------------
  const checkBeforeRebuild = await invoke<CrossRelationsSelfCheck>(
    "map_cross_relations_self_check",
  );
  evidence.step20_noInverses = {
    inventedInverses: checkBeforeRebuild.inventedInverses,
    noInverseInvented: checkBeforeRebuild.inventedInverses.length === 0,
    sameBrainRelations: checkBeforeRebuild.sameBrainRelations,
    suggestionsInEstablished: checkBeforeRebuild.suggestionsInEstablished,
    allRejected: checkBeforeRebuild.allRejected,
    rejections: checkBeforeRebuild.rejections,
    countsAgree: checkBeforeRebuild.countsAgree,
    countsMismatched: checkBeforeRebuild.counts.filter((entry) => !entry.matches),
    replayStable: checkBeforeRebuild.replayStable,
    approvedSinceSeed: checkBeforeRebuild.approvedSinceSeed,
  };

  // --- 21. rebuild Alpha, Gamma, Bêta --------------------------------------
  log("info", "M12.21: reconstruction des trois index");
  const rebuilds: unknown[] = [];
  for (const brainId of ["brain-alpha", "brain-gamma", "brain-beta"]) {
    const report = await invoke<{ indexPath: string; rebuilt: boolean; nodeCount: number }>(
      "map_open",
      { brainId, rebuild: true },
    );
    rebuilds.push({
      brainId,
      rebuilt: report.rebuilt,
      indexPath: report.indexPath,
      nodeCount: report.nodeCount,
    });
  }
  evidence.step21_rebuild = { rebuilds };

  // --- 22. everything persisted and resolved -------------------------------
  const afterRebuild = await invoke<CrossRelationsOverview>("map_cross_relations_open");
  const checkAfterRebuild = await invoke<CrossRelationsSelfCheck>(
    "map_cross_relations_self_check",
  );
  evidence.step22_afterRebuild = {
    storePath: afterRebuild.storePath,
    // The common store is not under any `map/`, which is what a rebuild wipes.
    storeSurvived: afterRebuild.storePath === "brains/interbrain/relations.sqlite",
    deterministicCount: afterRebuild.deterministicCount,
    approvedCount: afterRebuild.approvedCount,
    pendingSuggestionCount: afterRebuild.pendingSuggestionCount,
    deterministicIdentical: afterRebuild.deterministicCount === 6,
    digestBefore: opened.deterministicDigest,
    digestAfter: afterRebuild.deterministicDigest,
    digestUnchanged: afterRebuild.deterministicDigest === opened.deterministicDigest,
    approvedSurvived: afterRebuild.approvedCount === 1,
    xbS01StillApproved: afterRebuild.established.some(
      (edge) => edge.suggestionKey === "XB-S01" && edge.provenance === "APPROVED",
    ),
    suggestionsSurvived: afterRebuild.pendingSuggestionCount === 3,
    unresolvedEndpoints: afterRebuild.unresolvedEndpoints,
    everyEndpointResolved: afterRebuild.unresolvedEndpoints.length === 0,
    everyRelationStillJoinsTwoBrains: afterRebuild.established.every(
      (edge) => edge.source.brainId !== edge.target.brainId,
    ),
    // Not one relation changed brain across the rebuild.
    endpointBrains: afterRebuild.established.map(
      (edge) => `${edge.source.brainId}→${edge.target.brainId}`,
    ),
    selfCheckCountsAgree: checkAfterRebuild.countsAgree,
    selfCheckUnresolved: checkAfterRebuild.unresolvedEndpoints,
  };

  evidence.step23_close =
    "fermeture reelle: hors de la page, par scripts/m12-run-real-host.ps1";

  return evidence;
}

/* --- pass 2: steps 24 to 28 ------------------------------------------------ */

async function secondPass(
  deps: CrossScenarioDeps,
  evidence: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const { invoke } = deps;
  const ready = await waitForCompositionReady();
  const overview = await invoke<CrossRelationsOverview>("map_cross_relations_open");
  const frozen = await invoke<FrozenCrossReference[]>("map_cross_relations_frozen");
  const check = await invoke<CrossRelationsSelfCheck>("map_cross_relations_self_check");
  const displayed = displayedBrainIds();

  const eachFrozen = frozen.map((reference) => ({
    reference: reference.reference,
    present: overview.established.some(
      (edge) =>
        edge.source.key === reference.sourceKey &&
        edge.target.key === reference.targetKey &&
        edge.provenance === "DETERMINISTIC" &&
        edge.ruleName === reference.ruleName &&
        edge.ruleVersion === reference.ruleVersion,
    ),
  }));

  // Step 28's material, derived once from `runArtifacts.ts` — the module that
  // spells the destinations and mirrors the Rust write gate. Reserve `X8`: no
  // task name and no protected-name count is written down here.
  const ownership = runtimeWriteOwnership();
  const writtenArtefact = m12Artifact(2, "written");
  const writtenArtefactTaskId = artifactTaskId(writtenArtefact);
  const artefactBelongsToOwningTask =
    writtenArtefactTaskId !== null && writtenArtefactTaskId === ownership.owningTaskId;

  return Object.assign(evidence, {
    steps: "M12.24 a M12.28 — apres une fermeture et un redemarrage reels",
    compositionReady: ready,

    // 24 — the common store persisted, in the same place.
    step24_storePersisted: {
      storePath: overview.storePath,
      storeIsCommon: overview.storePath === "brains/interbrain/relations.sqlite",
      schemaVersion: overview.schemaVersion,
      endpointKeyScheme: overview.endpointKeyScheme,
      // Seeding on this start created nothing: everything was already there.
      seededOnThisStart: overview.seeded,
      seedCreatedNothing: overview.seeded === 0,
    },

    // 25 — XB-S01 is still APPROVED, and still exactly one relation.
    step25_approvalPersisted: {
      approvedCount: overview.approvedCount,
      xbS01IsApproved: overview.established.some(
        (edge) => edge.suggestionKey === "XB-S01" && edge.provenance === "APPROVED",
      ),
      xbS01NotPendingAgain: !overview.pendingSuggestions.some(
        (entry) => entry.suggestionKey === "XB-S01",
      ),
      pendingSuggestionCount: overview.pendingSuggestionCount,
      exactlyOneApproved: overview.approvedCount === 1,
    },

    // 26 — the six deterministic relations, identical.
    step26_deterministicIdentical: {
      deterministicCount: overview.deterministicCount,
      sixDeterministic: overview.deterministicCount === 6,
      eachFrozenRelationPresent: eachFrozen,
      allSixPresent: eachFrozen.every((entry) => entry.present),
      deterministicDigest: overview.deterministicDigest,
      replayStable: check.replayStable,
      inventedInverses: check.inventedInverses,
      unresolvedEndpoints: check.unresolvedEndpoints,
      countsAgree: check.countsAgree,
      sameBrainRelations: check.sameBrainRelations,
    },

    // 27 — no multi-brain composition is claimed to have persisted.
    step27_compositionIsNotPersisted: {
      displayedBrainIds: displayed,
      singleBrainOnStart: displayed.length === 1,
      canvases: canvasCount(),
      territories: territoryBrainIds(),
      focusedBrainId: focusedChipBrainId(),
      // Declared in advance, and confirmed rather than discovered: composition
      // persistence is out of scope — `P-19` — and `TASK-0020` claims none.
      composedViewPersistence: "non implementee dans TASK-0020 — P-19",
      noMultiBrainCompositionClaimed: displayed.length === 1,
    },

    // 28 — no historical evidence was modified. The runtime cannot: the write
    // gate refuses every protected name before touching the disk, and the only
    // names this process spells as destinations are its own task's.
    //
    // Both facts are *read off* `runArtifacts.ts` rather than restated here —
    // reserve `X8`. The previous version compared the artefact it had just
    // written against a hard-coded task prefix, and stated the size of the
    // protected list as a literal. The destinations had since migrated to
    // another task and the list had grown twice, so the step published a false
    // verdict and a stale count. Nothing below names a task or a number.
    step28_historicalEvidenceUntouched: {
      artefactWritten: writtenArtefact,
      artefactTaskId: writtenArtefactTaskId,
      runtimeOwningTaskId: ownership.owningTaskId,
      artefactBelongsToOwningTask: artefactBelongsToOwningTask,
      runtimeDestinationCount: ownership.runtimeDestinationCount,
      taskIdsWritten: ownership.taskIdsWritten,
      writesUnderItsOwnTaskOnly:
        ownership.writesUnderItsOwnTaskOnly && artefactBelongsToOwningTask,
      protectedArtifactCount: ownership.protectedArtifactCount,
      protectedTaskIds: ownership.protectedTaskIds,
      protectedDestinations: ownership.protectedDestinations,
      noProtectedDestination: ownership.protectedDestinations.length === 0,
      protectedNamesNeverWritten: `map_write_run_artifact refuse les ${ownership.protectedArtifactCount} noms proteges avant tout acces disque`,
    },
  });
}

/**
 * Runs one pass of `M12` and writes its artefact.
 *
 * `pass` comes from the host — `FILETOPO_AUTO_CROSS=1` or `=2` — because only
 * the host knows whether this process is the one before the restart or the one
 * after it.
 */
export async function runCrossScenario(
  deps: CrossScenarioDeps,
  pass: 1 | 2,
): Promise<void> {
  const { invoke, host, setStatus, log } = deps;
  // Filled in place, so a throw still leaves behind everything gathered up to
  // the point of failure.
  const evidence: Record<string, unknown> = { pass };

  try {
    log("info", `M12: debut de la passe ${pass}`);
    if (pass === 1) {
      await firstPass(deps, evidence);
    } else {
      await secondPass(deps, evidence);
    }

    const written = await invoke<string>("map_write_run_artifact", {
      name: m12Artifact(pass, "written"),
      contents: JSON.stringify(
        {
          task: "TASK-0026",
          criterion: "M12",
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
    log("info", `M12: passe ${pass} terminee, artefact ecrit: ${written}`);
    setStatus(`Scénario M12 (passe ${pass}) écrit dans ${written}`);
  } catch (error) {
    // A failed pass is still a result, and it is written down.
    log("error", `M12: passe ${pass} interrompue: ${String(error)}`);
    setStatus(`Scénario M12 interrompu : ${String(error)}`);
    try {
      await invoke<string>("map_write_run_artifact", {
        name: m12Artifact(pass, "abandoned"),
        contents: JSON.stringify(
          {
            task: "TASK-0026",
            criterion: "M12",
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
