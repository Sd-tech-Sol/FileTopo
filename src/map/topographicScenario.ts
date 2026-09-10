import { prepareScenarioIndex } from "./lifecycle";
/** `N15` — TASK-0022's topographic node graph in the real Tauri host. */

import {
  addByRealKey,
  canvasCount,
  displayedBrainIds,
  focusedChipBrainId,
  settle,
  territoryBrainIds,
  waitForCompositionReady,
} from "./compositionDriver";
import { domNodeId, type ComposedView } from "./composedView";
import { pressRealKey, waitUntil, type RealKeyEvidence, type ScenarioLog } from "./realInput";
import { n15Artifact } from "./runArtifacts";
import type {
  BrainCatalogView,
  BrainNodeRef,
  CrossRelationsOverview,
  FixtureIntegrity,
  FrozenCrossReference,
  HostInfo,
  MapBuildReport,
  MapOpenReport,
  MapNode,
  MapSnapshot,
  RelationsOverview,
} from "./types";
import type { View } from "./viewState";

export interface TopographicScenarioDeps {
  invoke: <T>(command: string, args?: Record<string, unknown>) => Promise<T>;
  host: HostInfo | null;
  showOnly: (brainId: string) => void;
  remove: (brainId: string) => void;
  select: (reference: BrainNodeRef) => void;
  readComposition: () => ComposedView | null;
  readView: () => View;
  setStatus: (message: string) => void;
  log: ScenarioLog;
}

const MARKER = "N15-KEY-READY";

function canvas(): SVGSVGElement {
  const found = document.querySelector<SVGSVGElement>('[data-testid="composed-canvas"]');
  if (!found) throw new Error("canvas topographique absent");
  return found;
}

function activeDescendant(): string | null {
  return canvas().getAttribute("aria-activedescendant");
}

function nodeOf(snapshot: MapSnapshot, path: string): MapNode {
  const node = snapshot.nodes.find((candidate) => candidate.relativePath === path);
  if (!node) throw new Error(`noeud absent: ${snapshot.brainId}:${path}`);
  return node;
}

function childrenOf(snapshot: MapSnapshot, parentId: number): MapNode[] {
  return snapshot.nodes.filter((node) => node.parentId === parentId);
}

function card(brainId: string, nodeId: number): SVGGElement | null {
  return document.querySelector<SVGGElement>(
    `[data-card="true"][data-brain-id="${brainId}"][data-node-id="${nodeId}"]`,
  );
}

function selectedLabel(): SVGTextElement | null {
  return document.querySelector<SVGTextElement>(".map-node__label--selected");
}

function finiteRect(node: MapNode): boolean {
  return [node.rect.x, node.rect.y, node.rect.w, node.rect.h].every(Number.isFinite);
}

function collisionCount(nodes: readonly MapNode[]): number {
  const columns = new Map<number, MapNode[]>();
  for (const node of nodes) {
    const column = columns.get(node.depth);
    if (column) column.push(node);
    else columns.set(node.depth, [node]);
  }
  let collisions = 0;
  for (const column of columns.values()) {
    column.sort((left, right) => left.rect.y - right.rect.y);
    for (let index = 1; index < column.length; index += 1) {
      if (column[index - 1].rect.y + column[index - 1].rect.h > column[index].rect.y) {
        collisions += 1;
      }
    }
  }
  return collisions;
}

function internalGeometry(snapshot: MapSnapshot): string {
  return JSON.stringify(
    snapshot.nodes.map((node) => [node.id, node.parentId, node.depth, node.rect]),
  );
}

function keyEvidence(evidence: RealKeyEvidence): Record<string, unknown> {
  return {
    keyRequested: evidence.keyRequested,
    keydownIsTrusted: evidence.keydownIsTrusted,
    keydownKey: evidence.keydownKey,
    activationIsTrusted: evidence.activationIsTrusted,
    programmaticClickCount: evidence.programmaticClickCalls,
    dispatchEventClickCount: evidence.programmaticClickDispatches,
    observedChange: evidence.observedChange,
    focusReached: evidence.focusReached,
  };
}

function relationLine(selector: string): SVGLineElement | null {
  return (
    document.querySelector<SVGGElement>(selector)?.querySelector<SVGLineElement>("line") ?? null
  );
}

function borderEvidence(
  edgeSelector: string,
  sourceBrainId: string,
  sourceNodeId: number,
  targetBrainId: string,
  targetNodeId: number,
): Record<string, unknown> {
  const line = relationLine(edgeSelector);
  const source = card(sourceBrainId, sourceNodeId);
  const target = card(targetBrainId, targetNodeId);
  if (!line || !source || !target) return { present: false, sourceOnBorder: false, targetOnBorder: false };
  const svgBox = canvas().getBoundingClientRect();
  const point = (x: string | null, y: string | null) => ({
    x: svgBox.left + Number(x),
    y: svgBox.top + Number(y),
  });
  const start = point(line.getAttribute("x1"), line.getAttribute("y1"));
  const end = point(line.getAttribute("x2"), line.getAttribute("y2"));
  const sourceBox = source.getBoundingClientRect();
  const targetBox = target.getBoundingClientRect();
  const onBorder = (value: { x: number; y: number }, box: DOMRect) => {
    const withinX = value.x >= box.left - 2 && value.x <= box.right + 2;
    const withinY = value.y >= box.top - 2 && value.y <= box.bottom + 2;
    const boundary = Math.min(
      Math.abs(value.x - box.left),
      Math.abs(value.x - box.right),
      Math.abs(value.y - box.top),
      Math.abs(value.y - box.bottom),
    );
    return withinX && withinY && boundary <= 2;
  };
  return {
    present: true,
    sourceOnBorder: onBorder(start, sourceBox),
    targetOnBorder: onBorder(end, targetBox),
    finite: [start.x, start.y, end.x, end.y].every(Number.isFinite),
    start,
    end,
  };
}

async function waitForActive(reference: BrainNodeRef): Promise<boolean> {
  return (
    await waitUntil(
      () => activeDescendant() === domNodeId(reference.brainId, reference.nodeId),
      10_000,
    )
  ).settled;
}

async function pressTree(
  reference: BrainNodeRef,
  sendKeys: string,
  log: ScenarioLog,
): Promise<Record<string, unknown>> {
  const evidence = await pressRealKey(
    canvas(),
    sendKeys,
    () => activeDescendant() === domNodeId(reference.brainId, reference.nodeId),
    log,
    90_000,
    MARKER,
  );
  return { ...keyEvidence(evidence), selected: activeDescendant(), expected: domNodeId(reference.brainId, reference.nodeId) };
}

function crossEntry(endpointKey: string): HTMLButtonElement | null {
  return document.querySelector<HTMLButtonElement>(
    `[data-cross-entry="true"][data-endpoint-key="${endpointKey}"]`,
  );
}

async function waitForCrossEntry(endpointKey: string): Promise<HTMLButtonElement> {
  await waitUntil(() => crossEntry(endpointKey)?.isConnected === true, 10_000);
  const entry = crossEntry(endpointKey);
  if (!entry) throw new Error(`entree intercerveaux absente: ${endpointKey}`);
  return entry;
}

async function firstPass(
  deps: TopographicScenarioDeps,
  evidence: Record<string, unknown>,
): Promise<void> {
  const { invoke, host, showOnly, remove, select, readComposition, readView, log } = deps;
  const keyFailures: unknown[] = [];
  evidence.steps = "N15.1 a N15.59";
  evidence.step1_freshVariant = { sandboxRoot: host?.sandboxRoot, freshByDriver: true };

  await waitForCompositionReady();
  showOnly("brain-alpha");
  await settle();
  const alphaReport = await prepareScenarioIndex(invoke, "brain-alpha", "map_rebuild");
  const alpha = await invoke<MapSnapshot>("map_snapshot", { brainId: "brain-alpha" });
  const alphaIntegrityBefore = await invoke<FixtureIntegrity>("map_integrity", {
    brainId: "brain-alpha",
  });
  select({ brainId: "brain-alpha", nodeId: alpha.rootId });
  await settle();
  evidence.step2_alphaActiveAlone = {
    displayedBrainIds: displayedBrainIds(),
    activeBrainId: (await invoke<BrainCatalogView>("map_brains")).activeBrainId,
    focusedBrainId: focusedChipBrainId(),
  };
  evidence.step3_to_8_alphaLayout = {
    schemaVersion: alpha.schemaVersion,
    reportSchemaVersion: alphaReport.schemaVersion,
    layoutAlgorithm: alpha.layoutAlgorithm,
    reportLayoutAlgorithm: alphaReport.layoutAlgorithm,
    layoutInvocations: alphaReport.layoutInvocations,
    nodeCount: alpha.nodeCount,
    plannedNodes: alphaReport.plannedNodes,
    hierarchyEdgeCount: document.querySelectorAll(
      '[data-edge-kind="hierarchy"][data-brain-id="brain-alpha"]',
    ).length,
    expectedHierarchyEdgeCount: alpha.nodeCount - 1,
    cardCount: document.querySelectorAll('[data-card="true"][data-brain-id="brain-alpha"]').length,
    everyCard240x64: alpha.nodes.every((node) => node.rect.w === 240 && node.rect.h === 64),
    allFinite: alpha.nodes.every(finiteRect),
    kinds: [...document.querySelectorAll<HTMLElement>('[data-card="true"][data-brain-id="brain-alpha"]')].map(
      (element) => element.dataset.nodeKind,
    ),
  };

  const folder = nodeOf(alpha, "dossier-a");
  const folderChildren = childrenOf(alpha, folder.id);
  evidence.step9_to_10_hierarchy = {
    folderRect: folder.rect,
    children: folderChildren.map((node) => ({ id: node.id, path: node.relativePath, parentId: node.parentId })),
    childContainedInParent: folderChildren.some(
      (node) =>
        node.rect.x >= folder.rect.x &&
        node.rect.x + node.rect.w <= folder.rect.x + folder.rect.w &&
        node.rect.y >= folder.rect.y &&
        node.rect.y + node.rect.h <= folder.rect.y + folder.rect.h,
    ),
    hierarchySamplesExact: ["dossier-a", "dossier-a/note-1.txt", "dossier-b/sous-dossier"].map(
      (path) => {
        const node = nodeOf(alpha, path);
        return { path, nodeId: node.id, parentId: node.parentId, depth: node.depth };
      },
    ),
  };

  const selectFolder = await pressTree({ brainId: "brain-alpha", nodeId: folder.id }, "{RIGHT}", log);
  evidence.step11_selectFolderByRealInteraction = selectFolder;
  const folderCard = card("brain-alpha", folder.id);
  evidence.step12_label = {
    visible: selectedLabel() !== null,
    renderedText: selectedLabel()?.textContent ?? null,
    fullName: selectedLabel()?.dataset.fullName ?? null,
    ariaLabel: folderCard?.getAttribute("aria-label") ?? null,
    title: folderCard?.querySelector("title")?.textContent ?? null,
  };

  const firstChild = folderChildren[0];
  const nextSibling = folderChildren[1];
  if (!firstChild || !nextSibling) throw new Error("dossier-a ne fournit pas deux enfants pour N15");
  evidence.step13_arrowRight = await pressTree(
    { brainId: "brain-alpha", nodeId: firstChild.id },
    "{RIGHT}",
    log,
  );
  evidence.step14_arrowDown = await pressTree(
    { brainId: "brain-alpha", nodeId: nextSibling.id },
    "{DOWN}",
    log,
  );
  evidence.step15_arrowUp = await pressTree(
    { brainId: "brain-alpha", nodeId: firstChild.id },
    "{UP}",
    log,
  );
  evidence.step16_arrowLeft = await pressTree(
    { brainId: "brain-alpha", nodeId: folder.id },
    "{LEFT}",
    log,
  );
  evidence.step17_refs = {
    activeDescendant: activeDescendant(),
    expected: domNodeId("brain-alpha", folder.id),
    namespaced: activeDescendant()?.includes("brain-alpha") === true,
  };

  const structuralBefore = { digest: alphaReport.reconstructibleDigest, geometry: internalGeometry(alpha) };
  const gestureEvidence: Record<string, unknown> = {};
  let beforeView = readView();
  const pan = await pressRealKey(
    canvas(),
    "%{RIGHT}",
    () => JSON.stringify(readView()) !== JSON.stringify(beforeView),
    log,
    90_000,
    MARKER,
  );
  gestureEvidence.pan = { ...keyEvidence(pan), before: beforeView, after: readView() };
  beforeView = readView();
  const zoom = await pressRealKey(
    canvas(),
    "{+}",
    () => readView().scale !== beforeView.scale,
    log,
    90_000,
    MARKER,
  );
  gestureEvidence.zoom = { ...keyEvidence(zoom), before: beforeView, after: readView() };
  beforeView = readView();
  const fit = await pressRealKey(
    canvas(),
    "f",
    () => JSON.stringify(readView()) !== JSON.stringify(beforeView),
    log,
    90_000,
    MARKER,
  );
  gestureEvidence.fit = { ...keyEvidence(fit), before: beforeView, after: readView() };
  beforeView = readView();
  const reset = await pressRealKey(
    canvas(),
    "r",
    () => JSON.stringify(readView()) !== JSON.stringify(beforeView),
    log,
    90_000,
    MARKER,
  );
  gestureEvidence.reset = { ...keyEvidence(reset), before: beforeView, after: readView() };
  const afterGestures = await invoke<MapSnapshot>("map_snapshot", { brainId: "brain-alpha" });
  evidence.step18_to_22_viewGestures = {
    ...gestureEvidence,
    structuralBefore,
    geometryAfter: internalGeometry(afterGestures),
    rectsUnchanged: structuralBefore.geometry === internalGeometry(afterGestures),
    layoutAlgorithmAfter: afterGestures.layoutAlgorithm,
  };

  const intra = await invoke<RelationsOverview>("map_relations_open", { brainId: "brain-alpha" });
  select({ brainId: "brain-alpha", nodeId: firstChild.id });
  await settle();
  await waitUntil(() => document.querySelector('[data-edge-kind="established"]') !== null, 8_000);
  const established = intra.established.find(
    (edge) => edge.source.nodeId !== null && edge.target.nodeId !== null,
  );
  if (!established || established.source.nodeId === null || established.target.nodeId === null) {
    throw new Error("relation intra etablie non resolue");
  }
  evidence.step23_to_25_intraRelations = {
    deterministicCount: intra.deterministicCount,
    approvedCount: intra.approvedCount,
    pendingSuggestionCount: intra.pendingSuggestionCount,
    establishedDrawn: document.querySelectorAll('[data-edge-kind="established"]').length,
    suggestionsDrawn: document.querySelectorAll('[data-edge-kind="suggestion"]').length,
    visuallyDistinct:
      document.querySelector(".map-edge--established") !== null &&
      document.querySelector(".map-edge--suggestion") !== null,
    anchor: borderEvidence(
      `[data-edge-kind="established"][data-source-node-id="${established.source.nodeId}"][data-target-node-id="${established.target.nodeId}"]`,
      "brain-alpha",
      established.source.nodeId,
      "brain-alpha",
      established.target.nodeId,
    ),
  };

  const addGamma = await addByRealKey("brain-gamma", log, MARKER, keyFailures);
  await settle();
  await waitForCompositionReady();
  const gamma = await invoke<MapSnapshot>("map_snapshot", { brainId: "brain-gamma" });
  const gammaIntegrityBefore = await invoke<FixtureIntegrity>("map_integrity", {
    brainId: "brain-gamma",
  });
  evidence.step26_to_29_gamma = {
    add: { open: keyEvidence(addGamma.open), choose: keyEvidence(addGamma.choose) },
    displayedBrainIds: displayedBrainIds(),
    canvasCount: canvasCount(),
    territories: territoryBrainIds(),
    sameInternalGeometry: internalGeometry(alpha) === internalGeometry(gamma),
    distinctNodeDom:
      card("brain-alpha", alpha.rootId)?.id !== card("brain-gamma", gamma.rootId)?.id,
    composition: readComposition(),
  };

  const frozen = await invoke<FrozenCrossReference[]>("map_cross_relations_frozen");
  const xbd01 = frozen.find((entry) => entry.reference === "XB-D01");
  if (!xbd01) throw new Error("XB-D01 absent");
  const source = nodeOf(alpha, "dossier-a/note-1.txt");
  const target = nodeOf(gamma, "dossier-b/note-1.txt");
  select({ brainId: "brain-alpha", nodeId: source.id });
  await settle();
  const followControl = await waitForCrossEntry(xbd01.targetKey);
  await waitUntil(() => document.querySelector('[data-cross="true"]') !== null, 10_000);
  evidence.step30_to_31_crossEdge = {
    entryPresent: followControl.isConnected,
    anchor: borderEvidence(
      `[data-cross="true"][data-source-node-id="${source.id}"][data-target-node-id="${target.id}"]`,
      "brain-alpha",
      source.id,
      "brain-gamma",
      target.id,
    ),
  };
  const follow = await pressRealKey(
    followControl,
    "{ENTER}",
    () => activeDescendant() === domNodeId("brain-gamma", target.id),
    log,
    90_000,
    MARKER,
  );
  evidence.step32_to_33_followCross = {
    ...keyEvidence(follow),
    selected: activeDescendant(),
    expected: domNodeId("brain-gamma", target.id),
  };

  select({ brainId: "brain-alpha", nodeId: source.id });
  await settle();
  evidence.step34_backAlpha = { selected: activeDescendant(), focusedBrainId: focusedChipBrainId() };
  remove("brain-gamma");
  await settle();
  await waitForCompositionReady();
  const hiddenControl = await waitForCrossEntry(xbd01.targetKey);
  evidence.step35_to_36_hiddenGamma = {
    displayedBrainIds: displayedBrainIds(),
    entryStillPresent: hiddenControl.isConnected,
    markedOffView: hiddenControl.dataset.endpointDisplayed === "false",
    accessibleName: hiddenControl.getAttribute("aria-label"),
  };
  const reveal = await pressRealKey(
    hiddenControl,
    "{ENTER}",
    () => displayedBrainIds().includes("brain-gamma"),
    log,
    90_000,
    MARKER,
  );
  await settle();
  await waitForActive({ brainId: "brain-gamma", nodeId: target.id });
  evidence.step37_revealGamma = {
    ...keyEvidence(reveal),
    displayedBrainIds: displayedBrainIds(),
    selected: activeDescendant(),
    expected: domNodeId("brain-gamma", target.id),
  };

  const addBeta = await addByRealKey("brain-beta", log, MARKER, keyFailures);
  await settle();
  await waitForCompositionReady();
  const beta = await invoke<MapSnapshot>("map_snapshot", { brainId: "brain-beta" });
  const betaIntegrityBefore = await invoke<FixtureIntegrity>("map_integrity", {
    brainId: "brain-beta",
  });
  const deepest = beta.nodes.reduce((left, right) => (right.depth > left.depth ? right : left));
  select({ brainId: "brain-beta", nodeId: deepest.id });
  await settle();
  const deepLabelSettled = await waitUntil(
    () => selectedLabel()?.dataset.fullName === deepest.name,
    10_000,
  );
  evidence.step38_to_46_beta = {
    add: { open: keyEvidence(addBeta.open), choose: keyEvidence(addBeta.choose) },
    displayedBrainIds: displayedBrainIds(),
    canvasCount: canvasCount(),
    territories: territoryBrainIds(),
    schemaVersion: beta.schemaVersion,
    layoutAlgorithm: beta.layoutAlgorithm,
    nodeCount: beta.nodeCount,
    hierarchyEdgeCount: document.querySelectorAll(
      '[data-edge-kind="hierarchy"][data-brain-id="brain-beta"]',
    ).length,
    expectedHierarchyEdgeCount: beta.nodeCount - 1,
    maxDepth: deepest.depth,
    deepestX: deepest.rect.x,
    exactDepthColumn: deepest.rect.x === deepest.depth * 360,
    selected: activeDescendant(),
    labelAvailable: selectedLabel()?.dataset.fullName === deepest.name,
    labelSettled: deepLabelSettled.settled,
    cardCollisionCount: collisionCount(beta.nodes),
  };

  const suggestionSource = nodeOf(alpha, "dossier-a/note-2.txt");
  select({ brainId: "brain-alpha", nodeId: suggestionSource.id });
  await settle();
  await waitUntil(() => document.querySelector('[data-cross-approve="XB-S01"]') !== null, 10_000);
  const crossBefore = await invoke<CrossRelationsOverview>("map_cross_relations_open");
  const approve = document.querySelector<HTMLButtonElement>('[data-cross-approve="XB-S01"]');
  if (!approve) throw new Error("controle XB-S01 absent");
  const approved = await pressRealKey(
    approve,
    "{ENTER}",
    () => document.querySelector('[data-cross-approve="XB-S01"]') === null,
    log,
    90_000,
    MARKER,
  );
  const crossApproved = await invoke<CrossRelationsOverview>("map_cross_relations_open");
  evidence.step47_to_48_approval = {
    ...keyEvidence(approved),
    approvedBefore: crossBefore.approvedCount,
    approvedAfter: crossApproved.approvedCount,
    pendingBefore: crossBefore.pendingSuggestionCount,
    pendingAfter: crossApproved.pendingSuggestionCount,
    movedExactlyOne:
      crossApproved.approvedCount === crossBefore.approvedCount + 1 &&
      crossApproved.pendingSuggestionCount === crossBefore.pendingSuggestionCount - 1,
    noFakeRule: crossApproved.established.some(
      (edge) =>
        edge.suggestionKey === "XB-S01" &&
        edge.provenance === "APPROVED" &&
        edge.ruleName === null &&
        edge.ruleVersion === null,
    ),
  };

  const readIntraState = async (brainId: string): Promise<Record<string, unknown>> => {
    try {
      const overview = await invoke<RelationsOverview>("map_relations_open", { brainId });
      return {
        available: true,
        deterministicCount: overview.deterministicCount,
        approvedCount: overview.approvedCount,
        pendingSuggestionCount: overview.pendingSuggestionCount,
        deterministicDigest: overview.deterministicDigest,
        unresolvedEndpoints: overview.unresolvedEndpoints,
      };
    } catch (error) {
      return { available: false, expectedOutOfScope: brainId === "brain-beta", error: String(error) };
    }
  };
  const intraBefore = new Map<string, Record<string, unknown>>();
  for (const brainId of ["brain-alpha", "brain-gamma", "brain-beta"]) {
    intraBefore.set(brainId, await readIntraState(brainId));
  }
  const rebuilds: MapBuildReport[] = [];
  for (const brainId of ["brain-alpha", "brain-gamma", "brain-beta"]) {
    rebuilds.push(await prepareScenarioIndex(invoke, brainId, "map_rebuild"));
  }
  const crossAfter = await invoke<CrossRelationsOverview>("map_cross_relations_open");
  const integrityAfter = await Promise.all(
    ["brain-alpha", "brain-gamma", "brain-beta"].map((brainId) =>
      invoke<FixtureIntegrity>("map_integrity", { brainId }),
    ),
  );
  const intraAfter: Record<string, unknown> = {};
  for (const brainId of ["brain-alpha", "brain-gamma", "brain-beta"]) {
    intraAfter[brainId] = { before: intraBefore.get(brainId), after: await readIntraState(brainId) };
  }
  evidence.step49_to_58_rebuild = {
    rebuilds: rebuilds.map((report) => ({
      brainId: report.brainId,
      schemaVersion: report.schemaVersion,
      layoutAlgorithm: report.layoutAlgorithm,
      layoutInvocations: report.layoutInvocations,
      digest: report.reconstructibleDigest,
    })),
    layoutDigestsDeterministic:
      rebuilds[0].reconstructibleDigest === rebuilds[1].reconstructibleDigest,
    intraStores: intraAfter,
    crossCountsBefore: {
      deterministic: crossApproved.deterministicCount,
      approved: crossApproved.approvedCount,
      pending: crossApproved.pendingSuggestionCount,
    },
    crossCountsAfter: {
      deterministic: crossAfter.deterministicCount,
      approved: crossAfter.approvedCount,
      pending: crossAfter.pendingSuggestionCount,
    },
    xbS01StillApproved: crossAfter.established.some(
      (edge) => edge.suggestionKey === "XB-S01" && edge.provenance === "APPROVED",
    ),
    deterministicSix: crossAfter.deterministicCount === 6,
    unresolvedEndpoints: crossAfter.unresolvedEndpoints,
    fingerprintsBefore: [alphaIntegrityBefore, gammaIntegrityBefore, betaIntegrityBefore].map(
      (entry) => ({ brainId: entry.brainId, fingerprint: entry.fingerprint }),
    ),
    fingerprintsAfter: integrityAfter.map((entry) => ({
      brainId: entry.brainId,
      fingerprint: entry.fingerprint,
    })),
    sourcesUnchanged: integrityAfter.every((entry, index) =>
      [alphaIntegrityBefore, gammaIntegrityBefore, betaIntegrityBefore][index].fingerprint ===
      entry.fingerprint,
    ),
    sourceArtifacts: integrityAfter.flatMap((entry) => entry.filetopoArtifacts),
    keyFailures,
  };
  evidence.step59_realClose = "performed by scripts/task0022-n15-run-real-host.ps1";
}

async function secondPass(
  deps: TopographicScenarioDeps,
  evidence: Record<string, unknown>,
): Promise<void> {
  const { invoke, host } = deps;
  await waitForCompositionReady();
  const catalog = await invoke<BrainCatalogView>("map_brains");
  const reports = await Promise.all(
    ["brain-alpha", "brain-gamma", "brain-beta"].map((brainId) =>
      invoke<MapOpenReport>("map_open", { brainId }),
    ),
  );
  const snapshots = await Promise.all(
    ["brain-alpha", "brain-gamma", "brain-beta"].map((brainId) =>
      invoke<MapSnapshot>("map_snapshot", { brainId }),
    ),
  );
  const cross = await invoke<CrossRelationsOverview>("map_cross_relations_open");
  const intra = await Promise.all(
    ["brain-alpha", "brain-gamma"].map((brainId) =>
      invoke<RelationsOverview>("map_relations_open", { brainId }),
    ),
  );
  evidence.steps = "N15.60 a N15.72";
  evidence.step60_to_65_restartAndIndexes = {
    newProcessByDriver: true,
    sameSandboxRoot: host?.sandboxRoot,
    webviewVersion: host?.webviewVersion,
    reports: reports.map((report) => ({
      brainId: report.brainId,
      state: report.state,
      schemaVersion: report.schemaVersion,
      sourceRead: report.sourceRead,
    })),
    snapshots: snapshots.map((snapshot) => ({
      brainId: snapshot.brainId,
      schemaVersion: snapshot.schemaVersion,
      layoutAlgorithm: snapshot.layoutAlgorithm,
    })),
    noUnexpectedRebuild: reports.every((report) => report.state === "OPENED_EXISTING" && !report.sourceRead),
  };
  evidence.step66_to_72_persistence = {
    activeBrainId: catalog.activeBrainId,
    displayedBrainIds: displayedBrainIds(),
    compositionPersistenceClaimed: false,
    compositionLimit: "P-19: multi-brain composition is session-only",
    xbS01StillApproved: cross.established.some(
      (edge) => edge.suggestionKey === "XB-S01" && edge.provenance === "APPROVED",
    ),
    deterministicCount: cross.deterministicCount,
    deterministicDigest: cross.deterministicDigest,
    intra: intra.map((overview, index) => ({
      brainId: ["brain-alpha", "brain-gamma"][index],
      deterministicCount: overview.deterministicCount,
      approvedCount: overview.approvedCount,
      pendingSuggestionCount: overview.pendingSuggestionCount,
      unresolvedEndpoints: overview.unresolvedEndpoints,
    })),
    betaRelationsRemainOutOfScope: true,
    unresolvedEndpoints: cross.unresolvedEndpoints,
    historicalEvidenceDestinationsUsed: [],
  };
}

export async function runTopographicScenario(
  deps: TopographicScenarioDeps,
  pass: 1 | 2,
): Promise<void> {
  const { invoke, host, setStatus, log } = deps;
  const evidence: Record<string, unknown> = {
          task: "TASK-0026",
    criterion: "N15",
    pass,
    startedAt: new Date().toISOString(),
    realHost: true,
    host: host
      ? {
          appVersion: host.appVersion,
          tauriVersion: host.tauriVersion,
          webviewVersion: host.webviewVersion,
          platform: host.platform,
          cardWidth: host.cardWidth,
          cardHeight: host.cardHeight,
          layoutAlgorithm: host.layoutAlgorithm,
        }
      : null,
  };
  try {
    log("info", `N15: debut passe ${pass}`);
    if (pass === 1) await firstPass(deps, evidence);
    else await secondPass(deps, evidence);
    evidence.finishedAt = new Date().toISOString();
    const written = await invoke<string>("map_write_run_artifact", {
      name: n15Artifact(pass, "written"),
      contents: JSON.stringify(evidence, null, 2),
    });
    log("info", `N15: passe ${pass} ecrite: ${written}`);
    setStatus(`Scénario N15 passe ${pass} écrit dans ${written}`);
  } catch (error) {
    evidence.failedAt = new Date().toISOString();
    evidence.error = String(error);
    log("error", `N15: passe ${pass} interrompue: ${String(error)}`);
    setStatus(`Scénario N15 interrompu : ${String(error)}`);
    try {
      await invoke<string>("map_write_run_artifact", {
        name: n15Artifact(pass, "abandoned"),
        contents: JSON.stringify(evidence, null, 2),
      });
    } catch (writeError) {
      log("error", `N15: abandon non ecrit: ${String(writeError)}`);
    }
  }
}
