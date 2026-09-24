import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MapApp from "./MapApp";
import type { MapProjection, SourceObservation } from "./types";

/**
 * `ACTION-0069` T4 — the real `MapApp`, a scripted backend.
 *
 * The backend refuses **Actualiser** because the root is absent, and answers
 * `map_source_observation` with the observation whose own write failed:
 * `UNAVAILABLE`, `persisted: false`. The interface has to keep the loaded map, show
 * that observation, say it did not stick, and start nothing else.
 */
const invokeMock = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...args: unknown[]) => invokeMock(...args) }));

const BRAIN = "brain-alpha";
const RECORD = {
  brainId: BRAIN,
  displayName: "Alpha",
  color: "#2b6cb0",
  icon: "A",
  sourceKind: "REAL_ROOT",
  sourceRef: "00000000-0000-4000-8000-000000000000",
  sourceLabel: "racine-synthetique",
  position: 0,
};

const SYNCED: SourceObservation = {
  state: "SYNCED",
  reason: null,
  observedUnixMs: 1_790_000_000_000,
  lastSuccessfulRevision: 3,
  lastSuccessfulUnixMs: 1_790_000_000_000,
  persisted: true,
};

// What the backend holds after the refused Actualiser: the real observation, whose
// write failed, so it is not persisted.
const UNAVAILABLE_NOT_PERSISTED: SourceObservation = {
  state: "UNAVAILABLE",
  reason: "ROOT_NOT_FOUND",
  observedUnixMs: 1_790_000_100_000,
  lastSuccessfulRevision: 3,
  lastSuccessfulUnixMs: 1_790_000_000_000,
  persisted: false,
};

const PROJECTION: MapProjection = {
  brainId: BRAIN,
  fixtureId: "racine-synthetique",
  label: "racine-synthetique",
  rootId: 1,
  nodeCount: 2,
  layoutWidth: 960,
  layoutHeight: 200,
  schemaVersion: 6,
  layoutAlgorithm: "layered-tree-cards-v1",
  nodes: [
    {
      id: 1,
      parentId: null,
      name: "racine-synthetique",
      relativePath: "",
      kind: "root",
      depth: 0,
      sizeBytes: 0,
      modifiedUnixMs: 1,
      childCount: 1,
      accessDiagnostic: null,
      rect: { x: 0, y: 0, w: 240, h: 64 },
    },
    {
      id: 2,
      parentId: 1,
      name: "a.txt",
      relativePath: "a.txt",
      kind: "file",
      depth: 1,
      sizeBytes: 3,
      modifiedUnixMs: 1,
      childCount: 0,
      accessDiagnostic: null,
      rect: { x: 360, y: 0, w: 240, h: 64 },
    },
  ],
  diagnostics: [],
  indexRevision: 3,
  focusId: 1,
  viewBudget: 512,
  materializedCount: 2,
  nonMaterializedCount: 0,
  hiddenReason: null,
  aggregates: [],
  hierarchyEdges: [{ parentId: 1, childId: 2 }],
};

const commandsCalled = () => invokeMock.mock.calls.map(([command]) => String(command));

beforeEach(() => {
  invokeMock.mockReset();
  invokeMock.mockImplementation(async (command: string) => {
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
          brains: [RECORD],
          activeBrainId: BRAIN,
          schemaVersion: 1,
          catalogPath: "catalog.sqlite",
          seeded: 0,
        };
      case "map_ui_preferences":
        return { detailsPanelVisible: true };
      case "map_open":
        return {
          brainId: BRAIN,
          state: "OPENED_EXISTING",
          indexId: "index-1",
          revision: 3,
          nodeCount: 2,
          schemaVersion: 6,
          sourceRead: false,
          indexReused: true,
          freshness: "UNKNOWN",
          sourceObservation: SYNCED,
        };
      case "map_view":
        return PROJECTION;
      case "map_brain_activate":
        return RECORD;
      case "map_refresh":
        throw new Error("map_scan_failed: root_metadata_failed (NotFound)");
      case "map_source_observation":
        return UNAVAILABLE_NOT_PERSISTED;
      default:
        // Relations, logs, details…: none of them is what this test looks at.
        return null;
    }
  });
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("ACTION-0069 T4 — a refused Actualiser whose observation could not be written", () => {
  it("keeps the loaded map, shows UNAVAILABLE as not persisted and starts nothing", async () => {
    render(<MapApp />);

    // Boot: the active brain is opened from its Index, and the badge shows SYNCED.
    await waitFor(() =>
      expect(screen.getByTestId("source-observation").getAttribute("data-state")).toBe("SYNCED"),
    );
    expect(screen.getByTestId("source-observation").getAttribute("data-persisted")).toBe("true");
    const totalBefore = screen.getByTestId("composed-total").textContent;
    expect(totalBefore).toContain("2");

    fireEvent.click(screen.getByTestId("lifecycle-refresh"));

    await waitFor(() =>
      expect(screen.getByTestId("source-observation").getAttribute("data-state")).toBe(
        "UNAVAILABLE",
      ),
    );
    const badge = screen.getByTestId("source-observation");
    expect(badge.getAttribute("data-reason")).toBe("ROOT_NOT_FOUND");
    expect(badge.getAttribute("data-persisted")).toBe("false");
    expect(screen.getByTestId("source-observation-when").textContent).toContain(
      "non enregistrée",
    );
    expect(badge.textContent).toContain("Source indisponible — dernier index conservé");
    // Never the stale SYNCED sentence.
    expect(badge.textContent).not.toContain("À jour à la dernière vérification");

    // The map that was loaded is still the one on screen, untouched.
    expect(screen.getByTestId("composed-total").textContent).toBe(totalBefore);

    // The refused refresh was followed by exactly one local read of the observation,
    // and by nothing that would scan, rebuild or reopen.
    const calls = commandsCalled();
    const refresh = calls.indexOf("map_refresh");
    expect(refresh).toBeGreaterThan(-1);
    const after = calls.slice(refresh);
    expect(after[0]).toBe("map_refresh");
    expect(after.filter((command) => command === "map_source_observation")).toHaveLength(1);
    expect(calls).not.toContain("map_rebuild");
    expect(calls).not.toContain("map_prepare_synthetic_source");
    expect(after).not.toContain("map_open");
    expect(after).not.toContain("map_view");
    expect(
      invokeMock.mock.calls.find(([command]) => command === "map_source_observation")?.[1],
    ).toEqual({ brainId: BRAIN });
  });
});
