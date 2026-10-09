// TASK-0059 — Stage B / B02: what the first window actually shows, in the real host.
//
//   node scripts/task0059-first-screen.mjs <port> <variant> <pass> <proofRoot> <head> <appPid> <phase>
//   (seed JSON on stdin)
//
// `B01` proved the chrome has no horizontal defect and reported `B01-O1`: at 960x640 the
// map column starts at 727px, below a 640px window, and the document grows to 4185px.
// `TASK-0059` asks a different, falsifiable question:
//
//   **At `scrollY=0`, is a usable piece of the map — at least 200 CSS px of it — and an
//   identifiable root or context node already on screen, without scrolling the document?**
//
// So this harness is `task0058-visual.mjs` with a different verdict. It keeps every
// tripwire of the baseline (horizontal overflow, escaping boxes, clipped controls, the
// control inventory, keyboard reach of the right panel, axe-core), because a first screen
// bought by losing a command would not be a fix, and it adds:
//
// * the first-screen reading itself: the visible height of `.map-view` and of the SVG, the
//   cards that are really in the viewport AND hit-testable there, and which of them is the
//   root of the brain;
// * the chrome ledger: the box of every band above `<main>`, so the pixels are accounted
//   for rather than guessed;
// * the camera invariants of criterion 3: a world coordinate and the camera scale read
//   across three real window heights, and a navigated target that must still be visible.
//
// It is run twice against the same build procedure — `-Phase before` on the starting HEAD
// and `-Phase after` on the fix — and it publishes the verdict it measures, including a
// failing one. Nothing here changes the product.
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
const phase = process.argv[8];
assert(/^task0059-[a-f0-9]+$/.test(variant), "variant");
assert([1, 2].includes(pass), "pass must be 1 or 2");
assert(/^[a-f0-9]{40}$/.test(headTested ?? ""), "HEAD sha (argv[6]) required");
assert(Number.isInteger(appPid) && appPid > 0, "application pid (argv[7]) required");
assert(["before", "after"].includes(phase), "phase (argv[8]) must be before or after");

/** The acceptance floor of criterion 1, in CSS pixels of visible map. */
const MAP_FLOOR_PX = 200;

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

/* --- CDP plumbing (unchanged from the B01 harness) --------------------------- */

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

/* --- the host window, for real ---------------------------------------------------- */

/** Resizes the real window so its client area is exactly `width` x `height` CSS px.
 *  `scripts/task0058-resize.ps1` is reused unchanged: it is the B01 witness of what
 *  Windows granted, and a second copy of it would weaken both. */
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

/* --- the first-screen reading: one state, one verdict ------------------------------ */

// Everything criterion 1 and criterion 2 of `TASK-0059` ask about, plus every tripwire
// `TASK-0058` measured, read in a single evaluation so nothing drifts between two reads.
const READ_FIRST_SCREEN = `(() => {
  const html = document.documentElement;
  // The whole question is what the person sees before touching anything, so the reading
  // starts by putting the document back where it opens. A previous Tab walk may have
  // scrolled it; whether it CAN scroll is itself published below.
  window.scrollTo(0, 0);
  const round = (n) => Math.round(n * 10) / 10;
  const rectOf = (el) => {
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
  const box = (selector) => rectOf(document.querySelector(selector));
  const viewportWidth = html.clientWidth;
  const viewportHeight = html.clientHeight;
  /** The part of a box that is really inside the window, in CSS px. */
  const visibleHeight = (r) => r ? Math.max(0, Math.min(r.bottom, viewportHeight) - Math.max(r.y, 0)) : 0;
  const visibleWidth = (r) => r ? Math.max(0, Math.min(r.right, viewportWidth) - Math.max(r.x, 0)) : 0;

  /* --- B01 tripwires, kept verbatim: a first screen must not cost a command -------- */
  const documentOverflowX = Math.max(0, html.scrollWidth - html.clientWidth);
  const scrollers = [];
  const escapers = [];
  const clipped = [];
  for (const el of document.querySelectorAll('.app, .app *')) {
    if (el.closest('svg')) continue;
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
  const mapEl = document.querySelector('.app__map');
  const asideEl = document.querySelector('.app__aside');
  let overlapArea = 0;
  if (mapEl && asideEl) {
    const a = mapEl.getBoundingClientRect(), b = asideEl.getBoundingClientRect();
    overlapArea = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
                  Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  }

  /* --- criterion 1: the first screen ---------------------------------------------- */
  const mapViewBox = box('.map-view');
  const canvasBox = box('[data-testid="composed-canvas"]');
  const mapVisibleH = visibleHeight(mapViewBox);
  const mapVisibleW = visibleWidth(mapViewBox);
  // "Usable", not merely "laid out": something of the map's own surface must answer a
  // hit test at the centre of its visible part. A box covered by a panel is not a map.
  let mapHitTest = null;
  if (mapViewBox && mapVisibleH > 0 && mapVisibleW > 0) {
    const x = Math.max(mapViewBox.x, 0) + mapVisibleW / 2;
    const y = Math.max(mapViewBox.y, 0) + mapVisibleH / 2;
    const top = document.elementFromPoint(x, y);
    const host = document.querySelector('.map-view');
    mapHitTest = { x: round(x), y: round(y), inside: !!top && !!host && host.contains(top), tag: top ? top.tagName : null };
  }
  // The cards that are REALLY on the first screen: inside the window, with area, and
  // answering a hit test at their own centre.
  const visibleCards = [];
  for (const card of document.querySelectorAll('[data-testid="composed-canvas"] [data-card="true"]')) {
    const r = card.getBoundingClientRect();
    const h = Math.max(0, Math.min(r.bottom, viewportHeight) - Math.max(r.top, 0));
    const w = Math.max(0, Math.min(r.right, viewportWidth) - Math.max(r.left, 0));
    if (h < 4 || w < 4) continue;
    const x = Math.max(r.left, 0) + w / 2, y = Math.max(r.top, 0) + h / 2;
    const top = document.elementFromPoint(x, y);
    if (!(top && (top === card || card.contains(top)))) continue;
    visibleCards.push({
      nodeId: Number(card.getAttribute('data-node-id')),
      kind: card.getAttribute('data-node-kind'),
      level: Number(card.getAttribute('aria-level')),
      label: (card.getAttribute('aria-label') ?? '').slice(0, 60),
      visibleArea: Math.round(w * h),
    });
  }
  visibleCards.sort((l, r) => r.visibleArea - l.visibleArea);
  const rootCard = visibleCards.find((card) => card.level === 1) ?? null;

  /* --- the chrome ledger: where every band above <main> spends its pixels ---------- */
  const bands = [];
  const shell = document.querySelector('.app');
  const main = document.querySelector('.app__main');
  if (shell && main) {
    for (const child of shell.children) {
      if (child === main) break;
      const r = rectOf(child);
      bands.push({
        tag: child.tagName,
        cls: String(child.className).slice(0, 60) || null,
        testid: child.getAttribute('data-testid'),
        h: r.h, documentTop: r.documentTop, visibleHeight: round(visibleHeight(r)),
        scrollsInside: child.scrollHeight - child.clientHeight > 1,
      });
    }
  }

  return {
    cssViewport: [innerWidth, innerHeight],
    devicePixelRatio,
    layoutViewport: [viewportWidth, viewportHeight],
    scrollbarWidthPx: innerWidth - viewportWidth,
    documentScroll: [html.scrollWidth, html.scrollHeight],
    documentOverflowX,
    // The B02 question in one number: how far the DOCUMENT can scroll vertically.
    documentVerticalScrollPx: Math.max(0, html.scrollHeight - html.clientHeight),
    sidewaysScrollers: scrollers.slice(0, 10),
    viewportEscapers: escapers.slice(0, 10),
    clippedControls: clipped.slice(0, 10),
    controlCount: controls.length,
    controlIdsDigest: controlIds.join('|'),
    firstScreen: {
      mapViewVisibleHeightPx: round(mapVisibleH),
      mapViewVisibleWidthPx: round(mapVisibleW),
      canvasVisibleHeightPx: round(visibleHeight(canvasBox)),
      mapHitTest,
      visibleCardCount: visibleCards.length,
      visibleCards: visibleCards.slice(0, 6),
      rootCardVisible: rootCard,
      // A context node is any identifiable card really on screen; the root is the one
      // criterion 1 names first, and either satisfies it.
      contextCardVisible: visibleCards[0] ?? null,
    },
    chromeBands: bands,
    chromeHeightAboveMainPx: main ? round(main.getBoundingClientRect().y + window.scrollY) : null,
    columns: {
      main: box('.app__main'),
      map: box('.app__map'),
      aside: box('.app__aside'),
      mapView: mapViewBox,
      canvas: canvasBox,
      header: box('.app__header'),
      toolbar: box('.toolbar'),
      overlapArea: round(overlapArea),
      asidePosition: asideEl ? getComputedStyle(asideEl).position : null,
      // An internally scrolling right column is the intent of its own \`overflow: auto\`;
      // what B01 measured is that it never got the chance.
      asideScrollsInside: asideEl ? asideEl.scrollHeight - asideEl.clientHeight > 1 : null,
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
    buttonTransition: (() => {
      const button = document.querySelector('.app button');
      return button ? getComputedStyle(button).transitionDuration : null;
    })(),
    camera: (() => {
      const world = document.querySelector('[data-testid="composed-world"]');
      const transform = world ? world.getAttribute('transform') : null;
      const parsed = transform ? /translate\\(([-\\d.e]+) ([-\\d.e]+)\\) scale\\(([-\\d.e]+)\\)/.exec(transform) : null;
      return parsed
        ? { tx: Number(parsed[1]), ty: Number(parsed[2]), scale: Number(parsed[3]), transform }
        : { transform };
    })(),
    drawn: {
      cards: document.querySelectorAll('[data-testid="composed-canvas"] [data-card="true"]').length,
      aggregates: document.querySelectorAll('[data-testid="map-aggregate-indicator"]').length,
      hierarchyEdges: document.querySelectorAll('[data-testid="composed-canvas"] g[data-edge-kind="hierarchy"]').length,
    },
  };
})()`;

/** The world coordinates of every drawn card, read BELOW the camera: the card's own
 *  rectangle, in the units the layout wrote, plus the territory translate that places it.
 *  Neither depends on the window, so criterion 3 is falsified the moment this changes
 *  because a window got shorter. */
const READ_WORLD = `(() => {
  const out = [];
  for (const card of document.querySelectorAll('[data-testid="composed-canvas"] [data-card="true"]')) {
    const rect = card.querySelector(':scope > rect');
    const territory = card.parentElement?.closest('g[transform]');
    out.push([
      Number(card.getAttribute('data-node-id')),
      rect ? [rect.getAttribute('x'), rect.getAttribute('y'), rect.getAttribute('width'), rect.getAttribute('height')] : null,
      card.getAttribute('data-card-width'),
      card.getAttribute('data-card-height'),
      territory && territory.dataset.testid !== 'composed-world' ? territory.getAttribute('transform') : null,
    ]);
  }
  out.sort((l, r) => l[0] - r[0]);
  return out;
})()`;

/** A real Tab walk from the top of the document until focus lands inside the right
 *  panel: the number of presses, and whether the engine paints a focus ring. */
async function tabToAside(limit = 90) {
  const from = await evaluate(`(() => {
    window.scrollTo(0, 0);
    const first = document.querySelector('.app button, .app input, .app select, .app summary');
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

/* --- the matrix --------------------------------------------------------------------- */

const SIZES = [
  { label: "960x640", width: 960, height: 640 },
  { label: "1280x800", width: 1280, height: 800 },
  { label: "1366x768", width: 1366, height: 768 },
];
// The six states of B01, unchanged, so a before and an after are the same measurement.
const STATES = [
  { id: "fr-light", locale: "fr", scheme: "light", motion: "no-preference", density: "comfortable", appMotion: "system", legend: false },
  { id: "fr-dark-legend", locale: "fr", scheme: "dark", motion: "no-preference", density: "comfortable", appMotion: "system", legend: true },
  { id: "en-light-legend", locale: "en", scheme: "light", motion: "no-preference", density: "comfortable", appMotion: "system", legend: true },
  { id: "en-dark", locale: "en", scheme: "dark", motion: "no-preference", density: "comfortable", appMotion: "system", legend: false },
  { id: "fr-light-compact-legend", locale: "fr", scheme: "light", motion: "no-preference", density: "compact", appMotion: "system", legend: true },
  { id: "fr-light-reduced-motion", locale: "fr", scheme: "light", motion: "reduce", density: "comfortable", appMotion: "reduce", legend: false },
];
const PUBLISHED_CAPTURES = new Set([
  "960x640/fr-light", "960x640/fr-dark-legend", "960x640/en-light-legend",
  "960x640/fr-light-compact-legend", "1280x800/fr-light", "1366x768/fr-light",
]);

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

/** The workbench disclosure of the fix, opened or closed on purpose.
 *
 *  It does not exist in the `before` build, and a harness that required it would measure
 *  itself: every call reports what it found, and absence is a legitimate answer. */
async function setWorkbench(open) {
  const state = await evaluate(`(() => {
    const el = document.querySelector('[data-testid="chrome-workbench"]');
    return el ? el.open : null;
  })()`);
  if (state === null) return { present: false };
  if (state !== open) {
    await click('[data-testid="chrome-workbench"] > summary');
    await until(`document.querySelector('[data-testid="chrome-workbench"]').open === ${open}`);
  }
  return { present: true, open };
}

/* --- scenario ------------------------------------------------------------------------ */

const record = { task: "TASK-0059", phase, pass, headTested, mapFloorPx: MAP_FLOOR_PX, checks: [], findings: [] };
const check = (label, value = true) => {
  record.checks.push({ label, value });
  return value;
};
const FORBIDDEN_DURING_MEASUREMENT =
  /^map_(refresh|rebuild|prepare_|reveal_node|copy_node_path|write_run_artifact|brain_exclusions_replace|brain_choose_real_root|brain_save_identity|relation_|suggestion_)/;

await until("!!window.__TAURI_INTERNALS__");
const disk = await walkDisk(ROOT);
const diskHashBefore = await hashTree(ROOT);
const diskTotal = disk.length + 1; // the root itself
const archiveChildren = disk.filter((path) => /^archives\/[^/]+$/.test(path));
assert.equal(archiveChildren.length, 120, "the synthetic fixture is the one this harness judges");

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
      // The first screen is the one the application opens with, so the workbench
      // disclosure is measured CLOSED: its own open state gets its own check below.
      const workbench = await setWorkbench(false);
      await quiet();
      await pause(500); // let the ResizeObserver-driven re-render settle

      const layout = await evaluate(READ_FIRST_SCREEN);
      assert.deepEqual(layout.cssViewport, [size.width, size.height], `the window drifted during ${size.label}/${state.id}`);
      assert.equal(layout.mediaMatches.dark, state.scheme === "dark", `prefers-color-scheme not applied at ${size.label}/${state.id}`);
      assert.equal(layout.mediaMatches.reduceMotion, state.motion === "reduce", `prefers-reduced-motion not applied at ${size.label}/${state.id}`);

      // Taken here, while the document is still at the top where `READ_FIRST_SCREEN` left
      // it: the capture must show the window the reading describes. The Tab walk scrolls.
      const key = `${size.label}/${state.id}`;
      if (PUBLISHED_CAPTURES.has(key)) {
        const shot = await send("Page.captureScreenshot", { format: "png" });
        const bytes = Buffer.from(shot.data, "base64");
        captures.push({
          key,
          file: `TASK-0059-${phase}-${size.label}-${state.id}.png`,
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
        workbench,
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
  const granted = await resizeTo(1280, 800);
  await emulate("light", "no-preference");
  await quiet();
  await pause(500);
  const layout = await evaluate(READ_FIRST_SCREEN);
  const keyboard = await tabToAside();
  const axe = await axeRun();
  matrix.push({
    size: "1280x800",
    state: "restored",
    requested: { id: "restored" },
    workbench: { present: await evaluate(`!!document.querySelector('[data-testid="chrome-workbench"]')`) },
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
    selectedNodeId: await evaluate(`Number(document.querySelector('[data-card="true"][aria-selected="true"]')?.getAttribute('data-node-id') ?? 0) || null`),
    camera: layout.camera,
    // `P-19` in B02 terms: the workbench disclosure is presentation, so it is NOT
    // persisted and a new process must find it closed, like any first screen.
    workbenchOpen: await evaluate(`document.querySelector('[data-testid="chrome-workbench"]')?.open ?? null`),
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

// Criterion 1, state by state: the whole point of the slice.
const firstScreenByState = matrix.map((entry) => ({
  size: entry.size,
  state: entry.state,
  documentHeight: entry.layout.documentScroll[1],
  viewportHeight: entry.layout.layoutViewport[1],
  documentVerticalScrollPx: entry.layout.documentVerticalScrollPx,
  chromeHeightAboveMainPx: entry.layout.chromeHeightAboveMainPx,
  mapViewVisibleHeightPx: entry.layout.firstScreen.mapViewVisibleHeightPx,
  mapUsableAtTop: entry.layout.firstScreen.mapHitTest?.inside === true,
  visibleCardCount: entry.layout.firstScreen.visibleCardCount,
  rootCardVisible: entry.layout.firstScreen.rootCardVisible?.nodeId ?? null,
  contextCard: entry.layout.firstScreen.contextCardVisible?.label ?? null,
  asideScrollsInside: entry.layout.columns.asideScrollsInside,
  satisfiesCriterion1:
    entry.layout.firstScreen.mapViewVisibleHeightPx >= MAP_FLOOR_PX &&
    entry.layout.firstScreen.mapHitTest?.inside === true &&
    entry.layout.firstScreen.visibleCardCount > 0,
}));
const failingStates = firstScreenByState.filter((entry) => !entry.satisfiesCriterion1);

record.verdict = {
  firstScreenSatisfied: failingStates.length === 0,
  statesFailingFirstScreen: failingStates.map((entry) => `${entry.size}/${entry.state}`),
  worstVisibleMapHeightPx: Math.min(...firstScreenByState.map((entry) => entry.mapViewVisibleHeightPx)),
  worstDocumentVerticalScrollPx: Math.max(...firstScreenByState.map((entry) => entry.documentVerticalScrollPx)),
  worstChromeHeightAboveMainPx: Math.max(...firstScreenByState.map((entry) => entry.chromeHeightAboveMainPx ?? 0)),
  firstScreenByState,
  horizontalOverflowWorstPx: worstOverflow,
  statesWithViewportEscapers: escapers.map((entry) => `${entry.size}/${entry.state}`),
  statesWithSidewaysScrollers: scrollers.map((entry) => `${entry.size}/${entry.state}`),
  statesWithClippedControls: clipped.map((entry) => `${entry.size}/${entry.state}`),
  statesWithColumnOverlap: overlapping.map((entry) => `${entry.size}/${entry.state}`),
  statesWherePanelUnreachableByKeyboard: unreachable.map((entry) => `${entry.size}/${entry.state}`),
  statesWithoutVisibleFocusRing: noFocusRing.map((entry) => `${entry.size}/${entry.state}`),
  commandsLostAtSomeSize,
  controlCountByState: matrix.map((entry) => ({ size: entry.size, state: entry.state, controls: entry.layout.controlCount })),
  axeViolations,
  axeIncompleteByState: matrix.map((entry) => ({
    size: entry.size, state: entry.state,
    incomplete: entry.axe.incomplete.map((rule) => `${rule.id}x${rule.nodes}`).sort(),
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

check("criterion 1 — a usable map and an identifiable node at scrollY=0", {
  satisfied: record.verdict.firstScreenSatisfied,
  floorPx: MAP_FLOOR_PX,
  worstVisibleMapHeightPx: record.verdict.worstVisibleMapHeightPx,
  failing: record.verdict.statesFailingFirstScreen,
});
check("criterion 2 — a restricted window removes no command", {
  controlDigestsPerState: Object.fromEntries(Object.entries(perStateControls).map(([state, set]) => [state, set.size])),
  commandsLostAtSomeSize,
  panelReachableByKeyboard: unreachable.length === 0,
  horizontalOverflow: worstOverflow === 0 ? "none at any size or state" : `${worstOverflow}px`,
});

/* --- targeted product controls, at the hardest size ---------------------------------- */

if (pass === 1) {
  await resizeTo(960, 640);
  await emulate("light", "no-preference");
  await setLocale("fr");
  await setDensity("comfortable");
  await setMotion("system");
  await setWorkbench(false);
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

  // P-05 — links in view and out of view: the view stays bounded, and a row outside the
  // first view is reachable.
  const edgesBefore = (await evaluate(READ_FIRST_SCREEN)).drawn;
  const farRef = await invoke("map_resolve_node", { brainId: BRAIN, relativePath: "archives/piece-0119.txt" });
  assert(farRef, "the far row is indexed");
  const farInFirstView = view0.nodes.some((node) => node.id === farRef.nodeId);
  await click("#map-search-input");
  await send("Input.insertText", { text: "piece-0119" });
  await until(`!!document.querySelector('[data-testid="search-hit"]')`);
  await click(`[data-testid="search-hit"][data-node-id="${farRef.nodeId}"]`);
  await until(`!!document.querySelector('[data-testid="composed-canvas"] [data-node-id="${farRef.nodeId}"]')`);
  await quiet();
  const afterNavigation = await evaluate(READ_FIRST_SCREEN);
  assert(edgesBefore.hierarchyEdges > 0, "P-05: hierarchy edges are drawn in the first view");
  assert(
    afterNavigation.drawn.cards + afterNavigation.drawn.aggregates <= view0.viewBudget,
    "P-05: the view stays bounded after navigating out of it",
  );
  // Criterion 3's last clause: a navigated target is still visible afterwards.
  const navigatedTargetVisible = await evaluate(`(() => {
    const card = document.querySelector('[data-testid="composed-canvas"] [data-node-id="${farRef.nodeId}"]');
    if (!card) return null;
    const r = card.getBoundingClientRect();
    const h = Math.max(0, Math.min(r.bottom, document.documentElement.clientHeight) - Math.max(r.top, 0));
    const w = Math.max(0, Math.min(r.right, document.documentElement.clientWidth) - Math.max(r.left, 0));
    return { visibleWidth: Math.round(w), visibleHeight: Math.round(h), scrollY: Math.round(window.scrollY) };
  })()`);
  check("P-05 edges drawn, a row outside the first view reached, view bounded, target still visible", {
    farRowWasInFirstView: farInFirstView, edgesBefore: edgesBefore.hierarchyEdges,
    edgesAfter: afterNavigation.drawn.hierarchyEdges,
    budget: view0.viewBudget, slotsAfter: afterNavigation.drawn.cards + afterNavigation.drawn.aggregates,
    navigatedTargetVisible,
  });

  // P-07 — selection and its details, at 960x640, WITHOUT scrolling the document: that
  // "without" is the whole slice. The scroll offset is published either way.
  await click(testid("search-clear"));
  await quiet();
  const scrollBeforeSelection = await evaluate(`(() => { window.scrollTo(0, 0); return Math.round(window.scrollY); })()`);
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
  record.selectionAtTop = { scrollY: scrollBeforeSelection, selectable };
  if (selectable !== null) {
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
    check("P-07 selection at 960x640 without scrolling the document, details agree with the Index", {
      nodeId: selectable, panelNameMatchesIndex: true, scrollYWhenSelected: scrollBeforeSelection,
    });
  } else {
    check("P-07 selection at 960x640 WITHOUT scrolling the document", {
      selected: false,
      why: "no card is visible and hittable at scrollY=0: this is the B01-O1 defect, measured, not worked around",
      scrollY: scrollBeforeSelection,
    });
  }

  // P-11 — the real wheel, the same primitive a touchpad produces, and the keyboard.
  // Run where the map actually is, so a `before` phase can exercise it too.
  await evaluate(`document.querySelector('[data-testid="composed-canvas"]').scrollIntoView({ block: 'center' })`);
  await pause(400);
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

  /* --- criterion 3: the camera under a changing viewport height -------------------- */
  //
  // The fix changes how tall `.map-view` is, so this is the clause that could be broken
  // silently. The camera is set by hand, then the window is resized through all three
  // heights and back. World coordinates must not move, the SCALE must not move — an
  // automatic zoom-to-fit would change it — and the selection must survive.
  await evaluate(`window.scrollTo(0, 0)`);
  const cameraTrail = [];
  const worldBeforeResize = await evaluate(READ_WORLD);
  const selectedBefore = await evaluate(`Number(document.querySelector('[data-card="true"][aria-selected="true"]')?.getAttribute('data-node-id') ?? 0) || null`);
  for (const size of [...SIZES, SIZES[0]]) {
    await resizeTo(size.width, size.height);
    await quiet();
    await pause(500);
    const reading = await evaluate(READ_FIRST_SCREEN);
    cameraTrail.push({
      size: size.label,
      camera: reading.camera,
      mapViewHeight: reading.columns.mapView?.h ?? null,
      selected: await evaluate(`Number(document.querySelector('[data-card="true"][aria-selected="true"]')?.getAttribute('data-node-id') ?? 0) || null`),
      selectedStillVisible: await evaluate(`(() => {
        const card = document.querySelector('[data-card="true"][aria-selected="true"]');
        if (!card) return null;
        const r = card.getBoundingClientRect();
        return Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)) > 2 &&
               Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0)) > 2;
      })()`),
    });
  }
  const worldAfterResize = await evaluate(READ_WORLD);
  const scales = [...new Set(cameraTrail.map((entry) => entry.camera.scale))];
  const worldCoordinatesStable = JSON.stringify(worldBeforeResize) === JSON.stringify(worldAfterResize);
  record.cameraInvariants = {
    selectionBefore: selectedBefore,
    trail: cameraTrail,
    distinctScales: scales,
    scaleUnchangedAcrossHeights: scales.length === 1,
    worldCoordinatesStable,
    selectionKept: cameraTrail.every((entry) => entry.selected === selectedBefore),
    cardsCompared: worldBeforeResize.length,
  };
  check("criterion 3 — world coordinates and camera scale survive three window heights", record.cameraInvariants);

  // P-19 / P-21 — the toggles, then the state this pass deliberately leaves behind for
  // the second process to restore.
  const detailsBefore = await evaluate(`!!document.querySelector('.details')`);
  await click(testid("details-panel-toggle"));
  await until(`(!!document.querySelector('.details')) === ${!detailsBefore}`);
  assert.notEqual(await evaluate(`!!document.querySelector('.details')`), detailsBefore, "P-19: the panel toggle changes the panel");
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
    selected: Number(document.querySelector('[data-card="true"][aria-selected="true"]')?.getAttribute('data-node-id') ?? 0) || null,
  })`);
  record.leftBehind = left;
  check("P-19 / P-21 panel, language, density, motion and legend toggle; a non-default workspace is left for the restart", left);

  // Criterion 2's other half: every command of the workbench is still reachable, and the
  // disclosure is a native one the keyboard opens.
  const workbench = await evaluate(`(() => {
    const el = document.querySelector('[data-testid="chrome-workbench"]');
    if (!el) return { present: false };
    const summary = el.querySelector(':scope > summary');
    return {
      present: true,
      open: el.open,
      summaryTag: summary ? summary.tagName : null,
      summaryFocusable: summary ? summary.tabIndex >= 0 : null,
      summaryText: summary ? (summary.textContent ?? '').trim().slice(0, 60) : null,
      controlsInside: el.querySelectorAll('button, input, select').length,
    };
  })()`);
  if (workbench.present) {
    await setWorkbench(true);
    const opened = await evaluate(`(() => {
      const el = document.querySelector('[data-testid="chrome-workbench"]');
      const controls = [...el.querySelectorAll('button, input, select')];
      const hittable = controls.filter((c) => {
        const r = c.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });
      return { controls: controls.length, laidOut: hittable.length, documentScrolls: document.documentElement.scrollHeight > document.documentElement.clientHeight };
    })()`);
    workbench.whenOpen = opened;
    await setWorkbench(false);
  }
  record.workbench = workbench;
  check("criterion 2 — the folded commands are a native disclosure, keyboard-operable, nothing removed", workbench);
}

/* --- nothing outside the contract happened -------------------------------------------- */

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
    entry.layout.documentVerticalScrollPx,
    entry.layout.firstScreen.mapViewVisibleHeightPx,
    entry.layout.controlIdsDigest,
  ]),
);
await writeFile(join(proofRoot, `run-${phase}-pass${pass}.json`), JSON.stringify(record, null, 2));
for (const capture of captures) {
  await writeFile(join(proofRoot, capture.file), Buffer.from(capture.data, "base64"));
}
console.log(JSON.stringify({
  phase, pass, ok: true,
  firstScreenSatisfied: record.verdict.firstScreenSatisfied,
  worstVisibleMapHeightPx: record.verdict.worstVisibleMapHeightPx,
  chromeDefectProven: record.chromeDefectProven,
  digest: record.layoutDigest,
}));
ws.close();
process.exit(0);
