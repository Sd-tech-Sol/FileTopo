TASK_ID: TASK-0050 — bounded J12 navigation corrective after ACTION-0089
AGENT: CLAUDE CODE
RESULT: PENDING
BRANCH: build/v0.2-a34-v1-runtime-legend

SUMMARY:
- Fix J12 to resolve PIVOT_PATH with map_resolve_node.
- Route J12 selections through MapApp.selectNode, not raw setSelected.
- Wait for real bounded projection materialization before assertions.
- Preserve cell A and finish the two-cell union proof.
- No Rust/backend/new fixture/TASK-0051.

BLOCKERS_TO_CLOSE:
- Current-HEAD J12 must reach its pivot through product navigation.
- J12 must materially render intra-suggestion and intra-approved.
- Combined real coverage must equal 23/23 reachable keys.
- Publish final TASK-0050-webview2.json.

NEXT_ORCHESTRATOR_DECISION:
- Independent control of TASK-0050 after execution.
