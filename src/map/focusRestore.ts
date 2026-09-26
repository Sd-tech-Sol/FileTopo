import { useEffect } from "react";

/**
 * `TASK-0047` — a control that has the keyboard focus and is disabled while its action runs (an index
 * refresh, a content observation, a relations analysis, a brain being added …) loses the focus: the
 * browser drops it on `<body>`, and it is not given back when the control is enabled again. A keyboard
 * user who pressed Enter is then somewhere they cannot see and has to Tab in again from the top of the
 * page (measured in the real WebView2: `Enter` on « Analyze relations » left `document.activeElement`
 * on `<body>`).
 *
 * This puts the focus back, and only in that one situation: the control had the focus, it became
 * disabled, and the same element is enabled again while the focus is on `<body>`. A person who moved on
 * meanwhile (any other `focusin`, or a blur of a control that was not disabled), an element that was
 * removed for good, or a control that simply stays disabled are all left alone. A panel that re-renders the
 * control as a new element (same `data-testid`, back within 15 s) gets the focus on the new one — that is what
 * a panel does that swaps itself out while an analysis runs. It reads no state and calls no
 * command.
 *
 * It does not assume WHEN the browser drops the focus (at the attribute change, or a frame later): the
 * control is remembered as soon as it is disabled while it holds, or has just lost, the focus.
 */
export function useRestoreFocusAfterDisabled(): void {
  useEffect(() => {
    let last: HTMLElement | null = null;
    let waiting: HTMLElement | null = null;
    let waitingId: string | null = null; // its data-testid: a panel that re-renders may replace the element itself
    let waitingSince = 0;
    const PATIENCE_MS = 15000; // a control that does not come back within this is not coming back for this action
    const onBody = () => document.activeElement === null || document.activeElement === document.body;

    const remember = (event: FocusEvent) => {
      if (event.target instanceof HTMLElement) {
        last = event.target;
        waiting = null;
      }
    };
    const forget = (event: FocusEvent) => {
      // A blur of a control that is NOT disabled is the person going elsewhere (or a click on blank space).
      // But Chromium also blurs a focused element that is being REMOVED, while it is still attached: judge
      // one task later, when a removed element is no longer connected.
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      setTimeout(() => {
        if (last === target && target.isConnected && !target.matches(":disabled")) last = null;
      }, 0);
    };
    const check = () => {
      if (waiting && Date.now() - waitingSince > PATIENCE_MS) waiting = null;
      if (waiting) {
        if (!waiting.isConnected && waitingId !== null) {
          const same = Array.from(document.querySelectorAll<HTMLElement>("[data-testid]")).find((e) => e.getAttribute("data-testid") === waitingId);
          if (same) waiting = same;
        }
        if (!waiting.isConnected) return; // not (yet) back: keep waiting until the person moves on (any focusin)
        if (!waiting.matches(":disabled")) {
          const element = waiting;
          waiting = null;
          if (onBody()) element.focus({ preventScroll: true });
        }
        return;
      }
      // Lost because the control was disabled, or because the panel that held it was replaced while it had the focus.
      const disabledWhileFocused = last !== null && last.isConnected && last.matches(":disabled") && (document.activeElement === last || onBody());
      const removedWhileFocused = last !== null && !last.isConnected && last.hasAttribute("data-testid") && onBody();
      if (last && (disabledWhileFocused || removedWhileFocused)) {
        waiting = last;
        waitingId = last.getAttribute("data-testid");
        waitingSince = Date.now();
      }
    };

    document.addEventListener("focusin", remember, true);
    document.addEventListener("focusout", forget, true);
    const observer = new MutationObserver(check);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["disabled"] });
    return () => {
      document.removeEventListener("focusin", remember, true);
      document.removeEventListener("focusout", forget, true);
      observer.disconnect();
    };
  }, []);
}
