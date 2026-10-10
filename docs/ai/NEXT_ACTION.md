# Action suivante — contrôle indépendant de la correction ACTION-0113

**UNE action :** contrôle indépendant (ChatGPT, orchestrateur) de `TASK-0061` sur `build/v0.2-b04-multibrain-shell` : lire `.orchestrator/RESULT.md`, les artefacts `TASK-0061-multibrain-shell-{correction,before-correction}.json`, `TASK-0061-b03-baseline-correction.json` et `TASK-0061-status-visibility-*.json`, inspecter les captures `TASK-0061-correction-*.png`, puis accorder ou refuser `VERIFIED`. Aucune TASK-0062.

- Claude a livré `IMPLEMENTED` (jamais VERIFIED) : B04-O2 corrigé (notices entières à l'apparition dans 12/12 états, fermeture souris/Tab/Échap), B04-O1 par un menu explicitement modal dont les lectures strictes restent fausses menu ouvert (6 états) et dont la récupération est mesurée.
- Décision à prendre par l'orchestrateur : ratifier ou rejeter le modal (changement de comportement de l'interface, permis par ACTION-0113). Stage B reste EN COURS; Stage C/D, R8 et `main` inchangés.
