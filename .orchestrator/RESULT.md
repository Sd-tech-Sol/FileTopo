TASK_ID: TASK-0052 — V1 Branch Focus & Collapse / F-042 Closure
AGENT: CLAUDE CODE
RESULT: DONE — IMPLEMENTED, awaiting independent control (never VERIFIED here)
BRANCH: build/v0.2-a36-v1-branch-focus-collapse
CODE_COMMIT: bdb5e91d677ec6dd0c64de2f93506cc1aa1ad17a

DONE:
- DEC-0050: backend branch projection (map_branch_view), exact hidden descendant
  count (SQLite recursive CTE, index-driven, no column/cache/list), collapse as a
  pure removal from the reference projection, expand = reference.
- UI FR/EN: BranchFocusPanel (native buttons, Enter/Space), word+glyph+outline on
  the map, safe focus, exit restores composition/camera/selection.
- Session-only: resume-state writes guarded; a real restart restores nothing.

PROOF: real WebView2, 2 processes around a restart, real CDP key events, every
reference recomputed from the synthetic directories on disk
(docs/performance/runs/TASK-0052-webview2.json). Seven falsifications effective.

VALIDATION: cargo test 814 ok; vitest 671 ok; tsc/build/tauri debug ok; diff-check ok.
LIMITS: see docs/ai/VALIDATION.md section DF (collapse only inside a focused branch;
watcher reload leaves the focus; cards selected by mouse; no large real root).
P-19 unchanged (PARTIELLE). F-046 unchanged. No TASK-0053.

NEXT_ORCHESTRATOR_DECISION:
- Independent control of TASK-0052.
