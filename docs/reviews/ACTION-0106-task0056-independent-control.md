# ACTION-0106 — Independent control of TASK-0056 / real-root relations arbitration

- **Date:** 2026-10-08
- **Branch controlled:** `build/v0.2-a40-v1-final-parity-acceptance`
- **HEAD controlled:** `ca17df50d1fa904e8387628347bbf2f9792b9ae8`
- **Verdict:** **TASK-0056 BLOCKED — executor stop is correct**
- **Next branch:** `build/v0.2-a41-v1-real-root-relations`

## 1. Acceptance evidence that passes

Independent inspection accepts the following TASK-0056 evidence:

- diff from `446a4e49…` to `ca17df50…` is acceptance-only: scripts,
  documents and proof artifacts; no production file changed;
- no GitHub Actions run or remote commit status is attached;
- captured Rust gate: **3/3** complete runs, each **901 passed / 0 failed /
  13 ignored**, with exit code, full-log hash and empty failed-test list;
- the unidentified TASK-0055 failure did not reproduce in this gate;
- P-22 campaign ran in three real Tauri/WebView2 processes over disposable
  synthetic roots;
- strict external fingerprints before/after are identical for content, names,
  structure, sizes, hard-link counts and contractual timestamps;
- no FileTopo artifact exists under the analysed roots;
- temporary unavailability was observed/restored with zero deletion while
  absent;
- axe reports zero violation on the sampled final states;
- no fatal console error;
- the matrix contains no other `GAP` besides P-04/P-05/P-07.

The first P-22 false failure is properly explained and retained: NTFS directory
timestamps had not settled at the first baseline reading. The final harness
requires two consecutive equal readings and publishes the settling count.

## 2. The REAL_ROOT relation gap is real

The executor's finding is confirmed in code.

`BrainRecord::source_fixture()` explicitly refuses `SourceKind::RealRoot`
with `SourceNotSynthetic`.

Yet the generic intra-brain relation surface calls it through
`relation_commands::source_spec()`:

- `open_relations`;
- `node_relations`;
- `review_queue`;
- `approve_suggestion`;
- `reject_suggestion`;
- `revoke_relation`.

The rule engine itself uses the canonical analysis input and is able to run on
the same REAL_ROOT brain. Therefore the failure is specifically a read/action
boundary inherited from the historical fixture implementation.

## 3. Arbitration of the counter-argument

The contract allows acceptance criteria to be **tested on synthetic fixtures**.
That does not make a product capability optional on real user data.

The same contract §3 states that making a parity requirement unreachable is
equivalent to removing it.

Since DEC-0033 A makes REAL_ROOT the product path by which a person's
arborescence enters FileTopo, a relations feature that is only usable on frozen
developer fixtures is not usable by the person.

Therefore:

- the old ACTION-0094 evidence for P-04 remains historically valid in its
  tested scope;
- it is **insufficient for the final product contract** after the REAL_ROOT
  reachability finding;
- P-04 is reopened/blocked at final Stage-A scope;
- P-05 and P-07 remain GAP;
- Stage A remains EN COURS.

No lowering of P-04/P-05/P-07 is authorized.

## 4. Scope of the correction

The correction must restore the intent already written into TASK-0024:
the core relation surface is generic; only the frozen TASK-0017 demonstration
seed/self-check is fixture-scoped.

Do **not** modify the relation engine unless a discriminating proof finds a
separate engine defect.

The correction must cover the entire same-brain action surface, not only reads:

- open;
- node read;
- review queue;
- approve;
- reject;
- revoke.

Otherwise the panel could become visible but still unusable.

## 5. DTO rule

The relation DTOs historically expose a `fixtureId` diagnostic.

For REAL_ROOT, do **not** invent a fixture and do not expose an absolute path.

Preferred minimal compatible model:

- relation DTO `fixtureId` becomes nullable;
- synthetic source => exact fixture id as today;
- REAL_ROOT => `null`.

The synthetic-only `RelationsSelfCheck.fixtureId` may remain non-null because
that self-check intentionally stays fixture-only.

No UUID/path surrogate should be stuffed into a field named fixtureId merely to
avoid changing its type.

## 6. Legacy boundary

`legacy_fixture_spec` must mean exactly:

- valid synthetic fixture equal to RELATIONS_FIXTURE => Some(spec);
- another valid synthetic fixture => None;
- REAL_ROOT => None;
- unknown/corrupt synthetic fixture => explicit error.

Legacy derive/seed and frozen self-check remain synthetic-only.

Core relation store reads/actions and dre-v1 stay generic.

## 7. New task

Create:

**TASK-0057 — V1 REAL_ROOT Relations Surface Closure / P-04 + P-05 + P-07**

The task must:
- fix the source boundary minimally;
- prove all six generic relation actions on a disposable REAL_ROOT;
- preserve synthetic legacy behavior;
- rerun the existing TASK-0056 P-22 acceptance campaign at the corrected product
  HEAD;
- rerun the captured 3× Rust gate at that corrected HEAD;
- make no unrelated product change.

If TASK-0057 passes independently, the orchestrator can then decide whether the
existing TASK-0056 acceptance plus the corrected-head reruns are sufficient to
close Stage A without inventing another task.
