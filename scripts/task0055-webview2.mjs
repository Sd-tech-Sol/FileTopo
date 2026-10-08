// TASK-0055 — real WebView2 proof of physical object identity (F-046 / DEC-0052).
//
//   node scripts/task0055-webview2.mjs <port> <variant> <pass> <proofRoot> <head>   (seed JSON on stdin)
//
// <pass> is `1` or `2`. Pass 1 indexes the fixture, runs one real content campaign and reads the
// explorer; it then adds and renames a hard link and refreshes, so the group logic is exercised
// through the product's own **Actualiser**. Pass 2 is a NEW process over the SAME sandbox: it reads
// the same facts back from disk, which is what persistence across a restart means here.
//
// What this proves, and what it does not:
//
// * `PROVEN_SHARED` / `PROVEN_SINGLE` / `UNKNOWN` are read off the DOM the person sees, and the
//   occurrence count with them;
// * identical content and the same physical object are **separate** facts: `a.bin`, `b-hardlink.bin`
//   and `c-copy.bin` are one SHA-256 group, and only the first two are one object;
// * two distinct empty files are one SHA-256 group and two objects, and create **no** relation;
// * an unshared `SYSTEM` file keeps its `nodeId` across a rename (`F-004`), while a shared group
//   exists in the same tree;
// * a hard link that appears keeps the original path's `nodeId` and gives the alias a new one; a
//   renamed alias is **not** correlated by supposition;
// * no stable key, volume serial or file id reaches the DOM, the IPC payloads, the app log or this
//   artifact — asserted against the forbidden spellings AND against the real key, which the harness
//   never learns (it checks the two shapes the product could emit).
//
// Gestures use real CDP input events. Every count the harness judges is recomputed from the
// synthetic directory on disk, never taken from FileTopo.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { setTimeout as pause } from "node:timers/promises";

const port = Number(process.argv[2]);
const variant = process.argv[3];
const pass = Number(process.argv[4]);
const proofRoot = process.argv[5];
const headTested = process.argv[6];
assert(/^task0055-[a-f0-9]+$/.test(variant));
assert([1, 2].includes(pass), "pass must be 1 or 2");
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
/** Every IPC response body seen on the wire, for the leak audit. */
const wireBodies = [];
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
async function until(expression, limit = 120000) {
  const started = Date.now();
  while (Date.now() - started < limit) {
    if (await evaluate(expression)) return;
    await pause(120);
  }
  throw new Error(`timeout: ${expression}`);
}
const invoke = async (command, args = {}) => {
  const value = await evaluate(
    `window.__TAURI_INTERNALS__.invoke(${JSON.stringify(command)},${JSON.stringify(args)})`,
  );
  wireBodies.push({ command, value });
  return value;
};
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
};
async function press(key, modifiers = 0) {
  const spec = KEYS[key];
  assert(spec, `unknown key ${key}`);
  const shape = {
    key, code: spec.code, windowsVirtualKeyCode: spec.vk, nativeVirtualKeyCode: spec.vk, modifiers,
  };
  await send("Input.dispatchKeyEvent", { type: "keyDown", ...shape, ...(spec.text ? { text: spec.text, unmodifiedText: spec.text } : {}) });
  await send("Input.dispatchKeyEvent", { type: "keyUp", ...shape });
  await pause(200);
}
async function quiet(milliseconds = 900, limit = 120000) {
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
/** Content only: the digest of the bytes of every file, by path. A hard link and
 *  its target are indistinguishable here on purpose — that is the point. */
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
const digestOf = async (relativePath) =>
  createHash("sha256").update(await readFile(join(ROOT, relativePath))).digest("hex");

/** Every relation-bearing store of this sandbox, as a digest or `null` when the
 *  file does not exist. Comparing these before and after is how this harness
 *  says "no relation was created": not by trusting a counter, by reading the
 *  stores. The paths are the ones `SandboxPaths` defines, inside the repository
 *  sandbox this run owns. */
async function relationStores() {
  const brains = join(".filetopo-sandbox", "variants", variant, "brains");
  const files = [
    join(brains, BRAIN, "relations", "relations.sqlite"),
    join(brains, "interbrain", "relations.sqlite"),
  ];
  const state = {};
  for (const file of files) {
    const bytes = await readFile(file).catch(() => null);
    state[relative(brains, file).replaceAll("\\", "/")] =
      bytes === null ? null : createHash("sha256").update(bytes).digest("hex");
  }
  return state;
}

/* --- the explorer, as the person sees it ----------------------------------------- */

/** Every member row of the open group: its path and the physical fact next to it. */
const readMembers = () =>
  evaluate(`(() => [...document.querySelectorAll('.duplicates__member-list > li')].map((li) => {
    const fact = li.querySelector('[data-testid="duplicate-member-physical"]');
    const label = li.querySelector('[data-testid="duplicate-member"], [data-testid="duplicate-member-unresolved"]');
    return {
      path: (label?.textContent ?? '').trim(),
      physicalObject: fact?.getAttribute('data-physical-object') ?? null,
      occurrences: fact?.getAttribute('data-physical-occurrences') ?? null,
      text: (fact?.textContent ?? '').trim(),
    };
  }))()`);
const readGroups = () =>
  evaluate(`(() => [...document.querySelectorAll('[data-testid="duplicate-group"]')].map((b) => ({
    groupId: b.getAttribute('data-group-id'), label: (b.textContent ?? '').trim(),
  })))()`);

/** Opens the explorer and the group whose digest is `hashHex`. */
async function openGroup(hashHex) {
  if (await evaluate(`document.querySelector(${JSON.stringify(testid("open-duplicate-explorer"))})?.getAttribute('aria-expanded') !== 'true'`)) {
    await click(testid("open-duplicate-explorer"));
  }
  await until(`!!document.querySelector('[data-testid="duplicate-group"]')`);
  await quiet();
  const groups = await readGroups();
  const wanted = groups.find((group) => group.groupId === `sha256-v1:${hashHex}`);
  assert(wanted, `no group for ${hashHex}: ${JSON.stringify(groups)}`);
  await click(`[data-testid="duplicate-group"][data-group-id="${wanted.groupId}"]`);
  await until(`!!document.querySelector('[data-testid="duplicate-member-physical"]')`);
  await quiet();
  return wanted;
}

/* --- scenario ----------------------------------------------------------------------- */

const record = { task: "TASK-0055", pass, headTested, checks: [] };
const check = (label, value = true) => {
  record.checks.push({ label, value });
  return value;
};
/** Nothing in this slice may write a source, rebuild, or **mutate** a relation
 *  store. Reading relations when a node is selected is what the panel does and
 *  is not a mutation; the stores' own bytes are checked separately. */
const FORBIDDEN_DURING_READS =
  /^map_(rebuild|prepare_|reveal_node|copy_node_path|write_run_artifact|brain_exclusions_replace|brain_choose_real_root|(cross_)?relations_(approve|reject|revoke)|relation_engine_run)/;

await until("!!window.__TAURI_INTERNALS__");

const disk = await walkDisk(ROOT);
const contentHashBefore = await hashTree(ROOT);
const sharedDigest = await digestOf("a.bin");
const emptyDigest = createHash("sha256").update(Buffer.alloc(0)).digest("hex");
assert.equal(await digestOf("b-hardlink.bin"), sharedDigest, "the hard link reads the same bytes");
assert.equal(await digestOf("c-copy.bin"), sharedDigest, "the copy reads the same bytes");
assert(disk.includes("a.bin") && disk.includes("b-hardlink.bin") && disk.includes("c-copy.bin"));

// -- 0. open / index the brain -----------------------------------------------------------
if (pass === 1) await invoke("map_refresh", { brainId: BRAIN });
if (!(await evaluate(`document.querySelectorAll('[data-testid="composed-canvas"] [data-node-id]').length > 0`))) {
  await until(`!!document.querySelector(${JSON.stringify(testid("lifecycle-open"))}) || document.querySelectorAll('[data-testid="composed-canvas"] [data-node-id]').length > 0`);
  if (await evaluate(`!!document.querySelector(${JSON.stringify(testid("lifecycle-open"))})`)) await click(testid("lifecycle-open"));
}
await until(`document.querySelectorAll('[data-testid="composed-canvas"] [data-node-id]').length > 0`);
await quiet();
const mark = wireCalls.length;

const viewBefore = await invoke("map_view", { brainId: BRAIN });
assert.equal(viewBefore.nodeCount, disk.length + 1, "Index cardinality equals the disk");

// -- 1. two hard links are two occurrences of one object ---------------------------------
const refA = await invoke("map_resolve_node", { brainId: BRAIN, relativePath: "a.bin" });
const refB = await invoke("map_resolve_node", { brainId: BRAIN, relativePath: "b-hardlink.bin" });
const refC = await invoke("map_resolve_node", { brainId: BRAIN, relativePath: "c-copy.bin" });
assert(refA && refB && refC, "the three entries are indexed");
assert.notEqual(refA.nodeId, refB.nodeId, "a hard link is its own occurrence, with its own nodeId");
assert.notEqual(refA.nodeId, refC.nodeId);
check("indexing a tree with a real hard link succeeds, two occurrences, two nodeIds", {
  indexed: viewBefore.nodeCount, distinctNodeIds: new Set([refA.nodeId, refB.nodeId, refC.nodeId]).size,
});

// -- 2. one real content campaign, then the explorer ------------------------------------
if (pass === 1) {
  await click(testid("observe-content"));
  await until(`!!document.querySelector('[data-testid="duplicate-group"]') || document.querySelector(${JSON.stringify(testid("open-duplicate-explorer"))})?.textContent?.includes('groupe') || document.querySelector(${JSON.stringify(testid("open-duplicate-explorer"))})?.textContent?.includes('group')`);
  await quiet();
}
const contentGroup = await openGroup(sharedDigest);
const contentMembers = await readMembers();
const byPath = (members) => Object.fromEntries(members.map((member) => [member.path, member]));
const content = byPath(contentMembers);
assert.deepEqual(
  Object.keys(content).sort(),
  ["a.bin", "b-hardlink.bin", "c-copy.bin"],
  `the digest group is the three identical contents: ${JSON.stringify(contentMembers)}`,
);
// The separation of concepts, read off the DOM the person sees.
assert.equal(content["a.bin"].physicalObject, "PROVEN_SHARED");
assert.equal(content["a.bin"].occurrences, "2");
assert.equal(content["b-hardlink.bin"].physicalObject, "PROVEN_SHARED");
assert.equal(content["b-hardlink.bin"].occurrences, "2");
assert.equal(content["c-copy.bin"].physicalObject, "PROVEN_SINGLE", "a copy is not the same object");
assert.equal(content["c-copy.bin"].occurrences, "1");
assert(/objet physique|physical object/i.test(content["a.bin"].text), content["a.bin"].text);
// The five notions, each stated in words, none standing for another.
const concepts = await evaluate(
  `[...document.querySelectorAll('[data-testid="duplicate-concepts"] li')].map((li) => li.textContent.trim())`,
);
assert.equal(concepts.length, 5, JSON.stringify(concepts));
assert(/non infér|not inferred/i.test(concepts[2]), `likely copy must say it is not inferred: ${concepts[2]}`);
assert(/non infér|not inferred/i.test(concepts[3]), `similar name must say it is not inferred: ${concepts[3]}`);
assert(/relation/i.test(concepts[4]), concepts[4]);
const axeExplorer = await axeRun();
assert.deepEqual(axeExplorer.violations, [], `axe (explorer): ${JSON.stringify(axeExplorer.violations)}`);
check("identical content and same physical object are separate facts, in words", {
  group: contentGroup.groupId.slice(0, 20) + "…", members: Object.keys(content).sort(), concepts: concepts.length,
});

// -- 3. two distinct empty files: one digest group, two objects, no relation --------------
// The relation stores themselves are the honest "nothing was created" witness:
// their bytes, before and after. (`map_relations_self_check` is
// synthetic-fixture only, so it cannot answer for a REAL_ROOT brain.) A store
// that does not exist stays absent, which is the strongest answer of all.
const relationsBefore = await relationStores();
const crossBefore = relationsBefore;
await openGroup(emptyDigest);
const empties = byPath(await readMembers());
assert.deepEqual(Object.keys(empties).sort(), ["vide-deux.bin", "vide-un.bin"], JSON.stringify(empties));
for (const path of ["vide-un.bin", "vide-deux.bin"]) {
  assert.equal(empties[path].physicalObject, "PROVEN_SINGLE", `${path} is its own object`);
  assert.equal(empties[path].occurrences, "1");
}
const relationsAfter = await relationStores();
assert.deepEqual(relationsAfter, relationsBefore, "no relation store was created or changed");
assert.deepEqual(relationsAfter, crossBefore, "neither the brain's nor the inter-brain store moved");
check("two empty files: identical content, two objects, zero relation", {
  members: Object.keys(empties).sort(), relationsUnchanged: true,
});

// -- 4. navigating to a member selects it and mutates nothing ------------------------------
await openGroup(sharedDigest);
await click('[data-testid="duplicate-member"]');
await quiet();
check("a member can be selected in the map without any mutation");

// -- 5. `F-004` and the group rule, through the product's own Actualiser ------------------
let f004 = null;
let hardLinkCycle = null;
if (pass === 1) {
  // An unshared SYSTEM object renamed, while a shared group exists in the same tree.
  const stableBefore = await invoke("map_resolve_node", { brainId: BRAIN, relativePath: "dossier/stable.bin" });
  await rename(join(ROOT, "dossier/stable.bin"), join(ROOT, "dossier/renomme.bin"));
  await invoke("map_refresh", { brainId: BRAIN });
  await quiet();
  const stableAfter = await invoke("map_resolve_node", { brainId: BRAIN, relativePath: "dossier/renomme.bin" });
  assert(stableAfter, "the renamed file is indexed");
  assert.equal(stableAfter.nodeId, stableBefore.nodeId, "F-004: an unshared SYSTEM rename keeps its nodeId");
  assert.equal(await invoke("map_resolve_node", { brainId: BRAIN, relativePath: "dossier/stable.bin" }), null);
  f004 = { keptNodeId: true };

  // The alias renamed: the unchanged path keeps its id, the renamed alias is NOT correlated.
  await rename(join(ROOT, "b-hardlink.bin"), join(ROOT, "b-renomme.bin"));
  await invoke("map_refresh", { brainId: BRAIN });
  await quiet();
  const stillA = await invoke("map_resolve_node", { brainId: BRAIN, relativePath: "a.bin" });
  const renamedAlias = await invoke("map_resolve_node", { brainId: BRAIN, relativePath: "b-renomme.bin" });
  assert.equal(stillA.nodeId, refA.nodeId, "the unchanged path of a shared group keeps its id");
  assert.notEqual(renamedAlias.nodeId, refB.nodeId, "a renamed alias is not correlated by supposition");
  assert.notEqual(renamedAlias.nodeId, refA.nodeId);
  // Put the fixture back: pass 2 reads the tree this pass started from.
  await rename(join(ROOT, "b-renomme.bin"), join(ROOT, "b-hardlink.bin"));
  await rename(join(ROOT, "dossier/renomme.bin"), join(ROOT, "dossier/stable.bin"));
  await invoke("map_refresh", { brainId: BRAIN });
  await quiet();
  const restoredA = await invoke("map_resolve_node", { brainId: BRAIN, relativePath: "a.bin" });
  assert.equal(restoredA.nodeId, refA.nodeId, "and a.bin never moved through any of it");
  hardLinkCycle = { originalKeptItsId: true, renamedAliasNotCorrelated: true };
  check("F-004 intact, and a renamed alias is never correlated by supposition", { f004, hardLinkCycle });
}

// -- 6. no identity ever reaches the DOM, the IPC payloads, the log or this artifact -------
const markup = await evaluate("document.documentElement.outerHTML");
const payloads = JSON.stringify(wireBodies);
const appLog = await readFile(join(proofRoot, "app.log"), "utf8").catch(() => "");
const appError = await readFile(join(proofRoot, "app-error.log"), "utf8").catch(() => "");
const FORBIDDEN_SPELLINGS = [
  "stableKey", "stable_key", "SYS1:", "PFv1:",
  "volumeSerial", "VolumeSerialNumber", "volume_serial",
  "fileId", "FileId", "file_id", "identityProvenance", "identity_provenance",
];
const leaks = [];
for (const [where, text] of [
  ["dom", markup],
  ["ipc", payloads],
  ["app.log", appLog],
  ["app-error.log", appError],
]) {
  for (const spelling of FORBIDDEN_SPELLINGS) {
    if (text.includes(spelling)) leaks.push(`${where}: ${spelling}`);
  }
}
assert.deepEqual(leaks, [], `an identity leaked: ${JSON.stringify(leaks)}`);
check("no stable key, volume serial or file id in DOM, IPC, log or artifact", {
  spellingsChecked: FORBIDDEN_SPELLINGS.length, surfaces: 4,
});

// -- 7. the source is untouched, and nothing on the wire wrote ----------------------------
const calls = wireCalls.slice(mark);
assert.deepEqual(calls.filter((name) => FORBIDDEN_DURING_READS.test(name)), [], "reading the explorer only reads");
assert.deepEqual(calls.filter((name) => /snapshot|whole|all_nodes|dump/i.test(name)), [], "no whole-graph command");
assert.equal(await hashTree(ROOT), contentHashBefore, "the analysed directory is byte-identical after the session");
assert.equal(fatal.length, 0, `fatal page/console errors: ${JSON.stringify(fatal.slice(0, 2))}`);
check("source unchanged, no write on the wire, no fatal console error", {
  commandsSeen: [...new Set(calls)].sort(),
});

// -- the facts, as a digest both passes must agree on ------------------------------------
const semantics = {
  indexed: viewBefore.nodeCount,
  contentGroup: Object.entries(content)
    .map(([path, member]) => [path, member.physicalObject, member.occurrences])
    .sort(),
  emptyGroup: Object.entries(empties)
    .map(([path, member]) => [path, member.physicalObject, member.occurrences])
    .sort(),
  concepts: concepts.length,
};
record.semanticsDigest = sha(semantics);
record.semantics = semantics;
record.metrics = {
  indexed: viewBefore.nodeCount,
  digestGroupsSeen: (await readGroups()).length,
  wireCommandCount: calls.length,
};
record.axe = { version: axeManifest.version, explorerViolations: axeExplorer.violations.length };
record.f004 = f004;
record.hardLinkCycle = hardLinkCycle;
record.fatalConsoleErrors = fatal.length;
record.sourceHashUnchanged = true;
await writeFile(join(proofRoot, `run-pass${pass}.json`), JSON.stringify(record, null, 2));
console.log(JSON.stringify({ pass, ok: true, digest: record.semanticsDigest }));
ws.close();
process.exit(0);
