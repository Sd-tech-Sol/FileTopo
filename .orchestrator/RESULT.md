TASK_ID: TASK-0031 — V1 Brain Lifecycle — Open / Refresh / Rebuild Separation
AGENT: CODEX (initial implementation), then CLAUDE (resume, fixes, proofs, closure)
RESULT: DONE
BRANCH: build/v0.2-a15-v1-brain-lifecycle
FINAL_HEAD: 003a567

SUMMARY:
- R-T30-2 turned into a product boundary: opening a brain reads its persistent index and never scans the source
- map_open reads through BrainIndex::open_existing — SQLITE_OPEN_READ_ONLY, no CREATE, no migration, no source access, no fingerprint, revision unchanged
- missing index -> NotBuilt; foreign schema -> IndexIncompatible; foreign brain -> BrainMismatch; never an automatic rebuild, never a deletion
- MapOpenReport carries opening facts only: OPENED_EXISTING, indexId, revision, nodeCount, schemaVersion, sourceRead=false, indexReused=true, freshness=UNKNOWN
- refresh and rebuild share publish_map under a publication lock: incompatible index refused BEFORE reading source, then scan, then refusal on diagnosed scan / source moved during scan / cancellation, then one transaction publishing corpus, metadata and revision
- prepare_synthetic_source is a separate explicit command; build_map's rebuild boolean survives only as a #[cfg(test)] helper
- frontend runLifecycle is the only path; loadBrain no longer calls map_integrity, which reads the source
- resumed Codex's worktree without reset, deletion or history rewrite; all valid work preserved

LIFECYCLE_CONTRACT:
- open: existing canonical index only, read-only connection, no source access, identity and revision unchanged, map_view immediately available
- refresh: explicit, read-only scan of the synthetic source, publication only after a clean scan, index_id kept, revision advanced inside the publishing transaction
- rebuild: explicit and distinct, replaces derived data in the same transactional primitive, keeps index_id, advances revision, never deletes before a valid replacement exists

LAST_KNOWN_GOOD_PROOF:
- three real failure modes, no mocked return values: cancellation, SQL ABORT injected by a real trigger after DELETE and a partial INSERT, and refused validation
- after each, index_id, revision, node count and reconstructible digest are unchanged and the index is still openable
- source renamed away under an RAII Drop guard that restores it even on failure; open and map_view keep working and return identical values
- remove_index_files left the runtime; an incompatible index is refused, never deleted, never silently migrated

VALIDATIONS:
- cargo test --offline: 295 PASS, 0 failed, 5 ignored
- pnpm test: 269 PASS, 17 files
- pnpm check, pnpm build, cargo build --offline: green
- git diff --check: clean
- cargo fmt --check: clean on every file this task touched; pre-existing form debt on seventeen untouched files
- cargo clippy --all-targets --offline -- -D warnings: RED, 26 errors. Diagnostic set IDENTICAL before and after this task; none comes from a line written here — the single lib.rs hit is an untouched `unattended` if. R-T30-1 unchanged
- L1 source-absent open, L2 NotBuilt, L3 explicit refresh, L4 failed refresh, L5 rebuild both ways, L6 frontend intents, L7 structural guard, L8 two-brain isolation, L9 read-only fingerprints — all proven with the real scanner and real SQLite

WEBVIEW2:
- real pass executed: WebView2 152.0.4191.66, Tauri 2.11.5, SQLite 3.53.2, fresh synthetic catalogue, 31 real keystrokes all isTrusted, 0 fatal console errors
- map_open before any build: map_not_built, no index and no source created
- Open 1 -> 1, Refresh 1 -> 2, Rebuild 2 -> 3, index_id unchanged at every step, each button activated by a real keystroke
- source renamed away: Open succeeds, map_open and map_view return exactly the pre-removal values, explicit Refresh fails and states the last recorded index remains available, source restored in finally
- bounded projection intact: 6001 indexed nodes rendered as 256 nodes + 1 aggregate under the 512 budget, DOM equal to the product page
- map_integrity final: no FileTopo artifact in the source
- artifact docs/performance/runs/TASK-0031-webview2.json — NONCANONICAL, outside X5

FILES_CHANGED:
- src-tauri/src/lib.rs, src-tauri/src/map/{brain_index.rs,commands.rs,mod.rs}
- src-tauri/src/map/lifecycle_tests.rs (created), src-tauri/src/map/projection_tests.rs
- src/map/{lifecycle.ts,lifecycle.test.ts} (created), src/map/{MapApp.tsx,types.ts} and seven *Scenario.ts
- vite.config.ts (declared scope extension, see below)
- scripts/task0031-{seed-proof.py,webview2.mjs,webview2.ps1} (created)
- docs/performance/runs/TASK-0031-webview2.json (created, noncanonical)
- docs/tasks/TASK-0031-v1-brain-lifecycle.md, docs/decisions/DEC-0032 unchanged since freeze
- docs/ai/{CURRENT_STATE,NEXT_ACTION,HANDOFF,VALIDATION,CHANGELOG_AI}.md, docs/product/FEATURE_MATRIX.md
- .orchestrator/RESULT.md

DEFECTS_FIXED_ON_RESUME:
- CRLF written against `* text=auto eol=lf` broke the L7 guard: it splits commands.rs on an LF pattern, matched nothing, inspected the test module, saw MapStore and FAILED the Rust suite. Files normalised; the guard now compares as LF
- the guard's sentinel had gone hollow once build_map moved under #[cfg(test)]; it now sits on fixture_summaries, the last runtime item, and also checks the three lifecycle entries and the absence of any rebuild: bool
- SCOPE EXTENSION, DECLARED: vite.config.ts excludes .filetopo-sandbox/ from server.watch. The dev-server watcher held Windows directory handles on the sandbox, so the proof could not take its own source away (EPERM on rename) and every index write reloaded the page mid-measurement. Dev-server setting only, no effect on the built product. Declared in the task sheet, CURRENT_STATE, VALIDATION BA.4 and CHANGELOG

LIMITS_OR_BLOCKERS:
- real roots still disabled: no REAL_ROOT, no folder picker, no personal data, everything synthetic
- no watcher and no incremental update: F-027, F-030, F-031 remain PROPOSED and out of scope
- an incompatible-schema index is refused, never migrated: no staging contract in this slice
- WebView2 figures come from a development workstation and include deliberate CDP settling waits; they are not render latencies
- R-T30-1 strict clippy still red, unchanged. R-T30-3 corpus-memory analyses, R-T30-4 product performance with R8 open, R-T30-6 test-only legacy_store debt: all still open. R-T30-5 unchanged
- R-T30-2 addressed within its synthetic scope only, awaiting independent control

X5: 36
MAIN_UNCHANGED: yes
TASK_STATUS: IMPLEMENTED
DECISION_STATUS: APPROVED

COMMIT: de60ef1 (code), ee778df (guard, proof harness, WebView2 artifact), 003a567 (docs closure); this RESULT is a separate following commit
PUSHED: yes
NEXT: independent control only
