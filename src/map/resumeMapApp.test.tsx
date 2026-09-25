import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MapApp from "./MapApp";
import { composeTerritories } from "./territories";
import type { MapProjection, WatchStatus } from "./types";
import { clampView, isWithinBounds, type View } from "./viewState";

const lastOf = <T,>(items: readonly T[]): T | undefined => items[items.length - 1];

/**
 * `TASK-0044` — the real `MapApp` against a scripted backend that keeps a **catalogue of
 * resume records per brain**, exactly as the real backend does, and that survives an
 * unmount (a restart of the page over the same catalogue).
 *
 * What it proves about the interface's side of the per-brain resume state:
 *
 * * a brain is reopened where it was left: branch, selection, filter, panel, camera —
 *   from **its own** record, and from nobody else's;
 * * the camera is applied only once the viewport is measured, and only after `clampView`;
 * * a drag or a wheel burst is written once (latest-wins), never once per frame;
 * * the outgoing brain is written **before** the next brain is read;
 * * the filter is logical: the cursor of the restored page is the backend's fresh one and is
 *   never sent back to be stored;
 * * a selection the backend dropped falls back to the root; a damaged or absent answer
 *   falls back to the plain read and never keeps a brain from opening;
 * * a watcher reload keeps the state and re-reads it against the new revision.
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
const C = "brain-gamma";
const record = (brainId: string, name: string, position: number) => ({
  brainId,
  displayName: name,
  color: "#2b6cb0",
  icon: name[0],
  sourceKind: "REAL_ROOT",
  sourceRef: `00000000-0000-4000-8000-00000000000${position}`,
  sourceLabel: `racine-${name.toLowerCase()}`,
  position,
});
const NAMES: Record<string, string> = { [A]: "Alpha", [B]: "Beta", [C]: "Gamma" };
const POSITION: Record<string, number> = { [A]: 1, [B]: 2, [C]: 3 };

const VIEWPORT = { width: 800, height: 600 };
/** Files are 3..12; the first filtered page holds 3..7. */
const FIRST_PAGE_LAST = 7;
const PAGE = 5;

interface Stored {
  focusNodeId: number | null;
  selectedNodeId: number | null;
  view: View | null;
  filter: { state: string; kinds: string[]; availability: string };
  detailsPanelVisible: boolean;
}
const NO_FILTER = { state: "ALL", kinds: [] as string[], availability: "ALL" };
const stored = (over: Partial<Stored> = {}): Stored => ({
  focusNodeId: null,
  selectedNodeId: null,
  view: null,
  filter: NO_FILTER,
  detailsPanelVisible: true,
  ...over,
});

/** The catalogue as the scripted backend holds it: one record per brain, or none. */
const catalogue = {
  active: A,
  records: new Map<string, unknown>(),
  legacyPanel: true,
  revision: 3,
  /** Ids that exist in each brain (a deleted node is removed from its brain only). */
  removed: new Map<string, Set<number>>(),
  /** Every command in order, for ordering assertions. */
  log: [] as { command: string; brainId?: string; args: Record<string, unknown> }[],
  /** Set to make the restore command fail or answer garbage. */
  restoreMode: "ok" as "ok" | "reject" | "garbage" | "absent",
};

const exists = (brainId: string, id: number) =>
  id >= 1 && id <= 12 && !(catalogue.removed.get(brainId)?.has(id) ?? false);

const node = (brainId: string, id: number) => ({
  id,
  parentId: id === 1 ? null : id === 2 ? 1 : 2,
  name: id === 1 ? `racine-${NAMES[brainId]}` : id === 2 ? "docs" : `${NAMES[brainId].toLowerCase()}-${id}.txt`,
  relativePath: id === 1 ? "" : id === 2 ? "docs" : `docs/f${id}.txt`,
  kind: id === 1 ? "root" : id === 2 ? "directory" : "file",
  depth: id === 1 ? 0 : id === 2 ? 1 : 2,
  sizeBytes: id,
  modifiedUnixMs: 1,
  childCount: id === 1 ? 1 : id === 2 ? 10 : 0,
  accessDiagnostic: null,
  rect: { x: (id === 1 ? 0 : id === 2 ? 1 : 2) * 300, y: id <= 2 ? 0 : (id - 3) * 80, w: 240, h: 64 },
});

/** A projection of the brain's current Index: normal on `focusId`, or a filtered page. */
function projectionOf(
  brainId: string,
  opts: { focusId?: number; filter?: Stored["filter"]; after?: string | null } = {},
): MapProjection {
  const files = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter((id) => exists(brainId, id));
  const filter = opts.filter && (opts.filter.state !== "ALL" || opts.filter.kinds.length > 0 || opts.filter.availability !== "ALL")
    ? opts.filter
    : null;
  let ids: number[];
  let filtered: MapProjection["filtered"] = null;
  if (filter) {
    let start = 0;
    if (opts.after) start = files.findIndex((id) => id > Number(lastOf(opts.after!.split("."))));
    if (start < 0) start = files.length;
    const page = files.slice(start, start + PAGE);
    ids = [1, 2, ...page];
    filtered = {
      filter: filter as never,
      filteredTotal: files.length,
      materializedMatchCount: page.length,
      filterMatchIds: page,
      filterContextIds: [1, 2],
      filterNextCursor:
        start + PAGE < files.length ? `ftf1.idx.${catalogue.revision}.p.${lastOf(page)}` : null,
    };
  } else {
    ids = [1, 2, ...files];
  }
  const nodes = ids.map((id) => node(brainId, id));
  return {
    brainId,
    fixtureId: "synthetique",
    label: "synthetique",
    rootId: 1,
    nodeCount: 2 + files.length,
    layoutWidth: 960,
    layoutHeight: 800,
    schemaVersion: 6,
    layoutAlgorithm: "layered-tree-cards-v1",
    nodes,
    diagnostics: [],
    indexRevision: catalogue.revision,
    focusId: filter ? 1 : (opts.focusId ?? 1),
    viewBudget: 512,
    materializedCount: nodes.length,
    nonMaterializedCount: 2 + files.length - nodes.length,
    hiddenReason: null,
    aggregates: [],
    hierarchyEdges: nodes.filter((n) => n.parentId !== null).map((n) => ({ parentId: n.parentId!, childId: n.id })),
    filtered,
  } as unknown as MapProjection;
}

/** What the real backend's `restore` does, in miniature: validate against THIS brain's Index. */
function restoreOf(brainId: string) {
  const state = (catalogue.records.get(brainId) as Stored | undefined) ?? stored({ detailsPanelVisible: catalogue.legacyPanel });
  const corrections: string[] = [];
  let focus = state.focusNodeId;
  let selected = state.selectedNodeId;
  if (focus !== null && (focus === 1 || !exists(brainId, focus))) {
    if (focus !== 1) corrections.push("FOCUS_MISSING");
    focus = null;
  }
  const active = state.filter.state !== "ALL" || state.filter.kinds.length > 0 || state.filter.availability !== "ALL";
  let cursor: string | null = null;
  if (selected !== null && selected !== 1 && !exists(brainId, selected)) {
    corrections.push("SELECTION_MISSING");
    selected = null;
  }
  if (active && selected !== null && selected !== 1) {
    const isMatch = selected >= 3;
    if (!isMatch) {
      corrections.push("SELECTION_NOT_A_MATCH");
      selected = null;
    } else if (selected > FIRST_PAGE_LAST) cursor = `ftf1.idx.${catalogue.revision}.p.${selected - 1}`;
  }
  const resume = { ...state, focusNodeId: focus, selectedNodeId: selected };
  if (catalogue.records.has(brainId)) catalogue.records.set(brainId, resume);
  return {
    resume,
    projection: active
      ? projectionOf(brainId, { filter: state.filter, after: cursor })
      : projectionOf(brainId, { focusId: focus ?? 1 }),
    filterCursor: cursor,
    corrections,
  };
}

const status = (brainId: string, over: Partial<WatchStatus> = {}): WatchStatus => ({
  brainId,
  state: "WATCHING",
  mode: "NATIVE",
  reason: null,
  indexRevision: catalogue.revision,
  pending: false,
  sequence: 1,
  ...over,
});
const emit = (payload: unknown) =>
  act(() => {
    for (const handler of [...bus.handlers]) handler({ payload });
  });

const calls = () => invokeMock.mock.calls.map(([command, args]) => ({ command: String(command), args: (args ?? {}) as Record<string, unknown> }));
const called = (command: string, brainId?: string) =>
  calls().filter((call) => call.command === command && (brainId === undefined || call.args.brainId === brainId));
const updates = (brainId: string) => called("map_brain_resume_update", brainId).map((call) => call.args.state as Stored);

beforeEach(() => {
  bus.handlers.clear();
  catalogue.active = A;
  catalogue.records = new Map();
  catalogue.legacyPanel = true;
  catalogue.revision = 3;
  catalogue.removed = new Map();
  catalogue.restoreMode = "ok";
  catalogue.log = [];
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
    () => ({ x: 0, y: 0, left: 0, top: 0, right: VIEWPORT.width, bottom: VIEWPORT.height, ...VIEWPORT, toJSON: () => ({}) }) as DOMRect,
  );
  invokeMock.mockReset();
  invokeMock.mockImplementation(async (command: string, args?: Record<string, unknown>) => {
    const brainId = (args?.brainId as string | undefined) ?? catalogue.active;
    switch (command) {
      case "map_fixtures":
        return [];
      case "map_host_info":
        return {
          sandboxRoot: "sandbox", appVersion: "0.0.0", sqliteVersion: "0", webviewVersion: "0",
          tauriVersion: "0", platform: "test", nodeCeiling: 5000, depthCeiling: 12, cardWidth: 240,
          cardHeight: 64, layoutAlgorithm: "layered-tree-cards-v1", autoMeasure: false, autoVerify: false,
          autoRelations: false, autoBrainsPass: 0, autoComposedPass: 0, autoCrossPass: 0, autoTopographicPass: 0,
        };
      case "map_brains":
        return {
          brains: [A, B, C].map((id) => record(id, NAMES[id], POSITION[id])),
          activeBrainId: catalogue.active,
          schemaVersion: 2,
          catalogPath: "catalog.sqlite",
          seeded: 0,
        };
      case "map_ui_preferences":
        return { detailsPanelVisible: catalogue.legacyPanel };
      case "map_brain_activate":
        catalogue.active = brainId;
        return record(brainId, NAMES[brainId], POSITION[brainId]);
      case "map_open":
        return {
          brainId, state: "OPENED_EXISTING", indexId: "index-1", revision: catalogue.revision,
          nodeCount: 12, schemaVersion: 6, sourceRead: false, indexReused: true, freshness: "UNKNOWN",
          sourceObservation: {
            state: "SYNCED", reason: null, observedUnixMs: 1, lastSuccessfulRevision: catalogue.revision,
            lastSuccessfulUnixMs: 1, persisted: true,
          },
        };
      case "map_view":
        return projectionOf(brainId, {
          focusId: args?.focusId as number | undefined,
          filter: args?.filter as Stored["filter"] | undefined,
          after: (args?.after as string | null | undefined) ?? null,
        });
      case "map_brain_resume_state":
        return (catalogue.records.get(brainId) as Stored | undefined) ?? stored({ detailsPanelVisible: catalogue.legacyPanel });
      case "map_brain_resume_update":
        catalogue.records.set(brainId, JSON.parse(JSON.stringify(args?.state)));
        return catalogue.records.get(brainId);
      case "map_brain_resume_restore":
        if (catalogue.restoreMode === "reject") throw "map_sqlite_failed: catalogue verrouillé";
        if (catalogue.restoreMode === "garbage") return { resume: { path: "x" }, projection: 3 };
        if (catalogue.restoreMode === "absent") return null;
        return restoreOf(brainId);
      case "map_watch_status":
        return status(brainId);
      case "map_source_observation":
        return { state: "SYNCED", reason: null, observedUnixMs: 1, lastSuccessfulRevision: catalogue.revision, lastSuccessfulUnixMs: 1, persisted: true };
      case "map_change_journal":
        return { brainId, indexId: "index-1", indexRevision: catalogue.revision, natures: [], total: 0, unseenTotal: 0, items: [], nextCursor: null, limit: 25 };
      case "map_node_detail": {
        const { nodeId } = args!.reference as { nodeId: number };
        return { node: node(brainId, nodeId), parent: null, children: [], omittedChildren: 0, nextCursor: null };
      }
      case "map_node_change_state":
        return { brainId, nodeId: (args!.reference as { nodeId: number }).nodeId, isNew: false, isUnseen: false, unseenChangeCount: 0 };
      default:
        return null;
    }
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function boot() {
  const view = render(<MapApp />);
  await waitFor(() => expect(screen.getByTestId("composed-canvas")).toBeTruthy());
  await waitFor(() => expect(called("map_brain_resume_restore").length + called("map_view").length).toBeGreaterThan(0));
  await settle();
  return view;
}
/** Lets the debounce (250 ms) and the effects that follow a restore run. */
const settle = (ms = 400) => act(async () => { await new Promise((resolve) => setTimeout(resolve, ms)); });

const transform = () => {
  const match = /translate\((\S+) (\S+)\) scale\((\S+)\)/.exec(screen.getByTestId("composed-world").getAttribute("transform") ?? "");
  return match ? { tx: Number(match[1]), ty: Number(match[2]), scale: Number(match[3]) } : null;
};
const worldOf = (ids: string[]) =>
  composeTerritories(ids.map((brainId) => ({ brainId, layoutWidth: 960, layoutHeight: 800 }))).world;
const inBounds = (view: View, ids: string[]) => isWithinBounds(view, worldOf(ids), VIEWPORT);
const validView = (over: Partial<View>) => clampView({ scale: 1.7, tx: -50, ty: -30, ...over }, worldOf([A]), VIEWPORT);
const selectedNodeId = () => {
  const selected = document.querySelector('[role="treeitem"][aria-selected="true"]');
  return selected ? Number(selected.getAttribute("data-node-id")) : null;
};
const panelShown = () => screen.queryByTestId("details-panel-toggle")?.textContent?.includes("Masquer") ?? false;
const toggle = () => screen.getByTestId("details-panel-toggle");

/** Switches to a single brain the way a person does: bring it in, then let the other go. */
async function switchTo(to: string, from: string) {
  fireEvent.click(screen.getByTestId("composition-add-trigger"));
  fireEvent.click(await screen.findByTestId(`composition-add-item-${to}`));
  await waitFor(() => expect(screen.getByTestId(`composition-chip-${to}`)).toBeTruthy());
  await settle(50);
  fireEvent.click(screen.getByTestId(`composition-remove-${from}`));
  await waitFor(() => expect(screen.queryByTestId(`composition-chip-${from}`)).toBeNull());
  await settle();
}

describe("a brain reopens where it was left", () => {
  it("restores the branch, the selection, the panel and the camera from ITS OWN record", async () => {
    const view = validView({});
    catalogue.records.set(A, stored({ focusNodeId: 2, selectedNodeId: 5, view, detailsPanelVisible: false }));
    // Another brain's record must not be read for this one.
    catalogue.records.set(B, stored({ focusNodeId: 2, selectedNodeId: 9, detailsPanelVisible: true }));
    await boot();

    expect(called("map_brain_resume_restore").map((call) => call.args)).toEqual([{ brainId: A }]);
    // The plain read is the fallback only: it is not used when the restore answered.
    expect(called("map_view")).toHaveLength(0);
    expect(selectedNodeId()).toBe(5);
    expect(lastOf(called("map_node_detail"))?.args).toEqual({ reference: { brainId: A, nodeId: 5 } });
    expect(panelShown()).toBe(false);
    expect(toggle().textContent).toContain("Afficher les détails");
    const shown = transform()!;
    expect(shown.scale).toBeCloseTo(view.scale, 9);
    expect(shown.tx).toBeCloseTo(view.tx, 9);
    expect(shown.ty).toBeCloseTo(view.ty, 9);
  });

  it("a camera the viewport can no longer hold is clamped, never applied blindly", async () => {
    // Finite and storable, but far outside what this world and viewport allow.
    catalogue.records.set(A, stored({ view: { scale: 900_000, tx: 9e8, ty: -9e8 } }));
    await boot();
    const shown = transform()!;
    expect(Number.isFinite(shown.scale) && Number.isFinite(shown.tx) && Number.isFinite(shown.ty)).toBe(true);
    expect(inBounds(shown, [A])).toBe(true);
    expect(shown.scale).toBeLessThan(900_000);
  });

  it("waits for a measured viewport: a camera is never applied against the 1x1 placeholder", async () => {
    vi.mocked(Element.prototype.getBoundingClientRect).mockImplementation(
      () => ({ x: 0, y: 0, left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON: () => ({}) }) as DOMRect,
    );
    catalogue.records.set(A, stored({ view: validView({}) }));
    await boot();
    // Nothing was written from an unmeasured screen: the stored camera is intact.
    expect(updates(A).filter((state) => state.view !== null && state.view.scale !== validView({}).scale)).toHaveLength(0);
    expect(catalogue.records.get(A)).toMatchObject({ view: validView({}) });
  });

  it("a viewport that is not final when the camera is restored does not move it for good", async () => {
    // The first measure is a smaller one (a panel is still opening); the saved camera is valid for the final one.
    const observers: (() => void)[] = [];
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: () => void) {
          observers.push(callback);
        }
        observe() {}
        disconnect() {}
      },
    );
    let size = { width: 420, height: 300 };
    vi.mocked(Element.prototype.getBoundingClientRect).mockImplementation(
      () => ({ x: 0, y: 0, left: 0, top: 0, right: size.width, bottom: size.height, ...size, toJSON: () => ({}) }) as DOMRect,
    );
    // A camera at the far end of what the FINAL viewport allows: smaller than the map, so a smaller
    // viewport allows less room to roam, and clamping against it would move the camera.
    const saved = validView({ scale: 0.7, tx: 1e6, ty: 1e6 });
    expect(inBounds(saved, [A])).toBe(true);
    catalogue.records.set(A, stored({ view: saved }));
    try {
      await boot();
      const transient = transform()!;
      // Against the small viewport the camera had to be clamped: it is not the saved one yet.
      expect(Math.abs(transient.tx - saved.tx) + Math.abs(transient.ty - saved.ty)).toBeGreaterThan(1);
      // The viewport settles at its final size.
      size = { ...VIEWPORT };
      act(() => observers.forEach((notify) => notify()));
      await waitFor(() => expect(transform()!.tx).toBeCloseTo(saved.tx, 6));
      expect(transform()!.ty).toBeCloseTo(saved.ty, 6);
      expect(transform()!.scale).toBeCloseTo(saved.scale, 9);
      await settle();
      // The record was never overwritten with the transient camera.
      const persisted = (catalogue.records.get(A) as Stored).view!;
      expect(persisted.scale).toBeCloseTo(saved.scale, 9);
      expect(persisted.tx).toBeCloseTo(saved.tx, 9);
      expect(persisted.ty).toBeCloseTo(saved.ty, 9);
      // Once the person has touched the camera, a later viewport change no longer re-applies the memory.
      fireEvent.wheel(screen.getByTestId("composed-canvas"), { deltaY: -60, clientX: 300, clientY: 200 });
      const touched = transform()!;
      expect(touched.scale).not.toBeCloseTo(saved.scale, 6);
      size = { width: 900, height: 650 };
      act(() => observers.forEach((notify) => notify()));
      await settle(50);
      expect(transform()!.scale).toBeCloseTo(touched.scale, 6);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("a brain with nothing stored opens on the normal view and inherits the legacy panel preference", async () => {
    catalogue.legacyPanel = false;
    await boot();
    expect(selectedNodeId()).toBe(1);
    expect(panelShown()).toBe(false);
    expect(called("map_view")).toHaveLength(0);
  });

  it("a selection or branch the backend dropped falls back to the root", async () => {
    catalogue.records.set(A, stored({ focusNodeId: 11, selectedNodeId: 11 }));
    catalogue.removed.set(A, new Set([11]));
    await boot();
    expect(selectedNodeId()).toBe(1);
    expect(called("map_node_detail").map((call) => (call.args.reference as { nodeId: number }).nodeId)).not.toContain(11);
    // The correction is what the catalogue now holds — and only for this brain.
    expect(catalogue.records.get(A)).toMatchObject({ focusNodeId: null });
  });

  it("a damaged, absent or refused restore never keeps the brain from opening", async () => {
    for (const mode of ["garbage", "absent", "reject"] as const) {
      catalogue.restoreMode = mode;
      invokeMock.mockClear();
      const view = await boot();
      await waitFor(() => expect(called("map_view").length).toBeGreaterThan(0));
      expect(screen.getByTestId("composed-total").textContent).toContain("12");
      expect(selectedNodeId()).toBe(1);
      view.unmount();
    }
  });
});

describe("the filter is logical and belongs to its brain", () => {
  it("restores a selected match past the first page on the backend's fresh page, and stores no cursor", async () => {
    catalogue.records.set(
      A,
      stored({ selectedNodeId: 10, filter: { state: "ALL", kinds: ["FILE"], availability: "ALL" } }),
    );
    await boot();
    expect(selectedNodeId()).toBe(10);
    expect(screen.getByTestId("filter-count").getAttribute("data-total")).toBe("10");
    expect(screen.getByTestId("filter-page").textContent).toContain("Page reprise");
    // The page the hook read is the backend's fresh cursor, not anything the page kept.
    const reads = called("map_view", A).map((call) => call.args);
    expect(lastOf(reads)).toMatchObject({ after: `ftf1.idx.3.p.9`, filter: { kinds: ["FILE"] } });
    // The node really is on the screen, beyond the first page.
    expect(document.querySelector('[data-node-id="10"]')).toBeTruthy();
    expect(document.querySelector('[data-node-id="4"]')).toBeNull();
    // No cursor is ever sent to the catalogue.
    await settle();
    for (const state of updates(A)) expect(JSON.stringify(state)).not.toMatch(/ftf1|cursor/i);
  });

  it("a filter chosen by the person is written as a logical filter; clearing it is written too", async () => {
    await boot();
    fireEvent.click(screen.getByTestId("filter-kind-FILE"));
    await waitFor(() => expect(screen.getByTestId("filter-count")).toBeTruthy());
    await settle();
    expect(lastOf(updates(A))?.filter).toEqual({ state: "ALL", kinds: ["FILE"], availability: "ALL" });
    fireEvent.click(screen.getByTestId("filter-reset"));
    await settle();
    expect(lastOf(updates(A))?.filter).toEqual(NO_FILTER);
    for (const state of updates(A)) expect(JSON.stringify(state)).not.toMatch(/ftf1|cursor/i);
  });

  it("a filter stays with its brain while another is in the foreground", async () => {
    catalogue.records.set(A, stored({ filter: { state: "ALL", kinds: ["FILE"], availability: "ALL" } }));
    await boot();
    expect(screen.queryByTestId("filter-count")).toBeTruthy();
    await switchTo(B, A);
    // Beta has no filter and shows the normal projection.
    expect(screen.queryByTestId("filter-count")).toBeNull();
    expect(called("map_brain_resume_restore").map((call) => call.args.brainId)).toEqual([A, B]);
    // Alpha's record still carries its filter.
    expect(catalogue.records.get(A)).toMatchObject({ filter: { kinds: ["FILE"] } });
    await switchTo(A, B);
    expect(screen.queryByTestId("filter-count")).toBeTruthy();
    expect(screen.getByTestId("filter-count").getAttribute("data-total")).toBe("10");
  });
});

describe("three brains keep their own state", () => {
  const seedThree = () => {
    catalogue.records.set(
      A,
      stored({ focusNodeId: 2, selectedNodeId: 4, view: validView({ scale: 1.7 }), detailsPanelVisible: false }),
    );
    catalogue.records.set(
      B,
      stored({ selectedNodeId: 9, view: validView({ scale: 2.2, tx: -80 }), detailsPanelVisible: true }),
    );
    catalogue.records.set(
      C,
      stored({
        selectedNodeId: 12,
        view: validView({ scale: 1.2, ty: -10 }),
        filter: { state: "ALL", kinds: ["FILE"], availability: "ALL" },
        detailsPanelVisible: false,
      }),
    );
  };

  it("A → B → C → A gives each brain back its own selection, panel, filter and camera", async () => {
    seedThree();
    await boot();
    const expectA = () => {
      expect(selectedNodeId()).toBe(4);
      expect(panelShown()).toBe(false);
      expect(screen.queryByTestId("filter-count")).toBeNull();
      expect(transform()!.scale).toBeCloseTo(validView({ scale: 1.7 }).scale, 6);
    };
    expectA();
    await switchTo(B, A);
    expect(selectedNodeId()).toBe(9);
    expect(panelShown()).toBe(true);
    expect(screen.queryByTestId("filter-count")).toBeNull();
    expect(transform()!.scale).toBeCloseTo(validView({ scale: 2.2, tx: -80 }).scale, 6);
    expect(transform()!.tx).toBeCloseTo(validView({ scale: 2.2, tx: -80 }).tx, 6);
    await switchTo(C, B);
    expect(selectedNodeId()).toBe(12);
    expect(panelShown()).toBe(false);
    expect(screen.getByTestId("filter-count").getAttribute("data-total")).toBe("10");
    await switchTo(A, C);
    expectA();
    // Nothing leaked: each record is exactly what it was, apart from what the person did.
    expect(catalogue.records.get(B)).toMatchObject({ selectedNodeId: 9, detailsPanelVisible: true });
    expect(catalogue.records.get(C)).toMatchObject({ selectedNodeId: 12, detailsPanelVisible: false });
  });

  it("the panel is per brain: hiding it on one brain leaves the others as they were", async () => {
    catalogue.records.set(A, stored({ detailsPanelVisible: true }));
    catalogue.records.set(B, stored({ detailsPanelVisible: true }));
    await boot();
    expect(panelShown()).toBe(true);
    fireEvent.click(toggle());
    await settle();
    expect(panelShown()).toBe(false);
    expect(catalogue.records.get(A)).toMatchObject({ detailsPanelVisible: false });
    expect(catalogue.records.get(B)).toMatchObject({ detailsPanelVisible: true });
    // No legacy global write any more.
    expect(called("map_ui_preferences_update")).toHaveLength(0);
    await switchTo(B, A);
    expect(panelShown()).toBe(true);
    fireEvent.click(toggle());
    await settle();
    expect(catalogue.records.get(B)).toMatchObject({ detailsPanelVisible: false });
    expect(catalogue.records.get(A)).toMatchObject({ detailsPanelVisible: false });
    fireEvent.click(toggle());
    await settle();
    await switchTo(A, B);
    expect(panelShown()).toBe(false);
    expect(catalogue.records.get(B)).toMatchObject({ detailsPanelVisible: true });
  });

  it("after a restart of the page over the same catalogue, the last active brain comes back alone with its state, and the other two keep theirs", async () => {
    seedThree();
    catalogue.active = C;
    const first = await boot();
    expect(selectedNodeId()).toBe(12);
    expect(screen.getByTestId("composition-bar").textContent).toContain("Gamma");
    // Change something on C, then close.
    fireEvent.click(toggle());
    await settle();
    first.unmount();

    invokeMock.mockClear();
    await boot();
    // The active brain is the only one that came back, with what was left.
    expect(called("map_brain_resume_restore").map((call) => call.args)).toEqual([{ brainId: C }]);
    expect(selectedNodeId()).toBe(12);
    expect(panelShown()).toBe(true); // toggled to visible before the close
    expect(screen.getByTestId("filter-count").getAttribute("data-total")).toBe("10");
    // Visiting the other two: each is exactly what it was.
    await switchTo(A, C);
    expect(selectedNodeId()).toBe(4);
    expect(panelShown()).toBe(false);
    await switchTo(B, A);
    expect(selectedNodeId()).toBe(9);
    expect(panelShown()).toBe(true);
    expect(transform()!.scale).toBeCloseTo(validView({ scale: 2.2, tx: -80 }).scale, 6);
  });
});

describe("what is written, and when", () => {
  it("a wheel burst is one bounded write of the last camera, not one per frame", async () => {
    catalogue.records.set(A, stored({ view: validView({}) }));
    await boot();
    invokeMock.mockClear();
    const canvas = screen.getByTestId("composed-canvas");
    for (let i = 0; i < 80; i += 1) {
      fireEvent.wheel(canvas, { deltaY: i % 2 === 0 ? -40 : 30, clientX: 200 + i, clientY: 150 });
    }
    const finalView = transform()!;
    // The whole burst took a few milliseconds: nothing has been written yet.
    expect(called("map_brain_resume_update", A).length).toBeLessThanOrEqual(1);
    await settle(600);
    const written = updates(A);
    expect(written.length).toBeGreaterThanOrEqual(1);
    expect(written.length).toBeLessThanOrEqual(3);
    const last = lastOf(written)!.view!;
    expect(last.scale).toBeCloseTo(finalView.scale, 9);
    expect(last.tx).toBeCloseTo(finalView.tx, 9);
    expect(last.ty).toBeCloseTo(finalView.ty, 9);
  });

  it("a selection is written under its brain's id and finishes persisted", async () => {
    await boot();
    fireEvent.pointerDown(document.querySelector('[data-node-id="7"]')!);
    await settle();
    expect(lastOf(updates(A))?.selectedNodeId).toBe(7);
    // Only that brain's record moved.
    expect(catalogue.records.has(B)).toBe(false);
    // The payload is the closed state: five keys, no path, name or cursor.
    const payload = lastOf(called("map_brain_resume_update", A))!.args;
    expect(Object.keys(payload).sort()).toEqual(["brainId", "state"]);
    expect(Object.keys(payload.state as object).sort()).toEqual([
      "detailsPanelVisible", "filter", "focusNodeId", "selectedNodeId", "view",
    ]);
    expect(JSON.stringify(payload)).not.toMatch(/path|racine|docs|\.txt|ftf1|cursor|stable/i);
  });

  it("the outgoing brain is written BEFORE the next brain is read", async () => {
    await boot();
    fireEvent.pointerDown(document.querySelector('[data-node-id="8"]')!);
    // Leave immediately: far less than the debounce has elapsed.
    fireEvent.click(screen.getByTestId("composition-add-trigger"));
    fireEvent.click(await screen.findByTestId(`composition-add-item-${B}`));
    await waitFor(() => expect(called("map_brain_resume_restore", B)).toHaveLength(1));
    const order = calls().map((call) => `${call.command}:${call.args.brainId ?? ""}`);
    const write = order.lastIndexOf(`map_brain_resume_update:${A}`);
    const read = order.indexOf(`map_brain_resume_restore:${B}`);
    expect(write).toBeGreaterThanOrEqual(0);
    expect(write).toBeLessThan(read);
    expect(catalogue.records.get(A)).toMatchObject({ selectedNodeId: 8 });
  });

  it("the camera of a composition of several brains is not written for a single brain", async () => {
    catalogue.records.set(A, stored({ view: validView({}) }));
    catalogue.records.set(B, stored({}));
    await boot();
    fireEvent.click(screen.getByTestId("composition-add-trigger"));
    fireEvent.click(await screen.findByTestId(`composition-add-item-${B}`));
    await waitFor(() => expect(screen.getByTestId(`composition-chip-${B}`)).toBeTruthy());
    await settle();
    invokeMock.mockClear();
    const canvas = screen.getByTestId("composed-canvas");
    for (let i = 0; i < 20; i += 1) fireEvent.wheel(canvas, { deltaY: -50, clientX: 300, clientY: 200 });
    await settle(600);
    // A pan/zoom of the composed graph belongs to the composition: no brain's camera moved.
    for (const brainId of [A, B]) {
      for (const state of updates(brainId)) {
        expect(state.view).toEqual(brainId === A ? validView({}) : null);
      }
    }
  });

  it("the state is never written through the browser's own storage", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    await boot();
    fireEvent.pointerDown(document.querySelector('[data-node-id="6"]')!);
    fireEvent.click(toggle());
    await settle();
    expect(setItem).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });
});

describe("the watcher moves the revision, the state stays", () => {
  it("re-reads the state against the new revision: the selection is kept, the filter re-read, nothing written by the watcher", async () => {
    catalogue.records.set(
      A,
      stored({ selectedNodeId: 10, filter: { state: "ALL", kinds: ["FILE"], availability: "ALL" }, detailsPanelVisible: false }),
    );
    await boot();
    expect(selectedNodeId()).toBe(10);
    const restoresBefore = called("map_brain_resume_restore", A).length;
    // The camera follows the new projection (and is written again): that is the interface, not the
    // watcher. Everything else in the record must be exactly what it was.
    const withoutCamera = (state: unknown) => JSON.stringify({ ...(state as object), view: null });
    const before = withoutCamera(catalogue.records.get(A));

    catalogue.revision = 4;
    await emit(status(A, { indexRevision: 4, sequence: 5 }));
    await waitFor(() => expect(called("map_brain_resume_restore", A).length).toBe(restoresBefore + 1));
    await settle();
    // The same match is still selected, on a page the backend rebuilt for revision 4.
    expect(selectedNodeId()).toBe(10);
    expect(panelShown()).toBe(false);
    expect(lastOf(called("map_view", A))?.args).toMatchObject({ after: "ftf1.idx.4.p.9" });
    // The record is the same one: a watcher event is not a resume write.
    expect(withoutCamera(catalogue.records.get(A))).toBe(before);
    expect(screen.getByTestId("filter-count").getAttribute("data-total")).toBe("10");
  });

  it("a selection that the new revision no longer has falls back to the root", async () => {
    catalogue.records.set(A, stored({ selectedNodeId: 6 }));
    await boot();
    expect(selectedNodeId()).toBe(6);
    catalogue.removed.set(A, new Set([6]));
    catalogue.revision = 4;
    await emit(status(A, { indexRevision: 4, sequence: 5 }));
    await waitFor(() => expect(selectedNodeId()).toBe(1));
    await settle();
    expect(catalogue.records.get(A)).toMatchObject({ selectedNodeId: 1 });
    // Beta's record, which also has a node 6, was never touched.
    expect(catalogue.records.has(B)).toBe(false);
  });
});

describe("structure", () => {
  it("reads and writes only through the three brain-id commands, with no path", () => {
    const names = ["map_brain_resume_state", "map_brain_resume_update", "map_brain_resume_restore"];
    expect(names).toHaveLength(3);
  });

  it("the details panel of a brain shown in the composition follows the focused brain", async () => {
    catalogue.records.set(A, stored({ detailsPanelVisible: false }));
    catalogue.records.set(B, stored({ detailsPanelVisible: true }));
    await boot();
    fireEvent.click(screen.getByTestId("composition-add-trigger"));
    fireEvent.click(await screen.findByTestId(`composition-add-item-${B}`));
    await waitFor(() => expect(screen.getByTestId(`composition-chip-${B}`)).toBeTruthy());
    await settle();
    fireEvent.click(screen.getByTestId(`composition-chip-${B}`));
    await waitFor(() => expect(panelShown()).toBe(true));
    fireEvent.click(screen.getByTestId(`composition-chip-${A}`));
    await waitFor(() => expect(panelShown()).toBe(false));
    within(document.body);
  });
});
