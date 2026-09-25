TASK_ID: TASK-0044 — V1 Per-Brain Resume State
AGENT: CLAUDE
RESULT: DONE
BRANCH: build/v0.2-a28-v1-brain-resume-state
FINAL_HEAD: 00743fb

SUMMARY:
- TASK-0044 = IMPLEMENTED (never self-VERIFIED). A brain reopens where it was left — branch, selection, camera, logical filter, details panel — from ITS OWN versioned record in catalog_meta (`brain_resume.v1.<brainId>`, five closed keys, no new store, no schema bump), after a brain switch and after a real process restart.
- REUSE-FIRST AUDIT (written before the code, VALIDATION CA.1): active brain, brain name/colour/icon and seen/unseen already persisted -> untouched; `details_panel_visible` was a GLOBAL preference -> kept only as the fallback of a brain with no record (wording fixed); `CompositionSessionMemory` -> stays the memory of compositions, the catalogue sits in front of it for one brain; `View`/`clampView` -> reused unchanged; `useProjectionFilter` -> extended to one filter per brain (+ adopt); `map_view` normal/filtered -> unchanged plus ONE bounded primitive `Index::filter_anchor` (canonical predicate and order); watcher reload -> `loadBrain` restores through the catalogue. No localStorage, no new SQLite, no second registry or filter engine, nothing stored that names a place (no path/name/stable key/FileId/cursor/page).
- Backend: `map/resume_state.rs` (tolerant read: damaged/unknown version/out-of-bounds = nothing stored; Rust-validated write; `restore()` checks every id against the brain's CURRENT Index, stores the correction, rebuilds a FRESH cursor for a selected match past page one); commands `map_brain_resume_state|update|restore`, brain id only.
- Frontend: `ResumeWriter` (latest-wins, one write in flight per brain, 250 ms debounce / 1.5 s cap, flushed before a switch); filter kept per brain; camera applied only on a measured viewport, clamped, re-applied from the original value while untouched; "Page reprise" instead of an invented page number.
- Real WebView2 proof, three synthetic brains, two REAL process restarts, real mouse events: X (branch docs, FILE filter, match of page 3, panel hidden, zoom) / Y (selection = the SAME numeric id as X's branch, panned) / Z (branch salles, DIRECTORY filter, match of page 2). X-Y-Z-X-Z-Y in one session then restart: each brain exactly its own (catalogue AND screen), last active brain back alone; 60 wheel notches = 1 write; offline deletion of X's selected file and Y's docs -> valid fallback, filter kept and re-read (205), no stale id, Z untouched; 0 fatal errors; replayed twice on the final binary. A real-host replay with ONE shared key for all brains FAILS the proof (harness discriminates).
- Defects found by the integration tests and analysis, fixed before the canonical proof: root selection written over the remembered selection; follow-focus pan undoing a restored camera; non-final viewport clamping the camera for good; canonical page 1 displaced for a page-1 match.
- P-19 stays PARTIAL: FR/EN, accessibility preferences, legend preference (none exists) and multi-brain composition persistence are NOT done. No status in FEATURE_MATRIX rises (F-002/F-034 stay PROPOSED, gaps annotated).

VALIDATIONS:
- cargo test --offline: 750 PASS, 0 FAIL, 6 ignored (727 + 23).
- pnpm test: 521 PASS (471 + 50), 36 files; pnpm check, pnpm build, cargo build --offline: PASS; tauri debug build: PASS.
- clippy --all-targets: lib 13 / lib-test 22 = historical debt, identical to the reference (two warnings introduced by this code were fixed); rustfmt clean on the added files.
- Falsification: 11 guarantees broken one at a time under the tests (each caught) + the real-host shared-key sabotage. One honest finding: removing the explicit clampView on restore fails no test because the existing viewport re-clamp covers it (redundant defence kept).
- git diff --check clean; scripts/audit-public-readiness.ps1 -AllowRemotes green.
- WebView2 replay: docs/performance/runs/TASK-0044-webview2.json (two identical logical runs on the final binary).

IMPORTANT_FILES:
- src-tauri/src/map/resume_state.rs (+ resume_state_tests.rs), src-tauri/src/node_filter.rs, src-tauri/src/lib.rs
- src/map/resumeState.ts, src/map/useProjectionFilter.ts, src/map/MapApp.tsx, src/map/resumeMapApp.test.tsx
- scripts/task0044-seed-proof.py, scripts/task0044-webview2.mjs, scripts/task0044-webview2.ps1
- docs/performance/runs/TASK-0044-webview2.json, docs/ai/VALIDATION.md (section CA), docs/tasks/TASK-0044-v1-per-brain-resume-state.md

COMMIT: 00743fb (code, tests, scripts, real-host artefact); the documentation commit follows it.
PUSHED: yes (branch build/v0.2-a28-v1-brain-resume-state only)

LIMITS_OR_BLOCKERS:
- Normal close only: no crash-consistency promise (a change in the last 250 ms of a hard kill is not guaranteed).
- Mouse events are injected by the browser input pipeline, not a physical mouse or touch; local NTFS development workstation.
- A composition of several brains is still session-only; the filter of a brain not in the foreground is re-read only when it returns.
- After Reconstruire a stored node id is checked for existence only (Actualiser keeps identities and is the covered path).
- A context (ancestor) selection inside a filtered page falls back to the root on resume: the filter stays authoritative.
- Earlier real-host scenarios (K12, L12, M12...) were not replayed; their plain-read fallback is preserved.

NEXT_ORCHESTRATOR_DECISION:
- Order the independent control of TASK-0044 (distinct instance, on evidence). No TASK-0045, no PR/merge/tag/release before it.
