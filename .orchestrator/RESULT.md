TASK_ID: TASK-0034 — V1 Find & Open — passe corrective (stale search responses)
AGENT: CLAUDE
RESULT: DONE
BRANCH: build/v0.2-a18-v1-find-open
GO: .orchestrator/NEXT_PROMPT.md, on top of e873008 (which carries ACTION-0052)

SUMMARY:
- Fixed the one blocking defect ACTION-0052 found: `MapApp.tsx::runSearch()`
  applied any async search response as soon as it returned, with no ticket
  and no identity check. A stale response (rapid typing, a brain switch, a
  Clear, or a revision change) could replace the current search or clear
  `searchLoading` behind a newer, still in-flight request. The revision
  guard at activation only protected against a stale *revision*, not two
  different requests/brains sharing the same one.
- Fix is a pure, monotone-ticket coordinator, on the same principle as the
  existing `projectionRequest` ref. No IPC surface, `Index::query_nodes()`,
  or Explorer boundary touched — no defect was found there, so none was
  changed.

STALENESS MECHANISM:
- New file `src/map/searchCoordinator.ts` (no React/Tauri import — a pure,
  independently testable primitive):
  - `SearchCoordinator`: a private ticket counter. `begin()` takes the next
    ticket and immediately supersedes whatever was outstanding; `invalidate()`
    supersedes without starting a new request (the empty-query branch and
    Clear, neither of which ever calls `runSearch`); `isCurrent(ticket)`
    reports whether that ticket is still the latest.
  - `runCoordinatedSearch(coordinator, params, callbacks)`: begins a ticket,
    calls `callbacks.fetch(params)`, and on settlement only calls `onPage`
    if (a) the ticket is still current, (b) the response's `brainId`/`query`
    match what was asked, and (c) its `indexRevision` matches
    `callbacks.currentRevision(brainId)` when that's known. `onLoadingChange
    (false)` in `finally` is gated on (a) alone, so a superseded request can
    never re-open the loading flag a newer one already closed. Errors are
    dropped the same way as a stale page (no `onError` from a superseded
    request).
- `MapApp.tsx::runSearch` now delegates entirely to
  `runCoordinatedSearch<SearchPage>(searchCoordinator, {...}, {...})`; the
  fetch callback is the same `invoke("map_search_nodes", ...)` as before,
  `currentRevision` reads `loadedRef.current.get(id)?.snapshot.indexRevision`.
  The empty-query branch of the search effect and `clearSearch()` both now
  call `searchCoordinator.invalidate()` before clearing state, since neither
  ever calls `runSearch` and so nothing else would supersede a request still
  in flight when the field empties. `activateSearchHit()`'s existing revision
  guard is UNCHANGED — kept as the defensive backstop it already was, never
  the primary guard (that's now inside `runCoordinatedSearch`, before any
  publish).
- No new DTO, no new store, no new dependency: `SearchPage` already carried
  `brainId`/`query`/`indexRevision`, which is all three checks need.

PROOFS — deterministic (src/map/searchCoordinator.test.ts, 8 tests, no
WebView, no SQLite, promises resolved by hand via a `deferred<T>()` helper):
- reversed-order settlement: request "A" then "AB", "AB"'s promise resolved
  BEFORE "A"'s — only "AB" is published.
- brain switch mid-search: brain A's search still pending when brain B's
  search begins and resolves; A's late response never publishes under B.
- Clear mid-search: `invalidate()` called while a request is outstanding;
  its late response publishes neither a page nor turns loading off.
- loading ownership: the stale request's settlement never republishes
  `loading=false`; only the latest request's settlement does.
- revision change mid-flight: `currentRevision` advances between the fetch
  starting and resolving; the page carrying the old revision is dropped.
- identity mismatch: a response naming a different brainId/query than asked
  is dropped (defense in depth beyond the ticket alone).
- error from a superseded request never reaches `onError`.
- wiring check (same convention as `lifecycle.test.ts`, `MapApp.tsx` read via
  `?raw`): `runSearch`'s body contains `runCoordinatedSearch<SearchPage>
  (searchCoordinator`; the empty-query branch and `clearSearch` both contain
  `searchCoordinator.invalidate()`; no direct `setSearchPage(page)` remains;
  the activation-time revision guard text is still present unchanged.

PROOFS — WebView2 replay (scripts/task0034-webview2.mjs, same REAL_ROOT
5,206-entry tree from task0034-seed-proof.py, unchanged):
- Full non-regression replay of every TASK-0034 assertion: 5,206 nodes
  indexed; needle confirmed outside the ordinary projection; real-typed
  search exact and bounded (DOM and a direct invoke agree); empty query
  shows no results panel; activation loads a new projection with correct
  selection; a real refresh advances the revision (1→2) and the UI
  auto-reloads rather than keeping a stale page; `map_reveal_node` spawn
  succeeds on a synthetic target; no absolute-path leak; 0 fatal console
  errors.
- Two SHORT scenarios added, non-adversarial (real SQLite here is far too
  fast to reliably outrun without slowing the product itself, which this
  corrective pass was told not to do just to fabricate a race — the
  deterministic TS suite above is the authority for the reversed-order
  case):
  - rapid typing (half the needle name, then the rest with no wait in
    between) settles on the FULL query's result, never the partial one.
  - clicking "Effacer" immediately after typing, before waiting on any
    response, wins even once that in-flight response later arrives — field
    stays empty, no results panel reappears.
- Artifact updated: docs/performance/runs/TASK-0034-webview2.json.

VALIDATIONS:
- TypeScript: vitest run — 302 PASS, 20 files (294 before this pass; +8
  searchCoordinator.test.ts).
- Rust: cargo test --offline — 344 PASS, 0 failed, 5 ignored — UNCHANGED,
  no Rust file touched by this pass.
- pnpm check (tsc --noEmit): clean.
- pnpm build (tsc && vite build): clean.
- cargo build --offline: clean, same single pre-existing warning as before
  (relations.rs::SUGGESTION_STATES dead_code) — no Rust file touched.
- git diff --check: clean.
- cargo fmt / cargo clippy NOT re-run: no Rust line changed by this pass, so
  the prior state (fmt clean on touched files, clippy strict red at 26
  pre-existing errors, none in a file this pass touches) is unchanged by
  construction.

CONFIDENTIALITY: no personal brain, no absolute path returned, logged, or
committed. The REAL_ROOT tree used by the replay is generated fresh by the
existing seed script and dies with the proof root, as before. No new IPC
surface, no new frontend capability, no new store.

LIMITS / REMAINING DEBT:
- Scope deliberately narrow: neither the Rust IPC surface, `Index::
  query_nodes()`, nor the Explorer boundary was touched — no defect was
  demonstrated there by this pass.
- The two added WebView2 scenarios are real-conditions non-regression
  checks, not an adversarial reversed-order proof — that authority stays
  the deterministic TypeScript suite.
- Same debt as before this pass: cargo clippy strict red at 26 (pre-
  existing, untouched); no watcher/incremental, no FTS5, no absolute-path
  copy, no screen/icon preferences — all out of TASK-0034's scope, unchanged.

X5: unchanged
MAIN_UNCHANGED: yes
TASK_STATUS: IMPLEMENTED
DECISION_STATUS: DEC-0031/0033/0034 unchanged; no new decision required
PUSHED: yes — build/v0.2-a18-v1-find-open only, no PR, no merge, no tag,
no release, no history rewrite
NEXT: independent control only, on this pass's proofs
