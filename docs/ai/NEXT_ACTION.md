# Action suivante

## Contrôle indépendant de TASK-0034 (passe corrective 2)

`TASK-0034 — V1 Find & Open` reste `IMPLEMENTED`, **pas encore `VERIFIED`**.

La passe corrective 2, écrite dans `.orchestrator/NEXT_PROMPT.md` et livrée
le 2026-09-11, ferme les deux verrous restants trouvés par
[`ACTION-0053`](../reviews/ACTION-0053-independent-recontrol.md) :
l'invalidation de `searchCoordinator` est désormais synchrone, dans la même
pile d'appel que l'action qui change l'intention de recherche (saisie,
`Effacer`, changement de cerveau), au lieu de dépendre du `useEffect`
suivant; et la requête envoyée au coordinateur/à l'IPC est canonicalisée
(`trim()` + 200 points de code Unicode) avec exactement la même sémantique
que le backend avant d'être comparée à la réponse. `offset` est ajouté à
l'identité vérifiée. Détail complet dans
[VALIDATION section BJ](VALIDATION.md).

Action unique suivante : nouveau contrôle indépendant de `TASK-0034`, par
une instance distincte de l'exécuteur, sur les preuves de cette passe —
notamment que l'invalidation synchrone couvre bien les points nommés par
`ACTION-0053` (saisie et changement de cerveau) sans avoir réintroduit de
régression sur une navigation sans rapport avec la recherche (le garde
conditionnel de `changeProjection`). Aucune `TASK-0035` avant fermeture de
ce verrou.
