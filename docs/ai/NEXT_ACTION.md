# Action suivante

## TASK-0034 — corrective pass 3 après ACTION-0054

`TASK-0034 — V1 Find & Open` reste `IMPLEMENTED`, **pas encore `VERIFIED`**.

La passe corrective 2 a bien fermé les deux verrous d'`ACTION-0053` : invalidation synchrone lors de la saisie, normalisation frontend/backend cohérente (`trim()` + 200 points de code Unicode), vérification de l'offset et tests adversariaux déterministes.

Le recontrôle indépendant [`ACTION-0054`](../reviews/ACTION-0054-independent-recontrol.md) a toutefois trouvé un dernier chemin non couvert : `removeBrain()` peut transférer le focus lorsqu'on retire le cerveau focalisé, et `navigateCross` peut aussi fournir à `applyComposition()` une composition focalisée sur un autre cerveau. Ces transitions passent par `applyComposition()` sans nécessairement passer par `onFocusBrain`, `selectNode` ou `changeProjection`, où les invalidations ont été ajoutées.

Action unique suivante : exécuter la passe corrective 3 décrite dans `.orchestrator/NEXT_PROMPT.md`. Le correctif attendu est central : `applyComposition(next, ...)` invalide `SearchCoordinator` immédiatement lorsque `next.focusedBrainId` diffère réellement du focus courant, avant tout `await`; aucune invalidation si le focus reste identique.

Après exécution et push : nouveau contrôle indépendant de `TASK-0034`. Aucune `TASK-0035` avant fermeture de ce verrou.
