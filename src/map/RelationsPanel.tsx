import type { ReactNode } from "react";
import type { Locale } from "../lib/locale";
import type {
  NodeRelations,
  RelationEngineReport,
  RelationEngineStatus,
  RelationProvenance,
  SuggestionEdge,
} from "./types";
import {
  PROVENANCE_LABELS,
  entryKey,
  explanationFor,
  groupByType,
  relationTypeLabel,
} from "./relations";

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
 *
 * **`TASK-0046` — the words follow the interface language.** Wire values
 * (`DETERMINISTIC`, `APPROVED`, rule names, keys, signals) are never translated.
 */

/** Everything this panel says, in one language. */
interface RelationsPanelStrings {
  title: string;
  unavailable: string;
  loading: string;
  select: string;
  legacyNote: ReactNode;
  engineLabel: string;
  engineTitle: string;
  analyze: string;
  analyzing: string;
  engineCurrent: string;
  engineStale: string;
  engineNotRun: string;
  engineSummary: (report: RelationEngineReport) => ReactNode;
  totals: (outgoing: number, incoming: number, suggestions: number) => ReactNode;
  hint: ReactNode;
  outgoing: string;
  incoming: string;
  outgoingHint: string;
  incomingHint: string;
  none: string;
  suggestionsLabel: string;
  suggestionsTitle: string;
  suggestionsHint: ReactNode;
  suggestionTag: string;
  suggestionState: string;
  rule: (name: string, version: string) => ReactNode;
  why: string;
  basis: string;
  approve: (key: string) => string;
  approving: string;
  see: (name: string) => string;
  observedHash: (hash: string, generation: string) => ReactNode;
  approvedRule: string;
}

export const RELATIONS_PANEL_STRINGS: Record<Locale, RelationsPanelStrings> = {
  fr: {
    title: "Relations internes au cerveau",
    unavailable: "Relations indisponibles pour ce cerveau.",
    loading: "Lecture des relations…",
    select: "Sélectionnez un bloc pour voir ses relations.",
    legacyNote: (
      <>
        Les relations de démonstration de <code>TASK-0017</code> ne s'appliquent pas à ce
        cerveau : elles restent gelées sur <code>quasi-empty</code>. L'analyse déterministe{" "}
        <code>dre-v1</code> ci-dessous, elle, s'applique à <strong>tous</strong> les cerveaux.
      </>
    ),
    engineLabel: "Moteur déterministe de relations",
    engineTitle: "Analyse déterministe",
    analyze: "Analyser les relations",
    analyzing: "Analyse…",
    engineCurrent: "Analyse à jour",
    engineStale: "Analyse des relations à actualiser",
    engineNotRun: "Analyse des relations non exécutée",
    engineSummary: (report) => (
      <>
        Dernier run <code>{report.engineVersion}</code> : {report.deterministicRelationsProduced}{" "}
        relation(s) déterministe(s), {report.suggestionsProduced} suggestion(s). Règles évaluées :{" "}
        {report.rulesEvaluated.join(", ") || "aucune"}.
      </>
    ),
    totals: (outgoing, incoming, suggestions) => (
      <>
        {outgoing} sortante(s) · {incoming} entrante(s) · {suggestions} suggestion(s){" "}
        <strong>non comptée(s)</strong>
      </>
    ),
    hint: (
      <>
        Les deux extrémités de ces relations sont <strong>dans ce cerveau</strong>. Celles qui
        mènent à un autre cerveau sont dans le panneau <em>Relations inter-cerveaux</em>.
      </>
    ),
    outgoing: "Sortantes",
    incoming: "Entrantes",
    outgoingHint: "Ce nœud pointe vers :",
    incomingHint: "Pointent vers ce nœud :",
    none: "Aucune.",
    suggestionsLabel: "Suggestions non établies",
    suggestionsTitle: "Suggestions — non établies",
    suggestionsHint: (
      <>
        Une suggestion <strong>n'est pas une relation</strong> : elle n'entre dans aucun compte
        ci-dessus tant qu'elle n'est pas approuvée.
      </>
    ),
    suggestionTag: "suggestion",
    suggestionState: "non établie",
    rule: (name, version) => (
      <>
        Règle : <code>{name}</code> version <code>{version}</code>
      </>
    ),
    why: "Pourquoi :",
    basis: "Origine synthétique :",
    approve: (key) => `Approuver ${key}`,
    approving: "Approbation…",
    see: (name) => `Voir ${name}`,
    observedHash: (hash, generation) => (
      <>
        {" "}
        SHA-256 identique <code>{hash}</code>, génération <code>{generation}</code>. Contenu
        binaire identique observé.
      </>
    ),
    approvedRule: "Approuvée par une action explicite. Aucune règle déterministe.",
  },
  en: {
    title: "Relations inside the brain",
    unavailable: "Relations are unavailable for this brain.",
    loading: "Reading relations…",
    select: "Select a block to see its relations.",
    legacyNote: (
      <>
        The demonstration relations of <code>TASK-0017</code> do not apply to this brain: they stay
        frozen on <code>quasi-empty</code>. The deterministic <code>dre-v1</code> analysis below,
        however, applies to <strong>every</strong> brain.
      </>
    ),
    engineLabel: "Deterministic relations engine",
    engineTitle: "Deterministic analysis",
    analyze: "Analyze relations",
    analyzing: "Analyzing…",
    engineCurrent: "Analysis up to date",
    engineStale: "Relations analysis needs refreshing",
    engineNotRun: "Relations analysis not run",
    engineSummary: (report) => (
      <>
        Last run <code>{report.engineVersion}</code>: {report.deterministicRelationsProduced}{" "}
        deterministic relation(s), {report.suggestionsProduced} suggestion(s). Rules evaluated:{" "}
        {report.rulesEvaluated.join(", ") || "none"}.
      </>
    ),
    totals: (outgoing, incoming, suggestions) => (
      <>
        {outgoing} outgoing · {incoming} incoming · {suggestions} suggestion(s){" "}
        <strong>not counted</strong>
      </>
    ),
    hint: (
      <>
        Both ends of these relations are <strong>inside this brain</strong>. Those that lead to
        another brain are in the <em>Inter-brain relations</em> panel.
      </>
    ),
    outgoing: "Outgoing",
    incoming: "Incoming",
    outgoingHint: "This node points to:",
    incomingHint: "Pointing to this node:",
    none: "None.",
    suggestionsLabel: "Suggestions not established",
    suggestionsTitle: "Suggestions — not established",
    suggestionsHint: (
      <>
        A suggestion <strong>is not a relation</strong>: it enters none of the counts above until
        it is approved.
      </>
    ),
    suggestionTag: "suggestion",
    suggestionState: "not established",
    rule: (name, version) => (
      <>
        Rule: <code>{name}</code> version <code>{version}</code>
      </>
    ),
    why: "Why:",
    basis: "Synthetic origin:",
    approve: (key) => `Approve ${key}`,
    approving: "Approving…",
    see: (name) => `View ${name}`,
    observedHash: (hash, generation) => (
      <>
        {" "}
        Identical SHA-256 <code>{hash}</code>, generation <code>{generation}</code>. Identical
        binary content observed.
      </>
    ),
    approvedRule: "Approved by an explicit action. No deterministic rule.",
  },
};

interface RelationsPanelProps {
  /** The interface language. Changing it reads nothing again. */
  locale: Locale;
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
function ProvenanceBadge({
  provenance,
  locale,
}: {
  provenance: RelationProvenance;
  locale: Locale;
}) {
  const glyph = provenance === "DETERMINISTIC" ? "◆" : "●";
  return (
    <span className={`relation__provenance relation__provenance--${provenance.toLowerCase()}`}>
      <span aria-hidden="true">{glyph}</span> {PROVENANCE_LABELS[locale][provenance]}
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
  locale,
  suggestion,
  onSelect,
  onApprove,
  approving,
}: {
  locale: Locale;
  suggestion: SuggestionEdge;
  onSelect: (nodeId: number) => void;
  onApprove: (suggestionKey: string) => void;
  approving: string | null;
}) {
  const words = RELATIONS_PANEL_STRINGS[locale];
  const busy = approving === suggestion.suggestionKey;
  const explanation = explanationFor(suggestion, locale);
  return (
    <li className="suggestion" data-suggestion-key={suggestion.suggestionKey}>
      <div className="suggestion__head">
        <span className="suggestion__tag">{words.suggestionTag}</span>
        <span className="suggestion__state">{words.suggestionState}</span>
      </div>
      <p className="suggestion__body">
        <span className="suggestion__endpoints">
          {suggestion.source.name} <span aria-hidden="true">⇢</span> {suggestion.target.name}
        </span>
        <span className="suggestion__type">{relationTypeLabel(suggestion.relationType, locale)}</span>
      </p>
      {suggestion.ruleName ? (
        <div className="suggestion__explanation" data-testid="core-suggestion-explanation">
          <p>{words.rule(suggestion.ruleName, suggestion.ruleVersion ?? "")}</p>
          {explanation ? (
            <p lang={explanation.lang}>
              {words.why} {explanation.text}
            </p>
          ) : null}
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
        <p className="suggestion__basis">
          {words.basis} {suggestion.basis}
        </p>
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
          {busy ? words.approving : words.approve(suggestion.suggestionKey)}
        </button>
        {suggestion.target.nodeId !== null ? (
          <button
            type="button"
            className="relation__link"
            onClick={() => onSelect(suggestion.target.nodeId as number)}
          >
            {words.see(suggestion.target.name)}
          </button>
        ) : null}
      </div>
    </li>
  );
}

function DirectionSection({
  locale,
  title,
  hint,
  entries,
  count,
  onSelect,
}: {
  locale: Locale;
  title: string;
  hint: string;
  entries: NodeRelations["outgoing"];
  count: number;
  onSelect: (nodeId: number) => void;
}) {
  const words = RELATIONS_PANEL_STRINGS[locale];
  return (
    <section className="relations__direction" aria-label={`${title} (${count})`}>
      <h3 className="relations__subtitle">
        {title} <span className="relations__count">{count}</span>
      </h3>
      <p className="relations__hint">{hint}</p>
      {entries.length === 0 ? (
        <p className="details__empty">{words.none}</p>
      ) : (
        groupByType(entries).map(([relationType, group]) => (
          <div key={relationType} className="relations__type-group">
            <h4 className="relations__type">
              {relationTypeLabel(relationType, locale)}{" "}
              <span className="relations__count">{group.length}</span>
            </h4>
            <ul className="relations__list">
              {group.map((entry) => {
                const explanation = explanationFor(entry, locale);
                return (
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
                      <ProvenanceBadge provenance={entry.provenance} locale={locale} />
                    </button>
                    {entry.provenance === "DETERMINISTIC" ? (
                      <p className="relation__rule" data-testid="core-deterministic-relation">
                        {words.rule(entry.ruleName ?? "", entry.ruleVersion ?? "")}
                        {explanation ? <> · {explanation.text}</> : null}
                        {entry.observedHash
                          ? words.observedHash(
                              entry.observedHash,
                              String(entry.contentGenerationId ?? ""),
                            )
                          : null}
                      </p>
                    ) : (
                      <p className="relation__rule relation__rule--approved">{words.approvedRule}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}

export default function RelationsPanel({
  locale,
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
  const words = RELATIONS_PANEL_STRINGS[locale];
  if (!available) {
    return (
      <section className="relations" aria-label={words.title}>
        <h2 className="relations__title">{words.title}</h2>
        <p className="details__empty">{words.unavailable}</p>
      </section>
    );
  }
  if (loading) {
    return (
      <section className="relations" aria-label={words.title}>
        <h2 className="relations__title">{words.title}</h2>
        <p className="details__empty">{words.loading}</p>
      </section>
    );
  }
  if (!relations) {
    return (
      <section className="relations" aria-label={words.title}>
        <h2 className="relations__title">{words.title}</h2>
        <p className="details__empty">{words.select}</p>
      </section>
    );
  }

  return (
    <section className="relations" aria-label={words.title}>
      <h2 className="relations__title">{words.title}</h2>
      {legacyInScope ? null : (
        <p className="relations__legacy-note" data-testid="legacy-scope-note">
          {words.legacyNote}
        </p>
      )}
      <section className="relations__engine" aria-label={words.engineLabel}>
        <h3 className="relations__subtitle">{words.engineTitle}</h3>
        <button
          type="button"
          className="relations__analyze"
          data-testid="analyze-relations"
          disabled={engineRunning || !onAnalyze}
          onClick={onAnalyze}
        >
          {engineRunning ? words.analyzing : words.analyze}
        </button>
        <p data-testid="relation-engine-state">
          {engineStatus?.inputState === "CURRENT"
            ? words.engineCurrent
            : engineStatus?.inputState === "STALE"
              ? words.engineStale
              : words.engineNotRun}
        </p>
        {engineReport ? (
          <p
            data-testid="relation-engine-summary"
            data-report={JSON.stringify(engineReport)}
          >
            {words.engineSummary(engineReport)}
          </p>
        ) : null}
      </section>
      <p className="relations__totals" data-testid="relation-totals">
        {words.totals(relations.outgoingCount, relations.incomingCount, relations.suggestions.length)}
      </p>
      <p className="relations__hint">{words.hint}</p>

      <DirectionSection
        locale={locale}
        title={words.outgoing}
        hint={words.outgoingHint}
        entries={relations.outgoing}
        count={relations.outgoingCount}
        onSelect={onSelect}
      />
      <DirectionSection
        locale={locale}
        title={words.incoming}
        hint={words.incomingHint}
        entries={relations.incoming}
        count={relations.incomingCount}
        onSelect={onSelect}
      />

      <section className="relations__suggestions" aria-label={words.suggestionsLabel}>
        <h3 className="relations__subtitle">
          {words.suggestionsTitle}{" "}
          <span className="relations__count">{relations.suggestions.length}</span>
        </h3>
        <p className="relations__hint">{words.suggestionsHint}</p>
        {relations.suggestions.length === 0 ? (
          <p className="details__empty">{words.none}</p>
        ) : (
          <ul className="relations__list">
            {relations.suggestions.map((suggestion) => (
              <SuggestionRow
                key={suggestion.suggestionKey}
                locale={locale}
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
