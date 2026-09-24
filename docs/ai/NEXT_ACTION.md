# Action suivante

## Recontrôle F-031 de TASK-0040 — ACTION-0066 P1

Le noyau U-B de `TASK-0040` est **accepté fonctionnellement** par
[`ACTION-0066`](../reviews/ACTION-0066-task0040-independent-recontrol.md),
mais la tâche reste `IMPLEMENTED`, pas `VERIFIED`.

Blocage unique : le critère de rejet F-031
`median(100k/10) / median(1k/10) <= 2` n’est pas encore établi de façon
robuste. Une campagne standard `opt-level=3` a produit **2,11 (FAIL)**,
alors que les répétitions donnent 1,72 et 1,82.

Action unique : exécuter `.orchestrator/NEXT_PROMPT.md` sur
`build/v0.2-a24-v1-incremental-apply` pour produire la mesure canonique
pré-définie de cinq campagnes / 35 échantillons par cas, **sans modifier le
noyau ni le seuil**.

Aucune TASK-0041, aucun watcher et aucun branchement de `map_refresh` avant
ce recontrôle.
