import { settle, waitForCompositionReady } from "./compositionDriver";
import { afterPaint } from "./measure";
import { pressRealKey, waitUntil, type RealKeyEvidence, type ScenarioLog } from "./realInput";
import {
  PROTECTED_RUN_ARTIFACTS,
  ed15Artifact,
  runtimeWriteOwnership,
} from "./runArtifacts";
import type {
  BrainNodeRef,
  CrossRelationsOverview,
  ExactDuplicateGroupPage,
  ExactDuplicateMemberPage,
  ExactDuplicateSummary,
  HostInfo,
  MapBuildReport,
  RelationsOverview,
  Task0026Ed15Preparation,
} from "./types";

const ALPHA = "brain-alpha";
const BETA = "brain-beta";
const GAMMA = "brain-gamma";
const MARKER = "ED15-KEY-READY";

export interface ExactDuplicateScenarioDeps {
  invoke: <T>(command: string, args?: Record<string, unknown>) => Promise<T>;
  host: HostInfo | null;
  refreshContent: () => void;
  readSelection: () => BrainNodeRef | null;
  setStatus: (message: string) => void;
  log: ScenarioLog;
}

function requireFact(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

function keyEvidence(value: RealKeyEvidence) {
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

function stableRelations(intra: RelationsOverview, cross: CrossRelationsOverview) {
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

function orderedPages(pages: Awaited<ReturnType<typeof directPages>>) {
  return {
    groups: pages.groupPages.flatMap((page) => page.groups.map((group) => group.groupId)),
    members: pages.memberPages.flatMap((page) =>
      page.members.map((member) => member.relativePath),
    ),
  };
}

function control(testId: string): HTMLButtonElement {
  const found = document.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`);
  if (!found) throw new Error(`contrôle ED15 absent: ${testId}`);
  return found;
}

async function summary(deps: ExactDuplicateScenarioDeps, brainId: string) {
  return deps.invoke<ExactDuplicateSummary>("map_exact_duplicate_summary", { brainId });
}

async function groups(deps: ExactDuplicateScenarioDeps, offset: number) {
  return deps.invoke<ExactDuplicateGroupPage>("map_exact_duplicate_groups", {
    brainId: ALPHA,
    offset,
    limit: 50,
  });
}

async function members(deps: ExactDuplicateScenarioDeps, groupId: string, offset: number) {
  return deps.invoke<ExactDuplicateMemberPage>("map_exact_duplicate_members", {
    brainId: ALPHA,
    groupId,
    offset,
    limit: 50,
  });
}

function assertTrusted(key: RealKeyEvidence, label: string) {
  requireFact(key.keydownIsTrusted === true, `${label}: keydown non fiable`);
  requireFact(key.activationIsTrusted === true, `${label}: activation non fiable`);
  requireFact(key.programmaticClickCalls === 0, `${label}: click() programmatique`);
  requireFact(key.programmaticClickDispatches === 0, `${label}: dispatch click programmatique`);
}

async function openExplorer(deps: ExactDuplicateScenarioDeps): Promise<RealKeyEvidence> {
  const key = await pressRealKey(
    control("open-duplicate-explorer"),
    "{ENTER}",
    () => document.querySelector('[data-testid="duplicate-group-page"]') !== null,
    deps.log,
    90_000,
    MARKER,
  );
  assertTrusted(key, "ouverture explorateur");
  return key;
}

async function nextGroupPage(deps: ExactDuplicateScenarioDeps, expectedStart: string) {
  const key = await pressRealKey(
    control("duplicate-groups-next"),
    "{ENTER}",
    () =>
      document
        .querySelector('[data-testid="duplicate-group-page"]')
        ?.textContent?.includes(expectedStart) === true,
    deps.log,
    90_000,
    MARKER,
  );
  assertTrusted(key, `pagination groupes ${expectedStart}`);
  return key;
}

async function openEmptyGroup(deps: ExactDuplicateScenarioDeps) {
  const button = [...document.querySelectorAll<HTMLButtonElement>('[data-testid="duplicate-group"]')]
    .find((entry) => entry.textContent?.includes("contenu vide"));
  if (!button) throw new Error("groupe vide absent de la troisième page");
  const key = await pressRealKey(
    button,
    "{ENTER}",
    () => document.querySelector('[data-testid="duplicate-member-page"]') !== null,
    deps.log,
    90_000,
    MARKER,
  );
  assertTrusted(key, "ouverture groupe vide");
  return key;
}

async function nextMemberPage(deps: ExactDuplicateScenarioDeps, expectedStart: string) {
  const key = await pressRealKey(
    control("duplicate-members-next"),
    "{ENTER}",
    () =>
      document
        .querySelector('[data-testid="duplicate-member-page"]')
        ?.textContent?.includes(expectedStart) === true,
    deps.log,
    90_000,
    MARKER,
  );
  assertTrusted(key, `pagination membres ${expectedStart}`);
  return key;
}

async function directPages(deps: ExactDuplicateScenarioDeps) {
  const groupPages = [await groups(deps, 0), await groups(deps, 50), await groups(deps, 100)];
  requireFact(groupPages.map((page) => page.returned).join(",") === "50,50,25", "pagination groupes inexacte");
  requireFact(groupPages.every((page) => page.totalGroups === 125 && page.maxLimit === 100), "total/plafond groupes inattendu");
  const allGroups = groupPages.flatMap((page) => page.groups);
  requireFact(new Set(allGroups.map((group) => group.groupId)).size === 125, "groupes fusionnés ou dupliqués");
  const empty = allGroups.find((group) => group.emptyContent);
  requireFact(empty?.memberCount === 125, "groupe vide absent ou inexact");
  const memberPages = [
    await members(deps, empty.groupId, 0),
    await members(deps, empty.groupId, 50),
    await members(deps, empty.groupId, 100),
  ];
  requireFact(memberPages.map((page) => page.returned).join(",") === "50,50,25", "pagination membres inexacte");
  requireFact(memberPages.every((page) => page.totalMembers === 125 && page.maxLimit === 100), "total/plafond membres inattendu");
  return { groupPages, memberPages, empty };
}

async function relationState(deps: ExactDuplicateScenarioDeps) {
  const [intra, cross] = await Promise.all([
    deps.invoke<RelationsOverview>("map_relations_open", { brainId: ALPHA }),
    deps.invoke<CrossRelationsOverview>("map_cross_relations_open"),
  ]);
  return stableRelations(intra, cross);
}

async function writeEvidence(
  deps: ExactDuplicateScenarioDeps,
  pass: 1 | 2,
  payload: Record<string, unknown>,
) {
  const ownership = runtimeWriteOwnership();
  const destination = ed15Artifact(pass);
  requireFact(ownership.owningTaskId === "TASK-0026", "propriétaire runtime inattendu");
  // Since `ACTION-0043` sealed both `ED15` passes, this refuses in this
  // checkout — the campaign that produced the canonical evidence cannot
  // overwrite it. That is the gate working, not a scenario to repair.
  requireFact(
    !(PROTECTED_RUN_ARTIFACTS as readonly string[]).includes(destination),
    `destination protégée par X5: ${destination}`,
  );
  return deps.invoke<string>("map_write_run_artifact", {
    name: destination,
    contents: JSON.stringify(
      {
        task: "TASK-0026",
        criterion: "ED15",
        pass,
        realHost: true,
        capturedAtIso: new Date().toISOString(),
        host: deps.host,
        runtimeOwnership: ownership,
        protectedArtifactCount: PROTECTED_RUN_ARTIFACTS.length,
        ...payload,
      },
      null,
      2,
    ),
  });
}

async function passOne(deps: ExactDuplicateScenarioDeps) {
  const [betaBefore, gammaBefore] = await Promise.all([
    summary(deps, BETA),
    summary(deps, GAMMA),
  ]);
  const preparation = await deps.invoke<Task0026Ed15Preparation>("map_task0026_ed15_prepare");
  requireFact(preparation.totalFiles === 1_200, "source ED15 non volumineuse");
  requireFact(preparation.report.filesOpenedForHash === 1_200, "tous les fichiers ne sont pas ouverts");
  requireFact(preparation.report.digestsComputed === 1_200, "tous les digests ne sont pas calculés");
  requireFact(preparation.report.sourceFingerprintBefore === preparation.report.sourceFingerprintAfter, "source modifiée pendant la campagne");
  deps.refreshContent();
  const ready = await waitUntil(
    () => control("open-duplicate-explorer").dataset.totalGroups === "125",
    90_000,
  );
  requireFact(ready.settled, "résumé ED15 absent de l'interface");

  const summaryOne = await summary(deps, ALPHA);
  requireFact(summaryOne.exactGroupCount === 125, "résumé groupes inexact");
  requireFact(summaryOne.groupedOccurrenceCount === 373, "résumé occurrences inexact");
  requireFact(summaryOne.emptyGroupCount === 1, "résumé groupes vides inexact");
  const pages = await directPages(deps);
  const repeatedPages = await directPages(deps);
  requireFact(
    JSON.stringify(orderedPages(repeatedPages)) === JSON.stringify(orderedPages(pages)),
    "ordre instable sur des pages répétées",
  );
  requireFact(pages.memberPages.every((page) => page.unresolvedReturned === 0), "membre ED15 non résolu avant rebuild");

  const relationsBefore = await relationState(deps);
  const openKey = await openExplorer(deps);
  const groupNextOne = await nextGroupPage(deps, "51–100");
  const groupNextTwo = await nextGroupPage(deps, "101–125");
  const emptyKey = await openEmptyGroup(deps);
  const memberNextOne = await nextMemberPage(deps, "51–100");
  const memberNextTwo = await nextMemberPage(deps, "101–125");
  const target = pages.memberPages[2].members[0];
  requireFact(target.nodeRef !== null, "membre cible non résolu");
  const memberButton = control("duplicate-member");
  const memberKey = await pressRealKey(
    memberButton,
    "{ENTER}",
    () => {
      const selected = deps.readSelection();
      return selected?.brainId === target.nodeRef?.brainId && selected?.nodeId === target.nodeRef?.nodeId;
    },
    deps.log,
    90_000,
    MARKER,
  );
  assertTrusted(memberKey, "navigation membre");
  const relationsAfter = await relationState(deps);
  requireFact(JSON.stringify(relationsAfter) === JSON.stringify(relationsBefore), "consultation a modifié les relations");
  const [betaAfter, gammaAfter] = await Promise.all([
    summary(deps, BETA),
    summary(deps, GAMMA),
  ]);
  requireFact(betaAfter.generationId === betaBefore.generationId && betaAfter.exactGroupCount === betaBefore.exactGroupCount, "cerveau Bêta modifié");
  requireFact(gammaAfter.generationId === gammaBefore.generationId && gammaAfter.exactGroupCount === gammaBefore.exactGroupCount, "autre cerveau modifié");

  const secondCampaign = await deps.invoke<Task0026Ed15Preparation>("map_task0026_ed15_prepare");
  requireFact(secondCampaign.report.generationId !== preparation.report.generationId, "génération réutilisée");
  requireFact(secondCampaign.report.filesOpenedForHash === 1_200, "second run: fichiers non rouverts");
  requireFact(secondCampaign.report.digestsComputed === 1_200, "second run: digests non recalculés");
  requireFact(secondCampaign.report.bytesRead === preparation.report.bytesRead, "second run: octets non relus à l'identique");
  requireFact(secondCampaign.report.sourceFingerprintBefore === preparation.report.sourceFingerprintBefore, "source changée entre campagnes");

  return writeEvidence(deps, 1, {
    freshVariant: true,
    preparation,
    summary: summaryOne,
    pagination: pages,
    repeatedPageOrderStable: true,
    ui: {
      open: keyEvidence(openKey),
      groupNextOne: keyEvidence(groupNextOne),
      groupNextTwo: keyEvidence(groupNextTwo),
      emptyGroup: keyEvidence(emptyKey),
      memberNextOne: keyEvidence(memberNextOne),
      memberNextTwo: keyEvidence(memberNextTwo),
      memberNavigation: keyEvidence(memberKey),
      boundary: document.querySelector('[data-testid="duplicate-boundary"]')?.textContent ?? null,
      digestLength: document.querySelector('[data-testid="duplicate-digest"]')?.textContent?.length ?? 0,
    },
    secondExplicitUnchangedCampaign: secondCampaign,
    noSizeMtimeCache: true,
    relationsBefore,
    relationsAfter,
    relationStoresUnchanged: true,
    betaBefore,
    betaAfter,
    gammaBefore,
    gammaAfter,
  });
}

async function passTwo(deps: ExactDuplicateScenarioDeps) {
  const rebuiltMap = await deps.invoke<MapBuildReport>("map_open", {
    brainId: ALPHA,
    rebuild: true,
  });
  const persisted = await summary(deps, ALPHA);
  requireFact(persisted.availability === "AVAILABLE", "résumé non persisté au restart");
  requireFact(persisted.exactGroupCount === 125, "groupes non persistés au restart");
  const pages = await directPages(deps);
  const repeatedPages = await directPages(deps);
  requireFact(
    JSON.stringify(orderedPages(repeatedPages)) === JSON.stringify(orderedPages(pages)),
    "ordre instable après redémarrage",
  );
  requireFact(
    pages.groupPages.every((page) => page.generationId === persisted.generationId),
    "ordre/pages hors génération persistée",
  );
  requireFact(
    pages.memberPages[0].unresolvedReturned === pages.memberPages[0].returned,
    "rebuild map: membres non résolus non signalés honnêtement",
  );
  const relationsBefore = await relationState(deps);
  const openKey = await openExplorer(deps);
  const groupNextOne = await nextGroupPage(deps, "51–100");
  const groupNextTwo = await nextGroupPage(deps, "101–125");
  const emptyKey = await openEmptyGroup(deps);
  const relationsAfter = await relationState(deps);
  requireFact(JSON.stringify(relationsAfter) === JSON.stringify(relationsBefore), "consultation après restart a modifié les relations");
  const sourceCheck = await deps.invoke<Task0026Ed15Preparation>("map_task0026_ed15_prepare");
  requireFact(sourceCheck.report.sourceFingerprintBefore === sourceCheck.report.sourceFingerprintAfter, "source changée après restart");
  return writeEvidence(deps, 2, {
    realRestart: true,
    rebuiltMap,
    persistedBeforeNewCampaign: persisted,
    paginationBeforeNewCampaign: pages,
    sameGenerationAndOrderAtLoad: true,
    repeatedPageOrderStable: true,
    unresolvedAfterMapRebuildReported: true,
    ui: {
      open: keyEvidence(openKey),
      groupNextOne: keyEvidence(groupNextOne),
      groupNextTwo: keyEvidence(groupNextTwo),
      emptyGroup: keyEvidence(emptyKey),
      boundary: document.querySelector('[data-testid="duplicate-boundary"]')?.textContent ?? null,
    },
    relationsBefore,
    relationsAfter,
    relationStoresUnchanged: true,
    sourceCheck,
    sourceUnchanged: true,
  });
}

export async function runExactDuplicateScenario(
  deps: ExactDuplicateScenarioDeps,
  pass: 1 | 2,
) {
  try {
    await waitForCompositionReady();
    await settle();
    const written = pass === 1 ? await passOne(deps) : await passTwo(deps);
    await afterPaint();
    deps.setStatus(`ED15 passe ${pass} écrite dans ${written}`);
  } catch (error) {
    deps.log("error", `ED15 passe ${pass} interrompue: ${String(error)}`);
    deps.setStatus(`ED15 interrompu : ${String(error)}`);
  }
}
