TASK_ID: TASK-0049 — V1 Reconstructibility & Index-Generation Safety
AGENT: CODEX
RESULT: DONE
BRANCH: build/v0.2-a33-v1-reconstructibility-closure
FINAL_HEAD: bfb173d3fad656030e28c82a9056aa04ef487634

SUMMARY:
- Audit avant code : un Index frais reçoit un nouvel index_id et réalloue les node_id; l'ancien resume par simple numéro était donc dangereux. Catalogue/policy/resume, relations et content-signals survivent hors Index.
- Enveloppe resume v2 liée à l'index_id backend; legacy/génération étrangère efface les références node-scoped avant lookup, conserve les préférences indépendantes et persiste la correction. DTO frontend inchangé.
- Digest logique inter-génération et inventaire exact des neuf états non reconstructibles; aucune nouvelle DB, table, génération parallèle ni commande de suppression.
- Preuve réelle trois processus : nouvel index_id, b 3→2 et ancien 3 devenu c, digest égal, reprise corrigée au troisième processus, journal frais vide, policy/source/stores externes inchangés. Huit falsifications attrapées puis restaurées.

VALIDATIONS:
- Rust ciblé 27 PASS; suite finale 770 PASS, 0 échec, 6 ignorés. Frontend ciblé 41 PASS; suite 625 PASS.
- pnpm check/build, cargo build offline, Tauri debug, WebView2 trois processus, git diff --check et audit public PASS.
- Clippy reste à la dette historique 13 diagnostics lib / 22 lib-test; aucun diagnostic TASK-0049.

IMPORTANT_FILES:
- src-tauri/src/map/resume_state.rs; src-tauri/src/map/brain_index.rs; src-tauri/src/map/store.rs
- docs/performance/runs/TASK-0049-webview2.json; scripts/task0049-webview2.ps1
- docs/tasks/TASK-0049-v1-reconstructibility-index-generation.md; docs/ai/VALIDATION.md

COMMIT: bfb173d3fad656030e28c82a9056aa04ef487634 feat(map): close reconstructibility generation safety
PUSHED: yes

LIMITS_OR_BLOCKERS:
- Preuve réelle limitée à Windows/NTFS et fermetures normales; crash recovery et inter-volume non revendiqués. Rebuild invoqué via IPC produit, sans clic physique.
- Aucun bloqueur. TASK-0049 et F-006 sont IMPLEMENTED, jamais auto-VERIFIED; F-014/P-19 inchangés.

NEXT_ORCHESTRATOR_DECISION:
- Contrôle indépendant de TASK-0049 avant toute TASK-0050.
