/**
 * The `H9` measurement harness: frame times and selection latency, inside the
 * real engine.
 *
 * `H9` sets **no frames-per-second target**. Success is obtaining the numbers
 * honestly and publishing them without favourable selection — every run counts,
 * and the worst is reported beside the median. Nothing here filters, discards a
 * run, or smooths a curve.
 *
 * What is actually measured, stated plainly so nobody has to infer it:
 *
 * * **frame time** — the interval between two consecutive animation-frame
 *   callbacks while a scripted pan-and-zoom drives the map. It includes the
 *   React commit and whatever the engine schedules around it. It is *not* a
 *   paint timer.
 * * **selection latency** — from the moment a selection is requested to the
 *   start of the frame following the one that paints it, measured with two
 *   chained animation frames.
 */

import { LocalizedError } from "./localeText";

export interface Stat {
  count: number;
  median: number;
  min: number;
  max: number;
  mean: number;
}

export interface RunSample {
  run: number;
  frameTimesMs: number[];
  selectionLatenciesMs: number[];
}

export interface FixtureMeasurement {
  fixtureId: string;
  nodeCount: number;
  /** Published because frame cost depends on it, and it must not silently differ between fixtures. */
  viewport: { width: number; height: number };
  runs: RunSample[];
  frameTime: Stat;
  selectionLatency: Stat;
  /** Slowest single frame across every run — the value `H9` refuses to hide. */
  worstFrameMs: number;
  worstSelectionMs: number;
}

export function summarize(values: number[]): Stat {
  if (values.length === 0) return { count: 0, median: 0, min: 0, max: 0, mean: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length >> 1;
  const median =
    sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
  const total = sorted.reduce((sum, value) => sum + value, 0);
  return {
    count: sorted.length,
    median,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: total / sorted.length,
  };
}

export function aggregate(
  fixtureId: string,
  nodeCount: number,
  viewport: { width: number; height: number },
  runs: RunSample[],
): FixtureMeasurement {
  const frames = runs.flatMap((run) => run.frameTimesMs);
  const selections = runs.flatMap((run) => run.selectionLatenciesMs);
  return {
    fixtureId,
    nodeCount,
    viewport,
    runs,
    frameTime: summarize(frames),
    selectionLatency: summarize(selections),
    worstFrameMs: frames.length ? Math.max(...frames) : 0,
    worstSelectionMs: selections.length ? Math.max(...selections) : 0,
  };
}

/**
 * Raised when animation frames stop arriving.
 *
 * Chromium suspends `requestAnimationFrame` for a window it considers hidden or
 * fully occluded. Without a deadline the harness simply waits for a frame that
 * will never come, and an unattended run hangs looking exactly like a slow one.
 * A measurement that cannot happen has to say so.
 */
export class FramesSuspended extends LocalizedError {
  constructor(waitedMs: number) {
    super((locale) =>
      locale === "fr"
        ? `aucune image pendant ${waitedMs} ms : la fenêtre n'est pas composée ` +
          `(masquée, réduite ou entièrement recouverte). Mesure abandonnée.`
        : `no frame for ${waitedMs} ms: the window is not composited ` +
          `(hidden, minimized or fully covered). Measurement abandoned.`,
    );
    this.name = "FramesSuspended";
  }
}

/** How long a single frame may take before the run is declared suspended. */
export const FRAME_DEADLINE_MS = 8_000;

export function nextFrame(deadlineMs = FRAME_DEADLINE_MS): Promise<number> {
  return new Promise((resolve, reject) => {
    const handle = requestAnimationFrame((timestamp) => {
      clearTimeout(timer);
      resolve(timestamp);
    });
    const timer = setTimeout(() => {
      cancelAnimationFrame(handle);
      reject(new FramesSuspended(deadlineMs));
    }, deadlineMs);
  });
}

/** Resolves once the frame following the current one has begun. */
export async function afterPaint(): Promise<number> {
  await nextFrame();
  return nextFrame();
}

/** Frozen shape of a run, so the five repetitions exercise the same path. */
export const FRAMES_PER_RUN = 150;
export const WARMUP_FRAMES = 12;
export const SELECTIONS_PER_RUN = 12;
export const RUNS_PER_FIXTURE = 5;

/**
 * Scripted view motion, identical on every run and every fixture.
 *
 * Deterministic on purpose: five runs that each wander differently would not be
 * five measurements of the same thing.
 */
export function scriptedStep(frame: number): { zoom: number; dx: number; dy: number } {
  const phase = (frame / FRAMES_PER_RUN) * Math.PI * 2;
  return {
    zoom: 1 + 0.02 * Math.sin(phase * 3),
    dx: 7 * Math.cos(phase),
    dy: 5 * Math.sin(phase * 2),
  };
}

/**
 * Waits until the map has a real size before anything is timed.
 *
 * On the first fixture the harness would otherwise start while the map host is
 * still 1x1: the view maths would fit the tree into a single pixel and the
 * frames would be cheap because nothing was on screen. Fast frames measured on
 * an empty map are worse than no measurement at all.
 */
export async function awaitLaidOutViewport(
  read: () => { width: number; height: number },
  deadlineMs = 5_000,
): Promise<{ width: number; height: number }> {
  const started = performance.now();
  for (;;) {
    const viewport = read();
    if (viewport.width > 2 && viewport.height > 2) return viewport;
    if (performance.now() - started > deadlineMs) {
      throw new LocalizedError((locale) =>
        locale === "fr"
          ? `la carte n'a pas de taille après ${deadlineMs} ms ` +
            `(${viewport.width}x${viewport.height}) : mesure abandonnée`
          : `the map has no size after ${deadlineMs} ms ` +
            `(${viewport.width}x${viewport.height}): measurement abandoned`,
      );
    }
    await nextFrame();
  }
}

/** Deterministic spread of selection targets across the tree. */
export function selectionTargets(nodeIds: number[], count: number): number[] {
  if (nodeIds.length === 0) return [];
  const stride = Math.max(1, Math.floor(nodeIds.length / count));
  const targets: number[] = [];
  for (let index = 0; targets.length < count && index < nodeIds.length; index += stride) {
    targets.push(nodeIds[index]);
  }
  return targets;
}
