TASK_ID: TASK-0034 — V1 Find & Open — passe corrective 3 (central applyComposition focus-change gate)
AGENT: CLAUDE
RESULT: DONE
BRANCH: build/v0.2-a18-v1-find-open
GO: .orchestrator/NEXT_PROMPT.md, on top of 40e05f4 (which carries ACTION-0054)

SUMMARY:
- ACTION-0054 confirmed the prior pass's synchronous invalidations correctly
  cover `onFocusBrain`, `selectNode` and `changeProjection` — the three
  places that mutate `composed` directly via `setComposed(...)`. But it
  found one more path: `removeBrain()` transfers focus to the first
  remaining brain when the focused brain is removed, and `navigateCross`
  builds a composition focused on a brain not yet displayed — both reach
  `applyComposition(next, ...)`, the common gate, without ever going
  through those three handlers, reopening the same event -> render/effect
  window ACTION-0053 closed for the search field.
- Closed with a single central gate in `applyComposition` rather than one
  more per-caller guard — no Rust IPC, `Index::query_nodes()`, or Explorer
  boundary touched.

CENTRAL GATE:
- `applyComposition`, right after `const current = composedRef.current;`,
  before `nextKey`, before any composition state mutation
  (`setSessions`/`setLoaded`/`setComposed`), and before the function's
  first `await` (`await loadBrain(...)` in the per-brain load loop):
  `if (current && current.focusedBrainId !== next.focusedBrainId)
  searchCoordinator.invalidate();`
- A transition that keeps the same focused brain — Open/Refresh/Rebuild on
  the currently displayed composition, or adding a brain via `onAddBrain`
  (`addBrain()` never moves focus, by contract) — invalidates nothing.
- The prior pass's direct invalidations in `onFocusBrain`/`selectNode`/
  `changeProjection` are unchanged: they protect a distinct set of paths
  (direct `setComposed` mutation, never through `applyComposition`), so
  this new gate doesn't make them redundant.
- Any future caller of `applyComposition` that changes focus is covered
  automatically — the point of a central gate over enumerating callers.

PROOFS — deterministic (src/map/searchCoordinator.test.ts, 23 tests total,
5 new; no WebView, no SQLite, no MapApp render — this repo has no test that
mounts MapApp with a mocked invoke; MapApp is only imported by
src/main.tsx, so the established convention since lifecycle.test.ts is
`?raw` source-text wiring checks, used here too):
- Invalidates the in-flight request the instant a composition transition
  moves focus off it, before that transition's own follow-up search begins
  — mirrors the removeBrain(A focused, removed) -> B focused scenario at
  the coordinator level (`invalidate()` called directly, standing in for
  the gate), then A's stale response settles and publishes nothing.
- Does not invalidate a composition transition that keeps the same focused
  brain — an unrelated in-flight search resolves and publishes normally.
- Structural: within applyComposition's source block,
  `current.focusedBrainId !== next.focusedBrainId` precedes
  `searchCoordinator.invalidate()`, which precedes the block's first
  `await`.
- Structural: `onRemoveBrain` calls
  `applyComposition(removeBrain(current, order, brainId))`.
- Structural: `navigateCross` builds
  `focusBrain(addBrain(current, order, brainId), order, brainId)` (a focus
  necessarily different from current, since brainId isn't yet displayed)
  and hands it to `applyComposition(next, ...)`.
- The 18 prior-pass tests are unchanged and still pass — SearchCoordinator/
  runCoordinatedSearch didn't change behavior, only MapApp's wiring
  extended.

PROOFS — WebView2 replay (scripts/task0034-webview2.mjs, unchanged, new
REAL_ROOT 5,206-entry tree from task0034-seed-proof.py):
- Full non-regression replay, unchanged assertions, all green — same as
  the prior two passes. NEXT_PROMPT.md §3 explicitly waives fabricating an
  adversarial race in WebView2 for this lock; the deterministic TypeScript
  suite is the authority.
- Verified by running the two internal commands (`python` seed step, then
  `node` replay) directly with separately captured exit codes —
  `PYTHON_EXIT=0`, `NODE_EXIT=0`. Artifact
  `docs/performance/runs/TASK-0034-webview2.json` rewritten, byte-identical
  to the already-committed file (`git diff` empty).

VALIDATIONS:
- TypeScript: vitest run — 317 PASS, 20 files (312 before this pass; +5 in
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
surface, no new frontend capability, no new store, no new DTO field.

LIMITS / REMAINING DEBT:
- Scope deliberately narrow, same as the prior two passes: neither the Rust
  IPC surface, `Index::query_nodes()`, nor the Explorer boundary was
  touched — no defect was demonstrated there by this pass.
- The prior pass's direct invalidations (onFocusBrain/selectNode/
  changeProjection) were kept rather than removed in favor of the sole
  central gate — the prompt explicitly allows leaving them if they stay
  clear and idempotent, and they cover a path (direct `composed` mutation)
  the new gate does not.
- No caller of `applyComposition` beyond `onRemoveBrain`/`navigateCross`
  was individually audited — the guarantee holds because the gate sits at
  the common boundary, not because every caller was enumerated.
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
