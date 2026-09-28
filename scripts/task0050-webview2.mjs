// TASK-0050 — real WebView2 proof of the runtime legend.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { setTimeout as pause } from "node:timers/promises";

const port = Number(process.argv[2]);
const variant = process.argv[3];
const artifactPath = process.argv[4];
assert(/^task0050-[a-f0-9]+$/.test(variant));
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
const IDS = {
  alpha: "brain-alpha",
  gamma: "brain-gamma",
  realA: seed.realA,
  wide: seed.realB,
};
const roots = [
  seed.rootAlix,
  seed.rootBasile,
  join(".filetopo-sandbox", "variants", variant, "fixtures", "quasi-empty"),
];

// `node-skipped` materialises from a real NTFS directory junction
// (`fs.symlink(..., "junction")` — no admin rights needed on Windows), never
// from an injected DOM node. `src-tauri/src/scanner.rs` marks any reparse
// point `Skipped` and never follows it, so the junction target's contents
// are irrelevant; it only needs to exist. Named to sort first so the bounded
// view keeps it inside the visible window ahead of the wide brain's
// aggregate cutoff. Confined to the disposable sandbox and removed below.
const skipJunctionTarget = resolve(seed.rootAlix, "docs");
const skipJunctionPath = join(seed.rootBasile, "wide", "0-skip-link");
await symlink(skipJunctionTarget, skipJunctionPath, "junction");

const axeManifest = JSON.parse(await readFile("node_modules/axe-core/package.json", "utf8"));
assert.equal(axeManifest.version, "4.13.0");
const axeSource = await readFile("node_modules/axe-core/axe.min.js", "utf8");
const axeSha256 = createHash("sha256").update(axeSource).digest("hex");

let target;
for (let attempt = 0; attempt < 200; attempt += 1) {
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
    const match = /\/(map_[a-z_]+)(?:[?#].*)?$/.exec(event.params.request.url);
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
  const answer = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (answer.exceptionDetails) {
    throw new Error(answer.exceptionDetails.exception?.description ?? JSON.stringify(answer.exceptionDetails));
  }
  return answer.result.value;
}
async function until(expression, limit = 120000) {
  const started = Date.now();
  while (Date.now() - started < limit) {
    if (await evaluate(expression)) return;
    await pause(120);
  }
  throw new Error(`timeout: ${expression}`);
}
async function untilTrue(label, predicate, limit = 120000) {
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
await send("Network.enable", {
  maxTotalBufferSize: 64 * 1024 * 1024,
  maxResourceBufferSize: 16 * 1024 * 1024,
});

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
  assert(box && box.w > 0 && box.h > 0 && box.hit, `not clickable: ${selector}`);
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: box.x, y: box.y });
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: box.x, y: box.y, button: "left", buttons: 1, clickCount: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: box.x, y: box.y, button: "left", buttons: 0, clickCount: 1 });
  await pause(180);
}
async function clickLabelFor(testId) {
  // Filter preparation is scaffolding, not one of the legend gestures under
  // proof. The compact checkbox can be below the map column's clipped viewport,
  // so activate its native label in-page and reserve real CDP input for the
  // legend, language and traversal steps judged below.
  const activated = await evaluate(`(() => {
    const input = document.querySelector(${JSON.stringify(testid(testId))});
    const label = input?.closest('label');
    if (!label) return false;
    label.click();
    return true;
  })()`);
  assert(activated, `filter label missing: ${testId}`);
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
  await pause(160);
}
async function selectAll() {
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "a", code: "KeyA", modifiers: 2, windowsVirtualKeyCode: 65, nativeVirtualKeyCode: 65, commands: ["selectAll"] });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "a", code: "KeyA", modifiers: 2, windowsVirtualKeyCode: 65, nativeVirtualKeyCode: 65 });
}
async function typeText(text) {
  for (const character of text) {
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: character, text: character, unmodifiedText: character });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: character });
  }
  await pause(200);
}
async function addBrain(brainId) {
  if (await evaluate(`!!document.querySelector(${JSON.stringify(testid(`composition-chip-${brainId}`))})`)) return;
  await click(testid("composition-add-trigger"));
  await until(`!!document.querySelector(${JSON.stringify(testid(`composition-add-item-${brainId}`))})`);
  await click(testid(`composition-add-item-${brainId}`));
  await until(`!!document.querySelector(${JSON.stringify(testid(`composition-chip-${brainId}`))})`);
}

async function hashTree(root) {
  const lines = [];
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const path = join(directory, entry.name);
      const rel = relative(root, path).replaceAll("\\", "/");
      if (entry.isSymbolicLink()) {
        // A reparse point (the `node-skipped` NTFS junction): the scanner
        // never follows it either (`scanner.rs`), so the hash only records
        // that the link itself is still there, never its target's contents.
        lines.push(`J:${rel}`);
      } else if (entry.isDirectory()) {
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
async function stateSnapshot() {
  const state = {};
  for (const [name, brainId] of Object.entries(IDS)) {
    const opened = await invoke("map_open", { brainId });
    const snapshot = await invoke("map_snapshot", { brainId });
    const journal = await invoke("map_change_journal", { brainId, natures: [], after: null, limit: 100 });
    const resume = await invoke("map_brain_resume_state", { brainId });
    state[name] = {
      indexId: opened.indexId,
      revision: opened.revision,
      indexDigest: createHash("sha256").update(JSON.stringify(snapshot)).digest("hex"),
      journalDigest: createHash("sha256").update(JSON.stringify(journal)).digest("hex"),
      resume,
    };
  }
  const source = {};
  for (const [index, root] of roots.entries()) source[`root${index + 1}`] = await hashTree(root);
  return { state, source };
}
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
async function quiet(milliseconds = 1200, limit = 60000) {
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

const readMapKeys = () => evaluate(`(() => {
  const keys = new Set();
  for (const element of document.querySelectorAll('.map-view [data-legend-keys]')) {
    for (const key of (element.getAttribute('data-legend-keys') || '').split(/\\s+/)) if (key) keys.add(key);
  }
  return [...keys].sort();
})()`);

async function axeRun() {
  if (!(await evaluate("typeof window.axe === 'object'"))) await evaluate(axeSource);
  return evaluate(`(async () => {
    const result = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa'] } });
    return {
      violations: result.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, html: n.html.slice(0, 180) })) })),
      incomplete: result.incomplete.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, html: n.html.slice(0, 180) })) })),
      passes: result.passes.length,
    };
  })()`);
}

try {
  await until("!!window.__TAURI_INTERNALS__");
  await until(`!!document.querySelector(${JSON.stringify(testid("map-legend-toggle"))})`);

  // Setup is outside the passive legend window. It creates only disposable synthetic data.
  for (const brainId of [IDS.alpha, IDS.gamma]) {
    await invoke("map_prepare_synthetic_source", { brainId });
    await invoke("map_rebuild", { brainId });
  }
  await invoke("map_refresh", { brainId: IDS.realA });
  await invoke("map_refresh", { brainId: IDS.wide });
  const intraBefore = await invoke("map_relations_open", { brainId: IDS.alpha });
  if (intraBefore.pendingSuggestions.length > 0) {
    await invoke("map_relations_approve", { brainId: IDS.alpha, suggestionKey: intraBefore.pendingSuggestions[0].suggestionKey });
  }
  const crossBefore = await invoke("map_cross_relations_open");
  if (crossBefore.pendingSuggestions.length > 0) {
    await invoke("map_cross_relations_approve", { suggestionKey: crossBefore.pendingSuggestions[0].suggestionKey });
  }

  // The active real-root brain was unbuilt when MapApp first mounted. Its
  // Index now exists, but the UI must still perform its normal Open gesture so
  // subsequent composition changes start from a loaded state.
  await click(testid("lifecycle-open"));
  await until("document.querySelectorAll('[data-testid=composed-canvas] [data-node-id]').length > 0");
  await addBrain(IDS.alpha);
  await addBrain(IDS.gamma);
  await click(testid(`composition-remove-${IDS.realA}`));
  await until(`!document.querySelector(${JSON.stringify(testid(`composition-chip-${IDS.realA}`))})`);
  await click(testid(`composition-chip-${IDS.alpha}`));
  await click(testid("fit-composition"));
  await until("document.querySelectorAll('[data-testid=composed-canvas] [data-node-id]').length > 0");

  const intra = await invoke("map_relations_open", { brainId: IDS.alpha });
  const crossOverview = await invoke("map_cross_relations_open");

  // A relation only draws once **both** its endpoints are materialised in
  // the bounded view. Searching for a node *jumps* the view to just that
  // node's own ancestor chain, dropping whatever else was visible — so
  // instead, page every real `DEC-0034` aggregate pill open first (additive,
  // never a jump), then click the already-rendered blocks directly, exactly
  // as the earlier manual pass found: "select an already-rendered block
  // without changing the focus".
  // Expanded across the WHOLE composed canvas in one pass, never scoped to
  // one brain's "active" chip: switching the active chip resets that other
  // brain's own aggregate pagination (observed empirically), so Alpha and
  // Gamma are paged open together, without ever touching a composition chip.
  // A plain mouse click on the pill is silently swallowed: the SVG canvas's
  // own `onPointerDown` (pan/drag) sits above it and captures the pointer
  // first, since — unlike a node block — the aggregate has no
  // `stopPropagation` of its own. Its real, working activation is keyboard:
  // focus the treeitem (`tabIndex=0`) and press Enter, exactly what its own
  // `onKeyDown` handles. The composed view is also a small sliding window:
  // paging one parent's aggregate can evict nodes revealed elsewhere. So
  // reveal is always scoped to the ONE parent aggregate a target needs, and
  // stops the moment that target appears — never a blanket "expand everything".
  async function findNodeId(brainId, relativePath) {
    if (relativePath === "") {
      return evaluate(`document.querySelector('[data-brain-id="${brainId}"][data-node-kind="root"]')?.getAttribute('data-node-id') ?? null`);
    }
    const name = relativePath.split("/").at(-1);
    const search = await invoke("map_search_nodes", { brainId, query: name, offset: 0, limit: 50 });
    const hit = search.items.find((item) => item.relativePath === relativePath);
    return hit ? String(hit.nodeId) : null;
  }
  async function revealOneLevel(brainId, parentId, targetNodeId, rounds = 12) {
    const targetSel = `[data-brain-id="${brainId}"][data-node-id="${targetNodeId}"]`;
    const indicator = `[data-brain-id="${brainId}"] [data-testid="map-aggregate-indicator"][data-parent-id="${parentId}"]`;
    for (let round = 0; round < rounds; round += 1) {
      if (!(await evaluate(`!!document.querySelector(${JSON.stringify(indicator)})`))) break;
      await evaluate(`document.querySelector(${JSON.stringify(indicator)})?.focus()`);
      await press("Enter");
      await pause(200);
      if (await evaluate(`!!document.querySelector(${JSON.stringify(targetSel)})`)) break;
    }
    await click(testid("fit-composition"));
    await pause(300);
  }
  // Nested folders: a file two levels down needs its GRANDPARENT expanded
  // before the parent even has an aggregate pill to page — so every
  // ancestor is revealed in order, shallow to deep, each via its own real
  // parent's aggregate, before the leaf itself.
  async function revealNode(brainId, relativePath, nodeId) {
    const segments = relativePath.split("/");
    let path = "";
    for (const segment of segments) {
      const parentPath = path;
      path = path ? `${path}/${segment}` : segment;
      const levelId = path === relativePath ? String(nodeId) : await findNodeId(brainId, path);
      assert(levelId, `node not found: ${brainId}/${path}`);
      const sel = `[data-brain-id="${brainId}"][data-node-id="${levelId}"]`;
      if (await evaluate(`!!document.querySelector(${JSON.stringify(sel)})`)) continue;
      const parentId = await findNodeId(brainId, parentPath);
      assert(parentId, `parent directory of ${brainId}/${path} not found`);
      await revealOneLevel(brainId, parentId, levelId);
      assert(
        await evaluate(`!!document.querySelector(${JSON.stringify(sel)})`),
        `${brainId}/${path} never materialised via its parent's real aggregate`,
      );
    }
  }
  async function clickNode(brainId, nodeId) {
    const selector = `[data-brain-id="${brainId}"][data-node-id="${nodeId}"]`;
    if (!(await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`))) {
      await pause(300);
      await click(testid("fit-composition"));
      await pause(300);
    }
    assert(await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`), `node ${brainId}/${nodeId} not visible after expansion`);
    await click(selector);
    await pause(250);
  }
  const alphaSideOf = (edge) => (edge.source.brainId === IDS.alpha ? edge.source : edge.target);
  const otherSideOf = (edge) => (edge.source.brainId === IDS.alpha ? edge.target : edge.source);
  const composedCrossEdges = (edges) =>
    edges.filter(
      (edge) =>
        (edge.source.brainId === IDS.alpha && edge.target.brainId === IDS.gamma) ||
        (edge.source.brainId === IDS.gamma && edge.target.brainId === IDS.alpha),
    );

  const detIntra = intra.established.find((edge) => edge.provenance !== "APPROVED");
  const apprIntra = intra.established.find((edge) => edge.provenance === "APPROVED");
  const sugIntra = intra.pendingSuggestions[0];
  const composedCrossEstablished = composedCrossEdges(crossOverview.established);
  const detCross = composedCrossEstablished.find((edge) => edge.provenance !== "APPROVED");
  const apprCross = composedCrossEstablished.find((edge) => edge.provenance === "APPROVED");
  const sugCross = composedCrossEdges(
    crossOverview.pendingSuggestions.map((suggestion) => ({ ...suggestion, provenance: null })),
  )[0];
  assert(detIntra && apprIntra && sugIntra, "Alpha fixture lacks a deterministic/approved/pending intra relation");
  assert(detCross && apprCross && sugCross, "Alpha↔Gamma fixture lacks a deterministic/approved/pending cross relation");

  const richKeySet = new Set();
  for (const edge of [detIntra, apprIntra, sugIntra]) {
    await revealNode(IDS.alpha, edge.target.relativePath, edge.target.nodeId);
    await revealNode(IDS.alpha, edge.source.relativePath, edge.source.nodeId);
    await clickNode(IDS.alpha, edge.source.nodeId);
    for (const key of await readMapKeys()) richKeySet.add(key);
  }
  for (const edge of [detCross, apprCross, sugCross]) {
    const other = otherSideOf(edge);
    const alphaSide = alphaSideOf(edge);
    await revealNode(other.brainId, other.relativePath, other.nodeId);
    await revealNode(alphaSide.brainId, alphaSide.relativePath, alphaSide.nodeId);
    await clickNode(alphaSide.brainId, alphaSide.nodeId);
    for (const key of await readMapKeys()) richKeySet.add(key);
  }

  const mapRichKeys = [...richKeySet].sort();

  // Add the wide real-root brain only after the compact relation state has
  // been observed; its 120 children now exercise the real aggregate without
  // shrinking the relation geometry out of the viewport.
  await addBrain(IDS.wide);
  await click(testid(`composition-chip-${IDS.alpha}`));
  await click(testid("fit-composition"));
  await until("document.querySelectorAll('[data-testid=map-aggregate-indicator]').length > 0");

  // `node-skipped`: select the real NTFS junction the wide brain's Index
  // scanned as `Skipped`, by a real search + click, never by injecting a DOM
  // node. This is a real product gesture, exactly like the relation
  // selections above.
  await click(testid(`composition-chip-${IDS.wide}`));
  const skipSearch = await invoke("map_search_nodes", { brainId: IDS.wide, query: "0-skip-link", offset: 0, limit: 50 });
  const skipHit = skipSearch.items.find((item) => item.name === "0-skip-link");
  assert(skipHit, "skipped junction node not found in the wide brain's real Index");
  assert.equal(skipHit.kind, "skipped", "the NTFS junction did not scan as Skipped");
  await click(testid("search-input"));
  await selectAll();
  await typeText(skipHit.name);
  await until(`!!document.querySelector('[data-testid="search-hit"][data-node-id="${skipHit.nodeId}"]')`);
  await click(`[data-testid="search-hit"][data-node-id="${skipHit.nodeId}"]`);
  await until(`document.querySelector('[data-brain-id="${IDS.wide}"][data-node-id="${skipHit.nodeId}"]')?.getAttribute('aria-selected') === 'true'`);
  await click(testid("fit-composition"));
  await pause(500);
  for (const key of await readMapKeys()) richKeySet.add(key);
  assert(richKeySet.has("node-skipped"), "node-skipped not materialised by the real NTFS junction");
  await click(testid(`composition-chip-${IDS.alpha}`));

  // Files are matches; their ancestors remain visible as context.
  for (const kind of ["DIRECTORY", "SKIPPED"]) {
    await clickLabelFor(`filter-kind-${kind}`);
  }
  await until("!!document.querySelector('[data-legend-keys~=" + JSON.stringify("filter-match") + "]')");
  await until("!!document.querySelector('[data-legend-keys~=" + JSON.stringify("filter-context") + "]')");
  await click(testid("fit-composition"));
  await pause(800);
  await quiet();

  const mapFilterKeys = await readMapKeys();
  const mapRichKeysFinal = [...richKeySet].sort();
  const mapBefore = [...new Set([...mapRichKeysFinal, ...mapFilterKeys])].sort();
  const before = await stateSnapshot();
  await quiet();
  const wireStart = wireCalls.length;

  // Closed axe cell.
  const axeClosed = await axeRun();
  assert.equal(axeClosed.violations.length, 0, "axe violation with legend closed");

  // Real keyboard activation: focus by a real click, close/open with Space and Enter.
  await click(testid("map-legend-toggle"));
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(testid("map-legend-toggle"))}).getAttribute('aria-expanded')`), "true");
  await until(`!!document.querySelector(${JSON.stringify(testid("map-legend"))})`);
  const french = await evaluate(`({ title: document.querySelector('#map-runtime-legend-title')?.textContent, root: document.querySelector('[data-legend-key="node-root"]')?.textContent })`);
  assert.equal(french.title, "Légende de la carte");
  assert.match(french.root, /Racine du cerveau/);

  // §3 — coverage read from the real render, no hand-copied second list.
  // `node-diagnostic` is the sole declared exception (DEC-0048 §K /
  // ACTION-0087): it stays a mandatory legend/contract key but is not
  // reachable in a real WebView2 published Index while
  // `commands.rs:745-749` refuses any scan whose diagnostics are non-empty.
  const legendKeys = (await evaluate(`Array.from(document.querySelectorAll('[data-legend-key]')).map(e => e.getAttribute('data-legend-key'))`)).slice().sort();
  assert.equal(legendKeys.length, 24, `expected the closed 24-key contract, got ${legendKeys.length}`);
  assert.equal(new Set(legendKeys).size, legendKeys.length, "duplicate legend key");
  const DIAGNOSTIC_EXCEPTION = "node-diagnostic";
  assert(legendKeys.includes(DIAGNOSTIC_EXCEPTION), "node-diagnostic missing from the legend contract");
  const expectedReachable = legendKeys.filter((key) => key !== DIAGNOSTIC_EXCEPTION).sort();
  assert.equal(expectedReachable.length, 23, `expected 23 reachable keys, got ${expectedReachable.length}`);
  assert(
    !mapBefore.includes(DIAGNOSTIC_EXCEPTION),
    "node-diagnostic was observed on the real map; the exception is no longer valid and the backend invariant must be re-checked before this assertion is loosened",
  );
  assert.deepEqual(
    mapBefore,
    expectedReachable,
    `observed real map keys != expectedReachable (legendKeys - node-diagnostic).\nobserved: ${JSON.stringify(mapBefore)}\nexpected: ${JSON.stringify(expectedReachable)}`,
  );

  // §5 — computed signatures, actually asserted equal, not merely recorded.
  // Meaningful families compared per element family; a value drift fails.
  const SIGNATURE_PROPERTIES = ["strokeWidth", "strokeDasharray", "fillOpacity", "fontWeight", "opacity"];
  const sharing = await evaluate(`(() => {
    const rows = {};
    for (const key of ${JSON.stringify(legendKeys)}) {
      const live = document.querySelector('.map-view [data-legend-keys~="' + CSS.escape(key) + '"]');
      const item = document.querySelector('[data-legend-key="' + CSS.escape(key) + '"]');
      if (!live || !item) { rows[key] = { exercisedOnMap: false }; continue; }
      const liveClasses = new Set([live, ...live.querySelectorAll('*')].flatMap(e => [...e.classList]));
      const sampleClasses = new Set([...item.querySelectorAll('.map-runtime-legend__sample *')].flatMap(e => [...e.classList]));
      const shared = [...liveClasses].filter(name => sampleClasses.has(name) && /^map-/.test(name));
      const signature = element => {
        const style = getComputedStyle(element);
        return {
          className: element.getAttribute('class'),
          strokeWidth: style.strokeWidth,
          strokeDasharray: style.strokeDasharray,
          fillOpacity: style.fillOpacity,
          fontWeight: style.fontWeight,
          opacity: style.opacity,
        };
      };
      const bySharedClass = (elements) => {
        const map = {};
        for (const element of elements) {
          const classes = [...element.classList].filter((name) => shared.includes(name));
          if (classes.length === 0) continue;
          const key2 = classes.sort().join(' ');
          map[key2] ??= signature(element);
        }
        return map;
      };
      rows[key] = {
        exercisedOnMap: true,
        sharedClasses: shared,
        liveByClass: bySharedClass([live, ...live.querySelectorAll('rect,path,line,circle,text')]),
        legendByClass: bySharedClass([...item.querySelectorAll('rect,path,line,circle,text')]),
      };
    }
    return rows;
  })()`);
  for (const [key, row] of Object.entries(sharing)) {
    const isDiagnostic = key === DIAGNOSTIC_EXCEPTION;
    if (!isDiagnostic) {
      assert(row.exercisedOnMap, `${key} was not exercised on the real map (must be one of the 23 reachable keys)`);
    }
    if (!row.exercisedOnMap) continue;
    assert(row.sharedClasses.length > 0, `${key} uses no live map class shared with its legend sample`);
    const liveClassKeys = Object.keys(row.liveByClass);
    const legendClassKeys = Object.keys(row.legendByClass);
    const common = liveClassKeys.filter((name) => legendClassKeys.includes(name));
    assert(common.length > 0, `${key} has no shared-class element present on both the map and the legend sample`);
    for (const classKey of common) {
      const live = row.liveByClass[classKey];
      const legend = row.legendByClass[classKey];
      for (const property of SIGNATURE_PROPERTIES) {
        assert.equal(
          live[property],
          legend[property],
          `${key} (.${classKey}): computed ${property} diverges between map (${live[property]}) and legend (${legend[property]})`,
        );
      }
    }
  }

  // §4 — node-diagnostic: not simulated in the real WebView2 window. Proved
  // instead by the deterministic MapView render test plus the backend
  // invariant that forbids publishing a diagnostic-bearing Index.
  const deterministicRun = spawnSync(
    process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    ["vitest", "run", "src/map/mapLegend.test.tsx"],
    { encoding: "utf8" },
  );
  const deterministicCoverage = deterministicRun.status === 0 ? "PASS" : "FAIL";
  assert.equal(
    deterministicCoverage,
    "PASS",
    `node-diagnostic deterministic MapView coverage failed:\n${deterministicRun.stdout}\n${deterministicRun.stderr}`,
  );
  const diagnosticInvariant = await readFile("src-tauri/src/map/commands.rs", "utf8");
  const invariantLines = diagnosticInvariant.split(/\r?\n/).slice(744, 749).join("\n");
  assert.match(
    invariantLines,
    /scan\.diagnostics\.is_empty\(\)/,
    "backend invariant at commands.rs:745-749 no longer matches; the node-diagnostic exception must be re-derived",
  );
  const nodeDiagnosticProof = {
    key: DIAGNOSTIC_EXCEPTION,
    realWebViewStatus: "NOT_APPLICABLE_WHILE_SCAN_DIAGNOSTICS_ARE_REJECTED",
    backendInvariant: "src-tauri/src/map/commands.rs:745-749",
    deterministicCoverage,
  };

  const axeOpen = await axeRun();
  assert.equal(axeOpen.violations.length, 0, "axe violation with legend open");
  assert.equal(axeOpen.incomplete.length, axeClosed.incomplete.length, "legend added an axe incomplete finding");

  await click(testid("language-en"));
  await until("document.documentElement.lang === 'en'");
  const english = await evaluate(`({ title: document.querySelector('#map-runtime-legend-title')?.textContent, root: document.querySelector('[data-legend-key="node-root"]')?.textContent })`);
  assert.equal(english.title, "Map legend");
  assert.match(english.root, /Brain root/);

  // A bounded Tab walk leaves the toggle and never enters a focus trap.
  await click(testid("map-legend-toggle")); // closes
  await press("Enter"); // same focused button reopens
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(testid("map-legend-toggle"))}).getAttribute('aria-expanded')`), "true");
  const tabStops = [];
  for (let index = 0; index < 18; index += 1) {
    await press("Tab");
    tabStops.push(await evaluate(`(() => { const e = document.activeElement; return { tag: e?.tagName, testid: e?.getAttribute('data-testid'), insideLegend: !!e?.closest('[data-testid=map-legend]') }; })()`));
  }
  assert(tabStops.some((stop) => stop.testid !== "map-legend-toggle"), "Tab stayed on the legend toggle");
  assert(tabStops.every((stop) => !stop.insideLegend), "a decorative legend sample entered the tab order");
  await click(testid("map-legend-toggle")); // click may close or open depending where focus ended; normalize next
  if ((await evaluate(`document.querySelector(${JSON.stringify(testid("map-legend-toggle"))}).getAttribute('aria-expanded')`)) !== "false") {
    await click(testid("map-legend-toggle"));
  }
  await press(" ");
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(testid("map-legend-toggle"))}).getAttribute('aria-expanded')`), "true");

  await quiet();
  const after = await stateSnapshot();
  const legendCommands = wireCalls.slice(wireStart);
  // Snapshot reads themselves are removed from the passive command list.
  const readOnlySnapshotCommands = new Set(["map_open", "map_snapshot", "map_change_journal", "map_brain_resume_state"]);
  const causedCommands = legendCommands.filter((command) => !readOnlySnapshotCommands.has(command));
  assert.deepEqual(causedCommands, [], `legend gestures caused backend commands: ${causedCommands.join(", ")}`);
  assert(same(before, after), "source / Index / journal / resume changed around legend gestures");
  assert.equal(fatal.length, 0, "fatal console errors");

  const browser = await send("Browser.getVersion");
  const result = {
    task: "TASK-0050",
    engine: { product: browser.product, userAgent: browser.userAgent, protocolVersion: browser.protocolVersion },
    axe: { package: axeManifest.version, injectedVersion: await evaluate("axe.version"), axeMinJsSha256: axeSha256, closed: axeClosed, open: axeOpen },
    scenario: {
      brains: 3,
      establishedIntra: intra.established.length,
      pendingIntra: intra.pendingSuggestions.length,
      establishedInter: crossOverview.established.length,
      pendingInter: crossOverview.pendingSuggestions.length,
      aggregateCount: await evaluate("document.querySelectorAll('[data-testid=map-aggregate-indicator]').length"),
      mapSemanticKeys: mapBefore,
      richMapSemanticKeys: mapRichKeysFinal,
      filteredMapSemanticKeys: mapFilterKeys,
      legendSemanticKeys: legendKeys,
      legendKeyCount: legendKeys.length,
      expectedReachableCount: expectedReachable.length,
      observedReachableCount: mapBefore.length,
      exemptKeys: [DIAGNOSTIC_EXCEPTION],
      mapKeysCovered: mapBefore.every((key) => legendKeys.includes(key)),
      reachableKeysExactMatch: same(mapBefore, expectedReachable),
      diagnosticAndSkippedExplainedByLegend: legendKeys.includes("node-diagnostic") && legendKeys.includes("node-skipped"),
    },
    locale: { french, english },
    sharedVisualLanguage: sharing,
    nodeDiagnosticProof,
    keyboard: { openedWithEnter: true, reopenedWithSpace: true, tabStops, noTrap: true },
    passiveWindow: {
      backendCommandsCausedByLegendGestures: causedCommands,
      sourceIndexJournalResumeUnchanged: true,
      before,
      after,
    },
    sessionOnly: { closeAndReopenSameSession: true, restartPersistence: "NON TESTED — remains P-19" },
    fatalConsoleErrors: fatal.length,
  };
  const text = JSON.stringify(result, null, 1);
  assert(!text.includes(seed.rootAlix) && !text.includes(seed.rootBasile), "absolute proof path leaked into artifact");
  await mkdir(join(artifactPath, ".."), { recursive: true });
  await writeFile(artifactPath, text);
  console.log(`TASK-0050 WebView2 PASS: ${mapBefore.length} map keys / ${legendKeys.length} legend keys`);
  ws.close();
} catch (error) {
  console.error(String(error?.stack ?? error));
  ws.close();
  await rm(skipJunctionPath, { force: true }).catch(() => {});
  process.exit(1);
} finally {
  // The junction is a link, not a copy: removing it must never delete the
  // real directory it points at. `force` tolerates a run that failed before
  // creating it or one already cleaned up.
  await rm(skipJunctionPath, { force: true }).catch(() => {});
}
