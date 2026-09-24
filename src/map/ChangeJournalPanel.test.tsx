import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ChangeJournalPanel, { describeChangeSummary } from "./ChangeJournalPanel";
import panelSource from "./ChangeJournalPanel.tsx?raw";
import appSource from "./MapApp.tsx?raw";
import type { ChangeEvent, ChangeJournalPage, ChangeNature } from "./types";

const invokeMock = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

const BRAIN = "brain-alpha";

function event(eventId: number, nature: ChangeNature, overrides: Partial<ChangeEvent> = {}): ChangeEvent {
  return {
    brainId: BRAIN,
    eventId,
    detectedRevision: 3,
    ordinal: 0,
    nature,
    nodeId: 100 + eventId,
    nodeKind: "file",
    oldName: null,
    newName: null,
    oldRelativePath: null,
    newRelativePath: `dossier/fichier-${eventId}.txt`,
    oldParentId: null,
    newParentId: null,
    detectedUnixMs: 1_700_000_000_000,
    nodePresent: true,
    // Already seen unless a test says otherwise: the TASK-0037 assertions do not
    // depend on the seen state, and a seen change offers no mutation.
    seen: true,
    ...overrides,
  };
}

function page(items: ChangeEvent[], overrides: Partial<ChangeJournalPage> = {}): ChangeJournalPage {
  return {
    brainId: BRAIN,
    indexId: "index-a",
    indexRevision: 3,
    natures: [],
    total: items.length,
    unseenTotal: items.filter((item) => !item.seen).length,
    items,
    nextCursor: null,
    limit: 50,
    ...overrides,
  };
}

async function openPanel() {
  fireEvent.click(screen.getByTestId("journal-toggle"));
  await waitFor(() => expect(screen.queryByTestId("journal-total")).not.toBeNull());
}

beforeEach(() => {
  invokeMock.mockReset();
});
afterEach(cleanup);

describe("TASK-0037 F — the Changements panel", () => {
  it("reads nothing until it is opened, then asks the named brain for a bounded first page", async () => {
    invokeMock.mockResolvedValue(page([event(1, "CREATED")]));
    render(<ChangeJournalPanel brainId={BRAIN} revision={3} onSelect={vi.fn()} />);
    expect(invokeMock).not.toHaveBeenCalled();

    await openPanel();
    expect(invokeMock).toHaveBeenCalledWith("map_change_journal", {
      brainId: BRAIN,
      natures: [],
      after: null,
      limit: 50,
    });
    expect(screen.getByTestId("journal-total").getAttribute("data-total")).toBe("1");
  });

  it("states the two honesty limits: detection date, and no real chronology", () => {
    render(<ChangeJournalPanel brainId={BRAIN} revision={3} onSelect={vi.fn()} />);
    const boundary = screen.getByTestId("journal-boundary").textContent ?? "";
    expect(boundary).toMatch(/détection par FileTopo/);
    expect(boundary).toMatch(/pas celle de la modification sur le disque/);
    expect(boundary).toMatch(/pas la chronologie réelle/);
  });

  it("offers five visible, combinable and revocable nature filters and sends them to the backend", async () => {
    invokeMock.mockResolvedValue(page([event(1, "CREATED")]));
    render(<ChangeJournalPanel brainId={BRAIN} revision={3} onSelect={vi.fn()} />);
    await openPanel();

    for (const nature of ["CREATED", "MODIFIED", "RENAMED", "MOVED", "DELETED"]) {
      expect(screen.getByTestId(`journal-filter-${nature}`)).not.toBeNull();
    }
    expect(screen.queryByTestId("journal-clear-filters")).toBeNull();

    invokeMock.mockClear();
    fireEvent.click(screen.getByTestId("journal-filter-CREATED"));
    fireEvent.click(screen.getByTestId("journal-filter-DELETED"));
    await waitFor(() =>
      expect(invokeMock).toHaveBeenLastCalledWith("map_change_journal", {
        brainId: BRAIN,
        natures: ["CREATED", "DELETED"],
        after: null,
        limit: 50,
      }),
    );

    // Revocable one by one, and all at once.
    fireEvent.click(screen.getByTestId("journal-filter-CREATED"));
    await waitFor(() =>
      expect(invokeMock).toHaveBeenLastCalledWith(
        "map_change_journal",
        expect.objectContaining({ natures: ["DELETED"] }),
      ),
    );
    fireEvent.click(screen.getByTestId("journal-clear-filters"));
    await waitFor(() =>
      expect(invokeMock).toHaveBeenLastCalledWith(
        "map_change_journal",
        expect.objectContaining({ natures: [] }),
      ),
    );
    expect(screen.queryByTestId("journal-clear-filters")).toBeNull();
  });

  it("walks pages with the cursor and back, restarting a filter from the newest page", async () => {
    invokeMock.mockImplementation((_command: string, args: { after: string | null }) =>
      Promise.resolve(
        args.after === null
          ? page([event(3, "CREATED")], { total: 3, nextCursor: "fjc1.index-a.3" })
          : args.after === "fjc1.index-a.3"
            ? page([event(2, "CREATED")], { total: 3, nextCursor: "fjc1.index-a.2" })
            : page([event(1, "CREATED")], { total: 3 }),
      ),
    );
    render(<ChangeJournalPanel brainId={BRAIN} revision={3} onSelect={vi.fn()} />);
    await openPanel();

    const prev = screen.getByTestId("journal-prev") as HTMLButtonElement;
    const next = screen.getByTestId("journal-next") as HTMLButtonElement;
    expect(prev.disabled).toBe(true);
    expect(next.disabled).toBe(false);

    fireEvent.click(next);
    await waitFor(() => expect(screen.getByTestId("journal-event").getAttribute("data-event-id")).toBe("2"));
    fireEvent.click(screen.getByTestId("journal-next"));
    await waitFor(() => expect(screen.getByTestId("journal-event").getAttribute("data-event-id")).toBe("1"));
    expect((screen.getByTestId("journal-next") as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId("journal-total").textContent).toMatch(/page 3/);

    fireEvent.click(screen.getByTestId("journal-prev"));
    await waitFor(() => expect(screen.getByTestId("journal-event").getAttribute("data-event-id")).toBe("2"));

    // A filter change goes back to the newest page: the old cursor is not reused.
    invokeMock.mockClear();
    fireEvent.click(screen.getByTestId("journal-filter-MOVED"));
    await waitFor(() =>
      expect(invokeMock).toHaveBeenLastCalledWith(
        "map_change_journal",
        expect.objectContaining({ after: null, natures: ["MOVED"] }),
      ),
    );
  });

  it("offers a selection only for a node that still exists and never for a deleted one", async () => {
    const onSelect = vi.fn();
    invokeMock.mockResolvedValue(
      page([
        event(4, "MODIFIED"),
        event(3, "DELETED", { nodePresent: false, newRelativePath: null, oldRelativePath: "vieux/parti.txt" }),
        event(2, "CREATED", { nodePresent: false }),
        event(1, "MOVED", {
          nodeId: 7,
          oldRelativePath: "a/f.txt",
          newRelativePath: "b/f.txt",
          oldParentId: 2,
          newParentId: 3,
        }),
      ]),
    );
    render(<ChangeJournalPanel brainId={BRAIN} revision={3} onSelect={onSelect} />);
    await openPanel();

    const events = screen.getAllByTestId("journal-event");
    expect(events).toHaveLength(4);
    // Present nodes: one « Afficher » button each (MODIFIED, MOVED).
    expect(screen.getAllByTestId("journal-select")).toHaveLength(2);
    // A DELETED event — and a CREATED one whose node was deleted since — are
    // history only.
    const deleted = events.find((e) => e.getAttribute("data-nature") === "DELETED")!;
    expect(within(deleted).queryByTestId("journal-select")).toBeNull();
    expect(within(deleted).getByTestId("journal-gone").textContent).toMatch(/historique seulement/);
    expect(deleted.textContent).toContain("vieux/parti.txt");
    const goneCreated = events.find((e) => e.getAttribute("data-event-id") === "2")!;
    expect(within(goneCreated).queryByTestId("journal-select")).toBeNull();

    const moved = events.find((e) => e.getAttribute("data-nature") === "MOVED")!;
    expect(moved.textContent).toContain("a/f.txt → b/f.txt");
    fireEvent.click(within(moved).getByTestId("journal-select"));
    expect(onSelect).toHaveBeenCalledWith({ brainId: BRAIN, nodeId: 7 });
  });

  it("groups events by detection and never shows an absolute path", async () => {
    invokeMock.mockResolvedValue(
      page([
        event(3, "CREATED", { detectedRevision: 5 }),
        event(2, "CREATED", { detectedRevision: 4 }),
        event(1, "CREATED", { detectedRevision: 4 }),
      ]),
    );
    render(<ChangeJournalPanel brainId={BRAIN} revision={5} onSelect={vi.fn()} />);
    await openPanel();
    const groups = screen.getAllByTestId("journal-group");
    expect(groups.map((g) => g.getAttribute("data-revision"))).toEqual(["5", "4"]);
    expect(within(groups[1]).getAllByTestId("journal-event")).toHaveLength(2);
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/[A-Za-z]:\\|\\\\/);
    expect(text).toMatch(/Détecté à la révision 5/);
  });

  it("says why an empty journal is empty, and distinguishes a filter with no match", async () => {
    invokeMock.mockResolvedValue(page([]));
    render(<ChangeJournalPanel brainId={BRAIN} revision={1} onSelect={vi.fn()} />);
    await openPanel();
    expect(screen.getByTestId("journal-empty").textContent).toMatch(/établit la référence/);

    fireEvent.click(screen.getByTestId("journal-filter-MOVED"));
    await waitFor(() =>
      expect(screen.getByTestId("journal-empty").textContent).toMatch(/pour ces filtres/),
    );
  });

  it("reloads from the newest page when the index revision moves, keeping the filters", async () => {
    invokeMock.mockResolvedValue(page([event(1, "CREATED")], { nextCursor: "fjc1.index-a.1", total: 2 }));
    const { rerender } = render(<ChangeJournalPanel brainId={BRAIN} revision={3} onSelect={vi.fn()} />);
    await openPanel();
    fireEvent.click(screen.getByTestId("journal-filter-CREATED"));
    await waitFor(() => expect(invokeMock).toHaveBeenLastCalledWith("map_change_journal", expect.objectContaining({ natures: ["CREATED"] })));
    fireEvent.click(screen.getByTestId("journal-next"));
    await waitFor(() =>
      expect(invokeMock).toHaveBeenLastCalledWith(
        "map_change_journal",
        expect.objectContaining({ after: "fjc1.index-a.1" }),
      ),
    );

    invokeMock.mockClear();
    rerender(<ChangeJournalPanel brainId={BRAIN} revision={4} onSelect={vi.fn()} />);
    await waitFor(() =>
      expect(invokeMock).toHaveBeenLastCalledWith("map_change_journal", {
        brainId: BRAIN,
        natures: ["CREATED"],
        after: null,
        limit: 50,
      }),
    );
  });

  it("carries nothing over to another brain and refuses a page that names a different one", async () => {
    invokeMock.mockResolvedValue(page([event(1, "CREATED")]));
    const { rerender } = render(<ChangeJournalPanel brainId={BRAIN} revision={3} onSelect={vi.fn()} />);
    await openPanel();
    fireEvent.click(screen.getByTestId("journal-filter-CREATED"));
    await waitFor(() => expect(invokeMock).toHaveBeenLastCalledWith("map_change_journal", expect.objectContaining({ natures: ["CREATED"] })));

    invokeMock.mockClear();
    invokeMock.mockResolvedValue(page([event(1, "CREATED")], { brainId: "brain-intrus" }));
    rerender(<ChangeJournalPanel brainId="brain-beta" revision={1} onSelect={vi.fn()} />);
    await waitFor(() => expect(screen.queryByTestId("journal-error")).not.toBeNull());
    expect(invokeMock).toHaveBeenLastCalledWith("map_change_journal", {
      brainId: "brain-beta",
      natures: [],
      after: null,
      limit: 50,
    });
    expect((screen.getByTestId("journal-filter-CREATED") as HTMLInputElement).checked).toBe(false);
    expect(screen.queryAllByTestId("journal-event")).toHaveLength(0);
  });

  it("shows a backend refusal without pretending the journal is empty", async () => {
    invokeMock.mockRejectedValue("journal_cursor_foreign: the cursor belongs to another index");
    render(<ChangeJournalPanel brainId={BRAIN} revision={3} onSelect={vi.fn()} />);
    fireEvent.click(screen.getByTestId("journal-toggle"));
    await waitFor(() => expect(screen.getByTestId("journal-error").textContent).toMatch(/journal_cursor_foreign/));
    expect(screen.queryByTestId("journal-empty")).toBeNull();
  });
});

describe("TASK-0037 — report counters and wiring", () => {
  it("describes an established baseline, a quiet refresh and exact counters", () => {
    const base = { created: 0, modified: 0, renamed: 0, moved: 0, deleted: 0, total: 0 };
    expect(describeChangeSummary({ ...base, baselineEstablished: true })).toMatch(/Référence établie/);
    expect(describeChangeSummary({ ...base, baselineEstablished: false })).toBe("Aucun changement détecté.");
    expect(
      describeChangeSummary({ ...base, baselineEstablished: false, created: 1, renamed: 2, total: 3 }),
    ).toBe(
      "3 changement(s) détecté(s) : 1 créé(s) · 0 modifié(s) · 2 renommé(s) · 0 déplacé(s) · 0 supprimé(s)",
    );
  });

  it("wires the panel and the counters into the app, and only through a brain id and a node reference", () => {
    expect(appSource).toContain("<ChangeJournalPanel");
    expect(appSource).toContain('data-testid="change-summary"');
    // The panel names the brain and the node; it has no path to send or show.
    // TASK-0038: the read, and the two acknowledgement gestures that belong to
    // the journal itself (« Marquer vu » and « Tout marquer vu »). The per-element
    // mark lives in NodeChangeState.
    const calls = panelSource.match(/invoke<[^>]+>\("[a-z_]+"/g) ?? [];
    expect(calls).toEqual([
      'invoke<ChangeJournalPage>("map_change_journal"',
      'invoke<MarkChangeSeenResult>("map_change_mark_seen"',
      'invoke<MarkAllSeenResult>("map_change_mark_all_seen"',
    ]);
    expect(panelSource).not.toMatch(/absolutePath|stableKey|fileId|volumeSerial|localPath/i);
  });
});
