# Action suivante

## Contrôle indépendant de TASK-0040

`TASK-0040 — V1 Incremental Update Application Kernel` est **`IMPLEMENTED`**, pas
`VERIFIED`, sur `build/v0.2-a24-v1-incremental-apply`
([`DEC-0038`](../decisions/DEC-0038-incremental-application-kernel.md)).

Action unique : contrôle indépendant de `TASK-0040`, sur preuves — `.orchestrator/RESULT.md`,
[`VALIDATION.md` section BT](VALIDATION.md), `incremental.rs`,
`map/incremental_apply_tests.rs`, et les sept artefacts
`docs/performance/runs/TASK-0040-incremental-apply-*.json`.

Points à trancher par le contrôle : le ratio 100k/1k (une campagne sur sept à 2,11) suffit-il
à `F-031`; les sept décisions listées dans `CURRENT_STATE.md`.

Hors portée : watcher `F-030`, indisponibilité `F-032`, remplacement de `map_refresh`,
`TASK-0041`.
