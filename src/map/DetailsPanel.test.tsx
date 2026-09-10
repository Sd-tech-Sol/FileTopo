/**
 * `TASK-0034` D — "Ouvrir dans l'Explorateur" at the details panel boundary.
 *
 * The panel never assembles a path or reads one from the node: it forwards
 * exactly the `reference` it was given, and nothing about the click handler
 * can add a field to that call without this test noticing.
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DetailsPanel, { type PanelStrings } from "./DetailsPanel";
import type { MapNode, NodeDetail } from "./types";

afterEach(cleanup);

const strings: PanelStrings = {
  title: "Détails de la sélection",
  empty: "Sélectionnez un bloc.",
  loading: "Lecture…",
  name: "Nom",
  kind: "Type",
  path: "Chemin relatif",
  size: "Taille",
  modified: "Modifié",
  parent: "Parent",
  children: "Enfants directs",
  diagnostic: "Diagnostic d'accès",
  noDiagnostic: "aucun",
  noParent: "Ce nœud est la racine.",
  noChildren: "Aucun enfant direct.",
  rootPath: "(racine)",
  kinds: { root: "racine", directory: "dossier", file: "fichier", skipped: "ignoré" },
};

function node(overrides: Partial<MapNode> = {}): MapNode {
  return {
    id: 7,
    parentId: 1,
    name: "note.txt",
    relativePath: "dossier/note.txt",
    kind: "file",
    depth: 1,
    sizeBytes: 42,
    modifiedUnixMs: null,
    childCount: 0,
    accessDiagnostic: null,
    rect: { x: 0, y: 0, w: 240, h: 64 },
    ...overrides,
  };
}

const detail: NodeDetail = { node: node(), parent: null, children: [] };

function baseProps() {
  return {
    detail,
    loading: false,
    onSelect: vi.fn(),
    locale: "fr" as const,
    strings,
  };
}

describe("Ouvrir dans l'Explorateur — TASK-0034 D", () => {
  it("is hidden when no reference or no handler is given", () => {
    render(<DetailsPanel {...baseProps()} />);
    expect(screen.queryByTestId("reveal-in-explorer")).toBeNull();

    render(<DetailsPanel {...baseProps()} reference={{ brainId: "brain-alpha", nodeId: 7 }} />);
    expect(screen.queryByTestId("reveal-in-explorer")).toBeNull();
  });

  it("calls onReveal with exactly the reference it was given — no extra field", () => {
    const onReveal = vi.fn();
    const reference = { brainId: "brain-alpha", nodeId: 7 };
    render(<DetailsPanel {...baseProps()} reference={reference} onReveal={onReveal} />);

    fireEvent.click(screen.getByTestId("reveal-in-explorer"));

    expect(onReveal).toHaveBeenCalledTimes(1);
    expect(onReveal).toHaveBeenCalledWith(reference);
    const [[called]] = onReveal.mock.calls;
    expect(Object.keys(called).sort()).toEqual(["brainId", "nodeId"]);
  });

  it("disables the button and shows the busy label while a reveal is in flight", () => {
    render(
      <DetailsPanel
        {...baseProps()}
        reference={{ brainId: "brain-alpha", nodeId: 7 }}
        onReveal={vi.fn()}
        revealBusy
        revealBusyLabel="Ouverture…"
        revealActionLabel="Ouvrir dans l'Explorateur"
      />,
    );
    const button = screen.getByTestId("reveal-in-explorer");
    expect(button).toBeDisabled();
    expect(button.textContent).toBe("Ouverture…");
  });

  it("shows a short, user-facing error and never an absolute path", () => {
    render(
      <DetailsPanel
        {...baseProps()}
        reference={{ brainId: "brain-alpha", nodeId: 7 }}
        onReveal={vi.fn()}
        revealError="Cet élément est introuvable ou inaccessible."
      />,
    );
    const error = screen.getByTestId("reveal-error");
    expect(error.textContent).toBe("Cet élément est introuvable ou inaccessible.");
    expect(error.textContent).not.toMatch(/[A-Za-z]:\\|\/home\/|\\\\/);
  });

  it("keeps the existing relative-path row unchanged", () => {
    render(
      <DetailsPanel {...baseProps()} reference={{ brainId: "brain-alpha", nodeId: 7 }} onReveal={vi.fn()} />,
    );
    expect(screen.getByText("dossier/note.txt")).toBeInTheDocument();
  });
});
