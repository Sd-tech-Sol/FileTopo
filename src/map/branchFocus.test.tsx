import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import BranchFocusPanel, { BRANCH_FOCUS_STRINGS } from "./BranchFocusPanel";
import {
  canCollapse,
  canFocusBranch,
  collapsedCounts,
  toggledCollapsed,
  type BranchFocusState,
} from "./branchFocus";
import { buildHierarchy } from "./hierarchy";
import MapView, { aggregateLabel, collapsedLabel } from "./MapView";
import { composeTerritories } from "./territories";
import type { BrainRecord, MapNode, MapProjection, Rect } from "./types";

// `TASK-0052` / `DEC-0050` — the frontend half of F42-2, F42-4, F42-5, F42-9, F42-10.
afterEach(cleanup);

function node(
  id: number,
  parentId: number | null,
  name: string,
  kind: MapNode["kind"],
  depth: number,
  childCount = 0,
): MapNode {
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

const nodes: MapNode[] = [
  node(10, null, "a", "directory", 0, 2),
  node(11, 10, "a1", "directory", 1, 3),
  node(12, 10, "note.txt", "file", 1),
];

function snapshot(collapsed: { nodeId: number; hiddenDescendantCount: number }[]): MapProjection {
  return {
    brainId: "brain-test",
    fixtureId: "f",
    label: "l",
    rootId: 1,
    nodeCount: 20,
    layoutWidth: 600,
    layoutHeight: 300,
    schemaVersion: 6,
    layoutAlgorithm: "layered-tree-cards-v1",
    nodes,
    diagnostics: [],
    indexRevision: 3,
    focusId: 10,
    viewBudget: 512,
    materializedCount: nodes.length,
    nonMaterializedCount: 17,
    hiddenReason: "outside_current_projection",
    aggregates: [],
    hierarchyEdges: [],
    branch: { rootNodeId: 10, collapsed },
  };
}

function state(collapsed: { nodeId: number; hiddenDescendantCount: number }[]): BranchFocusState {
  const shot = snapshot(collapsed);
  return {
    brainId: "brain-test",
    rootNodeId: 10,
    collapsed: collapsed.map((entry) => entry.nodeId),
    after: null,
    composedKey: "brain-test@brain-test",
    snapshot: shot,
    hierarchy: buildHierarchy(shot.nodes, 10),
    saved: { view: { scale: 1, tx: 0, ty: 0 }, selected: null, indexRevision: 3 },
  };
}

describe("branch focus helpers", () => {
  it("only a folder can be focused", () => {
    expect(canFocusBranch(nodes[0])).toBe(true);
    expect(canFocusBranch(nodes[2])).toBe(false);
    expect(canFocusBranch(null)).toBe(false);
  });

  it("collapses any visible folder with something to hide, the focused root included, and can always expand", () => {
    expect(canCollapse(nodes[1], false)).toBe(true);
    expect(canCollapse(nodes[0], false)).toBe(true);
    expect(canCollapse(nodes[2], false)).toBe(false);
    expect(canCollapse(nodes[2], true)).toBe(true);
    expect(canCollapse(null, false)).toBe(false);
  });

  it("toggling touches one folder and leaves the others alone", () => {
    expect(toggledCollapsed([], 11)).toEqual([11]);
    expect(toggledCollapsed([11, 30], 11)).toEqual([30]);
    expect(toggledCollapsed([30], 11)).toEqual([30, 11]);
  });

  it("reads the exact hidden counts of the view, from the backend field", () => {
    const counts = collapsedCounts(snapshot([{ nodeId: 11, hiddenDescendantCount: 42 }]));
    expect(counts.get(11)).toBe(42);
    expect(collapsedCounts({ ...snapshot([]), branch: null }).size).toBe(0);
  });
});

function panel(
  props: Partial<Parameters<typeof BranchFocusPanel>[0]> & { locale?: "fr" | "en" } = {},
) {
  return (
    <BranchFocusPanel
      locale="fr"
      active={null}
      selectedNode={nodes[0]}
      busy={false}
      onFocus={vi.fn()}
      onExit={vi.fn()}
      onToggle={vi.fn()}
      {...props}
    />
  );
}

describe("branch focus panel — F42-2, F42-10", () => {
  it("offers « Focaliser la branche » for a folder and says why not for a file", () => {
    const onFocus = vi.fn();
    const { rerender } = render(panel({ onFocus }));
    fireEvent.click(screen.getByRole("button", { name: "Focaliser la branche" }));
    expect(onFocus).toHaveBeenCalledWith(10);
    rerender(panel({ selectedNode: nodes[2], onFocus }));
    expect(screen.getByRole("button", { name: "Focaliser la branche" })).toBeDisabled();
    expect(screen.getByTestId("branch-focus-hint")).toHaveTextContent("Sélectionnez un dossier");
  });

  it.each([
    ["fr", "Branche focalisée", "Quitter le focus", "Chemin : a", "Cet état est conservé au redémarrage ; « Quitter le focus » retrouve la composition d'avant."],
    ["en", "Focused branch", "Exit branch focus", "Path: a", "This state is kept across a restart; “Exit branch focus” brings back the previous composition."],
  ] as const)("announces the focused branch, its path and the exit in %s", (locale, focused, exit, path, session) => {
    render(panel({ locale, active: state([]) }));
    expect(screen.getByTestId("branch-focus-banner")).toHaveTextContent(focused);
    expect(screen.getByTestId("branch-focus-banner")).toHaveTextContent("◆");
    expect(screen.getByTestId("branch-focus-path")).toHaveTextContent(path);
    expect(screen.getByRole("button", { name: exit })).toBeInTheDocument();
    expect(screen.getByText(session)).toBeInTheDocument();
  });

  it("moves the keyboard focus to the exit on entry and back to « Focaliser la branche » on exit", () => {
    const { rerender } = render(panel());
    rerender(panel({ active: state([]) }));
    expect(document.activeElement).toBe(screen.getByTestId("branch-exit"));
    rerender(panel({ active: null }));
    expect(document.activeElement).toBe(screen.getByTestId("branch-focus"));
  });

  it("collapse and expand are one stable button whose label changes — Enter and Space work", () => {
    const onToggle = vi.fn();
    const { rerender } = render(panel({ active: state([]), selectedNode: nodes[1], onToggle }));
    const toggle = screen.getByTestId("branch-toggle");
    expect(toggle).toHaveTextContent("Replier a1");
    toggle.focus();
    fireEvent.click(toggle); // what Enter and Space produce on a native button
    expect(onToggle).toHaveBeenCalledWith(11);
    rerender(
      panel({
        active: state([{ nodeId: 11, hiddenDescendantCount: 5 }]),
        selectedNode: nodes[1],
        onToggle,
      }),
    );
    expect(screen.getByTestId("branch-toggle")).toBe(toggle);
    expect(document.activeElement).toBe(toggle);
    expect(toggle).toHaveTextContent("Déplier a1 — 5 descendants masqués");
    expect(toggle).toHaveAttribute("data-collapsed", "true");
  });

  it("never disables a control while a branch loads — a disabled button drops the focus", () => {
    render(panel({ active: state([]), selectedNode: nodes[1], busy: true }));
    for (const id of ["branch-exit", "branch-toggle"]) {
      expect(screen.getByTestId(id)).not.toBeDisabled();
      expect(screen.getByTestId(id)).toHaveAttribute("aria-busy", "true");
    }
  });

  it("lists every collapsed folder with its exact count, in words and a glyph, and expands from the list", () => {
    const onToggle = vi.fn();
    const { rerender } = render(
      panel({
        active: state([
          { nodeId: 11, hiddenDescendantCount: 1 },
          { nodeId: 12, hiddenDescendantCount: 0 },
        ]),
        selectedNode: nodes[0],
        onToggle,
      }),
    );
    const items = screen.getAllByTestId("branch-collapsed-item");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("▸ a1 — replié, 1 descendant masqué");
    expect(items[0]).toHaveAttribute("data-hidden-descendant-count", "1");
    expect(items[1]).toHaveAttribute("data-hidden-descendant-count", "0");
    fireEvent.click(screen.getAllByTestId("branch-expand-one")[0]);
    expect(onToggle).toHaveBeenCalledWith(11);
    // The entry goes away with the expansion. The root is selected and collapsible, so the
    // toggle holds the focus at once; it is never on `body`.
    expect(document.activeElement).toBe(screen.getByTestId("branch-toggle"));
    rerender(panel({ active: state([]), selectedNode: nodes[1], onToggle }));
    expect(document.activeElement).toBe(screen.getByTestId("branch-toggle"));
  });

  it("the focused root collapses and expands like any folder — Enter and Space, focus kept", () => {
    const onToggle = vi.fn();
    const { rerender } = render(panel({ active: state([]), selectedNode: nodes[0], onToggle }));
    const toggle = screen.getByTestId("branch-toggle");
    expect(toggle).not.toBeDisabled();
    expect(toggle).toHaveTextContent("Replier a");
    expect(screen.queryByTestId("branch-toggle-hint")).toBeNull();
    toggle.focus();
    fireEvent.click(toggle);
    expect(onToggle).toHaveBeenCalledWith(10);
    rerender(
      panel({
        active: state([{ nodeId: 10, hiddenDescendantCount: 7 }]),
        selectedNode: nodes[0],
        onToggle,
      }),
    );
    expect(screen.getByTestId("branch-toggle")).toBe(toggle);
    expect(document.activeElement).toBe(toggle);
    expect(toggle).toHaveTextContent("Déplier a — 7 descendants masqués");
    expect(toggle).toHaveAttribute("data-collapsed", "true");
    // The list names it once; the main button stays the single primary control.
    expect(screen.getAllByTestId("branch-collapsed-item")).toHaveLength(1);
    fireEvent.click(toggle);
    expect(onToggle).toHaveBeenLastCalledWith(10);
    expect(screen.queryByText(/ne se replie pas/)).toBeNull();
  });

  it("has a complete word list in both languages", () => {
    expect(Object.keys(BRANCH_FOCUS_STRINGS.fr).sort()).toEqual(Object.keys(BRANCH_FOCUS_STRINGS.en).sort());
  });
});

describe("map card — F42-4, F42-5, F42-9", () => {
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

  function map(locale: "fr" | "en") {
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
            nodeCount: nodes.length,
            collapsed: new Map([[11, 7]]),
            branchRootId: 10,
            aggregates: [],
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
        labelFor={(target) => target.name}
        territoryLabelFor={() => "territoire"}
        ariaLabel="carte"
      />
    );
  }

  it("writes « replié · N masqués » on the folder itself and in its accessible name", () => {
    render(map("fr"));
    const card = screen.getByLabelText(/^a1, ▸ replié · 7 masqués/);
    expect(card).toHaveAttribute("data-collapsed", "true");
    expect(card).toHaveAttribute("data-hidden-descendant-count", "7");
    expect(screen.getByTestId("map-collapsed-tag")).toHaveTextContent("▸ replié · 7 masqués");
    expect(screen.getByLabelText(/^a, ◆ branche focalisée/)).toHaveAttribute("data-branch-root", "true");
    // The unfolded folder and the file carry no collapse marker.
    expect(screen.getByLabelText("note.txt")).not.toHaveAttribute("data-collapsed");
  });

  it("says it in English too", () => {
    render(map("en"));
    expect(screen.getByLabelText(/^a1, ▸ collapsed · 7 hidden/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^a, ◆ focused branch/)).toBeInTheDocument();
  });

  it("a collapse is not an aggregate: two different words", () => {
    expect(collapsedLabel(7, "fr")).not.toBe(aggregateLabel(7, "fr"));
    expect(aggregateLabel(7, "fr")).toContain("Voir la suite");
    expect(collapsedLabel(7, "fr")).not.toContain("Voir la suite");
    expect(collapsedLabel(1, "en")).toBe("▸ collapsed · 1 hidden");
  });
});
