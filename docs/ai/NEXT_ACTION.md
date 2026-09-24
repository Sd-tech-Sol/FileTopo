# Action suivante

## TASK-0041 — V1 Manual Refresh Through Incremental Apply

`TASK-0040 — V1 Incremental Update Application Kernel` est **VERIFIED** par
[`ACTION-0067`](../reviews/ACTION-0067-task0040-final-control.md).

Le bouton **Actualiser** et le résumé de changements existent déjà, mais le
backend produit passe encore par une publication complète après le scan.

La prochaine tranche est
[`TASK-0041 — V1 Manual Refresh Through Incremental Apply`](../tasks/TASK-0041-v1-manual-refresh-incremental.md),
encadrée par
[`DEC-0039`](../decisions/DEC-0039-manual-refresh-incremental-apply.md).

Objectif :

`scan complet manuel -> lot minimal -> apply_update_batch`

sur un Index existant estampé.

Première indexation et restamp legacy restent des full paths explicites;
`Reconstruire` reste full volontairement.

Action unique : exécuter `.orchestrator/NEXT_PROMPT.md` sur
`build/v0.2-a25-v1-manual-refresh-incremental`.

Hors portée : watcher F-030, W-B/W-C, indisponibilité F-032, TASK-0042.
