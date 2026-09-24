TASK_ID: TASK-0039 — V1 Dynamic Filters
AGENT: CLAUDE
RESULT: DONE
BRANCH: build/v0.2-a23-v1-dynamic-filters
FINAL_HEAD: the commit that adds this file (see `git log -1` on the branch); base 41a840f

SUMMARY:
- TASK-0039 = IMPLEMENTED (never self-VERIFIED). F-022 / P-09 delivered per DEC-0037: state
  (Tout / Nouveaux / Non vus), type (dossiers / fichiers / ignorés), availability (Tout / local /
  en ligne seulement), combined by AND; exact total and a bounded keyset page computed by SQLite over
  the canonical Index only; match / context distinguished; filtered pagination.
- AUDIT — REUSED: the canonical Index/`nodes` (no second Index, no schema change, still v6);
  `change_journal::unseen_predicate` + watermark (DEC-0036 truth, called not copied);
  `hierarchy::identity`/`MAX_ANCESTOR_CHAIN`/`Index::node`/`node_from_row`; the DEC-0031/0034 budgets
  and `layout::compute`; `BrainIndex::metadata_node`.
  ADAPTED: `map_view` (optional `filter`), `MapSnapshot` (optional `filtered`, absent when unfiltered),
  two `projection.rs` constants made `pub(super)`, `MapApp`/`MapView`/`RenderedBrain` (panel, roles,
  re-read after a seen gesture or Actualiser).
  LEFT HISTORICAL: `nodes.seen`, `Index::query_nodes(unseen_only)`, `query_collection_nodes` — not
  reactivated; the filtered query does not even name `seen` (DTO column replaced by constant 0).
- Rust: `node_filter.rs` (closed filter, normalisation, canonical form, `Index::filtered_matches`,
  `ftf1` cursor bound to index_id + revision + canonical filter + last match, no OFFSET, root excluded)
  and `map/filtered_projection.rs` (single `map_view` dispatch; unfiltered path byte-identical; filtered
  page <= 63 matches / 64 nodes root included; a match that would overflow with its ancestry opens the
  next page; only real parent/child edges; no aggregate reinterpreted).
- UI: `FilterPanel` (accessible groups, "Réinitialiser les filtres", active filter in words, exact
  "N correspondance(s)", Correspondance/Contexte word + symbol + outline), `useProjectionFilter`
  (keeps filter + brain + cursor stack only; stale reply refused; brain switch drops the filter; seen
  gesture / new revision re-read from the core).
- Real WebView2 replay on generated data (2 brains): all 13 scenario points; 151 matches in 3 pages
  (63/62/26, <= 64 cards); Actualiser with an active filter re-reads it; 0 leak; 0 fatal console error.

VALIDATIONS:
- `cargo test --offline`: 500 PASS, 0 failed, 5 ignored (474 before, +26 incl. the 100 000-node
  exactness/bound test)
- `pnpm test`: 412 PASS (376 before, +36); `pnpm check`, `pnpm build`, `cargo build --offline`,
  `pnpm tauri build --debug --no-bundle`: green
- Real WebView2: `scripts/task0039-webview2.ps1` -> `docs/performance/runs/TASK-0039-webview2.json` (PASS)
- `cargo clippy --all-targets --offline`: historical debt only (lib 13 / lib-test 22, same counts as
  TASK-0037/0038), zero diagnostic in a created file or added line
- `git diff --check`: clean
- `scripts/audit-public-readiness.ps1 -AllowRemotes`: green (516 tracked files, allowlist not widened)

IMPORTANT_FILES:
- src-tauri/src/node_filter.rs; src-tauri/src/map/filtered_projection.rs; src-tauri/src/map/filter_tests.rs
- src-tauri/src/map/commands.rs (`view_with_filter`); src-tauri/src/lib.rs (`map_view` + `filter`);
  src-tauri/src/change_journal.rs (`unseen_predicate` pub(crate))
- src/map/FilterPanel.tsx; src/map/useProjectionFilter.ts; src/map/filters.ts; src/map/MapApp.tsx; src/map/MapView.tsx
- scripts/task0039-webview2.ps1 / .mjs; scripts/task0039-seed-proof.py; docs/performance/runs/TASK-0039-webview2.json
- docs/ai/VALIDATION.md section BS; docs/tasks/TASK-0039-v1-dynamic-filters.md; docs/product/FEATURE_MATRIX.md (F-022 only)

COMMIT: see `git log -1` (feat(filters): dynamic filters over the canonical Index (TASK-0039))
PUSHED: yes (branch build/v0.2-a23-v1-dynamic-filters only; no PR, merge, tag or release)

LIMITS_OR_BLOCKERS:
- ONLINE_ONLY proved at the Rust level only: no Cloud Files placeholder fabricated or hydrated; the real
  fixture correctly returns 0 online-only nodes.
- Filters are not persisted across a restart (P-19, out of scope). No new performance threshold; filter
  latency NOT measured; the total is an exact COUNT(*) recomputed on every page.
- Decisions to review: (1) a context ancestor may itself satisfy the filter — it is counted/paged as a
  match only where the keyset reaches it; (2) navigating (explore branch, search hit) leaves the filtered
  view; (3) a match whose ancestry alone exceeds the technical ceiling is refused, not truncated.
- Not tested: 1 000 000 nodes, modest laptop, real Cloud Files, process crash.
- The local dev executable was overwritten by a later plain `cargo build` after the replay (code unchanged).

NEXT_ORCHESTRATOR_DECISION:
- Independent control of TASK-0039 on evidence (RESULT.md, VALIDATION BS, the WebView2 artefact, the code);
  only then may VERIFIED be attributed. No TASK-0040 was created.
