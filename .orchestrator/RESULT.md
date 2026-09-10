TASK_ID: TASK-0030 — V1 Pipeline Convergence — Canonical Brain Index and Bounded Runtime Projection
AGENT: CODEX
RESULT: DONE
BRANCH: build/v0.2-a14-v1-pipeline-convergence
FINAL_HEAD: ab1d7e2386dd0cf5b935377c867c89617e4e3e56

SUMMARY:
- TASK-0030 IMPLEMENTED; DEC-0031 APPROVED, independent control pending.
- Documentary freeze 0255bd1 preceded all product code. F-050/F-051 IMPLEMENTED in this synthetic tranche; F-042/F-046 PROPOSED, F-047 DEFERRED.

CANONICAL_INDEX_RESULT:
- One Index.nodes per brain; metadata/diagnostics/revision published atomically. Normal rebuild preserves index_id and advances revision.
- No runtime map_nodes writer, full-corpus layout or 5000-node build ceiling. Historical MapStore exists only in migration/test fixtures.

BOUNDED_RUNTIME_RESULT:
- map_view -> product materializer -> layered-tree-cards-v1 -> MapApp; map_snapshot is a bounded alias.
- Budget 512 entities: at most 256 material nodes plus exact direct-child aggregates. Focus, paging, endpoint lookup and off-view relation notices implemented.

REMOVED_OR_RETIRED_DUPLICATION:
- Retired runtime MapStore and durable rectangles. AnalysisInput remains a temporary metadata adapter, without a second persisted corpus or collection IPC.

VALIDATIONS:
- Rust 290 PASS, 5 ignored; TypeScript 264 PASS; typecheck and web/Rust builds PASS; strengthened runtime guard replay PASS; diff check PASS.
- Clippy FAIL: preexisting debt, 13 lib / 22 lib-test errors; 24 diagnostic source excerpts matched baseline 896e2c3. Baseline clippy not rerun.
- 100k canonical product DTO and complete child-page traversal PASS; 6001 physical synthetic build/read-only/rebuild PASS. X5 remains 36; prior artifacts unchanged.

WEBVIEW2_EVIDENCE:
- Real WebView2 152.0.4191.66: 12 nodes/11 edges; 6001 indexed -> 256 nodes + 1 aggregate/255 edges. Next page matches product DTO; 24 trusted keydowns; zero fatal errors.
- Three noncanonical JSON artifacts under docs/performance/runs/TASK-0030-*; first CDP driver attempt timed out, corrected fresh replay passed.

FILES_CHANGED:
- 36 substantive files: canonical index/projection and consumers, frontend/navigation/tests, proof scripts/JSON, task/decision/architecture/matrix and five durable session documents. Full list: git show --stat ab1d7e2386dd0cf5b935377c867c89617e4e3e56.
- This RESULT is a separate following report commit.

COMMIT: 0255bd1 (freeze), ab1d7e2386dd0cf5b935377c867c89617e4e3e56 (implementation)
PUSHED: yes

LIMITS_OR_BLOCKERS:
- No blocker. Analysis engines still collect corpus metadata in memory; no P-08/streaming optimization. Clippy is not green.
- No personal data, physical 100k/1M product acceptance, modest-laptop or GPU-disabled proof. R8, DEC-0013/F and X10 outside Windows remain open.
- Only the requested work branch was created/published/pushed. No main/PR/tag/release, force push, history rewrite or persistent sandbox deletion; legacy derived indexes and disposable synthetic test indexes were reconstructed. Analysed sources stayed unchanged.

NEXT_ORCHESTRATOR_DECISION:
- independent control of TASK-0030
