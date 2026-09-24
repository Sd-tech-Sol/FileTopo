# Action suivante

## Contrôle indépendant de TASK-0042

`TASK-0042 — V1 Source Availability & Stale Index Foundation` est **IMPLEMENTED** sur
`build/v0.2-a26-v1-source-availability` : la dernière observation de la source (six états
fermés, raison fermée, sans chemin) est persistée par cerveau, écrite par le vrai Actualiser,
relue par `Ouvrir` sans toucher la source; une racine absente, remplacée ou illisible conserve
le dernier Index fiable sans aucune suppression inventée.

Action unique : **contrôle indépendant de `TASK-0042` sur preuves**, par une instance distincte
de l'exécuteur — `.orchestrator/RESULT.md`, [VALIDATION section BW](VALIDATION.md),
`src-tauri/src/map/source_observation.rs`, `src-tauri/src/map/source_availability_tests.rs`,
`publish_map` dans `map/commands.rs`, `SourceObservationBadge.tsx`, et l'artefact
`docs/performance/runs/TASK-0042-webview2.json`. Les cinq décisions de `RESULT.md` sont les
points à trancher.

Seul le contrôle peut attribuer `VERIFIED`. **`F-032` ne peut pas être déclarée complète** :
aucune détection automatique n'existe tant que `F-030` ne consomme pas ce contrat.

Hors portée : watcher `F-030`, W-B/W-C, polling, `TASK-0043`, PR, fusion, étiquette, release.
