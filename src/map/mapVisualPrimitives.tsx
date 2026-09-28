import type { MapNodeKind } from "./types";

export function nodeGlyphPath(kind: MapNodeKind, x: number, y: number): string {
  if (kind === "root") {
    return `M ${x + 8} ${y - 8} L ${x + 16} ${y} L ${x + 8} ${y + 8} L ${x} ${y} Z`;
  }
  if (kind === "directory") {
    return `M ${x} ${y - 6} H ${x + 8} L ${x + 11} ${y - 2} H ${x + 20} V ${y + 9} H ${x} Z`;
  }
  if (kind === "file") {
    return `M ${x + 3} ${y - 8} H ${x + 13} L ${x + 19} ${y - 2} V ${y + 10} H ${x + 3} Z M ${x + 13} ${y - 8} V ${y - 2} H ${x + 19}`;
  }
  return `M ${x} ${y - 7} L ${x + 18} ${y + 9} M ${x + 18} ${y - 7} L ${x} ${y + 9}`;
}

export function NodeKindGlyph({
  kind,
  x,
  y,
}: {
  kind: MapNodeKind;
  x: number;
  y: number;
}) {
  return <path className="map-node__kind-glyph" d={nodeGlyphPath(kind, x, y)} />;
}

/** Triangle of an arrow head, pointing along `(ux, uy)` from `(x, y)`. */
export function arrowHeadPath(x: number, y: number, ux: number, uy: number): string {
  const size = 9;
  const tipX = x + ux * size;
  const tipY = y + uy * size;
  const leftX = x - uy * (size * 0.45);
  const leftY = y + ux * (size * 0.45);
  const rightX = x + uy * (size * 0.45);
  const rightY = y - ux * (size * 0.45);
  return `M ${tipX} ${tipY} L ${leftX} ${leftY} L ${rightX} ${rightY} Z`;
}
