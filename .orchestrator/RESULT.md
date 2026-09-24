TASK_ID: TASK-0041 — V1 Manual Refresh Through Incremental Apply (F-029 + productisation of F-031)
AGENT: CLAUDE (Sonnet 5)
RESULT: DONE
BRANCH: build/v0.2-a25-v1-manual-refresh-incremental
BASE: d7b17a1 (contains ACTION-0067 = TASK-0040 VERIFIED, DEC-0039, TASK-0041)

SUMMARY:
- TASK-0041 = IMPLEMENTED (never self-VERIFIED). `Actualiser` of an already-stamped Index is now
  `complete manual scan -> reconcile -> minimal UpdateBatch -> Index::apply_update_batch`.
  It never goes through `publish_with_identity` on that path. `Reconstruire` stays an explicit full
  replacement. No watcher, no W-B/W-C, no F-032, no TASK-0042, no PR/merge/tag/release.
- New closed diagnostic `MapBuildReport.applicationMode`: BASELINE_FULL | INCREMENTAL |
  IDENTITY_RESTAMP_FULL | EXPLICIT_REBUILD_FULL. An incremental failure is an error; it NEVER falls
  back to one of the full modes.
- The TASK-0040 kernel is NOT modified: `incremental.rs` differs by header comments only (`git diff`
  shows no code line). No F-031 re-run needed; the canonical ratio 1.533 is untouched.
- Structural proof that fails for real: a SQLite trigger refuses to INSERT any row whose id already
  exists. A full publication (DELETE then re-insert) cannot pass it; the kernel only inserts new ids.
  Control test: the guard stops `rebuild_map` and a direct `publish_with_identity`. Mutation test: with
  the incremental arm swapped for the full publication (label kept), 22 of the 41 tests then written
  fail. The proof crosses the real `refresh_map`.

REUSE AUDIT:
  Reused as is:
  - `Index::apply_update_batch` and everything under it (unmodified); `change_journal::diff` /
    `append_events` / `summarize`; `hierarchy::advance_revision`; `read_next_node_id`;
    `idx_nodes_stable_key`. The kernel's own "index not stamped" criterion (root row has a stable_key)
    is mirrored by `reconcile::is_identity_stamped`, and a test proves the two agree.
  - `publish_map` preflight: binding check before the source is read, source resolution, complete-scan
    refusal (incomplete scan / cancellation / fingerprint drift keep the old Index), publication lock.
  - `BrainIndex::replace_with_identity` (the full path) for baseline, restamp and rebuild.
  - The whole UI surface: change summary, `describeChangeSummary`, journal panel, NEW/UNSEEN filters,
    seen state, projection reload. Identity and journal logic are not copied anywhere.
  Adapted:
  - `map/commands.rs::publish_map` (now `Gesture` + mode choice), `MapBuildReport` (+`applicationMode`),
    `map/brain_index.rs` (+`refresh_incrementally`, `has_current_stamp`, `is_identity_stamped`),
    `map/mod.rs` (+2 refusal variants, fixed-word messages), `lib.rs` (module + doc comment).
  - Frontend: `types.ts` (+`ApplicationMode`), `lifecycle.ts` (carries the mode), `MapApp.tsx` +
    `ChangeJournalPanel.tsx` (one discreet label beside the existing summary; panel not redone).
  - Earlier tests whose contract legitimately moved (see DECISIONS 4): lifecycle l4/l5, change-journal
    no-op step, real-root rr5, legacy-binding b1, TASK-0040 structural test on commands.rs.
    Two `downgrade_to_schema_*` helpers became `pub(super)` (visibility only).
  Left full on purpose:
  - Baseline (no Index): BASELINE_FULL, no invented CREATED events.
  - Legacy restamp: IDENTITY_RESTAMP_FULL, once (unstamped v3-migrated file, or pre-DEC-0033 file with
    no source binding). Impossible on an Index that carries both stamps.
  - Reconstruire: EXPLICIT_REBUILD_FULL.
  - The scan itself stays complete on every Actualiser (F-029 manual, O(corpus)); the report still
    recomputes `reconstructibleDigest` over the corpus.

NEW: `src-tauri/src/reconcile.rs` — `reconcile_full_scan(index, nodes, identities, detected_ms)`.
  Streaming single pass over stored rows; correspondence by stable key only, no heuristic; upserts =
  new or changed (moved/renamed directory brings the descendants whose path/depth changed); exact
  deletions; PATH_FALLBACK rename = delete + create (its key changes with its path); parents as
  Existing/InBatch; root observation only when it differs; deterministic; an unchanged scan is an empty
  batch that takes no write lock and keeps the revision. Refuses before any write: scan not a
  single-rooted bijection, duplicate key, dangling parent, or scanned root != indexed root.

DECISIONS FOR THE ORCHESTRATOR (each is narrow and reversible):
1. Legacy binding. A pre-DEC-0033 Index is already stamped (PATH_FALLBACK keys) but has no source
   binding; DEC-0033 D promises that an explicit refresh acquires it, and the kernel never rewrites
   brain metadata. Routed to IDENTITY_RESTAMP_FULL (once). DEC-0039 §3 spoke only of missing
   stable_key; the mode name now covers "missing identity or binding stamp". Caught by the existing
   test b1, not by design foresight.
2. `built_unix_ms` is left as the instant of the last FULL publication. It is a non-reconstructible key
   that no reader uses; an incremental application's instant is the events' `detectedUnixMs`. Writing it
   would need either a kernel change or a non-atomic second write, and a no-op must write nothing.
   `label` and other brain metadata are not rewritten either (binding checked before the scan).
3. Diagnostics: no kernel change needed. An incomplete scan has been refused since de60ef1, before stable
   identity (e603e9d), so a stamped product Index never holds a diagnostic; a test asserts the table is
   empty after a refresh, and the kernel already clears a diagnostic on a changed/deleted path.
4. Revision. A no-op no longer advances it (DEC-0039 §6); a folder's own timestamp advances it with an
   empty summary (tested, stated). Old assertions "no-op advances the revision" were updated in three
   earlier tests; l4/l5's INSERT trigger only fires on the full path, so it now asserts Reconstruire
   rolls back and Actualiser is a no-op (the incremental injected-failure proof is in the new file).
5. Root identity changed (folder replaced, volume serial changed): explicit refusal
   `map_refresh_reconcile_refused: reconcile_root_identity_changed`, Index untouched, "Reconstruire"
   still available. Before this task a refresh silently replaced everything. This is F-032's border.
6. `Reconstruire` on a brain with no Index = BASELINE_FULL (nothing to rebuild, a baseline is laid).

VALIDATIONS:
- `cargo test --offline`: 593 PASS, 0 FAIL, 6 ignored (550 before + 43, all in
  `map/refresh_incremental_tests.rs`: randomised reconciler-vs-full-publication parity 6 seeds x 40
  rounds, real-tree scenarios for every required case, rollback by injected INSERT/UPDATE/DELETE/
  journal/revision failures, root-identity refusal, cancelled/absent source, v3/v5/NULL-stamp/legacy
  restamp then incremental, two isolated brains, no absolute path / key / FileId in any surface,
  real PATH_FALLBACK (Windows junction) rename = delete + create, guard control + mutation test).
- `pnpm test`: 415 PASS (412 + 3); `pnpm check` PASS; `pnpm build` PASS.
- `cargo build --offline` PASS; `pnpm tauri build --debug --no-bundle` PASS.
- Real WebView2, real process restart x1: `scripts/task0041-webview2.ps1` PASS, 0 fatal console error,
  0 leak, every flag true (docs/performance/runs/TASK-0041-webview2.json). Covers BASELINE_FULL ->
  unchanged INCREMENTAL no-op (same revision) -> external create/modify/delete/rename/move/new folder ->
  ONE Actualiser INCREMENTAL, exact summary, exactly +1 revision -> journal + NEW/UNSEEN through the real
  panels -> mark all seen, later change unseen again -> element seen then changed again -> folder rename
  with descendants -> Reconstruire EXPLICIT_REBUILD_FULL with journal/seen intact -> incremental again ->
  second brain untouched -> restart: same Index/revision/journal, cold Actualiser incremental + quiet.
- Clippy: lib 13 / lib-test 22, identical to the historical debt (TASK-0037/38/39); zero diagnostic in a
  created file or on an added line (the one in `lib.rs` is the untouched `unattended` block).
  `rustfmt --check` clean on every created file, on `brain_index.rs` and on the touched test files;
  the repository is not rustfmt-clean elsewhere (historical), `lib.rs`/`commands.rs` were not reformatted.
- `git diff --check` clean; `scripts/audit-public-readiness.ps1 -AllowRemotes`: green after the commits
  (547 versioned files, no sensitive pattern, none over 5 MiB, allowlist not widened).
- NOT tested: end-to-end Actualiser cost on 100k+ nodes (scan and digest are O(corpus)); an
  "online-only" PATH_FALLBACK (real junction tested); a process crash mid-refresh; two processes on one
  Index; the watcher, F-032, W-B/W-C (out of scope). The WebView2 harness reads the mode from the
  discreet label the product renders from the real report: CDP cannot read a custom-protocol response
  body, so the wire (Network domain) only proves completion and success.

IMPORTANT_FILES:
- src-tauri/src/reconcile.rs (new); src-tauri/src/map/brain_index.rs; src-tauri/src/map/commands.rs;
  src-tauri/src/map/mod.rs; src-tauri/src/lib.rs; src-tauri/src/incremental.rs (comments only)
- src-tauri/src/map/refresh_incremental_tests.rs (new, 43 tests)
- src/map/{types,lifecycle,MapApp,ChangeJournalPanel}.ts(x) (+ their tests)
- scripts/task0041-{seed-proof.py,webview2.mjs,webview2.ps1}; docs/performance/runs/TASK-0041-webview2.json
- docs/tasks/TASK-0041-*.md, docs/product/FEATURE_MATRIX.md (F-029, F-031), docs/ai/*

GIT: branch build/v0.2-a25-v1-manual-refresh-incremental; pushed to the same branch only; tree clean.
REMOTE / DESTRUCTIVE ACTIONS: none beyond the push to the working branch. No PR, merge, tag, release,
reset, clean, force push or history rewrite. Sources of every proof are synthetic; no real data.

NEXT_ACTION: independent control of TASK-0041 on evidence (RESULT.md, VALIDATION BV, reconcile.rs,
map/refresh_incremental_tests.rs, the WebView2 artefact). Decisions 1-6 above are the points to rule on.
