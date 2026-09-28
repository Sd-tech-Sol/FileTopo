TASK_ID: TASK-0050 — final corrective after ACTION-0087
AGENT: CLAUDE CODE
RESULT: BLOCKED
BRANCH: build/v0.2-a34-v1-runtime-legend

SUMMARY:
- scripts/task0050-webview2.mjs rewritten: real NTFS junction for
  node-skipped (cleaned up after), keyboard activation of DEC-0034 aggregate
  pills (a raw mouse click is silently absorbed by the SVG canvas's own
  pan onPointerDown — the pill has no stopPropagation; focus()+Enter is
  what actually works, matching its own onKeyDown), recursive ancestor
  reveal for nested paths, strict equality assertion of the 23 reachable
  keys (no longer a subset check), a real deterministic proof of
  node-diagnostic (the harness itself runs `pnpm vitest run
  src/map/mapLegend.test.tsx` via spawnSync and records the real PASS/FAIL,
  plus asserts the commands.rs:745-749 invariant text), and real computed
  CSS-signature comparison between map and legend (stroke-width,
  stroke-dasharray, fill-opacity, font-weight, opacity), not just recorded
  class-name overlap.
- New unit test locking node-diagnostic's shared primitive/class and FR/EN
  text (mapLegend.test.tsx, 6/6 PASS).
- Falsifications replayed by hand and restored: dropping a reachable key,
  or reintroducing "double" text for node-cross-linked, both fail the
  targeted tests.
- 21 of 23 reachable keys reliably materialise through real product
  gestures. `intra-approved` and `intra-suggestion` never render in real
  WebView2 despite both endpoints being visible on screen at read time
  (proven indirectly: other edges touching the same nodes do render).
  Several reveal orderings were tried; cause not confirmed. Full detail in
  docs/tasks/TASK-0050-v1-runtime-legend-p10.md section Q.
- No docs/performance/runs/TASK-0050-webview2.json was republished: a
  21/23 result does not satisfy the strict 23/23 equality ACTION-0087
  requires, and publishing a partial artifact would misrepresent the state.
- No Rust changed.

VALIDATIONS:
- pnpm test: 632/632 PASS (frontend).
- pnpm check: PASS.
- pnpm build: PASS.
- pnpm tauri build --debug --no-bundle: PASS.
- git diff --check: PASS.
- scripts/audit-public-readiness.ps1 -AllowRemotes: PASS (670 files, no
  sensitive pattern).
- Real WebView2 runs: many, used to develop/diagnose the harness; final
  run still fails on the strict-equality assertion (21/23), by design (no
  false PASS was forced).

FILES CHANGED:
- scripts/task0050-webview2.mjs
- src/map/mapLegend.test.tsx
- docs/tasks/TASK-0050-v1-runtime-legend-p10.md (section Q)
- docs/ai/CURRENT_STATE.md, NEXT_ACTION.md, HANDOFF.md, VALIDATION.md,
  CHANGELOG_AI.md

NEXT_ORCHESTRATOR_DECISION:
- Choose between (a) instrumenting MapApp.tsx/composedScenario to observe
  brain.relations/byId live during the reveal sequence to confirm whether
  intra-approved/intra-suggestion not rendering is a product bug or an
  automation-technique limit, or (b) accepting a different proof scenario
  (a smaller dedicated synthetic fixture where these two relations are the
  ONLY edges on the chosen node, removing the shared-window variable).
- No TASK-0051. Independent control still required before any VERIFIED.
