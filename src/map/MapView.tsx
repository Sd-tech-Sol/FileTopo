import type { ViewAggregate } from "./types";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { domNodeId, domTerritoryId } from "./composedView";
import type { Hierarchy } from "./hierarchy";
import {
  domHierarchyEdgeId,
  hierarchicalNeighbourhood,
  hierarchyEdges,
  move,
} from "./hierarchy";
import { edgeAnchors } from "./geometry";
import type { CrossSegment } from "./crossRelations";
import type { RelationSegment } from "./relations";
import type { Composition, Territory } from "./territories";
import { headerBox, placeRect, territoryOf } from "./territories";
import type { BrainNodeRef, BrainRecord, MapNode } from "./types";
import type { View, Viewport } from "./viewState";
import { ensureRectVisible, fitToBox, fitView, panBy, sameView, zoomAbout } from "./viewState";

/**
 * The map itself: **one** accessible `SVG`, holding one territory per brain.
 *
 * SVG rather than Canvas or WebGL, per `DEC-0013` C and `DEC-0015` E — both of
 * which remain closed. The layout is read from the index and only ever
 * transformed here; nothing on this path recomputes a rectangle, which is what
 * `H10` asserts and what `L5` now asserts for a composition.
 *
 * **One canvas, not three stacked maps** — `TASK-0019` §4.3. A composition of
 * one brain and a composition of three go through *this* component, on the
 * same code path: the single-brain case is a composition of one, so nothing
 * about it can drift away from the composed case.
 *
 * **Transforms nest, so nothing is re-projected.** Blocks are drawn in each
 * brain's own layout coordinates, inside a group translated by that brain's
 * territory offset, inside a group carrying the global pan and zoom. A frame
 * therefore costs two attribute writes rather than thousands of DOM writes —
 * and, more importantly, **the rectangles in the DOM are bit-for-bit the ones
 * the index holds**, whatever the composition and whatever the zoom. `L5` is
 * not a discipline here; it is the shape of the tree.
 *
 * The labels are the exception: they live in a screen-space layer, because
 * text that scaled with the map would be illegible at one end of the zoom
 * range and absurd at the other.
 *
 * **`L3` — DOM identity.** Alpha and Gamma read the same fixture, so
 * `map-node-6` exists in both. Every node id is therefore namespaced by its
 * brain — `brain-alpha-map-node-6` — and the selection that travels is a
 * `BrainNodeRef`, never a bare row number.
 *
 * **`TASK-0020` — edges that really cross.** `L8` forbade any edge from
 * crossing a territory boundary, and that was right while no model carried such
 * a link. `M6` now asks for the opposite, for **one** kind of edge and only
 * that one: an inter-brain relation is drawn from a rectangle in one brain's
 * coordinates to a rectangle in another's, each translated by **its own**
 * territory offset. The two kinds never share a code path, so an intra-brain
 * edge still cannot leave its territory — that is not discipline, it is that
 * `RelationSegment` carries one brain id and `CrossSegment` carries two.
 */

/** One brain, ready to be drawn: its tree, its edges, its accents. */
export interface RenderedBrain {
  brainId: string;
  record: BrainRecord;
  hierarchy: Hierarchy;
  /**
   * Cross-cutting relations of **this brain**, already projected onto its own
   * projection rectangles — `TASK-0017` `J9`. Both endpoints are always inside
   * this brain: `L8` forbids an edge from crossing a territory boundary, and
   * the only way to make that structurally true is never to build one.
   */
  segments: RelationSegment[];
  /**
   * Node ids of **this brain** linked to the selection by an **established**
   * relation. Suggestions are deliberately absent — `J8`.
   */
  relationNeighbours: Set<number>;
  /**
   * Node ids of **this brain** linked to the selection by an established
   * **inter-brain** relation — `M`. Kept apart from
   * {@link RenderedBrain.relationNeighbours} because the panel distinguishes
   * the two and the map must not contradict it.
   */
  crossNeighbours: Set<number>;
  nodeCount: number;
  aggregates?: ViewAggregate[];
}

interface MapViewProps {
  onExpand?: (brainId: string, aggregate: ViewAggregate) => void;
  brains: RenderedBrain[];
  /**
   * Inter-brain relations, with **one end in each of two brains' own
   * coordinates** — `TASK-0020` §4.6.
   *
   * Passed whole rather than split per brain: an edge that belonged to one
   * brain would be an edge that could be drawn inside it, which is the defect
   * `M6` counts.
   */
  crossSegments: CrossSegment[];
  composition: Composition;
  view: View;
  viewport: Viewport;
  selected: BrainNodeRef | null;
  focusedBrainId: string;
  onViewChange: (view: View) => void;
  onSelect: (reference: BrainNodeRef) => void;
  onViewportChange: (viewport: Viewport) => void;
  labelFor: (node: MapNode, brain: BrainRecord) => string;
  territoryLabelFor: (brain: BrainRecord, nodeCount: number, focused: boolean) => string;
  ariaLabel: string;
}

/** Below this on-screen size a label cannot be read, so it is not drawn. */
export const LABEL_MIN_WIDTH = 46;
export const LABEL_MIN_HEIGHT = 15;
const WHEEL_ZOOM_STEP = 1.0015;
const KEY_ZOOM_STEP = 1.35;
const KEY_PAN_STEP = 90;

/** Triangle of an arrow head, pointing along `(ux, uy)` from `(x, y)`. */
function arrowHead(x: number, y: number, ux: number, uy: number): string {
  const size = 9;
  const tipX = x + ux * size;
  const tipY = y + uy * size;
  const leftX = x - uy * (size * 0.45);
  const leftY = y + ux * (size * 0.45);
  const rightX = x + uy * (size * 0.45);
  const rightY = y - ux * (size * 0.45);
  return `M ${tipX} ${tipY} L ${leftX} ${leftY} L ${rightX} ${rightY} Z`;
}

export function truncateCardLabel(name: string, projectedWidth: number): string {
  const availableCharacters = Math.max(1, Math.floor((projectedWidth - 24) / 7));
  if (name.length <= availableCharacters) return name;
  if (availableCharacters <= 1) return "…";
  return `${name.slice(0, availableCharacters - 1)}…`;
}

function nodeGlyph(node: MapNode): React.ReactElement {
  const x = node.rect.x + 16;
  const y = node.rect.y + 20;
  if (node.kind === "root") {
    return <path className="map-node__kind-glyph" d={`M ${x + 8} ${y - 8} L ${x + 16} ${y} L ${x + 8} ${y + 8} L ${x} ${y} Z`} />;
  }
  if (node.kind === "directory") {
    return <path className="map-node__kind-glyph" d={`M ${x} ${y - 6} H ${x + 8} L ${x + 11} ${y - 2} H ${x + 20} V ${y + 9} H ${x} Z`} />;
  }
  if (node.kind === "file") {
    return <path className="map-node__kind-glyph" d={`M ${x + 3} ${y - 8} H ${x + 13} L ${x + 19} ${y - 2} V ${y + 10} H ${x + 3} Z M ${x + 13} ${y - 8} V ${y - 2} H ${x + 19}`} />;
  }
  return <path className="map-node__kind-glyph" d={`M ${x} ${y - 7} L ${x + 18} ${y + 9} M ${x + 18} ${y - 7} L ${x} ${y + 9}`} />;
}

export default function MapView({
  brains,
  crossSegments,
  composition,
  view,
  viewport,
  selected,
  focusedBrainId,
  onViewChange,
  onSelect,
  onExpand,
  onViewportChange,
  labelFor,
  territoryLabelFor,
  ariaLabel,
}: MapViewProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const visibilityKeyRef = useRef<string | null>(null);

  const world = composition.world;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const measure = () => {
      const box = host.getBoundingClientRect();
      onViewportChange({ width: box.width, height: box.height });
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, [onViewportChange]);

  /**
   * The territories, drawn.
   *
   * Rebuilt only when the trees, the accents or the selection change — never
   * for a pan or a zoom, which is the whole point of the nested groups below.
   */
  const territories = useMemo(() => {
    return brains.map((brain) => {
      const territory = territoryOf(composition, brain.brainId);
      if (!territory) return null;
      const highlighted =
        selected && selected.brainId === brain.brainId
          ? hierarchicalNeighbourhood(brain.hierarchy, selected.nodeId)
          : new Set<number>();

      const hierarchy = hierarchyEdges(brain.hierarchy, brain.brainId).map((edge) => {
        const touchesSelection =
          selected?.brainId === brain.brainId &&
          (selected.nodeId === edge.parentNodeId || selected.nodeId === edge.childNodeId);
        return (
          <g
            key={`${edge.parentNodeId}|${edge.childNodeId}`}
            id={domHierarchyEdgeId(brain.brainId, edge.parentNodeId, edge.childNodeId)}
            className={`map-hierarchy-edge map-hierarchy-edge--${
              touchesSelection ? "touching" : "distant"
            }`}
            data-edge-kind="hierarchy"
            data-brain-id={brain.brainId}
            data-parent-node-id={edge.parentNodeId}
            data-child-node-id={edge.childNodeId}
            role="presentation"
          >
            <path d={edge.path} vectorEffect="non-scaling-stroke" />
          </g>
        );
      });

      const blocks = brain.hierarchy.drawOrder.map((node) => {
        const isSelected =
          selected !== null &&
          selected.brainId === brain.brainId &&
          selected.nodeId === node.id;
        const related = highlighted.has(node.id);
        // `J8`: parent and direct children are accentuated as kin, cross-cutting
        // neighbours as links. Two accentuations rather than one, because the
        // panel distinguishes them and the map must not contradict it.
        const linked = brain.relationNeighbours.has(node.id);
        // `M` — an inter-brain neighbour is accentuated **as one**, with its own
        // state rather than by borrowing `linked`: the panel says the two are
        // different things, and a map that drew them alike would contradict it.
        const crossLinked = brain.crossNeighbours.has(node.id);
        // Attenuated, never erased: the rectangle keeps its outline and its
        // accessible name whatever the selection is — parity §3, point 4.
        const state = isSelected
          ? "selected"
          : related
            ? "related"
            : crossLinked
              ? "cross-linked"
              : linked
                ? "linked"
                : "plain";
        const corner = 6;
        const marker = Math.min(node.rect.w, node.rect.h) * 0.28;
        return (
          <g
            key={node.id}
            // `L3` — namespaced. Two brains on the same fixture hold the same
            // row numbers, and one `id` for two elements would send
            // `aria-activedescendant` and `getElementById` to whichever came
            // first.
            id={domNodeId(brain.brainId, node.id)}
            data-brain-id={brain.brainId}
            data-node-id={node.id}
            data-node-kind={node.kind}
            data-card="true"
            data-card-width={node.rect.w}
            data-card-height={node.rect.h}
            data-cross-linked={crossLinked ? "true" : undefined}
            role="treeitem"
            aria-level={node.depth + 1}
            aria-selected={isSelected}
            aria-label={labelFor(node, brain.record)}
            className={`map-node map-node--${node.kind} map-node--${state}`}
            onPointerDown={(event) => {
              event.stopPropagation();
              onSelect({ brainId: brain.brainId, nodeId: node.id });
            }}
          >
            <title>{node.name}</title>
            <rect
              x={node.rect.x}
              y={node.rect.y}
              width={node.rect.w}
              height={node.rect.h}
              rx={corner}
              vectorEffect="non-scaling-stroke"
            />
            <g aria-hidden="true">{nodeGlyph(node)}</g>
            {node.accessDiagnostic ? (
              // A hatched corner marks an access diagnostic without relying on
              // colour alone; the panel spells it out in words.
              <path
                className="map-node__diagnostic"
                d={`M ${node.rect.x} ${node.rect.y} l ${marker} 0 l ${-marker} ${marker} Z`}
              />
            ) : null}
          </g>
        );
      });

      return { brain, territory, hierarchy, blocks };
    });
  }, [brains, composition, labelFor, onSelect, selected]);

  /**
   * Cross-cutting relations, in the screen-space layer.
   *
   * Projected from the rectangles the index already holds — **no layout is
   * recomputed**, which is what keeps `H10` true while `J9` adds edges. Screen
   * space rather than the transformed group so an arrow head stays the same
   * size at every zoom instead of becoming a speck or a blot.
   *
   * **Every edge is drawn inside one territory.** The coordinates below are a
   * brain's own, translated by *that brain's* offset: there is no arithmetic
   * here that could place one end of a segment in another brain's territory,
   * because the offset is chosen once, per brain, outside the loop.
   */
  const edges = useMemo(() => {
    const drawn: React.ReactElement[] = [];
    for (const entry of territories) {
      if (!entry) continue;
      const { brain, territory } = entry;
      for (const segment of brain.segments) {
        const x1 = (segment.x1 + territory.offsetX) * view.scale + view.tx;
        const y1 = (segment.y1 + territory.offsetY) * view.scale + view.ty;
        const x2 = (segment.x2 + territory.offsetX) * view.scale + view.tx;
        const y2 = (segment.y2 + territory.offsetY) * view.scale + view.ty;
        const offScreen =
          (x1 < 0 && x2 < 0) ||
          (y1 < 0 && y2 < 0) ||
          (x1 > viewport.width && x2 > viewport.width) ||
          (y1 > viewport.height && y2 > viewport.height);
        if (offScreen) continue;

        const length = Math.hypot(x2 - x1, y2 - y1);
        if (!(length > 1)) continue;
        const ux = (x2 - x1) / length;
        const uy = (y2 - y1) / length;
        const established = segment.kind === "established";
        const state = segment.touchesSelection ? "touching" : "distant";
        const className =
          `map-edge map-edge--${segment.kind} map-edge--${state}` +
          (segment.provenance ? ` map-edge--${segment.provenance.toLowerCase()}` : "");

        drawn.push(
          <g
            key={`${brain.brainId}|${segment.key}`}
            className={className}
            // `L8` — an edge belongs to exactly one brain, and says which.
            data-brain-id={brain.brainId}
            data-from-brain-id={brain.brainId}
            data-to-brain-id={brain.brainId}
            data-edge-kind={segment.kind}
            data-source-node-id={segment.fromNodeId}
            data-target-node-id={segment.toNodeId}
            role="presentation"
          >
            <title>{segment.label}</title>
            <line className="map-edge__line" x1={x1} y1={y1} x2={x2} y2={y2} />
            {established ? (
              // Filled arrow head, drawn as a triangle so its shape carries the
              // direction without a marker definition and without colour.
              <path className="map-edge__arrow" d={arrowHead(x2 - ux * 9, y2 - uy * 9, ux, uy)} />
            ) : (
              <>
                <circle className="map-edge__ring" cx={x1} cy={y1} r={3.5} />
                <circle className="map-edge__ring" cx={x2} cy={y2} r={3.5} />
              </>
            )}
          </g>,
        );
      }
    }
    return drawn;
  }, [territories, view.scale, view.tx, view.ty, viewport.height, viewport.width]);

  /**
   * Inter-brain relations, in the same screen-space layer — `M6`.
   *
   * The only place in this component where **two** territory offsets are read
   * for one drawing. Each end is translated by the offset of the brain it
   * belongs to; there is no fallback to "the current territory", so an edge
   * whose target brain is not displayed produces nothing at all rather than a
   * line to an arbitrary point.
   *
   * Drawn **before** the intra-brain edges in the DOM so a cross edge never
   * hides one — and marked three ways that survive a colour setting: a doubled
   * stroke, a mid-path chevron carrying the direction, and `data-cross="true"`
   * with two **different** `data-*-brain-id` attributes.
   */
  const crossEdges = useMemo(() => {
    const drawn: React.ReactElement[] = [];
    for (const segment of crossSegments) {
      const from = territoryOf(composition, segment.fromBrainId);
      const to = territoryOf(composition, segment.toBrainId);
      // Both ends must be on screen. `M9` keeps such a relation visible in the
      // panel; it does not ask for a line towards a territory that is not there.
      if (!from || !to) continue;

      const anchors = edgeAnchors(
        placeRect(from, segment.fromRect),
        placeRect(to, segment.toRect),
      );
      const x1 = anchors.source.x * view.scale + view.tx;
      const y1 = anchors.source.y * view.scale + view.ty;
      const x2 = anchors.target.x * view.scale + view.tx;
      const y2 = anchors.target.y * view.scale + view.ty;
      const offScreen =
        (x1 < 0 && x2 < 0) ||
        (y1 < 0 && y2 < 0) ||
        (x1 > viewport.width && x2 > viewport.width) ||
        (y1 > viewport.height && y2 > viewport.height);
      if (offScreen) continue;

      const length = Math.hypot(x2 - x1, y2 - y1);
      if (!(length > 1)) continue;
      const ux = (x2 - x1) / length;
      const uy = (y2 - y1) / length;
      const established = segment.kind === "established";
      const state = segment.touchesSelection ? "touching" : "distant";
      // **No `map-edge` class.** `L8` of `TASK-0019` is measured by counting
      // `.map-edge` and reading its two brain ids, and it must keep meaning what
      // it meant: an INTRA-brain edge never leaves its territory. An inter-brain
      // edge is a different layer introduced by `DEC-0018`, and it is supposed
      // to cross — so it carries its own class and the old measurement stays
      // exact rather than being redefined after the fact.
      const className =
        `map-cross-edge map-cross-edge--${segment.kind} map-cross-edge--${state}` +
        (segment.provenance ? ` map-cross-edge--${segment.provenance.toLowerCase()}` : "");
      // Halfway along, a second arrow head. Direction therefore reads even when
      // both ends are off screen and the tip is not visible — and it reads by
      // SHAPE, never by hue.
      const midX = x1 + ux * (length / 2);
      const midY = y1 + uy * (length / 2);

      drawn.push(
        <g
          key={`cross|${segment.key}`}
          className={className}
          // `M6` — an inter-brain edge names BOTH its brains, and they differ.
          // A reader counting `from !== to` is counting exactly the property
          // that makes this edge legitimate.
          data-cross="true"
          data-from-brain-id={segment.fromBrainId}
          data-to-brain-id={segment.toBrainId}
          data-kind={segment.kind}
          data-provenance={segment.provenance ?? ""}
          data-source-node-id={segment.fromNodeId}
          data-target-node-id={segment.toNodeId}
          role="presentation"
        >
          <title>{segment.label}</title>
          {/* Two strokes: a wide pale one under a narrow dark one. The doubling
              is what tells an inter-brain edge from an intra-brain one without
              relying on colour. */}
          <line className="map-cross-edge__casing" x1={x1} y1={y1} x2={x2} y2={y2} />
          <line className="map-cross-edge__line" x1={x1} y1={y1} x2={x2} y2={y2} />
          {established ? (
            <>
              <path
                className="map-cross-edge__arrow"
                d={arrowHead(x2 - ux * 11, y2 - uy * 11, ux, uy)}
              />
              <path
                className="map-cross-edge__chevron"
                d={arrowHead(midX, midY, ux, uy)}
              />
            </>
          ) : (
            <>
              <circle className="map-cross-edge__ring" cx={x1} cy={y1} r={4.5} />
              <circle className="map-cross-edge__ring" cx={x2} cy={y2} r={4.5} />
            </>
          )}
        </g>,
      );
    }
    return drawn;
  }, [composition, crossSegments, view.scale, view.tx, view.ty, viewport.height, viewport.width]);

  /**
   * Screen-space labels: the territory identities, then the node names.
   *
   * A territory's name and icon are drawn **whatever the zoom**, because `L4`
   * asks that the origin of what is on screen always be readable. Node labels
   * keep the `TASK-0016` rule: only what is on screen and big enough to read,
   * plus the selection, whose label `P-02` requires to stay legible.
   */
  const labels = useMemo(() => {
    const drawn: React.ReactElement[] = [];
    for (const entry of territories) {
      if (!entry) continue;
      const { brain, territory } = entry;
      const head = headerBox(territory);
      const x = head.x * view.scale + view.tx;
      const y = head.y * view.scale + view.ty;
      const w = head.w * view.scale;
      if (!(x + w < 0 || y + 40 < 0 || x > viewport.width || y > viewport.height)) {
        drawn.push(
          <text
            key={`territory|${brain.brainId}`}
            className={
              "map-territory__title" +
              (brain.brainId === focusedBrainId ? " map-territory__title--focused" : "")
            }
            x={x}
            y={y + 22}
          >
            {`${brain.record.icon} ${brain.record.displayName} · ${brain.nodeCount} nœuds`}
          </text>,
        );
      }

      for (const node of brain.hierarchy.drawOrder) {
        const sx = (node.rect.x + territory.offsetX) * view.scale + view.tx;
        const sy = (node.rect.y + territory.offsetY) * view.scale + view.ty;
        const sw = node.rect.w * view.scale;
        const sh = node.rect.h * view.scale;
        if (sx + sw < 0 || sy + sh < 0 || sx > viewport.width || sy > viewport.height) continue;
        const isSelected =
          selected !== null && selected.brainId === brain.brainId && selected.nodeId === node.id;
        const big = sw >= LABEL_MIN_WIDTH && sh >= LABEL_MIN_HEIGHT;
        if (!big && !isSelected) continue;
        const labelInset = Math.min(40, Math.max(5, sw * 0.18));
        drawn.push(
          <text
            key={`${brain.brainId}|${node.id}`}
            className={`map-node__label${isSelected ? " map-node__label--selected" : ""}`}
            data-full-name={node.name}
            x={sx + labelInset}
            y={sy + Math.min(22, Math.max(13, sh / 2 + 4))}
          >
            {truncateCardLabel(node.name, Math.max(sw - labelInset - 8, 1))}
          </text>,
        );
      }
    }
    return drawn;
  }, [focusedBrainId, selected, territories, view, viewport.height, viewport.width]);

  const handleWheel = useCallback(
    (event: React.WheelEvent<SVGSVGElement>) => {
      const host = hostRef.current;
      if (!host) return;
      const box = host.getBoundingClientRect();
      const anchor = { x: event.clientX - box.left, y: event.clientY - box.top };
      onViewChange(zoomAbout(view, WHEEL_ZOOM_STEP ** -event.deltaY, anchor, world, viewport));
    },
    [onViewChange, view, viewport, world],
  );

  const handlePointerDown = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (dx === 0 && dy === 0) return;
      dragRef.current = { ...drag, x: event.clientX, y: event.clientY };
      onViewChange(panBy(view, dx, dy, world, viewport));
    },
    [onViewChange, view, viewport, world],
  );

  const endDrag = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  }, []);

  /** The tree the arrow keys walk: the one the selection is in. */
  const selectedBrain = useMemo(
    () => (selected ? brains.find((brain) => brain.brainId === selected.brainId) ?? null : null),
    [brains, selected],
  );

  const selectedNode = useMemo(
    () => (selected && selectedBrain ? selectedBrain.hierarchy.byId.get(selected.nodeId) ?? null : null),
    [selected, selectedBrain],
  );

  useEffect(() => {
    if (!selected || !selectedNode) return;
    const territory = territoryOf(composition, selected.brainId);
    if (!territory) return;
    const key = `${selected.brainId}|${selected.nodeId}|${territory.offsetX}|${territory.offsetY}`;
    if (visibilityKeyRef.current === key) return;
    visibilityKeyRef.current = key;
    const next = ensureRectVisible(
      placeRect(territory, selectedNode.rect),
      view,
      world,
      viewport,
    );
    if (!sameView(next, view)) onViewChange(next);
  }, [composition, onViewChange, selected, selectedNode, view, viewport, world]);

  /**
   * Moves the selection to another territory, by keyboard.
   *
   * Without it the arrow keys would confine a keyboard user to whichever brain
   * they started in: the chips above the map can move the focus, but the map
   * itself is one widget, and a widget that can only reach a third of what it
   * draws is not reachable. `n` and `p` walk the territories in composed order
   * and land on each brain's root.
   */
  const stepTerritory = useCallback(
    (delta: number) => {
      if (brains.length === 0) return;
      const current = selected
        ? brains.findIndex((brain) => brain.brainId === selected.brainId)
        : 0;
      const next = brains[(current + delta + brains.length) % brains.length];
      onSelect({ brainId: next.brainId, nodeId: next.hierarchy.rootId });
    },
    [brains, onSelect, selected],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<SVGSVGElement>) => {
      const centre = { x: viewport.width / 2, y: viewport.height / 2 };
      const panning = event.altKey;
      let handled = true;

      const walk = (direction: "parent" | "child" | "previous" | "next") => {
        if (!selected || !selectedBrain) return;
        const target = move(selectedBrain.hierarchy, selected.nodeId, direction);
        if (target !== null) onSelect({ brainId: selected.brainId, nodeId: target });
      };

      switch (event.key) {
        case "ArrowUp":
          if (panning) onViewChange(panBy(view, 0, KEY_PAN_STEP, world, viewport));
          else walk("previous");
          break;
        case "ArrowDown":
          if (panning) onViewChange(panBy(view, 0, -KEY_PAN_STEP, world, viewport));
          else walk("next");
          break;
        case "ArrowLeft":
          if (panning) onViewChange(panBy(view, KEY_PAN_STEP, 0, world, viewport));
          else walk("parent");
          break;
        case "ArrowRight":
          if (panning) onViewChange(panBy(view, -KEY_PAN_STEP, 0, world, viewport));
          else walk("child");
          break;
        case "+":
        case "=":
          onViewChange(zoomAbout(view, KEY_ZOOM_STEP, centre, world, viewport));
          break;
        case "-":
        case "_":
          onViewChange(zoomAbout(view, 1 / KEY_ZOOM_STEP, centre, world, viewport));
          break;
        case "f":
        case "F": {
          const territory = selected ? territoryOf(composition, selected.brainId) : null;
          onViewChange(
            selectedNode && territory
              ? fitToBox(
                  {
                    x: selectedNode.rect.x + territory.offsetX,
                    y: selectedNode.rect.y + territory.offsetY,
                    w: selectedNode.rect.w,
                    h: selectedNode.rect.h,
                  },
                  world,
                  viewport,
                )
              : fitView(world, viewport),
          );
          break;
        }
        case "r":
        case "R":
          onViewChange(fitView(world, viewport));
          break;
        case "Home":
          if (selectedBrain) {
            onSelect({ brainId: selectedBrain.brainId, nodeId: selectedBrain.hierarchy.rootId });
          } else if (brains[0]) {
            onSelect({ brainId: brains[0].brainId, nodeId: brains[0].hierarchy.rootId });
          }
          break;
        case "n":
        case "N":
          stepTerritory(1);
          break;
        case "p":
        case "P":
          stepTerritory(-1);
          break;
        default:
          handled = false;
      }

      if (handled) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    [
      brains,
      composition,
      onSelect,
      onViewChange,
      selected,
      selectedBrain,
      selectedNode,
      stepTerritory,
      view,
      viewport,
      world,
    ],
  );

  return (
    <div className="map-view" ref={hostRef}>
      <svg
        className="map-view__canvas"
        data-testid="composed-canvas"
        role="tree"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-activedescendant={
          selected === null ? undefined : domNodeId(selected.brainId, selected.nodeId)
        }
        width="100%"
        height="100%"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={handleKeyDown}
      >
        {/*
          The one transformed group. Pan and zoom change this attribute and
          nothing else — no rectangle below is re-projected, and no layout is
          recomputed. `role="presentation"` so the accessibility tree sees the
          territories directly under the tree rather than through a wrapper.
        */}
        <g
          role="presentation"
          data-testid="composed-world"
          transform={`translate(${view.tx} ${view.ty}) scale(${view.scale})`}
        >
          {territories.map((entry) =>
            entry ? (
              <rect
                key={`frame|${entry.brain.brainId}`}
                className={
                  "map-territory__frame" +
                  (entry.brain.brainId === focusedBrainId
                    ? " map-territory__frame--focused"
                    : "")
                }
                data-brain-id={entry.brain.brainId}
                x={entry.territory.frame.x}
                y={entry.territory.frame.y}
                width={entry.territory.frame.w}
                height={entry.territory.frame.h}
                rx={24}
                vectorEffect="non-scaling-stroke"
              />
            ) : null,
          )}

          {territories.map((entry) =>
            entry ? (
              <g
                key={`territory|${entry.brain.brainId}`}
                id={domTerritoryId(entry.brain.brainId)}
                className={
                  "map-territory" +
                  (entry.brain.brainId === focusedBrainId ? " map-territory--focused" : "")
                }
                role="group"
                data-brain-id={entry.brain.brainId}
                data-offset-x={entry.territory.offsetX}
                data-offset-y={entry.territory.offsetY}
                aria-label={territoryLabelFor(
                  entry.brain.record,
                  entry.brain.nodeCount,
                  entry.brain.brainId === focusedBrainId,
                )}
                // The territory's whole translation, as one attribute. The
                // rectangles inside keep the coordinates the index gave them.
                transform={`translate(${entry.territory.offsetX} ${entry.territory.offsetY})`}
              >
                <g className="map-territory__hierarchy" aria-hidden="true">
                  {entry.hierarchy}
                </g>
                {entry.blocks}
                {(entry.brain.aggregates ?? []).map(a => <g key={`aggregate:${a.parentId}`}
                  data-aggregate="true" role="button" tabIndex={0}
                  aria-label={`${a.omittedDirectChildren} enfants directs hors vue; ${a.nextCursor ? "page suivante" : "première page"}`}
                  onClick={() => onExpand?.(entry.brain.brainId, a)}
                  onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); onExpand?.(entry.brain.brainId, a); } }}>
                  <rect {...{x:a.rect.x,y:a.rect.y,width:a.rect.w,height:a.rect.h}} fill="#e9eef2" stroke="#536570" strokeDasharray="5 3" />
                  <text x={a.rect.x+12} y={a.rect.y+36} fill="#243843">{a.omittedDirectChildren} enfants hors vue…</text>
                </g>)}
              </g>
            ) : null,
          )}
        </g>

        <g className="map-view__cross-edges" data-testid="cross-edges" aria-hidden="true">
          {crossEdges}
        </g>
        <g className="map-view__edges" aria-hidden="true">
          {edges}
        </g>
        <g className="map-view__labels" aria-hidden="true">
          {labels}
        </g>
      </svg>
    </div>
  );
}

export type { Territory };
