TASK_ID: TASK-0033 — V1 Progressive Topographic UX
AGENT: CLAUDE
RESULT: DONE
BRANCH: build/v0.2-a17-v1-topographic-ux
FINAL_HEAD: (pending — see the follow-up pin commit on this branch)
GO: 8b62187, child of 8ec4708

SUMMARY:
- FileTopo's topographic view now targets a small, human-readable map above a
  large index instead of filling up to 256 real blocks plus their aggregates
  on every projection.
- TASK-0032 was already VERIFIED in scope by ACTION-0049 before this session,
  but that commit never updated the five durable docs (CURRENT_STATE.md,
  HANDOFF.md, VALIDATION.md, CHANGELOG_AI.md, the TASK-0032 file), which kept
  contradicting the verdict already on the branch. Corrected as part of this
  delivery, no technical content changed by that correction.

CHANGE_A — ordinary projection targets 64 real blocks, directories first:
- src-tauri/src/map/projection.rs: ORDINARY_MATERIAL_TARGET = 64 replaces
  MATERIAL_BUDGET (256) as the fill target for an ordinary focus.
  VIEW_BUDGET = 512 and MATERIAL_BUDGET stay the only hard ceilings,
  unchanged. effective_target =
  ORDINARY_MATERIAL_TARGET.max(selected.len()).min(MATERIAL_BUDGET) replaces
  MATERIAL_BUDGET in the three children_page calls only; the pre-existing
  ancestry-overflow guard is untouched.
- No new sort was written. idx_nodes_child_order
  (parent_id, child_order_rank, name_fold, id — hierarchy.rs, in place since
  DEC-0030) already orders every page directories-before-files
  (child_order_rank is a generated column: 0 for a directory, 1 otherwise).
  Filling a smaller target is the only thing that changed, and it is what
  makes directories win.
- Ancestry/focus stay prioritised even past the target: a deep ancestry chain
  is never trimmed, and an explicitly targeted file materialises with its own
  ancestry as bounded context rather than pulling in surrounding siblings.

CHANGE_B — the omitted-children indicator is a compact pill, not a fake folder:
- ViewAggregate (Rust) is unchanged — exact counts, continuation cursor,
  DEC-0031 untouched.
- src/map/MapView.tsx draws a small pill (AGGREGATE_PILL_MIN_WIDTH=96,
  height=34, capped at 150 wide — well under a 240x64 card) centred inside
  the slot the layout already reserved (so nothing overlaps), with a single
  product-vocabulary function, aggregateLabel() — "+N élément(s) — Voir la
  suite" — never the backend's internal reason strings. The same function
  feeds both the SVG pill and the fallback toolbar button in MapApp.tsx.

CHANGE_C — no more automatic global fit on every projection change:
- src/map/viewState.ts gains readableView() (READABLE_SCALE=1, adjusted by
  the existing scaleBounds so a tiny world isn't left floating and a huge one
  simply overflows) and recenterOnFocus() (a named alias of
  ensureRectVisible at this call site: pan-only, scale never changes).
- src/map/MapApp.tsx: the effect following projectionKey — fired by branch
  navigation, an expanded aggregate or a refresh — used to call
  fitView(world, viewportRef.current) every time, overwriting the user's own
  zoom/pan. It now calls recenterOnFocus. The composition-open effect and the
  "Réinitialiser" button use readableView, anchored on the selection or the
  active brain's root. Only "Ajuster à l'écran" (and the "f"/"F" selection
  shortcut) still call fitView(world, …) — the one explicit action DEC-0034 E
  reserves for a global fit. MapView.tsx's "r"/"R" shortcut follows the same
  rule via a local anchor (resetAnchorRect).
- Grid background (SVG <pattern>, referenced by .map-territory__frame, pans
  and zooms with content) and a darker, dominant root colour were added as a
  light step toward DEC-0034 F's direction; the directional relation palette
  (outgoing/incoming/bidirectional colours) was deliberately left for a later
  slice, per DEC-0034 G.

PROOFS_ADDED:
- src-tauri/src/map/projection_tests.rs: ordinary_view_targets_at_most_sixty_four_real_blocks
  (exactly 64 on a much larger mixed tree), directories_are_retained_over_files_when_the_ordinary_target_cuts_the_page
  (50/50 directories retained before a single one of 100 files, exact
  omission count), deep_ancestry_is_never_dropped_and_a_targeted_file_stays_bounded
  (a 100-ancestor chain fully materialised for a file focus, zero aggregates).
- src/map/viewState.test.ts: readableView centres at the readable scale,
  never shrinks below it on a huge world, scales a tiny world up to the
  bounds floor, stays within bounds; recenterOnFocus keeps scale, is a no-op
  when already visible, pans just enough otherwise.
- src/map/projection.test.tsx: the aggregate pill's width/height stay well
  under a card's; the rendered text contains no backend jargon and does
  contain "Voir la suite"; the Enter/Space activation test's wording updated
  to match.

VALIDATIONS:
- Rust: cargo test --offline — 327 PASS, 0 failed, 5 ignored (324 before this
  task; +3 new).
- TypeScript: vitest run — 289 PASS, 18 files (280 before; +9 new).
- pnpm check (tsc --noEmit): clean.
- pnpm build (tsc && vite build): clean.
- cargo build --offline: clean (one pre-existing unrelated warning,
  relations.rs::SUGGESTION_STATES dead_code).
- cargo fmt --check: clean on projection.rs and projection_tests.rs, the only
  two Rust files this task touched. 143 pre-existing diagnostics remain in
  other, untouched files — reported, not fixed. (A direct `rustfmt
  --edition 2021` invocation briefly reformatted unrelated files with the
  wrong edition; caught via git status and reverted with git checkout before
  this report.)
- cargo clippy --all-targets --offline -- -D warnings: red at 26 errors,
  same count as before this task, none in projection.rs or
  projection_tests.rs.
- git diff --check: clean.

LIMITS:
- NOT TESTED, declared explicitly: no WebView2 replay was run in this pass —
  neither 1366x768 nor 1920x1080, nor a large synthetic tree. Product-level
  legibility (real names readable, no overlap, live camera behaviour during
  branch navigation) is proven only at the unit/component level, not in a
  real WebView2 process. This must be covered before any VERIFIED verdict.
- Out of scope per DEC-0034 G, unchanged: no watcher/incremental/FTS5, no
  "Open in Explorer", no screen/icon preferences, no second index/catalogue/
  store, no new Canvas/WebGL/Pixi renderer, no absolute path over IPC, no
  network/cloud/LLM/MCP, no personal data.
- Directional relation colour palette (outgoing/incoming/bidirectional) from
  REFERENCE_UX_OLD_FILETOPO.md deliberately not implemented this pass.

FILES_CHANGED:
- rust: map/projection.rs (ORDINARY_MATERIAL_TARGET, effective_target),
  map/projection_tests.rs (3 new tests + fixtures)
- frontend: map/viewState.ts (readableView, recenterOnFocus), map/MapView.tsx
  (compact aggregate pill, aggregateLabel, grid pattern defs, readable reset
  shortcut), map/MapApp.tsx (focusAnchorRect, camera effects/reset button use
  readableView/recenterOnFocus, aggregate button wording), map/map.css (grid
  pattern styling, aggregate pill styling, darker root)
- tests: map/viewState.test.ts, map/projection.test.tsx (wording + new
  assertions)
- docs: docs/tasks/TASK-0032-v1-real-root.md (status corrected to VERIFIED
  per ACTION-0049), docs/tasks/TASK-0033-v1-topographic-ux.md (delivery
  section), docs/ai/CURRENT_STATE.md, docs/ai/HANDOFF.md,
  docs/ai/NEXT_ACTION.md, docs/ai/VALIDATION.md (sections BD, BE),
  docs/ai/CHANGELOG_AI.md

CONFIDENTIALITY: no personal brain, no absolute path, no real data — all
proofs use synthetic trees built by the tests themselves.

X5: unchanged
MAIN_UNCHANGED: yes
TASK_STATUS: IMPLEMENTED
DECISION_STATUS: APPROVED (DEC-0034, unchanged)
PUSHED: yes — build/v0.2-a17-v1-topographic-ux only, no PR, no merge, no tag,
no release, no history rewrite
NEXT: independent control only
