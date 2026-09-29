/**
 * `J12` of `TASK-0017`, replayed against the real host, unattended.
 *
 * **Since `TASK-0018`, this is a regression replay, not `J12` itself.** The
 * scenario runs on `brain-alpha` and its artefact carries a `TASK-0018` name —
 * reserve `X5`. `TASK-0017`'s own published proof is never a destination here.
 *
 * Driven through the **same** DOM and the **same** commands a person would
 * use: the map's own key handler receives real `keydown` events, the panel's
 * buttons receive real click events, and every count is read back from the
 * store rather than recomputed here.
 *
 * **Reserve `X4`.** A script cannot forge a *trusted* key press, so the first
 * version of this scenario activated the panel entry programmatically and said
 * so. That is not what the freeze asks for. This version does not activate
 * anything itself: it focuses the control, prints a marker on the host's
 * standard output, and waits for a **real Windows keystroke** sent by
 * `scripts/j12-send-real-key.ps1` through `WScript.Shell`. What the page then
 * records is the click's own `isTrusted` flag — `true` only for an activation
 * the browser generated from real input — together with counters proving that
 * **no programmatic activation was used**.
 *
 * If the keystroke never arrives, the scenario fails and says so. It never
 * falls back to a synthetic click.
 */

import { bilingual, type StatusMessage } from "./localeText";
import { domNodeId } from "./composedView";
import { afterPaint } from "./measure";
import { pressRealKey, waitUntil } from "./realInput";
import {
  J12_REGRESSION_ABANDON_ARTIFACT,
  J12_REGRESSION_ARTIFACT,
} from "./runArtifacts";
import type {
  BrainNodeRef,
  HostInfo,
  MapSnapshot,
  NodeRelations,
  RelationsOverview,
  RelationsSelfCheck,
} from "./types";

export interface ScenarioDeps {
  invoke: <T>(command: string, args?: Record<string, unknown>) => Promise<T>;
  host: HostInfo | null;
  /**
   * Reduces the composed view to this brain alone, `TASK-0019` §4.4.
   *
   * `J12` is a **single-brain** scenario and stays one: what it replays must
   * be the composition `C1`, not whatever composition the previous scenario
   * happened to leave on screen.
   */
  showOnly: (brainId: string) => void;
  /**
   * `TASK-0050` §S / `ACTION-0089` correction: the product's own navigation
   * (`MapApp.selectNode`), never a raw React setter. `selectNode` already
   * detects a node outside the current bounded projection
   * (`!hierarchy.byId.has(reference.nodeId)`) and calls `changeProjection`,
   * which fetches a fresh `map_view` centred on it. A raw setter bypasses
   * that entirely and leaves the scenario pointing at a selection the
   * bounded view (`DEC-0034`) never materialised — the exact regression
   * `ACTION-0089` diagnosed. Named `selectNode`, not `setSelected`, so a
   * future maintainer cannot quietly put a raw setter back here.
   */
  selectNode: (reference: BrainNodeRef) => void;
  setStatus: (message: StatusMessage) => void;
  log: (level: "info" | "error", message: string) => void;
}

/**
 * The brain `J12` runs against.
 *
 * `TASK-0018` renames the axis without touching the criterion: `brain-alpha`
 * reads the very same frozen `quasi-empty` tree the scenario was written for,
 * so what `J12` proves is unchanged. Nothing of `J1`-`J12` is retouched here.
 */
const BRAIN = "brain-alpha";
const PIVOT_PATH = "dossier-a/note-1.txt";

async function settle(): Promise<void> {
  await afterPaint();
  await afterPaint();
}

function textOf(selector: string): string {
  return document.querySelector(selector)?.textContent?.trim() ?? "";
}

function countOf(selector: string): number {
  return document.querySelectorAll(selector).length;
}

/**
 * `TASK-0050` §S / `ACTION-0089`: a selection that may target a node outside
 * the current bounded projection is not proved by calling `selectNode` alone
 * — `changeProjection` is async and re-renders once its own `map_view`
 * round trip resolves. Wait for the node's own card to exist in the bounded
 * DOM **and** for the canvas's `aria-activedescendant` (`MapView.tsx`,
 * `TASK-0047`) to name it before reading the panel or the map for that
 * selection; both together, not the card alone, because the card can be
 * drawn slightly ahead of the selection state settling.
 */
async function waitForSelectionMaterialized(
  brainId: string,
  nodeId: number,
): Promise<{ settled: boolean; waitedMs: number; frames: number }> {
  const expectedActiveDescendant = domNodeId(brainId, nodeId);
  return waitUntil(() => {
    const card = document.querySelector(
      `.map-view [data-brain-id="${brainId}"][data-node-id="${nodeId}"]`,
    );
    const canvas = document.querySelector<SVGSVGElement>(".map-view__canvas");
    return (
      card !== null &&
      canvas?.getAttribute("aria-activedescendant") === expectedActiveDescendant
    );
  });
}

function styleOf(
  selector: string,
  property: "opacity" | "fillOpacity" | "strokeOpacity" | "strokeDasharray" | "strokeWidth",
): string | null {
  const element = document.querySelector(selector);
  return element ? window.getComputedStyle(element)[property] : null;
}

/**
 * `TASK-0050` §Q/§ACTION-0088 evidence only — read-only, additive. Reads the
 * same `data-legend-keys` contract `MapView` already emits; adds no new
 * markup and changes nothing about what is drawn.
 */
function legendKeysOnScreen(): string[] {
  const keys = new Set<string>();
  for (const element of document.querySelectorAll(".map-view [data-legend-keys]")) {
    for (const key of (element.getAttribute("data-legend-keys") ?? "").split(/\s+/)) {
      if (key) keys.add(key);
    }
  }
  return [...keys].sort();
}

/**
 * `TASK-0050` §4 evidence only. Reads back the live element's own class and
 * computed style, grouped by its shared `map-*` classes — the same shape
 * `scripts/task0050-webview2.mjs` already computes for the legend/map
 * comparison, so `TASK-0050`'s combiner can compare this against that
 * script's legend-side sample of the same key without opening the legend
 * inside this scenario.
 */
function classSignature(selector: string): {
  exercisedOnMap: boolean;
  sharedClasses?: string[];
  byClass?: Record<string, { className: string | null } & Record<string, string | null>>;
} {
  const live = document.querySelector(selector);
  if (!live) return { exercisedOnMap: false };
  const elements = [live, ...live.querySelectorAll("rect,path,line,circle,text")];
  const byClass: Record<string, { className: string | null } & Record<string, string | null>> = {};
  for (const element of elements) {
    const classes = [...element.classList].filter((name) => /^map-/.test(name));
    if (classes.length === 0) continue;
    const classKey = classes.slice().sort().join(" ");
    if (byClass[classKey]) continue;
    const style = window.getComputedStyle(element);
    byClass[classKey] = {
      className: element.getAttribute("class"),
      strokeWidth: style.strokeWidth,
      strokeDasharray: style.strokeDasharray,
      fillOpacity: style.fillOpacity,
      fontWeight: style.fontWeight,
      opacity: style.opacity,
    };
  }
  return {
    exercisedOnMap: true,
    sharedClasses: [
      ...new Set(elements.flatMap((element) => [...element.classList].filter((name) => /^map-/.test(name)))),
    ],
    byClass,
  };
}

export async function runRelationScenario(deps: ScenarioDeps): Promise<void> {
  const { invoke, host, showOnly, selectNode, setStatus, log } = deps;
  const evidence: Record<string, unknown> = { brainId: BRAIN };

  try {
    // `TASK-0050` §Q/ACTION-0088 discovery: replayed against a genuinely
    // disposable `FILETOPO_SANDBOX_VARIANT` (a fresh, empty catalogue, unlike
    // whatever persistent dev storage this scenario last ran against),
    // `brain-alpha` is registered but its Index is not yet built — the same
    // "Indexer" gesture `scripts/task0050-webview2.mjs` already performs for
    // its own alpha/gamma instances. Without it, every relations command
    // below refuses with `map_not_built` and nothing here is a J12 result at
    // all. This does not touch what J12 measures — only makes the brain it
    // measures exist first, in this disposable sandbox, exactly once.
    log("info", "J12: préparation de l'index synthétique de brain-alpha");
    await invoke("map_prepare_synthetic_source", { brainId: BRAIN });
    await invoke("map_rebuild", { brainId: BRAIN });

    log("info", "J12: ouverture du cerveau et des relations");
    // The application boots on its own active brain, and that boot is itself a
    // composition being applied. Asking for `brain-alpha` before the catalogue
    // has arrived asks for a brain no order knows yet — and the boot that
    // lands afterwards puts its own brain back on screen. The first run under
    // the composition bar did exactly that and waited a full minute for a
    // brain it had been overruled on. So: wait for the boot, then ask.
    const barReady = await waitUntil(() => {
      const chips = [...document.querySelectorAll<HTMLButtonElement>(".composition__focus")];
      return chips.length > 0 && chips.every((chip) => !chip.disabled);
    }, 60_000);
    showOnly(BRAIN);
    await settle();
    // `showOnly` starts the composition; it does not finish it. The control it
    // replaced was awaited, and reading the panel two frames after asking cost
    // a run: the relations panel was still the previous brain's, empty, and the
    // scenario abandoned on its own impatience. Wait for the bar to show this
    // brain alone and to be operable again.
    const opened = await waitUntil(
      () => {
        const displayed = [...document.querySelectorAll<HTMLElement>(".composition__focus")];
        return (
          displayed.length === 1 &&
          displayed[0].dataset.brainId === BRAIN &&
          !(displayed[0] as HTMLButtonElement).disabled
        );
      },
      60_000,
    );
    evidence.opened = {
      barReady: barReady.settled,
      barReadyWaitedMs: Math.round(barReady.waitedMs),
      settled: opened.settled,
      waitedMs: Math.round(opened.waitedMs),
    };
    if (!opened.settled) {
      throw new Error(
        `J12: ${BRAIN} n'est pas affiche seul apres ${Math.round(opened.waitedMs)} ms ` +
          `(barre prete=${barReady.settled})`,
      );
    }
    await settle();

    // `map_snapshot` is kept only for proof metadata (`fixtureId`) — never
    // for resolving the pivot. Since `DEC-0034`, `BrainIndex::snapshot()`
    // calls `materialize_view(self, None, None)`, a **bounded** view (root
    // and direct children only for a fresh index), not a flat corpus dump.
    // `TASK-0050` §R/§S / `ACTION-0089`: looking up `PIVOT_PATH` in
    // `snapshot.nodes` regressed once that bound existed. The product's own
    // `map_resolve_node` command resolves a relative path to a `BrainNodeRef`
    // regardless of what is currently materialised on screen.
    const snapshot = await invoke<MapSnapshot>("map_snapshot", { brainId: BRAIN });
    const overview = await invoke<RelationsOverview>("map_relations_open", {
      brainId: BRAIN,
    });
    evidence.fixtureId = snapshot.fixtureId;
    evidence.relationsPath = overview.relationsPath;

    evidence.overview = {
      established: overview.established.length,
      deterministic: overview.deterministicCount,
      approved: overview.approvedCount,
      pendingSuggestions: overview.pendingSuggestionCount,
      unresolvedEndpoints: overview.unresolvedEndpoints,
      endpointKeyScheme: overview.endpointKeyScheme,
      deterministicDigest: overview.deterministicDigest,
      rules: overview.rules,
    };

    // 1. A node with relations in both directions, resolved through the
    //    product's own command — never through the bounded `map_snapshot`
    //    (`TASK-0050` §S / `ACTION-0089`).
    const pivotRef = await invoke<BrainNodeRef | null>("map_resolve_node", {
      brainId: BRAIN,
      relativePath: PIVOT_PATH,
    });
    if (!pivotRef || pivotRef.brainId !== BRAIN) {
      throw new Error(
        `noeud introuvable ou incoherent: ${PIVOT_PATH} (reference=${JSON.stringify(pivotRef)})`,
      );
    }
    const pivotId = pivotRef.nodeId;
    // The pivot can be outside the current bounded projection: navigate
    // through the product's own `selectNode`, which calls `changeProjection`
    // when needed, then wait for the node to actually materialise and become
    // the active descendant before reading anything about it.
    selectNode({ brainId: BRAIN, nodeId: pivotId });
    await settle();
    const pivotMaterialized = await waitForSelectionMaterialized(BRAIN, pivotId);
    evidence.pivotMaterialized = {
      settled: pivotMaterialized.settled,
      waitedMs: Math.round(pivotMaterialized.waitedMs),
    };
    if (!pivotMaterialized.settled) {
      throw new Error(
        `J12: le pivot ${PIVOT_PATH} (nodeId=${pivotId}) ne s'est pas materialise/selectionne ` +
          `apres ${Math.round(pivotMaterialized.waitedMs)} ms`,
      );
    }

    const pivot = await invoke<NodeRelations>("map_relations_for_node", {
      reference: { brainId: BRAIN, nodeId: pivotId },
    });
    evidence.pivot = {
      relativePath: PIVOT_PATH,
      outgoingCount: pivot.outgoingCount,
      incomingCount: pivot.incomingCount,
      pendingSuggestions: pivot.suggestions.map((entry) => entry.suggestionKey),
      hasBothDirections: pivot.outgoingCount > 0 && pivot.incomingCount > 0,
    };

    // 2. The panel, read off the screen — but only once the screen has caught
    //    up with the selection.
    const panelSettled = await waitUntil(
      () =>
        textOf('[data-testid="relation-totals"]').startsWith(
          `${pivot.outgoingCount} sortante(s)`,
        ) && countOf(".relations__direction .relation__link") === pivot.outgoingCount + pivot.incomingCount,
    );
    evidence.panel = {
      settled: panelSettled.settled,
      waitedMs: Math.round(panelSettled.waitedMs),
      directionSections: [...document.querySelectorAll(".relations__direction")].map(
        (section) => section.getAttribute("aria-label") ?? "",
      ),
      entryCount: countOf(".relations__direction .relation__link"),
      provenanceLabels: [...document.querySelectorAll(".relation__provenance")].map(
        (element) => element.textContent?.trim() ?? "",
      ),
      ruleLines: [...document.querySelectorAll(".relation__rule")].map(
        (element) => element.textContent?.trim() ?? "",
      ),
      totals: textOf('[data-testid="relation-totals"]'),
    };

    // 3. The map's own keyboard, genuinely exercised: real `keydown` events on
    //    the focusable widget, handled by the component's own handler.
    const canvas = document.querySelector<SVGSVGElement>(".map-view__canvas");
    canvas?.focus();
    const activeBefore = canvas?.getAttribute("aria-activedescendant") ?? null;
    canvas?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
    await settle();
    const activeAfterUp = canvas?.getAttribute("aria-activedescendant") ?? null;
    canvas?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    await settle();
    evidence.mapKeyboard = {
      focusReached: document.activeElement === canvas,
      activeBefore,
      activeAfterArrowUp: activeAfterUp,
      activeAfterArrowDown: canvas?.getAttribute("aria-activedescendant") ?? null,
      selectionMoved: activeBefore !== activeAfterUp,
    };

    // 4. One relation traversed from the panel — by a REAL keystroke.
    //
    //    Reserve `X4`. Nothing here activates the entry: the page focuses it
    //    and waits for a keystroke that comes through the Windows input path.
    selectNode({ brainId: BRAIN, nodeId: pivotId });
    await settle();
    const pivotReselected = await waitForSelectionMaterialized(BRAIN, pivotId);
    if (!pivotReselected.settled) {
      throw new Error(
        `J12: le pivot ${PIVOT_PATH} (nodeId=${pivotId}) ne s'est pas reselectionne ` +
          `apres ${Math.round(pivotReselected.waitedMs)} ms`,
      );
    }
    await waitUntil(() => countOf(".relations__direction .relation__link") > 0);
    const entry = document.querySelector<HTMLButtonElement>(
      ".relations__direction .relation__link",
    );
    if (!entry) {
      throw new Error(
        `aucune entree de relation dans le panneau apres ${Math.round(
          panelSettled.waitedMs,
        )} ms d'attente; panneau stabilise=${panelSettled.settled}`,
      );
    }
    const entryLabel = entry.textContent?.trim() ?? "";
    const activeDescendantBefore = canvas?.getAttribute("aria-activedescendant") ?? null;

    const keyEvidence = await pressRealKey(
      entry,
      "{ENTER}",
      () => canvas?.getAttribute("aria-activedescendant") !== activeDescendantBefore,
      log,
    );
    const activeAfterEntry = canvas?.getAttribute("aria-activedescendant") ?? null;

    // The expected endpoint is read **off the entry that was activated**, and
    // then confirmed against the store.
    //
    // The panel groups by direction then by type; the index sorts by endpoint
    // key. The first run of this step compared the selection to
    // `outgoing[0]` — an ordering the screen never claimed — and published
    // `selectionFollowedTheRelation: false` for a product that was right. The
    // entry now carries its own endpoint, and the store is asked whether that
    // endpoint really is one of the pivot's relations, so the check is neither
    // an assumption about ordering nor a tautology.
    const expectedEndpointKey = entry.dataset.endpointKey ?? null;
    const expectedEndpointId = entry.dataset.endpointNodeId
      ? Number(entry.dataset.endpointNodeId)
      : null;
    const storeAgreesTheEntryIsARelation = [...pivot.outgoing, ...pivot.incoming].some(
      (candidate) =>
        candidate.other.key === expectedEndpointKey &&
        candidate.direction === entry.dataset.direction &&
        candidate.relationType === entry.dataset.relationType &&
        candidate.provenance === entry.dataset.provenance,
    );

    evidence.traversal = {
      entryLabel,
      entryTag: entry.tagName,
      entryDisabled: entry.disabled,
      ...keyEvidence,
      activeDescendantBefore,
      activeDescendantAfterKeystroke: activeAfterEntry,
      expectedEndpointKey,
      expectedEndpointNodeId: expectedEndpointId,
      expectedActiveDescendant:
        expectedEndpointId === null ? null : domNodeId(BRAIN, expectedEndpointId),
      storeAgreesTheEntryIsARelation,
      selectionFollowedTheRelation:
        expectedEndpointId !== null &&
        storeAgreesTheEntryIsARelation &&
        activeAfterEntry === domNodeId(BRAIN, expectedEndpointId),
      noProgrammaticActivationUsed:
        keyEvidence.programmaticClickCalls === 0 &&
        keyEvidence.programmaticClickDispatches === 0,
      changeCameFromTheKeystroke:
        keyEvidence.activationIsTrusted === true &&
        keyEvidence.observedChange &&
        keyEvidence.programmaticClickCalls === 0 &&
        keyEvidence.programmaticClickDispatches === 0,
    };

    if (
      expectedEndpointId === null ||
      !storeAgreesTheEntryIsARelation ||
      activeAfterEntry !== domNodeId(BRAIN, expectedEndpointId)
    ) {
      throw new Error(
        `J12/J7: la frappe a change la selection en ${String(activeAfterEntry)}, ` +
          `alors que l'entree activee menait a ${String(expectedEndpointId === null ? null : domNodeId(BRAIN, expectedEndpointId))} ` +
          `(cle ${String(expectedEndpointKey)}, confirmee par l'index=` +
          `${storeAgreesTheEntryIsARelation}).`,
      );
    }

    if (keyEvidence.activationIsTrusted !== true || !keyEvidence.observedChange) {
      throw new Error(
        `J12/X4: aucune frappe clavier reelle n'a active l'entree du panneau ` +
          `(isTrusted=${String(keyEvidence.activationIsTrusted)}, ` +
          `changement=${keyEvidence.observedChange}, ` +
          `attente=${keyEvidence.waitedMs} ms). Aucune activation programmatique ` +
          `n'est utilisee en remplacement.`,
      );
    }

    // 5. Accentuation, counted on the rendered map.
    //
    //    Attenuation lives on the rectangle's fill and stroke opacity, not on
    //    the group's `opacity`: the first run read the group and published a
    //    flat `1` that said nothing. The stroke pattern is read too, because
    //    that is the part that does not rely on colour.
    evidence.accentuation = {
      selected: countOf(".map-node--selected"),
      relatedHierarchy: countOf(".map-node--related"),
      linkedByRelation: countOf(".map-node--linked"),
      attenuated: countOf(".map-node--plain"),
      attenuatedFillOpacity: styleOf(".map-node--plain rect", "fillOpacity"),
      attenuatedStrokeOpacity: styleOf(".map-node--plain rect", "strokeOpacity"),
      selectedFillOpacity: styleOf(".map-node--selected rect", "fillOpacity"),
      selectedStrokeWidth: styleOf(".map-node--selected rect", "strokeWidth"),
      relatedStrokeWidth: styleOf(".map-node--related rect", "strokeWidth"),
      linkedStrokeWidth: styleOf(".map-node--linked rect", "strokeWidth"),
      linkedStrokeDashArray: styleOf(".map-node--linked rect", "strokeDasharray"),
      attenuatedStrokeDashArray: styleOf(".map-node--plain rect", "strokeDasharray"),
      attenuatedKeepsAccessibleName:
        (document.querySelector(".map-node--plain")?.getAttribute("aria-label") ?? "").length > 0,
      attenuatedStaysInTheTree: countOf('.map-node--plain[role="treeitem"]') > 0,
    };

    // 6. Suggestions on the map, distinct from established relations without
    //    relying on colour: no arrow head, a dashed stroke, open rings.
    evidence.suggestionRendering = {
      establishedEdges: countOf(".map-edge--established"),
      suggestionEdges: countOf(".map-edge--suggestion"),
      establishedArrowHeads: countOf(".map-edge--established .map-edge__arrow"),
      suggestionArrowHeads: countOf(".map-edge--suggestion .map-edge__arrow"),
      suggestionRings: countOf(".map-edge--suggestion .map-edge__ring"),
      establishedDashArray: styleOf(".map-edge--established .map-edge__line", "strokeDasharray"),
      suggestionDashArray: styleOf(".map-edge--suggestion .map-edge__line", "strokeDasharray"),
      suggestionCardsOnScreen: countOf(".suggestion"),
      suggestionTagText: textOf(".suggestion__tag"),
    };

    // `TASK-0050` §2/§4 evidence only: the real `intra-suggestion` legend key,
    // materialised on screen right now by the pending suggestion edge above,
    // read back the same way the map itself is read — plus its class/style
    // signature for the cross-cell comparison against the legend sample.
    evidence.intraSuggestionProof = {
      legendKeysOnScreen: legendKeysOnScreen(),
      hasIntraSuggestion: legendKeysOnScreen().includes("intra-suggestion"),
      signature: classSignature('.map-view [data-legend-keys~="intra-suggestion"]'),
    };

    // 7. Approval, with the counts before and after — both read from the store.
    const pending = overview.pendingSuggestions[0];
    if (!pending) throw new Error("aucune suggestion en attente a approuver");
    const holderId = pending.source.nodeId;
    if (holderId === null) throw new Error("suggestion sans extremite resolue");
    selectNode({ brainId: BRAIN, nodeId: holderId });
    await settle();
    const holderMaterialized = await waitForSelectionMaterialized(BRAIN, holderId);
    if (!holderMaterialized.settled) {
      throw new Error(
        `J12: l'extremite ${holderId} de la suggestion ne s'est pas materialisee/selectionnee ` +
          `apres ${Math.round(holderMaterialized.waitedMs)} ms`,
      );
    }

    const before = await invoke<NodeRelations>("map_relations_for_node", {
      reference: { brainId: BRAIN, nodeId: holderId },
    });
    await waitUntil(() =>
      [...document.querySelectorAll<HTMLButtonElement>(".suggestion__approve")].some((button) =>
        button.textContent?.includes(pending.suggestionKey),
      ),
    );
    const approveButton = [
      ...document.querySelectorAll<HTMLButtonElement>(".suggestion__approve"),
    ].find((button) => button.textContent?.includes(pending.suggestionKey));
    if (!approveButton) {
      throw new Error(`bouton d'approbation absent: ${pending.suggestionKey}`);
    }

    // The approval is a real key press too. `J12` calls it "approuver une
    // suggestion synthétique"; a click a script sent is not a person
    // approving anything.
    const approvalKeyEvidence = await pressRealKey(
      approveButton,
      "{ENTER}",
      () =>
        ![...document.querySelectorAll(".suggestion__approve")].some((button) =>
          button.textContent?.includes(pending.suggestionKey),
        ),
      log,
    );

    if (
      approvalKeyEvidence.activationIsTrusted !== true ||
      !approvalKeyEvidence.observedChange
    ) {
      throw new Error(
        `J12/X4: aucune frappe clavier reelle n'a approuve ${pending.suggestionKey} ` +
          `(isTrusted=${String(approvalKeyEvidence.activationIsTrusted)}, ` +
          `changement=${approvalKeyEvidence.observedChange}, ` +
          `attente=${approvalKeyEvidence.waitedMs} ms).`,
      );
    }

    // `TASK-0050` §2/§4 evidence only: the real `intra-approved` legend key,
    // read back only once the render has settled after the real keystroke
    // above created it — never before, so this cannot pass on the pending
    // suggestion's own class by mistake.
    await settle();
    evidence.intraApprovedProof = {
      legendKeysOnScreen: legendKeysOnScreen(),
      hasIntraApproved: legendKeysOnScreen().includes("intra-approved"),
      signature: classSignature('.map-view [data-legend-keys~="intra-approved"]'),
    };

    const after = await invoke<NodeRelations>("map_relations_for_node", {
      reference: { brainId: BRAIN, nodeId: holderId },
    });
    const created = after.outgoing.find(
      (candidate) =>
        candidate.provenance === "APPROVED" && candidate.other.key === pending.target.key,
    );
    const countedBefore = before.outgoing.some(
      (candidate) => candidate.other.key === pending.target.key,
    );

    evidence.approval = {
      suggestionKey: pending.suggestionKey,
      ...approvalKeyEvidence,
      noProgrammaticActivationUsed:
        approvalKeyEvidence.programmaticClickCalls === 0 &&
        approvalKeyEvidence.programmaticClickDispatches === 0,
      beforeOutgoing: before.outgoingCount,
      beforeIncoming: before.incomingCount,
      beforePendingSuggestions: before.suggestions.map((item) => item.suggestionKey),
      beforeCountedAmongEstablished: countedBefore,
      afterOutgoing: after.outgoingCount,
      afterIncoming: after.incomingCount,
      afterPendingSuggestions: after.suggestions.map((item) => item.suggestionKey),
      createdProvenance: created?.provenance ?? null,
      createdRuleName: created?.ruleName ?? null,
      enteredCountsOnlyAfterApproval:
        !countedBefore &&
        after.outgoingCount === before.outgoingCount + 1 &&
        created?.provenance === "APPROVED",
    };

    // 8. The self-check, replayed in the real host.
    evidence.selfCheck = await invoke<RelationsSelfCheck>("map_relations_self_check", {
      brainId: BRAIN,
    });

    // Reserve `X5`. The scenario now runs against `brain-alpha`, so what it
    // produces is a REGRESSION REPLAY belonging to `TASK-0019`, the slice that
    // migrated it again. It never lands on `TASK-0017-J12-webview2.json`, nor
    // on `TASK-0018-J12-relations-regression-webview2.json`: both are now the
    // canonical evidence of VERIFIED tasks and stay bit-for-bit as published.
    const written = await invoke<string>("map_write_run_artifact", {
      name: J12_REGRESSION_ARTIFACT,
      contents: JSON.stringify(
        {
          task: "TASK-0026",
          sourceCriterion: "TASK-0017/J12",
          nature: "regression replay after composed-view migration",
          doesNotReplace:
            "docs/performance/runs/TASK-0017-J12-webview2.json, " +
            "docs/performance/runs/TASK-0018-J12-relations-regression-webview2.json",
          replacesCanonicalEvidence: false,
          note:
            "J12 replayed on brain-alpha after the TASK-0019 composed-view migration: same " +
            "frozen `quasi-empty` tree, same real-keystroke mechanism, brain-keyed commands, " +
            "DOM ids now namespaced by brain_id. It proves the composed view did not break " +
            "J12; it does NOT re-issue J12's own proof, which remains " +
            "TASK-0017-J12-webview2.json, unchanged.",
          capturedAtIso: new Date().toISOString(),
          host,
          evidence,
        },
        null,
        2,
      ),
    });
    log("info", `J12: scenario termine, artefact ecrit: ${written}`);
    setStatus(bilingual(`Scénario J12 écrit dans ${written}`, `Scenario J12 written to ${written}`));
  } catch (error) {
    // A failed scenario is still a result, and it is written down: an artefact
    // saying why nothing was proved beats a missing file somebody has to guess
    // about.
    log("error", `J12: scenario interrompu: ${String(error)}`);
    setStatus(
      bilingual(
        `Scénario J12 interrompu : ${String(error)}`,
        `Scenario J12 interrupted: ${String(error)}`,
      ),
    );
    try {
      await invoke<string>("map_write_run_artifact", {
        name: J12_REGRESSION_ABANDON_ARTIFACT,
        contents: JSON.stringify(
          {
            task: "TASK-0026",
            sourceCriterion: "TASK-0017/J12",
            nature: "regression replay after multibrain migration",
            doesNotReplace:
              "docs/performance/runs/TASK-0017-J12-webview2.json, " +
              "docs/performance/runs/TASK-0019-J12-relations-regression-webview2.json",
            replacesCanonicalEvidence: false,
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
