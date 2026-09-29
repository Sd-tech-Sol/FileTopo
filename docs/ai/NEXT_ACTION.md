# Action suivante

## Décider de la suite de TASK-0050 — deux options, aucune déléguée par défaut

Branche : `build/v0.2-a34-v1-runtime-legend`.

TASK-0050 §T a corrigé la régression J12 (pivot/`selectNode`) et confirmé un
blocage produit **distinct** : `relationSegments()` n'affiche une arête que si
ses deux extrémités sont dans la fenêtre bornée courante
(`hierarchy.byId`), et `brain.relations` n'est jamais recalculé par
`changeProjection`. Aucune arête ne se rend donc jamais pendant le replay
J12, qui sélectionne ses extrémités l'une après l'autre.

Deux options, à trancher avant toute nouvelle exécution :

1. Faire recalculer `brain.relations` par `changeProjection` (ou équivalent)
   — changement de comportement produit, pas nécessairement Rust, mais hors
   périmètre d'une corrective de scénario de test.
2. Revenir à Q.3(b)/R.3(b) : une brique synthétique dédiée où les relations à
   prouver sont les seules arêtes du nœud choisi, pour que la fenêtre bornée
   les contienne nécessairement ensemble.

Aucune option n'est pré-autorisée : GO technique ou GO de Sébastien requis
selon le point d'arrêt concerné avant exécution.

Prompt de référence : `docs/tasks/TASK-0050-v1-runtime-legend-p10.md`
section T.

Aucun Rust/backend, aucune nouvelle fixture, aucune TASK-0051 sans cette
décision.
