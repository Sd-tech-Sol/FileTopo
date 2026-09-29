# ACTION-0090 — Contrôle indépendant de TASK-0050 §T

- **Date :** 2026-09-29
- **Statut :** `CLOSED — défaut de harnais identifié`
- **Tâche :** `TASK-0050 — V1 Runtime Legend / P-10 Closure`
- **Branche :** `build/v0.2-a34-v1-runtime-legend`
- **HEAD contrôlé :** `a6e3e6d7fcf226d9cb6158ed43e2597b0f121754`
- **Verdict :** ne pas modifier le produit; corriger le filtre de la cellule A

## Contrôle

La corrective ACTION-0089 est correcte :

- J12 résout maintenant le pivot par `map_resolve_node`;
- J12 reçoit `MapApp.selectNode`, pas le setter brut;
- la matérialisation DOM est attendue explicitement;
- le replay J12 atteint le panneau, la traversée réelle et l'approbation réelle.

Le constat « zéro arête dans J12 centré sur un fichier » est réel, mais il
n'établit pas que les deux familles intra sont inatteignables dans le produit.

## Défaut de harnais trouvé

`DEFAULT_FILTER` vaut :

`{ state: "ALL", kinds: [], availability: "ALL" }`.

Dans `scripts/task0050-webview2.mjs`, la section commentée
« Files are matches » fait pourtant :

- toggle `DIRECTORY`;
- toggle `SKIPPED`.

Depuis un tableau `kinds: []`, cela produit donc le filtre
`[DIRECTORY, SKIPPED]` — **pas FILE**.

La cellule A exclut ainsi précisément les nœuds fichiers qui portent les
relations intra gelées.

Or `filtered_projection.rs` matérialise une page de matches à travers tout le
cerveau et ajoute leurs ancêtres comme contexte. La fixture `brain-alpha`
est petite : une vue `FILE` doit pouvoir faire coexister les fichiers de
plusieurs branches et leurs ancêtres dans la même projection bornée.

## Décision

Avant tout changement produit :

1. sur `brain-alpha`, activer **FILE seulement** depuis le filtre par défaut;
2. attendre la projection filtrée réelle;
3. vérifier explicitement que les deux endpoints d'au moins une relation
   APPROVED et d'une suggestion pending sont simultanément dans le DOM;
4. capturer `intra-approved` et `intra-suggestion`;
5. restaurer la règle stricte : la cellule A seule doit atteindre 23/23;
6. supprimer l'exemption `CELL_B_ONLY_KEYS`;
7. si cela passe, le replay J12 n'est plus requis pour la preuve TASK-0050.

Si FILE-only ne matérialise pas les endpoints attendus, STOP avec la liste
exacte des nodeIds/paths présents; ne pas modifier le produit sans nouvelle
décision.

Aucun Rust/backend. Aucune nouvelle fixture. Aucune TASK-0051.
