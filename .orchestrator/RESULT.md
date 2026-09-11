TASK_ID: TASK-0036 — V1 Stable Identity Foundation
AGENT: CLAUDE
RESULT: DONE
BRANCH: build/v0.2-a20-v1-stable-identity
FINAL_HEAD: e603e9d

SUMMARY:
- Productionised DEC-0009 I-E: `nodes.id` now survives a proven
  intra-volume rename/move. Windows SYSTEM identity (VolumeSerialNumber +
  FileId, the couple, never FileId alone) when the scanned node is
  eligible and the platform provides it; a deterministic, versioned
  PATH_FALLBACK otherwise (new module identity.rs, reuses the B3 spike's
  technique and its audited windows-sys = 0.61.2 candidate, confined to a
  Windows-only dependency section).
- Schema 3 -> 4 (index.rs + map/store.rs, bumped together): two nullable
  columns, a partial UNIQUE index, a durable next_node_id counter.
  `Index::publish` gained two modes — `identities: None` is byte-for-byte
  the pre-existing behaviour every synthetic caller already used
  (untouched); `identities: Some(list)`, called only from the real scanner
  pipeline, remaps the scan to canonical ids by matched stable key, refuses
  an in-scan collision before any write, and never recycles a deleted id.
  `seen` now carried by matched canonical id (SYSTEM) in addition to the
  historical by-path mechanism.
- TASK-0036 = IMPLEMENTED, never self-VERIFIED.

VALIDATIONS:
- Rust 365 -> 392 PASS (+27: identity.rs incl. 7 #[cfg(windows)] real-
  Windows tests; index.rs migration/remap/collision/no-recycle tests;
  map/stable_identity_tests.rs — 7 full-pipeline tests on real Windows
  files), 5 ignored (unchanged 100k/1M benches). Zero regression.
- TypeScript 339 PASS, unchanged (no frontend file touched).
- pnpm check/build, cargo build --offline, git diff --check: green.
- cargo fmt: clean on the 11 files this task touched (verified per-file;
  an unrelated 14-file reformat from a crate-root rustfmt invocation was
  reverted before commit).
- cargo clippy --all-targets --offline -- -D warnings: red at 26 errors,
  same count/diagnostics as before this task, zero new one — verified
  file-by-file.
- Real WebView2 replay, one launch, zero restarts:
  docs/performance/runs/TASK-0036-webview2.json — rename/move/moved-subtree/
  no-recycle/isolation/no-regression/no-leak all true, 0 fatal console
  errors. One documented false unrelated to identity: map_copy_node_path's
  clipboard write fails in the hidden automation window (pre-existing
  focus limitation, out of scope, caught not fatal).

IMPORTANT_FILES:
- src-tauri/src/identity.rs (new)
- src-tauri/src/scanner.rs, src-tauri/src/index.rs
- src-tauri/src/map/brain_index.rs, src-tauri/src/map/commands.rs,
  src-tauri/src/map/mod.rs, src-tauri/src/map/store.rs
- src-tauri/src/map/stable_identity_tests.rs (new)
- src-tauri/src/map/legacy_binding_tests.rs, src-tauri/src/map/lifecycle_tests.rs
- src-tauri/src/lib.rs, src-tauri/Cargo.toml
- scripts/task0036-seed-proof.py, task0036-webview2.mjs, task0036-webview2.ps1
- docs/ai/CURRENT_STATE.md, HANDOFF.md, VALIDATION.md (section BM),
  CHANGELOG_AI.md, NEXT_ACTION.md; docs/product/FEATURE_MATRIX.md (F-004);
  docs/tasks/TASK-0036-v1-stable-identity.md

COMMIT:
PUSHED: yes

LIMITS_OR_BLOCKERS:
- Inter-volume move as a preserved identity: untested, would require
  writing outside the repository.
- Identity after cloud-placeholder hydration: sidestepped
  (online_only excluded from the SYSTEM path entirely), not measured —
  DEC-0009's open question is not reopened here.
- First republish after migrating a pre-existing index reassigns ids once
  (no stable key to match against yet), declared not hidden.
- seen-across-rename not replayed in WebView2 (no seen UI/command exists in
  the product); proved instead at the Rust integration level on real
  Windows.
- Out of scope as specified: change journal, watcher, incremental update,
  move-heuristic suggestions, filters, FTS5, graphical redesign.

NEXT_ORCHESTRATOR_DECISION:
- Independent control of TASK-0036, by an instance distinct from the
  executor, on this session's evidence. No TASK-0037 pre-created.
