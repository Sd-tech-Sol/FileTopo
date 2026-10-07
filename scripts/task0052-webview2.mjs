// TASK-0052 — real WebView2 proof of branch focus and collapse (DEC-0050 / F-042).
// NOTE: phase 2 asserts the session-only behaviour that was true on the proof HEAD; TASK-0053 (F-052)
// supersedes it — a restart now restores the focus. Kept as the historical proof of that HEAD.
// Two real processes: phase 1 exercises the gestures, phase 2 runs after a real
// restart and states that none of the F-042 state was kept (session-only).
//
//   node scripts/task0052-webview2.mjs <port> <variant> <phase> <proofRoot> <head>
//
// The four gestures judged — focus a branch, collapse, expand, exit — are
// activated with REAL key events dispatched through the browser's input pipeline
// (CDP `Input.dispatchKeyEvent`): Enter and Space on native buttons. Scaffolding
// (preparing the synthetic roots, selecting a card with the mouse, reading the
// backend as an oracle) is done in-page or by the mouse and is named as such.
// EVERY reference count and path set is recomputed by this harness from the
// synthetic directories on disk — never from FileTopo's own answers.
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
assert(/^task0052-[a-f0-9]+$/.test(variant));
assert([1, 2].includes(phase), "phase must be 1 or 2");
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
const GAMMA = "brain-gamma"; // a frozen synthetic brain: the one whose relation stores exist
const sourceRoots = [seed.rootAlix, seed.rootBea];

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
const diskAlix = await walkDisk(seed.rootAlix);
const diskBea = await walkDisk(seed.rootBea);
// All real descendants of a folder, from the disk.
const descendantsOnDisk = (disk, folder) => disk.filter((path) => path.startsWith(`${folder}/`));
const subtreeOnDisk = (disk, folder) => [folder, ...descendantsOnDisk(disk, folder)].sort();

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

/* --- fingerprints of everything a gesture must leave alone -------------------- */

// Source (the directories), Index (id, revision, whole projection), journal,
// seen state, relations — as the product itself reports them, read-only.
async function everythingElse() {
  const indexes = {};
  const journals = {};
  for (const brainId of [ALIX, BEA, GAMMA]) {
    const snapshot = await invoke("map_view", { brainId });
    indexes[brainId] = { revision: snapshot.indexRevision, nodeCount: snapshot.nodeCount, digest: sha(snapshot) };
    journals[brainId] = sha(await invoke("map_change_journal", { brainId }));
  }
  // The relation stores that exist: the synthetic brain's own, and the common inter-brain one.
  // (The real-root brains hold no relation store: their relations command refuses by design.)
  const gammaRelations = await invoke("map_relations_open", { brainId: GAMMA });
  const cross = await invoke("map_cross_relations_open");
  // Without row ids: opening a legacy brain replays its derivation, which hands the same relations fresh ids.
  const shape = (overview) => ({
    counts: [overview.deterministicCount, overview.approvedCount, overview.pendingSuggestionCount],
    established: overview.established
      .map((edge) => `${edge.provenance}|${edge.source.key}>${edge.target.key}|${edge.relationType}|${edge.suggestionKey ?? ""}`)
      .sort(),
    pending: overview.pendingSuggestions.map((suggestion) => `${suggestion.suggestionKey}:${suggestion.state}`).sort(),
  });
  const relations = { gamma: shape(gammaRelations), common: shape(cross) };
  // Seen / unseen state of a few nodes of the focused tree, as the product reports it.
  const seen = {};
  for (const path of ["projet", "projet/docs", "projet/src", "archives"]) {
    const reference = { brainId: ALIX, nodeId: await nodeIdOf(ALIX, path) };
    seen[path] = sha(await invoke("map_node_change_state", { reference }));
  }
  const sources = {};
  for (const [index, root] of sourceRoots.entries()) sources[`root${index + 1}`] = await hashTree(root);
  return { indexes, journals, relations, seen, sources };
}
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const resumeStates = async () => ({
  alix: await invoke("map_brain_resume_state", { brainId: ALIX }),
  bea: await invoke("map_brain_resume_state", { brainId: BEA }),
});
const resumeWrites = () => wireCalls.filter((name) => name === "map_brain_resume_update").length;
// Every command the page sent since `mark`: the gestures may only READ.
const WRITE_COMMANDS = /^map_(brain_(activate|update|exclusions_replace|choose_real_root|resume_update)|refresh|rebuild|prepare_|change_mark|node_mark|relations_(approve|reject|revoke)|cross_relations_(approve|revoke)|content_observe|relation_engine_run|ui_preferences_update|write_run_artifact|reveal_node|copy_node_path)/;
const wireSince = (mark) => wireCalls.slice(mark);
const writesIn = (calls) => calls.filter((name) => WRITE_COMMANDS.test(name));

/* --- what the map and the panel show ---------------------------------------------- */

const pathCache = new Map();
async function pathOf(brainId, nodeId) {
  const key = `${brainId}:${nodeId}`;
  if (!pathCache.has(key)) {
    const detail = await invoke("map_node_detail", { reference: { brainId, nodeId } });
    pathCache.set(key, detail.node.relativePath.replaceAll("\\", "/"));
  }
  return pathCache.get(key);
}
async function nodeIdOf(brainId, relativePath) {
  const reference = await invoke("map_resolve_node", { brainId, relativePath });
  assert(reference, `node not found: ${relativePath}`);
  return reference.nodeId;
}
// Every card drawn on the canvas — hidden or not: a CSS mask would still be counted here.
const readCanvas = () =>
  evaluate(`(() => {
    const cards = [...document.querySelectorAll('[data-testid="composed-canvas"] [data-card="true"]')];
    return {
      cards: cards.map((g) => ({
        brainId: g.getAttribute('data-brain-id'), nodeId: Number(g.getAttribute('data-node-id')),
        collapsed: g.getAttribute('data-collapsed') === 'true', hidden: g.getAttribute('data-hidden-descendant-count'),
        branchRoot: g.getAttribute('data-branch-root') === 'true', selected: g.getAttribute('aria-selected') === 'true',
        label: g.getAttribute('aria-label'),
        tag: g.querySelector('[data-testid="map-collapsed-tag"]')?.textContent ?? null,
        dash: getComputedStyle(g.querySelector('rect')).strokeDasharray,
      })),
      aggregates: [...document.querySelectorAll('[data-testid="map-aggregate-indicator"]')].map((a) => ({
        parentId: Number(a.getAttribute('data-parent-id')), label: a.getAttribute('aria-label'),
      })),
      edges: [...document.querySelectorAll('[data-testid="composed-canvas"] g[data-edge-kind="hierarchy"]')].map((g) =>
        g.getAttribute('data-brain-id') + ':' + g.getAttribute('data-parent-node-id') + '>' + g.getAttribute('data-child-node-id')).sort(),
      brainsDrawn: [...new Set(cards.map((g) => g.getAttribute('data-brain-id')))].sort(),
      territoryFrames: [...document.querySelectorAll('[data-testid="composed-canvas"] [data-brain-id]')].map((e) => e.getAttribute('data-brain-id')).filter((value, index, all) => all.indexOf(value) === index).sort(),
      world: document.querySelector('[data-testid="composed-world"]')?.getAttribute('transform') ?? null,
      chips: [...document.querySelectorAll('[data-testid^="composition-chip-"]')].map((e) => e.getAttribute('data-testid')),
    };
  })()`);
const cardKeys = (canvas) => canvas.cards.map((card) => `${card.brainId}:${card.nodeId}`).sort();
async function cardPaths(canvas, brainId) {
  return (await Promise.all(canvas.cards.filter((card) => card.brainId === brainId).map((card) => pathOf(brainId, card.nodeId)))).sort();
}
const readPanel = () =>
  evaluate(`(() => {
    const panel = document.querySelector('[data-testid="branch-focus-panel"]');
    const text = (selector) => document.querySelector(selector)?.textContent ?? null;
    return {
      present: !!panel,
      active: panel?.getAttribute('data-branch-active') === 'true',
      rootId: panel?.getAttribute('data-branch-root-id') ?? null,
      banner: text('[data-testid="branch-focus-banner"]'),
      path: text('[data-testid="branch-focus-path"]'),
      exit: text('[data-testid="branch-exit"]'),
      focusButton: text('[data-testid="branch-focus"]'),
      focusDisabled: document.querySelector('[data-testid="branch-focus"]')?.disabled ?? null,
      toggle: text('[data-testid="branch-toggle"]'),
      toggleDisabled: document.querySelector('[data-testid="branch-toggle"]')?.disabled ?? null,
      toggleCollapsed: document.querySelector('[data-testid="branch-toggle"]')?.getAttribute('data-collapsed') === 'true',
      collapsed: [...document.querySelectorAll('[data-testid="branch-collapsed-item"]')].map((li) => ({
        nodeId: Number(li.getAttribute('data-node-id')), hidden: Number(li.getAttribute('data-hidden-descendant-count')), text: li.textContent,
      })),
    };
  })()`);
const activeElement = () =>
  evaluate(`(() => { const e = document.activeElement; return { tag: e?.tagName ?? null, testid: e?.getAttribute?.('data-testid') ?? null, text: (e?.textContent ?? '').slice(0, 70) }; })()`);
const statusLine = () =>
  evaluate(`(document.querySelector('[role="status"]') ?? document.querySelector('[data-testid="status"]'))?.textContent ?? null`);
// Every element that takes focus from now on, in order: it must never be `body`.
const startFocusTrail = () =>
  evaluate(`(() => {
    window.__focusTrail = [];
    if (!window.__focusTrailInstalled) {
      window.__focusTrailInstalled = true;
      document.addEventListener('focusin', (event) => {
        window.__focusTrail.push({ tag: event.target?.tagName ?? null, testid: event.target?.getAttribute?.('data-testid') ?? null });
      }, true);
    }
  })()`);
const readFocusTrail = () => evaluate("window.__focusTrail ?? []");

async function focusDirectly(selector) {
  await evaluate(`document.querySelector(${JSON.stringify(selector)})?.focus()`);
  assert(await evaluate(`document.activeElement === document.querySelector(${JSON.stringify(selector)})`), `cannot focus ${selector}`);
}
// A real Tab from the control that PRECEDES it in the tab order must land on it.
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
async function selectNodeByMouse(brainId, relativePath) {
  const nodeId = await nodeIdOf(brainId, relativePath);
  const selector = `[data-testid="composed-canvas"] [data-brain-id="${brainId}"][data-node-id="${nodeId}"]`;
  await until(`!!document.querySelector(${JSON.stringify(selector)})`, 30000);
  await click(selector);
  await until(`document.querySelector(${JSON.stringify(selector)})?.getAttribute('aria-selected') === 'true'`, 15000);
  await quiet();
  return nodeId;
}
async function fit() {
  await click(testid("fit-composition"));
  await pause(500);
  await quiet();
}
async function openActiveBrain() {
  const canvasHasNodes = "document.querySelectorAll('[data-testid=composed-canvas] [data-node-id]').length > 0";
  if (!(await evaluate(canvasHasNodes)) && (await evaluate(`!!document.querySelector(${JSON.stringify(testid("lifecycle-open"))})`))) {
    await click(testid("lifecycle-open"));
  }
  await until(canvasHasNodes);
}
async function addBrain(brainId) {
  if (await evaluate(`!!document.querySelector(${JSON.stringify(testid(`composition-chip-${brainId}`))})`)) return;
  await click(testid("composition-add-trigger"));
  await until(`!!document.querySelector(${JSON.stringify(testid(`composition-add-item-${brainId}`))})`);
  await click(testid(`composition-add-item-${brainId}`));
  await until(`!!document.querySelector(${JSON.stringify(testid(`composition-chip-${brainId}`))})`);
}
async function setUpComposition() {
  await until("!!window.__TAURI_INTERNALS__");
  await until(`!!document.querySelector(${JSON.stringify(testid("lifecycle-open"))}) || !!document.querySelector(${JSON.stringify(testid("composition-add-trigger"))})`);
  // Scaffolding: the real-root Indexes, through the product's own commands.
  await invoke("map_refresh", { brainId: ALIX });
  await invoke("map_refresh", { brainId: BEA });
  await invoke("map_prepare_synthetic_source", { brainId: GAMMA });
  await invoke("map_rebuild", { brainId: GAMMA });
  await openActiveBrain();
  await addBrain(BEA);
  await addBrain(GAMMA);
  for (const brainId of [BEA, GAMMA]) {
    await until(`document.querySelectorAll('[data-testid="composed-canvas"] [data-brain-id="${brainId}"][data-node-id]').length > 0`);
  }
  await click(testid(`composition-chip-${ALIX}`));
  await fit();
}

/* --- the scenario ------------------------------------------------------------- */

const record = { task: "TASK-0052", phase, headTested, checks: [] };
const check = (label, value = true) => {
  record.checks.push({ label, value });
  return value;
};
const focusTrailHasNoBody = (trail) => trail.every((step) => step.tag !== "BODY" && step.tag !== null);

async function phaseOne() {
  await setUpComposition();
  const initialCanvas = await readCanvas();
  assert.deepEqual(initialCanvas.brainsDrawn, [ALIX, BEA, GAMMA].sort(), "the initial composition shows both brains");
  check("initial composition is multi-brain", initialCanvas.brainsDrawn);

  // -- a folder is selected with the mouse (scaffolding), then the branch is focused with the keyboard.
  const projetId = await selectNodeByMouse(ALIX, "projet");
  const wholeBrainNodes = (await invoke("map_view", { brainId: ALIX })).nodeCount;
  const before = {
    canvas: await readCanvas(),
    selected: initialCanvas && (await readCanvas()).cards.find((card) => card.selected),
    resume: await resumeStates(),
    fingerprints: await everythingElse(),
    writes: resumeWrites(),
    wire: wireCalls.length,
  };
  assert.equal(before.selected?.nodeId, projetId, "`projet` is selected before the focus");
  const panelBefore = await readPanel();
  assert(panelBefore.present && !panelBefore.active && panelBefore.focusDisabled === false, "the focus control is offered for a folder");
  assert.equal(panelBefore.focusButton, "Focaliser la branche");
  await startFocusTrail();

  // ===== F42-1 / F42-2 — focus the branch with a real Tab and a real Enter.
  await tabOnto(testid("branch-focus"));
  await press("Enter");
  await untilTrue("branch focus active", async () => (await readPanel()).active);
  await quiet();
  const reference = descendantsOnDisk(diskAlix, "projet");
  const expectedSubtree = subtreeOnDisk(diskAlix, "projet");
  assert.equal(expectedSubtree.length, 27, "the synthetic branch has the 27 entries the seed built");
  let canvas = await readCanvas();
  const panel = await readPanel();
  assert.deepEqual(canvas.brainsDrawn, [ALIX], "only the focused brain is drawn");
  assert(!canvas.territoryFrames.includes(BEA), "no element of the other brain is left on the canvas, hidden or not");
  const drawnPaths = await cardPaths(canvas, ALIX);
  assert.deepEqual(drawnPaths, expectedSubtree, "the canvas holds exactly the focused folder and its subtree (disk reference)");
  assert(drawnPaths.every((path) => path === "projet" || path.startsWith("projet/")), "no ancestor, sibling or outside node");
  assert(!drawnPaths.includes("") && !drawnPaths.includes("archives") && !drawnPaths.includes("zzz-racine.txt"), "no root, no sibling");
  assert.equal(canvas.cards.filter((card) => card.branchRoot).length, 1, "exactly one focused root");
  assert.equal(panel.banner.includes("Branche focalisée"), true, `banner: ${panel.banner}`);
  assert.equal(panel.path, "Chemin : projet");
  assert.equal(panel.exit, "Quitter le focus");
  const focusedAfterEnter = await activeElement();
  assert.equal(focusedAfterEnter.testid, "branch-exit", `focus after entering: ${JSON.stringify(focusedAfterEnter)}`);
  // The DTO is bounded and carries only the subtree: the DOM is not a mask over a bigger payload.
  const dto = await invoke("map_branch_view", { brainId: ALIX, rootId: projetId, collapsedIds: [], after: null });
  assert.deepEqual(dto.nodes.map((node) => node.relativePath.replaceAll("\\", "/")).sort(), expectedSubtree, "the DTO holds the subtree only");
  assert(dto.nodes.length <= 64 && dto.nodes.length + dto.aggregates.length <= dto.viewBudget && dto.viewBudget === 512, "bounded projection");
  assert(dto.nodeCount > dto.nodes.length * 2, `the brain has ${dto.nodeCount} nodes; the DTO carries ${dto.nodes.length} of them as a list`);
  assert.equal(canvas.cards.length, dto.nodes.length, "the DOM draws exactly what the DTO holds (no CSS mask)");
  assert.equal(dto.branch.rootNodeId, projetId);
  const sessionOnlySentence = await evaluate(`document.querySelector('[data-testid="branch-focus-panel"]').textContent.includes("Cet état n'est pas conservé après un redémarrage.")`);
  assert(sessionOnlySentence);
  assert.equal(resumeWrites(), before.writes, "entering the focus wrote the resume state");
  assert(same(await resumeStates(), before.resume), "entering the focus changed the resume state");
  const referenceCanvas = canvas;
  const referenceDto = dto;
  const axeFocused = await axeRun();
  assert.equal(axeFocused.violations.length, 0, `axe (branch focused): ${JSON.stringify(axeFocused.violations)}`);
  record.focus = {
    enteredWith: "real Tab then Enter on the native button",
    banner: panel.banner,
    path: panel.path,
    cardsDrawn: canvas.cards.length,
    drawnPathsEqualDiskSubtree: true,
    otherBrainElements: 0,
    dtoNodeCount: dto.nodes.length,
    brainNodeCount: dto.nodeCount,
    focusAfterEntering: focusedAfterEnter,
    resumeWritesDuringEntry: 0,
  };
  await fit();
  canvas = await readCanvas();

  // ===== F42-4 / F42-5 — collapse `docs` (three levels below it) with a real Enter.
  const docsDisk = descendantsOnDisk(diskAlix, "projet/docs");
  assert.equal(docsDisk.length, 14, "the disk reference: `docs` holds 14 real descendants");
  const docsId = await selectNodeByMouse(ALIX, "projet/docs");
  const docsDetail = await invoke("map_node_detail", { reference: { brainId: ALIX, nodeId: docsId } });
  assert.equal(docsDetail.node.childCount, 3, "docs has three DIRECT children — child_count is not the answer");
  await startFocusTrail();
  await focusDirectly(testid("branch-toggle"));
  assert.equal((await readPanel()).toggle, "Replier docs");
  await press("Enter");
  await untilTrue("docs collapsed", async () => (await readPanel()).collapsed.some((item) => item.nodeId === docsId));
  await quiet();
  canvas = await readCanvas();
  let state = await readPanel();
  const docsCard = canvas.cards.find((card) => card.nodeId === docsId);
  assert(docsCard.collapsed, "docs is marked collapsed");
  assert.equal(Number(docsCard.hidden), docsDisk.length, "the card's exact hidden count equals the independent disk count");
  assert.equal(state.collapsed[0].hidden, docsDisk.length);
  assert.match(docsCard.tag, /^▸ replié · 14 masqués$/, "a word and a glyph on the folder itself");
  assert.notEqual(docsCard.dash, "none", "a non-colour outline on the collapsed card");
  const afterCollapsePaths = await cardPaths(canvas, ALIX);
  assert.deepEqual(afterCollapsePaths, expectedSubtree.filter((path) => !docsDisk.includes(path)), "exactly the descendants of docs left; every other node stayed");
  assert(afterCollapsePaths.includes("projet/docs"), "the folder itself stays");
  assert(canvas.aggregates.length === 0, "a collapse produced no aggregate");
  assert.equal(state.toggle, "Déplier docs — 14 descendants masqués");
  const focusAfterCollapse = await activeElement();
  assert.equal(focusAfterCollapse.testid, "branch-toggle", `focus after collapsing: ${JSON.stringify(focusAfterCollapse)}`);
  assert(canvas.cards.find((card) => card.selected)?.nodeId === docsId, "the selection is on the collapsed folder");
  const dtoCollapsed = await invoke("map_branch_view", { brainId: ALIX, rootId: projetId, collapsedIds: [docsId], after: null });
  assert.equal(dtoCollapsed.branch.collapsed[0].hiddenDescendantCount, docsDisk.length);
  assert.equal(canvas.cards.length, dtoCollapsed.nodes.length, "no CSS mask: the DOM equals the collapsed DTO");
  const srcDisk = descendantsOnDisk(diskAlix, "projet/src");
  assert.equal(srcDisk.length, 9);

  // ===== F42-6 — expand with a real Space: the projection returns to the reference.
  await press(" ");
  await untilTrue("docs expanded", async () => (await readPanel()).collapsed.length === 0);
  await quiet();
  canvas = await readCanvas();
  assert.deepEqual(cardKeys(canvas), cardKeys(referenceCanvas), "expanding restored the reference node set");
  assert.deepEqual(canvas.edges, referenceCanvas.edges, "expanding restored the reference edges");
  assert.deepEqual(canvas.aggregates, referenceCanvas.aggregates);
  const dtoExpanded = await invoke("map_branch_view", { brainId: ALIX, rootId: projetId, collapsedIds: [], after: null });
  assert.deepEqual(dtoExpanded, referenceDto, "same focus, budget and pagination: the same projection, rectangles included");
  const focusAfterExpand = await activeElement();
  assert.equal(focusAfterExpand.testid, "branch-toggle");
  record.collapseExpand = {
    folder: "projet/docs",
    childCountOfFolder: docsDetail.node.childCount,
    hiddenDescendantCountShown: Number(docsCard.hidden),
    hiddenDescendantCountOnDisk: docsDisk.length,
    collapsedWith: "real Enter",
    expandedWith: "real Space",
    cardTag: docsCard.tag,
    outlineDash: docsCard.dash,
    cardsAfterCollapse: afterCollapsePaths.length,
    cardsAfterExpand: canvas.cards.length,
    expandEqualsReferenceProjection: true,
    focusAfterCollapse,
    focusAfterExpand,
  };

  // ===== F42-7 — two independent collapses, in either order.
  await selectNodeByMouse(ALIX, "projet/docs");
  await focusDirectly(testid("branch-toggle"));
  await press("Enter"); // collapse docs
  await untilTrue("docs collapsed again", async () => (await readPanel()).collapsed.length === 1);
  await quiet();
  const onlyDocs = await cardPaths(await readCanvas(), ALIX);
  const srcId = await selectNodeByMouse(ALIX, "projet/src");
  await focusDirectly(testid("branch-toggle"));
  await press(" "); // collapse src with Space
  await untilTrue("src collapsed", async () => (await readPanel()).collapsed.length === 2);
  await quiet();
  canvas = await readCanvas();
  state = await readPanel();
  const bothPaths = await cardPaths(canvas, ALIX);
  const removedByBoth = expectedSubtree.filter((path) => !bothPaths.includes(path)).sort();
  assert.deepEqual(removedByBoth, [...docsDisk, ...srcDisk].sort(), "exactly the descendants of docs and of src left");
  assert.deepEqual(onlyDocs.filter((path) => !bothPaths.includes(path)).sort(), srcDisk.sort(), "collapsing src removed only src's descendants");
  assert.deepEqual(state.collapsed.map((item) => [item.nodeId, item.hidden]).sort(), [[docsId, 14], [srcId, 9]].sort());
  assert(bothPaths.includes("projet/notes.txt") && bothPaths.includes("projet"), "the other nodes of the branch are untouched");
  // Expand docs from the list with Enter: src stays collapsed.
  await focusDirectly(`${testid("branch-collapsed-item")}[data-node-id="${docsId}"] ${testid("branch-expand-one")}`);
  await startFocusTrail();
  await press("Enter");
  await untilTrue("docs expanded from the list", async () => (await readPanel()).collapsed.length === 1);
  await quiet();
  canvas = await readCanvas();
  const afterDocsBack = await cardPaths(canvas, ALIX);
  assert.deepEqual(afterDocsBack, expectedSubtree.filter((path) => !srcDisk.includes(path)), "docs came back, src is still collapsed");
  const listFocus = await activeElement();
  assert(listFocus.tag !== "BODY", `focus fell to body after expanding from the list: ${JSON.stringify(listFocus)}`);
  assert(focusTrailHasNoBody(await readFocusTrail()));
  // And src, with Enter on the toggle (the expansion selected it).
  await untilTrue("src is the selected folder", async () => (await readCanvas()).cards.find((card) => card.selected)?.nodeId === docsId);
  await selectNodeByMouse(ALIX, "projet/src");
  await focusDirectly(testid("branch-toggle"));
  assert.equal((await readPanel()).toggle.startsWith("Déplier src"), true);
  await press("Enter");
  await untilTrue("src expanded", async () => (await readPanel()).collapsed.length === 0);
  await quiet();
  canvas = await readCanvas();
  assert.deepEqual(cardKeys(canvas), cardKeys(referenceCanvas), "both independent collapses undone: the reference again");
  record.independentCollapses = {
    folders: ["projet/docs", "projet/src"],
    hiddenOnDisk: { docs: docsDisk.length, src: srcDisk.length },
    removedByBothEqualsUnionOfDescendants: true,
    srcCollapseLeftDocsAlone: true,
    docsExpandedFromListWithEnter: true,
    focusAfterListExpansion: listFocus,
  };

  // ===== deep collapse: `guide` (two levels below it) and the English labels.
  const guideDisk = descendantsOnDisk(diskAlix, "projet/docs/guide");
  assert.equal(guideDisk.length, 8);
  await selectNodeByMouse(ALIX, "projet/docs/guide");
  await focusDirectly(testid("branch-toggle"));
  await press("Enter");
  await untilTrue("guide collapsed", async () => (await readPanel()).collapsed.some((item) => item.hidden === guideDisk.length));
  await quiet();
  const guideCanvas = await readCanvas();
  assert.deepEqual(await cardPaths(guideCanvas, ALIX), expectedSubtree.filter((path) => !guideDisk.includes(path)));
  await click(testid("language-en"));
  await until("document.documentElement.lang === 'en'");
  const english = await readPanel();
  const englishCanvas = await readCanvas();
  assert.equal(english.exit, "Exit branch focus");
  assert.equal(english.toggle, "Expand guide — 8 hidden descendants");
  assert.match(english.banner, /Focused branch/);
  assert.equal(english.path, "Path: projet");
  assert.match(englishCanvas.cards.find((card) => card.collapsed).tag, /^▸ collapsed · 8 hidden$/);
  const axeCollapsedEn = await axeRun();
  assert.equal(axeCollapsedEn.violations.length, 0, `axe (collapsed, English): ${JSON.stringify(axeCollapsedEn.violations)}`);
  await click(testid("language-fr"));
  await until("document.documentElement.lang === 'fr'");
  await focusDirectly(testid("branch-toggle"));
  await press(" ");
  await untilTrue("guide expanded", async () => (await readPanel()).collapsed.length === 0);
  await quiet();
  assert.deepEqual(cardKeys(await readCanvas()), cardKeys(referenceCanvas));
  record.deepCollapse = { folder: "projet/docs/guide", hiddenOnDisk: guideDisk.length, english: { exit: english.exit, toggle: english.toggle, tag: englishCanvas.cards.find((card) => card.collapsed).tag } };

  // ===== ACTION-0096 / DEC-0050 §L — the focused ROOT collapses like any folder.
  // Enter collapses and Space expands, then the other pair (Space collapses, Enter expands).
  const rootDisk = descendantsOnDisk(diskAlix, "projet");
  assert.equal(rootDisk.length, expectedSubtree.length - 1, "the disk reference: every entry of the branch but the root");
  const rootFingerprintsBefore = await everythingElse();
  const rootWritesBefore = resumeWrites();
  const rootWireMark = wireCalls.length;
  const rootPairs = [];
  for (const [collapseKey, expandKey, label] of [["Enter", " ", "Enter then Space"], [" ", "Enter", "Space then Enter"]]) {
    await selectNodeByMouse(ALIX, "projet");
    await startFocusTrail();
    await focusDirectly(testid("branch-toggle"));
    let rootPanel = await readPanel();
    assert.equal(rootPanel.toggle, "Replier projet", `the root offers Replier: ${rootPanel.toggle}`);
    assert.equal(rootPanel.toggleDisabled, false, "the root toggle is enabled");
    await press(collapseKey);
    await untilTrue("root collapsed", async () => (await readPanel()).collapsed.some((item) => item.nodeId === projetId));
    await quiet();
    canvas = await readCanvas();
    rootPanel = await readPanel();
    const rootCard = canvas.cards.find((card) => card.nodeId === projetId);
    assert.deepEqual(await cardPaths(canvas, ALIX), ["projet"], "the DOM holds the root alone");
    assert.equal(canvas.cards.length, 1);
    assert.equal(canvas.edges.length, 0, "no edge while the root is collapsed");
    assert.equal(canvas.aggregates.length, 0, "no aggregate of the root while it is collapsed");
    assert(rootCard.collapsed && rootCard.branchRoot, "the root is both the focused root and collapsed");
    assert.equal(Number(rootCard.hidden), rootDisk.length, "hidden count equals the independent disk reference");
    assert.equal(rootPanel.collapsed.length, 1);
    assert.equal(rootPanel.collapsed[0].hidden, rootDisk.length);
    assert.equal(rootPanel.toggle, `Déplier projet — ${rootDisk.length} descendants masqués`);
    assert.equal(rootPanel.toggleCollapsed, true);
    assert.equal(canvas.cards.find((card) => card.selected)?.nodeId, projetId, "the selection stays on the root");
    const rootFocus = await activeElement();
    assert.equal(rootFocus.testid, "branch-toggle", `focus after collapsing the root: ${JSON.stringify(rootFocus)}`);
    const dtoRoot = await invoke("map_branch_view", { brainId: ALIX, rootId: projetId, collapsedIds: [projetId], after: null });
    assert.deepEqual(dtoRoot.nodes.map((node) => node.relativePath.replaceAll("\\", "/")), ["projet"], "the DTO holds the root alone");
    assert.equal(dtoRoot.branch.collapsed[0].hiddenDescendantCount, rootDisk.length);
    assert.equal(dtoRoot.aggregates.length, 0);
    assert.equal(dtoRoot.hierarchyEdges.length, 0);
    assert.equal(canvas.cards.length, dtoRoot.nodes.length, "no CSS mask: the DOM equals the collapsed DTO");
    await press(expandKey);
    await untilTrue("root expanded", async () => (await readPanel()).collapsed.length === 0);
    await quiet();
    canvas = await readCanvas();
    assert.deepEqual(cardKeys(canvas), cardKeys(referenceCanvas), "expanding the root restored the reference node set");
    assert.deepEqual(canvas.edges, referenceCanvas.edges);
    assert.deepEqual(canvas.aggregates, referenceCanvas.aggregates);
    assert.deepEqual(await invoke("map_branch_view", { brainId: ALIX, rootId: projetId, collapsedIds: [], after: null }), referenceDto, "expanded root = the reference projection, rectangles included");
    const rootFocusAfter = await activeElement();
    assert.equal(rootFocusAfter.testid, "branch-toggle");
    assert.equal((await readPanel()).toggle, "Replier projet");
    assert(focusTrailHasNoBody(await readFocusTrail()), "the focus never fell to body");
    rootPairs.push({ keys: label, hiddenShown: Number(rootCard.hidden), focusAfterCollapse: rootFocus, focusAfterExpand: rootFocusAfter });
  }
  assert.deepEqual(await everythingElse(), rootFingerprintsBefore, "source, Index, journal, seen, relations moved around the root gestures");
  assert.equal(resumeWrites(), rootWritesBefore, "the root gestures wrote the resume state");
  assert.deepEqual(writesIn(wireSince(rootWireMark)), [], "a write command was sent during the root gestures");
  record.rootCollapse = {
    folder: "projet (the focused root)",
    hiddenOnDisk: rootDisk.length,
    projectionWhileCollapsed: "root alone, no edge, no aggregate",
    pairs: rootPairs,
    expandEqualsReferenceProjection: true,
    sourceIndexJournalSeenRelationsUnchanged: true,
    resumeWrites: 0,
  };

  // ===== F42-3 — exit with a real Enter: composition, camera and selection come back as they were.
  const writesBeforeExit = resumeWrites();
  const focusTrailExit = await startFocusTrail();
  void focusTrailExit;
  await focusDirectly(testid("branch-exit"));
  await press("Enter");
  await untilTrue("branch focus left", async () => !(await readPanel()).active);
  await quiet();
  const exitedCanvas = await readCanvas();
  const afterExit = {
    panel: await readPanel(),
    focus: await activeElement(),
    selected: exitedCanvas.cards.find((card) => card.selected),
  };
  assert.deepEqual(exitedCanvas.brainsDrawn, [ALIX, BEA, GAMMA].sort(), "both territories are back");
  assert.deepEqual(cardKeys(exitedCanvas), cardKeys(before.canvas), "the composition shows exactly the nodes it showed before");
  assert.deepEqual(exitedCanvas.chips, before.canvas.chips, "the same composition chips");
  assert.equal(afterExit.selected?.nodeId, projetId, "the selection is back on `projet`");
  assert.equal(exitedCanvas.world, before.canvas.world, "the camera is exactly the one that was left");
  assert.deepEqual(exitedCanvas.edges, before.canvas.edges);
  assert.equal(afterExit.panel.focusButton, "Focaliser la branche");
  assert.equal(afterExit.focus.testid, "branch-focus", `focus after exiting: ${JSON.stringify(afterExit.focus)}`);
  assert.equal(exitedCanvas.cards.filter((card) => card.collapsed || card.branchRoot).length, 0, "no collapse or focus marker survives the exit");
  assert.equal(resumeWrites(), writesBeforeExit, "exiting wrote the resume state");
  assert.equal(resumeWrites(), before.writes, "the whole focus cycle wrote the resume state");
  assert(same(await resumeStates(), before.resume), "the resume state of both brains is exactly what it was before the first gesture");
  const writesFirstCycle = writesIn(wireSince(before.wire));
  assert.deepEqual(writesFirstCycle, [], `a write command was sent during the gestures: ${writesFirstCycle}`);
  const commandsFirstCycle = [...new Set(wireSince(before.wire))].sort();
  const fingerprintsAfter = await everythingElse();
  assert.deepEqual(fingerprintsAfter, before.fingerprints, "source, Index, journal or relations moved around the gestures");
  record.exit = {
    exitedWith: "real Enter",
    brainsDrawn: exitedCanvas.brainsDrawn,
    sameNodesAsBefore: true,
    sameChips: true,
    sameSelection: afterExit.selected?.nodeId === projetId,
    cameraBefore: before.canvas.world,
    cameraAfter: exitedCanvas.world,
    focusAfterExit: afterExit.focus,
  };
  record.untouched = {
    resumeWritesDuringTheWholeCycle: resumeWrites() - before.writes,
    writeCommandsDuringTheWholeCycle: writesFirstCycle.length,
    commandsSentDuringTheCycle: commandsFirstCycle,
    resumeStateIdentical: true,
    sourceTreesIdentical: true,
    indexRevisionAndDigestIdentical: true,
    journalIdentical: true,
    relationsIdentical: true,
    seenStateIdentical: true,
    fingerprints: fingerprintsAfter,
  };

  // ===== F42-9 — an aggregate is not a collapse, on the wide folder; and Space to focus.
  const archivesId = await selectNodeByMouse(ALIX, "archives");
  // The ordinary selection of `archives` is an ordinary persisted gesture: the window opens after it.
  const second = { writes: resumeWrites(), wire: wireCalls.length, resume: await resumeStates() };
  await focusDirectly(testid("branch-focus"));
  await press(" ");
  await untilTrue("archives focused", async () => (await readPanel()).active);
  await quiet();
  await fit();
  canvas = await readCanvas();
  assert.equal(canvas.aggregates.length > 0, true, "the wide folder overflows the ordinary view: aggregates exist");
  const archivesAggregate = canvas.aggregates.find((aggregate) => aggregate.parentId === archivesId);
  assert(archivesAggregate && /Voir la suite/.test(archivesAggregate.label), `the aggregate says « Voir la suite »: ${JSON.stringify(canvas.aggregates)}`);
  const year2024 = await nodeIdOf(ALIX, "archives/2024");
  assert(canvas.aggregates.some((aggregate) => aggregate.parentId === year2024), "2024 has an aggregate (its children are not all shown)");
  const aggregatesBefore = canvas.aggregates;
  await selectNodeByMouse(ALIX, "archives/2024");
  await focusDirectly(testid("branch-toggle"));
  await press("Enter");
  await untilTrue("2024 collapsed", async () => (await readPanel()).collapsed.length === 1);
  await quiet();
  canvas = await readCanvas();
  state = await readPanel();
  assert.equal(state.collapsed[0].hidden, descendantsOnDisk(diskAlix, "archives/2024").length);
  assert(!canvas.aggregates.some((aggregate) => aggregate.parentId === year2024), "a collapsed folder carries no aggregate");
  assert.deepEqual(canvas.aggregates.filter((aggregate) => aggregate.parentId !== year2024), aggregatesBefore.filter((aggregate) => aggregate.parentId !== year2024), "the other aggregates did not move");
  assert.equal(canvas.cards.find((card) => card.nodeId === year2024).collapsed, true);
  assert(!/Voir la suite/.test(canvas.cards.find((card) => card.nodeId === year2024).label), "a collapsed card never says « Voir la suite »");
  // The aggregate pages (keyboard, Enter on the treeitem); it is not an expansion and not a collapse.
  const collapsedBeforePaging = (await readPanel()).collapsed.map((item) => item.nodeId);
  await evaluate(`document.querySelector('[data-testid="map-aggregate-indicator"][data-parent-id="${archivesId}"]').focus()`);
  await press("Enter");
  await untilTrue("the aggregate paged the branch", async () => (await readCanvas()).cards.some((card) => card.nodeId !== archivesId && !(canvas.cards.some((previous) => previous.nodeId === card.nodeId))));
  await quiet();
  canvas = await readCanvas();
  assert.equal((await readPanel()).active, true, "paging an aggregate keeps the branch focused");
  const pagedPaths = await cardPaths(canvas, ALIX);
  assert(pagedPaths.every((path) => path === "archives" || path.startsWith("archives/")), "still only the subtree");
  assert.equal(collapsedBeforePaging.length, 1);
  record.aggregateVsCollapse = {
    wideFolder: "archives",
    aggregateLabel: archivesAggregate.label,
    collapsedFolderHasNoAggregate: true,
    otherAggregatesUnchanged: true,
    hiddenOfCollapsed2024: state.collapsed[0].hidden,
    aggregateActivatedWithEnter: true,
    stillOnlySubtreeAfterPaging: true,
  };
  // Exit with Space.
  await focusDirectly(testid("branch-exit"));
  await press(" ");
  await untilTrue("archives focus left", async () => !(await readPanel()).active);
  await quiet();
  const exitedAgain = await readCanvas();
  assert.deepEqual(exitedAgain.brainsDrawn, [ALIX, BEA, GAMMA].sort());
  assert.equal((await activeElement()).testid, "branch-focus");
  assert.equal(resumeWrites(), second.writes, "the second cycle wrote the resume state");
  assert.deepEqual(await resumeStates(), second.resume, "the second cycle changed the resume state");
  assert.deepEqual(writesIn(wireSince(second.wire)), [], "a write command was sent during the second cycle");
  assert.deepEqual(await everythingElse(), before.fingerprints, "source, Index, journal or relations moved around the second cycle");
  record.keys = { focus: ["Enter (with a real Tab)", "Space"], collapse: ["Enter", "Space"], expand: ["Space", "Enter"], exit: ["Enter", "Space"], aggregate: ["Enter"] };

  // ===== F42-10 — focus never fell on `body` and axe is clean in the ordinary state too.
  const finalTrail = await readFocusTrail();
  assert(focusTrailHasNoBody(finalTrail), `focus trail visited body: ${JSON.stringify(finalTrail)}`);
  const axeAfter = await axeRun();
  assert.equal(axeAfter.violations.length, 0, `axe (after exit): ${JSON.stringify(axeAfter.violations)}`);
  record.axe = {
    package: axeManifest.version,
    axeMinJsSha256: axeSha256,
    focused: { violations: axeFocused.violations.length, incomplete: axeFocused.incomplete },
    collapsedEnglish: { violations: axeCollapsedEn.violations.length, incomplete: axeCollapsedEn.incomplete },
    afterExit: { violations: axeAfter.violations.length, incomplete: axeAfter.incomplete },
  };
  record.status = { afterExit: await statusLine() };
  record.resumeBefore = before.resume;
  record.sessionOnlyState = { rootNodeId: projetId, wholeBrainNodes };
  return { resumeBefore: before.resume, fingerprints: before.fingerprints };
}

async function phaseTwo() {
  const phase1 = JSON.parse(await readFile(join(proofRoot, "phase1.json"), "utf8"));
  await setUpComposition();
  // F42-12 — after a real restart, none of the F-042 state is back.
  const panel = await readPanel();
  assert(panel.present && !panel.active, "no branch focus is active after the restart");
  assert.equal(panel.collapsed.length, 0, "no collapsed folder after the restart");
  const canvas = await readCanvas();
  assert.equal(canvas.cards.filter((card) => card.collapsed || card.branchRoot).length, 0, "no collapse or focus marker on the map after the restart");
  assert.deepEqual(canvas.brainsDrawn, [ALIX, BEA, GAMMA].sort(), "the composition is the ordinary one, not a focused branch");
  const states = await resumeStates();
  const allowedKeys = ["detailsPanelVisible", "filter", "focusNodeId", "selectedNodeId", "view"];
  for (const brainState of Object.values(states)) {
    assert.deepEqual(Object.keys(brainState).sort(), allowedKeys, "the resume state has no F-042 field");
    assert(!JSON.stringify(brainState).match(/collaps|branch|hidden/i), "the resume state says nothing about a branch or a collapse");
  }
  // The catalogue's resume state is exactly what the ordinary gestures of phase 1 had left: nothing from F-042.
  assert.deepEqual(states.alix.focusNodeId, phase1.carry.resumeBefore.alix.focusNodeId, "the branch focus did not become the persisted focus");
  // The gestures still work from scratch: the state really is fresh.
  const projetId = await nodeIdOf(ALIX, "projet");
  const dto = await invoke("map_branch_view", { brainId: ALIX, rootId: projetId, collapsedIds: [], after: null });
  assert.equal(dto.nodes.length, 27);
  assert.equal(dto.branch.collapsed.length, 0, "no collapse is remembered by the backend");
  const fingerprints = await everythingElse();
  assert.deepEqual(fingerprints.sources, phase1.carry.fingerprints.sources, "the synthetic sources are what they were");
  record.afterRestart = {
    branchFocusActive: false,
    collapsedFolders: 0,
    markersOnMap: 0,
    brainsDrawn: canvas.brainsDrawn,
    resumeStateKeys: allowedKeys,
    resumeStateMentionsBranchOrCollapse: false,
    persistedFocusNodeIdUnchanged: true,
    explicitly: "F-042 state (focused branch, collapsed folders) is session-only in TASK-0052; persistence belongs to the next P-19 slice.",
  };
}

try {
  let carry = null;
  if (phase === 1) carry = await phaseOne();
  else await phaseTwo();
  const browser = await send("Browser.getVersion");
  record.engine = { product: browser.product, protocolVersion: browser.protocolVersion };
  record.fatalConsoleErrors = fatal.length;
  assert.equal(fatal.length, 0, `fatal console errors: ${JSON.stringify(fatal.slice(0, 2))}`);
  if (carry) Object.assign(record, { carry });
  const text = JSON.stringify(record, null, 1);
  assert(!text.includes(seed.rootAlix) && !text.includes(seed.rootBea), "absolute proof path leaked into the artifact");
  await mkdir(proofRoot, { recursive: true });
  await writeFile(join(proofRoot, `phase${phase}.json`), text);
  console.log(`TASK-0052 phase ${phase} PASS`);
  ws.close();
} catch (error) {
  console.error(String(error?.stack ?? error));
  ws.close();
  process.exit(1);
}
