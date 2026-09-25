import { describe, expect, it, vi } from "vitest";
import app from "./MapApp.tsx?raw";
import lifecycleSource from "./lifecycle.ts?raw";
import { readSourceObservation, runLifecycle, type LifecycleInvoke } from "./lifecycle";
import type { SourceObservation } from "./types";
import { strings } from "./mapStrings";

const UNAVAILABLE: SourceObservation = {
  state: "UNAVAILABLE",
  reason: "ROOT_NOT_FOUND",
  observedUnixMs: 1_790_000_000_000,
  lastSuccessfulRevision: 3,
  lastSuccessfulUnixMs: 1_789_000_000_000,
  persisted: true,
};

describe("TASK-0042 — the lifecycle after a source failure", () => {
  it("reads the observation with the brain and NOTHING else — never a path, never a scan", async () => {
    const invoke = vi.fn().mockResolvedValue(UNAVAILABLE);
    const observed = await readSourceObservation(invoke as LifecycleInvoke, "brain-alpha");
    expect(observed).toEqual(UNAVAILABLE);
    expect(invoke.mock.calls).toEqual([["map_source_observation", { brainId: "brain-alpha" }]]);
  });

  it("never lets the read hide the error that made the caller ask", async () => {
    const invoke = vi.fn().mockRejectedValue(new Error("map_not_built"));
    await expect(
      readSourceObservation(invoke as LifecycleInvoke, "brain-alpha"),
    ).resolves.toBeNull();
  });

  it("runLifecycle itself is unchanged: a failed refresh stops at map_refresh", async () => {
    const calls: string[] = [];
    const invoke = vi.fn(async (command: string) => {
      calls.push(command);
      if (command === "map_refresh") throw new Error("map_scan_failed: root_metadata_failed");
      return {};
    });
    await expect(
      runLifecycle(invoke as unknown as LifecycleInvoke, "brain-alpha", "refresh"),
    ).rejects.toThrow("map_scan_failed");
    expect(calls).toEqual(["map_refresh"]);
  });

  it("carries the observation of an open through the report, untouched", async () => {
    const invoke = vi.fn(async (command: string) =>
      command === "map_open"
        ? { brainId: "brain-alpha", revision: 3, sourceObservation: UNAVAILABLE }
        : {},
    );
    const opened = await runLifecycle(invoke as unknown as LifecycleInvoke, "brain-alpha", "open");
    expect(opened.sourceObservation).toEqual(UNAVAILABLE);
  });

  it("wires the loader: a failed Actualiser keeps the loaded map and re-reads the observation locally", () => {
    const loader = app.slice(app.indexOf("const loadBrain ="), app.indexOf("const activate ="));
    // The failure path reads the observation and then rethrows the ORIGINAL error.
    const failure = loader.slice(
      loader.indexOf("catch (error)"),
      loader.indexOf("if (report.sourceObservation)"),
    );
    expect(failure).toContain('action !== "open"');
    expect(failure).toContain("readSourceObservation(invoke, brainId)");
    expect(failure).toContain("throw error");
    // Nothing on that path replaces or empties the loaded brains, nor scans.
    expect(failure).not.toMatch(/setLoaded|setComposed|map_refresh|map_rebuild|map_view/);
    // The loader still never reads or prepares a source.
    expect(loader).not.toMatch(/map_integrity|prepareScenarioIndex|map_prepare_synthetic_source/);
  });

  it("never clears the loaded map on a failed composition: `loaded` is only replaced by a success", () => {
    const apply = app.slice(
      app.indexOf("const applyComposition ="),
      app.indexOf("const refuse ="),
    );
    const failureBranch = apply.slice(
      apply.indexOf("} catch (error) {"),
      apply.indexOf("} finally {"),
    );
    expect(failureBranch).not.toContain("setLoaded");
    expect(failureBranch).toContain("setComposed(next)");
    // `TASK-0046` — the sentence lives in the dictionary; the branch says it through it.
    expect(failureBranch).toContain("t.status.failed");
    expect(strings.fr.status.failed("x")).toContain("reste disponible");
    expect(strings.en.status.failed("x")).toContain("remains available");
  });

  it("shows the badge for the focused brain and no longer the static freshness sentence", () => {
    expect(app).toContain("<SourceObservationBadge");
    expect(app).toContain("sourceObservations.get(composed.focusedBrainId)");
    expect(app).not.toContain("fraîcheur inconnue");
  });

  it("adds no polling, timer or watcher to the lifecycle", () => {
    expect(lifecycleSource).not.toMatch(/setInterval|setTimeout|watch|poll|subscribe/i);
  });
});
