TASK_ID: TASK-0037 — V1 Change Journal on Manual Refresh
AGENT: CLAUDE CODE (Sonnet 5)
RESULT: DONE — IMPLEMENTED, never self-VERIFIED
BRANCH: build/v0.2-a21-v1-change-journal
FINAL_HEAD: (see git log after commit)
DATE: 2026-09-23

SUMMARY:
A persistent, per-brain, append-only change journal now lives in the brain's
one canonical SQLite (schema v5, table `change_events`). Every explicit
Actualiser/Reconstruire diffs the previous canonical corpus against the new
corpus (after the TASK-0036 stable-id remap) and writes the events in the SAME
transaction as the corpus and the revision. The journal is readable through a
bounded command (`map_change_journal`) and a « Changements » panel; the
Actualiser/Reconstruire report carries exact counters by nature.
No watcher, no incremental update, no map-level new/unseen filter, no mark-seen,
no TASK-0038, no PR, merge, tag or release.

0 — PRECONDITIONS
- Applied AGENTS.md/CLAUDE.md; explicit `git checkout build/v0.2-a21-v1-change-journal`,
  `git fetch origin`, `git merge --ff-only origin/...` ("Already up to date"),
  tree clean; HEAD c34096c contains ACTION-0060 and TASK-0037. main and
  docs/record-pr4-merge untouched.
- Read TASK-0037 in full before coding.

1 — AUDIT: REUSED / ADAPTED / NOT BUILT
Reused unchanged:
- The one canonical SQLite per brain (no second DB, no second Index, no parallel
  diff engine): `Index::publish` is still the ONLY publication path.
- TASK-0036 stable identity (`stable_key`, `next_node_id`, remap) — the diff
  runs on the remapped canonical ids; nothing of TASK-0036 was rewritten.
- The `M-B` migration boundary of `BrainIndex::open_existing_migrating`
  (brain/binding checks before mutation, per-brain lock, quiesce, verified
  safety copy, restore on migration OR validation failure, copy deleted only
  after final validation) — same function, same evidence D1–D6.
- `hierarchy::advance_revision/read_revision`, `IndexIdentity`, the keyset
  cursor style (versioned tag, ids only), the `SearchPage`/`NodeChildrenPage`
  DTO style, `open_store` as the only door, `BrainNodeRef` for selection,
  `selectNode`, the `ExactDuplicateExplorer` self-contained panel pattern,
  the TASK-0033..0036 WebView2 harness technique.
Adapted (minimal):
- `Index::migrate_previous_schema` → `Index::migrate_to_current_schema`, a
  dispatcher BY VERSION (3→4 then 4→5). Each step is its own atomic
  transaction stamping its own user_version last. `MAP_PREVIOUS_SCHEMA_VERSION`
  ("exactly N-1") became `store::is_migratable_schema` (closed range 3..current).
  DECISION TO REVIEW: v3 stays migratable (through both steps inside ONE M-B
  envelope) instead of being stranded by the bump; a schema newer than
  current, or older than 3, is still refused, never migrated backward.
- Safety-copy file name `.v3-safety-copy` → `.migration-safety-copy` (it no
  longer names a version).
- `finish_open_existing` (the M-B validation step) now also requires the
  journal table with all 13 columns.
- `publish` takes its transaction `IMMEDIATE` (write lock before the previous
  corpus is read for the diff) — otherwise unchanged.
- `MapBuildReport` gained `changeSummary`; `runLifecycle` returns the open
  report plus the counters for refresh/rebuild (its 3-argument contract and
  the command sequence are unchanged and still tested).
Not built (out of scope, per TASK-0037 I): watcher/`ReadDirectoryChangesExW`,
incremental application (U-B), W-B/W-C reconciliation, USN, map-level
new/unseen filters (F-022), mark seen / mark all seen (F-028), FTS5, cross-volume
heuristics, retention/pruning of the journal, a new database.

2 — SCHEMA / MIGRATION
- Current schema was v4 (confirmed) → v5 (`crate::index::SCHEMA_VERSION`,
  `store::MAP_SCHEMA_VERSION`).
- `change_events(event_id INTEGER PRIMARY KEY AUTOINCREMENT, detected_revision,
  ordinal, nature CHECK IN (5 natures), node_id, node_kind, old_name, new_name,
  old_relative_path, new_relative_path, old_parent_id, new_parent_id,
  detected_unix_ms)` + `idx_change_events_nature(nature, event_id)` +
  UNIQUE `idx_change_events_revision_ordinal(detected_revision, ordinal)`.
  No foreign key to `nodes` (a DELETED event must outlive its node; `nodes` is
  wholly replaced by every publication). AUTOINCREMENT = monotone, never reused.
- Product path v4→v5 goes through the SAME M-B: `open_map`/`open_for_brain` →
  `open_existing_migrating`. Fresh files reach v5 through `initialize()`.
- The 4→5 DDL is strict `CREATE` (not IF NOT EXISTS): a pre-existing object of the
  same name fails the step instead of being adopted.
- A migration never fabricates history: the journal starts empty.
- Proven: real v4 → v5 through `map_open` (source not read, index_id/revision
  unchanged, seen kept, copy deleted); injected failure AFTER mutation began
  (an object of the same name as a step-created index) → v4 restored, no
  half journal, retry works; validation failure (build_complete corrupted) →
  v4 restored, repaired retry migrates; a v5 file without its journal is
  refused by the canonical validation; v3 → v5 in one envelope; future schema
  (now 6) refused untouched, no copy.

3 — EVENT MODEL (no absolute path, stable key, FileId, volume serial, content)
event_id (monotone in the brain) · detected_revision · ordinal (deterministic
within the revision) · nature · node_id (canonical `nodes.id`) · node_kind ·
old/new name · old/new RELATIVE path · old/new parent_id · detected_unix_ms
(the instant of DETECTION — never presented as the instant the disk changed).
DTO adds `brainId` and `nodePresent` (does that id exist in the Index now;
ids are never recycled so `false` is permanent).

4 — DIFF RULES (pure function `change_journal::diff`, no heuristic)
- id only in new → CREATED; only in old → DELETED (one event PER node, also for
  the content of a created/deleted folder).
- same id, name changed → RENAMED; parent_id changed → MOVED; both → both, same
  detected_revision, and BOTH carry the path before/after the WHOLE publication
  (never an invented intermediate path). Journal order is (node_id, nature rank
  CREATED<RENAMED<MOVED<MODIFIED<DELETED) — deterministic, and presented only
  as publication order, never as the real chronology of disk operations.
- a descendant whose own name and parent_id are unchanged gets NO event when an
  ancestor moved/was renamed.
- MODIFIED (frozen list): kind, size_bytes, online_only, reparse_point for every
  node; modified_unix_ms ONLY for file/skipped. Never compared: child_count,
  depth, relative_path, seen, content (never read). A directory's OWN timestamp
  is excluded because the OS rewrites it whenever an entry appears/disappears/
  is renamed in it — it would flag every parent of every structural change.
  DECLARED LIMIT: a directory timestamp edit alone is not journaled.
- PATH_FALLBACK renamed/moved = its identity changes = DELETED + CREATED
  (proved with a real Windows directory junction, a real reparse point).
- Baseline rule: the first build of a brain, and the first republish of an
  index whose previous rows have NULL stable_key (a v3 file migrated but not
  yet republished), establish the reference: ZERO events, `baselineEstablished`
  true. Otherwise every id would be reported deleted+created.
- Only the identity pipeline journals (`identities: Some`, i.e. `publish_map`).
  The test-only `replace`/`replace_nodes` (caller-chosen ids) never journal.

5 — ATOMICITY
Diff, node replacement, event insert and revision bump are one IMMEDIATE
transaction. The event insert precedes the LAST write (revision bump).
Proved with in-database triggers, no production hook: a failing journal insert
fails the whole publication (corpus, revision, journal all unchanged, index
still publishable after the fault is removed); a failure of the last write
rolls the already-written events back. First build → empty journal; unchanged
refresh → zero events while the revision still advances; history never emptied
by refresh/rebuild; survives a cold reopen and a real process restart.

6 — API / UI / REPORT
- `map_change_journal(brainId, natures?, after?, limit?)`: brain named
  explicitly, no path in or out, ≤ 50/page (server clamp), newest first,
  keyset cursor `fjc1.<index_id>.<event_id>` bound to the INDEX (foreign or
  malformed → refused), NOT to the revision (a new Actualiser cannot stale a walk
  through older history), exact total for the filter read in the same read
  transaction as the page. lib.rs exposure test forbids path/root/identity params.
- `ChangeJournalPanel` (« Changements », in `MapApp`'s aside): toggle,
  five visible/combinable/revocable nature checkboxes + « Retirer les filtres »,
  exact total, events grouped by detected revision with detection date,
  relative paths only, Page précédente/suivante, « Afficher » only for a node
  that still exists (never for DELETED/vanished: « historique seulement »),
  boundary text (detection date ≠ disk date; order ≠ real chronology). Reloads
  from the newest page on a revision change (filters kept), resets on brain change,
  refuses a page naming another brain. Keyboard/accessibility at the level of
  the existing panels (native buttons/checkboxes, aria-expanded, aria-live).
- Report: `MapBuildReport.changeSummary` = created/modified/renamed/moved/
  deleted/total + baselineEstablished (counters only, not the event list);
  shown in the app report line (`change-summary`).

7 — PROOF OF THE FIVE NATURES / PAGINATION / WEBVIEW2
Rust (Windows, real scanner + real FileIdInfo): create, modify (size and
mtime-only), delete, rename (same nodeId, RENAMED only), move (same nodeId,
MOVED only), folder move (folder event only), junction rename (DELETED+CREATED),
content changed with same size/mtime (NOT observed — content never read).
Index-level synthetic identities cover the same on every platform, plus
rename+move together, directory-timestamp echo, NULL-key re-baseline.
Pagination: 130 events → pages 50/50/30 (index level), strictly decreasing
event_id, no gap/duplicate, exact totals, filters (single, multiple, repeated),
old cursor still valid after a new publication; foreign/malformed cursor refused.
WebView2 (real, docs/performance/runs/TASK-0037-webview2.json; two real launches,
one real restart; tree generated by the proof + a 130-file batch): baseline empty;
no-op refresh 0 events; create/modify/rename/move/delete each with exact
counters (1 event, total 1) and same nodeId for rename/move; 130-file batch;
UI pages 50/50/35 with no gap/duplicate; filters CREATED=131, RENAMED+MOVED=2,
DELETED=1, MODIFIED=1, revocable; page-back restores page 1; select-from-journal
opens the node; DELETED offers no selection; API bounded at 50 with working
cursor; after the restart total 135 and first/last pages identical, all five
natures present, deleted still history-only, map_open read no source, schema 5;
no absolute path / stable key / FileId / volume in DOM, payloads or artefact;
0 fatal console errors. TASK-0036 replay on the new binary: all invariants
true, 0 fatal (its artefact left untouched).

8 — TESTS / VALIDATIONS (all run in this session)
- cargo test --offline: 444 passed, 0 failed, 5 ignored (412 before: +31
  change-journal tests in map/change_journal_tests.rs, +1 exposure test in lib.rs).
- pnpm test: 352 passed (339 before: +12 ChangeJournalPanel, +1 lifecycle).
- pnpm check, pnpm build, cargo build --offline, `pnpm tauri build --debug
  --no-bundle` (needed for the WebView2 replay: a bare `cargo build` binary
  targets devUrl): green. git diff --check: clean.
- rustfmt (edition 2024) clean on all 9 touched Rust files.
- clippy --all-targets --offline -- -D warnings: RED on HISTORICAL debt only.
  Baseline HEAD c34096c measured in a temporary worktree: lib 13 + lib-test 22
  errors; now: lib 13 + lib-test 22, identical per file. ZERO diagnostic in any
  file touched by this task (one introduced type-complexity in a new test was
  fixed before delivery).
- scripts/audit-public-readiness.ps1 FAILS on PRE-EXISTING content
  (docs/ai/VALIDATION.md:3793 contains a personal local path, committed long
  before this task). Not introduced, not touched here; reported for the orchestrator.

9 — LIMITS (honest)
- Manual detection only: the WATCHER (F-030) and INCREMENTAL update (F-031)
  are not built; P-16 is only partly covered; F-029 stays PROPOSED (Actualiser is
  still a full rescan; only the counters summary is new).
- No true chronology: ordinal = publication order; the timestamp = detection.
- A directory's own timestamp edit alone is not journaled (see 4).
- Inter-volume moves and any PATH_FALLBACK rename are DELETED+CREATED (DEC-0009).
- The first republish after a v3→v5 migration journals nothing (re-baseline).
- Not tested: real Cloud Files placeholders (unchanged from TASK-0036); a real
  process crash mid-migration or mid-publication (failures are injected in the
  database, deterministic, never a SIGKILL); a corpus of 100k+ nodes for the
  journal (memory of the diff is proportional to the corpus, like the publication
  it belongs to; P-18's incremental cost target belongs to F-031); journal
  retention/growth (unbounded by design: "history never emptied").
- Modest-laptop performance not measured; WebView2 proof is on a dev workstation.
- The dead-code warning `SUGGESTION_STATES` and the 24 clippy findings are historical.
- graph/history.jsonl and graph/current_state.yaml were not updated: they have
  not been maintained since TASK-0009 (2026-08-26); catching up 27 tasks is
  outside this task. Flagged for the orchestrator.

10 — DELIVERABLES / NEXT
- TASK-0037 = IMPLEMENTED (task file, CURRENT_STATE, HANDOFF, NEXT_ACTION,
  VALIDATION section BQ, CHANGELOG_AI, FEATURE_MATRIX F-027 updated honestly).
- NEXT_ACTION = independent control of TASK-0037.
- No TASK-0038, no PR, merge, tag or release. Commit and push ONLY on
  build/v0.2-a21-v1-change-journal.
