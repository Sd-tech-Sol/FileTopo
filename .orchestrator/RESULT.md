TASK_ID: TASK-0050 — final multi-cell WebView2 corrective after ACTION-0088
AGENT: CLAUDE CODE
RESULT: BLOCKED
BRANCH: build/v0.2-a34-v1-runtime-legend
HEAD: (see latest commit on this branch)

SUMMARY:
- Cellule A (scripts/task0050-webview2.mjs): CLOSED for real, reproduced
  twice identically. 21/23 reachable keys, gap exactly
  [intra-approved, intra-suggestion]. Four harness defects fixed that had
  NEVER been exercised in a completed real run before (the old strict gate
  aborted earlier every time): root/key confound on the shared kind-glyph,
  missing g-only class capture on the legend side (hierarchy-*), a
  "touching" state confound on freshly-selected exemplars, and a
  spawnSync('pnpm.cmd', …) EINVAL on this Node/Windows combo. No product
  file touched.
- Cellule B (J12 replay of src/map/relationScenario.ts): BLOCKED by a
  regression distinct from Q.2. Fixed a bootstrap gap first
  (map_not_built: brain-alpha under a fresh sandbox variant —
  map_prepare_synthetic_source + map_rebuild added at the top of the
  scenario). Then confirmed, by reading the code and the produced log,
  that MapNode::snapshot() returns a BOUNDED view (materialize_view,
  DEC-0034), never the flat corpus J12 has assumed since it was written
  (TASK-0017, before DEC-0034) — J12 can no longer find its own pivot node
  in a fresh catalogue. Reproduced twice identically.
- Per NEXT_PROMPT §9's stop clause: instrumenting J12 with cellule A's own
  aggregate-reveal logic would redo cellule A's work INSIDE J12, against
  ACTION-0088's "reuse J12 as-is" decision.

RESULT_DETAIL:
- No Rust touched. No docs/performance/runs/TASK-0050-webview2.json
  published or replaced. No canonical historical artefact touched (only
  the unprotected -abandon variant of the J12 replay was written, as proof
  of the block, twice identically).
- Files changed: scripts/task0050-webview2.mjs, scripts/task0050-webview2.ps1,
  scripts/task0050-combine-webview2.mjs (new, never run to success),
  src/map/relationScenario.ts.
- Validations PASS on the final state: 632/632 frontend tests, pnpm check,
  pnpm build, Tauri debug build, git diff --check, public audit
  (673 files, -AllowRemotes, no sensitive pattern).
- Full detail: docs/tasks/TASK-0050-v1-runtime-legend-p10.md section R.

NEXT_ORCHESTRATOR_DECISION:
- Independent control of cellule A (21/23, four harness fixes) is owed
  before any further attempt.
- Choose between (a) diagnosing/fixing J12's pivot lookup under the bounded
  view (a test-scenario change, not necessarily product), or (b) Q.3's
  option (b): a dedicated synthetic fixture where the two missing
  relations are the ONLY edges of the chosen node.
- TASK-0050 stays BLOCKED. No TASK-0051.
