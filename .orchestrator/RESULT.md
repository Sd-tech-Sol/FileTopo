TASK_ID: TASK-0040 — V1 Incremental Update Application Kernel
AGENT: CLAUDE
RESULT: DONE
BRANCH: build/v0.2-a24-v1-incremental-apply
FINAL_HEAD: the commit that adds this file (see `git log -1` on the branch); base cd149d5

SUMMARY:
- TASK-0040 = IMPLEMENTED (never self-VERIFIED). DEC-0038 / DEC-0010 U-B: an internal kernel,
  `Index::apply_update_batch`, applies one already-reconciled batch (upserts by stable key, deletions by
  canonical id, the root's own metadata) in ONE `IMMEDIATE` transaction and ONE revision, journal included.
  NOT wired: `map_refresh` still does the full replacement; no watcher; no TASK-0041; no Tauri command; nothing
  `Serialize`; no stable key reaches the WebView.
- AUDIT — REUSED: `change_journal::diff` (+ `append_events`, `summarize`, `PreviousNode`/`CurrentNode`) so the
  TASK-0037 journal contract is the same code, not a copy; `hierarchy::advance_revision`; `read_next_node_id`
  (made `pub(crate)`, the only `index.rs` change); `idx_nodes_stable_key`; the rusqlite 5 s busy timeout
  (verified, untouched). ADAPTED: nothing existing was reshaped. LEFT HISTORICAL: `Index::publish*` (still the
  reference for parity), `load_previous` (forbidden in the incremental path), `nodes.seen` (neither read nor
  written; DEC-0036 seen state needs no code: new events sit above the watermark).
- Preflight before the first write (zero-write proven by full-state + `total_changes` equality): duplicate
  token / key / deletion, unknown deletion, root create/delete/reparent, missing/deleted/non-directory parent,
  cycle, path/depth incoherent with the parent, duplicate live sibling name, orphan, incomplete subtree,
  PATH_FALLBACK pretending a rename/move, provenance change, index with no durable identity, negative child_count.
- Write order: new rows by ascending depth (FK), changed rows, deletions by descending depth (an anti-cascade
  probe aborts if a child remains), signed child_count deltas, node_count, next_node_id (only if allocated),
  journal events, revision. No-op (no stored column changes, nothing deleted) = no event, no revision.
- Parity with a full scan (the central proof): test harness `Pair` applies a derived batch to kernel A and
  publishes the equivalent full scan to reference B (`publish_with_identity`); rows, node_count, root_id,
  next_node_id, per-step events and the whole journal are equal. 3 seeds x 40 random batches (SYSTEM and
  PATH_FALLBACK mixed, subtree moves/renames/deletes), plus a real scanned temp tree with 4 real disk
  mutations; a full scan published AFTER 40 incremental batches finds 0 events and changes no row. Mutation
  test: breaking the child_count delta fails 20+ tests. Intentional differences, asserted not masked: the
  revision (B +1 always, A +1 only for an effective batch) and event ids.
- F-031 measurement (`incremental_bench.rs`, real kernel, on-disk WAL index, 7 runs/case, none discarded, 7
  campaigns published): 10 changes on 1k/10k/100k = 0.9-1.7 / 1.1-2.3 / 1.6-2.8 ms; 1000 changes on 100k =
  178-369 ms (full replacement today: 9-25 ms / 95-250 ms / 1.4-3.1 s). Absolute §3.3 targets: PASS in all 7.
  RATIO 100k/1k at 10 changes: 1.59, 1.62 (test profile); 2.11 (FAIL), 1.72, 1.82 (opt-level 3); 1.71, 1.67
  (declared diagnostic conditions: WAL truncated after build; 256 MiB page cache). ONE of seven exceeds 2.
  F-031 is therefore NOT claimed satisfied without reserve: growth is clearly not linear (x100 corpus -> ~x1.6-2.1
  cost, vs x120-150 for the full replacement) but the ~1 ms constant makes the ratio sit at 1.6-2.1.

VALIDATIONS:
- `cargo test --offline`: 550 PASS, 0 failed, 6 ignored (500 before, +49 kernel tests +1 bench-generator test;
  the F-031 campaign is the 6th ignored)
- `pnpm test`: 412 PASS (unchanged); `pnpm check`, `pnpm build`, `cargo build --offline`: green
- `cargo clippy --all-targets --offline`: historical debt only (lib 13 / lib-test 22), identical to a baseline
  recomputed at the start HEAD via `git stash`; zero diagnostic in a created file
- `rustfmt --edition 2024` (style_edition=2024): applied to the 3 created Rust files
- `git diff --check`: clean
- `scripts/audit-public-readiness.ps1 -AllowRemotes`: re-run after the commit (see the final report)
- WebView2 NOT replayed, deliberately: no frontend file, command, capability or dependency touched

IMPORTANT_FILES:
- src-tauri/src/incremental.rs (kernel); src-tauri/src/index.rs (`read_next_node_id` pub(crate)); src-tauri/src/lib.rs (2 mods)
- src-tauri/src/map/incremental_apply_tests.rs (49 tests + world model + test-side producer); src-tauri/src/map/commands.rs (module registration)
- src-tauri/src/incremental_bench.rs; scripts/task0040-incremental-bench.ps1
- docs/performance/runs/TASK-0040-incremental-apply-{dev,dev-run2,opt3,opt3-run2,opt3-run3,opt3-checkpointed,opt3-cache256m}.json
- docs/ai/VALIDATION.md section BT; docs/tasks/TASK-0040-v1-incremental-apply.md; docs/performance/BASELINE_TARGETS.md §3.3;
  docs/product/FEATURE_MATRIX.md (F-031 only)

COMMIT: see `git log -1` (feat(incremental): incremental application kernel (TASK-0040))
PUSHED: yes (branch build/v0.2-a24-v1-incremental-apply only; no PR, merge, tag or release)

LIMITS_OR_BLOCKERS:
- The F-031 ratio criterion is NOT established robustly: 6 of 7 campaigns <= 2, one at 2.11 (published, not
  hidden, no threshold or product setting changed). One machine, one session; the test suite only compiles with
  debug_assertions, so "dev" numbers have unoptimised SQLite; "opt3" is dev with opt-level=3 in a separate
  ignored target dir (deleted after use).
- Measured cost = application of a reconciled batch only; not detection, not reconciliation, not end to end.
- No real batch producer exists: the tests' `derive_batch` is a naive two-scan diff, NOT the future W-B.
- Decisions to review: (1) a batch may carry the root's own metadata (never identity/parent) — otherwise its
  date diverges from a full scan (found by the real-tree test); (2) "effective" = some stored column changes:
  a directory-timestamp-only batch advances the revision with 0 events, so cursors cannot stay valid over changed
  data; (3) child_count by signed delta, not recount (a recount costs as many rows as the parent has children),
  exactness proven by tests, refused if it would go negative; (4) a v3-migrated index that was never republished
  is refused (IndexNotStamped): first Actualiser must re-stamp it; (5) sibling-name uniqueness and path/depth
  coherence are enforced beyond DEC-0038's list; (6) diagnostics of a path that no longer names the node are
  removed and a batch adds none; (7) the batch order fixes the id allocation order.
- Not tested: 1 000 000 nodes, modest laptop, real process crash, deleting a 100 000-child directory (the batch
  must then name every child: proportional cost, unmeasured), real Cloud Files, cross-volume move.

NEXT_ORCHESTRATOR_DECISION:
- Independent control of TASK-0040 on evidence (this file, VALIDATION BT, the 7 JSON artefacts, the code); in
  particular whether the F-031 ratio (6/7 <= 2, one at 2.11) is sufficient. Only then may VERIFIED be attributed.
  No TASK-0041 was created.
