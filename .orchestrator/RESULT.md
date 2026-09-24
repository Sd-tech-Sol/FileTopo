TASK_ID: TASK-0038 — V1 Journal-derived Seen/Unseen State
AGENT: CLAUDE CODE (Sonnet 5)
RESULT: DONE
TASK_STATE: IMPLEMENTED (never self-VERIFIED)
BRANCH: build/v0.2-a22-v1-seen-state
BASE_HEAD: e5d7289 (contains ACTION-0061, ACTION-0063, DEC-0036, TASK-0038)
FINAL_HEAD: the commit that adds this file (see `git log -1` on the branch)
DATE: 2026-09-23

SUMMARY:
The seen/unseen state is now persistent, per brain, and derived from the append-only
journal (DEC-0036). Schema v6 adds a watermark and an acknowledgement table beside
`change_events`; three gestures (mark a change, mark an element, mark everything) and a
derived node state (`isNew` / `isUnseen`) are exposed through four `map_*` commands and
two UI surfaces. `nodes.seen` is neither read nor written by any of it. No map filter
(F-022), no watcher (F-030), no incremental update (F-031), no TASK-0039, no PR/merge/tag/release.

PRECONDITIONS
- Explicit `git switch build/v0.2-a22-v1-seen-state` (created from origin, tracking), fetch,
  `pull --ff-only` = already up to date, HEAD == origin/build/v0.2-a22-v1-seen-state, tree clean.
- HEAD contains ACTION-0061 (TASK-0037 VERIFIED), ACTION-0063, DEC-0036, TASK-0038.
- DEC-0036 and TASK-0038 read in full before the first change.

AUDIT (reused / adapted / left historical)
REUSED unchanged:
- `change_events` and its append-only publication in the publish transaction (change_journal.rs,
  index.rs::publish) — never altered by a mark; journal cursor `fjc1` (tied to index_id, not to
  a revision) — untouched, still valid after any mark.
- The M-B envelope `BrainIndex::open_existing_migrating` (brain/binding checks, per-brain lock,
  quiesce, verified safety copy, restore on migration OR validation failure, copy deleted only
  after canonical validation). One function; v6 added no second path.
- `BrainNodeRef` + `resolve_brain` + `belongs_to` as the only boundary for an element.
- `ChangeJournalPanel`, the details panel, the `open_store` checks (brain_id, binding).
ADAPTED:
- `Index` migration dispatcher: one more arm (`5 => run_seen_state_migration`) and one more
  unconditional `initialize` step (`migrate_to_seen_state`) — same pattern as 3->4 and 4->5.
  `SCHEMA_VERSION` / `MAP_SCHEMA_VERSION` 5 -> 6; a new `CHANGE_JOURNAL_SCHEMA_VERSION` = 5 so the
  4->5 step keeps stamping 5.
- `finish_open_existing` (canonical validation) now also requires the seen state.
- `change_journal::page` reads the watermark in its own snapshot: `ChangeEvent.seen`,
  `ChangeJournalPage.unseenTotal`.
- `open_for_brain`/`open_store` gained a `writable` mode (`open_store_writable`) used ONLY by the
  three mark commands; same checks, same M-B migration.
- Existing test helpers that fabricate older shapes (downgrade to v4 / v3, the "future schema"
  number 6 -> 7, the TASK-0031-shape helper) were adapted to v6; the ~444 earlier Rust tests still pass.
- `ChangeJournalPanel` (badges, buttons, confirmation) and `DetailsPanel` (a slot).
LEFT HISTORICAL (deliberately):
- `nodes.seen`, `Index::mark_seen`, `Index::query_nodes(unseen_only)`, and the unregistered
  prototype commands `mark_node_seen` / `query_collection_nodes` in lib.rs. Not reactivated, not read
  by the new code. The existing test `exposed_commands_stay_within_the_slice` still forbids them
  (the new commands are `map_*`). `publish` still carries `nodes.seen` across a republish as before.

SCHEMA v6 (adaptation of the SQL shape: none needed; the task's expected form was kept)
- `schema_meta['seen_through_event_id']` — TEXT integer watermark, monotone; event_id <= it => seen.
- `seen_change_events(event_id INTEGER PRIMARY KEY REFERENCES change_events(event_id) ON DELETE CASCADE)`
  — individual acknowledgements above the watermark. The FK makes a phantom acknowledgement
  impossible at storage level (tested).
- `idx_change_events_node ON change_events(node_id, event_id)` — per-node questions bounded by that
  node's own history.
- Canonical validation (M-B step 5): the table has `event_id`; the watermark exists, parses, is >= 0
  and is NOT beyond the newest event (a watermark past the journal would hide every future event).

BASELINE (DEC-0036 s.5)
- `run_seen_state_migration` inserts the watermark at `COALESCE(MAX(event_id), 0)`: the history stays
  whole and consultable, but nothing already present is "unseen" the instant the feature appears; it
  states only "tracking starts with this version". No event is created/altered/removed; no source read.
- A fresh file goes 4->5->6 through the same steps: watermark 0.
- Strict DDL/INSERT (a pre-existing object or key is a foreign file and fails); version stamped last,
  in the same transaction.

RULES (as implemented, DEC-0036)
- event seen <=> event_id <= watermark OR an explicit row.
- node unseen <=> a CURRENTLY PRESENT node has >= 1 unseen event (any nature).
- node new <=> a CURRENTLY PRESENT node has an unseen CREATED event. A node whose creation was
  acknowledged and then modified is unseen, not new.
- mark change: event must exist in this brain (else `journal_event_missing: N`); already seen = no-op
  (`alreadySeen: true`), else one row.
- mark element: `BrainNodeRef` only; node must be present (else `map_node_missing: N`); acknowledges the
  node's events unseen NOW (INSERT OR IGNORE ... event_id > watermark); a later event stays unseen.
- mark all: brain only; IMMEDIATE transaction; watermark = max(watermark, MAX(event_id)); redundant
  rows deleted. Monotone and idempotent. The confirmation is the UI's job.
- Reads (`map_node_change_state`, `map_change_journal`) never write. Nothing is marked by selection,
  display, paging, filtering or refresh.
- DEVIATION FROM THE TASK'S WORDING, DECLARED: `unseenTotal` is the unseen count over the WHOLE
  journal, not narrowed by the nature filter (it is what "Tout marquer vu" would affect). The task
  said "un compte exact `unseenTotal` si utile"; the filter-independent definition is a choice.

COMMANDS (no path, stable key or system identity in any argument or response)
- `map_change_mark_seen(brainId, eventId) -> {brainId, eventId, alreadySeen}`
- `map_node_mark_seen(reference: BrainNodeRef) -> {brainId, nodeId, newlySeenCount}`
- `map_change_mark_all_seen(brainId) -> {brainId, seenThroughEventId, newlySeenCount}`
- `map_node_change_state(reference: BrainNodeRef) -> {brainId, nodeId, isNew, isUnseen, unseenChangeCount}`
- `map_change_journal` additionally returns `items[].seen` and `unseenTotal`.

UI
- « Changements »: every event has a `Vu` / `Non vu` badge (word + symbol, not colour alone); an unseen
  event has « Marquer vu »; the unseen count is shown; « Tout marquer vu » is CONFIRMED INLINE: first
  click only opens the confirmation (no command), « Annuler » calls nothing, « Confirmer : tout marquer
  vu » is the only mutation; the page is re-read from the backend after every mark.
- Details panel: `NodeChangeState` shows `Nouveau` / `Non vu` / `Vu` for the selection (word + symbol) and
  « Marquer cet élément vu » only when unseen. It reads on selection and never marks.
- The two surfaces re-read each other through a `seenRevision` counter in MapApp. Responses naming another
  brain/node are refused; stale answers are dropped; brain change clears pending confirmation/state.

PROOFS (all run in this session)
- `cargo test --offline`: 474 PASS, 0 fail, 5 ignored (444 before: +30 new tests in
  `map/seen_state_tests.rs`, of which 1 is `#[cfg(windows)]` real junction). Covers the 19 required items:
  1 v5->v6 through M-B (real v5 with history, source not read, index_id/revision unchanged);
  2 history kept and baselined (watermark = newest event, all flags seen, unseenTotal 0, same events/order);
  3 first post-v6 event unseen; 4 CREATED unseen => new + unseen; 5 acknowledged CREATED => not new;
  6 later MODIFIED => unseen, not new; 7 idempotent + persistent across a cold reopening;
  8 mark element touches only that node; 9 later event of that node stays unseen;
  10 mark-all covers everything at its commit, absorbs explicit rows; 11 event after mark-all unseen
  (also with a real second connection holding the write lock: mark-all WAITS, then covers what the
  writer committed first, nothing after); 12 DELETED acknowledgeable as a change, node not selectable;
  13 SYSTEM rename keeps nodeId, node unseen not new; 14 PATH_FALLBACK delete+create: the new node is
  new/unseen, the old DELETED is independent (index level + real Windows junction); 15 two real brains
  with COINCIDING event/node numbers share nothing, foreign reference refused; 16 forcing `nodes.seen` to a
  contradictory value never changes isNew/isUnseen and the gestures never write it; 17 a cursor issued
  before any gesture is still valid after, no event id/order changed, row count unchanged;
  18 v5->v6 restored on migration failure AND on canonical-validation failure (retry then migrates);
  19 serialized DTOs: no root/temp path, key, FileId, volume, provenance; exact key sets.
- `pnpm test`: 376 PASS (352 before: +24 = 13 `NodeChangeState.test.tsx` + 11 `ChangeJournalSeenState.test.tsx`;
  the TASK-0037 panel test was updated: its allowed-invoke list now names the two journal-level marks).
  Covers badges, mark a change, confirm + cancel of mark-all, mark the selected element, no auto-mark on
  selection (behavioural and source-level), brain change clears state, other-brain/other-node responses refused.
- `pnpm check`, `pnpm build`, `cargo build --offline`, `pnpm tauri build --debug --no-bundle`: green.
- REAL WebView2 (two real launches of the same binary, one real restart), `scripts/task0038-webview2.ps1`
  -> `docs/performance/runs/TASK-0038-webview2.json`: baseline nothing unseen; create -> unseen event, new
  element; selecting it (and waiting) marks nothing; mark the change -> element seen; modify -> unseen not
  new; mark element; 5 mixed changes -> first click opens the confirmation only, cancel mutates nothing,
  confirm marks all (total unchanged, DELETED acknowledged and still history-only); a change AFTER mark-all
  stays unseen and its node is new; a SECOND brain: own baseline, own unseen, first brain untouched,
  marking the second leaves the first alone, switching back shows the first brain's flags only; after the
  real restart: both brains' flags identical flag-for-flag, node states persisted, panels show them,
  `map_open` reads no source, schema 6. 0 absolute path / stable key / FileId / volume leak (DOM, payloads,
  responses, artefact). 0 fatal console error.
- `git diff --check`: clean. `rustfmt --edition 2024 --check` on the 10 Rust files I touched: no diff in any of
  them (the repository has pre-existing rustfmt debt in 14 other files, untouched; a whole-crate `cargo fmt`
  was reverted for those files).
- `cargo clippy --all-targets --offline -- -D warnings`: red on HISTORICAL debt only: 13 (lib) / 22 (lib-test)
  errors, the same counts recorded for TASK-0037; ZERO diagnostic in any file this task touched. (Not
  re-measured on the base commit in this session; identity of the counts and the file list is the evidence.)
- `scripts/audit-public-readiness.ps1 -AllowRemotes`: green (see final line of the terminal report).
  Exceptions not widened.

LIMITS / NOT TESTED
- Detection is still MANUAL (Actualiser/Reconstruire); no watcher, no incremental. P-17 is covered for the
  journal-derived state, gestures, persistence and per-brain isolation; the map FILTERS (`F-022`) that
  will consume this state are NOT built.
- The TASK-0037 WebView2 harness (`scripts/task0037-webview2.mjs`) asserts schema 5 and would now fail on
  that line by design; it was NOT rerun and its verified artefact is untouched. Journal behaviour on the new
  binary is covered by the 444 earlier Rust tests + the TASK-0038 replay.
- The seen state of an EVENT is by event_id, so a journal retention/pruning feature (out of scope) would
  need to keep the watermark valid (the FK `ON DELETE CASCADE` is already in place for rows).
- "Mark all" acts on the whole brain journal, not on the current filter, by design (`unseenTotal` says so).
- Not tested: a real process crash during the v5->v6 migration (failures are injected in the database);
  journals of 100 000+ events; performance on a modest laptop; a real Cloud Files placeholder.
- After an Actualiser the selection returns to the root (existing product behaviour, unchanged): the
  element panel then shows the ROOT's state until an element is selected again.
- A whole-crate `cargo fmt` reformatted 14 unrelated files; they were restored with `git checkout --` before
  commit (only my own accidental changes, no other modification).
- graph/history.jsonl and graph/current_state.yaml unmaintained since TASK-0009 (unchanged).
- `.orchestrator/NEXT_PROMPT.md` still says STATUS: READY (orchestrator-owned; not edited).

GOVERNANCE
- TASK-0038 = IMPLEMENTED. Not VERIFIED. No TASK-0039 created. No PR, merge, tag, release. `main` untouched.
- Durable docs updated: CURRENT_STATE, HANDOFF, NEXT_ACTION, VALIDATION (section BR), CHANGELOG_AI,
  FEATURE_MATRIX (F-028 only; F-022 stays PROPOSED).
- NEXT_ACTION = independent control of TASK-0038.
- Remote actions: push of the task branch only (see the terminal report for the final commit).
