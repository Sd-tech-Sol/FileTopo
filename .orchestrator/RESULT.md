TASK_ID: TASK-0036 — V1 Stable Identity Foundation — corrective pass (ACTION-0059)
AGENT: CLAUDE
RESULT: DONE
BRANCH: build/v0.2-a20-v1-stable-identity
FINAL_HEAD: (see git log after commit)

SUMMARY:
ACTION-0059 accepted D1/D2/D3/R1 (from ACTION-0057) and D5 (from
ACTION-0058) without reservation, confirmed D4 was "largely corrected",
but found one last blocking defect, D6, in the same function
(BrainIndex::open_existing_migrating). Closed this pass. No scope
widening (no TASK-0037, no journal/watcher/incremental); D1/D2/D3/R1, D4
outside D6, and D5 were left unmodified as instructed.

- D6 — the M-B safety copy was deleted one step too early: right after
  Index::migrate_previous_schema() succeeded, BEFORE finish_open_existing()
  had validated the full v4 canonical contract (is_built(): build_complete,
  projection_contract; then identity(), count(), root_id()). ACTION-0058's
  own D4 contract explicitly required restoration to cover a failure of
  "migration OR validation" — the previous delivery (0daf342f) only covered
  the migration half. When finish_open_existing() refused a file whose SQL
  migration had otherwise succeeded, the old code returned an error while
  leaving the file already migrated to v4, with no v3 safety copy left to
  recover from — a direct gap in the orchestrated M-B contract, even though
  the SQLite DDL itself was correct and atomic (D2, unchanged).

  Fix, without duplicating or weakening finish_open_existing(): the copy
  now survives past a successful migrate_previous_schema() call and is
  only deleted after finish_open_existing() ITSELF succeeds. On its
  failure, the copy is restored over the live file before the validation
  error is returned; on a restore failure, that restore's own clear error
  propagates instead, and the copy is NOT deleted (still useful for manual
  recovery) — exactly mirroring how the existing migration-failure branch
  already behaved. No explicit connection close was needed on this new
  branch: finish_open_existing(connection) takes the connection by value
  and holds it in a local variable for its own duration; when it returns
  Err without handing the connection back, Rust drops (closes) it before
  control returns to the caller, so the file is already free to overwrite
  by the time restore_safety_copy runs.

  src-tauri/src/map/brain_index.rs, open_existing_migrating: the tail after
  a successful migrate_previous_schema() call now matches on
  Self::finish_open_existing(probe.index.connection) instead of
  unconditionally deleting the copy first and calling it unconditionally
  after.

- Proof, confirmed false against the pre-fix code — the corrective prompt's
  own explicit requirement: a new test,
  d6_a_post_migration_validation_failure_restores_the_v3_index_in_full
  (src-tauri/src/map/stable_identity_tests.rs), builds a real v4 REAL_ROOT
  index, downgrades it to v3, then corrupts `build_complete` — a canonical
  metadata key migrate_previous_schema() never writes or reads — so the
  v3->v4 DDL genuinely succeeds and only finish_open_existing()'s own
  validation refuses afterward (map_index_incompatible). Replayed against
  0daf342f via a temporary `git stash push -- src-tauri/src/map/brain_index.rs`
  (isolating just that one file's revert, keeping the new test in place):
  the test genuinely fails there — user_version is left at 4 instead of
  being restored to 3 (assertion left==right: left: 4, right: 3). The
  stash was immediately popped and the full suite re-run to confirm no
  regression from that manipulation. With the fix in place: full
  restoration proven (user_version==3, every node and seen flag identical
  via a logical-content snapshot, index_id/index_revision unchanged,
  source_kind/source_ref binding intact), the transient safety copy
  deleted after a successful restoration, and — after repairing the
  corrupted invariant — a retry migrates to v4 cleanly with no leftover
  copy.

TASK-0036 = IMPLEMENTED, never self-VERIFIED.

VALIDATIONS:
- cargo test --offline: 412 PASS (411 + 1 new test function), 5 ignored
  (unchanged), 0 failed. All existing D4 M-B tests (WAL-pending/failure/
  restore/retry, busy checkpoint, failed safety copy, brain/binding/
  future-schema refusals), all D5 Cloud Files tests, and all D1/D2/D3/R1
  invariants replay unchanged and green.
- pnpm test (vitest): 339 PASS, unchanged — zero TypeScript file touched.
- pnpm check, pnpm build, cargo build --offline, git diff --check: green.
- cargo fmt: clean on the 2 files this pass touched
  (map/brain_index.rs, map/stable_identity_tests.rs), verified with
  `--config style_edition=2024` explicit (the same rustfmt/style-edition
  pitfall the three previous corrective passes already documented and
  handled the same way). brain_index.rs was already clean; two lines in
  stable_identity_tests.rs inherited from the previous (ACTION-0058) pass
  were recomposed onto one line each by rustfmt (they fit under the width
  limit) — unrelated to this pass's logic, fixed in passing.
- cargo clippy --all-targets --offline: zero diagnostics in either of the
  2 touched files; the pre-existing 26-error debt under -D warnings is
  unaffected and lives entirely outside this pass's scope.
- WebView2: NOT re-run this pass, and explicitly justified rather than
  silently skipped, per NEXT_PROMPT.md §3's own instruction not to
  fabricate unneeded proof. The change only reorders when the safety copy
  is deleted relative to finish_open_existing()'s validation, and adds a
  restore path that only ever triggers when that validation refuses a
  file whose SQL migration otherwise succeeded. The TASK-0036 WebView2
  harness builds and reads only valid synthetic trees — it never
  deliberately corrupts a canonical invariant — so it never exercised that
  refusal path before this pass and still does not after. The happy path
  (migration succeeds, validation succeeds, copy deleted, store returned)
  is byte-for-byte identical in behavior before and after. The previously
  published replay under 0daf342f (docs/performance/runs/TASK-0036-webview2.json,
  untouched by this pass) remains fully applicable.

IMPORTANT_FILES:
- src-tauri/src/map/brain_index.rs (open_existing_migrating: safety-copy
  lifetime now spans finish_open_existing()'s validation, not just
  migrate_previous_schema())
- src-tauri/src/map/stable_identity_tests.rs (new D6 test)
- docs/ai/CURRENT_STATE.md, HANDOFF.md, VALIDATION.md (section BP),
  CHANGELOG_AI.md, NEXT_ACTION.md; docs/tasks/TASK-0036-v1-stable-identity.md

COMMIT:
PUSHED: pending (commit/push to happen immediately after this report is
written)

LIMITS_OR_BLOCKERS:
- No real process crash/power-loss reproduction for this specific failure
  mode either — the D6 test injects a deterministic metadata corruption,
  not a SIGKILL. Same category of limit PERF-0002/B1 and the D4 tests
  already declared.
- Every other limit already declared by the three earlier TASK-0036
  deliveries is unchanged: no real Cloud Files fixture, inter-volume move
  untested, seen-across-rename not replayed in WebView2.
- cargo clippy remains red at 26 pre-existing errors, confirmed to live
  entirely outside the 2 files this pass touched.
- Out of scope as specified: change journal, watcher, incremental update,
  no new TASK-0037.

NEXT_ORCHESTRATOR_DECISION:
- A final independent control of TASK-0036, by an instance distinct from
  the executor, on the full accumulated evidence (D1 through D6).
  TASK-0036 stays IMPLEMENTED until that control renders VERIFIED. No
  TASK-0037 pre-created.
