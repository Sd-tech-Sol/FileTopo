# Action suivante

## TASK-0040 — V1 Incremental Update Application Kernel

`TASK-0039 — V1 Dynamic Filters` est **VERIFIED** par
[`ACTION-0065`](../reviews/ACTION-0065-independent-control.md).

L’audit de la chaîne de mise à jour confirme :

- l’Actualiser actuel est **sûr** en cas de scan incomplet : l’ancien Index
  reste servi;
- mais l’application reste un remplacement complet
  (`DELETE FROM nodes` + réinsertion dans une transaction);
- `DEC-0010` impose donc `U-B` avant le watcher.

La prochaine tranche est
[`TASK-0040 — V1 Incremental Update Application Kernel`](../tasks/TASK-0040-v1-incremental-apply.md),
encadrée par
[`DEC-0038`](../decisions/DEC-0038-incremental-application-kernel.md).

Objectif : appliquer un lot déjà réconcilié en coût proportionnel aux
changements, avec identité stable, journal et révision atomiques.

Action unique : exécuter `.orchestrator/NEXT_PROMPT.md` sur
`build/v0.2-a24-v1-incremental-apply`.

Hors portée : watcher F-030, indisponibilité F-032, remplacement de
`map_refresh`, TASK-0041.
