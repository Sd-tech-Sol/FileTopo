import { describe, expect, it } from "vitest";
import mapCss from "./map.css?raw";

// `TASK-0053` / `DEC-0051` H and I — the stylesheet's half of the two global preferences. The
// authoritative proof is the real WebView2 run (computed styles, map rectangles in world units, a
// probe that would animate); these are the cheap tripwires that fail `pnpm test` first.

/** Every `selector { body }` rule of the stylesheet, flattened (media blocks included). */
function rules(css: string): { selector: string; body: string }[] {
  const out: { selector: string; body: string }[] = [];
  const pattern = /([^{}@][^{}]*)\{([^{}]*)\}/g;
  for (const match of css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(pattern)) {
    out.push({ selector: match[1].trim().replace(/\s+/g, " "), body: match[2] });
  }
  return out;
}

const densityRules = rules(mapCss).filter((rule) => rule.selector.includes("data-density"));
const motionRules = rules(mapCss).filter((rule) => rule.selector.includes("data-motion"));

describe("density is chrome only (DEC-0051 H)", () => {
  it("declares compact rules, and only for the application's own chrome", () => {
    expect(densityRules.length).toBeGreaterThan(3);
    for (const rule of densityRules) {
      for (const selector of rule.selector.split(",").map((part) => part.trim())) {
        expect(selector.startsWith(':root[data-density="compact"]'), selector).toBe(true);
      }
    }
  });

  it("never selects the map: no card, node, edge, territory, canvas, svg or world", () => {
    const forbidden = /(\.map-(?!runtime-legend)|\.app__map|svg|\brect\b|\bpath\b|\btext\b|\[data-card|\.composed|territor|canvas|world|\.node|\.edge|treeitem)/i;
    for (const rule of densityRules) {
      expect(rule.selector, rule.selector).not.toMatch(forbidden);
    }
  });

  it("never declares a property that could move a map coordinate", () => {
    for (const rule of densityRules) {
      expect(rule.body, rule.selector).not.toMatch(/\b(width|height|x|y|transform|scale|translate|zoom|font-size|min-width|max-width)\s*:/);
    }
  });

  it("only compact exists: comfortable is the absence of a rule", () => {
    expect(mapCss).not.toMatch(/data-density="(?!compact")/);
  });
});

describe("motion preference never forces motion (DEC-0051 I)", () => {
  it("has exactly one preference value that does anything, and it removes motion", () => {
    expect(motionRules.length).toBeGreaterThan(0);
    for (const rule of motionRules) {
      expect(rule.selector).toContain('[data-motion="reduce"]');
      expect(rule.body).toMatch(/transition:\s*none\s*!important/);
      expect(rule.body).toMatch(/animation:\s*none\s*!important/);
      for (const declaration of rule.body.matchAll(/(?:transition|animation)[\w-]*\s*:\s*([^;]+)/g)) {
        expect(declaration[1].trim(), declaration[0]).toMatch(/^none\b/);
      }
    }
  });

  it("leaves the system media query in charge: it is still declared, and `system` has no rule that could override it", () => {
    expect(mapCss).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{\s*\*\s*\{[^}]*transition:\s*none\s*!important/);
    expect(mapCss).not.toMatch(/data-motion="system"/);
    expect(mapCss).not.toMatch(/data-motion="(?!reduce")/);
  });
});
