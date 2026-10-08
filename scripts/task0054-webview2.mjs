// TASK-0054 — real WebView2 proof of the bounded view and the exact aggregate (F-050 / F-051).
//
//   node scripts/task0054-webview2.mjs <port> <variant> <mode> <proofRoot> <head>   (seed JSON on stdin)
//
// <mode> is `normal` or `gpuoff`. The two runs execute the SAME scenario; the second one is
// started with `--disable-gpu` in WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS. Setting the variable is NOT
// the proof: the harness reads the browser's own command line and GPU feature status over CDP
// (`SystemInfo.getInfo`) and the page's WebGL class, and `gpuDisabledApplied` must hold in `gpuoff`
// and must FAIL in `normal` (that failure is falsification 10).
//
// Gestures use real CDP key events; the mouse is used to select a card. Every count is recomputed from the
// synthetic directory on disk by this harness, never taken from FileTopo.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { setTimeout as pause } from "node:timers/promises";

const port = Number(process.argv[2]);
const variant = process.argv[3];
const mode = process.argv[4];
const proofRoot = process.argv[5];
const headTested = process.argv[6];
assert(/^task0054-[a-f0-9]+$/.test(variant));
assert(["normal", "gpuoff"].includes(mode), "mode must be normal or gpuoff");
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
const BRAIN = seed.brain;
const ROOT = seed.root;

const axeSource = await readFile("node_modules/axe-core/axe.min.js", "utf8");
const axeManifest = JSON.parse(await readFile("node_modules/axe-core/package.json", "utf8"));

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
async function connect(url) {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  return socket;
}
const ws = await connect(target.webSocketDebuggerUrl);
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
  await pause(200);
}
const KEYS = {
  Tab: { code: "Tab", vk: 9 },
  Enter: { code: "Enter", vk: 13, text: "\r" },
  ArrowRight: { code: "ArrowRight", vk: 39 },
  ArrowLeft: { code: "ArrowLeft", vk: 37 },
  ArrowDown: { code: "ArrowDown", vk: 40 },
  Home: { code: "Home", vk: 36 },
  "+": { code: "Equal", vk: 187, text: "+" },
  "-": { code: "Minus", vk: 189, text: "-" },
  f: { code: "KeyF", vk: 70, text: "f" },
  r: { code: "KeyR", vk: 82, text: "r" },
};
async function press(key, modifiers = 0) {
  const spec = KEYS[key];
  assert(spec, `unknown key ${key}`);
  await send("Input.dispatchKeyEvent", {
    type: "keyDown", key, code: spec.code, windowsVirtualKeyCode: spec.vk, nativeVirtualKeyCode: spec.vk, modifiers,
    ...(spec.text ? { text: spec.text, unmodifiedText: spec.text } : {}),
  });
  await send("Input.dispatchKeyEvent", {
    type: "keyUp", key, code: spec.code, windowsVirtualKeyCode: spec.vk, nativeVirtualKeyCode: spec.vk, modifiers,
  });
  await pause(200);
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

/* --- GPU evidence: what the browser reports, not what we asked for ------------ */

// The verdict. It must hold in `gpuoff` and must be FALSE in `normal`.
const gpuDisabledApplied = (evidence) =>
  evidence.commandLineHasDisableGpu === true &&
  evidence.gpuCompositing !== "enabled" &&
  evidence.webglClass !== "hardware";
async function readGpuEvidence() {
  const evidence = {
    requestedByEnvironment: mode === "gpuoff",
    systemInfoAvailable: false,
    commandLineHasDisableGpu: null,
    gpuCompositing: null,
    webgl: null,
    webglClass: null,
    gpuDeviceCount: null,
    browserProduct: null,
  };
  try {
    const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
    evidence.browserProduct = version.Browser ?? null;
    const browserSocket = await connect(version.webSocketDebuggerUrl);
    const info = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("SystemInfo.getInfo timed out")), 15000);
      browserSocket.addEventListener("message", ({ data }) => {
        const message = JSON.parse(data);
        if (message.id === 1) {
          clearTimeout(timer);
          if (message.error) reject(new Error(JSON.stringify(message.error)));
          else resolve(message.result);
        }
      });
      browserSocket.send(JSON.stringify({ id: 1, method: "SystemInfo.getInfo" }));
    });
    browserSocket.close();
    evidence.systemInfoAvailable = true;
    evidence.commandLineHasDisableGpu = /(^|\s)--disable-gpu(\s|$|")/.test(info.commandLine ?? "");
    evidence.gpuCompositing = info.gpu?.featureStatus?.gpu_compositing ?? null;
    evidence.webgl = info.gpu?.featureStatus?.webgl ?? null;
    evidence.gpuDeviceCount = (info.gpu?.devices ?? []).length;
  } catch (error) {
    evidence.systemInfoError = String(error.message ?? error).slice(0, 200);
  }
  // The page's own view: a hardware WebGL context, a software one, or none. Class only; no adapter name is kept.
  evidence.webglClass = await evaluate(`(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return 'none';
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const renderer = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
      return /swiftshader|software|basic render|llvmpipe/i.test(renderer) ? 'software' : 'hardware';
    } catch { return 'none'; }
  })()`);
  return evidence;
}

/* --- independent reference: the synthetic directory on disk -------------------- */

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

/* --- what the map shows ------------------------------------------------------------ */

const pathCache = new Map();
async function pathOf(nodeId) {
  if (!pathCache.has(nodeId)) {
    const detail = await invoke("map_node_detail", { reference: { brainId: BRAIN, nodeId } });
    pathCache.set(nodeId, detail.node.relativePath.replaceAll("\\", "/"));
  }
  return pathCache.get(nodeId);
}
const readCanvas = () =>
  evaluate(`(() => {
    const cards = [...document.querySelectorAll('[data-testid="composed-canvas"] [data-card="true"]')];
    return {
      cards: cards.map((g) => ({ nodeId: Number(g.getAttribute('data-node-id')), selected: g.getAttribute('aria-selected') === 'true' })),
      aggregates: [...document.querySelectorAll('[data-testid="map-aggregate-indicator"]')].map((a) => ({
        parentId: Number(a.getAttribute('data-parent-id')), label: a.getAttribute('aria-label'),
      })),
      edges: document.querySelectorAll('[data-testid="composed-canvas"] g[data-edge-kind="hierarchy"]').length,
      svgElements: document.querySelectorAll('[data-testid="composed-canvas"] *').length,
    };
  })()`);
const worldTransform = () => evaluate(`document.querySelector('[data-testid="composed-world"]')?.getAttribute('transform') ?? null`);
// "+690 éléments — Voir la suite" / "+690 items — See more" -> 690
const labelCount = (label) => Number(String(/\+\s*([\d\s  ]+)/.exec(label)?.[1] ?? "").replace(/\D/g, ""));

/* --- scenario ----------------------------------------------------------------------- */

const record = { task: "TASK-0054", mode, headTested, checks: [] };
const check = (label, value = true) => {
  record.checks.push({ label, value });
  return value;
};
const FORBIDDEN_DURING_GESTURES = /^map_(refresh|rebuild|prepare_|reveal_node|copy_node_path|write_run_artifact|brain_exclusions_replace|brain_choose_real_root)/;

await until("!!window.__TAURI_INTERNALS__");
const gpu = await readGpuEvidence();
record.gpu = gpu;
if (mode === "gpuoff") {
  assert.equal(gpu.systemInfoAvailable, true, "cannot observe the browser configuration: the GPU-disabled run proves nothing");
  assert(gpuDisabledApplied(gpu), `--disable-gpu was requested but is NOT observed as applied: ${JSON.stringify(gpu)}`);
} else {
  // Falsification 10: the very same verdict, applied to a run that did not ask for it, must be FALSE.
  assert.equal(gpuDisabledApplied(gpu), false, "the GPU-disabled verdict cannot tell a normal run from a disabled one");
}
check("gpu configuration observed, not assumed", { gpuDisabledApplied: gpuDisabledApplied(gpu) });

const disk = await walkDisk(ROOT);
const diskHashBefore = await hashTree(ROOT);
const diskTotal = disk.length + 1; // the root itself
const largeChildren = disk.filter((p) => /^large\/[^/]+$/.test(p));
assert.equal(largeChildren.length, 700);

await invoke("map_refresh", { brainId: BRAIN });
if (!(await evaluate(`document.querySelectorAll('[data-testid="composed-canvas"] [data-node-id]').length > 0`))) {
  await until(`!!document.querySelector(${JSON.stringify(testid("lifecycle-open"))}) || document.querySelectorAll('[data-testid="composed-canvas"] [data-node-id]').length > 0`);
  if (await evaluate(`!!document.querySelector(${JSON.stringify(testid("lifecycle-open"))})`)) await click(testid("lifecycle-open"));
}
await until(`document.querySelectorAll('[data-testid="composed-canvas"] [data-node-id]').length > 0`);
await quiet();
const mark = wireCalls.length;

// -- 1. the first view is bounded, exact and honest ----------------------------------
const view0 = await invoke("map_view", { brainId: BRAIN });
const payload0 = Buffer.byteLength(JSON.stringify(view0));
assert.equal(view0.nodeCount, diskTotal, "Index cardinality equals the disk");
assert(view0.nodes.length + view0.aggregates.length <= view0.viewBudget);
assert.equal(view0.materializedCount + view0.nonMaterializedCount, view0.nodeCount);
let canvas = await readCanvas();
assert.equal(canvas.cards.length, view0.materializedCount, "every drawn card is a materialised node");
assert.equal(canvas.aggregates.length, view0.aggregates.length);
assert(canvas.cards.length + canvas.aggregates.length <= view0.viewBudget);
const axe0 = await axeRun();
assert.deepEqual(axe0.violations, [], `axe (initial): ${JSON.stringify(axe0.violations)}`);
check("first view bounded, drawn == materialised, Index == disk", {
  indexed: view0.nodeCount, materialized: view0.materializedCount, aggregates: view0.aggregates.length, payloadBytes: payload0,
});

// -- 2. navigation to a row that is NOT in the first view (search -> focus) -----------------
const farPath = "large/f-0699.txt";
const farRef = await invoke("map_resolve_node", { brainId: BRAIN, relativePath: farPath });
assert(farRef, "the far row is indexed");
assert(!view0.nodes.some((node) => node.id === farRef.nodeId), "the far row is not in the first view");
await click("#map-search-input");
await send("Input.insertText", { text: "f-0699" });
await until(`!!document.querySelector('[data-testid="search-hit"]')`);
const hits = await evaluate(`[...document.querySelectorAll('[data-testid="search-hit"]')].map((b) => Number(b.getAttribute('data-node-id')))`);
const searchTotal = await evaluate(`Number(document.querySelector('[data-testid="search-total"]')?.getAttribute('data-total'))`);
assert.equal(searchTotal, 1, "an exact name finds exactly one row");
assert.deepEqual(hits, [farRef.nodeId]);
await click('[data-testid="search-hit"]');
await until(`!!document.querySelector('[data-testid="composed-canvas"] [data-node-id="${farRef.nodeId}"]')`);
await quiet();
canvas = await readCanvas();
assert(canvas.cards.some((card) => card.nodeId === farRef.nodeId), "the far row is now drawn");
assert(canvas.cards.length + canvas.aggregates.length <= view0.viewBudget);
const axeNav = await axeRun();
assert.deepEqual(axeNav.violations, [], `axe (after navigation): ${JSON.stringify(axeNav.violations)}`);
check("search -> navigation reaches a row outside the first view", { actions: "type + click hit" });

// -- 3. the exact aggregate: label, honesty, expansion without loss ------------------------------
await click('[data-testid="search-clear"]');
await click("#map-search-input");
await send("Input.insertText", { text: "large" });
await until(`!!document.querySelector('[data-testid="search-hit"]')`);
const largeRef = await invoke("map_resolve_node", { brainId: BRAIN, relativePath: "large" });
await click(`[data-testid="search-hit"][data-node-id="${largeRef.nodeId}"]`);
await until(`!!document.querySelector('[data-testid="map-aggregate-indicator"][data-parent-id="${largeRef.nodeId}"]')`);
await quiet();
const collected = [];
const pagesSeen = [];
let axeAggregateCount = -1;
for (let page = 0; page < 40; page += 1) {
  canvas = await readCanvas();
  const aggregate = canvas.aggregates.find((a) => a.parentId === largeRef.nodeId);
  const childPaths = [];
  for (const card of canvas.cards) {
    const path = await pathOf(card.nodeId);
    if (/^large\/[^/]+$/.test(path)) childPaths.push(path);
  }
  collected.push(...childPaths);
  pagesSeen.push({ shown: childPaths.length, omitted: aggregate ? labelCount(aggregate.label) : 0, cards: canvas.cards.length, aggregates: canvas.aggregates.length, edges: canvas.edges });
  assert(canvas.cards.length + canvas.aggregates.length <= view0.viewBudget, "a page stays within the budget");
  // The label is the exact count of real children not shown on THIS page, in words a person can read.
  assert.equal(childPaths.length + (aggregate ? labelCount(aggregate.label) : 0), 700, `page ${page}: shown + omitted == real children`);
  if (page === 0) {
    assert(/Voir la suite|See more/.test(aggregate.label));
    const axeAggregate = await axeRun();
    axeAggregateCount = axeAggregate.violations.length;
    assert.deepEqual(axeAggregate.violations, [], `axe (aggregate): ${JSON.stringify(axeAggregate.violations)}`);
  }
  if (!aggregate) break;
  // A real Enter on the aggregate: it is a tree item, not a folder, a path or an openable thing.
  await evaluate(`document.querySelector('[data-testid="map-aggregate-indicator"][data-parent-id="${largeRef.nodeId}"]').focus()`);
  assert.equal(await evaluate(`document.activeElement.getAttribute('role')`), "treeitem");
  const before = canvas.cards.map((card) => card.nodeId).join(",");
  await press("Enter");
  await until(`[...document.querySelectorAll('[data-testid="composed-canvas"] [data-card="true"]')].map((g) => g.getAttribute('data-node-id')).join(',') !== ${JSON.stringify(before)} || !document.querySelector('[data-testid="map-aggregate-indicator"][data-parent-id="${largeRef.nodeId}"]')`);
  await quiet();
}
const unique = new Set(collected);
assert.equal(unique.size, collected.length, "no row appears twice across the pages");
assert.deepEqual([...unique].sort(), largeChildren, "the pages together cover exactly the 700 real children");
check("aggregate expansion pages every real child once, label == exact count", { pages: pagesSeen.length, children: unique.size });

// -- 4. selection, keyboard, pan, zoom, fit ----------------------------------------------------------
await evaluate(`document.querySelector('[role="tree"]').focus()`);
await press("Home");
const active = () => evaluate(`document.querySelector('[role="tree"]').getAttribute('aria-activedescendant')`);
const beforeKey = await active();
await press("ArrowRight");
await until(`document.querySelector('[role="tree"]').getAttribute('aria-activedescendant') !== ${JSON.stringify(beforeKey)}`);
const selectedViaKeyboard = await active();
const w0 = await worldTransform();
for (let i = 0; i < 4; i += 1) await press("+");
const w1 = await worldTransform();
assert.notEqual(w1, w0, "zoom changed the world transform");
await press("ArrowRight", 1); // Alt+ArrowRight pans
const w2 = await worldTransform();
assert.notEqual(w2, w1, "pan changed the world transform");
await press("-");
assert.notEqual(await worldTransform(), w2, "zoom out changed the transform");
await press("f");
await press("r");
// A mouse selection of a drawn card.
canvas = await readCanvas();
const someCard = canvas.cards[Math.min(2, canvas.cards.length - 1)];
await click(`[data-testid="composed-canvas"] [data-card="true"][data-node-id="${someCard.nodeId}"]`);
await until(`document.querySelector('[data-testid="composed-canvas"] [data-card="true"][data-node-id="${someCard.nodeId}"]')?.getAttribute('aria-selected') === 'true'`);
const axeGestures = await axeRun();
assert.deepEqual(axeGestures.violations, [], `axe (after gestures): ${JSON.stringify(axeGestures.violations)}`);
check("selection, keyboard, zoom, pan, fit, mouse selection", { selectedViaKeyboard: !!selectedViaKeyboard });

// -- 5. nothing outside the contract happened ------------------------------------------------------------
const gestureCalls = wireCalls.slice(mark);
assert.deepEqual(gestureCalls.filter((name) => FORBIDDEN_DURING_GESTURES.test(name)), [], "the gestures only read");
assert.deepEqual(gestureCalls.filter((name) => /snapshot|whole|all_nodes|dump/i.test(name)), [], "no whole-graph command on the wire");
const view1 = await invoke("map_view", { brainId: BRAIN });
assert.equal(view1.indexRevision, view0.indexRevision, "the session did not touch the Index");
assert.equal(view1.nodeCount, view0.nodeCount);
assert.equal(await hashTree(ROOT), diskHashBefore, "the analysed directory is byte-identical after the session");
assert.equal(fatal.length, 0, `fatal page/console errors: ${JSON.stringify(fatal.slice(0, 2))}`);
check("source unchanged, no write on the wire, no fatal console error", { commandsSeen: [...new Set(gestureCalls)].sort() });

// -- semantics: identical in both modes (paths only; ids are not compared) ---------------------------------
const semantics = {
  indexed: view0.nodeCount,
  materialized: view0.materializedCount,
  aggregateCounts: view0.aggregates.map((a) => a.omittedDirectChildren).sort((l, r) => l - r),
  searchTotal,
  pageShapes: pagesSeen.map((p) => [p.shown, p.omitted]),
  expandedPaths: [...unique].sort(),
};
record.semanticsDigest = sha(semantics);
record.semantics = { ...semantics, expandedPaths: `${semantics.expandedPaths.length} paths (covered by the digest)` };
record.metrics = {
  indexed: view0.nodeCount,
  viewBudget: view0.viewBudget,
  firstViewPayloadBytes: payload0,
  firstViewCards: view0.materializedCount,
  firstViewAggregates: view0.aggregates.length,
  aggregatePages: pagesSeen.length,
  largestPageSlots: Math.max(...pagesSeen.map((p) => p.cards + p.aggregates)),
  wireCommandCount: gestureCalls.length,
};
record.axe = {
  version: axeManifest.version,
  violationsPerState: { initial: axe0.violations.length, afterNavigation: axeNav.violations.length, aggregate: axeAggregateCount, afterGestures: axeGestures.violations.length },
};
record.fatalConsoleErrors = fatal.length;
record.sourceHashUnchanged = true;
await writeFile(join(proofRoot, `run-${mode}.json`), JSON.stringify(record, null, 2));
console.log(JSON.stringify({ mode, ok: true, digest: record.semanticsDigest }));
ws.close();
process.exit(0);
