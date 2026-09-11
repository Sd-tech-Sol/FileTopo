/**
 * `TASK-0034` corrective pass — a stale search response could replace the
 * current one. `SearchCoordinator` is a monotone ticket, on the same
 * principle as `MapApp.tsx`'s existing `projectionRequest`: every launch
 * takes the next ticket, and only the request still holding the latest
 * ticket when it settles is allowed to publish anything.
 */
export class SearchCoordinator {
  private ticket = 0;

  /** Starts tracking a new request. Whatever request was outstanding before
   * this call is superseded immediately — its ticket can never match again. */
  begin(): number {
    this.ticket += 1;
    return this.ticket;
  }

  /**
   * Supersedes any outstanding request without starting a new one — a
   * brain/query/revision change with no follow-up search, or Clear.
   *
   * Callers must invoke this synchronously, in the exact same call stack as
   * the user action that changes search intent (an `onChange` handler, a
   * brain-focus handler) — never only from a `useEffect` reacting to the
   * resulting state change. A `useEffect` runs on a later render, after
   * React's own scheduling; a response already in flight can settle in that
   * window and still hold the latest ticket when it does. Calling
   * `invalidate()` directly, before that window opens, closes it regardless
   * of how React happens to schedule what comes next — `ACTION-0053`.
   */
  invalidate(): void {
    this.ticket += 1;
  }

  /** True while `ticket` is still the most recently begun request. */
  isCurrent(ticket: number): boolean {
    return ticket === this.ticket;
  }
}

export interface SearchRequestParams {
  brainId: string;
  query: string;
  offset: number;
}

/** The identity fields a search response must be checked against — the
 * product `SearchPage` satisfies this, but the coordinator only needs this
 * much of it. */
export interface SearchResponseIdentity {
  brainId: string;
  query: string;
  offset: number;
  indexRevision: number;
}

export interface SearchCoordinatorCallbacks<Page extends SearchResponseIdentity> {
  fetch: (params: SearchRequestParams) => Promise<Page>;
  onLoadingChange: (loading: boolean) => void;
  onPage: (page: Page) => void;
  onError: (error: unknown) => void;
  /** The revision the caller currently considers live for this brain, when
   * known. `undefined` skips the check rather than rejecting the page. */
  currentRevision: (brainId: string) => number | undefined;
}

/**
 * Runs one search request under `coordinator`. Only applies `onPage`,
 * `onError` or the trailing `onLoadingChange(false)` if this request is
 * still the most recent one begun on `coordinator` by the time it settles,
 * and the response still names the brain/query/offset it was asked for and
 * the revision the caller currently considers live.
 */
export async function runCoordinatedSearch<Page extends SearchResponseIdentity>(
  coordinator: SearchCoordinator,
  params: SearchRequestParams,
  callbacks: SearchCoordinatorCallbacks<Page>,
): Promise<void> {
  const ticket = coordinator.begin();
  callbacks.onLoadingChange(true);
  try {
    const page = await callbacks.fetch(params);
    if (!coordinator.isCurrent(ticket)) return;
    if (
      page.brainId !== params.brainId ||
      page.query !== params.query ||
      page.offset !== params.offset
    ) {
      return;
    }
    const liveRevision = callbacks.currentRevision(params.brainId);
    if (liveRevision !== undefined && liveRevision !== page.indexRevision) return;
    callbacks.onPage(page);
  } catch (error) {
    if (!coordinator.isCurrent(ticket)) return;
    callbacks.onError(error);
  } finally {
    if (coordinator.isCurrent(ticket)) callbacks.onLoadingChange(false);
  }
}

/**
 * The backend (`src-tauri/src/map/commands.rs::search_nodes`) normalizes the
 * incoming query with `query.trim().chars().take(SEARCH_QUERY_MAX_CHARS)`
 * before it ever reaches `SearchPage.query` — a bound of 200 Unicode
 * codepoints (`SEARCH_QUERY_MAX_CHARS` there). `runCoordinatedSearch`'s
 * identity check above compares `page.query` to `params.query` verbatim, so
 * a caller sending the raw, un-normalized field value would see a
 * *legitimate* response — leading/trailing spaces, or a query over the bound
 * — silently dropped as if it were stale.
 *
 * Canonicalizing the query with this exact same semantics *before* it
 * becomes `params.query` keeps both sides talking about the same string,
 * without weakening the staleness guard: a genuinely stale response still
 * carries the *previous* canonical query and is still rejected.
 *
 * `Array.from` (not `.slice`) is used for the bound so a codepoint outside
 * the BMP — a UTF-16 surrogate pair — is counted and truncated the same way
 * Rust's `.chars()` (Unicode scalar values) counts it, never split in half.
 */
export const SEARCH_QUERY_MAX_CHARS = 200;

export function canonicalizeSearchQuery(query: string): string {
  return Array.from(query.trim()).slice(0, SEARCH_QUERY_MAX_CHARS).join("");
}
