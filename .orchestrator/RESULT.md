TASK_ID: TASK-0057 — V1 REAL_ROOT Relations Surface Closure / P-04 + P-05 + P-07
AGENT: CLAUDE CODE (Opus 5)
RESULT: IMPLEMENTED — candidate only; the executor does not award VERIFIED
BRANCH: build/v0.2-a41-v1-real-root-relations
BASE: ca17df50d1fa904e8387628347bbf2f9792b9ae8
DECISION: DEC-0053 (APPROVED), selected by ACTION-0106

THE CORRECTION:
- The six generic same-brain relation actions — open, node relations, review
  queue, approve, reject, revoke — resolved their source through
  `BrainRecord::source_fixture()`, which refuses a REAL_ROOT by name. They now
  resolve through `generic_source_spec`: `Some(spec)` for a synthetic brain,
  which still refuses an unknown fixture, and `None` for a real root — an
  answer, not a refusal. `legacy_fixture_spec` answers for a real root without
  consulting the fixture table at all, so « does the frozen TASK-0017
  demonstration apply? » is answerable instead of refused before it is asked.
- `map_relations_self_check` keeps `ensure_in_scope`, keeps requiring a fixture,
  and still refuses a real root BY NAME — DEC-0053 B.
- `fixtureId` is the fixture id on a synthetic brain, unchanged, and `null` on a
  real root. No path, no path hash, no account, no source-ref surrogate.
  `RelationsSelfCheck.fixtureId` stays a String.
- UNTOUCHED: relation model, rule catalogue, deterministic engine, relation
  schema, stores, cross-brain surface, every renderer, the dependency set. No
  migration, no new dependency.

DIFF SCOPE (TASK-0057 §13): IN SCOPE.
- 4 production files of 28 changed paths: `relation_commands.rs` (+86/-41),
  `types.ts` (+18/-3), the new `relation_real_root_tests.rs` (+734/-0), and
  `commands.rs` (+7/-0) whose every added line is a `#[cfg(test)]` module
  declaration — read line by line rather than trusted by path.
- Artifact: docs/performance/runs/TASK-0057-diff-scope.json

ACCEPTANCE REPLAY (TASK-0056 harness reused, not replaced): PASS.
- Artifact: docs/performance/runs/TASK-0057-p22-webview2.json
  `verdict PASS`, `taskVerdict PASS`, `productGaps` EMPTY, 27 coverage rows,
  P-01..P-22 all observed, HEAD 7f43d60a.
- Strict external fingerprint IDENTICAL before and after the window on all four
  roots (atelier 181 entries, carnets 8, archives 6, fixture 11); access-time
  digest identical too; no FileTopo artefact under any root; both fingerprints
  settled (3 and 2 readings).
- axe-core 4.13.0: 0 violation in French, English, dark scheme and reduced
  motion. 0 fatal console error. No forbidden or whole-graph command on the wire.
- All six relation commands seen on the real IPC wire.

P-04 / P-05 / P-07, NOW ON A REAL ROOT (`sourceKind: REAL_ROOT`):
- Panel AVAILABLE, not its « unavailable » form. The legacy-scope note is
  present and says both halves: the frozen TASK-0017 demonstration does not
  apply, and dre-v1 applies to EVERY brain.
- Real engine: content campaign, then a real « Analyser » -> 1 deterministic
  relation and 2 suggestions, no rule skipped. `fixtureId` null,
  `legacyInScope` false, `seeded` 0, no frozen S-00x key.
- P-04: `content-identical` with its rule and version on screen, provenance as a
  glyph AND a word, never a third value; the suggestion a distinct, explained
  object with its own state.
- P-05: panel « 1 sortante · 0 entrante · 0 suggestion non comptée », exactly the
  Index's, read from TWO SEPARATE store queries. Approval by the real keyboard
  (24 real Tab presses, then Enter) added EXACTLY ONE relation, outgoing on its
  source and incoming on its target; revoking it took exactly that one back and
  touched no deterministic relation.
- P-07: entries grouped by direction then by nature, each carrying type,
  direction and provenance as glyph AND word, each an enabled control; one
  activated by the real keyboard SELECTED the element it names. Review queue
  opened on 2 pending with its state and its why in words; « Plus tard » turned
  once to reach a DIFFERENT suggestion, then rejection -> 0 relation created,
  1 pending left, and it left the queue.
- After a REAL process restart: deterministic 2, approved 0, pending 1,
  `fixtureId` still null — the revocation and the rejection both survived.
- Synthetic contrast unchanged: the frozen brain keeps its fixture id, stays
  `legacyInScope`, its self-check passes, and that self-check still refuses a
  real root by name.

UNIT PROOF: 5 tests on a disposable real folder.
- The six actions in sequence, in the order a person meets them; counts compared
  against a SEPARATE read of the brain's store, so no direction can hide behind
  the number the command under test returns.
- Falsifications §12: 1-6 asserted against the MOTIF `map_source_not_synthetic`,
  which is what used to be returned; 7 the legacy seed and the named refusal of
  the self-check; 8 `fixtureId` null with no path, root name or source ref in the
  payloads; 9 a pending suggestion counted in neither direction; 10 the external
  fingerprint.
- A STRUCTURAL guard states DEC-0053 C instead of the six cases: the generic
  bodies, read at compile time, must not call `source_fixture()` or
  `ensure_in_scope()`, and `self_check` must still call `ensure_in_scope` — so it
  cannot be satisfied by making everything generic.
- An unknown synthetic fixture is refused at all six doors, not two.

RUST GATE: PASS, 3/3, HEAD b21c607b, idle machine, tree unchanged throughout.
- 906 passed / 0 failed / 13 ignored each run, exit 0, 180.9 / 185.3 / 183.2 s,
  one log hash per run, failing list empty every time, logs outside the repo.
- Artifact: docs/performance/runs/TASK-0057-rust-gate.json

THE FIRST GATE WAS BLOCKED, AND IS PUBLISHED UNEDITED:
- docs/performance/runs/TASK-0057-rust-gate-contended.json — 2/3, HEAD 900bef6d.
  Run 3 failed `watch::tests::a_healthy_native_watcher_does_not_use_the_periodic_fallback`
  on « timed out after 30s waiting for: state Watching ».
- NOT declared a flake. Two faults were found, both IN THE GATE, and fixed:
  (1) it checked the tracked tree only once, before run 1, so files edited while
  run 3 was in flight left the artifact claiming a HEAD it had not tested — the
  tracked-tree digest is now taken before and after EVERY run, read-only, and a
  change ABORTS the gate; (2) the suite holds timing-sensitive tests — a native
  filesystem watcher waiting up to 30 s for its first event — and an I/O-heavy
  readiness audit was running beside run 3; the gate now records `runAlone` and
  states that such a failure without that declaration cannot be charged to the
  product.
- The cause therefore stays EXPLAINED BY CONTENTION, NOT PROVEN. What is proven
  is that run 3 did not describe a valid HEAD, and that the same suite at the
  same product code is green three times running on an idle machine. Both
  artifacts are published so the independent control can judge for itself.

OTHER VALIDATIONS AT THE FINAL HEAD:
- pnpm check PASS; frontend 721 PASS (48 files); pnpm build PASS;
  pnpm tauri build --debug --no-bundle PASS; git diff --check PASS;
  audit-public-readiness PASS (762 versioned files).
- No remote GitHub Actions CI is attached: every result is a local run with its
  output captured.

NOT TESTED / LIMITS:
- P-14 NOT EXECUTED: this machine refuses every clipboard operation, measured
  OUTSIDE the product before the window opened (`Set-Clipboard` round-trips
  empty; `Clipboard::SetText` raises « Échec de l'opération du Presse-papiers
  demandée »). The real click was played, the interface's answer published, and
  the comparison stays composed from TASK-0034/ACTION-0055.
- The map half of P-05 is TWO-SIDED: the bounded view draws an edge only when
  both ends are materialised. The observed node had one relation whose other end
  was not drawn, so the map drew 0 — exact — and the 3 relations with a
  non-materialised end are each named in the « endpoints outside the current
  view » region with their own control. No drawn edge was confronted with the
  Index.
- No heavy threshold re-measured: 100k and 1M indexed rows, the 10 000-event
  burst, the incremental cost curve and the full contrast matrix stay composed
  from their own VERIFIED campaigns, named row by row in the matrix.
- No performance figure; reserve R8 untouched. No real screen reader. Local NTFS
  roots only. The touchpad gesture of P-11 stays not exercised and declared so.
- A Tab-press count is not a contract: it was 2 then 60 between two runs, because
  the focus order is the document order. What is asserted is that the order
  REACHES the control and that activating it selects the element named.

STATE:
- TASK-0057 = IMPLEMENTED, candidate. Matrix overall verdict: SATISFIED.
- P-04, P-05, P-07 = candidates to final closure; NOTHING is closed by this task,
  and ACTION-0094's P-04 closure is neither revoked nor extended by the executor.
- ROADMAP Stage A = EN COURS — not because a gap is open, but because only an
  independent ACTION can close it.
- TASK-0056 remains historically BLOCKED at its own head; its artifact is kept as
  the record of what it measured.
- No TASK-0058 created. Stages B, C and D not started.

NEXT:
- Single next action: independent control of TASK-0057.
- docs/ai/NEXT_ACTION.md holds that one action, with the two points to arbitrate.
