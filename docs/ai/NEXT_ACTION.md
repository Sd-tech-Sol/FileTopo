# Action suivante

## Contrôle indépendant du correctif ACTION-0071 (TASK-0043)

Le correctif du blocage **P1** d'`ACTION-0071` est livré (commit `001f18f` sur
`build/v0.2-a27-v1-watcher-reconciliation`). `TASK-0043` reste `IMPLEMENTED`, pas `VERIFIED`.

Ce qui est à contrôler, sur preuves (`VALIDATION` section BZ, `.orchestrator/RESULT.md`) :

- acquisition annulable du même `PUBLICATION_LOCK` pour W-C, W-B et l'enregistrement de la garde;
- `WatchManager::shutdown` joint tous les workers, sans aucun détachement;
- preuves avec le verrou tenu pendant le shutdown, et rien de tardif après sa libération;
- handle natif fermé (test natif rejoué).

Action unique : contrôle indépendant du correctif `ACTION-0071`, par une instance distincte de
l'exécuteur.

Aucune TASK-0044, aucun USN et aucun élargissement de portée avant ce contrôle.
