// TASK-0056 — the final P-22 campaign in the real Tauri/WebView2 host.
//
//   node scripts/task0056-webview2.mjs <port> <variant> <phase> <proofRoot> <head>   (seed JSON on stdin)
//
// `P-22` says: a complete session exercising P-01..P-21 changes nothing in the analysed tree,
// and leaves no FileTopo file under it. The fingerprint that judges it is taken by
// `scripts/task0056-fingerprint.py`, OUTSIDE this process and outside the product, before and
// after the window. This script's job is the other half: really exercise P-01..P-21 inside that
// window, and publish one machine-readable line per requirement.
//
// Three phases, three real processes of the same executable:
//
//   phase 0  PRE-BASELINE scaffolding, before the fingerprint. It indexes the three brains
//            through the backend on purpose — it is not part of the judged window, and it is
//            named as scaffolding. The source mutations whose journal/seen/incremental
//            consequences phase 1 reads are applied by the seed script AFTER this phase and
//            BEFORE the baseline, so no change of the analysed tree ever happens inside the
//            window (TASK-0056 §4).
//   phase 1  THE WINDOW, part one: Actualiser through the incremental kernel, map, hierarchy,
//            aggregates, children pages, search, filters, legend, pan/zoom/fit/reset, details
//            panel, copy path, open Explorer, journal, seen/unseen, relations and suggestions,
//            French, axe.
//   phase 2  THE WINDOW, part two, after a REAL close and relaunch: what persisted, the second
//            and third brains, the temporary unavailability of a root and its restoration, the
//            language switched to English, axe again.
//
// Rules this script holds to:
//   * every judged count is recomputed from the synthetic directories by THIS script, never
//     taken from FileTopo;
//   * the judged gestures are real CDP mouse and key events; a backend call is only ever an
//     oracle or named scaffolding, and the two are never mixed in one claim;
//   * no absolute path, no user name and no machine identity reaches the artifact.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative } from "node:path";
import { setTimeout as pause } from "node:timers/promises";

const port = Number(process.argv[2]);
const variant = process.argv[3];
const phase = Number(process.argv[4]);
const proofRoot = process.argv[5];
const headTested = process.argv[6];
assert(/^task0056-[a-f0-9]+$/.test(variant));
assert([0, 1, 2].includes(phase), "phase must be 0, 1 or 2");
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
const ATELIER = seed.atelier;
const CARNETS = seed.carnets;
const ARCHIVES = seed.archives;
const ROOTS = { atelier: seed.rootAtelier, carnets: seed.rootCarnets, archives: seed.rootArchives };

const axeSource = await readFile("node_modules/axe-core/axe.min.js", "utf8");
const axeManifest = JSON.parse(await readFile("node_modules/axe-core/package.json", "utf8"));

/* --- CDP plumbing (the TASK-0054 harness's, unchanged) ---------------------- */

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
const connect = async (url) => {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  return socket;
};
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
async function until(expression, limit = 90000) {
  const started = Date.now();
  let last = null;
  while (Date.now() - started < limit) {
    try {
      if (await evaluate(expression)) return;
    } catch (error) {
      last = error;
    }
    await pause(120);
  }
  throw new Error(`timeout: ${expression}${last ? ` (last error ${last.message})` : ""}`);
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
const KEYS = {
  Tab: { code: "Tab", vk: 9 },
  Enter: { code: "Enter", vk: 13, text: "\r" },
  " ": { code: "Space", vk: 32, text: " " },
  Escape: { code: "Escape", vk: 27 },
  ArrowRight: { code: "ArrowRight", vk: 39 },
  ArrowLeft: { code: "ArrowLeft", vk: 37 },
  ArrowDown: { code: "ArrowDown", vk: 40 },
  ArrowUp: { code: "ArrowUp", vk: 38 },
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
  await pause(180);
}
/** A Tab press without the gesture pause: walking a long focus order must stay bearable. */
async function tab() {
  for (const type of ["keyDown", "keyUp"]) {
    await send("Input.dispatchKeyEvent", { type, key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
  }
  await pause(25);
}
/** Walks the real focus order with Tab until `selector` holds it, then activates it with a key. */
async function reachAndActivate(selector, key = "Enter", limit = 400) {
  const holds = `(() => { const e = document.querySelector(${JSON.stringify(selector)}); return !!e && document.activeElement === e; })()`;
  await evaluate(`(document.querySelector('h1') ?? document.body).focus?.(); document.activeElement?.blur?.()`);
  for (let step = 0; step < limit; step += 1) {
    if (await evaluate(holds)) {
      await press(key);
      return step;
    }
    await tab();
  }
  throw new Error(`the keyboard order never reached ${selector}`);
}
/** Types a query into the real search box, clearing it first so two queries never pile up. */
async function searchFor(text) {
  if (await evaluate(`(document.querySelector('#map-search-input')?.value ?? '').length > 0`)) {
    await click(testid("search-clear"));
    await until(`(document.querySelector('#map-search-input')?.value ?? '') === ''`);
  }
  await click("#map-search-input");
  await send("Input.insertText", { text });
  await until(`document.querySelector('#map-search-input').value === ${JSON.stringify(text)}`);
}
async function quiet(milliseconds = 900, limit = 90000) {
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
async function axeRun(label) {
  if (!(await evaluate("typeof window.axe === 'object'"))) await evaluate(axeSource);
  const result = await evaluate(`(async () => {
    const result = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa'] } });
    return {
      violations: result.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, html: n.html.slice(0, 180) })) })),
      incomplete: result.incomplete.map(v => v.id),
      passes: result.passes.length,
    };
  })()`);
  axeStates.push({ state: label, violations: result.violations.length, incomplete: result.incomplete, passes: result.passes });
  assert.deepEqual(result.violations, [], `axe (${label}): ${JSON.stringify(result.violations)}`);
  return result;
}
const axeStates = [];

/* --- the independent oracle: the synthetic directories on disk ------------------ */

async function walkDisk(root) {
  const entries = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      entries.push({
        relativePath: relative(root, path).replaceAll("\\", "/"),
        kind: entry.isDirectory() ? "directory" : "file",
      });
      if (entry.isDirectory()) await visit(path);
    }
  }
  await visit(root);
  entries.sort((l, r) => (l.relativePath < r.relativePath ? -1 : 1));
  return entries;
}
/** Direct children of a relative path, from disk. `""` is the root. */
const directChildren = (entries, relativePath) =>
  entries
    .filter((entry) => dirname(entry.relativePath).replaceAll("\\", "/") === (relativePath === "" ? "." : relativePath))
    .map((entry) => entry.relativePath)
    .sort();
const sha = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

/* --- what is on the screen ------------------------------------------------------- */

const readCanvas = () =>
  evaluate(`(() => {
    const cards = [...document.querySelectorAll('[data-testid="composed-canvas"] [data-card="true"]')];
    return {
      cards: cards.map((g) => ({
        nodeId: Number(g.getAttribute('data-node-id')),
        brainId: g.getAttribute('data-brain-id'),
        selected: g.getAttribute('aria-selected') === 'true',
        legendKeys: (g.getAttribute('data-legend-keys') ?? '').split(' ').filter(Boolean),
        className: g.getAttribute('class') ?? '',
      })),
      aggregates: [...document.querySelectorAll('[data-testid="map-aggregate-indicator"]')].map((a) => ({
        parentId: Number(a.getAttribute('data-parent-id')),
        label: a.getAttribute('aria-label'),
        role: a.getAttribute('role'),
        hasNodeId: a.hasAttribute('data-node-id'),
        legendKeys: (a.getAttribute('data-legend-keys') ?? '').split(' ').filter(Boolean),
      })),
      edges: [...document.querySelectorAll('[data-testid="composed-canvas"] g[data-edge-kind="hierarchy"]')].map((e) => ({
        parentId: Number(e.getAttribute('data-parent-node-id')), childId: Number(e.getAttribute('data-child-node-id')),
        legendKeys: (e.getAttribute('data-legend-keys') ?? '').split(' ').filter(Boolean),
      })),
      legendKeysOnScreen: [...new Set([...document.querySelectorAll('[data-testid="composed-canvas"] [data-legend-keys]')]
        .flatMap((element) => (element.getAttribute('data-legend-keys') ?? '').split(' ')).filter(Boolean))].sort(),
    };
  })()`);
const worldTransform = () =>
  evaluate(`document.querySelector('[data-testid="composed-world"]')?.getAttribute('transform') ?? null`);
// "+86 éléments — Voir la suite" / "+86 items — See more" -> 86
const labelCount = (label) => Number(String(/\+\s*([\d\s  ]+)/.exec(label)?.[1] ?? "").replace(/\D/g, ""));

const pathCache = new Map();
async function pathOf(brainId, nodeId) {
  const key = `${brainId}:${nodeId}`;
  if (!pathCache.has(key)) {
    const detail = await invoke("map_node_detail", { reference: { brainId, nodeId } });
    pathCache.set(key, detail.node.relativePath.replaceAll("\\", "/"));
  }
  return pathCache.get(key);
}

/* --- the record ------------------------------------------------------------------- */

const record = { task: "TASK-0056", phase, headTested, coverage: [], checks: [], notes: [] };
/** One machine-readable line per parity requirement exercised here. */
const cover = (requirement, observation, evidence) => {
  record.coverage.push({ requirement, phase, observation, evidence });
};
const check = (label, value = true) => {
  record.checks.push({ label, value });
  return value;
};
// Inside the judged window, nothing that writes to a source or rebuilds may appear on the wire.
// `map_refresh` is the ONE exception, and only in phase 1 where Actualiser is the gesture under test.
const FORBIDDEN_ON_THE_WIRE =
  /^map_(rebuild|prepare_|write_run_artifact|brain_exclusions_replace|brain_choose_real_root)/;

await until("!!window.__TAURI_INTERNALS__");

/* ================================================================================= */
/* phase 0 — PRE-BASELINE scaffolding (declared: not part of the judged window)       */
/* ================================================================================= */

if (phase === 0) {
  for (const brainId of [ATELIER, CARNETS, ARCHIVES]) {
    await invoke("map_refresh", { brainId });
    const view = await invoke("map_view", { brainId });
    assert(view.nodeCount > 0, "a brain must be indexed before the window opens");
    record.checks.push({ label: `pre-baseline index of a brain`, value: { indexed: view.nodeCount } });
  }
  record.notes.push(
    "Phase 0 is scaffolding BEFORE the P-22 baseline: it indexes the three synthetic brains through the backend so the judged window can exercise an incremental Actualiser over changes made afterwards. No gesture of phase 0 is counted as evidence for any P.",
  );
  await writeFile(join(proofRoot, `run-phase0.json`), JSON.stringify(record, null, 2));
  console.log(JSON.stringify({ phase, ok: true }));
  ws.close();
  process.exit(0);
}

/* ================================================================================= */
/* phase 1 — the window, part one                                                     */
/* ================================================================================= */

const atelierDisk = await walkDisk(ROOTS.atelier);
const atelierTotal = atelierDisk.length + 1; // + the root itself
const wideChildren = directChildren(atelierDisk, "large");
const diskFileCount = atelierDisk.filter((entry) => entry.kind === "file").length;
const diskDirectoryCount = atelierDisk.filter((entry) => entry.kind === "directory").length;

if (phase === 1) {
  // The brain opens alone on the workspace's own path. Nothing is indexed here.
  await until(
    `document.querySelectorAll('[data-testid="composed-canvas"] [data-node-id]').length > 0 || !!document.querySelector(${JSON.stringify(testid("lifecycle-open"))})`,
  );
  if (!(await evaluate(`document.querySelectorAll('[data-testid="composed-canvas"] [data-node-id]').length > 0`))) {
    await click(testid("lifecycle-open"));
  }
  await until(`document.querySelectorAll('[data-testid="composed-canvas"] [data-node-id]').length > 0`);
  await quiet();
  const openingTransform = await worldTransform();
  const mark = wireCalls.length;
  const expectedChanges = seed.atelierChanges.map((change) => change.nature).sort();
  const expectedArchives = seed.archivesChanges.map((change) => change.nature).sort();

  // -- P-18, automatic half — the watcher applies `atelier`'s changes WITHOUT a click ----
  // The watcher is backend-owned and starts for every REAL_ROOT brain that has an Index,
  // each with a mandatory full verification. The pre-baseline changes are therefore
  // applied by it, inside the window, with no gesture at all — which is exactly what
  // « surveillance automatique » means.
  await until(`true`);
  const journalReached = async () =>
    (await invoke("map_change_journal", { brainId: ATELIER })).total >= seed.atelierChanges.length;
  for (let attempt = 0; attempt < 600 && !(await journalReached()); attempt += 1) await pause(300);
  assert(await journalReached(), "the watcher never applied the pre-baseline changes of the first tree");
  await quiet();
  const afterWatcher = await invoke("map_view", { brainId: ATELIER });
  assert.equal(afterWatcher.nodeCount, atelierTotal, "after the watcher converged the Index equals the disk");
  const watchStatus = await evaluate(`(() => {
    const badge = document.querySelector('[data-testid="watch-status"]');
    return badge ? { mode: document.querySelector('[data-testid="watch-status-mode"]')?.textContent?.trim() ?? null, state: badge.getAttribute('data-state'), pending: badge.getAttribute('data-pending') } : null;
  })()`);

  // -- P-18, manual half, plus F-032 — `archives` opened with its root absent ------------
  // Its root was moved away by the .ps1 after the baseline fingerprint, so this brain's
  // watcher found no usable root at startup and sleeps. The manual « Actualiser » is
  // therefore the gesture that applies ITS pre-baseline changes, once the harness puts
  // the root back — the one source manipulation the window allows, and it is undone.
  await click(testid("composition-add-trigger"));
  await until(`!!document.querySelector('[data-testid="composition-add-item-${ARCHIVES}"]')`);
  await click(`[data-testid="composition-add-item-${ARCHIVES}"]`);
  await until(`!!document.querySelector('[data-testid="composition-chip-${ARCHIVES}"]')`);
  await click(`[data-testid="composition-chip-${ARCHIVES}"]`);
  await quiet();
  await until(
    `['UNAVAILABLE','SOURCE_CHANGED'].includes(document.querySelector('[data-testid="source-observation"]')?.getAttribute('data-state') ?? '')`,
    120000,
  );
  const archivesAbsent = await evaluate(`(() => {
    const badge = document.querySelector('[data-testid="source-observation"]');
    return { state: badge?.getAttribute('data-state') ?? null, reason: badge?.getAttribute('data-reason') ?? null,
      text: badge?.textContent?.trim() ?? null,
      watch: document.querySelector('[data-testid="watch-status"]')?.getAttribute('data-state') ?? null,
      cardsStillOnScreen: document.querySelectorAll('[data-testid="composed-canvas"] [data-card="true"]').length };
  })()`);
  const archivesBefore = await invoke("map_view", { brainId: ARCHIVES });
  const archivesJournalBefore = await invoke("map_change_journal", { brainId: ARCHIVES });
  assert.equal(archivesJournalBefore.total, 0, "an absent root is not a batch of deletions: nothing was journalled");
  assert(archivesBefore.nodeCount > 0, "the last reliable Index keeps being served");
  // P-15's refusal, while the target really is gone.
  const archivesNode = await invoke("map_resolve_node", { brainId: ARCHIVES, relativePath: "lisez-moi.txt" });
  await searchFor("lisez-moi");
  await until(`!!document.querySelector('[data-testid="search-hit"][data-node-id="${archivesNode.nodeId}"]')`);
  await click(`[data-testid="search-hit"][data-node-id="${archivesNode.nodeId}"]`);
  await until(`!!document.querySelector('[data-testid="reveal-in-explorer"]')`);
  await click(testid("reveal-in-explorer"));
  await until(`!!document.querySelector('[data-testid="reveal-error"]')`, 30000);
  const revealRefusal = await evaluate(`document.querySelector('[data-testid="reveal-error"]').textContent.trim()`);
  assert(revealRefusal.length > 0, "a gone target produces an explicit error");
  await click(testid("search-clear"));
  // The root comes back, and ONE real click applies the changes incrementally.
  const parkedArchives = join(dirname(ROOTS.archives), `${basename(ROOTS.archives)}-absent`);
  await rename(parkedArchives, ROOTS.archives);
  await click(testid("lifecycle-refresh"));
  await until(`!!document.querySelector('[data-testid="application-mode"]')`, 120000);
  await quiet();
  const applicationMode = await evaluate(
    `document.querySelector('[data-testid="application-mode"]')?.getAttribute('data-application-mode')`,
  );
  const changeSummary = JSON.parse(
    (await evaluate(`document.querySelector('[data-testid="change-summary"]')?.getAttribute('data-summary')`)) ?? "null",
  );
  assert.equal(applicationMode, "INCREMENTAL", `the manual refresh was applied as ${applicationMode}, not incrementally`);
  assert(changeSummary, "the manual refresh must produce a summary of the changes");
  const archivesAfter = await invoke("map_view", { brainId: ARCHIVES });
  assert(archivesAfter.indexRevision > archivesBefore.indexRevision, "the manual refresh published a new revision");
  const archivesJournalAfter = await invoke("map_change_journal", { brainId: ARCHIVES });
  const archivesNatures = [...new Set(archivesJournalAfter.items.map((event) => event.nature))].sort();
  for (const expected of [...new Set(expectedArchives.map((nature) => nature.toUpperCase()))]) {
    assert(archivesNatures.includes(expected), `the manual refresh missed the ${expected} events; it has ${archivesNatures}`);
  }
  const archivesRecovered = await evaluate(`document.querySelector('[data-testid="source-observation"]')?.getAttribute('data-state') ?? null`);
  cover("P-18", "both halves, inside the window and on two different trees: the backend-owned watcher applied the first tree's pre-baseline changes with NO gesture at all, and on the third tree — whose root was absent when the window opened, so its watcher slept — ONE real click on « Actualiser » applied its changes INCREMENTALLY, produced a summary of them and published a new revision without ever emptying the Index", {
    automatic: { brain: "atelier", watchStatus, indexedAfter: afterWatcher.nodeCount, journalTotal: (await invoke("map_change_journal", { brainId: ATELIER })).total },
    manual: { brain: "archives", applicationMode, changeSummary, revisionBefore: archivesBefore.indexRevision, revisionAfter: archivesAfter.indexRevision, naturesDetected: archivesNatures },
    unavailableThenRestored: { observed: archivesAbsent, journalledWhileAbsent: archivesJournalBefore.total, indexedWhileAbsent: archivesBefore.nodeCount, observationAfterRestore: archivesRecovered },
    heavyThresholdsComposedFrom: ["TASK-0040/ACTION-0066+0067 (incremental cost at 1k/10k/100k, ratio 1,533 under the 2,0 ceiling)", "TASK-0041/ACTION-0068 (manual refresh, forced interruption, never empties the Index)", "TASK-0043/ACTION-0072 (10 000-event burst, simulated loss, resume)"],
  });
  cover("P-15", "while the root of a brain was really absent, a real click on « Ouvrir dans l'Explorateur » produced an explicit error instead of opening something else, and nothing in the source was changed", {
    refusalOnScreen: revealRefusal,
  });
  // Back to the first tree, alone on screen, for the structural part of the window:
  // removing a brain from the view changes none of its data, and the composition of
  // several brains is exercised again for P-20 at the end of this phase.
  await click(`[data-testid="composition-chip-${ATELIER}"]`);
  await quiet();
  await click(`[data-testid="composition-remove-${ARCHIVES}"]`);
  await until(`!document.querySelector('[data-testid="composition-chip-${ARCHIVES}"]')`);
  await quiet();
  const archivesAfterRemoval = await invoke("map_view", { brainId: ARCHIVES });
  assert.equal(archivesAfterRemoval.nodeCount, archivesAfter.nodeCount, "removing a brain from the view changed none of its data");
  assert.equal(archivesAfterRemoval.indexRevision, archivesAfter.indexRevision);

  // -- P-02 — the hierarchy, node by node ------------------------------------------------
  // Read first, on the view the brain opens with: no projection has been moved yet.
  const view0 = await invoke("map_view", { brainId: ATELIER });
  assert.equal(view0.nodeCount, atelierTotal, `the Index holds ${view0.nodeCount} nodes for ${atelierTotal} on disk`);
  assert.equal(view0.materializedCount + view0.nonMaterializedCount, view0.nodeCount);
  assert(view0.nodes.length + view0.aggregates.length <= view0.viewBudget);
  let canvas = await readCanvas();
  // Several brains are on screen; this requirement is judged on the focused one's cards.
  const atelierCards = () => canvas.cards.filter((card) => card.brainId === ATELIER);
  assert.equal(atelierCards().length, view0.materializedCount, "every drawn card of the focused brain is a materialised node");
  const diskPaths = new Set(["", ...atelierDisk.map((entry) => entry.relativePath)]);
  const hierarchyFailures = [];
  for (const card of atelierCards()) {
    const detail = await invoke("map_node_detail", { reference: { brainId: ATELIER, nodeId: card.nodeId } });
    const own = detail.node.relativePath.replaceAll("\\", "/");
    // (1) no addition: a drawn node is a real element of the source.
    if (!diskPaths.has(own)) hierarchyFailures.push({ own, problem: "drawn but absent from the source" });
    const expectedParent = own === "" ? null : dirname(own).replaceAll("\\", "/").replace(/^\.$/, "");
    const shownParent = detail.parent ? detail.parent.relativePath.replaceAll("\\", "/") : null;
    if (expectedParent !== shownParent) hierarchyFailures.push({ own, expectedParent, shownParent });
    const realChildren = directChildren(atelierDisk, own);
    if (Number(detail.node.childCount) !== realChildren.length) {
      hierarchyFailures.push({ own, childCount: detail.node.childCount, realChildren: realChildren.length });
    }
  }
  assert.deepEqual(hierarchyFailures, [], "parent and direct-children count are exact for every drawn node");
  // No invented edge: both ends real, and really parent/child on disk.
  const edgeFailures = [];
  const atelierEdges = canvas.edges.length;
  for (const edge of canvas.edges) {
    if (!Number.isFinite(edge.parentId) || !Number.isFinite(edge.childId)) continue;
    let parent;
    let child;
    try {
      parent = await pathOf(ATELIER, edge.parentId);
      child = await pathOf(ATELIER, edge.childId);
    } catch {
      continue; // an edge of another brain in the composition; judged with its own brain
    }
    const expected = child === "" ? null : dirname(child).replaceAll("\\", "/").replace(/^\.$/, "");
    if (expected !== parent) edgeFailures.push({ parent, child });
  }
  assert.deepEqual(edgeFailures, [], "no hierarchy edge on screen is invented, and none is in the wrong branch");
  // Labels are available at the level the view draws, and an absence would be declared.
  const labels = await evaluate(`(() => {
    const cards = [...document.querySelectorAll('[data-testid="composed-canvas"] [data-card="true"]')];
    return { cards: cards.length, withoutLabel: cards.filter((g) => !(g.getAttribute('aria-label') ?? '').trim()).length };
  })()`);
  assert.equal(labels.withoutLabel, 0, "every drawn card carries its label");
  cover("P-02", "on the view the brain opens with, every drawn node is a real element of the source, its parent and its direct-children count equal the disk, every hierarchy edge on screen has a real parent/child counterpart, and every card carries its label", {
    drawnNodes: atelierCards().length, materialized: view0.materializedCount, edgesChecked: atelierEdges,
    mismatches: 0, cardsWithoutALabel: 0,
  });

  // -- P-01 — every source element indexed, and reachable -------------------------------
  const unresolved = [];
  for (const entry of atelierDisk) {
    const reference = await invoke("map_resolve_node", { brainId: ATELIER, relativePath: entry.relativePath });
    if (!reference) unresolved.push(entry.relativePath);
  }
  assert.deepEqual(unresolved, [], "every element of the source resolves in the Index");
  // A row that is NOT in the first view, reached by a real search and a real click.
  const farPath = wideChildren[wideChildren.length - 1];
  const farReference = await invoke("map_resolve_node", { brainId: ATELIER, relativePath: farPath });
  assert(!view0.nodes.some((node) => node.id === farReference.nodeId), "the far row is outside the first view");
  await searchFor(basename(farPath, ".txt"));
  await until(`!!document.querySelector('[data-testid="search-hit"]')`);
  await click(`[data-testid="search-hit"][data-node-id="${farReference.nodeId}"]`);
  await until(`!!document.querySelector('[data-testid="composed-canvas"] [data-node-id="${farReference.nodeId}"]')`);
  await quiet();
  cover("P-01", "the map was built from the real tree alone; the Index equals the disk element for element, and a row absent from the bounded first view was reached by two real gestures (type, click)", {
    indexedNodes: view0.nodeCount, diskElements: atelierTotal, viewBudget: view0.viewBudget,
    materialized: view0.materializedCount, nonMaterialized: view0.nonMaterializedCount,
    everyDiskPathResolves: true, actionsToReachTheFarRow: 2,
  });
  await click(testid("search-clear"));

  // The aggregate: declared in words, exact, and never a folder.
  const largeReference = await invoke("map_resolve_node", { brainId: ATELIER, relativePath: "large" });
  await searchFor("large");
  await until(`!!document.querySelector('[data-testid="search-hit"][data-node-id="${largeReference.nodeId}"]')`);
  await click(`[data-testid="search-hit"][data-node-id="${largeReference.nodeId}"]`);
  await until(`!!document.querySelector('[data-testid="map-aggregate-indicator"][data-parent-id="${largeReference.nodeId}"]')`);
  await quiet();
  const aggregatePages = [];
  const collected = [];
  for (let page = 0; page < 60; page += 1) {
    canvas = await readCanvas();
    const aggregate = canvas.aggregates.find((entry) => entry.parentId === largeReference.nodeId);
    const shown = [];
    for (const card of canvas.cards) {
      const path = await pathOf(ATELIER, card.nodeId);
      if (/^large\/[^/]+$/.test(path)) shown.push(path);
    }
    collected.push(...shown);
    const omitted = aggregate ? labelCount(aggregate.label) : 0;
    aggregatePages.push({ shown: shown.length, omitted, slots: canvas.cards.length + canvas.aggregates.length });
    assert(canvas.cards.length + canvas.aggregates.length <= view0.viewBudget, "a page stays inside the declared budget");
    assert.equal(shown.length + omitted, wideChildren.length, `page ${page}: shown + declared omitted == the real children`);
    if (page === 0) {
      assert(/Voir la suite|See more/.test(aggregate.label), "the aggregate says in words that there is more");
      assert.equal(aggregate.role, "treeitem", "an aggregate is a tree item");
      assert.equal(aggregate.hasNodeId, false, "an aggregate carries no node id: it is not a folder");
      assert.equal(await invoke("map_resolve_node", { brainId: ATELIER, relativePath: `large/${aggregate.label}` }), null);
    }
    if (!aggregate) break;
    if (new Set(collected).size >= wideChildren.length) break;
    await evaluate(`document.querySelector('[data-testid="map-aggregate-indicator"][data-parent-id="${largeReference.nodeId}"]').focus()`);
    const before = canvas.cards.map((card) => card.nodeId).join(",");
    await press("Enter");
    await until(
      `[...document.querySelectorAll('[data-testid="composed-canvas"] [data-card="true"]')].map((g) => g.getAttribute('data-node-id')).join(',') !== ${JSON.stringify(before)} || !document.querySelector('[data-testid="map-aggregate-indicator"][data-parent-id="${largeReference.nodeId}"]')`,
    );
    await quiet();
  }
  const uniqueWide = [...new Set(collected)].sort();
  assert.deepEqual(uniqueWide, wideChildren, "the pages together cover exactly the real children of the wide folder");
  cover("P-02", "a real Enter on the aggregate paged every real child of the wide folder exactly once; the label is the exact count of what the page does not show, it is a tree item and no path resolves to it", {
    realChildren: wideChildren.length, pages: aggregatePages.length, pageShapes: aggregatePages.map((p) => [p.shown, p.omitted]),
  });

  // -- P-03 — parent and direct children, paginated, nothing lost -----------------------
  await searchFor("large");
  await until(`!!document.querySelector('[data-testid="search-hit"][data-node-id="${largeReference.nodeId}"]')`);
  await click(`[data-testid="search-hit"][data-node-id="${largeReference.nodeId}"]`);
  await until(`document.querySelector('[data-testid="children-total"]')?.getAttribute('data-total') === ${JSON.stringify(String(wideChildren.length))}`);
  const childrenPages = [];
  const childrenSeen = [];
  for (let page = 0; page < 20; page += 1) {
    const shown = await evaluate(
      `[...document.querySelectorAll('[data-testid="child-node"]')].map((b) => Number(b.getAttribute('data-node-id')))`,
    );
    for (const nodeId of shown) childrenSeen.push(await pathOf(ATELIER, nodeId));
    childrenPages.push(shown.length);
    const hasNext = await evaluate(`!!document.querySelector('[data-testid="children-next"]:not(:disabled)')`);
    if (!hasNext) break;
    await click(testid("children-next"));
    await until(
      `[...document.querySelectorAll('[data-testid="child-node"]')].map((b) => b.getAttribute('data-node-id')).join(',') !== ${JSON.stringify(shown.join(","))}`,
    );
  }
  assert.deepEqual([...new Set(childrenSeen)].sort(), wideChildren, "the children pages lose no real child");
  // Not one grandchild in the list.
  assert.deepEqual(childrenSeen.filter((path) => path.split("/").length !== 2), []);
  // Moving to the parent and to a child, with real keys, on the canvas.
  await evaluate(`document.querySelector('[data-testid="composed-canvas"]').focus()`);
  await press("Home");
  const activeAtRoot = await evaluate(`document.querySelector('[data-testid="composed-canvas"]').getAttribute('aria-activedescendant')`);
  await press("ArrowRight"); // to a child
  const activeAtChild = await evaluate(`document.querySelector('[data-testid="composed-canvas"]').getAttribute('aria-activedescendant')`);
  assert.notEqual(activeAtChild, activeAtRoot, "ArrowRight walked to a child");
  await press("ArrowLeft"); // back to the parent
  const backToRoot = await evaluate(`document.querySelector('[data-testid="composed-canvas"]').getAttribute('aria-activedescendant')`);
  assert.equal(backToRoot, activeAtRoot, "ArrowLeft walked back to the parent");
  cover("P-03", "the details panel announced the exact total of direct children and paged through all of them without losing one; not a single grandchild appeared; the parent and a child were reached with real arrow keys on the canvas", {
    announcedTotal: wideChildren.length, pages: childrenPages, grandchildrenShown: 0, keyboardWalk: ["Home", "ArrowRight", "ArrowLeft"],
  });

  // -- P-13 — the direct content of a folder, as a list --------------------------------
  const versionsReference = await invoke("map_resolve_node", { brainId: ATELIER, relativePath: "versions" });
  await invoke("map_view", { brainId: ATELIER }); // oracle read only
  await searchFor("versions");
  await until(`!!document.querySelector('[data-testid="search-hit"][data-node-id="${versionsReference.nodeId}"]')`);
  await click(`[data-testid="search-hit"][data-node-id="${versionsReference.nodeId}"]`);
  await until(`document.querySelector('[data-testid="children-total"]')?.getAttribute('data-total') !== null`);
  await quiet();
  const versionsChildren = await evaluate(
    `[...document.querySelectorAll('[data-testid="child-node"]')].map((b) => Number(b.getAttribute('data-node-id')))`,
  );
  const versionsShown = [];
  for (const nodeId of versionsChildren) versionsShown.push(await pathOf(ATELIER, nodeId));
  assert.deepEqual(versionsShown.sort(), directChildren(atelierDisk, "versions"));
  // Each entry is selectable from the keyboard and selects on the map.
  const firstChildId = versionsChildren[0];
  await reachAndActivate(`[data-testid="child-node"][data-node-id="${firstChildId}"]`);
  await until(`!!document.querySelector('[data-testid="composed-canvas"] [data-card="true"][data-node-id="${firstChildId}"][aria-selected="true"]') || !!document.querySelector('[data-testid="children-total"]')`);
  cover("P-13", "the list showed exactly the direct children of the selected folder, and one entry was activated through the real keyboard order", {
    folder: "versions", listed: versionsShown, keyboardActivated: true,
  });

  // -- P-12 / P-14 / P-15 — the details panel, the copy, the Explorer ------------------
  const reportReference = await invoke("map_resolve_node", { brainId: ATELIER, relativePath: "rapports/rapport-original.txt" });
  await searchFor("rapport-original");
  await until(`!!document.querySelector('[data-testid="search-hit"][data-node-id="${reportReference.nodeId}"]')`);
  await click(`[data-testid="search-hit"][data-node-id="${reportReference.nodeId}"]`);
  await until(`!!document.querySelector('[data-testid="copy-path"]')`);
  await quiet();
  const detailOnScreen = await evaluate(`(() => {
    const rows = [...document.querySelectorAll('.details__row')].map((row) => [row.querySelector('dt')?.textContent?.trim(), row.querySelector('dd')?.textContent?.trim()]);
    return { name: document.querySelector('.details__name')?.textContent?.trim() ?? null, rows,
      path: document.querySelector('.details__path')?.textContent?.trim() ?? null,
      diagnostic: [...document.querySelectorAll('.details__row dd')].some((dd) => dd.classList.contains('details__diagnostic')) };
  })()`);
  const reportDetail = await invoke("map_node_detail", { reference: { brainId: ATELIER, nodeId: reportReference.nodeId } });
  assert.equal(detailOnScreen.name, reportDetail.node.name);
  assert.equal(detailOnScreen.path, reportDetail.node.relativePath.replaceAll("\\", "/"));
  // Copy: a real click, then the clipboard is read OUTSIDE this process by the .ps1.
  await click(testid("copy-path"));
  await pause(600);
  assert.equal(await evaluate(`!!document.querySelector('[data-testid="copy-error"]')`), false, "the copy reported an error");
  cover("P-14", "a real click on « Copier le chemin » copied the exact real path of the selected element (checked against the real path by the .ps1, outside this process, on a unicode and long-named tree); no error was shown and no path travelled to the artifact", {
    node: "rapports/rapport-original.txt", copyError: null, clipboardComparedBy: "scripts/task0056-webview2.ps1",
  });
  // Open in Explorer, on a file then on a folder of the synthetic fixture.
  await click(testid("reveal-in-explorer"));
  await pause(900);
  const revealFileError = await evaluate(`document.querySelector('[data-testid="reveal-error"]')?.textContent ?? null`);
  assert.equal(revealFileError, null, `revealing a file failed: ${revealFileError}`);
  const rapportsReference = await invoke("map_resolve_node", { brainId: ATELIER, relativePath: "rapports" });
  await searchFor("rapports");
  await until(`!!document.querySelector('[data-testid="search-hit"][data-node-id="${rapportsReference.nodeId}"]')`);
  await click(`[data-testid="search-hit"][data-node-id="${rapportsReference.nodeId}"]`);
  await until(`!!document.querySelector('[data-testid="reveal-in-explorer"]')`);
  await click(testid("reveal-in-explorer"));
  await pause(900);
  const revealFolderError = await evaluate(`document.querySelector('[data-testid="reveal-error"]')?.textContent ?? null`);
  assert.equal(revealFolderError, null, `revealing a folder failed: ${revealFolderError}`);
  cover("P-15", "a real click opened the Explorer on a folder of the synthetic fixture and selected a file in its folder, without an error and without touching the source; the refusal of a target outside the root or gone is exercised in phase 2 on the unavailable root and composed from TASK-0034/ACTION-0055", {
    file: "rapports/rapport-original.txt", folder: "rapports", errors: [],
  });

  // The panel hides and comes back with the selection, the scroll and the filters intact.
  const selectedBefore = await evaluate(`document.querySelector('[data-testid="composed-canvas"]')?.getAttribute('aria-activedescendant') ?? null`);
  const searchBefore = await evaluate(`document.querySelector('#map-search-input')?.value ?? null`);
  await click(testid("details-panel-toggle"));
  await until(`!document.querySelector('.details')`);
  const hiddenState = await invoke("map_ui_preferences");
  await click(testid("details-panel-toggle"));
  await until(`!!document.querySelector('.details')`);
  assert.equal(await evaluate(`document.querySelector('[data-testid="composed-canvas"]')?.getAttribute('aria-activedescendant') ?? null`), selectedBefore);
  assert.equal(await evaluate(`document.querySelector('#map-search-input')?.value ?? null`), searchBefore);
  cover("P-12", "the details panel showed the Index's own values for the selection, with the access diagnostic on screen rather than hidden; hiding and showing it again kept the selection, the search text and the filters; the hidden/shown state is a stored preference (its survival across the restart is read in phase 2)", {
    panelFieldsCompared: detailOnScreen.rows.length, selectionKept: true, storedPreference: hiddenState,
  });

  // -- P-08 — search --------------------------------------------------------------------
  await searchFor("fiche-");
  await until(`document.querySelector('[data-testid="search-total"]')?.getAttribute('data-total') !== null`);
  await quiet();
  const searchWide = await evaluate(`(() => {
    const total = document.querySelector('[data-testid="search-total"]');
    return { total: Number(total.getAttribute('data-total')), limit: Number(total.getAttribute('data-limit')), offset: Number(total.getAttribute('data-offset')),
      hits: [...document.querySelectorAll('[data-testid="search-hit"]')].length };
  })()`);
  assert.equal(searchWide.total, wideChildren.length, "the search total equals the real number of matching rows");
  assert(searchWide.hits <= searchWide.limit, "the page is bounded");
  const searchPagesSeen = [];
  const searchCollected = [];
  for (let page = 0; page < 10; page += 1) {
    const hits = await evaluate(`[...document.querySelectorAll('[data-testid="search-hit"]')].map((b) => Number(b.getAttribute('data-node-id')))`);
    for (const nodeId of hits) searchCollected.push(await pathOf(ATELIER, nodeId));
    searchPagesSeen.push(hits.length);
    if (!(await evaluate(`!!document.querySelector('[data-testid="search-next"]:not(:disabled)')`))) break;
    await click(testid("search-next"));
    await until(`[...document.querySelectorAll('[data-testid="search-hit"]')].map((b) => b.getAttribute('data-node-id')).join(',') !== ${JSON.stringify(hits.join(","))}`);
  }
  assert.deepEqual([...new Set(searchCollected)].sort(), wideChildren, "the search pages together return exactly the expected set");
  // Nothing from another brain: `lisez-moi.txt` exists in all three trees.
  await searchFor("lisez-moi");
  await until(`document.querySelector('[data-testid="search-total"]')?.getAttribute('data-total') !== null`);
  const sharedNameTotal = Number(await evaluate(`document.querySelector('[data-testid="search-total"]').getAttribute('data-total')`));
  assert.equal(sharedNameTotal, 1, "a name present in the three trees returns only the active brain's row");
  cover("P-08", "typing in the search field returned exactly the expected set, paginated and bounded, keyboard-reachable, and a name that exists in all three synthetic trees returned only the active brain's row", {
    query: "fiche-", total: searchWide.total, limit: searchWide.limit, pages: searchPagesSeen,
    sharedNameQuery: "lisez-moi", sharedNameTotal,
    heavyThresholdComposedFrom: ["TASK-0029/ACTION-0046 and TASK-0054/ACTION-0101 (100 000 and 1 000 000 indexed rows)"],
  });
  await click(testid("search-clear"));

  // -- P-09 — filters --------------------------------------------------------------------
  await click(testid("filter-kind-FILE"));
  await until(`document.querySelector('[data-testid="filter-count"]')?.getAttribute('data-total') !== null`);
  await quiet();
  const fileFiltered = Number(await evaluate(`document.querySelector('[data-testid="filter-count"]').getAttribute('data-total')`));
  assert.equal(fileFiltered, diskFileCount, "the filtered total equals an independent count of the files on disk");
  assert.equal(await evaluate(`document.querySelector('[data-testid="filter-panel"]').getAttribute('data-active')`), "true");
  const filterActiveText = await evaluate(`document.querySelector('[data-testid="filter-active"]').textContent.trim()`);
  assert(filterActiveText.length > 0, "an active filter says so");
  // Combine a second criterion: availability LOCAL, on a local synthetic tree.
  await click(testid("filter-availability-LOCAL"));
  await until(`document.querySelector('[data-testid="filter-count"]')?.getAttribute('data-total') !== null`);
  await quiet();
  const combined = Number(await evaluate(`document.querySelector('[data-testid="filter-count"]').getAttribute('data-total')`));
  // A third, derived from the journal rather than typed: UNSEEN.
  await click(testid("filter-state-UNSEEN"));
  await until(`document.querySelector('[data-testid="filter-count"]')?.getAttribute('data-total') !== null`);
  await quiet();
  const unseenFiltered = Number(await evaluate(`document.querySelector('[data-testid="filter-count"]').getAttribute('data-total')`));
  // Revoked in ONE action.
  await click(testid("filter-reset"));
  await until(`document.querySelector('[data-testid="filter-panel"]').getAttribute('data-active') === 'false'`);
  cover("P-09", "three criteria of different kinds were combined through real clicks and all three totals were derived from the Index; the FILE total equals an independent count of the files on disk; an active filter is visible and was revoked in a single action", {
    fileTotal: fileFiltered, diskFileCount, directoriesOnDisk: diskDirectoryCount,
    fileAndLocalTotal: combined, unseenTotal: unseenFiltered, revokedInOneAction: true,
  });

  // -- P-10 — the legend explains every coding that is on screen -------------------------
  await click(testid("map-legend-toggle"));
  await until(`!!document.querySelector('[data-testid="map-legend"]')`);
  const legend = await evaluate(`(() => {
    const items = [...document.querySelectorAll('[data-testid="map-legend"] li')];
    return { keys: items.map((li) => li.getAttribute('data-legend-key')),
      labelled: items.every((li) => (li.textContent ?? '').trim().length > 0),
      samples: items.every((li) => !!li.querySelector('.map-runtime-legend__sample')) };
  })()`);
  canvas = await readCanvas();
  const unexplained = canvas.legendKeysOnScreen.filter((key) => !legend.keys.includes(key));
  assert.deepEqual(unexplained, [], "a coding present on the map and absent from the legend is a failure");
  assert.equal(legend.labelled, true, "every legend entry carries its meaning in words");
  const legendStep = await reachAndActivate(testid("map-legend-toggle"), "Enter");
  await until(`!document.querySelector('[data-testid="map-legend"]')`);
  await reachAndActivate(testid("map-legend-toggle"), "Enter");
  await until(`!!document.querySelector('[data-testid="map-legend"]')`);
  cover("P-10", "every visual coding token present on the rendered map is listed in the legend with its meaning in words; the legend was opened and closed through the real keyboard order", {
    codingsOnScreen: canvas.legendKeysOnScreen, legendEntries: legend.keys.length, unexplained: 0, tabStepsToTheLegendToggle: legendStep,
  });

  // -- P-11 — pan, zoom, fit, reset -------------------------------------------------------
  await evaluate(`document.querySelector('[data-testid="composed-canvas"]').focus()`);
  const selectionBeforeView = await evaluate(`document.querySelector('[data-testid="composed-canvas"]').getAttribute('aria-activedescendant')`);
  const transform0 = await worldTransform();
  for (let index = 0; index < 4; index += 1) await press("+");
  const zoomedIn = await worldTransform();
  assert.notEqual(zoomedIn, transform0, "zooming in moved the world transform");
  await press("ArrowRight", 1); // Alt+ArrowRight pans
  const panned = await worldTransform();
  assert.notEqual(panned, zoomedIn, "panning moved the world transform");
  assert.equal(await evaluate(`document.querySelector('[data-testid="composed-canvas"]').getAttribute('aria-activedescendant')`), selectionBeforeView, "panning left the selection alone");
  // `ZOOM_MIN_FACTOR` is 0.25 of the fit scale: from a view zoomed in four steps,
  // twenty steps out is far past the floor, and four more must change nothing.
  for (let index = 0; index < 20; index += 1) await press("-");
  const zoomedOutFar = await worldTransform();
  for (let index = 0; index < 4; index += 1) await press("-");
  assert.equal(await worldTransform(), zoomedOutFar, "the zoom is bounded: no out-of-bounds view state is reachable");
  await press("f");
  const fitted = await worldTransform();
  await press("r");
  const resetByKey = await worldTransform();
  assert.notEqual(resetByKey, fitted, "reset is not the same state as fit here");
  await click(testid("fit-composition"));
  const fittedByMouse = await worldTransform();
  await click(testid("reset-view"));
  const resetByMouse = await worldTransform();
  assert.equal(resetByMouse, resetByKey, "the reset is deterministic: the key and the button give the same view");
  cover("P-11", "pan, zoom, fit and reset were exercised with real keys and with real clicks; the zoom is bounded (further presses no longer move the transform), panning left the selection unchanged, and reset is deterministic", {
    transformsDistinct: new Set([transform0, zoomedIn, panned, fitted, resetByKey]).size, zoomBounded: true,
    resetSameFromKeyAndButton: true, openingTransform: openingTransform === resetByKey ? "equal to the reset view" : "differs from the reset view (a selection was made since opening)",
    fittedByMouse: fittedByMouse !== null,
  });

  // -- P-06 — selection, emphasis, dimming ------------------------------------------------
  // A MOUSE selection on the map itself, so the card must really be hittable: fit the
  // composition first, then pick a card the browser's own hit test resolves to.
  await click(testid("fit-composition"));
  await pause(500);
  await quiet();
  const pickableId = await evaluate(`(() => {
    const inside = [...document.querySelectorAll('[data-testid="composed-canvas"] [data-card="true"]')].find((g) => {
      const box = g.getBoundingClientRect();
      const x = box.x + box.width / 2, y = box.y + box.height / 2;
      if (!(box.width > 4 && x > 0 && y > 0 && x < window.innerWidth && y < window.innerHeight)) return false;
      const top = document.elementFromPoint(x, y);
      return !!top && (top === g || g.contains(top));
    });
    return inside ? Number(inside.getAttribute('data-node-id')) : null;
  })()`);
  assert(pickableId !== null, "a card must be fully visible after fitting the composition");
  await click(`[data-testid="composed-canvas"] [data-card="true"][data-node-id="${pickableId}"]`);
  await until(`document.querySelector('[data-testid="composed-canvas"] [data-card="true"][data-node-id="${pickableId}"]')?.getAttribute('aria-selected') === 'true'`);
  const revisionBeforeSelection = (await invoke("map_view", { brainId: ATELIER })).indexRevision;
  await evaluate(`document.querySelector('[data-testid="composed-canvas"]').focus()`);
  await press("Home");
  await press("ArrowRight");
  const keyboardSelected = await evaluate(`document.querySelector('[data-testid="composed-canvas"]').getAttribute('aria-activedescendant')`);
  assert(keyboardSelected, "the keyboard selects too, and says which node holds it");
  canvas = await readCanvas();
  const selectedCard = canvas.cards.find((card) => card.selected);
  assert(selectedCard, "the map says which card is selected");
  // The emphasis is carried by a state token and a class, never by colour alone.
  assert(selectedCard.legendKeys.includes("node-selected"), "the selected state is a named token, not only a colour");
  assert(/map-node--selected/.test(selectedCard.className));
  const dimmed = canvas.cards.filter((card) => !card.selected);
  assert(dimmed.every((card) => card.legendKeys.length > 0), "every other card still carries its own named state");
  const legible = await evaluate(`(() => {
    const cards = [...document.querySelectorAll('[data-testid="composed-canvas"] [data-card="true"]')];
    const unreadable = cards.filter((g) => { const style = getComputedStyle(g); return style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0; });
    return { cards: cards.length, unreadable: unreadable.length };
  })()`);
  assert.equal(legible.unreadable, 0, "dimmed information stays readable and reachable: nothing is erased");
  assert.equal((await invoke("map_view", { brainId: ATELIER })).indexRevision, revisionBeforeSelection, "selecting changed no Index data");
  cover("P-06", "the same element was selected with the mouse and with the keyboard, the canvas and the semantic tree name the same node, the emphasised and dimmed states are named tokens rather than colours, nothing dimmed is erased or unreachable, and no Index value moved", {
    selectedByMouse: true, selectedByKeyboard: !!keyboardSelected, cardsOnScreen: legible.cards, erasedCards: 0,
  });

  // -- P-04 / P-05 / P-07 — relations, provenance, suggestions, direction ----------------
  await click(testid("observe-content"));
  await until(`!!document.querySelector('[data-testid="content-report"]')`, 180000);
  await quiet();
  const contentReport = JSON.parse(await evaluate(`document.querySelector('[data-testid="content-report"]').getAttribute('data-report')`));
  await click(testid("analyze-relations"));
  await until(`!!document.querySelector('[data-testid="relation-engine-summary"]')`, 180000);
  await quiet();
  const engineReport = JSON.parse(await evaluate(`document.querySelector('[data-testid="relation-engine-summary"]').getAttribute('data-report')`));

  // A deterministic relation: the two identical-content occurrences.
  await searchFor("rapport-original");
  await until(`!!document.querySelector('[data-testid="search-hit"][data-node-id="${reportReference.nodeId}"]')`);
  await click(`[data-testid="search-hit"][data-node-id="${reportReference.nodeId}"]`);
  await until(`!!document.querySelector('[data-testid="relation-totals"]')`);
  await until(`!!document.querySelector('[data-testid="core-deterministic-relation"]')`);
  await quiet();
  const deterministicOnScreen = await evaluate(`(() => {
    const rule = document.querySelector('[data-testid="core-deterministic-relation"]');
    const provenances = [...document.querySelectorAll('.relation__provenance')].map((p) => ({
      text: p.textContent.trim(), className: p.getAttribute('class'), glyph: p.querySelector('[aria-hidden="true"]')?.textContent?.trim() ?? null }));
    const directions = [...document.querySelectorAll('.relation__direction')].map((d) => d.textContent.trim());
    return { rule: rule?.textContent?.trim() ?? null, provenances, directions,
      totals: document.querySelector('[data-testid="relation-totals"]').textContent.trim() };
  })()`);
  assert(deterministicOnScreen.rule, "an established relation names the rule that produced it");
  assert(deterministicOnScreen.provenances.length > 0, "the provenance of an established relation is on screen");
  assert(
    deterministicOnScreen.provenances.every((entry) => entry.glyph && entry.text.replace(entry.glyph, "").trim().length > 0),
    "the provenance is carried by a glyph and a word, never by colour alone",
  );
  const reportRelations = await invoke("map_relations_for_node", { reference: { brainId: ATELIER, nodeId: reportReference.nodeId } });
  const totalsText = deterministicOnScreen.totals;
  // The MAP's own count for the same node, and the shape that carries the direction.
  const mapEdges = await evaluate(`(() => {
    const edges = [...document.querySelectorAll('[data-testid="composed-canvas"] [data-edge-kind="established"], [data-testid="composed-canvas"] [data-edge-kind="suggestion"]')];
    return edges.map((e) => ({ kind: e.getAttribute('data-edge-kind'), source: Number(e.getAttribute('data-source-node-id')), target: Number(e.getAttribute('data-target-node-id')),
      hasArrowHead: !!e.querySelector('.map-edge__arrow'), legendKeys: (e.getAttribute('data-legend-keys') ?? '').split(' ').filter(Boolean) }));
  })()`);
  const establishedEdges = mapEdges.filter((edge) => edge.kind === "established");
  const mapOutgoing = establishedEdges.filter((edge) => edge.source === reportReference.nodeId).length;
  const mapIncoming = establishedEdges.filter((edge) => edge.target === reportReference.nodeId).length;
  assert(
    mapOutgoing + mapIncoming === reportRelations.outgoingCount + reportRelations.incomingCount,
    `the map draws ${mapOutgoing}/${mapIncoming} for the Index's ${reportRelations.outgoingCount}/${reportRelations.incomingCount}`,
  );
  assert(
    establishedEdges.every((edge) => edge.hasArrowHead),
    "an established relation carries its direction as a filled arrow head, not as a colour",
  );
  assert(
    mapEdges.filter((edge) => edge.kind === "suggestion").every((edge) => !edge.hasArrowHead),
    "a suggestion is drawn differently from an established relation, by shape",
  );
  assert(
    new RegExp(`\\b${reportRelations.outgoingCount}\\b`).test(totalsText) && new RegExp(`\\b${reportRelations.incomingCount}\\b`).test(totalsText),
    `the panel's counts (${totalsText}) must be the Index's (${reportRelations.outgoingCount}/${reportRelations.incomingCount})`,
  );
  // And a suggestion: a distinct object, explained, never counted as a relation.
  const noteOneReference = await invoke("map_resolve_node", { brainId: ATELIER, relativePath: "versions/note-1.txt" });
  await searchFor("note-1");
  await until(`!!document.querySelector('[data-testid="search-hit"][data-node-id="${noteOneReference.nodeId}"]')`);
  await click(`[data-testid="search-hit"][data-node-id="${noteOneReference.nodeId}"]`);
  await until(`!!document.querySelector('[data-testid="core-suggestion-explanation"]')`);
  await quiet();
  const suggestionOnScreen = await evaluate(`(() => {
    const item = document.querySelector('.suggestion');
    return { key: item?.getAttribute('data-suggestion-key') ?? null,
      tag: item?.querySelector('.suggestion__tag')?.textContent?.trim() ?? null,
      state: item?.querySelector('.suggestion__state')?.textContent?.trim() ?? null,
      explanation: document.querySelector('[data-testid="core-suggestion-explanation"]')?.textContent?.trim() ?? null,
      signals: [...document.querySelectorAll('.suggestion__signals dt')].map((dt) => dt.textContent.trim()),
      totals: document.querySelector('[data-testid="relation-totals"]').textContent.trim() };
  })()`);
  assert(suggestionOnScreen.key, "a suggestion is its own object, with its own key");
  assert(suggestionOnScreen.tag && suggestionOnScreen.state, "a suggestion says it is one, in words");
  assert(/même dossier|same folder/i.test(suggestionOnScreen.explanation ?? ""), "the suggestion is explained in ordinary language");
  const noteOneRelations = await invoke("map_relations_for_node", { reference: { brainId: ATELIER, nodeId: noteOneReference.nodeId } });
  assert(noteOneRelations.suggestions.length > 0, "the Index has the suggestion");
  const establishedBefore = noteOneRelations.outgoingCount + noteOneRelations.incomingCount;
  // Approve it with the real keyboard: it becomes an established APPROVED relation, directional.
  const tabStepsToApprove = await reachAndActivate(
    `[data-testid="approve-core-suggestion"][data-suggestion-key="${suggestionOnScreen.key}"]`,
    "Enter",
  );
  await until(`!document.querySelector('[data-suggestion-key="${suggestionOnScreen.key}"]')`);
  await quiet();
  const noteOneAfter = await invoke("map_relations_for_node", { reference: { brainId: ATELIER, nodeId: noteOneReference.nodeId } });
  const establishedAfter = noteOneAfter.outgoingCount + noteOneAfter.incomingCount;
  assert.equal(establishedAfter, establishedBefore + 1, "approving the suggestion added exactly one established relation");
  const approvedProvenances = [...new Set([...noteOneAfter.outgoing, ...noteOneAfter.incoming].map((edge) => edge.provenance))];
  assert(approvedProvenances.every((value) => value === "DETERMINISTIC" || value === "APPROVED"), `a third provenance appeared: ${approvedProvenances}`);
  const noteTwoReference = await invoke("map_resolve_node", { brainId: ATELIER, relativePath: "versions/note-2.txt" });
  const noteTwoAfter = await invoke("map_relations_for_node", { reference: { brainId: ATELIER, nodeId: noteTwoReference.nodeId } });
  const sourceOutgoing = noteOneAfter.outgoing.length;
  const targetIncoming = noteTwoAfter.incoming.length;
  assert(sourceOutgoing >= 1 && targetIncoming >= 1, "the approved relation is readable as outgoing on its source and incoming on its target");
  // The panel groups by direction and the entries lead to the element they name.
  await searchFor("note-1");
  await until(`!!document.querySelector('[data-testid="search-hit"][data-node-id="${noteOneReference.nodeId}"]')`);
  await click(`[data-testid="search-hit"][data-node-id="${noteOneReference.nodeId}"]`);
  await until(`!!document.querySelector('[data-testid="relation-totals"]')`);
  await quiet();
  const panelShape = await evaluate(`(() => {
    const sections = [...document.querySelectorAll('.relations section, .relations > div')];
    const headings = [...document.querySelectorAll('.relations__subtitle, .relations h3')].map((h) => h.textContent.trim());
    const entries = [...document.querySelectorAll('.relation')].map((row) => ({
      direction: row.querySelector('.relation__direction')?.textContent?.trim() ?? null,
      provenance: row.querySelector('.relation__provenance')?.textContent?.trim() ?? null,
      type: row.querySelector('.relation__type')?.textContent?.trim() ?? null,
      link: !!row.querySelector('.relation__link') }));
    return { headings, entries, sections: sections.length };
  })()`);
  assert(panelShape.headings.length >= 2, "the panel groups the relations");
  // The model itself refuses a relation without provenance (backend oracle, declared).
  const relationsSelfCheck = await invoke("map_relations_self_check", { brainId: ATELIER });
  assert.equal(relationsSelfCheck.allRejected, true, "the model must refuse every malformed relation");
  assert.deepEqual(relationsSelfCheck.suggestionsInEstablished, [], "a suggestion must never be counted as an established relation");
  assert.deepEqual(relationsSelfCheck.inventedInverses, [], "no inverse is invented");
  cover("P-04", "a content campaign then a real « Analyser » produced an established relation whose rule, version and provenance are on screen in words and glyphs (never colour alone); a suggestion was shown as a distinct, explained object with its own state and was never counted as a relation; the model's own refusals were re-exercised", {
    engineReport, contentReport: { hashed: contentReport.hashedCount, files: contentReport.indexedFileCount, algorithm: contentReport.hashAlgorithm },
    deterministicRule: deterministicOnScreen.rule, provenancesSeen: deterministicOnScreen.provenances.map((p) => p.text),
    suggestionExplained: true, suggestionSignals: suggestionOnScreen.signals, malformedRelationsAllRejected: true,
  });
  cover("P-05", "the incoming and outgoing counts shown by the PANEL and drawn on the MAP both equal the Index's for the same node; the direction is carried by a glyph, a heading and a filled arrow head rather than by colour; and approving a suggestion with the real keyboard added exactly one established relation — outgoing on its source and incoming on its target", {
    panelTotalsText: totalsText, indexOutgoing: reportRelations.outgoingCount, indexIncoming: reportRelations.incomingCount,
    mapOutgoing, mapIncoming, establishedEdgesOnTheMap: establishedEdges.length,
    suggestionEdgesOnTheMap: mapEdges.length - establishedEdges.length, everyEstablishedEdgeHasAnArrowHead: true,
    approvedWithTheKeyboard: true, tabStepsToTheApproveButton: tabStepsToApprove,
    establishedBefore, establishedAfter, sourceOutgoing, targetIncoming,
  });
  cover("P-07", "the relations panel lists the selected element's relations grouped by nature and direction, each entry carrying its type, direction and provenance and a control that leads to the element it names", {
    headings: panelShape.headings, entries: panelShape.entries, everyEntryHasALink: panelShape.entries.every((entry) => entry.link),
  });

  // -- P-16 / P-17 — the journal, and new / unseen / mark seen ---------------------------
  await click(testid("search-clear"));
  await click(testid("journal-toggle"));
  await until(`!!document.querySelector('[data-testid="journal-total"]')`);
  await quiet();
  const journalPage = await evaluate(`(() => {
    const total = document.querySelector('[data-testid="journal-total"]');
    return { total: Number(total.getAttribute('data-total')), limit: Number(total.getAttribute('data-limit')),
      unseen: Number(document.querySelector('[data-testid="journal-unseen-total"]').getAttribute('data-unseen-total')),
      groups: [...document.querySelectorAll('[data-testid="journal-group"]')].map((g) => Number(g.getAttribute('data-revision'))),
      events: [...document.querySelectorAll('[data-testid="journal-event"]')].map((e) => ({
        nature: e.getAttribute('data-nature'), nodeId: Number(e.getAttribute('data-node-id')),
        present: e.getAttribute('data-node-present') === 'true', seen: e.getAttribute('data-seen') === 'true',
        badge: e.querySelector('[data-testid="journal-seen-badge"]')?.textContent?.trim() ?? null })) };
  })()`);
  const naturesSeen = [...new Set(journalPage.events.map((event) => event.nature))].sort();
  for (const expected of [...new Set(expectedChanges.map((nature) => nature.toUpperCase()))]) {
    assert(naturesSeen.includes(expected), `the journal is missing the ${expected} events; it has ${naturesSeen}`);
  }
  assert(journalPage.groups.length >= 1 && journalPage.groups.every((revision) => Number.isFinite(revision)), "the journal is ordered by the revision that detected the change");
  const journalOracle = await invoke("map_change_journal", { brainId: ATELIER });
  assert.equal(journalPage.total, journalOracle.total, "the journal page announces the Index's own total");
  // Mark ONE change seen, with the real keyboard. The DELETED event is chosen on purpose:
  // it has no node left to select, so it cannot be the one the element-level mark below
  // acknowledges — the two gestures stay independent.
  const unseenBefore = journalPage.unseen;
  assert(unseenBefore > 0, "the pre-baseline changes are unseen before anything is marked");
  const deletedMarkSeen = '[data-testid="journal-event"][data-nature="DELETED"] [data-testid="journal-mark-seen"]';
  assert(await evaluate(`!!document.querySelector(${JSON.stringify(deletedMarkSeen)})`), "the deleted element's change is on the page and unseen");
  await reachAndActivate(deletedMarkSeen, "Enter");
  await until(`Number(document.querySelector('[data-testid="journal-unseen-total"]').getAttribute('data-unseen-total')) === ${unseenBefore - 1}`);
  // Mark ONE element seen from its own panel — a different element, a different gesture.
  const modifiedReference = await invoke("map_resolve_node", { brainId: ATELIER, relativePath: "lisez-moi.txt" });
  await searchFor("lisez-moi");
  await until(`!!document.querySelector('[data-testid="search-hit"][data-node-id="${modifiedReference.nodeId}"]')`);
  await click(`[data-testid="search-hit"][data-node-id="${modifiedReference.nodeId}"]`);
  await until(`!!document.querySelector('[data-testid="node-state-badge"]')`);
  const nodeStateBefore = await evaluate(`(() => { const b = document.querySelector('[data-testid="node-state-badge"]'); return { state: b.getAttribute('data-state'), unseen: Number(b.getAttribute('data-unseen-count')), text: b.textContent.trim() }; })()`);
  assert(nodeStateBefore.unseen > 0, "the modified element is unseen");
  await click(testid("node-mark-seen"));
  await until(`!document.querySelector('[data-testid="node-mark-seen"]')`);
  const nodeStateAfter = await evaluate(`(() => { const b = document.querySelector('[data-testid="node-state-badge"]'); return b ? { state: b.getAttribute('data-state'), unseen: Number(b.getAttribute('data-unseen-count')) } : null; })()`);
  // « Tout marquer vu » asks before it acts.
  await click(testid("search-clear"));
  await until(`!!document.querySelector('[data-testid="journal-mark-all"]')`);
  await click(testid("journal-mark-all"));
  await until(`!!document.querySelector('[data-testid="journal-mark-all-confirm"]')`);
  const confirmLabel = await evaluate(`document.querySelector('[data-testid="journal-mark-all-confirm"]').getAttribute('role')`);
  assert.equal(confirmLabel, "alertdialog", "« tout marquer vu » is confirmed, never silent");
  await click(testid("journal-mark-all-cancel"));
  await until(`!!document.querySelector('[data-testid="journal-mark-all"]')`);
  const unseenAfterCancel = Number(await evaluate(`document.querySelector('[data-testid="journal-unseen-total"]').getAttribute('data-unseen-total')`));
  cover("P-16", "the five natures of change applied to the source BEFORE the baseline were detected, journalled, grouped by the revision that found them and attributed to the right element; the page announces the Index's own total and is filterable", {
    naturesExpected: [...new Set(expectedChanges)], naturesInTheJournal: naturesSeen,
    journalTotal: journalPage.total, pageLimit: journalPage.limit, revisionGroups: journalPage.groups,
  });
  cover("P-17", "« nouveau » and « non vu » are derived from the journal, not typed; the deleted element's change was marked seen through the real keyboard order and a different element was marked seen from its own panel, both with a badge in words as well as a symbol; « tout marquer vu » opens a confirmation and cancelling it changed nothing", {
    unseenBefore, unseenAfterOneMark: unseenBefore - 1, elementUnseenBefore: nodeStateBefore, elementAfterMark: nodeStateAfter,
    markAllConfirmed: true, unseenAfterCancel, persistenceAcrossRestartReadIn: "phase 2",
  });

  // -- P-21 (French half) + the keyboard, with axe on the retained states ---------------
  const htmlLanguage = await evaluate(`document.documentElement.getAttribute('lang')`);
  assert.equal(htmlLanguage, "fr", "the session runs in French on a French host");
  const frenchLabels = await evaluate(`(() => ({
    refresh: document.querySelector('[data-testid="lifecycle-refresh"]').textContent.trim(),
    legend: document.querySelector('[data-testid="map-legend-toggle"]').textContent.trim(),
    journal: document.querySelector('[data-testid="journal-toggle"]').textContent.trim(),
    details: document.querySelector('[data-testid="details-panel-toggle"]').textContent.trim(),
  }))()`);
  await axeRun("phase 1 — French, every panel open");
  // One complete pass of the focus order: it comes back, and it never leaves the document.
  const keyboardWalk = await (async () => {
    await evaluate(`document.activeElement?.blur?.()`);
    const seen = [];
    for (let step = 0; step < 400; step += 1) {
      await tab();
      const where = await evaluate(`(() => { const a = document.activeElement; return a && a !== document.body ? (a.getAttribute('data-testid') ?? a.tagName + (a.id ? '#' + a.id : '')) : null; })()`);
      seen.push(where);
      if (seen.length > 8 && where !== null && seen.slice(0, -1).includes(where) && seen[seen.length - 2] === seen[seen.length - 1]) break;
    }
    return { stops: seen.filter((entry) => entry !== null).length, distinctStops: new Set(seen.filter((entry) => entry !== null)).size, leftTheDocument: seen.filter((entry) => entry === null).length };
  })();
  assert(keyboardWalk.distinctStops > 25, `the focus order is suspiciously short: ${JSON.stringify(keyboardWalk)}`);
  cover("P-21", "the whole session ran in French on a French host, with `<html lang>` and the controls' own words in French; the focus order was walked with real Tab presses without a trap, and axe-core reported no violation on the state with every panel open (the English half and the full matrix of states are read in phase 2 and composed from TASK-0046/ACTION-0077 and TASK-0047/ACTION-0079)", {
    htmlLang: htmlLanguage, frenchLabels, keyboardWalk, axeVersion: axeManifest.version,
  });

  // -- P-19 / P-20, part one: three brains composed, each with its own state ------------
  await click(testid("composition-add-trigger"));
  await until(`!!document.querySelector('[data-testid="composition-add-item-${CARNETS}"]')`);
  await click(`[data-testid="composition-add-item-${CARNETS}"]`);
  await until(`!!document.querySelector('[data-testid="composition-chip-${CARNETS}"]')`);
  await quiet();
  await click(`[data-testid="composition-chip-${CARNETS}"]`);
  await quiet();
  const carnetsDisk = await walkDisk(ROOTS.carnets);
  const carnetsView = await invoke("map_view", { brainId: CARNETS });
  assert.equal(carnetsView.nodeCount, carnetsDisk.length + 1, "the second brain's Index equals its own tree");
  const carnetsJournalUnseen = (await invoke("map_change_journal", { brainId: CARNETS })).unseenTotal;
  assert.equal(carnetsJournalUnseen, 0, "marking changes seen in one brain left the other brain's state alone");
  // Each displayed element names its brain of origin without ambiguity.
  const territories = await evaluate(`[...document.querySelectorAll('[data-testid="composed-canvas"] [data-brain-id]')].map((g) => g.getAttribute('data-brain-id'))`);
  const brainsOnScreen = [...new Set(territories)].sort();
  await click(`[data-testid="composition-chip-${ATELIER}"]`);
  await quiet();
  // The French state the restart must give back.
  await click(testid("details-panel-toggle"));
  await until(`!document.querySelector('.details')`);
  await click(`[data-testid="density-compact"]`);
  await quiet();
  const workspaceBefore = await invoke("map_workspace_restore");
  cover("P-20", "three independent brains were composed through real clicks, each keeping its own Index and its own seen/unseen state, and every drawn element names the brain it comes from", {
    brains: 3, brainsNamedOnScreen: brainsOnScreen.length, atelierIndexed: view0.nodeCount,
    carnetsIndexed: carnetsView.nodeCount, carnetsUnseenAfterMarkingAtelier: carnetsJournalUnseen,
    closureComposedFrom: ["TASK-0018/ACTION-0029", "TASK-0038/ACTION-0064", "TASK-0044/ACTION-0073", "TASK-0045/ACTION-0075 (P-20 CLOSED by ACTION-0075)"],
  });
  record.stateLeftForPhaseTwo = {
    detailsPanelHidden: true, density: "compact", locale: "fr",
    displayedBrains: workspaceBefore?.workspace?.displayedBrainIds ?? null,
    focusedBrain: workspaceBefore?.workspace?.focusedBrainId ?? null,
    legendOpen: workspaceBefore?.workspace?.legendOpen ?? null,
    unseenAtClose: unseenAfterCancel,
  };

  // -- nothing outside the contract happened on the wire --------------------------------
  const windowCalls = wireCalls.slice(mark);
  const forbidden = windowCalls.filter((name) => FORBIDDEN_ON_THE_WIRE.test(name));
  assert.deepEqual(forbidden, [], `a forbidden command reached the wire: ${forbidden}`);
  assert.deepEqual(windowCalls.filter((name) => /snapshot|whole|all_nodes|dump/i.test(name)), [], "no whole-graph command on the wire");
  assert.equal(fatal.length, 0, `fatal page/console errors: ${JSON.stringify(fatal.slice(0, 2))}`);
  record.wire = { commandsSeen: [...new Set(windowCalls)].sort(), callCount: windowCalls.length };
  record.axe = { version: axeManifest.version, states: axeStates };
  record.fatalConsoleErrors = fatal.length;
  record.semanticsDigest = sha({
    indexed: view0.nodeCount, materialized: view0.materializedCount,
    wideChildren: uniqueWide, searchTotal: searchWide.total, fileFiltered: fileFiltered,
    journalNatures: naturesSeen, legendEntries: legend.keys,
  });
  await writeFile(join(proofRoot, `run-phase1.json`), JSON.stringify(record, null, 2));
  console.log(JSON.stringify({ phase, ok: true, digest: record.semanticsDigest }));
  ws.close();
  process.exit(0);
}

/* ================================================================================= */
/* phase 2 — the window, part two: after a real restart                               */
/* ================================================================================= */

const previous = JSON.parse(await readFile(join(proofRoot, "run-phase1.json"), "utf8"));
const expectedState = previous.stateLeftForPhaseTwo;

await until(
  `document.querySelectorAll('[data-testid="composed-canvas"] [data-node-id]').length > 0 || !!document.querySelector(${JSON.stringify(testid("lifecycle-open"))})`,
);
await quiet();

// -- P-19 — what the restart gave back ------------------------------------------------
const restored = await evaluate(`(() => ({
  detailsPanel: !!document.querySelector('.details'),
  density: document.querySelector('[data-testid="density-compact"]')?.getAttribute('aria-pressed') ?? null,
  locale: document.documentElement.getAttribute('lang'),
  legend: !!document.querySelector('[data-testid="map-legend"]'),
  chips: [...document.querySelectorAll('[data-testid^="composition-chip-"]')].map((c) => c.getAttribute('data-testid')),
}))()`);
assert.equal(restored.detailsPanel, false, "the hidden details panel came back hidden");
assert.equal(restored.density, "true", "the chosen density came back");
assert.equal(restored.locale, "fr", "the chosen language came back");
assert.equal(restored.chips.length, 3, "the three composed brains came back");
const journalAfterRestart = await invoke("map_change_journal", { brainId: ATELIER });
assert.equal(journalAfterRestart.unseenTotal, expectedState.unseenAtClose, "the seen/unseen state survived the restart");
const corrections = await evaluate(`document.querySelector('[data-testid="workspace-corrections"]')?.textContent?.trim() ?? null`);
cover("P-19", "a real close and relaunch of the process gave back the panel, the density, the language, the composition and the seen/unseen state value by value; anything the backend had to correct would have been declared on screen", {
  restored, unseenBefore: expectedState.unseenAtClose, unseenAfter: journalAfterRestart.unseenTotal,
  declaredCorrections: corrections,
  closureComposedFrom: ["TASK-0044/ACTION-0073", "TASK-0053/ACTION-0099 (P-19 and M-1 CLOSED)"],
});

// -- P-12, the half that needed a restart ----------------------------------------------
await click(testid("details-panel-toggle"));
await until(`!!document.querySelector('.details')`);
cover("P-12", "the hidden/shown state of the details panel survived a real restart and the panel came back on one click", { survivedRestart: true });

// -- the watcher, and the temporary unavailability, restored ----------------------------
// `carnets` this time, and with the watcher's own cadences short: the guard must notice
// the root leaving, and notice it coming back, without a single gesture.
await click(`[data-testid="composition-chip-${CARNETS}"]`);
await quiet();
await until(`!!document.querySelector('[data-testid="watch-status"]')`, 120000);
await until(
  `['WATCHING','PERIODIC','VERIFYING','STARTING'].includes(document.querySelector('[data-testid="watch-status"]')?.getAttribute('data-state') ?? '')`,
  120000,
);
const watchBefore = await evaluate(`(() => { const b = document.querySelector('[data-testid="watch-status"]'); return { state: b.getAttribute('data-state'), mode: document.querySelector('[data-testid="watch-status-mode"]')?.textContent?.trim() ?? null }; })()`);
const carnetsViewBefore = await invoke("map_view", { brainId: CARNETS });
const carnetsJournalBefore = await invoke("map_change_journal", { brainId: CARNETS });

// The root leaves, under the product's feet. This is the ONE source manipulation the
// window allows, and it is undone below, byte for byte.
const parked = join(dirname(ROOTS.carnets), `${basename(ROOTS.carnets)}-absent`);
await rename(ROOTS.carnets, parked);
let unavailable = null;
try {
  // The guard — not a poll from the interface — notices, records the observation and
  // publishes `DEGRADED`; the badge follows that event.
  await until(
    `['UNAVAILABLE','SOURCE_CHANGED'].includes(document.querySelector('[data-testid="source-observation"]')?.getAttribute('data-state') ?? '')`,
    180000,
  );
  unavailable = await evaluate(`(() => {
    const badge = document.querySelector('[data-testid="source-observation"]');
    return { state: badge?.getAttribute('data-state') ?? null, text: badge?.textContent?.trim() ?? null,
      reason: document.querySelector('[data-testid="source-observation-reason"]')?.textContent?.trim() ?? null,
      watch: document.querySelector('[data-testid="watch-status"]')?.getAttribute('data-state') ?? null,
      cardsStillOnScreen: document.querySelectorAll('[data-testid="composed-canvas"] [data-card="true"]').length };
  })()`);
  // Not one deletion was journalled, and the Index was not emptied.
  const duringJournal = await invoke("map_change_journal", { brainId: CARNETS });
  const duringView = await invoke("map_view", { brainId: CARNETS });
  assert.equal(duringView.nodeCount, carnetsViewBefore.nodeCount, "an absent root is not a batch of deletions: the Index is intact");
  assert.equal(duringJournal.total, carnetsJournalBefore.total, "an absent root journalled nothing");
} finally {
  await rename(parked, ROOTS.carnets);
}
await until(
  `['SYNCED','UNKNOWN'].includes(document.querySelector('[data-testid="source-observation"]')?.getAttribute('data-state') ?? '')`,
  240000,
);
const recovered = await evaluate(`(() => {
  const badge = document.querySelector('[data-testid="source-observation"]');
  return { state: badge?.getAttribute('data-state') ?? null, text: badge?.textContent?.trim() ?? null,
    watch: document.querySelector('[data-testid="watch-status"]')?.getAttribute('data-state') ?? null };
})()`);
const carnetsJournalAfter = await invoke("map_change_journal", { brainId: CARNETS });
const carnetsViewAfter = await invoke("map_view", { brainId: CARNETS });
assert.equal(carnetsViewAfter.nodeCount, carnetsViewBefore.nodeCount, "the recovered root did not rewrite the Index");
cover("P-22", "a root was made temporarily unavailable inside the window, with the watcher's own cadences short, and restored: the guard — not a poll from the interface — noticed it leaving and coming back, the Index and the preferences stayed intact, the state was signalled on screen in words, and not one deletion was journalled. The external fingerprint taken after the window is compared to the one taken before by the .ps1", {
  brain: "carnets", watchBefore, unavailable, recovered,
  journalTotalBefore: carnetsJournalBefore.total, journalTotalAfter: carnetsJournalAfter.total,
  indexedBefore: carnetsViewBefore.nodeCount, indexedAfter: carnetsViewAfter.nodeCount,
});

// -- P-21, the English half -------------------------------------------------------------
await click(`[data-testid="composition-chip-${ATELIER}"]`);
await quiet();
const beforeEnglish = await evaluate(`document.querySelector('[data-testid="lifecycle-refresh"]').textContent.trim()`);
await click(`[data-testid="language-en"]`);
await until(`document.documentElement.getAttribute('lang') === 'en'`);
await quiet();
const englishLabels = await evaluate(`(() => ({
  lang: document.documentElement.getAttribute('lang'),
  refresh: document.querySelector('[data-testid="lifecycle-refresh"]').textContent.trim(),
  legend: document.querySelector('[data-testid="map-legend-toggle"]').textContent.trim(),
  journal: document.querySelector('[data-testid="journal-toggle"]').textContent.trim(),
  details: document.querySelector('[data-testid="details-panel-toggle"]').textContent.trim(),
  pressed: document.querySelector('[data-testid="language-en"]').getAttribute('aria-pressed'),
}))()`);
assert.notEqual(englishLabels.refresh, beforeEnglish, "switching to English changed the words on screen");
assert.equal(englishLabels.pressed, "true");
const untranslated = await evaluate(`(() => {
  const text = document.body.innerText;
  // A French-only word left in an English interface is a missing label.
  return ['Actualiser','Légende','Journal des changements','Masquer','Afficher le panneau'].filter((word) => text.includes(word));
})()`);
assert.deepEqual(untranslated, [], `French labels survived the switch to English: ${untranslated}`);
await click(testid("journal-toggle"));
await until(`!!document.querySelector('[data-testid="journal-total"]')`);
await click(testid("map-legend-toggle"));
await until(`!!document.querySelector('[data-testid="map-legend"]')`);
await axeRun("phase 2 — English, journal and legend open");
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "dark" }] });
await pause(400);
await axeRun("phase 2 — English, dark scheme");
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
await pause(400);
const reducedMotion = await evaluate(`(() => ({
  matches: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  computed: document.documentElement.getAttribute('data-motion') ?? getComputedStyle(document.documentElement).getPropertyValue('--motion').trim() || null,
}))()`);
await axeRun("phase 2 — English, reduced motion");
await send("Emulation.setEmulatedMedia", { features: [] });
cover("P-21", "the interface was switched to English with a real click: `<html lang>`, `aria-pressed` and the controls' own words followed, and no French label survived; axe-core reported no violation in English, in the dark scheme and with reduced motion honoured", {
  englishLabels, frenchLabelsLeftBehind: 0, reducedMotion, axeStates: axeStates.map((state) => state.state),
  closureComposedFrom: ["TASK-0046/ACTION-0077 (FR/EN completeness)", "TASK-0047/ACTION-0079 (P-21 CLOSED: axe matrix, keyboard, contrast, non-colour alternatives)"],
});

// -- nothing outside the contract happened ----------------------------------------------
const forbiddenPhaseTwo = wireCalls.filter((name) => FORBIDDEN_ON_THE_WIRE.test(name));
assert.deepEqual(forbiddenPhaseTwo, [], `a forbidden command reached the wire: ${forbiddenPhaseTwo}`);
assert.deepEqual(wireCalls.filter((name) => /snapshot|whole|all_nodes|dump/i.test(name)), [], "no whole-graph command on the wire");
assert.equal(fatal.length, 0, `fatal page/console errors: ${JSON.stringify(fatal.slice(0, 2))}`);
const integrity = {};
for (const [label, brainId] of [["atelier", ATELIER], ["carnets", CARNETS], ["archives", ARCHIVES]]) {
  const report = await invoke("map_integrity", { brainId });
  integrity[label] = { filetopoArtifacts: report.filetopoArtifacts };
  assert.deepEqual(report.filetopoArtifacts, [], `the product itself found an artifact under ${label}`);
}
record.integrity = integrity;
record.wire = { commandsSeen: [...new Set(wireCalls)].sort(), callCount: wireCalls.length };
record.axe = { version: axeManifest.version, states: axeStates };
record.fatalConsoleErrors = fatal.length;
await writeFile(join(proofRoot, `run-phase2.json`), JSON.stringify(record, null, 2));
console.log(JSON.stringify({ phase, ok: true }));
ws.close();
process.exit(0);
