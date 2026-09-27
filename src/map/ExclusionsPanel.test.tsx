import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ExclusionsPanel from "./ExclusionsPanel";
import type { ExclusionPolicyState } from "./types";

const invokeMock = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

const BRAIN = "brain-alpha";
const OTHER_BRAIN = "brain-beta";
const state = (
  rules: string[] = [],
  applicationRequired = false,
  brainId = BRAIN,
): ExclusionPolicyState => ({
  brainId,
  version: 1,
  rules,
  applicationRequired,
});

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

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

  it("R1 ignores a stale successful replace after switching brains", async () => {
    const staleReplace = deferred<ExclusionPolicyState>();
    const applied = vi.fn();
    invokeMock.mockImplementation((command: string, payload: { brainId: string }) => {
      if (command === "map_brain_exclusions") {
        return Promise.resolve(
          payload.brainId === BRAIN
            ? state(["alpha-cache"])
            : state(["beta-cache"], false, OTHER_BRAIN),
        );
      }
      if (command === "map_brain_exclusions_replace") return staleReplace.promise;
      throw new Error(`unexpected ${command}`);
    });
    const { rerender } = render(
      <ExclusionsPanel brainId={BRAIN} locale="en" disabled={false} onApplied={applied} />,
    );
    await screen.findByText("alpha-cache");
    fireEvent.change(screen.getByTestId("exclusions-input"), { target: { value: "alpha-new" } });
    fireEvent.click(screen.getByTestId("exclusions-add"));

    rerender(
      <ExclusionsPanel brainId={OTHER_BRAIN} locale="en" disabled={false} onApplied={applied} />,
    );
    await screen.findByText("beta-cache");
    fireEvent.change(screen.getByTestId("exclusions-input"), { target: { value: "beta-draft" } });
    await act(async () => staleReplace.resolve(state(["alpha-cache", "alpha-new"])));

    expect(screen.getByText("beta-cache")).toBeTruthy();
    expect(screen.queryByText("alpha-cache")).toBeNull();
    expect((screen.getByTestId("exclusions-input") as HTMLInputElement).value).toBe("beta-draft");
    expect(screen.queryByTestId("exclusions-error")).toBeNull();
    expect(screen.getByTestId("exclusions-add")).not.toBeDisabled();
    expect(applied).not.toHaveBeenCalled();
  });

  it("R2 sends only the current brain policy in the next edit", async () => {
    const staleReplace = deferred<ExclusionPolicyState>();
    const betaReplace = deferred<ExclusionPolicyState>();
    const replacePayloads: Array<{ brainId: string; rules: string[] }> = [];
    invokeMock.mockImplementation(
      (command: string, payload: { brainId: string; rules?: string[] }) => {
        if (command === "map_brain_exclusions") {
          return Promise.resolve(
            payload.brainId === BRAIN
              ? state(["alpha-cache"])
              : state(["beta-cache"], false, OTHER_BRAIN),
          );
        }
        if (command === "map_brain_exclusions_replace") {
          replacePayloads.push({ brainId: payload.brainId, rules: payload.rules ?? [] });
          return payload.brainId === BRAIN ? staleReplace.promise : betaReplace.promise;
        }
        throw new Error(`unexpected ${command}`);
      },
    );
    const { rerender } = render(
      <ExclusionsPanel brainId={BRAIN} locale="en" disabled={false} onApplied={() => {}} />,
    );
    await screen.findByText("alpha-cache");
    fireEvent.change(screen.getByTestId("exclusions-input"), { target: { value: "alpha-new" } });
    fireEvent.click(screen.getByTestId("exclusions-add"));

    rerender(
      <ExclusionsPanel brainId={OTHER_BRAIN} locale="en" disabled={false} onApplied={() => {}} />,
    );
    await screen.findByText("beta-cache");
    await act(async () => staleReplace.resolve(state(["alpha-cache", "alpha-new"])));
    fireEvent.change(screen.getByTestId("exclusions-input"), { target: { value: "beta-new" } });
    fireEvent.click(screen.getByTestId("exclusions-add"));

    expect(replacePayloads[1]).toEqual({
      brainId: OTHER_BRAIN,
      rules: ["beta-cache", "beta-new"],
    });
    await act(async () =>
      betaReplace.resolve(state(["beta-cache", "beta-new"], false, OTHER_BRAIN)),
    );
    await screen.findByText("beta-new");
  });

  it("R3 ignores a stale rejected replace after switching brains", async () => {
    const staleReplace = deferred<ExclusionPolicyState>();
    invokeMock.mockImplementation((command: string, payload: { brainId: string }) => {
      if (command === "map_brain_exclusions") {
        return Promise.resolve(
          payload.brainId === BRAIN
            ? state(["alpha-cache"])
            : state(["beta-cache"], false, OTHER_BRAIN),
        );
      }
      if (command === "map_brain_exclusions_replace") return staleReplace.promise;
      throw new Error(`unexpected ${command}`);
    });
    const { rerender } = render(
      <ExclusionsPanel brainId={BRAIN} locale="en" disabled={false} onApplied={() => {}} />,
    );
    await screen.findByText("alpha-cache");
    fireEvent.change(screen.getByTestId("exclusions-input"), { target: { value: "alpha-new" } });
    fireEvent.click(screen.getByTestId("exclusions-add"));

    rerender(
      <ExclusionsPanel brainId={OTHER_BRAIN} locale="en" disabled={false} onApplied={() => {}} />,
    );
    await screen.findByText("beta-cache");
    fireEvent.change(screen.getByTestId("exclusions-input"), { target: { value: "beta-draft" } });
    await act(async () => staleReplace.reject(new Error("alpha refusal")));

    expect(screen.getByText("beta-cache")).toBeTruthy();
    expect(screen.queryByTestId("exclusions-error")).toBeNull();
    expect((screen.getByTestId("exclusions-input") as HTMLInputElement).value).toBe("beta-draft");
    expect(screen.getByTestId("exclusions-add")).not.toBeDisabled();
  });

  it("R4 publishes the current canonical answer and applies it normally", async () => {
    const replacement = deferred<ExclusionPolicyState>();
    const applied = vi.fn();
    invokeMock.mockImplementation((command: string, payload: { rules?: string[] }) => {
      if (command === "map_brain_exclusions") return Promise.resolve(state(["cache"]));
      if (command === "map_brain_exclusions_replace") {
        expect(payload.rules).toEqual(["cache", "autre\\tmp"]);
        return replacement.promise;
      }
      throw new Error(`unexpected ${command}`);
    });
    render(<ExclusionsPanel brainId={BRAIN} locale="fr" disabled={false} onApplied={applied} />);
    await screen.findByText("cache");
    fireEvent.change(screen.getByTestId("exclusions-input"), {
      target: { value: "autre\\tmp" },
    });
    fireEvent.click(screen.getByTestId("exclusions-add"));

    await act(async () => replacement.resolve(state(["autre/tmp", "cache"])));
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
