/**
 * Relation helpers shared by the map, the panel and the keyboard —
 * `TASK-0017`.
 *
 * Everything here is pure and works on the DTOs the store returns. Nothing
 * derives a relation, invents an inverse, or promotes a suggestion: the model
 * decides those, in Rust, and this file only groups and projects what it is
 * given.
 */

import type { Locale } from "../lib/locale";
import type {
  MapNode,
  NodeRelationEntry,
  RelationEdge,
  RelationProvenance,
  RelationsOverview,
  SuggestionEdge,
} from "./types";
import { edgeAnchors } from "./geometry";

/**
 * Machine value → the words the interface says about it, in each language
 * (`TASK-0046`). The wire value (`DETERMINISTIC`, `APPROVED`) is what travels; the
 * word is only what a person reads.
 */
export const PROVENANCE_LABELS: Record<Locale, Record<RelationProvenance, string>> = {
  fr: { DETERMINISTIC: "déterministe", APPROVED: "approuvée" },
  en: { DETERMINISTIC: "deterministic", APPROVED: "approved" },
};

export const RELATION_TYPE_LABELS: Record<Locale, Record<string, string>> = {
  fr: {
    reference: "référence",
    revision: "révision de",
    "content-identical": "contenu identique",
  },
  en: {
    reference: "reference",
    revision: "revision of",
    "content-identical": "identical content",
  },
};

/** An unknown relation type is shown as it is: a wire value is never made up a word. */
export function relationTypeLabel(relationType: string, locale: Locale): string {
  return RELATION_TYPE_LABELS[locale][relationType] ?? relationType;
}

/**
 * Stable identity of an established relation.
 *
 * **Not the row id.** Replaying the derivation rewrites the derived table, so
 * SQLite hands out fresh ids; the triple below is what actually names a
 * relation, and it is what React keys on.
 */
export function relationKey(edge: RelationEdge): string {
  return `${edge.provenance}|${edge.source.key}→${edge.target.key}|${edge.relationType}`;
}

export function entryKey(entry: NodeRelationEntry): string {
  return `${entry.direction}|${entry.provenance}|${entry.other.key}|${entry.relationType}`;
}

/**
 * Node ids linked to `nodeId` by an **established** relation, either way.
 *
 * Suggestions are deliberately absent: `J8` requires that they not be
 * accentuated like established relations.
 */
export function establishedNeighbours(
  overview: RelationsOverview | null,
  nodeId: number | null,
): Set<number> {
  const neighbours = new Set<number>();
  if (!overview || nodeId === null) return neighbours;
  for (const edge of overview.established) {
    if (edge.source.nodeId === nodeId && edge.target.nodeId !== null) {
      neighbours.add(edge.target.nodeId);
    } else if (edge.target.nodeId === nodeId && edge.source.nodeId !== null) {
      neighbours.add(edge.source.nodeId);
    }
  }
  return neighbours;
}

/** One drawable segment between two rectangles, in layout coordinates. */
export interface RelationSegment {
  key: string;
  kind: "established" | "suggestion";
  provenance: RelationProvenance | null;
  relationType: string;
  fromNodeId: number;
  toNodeId: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** True when either end is the current selection — used for accentuation. */
  touchesSelection: boolean;
  label: string;
}

/**
 * Projects relations onto the rectangles the index already holds.
 *
 * **No layout is recomputed here** — `H10` of `TASK-0016` stays true: the
 * rectangles come from the index, and an edge is just the border-to-border
 * segment between them.
 *
 * An endpoint the index cannot resolve produces no segment; it is reported by
 * the store's `unresolvedEndpoints` instead of being drawn at the origin.
 */
export function relationSegments(
  overview: RelationsOverview | null,
  byId: Map<number, MapNode>,
  selectedId: number | null,
  locale: Locale,
): RelationSegment[] {
  if (!overview) return [];
  const segments: RelationSegment[] = [];

  const push = (
    key: string,
    kind: RelationSegment["kind"],
    provenance: RelationProvenance | null,
    relationType: string,
    fromId: number | null,
    toId: number | null,
    label: string,
  ) => {
    if (fromId === null || toId === null) return;
    const from = byId.get(fromId);
    const to = byId.get(toId);
    if (!from || !to) return;
    const { source: start, target: end } = edgeAnchors(from.rect, to.rect);
    segments.push({
      key,
      kind,
      provenance,
      relationType,
      fromNodeId: fromId,
      toNodeId: toId,
      x1: start.x,
      y1: start.y,
      x2: end.x,
      y2: end.y,
      touchesSelection: selectedId !== null && (fromId === selectedId || toId === selectedId),
      label,
    });
  };

  for (const edge of overview.established) {
    push(
      relationKey(edge),
      "established",
      edge.provenance,
      edge.relationType,
      edge.source.nodeId,
      edge.target.nodeId,
      locale === "fr"
        ? `relation établie, ${relationTypeLabel(edge.relationType, locale)}, provenance ${
            PROVENANCE_LABELS[locale][edge.provenance]
          }, de ${edge.source.name} vers ${edge.target.name}`
        : `established relation, ${relationTypeLabel(edge.relationType, locale)}, provenance ${
            PROVENANCE_LABELS[locale][edge.provenance]
          }, from ${edge.source.name} to ${edge.target.name}`,
    );
  }
  for (const suggestion of overview.pendingSuggestions) {
    push(
      `suggestion|${suggestion.suggestionKey}`,
      "suggestion",
      null,
      suggestion.relationType,
      suggestion.source.nodeId,
      suggestion.target.nodeId,
      locale === "fr"
        ? `SUGGESTION non établie, ${relationTypeLabel(suggestion.relationType, locale)}, de ${
            suggestion.source.name
          } vers ${suggestion.target.name}`
        : `SUGGESTION not established, ${relationTypeLabel(suggestion.relationType, locale)}, from ${
            suggestion.source.name
          } to ${suggestion.target.name}`,
    );
  }
  return segments;
}

/**
 * Groups a direction's entries by relation type, in a stable order.
 *
 * The order is that of the **wire keys** (`reference`, `revision`, …), not of the words
 * shown for them, so it is the same in both languages and never moves on a switch.
 */
export function groupByType(entries: NodeRelationEntry[]): [string, NodeRelationEntry[]][] {
  const groups = new Map<string, NodeRelationEntry[]>();
  for (const entry of entries) {
    const bucket = groups.get(entry.relationType);
    if (bucket) bucket.push(entry);
    else groups.set(entry.relationType, [entry]);
  }
  return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right, "en"));
}

/**
 * A one-line, colour-free description of a suggestion.
 *
 * Spelled out rather than implied: `J9` forbids a suggestion from reading as
 * an established relation, and words are the one channel no colour setting can
 * take away.
 */
export function suggestionSummary(suggestion: SuggestionEdge, locale: Locale): string {
  const type = relationTypeLabel(suggestion.relationType, locale);
  return locale === "fr"
    ? `Suggestion non établie — ${suggestion.source.name} → ${suggestion.target.name}, ${type}`
    : `Suggestion not established — ${suggestion.source.name} → ${suggestion.target.name}, ${type}`;
}

/**
 * The backend's own explanation of a suggestion or a relation, in the language asked
 * for — `TASK-0046`. The core ships both (`explanationFr`, `explanationEn`); this only
 * picks. When the language asked for is missing it says so through `lang`, rather than
 * pass one language off as the other.
 */
export function explanationFor(
  source: { explanationFr?: string | null; explanationEn?: string | null },
  locale: Locale,
): { text: string; lang: Locale } | null {
  const wanted = locale === "fr" ? source.explanationFr : source.explanationEn;
  if (wanted) return { text: wanted, lang: locale };
  const other = locale === "fr" ? source.explanationEn : source.explanationFr;
  if (other) return { text: other, lang: locale === "fr" ? "en" : "fr" };
  return null;
}
