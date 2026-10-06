TASK_ID: TASK-0051 — V1 Approved Relation Revocation / P-04 Closure
AGENT: CLAUDE CODE
RESULT: PENDING
BRANCH: build/v0.2-a35-v1-approved-relation-revocation

SUMMARY:
- Implement DEC-0049 for APPROVED intra + cross relations.
- revoke => delete approved relation + suggestion approved→pending atomically.
- DETERMINISTIC is never revocable.
- UI FR/EN + keyboard, restart/rebuild/isolation proofs.
- No P-19/F-042/F-046 work.

NEXT_ORCHESTRATOR_DECISION:
- Independent control after executor completion.
