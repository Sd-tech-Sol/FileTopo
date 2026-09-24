import { beforeEach, describe, expect, it, vi } from "vitest";
import mapAppSource from "./MapApp.tsx?raw";
import type { WatchStatus } from "./types";
import badgeSource from "./WatchStatusBadge.tsx?raw";
import watchSource from "./watchStatus.ts?raw";
import {
  ReloadCoordinator,
  WATCH_STATUS_EVENT,
  WATCH_STATUS_KEYS,
  WATCH_STRINGS,
  WatchTracker,
  describeWatchStatus,
  isWatchVisible,
  parseWatchStatus,
  subscribeToWatchStatus,
  watchSymbol,
} from "./watchStatus";

/**
 * `TASK-0043` N — the interface's side of the automatic watcher, on the logic alone:
 * a **closed** envelope, an ordering that ignores late events, one reload at a time, and
 * no polling. The integration with the real `MapApp` is `watchMapApp.test.tsx`.
 */

const bus = vi.hoisted(() => ({
  handlers: new Set<(event: { payload: unknown }) => void>(),
  listened: [] as string[],
  fail: false,
}));
vi.mock("@tauri-apps/api/event", () => ({
  listen: async (name: string, handler: (event: { payload: unknown }) => void) => {
    if (bus.fail) throw new Error("no event channel");
    bus.listened.push(name);
    bus.handlers.add(handler);
    return () => bus.handlers.delete(handler);
  },
}));

const status = (over: Partial<WatchStatus> = {}): WatchStatus => ({
  brainId: "brain-a",
  state: "WATCHING",
  mode: "NATIVE",
  reason: null,
  indexRevision: 3,
  pending: false,
  sequence: 1,
  ...over,
});

beforeEach(() => {
  bus.handlers.clear();
  bus.listened.length = 0;
  bus.fail = false;
});

describe("the closed envelope", () => {
  it("accepts exactly the seven fields the backend emits", () => {
    expect(parseWatchStatus(status())).toEqual(status());
    expect([...WATCH_STATUS_KEYS]).toEqual(Object.keys(status()).sort());
    for (const state of ["STOPPED", "STARTING", "VERIFYING", "WATCHING", "PERIODIC", "DEGRADED"]) {
      expect(parseWatchStatus({ ...status(), state })).not.toBeNull();
    }
    expect(parseWatchStatus({ ...status(), reason: "SIGNALS_LOST", pending: true })).not.toBeNull();
    expect(parseWatchStatus({ ...status(), indexRevision: null })).not.toBeNull();
  });

  it("refuses the whole payload as soon as it carries anything else — a path, a name, a key…", () => {
    for (const extra of [
      "path",
      "relativePath",
      "absolutePath",
      "fileName",
      "name",
      "stableKey",
      "fileId",
      "volume",
      "volumeSerialNumber",
      "error",
      "osError",
      "message",
      "root",
    ]) {
      expect(
        parseWatchStatus({ ...status(), [extra]: "secret/dossier/fichier.txt" }),
        extra,
      ).toBeNull();
    }
  });

  it("refuses a missing field, a word outside the vocabulary and an invalid number", () => {
    const { pending: _pending, ...withoutPending } = status();
    expect(parseWatchStatus(withoutPending)).toBeNull();
    expect(parseWatchStatus({ ...status(), state: "ONLINE" })).toBeNull();
    expect(parseWatchStatus({ ...status(), mode: "POLLING" })).toBeNull();
    expect(parseWatchStatus({ ...status(), reason: "C:\\Users\\x" })).toBeNull();
    expect(parseWatchStatus({ ...status(), indexRevision: -1 })).toBeNull();
    expect(parseWatchStatus({ ...status(), indexRevision: 1.5 })).toBeNull();
    expect(parseWatchStatus({ ...status(), sequence: Number.NaN })).toBeNull();
    expect(parseWatchStatus({ ...status(), pending: "yes" })).toBeNull();
    expect(parseWatchStatus({ ...status(), brainId: "" })).toBeNull();
    for (const bad of [null, undefined, 3, "WATCHING", [], [status()]]) {
      expect(parseWatchStatus(bad)).toBeNull();
    }
  });
});

describe("ordering: an older generation never overwrites a newer state", () => {
  it("accepts only a strictly higher sequence, per brain", () => {
    const tracker = new WatchTracker();
    expect(tracker.has("brain-a")).toBe(false);
    expect(tracker.accept(status({ sequence: 5 }))).toBe(true);
    expect(tracker.accept(status({ sequence: 5 }))).toBe(false);
    expect(tracker.accept(status({ sequence: 4 }))).toBe(false); // late
    expect(tracker.accept(status({ sequence: 9 }))).toBe(true);
    expect(tracker.accept(status({ sequence: 6 }))).toBe(false); // late again
    // Another brain has its own line: it is neither blocked by nor blocking the first.
    expect(tracker.accept(status({ brainId: "brain-b", sequence: 1 }))).toBe(true);
    expect(tracker.accept(status({ brainId: "brain-b", sequence: 2 }))).toBe(true);
    expect(tracker.accept(status({ sequence: 10 }))).toBe(true);
    expect(tracker.has("brain-b")).toBe(true);
  });

  it("takes a first status of a brain whatever its sequence", () => {
    const tracker = new WatchTracker();
    expect(tracker.accept(status({ sequence: 0, state: "STOPPED", mode: "NONE" }))).toBe(true);
    expect(tracker.accept(status({ sequence: 1 }))).toBe(true);
  });
});

describe("reloads: at most one in flight, and a request during it yields exactly one more", () => {
  it("coalesces a burst of requests", async () => {
    const coordinator = new ReloadCoordinator();
    let calls = 0;
    let release: () => void = () => {};
    const gate = () =>
      new Promise<void>((resolve) => {
        release = resolve;
      });
    const reload = async () => {
      calls += 1;
      if (calls === 1) await gate();
    };
    const first = coordinator.request("brain-a", reload);
    // Five more while the first is still running.
    for (let index = 0; index < 5; index += 1) void coordinator.request("brain-a", reload);
    expect(calls).toBe(1);
    release();
    await first;
    expect(calls).toBe(2);
  });

  it("keeps brains apart and survives a failing reload", async () => {
    const coordinator = new ReloadCoordinator();
    const order: string[] = [];
    await Promise.all([
      coordinator.request("brain-a", async () => {
        order.push("a");
        throw new Error("unreadable");
      }),
      coordinator.request("brain-b", async () => {
        order.push("b");
      }),
    ]);
    expect(order.sort()).toEqual(["a", "b"]);
    await coordinator.request("brain-a", async () => {
      order.push("a again");
    });
    expect(order).toContain("a again");
  });
});

describe("the subscription", () => {
  it("listens to one closed event and forwards only valid statuses", async () => {
    const received: WatchStatus[] = [];
    const unlisten = await subscribeToWatchStatus((s) => received.push(s));
    expect(bus.listened).toEqual([WATCH_STATUS_EVENT]);
    for (const handler of bus.handlers) {
      handler({ payload: status({ sequence: 2 }) });
      handler({ payload: { ...status({ sequence: 3 }), relativePath: "a/b.txt" } });
      handler({ payload: "not a status" });
    }
    expect(received).toEqual([status({ sequence: 2 })]);
    unlisten();
    expect(bus.handlers.size).toBe(0);
  });

  it("is an empty subscription, never an error, when there is no event channel", async () => {
    bus.fail = true;
    const unlisten = await subscribeToWatchStatus(() => {});
    expect(typeof unlisten).toBe("function");
    unlisten();
  });
});

describe("words: every state and reason has one, and the four the person must tell apart differ", () => {
  it("has an entry for each member of the closed sets, in both languages", () => {
    for (const locale of ["fr", "en"] as const) {
      const words = WATCH_STRINGS[locale];
      expect(Object.keys(words.states).sort()).toEqual(
        ["DEGRADED", "PERIODIC", "STARTING", "STOPPED", "VERIFYING", "WATCHING"].sort(),
      );
      expect(Object.keys(words.modes).sort()).toEqual(["NATIVE", "NONE", "PERIODIC"]);
      expect(Object.keys(words.reasons)).toHaveLength(14);
      for (const value of [
        ...Object.values(words.states),
        ...Object.values(words.modes),
        ...Object.values(words.reasons),
      ]) {
        expect(value.length).toBeGreaterThan(3);
      }
    }
  });

  it("never says the same thing for WATCHING and PERIODIC, and a symbol always comes with them", () => {
    const watching = describeWatchStatus(status(), "fr");
    const periodic = describeWatchStatus(
      status({ state: "PERIODIC", mode: "PERIODIC", reason: "NATIVE_UNSUPPORTED" }),
      "fr",
    );
    expect(watching).toBe("Surveillance active");
    expect(periodic).toContain("Vérification périodique");
    expect(periodic).not.toContain("Surveillance active");
    expect(new Set(["WATCHING", "VERIFYING", "PERIODIC", "DEGRADED"].map((s) =>
      watchSymbol(s as WatchStatus["state"]),
    )).size).toBe(4);
    expect(WATCH_STRINGS.en.states.WATCHING).not.toBe(WATCH_STRINGS.en.states.PERIODIC);
  });

  it("shows nothing for a brain that is not watched", () => {
    expect(isWatchVisible(null)).toBe(false);
    expect(isWatchVisible(status({ state: "STOPPED", mode: "NONE" }))).toBe(false);
    expect(isWatchVisible(status({ state: "STARTING", mode: "NONE" }))).toBe(true);
  });
});

describe("no polling", () => {
  it("has no timer, no interval and no animation loop anywhere in the watcher's interface code", () => {
    for (const [file, source] of [
      ["watchStatus.ts", watchSource],
      ["WatchStatusBadge.tsx", badgeSource],
    ]) {
      for (const forbidden of ["setInterval", "setTimeout", "requestAnimationFrame", "requestIdleCallback"]) {
        expect(source.includes(forbidden), `${file} uses ${forbidden}`).toBe(false);
      }
    }
  });

  it("reads the state of a brain through one command that takes only the brain", () => {
    const source = mapAppSource;
    const uses = source.match(/invoke<[^>]*>\("map_watch_status"[^)]*\)/g) ?? [];
    expect(uses).toHaveLength(1);
    expect(uses[0]).toContain("{ brainId }");
    // Never started, stopped or restarted from the page.
    for (const forbidden of ["map_watch_start", "map_watch_stop", "map_watch_ensure", "map_watch_restart"]) {
      expect(source.includes(forbidden), forbidden).toBe(false);
    }
  });
});
