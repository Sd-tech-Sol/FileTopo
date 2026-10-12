// TASK-0062 — Stage B / B05: are the three right-hand panels usable when they are POPULATED?
//
//   node scripts/task0062-populated-panels.mjs <port> <variant> <pass> <proofRoot> <head> <appPid> <phase>
//   (seed JSON on stdin)
//
// `B01`..`B04` (VERIFIED) measured the shell with brains that held no relation at all, so
// `RelationsPanel`, `ReviewQueuePanel` and `CrossRelationsPanel` were only ever drawn in
// their empty form (ACTION-0114 states it: "pas peuplés à 960"). This harness populates them
// through the paths the PRODUCT already has — the frozen synthetic brains (the legacy
// relations of TASK-0017 and the frozen inter-brain set XBR-1 of TASK-0020) and one synthetic
// REAL_ROOT tree on which the product itself observes contents and runs its deterministic
// relation engine from the interface — and asks, of every populated state:
//
// * is each panel present, populated, and entirely inside the right column's width?
// * is every control of each panel WHOLE and aimable once the column scrolls it into view
//   (clipped by every scrolling ancestor, hit-tested at its centre, covered by nothing)?
// * does a real Tab walk reach every enabled control of the three panels, in order, each one
//   whole and ringed when it holds the focus, without ever scrolling the document?
// * is the map at least 240 CSS px, is there no horizontal overflow, no axe violation?
//
// and then, by real mouse and real keyboard, on synthetic data only: navigate a relation,
// approve, revoke, confirm, reject, postpone, approve an inter-brain suggestion and revoke it,
// check that no action confuses two brains, that the modal composition menu and the status
// layer do not crush a panel, and (process 2) what a restart brings back.
//
// Nothing here changes the product. A failing criterion is a measurement, not a script error:
// the script fails only when the measurement itself could not be taken, when the analysed
// tree moved (P-22), or when a measurement-phase call wrote.
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
assert(/^task0062-[a-f0-9]+$/.test(variant), "variant");
assert([1, 2].includes(pass), "pass must be 1 or 2");
assert(/^[a-f0-9]{40}$/.test(headTested ?? ""), "HEAD sha (argv[6]) required");
assert(Number.isInteger(appPid) && appPid > 0, "application pid (argv[7]) required");
assert(phase === "measure", "phase (argv[8]) must be measure");

/** The acceptance floor: B05 may not regress below what B02 MEASURED. */
const MAP_FLOOR_PX = 240;

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

/* --- CDP plumbing, reused unchanged from the B04 harness ------------------------------------ */

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
      // TASK-0062: enough to name the element — its text, its nearest test id, and whether the
      // overflow is an ellipsis (text hidden on purpose) or plain content pushed out of the box.
      scrollers.push({
        tag: el.tagName, cls: String(el.className).slice(0, 70), overflowPx: over,
        text: (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 70),
        nearestTestId: el.closest('[data-testid]')?.getAttribute('data-testid') ?? null,
        parentCls: String(el.parentElement?.className ?? '').slice(0, 50),
        overflowXStyle: style.overflowX, textOverflow: style.textOverflow, whiteSpace: style.whiteSpace,
      });
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

/* --- B05 helpers ---------------------------------------------------------------------------- */

Object.assign(KEYS, {
  ArrowDown: { code: "ArrowDown", vk: 40 },
  ArrowUp: { code: "ArrowUp", vk: 38 },
  End: { code: "End", vk: 35 },
  Escape: { code: "Escape", vk: 27 },
  " ": { code: "Space", vk: 32, text: " " },
});
const SHIFT = 8;

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
const RESET_SCROLL = `(() => {
  window.scrollTo(0, 0);
  for (const region of document.querySelectorAll('.app, .app *')) {
    if (region.scrollTop !== 0) region.scrollTop = 0;
    if (region.scrollLeft !== 0) region.scrollLeft = 0;
  }
})()`;
async function mouseClickAt(x, y) {
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 });
  await pause(220);
}

/* --- reading the three panels, in the page ------------------------------------------------ */

// Shared by every in-page reading below. NO backtick and NO dollar-brace inside: it is spliced
// into template literals.
const VIS_FN = `
  const html = document.documentElement;
  const vw = html.clientWidth, vh = html.clientHeight;
  const round = (n) => Math.round(n * 10) / 10;
  const SEL = 'button, input, select, a[href], summary, [role="button"], [tabindex]:not([tabindex="-1"])';
  const clipTo = (el, r) => {
    let left = Math.max(r.left, 0), top = Math.max(r.top, 0), right = Math.min(r.right, vw), bottom = Math.min(r.bottom, vh);
    const by = [];
    for (let parent = el.parentElement, child = el; parent; child = parent, parent = parent.parentElement) {
      if (getComputedStyle(child).position === 'fixed') break;
      const s = getComputedStyle(parent);
      if (!/auto|scroll|hidden|clip/.test(s.overflowX + ' ' + s.overflowY)) continue;
      const b = parent.getBoundingClientRect();
      const pl = b.left + parent.clientLeft, pt = b.top + parent.clientTop;
      const n = { left: Math.max(left, pl), top: Math.max(top, pt), right: Math.min(right, pl + parent.clientWidth), bottom: Math.min(bottom, pt + parent.clientHeight) };
      if (n.left > left || n.top > top || n.right < right || n.bottom < bottom) by.push(String(parent.className).slice(0, 30) || parent.tagName);
      left = n.left; top = n.top; right = n.right; bottom = n.bottom;
    }
    return { left, top, right, bottom, w: Math.max(0, right - left), h: Math.max(0, bottom - top), by };
  };
  const visState = (el) => {
    const r = el.getBoundingClientRect();
    const c = clipTo(el, r);
    let hit = false, coveredBy = null;
    if (c.w >= 1 && c.h >= 1) {
      const top = document.elementFromPoint(c.left + c.w / 2, c.top + c.h / 2);
      hit = !!top && (top === el || el.contains(top));
      if (!hit && top) {
        coveredBy = top.closest('.app__status') ? 'status-layer'
          : top.closest('.composition__menu') ? 'composition-menu'
          : top.closest('.composition__scrim') ? 'composition-scrim'
          : (top.tagName + '.' + String(top.className).slice(0, 30));
      }
    }
    return { whole: hit && c.h >= r.height - 1 && c.w >= r.width - 1, aimable: hit, visibleH: round(c.h), ownH: round(r.height), visibleW: round(c.w), ownW: round(r.width), clippedBy: c.by, coveredBy };
  };
  const keyOf = (el) => {
    const parts = [el.getAttribute('data-testid') || el.className && String(el.className).split(' ')[0] || el.tagName];
    for (const name of ['data-suggestion-key', 'data-cross-approve', 'data-relation-revoke', 'data-cross-revoke', 'data-endpoint-key', 'data-direction']) {
      const v = el.getAttribute(name);
      if (v) parts.push(v);
    }
    return parts.join('|').slice(0, 120);
  };
  const PANELS = [['relations', 'section.relations'], ['review', 'section.review'], ['cross', 'section.cross-relations']];
  const panelOf = (el) => {
    const p = el && el.closest ? el.closest('section.relations, section.review, section.cross-relations') : null;
    return p ? (p.classList.contains('relations') ? 'relations' : p.classList.contains('review') ? 'review' : 'cross') : null;
  };
`;

const READ_PANELS = `(() => {
  ${VIS_FN}
  const aside = document.querySelector('.app__aside');
  const asideBox = aside.getBoundingClientRect();
  const out = {};
  const offsets = {};
  aside.scrollTop = 0;
  for (const [name, selector] of PANELS) {
    const el = document.querySelector(selector);
    if (el) offsets[name] = Math.round(el.getBoundingClientRect().top - asideBox.top + aside.scrollTop);
  }
  for (const [name, selector] of PANELS) {
    const root = document.querySelector(selector);
    if (!root) { out[name] = { present: false }; continue; }
    root.scrollIntoView({ block: 'start', inline: 'nearest' });
    const pr = root.getBoundingClientRect();
    const descendants = [...root.querySelectorAll('*')].filter((el) => !el.closest('svg'));
    const escapers = descendants.filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && (r.right > pr.right + 1 || r.left < pr.left - 1);
    }).slice(0, 8).map((el) => ({ tag: el.tagName, cls: String(el.className).slice(0, 50), text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 70), right: round(el.getBoundingClientRect().right), panelRight: round(pr.right) }));
    const spills = descendants.filter((el) => {
      if (el.scrollWidth - el.clientWidth <= 1) return false;
      const ox = getComputedStyle(el).overflowX;
      return ox !== 'auto' && ox !== 'scroll';
    }).slice(0, 12).map((el) => ({
      tag: el.tagName, cls: String(el.className).slice(0, 50), over: el.scrollWidth - el.clientWidth,
      text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 70),
      textOverflow: getComputedStyle(el).textOverflow, whiteSpace: getComputedStyle(el).whiteSpace,
    }));
    let minFont = 999;
    for (const el of descendants) {
      let own = '';
      for (const n of el.childNodes) if (n.nodeType === 3) own += n.textContent;
      if (own.trim().length > 0) minFont = Math.min(minFont, parseFloat(getComputedStyle(el).fontSize));
    }
    const controls = [...root.querySelectorAll(SEL)].filter((el) => !el.closest('svg'));
    const rows = controls.map((el) => {
      el.scrollIntoView({ block: 'center', inline: 'nearest' });
      const st = visState(el);
      const r = el.getBoundingClientRect();
      return {
        key: keyOf(el), tag: el.tagName, disabled: !!el.disabled, w: round(r.width), h: round(r.height),
        targetAtLeast24: r.width >= 24 && r.height >= 24,
        labelClipped: el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1,
        ...st,
      };
    });
    root.scrollIntoView({ block: 'start', inline: 'nearest' });
    const headings = [...root.querySelectorAll('h2, h3, h4')].map((h) => (h.textContent || '').trim().slice(0, 60));
    out[name] = {
      present: true,
      heightPx: round(pr.height), widthPx: round(pr.width), startsInsideTheColumnAtPx: offsets[name], columnClientHeightPx: aside.clientHeight,
      insideAsideWidth: pr.left >= asideBox.left - 1 && pr.right <= asideBox.left + aside.clientWidth + 1,
      textChars: (root.textContent || '').length,
      minFontPx: minFont === 999 ? null : minFont,
      headings,
      escapers, spills,
      controls: rows,
      enabledControls: rows.filter((c) => !c.disabled).length,
      controlsWholeAfterScroll: rows.filter((c) => !c.disabled).every((c) => c.whole),
      controlsAimableAfterScroll: rows.filter((c) => !c.disabled).every((c) => c.aimable),
      controlsLabelClipped: rows.filter((c) => c.labelClipped).map((c) => c.key),
      controlsBelow24: rows.filter((c) => !c.targetAtLeast24).map((c) => c.key + ' ' + c.w + 'x' + c.h),
      counts: {
        relationLinks: root.querySelectorAll('.relation__link[data-endpoint-key]').length,
        coreSuggestions: root.querySelectorAll('li.suggestion').length,
        crossLinks: root.querySelectorAll('.cross-relation__link').length,
        crossSuggestions: root.querySelectorAll('li.cross-suggestion').length,
        revokes: root.querySelectorAll('[data-relation-revoke], [data-cross-revoke]').length,
        totalsText: (root.querySelector('[data-testid="relation-totals"], [data-testid="cross-relation-totals"]')?.textContent || '').trim().slice(0, 140),
        queueTotalPending: root.querySelector('[data-testid="open-review-queue"]')?.getAttribute('data-total-pending') ?? null,
        queueToggleExpanded: root.querySelector('[data-testid="open-review-queue"]')?.getAttribute('aria-expanded') ?? null,
        queuePosition: (root.querySelector('[data-testid="review-position"]')?.textContent || '').trim().slice(0, 140) || null,
        engineState: (root.querySelector('[data-testid="relation-engine-state"]')?.textContent || '').trim().slice(0, 100) || null,
      },
    };
  }
  // The column is the one region allowed to scroll: say what it does, and prove the document does not.
  aside.scrollTop = aside.scrollHeight;
  const atBottom = { documentScrollY: Math.round(window.scrollY), asideScrollTop: Math.round(aside.scrollTop) };
  const asideState = {
    clientHeight: aside.clientHeight, scrollHeight: aside.scrollHeight, overflowY: getComputedStyle(aside).overflowY,
    scrollsInside: aside.scrollHeight - aside.clientHeight > 1,
    documentScrollYWhenAsideAtBottom: atBottom.documentScrollY,
    documentVerticalScrollPx: Math.max(0, html.scrollHeight - html.clientHeight),
    documentOverflowX: Math.max(0, html.scrollWidth - html.clientWidth),
  };
  aside.scrollTop = 0;
  window.scrollTo(0, 0);
  return { panels: out, aside: asideState };
})()`;

/** What holds the focus, in the three panels' own vocabulary. */
const READ_ACTIVE = `(() => {
  ${VIS_FN}
  const el = document.activeElement;
  const aside = document.querySelector('.app__aside');
  if (!el || el === document.body) return { isBody: true, inAside: false, panel: null, documentScrollY: Math.round(window.scrollY) };
  const st = visState(el);
  const s = getComputedStyle(el);
  return {
    isBody: false, key: keyOf(el), tag: el.tagName, inAside: aside.contains(el), panel: panelOf(el),
    outlineStyle: s.outlineStyle, outlineWidthPx: parseFloat(s.outlineWidth) || 0, boxShadow: s.boxShadow === 'none' ? null : s.boxShadow.slice(0, 40),
    disabled: !!el.disabled, documentScrollY: Math.round(window.scrollY), ...st,
  };
})()`;

/** The enabled controls of the three panels, in DOM order, named the way READ_ACTIVE names them. */
const READ_PANEL_CONTROLS = `(() => {
  ${VIS_FN}
  const list = [];
  for (const [name, selector] of PANELS) {
    const root = document.querySelector(selector);
    if (!root) continue;
    for (const el of root.querySelectorAll(SEL)) if (!el.disabled && !el.closest('svg')) list.push({ panel: name, key: keyOf(el) });
  }
  return list;
})()`;

const FOCUS_FIRST_IN_PANELS = `(() => {
  ${VIS_FN}
  for (const [name, selector] of PANELS) {
    const root = document.querySelector(selector);
    if (!root) continue;
    const first = [...root.querySelectorAll(SEL)].find((el) => !el.disabled && !el.closest('svg'));
    if (first) { first.focus(); return { panel: name, key: keyOf(first) }; }
  }
  return null;
})()`;

let accessibilityEnabled = false;
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
  return { role: node.role?.value ?? null, name: (node.name?.value ?? "").slice(0, 160), expanded: property("expanded"), focusable: property("focusable") };
}

/** A real Tab walk through the three panels: from the first control of the first present
 *  panel until the focus leaves the last one. Every step is a real key event. */
async function panelsTabWalk({ limit = 160 } = {}) {
  await evaluate(RESET_SCROLL);
  const controls = await evaluate(READ_PANEL_CONTROLS);
  const first = await evaluate(FOCUS_FIRST_IN_PANELS);
  if (!first) return { controls, steps: [], reached: [], unreached: controls.map((c) => c.key), note: "no focusable control in any panel" };
  // A script's focus() after a pointer press is not a keyboard focus (:focus-visible does not match it):
  // step out and back in with real keys, so the ring read below is the one a keyboard user gets.
  await press("Tab", SHIFT);
  await press("Tab");
  const steps = [];
  for (let index = 0; index < limit; index += 1) {
    const at = await evaluate(READ_ACTIVE);
    steps.push(at);
    if (index > 0 && at.panel === null) break;
    await press("Tab");
  }
  const inPanels = steps.filter((s) => s.panel !== null);
  const reached = [...new Set(inPanels.map((s) => s.key))];
  const unreached = controls.filter((c) => !reached.includes(c.key)).map((c) => `${c.panel}:${c.key}`);
  const notWhole = inPanels.filter((s) => !s.whole).map((s) => ({ key: s.key, panel: s.panel, visibleH: s.visibleH, ownH: s.ownH, coveredBy: s.coveredBy, clippedBy: s.clippedBy }));
  const noRing = inPanels.filter((s) => !(s.outlineStyle !== "none" && s.outlineWidthPx >= 2) && !s.boxShadow).map((s) => s.key);
  const documentScrolled = steps.filter((s) => s.documentScrollY !== 0).length;
  const order = inPanels.map((s) => s.panel);
  const orderSane = order.every((p, i) => i === 0 || ["relations", "review", "cross"].indexOf(p) >= ["relations", "review", "cross"].indexOf(order[i - 1]));
  // Shift+Tab back: the walk must retrace its own steps (the last few), no trap.
  const back = [];
  const backDetail = [];
  // A Tab past the last control of the document, or a Shift+Tab before the first, passes through
  // the host's own focus stop once (document.body): it is the wrap-around, not a trap, and the
  // first measurement of this campaign mistook it for a failed retrace. Such a stop is published
  // (`leadingHostStops`), never counted as a step of the retrace, and at most two are tolerated.
  let leadingHostStops = 0;
  for (let n = 0; n < Math.min(6, inPanels.length - 1); n += 1) {
    await press("Tab", SHIFT);
    let at = await evaluate(READ_ACTIVE);
    while (back.length === 0 && at.isBody && leadingHostStops < 2) {
      leadingHostStops += 1;
      await press("Tab", SHIFT);
      at = await evaluate(READ_ACTIVE);
    }
    back.push(at.key ?? null);
    backDetail.push({ key: at.key ?? null, isBody: at.isBody, tag: at.tag ?? null, inAside: at.inAside, panel: at.panel ?? null });
  }
  const expectedBack = inPanels.map((s) => s.key).slice(-back.length).reverse();
  await evaluate(RESET_SCROLL);
  // Where the forward walk ENDED: the first step outside the panels, so a retrace that starts
  // at `null` can be told apart (focus left the document) from a real trap.
  const forwardEnd = steps.slice(-2).map((s) => ({ key: s.key ?? null, isBody: s.isBody, tag: s.tag ?? null, inAside: s.inAside, panel: s.panel ?? null }));
  return {
    controls: controls.length, steps: steps.length, stepsInPanels: inPanels.length, reachedCount: reached.length,
    unreached, notWhole, noRing, documentScrolledSteps: documentScrolled, orderSane,
    leftThePanels: steps[steps.length - 1]?.panel === null,
    shiftTabRetraces: JSON.stringify(back) === JSON.stringify(expectedBack), shiftTabKeys: back,
    shiftTabDetail: backDetail, forwardEnd, expectedBack, leadingHostStops,
  };
}

/** Tabs (really) from the first control of the panels to the first control matching `selector`;
 *  returns the number of presses, or null if it was never reached. */
async function tabTo(selector, { limit = 160 } = {}) {
  await evaluate(RESET_SCROLL);
  await evaluate(FOCUS_FIRST_IN_PANELS);
  for (let presses = 0; presses < limit; presses += 1) {
    if (await evaluate(`(() => { const el = document.activeElement; return !!el && el.matches(${JSON.stringify(selector)}); })()`)) return presses;
    await press("Tab");
  }
  return null;
}

/* --- shots --------------------------------------------------------------------------------- */

const captures = [];
const PUBLISHED = new Set([
  "960x640/alpha3-frLight/top", "960x640/alpha3-frLight/relations", "960x640/alpha3-frLight/review", "960x640/alpha3-frLight/cross",
  "960x640/alpha3-enDarkCompactReduced/top", "960x640/alpha3-enDarkCompactReduced/cross",
  "960x640/atelierLong-frLight/relations", "960x640/atelierLong-frLight/review",
  "960x640/atelierLong-enDarkCompactReduced/relations", "960x640/full4-frLight/top",
  "1280x800/alpha3-frLight/top", "1280x800/alpha3-frLight/review", "1366x768/atelierRapport-enDarkCompactReduced/relations",
]);
async function shoot(key, note) {
  const shot = await send("Page.captureScreenshot", { format: "png" });
  const bytes = Buffer.from(shot.data, "base64");
  const file = `TASK-0062-${key.replaceAll("/", "-")}.png`;
  await writeFile(join(proofRoot, file), bytes);
  captures.push({
    key, file, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex"),
    scrollYAtCapture: await evaluate("Math.round(window.scrollY)"),
    asideScrollTopAtCapture: await evaluate("Math.round(document.querySelector('.app__aside')?.scrollTop ?? 0)"),
    published: PUBLISHED.has(key), note,
  });
}
async function scrollAsideTo(selector) {
  await evaluate(`(() => {
    const aside = document.querySelector('.app__aside'); const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return;
    aside.scrollTop += el.getBoundingClientRect().top - aside.getBoundingClientRect().top;
  })()`);
  await pause(120);
}

/* --- the fixture, as the product sees it ----------------------------------------------------- */

const KEY = { A: seed.brains[0], B: seed.brains[1], C: seed.brains[2], R: seed.brains[3] };
assert.equal(KEY.A.brain, "brain-alpha");
assert.equal(KEY.R.kind, "REAL_ROOT");
const idOf = (key) => KEY[key].brain;
const keyOfBrain = (brainId) => Object.entries(KEY).find(([, entry]) => entry.brain === brainId)?.[0] ?? null;

const record = {
  task: "TASK-0062", stage: "B / B05", phase, pass, headTested, mapFloorPx: MAP_FLOOR_PX,
  fixtureBrains: seed.brains.map((entry) => ({
    key: keyOfBrain(entry.brain), brainId: entry.brain, name: entry.name, nameLengthCharacters: [...entry.name].length,
    sourceKind: entry.kind, sourceRef: entry.kind === "REAL_ROOT" ? "(opaque)" : entry.sourceRef, position: entry.position,
  })),
  checks: [], findings: [],
};
const check = (label, value = true) => {
  record.checks.push({ label, value });
  return value;
};
const finding = (id, text, evidence = null) => {
  record.findings.push({ id, text, evidence });
  return id;
};
/** The calls that WRITE (the product's own stores, never an analysed tree). Forbidden while measuring. */
const MUTATING =
  /^map_(refresh|rebuild|prepare_|reveal_node|copy_node_path|write_run_artifact|brain_exclusions_replace|brain_choose_real_root|brain_save_identity|relation_engine_run|relations_(approve|reject|revoke)|cross_relations_(approve|revoke)|content_observe)/;

await until("!!window.__TAURI_INTERNALS__");
const ROOT = seed.atelierRoot;
const diskBefore = { entries: (await walkDisk(ROOT)).length + 1, hash: await hashTree(ROOT), listing: await walkDisk(ROOT) };

const chipIds = () => evaluate(`[...document.querySelectorAll('.composition__focus')].map((el) => el.getAttribute('data-brain-id'))`);
const focusedId = () => evaluate(`document.querySelector('.composition__focus[aria-current="true"]')?.getAttribute('data-brain-id') ?? null`);
const triggerExpanded = () => evaluate(`document.querySelector('[data-testid="composition-add-trigger"]')?.getAttribute('aria-expanded')`);
async function setMenu(open) {
  if ((await triggerExpanded()) === String(open)) return;
  if (!open) {
    // The open menu is modal (B04): the way out a person has is Escape, else a press on the scrim.
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

async function searchFor(text) {
  if (await evaluate(`(document.querySelector('#map-search-input')?.value ?? '').length > 0`)) {
    await click(testid("search-clear"));
    await until(`(document.querySelector('#map-search-input')?.value ?? '') === ''`);
  }
  await click("#map-search-input");
  await send("Input.insertText", { text });
  await until(`document.querySelector('#map-search-input').value === ${JSON.stringify(text)}`);
}
/** Selects a node of the FOCUSED brain with the product's own search, then clears the search so
 *  the measured chrome is the ordinary one. */
async function selectNode(node) {
  await searchFor(node.name);
  const hits = `[...document.querySelectorAll('[data-testid="search-hit"]')].filter((el) => el.getAttribute('data-node-id') === '${node.nodeId}' && (el.textContent || '').includes(${JSON.stringify(node.relativePath)}))`;
  await until(`${hits}.length > 0`, 60000);
  const hitSelector = `[data-testid="search-hit"][data-node-id="${node.nodeId}"]`;
  await click(hitSelector);
  await until(`!!document.querySelector('[data-testid="relation-totals"]') || !!document.querySelector('.relations')`, 60000);
  await click(testid("search-clear"));
  await until(`(document.querySelector('#map-search-input')?.value ?? '') === ''`);
  await quiet();
}
async function setReview(open) {
  await until(`!!document.querySelector('[data-testid="open-review-queue"]')`, 60000);
  const expanded = await evaluate(`document.querySelector('[data-testid="open-review-queue"]').getAttribute('aria-expanded')`);
  if (expanded !== String(open)) {
    await click(testid("open-review-queue"));
    await until(`document.querySelector('[data-testid="open-review-queue"]').getAttribute('aria-expanded') === '${open}'`);
    await quiet();
  }
}
const counts = (o) => ({ det: o.deterministicCount, approved: o.approvedCount, pending: o.pendingSuggestionCount });
const relOverview = (key) => invoke("map_relations_open", { brainId: idOf(key) });
const crossOverview = () => invoke("map_cross_relations_open");
const reviewQueue = (key) => invoke("map_relations_review_queue", { brainId: idOf(key), offset: 0, limit: 50 });
const activeNow = () => evaluate(READ_ACTIVE);
const selectedName = () => evaluate(`document.querySelector('.details__name')?.textContent?.trim() ?? null`);
const wireSince = (mark) => wireCalls.slice(mark);

/** What a workspace looks like, for P-19: read before anything else is touched in a new process. */
const readSnapshot = async () => ({
  chips: (await chipIds()).map(keyOfBrain),
  focusedBrain: keyOfBrain(await focusedId()),
  lang: await evaluate(`document.documentElement.getAttribute('lang')`),
  density: await evaluate(`document.documentElement.getAttribute('data-density')`),
  motion: await evaluate(`document.documentElement.getAttribute('data-motion')`),
  reviewExpanded: await evaluate(`document.querySelector('[data-testid="open-review-queue"]')?.getAttribute('aria-expanded') ?? null`),
  detailsPanelVisible: await evaluate(`!!document.querySelector('.details__name') || !!document.querySelector('.details')`),
  selectedName: await selectedName(),
  stores: {
    A: counts(await relOverview("A")), R: counts(await relOverview("R")),
    cross: (({ deterministicCount, approvedCount, pendingSuggestionCount }) => ({ det: deterministicCount, approved: approvedCount, pending: pendingSuggestionCount }))(await crossOverview()),
  },
});

/* --- index and populate the panels, through the product ------------------------------------------ */

/** The thirteen commands B03 made whole on the opening screen: the contract B05 preserves. */
const PRIMARY_COMMANDS = [
  "composition-add-trigger", "brain-add-real-root", "lifecycle-open", "lifecycle-refresh", "search-input", "search-clear",
  "fit-composition", "reset-view", "map-legend-toggle", "language-fr", "language-en", "density-compact", "motion-reduce",
];

if (pass === 1) {
  for (const key of ["A", "B", "C"]) {
    await invoke("map_prepare_synthetic_source", { brainId: idOf(key) });
    await invoke("map_refresh", { brainId: idOf(key) });
  }
  await invoke("map_refresh", { brainId: idOf("R") });
}
await until(`document.querySelectorAll('[data-testid="composed-canvas"] [data-node-id]').length > 0 || !!document.querySelector(${JSON.stringify(testid("lifecycle-open"))})`);
if (!(await evaluate(`document.querySelectorAll('[data-testid="composed-canvas"] [data-node-id]').length > 0`))) {
  if (await evaluate(`!!document.querySelector(${JSON.stringify(testid("lifecycle-open"))})`)) await click(testid("lifecycle-open"));
}
await until(`document.querySelectorAll('[data-testid="composed-canvas"] [data-node-id]').length > 0`);
await quiet();
const restoredSnapshot = pass === 2 ? await readSnapshot() : null;
const viewsAtSetup = {};
for (const key of ["A", "B", "C", "R"]) {
  const view = await invoke("map_view", { brainId: idOf(key) });
  viewsAtSetup[key] = { indexed: view.nodeCount, indexRevision: view.indexRevision };
}
assert.equal(viewsAtSetup.R.indexed, diskBefore.entries, "Index cardinality equals the disk (REAL_ROOT)");
record.index = viewsAtSetup;
{
  const catalogue = await invoke("map_brains");
  record.catalogue = catalogue.brains.map((brain) => ({ brainId: brain.brainId, name: brain.displayName, sourceKind: brain.sourceKind, harnessKey: keyOfBrain(brain.brainId) }));
  assert.deepEqual(record.catalogue.map((b) => b.name), seed.brains.map((b) => b.name), "the catalogue names are the seeded ones (renames survive the open)");
}

// The frozen sets: the product seeds them itself when it opens them.
const alphaOv = await relOverview("A");
const crossOv = await crossOverview();
record.populationFrozen = {
  alphaLegacyInScope: alphaOv.legacyInScope, alpha: counts(alphaOv),
  cross: { det: crossOv.deterministicCount, approved: crossOv.approvedCount, pending: crossOv.pendingSuggestionCount },
};

// The REAL_ROOT tree: the product observes contents and runs its engine from the interface.
const NODE_PATHS = { rapport: "rapports/rapport-original.txt", note2: "versions/note-2.txt", longPrefix: "dossier-éàç/nom-tres-long-" };
async function openGroup(testidValue, open) {
  const isOpen = await evaluate(`document.querySelector('[data-testid="${testidValue}"]').open`);
  if (isOpen !== open) {
    await click(`[data-testid="${testidValue}"] > summary`);
    await until(`document.querySelector('[data-testid="${testidValue}"]').open === ${open}`);
  }
}
async function locateAtelierNode(relativePath) {
  await composeTo(["R"], "R");
  const stem = relativePath.split("/").pop().replace(/\.txt$/, "");
  await searchFor(stem);
  await until(`[...document.querySelectorAll('[data-testid="search-hit"]')].some((el) => (el.textContent || '').includes(${JSON.stringify(relativePath)}))`, 60000);
  const found = await evaluate(`(() => {
    const el = [...document.querySelectorAll('[data-testid="search-hit"]')].find((x) => (x.textContent || '').includes(${JSON.stringify(relativePath)}));
    return el ? { nodeId: Number(el.getAttribute('data-node-id')), name: el.firstChild.textContent.trim() } : null;
  })()`);
  await click(testid("search-clear"));
  await until(`(document.querySelector('#map-search-input')?.value ?? '') === ''`);
  return { ...found, relativePath };
}
if (pass === 1) {
  const seedNode = await locateAtelierNode(NODE_PATHS.rapport);
  await selectNode(seedNode);
  await openGroup("map-advanced-tools", true);
  await click(testid("observe-content"));
  await until(`!!document.querySelector('[data-testid="content-report"]')`, 180000);
  await quiet();
  const contentReport = JSON.parse(await evaluate(`document.querySelector('[data-testid="content-report"]').getAttribute('data-report')`));
  assert.equal(contentReport.brainId, idOf("R"), "the content campaign ran on the REAL_ROOT brain");
  assert.equal(contentReport.readOnlyConfirmed, true, "the content campaign declares itself read-only");
  await until(`!!document.querySelector('[data-testid="analyze-relations"]:not(:disabled)')`, 120000);
  await click(testid("analyze-relations"));
  await until(`!!document.querySelector('[data-testid="relation-engine-summary"]')`, 180000);
  await quiet();
  record.engineReport = JSON.parse(await evaluate(`document.querySelector('[data-testid="relation-engine-summary"]').getAttribute('data-report')`));
  await openGroup("map-advanced-tools", false);
}
const atelierOv = await relOverview("R");
const queueR = await reviewQueue("R");
record.populationAtelier = { counts: counts(atelierOv), queueTotalPending: queueR.totalPending, legacyInScope: atelierOv.legacyInScope };
assert(atelierOv.deterministicCount >= 1 && atelierOv.pendingSuggestionCount >= 2, `the REAL_ROOT brain must be populated by the product: ${JSON.stringify(record.populationAtelier)}`);

/** Every endpoint of a brain's relations, with its node id, keyed by relative path. */
function endpointsOf(brainKey, intra, cross) {
  const map = new Map();
  const add = (ep, kind) => {
    if (ep.nodeId == null) return;
    const entry = map.get(ep.relativePath) ?? { nodeId: ep.nodeId, name: ep.name, relativePath: ep.relativePath, intra: 0, cross: 0 };
    entry[kind] += 1;
    map.set(ep.relativePath, entry);
  };
  for (const edge of intra.established) { add(edge.source, "intra"); add(edge.target, "intra"); }
  for (const s of intra.pendingSuggestions) { add(s.source, "intra"); add(s.target, "intra"); }
  if (cross) {
    for (const edge of cross.established) for (const ep of [edge.source, edge.target]) if (ep.brainId === idOf(brainKey)) add(ep, "cross");
    for (const s of cross.pendingSuggestions) for (const ep of [s.source, s.target]) if (ep.brainId === idOf(brainKey)) add(ep, "cross");
  }
  return [...map.values()];
}
const alphaNodes = endpointsOf("A", alphaOv, crossOv).sort((l, r) =>
  ((r.intra > 0) + (r.cross > 0)) - ((l.intra > 0) + (l.cross > 0)) || (r.intra + r.cross) - (l.intra + l.cross) || l.relativePath.localeCompare(r.relativePath));
const atelierNodes = endpointsOf("R", atelierOv, null);
record.nodeCandidates = {
  alpha: alphaNodes.slice(0, 6).map(({ name, relativePath, intra, cross }) => ({ name, relativePath, intra, cross })),
  atelier: atelierNodes.map(({ name, relativePath, intra }) => ({ name, relativePath, intra })),
};
const NODES = {
  alphaBest: alphaNodes[0],
  rapport: atelierNodes.find((n) => n.relativePath === NODE_PATHS.rapport),
  note2: atelierNodes.find((n) => n.relativePath === NODE_PATHS.note2),
  longName: atelierNodes.find((n) => n.relativePath.startsWith(NODE_PATHS.longPrefix)),
  // A node of Alpha that is an endpoint of a PENDING inter-brain suggestion: `alphaBest` is the
  // richest node, but its one inter-brain entry is deterministic, so it offers nothing to
  // approve. The first run of this campaign failed that interaction on exactly that account.
  alphaCrossPending: (() => {
    for (const s of crossOv.pendingSuggestions) {
      for (const ep of [s.source, s.target]) {
        if (ep.brainId === idOf("A") && ep.nodeId != null) return alphaNodes.find((n) => n.nodeId === ep.nodeId) ?? null;
      }
    }
    return null;
  })(),
};
for (const [name, node] of Object.entries(NODES)) assert(node, `fixture node ${name} is reachable through the product's own relations`);
record.nodes = Object.fromEntries(Object.entries(NODES).map(([k, n]) => [k, { name: n.name.length > 60 ? n.name.slice(0, 57) + "…" : n.name, nameLength: [...n.name].length, relativePathLength: [...n.relativePath].length, intra: n.intra ?? 0, cross: n.cross ?? 0 }]));

/* --- the matrix ------------------------------------------------------------------------------------ */

const P_FR_LIGHT = { scheme: "light", motion: "no-preference", density: "comfortable", appMotion: "system", locale: "fr" };
const P_EN_DARK_COMPACT_REDUCED = { scheme: "dark", motion: "reduce", density: "compact", appMotion: "reduce", locale: "en" };
const P_FR_DARK = { ...P_FR_LIGHT, scheme: "dark" };
const P_EN_LIGHT_COMPACT = { ...P_FR_LIGHT, locale: "en", density: "compact" };
const SUBS = {
  alpha3: { keys: ["A", "B", "C"], focus: "A", node: "alphaBest", review: true, expect: { relations: true, review: true, cross: true } },
  alpha3closed: { keys: ["A", "B", "C"], focus: "A", node: "alphaBest", review: false, expect: { relations: true, review: false, cross: true } },
  atelierRapport: { keys: ["R"], focus: "R", node: "rapport", review: true, expect: { relations: true, review: true, cross: false } },
  atelierSuggest: { keys: ["R"], focus: "R", node: "note2", review: true, expect: { relations: true, review: true, cross: false } },
  atelierLong: { keys: ["R"], focus: "R", node: "longName", review: true, expect: { relations: true, review: true, cross: false } },
  full4: { keys: ["A", "B", "C", "R"], focus: "A", node: "alphaBest", review: true, expect: { relations: true, review: true, cross: true } },
};
const PRES = { frLight: P_FR_LIGHT, enDarkCompactReduced: P_EN_DARK_COMPACT_REDUCED, frDark: P_FR_DARK, enLightCompact: P_EN_LIGHT_COMPACT };
const stateOf = (sub, pres) => ({ id: `${sub}-${pres}`, sub, pres, ...SUBS[sub], p: PRES[pres] });
const MATRIX = [
  ["960x640", ["alpha3-frLight", "alpha3-enDarkCompactReduced", "alpha3-frDark", "alpha3-enLightCompact", "alpha3closed-frLight",
    "atelierRapport-frLight", "atelierRapport-enDarkCompactReduced", "atelierSuggest-frLight", "atelierLong-frLight", "atelierLong-enDarkCompactReduced", "full4-frLight"]],
  ["1280x800", ["alpha3-frLight", "alpha3-enDarkCompactReduced", "atelierRapport-frLight", "atelierSuggest-enDarkCompactReduced"]],
  ["1366x768", ["alpha3-frLight", "alpha3-enDarkCompactReduced", "atelierRapport-frLight", "atelierRapport-enDarkCompactReduced"]],
].flatMap(([sizeLabel, ids]) => ids.map((id) => {
  const [sub, pres] = id.split("-");
  return { size: SIZES.find((s) => s.label === sizeLabel), state: stateOf(sub, pres) };
}));
const ONLY = (process.env.T62_ONLY ?? "").split(",").filter(Boolean);

let currentSize = null;
let grantedSizes = {};
async function prepareState(size, st) {
  if (currentSize !== size.label) {
    grantedSizes[size.label] = await resizeTo(size.width, size.height);
    currentSize = size.label;
  }
  await emulate(st.p.scheme, st.p.motion);
  await setLocale(st.p.locale);
  await setDensity(st.p.density);
  await setMotion(st.p.appMotion);
  await composeTo(st.keys, st.focus);
  await selectNode(NODES[st.node]);
  await setReview(st.review);
  await quiet();
  await pause(300);
}

const matrix = [];
async function measureState(size, st) {
  await prepareState(size, st);
  const key = `${size.label}/${st.id}`;
  const layout = await evaluate(READ_FIRST_SCREEN);
  assert.equal(layout.mediaMatches.dark, st.p.scheme === "dark", `prefers-color-scheme not applied at ${key}`);
  assert.equal(layout.mediaMatches.reduceMotion, st.p.motion === "reduce", `prefers-reduced-motion not applied at ${key}`);
  assert.deepEqual(layout.cssViewport, [size.width, size.height], `viewport at ${key}`);
  const menuOpen = (await triggerExpanded()) === "true";
  await shoot(`${size.label}/${st.id}/top`, "The window at scrollY=0 with every scrolling band at its origin: the first screen of this populated state.");
  const read = await evaluate(READ_PANELS);
  for (const name of ["relations", "review", "cross"]) {
    if (!read.panels[name].present) continue;
    await scrollAsideTo({ relations: "section.relations", review: "section.review", cross: "section.cross-relations" }[name]);
    await shoot(`${size.label}/${st.id}/${name}`, `The right column scrolled so that the ${name} panel starts at its top edge (document scrollY stays 0).`);
  }
  await evaluate(RESET_SCROLL);
  const walk = await panelsTabWalk();
  const axe = await axeRun();
  await evaluate(RESET_SCROLL);
  const entry = {
    size: size.label, state: st.id, sub: st.sub, presentation: st.pres, node: st.node, menuOpen,
    focusedBrain: keyOfBrain(await focusedId()), chips: (await chipIds()).map(keyOfBrain),
    layout: {
      documentOverflowX: layout.documentOverflowX, documentVerticalScrollPx: layout.documentVerticalScrollPx,
      sidewaysScrollers: layout.sidewaysScrollers, viewportEscapers: layout.viewportEscapers, clippedControls: layout.clippedControls,
      mapViewVisibleHeightPx: layout.firstScreen.mapViewVisibleHeightPx, mapHitTest: layout.firstScreen.mapHitTest,
      visibleCardCount: layout.firstScreen.visibleCardCount, asideColumn: layout.columns.aside, mapColumn: layout.columns.map,
      scrollRegions: layout.scrollRegions, appliedPreferences: layout.appliedPreferences, camera: layout.camera,
      primaryFullyVisible: PRIMARY_COMMANDS.filter((id) => layout.commands.find((c) => c.id === id)?.fullyVisible === true).length,
      primaryMissing: PRIMARY_COMMANDS.filter((id) => layout.commands.find((c) => c.id === id)?.fullyVisible !== true),
      commandsInDom: layout.commandsInDom, controlIdsDigest: layout.controlIdsDigest,
    },
    panels: read.panels, asideScroll: read.aside, tabWalk: walk,
    axe: { violations: axe.violations, incomplete: axe.incomplete, passes: axe.passes },
  };
  entry.judged = judgeState(entry, st);
  matrix.push(entry);
  return entry;
}

function judgeState(e, st) {
  const p = e.panels;
  const names = ["relations", "review", "cross"];
  const populated = {
    relations: !!p.relations.present && p.relations.counts.relationLinks + p.relations.counts.coreSuggestions > 0,
    review: !!p.review.present && Number(p.review.counts.queueTotalPending ?? 0) > 0 && p.review.counts.queueToggleExpanded === "true" && !!p.review.counts.queuePosition,
    cross: !!p.cross.present && p.cross.counts.crossLinks + p.cross.counts.crossSuggestions > 0,
  };
  const populatedAsExpected = names.every((n) => !st.expect[n] || populated[n]);
  const present = names.filter((n) => p[n].present);
  const insideWidth = present.every((n) => p[n].insideAsideWidth && p[n].escapers.length === 0 && p[n].spills.length === 0);
  const controlsWhole = present.every((n) => p[n].controlsWholeAfterScroll && p[n].controlsAimableAfterScroll);
  const noLabelClipped = present.every((n) => p[n].controlsLabelClipped.length === 0);
  const w = e.tabWalk;
  const keyboardOk = w.unreached.length === 0 && w.notWhole.length === 0 && w.noRing.length === 0 && w.documentScrolledSteps === 0 && w.orderSane && w.shiftTabRetraces && w.leftThePanels;
  const mapOk = e.layout.mapViewVisibleHeightPx >= MAP_FLOOR_PX && e.layout.mapHitTest?.inside === true;
  const noOverflow = e.layout.documentOverflowX === 0 && e.layout.documentVerticalScrollPx === 0 && e.layout.viewportEscapers.length === 0 && e.layout.sidewaysScrollers.length === 0 && e.layout.clippedControls.length === 0;
  const primary13 = e.layout.primaryFullyVisible === 13;
  const asideOwnScroll = e.asideScroll.documentScrollYWhenAsideAtBottom === 0 && e.asideScroll.overflowY !== "visible";
  const axeClean = e.axe.violations.length === 0;
  return {
    populated, populatedAsExpected, panelsInsideColumnWidth: insideWidth, everyControlWholeAndAimable: controlsWhole, noControlLabelClipped: noLabelClipped,
    keyboardWalkClean: keyboardOk, mapAtLeastFloor: mapOk, noHorizontalOrDocumentOverflow: noOverflow, primaryThirteenWhole: primary13,
    asideScrollsOnItsOwn: asideOwnScroll, axeNoViolation: axeClean,
    all: populatedAsExpected && insideWidth && controlsWhole && noLabelClipped && keyboardOk && mapOk && noOverflow && primary13 && asideOwnScroll && axeClean,
  };
}

function summarise(entries) {
  const every = (f) => entries.every(f);
  const failing = (flag) => entries.filter((e) => !e.judged[flag]).map((e) => `${e.size}/${e.state}`);
  const flags = ["populatedAsExpected", "panelsInsideColumnWidth", "everyControlWholeAndAimable", "noControlLabelClipped", "keyboardWalkClean", "mapAtLeastFloor", "noHorizontalOrDocumentOverflow", "primaryThirteenWhole", "asideScrollsOnItsOwn", "axeNoViolation"];
  const per = Object.fromEntries(flags.map((f) => [f, { everyState: every((e) => e.judged[f]), failing: failing(f) }]));
  return {
    statesJudged: entries.length, everythingHoldsEveryState: every((e) => e.judged.all),
    ...per,
    worstMapVisibleHeightPx: Math.min(...entries.map((e) => e.layout.mapViewVisibleHeightPx)),
    worstPrimaryWhole: Math.min(...entries.map((e) => e.layout.primaryFullyVisible)),
    axeIncompleteRules: [...new Set(entries.flatMap((e) => e.axe.incomplete.map((r) => r.id)))].sort(),
    axeIncompleteNodesMax: Math.max(0, ...entries.map((e) => e.axe.incomplete.reduce((a, r) => a + r.nodes, 0))),
    smallestTargetBelow24: [...new Set(entries.flatMap((e) => ["relations", "review", "cross"].flatMap((n) => e.panels[n].present ? e.panels[n].controlsBelow24 : [])))].slice(0, 12),
    minPanelFontPx: Math.min(...entries.flatMap((e) => ["relations", "review", "cross"].map((n) => e.panels[n].present ? e.panels[n].minFontPx : null).filter((v) => v !== null))),
  };
}

/* --- run ------------------------------------------------------------------------------------------- */

if (ONLY.includes("explore")) {
  // Debug segment: populate, open one state, print what the panels say, stop.
  const size = SIZES[0];
  const st = stateOf("alpha3", "frLight");
  await prepareState(size, st);
  const read = await evaluate(READ_PANELS);
  for (const name of ["relations", "review", "cross"]) {
    const p = read.panels[name];
    console.error(name, JSON.stringify({ present: p.present, heightPx: p.heightPx, counts: p.counts, controls: p.controls?.length, whole: p.controlsWholeAfterScroll, headings: p.headings }));
  }
  console.error("aside", JSON.stringify(read.aside));
  console.error("nodes", JSON.stringify(record.nodes), JSON.stringify(record.nodeCandidates));
  await shoot("960x640/explore/top", "explore");
  console.error("walk", JSON.stringify(await panelsTabWalk()));
  ws.close();
  process.exit(0);
}

const matrixMark = wireCalls.length;
const run1 = pass === 1 || ONLY.length === 0;
let matrixEntries = [];
if (pass === 1) {
  for (const { size, state } of MATRIX) {
    if (ONLY.length > 0 && !ONLY.includes(`${size.label}/${state.id}`)) continue;
    process.stderr.write(`state ${size.label}/${state.id}\n`);
    matrixEntries.push(await measureState(size, state));
  }
} else {
  // Process 2 measures only what a restart can change: the same populated panels at two sizes.
  for (const { size, state } of MATRIX.filter(({ size: s, state: st }) => (s.label === "960x640" && st.id === "alpha3-frLight") || (s.label === "1280x800" && st.id === "alpha3-frLight"))) {
    process.stderr.write(`state ${size.label}/${state.id} (restart)\n`);
    matrixEntries.push(await measureState(size, state));
  }
}
const matrixCalls = wireSince(matrixMark);
const mutatingInMatrix = matrixCalls.filter((name) => MUTATING.test(name));
assert.deepEqual(mutatingInMatrix, [], `the measurement wrote on the wire: ${JSON.stringify(mutatingInMatrix)}`);
record.matrix = matrixEntries;
record.verdict = matrixEntries.length > 0 ? summarise(matrixEntries) : null;
record.grantedWindowSizes = grantedSizes;
record.matrixWireCalls = [...new Set(matrixCalls)].sort();

/* --- interactions, by real mouse and real keyboard, on synthetic data only ------------------------- */

const INT = {};
async function interaction(name, fn) {
  const mark = wireCalls.length;
  process.stderr.write(`interaction ${name}\n`);
  try {
    const result = await fn();
    INT[name] = { ok: true, ...result, wireCalls: [...new Set(wireSince(mark))].sort() };
  } catch (error) {
    INT[name] = { ok: false, error: String(error?.message ?? error).slice(0, 500), wireCalls: [...new Set(wireSince(mark))].sort() };
  }
  await setMenu(false).catch(() => {});
  await evaluate(RESET_SCROLL);
}
async function pollUntil(read, predicate, limit = 30000) {
  const started = Date.now();
  let value;
  while (Date.now() - started < limit) {
    value = await read();
    if (predicate(value)) return value;
    await pause(200);
  }
  throw new Error(`timeout waiting for ${predicate}; last ${JSON.stringify(value)?.slice(0, 200)}`);
}
const sameCounts = (a, b) => JSON.stringify(counts(a)) === JSON.stringify(counts(b));
const crossCounts = (o) => ({ det: o.deterministicCount, approved: o.approvedCount, pending: o.pendingSuggestionCount });
const statusNow = () => evaluate(`document.querySelector('.app__status')?.textContent?.trim() ?? null`);
async function dismissStatus() {
  if (await evaluate(`!!document.querySelector('[data-testid="status-dismiss"]')`)) {
    await click(testid("status-dismiss"));
    await until(`!document.querySelector('[data-testid="status-notice"]')`);
  }
}
async function interactionState(keys = ["A", "B", "C"], focus = "A", node = "alphaBest", review = true) {
  if (pass === 1 && currentSize !== "960x640") {
    grantedSizes["960x640"] = await resizeTo(960, 640);
    currentSize = "960x640";
  }
  await emulate("light", "no-preference");
  await setLocale("fr");
  await setDensity("comfortable");
  await setMotion("system");
  await composeTo(keys, focus);
  await selectNode(NODES[node]);
  await setReview(review);
  await quiet();
  await dismissStatus();
}
const firstKeyOf = (selector) => evaluate(`document.querySelector(${JSON.stringify(selector)})?.getAttribute('data-suggestion-key') ?? null`);
const panelRects = () => evaluate(`(() => {
  const aside = document.querySelector('.app__aside');
  const top = aside.getBoundingClientRect().top - aside.scrollTop;
  const out = {};
  for (const [name, sel] of [['relations', 'section.relations'], ['review', 'section.review'], ['cross', 'section.cross-relations']]) {
    const el = document.querySelector(sel);
    if (!el) { out[name] = null; continue; }
    const r = el.getBoundingClientRect();
    out[name] = [Math.round(r.left), Math.round(r.top - top), Math.round(r.width), Math.round(r.height)];
  }
  return out;
})()`);

if (pass === 1 && !ONLY.includes("noint")) {
  await interactionState();
  await evaluate(RESET_SCROLL);

  /* Relations panel — navigation by mouse then by keyboard ------------------------------------ */
  await interaction("relations.navigate", async () => {
    const sel = ".relations .relation__link[data-endpoint-key]:not(:disabled)";
    const start = await selectedName();
    const mouseTarget = await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); return el ? { name: el.querySelector('.relation__name')?.textContent?.trim(), nodeId: el.getAttribute('data-endpoint-node-id'), direction: el.getAttribute('data-direction') } : null; })()`);
    assert(mouseTarget, "a populated relations panel offers a relation to follow");
    await click(sel);
    await quiet();
    const afterMouse = await selectedName();
    const mouseRelationsAfter = await evaluate(`!!document.querySelector('[data-testid="relation-totals"]')`);
    // Back, then the same by keyboard.
    await selectNode(NODES.alphaBest);
    const presses = await tabTo(sel);
    assert(presses !== null, "the relation link is reachable by Tab");
    const focusedTarget = await evaluate(`(() => { const el = document.activeElement; return { name: el.querySelector('.relation__name')?.textContent?.trim(), direction: el.getAttribute('data-direction') }; })()`);
    await press("Enter");
    await quiet();
    const afterKey = await selectedName();
    await selectNode(NODES.alphaBest);
    return {
      start, mouse: { followed: mouseTarget, selectedAfter: afterMouse, movedToTheEndpoint: afterMouse === mouseTarget.name, panelStillAvailable: mouseRelationsAfter },
      keyboard: { tabPresses: presses, followed: focusedTarget, selectedAfter: afterKey, movedToTheEndpoint: afterKey === focusedTarget.name },
    };
  });

  /* Relations panel — approve by keyboard, revoke by mouse ------------------------------------ */
  await interaction("relations.approveKeyboardRevokeMouse", async () => {
    await selectNode(NODES.alphaBest);
    const a0 = await relOverview("A"), x0 = await crossOverview(), r0 = await relOverview("R");
    const approveSel = '.relations [data-testid="approve-core-suggestion"]';
    const sk = await firstKeyOf(approveSel);
    assert(sk, "the selected node carries a pending suggestion");
    const presses = await tabTo(`${approveSel}[data-suggestion-key="${sk}"]`);
    assert(presses !== null, "the approve control is reachable by Tab");
    const ringBefore = await activeNow();
    await press("Enter");
    const a1 = await pollUntil(() => relOverview("A"), (o) => o.approvedCount === a0.approvedCount + 1);
    await quiet();
    const x1 = await crossOverview(), r1 = await relOverview("R");
    const totalsAfter = await evaluate(`document.querySelector('[data-testid="relation-totals"]')?.textContent?.trim() ?? null`);
    const revokePresent = await evaluate(`!!document.querySelector('[data-relation-revoke="${sk}"]')`);
    const focusAfterApprove = await activeNow();
    const statusAfterApprove = await statusNow();
    // The status layer is on screen NOW: read the panels as they are, with it.
    const withStatus = statusAfterApprove ? await (async () => {
      const read = await evaluate(READ_PANELS);
      const walk = await panelsTabWalk();
      const layer = await evaluate(`(() => { const f = document.querySelector('.app__feedback'); if (!f) return null; const r = f.getBoundingClientRect(); const a = document.querySelector('.app__aside').getBoundingClientRect(); return { top: Math.round(r.top), height: Math.round(r.height), asideBottom: Math.round(a.bottom), overlapsAsideByPx: Math.max(0, Math.round(a.bottom - r.top)) }; })()`);
      return {
        layer, controlsCoveredByTheLayerAfterScroll: ["relations", "review", "cross"].flatMap((n) => read.panels[n].present ? read.panels[n].controls.filter((c) => c.coveredBy === "status-layer").map((c) => `${n}:${c.key}`) : []),
        walkNotWhole: walk.notWhole, walkUnreached: walk.unreached,
      };
    })() : null;
    await dismissStatus();
    await click(`[data-relation-revoke="${sk}"]`);
    const a2 = await pollUntil(() => relOverview("A"), (o) => o.approvedCount === a0.approvedCount);
    await quiet();
    const focusAfterRevoke = await activeNow();
    return {
      suggestionKey: sk, tabPresses: presses, focusRingBeforeEnter: { outlineWidthPx: ringBefore.outlineWidthPx, whole: ringBefore.whole },
      before: counts(a0), afterApprove: counts(a1), afterRevoke: counts(a2),
      approveMovedExactlyOne: a1.approvedCount === a0.approvedCount + 1 && a1.pendingSuggestionCount === a0.pendingSuggestionCount - 1 && a1.deterministicCount === a0.deterministicCount,
      revokeRestoredCounts: sameCounts(a0, a2),
      otherBrainsUntouched: JSON.stringify(crossCounts(x0)) === JSON.stringify(crossCounts(x1)) && sameCounts(r0, r1),
      totalsTextAfterApprove: totalsAfter, revokeControlAppeared: revokePresent,
      statusAfterApprove, focusAfterApprove: { key: focusAfterApprove.key ?? null, isBody: focusAfterApprove.isBody, panel: focusAfterApprove.panel ?? null },
      focusAfterRevoke: { key: focusAfterRevoke.key ?? null, isBody: focusAfterRevoke.isBody, panel: focusAfterRevoke.panel ?? null, restoredToTheSuggestion: focusAfterRevoke.key?.includes(sk) ?? false },
      withStatusLayerOnScreen: withStatus,
    };
  });

  /* Review queue — toggle by mouse and keyboard, postpone, confirm by keyboard, reject by mouse -- */
  await interaction("review.queue", async () => {
    await selectNode(NODES.alphaBest);
    await setReview(false);
    await click(testid("open-review-queue"));
    await until(`document.querySelector('[data-testid="open-review-queue"]').getAttribute('aria-expanded') === 'true'`);
    await quiet();
    const q0 = await reviewQueue("A");
    const a0 = await relOverview("A"), x0 = await crossOverview(), r0 = await relOverview("R");
    const keyOnScreen = () => firstKeyOf('[data-testid="review-confirm"]');
    const key0 = await keyOnScreen();
    const positionText = await evaluate(`document.querySelector('[data-testid="review-position"]')?.textContent?.trim() ?? null`);
    // Toggle by keyboard: close, reopen.
    const togglePresses = await tabTo('[data-testid="open-review-queue"]');
    assert(togglePresses !== null, "the queue toggle is reachable by Tab");
    await press("Enter");
    const closedByKey = await evaluate(`document.querySelector('[data-testid="open-review-queue"]').getAttribute('aria-expanded')`);
    await press("Enter");
    await until(`document.querySelector('[data-testid="open-review-queue"]').getAttribute('aria-expanded') === 'true'`);
    await quiet();
    const focusStayedOnToggle = (await activeNow()).key === "open-review-queue";
    // Postpone by mouse: decides nothing, calls no mutation.
    const markLater = wireCalls.length;
    await click(testid("review-later"));
    await quiet();
    const key1 = await keyOnScreen();
    const laterCalls = wireSince(markLater);
    const q1 = await reviewQueue("A");
    // Confirm by keyboard.
    const confirmKey = key1;
    const pressesConfirm = await tabTo('[data-testid="review-confirm"]');
    assert(pressesConfirm !== null, "Confirmer is reachable by Tab");
    await press("Enter");
    const a1 = await pollUntil(() => relOverview("A"), (o) => o.approvedCount === a0.approvedCount + 1);
    await quiet();
    const q2 = await reviewQueue("A");
    const onScreenTotal = Number(await evaluate(`document.querySelector('[data-testid="open-review-queue"]')?.getAttribute('data-total-pending')`));
    const focusAfterConfirm = await activeNow();
    const approvedKeys = a1.established.filter((e) => e.provenance === "APPROVED").map((e) => e.suggestionKey);
    const statusAfterConfirm = await statusNow();
    await dismissStatus();
    // Reject by mouse.
    const rejectKey = await keyOnScreen();
    await click(testid("review-reject"));
    const a2 = await pollUntil(() => relOverview("A"), (o) => o.pendingSuggestionCount === a1.pendingSuggestionCount - 1);
    await quiet();
    const q3 = await reviewQueue("A");
    const focusAfterReject = await activeNow();
    const x1 = await crossOverview(), r1 = await relOverview("R");
    return {
      queueTotalBefore: q0.totalPending, positionText, firstKeyOnScreen: key0,
      toggle: { tabPresses: togglePresses, ariaExpandedAfterEnter: closedByKey, reopenedByEnter: true, focusStayedOnToggle },
      postpone: { keyBefore: key0, keyAfter: key1, advanced: key1 !== key0 || q0.totalPending === 1, mutatingCalls: laterCalls.filter((n) => MUTATING.test(n)), totalUnchanged: q1.totalPending === q0.totalPending },
      confirm: { suggestionKey: confirmKey, tabPresses: pressesConfirm, approvedPlusOne: a1.approvedCount === a0.approvedCount + 1, pendingMinusOne: a1.pendingSuggestionCount === a0.pendingSuggestionCount - 1, nowAnApprovedRelation: approvedKeys.includes(confirmKey), queueTotalBackend: q2.totalPending, queueTotalOnScreen: onScreenTotal, onScreenEqualsBackend: onScreenTotal === q2.totalPending, status: statusAfterConfirm, focusAfter: { key: focusAfterConfirm.key ?? null, isBody: focusAfterConfirm.isBody, panel: focusAfterConfirm.panel ?? null } },
      reject: { suggestionKey: rejectKey, approvedUnchanged: a2.approvedCount === a1.approvedCount, pendingMinusOne: a2.pendingSuggestionCount === a1.pendingSuggestionCount - 1, createdNoRelation: !a2.established.some((e) => e.suggestionKey === rejectKey), leftTheQueue: !q3.items.some((i) => i.suggestionKey === rejectKey), focusAfter: { key: focusAfterReject.key ?? null, isBody: focusAfterReject.isBody, panel: focusAfterReject.panel ?? null } },
      otherBrainsUntouched: JSON.stringify(crossCounts(x0)) === JSON.stringify(crossCounts(x1)) && sameCounts(r0, r1),
    };
  });

  /* REAL_ROOT brain — approve by mouse, revoke by keyboard; no other brain moves -------------- */
  await interaction("relations.atelierRealRoot", async () => {
    await interactionState(["R"], "R", "note2", true);
    const a0 = await relOverview("A"), x0 = await crossOverview(), r0 = await relOverview("R");
    const approveSel = '.relations [data-testid="approve-core-suggestion"]';
    const sk = await firstKeyOf(approveSel);
    assert(sk, "the REAL_ROOT node carries a pending suggestion");
    await click(`${approveSel}[data-suggestion-key="${sk}"]`);
    const r1 = await pollUntil(() => relOverview("R"), (o) => o.approvedCount === r0.approvedCount + 1);
    await quiet();
    const a1 = await relOverview("A"), x1 = await crossOverview();
    const presses = await tabTo(`[data-relation-revoke="${sk}"]`);
    assert(presses !== null, "the revoke control is reachable by Tab");
    await press("Enter");
    const r2 = await pollUntil(() => relOverview("R"), (o) => o.approvedCount === r0.approvedCount);
    await quiet();
    const focusAfterRevoke = await activeNow();
    return {
      suggestionKey: sk, atelier: { before: counts(r0), afterApprove: counts(r1), afterRevoke: counts(r2) },
      approveMovedExactlyOne: r1.approvedCount === r0.approvedCount + 1 && r1.pendingSuggestionCount === r0.pendingSuggestionCount - 1,
      revokeRestoredCounts: sameCounts(r0, r2), revokeTabPresses: presses,
      noOtherBrainMoved: sameCounts(a0, a1) && JSON.stringify(crossCounts(x0)) === JSON.stringify(crossCounts(x1)),
      focusAfterRevoke: { key: focusAfterRevoke.key ?? null, isBody: focusAfterRevoke.isBody, restoredToTheSuggestion: focusAfterRevoke.key?.includes(sk) ?? false },
    };
  });

  /* Inter-brain panel — approve by mouse, revoke by keyboard, navigate by mouse and keyboard ---- */
  await interaction("cross.approveRevokeNavigate", async () => {
    await interactionState(["A", "B", "C"], "A", "alphaCrossPending", true);
    const a0 = await relOverview("A"), x0 = await crossOverview(), r0 = await relOverview("R");
    const sk = await evaluate(`document.querySelector('[data-cross-approve]')?.getAttribute('data-cross-approve') ?? null`);
    assert(sk, "the selected node carries a pending inter-brain suggestion");
    const suggestion = x0.pendingSuggestions.find((s) => s.suggestionKey === sk);
    await click(`[data-cross-approve="${sk}"]`);
    const x1 = await pollUntil(() => crossOverview(), (o) => o.approvedCount === x0.approvedCount + 1);
    await quiet();
    const edge = x1.established.find((e) => e.suggestionKey === sk);
    const a1 = await relOverview("A"), r1 = await relOverview("R");
    const revokePresent = await evaluate(`!!document.querySelector('[data-cross-revoke="${sk}"]')`);
    const focusAfterApprove = await activeNow();
    const statusAfterApprove = await statusNow();
    await dismissStatus();
    const presses = await tabTo(`[data-cross-revoke="${sk}"]`);
    assert(presses !== null, "the inter-brain revoke is reachable by Tab");
    await press("Enter");
    const x2 = await pollUntil(() => crossOverview(), (o) => o.approvedCount === x0.approvedCount);
    await quiet();
    const focusAfterRevoke = await activeNow();
    // Navigation, mouse then keyboard — from the richest node, which carries an established entry.
    await selectNode(NODES.alphaBest);
    await quiet();
    const linkSel = '.cross-relations .cross-relation__link[data-endpoint-displayed="true"]';
    const target = await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(linkSel)}); return el ? { brainId: el.getAttribute('data-endpoint-brain-id'), nodeId: el.getAttribute('data-endpoint-node-id'), direction: el.getAttribute('data-direction'), key: el.getAttribute('data-endpoint-key') } : null; })()`);
    assert(target, "an inter-brain relation whose other end is displayed");
    await click(linkSel);
    await quiet();
    const afterMouse = { focusedBrain: keyOfBrain(await focusedId()), expectedBrain: keyOfBrain(target.brainId), selected: await selectedName() };
    await composeTo(["A", "B", "C"], "A");
    await selectNode(NODES.alphaBest);
    const navPresses = await tabTo(linkSel);
    assert(navPresses !== null, "the inter-brain link is reachable by Tab");
    await press("Enter");
    await quiet();
    const afterKey = { focusedBrain: keyOfBrain(await focusedId()), expectedBrain: keyOfBrain(target.brainId), selected: await selectedName(), tabPresses: navPresses };
    await composeTo(["A", "B", "C"], "A");
    await selectNode(NODES.alphaBest);
    const a2 = await relOverview("A");
    return {
      suggestionKey: sk,
      cross: { before: crossCounts(x0), afterApprove: crossCounts(x1), afterRevoke: crossCounts(x2) },
      approveMovedExactlyOne: x1.approvedCount === x0.approvedCount + 1 && x1.pendingSuggestionCount === x0.pendingSuggestionCount - 1,
      endpointsPreserved: !!edge && !!suggestion && edge.source.brainId === suggestion.source.brainId && edge.target.brainId === suggestion.target.brainId && edge.source.key === suggestion.source.key && edge.target.key === suggestion.target.key,
      intraBrainStoresUntouched: sameCounts(a0, a1) && sameCounts(r0, r1) && sameCounts(a0, a2),
      revokeControlAppeared: revokePresent, revokeTabPresses: presses,
      revokeRestoredCounts: JSON.stringify(crossCounts(x0)) === JSON.stringify(crossCounts(x2)),
      returnedPending: x2.pendingSuggestions.some((s) => s.suggestionKey === sk),
      statusAfterApprove, focusAfterApprove: { key: focusAfterApprove.key ?? null, isBody: focusAfterApprove.isBody },
      focusAfterRevoke: { key: focusAfterRevoke.key ?? null, isBody: focusAfterRevoke.isBody, restoredToTheSuggestion: focusAfterRevoke.key?.includes(sk) ?? false },
      navigate: { target: { brain: keyOfBrain(target.brainId), direction: target.direction }, mouse: afterMouse, keyboard: afterKey },
    };
  });

  /* Inter-brain panel — the other end is OUT OF VIEW -------------------------------------------- */
  await interaction("cross.otherEndOutOfView", async () => {
    await interactionState(["A"], "A", "alphaBest", true);
    const linkSel = '.cross-relations .cross-relation__link[data-endpoint-displayed="false"]';
    const hints = await evaluate(`[...document.querySelectorAll('.cross-relations .cross-relation__hint')].map((el) => el.textContent.trim().slice(0, 140))`);
    const target = await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(linkSel)}); return el ? { brainId: el.getAttribute('data-endpoint-brain-id'), nodeId: el.getAttribute('data-endpoint-node-id') } : null; })()`);
    assert(target, "an inter-brain relation whose other end is NOT displayed");
    const read = await evaluate(READ_PANELS);
    const before = { chips: (await chipIds()).map(keyOfBrain), focusedBrain: keyOfBrain(await focusedId()) };
    await click(linkSel);
    await quiet();
    const after = { chips: (await chipIds()).map(keyOfBrain), focusedBrain: keyOfBrain(await focusedId()), selected: await selectedName(), status: await statusNow() };
    await dismissStatus();
    return {
      hintsShownInPanel: hints, hintCount: hints.length, targetBrain: keyOfBrain(target.brainId),
      panelControlsWholeBeforeClick: read.panels.cross.controlsWholeAfterScroll, before, after,
      thePanelDidNotSilentlyJump: !(after.focusedBrain !== before.focusedBrain && after.chips.join() === before.chips.join()),
    };
  });

  /* The modal menu and the status layer next to populated panels ------------------------------- */
  await interaction("modal.and.status", async () => {
    await interactionState();
    const rects0 = await panelRects();
    const toggleAria = await triggerExpanded();
    await setMenu(true);
    const rectsOpen = await panelRects();
    const scrimCoversPanel = await evaluate(`(() => { const el = document.querySelector('[data-testid="review-confirm"]') || document.querySelector('.relations'); const r = el.getBoundingClientRect(); const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return { blocked: !(top === el || el.contains(top)), coveredBy: top ? (top.closest('.composition__menu') ? 'menu' : top.className.toString().slice(0, 30)) : null }; })()`);
    await press("Escape");
    await until(`document.querySelector('[data-testid="composition-add-trigger"]').getAttribute('aria-expanded') === 'false'`);
    const focusBack = await activeNow();
    const rects1 = await panelRects();
    const sameRects = JSON.stringify(rects0) === JSON.stringify(rectsOpen) && JSON.stringify(rects0) === JSON.stringify(rects1);
    // The product's own refusal notice with the panels populated (a single brain displayed).
    await composeTo(["A"], "A");
    await selectNode(NODES.alphaBest);
    await setReview(true);
    await click(testid(`composition-remove-${idOf("A")}`));
    await until(`/^Composition refus|^Composition refused/.test(document.querySelector('.app__status')?.textContent ?? '')`, 30000);
    await quiet();
    const status = await statusNow();
    const layer = await evaluate(`(() => { const f = document.querySelector('.app__feedback'); const r = f.getBoundingClientRect(); const a = document.querySelector('.app__aside').getBoundingClientRect(); const m = document.querySelector('.map-view').getBoundingClientRect(); return { top: Math.round(r.top), height: Math.round(r.height), overlapsAsideByPx: Math.max(0, Math.round(a.bottom - r.top)), overlapsMapByPx: Math.max(0, Math.round(m.bottom - r.top)) }; })()`);
    const read = await evaluate(READ_PANELS);
    const walk = await panelsTabWalk();
    await shoot("960x640/notice-and-panels/top", "The refusal notice on screen with populated panels (1 brain displayed).");
    await dismissStatus();
    await composeTo(["A", "B", "C"], "A");
    return {
      menuOpen: { ariaExpandedBefore: toggleAria, panelRectsUnchangedWhileOpenAndAfter: sameRects, scrim: scrimCoversPanel, escapeClosed: true, focusBackOn: focusBack.key ?? null, focusReturnedToTrigger: focusBack.key === "composition-add-trigger" },
      notice: { text: status, layer, controlsCoveredByTheLayerAfterScroll: ["relations", "review", "cross"].flatMap((n) => read.panels[n].present ? read.panels[n].controls.filter((c) => c.coveredBy === "status-layer").map((c) => `${n}:${c.key}`) : []), walkNotWhole: walk.notWhole, walkUnreached: walk.unreached, walkDocumentScrolledSteps: walk.documentScrolledSteps },
    };
  });
}

record.interactions = INT;

/* --- P-19: what a restart brings back ---------------------------------------------------------------- */

if (pass === 1) {
  // Leave a recognisable, non-default workspace for the second process to find (or not).
  await emulate("dark", "reduce");
  await setLocale("en");
  await setDensity("compact");
  await setMotion("reduce");
  await composeTo(["A", "B", "C"], "B");
  await selectNode(NODES.alphaBest).catch(() => {});
  await composeTo(["A", "B", "C"], "B");
  await setReview(true);
  await quiet();
  await pause(1500);
  const endSnapshot = await readSnapshot();
  await writeFile(join(proofRoot, "state-end-pass1.json"), JSON.stringify(endSnapshot, null, 2));
  record.endSnapshotPass1 = endSnapshot;
} else {
  const expected = JSON.parse(await readFile(join(proofRoot, "state-end-pass1.json"), "utf8"));
  const got = restoredSnapshot;
  record.restart = {
    expectedFromProcess1: expected, foundByProcess2AtStartup: got,
    languageRestored: got.lang === expected.lang,
    densityRestored: got.density === expected.density,
    motionRestored: got.motion === expected.motion,
    compositionRestored: JSON.stringify(got.chips) === JSON.stringify(expected.chips),
    focusedBrainRestored: got.focusedBrain === expected.focusedBrain,
    reviewPanelExpandedRestored: got.reviewExpanded === expected.reviewExpanded,
    detailsPanelVisibleRestored: got.detailsPanelVisible === expected.detailsPanelVisible,
    selectionRestored: got.selectedName === expected.selectedName,
    relationStoresRestored: JSON.stringify(got.stores) === JSON.stringify(expected.stores),
    note: "The review queue's open/closed state is a React state that nothing writes: if it is not restored that is the declared non-persistence of the slice, measured, not a defect of this task.",
  };
  const afterMeasure = await readSnapshot();
  record.restart.storesAfterTheTwoMeasuredStates = afterMeasure.stores;
}

/* --- nothing outside the contract happened ------------------------------------------------------------- */

const diskAfterHash = await hashTree(ROOT);
assert.equal(diskAfterHash, diskBefore.hash, "P-22: the analysed directory is byte-identical after the session");
const artefacts = diskBefore.listing.filter((path) => /(^|\/)(\.filetopo|filetopo)|\.sqlite(-wal|-shm)?$/i.test(path));
assert.deepEqual(artefacts, [], "P-22: no FileTopo artefact under the analysed root");
{
  const view = await invoke("map_view", { brainId: idOf("R") });
  assert.equal(view.indexRevision, viewsAtSetup.R.indexRevision, "the measured session did not rebuild the REAL_ROOT Index");
}
check("P-22 in this scope: the REAL_ROOT tree is byte-identical, no artefact under it, no mutating call while measuring", {
  mutatingCallsWhileMeasuring: mutatingInMatrix.length, commandsSeenWhileMeasuring: record.matrixWireCalls, entriesOnDisk: diskBefore.entries,
});
assert.equal(fatal.length, 0, `fatal page/console errors: ${JSON.stringify(fatal.slice(0, 2))}`);

record.captures = captures;
record.fatalConsoleErrors = fatal.length;
await writeFile(join(proofRoot, `run-${phase}-pass${pass}.json`), JSON.stringify(record, null, 2));
console.log(JSON.stringify({
  phase, pass, ok: true, statesJudged: record.verdict?.statesJudged ?? 0,
  everythingHoldsEveryState: record.verdict?.everythingHoldsEveryState ?? null,
  failingByCriterion: record.verdict ? Object.fromEntries(Object.entries(record.verdict).filter(([, v]) => v && typeof v === "object" && Array.isArray(v.failing) && v.failing.length > 0).map(([k, v]) => [k, v.failing])) : null,
  worstMapVisibleHeightPx: record.verdict?.worstMapVisibleHeightPx ?? null,
  interactions: Object.fromEntries(Object.entries(record.interactions).map(([k, v]) => [k, v.ok])),
}));
ws.close();
process.exit(0);
