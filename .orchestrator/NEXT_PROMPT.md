# NEXT_PROMPT — TASK-0062 / Stage B B05

**Une seule tâche approuvée, NON commencée.**  
Branche : `build/v0.2-b05-populated-panels`, issue du HEAD B04 vérifié `db2392f7f428712d6233399f3e27a497cf5dbb71`.  
Agent : Claude Code Sonnet, effort HIGH.  
Contrat : `docs/reviews/ACTION-0114-task0061-independent-control.md` et `docs/tasks/TASK-0062-stage-b-populated-panels.md`.

1. `git fetch`, synchronise `origin/build/v0.2-b05-populated-panels` en **fast-forward uniquement**, worktree propre; confirme SHA, aucun reset/clean/force push.
2. Lis `AGENTS.md`, `docs/ai/START_HERE.md`, les docs d'état/validation, ACTION-0114, puis **l'intégralité** de TASK-0062.
3. Les trois panneaux `RelationsPanel`, `ReviewQueuePanel`, `CrossRelationsPanel` n'ont **pas encore été réellement peuplés à 960×640** dans les campagnes récentes. Réutilise les anciens harnais J12/M12/SR15, sources strictement synthétiques. Ne prétends pas mesurer du contenu absent.
4. **Mesure d'abord** dans Tauri/WebView2 natif 960×640/1280×800/1366×768 FR/EN clair/sombre/compact/reduced. Panneaux peuplés, navigation clavier/souris, détails, revue, relations inter-cerveaux et panneaux ouverts/fermés. Captures et mesures BEFORE à scrollY=0.
5. Ne corrige du CSS/JSX des seuls panneaux autorisés que si un défaut est démontré. Ne change aucune logique métier, Rust, IPC/Index, dépendance ou projection. Tout blocage hors scope : `BLOCKED` et STOP.
6. Rejoue les contrôles ciblés P-19/P-22, baseline B03 et comportement modal B04, vérifie carte >=240px, aucun contrôle inaccessible ni overflow, tests pnpm/check/build/diff-check, consigne contrastes axe incomplete sans faux PASS.
7. Documente les limites exactes et les preuves, écris `.orchestrator/RESULT.md` avec `IMPLEMENTED` ou `BLOCKED`, mets à jour mémoire et validation, commit et push sur **B05 seulement**, puis STOP. Ne commence TASK-0063, Stage C/D, PR/merge/release sous aucun prétexte.

`/clear` recommandé entre les tâches; toute la source de vérité est dans GitHub.
