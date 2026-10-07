/**
 * Session memory **per composition** — `TASK-0019` §4.7.
 *
 * `L9` asks that `C2` and `C3` each keep their own pan, zoom and selection,
 * and that `C2 → C3 → C2` give `C2` back **exactly**. That is a memory keyed
 * by the composition, and nothing more.
 *
 * **The key is the ordered list of displayed `brain_id`** — `brain-alpha|brain-gamma`.
 * Deterministic, because `composeView` always returns catalogue order: two
 * ways of arriving at the same composition land on the same entry rather than
 * on two entries that each hold half the state.
 *
 * **It subsumes the per-brain memory of `TASK-0018` rather than competing with
 * it.** A composition of one brain has the key `brain-alpha`, which is exactly
 * the key `brainSession.ts` used, so the single-brain behaviour `K8` froze is
 * the same behaviour — not a re-implementation of it. That is what `L9`'s last
 * sentence asks for.
 *
 * **It is session-only, and says so.** Nothing here is written to disk. Since
 * `TASK-0053` (`F-052`) the composition that was **on screen** at close is stored
 * by the global workspace record — one composition, never this whole memory — and
 * handed back through this very memory at start, so nothing new decides where a
 * composition opens.
 */

import type { BrainNodeRef } from "./types";
import type { View } from "./viewState";

export interface CompositionSessionState {
  /** The global pan and zoom of the composed graph. */
  view: View;
  /** The selection, as the pair that identifies it — never a bare number. */
  selected: BrainNodeRef | null;
}

export type CompositionSessionMemory = ReadonlyMap<string, CompositionSessionState>;

export function emptyCompositionMemory(): CompositionSessionMemory {
  return new Map();
}

/**
 * The key of a composition: its displayed brains, in order, joined by `|`.
 *
 * `brain_id` values are catalogue identifiers and contain no `|`, so the
 * joined string is unambiguous; the assertion below is the cheap way to keep
 * that true if the catalogue ever loosens.
 */
export function compositionKey(displayedBrainIds: readonly string[]): string {
  return displayedBrainIds.join("|");
}

function copy(state: CompositionSessionState): CompositionSessionState {
  return {
    view: { ...state.view },
    selected: state.selected === null ? null : { ...state.selected },
  };
}

/**
 * Records where a composition was left.
 *
 * Returns a **new** map rather than mutating the old one: React state has to
 * change identity to re-render, and a memory that mutates in place is a memory
 * whose updates can be missed.
 */
export function rememberComposition(
  memory: CompositionSessionMemory,
  key: string,
  state: CompositionSessionState,
): CompositionSessionMemory {
  const next = new Map(memory);
  next.set(key, copy(state));
  return next;
}

/**
 * What a composition was left at, or `null` if it has not been seen.
 *
 * A copy is returned, so a caller that mutates what it gets back cannot reach
 * into another composition's stored state — or into this one's, later.
 */
export function recallComposition(
  memory: CompositionSessionMemory,
  key: string,
): CompositionSessionState | null {
  const stored = memory.get(key);
  return stored ? copy(stored) : null;
}

/**
 * Whether two composition states describe the same place.
 *
 * Used by `L12` step 12 to state, on evidence, that what came back **is** what
 * was left — rather than that it merely looks similar.
 */
export function sameCompositionSession(
  left: CompositionSessionState | null,
  right: CompositionSessionState | null,
): boolean {
  if (left === null || right === null) return left === right;
  const sameSelection =
    left.selected === null || right.selected === null
      ? left.selected === right.selected
      : left.selected.brainId === right.selected.brainId &&
        left.selected.nodeId === right.selected.nodeId;
  return (
    sameSelection &&
    left.view.scale === right.view.scale &&
    left.view.tx === right.view.tx &&
    left.view.ty === right.view.ty
  );
}

/** Where the composed view was last positioned, and with which viewport. */
export interface CompositionPositioning {
  key: string;
  width: number;
  height: number;
}

/**
 * Whether a freshly composed graph should be fitted, or left where it was put.
 *
 * A map opens fitted — `TASK-0016` — and the viewport is measured *after* the
 * first render, so the fit has to be redone once the real size arrives. That
 * second fit is what broke `K8` in the real host: coming back to a brain
 * restored its view, the viewport then settled a frame later, and the restored
 * view was refitted away. The selection came back and the pan and zoom did
 * not, which is exactly half of what the criterion asks for.
 *
 * The rule is stated once, here, and tested: fit a composition **once**, and
 * again only if that first fit was computed before the viewport had been
 * measured at all. It is `TASK-0018`'s rule, keyed by composition rather than
 * by brain — for a composition of one they are the same key, which is what
 * makes `L9`'s last sentence true rather than merely intended.
 */
export function shouldFitComposition(
  positioned: CompositionPositioning | null,
  key: string,
): boolean {
  if (!positioned || positioned.key !== key) return true;
  // The placeholder viewport is 1x1: a fit computed against it means nothing,
  // and has to be redone.
  return positioned.width <= 1 || positioned.height <= 1;
}
