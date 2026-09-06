/**
 * Real keyboard input, and the wait that proves it landed.
 *
 * Extracted from the `J12` scenario of `TASK-0017` when `TASK-0018` needed the
 * same guarantee for `K10`: a **real** Windows keystroke has to be able to
 * change the active brain, and a script can only ever dispatch a synthetic
 * event — one whose `isTrusted` is `false`.
 *
 * **Nothing about the mechanism changed in the extraction.** The same three
 * instruments are read at once: `isTrusted` on the activation, the count of
 * programmatic `click()` calls and `click` dispatches over the whole window,
 * and the observable change itself. If the keystroke never arrives, the caller
 * fails; there is no fallback to a synthetic click, here or anywhere.
 */

import { afterPaint } from "./measure";

/** Where a scenario's lines go — the host's standard output, in practice. */
export type ScenarioLog = (level: "info" | "error", message: string) => void;

/**
 * The marker the watcher script looks for on standard output.
 *
 * `scripts/j12-send-real-key.ps1` matches on the `-KEY-READY` substring, so a
 * scenario may name its own criterion without the watcher having to know it.
 */
export const DEFAULT_KEY_MARKER = "J12-KEY-READY";

/**
 * Waits, in frames, until the screen actually shows what was asked for.
 *
 * The panel reads its relations through a command, so a selection is on screen
 * one or more frames before the panel that describes it is. The first run of
 * this scenario read the panel too early and published a `0 / 0` that was the
 * previous selection's — a measurement defect of exactly the kind `TASK-0016`
 * §13.4 documents. Reporting rather than throwing: if the wait times out the
 * evidence says so, and the reader sees a stale reading for what it is.
 */
export async function waitUntil(
  predicate: () => boolean,
  budgetMs = 5_000,
): Promise<{ settled: boolean; waitedMs: number; frames: number }> {
  // Bounded in **time**, not in frames: a frame lasts 4 ms on a 240 Hz screen
  // and 16 ms on a 60 Hz one, so a frame budget would be a different wait on
  // every machine — and on this one it was a single second, too short for a
  // command round trip.
  const started = performance.now();
  let frames = 0;
  while (performance.now() - started < budgetMs) {
    if (predicate()) return { settled: true, waitedMs: performance.now() - started, frames };
    await afterPaint();
    frames += 1;
  }
  return { settled: predicate(), waitedMs: performance.now() - started, frames };
}

/** What one real keystroke proved, or failed to prove. */
export interface RealKeyEvidence {
  inputMethod: string;
  keyRequested: string;
  focusedBeforeTag: string;
  focusedBeforeClass: string;
  focusedBeforeText: string;
  focusReached: boolean;
  keydownIsTrusted: boolean | null;
  keydownKey: string | null;
  activationIsTrusted: boolean | null;
  programmaticClickCalls: number;
  programmaticClickDispatches: number;
  observedChange: boolean;
  waitedMs: number;
}

/**
 * Focuses a control, asks the host for a **real** keystroke, and waits.
 *
 * Three things are instrumented at once, because each alone could be argued
 * with:
 *
 * * `isTrusted` on the activation event — `false` for anything a script
 *   dispatched, `true` only for an activation the browser generated from real
 *   input. This is the proof.
 * * `HTMLElement.prototype.click` and `EventTarget.prototype.dispatchEvent`
 *   are counted for the whole window. Both must stay at zero, which is what
 *   "no programmatic activation was used" means when it is measured rather
 *   than asserted.
 * * the observable change itself, so a trusted click that did nothing is not
 *   mistaken for success.
 */
export async function pressRealKey(
  target: HTMLElement | SVGSVGElement,
  key: string,
  changed: () => boolean,
  log: ScenarioLog,
  budgetMs = 90_000,
  marker: string = DEFAULT_KEY_MARKER,
): Promise<RealKeyEvidence> {
  let activationIsTrusted: boolean | null = null;
  let keydownIsTrusted: boolean | null = null;
  let keydownKey: string | null = null;
  let programmaticClickCalls = 0;
  let programmaticClickDispatches = 0;

  const onClick = (event: Event) => {
    if (activationIsTrusted === null) activationIsTrusted = event.isTrusted;
  };
  const onKeyDown = (event: Event) => {
    const key = (event as KeyboardEvent).key;
    const incidental = ["Alt", "Control", "Meta", "NumLock", "Shift"].includes(key);
    if (keydownIsTrusted === null && !incidental) {
      keydownIsTrusted = event.isTrusted;
      keydownKey = key;
    }
  };
  // Capture on the stable window rather than on `target`: a successful
  // command may make React replace the focused DOM node before the browser's
  // activation click bubbles. The ordinary Windows key and click still cross
  // the window capture phase, while a stale element listener would lose the
  // very evidence this helper exists to record.
  window.addEventListener("click", onClick, true);
  window.addEventListener("keydown", onKeyDown, true);

  const nativeClick = HTMLElement.prototype.click;
  const nativeDispatch = EventTarget.prototype.dispatchEvent;
  HTMLElement.prototype.click = function patchedClick(this: HTMLElement) {
    programmaticClickCalls += 1;
    return nativeClick.call(this);
  };
  EventTarget.prototype.dispatchEvent = function patchedDispatch(
    this: EventTarget,
    event: Event,
  ) {
    if (event.type === "click") programmaticClickDispatches += 1;
    return nativeDispatch.call(this, event);
  };

  target.focus();
  const evidence: RealKeyEvidence = {
    inputMethod:
      "WScript.Shell SendKeys via scripts/j12-send-real-key.ps1, after AppActivate " +
      "on the FileTopo process — the ordinary Windows input path",
    keyRequested: key,
    focusedBeforeTag: target.tagName,
    focusedBeforeClass: target.getAttribute("class") ?? "",
    focusedBeforeText: target.textContent?.trim() ?? "",
    focusReached: document.activeElement === target,
    keydownIsTrusted: null,
    keydownKey: null,
    activationIsTrusted: null,
    programmaticClickCalls: 0,
    programmaticClickDispatches: 0,
    observedChange: false,
    waitedMs: 0,
  };

  // The marker the watcher is waiting for. It names the key, so the page
  // decides which key is sent and the watcher never guesses.
  log(
    "info",
    `${marker} key=${key} target=${evidence.focusedBeforeClass} ` +
      `tag=${evidence.focusedBeforeTag} focusReached=${evidence.focusReached}`,
  );

  const outcome = await waitUntil(changed, budgetMs);

  window.removeEventListener("click", onClick, true);
  window.removeEventListener("keydown", onKeyDown, true);
  HTMLElement.prototype.click = nativeClick;
  EventTarget.prototype.dispatchEvent = nativeDispatch;

  evidence.keydownIsTrusted = keydownIsTrusted;
  evidence.keydownKey = keydownKey;
  evidence.activationIsTrusted = activationIsTrusted;
  evidence.programmaticClickCalls = programmaticClickCalls;
  evidence.programmaticClickDispatches = programmaticClickDispatches;
  evidence.observedChange = outcome.settled;
  evidence.waitedMs = Math.round(outcome.waitedMs);
  return evidence;
}
