/** TASK-0024/DR15 — real Tauri/WebView2 deterministic-rule proof. */

import { settle, waitForCompositionReady } from "./compositionDriver";
import { pressRealKey, waitUntil, type ScenarioLog } from "./realInput";
import { PROTECTED_RUN_ARTIFACTS, dr15Artifact, runtimeWriteOwnership } from "./runArtifacts";
import type {
  BrainCatalogView,
  BrainNodeRef,
  ContentObservationReport,
  CrossRelationsOverview,
  HostInfo,
  MapSnapshot,
  RelationEngineReport,
  RelationEngineStatus,
  RelationsOverview,
} from "./types";

const ALPHA = "brain-alpha";
const MARKER = "DR15-KEY-READY";

export interface DreScenarioDeps {
  invoke: <T>(command: string, args?: Record<string, unknown>) => Promise<T>;
  host: HostInfo | null;
  showOnly: (brainId: string) => void;
  select: (reference: BrainNodeRef) => void;
  setStatus: (message: string) => void;
  log: ScenarioLog;
  pass: 1 | 2;
}

function requireFact(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

function reportFromUi(): RelationEngineReport {
  const raw = document
    .querySelector<HTMLElement>('[data-testid="relation-engine-summary"]')
    ?.dataset.report;
  if (!raw) throw new Error("rapport dre-v1 absent de l'interface");
  return JSON.parse(raw) as RelationEngineReport;
}

function stableSets(overview: RelationsOverview) {
  return {
    deterministic: overview.established
      .filter((edge) => edge.provenance === "DETERMINISTIC" && edge.producer === "core-rule-engine")
      .map((edge) => `${edge.source.key}|${edge.target.key}|${edge.relationType}|${edge.ruleName}`)
      .sort(),
    approved: overview.established
      .filter((edge) => edge.provenance === "APPROVED")
      .map((edge) => `${edge.source.key}|${edge.target.key}|${edge.relationType}`)
      .sort(),
    pending: overview.pendingSuggestions.map((suggestion) => suggestion.suggestionKey).sort(),
  };
}

async function writeEvidence(deps: DreScenarioDeps, evidence: Record<string, unknown>) {
  const ownership = runtimeWriteOwnership();
  requireFact(PROTECTED_RUN_ARTIFACTS.length === 34, "X5 n'est plus exactement 34");
  requireFact(ownership.protectedDestinations.length === 0, "destination runtime protégée");
  requireFact(ownership.writesUnderItsOwnTaskOnly, "runtime hors TASK-0026");
  requireFact(ownership.owningTaskId === "TASK-0026", "propriétaire runtime inattendu");
  return deps.invoke<string>("map_write_run_artifact", {
    name: dr15Artifact(deps.pass),
    contents: JSON.stringify(
      {
        task: "TASK-0026",
        criterion: "DR15",
        pass: deps.pass,
        capturedAtIso: new Date().toISOString(),
        host: deps.host,
        input: {
          brainId: ALPHA,
          source: "synthetic TASK-0024 proof fixture outside the four frozen fixtures",
          noRealData: true,
        },
        governance: {
          protectedArtifactCount: PROTECTED_RUN_ARTIFACTS.length,
          protectedDestinations: ownership.protectedDestinations,
          writesUnderItsOwnTaskOnly: ownership.writesUnderItsOwnTaskOnly,
          owningTaskId: ownership.owningTaskId,
        },
        evidence,
      },
      null,
      2,
    ),
  });
}

async function passOne(deps: DreScenarioDeps) {
  deps.showOnly(ALPHA);
  await waitForCompositionReady();
  await deps.invoke("map_open", { brainId: ALPHA, rebuild: true });
  const snapshot = await deps.invoke<MapSnapshot>("map_snapshot", { brainId: ALPHA });
  deps.select({ brainId: ALPHA, nodeId: snapshot.nodes.find((node) => node.kind === "file")!.id });
  await settle();

  const catalog = await deps.invoke<BrainCatalogView>("map_brains");
  requireFact(catalog.activeBrainId === ALPHA, "Alpha non actif");
  const contentCampaign = await deps.invoke<ContentObservationReport>("map_content_observe", {
    brainId: ALPHA,
  });
  const initial = await deps.invoke<RelationEngineStatus>("map_relation_engine_status", {
    brainId: ALPHA,
  });
  requireFact(initial.inputState !== "CURRENT", "dre-v1 déjà CURRENT sur variante fraîche");
  const proofCampaign = await deps.invoke<ContentObservationReport>("map_task0024_dr15_prepare");
  requireFact(proofCampaign.sourceFingerprintBefore === proofCampaign.sourceFingerprintAfter,
    "source DR15 modifiée pendant la campagne");
  const crossBefore = await deps.invoke<CrossRelationsOverview>("map_cross_relations_open");

  const analyze = document.querySelector<HTMLButtonElement>('[data-testid="analyze-relations"]');
  requireFact(analyze && !analyze.disabled, "commande Analyser les relations indisponible");
  const key = await pressRealKey(
    analyze,
    "{ENTER}",
    () => document.querySelector('[data-testid="relation-engine-summary"]') !== null,
    deps.log,
    90_000,
    MARKER,
  );
  requireFact(key.keydownIsTrusted && key.activationIsTrusted, "activation DR15 non fiable");
  requireFact(key.programmaticClickCalls === 0 && key.programmaticClickDispatches === 0,
    "repli par clic programmatique interdit");
  const report = reportFromUi();
  requireFact(report.inputState === "CURRENT", "report dre-v1 non CURRENT");
  requireFact(report.rulesEvaluated.length === 2, "catalogue incomplet dans le report");
  requireFact(report.deterministicRelationsProduced >= 2, "relations identiques N-1 absentes");
  requireFact(report.suggestionsProduced >= 1, "suggestion revision absente");
  let overview = await deps.invoke<RelationsOverview>("map_relations_open", { brainId: ALPHA });
  const coreIdentical = overview.established.filter(
    (edge) => edge.ruleName === "core.identical-content" && edge.relationType === "content-identical",
  );
  const coreSuggestion = overview.pendingSuggestions.find(
    (suggestion) => suggestion.ruleName === "core.numbered-sibling-revision-candidate",
  );
  requireFact(coreIdentical.length === 2, "N-1 content-identical inattendu");
  requireFact(coreSuggestion, "suggestion DR15 absente du store");
  requireFact(!("score" in coreSuggestion), "score présent dans le DTO suggestion");
  // Waited for rather than sampled.
  //
  // The panel reads its own relations through a command, so it is one or more
  // round trips behind the overview this scenario just fetched. Sampling the
  // DOM at that instant was a measurement race — the same one `realInput`
  // documents for `J12` — and it fails as soon as anything else asks the host
  // a question in the same tick. Waiting does not weaken the criterion: the
  // assertion still fails if the rule never becomes visible.
  const ruleVisible = await waitUntil(
    () => document.querySelector('[data-testid="core-deterministic-relation"]') !== null,
    20_000,
  );
  requireFact(ruleVisible.settled, "règle déterministe non visible");
  const explanationVisible = await waitUntil(
    () => document.querySelector('[data-testid="core-suggestion-explanation"]') !== null,
    20_000,
  );
  requireFact(explanationVisible.settled, "explication/signaux suggestion non visibles");
  requireFact(!document.body.textContent?.toLowerCase().includes("score"), "score visible");

  const approveSelector =
    `[data-testid="approve-core-suggestion"][data-suggestion-key="${coreSuggestion.suggestionKey}"]`;
  const approveReady = await waitUntil(
    () => document.querySelector<HTMLButtonElement>(approveSelector)?.disabled === false,
    20_000,
  );
  const approve = document.querySelector<HTMLButtonElement>(approveSelector);
  requireFact(approveReady.settled && approve, "contrôle historique d'approbation absent");
  const approvalKey = await pressRealKey(
    approve,
    "{ENTER}",
    () => document.querySelector(
      `[data-testid="approve-core-suggestion"][data-suggestion-key="${coreSuggestion.suggestionKey}"]`,
    ) === null,
    deps.log,
    90_000,
    MARKER,
  );
  requireFact(approvalKey.keydownIsTrusted && approvalKey.activationIsTrusted,
    "approbation non fiable");
  requireFact(approvalKey.programmaticClickCalls === 0, "approbation programmatique");
  overview = await deps.invoke<RelationsOverview>("map_relations_open", { brainId: ALPHA });
  const afterApproval = stableSets(overview);
  requireFact(!afterApproval.pending.includes(coreSuggestion.suggestionKey),
    "suggestion approuvée encore pending");
  requireFact(overview.established.filter((edge) =>
    edge.provenance === "APPROVED" && edge.relationType === "revision").length >= 1,
    "relation APPROVED absente");
  const rerun = await deps.invoke<RelationEngineReport>("map_relation_engine_run", { brainId: ALPHA });
  const afterRerunOverview = await deps.invoke<RelationsOverview>("map_relations_open", {
    brainId: ALPHA,
  });
  const afterRerun = stableSets(afterRerunOverview);
  requireFact(JSON.stringify(afterRerun.deterministic) === JSON.stringify(afterApproval.deterministic),
    "set déterministe non idempotent");
  requireFact(JSON.stringify(afterRerun.approved) === JSON.stringify(afterApproval.approved),
    "relation approuvée perdue au rerun");
  requireFact(!afterRerun.pending.includes(coreSuggestion.suggestionKey),
    "suggestion approuvée recréée");
  const crossAfter = await deps.invoke<CrossRelationsOverview>("map_cross_relations_open");
  requireFact(crossAfter.deterministicDigest === crossBefore.deterministicDigest,
    "store cross-brain modifié");

  return writeEvidence(deps, {
    freshVariant: true,
    catalogActiveBrainId: catalog.activeBrainId,
    mapNodeCount: snapshot.nodeCount,
    contentCampaign,
    proofCampaign,
    initialStatus: initial,
    userActivation: key,
    approvalActivation: approvalKey,
    report,
    rerun,
    coreIdenticalCount: coreIdentical.length,
    approvedSuggestionKey: coreSuggestion.suggestionKey,
    afterApproval,
    afterRerun,
    crossDigestBefore: crossBefore.deterministicDigest,
    crossDigestAfter: crossAfter.deterministicDigest,
    sourceReadOnly: proofCampaign.readOnlyConfirmed,
    processClosedByHarness: true,
  });
}

async function passTwo(deps: DreScenarioDeps) {
  deps.showOnly(ALPHA);
  await waitForCompositionReady();
  const statusBefore = await deps.invoke<RelationEngineStatus>("map_relation_engine_status", {
    brainId: ALPHA,
  });
  requireFact(statusBefore.inputState === "CURRENT", "état dre-v1 non CURRENT après restart");
  const beforeOverview = await deps.invoke<RelationsOverview>("map_relations_open", { brainId: ALPHA });
  const before = stableSets(beforeOverview);
  requireFact(before.approved.length >= 1, "relation APPROVED non persistée");
  const crossBefore = await deps.invoke<CrossRelationsOverview>("map_cross_relations_open");
  const rerun = await deps.invoke<RelationEngineReport>("map_relation_engine_run", { brainId: ALPHA });
  const afterOverview = await deps.invoke<RelationsOverview>("map_relations_open", { brainId: ALPHA });
  const after = stableSets(afterOverview);
  requireFact(JSON.stringify(after) === JSON.stringify(before), "rerun pass2 non idempotent");
  const crossAfter = await deps.invoke<CrossRelationsOverview>("map_cross_relations_open");
  requireFact(crossAfter.deterministicDigest === crossBefore.deterministicDigest,
    "store cross-brain modifié pass2");
  return writeEvidence(deps, {
    realProcessRestart: true,
    statusBefore,
    before,
    rerun,
    after,
    crossDigestBefore: crossBefore.deterministicDigest,
    crossDigestAfter: crossAfter.deterministicDigest,
    sourceReadOnly: true,
    processClosedByHarness: true,
  });
}

export async function runDreScenario(deps: DreScenarioDeps): Promise<void> {
  try {
    const written = deps.pass === 1 ? await passOne(deps) : await passTwo(deps);
    deps.log("info", `DR15 passe ${deps.pass} écrite: ${written}`);
    deps.setStatus(`DR15 passe ${deps.pass} écrite dans ${written}`);
  } catch (error) {
    deps.log("error", `DR15 passe ${deps.pass} interrompue: ${String(error)}`);
    deps.setStatus(`DR15 interrompu : ${String(error)}`);
  }
}
