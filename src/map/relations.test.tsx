import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import MapView from "./MapView";
import RelationsPanel from "./RelationsPanel";
import { buildHierarchy } from "./hierarchy";
import {
  establishedNeighbours,
  relationKey,
  relationSegments,
  relationTypeLabel,
  RELATION_TYPE_LABELS_EN,
} from "./relations";
import { composeTerritories } from "./territories";
import type {
  BrainRecord,
  MapNode,
  NodeRelationEntry,
  NodeRelations,
  Rect,
  RelationEdge,
  RelationEndpoint,
  RelationsOverview,
  SuggestionEdge,
} from "./types";
import { fitView, type View } from "./viewState";

// Vitest globals are off in this project, so Testing Library's automatic
// cleanup never registers on its own.
afterEach(cleanup);

/* --- a small synthetic world, mirroring `quasi-empty` in miniature -------- */

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
  node(5, "racine-2.txt", 1, { x: 150, y: 150, w: 100, h: 100 }),
];
const world: Rect = { x: 0, y: 0, w: 400, h: 400 };

/**
 * The one brain these tests compose — `C1`.
 *
 * `J8` and `J9` are about relations **inside** a brain, and `L8` says an edge
 * never leaves one, so a single territory is the whole subject. The `L8` case
 * itself — that no edge crosses a boundary — is proved in `composedView.test`.
 */
const BRAIN = "brain-test";
const record: BrainRecord = {
  brainId: BRAIN,
  displayName: "Cerveau de test",
  color: "#2E5FA3",
  icon: "▲",
  sourceKind: "SYNTHETIC_FIXTURE",
  sourceRef: "synthetique",
  sourceLabel: "synthetique",
  position: 1,
};
const hierarchy = buildHierarchy(nodes, 1);

function endpoint(id: number): RelationEndpoint {
  const found = nodes.find((candidate) => candidate.id === id)!;
  return {
    key: `ek1|quasi-empty|${found.relativePath}`,
    nodeId: found.id,
    name: found.name,
    relativePath: found.relativePath,
  };
}

function edge(
  from: number,
  to: number,
  provenance: RelationEdge["provenance"],
  relationType = "reference",
): RelationEdge {
  return {
    id: from * 100 + to,
    provenance,
    relationType,
    source: endpoint(from),
    target: endpoint(to),
    ruleName: provenance === "DETERMINISTIC" ? "homonymes" : null,
    ruleVersion: provenance === "DETERMINISTIC" ? "v1" : null,
    suggestionKey: provenance === "APPROVED" ? "S-001" : null,
  };
}

const suggestion: SuggestionEdge = {
  suggestionKey: "S-005",
  relationType: "reference",
  source: endpoint(2),
  target: endpoint(5),
  state: "pending",
  basis: "fixture-synthetique-task-0017",
};

const overview: RelationsOverview = {
  brainId: "brain-alpha",
  fixtureId: "quasi-empty",
  relationsPath: "brains/brain-alpha/relations/relations.sqlite",
  schemaVersion: 1,
  endpointKeyScheme: "ek1",
  legacyInScope: true,
  established: [
    edge(2, 3, "DETERMINISTIC", "revision"),
    edge(2, 4, "DETERMINISTIC"),
    edge(5, 2, "APPROVED"),
  ],
  pendingSuggestions: [suggestion],
  deterministicCount: 2,
  approvedCount: 1,
  pendingSuggestionCount: 1,
  rules: [],
  unresolvedEndpoints: [],
  deterministicDigest: "fnv1a64:0000000000000000",
  seeded: 0,
};

function entry(
  direction: NodeRelationEntry["direction"],
  other: number,
  provenance: NodeRelationEntry["provenance"],
  relationType = "reference",
): NodeRelationEntry {
  return {
    direction,
    provenance,
    relationType,
    other: endpoint(other),
    ruleName: provenance === "DETERMINISTIC" ? "homonymes" : null,
    ruleVersion: provenance === "DETERMINISTIC" ? "v1" : null,
  };
}

const nodeRelations: NodeRelations = {
  brainId: "brain-alpha",
  fixtureId: "quasi-empty",
  reference: { brainId: "brain-alpha", nodeId: 2 },
  endpointKey: "ek1|brain-alpha|note-1.txt",
  relativePath: "note-1.txt",
  outgoing: [entry("outgoing", 3, "DETERMINISTIC", "revision"), entry("outgoing", 4, "DETERMINISTIC")],
  incoming: [entry("incoming", 5, "APPROVED")],
  outgoingCount: 2,
  incomingCount: 1,
  suggestions: [suggestion],
};

/* --- J6 : the panel ------------------------------------------------------ */

describe("J6 — le panneau des relations", () => {
  function renderPanel(overrides: Partial<Parameters<typeof RelationsPanel>[0]> = {}) {
    const onSelect = vi.fn();
    const onApprove = vi.fn();
    render(
      <RelationsPanel
        relations={nodeRelations}
        loading={false}
        available
        legacyInScope
        onSelect={onSelect}
        onApprove={onApprove}
        approving={null}
        {...overrides}
      />,
    );
    return { onSelect, onApprove };
  }

  it("groupe par direction, et chaque direction porte son compte", () => {
    renderPanel();
    const outgoing = screen.getByRole("region", { name: /Sortantes \(2\)/ });
    const incoming = screen.getByRole("region", { name: /Entrantes \(1\)/ });

    expect(within(outgoing).getAllByRole("button")).toHaveLength(2);
    expect(within(incoming).getAllByRole("button")).toHaveLength(1);
  });

  it("présente type, direction et provenance pour chaque relation", () => {
    renderPanel();
    const outgoing = screen.getByRole("region", { name: /Sortantes/ });

    // Type, as a heading over its group.
    expect(within(outgoing).getByText(/référence/)).toBeInTheDocument();
    expect(within(outgoing).getByText(/révision de/)).toBeInTheDocument();
    // Provenance, in words rather than in a hue.
    expect(within(outgoing).getAllByText(/déterministe/)).toHaveLength(2);
    const incoming = screen.getByRole("region", { name: /Entrantes/ });
    expect(within(incoming).getByText(/^approuvée$/)).toBeInTheDocument();
    // Direction, as a glyph beside the entry and as the section it sits in.
    expect(within(outgoing).getAllByText("→")).toHaveLength(2);
    expect(within(incoming).getByText("←")).toBeInTheDocument();
  });

  it("rend le nom et la version de règle consultables pour une relation déterministe", () => {
    renderPanel();
    const rules = screen.getAllByText(/Règle :/);
    expect(rules).toHaveLength(2);
    expect(rules[0].textContent).toContain("homonymes");
    expect(rules[0].textContent).toContain("v1");
  });

  it("dit explicitement qu'une relation approuvée ne vient d'aucune règle", () => {
    renderPanel();
    expect(screen.getByText(/Aucune règle déterministe/)).toBeInTheDocument();
  });

  it("rend chaque entrée atteignable au clavier", () => {
    renderPanel();
    const entries = screen
      .getAllByRole("button")
      .filter((button) => button.className.includes("relation__link"));
    expect(entries.length).toBeGreaterThan(0);
    for (const button of entries) {
      expect(button.tagName).toBe("BUTTON");
      expect(button).not.toBeDisabled();
      button.focus();
      expect(document.activeElement).toBe(button);
    }
  });

  it("ne compte jamais une suggestion parmi les relations", () => {
    renderPanel();
    const totals = screen.getByTestId("relation-totals");
    expect(totals.textContent).toContain("2 sortante(s)");
    expect(totals.textContent).toContain("1 entrante(s)");
    expect(totals.textContent).toContain("1 suggestion(s)");
    expect(totals.textContent).toContain("non comptée(s)");

    // And the suggestion is nowhere inside a direction section.
    const outgoing = screen.getByRole("region", { name: /Sortantes/ });
    expect(within(outgoing).queryByText(/suggestion/i)).toBeNull();
  });

  it("nomme la suggestion « suggestion » et la déclare non établie", () => {
    renderPanel();
    const suggestions = screen.getByRole("region", { name: "Suggestions non établies" });
    expect(within(suggestions).getByText("suggestion")).toBeInTheDocument();
    expect(within(suggestions).getByText("non établie")).toBeInTheDocument();
    expect(
      within(suggestions).getByRole("button", { name: /Approuver S-005/ }),
    ).toBeInTheDocument();
  });

  it("n'approuve que sur action explicite", () => {
    const { onApprove } = renderPanel();
    expect(onApprove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Approuver S-005/ }));
    expect(onApprove).toHaveBeenCalledExactlyOnceWith("S-005");
  });

  // `TASK-0024` / `X11`. The legacy perimeter and the availability of the core
  // panel are two ideas. A brain outside the frozen `TASK-0017` fixture gets a
  // sentence saying the historical demonstration relations do not apply — and
  // keeps every generic control.
  it("hors périmètre legacy, explique la limite sans retirer le panneau générique", () => {
    const onAnalyze = vi.fn();
    renderPanel({ legacyInScope: false, onAnalyze });

    const note = screen.getByTestId("legacy-scope-note");
    expect(note).toHaveTextContent(/TASK-0017/);
    expect(note).toHaveTextContent(/quasi-empty/);

    // Nothing generic is hidden by it.
    const action = screen.getByRole("button", { name: "Analyser les relations" });
    expect(action).toBeEnabled();
    fireEvent.click(action);
    expect(onAnalyze).toHaveBeenCalledOnce();
    expect(screen.getByTestId("relation-engine-state")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /Sortantes/ })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /Entrantes/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Approuver S-005/ })).toBeInTheDocument();
  });

  it("ne porte aucune mention legacy quand la fixture gelée s'applique", () => {
    renderPanel();
    expect(screen.queryByTestId("legacy-scope-note")).not.toBeInTheDocument();
  });

  it("dit que les relations sont indisponibles quand aucun aperçu n'a pu être lu", () => {
    renderPanel({ available: false });
    expect(screen.getByText(/Relations indisponibles/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Analyser les relations" }),
    ).not.toBeInTheDocument();
  });
});

/* --- J7 : navigation ----------------------------------------------------- */

describe("J7 — activer une relation sélectionne son autre extrémité", () => {
  it("sélectionne exactement l'autre extrémité, sortante comme entrante", () => {
    const onSelect = vi.fn();
    render(
      <RelationsPanel
        relations={nodeRelations}
        loading={false}
        available
        legacyInScope
        onSelect={onSelect}
        onApprove={vi.fn()}
        approving={null}
      />,
    );

    const outgoing = screen.getByRole("region", { name: /Sortantes/ });
    fireEvent.click(within(outgoing).getByRole("button", { name: /note-2\.txt/ }));
    expect(onSelect).toHaveBeenLastCalledWith(3);

    const incoming = screen.getByRole("region", { name: /Entrantes/ });
    fireEvent.click(within(incoming).getByRole("button", { name: /racine-2\.txt/ }));
    expect(onSelect).toHaveBeenLastCalledWith(5);
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it("porte sur l'entrée elle-même l'extrémité qu'elle vise", () => {
    const onSelect = vi.fn();
    render(
      <RelationsPanel
        relations={nodeRelations}
        loading={false}
        available
        legacyInScope
        onSelect={onSelect}
        onApprove={vi.fn()}
        approving={null}
      />,
    );

    // The panel groups by direction then by type; the index sorts by endpoint
    // key. Anything reading the screen must take the endpoint from the entry
    // it activates rather than reconstruct an ordering — which is how the
    // first J12 evidence published a false negative.
    const entries = [
      screen.getByRole("region", { name: /Sortantes/ }),
      screen.getByRole("region", { name: /Entrantes/ }),
    ].flatMap((section) => within(section).getAllByRole("button"));
    expect(entries).toHaveLength(3);

    for (const button of entries) {
      const endpointKey = button.getAttribute("data-endpoint-key");
      const declared = [...nodeRelations.outgoing, ...nodeRelations.incoming].find(
        (candidate) => candidate.other.key === endpointKey,
      );
      expect(declared).toBeDefined();
      expect(button.getAttribute("data-endpoint-node-id")).toBe(String(declared?.other.nodeId));
      expect(button.getAttribute("data-direction")).toBe(declared?.direction);
      expect(button.getAttribute("data-relation-type")).toBe(declared?.relationType);
      expect(button.getAttribute("data-provenance")).toBe(declared?.provenance);

      fireEvent.click(button);
      expect(onSelect).toHaveBeenLastCalledWith(declared?.other.nodeId);
    }
    expect(onSelect).toHaveBeenCalledTimes(3);
  });

  it("désactive une entrée dont l'extrémité n'est pas dans l'index courant", () => {
    const orphan: NodeRelations = {
      ...nodeRelations,
      outgoing: [
        {
          ...entry("outgoing", 3, "DETERMINISTIC"),
          other: { key: "ek1|quasi-empty|disparu.txt", nodeId: null, name: "disparu.txt", relativePath: "disparu.txt" },
        },
      ],
      outgoingCount: 1,
      incoming: [],
      incomingCount: 0,
      suggestions: [],
    };
    const onSelect = vi.fn();
    render(
      <RelationsPanel
        relations={orphan}
        loading={false}
        available
        legacyInScope
        onSelect={onSelect}
        onApprove={vi.fn()}
        approving={null}
      />,
    );
    const button = screen.getByRole("button", { name: /disparu\.txt/ });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onSelect).not.toHaveBeenCalled();
  });
});

/* --- J8 et J9 : la carte ------------------------------------------------- */

function MapHarness({ selectedId }: { selectedId: number }) {
  const viewport = { width: 800, height: 600 };
  const composition = composeTerritories([
    { brainId: BRAIN, layoutWidth: world.w, layoutHeight: world.h },
  ]);
  const [view, setView] = useState<View>(() => fitView(composition.world, viewport));
  const neighbours = establishedNeighbours(overview, selectedId);
  const segments = relationSegments(overview, hierarchy.byId, selectedId);
  return (
    <MapView
      brains={[
        {
          brainId: BRAIN,
          record,
          hierarchy,
          segments,
          relationNeighbours: neighbours,
          // `TASK-0017`'s criteria are about relations INSIDE one brain. This
          // harness draws one brain, so there is no inter-brain relation to
          // have — and passing an empty set is what keeps `J8` and `J9` about
          // what they were always about.
          crossNeighbours: new Set<number>(),
          nodeCount: hierarchy.byId.size,
        },
      ]}
      crossSegments={[]}
      composition={composition}
      view={view}
      viewport={viewport}
      selected={{ brainId: BRAIN, nodeId: selectedId }}
      focusedBrainId={BRAIN}
      onViewChange={setView}
      onSelect={() => {}}
      onViewportChange={() => {}}
      labelFor={(target) => `${target.name}`}
      territoryLabelFor={(brain, nodeCount) => `${brain.displayName}, ${nodeCount} noeuds`}
      ariaLabel="carte"
    />
  );
}

describe("J8 — accentuation de la sélection", () => {
  it("accentue le nœud, son parent, ses enfants directs et ses voisins établis", () => {
    const { container } = render(<MapHarness selectedId={2} />);

    expect(container.querySelectorAll(".map-node--selected")).toHaveLength(1);
    // `racine` is the parent of the selection.
    expect(container.querySelector(`#${BRAIN}-map-node-1`)?.getAttribute("class")).toContain(
      "map-node--related",
    );
    // `note-2.txt`, `note-3.txt` and `racine-2.txt` are cross-cutting neighbours.
    for (const id of [3, 4, 5]) {
      expect(container.querySelector(`#${BRAIN}-map-node-${id}`)?.getAttribute("class")).toContain(
        "map-node--linked",
      );
    }
  });

  it("laisse l'atténué visible, nommé et dans l'arbre", () => {
    const { container } = render(<MapHarness selectedId={4} />);
    const attenuated = container.querySelectorAll(".map-node--plain");
    expect(attenuated.length).toBeGreaterThan(0);
    for (const element of attenuated) {
      expect(element.getAttribute("role")).toBe("treeitem");
      expect(element.getAttribute("aria-label")).toBeTruthy();
      // Attenuation is opacity on the fill, never `display: none` or a removal.
      expect(element.querySelector("rect")).not.toBeNull();
    }
  });

  it("n'accentue pas un voisin qui n'est qu'une suggestion", () => {
    // `note-1.txt` → `racine-2.txt` exists both as an APPROVED relation and as
    // the pending suggestion `S-005`; a graph with only the suggestion must
    // accentuate nothing.
    const suggestionOnly: RelationsOverview = {
      ...overview,
      established: [],
      deterministicCount: 0,
      approvedCount: 0,
    };
    expect(establishedNeighbours(suggestionOnly, 2).size).toBe(0);
    expect(establishedNeighbours(overview, 2)).toEqual(new Set([3, 4, 5]));
  });
});

describe("J9 — affichage des relations sur la carte", () => {
  it("dessine une tête de flèche sur une relation établie, et aucune sur une suggestion", () => {
    const { container } = render(<MapHarness selectedId={2} />);

    expect(container.querySelectorAll(".map-edge--established")).toHaveLength(3);
    expect(container.querySelectorAll(".map-edge--suggestion")).toHaveLength(1);
    expect(container.querySelectorAll(".map-edge--established .map-edge__arrow")).toHaveLength(3);
    expect(container.querySelectorAll(".map-edge--suggestion .map-edge__arrow")).toHaveLength(0);
    // Open rings at both ends instead — shape, not colour.
    expect(container.querySelectorAll(".map-edge--suggestion .map-edge__ring")).toHaveLength(2);
  });

  it("distingue les deux provenances par une classe propre, en plus du mot dans le panneau", () => {
    const { container } = render(<MapHarness selectedId={2} />);
    expect(container.querySelectorAll(".map-edge--deterministic")).toHaveLength(2);
    expect(container.querySelectorAll(".map-edge--approved")).toHaveLength(1);
  });

  it("nomme la suggestion comme non établie dans son titre accessible", () => {
    const { container } = render(<MapHarness selectedId={2} />);
    const titles = [...container.querySelectorAll(".map-edge--suggestion title")].map(
      (element) => element.textContent ?? "",
    );
    expect(titles).toHaveLength(1);
    expect(titles[0]).toContain("SUGGESTION non établie");
    expect(titles[0]).not.toContain("relation établie");
  });

  it("annonce une relation établie avec son type et sa provenance", () => {
    const { container } = render(<MapHarness selectedId={2} />);
    const titles = [...container.querySelectorAll(".map-edge--established title")].map(
      (element) => element.textContent ?? "",
    );
    expect(titles.some((title) => title.includes("provenance déterministe"))).toBe(true);
    expect(titles.some((title) => title.includes("provenance approuvée"))).toBe(true);
  });
});

/* --- les projections pures ----------------------------------------------- */

describe("projection des relations", () => {
  it("ne produit aucun segment pour une extrémité que l'index ne résout pas", () => {
    const orphaned: RelationsOverview = {
      ...overview,
      established: [
        {
          ...edge(2, 3, "DETERMINISTIC"),
          target: { key: "ek1|quasi-empty|absent", nodeId: null, name: "absent", relativePath: "absent" },
        },
      ],
      pendingSuggestions: [],
    };
    expect(relationSegments(orphaned, hierarchy.byId, 2)).toHaveLength(0);
  });

  it("relie les bords des rectangles déjà persistés, sans recalcul de calepinage", () => {
    const segments = relationSegments(overview, hierarchy.byId, null);
    const first = segments.find((segment) => segment.fromNodeId === 2 && segment.toNodeId === 3);
    expect(first).toBeDefined();
    // Right edge of `note-1.txt` and left edge of `note-2.txt`.
    expect(first).toMatchObject({ x1: 110, y1: 60, x2: 150, y2: 60 });
  });

  it("marque les segments qui touchent la sélection", () => {
    const segments = relationSegments(overview, hierarchy.byId, 5);
    const touching = segments.filter((segment) => segment.touchesSelection);
    // The APPROVED relation `racine-2.txt` → `note-1.txt` and the suggestion
    // `note-1.txt` ⇢ `racine-2.txt` both touch node 5.
    expect(touching).toHaveLength(2);
  });

  it("nomme une relation par ses extrémités et sa provenance, jamais par l'id de ligne", () => {
    const deterministic = edge(2, 3, "DETERMINISTIC");
    const withOtherRowId: RelationEdge = { ...deterministic, id: 9999 };
    expect(relationKey(deterministic)).toBe(relationKey(withOtherRowId));
    expect(relationKey(deterministic)).not.toBe(relationKey(edge(2, 3, "APPROVED")));
  });
});

describe("TASK-0024 — deterministic relation engine UI", () => {
  const coreSuggestion: SuggestionEdge = {
    suggestionKey: "dre1:synthetic",
    relationType: "revision",
    source: endpoint(2),
    target: endpoint(3),
    state: "pending",
    basis: "dre-v1",
    producer: "core-rule-engine",
    ruleName: "core.numbered-sibling-revision-candidate",
    ruleVersion: "v1",
    explanationFr: "Suggestion créée à partir de faits observés.",
    explanationEn: "Suggestion created from observed facts.",
    signals: { sameParent: true, sourceNumber: 1, targetNumber: 2 },
  };

  it("publie les libellés bilingues exacts de content-identical", () => {
    expect(relationTypeLabel("content-identical")).toBe("contenu identique");
    expect(RELATION_TYPE_LABELS_EN["content-identical"]).toBe("identical content");
  });

  it("affiche fraîcheur, action clavier, règle et signaux sans score", () => {
    const onAnalyze = vi.fn();
    render(
      <RelationsPanel
        relations={{ ...nodeRelations, suggestions: [coreSuggestion] }}
        loading={false}
        available
        legacyInScope
        onSelect={vi.fn()}
        onApprove={vi.fn()}
        approving={null}
        engineStatus={{
          brainId: "brain-alpha",
          engineVersion: "dre-v1",
          inputState: "STALE",
          mapDigest: "map",
          currentContentGenerationId: null,
          lastRunId: null,
          lastRunUnixMs: null,
          lastMapDigest: null,
          lastContentGenerationId: null,
        }}
        onAnalyze={onAnalyze}
      />,
    );
    const action = screen.getByRole("button", { name: "Analyser les relations" });
    action.focus();
    fireEvent.click(action);
    expect(onAnalyze).toHaveBeenCalledOnce();
    expect(screen.getByText("Analyse des relations à actualiser")).toBeInTheDocument();
    const explanation = screen.getByTestId("core-suggestion-explanation");
    expect(explanation).toHaveTextContent("core.numbered-sibling-revision-candidate");
    expect(explanation).toHaveTextContent("sameParent");
    expect(explanation.textContent?.toLowerCase()).not.toContain("score");
    expect(explanation.textContent?.toLowerCase()).not.toContain("confidence");
  });
});
