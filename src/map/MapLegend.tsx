import type { Locale } from "../lib/locale";
import { ROLE_SYMBOLS } from "./filters";
import {
  LEGEND_KEYS,
  hierarchyPresentation,
  legendKeyAttribute,
  nodePresentation,
  relationPresentation,
  type LegendKey,
} from "./mapLegendContract";
import { arrowHeadPath, NodeKindGlyph } from "./mapVisualPrimitives";
import type { MapNodeKind, RelationProvenance } from "./types";

export interface MapLegendStrings {
  title: string;
  description: string;
  items: Record<LegendKey, string>;
}

interface MapLegendProps {
  id: string;
  locale: Locale;
  strings: MapLegendStrings;
}

function NodeSample({ legendKey }: { legendKey: LegendKey }) {
  const kind = legendKey.startsWith("node-") &&
      ["root", "directory", "file", "skipped"].includes(legendKey.slice(5))
    ? (legendKey.slice(5) as MapNodeKind)
    : "file";
  const state = legendKey === "node-selected"
    ? "selected"
    : legendKey === "node-related"
      ? "related"
      : legendKey === "node-linked"
        ? "linked"
        : legendKey === "node-cross-linked"
          ? "cross-linked"
          : "plain";
  const filterRole = legendKey === "filter-match"
    ? "match"
    : legendKey === "filter-context"
      ? "context"
      : undefined;
  const diagnostic = legendKey === "node-diagnostic";
  const presentation = nodePresentation(kind, state, filterRole, diagnostic);
  return (
    <svg viewBox="0 0 76 44" aria-hidden="true" focusable="false">
      <g className={presentation.className}>
        <rect x="2" y="2" width="72" height="40" rx="6" />
        <NodeKindGlyph kind={kind} x={11} y={21} />
        {filterRole ? (
          <text className={`map-node__filter-tag map-node__filter-tag--${filterRole}`} x="35" y="28">
            {ROLE_SYMBOLS[filterRole]}
          </text>
        ) : null}
        {diagnostic ? <path className="map-node__diagnostic" d="M 2 2 l 15 0 l -15 15 Z" /> : null}
      </g>
    </svg>
  );
}

function HierarchySample({ touching }: { touching: boolean }) {
  const presentation = hierarchyPresentation(touching);
  return (
    <svg viewBox="0 0 76 44" aria-hidden="true" focusable="false">
      <g className={presentation.className}>
        <path d="M 8 22 H 68" />
      </g>
    </svg>
  );
}

function RelationSample({
  cross,
  kind,
  provenance = null,
  touching = false,
}: {
  cross: boolean;
  kind: "established" | "suggestion";
  provenance?: RelationProvenance | null;
  touching?: boolean;
}) {
  const presentation = relationPresentation({
    cross,
    kind,
    provenance,
    touchesSelection: touching,
  });
  const prefix = cross ? "map-cross-edge" : "map-edge";
  return (
    <svg viewBox="0 0 76 44" aria-hidden="true" focusable="false">
      <g className={presentation.className}>
        {cross ? <line className={`${prefix}__casing`} x1="8" y1="22" x2="68" y2="22" /> : null}
        <line className={`${prefix}__line`} x1="8" y1="22" x2="68" y2="22" />
        {kind === "established" ? (
          <>
            <path className={`${prefix}__arrow`} d={arrowHeadPath(59, 22, 1, 0)} />
            {cross ? <path className={`${prefix}__chevron`} d={arrowHeadPath(38, 22, 1, 0)} /> : null}
          </>
        ) : (
          <>
            <circle className={`${prefix}__ring`} cx="8" cy="22" r={cross ? 4.5 : 3.5} />
            <circle className={`${prefix}__ring`} cx="68" cy="22" r={cross ? 4.5 : 3.5} />
          </>
        )}
      </g>
    </svg>
  );
}

function Sample({ legendKey }: { legendKey: LegendKey }) {
  if (legendKey.startsWith("node-") || legendKey.startsWith("filter-")) {
    return <NodeSample legendKey={legendKey} />;
  }
  if (legendKey.startsWith("hierarchy-")) {
    return <HierarchySample touching={legendKey === "hierarchy-touching"} />;
  }
  if (legendKey.startsWith("intra-")) {
    return (
      <RelationSample
        cross={false}
        kind={legendKey === "intra-suggestion" ? "suggestion" : "established"}
        provenance={legendKey === "intra-approved" ? "APPROVED" : null}
        touching={legendKey === "intra-touching"}
      />
    );
  }
  if (legendKey.startsWith("inter-")) {
    return (
      <RelationSample
        cross
        kind={legendKey === "inter-suggestion" ? "suggestion" : "established"}
        provenance={legendKey === "inter-approved" ? "APPROVED" : null}
        touching={legendKey === "inter-touching"}
      />
    );
  }
  if (legendKey === "territory-focused") {
    return (
      <svg viewBox="0 0 76 44" aria-hidden="true" focusable="false">
        <rect className="map-territory__frame map-territory__frame--focused" x="2" y="2" width="72" height="40" rx="8" />
        <text className="map-territory__title map-territory__title--focused" x="10" y="27">A</text>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 76 44" aria-hidden="true" focusable="false">
      <g className="map-aggregate">
        <rect className="map-aggregate__pill" x="7" y="8" width="62" height="28" rx="14" />
        <text className="map-aggregate__label" x="38" y="22">+3</text>
      </g>
    </svg>
  );
}

export default function MapLegend({ id, locale, strings }: MapLegendProps) {
  return (
    <section
      id={id}
      className="map-runtime-legend"
      role="region"
      lang={locale}
      aria-labelledby={`${id}-title`}
      data-testid="map-legend"
    >
      <h2 id={`${id}-title`}>{strings.title}</h2>
      <p>{strings.description}</p>
      <ul>
        {LEGEND_KEYS.map((legendKey) => (
          <li key={legendKey} data-legend-key={legendKey}>
            <span className="map-runtime-legend__sample">
              <Sample legendKey={legendKey} />
            </span>
            <span>{strings.items[legendKey]}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export { LEGEND_KEYS, legendKeyAttribute };
