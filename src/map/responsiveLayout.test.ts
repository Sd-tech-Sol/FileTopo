import { describe, expect, it } from "vitest";
import mapCss from "./map.css?raw";

/*
 * `TASK-0058` / Stage B B01 — the static half of the responsive baseline.
 *
 * The authoritative evidence is the real WebView2 campaign
 * (`docs/performance/runs/TASK-0058-visual-baseline.json`): three window sizes resized
 * natively on a real Tauri host, six states each, measured horizontal overflow, keyboard
 * reach of the right panel and axe-core. These are the cheap tripwires that fail
 * `pnpm test` first if a later Stage B slice changes the chrome this baseline measured
 * without measuring it again.
 *
 * They assert what the campaign OBSERVED about the stylesheet, not what someone wishes
 * it said: the chrome's two columns are unconditional, the right panel is an in-flow
 * column rather than a covering overlay, and the map is allowed to shrink to nothing
 * before the panel gives up a pixel. A fix is NOT asserted here, because the campaign
 * found no horizontal-overflow defect to fix.
 */

/** Every `selector { body }` rule of the stylesheet, flattened (media blocks included). */
function rules(css: string): { selector: string; body: string }[] {
  const out: { selector: string; body: string }[] = [];
  const pattern = /([^{}@][^{}]*)\{([^{}]*)\}/g;
  for (const match of css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(pattern)) {
    out.push({ selector: match[1].trim().replace(/\s+/g, " "), body: match[2] });
  }
  return out;
}

const all = rules(mapCss);
const ruleFor = (selector: string) => all.filter((rule) => rule.selector === selector);
const mainRules = ruleFor(".app__main");
const asideRules = ruleFor(".app__aside");

describe("the chrome's two columns are the ones TASK-0058 measured", () => {
  it("declares the grid once, with the track pair the baseline reports", () => {
    expect(mainRules).toHaveLength(1);
    expect(mainRules[0].body).toMatch(/display:\s*grid/);
    expect(mainRules[0].body).toMatch(
      /grid-template-columns:\s*minmax\(\s*0\s*,\s*1fr\s*\)\s+minmax\(\s*280px\s*,\s*360px\s*\)/,
    );
  });

  it("gives the map track a zero floor, so the panel is never squeezed into an overflow", () => {
    // `minmax(0, 1fr)` is what keeps the document from scrolling sideways at 960px:
    // the map yields, the panel keeps its declared width. The measured run shows 0px of
    // horizontal overflow at every size and state because of this track, so a later
    // slice that replaces the `0` floor must re-measure.
    const track = /grid-template-columns:\s*minmax\(\s*(\S+?)\s*,\s*1fr\s*\)/.exec(mainRules[0].body);
    expect(track?.[1]).toBe("0");
  });

  it("keeps the right panel an in-flow column, not an overlay that could cover the map", () => {
    expect(asideRules).toHaveLength(1);
    expect(asideRules[0].body).not.toMatch(/position:\s*(fixed|absolute|sticky)/);
    expect(asideRules[0].body).toMatch(/overflow:\s*auto/);
  });
});

describe("the measured behaviour is the unconditional one", () => {
  it("has no width, height or orientation media query: every size sees the same rules", () => {
    // The campaign measured 960x640, 1280x800 and 1366x768 and found no defect, so the
    // stylesheet stayed free of a width breakpoint. If one appears, the three sizes no
    // longer share a code path and the baseline no longer describes them.
    const queries = [...mapCss.matchAll(/@media([^{]*)\{/g)].map((match) => match[1].trim());
    expect(queries.length).toBeGreaterThan(0);
    for (const query of queries) {
      expect(query, query).not.toMatch(/\b(min|max)-(width|height)\b|\borientation\b/);
    }
  });

  it("still declares the two preference queries the baseline exercised", () => {
    const queries = [...mapCss.matchAll(/@media([^{]*)\{/g)].map((match) => match[1].trim());
    expect(queries).toContain("(prefers-color-scheme: dark)");
    expect(queries).toContain("(prefers-reduced-motion: reduce)");
  });
});
