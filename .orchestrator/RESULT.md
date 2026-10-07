TASK_ID: TASK-0052 — root-collapse corrective after ACTION-0096
AGENT: CLAUDE CODE
RESULT: DONE — IMPLEMENTED, awaiting independent re-control
BRANCH: build/v0.2-a36-v1-branch-focus-collapse
CODE_COMMIT: cfba445bdaabc0d74a3bd6b7551fd6398e5b179d

DONE:
- Root focalisé repliable : root seul, compte exact (26 = disque), aucun agrégat/arête.
- `rootCannotCollapse` et l'exception backend/UI/tests supprimés.
- Dépli = projection de référence (rectangles inclus).

VALIDATION:
- cargo test 817 PASS; vitest src/map 635 PASS; pnpm check/build; Tauri debug.
- WebView2 réel PASS (Enter→Space, Space→Enter) sur cfba445bdaabc0d74a3bd6b7551fd6398e5b179d.
- Falsification : exclusion root réintroduite => 3 tests Rust + WebView2 échouent; restaurée => PASS.

NOT_TESTED: racines réelles volumineuses.
STATE: TASK-0052 IMPLEMENTED (jamais VERIFIED par l'exécuteur); P-19 PARTIELLE; aucune TASK-0053.
NEXT_ORCHESTRATOR_DECISION: re-contrôle indépendant.
