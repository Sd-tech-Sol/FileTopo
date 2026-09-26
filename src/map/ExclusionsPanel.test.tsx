import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ExclusionsPanel from "./ExclusionsPanel";
import type { ExclusionPolicyState } from "./types";

const invokeMock = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

const BRAIN = "brain-alpha";
const state = (rules: string[] = [], applicationRequired = false): ExclusionPolicyState => ({
  brainId: BRAIN,
  version: 1,
  rules,
  applicationRequired,
});

beforeEach(() => {
  invokeMock.mockReset();
  invokeMock.mockImplementation((command: string) => {
    if (command === "map_brain_exclusions") return Promise.resolve(state(["cache"]));
    throw new Error(`unexpected ${command}`);
  });
});
afterEach(cleanup);

describe("ExclusionsPanel", () => {
  it("shows relative rules, subtree meaning and the permanent reparse safety rule in both languages", async () => {
    const { rerender } = render(
      <ExclusionsPanel brainId={BRAIN} locale="fr" disabled={false} onApplied={() => {}} />,
    );
    await screen.findByText("cache");
    expect(screen.getByTestId("exclusions").textContent).toContain("sous-arbre relatif");
    expect(screen.getByTestId("exclusions").textContent).toContain("points d’analyse");
    expect(screen.getByLabelText("Chemin relatif du sous-arbre")).toBeTruthy();

    rerender(<ExclusionsPanel brainId={BRAIN} locale="en" disabled={false} onApplied={() => {}} />);
    expect(screen.getByTestId("exclusions").textContent).toContain("relative subtree");
    expect(screen.getByTestId("exclusions").textContent).toContain("reparse points");
  });

  it("publishes only the canonical backend answer after an add", async () => {
    const applied = vi.fn();
    invokeMock.mockImplementation((command: string, payload: { rules?: string[] }) => {
      if (command === "map_brain_exclusions") return Promise.resolve(state(["cache"]));
      if (command === "map_brain_exclusions_replace") {
        expect(payload.rules).toEqual(["cache", "autre\\tmp"]);
        return Promise.resolve(state(["autre/tmp", "cache"]));
      }
      throw new Error(`unexpected ${command}`);
    });
    render(<ExclusionsPanel brainId={BRAIN} locale="fr" disabled={false} onApplied={applied} />);
    await screen.findByText("cache");
    fireEvent.change(screen.getByTestId("exclusions-input"), {
      target: { value: "autre\\tmp" },
    });
    fireEvent.click(screen.getByTestId("exclusions-add"));

    await screen.findByText("autre/tmp");
    expect(screen.queryByText("autre\\tmp")).toBeNull();
    expect(applied).toHaveBeenCalledWith(BRAIN);
  });

  it("keeps a refused draft out of the published list and leaves it editable", async () => {
    invokeMock.mockImplementation((command: string) => {
      if (command === "map_brain_exclusions") return Promise.resolve(state(["cache"]));
      if (command === "map_brain_exclusions_replace") {
        return Promise.reject(new Error("map_exclusion_policy_rejected: rule_parent_forbidden"));
      }
      throw new Error(`unexpected ${command}`);
    });
    render(<ExclusionsPanel brainId={BRAIN} locale="en" disabled={false} onApplied={() => {}} />);
    await screen.findByText("cache");
    fireEvent.change(screen.getByTestId("exclusions-input"), { target: { value: "../secret" } });
    fireEvent.click(screen.getByTestId("exclusions-add"));

    await screen.findByTestId("exclusions-error");
    expect(screen.getByText("cache")).toBeTruthy();
    expect(screen.queryByText("../secret")).toBeNull();
    expect((screen.getByTestId("exclusions-input") as HTMLInputElement).value).toBe("../secret");
    expect(screen.getByTestId("exclusions-input").getAttribute("aria-invalid")).toBe("true");
  });

  it("states pending application and does not claim the map was reloaded", async () => {
    const applied = vi.fn();
    invokeMock.mockImplementation((command: string) => {
      if (command === "map_brain_exclusions") return Promise.resolve(state(["cache"]));
      if (command === "map_brain_exclusions_replace") {
        return Promise.resolve(state([], true));
      }
      throw new Error(`unexpected ${command}`);
    });
    render(<ExclusionsPanel brainId={BRAIN} locale="fr" disabled={false} onApplied={applied} />);
    await screen.findByText("cache");
    fireEvent.click(screen.getByTestId("exclusions-remove-cache"));

    await waitFor(() => expect(screen.getByTestId("exclusions-pending")).toBeTruthy());
    expect(applied).not.toHaveBeenCalled();
    expect(screen.getByTestId("exclusions").textContent).toContain("dernier index fiable");
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByTestId("exclusions-input")),
    );
  });
});
