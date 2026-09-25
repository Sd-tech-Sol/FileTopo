import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NodeChangeState, { nodeStateKind } from "./NodeChangeState";
import stateSource from "./NodeChangeState.tsx?raw";
import appSource from "./MapApp.tsx?raw";
import detailsSource from "./DetailsPanel.tsx?raw";
import type { NodeChangeState as Dto } from "./types";

const invokeMock = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

const BRAIN = "brain-alpha";
const REF = { brainId: BRAIN, nodeId: 42 };

function dto(overrides: Partial<Dto> = {}): Dto {
  return {
    brainId: BRAIN,
    nodeId: 42,
    isNew: false,
    isUnseen: false,
    unseenChangeCount: 0,
    ...overrides,
  };
}

function backend(handlers: Record<string, (args: Record<string, unknown>) => unknown>) {
  invokeMock.mockImplementation((command: string, args: Record<string, unknown>) => {
    const handler = handlers[command];
    if (!handler) return Promise.reject(`unexpected command ${command}`);
    try {
      return Promise.resolve(handler(args));
    } catch (error) {
      return Promise.reject(error);
    }
  });
}

const commandsCalled = () => invokeMock.mock.calls.map(([command]) => String(command));

beforeEach(() => {
  invokeMock.mockReset();
});
afterEach(cleanup);

describe("TASK-0038 E — the selected element's state", () => {
  it("renders nothing and reads nothing without a selection", () => {
    const { container } = render(<NodeChangeState locale="fr" reference={null} revision={1} />);
    expect(container.textContent).toBe("");
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it("derives the label from the backend flags: new wins, then unseen, then seen — each a word", async () => {
    expect(nodeStateKind({ isNew: true, isUnseen: true })).toBe("new");
    expect(nodeStateKind({ isNew: false, isUnseen: true })).toBe("unseen");
    expect(nodeStateKind({ isNew: false, isUnseen: false })).toBe("seen");

    for (const [flags, word] of [
      [{ isNew: true, isUnseen: true, unseenChangeCount: 1 }, /Nouveau/],
      [{ isNew: false, isUnseen: true, unseenChangeCount: 2 }, /Non vu/],
      [{ isNew: false, isUnseen: false, unseenChangeCount: 0 }, /Vu/],
    ] as const) {
      cleanup();
      backend({ map_node_change_state: () => dto(flags) });
      render(<NodeChangeState locale="fr" reference={REF} revision={1} />);
      const badge = await screen.findByTestId("node-state-badge");
      expect(badge.textContent).toMatch(word);
    }
  });

  it("only READS on selection: it asks for the state of the named element and never marks", async () => {
    backend({
      map_node_change_state: () => dto({ isNew: true, isUnseen: true, unseenChangeCount: 1 }),
    });
    render(<NodeChangeState locale="fr" reference={REF} revision={1} />);
    await screen.findByTestId("node-state-badge");
    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith("map_node_change_state", { reference: REF });
    // Still nothing after the state settled: no auto-mark, however long it stays open.
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(commandsCalled()).toEqual(["map_node_change_state"]);
    expect(screen.getByTestId("node-state-badge").getAttribute("data-state")).toBe("new");
  });

  it("a seen element offers no mutation", async () => {
    backend({ map_node_change_state: () => dto() });
    render(<NodeChangeState locale="fr" reference={REF} revision={1} />);
    await screen.findByTestId("node-state-badge");
    expect(screen.queryByTestId("node-mark-seen")).toBeNull();
  });

  it("marks the element through its BrainNodeRef, then re-reads the state from the backend", async () => {
    let unseen = true;
    backend({
      map_node_change_state: () =>
        dto({ isNew: unseen, isUnseen: unseen, unseenChangeCount: unseen ? 1 : 0 }),
      map_node_mark_seen: () => {
        unseen = false;
        return { brainId: BRAIN, nodeId: 42, newlySeenCount: 1 };
      },
    });
    const onSeenChange = vi.fn();
    render(<NodeChangeState locale="fr" reference={REF} revision={1} onSeenChange={onSeenChange} />);
    fireEvent.click(await screen.findByTestId("node-mark-seen"));

    await waitFor(() =>
      expect(screen.getByTestId("node-state-badge").getAttribute("data-state")).toBe("seen"),
    );
    expect(invokeMock).toHaveBeenCalledWith("map_node_mark_seen", { reference: REF });
    expect(onSeenChange).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("node-mark-seen")).toBeNull();
  });

  it("re-reads when the index revision or the seen revision moves, and only reads", async () => {
    backend({ map_node_change_state: () => dto() });
    const { rerender } = render(<NodeChangeState locale="fr" reference={REF} revision={1} seenRevision={0} />);
    await screen.findByTestId("node-state-badge");
    expect(invokeMock).toHaveBeenCalledTimes(1);
    rerender(<NodeChangeState locale="fr" reference={REF} revision={2} seenRevision={0} />);
    await waitFor(() => expect(invokeMock).toHaveBeenCalledTimes(2));
    rerender(<NodeChangeState locale="fr" reference={REF} revision={2} seenRevision={1} />);
    await waitFor(() => expect(invokeMock).toHaveBeenCalledTimes(3));
    expect(commandsCalled().every((c) => c === "map_node_change_state")).toBe(true);
  });

  it("shares nothing across brains: the previous state disappears and an answer for the wrong brain is refused", async () => {
    backend({
      map_node_change_state: () => dto({ isNew: true, isUnseen: true, unseenChangeCount: 1 }),
    });
    const { rerender } = render(<NodeChangeState locale="fr" reference={REF} revision={1} />);
    await screen.findByTestId("node-state-badge");

    // Same node number, another brain — and a backend that (wrongly) answers for the old one.
    rerender(<NodeChangeState locale="fr" reference={{ brainId: "brain-beta", nodeId: 42 }} revision={1} />);
    await waitFor(() => expect(screen.queryByTestId("node-state-error")).not.toBeNull());
    expect(screen.queryByTestId("node-state-badge")).toBeNull();
    expect(screen.queryByTestId("node-mark-seen")).toBeNull();
    expect(screen.getByTestId("node-state-error").textContent).toMatch(/autre élément refusé/);
  });

  it("refuses a state answered for another node", async () => {
    backend({
      map_node_change_state: () => dto({ nodeId: 99, isUnseen: true, unseenChangeCount: 1 }),
    });
    render(<NodeChangeState locale="fr" reference={REF} revision={1} />);
    await waitFor(() => expect(screen.queryByTestId("node-state-error")).not.toBeNull());
    expect(screen.queryByTestId("node-state-badge")).toBeNull();
  });

  it("drops a stale answer: the selection moved on while it was in flight", async () => {
    let resolveFirst: (value: Dto) => void = () => undefined;
    invokeMock.mockImplementationOnce(
      () => new Promise<Dto>((resolve) => (resolveFirst = resolve)),
    );
    const { rerender } = render(<NodeChangeState locale="fr" reference={REF} revision={1} />);
    invokeMock.mockResolvedValueOnce(dto({ nodeId: 43 }));
    rerender(<NodeChangeState locale="fr" reference={{ brainId: BRAIN, nodeId: 43 }} revision={1} />);
    await screen.findByTestId("node-state-badge");
    resolveFirst(dto({ isNew: true, isUnseen: true, unseenChangeCount: 5 }));
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(screen.getByTestId("node-state-badge").getAttribute("data-state")).toBe("seen");
  });

  it("refuses an acknowledgement answered for another node and says so", async () => {
    backend({
      map_node_change_state: () => dto({ isUnseen: true, unseenChangeCount: 1 }),
      map_node_mark_seen: () => ({ brainId: BRAIN, nodeId: 7, newlySeenCount: 1 }),
    });
    const onSeenChange = vi.fn();
    render(<NodeChangeState locale="fr" reference={REF} revision={1} onSeenChange={onSeenChange} />);
    fireEvent.click(await screen.findByTestId("node-mark-seen"));
    await waitFor(() =>
      expect(screen.getByTestId("node-state-error").textContent).toMatch(/autre élément refusée/),
    );
    expect(onSeenChange).not.toHaveBeenCalled();
    expect(screen.getByTestId("node-state-badge").getAttribute("data-state")).toBe("unseen");
  });

  it("shows a backend refusal (a node no longer in the Index) without inventing a state", async () => {
    backend({
      map_node_change_state: () => {
        throw "map_node_missing: 42";
      },
    });
    render(<NodeChangeState locale="fr" reference={REF} revision={1} />);
    await waitFor(() =>
      expect(screen.getByTestId("node-state-error").textContent).toMatch(/map_node_missing/),
    );
    expect(screen.queryByTestId("node-state-badge")).toBeNull();
  });
});

describe("TASK-0038 — wiring: selection never marks, and only the named boundaries are used", () => {
  it("the only mutation of the component is the explicit button handler", () => {
    expect(stateSource.match(/"map_node_mark_seen"/g)).toHaveLength(1);
    const markStart = stateSource.indexOf("async function markSeen()");
    const markEnd = stateSource.indexOf("const kind = state");
    expect(markStart).toBeGreaterThan(-1);
    expect(stateSource.indexOf('"map_node_mark_seen"')).toBeGreaterThan(markStart);
    expect(stateSource.indexOf('"map_node_mark_seen"')).toBeLessThan(markEnd);
    // The effect that runs on selection reads only.
    const effectStart = stateSource.indexOf('invoke<NodeChangeStateDto>("map_node_change_state"');
    expect(effectStart).toBeGreaterThan(-1);
    expect(stateSource.slice(effectStart, markStart)).not.toContain("mark_seen");
    expect(stateSource).toMatch(/onClick=\{\(\) => void markSeen\(\)\}/);
    expect(stateSource).not.toMatch(/absolutePath|stableKey|fileId|volumeSerial|localPath/i);
  });

  it("MapApp never marks by itself: no acknowledgement command is named outside the two components", () => {
    for (const command of [
      "map_change_mark_seen",
      "map_node_mark_seen",
      "map_change_mark_all_seen",
    ]) {
      expect(appSource).not.toContain(command);
    }
    expect(appSource).toContain("<NodeChangeState");
    expect(appSource).toContain("changeState={");
    expect(appSource).toContain("seenRevision={seenRevision}");
    // The panel that hosts the slot holds no seen/unseen logic of its own.
    expect(detailsSource).toContain("{changeState}");
    expect(detailsSource).not.toMatch(/mark_seen|isUnseen|isNew/);
  });
});
