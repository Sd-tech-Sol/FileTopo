import type { SuggestionEdge, SuggestionReviewQueue } from "./types";
import { relationTypeLabel } from "./relations";

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
 */

interface ReviewQueuePanelProps {
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

function SuggestionDetail({ suggestion }: { suggestion: SuggestionEdge }) {
  return (
    <div className="review__detail">
      <p className="review__endpoints">
        <span data-testid="review-source">{suggestion.source.name}</span>{" "}
        <span aria-hidden="true">⇢</span>{" "}
        <span data-testid="review-target">{suggestion.target.name}</span>
      </p>
      <dl className="review__facts">
        <div>
          <dt>Type proposé</dt>
          <dd data-testid="review-type">{relationTypeLabel(suggestion.relationType)}</dd>
        </div>
        <div>
          <dt>État</dt>
          {/* Spelled out, not encoded in a colour — the whole state of the
              item has to be legible as text. */}
          <dd data-testid="review-state">en attente de décision</dd>
        </div>
        <div>
          <dt>Producteur</dt>
          <dd data-testid="review-producer">{suggestion.producer ?? "inconnu"}</dd>
        </div>
        {suggestion.ruleName ? (
          <div>
            <dt>Règle</dt>
            <dd data-testid="review-rule">
              <code>{suggestion.ruleName}</code> version <code>{suggestion.ruleVersion}</code>
            </dd>
          </div>
        ) : null}
        <div>
          <dt>Clé</dt>
          <dd>
            <code data-testid="review-key">{suggestion.suggestionKey}</code>
          </dd>
        </div>
      </dl>
      {suggestion.explanationFr ? (
        <p data-testid="review-why">Pourquoi : {suggestion.explanationFr}</p>
      ) : (
        <p data-testid="review-why">Origine synthétique : {suggestion.basis}</p>
      )}
      {suggestion.explanationEn ? (
        <p lang="en" data-testid="review-why-en">
          Why: {suggestion.explanationEn}
        </p>
      ) : null}
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
        Une suggestion <strong>n'est pas une relation</strong>. Confirmer en crée une,
        approuvée explicitement; rejeter n'en crée aucune.
      </p>
    </div>
  );
}

export default function ReviewQueuePanel({
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
  const total = queue?.totalPending ?? 0;
  // The cursor is the caller's, and « Plus tard » may have pushed it past the
  // page after the last item. Wrapping to the start is what makes the button
  // usable on a queue of one without pretending anything was decided.
  const items = queue?.items ?? [];
  const index = items.length === 0 ? 0 : cursor % items.length;
  const current = items[index] ?? null;
  const busy = current !== null && deciding === current.suggestionKey;

  return (
    <section className="review" aria-label="Relations à confirmer">
      <h2 className="review__title">Relations à confirmer</h2>
      <button
        type="button"
        className="review__toggle"
        data-testid="open-review-queue"
        data-total-pending={total}
        aria-expanded={open}
        onClick={onToggle}
      >
        {total} relation(s) à confirmer
      </button>
      <span className="sr-only" lang="en">
        {total} relation(s) to confirm
      </span>

      {open ? (
        loading ? (
          <p className="details__empty">Lecture de la file…</p>
        ) : total === 0 ? (
          <p className="details__empty" data-testid="review-empty">
            Aucune suggestion en attente pour ce cerveau.
          </p>
        ) : current === null ? (
          <p className="details__empty" data-testid="review-empty">
            Aucune suggestion sur cette page.
          </p>
        ) : (
          <div className="review__queue">
            <p className="review__position" data-testid="review-position">
              Suggestion {index + 1} sur {items.length} affichée(s), {total} en attente au
              total.
              {queue?.hasMore ? " D'autres suivent après cette page." : ""}
            </p>
            <SuggestionDetail suggestion={current} />
            <div className="review__actions">
              <button
                type="button"
                className="review__confirm"
                data-testid="review-confirm"
                data-suggestion-key={current.suggestionKey}
                disabled={busy}
                onClick={() => onConfirm(current.suggestionKey)}
              >
                {busy ? "Décision…" : "Confirmer"}
              </button>
              <button
                type="button"
                className="review__reject"
                data-testid="review-reject"
                data-suggestion-key={current.suggestionKey}
                disabled={busy}
                onClick={() => onReject(current.suggestionKey)}
              >
                {busy ? "Décision…" : "Rejeter"}
              </button>
              <button
                type="button"
                className="review__later"
                data-testid="review-later"
                data-suggestion-key={current.suggestionKey}
                // Never disabled by a mutation in flight: it starts none.
                onClick={onLater}
              >
                Plus tard
              </button>
            </div>
            <p className="review__hint">
              <strong>Plus tard</strong> ne décide rien : la suggestion reste en attente et
              reviendra au prochain chargement de la file.
            </p>
          </div>
        )
      ) : null}
    </section>
  );
}
