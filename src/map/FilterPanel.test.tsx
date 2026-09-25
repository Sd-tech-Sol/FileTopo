import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import FilterPanel from "./FilterPanel";
import { DEFAULT_FILTER } from "./filters";
import type { FilteredProjection, MapNode, NodeFilter } from "./types";

afterEach(cleanup);

function node(id: number, name: string, depth: number, kind: MapNode["kind"] = "file"): MapNode {
  return {
    id,
    parentId: id === 1 ? null : 1,
    name,
    relativePath: name,
    kind,
    depth,
    sizeBytes: 0,
    modifiedUnixMs: null,
    childCount: 0,
    accessDiagnostic: null,
    rect: { x: 0, y: 0, w: 240, h: 64 },
  };
}

const nodes = [
  node(1, "racine", 0, "root"),
  node(2, "docs", 1, "directory"),
  node(4, "neuf.txt", 2),
  node(5, "x.txt", 1),
];

function filtered(overrides: Partial<FilteredProjection> = {}): FilteredProjection {
  return {
    filter: { state: "NEW", kinds: [], availability: "ALL" },
    filteredTotal: 137,
    materializedMatchCount: 2,
    filterMatchIds: [4, 5],
    filterContextIds: [1, 2],
    filterNextCursor: "ftf1.idx.3.NEW::ALL.5",
    ...overrides,
  };
}

function panel(props: Partial<React.ComponentProps<typeof FilterPanel>> = {}) {
  const handlers = {
    onChange: vi.fn(),
    onReset: vi.fn(),
    onPrevious: vi.fn(),
    onNext: vi.fn(),
    onSelect: vi.fn(),
  };
  const utils = render(
    <FilterPanel
      locale="fr"
      filter={DEFAULT_FILTER}
      active={false}
      filtered={null}
      nodes={nodes}
      pageNumber={1}
      canPrevious={false}
      {...handlers}
      {...props}
    />,
  );
  return { ...utils, ...handlers };
}

describe("TASK-0039 E — les contrôles de filtre", () => {
  it("expose état, type et disponibilité comme des contrôles nommés et accessibles", () => {
    panel();
    const state = screen.getByRole("group", { name: "État" });
    expect(within(state).getAllByRole("radio").map((r) => r.getAttribute("value"))).toEqual([
      "ALL",
      "NEW",
      "UNSEEN",
    ]);
    expect(within(state).getByRole("radio", { name: "Tout" })).toBeChecked();
    expect(within(state).getByRole("radio", { name: "Nouveaux" })).toBeInTheDocument();
    expect(within(state).getByRole("radio", { name: "Non vus" })).toBeInTheDocument();

    const kinds = screen.getByRole("group", { name: "Type" });
    for (const label of ["dossiers", "fichiers", "ignorés"]) {
      const box = within(kinds).getByRole("checkbox", { name: label });
      expect(box).not.toBeChecked();
    }

    const availability = screen.getByRole("group", { name: "Disponibilité" });
    expect(within(availability).getByRole("radio", { name: "Tout" })).toBeChecked();
    expect(within(availability).getByRole("radio", { name: "local" })).toBeInTheDocument();
    expect(within(availability).getByRole("radio", { name: "en ligne seulement" })).toBeInTheDocument();
    expect(screen.getByTestId("filter-active")).toHaveTextContent("Aucun filtre actif.");
  });

  it("chaque choix émet le filtre complet, groupes combinés, types normalisés", () => {
    const { onChange } = panel({
      filter: { state: "NEW", kinds: ["FILE"], availability: "LOCAL" },
      active: true,
    });
    fireEvent.click(screen.getByRole("radio", { name: "Non vus" }));
    expect(onChange).toHaveBeenLastCalledWith({ state: "UNSEEN", kinds: ["FILE"], availability: "LOCAL" });

    fireEvent.click(screen.getByRole("checkbox", { name: "dossiers" }));
    expect(onChange).toHaveBeenLastCalledWith({
      state: "NEW",
      kinds: ["DIRECTORY", "FILE"],
      availability: "LOCAL",
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "fichiers" }));
    expect(onChange).toHaveBeenLastCalledWith({ state: "NEW", kinds: [], availability: "LOCAL" });

    fireEvent.click(screen.getByRole("radio", { name: "en ligne seulement" }));
    expect(onChange).toHaveBeenLastCalledWith({
      state: "NEW",
      kinds: ["FILE"],
      availability: "ONLINE_ONLY",
    });
  });

  it("montre état + type + disponibilité combinés, en mots", () => {
    const combined: NodeFilter = { state: "UNSEEN", kinds: ["FILE", "DIRECTORY"], availability: "LOCAL" };
    panel({ filter: combined, active: true, filtered: filtered({ filter: combined }) });
    expect(screen.getByRole("radio", { name: "Non vus" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "dossiers" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "fichiers" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "ignorés" })).not.toBeChecked();
    expect(screen.getByTestId("filter-active")).toHaveTextContent(
      "Filtre actif — État : Non vus · Type : dossiers, fichiers · Disponibilité : local",
    );
  });

  it("« Réinitialiser les filtres » remet tout par défaut en une seule action", () => {
    const { onReset } = panel({
      filter: { state: "NEW", kinds: ["FILE"], availability: "LOCAL" },
      active: true,
      filtered: filtered(),
    });
    const reset = screen.getByRole("button", { name: "Réinitialiser les filtres" });
    expect(reset).toBeEnabled();
    fireEvent.click(reset);
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("n'a rien à réinitialiser quand aucun filtre n'est actif", () => {
    panel();
    expect(screen.getByRole("button", { name: "Réinitialiser les filtres" })).toBeDisabled();
    expect(screen.queryByTestId("filter-count")).toBeNull();
    expect(screen.queryByTestId("filter-results")).toBeNull();
  });

  it("affiche le compte exact du cœur, pas celui des nœuds affichés", () => {
    panel({ filter: { ...DEFAULT_FILTER, state: "NEW" }, active: true, filtered: filtered() });
    const count = screen.getByTestId("filter-count");
    expect(count).toHaveTextContent("137 correspondances");
    expect(count.getAttribute("data-total")).toBe("137");
    // Deux correspondances sont affichées sur cette page : ce n'est pas le total.
    expect(screen.getByTestId("filter-page")).toHaveTextContent("Page 1 · 2 correspondances sur cette page");
  });

  it("distingue Correspondance et Contexte par un mot et un symbole, pas par la couleur", () => {
    panel({ filter: { ...DEFAULT_FILTER, state: "NEW" }, active: true, filtered: filtered() });
    const results = screen.getAllByTestId("filter-result");
    expect(results).toHaveLength(4);
    const byId = (id: number) => results.find((r) => r.getAttribute("data-node-id") === String(id))!;
    expect(byId(4)).toHaveTextContent("Correspondance");
    expect(byId(4)).toHaveTextContent("◆");
    expect(byId(4).getAttribute("data-filter-role")).toBe("match");
    expect(byId(5).getAttribute("data-filter-role")).toBe("match");
    expect(byId(2)).toHaveTextContent("Contexte");
    expect(byId(2)).toHaveTextContent("◇");
    expect(byId(2).getAttribute("data-filter-role")).toBe("context");
    expect(byId(1)).toHaveTextContent("Contexte");
    // Le contexte n'est jamais présenté comme une correspondance.
    expect(byId(2)).not.toHaveTextContent("Correspondance");
  });

  it("la sélection fonctionne pour une correspondance comme pour un contexte", () => {
    const { onSelect } = panel({
      filter: { ...DEFAULT_FILTER, state: "NEW" },
      active: true,
      filtered: filtered(),
      selectedNodeId: 4,
    });
    const results = screen.getAllByTestId("filter-result");
    const byId = (id: number) => results.find((r) => r.getAttribute("data-node-id") === String(id))!;
    expect(byId(4).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(byId(5));
    fireEvent.click(byId(2));
    expect(onSelect.mock.calls).toEqual([[5], [2]]);
  });

  it("pagine sans accumuler : suivante n'existe que si le cœur donne un curseur", () => {
    const { onNext, onPrevious, rerender } = panel({
      filter: { ...DEFAULT_FILTER, state: "NEW" },
      active: true,
      filtered: filtered(),
      pageNumber: 2,
      canPrevious: true,
    });
    expect(screen.getByTestId("filter-next")).toBeEnabled();
    expect(screen.getByTestId("filter-prev")).toBeEnabled();
    expect(screen.getByTestId("filter-page")).toHaveTextContent("Page 2");
    fireEvent.click(screen.getByTestId("filter-next"));
    fireEvent.click(screen.getByTestId("filter-prev"));
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrevious).toHaveBeenCalledTimes(1);

    rerender(
      <FilterPanel
        locale="fr"
        filter={{ ...DEFAULT_FILTER, state: "NEW" }}
        active
        filtered={filtered({ filterNextCursor: null })}
        nodes={nodes}
        pageNumber={1}
        canPrevious={false}
        onChange={vi.fn()}
        onReset={vi.fn()}
        onPrevious={vi.fn()}
        onNext={vi.fn()}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByTestId("filter-next")).toBeDisabled();
    expect(screen.getByTestId("filter-prev")).toBeDisabled();
    // Une seule page de résultats à la fois : la liste ne fait que se remplacer.
    expect(screen.getAllByTestId("filter-result")).toHaveLength(4);
  });

  it("dit qu'il attend le cœur tant qu'aucune page filtrée n'est arrivée", () => {
    panel({ filter: { ...DEFAULT_FILTER, state: "NEW" }, active: true, filtered: null });
    expect(screen.getByTestId("filter-loading")).toHaveTextContent("Lecture du filtre");
    expect(screen.queryByTestId("filter-count")).toBeNull();
  });

  it("sans cerveau au premier plan, tous les groupes sont désactivés", () => {
    panel({ disabled: true });
    for (const group of screen.getAllByRole("group")) expect(group).toBeDisabled();
  });

  it("ne porte aucune identité machine dans son balisage", () => {
    const { container } = panel({
      filter: { ...DEFAULT_FILTER, state: "NEW" },
      active: true,
      filtered: filtered(),
    });
    expect(container.innerHTML).not.toMatch(/stableKey|fileId|volumeSerial|absolutePath|[A-Z]:\\\\/);
  });
});
