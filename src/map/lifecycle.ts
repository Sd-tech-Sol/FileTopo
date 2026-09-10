import type { MapBuildReport, MapOpenReport } from "./types";

export type LifecycleAction = "open" | "refresh" | "rebuild";
export type LifecycleInvoke = <T>(command: string, args?: Record<string, unknown>) => Promise<T>;

export async function runLifecycle(invoke: LifecycleInvoke, brainId: string, action: LifecycleAction) {
  if (action === "refresh") await invoke<MapBuildReport>("map_refresh", { brainId });
  if (action === "rebuild") await invoke<MapBuildReport>("map_rebuild", { brainId });
  return invoke<MapOpenReport>("map_open", { brainId });
}

/** Proof setup only. Never used by the product's Open action. */
export async function prepareScenarioIndex(
  invoke: LifecycleInvoke,
  brainId: string,
  command: "map_refresh" | "map_rebuild" = "map_refresh",
): Promise<MapBuildReport> {
  await invoke("map_prepare_synthetic_source", { brainId });
  return invoke<MapBuildReport>(command, { brainId });
}
