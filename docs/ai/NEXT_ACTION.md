# Action suivante

## Recontrôle TASK-0043 — ACTION-0071 P1

La surveillance automatique `TASK-0043` est fonctionnellement acceptée, mais
reste `IMPLEMENTED`, pas `VERIFIED`.

Blocage unique : `WatchManager::shutdown` peut atteindre son délai puis
détacher un worker encore vivant. Si ce worker attend `PUBLICATION_LOCK`, le
flag d'annulation n'est pas encore consulté.

`ACTION-0071` exige donc :

- acquisition du publication lock annulable côté watcher pour W-B et W-C;
- aucun détachement de `JoinHandle` vivant au shutdown;
- preuve déterministe avec `PUBLICATION_LOCK` retenu pendant shutdown;
- handle natif fermé et aucun write/event tardif après retour.

Action unique : exécuter `.orchestrator/NEXT_PROMPT.md` sur
`build/v0.2-a27-v1-watcher-reconciliation`.

Aucune TASK-0044, aucun USN et aucun élargissement de portée avant fermeture de
P1.
