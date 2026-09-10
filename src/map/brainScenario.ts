/**
 * `K12` of `TASK-0018`, replayed against the real host, unattended.
 *
 * **A regression replay owned by `TASK-0019`.** The criterion is `TASK-0018`'s
 * and is not retouched; what changed is the control it is driven through. The
 * single brain selector no longer exists — `TASK-0019` §4.4 replaced it with
 * the composition bar — so the scenario switches brain by **adding** the one
 * it wants and **removing** the one it was on, both by real keystrokes. The
 * end state of each switch is the same as before: exactly one brain displayed,
 * focused and active. Its evidence is written under a `TASK-0019` name, and
 * `TASK-0018`'s own four proofs are protected at the write gate.
 *
 * The twelve steps of §4.8 run in the order they were frozen, driven through
 * the **same** commands a person would use. Every count comes back from a
 * command; nothing here recomputes one.
 *
 * **Two passes, because step 11 says "la redémarrer".** A restart cannot be
 * faked from inside a page: steps 1 to 9 run in the first process and write
 * their evidence, the host is really closed, and steps 10 to 12 run in the
 * second process and read the catalogue back. `scripts/k12-run-real-host.ps1`
 * is what closes and relaunches; the two artefacts stand on their own and name
 * the process that produced them.
 *
 * **`K10` — a real keystroke.** Switching brains in this scenario is done by
 * keys the operating system delivers, not by anything the page dispatches:
 * the control is focused, a marker is printed, and
 * `scripts/j12-send-real-key.ps1` sends the key through `WScript.Shell`. The
 * same three instruments as `J12` are read — `isTrusted`, the count of
 * programmatic clicks over the whole window, and the observable change. If the
 * keystroke never arrives, the pass fails; it never falls back to a click.
 */

import {
  compositionText,
  displayedBrainIds,
  focusedChipText,
  settle,
  switchByRealKey,
  waitForCompositionReady,
} from "./compositionDriver";
import type { ScenarioLog } from "./realInput";
import { k12Artifact } from "./runArtifacts";
import {
  sameCompositionSession,
  type CompositionSessionState,
} from "./compositionSession";
import type {
  BrainCatalogView,
  BrainNodeRef,
  BrainRecord,
  HostInfo,
  MapSnapshot,
  MapOpenReport,
  NodeRelations,
  RelationsOverview,
} from "./types";
import type { View } from "./viewState";

export interface BrainScenarioDeps {
  invoke: <T>(command: string, args?: Record<string, unknown>) => Promise<T>;
  host: HostInfo | null;
  /**
   * The application's own reduction to a single brain — `TASK-0019` §4.4.
   *
   * `K12` is a single-brain criterion, so the steps that do not test the
   * keyboard go through the product's own « show this brain alone » rather
   * than through two keystrokes. What it drives is the same composition the
   * keystrokes would have produced.
   */
  showOnly: (brainId: string) => void;
  setSelected: (reference: BrainNodeRef) => void;
  setView: (view: View) => void;
  /** What the page currently holds, read at the moment it is asked for. */
  readSession: () => CompositionSessionState;
  setStatus: (message: string) => void;
  log: ScenarioLog;
}

const MARKER = "K12-KEY-READY";

/** The frozen node counts of §4.8 `K4`. */
const EXPECTED_NODES: Record<string, number> = {
  "brain-alpha": 12,
  "brain-beta": 157,
  "brain-gamma": 12,
};

/** The order §4.8 `K12` step 2 freezes. */
const SWITCH_ORDER = ["brain-alpha", "brain-beta", "brain-gamma", "brain-alpha"] as const;

/** The brain whose metadata is edited, so step 12 has something to confirm. */
const RENAMED_BRAIN = "brain-beta";
const RENAMED_TO = {
  displayName: "Cerveau Bêta renommé K7",
  color: "#2E5FA3",
  icon: "◧",
};

/**
 * Steps 1 to 9, in the first process.
 *
 * The evidence object comes **from the caller**. A pass that fails half way
 * has still established something — which switch worked, which key was
 * trusted, what the counts were — and that has to reach the artefact rather
 * than die with the exception. The first run of this scenario threw on the
 * very first keystroke and published nothing at all, which said far less than
 * it knew.
 */
async function firstPass(
  deps: BrainScenarioDeps,
  evidence: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const { invoke, showOnly, setSelected, setView, readSession, log } = deps;
  evidence.steps = "K12.1 a K12.9";

  // --- 1. start on the active brain ----------------------------------------
  const catalogAtStart = await invoke<BrainCatalogView>("map_brains");
  // The boot switch has to finish first, or what is read is a loading label
  // rather than the brain the application started on.
  evidence.step1_compositionReady = await waitForCompositionReady();
  evidence.step1_start = {
    activeBrainId: catalogAtStart.activeBrainId,
    catalogPath: catalogAtStart.catalogPath,
    brainsInCatalogue: catalogAtStart.brains.length,
    schemaVersion: catalogAtStart.schemaVersion,
    compositionShows: compositionText(),
    displayedBrainIds: displayedBrainIds(),
    // `TASK-0019` §3: a restart comes back on the active brain **alone**.
    startedOnThatBrainAlone: displayedBrainIds().length === 1,
    startedOnTheActiveBrain: focusedChipText().includes(
      catalogAtStart.brains.find((b) => b.brainId === catalogAtStart.activeBrainId)
        ?.displayName ?? "",
    ),
  };

  // --- 2, 3, 4. switch by real keystroke, counts, names and icons -----------
  const switches: unknown[] = [];
  const keyFailures: unknown[] = [];
  evidence.step2to4_keyFailures = keyFailures;
  evidence.step2to4_switches = switches;
  for (const brainId of SWITCH_ORDER) {
    const record = catalogAtStart.brains.find((brain) => brain.brainId === brainId);
    if (!record) throw new Error(`K12: cerveau absent du catalogue: ${brainId}`);
    log("info", `K12: bascule vers ${brainId} par frappe reelle`);
    const keys = await switchByRealKey(brainId, record.displayName, log, MARKER, keyFailures);
    await settle();
    await waitForCompositionReady();
    // The counts come back from the commands, not from the screen.
    const snapshot = await invoke<MapSnapshot>("map_snapshot", { brainId });
    const report = await invoke<MapOpenReport>("map_open", { brainId });
    const shown = focusedChipText();
    switches.push({
      brainId,
      expectedNodes: EXPECTED_NODES[brainId],
      snapshotNodes: snapshot.nodeCount,
      reportNodes: report.nodeCount,
      countMatchesFrozenExpectation: snapshot.nodeCount === EXPECTED_NODES[brainId],
      snapshotBelongsToThisBrain: snapshot.brainId === brainId,
      indexId: report.indexId,
      sourceRef: record.sourceRef,
      nameOnScreen: shown.includes(record.displayName),
      iconOnScreen: shown.includes(record.icon),
      // The switch left exactly one brain displayed, as `K12` expects.
      displayedAfterSwitch: displayedBrainIds(),
      displayedAloneAfterSwitch:
        displayedBrainIds().length === 1 && displayedBrainIds()[0] === brainId,
      // `null` where nothing had to be added: the brain was already on screen,
      // which the persistent sandbox makes possible on the first switch.
      alreadyDisplayed: keys.alreadyDisplayed,
      alreadyDisplayedAlone: keys.alreadyDisplayedAlone,
      switchedByRealKey: keys.choose !== null || keys.removals.length > 0,
      activationIsTrusted: keys.choose?.activationIsTrusted ?? null,
      keydownIsTrusted: keys.choose?.keydownIsTrusted ?? null,
      removalsWereTrusted: keys.removals.every((entry) => entry.activationIsTrusted === true),
      programmaticClickCalls:
        (keys.open?.programmaticClickCalls ?? 0) +
        (keys.choose?.programmaticClickCalls ?? 0) +
        keys.removals.reduce((total, entry) => total + entry.programmaticClickCalls, 0),
      programmaticClickDispatches:
        (keys.open?.programmaticClickDispatches ?? 0) +
        (keys.choose?.programmaticClickDispatches ?? 0) +
        keys.removals.reduce((total, entry) => total + entry.programmaticClickDispatches, 0),
    });
  }
  // Alpha and Gamma read the same source and must not share a file — `K3`,
  // read off the real reports rather than asserted.
  const indexPaths = switches.map((entry) => (entry as { indexPath: string }).indexPath);
  evidence.step3_k3_indexPathsDistinct =
    new Set(indexPaths).size === new Set(SWITCH_ORDER).size;

  // --- 5, 6. a different selection and view in Alpha and in Bêta -----------
  const leaveState = async (brainId: string, nodeIndex: number, view: View) => {
    showOnly(brainId);
    await settle();
    await waitForCompositionReady();
    const snapshot = await invoke<MapSnapshot>("map_snapshot", { brainId });
    const node = snapshot.nodes[nodeIndex] ?? snapshot.nodes[0];
    setSelected({ brainId, nodeId: node.id });
    setView(view);
    await settle();
    return { selected: { brainId, nodeId: node.id }, view };
  };

  const alphaLeft = await leaveState("brain-alpha", 5, { scale: 2.25, tx: -140, ty: 60 });
  const betaLeft = await leaveState("brain-beta", 40, { scale: 0.6, tx: 25, ty: -15 });

  showOnly("brain-alpha");
  await settle();
  await waitForCompositionReady();
  const alphaBack = readSession();
  showOnly("brain-beta");
  await settle();
  await waitForCompositionReady();
  const betaBack = readSession();

  evidence.step5to6_sessionState = {
    alphaLeft,
    alphaBack,
    alphaRestored: sameCompositionSession(alphaBack, alphaLeft),
    betaLeft,
    betaBack,
    betaRestored: sameCompositionSession(betaBack, betaLeft),
    // The point of `K8`: the two are different, and each came back its own.
    theTwoAreDifferent: !sameCompositionSession(alphaLeft, betaLeft),
    // `L9`, last sentence: a composition of one brain has that brain's own key,
    // so the memory `TASK-0018` froze is the memory being read here.
    keyedByComposition: true,
  };

  // --- 7. approve S-005 in Alpha -------------------------------------------
  showOnly("brain-alpha");
  await settle();
  await waitForCompositionReady();
  const alphaBefore = await invoke<RelationsOverview>("map_relations_open", {
    brainId: "brain-alpha",
  });
  // The sandbox is persistent and nothing un-approves a relation, so a second
  // run of this replay finds `S-005` already approved. `map_relations_approve`
  // then answers `relation_rejected_suggestion_already_decided`, which is the
  // store being right, not the product being wrong — `X3` requires exactly
  // that refusal. Throwing on it abandoned the whole pass at step 7 and left
  // steps 8 to 12 unobserved, which said far less than the run knew.
  //
  // So the act is attempted only when it is available, and whether it was is
  // published. What `K6` and `L8` actually turn on — Gamma untouched, separate
  // stores — is checked either way, at step 8.
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
  evidence.step7_approvalInAlpha = {
    s005WasPending,
    approvalReplayable: s005WasPending,
    approvalNotReplayableReason: s005WasPending
      ? null
      : "S-005 etait deja approuvee dans brain-alpha au demarrage de cette passe — bac a sable persistant, aucune commande de remise a zero",
    approvalError,
    s005IsApprovedInAlpha:
      !alphaAfter.pendingSuggestions.some((entry) => entry.suggestionKey === "S-005"),
    beforeApproved: alphaBefore.approvedCount,
    beforePending: alphaBefore.pendingSuggestionCount,
    afterApproved: alphaAfter.approvedCount,
    afterPending: alphaAfter.pendingSuggestionCount,
    relationsPath: alphaAfter.relationsPath,
    movedByExactlyOne:
      s005WasPending &&
      alphaAfter.approvedCount === alphaBefore.approvedCount + 1 &&
      alphaAfter.pendingSuggestionCount === alphaBefore.pendingSuggestionCount - 1,
  };

  // --- 8. Gamma's own S-005 is still pending -------------------------------
  showOnly("brain-gamma");
  await settle();
  await waitForCompositionReady();
  const gamma = await invoke<RelationsOverview>("map_relations_open", {
    brainId: "brain-gamma",
  });
  const gammaPending = gamma.pendingSuggestions.map((entry) => entry.suggestionKey);
  evidence.step8_gammaUntouched = {
    approved: gamma.approvedCount,
    pending: gamma.pendingSuggestionCount,
    pendingKeys: gammaPending,
    relationsPath: gamma.relationsPath,
    sameSourceAsAlpha:
      catalogAtStart.brains.find((b) => b.brainId === "brain-gamma")?.sourceRef ===
      catalogAtStart.brains.find((b) => b.brainId === "brain-alpha")?.sourceRef,
    ownStore: gamma.relationsPath !== alphaAfter.relationsPath,
    s005StillPending: gammaPending.includes("S-005"),
  };

  // A node id valid in both brains, resolved in the one that was asked for.
  const gammaSnapshot = await invoke<MapSnapshot>("map_snapshot", { brainId: "brain-gamma" });
  const sharedId = gammaSnapshot.nodes[3]?.id ?? gammaSnapshot.rootId;
  const inGamma = await invoke<NodeRelations>("map_relations_for_node", {
    reference: { brainId: "brain-gamma", nodeId: sharedId },
  });
  const inAlpha = await invoke<NodeRelations>("map_relations_for_node", {
    reference: { brainId: "brain-alpha", nodeId: sharedId },
  });
  evidence.step8_k5_sharedNodeId = {
    nodeId: sharedId,
    gammaEndpointKey: inGamma.endpointKey,
    alphaEndpointKey: inAlpha.endpointKey,
    keysDiffer: inGamma.endpointKey !== inAlpha.endpointKey,
    gammaReferenceBrain: inGamma.reference.brainId,
    alphaReferenceBrain: inAlpha.reference.brainId,
  };

  // --- metadata, through the applicative path — K7, so step 12 can confirm --
  const renamed = await invoke<BrainRecord>("map_brain_update", {
    brainId: RENAMED_BRAIN,
    displayName: RENAMED_TO.displayName,
    color: RENAMED_TO.color,
    icon: RENAMED_TO.icon,
  });
  const afterRename = await invoke<BrainCatalogView>("map_brains");
  evidence.step9_metadata = {
    renamedBrain: renamed,
    othersUnchanged: afterRename.brains
      .filter((brain) => brain.brainId !== RENAMED_BRAIN)
      .map((brain) => ({
        brainId: brain.brainId,
        displayName: brain.displayName,
        color: brain.color,
        icon: brain.icon,
      })),
  };

  // --- 9. Gamma becomes the active brain -----------------------------------
  showOnly("brain-gamma");
  await settle();
  await waitForCompositionReady();
  const catalogAtEnd = await invoke<BrainCatalogView>("map_brains");
  evidence.step9_activeBrain = {
    activeBrainId: catalogAtEnd.activeBrainId,
    gammaIsActive: catalogAtEnd.activeBrainId === "brain-gamma",
    compositionShows: compositionText(),
    displayedBrainIds: displayedBrainIds(),
  };

  return evidence;
}

/** Steps 10 to 12, in the **second** process, after a real restart. */
async function secondPass(
  deps: BrainScenarioDeps,
  evidence: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const { invoke } = deps;
  const catalog = await invoke<BrainCatalogView>("map_brains");
  const compositionReady = await waitForCompositionReady();
  const renamed = catalog.brains.find((brain) => brain.brainId === RENAMED_BRAIN) ?? null;
  const active = catalog.brains.find((brain) => brain.brainId === catalog.activeBrainId) ?? null;

  return Object.assign(evidence, {
    steps: "K12.10 a K12.12 — apres une fermeture et un redemarrage reels",
    compositionReady,
    activeBrainId: catalog.activeBrainId,
    gammaStillActive: catalog.activeBrainId === "brain-gamma",
    // The interface, not only the catalogue: `K9` asks for both.
    compositionShows: compositionText(),
    displayedBrainIds: displayedBrainIds(),
    // `TASK-0019` §3: the active brain survives, the composition does not.
    restartedOnThatBrainAlone: displayedBrainIds().length === 1,
    interfaceShowsTheActiveBrain: active
      ? focusedChipText().includes(active.displayName)
      : false,
    seededOnThisStart: catalog.seeded,
    seedCreatedNothing: catalog.seeded === 0,
    renamedBrain: renamed,
    metadataSurvived:
      renamed?.displayName === RENAMED_TO.displayName &&
      renamed?.color === RENAMED_TO.color &&
      renamed?.icon === RENAMED_TO.icon,
    // The seed must not have undone the rename — `K7`, after a real restart.
    otherBrains: catalog.brains
      .filter((brain) => brain.brainId !== RENAMED_BRAIN)
      .map((brain) => ({
        brainId: brain.brainId,
        displayName: brain.displayName,
        icon: brain.icon,
        color: brain.color,
      })),
  });
}

/**
 * Runs one pass of `K12` and writes its artefact.
 *
 * `pass` comes from the host — `FILETOPO_AUTO_BRAINS=1` or `=2` — because only
 * the host knows whether this process is the one before the restart or the one
 * after it.
 */
export async function runBrainScenario(
  deps: BrainScenarioDeps,
  pass: 1 | 2,
): Promise<void> {
  const { invoke, host, setStatus, log } = deps;
  // Filled in place, so a throw still leaves behind everything gathered up to
  // the point of failure.
  const evidence: Record<string, unknown> = { pass };

  try {
    log("info", `K12: debut de la passe ${pass}`);
    if (pass === 1) {
      await firstPass(deps, evidence);
    } else {
      await secondPass(deps, evidence);
    }

    const written = await invoke<string>("map_write_run_artifact", {
      name: k12Artifact(pass, "written"),
      contents: JSON.stringify(
        {
          task: "TASK-0026",
          sourceCriterion: "TASK-0018/K12",
          nature: "regression replay",
          doesNotReplace:
            "TASK-0018-K12-webview2-pass{1,2}.json, " +
            "TASK-0019-K12-foundation-regression-webview2-pass{1,2}.json",
          replacesCanonicalEvidence: false,
          criterion: "K12",
          pass,
          capturedAtIso: new Date().toISOString(),
          host,
          evidence,
        },
        null,
        2,
      ),
    });
    log("info", `K12: passe ${pass} terminee, artefact ecrit: ${written}`);
    setStatus(`Scénario K12 (passe ${pass}) écrit dans ${written}`);
  } catch (error) {
    // A failed pass is still a result, and it is written down.
    log("error", `K12: passe ${pass} interrompue: ${String(error)}`);
    setStatus(`Scénario K12 interrompu : ${String(error)}`);
    try {
      await invoke<string>("map_write_run_artifact", {
        name: k12Artifact(pass, "abandoned"),
        contents: JSON.stringify(
          {
            task: "TASK-0026",
            sourceCriterion: "TASK-0018/K12",
            nature: "regression replay",
            replacesCanonicalEvidence: false,
            criterion: "K12",
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
