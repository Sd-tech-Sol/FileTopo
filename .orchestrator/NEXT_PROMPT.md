# NEXT_PROMPT — TASK-0058 / Stage B B01

**STATE:** `APPROVED / NOT STARTED`
**Executor:** Claude Code — Sonnet, effort MEDIUM
**Branch:** `build/v0.2-b01-responsive-shell`
**Base branch HEAD before audit:** `81e7c4fa0135652fd4afae7f6c566628a64ef003`
**Source of truth:** `docs/reviews/ACTION-0108-stage-b-audit.md` and `docs/tasks/TASK-0058-stage-b-visual-baseline-responsive-shell.md`.

1. Synchronise `build/v0.2-b01-responsive-shell` en **fast-forward uniquement** depuis `origin`, confirme la branche et un arbre propre. N'utilise pas reset --hard, clean, force push, merge main ou rebase destructif. Un ancien répertoire local sur une autre branche exige un fetch puis un checkout sûr; en cas de modifications locales inattendues, STOP.
2. Lis `AGENTS.md`, `docs/ai/START_HERE.md`, `docs/ai/CURRENT_STATE.md`, `docs/ai/NEXT_ACTION.md`, `docs/reviews/ACTION-0108-stage-b-audit.md` et **l'intégralité** de `docs/tasks/TASK-0058-stage-b-visual-baseline-responsive-shell.md`. Suis la portée de la fiche, sans anticiper B02/C/D.
3. Vérifie le point fixe : Stage A CLOSED, 22 P CLOSED/VERIFIED, aucune TASK IN_PROGRESS, et ce prompt est le seul GO technique courant. Passe `TASK-0058` à IN_PROGRESS seulement après ces vérifications.
4. Première chose : mesure visuelle réelle et étalon AVANT correction CSS. Si aucun échec reproductible du chrome à 960x640/1280x800/1366x768, ne touche pas au produit; livre plutôt le résultat et les preuves. Si échec, ne corrige que `src/map/map.css` (chrome responsive) avec test ciblé et recontrôle WebView2.
5. Laisse `MapView`, graphe, Rust, IPC, data model, configuration Windows minimale, déps et logique intacts. Aucune donnée personnelle. Les résultats de test non exécutés restent NON TESTÉS.
6. Tests/gates et preuves : respecte la fiche; ne transforme pas les preuves historiques en nouveaux résultats. Documente tous les échecs/anomalies.
7. Mets les documents de passation à jour; écris un `.orchestrator/RESULT.md` clair avec commit(s), diff, fichiers, commandes, artefacts, limites, statut `IMPLEMENTED` ou `BLOCKED` — jamais VERIFIED par toi. Commit et push non forcé vers `build/v0.2-b01-responsive-shell`; arrête-toi.
8. **Ne prépare pas TASK-0059, aucune PR/merge/main/release/tag.**

Une fois terminé, l'orchestrateur relira directement GitHub. Cette tâche part d'une session propre : `/clear` est approprié avant son lancement car tout le contexte nécessaire est versionné.
