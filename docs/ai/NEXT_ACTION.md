# Action suivante

## Contrôle indépendant de TASK-0034 (passe corrective 3)

`TASK-0034 — V1 Find & Open` reste `IMPLEMENTED`, **pas encore `VERIFIED`**.

La passe corrective 3, écrite dans `.orchestrator/NEXT_PROMPT.md` et livrée
le 2026-09-11, ferme le dernier verrou trouvé par
[`ACTION-0054`](../reviews/ACTION-0054-independent-recontrol.md) :
`removeBrain()` (transfert de focus quand le cerveau focalisé est retiré)
et `navigateCross` (composition focalisée sur un cerveau pas encore
affiché) passaient par la porte commune `applyComposition(next, ...)` sans
jamais passer par les trois handlers (`onFocusBrain`, `selectNode`,
`changeProjection`) que la passe précédente avait protégés. Un garde
unique, à la frontière commune d'`applyComposition` — invalidation
synchrone dès que `current.focusedBrainId !== next.focusedBrainId`, avant
le premier `await` — couvre désormais toute transition de composition,
présente ou future, qui change réellement le focus. Détail complet dans
[VALIDATION section BK](VALIDATION.md).

Action unique suivante : nouveau contrôle indépendant de `TASK-0034`, par
une instance distincte de l'exécuteur, sur les preuves de cette passe —
notamment que le garde central d'`applyComposition` couvre bien
`removeBrain`/`navigateCross` sans avoir réintroduit de régression sur une
transition à focus identique (Ouvrir/Actualiser/Reconstruire, ajout d'un
cerveau). Aucune `TASK-0035` avant fermeture de ce verrou.
