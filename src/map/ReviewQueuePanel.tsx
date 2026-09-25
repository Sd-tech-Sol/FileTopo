import type { ReactNode } from "react";
import type { Locale } from "../lib/locale";
import type { SuggestionEdge, SuggestionReviewQueue } from "./types";
import { explanationFor, relationTypeLabel } from "./relations";

/**
 * « Relations à confirmer » — the review queue of `F-044`, and the three acts
 * of `F-045`.
 *
 * A functional slice, deliberately: no new design system, no theme, no graph
 * work. What it adds is the ability to *finish* with a suggestion, which the
 * product could not do before — the only decision a user could record was
 * « yes », and « no » was indistinguishable from doing nothing.
 *
 * Three controls, and their meanings do not overlap:
 *
 * * **Confirmer** takes the approval path `TASK-0024` was verified on. One
 *   `APPROVED` relation, exactly once.
 * * **Rejeter** records a refusal. **No relation of any provenance is
 *   created**, no source is touched, and the decision survives a restart and
 *   an unchanged rerun of `dre-v1`.
 * * **Plus tard** decides nothing. It calls no mutation, persists nothing, and
 *   moves the local cursor to the next item — the suggestion stays `PENDING`
 *   and comes back when the queue is reloaded. There is no `DEFERRED` state to
 *   put it in, by `DEC-0027` §B.
 *
 * Both counts on screen — the entry and the queue's own total — come back from
 * the backend after every mutation. Nothing here increments or decrements a
 * number it was told.
 *
 * Accessibility, minimally but really: every control is a native `<button>`,
 * so it is in the keyboard order because of what it is; every state is
 * readable as text rather than as a colour; and the position in the queue is
 * announced in words.
 *
 * `TASK-0046` — the words follow the interface language; rule names, keys and
 * signals are wire values and are shown as they are.
 */

/** Everything this panel says, in one language. */
interface ReviewQueueStrings {
  title: string;
  toggle: (total: number) => string;
  loading: string;
  emptyQueue: string;
  emptyPage: string;
  position: (index: number, shown: number, total: number, hasMore: boolean) => string;
  proposedType: string;
  state: string;
  pending: string;
  producer: string;
  unknownProducer: string;
  rule: string;
  ruleValue: (name: string, version: string) => ReactNode;
  key: string;
  why: string;
  basis: string;
  boundary: ReactNode;
  confirm: string;
  reject: string;
  later: string;
  deciding: string;
  laterHint: ReactNode;
}

export const REVIEW_QUEUE_STRINGS: Record<Locale, ReviewQueueStrings> = {
  fr: {
    title: "Relations à confirmer",
    toggle: (total) => `${total} relation(s) à confirmer`,
    loading: "Lecture de la file…",
    emptyQueue: "Aucune suggestion en attente pour ce cerveau.",
    emptyPage: "Aucune suggestion sur cette page.",
    position: (index, shown, total, hasMore) =>
      `Suggestion ${index} sur ${shown} affichée(s), ${total} en attente au total.` +
      (hasMore ? " D'autres suivent après cette page." : ""),
    proposedType: "Type proposé",
    state: "État",
    pending: "en attente de décision",
    producer: "Producteur",
    unknownProducer: "inconnu",
    rule: "Règle",
    ruleValue: (name, version) => (
      <>
        <code>{name}</code> version <code>{version}</code>
      </>
    ),
    key: "Clé",
    why: "Pourquoi :",
    basis: "Origine synthétique :",
    boundary: (
      <>
        Une suggestion <strong>n'est pas une relation</strong>. Confirmer en crée une,
        approuvée explicitement; rejeter n'en crée aucune.
      </>
    ),
    confirm: "Confirmer",
    reject: "Rejeter",
    later: "Plus tard",
    deciding: "Décision…",
    laterHint: (
      <>
        <strong>Plus tard</strong> ne décide rien : la suggestion reste en attente et reviendra au
        prochain chargement de la file.
      </>
    ),
  },
  en: {
    title: "Relations to confirm",
    toggle: (total) => `${total} relation(s) to confirm`,
    loading: "Reading the queue…",
    emptyQueue: "No pending suggestion for this brain.",
    emptyPage: "No suggestion on this page.",
    position: (index, shown, total, hasMore) =>
      `Suggestion ${index} of ${shown} shown, ${total} pending in total.` +
      (hasMore ? " More follow after this page." : ""),
    proposedType: "Proposed type",
    state: "State",
    pending: "awaiting decision",
    producer: "Producer",
    unknownProducer: "unknown",
    rule: "Rule",
    ruleValue: (name, version) => (
      <>
        <code>{name}</code> version <code>{version}</code>
      </>
    ),
    key: "Key",
    why: "Why:",
    basis: "Synthetic origin:",
    boundary: (
      <>
        A suggestion <strong>is not a relation</strong>. Confirming creates one, explicitly
        approved; rejecting creates none.
      </>
    ),
    confirm: "Confirm",
    reject: "Reject",
    later: "Later",
    deciding: "Deciding…",
    laterHint: (
      <>
        <strong>Later</strong> decides nothing: the suggestion stays pending and comes back the
        next time the queue is loaded.
      </>
    ),
  },
};

interface ReviewQueuePanelProps {
  /** The interface language. Changing it reads nothing again. */
  locale: Locale;
  queue: SuggestionReviewQueue | null;
  loading: boolean;
  /** Index of the item on screen, held by the caller so « Plus tard » can move it. */
  cursor: number;
  open: boolean;
  onToggle: () => void;
  onConfirm: (suggestionKey: string) => void;
  onReject: (suggestionKey: string) => void;
  onLater: () => void;
  /** The key of the suggestion a mutation is in flight for, or `null`. */
  deciding: string | null;
}

function SuggestionDetail({ suggestion, locale }: { suggestion: SuggestionEdge; locale: Locale }) {
  const words = REVIEW_QUEUE_STRINGS[locale];
  const explanation = explanationFor(suggestion, locale);
  return (
    <div className="review__detail">
      <p className="review__endpoints">
        <span data-testid="review-source">{suggestion.source.name}</span>{" "}
        <span aria-hidden="true">⇢</span>{" "}
        <span data-testid="review-target">{suggestion.target.name}</span>
      </p>
      <dl className="review__facts">
        <div>
          <dt>{words.proposedType}</dt>
          <dd data-testid="review-type">{relationTypeLabel(suggestion.relationType, locale)}</dd>
        </div>
        <div>
          <dt>{words.state}</dt>
          {/* Spelled out, not encoded in a colour — the whole state of the
              item has to be legible as text. */}
          <dd data-testid="review-state">{words.pending}</dd>
        </div>
        <div>
          <dt>{words.producer}</dt>
          <dd data-testid="review-producer">{suggestion.producer ?? words.unknownProducer}</dd>
        </div>
        {suggestion.ruleName ? (
          <div>
            <dt>{words.rule}</dt>
            <dd data-testid="review-rule">
              {words.ruleValue(suggestion.ruleName, suggestion.ruleVersion ?? "")}
            </dd>
          </div>
        ) : null}
        <div>
          <dt>{words.key}</dt>
          <dd>
            <code data-testid="review-key">{suggestion.suggestionKey}</code>
          </dd>
        </div>
      </dl>
      {explanation ? (
        <p data-testid="review-why" lang={explanation.lang}>
          {words.why} {explanation.text}
        </p>
      ) : (
        <p data-testid="review-why">
          {words.basis} {suggestion.basis}
        </p>
      )}
      {suggestion.signals ? (
        <dl className="review__signals" data-testid="review-signals">
          {Object.entries(suggestion.signals).map(([name, value]) => (
            <div key={name}>
              <dt>{name}</dt>
              <dd>{String(value)}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <p className="review__boundary" data-testid="review-boundary">
        {words.boundary}
      </p>
    </div>
  );
}

export default function ReviewQueuePanel({
  locale,
  queue,
  loading,
  cursor,
  open,
  onToggle,
  onConfirm,
  onReject,
  onLater,
  deciding,
}: ReviewQueuePanelProps) {
  const words = REVIEW_QUEUE_STRINGS[locale];
  const total = queue?.totalPending ?? 0;
  // The cursor is the caller's, and « Plus tard » may have pushed it past the
  // page after the last item. Wrapping to the start is what makes the button
  // usable on a queue of one without pretending anything was decided.
  const items = queue?.items ?? [];
  const index = items.length === 0 ? 0 : cursor % items.length;
  const current = items[index] ?? null;
  const busy = current !== null && deciding === current.suggestionKey;

  return (
    <section className="review" aria-label={words.title}>
      <h2 className="review__title">{words.title}</h2>
      <button
        type="button"
        className="review__toggle"
        data-testid="open-review-queue"
        data-total-pending={total}
        aria-expanded={open}
        onClick={onToggle}
      >
        {words.toggle(total)}
      </button>

      {open ? (
        loading ? (
          <p className="details__empty">{words.loading}</p>
        ) : total === 0 ? (
          <p className="details__empty" data-testid="review-empty">
            {words.emptyQueue}
          </p>
        ) : current === null ? (
          <p className="details__empty" data-testid="review-empty">
            {words.emptyPage}
          </p>
        ) : (
          <div className="review__queue">
            <p className="review__position" data-testid="review-position">
              {words.position(index + 1, items.length, total, queue?.hasMore ?? false)}
            </p>
            <SuggestionDetail suggestion={current} locale={locale} />
            <div className="review__actions">
              <button
                type="button"
                className="review__confirm"
                data-testid="review-confirm"
                data-suggestion-key={current.suggestionKey}
                disabled={busy}
                onClick={() => onConfirm(current.suggestionKey)}
              >
                {busy ? words.deciding : words.confirm}
              </button>
              <button
                type="button"
                className="review__reject"
                data-testid="review-reject"
                data-suggestion-key={current.suggestionKey}
                disabled={busy}
                onClick={() => onReject(current.suggestionKey)}
              >
                {busy ? words.deciding : words.reject}
              </button>
              <button
                type="button"
                className="review__later"
                data-testid="review-later"
                data-suggestion-key={current.suggestionKey}
                // Never disabled by a mutation in flight: it starts none.
                onClick={onLater}
              >
                {words.later}
              </button>
            </div>
            <p className="review__hint">{words.laterHint}</p>
          </div>
        )
      ) : null}
    </section>
  );
}
