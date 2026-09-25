import { withHostLanguages } from "../test/hostLanguage";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MapApp from "./MapApp";
import type { MapProjection, SourceObservation, WatchStatus } from "./types";

/**
 * `TASK-0043` N — the real `MapApp` against a scripted backend and a fake event bus.
 *
 * What it proves about the interface's side of the automatic watcher:
 *
 * * the state of a brain is read **once**, by brain id alone, and everything after comes
 *   from one closed event — never a poll, never a start;
 * * `STARTING` / `VERIFYING`, `WATCHING` and `PERIODIC` are three different sentences;
 * * an event carrying a **new revision** for the displayed brain reloads its map, keeps the
 *   branch the person is on, and makes the journal and the selected element read again —
 *   with `map_open` and `map_view` only, the source never touched;
 * * an event for a brain that is **not displayed** replaces nothing on screen;
 * * an unavailable source keeps the loaded map and moves the `F-032` badge;
 * * an event of an older generation, and a payload with a path in it, change nothing.
 */
const invokeMock = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...args: unknown[]) => invokeMock(...args) }));

const bus = vi.hoisted(() => ({
  handlers: new Set<(event: { payload: unknown }) => void>(),
}));
vi.mock("@tauri-apps/api/event", () => ({
  listen: async (_name: string, handler: (event: { payload: unknown }) => void) => {
    bus.handlers.add(handler);
    return () => bus.handlers.delete(handler);
  },
}));

const A = "brain-alpha";
const B = "brain-beta";
const record = (brainId: string, name: string, position: number) => ({
  brainId,
  displayName: name,
  color: "#2b6cb0",
  icon: name[0],
  sourceKind: "REAL_ROOT",
  sourceRef: `00000000-0000-4000-8000-00000000000${position}`,
  sourceLabel: "racine-synthetique",
  position,
});

const SYNCED = (revision: number): SourceObservation => ({
  state: "SYNCED",
  reason: null,
  observedUnixMs: 1_790_000_000_000,
  lastSuccessfulRevision: revision,
  lastSuccessfulUnixMs: 1_790_000_000_000,
  persisted: true,
});
const UNAVAILABLE: SourceObservation = {
  state: "UNAVAILABLE",
  reason: "ROOT_NOT_FOUND",
  observedUnixMs: 1_790_000_100_000,
  lastSuccessfulRevision: 3,
  lastSuccessfulUnixMs: 1_790_000_000_000,
  persisted: true,
};

const node = (id: number, parentId: number | null, name: string, kind: "root" | "file") => ({
  id,
  parentId,
  name,
  relativePath: parentId === null ? "" : name,
  kind,
  depth: parentId === null ? 0 : 1,
  sizeBytes: id,
  modifiedUnixMs: 1,
  childCount: parentId === null ? id : 0,
  accessDiagnostic: null,
  rect: { x: (id - 1) * 300, y: 0, w: 240, h: 64 },
});

/** The Index as the scripted backend serves it: revision 3 has two nodes, revision 4 three. */
const projection = (brainId: string, revision: number): MapProjection => {
  const nodes = [node(1, null, "racine-synthetique", "root"), node(2, 1, "a.txt", "file")];
  if (revision >= 4) nodes.push(node(3, 1, "nouveau.txt", "file"));
  return {
    brainId,
    fixtureId: "racine-synthetique",
    label: "racine-synthetique",
    rootId: 1,
    nodeCount: nodes.length,
    layoutWidth: 960,
    layoutHeight: 200,
    schemaVersion: 6,
    layoutAlgorithm: "layered-tree-cards-v1",
    nodes,
    diagnostics: [],
    indexRevision: revision,
    focusId: 1,
    viewBudget: 512,
    materializedCount: nodes.length,
    nonMaterializedCount: 0,
    hiddenReason: null,
    aggregates: [],
    hierarchyEdges: nodes.filter((n) => n.parentId !== null).map((n) => ({ parentId: 1, childId: n.id })),
  } as MapProjection;
};

const world = { revision: 3, observation: SYNCED(3), openDelay: null as null | Promise<void> };

const status = (over: Partial<WatchStatus> = {}): WatchStatus => ({
  brainId: A,
  state: "VERIFYING",
  mode: "NATIVE",
  reason: "INITIAL_CHECK",
  indexRevision: 3,
  pending: false,
  sequence: 1,
  ...over,
});

const emit = (payload: unknown) =>
  act(() => {
    for (const handler of [...bus.handlers]) handler({ payload });
  });

const calls = () => invokeMock.mock.calls.map(([command, args]) => ({ command: String(command), args }));
const called = (command: string, brainId?: string) =>
  calls().filter(
    (call) =>
      call.command === command &&
      (brainId === undefined || (call.args as { brainId?: string } | undefined)?.brainId === brainId),
  );

// `TASK-0046` — these suites assert the French wording: they run on a French host.
withHostLanguages(["fr-CA"]);

beforeEach(() => {
  bus.handlers.clear();
  world.revision = 3;
  world.observation = SYNCED(3);
  world.openDelay = null;
  invokeMock.mockReset();
  invokeMock.mockImplementation(async (command: string, args?: { brainId?: string }) => {
    const brainId = args?.brainId ?? A;
    switch (command) {
      case "map_fixtures":
        return [];
      case "map_host_info":
        return {
          sandboxRoot: "sandbox",
          appVersion: "0.0.0",
          sqliteVersion: "0",
          webviewVersion: "0",
          tauriVersion: "0",
          platform: "test",
          nodeCeiling: 5000,
          depthCeiling: 12,
          cardWidth: 240,
          cardHeight: 64,
          layoutAlgorithm: "layered-tree-cards-v1",
          autoMeasure: false,
          autoVerify: false,
          autoRelations: false,
          autoBrainsPass: 0,
          autoComposedPass: 0,
          autoCrossPass: 0,
          autoTopographicPass: 0,
        };
      case "map_brains":
        return {
          brains: [record(A, "Alpha", 0), record(B, "Beta", 1)],
          activeBrainId: A,
          schemaVersion: 1,
          catalogPath: "catalog.sqlite",
          seeded: 0,
        };
      case "map_ui_preferences":
        return { detailsPanelVisible: true };
      case "map_open":
        if (world.openDelay) await world.openDelay;
        return {
          brainId,
          state: "OPENED_EXISTING",
          indexId: "index-1",
          revision: world.revision,
          nodeCount: world.revision >= 4 ? 3 : 2,
          schemaVersion: 6,
          sourceRead: false,
          indexReused: true,
          freshness: "UNKNOWN",
          sourceObservation: world.observation,
        };
      case "map_view": {
        const shown = projection(brainId, world.revision);
        const filter = (args as unknown as { filter?: unknown }).filter;
        if (filter) {
          shown.filtered = {
            filter: filter as never,
            filteredTotal: 1,
            materializedMatchCount: 1,
            filterMatchIds: [2],
            filterContextIds: [1],
            filterNextCursor: null,
          };
        }
        return shown;
      }
      case "map_brain_activate":
        return record(brainId, "Alpha", 0);
      case "map_watch_status":
        return status({ brainId });
      case "map_source_observation":
        return world.observation;
      case "map_change_journal":
        return {
          brainId,
          indexId: "index-1",
          indexRevision: world.revision,
          natures: [],
          total: 0,
          unseenTotal: 0,
          items: [],
          nextCursor: null,
          limit: 25,
        };
      case "map_node_detail": {
        const { nodeId } = (args as unknown as { reference: { nodeId: number } }).reference;
        const found = projection(brainId, world.revision).nodes.find((n) => n.id === nodeId);
        return { node: found, parent: null, children: [], omittedChildren: 0, nextCursor: null };
      }
      case "map_node_change_state":
        return {
          brainId,
          nodeId: (args as unknown as { reference: { nodeId: number } }).reference.nodeId,
          isNew: false,
          isUnseen: false,
          unseenChangeCount: 0,
        };
      default:
        return null;
    }
  });
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

async function boot() {
  render(<MapApp />);
  await waitFor(() => expect(screen.getByTestId("composed-total").textContent).toContain("2"));
  await waitFor(() => expect(screen.getByTestId("watch-status")).toBeTruthy());
}

const badge = () => screen.getByTestId("watch-status");

describe("the state of the watcher, read once and then only from one closed event", () => {
  it("reads it once for the displayed real root, by brain id alone, and never starts anything", async () => {
    await boot();
    const reads = called("map_watch_status");
    expect(reads).toHaveLength(1);
    expect(reads[0].args).toEqual({ brainId: A });
    // The brain that is not on screen is not read at all.
    expect(called("map_watch_status", B)).toHaveLength(0);
    // Initially: starting / verifying, never watching.
    expect(badge().getAttribute("data-state")).toBe("VERIFYING");
    expect(badge().textContent).toContain("Vérification en cours");
    expect(badge().textContent).not.toContain("Surveillance active");
    // The interface has no way to drive a watcher.
    const names = calls().map((call) => call.command);
    for (const forbidden of ["map_watch_start", "map_watch_stop", "map_watch_ensure", "map_refresh", "map_rebuild"]) {
      expect(names).not.toContain(forbidden);
    }
  });

  it("tells WATCHING and PERIODIC apart, from events alone", async () => {
    await boot();
    await emit(status({ state: "WATCHING", reason: null, sequence: 3 }));
    await waitFor(() => expect(badge().getAttribute("data-state")).toBe("WATCHING"));
    expect(badge().textContent).toContain("Surveillance active");
    expect(badge().getAttribute("data-mode")).toBe("NATIVE");

    await emit(
      status({ state: "PERIODIC", mode: "PERIODIC", reason: "NATIVE_UNSUPPORTED", sequence: 5 }),
    );
    await waitFor(() => expect(badge().getAttribute("data-state")).toBe("PERIODIC"));
    expect(badge().textContent).toContain("Vérification périodique");
    expect(badge().textContent).not.toContain("Surveillance active");
    expect(badge().getAttribute("data-mode")).toBe("PERIODIC");

    // No poll: however many events came, the state was read exactly once.
    expect(called("map_watch_status")).toHaveLength(1);
  });

  it("uses no timer of its own: the number of interval timers does not move while events flow", async () => {
    const intervals = vi.spyOn(globalThis, "setInterval");
    try {
      await boot();
      const before = intervals.mock.calls.length;
      for (let sequence = 3; sequence < 12; sequence += 1) {
        await emit(status({ state: "WATCHING", reason: null, sequence }));
      }
      expect(intervals.mock.calls.length).toBe(before);
    } finally {
      intervals.mockRestore();
    }
  });
});

describe("a new revision of the displayed brain reloads it, in place", () => {
  it("re-reads the map, the journal and the selected element without touching the source", async () => {
    await boot();
    await emit(status({ state: "WATCHING", reason: null, sequence: 3 }));

    // Open the journal so its own reload is observable.
    fireEvent.click(screen.getByTestId("journal-toggle"));
    await waitFor(() => expect(called("map_change_journal", A).length).toBeGreaterThan(0));
    await waitFor(() => expect(called("map_node_change_state").length).toBeGreaterThan(0));
    const journalBefore = called("map_change_journal", A).length;
    const stateBefore = called("map_node_change_state").length;
    const opensBefore = called("map_open", A).length;
    const detailsBefore = called("map_node_detail").length;

    // The watcher committed revision 4: something appeared in the tree.
    world.revision = 4;
    world.observation = SYNCED(4);
    await emit(status({ state: "WATCHING", reason: null, indexRevision: 4, sequence: 4 }));

    await waitFor(() => expect(screen.getByTestId("composed-total").textContent).toContain("3"));
    expect(screen.getByTestId("report-brain").textContent).toContain("révision 4");
    expect(called("map_open", A).length).toBe(opensBefore + 1);
    await waitFor(() => expect(called("map_change_journal", A).length).toBeGreaterThan(journalBefore));
    await waitFor(() => expect(called("map_node_change_state").length).toBeGreaterThan(stateBefore));
    await waitFor(() => expect(called("map_node_detail").length).toBeGreaterThan(detailsBefore));

    // Only reads of FileTopo's own state: no scan, no rebuild, no source.
    const names = calls().map((call) => call.command);
    expect(names).not.toContain("map_refresh");
    expect(names).not.toContain("map_rebuild");
    expect(names).not.toContain("map_prepare_synthetic_source");
    // The source badge follows the backend's own record.
    expect(screen.getByTestId("source-observation").getAttribute("data-state")).toBe("SYNCED");
  });

  it("re-reads an active new / unseen filter on the new revision", async () => {
    await boot();
    await emit(status({ state: "WATCHING", reason: null, sequence: 3 }));
    fireEvent.click(screen.getByTestId("filter-state-NEW"));
    await waitFor(() =>
      expect(called("map_view", A).some((call) => (call.args as { filter?: unknown }).filter)).toBe(true),
    );
    const filtered = () =>
      called("map_view", A).filter((call) => (call.args as { filter?: unknown }).filter).length;
    const before = filtered();

    world.revision = 4;
    world.observation = SYNCED(4);
    await emit(status({ state: "WATCHING", reason: null, indexRevision: 4, sequence: 4 }));

    await waitFor(() => expect(screen.getByTestId("report-brain").textContent).toContain("révision 4"));
    await waitFor(() => expect(filtered()).toBeGreaterThan(before));
    // The filter is still the person's own: it was re-read, not dropped.
    expect(
      (screen.getByTestId("filter-state-NEW") as HTMLInputElement).checked,
    ).toBe(true);
  });

  it("does not reload for an event that carries the revision already on screen", async () => {
    await boot();
    const opens = called("map_open", A).length;
    const views = called("map_view", A).length;
    await emit(status({ state: "WATCHING", reason: null, indexRevision: 3, sequence: 3 }));
    await emit(status({ state: "VERIFYING", reason: "MORE_SIGNALS", indexRevision: 3, sequence: 4 }));
    await waitFor(() => expect(badge().getAttribute("data-state")).toBe("VERIFYING"));
    expect(called("map_open", A).length).toBe(opens);
    expect(called("map_view", A).length).toBe(views);
  });

  it("coalesces a burst of revisions into one reload in flight and one more", async () => {
    await boot();
    const opens = called("map_open", A).length;
    let release: () => void = () => {};
    world.openDelay = new Promise<void>((resolve) => {
      release = resolve;
    });
    world.revision = 6;
    world.observation = SYNCED(6);
    for (const [sequence, revision] of [[3, 4], [4, 5], [5, 6]] as const) {
      await emit(status({ state: "WATCHING", reason: null, indexRevision: revision, sequence }));
    }
    await waitFor(() => expect(called("map_open", A).length).toBe(opens + 1));
    release();
    await waitFor(() => expect(screen.getByTestId("report-brain").textContent).toContain("révision 6"));
    // One that was running, one more for what arrived meanwhile — never one per event.
    expect(called("map_open", A).length).toBeLessThanOrEqual(opens + 2);
  });
});

describe("brains stay apart, and the map survives an unavailable source", () => {
  it("records — and shows nothing of — an event for a brain that is not displayed", async () => {
    await boot();
    const before = screen.getByTestId("composed-total").textContent;
    const opens = called("map_open").length;
    const views = called("map_view").length;
    world.revision = 9;
    await emit(status({ brainId: B, state: "WATCHING", reason: null, indexRevision: 9, sequence: 40 }));
    await emit(status({ brainId: B, state: "DEGRADED", mode: "NONE", reason: "SOURCE_UNAVAILABLE", sequence: 41 }));
    // The active brain's badge and map are untouched; nothing was read for the other one.
    expect(screen.getByTestId("composed-total").textContent).toBe(before);
    expect(badge().getAttribute("data-state")).toBe("VERIFYING");
    expect(called("map_open", B)).toHaveLength(0);
    expect(called("map_view", B)).toHaveLength(0);
    expect(called("map_open")).toHaveLength(opens);
    expect(called("map_view")).toHaveLength(views);
  });

  it("keeps the loaded map when the source becomes unavailable, and moves the F-032 badge", async () => {
    await boot();
    await emit(status({ state: "WATCHING", reason: null, sequence: 3 }));
    const totalBefore = screen.getByTestId("composed-total").textContent;
    const opens = called("map_open", A).length;
    world.observation = UNAVAILABLE;

    await emit(
      status({ state: "DEGRADED", mode: "NONE", reason: "SOURCE_UNAVAILABLE", indexRevision: 3, sequence: 4 }),
    );

    await waitFor(() => expect(badge().getAttribute("data-state")).toBe("DEGRADED"));
    expect(badge().getAttribute("role")).toBe("alert");
    await waitFor(() =>
      expect(screen.getByTestId("source-observation").getAttribute("data-state")).toBe("UNAVAILABLE"),
    );
    expect(screen.getByTestId("composed-total").textContent).toBe(totalBefore);
    expect(called("map_open", A).length).toBe(opens); // no reload: nothing new was committed
    // Read on each settled transition (WATCHING, then DEGRADED): local state, brain id only.
    const reads = called("map_source_observation", A);
    expect(reads.length).toBeGreaterThanOrEqual(1);
    expect(reads.every((call) => JSON.stringify(call.args) === JSON.stringify({ brainId: A }))).toBe(true);
    // The two badges stay separate.
    expect(screen.getByTestId("source-observation")).not.toBe(badge());
  });

  it("brings the F-032 badge back to SYNCED when the same source returns, with no reload", async () => {
    // The regression the real WebView2 run found: the root comes back, its verification
    // changes nothing (same revision), so no reload happens — and the observation, which
    // is SYNCED again in the backend, must still reach the screen.
    await boot();
    await emit(status({ state: "WATCHING", reason: null, sequence: 3 }));
    world.observation = UNAVAILABLE;
    await emit(
      status({ state: "DEGRADED", mode: "NONE", reason: "SOURCE_UNAVAILABLE", sequence: 4 }),
    );
    await waitFor(() =>
      expect(screen.getByTestId("source-observation").getAttribute("data-state")).toBe("UNAVAILABLE"),
    );
    const opens = called("map_open", A).length;

    // The root is back: a verification runs (the observation is still the old one)...
    await emit(status({ state: "VERIFYING", reason: "SOURCE_RETURNED", sequence: 5 }));
    // ...it finishes, records SYNCED at the same revision, and the watcher is stable again.
    world.observation = SYNCED(3);
    await emit(status({ state: "WATCHING", reason: null, sequence: 6 }));

    await waitFor(() =>
      expect(screen.getByTestId("source-observation").getAttribute("data-state")).toBe("SYNCED"),
    );
    expect(badge().getAttribute("data-state")).toBe("WATCHING");
    expect(called("map_open", A).length).toBe(opens); // same revision: nothing was reloaded
  });
});

describe("what must not change the screen", () => {
  it("ignores an event of an older generation", async () => {
    await boot();
    await emit(status({ state: "WATCHING", reason: null, sequence: 10 }));
    await waitFor(() => expect(badge().getAttribute("data-state")).toBe("WATCHING"));
    const opens = called("map_open", A).length;
    world.revision = 5;
    // Late: an earlier degraded state, and an earlier revision.
    await emit(status({ state: "DEGRADED", mode: "NONE", reason: "SOURCE_UNAVAILABLE", indexRevision: 5, sequence: 4 }));
    await emit(status({ state: "WATCHING", reason: null, indexRevision: 5, sequence: 10 }));
    expect(badge().getAttribute("data-state")).toBe("WATCHING");
    expect(called("map_open", A).length).toBe(opens);
  });

  it("refuses a payload that carries a path, and shows and reloads nothing from it", async () => {
    await boot();
    const opens = called("map_open", A).length;
    world.revision = 5;
    await emit({
      ...status({ state: "DEGRADED", mode: "NONE", reason: "SOURCE_UNAVAILABLE", indexRevision: 5, sequence: 20 }),
      relativePath: "confidentiel/dossier-secret/fichier.txt",
    });
    await emit({ ...status({ sequence: 21, indexRevision: 5 }), stableKey: "SYS1:abc:def" });
    expect(badge().getAttribute("data-state")).toBe("VERIFYING");
    expect(called("map_open", A).length).toBe(opens);
    expect(document.body.textContent).not.toContain("secret");
    expect(document.body.textContent).not.toContain("SYS1");
  });

  it("never renders a path or an operating-system message from any state it was given", async () => {
    await boot();
    for (const [sequence, state] of [
      [3, status({ state: "WATCHING", reason: null })],
      [4, status({ state: "PERIODIC", mode: "PERIODIC", reason: "NATIVE_UNSUPPORTED" })],
      [5, status({ state: "DEGRADED", mode: "NONE", reason: "SOURCE_CHANGED" })],
    ] as const) {
      await emit({ ...state, sequence });
    }
    await waitFor(() => expect(badge().getAttribute("data-state")).toBe("DEGRADED"));
    const text = badge().textContent ?? "";
    for (const forbidden of ["\\", "C:", ".txt", "SYS1", "Access", "os error"]) {
      expect(text.includes(forbidden), forbidden).toBe(false);
    }
  });
});
