# NEXT_PROMPT — ACTION-0113 / correction TASK-0061 B04

**Une seule tâche : TASK-0061 (correction). NE PAS créer TASK-0062.**  
**Branche :** `build/v0.2-b04-multibrain-shell`  
**Agent :** Claude Code Sonnet, effort HIGH.  
**Détail contractuel :** `docs/reviews/ACTION-0113-task0061-independent-control.md`.

1. Synchronise `origin/build/v0.2-b04-multibrain-shell` par **fast-forward uniquement**, assure-toi d'un worktree propre, lis `AGENTS.md`, `docs/ai/START_HERE.md`, ACTION-0113 et **l'intégralité** de TASK-0061, puis `TASK-0061-multibrain-shell-after.json` et `TASK-0061-status-visibility-after.json`.
2. B04 a bien réglé les 13 commandes dans 30 états, 2–4 cerveaux, noms Unicode/longs et menu. N'altère pas ce gain. **Deux critères restent non vérifiés** :
   - B04-O1 : `groupEntryPointsWholeEveryState=false` dans six états menu ouvert : `chrome-diagnostics` couvert par la surcouche; activation du groupe non testée. Donner un chemin direct testé et clairement accessible, ou une solution de menu explicitement modal entièrement navigable et refermable, **sans affaiblir le critère ni masquer le défaut**. Si une exception produit est indispensable, STOP/BLOCKED, pas d'approbation implicite.
   - B04-O2 : à `960x640` le statut `Index absent` et le refus de suppression ont **0px visibles**; corrections 0/154 et 51,6/138, fermeture 0px; à 1280 FR, fermeture 11/35. Un refus doit devenir visiblement lisible **au moment où il apparaît**, avec un contrôle de fermeture accessible à la souris/clavier, sans défilement préalable du chrome.
3. Préférer la plus petite correction UI des composants CSS/JSX déjà présents; aucune nouvelle bibliothèque, refonte modèle, backend, persistance, IPC, scanner, root source, `MapView.tsx`, `viewState`, verrou. Ne déplace aucun contenu dans une zone invisible ni au-dessus de la carte de manière bloquante.
4. Ajouter une preuve WebView2 **interactionnelle** de chaque entrée de groupe même si menu ouvert, et du message/corrections **à l'apparition**, plus bouton Fermer accessible. Mesurer 960/1280/1366 FR/EN clair/sombre compact/reduced, tous 30 états, P-19/P-22, 13 primaires entières, carte ≥240, aucun overflow horizontal et aucune écriture sous racines. Conserver B03 18/18 + contre-épreuve ancien produit.
5. Exécuter `pnpm test`, `pnpm check`, `pnpm build`, `git diff --check`; signaler toute instabilité. Faire des captures et logs des cas difficiles. Les essais Windows WebView2 sont nécessaires; aucun vert CI présumé.
6. Actualise `.orchestrator/RESULT.md` (`IMPLEMENTED` ou `BLOCKED`, **jamais VERIFIED**), TASK-0061, docs de validation et handoff. Commit/push B04 **sans force**, puis STOP. Stage B non close, aucune TASK-0062/Stage C/D/PR/merge main.

Une session Claude `/clear` est appropriée après lecture des instructions versionnées.
