# Action suivante

## Contrôle indépendant de TASK-0041

`TASK-0041 — V1 Manual Refresh Through Incremental Apply` est **`IMPLEMENTED`**, pas
`VERIFIED`, sur `build/v0.2-a25-v1-manual-refresh-incremental`
([`DEC-0039`](../decisions/DEC-0039-manual-refresh-incremental-apply.md)).

**Actualiser** d'un Index déjà estampé fait maintenant
`scan complet manuel -> lot minimal -> apply_update_batch` (`reconcile.rs`,
`BrainIndex::refresh_incrementally`), sans jamais repasser par le remplacement complet.
Première indexation, restamp legacy et **Reconstruire** restent des chemins complets
explicites; le noyau `TASK-0040` n'a pas été modifié.

Action unique : contrôle indépendant de `TASK-0041`, sur preuves — `.orchestrator/RESULT.md`,
[`VALIDATION.md` section BV](VALIDATION.md), `src-tauri/src/reconcile.rs`,
`map/refresh_incremental_tests.rs`, `docs/performance/runs/TASK-0041-webview2.json`.

Points à trancher par le contrôle (six décisions, détail dans `RESULT.md`) : Index legacy
sans liaison de source routé vers le restamp complet; `built_unix_ms` = dernière publication
**complète**; racine changée d'identité = refus explicite; Actualiser sans changement
n'avance plus la révision; `Reconstruire` sans Index = baseline.

Hors portée : watcher `F-030`, W-B/W-C, indisponibilité `F-032`, `TASK-0042`.
