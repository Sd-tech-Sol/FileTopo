TASK_ID: TASK-0051 — stale-core corrective
AGENT: CLAUDE CODE
RESULT: PENDING
BRANCH: build/v0.2-a35-v1-approved-relation-revocation

ACCEPTED:
- Normal intra/cross revocation implementation and proofs.

BLOCKER:
- revoke_relation rejects a human APPROVED core relation when engine is STALE.

REQUIRED:
- Remove freshness gate from revoke only.
- Preserve stale approval/output rules.
- Prove stale-core revoke in real WebView2 with DR15 reuse.
- Safe focus when stale pending suggestion is hidden.

NEXT_ORCHESTRATOR_DECISION:
- Independent re-control.
