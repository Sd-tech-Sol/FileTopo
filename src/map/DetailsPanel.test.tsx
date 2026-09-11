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
import type { MapNode, NodeChildrenPage, NodeDetail } from "./types";

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
  childrenPrevious: "Page précédente",
  childrenNext: "Page suivante",
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

describe("Copier le chemin — TASK-0035 C", () => {
  it("is hidden when no reference or no handler is given", () => {
    render(<DetailsPanel {...baseProps()} />);
    expect(screen.queryByTestId("copy-path")).toBeNull();

    render(<DetailsPanel {...baseProps()} reference={{ brainId: "brain-alpha", nodeId: 7 }} />);
    expect(screen.queryByTestId("copy-path")).toBeNull();
  });

  it("calls onCopyPath with exactly the reference it was given — no extra field", () => {
    const onCopyPath = vi.fn();
    const reference = { brainId: "brain-alpha", nodeId: 7 };
    render(<DetailsPanel {...baseProps()} reference={reference} onCopyPath={onCopyPath} />);

    fireEvent.click(screen.getByTestId("copy-path"));

    expect(onCopyPath).toHaveBeenCalledTimes(1);
    expect(onCopyPath).toHaveBeenCalledWith(reference);
    const [[called]] = onCopyPath.mock.calls;
    expect(Object.keys(called).sort()).toEqual(["brainId", "nodeId"]);
  });

  it("disables the button and shows the busy label while a copy is in flight", () => {
    render(
      <DetailsPanel
        {...baseProps()}
        reference={{ brainId: "brain-alpha", nodeId: 7 }}
        onCopyPath={vi.fn()}
        copyBusy
        copyBusyLabel="Copie…"
        copyActionLabel="Copier le chemin"
      />,
    );
    const button = screen.getByTestId("copy-path");
    expect(button).toBeDisabled();
    expect(button.textContent).toBe("Copie…");
  });

  it("shows a short, user-facing error and never an absolute path", () => {
    render(
      <DetailsPanel
        {...baseProps()}
        reference={{ brainId: "brain-alpha", nodeId: 7 }}
        onCopyPath={vi.fn()}
        copyError="Impossible de copier dans le presse-papiers."
      />,
    );
    const error = screen.getByTestId("copy-error");
    expect(error.textContent).toBe("Impossible de copier dans le presse-papiers.");
    expect(error.textContent).not.toMatch(/[A-Za-z]:\\|\/home\/|\\\\/);
  });

  it("reveal and copy are independent actions, both offered together", () => {
    render(
      <DetailsPanel
        {...baseProps()}
        reference={{ brainId: "brain-alpha", nodeId: 7 }}
        onReveal={vi.fn()}
        onCopyPath={vi.fn()}
      />,
    );
    expect(screen.getByTestId("reveal-in-explorer")).toBeInTheDocument();
    expect(screen.getByTestId("copy-path")).toBeInTheDocument();
  });
});

describe("Enfants directs, page dédiée — TASK-0035 B", () => {
  function childrenPage(overrides: Partial<NodeChildrenPage> = {}): NodeChildrenPage {
    return {
      brainId: "brain-alpha",
      parentNodeId: 1,
      items: [
        { brainId: "brain-alpha", nodeId: 10, name: "alpha", relativePath: "alpha", kind: "directory" },
        { brainId: "brain-alpha", nodeId: 11, name: "beta.txt", relativePath: "beta.txt", kind: "file" },
      ],
      total: 2,
      nextCursor: null,
      indexRevision: 1,
      limit: 50,
      ...overrides,
    };
  }

  it("shows the exact total from the dedicated page, not detail.children's length", () => {
    // `detail.children` is empty here on purpose — `TASK-0035` B requires
    // the total and the list to come from `childrenPage`, never from the
    // bounded map projection's own (here, deliberately misleading) count.
    render(<DetailsPanel {...baseProps()} childrenPage={childrenPage({ total: 57 })} />);
    expect(screen.getByTestId("children-total").textContent).toBe("57");
  });

  it("says a node has no children when the page is empty, not when detail.children is", () => {
    render(
      <DetailsPanel {...baseProps()} childrenPage={childrenPage({ items: [], total: 0, nextCursor: null })} />,
    );
    expect(screen.getByText("Aucun enfant direct.")).toBeInTheDocument();
  });

  it("shows a loading state distinct from the empty state", () => {
    render(<DetailsPanel {...baseProps()} childrenPage={null} childrenLoading />);
    expect(screen.getByText("Lecture…")).toBeInTheDocument();
    expect(screen.queryByText("Aucun enfant direct.")).toBeNull();
  });

  it("selecting a child reuses the existing navigation — onSelect with its nodeId", () => {
    const onSelect = vi.fn();
    render(<DetailsPanel {...baseProps()} onSelect={onSelect} childrenPage={childrenPage()} />);

    fireEvent.click(screen.getByRole("button", { name: /beta\.txt/ }));

    expect(onSelect).toHaveBeenCalledWith(11);
  });

  it("pagination stays bounded: Page suivante/précédente are ordinary, keyboard-operable buttons wired to their own callbacks", () => {
    const onNext = vi.fn();
    const onPrevious = vi.fn();
    render(
      <DetailsPanel
        {...baseProps()}
        childrenPage={childrenPage({ nextCursor: "ftc1.idx.1.1.10" })}
        hasPreviousChildrenPage
        onNextChildrenPage={onNext}
        onPreviousChildrenPage={onPrevious}
      />,
    );

    const next = screen.getByTestId("children-next");
    const previous = screen.getByTestId("children-previous");
    expect(next.tagName).toBe("BUTTON");
    expect(previous.tagName).toBe("BUTTON");
    expect(next).not.toBeDisabled();
    expect(previous).not.toBeDisabled();

    fireEvent.click(next);
    fireEvent.click(previous);
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrevious).toHaveBeenCalledTimes(1);
  });

  it("disables Page précédente on the first page of a multi-page result", () => {
    render(
      <DetailsPanel
        {...baseProps()}
        childrenPage={childrenPage({ total: 100, nextCursor: "ftc1.idx.1.1.10" })}
        hasPreviousChildrenPage={false}
      />,
    );
    expect(screen.getByTestId("children-previous")).toBeDisabled();
    expect(screen.getByTestId("children-next")).not.toBeDisabled();
  });

  it("disables Page suivante on the last page of a multi-page result", () => {
    render(
      <DetailsPanel
        {...baseProps()}
        childrenPage={childrenPage({ total: 100, nextCursor: null })}
        hasPreviousChildrenPage
      />,
    );
    expect(screen.getByTestId("children-next")).toBeDisabled();
    expect(screen.getByTestId("children-previous")).not.toBeDisabled();
  });

  it("shows no pagination controls at all when everything fits on one page", () => {
    render(
      <DetailsPanel
        {...baseProps()}
        childrenPage={childrenPage({ total: 2, nextCursor: null })}
        hasPreviousChildrenPage={false}
      />,
    );
    expect(screen.queryByTestId("children-next")).toBeNull();
    expect(screen.queryByTestId("children-previous")).toBeNull();
  });

  it("never renders an absolute-path-shaped string for a child", () => {
    render(
      <DetailsPanel
        {...baseProps()}
        childrenPage={childrenPage({
          items: [
            { brainId: "brain-alpha", nodeId: 12, name: "dossier", relativePath: "a/dossier", kind: "directory" },
          ],
          total: 1,
        })}
      />,
    );
    const list = screen.getByTestId("children-list");
    expect(list.textContent).not.toMatch(/[A-Za-z]:\\|\/home\/|\\\\/);
  });
});
