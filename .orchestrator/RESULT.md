TASK_ID: TASK-0042 — V1 Source Availability & Stale Index Foundation (F-032, foundation only)
AGENT: CLAUDE (Sonnet 5)
RESULT: DONE
BRANCH: build/v0.2-a26-v1-source-availability
BASE: 5329c0b (contains ACTION-0068 = TASK-0041 VERIFIED, DEC-0040, TASK-0042)

SUMMARY:
- TASK-0042 = IMPLEMENTED (never self-VERIFIED). F-032 stays a FOUNDATION: no watcher, no polling, no
  W-B/W-C, no TASK-0043, no PR/merge/tag/release. Detection is still manual, so nothing observes the
  source until a person clicks Actualiser / Reconstruire. The state is the LAST observation, never a
  real-time availability, and the UI wording says so ("a la derniere verification").
- A closed per-brain observation: state UNKNOWN | SYNCED | UNAVAILABLE | SOURCE_CHANGED |
  SCAN_INCOMPLETE | APPLY_FAILED, a closed reason (13 codes), observedUnixMs, lastSuccessfulRevision,
  lastSuccessfulUnixMs, persisted. No path, stable key, FileId, volume serial or OS message can exist in
  it: every field is a number, a bool or a member of a closed set. JSON keys are pinned by a test.
- Written by the REAL `publish_map` (wrapper + `publish_locked`): any success (BASELINE_FULL /
  IDENTITY_RESTAMP_FULL / INCREMENTAL incl. no-op / EXPLICIT_REBUILD_FULL) => SYNCED with the served
  revision; a refusal the SOURCE explains => the matching state; a cancellation => nothing; nothing at
  all when no Index existed yet. No failure writes the Index: corpus, index_id, revision, journal, seen
  state and preferences are byte-for-byte identical (Index file dump, digest, projection JSON, journal
  pages with seen flags, catalogue minus observation keys).
- `map_open` carries `sourceObservation`; new command `map_source_observation(brainId)` (brainId only)
  re-reads it after a failed Actualiser. Neither resolves nor stats the root.
- UI: `SourceObservationBadge` (word + symbol, never colour alone, exhaustive FR + EN). A failed
  Actualiser keeps `loaded` (only a success replaces it), asks the backend, shows "... dernier index
  conserve". No automatic Reconstruire, no need to reopen.
- `incremental.rs` (U-B kernel) NOT modified (`git diff` empty) => no F-031 re-run needed.

STORAGE AUDIT (prompt section 1):
  Chosen: `catalog_meta` in the existing catalogue, one key `source_observation.<brain_id>`, closed JSON.
  Not `schema_meta` of the Index, because:
  1. the observation of a FAILURE must be writable while the Index is, by definition, untouched; putting
     it in the Index would open the corpus for writing on every failed refresh and make a no-op or a
     failure share a file with the revision it must not advance;
  2. it survives an Index rebuilt from scratch or replaced, which is when "what did we last see" matters;
  3. the Index's reconstructible digest and schema validation never see it, so losing or corrupting it
     can never make an Index invalid (DEC-0040 section 4);
  4. no new database file. Isolation per brain by key; other keys (active brain, preferences) untouched.
  ATOMICITY COMPROMISE (stated, not hidden): the Index commit and the observation write are TWO commits.
  A crash between them leaves the previous observation next to a newer Index. It is bounded and detected:
  a SYNCED observation only counts when its lastSuccessfulRevision is the revision actually served,
  otherwise it reads back UNKNOWN (tested). A failed observation WRITE never turns an applied Index into a
  failure: the success report carries `persisted:false` (tested). On a FAILURE path a failed write cannot
  be reported (only the error returns); the previous record then stays.

CLASSIFICATION (structured, never from Display text):
  - UNAVAILABLE: ScanError::RootMetadata(io) by io::ErrorKind only -> ROOT_NOT_FOUND / ROOT_ACCESS_DENIED /
    ROOT_METADATA_UNAVAILABLE (generic closed fallback; the raw OS code/message never survives, tested).
  - SOURCE_CHANGED: ROOT_NOT_DIRECTORY, ROOT_REPARSE_POINT, ROOT_IDENTITY_CHANGED
    (`reconcile_root_identity_changed` has its own `MapError::RefreshRootChanged`, same message as before).
  - SCAN_INCOMPLETE: SCAN_DIAGNOSTICS, FINGERPRINT_DRIFT, FINGERPRINT_FAILED.
  - APPLY_FAILED: RECONCILE_REFUSED, APPLY_REFUSED, IDENTITY_REFUSED, STORE_WRITE_FAILED (`Refused::apply`).
  - A synthetic fixture's root is probed (`probe_root`) before its fingerprint so a vanished fixture is
    UNAVAILABLE, not an anonymous I/O error.

DECISIONS FOR THE ORCHESTRATOR (each is narrow and reversible):
1. Storage = catalog_meta with two commits (above), rather than schema_meta with one. The alternative
   gives atomicity for SYNCED but writes the Index on every failure and loses the observation with the Index.
2. Nothing is recorded when NO Index existed: "the last reliable Index is kept" would be a sentence about
   nothing, and the map_not_built path stays as it was. (A first baseline that fails records nothing.)
3. One line of scanner.rs: `ScanError::RootMetadata` Display now carries the io ERROR KIND only. Found by
   the WebView2 proof: the historical text ("... (os error 2)") reached the interface status line. Scope
   extension, no other behaviour change; `map_scan_failed` prefix and every existing assertion unchanged.
4. A refusal the source does not explain (binding mismatch, unresolved catalogue entry, lock poisoning) is
   NOT an observation and records nothing.
5. Write-failure honesty is asymmetric: reported on a success (`persisted:false`), not reportable on a
   failure. Also: a link at the root reports ROOT_NOT_DIRECTORY (the scanner asks "is it a directory?"
   before "is it a reparse point?"; both are SOURCE_CHANGED); ROOT_REPARSE_POINT is proved on the classifier.
NOTE (not a decision). The UI passes locale="fr" like the other panels (the map screen is French only in practice); the badge
   itself has both dictionaries, exhaustive by type.

EXISTING TESTS TOUCHED: one contract moved legitimately — `real_root_tests::rr5` compares the reopened
report EXCLUDING the observation (its two refusals are now an UNAVAILABLE observation, which it asserts).
Two helpers in refresh_incremental_tests became pub(super) (visibility only). The TASK-0041 structural
guard on the incremental arm was NOT edited: the code kept the shape it looks for.

VALIDATIONS:
- `cargo test --offline`: 626 PASS, 0 FAIL, 6 ignored (593 + 33: 30 in map/source_availability_tests.rs,
  2 unit, 1 on exposed commands). Covers prompt section G items 1-22 and the section H safety proof
  (`an_unavailable_root_is_an_observation_never_a_batch_of_deletions`).
- `pnpm test`: 438 PASS (415 + 23); `pnpm check` PASS; `pnpm build` PASS.
- `cargo build --offline` PASS; `pnpm tauri build --debug --no-bundle` PASS (a plain cargo build points at
  localhost:1420: the real replay needs this build).
- Real WebView2, real process restart x1, source STILL ABSENT at restart: `scripts/task0042-webview2.ps1`
  PASS, 0 fatal console error, 0 leak, every flag true (docs/performance/runs/TASK-0042-webview2.json).
  Harness moves the whole root out of its path (outside the process) -> real Actualiser refused (Tauri-
  Response header) -> map stays, badge UNAVAILABLE read back from the backend without map_open -> journal,
  revision, index id, projection identical, no DELETED -> restart -> Ouvrir shows map + persisted
  UNAVAILABLE with the SAME instant, nothing built at start-up -> same folder put back -> Actualiser =
  INCREMENTAL no-op, same revision, SYNCED -> folder deleted + recreated (other root, same path) ->
  refused, SOURCE_CHANGED, old Index served -> Reconstruire accepts, SYNCED.
- Clippy: lib 13 / lib-test 22, identical with and without the changes (git stash control) = historical debt;
  zero diagnostic in a created file or on an added line.
  `rustfmt --check` clean on created/touched files; the repo is not rustfmt-clean elsewhere (historical). A
  global `cargo fmt` was run by mistake mid-task and REVERTED file by file before any commit; nothing
  outside this task's files is reformatted.
- `git diff --check` clean; `scripts/audit-public-readiness.ps1 -AllowRemotes`: green after the commits (559 versioned
  files, no sensitive pattern, none over 5 MiB, allowlist not widened).
- NOT tested: permission-denied / unplugged drive / network share in the real host (classified by error
  kind at the Rust level only); SCAN_INCOMPLETE and APPLY_FAILED in the real host (Rust level only);
  process crash between the Index commit and the observation write; two processes; that a recreated
  folder never gets the same FileId (observed on ONE NTFS machine; the replaced-root refusal relies on it
  for SYSTEM identity); TASK-0041's WebView2 replay was NOT re-run (its artefact is protected) — its 43
  Rust tests were.

IMPORTANT_FILES:
- src-tauri/src/map/source_observation.rs (new); src-tauri/src/map/commands.rs (publish_map wrapper,
  open_map, read_source_observation); src-tauri/src/map/mod.rs; src-tauri/src/map/brain_index.rs (1 line);
  src-tauri/src/scanner.rs (1 line); src-tauri/src/lib.rs (command + test)
- src-tauri/src/map/source_availability_tests.rs (new, 30 tests)
- src/map/{SourceObservationBadge.tsx (new), types.ts, lifecycle.ts, MapApp.tsx, map.css} (+ 2 test files)
- scripts/task0042-{seed-proof.py,webview2.mjs,webview2.ps1}; docs/performance/runs/TASK-0042-webview2.json
- docs/tasks/TASK-0042-*.md, docs/product/FEATURE_MATRIX.md (F-032 stays PROPOSED, foundation), docs/ai/*

GIT: branch build/v0.2-a26-v1-source-availability; pushed to the same branch only; tree clean.
REMOTE / DESTRUCTIVE ACTIONS: none beyond the push to the working branch. No PR, merge, tag, release,
reset, clean, force push or history rewrite. Every proof source is synthetic; no real data. The only
paths touched outside the repo are the proof sandbox under .filetopo-sandbox (git-ignored, inside the repo).

NEXT_ACTION: independent control of TASK-0042 on evidence (this file, VALIDATION BW, source_observation.rs,
map/source_availability_tests.rs, publish_map, the badge, the WebView2 artefact). Decisions 1-5 above are
the points to rule on. F-032 cannot be declared complete before F-030 consumes this contract.
