import type { BrainNodeRef, MapNode, NodeChildrenPage, NodeDetail } from "./types";
import ContentObservationsPanel from "./ContentObservationsPanel";
import type { ContentObservation, ContentObservationSummary } from "./types";

/**
 * The details panel — `P-12`, and the parent/children reach of `P-03`.
 *
 * Every value comes from the index, unchanged. Access diagnostics are shown
 * with the same weight as the rest: `H5` requires them displayed, never hidden,
 * and a diagnostic tucked behind a tooltip is hidden.
 */

interface DetailsPanelProps {
  detail: NodeDetail | null;
  loading: boolean;
  onSelect: (nodeId: number) => void;
  locale: "fr" | "en";
  strings: PanelStrings;
  contentObservation?: ContentObservation | null;
  contentSummary?: ContentObservationSummary | null;
  identicalContentMemberCount?: number;
  contentLoading?: boolean;
  contentObservedThisSession?: boolean;
  /**
   * `TASK-0034` D — the pair identifying the current selection. `onReveal`
   * is called with **this and nothing else**: the panel never assembles a
   * path itself, it only asks the backend to act on an identity it already
   * has.
   */
  reference?: BrainNodeRef | null;
  onReveal?: (reference: BrainNodeRef) => void | Promise<void>;
  revealBusy?: boolean;
  /** Already a short, user-facing message — never an absolute path. */
  revealError?: string | null;
  revealActionLabel?: string;
  revealBusyLabel?: string;
  /**
   * `TASK-0035` B — the dedicated, exact and paginated page of the
   * selection's direct children, independent of `detail.children` (which
   * comes from the bounded map projection and is not an exhaustive list).
   * `null` while none has been read yet.
   */
  childrenPage?: NodeChildrenPage | null;
  childrenLoading?: boolean;
  onNextChildrenPage?: () => void;
  onPreviousChildrenPage?: () => void;
  hasPreviousChildrenPage?: boolean;
  /**
   * `TASK-0035` C — "Copier le chemin", the same `BrainNodeRef`-only
   * boundary as `onReveal`: the panel never assembles a path, it only asks
   * the backend to act on an identity it already has.
   */
  onCopyPath?: (reference: BrainNodeRef) => void | Promise<void>;
  copyBusy?: boolean;
  /** Already a short, user-facing message — never an absolute path. */
  copyError?: string | null;
  copyActionLabel?: string;
  copyBusyLabel?: string;
}

export interface PanelStrings {
  title: string;
  empty: string;
  loading: string;
  name: string;
  kind: string;
  path: string;
  size: string;
  modified: string;
  parent: string;
  children: string;
  diagnostic: string;
  noDiagnostic: string;
  noParent: string;
  noChildren: string;
  childrenPrevious: string;
  childrenNext: string;
  rootPath: string;
  kinds: Record<MapNode["kind"], string>;
}

export function formatBytes(bytes: number, locale: "fr" | "en"): string {
  const units = ["B", "kB", "MB", "GB", "TB"];
  if (bytes <= 0) return `0 ${units[0]}`;
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${new Intl.NumberFormat(locale === "fr" ? "fr-CA" : "en-CA", {
    maximumFractionDigits: value >= 10 ? 0 : 1,
  }).format(value)} ${units[exponent]}`;
}

export function formatInstant(unixMs: number | null, locale: "fr" | "en"): string {
  if (unixMs === null) return "—";
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-CA" : "en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(unixMs));
}

export default function DetailsPanel({
  detail,
  loading,
  onSelect,
  locale,
  strings,
  contentObservation = null,
  contentSummary = null,
  identicalContentMemberCount = 0,
  contentLoading = false,
  contentObservedThisSession = false,
  reference = null,
  onReveal,
  revealBusy = false,
  revealError = null,
  revealActionLabel = "Ouvrir dans l'Explorateur",
  revealBusyLabel = "Ouverture…",
  childrenPage = null,
  childrenLoading = false,
  onNextChildrenPage,
  onPreviousChildrenPage,
  hasPreviousChildrenPage = false,
  onCopyPath,
  copyBusy = false,
  copyError = null,
  copyActionLabel = "Copier le chemin",
  copyBusyLabel = "Copie…",
}: DetailsPanelProps) {
  if (loading) {
    return (
      <section className="details" aria-label={strings.title}>
        <p className="details__empty">{strings.loading}</p>
      </section>
    );
  }
  if (!detail) {
    return (
      <section className="details" aria-label={strings.title}>
        <p className="details__empty">{strings.empty}</p>
      </section>
    );
  }

  const { node, parent } = detail;
  return (
    <section className="details" aria-label={strings.title}>
      <h2 className="details__name">{node.name}</h2>

      {reference && onReveal ? (
        <p className="details__reveal">
          <button
            type="button"
            data-testid="reveal-in-explorer"
            disabled={revealBusy}
            onClick={() => void onReveal(reference)}
          >
            {revealBusy ? revealBusyLabel : revealActionLabel}
          </button>
          {revealError ? (
            <span className="details__reveal-error" data-testid="reveal-error" role="alert">
              {revealError}
            </span>
          ) : null}
        </p>
      ) : null}

      {reference && onCopyPath ? (
        <p className="details__copy">
          <button
            type="button"
            data-testid="copy-path"
            disabled={copyBusy}
            onClick={() => void onCopyPath(reference)}
          >
            {copyBusy ? copyBusyLabel : copyActionLabel}
          </button>
          {copyError ? (
            <span className="details__copy-error" data-testid="copy-error" role="alert">
              {copyError}
            </span>
          ) : null}
        </p>
      ) : null}

      <dl className="details__list">
        <div className="details__row">
          <dt>{strings.kind}</dt>
          <dd>{strings.kinds[node.kind]}</dd>
        </div>
        <div className="details__row">
          <dt>{strings.path}</dt>
          <dd className="details__path">{node.relativePath || strings.rootPath}</dd>
        </div>
        <div className="details__row">
          <dt>{strings.size}</dt>
          <dd>{formatBytes(node.sizeBytes, locale)}</dd>
        </div>
        <div className="details__row">
          <dt>{strings.modified}</dt>
          <dd>{formatInstant(node.modifiedUnixMs, locale)}</dd>
        </div>
        <div className="details__row">
          <dt>{strings.diagnostic}</dt>
          <dd className={node.accessDiagnostic ? "details__diagnostic" : undefined}>
            {node.accessDiagnostic ?? strings.noDiagnostic}
          </dd>
        </div>
      </dl>

      <h3 className="details__subtitle">{strings.parent}</h3>
      {parent ? (
        <button type="button" className="details__link" onClick={() => onSelect(parent.id)}>
          {parent.name}
        </button>
      ) : (
        <p className="details__empty">{strings.noParent}</p>
      )}

      <h3 className="details__subtitle">
        {strings.children}{" "}
        <span
          className="details__count"
          data-testid="children-total"
          data-total={childrenPage?.total ?? 0}
          data-next-cursor={childrenPage?.nextCursor ?? ""}
          data-index-revision={childrenPage?.indexRevision ?? ""}
          data-limit={childrenPage?.limit ?? ""}
        >
          {childrenPage ? childrenPage.total : 0}
        </span>
      </h3>
      {childrenLoading ? (
        <p className="details__empty">{strings.loading}</p>
      ) : !childrenPage || childrenPage.items.length === 0 ? (
        <p className="details__empty">{strings.noChildren}</p>
      ) : (
        <>
          <ul className="details__children" data-testid="children-list">
            {childrenPage.items.map((child) => (
              <li key={child.nodeId}>
                <button
                  type="button"
                  className="details__link"
                  data-testid="child-node"
                  data-node-id={child.nodeId}
                  onClick={() => onSelect(child.nodeId)}
                >
                  <span className="details__child-kind" aria-hidden="true">
                    {child.kind === "directory" ? "▸" : child.kind === "skipped" ? "⃠" : "·"}
                  </span>
                  {child.name}
                  <span className="details__child-meta">{strings.kinds[child.kind]}</span>
                </button>
              </li>
            ))}
          </ul>
          {hasPreviousChildrenPage || childrenPage.nextCursor ? (
            <p className="details__children-pagination">
              <button
                type="button"
                data-testid="children-previous"
                disabled={!hasPreviousChildrenPage}
                onClick={onPreviousChildrenPage}
              >
                {strings.childrenPrevious}
              </button>
              <button
                type="button"
                data-testid="children-next"
                disabled={!childrenPage.nextCursor}
                onClick={onNextChildrenPage}
              >
                {strings.childrenNext}
              </button>
            </p>
          ) : null}
        </>
      )}

      {node.kind === "file" ? (
        <ContentObservationsPanel
          observation={contentObservation}
          summary={contentSummary}
          identicalMemberCount={identicalContentMemberCount}
          loading={contentLoading}
          observedThisSession={contentObservedThisSession}
          locale={locale}
        />
      ) : null}
    </section>
  );
}
