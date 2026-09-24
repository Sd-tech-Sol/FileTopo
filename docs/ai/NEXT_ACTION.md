# Action suivante

## TASK-0043 — V1 Automatic Watcher & Reconciliation

`TASK-0042 — V1 Source Availability & Stale Index Foundation` est **VERIFIED
dans sa portée** par
[`ACTION-0070`](../reviews/ACTION-0070-task0042-final-control.md).

Tous les prérequis de `DEC-0010` sont maintenant présents :

- identité stable;
- journal;
- U-B vérifié;
- Actualiser produit via U-B;
- machine d'indisponibilité F-032.

La prochaine tranche est
[`TASK-0043 — V1 Automatic Watcher & Reconciliation`](../tasks/TASK-0043-v1-automatic-watcher.md),
encadrée par
[`DEC-0041`](../decisions/DEC-0041-watcher-signals-and-reconciliation.md).

Principe : les événements OS sont seulement des **hints**. La vérité vient
toujours de W-B/W-C puis U-B.

Action unique : exécuter `.orchestrator/NEXT_PROMPT.md` sur
`build/v0.2-a27-v1-watcher-reconciliation`.

Aucune TASK-0044, aucun USN, aucun PR/merge/tag/release avant contrôle
indépendant de TASK-0043.
