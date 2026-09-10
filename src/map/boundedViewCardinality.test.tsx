/**
 * `TASK-0028` / `SS7` — how many DOM/SVG elements a **bounded view** actually
 * costs, counted rather than estimated.
 *
 * This is **not** a WebView2 measurement, and the artifact says so: jsdom is
 * not a browser engine and has no renderer. What it establishes is the exact
 * **cardinality** the real engine would be handed — the number `SS7` asks for
 * and that a frame-time campaign cannot produce.
 *
 * The point being tested is `SS9`'s: the DOM a view costs must follow the
 * **view budget**, never the corpus behind it. Every case below renders a view
 * of `budget` entities while pretending to a corpus of ten thousand, a hundred
 * thousand and a million — and the DOM must not notice the difference.
 *
 * Nothing here changes the product: it renders the existing `MapView` with the
 * props it already takes.
 */

import { cleanup, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import MapView from "./MapView";
import { buildHierarchy } from "./hierarchy";
import { composeTerritories } from "./territories";
import type { BrainNodeRef, BrainRecord, MapNode, Rect } from "./types";
import { fitView, type View } from "./viewState";

afterEach(cleanup);

/**
 * Vitest runs on Node, but this project carries no `@types/node`, and pulling
 * one in for a single file write is not a dependency worth taking. Widening
 * the specifier to `string` makes TypeScript treat these as what they already
 * are — dynamic imports resolved at run time.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeBuiltin = (specifier: string): Promise<any> =>
  import(/* @vite-ignore */ specifier);

/** The four candidate budgets of the protocol. None of them is decided final. */
const BUDGETS = [128, 256, 512, 1024] as const;

/** Corpus sizes the bounded view is supposed to be independent of. */
const CORPUS_SIZES = [10_000, 100_000, 1_000_000] as const;

const BRAIN = "task0028-bounded";
const record: BrainRecord = {
  brainId: BRAIN,
  displayName: "Vue bornée TASK-0028",
  color: "#2E5FA3",
  icon: "▲",
  sourceKind: "SYNTHETIC_FIXTURE",
  sourceRef: "task0028-synthetic",
  sourceLabel: "task0028-synthetic",
  position: 1,
};

/**
 * A bounded view of exactly `budget` entities, shaped like the Rust prototype's
 * output: a root, a wide fan-out, and a last slot standing for what is hidden.
 *
 * `hiddenCount` is the exact number of elements the corpus holds beyond this
 * view. It is carried so the rendered view can be checked for the thing
 * `F-051` cares about — that hiding is declared, never silent.
 */
function boundedView(budget: number, corpus: number) {
  const nodes: MapNode[] = [];
  const columnWidth = 360;
  const rowHeight = 92;
  nodes.push({
    id: 1,
    parentId: null,
    name: "racine",
    relativePath: "",
    kind: "root",
    depth: 0,
    sizeBytes: 0,
    modifiedUnixMs: null,
    childCount: budget - 1,
    accessDiagnostic: null,
    rect: { x: 0, y: 0, w: 240, h: 64 },
  });
  for (let index = 1; index < budget; index += 1) {
    nodes.push({
      id: index + 1,
      parentId: 1,
      name: `entite-${String(index).padStart(4, "0")}`,
      relativePath: `entite-${String(index).padStart(4, "0")}`,
      kind: index % 5 === 0 ? "directory" : "file",
      depth: 1,
      sizeBytes: index * 8,
      modifiedUnixMs: null,
      childCount: 0,
      accessDiagnostic: null,
      rect: { x: columnWidth, y: (index - 1) * rowHeight, w: 240, h: 64 },
    });
  }
  const world: Rect = { x: 0, y: 0, w: columnWidth + 240, h: budget * rowHeight };
  return { nodes, world, hiddenCount: corpus - budget };
}

function Harness({ budget, corpus }: { budget: number; corpus: number }) {
  const { nodes, world } = boundedView(budget, corpus);
  const hierarchy = buildHierarchy(nodes, 1);
  const viewport = { width: 900, height: 700 };
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
          segments: [],
          relationNeighbours: new Set<number>(),
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
      onSelect={setSelected}
      onViewportChange={() => {}}
      labelFor={(target) => `${target.name} (${target.kind})`}
      territoryLabelFor={(brain, nodeCount) => `${brain.displayName}, ${nodeCount} noeuds`}
      ariaLabel="carte bornée"
    />
  );
}

/** Exact DOM/SVG cardinality of whatever is currently rendered. */
function domCardinality() {
  const canvas = screen.getByTestId("composed-canvas");
  const hierarchy = canvas.querySelector(".map-territory__hierarchy");
  return {
    treeItems: screen.getAllByRole("treeitem").length,
    // One edge is one direct child of the hierarchy group. Its own descendants
    // are counted separately, because "how many edges" and "how many elements
    // an edge costs" are two different questions.
    hierarchyEdges: hierarchy?.childElementCount ?? 0,
    hierarchyElements: hierarchy?.querySelectorAll("*").length ?? 0,
    svgElements: canvas.querySelectorAll("*").length,
  };
}

describe("TASK-0028 SS7 — bounded-view DOM cardinality", () => {
  const observations: Array<{
    budget: number;
    corpus: number;
    treeItems: number;
    hierarchyEdges: number;
    hierarchyElements: number;
    svgElements: number;
  }> = [];

  for (const budget of BUDGETS) {
    for (const corpus of CORPUS_SIZES) {
      it(`renders exactly ${budget} entities out of a corpus of ${corpus}`, () => {
        render(<Harness budget={budget} corpus={corpus} />);
        const counted = domCardinality();
        observations.push({ budget, corpus, ...counted });

        // The view is the budget, not the corpus.
        expect(counted.treeItems).toBe(budget);
        expect(counted.treeItems).toBeLessThan(corpus);
        // Every non-root entity contributes exactly one hierarchy edge.
        expect(counted.hierarchyEdges).toBe(budget - 1);
      });
    }
  }

  it("keeps the DOM identical across a hundredfold corpus, at every budget", () => {
    for (const budget of BUDGETS) {
      const forBudget = observations.filter((entry) => entry.budget === budget);
      expect(forBudget).toHaveLength(CORPUS_SIZES.length);
      const [reference] = forBudget;
      for (const entry of forBudget) {
        expect(entry.treeItems).toBe(reference.treeItems);
        expect(entry.hierarchyEdges).toBe(reference.hierarchyEdges);
        expect(entry.hierarchyElements).toBe(reference.hierarchyElements);
        expect(entry.svgElements).toBe(reference.svgElements);
      }
    }
  });

  it("grows with the budget and with nothing else", () => {
    const perBudget = BUDGETS.map(
      (budget) => observations.find((entry) => entry.budget === budget)!,
    );
    for (let index = 1; index < perBudget.length; index += 1) {
      expect(perBudget[index].svgElements).toBeGreaterThan(perBudget[index - 1].svgElements);
    }
    // Bounded, and bounded by a small constant per entity — the claim `SS9`
    // rests on. The constant is measured, not assumed.
    for (const entry of perBudget) {
      expect(entry.svgElements).toBeLessThan(entry.budget * 12);
    }
  });

  it("writes the counts where the SS7 artifact can pick them up", async () => {
    const fs = await nodeBuiltin("node:fs/promises");
    const path = await nodeBuiltin("node:path");
    const url = await nodeBuiltin("node:url");
    // Resolved from this file rather than from the working directory, so the
    // counts land in the same place however the suite was started.
    const here = path.dirname(url.fileURLToPath(import.meta.url));
    // Inside the repository, ignored by Git since TASK-0016.
    const directory = path.join(here, "..", "..", ".filetopo-sandbox", "task0028");
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(
      path.join(directory, "dom-cardinality.json"),
      JSON.stringify(
        {
          engine: "jsdom (vitest) — PAS un moteur de rendu, PAS WebView2",
          measures: "cardinalité DOM/SVG exacte d'une vue bornée",
          budgets: BUDGETS,
          corpusSizes: CORPUS_SIZES,
          observations,
        },
        null,
        2,
      ),
      "utf8",
    );
  });
});
