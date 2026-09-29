# NEXT_PROMPT — TASK-0050 corrective finale — FILE-only filtered projection

**TARGET_AGENT:** CLAUDE CODE
**RECOMMENDED_MODEL:** Claude Sonnet 5
**RECOMMENDED_EFFORT:** Medium
**STATUS:** READY
**BRANCH:** `build/v0.2-a34-v1-runtime-legend`

## Objectif unique

Fermer les deux clés intra manquantes par la projection filtrée produit
existante, sans changement produit.

Aucune TASK-0051. Aucun Rust/backend. Aucune nouvelle fixture.

## 0 — préconditions

1. Applique `AGENTS.md` et les instructions Claude Code.
2. Checkout `build/v0.2-a34-v1-runtime-legend`.
3. Fetch + fast-forward seulement.
4. Arbre propre.
5. Lis ACTION-0089, ACTION-0090, TASK-0050 §§T-U.
6. Lis `src/map/filters.ts`, `src/map/useProjectionFilter.ts`,
   `src-tauri/src/map/filtered_projection.rs`.

## 1 — conserver les acquis

Ne modifie pas le produit.

Conserve :

- corrections J12 ACTION-0089;
- preuve node-diagnostic séparée;
- signatures calculées;
- node-skipped réel;
- axe/clavier/passivité;
- toutes les 21 clés déjà fermées.

## 2 — corriger le défaut FILE-only

Dans `scripts/task0050-webview2.mjs`, la section actuellement commentée
« Files are matches » est fausse : à partir de `DEFAULT_FILTER.kinds=[]`,
cliquer DIRECTORY puis SKIPPED produit DIRECTORY+SKIPPED.

Après avoir remis `brain-alpha` au premier plan :

- assure-toi que le filtre de ce cerveau part bien de l'état attendu;
- active **FILE seulement** par les contrôles produit;
- n'active ni DIRECTORY ni SKIPPED;
- attends la projection filtrée acceptée et le rendu stabilisé.

Ne simule pas la projection et n'injecte pas de DOM.

## 3 — prouver les endpoints avant les clés

À partir des objets réels déjà lus :

- choisis une relation `APPROVED` de `intra.established`;
- choisis une `pendingSuggestion`.

Après FILE-only, assert explicitement que :

- source + target de l'APPROVED sont tous deux présents dans
  `.map-view [data-brain-id=alpha][data-node-id=...]`;
- source + target de la suggestion sont tous deux présents simultanément.

Enregistre dans l'artefact les paths/nodeIds et ce résultat.

Si un endpoint manque, STOP/BLOCKED avec :

- filtre courant exact;
- nodeIds/paths attendus;
- nodeIds/paths réellement matérialisés;
- page/filteredTotal/materializedMatchCount.

Ne change pas le produit dans ce cas.

## 4 — capturer les deux clés

Si les endpoints coexistent :

- attends `intra-approved`;
- attends `intra-suggestion`;
- appelle la même capture de signature que pour les autres clés;
- vérifie les signatures carte ↔ légende;
- suggestion : pointillé + anneaux, pas de flèche;
- approved : provenance/classe approuvée.

## 5 — restaurer la règle stricte

Supprime la logique d'exemption temporaire :

`CELL_B_ONLY_KEYS = ["intra-approved", "intra-suggestion"]`.

La cellule A doit désormais exiger directement :

- legend = 24;
- expectedReachable = legend - node-diagnostic = 23;
- observed real map keys === expectedReachable;
- aucune autre exception.

Le replay J12 peut rester comme regression replay séparé, mais TASK-0050 ne
doit plus en dépendre si la cellule A ferme 23/23.

Le combineur multi-cellules devient inutile si la cellule A réussit :
nettoie la plomberie TASK-0050 devenue morte plutôt que de conserver deux
sources de vérité.

## 6 — artefact final

Si et seulement si la cellule A atteint 23/23 :

- publie/remplace `docs/performance/runs/TASK-0050-webview2.json`;
- l'artefact doit provenir du HEAD courant;
- 23/23 atteignables;
- légende 24/24;
- node-diagnostic unique exception documentée;
- signatures PASS;
- axe/clavier/passivité;
- P-19 restart NON TESTED.

Ne réutilise pas l'ancien artefact TASK-0050 déjà présent comme preuve :
il est antérieur à cette corrective et doit être remplacé par le run courant.

## 7 — falsifications

Au minimum :

1. remettre DIRECTORY+SKIPPED -> les deux clés intra doivent manquer / gate échouer;
2. retirer FILE -> gate échoue;
3. retirer un endpoint attendu de la preuve -> gate échoue;
4. supprimer intra-approved -> gate 23/23 échoue;
5. supprimer intra-suggestion -> gate 23/23 échoue.

Restaure tout sabotage.

## 8 — validations

- ciblés TASK-0050;
- `pnpm test`;
- `pnpm check`;
- `pnpm build`;
- Tauri debug;
- WebView2 réel cellule A;
- axe;
- `git diff --check`;
- audit public.

## 9 — gouvernance

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

Si FILE-only n'aboutit pas, STOP/BLOCKED avec la preuve d'endpoints demandée;
aucun changement produit sans nouvelle décision.
