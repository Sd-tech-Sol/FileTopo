# Action suivante

## TASK-0039 — V1 Dynamic Filters

`TASK-0038 — V1 Journal-derived Seen/Unseen State` est **VERIFIED** par
[`ACTION-0064`](../reviews/ACTION-0064-independent-control.md).

La prochaine tranche est
[`TASK-0039 — V1 Dynamic Filters`](../tasks/TASK-0039-v1-dynamic-filters.md),
encadrée par
[`DEC-0037`](../decisions/DEC-0037-dynamic-filtered-projection.md).

Objectif : fermer `F-022 / P-09` avec des filtres calculés côté Index et une
projection toujours bornée :

- Tout / Nouveaux / Non vus;
- type;
- disponibilité;
- combinaisons;
- total exact;
- pagination keyset;
- match/contexte explicites.

NEW/UNSEEN consomment exclusivement la vérité de `TASK-0038`;
`nodes.seen` reste historique.

Action unique : exécuter `.orchestrator/NEXT_PROMPT.md` sur
`build/v0.2-a23-v1-dynamic-filters`.

Hors portée : watcher `F-030`, incrémental `F-031`, persistance P-19 des
filtres, TASK-0040.
