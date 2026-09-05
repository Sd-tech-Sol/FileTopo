/**
 * `TASK-0024` / reserve `X11` — the deterministic relation engine, proved
 * **generic** in a real Tauri/WebView2 process.
 *
 * `DR15` proved `dre-v1` on `brain-alpha`, which reads the frozen
 * `quasi-empty` fixture — the very fixture the legacy `TASK-0017` producers are
 * confined to. That left one question unanswered: does the engine work on a
 * brain the legacy slice never covered? `brain-beta` reads `deep`, so it is the
 * catalogue's own counter-example, and this scenario runs against it.
 *
 * **This is a corrective proof, not a canonical one.** It joins neither the 29
 * sealed artefacts of `X5` nor the three frozen proofs of `TASK-0024`, and it
 * replaces nothing. It exists to answer `X11` and says so in the file it
 * writes.
 *
 * What it refuses to fake, as `DR15` did before it: the activation. The page
 * focuses the control, prints a marker on the host's standard output, and waits
 * for a **real Windows keystroke**. What it records is the activation's own
 * `isTrusted` flag together with counters proving no programmatic click was
 * used as a fallback. There is no fallback.
 *
 * What it does **not** assert: that a rule must fire on `deep`. Zero output is
 * a valid result for a source whose signals are absent — what has to hold is
 * that the panel, the engine and the reads work generically.
 */

import { settle, waitForCompositionReady } from "./compositionDriver";
import { pressRealKey, waitUntil, type ScenarioLog } from "./realInput";
import { PROTECTED_RUN_ARTIFACTS, X11_GENERIC_ARTIFACT, runtimeWriteOwnership } from "./runArtifacts";
import type {
  BrainNodeRef,
  FixtureIntegrity,
  HostInfo,
  MapSnapshot,
  NodeRelations,
  RelationEngineReport,
  RelationEngineStatus,
  RelationsOverview,
} from "./types";

/** The brain that is **not** `quasi-empty`. That is the whole point. */
const BETA = "brain-beta";
const MARKER = "X11-KEY-READY";

export interface GenericRelationScenarioDeps {
  invoke: <T>(command: string, args?: Record<string, unknown>) => Promise<T>;
  host: HostInfo | null;
  showOnly: (brainId: string) => void;
  select: (reference: BrainNodeRef) => void;
  setStatus: (message: string) => void;
  log: ScenarioLog;
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

/**
 * Every producer name the store returns for this brain.
 *
 * `X11` asks that no legacy producer be invented for Beta just to make the
 * panel available, so the check is made on the rows themselves rather than on
 * a flag the interface computed.
 */
function producersOf(overview: RelationsOverview): string[] {
  // `producer` is optional in the DTO, and an absent one is not « no
  // producer »: it is a row this build cannot name. Reported as `unknown`
  // rather than dropped, so a legacy row could never hide in a gap.
  return [
    ...new Set(
      [
        ...overview.established.map((edge) => edge.producer),
        ...overview.pendingSuggestions.map((suggestion) => suggestion.producer),
      ].map((producer) => producer ?? "unknown"),
    ),
  ].sort();
}

async function proveGenericBrain(
  deps: GenericRelationScenarioDeps,
): Promise<Record<string, unknown>> {
  const evidence: Record<string, unknown> = { brainId: BETA };

  // 1. Beta on screen, alone and focused.
  deps.showOnly(BETA);
  requireFact(await waitForCompositionReady(), "barre de composition indisponible");
  const focused = await waitUntil(() => {
    const chips = [...document.querySelectorAll<HTMLElement>(".composition__focus")];
    return chips.length === 1 && chips[0].dataset.brainId === BETA;
  }, 60_000);
  requireFact(focused.settled, `${BETA} n'est pas affiché seul`);
  await settle();

  const snapshot = await deps.invoke<MapSnapshot>("map_snapshot", { brainId: BETA });
  requireFact(snapshot.brainId === BETA, "snapshot d'un autre cerveau");
  requireFact(snapshot.fixtureId === "deep", "Bêta ne lit plus `deep`");
  evidence.displayed = {
    focusedBrainId: BETA,
    fixtureId: snapshot.fixtureId,
    nodeCount: snapshot.nodeCount,
    waitedMs: Math.round(focused.waitedMs),
  };

  // 2. The panel opens, and the engine has never run here.
  const before = await deps.invoke<RelationsOverview>("map_relations_open", { brainId: BETA });
  requireFact(before.brainId === BETA, "aperçu d'un autre cerveau");
  requireFact(before.legacyInScope === false, "Bêta revendique le périmètre legacy");
  const statusBefore = await deps.invoke<RelationEngineStatus>("map_relation_engine_status", {
    brainId: BETA,
  });
  const integrityBefore = await deps.invoke<FixtureIntegrity>("map_integrity", { brainId: BETA });
  evidence.beforeRun = {
    overviewOpened: true,
    legacyInScope: before.legacyInScope,
    established: before.established.length,
    pendingSuggestions: before.pendingSuggestions.length,
    seeded: before.seeded,
    producers: producersOf(before),
    engineStatus: statusBefore,
    sourceFingerprint: integrityBefore.fingerprint,
  };
  requireFact(before.seeded === 0, "seed legacy créé pour Bêta");
  requireFact(
    producersOf(before).every((producer) => producer === "core-rule-engine"),
    "producteur legacy présent sur Bêta avant tout run",
  );

  // 3. A node of Beta selected, so the panel renders its sections.
  const node = snapshot.nodes.find((candidate) => candidate.kind === "file") ?? snapshot.nodes[0];
  requireFact(node, "aucun nœud dans Bêta");
  deps.select({ brainId: BETA, nodeId: node.id });
  await settle();
  const nodeView = await deps.invoke<NodeRelations>("map_relations_for_node", {
    reference: { brainId: BETA, nodeId: node.id },
  });
  requireFact(nodeView.brainId === BETA, "relations d'un autre cerveau");

  // 4. The panel is NOT dead: no « hors périmètre » wall, and the analyse
  //    control is on screen and operable. This is the exact defect `X11`
  //    names, so it is read off the rendered DOM rather than from a prop.
  const panelReady = await waitUntil(
    () => document.querySelector('[data-testid="analyze-relations"]') !== null,
    60_000,
  );
  const panel = document.querySelector<HTMLElement>(".relations");
  const analyze = document.querySelector<HTMLButtonElement>('[data-testid="analyze-relations"]');
  const legacyNote = document.querySelector<HTMLElement>('[data-testid="legacy-scope-note"]');
  const panelText = panel?.textContent ?? "";
  evidence.panel = {
    settled: panelReady.settled,
    waitedMs: Math.round(panelReady.waitedMs),
    panelPresent: panel !== null,
    panelSaysOutOfScope: /ne porte aucune relation/.test(panelText),
    analyzePresent: analyze !== null,
    analyzeEnabled: analyze !== null && !analyze.disabled,
    engineStatePresent:
      document.querySelector('[data-testid="relation-engine-state"]') !== null,
    legacyNotePresent: legacyNote !== null,
    legacyNoteText: legacyNote?.textContent?.trim() ?? null,
    directionSections: [...document.querySelectorAll(".relations__direction")].map(
      (section) => section.getAttribute("aria-label") ?? "",
    ),
  };
  requireFact(panel, "panneau des relations absent");
  requireFact(
    !/ne porte aucune relation/.test(panelText),
    "le panneau déclare encore Bêta hors périmètre",
  );
  requireFact(analyze && !analyze.disabled, "commande « Analyser les relations » indisponible");
  requireFact(legacyNote, "la limite legacy n'est pas expliquée sur un cerveau hors `quasi-empty`");

  // 5. A real keystroke, and nothing else, runs the engine.
  const key = await pressRealKey(
    analyze,
    "{ENTER}",
    () => document.querySelector('[data-testid="relation-engine-summary"]') !== null,
    deps.log,
    90_000,
    MARKER,
  );
  requireFact(key.keydownIsTrusted, "keydown non fiable");
  requireFact(key.activationIsTrusted, "activation non fiable");
  requireFact(
    key.programmaticClickCalls === 0 && key.programmaticClickDispatches === 0,
    "repli par clic programmatique interdit",
  );
  const report = reportFromUi();
  requireFact(report.brainId === BETA, "report d'un autre cerveau");
  requireFact(report.engineVersion === "dre-v1", "version de moteur inattendue");
  requireFact(report.inputState === "CURRENT", "report dre-v1 non CURRENT");
  evidence.userActivation = key;
  evidence.report = report;

  // 6. Reading back afterwards works, and still shows nothing legacy.
  const after = await deps.invoke<RelationsOverview>("map_relations_open", { brainId: BETA });
  const statusAfter = await deps.invoke<RelationEngineStatus>("map_relation_engine_status", {
    brainId: BETA,
  });
  const nodeAfter = await deps.invoke<NodeRelations>("map_relations_for_node", {
    reference: { brainId: BETA, nodeId: node.id },
  });
  const integrityAfter = await deps.invoke<FixtureIntegrity>("map_integrity", { brainId: BETA });
  const producers = producersOf(after);
  evidence.afterRun = {
    overviewReopened: true,
    legacyInScope: after.legacyInScope,
    engineCurrent: after.engineCurrent ?? null,
    engineStatus: statusAfter,
    established: after.established.length,
    pendingSuggestions: after.pendingSuggestions.length,
    seeded: after.seeded,
    producers,
    nodeOutgoing: nodeAfter.outgoingCount,
    nodeIncoming: nodeAfter.incomingCount,
    nodeSuggestions: nodeAfter.suggestions.map((entry) => entry.suggestionKey),
  };
  requireFact(statusAfter.inputState === "CURRENT", "état dre-v1 non CURRENT après run");
  requireFact(after.seeded === 0, "seed legacy créé pour Bêta après le run");
  requireFact(
    producers.every((producer) => producer === "core-rule-engine"),
    `producteur non core sur Bêta: ${producers.join(", ")}`,
  );
  requireFact(
    after.established.every((edge) => edge.source.key.includes(BETA) && edge.target.key.includes(BETA)),
    "extrémité étrangère dans les relations de Bêta",
  );

  // 7. The source was never written to, and the governance invariants hold.
  requireFact(
    integrityAfter.fingerprint === integrityBefore.fingerprint,
    "empreinte de la source Bêta modifiée",
  );
  requireFact(report.sourceReadOnlyConfirmed, "lecture seule non confirmée par le moteur");
  evidence.sourceReadOnly = {
    fingerprintBefore: integrityBefore.fingerprint,
    fingerprintAfter: integrityAfter.fingerprint,
    unchanged: integrityAfter.fingerprint === integrityBefore.fingerprint,
    engineConfirmed: report.sourceReadOnlyConfirmed,
    filetopoArtifactsInSource: integrityAfter.filetopoArtifacts,
  };
  evidence.processClosedByHarness = true;

  return evidence;
}

export async function runGenericRelationScenario(
  deps: GenericRelationScenarioDeps,
): Promise<void> {
  const ownership = runtimeWriteOwnership();
  let evidence: Record<string, unknown> = { brainId: BETA };
  let outcome: "written" | "abandoned" = "written";
  let reason: string | null = null;
  try {
    evidence = await proveGenericBrain(deps);
  } catch (error) {
    outcome = "abandoned";
    reason = String(error);
    deps.log("error", `X11: scénario interrompu: ${reason}`);
  }

  try {
    requireFact(PROTECTED_RUN_ARTIFACTS.length === 32, "X5 n'est plus exactement 32");
    requireFact(ownership.protectedDestinations.length === 0, "destination runtime protégée");
    requireFact(ownership.writesUnderItsOwnTaskOnly, "runtime hors TASK-0025");
    requireFact(ownership.owningTaskId === "TASK-0025", "propriétaire runtime inattendu");
    const written = await deps.invoke<string>("map_write_run_artifact", {
      name: X11_GENERIC_ARTIFACT,
      contents: JSON.stringify(
        {
          task: "TASK-0025",
          reserve: "X11",
          nature: "corrective proof of the generic relation engine on a non-legacy brain",
          canonical: false,
          joinsX5: false,
          replacesCanonicalEvidence: false,
          doesNotReplace:
            "docs/performance/runs/TASK-0024-DR15-deterministic-relation-engine-webview2-pass1.json, " +
            "docs/performance/runs/TASK-0024-DR15-deterministic-relation-engine-webview2-pass2.json, " +
            "docs/performance/runs/TASK-0024-J12-intrabrain-relations-regression-webview2.json",
          outcome,
          reason,
          capturedAtIso: new Date().toISOString(),
          host: deps.host,
          input: {
            brainId: BETA,
            source: "frozen synthetic fixture `deep`, read-only",
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
    deps.log("info", `X11: artefact écrit: ${written}`);
    deps.setStatus(
      outcome === "written"
        ? `X11 écrit dans ${written}`
        : `X11 interrompu, abandon écrit dans ${written}`,
    );
  } catch (error) {
    deps.log("error", `X11: artefact non écrit: ${String(error)}`);
    deps.setStatus(`X11 interrompu : ${String(error)}`);
  }
}
