import type { FilterRole } from "./filters";
import type { MapNodeKind, RelationProvenance } from "./types";

/**
 * The semantic vocabulary shared by the live map and its legend.
 *
 * A rendered map element gets its keys from the helpers below. The legend is
 * built from this same closed contract, so adding a visual state to the map
 * without explaining it is observable in a rendered rich-map test.
 */
export const LEGEND_KEYS = [
  "node-root",
  "node-directory",
  "node-file",
  "node-skipped",
  "node-selected",
  "node-related",
  "node-linked",
  "node-cross-linked",
  "filter-match",
  "filter-context",
  "node-diagnostic",
  "territory-focused",
  "hierarchy-normal",
  "hierarchy-touching",
  "intra-established",
  "intra-suggestion",
  "intra-approved",
  "intra-touching",
  "inter-crossing",
  "inter-established",
  "inter-suggestion",
  "inter-approved",
  "inter-touching",
  "aggregate",
] as const;

export type LegendKey = (typeof LEGEND_KEYS)[number];
export type NodeVisualState = "plain" | "selected" | "related" | "linked" | "cross-linked";
export type EdgeVisualKind = "established" | "suggestion";

export function legendKeyAttribute(keys: readonly LegendKey[]): string {
  return keys.join(" ");
}
export function nodePresentation(
  kind: MapNodeKind,
  state: NodeVisualState,
  filterRole?: FilterRole,
  diagnostic = false,
): { className: string; keys: LegendKey[] } {
  const keys: LegendKey[] = [`node-${kind}`];
  if (state !== "plain") keys.push(`node-${state}`);
  if (filterRole) keys.push(`filter-${filterRole}`);
  if (diagnostic) keys.push("node-diagnostic");
  return {
    className: `map-node map-node--${kind} map-node--${state}${
      filterRole ? ` map-node--filter-${filterRole}` : ""
    }`,
    keys,
  };
}

export function hierarchyPresentation(touchesSelection: boolean): {
  className: string;
  keys: LegendKey[];
} {
  return {
    className: `map-hierarchy-edge map-hierarchy-edge--${
      touchesSelection ? "touching" : "distant"
    }`,
    keys: [touchesSelection ? "hierarchy-touching" : "hierarchy-normal"],
  };
}

export function relationPresentation(options: {
  cross: boolean;
  kind: EdgeVisualKind;
  provenance: RelationProvenance | null;
  touchesSelection: boolean;
}): { className: string; keys: LegendKey[] } {
  const { cross, kind, provenance, touchesSelection } = options;
  const prefix = cross ? "map-cross-edge" : "map-edge";
  const semanticPrefix = cross ? "inter" : "intra";
  const keys: LegendKey[] = [];
  if (cross) keys.push("inter-crossing");
  keys.push(`${semanticPrefix}-${kind}`);
  if (provenance === "APPROVED") keys.push(`${semanticPrefix}-approved`);
  if (touchesSelection) keys.push(`${semanticPrefix}-touching`);
  return {
    className:
      `${prefix} ${prefix}--${kind} ${prefix}--${touchesSelection ? "touching" : "distant"}` +
      (provenance ? ` ${prefix}--${provenance.toLowerCase()}` : ""),
    keys,
  };
}
