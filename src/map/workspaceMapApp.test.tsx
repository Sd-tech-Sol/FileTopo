import { withHostLanguages } from "../test/hostLanguage";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MapApp from "./MapApp";
import { openGroup } from "../test/disclosure";
import { composeTerritories } from "./territories";
import type { MapProjection } from "./types";
import { clampView, type View } from "./viewState";
import type { WorkspaceCorrection, WorkspaceState } from "./workspaceState";

/**
 * `TASK-0053` / `DEC-0051` — the real `MapApp` against a scripted backend that keeps ONE
 * global workspace record (as the real catalogue does) next to per-brain resume records.
 *
 * What it proves about the interface's side of F-052:
 *
 * * the composition, the focus, the legend, the density, the motion preference and a focused
 *   branch come from the stored workspace — and nothing is written while that is happening;
 * * an explicit change is written at once, and for one brain alone the camera and the selection
 *   are NOT copied into the workspace (the resume state owns them);
 * * the corrections the backend names are shown, never swallowed, and can be dismissed;
 * * a workspace that cannot be read opens the application as it always opened — on the active
 *   brain alone — and the page then never writes a guessed value over what the catalogue keeps;
 * * « Quitter le focus » after a restart puts back the composition, camera and selection of
 *   before the focus.
 */
const invokeMock = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...args: unknown[]) => invokeMock(...args) }));
vi.mock("@tauri-apps/api/event", () => ({ listen: async () => () => {} }));

const A = "brain-alpha";
const B = "brain-beta";
const C = "brain-gamma";
const NAMES: Record<string, string> = { [A]: "Alpha", [B]: "Beta", [C]: "Gamma" };
const POSITION: Record<string, number> = { [A]: 1, [B]: 2, [C]: 3 };
const record = (brainId: string) => ({
  brainId,
  displayName: NAMES[brainId],
  color: "#2b6cb0",
  icon: NAMES[brainId][0],
  sourceKind: "REAL_ROOT",
  sourceRef: `00000000-0000-4000-8000-00000000000${POSITION[brainId]}`,
  sourceLabel: `racine-${NAMES[brainId].toLowerCase()}`,
  position: POSITION[brainId],
});
const VIEWPORT = { width: 800, height: 600 };
/** A camera the viewport really allows for these brains: the page clamps anything else, by design. */
const reachable = (ids: string[], over: Partial<View> = {}): View =>
  clampView(
    { scale: 1.3, tx: -60, ty: -25, ...over },
    composeTerritories(ids.map((brainId) => ({ brainId, layoutWidth: 960, layoutHeight: 800 }))).world,
    VIEWPORT,
  );

const store = {
  active: A,
  workspace: null as WorkspaceState | null,
  corrections: [] as WorkspaceCorrection[],
  mode: "ok" as "ok" | "reject" | "garbage",
  updates: [] as WorkspaceState[],
};

const node = (brainId: string, id: number) => ({
  id,
  parentId: id === 1 ? null : id === 2 ? 1 : 2,
  name: id === 1 ? `racine-${NAMES[brainId]}` : id === 2 ? "docs" : `${NAMES[brainId].toLowerCase()}-${id}.txt`,
  relativePath: id === 1 ? "" : id === 2 ? "docs" : `docs/f${id}.txt`,
  kind: id === 1 ? "root" : id === 2 ? "directory" : "file",
  depth: id === 1 ? 0 : id === 2 ? 1 : 2,
  sizeBytes: id,
  modifiedUnixMs: 1,
  childCount: id === 1 ? 1 : id === 2 ? 4 : 0,
  accessDiagnostic: null,
  rect: { x: (id === 1 ? 0 : id === 2 ? 1 : 2) * 300, y: id <= 2 ? 0 : (id - 3) * 80, w: 240, h: 64 },
});

function projectionOf(brainId: string, over: Record<string, unknown> = {}, ids = [1, 2, 3, 4, 5, 6]): MapProjection {
  const nodes = ids.map((id) => node(brainId, id));
  return {
    brainId,
    fixtureId: "synthetique",
    label: "synthetique",
    rootId: 1,
    nodeCount: 6,
    layoutWidth: 960,
    layoutHeight: 800,
    schemaVersion: 6,
    layoutAlgorithm: "layered-tree-cards-v1",
    nodes,
    diagnostics: [],
    indexRevision: 3,
    focusId: 1,
    viewBudget: 512,
    materializedCount: nodes.length,
    nonMaterializedCount: 0,
    hiddenReason: null,
    aggregates: [],
    hierarchyEdges: nodes.filter((n) => n.parentId !== null).map((n) => ({ parentId: n.parentId!, childId: n.id })),
    filtered: null,
    ...over,
  } as unknown as MapProjection;
}

const lastOf = <T,>(items: readonly T[]): T | undefined => items[items.length - 1];
const calls = () => invokeMock.mock.calls.map(([command, args]) => ({ command: String(command), args: (args ?? {}) as Record<string, any> }));
const called = (command: string) => calls().filter((call) => call.command === command);

withHostLanguages(["fr-CA"]);

const workspace = (over: Partial<WorkspaceState> = {}): WorkspaceState => ({
  displayedBrainIds: [A],
  focusedBrainId: A,
  view: null,
  selected: null,
  legendOpen: false,
  density: "comfortable",
  motion: "system",
  branchFocus: null,
  ...over,
});

beforeEach(() => {
  store.active = A;
  store.workspace = null;
  store.corrections = [];
  store.mode = "ok";
  store.updates = [];
  localStorage.clear();
  delete document.documentElement.dataset.density;
  delete document.documentElement.dataset.motion;
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
    () => ({ x: 0, y: 0, left: 0, top: 0, right: VIEWPORT.width, bottom: VIEWPORT.height, ...VIEWPORT, toJSON: () => ({}) }) as DOMRect,
  );
  invokeMock.mockReset();
  invokeMock.mockImplementation(async (command: string, args?: Record<string, any>) => {
    const brainId = (args?.brainId as string | undefined) ?? store.active;
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
          brains: [A, B, C].map(record),
          activeBrainId: store.active,
          schemaVersion: 2,
          catalogPath: "catalog.sqlite",
          seeded: 0,
        };
      case "map_ui_preferences":
        return { detailsPanelVisible: true };
      case "map_brain_activate":
        store.active = brainId;
        return record(brainId);
      case "map_open":
        return {
          brainId, state: "OPENED_EXISTING", indexId: "index-1", revision: 3, nodeCount: 6, schemaVersion: 6,
          sourceRead: false, indexReused: true, freshness: "UNKNOWN",
          sourceObservation: { state: "SYNCED", reason: null, observedUnixMs: 1, lastSuccessfulRevision: 3, lastSuccessfulUnixMs: 1, persisted: true },
        };
      case "map_view":
        return projectionOf(brainId);
      case "map_brain_resume_state":
        return { focusNodeId: null, selectedNodeId: null, view: null, filter: { state: "ALL", kinds: [], availability: "ALL" }, detailsPanelVisible: true };
      case "map_brain_resume_update":
        return args?.state;
      case "map_brain_resume_restore":
        return {
          resume: { focusNodeId: null, selectedNodeId: null, view: null, filter: { state: "ALL", kinds: [], availability: "ALL" }, detailsPanelVisible: true },
          projection: projectionOf(brainId),
          filterCursor: null,
          corrections: [],
        };
      case "map_workspace_restore":
        if (store.mode === "reject") throw "map_sqlite_failed: catalogue verrouillé";
        if (store.mode === "garbage") return { workspace: { path: "x" }, corrections: [] };
        return { workspace: store.workspace ?? workspace({ displayedBrainIds: [store.active], focusedBrainId: store.active }), corrections: store.corrections };
      case "map_workspace_update":
        store.updates.push(JSON.parse(JSON.stringify(args?.state)));
        store.workspace = JSON.parse(JSON.stringify(args?.state));
        return store.workspace;
      case "map_branch_view": {
        const collapsed = (args?.collapsedIds as number[]).map((nodeId) => ({ nodeId, hiddenDescendantCount: 4 }));
        const kept = [2, 3, 4, 5, 6].filter((id) => !(collapsed.length > 0 && id > 2));
        return projectionOf(brainId, { focusId: 2, branch: { rootNodeId: args?.rootId, collapsed }, materializedCount: kept.length }, kept);
      }
      case "map_watch_status":
        return { brainId, state: "WATCHING", mode: "NATIVE", reason: null, indexRevision: 3, pending: false, sequence: 1 };
      case "map_source_observation":
        return { state: "SYNCED", reason: null, observedUnixMs: 1, lastSuccessfulRevision: 3, lastSuccessfulUnixMs: 1, persisted: true };
      case "map_change_journal":
        return { brainId, indexId: "index-1", indexRevision: 3, natures: [], total: 0, unseenTotal: 0, items: [], nextCursor: null, limit: 25 };
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

const settle = (ms = 400) => act(async () => { await new Promise((resolve) => setTimeout(resolve, ms)); });
async function boot() {
  render(<MapApp />);
  await waitFor(() => expect(screen.getByTestId("composed-canvas")).toBeTruthy());
  await waitFor(() => expect(called("map_workspace_restore").length).toBeGreaterThan(0));
  await settle(600);
}
const chips = () => [...document.querySelectorAll('[data-testid^="composition-chip-"]')].map((el) => el.getAttribute("data-brain-id"));
const focusedChip = () => document.querySelector('[data-testid^="composition-chip-"][aria-current="true"]')?.getAttribute("data-brain-id");
const selectedRef = () => {
  const selected = document.querySelector('[role="treeitem"][aria-selected="true"]');
  return selected ? { brainId: selected.getAttribute("data-brain-id"), nodeId: Number(selected.getAttribute("data-node-id")) } : null;
};
const transform = () => {
  const match = /translate\((\S+) (\S+)\) scale\((\S+)\)/.exec(screen.getByTestId("composed-world").getAttribute("transform") ?? "");
  // `+ 0` folds -0 into 0: the camera is compared as numbers, not as signed zeros.
  return match ? { tx: Number(match[1]) + 0, ty: Number(match[2]) + 0, scale: Number(match[3]) } : null;
};
const asCamera = (view: View) => ({ tx: view.tx + 0, ty: view.ty + 0, scale: view.scale });

describe("a workspace comes back as it was left", () => {
  it("restores the composition, the focus, the legend, the density and the motion — and writes nothing while doing so", async () => {
    store.workspace = workspace({
      displayedBrainIds: [A, B, C],
      focusedBrainId: B,
      view: reachable([A, B, C]),
      selected: { brainId: B, nodeId: 4 },
      legendOpen: true,
      density: "compact",
      motion: "reduce",
    });
    await boot();

    expect(chips()).toEqual([A, B, C]);
    expect(focusedChip()).toBe(B);
    expect(lastOf(called("map_brain_activate"))?.args.brainId).toBe(B);
    expect(document.documentElement.dataset.density).toBe("compact");
    expect(document.documentElement.dataset.motion).toBe("reduce");
    expect(screen.getByTestId("density-compact").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("density-comfortable").getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByTestId("motion-reduce").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("map-legend-toggle").getAttribute("aria-expanded")).toBe("true");
    expect(document.getElementById("map-runtime-legend")).toBeTruthy();
    expect(screen.queryByTestId("workspace-corrections")).toBeNull();
    // Reading is not writing.
    expect(called("map_workspace_update")).toHaveLength(0);
  });

  it("restores the camera and the selection of a composition of several brains exactly", async () => {
    const camera = reachable([A, B], { scale: 0.9, tx: -140, ty: 35 });
    store.workspace = workspace({
      displayedBrainIds: [A, B],
      focusedBrainId: B,
      view: camera,
      selected: { brainId: B, nodeId: 4 },
    });
    await boot();
    expect(chips()).toEqual([A, B]);
    expect(selectedRef()).toEqual({ brainId: B, nodeId: 4 });
    expect(transform()).toEqual(asCamera(camera));
    expect(called("map_workspace_update")).toHaveLength(0);
  });

  it("without a stored workspace the application opens on the active brain alone, as it always did", async () => {
    store.active = C;
    await boot();
    expect(chips()).toEqual([C]);
    expect(document.documentElement.dataset.density).toBe("comfortable");
    expect(document.documentElement.dataset.motion).toBe("system");
    expect(screen.getByTestId("map-legend-toggle").getAttribute("aria-expanded")).toBe("false");
    expect(called("map_workspace_update")).toHaveLength(0);
  });

  it("shows every correction the backend named, once, in the current language, and lets them be dismissed", async () => {
    store.workspace = workspace({ displayedBrainIds: [A, B], focusedBrainId: A });
    store.corrections = ["BRAIN_MISSING", "SELECTION_GENERATION_CHANGED"];
    await boot();
    const summary = screen.getByTestId("workspace-corrections");
    expect(summary.getAttribute("role")).toBe("status");
    expect(summary.getAttribute("data-corrections")).toBe("BRAIN_MISSING,SELECTION_GENERATION_CHANGED");
    const items = within(summary).getAllByRole("listitem").map((item) => item.getAttribute("data-correction"));
    expect(items).toEqual(["BRAIN_MISSING", "SELECTION_GENERATION_CHANGED"]);
    expect(summary.textContent).toContain("n'existe plus au catalogue");
    expect(summary.textContent).toContain("L'Index a changé");
    // Non-blocking: nothing took the focus, and the map is still usable.
    expect(document.activeElement === summary).toBe(false);
    fireEvent.click(screen.getByTestId("language-en"));
    expect(screen.getByTestId("workspace-corrections").textContent).toContain("no longer in the catalogue");
    fireEvent.click(screen.getByTestId("workspace-corrections-dismiss"));
    expect(screen.queryByTestId("workspace-corrections")).toBeNull();
  });
});

describe("the notices of what just happened — TASK-0061 B04-O2", () => {
  it("puts the corrections and a refusal in a layer of the window, not in the chrome band, each with a dismiss button", async () => {
    store.workspace = workspace({ displayedBrainIds: [A], focusedBrainId: A });
    store.corrections = ["BRAIN_MISSING"];
    await boot();
    const chrome = document.querySelector(".app__chrome") as HTMLElement;
    const layer = screen.getByTestId("app-feedback");
    // The band scrolls itself; a notice written at its end is under its fold at 960x640.
    expect(chrome.contains(layer)).toBe(false);
    expect(layer.contains(screen.getByTestId("workspace-corrections"))).toBe(true);
    expect(layer.contains(screen.getByTestId("workspace-corrections-dismiss"))).toBe(true);

    // The product's own refusal: removing the last displayed brain.
    fireEvent.click(screen.getByTestId(`composition-remove-${A}`));
    const notice = await screen.findByTestId("status-notice");
    expect(layer.contains(notice)).toBe(true);
    expect(within(notice).getByRole("status").textContent).toContain("Composition refusée");
    const dismiss = within(notice).getByTestId("status-dismiss");
    expect(dismiss.tagName).toBe("BUTTON");
    expect(dismiss.textContent).toBe("Fermer ce message");
    // The live region carries the words and nothing else, so the button is not read as part of them.
    expect(within(notice).getByRole("status").contains(dismiss)).toBe(false);

    fireEvent.click(dismiss);
    expect(screen.queryByTestId("status-notice")).toBeNull();
    // The corrections are a separate notice: dismissing one does not dismiss the other.
    expect(screen.queryByTestId("workspace-corrections")).toBeTruthy();
    fireEvent.click(screen.getByTestId("workspace-corrections-dismiss"));
    expect(screen.queryByTestId("app-feedback")).toBeNull();
  });

  it("Escape dismisses what is on screen, but never a key somebody else used", async () => {
    store.workspace = workspace({ displayedBrainIds: [A], focusedBrainId: A });
    store.corrections = ["BRAIN_MISSING"];
    await boot();
    fireEvent.click(screen.getByTestId(`composition-remove-${A}`));
    await screen.findByTestId("status-notice");

    // Pressed in a text field, Escape keeps its own meaning there.
    const search = screen.getByTestId("search-input");
    fireEvent.keyDown(search, { key: "Escape" });
    expect(screen.queryByTestId("status-notice")).toBeTruthy();

    // A handler that already used the key said so with preventDefault.
    const used = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    used.preventDefault();
    document.body.dispatchEvent(used);
    expect(screen.queryByTestId("status-notice")).toBeTruthy();

    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(screen.queryByTestId("status-notice")).toBeNull();
    expect(screen.queryByTestId("workspace-corrections")).toBeNull();
    expect(screen.queryByTestId("app-feedback")).toBeNull();
  });
});

describe("what a change writes", () => {
  it("writes a legend, density or motion change at once, to the workspace and nowhere else", async () => {
    await boot();
    fireEvent.click(screen.getByTestId("map-legend-toggle"));
    await settle(60);
    expect(lastOf(store.updates)?.legendOpen).toBe(true);
    fireEvent.click(screen.getByTestId("density-compact"));
    await settle(60);
    expect(lastOf(store.updates)).toMatchObject({ legendOpen: true, density: "compact", motion: "system" });
    expect(document.documentElement.dataset.density).toBe("compact");
    fireEvent.click(screen.getByTestId("motion-reduce"));
    await settle(60);
    expect(lastOf(store.updates)).toMatchObject({ legendOpen: true, density: "compact", motion: "reduce" });
    expect(document.documentElement.dataset.motion).toBe("reduce");
    // Closing the legend is as durable as opening it.
    fireEvent.click(screen.getByTestId("map-legend-toggle"));
    await settle(60);
    expect(lastOf(store.updates)?.legendOpen).toBe(false);
    // None of it went through the per-brain resume state or the language.
    expect(called("map_brain_resume_update").every((call) => !JSON.stringify(call.args).includes("compact"))).toBe(true);
    expect(localStorage.getItem("filetopo.locale")).toBeNull();
  });

  it("for one brain alone the camera and the selection stay the brain's: the workspace carries null", async () => {
    store.workspace = workspace({ displayedBrainIds: [A], focusedBrainId: A });
    await boot();
    fireEvent.click(screen.getByTestId("density-compact"));
    await settle(60);
    const written = lastOf(store.updates)!;
    expect(written.displayedBrainIds).toEqual([A]);
    expect(written.view).toBeNull();
    expect(written.selected).toBeNull();
  });

  it("for several brains the workspace carries the composition's selection and camera", async () => {
    const camera = reachable([A, B], { scale: 0.9, tx: -140, ty: 35 });
    store.workspace = workspace({ displayedBrainIds: [A, B], focusedBrainId: A, view: camera, selected: { brainId: B, nodeId: 4 } });
    await boot();
    fireEvent.click(screen.getByTestId("motion-reduce"));
    await settle(60);
    const written = lastOf(store.updates)!;
    expect(written.selected).toEqual({ brainId: B, nodeId: 4 });
    expect(written.view).toEqual({ ...camera, tx: camera.tx + 0, ty: camera.ty + 0 });
    expect(written.displayedBrainIds).toEqual([A, B]);
  });

  it("changing the displayed brains writes the new composition at once", async () => {
    store.workspace = workspace({ displayedBrainIds: [A], focusedBrainId: A });
    await boot();
    fireEvent.click(screen.getByTestId("composition-add-trigger"));
    fireEvent.click(await screen.findByTestId(`composition-add-item-${C}`));
    await waitFor(() => expect(chips()).toEqual([A, C]));
    await settle(600);
    expect(lastOf(store.updates)).toMatchObject({ displayedBrainIds: [A, C], focusedBrainId: A });
  });
});

describe("a workspace that cannot be read", () => {
  for (const mode of ["reject", "garbage"] as const) {
    it(`(${mode}) opens on the active brain alone and never writes a guessed value`, async () => {
      store.mode = mode;
      store.workspace = workspace({ displayedBrainIds: [A, B, C], focusedBrainId: C, legendOpen: true, density: "compact" });
      await boot();
      expect(chips()).toEqual([A]);
      fireEvent.click(screen.getByTestId("density-compact"));
      fireEvent.click(screen.getByTestId("map-legend-toggle"));
      await settle(600);
      // The preference still works for this session…
      expect(document.documentElement.dataset.density).toBe("compact");
      // …but nothing replaced the record the catalogue keeps.
      expect(called("map_workspace_update")).toHaveLength(0);
    });
  }
});

describe("a branch focus survives a restart", () => {
  // The branch is drawn alone (one territory); the composition it was entered from has two.
  const branchCamera = reachable([A], { scale: 1.25, tx: -30, ty: -12 });
  const compositionCamera = reachable([A, B], { scale: 0.9, tx: -140, ty: 35 });
  const branched = (selected = 4) =>
    workspace({
      displayedBrainIds: [A, B],
      focusedBrainId: A,
      view: branchCamera,
      selected: { brainId: A, nodeId: selected },
      branchFocus: {
        brainId: A,
        rootNodeId: 2,
        collapsedIds: [],
        savedView: compositionCamera,
        savedSelected: { brainId: B, nodeId: 5 },
      },
    });

  it("comes back in the same branch, with the same selection, and writes nothing to get there", async () => {
    store.workspace = branched();
    await boot();
    const panel = screen.getByTestId("branch-focus-panel");
    expect(panel.getAttribute("data-branch-active")).toBe("true");
    expect(panel.getAttribute("data-branch-root-id")).toBe("2");
    const branchCall = lastOf(called("map_branch_view"))!;
    expect(branchCall.args).toMatchObject({ brainId: A, rootId: 2, collapsedIds: [] });
    expect(selectedRef()).toEqual({ brainId: A, nodeId: 4 });
    expect(transform()).toEqual(asCamera(branchCamera));
    // Only the branch's brain is drawn while the focus lasts.
    expect(document.querySelectorAll('[data-testid="composed-canvas"] [role="treeitem"][data-brain-id="brain-beta"]')).toHaveLength(0);
    expect(called("map_workspace_update")).toHaveLength(0);
  });

  it("« Quitter le focus » puts back the composition, the camera and the selection of before the focus", async () => {
    store.workspace = branched();
    await boot();
    // `TASK-0060`: this command lives in a native `<details>`; jsdom would let the click through
    // with the group closed, so the group is opened first, as a person opens it.
    openGroup("map-advanced-tools");
    fireEvent.click(screen.getByTestId("branch-exit"));
    await settle(600);
    expect(screen.getByTestId("branch-focus-panel").getAttribute("data-branch-active")).toBe("false");
    expect(chips()).toEqual([A, B]);
    expect(selectedRef()).toEqual({ brainId: B, nodeId: 5 });
    expect(transform()).toEqual(asCamera(compositionCamera));
    expect(lastOf(store.updates)).toMatchObject({
      branchFocus: null,
      displayedBrainIds: [A, B],
      selected: { brainId: B, nodeId: 5 },
    });
  });

  it("writes the collapsed folders with the branch", async () => {
    store.workspace = branched(2);
    await boot();
    // Collapse the focused root: a real gesture on the real button.
    openGroup("map-advanced-tools");
    fireEvent.click(screen.getByTestId("branch-toggle"));
    await waitFor(() => expect(called("map_branch_view").length).toBeGreaterThan(1));
    await settle(600);
    expect(lastOf(store.updates)?.branchFocus).toMatchObject({ brainId: A, rootNodeId: 2, collapsedIds: [expect.any(Number)] });
    expect(lastOf(store.updates)?.branchFocus?.savedSelected).toEqual({ brainId: B, nodeId: 5 });
  });

  it("a branch the backend could not keep is simply not restored: the composition opens, the correction is shown", async () => {
    store.workspace = workspace({
      displayedBrainIds: [A, B],
      focusedBrainId: A,
      view: compositionCamera,
      selected: { brainId: B, nodeId: 5 },
    });
    store.corrections = ["BRANCH_GENERATION_CHANGED"];
    await boot();
    expect(screen.getByTestId("branch-focus-panel").getAttribute("data-branch-active")).toBe("false");
    expect(chips()).toEqual([A, B]);
    expect(selectedRef()).toEqual({ brainId: B, nodeId: 5 });
    expect(transform()).toEqual(asCamera(compositionCamera));
    expect(screen.getByTestId("workspace-corrections").getAttribute("data-corrections")).toBe("BRANCH_GENERATION_CHANGED");
  });
});
