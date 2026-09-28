TASK_ID: TASK-0050 — final multi-cell WebView2 corrective after ACTION-0088
AGENT: CLAUDE CODE
RESULT: PENDING
BRANCH: build/v0.2-a34-v1-runtime-legend

SUMMARY:
- Reuse the existing real J12 intra-relation scenario on the current HEAD.
- Keep the current TASK-0050 cell for its 21 reproducible reachable keys.
- Final real coverage is the strict union of cell A and current-HEAD J12 cell B.
- node-diagnostic remains the sole ACTION-0087 exception.
- No product instrumentation, Rust/backend, new fixture, or TASK-0051.

BLOCKERS_TO_CLOSE:
- Current-HEAD J12 replay must materially render intra-suggestion and intra-approved.
- Cell B computed visual signatures must agree with the legend.
- Union of real cells must equal all 23 reachable legend keys.
- Publish the final TASK-0050-webview2.json.

NEXT_ORCHESTRATOR_DECISION:
- Independent control of TASK-0050 after execution.
