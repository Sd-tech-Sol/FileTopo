# Action suivante

## Audit/orchestration de F-022 — filtres dynamiques

`TASK-0038 — V1 Journal-derived Seen/Unseen State` est **VERIFIED** par
[`ACTION-0064`](../reviews/ACTION-0064-independent-control.md).

La source de vérité de « nouveau » / « non vu » est maintenant stable et
journal-derived. La prochaine tranche doit auditer puis implémenter `F-022`
sans utiliser `nodes.seen` et sans casser la projection bornée
`DEC-0031/DEC-0034`.

Cible fonctionnelle `P-09` :

- Tout / Nouveaux / Non vus;
- type;
- disponibilité;
- critères combinables;
- total exact dérivé de l’Index;
- filtre actif visible et révocable;
- aucun whole-corpus DTO vers le frontend.

Watcher `F-030` et incrémental `F-031` restent hors portée.

Le cadrage détaillé de la prochaine branche est préparé par l’orchestrateur;
aucun exécuteur ne doit créer seul la tâche suivante.
