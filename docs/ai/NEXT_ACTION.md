# Action suivante

## TASK-0038 — V1 Journal-derived Seen/Unseen State

La porte public-readiness est **fermée** par
[`ACTION-0063`](../reviews/ACTION-0063-public-readiness-final-control.md).

`TASK-0037` reste **VERIFIED** par `ACTION-0061`.

L’audit de la suite V1 conclut que le prochain prérequis n’est pas le watcher :
`P-17` exige que les états « nouveau » et « non vu » soient **dérivés du
journal**. Le booléen historique `nodes.seen` existe encore, mais n’est pas la
source de vérité V1 et ses anciennes commandes prototype ne sont pas exposées.

Action unique : exécuter
[`TASK-0038 — V1 Journal-derived Seen/Unseen State`](../tasks/TASK-0038-v1-journal-seen-state.md)
selon
[`DEC-0036`](../decisions/DEC-0036-journal-derived-seen-state.md)
et `.orchestrator/NEXT_PROMPT.md`, sur
`build/v0.2-a22-v1-seen-state`.

Hors portée : filtres de carte `F-022`, watcher `F-030`, incrémental
`F-031`, `TASK-0039`.
