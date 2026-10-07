// TASK-0053 — real WebView2 proof of the global workspace and its preferences (DEC-0051 / F-052 / P-19).
// FOUR real processes of the same executable around REAL closes, on the same sandbox variant:
//
//   phase 1  (A) configure three brains + a 3-brain composition + non-default camera/selection/focus +
//                legend + compact + reduced motion + a branch focus with two collapsed folders + FR +
//                distinct per-brain resume and seen states; normal close
//   phase 2  (B) restart; compare every value; exit the branch focus and prove the composition, camera
//                and selection of before the focus; check computed density and motion; then change values
//                (legend closed, EN, comfortable, system, another composition, another branch); normal close
//   phase 3  (C) restart; confirm B's values; with the workspace writes held back, change the source and
//                REBUILD the brain that carries the persisted node references (a rebuild "between a
//                closing and a reopening"); normal close
//   phase 4  (D) restart; the corrections are explicit and visible, no old node id aims at a new object
//
//   node scripts/task0053-webview2.mjs <port> <variant> <phase> <proofRoot> <head>
//
// Gestures that are judged — composition, focus, legend, density, motion, language, branch focus,
// collapse, exit — are real mouse and key events dispatched through the browser input pipeline (CDP
// `Input.dispatchMouseEvent` / `Input.dispatchKeyEvent`). Scaffolding (preparing the synthetic roots,
// the baseline Index, the seen/unseen states, reading the backend as an oracle) goes through the
// product's own commands and is named as such. Every disk reference is recomputed by this harness
// from the synthetic directories — never from FileTopo's own answers.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { setTimeout as pause } from "node:timers/promises";

const port = Number(process.argv[2]);
const variant = process.argv[3];
const phase = Number(process.argv[4]);
const proofRoot = process.argv[5];
const headTested = process.argv[6];
assert(/^task0053-[a-f0-9]+$/.test(variant));
assert([1, 2, 3, 4].includes(phase), "phase must be 1..4");
assert(/^[a-f0-9]{40}$/.test(headTested ?? ""), "HEAD sha (argv[6]) required");
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
const ALIX = seed.alix;
const BEA = seed.bea;
const CHLOE = seed.chloe;
const IDS = [ALIX, BEA, CHLOE];
const NAMES = { [ALIX]: "Arbre Alix", [BEA]: "Arbre Béa", [CHLOE]: "Arbre Chloé" };
const ROOTS = { [ALIX]: seed.rootAlix, [BEA]: seed.rootBea, [CHLOE]: seed.rootChloe };

const axeManifest = JSON.parse(await readFile("node_modules/axe-core/package.json", "utf8"));
const axeSource = await readFile("node_modules/axe-core/axe.min.js", "utf8");
const axeSha256 = createHash("sha256").update(axeSource).digest("hex");

/* --- CDP plumbing ---------------------------------------------------------- */

let target;
for (let attempt = 0; attempt < 300; attempt += 1) {
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
async function until(expression, limit = 60000) {
  const started = Date.now();
  while (Date.now() - started < limit) {
    if (await evaluate(expression)) return;
    await pause(120);
  }
  throw new Error(`timeout: ${expression}`);
}
async function untilTrue(label, predicate, limit = 60000) {
  const started = Date.now();
  while (Date.now() - started < limit) {
    if (await predicate()) return;
    await pause(150);
  }
  throw new Error(`timeout: ${label}`);
}
const invoke = (command, args = {}) =>
  evaluate(`window.__TAURI_INTERNALS__.invoke(${JSON.stringify(command)},${JSON.stringify(args)})`);
await send("Runtime.enable");
await send("Log.enable");
await send("Page.enable");
await send("Network.enable", { maxTotalBufferSize: 64 * 1024 * 1024, maxResourceBufferSize: 16 * 1024 * 1024 });

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
  await pause(180);
}
const keySpec = {
  Tab: { code: "Tab", vk: 9 },
  Enter: { code: "Enter", vk: 13, text: "\r" },
  " ": { code: "Space", vk: 32, text: " " },
};
async function press(key, shift = false) {
  const spec = keySpec[key];
  await send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key,
    code: spec.code,
    windowsVirtualKeyCode: spec.vk,
    nativeVirtualKeyCode: spec.vk,
    modifiers: shift ? 8 : 0,
    ...(spec.text ? { text: spec.text, unmodifiedText: spec.text } : {}),
  });
  await send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key,
    code: spec.code,
    windowsVirtualKeyCode: spec.vk,
    nativeVirtualKeyCode: spec.vk,
    modifiers: shift ? 8 : 0,
  });
  await pause(220);
}
async function quiet(milliseconds = 900, limit = 60000) {
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
      violations: result.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, html: n.html.slice(0, 180) })) })),
      incomplete: result.incomplete.length,
      passes: result.passes.length,
    };
  })()`);
}


/* --- the independent reference: the synthetic directories on disk ------------ */

// Every entry (directory or file) of `root`, as a posix path relative to it.
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
    entries.sort((left, right) => left.name.localeCompare(right.name));
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
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const lastOf = (items) => items[items.length - 1];
const descendantsOnDisk = (disk, folder) => disk.filter((path) => path.startsWith(`${folder}/`));

/* --- fingerprints of everything a preference gesture must leave alone ---------- */

// Index (revision, whole projection), journal, relations, exclusions, seen state — as the product reports
// them, read-only — and the source trees. Computed twice around a gesture: the two must be identical.
async function everythingElse({ withSources = true } = {}) {
  const indexes = {};
  const journals = {};
  const exclusions = {};
  const seen = {};
  for (const brainId of IDS) {
    const snapshot = await invoke("map_view", { brainId });
    indexes[brainId] = { revision: snapshot.indexRevision, nodeCount: snapshot.nodeCount, digest: sha(snapshot) };
    const journal = await invoke("map_change_journal", { brainId, natures: [], after: null, limit: 50 });
    journals[brainId] = { digest: sha(journal), total: journal.total, unseenTotal: journal.unseenTotal };
    exclusions[brainId] = sha(await invoke("map_brain_exclusions", { brainId }));
    seen[brainId] = journal.unseenTotal;
  }
  const cross = await invoke("map_cross_relations_open");
  const relations = sha({
    established: cross.established.map((edge) => `${edge.provenance}|${edge.source.key}>${edge.target.key}`).sort(),
    pending: cross.pendingSuggestions.map((suggestion) => suggestion.suggestionKey).sort(),
  });
  const sources = {};
  if (withSources) for (const brainId of IDS) sources[brainId] = await hashTree(ROOTS[brainId]);
  return { indexes, journals, exclusions, relations, sources, unseen: seen };
}
// The per-node seen/unseen state of a brain's journal pages, exactly as shown.
async function seenSnapshot(brainId) {
  const page = await invoke("map_change_journal", { brainId, natures: [], after: null, limit: 50 });
  return {
    total: page.total,
    unseenTotal: page.unseenTotal,
    items: page.items.map((item) => ({ nature: item.nature, path: item.relativePath ?? item.path ?? null, seen: item.seen ?? item.isSeen ?? null })),
    digest: sha(page),
  };
}

/* --- what the page shows -------------------------------------------------------- */

const readScreen = () =>
  evaluate(`(() => {
    const world = document.querySelector('[data-testid="composed-world"]')?.getAttribute('transform') ?? '';
    const m = /translate\\((\\S+) (\\S+)\\) scale\\((\\S+)\\)/.exec(world);
    const selected = document.querySelector('[role="treeitem"][aria-selected="true"]');
    const panel = document.querySelector('[data-testid="branch-focus-panel"]');
    const pressed = (id) => document.querySelector('[data-testid="' + id + '"]')?.getAttribute('aria-pressed') === 'true';
    let locale = null;
    try { locale = localStorage.getItem('filetopo.locale'); } catch { locale = 'unavailable'; }
    return {
      chips: [...document.querySelectorAll('[data-testid^="composition-chip-"]')].map((e) => e.getAttribute('data-brain-id')),
      focused: document.querySelector('[data-testid^="composition-chip-"][aria-current="true"]')?.getAttribute('data-brain-id') ?? null,
      selected: selected ? { brainId: selected.getAttribute('data-brain-id'), nodeId: Number(selected.getAttribute('data-node-id')) } : null,
      view: m ? { tx: Number(m[1]) + 0, ty: Number(m[2]) + 0, scale: Number(m[3]) } : null,
      legendOpen: document.querySelector('[data-testid="map-legend-toggle"]')?.getAttribute('aria-expanded') === 'true',
      legendShown: !!document.getElementById('map-runtime-legend'),
      densityAttr: document.documentElement.dataset.density ?? null,
      motionAttr: document.documentElement.dataset.motion ?? null,
      densityPressed: pressed('density-compact') ? 'compact' : pressed('density-comfortable') ? 'comfortable' : null,
      motionPressed: pressed('motion-reduce') ? 'reduce' : pressed('motion-system') ? 'system' : null,
      lang: document.documentElement.lang,
      locale,
      branch: {
        active: panel?.getAttribute('data-branch-active') === 'true',
        rootId: panel?.getAttribute('data-branch-root-id') ? Number(panel.getAttribute('data-branch-root-id')) : null,
        collapsed: [...document.querySelectorAll('[data-testid="branch-collapsed-item"]')].map((li) => Number(li.getAttribute('data-node-id'))).sort((a, b) => a - b),
      },
      corrections: document.querySelector('[data-testid="workspace-corrections"]')?.getAttribute('data-corrections') ?? null,
      correctionsText: document.querySelector('[data-testid="workspace-corrections"]')?.textContent ?? null,
      cards: [...document.querySelectorAll('[data-testid="composed-canvas"] [data-card="true"]')].map((g) => g.getAttribute('data-brain-id') + ':' + g.getAttribute('data-node-id')).sort(),
    };
  })()`);
// Chrome only: what density changes. The map is read separately, in WORLD units.
const readChrome = () =>
  evaluate(`(() => {
    const cs = (selector) => getComputedStyle(document.querySelector(selector));
    return {
      appPadding: cs('.app').padding,
      appGap: cs('.app').rowGap,
      buttonPadding: cs('[data-testid="language-fr"]').padding,
      composedBackground: cs('[data-testid="composed-canvas"]').padding,
    };
  })()`);
// Every rectangle of the map in world units: the card's own group transform + the rect attributes.
const readRectangles = () =>
  evaluate(`[...document.querySelectorAll('[data-testid="composed-world"] [data-card="true"]')].map((g) => {
    const r = g.querySelector('rect');
    // The attributes AND what the engine lays out (a CSS width/height would not touch the attributes).
    const box = r?.getBBox();
    return [g.getAttribute('data-brain-id'), g.getAttribute('data-node-id'), g.getAttribute('data-card-width'), g.getAttribute('data-card-height'),
      g.getAttribute('transform') ?? '', r?.getAttribute('x'), r?.getAttribute('y'), r?.getAttribute('width'), r?.getAttribute('height'),
      box ? [box.x, box.y, box.width, box.height].join(',') : ''].join('|');
  }).sort()`);
async function readProjections() {
  const out = {};
  for (const brainId of IDS) out[brainId] = sha(await invoke("map_view", { brainId }));
  return out;
}
// A probe that WOULD animate: what the page computes for it is what a person would see move.
const readMotion = () =>
  evaluate(`(() => {
    if (!document.getElementById('__probe')) {
      const style = document.createElement('style');
      style.textContent = '@keyframes __probe { from { opacity: .5 } to { opacity: 1 } } .__probe { transition: opacity 1s; animation: __probe 1s; }';
      document.head.appendChild(style);
      const element = document.createElement('div');
      element.id = '__probe';
      element.className = '__probe';
      document.body.appendChild(element);
    }
    const cs = getComputedStyle(document.getElementById('__probe'));
    return { transitionDuration: cs.transitionDuration, animationName: cs.animationName, animationDuration: cs.animationDuration };
  })()`);
const emulateSystemMotion = (value) =>
  send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value }] });
const readPanel = () =>
  evaluate(`(() => {
    const panel = document.querySelector('[data-testid="branch-focus-panel"]');
    const text = (selector) => document.querySelector(selector)?.textContent ?? null;
    return {
      active: panel?.getAttribute('data-branch-active') === 'true',
      rootId: panel?.getAttribute('data-branch-root-id') ?? null,
      path: text('[data-testid="branch-focus-path"]'),
      toggle: text('[data-testid="branch-toggle"]'),
      toggleDisabled: document.querySelector('[data-testid="branch-toggle"]')?.disabled ?? null,
      collapsed: [...document.querySelectorAll('[data-testid="branch-collapsed-item"]')].map((li) => ({ nodeId: Number(li.getAttribute('data-node-id')), hidden: Number(li.getAttribute('data-hidden-descendant-count')) })),
    };
  })()`);
const activeElement = () =>
  evaluate(`(() => { const e = document.activeElement; return { tag: e?.tagName ?? null, testid: e?.getAttribute?.('data-testid') ?? null }; })()`);
async function focusDirectly(selector) {
  await evaluate(`document.querySelector(${JSON.stringify(selector)})?.focus()`);
  assert(await evaluate(`document.activeElement === document.querySelector(${JSON.stringify(selector)})`), `cannot focus ${selector}`);
}
async function tabOnto(selector) {
  const found = await evaluate(`(() => {
    const target = document.querySelector(${JSON.stringify(selector)});
    if (!target) return false;
    const tabbable = [...document.querySelectorAll('a[href], button, input, select, textarea, [tabindex]')]
      .filter((e) => !e.disabled && e.tabIndex >= 0 && e.getClientRects().length > 0);
    const index = tabbable.indexOf(target);
    if (index <= 0) return false;
    tabbable[index - 1].focus();
    return true;
  })()`);
  assert(found, `no tabbable predecessor for ${selector}`);
  await press("Tab");
  assert(await evaluate(`document.activeElement === document.querySelector(${JSON.stringify(selector)})`), `real Tab did not land on ${selector}`);
}

/* --- the workspace as the catalogue keeps it (oracle) ----------------------------- */

// `map_workspace_restore` is the only read the product exposes: it returns the stored workspace as it
// stands against the current catalogue and Indexes, and the corrections it had to make.
const oracle = () => invoke("map_workspace_restore");
const resumeOf = (brainId) => invoke("map_brain_resume_state", { brainId });
async function untilOracle(predicate, label, limit = 30000) {
  let last = null;
  await untilTrue(label, async () => {
    last = await oracle();
    return predicate(last);
  }, limit).catch(() => {
    throw new Error(`timeout: ${label}: ${JSON.stringify(last)}`);
  });
  return last;
}
const workspaceWrites = () => wireCalls.filter((name) => name === "map_workspace_update").length;
const WRITE_COMMANDS = /^map_(brain_(activate|update|exclusions_replace|choose_real_root|resume_update)|refresh|rebuild|prepare_|change_mark|node_mark|relations_(approve|reject|revoke)|cross_relations_(approve|revoke)|content_observe|relation_engine_run|ui_preferences_update|write_run_artifact|reveal_node|copy_node_path)/;
const writesIn = (calls) => calls.filter((name) => WRITE_COMMANDS.test(name));
const commandsSince = (mark) => wireCalls.slice(mark);
async function settledResume(brainId, label) {
  let last = "";
  let since = Date.now();
  const start = Date.now();
  while (Date.now() - start < 30000) {
    const text = JSON.stringify(await resumeOf(brainId));
    if (text !== last) {
      last = text;
      since = Date.now();
    } else if (Date.now() - since >= 900) return JSON.parse(text);
    await pause(150);
  }
  throw new Error(`timeout: the resume record of ${brainId} never settled (${label})`);
}

/* --- real gestures --------------------------------------------------------------- */

async function wheel(fx, fy, deltaY, count, gapMs = 15) {
  const box = await center(testid("composed-canvas"));
  const x = box.x - box.w / 2 + box.w * fx;
  const y = box.y - box.h / 2 + box.h * fy;
  for (let i = 0; i < count; i += 1) {
    await send("Input.dispatchMouseEvent", { type: "mouseWheel", x, y, deltaX: 0, deltaY });
    if (gapMs) await pause(gapMs);
  }
  await pause(200);
}
async function drag(fx, fy, dx, dy) {
  const box = await center(testid("composed-canvas"));
  const x = box.x - box.w / 2 + box.w * fx;
  const y = box.y - box.h / 2 + box.h * fy;
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 });
  for (let step = 1; step <= 12; step += 1) {
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: x + (dx * step) / 12, y: y + (dy * step) / 12, buttons: 1 });
    await pause(20);
  }
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: x + dx, y: y + dy, button: "left", buttons: 0, clickCount: 1 });
  await pause(200);
}
const nodeIdCache = new Map();
async function nodeIdOf(brainId, relativePath) {
  const reference = await invoke("map_resolve_node", { brainId, relativePath });
  assert(reference, `node not found: ${brainId} ${relativePath}`);
  return reference.nodeId;
}
const pathOf = async (brainId, nodeId) =>
  (await invoke("map_node_detail", { reference: { brainId, nodeId } })).node.relativePath.replaceAll("\\", "/");
async function selectNodeByMouse(brainId, relativePath) {
  const nodeId = await nodeIdOf(brainId, relativePath);
  const selector = `[data-testid="composed-canvas"] [data-brain-id="${brainId}"][data-node-id="${nodeId}"]`;
  await until(`!!document.querySelector(${JSON.stringify(selector)})`, 30000);
  // A card outside the visible part of the canvas is brought back by the product's own « Ajuster » (a real click).
  const reachable = async () => {
    const box = await center(selector);
    return !!box && box.w > 0 && box.h > 0 && box.hit;
  };
  if (!(await reachable())) {
    await click(testid("fit-composition"));
    await pause(500);
    await quiet();
  }
  await click(selector);
  await until(`document.querySelector(${JSON.stringify(selector)})?.getAttribute('aria-selected') === 'true'`, 15000);
  await quiet();
  return nodeId;
}
const waitApp = async () => {
  await until("!!window.__TAURI_INTERNALS__");
  await until(`!!document.querySelector(${JSON.stringify(testid("composition-add-trigger"))})`);
};
async function openActiveBrain() {
  const hasNodes = "document.querySelectorAll('[data-testid=composed-canvas] [data-node-id]').length > 0";
  if (!(await evaluate(hasNodes)) && (await evaluate(`!!document.querySelector(${JSON.stringify(testid("lifecycle-open"))})`))) {
    await click(testid("lifecycle-open"));
  }
  await until(hasNodes);
}
async function addBrain(brainId) {
  if (await evaluate(`!!document.querySelector(${JSON.stringify(testid(`composition-chip-${brainId}`))})`)) return;
  await click(testid("composition-add-trigger"));
  await until(`!!document.querySelector(${JSON.stringify(testid(`composition-add-item-${brainId}`))})`);
  await click(testid(`composition-add-item-${brainId}`));
  await until(`!!document.querySelector(${JSON.stringify(testid(`composition-chip-${brainId}`))})`);
  await until(`document.querySelectorAll('[data-testid="composed-canvas"] [data-brain-id="${brainId}"][data-node-id]').length > 0`);
  await pause(500);
}
// The way a person switches to one brain alone: bring it in, then let the other go.
async function switchAlone(toBrain, fromBrain) {
  await addBrain(toBrain);
  await click(testid(`composition-remove-${fromBrain}`));
  await untilTrue(`${toBrain} alone`, async () => {
    const screen = await readScreen();
    return screen.chips.length === 1 && screen.chips[0] === toBrain && screen.cards.length > 0;
  }, 60000);
  await pause(700);
}
async function removeBrain(brainId) {
  await click(testid(`composition-remove-${brainId}`));
  await untilTrue(`${brainId} removed`, async () => !(await readScreen()).chips.includes(brainId), 60000);
  await pause(700);
}

/* --- the scenario ------------------------------------------------------------- */

const record = { task: "TASK-0053", phase, headTested, checks: [] };
const check = (label, value = true) => {
  record.checks.push({ label, value });
  return value;
};
const NO_FILTER = { state: "ALL", kinds: [], availability: "ALL" };
const readCarry = async (number) => JSON.parse(await readFile(join(proofRoot, `carry${number}.json`), "utf8"));
const writeCarry = (number, value) => writeFile(join(proofRoot, `carry${number}.json`), JSON.stringify(value));

// A comparison that says what differed: every value of the screen and of the catalogue, one by one.
function diffValues(label, expected, actual, problems) {
  const eq = (name, a, b) => {
    if (JSON.stringify(a) !== JSON.stringify(b)) problems.push(`${label}.${name}: expected ${JSON.stringify(a)}, got ${JSON.stringify(b)}`);
  };
  for (const key of Object.keys(expected)) eq(key, expected[key], actual[key]);
}
const closeTo = (a, b) => Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b));
const sameView = (a, b) => a !== null && b !== null && closeTo(a.scale, b.scale) && closeTo(a.tx, b.tx) && closeTo(a.ty, b.ty);

// What a person sees of the workspace, as values.
async function workspaceScreen() {
  const screen = await readScreen();
  return {
    chips: screen.chips,
    focused: screen.focused,
    selected: screen.selected,
    view: screen.view,
    legendOpen: screen.legendOpen,
    densityAttr: screen.densityAttr,
    motionAttr: screen.motionAttr,
    densityPressed: screen.densityPressed,
    motionPressed: screen.motionPressed,
    lang: screen.lang,
    locale: screen.locale,
    branch: screen.branch,
  };
}
async function assertScreenEquals(expected, label) {
  let problems = ["never sampled"];
  await untilTrue(label, async () => {
    const actual = await workspaceScreen();
    problems = [];
    for (const key of Object.keys(expected)) {
      if (key === "view") {
        if (!sameView(expected.view, actual.view)) problems.push(`view: expected ${JSON.stringify(expected.view)}, got ${JSON.stringify(actual.view)}`);
      } else if (JSON.stringify(expected[key]) !== JSON.stringify(actual[key])) {
        problems.push(`${key}: expected ${JSON.stringify(expected[key])}, got ${JSON.stringify(actual[key])}`);
      }
    }
    return problems.length === 0;
  }, 30000, 300).catch(() => {
    throw new Error(`${label}: ${problems.join("; ")}`);
  });
}

/* ===== phase 1 — A: configure ========================================================= */

async function phaseOne() {
  await waitApp();

  // -- scaffolding: the Indexes, and distinct seen / unseen states, through the product's own commands.
  for (const brainId of IDS) await invoke("map_refresh", { brainId });
  const baseline = {};
  for (const brainId of IDS) {
    const opened = await invoke("map_open", { brainId });
    baseline[brainId] = { revision: opened.revision, nodeCount: opened.nodeCount };
  }
  const additions = { [ALIX]: ["nouveau-alix-1.txt", "nouveau-alix-2.txt"], [BEA]: ["nouveau-bea-1.txt", "nouveau-bea-2.txt", "nouveau-bea-3.txt"], [CHLOE]: ["nouveau-chloe-1.txt", "nouveau-chloe-2.txt"] };
  for (const [brainId, names] of Object.entries(additions)) {
    for (const name of names) await writeFile(join(ROOTS[brainId], name), `synthetic ${name}\n`, "utf8");
    await invoke("map_refresh", { brainId });
  }
  await invoke("map_change_mark_all_seen", { brainId: ALIX });
  await invoke("map_node_mark_seen", { reference: { brainId: CHLOE, nodeId: await nodeIdOf(CHLOE, "nouveau-chloe-1.txt") } });
  const seenA = { [ALIX]: await seenSnapshot(ALIX), [BEA]: await seenSnapshot(BEA), [CHLOE]: await seenSnapshot(CHLOE) };
  assert.equal(seenA[ALIX].unseenTotal, 0, "Alix: everything seen");
  assert(seenA[BEA].unseenTotal > 0 && seenA[CHLOE].unseenTotal > 0, "Béa and Chloé keep unseen changes");
  assert.notEqual(seenA[BEA].unseenTotal, seenA[CHLOE].unseenTotal, "distinct seen states on the three brains");
  assert.equal(new Set(IDS.map((id) => seenA[id].digest)).size, 3, "three different journals");
  record.seenBefore = Object.fromEntries(IDS.map((id) => [id, { total: seenA[id].total, unseenTotal: seenA[id].unseenTotal }]));
  await openActiveBrain();

  // -- per-brain resume: three DIFFERENT states, each given while that brain is alone, with real gestures.
  assert.deepEqual((await readScreen()).chips, [ALIX], "the application starts on the active brain alone");
  assert.equal((await oracle()).corrections.length, 0, "a fresh installation: nothing to correct");
  // Alix: a selection, the FILE filter, the panel hidden, a zoom.
  await click(testid("filter-kind-FILE"));
  await until(`document.querySelector('[data-testid="filter-count"]')?.getAttribute('data-total') != null`);
  // A file: under the FILE filter a folder would not be a match, and the per-brain restore (TASK-0044) would drop it.
  await selectNodeByMouse(ALIX, "lisez-moi.txt");
  await click(testid("details-panel-toggle"));
  await untilTrue("Alix panel hidden", async () => (await resumeOf(ALIX)).detailsPanelVisible === false);
  await wheel(0.3, 0.4, -120, 8);
  await settledResume(ALIX, "Alix");
  // Béa: the DIRECTORY filter, the panel left visible, a pan.
  await switchAlone(BEA, ALIX);
  await click(testid("filter-kind-DIRECTORY"));
  await until(`document.querySelector('[data-testid="filter-count"]')?.getAttribute('data-total') != null`);
  await selectNodeByMouse(BEA, "factures");
  await drag(0.55, 0.6, -90, -40);
  await settledResume(BEA, "Béa");
  // Chloé: no filter, the panel hidden, a zoom out.
  await switchAlone(CHLOE, BEA);
  await selectNodeByMouse(CHLOE, "archives");
  await click(testid("details-panel-toggle"));
  await untilTrue("Chloé panel hidden", async () => (await resumeOf(CHLOE)).detailsPanelVisible === false);
  await wheel(0.7, 0.3, 90, 5, 30);
  await settledResume(CHLOE, "Chloé");
  const resumeA = { [ALIX]: await resumeOf(ALIX), [BEA]: await resumeOf(BEA), [CHLOE]: await resumeOf(CHLOE) };
  assert.deepEqual(resumeA[ALIX].filter, { state: "ALL", kinds: ["FILE"], availability: "ALL" });
  assert.deepEqual(resumeA[BEA].filter, { state: "ALL", kinds: ["DIRECTORY"], availability: "ALL" });
  assert.deepEqual(resumeA[CHLOE].filter, NO_FILTER);
  assert.deepEqual([resumeA[ALIX].detailsPanelVisible, resumeA[BEA].detailsPanelVisible, resumeA[CHLOE].detailsPanelVisible], [false, true, false]);
  for (const brainId of IDS) assert(resumeA[brainId].view !== null && resumeA[brainId].selectedNodeId !== null, `${brainId}: camera and selection stored`);
  assert.equal(new Set(IDS.map((id) => JSON.stringify(resumeA[id].view))).size, 3, "three different cameras");
  assert.equal(new Set(IDS.map((id) => JSON.stringify(resumeA[id]))).size, 3, "three different resume states");
  record.resumeBefore = resumeA;

  // -- the composition of three brains, the focus on a non-default brain.
  await addBrain(ALIX);
  await addBrain(BEA);
  assert.deepEqual((await readScreen()).chips, [ALIX, BEA, CHLOE], "the composition shows the three brains in catalogue order");
  await click(testid(`composition-chip-${BEA}`));
  await click(testid(`composition-chip-${CHLOE}`));
  await untilTrue("Chloé focused", async () => (await readScreen()).focused === CHLOE);

  // -- preference-only gestures: nothing but the workspace may move (P19-13), and compact leaves the map alone (P19-6).
  const fingerprintsBefore = await everythingElse();
  const rectsBefore = await readRectangles();
  const projectionsBefore = await readProjections();
  const chromeBefore = await readChrome();
  assert.equal((await readScreen()).densityAttr, "comfortable");
  const preferenceMark = wireCalls.length;
  const writesMark = workspaceWrites();
  await click(testid("map-legend-toggle"));
  await click(testid("density-compact"));
  await click(testid("motion-reduce"));
  await click(testid("language-fr"));
  await untilOracle((state) => state.workspace.legendOpen && state.workspace.density === "compact" && state.workspace.motion === "reduce", "preferences stored");
  const chromeAfter = await readChrome();
  const rectsAfter = await readRectangles();
  assert.notDeepEqual(chromeAfter, chromeBefore, "compact changes the application's own chrome");
  assert.notEqual(chromeAfter.appPadding, chromeBefore.appPadding);
  assert.deepEqual(rectsAfter, rectsBefore, "compact left every rectangle of the map exactly where it was (world units)");
  assert.deepEqual(await readProjections(), projectionsBefore, "compact left every bounded projection identical");
  assert.deepEqual(await everythingElse(), fingerprintsBefore, "source, Index, journal, relations, exclusions and seen state moved around preference gestures");
  assert.deepEqual(writesIn(commandsSince(preferenceMark)), [], `preference gestures sent a write other than the workspace: ${writesIn(commandsSince(preferenceMark))}`);
  assert(workspaceWrites() - writesMark >= 3 && workspaceWrites() - writesMark <= 8, `preference writes: ${workspaceWrites() - writesMark}`);
  assert.equal(await evaluate("localStorage.getItem('filetopo.locale')"), "fr", "the language is the existing `filetopo.locale` key");
  record.preferenceGestures = {
    chromeBefore,
    chromeAfter,
    rectangles: rectsAfter.length,
    rectanglesIdentical: true,
    projectionsIdentical: true,
    everythingElseIdentical: true,
    writeCommandsOtherThanWorkspace: 0,
    workspaceWrites: workspaceWrites() - writesMark,
  };

  // -- a burst of real wheel notches on the composition: a bounded number of writes (falsification 9).
  const burstMark = workspaceWrites();
  const burstStart = Date.now();
  await wheel(0.4, 0.5, -90, 60, 15);
  await drag(0.5, 0.5, -60, 30);
  const burstMs = Date.now() - burstStart;
  await untilTrue("camera stored", async () => {
    const state = (await oracle()).workspace;
    return state.view !== null && sameView(state.view, (await readScreen()).view);
  });
  const burstWrites = workspaceWrites() - burstMark;
  assert(burstWrites >= 1 && burstWrites <= 5, `a 60-notch wheel burst and a drag wrote the workspace ${burstWrites} times`);
  record.writeBudget = { wheelNotches: 60, drags: 1, milliseconds: burstMs, workspaceWritesOnTheWire: burstWrites };

  // -- the composition's selection, in a non-default brain; the composition camera.
  await selectNodeByMouse(CHLOE, "archives");
  const compositionSelection = (await readScreen()).selected;
  assert.deepEqual(compositionSelection, { brainId: CHLOE, nodeId: await nodeIdOf(CHLOE, "archives") });
  await untilOracle((state) => JSON.stringify(state.workspace.selected) === JSON.stringify(compositionSelection), "composition selection stored");
  const compositionCamera = (await readScreen()).view;
  await untilOracle((state) => state.workspace.view !== null && sameView(state.workspace.view, compositionCamera), "composition camera stored");
  const compositionBefore = await workspaceScreen();
  assert.deepEqual(compositionBefore.chips, [ALIX, BEA, CHLOE]);
  assert.equal(compositionBefore.focused, CHLOE);

  // -- the branch focus with two collapsed folders, with real Tab / Enter / Space.
  const projetId = await selectNodeByMouse(CHLOE, "projet");
  // What leaving the focus must put back: the composition's camera and selection AT THE MOMENT of entering.
  await quiet();
  const preFocus = await workspaceScreen();
  assert.deepEqual(preFocus.selected, { brainId: CHLOE, nodeId: projetId });
  assert.deepEqual(preFocus.chips, [ALIX, BEA, CHLOE]);
  const projetPathDisk = await walkDisk(ROOTS[CHLOE]);
  await tabOnto(testid("branch-focus"));
  await press("Enter");
  await untilTrue("branch focus active", async () => (await readPanel()).active);
  await quiet();
  const docsId = await selectNodeByMouse(CHLOE, "projet/docs");
  await focusDirectly(testid("branch-toggle"));
  await press("Enter");
  await untilTrue("docs collapsed", async () => (await readPanel()).collapsed.some((item) => item.nodeId === docsId));
  await quiet();
  const srcId = await selectNodeByMouse(CHLOE, "projet/src");
  await focusDirectly(testid("branch-toggle"));
  await press(" ");
  await untilTrue("src collapsed", async () => (await readPanel()).collapsed.length === 2);
  await quiet();
  const panelA = await readPanel();
  assert.deepEqual(panelA.collapsed.map((item) => [item.nodeId, item.hidden]).sort((a, b) => a[0] - b[0]),
    [[docsId, descendantsOnDisk(projetPathDisk, "projet/docs").length], [srcId, descendantsOnDisk(projetPathDisk, "projet/src").length]].sort((a, b) => a[0] - b[0]),
    "the collapsed counts are the disk reference");
  // a camera inside the branch, then a selection inside it.
  await wheel(0.5, 0.5, -90, 6, 30);
  const notesId = await selectNodeByMouse(CHLOE, "projet/notes.txt");
  const branchCamera = (await readScreen()).view;
  const expectedCollapsed = [docsId, srcId].sort((a, b) => a - b);
  await untilOracle((state) => {
    const branch = state.workspace.branchFocus;
    return branch !== null && branch.rootNodeId === projetId && JSON.stringify([...branch.collapsedIds].sort((a, b) => a - b)) === JSON.stringify(expectedCollapsed) &&
      state.workspace.selected?.nodeId === notesId && state.workspace.view !== null && sameView(state.workspace.view, branchCamera);
  }, "branch focus stored");
  const stored = (await oracle()).workspace;
  assert.deepEqual(stored.branchFocus.savedSelected, { brainId: CHLOE, nodeId: projetId }, "what leaving the focus puts back is stored");
  assert(stored.branchFocus.savedView !== null && sameView(stored.branchFocus.savedView, preFocus.view), "the composition's camera is stored for the exit");
  const axeA = await axeRun();
  assert.equal(axeA.violations.length, 0, `axe (A: legend open, compact, branch focused): ${JSON.stringify(axeA.violations)}`);

  // -- the final state of A, as a person sees it and as the catalogue holds it.
  const liveA = await workspaceScreen();
  assert.equal(liveA.legendOpen, true);
  assert.equal(liveA.densityAttr, "compact");
  assert.equal(liveA.motionAttr, "reduce");
  assert.equal(liveA.lang, "fr");
  assert.equal(liveA.branch.active, true);
  assert.deepEqual(liveA.selected, { brainId: CHLOE, nodeId: notesId });
  const workspaceA = await oracle();
  assert.deepEqual(workspaceA.corrections, [], "no correction during the session itself");
  const resumeAfterA = { [ALIX]: await resumeOf(ALIX), [BEA]: await resumeOf(BEA), [CHLOE]: await resumeOf(CHLOE) };
  assert.deepEqual(resumeAfterA[ALIX], resumeA[ALIX], "composing and focusing did not move Alix's own state");
  assert.deepEqual(resumeAfterA[BEA], resumeA[BEA], "…nor Béa's");
  // The stored workspace holds the preferences; the per-brain filters/panels did not leak into it.
  const text = JSON.stringify(workspaceA.workspace);
  assert(!/filter|detailsPanel|cursor|ftf1|path/i.test(text), `the workspace holds nothing of the per-brain resume state: ${text}`);
  assert(!/locale|"fr"|"en"/.test(text), "the language is not in the workspace");
  record.final = { screen: liveA, workspace: workspaceA.workspace, composition: compositionBefore };
  record.fingerprints = await everythingElse();
  await quiet();
  return {
    liveA,
    workspaceA: workspaceA.workspace,
    compositionBefore,
    compositionCamera: preFocus.view,
    compositionSelection: preFocus.selected,
    resumeAfterA,
    seenA,
    fingerprints: record.fingerprints,
    ids: { projetId, docsId, srcId, notesId },
  };
}

/* ===== phase 2 — B: restart, compare, exit the branch, change ========================= */

async function phaseTwo() {
  const carry = await readCarry(1);
  await waitApp();
  await untilTrue("workspace restored", async () => (await readScreen()).branch.active, 60000);
  await quiet();
  await pause(800);
  const wireMark = wireCalls.length;

  // -- every value, exactly.
  await assertScreenEquals(carry.liveA, "the workspace of A, value by value");
  const screenB = await readScreen();
  assert.equal(screenB.corrections, null, "no correction was needed after a clean close");
  assert.deepEqual(screenB.chips, [ALIX, BEA, CHLOE]);
  assert.equal(screenB.focused, CHLOE);
  assert.equal(screenB.legendShown, true, "the legend is open");
  const chrome = await readChrome();
  assert.equal(chrome.appPadding, carry.chromeCompact ?? chrome.appPadding);
  assert.notEqual(chrome.appPadding, "14px 18px 18px", "the density is compact (computed)");
  assert.equal(chrome.appPadding, "8px 12px 10px");
  const motion = await readMotion();
  assert.equal(motion.transitionDuration, "0s", `motion=reduce: a probe transition computes to ${motion.transitionDuration}`);
  assert.equal(motion.animationName, "none", `motion=reduce: a probe animation computes to ${motion.animationName}`);
  const workspaceB = await oracle();
  assert.deepEqual(workspaceB.corrections, []);
  assert.deepEqual(workspaceB.workspace, carry.workspaceA, "the catalogue holds exactly what A left");
  assert.equal(await evaluate("localStorage.getItem('filetopo.locale')"), "fr", "the explicit language persisted");
  // per-brain resume and seen state, value by value, from the catalogue and the journals.
  for (const brainId of IDS) {
    const resume = await resumeOf(brainId);
    const problems = [];
    diffValues(NAMES[brainId], { ...carry.resumeAfterA[brainId], view: null }, { ...resume, view: null }, problems);
    if (!(carry.resumeAfterA[brainId].view === null ? resume.view === null : sameView(carry.resumeAfterA[brainId].view, resume.view))) {
      problems.push(`${NAMES[brainId]}.view: expected ${JSON.stringify(carry.resumeAfterA[brainId].view)}, got ${JSON.stringify(resume.view)}`);
    }
    assert.deepEqual(problems, [], `per-brain resume after the restart: ${problems.join("; ")}`);
    const seen = await seenSnapshot(brainId);
    assert.deepEqual(seen, carry.seenA[brainId], `${NAMES[brainId]}: the seen / unseen state after the restart`);
  }
  assert.equal(new Set(IDS.map((id) => JSON.stringify(carry.resumeAfterA[id]))).size, 3);
  const fingerprintsB = await everythingElse();
  assert.deepEqual(fingerprintsB, carry.fingerprints, "source, Index, journal, relations, exclusions and seen state are what A left");
  assert.deepEqual(writesIn(commandsSince(wireMark)), [], "reading the restored workspace sent a write command");
  assert.equal(workspaceWrites(), 0, "restoring wrote nothing to the workspace");
  const axeB = await axeRun();
  assert.equal(axeB.violations.length, 0, `axe (B, restored): ${JSON.stringify(axeB.violations)}`);
  record.restored = { screen: await workspaceScreen(), chrome, motion, correctionsShown: null, workspaceWritesDuringRestore: 0 };

  // -- OS reduced motion and the preference: system never contradicts the OS (falsification 6).
  const motionTable = { reduce: motion };
  await click(testid("motion-system"));
  await untilOracle((state) => state.workspace.motion === "system", "motion=system stored");
  motionTable.systemNoOsPreference = await readMotion();
  assert.equal(motionTable.systemNoOsPreference.transitionDuration, "1s", "motion=system without an OS request keeps the product's own (probe) motion");
  await emulateSystemMotion("reduce");
  motionTable.systemOsReduced = await readMotion();
  assert.equal(motionTable.systemOsReduced.transitionDuration, "0s", "motion=system with the OS asking for reduced motion: no motion");
  assert.equal(motionTable.systemOsReduced.animationName, "none");
  await emulateSystemMotion("no-preference");
  assert.equal((await readMotion()).transitionDuration, "1s");
  await click(testid("motion-reduce"));
  await untilOracle((state) => state.workspace.motion === "reduce", "motion=reduce stored");
  motionTable.reduceNoOsPreference = await readMotion();
  assert.equal(motionTable.reduceNoOsPreference.transitionDuration, "0s");
  await emulateSystemMotion("reduce");
  assert.equal((await readMotion()).transitionDuration, "0s", "reduce never forces motion back");
  await emulateSystemMotion("no-preference");
  record.motion = motionTable;

  // -- « Quitter le focus »: the composition, the camera and the selection of before the focus (real Enter).
  await focusDirectly(testid("branch-exit"));
  await press("Enter");
  await untilTrue("branch focus left", async () => !(await readPanel()).active);
  await quiet();
  await pause(800);
  const afterExit = await workspaceScreen();
  assert.deepEqual(afterExit.chips, carry.compositionBefore.chips, "the same three brains are back");
  assert.equal(afterExit.focused, carry.compositionBefore.focused);
  assert.deepEqual(afterExit.selected, carry.compositionSelection, "the selection that existed before the focus");
  assert(sameView(afterExit.view, carry.compositionCamera), `the camera that existed before the focus: expected ${JSON.stringify(carry.compositionCamera)}, got ${JSON.stringify(afterExit.view)}`);
  assert.equal(afterExit.branch.active, false);
  assert.equal(afterExit.legendOpen, true);
  const exitedOracle = await untilOracle((state) => state.workspace.branchFocus === null && sameView(state.workspace.view ?? { scale: 0, tx: 0, ty: 0 }, carry.compositionCamera), "exit stored");
  assert.deepEqual(exitedOracle.workspace.selected, carry.compositionSelection);
  record.exit = { chips: afterExit.chips, focused: afterExit.focused, selected: afterExit.selected, view: afterExit.view, expectedView: carry.compositionCamera, expectedSelection: carry.compositionSelection };

  // -- change the values: legend closed, English, comfortable, another composition, another branch.
  await click(testid("map-legend-toggle"));
  await click(testid("language-en"));
  await click(testid("density-comfortable"));
  await click(testid("motion-system"));
  await until("document.documentElement.lang === 'en'");
  await untilOracle((state) => !state.workspace.legendOpen && state.workspace.density === "comfortable" && state.workspace.motion === "system", "new preferences stored");
  assert.equal(await evaluate("localStorage.getItem('filetopo.locale')"), "en");
  await removeBrain(BEA);
  await wheel(0.45, 0.55, -90, 10, 20);
  await selectNodeByMouse(CHLOE, "projet");
  const rootId = carry.ids.projetId;
  await tabOnto(testid("branch-focus"));
  await press("Enter");
  await untilTrue("second branch focus active", async () => (await readPanel()).active);
  await quiet();
  const guideId = await selectNodeByMouse(CHLOE, "projet/docs/guide");
  await focusDirectly(testid("branch-toggle"));
  await press("Enter");
  await untilTrue("guide collapsed", async () => (await readPanel()).collapsed.some((item) => item.nodeId === guideId));
  await quiet();
  await wheel(0.5, 0.5, 90, 4, 30);
  const indexTxtId = await selectNodeByMouse(CHLOE, "projet/src/main.txt");
  const branchCameraB = (await readScreen()).view;
  await untilOracle((state) => {
    const branch = state.workspace.branchFocus;
    return branch !== null && branch.rootNodeId === rootId && JSON.stringify(branch.collapsedIds) === JSON.stringify([guideId]) &&
      state.workspace.selected?.nodeId === indexTxtId && state.workspace.view !== null && sameView(state.workspace.view, branchCameraB);
  }, "second branch focus stored");
  const axeBEnglish = await axeRun();
  assert.equal(axeBEnglish.violations.length, 0, `axe (B, English, legend closed): ${JSON.stringify(axeBEnglish.violations)}`);
  const liveB = await workspaceScreen();
  assert.deepEqual(liveB.chips, [ALIX, CHLOE]);
  assert.equal(liveB.legendOpen, false);
  assert.equal(liveB.lang, "en");
  assert.equal(liveB.densityAttr, "comfortable");
  assert.equal(liveB.motionAttr, "system");
  assert.equal(liveB.branch.active, true);
  const workspaceBFinal = await oracle();
  assert.deepEqual(workspaceBFinal.corrections, []);
  const resumeBFinal = { [ALIX]: await resumeOf(ALIX), [BEA]: await resumeOf(BEA), [CHLOE]: await resumeOf(CHLOE) };
  record.changed = { screen: liveB, workspace: workspaceBFinal.workspace };
  return {
    liveB,
    workspaceB: workspaceBFinal.workspace,
    ids: { ...carry.ids, guideId, indexTxtId },
    resumeBFinal,
    seen: Object.fromEntries(await Promise.all(IDS.map(async (id) => [id, await seenSnapshot(id)]))),
  };
}

/* ===== phase 3 — C: confirm, then rebuild the brain that carries the node references ====== */

async function phaseThree() {
  const carry = await readCarry(2);
  await waitApp();
  await untilTrue("workspace restored", async () => (await readScreen()).branch.active, 60000);
  await quiet();
  await pause(800);
  await assertScreenEquals(carry.liveB, "the workspace of B, value by value (English, legend closed, comfortable, system)");
  const screenC = await readScreen();
  assert.equal(screenC.corrections, null);
  assert.equal(screenC.legendShown, false, "the legend stays closed");
  assert.equal(screenC.lang, "en");
  assert.equal(screenC.locale, "en");
  assert.equal(screenC.densityAttr, "comfortable");
  assert.equal(screenC.motionAttr, "system");
  const chrome = await readChrome();
  assert.equal(chrome.appPadding, "14px 18px 18px", "the density is comfortable (computed)");
  const workspaceC = await oracle();
  assert.deepEqual(workspaceC.corrections, []);
  assert.deepEqual(workspaceC.workspace, carry.workspaceB, "the catalogue holds exactly what B left");
  const branch = workspaceC.workspace.branchFocus;
  const staleSelection = workspaceC.workspace.selected;
  assert(branch && staleSelection, "node references are persisted");
  for (const brainId of IDS) {
    const resume = await resumeOf(brainId);
    assert.deepEqual({ ...resume, view: null }, { ...carry.resumeBFinal[brainId], view: null }, `${NAMES[brainId]}: per-brain resume`);
    assert.deepEqual(await seenSnapshot(brainId), carry.seen[brainId], `${NAMES[brainId]}: seen state`);
  }
  const axeC = await axeRun();
  assert.equal(axeC.violations.length, 0, `axe (C, English): ${JSON.stringify(axeC.violations)}`);

  // The references, and what they name today.
  const stale = {
    selection: staleSelection,
    selectionPath: await pathOf(staleSelection.brainId, staleSelection.nodeId),
    branchRoot: branch.rootNodeId,
    branchRootPath: await pathOf(branch.brainId, branch.rootNodeId),
    collapsed: branch.collapsedIds,
    collapsedPaths: await Promise.all(branch.collapsedIds.map((id) => pathOf(branch.brainId, id))),
    revisionBefore: (await invoke("map_view", { brainId: CHLOE })).indexRevision,
  };

  // A rebuild "between a closing and a reopening": the page's own writes are held back (it would
  // otherwise re-bind its references to the new revision), the source changes, the brain is rebuilt
  // by the product's own command, and the application is closed normally.
  await evaluate(`(() => {
    const original = window.__TAURI_INTERNALS__.invoke.bind(window.__TAURI_INTERNALS__);
    window.__heldBack = [];
    window.__TAURI_INTERNALS__.invoke = (command, args, options) => {
      if (command === 'map_workspace_update' || command === 'map_brain_resume_update') {
        window.__heldBack.push(command);
        return Promise.reject('held back by the proof harness');
      }
      return original(command, args, options);
    };
  })()`);
  const diskBefore = await walkDisk(ROOTS[CHLOE]);
  // New entries that sort BEFORE everything else shift the numbers the Index gives to what follows.
  for (const name of ["a-0", "a-1", "a-2", "a-3"]) await writeFile(join(ROOTS[CHLOE], `${name}.txt`), "synthetic\n", "utf8");
  await mkdir(join(ROOTS[CHLOE], "a-dossier"), { recursive: true });
  await writeFile(join(ROOTS[CHLOE], "a-dossier", "x.txt"), "synthetic\n", "utf8");
  const rebuilt = await invoke("map_rebuild", { brainId: CHLOE });
  assert(rebuilt.revision > stale.revisionBefore, "the rebuild advanced the Index revision");
  const after = {
    selectionPathNow: await pathOf(staleSelection.brainId, staleSelection.nodeId),
    branchRootPathNow: await pathOf(branch.brainId, branch.rootNodeId),
    revisionAfter: rebuilt.revision,
  };
  const trapIds = [];
  if (after.selectionPathNow !== stale.selectionPath) trapIds.push(["selection", staleSelection.nodeId, stale.selectionPath, after.selectionPathNow]);
  if (after.branchRootPathNow !== stale.branchRootPath) trapIds.push(["branchRoot", branch.rootNodeId, stale.branchRootPath, after.branchRootPathNow]);
  // Reconstruire keeps node ids identity-stable when the paths survive, so the numeric trap is NOT reproduced by
  // it (it is proven in Rust with a recreated Index file). What the rebuild DOES change is the Index generation,
  // and that alone must make the persisted references untrusted. Said as it is, never as a trap that was hit.
  record.idsStableAcrossRebuild = trapIds.length === 0;
  const heldBack = await evaluate("window.__heldBack.length");
  record.rebuild = {
    sourceEntriesBefore: diskBefore.length,
    sourceEntriesAfter: (await walkDisk(ROOTS[CHLOE])).length,
    revisionBefore: stale.revisionBefore,
    revisionAfter: after.revisionAfter,
    storedReferences: { selection: { nodeId: staleSelection.nodeId }, branchRoot: branch.rootNodeId, collapsed: branch.collapsedIds },
    idsThatNowNameAnotherObject: trapIds.map(([what, id]) => ({ what, id, namedBefore: "x", namesNow: "y" })).map((entry) => ({ what: entry.what, id: entry.id })),
    pageWritesHeldBackDuringTheRebuild: heldBack,
    storedWorkspaceReadAfterTheRebuild: false,
  };
  return { stale, trapIds: trapIds.map(([what, id]) => [what, id]), liveB: carry.liveB, workspaceB: carry.workspaceB, ids: carry.ids };
}
/* ===== phase 4 — D: the corrections are explicit, no stale id aims at a new object ======= */

async function phaseFour() {
  const carry = await readCarry(3);
  await waitApp();
  await untilTrue("corrections shown", async () => (await readScreen()).corrections !== null, 60000);
  await quiet();
  await pause(800);
  const screen = await readScreen();
  const words = screen.corrections.split(",");
  assert(words.includes("BRANCH_GENERATION_CHANGED"), `the branch focus is abandoned with a named reason: ${screen.corrections}`);
  assert(words.includes("SELECTION_GENERATION_CHANGED"), `the selection carried by the old generation is dropped with a named reason: ${screen.corrections}`);
  assert(screen.correctionsText.includes("The Index changed"), `the correction is said in the current language: ${screen.correctionsText}`);
  assert.equal(screen.branch.active, false, "the branch focus was not restored over a rebuilt Index");
  assert.equal(screen.lang, "en");
  assert.equal(screen.legendOpen, false, "preferences survive a correction");
  assert.equal(screen.densityAttr, "comfortable");
  assert.equal(screen.motionAttr, "system");
  assert.deepEqual(screen.chips, carry.liveB.chips, "the composition survives a correction");
  assert.equal(screen.focused, CHLOE);
  // No old node id may name a new object: the selection is not the stale pair, and what it names is the root.
  const stale = carry.stale;
  const selectedNow = screen.selected;
  assert(selectedNow, "something is selected");
  assert(!(selectedNow.brainId === stale.selection.brainId && selectedNow.nodeId === stale.selection.nodeId && stale.selection.nodeId !== 1),
    `the stale selection ${JSON.stringify(stale.selection)} must not aim at its new object`);
  const selectedPath = await pathOf(selectedNow.brainId, selectedNow.nodeId);
  // What is selected now comes from the per-brain resume state (its own owner, still valid), never from the stale workspace pair.
  assert.notEqual(selectedPath, stale.selectionPath, `the selection must not be the object the stale workspace reference named (${stale.selectionPath})`);
  const trap = carry.trapIds.map(([what, id]) => `${what}#${id}`);
  const stored = await oracle();
  assert.deepEqual(stored.corrections, [], "the correction was stored once: the next start is quiet");
  assert.equal(stored.workspace.branchFocus, null);
  assert.equal(stored.workspace.legendOpen, false);
  assert.equal(stored.workspace.density, "comfortable");
  const axeD = await axeRun();
  assert.equal(axeD.violations.length, 0, `axe (D, with the corrections summary): ${JSON.stringify(axeD.violations)}`);
  await click(testid("workspace-corrections-dismiss"));
  assert.equal((await readScreen()).corrections, null, "the summary can be dismissed");
  record.corrections = {
    shown: words,
    text: screen.correctionsText,
    branchActive: screen.branch.active,
    selectedAfter: { ...selectedNow, path: selectedPath },
    staleReferences: carry.stale.selection,
    idsThatWouldHaveNamedAnotherObject: trap,
    storedOnce: true,
  };
}

/* ===== run ============================================================================ */

try {
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
  let carry = null;
  if (phase === 1) carry = await phaseOne();
  else if (phase === 2) carry = await phaseTwo();
  else if (phase === 3) carry = await phaseThree();
  else await phaseFour();
  if (phase === 1) {
    carry.chromeCompact = (await readChrome()).appPadding;
  }
  if (carry) await writeCarry(phase, carry);
  record.fatalConsoleErrors = fatal.length;
  assert.equal(fatal.length, 0, `fatal console errors: ${JSON.stringify(fatal.slice(0, 2))}`);
  record.axe = { version: axeManifest.version, sha256: axeSha256 };
  await writeFile(join(proofRoot, `phase${phase}.json`), JSON.stringify(record, null, 2));
  console.log(`TASK-0053 phase ${phase} PASS`);
  ws.close();
} catch (error) {
  console.error(error?.stack ?? String(error));
  ws.close();
  process.exit(1);
}
