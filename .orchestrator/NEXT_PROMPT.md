# NEXT_PROMPT — TASK-0050 corrective finale — preuve multi-cellules avec J12

**TARGET_AGENT:** CLAUDE CODE
**RECOMMENDED_MODEL:** Claude Sonnet 5
**RECOMMENDED_EFFORT:** Medium
**STATUS:** READY
**BRANCH:** `build/v0.2-a34-v1-runtime-legend`

## Objectif unique

Fermer la preuve TASK-0050 sans modifier le produit : compléter les 21 clés
déjà reproductibles avec les deux familles intra prouvées par le scénario J12
existant, rejoué sur le HEAD courant.

Aucune TASK-0051. Aucun Rust/backend.

## 0 — préconditions

1. Applique `AGENTS.md` et les instructions Claude Code.
2. Checkout `build/v0.2-a34-v1-runtime-legend`.
3. Fetch + fast-forward seulement.
4. Arbre propre.
5. Lis ACTION-0087, ACTION-0088, DEC-0048 §K et TASK-0050 §Q.
6. Lis `src/map/relationScenario.ts` et l'artefact historique
   `docs/performance/runs/TASK-0024-J12-intrabrain-relations-regression-webview2.json`.

L'artefact historique sert seulement de référence. La preuve finale doit rejouer
J12 sur le HEAD actuel.

## 1 — conserver la cellule A

Conserve le harnais TASK-0050 actuel et ses acquis : 21 clés réelles, jonction
NTFS, agrégat clavier, révélation récursive, signatures calculées, axe/clavier/
passivité et preuve node-diagnostic séparée.

Ne réécris pas ce qui fonctionne.

## 2 — cellule B : réutiliser J12 actuel

Réutilise `src/map/relationScenario.ts` et le chemin `host.autoRelations`
déjà branché dans MapApp.

Exécute J12 sur le build/HEAD courant dans un vrai WebView2.

Pendant l'étape où J12 rend les relations intra, capture explicitement les
`data-legend-keys` réels et prouve au minimum :

- `intra-suggestion`;
- `intra-approved`;
- classes/primitives réelles;
- suggestion pointillée + anneaux, sans flèche;
- relation APPROVED avec provenance correspondante.

Tu peux ajouter une petite collecte d'évidence au scénario J12 ou à un wrapper
TASK-0050, mais ne change pas le comportement produit de MapApp.

Ne remplace aucun artefact canonique historique. Toute nouvelle preuve appartient
à TASK-0050.

## 3 — union stricte

Dans l'artefact TASK-0050 final, distingue :

- `cellA.observedKeys`;
- `cellB.observedKeys`.

Dérive :

- `legendKeys` depuis la légende réelle;
- `expectedReachable = legendKeys - {node-diagnostic}`;
- `observedUnion = unique(cellA ∪ cellB)`.

Assert :

- legend = 24;
- expectedReachable = 23;
- observedUnion === expectedReachable;
- cellB contient obligatoirement intra-suggestion et intra-approved;
- aucune deuxième exception.

Ne retire aucune clé du contrat pour obtenir PASS.

## 4 — signatures visuelles

Pour les deux clés fournies par J12 :

- classes/primitives communes carte ↔ légende;
- computed styles porteurs de sens réellement comparés;
- divergence = échec.

La cellule A conserve ses assertions actuelles.

## 5 — node-diagnostic

Inchangé : pas de Rust; statut
`NOT_APPLICABLE_WHILE_SCAN_DIAGNOSTICS_ARE_REJECTED`; test déterministe PASS;
invariant commands.rs:745-749 toujours vérifié. Si l'invariant change, STOP.

## 6 — artefact

Publie/remplace seulement :

`docs/performance/runs/TASK-0050-webview2.json`

Il doit indiquer : deux cellules réelles, HEAD testé, clés de chaque cellule,
union = 23/23, légende = 24/24, exception unique node-diagnostic, signatures
PASS, axe/clavier/passivité et P-19 restart NON TESTED.

## 7 — falsifications

Au minimum :

1. enlever intra-suggestion de cellule B -> union échoue;
2. enlever intra-approved -> union échoue;
3. substituer l'ancien artefact historique au replay courant -> preuve refusée;
4. divergence CSS sur une des deux clés -> échec;
5. seconde exception -> échec.

Restaure tout sabotage.

## 8 — validations

Ciblés TASK-0050/J12, pnpm test, pnpm check, pnpm build, Tauri debug, WebView2
cellule A, WebView2/J12 cellule B, axe, git diff --check, audit public.

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

Si J12 actuel ne matérialise plus les deux clés, STOP/BLOCKED avec preuve :
ce serait une régression actuelle à diagnostiquer.
