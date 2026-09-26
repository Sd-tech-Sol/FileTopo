/**
 * The composition bar — `TASK-0019` §4.4.
 *
 * It **replaces** the single brain selector of `TASK-0018`. Choosing one brain
 * out of three stops being the user-facing concept; **composing a view out of
 * brains** replaces it, and the control has to say so: the brains on screen are
 * chips, `+ Ajouter` brings one in, `×` takes one out.
 *
 * **Colour is never the only identifier** — `DEC-0017` point 12. Every chip
 * carries the brain's distinct geometric icon and its name in words, the
 * focused one is marked by the word « actif » and by `aria-current`, and the
 * swatch is an addition rather than the signal.
 *
 * **`L10` — keyboard.** Every control here is an ordinary `<button>`, so `Tab`
 * reaches it and `Enter` or `Space` presses it; the `+ Ajouter` menu opens on
 * a real key, walks on the arrows, chooses on `Enter` and closes on `Escape`.
 * Nothing depends on a pointer, and nothing is activated programmatically.
 *
 * **The `×` of the last displayed brain stays pressable and refuses.** A
 * `disabled` button cannot be focused, so a keyboard user could neither reach
 * it nor learn why — and `L12` step 14 asks for a real keystroke to *attempt*
 * the removal and be refused. `aria-disabled` says it is unavailable while
 * keeping it in the focus order, and the refusal is a real one, from the
 * model.
 */

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { addableBrains, canRemove, type ComposedView } from "./composedView";
import type { BrainRecord } from "./types";

export interface CompositionBarStrings {
  label: string;
  focused: string;
  add: string;
  addEmpty: string;
  remove: string;
  removeRefused: string;
  focus: string;
  source: string;
  busy: string;
}

export interface CompositionBarProps {
  brains: BrainRecord[];
  view: ComposedView;
  disabled?: boolean;
  busy?: boolean;
  onFocus: (brainId: string) => void;
  onAdd: (brainId: string) => void;
  onRemove: (brainId: string) => void;
  strings: CompositionBarStrings;
  /** Developer diagnostic: shows which synthetic source each brain reads. */
  showSource?: boolean;
}

export default function CompositionBar({
  brains,
  view,
  disabled = false,
  busy = false,
  onFocus,
  onAdd,
  onRemove,
  strings,
  showSource = false,
}: CompositionBarProps) {
  const [open, setOpen] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();

  const byId = new Map(brains.map((brain) => [brain.brainId, brain]));
  const displayed = view.displayedBrainIds
    .map((brainId) => byId.get(brainId) ?? null)
    .filter((brain): brain is BrainRecord => brain !== null);
  const addable = addableBrains(view, brains);
  const removable = canRemove(view);

  // Focus follows the keyboard rather than the mouse: an open menu whose focus
  // stayed on the trigger would announce nothing and accept no arrow key.
  useEffect(() => {
    if (!open) return;
    itemRefs.current[focusIndex]?.focus();
  }, [open, focusIndex]);

  // A pointer press outside the control closes the menu. Deliberately not a
  // blur handler: a click elsewhere is a person dismissing the menu, a window
  // deactivation is not — the distinction `K10` cost a real run to learn.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target && !containerRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown, true);
    return () => document.removeEventListener("mousedown", onPointerDown, true);
  }, [open]);

  // An entry that disappears while the menu is open — the brain was just
  // added — must not leave the focus index pointing past the end.
  useEffect(() => {
    if (open && focusIndex >= addable.length) setFocusIndex(Math.max(0, addable.length - 1));
  }, [addable.length, focusIndex, open]);

  const openMenu = useCallback(
    (index: number) => {
      if (disabled || addable.length === 0) return;
      setFocusIndex(index);
      setOpen(true);
    },
    [addable.length, disabled],
  );

  const closeMenu = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  const choose = useCallback(
    (brainId: string) => {
      setOpen(false);
      triggerRef.current?.focus();
      onAdd(brainId);
    },
    [onAdd],
  );

  const onTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      openMenu(event.key === "ArrowDown" ? 0 : Math.max(0, addable.length - 1));
    }
  };

  const onItemKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const count = Math.max(addable.length, 1);
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setFocusIndex((index + 1) % count);
        break;
      case "ArrowUp":
        event.preventDefault();
        setFocusIndex((index - 1 + count) % count);
        break;
      case "Home":
        event.preventDefault();
        setFocusIndex(0);
        break;
      case "End":
        event.preventDefault();
        setFocusIndex(count - 1);
        break;
      case "Escape":
        event.preventDefault();
        closeMenu(true);
        break;
      case "Tab":
        // Leaving by Tab closes the menu, but never steals the key: the focus
        // order of the rest of the page stays the page's business.
        setOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div className="composition" data-testid="composition-bar" ref={containerRef}>
      <span className="composition__label" id={`${menuId}-label`}>
        {strings.label}
      </span>

      <ul className="composition__chips" aria-labelledby={`${menuId}-label`}>
        {displayed.map((brain) => {
          const isFocused = brain.brainId === view.focusedBrainId;
          return (
            <li
              key={brain.brainId}
              className={`composition__chip${isFocused ? " composition__chip--focused" : ""}`}
            >
              <button
                type="button"
                className="composition__focus"
                data-testid={`composition-chip-${brain.brainId}`}
                data-brain-id={brain.brainId}
                aria-current={isFocused ? "true" : undefined}
                disabled={disabled}
                onClick={() => onFocus(brain.brainId)}
              >
                <span className="composition__icon" aria-hidden="true">
                  {brain.icon}
                </span>
                <span className="composition__name">
                  {busy && isFocused ? strings.busy : brain.displayName}
                </span>
                <span
                  className="composition__swatch"
                  aria-hidden="true"
                  style={{ backgroundColor: brain.color }}
                />
                {/* In words, not only in colour — DEC-0017 point 12. */}
                {isFocused ? (
                  <span className="composition__state">{strings.focused}</span>
                ) : (
                  <span className="composition__hint">{strings.focus}</span>
                )}
                {showSource ? (
                  <span className="composition__source">
                    {strings.source} {brain.sourceRef}
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                className="composition__remove"
                data-testid={`composition-remove-${brain.brainId}`}
                data-brain-id={brain.brainId}
                // Pressable on purpose, so a real keystroke can attempt the
                // removal of the last brain and be refused — `L12` step 14.
                aria-disabled={removable ? undefined : "true"}
                disabled={disabled}
                aria-label={`${removable ? strings.remove : strings.removeRefused} — ${brain.displayName}`}
                title={removable ? strings.remove : strings.removeRefused}
                onClick={() => {
                  onRemove(brain.brainId);
                  // `TASK-0047` — this chip is about to disappear with the focus on it, which would drop
                  // the focus on <body>. It goes to the chip that stays: the focused brain's, else the first.
                  // A refused removal (the last brain) keeps it where it is.
                  if (!removable) return;
                  const staying = displayed.filter((other) => other.brainId !== brain.brainId);
                  const target = staying.find((other) => other.brainId === view.focusedBrainId) ?? staying[0];
                  if (target) {
                    containerRef.current
                      ?.querySelector<HTMLElement>(`[data-testid="composition-chip-${target.brainId}"]`)
                      ?.focus();
                  }
                }}
              >
                <span aria-hidden="true">×</span>
              </button>
            </li>
          );
        })}

        <li className="composition__chip composition__chip--add">
          <button
            type="button"
            ref={triggerRef}
            className="composition__add"
            data-testid="composition-add-trigger"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls={open ? menuId : undefined}
            disabled={disabled || addable.length === 0}
            title={addable.length === 0 ? strings.addEmpty : strings.add}
            onClick={() => (open ? closeMenu(false) : openMenu(0))}
            onKeyDown={onTriggerKeyDown}
          >
            <span aria-hidden="true">+</span> {strings.add}
          </button>

          {open && addable.length > 0 ? (
            <ul className="composition__menu" id={menuId} role="menu" aria-label={strings.add}>
              {addable.map((brain, index) => (
                <li key={brain.brainId} role="none">
                  <button
                    type="button"
                    role="menuitem"
                    className="composition__item"
                    data-testid={`composition-add-item-${brain.brainId}`}
                    data-brain-id={brain.brainId}
                    ref={(element) => {
                      itemRefs.current[index] = element;
                    }}
                    tabIndex={index === focusIndex ? 0 : -1}
                    onKeyDown={(event) => onItemKeyDown(event, index)}
                    onClick={() => choose(brain.brainId)}
                    onBlur={(event) => {
                      // Closed when the focus moves to something else on the
                      // page — never when it merely leaves the window.
                      // `relatedTarget` is null in both cases, and treating
                      // them alike closed the menu the instant the host
                      // brought the window forward to deliver a real key.
                      const next = event.relatedTarget as Node | null;
                      if (next && !event.currentTarget.closest("ul")?.contains(next)) {
                        setOpen(false);
                      }
                    }}
                  >
                    <span className="composition__icon" aria-hidden="true">
                      {brain.icon}
                    </span>
                    <span className="composition__name">{brain.displayName}</span>
                    <span
                      className="composition__swatch"
                      aria-hidden="true"
                      style={{ backgroundColor: brain.color }}
                    />
                    {showSource ? (
                      <span className="composition__source">
                        {strings.source} {brain.sourceRef}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      </ul>
    </div>
  );
}
