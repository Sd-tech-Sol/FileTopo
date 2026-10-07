TASK_ID: TASK-0053 — V1 Workspace Preferences & Persistence / P-19 Closure
AGENT: CLAUDE CODE (Sonnet 5.5)
RESULT: VERIFIED — ACTION-0099 independent control PASS
BRANCH: build/v0.2-a37-v1-workspace-persistence
CODE_COMMIT: 804e1daa29b30e60b098ff677d06b452f02ecad6

SUMMARY:
- F-052 : store global `workspace.v1` (catalog_meta), fermé/versionné/borné, références de nœud liées par le backend à `index_id@revision`, 14 corrections nommées.
- Persistés : composition + focus, caméra/sélection de composition, légende, densité (chrome), mouvement system|reduce, branch focus + collapsed ids.
- Inchangés et rejoués : resume par cerveau, langue `filetopo.locale`, vu/non-vu.
- UI : préférences densité/mouvement, résumé non bloquant des corrections FR/EN.

VALIDATION:
- Rust 839 PASS; frontend 708 PASS; tsc OK; build + Tauri debug OK.
- WebView2 réel : 4 processus, 3 fermetures; docs/performance/runs/TASK-0053-webview2.json.
- Neuf falsifications effectives (VALIDATION.md DG).

NOT_TESTED / LIMITS:
- Crash entre changement debounced et écriture; réduction de mouvement OS émulée par CDP.
- Reconstruire garde les ids si les chemins survivent : piège numérique prouvé en Rust seulement.

GOVERNANCE: F-052 = IMPLEMENTED/candidate; M-1 et P-19 candidates, jamais auto-VERIFIED; F-046 inchangée; aucune TASK-0054.
NEXT_ORCHESTRATOR_DECISION: contrôle indépendant de TASK-0053.


ORCHESTRATOR_CONTROL:
- ACTION-0099: PASS / VERIFIED.
- Product code verified: 804e1daa29b30e60b098ff677d06b452f02ecad6.
- Branch head inspected: a28f354ff9625287c41284f058e132628a3dd32d; post-tested delta is documentation/proof only.
- TASK-0053 and F-052 VERIFIED; M-1 CLOSED; P-19 CLOSED / VERIFIED.
- No GitHub Actions workflow run or commit status is attached to the tested commit.
- F-046 unchanged; next step is a fresh V1 audit before any TASK-0054.
