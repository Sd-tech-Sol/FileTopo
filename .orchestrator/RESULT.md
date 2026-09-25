TASK_ID: TASK-0043 — corrective pass for ACTION-0071 P1 (shutdown never detaches a worker)
AGENT: CLAUDE (Opus 5.5)
RESULT: DONE — TASK-0043 stays IMPLEMENTED (never self-VERIFIED)
BRANCH: build/v0.2-a27-v1-watcher-reconciliation
BASE: 8f02e34 (fast-forward b848a8a..8f02e34 from origin; tree was clean; HEAD contains ACTION-0071)
COMMITS: 001f18f (code + tests), then the docs commit (branch HEAD)

P1 CLOSED:
- map/commands.rs: lock_publication_cancellable = the SAME PUBLICATION_LOCK, try_lock loop with a 10 ms
  wait, cancelled() checked BEFORE every attempt, distinct outcome PublicationCancelled, poisoned lock
  taken via into_inner. No second mutex. Manual gestures keep their blocking lock().
- publish_map = blocking lock + publish_map_with_lock(&guard, ...): the one pipeline (application mode,
  source observation, journal) with the guard as proof of holding the lock. No duplication.
- map/watch_ops.rs: W-C verify_full takes the lock cancellably then publish_map_with_lock
  (FullFailure::{Cancelled, Refused}); W-B apply_scopes takes it cancellably BEFORE any source read or
  SQLite open (ScopedFailure::Cancelled); record_guard_failure (root guard) too — nothing written if
  cancelled. No Mutex::lock left on the watcher side.
- watch/mod.rs: WatchManager::shutdown joins EVERY worker it owned; no branch drops a live JoinHandle.
  patience is a diagnostic threshold only (ShutdownReport { joined, beyond_patience }).
- Not touched: parser, hint coalescing/semantics, W-B/W-C work after acquisition, UI, cadences,
  incremental.rs, dependencies.

PROOFS:
- T1 a_shutdown_while_a_full_verification_waits_for_the_publication_lock_joins_the_worker: WATCHING, file
  added, another thread holds PUBLICATION_LOCK, LOST injected -> W-C, worker at before_wc then waiting
  (VERIFYING/SIGNALS_LOST); shutdown(1 ms) WITH THE LOCK STILL HELD returns < 3 s, joined = 1, last status
  STOPPED before return, reader released; lock released afterwards, 1 s later: no status, no revision, no
  write. Control: a manual Actualiser then does publish the change.
- T2 same via a targeted hint -> W-B (wc 1 / wb 1 / escalation 0): same assertions, no batch at all,
  observation still SYNCED.
- Root guard record waiting on the held lock: same assertions, no observation written.
- 5 unit tests of the primitive on a LOCAL mutex (free, stop before, stop during wait, released, poisoned).
- Falsification: old behaviour temporarily restored under the new tests (blocking lock + detaching
  shutdown): all 3 fail (joined 0); with dropped handles counted as joined, all 3 fail on "STOPPED before
  shutdown returned" (last status VERIFYING / WATCHING). Sources restored.
- T3 shutdown_closes_the_native_handle_and_the_operating_system_agrees: PASS (exclusive open granted).

VALIDATIONS:
- targeted 11 tests: PASS 3 consecutive runs.
- cargo test --offline: 727 PASS, 0 FAIL, 6 ignored (719 + 8); includes all 72 watch:: tests (initial W-C,
  native changes, signal during W-B/W-C, forced loss, root absent/returned, concurrent Actualiser,
  shutdown during W-C) and both 10k tests (not required: reconciliation unchanged).
- pnpm test 471 PASS; pnpm check, pnpm build, cargo build --offline: PASS.
- clippy --all-targets: lib 13 / lib-test 22, diagnostics identical with and without the fix (git stash).
- git diff --check clean; audit-public-readiness -AllowRemotes green (586 files).
- WebView2 not replayed: no frontend code or visible semantics changed.

LIMITS: a commit already in progress (apply after an accepted scan, a W-B batch) is not interrupted — the
shutdown waits for it instead of detaching; its duration on a large tree is not measured. The notifier runs
on the worker thread (product one does not block). One machine, local NTFS.

GOVERNANCE: TASK-0043 = IMPLEMENTED; no TASK-0044; no USN; no PR / merge / tag / release; graph/ untouched;
push only to the task branch; NEXT_ACTION = independent control of the ACTION-0071 fix.
