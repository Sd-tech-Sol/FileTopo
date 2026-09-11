TASK_ID: TASK-0035 — V1 Context Panel, Direct Children & Safe Copy
AGENT: CLAUDE
RESULT: DONE
BRANCH: build/v0.2-a19-v1-context-panel
GO: .orchestrator/NEXT_PROMPT.md, on top of 4b39555 (which carries
ACTION-0055 / TASK-0034 VERIFIED and the TASK-0035 spec)

SUMMARY:
- Three MVP-parity additions around the current selection, none touching
  the topographic engine: a hideable, restart-persistent details panel; an
  exact, paginated page of a folder's direct children, independent of the
  bounded map projection; "Copier le chemin", sharing its resolution/
  confinement with the existing "Ouvrir dans l'Explorateur".
- Also fixed a documentation gap this session found on arrival: TASK-0034's
  closure commit (c7a475f) had only updated NEXT_ACTION.md, never
  CURRENT_STATE.md/HANDOFF.md/CHANGELOG_AI.md, which still contradicted
  ACTION-0055's already-rendered TASK-0034=VERIFIED verdict. Corrected
  alongside this task's own entries — no technical content changed.

REUSE / ADAPT / NOT REACTIVATED (recorded before code, per NEXT_PROMPT §0):
- Reused as-is: BrainCatalog::meta()/put_meta() and catalog_meta (no new
  store); Index::children_page() (DEC-0030, already ported by TASK-0029);
  map_view/selectNode/changeProjection for focusing a child outside the
  ordinary projection; confine_indexed_target() (TASK-0034 C), unchanged.
- Adapted: reveal_node()'s resolution/confinement walk extracted into a
  shared resolve_confined_target(), called by both reveal_node and the new
  copy_target_path — one walk, two callers, not a duplicate.
- Not reactivated: no 0.1-era command; no second SQL query path for
  children (the whole point of B); no clipboard-manager frontend command
  (its own default permission set is empty, and this task grants none).

A — HIDEABLE, PERSISTENT DETAILS PANEL:
- New catalog_meta key `details_panel_visible` (brains.rs), defaulting to
  visible when absent — no schema migration. `BrainCatalog::
  ui_preferences()`/`set_details_panel_visible()`, same round-trip shape as
  `active()`/`set_active()`.
- Two minimal commands: `map_ui_preferences`, `map_ui_preferences_update`
  (bool only).
- MapApp.tsx: preference loaded once, in the same bootstrap `Promise.all`
  as fixtures/host/catalog. `toggleDetailsPanel()` touches nothing else —
  a structural test (contextPanel.test.ts) asserts its body never
  references setSelected/setSearchQuery/setComposed/setDetail/
  setChildrenPage/setLoaded. Hiding removes `<DetailsPanel>` from the
  render only; all the state feeding it lives in MapApp, so showing it
  again restores the exact same context.

B — EXACT, PAGINATED DIRECT CHILDREN:
- `map_node_children(reference, after?, limit?)` (commands.rs::
  node_children): belongs_to check, open_store, ChildCursor::decode, then
  Index::children_page() — no parallel SQL. Bounded to
  `CHILDREN_LIMIT_MAX = 50` (own product ceiling, distinct from
  hierarchy's own defensive MAX_CHILDREN_PAGE_SIZE=500 — same relationship
  SEARCH_LIMIT_MAX has to query_nodes). DTO `NodeChildrenPage`: total
  (durable child_count column), nextCursor (keyset, index+revision bound),
  indexRevision, limit — no path field.
- children_page() already refused a foreign-index, stale-revision or
  wrong-parent cursor before this task; this task only had to expose that
  faithfully through the new command.
- DetailsPanel.tsx's "Enfants directs" now reads `childrenPage`, never
  `detail.children` (the bounded projection's own non-exhaustive list —
  the old "N more children" message is gone, replaced by real pagination).
  Selecting a child calls `onSelect(nodeId)` — the exact same callback the
  existing parent/child navigation already used, no new selection path.

C — COPIER LE CHEMIN:
- Audited `tauri-plugin-clipboard-manager` before adding it: pinned to an
  exact version (`= 2.3.3`), MIT/Apache-2.0 dual license (same as this
  project's other Tauri plugins), Rust API `ClipboardExt::clipboard()
  .write_text()` (synchronous). Its own `permissions/default.toml` declares
  `permissions = []` — no frontend command granted by default, and this
  task grants none either.
- `.plugin(tauri_plugin_clipboard_manager::init())` added in lib.rs, same
  DEC-0033 H-style guarantee as the dialogue plugin: Rust-side only, no
  `clipboard-manager:*` in capabilities/default.json.
- `copy_target_path()` calls the shared `resolve_confined_target()` then
  converts with `Path::to_str()` — never `to_string_lossy()`: DEC-0033 C
  forbids the lossy conversion for resolving a source, and a silent
  replacement-character corruption would also break TASK-0035 C's own
  "exact for Unicode names" requirement. An unrepresentable component is
  refused explicitly (`indexed_target_not_representable`) instead.
  `map_copy_node_path` (lib.rs) is the only holder of the resolved text: it
  writes it via `app.clipboard().write_text(text)` and returns only
  success/generic-error. The clipboard-write failure reuses
  `MapError::RevealRefused("clipboard_write_failed")` — same variant, same
  `map_reveal_refused:` wire prefix as reveal's own confinement refusals; a
  deliberate, documented reuse rather than a second error taxonomy for an
  action that already shares the rest of its path with reveal.

PROOFS — Rust (365 total, +21 this task):
- 5 preference tests (brains.rs): absent => visible; persists across a
  reopen in both directions (visible->hidden->visible); serializes to
  nothing but the one documented boolean.
- 16 tests in new context_panel_tests.rs (#[path], same convention as
  find_open_tests.rs): pagination bounded to 50 even if more is asked;
  directories-before-files order; full coverage with no duplicate/loss
  across the whole pagination (131-child corpus, plus a grandchild placed
  under one of them on purpose, proven to never leak into the parent's own
  page); exact total from the durable column; refuses foreign brain,
  foreign-index cursor, stale-revision cursor after a republish, wrong-
  parent cursor; DTO carries no absolute path; works without a source on
  disk. Copy: refuses foreign brain, refuses reparse/skipped before any
  disk access, refuses unknown id, refuses a target that disappeared after
  indexing (on a real folder, same pattern as TASK-0034); exact Unicode
  and long-name copy (a name with a surrogate-pair emoji plus accents, a
  120-character name, both written by the test itself under the resolved
  synthetic-fixture root — strict string comparison against the expected
  path); proven to share reveal's own confinement walk.
- Structural (lib.rs): all four new commands exposed; map_copy_node_path
  takes only `reference: map::brains::BrainNodeRef`; the existing generic
  "no exposed command accepts a path" test automatically covers the new
  commands too since it iterates everything exposed; clipboard plugin
  initialised; no clipboard-manager:* permission in the capability.

PROOFS — TypeScript (339 total, +22 this task):
- 14 tests added to DetailsPanel.test.tsx: copy button hidden/active per
  reference/onCopyPath, calls onCopyPath with exactly the reference (like
  onReveal), busy/error states, reveal and copy coexist; exact total from
  childrenPage (never detail.children, deliberately left empty in these
  tests to prove which source is used); loading state distinct from empty;
  selecting a child calls onSelect(nodeId); pagination bounded, ordinary
  keyboard-operable buttons, disabled at the right edge (first/last page),
  absent when everything fits on one page; no absolute-path-shaped string
  rendered.
- 8 structural tests in new contextPanel.test.ts (same `?raw` convention as
  lifecycle.test.ts/searchCoordinator.test.ts — no test in this repo mounts
  MapApp itself, it's only imported by src/main.tsx): preference loaded
  once at boot; toggle isolated from all other state; toggle button and
  conditional render wired to the same preference; map_node_children
  invoked without ever assembling a path; the children effect depends only
  on [selected, fetchChildrenPage], same principle as the sibling `detail`
  effect; child selection reuses onSelect; map_copy_node_path invoked with
  exactly { reference }; copy error clears on selection change, same guard
  as reveal.
- Migrated one existing test (mapView.test.tsx) that assumed
  detail.children was the exhaustive source; now supplies an explicit
  childrenPage with detail.children left empty on purpose — proof the
  section reads the right source, not just that buttons appear.

PROOFS — WebView2 replay, THREE REAL LAUNCHES with TWO REAL PROCESS
RESTARTS (scripts/task0035-seed-proof.py, derived from task0034's; same
REAL_ROOT 5,206-entry tree, same flat branch C with 4,356 direct children;
scripts/task0035-webview2.mjs takes a phase argument; scripts/
task0035-webview2.ps1 orchestrates the three launches on the SAME sandbox
variant so the preference genuinely persists):
- Phase 1 (fresh profile): panel visible by default; C selected via real
  keyboard navigation in the root's own already-shown children list (see
  harness note below, not an SVG-coordinate click); C's pagination: exact
  total (4,356) cross-checked against a direct invoke, page-forward with
  no overlap against page 1, page-back exactly restoring page 1; selecting
  the needle (C's first child, never itself a materialised map card)
  syncs both the map (aria-activedescendant) and the details panel;
  map_reveal_node invoked directly on a synthetic target (spawn
  succeeded); Copier le chemin clicked for real; Masquer les détails by a
  real keystroke.
- (real close, real restart)
- Phase 2: panel still hidden after the real restart; Afficher les
  détails by a real keystroke.
- (real close, real restart)
- Phase 3: panel still visible after the second real restart.
- The OS clipboard is read by task0035-webview2.ps1 itself, right after
  phase 1's process really closes — the same clipboard
  tauri-plugin-clipboard-manager just wrote to from inside the app —
  compared case-sensitively to the expected path. Neither this script nor
  the Node/CDP script ever prints the path; the artifact keeps only
  `copyClipboardMatchesExpectedPath: true`.
- Result: docs/performance/runs/TASK-0035-webview2.json — all listed
  proofs true, 0 fatal console errors across all three phases, no
  absolute-path leak.
- Harness pitfall found and fixed: selecting a node by an SVG-coordinate
  click on its map card (Input.dispatchMouseEvent at the card's
  getBoundingClientRect center) — the same mechanism task0033-webview2.mjs
  uses successfully elsewhere — did not register the selection here
  (aria-selected stayed false, selection stayed on root). Replaced with
  real keyboard navigation in the already-focused node's own children
  list (the root auto-selects on boot and already lists its own direct
  children) — more robust, and itself extra proof that list is keyboard-
  operable. The exact cause of the missed SVG click was not investigated
  further; this task's scope is not map rendering.

VALIDATIONS:
- TypeScript: vitest run — 339 PASS, 21 files (317 before this task; +22).
- Rust: cargo test --offline — 365 PASS, 0 failed, 5 ignored (344 before;
  +21).
- pnpm check (tsc --noEmit): clean.
- pnpm build (tsc && vite build): clean.
- cargo build --offline: clean, same single pre-existing warning as before
  (relations.rs::SUGGESTION_STATES dead_code).
- git diff --check: clean.
- cargo fmt: clean on every line this task added (verified file by file);
  pre-existing debt elsewhere in the same files left untouched.
- cargo clippy --all-targets --offline -- -D warnings: red at 26 errors,
  same count and same diagnostics as before this task (two of them, in
  brains.rs and lib.rs, shifted by a few lines from this task's insertions
  — verified diagnostic by diagnostic, neither is in a line this task
  added).

CONFIDENTIALITY: no personal brain, no absolute path returned, logged, or
committed. The REAL_ROOT tree used by the replay is generated fresh by the
seed script and dies with the proof root. The clipboard comparison never
prints the path anywhere. No new frontend capability beyond the four new
commands, each auditable by name and each taking only BrainNodeRef/bool/
opaque-cursor arguments.

LIMITS / REMAINING DEBT:
- map_copy_node_path reuses reveal's `map_reveal_refused:` wire prefix
  rather than a distinct one — a deliberate, documented reuse of the
  shared confinement error, not an oversight.
- Neither the existing search/reveal IPC surface, Index::query_nodes(),
  materialize_view(), nor the Explorer boundary was touched beyond the
  shared resolve_confined_target() extraction — no defect was demonstrated
  there.
- Same debt as before this task: cargo clippy strict red at 26 (pre-
  existing, untouched); no watcher/incremental, no FTS5, no filters, no
  screen/icon preferences — all out of TASK-0035's scope, unchanged.
- Development workstation; not a modest-laptop acceptance test.

X5: unchanged
MAIN_UNCHANGED: yes
TASK_STATUS: IMPLEMENTED
DECISION_STATUS: no new DEC required; DEC-0031/0033/0034 unchanged
PUSHED: yes — build/v0.2-a19-v1-context-panel only, no PR, no merge, no
tag, no release, no history rewrite
NEXT: independent control of TASK-0035 only, on this task's proofs. No
TASK-0036 created.
