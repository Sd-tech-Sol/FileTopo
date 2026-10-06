// TASK-0051 — real WebView2 proof of the revocation of APPROVED relations
// (DEC-0049 / P-04). Two real processes: phase 1 exercises the gestures,
// phase 2 runs after a real restart.
//
//   node scripts/task0051-webview2.mjs <port> <variant> <phase> <proofRoot> <head>
//
// The revocation and the approvals judged below are performed with REAL key
// events dispatched through the browser's input pipeline (CDP
// `Input.dispatchKeyEvent`): Tab to reach the control, Enter or Space to
// activate it. Scaffolding (preparing synthetic sources, the FILE-only filter,
// reading the backend as an oracle) is done in-page and is named as such.
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
assert(/^task0051-[a-f0-9]+$/.test(variant));
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
const IDS = { alpha: "brain-alpha", gamma: "brain-gamma", real: seed.realA };
const syntheticFixtures = join(".filetopo-sandbox", "variants", variant, "fixtures");
const sourceRoots = [seed.rootAlix, syntheticFixtures];

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
// A refused command comes back as a rejected promise; the harness wants the
// refusal as a value so a falsification can assert its exact motif.
const invokeRefusal = (command, args = {}) =>
  evaluate(`window.__TAURI_INTERNALS__.invoke(${JSON.stringify(command)},${JSON.stringify(args)}).then(
    () => ({ refused: false }), (error) => ({ refused: true, message: String(error) }))`);
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
  assert(box && box.w > 0 && box.h > 0 && box.hit, `not clickable: ${selector}`);
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
  await pause(160);
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

/* --- source / index fingerprints -------------------------------------------- */

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
// The Index and the sources, as the product itself reports them.
async function sourceAndIndexFingerprint() {
  const indexes = {};
  for (const brainId of [IDS.alpha, IDS.gamma]) {
    const opened = await invoke("map_open", { brainId });
    const snapshot = await invoke("map_snapshot", { brainId });
    indexes[brainId] = { indexId: opened.indexId, revision: opened.revision, digest: sha(snapshot) };
  }
  const sources = {};
  for (const [index, root] of sourceRoots.entries()) sources[`root${index + 1}`] = await hashTree(root);
  return { indexes, sources };
}

/* --- the relations, as the backend reports them (the oracle) ----------------- */

// An overview without row ids: opening a legacy brain replays its derivation,
// which hands the same relations fresh ids.
function shapeIntra(overview) {
  return {
    counts: [overview.deterministicCount, overview.approvedCount, overview.pendingSuggestionCount],
    established: overview.established
      .map((edge) => `${edge.provenance}|${edge.source.key}>${edge.target.key}|${edge.relationType}|${edge.suggestionKey ?? ""}`)
      .sort(),
    pending: overview.pendingSuggestions.map((suggestion) => `${suggestion.suggestionKey}:${suggestion.state}`).sort(),
  };
}
function shapeCross(overview) {
  return {
    counts: [overview.deterministicCount, overview.approvedCount, overview.pendingSuggestionCount],
    established: overview.established
      .map((edge) => `${edge.provenance}|${edge.source.key}>${edge.target.key}|${edge.relationType}|${edge.suggestionKey ?? ""}`)
      .sort(),
    pending: overview.pendingSuggestions.map((suggestion) => `${suggestion.suggestionKey}:${suggestion.state}`).sort(),
  };
}
const intraOverview = (brainId) => invoke("map_relations_open", { brainId });
const crossOverview = () => invoke("map_cross_relations_open");
async function allStores() {
  return {
    alpha: shapeIntra(await intraOverview(IDS.alpha)),
    gamma: shapeIntra(await intraOverview(IDS.gamma)),
    common: shapeCross(await crossOverview()),
  };
}
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

/* --- what the panels and the map show ---------------------------------------- */

const readIntraPanel = () =>
  evaluate(`(() => {
    const totals = document.querySelector('[data-testid="relation-totals"]')?.textContent ?? null;
    return {
      totals,
      revoke: [...document.querySelectorAll('[data-relation-revoke]')].map((b) => ({
        key: b.getAttribute('data-suggestion-key'), text: b.textContent, busy: b.getAttribute('aria-busy'), disabled: b.disabled,
        direction: b.getAttribute('data-direction'),
      })),
      approve: [...document.querySelectorAll('[data-testid="approve-core-suggestion"]')].map((b) => b.getAttribute('data-suggestion-key')),
      entries: [...document.querySelectorAll('.relations__direction .relation__link')].map((b) => ({
        direction: b.getAttribute('data-direction'), provenance: b.getAttribute('data-provenance'), key: b.getAttribute('data-endpoint-key'),
        type: b.getAttribute('data-relation-type'),
      })),
      suggestions: [...document.querySelectorAll('.relations__suggestions li.suggestion')].map((li) => li.getAttribute('data-suggestion-key')),
    };
  })()`);
const readCrossPanel = () =>
  evaluate(`(() => ({
    totals: document.querySelector('[data-testid="cross-relation-totals"]')?.textContent ?? null,
    revoke: [...document.querySelectorAll('[data-cross-revoke]')].map((b) => ({
      key: b.getAttribute('data-cross-revoke'), text: b.textContent, label: b.getAttribute('aria-label'),
      busy: b.getAttribute('aria-busy'), disabled: b.disabled, direction: b.getAttribute('data-direction'),
    })),
    approve: [...document.querySelectorAll('[data-cross-approve]')].map((b) => b.getAttribute('data-cross-approve')),
    entries: [...document.querySelectorAll('[data-cross-entry="true"]')].map((b) => ({
      direction: b.getAttribute('data-direction'), provenance: b.getAttribute('data-provenance'), key: b.getAttribute('data-endpoint-key'),
    })),
    suggestions: [...document.querySelectorAll('[data-cross-suggestion]')].map((li) => li.getAttribute('data-cross-suggestion')),
  }))()`);
const intraEdges = (brainId, sourceNodeId, targetNodeId) =>
  evaluate(`[...document.querySelectorAll('.map-view g[data-edge-kind][data-brain-id=${JSON.stringify(brainId)}]')]
    .filter((g) => g.getAttribute('data-source-node-id') === ${JSON.stringify(String(sourceNodeId))} && g.getAttribute('data-target-node-id') === ${JSON.stringify(String(targetNodeId))})
    .map((g) => ({ kind: g.getAttribute('data-edge-kind'), keys: g.getAttribute('data-legend-keys') }))`);
const crossEdges = (sourceBrain, sourceNodeId, targetBrain, targetNodeId) =>
  evaluate(`[...document.querySelectorAll('g[data-cross="true"]')]
    .filter((g) => g.getAttribute('data-from-brain-id') === ${JSON.stringify(sourceBrain)} && g.getAttribute('data-to-brain-id') === ${JSON.stringify(targetBrain)}
      && g.getAttribute('data-source-node-id') === ${JSON.stringify(String(sourceNodeId))} && g.getAttribute('data-target-node-id') === ${JSON.stringify(String(targetNodeId))})
    .map((g) => ({ kind: g.getAttribute('data-kind'), provenance: g.getAttribute('data-provenance'), keys: g.getAttribute('data-legend-keys') }))`);
const activeElement = () =>
  evaluate(`(() => { const e = document.activeElement; return { tag: e?.tagName ?? null, testid: e?.getAttribute?.('data-testid') ?? null,
    revokeKey: e?.getAttribute?.('data-suggestion-key') ?? e?.getAttribute?.('data-cross-revoke') ?? null,
    approveKey: e?.getAttribute?.('data-cross-approve') ?? null, text: (e?.textContent ?? '').slice(0, 60) }; })()`);
// Every element that takes focus from now on, in order — to prove focus never
// visits ANOTHER relation's revoke control on its way to the approval control.
const startFocusTrail = () =>
  evaluate(`(() => {
    window.__focusTrail = [];
    if (!window.__focusTrailInstalled) {
      window.__focusTrailInstalled = true;
      document.addEventListener('focusin', (event) => {
        const e = event.target;
        window.__focusTrail.push({
          tag: e?.tagName ?? null,
          revoke: e?.getAttribute?.('data-relation-revoke') ?? e?.getAttribute?.('data-cross-revoke') ?? null,
          approve: e?.getAttribute?.('data-suggestion-key') && e?.getAttribute?.('data-testid') === 'approve-core-suggestion' ? e.getAttribute('data-suggestion-key') : (e?.getAttribute?.('data-cross-approve') ?? null),
        });
      }, true);
    }
  })()`);
const readFocusTrail = () => evaluate("window.__focusTrail ?? []");
const statusLine = () =>
  evaluate(`(document.querySelector('[role="status"]') ?? document.querySelector('[data-testid="status"]'))?.textContent ?? null`);

/* --- gestures ------------------------------------------------------------------ */

// Reach a control with the keyboard: focus the element that PRECEDES it in the
// tab order (in-page `focus()`, the same set-up earlier proofs use), then press
// a real Tab and require that focus lands on the control itself.
async function tabOnto(controlSelector, precedingSelector) {
  await evaluate(`document.querySelector(${JSON.stringify(precedingSelector)})?.focus()`);
  await press("Tab");
  const matches = await evaluate(`document.activeElement === document.querySelector(${JSON.stringify(controlSelector)})`);
  assert(matches, `real Tab did not land on ${controlSelector}`);
}
async function focusDirectly(controlSelector) {
  await evaluate(`document.querySelector(${JSON.stringify(controlSelector)})?.focus()`);
  assert(await evaluate(`document.activeElement === document.querySelector(${JSON.stringify(controlSelector)})`), `cannot focus ${controlSelector}`);
}
async function selectNode(brainId, nodeId) {
  const selector = `[data-brain-id="${brainId}"][data-node-id="${nodeId}"]`;
  await until(`!!document.querySelector(${JSON.stringify(`.map-view ${selector}`)})`, 30000);
  await click(`.map-view ${selector}`);
  await until(`document.querySelector(${JSON.stringify(`.map-view ${selector}`)})?.getAttribute('aria-selected') === 'true'`, 15000);
  await quiet();
}
async function addBrain(brainId) {
  if (await evaluate(`!!document.querySelector(${JSON.stringify(testid(`composition-chip-${brainId}`))})`)) return;
  await click(testid("composition-add-trigger"));
  await until(`!!document.querySelector(${JSON.stringify(testid(`composition-add-item-${brainId}`))})`);
  await click(testid(`composition-add-item-${brainId}`));
  await until(`!!document.querySelector(${JSON.stringify(testid(`composition-chip-${brainId}`))})`);
}
async function openActiveBrain() {
  const canvasHasNodes = "document.querySelectorAll('[data-testid=composed-canvas] [data-node-id]').length > 0";
  if (!(await evaluate(canvasHasNodes)) && (await evaluate(`!!document.querySelector(${JSON.stringify(testid("lifecycle-open"))})`))) {
    await click(testid("lifecycle-open"));
  }
  await until(canvasHasNodes);
}
async function clickLabelFor(testId) {
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
const nodePresent = (brainId, nodeId) =>
  evaluate(`!!document.querySelector('.map-view [data-brain-id="${brainId}"][data-node-id="${String(nodeId)}"]')`);

/* --- the scenario ------------------------------------------------------------- */

const record = { task: "TASK-0051", phase, headTested, checks: [] };
const check = (label, value) => {
  record.checks.push({ label, value });
  return value;
};

async function setUpComposition() {
  await until("!!window.__TAURI_INTERNALS__");
  await until(`!!document.querySelector(${JSON.stringify(testid("lifecycle-open"))}) || !!document.querySelector(${JSON.stringify(testid("composition-add-trigger"))})`);
  // Scaffolding: synthetic sources and Indexes, through the product's own commands.
  for (const brainId of [IDS.alpha, IDS.gamma]) {
    await invoke("map_prepare_synthetic_source", { brainId });
    await invoke("map_rebuild", { brainId });
  }
  // The active real-root brain was unbuilt when the app mounted: build it, then
  // perform the product's normal Open gesture.
  await invoke("map_refresh", { brainId: IDS.real });
  await openActiveBrain();
  await addBrain(IDS.alpha);
  await addBrain(IDS.gamma);
  await click(testid(`composition-remove-${IDS.real}`));
  await until(`!document.querySelector(${JSON.stringify(testid(`composition-chip-${IDS.real}`))})`);
  await click(testid(`composition-chip-${IDS.alpha}`));
  // FILE-only filtered projection (the product's own control, activated through
  // its native label): flattens the files so both ends of a relation are drawn.
  await clickLabelFor("filter-kind-FILE");
  await until(`!document.querySelector(${JSON.stringify(testid("filter-loading"))})`);
  await click(testid("fit-composition"));
  await pause(600);
  await quiet();
}

async function intraCycle(overviewBefore) {
  const s005 = overviewBefore.pendingSuggestions.find((suggestion) => suggestion.suggestionKey === "S-005");
  assert(s005, "S-005 must be pending in Alpha at the start");
  const sourceId = s005.source.nodeId;
  const targetId = s005.target.nodeId;
  await untilTrue("both ends of S-005 drawn", async () => (await nodePresent(IDS.alpha, sourceId)) && (await nodePresent(IDS.alpha, targetId)));
  await selectNode(IDS.alpha, targetId);
  const reference = { brainId: IDS.alpha, nodeId: targetId };
  const nodeOracle = () => invoke("map_relations_for_node", { reference });

  // 1. pending: a suggestion, not a relation.
  const startPanel = await readIntraPanel();
  assert(startPanel.approve.includes("S-005"), "the pending S-005 must offer approval");
  assert(!startPanel.revoke.some((entry) => entry.key === "S-005"), "no revoke control on a pending suggestion");
  assert.equal(startPanel.revoke.filter((entry) => entry.key !== "S-005").length, startPanel.entries.filter((e) => e.provenance === "APPROVED").length, "one revoke control per APPROVED entry");
  const deterministicEntries = startPanel.entries.filter((entry) => entry.provenance === "DETERMINISTIC").length;
  const startNode = await nodeOracle();
  const startEdges = await intraEdges(IDS.alpha, sourceId, targetId);
  assert(startEdges.every((edge) => edge.kind === "suggestion") && startEdges.length === 1, `pending S-005 must be drawn as ONE suggestion edge: ${JSON.stringify(startEdges)}`);
  const alphaStart = shapeIntra(overviewBefore);
  const gammaStart = shapeIntra(await intraOverview(IDS.gamma));
  const commonStart = shapeCross(await crossOverview());
  const fingerprintStart = await sourceAndIndexFingerprint();
  const wireStart = wireCalls.length;

  // 2. approve with the keyboard (Enter).
  await focusDirectly('[data-testid="approve-core-suggestion"][data-suggestion-key="S-005"]');
  await press("Enter");
  await untilTrue("S-005 approved", async () => (await readIntraPanel()).revoke.some((entry) => entry.key === "S-005"));
  await quiet();
  const approvedOverview = await intraOverview(IDS.alpha);
  assert.deepEqual(approvedOverview.approvedCount, alphaStart.counts[1] + 1);
  const approvedPanel = await readIntraPanel();
  const approvedNode = await nodeOracle();
  const approvedEdges = await intraEdges(IDS.alpha, sourceId, targetId);
  assert(approvedEdges.length === 1 && approvedEdges[0].kind === "established" && /intra-approved/.test(approvedEdges[0].keys), `APPROVED edge expected on the map: ${JSON.stringify(approvedEdges)}`);
  assert.equal(approvedNode.incomingCount, startNode.incomingCount + 1, "the endpoint gained exactly one incoming relation");
  const approvedAxe = await axeRun();
  assert.equal(approvedAxe.violations.length, 0, `axe violations with the revoke control on screen: ${JSON.stringify(approvedAxe.violations)}`);
  // DETERMINISTIC entries never carry the control.
  assert.equal(approvedPanel.entries.filter((e) => e.provenance === "DETERMINISTIC").length, deterministicEntries);
  const revokeSelector = '[data-relation-revoke="S-005"]';
  const frenchLabel = (await readIntraPanel()).revoke.find((entry) => entry.key === "S-005").text;
  assert.equal(frenchLabel, "Révoquer S-005");
  const revokeCountMatchesApproved = approvedPanel.revoke.length === approvedPanel.entries.filter((e) => e.provenance === "APPROVED").length;
  assert(revokeCountMatchesApproved, "exactly one revoke control per APPROVED entry, none on DETERMINISTIC");

  // 3. revoke with the keyboard: real Tab onto the control, then Enter.
  const endpointKeyOfEntry = (await readIntraPanel()).entries.find((entry) => entry.provenance === "APPROVED" && entry.type === s005.relationType && entry.direction === "incoming" && entry.key === s005.source.key);
  assert(endpointKeyOfEntry, "the APPROVED S-005 entry must be listed as an incoming entry of the selected node");
  await tabOnto(
    revokeSelector,
    `li:has(${revokeSelector}) .relation__link`,
  );
  const focusedBefore = await activeElement();
  assert.equal(focusedBefore.revokeKey, "S-005");
  await startFocusTrail();
  await press("Enter");
  await untilTrue("S-005 revoked", async () => (await readIntraPanel()).suggestions.includes("S-005"));
  await quiet();
  const revokedOverview = await intraOverview(IDS.alpha);
  const revokedPanel = await readIntraPanel();
  const revokedNode = await nodeOracle();
  const revokedEdges = await intraEdges(IDS.alpha, sourceId, targetId);
  assert.deepEqual(shapeIntra(revokedOverview), alphaStart, "after revoking, the relation set is exactly the starting one");
  assert(!revokedPanel.revoke.some((entry) => entry.key === "S-005"), "the revoke control left with the relation");
  assert(revokedPanel.approve.includes("S-005"), "the suggestion offers approval again");
  assert.equal(revokedNode.incomingCount, startNode.incomingCount, "the endpoint lost exactly the relation it gained");
  assert(revokedEdges.length === 1 && revokedEdges[0].kind === "suggestion", `the map lost the APPROVED edge and shows the suggestion again: ${JSON.stringify(revokedEdges)}`);
  // Revoking removed the control that held focus. Focus must land on the SAME
  // suggestion's approval control — never on the page body, never on another
  // relation's revoke control (one more Enter would take that one back).
  await untilTrue("focus restored onto the approval control of S-005", async () => (await activeElement()).testid === "approve-core-suggestion");
  const focusAfterRevoke = await activeElement();
  assert.equal(focusAfterRevoke.revokeKey, "S-005", `focus after revoke: ${JSON.stringify(focusAfterRevoke)}`);
  const focusTrail = await readFocusTrail();
  assert(!focusTrail.some((step) => step.revoke !== null && step.revoke !== "S-005"), `focus visited another relation's revoke control: ${JSON.stringify(focusTrail)}`);
  const revokedStatus = await statusLine();
  const wireDuring = wireCalls.slice(wireStart);

  // 4. isolation: nothing outside Alpha's own store moved.
  assert(same(shapeIntra(await intraOverview(IDS.gamma)), gammaStart), "Gamma moved");
  assert(same(shapeCross(await crossOverview()), commonStart), "the common inter-brain store moved");
  const fingerprintAfter = await sourceAndIndexFingerprint();
  assert(same(fingerprintAfter, fingerprintStart), "source or Index moved around the intra gestures");

  // 5. re-approve with the keyboard (Space): exactly one relation comes back.
  await focusDirectly('[data-testid="approve-core-suggestion"][data-suggestion-key="S-005"]');
  await press(" ");
  await untilTrue("S-005 approved again", async () => (await readIntraPanel()).revoke.some((entry) => entry.key === "S-005"));
  await quiet();
  const reapproved = await intraOverview(IDS.alpha);
  assert.equal(reapproved.established.filter((edge) => edge.suggestionKey === "S-005").length, 1, "exactly one S-005 relation");
  assert.deepEqual(reapproved.approvedCount, alphaStart.counts[1] + 1);
  const reapprovedNode = await nodeOracle();
  assert.equal(reapprovedNode.incomingCount, startNode.incomingCount + 1);
  const reapprovedEdges = await intraEdges(IDS.alpha, sourceId, targetId);
  assert(reapprovedEdges.length === 1 && reapprovedEdges[0].kind === "established", "one APPROVED edge on the map again");

  // 6. English: the control says « Revoke ».
  await click(testid("language-en"));
  await until("document.documentElement.lang === 'en'");
  const englishLabel = (await readIntraPanel()).revoke.find((entry) => entry.key === "S-005")?.text;
  assert.equal(englishLabel, "Revoke S-005");
  await click(testid("language-fr"));
  await until("document.documentElement.lang === 'fr'");

  // 7. falsifications, through the real IPC (named refusals, no drift).
  const before = await allStores();
  const refusals = {};
  refusals.deterministic = await invokeRefusal("map_relations_revoke", { brainId: IDS.alpha, provenance: "DETERMINISTIC", suggestionKey: "S-005" });
  refusals.unknownKey = await invokeRefusal("map_relations_revoke", { brainId: IDS.alpha, provenance: "APPROVED", suggestionKey: "S-inexistante" });
  refusals.pendingKey = await invokeRefusal("map_relations_revoke", { brainId: IDS.alpha, provenance: "APPROVED", suggestionKey: "S-006" });
  refusals.thirdProvenance = await invokeRefusal("map_relations_revoke", { brainId: IDS.alpha, provenance: "SUGGESTED", suggestionKey: "S-005" });
  assert.match(refusals.deterministic.message, /relation_rejected_revocation_of_deterministic/);
  assert.match(refusals.unknownKey.message, /relation_rejected_unknown_suggestion/);
  assert.match(refusals.pendingKey.message, /relation_rejected_revocation_suggestion_not_approved/);
  assert.match(refusals.thirdProvenance.message, /relation_rejected_unknown_provenance/);
  assert(refusals.deterministic.refused && refusals.unknownKey.refused && refusals.pendingKey.refused && refusals.thirdProvenance.refused);
  assert(same(await allStores(), before), "a refused revocation moved a store");

  // Revoke a second time through the IPC: first succeeds, second is refused, no drift.
  await invoke("map_relations_revoke", { brainId: IDS.alpha, provenance: "APPROVED", suggestionKey: "S-005" });
  const afterFirst = await allStores();
  refusals.secondRevoke = await invokeRefusal("map_relations_revoke", { brainId: IDS.alpha, provenance: "APPROVED", suggestionKey: "S-005" });
  assert(refusals.secondRevoke.refused);
  assert.match(refusals.secondRevoke.message, /relation_rejected_revocation_suggestion_not_approved/);
  assert(same(await allStores(), afterFirst), "the second revocation drifted");
  // Approving twice: the second is refused, so no duplicate.
  await invoke("map_relations_approve", { brainId: IDS.alpha, suggestionKey: "S-005" });
  refusals.secondApprove = await invokeRefusal("map_relations_approve", { brainId: IDS.alpha, suggestionKey: "S-005" });
  assert(refusals.secondApprove.refused);
  const afterReapprove = await intraOverview(IDS.alpha);
  assert.equal(afterReapprove.established.filter((edge) => edge.suggestionKey === "S-005").length, 1, "re-approving twice left exactly one relation");

  // 8. one more keyboard revocation leaves S-005 pending for the restart phase.
  await untilTrue("panel shows S-005 approved", async () => (await readIntraPanel()).revoke.some((entry) => entry.key === "S-005"));
  await tabOnto(revokeSelector, `li:has(${revokeSelector}) .relation__link`);
  await press("Enter");
  await untilTrue("S-005 pending again", async () => (await readIntraPanel()).suggestions.includes("S-005"));
  await quiet();
  const finalIntra = shapeIntra(await intraOverview(IDS.alpha));
  assert.deepEqual(finalIntra, alphaStart);

  return {
    suggestion: { key: "S-005", sourcePath: s005.source.relativePath, targetPath: s005.target.relativePath, relationType: s005.relationType },
    countsStart: alphaStart.counts,
    countsApproved: [approvedOverview.deterministicCount, approvedOverview.approvedCount, approvedOverview.pendingSuggestionCount],
    countsRevoked: shapeIntra(revokedOverview).counts,
    countsReapproved: [reapproved.deterministicCount, reapproved.approvedCount, reapproved.pendingSuggestionCount],
    panelTotals: { start: startPanel.totals, approved: approvedPanel.totals, revoked: revokedPanel.totals },
    selectedNodeIncoming: { start: startNode.incomingCount, approved: approvedNode.incomingCount, revoked: revokedNode.incomingCount, reapproved: reapprovedNode.incomingCount },
    mapEdges: { start: startEdges, approved: approvedEdges, revoked: revokedEdges, reapproved: reapprovedEdges },
    keyboard: { approveWith: "Enter", revokeReachedWithRealTab: true, revokeWith: "Enter", reapproveWith: "Space", focusOnRevokeControlBeforePress: focusedBefore, focusAfterRevoke, focusTrailAfterRevoke: focusTrail },
    labels: { fr: frenchLabel, en: englishLabel },
    statusAfterRevoke: revokedStatus,
    revokeControlsOnApprovedEntriesOnly: revokeCountMatchesApproved,
    deterministicEntriesWithRevokeControl: 0,
    axeWithRevokeControlOnScreen: { violations: approvedAxe.violations.length, incomplete: approvedAxe.incomplete, passes: approvedAxe.passes },
    isolation: { gammaUnchanged: true, commonStoreUnchanged: true, sourceAndIndexUnchanged: true },
    reloadedFromBackend: { backendCommandsDuringRevocation: wireDuring },
    falsifications: refusals,
    reloadAfterRevocationCommands: wireDuring.filter((name) => /^map_relations_|^map_cross_relations_/.test(name)),
  };
}

async function crossCycle(crossBefore) {
  const suggestion = crossBefore.pendingSuggestions.find((item) => item.suggestionKey === "XB-S02");
  assert(suggestion, "XB-S02 must be pending at the start");
  const sourceBrain = suggestion.source.brainId;
  const targetBrain = suggestion.target.brainId;
  const sourceId = suggestion.source.nodeId;
  const targetId = suggestion.target.nodeId;
  assert(sourceId !== null && targetId !== null, "both ends of XB-S02 must resolve in their Indexes");
  // English for this whole cycle: the cross controls are judged in both languages.
  await click(testid("language-en"));
  await until("document.documentElement.lang === 'en'");
  await click(testid(`composition-chip-${sourceBrain}`));
  await untilTrue("both ends of XB-S02 drawn", async () => (await nodePresent(sourceBrain, sourceId)) && (await nodePresent(targetBrain, targetId)));
  await selectNode(sourceBrain, sourceId);
  const reference = { brainId: sourceBrain, nodeId: sourceId };
  const nodeOracle = () => invoke("map_cross_relations_for_node", { reference });

  const start = shapeCross(crossBefore);
  const alphaStart = shapeIntra(await intraOverview(IDS.alpha));
  const gammaStart = shapeIntra(await intraOverview(IDS.gamma));
  const startPanel = await readCrossPanel();
  assert(startPanel.approve.includes("XB-S02"), "XB-S02 must offer approval");
  assert(!startPanel.revoke.some((entry) => entry.key === "XB-S02"));
  const startNode = await nodeOracle();
  const startEdges = await crossEdges(sourceBrain, sourceId, targetBrain, targetId);
  assert(startEdges.length === 1 && startEdges[0].kind === "suggestion", `pending XB-S02 must be drawn as ONE suggestion edge: ${JSON.stringify(startEdges)}`);
  const fingerprintStart = await sourceAndIndexFingerprint();

  // approve (Enter)
  await focusDirectly('[data-cross-approve="XB-S02"]');
  await press("Enter");
  await untilTrue("XB-S02 approved", async () => (await readCrossPanel()).revoke.some((entry) => entry.key === "XB-S02"));
  await quiet();
  const approved = await crossOverview();
  assert.equal(approved.approvedCount, start.counts[1] + 1);
  const approvedPanel = await readCrossPanel();
  const approvedNode = await nodeOracle();
  const approvedEdges = await crossEdges(sourceBrain, sourceId, targetBrain, targetId);
  assert(approvedEdges.length === 1 && approvedEdges[0].kind === "established" && approvedEdges[0].provenance === "APPROVED", `APPROVED cross edge expected: ${JSON.stringify(approvedEdges)}`);
  assert.equal(approvedNode.outgoingCount, startNode.outgoingCount + 1);
  assert.equal(approvedPanel.revoke.length, approvedPanel.entries.filter((e) => e.provenance === "APPROVED").length, "one revoke control per APPROVED cross entry");
  const englishRevoke = approvedPanel.revoke.find((entry) => entry.key === "XB-S02");
  assert.equal(englishRevoke.text, "Revoke XB-S02");
  assert.match(englishRevoke.label, /^revoke inter-brain relation XB-S02, from /);
  const approvedAxe = await axeRun();
  assert.equal(approvedAxe.violations.length, 0, `axe violations with the cross revoke control on screen: ${JSON.stringify(approvedAxe.violations)}`);

  // revoke (real Tab, then Enter)
  const revokeSelector = '[data-cross-revoke="XB-S02"]';
  await tabOnto(revokeSelector, `li.cross-relation:has(${revokeSelector}) .cross-relation__link`);
  const focusedBefore = await activeElement();
  assert.equal(focusedBefore.revokeKey, "XB-S02");
  await startFocusTrail();
  await press("Enter");
  await untilTrue("XB-S02 revoked", async () => (await readCrossPanel()).suggestions.includes("XB-S02"));
  await quiet();
  const revoked = await crossOverview();
  const revokedPanel = await readCrossPanel();
  const revokedNode = await nodeOracle();
  const revokedEdges = await crossEdges(sourceBrain, sourceId, targetBrain, targetId);
  assert.deepEqual(shapeCross(revoked), start, "after revoking, the inter-brain relation set is exactly the starting one");
  assert(!revokedPanel.revoke.some((entry) => entry.key === "XB-S02"));
  assert(revokedPanel.approve.includes("XB-S02"));
  assert.equal(revokedNode.outgoingCount, startNode.outgoingCount);
  assert(revokedEdges.length === 1 && revokedEdges[0].kind === "suggestion", `the map lost the APPROVED cross edge: ${JSON.stringify(revokedEdges)}`);
  await untilTrue("focus restored onto the approval control of XB-S02", async () => (await activeElement()).approveKey === "XB-S02");
  const focusAfterRevoke = await activeElement();
  const focusTrail = await readFocusTrail();
  assert(!focusTrail.some((step) => step.revoke !== null && step.revoke !== "XB-S02"), `focus visited another relation's revoke control: ${JSON.stringify(focusTrail)}`);

  // isolation: no intra store, no Index, no source moved.
  assert(same(shapeIntra(await intraOverview(IDS.alpha)), alphaStart), "Alpha's store moved on a cross revocation");
  assert(same(shapeIntra(await intraOverview(IDS.gamma)), gammaStart), "Gamma's store moved on a cross revocation");
  assert(same(await sourceAndIndexFingerprint(), fingerprintStart), "source or Index moved around the cross gestures");

  // re-approve (Enter), exactly one relation.
  await focusDirectly('[data-cross-approve="XB-S02"]');
  await press("Enter");
  await untilTrue("XB-S02 approved again", async () => (await readCrossPanel()).revoke.some((entry) => entry.key === "XB-S02"));
  await quiet();
  const reapproved = await crossOverview();
  assert.equal(reapproved.established.filter((edge) => edge.suggestionKey === "XB-S02").length, 1);
  assert.equal(reapproved.approvedCount, start.counts[1] + 1);
  assert.equal((await nodeOracle()).outgoingCount, startNode.outgoingCount + 1);
  const reapprovedEdges = await crossEdges(sourceBrain, sourceId, targetBrain, targetId);
  assert(reapprovedEdges.length === 1 && reapprovedEdges[0].kind === "established");

  // falsifications through the real IPC.
  const before = await allStores();
  const refusals = {};
  refusals.deterministic = await invokeRefusal("map_cross_relations_revoke", { provenance: "DETERMINISTIC", suggestionKey: "XB-S02" });
  refusals.unknownKey = await invokeRefusal("map_cross_relations_revoke", { provenance: "APPROVED", suggestionKey: "XB-inexistante" });
  refusals.pendingKey = await invokeRefusal("map_cross_relations_revoke", { provenance: "APPROVED", suggestionKey: "XB-S03" });
  assert.match(refusals.deterministic.message, /cross_relation_rejected_revocation_of_deterministic/);
  assert.match(refusals.unknownKey.message, /cross_relation_rejected_unknown_suggestion/);
  assert.match(refusals.pendingKey.message, /cross_relation_rejected_revocation_suggestion_not_approved/);
  assert(same(await allStores(), before), "a refused cross revocation moved a store");
  await invoke("map_cross_relations_revoke", { provenance: "APPROVED", suggestionKey: "XB-S02" });
  const afterFirst = await allStores();
  refusals.secondRevoke = await invokeRefusal("map_cross_relations_revoke", { provenance: "APPROVED", suggestionKey: "XB-S02" });
  assert(refusals.secondRevoke.refused);
  assert(same(await allStores(), afterFirst), "the second cross revocation drifted");
  await invoke("map_cross_relations_approve", { suggestionKey: "XB-S02" });
  refusals.secondApprove = await invokeRefusal("map_cross_relations_approve", { suggestionKey: "XB-S02" });
  assert(refusals.secondApprove.refused);
  assert.equal((await crossOverview()).established.filter((edge) => edge.suggestionKey === "XB-S02").length, 1);

  // leave XB-S02 pending for the restart phase, by the keyboard.
  await untilTrue("panel shows XB-S02 approved", async () => (await readCrossPanel()).revoke.some((entry) => entry.key === "XB-S02"));
  await tabOnto(revokeSelector, `li.cross-relation:has(${revokeSelector}) .cross-relation__link`);
  await press("Enter");
  await untilTrue("XB-S02 pending again", async () => (await readCrossPanel()).suggestions.includes("XB-S02"));
  await quiet();
  assert.deepEqual(shapeCross(await crossOverview()), start);
  await click(testid("language-fr"));
  await until("document.documentElement.lang === 'fr'");

  return {
    suggestion: { key: "XB-S02", sourceBrain, sourcePath: suggestion.source.relativePath, targetBrain, targetPath: suggestion.target.relativePath },
    countsStart: start.counts,
    countsApproved: [approved.deterministicCount, approved.approvedCount, approved.pendingSuggestionCount],
    countsRevoked: shapeCross(revoked).counts,
    countsReapproved: [reapproved.deterministicCount, reapproved.approvedCount, reapproved.pendingSuggestionCount],
    panelTotals: { start: startPanel.totals, approved: approvedPanel.totals, revoked: revokedPanel.totals },
    selectedNodeOutgoing: { start: startNode.outgoingCount, approved: approvedNode.outgoingCount, revoked: revokedNode.outgoingCount },
    mapEdges: { start: startEdges, approved: approvedEdges, revoked: revokedEdges, reapproved: reapprovedEdges },
    keyboard: { approveWith: "Enter", revokeReachedWithRealTab: true, revokeWith: "Enter", reapproveWith: "Enter", focusOnRevokeControlBeforePress: focusedBefore, focusAfterRevoke, focusTrailAfterRevoke: focusTrail },
    labels: { en: englishRevoke.text, ariaEn: englishRevoke.label },
    axeWithRevokeControlOnScreen: { violations: approvedAxe.violations.length, incomplete: approvedAxe.incomplete, passes: approvedAxe.passes },
    isolation: { alphaUnchanged: true, gammaUnchanged: true, sourceAndIndexUnchanged: true },
    falsifications: refusals,
  };
}

try {
  if (phase === 1) {
    await setUpComposition();
    const intraBefore = await intraOverview(IDS.alpha);
    const crossBefore = await crossOverview();
    // The same key is approved in Gamma BEFORE Alpha's revocation: its identity
    // space is the brain, and Alpha's gesture must not reach it.
    const gammaBefore = await intraOverview(IDS.gamma);
    if (gammaBefore.pendingSuggestions.some((item) => item.suggestionKey === "S-005")) {
      await invoke("map_relations_approve", { brainId: IDS.gamma, suggestionKey: "S-005" });
    }
    const gammaApproved = await intraOverview(IDS.gamma);
    assert(gammaApproved.established.some((edge) => edge.suggestionKey === "S-005"), "Gamma holds its own approved S-005");
    record.baseline = { alpha: shapeIntra(intraBefore).counts, gammaWithOwnApproval: shapeIntra(gammaApproved).counts, common: shapeCross(crossBefore).counts };
    record.intra = await intraCycle(intraBefore);
    record.cross = await crossCycle(await crossOverview());
    // What the second process must find.
    record.finalStores = await allStores();
    assert(record.finalStores.gamma.established.some((entry) => entry.endsWith("|S-005")), "Gamma's own S-005 survived Alpha's revocation");
    assert.equal(record.finalStores.alpha.pending.includes("S-005:pending"), true);
    assert.equal(record.finalStores.common.pending.includes("XB-S02:pending"), true);
    record.fatalConsoleErrors = fatal.length;
    assert.equal(fatal.length, 0, "fatal console errors");
    await mkdir(proofRoot, { recursive: true });
    await writeFile(join(proofRoot, "phase1.json"), JSON.stringify(record, null, 1));
    console.log("TASK-0051 phase 1 PASS");
  } else {
    // A fresh process. Nothing is replayed; the stores are only read, then the
    // two rebuild paths are exercised.
    const phase1 = JSON.parse(await readFile(join(proofRoot, "phase1.json"), "utf8"));
    await until("!!window.__TAURI_INTERNALS__");
    await until(`!!document.querySelector(${JSON.stringify(testid("lifecycle-open"))}) || !!document.querySelector(${JSON.stringify(testid("composition-add-trigger"))})`);
    // 1. real restart: nothing came back on its own.
    const restarted = await allStores();
    assert.deepEqual(restarted, phase1.finalStores, "the stores after a real restart differ from the end of phase 1");
    record.afterRestart = { alpha: restarted.alpha.counts, gamma: restarted.gamma.counts, common: restarted.common.counts };
    assert(restarted.alpha.pending.includes("S-005:pending"));
    assert(restarted.common.pending.includes("XB-S02:pending"));
    assert(!restarted.alpha.established.some((entry) => entry.endsWith("|S-005")), "S-005 came back as a relation after the restart");
    assert(!restarted.common.established.some((entry) => entry.endsWith("|XB-S02")), "XB-S02 came back as a relation after the restart");

    // 2. a real Index rebuild of both brains (the product's own command).
    const fingerprintBefore = await sourceAndIndexFingerprint();
    for (const brainId of [IDS.alpha, IDS.gamma]) await invoke("map_rebuild", { brainId });
    const rebuilt = await allStores();
    assert.deepEqual(rebuilt, phase1.finalStores, "an Index rebuild changed a relation store");
    record.afterIndexRebuild = { alpha: rebuilt.alpha.counts, gamma: rebuilt.gamma.counts, common: rebuilt.common.counts };
    const fingerprintAfter = await sourceAndIndexFingerprint();
    assert.deepEqual(fingerprintAfter.sources, fingerprintBefore.sources, "a source moved during the rebuild");

    // 3. UI after the restart and the rebuild: S-005 is a pending suggestion, with no revoke control.
    // The composition and the filter may have been restored by the product
    // (per-brain resume state): only what is missing is set up.
    await openActiveBrain();
    await addBrain(IDS.alpha);
    if (await evaluate(`!!document.querySelector(${JSON.stringify(testid(`composition-remove-${IDS.real}`))})`)) {
      await click(testid(`composition-remove-${IDS.real}`));
      await until(`!document.querySelector(${JSON.stringify(testid(`composition-chip-${IDS.real}`))})`);
    }
    await click(testid(`composition-chip-${IDS.alpha}`));
    if (!(await evaluate(`document.querySelector(${JSON.stringify(testid("filter-kind-FILE"))})?.checked === true`))) {
      await clickLabelFor("filter-kind-FILE");
    }
    await until(`!document.querySelector(${JSON.stringify(testid("filter-loading"))})`);
    await click(testid("fit-composition"));
    await pause(600);
    await quiet();
    const alphaOverview = await intraOverview(IDS.alpha);
    const s005 = alphaOverview.pendingSuggestions.find((item) => item.suggestionKey === "S-005");
    assert(s005, "S-005 pending in the rebuilt Alpha");
    await selectNode(IDS.alpha, s005.target.nodeId);
    const panel = await readIntraPanel();
    assert(panel.suggestions.includes("S-005"));
    assert(!panel.revoke.some((entry) => entry.key === "S-005"), "no revoke control for a suggestion that is pending after the restart");
    const edges = await intraEdges(IDS.alpha, s005.source.nodeId, s005.target.nodeId);
    assert(edges.length === 1 && edges[0].kind === "suggestion", `after restart and rebuild the map draws S-005 as a suggestion: ${JSON.stringify(edges)}`);
    record.uiAfterRestart = { suggestionsListed: panel.suggestions, revokeControls: panel.revoke.length, mapEdges: edges };

    // 4. engine rerun (the product's own Analyze control, a real click): no auto-reapproval.
    const beforeRerun = await allStores();
    await click(testid("analyze-relations"));
    await untilTrue("analysis settled", async () => (await evaluate(`document.querySelector('[data-testid="relation-engine-state"]')?.textContent ?? ''`)).length > 0 && !(await evaluate(`document.querySelector('[data-testid="analyze-relations"]')?.disabled`)));
    await quiet();
    await click(testid("analyze-relations"));
    await quiet();
    const afterRerun = await allStores();
    assert(!afterRerun.alpha.established.some((entry) => entry.endsWith("|S-005")), "the engine re-approved S-005");
    assert(afterRerun.alpha.pending.includes("S-005:pending"), "S-005 is no longer pending after the engine rerun");
    // Everything the engine does not own is unchanged: the approved relations
    // and every other suggestion state (the engine may add its own core suggestions).
    const approvedOnly = (shape) => shape.established.filter((entry) => entry.startsWith("APPROVED"));
    assert.deepEqual(approvedOnly(afterRerun.alpha), approvedOnly(beforeRerun.alpha), "the engine rerun moved an approved relation");
    assert.deepEqual(afterRerun.gamma, beforeRerun.gamma, "the Alpha engine rerun moved Gamma");
    assert.deepEqual(afterRerun.common, beforeRerun.common, "the Alpha engine rerun moved the common store");
    record.afterEngineRerun = { alpha: afterRerun.alpha.counts, gamma: afterRerun.gamma.counts, common: afterRerun.common.counts, engine: await invoke("map_relation_engine_status", { brainId: IDS.alpha }) };

    // 5. the user can still approve what was revoked, once, after all of this.
    await invoke("map_relations_approve", { brainId: IDS.alpha, suggestionKey: "S-005" });
    await invoke("map_cross_relations_approve", { suggestionKey: "XB-S02" });
    const approvedAgain = await allStores();
    assert.equal(approvedAgain.alpha.established.filter((entry) => entry.endsWith("|S-005")).length, 1);
    assert.equal(approvedAgain.common.established.filter((entry) => entry.endsWith("|XB-S02")).length, 1);
    record.explicitReapprovalAfterRestart = { alpha: approvedAgain.alpha.counts, common: approvedAgain.common.counts };

    const browser = await send("Browser.getVersion");
    record.engine = { product: browser.product, protocolVersion: browser.protocolVersion };
    record.axe = { package: axeManifest.version, axeMinJsSha256: axeSha256 };
    record.phase1 = phase1;
    record.fatalConsoleErrors = fatal.length;
    assert.equal(fatal.length, 0, "fatal console errors");
    const text = JSON.stringify(record, null, 1);
    assert(!text.includes(seed.rootAlix), "absolute proof path leaked into the artifact");
    await mkdir(proofRoot, { recursive: true });
    await writeFile(join(proofRoot, "phase2.json"), text);
    console.log("TASK-0051 phase 2 PASS");
  }
  ws.close();
} catch (error) {
  console.error(String(error?.stack ?? error));
  ws.close();
  process.exit(1);
}
