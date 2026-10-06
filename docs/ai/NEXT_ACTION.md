# Action suivante

## Contrôle indépendant de TASK-0051 — sur preuves

Branche : `build/v0.2-a35-v1-approved-relation-revocation`.

TASK-0051 est `IMPLEMENTED` : toute relation `APPROVED`, intra ou
inter-cerveaux, est révocable (DEC-0049); une relation `DETERMINISTIC` ne l'est
jamais.

Une instance **distincte de l'exécuteur** doit contrôler, sur preuves :

- la section « Exécution » de `docs/tasks/TASK-0051-v1-approved-relation-revocation.md`
  (critères R1 à R12, falsifications, limites);
- `docs/performance/runs/TASK-0051-webview2.json` (`headTested` =
  `14a821d9cfc690ad4365fc7572bc455edc7144d4`) et ses scripts
  `scripts/task0051-webview2.{mjs,ps1}`, `scripts/task0051-store-snapshot.py`;
- les tests Rust `revok*` / `a_failure_between_the_delete_and_the_update*`
  (stores, commandes, `rule_engine`) et les tests Vitest « TASK-0051 ».

Seul ce contrôle peut attribuer `VERIFIED` à TASK-0051 et fermer P-04. P-19,
F-042 et F-046 restent séparés. Aucune TASK-0052 avant lui.
