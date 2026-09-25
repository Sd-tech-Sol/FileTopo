TASK_ID: TASK-0045 — V1 Brain Identity Editor
AGENT: CLAUDE
RESULT: DONE
BRANCH: build/v0.2-a29-v1-brain-identity-editor
FINAL_HEAD: see `git log -1` (code commit 9e951d2; the documentation commit follows it)

SUMMARY:
- TASK-0045 = IMPLEMENTED (never self-VERIFIED). The focused brain offers "Personnaliser le cerveau": Nom / Couleur / Icône / Enregistrer / Annuler, a native HTML form bound to the brain it was opened on. Save = the EXISTING `map_brain_update`; the `BrainRecord` it RETURNS replaces the catalogue entry and the loaded brain. No second command, no store, no preference file, no Index read, no resume write, no journal touch.
- REUSE-FIRST AUDIT (VALIDATION CB.1, done before the code) — conclusion confirmed: THE BACKEND ALREADY EXISTED. `BrainRecord` (no path field); `update_metadata` = one UPDATE of three columns, unknown brain refused before writing, returns the re-read row; `validate_metadata` = trimmed name 1..80 chars, `#RRGGBB`, icon 1..2 scalar values; `map_brain_update` was called only by the K7 scenario, never by `MapApp`; `CompositionBar`/`MapApp` already render name/icon/swatch from the catalogue records; TASK-0018 K7 (edit isolated, persisted) and K9 (active brain) held; TASK-0044 resume state lives in `catalog_meta`, separate from `brains`.
- Validation: the form mirrors the Rust bounds (scalar values, trimmed name) only to explain an entry early; a backend refusal is shown, the form stays open, nothing changes anywhere. "No change" makes no call.
- Propagation: only a read-only re-read of the inter-brain store (`map_cross_relations_open`, then `..._for_node`), triggered by any replacement of `loaded` and needed because its answers embed each brain's name/icon. Named and bounded in tests and in the real-host proof. `loadBrain` re-reads the record on return so a load in flight cannot put the old name back.
- Real WebView2 proof, ONE real restart, three synthetic brains, A and C on the SAME folder (same sourceRef/sourceLabel, different brainId), each with its own resume state given by real clicks: edit 1 on A with the keyboard (Tab walks Nom → Couleur → Icône; text typed as key events; save = an OPERATING-SYSTEM Enter via WScript.Shell), edit 2 on B with the mouse, C cancelled with Escape then an empty name refused by the form. After every step: other brains bit for bit, edited brain's brainId/source/position unchanged, SHA-256 of every file/dir under both roots, revision + node count + journal total of all three, all three resume records, active brain — unchanged; the wire shows exactly one `map_brain_update` (four keys, only the edited brainId) plus the two cross reads. Seven backend refusals probed directly: all refused, catalogue identical. After the real close: A back alone with the new identity, all three catalogue records identical to close (the seed put nothing back), editor reopens on persisted values, A's selection/panel restored (TASK-0044), B and C visited with their own identity and resume, no `map_brain_update` from the product after restart, 0 fatal errors. Real-host sabotage (save also reads `map_view`) FAILS the proof; canonical replay on the final binary PASSES.
- P-20 : READY FOR INDEPENDENT CLOSURE (never VERIFIED here). F-033 = IMPLEMENTED. F-035 (FR/EN) untouched, PROPOSED. F-036 not claimed. P-19 stays PARTIAL.

VALIDATIONS:
- cargo test --offline: 753 PASS, 0 FAIL, 6 ignored (750 + 3 new). Targeted `map::brains`: 17 PASS.
- pnpm test: 537 PASS (521 + 16), 37 files. ONE transient failure of 1 test was seen once right after the real-host run, not identified (output lost); five later complete runs: 537/537.
- pnpm check, pnpm build, cargo build --offline, `pnpm tauri build --debug --no-bundle`: PASS.
- Clippy --all-targets: lib 13 / lib-test 22 = historical debt, identical to the reference; rustfmt clean on brains.rs (edition 2024).
- Falsification: 4 sabotages of `saveBrainIdentity` under the unit tests (publish form values, do not replace `loaded`, extra `map_view`, rename every brain) — each caught; 1 sabotage under the real host — caught.
- git diff --check clean; scripts/audit-public-readiness.ps1 -AllowRemotes green (608 files).
- WebView2: docs/performance/runs/TASK-0045-webview2.json.

IMPORTANT_FILES:
- src/map/BrainIdentityEditor.tsx (new), src/map/MapApp.tsx (`saveBrainIdentity`, `loadBrain` record re-read), src/map/map.css, src/map/brainIdentity.test.tsx
- src-tauri/src/map/brains.rs (tests only)
- scripts/task0045-seed-proof.py, scripts/task0045-webview2.mjs, scripts/task0045-webview2.ps1
- docs/performance/runs/TASK-0045-webview2.json, docs/ai/VALIDATION.md (section CB), docs/tasks/TASK-0045-v1-brain-identity-editor.md, docs/product/FEATURE_MATRIX.md (F-033)

COMMIT: 9e951d2 (code, tests, scripts, real-host artefact); the documentation commit follows it.
PUSHED: yes (branch build/v0.2-a29-v1-brain-identity-editor only) — see below.

LIMITS_OR_BLOCKERS:
- The colour is set through the page's value setter + the real `input` event: the native colour picker is an OS dialog neither the page nor CDP can drive. Name and icon are typed with real key events.
- Mouse and keys go through the browser input pipeline (CDP) except the edit-1 save (OS key). No physical mouse, no touch.
- The real host never provokes a backend refusal THROUGH the form (the form stops those first); refusals were probed directly (7 cases) and, in the UI, by a unit test with a refusing backend.
- The existing backend bound accepts a one-space icon (1 char): not hardened here (no invented product rule); an invisible icon stays possible until a rule is decided.
- Normal close only; local NTFS development workstation; earlier real-host scenarios not replayed.
- NEXT_ACTION = independent control of TASK-0045. No TASK-0046, no PR / merge / tag / release.
