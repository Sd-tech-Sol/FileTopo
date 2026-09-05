import type {
  NodeRelations,
  RelationEngineReport,
  RelationEngineStatus,
  RelationProvenance,
  SuggestionEdge,
} from "./types";
import { PROVENANCE_LABELS, entryKey, groupByType, relationTypeLabel } from "./relations";

/**
 * The **intra-brain** relations panel — `P-07`, `P-05`, and the provenance
 * obligation of `P-04`.
 *
 * **Renamed by `TASK-0020`, and only renamed.** Its subject is unchanged: the
 * cross-cutting relations `TASK-0017` gave a brain, both of whose ends are
 * inside that one brain. It is now called « internes au cerveau » because a
 * second panel sits beside it holding relations that leave the brain, and `M7`
 * asks that a reader be able to tell the two apart without inferring anything.
 * Not a word of its behaviour, its counts or its refusals has moved.
 *
 * Three things are true of every entry, and each one is a frozen criterion:
 *
 * * **Direction is a grouping, not a hint.** Outgoing and incoming are two
 *   sections that come from two separate queries; neither is derived from the
 *   other, and no inverse is displayed that the store did not return.
 * * **Provenance is on screen**, in words, next to the relation — not in a
 *   tooltip, not in a log. For a deterministic relation the rule name and
 *   version are consultable in the same place.
 * * **A suggestion is never in those sections.** It lives in its own, named
 *   « Suggestions — non établies », with its own control, and it is never
 *   counted anywhere.
 *
 * Every entry is a `<button>`: reachable by keyboard because it is a button,
 * not because a key handler was bolted on.
 *
 * **`TASK-0024` split the panel's availability from the legacy perimeter.**
 * The frozen `TASK-0017` fixture decides whether the historical demonstration
 * relations apply — nothing else. A brain on `deep` gets the whole panel: the
 * analyse control, the `dre-v1` state, its core relations and their approval.
 */

interface RelationsPanelProps {
  relations: NodeRelations | null;
  loading: boolean;
  /**
   * `false` while this brain has no readable relations overview at all — the
   * store could not be opened. It is **not** a statement about the fixture.
   */
  available: boolean;
  /**
   * `false` when the source is outside the frozen `TASK-0017` fixture.
   *
   * `TASK-0024` separates two ideas the old `inScope` conflated. The legacy
   * perimeter says only that the historical demonstration relations do not
   * apply to this brain; the core perimeter is every brain. So this flag adds
   * one sentence and hides nothing: not the analyse control, not the `dre-v1`
   * state, not the core relations, not their approval.
   */
  legacyInScope: boolean;
  onSelect: (nodeId: number) => void;
  onApprove: (suggestionKey: string) => void;
  approving: string | null;
  engineStatus?: RelationEngineStatus | null;
  engineReport?: RelationEngineReport | null;
  engineRunning?: boolean;
  onAnalyze?: () => void;
}

/**
 * Provenance, encoded three ways: a word, a shape, and a class.
 *
 * The glyph is `aria-hidden` because the word beside it already says the same
 * thing — a screen reader that read both would say it twice.
 */
function ProvenanceBadge({ provenance }: { provenance: RelationProvenance }) {
  const glyph = provenance === "DETERMINISTIC" ? "◆" : "●";
  return (
    <span className={`relation__provenance relation__provenance--${provenance.toLowerCase()}`}>
      <span aria-hidden="true">{glyph}</span> {PROVENANCE_LABELS[provenance]}
    </span>
  );
}

function DirectionGlyph({ direction }: { direction: "outgoing" | "incoming" }) {
  return (
    <span className="relation__direction" aria-hidden="true">
      {direction === "outgoing" ? "→" : "←"}
    </span>
  );
}

function SuggestionRow({
  suggestion,
  onSelect,
  onApprove,
  approving,
}: {
  suggestion: SuggestionEdge;
  onSelect: (nodeId: number) => void;
  onApprove: (suggestionKey: string) => void;
  approving: string | null;
}) {
  const busy = approving === suggestion.suggestionKey;
  return (
    <li className="suggestion" data-suggestion-key={suggestion.suggestionKey}>
      <div className="suggestion__head">
        <span className="suggestion__tag">suggestion</span>
        <span className="suggestion__state">non établie</span>
      </div>
      <p className="suggestion__body">
        <span className="suggestion__endpoints">
          {suggestion.source.name} <span aria-hidden="true">⇢</span> {suggestion.target.name}
        </span>
        <span className="suggestion__type">{relationTypeLabel(suggestion.relationType)}</span>
      </p>
      {suggestion.ruleName ? (
        <div className="suggestion__explanation" data-testid="core-suggestion-explanation">
          <p>
            Règle : <code>{suggestion.ruleName}</code> version <code>{suggestion.ruleVersion}</code>
          </p>
          <p>Pourquoi : {suggestion.explanationFr}</p>
          {suggestion.explanationEn ? <p lang="en">Why: {suggestion.explanationEn}</p> : null}
          {suggestion.signals ? (
            <dl className="suggestion__signals">
              {Object.entries(suggestion.signals).map(([name, value]) => (
                <div key={name}>
                  <dt>{name}</dt>
                  <dd>{String(value)}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      ) : (
        <p className="suggestion__basis">Origine synthétique : {suggestion.basis}</p>
      )}
      <div className="suggestion__actions">
        <button
          type="button"
          className="suggestion__approve"
          data-testid="approve-core-suggestion"
          data-suggestion-key={suggestion.suggestionKey}
          disabled={busy}
          onClick={() => onApprove(suggestion.suggestionKey)}
        >
          {busy ? "Approbation…" : `Approuver ${suggestion.suggestionKey}`}
        </button>
        {suggestion.target.nodeId !== null ? (
          <button
            type="button"
            className="relation__link"
            onClick={() => onSelect(suggestion.target.nodeId as number)}
          >
            Voir {suggestion.target.name}
          </button>
        ) : null}
      </div>
    </li>
  );
}

function DirectionSection({
  title,
  hint,
  entries,
  count,
  onSelect,
}: {
  title: string;
  hint: string;
  entries: NodeRelations["outgoing"];
  count: number;
  onSelect: (nodeId: number) => void;
}) {
  return (
    <section className="relations__direction" aria-label={`${title} (${count})`}>
      <h3 className="relations__subtitle">
        {title} <span className="relations__count">{count}</span>
      </h3>
      <p className="relations__hint">{hint}</p>
      {entries.length === 0 ? (
        <p className="details__empty">Aucune.</p>
      ) : (
        groupByType(entries).map(([relationType, group]) => (
          <div key={relationType} className="relations__type-group">
            <h4 className="relations__type">
              {relationTypeLabel(relationType)} <span className="relations__count">{group.length}</span>
            </h4>
            <ul className="relations__list">
              {group.map((entry) => (
                <li key={entryKey(entry)}>
                  <button
                    type="button"
                    className="relation__link"
                    // The endpoint this entry leads to, on the entry itself.
                    // The panel groups by direction then by type, while the
                    // index sorts by endpoint key: reading the target off the
                    // control that is actually activated is the only way to
                    // check `J7` without reconstructing an ordering.
                    data-endpoint-node-id={entry.other.nodeId ?? ""}
                    data-endpoint-key={entry.other.key}
                    data-relation-type={entry.relationType}
                    data-direction={entry.direction}
                    data-provenance={entry.provenance}
                    disabled={entry.other.nodeId === null}
                    onClick={() => entry.other.nodeId !== null && onSelect(entry.other.nodeId)}
                  >
                    <DirectionGlyph direction={entry.direction} />
                    <span className="relation__name">{entry.other.name}</span>
                    <ProvenanceBadge provenance={entry.provenance} />
                  </button>
                  {entry.provenance === "DETERMINISTIC" ? (
                    <p className="relation__rule" data-testid="core-deterministic-relation">
                      Règle : <code>{entry.ruleName}</code> version{" "}
                      <code>{entry.ruleVersion}</code>
                      {entry.explanationFr ? <> · {entry.explanationFr}</> : null}
                      {entry.observedHash ? (
                        <>
                          {" "}SHA-256 identique <code>{entry.observedHash}</code>, génération{" "}
                          <code>{entry.contentGenerationId}</code>. Contenu binaire identique observé.
                        </>
                      ) : null}
                    </p>
                  ) : (
                    <p className="relation__rule relation__rule--approved">
                      Approuvée par une action explicite. Aucune règle déterministe.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}

export default function RelationsPanel({
  relations,
  loading,
  available,
  legacyInScope,
  onSelect,
  onApprove,
  approving,
  engineStatus = null,
  engineReport = null,
  engineRunning = false,
  onAnalyze,
}: RelationsPanelProps) {
  if (!available) {
    return (
      <section className="relations" aria-label="Relations internes au cerveau">
        <h2 className="relations__title">Relations internes au cerveau</h2>
        <p className="details__empty">Relations indisponibles pour ce cerveau.</p>
      </section>
    );
  }
  if (loading) {
    return (
      <section className="relations" aria-label="Relations internes au cerveau">
        <h2 className="relations__title">Relations internes au cerveau</h2>
        <p className="details__empty">Lecture des relations…</p>
      </section>
    );
  }
  if (!relations) {
    return (
      <section className="relations" aria-label="Relations internes au cerveau">
        <h2 className="relations__title">Relations internes au cerveau</h2>
        <p className="details__empty">Sélectionnez un bloc pour voir ses relations.</p>
      </section>
    );
  }

  return (
    <section className="relations" aria-label="Relations internes au cerveau">
      <h2 className="relations__title">Relations internes au cerveau</h2>
      {legacyInScope ? null : (
        <p className="relations__legacy-note" data-testid="legacy-scope-note">
          Les relations de démonstration de <code>TASK-0017</code> ne s'appliquent pas à ce
          cerveau : elles restent gelées sur <code>quasi-empty</code>. L'analyse déterministe{" "}
          <code>dre-v1</code> ci-dessous, elle, s'applique à <strong>tous</strong> les cerveaux.
        </p>
      )}
      <section className="relations__engine" aria-label="Moteur déterministe de relations">
        <h3 className="relations__subtitle">Analyse déterministe</h3>
        <button
          type="button"
          className="relations__analyze"
          data-testid="analyze-relations"
          disabled={engineRunning || !onAnalyze}
          onClick={onAnalyze}
        >
          {engineRunning ? "Analyse…" : "Analyser les relations"}
        </button>
        <span className="sr-only" lang="en">Analyze relations</span>
        <p data-testid="relation-engine-state">
          {engineStatus?.inputState === "CURRENT"
            ? "Analyse à jour"
            : engineStatus?.inputState === "STALE"
              ? "Analyse des relations à actualiser"
              : "Analyse des relations non exécutée"}
        </p>
        {engineReport ? (
          <p
            data-testid="relation-engine-summary"
            data-report={JSON.stringify(engineReport)}
          >
            Dernier run <code>{engineReport.engineVersion}</code> :{" "}
            {engineReport.deterministicRelationsProduced} relation(s) déterministe(s),{" "}
            {engineReport.suggestionsProduced} suggestion(s). Règles évaluées :{" "}
            {engineReport.rulesEvaluated.join(", ") || "aucune"}.
          </p>
        ) : null}
      </section>
      <p className="relations__totals" data-testid="relation-totals">
        {relations.outgoingCount} sortante(s) · {relations.incomingCount} entrante(s) ·{" "}
        {relations.suggestions.length} suggestion(s) <strong>non comptée(s)</strong>
      </p>
      <p className="relations__hint">
        Les deux extrémités de ces relations sont <strong>dans ce cerveau</strong>. Celles qui
        mènent à un autre cerveau sont dans le panneau <em>Relations inter-cerveaux</em>.
      </p>

      <DirectionSection
        title="Sortantes"
        hint="Ce nœud pointe vers :"
        entries={relations.outgoing}
        count={relations.outgoingCount}
        onSelect={onSelect}
      />
      <DirectionSection
        title="Entrantes"
        hint="Pointent vers ce nœud :"
        entries={relations.incoming}
        count={relations.incomingCount}
        onSelect={onSelect}
      />

      <section className="relations__suggestions" aria-label="Suggestions non établies">
        <h3 className="relations__subtitle">
          Suggestions — non établies{" "}
          <span className="relations__count">{relations.suggestions.length}</span>
        </h3>
        <p className="relations__hint">
          Une suggestion <strong>n'est pas une relation</strong> : elle n'entre dans aucun compte
          ci-dessus tant qu'elle n'est pas approuvée.
        </p>
        {relations.suggestions.length === 0 ? (
          <p className="details__empty">Aucune.</p>
        ) : (
          <ul className="relations__list">
            {relations.suggestions.map((suggestion) => (
              <SuggestionRow
                key={suggestion.suggestionKey}
                suggestion={suggestion}
                onSelect={onSelect}
                onApprove={onApprove}
                approving={approving}
              />
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
