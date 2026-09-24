import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import WatchStatusBadge from "./WatchStatusBadge";
import type { WatchStatus } from "./types";

/** `TASK-0043` L — the accessible, textual indicator of the watcher, apart from the source badge. */

const status = (over: Partial<WatchStatus> = {}): WatchStatus => ({
  brainId: "brain-a",
  state: "WATCHING",
  mode: "NATIVE",
  reason: null,
  indexRevision: 3,
  pending: false,
  sequence: 4,
  ...over,
});

afterEach(cleanup);

describe("WatchStatusBadge", () => {
  it("says « Surveillance active » with its symbol and how it watches", () => {
    render(<WatchStatusBadge status={status()} locale="fr" />);
    const badge = screen.getByTestId("watch-status");
    expect(badge.textContent).toContain("Surveillance active");
    expect(badge.textContent).toContain("mécanisme du système");
    expect(badge.getAttribute("data-state")).toBe("WATCHING");
    expect(badge.getAttribute("data-mode")).toBe("NATIVE");
    expect(badge.getAttribute("role")).toBe("status");
    expect(badge.getAttribute("aria-label")).toBe("Surveillance automatique");
    expect(badge.textContent).toContain("●");
  });

  it("tells the four states apart by word AND symbol, never by colour alone", () => {
    const seen = new Map<string, string>();
    for (const state of [
      status({ state: "WATCHING" }),
      status({ state: "VERIFYING", reason: "INITIAL_CHECK" }),
      status({ state: "PERIODIC", mode: "PERIODIC", reason: "NATIVE_UNSUPPORTED" }),
      status({ state: "DEGRADED", mode: "NONE", reason: "SOURCE_UNAVAILABLE" }),
    ]) {
      const { unmount } = render(<WatchStatusBadge status={state} locale="fr" />);
      const badge = screen.getByTestId("watch-status");
      seen.set(state.state, badge.textContent ?? "");
      unmount();
    }
    expect(seen.get("WATCHING")).toContain("Surveillance active");
    expect(seen.get("VERIFYING")).toContain("Vérification en cours");
    expect(seen.get("PERIODIC")).toContain("Vérification périodique");
    expect(seen.get("DEGRADED")).toContain("Surveillance dégradée");
    // Nothing that is not native watching may say « active ».
    for (const state of ["VERIFYING", "PERIODIC", "DEGRADED"]) {
      expect(seen.get(state)).not.toContain("Surveillance active");
    }
    expect(new Set(seen.values()).size).toBe(4);
  });

  it("gives a degraded watcher an alert role and its closed reason", () => {
    render(
      <WatchStatusBadge
        status={status({ state: "DEGRADED", mode: "NONE", reason: "SOURCE_UNAVAILABLE" })}
        locale="en"
      />,
    );
    const badge = screen.getByTestId("watch-status");
    expect(badge.getAttribute("role")).toBe("alert");
    expect(badge.getAttribute("aria-live")).toBe("assertive");
    expect(screen.getByTestId("watch-status-reason").textContent).toContain(
      "the source is unavailable — last index kept",
    );
    expect(badge.getAttribute("data-reason")).toBe("SOURCE_UNAVAILABLE");
  });

  it("renders nothing for a brain that is not watched, or before anything is known", () => {
    const { container, rerender } = render(<WatchStatusBadge status={null} locale="fr" />);
    expect(container.textContent).toBe("");
    rerender(<WatchStatusBadge status={status({ state: "STOPPED", mode: "NONE" })} locale="fr" />);
    expect(container.textContent).toBe("");
  });

  it("carries no path, name or key: only closed words and numbers", () => {
    const { container } = render(<WatchStatusBadge status={status({ pending: true })} locale="fr" />);
    const html = container.innerHTML;
    for (const forbidden of ["\\", "C:", ".txt", "SYS1", "PFv1"]) {
      expect(html.includes(forbidden), forbidden).toBe(false);
    }
    expect(container.textContent).toContain("des changements sont en attente");
  });
});
