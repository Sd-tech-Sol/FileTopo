# NEXT_PROMPT — ACTION-0115 / correction TASK-0062 B05

**UNE SEULE TÂCHE : terminer le contrôle B05 de TASK-0062; ne pas créer TASK-0063.**
- Repo : `Sd-tech-Sol/FileTopo`.
- Branche : `build/v0.2-b05-populated-panels`.
- Décision : `docs/reviews/ACTION-0115-task0062-independent-control.md` — **CORRECTION REQUIRED / NOT VERIFIED**.
- Exécutant : Claude Code Sonnet, effort HIGH.
- Contrat initial conservé : `docs/tasks/TASK-0062-stage-b-populated-panels.md`, ACTION-0114, `AGENTS.md`.

## Début impératif

1. Vérifie dépôt, remote, `git status` propre, branche courante et HEAD. `git fetch origin` et synchronisation **fast-forward seulement** de `origin/build/v0.2-b05-populated-panels`. Si modifications locales ou divergence inattendue : STOP, ne pas `reset`, `clean` ni forcer.
2. Lis dans l'ordre `AGENTS.md`, `docs/ai/START_HERE.md`, `docs/ai/CURRENT_STATE.md`, `docs/ai/NEXT_ACTION.md`, le **texte intégral** de ACTION-0115 et de TASK-0062, `.orchestrator/RESULT.md`, les preuves BEFORE/AFTER pertinentes. Ce prompt remplace l'ancien : ne pas relancer toute TASK-0062 depuis zéro.

## B05-O1 — restaurer le focus après APPROUVER (blocage)

3. Reproduis le fait mesuré en WebView2 réel : les approbations intra et inter-cerveaux réussissent, mais `focusAfterApprove.isBody=true` (le bouton Approuver disparaît). Vérifie le code d'approbation et la restauration existante après RÉVOQUER : `MapApp.tsx`, `RelationsPanel.tsx`, `CrossRelationsPanel.tsx`; réutilise le mécanisme éprouvé `useRestoreFocusAfterReload`, sans en recoder un deuxième si évitable.
4. **Correctif UI minimal seulement** : après approbation au clavier, focus sur la commande Révoquer **de la même suggestion et du même cerveau / inter-cerveaux**, lorsqu'elle existe et est activable; sinon repli annoncé et mesuré dans le panneau correspondant. Ne jamais envoyer le focus sur une autre suggestion, sur un autre cerveau ou sur `body`. Vérifie Tab/Shift+Tab, indication visible du focus, position dans l'aside et aucun `document.scrollY`; souris et clavier, FR/EN et dimensions principales. Prends des mesures BEFORE/AFTER.
5. Fichiers produit permis pour ce correctif : **seulement** `src/map/MapApp.tsx`, `src/map/RelationsPanel.tsx`, `src/map/CrossRelationsPanel.tsx` et CSS d'interface existant si indispensable. Tests UI strictement ciblés; réutilise les harnais `scripts/task0062-*`. Aucun Rust, scanner, SQLite, Index, projection, moteur/événement IPC, store, modèle de relations, changement de flux d'approbation, dépendance/lockfile, `MapView`, `viewState`, `resumeState`. Si la correction nécessite une logique métier ou fichier hors scope : **BLOCKED puis STOP**, documente et demande décision orchestrateur, n'improvise pas.

## B05-O2 — prouver les invariants antérieurs

6. Rejoue les **vrais témoins versionnés** de B03 (18 états, 13/13 commandes entières, 3 groupes accessibles, carte >=240) et B04 (six états menu ouvert et alternative modale; première action ferme, deuxième active, Escape et retour de focus), selon leurs scripts existants. Publie le résultat sans transformer un test strict `false` menu ouvert en `true`. Vérifie P-19/P-22 de portée B05, panneaux peuplés et réglages à 960x640 / 1280x800 / 1366x768, sans écriture sous les racines synthétiques.
7. Rejoue les interactions B05 concernées par le patch et les mesures visuelles pertinentes, y compris une contre-épreuve si nécessaire pour prouver qu'un test détecte le focus perdu sur le produit précédent. Les screenshots et JSON doivent référencer le **SHA réellement testé**, distinguer résultats du harnais et limites.
8. Exécute `pnpm check`, `pnpm build`, `git diff --check` et `pnpm test`; reproduis/isole et publie l'intermittence `brainIdentity`. Ne touche pas au test sans preuve de régression causée par cette correction. Aucune CI verte prétendue sans run distant.

## Livraison et arrêt

9. Publie preuves JSON/PNG reproductibles `docs/performance/runs/TASK-0062-*`; actualise `.orchestrator/RESULT.md` (état **IMPLEMENTED** ou **BLOCKED**, jamais VERIFIED) et les documents canoniques `docs/ai/{CURRENT_STATE,HANDOFF,NEXT_ACTION,VALIDATION,CHANGELOG_AI}.md` plus la fiche TASK-0062. Préserve ACTION-0115 et le verdict de l'orchestrateur.
10. Commit et push **uniquement sur B05**, sans force, puis **STOP**. Ne démarre pas TASK-0063, Stage C/D, R8, PR, merge, tag ou release. `main` inchangée. Le prochain contrôle indépendant appartient à ChatGPT.

**Après ce travail, un /clear sera approprié avant une tâche distincte.**
