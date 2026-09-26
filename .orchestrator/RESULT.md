TASK_ID: TASK-0047 — V1 Accessibility Closure
AGENT: CLAUDE (Claude Code, Sonnet 5)
RESULT: DONE
BRANCH: build/v0.2-a31-v1-accessibility-closure
FINAL_HEAD: see `git log -1` (code commit ec22b07; the documentation commit follows it)

SUMMARY:
- TASK-0047 = IMPLEMENTED, F-036 = IMPLEMENTED (never self-VERIFIED). P-21 stays PARTIAL until the independent control; P-19 stays PARTIAL. No TASK-0048, no PR / merge / tag / release.
- Reuse-first: axe-core@4.13.0 re-verified BEFORE install (npm registry + GitHub: MPL-2.0, dequelabs/axe-core, Deque maintainers, SLSA provenance, 0 dependencies, integrity = lockfile). Added ONLY as an exact devDependency; injected locally into the real WebView2; never bundled. No @axe-core/playwright, jest-axe, MCP or service.
- Existing reused (no rewrite): MapView tree + keyboard contract, CompositionBar menu, identity-form labels/alerts, global :focus-visible, prefers-reduced-motion block, words + symbols of every coding. To correct: 11 measured causes. Out of scope: P-19, any accessibility preference, Rust, source/Index/journal/seen/resume/watcher.
- Baseline BEFORE corrections (code 29170ec, same 36-cell matrix): 16 axe violations (aria-valid-attr-value x4, aria-required-children x12) and 212 findings. After: 0 violation, 0 finding.
- Corrections (each measured): (1) aria-activedescendant only for a drawn card; (2) aggregate role=button inside role=tree -> role=treeitem (+aria-level); (3) focus on an aggregate panned out of the canvas -> recentred (existing ensureRectVisible); (4) focus lost after Enter on an aggregate -> back to the tree; (5) map canvas focus outline clipped by overflow:hidden (changed no pixel) -> drawn inside; (6) dark scheme: card fills too light for the --ink names -> 3 dark tokens; (7) territory title had no fill (black on dark) -> fill --ink; (8) light scheme: root card name / filter tag 1.5:1 and 2.9:1 when attenuated -> light text, root at 0.95; (9) text-field border 1.4:1 and dark placeholder 3.6:1 -> --ink-soft; (10) focus stranded on <body> when a control disables itself while its action runs -> useRestoreFocusAfterDisabled; (11) focus after removing a chip -> the chip that stays.

1. EXECUTED (real WebView2 Edg/153.0.4234.48, one launch, generated roots, no personal data):
- axe-core 4.13.0, wcag2a/2aa/21a/21aa/22aa: 9 states x FR/EN x light/dark = 36 cells: 0 violations. 40 incomplete occurrences = 74 distinct targets, each reviewed and measured (PASS); no rule disabled.
- Real key events (CDP Input.dispatchKeyEvent): 9 Tab/Shift+Tab walks, 646 stops, DOM order, no trap, focus indicator proved VISIBLE by pixels at every stop (captured focused vs blurred), weakest indicator contrast 4.71:1.
- 12 keyboard journeys / 101 steps: language, composition menu (arrows / Home / End / Escape / Tab out / Enter choose / remove), map tree (arrows, Home, + - f r, Alt+arrows, n / p), search + filters + journal + details, identity editor (Enter opens, empty name refused, Escape / Cancel return the focus), review / duplicates / analysis / observation (focus returns to the button), navigation controls, aggregate (Enter and Space).
- Contrast computed from real computed styles, independent of axe: 6,420 text elements, 416 glyphs (3:1), 52 controls, 144 graphical objects, 32 pseudo-elements/placeholders: 0 failure (weakest 5.09:1 for 4.5).
- 13 codings read off the screen with a non-colour alternative each; prefers-reduced-motion emulated (0 moving element in both modes; inline probe 5s/task0047-probe -> 0s/none); FR/EN by real clicks.
- Invariants: 9 passive windows = 0 product commands, catalogue / resume / Index / journal / seen / SHA-256 of both roots unchanged; VIEW_BUDGET 512 (wide brain 127 nodes draws 4 cards); 0 fatal console errors.
- pnpm test 618 PASS (582 + 36 new); Rust 753 PASS, 6 ignored (no Rust file touched); pnpm check / build, cargo build --offline, pnpm tauri build --debug --no-bundle PASS; Clippy 13 / 22 = historical reference (not mixed into the verdict); git diff --check clean; audit-public-readiness -AllowRemotes PASS.

2. CONTROLS / FALSIFICATION:
- Six sabotages of the REAL product, each caught in WebView2 and reverted (none committed): (1) aggregate loses its key handler -> aggregate journey; (2) :focus-visible outline:none -> no pixel changes; (3) --ink-soft light too pale -> contrast sweep; (4) state word of an element removed -> non-colour inventory; (5) reduced-motion block emptied -> motion probe; (6) aria-labelledby to a missing id -> axe. Sabotage 4 had to be re-run: its first attempt did not compile and the harness had run on the previous binary (found in the build log).
- 15 of the 29 new guard tests fail against the base code.
- Harness self-checks: the baseline (pre-fix product) reproduces the failures; a run against the corrected product reports none.

3. LIMITS / NOT TESTED:
- No real screen reader; no zoom / reflow / narrow window; keyboard through CDP (not the OS); normal close only; development workstation.
- Not exercised by real keys because the synthetic data does not contain them: duplicate members, inter-brain relations, a node's relation links (native buttons, guarded by the source test); pagination (a button that disables itself on the last page leaves the focus on the page: not a trap, not changed); mark-as-seen / confirm / reject (they change seen / review state; "later" is exercised).
- A focused territory can be panned out of the canvas when the selection follows a search: neither a contrast nor an ARIA gap; untouched.
- The native colour picker (an OS dialog) is out of scope. No general WCAG certification is claimed: the F-036 / P-21 product contract is closed within the measured scope.
- Baseline close: the window did not answer and the script stopped the process it had started.

4. DECISION EXPECTED FROM THE ORCHESTRATOR:
- Independent control of TASK-0047 on evidence (TASK-0047-webview2.json, TASK-0047-baseline-webview2.json, VALIDATION CF, the code). If it passes: TASK-0047 and F-036 VERIFIED in scope, P-21 CLOSED / VERIFIED by composition with ACTION-0077, P-19 stays PARTIAL. No TASK-0048 before that control.
- Note for the control: the aggregate changed from role=button to role=treeitem (existing projection.test.tsx updated accordingly; behaviour unchanged).

IMPORTANT_FILES:
- src/map/MapView.tsx, src/map/map.css, src/map/CompositionBar.tsx, src/map/MapApp.tsx (one hook call), src/map/focusRestore.ts (new)
- src/map/accessibilityClosure.test.tsx, src/map/focusRestore.test.tsx (new), src/map/projection.test.tsx (updated)
- scripts/task0047-webview2.ps1, scripts/task0047-webview2.mjs, scripts/task0047-page-lib.js, scripts/task0047-seed-proof.py
- docs/performance/runs/TASK-0047-baseline-webview2.json, docs/performance/runs/TASK-0047-webview2.json
- package.json, pnpm-lock.yaml (axe-core 4.13.0, dev-only)
- docs/ai/VALIDATION.md (CF), CURRENT_STATE.md, HANDOFF.md, NEXT_ACTION.md, CHANGELOG_AI.md, docs/tasks/TASK-0047-v1-accessibility-closure.md, docs/product/FEATURE_MATRIX.md (F-036)

COMMIT: ec22b07 (product, tests, harness); the artefacts + documentation commit follows it.
PUSHED: see the final git state (branch build/v0.2-a31-v1-accessibility-closure only).
NEXT_ACTION = independent control of TASK-0047.
