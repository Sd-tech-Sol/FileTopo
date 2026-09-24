import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ChangeJournalPanel from "./ChangeJournalPanel";
import type { ChangeEvent, ChangeJournalPage, ChangeNature } from "./types";

/**
 * `TASK-0038` E — the seen/unseen state in the « Changements » panel.
 * The read/paging/filter behaviour of the panel is `ChangeJournalPanel.test.tsx`.
 */

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
    seen: false,
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

/** Routes `invoke` by command, like the backend would: reads and acknowledgements. */
function backend(handlers: Record<string, (args: Record<string, unknown>) => unknown>) {
  invokeMock.mockImplementation((command: string, args: Record<string, unknown>) => {
    const handler = handlers[command];
    if (!handler) return Promise.reject(`unexpected command ${command}`);
    try {
      return Promise.resolve(handler(args));
    } catch (error) {
      return Promise.reject(error);
    }
  });
}

const MARK_COMMANDS = ["map_change_mark_seen", "map_change_mark_all_seen", "map_node_mark_seen"];

function markCalls() {
  return invokeMock.mock.calls.filter(([command]) => MARK_COMMANDS.includes(String(command)));
}

async function openPanel() {
  fireEvent.click(screen.getByTestId("journal-toggle"));
  await waitFor(() => expect(screen.queryByTestId("journal-total")).not.toBeNull());
}

beforeEach(() => {
  invokeMock.mockReset();
});
afterEach(cleanup);

describe("TASK-0038 E — Vu / Non vu on each change", () => {
  it("shows Vu / Non vu as a word (not only a colour) and offers « Marquer vu » only for an unseen change", async () => {
    invokeMock.mockResolvedValue(
      page([event(2, "CREATED", { seen: false }), event(1, "MODIFIED", { seen: true })]),
    );
    render(<ChangeJournalPanel brainId={BRAIN} revision={3} onSelect={vi.fn()} />);
    await openPanel();

    const [unseen, seen] = screen.getAllByTestId("journal-event");
    expect(unseen.getAttribute("data-seen")).toBe("false");
    expect(within(unseen).getByTestId("journal-seen-badge").textContent).toMatch(/Non vu/);
    expect(within(unseen).getByTestId("journal-mark-seen").textContent).toBe("Marquer vu");
    expect(seen.getAttribute("data-seen")).toBe("true");
    expect(within(seen).getByTestId("journal-seen-badge").textContent).toMatch(/Vu/);
    expect(within(seen).getByTestId("journal-seen-badge").textContent).not.toMatch(/Non vu/);
    expect(within(seen).queryByTestId("journal-mark-seen")).toBeNull();
    expect(screen.getByTestId("journal-unseen-total").textContent).toMatch(
      /1 changement\(s\) non vu\(s\)/,
    );
  });

  it("marks one change seen through the named brain and the event id, then re-reads the page from the backend", async () => {
    let seen = false;
    backend({
      map_change_journal: () => page([event(7, "CREATED", { seen })]),
      map_change_mark_seen: (args) => {
        seen = true;
        return { brainId: args.brainId, eventId: args.eventId, alreadySeen: false };
      },
    });
    const onSeenChange = vi.fn();
    render(
      <ChangeJournalPanel brainId={BRAIN} revision={3} onSelect={vi.fn()} onSeenChange={onSeenChange} />,
    );
    await openPanel();

    fireEvent.click(screen.getByTestId("journal-mark-seen"));
    await waitFor(() =>
      expect(screen.getByTestId("journal-event").getAttribute("data-seen")).toBe("true"),
    );
    expect(invokeMock).toHaveBeenCalledWith("map_change_mark_seen", { brainId: BRAIN, eventId: 7 });
    expect(markCalls()).toHaveLength(1);
    expect(onSeenChange).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("journal-mark-seen")).toBeNull();
    expect(screen.getByTestId("journal-unseen-total").textContent).toMatch(
      /Tous les changements sont vus/,
    );
  });

  it("never marks anything by being opened, filtered, paged, refreshed or by selecting an element", async () => {
    backend({
      map_change_journal: (args) =>
        page([event(3, "CREATED", { seen: false })], {
          total: 3,
          nextCursor: args.after === null ? "fjc1.index-a.3" : null,
        }),
    });
    const { rerender } = render(
      <ChangeJournalPanel brainId={BRAIN} revision={3} onSelect={vi.fn()} />,
    );
    await openPanel();
    fireEvent.click(screen.getByTestId("journal-filter-CREATED"));
    await waitFor(() =>
      expect(invokeMock).toHaveBeenLastCalledWith(
        "map_change_journal",
        expect.objectContaining({ natures: ["CREATED"] }),
      ),
    );
    fireEvent.click(screen.getByTestId("journal-next"));
    await waitFor(() =>
      expect(invokeMock).toHaveBeenLastCalledWith(
        "map_change_journal",
        expect.objectContaining({ after: "fjc1.index-a.3" }),
      ),
    );
    rerender(<ChangeJournalPanel brainId={BRAIN} revision={4} onSelect={vi.fn()} />);
    await waitFor(() =>
      expect(invokeMock).toHaveBeenLastCalledWith(
        "map_change_journal",
        expect.objectContaining({ after: null }),
      ),
    );
    fireEvent.click(screen.getByTestId("journal-select"));

    expect(markCalls()).toHaveLength(0);
  });
});

describe("TASK-0038 E — « Tout marquer vu » is confirmed inline", () => {
  it("the first click only opens the confirmation; nothing is mutated", async () => {
    backend({
      map_change_journal: () =>
        page([event(2, "CREATED", { seen: false }), event(1, "MODIFIED", { seen: false })]),
    });
    render(<ChangeJournalPanel brainId={BRAIN} revision={3} onSelect={vi.fn()} />);
    await openPanel();
    expect(screen.queryByTestId("journal-mark-all-confirm")).toBeNull();

    fireEvent.click(screen.getByTestId("journal-mark-all"));
    expect(markCalls()).toHaveLength(0);
    const confirm = screen.getByTestId("journal-mark-all-confirm");
    expect(confirm.textContent).toMatch(/2 changement\(s\) non vu\(s\)/);
    expect(confirm.textContent).toMatch(/resteront non vus/);
    expect(screen.queryByTestId("journal-mark-all")).toBeNull();
  });

  it("« Annuler » closes the confirmation and never calls a mutating command", async () => {
    backend({ map_change_journal: () => page([event(1, "CREATED", { seen: false })]) });
    render(<ChangeJournalPanel brainId={BRAIN} revision={3} onSelect={vi.fn()} />);
    await openPanel();

    fireEvent.click(screen.getByTestId("journal-mark-all"));
    fireEvent.click(screen.getByTestId("journal-mark-all-cancel"));
    expect(screen.queryByTestId("journal-mark-all-confirm")).toBeNull();
    expect(screen.getByTestId("journal-mark-all")).not.toBeNull();
    expect(markCalls()).toHaveLength(0);
    expect(screen.getByTestId("journal-event").getAttribute("data-seen")).toBe("false");
  });

  it("confirming marks everything through the brain id alone, then re-reads and disables the button", async () => {
    let allSeen = false;
    backend({
      map_change_journal: () =>
        page([event(2, "CREATED", { seen: allSeen }), event(1, "MODIFIED", { seen: allSeen })]),
      map_change_mark_all_seen: (args) => {
        allSeen = true;
        return { brainId: args.brainId, seenThroughEventId: 2, newlySeenCount: 2 };
      },
    });
    const onSeenChange = vi.fn();
    render(
      <ChangeJournalPanel brainId={BRAIN} revision={3} onSelect={vi.fn()} onSeenChange={onSeenChange} />,
    );
    await openPanel();

    fireEvent.click(screen.getByTestId("journal-mark-all"));
    fireEvent.click(screen.getByTestId("journal-mark-all-confirm-yes"));
    await waitFor(() =>
      expect(screen.getByTestId("journal-unseen-total").getAttribute("data-unseen-total")).toBe("0"),
    );
    expect(markCalls()).toEqual([["map_change_mark_all_seen", { brainId: BRAIN }]]);
    expect(screen.queryByTestId("journal-mark-all-confirm")).toBeNull();
    expect((screen.getByTestId("journal-mark-all") as HTMLButtonElement).disabled).toBe(true);
    expect(
      screen.getAllByTestId("journal-event").every((e) => e.getAttribute("data-seen") === "true"),
    ).toBe(true);
    expect(onSeenChange).toHaveBeenCalledTimes(1);
  });

  it("shows the whole-journal unseen count whatever the nature filter says", async () => {
    invokeMock.mockResolvedValue(
      page([event(1, "CREATED", { seen: true })], { total: 1, unseenTotal: 4 }),
    );
    render(<ChangeJournalPanel brainId={BRAIN} revision={3} onSelect={vi.fn()} />);
    await openPanel();
    expect(screen.getByTestId("journal-unseen-total").getAttribute("data-unseen-total")).toBe("4");
    expect((screen.getByTestId("journal-mark-all") as HTMLButtonElement).disabled).toBe(false);
  });
});

describe("TASK-0038 E — brains stay apart, refusals are shown", () => {
  it("refuses an acknowledgement answered for another brain and does not pretend it worked", async () => {
    backend({
      map_change_journal: () => page([event(7, "CREATED", { seen: false })]),
      map_change_mark_seen: (args) => ({
        brainId: "brain-intrus",
        eventId: args.eventId,
        alreadySeen: false,
      }),
    });
    const onSeenChange = vi.fn();
    render(
      <ChangeJournalPanel brainId={BRAIN} revision={3} onSelect={vi.fn()} onSeenChange={onSeenChange} />,
    );
    await openPanel();
    fireEvent.click(screen.getByTestId("journal-mark-seen"));
    await waitFor(() =>
      expect(screen.getByTestId("journal-mark-error").textContent).toMatch(/autre cerveau refusée/),
    );
    expect(onSeenChange).not.toHaveBeenCalled();
    expect(screen.getByTestId("journal-event").getAttribute("data-seen")).toBe("false");
  });

  it("shows a backend refusal of a mark and keeps the change unseen", async () => {
    backend({
      map_change_journal: () => page([event(7, "CREATED", { seen: false })]),
      map_change_mark_seen: () => {
        throw "journal_event_missing: 7";
      },
    });
    render(<ChangeJournalPanel brainId={BRAIN} revision={3} onSelect={vi.fn()} />);
    await openPanel();
    fireEvent.click(screen.getByTestId("journal-mark-seen"));
    await waitFor(() =>
      expect(screen.getByTestId("journal-mark-error").textContent).toMatch(/journal_event_missing/),
    );
    expect(screen.getByTestId("journal-event").getAttribute("data-seen")).toBe("false");
  });

  it("drops a pending confirmation when the brain changes and shares nothing across brains", async () => {
    backend({ map_change_journal: () => page([event(1, "CREATED", { seen: false })]) });
    const { rerender } = render(
      <ChangeJournalPanel brainId={BRAIN} revision={3} onSelect={vi.fn()} />,
    );
    await openPanel();
    fireEvent.click(screen.getByTestId("journal-mark-all"));
    expect(screen.queryByTestId("journal-mark-all-confirm")).not.toBeNull();

    backend({
      map_change_journal: (args) =>
        page([event(1, "CREATED", { brainId: String(args.brainId), seen: false })], {
          brainId: String(args.brainId),
        }),
    });
    rerender(<ChangeJournalPanel brainId="brain-beta" revision={1} onSelect={vi.fn()} />);
    await waitFor(() => expect(screen.queryByTestId("journal-mark-all")).not.toBeNull());
    expect(screen.queryByTestId("journal-mark-all-confirm")).toBeNull();
    expect(markCalls()).toHaveLength(0);
  });

  it("re-reads the page when another surface acknowledged something (seenRevision moved)", async () => {
    backend({ map_change_journal: () => page([event(1, "CREATED", { seen: false })]) });
    const { rerender } = render(
      <ChangeJournalPanel brainId={BRAIN} revision={3} seenRevision={0} onSelect={vi.fn()} />,
    );
    await openPanel();
    backend({ map_change_journal: () => page([event(1, "CREATED", { seen: true })]) });
    rerender(<ChangeJournalPanel brainId={BRAIN} revision={3} seenRevision={1} onSelect={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getByTestId("journal-event").getAttribute("data-seen")).toBe("true"),
    );
    expect(markCalls()).toHaveLength(0);
  });
});
