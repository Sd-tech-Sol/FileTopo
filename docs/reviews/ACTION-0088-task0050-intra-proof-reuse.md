# ACTION-0088 — Diagnostic indépendant du dernier écart intra de TASK-0050

- **Date :** 2026-09-28
- **Statut :** `CLOSED — stratégie corrective choisie`
- **Tâche :** `TASK-0050 — V1 Runtime Legend / P-10 Closure`
- **Branche :** `build/v0.2-a34-v1-runtime-legend`
- **HEAD contrôlé :** `15614aaa155272c8daaea067dabde224f4852d46`
- **Verdict :** réutiliser le scénario J12 existant; ne pas instrumenter le produit

## Constat

La passe §Q rend 21/23 clés atteignables de façon reproductible. Les seules
absentes sont `intra-approved` et `intra-suggestion`.

Le code pur n'explique pas leur absence :

- `relationSegments()` ajoute APPROVED et pendingSuggestions dès que les deux
  extrémités sont dans `byId`;
- `MapView` ne contient aucun filtre spécifique qui les exclut;
- `relations.test.tsx` prouve déjà APPROVED + suggestion dans MapView.

## Preuve existante réutilisable

Le dépôt contient déjà `src/map/relationScenario.ts`, déclenché par
`host.autoRelations`.

L'artefact canonique
`docs/performance/runs/TASK-0024-J12-intrabrain-relations-regression-webview2.json`
montre en vrai WebView2 :

- approved = 4;
- pendingSuggestions = 4;
- suggestionEdges = 4;
- suggestionRings = 8;
- une approbation par vraie touche Windows produisant provenance APPROVED.

L'ancien artefact justifie la stratégie mais ne ferme pas TASK-0050 : J12 doit
être rejoué sur le HEAD courant.

## Décision

Preuve finale multi-cellules :

1. cellule A : harnais TASK-0050 actuel, 21 clés réelles;
2. cellule B : replay J12 courant pour intra-suggestion + intra-approved;
3. union A ∪ B = exactement les 23 clés atteignables;
4. node-diagnostic reste l'unique exception ACTION-0087.

Ne pas instrumenter durablement MapApp, ne pas modifier Rust/backend, ne pas
créer une nouvelle fixture tant que J12 suffit. Aucune TASK-0051.
