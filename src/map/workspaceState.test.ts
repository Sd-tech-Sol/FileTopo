import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  WORKSPACE_CORRECTIONS,
  WorkspaceWriter,
  buildWorkspaceState,
  parseWorkspaceRestore,
  parseWorkspaceState,
  sameWorkspace,
  type LiveWorkspace,
  type WorkspaceState,
} from "./workspaceState";

// `TASK-0053` / `DEC-0051` — the interface's half of F-052: the defensive reader, the
// ownership rule, and the bounded writer (P19-1, P19-12, falsification 9).

const view = (scale = 1.5) => ({ scale, tx: -20, ty: 8 });

const full = (): WorkspaceState => ({
  displayedBrainIds: ["brain-alpha", "brain-beta"],
  focusedBrainId: "brain-beta",
  view: view(),
  selected: { brainId: "brain-beta", nodeId: 5 },
  legendOpen: true,
  density: "compact",
  motion: "reduce",
  branchFocus: {
    brainId: "brain-alpha",
    rootNodeId: 2,
    collapsedIds: [3, 9],
    savedView: view(0.8),
    savedSelected: { brainId: "brain-alpha", nodeId: 1 },
  },
});

describe("the defensive reader", () => {
  it("accepts exactly the closed shape and returns a copy", () => {
    const payload = full();
    const parsed = parseWorkspaceState(JSON.parse(JSON.stringify(payload)));
    expect(parsed).toEqual(payload);
    expect(sameWorkspace(parsed!, payload)).toBe(true);
  });

  it("refuses an unknown key, a missing key, a wrong word and an out-of-bounds number", () => {
    const base = JSON.parse(JSON.stringify(full())) as Record<string, unknown>;
    const mutate = (change: (value: Record<string, any>) => void) => {
      const copy = JSON.parse(JSON.stringify(base)) as Record<string, any>;
      change(copy);
      return parseWorkspaceState(copy);
    };
    expect(mutate((v) => (v.path = "x"))).toBeNull();
    expect(mutate((v) => delete v.motion)).toBeNull();
    expect(mutate((v) => (v.density = "dense"))).toBeNull();
    expect(mutate((v) => (v.density = "COMPACT"))).toBeNull();
    expect(mutate((v) => (v.motion = "force"))).toBeNull();
    expect(mutate((v) => (v.legendOpen = "yes"))).toBeNull();
    expect(mutate((v) => (v.displayedBrainIds = []))).toBeNull();
    expect(mutate((v) => (v.focusedBrainId = "brain-gamma"))).toBeNull();
    expect(mutate((v) => (v.view = { scale: 0, tx: 0, ty: 0 }))).toBeNull();
    expect(mutate((v) => (v.view = { scale: 1, tx: 0, ty: 0, extra: 1 }))).toBeNull();
    expect(mutate((v) => (v.selected = { brainId: "brain-alpha", nodeId: 0 }))).toBeNull();
    expect(mutate((v) => (v.selected = { brainId: "", nodeId: 3 }))).toBeNull();
    expect(mutate((v) => (v.branchFocus.collapsedIds = [3, "x"]))).toBeNull();
    expect(mutate((v) => (v.branchFocus.cursor = "ftf1"))).toBeNull();
    expect(mutate((v) => (v.branchFocus.savedView = { scale: 1e9, tx: 0, ty: 0 }))).toBeNull();
    expect(parseWorkspaceState(null)).toBeNull();
    expect(parseWorkspaceState([])).toBeNull();
  });

  it("reads a restore answer only with a known correction word", () => {
    const answer = { workspace: full(), corrections: ["BRAIN_MISSING", "BRANCH_GENERATION_CHANGED"] };
    expect(parseWorkspaceRestore(answer)?.corrections).toEqual(["BRAIN_MISSING", "BRANCH_GENERATION_CHANGED"]);
    expect(parseWorkspaceRestore({ ...answer, corrections: ["SOMETHING_ELSE"] })).toBeNull();
    expect(parseWorkspaceRestore({ ...answer, corrections: "BRAIN_MISSING" })).toBeNull();
    expect(parseWorkspaceRestore({ workspace: null, corrections: [] })).toBeNull();
    expect(new Set(WORKSPACE_CORRECTIONS).size).toBe(WORKSPACE_CORRECTIONS.length);
  });
});

describe("the ownership rule (one truth per value)", () => {
  const live = (over: Partial<LiveWorkspace> = {}): LiveWorkspace => ({
    displayedBrainIds: ["brain-alpha"],
    focusedBrainId: "brain-alpha",
    view: view(),
    selected: { brainId: "brain-alpha", nodeId: 7 },
    legendOpen: true,
    density: "compact",
    motion: "reduce",
    branch: null,
    ...over,
  });

  it("copies neither the camera nor the selection of a brain that is alone — the resume state owns them", () => {
    const built = buildWorkspaceState(live());
    expect(built.view).toBeNull();
    expect(built.selected).toBeNull();
    // The preferences are the workspace's own.
    expect([built.legendOpen, built.density, built.motion]).toEqual([true, "compact", "reduce"]);
  });

  it("owns the camera and the selection of a composition of several brains", () => {
    const built = buildWorkspaceState(live({ displayedBrainIds: ["brain-alpha", "brain-beta"] }));
    expect(built.view).toEqual(view());
    expect(built.selected).toEqual({ brainId: "brain-alpha", nodeId: 7 });
  });

  it("owns what is on screen inside a branch focus, whatever the number of brains", () => {
    const built = buildWorkspaceState(
      live({
        branch: { brainId: "brain-alpha", rootNodeId: 2, collapsed: [3], savedView: view(0.5), savedSelected: null },
      }),
    );
    expect(built.view).toEqual(view());
    expect(built.selected).toEqual({ brainId: "brain-alpha", nodeId: 7 });
    expect(built.branchFocus).toEqual({
      brainId: "brain-alpha",
      rootNodeId: 2,
      collapsedIds: [3],
      savedView: view(0.5),
      savedSelected: null,
    });
  });

  it("never writes a camera the core would refuse", () => {
    const built = buildWorkspaceState(
      live({ displayedBrainIds: ["brain-alpha", "brain-beta"], view: { scale: Number.NaN, tx: 0, ty: 0 } }),
    );
    expect(built.view).toBeNull();
  });

  it("contains nothing but ids, numbers and closed words", () => {
    const text = JSON.stringify(full());
    for (const forbidden of ["path", "name", "stable", "cursor", "ftf1", ".txt", "\\"]) {
      expect(text).not.toContain(forbidden);
    }
  });
});

describe("the bounded writer", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const make = (write = vi.fn(async () => undefined)) => {
    const writer = new WorkspaceWriter({ write, debounceMs: 250, maxWaitMs: 1500 });
    return { writer, write };
  };

  it("writes nothing before the stored workspace was read", async () => {
    const { writer, write } = make();
    writer.set(full());
    await vi.advanceTimersByTimeAsync(5000);
    expect(write).not.toHaveBeenCalled();
    expect(writer.isSeeded()).toBe(false);
  });

  it("writes nothing for what was just restored, and nothing for an equal state", async () => {
    const { writer, write } = make();
    writer.seed(full());
    writer.set(full());
    await vi.advanceTimersByTimeAsync(5000);
    expect(write).not.toHaveBeenCalled();
  });

  it("an explicit change (legend, density, motion, composition, branch) goes out at once", async () => {
    const { writer, write } = make();
    writer.seed({ ...full(), legendOpen: false });
    writer.set({ ...full(), legendOpen: true });
    await vi.advanceTimersByTimeAsync(0);
    expect(write).toHaveBeenCalledTimes(1);
    expect((write.mock.calls[0] as unknown as [WorkspaceState])[0].legendOpen).toBe(true);

    writer.set({ ...full(), density: "comfortable" });
    await vi.advanceTimersByTimeAsync(0);
    writer.set({ ...full(), density: "comfortable", motion: "system" });
    await vi.advanceTimersByTimeAsync(0);
    writer.set({ ...full(), density: "comfortable", motion: "system", branchFocus: null });
    await vi.advanceTimersByTimeAsync(0);
    expect(write).toHaveBeenCalledTimes(4);
  });

  it("a camera or selection change alone is debounced, and the last value wins", async () => {
    const { writer, write } = make();
    writer.seed(full());
    for (let step = 1; step <= 20; step += 1) writer.set({ ...full(), view: view(1.5 + step / 100) });
    await vi.advanceTimersByTimeAsync(249);
    expect(write).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2);
    expect(write).toHaveBeenCalledTimes(1);
    expect((write.mock.calls[0] as unknown as [WorkspaceState])[0].view?.scale).toBeCloseTo(1.7, 9);
  });

  it("a continuous gesture never costs a write per pointer event (falsification 9)", async () => {
    const { writer, write } = make();
    writer.seed(full());
    // A drag for 6 seconds at ~60 events per second, never silent for 250 ms.
    for (let frame = 0; frame < 360; frame += 1) {
      writer.set({ ...full(), view: { scale: 1.5, tx: -20 + frame, ty: 8 } });
      await vi.advanceTimersByTimeAsync(16);
    }
    await vi.advanceTimersByTimeAsync(2000);
    // 6 s / 1.5 s ceiling + the final one: a handful, never hundreds.
    expect(write.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(write.mock.calls.length).toBeLessThanOrEqual(6);
    expect(writer.writes).toBe(write.mock.calls.length);
    expect((write.mock.calls[write.mock.calls.length - 1] as unknown as [WorkspaceState])[0].view?.tx).toBe(-20 + 359);
  });

  it("a camera move does not delay an explicit change that is waiting", async () => {
    const { writer, write } = make();
    writer.seed(full());
    writer.set({ ...full(), legendOpen: false });
    writer.set({ ...full(), legendOpen: false, view: view(3) });
    await vi.advanceTimersByTimeAsync(0);
    expect(write).toHaveBeenCalledTimes(1);
    expect((write.mock.calls[0] as unknown as [WorkspaceState])[0]).toMatchObject({ legendOpen: false, view: view(3) });
  });

  it("never runs two writes at once: the newest value leaves when the first has finished", async () => {
    let release: () => void = () => {};
    let running = 0;
    let maxRunning = 0;
    const write = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          running += 1;
          maxRunning = Math.max(maxRunning, running);
          release = () => {
            running -= 1;
            resolve();
          };
        }),
    );
    const writer = new WorkspaceWriter({ write });
    writer.seed(full());
    writer.set({ ...full(), legendOpen: false });
    await vi.advanceTimersByTimeAsync(0);
    expect(write).toHaveBeenCalledTimes(1);
    writer.set({ ...full(), legendOpen: false, density: "comfortable" });
    const flushed = writer.flush();
    await vi.advanceTimersByTimeAsync(0);
    expect(write).toHaveBeenCalledTimes(1);
    release();
    await vi.advanceTimersByTimeAsync(0);
    expect(write).toHaveBeenCalledTimes(2);
    release();
    await flushed;
    expect(maxRunning).toBe(1);
    expect(writer.hasPending()).toBe(false);
  });

  it("flush writes the last value now, as a normal close does", async () => {
    const { writer, write } = make();
    writer.seed(full());
    writer.set({ ...full(), view: view(2) });
    await writer.flush();
    expect(write).toHaveBeenCalledTimes(1);
    expect(writer.hasPending()).toBe(false);
  });

  it("a failed write is reported, keeps the value and tries again later", async () => {
    const onError = vi.fn();
    const write = vi.fn().mockRejectedValueOnce(new Error("locked")).mockResolvedValue(undefined);
    const writer = new WorkspaceWriter({ write, onError, maxWaitMs: 1500 });
    writer.seed(full());
    writer.set({ ...full(), legendOpen: false });
    await vi.advanceTimersByTimeAsync(0);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(writer.hasPending()).toBe(true);
    await vi.advanceTimersByTimeAsync(1600);
    expect(write).toHaveBeenCalledTimes(2);
    expect(writer.hasPending()).toBe(false);
  });
});
