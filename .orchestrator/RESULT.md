TASK_ID: TASK-0034 — V1 Find & Open — passe corrective 2 (late invalidation, query normalization)
AGENT: CLAUDE
RESULT: DONE
BRANCH: build/v0.2-a18-v1-find-open
GO: .orchestrator/NEXT_PROMPT.md, on top of 6781666 (which carries ACTION-0053)

SUMMARY:
- ACTION-0053 confirmed `SearchCoordinator` closes the race once a new
  search has actually begun, but found two finer locks in its wiring:
  (1) invalidation only happened from the `useEffect` reacting to state,
  never synchronously in the event that changed intent; (2) the coordinator
  compared the raw field value to the backend's normalized `SearchPage.query`
  (`trim()` + 200 chars), silently dropping legitimate queries with
  leading/trailing spaces or over that bound.
- Both closed without touching Rust IPC, `Index::query_nodes()`, or the
  Explorer boundary — no defect was demonstrated there.

LOCK 1 — SYNCHRONOUS INVALIDATION AT THE POINT INTENT CHANGES:
- `searchCoordinator` (the ref) moved up in `MapApp.tsx`, next to the other
  refs, so it's in scope for `onFocusBrain`/`selectNode`/`changeProjection`,
  defined earlier in the file than its old declaration site allowed.
- New `updateSearchQuery(value)`: calls `searchCoordinator.invalidate()`
  then `setSearchQuery(value)`, synchronously, in the same call stack as the
  `onChange` event — not the `useEffect` that reacts to `searchQuery`
  afterward. The input's `onChange` now calls this instead of
  `setSearchQuery` directly.
- `onFocusBrain`: `searchCoordinator.invalidate()` right after the
  "same brain, no-op" guard, before any state change.
- `selectNode`: same invalidation in its branch that moves focus to another
  already-displayed brain.
- `changeProjection`: **conditional** invalidation —
  `if (current.focusedBrainId !== brainId) searchCoordinator.invalidate();`
  — right before `setComposed(focusBrain(...))`. Unconditional would have
  been wrong: this same branch also runs when `activateSearchHit()`
  activates a hit inside the brain that's already focused (the common case,
  search being scoped to the focused brain); invalidating there would
  cancel an unrelated in-flight search on every hit activation.
- `clearSearch()` and the empty-query branch of the search effect already
  invalidated synchronously (prior pass) — unchanged.
- Principle: `invalidate()` is a plain JS counter, independent of React's
  render/effect scheduling. Calling it directly, in the same call stack as
  the user action, closes the window regardless of how React happens to
  schedule what follows — waiting for an effect reopens exactly that race.

LOCK 2 — QUERY CANONICALIZATION MATCHING THE BACKEND:
- New pure `canonicalizeSearchQuery(query)` in `searchCoordinator.ts`:
  `Array.from(query.trim()).slice(0, SEARCH_QUERY_MAX_CHARS).join("")`,
  `SEARCH_QUERY_MAX_CHARS = 200` exported and documented as tied to the
  identically-named Rust constant in `commands.rs::search_nodes`.
  `Array.from` (not a raw `.slice`) counts Unicode codepoints the same way
  Rust's `.chars()` does, so a surrogate pair is never split.
- `runSearch` applies this before building `params.query` — the coordinator
  and the IPC call now speak the same canonical form the backend echoes
  back. The visible input field state stays the raw, as-typed value; only
  the identity sent onward is canonicalized.

IDENTITY COMPLETENESS:
- `offset` added to `SearchResponseIdentity`; `runCoordinatedSearch` now
  also rejects a response whose `offset` doesn't match the request's,
  alongside `brainId`/`query`/revision. `SearchPage.offset` already existed
  in the product DTO — no new IPC field.

PROOFS — deterministic (src/map/searchCoordinator.test.ts, 18 tests total,
10 new; no WebView, no SQLite):
- Invalidates the in-flight request the instant intent changes to a new
  query, before that query's own search begins (mirrors `updateSearchQuery`
  calling `invalidate()` synchronously ahead of the effect-launched search).
- Same for a brain switch, before that brain's own search begins.
- Drops a response whose offset doesn't match the request.
- Wiring test extended: `runSearch`'s block also contains
  `canonicalizeSearchQuery(query)`.
- New wiring test: `updateSearchQuery`'s body calls `invalidate()` before
  `setSearchQuery(value)` (textual order), the JSX calls `updateSearchQuery`
  not raw `setSearchQuery`, and `onFocusBrain`/`changeProjection`/
  `selectNode` each contain `searchCoordinator.invalidate()`.
- `canonicalizeSearchQuery`: trims leading/trailing whitespace; idempotent
  on an already-canonical query; truncates 250 ASCII chars to exactly 200;
  a 201x-repeated astral emoji (surrogate pair) truncates to exactly 200
  codepoints, never split; trims before bounding (same order as Rust).
- The 8 prior-pass tests are unchanged and still pass — the
  `SearchCoordinator` primitive's own behavior didn't change, only its
  MapApp wiring and the identity it's checked against.

PROOFS — WebView2 replay (scripts/task0034-webview2.mjs, unchanged, same
REAL_ROOT 5,206-entry tree from task0034-seed-proof.py):
- Full non-regression replay, unchanged assertions from the prior pass, all
  green: 5,206 nodes indexed; needle outside ordinary projection; exact
  bounded search; rapid typing settles on the full query; Clear right after
  typing wins over an in-flight response; activation loads a new projection
  with correct selection; a real refresh advances the revision (1→2) and
  the UI auto-reloads; `map_reveal_node` spawn succeeds; no absolute-path
  leak; 0 fatal console errors.
- Verified by running the two internal commands (`python` seed step, then
  `node` replay) directly with separately captured exit codes —
  `PYTHON_EXIT=0`, `NODE_EXIT=0` — after a first invocation through the
  `.ps1` wrapper script returned exit code 1 for a reason unrelated to the
  proof itself (the JSON artifact it printed was already the full green
  result). Artifact `docs/performance/runs/TASK-0034-webview2.json`
  rewritten, byte-identical to the already-committed file (`git diff`
  empty) — same exact product behavior, no observable regression in this
  non-adversarial replay.

VALIDATIONS:
- TypeScript: vitest run — 312 PASS, 20 files (302 before this pass; +10 in
  searchCoordinator.test.ts).
- Rust: cargo test --offline — 344 PASS, 0 failed, 5 ignored — UNCHANGED, no
  Rust file touched by this pass.
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
surface, no new frontend capability, no new store, no new DTO field beyond
`offset` (already present on `SearchPage`).

LIMITS / REMAINING DEBT:
- Scope deliberately narrow, same as the prior pass: neither the Rust IPC
  surface, `Index::query_nodes()`, nor the Explorer boundary was touched —
  no defect was demonstrated there by this pass.
- `changeProjection` gains a conditional invalidation rather than being left
  untouched — the only other synchronous site in the file that changes the
  focused brain; leaving it unguarded would have reopened lock 1 through a
  path ACTION-0053 didn't name individually but that its general principle
  covers.
- The WebView2 replay remains a real-conditions non-regression check, not
  an adversarial reversed-order proof — that authority stays the
  deterministic TypeScript suite.
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
