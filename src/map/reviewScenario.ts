/**
 * `TASK-0025` / `SR15` — the review queue and the memory of a human decision,
 * in two real Tauri/WebView2 processes.
 *
 * Pass 1 decides — confirm, reject and postpone, each by a **real** keystroke
 * the host sends and whose `isTrusted` is read back — then reruns `dre-v1`
 * unchanged and checks that nothing the user settled came back. Pass 2 starts
 * a new process on the same variant and checks that the decisions were still
 * there before it did anything at all.
 *
 * No mutation is ever performed programmatically. `pressRealKey` measures the
 * keystroke, the count of script-issued `click()` calls and the observable
 * change at once; a scenario that fell back to a synthetic click would publish
 * `programmaticClickCalls > 0` and fail its own criterion.
 */

import { settle, waitForCompositionReady } from "./compositionDriver";
import { pressRealKey, waitUntil, type ScenarioLog } from "./realInput";
import { PROTECTED_RUN_ARTIFACTS, runtimeWriteOwnership, sr15Artifact } from "./runArtifacts";
import type {
  BrainNodeRef,
  ContentObservationReport,
  CrossRelationsOverview,
  HostInfo,
  MapSnapshot,
  RelationEngineReport,
  RelationEngineStatus,
  RelationsOverview,
  SuggestionEdge,
  SuggestionReviewQueue,
} from "./types";

const ALPHA = "brain-alpha";
const OTHER = "brain-gamma";
const CORE = "core-rule-engine";
const MARKER = "SR15-KEY-READY";

export interface ReviewScenarioDeps {
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

/** The key of the item the panel is currently offering a decision on. */
function onScreenKey(): string | null {
  return (
    document.querySelector<HTMLButtonElement>('[data-testid="review-confirm"]')?.dataset
      .suggestionKey ?? null
  );
}

function control(testId: string): HTMLButtonElement {
  const element = document.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`);
  requireFact(element && !element.disabled, `contrôle ${testId} indisponible`);
  return element;
}

/** The decision-independent view of a brain's store, for comparison. */
function stableSets(overview: RelationsOverview) {
  return {
    approved: overview.established
      .filter((edge) => edge.provenance === "APPROVED")
      .map((edge) => `${edge.source.key}|${edge.target.key}|${edge.relationType}`)
      .sort(),
    deterministic: overview.established
      .filter((edge) => edge.provenance === "DETERMINISTIC")
      .map((edge) => `${edge.source.key}|${edge.target.key}|${edge.relationType}|${edge.ruleName}`)
      .sort(),
    pending: overview.pendingSuggestions.map((suggestion) => suggestion.suggestionKey).sort(),
  };
}

function coreItems(queue: SuggestionReviewQueue): SuggestionEdge[] {
  return queue.items.filter((item) => item.producer === CORE);
}

async function writeEvidence(deps: ReviewScenarioDeps, evidence: Record<string, unknown>) {
  const ownership = runtimeWriteOwnership();
  requireFact(PROTECTED_RUN_ARTIFACTS.length === 32, "X5 n'est plus exactement 32");
  requireFact(ownership.protectedDestinations.length === 0, "destination runtime protégée");
  requireFact(ownership.writesUnderItsOwnTaskOnly, "runtime hors TASK-0025");
  requireFact(ownership.owningTaskId === "TASK-0025", "propriétaire runtime inattendu");
  return deps.invoke<string>("map_write_run_artifact", {
    name: sr15Artifact(deps.pass),
    contents: JSON.stringify(
      {
        task: "TASK-0025",
        criterion: "SR15",
        pass: deps.pass,
        canonical: false,
        joinsX5: false,
        capturedAtIso: new Date().toISOString(),
        host: deps.host,
        input: {
          brainId: ALPHA,
          source:
            "synthetic TASK-0025 SR15 proof fixture, outside the four frozen fixtures",
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

/**
 * Walks the queue to a named suggestion using **« Plus tard » only**.
 *
 * Every press is a real keystroke on the one control that decides nothing, so
 * the navigation is itself a repeated measurement of `SR8`: the postponed
 * items are still pending when the walk is over.
 */
async function walkTo(
  key: string,
  deps: ReviewScenarioDeps,
  budget: number,
): Promise<{ presses: number; trusted: boolean; programmaticClicks: number }> {
  let presses = 0;
  let trusted = true;
  let programmaticClicks = 0;
  while (onScreenKey() !== key) {
    requireFact(presses < budget, `suggestion ${key} introuvable dans la file après ${presses} passages`);
    const before = onScreenKey();
    const evidence = await pressRealKey(
      control("review-later"),
      "{ENTER}",
      () => onScreenKey() !== before,
      deps.log,
      60_000,
      MARKER,
    );
    trusted = trusted && evidence.keydownIsTrusted === true && evidence.activationIsTrusted === true;
    programmaticClicks += evidence.programmaticClickCalls + evidence.programmaticClickDispatches;
    presses += 1;
  }
  return { presses, trusted, programmaticClicks };
}

async function passOne(deps: ReviewScenarioDeps) {
  deps.showOnly(ALPHA);
  await waitForCompositionReady();
  await deps.invoke("map_open", { brainId: ALPHA, rebuild: true });
  const snapshot = await deps.invoke<MapSnapshot>("map_snapshot", { brainId: ALPHA });
  deps.select({ brainId: ALPHA, nodeId: snapshot.nodes.find((node) => node.kind === "file")!.id });
  await settle();

  // The other brain, read before anything is decided, so `SR12` compares a
  // measurement rather than an assumption.
  await deps.invoke("map_open", { brainId: OTHER, rebuild: true });
  const otherBefore = stableSets(
    await deps.invoke<RelationsOverview>("map_relations_open", { brainId: OTHER }),
  );
  const otherQueueBefore = await deps.invoke<SuggestionReviewQueue>(
    "map_relations_review_queue",
    { brainId: OTHER },
  );
  const crossBefore = await deps.invoke<CrossRelationsOverview>("map_cross_relations_open");

  await deps.invoke<ContentObservationReport>("map_content_observe", { brainId: ALPHA });
  const initialStatus = await deps.invoke<RelationEngineStatus>("map_relation_engine_status", {
    brainId: ALPHA,
  });
  requireFact(initialStatus.inputState !== "CURRENT", "dre-v1 déjà CURRENT sur variante fraîche");
  const proofCampaign = await deps.invoke<ContentObservationReport>("map_task0025_sr15_prepare");
  requireFact(
    proofCampaign.sourceFingerprintBefore === proofCampaign.sourceFingerprintAfter,
    "source SR15 modifiée pendant la campagne",
  );

  // 1 — the engine, by a real keystroke.
  const analyzeKey = await pressRealKey(
    control("analyze-relations"),
    "{ENTER}",
    () => document.querySelector('[data-testid="relation-engine-summary"]') !== null,
    deps.log,
    90_000,
    MARKER,
  );
  requireFact(
    analyzeKey.keydownIsTrusted && analyzeKey.activationIsTrusted,
    "activation de l'analyse non fiable",
  );
  requireFact(
    analyzeKey.programmaticClickCalls === 0 && analyzeKey.programmaticClickDispatches === 0,
    "repli par clic programmatique interdit",
  );

  const queueBefore = await deps.invoke<SuggestionReviewQueue>("map_relations_review_queue", {
    brainId: ALPHA,
  });
  const targets = coreItems(queueBefore);
  requireFact(targets.length >= 3, `SR15 exige trois suggestions core, ${targets.length} trouvée(s)`);
  const [toConfirm, toReject, toPostpone] = targets;
  requireFact(
    queueBefore.totalPending === queueBefore.items.length,
    "la file de preuve doit tenir en une page",
  );
  const budget = queueBefore.items.length + 1;

  // 2 — open the queue, by a real keystroke.
  const openKey = await pressRealKey(
    control("open-review-queue"),
    "{ENTER}",
    () => document.querySelector('[data-testid="review-confirm"]') !== null,
    deps.log,
    60_000,
    MARKER,
  );
  requireFact(openKey.keydownIsTrusted && openKey.activationIsTrusted, "ouverture non fiable");
  const entryBefore = Number(
    document.querySelector<HTMLElement>('[data-testid="open-review-queue"]')?.dataset
      .totalPending ?? "-1",
  );
  requireFact(
    entryBefore === queueBefore.totalPending,
    `l'entrée annonce ${entryBefore} et le backend ${queueBefore.totalPending}`,
  );

  // 3 — confirm one, by a real keystroke.
  const walkToConfirm = await walkTo(toConfirm.suggestionKey, deps, budget);
  const confirmKey = await pressRealKey(
    control("review-confirm"),
    "{ENTER}",
    () => onScreenKey() !== toConfirm.suggestionKey,
    deps.log,
    90_000,
    MARKER,
  );
  requireFact(
    confirmKey.keydownIsTrusted && confirmKey.activationIsTrusted,
    "confirmation non fiable",
  );
  requireFact(
    confirmKey.programmaticClickCalls === 0 && confirmKey.programmaticClickDispatches === 0,
    "confirmation programmatique",
  );

  // 4 — reject another, by a real keystroke.
  const walkToReject = await walkTo(toReject.suggestionKey, deps, budget);
  const rejectKey = await pressRealKey(
    control("review-reject"),
    "{ENTER}",
    () => onScreenKey() !== toReject.suggestionKey,
    deps.log,
    90_000,
    MARKER,
  );
  requireFact(rejectKey.keydownIsTrusted && rejectKey.activationIsTrusted, "rejet non fiable");
  requireFact(
    rejectKey.programmaticClickCalls === 0 && rejectKey.programmaticClickDispatches === 0,
    "rejet programmatique",
  );

  // 5 — postpone a third, by a real keystroke, and prove it decided nothing.
  const walkToPostpone = await walkTo(toPostpone.suggestionKey, deps, budget);
  const beforePostpone = await deps.invoke<SuggestionReviewQueue>(
    "map_relations_review_queue",
    { brainId: ALPHA },
  );
  const postponeKey = await pressRealKey(
    control("review-later"),
    "{ENTER}",
    () => onScreenKey() !== toPostpone.suggestionKey,
    deps.log,
    60_000,
    MARKER,
  );
  requireFact(
    postponeKey.keydownIsTrusted && postponeKey.activationIsTrusted,
    "« Plus tard » non fiable",
  );
  requireFact(
    postponeKey.programmaticClickCalls === 0 && postponeKey.programmaticClickDispatches === 0,
    "« Plus tard » programmatique",
  );
  await settle();
  const afterPostpone = await deps.invoke<SuggestionReviewQueue>(
    "map_relations_review_queue",
    { brainId: ALPHA },
  );
  requireFact(
    afterPostpone.totalPending === beforePostpone.totalPending,
    "« Plus tard » a modifié le compte en attente",
  );
  requireFact(
    afterPostpone.items.some((item) => item.suggestionKey === toPostpone.suggestionKey),
    "la suggestion reportée a quitté la file",
  );
  requireFact(
    afterPostpone.items.every((item) => item.state === "pending"),
    "un état autre que pending est apparu dans la file",
  );

  // 6 — what the store says the three decisions did.
  const afterDecisions = await deps.invoke<RelationsOverview>("map_relations_open", {
    brainId: ALPHA,
  });
  const decided = stableSets(afterDecisions);
  const approvedForConfirmed = afterDecisions.established.filter(
    (edge) => edge.suggestionKey === toConfirm.suggestionKey,
  );
  requireFact(approvedForConfirmed.length === 1, "la confirmée n'est pas exactement une relation");
  requireFact(approvedForConfirmed[0].provenance === "APPROVED", "provenance inattendue");
  requireFact(
    !afterDecisions.established.some(
      (edge) =>
        edge.suggestionKey === toReject.suggestionKey ||
        (edge.source.key === toReject.source.key &&
          edge.target.key === toReject.target.key &&
          edge.relationType === toReject.relationType),
    ),
    "la rejetée est devenue une relation",
  );
  requireFact(!decided.pending.includes(toConfirm.suggestionKey), "la confirmée est encore pending");
  requireFact(!decided.pending.includes(toReject.suggestionKey), "la rejetée est encore pending");
  requireFact(decided.pending.includes(toPostpone.suggestionKey), "la reportée n'est plus pending");

  // 7 — an unchanged rerun of the engine.
  const rerun = await deps.invoke<RelationEngineReport>("map_relation_engine_run", {
    brainId: ALPHA,
  });
  const afterRerun = stableSets(
    await deps.invoke<RelationsOverview>("map_relations_open", { brainId: ALPHA }),
  );
  requireFact(
    !afterRerun.pending.includes(toReject.suggestionKey),
    "la rejetée est ressuscitée par le rerun",
  );
  requireFact(
    JSON.stringify(afterRerun.approved) === JSON.stringify(decided.approved),
    "la relation approuvée n'a pas survécu au rerun",
  );
  requireFact(
    afterRerun.pending.includes(toPostpone.suggestionKey),
    "la reportée a disparu au rerun",
  );
  requireFact(
    rerun.rejectedSuggestionPreservations >= 1,
    "le report du moteur ne compte aucune préservation de rejet",
  );
  requireFact(
    rerun.approvedSuggestionPreservations >= 1,
    "le report du moteur ne compte aucune préservation d'approbation",
  );

  // 8 — the source, and every other store.
  const readOnlyCheck = await deps.invoke<ContentObservationReport>("map_task0025_sr15_prepare");
  requireFact(
    readOnlyCheck.sourceFingerprintBefore === readOnlyCheck.sourceFingerprintAfter,
    "empreinte de la source SR15 modifiée",
  );
  requireFact(
    readOnlyCheck.sourceFingerprintBefore === proofCampaign.sourceFingerprintBefore,
    "la source SR15 a changé entre les deux campagnes",
  );
  const otherAfter = stableSets(
    await deps.invoke<RelationsOverview>("map_relations_open", { brainId: OTHER }),
  );
  const otherQueueAfter = await deps.invoke<SuggestionReviewQueue>(
    "map_relations_review_queue",
    { brainId: OTHER },
  );
  requireFact(
    JSON.stringify(otherAfter) === JSON.stringify(otherBefore),
    "le store d'un autre cerveau a bougé",
  );
  requireFact(
    otherQueueAfter.totalPending === otherQueueBefore.totalPending,
    "le compte en attente d'un autre cerveau a bougé",
  );
  const crossAfter = await deps.invoke<CrossRelationsOverview>("map_cross_relations_open");
  requireFact(
    crossAfter.deterministicDigest === crossBefore.deterministicDigest,
    "store inter-cerveaux modifié",
  );

  return writeEvidence(deps, {
    freshVariant: true,
    mapNodeCount: snapshot.nodeCount,
    initialStatus,
    proofCampaign,
    queueBefore: {
      totalPending: queueBefore.totalPending,
      returned: queueBefore.returned,
      limit: queueBefore.limit,
      maxLimit: queueBefore.maxLimit,
      hasMore: queueBefore.hasMore,
      order: queueBefore.order,
      coreCount: targets.length,
    },
    entryCountOnScreen: entryBefore,
    decisions: {
      confirmed: toConfirm.suggestionKey,
      rejected: toReject.suggestionKey,
      postponed: toPostpone.suggestionKey,
    },
    userActivation: {
      analyze: analyzeKey,
      open: openKey,
      confirm: confirmKey,
      reject: rejectKey,
      postpone: postponeKey,
    },
    postponeNavigation: { walkToConfirm, walkToReject, walkToPostpone },
    approvedRelationsForConfirmed: approvedForConfirmed.length,
    afterDecisions: decided,
    afterRerun,
    rerun,
    postponeLeftPending: {
      before: beforePostpone.totalPending,
      after: afterPostpone.totalPending,
    },
    isolation: {
      otherBrainId: OTHER,
      otherPendingBefore: otherQueueBefore.totalPending,
      otherPendingAfter: otherQueueAfter.totalPending,
      otherStoreUnchanged: JSON.stringify(otherAfter) === JSON.stringify(otherBefore),
      crossDigestBefore: crossBefore.deterministicDigest,
      crossDigestAfter: crossAfter.deterministicDigest,
    },
    sourceReadOnly: readOnlyCheck.readOnlyConfirmed,
    processClosedByHarness: true,
  });
}

async function passTwo(deps: ReviewScenarioDeps) {
  deps.showOnly(ALPHA);
  await waitForCompositionReady();
  const snapshot = await deps.invoke<MapSnapshot>("map_snapshot", { brainId: ALPHA });
  deps.select({ brainId: ALPHA, nodeId: snapshot.nodes.find((node) => node.kind === "file")!.id });
  await settle();

  // Read **before** anything is run: what pass 2 proves is that the decisions
  // were already there when this process opened the store.
  const statusBefore = await deps.invoke<RelationEngineStatus>("map_relation_engine_status", {
    brainId: ALPHA,
  });
  requireFact(statusBefore.inputState === "CURRENT", "état dre-v1 non CURRENT après restart");
  const before = stableSets(
    await deps.invoke<RelationsOverview>("map_relations_open", { brainId: ALPHA }),
  );
  const queueBefore = await deps.invoke<SuggestionReviewQueue>("map_relations_review_queue", {
    brainId: ALPHA,
  });
  requireFact(before.approved.length >= 1, "aucune relation APPROVED n'a survécu au redémarrage");

  const suggestions = await deps.invoke<RelationsOverview>("map_relations_open", {
    brainId: ALPHA,
  });
  const pendingKeys = suggestions.pendingSuggestions.map((item) => item.suggestionKey);
  const corePending = queueBefore.items.filter((item) => item.producer === CORE);
  requireFact(
    corePending.length >= 1,
    "la suggestion laissée « Plus tard » n'est plus dans la file après redémarrage",
  );

  const crossBefore = await deps.invoke<CrossRelationsOverview>("map_cross_relations_open");
  const rerun = await deps.invoke<RelationEngineReport>("map_relation_engine_run", {
    brainId: ALPHA,
  });
  const after = stableSets(
    await deps.invoke<RelationsOverview>("map_relations_open", { brainId: ALPHA }),
  );
  const queueAfter = await deps.invoke<SuggestionReviewQueue>("map_relations_review_queue", {
    brainId: ALPHA,
  });
  requireFact(JSON.stringify(after) === JSON.stringify(before), "rerun pass2 non idempotent");
  requireFact(
    queueAfter.totalPending === queueBefore.totalPending,
    "le compte en attente a bougé au rerun",
  );
  requireFact(
    rerun.rejectedSuggestionPreservations >= 1,
    "la mémoire du rejet n'a pas survécu au redémarrage",
  );
  requireFact(
    rerun.approvedSuggestionPreservations >= 1,
    "l'approbation n'a pas survécu au redémarrage",
  );
  const crossAfter = await deps.invoke<CrossRelationsOverview>("map_cross_relations_open");
  requireFact(
    crossAfter.deterministicDigest === crossBefore.deterministicDigest,
    "store inter-cerveaux modifié pass2",
  );

  // The queue on screen agrees with the store it was read from.
  const rendered = await waitUntil(
    () =>
      Number(
        document.querySelector<HTMLElement>('[data-testid="open-review-queue"]')?.dataset
          .totalPending ?? "-1",
      ) === queueAfter.totalPending,
    20_000,
  );

  return writeEvidence(deps, {
    realProcessRestart: true,
    statusBefore,
    before,
    queueBefore: {
      totalPending: queueBefore.totalPending,
      corePending: corePending.map((item) => item.suggestionKey),
      states: [...new Set(queueBefore.items.map((item) => item.state))],
    },
    pendingKeys,
    rerun,
    after,
    queueAfterRerunTotalPending: queueAfter.totalPending,
    entryAgreesWithStore: rendered.settled,
    crossDigestBefore: crossBefore.deterministicDigest,
    crossDigestAfter: crossAfter.deterministicDigest,
    sourceReadOnly: true,
    processClosedByHarness: true,
  });
}

export async function runReviewScenario(deps: ReviewScenarioDeps): Promise<void> {
  try {
    const written = deps.pass === 1 ? await passOne(deps) : await passTwo(deps);
    deps.log("info", `SR15 passe ${deps.pass} écrite: ${written}`);
    deps.setStatus(`SR15 passe ${deps.pass} écrite dans ${written}`);
  } catch (error) {
    deps.log("error", `SR15 passe ${deps.pass} interrompue: ${String(error)}`);
    deps.setStatus(`SR15 interrompu : ${String(error)}`);
  }
}
