# Action suivante

## Arbitrer le gap trouvé par TASK-0056 — les relations sur une racine réelle

`TASK-0056` est **`BLOCKED`**. Branche :
`build/v0.2-a40-v1-final-parity-acceptance`.

**Le gap, en une phrase :** sur un cerveau `REAL_ROOT`, les trois lectures dont
la surface des relations a besoin — `map_relations_open`,
`map_relations_for_node`, `map_relations_review_queue` — passent par
`BrainRecord::source_fixture()`, qui refuse une racine réelle avec
`map_source_not_synthetic`; le panneau rend sa forme « indisponible », alors que
le moteur déterministe répond sur le même cerveau.

**Pourquoi c'est bloquant :** depuis `DEC-0033` A, une racine réelle est la
seule façon dont l'arborescence d'une personne entre dans FileTopo. `P-04`,
`P-05` et `P-07` sont donc inatteignables pour les données de l'utilisateur,
ce que le contrat de parité §3 règle 2 assimile à leur suppression.

**Le contre-argument, pour que l'arbitre l'ait :** le contrat dit qu'un critère
est vérifiable sur fixtures synthétiques, et la campagne l'a vérifié là — la
surface fonctionne entièrement sur un cerveau `SYNTHETIC_FIXTURE`.

À lire :

- `docs/product/PARITY_MATRIX_P01_P22.md` — la matrice et les trois verdicts
  `GAP`;
- `docs/tasks/TASK-0056-v1-final-parity-acceptance.md` §11 — le résultat
  d'exécution;
- `docs/performance/runs/TASK-0056-p22-webview2.json` — champ `productGaps`,
  l'observation dans le vrai moteur.

**Décision attendue :** la correction appartient à une **tâche séparée**.
`TASK-0056` ne touche aucun code produit, et la pureté du diff est prouvée.

L'étape **A** reste **`EN COURS`**. Aucune `TASK-0057` n'est créée. Ni B, ni C,
ni D.
