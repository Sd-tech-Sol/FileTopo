/**
 * Reserve `X5` — the guard that keeps a later task from overwriting the
 * canonical evidence of an earlier `VERIFIED` one.
 *
 * `map_write_run_artifact` writes by **replacement**. `TASK-0018` migrated the
 * measurement loop and the relations scenario to brains but left them writing
 * `TASK-0016-H9-webview2.json` and `TASK-0017-J12-webview2.json`, so pressing
 * a button in the current runtime would have destroyed two published proofs.
 * These tests fail if that ever comes back — including through a literal
 * spelled out again somewhere instead of imported from `runArtifacts.ts`.
 *
 * **`X5` extends when a task is verified.** `ACTION-0029` made `TASK-0018`
 * `VERIFIED` and `ACTION-0031` made `TASK-0019` `VERIFIED`, so their own proofs
 * — including the regression artefacts they produced themselves — joined the
 * protected list, and the `TASK-0020` runtime writes under `TASK-0020`. The
 * rule did not change; the list it applies to grew twice, and that growth is
 * what the tests below hold.
 *
 * **`ACTION-0032` made `TASK-0020` `VERIFIED`**, and the list grew a third
 * time. `TASK-0022` renamed its current outputs, leaving the protected/runtime
 * intersection empty until the current task itself became verified.
 *
 * **`ACTION-0036` made `TASK-0022` `VERIFIED`**. Exactly its eight canonical
 * proofs are sealed; H9, K12 and every abandonment variant remain noncanonical
 * and unprotected.
 *
 * **`ACTION-0039` made `TASK-0023` `VERIFIED`**, and the list grew a fifth
 * time — by exactly two names, the `EC15` passes it was controlled on. Every
 * other artefact `TASK-0023` wrote stays unprotected, because a verification
 * seals the evidence it ruled on and not everything the slice happened to
 * produce.
 *
 * **`ACTION-0041` made `TASK-0024` `VERIFIED`**, and the list grew a sixth
 * time — by exactly three names: DR15 pass1, DR15 pass2 and J12. X11 remains
 * corrective and noncanonical, and every other output of the slice stays
 * unprotected.
 *
 * **`TASK-0025` §4 migrated every destination** from `TASK-0024-*` to
 * `TASK-0025-*` before replaying anything — the sealed three, the replays and
 * the corrective `X11` destination alike. The protected/runtime intersection
 * is empty again and `writesUnderItsOwnTaskOnly` is `true`, obtained by moving
 * destinations and **not** by shrinking the seal: the three executable
 * guards — Rust, TypeScript, PowerShell — still carry the same thirty-two
 * names in the same order.
 */

import { describe, expect, it } from "vitest";
// The sources themselves, as text. Read through Vite's `?raw` rather than
// through `node:fs`, because this checkout ships no Node type package and
// `X5` is not a reason to add a dependency.
import brainScenarioSource from "./brainScenario.ts?raw";
import composedScenarioSource from "./composedScenario.ts?raw";
import contentScenarioSource from "./contentScenario.ts?raw";
import crossScenarioSource from "./crossScenario.ts?raw";
import dreScenarioSource from "./dreScenario.ts?raw";
import mapAppSource from "./MapApp.tsx?raw";
import relationScenarioSource from "./relationScenario.ts?raw";
import topographicScenarioSource from "./topographicScenario.ts?raw";
import {
  H9_REGRESSION_ABANDON_ARTIFACT,
  H9_REGRESSION_ARTIFACT,
  J12_REGRESSION_ABANDON_ARTIFACT,
  J12_REGRESSION_ARTIFACT,
  K11_ARTIFACT,
  PROTECTED_RUN_ARTIFACTS,
  RUNTIME_RUN_ARTIFACTS,
  SEALED_RUNTIME_DESTINATIONS,
  artifactTaskId,
  dr15Artifact,
  ec15Artifact,
  k12Artifact,
  l12Artifact,
  m12Artifact,
  n15Artifact,
  runtimeWriteOwnership,
  sr15Artifact,
} from "./runArtifacts";
// The Rust write gate itself, as text: `PROTECTED_RUN_ARTIFACTS` in
// `commands.rs` is what actually refuses a write, and the TypeScript list
// below is only its mirror. Read through `?raw` for the same reason as the
// scenario sources — no `node:fs`, no new dependency.
import rustGateSource from "../../src-tauri/src/map/commands.rs?raw";
import powershellGateSource from "../../scripts/protected-run-artifacts.ps1?raw";

/** Every source file of this runtime that may write a run artefact. */
const WRITING_SOURCES: ReadonlyArray<readonly [string, string]> = [
  ["src/map/MapApp.tsx", mapAppSource],
  ["src/map/relationScenario.ts", relationScenarioSource],
  ["src/map/brainScenario.ts", brainScenarioSource],
  ["src/map/composedScenario.ts", composedScenarioSource],
  ["src/map/crossScenario.ts", crossScenarioSource],
  ["src/map/topographicScenario.ts", topographicScenarioSource],
  ["src/map/contentScenario.ts", contentScenarioSource],
  ["src/map/dreScenario.ts", dreScenarioSource],
];

const ORIGINAL_19_PROTECTED = [
  "TASK-0016-H1-H7-verification.json",
  "TASK-0016-H9-webview2.json",
  "TASK-0017-J11-isolation.json",
  "TASK-0017-J12-webview2.json",
  "TASK-0018-K11-readonly-and-isolation.json",
  "TASK-0018-K12-webview2-pass1.json",
  "TASK-0018-K12-webview2-pass2.json",
  "TASK-0018-J12-relations-regression-webview2.json",
  "TASK-0019-J12-relations-regression-webview2.json",
  "TASK-0019-K11-readonly-regression-webview2.json",
  "TASK-0019-K12-foundation-regression-webview2-pass1.json",
  "TASK-0019-K12-foundation-regression-webview2-pass2.json",
  "TASK-0019-L12-composed-view-webview2-pass1.json",
  "TASK-0019-L12-composed-view-webview2-pass2.json",
  "TASK-0020-M12-interbrain-relations-webview2-pass1.json",
  "TASK-0020-M12-interbrain-relations-webview2-pass2.json",
  "TASK-0020-J12-intrabrain-regression-webview2.json",
  "TASK-0020-L12-composed-regression-webview2-pass1.json",
  "TASK-0020-L12-composed-regression-webview2-pass2.json",
] as const;

const TASK_0022_CANONICAL_EVIDENCE = [
  "TASK-0022-J12-intrabrain-relations-regression-webview2.json",
  "TASK-0022-K11-readonly-isolation-regression-webview2.json",
  "TASK-0022-L12-composed-view-regression-webview2-pass1.json",
  "TASK-0022-L12-composed-view-regression-webview2-pass2.json",
  "TASK-0022-M12-interbrain-relations-regression-webview2-pass1.json",
  "TASK-0022-M12-interbrain-relations-regression-webview2-pass2.json",
  "TASK-0022-N15-topographic-node-graph-webview2-pass1.json",
  "TASK-0022-N15-topographic-node-graph-webview2-pass2.json",
] as const;

const TASK_0022_NONCANONICAL = [
  "TASK-0022-H9-composed-runtime-regression-webview2.json",
  "TASK-0022-K12-foundation-regression-webview2-pass1.json",
  "TASK-0022-K12-foundation-regression-webview2-pass2.json",
  "TASK-0022-H9-composed-runtime-regression-webview2-abandon.json",
  "TASK-0022-J12-intrabrain-relations-regression-webview2-abandon.json",
  "TASK-0022-K12-foundation-regression-webview2-pass1-abandon.json",
  "TASK-0022-K12-foundation-regression-webview2-pass2-abandon.json",
  "TASK-0022-L12-composed-view-regression-webview2-pass1-abandon.json",
  "TASK-0022-L12-composed-view-regression-webview2-pass2-abandon.json",
  "TASK-0022-M12-interbrain-relations-regression-webview2-pass1-abandon.json",
  "TASK-0022-M12-interbrain-relations-regression-webview2-pass2-abandon.json",
  "TASK-0022-N15-topographic-node-graph-webview2-pass1-abandon.json",
  "TASK-0022-N15-topographic-node-graph-webview2-pass2-abandon.json",
] as const;

/** The two proofs `ACTION-0039` sealed — and the whole of what it sealed. */
const TASK_0023_CANONICAL_EVIDENCE = [
  "TASK-0023-EC15-exact-content-observations-webview2-pass1.json",
  "TASK-0023-EC15-exact-content-observations-webview2-pass2.json",
] as const;

/**
 * Everything else `TASK-0023` spells as a destination.
 *
 * Enumerated by hand rather than derived from `RUNTIME_RUN_ARTIFACTS` minus
 * the sealed pair: a derived list would agree with any seal, however wide,
 * and the claim under test is precisely that the seal did not widen.
 */
const TASK_0023_NONCANONICAL = [
  "TASK-0023-H9-composed-runtime-regression-webview2.json",
  "TASK-0023-H9-composed-runtime-regression-webview2-abandon.json",
  "TASK-0023-J12-intrabrain-relations-regression-webview2.json",
  "TASK-0023-J12-intrabrain-relations-regression-webview2-abandon.json",
  "TASK-0023-K11-readonly-isolation-regression-webview2.json",
  "TASK-0023-K12-foundation-regression-webview2-pass1.json",
  "TASK-0023-K12-foundation-regression-webview2-pass1-abandon.json",
  "TASK-0023-K12-foundation-regression-webview2-pass2.json",
  "TASK-0023-K12-foundation-regression-webview2-pass2-abandon.json",
  "TASK-0023-L12-composed-view-regression-webview2-pass1.json",
  "TASK-0023-L12-composed-view-regression-webview2-pass1-abandon.json",
  "TASK-0023-L12-composed-view-regression-webview2-pass2.json",
  "TASK-0023-L12-composed-view-regression-webview2-pass2-abandon.json",
  "TASK-0023-M12-interbrain-relations-regression-webview2-pass1.json",
  "TASK-0023-M12-interbrain-relations-regression-webview2-pass1-abandon.json",
  "TASK-0023-M12-interbrain-relations-regression-webview2-pass2.json",
  "TASK-0023-M12-interbrain-relations-regression-webview2-pass2-abandon.json",
  "TASK-0023-N15-topographic-node-graph-webview2-pass1.json",
  "TASK-0023-N15-topographic-node-graph-webview2-pass1-abandon.json",
  "TASK-0023-N15-topographic-node-graph-webview2-pass2.json",
  "TASK-0023-N15-topographic-node-graph-webview2-pass2-abandon.json",
] as const;

/** The exact three proofs sealed when `ACTION-0041` verified `TASK-0024`. */
const TASK_0024_CANONICAL_EVIDENCE = [
  "TASK-0024-DR15-deterministic-relation-engine-webview2-pass1.json",
  "TASK-0024-DR15-deterministic-relation-engine-webview2-pass2.json",
  "TASK-0024-J12-intrabrain-relations-regression-webview2.json",
] as const;

/** Every other name the `TASK-0024` runtime spelled, none of them sealed. */
const TASK_0024_NONCANONICAL = [
  "TASK-0024-H9-composed-runtime-regression-webview2.json",
  "TASK-0024-H9-composed-runtime-regression-webview2-abandon.json",
  "TASK-0024-J12-intrabrain-relations-regression-webview2-abandon.json",
  "TASK-0024-K11-readonly-isolation-regression-webview2.json",
  "TASK-0024-K12-foundation-regression-webview2-pass1.json",
  "TASK-0024-K12-foundation-regression-webview2-pass1-abandon.json",
  "TASK-0024-K12-foundation-regression-webview2-pass2.json",
  "TASK-0024-K12-foundation-regression-webview2-pass2-abandon.json",
  "TASK-0024-L12-composed-view-regression-webview2-pass1.json",
  "TASK-0024-L12-composed-view-regression-webview2-pass1-abandon.json",
  "TASK-0024-L12-composed-view-regression-webview2-pass2.json",
  "TASK-0024-L12-composed-view-regression-webview2-pass2-abandon.json",
  "TASK-0024-M12-interbrain-relations-regression-webview2-pass1.json",
  "TASK-0024-M12-interbrain-relations-regression-webview2-pass1-abandon.json",
  "TASK-0024-M12-interbrain-relations-regression-webview2-pass2.json",
  "TASK-0024-M12-interbrain-relations-regression-webview2-pass2-abandon.json",
  "TASK-0024-N15-topographic-node-graph-webview2-pass1.json",
  "TASK-0024-N15-topographic-node-graph-webview2-pass1-abandon.json",
  "TASK-0024-N15-topographic-node-graph-webview2-pass2.json",
  "TASK-0024-N15-topographic-node-graph-webview2-pass2-abandon.json",
  "TASK-0024-EC15-exact-content-observations-webview2-pass1.json",
  "TASK-0024-EC15-exact-content-observations-webview2-pass2.json",
  "TASK-0024-X11-generic-brain-webview2.json",
] as const;

describe("X5 — the runtime never writes over canonical evidence", () => {
  it("TASK-0025 migrated every destination, so nothing intersects the seal", () => {
    const sealed = SEALED_RUNTIME_DESTINATIONS as readonly string[];
    const collisions = (PROTECTED_RUN_ARTIFACTS as readonly string[]).filter((name) =>
      (RUNTIME_RUN_ARTIFACTS as readonly string[]).includes(name),
    );
    expect(sealed).toStrictEqual([]);
    expect(collisions).toStrictEqual([]);
    // The intersection is empty because the destinations moved, never because
    // the seal shrank: TASK-0024's three canonical names are still protected
    // and are no longer spelled as destinations.
    for (const name of TASK_0024_CANONICAL_EVIDENCE) {
      expect(PROTECTED_RUN_ARTIFACTS as readonly string[]).toContain(name);
      expect(RUNTIME_RUN_ARTIFACTS as readonly string[]).not.toContain(name);
    }
  });

  it("H9, K12 and abandonment variants stay noncanonical and unprotected", () => {
    for (const name of TASK_0022_NONCANONICAL) {
      expect(PROTECTED_RUN_ARTIFACTS as readonly string[]).not.toContain(name);
    }
  });

  it("the protected set is the unchanged twenty-nine plus TASK-0024's three", () => {
    expect(PROTECTED_RUN_ARTIFACTS).toStrictEqual([
      ...ORIGINAL_19_PROTECTED,
      ...TASK_0022_CANONICAL_EVIDENCE,
      ...TASK_0023_CANONICAL_EVIDENCE,
      ...TASK_0024_CANONICAL_EVIDENCE,
    ]);
    expect(PROTECTED_RUN_ARTIFACTS).toHaveLength(32);
    // Append-only: the twenty-nine that were sealed before `ACTION-0041` are
    // still there, in the same order, and nothing was silently deduplicated.
    expect(PROTECTED_RUN_ARTIFACTS.slice(0, 29)).toStrictEqual([
      ...ORIGINAL_19_PROTECTED,
      ...TASK_0022_CANONICAL_EVIDENCE,
      ...TASK_0023_CANONICAL_EVIDENCE,
    ]);
    expect(PROTECTED_RUN_ARTIFACTS.slice(29)).toStrictEqual([
      ...TASK_0024_CANONICAL_EVIDENCE,
    ]);
    expect(new Set(PROTECTED_RUN_ARTIFACTS).size).toBe(32);
  });

  it("TASK-0024 seals only DR15 pass1/pass2 and J12", () => {
    const sealedTask0024 = (PROTECTED_RUN_ARTIFACTS as readonly string[]).filter(
      (name) => artifactTaskId(name) === "TASK-0024",
    );
    expect(sealedTask0024).toStrictEqual([...TASK_0024_CANONICAL_EVIDENCE]);
    for (const name of TASK_0024_CANONICAL_EVIDENCE) {
      expect(PROTECTED_RUN_ARTIFACTS as readonly string[]).toContain(name);
    }
  });

  it("TASK-0024 X11, replays and abandonment variants remain unprotected", () => {
    for (const name of TASK_0024_NONCANONICAL) {
      expect(PROTECTED_RUN_ARTIFACTS as readonly string[]).not.toContain(name);
    }
    expect(PROTECTED_RUN_ARTIFACTS as readonly string[]).not.toContain(
      "TASK-0024-X11-generic-brain-webview2.json",
    );
  });

  it("TASK-0018's own four proofs became protected when it was verified", () => {
    // The claim is not « the new names are free » but « the previous slice's
    // evidence has become untouchable », which is what `ACTION-0029` changed.
    for (const name of [
      "TASK-0018-K11-readonly-and-isolation.json",
      "TASK-0018-K12-webview2-pass1.json",
      "TASK-0018-K12-webview2-pass2.json",
      "TASK-0018-J12-relations-regression-webview2.json",
    ]) {
      expect(PROTECTED_RUN_ARTIFACTS as readonly string[]).toContain(name);
    }
  });

  it("TASK-0019's own six proofs became protected when it was verified", () => {
    // `ACTION-0031`. Four of the six are themselves regression replays: being a
    // replay does not make evidence less canonical once the task that published
    // it has been controlled.
    for (const name of [
      "TASK-0019-J12-relations-regression-webview2.json",
      "TASK-0019-K11-readonly-regression-webview2.json",
      "TASK-0019-K12-foundation-regression-webview2-pass1.json",
      "TASK-0019-K12-foundation-regression-webview2-pass2.json",
      "TASK-0019-L12-composed-view-webview2-pass1.json",
      "TASK-0019-L12-composed-view-webview2-pass2.json",
    ]) {
      expect(PROTECTED_RUN_ARTIFACTS as readonly string[]).toContain(name);
    }
  });

  it("TASK-0020's own five proofs became protected when it was verified", () => {
    // `ACTION-0032`. Two are the `M12` campaign's own WebView2 passes; three
    // are regression replays. Unlike the two previous extensions, these five
    // are still spelled as destinations by the runtime in this checkout — the
    // gate refuses them, and that refusal is the intended end state, not a
    // defect waiting to be fixed.
    for (const name of [
      "TASK-0020-M12-interbrain-relations-webview2-pass1.json",
      "TASK-0020-M12-interbrain-relations-webview2-pass2.json",
      "TASK-0020-J12-intrabrain-regression-webview2.json",
      "TASK-0020-L12-composed-regression-webview2-pass1.json",
      "TASK-0020-L12-composed-regression-webview2-pass2.json",
    ]) {
      expect(PROTECTED_RUN_ARTIFACTS as readonly string[]).toContain(name);
    }
  });

  it("TASK-0022's eight canonical proofs became protected when it was verified", () => {
    for (const name of TASK_0022_CANONICAL_EVIDENCE) {
      expect(PROTECTED_RUN_ARTIFACTS as readonly string[]).toContain(name);
    }
  });

  it("the migrated scenarios write under TASK-0025, named as regressions", () => {
    for (const name of [
      H9_REGRESSION_ARTIFACT,
      H9_REGRESSION_ABANDON_ARTIFACT,
      J12_REGRESSION_ARTIFACT,
      J12_REGRESSION_ABANDON_ARTIFACT,
      K11_ARTIFACT,
      k12Artifact(1, "written"),
      l12Artifact(1, "written"),
    ]) {
      expect(name.startsWith("TASK-0025-")).toBe(true);
      expect(name).toContain("regression");
      expect(name.endsWith(".json")).toBe(true);
    }
  });

  it("the migrated names are exactly the ones this slice froze", () => {
    expect(H9_REGRESSION_ARTIFACT).toBe(
      "TASK-0025-H9-composed-runtime-regression-webview2.json",
    );
    expect(J12_REGRESSION_ARTIFACT).toBe(
      "TASK-0025-J12-intrabrain-relations-regression-webview2.json",
    );
    expect(H9_REGRESSION_ABANDON_ARTIFACT).toBe(
      "TASK-0025-H9-composed-runtime-regression-webview2-abandon.json",
    );
    expect(J12_REGRESSION_ABANDON_ARTIFACT).toBe(
      "TASK-0025-J12-intrabrain-relations-regression-webview2-abandon.json",
    );
    expect(K11_ARTIFACT).toBe(
      "TASK-0025-K11-readonly-isolation-regression-webview2.json",
    );
    expect(k12Artifact(1, "written")).toBe(
      "TASK-0025-K12-foundation-regression-webview2-pass1.json",
    );
    expect(l12Artifact(1, "written")).toBe(
      "TASK-0025-L12-composed-view-regression-webview2-pass1.json",
    );
    expect(l12Artifact(2, "written")).toBe(
      "TASK-0025-L12-composed-view-regression-webview2-pass2.json",
    );
  });

  it("M12 publishes its TASK-0025 regression evidence in two passes", () => {
    // `M12` is a criterion of this slice, not a replay of an earlier one, so
    // its name says `M12` and carries no `regression`.
    expect(m12Artifact(1, "written")).toBe(
      "TASK-0025-M12-interbrain-relations-regression-webview2-pass1.json",
    );
    expect(m12Artifact(2, "written")).toBe(
      "TASK-0025-M12-interbrain-relations-regression-webview2-pass2.json",
    );
    expect(m12Artifact(1, "abandoned")).toBe(
      "TASK-0025-M12-interbrain-relations-regression-webview2-pass1-abandon.json",
    );
    expect(m12Artifact(1, "written")).toContain("regression");
    expect(m12Artifact(1, "written")).not.toBe(m12Artifact(2, "written"));
  });

  it("N15 publishes two distinct TASK-0025 passes", () => {
    expect(n15Artifact(1, "written")).toBe(
      "TASK-0025-N15-topographic-node-graph-webview2-pass1.json",
    );
    expect(n15Artifact(2, "written")).toBe(
      "TASK-0025-N15-topographic-node-graph-webview2-pass2.json",
    );
  });

  it("TASK-0023's two EC15 proofs stay protected after migration", () => {
    expect(ec15Artifact(1)).toBe(
      "TASK-0025-EC15-exact-content-observations-webview2-pass1.json",
    );
    expect(ec15Artifact(2)).toBe(
      "TASK-0025-EC15-exact-content-observations-webview2-pass2.json",
    );
    for (const name of TASK_0023_CANONICAL_EVIDENCE) {
      expect(PROTECTED_RUN_ARTIFACTS as readonly string[]).toContain(name);
      expect(RUNTIME_RUN_ARTIFACTS as readonly string[]).not.toContain(name);
    }
  });

  it("no other TASK-0023 destination was sealed by that verification", () => {
    // The seal covers what `TASK-0023` was controlled on, not everything it
    // wrote. Its migrated replays stay writable so the next slice can rename
    // them under its own task, and an abandoned run is evidence of nothing.
    for (const name of TASK_0023_NONCANONICAL) {
      expect(PROTECTED_RUN_ARTIFACTS as readonly string[]).not.toContain(name);
    }
    const sealedTask0023 = (PROTECTED_RUN_ARTIFACTS as readonly string[]).filter(
      (name) => artifactTaskId(name) === "TASK-0023",
    );
    expect(sealedTask0023).toStrictEqual([...TASK_0023_CANONICAL_EVIDENCE]);
  });

  it("every runtime destination belongs to TASK-0025", () => {
    for (const name of [
      ...RUNTIME_RUN_ARTIFACTS,
      K11_ARTIFACT,
      k12Artifact(2, "abandoned"),
      l12Artifact(2, "abandoned"),
      m12Artifact(2, "abandoned"),
    ]) {
      expect(name.startsWith("TASK-0025-")).toBe(true);
    }
  });

  it("SR15 is a TASK-0025 destination and is not protected", () => {
    // The proof this slice publishes for itself. It is spelled here, written
    // by the scenario, and deliberately absent from every guard: only an
    // independent control adds a name to the seal.
    for (const pass of [1, 2]) {
      const name = sr15Artifact(pass);
      expect(name).toBe(
        `TASK-0025-SR15-suggestion-review-memory-webview2-pass${pass}.json`,
      );
      expect(RUNTIME_RUN_ARTIFACTS as readonly string[]).toContain(name);
      expect(PROTECTED_RUN_ARTIFACTS as readonly string[]).not.toContain(name);
    }
    expect(sr15Artifact(1)).not.toBe(sr15Artifact(2));
  });

  it("no runtime destination reuses a name from an earlier verified slice", () => {
    // TASK-0024 joined the verified slices at `ACTION-0041`, so its namespace
    // is now one of the ones the runtime must never fall back into.
    for (const name of RUNTIME_RUN_ARTIFACTS) {
      for (const owned of [
        "TASK-0016-",
        "TASK-0017-",
        "TASK-0018-",
        "TASK-0019-",
        "TASK-0020-",
        "TASK-0022-",
        "TASK-0023-",
        "TASK-0024-",
      ]) {
        expect(name.startsWith(owned)).toBe(false);
      }
    }
  });

  it("every runtime name stays acceptable to the Rust artefact guard", () => {
    // `write_run_artifact` refuses a separator, a `..`, anything outside
    // `[A-Za-z0-9._-]`, and more than 120 characters.
    for (const name of RUNTIME_RUN_ARTIFACTS) {
      expect(name).toMatch(/^[A-Za-z0-9._-]+$/);
      expect(name).not.toContain("..");
      expect(name.length).toBeLessThanOrEqual(120);
    }
  });

  it("no writing source spells a protected artefact name as a destination", () => {
    for (const [path, source] of WRITING_SOURCES) {
      expect(source.length, `${path} unreadable`).toBeGreaterThan(0);
      for (const protectedName of PROTECTED_RUN_ARTIFACTS) {
        // The name may still be *mentioned* — a comment or a `doesNotReplace`
        // field naming what is being preserved is the point. What must never
        // appear is the name as the `name:` argument of a write.
        for (const quote of ['"', "'", "`"]) {
          expect(source, `${path} writes over ${protectedName}`).not.toContain(
            `name: ${quote}${protectedName}${quote}`,
          );
        }
      }
    }
  });

  it("every artefact those sources write declares the task that owns it", () => {
    // The name and the payload have to agree. `J12`'s replay kept
    // `task: "TASK-0018"` while writing a `TASK-0019-` file, and the artefact
    // it published named the wrong owner — a reader following the `task` field
    // would have looked for it in the previous slice's evidence.
    for (const [path, source] of WRITING_SOURCES) {
      const declarations = [...source.matchAll(/task:\s*"(TASK-\d{4})"/g)].map(
        (match) => match[1],
      );
      expect(declarations.length, `${path} declares no task`).toBeGreaterThan(0);
      for (const declared of declarations) {
        expect(declared, `${path} declares ${declared}`).toBe("TASK-0025");
      }
    }
  });

  it("every write in those sources takes its name from this module", () => {
    for (const [path, source] of WRITING_SOURCES) {
      const calls = [...source.matchAll(/map_write_run_artifact[\s\S]{0,400}?name:\s*([^,\n]+)/g)];
      expect(calls.length).toBeGreaterThan(0);
      for (const call of calls) {
        const argument = call[1].trim();
        expect(
          /^(H9_REGRESSION_ARTIFACT|H9_REGRESSION_ABANDON_ARTIFACT|J12_REGRESSION_ARTIFACT|J12_REGRESSION_ABANDON_ARTIFACT|K11_ARTIFACT|X11_GENERIC_ARTIFACT|k12Artifact\(|l12Artifact\(|m12Artifact\(|n15Artifact\(|ec15Artifact\(|dr15Artifact\(|sr15Artifact\()/.test(
            argument,
          ),
          `${path}: artefact name not taken from runArtifacts.ts — ${argument}`,
        ).toBe(true);
      }
    }
  });
});

/**
 * Reserve `X8` of `ACTION-0035` — the `M12` evidence must derive its verdict,
 * never restate it.
 *
 * The published `TASK-0022` `M12` pass 2 claimed `writesUnderItsOwnTaskOnly:
 * false` and « 14 noms proteges ». Neither was true of the product: the
 * scenario had been migrated to write under `TASK-0022` but its step 28 still
 * compared the file it had just written against a literal `TASK-0020-` prefix,
 * and still counted a protected list that had grown to nineteen names two
 * verifications earlier. A harness defect, not a model defect — and one that
 * would have come back at `TASK-0023` if it had been repaired by swapping one
 * literal for the next.
 *
 * These tests hold the repair: the identity comes from the names themselves,
 * the count comes from the list the Rust gate enforces, and no writing source
 * is allowed to spell either of them out again.
 */
describe("X8 — M12 derives who owns what it writes, and how many names are protected", () => {
  /** The protected list as the Rust write gate actually declares it. */
  const rustGate = (): { declaredLength: number; names: readonly string[] } => {
    const block =
      /pub const PROTECTED_RUN_ARTIFACTS:\s*\[&str;\s*(\d+)\]\s*=\s*\[([\s\S]*?)\];/.exec(
        rustGateSource,
      );
    if (block === null) throw new Error("PROTECTED_RUN_ARTIFACTS not found in commands.rs");
    return {
      declaredLength: Number(block[1]),
      names: [...block[2].matchAll(/"([^"]+)"/g)].map((match) => match[1]),
    };
  };

  /** The protected list as the PowerShell deletion guard declares it. */
  const powershellGate = (): readonly string[] => {
    const block =
      /\$script:ProtectedRunArtifacts\s*=\s*@\(([\s\S]*?)\r?\n\)/.exec(
        powershellGateSource,
      );
    if (block === null) {
      throw new Error("ProtectedRunArtifacts not found in protected-run-artifacts.ps1");
    }
    return [...block[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);
  };

  it("the TypeScript and PowerShell lists mirror the Rust write gate exactly", () => {
    // The canonical source of `X5` is the gate that refuses the write. Any
    // count published from TypeScript is only trustworthy because this holds.
    const gate = rustGate();
    expect(gate.names).toStrictEqual([...PROTECTED_RUN_ARTIFACTS]);
    expect(powershellGate()).toStrictEqual(gate.names);
    expect(gate.declaredLength).toBe(gate.names.length);
    expect(PROTECTED_RUN_ARTIFACTS).toHaveLength(gate.declaredLength);
    expect(gate.declaredLength).toBe(32);
  });

  it("no historical protected name was dropped by this repair", () => {
    // Named one by one on purpose: a set comparison against a list this same
    // change could have shortened would prove nothing.
    for (const name of ORIGINAL_19_PROTECTED) {
      expect(PROTECTED_RUN_ARTIFACTS as readonly string[]).toContain(name);
      expect(rustGate().names).toContain(name);
      expect(powershellGate()).toContain(name);
    }
  });

  it("TASK-0022's eight sealed names stay where ACTION-0036 put them", () => {
    // Positional, in all three guards: an extension that appended correctly
    // but shifted an earlier block would still be a corrupted seal.
    expect(PROTECTED_RUN_ARTIFACTS.slice(19, 27)).toStrictEqual([
      ...TASK_0022_CANONICAL_EVIDENCE,
    ]);
    expect(rustGate().names.slice(19, 27)).toStrictEqual([
      ...TASK_0022_CANONICAL_EVIDENCE,
    ]);
    expect(powershellGate().slice(19, 27)).toStrictEqual([
      ...TASK_0022_CANONICAL_EVIDENCE,
    ]);
  });

  it("TASK-0023's two EC15 proofs retain their exact positions", () => {
    // `ACTION-0039`, in all three guards, at positions 27 and 28. Two names,
    // not three and not the whole of what `TASK-0023` wrote.
    expect(PROTECTED_RUN_ARTIFACTS.slice(27, 29)).toStrictEqual([
      ...TASK_0023_CANONICAL_EVIDENCE,
    ]);
    expect(rustGate().names.slice(27, 29)).toStrictEqual([
      ...TASK_0023_CANONICAL_EVIDENCE,
    ]);
    expect(powershellGate().slice(27, 29)).toStrictEqual([
      ...TASK_0023_CANONICAL_EVIDENCE,
    ]);
    for (const gate of [
      PROTECTED_RUN_ARTIFACTS as readonly string[],
      rustGate().names,
      powershellGate(),
    ]) {
      expect(gate.filter((name) => artifactTaskId(name) === "TASK-0023")).toStrictEqual([
        ...TASK_0023_CANONICAL_EVIDENCE,
      ]);
    }
  });

  it("the three appended names are exactly TASK-0024's canonical proofs", () => {
    expect(PROTECTED_RUN_ARTIFACTS.slice(29)).toStrictEqual([
      ...TASK_0024_CANONICAL_EVIDENCE,
    ]);
    expect(rustGate().names.slice(29)).toStrictEqual([...TASK_0024_CANONICAL_EVIDENCE]);
    expect(powershellGate().slice(29)).toStrictEqual([
      ...TASK_0024_CANONICAL_EVIDENCE,
    ]);
    for (const gate of [
      PROTECTED_RUN_ARTIFACTS as readonly string[],
      rustGate().names,
      powershellGate(),
    ]) {
      expect(gate.filter((name) => artifactTaskId(name) === "TASK-0024")).toStrictEqual([
        ...TASK_0024_CANONICAL_EVIDENCE,
      ]);
      expect(gate).not.toContain("TASK-0024-X11-generic-brain-webview2.json");
    }
  });

  it("artifactTaskId reads the owner off the name, and tells two owners apart", () => {
    // The discrimination the repair rests on. If this returned the same thing
    // for both, the derived verdict below would be worth nothing.
    expect(artifactTaskId("TASK-0020-M12-interbrain-relations-webview2-pass2.json")).toBe(
      "TASK-0020",
    );
    expect(artifactTaskId(m12Artifact(2, "written"))).toBe("TASK-0025");
    expect(artifactTaskId(dr15Artifact(2))).toBe("TASK-0025");
    expect(artifactTaskId(sr15Artifact(1))).toBe("TASK-0025");
    expect(artifactTaskId(m12Artifact(2, "written"))).not.toBe(
      artifactTaskId("TASK-0020-M12-interbrain-relations-webview2-pass2.json"),
    );
    expect(artifactTaskId("no-task-here.json")).toBeNull();
  });

  it("the M12 artefact still derives the sole task identity of the runtime", () => {
    // The identity claim is unchanged by the migration: every destination this
    // runtime spells belongs to one task, and nothing here restates which one
    // from a literal.
    const ownership = runtimeWriteOwnership();
    const written = m12Artifact(2, "written");
    expect(ownership.owningTaskId).not.toBeNull();
    expect(artifactTaskId(written)).toBe(ownership.owningTaskId);
    expect(ownership.taskIdsWritten).toStrictEqual([ownership.owningTaskId]);
  });

  it("the migrated runtime writes under TASK-0025 alone and clears the seal", () => {
    const ownership = runtimeWriteOwnership();
    expect(ownership.writesUnderItsOwnTaskOnly).toBe(true);
    expect(ownership.owningTaskId).toBe("TASK-0025");
    expect(ownership.taskIdsWritten).toStrictEqual(["TASK-0025"]);
    // TASK-0024 owns protected evidence and no longer owns any destination.
    expect(ownership.protectedTaskIds).toContain("TASK-0024");
    expect(ownership.protectedTaskIds).not.toContain("TASK-0025");
    expect(ownership.protectedDestinations).toStrictEqual([]);
  });

  it("no runtime destination is protected evidence any more", () => {
    const ownership = runtimeWriteOwnership();
    expect(PROTECTED_RUN_ARTIFACTS as readonly string[]).toContain(
      TASK_0022_CANONICAL_EVIDENCE[5],
    );
    expect(ownership.protectedDestinations).toStrictEqual([]);
    expect(ownership.protectedDestinations).toStrictEqual([
      ...SEALED_RUNTIME_DESTINATIONS,
    ]);
    expect(ownership.runtimeDestinationCount).toBe(RUNTIME_RUN_ARTIFACTS.length);
    // The names TASK-0024 wrote — sealed and noncanonical alike — are gone
    // from the destinations rather than merely allowed again.
    for (const name of [...TASK_0024_CANONICAL_EVIDENCE, ...TASK_0024_NONCANONICAL]) {
      expect(RUNTIME_RUN_ARTIFACTS as readonly string[]).not.toContain(name);
    }
    for (const name of TASK_0023_NONCANONICAL) {
      expect(ownership.protectedDestinations).not.toContain(name);
    }
  });

  it("the count M12 publishes is the count the gate enforces", () => {
    // Thirty-two today. The assertion is not only the number: it is that the
    // number published and the number enforced are the same object, so the
    // next extension of `X5` moves both at once.
    const ownership = runtimeWriteOwnership();
    expect(ownership.protectedArtifactCount).toBe(rustGate().declaredLength);
    expect(ownership.protectedArtifactCount).toBe(32);
    expect(ownership.protectedTaskIds).toStrictEqual([
      "TASK-0016",
      "TASK-0017",
      "TASK-0018",
      "TASK-0019",
      "TASK-0020",
      "TASK-0022",
      "TASK-0023",
      "TASK-0024",
    ]);
    // The owning task is deliberately **not** among them: TASK-0025 is
    // IMPLEMENTED, not VERIFIED, so none of its names is sealed yet.
    expect(ownership.protectedTaskIds).not.toContain(ownership.owningTaskId);
  });

  it("a stale owner among the destinations would break the verdict", () => {
    // Not a tautology check: it shows the conjunction actually discriminates.
    // A destination left under a verified task's name flips every clause the
    // published verdict is made of.
    const stale = "TASK-0020-M12-interbrain-relations-webview2-pass2.json";
    expect(artifactTaskId(stale)).not.toBe(runtimeWriteOwnership().owningTaskId);
    expect(PROTECTED_RUN_ARTIFACTS as readonly string[]).toContain(stale);
    expect(RUNTIME_RUN_ARTIFACTS as readonly string[]).not.toContain(stale);
  });

  it("no writing source hard-codes a task prefix or a protected-name count", () => {
    // The exact shape of the defect, forbidden at the source. With the code as
    // it stood, `crossScenario.ts` failed all three of these.
    for (const [path, source] of WRITING_SOURCES) {
      expect(source, `${path} tests a hard-coded task prefix`).not.toMatch(
        /startsWith\(\s*["'`]TASK-\d{4}-/,
      );
      expect(source, `${path} states a protected-name count`).not.toMatch(
        /\d+\s+noms proteges/,
      );
      expect(source, `${path} spells a protected-name count in words`).not.toMatch(
        /\b(fourteen|quatorze|nineteen|dix-neuf)\b/i,
      );
    }
  });
});
