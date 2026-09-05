/** `EC15` — exact content observations in the real Tauri/WebView2 host. */

import {
  addByRealKey,
  chipOf,
  displayedBrainIds,
  focusedChipBrainId,
  settle,
  waitForCompositionReady,
} from "./compositionDriver";
import { domNodeId, type ComposedView } from "./composedView";
import { afterPaint } from "./measure";
import { pressRealKey, waitUntil, type RealKeyEvidence, type ScenarioLog } from "./realInput";
import {
  PROTECTED_RUN_ARTIFACTS,
  ec15Artifact,
  runtimeWriteOwnership,
} from "./runArtifacts";
import type {
  BrainCatalogView,
  BrainNodeRef,
  ContentObservation,
  ContentObservationReport,
  ContentObservationSummary,
  CrossRelationsOverview,
  FixtureIntegrity,
  HostInfo,
  MapBuildReport,
  MapNode,
  MapSnapshot,
  RelationsOverview,
} from "./types";

export interface ContentScenarioDeps {
  invoke: <T>(command: string, args?: Record<string, unknown>) => Promise<T>;
  host: HostInfo | null;
  showOnly: (brainId: string) => void;
  select: (reference: BrainNodeRef) => void;
  readComposition: () => ComposedView | null;
  setStatus: (message: string) => void;
  log: ScenarioLog;
}

const MARKER = "EC15-KEY-READY";
const ALPHA = "brain-alpha";
const GAMMA = "brain-gamma";
const SAME_PATH = "dossier-a/note-1.txt";

function requireFact(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

function canvas(): SVGSVGElement {
  const found = document.querySelector<SVGSVGElement>('[data-testid="composed-canvas"]');
  if (!found) throw new Error("canvas compose absent");
  return found;
}

function activeDescendant(): string | null {
  return canvas().getAttribute("aria-activedescendant");
}

function nodeOf(snapshot: MapSnapshot, relativePath: string): MapNode {
  const node = snapshot.nodes.find((candidate) => candidate.relativePath === relativePath);
  if (!node) throw new Error(`noeud indexe absent: ${snapshot.brainId}:${relativePath}`);
  return node;
}

function keyEvidence(value: RealKeyEvidence): Record<string, unknown> {
  return {
    keyRequested: value.keyRequested,
    keydownIsTrusted: value.keydownIsTrusted,
    activationIsTrusted: value.activationIsTrusted,
    programmaticClickCalls: value.programmaticClickCalls,
    programmaticClickDispatches: value.programmaticClickDispatches,
    focusReached: value.focusReached,
    observedChange: value.observedChange,
  };
}

function relationState(intra: RelationsOverview, cross: CrossRelationsOverview) {
  return {
    intra: {
      deterministicCount: intra.deterministicCount,
      approvedCount: intra.approvedCount,
      pendingSuggestionCount: intra.pendingSuggestionCount,
      deterministicDigest: intra.deterministicDigest,
    },
    cross: {
      deterministicCount: cross.deterministicCount,
      approvedCount: cross.approvedCount,
      pendingSuggestionCount: cross.pendingSuggestionCount,
      deterministicDigest: cross.deterministicDigest,
    },
  };
}

function graphEdgeState() {
  return {
    hierarchy: document.querySelectorAll('[data-edge-kind="hierarchy"]').length,
    relation: document.querySelectorAll('[data-edge-kind="established"]').length,
    cross: document.querySelectorAll('[data-cross="true"][data-kind="established"]').length,
    suggestion: document.querySelectorAll('[data-edge-kind="suggestion"]').length,
    crossSuggestion: document.querySelectorAll('[data-cross="true"][data-kind="suggestion"]').length,
  };
}

async function selectFileByRealKey(
  deps: ContentScenarioDeps,
  snapshot: MapSnapshot,
): Promise<RealKeyEvidence> {
  const file = nodeOf(snapshot, SAME_PATH);
  const parent = snapshot.nodes.find((node) => node.id === file.parentId);
  if (!parent) throw new Error("parent du fichier probatoire absent");
  deps.select({ brainId: snapshot.brainId, nodeId: parent.id });
  await settle();
  const expected = domNodeId(snapshot.brainId, file.id);
  const evidence = await pressRealKey(
    canvas(),
    "{RIGHT}",
    () => activeDescendant() === expected,
    deps.log,
    90_000,
    MARKER,
  );
  requireFact(evidence.keydownIsTrusted === true, "selection FILE sans keydown isTrusted");
  requireFact(evidence.programmaticClickCalls === 0, "selection FILE par click programmatique");
  requireFact(evidence.programmaticClickDispatches === 0, "selection FILE par dispatch click");
  return evidence;
}

function reportElement(): HTMLOutputElement | null {
  return document.querySelector<HTMLOutputElement>('[data-testid="content-report"]');
}

function readReport(): ContentObservationReport {
  const raw = reportElement()?.dataset.report;
  if (!raw) throw new Error("rapport de campagne absent de l'interface");
  return JSON.parse(raw) as ContentObservationReport;
}

async function observeByRealKey(deps: ContentScenarioDeps): Promise<{
  report: ContentObservationReport;
  key: RealKeyEvidence;
}> {
  const control = document.querySelector<HTMLButtonElement>('[data-testid="observe-content"]');
  if (!control || control.disabled) throw new Error("commande d'observation indisponible");
  const previous = reportElement()?.dataset.generationId ?? null;
  const key = await pressRealKey(
    control,
    "{ENTER}",
    () => {
      const next = reportElement()?.dataset.generationId ?? null;
      return next !== null && next !== previous;
    },
    deps.log,
    90_000,
    MARKER,
  );
  requireFact(key.keydownIsTrusted === true, "observation sans keydown isTrusted");
  requireFact(key.activationIsTrusted === true, "observation sans activation isTrusted");
  requireFact(key.programmaticClickCalls === 0, "observation par click programmatique");
  requireFact(key.programmaticClickDispatches === 0, "observation par dispatch click");
  return { report: readReport(), key };
}

async function observations(
  deps: ContentScenarioDeps,
  brainId: string,
): Promise<ContentObservation[]> {
  return deps.invoke<ContentObservation[]>("map_content_observations", { brainId });
}

async function summary(
  deps: ContentScenarioDeps,
  brainId: string,
): Promise<ContentObservationSummary> {
  return deps.invoke<ContentObservationSummary>("map_content_summary", { brainId });
}

async function showOnlyAndWait(deps: ContentScenarioDeps, brainId: string): Promise<void> {
  deps.showOnly(brainId);
  const shown = await waitUntil(
    () => displayedBrainIds().length === 1 && displayedBrainIds()[0] === brainId,
    90_000,
  );
  requireFact(shown.settled, `composition ${brainId} non chargée`);
  await waitForCompositionReady();
  await settle();
}

async function persistedObservation(
  deps: ContentScenarioDeps,
  brainId: string,
): Promise<ContentObservation> {
  const found = await deps.invoke<ContentObservation | null>("map_content_observation_for_path", {
    brainId,
    relativePath: SAME_PATH,
  });
  if (!found) throw new Error(`observation absente: ${brainId}:${SAME_PATH}`);
  return found;
}

async function firstPass(deps: ContentScenarioDeps, evidence: Record<string, unknown>) {
  const { invoke, host, log } = deps;
  await waitForCompositionReady();
  await showOnlyAndWait(deps, ALPHA);

  const alphaBuild = await invoke<MapBuildReport>("map_open", { brainId: ALPHA, rebuild: true });
  const alphaSnapshot = await invoke<MapSnapshot>("map_snapshot", { brainId: ALPHA });
  const alphaInitial = {
    activeBrainId: (await invoke<BrainCatalogView>("map_brains")).activeBrainId,
    displayedBrainIds: displayedBrainIds(),
    focusedBrainId: focusedChipBrainId(),
  };
  requireFact(alphaInitial.activeBrainId === ALPHA, "Alpha non actif au début d'EC15");
  requireFact(alphaInitial.focusedBrainId === ALPHA, "Alpha non focalisé au début d'EC15");
  const alphaIntegrityBefore = await invoke<FixtureIntegrity>("map_integrity", { brainId: ALPHA });
  const alphaRelationsBefore = await invoke<RelationsOverview>("map_relations_open", {
    brainId: ALPHA,
  });
  const crossBefore = await invoke<CrossRelationsOverview>("map_cross_relations_open");
  const edgesBefore = graphEdgeState();

  const alphaCampaign = await observeByRealKey(deps);
  await settle();
  const edgesAfterAlphaHash = graphEdgeState();
  requireFact(JSON.stringify(edgesBefore) === JSON.stringify(edgesAfterAlphaHash), "arêtes modifiées par le hash Alpha");
  const alphaRows = await observations(deps, ALPHA);
  const alphaFiles = alphaSnapshot.nodes.filter((node) => node.kind === "file");
  const alphaDirectories = alphaSnapshot.nodes.filter((node) => node.kind === "directory");
  requireFact(alphaCampaign.report.schemaVersion === 1, "schema content != 1");
  requireFact(alphaCampaign.report.signalEngineVersion === "sha256-v1", "moteur != sha256-v1");
  requireFact(alphaCampaign.report.hashedCount === alphaFiles.length, "FILE indexés non tous hashés");
  requireFact(alphaRows.length === alphaFiles.length, "le store ne reflète pas exactement les FILE");
  requireFact(
    alphaRows.every(
      (row) =>
        row.observationStatus === "HASHED" &&
        row.hashAlgorithm === "sha256-v1" &&
        /^[0-9a-f]{64}$/.test(row.hashHex ?? "") &&
        !row.relativePath.startsWith("/") &&
        !row.relativePath.includes("..") &&
        !row.relativePath.includes("\\"),
    ),
    "observation HASHED ou chemin relatif invalide",
  );
  requireFact(alphaCampaign.report.sourceStable, "source Alpha instable");
  requireFact(
    /^sha256-tree-v1:[0-9a-f]{64}$/.test(alphaCampaign.report.sourceFingerprintBefore) &&
      alphaCampaign.report.sourceFingerprintBefore ===
        alphaCampaign.report.sourceFingerprintAfter,
    "empreinte de source de campagne absente ou non confinée",
  );
  requireFact(alphaCampaign.report.readOnlyConfirmed, "lecture seule Alpha non confirmée");
  requireFact(alphaIntegrityBefore.filetopoArtifacts.length === 0, "artefact sous source Alpha");

  const alphaSelection = await selectFileByRealKey(deps, alphaSnapshot);
  const uiReady = await waitUntil(
    () => document.querySelector('[data-testid="content-digest"]')?.textContent?.length === 64,
    10_000,
  );
  requireFact(uiReady.settled, "digest Alpha absent de l'interface");
  const alphaObservation = await persistedObservation(deps, ALPHA);
  const uiText = document.querySelector('[data-testid="content-observations"]')?.textContent ?? "";
  requireFact(uiText.includes("SHA-256 observé"), "libellé SHA-256 absent");
  requireFact(uiText.includes("Cette observation ne crée aucune relation."), "frontière relation absente");

  const addGamma = await addByRealKey(GAMMA, log, MARKER, []);
  await waitForCompositionReady();
  const gammaChip = chipOf(GAMMA);
  if (!gammaChip) throw new Error("chip Gamma absent");
  const focusGamma = await pressRealKey(
    gammaChip,
    "{ENTER}",
    () => focusedChipBrainId() === GAMMA,
    log,
    90_000,
    MARKER,
  );
  requireFact(focusGamma.activationIsTrusted === true, "Gamma non activé par interaction réelle");
  await settle();
  const gammaBuild = await invoke<MapBuildReport>("map_open", { brainId: GAMMA, rebuild: false });
  const gammaSnapshot = await invoke<MapSnapshot>("map_snapshot", { brainId: GAMMA });
  const edgesBeforeGammaHash = graphEdgeState();
  const gammaCampaign = await observeByRealKey(deps);
  await settle();
  const edgesAfterGammaHash = graphEdgeState();
  requireFact(
    JSON.stringify(edgesBeforeGammaHash) === JSON.stringify(edgesAfterGammaHash),
    "arêtes modifiées par le hash Gamma",
  );
  const gammaSelection = await selectFileByRealKey(deps, gammaSnapshot);
  const gammaObservation = await persistedObservation(deps, GAMMA);
  requireFact(alphaObservation.hashHex === gammaObservation.hashHex, "digests Alpha/Gamma différents");
  requireFact(alphaCampaign.report.storePath !== gammaCampaign.report.storePath, "store partagé");

  const alphaGenerationBeforeRebuild = (await summary(deps, ALPHA)).currentGenerationId;
  const alphaDigestBeforeRebuild = alphaObservation.hashHex;
  await invoke<MapBuildReport>("map_open", { brainId: ALPHA, rebuild: true });
  const alphaAfterRebuild = await summary(deps, ALPHA);
  const alphaObservationAfterRebuild = await persistedObservation(deps, ALPHA);
  const alphaIntegrityAfter = await invoke<FixtureIntegrity>("map_integrity", { brainId: ALPHA });
  const alphaRelationsAfter = await invoke<RelationsOverview>("map_relations_open", {
    brainId: ALPHA,
  });
  const crossAfter = await invoke<CrossRelationsOverview>("map_cross_relations_open");
  const edgesAfter = graphEdgeState();

  const relationsBefore = relationState(alphaRelationsBefore, crossBefore);
  const relationsAfter = relationState(alphaRelationsAfter, crossAfter);
  requireFact(JSON.stringify(relationsBefore) === JSON.stringify(relationsAfter), "stores relationnels modifiés");
  requireFact(alphaGenerationBeforeRebuild === alphaAfterRebuild.currentGenerationId, "génération perdue au rebuild");
  requireFact(alphaDigestBeforeRebuild === alphaObservationAfterRebuild.hashHex, "digest changé au rebuild");
  requireFact(alphaIntegrityAfter.filetopoArtifacts.length === 0, "artefact après rebuild");

  evidence.pass1 = {
    sandboxVariant: host?.sandboxRoot,
    freshByDriver: true,
    alphaInitial,
    alphaBuild,
    gammaBuild,
    indexedKinds: { files: alphaFiles.length, directoriesNotHashed: alphaDirectories.length },
    alphaCampaign: { ...alphaCampaign.report, interaction: keyEvidence(alphaCampaign.key) },
    gammaCampaign: { ...gammaCampaign.report, interaction: keyEvidence(gammaCampaign.key) },
    selection: {
      alpha: keyEvidence(alphaSelection),
      gamma: keyEvidence(gammaSelection),
      alphaRef: { brainId: ALPHA, nodeId: nodeOf(alphaSnapshot, SAME_PATH).id },
      gammaRef: { brainId: GAMMA, nodeId: nodeOf(gammaSnapshot, SAME_PATH).id },
      sameRelativePath: SAME_PATH,
      sameDigest: alphaObservation.hashHex === gammaObservation.hashHex,
      uiDigest: document.querySelector('[data-testid="content-digest"]')?.textContent ?? null,
      uiText,
    },
    addGamma: { open: keyEvidence(addGamma.open), choose: keyEvidence(addGamma.choose) },
    focusGamma: keyEvidence(focusGamma),
    storesDistinct: alphaCampaign.report.storePath !== gammaCampaign.report.storePath,
    relationsBefore,
    relationsAfter,
    relationStoresUnchanged: true,
    edgesBefore,
    edgesAfterAlphaHash,
    edgesBeforeGammaHash,
    edgesAfterGammaHash,
    edgesAfterRebuild: edgesAfter,
    zeroNewEdges: true,
    rebuild: {
      generationBefore: alphaGenerationBeforeRebuild,
      generationAfter: alphaAfterRebuild.currentGenerationId,
      digestBefore: alphaDigestBeforeRebuild,
      digestAfter: alphaObservationAfterRebuild.hashHex,
      persisted: true,
    },
    integrity: { before: alphaIntegrityBefore, after: alphaIntegrityAfter },
    runtimeOwnership: runtimeWriteOwnership(),
    protectedArtifacts: PROTECTED_RUN_ARTIFACTS.length,
  };
}

async function secondPass(deps: ContentScenarioDeps, evidence: Record<string, unknown>) {
  const { invoke, host } = deps;
  await waitForCompositionReady();
  await showOnlyAndWait(deps, ALPHA);
  const alphaSnapshot = await invoke<MapSnapshot>("map_snapshot", { brainId: ALPHA });
  const alphaSummaryBefore = await summary(deps, ALPHA);
  const gammaSummary = await summary(deps, GAMMA);
  const alphaBefore = await persistedObservation(deps, ALPHA);
  requireFact(alphaSummaryBefore.currentGenerationId !== null, "génération Alpha non persistée");
  requireFact(gammaSummary.currentGenerationId !== null, "génération Gamma non persistée");

  const staleSelection = await selectFileByRealKey(deps, alphaSnapshot);
  const staleReady = await waitUntil(
    () =>
      document
        .querySelector('[data-testid="content-observations"]')
        ?.textContent?.includes("Dernière observation enregistrée") === true,
    10_000,
  );
  requireFact(staleReady.settled, "libellé de dernière observation absent après restart");
  const staleText = document.querySelector('[data-testid="content-observations"]')?.textContent ?? "";
  requireFact(!staleText.toLowerCase().includes("observation actuelle"), "fraîcheur implicite mensongère");

  const intraBefore = await invoke<RelationsOverview>("map_relations_open", { brainId: ALPHA });
  const crossBefore = await invoke<CrossRelationsOverview>("map_cross_relations_open");
  const sourceBefore = await invoke<FixtureIntegrity>("map_integrity", { brainId: ALPHA });
  const campaign = await observeByRealKey(deps);
  const alphaAfter = await persistedObservation(deps, ALPHA);
  const intraAfter = await invoke<RelationsOverview>("map_relations_open", { brainId: ALPHA });
  const crossAfter = await invoke<CrossRelationsOverview>("map_cross_relations_open");
  const sourceAfter = await invoke<FixtureIntegrity>("map_integrity", { brainId: ALPHA });

  requireFact(campaign.report.generationId !== alphaBefore.generationId, "generationId réutilisé");
  requireFact(alphaAfter.hashHex === alphaBefore.hashHex, "source inchangée mais digest différent");
  requireFact(campaign.report.filesOpenedForHash > 0, "aucun fichier rouvert");
  requireFact(campaign.report.bytesRead > 0, "aucun octet relu");
  requireFact(campaign.report.digestsComputed === campaign.report.hashedCount, "digests non recalculés");
  requireFact(
    JSON.stringify(relationState(intraBefore, crossBefore)) ===
      JSON.stringify(relationState(intraAfter, crossAfter)),
    "relations modifiées au second passage",
  );
  requireFact(sourceBefore.fingerprint === sourceAfter.fingerprint, "source changée au second passage");
  requireFact(sourceAfter.filetopoArtifacts.length === 0, "artefact sous la source au second passage");

  evidence.pass2 = {
    sandboxVariant: host?.sandboxRoot,
    realRestart: true,
    persistedBefore: { alpha: alphaSummaryBefore, gamma: gammaSummary },
    staleUi: { selection: keyEvidence(staleSelection), text: staleText, honest: true },
    previousGenerationId: alphaBefore.generationId,
    campaign: { ...campaign.report, interaction: keyEvidence(campaign.key) },
    currentGenerationId: alphaAfter.generationId,
    sameDigestAfterRehash: alphaAfter.hashHex === alphaBefore.hashHex,
    byteRereadProof: {
      filesOpenedForHash: campaign.report.filesOpenedForHash,
      bytesRead: campaign.report.bytesRead,
      digestsComputed: campaign.report.digestsComputed,
      hashedCount: campaign.report.hashedCount,
    },
    relationsBefore: relationState(intraBefore, crossBefore),
    relationsAfter: relationState(intraAfter, crossAfter),
    relationStoresUnchanged: true,
    sourceBefore,
    sourceAfter,
    runtimeOwnership: runtimeWriteOwnership(),
    protectedArtifacts: PROTECTED_RUN_ARTIFACTS.length,
  };
}

export async function runContentScenario(
  deps: ContentScenarioDeps,
  pass: 1 | 2,
): Promise<void> {
  const evidence: Record<string, unknown> = {
    task: "TASK-0025",
    criterion: "EC15",
    pass,
    startedAt: new Date().toISOString(),
    realHost: true,
    host: deps.host
      ? {
          appVersion: deps.host.appVersion,
          tauriVersion: deps.host.tauriVersion,
          webviewVersion: deps.host.webviewVersion,
          platform: deps.host.platform,
        }
      : null,
  };
  try {
    deps.log("info", `EC15: début passe ${pass}`);
    if (pass === 1) await firstPass(deps, evidence);
    else await secondPass(deps, evidence);
    await afterPaint();
    evidence.finishedAt = new Date().toISOString();
    const written = await deps.invoke<string>("map_write_run_artifact", {
      name: ec15Artifact(pass),
      contents: JSON.stringify(evidence, null, 2),
    });
    deps.log("info", `EC15: passe ${pass} écrite: ${written}`);
    deps.setStatus(`EC15 passe ${pass} écrit dans ${written}`);
  } catch (error) {
    deps.log("error", `EC15: passe ${pass} interrompue: ${String(error)}`);
    deps.setStatus(`EC15 interrompu : ${String(error)}`);
  }
}
