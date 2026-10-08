# NEXT_PROMPT — TASK-0057 — REAL_ROOT Relations Surface Closure

**TARGET_AGENT:** CLAUDE CODE
**RECOMMENDED_MODEL:** Claude Opus 5.5
**RECOMMENDED_EFFORT:** High
**STATUS:** READY
**BRANCH:** `build/v0.2-a41-v1-real-root-relations`
**BASE:** `ca17df50d1fa904e8387628347bbf2f9792b9ae8`

## Session

**Do /clear before this task.**

This is a separate product correction after TASK-0056 correctly stopped
BLOCKED. All context is versioned.

Fast-forward only, clean tree.

Read:
1. AGENTS.md
2. docs/reviews/ACTION-0106-task0056-independent-control.md
3. docs/decisions/DEC-0053-generic-relations-real-root.md
4. docs/tasks/TASK-0057-v1-real-root-relations.md
5. TASK-0056 result + parity matrix
6. relation_commands.rs
7. brains.rs SourceKind/source_fixture
8. rule_engine.rs
9. RelationsPanel.tsx / ReviewQueuePanel.tsx

## Mission

Fix one thing only:

> the core same-brain relation surface must work on REAL_ROOT; only legacy
> TASK-0017 demonstrations/self-check remain fixture-scoped.

Do not redesign the engine.

## Important: all six actions

Do not fix just the three reads that exposed the bug.

REAL_ROOT must support:
- open;
- node relations;
- review queue;
- approve;
- reject;
- revoke.

## Source boundary

Generic paths must not require source_fixture().

legacy_fixture_spec:
- frozen relation fixture => Some;
- other valid synthetic => None;
- REAL_ROOT => None;
- corrupt/unknown synthetic => error.

Self-check remains fixture-only.

## DTO

For generic relation DTOs only:
`fixtureId: string | null`.

- synthetic => same fixture id as before;
- REAL_ROOT => null.

Do not put sourceRef, UUID, path, path hash or account data there.

## Real proof

Use a disposable REAL_ROOT with existing core-rule inputs.

Through the product:
- observe content if required;
- run dre-v1;
- open relation surface;
- verify deterministic relation/provenance/direction;
- open queue;
- approve, revoke, reject;
- restart and verify persistence.

No legacy seed on REAL_ROOT.

## Final acceptance replay

Reuse TASK-0056 harness; do not replace it.

At corrected HEAD:
- rerun full P-22 WebView2 campaign;
- P-04/P-05/P-07 must be SATISFIED on REAL_ROOT;
- strict fingerprint identical;
- no new product gap;
- axe/fatal-console gates pass.

Rerun 3 captured full Rust suites with the existing gate script.

Any unexplained failure => BLOCKED.

## Scope

No new dependency, store, migration, relation type, rule or visual redesign.

Cross-brain relations untouched.

## Finish

- TASK-0057 IMPLEMENTED / candidate only;
- never self-VERIFIED;
- no TASK-0058;
- no Stage B/C/D;
- docs/results/artifacts updated;
- commit/push, clean tree, STOP.

The final verdict belongs to ChatGPT.
