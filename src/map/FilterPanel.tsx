import {
  AVAILABILITY_LABELS,
  describeFilter,
  KIND_LABELS,
  KIND_ORDER,
  matchCountLabel,
  ROLE_LABELS,
  ROLE_SYMBOLS,
  STATE_LABELS,
  filterRoles,
  toggleKind,
} from "./filters";
import type {
  FilteredProjection,
  FilterAvailability,
  FilterState,
  MapNode,
  NodeFilter,
} from "./types";

/**
 * Filtres de la carte — `TASK-0039` E, `DEC-0037`, `F-022 / P-09`.
 *
 * Trois groupes (état, type, disponibilité), un bouton pour tout remettre par
 * défaut, le filtre actif **écrit en mots**, le compte exact renvoyé par le
 * cœur, et la page courante listée avec, pour chaque nœud, le mot
 * « Correspondance » ou « Contexte » (et un symbole) : ce que la carte montre
 * en plus, en contexte, n'est jamais pris pour un résultat.
 *
 * Ce composant ne calcule rien : il reçoit un filtre, l'éventuelle page
 * filtrée du cœur et les nœuds de la projection bornée, et rend des
 * contrôles. Le compte, les correspondances et la pagination sont ceux de
 * l'Index.
 */

interface Props {
  /** Le filtre courant (le défaut quand aucun n'est actif). */
  filter: NodeFilter;
  active: boolean;
  /** Pas de cerveau au premier plan : rien à filtrer. */
  disabled?: boolean;
  /** La page filtrée acceptée pour ce filtre, ou `null` en attendant le cœur. */
  filtered: FilteredProjection | null;
  /** Les nœuds matérialisés de la projection courante (bornés par le cœur). */
  nodes: readonly MapNode[];
  pageNumber: number;
  /** La page a été reprise à la sélection retenue : son numéro réel n'est pas connu. */
  resumed?: boolean;
  canPrevious: boolean;
  selectedNodeId?: number | null;
  onChange: (next: NodeFilter) => void;
  onReset: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSelect: (nodeId: number) => void;
}

const STATES: readonly FilterState[] = ["ALL", "NEW", "UNSEEN"];
const AVAILABILITIES: readonly FilterAvailability[] = ["ALL", "LOCAL", "ONLINE_ONLY"];

export default function FilterPanel({
  filter,
  active,
  disabled = false,
  filtered,
  nodes,
  pageNumber,
  resumed = false,
  canPrevious,
  selectedNodeId = null,
  onChange,
  onReset,
  onPrevious,
  onNext,
  onSelect,
}: Props) {
  const roles = filterRoles(filtered);
  const listed = filtered ? nodes.filter((node) => roles.has(node.id)) : [];
  const nextCursor = filtered?.filterNextCursor ?? null;

  return (
    <section
      className="filters"
      aria-label="Filtres de la carte"
      data-testid="filter-panel"
      data-active={active ? "true" : "false"}
    >
      <h2 className="filters__title">Filtres</h2>

      <fieldset className="filters__group" disabled={disabled}>
        <legend>État</legend>
        {STATES.map((state) => (
          <label key={state} className="filters__choice">
            <input
              type="radio"
              name="filter-state"
              value={state}
              data-testid={`filter-state-${state}`}
              checked={filter.state === state}
              onChange={() => onChange({ ...filter, state })}
            />
            {STATE_LABELS[state]}
          </label>
        ))}
      </fieldset>

      <fieldset className="filters__group" disabled={disabled}>
        <legend>Type</legend>
        {KIND_ORDER.map((kind) => (
          <label key={kind} className="filters__choice">
            <input
              type="checkbox"
              name="filter-kind"
              value={kind}
              data-testid={`filter-kind-${kind}`}
              checked={filter.kinds.includes(kind)}
              onChange={() => onChange(toggleKind(filter, kind))}
            />
            {KIND_LABELS[kind]}
          </label>
        ))}
      </fieldset>

      <fieldset className="filters__group" disabled={disabled}>
        <legend>Disponibilité</legend>
        {AVAILABILITIES.map((availability) => (
          <label key={availability} className="filters__choice">
            <input
              type="radio"
              name="filter-availability"
              value={availability}
              data-testid={`filter-availability-${availability}`}
              checked={filter.availability === availability}
              onChange={() => onChange({ ...filter, availability })}
            />
            {AVAILABILITY_LABELS[availability]}
          </label>
        ))}
      </fieldset>

      <p>
        <button type="button" data-testid="filter-reset" disabled={!active} onClick={onReset}>
          Réinitialiser les filtres
        </button>
      </p>

      <p className="filters__active" data-testid="filter-active" role="status">
        {active ? `Filtre actif — ${describeFilter(filter)}` : "Aucun filtre actif."}
      </p>

      {active ? (
        filtered ? (
          <>
            <p
              className="filters__count"
              data-testid="filter-count"
              data-total={filtered.filteredTotal}
              aria-live="polite"
            >
              {matchCountLabel(filtered.filteredTotal)}
            </p>
            <p className="filters__page" data-testid="filter-page">
              {resumed ? "Page reprise" : `Page ${pageNumber}`} · {matchCountLabel(filtered.materializedMatchCount)} sur cette page
            </p>
            <ul className="filters__results" data-testid="filter-results">
              {listed.map((node) => {
                const role = roles.get(node.id)!;
                return (
                  <li key={node.id}>
                    <button
                      type="button"
                      data-testid="filter-result"
                      data-node-id={node.id}
                      data-filter-role={role}
                      aria-pressed={selectedNodeId === node.id}
                      onClick={() => onSelect(node.id)}
                    >
                      <span
                        className={`filters__role filters__role--${role}`}
                        data-testid="filter-role"
                      >
                        <span aria-hidden="true">{ROLE_SYMBOLS[role]} </span>
                        {ROLE_LABELS[role]}
                      </span>{" "}
                      {node.name || node.relativePath}
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="filters__paging">
              <button
                type="button"
                data-testid="filter-prev"
                disabled={!canPrevious}
                onClick={onPrevious}
              >
                Page précédente
              </button>
              <button
                type="button"
                data-testid="filter-next"
                disabled={nextCursor === null}
                onClick={onNext}
              >
                Page suivante
              </button>
            </p>
          </>
        ) : (
          <p data-testid="filter-loading" role="status">
            Lecture du filtre…
          </p>
        )
      ) : null}
    </section>
  );
}
