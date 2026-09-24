# Action suivante

## TASK-0042 — V1 Source Availability & Stale Index Foundation

`TASK-0041 — V1 Manual Refresh Through Incremental Apply` est **VERIFIED** par
[`ACTION-0068`](../reviews/ACTION-0068-task0041-independent-control.md).

La prochaine tranche prépare la frontière d'indisponibilité temporaire avant
le watcher :

[`TASK-0042 — V1 Source Availability & Stale Index Foundation`](../tasks/TASK-0042-v1-source-availability.md),
encadrée par
[`DEC-0040`](../decisions/DEC-0040-source-observation-stale-index.md).

Objectif : mémoriser et afficher la dernière observation source
(UNKNOWN/SYNCED/UNAVAILABLE/SOURCE_CHANGED/SCAN_INCOMPLETE/APPLY_FAILED), garder
le dernier Index fiable en cas d'échec et ne jamais transformer une racine
absente en suppressions.

Action unique : exécuter `.orchestrator/NEXT_PROMPT.md` sur
`build/v0.2-a26-v1-source-availability`.

Hors portée : watcher F-030, W-B/W-C, TASK-0043. F-032 reste une fondation tant
que le watcher ne consomme pas ce contrat automatiquement.
