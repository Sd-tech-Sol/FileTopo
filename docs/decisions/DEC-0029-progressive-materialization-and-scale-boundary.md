# DEC-0029 — Matérialisation progressive et frontière d'échelle

- **Date :** 2026-09-06
- **Statut :** `APPROVED` — décision produit et architecture **enregistrée**,
  **jamais prouvée comme performance**. Aucune de ses cibles n'est mesurée.
- **Phase :** étape A — réalignement d'architecture avant la mise à l'échelle
- **Décideur :** orchestrateur technique, par le GO explicite de
  `.orchestrator/NEXT_PROMPT.md`, sous la délégation d'`AGENTS.md`
- **Rédacteur :** Claude Code, agent d'exécution
- **Enregistrée par :**
  [`TASK-0027`](../tasks/TASK-0027-progressive-scale-architecture-realignment.md),
  `IMPLEMENTED`, en attente de contrôle indépendant
- **Contrôle indépendant :** **requis, non encore effectué**
- **Document d'architecture :**
  [`PROGRESSIVE_SCALE_ARCHITECTURE.md`](../architecture/PROGRESSIVE_SCALE_ARCHITECTURE.md)
- **replaced_by :** —

## Contexte

FileTopo a été réévalué à grande échelle. L'architecture livrée jusqu'ici
raisonne sur un plan unique : ce qui existe dans le cerveau est ce qui est
disposé, puis rendu. `MAX_NODES_PER_MAP = 5_000`, dans
`src-tauri/src/map/mod.rs`, matérialise cette logique : au-delà du plafond, la
carte est **refusée**. C'est une borne de sécurité correcte pour les tranches
qui l'ont posée, et une **impasse produit** pour un cerveau de 100 000 ou de
1 000 000 d'éléments.

Le contrat de parité l'exige d'ailleurs déjà à cette échelle : `P-08` demande
une recherche exacte et paginée sur **100 000 nœuds synthétiques**, et `P-18`
une mise à jour incrémentale mesurée jusqu'à **100 000 nœuds**. Rien dans le
produit ne peut satisfaire ces exigences si « exister » et « être rendu » sont
la même chose.

Le but fondamental **ne change pas** : application de bureau locale, légère,
généraliste, pensée notamment pour de très grands cerveaux numériques et des
environnements documentaires d'entreprise, utilisable sur un laptop ou PC
ordinaire **sans GPU puissant**, sans LLM, sans API infonuagique, sans compte
et sans envoi de documents.

Deux projets tiers ont été observés pendant cette réévaluation. La décision les
tranche explicitement plus bas, en `G` et `H`, pour qu'aucune lecture future ne
puisse les prendre pour une dépendance.

## Décision

### A — corpus, graphe logique, vue matérialisée et rendu sont quatre plans distincts

> **FileTopo indexe grand, matérialise petit, et ne rend que le contexte
> utile.**

- Le **corpus complet** vit dans l'**index local durable** — SQLite et stores
  FileTopo.
- Le **graphe logique** — nœuds, hiérarchie, relations, provenances, états —
  existe **dans les données**, jamais dans le SVG, le DOM ou le canvas.
- Le **frontend ne reçoit qu'une vue matérialisée bornée**. Aucun contrat, ni
  présent ni futur, ne sérialise un **whole-graph JSON** vers l'interface.
- La **taille totale du cerveau ne doit pas entraîner proportionnellement la
  même charge de rendu**. Une croissance du rendu proportionnelle au corpus est
  un **échec d'architecture**.

**Unité de compte gelée :** `1 élément indexé` = `1 entité accessible`, et
**non** `1 carte simultanément rendue`.

**`MAX_NODES_PER_MAP = 5000` est une limite de tranche historique, pas une
limite produit de corpus.** Un futur **budget de matérialisation et de
remplissage de vue** remplace la logique « tout rendre ou refuser ». Cette
décision **ne modifie pas** la constante : `TASK-0027` est documentaire.

La chaîne cible est celle de
[`PROGRESSIVE_SCALE_ARCHITECTURE.md §3`](../architecture/PROGRESSIVE_SCALE_ARCHITECTURE.md) :
sources en lecture seule → index complet → graphe logique → query engine borné
→ progressive materializer → sous-graphe et agrégats → layout de cette vue
seulement → renderer borné.

### B — la navigation progressive devient une primitive, et `F-042` monte au MVP

Le coût suit le **contexte courant**. Une vue matérialisée peut porter le focus
courant, les ancêtres nécessaires, les enfants utiles paginés, les frères
pertinents, les relations sélectionnées et des agrégats.

**`F-042 — repli/dépli et focus de branche` passe d'`ULTÉRIEUR` à `MVP`.** Le
motif est nouveau et il est écrit : sous une architecture progressive, replier,
déplier et focaliser cessent d'être des conforts d'interface pour devenir les
**gestes qui déterminent le contenu de la vue matérialisée** — donc à la fois
une **primitive de navigation** et une **primitive de performance**. Ses
critères d'acceptation d'origine sont **conservés sans affaiblissement**.

### C — les agrégats et méta-nœuds sont une capacité produit nommée

Une capacité explicite est ajoutée à la matrice pour représenter un
sous-ensemble **réel mais non matérialisé**, **sans mentir**.

Quatre natures **ne se confondent jamais** :

| Nature | Ce que c'est |
|---|---|
| **Dossier / hiérarchie réelle** | Un **fait source** |
| **Agrégat / méta-nœud FileTopo** | Un **résumé calculé exact** d'éléments cachés de la vue |
| **Communauté calculée** *(future, éventuelle)* | Une **classification dérivée** |
| **Suggestion** | Une **hypothèse non établie** |

Un agrégat porte un **compte exact** — jamais une estimation, jamais un
« 999+ » — et une **provenance ou raison de regroupement**. Il reste
expansible. **Il ne devient jamais un faux dossier** : il n'apparaît dans aucun
chemin, n'est pas copiable comme chemin, n'est pas ouvrable dans l'Explorateur,
et ne crée aucune arête.

### D — le query engine borné est une primitive d'architecture

Sont documentées comme primitives : **enfants**, **ancêtres**, **voisinage
relationnel**, **chemin entre nœuds**, **recherche**, **filtres** et
**agrégats** — toutes **bornées, paginées et cursorisées côté Rust/SQLite**.

Trois règles dures : le frontend ne reçoit **jamais** un whole-graph JSON;
toute collection renvoyée est **bornée et paginée**, à curseur stable et ordre
déterministe; les **comptes sont calculés côté cœur privilégié**, jamais
dérivés de ce que le frontend a reçu.

**Aucune API finale n'est inventée ici.** Seuls les contrats conceptuels et les
bornes sont fixés. L'IPC étroit, typé, validé, en identifiants seulement, de
[`ARCHITECTURE_BASELINE.md §2`](../architecture/ARCHITECTURE_BASELINE.md) reste
inchangé.

### E — le layout reste valide dans sa portée, et aucun renderer n'est choisi

`layered-tree-cards-v1` — [`DEC-0024`](DEC-0024-deterministic-layered-node-card-layout.md) —
**reste une preuve valide pour une vue bornée**. Ce qui change : il **ne doit
plus être calculé comme une obligation sur tout le corpus**; il s'applique à la
vue matérialisée, après le materializer.

**Aucun renderer final n'est retenu.** React Flow, ELK, Sigma, Cytoscape et
Pixi restent des **candidats futurs à benchmarker**, dans une tranche dédiée.

**Le fonctionnement de base ne peut pas dépendre d'un GPU puissant ni de
WebGL.** Une accélération GPU peut devenir une **option** plus tard;
l'expérience fonctionnelle doit rester possible sur une machine modeste, et le
moyen de cette possibilité est le **budget de vue**.

### F — hachage et analyses lourdes à grande échelle

Les observations `sha256-v1` de [`DEC-0025`](DEC-0025-exact-content-observation-boundary.md)
et [`DEC-0028`](DEC-0028-exact-duplicate-query-boundary.md), vérifiées par
`TASK-0023 / ACTION-0039` et `TASK-0026 / ACTION-0043`, **restent entières**.
Leur **déclenchement** est précisé :

- **métadonnées et index structurel** = **chemin automatique principal**;
- **hachage de contenu** = **campagne explicite**, en arrière-plan, sur
  **périmètre sélectionnable**;
- **aucun hachage automatique d'un cerveau d'un million de fichiers à
  l'ouverture**;
- **aucune lecture forcée de placeholders ou de fichiers infonuagiques** pour
  le seul enrichissement de la carte.

### G — Graphify : `NOT INTEGRATED`

**Graphify n'est pas intégré.** Ni dépendance, ni runtime, ni adaptateur MVP,
ni roadmap d'intégration.

Sont **exclus nommément** : toute dépendance Graphify, Python ou NetworkX; tout
`graph.json` global comme stockage FileTopo; tout dashboard Graphify comme
interface; tout pipeline LLM obligatoire; toute détection de communautés
globale obligatoire à l'ouverture.

Sont **conservés comme enseignements seulement**, sans code emprunté : un
graphe logique interrogeable indépendamment du renderer; l'expansion
progressive; l'agrégation et les communautés comme possibilités; l'analyse AST
comme piste facultative lointaine.

Si FileTopo a plus tard un **besoin réel** d'AST, de communautés ou de MCP, il
emploiera une **bibliothèque spécialisée** ou sa **propre implémentation**,
dans une **tranche dédiée**.

### H — Forge

**Forge et FileTopo restent deux projets entièrement distincts.** Aucune
dépendance runtime, aucune fusion de produit. Forge peut servir au processus de
développement et à l'outillage de skills; il ne participe **jamais** au
fonctionnement de FileTopo.

### I — trois niveaux d'échelle, comme protocole futur et non comme promesse

- **10 000** éléments : **confort** sur laptop/desktop ordinaire.
- **100 000** : **cible MVP sérieuse**, notamment la recherche exacte et
  paginée de `P-08`.
- **1 000 000** : **cible architecturale**, avec **spike obligatoire avant
  toute promesse produit**.

**Aucun de ces chiffres n'est publié comme performance acquise.** Les budgets
de [`phase-2-architecture.md`](../architecture/phase-2-architecture.md) et de
[`phase-2-budgets.md`](../performance/phase-2-budgets.md) restent des
**hypothèses et critères de rejet historiques**. La réserve **`R8`** demeure
entière.

Le scale spike futur mesure au minimum les neuf points de
[`PROGRESSIVE_SCALE_ARCHITECTURE.md §11.1`](../architecture/PROGRESSIVE_SCALE_ARCHITECTURE.md).
Le **profil matériel exact du banc est gelé dans la tranche suivante**, pas
ici; la classe visée est « Windows laptop/desktop ordinaire, RAM modeste, iGPU
ou GPU faible ».

## Conséquences

- Le contrat de parité est **amendé, jamais affaibli** : `P-01`, `P-02` et
  `P-03` reçoivent l'amendement normatif **`P-SCALE-R1`**, qui **ajoute** des
  obligations de véracité sur la vue matérialisée. Le contrat **reste à 22
  exigences**; les anciennes formulations sont **conservées et visibles**.
- **`P-08`** devient un **pilier du scale spike**, entière et inchangée.
- La matrice passe de **49 à 51 fonctions** : `F-042` monte `ULTÉRIEUR → MVP`,
  et deux fonctions sont ajoutées — **`F-050`** matérialisation progressive et
  vue bornée, **`F-051`** agrégats et méta-nœuds exacts, toutes deux `MVP` /
  `P0`. **Aucune fonction ne descend, aucune ne disparaît.**
- **`F-047`** reste `DIFFÉRÉ`. **`F-043`, `F-044`, `F-045`** restent
  `IMPLEMENTED` / vérifiées. **`F-046`** reste `PROPOSED` pour son identité
  physique, malgré ses sous-capacités vérifiées.
- La roadmap est **complétée**, non réordonnée : les quatre étapes `A` à `D`
  gardent leur rang et leurs règles de passage.
- **Aucun code n'est écrit.** `MAX_NODES_PER_MAP` est inchangé, aucun schéma
  SQLite n'est défini, aucune dépendance n'est ajoutée.

## Alternatives écartées

| Alternative | Pourquoi elle est écartée |
|---|---|
| **Relever `MAX_NODES_PER_MAP`** | Déplace le mur sans le supprimer. À 1 M, aucune valeur du plafond ne rend le rendu total tenable sur machine modeste. |
| **Rendre tout, en comptant sur le GPU** | Contredit la contrainte produit « laptop ordinaire, sans GPU puissant ». Un produit qui exige WebGL n'est plus généraliste. |
| **Intégrer Graphify** | Apporterait Python, NetworkX, un `graph.json` global et un pipeline LLM — quatre contradictions directes avec « local, léger, sans LLM ». |
| **Choisir maintenant un renderer** | Un choix sans mesure, avant même que le materializer existe, serait un pari, pas une décision. |
| **Promettre 1 M dès maintenant** | Aucune mesure n'existe. Publier un chiffre non mesuré violerait la règle de preuve d'`AGENTS.md` et la réserve `R8`. |
| **Réécrire silencieusement `P-01` à `P-03`** | Interdit par le §3 du contrat de parité : aucune exigence ne disparaît par omission. D'où l'amendement visible `P-SCALE-R1`. |

## Preuves attendues

**Aucune preuve d'exécution n'est attendue de `DEC-0029`.** C'est une décision
d'architecture, enregistrée, dont les cibles doivent être **falsifiées** par le
scale spike de la tranche suivante — jamais confirmées par ce document.

Les preuves exigibles sont documentaires : cohérence des liens, absence de
contradiction entre vision, roadmap, parité, matrice et baseline, unicité de la
classification de `F-042`, absence de trou ou de doublon dans les identifiants
`F`, absence de Graphify comme dépendance, et absence de tout chiffre
10k/100k/1M présenté comme mesuré.

## Preuves rendues

Voir [`TASK-0027 §8`](../tasks/TASK-0027-progressive-scale-architecture-realignment.md)
et la section correspondante de [`VALIDATION.md`](../ai/VALIDATION.md).

**Non testé :** aucune mesure de performance, aucun build, aucun replay
WebView2, aucune exécution de suite de tests n'est requise ni produite par
cette décision.
