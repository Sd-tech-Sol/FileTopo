/**
 * The brain identity editor — `TASK-0045`, `DEC-0043`.
 *
 * It edits **three** things about the focused brain and nothing else: its name, its
 * colour and its icon. The catalogue already knew how (`map_brain_update`,
 * `BrainCatalog::update_metadata`, `validate_metadata`); this is only the gesture.
 *
 * * There is **no** `brain_id`, source, `sourceRef`, `sourceLabel` or path field, and the
 *   form never holds one — what a brain reads is not a rename.
 * * The form is **bound to the brain it was opened on**. Focusing another chip while it
 *   is open does not retarget it, and its title says whose identity is being edited.
 * * The backend is the truth. The checks below are the same bounds as Rust's
 *   `validate_metadata`, kept only so that an obviously invalid entry is explained before
 *   a round trip; a refusal from the backend keeps the form open and shows its words.
 * * `onSave` resolves only once the backend accepted the change **and** the parent has
 *   published the record the backend returned. A rejection never closes the form.
 * * **Colour is never the only signal**: the name and the icon are text inputs and stay on
 *   the chip, and the colour input is an addition.
 *
 * Everything is an ordinary form control, so `Tab` walks it, `Enter` in a text field
 * saves, and `Escape` cancels.
 */

import { useEffect, useId, useRef, useState } from "react";
import type { BrainRecord } from "./types";

/** Longest name the backend accepts — `MAX_DISPLAY_NAME` in `brains.rs`. */
export const MAX_DISPLAY_NAME = 80;
/** Longest icon the backend accepts, in Unicode scalar values (Rust `chars()`). */
export const MAX_ICON_CHARS = 2;

export interface BrainIdentityValues {
  displayName: string;
  color: string;
  icon: string;
}

export interface BrainIdentityStrings {
  open: string;
  title: string;
  name: string;
  color: string;
  icon: string;
  iconHint: string;
  save: string;
  saving: string;
  cancel: string;
  nameInvalid: string;
  colorInvalid: string;
  iconInvalid: string;
  unchanged: string;
  refused: string;
}

export interface BrainIdentityErrors {
  displayName?: true;
  color?: true;
  icon?: true;
}

/** Rust counts `char`s (Unicode scalar values); `String.length` counts UTF-16 units. */
const scalarCount = (text: string) => Array.from(text).length;

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/** The same bounds as `validate_metadata`, no stricter and no looser. */
export function validateIdentity(values: BrainIdentityValues): BrainIdentityErrors {
  const errors: BrainIdentityErrors = {};
  const name = values.displayName.trim();
  if (name.length === 0 || scalarCount(name) > MAX_DISPLAY_NAME) errors.displayName = true;
  if (!HEX_COLOR.test(values.color)) errors.color = true;
  const icon = scalarCount(values.icon);
  if (icon === 0 || icon > MAX_ICON_CHARS) errors.icon = true;
  return errors;
}

/** `<input type="color">` only speaks lower-case `#rrggbb`. */
const colorInputValue = (color: string) => (HEX_COLOR.test(color) ? color.toLowerCase() : "#000000");

const sameIdentity = (brain: BrainRecord, values: BrainIdentityValues) =>
  brain.displayName === values.displayName.trim() &&
  brain.color.toLowerCase() === values.color.toLowerCase() &&
  brain.icon === values.icon;

export interface BrainIdentityEditorProps {
  brains: BrainRecord[];
  /** The brain the « Personnaliser » gesture applies to. */
  focusedBrainId: string | null;
  disabled?: boolean;
  /** Resolves when the change is accepted **and** published; rejects with the refusal. */
  onSave: (brainId: string, values: BrainIdentityValues) => Promise<void>;
  onNotice?: (message: string) => void;
  strings: BrainIdentityStrings;
}

export default function BrainIdentityEditor({
  brains,
  focusedBrainId,
  disabled = false,
  onSave,
  onNotice,
  strings,
}: BrainIdentityEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<BrainIdentityValues>({ displayName: "", color: "#000000", icon: "" });
  const [attempted, setAttempted] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const restoreFocus = useRef(false);
  const titleId = useId();
  const nameId = useId();
  const colorId = useId();
  const iconId = useId();
  const hintId = useId();
  const problemId = useId();

  const editing = editingId ? (brains.find((brain) => brain.brainId === editingId) ?? null) : null;
  const target = brains.find((brain) => brain.brainId === focusedBrainId) ?? null;
  const errors = validateIdentity(draft);

  // The form opens on its name field, and closing it hands the focus back to the gesture
  // that opened it — a keyboard user would otherwise be dropped at the top of the page.
  useEffect(() => {
    if (editingId) nameRef.current?.focus();
  }, [editingId]);
  useEffect(() => {
    if (!editing && restoreFocus.current) {
      restoreFocus.current = false;
      triggerRef.current?.focus();
    }
  }, [editing]);

  const close = () => {
    restoreFocus.current = true;
    setEditingId(null);
    setRefusal(null);
    setAttempted(false);
  };

  const open = () => {
    if (!target || disabled) return;
    setDraft({
      displayName: target.displayName,
      color: colorInputValue(target.color),
      icon: target.icon,
    });
    setRefusal(null);
    setAttempted(false);
    setEditingId(target.brainId);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing || saving) return;
    setAttempted(true);
    if (Object.keys(errors).length > 0) return;
    if (sameIdentity(editing, draft)) {
      onNotice?.(strings.unchanged);
      close();
      return;
    }
    setSaving(true);
    setRefusal(null);
    try {
      await onSave(editing.brainId, draft);
      setSaving(false);
      close();
    } catch (error) {
      // The catalogue and every surface keep their authoritative values; the form stays.
      setSaving(false);
      setRefusal(String(error));
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
    if (event.key === "Escape" && !saving) {
      event.preventDefault();
      close();
    }
  };

  const showName = attempted && errors.displayName;
  const showColor = attempted && errors.color;
  const showIcon = attempted && errors.icon;

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className="identity__open"
        data-testid="brain-identity-open"
        data-brain-id={target?.brainId}
        aria-expanded={editing !== null}
        disabled={disabled || !target || editing !== null}
        onClick={open}
      >
        {strings.open}
      </button>

      {editing ? (
        <form
          className="identity"
          data-testid="brain-identity-form"
          data-brain-id={editing.brainId}
          aria-labelledby={titleId}
          noValidate
          onSubmit={(event) => void submit(event)}
          onKeyDown={onKeyDown}
        >
          <h2 className="identity__title" id={titleId}>
            {strings.title}{" "}
            <span className="identity__brain" data-testid="brain-identity-title">
              <span aria-hidden="true">{editing.icon} </span>
              {editing.displayName}
            </span>
          </h2>

          <div className="identity__field">
            <label htmlFor={nameId}>{strings.name}</label>
            <input
              id={nameId}
              ref={nameRef}
              type="text"
              data-testid="brain-identity-name"
              value={draft.displayName}
              disabled={saving}
              autoComplete="off"
              aria-invalid={showName ? "true" : undefined}
              aria-describedby={showName ? problemId : undefined}
              onChange={(event) => setDraft({ ...draft, displayName: event.target.value })}
            />
          </div>

          <div className="identity__field">
            <label htmlFor={colorId}>{strings.color}</label>
            <input
              id={colorId}
              type="color"
              data-testid="brain-identity-color"
              value={draft.color}
              disabled={saving}
              aria-invalid={showColor ? "true" : undefined}
              onChange={(event) => setDraft({ ...draft, color: event.target.value })}
            />
          </div>

          <div className="identity__field">
            <label htmlFor={iconId}>{strings.icon}</label>
            <input
              id={iconId}
              type="text"
              data-testid="brain-identity-icon"
              value={draft.icon}
              disabled={saving}
              autoComplete="off"
              aria-invalid={showIcon ? "true" : undefined}
              aria-describedby={showIcon ? `${hintId} ${problemId}` : hintId}
              onChange={(event) => setDraft({ ...draft, icon: event.target.value })}
            />
            <small id={hintId}>{strings.iconHint}</small>
          </div>

          {attempted && Object.keys(errors).length > 0 ? (
            <p className="identity__problem" id={problemId} role="alert" data-testid="brain-identity-problem">
              {[
                errors.displayName ? strings.nameInvalid : null,
                errors.color ? strings.colorInvalid : null,
                errors.icon ? strings.iconInvalid : null,
              ]
                .filter(Boolean)
                .join(" ")}
            </p>
          ) : null}
          {refusal ? (
            <p className="identity__problem" role="alert" data-testid="brain-identity-refusal">
              {strings.refused} {refusal}
            </p>
          ) : null}

          <div className="identity__actions">
            <button type="submit" data-testid="brain-identity-save" disabled={saving}>
              {saving ? strings.saving : strings.save}
            </button>
            <button type="button" data-testid="brain-identity-cancel" disabled={saving} onClick={close}>
              {strings.cancel}
            </button>
          </div>
        </form>
      ) : null}
    </>
  );
}
