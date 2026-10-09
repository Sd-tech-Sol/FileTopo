# TASK-0057 — V1 REAL_ROOT Relations Surface Closure / P-04 + P-05 + P-07

- **Date:** 2026-10-08
- **Status:** `IMPLEMENTED` (candidate; the executor does not award `VERIFIED`)
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

## 15. Result — `IMPLEMENTED`, candidate only

Branch `build/v0.2-a41-v1-real-root-relations`, base
`ca17df50d1fa904e8387628347bbf2f9792b9ae8`. The executor does **not** award
`VERIFIED`: everything below is a candidature to independent control.

### 15.1 What changed in the product, and nothing more

Four production files, proved narrow by `scripts/task0057-diff-scope.ps1`
(artifact `docs/performance/runs/TASK-0057-diff-scope.json`, verdict
**`IN SCOPE`** — 4 production files out of 23 changed paths):

| File | Change |
|---|---|
| `src-tauri/src/map/relation_commands.rs` | the source boundary and the three generic DTOs |
| `src/map/types.ts` | `fixtureId: string \| null` on the same three DTOs |
| `src-tauri/src/map/relation_real_root_tests.rs` | new, tests only |
| `src-tauri/src/map/commands.rs` | **+7/−0**, every added line a `#[cfg(test)]` module declaration, checked line by line by the script |

`source_spec()` — which was only `brain.source_fixture()` under another name —
became **`generic_source_spec()`**: `Some(spec)` for a synthetic brain, which
still resolves and still refuses an unknown fixture, and `None` for a
`REAL_ROOT`, which is an answer rather than a refusal.
`legacy_fixture_spec()` now answers for a real root **without consulting the
fixture table at all**, so « does the frozen `TASK-0017` demonstration apply? »
is answerable instead of being refused before it is asked. The six generic
same-brain actions go through it; `self_check` keeps
`ensure_in_scope()`, which keeps requiring a fixture.

Untouched, as §13 requires: the relation model, the rule catalogue, the
deterministic engine, the relation schema, the stores, the cross-brain surface,
every renderer, and the dependency set. No migration.

### 15.2 The six actions, on a real folder — §4

Proved twice: as a unit campaign on a disposable real tree
(`relation_real_root_tests.rs`, 5 tests) and as real gestures in the real host
(§15.4). `map_relations_open`, `map_relations_for_node`,
`map_relations_review_queue`, approve, reject and revoke all answer, and all six
appear on the real IPC wire in the campaign artifact.

### 15.3 Falsifications — §12

| # | Stated as | Where |
|---|---|---|
| 1–6 | each of the six must not refuse a real root **for its source kind** — asserted against the motif `map_source_not_synthetic`, which is what used to be returned | `no_generic_relation_action_refuses_a_real_root_for_its_source_kind`, plus the campaign, where such a refusal both fails the run and is published in `productGaps` |
| 7 | no legacy `TASK-0017` seed on a real root; the frozen self-check still refuses one **by name** | `the_legacy_perimeter_never_reaches_a_real_root`, and the campaign's synthetic contrast |
| 8 | `fixtureId` is `null`, and neither the root, its name nor the source ref appears in the serialised payloads | `the_fixture_diagnostic_is_null_on_a_real_root_and_leaks_no_path`, and the campaign's DOM and payload check |
| 9 | a pending suggestion is counted in neither direction before approval | both, asserted before the approval and again after the revocation |
| 10 | the P-22 fingerprint must not change | the external fingerprint, strictly identical over four roots |

A **structural** regression states the rule instead of the six cases: the
generic function bodies, read at compile time by `include_str!`, must not call
`source_fixture()` or `ensure_in_scope()` and must resolve through
`generic_source_spec` — and `self_check` must still call `ensure_in_scope`, so
the test cannot be satisfied by making everything generic. It fails the moment
such a call is written, naming the command that wrote it.

### 15.4 The acceptance replay — §10

`scripts/task0056-webview2.ps1 -Task TASK-0057` at the corrected `HEAD`, the
TASK-0056 harness reused. Artifact
`docs/performance/runs/TASK-0057-p22-webview2.json`, verdict **`PASS`**,
`taskVerdict` **`PASS`**, `productGaps` **empty**.

- Strict external fingerprint **identical** before and after the window on all
  four roots (`atelier` 181 entries, `carnets` 8, `archives` 6, `fixture` 11);
  the access-time digest is identical too; no FileTopo artefact under any root.
- **27 coverage rows**, every requirement `P-01`..`P-22` observed; `P-04`,
  `P-05` and `P-07` now carry `sourceKind: REAL_ROOT`.
- On the real root: the panel **available** rather than « indisponible »; a
  deterministic `content-identical` relation with its rule and version on
  screen; panel counts `1/0` equal to the Index's, read from two separate store
  queries; a suggestion counted in neither direction; the review queue open with
  its total, state and reason; approval reached in **24 real Tab presses** then
  `Enter`, adding exactly one relation, outgoing on its source and incoming on
  its target; a relation entry activated in **2 Tab presses** selecting the
  element it names; revocation returning it to pending without touching a
  deterministic relation; a **different** suggestion rejected from the queue,
  creating no relation and leaving the queue.
- After a **real restart**: deterministic 2, approved 0, pending 1, `fixtureId`
  still `null`, `legacyInScope` false, `seeded` 0 — the revocation and the
  rejection both survived.
- The synthetic contrast is unchanged: the frozen brain still reports its
  fixture id, is still `legacyInScope`, its self-check still passes, and that
  self-check still refuses a real root by name.
- axe-core 4.13.0: **0 violation** in French, English, dark scheme and reduced
  motion. **0** fatal console error. No forbidden command on the wire.

### 15.5 Two things declared rather than implied

**`P-14` was NOT EXECUTED.** This machine refuses every clipboard operation —
measured **outside the product** before the window opened: `Set-Clipboard`
round-trips empty and `System.Windows.Forms.Clipboard::SetText` raises
« Échec de l'opération du Presse-papiers demandée ». With no clipboard available
to any process, the copy cannot be judged, and the product's own refusal says
nothing about the product. The real click was still played, the interface's
answer is published, and the comparison stays composed from
`TASK-0034`/`ACTION-0055`. The harness now settles this with a control write
before the window, so « the product failed to copy » and « this machine has no
clipboard » can never again be the same finding.

**The map half of `P-05` is a two-sided observation.** The view is bounded and
`relationSegments` draws an edge only when both ends are materialised. The
observed node had one relation whose other end was not drawn, so the map drew
**0** — which is exact — and the three relations of that brain with a
non-materialised end are each named in the « extrémités hors de la vue
courante » region with their own control. The campaign therefore does **not**
show a drawn edge confronted with the Index; it shows that the map draws
exactly what it can draw and loses nothing. Written into the matrix as a limit.

### 15.6 Global regression gate — §11

See `docs/ai/VALIDATION.md` section `DP` for every figure.

### 15.7 Governance

`TASK-0057` = **`IMPLEMENTED`**, candidate. `P-04`, `P-05` and `P-07` become
**candidates to final closure**; the matrix closes nothing and says so.
`TASK-0056` remains historically `BLOCKED` at its own head, and its artifact is
kept as the record of what it measured. No `TASK-0058`. Neither stage B, C nor D
is started. `NEXT_ACTION` = independent control.
