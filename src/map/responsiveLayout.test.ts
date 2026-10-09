import { describe, expect, it } from "vitest";
import mapCss from "./map.css?raw";

/*
 * The static half of the responsive contract, rewritten by `TASK-0059` / Stage B B02.
 *
 * `TASK-0058` wrote this file as a witness of the stylesheet its campaign had measured:
 * two unconditional columns, a map track with a zero floor, no width breakpoint. That
 * witness did its job — it described a chrome with no horizontal defect — but it described
 * a CSS shape rather than a promise to the person using the application, and `B01-O1` was
 * the proof that the shape was not the promise: measured at 960x640, 1280x800 and
 * 1366x768, in all six states, the first screen held **zero** visible map pixels, the
 * document grew to 4185 px, and the map column began at 727 px
 * (`docs/performance/runs/TASK-0059-first-screen-before.json`).
 *
 * So the assertions below are no longer "the stylesheet still says what it said". They are
 * the invariants the first screen depends on, each one falsifiable by deleting the rule it
 * names, and each one backed by a real WebView2 reading rather than by this file:
 *
 *   before  `docs/performance/runs/TASK-0059-first-screen-before.json`
 *   after   `docs/performance/runs/TASK-0059-first-screen-after.json`
 *
 * These are cheap tripwires that fail `pnpm test` first. They are NOT the evidence: no
 * jsdom test lays anything out, so none of them can tell you how many pixels of map are on
 * screen. Only the campaign can, and it is the campaign that must be re-run if a later
 * slice changes any rule named here.
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
const shellRules = ruleFor(".app");
const chromeRules = ruleFor(".app__chrome");
const mainRules = ruleFor(".app__main");
const mapColumnRules = ruleFor(".app__map");
const mapControlRules = ruleFor(".app__map-controls");
const mapViewRules = ruleFor(".map-view");
const asideRules = ruleFor(".app__aside");

describe("the shell is bounded by the window, which is what B01-O1 was about", () => {
  it("gives the shell the window's height, not only a floor", () => {
    // `min-height: 100vh` on its own is what let the right column's panels grow the grid
    // row, the row grow `.app__main`, and the document reach 4185 px in a 640 px window.
    // The floor is kept — a window shorter than its own minimum is not this slice's
    // problem — but a ceiling is what makes the first screen the whole screen.
    expect(shellRules).toHaveLength(1);
    expect(shellRules[0].body).toMatch(/(^|[;{\s])height:\s*100vh/);
    expect(shellRules[0].body).toMatch(/min-height:\s*100vh/);
  });

  it("forbids the document itself from scrolling", () => {
    // Criterion 1 of `TASK-0059` is about `scrollY=0`. If the shell may overflow, there is
    // a scroll position at which the map is visible and one at which it is not, and the
    // criterion becomes a question about where the person happens to be.
    expect(shellRules[0].body).toMatch(/overflow:\s*hidden/);
  });
});

describe("three regions scroll inside themselves, and they are the three that hold content", () => {
  // The bands above the map, the map column's own controls, and the right panel. Each one
  // can outgrow its box, so each one says so for itself. `min-height: 0` is not decoration:
  // without it the flex automatic minimum size is the content, and a region that cannot
  // shrink below its content is exactly the chrome B01 measured.
  const regions: [string, { selector: string; body: string }[]][] = [
    [".app__chrome", chromeRules],
    [".app__map-controls", mapControlRules],
    [".app__aside", asideRules],
  ];

  for (const [name, declared] of regions) {
    it(`${name} is declared once, scrolls itself, and may shrink below its content`, () => {
      expect(declared).toHaveLength(1);
      expect(declared[0].body).toMatch(/overflow(-y)?:\s*auto/);
      expect(declared[0].body).toMatch(/min-height:\s*0/);
    });
  }

  it("keeps the right panel an in-flow column, not an overlay that could cover the map", () => {
    expect(asideRules[0].body).not.toMatch(/position:\s*(fixed|absolute|sticky)/);
  });

  it("clips the map column, so its control stack cannot push the map out of the column", () => {
    expect(mapColumnRules).toHaveLength(1);
    expect(mapColumnRules[0].body).toMatch(/overflow:\s*hidden/);
  });
});

describe("the map has a floor, and the floor is expressed against the window", () => {
  it("never asks for more height than the smallest declared window can give", () => {
    // `.map-view` used to declare a flat `min-height: 420px`. In the 640 px window that
    // `src-tauri/tauri.conf.json` declares as the floor, 420 px of map plus a 633 px
    // control stack plus a 727 px chrome is more than the shell has, and the answer the
    // engine gave was to grow the document. A floor in `vh` cannot outgrow the window.
    expect(mapViewRules).toHaveLength(1);
    const floor = /min-height:\s*([^;]+)/.exec(mapViewRules[0].body)?.[1]?.trim();
    expect(floor).toBeDefined();
    expect(floor, "the map's floor must be relative to the window, not a flat pixel value")
      .toMatch(/\bmin\(/);
    expect(floor).toMatch(/\d+vh/);
    // Above the 200 CSS px criterion 1 asks for, with room for a border: the measured
    // value is 240 px at all three sizes, published in the `after` artifact.
    const cap = Number(/min\(\s*(\d+)px/.exec(floor ?? "")?.[1]);
    expect(cap).toBeGreaterThanOrEqual(220);
  });

  it("gives the map row a floor of its own, so the bands above cannot take everything", () => {
    const floor = /min-height:\s*([^;]+)/.exec(mainRules[0].body)?.[1]?.trim();
    expect(floor, ".app__main must declare the height the map row is guaranteed").toBeDefined();
    expect(floor).toMatch(/\bmin\(/);
    expect(floor).toMatch(/\d+vh/);
  });

  it("caps the bands above the map, so a tall screen does not spend itself on chrome", () => {
    const cap = /max-height:\s*([^;]+)/.exec(chromeRules[0].body)?.[1]?.trim();
    expect(cap, ".app__chrome must declare a ceiling").toBeDefined();
    expect(cap).toMatch(/\d+vh/);
  });
});

describe("the two columns are still the pair the B01 campaign measured", () => {
  it("declares the grid once, with the same track pair", () => {
    expect(mainRules).toHaveLength(1);
    expect(mainRules[0].body).toMatch(/display:\s*grid/);
    expect(mainRules[0].body).toMatch(
      /grid-template-columns:\s*minmax\(\s*0\s*,\s*1fr\s*\)\s+minmax\(\s*280px\s*,\s*360px\s*\)/,
    );
  });

  it("keeps the map track's zero floor, which is why nothing scrolls sideways at 960px", () => {
    // `minmax(0, 1fr)`: the map yields its width, the panel keeps its declared one. Both
    // campaigns measure 0 px of horizontal overflow at every size and state because of
    // this track, so a slice that replaces the `0` must re-measure.
    const track = /grid-template-columns:\s*minmax\(\s*(\S+?)\s*,\s*1fr\s*\)/.exec(mainRules[0].body);
    expect(track?.[1]).toBe("0");
  });
});

describe("one code path for every window size", () => {
  it("has no width, height or orientation media query", () => {
    // B01 measured three sizes and B02 re-measured the same three. The chrome adapts
    // through `vh` floors and `min()` ceilings, not through breakpoints, so the three
    // sizes still share one set of rules and one campaign still describes all of them.
    const queries = [...mapCss.matchAll(/@media([^{]*)\{/g)].map((match) => match[1].trim());
    expect(queries.length).toBeGreaterThan(0);
    for (const query of queries) {
      expect(query, query).not.toMatch(/\b(min|max)-(width|height)\b|\borientation\b/);
    }
  });

  it("still declares the two preference queries both campaigns exercised", () => {
    const queries = [...mapCss.matchAll(/@media([^{]*)\{/g)].map((match) => match[1].trim());
    expect(queries).toContain("(prefers-color-scheme: dark)");
    expect(queries).toContain("(prefers-reduced-motion: reduce)");
  });

  it("keeps the compact density out of the map's own geometry", () => {
    // `DEC-0051` H: compact tightens the application's chrome and never the map. The new
    // bands inherit their gap from `.app`, so the compact override still reaches them
    // without naming them — and still names nothing inside `.map-view`.
    const compact = all.filter((rule) => rule.selector.includes('[data-density="compact"]'));
    expect(compact.length).toBeGreaterThan(0);
    for (const rule of compact) {
      expect(rule.selector, rule.selector).not.toMatch(/\.map-view|\.app__map\b|\.map-node|svg/);
    }
    expect(chromeRules[0].body, "the bands follow .app's gap, compact density included")
      .toMatch(/gap:\s*inherit/);
  });
});
