// TASK-0050 — real WebView2 proof of the runtime legend.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
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
  const intraPaths = new Set(intra.established.flatMap((edge) => [edge.source.relativePath, edge.target.relativePath]));
  const crossPaths = crossOverview.established.flatMap((edge) => [edge.source, edge.target])
    .filter((endpoint) => endpoint.brainId === IDS.alpha)
    .map((endpoint) => endpoint.relativePath);
  const selectionPath = crossPaths.find((path) => intraPaths.has(path)) ?? [...intraPaths][0];
  assert(selectionPath, "no rich relation endpoint in Alpha");
  async function selectAlphaPath(path) {
    const search = await invoke("map_search_nodes", { brainId: IDS.alpha, query: path.split("/").at(-1), offset: 0, limit: 50 });
    const hit = search.items.find((item) => item.relativePath === path);
    assert(hit, `relation endpoint not found: ${path}`);
    await click(testid("search-input"));
    await selectAll();
    await typeText(hit.name);
    await until(`!!document.querySelector('[data-testid="search-hit"][data-node-id="${hit.nodeId}"]')`);
    await click(`[data-testid="search-hit"][data-node-id="${hit.nodeId}"]`);
    await until(`document.querySelector('[data-brain-id="${IDS.alpha}"][data-node-id="${hit.nodeId}"]')?.getAttribute('aria-selected') === 'true'`);
    await click(testid("fit-composition"));
    await pause(500);
  }
  const relationStatePaths = [
    selectionPath,
    intra.established[0]?.source.relativePath,
    crossPaths[0],
  ].filter((path, index, paths) => path && paths.indexOf(path) === index);
  const richKeySet = new Set();
  for (const path of relationStatePaths) {
    await selectAlphaPath(path);
    for (const key of await readMapKeys()) richKeySet.add(key);
  }
  await until("document.querySelectorAll('.map-edge').length > 0");
  const mapRichKeys = [...richKeySet].sort();

  // Add the wide real-root brain only after the compact relation state has
  // been observed; its 120 children now exercise the real aggregate without
  // shrinking the relation geometry out of the viewport.
  await addBrain(IDS.wide);
  await click(testid(`composition-chip-${IDS.alpha}`));
  await click(testid("fit-composition"));
  await until("document.querySelectorAll('[data-testid=map-aggregate-indicator]').length > 0");

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
  const mapBefore = [...new Set([...mapRichKeys, ...mapFilterKeys])].sort();
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

  const legendKeys = await evaluate(`Array.from(document.querySelectorAll('[data-legend-key]')).map(e => e.getAttribute('data-legend-key'))`);
  assert.equal(legendKeys.length, 24);
  assert.equal(new Set(legendKeys).size, legendKeys.length);
  assert(mapBefore.every((key) => legendKeys.includes(key)), "a real map key is absent from the legend");

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
        return { className: element.getAttribute('class'), strokeWidth: style.strokeWidth, strokeDasharray: style.strokeDasharray, fillOpacity: style.fillOpacity, fontWeight: style.fontWeight };
      };
      rows[key] = {
        exercisedOnMap: true,
        sharedClasses: shared,
        liveSignatures: [live, ...live.querySelectorAll('rect,path,line,circle,text')].filter(e => [...e.classList].some(c => shared.includes(c))).map(signature),
        legendSignatures: [...item.querySelectorAll('rect,path,line,circle,text')].filter(e => [...e.classList].some(c => shared.includes(c))).map(signature),
      };
    }
    return rows;
  })()`);
  for (const [key, row] of Object.entries(sharing)) {
    if (row.exercisedOnMap) assert(row.sharedClasses.length > 0, `${key} uses no live map class`);
  }

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
      richMapSemanticKeys: mapRichKeys,
      filteredMapSemanticKeys: mapFilterKeys,
      legendSemanticKeys: legendKeys,
      mapKeysCovered: mapBefore.every((key) => legendKeys.includes(key)),
      diagnosticAndSkippedExplainedByLegend: legendKeys.includes("node-diagnostic") && legendKeys.includes("node-skipped"),
    },
    locale: { french, english },
    sharedVisualLanguage: sharing,
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
  process.exit(1);
}
