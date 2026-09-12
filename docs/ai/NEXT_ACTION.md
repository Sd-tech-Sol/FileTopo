# Action suivante

## TASK-0037 — V1 Change Journal on Manual Refresh

`TASK-0036 — V1 Stable Identity Foundation` est **VERIFIED** par [`ACTION-0060`](../reviews/ACTION-0060-independent-final-recontrol.md).

L’audit MVP montre que le prochain manque logique n’est pas encore le watcher : `P-09` exige les filtres `nouveaux/non vus`, mais `P-17` exige que ces états soient **dérivés du journal**. `P-16` exige déjà un historique persistant des créations, modifications, renommages, déplacements et suppressions. La fondation d’identité stable de TASK-0036 rend maintenant cette attribution fiable.

La prochaine tranche est donc [`TASK-0037`](../tasks/TASK-0037-v1-change-journal.md) sur `build/v0.2-a21-v1-change-journal` : journal persistant alimenté par Actualiser/Reconstruire, cinq natures exactes, publication atomique avec l’Index, pagination/filtres du journal, résumé manuel et UI V1.

**Hors portée de cette tranche :** watcher `F-030`, application incrémentale `F-031`, réconciliation W-B/W-C, filtres de carte `nouveau/non vu`, marquage vu, TASK-0038.

Exécution autorisée : Claude Code lit et exécute intégralement `.orchestrator/NEXT_PROMPT.md`, puis écrit `.orchestrator/RESULT.md`, committe et pousse sur la branche exacte. La tâche finit `IMPLEMENTED`, jamais auto-`VERIFIED`.
