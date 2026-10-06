TASK_ID: TASK-0051 — V1 Approved Relation Revocation / P-04 Closure
AGENT: CLAUDE CODE
RESULT: DONE
BRANCH: build/v0.2-a35-v1-approved-relation-revocation

SUMMARY:
- DEC-0049 implémentée, intra + inter : revoke = suppression de la ligne APPROVED
  exactement liée + suggestion approved -> pending (decided_unix_ms NULL), en une
  transaction. Aucun nouvel état; rejected inchangé; DETERMINISTIC refusé par nom.
- Stores, commandes, Tauri (map_relations_revoke, map_cross_relations_revoke),
  boutons Révoquer / Revoke dans les deux panneaux (APPROVED seulement, natifs,
  état occupé, FR/EN), overview relu du backend, focus rendu à l'approbation de
  la même suggestion.
- Trouvaille de preuve réelle : le hook de focus générique de TASK-0047 envoyait
  le focus sur le bouton Révoquer d'une autre relation (data-testid partagé).
  Corrigé (attribut par clé + focus explicite); hook TASK-0047 inchangé.
- WebView2 réel, 2 processus autour d'un redémarrage réel, vrais événements
  clavier (Tab, Entrée, Espace) : intra 8/4/4 -> 8/5/3 -> 8/4/4 -> 8/5/3, inter
  6/0/4 -> 6/1/3 -> 6/0/4 -> 6/1/3; arêtes de la carte; isolation Alpha / Gamma
  (approbation propre de la même clé) / store commun; source et Index inchangés;
  rebuild des Index et rerun du moteur : aucune résurrection; axe 0 violation.

VALIDATIONS:
- cargo test : 798 passés, 0 échec, 6 ignorés (préexistants).
- pnpm test 654/654; pnpm check; pnpm build; Tauri debug; git diff --check.
- WebView2 réel : PASS (HEAD testé 14a821d9cfc690ad4365fc7572bc455edc7144d4).
- Falsifications (7 exigées) : toutes couvertes (store, commande, IPC réel);
  5 mutations du produit observées en échec puis restaurées; backend saboté
  fait échouer la preuve réelle, restauré puis rejoué : PASS.
- Audit public (-AllowRemotes) : PASS.
- NON TESTÉ : kill pendant une révocation; Beta dans la preuve réelle;
  révocation d'une suggestion du moteur par geste réel (store-level seulement);
  P-19 au-delà de la persistance d'une révocation.

FILES CHANGED:
- src-tauri/src/{lib.rs, map/relations.rs, map/cross_relations.rs,
  map/relation_commands.rs, map/cross_commands.rs, map/rule_engine.rs}
- src/map/{RelationsPanel.tsx, CrossRelationsPanel.tsx, MapApp.tsx,
  mapStrings.ts, types.ts, restoreFocus.ts, relations.test.tsx,
  crossRelations.test.tsx}
- scripts/task0051-{webview2.mjs, webview2.ps1, seed-proof.py, store-snapshot.py}
- docs/performance/runs/TASK-0051-webview2.json
- docs/tasks/TASK-0051-v1-approved-relation-revocation.md (statut + Exécution)
- docs/ai/{CURRENT_STATE,NEXT_ACTION,HANDOFF,VALIDATION,CHANGELOG_AI}.md,
  docs/product/FEATURE_MATRIX.md

STATE: TASK-0051 = IMPLEMENTED (candidate au contrôle indépendant). P-04 = candidate
à la fermeture, jamais auto-VERIFIED. P-19 inchangée. Aucune TASK-0052.
NEXT_ORCHESTRATOR_DECISION: contrôle indépendant de TASK-0051 sur preuves.
