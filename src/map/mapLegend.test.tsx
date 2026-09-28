import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import MapLegend from "./MapLegend";
import { LEGEND_KEYS, legendKeyAttribute, nodePresentation, relationPresentation } from "./mapLegendContract";
import MapView, { type RenderedBrain } from "./MapView";
import { strings } from "./mapStrings";
import { buildHierarchy } from "./hierarchy";
import { composeTerritories } from "./territories";
import type { CrossSegment } from "./crossRelations";
import type { RelationSegment } from "./relations";
import type { BrainRecord, MapNode, Rect, ViewAggregate } from "./types";

afterEach(cleanup);

const rect = (x: number, y: number): Rect => ({ x, y, w: 180, h: 56 });
const node = (
  id: number,
  parentId: number | null,
  kind: MapNode["kind"],
  x: number,
  y: number,
  diagnostic: string | null = null,
): MapNode => ({
  id,
  parentId,
  name: `${kind}-${id}`,
  relativePath: id === 1 ? "" : `${kind}-${id}`,
  kind,
  depth: parentId === null ? 0 : parentId === 1 ? 1 : 2,
  sizeBytes: id,
  modifiedUnixMs: 1_790_000_000_000,
  childCount: id === 1 ? 2 : id === 2 ? 3 : 0,
  accessDiagnostic: diagnostic,
  rect: rect(x, y),
});

const records: BrainRecord[] = [
  { brainId: "a", displayName: "Alpha", color: "#1F6F5C", icon: "A", sourceKind: "SYNTHETIC_FIXTURE", sourceRef: "a", sourceLabel: "a", position: 1 },
  { brainId: "b", displayName: "Beta", color: "#4A4FA8", icon: "B", sourceKind: "SYNTHETIC_FIXTURE", sourceRef: "b", sourceLabel: "b", position: 2 },
];

const nodesA = [
  node(1, null, "root", 0, 100),
  node(2, 1, "directory", 240, 20),
  node(3, 1, "file", 240, 180, "access_denied"),
  node(4, 2, "skipped", 480, 0),
  node(5, 2, "file", 480, 90),
  node(6, 2, "file", 480, 180),
];
const nodesB = [node(1, null, "root", 0, 60), node(2, 1, "file", 240, 60)];

const intra = (kind: RelationSegment["kind"], provenance: RelationSegment["provenance"], touchesSelection: boolean, key: string): RelationSegment => ({
  key,
  kind,
  provenance,
  relationType: "reference",
  fromNodeId: 3,
  toNodeId: 5,
  x1: 420,
  y1: 208,
  x2: 480,
  y2: 118,
  touchesSelection,
  label: key,
});

const cross = (kind: CrossSegment["kind"], provenance: CrossSegment["provenance"], touchesSelection: boolean, key: string): CrossSegment => ({
  key,
  kind,
  provenance,
  relationType: "reference",
  fromBrainId: "a",
  fromNodeId: 1,
  toBrainId: "b",
  toNodeId: 2,
  x1: 0,
  y1: 0,
  x2: 0,
  y2: 0,
  fromRect: nodesA[0].rect,
  toRect: nodesB[1].rect,
  touchesSelection,
  label: key,
});

function RichMap() {
  const brains: RenderedBrain[] = [
    {
      brainId: "a",
      record: records[0],
      hierarchy: buildHierarchy(nodesA, 1),
      segments: [
        intra("established", "DETERMINISTIC", true, "established-touching"),
        intra("suggestion", null, false, "suggestion"),
        intra("established", "APPROVED", false, "approved"),
      ],
      relationNeighbours: new Set([5]),
      crossNeighbours: new Set([4]),
      nodeCount: nodesA.length,
      filterRoles: new Map([[1, "context"], [3, "match"]]),
      aggregates: [{ parentId: 2, omittedDirectChildren: 3, nextCursor: "next", rect: rect(480, 270) } as ViewAggregate],
    },
    {
      brainId: "b",
      record: records[1],
      hierarchy: buildHierarchy(nodesB, 1),
      segments: [],
      relationNeighbours: new Set(),
      crossNeighbours: new Set(),
      nodeCount: nodesB.length,
    },
  ];
  const composition = composeTerritories([
    { brainId: "a", layoutWidth: 660, layoutHeight: 350 },
    { brainId: "b", layoutWidth: 440, layoutHeight: 220 },
  ]);
  return (
    <MapView
      locale="fr"
      brains={brains}
      crossSegments={[
        cross("established", "DETERMINISTIC", true, "cross-touching"),
        cross("suggestion", null, false, "cross-suggestion"),
        cross("established", "APPROVED", false, "cross-approved"),
      ]}
      composition={composition}
      view={{ scale: 1, tx: 0, ty: 0 }}
      viewport={{ width: 2000, height: 1000 }}
      selected={{ brainId: "a", nodeId: 1 }}
      focusedBrainId="a"
      onViewChange={() => {}}
      onSelect={() => {}}
      onExpand={() => {}}
      onViewportChange={() => {}}
      labelFor={(target) => target.name}
      territoryLabelFor={(record) => record.displayName}
      ariaLabel="rich map"
    />
  );
}

describe("TASK-0050 runtime legend", () => {
  it("renders every closed contract key in French and English with product words", () => {
    const { container, rerender } = render(
      <MapLegend id="legend" locale="fr" strings={strings.fr.legend} />,
    );
    expect([...container.querySelectorAll("[data-legend-key]")].map((item) => item.getAttribute("data-legend-key"))).toEqual(LEGEND_KEYS);
    expect(container.textContent).toContain("Racine du cerveau");
    expect(container.textContent).toContain("Suggestion inter-cerveaux");
    expect(container.textContent).not.toContain("map-node--linked");

    rerender(<MapLegend id="legend" locale="en" strings={strings.en.legend} />);
    expect(container.textContent).toContain("Brain root");
    expect(container.textContent).toContain("Inter-brain suggestion");
    expect(container.querySelector("section")?.getAttribute("lang")).toBe("en");
  });

  it("covers every semantic key exercised by the rendered rich map", () => {
    const { container } = render(
      <>
        <RichMap />
        <MapLegend id="legend" locale="fr" strings={strings.fr.legend} />
      </>,
    );
    const mapKeys = new Set(
      [...container.querySelectorAll(".map-view [data-legend-keys]")]
        .flatMap((element) => (element.getAttribute("data-legend-keys") ?? "").split(/\s+/))
        .filter(Boolean),
    );
    const legendKeys = new Set(
      [...container.querySelectorAll("[data-legend-key]")]
        .map((element) => element.getAttribute("data-legend-key"))
        .filter((value): value is string => Boolean(value)),
    );
    expect(mapKeys).toEqual(new Set(LEGEND_KEYS));
    expect([...mapKeys].filter((key) => !legendKeys.has(key))).toEqual([]);
    expect([...legendKeys].filter((key) => !LEGEND_KEYS.includes(key as never))).toEqual([]);
  });

  it("uses the same class-producing helpers and shared glyph paths as the map", () => {
    const { container } = render(<MapLegend id="legend" locale="fr" strings={strings.fr.legend} />);
    const selected = container.querySelector('[data-legend-key="node-selected"] g');
    expect(selected?.getAttribute("class")).toBe(nodePresentation("file", "selected").className);
    expect(container.querySelector('[data-legend-key="node-root"] .map-node__kind-glyph')).toBeTruthy();

    const approved = container.querySelector('[data-legend-key="intra-approved"] g');
    expect(approved?.getAttribute("class")).toBe(
      relationPresentation({ cross: false, kind: "established", provenance: "APPROVED", touchesSelection: false }).className,
    );
    const crossSuggestion = container.querySelector('[data-legend-key="inter-suggestion"] g');
    expect(crossSuggestion?.getAttribute("class")).toBe(
      relationPresentation({ cross: true, kind: "suggestion", provenance: null, touchesSelection: false }).className,
    );
    expect(crossSuggestion?.querySelector(".map-cross-edge__arrow")).toBeNull();
    expect(crossSuggestion?.querySelectorAll(".map-cross-edge__ring")).toHaveLength(2);
    expect(legendKeyAttribute(["node-file", "node-selected"])).toBe("node-file node-selected");
  });

  it("describes node-cross-linked as the real rendered outline, not an invented one", () => {
    // ACTION-0086 N.2.5 — `.map-node--cross-linked rect` is a single thicker
    // solid outline (`stroke-width: 3; stroke-dasharray: none`), not a second
    // stroke. The text must say that, never "double contour" / "double outline".
    const { container: fr } = render(<MapLegend id="legend" locale="fr" strings={strings.fr.legend} />);
    const frText = fr.querySelector('[data-legend-key="node-cross-linked"]')?.textContent ?? "";
    expect(frText).not.toMatch(/double/i);
    expect(frText).toContain("contour plein épaissi");

    const { container: en } = render(<MapLegend id="legend" locale="en" strings={strings.en.legend} />);
    const enText = en.querySelector('[data-legend-key="node-cross-linked"]')?.textContent ?? "";
    expect(enText).not.toMatch(/double/i);
    expect(enText).toContain("heavy solid outline");

    const sample = fr.querySelector('[data-legend-key="node-cross-linked"] g');
    expect(sample?.getAttribute("class")).toBe(nodePresentation("file", "cross-linked").className);
  });

  it("keeps the samples decorative because adjacent text carries every meaning", () => {
    const { container } = render(<MapLegend id="legend" locale="fr" strings={strings.fr.legend} />);
    for (const sample of container.querySelectorAll(".map-runtime-legend__sample svg")) {
      expect(sample.getAttribute("aria-hidden")).toBe("true");
      expect(sample.getAttribute("focusable")).toBe("false");
    }
    expect(container.querySelectorAll("[data-legend-key]")).toHaveLength(LEGEND_KEYS.length);
  });
});
