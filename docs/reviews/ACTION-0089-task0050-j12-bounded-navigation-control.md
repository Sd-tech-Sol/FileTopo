# ACTION-0089 — Contrôle indépendant de TASK-0050 §R

- **Date :** 2026-09-28
- **Statut :** `CLOSED — corrective ciblée choisie`
- **Tâche :** `TASK-0050 — V1 Runtime Legend / P-10 Closure`
- **Branche :** `build/v0.2-a34-v1-runtime-legend`
- **HEAD contrôlé :** `070421eeea7562736a931766c9192c06de0562ec`
- **Verdict :** cellule A acceptable en l'état; cellule B échoue parce que J12 contourne la navigation bornée actuelle

## Contrôle indépendant

### Cellule A

Le code du harnais est désormais cohérent avec la stratégie multi-cellules :

- écart explicitement fermé à exactement
  `[intra-approved, intra-suggestion]`;
- toute clé inattendue fait échouer;
- signatures calculées carte ↔ légende réellement assertées pour les 21 clés;
- `node-diagnostic` reste prouvé séparément;
- aucun fichier produit modifié par la cellule A.

La revendication « reproduit deux fois » reste une preuve d'exécuteur tant que
le résultat final combiné n'est pas publié. Aucun VERIFIED n'est accordé ici.

### Cellule B / J12

Le blocage est réel, mais sa cause est plus précise que « la vue bornée casse J12 ».

- `BrainIndex::snapshot()` appelle `materialize_view(self, None, None)` :
  la racine et ses enfants directs seulement dans cette fixture.
- `relationScenario.ts` cherche encore `PIVOT_PATH` directement dans
  `snapshot.nodes`.
- Le produit possède déjà la bonne navigation moderne :
  `MapApp.selectNode()` détecte qu'un nodeId n'est pas dans
  `hierarchy.byId` et appelle `changeProjection(brainId, nodeId)`.
- Or `runRelationScenario` reçoit actuellement le setter React brut
  `setSelected`, ce qui contourne précisément cette navigation.
- Le backend expose déjà `map_resolve_node(brainId, relativePath)`, utilisé
  ailleurs par le produit pour résoudre un nœud hors fenêtre.

## Décision

Ne pas créer une nouvelle fixture et ne pas modifier Rust/backend.

Corriger J12 pour qu'il utilise le chemin produit actuel :

1. résoudre `PIVOT_PATH` via `map_resolve_node`, pas via
   `snapshot.nodes.find(...)`;
2. injecter dans J12 la navigation produit `selectNode` plutôt que le setter
   brut `setSelected`;
3. après sélection d'un nœud hors fenêtre, attendre explicitement que le nœud
   soit matérialisé et sélectionné avant de poursuivre;
4. garder toutes les activations réelles de J12;
5. rejouer cellule A + J12 cellule B + combineur;
6. publier `TASK-0050-webview2.json` seulement si l'union réelle vaut 23/23.

Cette correction adapte le scénario de test à DEC-0034 sans modifier le
comportement produit normal.

Aucune TASK-0051.
