/**
 * `TASK-0047` — V1 accessibility closure: the guards that keep what the real WebView2 proof measured.
 *
 * The AUTHORITATIVE proof of contrast, focus visibility, ARIA and keyboard behaviour is
 * `docs/performance/runs/TASK-0047-webview2.json` (axe-core 4.13.0 + real key events + computed styles,
 * in the real engine): JSDOM has no layout and no real colour resolution, so nothing below claims to
 * replace it. These tests are the cheap, deterministic tripwires that make a plain regression — a token
 * edited, a role changed, a keyboard handler dropped — fail `pnpm test` before it ever reaches a
 * WebView2 run.
 */
import productProjection from "../../docs/performance/runs/TASK-0030-materialized-view-100k.json";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import ts from "typescript";
import { afterEach, describe, expect, it, vi } from "vitest";
import mapCss from "./map.css?raw";
import { domNodeId } from "./composedView";
import { buildHierarchy } from "./hierarchy";
import MapView from "./MapView";
import { composeTerritories } from "./territories";
import type { BrainRecord, MapProjection } from "./types";
import { fitView, type View } from "./viewState";

afterEach(cleanup);

// ---------------------------------------------------------------------------------------------
// The map: what the tree says, and where the keyboard focus goes
// ---------------------------------------------------------------------------------------------
const projection = productProjection as MapProjection;
const brainId = projection.brainId;
const record: BrainRecord = {
  brainId,
  displayName: "Synthetic",
  color: "#1F6F5C",
  icon: "▲",
  sourceKind: "SYNTHETIC_FIXTURE",
  sourceRef: "scale-runtime",
  sourceLabel: "scale-runtime",
  position: 1,
};
const hierarchy = buildHierarchy(projection.nodes, projection.rootId);
const composition = composeTerritories([{ brainId, layoutWidth: projection.layoutWidth, layoutHeight: projection.layoutHeight }]);
const viewport = { width: 1200, height: 800 };

function brainWith(aggregates = projection.aggregates) {
  return { brainId, record, hierarchy, segments: [], relationNeighbours: new Set<number>(), crossNeighbours: new Set<number>(), nodeCount: projection.materializedCount, aggregates };
}
function mapProps(overrides: Record<string, unknown> = {}) {
  return {
    locale: "fr" as const,
    brains: [brainWith()],
    crossSegments: [],
    composition,
    view: fitView(composition.world, viewport),
    viewport,
    selected: { brainId, nodeId: projection.rootId },
    focusedBrainId: brainId,
    onSelect: vi.fn(),
    onExpand: vi.fn(),
    onViewChange: vi.fn(),
    onViewportChange: () => {},
    labelFor: (n: { name: string }) => n.name,
    territoryLabelFor: () => "Synthetic",
    ariaLabel: "Projection",
    ...overrides,
  };
}

describe("the map's tree: ARIA that names things which exist", () => {
  it("names an active descendant only when its card is drawn (axe: aria-valid-attr-value)", () => {
    render(<MapView {...mapProps()} />);
    const tree = screen.getByRole("tree");
    const id = tree.getAttribute("aria-activedescendant");
    expect(id).toBe(domNodeId(brainId, projection.rootId));
    expect(document.getElementById(id!)).not.toBeNull();
  });

  it("names NO active descendant when the selection is not drawn (found by search, outside the bounded view)", () => {
    render(<MapView {...mapProps({ selected: { brainId, nodeId: 987654321 } })} />);
    expect(screen.getByRole("tree").hasAttribute("aria-activedescendant")).toBe(false);
  });

  it("holds no role=button: a tree owns tree items and groups only (axe: aria-required-children)", () => {
    render(<MapView {...mapProps()} />);
    expect(document.querySelectorAll('[role="tree"] [role="button"]')).toHaveLength(0);
    const inTheMap = jsxFacts().filter((f) => f.file === "MapView.tsx" && f.props.get("role") === "button");
    expect(inTheMap.map((f) => `MapView.tsx:${f.line}`)).toEqual([]);
  });
});

describe("the aggregate (« +N items »): a focusable tree item that Enter and Space activate", () => {
  it("is a named tree item one level below its parent, in the tab order", () => {
    render(<MapView {...mapProps()} />);
    const aggregate = screen.getByRole("treeitem", { name: /Voir la suite/ });
    expect(aggregate.getAttribute("tabindex")).toBe("0");
    const parent = hierarchy.byId.get(projection.aggregates[0].parentId)!;
    expect(aggregate.getAttribute("aria-level")).toBe(String(parent.depth + 2));
  });

  it("pans the map to an aggregate the pan has left outside the canvas when it takes the focus", () => {
    const rect = projection.aggregates[0].rect;
    // Zoomed on the far corner: the aggregate's slot is nowhere in the visible region.
    const away: View = { scale: 4, tx: -(rect.x + 4000) * 4, ty: -(rect.y + 4000) * 4 };
    const onViewChange = vi.fn();
    render(<MapView {...mapProps({ view: away, onViewChange })} />);
    fireEvent.focus(screen.getByRole("treeitem", { name: /Voir la suite/ }));
    expect(onViewChange).toHaveBeenCalled();
  });

  it("leaves a view that already shows the aggregate alone when it takes the focus", () => {
    const onViewChange = vi.fn();
    render(<MapView {...mapProps({ onViewChange })} />);
    fireEvent.focus(screen.getByRole("treeitem", { name: /Voir la suite/ }));
    expect(onViewChange).not.toHaveBeenCalled();
  });

  it("gives the focus to the tree when the activated aggregate is replaced by the new projection", () => {
    const props = mapProps();
    const { rerender } = render(<MapView {...props} />);
    const aggregate = screen.getByRole("treeitem", { name: /Voir la suite/ });
    aggregate.focus();
    expect(document.activeElement).toBe(aggregate);
    fireEvent.keyDown(aggregate, { key: "Enter" });
    expect(props.onExpand).toHaveBeenCalledTimes(1);
    // The backend answered: the aggregate is gone, so the browser drops the focus on <body>.
    rerender(<MapView {...mapProps({ brains: [brainWith([])], onExpand: props.onExpand })} />);
    expect(document.activeElement).toBe(screen.getByRole("tree"));
  });

  it("does not steal the focus from where the person went meanwhile", () => {
    const props = mapProps();
    const { rerender } = render(<MapView {...props} />);
    const aggregate = screen.getByRole("treeitem", { name: /Voir la suite/ });
    aggregate.focus();
    fireEvent.keyDown(aggregate, { key: " " });
    const elsewhere = document.createElement("button");
    document.body.appendChild(elsewhere);
    elsewhere.focus();
    rerender(<MapView {...mapProps({ brains: [brainWith([])], onExpand: props.onExpand })} />);
    expect(document.activeElement).toBe(elsewhere);
    elsewhere.remove();
  });
});

// ---------------------------------------------------------------------------------------------
// Source guard: every pointer gesture has a keyboard route (WCAG 2.1.1)
// ---------------------------------------------------------------------------------------------
const NATIVE_INTERACTIVE = new Set(["button", "a", "input", "select", "textarea", "label", "summary", "option", "form"]);
/**
 * Pointer gestures that are allowed on a non-native element, each with the keyboard route that carries the
 * same action — reviewed by hand, and the only exceptions.
 */
const POINTER_ONLY_BY_NATURE = new Map<string, string>([
  ["MapView.tsx|svg|tree", "pan by drag and zoom by wheel: `+` `-` `=` `_` zoom, `f` fit, `r` reset, Alt+arrows pan (handleKeyDown on the same element)"],
  ["MapView.tsx|g|treeitem", "select a card by pointer: the arrow keys, Home, `n` and `p` select cards from the focused tree (handleKeyDown)"],
]);
const POINTER_PROPS = new Set(["onPointerDown", "onPointerUp", "onPointerMove", "onMouseDown", "onMouseUp", "onDoubleClick", "onWheel", "onDragStart", "onTouchStart"]);

const RAW_SOURCES = import.meta.glob("./*.tsx", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
function mapSources(): { file: string; text: string }[] {
  return Object.entries(RAW_SOURCES)
    .filter(([file]) => !file.endsWith(".test.tsx"))
    .map(([file, text]) => ({ file: file.replace("./", ""), text }));
}
interface JsxFact {
  file: string;
  tag: string;
  props: Map<string, string | null>;
  line: number;
}
function jsxFacts(): JsxFact[] {
  const facts: JsxFact[] = [];
  for (const { file, text } of mapSources()) {
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = (node: ts.Node) => {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const props = new Map<string, string | null>();
        for (const attribute of node.attributes.properties) {
          if (!ts.isJsxAttribute(attribute)) continue;
          const initializer = attribute.initializer;
          props.set(attribute.name.getText(source), initializer && ts.isStringLiteral(initializer) ? initializer.text : initializer ? initializer.getText(source) : null);
        }
        facts.push({ file, tag: node.tagName.getText(source), props, line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1 });
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return facts;
}

describe("source guard — every pointer gesture has a keyboard route", () => {
  const facts = jsxFacts();

  it("scans the real components (a scan that finds nothing proves nothing)", () => {
    expect(facts.length).toBeGreaterThan(500);
    expect(facts.filter((f) => f.props.has("onClick")).length).toBeGreaterThan(30);
  });

  it("an onClick on a non-native element is a focusable role with a key handler", () => {
    const offenders = facts
      .filter((f) => f.props.has("onClick") && !NATIVE_INTERACTIVE.has(f.tag))
      .filter((f) => !(f.props.has("role") && f.props.has("tabIndex") && f.props.has("onKeyDown")))
      .map((f) => `${f.file}:${f.line} <${f.tag}> has onClick but no role + tabIndex + onKeyDown`);
    expect(offenders).toEqual([]);
  });

  it("a pointer-only gesture on a non-native element is one of the reviewed exceptions", () => {
    const offenders = facts
      .filter((f) => [...f.props.keys()].some((p) => POINTER_PROPS.has(p)) && !NATIVE_INTERACTIVE.has(f.tag))
      .map((f) => ({ f, key: `${f.file}|${f.tag}|${f.props.get("role") ?? ""}` }))
      .filter(({ key }) => !POINTER_ONLY_BY_NATURE.has(key))
      .map(({ f, key }) => `${f.file}:${f.line} ${key}: a pointer gesture with no reviewed keyboard route`);
    expect(offenders).toEqual([]);
  });

  it("the reviewed exceptions still exist and still have their key handler", () => {
    const tree = facts.find((f) => f.file === "MapView.tsx" && f.tag === "svg" && f.props.get("role") === "tree")!;
    expect(tree.props.has("onKeyDown")).toBe(true);
    expect(tree.props.get("tabIndex")).toBe("{0}");
  });

  it("no positive tabIndex, and nothing focusable or clickable is hidden from assistive technology", () => {
    const positive = facts.filter((f) => /^\{[1-9]\d*\}$/.test(f.props.get("tabIndex") ?? "")).map((f) => `${f.file}:${f.line}`);
    expect(positive).toEqual([]);
    const hiddenControls = facts
      .filter((f) => f.props.get("aria-hidden") === "true" && (f.props.has("onClick") || f.props.has("tabIndex")))
      .map((f) => `${f.file}:${f.line} <${f.tag}>`);
    expect(hiddenControls).toEqual([]);
  });

  it("every keyboard-activated custom control answers Enter and Space", () => {
    const custom = facts.filter((f) => f.props.has("onClick") && !NATIVE_INTERACTIVE.has(f.tag));
    expect(custom.length).toBeGreaterThan(0);
    for (const control of custom) {
      const source = mapSources().find((s) => s.file === control.file)!.text.split("\n");
      const region = source.slice(control.line - 1, control.line + 40).join("\n");
      expect(region, `${control.file}:${control.line}`).toMatch(/"Enter"/);
      expect(region, `${control.file}:${control.line}`).toMatch(/" "/);
    }
  });
});

// ---------------------------------------------------------------------------------------------
// Stylesheet guard — the tokens the real-engine measurement relied on
// ---------------------------------------------------------------------------------------------
type Rgb = [number, number, number];
const hexRgb = (hex: string): Rgb => {
  const h = hex.trim().replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};
const lin = (v: number) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};
const luminance = ([r, g, b]: Rgb) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const contrast = (a: Rgb, b: Rgb) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const over = (fg: Rgb, alpha: number, bg: Rgb): Rgb => [0, 1, 2].map((i) => fg[i] * alpha + bg[i] * (1 - alpha)) as Rgb;

function block(css: string, opener: string): string {
  const start = css.indexOf(opener);
  if (start < 0) throw new Error(`no block ${opener}`);
  let depth = 0;
  for (let i = css.indexOf("{", start); i < css.length; i++) {
    if (css[i] === "{") depth++;
    if (css[i] === "}" && --depth === 0) return css.slice(css.indexOf("{", start) + 1, i);
  }
  throw new Error(`unclosed block ${opener}`);
}
function tokens(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) out[m[1]] = m[2];
  return out;
}
const lightTokens = tokens(block(mapCss, ":root {"));
const darkTokens = { ...lightTokens, ...tokens(block(block(mapCss, "@media (prefers-color-scheme: dark)"), ":root {")) };
const SCHEMES: [string, Record<string, string>][] = [["light", lightTokens], ["dark", darkTokens]];
const t = (tokensOf: Record<string, string>, name: string): Rgb => hexRgb(tokensOf[name]);
/** The opacities a card is drawn at: plain, related, base, selected (map.css). */
const CARD_OPACITIES = [0.66, 0.75, 0.88, 0.95];

describe("stylesheet guard — contrast of the tokens the map and the chrome are built from", () => {
  it("reads both schemes' tokens", () => {
    expect(Object.keys(lightTokens)).toContain("ink");
    expect(darkTokens.directory).not.toBe(lightTokens.directory); // the dark scheme has its own card fills
  });

  for (const [scheme, tk] of SCHEMES) {
    it(`${scheme}: body text tokens reach 4.5:1 on the page and the panels`, () => {
      for (const text of ["ink", "ink-soft", "warn"]) {
        for (const ground of ["paper", "panel"]) {
          expect(contrast(t(tk, text), t(tk, ground)), `${text} on ${ground}`).toBeGreaterThanOrEqual(4.5);
        }
      }
      // The pressed language button: `--paper` text on an `--accent` fill.
      expect(contrast(t(tk, "paper"), t(tk, "accent"))).toBeGreaterThanOrEqual(4.5);
    });

    it(`${scheme}: the focus outline (--accent) reaches 3:1 on the page and the panels`, () => {
      for (const ground of ["paper", "panel"]) expect(contrast(t(tk, "accent"), t(tk, ground))).toBeGreaterThanOrEqual(3);
    });

    it(`${scheme}: a card's name (--ink) reaches 4.5:1 on every kind of card at every opacity`, () => {
      for (const kind of ["directory", "file", "skipped"]) {
        for (const opacity of CARD_OPACITIES) {
          for (const ground of ["map-grid-bg", "map-grid-line"]) {
            const card = over(t(tk, kind), opacity, t(tk, ground));
            const label = over(t(tk, "ink"), 0.95, card);
            expect(contrast(label, card), `${kind} @${opacity} on ${ground}`).toBeGreaterThanOrEqual(4.5);
          }
        }
      }
    });

    it(`${scheme}: the root card is dark whatever its state, and its light name reaches 4.5:1`, () => {
      expect(block(mapCss, ".map-node.map-node--root rect")).toMatch(/fill-opacity:\s*0\.95/);
      const light = hexRgb(/\.map-node__label--root\s*\{[^}]*fill:\s*(#[0-9a-fA-F]{6})/.exec(mapCss)![1]);
      for (const ground of ["map-grid-bg", "map-grid-line"]) {
        const card = over(t(tk, "root"), 0.95, t(tk, ground));
        expect(contrast(light, card)).toBeGreaterThanOrEqual(4.5);
      }
    });

    it(`${scheme}: the border of a text field reaches 3:1 (WCAG 1.4.11) and the placeholder 4.5:1`, () => {
      expect(block(mapCss, 'input[type="text"] {')).toMatch(/border:\s*1px solid var\(--ink-soft\)/);
      expect(block(mapCss, "input::placeholder {")).toMatch(/color:\s*var\(--ink-soft\)/);
      for (const ground of ["paper", "panel"]) expect(contrast(t(tk, "ink-soft"), t(tk, ground))).toBeGreaterThanOrEqual(4.5);
    });
  }

  it("the territory title has a fill of its own (it was the browser's default black, unreadable in the dark scheme)", () => {
    expect(block(mapCss, ".map-territory__title {")).toMatch(/fill:\s*var\(--ink\)/);
  });
});

describe("stylesheet guard — focus and motion", () => {
  it("the global :focus-visible is a real outline, and the canvas draws it inside its clipping host", () => {
    const focus = block(mapCss, "\n:focus-visible {");
    expect(focus).toMatch(/outline:\s*[2-9]px solid var\(--accent\)/);
    expect(block(mapCss, ".map-view__canvas:focus-visible {")).toMatch(/outline-offset:\s*-\d+px/);
    expect(mapCss).toMatch(/\.map-view\s*\{[^}]*overflow:\s*hidden/); // the reason the canvas needs it
  });

  it("no rule removes an outline", () => {
    expect(mapCss).not.toMatch(/outline:\s*(none|0)\b/);
    expect(mapCss).not.toMatch(/outline-style:\s*none/);
  });

  it("prefers-reduced-motion cancels every transition and animation, and nothing scrolls smoothly outside it", () => {
    const reduce = block(mapCss, "@media (prefers-reduced-motion: reduce)");
    expect(reduce).toMatch(/\*\s*\{[^}]*transition:\s*none\s*!important/);
    expect(reduce).toMatch(/animation:\s*none\s*!important/);
    expect(mapCss.replace(reduce, "")).not.toMatch(/scroll-behavior:\s*smooth/);
    // The product declares no motion of its own: a new one has to be added on purpose, and reviewed against the block above.
    const outside = mapCss.replace(reduce, "");
    expect(outside).not.toMatch(/@keyframes/);
    expect(outside).not.toMatch(/\btransition\s*:/);
    expect(outside).not.toMatch(/\banimation\s*:/);
  });
});
