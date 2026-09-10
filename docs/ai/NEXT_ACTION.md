# Action suivante

## Contrôle indépendant de TASK-0034, sur preuves de rejeu réel

`TASK-0033` est `VERIFIED` dans sa portée par `ACTION-0051`. `TASK-0034 — V1
Find & Open` est livrée sur `build/v0.2-a18-v1-find-open` : `IMPLEMENTED`,
**jamais auto-`VERIFIED`**. Aucune nouvelle décision requise — `DEC-0031`,
`DEC-0033`, `DEC-0034` inchangées. **Claude Code a exécuté la tâche et ne
peut donc pas rendre le verdict.**

Ce qui a été livré :

- `map_search_nodes` : recherche bornée à 50 résultats, sur
  `Index::query_nodes()` existant (aucun SQL dupliqué), derrière
  `open_store()`, avec `total`/`offset`/`limit`/`indexRevision` publiés.
  Requête vide/blanche → page vide, jamais un dump du corpus.
- `map_reveal_node(reference: BrainNodeRef)` : « Ouvrir dans l'Explorateur »,
  **seul** argument frontend. Chemin relatif lu depuis l'Index, vraie racine
  résolue côté Rust, chaque composante confinée/revalidée
  (`confine_indexed_target`), `explorer.exe` lancé directement, jamais via
  un shell. `query_collection_nodes`/`reveal_indexed_node` du prototype 0.1
  restent non enregistrés.
- Activation d'un résultat de recherche : réutilise `map_view`/
  `changeProjection` et la caméra `VERIFIED` de `TASK-0033` telles quelles.
  Un refresh/rebuild avance la révision et l'interface republie
  automatiquement la recherche plutôt que de garder une page périmée.
- Rejeu **WebView2 réel** sur l'arbre `REAL_ROOT` de 5 206 éléments de
  `TASK-0033` : recherche d'un fichier hors projection ordinaire,
  activation réelle vers une nouvelle projection sélectionnée, invalidation
  de révision après refresh, `map_reveal_node` sur cible synthétique avec
  spawn réussi, aucune fuite de chemin absolu, 0 erreur console fatale.

Action unique suivante : faire contrôler `TASK-0034` par une instance
**distincte de l'exécuteur**, sur preuves, et rendre un verdict.

Ce que ce contrôle doit regarder en priorité :

- que `map_search_nodes`/`map_reveal_node` sont les **seules** nouvelles
  commandes exposées, qu'aucune ancienne commande 0.1 (`query_collection_nodes`,
  `mark_node_seen`, `reveal_indexed_node`) n'a été réenregistrée, et
  qu'aucune permission `shell:`/`fs:`/`opener:`/`dialog:` n'a été ajoutée à
  la capability WebView;
- que `map_reveal_node` ne reçoit strictement qu'un `BrainNodeRef`, sans
  aucun chemin/racine/dossier venant du frontend, et que le chemin absolu
  résolu côté Rust n'apparaît jamais dans un DTO, un journal ou une erreur;
- que la recherche reste bornée à 50 résultats par page et ne lit jamais la
  source (uniquement l'Index canonique);
- que la cohérence de révision est réelle : un ancien résultat de recherche
  ne peut pas être activé silencieusement contre une révision plus récente;
- que rien dans cette passe n'a lu, listé ou touché une donnée personnelle.

Aucune tâche suivante n'est précréée.
