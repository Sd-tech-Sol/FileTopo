// TASK-0060 — Stage B / B03: which commands the first window really offers, in the real host.
//
//   node scripts/task0060-primary-chrome.mjs <port> <variant> <pass> <proofRoot> <head> <appPid> <phase>
//   (seed JSON on stdin)
//
// `B02` put the map on the first screen and reported `B02-O1`: three regions scrolling at
// once, the chrome band showing 176 CSS px of 723 and the map's own band 134 of 625, so the
// actions one takes every time — add a folder, open, refresh, search — opened below a fold.
// `TASK-0060` asks the next falsifiable question:
//
//   **At `scrollY=0`, are the usual commands — the active brain, a load/refresh action, the
//   search field and the essential camera controls — REALLY on screen and hittable, while
//   every one of the 59 commands B02 inventoried is still present and still reachable by
//   keyboard, and the map keeps at least the 240 CSS px B02 measured?**
//
// So this harness is `scripts/task0059-first-screen.mjs` with the same tripwires and two
// new readings. It is a versioned extension, not an edit: the B02 witness is left untouched
// beside it, so the two campaigns remain comparable artifact by artifact.
//
// Kept verbatim from B02: horizontal overflow, escaping boxes, clipped controls, the control
// inventory digest, keyboard reach of the right panel, axe-core, the first-screen reading
// (visible `.map-view` height, hit test, visible cards, root/context card), the chrome
// ledger, the three scroll regions, and the camera invariants of criterion 3.
//
// Added by B03:
//
// * the command census: for EVERY control, whether it is laid out at all, whether it is
//   really on the first screen (in the window, with area, answering a hit test at its own
//   centre) and, when it is not, which named `<details>` group holds it. Presence in the
//   DOM and visibility are counted separately and never mixed — a closed group is the whole
//   point of the slice, so it must be measured as closed, not as absent;
// * the primary contract: a named list of the commands that must be on the first screen in
//   every state, each one checked individually rather than as a total;
// * the disclosure walk: a real Tab walk to a group's `summary`, `Enter` to open it, more
//   Tab presses to the furthest command inside, then `Enter` on the summary again to close
//   it — with the document's scroll offset and `document.activeElement` read at each step,
//   because "reachable" and "does not lose focus on close" are keyboard facts no box
//   measurement can answer.
//
// It is run twice against the same build procedure — `-Phase before` on the starting HEAD
// and `-Phase after` on the reorganisation — and it publishes the verdict it measures,
// including a failing one. Nothing here changes the product.
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
assert(/^task0060-[a-f0-9]+$/.test(variant), "variant");
assert([1, 2].includes(pass), "pass must be 1 or 2");
assert(/^[a-f0-9]{40}$/.test(headTested ?? ""), "HEAD sha (argv[6]) required");
assert(Number.isInteger(appPid) && appPid > 0, "application pid (argv[7]) required");
assert(["before", "after"].includes(phase), "phase (argv[8]) must be before or after");

/** The acceptance floor of criterion 1, in CSS pixels of visible map. B03 may not regress
 *  below what B02 MEASURED, not merely below what B02 was asked for: 240, not 200. */
const MAP_FLOOR_PX = 240;
/** The desirable, not required, secondary objective of `TASK-0060` §5 at 960x640. */
const MAP_WISH_PX = 300;

/**
 * The commands `TASK-0060` names as usual, and the surface each one belongs to.
 *
 * Every one of these must be really on the first screen — in the window, with area,
 * answering a hit test at its own centre — in all eighteen states. They are checked one by
 * one and published one by one: a total would let one of them disappear behind another's
 * arrival. `expand-aggregate` and `child-node` are deliberately absent, because how many
 * of them exist depends on the fixture, not on the chrome.
 */
const PRIMARY_COMMANDS = [
  // the active brain, and the composition it belongs to
  { id: "composition-add-trigger", why: "compose: add a brain to the view" },
  // a load / refresh action — `TASK-0060` objective, first clause
  { id: "brain-add-real-root", why: "the only way a real folder enters FileTopo" },
  { id: "lifecycle-open", why: "open what is composed" },
  { id: "lifecycle-refresh", why: "bring the active brain up to date" },
  // search — second clause
  { id: "search-input", why: "find a folder or a file" },
  { id: "search-clear", why: "leave the search" },
  // the essential camera — third clause
  { id: "fit-composition", why: "frame the whole composition" },
  { id: "reset-view", why: "go back to the readable view" },
  { id: "map-legend-toggle", why: "read what the map draws" },
  // the two global preferences, which were already on the first screen in B02
  { id: "language-fr", why: "the interface language" },
  { id: "language-en", why: "the interface language" },
  { id: "density-compact", why: "the density preference" },
  { id: "motion-reduce", why: "the motion preference" },
];

/** The three named disclosure groups, and the furthest command inside each one: the
 *  keyboard walk below must reach exactly these, through the group's own summary. */
const DISCLOSURE_GROUPS = [
  { testid: "chrome-advanced-tools", furthest: '[data-testid="cross-check"]', band: "chrome" },
  { testid: "chrome-diagnostics", furthest: null, band: "chrome" },
  { testid: "map-advanced-tools", furthest: '[data-testid="expand-aggregate"]', band: "mapControls" },
];

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
  // starts by putting the page back where it opens. A previous Tab walk may have scrolled
  // it; whether it CAN scroll is itself published below.
  //
  // Every region too: once a region scrolls inside itself, "the top of the document" is no
  // longer enough to describe an opening screen, and a capture taken with a band left
  // where the last state's keyboard walk pushed it would show a scrolled interface while
  // claiming to show the first one.
  window.scrollTo(0, 0);
  for (const region of document.querySelectorAll('.app, .app *')) {
    if (region.scrollTop !== 0) region.scrollTop = 0;
    if (region.scrollLeft !== 0) region.scrollLeft = 0;
  }
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

  /* --- B03: "really on the first screen", for one element -----------------------------
   *
   * Four conditions, and each one alone lies:
   *
   *   laid out   a control inside a closed \`<details>\` has no box at all, so a box test
   *              alone would call it "absent" when it is merely closed;
   *   in window  a control inside a band that scrolls itself has a box, and that box can be
   *              entirely above or below the band's own fold;
   *   NOT CLIPPED by the bands. A control's own rectangle says nothing about how much of it
   *              the band it lives in actually paints. B02 made three regions scroll inside
   *              themselves, so clipping by the WINDOW is the wrong clip: the right one is
   *              the window intersected with the client box of every scrolling ancestor.
   *              Measured the wrong way, a button showing 20 px of its 35 reads as whole;
   *   hit test   a control can be inside every box and covered by something else.
   *
   * \`onScreen\` is the conjunction, and the hit test is taken at the centre of the CLIPPED
   * rectangle, not of the element: that is the point a person can actually aim at.
   * \`fullyVisible\` is published beside it, and the two are never merged — a half-painted
   * button is a different fact from a hidden one, and from a whole one.
   *
   * None of this decides whether a command EXISTS: that is the DOM inventory, counted
   * separately and kept identical to B02. */
  const clipToAncestors = (el, r) => {
    let left = Math.max(r.left, 0);
    let top = Math.max(r.top, 0);
    let right = Math.min(r.right, viewportWidth);
    let bottom = Math.min(r.bottom, viewportHeight);
    const clippedBy = [];
    for (let parent = el.parentElement; parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent);
      const clips = /auto|scroll|hidden|clip/.test(style.overflowX + ' ' + style.overflowY);
      if (!clips) continue;
      const box = parent.getBoundingClientRect();
      // The CLIENT box: a scrollbar paints no content, and the border is not content either.
      const padLeft = box.left + parent.clientLeft;
      const padTop = box.top + parent.clientTop;
      const next = {
        left: Math.max(left, padLeft),
        top: Math.max(top, padTop),
        right: Math.min(right, padLeft + parent.clientWidth),
        bottom: Math.min(bottom, padTop + parent.clientHeight),
      };
      if (next.left > left || next.top > top || next.right < right || next.bottom < bottom) {
        clippedBy.push(String(parent.className).slice(0, 40) || parent.tagName);
      }
      ({ left, top, right, bottom } = next);
    }
    return { left, top, right, bottom, w: Math.max(0, right - left), h: Math.max(0, bottom - top), clippedBy };
  };
  const firstScreenStateOf = (el) => {
    const laidOut = !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    if (!laidOut) {
      return {
        laidOut, onScreen: false, fullyVisible: false,
        visibleHeightPx: 0, visibleWidthPx: 0, ownHeightPx: 0, clippedBy: [],
      };
    }
    const r = el.getBoundingClientRect();
    const clip = clipToAncestors(el, r);
    const base = {
      laidOut,
      visibleHeightPx: round(clip.h),
      visibleWidthPx: round(clip.w),
      ownHeightPx: round(r.height),
      // Window-clipped only, kept so the two clips can be compared in the artifact.
      windowHeightPx: round(visibleHeight(r)),
      clippedBy: clip.clippedBy,
    };
    if (clip.h < 4 || clip.w < 4) return { ...base, onScreen: false, fullyVisible: false };
    const top = document.elementFromPoint(clip.left + clip.w / 2, clip.top + clip.h / 2);
    const hit = !!top && (top === el || el.contains(top));
    return {
      ...base,
      onScreen: hit,
      // Whole, not merely reachable: no band ate any of it and the window holds all of it.
      fullyVisible: hit && clip.h >= r.height - 1 && clip.w >= r.width - 1,
    };
  };

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
  /* --- B03: the command census ------------------------------------------------------- */
  //
  // One row per control of the shell, in DOM order. The row says, separately: is it in the
  // DOM at all (it is, since it is in this list), is it laid out, is it really on the first
  // screen, and which named group holds it if it is closed. \`TASK-0060\`'s acceptance
  // criterion 2 asks for exactly this distinction in writing.
  const idOf = (el) =>
    el.getAttribute('data-testid') ??
    (el.getAttribute('aria-label') || (el.textContent ?? '').trim()).slice(0, 40);
  const commands = controls.map((el) => {
    const group = el.closest('details.app__group');
    return {
      id: idOf(el),
      tag: el.tagName,
      ...firstScreenStateOf(el),
      group: group ? (group.getAttribute('data-testid') ?? 'unnamed-group') : null,
      groupOpen: group ? group.open : null,
      disabled: 'disabled' in el ? !!el.disabled : null,
    };
  });

  /* --- B03: the named disclosure groups ----------------------------------------------- */
  const groups = [...document.querySelectorAll('details.app__group')].map((el) => {
    const summary = el.querySelector(':scope > summary');
    const body = el.querySelector(':scope > .app__group-body');
    const band = el.closest('.app__chrome')
      ? 'chrome'
      : el.closest('.app__map-controls')
        ? 'mapControls'
        : el.closest('.app__aside')
          ? 'aside'
          : 'other';
    return {
      testid: el.getAttribute('data-testid'),
      band,
      open: el.open,
      // The accessible name a screen reader would announce for the row, read from the
      // engine's own text, in whichever language the state is in.
      summaryText: (summary?.textContent ?? '').trim().slice(0, 120),
      summaryHeightPx: summary ? round(summary.getBoundingClientRect().height) : null,
      summaryOnFirstScreen: summary ? firstScreenStateOf(summary).onScreen : null,
      summaryFullyVisible: summary ? firstScreenStateOf(summary).fullyVisible : null,
      summaryTabbable: summary ? summary.tabIndex >= 0 : null,
      // What it holds, counted in the DOM: a closed group hides nothing from the Index.
      focusableInside: body
        ? body.querySelectorAll('button, input, select, a[href], summary, [tabindex]:not([tabindex="-1"])').length
        : 0,
      bodyLaidOut: body ? !!(body.offsetWidth || body.offsetHeight || body.getClientRects().length) : null,
      // The pixels the group is spending right now, closed or open.
      heightPx: round(el.getBoundingClientRect().height),
    };
  });

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

  /* --- B03: where every drawn card is, whether or not it counts as visible ------------
   *
   * \`visibleCardCount\` answers "is a card on the first screen"; it cannot say why not.
   * B03 gives the map more pixels, so the camera clamp lands somewhere else on a restored
   * view, and a zero has to be explainable rather than merely reported. Every drawn card's
   * rectangle is published here, against the map's own box, so the reader can see whether
   * a card is off to the side, behind a panel, or simply not where the camera is. */
  const cardGeometry = [];
  for (const card of document.querySelectorAll('[data-testid="composed-canvas"] [data-card="true"]')) {
    const r = card.getBoundingClientRect();
    const m = mapViewBox;
    cardGeometry.push({
      nodeId: Number(card.getAttribute('data-node-id')),
      level: Number(card.getAttribute('aria-level')),
      rect: { x: round(r.x), y: round(r.y), w: round(r.width), h: round(r.height) },
      insideWindowPx: { w: round(visibleWidth(r)), h: round(visibleHeight(r)) },
      insideMapBoxPx: m
        ? {
            w: round(Math.max(0, Math.min(r.right, m.right) - Math.max(r.x, m.x))),
            h: round(Math.max(0, Math.min(r.bottom, m.bottom) - Math.max(r.y, m.y))),
          }
        : null,
    });
  }
  cardGeometry.sort((l, r) => l.nodeId - r.nodeId);

  /* --- the chrome ledger: where every band above the map spends its pixels ---------- */
  //
  // Walked one level deep, because the fix puts the bands inside the chrome band: the
  // ledger must keep naming the header, the composition nav, the diagnostics and the
  // reports individually, before and after, or the two phases compare nothing.
  const bands = [];
  const shell = document.querySelector('.app');
  const main = document.querySelector('.app__main');
  const chrome = document.querySelector('.app__chrome');
  if (shell && main) {
    const describe = (child, depth) => {
      const r = rectOf(child);
      bands.push({
        depth,
        tag: child.tagName,
        cls: String(child.className).slice(0, 60) || null,
        testid: child.getAttribute('data-testid'),
        h: r.h, documentTop: r.documentTop, visibleHeight: round(visibleHeight(r)),
        scrollsInside: child.scrollHeight - child.clientHeight > 1,
      });
    };
    for (const child of shell.children) {
      if (child === main) break;
      describe(child, 0);
      if (child === chrome) for (const band of child.children) describe(band, 1);
    }
  }

  /* --- the three regions that are allowed to scroll, and nothing else -------------- */
  const scrollRegions = {};
  for (const [name, selector] of [
    ['chrome', '.app__chrome'],
    ['mapControls', '.app__map-controls'],
    ['aside', '.app__aside'],
  ]) {
    const el = document.querySelector(selector);
    scrollRegions[name] = el
      ? {
          present: true,
          height: round(el.getBoundingClientRect().height),
          clientHeight: el.clientHeight,
          scrollHeight: el.scrollHeight,
          scrollsInside: el.scrollHeight - el.clientHeight > 1,
          overflowY: getComputedStyle(el).overflowY,
          // A scroll container that holds focusable controls is reachable by keyboard,
          // which is what axe's scrollable-region rule and criterion 2 both ask.
          focusableInside: el.querySelectorAll('button, input, select, a[href], summary, [tabindex]:not([tabindex="-1"])').length,
        }
      : { present: false };
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
    // B03 — the same inventory, counted three ways that must never be confused.
    commands,
    commandsInDom: commands.length,
    commandsLaidOut: commands.filter((command) => command.laidOut).length,
    commandsOnFirstScreen: commands.filter((command) => command.onScreen).length,
    commandsFullyVisible: commands.filter((command) => command.fullyVisible).length,
    commandsClippedByABand: commands.filter((command) => command.onScreen && !command.fullyVisible).length,
    commandsInClosedGroups: commands.filter((command) => command.groupOpen === false).length,
    commandsOnFirstScreenIds: commands.filter((command) => command.onScreen).map((command) => command.id).sort(),
    groups,
    firstScreen: {
      mapViewVisibleHeightPx: round(mapVisibleH),
      mapViewVisibleWidthPx: round(mapVisibleW),
      canvasVisibleHeightPx: round(visibleHeight(canvasBox)),
      mapHitTest,
      visibleCardCount: visibleCards.length,
      visibleCards: visibleCards.slice(0, 6),
      rootCardVisible: rootCard,
      // B03 — every drawn card's rectangle, so a zero above is explainable.
      cardGeometry,
      // A context node is any identifiable card really on screen; the root is the one
      // criterion 1 names first, and either satisfies it.
      contextCardVisible: visibleCards[0] ?? null,
    },
    chromeBands: bands,
    scrollRegions,
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

/** Criterion 2, the half a box measurement cannot answer: a command that sits past the
 *  fold of a band which scrolls inside itself must still be reachable by the keyboard, and
 *  the engine must bring it into view WITHOUT scrolling the document.
 *
 *  The walk starts at the shell's first control and presses Tab until it reaches the named
 *  control, then reports where that control ended up and what the document did. */
async function tabToControl(selector, limit = 120) {
  await evaluate(`(() => {
    window.scrollTo(0, 0);
    const first = document.querySelector('.app button, .app input, .app select');
    first?.focus();
  })()`);
  for (let presses = 1; presses <= limit; presses += 1) {
    await press("Tab");
    const landed = await evaluate(`(() => {
      const wanted = document.querySelector(${JSON.stringify(selector)});
      if (!wanted || document.activeElement !== wanted) return null;
      const r = wanted.getBoundingClientRect();
      const style = getComputedStyle(wanted);
      return {
        inViewport: r.top >= -1 && r.bottom <= innerHeight + 1 && r.left >= -1 && r.right <= innerWidth + 1,
        visibleHeight: Math.round(Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0))),
        documentScrollY: Math.round(window.scrollY),
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
      };
    })()`);
    if (landed) return { selector, presses, ...landed };
  }
  return { selector, presses: null, reached: false };
}

/** What `document.activeElement` is right now, named the way the census names a command. */
const activeElement = () =>
  evaluate(`(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return { id: null, tag: el ? el.tagName : null, isBody: true };
    const style = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      id: el.getAttribute('data-testid') ?? (el.getAttribute('aria-label') || (el.textContent ?? '').trim()).slice(0, 40),
      tag: el.tagName,
      isBody: false,
      insideGroup: el.closest('details.app__group')?.getAttribute('data-testid') ?? null,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      inViewport: r.top >= -1 && r.bottom <= innerHeight + 1 && r.left >= -1 && r.right <= innerWidth + 1,
      documentScrollY: Math.round(window.scrollY),
    };
  })()`);

/**
 * `TASK-0060` acceptance criterion 2, the half no box can answer: a command inside a NAMED
 * closed group must be reachable with the keyboard alone, through that group's own summary,
 * and closing the group again must not throw the focus away.
 *
 * The whole walk is real key events in the real engine, in the order a person would:
 *
 *   1  Tab from the top of the shell until the group's `summary` has focus;
 *   2  `Enter` — the native activation of a `<summary>` — and the group must report `open`;
 *   3  Tab on from there until the furthest command inside has focus, which proves both
 *      that the engine put it in the tab order and that it brought it into view;
 *   4  Shift+Tab back until the summary has focus again;
 *   5  `Enter` — the group must report closed, and focus must still be on the summary.
 *
 * Every step publishes `document.scrollY`: the band may scroll, the document may not.
 */
async function walkDisclosure(groupTestid, furthestSelector, limit = 160) {
  const summarySelector = `${testid(groupTestid)} > summary`;
  const present = await evaluate(`!!document.querySelector(${JSON.stringify(summarySelector)})`);
  if (!present) return { group: groupTestid, present: false };

  const toSummary = await tabToControl(summarySelector, limit);
  if (toSummary.presses === null) {
    return { group: groupTestid, present: true, summaryReached: false, toSummary };
  }
  const openedBefore = await evaluate(`document.querySelector(${JSON.stringify(testid(groupTestid))}).open`);
  await press("Enter");
  const openedAfter = await evaluate(`document.querySelector(${JSON.stringify(testid(groupTestid))}).open`);
  const focusAfterOpening = await activeElement();

  let toFurthest = null;
  if (furthestSelector) {
    toFurthest = { selector: furthestSelector, presses: null, reached: false };
    for (let presses = 1; presses <= limit; presses += 1) {
      await press("Tab");
      const landed = await evaluate(`(() => {
        const wanted = document.querySelector(${JSON.stringify(furthestSelector)});
        if (!wanted || document.activeElement !== wanted) return null;
        const r = wanted.getBoundingClientRect();
        const style = getComputedStyle(wanted);
        return {
          inViewport: r.top >= -1 && r.bottom <= innerHeight + 1 && r.left >= -1 && r.right <= innerWidth + 1,
          visibleHeight: Math.round(Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0))),
          documentScrollY: Math.round(window.scrollY),
          outlineStyle: style.outlineStyle,
          outlineWidth: style.outlineWidth,
        };
      })()`);
      if (landed) {
        toFurthest = { selector: furthestSelector, presses, reached: true, ...landed };
        break;
      }
    }
  }

  // Back to the summary with the keyboard alone, then close it there.
  let backPresses = null;
  for (let presses = 1; presses <= limit; presses += 1) {
    await press("Tab", 8); // Shift+Tab
    if (await evaluate(`document.activeElement === document.querySelector(${JSON.stringify(summarySelector)})`)) {
      backPresses = presses;
      break;
    }
  }
  let closedAfter = null;
  let focusAfterClosing = null;
  if (backPresses !== null) {
    await press("Enter");
    closedAfter = await evaluate(`document.querySelector(${JSON.stringify(testid(groupTestid))}).open`);
    focusAfterClosing = await activeElement();
  }

  return {
    group: groupTestid,
    present: true,
    summaryReached: true,
    summaryPresses: toSummary.presses,
    summaryInViewport: toSummary.inViewport,
    summaryFocusRing: { style: toSummary.outlineStyle, width: toSummary.outlineWidth },
    openedBefore,
    openedByEnter: openedAfter === true,
    focusAfterOpening,
    toFurthest,
    shiftTabPressesBackToSummary: backPresses,
    closedByEnter: closedAfter === false,
    focusAfterClosing,
    focusKeptOnSummaryAfterClosing:
      focusAfterClosing !== null && focusAfterClosing.isBody === false && focusAfterClosing.tag === "SUMMARY",
    documentStayedAtTheTop:
      toSummary.documentScrollY === 0 &&
      (toFurthest === null || toFurthest.documentScrollY === 0) &&
      (focusAfterClosing === null || focusAfterClosing.documentScrollY === 0),
  };
}

/* --- ACTION-0111 / B03-O1: the entry points of the groups, from the first window --------
 *
 * A group is DISCOVERABLE when its summary is whole on the opening screen, and USABLE when
 * activating it with the mouse, or with the keyboard, shows what it holds. Neither is a DOM
 * fact: a summary under a band's fold is in the DOM, in the tab order and axe-clean, and a
 * person who has not scrolled the band has no way to know it exists — which is exactly what
 * `B03-O1` measured at 960x640, 25 and 70 px under the fold.
 *
 * So this is taken IN EVERY STATE, from the window as it opens: nothing is scrolled first
 * (`click()` above scrolls its target into view, and so would hide the very defect), the
 * mouse goes to the centre of the summary as the first screen draws it, and the keyboard
 * walks there with real Tab presses. Each activation is checked three ways — the engine's
 * `open`, what the group holds becoming laid out, and the accessibility tree's own
 * `expanded` — and each group is closed again the same way, so the next state starts from
 * the opening screen. */
const READ_GROUP = (groupTestid) => `(() => {
  const group = document.querySelector('[data-testid="${groupTestid}"]');
  if (!group) return null;
  const summary = group.querySelector(':scope > summary');
  const body = group.querySelector(':scope > .app__group-body');
  const inside = body ? [...body.querySelectorAll('button, input, select, [role="button"]')].filter((el) => !el.closest('svg')) : [];
  const laid = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  const r = summary.getBoundingClientRect();
  const x = r.x + r.width / 2, y = r.y + r.height / 2;
  const top = document.elementFromPoint(x, y);
  const chrome = document.querySelector('.app__chrome');
  return {
    open: group.open, x, y, w: Math.round(r.width), h: Math.round(r.height),
    inWindow: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth,
    hit: !!top && (top === summary || summary.contains(top)),
    commandsInside: inside.length,
    // A box is NOT presence on screen: WebView2 draws a closed \`<details>\` with
    // \`content-visibility: hidden\`, so its contents keep client rects while nothing paints
    // or answers a hit test. This count is published for that reason and judged by nothing.
    commandsWithABoxWhileClosed: inside.filter(laid).length,
    scrollY: Math.round(window.scrollY),
    chromeScrollTop: Math.round(chrome ? chrome.scrollTop : 0),
  };
})()`;
/** Every command a group holds, brought into view with the band's own scroll and then
 *  aimed at: a command the group shows but that nothing can reach is still hidden. */
const REACH_GROUP = (groupTestid) => `(() => {
  const group = document.querySelector('[data-testid="${groupTestid}"]');
  const body = group && group.querySelector(':scope > .app__group-body');
  if (!body) return null;
  const inside = [...body.querySelectorAll('button, input, select, [role="button"]')].filter((el) => !el.closest('svg'));
  let aimable = 0;
  const lost = [];
  body.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  const bodyBox = body.getBoundingClientRect();
  const bodyTop = document.elementFromPoint(bodyBox.x + bodyBox.width / 2, bodyBox.y + Math.min(bodyBox.height / 2, 12));
  const bodyAimable = bodyBox.width > 0 && bodyBox.height > 0 && !!bodyTop && body.contains(bodyTop);
  for (const el of inside) {
    el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    const r = el.getBoundingClientRect();
    const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    if (r.width > 0 && r.height > 0 && top && (top === el || el.contains(top))) aimable += 1;
    else lost.push(el.getAttribute('data-testid') ?? (el.getAttribute('aria-label') || (el.textContent ?? '').trim()).slice(0, 40));
  }
  const reading = { inside: inside.length, aimable, bodyAimable, lost, documentScrollY: Math.round(window.scrollY) };
  window.scrollTo(0, 0);
  for (const region of document.querySelectorAll('.app, .app *')) if (region.scrollTop !== 0) region.scrollTop = 0;
  return reading;
})()`;
const RESET_SCROLL = `(() => {
  window.scrollTo(0, 0);
  for (const region of document.querySelectorAll('.app, .app *')) if (region.scrollTop !== 0) region.scrollTop = 0;
})()`;

let accessibilityEnabled = false;
/** What the accessibility tree itself says about an element: role, name and `expanded`. */
async function axOf(selector) {
  if (!accessibilityEnabled) {
    await send("Accessibility.enable");
    accessibilityEnabled = true;
  }
  const { root } = await send("DOM.getDocument", { depth: 0 });
  const { nodeId } = await send("DOM.querySelector", { nodeId: root.nodeId, selector });
  if (!nodeId) return null;
  const { nodes } = await send("Accessibility.getPartialAXTree", { nodeId, fetchRelatives: false });
  const node = nodes?.[0];
  if (!node) return null;
  const property = (name) => node.properties?.find((entry) => entry.name === name)?.value?.value ?? null;
  return {
    role: node.role?.value ?? null,
    name: (node.name?.value ?? "").slice(0, 120),
    expanded: property("expanded"),
    focusable: property("focusable"),
  };
}
async function mouseClickAt(x, y) {
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 });
  await pause(220);
}

async function measureGroupEntryPoints() {
  const results = [];
  for (const group of DISCLOSURE_GROUPS) {
    const summarySelector = `${testid(group.testid)} > summary`;
    await evaluate(RESET_SCROLL);
    const opening = await evaluate(READ_GROUP(group.testid));
    if (!opening) {
      results.push({ group: group.testid, present: false });
      continue;
    }
    const axClosed = await axOf(summarySelector);
    // The baseline that makes "revealed" mean something: while closed, nothing the group
    // holds answers a hit test, not even after the band's own scroll is offered.
    const hiddenWhileClosed = await evaluate(REACH_GROUP(group.testid));
    await evaluate(RESET_SCROLL);

    // The mouse, at the centre of the summary where the first screen draws it.
    await mouseClickAt(opening.x, opening.y);
    const byMouse = await evaluate(READ_GROUP(group.testid));
    const axOpenedByMouse = await axOf(summarySelector);
    const reachedByMouse = await evaluate(REACH_GROUP(group.testid));
    // The summary may have moved (an opened group takes a whole row): aim at it again.
    const whereNow = await evaluate(READ_GROUP(group.testid));
    await mouseClickAt(whereNow.x, whereNow.y);
    const afterMouseClose = await evaluate(READ_GROUP(group.testid));
    const axClosedByMouse = await axOf(summarySelector);

    // The keyboard: real Tab presses from the first control, then Enter, then Enter.
    await evaluate(RESET_SCROLL);
    const toSummary = await tabToControl(summarySelector, 80);
    let byKeyboard = null;
    let reachedByKeyboard = null;
    let axOpenedByKeyboard = null;
    let afterKeyboardClose = null;
    let focusAfterKeyboardClose = null;
    if (toSummary.presses !== null) {
      await press("Enter");
      byKeyboard = await evaluate(READ_GROUP(group.testid));
      axOpenedByKeyboard = await axOf(summarySelector);
      reachedByKeyboard = await evaluate(REACH_GROUP(group.testid));
      // Back on the summary, without scrolling, to close it with the same key.
      await evaluate(`document.querySelector(${JSON.stringify(summarySelector)}).focus({ preventScroll: true })`);
      await press("Enter");
      afterKeyboardClose = await evaluate(READ_GROUP(group.testid));
      focusAfterKeyboardClose = await activeElement();
    }
    await evaluate(`(() => { document.querySelector(${JSON.stringify(testid(group.testid))}).open = false; })()`);
    await evaluate(RESET_SCROLL);
    const restored = await evaluate(READ_GROUP(group.testid));

    const opensWhole = (reading, reached, ax) =>
      reading !== null &&
      reading.open === true &&
      reached !== null &&
      reached.bodyAimable === true &&
      reached.aimable === reached.inside &&
      reached.documentScrollY === 0 &&
      ax !== null &&
      ax.expanded === true;
    results.push({
      group: group.testid,
      present: true,
      opening: {
        open: opening.open,
        summaryInWindow: opening.inWindow,
        summaryHit: opening.hit,
        summaryHeightPx: opening.h,
        commandsInside: opening.commandsInside,
        commandsWithABoxWhileClosed: opening.commandsWithABoxWhileClosed,
        reallyHiddenWhileClosed:
          hiddenWhileClosed !== null && hiddenWhileClosed.aimable === 0 && hiddenWhileClosed.bodyAimable === false,
        aimableWhileClosed: hiddenWhileClosed?.aimable ?? null,
        scrollY: opening.scrollY,
        chromeScrollTop: opening.chromeScrollTop,
      },
      axClosed,
      mouse: {
        opened: byMouse?.open === true,
        reached: reachedByMouse,
        axExpandedWhenOpen: axOpenedByMouse?.expanded ?? null,
        closed: afterMouseClose?.open === false,
        axExpandedWhenClosed: axClosedByMouse?.expanded ?? null,
        documentScrollY: Math.max(byMouse?.scrollY ?? 0, afterMouseClose?.scrollY ?? 0),
        revealsEverythingItHolds: opensWhole(byMouse, reachedByMouse, axOpenedByMouse),
      },
      keyboard: {
        summaryReachedByTab: toSummary.presses !== null,
        presses: toSummary.presses,
        summaryInViewport: toSummary.inViewport ?? null,
        opened: byKeyboard?.open === true,
        reached: reachedByKeyboard,
        axExpandedWhenOpen: axOpenedByKeyboard?.expanded ?? null,
        closed: afterKeyboardClose?.open === false,
        focusKeptOnSummary: focusAfterKeyboardClose?.tag === "SUMMARY",
        documentScrollY: Math.max(byKeyboard?.scrollY ?? 0, afterKeyboardClose?.scrollY ?? 0),
        revealsEverythingItHolds: opensWhole(byKeyboard, reachedByKeyboard, axOpenedByKeyboard),
      },
      restoredClosed: restored?.open === false,
      summaryRole: axClosed?.role ?? null,
      summaryName: axClosed?.name ?? null,
    });
  }
  return results;
}

/* --- scenario ------------------------------------------------------------------------ */

const record = {
  task: "TASK-0060",
  stage: "B / B03",
  phase,
  pass,
  headTested,
  mapFloorPx: MAP_FLOOR_PX,
  mapWishPx: MAP_WISH_PX,
  primaryCommandContract: PRIMARY_COMMANDS,
  disclosureGroupsExpectedAfter: DISCLOSURE_GROUPS,
  checks: [],
  findings: [],
};
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
          file: `TASK-0060-${phase}-${size.label}-${state.id}.png`,
          bytes: bytes.length,
          sha256: createHash("sha256").update(bytes).digest("hex"),
          scrollYAtCapture: await evaluate("Math.round(window.scrollY)"),
          data: shot.data,
        });
      }

      // `ACTION-0111`: from the window exactly as it opened, before anything scrolls it.
      const entryPoints = await measureGroupEntryPoints();
      await evaluate(READ_FIRST_SCREEN);

      const keyboard = await tabToAside();
      const axe = await axeRun();

      matrix.push({
        size: size.label,
        state: state.id,
        requested: { ...state },
        hostWindow: granted,
        layout,
        entryPoints,
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
  // `ACTION-0111`: the restarted process is the one a person opens next, so its groups'
  // entry points are measured from its own first window too.
  const entryPoints = await measureGroupEntryPoints();
  await evaluate(READ_FIRST_SCREEN);
  const keyboard = await tabToAside();
  const axe = await axeRun();
  matrix.push({
    size: "1280x800",
    state: "restored",
    requested: { id: "restored" },
    hostWindow: granted,
    layout,
    entryPoints,
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
    // `P-19` in B02 terms: the bands are presentation, so a restart must find the map on
    // the first screen again, with the preferences the previous process left behind.
    firstScreen: {
      mapViewVisibleHeightPx: layout.firstScreen.mapViewVisibleHeightPx,
      visibleCardCount: layout.firstScreen.visibleCardCount,
      documentVerticalScrollPx: layout.documentVerticalScrollPx,
    },
    // `P-19` in B03 terms, said plainly: whether a group is open is the ENGINE's state, not
    // the application's. `TASK-0060` adds no state and no persistence for it, so a restart
    // finds every group closed whatever the previous process left open — and that is
    // reported as a deliberate non-persistence, not as a restored preference.
    groupsAfterRestart: layout.groups.map((group) => ({
      testid: group.testid,
      open: group.open,
      summaryOnFirstScreen: group.summaryOnFirstScreen,
      focusableInside: group.focusableInside,
    })),
    groupStateIsNotPersistedByDesign: true,
    commandsOnFirstScreenAfterRestart: layout.commandsOnFirstScreen,
    commandsInDomAfterRestart: layout.commandsInDom,
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
  // B03 — when the count above is zero, this says where the cards actually were.
  cardsDrawn: entry.layout.firstScreen.cardGeometry.length,
  cardsOverlappingTheMapBox: entry.layout.firstScreen.cardGeometry.filter(
    (card) => (card.insideMapBoxPx?.w ?? 0) > 2 && (card.insideMapBoxPx?.h ?? 0) > 2,
  ).length,
  cardGeometry: entry.layout.firstScreen.cardGeometry,
  rootCardVisible: entry.layout.firstScreen.rootCardVisible?.nodeId ?? null,
  contextCard: entry.layout.firstScreen.contextCardVisible?.label ?? null,
  asideScrollsInside: entry.layout.columns.asideScrollsInside,
  satisfiesCriterion1:
    entry.layout.firstScreen.mapViewVisibleHeightPx >= MAP_FLOOR_PX &&
    entry.layout.firstScreen.mapHitTest?.inside === true &&
    entry.layout.firstScreen.visibleCardCount > 0,
}));
const failingStates = firstScreenByState.filter((entry) => !entry.satisfiesCriterion1);

/* --- B03's own question, state by state ---------------------------------------------- */
//
// For each state: which of the named usual commands are really on the first screen, which
// are only in the DOM, and what the groups are doing. The per-command detail is kept, not
// reduced to a count, so a regression names itself.
const primaryByState = matrix.map((entry) => {
  const byId = new Map();
  for (const command of entry.layout.commands) {
    // A `data-testid` can legitimately occur more than once (`expand-aggregate`,
    // `child-node`); for the named contract, on screen anywhere counts as on screen.
    const existing = byId.get(command.id);
    if (!existing || (!existing.onScreen && command.onScreen)) byId.set(command.id, command);
  }
  const rows = PRIMARY_COMMANDS.map((wanted) => {
    const found = byId.get(wanted.id) ?? null;
    return {
      id: wanted.id,
      why: wanted.why,
      inDom: found !== null,
      laidOut: found?.laidOut ?? false,
      onFirstScreen: found?.onScreen ?? false,
      // Whole, not merely aimable: how much of it the bands actually paint.
      fullyVisible: found?.fullyVisible ?? false,
      visibleHeightPx: found?.visibleHeightPx ?? 0,
      ownHeightPx: found?.ownHeightPx ?? 0,
      clippedBy: found?.clippedBy ?? [],
      group: found?.group ?? null,
    };
  });
  return {
    size: entry.size,
    state: entry.state,
    commandsInDom: entry.layout.commandsInDom,
    commandsLaidOut: entry.layout.commandsLaidOut,
    commandsOnFirstScreen: entry.layout.commandsOnFirstScreen,
    commandsFullyVisible: entry.layout.commandsFullyVisible,
    commandsClippedByABand: entry.layout.commandsClippedByABand,
    commandsInClosedGroups: entry.layout.commandsInClosedGroups,
    groups: entry.layout.groups,
    primary: rows,
    primaryOnFirstScreen: rows.filter((row) => row.onFirstScreen).length,
    primaryFullyVisible: rows.filter((row) => row.fullyVisible).length,
    primaryMissingFromFirstScreen: rows.filter((row) => !row.onFirstScreen).map((row) => row.id),
    primaryClippedByABand: rows
      .filter((row) => row.onFirstScreen && !row.fullyVisible)
      .map((row) => `${row.id} ${row.visibleHeightPx}/${row.ownHeightPx}px`),
    primaryMissingFromDom: rows.filter((row) => !row.inDom).map((row) => row.id),
  };
});
const statesMissingAPrimaryCommand = primaryByState.filter(
  (entry) => entry.primaryMissingFromFirstScreen.length > 0,
);
const statesClippingAPrimaryCommand = primaryByState.filter(
  (entry) => entry.primaryClippedByABand.length > 0,
);
const statesMissingAPrimaryCommandFromDom = primaryByState.filter(
  (entry) => entry.primaryMissingFromDom.length > 0,
);

/* --- ACTION-0111 / B03-O1: the groups, discoverable and usable, in every state -------- */
const entryByState = matrix.map((entry) => {
  const chromeGroups = entry.layout.groups.filter((group) => group.band === "chrome");
  const interactions = entry.entryPoints ?? [];
  return {
    size: entry.size,
    state: entry.state,
    // Whole, hit-tested, on the window as it opens: every group, both bands.
    summariesWhole:
      entry.layout.groups.length === DISCLOSURE_GROUPS.length &&
      entry.layout.groups.every((group) => group.summaryFullyVisible === true),
    chromeSummariesWhole: chromeGroups.length > 0 && chromeGroups.every((group) => group.summaryFullyVisible === true),
    summariesNotWhole: entry.layout.groups
      .filter((group) => group.summaryFullyVisible !== true)
      .map((group) => group.testid),
    chromeBandScrollsAtOpening: entry.layout.scrollRegions.chrome.scrollsInside === true,
    chromeBandBoxPx: entry.layout.scrollRegions.chrome.clientHeight,
    chromeBandContentPx: entry.layout.scrollRegions.chrome.scrollHeight,
    groupsInteracted: interactions.filter((group) => group.present).length,
    openedByMouse: interactions.length > 0 && interactions.every((group) => group.present && group.mouse.opened && group.mouse.closed),
    openedByKeyboard:
      interactions.length > 0 && interactions.every((group) => group.present && group.keyboard.opened && group.keyboard.closed),
    mouseRevealsEverything:
      interactions.length > 0 && interactions.every((group) => group.present && group.mouse.revealsEverythingItHolds),
    keyboardRevealsEverything:
      interactions.length > 0 && interactions.every((group) => group.present && group.keyboard.revealsEverythingItHolds),
    axTreeSaysExpanded:
      interactions.length > 0 &&
      interactions.every(
        (group) =>
          group.present &&
          group.mouse.axExpandedWhenOpen === true &&
          group.mouse.axExpandedWhenClosed === false &&
          group.keyboard.axExpandedWhenOpen === true,
      ),
    focusKeptOnSummary: interactions.length > 0 && interactions.every((group) => group.present && group.keyboard.focusKeptOnSummary),
    documentNeverScrolled:
      interactions.length > 0 &&
      interactions.every(
        (group) =>
          group.present && group.opening.scrollY === 0 && group.mouse.documentScrollY === 0 && group.keyboard.documentScrollY === 0,
      ),
    restoredClosed: interactions.length > 0 && interactions.every((group) => group.present && group.restoredClosed),
    reallyHiddenWhileClosed:
      interactions.length > 0 && interactions.every((group) => group.present && group.opening.reallyHiddenWhileClosed),
  };
});
const everyState = (key) => entryByState.every((entry) => entry[key] === true);

record.verdict = {
  // B03-O1 (ACTION-0111), first: a person who has not scrolled anything sees where the
  // advanced tools and the diagnostics are, and what they open shows everything they hold.
  groupEntryPointsWholeEveryState: everyState("summariesWhole"),
  statesWithAGroupEntryPointNotWhole: entryByState
    .filter((entry) => !entry.summariesWhole)
    .map((entry) => `${entry.size}/${entry.state}: ${entry.summariesNotWhole.join(",")}`),
  groupsOpenedByMouseEveryState: everyState("openedByMouse"),
  groupsOpenedByKeyboardEveryState: everyState("openedByKeyboard"),
  mouseRevealsEverythingEveryState: everyState("mouseRevealsEverything"),
  keyboardRevealsEverythingEveryState: everyState("keyboardRevealsEverything"),
  accessibilityTreeSaysExpandedEveryState: everyState("axTreeSaysExpanded"),
  focusKeptOnSummaryEveryState: everyState("focusKeptOnSummary"),
  documentNeverScrolledByAGroupEveryState: everyState("documentNeverScrolled"),
  groupsRestoredClosedEveryState: everyState("restoredClosed"),
  groupsReallyHideWhileClosedEveryState: everyState("reallyHiddenWhileClosed"),
  statesWhereTheChromeBandScrollsAtOpening: entryByState
    .filter((entry) => entry.chromeBandScrollsAtOpening)
    .map((entry) => `${entry.size}/${entry.state}: ${entry.chromeBandContentPx}/${entry.chromeBandBoxPx}px`),
  entryByState,
  // B03's verdict: the usual commands are really on the opening screen.

  primaryContractSatisfied: statesMissingAPrimaryCommand.length === 0,
  primaryCommandsInContract: PRIMARY_COMMANDS.length,
  statesMissingAPrimaryCommand: statesMissingAPrimaryCommand.map(
    (entry) => `${entry.size}/${entry.state}: ${entry.primaryMissingFromFirstScreen.join(",")}`,
  ),
  statesMissingAPrimaryCommandFromDom: statesMissingAPrimaryCommandFromDom.map(
    (entry) => `${entry.size}/${entry.state}: ${entry.primaryMissingFromDom.join(",")}`,
  ),
  // The stronger reading of the same contract: whole, not merely aimable.
  primaryContractSatisfiedWhole: statesClippingAPrimaryCommand.length === 0 && statesMissingAPrimaryCommand.length === 0,
  statesClippingAPrimaryCommand: statesClippingAPrimaryCommand.map(
    (entry) => `${entry.size}/${entry.state}: ${entry.primaryClippedByABand.join(", ")}`,
  ),
  worstPrimaryOnFirstScreen: Math.min(...primaryByState.map((entry) => entry.primaryOnFirstScreen)),
  worstPrimaryFullyVisible: Math.min(...primaryByState.map((entry) => entry.primaryFullyVisible)),
  worstCommandsFullyVisible: Math.min(...primaryByState.map((entry) => entry.commandsFullyVisible)),
  worstCommandsOnFirstScreen: Math.min(...primaryByState.map((entry) => entry.commandsOnFirstScreen)),
  bestCommandsOnFirstScreen: Math.max(...primaryByState.map((entry) => entry.commandsOnFirstScreen)),
  worstCommandsInDom: Math.min(...primaryByState.map((entry) => entry.commandsInDom)),
  bestMapVisibleHeightPx: Math.max(...firstScreenByState.map((entry) => entry.mapViewVisibleHeightPx)),
  mapReachesTheWishAt960:
    firstScreenByState
      .filter((entry) => entry.size === "960x640")
      .every((entry) => entry.mapViewVisibleHeightPx >= MAP_WISH_PX),
  groupsByState: primaryByState.map((entry) => ({
    size: entry.size,
    state: entry.state,
    groups: entry.groups.map((group) => ({
      testid: group.testid,
      band: group.band,
      open: group.open,
      summaryOnFirstScreen: group.summaryOnFirstScreen,
      summaryTabbable: group.summaryTabbable,
      summaryText: group.summaryText,
      focusableInside: group.focusableInside,
      heightPx: group.heightPx,
    })),
  })),
  primaryByState,
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
// B03 — the defect this slice is about: a usual command that is not on the opening screen,
// or a command the DOM no longer holds. Everything B02 guarded is still part of it.
record.primaryChromeDefectProven =
  statesMissingAPrimaryCommand.length > 0 || commandsLostAtSomeSize.length > 0;
record.chromeDefectProven =
  worstOverflow > 0 ||
  escapers.length > 0 ||
  scrollers.length > 0 ||
  clipped.length > 0 ||
  overlapping.length > 0 ||
  unreachable.length > 0 ||
  noFocusRing.length > 0 ||
  commandsLostAtSomeSize.length > 0;

check("criterion 1 — the usual commands are REALLY on the opening screen, every state", {
  satisfied: record.verdict.primaryContractSatisfied,
  satisfiedWhole: record.verdict.primaryContractSatisfiedWhole,
  commandsInContract: PRIMARY_COMMANDS.length,
  worstPrimaryOnFirstScreen: record.verdict.worstPrimaryOnFirstScreen,
  worstPrimaryFullyVisible: record.verdict.worstPrimaryFullyVisible,
  statesMissingAPrimaryCommand: record.verdict.statesMissingAPrimaryCommand,
  statesClippingAPrimaryCommand: record.verdict.statesClippingAPrimaryCommand,
  statesMissingAPrimaryCommandFromDom: record.verdict.statesMissingAPrimaryCommandFromDom,
});
check("criterion 1 ter (ACTION-0111) — the groups are discoverable from the first window and show everything they hold, in every state", {
  groupEntryPointsWholeEveryState: record.verdict.groupEntryPointsWholeEveryState,
  statesWithAGroupEntryPointNotWhole: record.verdict.statesWithAGroupEntryPointNotWhole,
  groupsOpenedByMouseEveryState: record.verdict.groupsOpenedByMouseEveryState,
  groupsOpenedByKeyboardEveryState: record.verdict.groupsOpenedByKeyboardEveryState,
  mouseRevealsEverythingEveryState: record.verdict.mouseRevealsEverythingEveryState,
  keyboardRevealsEverythingEveryState: record.verdict.keyboardRevealsEverythingEveryState,
  accessibilityTreeSaysExpandedEveryState: record.verdict.accessibilityTreeSaysExpandedEveryState,
  focusKeptOnSummaryEveryState: record.verdict.focusKeptOnSummaryEveryState,
  documentNeverScrolledByAGroupEveryState: record.verdict.documentNeverScrolledByAGroupEveryState,
  groupsRestoredClosedEveryState: record.verdict.groupsRestoredClosedEveryState,
  groupsReallyHideWhileClosedEveryState: record.verdict.groupsReallyHideWhileClosedEveryState,
  statesWhereTheChromeBandScrollsAtOpening: record.verdict.statesWhereTheChromeBandScrollsAtOpening,
});
check("criterion 1 bis — the map does not regress below what B02 MEASURED, not merely below what it was asked for", {
  satisfied: record.verdict.firstScreenSatisfied,
  floorPx: MAP_FLOOR_PX,
  wishPx: MAP_WISH_PX,
  worstVisibleMapHeightPx: record.verdict.worstVisibleMapHeightPx,
  bestVisibleMapHeightPx: record.verdict.bestMapVisibleHeightPx,
  wishReachedAt960: record.verdict.mapReachesTheWishAt960,
  failing: record.verdict.statesFailingFirstScreen,
});
check("criterion 2 — a restricted window and a closed group remove no command", {
  controlDigestsPerState: Object.fromEntries(Object.entries(perStateControls).map(([state, set]) => [state, set.size])),
  commandsLostAtSomeSize,
  // Presence in the DOM and presence on screen, side by side and never summed.
  worstCommandsInDom: record.verdict.worstCommandsInDom,
  worstCommandsOnFirstScreen: record.verdict.worstCommandsOnFirstScreen,
  bestCommandsOnFirstScreen: record.verdict.bestCommandsOnFirstScreen,
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

  // Criterion 2's other half, at the hardest size: the commands that now sit past the fold
  // of a band which scrolls inside itself. A box measurement cannot answer this — only a
  // real Tab walk can — so three of them are walked to, by name:
  //
  //   `brain-add-real-root` the first action of the composition band;
  //   `cross-check`         the LAST button of that band, the one furthest down;
  //   `map-legend-toggle`   the last button of the map column's own control band.
  //
  // Each must be reached, must end up inside the viewport, and the DOCUMENT must still be
  // at `scrollY=0` afterwards: the band scrolled, not the page.
  //
  // This runs BEFORE the `P-19` block below, which deliberately leaves a non-default
  // workspace for the second process; resetting the language after that would erase the
  // very thing the restart is meant to restore.
  await resizeTo(960, 640);
  await emulate("light", "no-preference");
  await setLocale("fr");
  await setDensity("comfortable");
  await quiet();
  const keyboardReach = {
    firstAction: await tabToControl('[data-testid="brain-add-real-root"]'),
    lastChromeCommand: await tabToControl('[data-testid="cross-check"]'),
    lastMapCommand: await tabToControl('[data-testid="map-legend-toggle"]'),
  };
  const readingAt960 = await evaluate(READ_FIRST_SCREEN);
  const regions = readingAt960.scrollRegions;
  record.keyboardReach = keyboardReach;
  record.scrollRegionsAt960 = regions;
  // The B02 walk, replayed verbatim and published verbatim. After the reorganisation
  // `cross-check` lives inside a CLOSED group, so a plain Tab walk is EXPECTED not to
  // reach it: that is what a disclosure is. The walk is kept anyway, because the honest
  // way to show what changed is to re-run the old measurement and let it say so, and
  // because `walkDisclosure` below is the measurement that answers for it.
  check("the B02 keyboard walk, replayed as-is (a closed group is expected to refuse it)", {
    ...keyboardReach,
    regions,
    documentStayedAtTheTop: Object.values(keyboardReach).every(
      (entry) => entry.presses === null || entry.documentScrollY === 0,
    ),
    commandsReachedByAPlainTabWalk: Object.entries(keyboardReach)
      .filter(([, entry]) => entry.presses !== null)
      .map(([name]) => name),
  });

  /* --- B03 criterion 2: the keyboard, through the named groups ---------------------- */
  //
  // One walk per group: Tab to its summary, `Enter`, Tab to the furthest command inside,
  // Shift+Tab back, `Enter` to close. Measured at 960x640, the hardest size.
  const disclosureWalks = [];
  for (const group of DISCLOSURE_GROUPS) {
    await evaluate(`(() => {
      window.scrollTo(0, 0);
      for (const el of document.querySelectorAll('details.app__group')) el.open = false;
    })()`);
    await pause(250);
    disclosureWalks.push(await walkDisclosure(group.testid, group.furthest));
  }
  record.disclosureWalks = disclosureWalks;
  const presentWalks = disclosureWalks.filter((walk) => walk.present);
  check("criterion 2 — every named group is opened by the keyboard, its furthest command reached, and closing it keeps the focus", {
    groupsDeclared: DISCLOSURE_GROUPS.map((group) => group.testid),
    groupsPresentInThisBuild: presentWalks.map((walk) => walk.group),
    everySummaryReachedByTab: presentWalks.length > 0 && presentWalks.every((walk) => walk.summaryReached),
    everyGroupOpenedByEnter: presentWalks.length > 0 && presentWalks.every((walk) => walk.openedByEnter),
    everyFurthestCommandReached: presentWalks
      .filter((walk) => walk.toFurthest !== null)
      .every((walk) => walk.toFurthest.reached === true),
    everyFurthestCommandInViewport: presentWalks
      .filter((walk) => walk.toFurthest?.reached)
      .every((walk) => walk.toFurthest.inViewport === true),
    everyGroupClosedByEnter: presentWalks.length > 0 && presentWalks.every((walk) => walk.closedByEnter),
    focusKeptOnEveryClose: presentWalks.length > 0 && presentWalks.every((walk) => walk.focusKeptOnSummaryAfterClosing),
    documentStayedAtTheTop: presentWalks.every((walk) => walk.documentStayedAtTheTop),
    walks: disclosureWalks,
  });

  // And the census at the hardest size, closed, which is the state the window opens in.
  await evaluate(`(() => {
    window.scrollTo(0, 0);
    for (const el of document.querySelectorAll('details.app__group')) el.open = false;
  })()`);
  await pause(250);
  const censusAt960 = await evaluate(READ_FIRST_SCREEN);
  record.censusAt960 = {
    commandsInDom: censusAt960.commandsInDom,
    commandsLaidOut: censusAt960.commandsLaidOut,
    commandsOnFirstScreen: censusAt960.commandsOnFirstScreen,
    commandsInClosedGroups: censusAt960.commandsInClosedGroups,
    mapViewVisibleHeightPx: censusAt960.firstScreen.mapViewVisibleHeightPx,
    groups: censusAt960.groups,
    chromeBands: censusAt960.chromeBands,
    scrollRegions: censusAt960.scrollRegions,
    commands: censusAt960.commands,
  };
  check("the census at 960x640, groups closed: presence in the DOM and presence on screen, counted apart", {
    commandsInDom: censusAt960.commandsInDom,
    commandsLaidOut: censusAt960.commandsLaidOut,
    commandsOnFirstScreen: censusAt960.commandsOnFirstScreen,
    commandsInClosedGroups: censusAt960.commandsInClosedGroups,
    mapViewVisibleHeightPx: censusAt960.firstScreen.mapViewVisibleHeightPx,
  });

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
  // And one named group deliberately left OPEN, so the second process answers the question
  // this slice raises: is a disclosure a preference? It is not, by design — nothing about
  // it is written anywhere — and the restart is what proves the claim either way.
  const openable = await evaluate(`(() => {
    const group = document.querySelector('details.app__group');
    if (!group) return null;
    group.open = true;
    return group.getAttribute('data-testid');
  })()`);
  await quiet();
  const left = await evaluate(`({
    locale: document.querySelector('[data-testid="language-en"]').getAttribute('aria-pressed'),
    density: document.documentElement.getAttribute('data-density'),
    motion: document.documentElement.getAttribute('data-motion'),
    legend: document.querySelector('[data-testid="map-legend-toggle"]').getAttribute('aria-expanded'),
    details: !!document.querySelector('.details'),
    selected: Number(document.querySelector('[data-card="true"][aria-selected="true"]')?.getAttribute('data-node-id') ?? 0) || null,
    openGroups: [...document.querySelectorAll('details.app__group[open]')].map((el) => el.getAttribute('data-testid')),
  })`);
  record.leftBehind = { ...left, groupLeftOpen: openable };
  check("P-19 / P-21 panel, language, density, motion, legend and one open group left behind for the restart", record.leftBehind);
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
    // B03 — the three counts that must not be confused, inside the digest, so a later
    // slice that quietly changes which commands are on screen changes this number too.
    entry.layout.commandsInDom,
    entry.layout.commandsLaidOut,
    entry.layout.commandsOnFirstScreen,
    entry.layout.commandsFullyVisible,
  ]),
);
await writeFile(join(proofRoot, `run-${phase}-pass${pass}.json`), JSON.stringify(record, null, 2));
for (const capture of captures) {
  await writeFile(join(proofRoot, capture.file), Buffer.from(capture.data, "base64"));
}
console.log(JSON.stringify({
  phase, pass, ok: true,
  primaryContractSatisfied: record.verdict.primaryContractSatisfied,
  primaryContractSatisfiedWhole: record.verdict.primaryContractSatisfiedWhole,
  worstPrimaryOnFirstScreen: record.verdict.worstPrimaryOnFirstScreen,
  worstPrimaryFullyVisible: record.verdict.worstPrimaryFullyVisible,
  worstCommandsOnFirstScreen: record.verdict.worstCommandsOnFirstScreen,
  groupEntryPointsWholeEveryState: record.verdict.groupEntryPointsWholeEveryState,
  groupsOpenedByMouseEveryState: record.verdict.groupsOpenedByMouseEveryState,
  groupsOpenedByKeyboardEveryState: record.verdict.groupsOpenedByKeyboardEveryState,
  mouseRevealsEverythingEveryState: record.verdict.mouseRevealsEverythingEveryState,
  keyboardRevealsEverythingEveryState: record.verdict.keyboardRevealsEverythingEveryState,
  accessibilityTreeSaysExpandedEveryState: record.verdict.accessibilityTreeSaysExpandedEveryState,
  statesWhereTheChromeBandScrollsAtOpening: record.verdict.statesWhereTheChromeBandScrollsAtOpening.length,
  firstScreenSatisfied: record.verdict.firstScreenSatisfied,
  worstVisibleMapHeightPx: record.verdict.worstVisibleMapHeightPx,
  primaryChromeDefectProven: record.primaryChromeDefectProven,
  chromeDefectProven: record.chromeDefectProven,
  digest: record.layoutDigest,
}));
ws.close();
process.exit(0);
