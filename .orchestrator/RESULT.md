TASK_ID: TASK-0050 — corrective finale FILE-only (ACTION-0090)
AGENT: CLAUDE CODE
RESULT: DONE
BRANCH: build/v0.2-a34-v1-runtime-legend

SUMMARY:
- Cause : le bloc « Files are matches » de la cellule A activait DIRECTORY +
  SKIPPED (depuis kinds=[]). Corrigé : FILE seulement, état de départ vérifié.
- Endpoints APPROVED (dossier-a/note-1.txt -> racine-2.txt) et pending
  (dossier-b/sous-dossier/note-1.txt -> dossier-a/note-2.txt) simultanément
  dans le DOM; intra-approved et intra-suggestion capturés, signatures égales.
- Règle stricte restaurée : observé === 23 atteignables (24 - node-diagnostic).
  CELL_B_ONLY_KEYS et combineur supprimés; ps1 sans J12.
- Artefact TASK-0050-webview2.json remplacé : headTested 8656d84f, 23/23,
  légende 24/24, axe 0/0, 0 erreur fatale, P-19 NON TESTÉ.
- Aucun changement produit/Rust/fixture. Aucune TASK-0051.

VALIDATIONS:
- WebView2 réel cellule A : PASS 23/23 (2 runs); axe 0/0.
- Falsifications F1-F5 : toutes échouent comme attendu; restaurées.
- pnpm test 632/632; pnpm check; pnpm build; Tauri debug; git diff --check;
  audit public (675 fichiers, -AllowRemotes) : PASS.
- NON TESTÉ : redémarrage app (P-19); cargo test (aucun Rust touché).

FILES CHANGED:
- scripts/task0050-webview2.mjs, scripts/task0050-webview2.ps1
- scripts/task0050-combine-webview2.mjs (supprimé)
- docs/performance/runs/TASK-0050-webview2.json (remplacé)
- docs/tasks/TASK-0050-v1-runtime-legend-p10.md (statut + §V)
- docs/ai/{CURRENT_STATE,NEXT_ACTION,HANDOFF,VALIDATION,CHANGELOG_AI}.md

STATE: TASK-0050 / F-014 / P-10 = IMPLEMENTED (candidates), jamais auto-VERIFIED.
NEXT_ORCHESTRATOR_DECISION: contrôle indépendant de TASK-0050 sur preuves.
