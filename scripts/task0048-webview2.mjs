// TASK-0048 — real WebView2 acceptance of the V1 exact-subtree exclusion policy.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { setTimeout as pause } from "node:timers/promises";

const port = Number(process.argv[2]);
const variant = process.argv[3];
const phase = Number(process.argv[4]);
assert(/^task0048-[a-f0-9]+$/.test(variant));
assert([1, 2].includes(phase));
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
const IDS = { A: seed.brainA, B: seed.brainB, C: seed.brainC };
const proofRoot = join(".filetopo-sandbox", variant);
const writeJson = (name, value) =>
  writeFile(join(proofRoot, name), JSON.stringify(value, null, 1));

// ---- CDP ---------------------------------------------------------------------------
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
ws.addEventListener("message", ({ data }) => {
  const event = JSON.parse(data);
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
    throw new Error(
      answer.exceptionDetails.exception?.description ?? JSON.stringify(answer.exceptionDetails),
    );
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
async function untilTrue(label, predicate, limit = 120000) {
  const started = Date.now();
  while (Date.now() - started < limit) {
    if (await predicate()) return;
    await pause(150);
  }
  throw new Error(`timeout: ${label}`);
}
const exposedPolicyPayloads = [];
async function invoke(command, args = {}) {
  const result = await evaluate(
    `window.__TAURI_INTERNALS__.invoke(${JSON.stringify(command)},${JSON.stringify(args)})`,
  );
  if (command.startsWith("map_brain_exclusions")) {
    exposedPolicyPayloads.push(JSON.stringify({ args, result }));
  }
  return result;
}
await send("Runtime.enable");
await send("Log.enable");
await send("Page.enable");

// ---- real browser input -------------------------------------------------------------
async function center(selector) {
  return evaluate(`(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return null;
    element.scrollIntoView({ block: 'center', inline: 'center' });
    const box = element.getBoundingClientRect();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2, w: box.width, h: box.height };
  })()`);
}
async function click(selector) {
  const box = await center(selector);
  assert(box && box.w > 0 && box.h > 0, `not clickable: ${selector}`);
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: box.x, y: box.y });
  await send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: box.x,
    y: box.y,
    button: "left",
    buttons: 1,
    clickCount: 1,
  });
  await send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: box.x,
    y: box.y,
    button: "left",
    buttons: 0,
    clickCount: 1,
  });
  await pause(100);
}
const KEYS = {
  Tab: { code: "Tab", vk: 9 },
  Enter: { code: "Enter", vk: 13, text: "\r" },
};
async function press(key) {
  const spec = KEYS[key];
  await send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key,
    code: spec.code,
    windowsVirtualKeyCode: spec.vk,
    nativeVirtualKeyCode: spec.vk,
    ...(spec.text ? { text: spec.text, unmodifiedText: spec.text } : {}),
  });
  await send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key,
    code: spec.code,
    windowsVirtualKeyCode: spec.vk,
    nativeVirtualKeyCode: spec.vk,
  });
  await pause(100);
}
async function selectAll() {
  await send("Input.dispatchKeyEvent", {
    type: "keyDown",
    modifiers: 2,
    key: "a",
    code: "KeyA",
    windowsVirtualKeyCode: 65,
    nativeVirtualKeyCode: 65,
    commands: ["selectAll"],
  });
  await send("Input.dispatchKeyEvent", {
    type: "keyUp",
    modifiers: 2,
    key: "a",
    code: "KeyA",
    windowsVirtualKeyCode: 65,
    nativeVirtualKeyCode: 65,
  });
}
async function typeText(text) {
  for (const character of Array.from(text)) {
    await send("Input.dispatchKeyEvent", {
      type: "keyDown",
      key: character,
      text: character,
      unmodifiedText: character,
    });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: character });
  }
  await pause(100);
}
async function keyboardAdd(text) {
  await click('[data-testid="exclusions-input"]');
  await selectAll();
  await typeText(text);
  await press("Tab");
  assert.equal(
    await evaluate("document.activeElement?.getAttribute('data-testid')"),
    "exclusions-add",
  );
  await press("Enter");
}

// ---- evidence helpers ---------------------------------------------------------------
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
const policy = (brainId) => invoke("map_brain_exclusions", { brainId });
const journal = (brainId) =>
  invoke("map_change_journal", { brainId, natures: [], after: null, limit: 100 });
const resolveNode = (brainId, relativePath) =>
  invoke("map_resolve_node", { brainId, relativePath });
const rulesOnScreen = () =>
  evaluate(
    "Array.from(document.querySelectorAll('[data-testid=exclusions-list] code')).map(e => e.textContent)",
  );

await until("document.querySelector('[data-testid=exclusions-input]') !== null");

let result;
if (phase === 1) {
  // Three independent Indexes and watchers, including A/C on the same source.
  for (const brainId of [IDS.A, IDS.B, IDS.C]) {
    await invoke("map_refresh", { brainId });
  }
  await click('[data-testid="lifecycle-open"]');
  await until(`document.querySelector('[data-testid=report-brain]')?.textContent?.includes(${JSON.stringify(IDS.A)})`);

  // FR and EN are both the real runtime, not static string checks only.
  const frenchSafety = await evaluate(
    "document.querySelector('[data-testid=exclusions]')?.textContent?.includes('points d’analyse')",
  );
  await click('[data-testid="language-en"]');
  await until("document.querySelector('[data-testid=exclusions]')?.textContent?.includes('reparse points')");
  const englishSafety = true;
  await click('[data-testid="language-fr"]');

  const sourceBeforePolicy = await hashTree(seed.rootShared);
  await keyboardAdd("skip");
  await untilTrue("A policy applied from keyboard UI", async () => {
    const record = await policy(IDS.A);
    return !record.applicationRequired && record.rules.join(",") === "skip";
  });
  assert.deepEqual(await rulesOnScreen(), ["skip"]);
  const sourceAfterPolicy = await hashTree(seed.rootShared);
  assert.equal(sourceAfterPolicy, sourceBeforePolicy, "policy changed the physical source");

  const cPolicy = await invoke("map_brain_exclusions_replace", {
    brainId: IDS.C,
    rules: ["other"],
  });
  assert.deepEqual(cPolicy.rules, ["other"]);
  assert.equal(cPolicy.applicationRequired, false);
  assert.deepEqual((await policy(IDS.B)).rules, []);
  assert.equal((await journal(IDS.A)).total, 0, "A policy fabricated source events");
  assert.equal((await journal(IDS.C)).total, 0, "C policy fabricated source events");
  assert.equal(await resolveNode(IDS.A, "skip/hidden.txt"), null);
  assert.notEqual(await resolveNode(IDS.A, "other/c-only.txt"), null);
  assert.notEqual(await resolveNode(IDS.C, "skip/hidden.txt"), null);
  assert.equal(await resolveNode(IDS.C, "other/c-only.txt"), null);

  // Rejected traversal remains only a draft: no optimistic policy state.
  await keyboardAdd("../secret");
  await until("document.querySelector('[data-testid=exclusions-error]') !== null");
  assert.deepEqual((await policy(IDS.A)).rules, ["skip"]);
  assert.deepEqual(await rulesOnScreen(), ["skip"]);
  assert.equal(
    await evaluate("document.querySelector('[data-testid=exclusions-input]').value"),
    "../secret",
  );

  // Watcher: shared physical mutation is excluded for A, included for C.
  await writeFile(join(seed.rootShared, "skip", "hidden.txt"), "synthetic hidden changed and longer\n");
  await untilTrue("C watcher sees included shared mutation", async () => (await journal(IDS.C)).total >= 1);
  assert.equal((await journal(IDS.A)).total, 0, "excluded watcher hint changed A");
  const cAfterExcludedForA = (await journal(IDS.C)).total;

  // Included for both policies: normal watcher reconciliation.
  await writeFile(join(seed.rootShared, "common", "visible.txt"), "synthetic visible changed and longer\n");
  await untilTrue("A watcher sees included mutation", async () => (await journal(IDS.A)).total >= 1);
  await untilTrue("C watcher sees second included mutation", async () => (await journal(IDS.C)).total > cAfterExcludedForA);
  const aAfterIncluded = (await journal(IDS.A)).total;

  // Removing through the UI materialises the subtree without inventing an event.
  await click('[data-testid="exclusions-remove-skip"]');
  await untilTrue("A exclusion removed", async () => {
    const record = await policy(IDS.A);
    return !record.applicationRequired && record.rules.length === 0;
  });
  assert.notEqual(await resolveNode(IDS.A, "skip/hidden.txt"), null);
  assert.equal((await journal(IDS.A)).total, aAfterIncluded);

  // Source absent: policy stays readable/writable and the old Index stays open.
  const offline = `${seed.rootShared}.offline`;
  await rename(seed.rootShared, offline);
  await keyboardAdd("pending");
  await untilTrue("pending policy visible while source absent", async () => {
    const record = await policy(IDS.A);
    return record.applicationRequired && record.rules.join(",") === "pending";
  });
  assert(await invoke("map_open", { brainId: IDS.A }), "last Index must remain open");
  await rename(offline, seed.rootShared);
  await untilTrue(
    "watcher applies pending policy when source returns",
    async () => !(await policy(IDS.A)).applicationRequired,
  );
  assert.equal((await journal(IDS.A)).total, aAfterIncluded);

  const sourceAfterConfiguration = await hashTree(seed.rootShared);
  const payloadText = exposedPolicyPayloads.join("\n");
  assert(!payloadText.includes(seed.rootShared));
  assert(!payloadText.includes(seed.rootSolo));
  result = {
    phase,
    languages: { frenchSafety, englishSafety },
    policies: {
      A: await policy(IDS.A),
      B: await policy(IDS.B),
      C: await policy(IDS.C),
    },
    sourceSha256UnchangedByPolicy: sourceBeforePolicy === sourceAfterPolicy,
    sourceRestoredAfterAbsence: (await stat(seed.rootShared)).isDirectory(),
    journal: {
      A: (await journal(IDS.A)).total,
      B: (await journal(IDS.B)).total,
      C: (await journal(IDS.C)).total,
    },
    watcher: {
      excludedMutationIgnoredByA: true,
      includedMutationObservedByA: true,
      sharedMutationObservedByC: true,
    },
    rejectedRuleStayedDraftOnly: true,
    removedContentReindexedWithoutPolicyEvent: true,
    sourceAfterConfigurationSha256: sourceAfterConfiguration,
    pathLeakInPolicyPayloads: false,
  };
} else {
  await untilTrue("persisted A policy on restart", async () => {
    const record = await policy(IDS.A);
    return !record.applicationRequired && record.rules.join(",") === "pending";
  });
  await untilTrue("persisted rule shown after restart", async () =>
    (await rulesOnScreen()).includes("pending"),
  );
  const policies = {
    A: await policy(IDS.A),
    B: await policy(IDS.B),
    C: await policy(IDS.C),
  };
  assert.deepEqual(policies.A.rules, ["pending"]);
  assert.deepEqual(policies.B.rules, []);
  assert.deepEqual(policies.C.rules, ["other"]);
  assert(await invoke("map_open", { brainId: IDS.A }));
  assert(await invoke("map_open", { brainId: IDS.B }));
  assert(await invoke("map_open", { brainId: IDS.C }));
  const payloadText = exposedPolicyPayloads.join("\n");
  assert(!payloadText.includes(seed.rootShared));
  assert(!payloadText.includes(seed.rootSolo));
  result = {
    phase,
    policies,
    restartPersistence: true,
    threeIndexesOpen: true,
    ruleVisibleInRealUi: true,
    pathLeakInPolicyPayloads: false,
    journal: {
      A: (await journal(IDS.A)).total,
      B: (await journal(IDS.B)).total,
      C: (await journal(IDS.C)).total,
    },
  };
}

await writeJson(`phase${phase}.json`, result);
await writeJson(`phase${phase}-fatal-count.json`, fatal.length);
ws.close();
if (fatal.length > 0) {
  console.error(`TASK-0048 phase ${phase}: ${fatal.length} fatal console error(s)`);
  process.exitCode = 1;
} else {
  console.log(`TASK-0048 phase ${phase}: PASS`);
}
