import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ReviewQueuePanel from "./ReviewQueuePanel";
import type { RelationEndpoint, SuggestionEdge, SuggestionReviewQueue } from "./types";

/**
 * `TASK-0025` / `SR4` to `SR8` — the review queue, at the level of the panel.
 *
 * These tests hold what the interface is allowed to do on its own, which is
 * almost nothing: it renders what the backend returned, it calls one command
 * per decision, and for « Plus tard » it calls none. Everything about what a
 * decision *means* is proved in Rust; what is proved here is that the panel
 * cannot quietly invent a count, a state or a fourth action.
 */

// Vitest globals are off in this project, so Testing Library's automatic
// cleanup never registers on its own.
afterEach(cleanup);

function endpoint(name: string): RelationEndpoint {
  return {
    key: `ek1|brain-alpha|dossier/${name}`,
    nodeId: 7,
    name,
    relativePath: `dossier/${name}`,
  };
}

function item(suggestionKey: string, overrides: Partial<SuggestionEdge> = {}): SuggestionEdge {
  return {
    suggestionKey,
    relationType: "revision",
    source: endpoint("rapport-4.pdf"),
    target: endpoint("rapport-5.pdf"),
    state: "pending",
    basis: "dre-v1",
    producer: "core-rule-engine",
    ruleName: "core.numbered-sibling-revision-candidate",
    ruleVersion: "v1",
    explanationFr: "Même dossier, même extension, numéro final consécutif.",
    explanationEn: "Same folder, same extension, consecutive trailing number.",
    signals: { "same-parent": true, "same-extension": true },
    decidedUnixMs: null,
    decisionReconsiderCause: null,
    ...overrides,
  };
}

function queue(items: SuggestionEdge[], overrides: Partial<SuggestionReviewQueue> = {}): SuggestionReviewQueue {
  return {
    brainId: "brain-alpha",
    fixtureId: "quasi-empty",
    totalPending: items.length,
    offset: 0,
    limit: 100,
    maxLimit: 100,
    returned: items.length,
    hasMore: false,
    order: "suggestion_key ascending",
    items,
    unresolvedEndpoints: [],
    engineCurrent: true,
    ...overrides,
  };
}

interface HarnessProps {
  initial: SuggestionReviewQueue;
  onConfirm?: (key: string) => void;
  onReject?: (key: string) => void;
}

/**
 * The panel with the cursor its caller owns, and nothing else.
 *
 * The queue itself is **not** mutated by the harness on a decision: in the
 * product it is re-read from the backend, and a harness that edited it locally
 * would let the panel pass a test the product would fail.
 */
function Harness({ initial, onConfirm, onReject }: HarnessProps) {
  const [cursor, setCursor] = useState(0);
  return (
    <ReviewQueuePanel
      queue={initial}
      loading={false}
      cursor={cursor}
      open
      onToggle={() => undefined}
      onConfirm={onConfirm ?? (() => undefined)}
      onReject={onReject ?? (() => undefined)}
      onLater={() => setCursor((current) => current + 1)}
      deciding={null}
    />
  );
}

describe("SR4 — the entry and the count come from the backend", () => {
  it("names the pending total the backend published, and only the pending one", () => {
    render(
      <ReviewQueuePanel
        queue={queue([item("dre1:aaa"), item("dre1:bbb")], { totalPending: 5, hasMore: true })}
        loading={false}
        cursor={0}
        open={false}
        onToggle={() => undefined}
        onConfirm={() => undefined}
        onReject={() => undefined}
        onLater={() => undefined}
        deciding={null}
      />,
    );
    const entry = screen.getByTestId("open-review-queue");
    expect(entry.textContent).toContain("5 relation(s) à confirmer");
    // Published as data too, so a real-host scenario can read the count it
    // measured rather than parse a sentence.
    expect(entry.dataset.totalPending).toBe("5");
    // Closed: the queue itself is not rendered until it is opened.
    expect(screen.queryByTestId("review-confirm")).toBeNull();
  });

  it("says how many are on this page and that more follow", () => {
    render(<Harness initial={queue([item("dre1:aaa")], { totalPending: 3, hasMore: true })} />);
    const position = screen.getByTestId("review-position");
    expect(position.textContent).toContain("Suggestion 1 sur 1");
    expect(position.textContent).toContain("3 en attente au total");
    expect(position.textContent).toContain("D'autres suivent");
  });

  it("reports an empty queue as empty rather than as a missing panel", () => {
    render(<Harness initial={queue([], { totalPending: 0 })} />);
    expect(screen.getByTestId("review-empty")).toBeTruthy();
    expect(screen.queryByTestId("review-confirm")).toBeNull();
  });
});

describe("SR5 — every item is explainable where it is decided", () => {
  it("shows source, target, type, producer, rule, key, why and signals", () => {
    render(<Harness initial={queue([item("dre1:aaa")])} />);
    expect(screen.getByTestId("review-source").textContent).toBe("rapport-4.pdf");
    expect(screen.getByTestId("review-target").textContent).toBe("rapport-5.pdf");
    expect(screen.getByTestId("review-type").textContent).toBeTruthy();
    expect(screen.getByTestId("review-producer").textContent).toBe("core-rule-engine");
    expect(screen.getByTestId("review-rule").textContent).toContain(
      "core.numbered-sibling-revision-candidate",
    );
    expect(screen.getByTestId("review-rule").textContent).toContain("v1");
    expect(screen.getByTestId("review-key").textContent).toBe("dre1:aaa");
    expect(screen.getByTestId("review-why").textContent).toContain("numéro final consécutif");
    expect(screen.getByTestId("review-why-en").textContent).toContain("consecutive trailing");
    const signals = screen.getByTestId("review-signals");
    expect(signals.textContent).toContain("same-parent");
    expect(signals.textContent).toContain("same-extension");
  });

  it("falls back to the synthetic basis when a suggestion carries no rule", () => {
    render(
      <Harness
        initial={queue([
          item("S-005", {
            producer: "legacy-fixture",
            ruleName: null,
            ruleVersion: null,
            explanationFr: null,
            explanationEn: null,
            signals: null,
            basis: "fixture-synthetique-task-0017",
          }),
        ])}
      />,
    );
    expect(screen.queryByTestId("review-rule")).toBeNull();
    expect(screen.getByTestId("review-why").textContent).toContain(
      "fixture-synthetique-task-0017",
    );
    expect(screen.queryByTestId("review-signals")).toBeNull();
  });

  it("carries no file content, only names, paths and declared signals", () => {
    const { container } = render(<Harness initial={queue([item("dre1:aaa")])} />);
    // The panel renders what the DTO holds. The DTO has no content field, so
    // the assertion that matters is that the panel invented no other source of
    // text: everything visible traces back to an endpoint, a rule or a signal.
    expect(container.textContent).not.toContain("sha256");
    expect(container.textContent?.toLowerCase()).not.toContain("score");
  });
});

describe("SR6, SR7, SR8 — three actions, three different meanings", () => {
  it("offers exactly three actions, all of them native buttons", () => {
    const { container } = render(<Harness initial={queue([item("dre1:aaa")])} />);
    const actions = container.querySelector(".review__actions");
    const buttons = [...(actions?.querySelectorAll("button") ?? [])];
    expect(buttons).toHaveLength(3);
    for (const button of buttons) {
      expect(button.tagName).toBe("BUTTON");
      // Reachable by keyboard because of what it is, not because a handler was
      // bolted onto a div.
      expect(button.getAttribute("tabindex")).toBeNull();
      expect(button.getAttribute("type")).toBe("button");
    }
    expect(buttons.map((button) => button.textContent)).toStrictEqual([
      "Confirmer",
      "Rejeter",
      "Plus tard",
    ]);
  });

  it("Confirmer calls the approval once, with the key of the item on screen", () => {
    const onConfirm = vi.fn();
    render(<Harness initial={queue([item("dre1:aaa"), item("dre1:bbb")])} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByTestId("review-confirm"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith("dre1:aaa");
  });

  it("Rejeter calls the refusal once, and never the approval", () => {
    const onConfirm = vi.fn();
    const onReject = vi.fn();
    render(
      <Harness
        initial={queue([item("dre1:aaa")])}
        onConfirm={onConfirm}
        onReject={onReject}
      />,
    );
    fireEvent.click(screen.getByTestId("review-reject"));
    expect(onReject).toHaveBeenCalledTimes(1);
    expect(onReject).toHaveBeenCalledWith("dre1:aaa");
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("Plus tard mutates nothing and moves to the next item", () => {
    const onConfirm = vi.fn();
    const onReject = vi.fn();
    render(
      <Harness
        initial={queue([item("dre1:aaa"), item("dre1:bbb")])}
        onConfirm={onConfirm}
        onReject={onReject}
      />,
    );
    expect(screen.getByTestId("review-key").textContent).toBe("dre1:aaa");

    fireEvent.click(screen.getByTestId("review-later"));

    // No mutation of any kind was requested.
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onReject).not.toHaveBeenCalled();
    // The cursor moved, and the queue did not: the postponed item is still in
    // it, still pending, exactly as `DEC-0027` §B requires.
    expect(screen.getByTestId("review-key").textContent).toBe("dre1:bbb");
    expect(screen.getByTestId("review-position").textContent).toContain("Suggestion 2 sur 2");
    expect(screen.getByTestId("review-state").textContent).toBe("en attente de décision");
  });

  it("Plus tard on the last item comes back to the first, deciding nothing", () => {
    const onReject = vi.fn();
    render(<Harness initial={queue([item("dre1:aaa"), item("dre1:bbb")])} onReject={onReject} />);
    fireEvent.click(screen.getByTestId("review-later"));
    fireEvent.click(screen.getByTestId("review-later"));
    expect(screen.getByTestId("review-key").textContent).toBe("dre1:aaa");
    expect(onReject).not.toHaveBeenCalled();
  });

  it("a decision in flight disables the two mutating controls and not the third", () => {
    render(
      <ReviewQueuePanel
        queue={queue([item("dre1:aaa")])}
        loading={false}
        cursor={0}
        open
        onToggle={() => undefined}
        onConfirm={() => undefined}
        onReject={() => undefined}
        onLater={() => undefined}
        deciding="dre1:aaa"
      />,
    );
    expect((screen.getByTestId("review-confirm") as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTestId("review-reject") as HTMLButtonElement).disabled).toBe(true);
    // « Plus tard » starts no command, so nothing about it can be in flight.
    expect((screen.getByTestId("review-later") as HTMLButtonElement).disabled).toBe(false);
  });
});

describe("SR3 — no fourth state, and none on screen", () => {
  it("states the item as pending in words, not by colour", () => {
    const { container } = render(<Harness initial={queue([item("dre1:aaa")])} />);
    expect(screen.getByTestId("review-state").textContent).toBe("en attente de décision");
    expect(container.textContent?.toLowerCase()).not.toContain("deferred");
    expect(container.textContent?.toLowerCase()).not.toContain("différé");
    expect(container.textContent).toContain("la suggestion reste en attente");
  });

  it("says a suggestion is not a relation, where the decision is taken", () => {
    render(<Harness initial={queue([item("dre1:aaa")])} />);
    const boundary = screen.getByTestId("review-boundary");
    expect(boundary.textContent).toContain("n'est pas une relation");
    expect(boundary.textContent).toContain("Confirmer en crée une");
    expect(boundary.textContent).toContain("rejeter n'en crée aucune");
  });
});
