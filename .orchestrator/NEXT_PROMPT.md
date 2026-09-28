# NEXT_PROMPT — TASK-0050 corrective pass — WebView2 exhaustive coverage

**TARGET_AGENT:** CODEX
**RECOMMENDED_MODEL:** GPT-5.6 Sol
**RECOMMENDED_EFFORT:** Medium
**STATUS:** READY
**BRANCH:** `build/v0.2-a34-v1-runtime-legend`

## Objectif unique

Corriger uniquement les écarts trouvés par **ACTION-0086** sur TASK-0050.
Aucune TASK-0051.

## 0 — préconditions

1. Applique `AGENTS.md` et les instructions Codex du repo.
2. Bascule explicitement sur
   `build/v0.2-a34-v1-runtime-legend`.
3. `git fetch origin`.
4. Synchronise seulement en fast-forward avec
   `origin/build/v0.2-a34-v1-runtime-legend`.
5. Vérifie arbre propre.
6. Lis ACTION-0086 dans `docs/ai/VALIDATION.md` et TASK-0050 §N.
7. Lis DEC-0048, le code actuel de légende, le harnais TASK-0050 et
   l'artefact WebView2 actuel.

STOP/BLOCKED si une précondition est fausse.

## 1 — ne pas refaire ce qui est déjà bon

Conserve :

- contrat TS fermé de 24 clés;
- test riche déterministe 24/24;
- FR/EN et mécanique locale;
- bouton natif / aria-expanded / aria-controls / panneau nommé;
- session-only;
- zéro commande backend par gestes de légende;
- source / Index / journal / resume inchangés;
- P-19 séparée.

Aucun Rust/backend/SQLite/Tauri command attendu.
Aucune nouvelle dépendance.

## 2 — corriger le libellé cross-linked

Le rendu réel `.map-node--cross-linked rect` est actuellement un contour
**solide épaissi unique**, pas un double contour.

Corrige uniquement les textes FR/EN de la légende pour décrire le rendu réel.
N'invente pas une nouvelle apparence pour faire correspondre le texte.

Ajoute/ajuste le test pour verrouiller cette exactitude.

## 3 — preuve WebView2 réelle 24/24

Le défaut principal est la preuve, pas le contrat TypeScript.

Le nouvel harnais doit faire apparaître, à travers une ou plusieurs étapes
réelles du produit dans WebView2, l'union complète des 24 clés :

- root/directory/file/skipped;
- selected/related/linked/cross-linked;
- filter match/context;
- diagnostic;
- focused brain;
- hierarchy normal/touching;
- intra established/suggestion/approved/touching;
- inter crossing/established/suggestion/approved/touching;
- aggregate.

Interdit :

- injecter des faux éléments DOM;
- marquer une clé « couverte » parce qu'elle existe seulement dans la légende;
- compter une relation présente dans un store si MapView ne la rend pas;
- remplacer la preuve WebView2 par le test Vitest déterministe.

Les états peuvent être exercés successivement; l'artefact doit enregistrer
l'union réellement observée sur `.map-view [data-legend-keys]`.

Le harnais doit **assert** que l'union observée est exactement le contrat fermé
attendu et les 24 clés de légende. Une clé manquante doit faire échouer la
preuve.

## 4 — classes / primitives / computed signatures

Pour chacune des 24 clés réellement observées :

- confirmer que l'échantillon de légende réutilise les classes/primitives
  MapView pertinentes;
- comparer réellement les signatures calculées pertinentes carte ↔ légende
  (au minimum propriétés porteuses de sens : stroke width/dash/opacity,
  fill opacity, font weight, etc. selon la famille);
- inclure le parent porteur de classe et le descendant stylé lorsque la règle
  CSS dépend du parent;
- faire échouer le harnais sur divergence.

Ne te contente pas de `sharedClasses.length > 0`.
L'artefact ne doit plus laisser des familles obligatoires
`exercisedOnMap=false`.

## 5 — accessibilité et passivité

Rejoue en WebView2 :

- légende fermée puis ouverte au clavier;
- FR puis EN;
- Enter / Space;
- traversal Tab sans piège;
- axe fermé/ouvert sans nouvelle violation;
- zéro commande backend causée par les gestes de légende;
- source / Index / journal / resume inchangés.

Restart de la légende reste **NON TESTED / P-19**.

## 6 — artefact

Remplace `docs/performance/runs/TASK-0050-webview2.json`.

Il doit permettre au contrôleur indépendant de voir sans ambiguïté :

- 24/24 clés réellement observées sur la carte;
- 24/24 clés de légende;
- égalité de couverture;
- preuves de partage/signatures pour les 24;
- clavier/axe/passivité;
- P-19 NON TESTED.

## 7 — validation

Exécute :

- tests ciblés TASK-0050;
- `pnpm test`;
- `pnpm check`;
- `pnpm build`;
- Tauri debug;
- WebView2 réel;
- axe local;
- `git diff --check`;
- audit public selon la convention du repo.

Falsifie au moins :

1. une clé carte obligatoire non exercée -> WebView2 échoue;
2. une signature de sample divergente -> WebView2 échoue;
3. remettre « double contour » dans le texte -> test ciblé échoue.

Restaure tout sabotage.

## 8 — gouvernance

À la fin :

- TASK-0050 = IMPLEMENTED / candidate contrôle indépendant, jamais auto-VERIFIED;
- F-014 / P-10 restent candidate jusqu'au contrôle ChatGPT;
- P-19 reste PARTIELLE;
- aucune TASK-0051;
- NEXT_ACTION = contrôle indépendant TASK-0050 corrective;
- `.orchestrator/RESULT.md` complet;
- commit + push;
- arbre propre.
