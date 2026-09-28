TASK_ID: TASK-0050 — final corrective after ACTION-0087
AGENT: CLAUDE CODE
RESULT: PENDING
BRANCH: build/v0.2-a34-v1-runtime-legend

SUMMARY:
- ACTION-0087 confirmed node-diagnostic is not reachable from a published Index.
- No Rust/backend change is allowed.
- Execute .orchestrator/NEXT_PROMPT.md completely.
- Prove 23/23 reachable keys in real WebView2, 24/24 legend keys, and the single diagnostic exception separately.

BLOCKERS_TO_CLOSE:
- Reproducible WebView2 harness for all 23 reachable keys.
- Strict computed-signature assertions map ↔ legend.
- Explicit node-diagnostic invariant exception with deterministic coverage.
- New final TASK-0050-webview2.json.

NEXT_ORCHESTRATOR_DECISION:
- Independent re-control of TASK-0050 after execution. No TASK-0051.
