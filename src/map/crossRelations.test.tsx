import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CrossRelationsPanel from "./CrossRelationsPanel";
import MapView from "./MapView";
import { buildHierarchy } from "./hierarchy";
import {
  crossNeighbours,
  crossRelationKey,
  crossSegments,
  otherEndIsDisplayed,
  splitCrossEndpointKey,
} from "./crossRelations";
import { composeTerritories } from "./territories";
import type {
  BrainRecord,
  CrossEndpoint,
  CrossRelationEdge,
  CrossRelationsOverview,
  CrossSuggestionEdge,
  MapNode,
  NodeCrossRelationEntry,
  NodeCrossRelations,
  Rect,
} from "./types";
import { fitView, type View } from "./viewState";

// Vitest globals are off in this project, so Testing Library's automatic
// cleanup never registers on its own.
afterEach(cleanup);

/* --- two brains reading the same tree, in miniature ------------------------ */
/*
 * Alpha and Gamma hold the **same node ids** for the **same paths**, exactly as
 * the two frozen brains that read `quasi-empty` do. That is not incidental to
 * these tests: it is the condition under which a projection that looked an
 * endpoint up in the wrong brain would still find a plausible rectangle, and be
 * silently wrong. Every test below is built so that mistake would show.
 */

function node(id: number, name: string, parentId: number | null, rect: Rect): MapNode {
  return {
    id,
    parentId,
    name,
    relativePath: name === "racine" ? "" : name,
    kind: parentId === null ? "root" : name.endsWith(".txt") ? "file" : "directory",
    depth: parentId === null ? 0 : 1,
    sizeBytes: 10 * id,
    modifiedUnixMs: null,
    childCount: 0,
    accessDiagnostic: null,
    rect,
  };
}

const nodes: MapNode[] = [
  node(1, "racine", null, { x: 0, y: 0, w: 400, h: 400 }),
  node(2, "note-1.txt", 1, { x: 10, y: 10, w: 100, h: 100 }),
  node(3, "note-2.txt", 1, { x: 150, y: 10, w: 100, h: 100 }),
  node(4, "note-3.txt", 1, { x: 10, y: 150, w: 100, h: 100 }),
];
const world: Rect = { x: 0, y: 0, w: 400, h: 400 };
const hierarchy = buildHierarchy(nodes, 1);

const ALPHA = "brain-alpha";
const GAMMA = "brain-gamma";

function record(brainId: string, displayName: string, icon: string): BrainRecord {
  return {
    brainId,
    displayName,
    color: "#2E5FA3",
    icon,
    sourceKind: "SYNTHETIC_FIXTURE",
    sourceRef: "quasi-empty",
    sourceLabel: "quasi-empty",
    position: brainId === ALPHA ? 1 : 3,
  };
}

const alphaRecord = record(ALPHA, "Cerveau Alpha", "▲");
const gammaRecord = record(GAMMA, "Cerveau Gamma", "◆");

function crossEndpoint(brainId: string, nodeId: number | null, indexed = true): CrossEndpoint {
  const found = nodes.find((candidate) => candidate.id === nodeId);
  const relativePath = found?.relativePath ?? "hors-index.txt";
  return {
    key: `cek1|${brainId}|${relativePath}`,
    brainId,
    brainDisplayName: brainId === ALPHA ? "Cerveau Alpha" : "Cerveau Gamma",
    brainIcon: brainId === ALPHA ? "▲" : "◆",
    nodeId,
    name: found?.name ?? relativePath,
    relativePath,
    brainIndexed: indexed,
  };
}

function crossEdge(
  sourceBrain: string,
  sourceNode: number,
  targetBrain: string,
  targetNode: number | null,
  provenance: CrossRelationEdge["provenance"] = "DETERMINISTIC",
  indexed = true,
): CrossRelationEdge {
  return {
    id: sourceNode * 100 + (targetNode ?? 0),
    provenance,
    relationType: "reference",
    source: crossEndpoint(sourceBrain, sourceNode),
    target: crossEndpoint(targetBrain, targetNode, indexed),
    ruleName: provenance === "DETERMINISTIC" ? "cross-homonymes" : null,
    ruleVersion: provenance === "DETERMINISTIC" ? "v1" : null,
    suggestionKey: provenance === "APPROVED" ? "XB-S01" : null,
  };
}

const suggestion: CrossSuggestionEdge = {
  suggestionKey: "XB-S01",
  relationType: "reference",
  source: crossEndpoint(ALPHA, 3),
  target: crossEndpoint(GAMMA, 3),
  state: "pending",
  basis: "fixture-synthetique-task-0020",
};

const overview: CrossRelationsOverview = {
  storePath: "brains/interbrain/relations.sqlite",
  schemaVersion: 1,
  endpointKeyScheme: "cek1",
  established: [crossEdge(ALPHA, 2, GAMMA, 4)],
  pendingSuggestions: [suggestion],
  deterministicCount: 1,
  approvedCount: 0,
  pendingSuggestionCount: 1,
  rules: [
    {
      name: "cross-homonymes",
      version: "v1",
      relationType: "reference",
      symmetric: false,
      produced: 1,
    },
  ],
  unresolvedEndpoints: [],
  resolvedBrainIds: [ALPHA, GAMMA],
  deterministicDigest: "fnv1a64:0000000000000000",
  seeded: 0,
};

/** The two brains' rectangles, keyed the way `MapApp` keys them. */
function twoBrains(): Map<string, ReadonlyMap<number, MapNode>> {
  return new Map([
    [ALPHA, hierarchy.byId],
    [GAMMA, hierarchy.byId],
  ]);
}

/* --- §4.2 — the endpoint key ---------------------------------------------- */

describe("cek1 — the versioned inter-brain endpoint key", () => {
  it("names its brain, and an intra-brain key is foreign to it", () => {
    expect(splitCrossEndpointKey("cek1|brain-alpha|dossier-a/note-1.txt")).toEqual({
      brainId: "brain-alpha",
      relativePath: "dossier-a/note-1.txt",
    });
    // The root carries an empty path, and that is a valid key.
    expect(splitCrossEndpointKey("cek1|brain-beta|")).toEqual({
      brainId: "brain-beta",
      relativePath: "",
    });
    // `TASK-0017`'s scheme is recognisably not this one.
    expect(splitCrossEndpointKey("ek1|brain-alpha|racine-1.txt")).toBeNull();
    expect(splitCrossEndpointKey("cek1||racine-1.txt")).toBeNull();
    expect(splitCrossEndpointKey("racine-1.txt")).toBeNull();
  });

  it("carries no node id, so a rebuild cannot break it", () => {
    const key = "cek1|brain-alpha|dossier-a/note-1.txt";
    expect(key).not.toMatch(/\bmap_nodes\b/);
    // Two brains reading the same tree produce two disjoint key spaces.
    expect(splitCrossEndpointKey(key)?.brainId).not.toBe(
      splitCrossEndpointKey("cek1|brain-gamma|dossier-a/note-1.txt")?.brainId,
    );
  });
});

/* --- `M6` — the projection ------------------------------------------------ */

describe("M6 — inter-brain segments really join two brains", () => {
  it("resolves each end in ITS OWN brain, not in whichever came first", () => {
    // Alpha's node 2 → Gamma's node 4. Both ids exist in both brains, so a
    // projection that took the wrong map would still produce a segment — with
    // the wrong coordinates. The rectangles differ, so the coordinates say
    // which map was actually read.
    const [segment] = crossSegments(overview, twoBrains(), null);
    expect(segment.fromBrainId).toBe(ALPHA);
    expect(segment.toBrainId).toBe(GAMMA);
    expect(segment.fromBrainId).not.toBe(segment.toBrainId);
    // node 2 is at (10,10,100,100); its centre is (60,60).
    expect([segment.x1, segment.y1]).toEqual([60, 60]);
    // node 4 is at (10,150,100,100); its centre is (60,200).
    expect([segment.x2, segment.y2]).toEqual([60, 200]);
  });

  it("produces nothing when the other brain is not displayed", () => {
    // `M9` keeps such a relation visible IN THE PANEL. It does not ask for a
    // line towards a territory that is not on screen.
    const alphaOnly = new Map([[ALPHA, hierarchy.byId]]);
    expect(crossSegments(overview, alphaOnly, null)).toHaveLength(0);
  });

  it("produces nothing for an endpoint the index does not resolve", () => {
    const unresolved: CrossRelationsOverview = {
      ...overview,
      established: [crossEdge(ALPHA, 2, GAMMA, null, "DETERMINISTIC", false)],
      pendingSuggestions: [],
    };
    expect(crossSegments(unresolved, twoBrains(), null)).toHaveLength(0);
  });

  it("keeps a suggestion as its own kind, never as an established edge", () => {
    const segments = crossSegments(overview, twoBrains(), null);
    expect(segments.map((segment) => segment.kind).sort()).toEqual([
      "established",
      "suggestion",
    ]);
    const suggested = segments.find((segment) => segment.kind === "suggestion")!;
    expect(suggested.provenance).toBeNull();
    expect(suggested.label).toContain("SUGGESTION");
    expect(suggested.label).toContain("non établie");
  });

  it("marks the segments that touch the selection, and only those", () => {
    const touching = crossSegments(overview, twoBrains(), { brainId: ALPHA, nodeId: 2 });
    expect(touching.find((segment) => segment.kind === "established")!.touchesSelection).toBe(
      true,
    );
    // The same row number in the OTHER brain must not count as the selection.
    const elsewhere = crossSegments(overview, twoBrains(), { brainId: GAMMA, nodeId: 2 });
    expect(elsewhere.find((segment) => segment.kind === "established")!.touchesSelection).toBe(
      false,
    );
  });

  it("gives an established relation a stable identity that is not its row id", () => {
    const key = crossRelationKey(overview.established[0]);
    expect(key).toContain("DETERMINISTIC");
    expect(key).toContain("cek1|brain-alpha|note-1.txt");
    expect(key).toContain("cek1|brain-gamma|note-3.txt");
    expect(key).not.toContain(String(overview.established[0].id));
  });
});

/* --- `M` — accentuation ---------------------------------------------------- */

describe("M — the inter-brain neighbour is accentuated, in the other brain", () => {
  it("keys neighbours by brain, so the same id in two brains is not confused", () => {
    const neighbours = crossNeighbours(overview, { brainId: ALPHA, nodeId: 2 });
    expect(neighbours.get(GAMMA)).toEqual(new Set([4]));
    expect(neighbours.get(ALPHA)).toBeUndefined();
  });

  it("never accentuates a pending suggestion like an established relation", () => {
    // Node 3 is a suggestion endpoint and nothing else.
    expect(crossNeighbours(overview, { brainId: ALPHA, nodeId: 3 }).size).toBe(0);
  });
});

/* --- `M6` in the DOM ------------------------------------------------------- */

function MapHarness({ displayGamma = true }: { displayGamma?: boolean }) {
  const viewport = { width: 800, height: 600 };
  const displayed = displayGamma ? [ALPHA, GAMMA] : [ALPHA];
  const composition = composeTerritories(
    displayed.map((brainId) => ({ brainId, layoutWidth: world.w, layoutHeight: world.h })),
  );
  const [view, setView] = useState<View>(() => fitView(composition.world, viewport));
  const byBrain = new Map(displayed.map((brainId) => [brainId, hierarchy.byId] as const));
  const segments = crossSegments(overview, byBrain, { brainId: ALPHA, nodeId: 2 });
  const neighbours = crossNeighbours(overview, { brainId: ALPHA, nodeId: 2 });
  return (
    <MapView
      brains={displayed.map((brainId) => ({
        brainId,
        record: brainId === ALPHA ? alphaRecord : gammaRecord,
        hierarchy,
        segments: [],
        relationNeighbours: new Set<number>(),
        crossNeighbours: neighbours.get(brainId) ?? new Set<number>(),
        nodeCount: nodes.length,
      }))}
      crossSegments={segments}
      composition={composition}
      view={view}
      viewport={viewport}
      selected={{ brainId: ALPHA, nodeId: 2 }}
      focusedBrainId={ALPHA}
      onViewChange={setView}
      onSelect={() => {}}
      onViewportChange={() => {}}
      labelFor={(mapNode, brain) => `${brain.displayName} · ${mapNode.name}`}
      territoryLabelFor={(brain) => `territoire ${brain.displayName}`}
      ariaLabel="carte composée"
    />
  );
}

describe("M6 — the drawn edge names two different brains", () => {
  it("draws an inter-brain edge that says which brains it joins", () => {
    const { container } = render(<MapHarness />);
    const drawn = [...container.querySelectorAll<HTMLElement>('[data-cross="true"]')];
    expect(drawn.length).toBeGreaterThan(0);
    for (const element of drawn) {
      expect(element.dataset.fromBrainId).toBeTruthy();
      expect(element.dataset.toBrainId).toBeTruthy();
      expect(element.dataset.fromBrainId).not.toBe(element.dataset.toBrainId);
    }
    const established = drawn.find((element) => element.dataset.kind === "established")!;
    expect(established.dataset.fromBrainId).toBe(ALPHA);
    expect(established.dataset.toBrainId).toBe(GAMMA);
  });

  it("says « inter-cerveaux » in words, and names both brains", () => {
    const { container } = render(<MapHarness />);
    const title = container
      .querySelector('[data-cross="true"][data-kind="established"] title')
      ?.textContent?.trim();
    expect(title).toContain("INTER-CERVEAUX");
    expect(title).toContain("Cerveau Alpha");
    expect(title).toContain("Cerveau Gamma");
    expect(title).toContain("provenance déterministe");
  });

  it("carries direction as a shape, not as a colour", () => {
    const { container } = render(<MapHarness />);
    const edge = container.querySelector('[data-cross="true"][data-kind="established"]')!;
    // A head at the target end AND a chevron at mid-path: the direction reads
    // even when the tip is off screen.
    expect(edge.querySelector(".map-cross-edge__arrow")).not.toBeNull();
    expect(edge.querySelector(".map-cross-edge__chevron")).not.toBeNull();
    // Doubled stroke: what tells an inter-brain edge from an intra-brain one.
    expect(edge.querySelector(".map-cross-edge__casing")).not.toBeNull();
    expect(edge.querySelector(".map-cross-edge__line")).not.toBeNull();
    // A suggestion has neither head.
    const suggested = container.querySelector('[data-cross="true"][data-kind="suggestion"]')!;
    expect(suggested.querySelector(".map-cross-edge__arrow")).toBeNull();
    expect(suggested.querySelectorAll(".map-cross-edge__ring")).toHaveLength(2);
  });

  it("carries no `map-edge` class, so L8's measurement still means L8", () => {
    // `TASK-0019` `L8` counts `.map-edge` and reads its two brain ids to show
    // an intra-brain edge never leaves its territory. An inter-brain edge is
    // supposed to cross, so it must not be in that population — otherwise the
    // earlier criterion would appear to have broken when nothing broke.
    const { container } = render(<MapHarness />);
    const cross = [...container.querySelectorAll<HTMLElement>('[data-cross="true"]')];
    expect(cross.length).toBeGreaterThan(0);
    for (const element of cross) {
      expect(element.classList.contains("map-edge")).toBe(false);
      expect(element.classList.contains("map-cross-edge")).toBe(true);
    }
    // And `.map-edge` selects none of them.
    expect(container.querySelectorAll(".map-edge")).toHaveLength(0);
  });

  it("draws nothing across a boundary when the other brain is absent", () => {
    const { container } = render(<MapHarness displayGamma={false} />);
    expect(container.querySelectorAll('[data-cross="true"]')).toHaveLength(0);
  });

  it("accentuates the neighbour in the other territory, and only there", () => {
    const { container } = render(<MapHarness />);
    const accentuated = [
      ...container.querySelectorAll<HTMLElement>('[data-cross-linked="true"]'),
    ];
    expect(accentuated).toHaveLength(1);
    expect(accentuated[0].dataset.brainId).toBe(GAMMA);
    expect(accentuated[0].dataset.nodeId).toBe("4");
    expect(accentuated[0].getAttribute("class")).toContain("map-node--cross-linked");
    // Attenuated, never erased: it keeps its accessible name.
    expect(accentuated[0].getAttribute("aria-label")).toContain("Cerveau Gamma");
  });
});

/* --- `M7`, `M9`, `M10` — the panel ---------------------------------------- */

function entry(
  direction: NodeCrossRelationEntry["direction"],
  otherBrain: string,
  otherNode: number,
  provenance: NodeCrossRelationEntry["provenance"] = "DETERMINISTIC",
): NodeCrossRelationEntry {
  return {
    direction,
    provenance,
    relationType: "reference",
    other: crossEndpoint(otherBrain, otherNode),
    ruleName: provenance === "DETERMINISTIC" ? "cross-homonymes" : null,
    ruleVersion: provenance === "DETERMINISTIC" ? "v1" : null,
    suggestionKey: provenance === "APPROVED" ? "XB-S01" : null,
  };
}

const nodeCross: NodeCrossRelations = {
  reference: { brainId: ALPHA, nodeId: 2 },
  endpointKey: `cek1|${ALPHA}|note-1.txt`,
  relativePath: "note-1.txt",
  outgoing: [entry("outgoing", GAMMA, 4)],
  // Node 2, not node 3: node 3 is the suggestion's other end, and an entry
  // sharing its key would make « the suggestion is not a direction entry »
  // untestable — the collision would be in the fixture, not in the product.
  incoming: [entry("incoming", GAMMA, 2, "APPROVED")],
  outgoingCount: 1,
  incomingCount: 1,
  suggestions: [suggestion],
};

function renderPanel(displayedBrainIds: string[], overrides: Partial<NodeCrossRelations> = {}) {
  const onNavigate = vi.fn();
  const onApprove = vi.fn();
  render(
    <CrossRelationsPanel
      relations={{ ...nodeCross, ...overrides }}
      loading={false}
      displayedBrainIds={displayedBrainIds}
      onNavigate={onNavigate}
      onApprove={onApprove}
      approving={null}
    />,
  );
  return { onNavigate, onApprove };
}

describe("M7 — the panel separates internal from inter-brain, and both directions", () => {
  it("is its own section, with its own totals", () => {
    renderPanel([ALPHA, GAMMA]);
    const panel = screen.getByLabelText("Relations inter-cerveaux");
    expect(panel).toBeTruthy();
    expect(
      within(panel).getByTestId("cross-relation-totals").textContent,
    ).toContain("1 sortante(s) · 1 entrante(s) · 1 suggestion(s)");
    // The word that keeps a suggestion out of the counts is on screen.
    expect(within(panel).getByTestId("cross-relation-totals").textContent).toContain(
      "non comptée(s)",
    );
  });

  it("groups by direction, from two separate lists", () => {
    renderPanel([ALPHA, GAMMA]);
    expect(screen.getByLabelText(/Sortantes — vers un autre cerveau/)).toBeTruthy();
    expect(screen.getByLabelText(/Entrantes — depuis un autre cerveau/)).toBeTruthy();
    const controls = [...document.querySelectorAll<HTMLElement>('[data-cross-entry="true"]')];
    expect(controls.map((control) => control.dataset.direction).sort()).toEqual([
      "incoming",
      "outgoing",
    ]);
  });

  it("names the other brain in words, and carries type and provenance", () => {
    renderPanel([ALPHA, GAMMA]);
    const outgoing = document.querySelector<HTMLElement>(
      '[data-cross-entry="true"][data-direction="outgoing"]',
    )!;
    expect(outgoing.dataset.endpointBrainId).toBe(GAMMA);
    expect(outgoing.dataset.relationType).toBe("reference");
    expect(outgoing.dataset.provenance).toBe("DETERMINISTIC");
    const label = outgoing.getAttribute("aria-label") ?? "";
    expect(label).toContain("relation inter-cerveaux sortante");
    expect(label).toContain("Cerveau Gamma");
    expect(label).toContain("provenance déterministe");
    // `M7` — the rule and its version are consultable in the same place.
    expect(outgoing.parentElement?.textContent).toContain("cross-homonymes");
    expect(outgoing.parentElement?.textContent).toContain("v1");
  });

  it("says an APPROVED relation was approved, and invents no rule", () => {
    renderPanel([ALPHA, GAMMA]);
    const incoming = document.querySelector<HTMLElement>(
      '[data-cross-entry="true"][data-direction="incoming"]',
    )!;
    expect(incoming.dataset.provenance).toBe("APPROVED");
    const text = incoming.parentElement?.textContent ?? "";
    expect(text).toContain("Approuvée par une action explicite");
    expect(text).toContain("XB-S01");
    expect(text).toContain("Aucune règle déterministe");
    expect(text).not.toContain("cross-homonymes");
  });
});

describe("M7 — the two panels share no class name in the markup", () => {
  it("carries no `relation__*` or `relations__*` class at all", () => {
    // Not a style preference. The intra-brain scenario counts
    // `.relations__direction .relation__link` across the whole document, so a
    // shared class would make it count inter-brain entries too — the same
    // defect as one DOM id for two brains, wearing a different hat. The first
    // real `M12` run found it; this fails the day it comes back.
    renderPanel([ALPHA, GAMMA]);
    const panel = screen.getByLabelText("Relations inter-cerveaux");
    for (const shared of [
      ".relations__direction",
      ".relation__link",
      ".relation__provenance",
      ".relation__rule",
      ".relation__name",
      ".relation__direction",
      ".relations__list",
      ".relations__totals",
      ".suggestion",
      ".suggestion__approve",
      ".suggestion__tag",
    ]) {
      expect(panel.querySelectorAll(shared), `${shared} leaked into the cross panel`)
        .toHaveLength(0);
    }
    // And it still exposes everything a scenario needs, under its own names.
    expect(panel.querySelectorAll(".cross-relations__direction").length).toBe(2);
    expect(panel.querySelectorAll(".cross-relation__link").length).toBe(2);
    expect(panel.querySelectorAll(".cross-suggestion__approve").length).toBe(1);
  });
});

describe("M9 — a target that is not displayed is said so, and stays activable", () => {
  it("marks the entry « hors de la vue », in words", () => {
    renderPanel([ALPHA]);
    const control = document.querySelector<HTMLButtonElement>(
      '[data-cross-entry="true"][data-direction="outgoing"]',
    )!;
    expect(control.dataset.endpointDisplayed).toBe("false");
    expect(control.getAttribute("aria-label")).toContain("hors de la vue");
    expect(control.disabled).toBe(false);
    const panel = screen.getByLabelText("Relations inter-cerveaux");
    expect(panel.textContent).toContain("Cerveau Gamma");
    expect(panel.textContent).toContain("hors de la vue");
    // And the panel says what activating it will do — a navigation, no more.
    expect(panel.textContent).toContain("ajoute Cerveau Gamma à la vue");
    expect(panel.textContent).toContain("rien n'est créé, modifié ni approuvé");
  });

  it("hands the endpoint KEY to navigation when the brain is absent", () => {
    // A `nodeId` would be a row number of an index that may not be built. The
    // key is what survives, and it is what travels.
    const { onNavigate } = renderPanel([ALPHA]);
    fireEvent.click(
      document.querySelector('[data-cross-entry="true"][data-direction="outgoing"]')!,
    );
    expect(onNavigate).toHaveBeenCalledWith({
      brainId: GAMMA,
      endpointKey: `cek1|${GAMMA}|note-3.txt`,
    });
  });

  it("hands the pair when the brain IS displayed — M8", () => {
    const { onNavigate } = renderPanel([ALPHA, GAMMA]);
    fireEvent.click(
      document.querySelector('[data-cross-entry="true"][data-direction="outgoing"]')!,
    );
    expect(onNavigate).toHaveBeenCalledWith({ brainId: GAMMA, nodeId: 4 });
  });

  it("answers « displayed » from the composition, never from the store", () => {
    const outgoing = entry("outgoing", GAMMA, 4);
    expect(otherEndIsDisplayed(outgoing, [ALPHA, GAMMA])).toBe(true);
    expect(otherEndIsDisplayed(outgoing, [ALPHA])).toBe(false);
    // `brainIndexed` is a different question and must not answer this one.
    expect(outgoing.other.brainIndexed).toBe(true);
  });
});

describe("M10 — a suggestion is a suggestion, and enters no count", () => {
  it("lives in its own zone, named, with its own control", () => {
    renderPanel([ALPHA, GAMMA]);
    const zone = screen.getByLabelText("Suggestions inter-cerveaux non établies");
    expect(zone.textContent).toContain("suggestion");
    expect(zone.textContent).toContain("non établie");
    expect(zone.textContent).toContain("inter-cerveaux");
    expect(zone.textContent).toContain("n'entre dans aucun compte");
    expect(within(zone).getByRole("button", { name: /approuver/i })).toBeTruthy();
  });

  it("is never one of the direction entries", () => {
    renderPanel([ALPHA, GAMMA]);
    const controls = [...document.querySelectorAll<HTMLElement>('[data-cross-entry="true"]')];
    expect(controls).toHaveLength(2);
    // Neither end of the suggestion appears as a direction entry: it is in the
    // `suggestions` list and nowhere else.
    for (const key of [suggestion.source.key, suggestion.target.key]) {
      expect(controls.some((control) => control.dataset.endpointKey === key)).toBe(false);
    }
  });

  it("asks for approval by its own key, and nothing else", () => {
    const { onApprove, onNavigate } = renderPanel([ALPHA, GAMMA]);
    fireEvent.click(document.querySelector('[data-cross-approve="XB-S01"]')!);
    expect(onApprove).toHaveBeenCalledWith("XB-S01");
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("counts zero when there is nothing, without pretending otherwise", () => {
    renderPanel([ALPHA, GAMMA], {
      outgoing: [],
      incoming: [],
      outgoingCount: 0,
      incomingCount: 0,
      suggestions: [],
    });
    expect(screen.getByTestId("cross-relation-totals").textContent).toContain(
      "0 sortante(s) · 0 entrante(s) · 0 suggestion(s)",
    );
  });
});
