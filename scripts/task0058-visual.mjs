// TASK-0058 — Stage B / B01: the real WebView2 visual baseline of the chrome.
//
//   node scripts/task0058-visual.mjs <port> <variant> <pass> <proofRoot> <head> <appPid>
//   (seed JSON on stdin)
//
// What this harness is for, and what it refuses to do:
//
// * The falsifiable question of `TASK-0058` is whether the two-column chrome makes
//   content **unreachable** or **horizontally overflowing** at the smallest declared
//   Windows window (960x640) and at 1280x800 / 1366x768. The answer must come from a
//   real Tauri/WebView2 host, so the window is resized **natively** through
//   `scripts/task0058-resize.ps1` — `Emulation.setDeviceMetricsOverride` would measure
//   an emulated viewport and prove nothing about the host.
// * `prefers-color-scheme` and `prefers-reduced-motion` are set with
//   `Emulation.setEmulatedMedia`, always **both at once and explicitly**, so no state
//   silently inherits the workstation's own theme. That is a media-feature override,
//   not a geometry override: the engine evaluates the real media queries of `map.css`.
// * Nothing here changes the product. It reads the DOM the person sees, re-derives from
//   the synthetic directory on disk every count it judges, and reports failures as
//   failures.
//
// Pass 1 walks the matrix (3 sizes x 6 states) and leaves the workspace deliberately
// non-default (English, compact, reduced motion, legend open, details panel hidden).
// Pass 2 is a NEW process over the SAME sandbox and the SAME WebView2 profile: what it
// finds restored is the `P-19` evidence, and it re-measures one size to show the
// restored chrome is still sound.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { setTimeout as pause } from "node:timers/promises";
import { promisify } from "node:util";

const run = promisify(execFile);
const port = Number(process.argv[2]);
const variant = process.argv[3];
const pass = Number(process.argv[4]);
const proofRoot = process.argv[5];
const headTested = process.argv[6];
const appPid = Number(process.argv[7]);
assert(/^task0058-[a-f0-9]+$/.test(variant), "variant");
assert([1, 2].includes(pass), "pass must be 1 or 2");
assert(/^[a-f0-9]{40}$/.test(headTested ?? ""), "HEAD sha (argv[6]) required");
assert(Number.isInteger(appPid) && appPid > 0, "application pid (argv[7]) required");

const seed = JSON.parse(
  (
    await new Promise((resolve, reject) => {
      let text = "";
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", (chunk) => (text += chunk));
      process.stdin.on("end", () => resolve(text));
      process.stdin.on("error", reject);
    })
  ).replace(/^﻿/, ""),
);
const BRAIN = seed.brain;
const ROOT = seed.root;

const axeSource = await readFile("node_modules/axe-core/axe.min.js", "utf8");
const axeManifest = JSON.parse(await readFile("node_modules/axe-core/package.json", "utf8"));

/* --- CDP plumbing ---------------------------------------------------------- */

let target;
for (let attempt = 0; attempt < 400; attempt += 1) {
  try {
    const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    target = pages.find((page) => page.type === "page");
    if (target) break;
  } catch {}
  await pause(100);
}
assert(target, "WebView2 CDP page unavailable");
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve, { once: true });
  ws.addEventListener("error", reject, { once: true });
});
let serial = 0;
const pending = new Map();
const fatal = [];
const wireRequests = new Map();
const wireCalls = [];
ws.addEventListener("message", ({ data }) => {
  const event = JSON.parse(data);
  if (event.method === "Network.requestWillBeSent") {
    const match = /\/(map_[a-z_0-9]+)(?:[?#].*)?$/.exec(event.params.request.url);
    if (match && /ipc/.test(event.params.request.url) && event.params.request.method === "POST") {
      wireRequests.set(event.params.requestId, match[1]);
    }
  } else if (event.method === "Network.loadingFinished" && wireRequests.has(event.params.requestId)) {
    wireCalls.push(wireRequests.get(event.params.requestId));
    wireRequests.delete(event.params.requestId);
  }
  if (event.id) {
    const promise = pending.get(event.id);
    pending.delete(event.id);
    if (event.error) promise?.reject(new Error(JSON.stringify(event.error)));
    else promise?.resolve(event.result);
  } else if (
    event.method === "Runtime.exceptionThrown" ||
    (event.method === "Log.entryAdded" && event.params.entry.level === "error")
  ) {
    fatal.push(event);
  }
});
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++serial;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
async function evaluate(expression) {
  const answer = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (answer.exceptionDetails) {
    throw new Error(answer.exceptionDetails.exception?.description ?? JSON.stringify(answer.exceptionDetails));
  }
  return answer.result.value;
}
async function until(expression, limit = 180000) {
  const started = Date.now();
  while (Date.now() - started < limit) {
    if (await evaluate(expression)) return;
    await pause(140);
  }
  throw new Error(`timeout: ${expression}`);
}
const invoke = async (command, args = {}) =>
  evaluate(`window.__TAURI_INTERNALS__.invoke(${JSON.stringify(command)},${JSON.stringify(args)})`);
await send("Runtime.enable");
await send("Log.enable");
await send("Page.enable");
await send("Network.enable", { maxTotalBufferSize: 32 * 1024 * 1024, maxResourceBufferSize: 8 * 1024 * 1024 });
const testid = (id) => `[data-testid="${id}"]`;

async function center(selector) {
  return evaluate(`(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return null;
    element.scrollIntoView({ block: 'center', inline: 'center' });
    const box = element.getBoundingClientRect();
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    const top = document.elementFromPoint(x, y);
    return { x, y, w: box.width, h: box.height, hit: !!top && (top === element || top.contains(element) || element.contains(top)) };
  })()`);
}
async function click(selector) {
  const box = await center(selector);
  assert(box && box.w > 0 && box.h > 0 && box.hit, `not clickable: ${selector} ${JSON.stringify(box)}`);
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: box.x, y: box.y });
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: box.x, y: box.y, button: "left", buttons: 1, clickCount: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: box.x, y: box.y, button: "left", buttons: 0, clickCount: 1 });
  await pause(220);
}
const KEYS = {
  Tab: { code: "Tab", vk: 9 },
  Enter: { code: "Enter", vk: 13, text: "\r" },
  Home: { code: "Home", vk: 36 },
  "+": { code: "Equal", vk: 187, text: "+" },
  "-": { code: "Minus", vk: 189, text: "-" },
};
async function press(key, modifiers = 0) {
  const spec = KEYS[key];
  assert(spec, `unknown key ${key}`);
  const shape = { key, code: spec.code, windowsVirtualKeyCode: spec.vk, nativeVirtualKeyCode: spec.vk, modifiers };
  await send("Input.dispatchKeyEvent", {
    type: "keyDown", ...shape, ...(spec.text ? { text: spec.text, unmodifiedText: spec.text } : {}),
  });
  await send("Input.dispatchKeyEvent", { type: "keyUp", ...shape });
  await pause(140);
}
async function quiet(milliseconds = 800, limit = 90000) {
  const started = Date.now();
  let count = wireCalls.length;
  let since = Date.now();
  while (Date.now() - started < limit) {
    await pause(120);
    if (wireCalls.length !== count) {
      count = wireCalls.length;
      since = Date.now();
    } else if (Date.now() - since >= milliseconds) return;
  }
  throw new Error("page did not become quiet");
}
async function axeRun() {
  if (!(await evaluate("typeof window.axe === 'object'"))) await evaluate(axeSource);
  return evaluate(`(async () => {
    const result = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa'] } });
    return {
      violations: result.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, target: v.nodes[0]?.target ?? null })),
      incomplete: result.incomplete.map(v => ({ id: v.id, nodes: v.nodes.length })),
      passes: result.passes.length,
    };
  })()`);
}

/* --- the host window, for real --------------------------------------------------- */

/** Resizes the real window so its client area is exactly `width` x `height` CSS px,
 *  then checks the engine agrees. Returns what Windows granted. */
async function resizeTo(width, height) {
  const dpr = await evaluate("devicePixelRatio");
  let granted = null;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const { stdout } = await run(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "scripts/task0058-resize.ps1",
        "-ProcessId", String(appPid),
        "-ClientWidth", String(Math.round(width * dpr)),
        "-ClientHeight", String(Math.round(height * dpr))],
      { windowsHide: true },
    );
    granted = JSON.parse(stdout.trim());
    await pause(400);
    const inner = await evaluate("[innerWidth, innerHeight]");
    if (inner[0] === width && inner[1] === height) {
      return { ...granted, cssViewport: inner, devicePixelRatio: dpr, attempts: attempt + 1 };
    }
  }
  const inner = await evaluate("[innerWidth, innerHeight]");
  throw new Error(
    `the host refused ${width}x${height}: CSS viewport is ${JSON.stringify(inner)}, Windows granted ${JSON.stringify(granted)}`,
  );
}

/** Both media features, always together and always explicit: no state inherits the
 *  workstation's own theme or motion preference. */
const emulate = (scheme, motion) =>
  send("Emulation.setEmulatedMedia", {
    features: [
      { name: "prefers-color-scheme", value: scheme },
      { name: "prefers-reduced-motion", value: motion },
    ],
  });

/* --- independent reference: the synthetic directory on disk ------------------------ */

async function walkDisk(root) {
  const entries = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      entries.push(relative(root, path).replaceAll("\\", "/"));
      if (entry.isDirectory()) await visit(path);
    }
  }
  await visit(root);
  return entries.sort();
}
async function hashTree(root) {
  const lines = [];
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((l, r) => l.name.localeCompare(r.name));
    for (const entry of entries) {
      const path = join(directory, entry.name);
      const rel = relative(root, path).replaceAll("\\", "/");
      if (entry.isDirectory()) {
        lines.push(`D:${rel}`);
        await visit(path);
      } else {
        const info = await stat(path);
        lines.push(`F:${rel}:${info.size}:${createHash("sha256").update(await readFile(path)).digest("hex")}`);
      }
    }
  }
  await visit(root);
  return createHash("sha256").update(lines.join("\n")).digest("hex");
}
const sha = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

/* --- the layout reading: one state, one verdict ------------------------------------ */

// Everything the acceptance criteria of `TASK-0058` ask about, read off the live DOM in
// one evaluation so nothing can drift between two reads of the same state.
const READ_LAYOUT = `(() => {
  const html = document.documentElement;
  // Every box below is read from the top of the document, so two states are comparable
  // and "below the fold" means what it says. A previous Tab walk may have scrolled.
  window.scrollTo(0, 0);
  const round = (n) => Math.round(n * 10) / 10;
  const box = (selector) => {
    const el = document.querySelector(selector);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      x: round(r.x), y: round(r.y), w: round(r.width), h: round(r.height),
      right: round(r.right), bottom: round(r.bottom),
      documentTop: round(r.y + window.scrollY),
      scrollWidth: el.scrollWidth, clientWidth: el.clientWidth,
      scrollHeight: el.scrollHeight, clientHeight: el.clientHeight,
    };
  };
  const viewportWidth = html.clientWidth;

  // 1. Horizontal overflow, the blocking kind: the document itself scrolls sideways.
  const documentOverflowX = Math.max(0, html.scrollWidth - html.clientWidth);

  // 2. Any descendant of the chrome that has to scroll sideways to show its content,
  //    and any descendant that escapes the viewport's right edge.
  const scrollers = [];
  const escapers = [];
  const clipped = [];
  for (const el of document.querySelectorAll('.app, .app *')) {
    if (el.closest('svg')) continue; // the map's own SVG geometry is not the chrome
    const over = el.scrollWidth - el.clientWidth;
    const style = getComputedStyle(el);
    if (over > 1 && style.overflowX !== 'auto' && style.overflowX !== 'scroll') {
      scrollers.push({ tag: el.tagName, cls: String(el.className).slice(0, 70), overflowPx: over });
    }
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.right > viewportWidth + 1) {
      escapers.push({ tag: el.tagName, cls: String(el.className).slice(0, 70), right: round(r.right), limit: viewportWidth });
    }
    if (r.left < -1 && r.width > 0) {
      escapers.push({ tag: el.tagName, cls: String(el.className).slice(0, 70), left: round(r.left), limit: 0 });
    }
  }

  // 3. No product command lost: every control of the chrome, its identity, and whether
  //    its own label is clipped by its own box.
  const controls = [...document.querySelectorAll('.app button, .app input, .app select, .app [role="button"]')]
    .filter((el) => !el.closest('svg'));
  const controlIds = controls
    .map((el) => el.getAttribute('data-testid') ?? (el.getAttribute('aria-label') || (el.textContent ?? '').trim()).slice(0, 40))
    .filter(Boolean)
    .sort();
  for (const el of controls) {
    if (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) {
      clipped.push({
        id: el.getAttribute('data-testid') ?? (el.textContent ?? '').trim().slice(0, 40),
        scrollWidth: el.scrollWidth, clientWidth: el.clientWidth,
        scrollHeight: el.scrollHeight, clientHeight: el.clientHeight,
      });
    }
  }

  // 4. The two columns: do they overlap, and is the panel a covering overlay?
  const mapEl = document.querySelector('.app__map');
  const asideEl = document.querySelector('.app__aside');
  let overlapArea = 0;
  if (mapEl && asideEl) {
    const a = mapEl.getBoundingClientRect(), b = asideEl.getBoundingClientRect();
    overlapArea = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
                  Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  }
  const asidePosition = asideEl ? getComputedStyle(asideEl).position : null;

  return {
    cssViewport: [innerWidth, innerHeight],
    devicePixelRatio,
    layoutViewport: [html.clientWidth, html.clientHeight],
    scrollbarWidthPx: innerWidth - html.clientWidth,
    documentScroll: [html.scrollWidth, html.scrollHeight],
    documentOverflowX,
    verticalScrollPx: Math.max(0, html.scrollHeight - html.clientHeight),
    sidewaysScrollers: scrollers.slice(0, 10),
    viewportEscapers: escapers.slice(0, 10),
    clippedControls: clipped.slice(0, 10),
    controlCount: controls.length,
    controlIdsDigest: controlIds.join('|'),
    columns: {
      main: box('.app__main'),
      map: box('.app__map'),
      aside: box('.app__aside'),
      mapView: box('.map-view'),
      header: box('.app__header'),
      toolbar: box('.toolbar'),
      overlapArea: round(overlapArea),
      asidePosition,
    },
    gridTemplate: mapEl ? getComputedStyle(mapEl.parentElement).gridTemplateColumns : null,
    mediaMatches: {
      dark: matchMedia('(prefers-color-scheme: dark)').matches,
      reduceMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    },
    appliedPreferences: {
      density: document.documentElement.getAttribute('data-density'),
      motion: document.documentElement.getAttribute('data-motion'),
      lang: document.documentElement.getAttribute('lang'),
    },
    // The chrome's own motion, as the engine resolves it for a real control.
    buttonTransition: (() => {
      const button = document.querySelector('.app button');
      return button ? getComputedStyle(button).transitionDuration : null;
    })(),
    drawn: {
      cards: document.querySelectorAll('[data-testid="composed-canvas"] [data-card="true"]').length,
      aggregates: document.querySelectorAll('[data-testid="map-aggregate-indicator"]').length,
      hierarchyEdges: document.querySelectorAll('[data-testid="composed-canvas"] g[data-edge-kind="hierarchy"]').length,
    },
  };
})()`;

/** A real Tab walk from the top of the document until focus lands inside the right
 *  panel: the number of presses, and whether the engine actually paints a focus ring. */
async function tabToAside(limit = 80) {
  // The walk starts from the chrome's first control, never from wherever the previous
  // state's click left focus: Chromium keeps a sequential focus navigation starting
  // point at the last blurred element, so a count taken that way would be a fact about
  // the harness and not about the interface.
  const from = await evaluate(`(() => {
    window.scrollTo(0, 0);
    const first = document.querySelector('.app button, .app input, .app select');
    if (!first) return null;
    first.focus();
    return first.getAttribute('data-testid') ?? (first.textContent ?? '').trim().slice(0, 40);
  })()`);
  for (let presses = 1; presses <= limit; presses += 1) {
    await press("Tab");
    const landed = await evaluate(`(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      if (!el.closest('.app__aside')) return null;
      const style = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        id: el.getAttribute('data-testid') ?? (el.textContent ?? '').trim().slice(0, 40),
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        inViewport: r.top >= -1 && r.bottom <= innerHeight + 1,
        width: Math.round(r.width), height: Math.round(r.height),
      };
    })()`);
    if (landed) return { from, presses, ...landed };
  }
  return { from, presses: null, reached: false };
}

/* --- the matrix ---------------------------------------------------------------------- */

const SIZES = [
  { label: "960x640", width: 960, height: 640 },
  { label: "1280x800", width: 1280, height: 800 },
  { label: "1366x768", width: 1366, height: 768 },
];
// Six states, each exercised at EVERY size, so no size is covered by composition only.
const STATES = [
  { id: "fr-light", locale: "fr", scheme: "light", motion: "no-preference", density: "comfortable", appMotion: "system", legend: false },
  { id: "fr-dark-legend", locale: "fr", scheme: "dark", motion: "no-preference", density: "comfortable", appMotion: "system", legend: true },
  { id: "en-light-legend", locale: "en", scheme: "light", motion: "no-preference", density: "comfortable", appMotion: "system", legend: true },
  { id: "en-dark", locale: "en", scheme: "dark", motion: "no-preference", density: "comfortable", appMotion: "system", legend: false },
  { id: "fr-light-compact-legend", locale: "fr", scheme: "light", motion: "no-preference", density: "compact", appMotion: "system", legend: true },
  { id: "fr-light-reduced-motion", locale: "fr", scheme: "light", motion: "reduce", density: "comfortable", appMotion: "reduce", legend: false },
];
// The states whose capture is published next to the numbers.
const PUBLISHED_CAPTURES = new Set(["960x640/fr-light", "960x640/fr-dark-legend", "1280x800/fr-light", "1366x768/fr-light"]);

async function setLocale(locale) {
  if ((await evaluate(`document.querySelector('[data-testid="language-${locale}"]')?.getAttribute('aria-pressed')`)) !== "true") {
    await click(testid(`language-${locale}`));
    await until(`document.querySelector('[data-testid="language-${locale}"]').getAttribute('aria-pressed') === 'true'`);
  }
}
async function setDensity(density) {
  if ((await evaluate(`document.querySelector('[data-testid="density-${density}"]')?.getAttribute('aria-pressed')`)) !== "true") {
    await click(testid(`density-${density}`));
    await until(`document.querySelector('[data-testid="density-${density}"]').getAttribute('aria-pressed') === 'true'`);
  }
}
async function setMotion(motion) {
  if ((await evaluate(`document.querySelector('[data-testid="motion-${motion}"]')?.getAttribute('aria-pressed')`)) !== "true") {
    await click(testid(`motion-${motion}`));
    await until(`document.querySelector('[data-testid="motion-${motion}"]').getAttribute('aria-pressed') === 'true'`);
  }
}
async function setLegend(open) {
  const expanded = await evaluate(`document.querySelector('[data-testid="map-legend-toggle"]')?.getAttribute('aria-expanded')`);
  if (expanded !== String(open)) {
    await click(testid("map-legend-toggle"));
    await until(`document.querySelector('[data-testid="map-legend-toggle"]').getAttribute('aria-expanded') === '${open}'`);
  }
}

/* --- scenario ----------------------------------------------------------------------- */

const record = { task: "TASK-0058", pass, headTested, checks: [], findings: [] };
const check = (label, value = true) => {
  record.checks.push({ label, value });
  return value;
};
const finding = (severity, id, text, evidence) => {
  record.findings.push({ severity, id, observation: text, evidence });
};
const FORBIDDEN_DURING_MEASUREMENT =
  /^map_(refresh|rebuild|prepare_|reveal_node|copy_node_path|write_run_artifact|brain_exclusions_replace|brain_choose_real_root|brain_save_identity|relation_|suggestion_)/;

await until("!!window.__TAURI_INTERNALS__");
const disk = await walkDisk(ROOT);
const diskHashBefore = await hashTree(ROOT);
const diskTotal = disk.length + 1; // the root itself
const archiveChildren = disk.filter((path) => /^archives\/[^/]+$/.test(path));
assert.equal(archiveChildren.length, 120, "the synthetic fixture is the one this harness judges");

// Index the fixture, then open it. The indexing happens BEFORE the measured window.
await invoke("map_refresh", { brainId: BRAIN });
if (!(await evaluate(`document.querySelectorAll('[data-testid="composed-canvas"] [data-node-id]').length > 0`))) {
  await until(`!!document.querySelector(${JSON.stringify(testid("lifecycle-open"))}) || document.querySelectorAll('[data-testid="composed-canvas"] [data-node-id]').length > 0`);
  if (await evaluate(`!!document.querySelector(${JSON.stringify(testid("lifecycle-open"))})`)) await click(testid("lifecycle-open"));
}
await until(`document.querySelectorAll('[data-testid="composed-canvas"] [data-node-id]').length > 0`);
await quiet();

const view0 = await invoke("map_view", { brainId: BRAIN });
assert.equal(view0.nodeCount, diskTotal, "Index cardinality equals the disk");
record.index = {
  indexed: view0.nodeCount,
  viewBudget: view0.viewBudget,
  materialized: view0.materializedCount,
  aggregates: view0.aggregates.length,
  indexRevision: view0.indexRevision,
};

const mark = wireCalls.length;
const captures = [];
const matrix = [];

if (pass === 1) {
  for (const size of SIZES) {
    const granted = await resizeTo(size.width, size.height);
    for (const state of STATES) {
      await emulate(state.scheme, state.motion);
      await setLocale(state.locale);
      await setDensity(state.density);
      await setMotion(state.appMotion);
      await setLegend(state.legend);
      await quiet();
      await pause(500); // let the ResizeObserver-driven re-render settle

      const layout = await evaluate(READ_LAYOUT);
      assert.deepEqual(layout.cssViewport, [size.width, size.height], `the window drifted during ${size.label}/${state.id}`);
      assert.equal(layout.mediaMatches.dark, state.scheme === "dark", `prefers-color-scheme not applied at ${size.label}/${state.id}`);
      assert.equal(layout.mediaMatches.reduceMotion, state.motion === "reduce", `prefers-reduced-motion not applied at ${size.label}/${state.id}`);

      // The capture is taken here, while the document is still at the top where
      // `READ_LAYOUT` left it: it must show the window this reading describes, which is
      // what the person sees before touching anything. The Tab walk below scrolls.
      const key = `${size.label}/${state.id}`;
      if (PUBLISHED_CAPTURES.has(key)) {
        const shot = await send("Page.captureScreenshot", { format: "png" });
        const bytes = Buffer.from(shot.data, "base64");
        captures.push({
          key,
          file: `TASK-0058-${size.label}-${state.id}.png`,
          bytes: bytes.length,
          sha256: createHash("sha256").update(bytes).digest("hex"),
          scrollYAtCapture: await evaluate("Math.round(window.scrollY)"),
          data: shot.data,
        });
      }

      const keyboard = await tabToAside();
      const axe = await axeRun();

      matrix.push({
        size: size.label,
        state: state.id,
        requested: { ...state },
        hostWindow: granted,
        layout,
        keyboardToAside: keyboard,
        axe: {
          version: axeManifest.version,
          violations: axe.violations,
          incomplete: axe.incomplete,
          passes: axe.passes,
        },
      });
    }
  }
} else {
  // Pass 2 measures one size only: the point of this pass is what a restart restored.
  const granted = await resizeTo(1280, 800);
  await emulate("light", "no-preference");
  await quiet();
  await pause(500);
  const layout = await evaluate(READ_LAYOUT);
  const keyboard = await tabToAside();
  const axe = await axeRun();
  matrix.push({
    size: "1280x800",
    state: "restored",
    requested: { id: "restored" },
    hostWindow: granted,
    layout,
    keyboardToAside: keyboard,
    axe: { version: axeManifest.version, violations: axe.violations, incomplete: axe.incomplete, passes: axe.passes },
  });
  record.restored = {
    locale: await evaluate(`document.querySelector('[data-testid="language-en"]')?.getAttribute('aria-pressed') === 'true' ? 'en' : (document.querySelector('[data-testid="language-fr"]')?.getAttribute('aria-pressed') === 'true' ? 'fr' : null)`),
    density: layout.appliedPreferences.density,
    motion: layout.appliedPreferences.motion,
    legendOpen: await evaluate(`document.querySelector('[data-testid="map-legend-toggle"]')?.getAttribute('aria-expanded') === 'true'`),
    detailsPanelPresent: await evaluate(`!!document.querySelector('.details')`),
  };
}

/* --- the verdict: one sentence per acceptance criterion ------------------------------ */

const worstOverflow = Math.max(...matrix.map((entry) => entry.layout.documentOverflowX));
const escapers = matrix.filter((entry) => entry.layout.viewportEscapers.length > 0);
const scrollers = matrix.filter((entry) => entry.layout.sidewaysScrollers.length > 0);
const clipped = matrix.filter((entry) => entry.layout.clippedControls.length > 0);
const overlapping = matrix.filter((entry) => entry.layout.columns.overlapArea > 0);
const unreachable = matrix.filter((entry) => entry.keyboardToAside.presses === null);
const noFocusRing = matrix.filter(
  (entry) => entry.keyboardToAside.presses !== null &&
    (entry.keyboardToAside.outlineStyle === "none" || parseFloat(entry.keyboardToAside.outlineWidth) < 1),
);
const controlDigests = [...new Set(matrix.map((entry) => `${entry.state}=${entry.layout.controlIdsDigest}`))];
const perStateControls = {};
for (const entry of matrix) {
  perStateControls[entry.state] ??= new Set();
  perStateControls[entry.state].add(entry.layout.controlIdsDigest);
}
const commandsLostAtSomeSize = Object.entries(perStateControls)
  .filter(([, digests]) => digests.size > 1)
  .map(([state]) => state);
const axeViolations = matrix.flatMap((entry) =>
  entry.axe.violations.map((violation) => ({ size: entry.size, state: entry.state, ...violation })),
);
const smallestMapView = matrix
  .map((entry) => ({ size: entry.size, state: entry.state, w: entry.layout.columns.mapView?.w, h: entry.layout.columns.mapView?.h }))
  .sort((l, r) => (l.w ?? 0) * (l.h ?? 0) - (r.w ?? 0) * (r.h ?? 0))[0];

record.verdict = {
  horizontalOverflowWorstPx: worstOverflow,
  statesWithViewportEscapers: escapers.map((entry) => `${entry.size}/${entry.state}`),
  statesWithSidewaysScrollers: scrollers.map((entry) => `${entry.size}/${entry.state}`),
  statesWithClippedControls: clipped.map((entry) => `${entry.size}/${entry.state}`),
  statesWithColumnOverlap: overlapping.map((entry) => `${entry.size}/${entry.state}`),
  statesWherePanelUnreachableByKeyboard: unreachable.map((entry) => `${entry.size}/${entry.state}`),
  statesWithoutVisibleFocusRing: noFocusRing.map((entry) => `${entry.size}/${entry.state}`),
  commandsLostAtSomeSize,
  axeViolations,
  axeIncompleteByState: matrix.map((entry) => ({
    size: entry.size, state: entry.state,
    incomplete: entry.axe.incomplete.map((rule) => `${rule.id}x${rule.nodes}`).sort(),
  })),
  smallestMapView,
  verticalScrollByState: matrix.map((entry) => ({
    size: entry.size, state: entry.state,
    documentHeight: entry.layout.documentScroll[1],
    viewportHeight: entry.layout.layoutViewport[1],
    verticalScrollPx: entry.layout.verticalScrollPx,
    // Measured from the top of the document: how far down the map column starts, and
    // therefore whether it is on screen at all before the person scrolls.
    mapColumnDocumentTop: entry.layout.columns.map?.documentTop ?? null,
    mapColumnAboveTheFold: entry.layout.columns.map
      ? entry.layout.columns.map.documentTop < entry.layout.layoutViewport[1]
      : null,
  })),
};
record.chromeDefectProven =
  worstOverflow > 0 ||
  escapers.length > 0 ||
  scrollers.length > 0 ||
  clipped.length > 0 ||
  overlapping.length > 0 ||
  unreachable.length > 0 ||
  noFocusRing.length > 0 ||
  commandsLostAtSomeSize.length > 0;

check("every size measured on the real host, CSS viewport exactly as asked", {
  sizes: [...new Set(matrix.map((entry) => entry.size))],
  states: [...new Set(matrix.map((entry) => entry.state))],
  granted: [...new Set(matrix.map((entry) => JSON.stringify(entry.hostWindow.grantedClient)))],
});
check("the falsifiable question of TASK-0058", {
  horizontalOverflow: worstOverflow === 0 ? "none at any size or state" : `${worstOverflow}px`,
  contentUnreachable: unreachable.length === 0 ? "no: the panel is reachable by Tab at every size" : "YES",
  chromeDefectProven: record.chromeDefectProven,
});
check("one control set per state, identical at all three sizes", { digests: controlDigests.length, lost: commandsLostAtSomeSize });

// The layout observation that is NOT the question asked, recorded because it is real.
const tallest = record.verdict.verticalScrollByState.slice().sort((l, r) => r.documentHeight - l.documentHeight)[0];
if (tallest && tallest.documentHeight > tallest.viewportHeight * 2) {
  finding(
    "OBSERVATION",
    "B01-O1",
    "The chrome does not bound itself to the window height: `.app__main` is a content-sized grid row, so the right panel never scrolls inside itself and the whole document grows instead. At the smallest window the map starts below the fold. This is VERTICAL scrolling, which TASK-0058 explicitly allows, and the smallest fix would change `.map-view`'s measured height, hence the map's own `viewport` and therefore the camera — outside the write scope of this task. Reported, not repaired.",
    { worst: tallest, mapViewHeights: matrix.map((e) => ({ size: e.size, state: e.state, h: e.layout.columns.mapView?.h })) },
  );
}

/* --- targeted product controls, in their TASK-0058 scope ---------------------------- */

if (pass === 1) {
  await resizeTo(960, 640); // the hardest size is the one the controls run at
  await emulate("light", "no-preference");
  await setLocale("fr");
  await setDensity("comfortable");
  await setMotion("system");
  await quiet();

  // P-02 — the parent and its aggregate: the omitted count is the real one.
  const archivesRef = await invoke("map_resolve_node", { brainId: BRAIN, relativePath: "archives" });
  assert(archivesRef, "the aggregate's parent is indexed");
  const aggregate = await evaluate(`(() => {
    const el = document.querySelector('[data-testid="map-aggregate-indicator"][data-parent-id="${archivesRef.nodeId}"]');
    return el ? { label: el.getAttribute('aria-label'), role: el.getAttribute('role') } : null;
  })()`);
  const shownChildren = [];
  const cardIds = await evaluate(`[...document.querySelectorAll('[data-testid="composed-canvas"] [data-card="true"]')].map((g) => Number(g.getAttribute('data-node-id')))`);
  for (const nodeId of cardIds) {
    const detail = await invoke("map_node_detail", { reference: { brainId: BRAIN, nodeId } });
    const path = detail.node.relativePath.replaceAll("\\", "/");
    if (/^archives\/[^/]+$/.test(path)) shownChildren.push(path);
  }
  const omitted = aggregate ? Number(String(/\+\s*([\d\s  ]+)/.exec(aggregate.label)?.[1] ?? "").replace(/\D/g, "")) : 0;
  assert.equal(shownChildren.length + omitted, archiveChildren.length, "P-02: shown + omitted == the real children on disk");
  check("P-02 parent and aggregate recognised, exact omitted count", {
    parent: "archives", shown: shownChildren.length, omitted, realChildren: archiveChildren.length, role: aggregate?.role ?? null,
  });

  // P-05 — links in view and out of view: the view is bounded, and a row outside the
  // first view is reachable, after which its hierarchy edge is drawn.
  const edgesBefore = (await evaluate(READ_LAYOUT)).drawn;
  const farRef = await invoke("map_resolve_node", { brainId: BRAIN, relativePath: "archives/piece-0119.txt" });
  assert(farRef, "the far row is indexed");
  const farInFirstView = view0.nodes.some((node) => node.id === farRef.nodeId);
  await click("#map-search-input");
  await send("Input.insertText", { text: "piece-0119" });
  await until(`!!document.querySelector('[data-testid="search-hit"]')`);
  await click(`[data-testid="search-hit"][data-node-id="${farRef.nodeId}"]`);
  await until(`!!document.querySelector('[data-testid="composed-canvas"] [data-node-id="${farRef.nodeId}"]')`);
  await quiet();
  const edgesAfter = (await evaluate(READ_LAYOUT)).drawn;
  assert(edgesBefore.hierarchyEdges > 0, "P-05: hierarchy edges are drawn in the first view");
  assert(edgesAfter.cards + edgesAfter.aggregates <= view0.viewBudget, "P-05: the view stays bounded after navigating out of it");
  check("P-05 edges drawn in view, row outside the first view reached, view stays bounded", {
    farRowWasInFirstView: farInFirstView, edgesBefore: edgesBefore.hierarchyEdges, edgesAfter: edgesAfter.hierarchyEdges,
    budget: view0.viewBudget, slotsAfter: edgesAfter.cards + edgesAfter.aggregates,
  });

  // P-07 — selection and its details, at 960x640.
  //
  // At this size the map starts below the fold (see finding `B01-O1`), so the person
  // scrolls the document down to it first. That vertical scroll is what `TASK-0058`
  // explicitly allows, and how far it had to go is published with the check.
  await click(testid("search-clear"));
  await quiet();
  await click(testid("fit-composition"));
  await evaluate(`document.querySelector('[data-testid="composed-canvas"]').scrollIntoView({ block: 'center' })`);
  await pause(400);
  const scrolledToMap = await evaluate(`Math.round(window.scrollY)`);
  const selectable = await evaluate(`(() => {
    const card = [...document.querySelectorAll('[data-testid="composed-canvas"] [data-card="true"]')].find((g) => {
      const b = g.getBoundingClientRect();
      const x = b.x + b.width / 2, y = b.y + b.height / 2;
      if (!(b.width > 4 && x > 0 && y > 0 && x < innerWidth && y < innerHeight)) return false;
      const top = document.elementFromPoint(x, y);
      return !!top && (top === g || g.contains(top));
    });
    return card ? Number(card.getAttribute('data-node-id')) : null;
  })()`);
  assert(
    selectable !== null,
    `P-07: a card is visible and hittable at 960x640 after scrolling ${scrolledToMap}px down to the map`,
  );
  await click(`[data-testid="composed-canvas"] [data-card="true"][data-node-id="${selectable}"]`);
  await until(`document.querySelector('[data-testid="composed-canvas"] [data-card="true"][data-node-id="${selectable}"]')?.getAttribute('aria-selected') === 'true'`);
  await quiet();
  const detail = await invoke("map_node_detail", { reference: { brainId: BRAIN, nodeId: selectable } });
  const panelName = await evaluate(`(document.querySelector('.details__name')?.textContent ?? '').trim()`);
  assert(panelName.length > 0, "P-07: the details panel names the selection");
  assert(
    panelName.includes(detail.node.name) || detail.node.name.includes(panelName),
    `P-07: the panel names the selected node (panel ${JSON.stringify(panelName)}, index ${JSON.stringify(detail.node.name)})`,
  );
  check("P-07 selection at 960x640 and its details panel agree with the Index", {
    nodeId: selectable, panelNameMatchesIndex: true, panelVisible: true,
    verticalScrollNeededToReachTheMapPx: scrolledToMap,
  });

  // P-11 — the real wheel, the same primitive the touchpad produces, and the keyboard.
  const worldBefore = await evaluate(`document.querySelector('[data-testid="composed-world"]')?.getAttribute('transform')`);
  const canvasBox = await center('[data-testid="composed-canvas"]');
  await send("Input.dispatchMouseEvent", {
    type: "mouseWheel", x: canvasBox.x, y: canvasBox.y, deltaX: 0, deltaY: -240, modifiers: 0,
  });
  await pause(400);
  const worldAfterWheel = await evaluate(`document.querySelector('[data-testid="composed-world"]')?.getAttribute('transform')`);
  assert.notEqual(worldAfterWheel, worldBefore, "P-11: the wheel changed the camera");
  await evaluate(`document.querySelector('[role="tree"]').focus()`);
  await press("+");
  const worldAfterKey = await evaluate(`document.querySelector('[data-testid="composed-world"]')?.getAttribute('transform')`);
  assert.notEqual(worldAfterKey, worldAfterWheel, "P-11: the keyboard changed the camera");
  check("P-11 wheel and keyboard zoom at 960x640 (same WheelEvent primitive as a touchpad)", {
    wheelMoved: true, keyboardMoved: true,
  });

  // P-19 — the toggles, then the state this pass deliberately leaves behind.
  const detailsBefore = await evaluate(`!!document.querySelector('.details')`);
  await click(testid("details-panel-toggle"));
  await until(`(!!document.querySelector('.details')) === ${!detailsBefore}`);
  const detailsAfter = await evaluate(`!!document.querySelector('.details')`);
  assert.notEqual(detailsAfter, detailsBefore, "P-19: the panel toggle changes the panel");
  await setLocale("en");
  await setDensity("compact");
  await setMotion("reduce");
  await setLegend(true);
  await quiet();
  const left = await evaluate(`({
    locale: document.querySelector('[data-testid="language-en"]').getAttribute('aria-pressed'),
    density: document.documentElement.getAttribute('data-density'),
    motion: document.documentElement.getAttribute('data-motion'),
    legend: document.querySelector('[data-testid="map-legend-toggle"]').getAttribute('aria-expanded'),
    details: !!document.querySelector('.details'),
  })`);
  record.leftBehind = left;
  check("P-19 panel, language, density and motion toggle; a non-default workspace is left for the restart", left);
}

/* --- nothing outside the contract happened ------------------------------------------ */

const measurementCalls = wireCalls.slice(mark);
assert.deepEqual(
  measurementCalls.filter((name) => FORBIDDEN_DURING_MEASUREMENT.test(name)),
  [],
  `the measurement wrote on the wire: ${JSON.stringify(measurementCalls.filter((name) => FORBIDDEN_DURING_MEASUREMENT.test(name)))}`,
);
const view1 = await invoke("map_view", { brainId: BRAIN });
assert.equal(view1.indexRevision, view0.indexRevision, "the measured window did not touch the Index");
assert.equal(view1.nodeCount, view0.nodeCount, "the Index cardinality did not move");
const diskHashAfter = await hashTree(ROOT);
assert.equal(diskHashAfter, diskHashBefore, "P-22: the analysed directory is byte-identical after the session");
const artefactsUnderRoot = disk.filter((path) => /(^|\/)(\.filetopo|filetopo)|\.sqlite(-wal|-shm)?$/i.test(path));
assert.deepEqual(artefactsUnderRoot, [], "P-22: no FileTopo artefact under the analysed root");
check("P-22 in this scope: source byte-identical, no artefact under the root, no write on the wire", {
  commandsSeen: [...new Set(measurementCalls)].sort(),
  indexRevisionStable: true,
});
assert.equal(fatal.length, 0, `fatal page/console errors: ${JSON.stringify(fatal.slice(0, 2))}`);

record.matrix = matrix;
record.captures = captures.map(({ data, ...rest }) => rest);
record.fatalConsoleErrors = fatal.length;
record.layoutDigest = sha(
  matrix.map((entry) => [
    entry.size, entry.state,
    entry.layout.documentOverflowX,
    entry.layout.columns.map?.w, entry.layout.columns.aside?.w,
    entry.layout.controlIdsDigest,
  ]),
);
await writeFile(join(proofRoot, `run-pass${pass}.json`), JSON.stringify(record, null, 2));
for (const capture of captures) {
  await writeFile(join(proofRoot, capture.file), Buffer.from(capture.data, "base64"));
}
console.log(JSON.stringify({ pass, ok: true, chromeDefectProven: record.chromeDefectProven, digest: record.layoutDigest }));
ws.close();
process.exit(0);
