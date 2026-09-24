# Action suivante

## Recontrôle TASK-0042 — ACTION-0069 P1/P1b

La fondation `TASK-0042` est fonctionnellement acceptée, mais reste
`IMPLEMENTED`, pas `VERIFIED`.

Blocage unique : si la source est réellement indisponible **et** que l'écriture
du petit record `source_observation.*` échoue, le frontend peut relire l'ancien
record persisté et afficher un état périmé (par exemple `SYNCED`).

`ACTION-0069` exige donc deux corrections étroites :

- rendre l'observation courante disponible avec `persisted:false` dans la
  session même si son write échoue;
- invalider aussi un ancien **failure record** dont
  `lastSuccessfulRevision` ne correspond plus à la révision servie.

Action unique : exécuter `.orchestrator/NEXT_PROMPT.md` sur
`build/v0.2-a26-v1-source-availability`.

Aucune TASK-0043, aucun watcher/polling/W-B/W-C avant fermeture de P1/P1b.
