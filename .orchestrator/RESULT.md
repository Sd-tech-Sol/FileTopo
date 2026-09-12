TASK_ID: TASK-0036 — V1 Stable Identity Foundation — corrective pass (ACTION-0058)
AGENT: CLAUDE
RESULT: DONE
BRANCH: build/v0.2-a20-v1-stable-identity
FINAL_HEAD: (see git log after commit)

SUMMARY:
ACTION-0058 accepted D1/D2/D3/R1 from ACTION-0057 without regression, but
found the original TASK-0036 spec omitted DEC-0013 (approved 2026-08-31),
still normative on two points never cited: B (migration baseline M-B) and
F (Cloud Files identity boundary, closed in the meantime by new DEC-0035).
Two defects, D4 and D5, closed this pass. No scope widening (no TASK-0037,
no journal/watcher/incremental).

- D4 — migration 3->4 now follows M-B of DEC-0013 B, layered on top of the
  already-accepted atomic SQL transaction (D2, unchanged).
  BrainIndex::open_existing_migrating gains, between the existing brain/
  binding checks (D1, unchanged) and the call to
  Index::migrate_previous_schema(): a per-brain_id lock
  (migration_lock_for — a static HashMap<String, Arc<Mutex<()>>>, narrow
  and per-brain as ACTION-0058 asked, not a new architecture or a second
  store) serialising two concurrent attempts on the same file — needed
  because, unlike the SQL transaction, the file-level safety copy is not
  protected by SQLite's own locking; a quiesce step
  (PRAGMA wal_checkpoint(TRUNCATE) on the already-open connection, refused
  with MigrationUnavailable/"quiesce_busy" if it cannot fully complete —
  no copy, no migration); a safety copy (fs::copy of the main file alone —
  the quiesce guarantees no pending WAL content, so a plain file copy is
  already "a coherent v3 snapshot") written to <index>.v3-safety-copy in
  the brain's own map/ directory, never under the source; independent
  verification that the copy opens read-only at exactly
  MAP_PREVIOUS_SCHEMA_VERSION with a readable nodes table before the first
  v4 ALTER TABLE runs; on a migration failure, the connection is closed
  explicitly (Windows refuses to overwrite a file another handle holds
  open), the copy is restored over the live file, and the original SQL
  error is reported; on success the transient copy is deleted. One bounded
  copy name per brain, never accumulated across attempts; its path never
  reaches any command, log, or artifact.
  Proof: a single test
  (d4_a_wal_pending_write_is_captured_and_restored_on_injected_migration_failure,
  src-tauri/src/map/stable_identity_tests.rs) leaves a write committed
  ONLY in -wal (a raw connection held open, which is what stops SQLite's
  own last-connection-close auto-checkpoint from folding it in early;
  verified: the -wal file is >0 bytes before migration), injects the same
  real schema-object obstruction D2 already uses (a TABLE named
  idx_nodes_stable_key, so both ALTER TABLEs succeed before the collision),
  and proves the restoration recovers exactly that WAL-pending write — the
  real evidence that quiescing genuinely folded the WAL into the copy
  before migration began, not merely that SQL rollback works. Same test
  then removes the obstruction and proves a retry succeeds cleanly.
  d4_a_busy_checkpoint_refuses_without_migrating_or_copying: a concurrent
  reader's snapshot, opened BEFORE a write lands (necessary — an empty WAL
  checkpoints trivially regardless of readers), blocks TRUNCATE; refused,
  no copy, logical content unchanged.
  d4_a_failed_safety_copy_refuses_without_migrating: a directory pre-created
  exactly at the copy's destination makes fs::copy fail; refused, no
  schema mutation reaches the file (logical-content comparison used here,
  not raw bytes, since the quiesce step alone can legally rewrite bytes by
  merging WAL pages even when nothing logical changes).
  The three existing D1 refusal tests (brain mismatch, disagreeing binding,
  future schema) each gained an assertion that no safety copy was ever
  created; the D1 success test gained an assertion that no safety copy is
  left behind afterward.

- D5 — a recognised Cloud Files placeholder always uses PATH_FALLBACK,
  hydrated or not, closing DEC-0013 F via new DEC-0035.
  identity::compute_identity now calls cloud_files_detection(absolute_path)
  right after the existing eligibility check (reparse/skipped/online_only
  — unchanged, so no extra handle for those already-excluded cases) and
  before system_identity_key. Three outcomes
  (CloudFilesDetection::{Placeholder, NotCloudFile, Ambiguous}), one pure
  rule (blocks_system_identity) separable from the real Win32 call:
  Placeholder and Ambiguous both block SYSTEM; only a confirmed
  NotCloudFile leaves it available. The real Windows call
  (cloud_files_detection) opens a handle for FILE_READ_ATTRIBUTES only
  (never GENERIC_READ, no content), calls
  CfGetPlaceholderInfo(..., CF_PLACEHOLDER_INFO_STANDARD, ...) purely as
  detection — only whether the call succeeds or fails matters, no field of
  CF_PLACEHOLDER_STANDARD_INFO (FileId, PinState, InSyncState, ...) is
  ever read — and recognises the official ERROR_NOT_A_CLOUD_FILE failure
  via a standard HRESULT_FROM_WIN32 conversion (FACILITY_WIN32 = 7),
  tested separately against the real constant, not a hand-picked magic
  number. windows-sys gains the Win32_Storage_CloudFilters feature on the
  already-pinned =0.61.2 dependency — no new crate. No hydrate/dehydrate/
  pin-state API is ever called or imported — proven structurally by a test
  that scans identity.rs's own source text up to (but not past) its own
  test module, since that module necessarily *names* the forbidden symbols
  in its own assertion list (the same source-scanning technique DEC-0033 I
  already uses elsewhere in this codebase).
  No real Cloud Files fixture was built: doing so would require
  CfRegisterSyncRoot, a real sync-provider registration with Windows —
  real risk of leaving system state behind if cleanup failed, and a scope
  widening ACTION-0058 explicitly permitted skipping ("if a fixture can be
  built without a real account... welcome, but not at the price of
  widening scope"). The boundary is proven instead by three independent
  layers: a pure decision-table test set exercising all three
  CloudFilesDetection outcomes with no Windows call at all; a real Win32
  call against an ordinary file created by the test itself, confirming the
  official NotCloudFile answer and that compute_identity still reaches
  SYSTEM for it — proof of no regression on the common case, which the
  existing windows_system_identity test suite continues to exercise
  unmodified; and the Microsoft source citations DEC-0035 already quotes
  in full.

TASK-0036 = IMPLEMENTED, never self-VERIFIED.

VALIDATIONS:
- cargo test --offline: 411 PASS (402 + 9 new test functions: 3 on D4 — one
  combined WAL-pending/failure/restore/retry scenario, one busy-checkpoint
  refusal, one failed-copy refusal — plus 6 on D5 including one real
  Windows call), 5 ignored (unchanged), 0 failed. The three existing D1
  refusal tests and the D1 success test each gained one extra assertion
  (no new test function) about the safety copy's absence.
- pnpm test (vitest): 339 PASS, unchanged — zero TypeScript file touched.
- pnpm check, pnpm build, cargo build --offline, git diff --check: green.
- cargo fmt: clean on the 4 Rust files this pass touched (identity.rs,
  map/brain_index.rs, map/mod.rs, map/stable_identity_tests.rs) plus
  Cargo.toml — verified with `--config style_edition=2024` explicit, the
  same pitfall the two previous corrective passes already documented
  (this machine's rustfmt does not apply Rust-2024 style by default with
  `--edition` alone, and pointing rustfmt/cargo fmt at any file that `mod`-
  declares the rest of the tree reformats the whole reachable crate) —
  reproduced a third time identically and handled the same way: whole-crate
  `cargo fmt -- --config style_edition=2024`, then `git checkout` of every
  file outside this pass's actually-touched set (14 files reverted, none
  of them modified by this pass).
- cargo clippy --all-targets --offline -- -D warnings: red at 26 errors
  (24 unique diagnostics, doubled lib+test) — confirmed identical, line for
  line, to the pre-pass state; zero new diagnostic in any of the 4 touched
  files. One was introduced and fixed before delivery: the three new D4
  tests first copied the earlier corrective pass's `.err().expect(...)`
  pattern (needed there because Index has no Debug impl) — but here
  open_map's Ok type is MapOpenReport, which does implement Debug, so
  clippy correctly flagged the indirection and it was changed to
  `expect_err(...)`.
- Real WebView2 replay, one launch, zero restarts (same harness as the
  prior two passes, re-run unmodified):
  docs/performance/runs/TASK-0036-webview2.json — every TASK-0036 invariant
  still true (rename/move/moved-subtree/no-recycle/search/children/
  projection/reveal/copy/no-leak), copyStillSucceeds still true,
  fatalConsoleErrors=0.
- No v3->v4 upgrade scenario was added to the WebView2 harness —
  NEXT_PROMPT.md explicitly said so was unnecessary: "the M-B migration
  must be proven at the Rust product level with precise control of the
  v3/backup/WAL file; no need to fabricate a less precise WebView scenario
  if the Rust test genuinely goes through open_map/open_for_brain" — which
  it does (D4's proof calls open_map, the same product entry point a real
  "Actualiser" click reaches).

IMPORTANT_FILES:
- src-tauri/src/identity.rs (cloud_files_detection, blocks_system_identity,
  hresult_from_win32, D5 tests)
- src-tauri/src/map/brain_index.rs (open_existing_migrating gains the M-B
  sequence; migration_lock_for, migration_safety_copy_path,
  quiesce_before_safety_copy, verify_safety_copy, restore_safety_copy)
- src-tauri/src/map/mod.rs (MapError::MigrationUnavailable)
- src-tauri/src/map/stable_identity_tests.rs (D4 tests, safety_copy_path/
  logical_snapshot helpers, extra assertions on existing D1 tests)
- src-tauri/Cargo.toml (windows-sys feature Win32_Storage_CloudFilters)
- docs/performance/runs/TASK-0036-webview2.json (fresh replay)
- docs/ai/CURRENT_STATE.md, HANDOFF.md, VALIDATION.md (section BO),
  CHANGELOG_AI.md, NEXT_ACTION.md; docs/tasks/TASK-0036-v1-stable-identity.md
  (now cites DEC-0013 and DEC-0035)

COMMIT:
PUSHED: pending (commit/push to happen immediately after this report is
written)

LIMITS_OR_BLOCKERS:
- No real Cloud Files fixture (D5) — explained above and in
  VALIDATION.md BO.2, an explicit choice ACTION-0058 itself permitted.
- No real process SIGKILL/power-loss reproduction for the M-B migration
  (D4) — the tests inject a deterministic SQL failure and a busy
  checkpoint, both in-process; the same limit PERF-0002/B1 already
  declared for the original M-B spike.
- migration_lock_for is an in-process-memory registry only — no
  cross-process coordination. Not a defect for TASK-0036 (one FileTopo
  process per session), but relevant if a future task ever runs multiple
  processes against the same application space.
- Every other limit already declared by the two earlier TASK-0036
  deliveries is unchanged: inter-volume move untested, seen-across-rename
  not replayed in WebView2 (proved at the Rust level on real Windows
  instead).
- cargo clippy remains red at 26 pre-existing errors, confirmed identical
  to the pre-pass state, all outside this pass's scope.
- Out of scope as specified: change journal, watcher, incremental update,
  no new TASK-0037.

NEXT_ORCHESTRATOR_DECISION:
- A NEW independent control of TASK-0036, by an instance distinct from the
  executor, on this corrective pass's evidence (D4/D5 closure, on top of
  the already-accepted D1/D2/D3/R1). TASK-0036 stays IMPLEMENTED until that
  control renders VERIFIED. No TASK-0037 pre-created.
