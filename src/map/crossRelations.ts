/**
 * Inter-brain relation helpers — `TASK-0020`.
 *
 * Everything here is pure and works on the DTOs the common store returns.
 * Nothing derives a relation, invents an inverse, or promotes a suggestion:
 * the model decides those, in Rust, and this file only groups and projects
 * what it is given.
 *
 * **The one difference from `relations.ts`, and it is the whole point.** An
 * intra-brain segment lives in one brain's coordinates and is drawn inside one
 * territory. An inter-brain segment has **one end in each of two brains'
 * coordinates**, and is drawn across the gap between two territories. So it
 * carries its two brain ids, and `MapView` looks up **two** offsets rather than
 * one. There is no arithmetic here that mixes the two spaces — mixing them is
 * exactly how an edge would end up drawn inside the wrong brain.
 */

import type { Locale } from "../lib/locale";
import type {
  CrossRelationEdge,
  CrossRelationsOverview,
  CrossSuggestionEdge,
  MapNode,
  NodeCrossRelationEntry,
  RelationProvenance,
} from "./types";
import { PROVENANCE_LABELS, relationTypeLabel } from "./relations";

/**
 * Splits a `cek1` key back into its brain and its relative path.
 *
 * Returns `null` for anything that is not a well-formed key of **this** scheme
 * — an `ek1` key from `TASK-0017` included. Mirrors
 * `split_cross_endpoint_key` in Rust; the two are checked against each other by
 * the tests that build keys with one and read them with the other.
 *
 * Used by navigation: an endpoint key survives a rebuild, a `nodeId` does not,
 * so a jump towards a brain that is about to be loaded resolves the **path**
 * once that brain's index is on hand.
 */
export function splitCrossEndpointKey(
  key: string,
): { brainId: string; relativePath: string } | null {
  const first = key.indexOf("|");
  if (first < 0) return null;
  const second = key.indexOf("|", first + 1);
  if (second < 0) return null;
  const scheme = key.slice(0, first);
  const brainId = key.slice(first + 1, second);
  if (scheme !== "cek1" || brainId.length === 0) return null;
  return { brainId, relativePath: key.slice(second + 1) };
}

/**
 * Stable identity of an established inter-brain relation.
 *
 * **Not the row id.** Replaying the frozen derivation rewrites the
 * deterministic table, so SQLite hands out fresh ids; the pair of keys plus the
 * type is what actually names a relation, and it is what React keys on.
 */
export function crossRelationKey(edge: CrossRelationEdge): string {
  return `${edge.provenance}|${edge.source.key}→${edge.target.key}|${edge.relationType}`;
}

export function crossEntryKey(entry: NodeCrossRelationEntry): string {
  return `${entry.direction}|${entry.provenance}|${entry.other.key}|${entry.relationType}`;
}

/**
 * A one-line, colour-free description of an inter-brain relation.
 *
 * Spelled out rather than implied: `M6` asks that « inter-cerveaux » be
 * accessible and semantic, and words are the one channel no colour setting can
 * take away.
 */
export function crossRelationSummary(edge: CrossRelationEdge, locale: Locale): string {
  const type = relationTypeLabel(edge.relationType, locale);
  const provenance = PROVENANCE_LABELS[locale][edge.provenance];
  if (locale === "fr") {
    return (
      `relation INTER-CERVEAUX établie, ${type}, ` +
      `de ${edge.source.brainDisplayName} · ${edge.source.name} ` +
      `vers ${edge.target.brainDisplayName} · ${edge.target.name}, ` +
      `provenance ${provenance}` +
      (edge.provenance === "DETERMINISTIC"
        ? `, règle ${edge.ruleName} version ${edge.ruleVersion}`
        : ", approuvée par une action explicite")
    );
  }
  return (
    `INTER-BRAIN relation established, ${type}, ` +
    `from ${edge.source.brainDisplayName} · ${edge.source.name} ` +
    `to ${edge.target.brainDisplayName} · ${edge.target.name}, ` +
    `provenance ${provenance}` +
    (edge.provenance === "DETERMINISTIC"
      ? `, rule ${edge.ruleName} version ${edge.ruleVersion}`
      : ", approved by an explicit action")
  );
}

export function crossSuggestionSummary(suggestion: CrossSuggestionEdge, locale: Locale): string {
  const type = relationTypeLabel(suggestion.relationType, locale);
  return locale === "fr"
    ? `SUGGESTION inter-cerveaux non établie, ${type}, ` +
        `de ${suggestion.source.brainDisplayName} · ${suggestion.source.name} ` +
        `vers ${suggestion.target.brainDisplayName} · ${suggestion.target.name}`
    : `SUGGESTION inter-brain not established, ${type}, ` +
        `from ${suggestion.source.brainDisplayName} · ${suggestion.source.name} ` +
        `to ${suggestion.target.brainDisplayName} · ${suggestion.target.name}`;
}

/**
 * One drawable inter-brain segment. **Two coordinate spaces, declared.**
 *
 * `x1, y1` are in the **source** brain's own layout coordinates; `x2, y2` are
 * in the **target** brain's. Neither has been translated: `MapView` applies
 * each territory's offset, because only it knows where the territories are.
 */
export interface CrossSegment {
  key: string;
  kind: "established" | "suggestion";
  provenance: RelationProvenance | null;
  relationType: string;
  fromBrainId: string;
  fromNodeId: number;
  toBrainId: string;
  toNodeId: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Source and target boxes in their own brain coordinate spaces. */
  fromRect: MapNode["rect"];
  toRect: MapNode["rect"];
  /** True when either end is the current selection — used for accentuation. */
  touchesSelection: boolean;
  label: string;
}

/** One brain's rectangles, as the composed view holds them. */
export type BrainNodeIndex = ReadonlyMap<string, ReadonlyMap<number, MapNode>>;

function centre(node: MapNode): { x: number; y: number } {
  return { x: node.rect.x + node.rect.w / 2, y: node.rect.y + node.rect.h / 2 };
}

/**
 * Projects inter-brain relations onto the rectangles the indexes already hold.
 *
 * **No layout is recomputed here** — the rectangles come from the index, and a
 * cross edge is the segment between two of their centres, each read in its own
 * brain's space.
 *
 * A segment is produced **only when both ends are displayed**. An endpoint in a
 * brain that is not in the composition, or that the index does not resolve,
 * produces nothing: `M9` says such a relation stays visible **in the panel**,
 * not that a line is drawn to a territory that is not on screen.
 */
export function crossSegments(
  overview: CrossRelationsOverview | null,
  byBrain: BrainNodeIndex,
  selected: { brainId: string; nodeId: number } | null,
  locale: Locale,
): CrossSegment[] {
  if (!overview) return [];
  const segments: CrossSegment[] = [];

  const push = (
    key: string,
    kind: CrossSegment["kind"],
    provenance: RelationProvenance | null,
    relationType: string,
    from: { brainId: string; nodeId: number | null },
    to: { brainId: string; nodeId: number | null },
    label: string,
  ) => {
    if (from.nodeId === null || to.nodeId === null) return;
    // Each end is looked up in **its own** brain. Two brains reading the same
    // fixture hold the same row numbers, so a lookup in the wrong map would
    // find a plausible rectangle and place the edge inside the wrong
    // territory — `M6` counts exactly that.
    const fromNode = byBrain.get(from.brainId)?.get(from.nodeId);
    const toNode = byBrain.get(to.brainId)?.get(to.nodeId);
    if (!fromNode || !toNode) return;
    const start = centre(fromNode);
    const end = centre(toNode);
    segments.push({
      key,
      kind,
      provenance,
      relationType,
      fromBrainId: from.brainId,
      fromNodeId: from.nodeId,
      toBrainId: to.brainId,
      toNodeId: to.nodeId,
      x1: start.x,
      y1: start.y,
      x2: end.x,
      y2: end.y,
      fromRect: fromNode.rect,
      toRect: toNode.rect,
      touchesSelection:
        selected !== null &&
        ((selected.brainId === from.brainId && selected.nodeId === from.nodeId) ||
          (selected.brainId === to.brainId && selected.nodeId === to.nodeId)),
      label,
    });
  };

  for (const edge of overview.established) {
    push(
      crossRelationKey(edge),
      "established",
      edge.provenance,
      edge.relationType,
      { brainId: edge.source.brainId, nodeId: edge.source.nodeId },
      { brainId: edge.target.brainId, nodeId: edge.target.nodeId },
      crossRelationSummary(edge, locale),
    );
  }
  for (const suggestion of overview.pendingSuggestions) {
    push(
      `cross-suggestion|${suggestion.suggestionKey}`,
      "suggestion",
      null,
      suggestion.relationType,
      { brainId: suggestion.source.brainId, nodeId: suggestion.source.nodeId },
      { brainId: suggestion.target.brainId, nodeId: suggestion.target.nodeId },
      crossSuggestionSummary(suggestion, locale),
    );
  }
  return segments;
}

/**
 * The inter-brain neighbours of the selection, per brain — `M`.
 *
 * Suggestions are deliberately absent: a suggestion that has not been approved
 * is **not** accentuated like an established relation.
 *
 * Returned as a map keyed by brain because the neighbour lives in **another**
 * brain, and a bare set of node ids would be ambiguous the moment two brains
 * read the same tree.
 */
export function crossNeighbours(
  overview: CrossRelationsOverview | null,
  selected: { brainId: string; nodeId: number } | null,
): Map<string, Set<number>> {
  const neighbours = new Map<string, Set<number>>();
  if (!overview || selected === null) return neighbours;
  const add = (brainId: string, nodeId: number | null) => {
    if (nodeId === null) return;
    const bucket = neighbours.get(brainId);
    if (bucket) bucket.add(nodeId);
    else neighbours.set(brainId, new Set([nodeId]));
  };
  for (const edge of overview.established) {
    if (edge.source.brainId === selected.brainId && edge.source.nodeId === selected.nodeId) {
      add(edge.target.brainId, edge.target.nodeId);
    } else if (
      edge.target.brainId === selected.brainId &&
      edge.target.nodeId === selected.nodeId
    ) {
      add(edge.source.brainId, edge.source.nodeId);
    }
  }
  return neighbours;
}

/** Groups a direction's entries by relation type, in a stable order. */
export function groupCrossByType(
  entries: NodeCrossRelationEntry[],
): [string, NodeCrossRelationEntry[]][] {
  const groups = new Map<string, NodeCrossRelationEntry[]>();
  for (const entry of entries) {
    const bucket = groups.get(entry.relationType);
    if (bucket) bucket.push(entry);
    else groups.set(entry.relationType, [entry]);
  }
  return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right, "en"));
}

/**
 * Whether the other end of this entry is currently **on screen**.
 *
 * The store cannot answer this — it knows nothing about the composition — and
 * that separation is deliberate: a relation exists whether or not anybody is
 * looking at it. The panel asks here, and says « hors de la vue » when the
 * answer is no.
 */
export function otherEndIsDisplayed(
  entry: NodeCrossRelationEntry,
  displayedBrainIds: readonly string[],
): boolean {
  return displayedBrainIds.includes(entry.other.brainId);
}
