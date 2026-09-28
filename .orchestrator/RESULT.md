TASK_ID: TASK-0050 — corrective pass after ACTION-0086
AGENT: CLAUDE CODE
RESULT: BLOCKED
BRANCH: build/v0.2-a34-v1-runtime-legend

SUMMARY:
- node-cross-linked FR/EN text corrected to describe the real rendering (a
  single heavy solid outline, never a double contour); a targeted Vitest
  test now locks this and passes (5/5).
- Drove the real debug build through WebView2 (CDP) and validated, with real
  product gestures only (no DOM injection), a sequence that materializes
  23 of the 24 legend keys: selecting an already-rendered block without
  changing focus surfaces node-linked/node-cross-linked together with their
  relation partners; approving exactly one suggestion per family (intra and
  inter) while priming the right folders via real navigation surfaces
  intra/inter-suggestion and intra/inter-approved alongside
  intra/inter-established, inter-crossing and the -touching variants; a real
  NTFS directory junction (`mklink /J`, no admin rights) surfaces
  node-skipped.
- Blocked on node-diagnostic: `src-tauri/src/map/commands.rs:745-749`
  refuses to publish ANY index once `scan.diagnostics` is non-empty, even on
  a brain's first scan, with no acceptance path — confirmed by the
  SCAN_INCOMPLETE test family in `source_availability_tests.rs`, and
  `access_diagnostic` is never `Some(...)` anywhere in the Rust backend
  (code or tests). Proving this key in real WebView2 would require a Rust
  change, out of scope for a legend corrective pass without explicit GO
  (TASK-0050 §K: "no Rust expected; STOP unless imperative").
- Flagged to Sébastien; decision: STOP, document, commit only the already-
  safe text/test fix. No TASK-0050-webview2.json republished — publishing
  one at 23/24 would have implied a finished proof when the harness that
  produces it was never replayed to completion.

FILES_TOUCHED:
- src/map/mapStrings.ts, src/map/map.css, src/map/mapLegend.test.tsx (safe,
  committed, verified: pnpm test 631/631, pnpm check, pnpm build, audit
  public-readiness -AllowRemotes, git diff --check all PASS).
- docs/tasks/TASK-0050-v1-runtime-legend-p10.md (section O),
  docs/ai/{CURRENT_STATE,NEXT_ACTION,HANDOFF,VALIDATION,CHANGELOG_AI}.md.
- scripts/task0050-seed-proof.py tried (NTFS junction technique confirmed
  working) then restored to its original content; nothing committed there.

NOT_DONE / LIMITS:
- No new TASK-0050-webview2.json artifact. The 23/24 sequence was validated
  interactively via CDP, not turned into the final scripted, asserting
  harness — that work depends on first resolving node-diagnostic's scope.
- Tauri debug build / full WebView2 harness run not repeated end-to-end for
  this corrective; only the targeted frontend validations above ran.

NEXT_ORCHESTRATOR_DECISION:
- Sébastien decides between (a) amending DEC-0048 §C to retire or requalify
  node-diagnostic as a documented gap (like P-19), or (b) authorizing the
  minimal Rust change that would let an index with a known diagnostic
  publish. Until then TASK-0050 / F-014 / P-10 stay BLOCKED, never VERIFIED.
  No TASK-0051.
