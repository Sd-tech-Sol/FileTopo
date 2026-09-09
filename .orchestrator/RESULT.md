TASK_ID: TASK-0029 — Scale Query Foundation — Bounded Hierarchy Paging
AGENT: CLAUDE
RESULT: DONE
BRANCH: build/v0.2-a13-scale-query-foundation
FINAL_HEAD: d8f3dbf

SUMMARY:
- DEC-0030 and the TASK-0029 sheet were frozen in a separate commit before any
  Rust was touched.
- The direct-children read is now bounded and index-driven: two generated
  VIRTUAL columns (child_order_rank, name_fold) and
  idx_nodes_child_order(parent_id, child_order_rank, name_fold, id) serve the
  pre-existing functional order — directories first, name case-insensitively,
  then id — by seek instead of a temporary B-tree.
- Continuation is keyset. A row-value comparison resumes strictly after the
  last rendered row; there is no OFFSET on the product path. The cursor carries
  index_id, revision, parent_id and after_id only — no path, no name — and is
  refused as stale, foreign or parent-mismatched.
- The index revision advances inside the very transaction that replaces the
  rows, so data and revision become visible together. index_id is written once,
  so two brains never accept each other's cursors.
- Exact direct-children count comes from the durable child_count column at
  12-13 us, audited against the real COUNT(*) over the whole corpus: 0
  disagreements at both sizes.
- Schema user_version 2 -> 3, idempotent, no table rewrite, proven on a v2
  database to lose no node, no metadata and no seen flag.
- No Tauri command, no IPC contract, no UI, no materializer, no renderer, no
  new dependency. MAX_NODES_PER_MAP stays 5000; F-042/F-050/F-051 stay
  PROPOSED; P-08 search is unchanged.

VALIDATIONS:
- cargo test --lib: 285 passed, 0 failed, 5 ignored (the five campaigns).
- cargo test --lib hierarchy: 17 passed. index::: 5 passed. scale_query:
  9 passed, 2 ignored.
- scripts/task0029-scale-query.ps1: 2 campaigns green, 2 artifacts written.
- pnpm test: 261 passed, 15 files. pnpm check: clean. pnpm build: ok, 61
  modules. cargo build: ok, only the pre-existing SUGGESTION_STATES warning.
- git diff --check: clean.
- X5 = 36 in both the Rust list and the PowerShell list; the four TASK-0028
  artifacts are byte-identical since b3923e0; origin/main =
  1a7d652ca48281c1687f6d1404c56a1404df91d8, untouched.
- No WebView2 replay was run, and none was required: no UI, renderer or
  command changed.

PERFORMANCE_EVIDENCE:
- p95, page of 100 direct children, 100k -> 1M: first page 611 -> 322 us,
  mid cursor 410 -> 698 us, near-end cursor 387 -> 892 us, past-the-end cursor
  219 -> 175 us.
- Engineering criterion p95(1M) <= 5x p95(100k): PASS, worst ratio 2.30 at
  near-end. Computed by the 1M campaign itself, which reads the 100k artifact.
- TASK-0028 OFFSET prototype, same database, same process: 13.6 -> 116.7 ms
  first page, 32.8 -> 351.2 ms near the end; ratio 8.6 to 10.8.
- EXPLAIN QUERY PLAN, asserted during the run: first page SEARCH nodes USING
  INDEX idx_nodes_child_order (parent_id=?); continuation SEARCH ... (parent_id=?
  AND (child_order_rank,name_fold)>(?,?)); no USE TEMP B-TREE FOR ORDER BY, no
  corpus scan, no OFFSET. The legacy path still shows its temporary sort.
- Recursive subtree CTE measured once at 342 ms on 1M, to show what DEC-0030
  forbids on the hot path.
- Bench is DEVELOPMENT_BENCH_NOT_ACCEPTANCE, debug profile, INDEX-SCALE only.

IMPORTANT_FILES:
- docs/decisions/DEC-0030-bounded-hierarchy-query-contract.md
- docs/tasks/TASK-0029-scale-query-foundation.md
- docs/performance/TASK-0029-SCALE-QUERY-REPORT.md
- docs/performance/runs/TASK-0029-SQF-100k.json
- docs/performance/runs/TASK-0029-SQF-1m-index.json
- src-tauri/src/hierarchy.rs, src-tauri/src/index.rs
- src-tauri/src/scale_query/mod.rs, src-tauri/src/scale_query/campaigns.rs
- scripts/task0029-scale-query.ps1
- docs/ai/CURRENT_STATE.md, NEXT_ACTION.md, HANDOFF.md, VALIDATION.md,
  CHANGELOG_AI.md

COMMIT:
- 396eda0 docs(task-0029): freeze DEC-0030 and the TASK-0029 scope before any code
- 03c4177 docs(task-0029): move the task to IN_PROGRESS after the freeze
- 15b1d04 feat(task-0029): make the direct-children read bounded and index-driven
- 29661d3 test(task-0029): measure the bounded child page at 100k and 1M
- d8f3dbf docs(task-0029): report the bounded query measurements and close the slice
PUSHED: yes

LIMITS_OR_BLOCKERS:
- development bench is not TARGET_CLASS (i9-9900K, 32 GiB)
- debug-profile timings; the crate test suite does not compile under --release
- INDEX-SCALE only; no physical file created, nothing proven about the scanner
- single synthetic corpus shape (one very wide hub, one deep spine)
- two positions give a ratio below 1 — noise at a few hundred microseconds,
  not a gain
- Index::replace_nodes still holds the whole corpus in memory, 189 MB at 1M
- P-08 search unchanged and still linear in the corpus
- no end-to-end index -> view composition; the primitives reach no command
- both TASK-0029 artifacts are noncanonical, outside X5, pending independent
  control

NEXT_ORCHESTRATOR_DECISION:
- independent control of TASK-0029
