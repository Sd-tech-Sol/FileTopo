import { describe, expect, it } from "vitest";
import mapCss from "./map.css?raw";
import appSource from "./MapApp.tsx?raw";
import { strings } from "./mapStrings";

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
 *
 * `TASK-0060` / Stage B B03 adds a second half, below: the primary/advanced organisation.
 * Its campaign is
 *
 *   before  `docs/performance/runs/TASK-0060-primary-chrome-before.json`
 *   after   `docs/performance/runs/TASK-0060-primary-chrome-after.json`
 *
 * and the same warning applies twice over here, because **jsdom does not implement a
 * closed `<details>`**: it gives the children of a closed group a box, a computed
 * `display`, a place in the accessibility tree and a reachable `fireEvent` target. That is
 * why the whole existing suite went on passing unchanged when the groups were introduced —
 * which is useful (no semantic coverage was lost) and proves nothing about the disclosure.
 * The assertions below are therefore about the SHAPE of the organisation: which commands
 * are inside a group and which are not, that the groups are native and stateless, and that
 * both languages name them. What a closed group does on screen is measured in WebView2 and
 * nowhere else.
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

  it("gives the disclosure groups no media query of their own either", () => {
    // `TASK-0060` adds presentation, not breakpoints: the same three groups exist at 960
    // and at 1366, which is why one eighteen-state campaign describes all of them.
    const groupRules = all.filter((rule) => rule.selector.includes(".app__group"));
    expect(groupRules.length).toBeGreaterThan(0);
    const insideAMediaBlock = [...mapCss.matchAll(/@media([^{]*)\{([\s\S]*?)\n\}/g)].filter((match) =>
      match[2].includes(".app__group"),
    );
    for (const match of insideAMediaBlock) {
      expect(match[1].trim(), match[1]).not.toMatch(/\b(min|max)-(width|height)\b|\borientation\b/);
    }
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

/*
 * `TASK-0060` / Stage B B03 — the primary/advanced organisation of the two bands.
 *
 * `B02-O1`, measured: at 960x640 the chrome band showed 176 CSS px of 723 and the map's
 * own band 134 of 625, so of the thirteen commands `TASK-0060` names as usual, only seven
 * were really on the opening screen at worst, and the three lifecycle actions — add a
 * folder, open, refresh — were below a fold in **18 of 18** states, at all three sizes
 * (`docs/performance/runs/TASK-0060-primary-chrome-before.json`).
 *
 * The answer is three named native `<details>` groups. These assertions are the shape of
 * that answer, each falsifiable by moving one command across one boundary.
 */

/** The opening tag of one named group, and everything up to its own `</details>`. The three
 *  groups are siblings, never nested, so the first `</details>` after the opening tag is the
 *  right one — and a nested group would break this helper loudly rather than quietly. */
function groupBlock(testid: string): string {
  const opening = `<details className="app__group" data-testid="${testid}">`;
  const start = appSource.indexOf(opening);
  expect(start, `the group ${testid} must exist, written exactly as the campaign measured it`)
    .toBeGreaterThan(-1);
  const end = appSource.indexOf("</details>", start);
  expect(end).toBeGreaterThan(start);
  return appSource.slice(start, end);
}

const GROUPS = ["chrome-advanced-tools", "chrome-diagnostics", "map-advanced-tools"] as const;

/** Every command that must stay OUT of every group: the usual ones, by `data-testid`. The
 *  campaign checks the same list by hit test in the real engine; this is the cheap half. */
const PRIMARY_TESTIDS = [
  "brain-add-real-root",
  "lifecycle-open",
  "lifecycle-refresh",
  "search-panel",
  "search-input",
  "search-clear",
  "fit-composition",
  "reset-view",
  "map-legend-toggle",
] as const;

/** Every command that must stay IN the group named beside it. Nothing was deleted: each one
 *  of these was on the first level in B02 and is now one summary away. */
const ADVANCED_TESTIDS: [string, (typeof GROUPS)[number]][] = [
  ["lifecycle-prepare", "chrome-advanced-tools"],
  ["lifecycle-rebuild", "chrome-advanced-tools"],
  ["cross-check", "chrome-advanced-tools"],
  ["report-brain", "chrome-diagnostics"],
  ["composed-total", "chrome-diagnostics"],
  ["layout-algorithm", "chrome-diagnostics"],
  ["cross-store-path", "chrome-diagnostics"],
  ["observe-content", "map-advanced-tools"],
  ["content-report", "map-advanced-tools"],
  ["projection-controls", "map-advanced-tools"],
  ["expand-aggregate", "map-advanced-tools"],
];

describe("the advanced tools are grouped, named, and native", () => {
  it("declares exactly the three groups the campaign measured, in the order it measured them", () => {
    const declared = [...appSource.matchAll(/<details className="app__group" data-testid="([^"]+)">/g)].map(
      (match) => match[1],
    );
    expect(declared).toEqual([...GROUPS]);
  });

  for (const testid of GROUPS) {
    it(`${testid} is a native, stateless disclosure with its own summary`, () => {
      const block = groupBlock(testid);
      // A `<summary>` is what puts the group in the keyboard order and gives it a name; no
      // `role`, no `tabIndex`, no `onClick` is needed or wanted, and `open` as a React prop
      // would turn a browser behaviour into application state — which `TASK-0060` forbids.
      expect(block).toContain("<summary>");
      expect(block.slice(0, block.indexOf("<summary>")), "no open= prop on the group itself")
        .not.toMatch(/\bopen=/);
      const summary = block.slice(block.indexOf("<summary>"), block.indexOf("</summary>"));
      expect(summary).not.toMatch(/onClick|role=|tabIndex|aria-expanded/);
      expect(block).toContain('<div className="app__group-body">');
    });
  }

  it("adds no state and no persistence for whether a group is open", () => {
    // The engine owns `open`. Nothing reads it, writes it, stores it or resumes it: that is
    // the whole reason a native element was chosen, and `P-19` in the artifact says the
    // restart therefore finds every group closed, deliberately.
    expect(appSource).not.toMatch(/groupOpen|setGroupOpen|advancedOpen|setAdvancedOpen|diagnosticsOpen/);
    // No `<details>` anywhere in the shell is driven by a prop: a controlled `open` is the
    // application state this slice is not allowed to add.
    for (const tag of appSource.match(/<details[^>]*>/g) ?? []) {
      expect(tag, tag).not.toMatch(/\bopen[=\s>]/);
    }
    for (const testid of GROUPS) {
      expect(appSource).not.toContain(`"${testid}-open"`);
    }
  });

  it("names every group in both languages, with a hint of what it holds", () => {
    for (const key of ["advancedTools", "diagnostics", "mapAdvanced"] as const) {
      const fr = strings.fr.groups[key];
      const en = strings.en.groups[key];
      const frHint = strings.fr.groups[`${key}Hint` as keyof typeof strings.fr.groups];
      const enHint = strings.en.groups[`${key}Hint` as keyof typeof strings.en.groups];
      for (const value of [fr, en, frHint, enHint]) {
        expect(value.trim().length, `${key} must be written in both languages`).toBeGreaterThan(0);
      }
      // A label that reads the same in both languages is a label nobody translated — the
      // same rule `localeCompleteness.test.tsx` applies to every other dictionary.
      expect(fr).not.toBe(en);
      expect(frHint).not.toBe(enHint);
    }
  });

  it("renders each summary from the dictionary, never from a literal", () => {
    const summaries = [...appSource.matchAll(/<summary>([\s\S]*?)<\/summary>/g)].map((match) => match[1]);
    expect(summaries).toHaveLength(GROUPS.length);
    for (const summary of summaries) {
      expect(summary).toMatch(/\{t\.groups\.\w+\}/);
      expect(summary).toMatch(/className="app__group-hint"/);
      // Strip the JSX expressions and the tags: what is left is the literal text of the
      // row, and a group label written in one language only would show up here as letters.
      const literalText = summary.replace(/\{[^{}]*\}/g, "").replace(/<[^>]*>/g, "");
      expect(literalText, "a summary must hold no word that is not in the dictionary")
        .not.toMatch(/[A-Za-zÀ-ÿ]/);
    }
  });
});

describe("what is usual stays in the open, what is occasional is one summary away", () => {
  for (const testid of PRIMARY_TESTIDS) {
    it(`${testid} is outside every group`, () => {
      const needle = `data-testid="${testid}"`;
      expect(appSource, `${testid} must still exist`).toContain(needle);
      for (const group of GROUPS) {
        expect(groupBlock(group), `${testid} must not be inside ${group}`).not.toContain(needle);
      }
    });
  }

  for (const [testid, group] of ADVANCED_TESTIDS) {
    it(`${testid} is inside ${group}, present and not deleted`, () => {
      expect(groupBlock(group)).toContain(`data-testid="${testid}"`);
    });
  }

  it("keeps the panels B02 inventoried, each in the band that owns it", () => {
    // The components have no `data-testid` of their own at this level, so they are checked
    // by name: none of them was removed, and each is inside the group that names it.
    expect(groupBlock("chrome-advanced-tools")).toContain("<BrainIdentityEditor");
    expect(groupBlock("chrome-advanced-tools")).toContain("<ExclusionsPanel");
    expect(groupBlock("chrome-diagnostics")).toContain('className="app__host"');
    expect(groupBlock("chrome-diagnostics")).toContain('className="app__sources"');
    expect(groupBlock("map-advanced-tools")).toContain("<FilterPanel");
    expect(groupBlock("map-advanced-tools")).toContain("<BranchFocusPanel");
    // And the composition itself is NOT in a group: it is how one reads which brain is
    // active, which `TASK-0060` names first among the usual things.
    for (const group of GROUPS) {
      expect(groupBlock(group)).not.toContain("<CompositionBar");
    }
  });

  it("leaves the status line and the corrections notice in the open", () => {
    // Both speak about something that just happened; a disclosure would be a way of not
    // saying it. They sit between the two chrome groups, outside either.
    for (const group of GROUPS) {
      expect(groupBlock(group)).not.toContain('className="app__status"');
      expect(groupBlock(group)).not.toContain("<WorkspaceCorrections");
    }
  });

  it("leaves the map, the right panel and the keyboard hint outside every group", () => {
    for (const group of GROUPS) {
      const block = groupBlock(group);
      expect(block).not.toContain("<MapView");
      expect(block).not.toContain('className="app__aside"');
      expect(block).not.toContain('className="toolbar__hint"');
    }
  });
});

describe("a group costs one row and hides nothing by stylesheet", () => {
  const groupRules = all.filter((rule) => rule.selector.startsWith(".app__group"));
  const summaryRule = all.filter((rule) => rule.selector === ".app__group > summary");
  const bodyRule = all.filter((rule) => rule.selector === ".app__group-body");

  it("styles the summary as the control it is", () => {
    expect(summaryRule).toHaveLength(1);
    expect(summaryRule[0].body).toMatch(/cursor:\s*pointer/);
    // WebView2 draws its own marker through a pseudo-element; the group supplies the
    // triangle as text instead, so it inherits the ink colour in both schemes.
    expect(summaryRule[0].body).toMatch(/list-style:\s*none/);
    expect(all.some((rule) => rule.selector.includes("::-webkit-details-marker"))).toBe(true);
  });

  it("never hides a command with the stylesheet: the engine owns that, not the CSS", () => {
    // A `display: none` or a `visibility: hidden` written here would take a command out of
    // the DOM's reach even when the group is OPEN, which is exactly the loss of a command
    // `TASK-0060` forbids. Only the marker pseudo-element may be hidden.
    for (const rule of groupRules.concat(bodyRule)) {
      if (rule.selector.includes("::-webkit-details-marker")) continue;
      expect(rule.body, rule.selector).not.toMatch(/display:\s*none|visibility:\s*hidden/);
      expect(rule.body, rule.selector).not.toMatch(/max-height|position:\s*(fixed|absolute)/);
    }
  });

  it("spaces an opened group exactly like the band it sits in", () => {
    expect(bodyRule).toHaveLength(1);
    expect(bodyRule[0].body).toMatch(/display:\s*flex/);
    expect(bodyRule[0].body).toMatch(/flex-direction:\s*column/);
    expect(bodyRule[0].body).toMatch(/gap:\s*10px/);
  });
});
