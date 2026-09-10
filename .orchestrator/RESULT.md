TASK_ID: TASK-0034 — V1 Find & Open
AGENT: CLAUDE
RESULT: DONE
BRANCH: build/v0.2-a18-v1-find-open
FINAL_HEAD: d0f79ac
GO: 7707761, child of 81f9d2c

SUMMARY:
- Bounded local search (name/relative path) over a brain's canonical Index,
  focusing a result outside the ordinary projection, then a safe "Ouvrir
  dans l'Explorateur Windows" action based solely on BrainNodeRef over IPC.
  TASK-0034 stays IMPLEMENTED, never self-VERIFIED. Also records
  ACTION-0051's already-rendered TASK-0033 VERIFIED verdict in the five
  durable docs, which that commit never updated on its own (same gap as
  ACTION-0049 before it).

REUSED / ADAPTED / NOT REACTIVATED (confirmed before writing code, per §0.7):
- REUSED as-is: Index::query_nodes() (escaping, directories-first order,
  exact total) behind open_store(); map_view(brain_id, focus_id, after) and
  the frontend's existing changeProjection() for focusing a result — no new
  camera logic was written, TASK-0033's VERIFIED camera handles it; BrainNodeRef
  as the IPC identity, unchanged.
- ADAPTED: the 0.1 prototype's resolve_indexed_target() becomes
  confine_indexed_target() (commands.rs), walking against
  BrainSource::resolve(paths, brain)?.root(paths) instead of the old
  Registry; the direct explorer.exe launch (/select, for a file, bare path
  for a directory) is kept, extracted into explorer_argument() so it is
  testable without spawning a process.
- NOT REACTIVATED: query_collection_nodes, mark_node_seen and
  reveal_indexed_node remain #[allow(dead_code)] and unregistered — the
  pre-existing test exposed_commands_stay_within_the_slice already asserts
  this and stays green unmodified. No Registry is opened by any new code.

FINAL IPC SURFACE ADDED:
- map_search_nodes(brain_id, query, offset, limit?) -> SearchPage. SearchPage:
  {brainId, query, total, offset, limit, indexRevision, items: SearchHit[]}.
  SearchHit: {brainId, nodeId, name, relativePath, kind} — no absolute/root/
  source field, on either type.
- map_reveal_node(reference: BrainNodeRef) -> (). Reveal's ONLY frontend
  parameter, verified by a new structural guard in lib.rs
  (search_and_reveal_are_exposed_and_reveal_takes_only_a_brain_node_ref) that
  reads the command's own signature text and asserts it contains
  `reference: map::brains::BrainNodeRef` and none of
  path/root/folder/directory/`target: String`.
- No new capability permission: capabilities/default.json is untouched;
  the_capability_grants_the_webview_no_dialogue_and_no_filesystem_access
  (pre-existing) still asserts permissions == ["core:default"].

PROOFS — search/revision:
- Rust (find_open_tests.rs): partial name/path match found and bounded to
  SEARCH_LIMIT_MAX=50 even when a caller requests more; empty/blank query
  ("", "   ", "\t") returns an empty page without ever calling query_nodes
  (its WHERE clause treats '' as "match everything", which a search box must
  never trigger); total/offset/limit exact across two 10-item pages of a
  30-item corpus with zero id overlap between pages; %, _ and \ match
  literally (an unescaped `_` does not behave as SQL's any-char wildcard,
  proven with a deliberately near-miss query); results isolated by brain;
  search succeeds with zero fixture ever materialised on disk (no source
  read); the JSON DTO carries no absolutePath/rootPath/sourcePath/
  folderPath field, on the page or any item; republishing the index advances
  indexRevision.
- TypeScript: none needed beyond the WebView2 replay for search/activation —
  the logic lives inside MapApp.tsx's hooks, which this project's own
  convention proves through a live WebView2 replay rather than a unit test
  (the same choice TASK-0033's camera effects made).

PROOFS — reveal:
- Rust (find_open_tests.rs): refuses a BrainNodeRef whose brain_id differs
  from the resolved brain (BrainMismatch); refuses a Skipped-kind or
  reparse_point-flagged node before any root resolution; refuses an unknown
  node_id (NodeMissing); refuses a target that genuinely disappeared after
  indexing — exercised against a REAL fixture directory built by build_map,
  with one indexed file actually deleted from disk, walking the REAL
  confinement code path (real BrainSource::resolve, real
  fs::symlink_metadata) without ever reaching Command::spawn; confinement
  rejects a crafted ".." component; confinement accepts a real nested entry
  and refuses a missing one; explorer_argument() selects a file with
  "/select," and opens a directory with its bare path — asserted directly,
  never through a spawned process.
- TypeScript (DetailsPanel.test.tsx, 5 tests): the button is hidden without
  both a reference and a handler; clicking it calls onReveal with EXACTLY
  the reference object — Object.keys sorted equals ["brainId", "nodeId"],
  proving no extra field can be smuggled in at this boundary; busy state
  disables the button and shows the busy label; a generic, non-path error
  message renders when set; the existing relative-path row is unchanged.

WEBVIEW2 REPLAY (scripts/task0034-seed-proof.py + task0034-webview2.mjs/.ps1,
reusing TASK-0033's harness technique and its 5,206-entry REAL_ROOT tree,
with one fixed-named file — C/cible-recherche-unique.txt — added as a known
search target outside the ordinary projection):
- Indexed 5,206 nodes; confirmed the needle is genuinely absent from the
  root's ordinary map_view response.
- Real typing (CDP Input.insertText) into the search field found exactly 1
  hit, matching a direct map_search_nodes invoke's total/relativePath/
  indexRevision; the DOM's data-index-revision attribute matched the DTO.
- Effacer (search-clear) empties the field and hides the results panel —
  proving the empty-query product requirement live, not just clearing text.
- Real activation (focus + trusted Enter keydown on the search-hit button)
  loaded a new projection and selected the correct node: .details__name and
  .details__path matched the needle, and the canvas's aria-activedescendant
  ended in the hit's own node id.
- A real refresh (same lifecycle-refresh button, a second trusted click)
  advanced the revision (1 -> 2); the UI's own displayed search page
  auto-reloaded at the new revision rather than silently keeping the old
  one — the effect that re-issues a search on every revision change did
  exactly what it is for.
- map_reveal_node invoked directly on the search hit's reference: spawn
  succeeded (no error thrown). Done as a single direct invoke rather than
  also clicking the DetailsPanel button, specifically to avoid spawning a
  second visible explorer.exe window for the same fact — the button's own
  wiring is proven by DetailsPanel.test.tsx instead.
- No absolute path or internal jargon string in DOM body text, in the
  map_view/map_search_nodes payloads, or in the host log. 0 fatal console
  errors.
- Artifact: docs/performance/runs/TASK-0034-webview2.json
  (NONCANONICAL_ENGINEERING_EVIDENCE).

TEST-HARNESS DEFECT FOUND AND FIXED WHILE WRITING THIS PROOF (not a product
defect): the script originally called `invoke("map_refresh", ...)` directly
right after the UI's own refresh click, purely to capture a report object.
That second, script-only refresh advances the backend's revision a second
time that the running React app's own state never learns about (it only
updates on its own internal invoke calls), producing an artificial
revision mismatch that made the app's genuinely-correct staleness guard
reject an activation that should have succeeded. Fixed by reading state via
the read-only map_view instead of calling map_refresh/map_rebuild a second
time from a proof script. Documented in HANDOFF.md for the next replay.

VALIDATIONS:
- Rust: cargo test --offline — 344 PASS, 0 failed, 5 ignored (328 before
  this task; +16: 15 in find_open_tests.rs, +1 lib.rs structural guard).
- TypeScript: vitest run — 294 PASS, 19 files (289 before; +5
  DetailsPanel.test.tsx).
- pnpm check (tsc --noEmit): clean.
- pnpm build (tsc && vite build): clean.
- cargo build --offline: clean (one pre-existing unrelated warning,
  relations.rs::SUGGESTION_STATES dead_code).
- git diff --check: clean.

CLIPPY / FMT STATE:
- cargo fmt --check: clean on every line this task touched — lib.rs,
  map/commands.rs, map/mod.rs, and the new map/find_open_tests.rs — checked
  hunk-by-hunk against `git diff --unified=0`, not just file-by-file (a
  direct `rustfmt` invocation on the new test file was verified afterward to
  have touched no other file). 143 pre-existing diagnostics remain in other,
  untouched files (mostly relation_commands.rs), reported and left intact —
  same count as the baseline established in the prior session.
- cargo clippy --all-targets --offline -- -D warnings: red at 26 errors,
  the same count as before this task. The one lib.rs-located diagnostic in
  the report is the same pre-existing "if statement can be collapsed" in the
  unrelated FILETOPO_AUTO_* env-var check, merely shifted to a new line
  number by this task's insertions — confirmed by reading the flagged line.
  None of the 26 are in a file/line this task actually wrote.

CONFIDENTIALITY: no personal brain, no absolute path returned, logged, or
committed. The REAL_ROOT tree is generated fresh by the seed script under
the proof root and destroyed with it. map_reveal_node was exercised only
against synthetic targets. A real explorer.exe window may remain open on
the desktop after the WebView2 replay — TASK-0034 explicitly forbids
killing Explorer globally, so it is left for Windows to manage; this is
expected, not a leak.

LIMITS / REMAINING DEBT:
- Development workstation only; no modest-laptop acceptance claim.
- cargo clippy strict debt (26, pre-existing) untouched — not this task's
  scope to fix.
- Directional relation colour palette from REFERENCE_UX_OLD_FILETOPO.md
  still not implemented (deferred since TASK-0033).
- Out of scope per the task file: FTS5/advanced search, new/unseen filters,
  watcher/incremental, change history, absolute-path copy, screen/icon
  preferences, a new rendering engine, network/cloud/LLM/MCP.

X5: unchanged
MAIN_UNCHANGED: yes
TASK_STATUS: IMPLEMENTED
DECISION_STATUS: DEC-0031/0033/0034 unchanged; no new decision required
PUSHED: yes — build/v0.2-a18-v1-find-open only, no PR, no merge, no tag,
no release, no history rewrite
NEXT: independent control only
