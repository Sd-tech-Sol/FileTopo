import { useEffect, useRef, type RefObject } from "react";

/**
 * After a revocation, puts the keyboard focus on the control the reader needs
 * next — `TASK-0051`.
 *
 * Revoking removes the button that was just activated. Without this, the
 * browser drops focus to the page body, or — worse — to whichever control now
 * sits where the removed one was, which can be **another relation's** revoke
 * control: one more Enter would take back a relation the reader never chose.
 * The right place to land is the same suggestion's own approval control,
 * because that is what the suggestion has just become. When the engine is
 * `STALE` the pending core suggestion is masked and has no approval control:
 * focus then goes to `fallbackSelector` (the explicit analysis command),
 * never to a neighbouring relation's revoke button.
 *
 * It waits for the reload the revocation causes: the panel first shows its
 * loading state, then the rows read back from the backend. Only after that
 * reload does it focus, once, and report that it is done — so a later
 * navigation can never be stolen from.
 */
export function useRestoreFocusAfterReload({
  root,
  selector,
  fallbackSelector,
  active,
  loading,
  ready,
  onRestored,
}: {
  root: RefObject<HTMLElement | null>;
  /** The control to focus, inside `root`. Only read once the reload is over. */
  selector: string;
  /** A safe landing when `selector` matches nothing; focus is never left to the browser. */
  fallbackSelector?: string;
  /** `true` from the moment a revocation succeeded until focus has been placed. */
  active: boolean;
  loading: boolean;
  /** `true` once the panel holds the rows read back from the backend. */
  ready: boolean;
  onRestored: () => void;
}) {
  const reloaded = useRef(false);
  useEffect(() => {
    if (!active) {
      reloaded.current = false;
      return;
    }
    if (loading) {
      reloaded.current = true;
      return;
    }
    if (!reloaded.current || !ready) return;
    reloaded.current = false;
    const target =
      root.current?.querySelector<HTMLElement>(selector) ??
      (fallbackSelector ? root.current?.querySelector<HTMLElement>(fallbackSelector) : null);
    target?.focus();
    onRestored();
  });
}
