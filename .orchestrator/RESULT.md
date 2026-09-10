TASK_ID: TASK-0033 — V1 Progressive Topographic UX — PRODUCT ACCEPTANCE pass
AGENT: CLAUDE
RESULT: DONE
BRANCH: build/v0.2-a17-v1-topographic-ux
FINAL_HEAD: (pending — see the follow-up pin commit on this branch)
GO: ACTION-0050 (docs/reviews/ACTION-0050-independent-control.md), following commit 2c1c17a

SUMMARY:
- ACTION-0050 controlled TASK-0033's delivery (393d319/2c1c17a) and found the
  code consistent with DEC-0034, but the mandatory WebView2 product replay
  missing. This pass runs that replay and fixes the two real defects it
  surfaced. TASK-0033 stays IMPLEMENTED, never self-VERIFIED.

HARNESS_REUSED_OR_ADAPTED:
- Adapted TASK-0032's proven pattern (task0032-seed-proof.py registering a
  REAL_ROOT brain directly into a fresh sandbox catalogue, then driving the
  real product through CDP) rather than building a new framework:
  scripts/task0033-seed-proof.py, scripts/task0033-webview2.mjs,
  scripts/task0033-webview2.ps1.
- One new technique this task needed and TASK-0032's script didn't:
  Emulation.setDeviceMetricsOverride (CDP) to replay both 1366x768 and
  1920x1080 in the same process — Browser.setWindowBounds is not guaranteed
  on WebView2's page-scoped CDP session and was not used.
- Card selection uses a real, CDP-dispatched mouse click
  (Input.dispatchMouseEvent) — never element.click() — the same trust
  standard TASK-0032 established for keyboard input, extended to pointer
  input since branch entry is a pointer-native gesture in this UI.

SYNTHETIC_TREE_SIZE:
- 5,206 entries (root included), REAL_ROOT, generated fresh per run and
  destroyed with the proof root. Four deliberately uneven branches to
  actually exercise directory-first and pagination rather than assume it:
  A = 120 direct subdirectories, no files at that level (pure-kind overflow);
  B = 40 directories + 90 files as direct children (the real directory-vs-file
  competition); C = 4,356 flat files, nothing else (files fill the target
  when nothing competes, long pagination chain); D = a single-child chain,
  15 levels deep (ancestry navigation). Folder names kept short (A/B/C/D/t):
  at depth 15+ a realistic absolute path under a real checkout exceeds
  Windows MAX_PATH (260 chars) without long-path support — hit this in
  practice while writing the seed script and fixed it by shortening names,
  not by reducing what the tree needed to prove.

RESULTS_1366x768:
- indexed 5,206; ordinary root projection materializedCount <= 64 (verified via
  direct map_view calls, not just DOM); A: 62 of 120 directories shown, all
  directories, aggregate omitted=58; B: 40/40 directories shown before any of
  90 files, 22 files admitted, aggregate omitted=68; C: two consecutive
  pages verified disjoint (no accumulation, no omission collision); D:
  5 real hops of explicit branch navigation, focus always materialised;
  fitScale ≈ 0.094 on A's 62-row column (Ajuster genuinely shrinks it);
  16 real "+" keydowns zoom to ≈11.5; Réinitialiser returns to scale 1
  (readable), never the exhaustive-fit scale; branch navigation into A left
  scale unchanged (pan-only); aggregate pill measured 150x34 (vs. a 240x64
  card); no internal jargon string, no absolute path, in any DOM text,
  map_view payload, or host log; DOM treeitem/aggregate counts matched the
  product's own map_view response; 0 fatal console errors.

RESULTS_1920x1080:
- Same tree, same brain, same index revision, viewport re-emulated mid
  process (no rebuild): fitScale ≈ 0.085; zoomed to ≈10.3; Réinitialiser back
  to scale 1; branch navigation scale-preserving; pill 150x34; 0 fatal
  console errors; no jargon, no path leak. Confirms the fix is not
  resolution-specific.

CAMERA_PROJECTION_METRICS: see the two blocks above — scale numbers are
copied verbatim from the run's own worldTransform() reads and from the
product's map_view responses, not estimated.

ARTIFACTS_CREATED:
- docs/performance/runs/TASK-0033-webview2.json (non-canonical engineering
  evidence, replaces nothing since none existed for TASK-0033 before).
- Two PNG screenshots per full run were written under the run's own
  .filetopo-sandbox/<variant>/ proof root during development and removed
  with it afterward (that directory is gitignored and disposable by design);
  none are committed. The JSON artifact above is the durable record.

CORRECTIONS_MADE_AND_WHY:

DEFECT_A — ordinary view could be swallowed by one arbitrary branch:
- src-tauri/src/map/projection.rs: materialize_view kept a `while queue...`
  loop that, after paging the focus's own direct children, kept recursively
  paging the children of whichever queued item it reached first — a
  leftover from before DEC-0034, harmless at the old 256-entity budget but
  actively wrong at 64: on the proof tree, `A` (120 subdirectories, first
  alphabetically) could consume nearly the whole remaining target before its
  siblings `B`/`C`/`D` got a chance to expand at all, contradicting
  DEC-0034 B's "root's own branches stay recognisable" requirement — this is
  exactly what the live replay caught (the FIRST run of this pass reproduced
  it: a 4060px-tall stray layout with `A`'s own children absorbed into
  root's page).
- FIX: removed that loop. materialize_view now pages only the focus's own
  direct children; descending a level is always a fresh call with that
  child as the new focus (DEC-0034 C), never a side effect of viewing its
  parent.
- PROOF: new Rust test
  ordinary_view_never_pulls_in_grandchildren_even_from_a_small_branch (a
  root with branches of very different sizes — 100, 5, 0 — none of their
  children ever appear in the ordinary view, each carries its own exact
  aggregate, explicit entry into the big branch does reveal its children).
  Confirmed live in WebView2: A/B/C/D all render as their own cards from
  root, each with its own aggregate pill where applicable.
- TEST FALLOUT, fixed not worked around: four pre-existing Rust tests
  (commands.rs::the_same_node_id_in_two_brains_resolves_only_inside_its_own,
  cross_commands.rs::a_node_reference_resolves_only_inside_its_own_brain,
  cross_commands.rs::a_pending_suggestion_enters_no_count_until_it_is_approved,
  relation_commands.rs::approval_moves_a_suggestion_into_the_counts_and_only_then)
  looked up a nested-path node id by reading it straight off the default
  root snapshot — which, before this fix, accidentally listed the whole
  quasi-empty fixture because it's small enough that the old multi-level
  expansion reached all of it. None of the four tests were actually about
  that depth; each was fixed to resolve the id via explicit one-segment-at-
  a-time navigation (new resolve_by_path helper in cross_commands.rs, an
  equivalent closure in relation_commands.rs), matching what the product
  itself does now. Their actual subject (brain isolation, suggestion
  counting) is unchanged and still green.

DEFECT_B — camera could end up stranded outside the visible canvas:
- .map-view can grow taller after a composition is already positioned: the
  aside panel fills in with real data asynchronously (relations, content
  observations), which changes .app__main's grid row height and .map-view
  follows it (flex: 1). Nothing re-applied the camera's bounds to the new
  size, so a view computed for the smaller, earlier height could render
  outside the now-larger canvas — reproduced live: A's card computed to a
  screen position above the canvas's own top edge.
- FIX: src/map/MapApp.tsx gains a dedicated effect, keyed only on
  [viewport.width, viewport.height], that re-applies clampView (never a
  recentre) to the current view whenever the viewport's measured size
  changes. It preserves whatever pan/zoom is already active and only pulls
  it back into valid bounds when the new size actually requires it — the
  existing composition-open effect (guarded by shouldFitComposition) is
  untouched and still owns the one legitimate full recentre, on a genuinely
  new composition.
- PROOF: live WebView2 — after switching the emulated viewport from
  1366x768 to 1920x1080 mid-session, selecting and navigating into A stayed
  coherent (details panel, DOM) at the new size with no card rendering
  outside the measured canvas.

DOC_INCONSISTENCY (flagged by ACTION-0050), fixed:
- HANDOFF.md and TASK-0033's task file both had a sentence implying fitView
  was still used on first opening. The shipped code uses readableView for
  that. Corrected in both files plus CURRENT_STATE.md.

FILES_CHANGED:
- rust: map/projection.rs (removed the grandchild-expansion loop),
  map/commands.rs, map/cross_commands.rs (new resolve_by_path helper),
  map/relation_commands.rs (source_id closure rewritten) — the latter three
  only in their four affected tests, map/projection_tests.rs (new
  regression test)
- frontend: map/MapApp.tsx (new viewport-driven clampView effect)
- new scripts: scripts/task0033-seed-proof.py, scripts/task0033-webview2.mjs,
  scripts/task0033-webview2.ps1
- new proof: docs/performance/runs/TASK-0033-webview2.json
- docs: docs/tasks/TASK-0033-v1-topographic-ux.md, docs/ai/CURRENT_STATE.md,
  docs/ai/HANDOFF.md, docs/ai/NEXT_ACTION.md, docs/ai/VALIDATION.md
  (section BF), docs/ai/CHANGELOG_AI.md

TESTS_COMPLETE:
- Rust: cargo test --offline — 328 PASS, 0 failed, 5 ignored (327 before this
  pass; +1 new regression test; the 4 fallout tests fixed, not skipped).
- TypeScript: vitest run — 289 PASS, 18 files (unchanged from the prior
  delivery — this pass touched no TS test files).
- pnpm check (tsc --noEmit): clean.
- pnpm build (tsc && vite build): clean.
- cargo build --offline: clean (one pre-existing unrelated warning,
  relations.rs::SUGGESTION_STATES dead_code).
- git diff --check: clean.

CLIPPY_STATE:
- cargo fmt --check: clean on every line this pass wrote in projection.rs,
  commands.rs, cross_commands.rs, relation_commands.rs — verified hunk by
  hunk against `git diff --unified=0`, not just by file. 143 pre-existing
  diagnostics remain elsewhere in the crate (mostly relation_commands.rs,
  outside the touched hunk), reported and left untouched.
- cargo clippy --all-targets --offline -- -D warnings: red at 26 errors,
  the same count as before this pass, none in a file this pass touched
  (verified against the exact reported line numbers).

CONFIDENTIALITY: no personal brain, no absolute path, no real data. The
REAL_ROOT tree is generated fresh by the seed script under the proof root
and destroyed with it; the catalogue registration is written directly
(TASK-0032 §7's precedent), not through the native picker, which remains
untouched by this pass.

X5: unchanged
MAIN_UNCHANGED: yes
TASK_STATUS: IMPLEMENTED
DECISION_STATUS: APPROVED (DEC-0034, unchanged)
PUSHED: yes — build/v0.2-a17-v1-topographic-ux only, no PR, no merge, no tag,
no release, no history rewrite
NEXT: independent recontrol only
