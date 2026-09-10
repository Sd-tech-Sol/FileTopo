import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DetailsPanel from "./DetailsPanel";
import MapView, { LABEL_MIN_HEIGHT, LABEL_MIN_WIDTH, truncateCardLabel } from "./MapView";
import type { RelationSegment } from "./relations";
import { buildHierarchy, hierarchicalNeighbourhood, move } from "./hierarchy";
import { aggregate, selectionTargets, summarize } from "./measure";
import { composeTerritories } from "./territories";
import type { BrainNodeRef, BrainRecord, MapNode, NodeDetail, Rect } from "./types";
import { fitView, type View } from "./viewState";

// This project does not enable Vitest globals, so Testing Library's automatic
// cleanup never registers; without this the second render of a suite finds the
// first one still in the document.
afterEach(cleanup);

/** Small synthetic tree, laid out by hand so the geometry is obvious. */
function node(
  id: number,
  parentId: number | null,
  name: string,
  kind: MapNode["kind"],
  depth: number,
  rect: Rect,
  extra: Partial<MapNode> = {},
): MapNode {
  return {
    id,
    parentId,
    name,
    relativePath: name === "racine" ? "" : name,
    kind,
    depth,
    sizeBytes: 100 * id,
    modifiedUnixMs: 1_700_000_000_000 + id,
    childCount: 0,
    accessDiagnostic: null,
    rect,
    ...extra,
  };
}

const nodes: MapNode[] = [
  node(1, null, "racine", "root", 0, { x: 0, y: 138, w: 240, h: 64 }, { childCount: 2 }),
  node(2, 1, "alpha", "directory", 1, { x: 360, y: 46, w: 240, h: 64 }, { childCount: 2 }),
  node(3, 1, "beta", "directory", 1, { x: 360, y: 230, w: 240, h: 64 }, {
    childCount: 0,
    accessDiagnostic: "directory_unreadable",
  }),
  node(4, 2, "un.txt", "file", 2, { x: 720, y: 0, w: 240, h: 64 }),
  node(5, 2, "deux.txt", "file", 2, { x: 720, y: 92, w: 240, h: 64 }),
];

const world: Rect = { x: 0, y: 0, w: 960, h: 294 };
const hierarchy = buildHierarchy(nodes, 1);

/**
 * One synthetic brain, so the composed `MapView` can be rendered at all.
 *
 * `TASK-0019` turned the map into a **composition of territories**: there is no
 * longer a « the hierarchy » prop to pass. These tests are about one brain's
 * behaviour, so they compose exactly one — which is `C1`, the mode the previous
 * slice shipped, and the case `L9`'s last sentence says must not change.
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

const panelStrings = {
  title: "Détails",
  empty: "vide",
  loading: "chargement",
  name: "Nom",
  kind: "Type",
  path: "Chemin",
  size: "Taille",
  modified: "Modifié",
  parent: "Parent",
  children: "Enfants directs",
  diagnostic: "Diagnostic d'accès",
  noDiagnostic: "aucun",
  noParent: "racine",
  noChildren: "aucun enfant",
  rootPath: "(racine)",
  kinds: { root: "racine", directory: "dossier", file: "fichier", skipped: "ignoré" },
};

function Harness({
  onSelect,
  segments = [],
  relationNeighbours = new Set<number>(),
}: {
  onSelect?: (reference: BrainNodeRef) => void;
  segments?: RelationSegment[];
  relationNeighbours?: Set<number>;
}) {
  const viewport = { width: 800, height: 600 };
  const composition = composeTerritories([
    { brainId: BRAIN, layoutWidth: world.w, layoutHeight: world.h },
  ]);
  const [view, setView] = useState<View>(() => fitView(composition.world, viewport));
  const [selected, setSelected] = useState<BrainNodeRef | null>({ brainId: BRAIN, nodeId: 1 });
  return (
    <MapView
      brains={[
        {
          brainId: BRAIN,
          record,
          hierarchy,
          segments,
          relationNeighbours,
          // No inter-brain relation in this harness: it draws ONE brain, and an
          // inter-brain relation needs two.
          crossNeighbours: new Set<number>(),
          nodeCount: nodes.length,
        },
      ]}
      crossSegments={[]}
      composition={composition}
      view={view}
      viewport={viewport}
      selected={selected}
      focusedBrainId={BRAIN}
      onViewChange={setView}
      onSelect={(reference) => {
        setSelected(reference);
        onSelect?.(reference);
      }}
      onViewportChange={() => {}}
      labelFor={(target) => `${target.name} (${target.kind})`}
      territoryLabelFor={(brain, nodeCount) => `${brain.displayName}, ${nodeCount} noeuds`}
      ariaLabel="carte"
    />
  );
}

describe("map selection — P-06, H4", () => {
  it("exposes every node as an accessible tree item, whatever the selection", () => {
    render(<Harness />);
    const items = screen.getAllByRole("treeitem");
    expect(items).toHaveLength(nodes.length);
    // Attenuated nodes keep their accessible name: nothing is erased.
    expect(screen.getByLabelText("deux.txt (file)")).toBeInTheDocument();
  });

  it("selects with the mouse", () => {
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);
    fireEvent.pointerDown(screen.getByLabelText("alpha (directory)"));
    expect(onSelect).toHaveBeenCalledWith({ brainId: BRAIN, nodeId: 2 });
    expect(screen.getByLabelText("alpha (directory)")).toHaveAttribute("aria-selected", "true");
  });

  it("reaches the same nodes with the keyboard alone", () => {
    render(<Harness />);
    const map = screen.getByRole("tree");
    map.focus();

    fireEvent.keyDown(map, { key: "ArrowRight" }); // root → first child
    expect(screen.getByLabelText("alpha (directory)")).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(map, { key: "ArrowDown" }); // next sibling
    expect(screen.getByLabelText("beta (directory)")).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(map, { key: "ArrowUp" }); // previous sibling
    fireEvent.keyDown(map, { key: "ArrowRight" }); // into alpha's children
    expect(screen.getByLabelText("un.txt (file)")).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(map, { key: "ArrowLeft" }); // back to the parent
    expect(screen.getByLabelText("alpha (directory)")).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(map, { key: "Home" });
    expect(screen.getByLabelText("racine (root)")).toHaveAttribute("aria-selected", "true");
  });

  it("marks an access diagnostic on the map itself, not by colour alone", () => {
    const { container } = render(<Harness />);
    const flagged = container.querySelectorAll(".map-node__diagnostic");
    expect(flagged).toHaveLength(1);
  });

  it("draws one namespaced hierarchy edge per non-root card", () => {
    const { container } = render(<Harness />);
    const cards = container.querySelectorAll('[data-card="true"]');
    const edges = container.querySelectorAll('[data-edge-kind="hierarchy"]');
    expect(cards).toHaveLength(nodes.length);
    expect(edges).toHaveLength(nodes.length - 1);
    for (const edge of edges) {
      expect(edge.id.startsWith(`${BRAIN}-hierarchy-edge-`)).toBe(true);
      expect(edge.getAttribute("data-brain-id")).toBe(BRAIN);
    }
  });

  it("renders fixed independent cards with non-colour kind glyphs", () => {
    const { container } = render(<Harness />);
    for (const card of container.querySelectorAll<SVGGElement>('[data-card="true"]')) {
      expect(card.dataset.cardWidth).toBe("240");
      expect(card.dataset.cardHeight).toBe("64");
      expect(card.querySelector(".map-node__kind-glyph")).not.toBeNull();
      expect(card.querySelector("title")?.textContent).toBeTruthy();
    }
  });

  it("keeps the selected label drawn, in the screen-space label layer", () => {
    // Labels no longer live inside the block group: blocks are drawn in layout
    // coordinates inside one transformed group so a pan costs one attribute,
    // and text that scaled with it would be unreadable. P-02 still requires the
    // selected block's label to be legible, so it is drawn regardless of size.
    const { container } = render(<Harness />);
    const beta = container.querySelector(`#${BRAIN}-map-node-3`);
    expect(beta).not.toBeNull();
    fireEvent.pointerDown(beta as Element);
    const layer = container.querySelector(".map-view__labels") as HTMLElement;
    expect(within(layer).getByText("beta")).toBeInTheDocument();
  });

  it("pans and zooms by transforming one group, not by re-projecting nodes", () => {
    // H10 in spirit: the layout is paid once. A frame must not rewrite every
    // rectangle, so the rects stay in layout coordinates and only the group
    // transform moves.
    const { container } = render(<Harness />);
    const group = container.querySelector('[data-testid="composed-world"]') as SVGGElement;
    const before = group.getAttribute("transform");
    const rect = container.querySelector(`#${BRAIN}-map-node-2 rect`) as SVGRectElement;
    const rectXBefore = rect.getAttribute("x");

    fireEvent.keyDown(screen.getByRole("tree"), { key: "+" });

    expect(group.getAttribute("transform")).not.toBe(before);
    expect(rect.getAttribute("x")).toBe(rectXBefore);
  });
});

describe("hierarchy helpers", () => {
  it("accentuates exactly the parent, the node and its direct children", () => {
    expect([...hierarchicalNeighbourhood(hierarchy, 2)].sort()).toEqual([1, 2, 4, 5]);
    // A grandchild of the root is not part of the root's neighbourhood.
    expect([...hierarchicalNeighbourhood(hierarchy, 1)].sort()).toEqual([1, 2, 3]);
  });

  it("returns null at the edges instead of wrapping around", () => {
    expect(move(hierarchy, 1, "parent")).toBeNull();
    expect(move(hierarchy, 3, "child")).toBeNull();
    expect(move(hierarchy, 2, "previous")).toBeNull();
    expect(move(hierarchy, 3, "next")).toBeNull();
  });
});

describe("node-card labels", () => {
  it("uses a stable screen-space threshold", () => {
    expect(LABEL_MIN_WIDTH).toBeGreaterThan(0);
    expect(LABEL_MIN_HEIGHT).toBeGreaterThan(0);
    expect(LABEL_MIN_WIDTH).toBeLessThan(240);
    expect(LABEL_MIN_HEIGHT).toBeLessThan(64);
  });

  it("truncates only the rendered copy and preserves the supplied name", () => {
    const original = "un-nom-de-document-volontairement-tres-long.txt";
    const rendered = truncateCardLabel(original, 70);
    expect(rendered).toMatch(/…$/);
    expect(rendered.length).toBeLessThan(original.length);
  });
});

describe("details panel — P-12, H5", () => {
  const detail: NodeDetail = {
    node: nodes[2],
    parent: nodes[0],
    children: [],
  };

  it("shows the access diagnostic rather than hiding it", () => {
    render(
      <DetailsPanel
        detail={detail}
        loading={false}
        onSelect={() => {}}
        locale="fr"
        strings={panelStrings}
      />,
    );
    expect(screen.getByText("directory_unreadable")).toBeVisible();
  });

  it("offers the parent and the direct children as reachable controls", () => {
    render(
      <DetailsPanel
        detail={{ node: nodes[1], parent: nodes[0], children: [nodes[3], nodes[4]] }}
        loading={false}
        onSelect={() => {}}
        locale="fr"
        strings={panelStrings}
      />,
    );
    expect(screen.getByRole("button", { name: /racine/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /un\.txt/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /deux\.txt/ })).toBeInTheDocument();
  });

  it("says a node has no children instead of showing an empty list", () => {
    render(
      <DetailsPanel
        detail={detail}
        loading={false}
        onSelect={() => {}}
        locale="fr"
        strings={panelStrings}
      />,
    );
    expect(screen.getByText("aucun enfant")).toBeInTheDocument();
  });
});

describe("measurement statistics — H9", () => {
  it("reports the median, the extremes and the worst value, hiding none", () => {
    const stat = summarize([5, 1, 9, 3, 7]);
    expect(stat).toEqual({ count: 5, median: 5, min: 1, max: 9, mean: 5 });
    expect(summarize([2, 4]).median).toBe(3);
    expect(summarize([]).count).toBe(0);
  });

  it("aggregates every run, worst frame included", () => {
    const measurement = aggregate("wide", 2207, { width: 900, height: 600 }, [
      { run: 1, frameTimesMs: [16, 17], selectionLatenciesMs: [20] },
      { run: 2, frameTimesMs: [16, 120], selectionLatenciesMs: [25] },
    ]);
    expect(measurement.frameTime.count).toBe(4);
    expect(measurement.worstFrameMs).toBe(120);
    expect(measurement.worstSelectionMs).toBe(25);
    expect(measurement.runs).toHaveLength(2);
    expect(measurement.viewport).toEqual({ width: 900, height: 600 });
  });

  it("spreads selection targets across the tree rather than clustering", () => {
    const targets = selectionTargets([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 4);
    expect(targets).toEqual([1, 4, 7, 10]);
    expect(selectionTargets([], 4)).toEqual([]);
  });
});
