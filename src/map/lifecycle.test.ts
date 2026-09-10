import { describe, expect, it, vi } from "vitest";
import app from "./MapApp.tsx?raw";
import { runLifecycle, type LifecycleInvoke } from "./lifecycle";

describe("TASK-0031 L6 lifecycle intents", () => {
  it.each([
    ["open", ["map_open"]],
    ["refresh", ["map_refresh", "map_open"]],
    ["rebuild", ["map_rebuild", "map_open"]],
  ] as const)("%s uses only its named command and existing-index read", async (action, commands) => {
    const invoke = vi.fn().mockResolvedValue({ brainId: "brain-alpha" });
    await runLifecycle(invoke as LifecycleInvoke, "brain-alpha", action);
    expect(invoke.mock.calls).toEqual(commands.map(command => [command, { brainId: "brain-alpha" }]));
  });

  it("does not turn an open refusal into a scan or source preparation", async () => {
    const invoke = vi.fn().mockRejectedValue(new Error("map_not_built"));
    await expect(runLifecycle(invoke as LifecycleInvoke, "brain-alpha", "open")).rejects.toThrow("map_not_built");
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("wires the actual buttons and excludes source reads from loadBrain", () => {
    for (const action of ["open", "refresh", "rebuild"]) {
      expect(app).toMatch(new RegExp(`data-testid="lifecycle-${action}"[\\s\\S]*?action: "${action}"`));
    }
    const loader = app.slice(app.indexOf("const loadBrain ="), app.indexOf("const activate ="));
    expect(loader).toContain("runLifecycle(invoke, brainId, action)");
    expect(loader).toContain('invoke<MapProjection>("map_view"');
    expect(loader).not.toMatch(/map_integrity|prepareScenarioIndex|map_prepare_synthetic_source/);
    expect(app).not.toMatch(/rebuild\??: (?:boolean|true|false)/);
  });
});
