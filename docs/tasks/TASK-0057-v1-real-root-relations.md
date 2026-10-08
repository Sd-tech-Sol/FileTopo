# TASK-0057 — V1 REAL_ROOT Relations Surface Closure / P-04 + P-05 + P-07

- **Date:** 2026-10-08
- **Status:** `READY`
- **Branch:** `build/v0.2-a41-v1-real-root-relations`
- **Base:** `ca17df50d1fa904e8387628347bbf2f9792b9ae8`
- **Selected by:** ACTION-0106
- **Decision:** DEC-0053
- **Scope:** final Stage-A blocker only

## 1. Result

Make the existing same-brain relation surface usable on a `REAL_ROOT` brain
without changing relation semantics or the deterministic engine.

Close only the blocker found by TASK-0056.

## 2. Reuse first

Before code, map the existing paths:

- BrainRecord / SourceKind / source_fixture;
- commands::analysis_input;
- relation_commands;
- RelationStore;
- rule_engine run/status;
- content signals used by the deterministic identical-content rule;
- RelationsPanel / ReviewQueuePanel;
- TASK-0024 DR15 patterns;
- TASK-0056 WebView2 harness.

Classify:
- REUSE;
- ADAPT;
- DO NOT TOUCH.

No new dependency/store/engine.

## 3. Backend boundary

Implement DEC-0053.

The generic relation paths must never require `source_fixture()`.

`legacy_fixture_spec`:
- RELATIONS_FIXTURE synthetic => Some;
- other valid synthetic => None;
- REAL_ROOT => None;
- invalid synthetic => error.

Keep frozen self-check synthetic-only.

## 4. All six same-brain actions

Prove on REAL_ROOT:

1. `map_relations_open`;
2. `map_relations_for_node`;
3. `map_relations_review_queue`;
4. approve;
5. reject;
6. revoke.

Do not stop after making the panel readable.

## 5. DTO

For generic relation DTOs:
- `fixtureId: string | null`;
- synthetic behavior unchanged;
- REAL_ROOT => null.

No absolute path, source-ref UUID or path-derived surrogate in that field.

Update Rust/TypeScript contracts and tests accordingly.

`RelationsSelfCheck.fixtureId` stays string because self-check remains
fixture-only.

## 6. REAL_ROOT proof fixture

Use a disposable real directory created by the harness before baseline.

Include enough files to guarantee:
- at least one deterministic relation from a real core rule;
- at least two reviewable suggestions so approval/rejection can be demonstrated
  independently.

Prefer existing rule semantics. Do not add proof-only rules to product.

If content-identical is used:
- observe content through the existing product path;
- run dre-v1;
- read the resulting deterministic relation.

If numbered-sibling suggestions are used:
- create natural filenames that the existing rule already recognizes.

## 7. WebView2 acceptance

In real Tauri/WebView2 on REAL_ROOT:

- run relation analysis;
- relations panel is available;
- deterministic relation appears with rule/provenance in words;
- node read shows exact incoming/outgoing direction/counts;
- suggestion remains visibly distinct/non-counted;
- review queue opens;
- approve one suggestion => APPROVED relation appears;
- revoke it => it returns pending;
- reject another => no relation created and it leaves pending queue;
- restart process and decisions persist;
- no legacy TASK-0017 seed appears;
- `legacyInScope=false`;
- `fixtureId=null`;
- no source absolute path in DOM/IPC/artifact.

## 8. P-04/P-05/P-07

Produce explicit evidence:

### P-04
- established relation exposes type + provenance;
- provenance only DETERMINISTIC or APPROVED;
- pending suggestion remains distinct/non-counted;
- rule/version visible for deterministic output.

### P-05
- incoming and outgoing returned from separate store queries;
- counts exact against independent store/read oracle for the proof brain;
- distinction visible without color only.

### P-07
- panel content equals current node's stored relation set;
- each row has type/direction/provenance;
- keyboard can activate an entry and select its endpoint.

## 9. Legacy and regression

Must remain true:

- RELATIONS_FIXTURE gets its historical seed/derive behavior;
- another synthetic fixture has generic empty/core behavior, no legacy seed;
- invalid synthetic fixture still errors;
- self-check stays frozen-fixture-only;
- cross-brain relation behavior untouched;
- F-044/F-045 queue/decision semantics unchanged.

Add a structural regression preventing a future generic relation action from
calling `source_fixture()` or equivalent fixture-required helper.

## 10. P-22 / final acceptance replay

Because product code changes after TASK-0056, reuse the existing
TASK-0056 acceptance harness at the corrected HEAD.

Required:
- rerun `scripts/task0056-webview2.ps1` against corrected product;
- update its artifact to the corrected head;
- P-22 strict fingerprints identical;
- P-04/P-05/P-07 runtime rows now SATISFIED on REAL_ROOT, not synthetic-only;
- no new product gap.

Do not weaken the harness to make it pass. Update only what is necessary for the
previously expected refusal to become expected success.

## 11. Global regression gate at corrected HEAD

Reuse `scripts/task0056-rust-gate.ps1`.

Three consecutive full:
`cargo test --lib --offline`

with captured outputs.

Any unexplained failure => STOP/BLOCKED.

Also:
- frontend complete;
- pnpm check;
- pnpm build;
- Tauri debug;
- git diff --check;
- public-readiness;
- axe in final campaign.

## 12. Falsifications

At minimum demonstrate that tests/harness fail if:

1. open_relations calls source_fixture for REAL_ROOT;
2. node_relations still refuses REAL_ROOT;
3. queue still refuses REAL_ROOT;
4. approve still refuses REAL_ROOT;
5. reject still refuses REAL_ROOT;
6. revoke still refuses REAL_ROOT;
7. a legacy TASK-0017 seed is inserted into REAL_ROOT;
8. fixtureId carries source_ref/path instead of null;
9. suggestion enters incoming/outgoing counts before approval;
10. P-22 fingerprint changes.

## 13. Diff scope

Allowed product changes should be narrowly limited to:
- relation source-boundary/DTO backend;
- matching TypeScript DTO/read handling;
- tests.

No renderer redesign, rule change, relation schema migration, new store, or
dependency.

## 14. End

If all pass:
- TASK-0057 = IMPLEMENTED / candidate;
- P-04/P-05/P-07 = candidates to final closure;
- TASK-0056 remains historically BLOCKED at its old head, but corrected-head
  acceptance evidence is available for independent control;
- no Stage B/C/D;
- no TASK-0058;
- NEXT_ACTION = independent control.

If a new product gap appears:
- STOP/BLOCKED;
- no opportunistic unrelated fix.

Commit/push, clean tree, STOP.
