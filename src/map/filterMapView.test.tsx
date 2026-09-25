import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { filterRoles } from "./filters";
import { buildHierarchy } from "./hierarchy";
import MapView from "./MapView";
import { composeTerritories } from "./territories";
import type { BrainRecord, MapNode, Rect } from "./types";
import { fitView } from "./viewState";

afterEach(cleanup);

function node(id: number, parentId: number | null, name: string, kind: MapNode["kind"], depth: number, rect: Rect): MapNode {
  return {
    id,
    parentId,
    name,
    relativePath: name,
    kind,
    depth,
    sizeBytes: 0,
    modifiedUnixMs: null,
    childCount: 0,
    accessDiagnostic: null,
    rect,
  };
}

const nodes: MapNode[] = [
  node(1, null, "racine", "root", 0, { x: 0, y: 46, w: 240, h: 64 }),
  node(2, 1, "docs", "directory", 1, { x: 360, y: 0, w: 240, h: 64 }),
  node(4, 2, "neuf.txt", "file", 2, { x: 720, y: 0, w: 240, h: 64 }),
];
const BRAIN = "brain-filter";
const record: BrainRecord = {
  brainId: BRAIN,
  displayName: "Cerveau filtré",
  color: "#2E5FA3",
  icon: "▲",
  sourceKind: "SYNTHETIC_FIXTURE",
  sourceRef: "synthetique",
  sourceLabel: "synthetique",
  position: 1,
};

function renderView(roles: ReturnType<typeof filterRoles> | undefined) {
  const viewport = { width: 800, height: 600 };
  const composition = composeTerritories([{ brainId: BRAIN, layoutWidth: 960, layoutHeight: 110 }]);
  return render(
    <MapView locale="fr"
      brains={[
        {
          brainId: BRAIN,
          record,
          hierarchy: buildHierarchy(nodes, 1),
          segments: [],
          relationNeighbours: new Set<number>(),
          crossNeighbours: new Set<number>(),
          nodeCount: nodes.length,
          filterRoles: roles,
        },
      ]}
      crossSegments={[]}
      composition={composition}
      view={fitView(composition.world, viewport)}
      viewport={viewport}
      selected={null}
      focusedBrainId={BRAIN}
      onViewChange={() => {}}
      onSelect={() => {}}
      onViewportChange={() => {}}
      labelFor={(n, b) => `${b.displayName} · ${n.name}`}
      territoryLabelFor={(b) => b.displayName}
      ariaLabel="Carte"
    />,
  );
}

const card = (container: HTMLElement, id: number) =>
  container.querySelector(`[data-node-id="${id}"]`) as SVGGElement;

describe("TASK-0039 — correspondance et contexte sur la carte", () => {
  it("écrit le rôle sur la carte, dans son nom accessible et dans son contour, pas en couleur seule", () => {
    const { container } = renderView(filterRoles({ filterMatchIds: [4], filterContextIds: [1, 2] }));
    const match = card(container, 4);
    expect(match.getAttribute("data-filter-role")).toBe("match");
    expect(match.getAttribute("aria-label")).toContain("Correspondance");
    expect(match.getAttribute("class")).toContain("map-node--filter-match");
    expect(match.textContent).toContain("Correspondance");
    expect(match.textContent).toContain("◆");

    for (const id of [1, 2]) {
      const context = card(container, id);
      expect(context.getAttribute("data-filter-role")).toBe("context");
      expect(context.getAttribute("aria-label")).toContain("Contexte");
      expect(context.getAttribute("aria-label")).not.toContain("Correspondance");
      expect(context.getAttribute("class")).toContain("map-node--filter-context");
      expect(context.textContent).toContain("Contexte");
      expect(context.textContent).toContain("◇");
    }
  });

  it("la projection normale n'est pas touchée : aucun rôle, aucune étiquette, aucun libellé ajouté", () => {
    for (const roles of [undefined, filterRoles(null)]) {
      const { container, unmount } = renderView(roles);
      for (const id of [1, 2, 4]) {
        const n = card(container, id);
        expect(n.hasAttribute("data-filter-role")).toBe(false);
        expect(n.getAttribute("aria-label")).not.toMatch(/Correspondance|Contexte/);
        expect(n.getAttribute("class")).not.toContain("filter");
        expect(n.textContent).not.toMatch(/Correspondance|Contexte/);
      }
      unmount();
    }
  });
});
