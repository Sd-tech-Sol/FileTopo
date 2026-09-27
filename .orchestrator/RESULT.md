TASK_ID: TASK-0048
AGENT: CODEX
RESULT: DONE
BRANCH: build/v0.2-a32-v1-safe-exclusion-policy
FINAL_HEAD: 00b1017fbdd263b0f0950aacb80315fe3480cd1f

SUMMARY:
- Cause: `replace()` ne vérifiait pas que son ancien rendu A appartenait encore à la génération affichée après `await`.
- Correction: génération brain-scoped invalidée dès le rendu B; aucun retour stale ne publie state/error/busy, n'appelle `onApplied` ni ne signale succès à l'ancien `add/remove`.

VALIDATIONS:
- R1–R4 différés PASS; falsification sans correctif: R1–R3 FAIL. Ciblé 7/7, frontend 625/625, check/build et Tauri debug PASS.
- WebView2 final PASS phases 1/2 au second bac frais; diff check et audit public (647 fichiers) PASS.

IMPORTANT_FILES:
- src/map/ExclusionsPanel.tsx; src/map/ExclusionsPanel.test.tsx.
- docs/ai/VALIDATION.md; docs/tasks/TASK-0048-v1-safe-exclusion-policy.md.

COMMIT: 00b1017fbdd263b0f0950aacb80315fe3480cd1f fix: isolate stale exclusion updates by brain
PUSHED: yes

LIMITS_OR_BLOCKERS:
- Aucun blocage. Première campagne WebView2 expirée sur l'attente source absente, puis relance fraîche PASS; la course A→B est prouvée en composant, pas explicitement dans le harnais réel. Aucun Rust rejoué car aucun Rust/backend modifié.

NEXT_ORCHESTRATOR_DECISION:
- Contrôler indépendamment la corrective ACTION-0081 et attribuer ou refuser VERIFIED à TASK-0048. Aucune TASK-0049 avant ce verdict.
