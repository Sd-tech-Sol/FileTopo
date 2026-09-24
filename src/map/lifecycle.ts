import type {
  ApplicationMode,
  ChangeSummary,
  MapBuildReport,
  MapOpenReport,
  SourceObservation,
} from "./types";

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

/**
 * `TASK-0042` — the last observation of a brain's source, read **from FileTopo's
 * own local state only**: the command takes the brain and nothing else, never
 * resolves or stats the root, and never scans. Called after an **Actualiser** that
 * failed, so the badge follows the backend without reopening the map. A failure to
 * read it (an Index that does not exist yet, say) is `null` — it must never hide
 * the error that made the caller ask.
 */
export async function readSourceObservation(
  invoke: LifecycleInvoke,
  brainId: string,
): Promise<SourceObservation | null> {
  try {
    return await invoke<SourceObservation>("map_source_observation", { brainId });
  } catch {
    return null;
  }
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
