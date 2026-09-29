TASK_ID: TASK-0050 — bounded J12 navigation corrective after ACTION-0089
AGENT: CLAUDE CODE
RESULT: BLOCKED
BRANCH: build/v0.2-a34-v1-runtime-legend

SUMMARY:
- Applied ACTION-0089 corrective fully: PIVOT_PATH resolved via
  map_resolve_node (never snapshot.nodes); relationScenario.ts's selection
  dependency renamed selectNode and wired to MapApp's real selectNode
  (routes through changeProjection) instead of the raw setSelected setter;
  explicit DOM-materialization wait after every selection that may target a
  node outside the current bounded projection.
- Regression R.2 is confirmed fixed: J12 now runs to completion for the
  first time (pivot resolved+materialized, panel, real-keystroke traversal,
  real approval of S-005 all PASS) — previously failed immediately on
  "noeud introuvable: dossier-a/note-1.txt".
- A distinct, deeper product blocker is confirmed by code reading (no
  change made): relationSegments() only emits an edge when BOTH endpoints
  are in the current bounded hierarchy.byId; brain.relations is fetched
  once at brain open and never recomputed by changeProjection, which only
  re-centers the window. J12 selects endpoints sequentially, so they never
  co-exist in the same window — zero edges of any kind rendered
  (establishedEdges: 0, suggestionEdges: 0), confirming/refining Q.2.
- Per NEXT_PROMPT.md §10 stop clause: STOPPED with exact evidence. No Rust,
  no new fixture, no aggregate-reveal instrumentation added to J12.
- docs/performance/runs/TASK-0050-webview2.json NOT published (union still
  short of 23/23). Cell A unchanged, PASS (21/23).

VALIDATIONS:
- pnpm check PASS; pnpm build PASS; Tauri debug build PASS.
- Frontend tests: 632/632 PASS (one isolated, non-reproducible focus flake
  in brainIdentity.test.tsx during the full-suite run, 16/16 PASS alone —
  pre-existing flakiness, unrelated to files touched).
- Cell A WebView2 real run: PASS (21/23 reachable keys, unchanged gap, axe
  0 violations).
- Cell B (J12) real WebView2 run: executed to completion (new), but
  0 relation edges rendered on the live map — combiner refuses as expected.
- git diff --check PASS.
- Public audit PASS (674 tracked files, -AllowRemotes — origin is this
  project's own already-published public remote, no sensitive pattern).

FILES CHANGED:
- src/map/relationScenario.ts (pivot resolution, selectNode rename, wait
  helper)
- src/map/MapApp.tsx (runRelationScenario wiring only)
- docs/tasks/TASK-0050-v1-runtime-legend-p10.md (section T)
- docs/ai/{CURRENT_STATE,NEXT_ACTION,HANDOFF,VALIDATION,CHANGELOG_AI}.md
- docs/performance/runs/TASK-0026-J12-intrabrain-relations-regression-webview2.json
  (unprotected, this run's real evidence, replaces its own prior -abandon
  variant which the J12 launcher itself deletes before each run)

NOT TOUCHED: scripts/task0050-webview2.mjs (cell A), any Rust/backend file,
no new fixture, no TASK-0051, no protected canonical artifact.

NEXT_ORCHESTRATOR_DECISION:
- Choose between (a) making changeProjection recompute brain.relations
  (product behaviour change, outside a test-scenario corrective's scope) or
  (b) a dedicated synthetic fixture where the two relations to prove are
  the node's only edges, per Q.3(b)/R.3(b). Neither is pre-authorized.
