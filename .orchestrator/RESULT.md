TASK_ID: TASK-0036 — V1 Stable Identity Foundation — corrective pass (ACTION-0057)
AGENT: CLAUDE
RESULT: DONE
BRANCH: build/v0.2-a20-v1-stable-identity
FINAL_HEAD: (see git log after commit)

SUMMARY:
ACTION-0057 confirmed the I-E core but blocked VERIFIED on three defects
(D1, D2, D3) and one reserve (R1). All four closed this pass, no scope
widening (no TASK-0037, no journal/watcher/incremental).

- D1 — migration 3->4 now reachable by the product cycle.
  `BrainIndex::open_existing` unchanged, still strictly v4-only. New
  `BrainIndex::open_existing_migrating(path, writable, brain)` is the only
  migrating entry point: checks brain_id then `binding_matches(brain)`
  (shared logic, also now used by `commands::check_publishable`) BEFORE any
  mutation and before any source resolution; a mismatch refuses without
  migrating and without reading the source; the legacy-synthetic exception
  stays restricted to SYNTHETIC_FIXTURE, never widened to REAL_ROOT; any
  schema other than exactly MAP_PREVIOUS_SCHEMA_VERSION (3) is refused as
  IndexIncompatible, never migrated. `open_for_brain` (the one chokepoint
  open_store/check_publishable already shared) does a cheap read-only
  `peek_schema_version` first and only reopens writable+migrating for a
  file at exactly v3; the ordinary (already-v4) path is byte-identical to
  before, still read-only. map_open still declares sourceRead=false.
  Product-pipeline proof:
  `a_real_v3_index_upgrades_through_map_open_without_reading_the_source`
  (src-tauri/src/map/stable_identity_tests.rs) builds a REAL v4 REAL_ROOT
  index via refresh_map, downgrades it to the exact v3 shape (drops the two
  TASK-0036 columns/index, forgets next_node_id, rolls schema_version/
  user_version back to 3 — real product output degraded, not hand-written
  SQL), then proves: migration actually triggers via map_open; sourceRead
  stays false; index_id/index_revision unchanged by the migration itself;
  corpus/seen intact; a cursor issued before the downgrade still resolves
  right after migration (revision unchanged), and only becomes stale once a
  real republish actually advances the revision (which it does, by
  exactly one). Three more tests prove brain_id mismatch, disagreeing
  binding, and a future (v5) schema are all refused before any migration,
  proven byte-identical before/after.

- D2 — migration 3->4 now atomic. All of it — both ALTER TABLEs, the
  unique index, next_node_id's bootstrap, and the final
  PRAGMA user_version/schema_version write — is inside one
  `unchecked_transaction()` (`Index::run_stable_identity_migration`),
  committed once. Proven with a real schema obstruction, not a test-only
  hook: a TABLE named `idx_nodes_stable_key` is pre-created on a v3
  fixture; both ALTER TABLEs inside the transaction succeed, then
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_nodes_stable_key` genuinely fails
  (IF NOT EXISTS only tolerates a same-named INDEX, not a TABLE) — a real
  post-mutation SQL failure. After the failure: user_version still 3, both
  new columns absent, next_node_id still absent, schema_meta still '3',
  all 3 nodes/seen/index_id/index_revision intact. Obstruction removed,
  the same file migrates correctly (test:
  `migration_v3_to_v4_rolls_back_completely_on_injected_failure`,
  src-tauri/src/index.rs).

- D3 — PATH_FALLBACK now hashes the raw OS path. `identity::
  path_fallback_key` takes `&Path` (was `&str`) and hashes
  `path_codec::encode_path(relative)` — UTF-16LE on Windows, raw OsStr
  bytes elsewhere — never `to_string_lossy()`. Hashed material is
  length-prefixed (explicit 8-byte LE length of the encoded path) before
  the kind tag, closing a concatenation ambiguity a bare separator byte
  would leave open. `scanner.rs` now passes the scanner's own raw relative
  PathBuf, not the lossy display string. Windows test (run on real
  Windows): two distinct PathBufs built from different unpaired UTF-16
  surrogates (0xD800 vs 0xD801) whose `to_string_lossy()` collides to the
  same U+FFFD-repaired string produce DIFFERENT fallback keys — the exact
  ambiguity closed. A non-Windows equivalent (non-UTF-8 bytes) is present
  and compiles under #[cfg(not(windows))].

- R1 — "Copier le chemin" closed with fresh evidence, not just a citation.
  No line of resolve_confined_target/copy_target_path/reveal_node touched
  by this pass. The existing WebView2 harness
  (scripts/task0036-webview2.ps1/.mjs, unmodified) was re-run in full
  rather than only citing TASK-0035 VERIFIED: new artifact shows
  copyStillSucceeds=true, copyFailureReason=null — the earlier hidden-
  window clipboard failure did not reproduce.

- Bonus, found while auditing D1/D2: `publish_with_identity` documented an
  unverified bijection precondition (identities must name each published
  node exactly once) reachable to a real `.expect()` panic on a missing
  identity. Closed with `PublishError::IdentityNotBijective` (+
  `MapError::IdentityNotBijective`), bounded validation before any write:
  refuses a duplicate node_id within identities, and any disagreement
  between the node_id sets of `nodes` and `identities` (covers both a
  missing identity and an identity for an unknown node_id). Three
  dedicated tests in index.rs.

TASK-0036 = IMPLEMENTED, never self-VERIFIED.

VALIDATIONS:
- cargo test --offline: 402 PASS (392 + 10 new: 2 identity.rs, 4
  stable_identity_tests.rs real-pipeline, 1 atomic-rollback index.rs, 3
  bijection index.rs), 5 ignored (unchanged), 0 failed.
- pnpm test (vitest): 339 PASS, unchanged — zero TypeScript file touched.
- pnpm check, pnpm build, cargo build --offline, git diff --check: green.
- cargo fmt: clean on the 8 files this pass touched (identity.rs, index.rs,
  map/brain_index.rs, map/commands.rs, map/mod.rs,
  map/stable_identity_tests.rs, map/store.rs, scanner.rs) — verified with
  `--config style_edition=2024` explicit: this machine's rustfmt
  (1.9.0-stable) does NOT apply Rust-2024 style by default with
  `--edition 2024` alone, and would otherwise rewrite toward an older
  style that actively disagrees with what is already committed
  (reproduced on hierarchy.rs, never touched by this pass, at HEAD, before
  any change — see HANDOFF.md for the full pitfall note). Whole-crate
  `cargo fmt -- --config style_edition=2024` was run once to derive the
  correct diffs, then every file outside this pass's touched set was
  reverted with `git checkout` before anything else — same discipline the
  original TASK-0036 delivery already documented and hit again here.
- cargo clippy --all-targets --offline -- -D warnings: red at 26 errors
  (24 unique diagnostics, doubled lib+test). Confirmed byte-for-byte
  identical to HEAD via `git stash` before this pass (same file, same
  line, same message for every one) — zero new diagnostic, none in any of
  the 8 touched files.
- Real WebView2 replay, one launch, zero restarts (same harness, re-run):
  docs/performance/runs/TASK-0036-webview2.json — every TASK-0036
  invariant still true (rename/move/moved-subtree/no-recycle/search/
  children/projection/reveal/no-leak), copyStillSucceeds flipped
  false->true, fatalConsoleErrors=0.
- v3->v4 upgrade scenario deliberately kept as a Rust-only proof, not
  added to the WebView2 harness — explained in VALIDATION.md section BN.7:
  the Rust pipeline test asserts index_id/index_revision/cursor identity
  directly against a real degraded-to-v3 product file, more precise than a
  WebView2 scenario that would have to fabricate the same file another way
  without that fine-grained assertion.

IMPORTANT_FILES:
- src-tauri/src/identity.rs (path_fallback_key/compute_identity now take
  &Path; D3 tests)
- src-tauri/src/scanner.rs (passes raw relative PathBuf, D3)
- src-tauri/src/index.rs (atomic migrate_to_stable_identity +
  migrate_previous_schema, MigrationError; publish() bijection guard +
  PublishError::IdentityNotBijective; D2/bonus tests)
- src-tauri/src/map/brain_index.rs (open_existing_migrating,
  peek_schema_version, binding_matches, finish_open_existing; D1)
- src-tauri/src/map/commands.rs (open_for_brain migration branch,
  check_publishable simplified onto binding_matches)
- src-tauri/src/map/mod.rs (MapError::IdentityNotBijective)
- src-tauri/src/map/store.rs (MAP_PREVIOUS_SCHEMA_VERSION)
- src-tauri/src/map/stable_identity_tests.rs (D1 pipeline + 3 refusal
  tests, downgrade_to_schema_v3 helper)
- docs/performance/runs/TASK-0036-webview2.json (fresh replay, R1)
- docs/ai/CURRENT_STATE.md, HANDOFF.md, VALIDATION.md (section BN),
  CHANGELOG_AI.md, NEXT_ACTION.md; docs/tasks/TASK-0036-v1-stable-identity.md

COMMIT:
PUSHED: pending (commit/push to happen after this report is written, per
fermeture-session protocol)

LIMITS_OR_BLOCKERS:
- v3->v4 upgrade kept as a Rust-only product-pipeline proof, not replayed
  in WebView2 — explained above and in VALIDATION.md BN.7, an explicit
  choice the corrective prompt itself allowed.
- Every other limit already declared by the original TASK-0036 delivery is
  unchanged: inter-volume move untested (would require writing outside the
  repository), identity after cloud-placeholder hydration sidestepped not
  measured, seen-across-rename not replayed in WebView2 (no product UI/
  command exists for it; proved at the Rust level on real Windows instead).
- cargo clippy remains red at 26 pre-existing errors, confirmed identical
  to HEAD, all outside this pass's scope — not touched, not claimed fixed.
- Out of scope as specified by the corrective prompt: change journal,
  watcher, incremental update, no new TASK-0037.

NEXT_ORCHESTRATOR_DECISION:
- A NEW independent control of TASK-0036, by an instance distinct from the
  executor, on this corrective pass's evidence (D1/D2/D3/R1 closure).
  TASK-0036 stays IMPLEMENTED until that control renders VERIFIED. No
  TASK-0037 pre-created.
