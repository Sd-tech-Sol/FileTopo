/**
 * `TASK-0019` — the composed view model, the territories and the composition
 * memory, against the criteria `§4.9` froze.
 *
 * These are the parts of `L1` to `L9` that can be settled without a host: what
 * a composition refuses, that nothing is merged, that two brains reading the
 * same fixture never share a DOM id, that composing translates a territory and
 * never relays out a brain, and that `C2 → C3 → C2` gives `C2` back exactly.
 *
 * The rest — a real keystroke, a real restart, the real WebView2 — belongs to
 * `L12` and is proved there. What is proved here is proved here; nothing in
 * this file is offered as evidence of the host.
 */

import { describe, expect, it } from "vitest";
import {
  ComposedViewError,
  addBrain,
  addableBrains,
  canRemove,
  catalogueOrder,
  composeView,
  domNodeId,
  domTerritoryId,
  focusBrain,
  removeBrain,
  sameComposedView,
  sameNodeRef,
  selectionIsStillValid,
  singleBrainView,
} from "./composedView";
import {
  TERRITORY_GUTTER,
  TERRITORY_HEADER,
  TERRITORY_PADDING,
  composeTerritories,
  placePoint,
  placeRect,
  territoryOf,
} from "./territories";
import {
  compositionKey,
  emptyCompositionMemory,
  recallComposition,
  rememberComposition,
  sameCompositionSession,
} from "./compositionSession";
import type { BrainRecord, Rect } from "./types";
import type { View } from "./viewState";

/** The three brains `§4.2` freezes, deliberately out of catalogue order. */
const brains: BrainRecord[] = [
  {
    brainId: "brain-gamma",
    displayName: "Cerveau Gamma",
    color: "#9A5A18",
    icon: "◆",
    sourceKind: "SYNTHETIC_FIXTURE",
    sourceRef: "quasi-empty",
    sourceLabel: "quasi-empty",
    position: 3,
  },
  {
    brainId: "brain-alpha",
    displayName: "Cerveau Alpha",
    color: "#1F6F5C",
    icon: "▲",
    sourceKind: "SYNTHETIC_FIXTURE",
    sourceRef: "quasi-empty",
    sourceLabel: "quasi-empty",
    position: 1,
  },
  {
    brainId: "brain-beta",
    displayName: "Cerveau Bêta",
    color: "#4A4FA8",
    icon: "■",
    sourceKind: "SYNTHETIC_FIXTURE",
    sourceRef: "deep",
    sourceLabel: "deep",
    position: 2,
  },
];

const order = catalogueOrder(brains);

/** The three frozen compositions of `§4.2`. */
const C1 = ["brain-alpha"];
const C2 = ["brain-alpha", "brain-gamma"];
const C3 = ["brain-alpha", "brain-beta", "brain-gamma"];

describe("L1 — composition", () => {
  it("classe toujours par position de catalogue, jamais par ordre d'ajout", () => {
    expect(order).toEqual(C3);
    // Asked for in the reverse order, and in a third order: same composition.
    expect(composeView(order, ["brain-gamma", "brain-alpha"], "brain-alpha").displayedBrainIds)
      .toEqual(C2);
    expect(composeView(order, ["brain-gamma", "brain-beta", "brain-alpha"], "brain-beta")
      .displayedBrainIds).toEqual(C3);
  });

  it("refuse une composition vide, par une erreur nommée", () => {
    expect(() => composeView(order, [], "brain-alpha")).toThrow(ComposedViewError);
    try {
      composeView(order, [], "brain-alpha");
    } catch (error) {
      expect((error as ComposedViewError).code).toBe("composed_view_empty");
    }
  });

  it("refuse un doublon, par une erreur nommée", () => {
    try {
      composeView(order, ["brain-alpha", "brain-alpha"], "brain-alpha");
      expect.unreachable("un doublon a été accepté");
    } catch (error) {
      expect((error as ComposedViewError).code).toBe("composed_view_duplicate_brain");
      expect((error as ComposedViewError).brainId).toBe("brain-alpha");
    }
  });

  it("refuse un cerveau inconnu, par une erreur nommée", () => {
    try {
      composeView(order, ["brain-alpha", "brain-delta"], "brain-alpha");
      expect.unreachable("un cerveau inconnu a été accepté");
    } catch (error) {
      expect((error as ComposedViewError).code).toBe("composed_view_unknown_brain");
      expect((error as ComposedViewError).brainId).toBe("brain-delta");
    }
  });

  it("exige que le cerveau focused soit affiché", () => {
    try {
      composeView(order, C2, "brain-beta");
      expect.unreachable("un focus hors composition a été accepté");
    } catch (error) {
      expect((error as ComposedViewError).code).toBe("composed_view_focus_not_displayed");
    }
  });

  it("ne se replie jamais en silence — chaque refus porte un code", () => {
    // The point of `L1`: a composition is refused, never quietly repaired.
    const codes = new Set<string>();
    const attempts: (() => unknown)[] = [
      () => composeView(order, [], "brain-alpha"),
      () => composeView(order, ["brain-alpha", "brain-alpha"], "brain-alpha"),
      () => composeView(order, ["brain-delta"], "brain-delta"),
      () => composeView(order, C2, "brain-beta"),
      () => removeBrain(singleBrainView(order, "brain-alpha"), order, "brain-alpha"),
    ];
    for (const attempt of attempts) {
      try {
        attempt();
        expect.unreachable("une composition invalide a été acceptée");
      } catch (error) {
        expect(error).toBeInstanceOf(ComposedViewError);
        codes.add((error as ComposedViewError).code);
      }
    }
    expect([...codes].sort()).toEqual([
      "composed_view_cannot_remove_last_brain",
      "composed_view_duplicate_brain",
      "composed_view_empty",
      "composed_view_focus_not_displayed",
      "composed_view_unknown_brain",
    ]);
  });
});

describe("L6 — ajout et retrait", () => {
  it("ajouter Gamma à Alpha donne C2, ajouter Bêta donne C3", () => {
    const c1 = singleBrainView(order, "brain-alpha");
    expect(c1.displayedBrainIds).toEqual(C1);
    const c2 = addBrain(c1, order, "brain-gamma");
    expect(c2.displayedBrainIds).toEqual(C2);
    const c3 = addBrain(c2, order, "brain-beta");
    // Bêta was added last and still sits in the middle: catalogue order.
    expect(c3.displayedBrainIds).toEqual(C3);
  });

  it("ajouter ne déplace pas le focus — §4.1 règle 6", () => {
    // Reading a secondary brain's data is not choosing it.
    const c2 = addBrain(singleBrainView(order, "brain-alpha"), order, "brain-gamma");
    expect(c2.focusedBrainId).toBe("brain-alpha");
    expect(addBrain(c2, order, "brain-beta").focusedBrainId).toBe("brain-alpha");
  });

  it("ajouter deux fois le même cerveau est impossible", () => {
    const c2 = addBrain(singleBrainView(order, "brain-alpha"), order, "brain-gamma");
    expect(() => addBrain(c2, order, "brain-gamma")).toThrow(ComposedViewError);
  });

  it("retirer le dernier cerveau affiché est refusé", () => {
    expect(canRemove(singleBrainView(order, "brain-alpha"))).toBe(false);
    try {
      removeBrain(singleBrainView(order, "brain-alpha"), order, "brain-alpha");
      expect.unreachable("le dernier cerveau a été retiré");
    } catch (error) {
      expect((error as ComposedViewError).code).toBe("composed_view_cannot_remove_last_brain");
    }
  });

  it("si le cerveau focused est retiré, le premier restant prend le focus", () => {
    const c3 = composeView(order, C3, "brain-beta");
    // Deterministic, and by catalogue order: Alpha, not « the other one ».
    const withoutBeta = removeBrain(c3, order, "brain-beta");
    expect(withoutBeta.displayedBrainIds).toEqual(C2);
    expect(withoutBeta.focusedBrainId).toBe("brain-alpha");

    const withoutAlpha = removeBrain(withoutBeta, order, "brain-alpha");
    expect(withoutAlpha.displayedBrainIds).toEqual(["brain-gamma"]);
    expect(withoutAlpha.focusedBrainId).toBe("brain-gamma");
  });

  it("retirer un cerveau non affiché est refusé plutôt qu'ignoré", () => {
    const c2 = composeView(order, C2, "brain-alpha");
    expect(() => removeBrain(c2, order, "brain-beta")).toThrow(ComposedViewError);
  });

  it("n'offre à l'ajout que les cerveaux non affichés, en ordre de catalogue", () => {
    const c2 = composeView(order, C2, "brain-alpha");
    expect(addableBrains(c2, brains).map((brain) => brain.brainId)).toEqual(["brain-beta"]);
    expect(addableBrains(composeView(order, C3, "brain-alpha"), brains)).toEqual([]);
    expect(
      addableBrains(singleBrainView(order, "brain-beta"), brains).map((brain) => brain.brainId),
    ).toEqual(["brain-alpha", "brain-gamma"]);
  });
});

describe("L7 — focus et sélection", () => {
  it("déplace le focus sans changer la composition", () => {
    const c3 = composeView(order, C3, "brain-alpha");
    const focused = focusBrain(c3, order, "brain-gamma");
    expect(focused.displayedBrainIds).toEqual(c3.displayedBrainIds);
    expect(focused.focusedBrainId).toBe("brain-gamma");
  });

  it("refuse de donner le focus à un cerveau non affiché", () => {
    expect(() => focusBrain(composeView(order, C2, "brain-alpha"), order, "brain-beta")).toThrow(
      ComposedViewError,
    );
  });

  it("compare une sélection sur la paire, jamais sur le seul node_id", () => {
    expect(sameNodeRef({ brainId: "brain-alpha", nodeId: 6 }, { brainId: "brain-alpha", nodeId: 6 }))
      .toBe(true);
    // Same row number, other brain: not the same node. `K5`, `L3`.
    expect(sameNodeRef({ brainId: "brain-alpha", nodeId: 6 }, { brainId: "brain-gamma", nodeId: 6 }))
      .toBe(false);
    expect(sameNodeRef(null, { brainId: "brain-alpha", nodeId: 6 })).toBe(false);
    expect(sameNodeRef(null, null)).toBe(true);
  });

  it("une sélection cesse d'être valide quand son cerveau quitte la vue", () => {
    const c2 = composeView(order, C2, "brain-alpha");
    const selection = { brainId: "brain-gamma", nodeId: 6 };
    expect(selectionIsStillValid(c2, selection)).toBe(true);
    expect(selectionIsStillValid(removeBrain(c2, order, "brain-gamma"), selection)).toBe(false);
    expect(selectionIsStillValid(c2, null)).toBe(false);
  });

  it("compare deux compositions sur leur contenu et leur ordre", () => {
    expect(sameComposedView(composeView(order, C2, "brain-alpha"), composeView(order, ["brain-gamma", "brain-alpha"], "brain-alpha")))
      .toBe(true);
    expect(sameComposedView(composeView(order, C2, "brain-alpha"), composeView(order, C2, "brain-gamma")))
      .toBe(false);
    expect(sameComposedView(composeView(order, C2, "brain-alpha"), composeView(order, C3, "brain-alpha")))
      .toBe(false);
  });
});

describe("L3 — collision de node_id entre Alpha et Gamma", () => {
  it("donne deux id DOM distincts au même node_id", () => {
    // `C2` exists for this: both brains read `quasi-empty`, so row 6 is valid
    // in both. One id for two elements would send `aria-activedescendant` and
    // `getElementById` to whichever came first.
    expect(domNodeId("brain-alpha", 6)).toBe("brain-alpha-map-node-6");
    expect(domNodeId("brain-gamma", 6)).toBe("brain-gamma-map-node-6");
    expect(domNodeId("brain-alpha", 6)).not.toBe(domNodeId("brain-gamma", 6));
  });

  it("ne produit aucune collision sur douze nœuds partagés", () => {
    const ids = new Set<string>();
    for (const brainId of C2) {
      for (let nodeId = 1; nodeId <= 12; nodeId += 1) ids.add(domNodeId(brainId, nodeId));
    }
    expect(ids.size).toBe(24);
  });

  it("namespace aussi le territoire", () => {
    expect(domTerritoryId("brain-alpha")).toBe("brain-alpha-territory");
    expect(new Set(C3.map(domTerritoryId)).size).toBe(3);
  });
});

describe("L4 et L5 — territoires et géométrie", () => {
  /** Layout sizes chosen so the two are visibly different, as `C3` is. */
  const inputs = [
    { brainId: "brain-alpha", layoutWidth: 400, layoutHeight: 300 },
    { brainId: "brain-beta", layoutWidth: 1200, layoutHeight: 900 },
    { brainId: "brain-gamma", layoutWidth: 400, layoutHeight: 300 },
  ];

  it("applique exactement les formules gelées de §4.3", () => {
    const composition = composeTerritories(inputs);
    const tallest = 900;
    const frameHeight = TERRITORY_HEADER + tallest + 2 * TERRITORY_PADDING;

    let expectedX = 0;
    composition.territories.forEach((territory, index) => {
      const input = inputs[index];
      expect(territory.brainId).toBe(input.brainId);
      expect(territory.position).toBe(index);
      expect(territory.frame.x).toBe(expectedX);
      expect(territory.frame.y).toBe(0);
      expect(territory.frame.w).toBe(input.layoutWidth + 2 * TERRITORY_PADDING);
      // Every frame is the same height, that of the tallest brain.
      expect(territory.frame.h).toBe(frameHeight);
      expect(territory.offsetX).toBe(territory.frame.x + TERRITORY_PADDING);
      expect(territory.offsetY).toBe(TERRITORY_PADDING + TERRITORY_HEADER);
      // The brain's own layout size, unchanged: no normalisation.
      expect(territory.width).toBe(input.layoutWidth);
      expect(territory.height).toBe(input.layoutHeight);
      expectedX += territory.frame.w + TERRITORY_GUTTER;
    });

    const width =
      inputs.reduce((total, input) => total + input.layoutWidth + 2 * TERRITORY_PADDING, 0) +
      (inputs.length - 1) * TERRITORY_GUTTER;
    expect(composition.world).toEqual({ x: 0, y: 0, w: width, h: frameHeight });
  });

  it("ne met jamais à l'échelle un petit cerveau pour l'aligner sur un grand", () => {
    const composition = composeTerritories(inputs);
    const alpha = territoryOf(composition, "brain-alpha")!;
    const beta = territoryOf(composition, "brain-beta")!;
    // Three times wider on screen because it is three times wider in fact.
    expect(beta.width / alpha.width).toBe(3);
  });

  it("ne fait que translater le calepinage interne — L5", () => {
    const composition = composeTerritories(inputs);
    const gamma = territoryOf(composition, "brain-gamma")!;
    const rect: Rect = { x: 10, y: 30, w: 180, h: 340 };

    const placed = placeRect(gamma, rect);
    // Same size, exactly. Only the origin moves, and by the offset.
    expect(placed.w).toBe(rect.w);
    expect(placed.h).toBe(rect.h);
    expect(placed.x - rect.x).toBe(gamma.offsetX);
    expect(placed.y - rect.y).toBe(gamma.offsetY);

    const point = placePoint(gamma, 5, 7);
    expect(point).toEqual({ x: 5 + gamma.offsetX, y: 7 + gamma.offsetY });
  });

  it("donne à chaque cerveau la même translation pour tous ses rectangles", () => {
    const composition = composeTerritories(inputs);
    const beta = territoryOf(composition, "brain-beta")!;
    const deltas = [
      { x: 0, y: 0, w: 1, h: 1 },
      { x: 700, y: 400, w: 120, h: 90 },
      { x: 1199, y: 899, w: 1, h: 1 },
    ].map((rect) => {
      const placed = placeRect(beta, rect);
      return { dx: placed.x - rect.x, dy: placed.y - rect.y };
    });
    expect(new Set(deltas.map((delta) => `${delta.dx}|${delta.dy}`)).size).toBe(1);
  });

  it("ne connaît pas un cerveau qui n'est pas dans la composition", () => {
    const composition = composeTerritories([inputs[0]]);
    expect(territoryOf(composition, "brain-beta")).toBeNull();
    expect(composition.territories).toHaveLength(1);
    // A single territory still gets its padding and its header band.
    expect(composition.world.h).toBe(TERRITORY_HEADER + 300 + 2 * TERRITORY_PADDING);
  });

  it("supporte une composition vide sans produire un monde dégénéré", () => {
    // Not a reachable state — `L1` forbids it — but a division by zero here
    // would be a crash rather than the refusal `L1` promises.
    expect(composeTerritories([])).toEqual({
      territories: [],
      world: { x: 0, y: 0, w: 1, h: 1 },
    });
  });
});

describe("L9 — mémoire de session par composition", () => {
  const c2View: View = { scale: 1.7, tx: -220, ty: 75 };
  const c3View: View = { scale: 0.55, tx: 40, ty: -30 };

  it("donne une clé déterministe, indépendante de l'ordre d'ajout", () => {
    expect(compositionKey(C2)).toBe("brain-alpha|brain-gamma");
    // Both routes to `C2` land on the same entry, because `composeView` sorts.
    const viaGamma = addBrain(singleBrainView(order, "brain-alpha"), order, "brain-gamma");
    const viaAlpha = addBrain(singleBrainView(order, "brain-gamma"), order, "brain-alpha");
    expect(compositionKey(viaGamma.displayedBrainIds)).toBe(
      compositionKey(viaAlpha.displayedBrainIds),
    );
  });

  it("C2 → C3 → C2 restitue exactement l'état de C2", () => {
    let memory = emptyCompositionMemory();
    const c2State = { view: c2View, selected: { brainId: "brain-gamma", nodeId: 6 } };
    const c3State = { view: c3View, selected: { brainId: "brain-beta", nodeId: 88 } };

    memory = rememberComposition(memory, compositionKey(C2), c2State);
    memory = rememberComposition(memory, compositionKey(C3), c3State);

    const back = recallComposition(memory, compositionKey(C2));
    expect(sameCompositionSession(back, c2State)).toBe(true);
    expect(back).toEqual(c2State);
    // And `C3` kept its own, which is a different place.
    expect(sameCompositionSession(recallComposition(memory, compositionKey(C3)), c3State)).toBe(
      true,
    );
    expect(sameCompositionSession(back, c3State)).toBe(false);
  });

  it("conserve le mode un cerveau sous la clé de ce cerveau — la régression K8", () => {
    // `L9`'s last sentence: a composition of one brain **is** the per-brain
    // memory of `TASK-0018`, not a re-implementation beside it.
    expect(compositionKey(C1)).toBe("brain-alpha");
    let memory = emptyCompositionMemory();
    const single = { view: c2View, selected: { brainId: "brain-alpha", nodeId: 3 } };
    memory = rememberComposition(memory, compositionKey(C1), single);
    // Adding Gamma is a different composition, and does not disturb `C1`.
    memory = rememberComposition(memory, compositionKey(C2), {
      view: c3View,
      selected: null,
    });
    expect(recallComposition(memory, compositionKey(C1))).toEqual(single);
  });

  it("ne mémorise rien sur disque — la composition est session-only", () => {
    // Stated in `§3` and `§4.7`. The memory is a plain in-process map: it has
    // no reader, no writer and no path, and this test exists so that adding
    // one is a deliberate act that breaks something.
    const memory = rememberComposition(emptyCompositionMemory(), compositionKey(C2), {
      view: c2View,
      selected: null,
    });
    expect(memory instanceof Map).toBe(true);
    expect(Object.keys(memory)).toHaveLength(0);
  });
});
