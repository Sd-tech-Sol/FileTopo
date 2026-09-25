import type { ReactNode } from "react";
import type { Locale } from "../lib/locale";
import type {
  BrainNodeRef,
  CrossSuggestionEdge,
  NodeCrossRelationEntry,
  NodeCrossRelations,
  RelationProvenance,
} from "./types";
import { PROVENANCE_LABELS, relationTypeLabel } from "./relations";
import { crossEntryKey, groupCrossByType, otherEndIsDisplayed } from "./crossRelations";

/**
 * The inter-brain relations panel — `TASK-0020` §4.7, criterion `M7`.
 *
 * A **separate section**, not a fifth group inside the intra-brain one. That is
 * the criterion: « le panneau distingue interne / inter-cerveaux », and the
 * surest way for two things to stay distinguishable is for them never to be
 * rendered by the same component.
 *
 * Four things are true of every entry here, and each one is frozen:
 *
 * * **Both brains are named, in words.** Not an id, not a colour: « Cerveau
 *   Alpha → Cerveau Gamma ». `M7` asks for source brain and target brain, and a
 *   reader must not have to know that `brain-gamma` is the orange one.
 * * **Direction is a grouping, not a hint.** Outgoing and incoming come from
 *   two separate queries; neither is derived from the other.
 * * **Provenance is on screen**, in words. For a `DETERMINISTIC` relation the
 *   rule and version are consultable in the same place; for an `APPROVED` one
 *   the panel says an explicit approval created it and **invents no rule**.
 * * **A target that is not displayed is said so**, in words — « hors de la
 *   vue » — and stays activable. `M9` turns that activation into a navigation:
 *   the brain joins the composition and the endpoint is selected. It creates,
 *   modifies and approves **nothing**.
 *
 * Every entry is a `<button>`: reachable by keyboard because it is a button,
 * not because a key handler was bolted on. `M8` and `M9` press them for real.
 *
 * **Its own class namespace, and that is not cosmetic.** Nothing here carries a
 * `relation__*` or `relations__*` class. The first real `M12` run found out why:
 * the intra-brain scenario counts `.relations__direction .relation__link`
 * across the whole document, and a shared class made it count inter-brain
 * entries too — the same defect as one DOM id for two brains, wearing a
 * different hat. A selector written for one panel must not be able to match the
 * other, so the two share styling through the stylesheet and share **no class
 * name** in the markup.
 *
 * **`TASK-0046` — the words follow the interface language.** Brain names and node
 * names are user data and are shown as they are; wire values are never translated.
 */

/** What an entry's accessible name is built from. */
interface EntryAria {
  outgoing: boolean;
  sourceName: string;
  targetName: string;
  type: string;
  provenance: string;
  nodeName: string;
  otherBrain: string;
  displayed: boolean;
}

/** Everything this panel says, in one language. */
interface CrossRelationsPanelStrings {
  title: string;
  loading: string;
  select: string;
  selfBrain: string;
  hint: ReactNode;
  totals: (outgoing: number, incoming: number, suggestions: number) => ReactNode;
  outgoingTitle: string;
  outgoingHint: string;
  incomingTitle: string;
  incomingHint: string;
  none: string;
  offscreen: string;
  entryAria: (entry: EntryAria) => string;
  rule: (name: string, version: string) => ReactNode;
  approvedRule: (suggestionKey: string | null) => ReactNode;
  navigationHint: (brainName: string) => ReactNode;
  suggestionsLabel: string;
  suggestionsTitle: string;
  suggestionsHint: ReactNode;
  suggestionTag: string;
  suggestionState: string;
  suggestionScope: string;
  basis: string;
  approveAria: (key: string, source: string, target: string) => string;
  approve: (key: string) => string;
  approving: string;
}

export const CROSS_RELATIONS_PANEL_STRINGS: Record<Locale, CrossRelationsPanelStrings> = {
  fr: {
    title: "Relations inter-cerveaux",
    loading: "Lecture des relations inter-cerveaux…",
    select: "Sélectionnez un bloc pour voir ses relations vers d'autres cerveaux.",
    selfBrain: "ce cerveau",
    hint: (
      <>
        Une relation inter-cerveaux relie ce nœud à un nœud d'un <strong>autre</strong> cerveau.
        Elle ne fusionne rien, et elle existe même si l'autre cerveau n'est pas affiché.
      </>
    ),
    totals: (outgoing, incoming, suggestions) => (
      <>
        {outgoing} sortante(s) · {incoming} entrante(s) · {suggestions} suggestion(s){" "}
        <strong>non comptée(s)</strong>
      </>
    ),
    outgoingTitle: "Sortantes — vers un autre cerveau",
    outgoingHint: "Ce nœud pointe vers :",
    incomingTitle: "Entrantes — depuis un autre cerveau",
    incomingHint: "Pointent vers ce nœud :",
    none: "Aucune.",
    offscreen: " — hors de la vue",
    // The accessible name carries the whole claim, so a screen reader hears
    // « inter-cerveaux », the direction and the provenance without seeing a
    // single colour.
    entryAria: (entry) =>
      `relation inter-cerveaux ${entry.outgoing ? "sortante" : "entrante"}, ` +
      `de ${entry.sourceName} vers ${entry.targetName}, ` +
      `${entry.type}, ` +
      `provenance ${entry.provenance}, ` +
      `nœud ${entry.nodeName}` +
      (entry.displayed ? "" : `, cerveau ${entry.otherBrain} hors de la vue`),
    rule: (name, version) => (
      <>
        Règle : <code>{name}</code> version <code>{version}</code>
      </>
    ),
    approvedRule: (suggestionKey) => (
      <>
        Approuvée par une action explicite
        {suggestionKey ? (
          <>
            {" "}
            (<code>{suggestionKey}</code>)
          </>
        ) : null}
        . Aucune règle déterministe.
      </>
    ),
    navigationHint: (brainName) => (
      <>
        Activer cette relation <strong>ajoute {brainName} à la vue</strong> et y sélectionne la
        cible. C'est une navigation : rien n'est créé, modifié ni approuvé.
      </>
    ),
    suggestionsLabel: "Suggestions inter-cerveaux non établies",
    suggestionsTitle: "Suggestions inter-cerveaux — non établies",
    suggestionsHint: (
      <>
        Une suggestion <strong>n'est pas une relation</strong> : elle n'entre dans aucun compte
        ci-dessus et n'est dessinée comme aucune arête établie tant qu'elle n'est pas approuvée.
      </>
    ),
    suggestionTag: "suggestion",
    suggestionState: "non établie",
    suggestionScope: "inter-cerveaux",
    basis: "Origine synthétique :",
    approveAria: (key, source, target) =>
      `approuver la suggestion inter-cerveaux ${key}, de ${source} vers ${target}`,
    approve: (key) => `Approuver ${key}`,
    approving: "Approbation…",
  },
  en: {
    title: "Inter-brain relations",
    loading: "Reading inter-brain relations…",
    select: "Select a block to see its relations to other brains.",
    selfBrain: "this brain",
    hint: (
      <>
        An inter-brain relation links this node to a node of <strong>another</strong> brain. It
        merges nothing, and it exists even when the other brain is not displayed.
      </>
    ),
    totals: (outgoing, incoming, suggestions) => (
      <>
        {outgoing} outgoing · {incoming} incoming · {suggestions} suggestion(s){" "}
        <strong>not counted</strong>
      </>
    ),
    outgoingTitle: "Outgoing — to another brain",
    outgoingHint: "This node points to:",
    incomingTitle: "Incoming — from another brain",
    incomingHint: "Pointing to this node:",
    none: "None.",
    offscreen: " — not in view",
    entryAria: (entry) =>
      `inter-brain relation ${entry.outgoing ? "outgoing" : "incoming"}, ` +
      `from ${entry.sourceName} to ${entry.targetName}, ` +
      `${entry.type}, ` +
      `provenance ${entry.provenance}, ` +
      `node ${entry.nodeName}` +
      (entry.displayed ? "" : `, brain ${entry.otherBrain} not in view`),
    rule: (name, version) => (
      <>
        Rule: <code>{name}</code> version <code>{version}</code>
      </>
    ),
    approvedRule: (suggestionKey) => (
      <>
        Approved by an explicit action
        {suggestionKey ? (
          <>
            {" "}
            (<code>{suggestionKey}</code>)
          </>
        ) : null}
        . No deterministic rule.
      </>
    ),
    navigationHint: (brainName) => (
      <>
        Activating this relation <strong>adds {brainName} to the view</strong> and selects the
        target there. It is a navigation: nothing is created, modified or approved.
      </>
    ),
    suggestionsLabel: "Inter-brain suggestions not established",
    suggestionsTitle: "Inter-brain suggestions — not established",
    suggestionsHint: (
      <>
        A suggestion <strong>is not a relation</strong>: it enters none of the counts above and is
        drawn as no established edge until it is approved.
      </>
    ),
    suggestionTag: "suggestion",
    suggestionState: "not established",
    suggestionScope: "inter-brain",
    basis: "Synthetic origin:",
    approveAria: (key, source, target) =>
      `approve inter-brain suggestion ${key}, from ${source} to ${target}`,
    approve: (key) => `Approve ${key}`,
    approving: "Approving…",
  },
};

interface CrossRelationsPanelProps {
  /** The interface language. Changing it reads nothing again. */
  locale: Locale;
  relations: NodeCrossRelations | null;
  loading: boolean;
  /** The composition, so the panel can say what is on screen and what is not. */
  displayedBrainIds: readonly string[];
  /** Navigation. Adds the brain to the view when it is not displayed. */
  onNavigate: (target: BrainNodeRef | { brainId: string; endpointKey: string }) => void;
  onApprove: (suggestionKey: string) => void;
  approving: string | null;
}

function ProvenanceBadge({
  provenance,
  locale,
}: {
  provenance: RelationProvenance;
  locale: Locale;
}) {
  const glyph = provenance === "DETERMINISTIC" ? "◆" : "●";
  return (
    <span className={`cross-relation__provenance cross-relation__provenance--${provenance.toLowerCase()}`}>
      <span aria-hidden="true">{glyph}</span> {PROVENANCE_LABELS[locale][provenance]}
    </span>
  );
}

/** The other brain, named — never an identifier, never a colour alone. */
function BrainTag({
  icon,
  displayName,
  displayed,
  locale,
}: {
  icon: string;
  displayName: string;
  displayed: boolean;
  locale: Locale;
}) {
  return (
    <span className="cross-relation__brain">
      <span aria-hidden="true">{icon}</span> {displayName}
      {displayed ? null : (
        <span className="cross-relation__offscreen">{CROSS_RELATIONS_PANEL_STRINGS[locale].offscreen}</span>
      )}
    </span>
  );
}

function CrossEntryRow({
  locale,
  entry,
  selfBrainName,
  displayedBrainIds,
  onNavigate,
}: {
  locale: Locale;
  entry: NodeCrossRelationEntry;
  selfBrainName: string;
  displayedBrainIds: readonly string[];
  onNavigate: CrossRelationsPanelProps["onNavigate"];
}) {
  const words = CROSS_RELATIONS_PANEL_STRINGS[locale];
  const displayed = otherEndIsDisplayed(entry, displayedBrainIds);
  const outgoing = entry.direction === "outgoing";
  // Source and target, spelled out in the reading order of the relation rather
  // than in the order of the panel's sections: an incoming relation reads
  // « Gamma → ce nœud », and reversing that on screen would be inventing an
  // inverse in the one place a reader would believe it.
  const sourceName = outgoing ? selfBrainName : entry.other.brainDisplayName;
  const targetName = outgoing ? entry.other.brainDisplayName : selfBrainName;
  const typeLabel = relationTypeLabel(entry.relationType, locale);

  return (
    <li className="cross-relation">
      <button
        type="button"
        className="cross-relation__link"
        // Everything a scenario needs to check `M7`, `M8` and `M9` read off the
        // control that is actually activated — never reconstructed from an
        // ordering the panel happens to use.
        data-cross-entry="true"
        data-endpoint-key={entry.other.key}
        data-endpoint-brain-id={entry.other.brainId}
        data-endpoint-node-id={entry.other.nodeId ?? ""}
        data-endpoint-displayed={displayed ? "true" : "false"}
        data-direction={entry.direction}
        data-provenance={entry.provenance}
        data-relation-type={entry.relationType}
        data-source-brain-id={outgoing ? "self" : entry.other.brainId}
        data-target-brain-id={outgoing ? entry.other.brainId : "self"}
        aria-label={words.entryAria({
          outgoing,
          sourceName,
          targetName,
          type: typeLabel,
          provenance: PROVENANCE_LABELS[locale][entry.provenance],
          nodeName: entry.other.name,
          otherBrain: entry.other.brainDisplayName,
          displayed,
        })}
        onClick={() =>
          onNavigate(
            entry.other.nodeId !== null && displayed
              ? { brainId: entry.other.brainId, nodeId: entry.other.nodeId }
              : { brainId: entry.other.brainId, endpointKey: entry.other.key },
          )
        }
      >
        <span className="cross-relation__glyph" aria-hidden="true">
          {outgoing ? "→" : "←"}
        </span>
        <span className="cross-relation__endpoints" aria-hidden="true">
          {sourceName} <span className="cross-relation__arrow">⇒</span> {targetName}
        </span>
        <span className="cross-relation__name">{entry.other.name}</span>
        <ProvenanceBadge provenance={entry.provenance} locale={locale} />
      </button>
      <p className="cross-relation__meta">
        <BrainTag
          icon={entry.other.brainIcon}
          displayName={entry.other.brainDisplayName}
          displayed={displayed}
          locale={locale}
        />
        <span className="cross-relation__type">{typeLabel}</span>
      </p>
      {entry.provenance === "DETERMINISTIC" ? (
        <p className="cross-relation__rule">
          {words.rule(entry.ruleName ?? "", entry.ruleVersion ?? "")}
        </p>
      ) : (
        <p className="cross-relation__rule cross-relation__rule--approved">
          {words.approvedRule(entry.suggestionKey ?? null)}
        </p>
      )}
      {displayed ? null : (
        <p className="cross-relation__hint">{words.navigationHint(entry.other.brainDisplayName)}</p>
      )}
    </li>
  );
}

function CrossDirectionSection({
  locale,
  title,
  hint,
  entries,
  count,
  selfBrainName,
  displayedBrainIds,
  onNavigate,
}: {
  locale: Locale;
  title: string;
  hint: string;
  entries: NodeCrossRelationEntry[];
  count: number;
  selfBrainName: string;
  displayedBrainIds: readonly string[];
  onNavigate: CrossRelationsPanelProps["onNavigate"];
}) {
  return (
    <section className="cross-relations__direction" aria-label={`${title} (${count})`}>
      <h3 className="cross-relations__subtitle">
        {title} <span className="cross-relations__count">{count}</span>
      </h3>
      <p className="cross-relations__hint">{hint}</p>
      {entries.length === 0 ? (
        <p className="cross-relations__empty">{CROSS_RELATIONS_PANEL_STRINGS[locale].none}</p>
      ) : (
        groupCrossByType(entries).map(([relationType, group]) => (
          <div key={relationType} className="cross-relations__type-group">
            <h4 className="cross-relations__type">
              {relationTypeLabel(relationType, locale)}{" "}
              <span className="cross-relations__count">{group.length}</span>
            </h4>
            <ul className="cross-relations__list">
              {group.map((entry) => (
                <CrossEntryRow
                  key={crossEntryKey(entry)}
                  locale={locale}
                  entry={entry}
                  selfBrainName={selfBrainName}
                  displayedBrainIds={displayedBrainIds}
                  onNavigate={onNavigate}
                />
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}

function CrossSuggestionRow({
  locale,
  suggestion,
  onApprove,
  approving,
}: {
  locale: Locale;
  suggestion: CrossSuggestionEdge;
  onApprove: (suggestionKey: string) => void;
  approving: string | null;
}) {
  const words = CROSS_RELATIONS_PANEL_STRINGS[locale];
  const busy = approving === suggestion.suggestionKey;
  return (
    <li className="cross-suggestion" data-cross-suggestion={suggestion.suggestionKey}>
      <div className="cross-suggestion__head">
        <span className="cross-suggestion__label">{words.suggestionTag}</span>
        <span className="cross-suggestion__state">{words.suggestionState}</span>
        <span className="cross-suggestion__tag">{words.suggestionScope}</span>
      </div>
      <p className="cross-suggestion__body">
        <span className="cross-suggestion__endpoints">
          {suggestion.source.brainDisplayName} · {suggestion.source.name}{" "}
          <span aria-hidden="true">⇢</span> {suggestion.target.brainDisplayName} ·{" "}
          {suggestion.target.name}
        </span>
        <span className="cross-suggestion__type">
          {relationTypeLabel(suggestion.relationType, locale)}
        </span>
      </p>
      <p className="cross-suggestion__basis">
        {words.basis} {suggestion.basis}
      </p>
      <div className="cross-suggestion__actions">
        <button
          type="button"
          className="cross-suggestion__approve"
          data-cross-approve={suggestion.suggestionKey}
          disabled={busy}
          aria-label={words.approveAria(
            suggestion.suggestionKey,
            suggestion.source.brainDisplayName,
            suggestion.target.brainDisplayName,
          )}
          onClick={() => onApprove(suggestion.suggestionKey)}
        >
          {busy ? words.approving : words.approve(suggestion.suggestionKey)}
        </button>
      </div>
    </li>
  );
}

export default function CrossRelationsPanel({
  locale,
  relations,
  loading,
  displayedBrainIds,
  onNavigate,
  onApprove,
  approving,
}: CrossRelationsPanelProps) {
  const words = CROSS_RELATIONS_PANEL_STRINGS[locale];
  if (loading) {
    return (
      <section className="cross-relations" aria-label={words.title}>
        <h2 className="cross-relations__title">{words.title}</h2>
        <p className="cross-relations__empty">{words.loading}</p>
      </section>
    );
  }
  if (!relations) {
    return (
      <section className="cross-relations" aria-label={words.title}>
        <h2 className="cross-relations__title">{words.title}</h2>
        <p className="cross-relations__empty">{words.select}</p>
      </section>
    );
  }

  const selfBrainName = words.selfBrain;

  return (
    <section className="cross-relations" aria-label={words.title}>
      <h2 className="cross-relations__title">{words.title}</h2>
      <p className="cross-relations__hint">{words.hint}</p>
      <p className="cross-relations__totals" data-testid="cross-relation-totals">
        {words.totals(relations.outgoingCount, relations.incomingCount, relations.suggestions.length)}
      </p>

      <CrossDirectionSection
        locale={locale}
        title={words.outgoingTitle}
        hint={words.outgoingHint}
        entries={relations.outgoing}
        count={relations.outgoingCount}
        selfBrainName={selfBrainName}
        displayedBrainIds={displayedBrainIds}
        onNavigate={onNavigate}
      />
      <CrossDirectionSection
        locale={locale}
        title={words.incomingTitle}
        hint={words.incomingHint}
        entries={relations.incoming}
        count={relations.incomingCount}
        selfBrainName={selfBrainName}
        displayedBrainIds={displayedBrainIds}
        onNavigate={onNavigate}
      />

      <section className="cross-relations__suggestions" aria-label={words.suggestionsLabel}>
        <h3 className="cross-relations__subtitle">
          {words.suggestionsTitle}{" "}
          <span className="cross-relations__count">{relations.suggestions.length}</span>
        </h3>
        <p className="cross-relations__hint">{words.suggestionsHint}</p>
        {relations.suggestions.length === 0 ? (
          <p className="cross-relations__empty">{words.none}</p>
        ) : (
          <ul className="cross-relations__list">
            {relations.suggestions.map((suggestion) => (
              <CrossSuggestionRow
                key={suggestion.suggestionKey}
                locale={locale}
                suggestion={suggestion}
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
