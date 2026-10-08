import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildHierarchy } from "./hierarchy";
import MapView, { aggregateLabel } from "./MapView";
import { composeTerritories } from "./territories";
import type { BrainRecord, MapNode, Rect, ViewAggregate } from "./types";

// `TASK-0054` (F-051) — the frontend half of the exact-aggregate contract: an aggregate is a labelled,
// countable, non-openable indicator and nothing else. Every guard below is paired with a falsification.
afterEach(cleanup);

function node(id: number, parentId: number | null, name: string, kind: MapNode["kind"], depth: number, childCount = 0): MapNode {
  const rect: Rect = { x: depth * 360, y: id * 92, w: 240, h: 64 };
  return {
    id,
    parentId,
    name,
    relativePath: parentId === null ? name : `a/${name}`,
    kind,
    depth,
    sizeBytes: 0,
    modifiedUnixMs: null,
    childCount,
    accessDiagnostic: null,
    rect,
  };
}
const nodes: MapNode[] = [node(10, null, "a", "directory", 0, 1_000_000), node(11, 10, "a1", "file", 1)];
const record: BrainRecord = {
  brainId: "brain-test",
  displayName: "Cerveau de test",
  color: "#2E5FA3",
  icon: "▲",
  sourceKind: "SYNTHETIC_FIXTURE",
  sourceRef: "s",
  sourceLabel: "s",
  position: 1,
};

function map(locale: "fr" | "en", aggregates: ViewAggregate[], onExpand = vi.fn()) {
  const composition = composeTerritories([{ brainId: "brain-test", layoutWidth: 600, layoutHeight: 300 }]);
  return (
    <MapView
      locale={locale}
      brains={[
        {
          brainId: "brain-test",
          record,
          hierarchy: buildHierarchy(nodes, 10),
          segments: [],
          relationNeighbours: new Set(),
          crossNeighbours: new Set(),
          nodeCount: 1_000_001,
          collapsed: new Map(),
          branchRootId: undefined,
          aggregates,
        },
      ]}
      crossSegments={[]}
      composition={composition}
      view={{ scale: 1, tx: 0, ty: 0 }}
      viewport={{ width: 800, height: 600 }}
      selected={null}
      focusedBrainId="brain-test"
      onViewChange={() => {}}
      onSelect={() => {}}
      onViewportChange={() => {}}
      onExpand={onExpand}
      labelFor={(target) => target.name}
      territoryLabelFor={() => "territoire"}
      ariaLabel="carte"
    />
  );
}
const aggregate = (omitted: number, cursor: string | null = "ftc1.idx.1.1.10"): ViewAggregate => ({
  parentId: 10,
  omittedDirectChildren: omitted,
  reason: "view_budget_or_focus",
  nextCursor: cursor,
  rect: { x: 360, y: 184, w: 240, h: 64 },
});

describe("aggregate label — exact count, readable reason (F51-1)", () => {
  it.each([1, 2, 63, 999_999, 1_000_000])("never rounds, caps or abbreviates %i", (count) => {
    const fr = aggregateLabel(count, "fr");
    const en = aggregateLabel(count, "en");
    expect(fr.startsWith(`+${count} élément`)).toBe(true);
    expect(en.startsWith(`+${count} item`)).toBe(true);
    expect(fr).toContain("Voir la suite");
    expect(en).toContain("See more");
    // No "k", "M", "~" or "plus de": the figure is the figure.
    expect(fr + en).not.toMatch(/[~≈]|\d\s?[kKM]\b|plus de|more than/);
  });

  it("falsification: a count off by one yields a different label", () => {
    expect(aggregateLabel(700, "fr")).not.toBe(aggregateLabel(701, "fr"));
    expect(aggregateLabel(700, "fr")).not.toBe(aggregateLabel(699, "fr"));
  });

  it("uses the singular for one item and the plural otherwise", () => {
    expect(aggregateLabel(1, "fr")).toContain("1 élément ");
    expect(aggregateLabel(2, "fr")).toContain("2 éléments");
    expect(aggregateLabel(1, "en")).toContain("1 item ");
    expect(aggregateLabel(2, "en")).toContain("2 items");
  });
});

describe("aggregate indicator — not a folder, not a path, not openable (F51-1)", () => {
  it("is a labelled tree item carrying the exact omitted count", () => {
    render(map("fr", [aggregate(999_999)]));
    const indicator = screen.getByTestId("map-aggregate-indicator");
    expect(indicator).toHaveAttribute("role", "treeitem");
    expect(indicator).toHaveAttribute("aria-label", aggregateLabel(999_999, "fr"));
    expect(indicator).toHaveAttribute("data-parent-id", "10");
  });

  it("is never drawn as a node card: no node id, no card flag, no path, no kind", () => {
    render(map("en", [aggregate(7)]));
    const indicator = screen.getByTestId("map-aggregate-indicator");
    expect(indicator).not.toHaveAttribute("data-node-id");
    expect(indicator).not.toHaveAttribute("data-card");
    expect(indicator.outerHTML).not.toMatch(/relative-?path|data-kind|href|download|open|copy/i);
    // Two real nodes are cards; the aggregate is not one of them.
    expect(document.querySelectorAll('[data-card="true"]').length).toBe(nodes.length);
  });

  it("falsification: a tampered DTO carrying path/kind fields does not make the indicator openable", () => {
    const tampered = { ...aggregate(5), relativePath: "secret/dir", kind: "directory", openable: true } as ViewAggregate;
    render(map("fr", [tampered]));
    const indicator = screen.getByTestId("map-aggregate-indicator");
    expect(indicator.outerHTML).not.toContain("secret/dir");
    expect(indicator).not.toHaveAttribute("data-node-id");
    expect(document.querySelectorAll('[data-card="true"]').length).toBe(nodes.length);
  });

  it("expands with the exact parent and cursor on click and on Enter/Space only", () => {
    const onExpand = vi.fn();
    render(map("fr", [aggregate(42, "ftc1.idx.1.1.10")], onExpand));
    const indicator = screen.getByTestId("map-aggregate-indicator");
    fireEvent.click(indicator);
    fireEvent.keyDown(indicator, { key: "Enter" });
    fireEvent.keyDown(indicator, { key: " " });
    fireEvent.keyDown(indicator, { key: "a" });
    expect(onExpand).toHaveBeenCalledTimes(3);
    for (const call of onExpand.mock.calls) {
      expect(call[0]).toBe("brain-test");
      expect(call[1].parentId).toBe(10);
      expect(call[1].omittedDirectChildren).toBe(42);
      expect(call[1].nextCursor).toBe("ftc1.idx.1.1.10");
    }
  });
});
