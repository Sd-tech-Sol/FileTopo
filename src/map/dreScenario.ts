import { bilingual, type StatusMessage } from "./localeText";
import { prepareScenarioIndex } from "./lifecycle";
/** TASK-0024/DR15 — real Tauri/WebView2 deterministic-rule proof. */

import { settle, waitForCompositionReady } from "./compositionDriver";
import { pressRealKey, waitUntil, type ScenarioLog } from "./realInput";
import { PROTECTED_RUN_ARTIFACTS, dr15Artifact, runtimeWriteOwnership } from "./runArtifacts";
import type {
  BrainCatalogView,
  BrainNodeRef,
  ContentObservationReport,
  ContentObservationSummary,
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
  showOnly: (brainId: string) => Promise<void>;
  select: (reference: BrainNodeRef) => void;
  setStatus: (message: StatusMessage) => void;
  log: ScenarioLog;
  /** `3` is the `TASK-0051` corrective: DR15 up to the approval, then a stale-engine revocation. */
  pass: 1 | 2 | 3;
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
  const destination = dr15Artifact(deps.pass);
  requireFact(ownership.owningTaskId === "TASK-0026", "propriétaire runtime inattendu");
  requireFact(
    !(PROTECTED_RUN_ARTIFACTS as readonly string[]).includes(destination),
    `destination protégée par X5: ${destination}`,
  );
  return deps.invoke<string>("map_write_run_artifact", {
    name: destination,
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

interface ApprovedCore {
  key: string;
  catalogActiveBrainId: string;
  snapshot: MapSnapshot;
  contentCampaign: ContentObservationReport;
  proofCampaign: ContentObservationReport;
  initial: RelationEngineStatus;
  key1: Awaited<ReturnType<typeof pressRealKey>>;
  approvalKey: Awaited<ReturnType<typeof pressRealKey>>;
  report: RelationEngineReport;
  rerun: RelationEngineReport;
  coreIdenticalCount: number;
  afterApproval: ReturnType<typeof stableSets>;
  afterRerun: ReturnType<typeof stableSets>;
  crossBefore: CrossRelationsOverview;
  crossAfter: CrossRelationsOverview;
}

/** The DR15 pass one, up to the rerun that follows the keyboard approval. */
async function approveCoreSuggestion(deps: DreScenarioDeps): Promise<ApprovedCore> {
  await deps.showOnly(ALPHA);
  await waitForCompositionReady();
  await prepareScenarioIndex(deps.invoke, ALPHA, "map_rebuild");
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

  return {
    key: coreSuggestion.suggestionKey,
    catalogActiveBrainId: catalog.activeBrainId,
    snapshot,
    contentCampaign,
    proofCampaign,
    initial,
    key1: key,
    approvalKey,
    report,
    rerun,
    coreIdenticalCount: coreIdentical.length,
    afterApproval,
    afterRerun,
    crossBefore,
    crossAfter,
  };
}

async function passOne(deps: DreScenarioDeps) {
  const done = await approveCoreSuggestion(deps);
  return writeEvidence(deps, {
    freshVariant: true,
    catalogActiveBrainId: done.catalogActiveBrainId,
    mapNodeCount: done.snapshot.nodeCount,
    contentCampaign: done.contentCampaign,
    proofCampaign: done.proofCampaign,
    initialStatus: done.initial,
    userActivation: done.key1,
    approvalActivation: done.approvalKey,
    report: done.report,
    rerun: done.rerun,
    coreIdenticalCount: done.coreIdenticalCount,
    approvedSuggestionKey: done.key,
    afterApproval: done.afterApproval,
    afterRerun: done.afterRerun,
    crossDigestBefore: done.crossBefore.deterministicDigest,
    crossDigestAfter: done.crossAfter.deterministicDigest,
    sourceReadOnly: done.proofCampaign.readOnlyConfirmed,
    processClosedByHarness: true,
  });
}

const REVOKE_SELECTOR = (key: string) => `[data-relation-revoke="${key}"]`;
const APPROVE_SELECTOR = (key: string) =>
  `[data-testid="approve-core-suggestion"][data-suggestion-key="${key}"]`;
const ENGINE_STATE = '[data-testid="relation-engine-state"]';
const STALE_TEXTS = ["Analyse des relations à actualiser", "Relations analysis needs refreshing"];
const CURRENT_TEXTS = ["Analyse à jour", "Analysis up to date"];

function engineStateIs(texts: string[]): boolean {
  const text = document.querySelector(ENGINE_STATE)?.textContent ?? "";
  return texts.includes(text);
}

/**
 * `TASK-0051` corrective (`ACTION-0093`) — a human approval of a core
 * suggestion stays revocable while the engine is `STALE`.
 *
 * DR15 up to the keyboard approval, then:
 *  1. the engine is made `STALE` **without a rerun**, by observing the same
 *     synthetic source again (a new content generation). That is the only
 *     fixture-side act of the proof; it happens before the gesture and is
 *     measured on its own;
 *  2. the approved relation is still shown, with its revoke control;
 *  3. a real Enter revokes it; the engine is still `STALE`, the relation is
 *     gone, the pending core suggestion is not presented as current, and the
 *     focus lands on a safe control;
 *  4. only then an explicit rerun brings the engine back.
 * The source and Index fingerprints are compared around the gesture alone.
 */
async function passStaleCoreRevocation(deps: DreScenarioDeps) {
  const done = await approveCoreSuggestion(deps);
  const key = done.key;

  // 1 — the only fixture-side act: a second observation of the same bytes.
  const staleCreation = await deps.invoke<ContentObservationReport>("map_task0024_dr15_prepare");
  requireFact(staleCreation.sourceFingerprintBefore === staleCreation.sourceFingerprintAfter,
    "source DR15 modifiée pendant la création de l'état STALE");
  requireFact(staleCreation.sourceFingerprintAfter === done.proofCampaign.sourceFingerprintAfter,
    "source DR15 différente de celle de la première campagne");
  requireFact(staleCreation.generationId !== done.proofCampaign.generationId,
    "aucune nouvelle génération de contenu : l'état STALE n'est pas créé");
  const staleStatus = await deps.invoke<RelationEngineStatus>("map_relation_engine_status", {
    brainId: ALPHA,
  });
  requireFact(staleStatus.inputState === "STALE", "le moteur n'est pas STALE sans rerun");
  const preRevokeOverview = await deps.invoke<RelationsOverview>("map_relations_open", {
    brainId: ALPHA,
  });
  requireFact(preRevokeOverview.engineCurrent === false, "l'aperçu annonce le moteur courant");
  requireFact(preRevokeOverview.established.some((edge) =>
    edge.provenance === "APPROVED" && edge.suggestionKey === key),
    "relation APPROVED masquée par l'état STALE");
  requireFact(!preRevokeOverview.pendingSuggestions.some((s) => s.suggestionKey === key),
    "suggestion approuvée de nouveau pending");

  // 2 — the panel reads the node again from the backend, in the stale state.
  // The proof's endpoints are not nodes of the Index: its relations are listed
  // on whichever real node is selected, so the panel is reloaded on two of them.
  const files = done.snapshot.nodes.filter((node) => node.kind === "file");
  requireFact(files.length >= 2, "moins de deux fichiers pour recharger le panneau");
  deps.select({ brainId: ALPHA, nodeId: files[1].id });
  await settle();
  deps.select({ brainId: ALPHA, nodeId: files[0].id });
  await settle();
  const revokeVisible = await waitUntil(
    () => document.querySelector(REVOKE_SELECTOR(key)) !== null,
    20_000,
  );
  requireFact(revokeVisible.settled, "relation APPROVED ou bouton de révocation absents en STALE");
  const revoke = document.querySelector<HTMLButtonElement>(REVOKE_SELECTOR(key))!;
  requireFact(!revoke.disabled, "bouton de révocation désactivé en STALE");

  // Fingerprints around the gesture only — the stale creation is behind us.
  const indexBefore = staleStatus.mapDigest;
  const summaryBefore = await deps.invoke<ContentObservationSummary>("map_content_summary", {
    brainId: ALPHA,
  });
  const crossBefore = await deps.invoke<CrossRelationsOverview>("map_cross_relations_open");

  // 3 — the gesture, by a real key.
  const revocationKey = await pressRealKey(
    revoke,
    "{ENTER}",
    () => document.querySelector(REVOKE_SELECTOR(key)) === null,
    deps.log,
    90_000,
    MARKER,
  );
  requireFact(revocationKey.keydownIsTrusted && revocationKey.activationIsTrusted,
    "révocation STALE non fiable");
  requireFact(
    revocationKey.programmaticClickCalls === 0 && revocationKey.programmaticClickDispatches === 0,
    "révocation par clic programmatique interdite",
  );

  const stateVisible = await waitUntil(() => engineStateIs(STALE_TEXTS), 20_000);
  requireFact(stateVisible.settled, "le panneau ne signale pas l'analyse à actualiser");
  const focusSettled = await waitUntil(
    () => (document.activeElement as HTMLElement | null)?.dataset.testid === "analyze-relations",
    20_000,
  );
  const focused = document.activeElement as HTMLElement | null;
  requireFact(focusSettled.settled, "focus non posé sur « Analyser les relations »");
  requireFact(focused?.dataset.relationRevoke === undefined, "focus sur le contrôle d'une relation");
  requireFact(document.querySelector(APPROVE_SELECTOR(key)) === null,
    "suggestion core périmée présentée comme approuvable");

  const afterOverview = await deps.invoke<RelationsOverview>("map_relations_open", {
    brainId: ALPHA,
  });
  const statusAfter = await deps.invoke<RelationEngineStatus>("map_relation_engine_status", {
    brainId: ALPHA,
  });
  requireFact(statusAfter.inputState === "STALE", "la révocation a rafraîchi le moteur");
  requireFact(!afterOverview.established.some((edge) => edge.suggestionKey === key),
    "relation encore établie après révocation");
  requireFact(!afterOverview.pendingSuggestions.some((s) => s.suggestionKey === key),
    "suggestion core périmée présentée comme actuelle");
  const summaryAfter = await deps.invoke<ContentObservationSummary>("map_content_summary", {
    brainId: ALPHA,
  });
  const crossAfter = await deps.invoke<CrossRelationsOverview>("map_cross_relations_open");
  requireFact(statusAfter.mapDigest === indexBefore, "Index modifié autour de la révocation");
  requireFact(summaryAfter.sourceFingerprint === summaryBefore.sourceFingerprint,
    "empreinte source modifiée autour de la révocation");
  requireFact(crossAfter.deterministicDigest === crossBefore.deterministicDigest,
    "store inter-cerveaux modifié");

  // 4 — an explicit rerun, after the gesture, is what brings the engine back.
  const analyze = document.querySelector<HTMLButtonElement>('[data-testid="analyze-relations"]');
  requireFact(analyze && !analyze.disabled, "Analyser les relations indisponible après révocation");
  const rerunKey = await pressRealKey(
    analyze,
    "{ENTER}",
    () => engineStateIs(CURRENT_TEXTS),
    deps.log,
    90_000,
    MARKER,
  );
  requireFact(rerunKey.keydownIsTrusted && rerunKey.activationIsTrusted, "rerun non fiable");
  const finalStatus = await deps.invoke<RelationEngineStatus>("map_relation_engine_status", {
    brainId: ALPHA,
  });
  requireFact(finalStatus.inputState === "CURRENT", "moteur non CURRENT après rerun explicite");
  const finalOverview = await deps.invoke<RelationsOverview>("map_relations_open", {
    brainId: ALPHA,
  });
  const pendingAgain = finalOverview.pendingSuggestions.find((s) => s.suggestionKey === key);
  requireFact(pendingAgain, "la suggestion révoquée n'est pas revenue pending après le rerun");
  requireFact(pendingAgain.decidedUnixMs === null || pendingAgain.decidedUnixMs === undefined,
    "la suggestion revenue pending porte encore une date de décision");
  requireFact(!finalOverview.established.some((edge) => edge.suggestionKey === key),
    "le rerun a réapprouvé la relation révoquée");

  return writeEvidence(deps, {
    staleCoreRevocation: {
      suggestionKey: key,
      staleCreation: {
        how: "second observation of the same synthetic bytes (new content generation), no rerun",
        generationBefore: done.proofCampaign.generationId,
        generationAfter: staleCreation.generationId,
        sourceFingerprintBefore: staleCreation.sourceFingerprintBefore,
        sourceFingerprintAfter: staleCreation.sourceFingerprintAfter,
        statusAfter: staleStatus.inputState,
      },
      beforeGesture: {
        engineCurrent: preRevokeOverview.engineCurrent,
        approvedRelationInStore: true,
        revokeControlVisible: true,
      },
      revocationActivation: revocationKey,
      afterGesture: {
        engineState: statusAfter.inputState,
        relationAbsent: true,
        pendingSuggestionPresentedAsCurrent: false,
        approveControlPresent: false,
        focusedTestId: focused?.dataset.testid ?? null,
        indexDigestBefore: indexBefore,
        indexDigestAfter: statusAfter.mapDigest,
        sourceFingerprintBefore: summaryBefore.sourceFingerprint,
        sourceFingerprintAfter: summaryAfter.sourceFingerprint,
        crossDigestBefore: crossBefore.deterministicDigest,
        crossDigestAfter: crossAfter.deterministicDigest,
      },
      explicitRerun: {
        activation: rerunKey,
        status: finalStatus.inputState,
        suggestionPendingAgain: true,
        pendingDecidedUnixMs: pendingAgain.decidedUnixMs ?? null,
        relationNotReapproved: true,
      },
    },
    processClosedByHarness: true,
  });
}

async function passTwo(deps: DreScenarioDeps) {
  await deps.showOnly(ALPHA);
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
    const written =
      deps.pass === 1
        ? await passOne(deps)
        : deps.pass === 2
          ? await passTwo(deps)
          : await passStaleCoreRevocation(deps);
    deps.log("info", `DR15 passe ${deps.pass} écrite: ${written}`);
    deps.setStatus(
      bilingual(
        `DR15 passe ${deps.pass} écrite dans ${written}`,
        `DR15 pass ${deps.pass} written to ${written}`,
      ),
    );
  } catch (error) {
    deps.log("error", `DR15 passe ${deps.pass} interrompue: ${String(error)}`);
    deps.setStatus(
      bilingual(`DR15 interrompu : ${String(error)}`, `DR15 interrupted: ${String(error)}`),
    );
  }
}
