TASK_ID: TASK-0042 — corrective pass after ACTION-0069 (P1 / P1b)
AGENT: CLAUDE (Sonnet 5)
RESULT: DONE
BRANCH: build/v0.2-a26-v1-source-availability
BASE: 7107f74 (fast-forward from origin; contains ACTION-0069; tree was clean)
COMMITS: 4bed627 (code + tests); docs commit follows and is the branch HEAD

SUMMARY:
- TASK-0042 stays IMPLEMENTED (never self-VERIFIED). Only P1 / P1b of ACTION-0069 were touched. No
  watcher, polling, W-B/W-C, new DB, corpus migration, TASK-0043, PR, merge, tag or release.
  `incremental.rs`, `scanner.rs`, `lib.rs`, `MapApp.tsx`, `lifecycle.ts` NOT modified.
- P1 (honesty when the observation's own write fails): an observation whose `catalog_meta` write failed
  is also kept in a PROCESS-LOCAL slot, one per brain (keyed by catalogue file + brain id, never
  serialised). `read()` serves it first, always `persisted:false`. Any successful write drops it;
  a restart loses it by design; it never becomes a source of truth for the Index or the corpus.
  `record_failure` starts from it (if present) so the last success is not forgotten.
  Result: source absent -> UNAVAILABLE recorded -> write refused -> the next read (same functions Tauri
  calls) is UNAVAILABLE / ROOT_NOT_FOUND / persisted:false, never the old SYNCED still on disk.
- P1b (stale failure record): `describes()` — SYNCED needs lastSuccessfulRevision == served; a failure
  with lastSuccessfulRevision = Some(R) needs R == served, else it reads UNKNOWN (never SYNCED);
  a failure with None stays valid.

CRASH-WINDOW SEMANTICS (stated, not hidden):
  The in-memory slot fixes the CURRENT SESSION, not a crash or a restart. After a restart, an observation
  that never reached the disk is not recovered; the record on disk is judged against the served revision
  (UNKNOWN if it no longer describes it). No atomicity between the Index commit and the catalogue commit
  is claimed.

TESTS:
- T1 `an_unwritable_failure_record_is_still_the_current_observation_for_the_session`: real refresh_map,
  trigger refusing INSERT/UPDATE of `source_observation.%`, root moved away; Index dump, digest, revision,
  journal natures, catalogue-minus-observation identical; disk still holds old SYNCED; reads =
  UNAVAILABLE/ROOT_NOT_FOUND/persisted:false; no trigger text, no path; second refusal keeps last success;
  trigger removed + source still absent -> persisted:true; restart no longer changes anything.
- T2 `a_failure_record_left_next_to_a_newer_revision_is_not_believed`: UNAVAILABLE(R) on disk, Index R+1,
  no new record -> open_map and read_source_observation = UNKNOWN. Plus the direct-record variant in
  `a_synced_record_for_another_revision_is_not_believed` (failure of another revision -> UNKNOWN; of the
  served revision or with no success -> believed).
- T3 `a_record_that_cannot_be_written_never_turns_an_applied_index_into_a_failure` (kept): Index applied,
  report SYNCED persisted:false; in session read = SYNCED persisted:false; after simulated restart = UNKNOWN.
  `a_restart_loses_an_unwritten_failure_and_never_invents_one` pins the limit (old SYNCED remains).
- T4 `src/map/refreshFailure.test.tsx`: real MapApp, scripted backend (map_refresh refused,
  map_source_observation = UNAVAILABLE persisted:false): badge UNAVAILABLE, data-persisted="false",
  "non enregistrée", loaded map unchanged, exactly one local read ({brainId} only), no map_rebuild,
  map_prepare_synthetic_source, map_open or map_view afterwards. Mutation check: with the backend
  answering SYNCED the test fails.

EXISTING TESTS TOUCHED (each moved legitimately):
  - `lifecycle_tests::state()` compares the Index WITHOUT the observation (the sandbox has no catalogue,
    so the observation now differs by an honest persisted:false; same gesture as `rr5` in TASK-0042).
  - `a_synced_record_for_another_revision_is_not_believed`: a failure of another revision is now UNKNOWN.
  - the success-write-failure test gained the in-session / after-restart assertions.

VALIDATIONS:
- `cargo test --offline`: 629 PASS, 0 FAIL, 6 ignored (626 + 3).
- `pnpm test`: 439 PASS (438 + 1); `pnpm check` PASS; `pnpm build` PASS; `cargo build --offline` PASS.
- Clippy: lib 13 / lib-test 22 = same counts as before the change (historical debt); none in
  source_observation.rs, lifecycle_tests.rs, source_availability_tests.rs. rustfmt --check clean on the
  three touched Rust files.
- `git diff --check` clean. `scripts/audit-public-readiness.ps1 -AllowRemotes`: see the line below.
- WebView2 NOT replayed: visible UI and transport unchanged (no TS product change); T4 covers the catch.
- NOT tested: real process crash between the two commits (only simulated by dropping the slot); two
  processes on one catalogue; a real host with an unwritable catalogue.

DURABLE MEMORY UPDATED: CURRENT_STATE, HANDOFF, NEXT_ACTION, VALIDATION (section BX), CHANGELOG_AI,
TASK-0042 note. `graph/` untouched.

GIT: pushed to the same branch only; tree clean at the end.
REMOTE / DESTRUCTIVE ACTIONS: none beyond the push to the working branch. No PR, merge, tag, release,
reset, clean, force push or history rewrite. Every proof source is synthetic; no real data.

NEXT_ACTION: independent control of the P1 / P1b correction (VALIDATION BX, source_observation.rs, the
three new tests in map/source_availability_tests.rs, src/map/refreshFailure.test.tsx). Limit to judge:
the fallback corrects the session, not a crash.
