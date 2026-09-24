import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import appSource from "./MapApp.tsx?raw";
import hookSource from "./useProjectionFilter.ts?raw";
import { useProjectionFilter } from "./useProjectionFilter";
import type { MapProjection, NodeFilter } from "./types";

const invokeMock = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

const NEW: NodeFilter = { state: "NEW", kinds: [], availability: "ALL" };
const UNSEEN: NodeFilter = { state: "UNSEEN", kinds: [], availability: "ALL" };
const FILES_ONLY: NodeFilter = { state: "ALL", kinds: ["FILE"], availability: "ALL" };

/** The page a backend would answer — small, bounded, no corpus. */
function reply(brainId: string, filter: NodeFilter, extra: Record<string, unknown> = {}): MapProjection {
  return {
    brainId,
    indexRevision: 3,
    nodes: [],
    filtered: {
      filter,
      filteredTotal: 200,
      materializedMatchCount: 2,
      filterMatchIds: [4, 5],
      filterContextIds: [1],
      filterNextCursor: "ftf1.idx.3.next.5",
      ...extra,
    },
  } as unknown as MapProjection;
}

const last = <T,>(items: T[]): T | undefined => items[items.length - 1];

const mapViewCalls = () =>
  invokeMock.mock.calls.filter(([command]) => command === "map_view").map(([, args]) => args);

function setup(initial: { brainId: string | null; revision: number | null; seenRevision: number }) {
  const onProjection = vi.fn();
  const onRestore = vi.fn();
  const onError = vi.fn();
  const view = renderHook(
    (props: typeof initial) =>
      useProjectionFilter({ ...props, onProjection, onRestore, onError }),
    { initialProps: initial },
  );
  return { ...view, onProjection, onRestore, onError };
}

beforeEach(() => {
  invokeMock.mockReset();
  invokeMock.mockImplementation((_command: string, args: { brainId: string; filter: NodeFilter }) =>
    Promise.resolve(reply(args.brainId, args.filter)),
  );
});
afterEach(cleanup);

describe("TASK-0039 — l'état des filtres et ses lectures", () => {
  it("ne lit rien tant qu'aucun filtre n'est actif, puis lit la première page du cœur", async () => {
    const { result, onProjection } = setup({ brainId: "a", revision: 3, seenRevision: 0 });
    expect(result.current.active).toBe(false);
    expect(mapViewCalls()).toHaveLength(0);

    act(() => result.current.change(NEW));
    await waitFor(() => expect(onProjection).toHaveBeenCalledTimes(1));
    expect(mapViewCalls()).toEqual([{ brainId: "a", after: null, filter: NEW }]);
    expect(onProjection.mock.calls[0][0]).toBe("a");
    expect(result.current.active).toBe(true);
    expect(result.current.pageNumber).toBe(1);
    expect(result.current.canPrevious).toBe(false);
  });

  it("normalise le filtre envoyé et un filtre inactif ne lit rien du tout", async () => {
    const { result, onProjection, onRestore } = setup({ brainId: "a", revision: 3, seenRevision: 0 });
    act(() =>
      result.current.change({ state: "ALL", kinds: ["FILE", "DIRECTORY", "FILE"], availability: "ALL" }),
    );
    await waitFor(() => expect(onProjection).toHaveBeenCalled());
    expect(mapViewCalls()[0]).toEqual({
      brainId: "a",
      after: null,
      filter: { state: "ALL", kinds: ["DIRECTORY", "FILE"], availability: "ALL" },
    });

    invokeMock.mockClear();
    act(() => result.current.change({ state: "ALL", kinds: [], availability: "ALL" }));
    // Rien n'est filtré : la projection normale est relue, sans filtre.
    expect(onRestore).toHaveBeenCalledWith("a");
    expect(result.current.active).toBe(false);
    expect(mapViewCalls()).toHaveLength(0);
  });

  it("un changement de filtre repart de la première page", async () => {
    const { result, onProjection } = setup({ brainId: "a", revision: 3, seenRevision: 0 });
    act(() => result.current.change(NEW));
    await waitFor(() => expect(onProjection).toHaveBeenCalledTimes(1));
    act(() => result.current.next("ftf1.idx.3.next.5"));
    await waitFor(() => expect(onProjection).toHaveBeenCalledTimes(2));
    expect(result.current.pageNumber).toBe(2);

    act(() => result.current.change(FILES_ONLY));
    await waitFor(() => expect(onProjection).toHaveBeenCalledTimes(3));
    expect(result.current.pageNumber).toBe(1);
    expect(last(mapViewCalls())).toEqual({ brainId: "a", after: null, filter: FILES_ONLY });
  });

  it("la pagination remplace la page : chaque page est relue avec son curseur, jamais accumulée", async () => {
    const { result, onProjection } = setup({ brainId: "a", revision: 3, seenRevision: 0 });
    act(() => result.current.change(NEW));
    await waitFor(() => expect(onProjection).toHaveBeenCalledTimes(1));

    act(() => result.current.next("cursor-2"));
    await waitFor(() => expect(onProjection).toHaveBeenCalledTimes(2));
    act(() => result.current.next("cursor-3"));
    await waitFor(() => expect(onProjection).toHaveBeenCalledTimes(3));
    expect(result.current.pageNumber).toBe(3);
    expect(result.current.canPrevious).toBe(true);

    act(() => result.current.previous());
    await waitFor(() => expect(onProjection).toHaveBeenCalledTimes(4));
    expect(mapViewCalls().map((call) => (call as { after: string | null }).after)).toEqual([
      null,
      "cursor-2",
      "cursor-3",
      "cursor-2",
    ]);
    act(() => result.current.previous());
    await waitFor(() => expect(onProjection).toHaveBeenCalledTimes(5));
    expect((last(mapViewCalls()) as { after: string | null }).after).toBeNull();
    // Un curseur nul n'ouvre pas de page suivante.
    act(() => result.current.next(null));
    expect(result.current.pageNumber).toBe(1);
  });

  it("refuse une réponse périmée : seule la dernière demande est rendue", async () => {
    const pending = new Map<string, (value: MapProjection) => void>();
    invokeMock.mockImplementation((_c: string, args: { brainId: string; filter: NodeFilter }) =>
      new Promise<MapProjection>((resolve) => pending.set(args.filter.state, resolve)),
    );
    const { result, onProjection, onError } = setup({ brainId: "a", revision: 3, seenRevision: 0 });
    act(() => result.current.change(NEW));
    await waitFor(() => expect(pending.has("NEW")).toBe(true));
    act(() => result.current.change(UNSEEN));
    await waitFor(() => expect(pending.has("UNSEEN")).toBe(true));

    // La réponse la plus récente arrive d'abord, l'ancienne ensuite.
    await act(async () => pending.get("UNSEEN")!(reply("a", UNSEEN)));
    await act(async () => pending.get("NEW")!(reply("a", NEW)));
    expect(onProjection).toHaveBeenCalledTimes(1);
    expect(onProjection.mock.calls[0][1].filtered.filter.state).toBe("UNSEEN");
    expect(onError).not.toHaveBeenCalled();
  });

  it("refuse une réponse qui n'est pas celle du filtre ou du cerveau demandés", async () => {
    invokeMock.mockImplementation((_c: string, args: { brainId: string }) =>
      Promise.resolve(reply(args.brainId, UNSEEN)),
    );
    const { result, onProjection, onError } = setup({ brainId: "a", revision: 3, seenRevision: 0 });
    act(() => result.current.change(NEW));
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(onProjection).not.toHaveBeenCalled();

    invokeMock.mockImplementation(() => Promise.resolve(reply("autre-cerveau", UNSEEN)));
    act(() => result.current.change(UNSEEN));
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(2));
    expect(onProjection).not.toHaveBeenCalled();

    // Un cœur qui renvoie une projection normale, sans page filtrée, est refusé.
    invokeMock.mockImplementation(() => Promise.resolve({ brainId: "a", nodes: [] }));
    act(() => result.current.change(FILES_ONLY));
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(3));
    expect(onProjection).not.toHaveBeenCalled();
  });

  it("rapporte un refus du cœur (curseur périmé, autre filtre) sans rien afficher", async () => {
    invokeMock.mockRejectedValue("filter_cursor_stale: cursor revision 2, index revision 3");
    const { result, onProjection, onError } = setup({ brainId: "a", revision: 3, seenRevision: 0 });
    act(() => result.current.change(NEW));
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(onError.mock.calls[0][0]).toContain("filter_cursor_stale");
    expect(onProjection).not.toHaveBeenCalled();
  });

  it("un changement de cerveau abandonne le filtre : rien n'est transporté", async () => {
    const { result, rerender, onProjection, onRestore } = setup({
      brainId: "a",
      revision: 3,
      seenRevision: 0,
    });
    act(() => result.current.change({ state: "NEW", kinds: ["FILE"], availability: "LOCAL" }));
    await waitFor(() => expect(onProjection).toHaveBeenCalledTimes(1));
    act(() => result.current.next("cursor-2"));
    await waitFor(() => expect(onProjection).toHaveBeenCalledTimes(2));
    invokeMock.mockClear();

    rerender({ brainId: "b", revision: 9, seenRevision: 0 });
    await waitFor(() => expect(onRestore).toHaveBeenCalledWith("a"));
    expect(result.current.active).toBe(false);
    expect(result.current.filter).toEqual({ state: "ALL", kinds: [], availability: "ALL" });
    expect(result.current.pageNumber).toBe(1);
    expect(result.current.session).toBeNull();
    // Le second cerveau n'a reçu aucune lecture filtrée.
    expect(mapViewCalls()).toHaveLength(0);
  });

  it("un filtre posé sur le second cerveau ne porte que sur lui", async () => {
    const { result, rerender, onProjection } = setup({ brainId: "a", revision: 3, seenRevision: 0 });
    act(() => result.current.change(NEW));
    await waitFor(() => expect(onProjection).toHaveBeenCalledTimes(1));
    rerender({ brainId: "b", revision: 9, seenRevision: 0 });
    await waitFor(() => expect(result.current.active).toBe(false));
    act(() => result.current.change(UNSEEN));
    await waitFor(() => expect(onProjection).toHaveBeenCalledTimes(2));
    expect(last(mapViewCalls())).toEqual({ brainId: "b", after: null, filter: UNSEEN });
    expect(result.current.session?.brainId).toBe("b");
  });

  it("après un geste « vu », Nouveaux / Non vus est relu depuis le cœur, à la première page", async () => {
    const { result, rerender, onProjection } = setup({ brainId: "a", revision: 3, seenRevision: 0 });
    act(() => result.current.change(NEW));
    await waitFor(() => expect(onProjection).toHaveBeenCalledTimes(1));
    act(() => result.current.next("cursor-2"));
    await waitFor(() => expect(onProjection).toHaveBeenCalledTimes(2));

    rerender({ brainId: "a", revision: 3, seenRevision: 1 });
    await waitFor(() => expect(mapViewCalls().length).toBeGreaterThanOrEqual(3));
    await waitFor(() => expect(result.current.pageNumber).toBe(1));
    expect((last(mapViewCalls()) as { after: string | null }).after).toBeNull();
    expect(last(mapViewCalls())).toMatchObject({ filter: NEW });
  });

  it("un geste « vu » ne relit pas un filtre qui ne dépend pas de l'état vu", async () => {
    const { result, rerender, onProjection } = setup({ brainId: "a", revision: 3, seenRevision: 0 });
    act(() => result.current.change(FILES_ONLY));
    await waitFor(() => expect(onProjection).toHaveBeenCalledTimes(1));
    rerender({ brainId: "a", revision: 3, seenRevision: 1 });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(mapViewCalls()).toHaveLength(1);
  });

  it("une nouvelle révision de l'Index relit la page, depuis la première", async () => {
    const { result, rerender, onProjection } = setup({ brainId: "a", revision: 3, seenRevision: 0 });
    act(() => result.current.change(UNSEEN));
    await waitFor(() => expect(onProjection).toHaveBeenCalledTimes(1));
    act(() => result.current.next("cursor-2"));
    await waitFor(() => expect(onProjection).toHaveBeenCalledTimes(2));

    rerender({ brainId: "a", revision: 4, seenRevision: 0 });
    await waitFor(() => expect(result.current.pageNumber).toBe(1));
    await waitFor(() => expect((last(mapViewCalls()) as { after: string | null }).after).toBeNull());
  });

  it("naviguer dans le cerveau abandonne le filtre sans relire la projection normale", async () => {
    const { result, onProjection, onRestore } = setup({ brainId: "a", revision: 3, seenRevision: 0 });
    act(() => result.current.change(NEW));
    await waitFor(() => expect(onProjection).toHaveBeenCalledTimes(1));
    act(() => result.current.dropForNavigation("b"));
    expect(result.current.active).toBe(true);
    act(() => result.current.dropForNavigation("a"));
    expect(result.current.active).toBe(false);
    expect(onRestore).not.toHaveBeenCalled();
  });

  it("ne garde ni nœud ni corpus : un filtre, un cerveau, des curseurs", async () => {
    const { result, onProjection } = setup({ brainId: "a", revision: 3, seenRevision: 0 });
    act(() => result.current.change(NEW));
    await waitFor(() => expect(onProjection).toHaveBeenCalledTimes(1));
    expect(Object.keys(result.current.session!).sort()).toEqual(["brainId", "cursors", "filter"]);
    expect(hookSource).not.toMatch(/\bnodes\b|MapNode|hierarchy|setLoaded/);
    // Ni chemin absolu, ni clé stable, ni identité système.
    expect(hookSource).not.toMatch(/absolutePath|stableKey|fileId|volumeSerial|localPath/i);
  });
});

describe("TASK-0039 — câblage dans MapApp", () => {
  it("MapApp affiche le panneau, range la page filtrée comme toute projection et relit après « vu »", () => {
    expect(appSource).toContain("<FilterPanel");
    expect(appSource).toContain("useProjectionFilter({");
    expect(appSource).toContain("seenRevision,");
    // La page filtrée passe par le même `loaded` que toute projection : bornée par le cœur.
    expect(appSource).toContain("acceptFilteredProjection");
    expect(appSource).toContain("filterRoles(brain.snapshot.filtered)");
    // Naviguer quitte la vue filtrée ; un autre cerveau ne reçoit pas le filtre.
    expect(appSource).toContain("filter.dropForNavigation(brainId)");
    expect(appSource).toContain("restoreNormalProjection");
    // Aucune commande prototype ni lecture de corpus complet pour filtrer.
    for (const forbidden of ["query_collection_nodes", "map_snapshot", "list_nodes", "map_search_nodes(unseen"]) {
      expect(hookSource).not.toContain(forbidden);
    }
    expect(appSource).not.toContain("query_collection_nodes");
  });

  it("le panneau ne filtre rien lui-même : il n'a ni corpus ni prédicat", async () => {
    const source = (await import("./FilterPanel.tsx?raw")).default;
    expect(source).not.toMatch(/\.filter\(\(node\)\s*=>\s*node\.(kind|childCount|sizeBytes)/);
    expect(source).not.toMatch(/invoke|absolutePath|stableKey|fileId/);
    // Il ne garde que les nœuds déjà dans la projection bornée, pour les nommer.
    expect(source).toContain("nodes.filter((node) => roles.has(node.id))");
  });
});
