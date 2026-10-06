TASK_ID: TASK-0051 — stale-core corrective
AGENT: CLAUDE CODE
RESULT: DONE — IMPLEMENTED, awaiting independent re-control (never VERIFIED here)
BRANCH: build/v0.2-a35-v1-approved-relation-revocation
CODE_COMMIT: 1418262e4e4edf7e131bdb7d96fe9992066b1f5a

DONE:
- Stale guard removed from revoke_relation only; approve stale refusal and stale-output masking unchanged.
- Command test: APPROVED core -> STALE -> revoke OK -> pending, engine still STALE, approve still refused.
- Focus: approve control of the same suggestion (CURRENT), else "Analyser les relations" (STALE).
- Real WebView2 (DR15 pass 3, real keys): staleCoreRevocation in TASK-0051-webview2.json, PASS.
- Falsification: guard reinstated -> unit test and WebView2 proof FAIL; restored -> PASS.

VALIDATION: cargo test 799 ok; vitest 655 ok; tsc/build/tauri debug build ok; audit public -AllowRemotes ok.
LIMITS: see VALIDATION.md section DC. P-19 unchanged. No TASK-0052.

NEXT_ORCHESTRATOR_DECISION:
- Independent re-control of the corrective.
