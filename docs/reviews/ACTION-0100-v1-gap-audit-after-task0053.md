# ACTION-0100 — Audit V1 frais après TASK-0053

- **Date :** 2026-10-07
- **Statut :** `CLOSED — prochaine tranche choisie`
- **Base auditée :** `befd86a73216131eae9675961a758c1df73bffa1`
- **Prérequis :** `TASK-0053 / F-052 / M-1 / P-19` VERIFIED/CLOSED par `ACTION-0099`
- **Branche de la prochaine tranche :** `build/v0.2-a38-v1-scale-closure`

## 1. Sources de vérité relues

Audit réalisé contre l'état GitHub réel après ACTION-0099 :

- `docs/product/REQUIREMENTS_BASELINE.md`;
- `docs/product/FEATURE_MATRIX.md`;
- `docs/product/CARTETOPO_FUNCTIONAL_PARITY.md`;
- `docs/architecture/PROGRESSIVE_SCALE_ARCHITECTURE.md`;
- `DEC-0029`, `DEC-0031`;
- `TASK-0028 / ACTION-0045`;
- `TASK-0030 / ACTION-0047`;
- `TASK-0032 / ACTION-0049`;
- `TASK-0036 / ACTION-0060`;
- `TASK-0052 / ACTION-0097`;
- `TASK-0053 / ACTION-0099`;
- état, handoff et validation courants.

Aucun statut historique n'est pris comme vrai sans retrouver son contrôle
indépendant ou son contrat courant.

## 2. Réconciliation des faux gaps historiques

Plusieurs textes de la matrice conservent volontairement des constats d'époque.
Ils ne constituent plus des bloqueurs produit :

- `F-001` : vraie racine locale livrée par `TASK-0032`, VERIFIED par
  `ACTION-0049`;
- `F-004` : fondation d'identité stable VERIFIED par `ACTION-0060`;
- `F-007/F-008/F-016` : topographie à nœuds et hiérarchie réelle VERIFIED par
  `TASK-0022 / ACTION-0036`;
- `F-042` : CLOSED / VERIFIED par `ACTION-0097`;
- les mentions « P-19 reste partielle » antérieures à ACTION-0099 sont
  historiques : `P-19 = CLOSED / VERIFIED`.

Ces formulations devront être réconciliées lors de la passe documentaire
finale, mais elles ne justifient pas de recoder ces fonctions.

## 3. Fonctions hors MVP

Ne bloquent pas V1 :

- `F-021`, `F-037`, `F-038`, `F-039`, `F-047` = `DIFFÉRÉ`;
- `F-048`, `F-049` = `ULTÉRIEUR`, ensemble permission/mode équipe.

Aucune d'elles ne devient TASK-0054.

## 4. Vrais gaps MVP restants

### A. F-050 + F-051 — P0, paire indivisible

Le contrat courant les classe toutes deux **MVP / P0**.

`REQUIREMENTS_BASELINE` dit explicitement que :

- F-050 matérialise une vue bornée au lieu de rendre le corpus;
- F-051 est la contrepartie de véracité : les éléments non rendus doivent être
  comptés exactement et rester atteignables;
- les deux se livrent **ensemble ou pas du tout**.

État réel :

- `TASK-0030 / ACTION-0047` a VERIFIED la convergence synthétique :
  Index canonique unique, projection bornée, layout de vue seulement,
  agrégats directs exacts;
- mais `ACTION-0047` maintient explicitement :
  `F-050 = IMPLEMENTED, pas VERIFIED globalement` et
  `F-051 = IMPLEMENTED, pas VERIFIED globalement`;
- le contrat global restant exige l'acceptance 10k/100k/1M, l'intégration au
  vrai flux V1, l'absence de whole-graph IPC, l'atteignabilité, la véracité des
  agrégats et le fonctionnement de base sans dépendance GPU/WebGL.

Le vieux spike `TASK-0028` est réutilisable mais insuffisant : son banc était
un i9-9900K / 31,9 Gio / RTX 2070 classé
`DEVELOPMENT_BENCH_NOT_ACCEPTANCE`; son passage WebView2 GPU-disabled n'avait
pas prouvé que le flag était effectivement appliqué.

### B. F-046 — P1, MVP

Toujours réellement ouvert pour la distinction persistante « même objet
physique » versus « contenu binaire identique ».

Les sous-capacités de contenu exact et exploration sont déjà VERIFIED par
`TASK-0023/ACTION-0039` et `TASK-0026/ACTION-0043`.

F-046 est indépendant de F-050/F-051.

## 5. Ordre décidé

**F-050 + F-051 passent avant F-046.**

Motifs :

1. elles sont `P0`, contre `P1` pour F-046;
2. elles sont une condition de véracité de la représentation à grande échelle;
3. le contrat dit « ensemble ou pas du tout »;
4. la majorité du code existe déjà : le besoin est d'abord une fermeture
   produit/acceptance et de petites corrections ciblées si la preuve révèle un
   défaut, pas une nouvelle architecture;
5. fermer F-046 avant elles laisserait malgré tout une V1 avec deux fonctions
   P0/MVP non VERIFIED globalement.

L'ordre historique « F-046 après P-19 » n'est donc pas appliqué
mécaniquement : le présent audit a retrouvé un bloc P0 plus prioritaire.

## 6. Reuse-first

TASK-0054 doit réutiliser avant tout :

- `Index`, `BrainIndex`, `map_view`, `materialize_view`;
- `VIEW_BUDGET=512` et le budget matériel existant;
- `ViewAggregate` et les comptes directs exacts;
- `children_page`, recherche bornée et résolution de nœud;
- `MapApp`, `MapView`, branch focus/collapse de TASK-0052;
- le vrai flux `REAL_ROOT` de TASK-0032;
- les harness/tests de TASK-0028 et TASK-0030;
- les harness CDP/WebView2/axe actuels.

**Aucune nouvelle bibliothèque, aucun nouveau renderer, aucun nouveau store et
aucune copie du corpus ne sont justifiés par défaut.**

Pour le test sans accélération GPU, le mécanisme officiel WebView2 permet les
browser flags via `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS`; le flag
`--disable-gpu` désactive l'accélération matérielle. La preuve doit aussi
vérifier que l'exécution observée correspond bien à cette configuration, et ne
pas se contenter d'avoir défini la variable.

Référence officielle :
https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/webview-features-flags

## 7. Ce que TASK-0054 doit fermer

Créer :

**TASK-0054 — V1 Progressive Scale & Exact Aggregate Global Closure / F-050 + F-051**

Objectif : rendre F-050 et F-051 candidates à VERIFIED globalement sur le
runtime V1 courant, sans réarchitecture.

La tâche doit distinguer :

- preuve structurelle à 10k/100k/1M indexés;
- preuve produit réelle WebView2 sur corpus borné mais représentatif;
- vraie racine temporaire/synthétique, jamais donnée personnelle;
- « fonctionne sans GPU matériel » de toute promesse de performance commerciale
  sur un laptop précis.

Le million est une cible d'Index/projection synthétique, **pas** un million de
fichiers physiques.

## 8. Après TASK-0054

Si le contrôle indépendant ferme F-050/F-051 :

1. refaire un audit V1;
2. réévaluer F-046;
3. une fois les derniers gaps fonctionnels MVP fermés, exécuter un audit final
   de parité/release, notamment les clôtures formelles P-01..P-03/P-22 et les
   statuts documentaires périmés.

Aucune TASK-0055 maintenant.
