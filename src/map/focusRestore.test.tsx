/**
 * `TASK-0047` — the keyboard focus is not stranded on <body> by a control that disables itself while its
 * action runs, nor by a chip that is removed with the focus on it. The real-engine proof is
 * `TASK-0047-webview2.json` (journeys « composition-menu » and « content-relations-review-duplicates »).
 */
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CompositionBar from "./CompositionBar";
import { addBrain, catalogueOrder, singleBrainView } from "./composedView";
import { useRestoreFocusAfterDisabled } from "./focusRestore";
import type { BrainRecord } from "./types";

afterEach(cleanup);

/**
 * Chromium drops the focus on <body> when the focused control becomes disabled; jsdom keeps the disabled
 * control as `activeElement` and cannot blur it. The browser's answer is put in place by hand: the hook
 * only ever READS `document.activeElement`, so this is the one thing to emulate.
 */
function browserDropsTheFocus() {
  Object.defineProperty(document, "activeElement", { configurable: true, get: () => document.body });
}
function theBrowserIsBackToNormal() {
  delete (document as unknown as Record<string, unknown>).activeElement;
}
afterEach(theBrowserIsBackToNormal);

function Runner({ onRun }: { onRun?: () => void }) {
  useRestoreFocusAfterDisabled();
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <button type="button" data-testid="run" disabled={busy} onClick={() => { onRun?.(); setBusy(true); }}>
        run
      </button>
      <button type="button" data-testid="finish" onClick={() => setBusy(false)}>
        finish
      </button>
      <button type="button" data-testid="other">other</button>
    </div>
  );
}

describe("a control that is disabled while its action runs gets the focus back", () => {
  it("restores the focus to the control when it is enabled again and the focus is still on <body>", async () => {
    render(<Runner />);
    const run = screen.getByTestId("run");
    const focus = vi.spyOn(run, "focus");
    run.focus();
    focus.mockClear();
    fireEvent.click(run);
    await waitFor(() => expect(run.hasAttribute("disabled")).toBe(true));
    browserDropsTheFocus();
    await act(async () => {
      fireEvent.click(screen.getByTestId("finish"));
    });
    await waitFor(() => expect(focus).toHaveBeenCalledWith({ preventScroll: true }));
  });

  it("leaves the focus alone when the person moved on while the control was disabled", async () => {
    render(<Runner />);
    const run = screen.getByTestId("run");
    run.focus();
    const focus = vi.spyOn(run, "focus");
    fireEvent.click(run);
    await waitFor(() => expect(run.hasAttribute("disabled")).toBe(true));
    screen.getByTestId("other").focus(); // a real focusin elsewhere: the person moved on
    await act(async () => {
      fireEvent.click(screen.getByTestId("finish"));
    });
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(focus).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(screen.getByTestId("other"));
  });

  it("leaves a control that stays disabled, and an element that was removed, alone", async () => {
    const { unmount } = render(<Runner />);
    const run = screen.getByTestId("run");
    run.focus();
    const focus = vi.spyOn(run, "focus");
    fireEvent.click(run);
    await waitFor(() => expect(run.hasAttribute("disabled")).toBe(true));
    browserDropsTheFocus();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(focus).not.toHaveBeenCalled(); // still disabled: nothing is forced
    unmount(); // the observer is disconnected with it: no error, no focus grab
    expect(focus).not.toHaveBeenCalled();
  });

  it("gives the focus to the replacement when a panel swaps the control for a new element while it runs", async () => {
    function Panel() {
      useRestoreFocusAfterDisabled();
      const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
      return (
        <div>
          {phase === "running" ? <p>working…</p> : <button
              key={phase}
              type="button"
              data-testid="analyze"
              onClick={(event) => {
                // Chromium blurs a focused element that is being removed while it is still attached.
                event.currentTarget.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
                setPhase("running");
              }}
            >
              go
            </button>}
          <button type="button" data-testid="done" onClick={() => setPhase("done")}>done</button>
        </div>
      );
    }
    render(<Panel />);
    const first = screen.getByTestId("analyze");
    first.focus();
    browserDropsTheFocus();
    fireEvent.click(first); // the panel removes the button while the work runs
    await waitFor(() => expect(screen.queryByTestId("analyze")).toBeNull());
    const focus = vi.spyOn(HTMLElement.prototype, "focus");
    await act(async () => {
      fireEvent.click(screen.getByTestId("done"));
    });
    const second = screen.getByTestId("analyze");
    expect(second).not.toBe(first);
    await waitFor(() => expect(focus.mock.contexts).toContain(second));
    focus.mockRestore();
  });

  it("calls nothing of the product: it only moves the focus", () => {
    const onRun = vi.fn();
    render(<Runner onRun={onRun} />);
    expect(onRun).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------------------------
const brains: BrainRecord[] = ["alpha", "beta"].map((name, index) => ({
  brainId: `brain-${name}`,
  displayName: `Cerveau ${name}`,
  color: "#2E5FA3",
  icon: index === 0 ? "▲" : "■",
  sourceKind: "SYNTHETIC_FIXTURE",
  sourceRef: name,
  sourceLabel: name,
  position: index + 1,
}));
const order = catalogueOrder(brains);
const barStrings = {
  label: "Cerveaux affichés",
  focused: "actif",
  add: "Ajouter",
  addEmpty: "Tous les cerveaux du catalogue sont déjà affichés",
  remove: "Retirer de la vue",
  removeRefused: "Impossible de retirer le dernier cerveau affiché",
  focus: "rendre actif",
  source: "source",
  busy: "Chargement…",
};

describe("removing a brain from the composition keeps the keyboard where it can go on", () => {
  it("moves the focus to the chip that stays (the focused brain's) when a chip is removed", () => {
    const view = addBrain(singleBrainView(order, "brain-alpha"), order, "brain-beta");
    render(<CompositionBar brains={brains} view={view} onFocus={() => {}} onAdd={() => {}} onRemove={() => {}} strings={barStrings} />);
    const remove = screen.getByTestId("composition-remove-brain-beta");
    remove.focus();
    fireEvent.click(remove);
    expect(document.activeElement).toBe(screen.getByTestId("composition-chip-brain-alpha"));
  });

  it("keeps the focus on × when the removal is refused (the last brain)", () => {
    const onRemove = vi.fn();
    render(<CompositionBar brains={brains} view={singleBrainView(order, "brain-alpha")} onFocus={() => {}} onAdd={() => {}} onRemove={onRemove} strings={barStrings} />);
    const remove = screen.getByTestId("composition-remove-brain-alpha");
    remove.focus();
    fireEvent.click(remove);
    expect(onRemove).toHaveBeenCalledTimes(1); // the model does the refusing
    expect(document.activeElement).toBe(remove);
  });
});
