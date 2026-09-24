# Action suivante

## Contrôle indépendant du correctif TASK-0042 — ACTION-0069 P1 / P1b

`TASK-0042` reste `IMPLEMENTED`, pas `VERIFIED`. Le correctif (commit `4bed627`) :

- garde en mémoire du processus, un par cerveau, l'observation dont l'écriture a échoué, et la
  sert avec `persisted:false` (fin du `SYNCED` périmé après un Actualiser refusé);
- lit `UNKNOWN` un record d'échec dont `lastSuccessfulRevision` n'est pas la révision servie.

Action unique : contrôle indépendant, sur preuves, de `docs/ai/VALIDATION.md` section BX,
`map/source_observation.rs`, les trois nouveaux tests de `map/source_availability_tests.rs` et
`src/map/refreshFailure.test.tsx`. Limite à juger : le fallback corrige la session, pas un crash.

Aucune TASK-0043, aucun watcher/polling/W-B/W-C avant ce contrôle.
