TASK_ID: TASK-0046 — V1 Complete FR/EN Runtime
AGENT: CLAUDE
RESULT: DONE
BRANCH: build/v0.2-a30-v1-complete-fr-en-runtime
FINAL_HEAD: 678c417 (code, tests, scripts, real-host artefact); the documentation commit follows it

SUMMARY:
- TASK-0046 = IMPLEMENTED (never self-VERIFIED). F-035 = IMPLEMENTED. Language portion of P-19 and of P-21 = ready for independent closure. P-19 and P-21 stay PARTIAL. F-036 stays PROPOSED (no WCAG work).
- Inventory before the code (VALIDATION CC.1): `src/lib/locale.ts` is the global source of truth and was NOT modified. MapApp forced `strings.fr` / `lang="fr"` / `locale="fr"`; 8 panels + filters.ts, relations.ts, crossRelations.ts, the filter hook, measure.ts and 10 scenarios carried hard-coded French. Already FR/EN and reused: SourceObservationBadge, WatchStatusBadge, ContentObservationsPanel, DetailsPanel.
- MapApp: `resolveInitialLocale()` at start; `storeLocale()` ONLY on a human choice, under the ONE existing key `filetopo.locale`; a Français / English control in the header; `<html lang>` follows. No Tauri command, table, preference file, second key or i18n package.
- `mapStrings.ts`: typed contract behind `Record<Locale, MapStrings>`; every panel has its own typed FR/EN dictionary; helpers take the locale. Status lines are functions of the locale resolved at render, so a line said in French reads in English after a switch without being said again. Wire values and user data (brain / folder / file names, paths, ids) are never translated.
- Two defects found by the real proof and fixed: a shared React key kept a stale French line after a switch (any duplicate key now fails the tests); the backend's `<dépôt>` sandbox token showed in French.
- Real WebView2 (docs/performance/runs/TASK-0046-webview2.json): simulated French host, same profile, ONE real close. EN chosen by a REAL click: lang=en, ZERO product commands during the switch, storage = only `filetopo.locale="en"`, catalogue / resume records / Index / journal / SHA-256 of both trees / selection unchanged, no French left in EN (text and accessible names), names unchanged. After relaunch English is back BEFORE any interaction (host still French); FR by a real click, same guarantees. 0 fatal errors; two consecutive full passes.

VALIDATIONS:
- pnpm test 582 PASS (537 + 45). pnpm check, pnpm build, cargo build --offline, `pnpm tauri build --debug --no-bundle` PASS. cargo test --offline 753 PASS, 6 ignored (no Rust file modified). Clippy --all-targets lib 13 / lib-test 22 = historical debt, identical to the reference. git diff --check clean. audit-public-readiness -AllowRemotes green (621 files).
- Completeness enforced: 17 dictionaries same keys FR/EN, any identical leaf must be on a reviewed list by dictionary+path (14); source guards against forced French, a second key/storage/package/command, `locale` in an invoking effect; real MapApp in FR and EN on 39 surfaces with a French-residue scan; switch sends zero commands; six persistence cases; refused / corrupted storage; duplicate React keys fail. The TASK-0044 "resume state does not use browser storage" test keeps the same assertion (renamed/commented only).
- Falsification: 5 MapApp sabotages caught by unit tests; 1 real-host sabotage (`chooseLocale` also calls `map_brains`) FAILS the proof; canonical replay on the final binary PASSES.

IMPORTANT_FILES:
- src/map/mapStrings.ts, src/map/localeText.ts, src/map/MapApp.tsx, the eight panels, filters.ts, relations.ts, crossRelations.ts, src/map/map.css
- src/map/localeCompleteness.test.tsx, src/map/localeRuntime.test.tsx, src/test/hostLanguage.ts
- scripts/task0046-seed-proof.py, scripts/task0046-webview2.mjs, scripts/task0046-webview2.ps1, docs/performance/runs/TASK-0046-webview2.json
- docs/ai/VALIDATION.md (section CC), docs/tasks/TASK-0046-v1-complete-fr-en-runtime.md, docs/product/FEATURE_MATRIX.md (F-035)

COMMIT: 678c417 (code); the documentation commit follows it.
PUSHED: yes (branch build/v0.2-a30-v1-complete-fr-en-runtime only)

LIMITS_OR_BLOCKERS:
- The host language is SIMULATED with `--lang` on the WebView2 process (the page really sees fr-CA); no machine really configured in English. Clicks go through the browser input pipeline (CDP); normal close only; local NTFS dev workstation.
- Historical proof scenarios (K12..SR15, `FILETOPO_AUTO_*`) compare French labels and assume a French locale; not replayed, artefacts not replaced.
- Folder-backed brains do not yet offer relations / content / duplicates (backend: "source not synthetic"): their panels say "unavailable / not observed" in both languages, and that state is what the real run proves for them; rich states are proved on the synthetic brain.
- No raw backend diagnostic appeared in the real run (the "localized prefix + raw detail" case is unit-tested only). French keeps "1 nœuds" (unchanged); English says "1 node". The native window title stays "FileTopo".

NEXT_ORCHESTRATOR_DECISION:
- Independent control of TASK-0046 on evidence (NEXT_ACTION): VERIFIED for TASK-0046 / F-035 and acquisition of the language portion of P-19 / P-21, or corrections. No TASK-0047, no PR / merge / tag / release.
