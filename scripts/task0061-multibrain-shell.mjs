// TASK-0061 — Stage B / B04: does the primary chrome survive a MULTI-BRAIN composition?
//
//   node scripts/task0061-multibrain-shell.mjs <port> <variant> <pass> <proofRoot> <head> <appPid> <phase> [<droppedBrainId>]
//   (seed JSON on stdin)
//
// `B03` (TASK-0060, VERIFIED) put thirteen usual commands and the three named group entry
// points whole on the opening screen, in eighteen states — every one of them with ONE brain
// displayed, a nominal status and no menu open. It also moved the composition to a single
// row and the sources into Diagnostics, and ACTION-0112 named what that change never met:
//
//   **two and three brains, names that wrap, a notice on screen, the composition menu open.**
//
// So this harness asks the same falsifiable question of those states, and publishes the
// answer whatever it is. It is `scripts/task0060-primary-chrome.mjs` with the same
// tripwires — horizontal overflow, escaping boxes, clipped controls, the control inventory,
// the command census clipped by every scrolling ancestor, axe-core, the group entry points
// from the first window — plus the readings a multi-brain bar needs:
//
// * the chips, one by one: whole on screen, name rendered in full, the accessible name
//   carrying the full name, the active one marked in words and by `aria-current`, the
//   remove button whole;
// * the composition menu, open: every item whole, and what the open list does to the thirteen
//   primary commands underneath it;
// * the notices: the product's own "not indexed yet" status (a registered brain nobody has
//   indexed), its own refusal of removing the last brain, and its own workspace corrections
//   (a brain that vanished from the catalogue between two processes);
// * Diagnostics: the source reference of EVERY displayed brain, read after the group is
//   opened, whole and in the window;
// * the keyboard: a real Tab sweep of the chrome, and a real arrow/Enter/Escape walk of the
//   composition menu, the chips and the remove buttons.
//
// Nothing here changes the product. A failing criterion is a measurement, not a script
// error: the script fails only when the measurement itself could not be taken, when the
// analysed trees moved (P-22), or when the product wrote where the contract forbids it.
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
const droppedBrainId = process.argv[9] ?? null;
assert(/^task0061-[a-f0-9]+$/.test(variant), "variant");
assert([1, 2, 3].includes(pass), "pass must be 1, 2 or 3");
assert(/^[a-f0-9]{40}$/.test(headTested ?? ""), "HEAD sha (argv[6]) required");
assert(Number.isInteger(appPid) && appPid > 0, "application pid (argv[7]) required");
assert(phase === "measure", "phase (argv[8]) must be measure");
if (pass === 3) assert(/^real-/.test(droppedBrainId ?? ""), "pass 3 needs the dropped brain id (argv[9])");

/** The acceptance floor: B04 may not regress below what B02 MEASURED. */
const MAP_FLOOR_PX = 240;

/** The thirteen commands B03 made whole on the opening screen: the contract B04 preserves. */
const PRIMARY_COMMANDS = [
  { id: "composition-add-trigger", why: "compose: add a brain to the view" },
  { id: "brain-add-real-root", why: "the only way a real folder enters FileTopo" },
  { id: "lifecycle-open", why: "open what is composed" },
  { id: "lifecycle-refresh", why: "bring the active brain up to date" },
  { id: "search-input", why: "find a folder or a file" },
  { id: "search-clear", why: "leave the search" },
  { id: "fit-composition", why: "frame the whole composition" },
  { id: "reset-view", why: "go back to the readable view" },
  { id: "map-legend-toggle", why: "read what the map draws" },
  { id: "language-fr", why: "the interface language" },
  { id: "language-en", why: "the interface language" },
  { id: "density-compact", why: "the density preference" },
  { id: "motion-reduce", why: "the motion preference" },
];

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
    // A \`position: fixed\` box is positioned against the window, not against the band it sits
    // in the DOM: no ancestor above it clips it. B04's composition menu is such a box.
    for (let parent = el.parentElement, child = el; parent; child = parent, parent = parent.parentElement) {
      if (getComputedStyle(child).position === 'fixed') break;
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
  const ellipsized = [];
  const hiddenHints = [];
  const escapers = [];
  const clipped = [];
  for (const el of document.querySelectorAll('.app, .app *')) {
    if (el.closest('svg')) continue;
    const over = el.scrollWidth - el.clientWidth;
    const style = getComputedStyle(el);
    // B04: the one ellipsis the contract allows — a chip's brain name, whose full text is in the
    // button's accessible name and in its title. It is published below, never silently skipped.
    if (over > 1 && el.classList.contains('composition__name') && style.textOverflow === 'ellipsis') {
      ellipsized.push({ text: (el.textContent ?? ''), overflowPx: over, title: el.closest('button')?.getAttribute('title') ?? null });
    } else if (over > 1 && el.classList.contains('composition__hint') && el.getBoundingClientRect().width <= 1.5) {
      // B04: the hint of a non-active chip, hidden from the eye (1 px box) and kept in the accessible
      // name. Its text is by design wider than its box; it is counted and published, not skipped.
      hiddenHints.push({ text: (el.textContent ?? '').trim(), insideAccessibleName: !!el.closest('button') });
    } else if (over > 1 && style.overflowX !== 'auto' && style.overflowX !== 'scroll') {
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
      // B04: when the summary is not whole, WHAT is on top of it at its centre, and whether a scrolling
      // band clipped it — "under the fold" and "under the add menu's layer" are different facts.
      summaryClippedBy: summary ? firstScreenStateOf(summary).clippedBy : null,
      summaryCoveredBy: (() => {
        if (!summary) return null;
        const r = summary.getBoundingClientRect();
        const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        if (!top || top === summary || summary.contains(top)) return null;
        return top.closest('.composition__menu') ? 'composition-menu-layer' : (top.tagName + '.' + String(top.className).slice(0, 30));
      })(),
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
    ellipsizedChipNames: ellipsized,
    visuallyHiddenChipHints: hiddenHints,
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
    // B04: what answered instead, when the summary did not.
    topAtCentre: top ? top.tagName + '.' + String(top.className).slice(0, 40) + ' ' + (top.getAttribute('data-testid') ?? '') : null,
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
    // A person does not click where the summary is not: when something else answers at that place, the
    // click would land on THAT (at 960x640 it landed on the legend toggle and opened the legend, which
    // moved the whole map column under the next measurement). So the strict attempt is made only when
    // the summary is really hit there; otherwise it is recorded as impossible, without clicking.
    if (whereNow.hit) await mouseClickAt(whereNow.x, whereNow.y);
    let afterMouseClose = await evaluate(READ_GROUP(group.testid));
    // B04: an opened group takes the whole row, so its own summary can land under the fold of a band
    // that cannot grow (960x640 with two rows of composition). B03's click, at the place the summary
    // was read, then hits something else and leaves the group open — and the next measurements of the
    // sequence would measure that leftover instead of the group. The strict result is kept as it is;
    // the person's remedy — bringing the summary back into view with the band's own scroll — is
    // tried next, and published separately, so the limit is a number and not a silent retry.
    const closedWithoutScrolling = afterMouseClose?.open === false;
    let closedAfterBandScroll = null;
    if (!closedWithoutScrolling) {
      await evaluate(`document.querySelector(${JSON.stringify(summarySelector)}).scrollIntoView({ block: 'nearest', inline: 'nearest' })`);
      const scrolled = await evaluate(READ_GROUP(group.testid));
      await mouseClickAt(scrolled.x, scrolled.y);
      afterMouseClose = await evaluate(READ_GROUP(group.testid));
      closedAfterBandScroll = afterMouseClose?.open === false;
      await evaluate(RESET_SCROLL);
    }
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
        topAtCentre: opening.hit ? null : opening.topAtCentre,
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
        closedWithoutScrolling,
        closedAfterBandScroll,
        // Where the summary was once the group was open, and whether anything but it answers there.
        summaryOnTheFirstScreenWhenOpened: whereNow?.hit === true,
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

Object.assign(KEYS, {
  ArrowDown: { code: "ArrowDown", vk: 40 },
  ArrowUp: { code: "ArrowUp", vk: 38 },
  End: { code: "End", vk: 35 },
  Escape: { code: "Escape", vk: 27 },
});

const KEY = { A: seed.brains[0], B: seed.brains[1], C: seed.brains[2], D: seed.brains[3] };
const idOf = (key) => KEY[key].brain;
const byBrainId = new Map(seed.brains.map((entry) => [entry.brain, entry]));
const keyOfBrain = (brainId) => Object.entries(KEY).find(([, entry]) => entry.brain === brainId)?.[0] ?? null;

const record = {
  task: "TASK-0061",
  stage: "B / B04",
  phase,
  pass,
  headTested,
  mapFloorPx: MAP_FLOOR_PX,
  primaryCommandContract: PRIMARY_COMMANDS,
  disclosureGroups: DISCLOSURE_GROUPS,
  // Fictitious names, ids and references, published so a reader can follow a chip to the
  // brain it stands for. No path is recorded: the harness-side roots never enter the artifact.
  fixtureBrains: seed.brains.map((entry) => ({
    key: keyOfBrain(entry.brain),
    brainId: entry.brain,
    name: entry.name,
    nameLengthCharacters: [...entry.name].length,
    sourceRef: entry.sourceRef,
    indexedByTheHarness: entry.indexed,
    position: entry.position,
  })),
  checks: [],
  findings: [],
};
const check = (label, value = true) => {
  record.checks.push({ label, value });
  return value;
};
const FORBIDDEN_DURING_MEASUREMENT =
  /^map_(refresh|rebuild|prepare_|reveal_node|copy_node_path|write_run_artifact|brain_exclusions_replace|brain_choose_real_root|brain_save_identity|relation_(?!engine_status$)|suggestion_)/;

await until("!!window.__TAURI_INTERNALS__");
const rootsOnDisk = pass === 3 ? seed.brains.filter((entry) => entry.brain !== droppedBrainId) : seed.brains;
const diskBefore = {};
for (const entry of seed.brains) {
  const listing = await walkDisk(entry.root);
  diskBefore[entry.folder] = { entries: listing.length + 1, hash: await hashTree(entry.root), listing };
}
const archiveChildren = diskBefore[KEY.A.folder].listing.filter((path) => /^archives\/[^/]+$/.test(path));
assert.equal(archiveChildren.length, 120, "the synthetic fixture is the one this harness judges");

// The three brains the harness indexes (the fourth is deliberately left unindexed).
if (pass === 1) {
  for (const key of ["A", "B", "C"]) await invoke("map_refresh", { brainId: idOf(key) });
}
const viewsAtSetup = {};
await until(`document.querySelectorAll('[data-testid="composed-canvas"] [data-node-id]').length > 0 || !!document.querySelector(${JSON.stringify(testid("lifecycle-open"))})`);
if (!(await evaluate(`document.querySelectorAll('[data-testid="composed-canvas"] [data-node-id]').length > 0`))) {
  if (await evaluate(`!!document.querySelector(${JSON.stringify(testid("lifecycle-open"))})`)) await click(testid("lifecycle-open"));
}
await until(`document.querySelectorAll('[data-testid="composed-canvas"] [data-node-id]').length > 0`);
await quiet();
for (const key of ["A", "B", "C"]) {
  if (pass === 3 && idOf(key) === droppedBrainId) continue;
  const view = await invoke("map_view", { brainId: idOf(key) });
  assert.equal(view.nodeCount, diskBefore[KEY[key].folder].entries, `Index cardinality equals the disk (${key})`);
  viewsAtSetup[key] = { indexed: view.nodeCount, viewBudget: view.viewBudget, materialized: view.materializedCount, indexRevision: view.indexRevision };
}
record.index = viewsAtSetup;
const view0 = await invoke("map_view", { brainId: idOf("A") });

{
  const catalogue = await invoke("map_brains");
  record.catalogue = catalogue.brains.map((brain) => ({ brainId: brain.brainId, name: brain.displayName, sourceKind: brain.sourceKind, harnessKey: keyOfBrain(brain.brainId) }));
}
const mark = wireCalls.length;
const matrix = [];
const captures = [];

/* --- composing, through the real controls ---------------------------------------------- */

const chipIds = () => evaluate(`[...document.querySelectorAll('.composition__focus')].map((el) => el.getAttribute('data-brain-id'))`);
const focusedId = () => evaluate(`document.querySelector('.composition__focus[aria-current="true"]')?.getAttribute('data-brain-id') ?? null`);
const triggerExpanded = () => evaluate(`document.querySelector('[data-testid="composition-add-trigger"]')?.getAttribute('aria-expanded')`);
async function setMenu(open) {
  if ((await triggerExpanded()) === String(open)) return;
  if (!open) {
    // B04-O1: the open menu is modal, so its scrim lies over the trigger too and a click there is a press on
    // the scrim. The way out a person has is Escape; if the focus was not in the menu, a press on the scrim.
    await press("Escape");
    if ((await triggerExpanded()) !== "false") {
      const [, viewHeight] = await evaluate("[innerWidth, innerHeight]");
      await mouseClickAt(3, viewHeight - 3);
    }
    await until(`document.querySelector('[data-testid="composition-add-trigger"]').getAttribute('aria-expanded') === 'false'`);
    await pause(250);
    return;
  }
  await click(testid("composition-add-trigger"));
  await until(`document.querySelector('[data-testid="composition-add-trigger"]').getAttribute('aria-expanded') === '${open}'`);
  await pause(250);
}
/** Brings the composition to `keys` and the focus to `focusKey` with real clicks on the real
 *  controls: the add menu, the remove buttons, the chips. Additions first, removals after,
 *  so the composition is never emptied on the way. */
async function composeTo(keys, focusKey) {
  await setMenu(false);
  const want = keys.map(idOf);
  for (const id of want) {
    if (!(await chipIds()).includes(id)) {
      await setMenu(true);
      await click(testid(`composition-add-item-${id}`));
      await until(`!!document.querySelector('[data-testid="composition-chip-${id}"]')`);
      await quiet();
    }
  }
  for (const id of await chipIds()) {
    if (!want.includes(id)) {
      await click(testid(`composition-remove-${id}`));
      await until(`!document.querySelector('[data-testid="composition-chip-${id}"]')`);
      await quiet();
    }
  }
  const target = idOf(focusKey);
  if ((await focusedId()) !== target) {
    await click(testid(`composition-chip-${target}`));
    await until(`document.querySelector('[data-testid="composition-chip-${target}"]').getAttribute('aria-current') === 'true'`);
    await quiet();
  }
  assert.deepEqual(await chipIds(), want, "the composition is the one the scenario names");
  assert.equal(await focusedId(), target, "the focus is the one the scenario names");
}

/* --- the composition-specific readings -------------------------------------------------- */

const READ_COMPOSITION = `(() => {
  const round = (n) => Math.round(n * 10) / 10;
  const rect = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: round(r.x), y: round(r.y), w: round(r.width), h: round(r.height), right: round(r.right), bottom: round(r.bottom) };
  };
  const chrome = document.querySelector('.app__chrome');
  const nav = document.querySelector('.app__brains');
  const chips = [...document.querySelectorAll('.composition__chips > li.composition__chip:not(.composition__chip--add)')].map((li) => {
    const focus = li.querySelector('.composition__focus');
    const remove = li.querySelector('.composition__remove');
    const name = li.querySelector('.composition__name');
    const state = li.querySelector('.composition__state');
    const hint = li.querySelector('.composition__hint');
    return {
      brainId: focus.getAttribute('data-brain-id'),
      current: focus.getAttribute('aria-current'),
      nameText: (name?.textContent ?? ''),
      nameScrollWidth: name ? name.scrollWidth : null,
      nameClientWidth: name ? name.clientWidth : null,
      nameRect: rect(name),
      focusRect: rect(focus),
      focusScrollWidth: focus.scrollWidth,
      focusClientWidth: focus.clientWidth,
      removeRect: rect(remove),
      removeAriaDisabled: remove.getAttribute('aria-disabled'),
      removeLabel: remove.getAttribute('aria-label'),
      focusTitle: focus.getAttribute('title'),
      stateWordWhole: state ? (state.getBoundingClientRect().right <= focus.getBoundingClientRect().right + 1 && state.getBoundingClientRect().width > 0) : null,
      stateWord: state ? state.textContent.trim() : null,
      hintWord: hint ? hint.textContent.trim() : null,
      disabled: focus.disabled,
    };
  });
  const tops = [...new Set(chips.map((chip) => Math.round(chip.focusRect.y)))].sort((l, r) => l - r);
  const trigger = document.querySelector('[data-testid="composition-add-trigger"]');
  const menu = document.querySelector('.composition__menu');
  const items = menu
    ? [...menu.querySelectorAll('[role="menuitem"]')].map((el) => ({
        brainId: el.getAttribute('data-brain-id'),
        text: (el.querySelector('.composition__name')?.textContent ?? ''),
        rect: rect(el),
      }))
    : [];
  const actions = document.querySelector('.app__brains .app__actions');
  const status = document.querySelector('.app__status');
  const corrections = document.querySelector('[data-testid="workspace-corrections"]');

  /* --- ACTION-0113 B04-O2: a notice is judged WHERE and WHEN it appears ------------------------
   *
   * Not "is it in the band's box", which is the question that said 0 px at 960x640: is the whole
   * notice inside the window, and does every point of it (the centre and four corners) answer a hit
   * test with the notice itself — nothing on top, no ancestor clipping it. Read before any scroll,
   * at the state's own opening: the reading harness has put every region at its origin. */
  const viewW = document.documentElement.clientWidth, viewH = document.documentElement.clientHeight;
  const probe = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const fractions = [[0.5, 0.5], [0.03, 0.12], [0.97, 0.12], [0.03, 0.88], [0.97, 0.88]];
    const answers = fractions.map(([fx, fy]) => {
      const x = r.left + Math.min(Math.max(r.width * fx, 1), Math.max(r.width - 1, 1));
      const y = r.top + Math.min(Math.max(r.height * fy, 1), Math.max(r.height - 1, 1));
      const top = document.elementFromPoint(x, y);
      return !!top && (top === el || el.contains(top));
    });
    const inWindow = r.width > 0 && r.height > 0 && r.left >= -0.5 && r.top >= -0.5 && r.right <= viewW + 0.5 && r.bottom <= viewH + 0.5;
    return {
      rect: rect(el), inWindow,
      // The window part of the box, in CSS px (a notice cut by the window's edge is not whole).
      visibleHeightPx: round(Math.max(0, Math.min(r.bottom, viewH) - Math.max(r.top, 0))),
      ownHeightPx: round(r.height),
      answersAtCentre: answers[0], answersAtEveryPoint: answers.every(Boolean),
      whole: inWindow && answers.every(Boolean),
    };
  };
  const layer = document.querySelector('[data-testid="app-feedback"]');
  const intersection = (a, b) => {
    const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    return w > 0.5 && h > 0.5 ? { w, h } : null;
  };
  let feedback = null;
  if (layer) {
    const layerBox = layer.getBoundingClientRect();
    // The notices themselves (the layer's own box is wider than they are and takes no pointer).
    const notices = [...layer.children].map((child) => {
      const b = child.getBoundingClientRect();
      return { left: Math.max(b.left, layerBox.left), top: Math.max(b.top, layerBox.top), right: Math.min(b.right, layerBox.right), bottom: Math.min(b.bottom, layerBox.bottom) };
    }).filter((b) => b.right > b.left && b.bottom > b.top);
    const covers = (el) => !!el && notices.some((n) => intersection(n, el.getBoundingClientRect()));
    const primaryIds = ${JSON.stringify(PRIMARY_COMMANDS.map((command) => command.id))};
    const mapView = document.querySelector('.map-view');
    const mapBox = mapView ? mapView.getBoundingClientRect() : null;
    const mapCovered = mapBox ? notices.reduce((sum, n) => { const i = intersection(n, mapBox); return sum + (i ? i.h : 0); }, 0) : 0;
    const mapCoveredArea = mapBox ? notices.reduce((sum, n) => { const i = intersection(n, mapBox); return sum + (i ? i.w * i.h : 0); }, 0) : 0;
    feedback = {
      rect: rect(layer),
      position: getComputedStyle(layer).position,
      insideTheChromeBand: !!layer.closest('.app__chrome'),
      scrollsItself: layer.scrollHeight > layer.clientHeight + 1,
      noticeRects: notices.map((n) => ({ x: round(n.left), y: round(n.top), w: round(n.right - n.left), h: round(n.bottom - n.top) })),
      primariesUnderANotice: primaryIds.filter((id) => covers(document.querySelector('[data-testid="' + id + '"]'))),
      groupSummariesUnderANotice: [...document.querySelectorAll('details.app__group > summary')]
        .filter((summary) => covers(summary)).map((summary) => summary.parentElement.getAttribute('data-testid')),
      chipsOrMenuTriggerUnderANotice: [...document.querySelectorAll('.composition__focus, .composition__remove, [data-testid="composition-add-trigger"]')]
        .filter((el) => covers(el)).map((el) => el.getAttribute('data-testid')),
      // The map is the thing the notice may touch; how much, is published rather than judged.
      mapViewOverlapHeightPx: round(mapCovered),
      mapViewOverlapFraction: mapBox && mapBox.width * mapBox.height > 0 ? Math.round((mapCoveredArea / (mapBox.width * mapBox.height)) * 1000) / 1000 : null,
      mapViewHeightPx: mapBox ? round(mapBox.height) : null,
      mapViewVisibleHeightPx: mapBox ? round(Math.max(0, Math.min(mapBox.bottom, viewH) - Math.max(mapBox.top, 0))) : null,
      asideUnderANotice: covers(document.querySelector('.app__aside')),
      mapControlsUnderANotice: covers(document.querySelector('.app__map-controls')),
    };
  }
  return {
    feedback,
    statusProbe: probe(status),
    statusDismissProbe: probe(document.querySelector('[data-testid="status-dismiss"]')),
    correctionsProbe: probe(corrections),
    correctionsDismissProbe: probe(document.querySelector('[data-testid="workspace-corrections-dismiss"]')),
    navRect: rect(nav),
    barRect: rect(document.querySelector('[data-testid="composition-bar"]')),
    actionsRect: rect(actions),
    chromeBand: chrome ? {
      clientHeight: chrome.clientHeight, scrollHeight: chrome.scrollHeight, scrollTop: chrome.scrollTop,
      scrollsInside: chrome.scrollHeight - chrome.clientHeight > 1, rect: rect(chrome),
    } : null,
    chips,
    chipRows: tops.length,
    trigger: trigger ? {
      rect: rect(trigger), expanded: trigger.getAttribute('aria-expanded'), disabled: trigger.disabled,
      title: trigger.getAttribute('title'), text: (trigger.textContent ?? '').trim(),
    } : null,
    menu: menu ? { rect: rect(menu), position: getComputedStyle(menu).position, role: menu.getAttribute('role'), items } : null,
    status: status ? { text: (status.textContent ?? '').trim(), rect: rect(status), role: status.getAttribute('role') } : null,
    corrections: corrections ? {
      rect: rect(corrections),
      words: corrections.getAttribute('data-corrections'),
      lines: [...corrections.querySelectorAll('li')].map((li) => (li.textContent ?? '').trim()),
      dismissRect: rect(corrections.querySelector('button')),
    } : null,
  };
})()`;

/** How much of the ACTIVE element a person actually sees: the window intersected with the
 *  client box of every scrolling ancestor — the clip B03 learnt to apply. */
const ACTIVE_VISIBILITY = `(() => {
  const el = document.activeElement;
  if (!el || el === document.body) return { id: null, isBody: true };
  const r = el.getBoundingClientRect();
  let left = Math.max(r.left, 0), top = Math.max(r.top, 0);
  let right = Math.min(r.right, document.documentElement.clientWidth), bottom = Math.min(r.bottom, document.documentElement.clientHeight);
  for (let parent = el.parentElement, child = el; parent; child = parent, parent = parent.parentElement) {
    if (getComputedStyle(child).position === 'fixed') break;
    const style = getComputedStyle(parent);
    if (!/auto|scroll|hidden|clip/.test(style.overflowX + ' ' + style.overflowY)) continue;
    const box = parent.getBoundingClientRect();
    const padLeft = box.left + parent.clientLeft, padTop = box.top + parent.clientTop;
    left = Math.max(left, padLeft); top = Math.max(top, padTop);
    right = Math.min(right, padLeft + parent.clientWidth); bottom = Math.min(bottom, padTop + parent.clientHeight);
  }
  const w = Math.max(0, right - left), h = Math.max(0, bottom - top);
  const style = getComputedStyle(el);
  const region = el.closest('.app__chrome') ? 'chrome' : el.closest('.app__map-controls') ? 'mapControls' : el.closest('.app__aside') ? 'aside' : 'other';
  return {
    id: el.getAttribute('data-testid') ?? (el.getAttribute('aria-label') || (el.textContent ?? '').trim()).slice(0, 40),
    tag: el.tagName, isBody: false, region,
    insideGroup: el.closest('details.app__group')?.getAttribute('data-testid') ?? null,
    wholeInWindow: w >= r.width - 1 && h >= r.height - 1 && r.width > 0,
    visibleHeightPx: Math.round(h), ownHeightPx: Math.round(r.height),
    outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth,
    documentScrollY: Math.round(window.scrollY),
    expanded: el.getAttribute('aria-expanded'),
    current: el.getAttribute('aria-current'),
  };
})()`;

/** A real Tab sweep of the chrome band: the first control to the first control that is not in
 *  the band. Every stop is published with how much of it is really visible when it holds focus. */
async function chromeTabSweep(limit = 90) {
  await evaluate(`(() => {
    window.scrollTo(0, 0);
    for (const region of document.querySelectorAll('.app, .app *')) { if (region.scrollTop !== 0) region.scrollTop = 0; }
    document.querySelector('.app button, .app input, .app select, .app summary')?.focus({ preventScroll: true });
  })()`);
  const first = await evaluate(ACTIVE_VISIBILITY);
  const stops = [{ presses: 0, ...first }];
  let leftChromeAt = null;
  for (let presses = 1; presses <= limit; presses += 1) {
    await press("Tab");
    const at = await evaluate(ACTIVE_VISIBILITY);
    if (at.isBody || at.region !== "chrome") {
      leftChromeAt = presses;
      break;
    }
    stops.push({ presses, ...at });
  }
  await evaluate(RESET_SCROLL);
  const losses = stops.filter((stop) => stop.wholeInWindow !== true).map((stop) => `${stop.id} ${stop.visibleHeightPx}/${stop.ownHeightPx}px`);
  return {
    stops: stops.length,
    leftChromeAfterPresses: leftChromeAt,
    everyStopWholeWhenFocused: losses.length === 0,
    stopsNotWholeWhenFocused: losses,
    everyStopHasAFocusRing: stops.every((stop) => stop.outlineStyle !== "none" && parseFloat(stop.outlineWidth) >= 1),
    documentNeverScrolled: stops.every((stop) => stop.documentScrollY === 0),
    order: stops.map((stop) => stop.id),
  };
}

const READ_SOURCES = `(() => {
  const chrome = document.querySelector('.app__chrome').getBoundingClientRect();
  return [...document.querySelectorAll('[data-testid="brain-sources"] li')].map((li) => {
    li.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    const r = li.getBoundingClientRect();
    const top = document.elementFromPoint(r.x + Math.min(r.width / 2, 40), r.y + r.height / 2);
    return {
      text: (li.textContent ?? '').trim(),
      laidOut: r.width > 0 && r.height > 0,
      wholeInWindow: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight,
      wholeInBand: r.top >= chrome.top - 1 && r.bottom <= chrome.bottom + 1 && r.left >= chrome.left - 1 && r.right <= chrome.right + 1,
      hit: !!top && (top === li || li.contains(top)),
      h: Math.round(r.height), w: Math.round(r.width),
    };
  });
})()`;
/** Diagnostics is where B03 moved the source references; criterion 5 asks that the references of
 *  EVERY displayed brain are there. Opened by a real click on its summary, read, closed again. */
async function measureSources(displayedKeys) {
  const summary = `${testid("chrome-diagnostics")} > summary`;
  await evaluate(RESET_SCROLL);
  const was = await evaluate(`document.querySelector(${JSON.stringify(testid("chrome-diagnostics"))}).open`);
  if (!was) await click(summary);
  await until(`document.querySelector(${JSON.stringify(testid("chrome-diagnostics"))}).open === true`);
  await pause(150);
  const rows = await evaluate(READ_SOURCES);
  const expected = displayedKeys.map((key) => ({ key, name: KEY[key].name, ref: KEY[key].sourceRef }));
  const found = expected.map((entry) => {
    const row = rows.find((candidate) => candidate.text.includes(entry.name) && candidate.text.includes(entry.ref));
    return { key: entry.key, present: !!row, laidOut: row?.laidOut ?? false, whole: !!row && row.wholeInWindow && row.wholeInBand, hit: row?.hit ?? false, textLength: row?.text.length ?? 0 };
  });
  await click(summary);
  await until(`document.querySelector(${JSON.stringify(testid("chrome-diagnostics"))}).open === false`);
  await evaluate(RESET_SCROLL);
  return {
    expectedBrains: expected.length,
    listed: rows.length,
    everyDisplayedBrainReferenced: found.every((entry) => entry.present),
    onlyDisplayedBrainsListed: rows.length === expected.length,
    everyReferenceWholeAndReachable: found.every((entry) => entry.present && entry.whole && entry.hit),
    perBrain: found,
  };
}

/* --- one state, measured ------------------------------------------------------------------- */

const PUBLISHED_CAPTURES = new Set([
  "960x640/mono-A", "960x640/two-focusB-fr-light", "960x640/three-focusC-fr-light",
  "960x640/three-focusC-en-dark-compact", "960x640/two-menu-open-fr-light", "960x640/three-menu-open-en-dark",
  "960x640/four-unindexed-notice-fr-light", "960x640/single-C-refused-removal-en-light",
  "1280x800/three-focusC-fr-light", "1366x768/three-focusC-en-dark-compact",
  "960x640/corrected-fr-light", "960x640/corrected-en-dark-compact", "960x640/restored",
]);

/* --- ACTION-0113 B04-O1: the open menu is modal, and what it covers is measured, not assumed ----
 *
 * While the add menu is open its layer (and the scrim under it) lies over whatever is under it — at
 * 960x640 the Diagnostics summary. The strict reading ("is every group summary whole?") is KEPT as it
 * is and stays false in those states: nothing here turns it green. What is measured instead is the
 * promise a modal makes, by real input, group by group, in the very state the matrix measured:
 *
 *   a  the first mouse press on the covered summary closes the menu and does NOT open the group
 *      (the scrim consumed it: that is what modal means);
 *   b  the summary is then whole and answers a hit test, and the next press opens the group;
 *   c  Escape closes the menu, gives the focus back to the trigger, and the whole
 *      group-activation measurement (mouse AND keyboard) then runs in that same composition.
 *
 * The menu is reopened at the end, so the state is left as the matrix found it. */
async function measureMenuModal() {
  const reopen = async () => {
    if ((await triggerExpanded()) !== "true") {
      await evaluate(RESET_SCROLL);
      await click(testid("composition-add-trigger"));
      await until(`document.querySelector('[data-testid="composition-add-trigger"]').getAttribute('aria-expanded') === 'true'`);
      await pause(250);
    }
    await evaluate(RESET_SCROLL);
  };
  const groups = [];
  for (const group of DISCLOSURE_GROUPS) {
    await reopen();
    const before = await evaluate(READ_GROUP(group.testid));
    const row = { group: group.testid, present: before !== null };
    if (!before) {
      groups.push(row);
      continue;
    }
    row.answeredAtItsCentreWhileTheMenuIsOpen = before.hit ? "the summary itself" : before.topAtCentre;
    const [viewWidth, viewHeight] = await evaluate("[innerWidth, innerHeight]");
    row.centreInWindow = before.x >= 0 && before.x <= viewWidth && before.y >= 0 && before.y <= viewHeight;
    if (!row.centreInWindow) {
      row.pressed = false;
      groups.push(row);
      continue;
    }
    await mouseClickAt(before.x, before.y);
    row.pressed = true;
    row.menuClosedByThePress = (await triggerExpanded()) === "false";
    const afterPress = await evaluate(READ_GROUP(group.testid));
    row.groupStillClosedAfterThePress = afterPress?.open === false;
    row.backdropGoneAfterThePress = await evaluate(`!document.querySelector('[data-testid="composition-menu-backdrop"]')`);
    await evaluate(RESET_SCROLL);
    const reread = await evaluate(READ_GROUP(group.testid));
    row.summaryAnswersOnceTheMenuIsClosed = reread?.hit === true;
    if (reread?.hit) await mouseClickAt(reread.x, reread.y);
    const opened = await evaluate(READ_GROUP(group.testid));
    row.activatedByTheNextPress = opened?.open === true;
    await evaluate(`(() => { document.querySelector(${JSON.stringify(testid(group.testid))}).open = false; })()`);
    await evaluate(RESET_SCROLL);
    groups.push(row);
  }
  await reopen();
  await press("Escape");
  await pause(250);
  const escape = {
    menuClosed: (await triggerExpanded()) === "false",
    focusBackOnTheTrigger: (await activeElement()).id === "composition-add-trigger",
    backdropGone: await evaluate(`!document.querySelector('[data-testid="composition-menu-backdrop"]')`),
  };
  await evaluate(RESET_SCROLL);
  const layoutAfterEscape = await evaluate(READ_FIRST_SCREEN);
  escape.groupSummariesWhole = layoutAfterEscape.groups.length === DISCLOSURE_GROUPS.length && layoutAfterEscape.groups.every((entry) => entry.summaryFullyVisible === true);
  const entryPointsAfterModalClose = await measureGroupEntryPoints();
  await evaluate(READ_FIRST_SCREEN);
  await reopen();
  return { groups, escape, entryPointsAfterModalClose };
}

/** A mouse press where the control IS, without scrolling anything first: the whole point of the notice
 *  contract is that the button is there when the notice appears. `click()` above scrolls its target into
 *  view and would hide exactly the defect. */
async function pressWithoutScrolling(selector) {
  await evaluate(RESET_SCROLL);
  const where = await evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const x = r.x + r.width / 2, y = r.y + r.height / 2;
    const top = document.elementFromPoint(x, y);
    return { x, y, hit: !!top && (top === el || el.contains(top)),
      inWindow: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth,
      chromeScrollTop: Math.round(document.querySelector('.app__chrome')?.scrollTop ?? 0), documentScrollY: Math.round(window.scrollY) };
  })()`);
  if (where?.hit) await mouseClickAt(where.x, where.y);
  return where;
}

/** Brings the product's own notice back, by the same real gesture that raised it the first time. */
async function reRaise(scenario) {
  if (scenario.notice === "unindexed") {
    const dropped = idOf("D");
    if (await evaluate(`!!document.querySelector('[data-testid="composition-chip-${dropped}"]')`)) {
      await click(testid(`composition-remove-${dropped}`));
      await until(`!document.querySelector('[data-testid="composition-chip-${dropped}"]')`);
      await quiet();
    }
    await composeTo(scenario.keys, scenario.focus);
  }
  await raiseNotice(scenario);
}

/** The status notice's close control, by every route a person has, from the state where it appeared:
 *  the real mouse with no scroll first; a real Tab walk from the top of the window and Enter; Escape. */
async function noticeInteractions(scenario) {
  const present = () => evaluate(`!!document.querySelector('[data-testid="status-notice"]')`);
  const out = {};
  const mouse = await pressWithoutScrolling(testid("status-dismiss"));
  out.mouse = {
    dismissAimableAtAppearance: mouse?.hit === true && mouse?.inWindow === true,
    chromeBandScrollTopBeforeThePress: mouse?.chromeScrollTop ?? null,
    documentScrollYBeforeThePress: mouse?.documentScrollY ?? null,
    noticeGoneAfterThePress: !(await present()),
  };
  await reRaise(scenario);
  await evaluate(RESET_SCROLL);
  const tab = await tabToControl(testid("status-dismiss"), 160);
  out.keyboard = {
    reachedByTab: tab.presses !== null,
    tabPresses: tab.presses,
    wholeInWindowWhenFocused: tab.inViewport ?? null,
    hasAFocusRing: tab.presses !== null ? tab.outlineStyle !== "none" && parseFloat(tab.outlineWidth) > 0 : null,
    documentScrollY: tab.documentScrollY ?? null,
  };
  if (tab.presses !== null) {
    await press("Enter");
    out.keyboard.noticeGoneAfterEnter = !(await present());
  }
  await reRaise(scenario);
  await evaluate(RESET_SCROLL);
  await evaluate(`document.activeElement?.blur?.()`);
  await press("Escape");
  out.escape = { noticeGoneAfterEscapeWithTheFocusOnTheDocument: !(await present()) };
  // Left as found: the notice is on screen again, for whatever follows.
  await reRaise(scenario);
  await evaluate(RESET_SCROLL);
  return out;
}

/** A real Tab walk to a control, without pressing it: how far the keyboard has to go, and whether the
 *  control is whole in the window and carries a focus ring when it gets there. */
async function keyboardReach(selector) {
  await evaluate(RESET_SCROLL);
  const tab = await tabToControl(selector, 160);
  await evaluate(`document.activeElement?.blur?.()`);
  await evaluate(RESET_SCROLL);
  return {
    reachedByTab: tab.presses !== null,
    tabPresses: tab.presses,
    wholeInWindowWhenFocused: tab.inViewport ?? null,
    hasAFocusRing: tab.presses !== null ? tab.outlineStyle !== "none" && parseFloat(tab.outlineWidth) > 0 : null,
    documentScrollY: tab.documentScrollY ?? null,
  };
}

async function measureState({ size, granted, scenario, entryPoints = true, aside = false, sources = true }) {
  await quiet();
  await pause(500); // let the ResizeObserver-driven re-render settle
  const layout = await evaluate(READ_FIRST_SCREEN);
  assert.deepEqual(layout.cssViewport, [size.width, size.height], `the window drifted during ${size.label}/${scenario.id}`);
  assert.equal(layout.mediaMatches.dark, scenario.scheme === "dark", `prefers-color-scheme not applied at ${size.label}/${scenario.id}`);
  assert.equal(layout.mediaMatches.reduceMotion, scenario.motion === "reduce", `prefers-reduced-motion not applied at ${size.label}/${scenario.id}`);
  // Read at the top of the document, with every band at its origin — no interaction yet.
  const composition = await evaluate(READ_COMPOSITION);
  const ax = {};
  for (const chip of composition.chips) ax[chip.brainId] = await axOf(`[data-testid="composition-chip-${chip.brainId}"]`);
  const triggerAx = await axOf(testid("composition-add-trigger"));
  const key = `${size.label}/${scenario.id}`;
  const shot = await send("Page.captureScreenshot", { format: "png" });
  const bytes = Buffer.from(shot.data, "base64");
  const file = `TASK-0061-${size.label}-${scenario.id}.png`;
  await writeFile(join(proofRoot, file), bytes);
  captures.push({
    key, file, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex"),
    scrollYAtCapture: await evaluate("Math.round(window.scrollY)"), published: PUBLISHED_CAPTURES.has(key),
  });

  const menuOpen = composition.trigger?.expanded === "true";
  let entries = null;
  let sweep = null;
  let toAside = null;
  let sourcesReading = null;
  if (!menuOpen) {
    if (entryPoints) {
      entries = await measureGroupEntryPoints();
      await evaluate(READ_FIRST_SCREEN);
    }
    sweep = await chromeTabSweep();
    if (aside) toAside = await tabToAside();
    if (sources) sourcesReading = await measureSources(scenario.keys);
  }
  const axe = await axeRun();
  const menuModal = menuOpen ? await measureMenuModal() : null;
  const correctionsKeyboard = composition.corrections ? await keyboardReach(testid("workspace-corrections-dismiss")) : null;
  return {
    size: size.label,
    state: scenario.id,
    requested: { ...scenario },
    hostWindow: granted,
    layout,
    composition,
    menuModal,
    entryPointsAfterModalClose: menuModal?.entryPointsAfterModalClose ?? null,
    correctionsKeyboard,
    chipAccessibleNames: Object.fromEntries(
      Object.entries(ax).map(([brainId, node]) => [brainId, node ? { role: node.role, name: node.name } : null]),
    ),
    triggerAccessibleName: triggerAx ? { role: triggerAx.role, name: triggerAx.name } : null,
    menuOpen,
    entryPoints: entries,
    entryPointsNotMeasuredBecause: menuOpen
      ? "the composition menu is open and MODAL: its scrim takes the first press, so a group cannot be activated through it. Group visibility is still read above, strictly. What the modal promises — the first press closes it without activating, the next one activates, Escape closes it and gives the focus back — is measured in `menuModal`, and the whole group-activation measurement runs after the Escape in `entryPointsAfterModalClose`."
      : null,
    chromeTabSweep: sweep,
    keyboardToAside: toAside,
    sources: sourcesReading,
    axe: { version: axeManifest.version, violations: axe.violations, incomplete: axe.incomplete, passes: axe.passes },
  };
}

/* --- the judgement of one state ------------------------------------------------------------- */

function judge(entry) {
  const layout = entry.layout;
  const byId = new Map();
  for (const command of layout.commands) {
    const existing = byId.get(command.id);
    if (!existing || (!existing.onScreen && command.onScreen)) byId.set(command.id, command);
  }
  const primary = PRIMARY_COMMANDS.map((wanted) => {
    const found = byId.get(wanted.id) ?? null;
    return {
      id: wanted.id, inDom: found !== null, onFirstScreen: found?.onScreen ?? false, fullyVisible: found?.fullyVisible ?? false,
      visibleHeightPx: found?.visibleHeightPx ?? 0, ownHeightPx: found?.ownHeightPx ?? 0, clippedBy: found?.clippedBy ?? [],
    };
  });
  const expectedBrains = entry.requested.keys.map(idOf);
  const chips = entry.composition.chips.map((chip) => {
    const own = byBrainId.get(chip.brainId);
    const focusCommand = byId.get(`composition-chip-${chip.brainId}`) ?? null;
    const removeCommand = byId.get(`composition-remove-${chip.brainId}`) ?? null;
    const accessible = entry.chipAccessibleNames[chip.brainId];
    const isFocus = chip.brainId === idOf(entry.requested.focus);
    return {
      key: keyOfBrain(chip.brainId),
      chipWhole: focusCommand?.fullyVisible === true,
      chipOnScreen: focusCommand?.onScreen === true,
      removeWhole: removeCommand?.fullyVisible === true,
      removeOnScreen: removeCommand?.onScreen === true,
      chipVisibleHeightPx: focusCommand?.visibleHeightPx ?? 0,
      chipOwnHeightPx: focusCommand?.ownHeightPx ?? 0,
      chipClippedBy: focusCommand?.clippedBy ?? [],
      removeClippedBy: removeCommand?.clippedBy ?? [],
      // The name is rendered in full when the text is the registered one and no part of it is cut off.
      nameRenderedInFull: chip.nameText === own.name,
      nameNotCutOff: chip.nameScrollWidth <= chip.nameClientWidth + 1,
      fullNameInTitle: typeof chip.focusTitle === "string" && chip.focusTitle.includes(own.name),
      activeStateWordWhole: chip.current === "true" ? chip.stateWordWhole === true : true,
      accessibleNameCarriesTheFullName: !!accessible && accessible.name.includes(own.name),
      markedActive: isFocus ? chip.current === "true" && !!chip.stateWord : chip.current === null,
      stateWord: chip.stateWord ?? chip.hintWord,
      widthPx: chip.focusRect.w,
      heightPx: chip.focusRect.h,
    };
  });
  const menu = entry.composition.menu;
  const menuItems = (menu?.items ?? []).map((item) => {
    const command = byId.get(`composition-add-item-${item.brainId}`) ?? null;
    // The catalogue also holds the product's three built-in synthetic brains: their names are
    // read from the catalogue the product itself reported, never assumed.
    const own = byBrainId.get(item.brainId) ?? { name: record.catalogue.find((brain) => brain.brainId === item.brainId)?.name ?? null };
    return {
      key: keyOfBrain(item.brainId), whole: command?.fullyVisible === true, onScreen: command?.onScreen === true,
      nameInFull: item.text === own.name, visibleHeightPx: command?.visibleHeightPx ?? 0, ownHeightPx: command?.ownHeightPx ?? 0,
      clippedBy: command?.clippedBy ?? [],
    };
  });
  const escapersOrOverflow =
    layout.documentOverflowX > 0 || layout.viewportEscapers.length > 0 || layout.sidewaysScrollers.length > 0 || layout.clippedControls.length > 0;
  const corrections = entry.composition.corrections;
  const dismiss = byId.get("workspace-corrections-dismiss") ?? null;
  const mapOk =
    layout.firstScreen.mapViewVisibleHeightPx >= MAP_FLOOR_PX &&
    layout.firstScreen.mapHitTest?.inside === true &&
    layout.firstScreen.visibleCardCount > 0;
  const groupsWhole = layout.groups.length === DISCLOSURE_GROUPS.length && layout.groups.every((group) => group.summaryFullyVisible === true);
  const feedback = entry.composition.feedback;
  const statusDismiss = byId.get("status-dismiss") ?? null;
  const statusShown = entry.composition.status !== null;
  const correctionsShown = corrections !== null;
  const statusWhole = statusShown ? entry.composition.statusProbe?.whole === true : null;
  const statusDismissWhole = statusShown ? entry.composition.statusDismissProbe?.whole === true && statusDismiss?.fullyVisible === true : null;
  const correctionsWhole = correctionsShown ? entry.composition.correctionsProbe?.whole === true : null;
  const correctionsDismissWhole = correctionsShown ? entry.composition.correctionsDismissProbe?.whole === true && dismiss?.fullyVisible === true : null;
  const notices = {
    statusShown,
    correctionsShown,
    statusWholeAtAppearance: statusWhole,
    statusDismissWholeAtAppearance: statusDismissWhole,
    statusVisibleHeightPx: entry.composition.statusProbe?.visibleHeightPx ?? null,
    statusOwnHeightPx: entry.composition.statusProbe?.ownHeightPx ?? null,
    correctionsWholeAtAppearance: correctionsWhole,
    correctionsDismissWholeAtAppearance: correctionsDismissWhole,
    correctionsVisibleHeightPx: entry.composition.correctionsProbe?.visibleHeightPx ?? null,
    correctionsOwnHeightPx: entry.composition.correctionsProbe?.ownHeightPx ?? null,
    presentableAtAppearance: (statusWhole ?? true) && (statusDismissWhole ?? true) && (correctionsWhole ?? true) && (correctionsDismissWhole ?? true),
    layerPosition: feedback?.position ?? null,
    layerInsideTheChromeBand: feedback?.insideTheChromeBand ?? null,
    layerScrollsItself: feedback?.scrollsItself ?? null,
    noticeRects: feedback?.noticeRects ?? [],
    primariesUnderANotice: feedback?.primariesUnderANotice ?? [],
    groupSummariesUnderANotice: feedback?.groupSummariesUnderANotice ?? [],
    chipsOrTriggerUnderANotice: feedback?.chipsOrMenuTriggerUnderANotice ?? [],
    asideUnderANotice: feedback?.asideUnderANotice ?? null,
    mapControlsUnderANotice: feedback?.mapControlsUnderANotice ?? null,
    coversNoCommandNoSummaryNoChip:
      !feedback || (feedback.primariesUnderANotice.length === 0 && feedback.groupSummariesUnderANotice.length === 0 && feedback.chipsOrMenuTriggerUnderANotice.length === 0),
    mapViewOverlapHeightPx: feedback?.mapViewOverlapHeightPx ?? null,
    mapViewOverlapFraction: feedback?.mapViewOverlapFraction ?? null,
    mapViewHeightPx: feedback?.mapViewHeightPx ?? null,
  };
  const primaryWhole = primary.every((row) => row.fullyVisible);
  const chipsWhole = chips.length === expectedBrains.length && chips.every((chip) => chip.chipWhole && chip.removeWhole);
  const menuWhole = menuItems.every((item) => item.whole);
  return {
    size: entry.size,
    state: entry.state,
    displayed: expectedBrains.length,
    chipsFound: chips.length,
    menuOpen: entry.menuOpen,
    primary,
    primaryWholeCount: primary.filter((row) => row.fullyVisible).length,
    primaryOnScreenCount: primary.filter((row) => row.onFirstScreen).length,
    primaryNotWhole: primary.filter((row) => !row.fullyVisible).map((row) => `${row.id} ${row.visibleHeightPx}/${row.ownHeightPx}px`),
    primaryWhole,
    chips,
    chipsWhole,
    chipsNotWhole: chips.filter((chip) => !(chip.chipWhole && chip.removeWhole)).map(
      (chip) => `${chip.key}: chip ${chip.chipVisibleHeightPx}/${chip.chipOwnHeightPx}px${chip.removeWhole ? "" : ", remove not whole"}`,
    ),
    // A name is readable when its text is the registered one and either nothing is cut, or what is
    // cut is still given in full by the accessible name AND the title — and the word that marks the
    // active brain is never the part that is cut.
    namesInFull: chips.every((chip) => chip.nameRenderedInFull && (chip.nameNotCutOff || (chip.fullNameInTitle && chip.accessibleNameCarriesTheFullName)) && chip.activeStateWordWhole),
    namesCutWithAFullTitle: chips.filter((chip) => !chip.nameNotCutOff).map((chip) => chip.key),
    accessibleNamesCarryFullNames: chips.every((chip) => chip.accessibleNameCarriesTheFullName),
    activeMarkedInWordsAndAria: chips.every((chip) => chip.markedActive) && chips.filter((chip) => chip.markedActive && chip.stateWord).length === chips.length,
    exactlyOneActive: entry.composition.chips.filter((chip) => chip.current === "true").length === 1,
    menuItems,
    menuWhole,
    menuItemsNotWhole: menuItems.filter((item) => !item.whole).map((item) => `${item.key} ${item.visibleHeightPx}/${item.ownHeightPx}px`),
    menuNamesInFull: menuItems.every((item) => item.nameInFull),
    menuPosition: menu?.position ?? null,
    essentialWhole: primaryWhole && chipsWhole && (!entry.menuOpen || menuWhole),
    groupsWhole,
    groupsNotWhole: layout.groups.filter((group) => group.summaryFullyVisible !== true).map((group) => group.testid),
    groupsCoverage: layout.groups.filter((group) => group.summaryFullyVisible !== true).map((group) => ({
      group: group.testid, coveredBy: group.summaryCoveredBy, clippedByABand: (group.summaryClippedBy ?? []).length > 0,
    })),
    mapVisibleHeightPx: layout.firstScreen.mapViewVisibleHeightPx,
    mapOk,
    noHorizontalOrEscape: !escapersOrOverflow,
    documentVerticalScrollPx: layout.documentVerticalScrollPx,
    chipRows: entry.composition.chipRows,
    navHeightPx: entry.composition.navRect?.h ?? null,
    chromeBandBoxPx: layout.scrollRegions.chrome.clientHeight,
    chromeBandContentPx: layout.scrollRegions.chrome.scrollHeight,
    chromeBandScrollsAtOpening: layout.scrollRegions.chrome.scrollsInside === true,
    status: entry.composition.status?.text ?? null,
    statusOnScreen: entry.composition.status ? (entry.composition.status.rect.y >= 0 && entry.composition.status.rect.bottom <= layout.cssViewport[1]) : null,
    notices,
    noticeInteractions: entry.noticeInteractions ?? null,
    correctionsKeyboard: entry.correctionsKeyboard ?? null,
    menuModal: entry.menuModal ? {
      groups: entry.menuModal.groups,
      escape: entry.menuModal.escape,
    } : null,
    corrections: corrections ? { words: corrections.words, dismissWhole: dismiss?.fullyVisible === true, dismissOnScreen: dismiss?.onScreen === true } : null,
  };
}

function summarise(entries) {
  const judged = entries.map(judge);
  const names = (list) => list.map((j) => `${j.size}/${j.state}`);
  const failing = (predicate) => names(judged.filter((j) => !predicate(j)));
  const entryBy = entries.map((entry) => {
    const interactions = entry.entryPoints ?? [];
    return {
      size: entry.size, state: entry.state,
      measured: entry.entryPoints !== null,
      mouseRevealsEverything: interactions.length > 0 && interactions.every((group) => group.present && group.mouse.revealsEverythingItHolds),
      keyboardRevealsEverything: interactions.length > 0 && interactions.every((group) => group.present && group.keyboard.revealsEverythingItHolds),
      axTreeSaysExpanded: interactions.length > 0 && interactions.every((group) => group.present && group.mouse.axExpandedWhenOpen === true && group.mouse.axExpandedWhenClosed === false && group.keyboard.axExpandedWhenOpen === true),
      focusKeptOnSummary: interactions.length > 0 && interactions.every((group) => group.present && group.keyboard.focusKeptOnSummary),
      documentNeverScrolled: interactions.length > 0 && interactions.every((group) => group.present && group.opening.scrollY === 0 && group.mouse.documentScrollY === 0 && group.keyboard.documentScrollY === 0),
      restoredClosed: interactions.length > 0 && interactions.every((group) => group.present && group.restoredClosed),
      // B04: once opened, does the group's own summary stay on the first screen, so that the same
      // mouse closes it where the person just clicked? And when it does not, does the band's scroll fix it?
      openedSummaryStaysOnFirstScreen: interactions.length > 0 && interactions.every((group) => group.present && group.mouse.summaryOnTheFirstScreenWhenOpened),
      groupsWhoseOpenedSummaryLeftTheFirstScreen: interactions.filter((group) => group.present && !group.mouse.summaryOnTheFirstScreenWhenOpened).map((group) => group.group),
      closedByMouseOnlyAfterScrollingTheBand: interactions.filter((group) => group.present && group.mouse.closedWithoutScrolling === false).every((group) => group.mouse.closedAfterBandScroll === true),
    };
  });
  const measuredEntries = entryBy.filter((e) => e.measured);
  const everyMeasured = (key) => measuredEntries.length > 0 && measuredEntries.every((e) => e[key]);
  const sweeps = entries.filter((entry) => entry.chromeTabSweep);
  const sourcesRead = entries.filter((entry) => entry.sources);
  const axeViolations = entries.flatMap((entry) => entry.axe.violations.map((violation) => ({ size: entry.size, state: entry.state, ...violation })));
  return {
    statesJudged: judged.length,
    // The 13 + the chips: criterion 3, "entirely visible", state by state.
    essentialWholeEveryState: judged.every((j) => j.essentialWhole),
    statesWhereEssentialIsNotWhole: judged.filter((j) => !j.essentialWhole).map((j) => ({
      state: `${j.size}/${j.state}`, primaryNotWhole: j.primaryNotWhole, chipsNotWhole: j.chipsNotWhole, menuItemsNotWhole: j.menuItemsNotWhole,
    })),
    primaryThirteenWholeEveryState: judged.every((j) => j.primaryWhole),
    worstPrimaryWhole: Math.min(...judged.map((j) => j.primaryWholeCount)),
    worstPrimaryOnScreen: Math.min(...judged.map((j) => j.primaryOnScreenCount)),
    statesWherePrimaryIsNotWhole: judged.filter((j) => !j.primaryWhole).map((j) => `${j.size}/${j.state}: ${j.primaryNotWhole.join(", ")}`),
    chipsAndRemovesWholeEveryState: judged.every((j) => j.chipsWhole),
    statesWhereAChipIsNotWhole: judged.filter((j) => !j.chipsWhole).map((j) => `${j.size}/${j.state}: ${j.chipsNotWhole.join("; ")}`),
    menuItemsWholeEveryOpenMenuState: judged.filter((j) => j.menuOpen).every((j) => j.menuWhole),
    statesWhereAMenuItemIsNotWhole: judged.filter((j) => j.menuOpen && !j.menuWhole).map((j) => `${j.size}/${j.state}: ${j.menuItemsNotWhole.join(", ")}`),
    longNamesReadableEveryState: judged.every((j) => j.namesInFull && (!j.menuOpen || j.menuNamesInFull)),
    statesWhereANameIsCutOff: judged.filter((j) => j.namesCutWithAFullTitle.length > 0).map((j) => `${j.size}/${j.state}: ${j.namesCutWithAFullTitle.join(",")}`),
    statesWhereANameIsNotReadable: judged.filter((j) => !(j.namesInFull && (!j.menuOpen || j.menuNamesInFull))).map((j) => `${j.size}/${j.state}`),
    accessibleNamesCarryFullNamesEveryState: judged.every((j) => j.accessibleNamesCarryFullNames),
    activeBrainMarkedInWordsEveryState: judged.every((j) => j.activeMarkedInWordsAndAria && j.exactlyOneActive),
    groupEntryPointsWholeEveryState: judged.every((j) => j.groupsWhole),
    statesWithAGroupEntryPointNotWhole: judged.filter((j) => !j.groupsWhole).map((j) => `${j.size}/${j.state}: ${j.groupsNotWhole.join(",")}`),
    // The same fact, split. While the add menu is open its layer covers whatever lies under it — that
    // is what a layer is — so the strict reading above is published as it is, and so are the two
    // halves: every state with the menu closed, and, for each menu-open state, WHAT covers the entry.
    groupEntryPointsWholeEveryStateWithTheMenuClosed: judged.filter((j) => !j.menuOpen).every((j) => j.groupsWhole),
    menuOpenStatesWhereAnEntryPointIsNotWhole: judged
      .filter((j) => j.menuOpen && !j.groupsWhole)
      .map((j) => ({ state: `${j.size}/${j.state}`, entries: j.groupsCoverage })),
    menuOpenStatesWhereAnEntryPointIsUnderTheFold: judged
      .filter((j) => j.menuOpen && j.groupsCoverage.some((entry) => entry.coveredBy === null))
      .map((j) => `${j.size}/${j.state}`),
    // ACTION-0113 B04-O1. The strict boolean above is unchanged and stays false in the menu-open states:
    // the menu is modal and covers the summary. What is published here is what the modal promises.
    ...(() => {
      const menuStates = entries.filter((entry) => entry.menuModal);
      const recovered = menuStates.filter((entry) => {
        const modal = entry.menuModal;
        const interactions = entry.entryPointsAfterModalClose ?? [];
        return (
          modal.escape.menuClosed && modal.escape.focusBackOnTheTrigger && modal.escape.backdropGone && modal.escape.groupSummariesWhole &&
          modal.groups.length === DISCLOSURE_GROUPS.length &&
          modal.groups.every((row) => row.present && row.pressed === true && row.menuClosedByThePress && row.groupStillClosedAfterThePress && row.summaryAnswersOnceTheMenuIsClosed && row.activatedByTheNextPress) &&
          interactions.length === DISCLOSURE_GROUPS.length &&
          interactions.every((group) => group.present && group.mouse.revealsEverythingItHolds && group.keyboard.revealsEverythingItHolds && group.mouse.axExpandedWhenOpen === true && group.keyboard.focusKeptOnSummary)
        );
      });
      const label = (entry) => `${entry.size}/${entry.state}`;
      return {
        menuIsModal: menuStates.length > 0 && menuStates.every((entry) => entry.composition.menu?.role === "menu" && entry.menuModal.groups.every((row) => row.menuClosedByThePress === true)),
        menuOpenStatesMeasured: menuStates.map(label),
        menuOpenStatesWhereTheModalPromiseHolds: recovered.map(label),
        menuOpenStatesWhereTheModalPromiseFails: menuStates.filter((entry) => !recovered.includes(entry)).map(label),
        everyMenuOpenStateRecoversGroupActivationByTheModalRoute: menuStates.length > 0 && recovered.length === menuStates.length,
        // Per group and per menu-open state, so that a reader sees which summary the layer covered and what answered.
        menuOpenGroupCoverage: menuStates.map((entry) => ({
          state: label(entry),
          groups: entry.menuModal.groups.map((row) => ({
            group: row.group, answeredAtItsCentre: row.answeredAtItsCentreWhileTheMenuIsOpen, firstPressClosedTheMenu: row.menuClosedByThePress ?? null,
            groupStayedClosed: row.groupStillClosedAfterThePress ?? null, nextPressActivated: row.activatedByTheNextPress ?? null,
          })),
        })),
        // Only true when BOTH halves are: every closed-menu state shows the three summaries whole, and every
        // menu-open state recovers them by the route the modal gives. Never a replacement for the strict one.
        groupEntryReachableEveryState:
          judged.filter((j) => !j.menuOpen).every((j) => j.groupsWhole) && menuStates.length > 0 && recovered.length === menuStates.length,
      };
    })(),
    // ACTION-0113 B04-O2: the notices, at the moment they appear, with no scroll before.
    ...(() => {
      const raised = judged.filter((j) => j.notices.statusShown || j.notices.correctionsShown);
      const label = (j) => `${j.size}/${j.state}`;
      const interactions = entries.filter((entry) => entry.noticeInteractions);
      const worst = raised.reduce((acc, j) => (j.notices.mapViewOverlapFraction !== null && j.notices.mapViewOverlapFraction > (acc?.fraction ?? -1) ? { state: label(j), fraction: j.notices.mapViewOverlapFraction, heightPx: j.notices.mapViewOverlapHeightPx, mapViewHeightPx: j.notices.mapViewHeightPx } : acc), null);
      return {
        noticeStatesMeasured: raised.map(label),
        noticesPresentableAtAppearanceEveryState: raised.length > 0 && raised.every((j) => j.notices.presentableAtAppearance),
        statesWhereANoticeOrItsDismissIsNotWholeAtAppearance: raised.filter((j) => !j.notices.presentableAtAppearance).map((j) => `${label(j)}: status ${j.notices.statusWholeAtAppearance}/dismiss ${j.notices.statusDismissWholeAtAppearance}; corrections ${j.notices.correctionsWholeAtAppearance}/dismiss ${j.notices.correctionsDismissWholeAtAppearance}`),
        noticeLayerOutsideTheChromeBandEveryState: raised.length > 0 && raised.every((j) => j.notices.layerInsideTheChromeBand === false && j.notices.layerPosition === "fixed"),
        noticeLayerCoversNoCommandNoGroupSummaryNoChipEveryState: raised.every((j) => j.notices.coversNoCommandNoSummaryNoChip),
        statesWhereANoticeCoversACommand: raised.filter((j) => !j.notices.coversNoCommandNoSummaryNoChip).map((j) => `${label(j)}: ${[...j.notices.primariesUnderANotice, ...j.notices.groupSummariesUnderANotice, ...j.notices.chipsOrTriggerUnderANotice].join(",")}`),
        // The part of the map the notice lies over, published and not judged: the map stays at its layout
        // rectangle (the floor is judged on that), the notice is a dismissible layer over its lower edge.
        noticeMapOverlapByState: raised.map((j) => ({ state: label(j), overlapHeightPx: j.notices.mapViewOverlapHeightPx, overlapFraction: j.notices.mapViewOverlapFraction, mapViewHeightPx: j.notices.mapViewHeightPx, noticeRects: j.notices.noticeRects })),
        worstNoticeMapOverlap: worst,
        statusDismissByMouseAtAppearanceEveryRaisedState: interactions.length > 0 && interactions.every((entry) => entry.noticeInteractions.mouse.dismissAimableAtAppearance && entry.noticeInteractions.mouse.noticeGoneAfterThePress && entry.noticeInteractions.mouse.chromeBandScrollTopBeforeThePress === 0),
        statusDismissByKeyboardEveryRaisedState: interactions.length > 0 && interactions.every((entry) => entry.noticeInteractions.keyboard.reachedByTab && entry.noticeInteractions.keyboard.wholeInWindowWhenFocused && entry.noticeInteractions.keyboard.hasAFocusRing && entry.noticeInteractions.keyboard.noticeGoneAfterEnter === true),
        statusDismissByEscapeEveryRaisedState: interactions.length > 0 && interactions.every((entry) => entry.noticeInteractions.escape.noticeGoneAfterEscapeWithTheFocusOnTheDocument),
        statusDismissTabPressesByState: interactions.map((entry) => ({ state: `${entry.size}/${entry.state}`, presses: entry.noticeInteractions.keyboard.tabPresses })),
        correctionsDismissReachableByKeyboardEveryState: entries.filter((entry) => entry.correctionsKeyboard).length > 0 && entries.filter((entry) => entry.correctionsKeyboard).every((entry) => entry.correctionsKeyboard.reachedByTab && entry.correctionsKeyboard.wholeInWindowWhenFocused && entry.correctionsKeyboard.hasAFocusRing),
        correctionsTabPressesByState: entries.filter((entry) => entry.correctionsKeyboard).map((entry) => ({ state: `${entry.size}/${entry.state}`, presses: entry.correctionsKeyboard.tabPresses })),
      };
    })(),
    groupsRevealEverythingByMouseEveryMeasuredState: everyMeasured("mouseRevealsEverything"),
    groupsRevealEverythingByKeyboardEveryMeasuredState: everyMeasured("keyboardRevealsEverything"),
    accessibilityTreeSaysExpandedEveryMeasuredState: everyMeasured("axTreeSaysExpanded"),
    focusKeptOnSummaryEveryMeasuredState: everyMeasured("focusKeptOnSummary"),
    documentNeverScrolledByAGroupEveryMeasuredState: everyMeasured("documentNeverScrolled"),
    groupsRestoredClosedEveryMeasuredState: everyMeasured("restoredClosed"),
    openedGroupKeepsItsSummaryOnTheFirstScreenEveryMeasuredState: everyMeasured("openedSummaryStaysOnFirstScreen"),
    statesWhereAnOpenedGroupLeavesItsSummaryUnderTheBandFold: entryBy.filter((e) => e.measured && !e.openedSummaryStaysOnFirstScreen).map((e) => `${e.size}/${e.state}: ${e.groupsWhoseOpenedSummaryLeftTheFirstScreen.join(",")}`),
    everyGroupThatLeftTheFirstScreenCouldStillBeClosedAfterScrollingTheBand: entryBy.filter((e) => e.measured).every((e) => e.closedByMouseOnlyAfterScrollingTheBand),
    statesWhereGroupActivationWasNotMeasured: entryBy.filter((e) => !e.measured).map((e) => `${e.size}/${e.state}`),
    mapAtLeastFloorEveryState: judged.every((j) => j.mapOk),
    statesFailingMapFloor: failing((j) => j.mapOk),
    worstMapVisibleHeightPx: Math.min(...judged.map((j) => j.mapVisibleHeightPx)),
    bestMapVisibleHeightPx: Math.max(...judged.map((j) => j.mapVisibleHeightPx)),
    noHorizontalOverflowNoEscapeNoClippedControlEveryState: judged.every((j) => j.noHorizontalOrEscape),
    statesWithOverflowOrEscape: failing((j) => j.noHorizontalOrEscape),
    worstDocumentVerticalScrollPx: Math.max(...judged.map((j) => j.documentVerticalScrollPx)),
    chromeTabSweepEveryStopWholeWhenFocused: sweeps.every((entry) => entry.chromeTabSweep.everyStopWholeWhenFocused),
    statesWhereAFocusedChromeControlIsNotWhole: sweeps.filter((entry) => !entry.chromeTabSweep.everyStopWholeWhenFocused).map((entry) => `${entry.size}/${entry.state}: ${entry.chromeTabSweep.stopsNotWholeWhenFocused.join("; ")}`),
    chromeTabSweepNeverScrollsTheDocument: sweeps.every((entry) => entry.chromeTabSweep.documentNeverScrolled),
    chromeTabSweepEveryStopHasAFocusRing: sweeps.every((entry) => entry.chromeTabSweep.everyStopHasAFocusRing),
    sourcesOfEveryDisplayedBrainInDiagnosticsEveryMeasuredState: sourcesRead.length > 0 && sourcesRead.every((entry) => entry.sources.everyDisplayedBrainReferenced && entry.sources.onlyDisplayedBrainsListed),
    sourcesWholeAndReachableEveryMeasuredState: sourcesRead.length > 0 && sourcesRead.every((entry) => entry.sources.everyReferenceWholeAndReachable),
    statesWhereASourceIsMissingOrNotReachable: sourcesRead.filter((entry) => !(entry.sources.everyDisplayedBrainReferenced && entry.sources.onlyDisplayedBrainsListed && entry.sources.everyReferenceWholeAndReachable)).map((entry) => `${entry.size}/${entry.state}`),
    panelReachableByKeyboardWherePracticed: entries.filter((entry) => entry.keyboardToAside).every((entry) => entry.keyboardToAside.presses !== null),
    axeViolations,
    axeIncompleteByState: entries.map((entry) => ({ size: entry.size, state: entry.state, incomplete: entry.axe.incomplete.map((rule) => `${rule.id}x${rule.nodes}`).sort() })),
    controlCountByState: entries.map((entry) => ({ size: entry.size, state: entry.state, controls: entry.layout.controlCount })),
    byState: judged.map((j) => ({
      size: j.size, state: j.state, displayed: j.displayed, chipRows: j.chipRows, navHeightPx: j.navHeightPx,
      chromeBandBoxPx: j.chromeBandBoxPx, chromeBandContentPx: j.chromeBandContentPx, chromeBandScrollsAtOpening: j.chromeBandScrollsAtOpening,
      primaryWholeCount: j.primaryWholeCount, primaryNotWhole: j.primaryNotWhole, chipsWhole: j.chipsWhole, chipsNotWhole: j.chipsNotWhole,
      menuOpen: j.menuOpen, menuWhole: j.menuWhole, menuPosition: j.menuPosition, menuItemsNotWhole: j.menuItemsNotWhole,
      groupsWhole: j.groupsWhole, mapVisibleHeightPx: j.mapVisibleHeightPx, status: j.status, statusOnScreen: j.statusOnScreen,
      corrections: j.corrections,
    })),
    judged,
  };
}

/* --- the scenarios ---------------------------------------------------------------------------- */

const PRESENT = { motion: "no-preference", density: "comfortable", appMotion: "system", legend: false, menu: false, scheme: "light" };
const SCENARIOS = [
  // The B03 baseline, inside the four-brain catalogue: one brain displayed.
  { id: "mono-A", keys: ["A"], focus: "A", locale: "fr", ...PRESENT },
  // Two brains, the focus on the second (the 60-character French Unicode name).
  { id: "two-focusB-fr-light", keys: ["A", "B"], focus: "B", locale: "fr", ...PRESENT },
  { id: "two-focusB-en-dark-legend", keys: ["A", "B"], focus: "B", locale: "en", ...PRESENT, scheme: "dark", legend: true },
  { id: "two-menu-open-fr-light", keys: ["A", "B"], focus: "B", locale: "fr", ...PRESENT, menu: true },
  // Three brains, the focus on the third (the 75-character English name), then on the second.
  { id: "three-focusC-fr-light", keys: ["A", "B", "C"], focus: "C", locale: "fr", ...PRESENT, aside: true },
  { id: "three-focusC-en-dark-compact", keys: ["A", "B", "C"], focus: "C", locale: "en", ...PRESENT, scheme: "dark", density: "compact" },
  { id: "three-focusB-fr-light-reduced-motion", keys: ["A", "B", "C"], focus: "B", locale: "fr", ...PRESENT, motion: "reduce", appMotion: "reduce" },
  { id: "three-menu-open-en-dark", keys: ["A", "B", "C"], focus: "C", locale: "en", ...PRESENT, scheme: "dark", menu: true },
  // A notice: the product's own "no index yet" status, raised by composing a registered brain nobody indexed.
  { id: "four-unindexed-notice-fr-light", keys: ["A", "B", "C", "D"], focus: "B", locale: "fr", ...PRESENT, notice: "unindexed", aside: true },
  // A notice: the product's own refusal of removing the last displayed brain.
  { id: "single-C-refused-removal-en-light", keys: ["C"], focus: "C", locale: "en", ...PRESENT, notice: "refusedRemoval" },
];

async function applyPresentation(scenario) {
  await emulate(scenario.scheme, scenario.motion);
  await setLocale(scenario.locale);
  await setDensity(scenario.density);
  await setMotion(scenario.appMotion);
  await setLegend(scenario.legend);
}
async function raiseNotice(scenario) {
  if (scenario.notice === "unindexed") {
    // composeTo already added D; the product's status is raised by that very addition.
    await until(`/^(Index absent|No index)/.test(document.querySelector('.app__status')?.textContent ?? '')`, 30000);
  } else if (scenario.notice === "refusedRemoval") {
    await click(testid(`composition-remove-${idOf("C")}`));
    await until(`/^Composition refus/.test(document.querySelector('.app__status')?.textContent ?? '')`, 30000);
    await quiet();
  }
}

const only = process.env.T61_ONLY ?? "";
if (pass === 1 && only === "groups") {
  // Debug segment: what answers a hit test at the centre of each group summary, and what Enter does.
  await resizeTo(960, 640);
  await emulate("light", "no-preference");
  await setLocale("fr");
  await composeTo(["A", "B"], "B");
  await quiet();
  await pause(600);
  await evaluate(RESET_SCROLL);
  for (const group of DISCLOSURE_GROUPS) {
    const info = await evaluate(`(() => {
      const summary = document.querySelector('[data-testid="${group.testid}"] > summary');
      const r = summary.getBoundingClientRect();
      const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return { rect: [r.x, r.y, r.width, r.height].map(Math.round), top: top ? top.tagName + '.' + String(top.className) + ' ' + (top.getAttribute('data-testid') ?? '') : null,
        chrome: document.querySelector('.app__chrome').getBoundingClientRect().bottom, mapControls: document.querySelector('.app__map-controls')?.getBoundingClientRect().top };
    })()`);
    console.error(group.testid, JSON.stringify(info));
  }
  const geometry = () => evaluate(`(() => {
    const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return [b.x, b.y, b.width, b.height].map(Math.round); };
    const summary = document.querySelector('[data-testid="map-advanced-tools"] > summary');
    const sr = summary.getBoundingClientRect();
    const top = document.elementFromPoint(sr.x + sr.width / 2, sr.y + sr.height / 2);
    return { chrome: r(document.querySelector('.app__chrome')), controls: r(document.querySelector('.app__map-controls')), mapCol: r(document.querySelector('.app__map')), mapView: r(document.querySelector('.map-view')), svg: r(document.querySelector('[data-testid="composed-canvas"]')), summary: r(summary), top: top ? top.tagName + '.' + String(top.className.baseVal ?? top.className) : null, mapScrollTop: document.querySelector('.app__map')?.scrollTop, controlsScrollTop: document.querySelector('.app__map-controls')?.scrollTop, mainScrollTop: document.querySelector('.app__main')?.scrollTop };
  })()`);
  console.error("geometry at rest", JSON.stringify(await geometry()));
  const full = await measureGroupEntryPoints();
  for (const g of full) console.error("group", g.group, JSON.stringify(g.opening), "mouse", g.mouse.opened, "kb", g.keyboard.opened, g.keyboard.presses);
  console.error("geometry after groups, now", JSON.stringify(await geometry()));
  await pause(800);
  console.error("geometry after groups, +800ms", JSON.stringify(await geometry()));
  const kb = await tabToControl(`${testid("chrome-diagnostics")} > summary`, 80);
  console.error("tab to diagnostics", JSON.stringify(kb));
  console.error("active before Enter", JSON.stringify(await activeElement()));
  await press("Enter");
  console.error("open after Enter", await evaluate(`document.querySelector('[data-testid="chrome-diagnostics"]').open`), JSON.stringify(await activeElement()));
  process.exit(3);
}
if (pass === 1 && only === "menu") {
  // Debug segment: what closing the add menu by clicking its trigger really does.
  await resizeTo(960, 640);
  await composeTo(["A", "B"], "B");
  const probe = () => evaluate(`({ expanded: document.querySelector('[data-testid="composition-add-trigger"]').getAttribute('aria-expanded'), active: document.activeElement?.getAttribute('data-testid') ?? document.activeElement?.tagName })`);
  await click(testid("composition-add-trigger"));
  await pause(400);
  console.error("after open click", JSON.stringify(await probe()));
  await click(testid("composition-add-trigger"));
  await pause(600);
  console.error("after second click", JSON.stringify(await probe()));
  process.exit(3);
}
if (pass === 1 && !only) {
  for (const size of SIZES) {
    const granted = await resizeTo(size.width, size.height);
    for (const scenario of SCENARIOS) {
      await applyPresentation(scenario);
      await composeTo(scenario.keys, scenario.focus);
      await applyPresentation(scenario);
      if (scenario.notice) await raiseNotice(scenario);
      if (scenario.menu) await setMenu(true);
      matrix.push(await measureState({ size, granted, scenario, aside: scenario.aside === true }));
      if (scenario.notice) matrix[matrix.length - 1].noticeInteractions = await noticeInteractions(scenario);
      await writeFile(join(proofRoot, "matrix-progress.json"), JSON.stringify({ record: { ...record, matrix }, seed: seed.brains.map((entry) => ({ ...entry, root: undefined })) }));
      if (scenario.menu) await setMenu(false);
    }
  }
}

if (pass === 1 && matrix.length > 0) {
  // The matrix is the expensive half: it is written the moment it exists, so a later
  // failure of the keyboard or camera segments cannot lose it.
  record.matrix = matrix;
  await writeFile(join(proofRoot, "run-measure-pass1.matrix-only.json"), JSON.stringify(record, null, 2));
  try {
    record.verdictPartial = summarise(matrix);
    await writeFile(join(proofRoot, "run-measure-pass1.matrix-only.json"), JSON.stringify(record, null, 2));
  } catch (error) {
    process.stderr.write(`summarise failed on the matrix-only write: ${error.stack}
`);
  }
  delete record.matrix;
  delete record.verdictPartial;
}

/* --- the keyboard walk of the composition, at the hardest size ---------------------------- */

const arrowInfo = () => evaluate(ACTIVE_VISIBILITY);
let addedId = null;
async function compositionKeyboardWalk() {
  const steps = [];
  const note = (label, value) => steps.push({ label, ...value });
  await resizeTo(960, 640);
  await emulate("light", "no-preference");
  await setLocale("fr");
  await setDensity("comfortable");
  await setMotion("system");
  await composeTo(["A", "B"], "B");
  await evaluate(RESET_SCROLL);

  // 1. Tab to the add trigger, from the top of the shell.
  const toTrigger = await tabToControl(testid("composition-add-trigger"), 60);
  note("tab to the add trigger", { reached: toTrigger.presses !== null, presses: toTrigger.presses, inViewport: toTrigger.inViewport, documentScrollY: toTrigger.documentScrollY, ring: toTrigger.outlineStyle });
  // 2. ArrowDown opens the menu, focus on the first item; arrows walk it; Escape closes and returns.
  await press("ArrowDown");
  const opened = await evaluate(`document.querySelector('[data-testid="composition-add-trigger"]').getAttribute('aria-expanded')`);
  const first = await arrowInfo();
  note("ArrowDown opens the menu with focus on the first item", { expanded: opened, active: first.id, whole: first.wholeInWindow, visibleHeightPx: first.visibleHeightPx, ownHeightPx: first.ownHeightPx, region: first.region, documentScrollY: first.documentScrollY });
  await press("ArrowDown");
  const second = await arrowInfo();
  note("ArrowDown moves to the next item", { active: second.id, whole: second.wholeInWindow, visibleHeightPx: second.visibleHeightPx, ownHeightPx: second.ownHeightPx });
  await press("ArrowUp");
  const back = await arrowInfo();
  note("ArrowUp moves back", { active: back.id });
  await press("End");
  const end = await arrowInfo();
  await press("Home");
  const home = await arrowInfo();
  note("End and Home", { endActive: end.id, endWhole: end.wholeInWindow, homeActive: home.id });
  await press("Escape");
  const afterEscape = await evaluate(`({ expanded: document.querySelector('[data-testid="composition-add-trigger"]').getAttribute('aria-expanded'), active: document.activeElement?.getAttribute('data-testid') ?? null })`);
  note("Escape closes the menu and returns the focus to the trigger", { expanded: afterEscape.expanded, active: afterEscape.active, focusReturned: afterEscape.active === "composition-add-trigger" });
  // 3. ArrowDown, Enter: the brain is added, the menu closes, focus returns to the trigger.
  await press("ArrowDown");
  const firstItemId = (await arrowInfo()).id;
  await press("Enter");
  // The catalogue also holds the product's three built-in synthetic brains, so the first item
  // of the menu is not necessarily C: the walk follows whatever brain the keyboard added.
  await until(`document.querySelectorAll('.composition__focus').length === 3`, 30000);
  await quiet();
  addedId = (await chipIds()).find((id) => ![idOf("A"), idOf("B")].includes(id));
  const afterAdd = await evaluate(`({ chips: [...document.querySelectorAll('.composition__focus')].length, expanded: document.querySelector('[data-testid="composition-add-trigger"]').getAttribute('aria-expanded'), active: document.activeElement?.getAttribute('data-testid') ?? null })`);
  note("Enter on an item adds the brain", { itemChosen: firstItemId, chips: afterAdd.chips, menuClosed: afterAdd.expanded === "false", active: afterAdd.active, focusReturnedToTrigger: afterAdd.active === "composition-add-trigger" });
  // 4. Focus change by keyboard: Tab to the first chip, Enter.
  await evaluate(RESET_SCROLL);
  const toChipA = await tabToControl(testid(`composition-chip-${idOf("A")}`), 60);
  const beforeFocus = await focusedId();
  await press("Enter");
  await until(`document.querySelector('[data-testid="composition-chip-${idOf("A")}"]').getAttribute('aria-current') === 'true'`, 30000);
  await quiet();
  note("Tab to a chip and Enter moves the active brain", {
    reached: toChipA.presses !== null, presses: toChipA.presses, inViewport: toChipA.inViewport,
    before: keyOfBrain(beforeFocus), after: keyOfBrain(await focusedId()),
  });
  // 5. Removal by keyboard: Tab to a remove button, Enter; the chip goes and focus lands on a chip that stays.
  await evaluate(RESET_SCROLL);
  const toRemoveC = await tabToControl(testid(`composition-remove-${addedId}`), 80);
  await press("Enter");
  await until(`!document.querySelector('[data-testid="composition-chip-${addedId}"]')`, 30000);
  await quiet();
  const afterRemove = await evaluate(`({ chips: [...document.querySelectorAll('.composition__focus')].length, active: document.activeElement?.getAttribute('data-testid') ?? null })`);
  note("Tab to a remove button and Enter removes the brain, focus lands on a chip that stays", {
    reached: toRemoveC.presses !== null, presses: toRemoveC.presses, chips: afterRemove.chips, active: afterRemove.active,
    focusOnAStayingChip: /^composition-chip-/.test(afterRemove.active ?? ""),
  });
  // 6. Down to the last brain, then the attempt that the product refuses.
  await evaluate(RESET_SCROLL);
  const toRemoveB = await tabToControl(testid(`composition-remove-${idOf("B")}`), 80);
  await press("Enter");
  await until(`!document.querySelector('[data-testid="composition-chip-${idOf("B")}"]')`, 30000);
  await quiet();
  await evaluate(RESET_SCROLL);
  const toRemoveLast = await tabToControl(testid(`composition-remove-${idOf("A")}`), 80);
  const lastBefore = await evaluate(`document.querySelector('[data-testid="composition-remove-${idOf("A")}"]').getAttribute('aria-disabled')`);
  await press("Enter");
  await until(`/^Composition refus/.test(document.querySelector('.app__status')?.textContent ?? '')`, 30000);
  await quiet();
  const refusal = await evaluate(`({ chips: [...document.querySelectorAll('.composition__focus')].length, status: document.querySelector('.app__status')?.textContent ?? null, active: document.activeElement?.getAttribute('data-testid') ?? null })`);
  note("the last brain's remove button is reachable, announces itself unavailable, and its Enter is refused", {
    reachedByTab: toRemoveLast.presses !== null, ariaDisabledBefore: lastBefore, chipsAfter: refusal.chips,
    refusedWithAStatus: /^Composition refus/.test(refusal.status ?? ""), status: refusal.status, activeAfter: refusal.active,
    reachedRemoveB: toRemoveB.presses !== null,
  });
  return steps;
}
if (pass === 1 && (!only || only === "walk")) {
  record.compositionKeyboardWalk = await compositionKeyboardWalk();
  const walk = record.compositionKeyboardWalk;
  const by = (label) => walk.find((step) => step.label.startsWith(label));
  record.compositionKeyboardWalkVerdict = {
    triggerReachedByTab: by("tab to the add trigger").reached,
    arrowDownOpensWithFocusOnFirstItem: by("ArrowDown opens").expanded === "true" && /^composition-add-item-/.test(by("ArrowDown opens").active ?? ""),
    everyMenuItemFocusedWasWhole: [by("ArrowDown opens").whole, by("ArrowDown moves").whole, by("End and Home").endWhole].every((value) => value === true),
    arrowsWalkTheMenu: /^composition-add-item-/.test(by("ArrowDown moves").active ?? "") && by("ArrowDown moves").active !== by("ArrowDown opens").active,
    escapeClosesAndReturnsFocus: by("Escape closes").focusReturned === true && by("Escape closes").expanded === "false",
    enterOnAnItemAddsTheBrain: by("Enter on an item").chips === 3 && by("Enter on an item").menuClosed === true,
    focusReturnsToTriggerAfterAdd: by("Enter on an item").focusReturnedToTrigger === true,
    chipMovesTheActiveBrainByKeyboard: by("Tab to a chip").reached === true && by("Tab to a chip").after === "A",
    removeByKeyboardLandsOnAStayingChip: by("Tab to a remove").reached === true && by("Tab to a remove").focusOnAStayingChip === true && by("Tab to a remove").chips === 2,
    lastBrainRemovalIsRefusedWithAStatus: by("the last brain").refusedWithAStatus === true && by("the last brain").chipsAfter === 1 && by("the last brain").ariaDisabledBefore === "true",
    allReachedInTheViewport: [by("tab to the add trigger").inViewport, by("Tab to a chip").inViewport].every((value) => value === true),
    documentNeverScrolled: by("tab to the add trigger").documentScrollY === 0,
  };
  check("keyboard walk of the composition at 960x640", record.compositionKeyboardWalkVerdict);
}

/* --- targeted product controls (B03's P-block, then the multi-brain camera) ----------------- */

if (pass === 1 && (!only || only === "p")) {
  await resizeTo(960, 640);
  await emulate("light", "no-preference");
  await setLocale("fr");
  await setDensity("comfortable");
  await setMotion("system");
  await composeTo(["A"], "A");
  await quiet();
  await evaluate(RESET_SCROLL);

  // P-02 — the parent and its aggregate: the omitted count is the real one (mono-A, as in B03).
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
  const omitted = aggregate ? Number(String(/\+\s*([\d\s  ]+)/.exec(aggregate.label)?.[1] ?? "").replace(/\D/g, "")) : 0;
  assert.equal(shownChildren.length + omitted, archiveChildren.length, "P-02: shown + omitted == the real children on disk");
  check("P-02 parent and aggregate recognised, exact omitted count (mono-A)", {
    parent: "archives", shown: shownChildren.length, omitted, realChildren: archiveChildren.length, role: aggregate?.role ?? null,
  });

  // P-05 — links in view and out of view; the view stays bounded.
  const edgesBefore = (await evaluate(READ_FIRST_SCREEN)).drawn;
  const farRef = await invoke("map_resolve_node", { brainId: BRAIN, relativePath: "archives/piece-0119.txt" });
  assert(farRef, "the far row is indexed");
  await click("#map-search-input");
  await send("Input.insertText", { text: "piece-0119" });
  await until(`!!document.querySelector('[data-testid="search-hit"]')`);
  await click(`[data-testid="search-hit"][data-node-id="${farRef.nodeId}"]`);
  await until(`!!document.querySelector('[data-testid="composed-canvas"] [data-node-id="${farRef.nodeId}"]')`);
  await quiet();
  const afterNavigation = await evaluate(READ_FIRST_SCREEN);
  assert(edgesBefore.hierarchyEdges > 0, "P-05: hierarchy edges are drawn in the first view");
  assert(afterNavigation.drawn.cards + afterNavigation.drawn.aggregates <= view0.viewBudget, "P-05: the view stays bounded after navigating out of it");
  const navigatedTargetVisible = await evaluate(`(() => {
    const card = document.querySelector('[data-testid="composed-canvas"] [data-node-id="${farRef.nodeId}"]');
    if (!card) return null;
    const r = card.getBoundingClientRect();
    const h = Math.max(0, Math.min(r.bottom, document.documentElement.clientHeight) - Math.max(r.top, 0));
    const w = Math.max(0, Math.min(r.right, document.documentElement.clientWidth) - Math.max(r.left, 0));
    return { visibleWidth: Math.round(w), visibleHeight: Math.round(h), scrollY: Math.round(window.scrollY) };
  })()`);
  check("P-05 edges drawn, a row outside the first view reached, view bounded, target still visible (mono-A)", {
    navigatedTargetVisible,
    edgesBefore: edgesBefore.hierarchyEdges, edgesAfter: afterNavigation.drawn.hierarchyEdges, budget: view0.viewBudget,
    slotsAfter: afterNavigation.drawn.cards + afterNavigation.drawn.aggregates,
  });
  await click(testid("search-clear"));
  await quiet();

  // Now the composition of three brains, focus on the second: P-01 (several territories drawn, bounded),
  // P-07 (selection and details without scrolling the document), P-11 (wheel and keyboard) and the camera.
  await composeTo(["A", "B", "C"], "B");
  await evaluate(RESET_SCROLL);
  await pause(500);
  const three = await evaluate(READ_FIRST_SCREEN);
  const brainsDrawn = await evaluate(`[...new Set([...document.querySelectorAll('[data-testid="composed-canvas"] [role="treeitem"]')].map((el) => el.getAttribute('data-brain-id')))].sort()`);
  check("P-01 three territories drawn in the composition, view bounded, first screen usable", {
    brainsWithADrawnCard: brainsDrawn.map(keyOfBrain), cardsDrawn: three.drawn.cards, aggregatesDrawn: three.drawn.aggregates,
    mapViewVisibleHeightPx: three.firstScreen.mapViewVisibleHeightPx, mapHit: three.firstScreen.mapHitTest?.inside === true,
  });
  record.threeBrainFirstWindow = {
    brainsWithADrawnCard: brainsDrawn.map(keyOfBrain),
    mapViewVisibleHeightPx: three.firstScreen.mapViewVisibleHeightPx,
    cardsDrawn: three.drawn.cards,
  };

  const selectable = await evaluate(`(() => {
    const card = [...document.querySelectorAll('[data-testid="composed-canvas"] [data-card="true"]')].find((g) => {
      const b = g.getBoundingClientRect();
      const x = b.x + b.width / 2, y = b.y + b.height / 2;
      if (!(b.width > 4 && x > 0 && y > 0 && x < innerWidth && y < innerHeight)) return false;
      const top = document.elementFromPoint(x, y);
      return !!top && (top === g || g.contains(top));
    });
    return card ? { nodeId: Number(card.getAttribute('data-node-id')), brainId: card.getAttribute('data-brain-id') } : null;
  })()`);
  record.selectionAtTop = { scrollY: await evaluate("Math.round(window.scrollY)"), selectable };
  if (selectable) {
    await click(`[data-testid="composed-canvas"] [data-card="true"][data-node-id="${selectable.nodeId}"][data-brain-id="${selectable.brainId}"]`);
    await until(`document.querySelector('[data-testid="composed-canvas"] [data-card="true"][data-node-id="${selectable.nodeId}"][data-brain-id="${selectable.brainId}"]')?.getAttribute('aria-selected') === 'true'`);
    await quiet();
    const detail = await invoke("map_node_detail", { reference: { brainId: selectable.brainId, nodeId: selectable.nodeId } });
    const panelName = await evaluate(`(document.querySelector('.details__name')?.textContent ?? '').trim()`);
    assert(panelName.length > 0, "P-07: the details panel names the selection");
    assert(panelName.includes(detail.node.name) || detail.node.name.includes(panelName), `P-07: the panel names the selected node (panel ${JSON.stringify(panelName)}, index ${JSON.stringify(detail.node.name)})`);
    check("P-07 selection in a three-brain composition without scrolling the document, details agree with the Index", {
      brain: keyOfBrain(selectable.brainId), nodeId: selectable.nodeId, panelNameMatchesIndex: true, scrollY: record.selectionAtTop.scrollY,
      focusedAfterSelection: keyOfBrain(await focusedId()),
    });
  } else {
    check("P-07 selection in a three-brain composition WITHOUT scrolling the document", { selected: false, why: "no card is visible and hittable at scrollY=0: measured, not worked around" });
  }

  // P-11 — the real wheel and the keyboard, on the composed canvas.
  await evaluate(`document.querySelector('[data-testid="composed-canvas"]').scrollIntoView({ block: 'center' })`);
  await pause(400);
  const worldBefore = await evaluate(`document.querySelector('[data-testid="composed-world"]')?.getAttribute('transform')`);
  const canvasBox = await center('[data-testid="composed-canvas"]');
  await send("Input.dispatchMouseEvent", { type: "mouseWheel", x: canvasBox.x, y: canvasBox.y, deltaX: 0, deltaY: -240, modifiers: 0 });
  await pause(400);
  const worldAfterWheel = await evaluate(`document.querySelector('[data-testid="composed-world"]')?.getAttribute('transform')`);
  assert.notEqual(worldAfterWheel, worldBefore, "P-11: the wheel changed the camera");
  await evaluate(`document.querySelector('[role="tree"]').focus()`);
  await press("+");
  const worldAfterKey = await evaluate(`document.querySelector('[data-testid="composed-world"]')?.getAttribute('transform')`);
  assert.notEqual(worldAfterKey, worldAfterWheel, "P-11: the keyboard changed the camera");
  check("P-11 wheel and keyboard zoom in a three-brain composition (same WheelEvent primitive as a touchpad)", { wheelMoved: true, keyboardMoved: true });

  /* --- criterion 4: the camera across focus changes and window sizes -------------------------- */
  await evaluate(RESET_SCROLL);
  const cameraNow = async () => (await evaluate(READ_FIRST_SCREEN)).camera;
  const cam0 = await cameraNow();
  const world0 = await evaluate(READ_WORLD);
  const focusTrail = [{ focus: keyOfBrain(await focusedId()), camera: cam0 }];
  for (const key of ["C", "A", "B"]) {
    await evaluate(RESET_SCROLL);
    await click(testid(`composition-chip-${idOf(key)}`));
    await until(`document.querySelector('[data-testid="composition-chip-${idOf(key)}"]').getAttribute('aria-current') === 'true'`);
    await quiet();
    await pause(400);
    focusTrail.push({
      focus: key, camera: await cameraNow(),
      // DEC-0034 E: a new focus may PAN the camera so the focused territory is reachable, at the scale
      // the person chose. What must hold is that the scale did not move and the focused root is on screen.
      selectedCardVisible: await evaluate(`(() => {
        const card = document.querySelector('[data-card="true"][aria-selected="true"]');
        if (!card) return null;
        const r = card.getBoundingClientRect();
        return Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)) > 2 && Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0)) > 2;
      })()`),
      selectedBrain: keyOfBrain(await evaluate(`document.querySelector('[data-card="true"][aria-selected="true"]')?.getAttribute('data-brain-id') ?? null`)),
    });
  }
  const sameCamera = (l, r) => l.transform === r.transform;
  const sizeTrail = [];
  const selectedNow = () => evaluate(`Number(document.querySelector('[data-card="true"][aria-selected="true"]')?.getAttribute('data-node-id') ?? 0) || null`);
  const selectedBeforeResize = await selectedNow();
  for (const size of [...SIZES, SIZES[0]]) {
    await resizeTo(size.width, size.height);
    await quiet();
    await pause(500);
    const reading = await evaluate(READ_FIRST_SCREEN);
    sizeTrail.push({
      size: size.label, camera: reading.camera, mapViewHeight: reading.columns.mapView?.h ?? null,
      focus: keyOfBrain(await focusedId()), selected: await selectedNow(),
    });
  }
  const world1 = await evaluate(READ_WORLD);
  const scales = [...new Set(sizeTrail.map((entry) => entry.camera.scale))];
  record.cameraInvariants = {
    focusTrail,
    cameraIdenticalAcrossEveryFocusChange: focusTrail.every((entry) => sameCamera(entry.camera, focusTrail[0].camera)),
    scaleIdenticalAcrossEveryFocusChange: new Set(focusTrail.map((entry) => entry.camera.scale)).size === 1,
    focusChangePansOnly: "DEC-0034 E: a new focus changes the selection, and the camera pans to keep it reachable at the scale the person chose; the scale never moves.",
    focusedRootVisibleAfterEveryFocusChange: focusTrail.slice(1).every((entry) => entry.selectedCardVisible === true),
    sizeTrail,
    distinctScalesAcrossSizes: scales,
    scaleUnchangedAcrossSizes: scales.length === 1,
    worldCoordinatesStableAcrossSizes: JSON.stringify(world0) === JSON.stringify(world1),
    selectionKeptAcrossSizes: sizeTrail.every((entry) => entry.selected === selectedBeforeResize),
    cardsCompared: world0.length,
  };
  check("criterion 4 — the camera survives focus changes and the three window sizes (three-brain composition)", record.cameraInvariants);

  /* --- the state this pass leaves for the restart ----------------------------------------------- */
  await resizeTo(960, 640);
  await emulate("light", "no-preference");
  await setLocale("fr");
  await setDensity("comfortable");
  await setMotion("system");
  await composeTo(["A", "B", "C"], "C");
  const detailsBefore = await evaluate(`!!document.querySelector('.details')`);
  await click(testid("details-panel-toggle"));
  await until(`(!!document.querySelector('.details')) === ${!detailsBefore}`);
  await setLocale("en");
  await setDensity("compact");
  await setMotion("reduce");
  await setLegend(true);
  await quiet();
  await pause(2500); // the workspace writer is debounced: let it flush before the process is closed
  record.leftBehind = {
    displayed: (await chipIds()).map(keyOfBrain),
    focus: keyOfBrain(await focusedId()),
    locale: "en", density: "compact", motion: "reduce",
    legend: await evaluate(`document.querySelector('[data-testid="map-legend-toggle"]').getAttribute('aria-expanded')`),
    detailsPanelPresent: await evaluate(`!!document.querySelector('.details')`),
    detailsPanelDefaultWas: detailsBefore,
    selected: await selectedNow(),
    camera: (await evaluate(READ_FIRST_SCREEN)).camera,
  };
  check("P-19 / P-21 three-brain composition, focus, language, density, motion, legend and panel left behind for the restart", record.leftBehind);
}

/* --- pass 2: a NEW process over the SAME sandbox ------------------------------------------- */

if (pass === 2) {
  const restoredState = (id) => ({
    id, keys: ["A", "B", "C"], focus: "C", locale: "en", scheme: "light", motion: "no-preference", density: "compact", appMotion: "reduce", legend: true, menu: false,
  });
  for (const size of [SIZES[0], SIZES[1]]) {
    const granted = await resizeTo(size.width, size.height);
    await emulate("light", "no-preference");
    await quiet();
    const scenario = restoredState("restored");
    const entry = await measureState({ size, granted, scenario, aside: size.label === "960x640" });
    matrix.push(entry);
    if (size.label === "1280x800") {
      const layout = entry.layout;
      record.restored = {
        displayed: (await chipIds()).map(keyOfBrain),
        focus: keyOfBrain(await focusedId()),
        locale: await evaluate(`document.querySelector('[data-testid="language-en"]')?.getAttribute('aria-pressed') === 'true' ? 'en' : (document.querySelector('[data-testid="language-fr"]')?.getAttribute('aria-pressed') === 'true' ? 'fr' : null)`),
        density: layout.appliedPreferences.density,
        motion: layout.appliedPreferences.motion,
        legendOpen: await evaluate(`document.querySelector('[data-testid="map-legend-toggle"]')?.getAttribute('aria-expanded') === 'true'`),
        detailsPanelPresent: await evaluate(`!!document.querySelector('.details')`),
        selectedNodeId: await evaluate(`Number(document.querySelector('[data-card="true"][aria-selected="true"]')?.getAttribute('data-node-id') ?? 0) || null`),
        camera: layout.camera,
        corrections: entry.composition.corrections?.words ?? null,
        groupsOpenAtStart: layout.groups.filter((group) => group.open).map((group) => group.testid),
        note: "A group's open state is the engine state of a native <details>; nothing writes it, so every group is found closed by design.",
      };
      check("P-19 the three-brain composition, the focus and the preferences come back after a restart", record.restored);
    }
  }
}

/* --- pass 3: a brain vanished from the catalogue between two processes --------------------- */

if (pass === 3) {
  const correctedStates = [
    { id: "corrected-fr-light", locale: "fr", scheme: "light", density: "comfortable", appMotion: "system", motion: "no-preference", legend: false },
    { id: "corrected-en-dark-compact", locale: "en", scheme: "dark", density: "compact", appMotion: "system", motion: "no-preference", legend: false },
  ];
  record.droppedBrain = keyOfBrain(droppedBrainId);
  let first = true;
  for (const size of SIZES) {
    const granted = await resizeTo(size.width, size.height);
    for (const state of correctedStates) {
      await emulate(state.scheme, state.motion);
      await setLocale(state.locale);
      await setDensity(state.density);
      await setMotion(state.appMotion);
      await setLegend(state.legend);
      if (first) {
        // What the restart itself found, before any presentation choice of this pass.
        record.restoredAfterTheBrainVanished = {
          displayed: (await chipIds()).map(keyOfBrain),
          focus: keyOfBrain(await focusedId()),
          corrections: await evaluate(`document.querySelector('[data-testid="workspace-corrections"]')?.getAttribute('data-corrections') ?? null`),
          correctionLines: await evaluate(`[...document.querySelectorAll('[data-testid="workspace-corrections"] li')].map((li) => li.textContent.trim())`),
        };
        first = false;
      }
      const scenario = { ...state, keys: record.restoredAfterTheBrainVanished.displayed, focus: record.restoredAfterTheBrainVanished.focus, menu: false };
      matrix.push(await measureState({ size, granted, scenario, aside: false }));
    }
  }
  // The notice is dismissible, and the dismiss control works from the hardest window.
  await resizeTo(960, 640);
  const dismissBefore = await evaluate(`!!document.querySelector('[data-testid="workspace-corrections"]')`);
  // ACTION-0113: where the button is when the notice appears — no `scrollIntoView` first (that is what
  // `click()` does, and it would hide the very defect). The press is real and must land on the button.
  const dismissAt = await pressWithoutScrolling(testid("workspace-corrections-dismiss"));
  record.dismissalAtAppearance = {
    dismissAimableWithoutScrolling: dismissAt?.hit === true && dismissAt?.inWindow === true,
    chromeBandScrollTopBeforeThePress: dismissAt?.chromeScrollTop ?? null,
    documentScrollYBeforeThePress: dismissAt?.documentScrollY ?? null,
  };
  assert.equal(record.dismissalAtAppearance.dismissAimableWithoutScrolling, true, "the corrections dismiss button answers a press where the notice drew it");
  await until(`!document.querySelector('[data-testid="workspace-corrections"]')`);
  await quiet();
  const afterDismiss = await evaluate(READ_FIRST_SCREEN);
  record.dismissal = {
    presentBefore: dismissBefore, goneAfter: true,
    primaryFullyVisibleAfter: PRIMARY_COMMANDS.filter((wanted) => afterDismiss.commands.find((command) => command.id === wanted.id)?.fullyVisible === true).length,
    mapViewVisibleHeightPx: afterDismiss.firstScreen.mapViewVisibleHeightPx,
  };
  check("the corrections notice is dismissed by a real click at 960x640", record.dismissal);
}

/* --- the verdict ---------------------------------------------------------------------------- */

record.verdict = summarise(matrix);
check("criterion 3 — every essential command whole, in every state", {
  essentialWholeEveryState: record.verdict.essentialWholeEveryState,
  worstPrimaryWhole: record.verdict.worstPrimaryWhole,
  statesWhereEssentialIsNotWhole: record.verdict.statesWhereEssentialIsNotWhole.length,
});

/* --- nothing outside the contract happened -------------------------------------------------- */

const measurementCalls = wireCalls.slice(mark);
const forbidden = measurementCalls.filter((name) => FORBIDDEN_DURING_MEASUREMENT.test(name));
assert.deepEqual(forbidden, [], `the measurement wrote on the wire: ${JSON.stringify(forbidden)}`);
const diskAfter = {};
for (const entry of seed.brains) {
  diskAfter[entry.folder] = await hashTree(entry.root);
  assert.equal(diskAfter[entry.folder], diskBefore[entry.folder].hash, `P-22: the analysed directory ${entry.folder} is byte-identical after the session`);
  const artefacts = diskBefore[entry.folder].listing.filter((path) => /(^|\/)(\.filetopo|filetopo)|\.sqlite(-wal|-shm)?$/i.test(path));
  assert.deepEqual(artefacts, [], `P-22: no FileTopo artefact under the analysed root ${entry.folder}`);
}
for (const key of ["A", "B", "C"]) {
  if (pass === 3 && idOf(key) === droppedBrainId) continue;
  const view = await invoke("map_view", { brainId: idOf(key) });
  assert.equal(view.indexRevision, viewsAtSetup[key].indexRevision, `the measured window did not touch the Index of ${key}`);
}
check("P-22 in this scope: four sources byte-identical, no artefact under any root, no write on the wire", {
  commandsSeen: [...new Set(measurementCalls)].sort(),
  rootsChecked: seed.brains.length,
  rootsStillRegistered: rootsOnDisk.length,
});
assert.equal(fatal.length, 0, `fatal page/console errors: ${JSON.stringify(fatal.slice(0, 2))}`);

record.matrix = matrix;
record.captures = captures;
record.fatalConsoleErrors = fatal.length;
record.layoutDigest = sha(
  matrix.map((entry) => [
    entry.size, entry.state, entry.layout.documentOverflowX, entry.layout.documentVerticalScrollPx,
    entry.layout.firstScreen.mapViewVisibleHeightPx, entry.layout.controlIdsDigest,
    entry.layout.commandsInDom, entry.layout.commandsLaidOut, entry.layout.commandsOnFirstScreen, entry.layout.commandsFullyVisible,
  ]),
);
await writeFile(join(proofRoot, `run-${phase}-pass${pass}.json`), JSON.stringify(record, null, 2));
console.log(JSON.stringify({
  phase, pass, ok: true,
  statesJudged: record.verdict.statesJudged,
  essentialWholeEveryState: record.verdict.essentialWholeEveryState,
  primaryThirteenWholeEveryState: record.verdict.primaryThirteenWholeEveryState,
  worstPrimaryWhole: record.verdict.worstPrimaryWhole,
  chipsAndRemovesWholeEveryState: record.verdict.chipsAndRemovesWholeEveryState,
  menuItemsWholeEveryOpenMenuState: record.verdict.menuItemsWholeEveryOpenMenuState,
  groupEntryPointsWholeEveryState: record.verdict.groupEntryPointsWholeEveryState,
  mapAtLeastFloorEveryState: record.verdict.mapAtLeastFloorEveryState,
  worstMapVisibleHeightPx: record.verdict.worstMapVisibleHeightPx,
  noHorizontalOverflow: record.verdict.noHorizontalOverflowNoEscapeNoClippedControlEveryState,
  digest: record.layoutDigest,
}));
ws.close();
process.exit(0);
