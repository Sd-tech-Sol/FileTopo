import { describe, expect, it } from "vitest";
import mapCss from "./map.css?raw";
import appSource from "./MapApp.tsx?raw";
import compositionSource from "./CompositionBar.tsx?raw";
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
    // saying it. They sit after the groups row, outside every group (`ACTION-0111`).
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

/*
 * `ACTION-0111` / `B03-O1` — the first row of the window, and the entry points of the groups.
 *
 * The independent review of `TASK-0060` measured, at 960x640 in comfortable density, that
 * `brain-add-real-root`, `lifecycle-open` and `lifecycle-refresh` showed 20 px of their 35,
 * and that the two chrome summaries sat 25 and 70 px below the band's fold: aimable by a
 * test point, not whole, and not discoverable without scrolling the band. The correction is
 * an ORGANISATION of the same elements — one header row, the composition and its three
 * actions on one row, the two chrome groups side by side — and these assertions are its
 * shape, each falsifiable by undoing one piece. They are tripwires. The proof that every
 * usual command is whole and every group entry point is on the opening screen is the
 * eighteen-state WebView2 campaign (`primaryContractSatisfiedWhole`,
 * `worstPrimaryFullyVisible = 13`, `groupEntryPointsWholeEveryState`): jsdom lays nothing
 * out, so nothing below can say how many pixels anything has.
 */

/** The text between an opening marker and the first following closing marker. */
function between(source: string, opening: string, closing: string): string {
  const start = source.indexOf(opening);
  expect(start, `${opening} must exist`).toBeGreaterThan(-1);
  const end = source.indexOf(closing, start);
  expect(end, `${closing} must follow ${opening}`).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("the header is one row", () => {
  const headerRules = ruleFor(".app__header");
  const header = between(appSource, '<header className="app__header">', "</header>");

  it("lays the title, the language and the two preferences out on one centred row", () => {
    expect(headerRules).toHaveLength(1);
    expect(headerRules[0].body).toMatch(/display:\s*flex/);
    expect(headerRules[0].body).toMatch(/align-items:\s*center/);
    // `wrap` stays: a window narrower than any measured one stacks them rather than overflow.
    expect(headerRules[0].body).toMatch(/flex-wrap:\s*wrap/);
    // `space-between` would strand the language switch in the middle of the row.
    expect(headerRules[0].body).not.toMatch(/justify-content:\s*space-between/);
    expect(header).toContain('className="app__titles"');
    expect(header).toContain('data-testid="language-switch"');
    expect(header).toContain("<WorkspacePreferences");
  });

  it("keeps the slice caption, now at the head of the diagnostics group it describes", () => {
    expect(header, "the caption no longer takes a line of the header").not.toContain("app__subtitle");
    expect(groupBlock("chrome-diagnostics")).toContain('<p className="app__subtitle">{t.subtitle}</p>');
    for (const locale of ["fr", "en"] as const) {
      expect(strings[locale].subtitle.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("the composition and its three actions share one row", () => {
  const nav = between(appSource, '<nav className="app__brains"', "</nav>");

  it("keeps the composition, then the three lifecycle actions, in the open", () => {
    expect(nav).toContain("<CompositionBar");
    for (const testid of ["brain-add-real-root", "lifecycle-open", "lifecycle-refresh"]) {
      expect(nav).toContain(`data-testid="${testid}"`);
    }
    expect(ruleFor(".app__brains")[0].body).toMatch(/flex-wrap:\s*wrap/);
  });

  it("no longer writes the source reference inside every chip, and says where it went instead", () => {
    // `showSource` put a 36-character developer diagnostic beside each brain name: 290 px on
    // one chip, which is what pushed the three actions onto a second row under the fold.
    expect(nav).not.toMatch(/\bshowSource\b/);
    const diagnostics = groupBlock("chrome-diagnostics");
    expect(diagnostics, "the same information, in full, among the diagnostics").toContain(
      'data-testid="brain-sources"',
    );
    expect(diagnostics).toContain("brain.sourceRef");
    expect(diagnostics).toContain("t.compositionSource");
    for (const locale of ["fr", "en"] as const) {
      expect(strings[locale].groups.brainSources.trim().length).toBeGreaterThan(0);
    }
    expect(strings.fr.groups.brainSources).not.toBe(strings.en.groups.brainSources);
  });
});

describe("the two chrome groups sit side by side, and a group that is opened takes the row", () => {
  const beforeTheMap = appSource.slice(
    appSource.indexOf('<div className="app__groups">'),
    appSource.indexOf('<main className="app__main">'),
  );

  it("wraps exactly the two chrome groups, never the map's", () => {
    expect(beforeTheMap.length).toBeGreaterThan(0);
    const declared = [...beforeTheMap.matchAll(/<details className="app__group" data-testid="([^"]+)">/g)].map(
      (match) => match[1],
    );
    // The map group is declared later, inside `.app__main`.
    expect(declared).toEqual(["chrome-advanced-tools", "chrome-diagnostics"]);
  });

  it("is a wrapping flex row whose children share it, and an open child takes all of it", () => {
    const row = ruleFor(".app__groups");
    expect(row).toHaveLength(1);
    expect(row[0].body).toMatch(/display:\s*flex/);
    expect(row[0].body).toMatch(/flex-wrap:\s*wrap/);
    const child = ruleFor(".app__groups > .app__group");
    expect(child).toHaveLength(1);
    expect(child[0].body).toMatch(/flex:\s*1\s+1\s+\d+px/);
    expect(child[0].body).toMatch(/min-width:\s*0/);
    const opened = ruleFor(".app__groups > .app__group[open]");
    expect(opened).toHaveLength(1);
    expect(opened[0].body).toMatch(/flex-basis:\s*100%/);
  });

  it("leaves the status line and the corrections notice outside every group, after the row", () => {
    // They speak about something that just happened; a disclosure would be a way of not
    // saying it. They now follow the groups row instead of sitting between its two groups.
    const lastGroupEnd = beforeTheMap.lastIndexOf("</details>");
    expect(lastGroupEnd).toBeGreaterThan(-1);
    expect(beforeTheMap.indexOf('className="app__status"')).toBeGreaterThan(lastGroupEnd);
    expect(beforeTheMap.indexOf("<WorkspaceCorrections")).toBeGreaterThan(lastGroupEnd);
  });
});

describe("nothing on the first rows is clipped to make them fit — but one name", () => {
  // The WebView2 harness keeps the B01 tripwire that calls any element whose content is
  // wider than its box a sideways scroller. An ellipsis on a summary or a chip would pass a
  // visibility check by clipping what a person reads — which is what was tried first, and
  // what the B03 campaign refused. A hint that does not fit wraps under its label instead.
  //
  // `TASK-0061` / B04 lifts that for exactly ONE element, because with three brains of 60 and
  // 75 characters no wrapping fits the chrome band (a chip that wraps makes its row taller, and
  // the band has 51 px of margin): a chip's brain NAME. The exemption is narrow, and what makes
  // it acceptable is asserted below rather than assumed — the full name stays in the button's
  // accessible name and `title`, and the word that marks the active brain never shrinks.
  const ELLIPSIS_ALLOWED = new Set([".composition__name", ".composition__hint"]);
  const firstRows = all.filter((rule) =>
    /^\.app__(header|titles|title|group|groups|brains|actions|language|preferences?)|^\.composition/.test(
      rule.selector,
    ),
  );

  it("declares no text-overflow, no overflow clip and no forced single line on them, but the chip name", () => {
    expect(firstRows.length).toBeGreaterThan(10);
    for (const rule of firstRows) {
      if (ELLIPSIS_ALLOWED.has(rule.selector)) continue;
      expect(rule.body, rule.selector).not.toMatch(/text-overflow/);
      expect(rule.body, rule.selector).not.toMatch(/overflow(-x)?:\s*(hidden|clip)/);
    }
    const summary = ruleFor(".app__group > summary")[0];
    expect(summary.body).not.toMatch(/white-space:\s*nowrap/);
    expect(summary.body, "a hint wraps under its label when it does not fit").toMatch(/flex-wrap:\s*wrap/);
  });

  it("shortens the chip name with an ellipsis, and nothing else on the bar", () => {
    const name = ruleFor(".composition__name");
    expect(name).toHaveLength(1);
    expect(name[0].body).toMatch(/text-overflow:\s*ellipsis/);
    expect(name[0].body).toMatch(/white-space:\s*nowrap/);
    expect(name[0].body, "it must be allowed to shrink below its text").toMatch(/min-width:\s*0/);
    const withEllipsis = firstRows.filter((rule) => /text-overflow/.test(rule.body)).map((rule) => rule.selector);
    expect(withEllipsis).toEqual([".composition__name"]);
  });

  it("keeps the full name readable: accessible name, title, and the active word that never shrinks", () => {
    const source = compositionSource;
    // The accessible name of a button is its content: the name span is written whole, never sliced.
    expect(source).toContain("{busy && isFocused ? strings.busy : brain.displayName}");
    expect(source).not.toMatch(/displayName\.(slice|substring|substr)\(/);
    // The shortened name is given in full on the chip and on the menu item.
    expect(source.match(/title=\{brain\.displayName\}/g)?.length).toBe(2);
    // The word that marks the active brain is a fixed-size sibling: the name is what gives way.
    const state = ruleFor(".composition__icon, .composition__swatch, .composition__state");
    expect(state).toHaveLength(1);
    expect(state[0].body).toMatch(/flex:\s*none/);
    expect(source).toContain('aria-current={isFocused ? "true" : undefined}');
  });

  it("hides the hint of a non-active chip from the eye only, never from the DOM", () => {
    const hint = ruleFor(".composition__hint");
    expect(hint).toHaveLength(1);
    expect(hint[0].body).not.toMatch(/display:\s*none|visibility:\s*hidden/);
    expect(compositionSource).toContain('<span className="composition__hint">{strings.focus}</span>');
  });
});

describe("the composition keeps one row of chips, and its menu is a layer, not a list in the flow", () => {
  it("lets a chip shrink and refuses to let it grow past its own text", () => {
    const chip = ruleFor(".composition__chip");
    expect(chip).toHaveLength(1);
    expect(chip[0].body).toMatch(/min-width:\s*0/);
    expect(chip[0].body).toMatch(/max-width:\s*max-content/);
    expect(chip[0].body).toMatch(/flex-wrap:\s*nowrap/);
    const focus = ruleFor(".composition__focus");
    expect(focus[0].body).toMatch(/flex-wrap:\s*nowrap/);
    expect(focus[0].body).toMatch(/min-width:\s*0/);
  });

  it("opens the add menu as a window-anchored layer that the chrome band cannot clip", () => {
    const menu = ruleFor(".composition__menu");
    expect(menu).toHaveLength(1);
    expect(menu[0].body).toMatch(/position:\s*fixed/);
    expect(menu[0].body).toMatch(/overflow-y:\s*auto/);
    expect(menu[0].body).toMatch(/z-index:\s*\d+/);
    // Its box comes from the trigger's own rectangle, in the component.
    expect(compositionSource).toContain("getBoundingClientRect");
    expect(compositionSource).toContain("style={menuBox ?? undefined}");
  });
});

describe("the open menu is modal, and the notices are a layer of the window — TASK-0061 ACTION-0113", () => {
  it("puts a scrim under the open menu and above everything it covers", () => {
    const backdrop = ruleFor(".composition__backdrop")[0];
    const menu = ruleFor(".composition__menu")[0];
    expect(backdrop.body).toMatch(/position:\s*fixed/);
    expect(backdrop.body).toMatch(/inset:\s*0/);
    const level = (body: string) => Number(/z-index:\s*(\d+)/.exec(body)?.[1]);
    expect(level(backdrop.body)).toBeLessThan(level(menu.body));
    // The scrim is drawn, so that the modality is seen and not only announced.
    expect(backdrop.body).toMatch(/background:\s*rgb\(/);
  });

  it("fixes the notices to the window's bottom edge, outside the chrome band, and keeps the pointer for them alone", () => {
    const layer = ruleFor(".app__feedback");
    expect(layer).toHaveLength(1);
    expect(layer[0].body).toMatch(/position:\s*fixed/);
    expect(layer[0].body).toMatch(/bottom:\s*\d+px/);
    expect(layer[0].body).toMatch(/pointer-events:\s*none/);
    // It grows from its own text and scrolls itself — never a pixel taken from the band or the map.
    expect(layer[0].body).toMatch(/max-height:\s*min\(/);
    expect(layer[0].body).toMatch(/overflow-y:\s*auto/);
    const children = ruleFor(".app__feedback > *");
    expect(children).toHaveLength(1);
    expect(children[0].body).toMatch(/pointer-events:\s*auto/);
    const menuLevel = Number(/z-index:\s*(\d+)/.exec(ruleFor(".composition__menu")[0].body)?.[1]);
    expect(Number(/z-index:\s*(\d+)/.exec(layer[0].body)?.[1])).toBeGreaterThan(menuLevel);
  });

  it("renders the layer right after the chrome band and before the map, never inside the band", () => {
    const chromeEnd = appSource.indexOf('<main className="app__main">');
    const layer = appSource.indexOf('className="app__feedback"');
    expect(layer).toBeGreaterThan(-1);
    expect(layer).toBeLessThan(chromeEnd);
    // The band's own closing tag comes before the layer: what precedes it is the groups row.
    const before = appSource.slice(appSource.indexOf('<div className="app__groups">'), layer);
    const opened = (before.match(/<div/g) ?? []).length;
    const closed = (before.match(/<\/div>/g) ?? []).length;
    expect(closed).toBeGreaterThan(opened);
    expect(appSource.slice(layer, chromeEnd)).toContain("<WorkspaceCorrections");
    expect(appSource.slice(layer, chromeEnd)).toContain('data-testid="status-dismiss"');
  });
});

describe("a jsdom test that drives a command inside a group opens the group first", () => {
  // jsdom lets a click through to the child of a CLOSED `<details>`, so such a test passes
  // whether or not the disclosure works. `src/test/disclosure.ts` opens a group the way a
  // person does and refuses to go on if it did not open; this guard is what makes using it
  // compulsory rather than remembered. It reads the test files, not the application, and
  // covers the `data-testid` the files name — a command found only by role or by label is
  // outside what a static guard can see, which is why the WebView2 campaign exists.
  const testFiles = import.meta.glob(["./*.test.ts", "./*.test.tsx"], {
    query: "?raw",
    import: "default",
    eager: true,
  }) as Record<string, string>;

  /** The components that render the commands of each group; their `data-testid` count too. */
  const componentsOf: Record<(typeof GROUPS)[number], string[]> = {
    "chrome-advanced-tools": ["BrainIdentityEditor", "ExclusionsPanel"],
    "chrome-diagnostics": [],
    "map-advanced-tools": ["FilterPanel", "BranchFocusPanel", "ContentObservationsPanel"],
  };
  const componentSources = import.meta.glob("./*.tsx", { query: "?raw", import: "default", eager: true }) as Record<
    string,
    string
  >;

  function testidsOf(group: (typeof GROUPS)[number]): string[] {
    const found = new Set<string>();
    const sources = [
      groupBlock(group),
      ...componentsOf[group].map((name) => componentSources[`./${name}.tsx`] ?? ""),
    ];
    for (const source of sources) {
      for (const match of source.matchAll(/data-testid=\{?[`"]([^`"}$]+)/g)) found.add(match[1]);
    }
    found.delete(group);
    return [...found];
  }

  for (const group of GROUPS) {
    it(`${group}: every MapApp test that drives one of its commands opens the group`, () => {
      const ids = testidsOf(group);
      if (group !== "chrome-diagnostics") {
        expect(ids.length, "the group's commands must be found, or this guard guards nothing").toBeGreaterThan(3);
      }
      const offenders: string[] = [];
      for (const [file, source] of Object.entries(testFiles)) {
        if (file.endsWith("responsiveLayout.test.ts")) continue;
        // Component tests that mount a panel on its own never go through the group.
        if (!/from "\.\/MapApp"/.test(source)) continue;
        for (const id of ids) {
          const drive = new RegExp(`(click|change|keyDown|input|submit)\\([^;]{0,80}["\`]${id}`);
          if (drive.test(source) && !source.includes(`openGroup("${group}")`)) {
            offenders.push(`${file}: ${id}`);
          }
        }
      }
      expect(offenders, "open the group with openGroup() before driving what it holds").toEqual([]);
    });
  }
});
