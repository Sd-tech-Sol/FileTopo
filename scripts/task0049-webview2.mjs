// TASK-0049 — three real WebView2 processes around complete Index loss.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { appendFile, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { setTimeout as pause } from "node:timers/promises";

const port = Number(process.argv[2]);
const variant = process.argv[3];
const phase = Number(process.argv[4]);
assert(/^task0049-[a-f0-9]+$/.test(variant));
assert([1, 2, 3].includes(phase));
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
const brainId = seed.brainId;
const proofRoot = join(".filetopo-sandbox", variant);

let target;
for (let attempt = 0; attempt < 240; attempt += 1) {
  try {
    const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    target = pages.find((page) => page.type === "page");
    if (target) break;
  } catch {}
  await pause(100);
}
assert(target, "WebView2 CDP page unavailable");
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});
let serial = 0;
const pending = new Map();
const fatal = [];
socket.addEventListener("message", ({ data }) => {
  const event = JSON.parse(data);
  if (event.id) {
    const waiter = pending.get(event.id);
    pending.delete(event.id);
    if (event.error) waiter?.reject(new Error(JSON.stringify(event.error)));
    else waiter?.resolve(event.result);
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
    socket.send(JSON.stringify({ id, method, params }));
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
    await pause(100);
  }
  throw new Error(`timeout: ${expression}`);
}
async function invoke(command, args = {}) {
  return evaluate(
    `window.__TAURI_INTERNALS__.invoke(${JSON.stringify(command)},${JSON.stringify(args)})`,
  );
}
async function outcome(command, args = {}) {
  return evaluate(`window.__TAURI_INTERNALS__.invoke(${JSON.stringify(command)},${JSON.stringify(args)})
    .then(value => ({ok:true,value}), error => ({ok:false,error:String(error)}))`);
}
await send("Runtime.enable");
await send("Log.enable");
await until("Boolean(window.__TAURI_INTERNALS__?.invoke)");

async function hashTree(root) {
  const hash = createHash("sha256");
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const path = join(directory, entry.name);
      const rel = relative(root, path).replaceAll("\\", "/");
      hash.update(entry.isDirectory() ? `D:${rel}\0` : `F:${rel}\0`);
      if (entry.isDirectory()) await visit(path);
      else hash.update(await readFile(path));
    }
  }
  await visit(root);
  return hash.digest("hex");
}

const expectedInventory = [
  "built_unix_ms",
  "index_id",
  "index_revision",
  "change_events",
  "seen_change_events",
  "seen_through_event_id",
  "next_node_id",
  "node_id_allocation",
  "nodes.seen_legacy",
];
const journal = () =>
  invoke("map_change_journal", { brainId, natures: [], after: null, limit: 50 });
const policy = () => invoke("map_brain_exclusions", { brainId });
const resolveNode = (relativePath) => invoke("map_resolve_node", { brainId, relativePath });
const phasePath = join(proofRoot, `phase${phase}.json`);

if (phase === 1) {
  const notBuilt = await outcome("map_open", { brainId });
  assert.equal(notBuilt.ok, false);
  assert.match(notBuilt.error, /map_not_built/);

  const initial = await invoke("map_rebuild", { brainId });
  assert.equal(initial.changeSummary.baselineEstablished, true);
  assert.equal(initial.changeSummary.total, 0);
  assert.deepEqual(initial.nonReconstructible, expectedInventory);

  const appliedPolicy = await invoke("map_brain_exclusions_replace", {
    brainId,
    rules: ["excluded"],
  });
  assert.deepEqual(appliedPolicy.rules, ["excluded"]);
  assert.equal(await resolveNode("excluded/hidden.txt"), null);

  // Materialise the two external per-brain stores before the loss proof.
  await invoke("map_content_summary", { brainId });
  await invoke("map_relation_engine_run", { brainId });

  await writeFile(join(seed.sourceRoot, "history.txt"), "created synthetic\n");
  const created = await invoke("map_refresh", { brainId });
  assert.equal(created.changeSummary.created, 1);
  await appendFile(join(seed.sourceRoot, "b.txt"), "modified synthetic\n");
  const modified = await invoke("map_refresh", { brainId });
  assert.equal(modified.changeSummary.modified, 1);
  await unlink(join(seed.sourceRoot, "a.txt"));
  const finalReport = await invoke("map_refresh", { brainId });
  assert.equal(finalReport.changeSummary.deleted, 1);

  const oldB = await resolveNode("b.txt");
  assert.equal(oldB.nodeId, 3, "history must leave b on old id 3");
  const beforeJournal = await journal();
  const createdEvent = beforeJournal.items.find(
    (event) => event.nature === "CREATED" && event.newRelativePath === "history.txt",
  );
  assert(createdEvent, "a real CREATED event is required");
  await invoke("map_change_mark_seen", { brainId, eventId: createdEvent.eventId });
  const afterSeen = await journal();
  assert(afterSeen.total >= 3);
  assert(afterSeen.unseenTotal < beforeJournal.unseenTotal);

  const resume = {
    focusNodeId: oldB.nodeId,
    selectedNodeId: oldB.nodeId,
    view: { scale: 1.75, tx: -31, ty: 17 },
    filter: { state: "ALL", kinds: ["FILE"], availability: "ALL" },
    detailsPanelVisible: false,
  };
  await invoke("map_brain_resume_update", { brainId, state: resume });
  // Let the real UI's bounded writer settle too; it may canonicalise the
  // current root focus, but the deliberately selected old id must remain.
  await pause(750);
  const persistedResume = await invoke("map_brain_resume_state", { brainId });
  assert.equal(persistedResume.selectedNodeId, oldB.nodeId);

  const result = {
    notBuiltBeforeFirstBuild: true,
    indexId: finalReport.indexId,
    revision: finalReport.revision,
    logicalDigest: finalReport.reconstructibleDigest,
    oldMapping: { b: oldB.nodeId },
    journal: {
      total: afterSeen.total,
      unseenTotal: afterSeen.unseenTotal,
      seenEventId: createdEvent.eventId,
    },
    policy: await policy(),
    resume: persistedResume,
    sourceSha256: await hashTree(seed.sourceRoot),
    nonReconstructible: finalReport.nonReconstructible,
  };
  await writeFile(phasePath, JSON.stringify(result, null, 2));
} else if (phase === 2) {
  const phase1 = JSON.parse(await readFile(join(proofRoot, "phase1.json"), "utf8"));
  const notBuilt = await outcome("map_open", { brainId });
  assert.equal(notBuilt.ok, false);
  assert.match(notBuilt.error, /map_not_built/);

  const rebuilt = await invoke("map_rebuild", { brainId });
  assert.notEqual(rebuilt.indexId, phase1.indexId);
  assert.equal(rebuilt.reconstructibleDigest, phase1.logicalDigest);
  assert.deepEqual(rebuilt.nonReconstructible, expectedInventory);
  assert.equal(rebuilt.changeSummary.baselineEstablished, true);
  assert.equal(rebuilt.changeSummary.total, 0);
  const freshJournal = await journal();
  assert.equal(freshJournal.total, 0, "lost history must not be synthesized");
  assert.equal(freshJournal.unseenTotal, 0, "seen ids from the old journal must not travel");

  const freshB = await resolveNode("b.txt");
  assert.equal(freshB.nodeId, 2);
  const view = await invoke("map_view", {
    brainId,
    focusId: null,
    after: null,
    filter: null,
  });
  const reused = view.nodes.find((node) => node.id === phase1.oldMapping.b);
  assert.equal(reused.relativePath, "c.txt", "old b id must now really name c");

  const restored = await invoke("map_brain_resume_restore", { brainId });
  const expectedCorrections = [];
  if (phase1.resume.focusNodeId !== null) expectedCorrections.push("FOCUS_GENERATION_CHANGED");
  if (phase1.resume.selectedNodeId !== null) expectedCorrections.push("SELECTION_GENERATION_CHANGED");
  assert(expectedCorrections.includes("SELECTION_GENERATION_CHANGED"));
  assert.deepEqual(restored.corrections, expectedCorrections);
  assert.equal(restored.resume.focusNodeId, null);
  assert.equal(restored.resume.selectedNodeId, null);
  assert.deepEqual(restored.resume.view, phase1.resume.view);
  assert.deepEqual(restored.resume.filter, phase1.resume.filter);
  assert.equal(restored.resume.detailsPanelVisible, false);
  assert.deepEqual((await policy()).rules, ["excluded"]);
  assert.equal(await resolveNode("excluded/hidden.txt"), null);
  assert.equal(await hashTree(seed.sourceRoot), phase1.sourceSha256);

  await writeFile(
    phasePath,
    JSON.stringify(
      {
        openAfterLossWasNotBuilt: true,
        indexId: rebuilt.indexId,
        revision: rebuilt.revision,
        logicalDigest: rebuilt.reconstructibleDigest,
        freshMapping: { b: freshB.nodeId, oldBIdNowPath: reused.relativePath },
        restore: restored,
        journal: freshJournal,
        policy: await policy(),
        sourceSha256: await hashTree(seed.sourceRoot),
        nonReconstructible: rebuilt.nonReconstructible,
      },
      null,
      2,
    ),
  );
} else {
  const phase2 = JSON.parse(await readFile(join(proofRoot, "phase2.json"), "utf8"));
  const opened = await invoke("map_open", { brainId });
  assert.equal(opened.indexId, phase2.indexId);
  const restored = await invoke("map_brain_resume_restore", { brainId });
  assert.deepEqual(restored.corrections, []);
  assert.equal(restored.resume.focusNodeId, null);
  assert.equal(restored.resume.selectedNodeId, null);
  assert.deepEqual(restored.resume.view, phase2.restore.resume.view);
  assert.deepEqual(restored.resume.filter, phase2.restore.resume.filter);
  assert.equal((await journal()).total, 0);
  assert.deepEqual((await policy()).rules, ["excluded"]);
  assert.equal(await hashTree(seed.sourceRoot), phase2.sourceSha256);
  await writeFile(
    phasePath,
    JSON.stringify(
      {
        indexId: opened.indexId,
        persistedCorrection: restored,
        policy: await policy(),
        journal: await journal(),
        sourceSha256: await hashTree(seed.sourceRoot),
      },
      null,
      2,
    ),
  );
}

await writeFile(
  join(proofRoot, `phase${phase}-fatal-count.json`),
  JSON.stringify(fatal.length),
);
socket.close();
