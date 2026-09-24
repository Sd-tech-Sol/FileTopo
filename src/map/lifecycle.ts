import type { ApplicationMode, ChangeSummary, MapBuildReport, MapOpenReport } from "./types";

export type LifecycleAction = "open" | "refresh" | "rebuild";
export type LifecycleInvoke = <T>(command: string, args?: Record<string, unknown>) => Promise<T>;

/**
 * What a lifecycle action answers: the existing-index read, plus — only for
 * Actualiser/Reconstruire — the change counters of the publication that just
 * happened (`TASK-0037`) and, since `TASK-0041`, the closed word saying which
 * path applied the scan. `open` never scans, so it carries neither.
 */
export type LifecycleReport = MapOpenReport & {
  changeSummary?: ChangeSummary;
  applicationMode?: ApplicationMode;
};

export async function runLifecycle(
  invoke: LifecycleInvoke,
  brainId: string,
  action: LifecycleAction,
): Promise<LifecycleReport> {
  let build: MapBuildReport | null = null;
  if (action === "refresh") build = await invoke<MapBuildReport>("map_refresh", { brainId });
  if (action === "rebuild") build = await invoke<MapBuildReport>("map_rebuild", { brainId });
  const opened = await invoke<MapOpenReport>("map_open", { brainId });
  if (!build?.changeSummary) return opened;
  return build.applicationMode
    ? { ...opened, changeSummary: build.changeSummary, applicationMode: build.applicationMode }
    : { ...opened, changeSummary: build.changeSummary };
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
