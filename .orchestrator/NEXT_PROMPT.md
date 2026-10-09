# NEXT_PROMPT — correction TASK-0060 / ACTION-0111

**Même tâche TASK-0060 / Stage B B03. NE PAS commencer TASK-0061.**  
**Branche :** `build/v0.2-b03-primary-chrome`  
**Base à synchroniser :** commit documentaire ACTION-0111, sur `79128682d61cedf22b39ea18fb1f022c33149c39`.  
**Agent suggéré :** Claude Code Sonnet, effort HIGH.

L'audit indépendant `docs/reviews/ACTION-0111-task0060-independent-control.md` est le GO de correction. Le rapport d'exécution positif ne vaut pas VERIFIED.

1. `git fetch`, synchronise `origin/build/v0.2-b03-primary-chrome` **en fast-forward seulement**, worktree propre, puis lis `AGENTS.md`, `docs/ai/START_HERE.md`, ACTION-0111, l'intégralité de `docs/tasks/TASK-0060-stage-b-primary-chrome.md` et les preuves AFTER.
2. **B03-O1 prouvé à 960x640 (comfortable)** : `Ajouter un dossier`, `Ouvrir`, `Actualiser` ne montrent que 20/35px; les résumés outils avancés et diagnostics sont encore 25/70px sous le pli. Les 13 commandes sont simplement cliquables au test de pointage, pas toutes entièrement visibles : `primaryContractSatisfiedWhole=false` et 10/13 au pire. **Ce n'est pas encore accepté.**
3. Corrige **dans les mêmes fichiers UI autorisés B03**, par la plus petite réorganisation responsable, sans retirer de contrôles ni réduire `MapView` sous 240px, pour obtenir **13/13 commandes usuelles ENTIERES** et un point d'entrée avancé/diagnostic clairement visible au premier écran à 960x640 confortable, FR/EN, clair/sombre; préserver les autres tailles, compact, reduced motion. Réduis hauteur/encombrement du chrome par son organisation; ne déguise pas un bouton partiel en « visible ».
4. Ajoute une vérification WebView2 de `fullyVisible` / hit test des 13 primaires et des accès aux groupes **depuis la première fenêtre sans scroll préalable** dans 18/18 états. Après ouverture d'un groupe par clavier et souris, contrôle des commandes cachées; protège leurs tests de régression sans laisser jsdom interpréter un `<details>` fermé comme preuve. La restauration P-19 et empreinte P-22 demeurent exigées.
5. Rejoue campagnes réelles WebView2, captures et rapports nouveaux, `pnpm test`, `pnpm check`, `pnpm build`, `git diff --check`. Si un blocage hors portée apparaît : `BLOCKED`, preuves et STOP. Ne change pas Rust, Index, IPC, View, dépendances, ni main.
6. Mets à jour `.orchestrator/RESULT.md`, TASK-0060 et les docs d'état. Commit/push B03 **sans force**, STOP. Statut `IMPLEMENTED` ou `BLOCKED` seulement; ChatGPT décide VERIFIED.

`/clear` est possible, la source de vérité se trouve dans GitHub.
