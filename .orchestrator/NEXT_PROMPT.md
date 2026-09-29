# NEXT_PROMPT — TASK-0050 corrective J12 — navigation bornée actuelle

**TARGET_AGENT:** CLAUDE CODE
**RECOMMENDED_MODEL:** Claude Sonnet 5
**RECOMMENDED_EFFORT:** Medium
**STATUS:** READY
**BRANCH:** `build/v0.2-a34-v1-runtime-legend`

## Objectif unique

Faire fonctionner la cellule B J12 sur le runtime borné actuel en réutilisant
la navigation produit existante, puis fermer la preuve multi-cellules 23/23.

Aucune TASK-0051. Aucun Rust/backend. Aucune nouvelle fixture.

## 0 — préconditions

1. Applique `AGENTS.md` et les instructions Claude Code.
2. Checkout `build/v0.2-a34-v1-runtime-legend`.
3. Fetch + fast-forward seulement.
4. Arbre propre.
5. Lis ACTION-0087, ACTION-0088, ACTION-0089, DEC-0048 §K et TASK-0050 §§Q-S.
6. Lis :
   - `src/map/relationScenario.ts`;
   - `src/map/MapApp.tsx` autour de `changeProjection`, `selectNode`,
     `runRelationScenario`;
   - `src-tauri/src/map/brain_index.rs::snapshot`;
   - `src-tauri/src/map/projection.rs::materialize_view`.

## 1 — ne pas toucher la cellule A

Conserve `scripts/task0050-webview2.mjs` tel qu'il est sauf bug nouveau
démontré par un run.

Il doit continuer de fournir exactement 21 clés réelles, avec gap exact :

`[intra-approved, intra-suggestion]`.

## 2 — réparer la résolution du pivot J12

Dans `relationScenario.ts` :

- garde `map_snapshot` si nécessaire pour les métadonnées de preuve;
- ne cherche plus `PIVOT_PATH` dans `snapshot.nodes`;
- utilise la commande produit existante :

`map_resolve_node({ brainId: BRAIN, relativePath: PIVOT_PATH })`.

Exige une `BrainNodeRef` non nulle et cohérente avec `BRAIN`.

Aucune lecture directe SQLite, aucun nouvel endpoint backend.

## 3 — utiliser la navigation produit, pas le setter React brut

Aujourd'hui MapApp passe :

`setSelected: (reference) => setSelected(reference)`.

C'est obsolète sous DEC-0034, car cela saute la logique :

`selectNode -> changeProjection -> map_view(focusId)`.

Corrige le câblage du scénario pour injecter la navigation produit existante
`selectNode`.

Préférence : renommer explicitement la dépendance du scénario en
`selectNode` pour éviter qu'un futur mainteneur remette un setter brut par
erreur.

Dans `runRelationScenario`, après chaque sélection pouvant viser un nœud hors
projection :

- appelle `selectNode(reference)`;
- attends avec `waitUntil` que le nœud existe dans
  `.map-view [data-brain-id=...][data-node-id=...]`;
- attends aussi son état sélectionné / aria-activedescendant cohérent avant
  de lire le panneau ou les relations.

Ne copie PAS la logique d'agrégat de cellule A.

## 4 — conserver les gestes J12

Conserve :

- vraie touche Windows pour traverser une relation;
- vraie touche Windows pour approuver la suggestion;
- aucun click synthétique de remplacement;
- preuves isTrusted / noProgrammaticActivationUsed.

La corrective adapte seulement l'accès à une projection bornée.

## 5 — preuves TASK-0050 cellule B

Le replay courant doit effectivement produire :

- `intra-suggestion` dans les `data-legend-keys` live;
- `intra-approved` après approbation réelle;
- signatures live correspondantes;
- aucune dépendance à l'ancien artefact canonique.

Le lanceur J12 supprime déjà son replay non protégé avant chaque run : conserve
cette garde afin qu'un fichier stale ne puisse jamais être accepté.

## 6 — union finale

Rejoue :

1. cellule A;
2. J12 cellule B;
3. `scripts/task0050-combine-webview2.mjs`.

Le combineur doit continuer d'asserter :

- légende 24/24;
- expectedReachable 23;
- cellule B contient intra-approved + intra-suggestion;
- union A ∪ B === expectedReachable;
- seule exception = node-diagnostic;
- signatures CSS égales.

## 7 — artefact

Si et seulement si tout passe, publie :

`docs/performance/runs/TASK-0050-webview2.json`.

L'artefact doit refléter le HEAD courant testé et les deux cellules réelles.

Ne modifie aucun artefact canonique VERIFIED historique.

## 8 — falsifications

Au minimum :

1. repasser J12 au setter `setSelected` brut -> cellule B doit échouer sur
   le pivot hors projection;
2. résoudre le pivot seulement dans `snapshot.nodes` -> échec;
3. retirer intra-suggestion du replay -> combineur échoue;
4. retirer intra-approved -> combineur échoue;
5. fournir un vieux replay J12 stale -> le lanceur doit le supprimer/refuser.

Restaure tout sabotage.

## 9 — validations

- ciblés relationScenario/TASK-0050;
- `pnpm test`;
- `pnpm check`;
- `pnpm build`;
- Tauri debug;
- cellule A WebView2;
- cellule B J12 réel;
- combineur;
- axe;
- `git diff --check`;
- audit public.

## 10 — gouvernance

Si tout passe :

- TASK-0050 = IMPLEMENTED / candidate contrôle indépendant;
- F-014 / P-10 = IMPLEMENTED / candidate;
- jamais auto-VERIFIED;
- P-19 reste PARTIELLE;
- aucune TASK-0051;
- NEXT_ACTION = contrôle indépendant TASK-0050;
- RESULT complet;
- commit + push;
- arbre propre.

Si J12 échoue encore après avoir réellement utilisé `selectNode`, STOP avec
la preuve exacte; ne change pas Rust et ne crée pas une nouvelle fixture sans
nouvelle décision d'orchestration.
