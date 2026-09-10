# Action suivante

## TASK-0034 — V1 Find & Open

`TASK-0033 — V1 Progressive Topographic UX` est **VERIFIED dans sa portée** par `docs/reviews/ACTION-0051-independent-recontrol.md`.

Le cœur topographique est maintenant borné et testé en WebView2 sur un corpus synthétique de 5 206 éléments. La prochaine lacune V1 la plus directement utile est de pouvoir **retrouver rapidement un élément dans un gros Index puis l'ouvrir dans l'Explorateur Windows**, sans parcourir manuellement toutes les branches.

Audit de réutilisation déjà établi :

- `Index::query_nodes()` existe et fournit déjà une recherche nom/chemin bornée et paramétrée;
- l'ancien `query_collection_nodes` prouve l'ancienne intégration, mais dépend du `Registry` 0.1 et ne doit pas être réactivé;
- l'ancien `reveal_indexed_node` et `resolve_indexed_target` contiennent la logique Windows utile, mais dépendent eux aussi de l'ancien `Registry` et ne doivent pas être exposés tels quels;
- la nouvelle intégration doit passer exclusivement par le `BrainIndex` canonique et une identité `BrainNodeRef` (`brain_id + node_id`), avec résolution du chemin absolu uniquement côté Rust;
- aucun chemin absolu ne doit entrer dans une commande frontend ni revenir au WebView.

Action unique suivante : préparer et exécuter `TASK-0034` sur une nouvelle branche dédiée. La tranche doit réutiliser les primitives existantes, ajouter une recherche locale bornée dans le cerveau actif/focalisé, permettre de focaliser un résultat hors projection, puis ajouter « Ouvrir dans l'Explorateur » au panneau de détails via une commande Rust sûre basée sur `BrainNodeRef`.

Pas de watcher, FTS5, index parallèle, shell frontend, permission filesystem frontend, cloud ou nouveau renderer dans cette tranche.