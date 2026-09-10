# PROGRESSIVE_SCALE_ARCHITECTURE — Indexer grand, matérialiser petit

- **Date :** 2026-09-06
- **Tâche :** [`TASK-0027`](../tasks/TASK-0027-progressive-scale-architecture-realignment.md)
- **Décision :** [`DEC-0029`](../decisions/DEC-0029-progressive-materialization-and-scale-boundary.md)
- **Statut du document :** **frontière d'architecture courante** pour la mise à
  l'échelle. Contrôlée indépendamment par
  [`ACTION-0044`](../reviews/ACTION-0044-independent-control.md);
  `TASK-0027 = VERIFIED` sur cohérence documentaire.
- **Nature :** **documentaire**. **Non testé, non mesuré, non implémenté.**
  Rien de ce document n'est un résultat de performance. Tout y est une
  **cible à falsifier**.
- **Rapport avec la baseline :** ce document **complète** et **borne**
  [`ARCHITECTURE_BASELINE.md`](ARCHITECTURE_BASELINE.md); il n'en supprime
  aucune contrainte et n'en remplace aucune section.

---

## 0. Convergence réalisée par TASK-0030 — 2026-09-09

La cible documentaire ci-dessous reste inchangée. Sa première tranche produit
est livrée `IMPLEMENTED`, en attente de contrôle indépendant :
[DEC-0031](../decisions/DEC-0031-one-canonical-brain-index-and-bounded-projection.md)
et [TASK-0030](../tasks/TASK-0030-v1-pipeline-convergence.md).
`Index.nodes` est canonique par cerveau, `map_view` matérialise au plus 512 entités
(256 places de nœuds et réserve d'agrégats), puis le layout existant s'applique
à cette vue. Aucun plafond de corpus 5000 ni layout global sur ce chemin.
Les métadonnées d'analyse sont encore collectées en mémoire; ce point, P-08,
le streaming et l'acceptation produit à 1M restent ouverts. Les résultats sont
synthétiques et ne valident aucune performance sur machine modeste.

## 1. L'énoncé unique

> **FileTopo indexe grand, matérialise petit, et ne rend que le contexte
> utile.**

Le but fondamental **ne change pas** : application de bureau **locale**,
**légère**, **généraliste**, pensée notamment pour de **très grands cerveaux
numériques** et des **environnements documentaires d'entreprise**, utilisable
sur un **laptop ou PC ordinaire sans GPU puissant**, **sans LLM**, **sans API
infonuagique**, **sans compte**, et **sans envoi de documents**.

Ce qui change est **où le coût est payé** : le coût de rendu suit désormais le
**contexte courant**, jamais la taille du corpus.

---

## 2. Corpus n'est pas vue rendue

Quatre plans sont désormais **distincts et nommés**, et aucun n'a le droit
d'être confondu avec un autre.

| Plan | Ce qu'il contient | Ce qui le borne |
|---|---|---|
| **Corpus** | La totalité des éléments observés d'un cerveau, dans l'index local durable — SQLite / stores FileTopo | La source; rien d'autre |
| **Graphe logique** | Nœuds, hiérarchie, relations, provenances, états — **dans les données**, pas dans le DOM | Le corpus |
| **Vue matérialisée** | Le sous-graphe et les agrégats effectivement envoyés au frontend | Un **budget de vue** déclaré |
| **Rendu** | Ce que le moteur graphique dessine réellement | La vue matérialisée |

Quatre conséquences normatives en découlent.

1. **Le corpus complet vit dans l'index local durable.** Il n'a jamais besoin
   d'être présent en mémoire du frontend, ni sérialisé en un seul objet.
2. **Le graphe logique existe dans les données**, interrogeable indépendamment
   du renderer. Il **n'est ni le SVG, ni le DOM, ni le canvas**.
3. **Le frontend ne reçoit qu'une vue matérialisée bornée.** Il n'existe
   **aucun** contrat où le frontend reçoit le graphe entier.
4. **La taille totale du cerveau ne doit pas entraîner proportionnellement la
   même charge de rendu.** Une croissance du rendu proportionnelle au corpus
   est, à partir d'ici, un **échec d'architecture**, pas un réglage à ajuster.

### 2.1 L'unité de compte

> **`1 élément indexé` signifie `1 entité accessible`.**
> Cela **ne signifie pas** `1 carte simultanément rendue`.

Toute phrase du dépôt qui compte des « nœuds » doit désormais dire **lequel
des quatre plans** elle compte. Un chiffre de corpus et un chiffre de rendu ne
sont pas comparables et ne se substituent jamais l'un à l'autre.

### 2.2 Le plafond `MAX_NODES_PER_MAP = 5000`

`src-tauri/src/map/mod.rs` porte `MAX_NODES_PER_MAP = 5_000`, appliqué par
`map::commands`, `map::fixtures` et `map::store`.

C'est une **limite de tranche historique** — une borne de sécurité posée quand
une tranche rendait tout ou refusait tout. **Ce n'est pas une limite produit de
corpus.** Un cerveau de 100 000 ou de 1 000 000 d'éléments n'est pas hors
produit parce que ce plafond existe.

**Ce plafond n'est pas modifié par `TASK-0027`** : cette tâche est
documentaire. Il est **destiné à être remplacé** par un **budget de
matérialisation et de remplissage de vue**, qui borne *ce qui est rendu* au
lieu de borner *ce qui peut exister*. La logique « tout rendre ou refuser »
cesse d'être la stratégie cible.

---

## 3. Architecture cible

```text
Sources read-only
    ↓
Index complet local / SQLite
    ↓
Graphe logique + relations + états
    ↓
Query engine borné
    ↓
Progressive materializer
    ↓
Sous-graphe / agrégats utiles
    ↓
Layout de cette vue seulement
    ↓
Renderer borné
```

**Invariant de flèche.** Chaque flèche **ne peut que réduire ou résumer**;
aucune ne peut inventer. Une entité présente au rendu et absente de l'index est
un défaut bloquant, exactement comme aujourd'hui.

**L'invariant structurel de la baseline reste entier** : la flèche vers la
racine choisie est **unidirectionnelle et en métadonnées seules**, et aucun
artefact FileTopo ne vit dans la racine analysée —
[`ARCHITECTURE_BASELINE.md §2`](ARCHITECTURE_BASELINE.md).

---

## 4. Navigation progressive

Le coût suit le **contexte courant**. Une vue matérialisée peut contenir :

- le **focus courant**;
- les **ancêtres nécessaires** pour situer ce focus sans mentir;
- les **enfants utiles**, **paginés**;
- les **frères pertinents**, paginés ou résumés;
- les **relations sélectionnées**, jamais toutes les relations du cerveau;
- des **agrégats / méta-nœuds** pour tout ce qui est réel mais non matérialisé.

Rien d'autre n'a besoin d'exister dans le rendu à cet instant.

### 4.1 `F-042` devient une primitive, pas un confort

`F-042 — repli/dépli et focus de branche` était classée `ULTÉRIEUR`, « nommée
pour ne pas être oubliée, non promise au MVP », par `DEC-0020`.

**Elle est promue `MVP`.** Le motif est explicite et il est nouveau : sous une
architecture progressive, replier, déplier et focaliser **ne sont plus des
conforts d'interface**. Ce sont les **gestes qui déterminent le contenu de la
vue matérialisée**, donc **la primitive de navigation et la primitive de
performance** du produit. Sans eux, le materializer n'a aucune commande
utilisateur pour décider quoi matérialiser.

Ses critères d'acceptation d'origine restent valides et **ne sont pas
affaiblis** : replier masque **exactement** les descendants et rien d'autre;
déplier restitue l'état antérieur; le focus n'affiche **aucun** nœud extérieur
et le **dit en mots**; les deux sont atteignables au clavier et réversibles en
une action.

---

## 5. Agrégats et méta-nœuds

Un **agrégat** représente un sous-ensemble **réel mais non matérialisé**, sans
mentir sur ce qu'il est.

### 5.1 Quatre natures qui ne se confondent jamais

| Nature | Ce que c'est | Ce qu'il est interdit d'en faire |
|---|---|---|
| **Dossier / hiérarchie réelle** | Un **fait source**, observé dans l'arborescence | Le fabriquer, le déplacer, le renommer |
| **Agrégat / méta-nœud FileTopo** | Un **résumé calculé exact** d'éléments cachés de la vue | Le présenter comme un dossier |
| **Communauté calculée** *(éventuelle, future)* | Une **classification dérivée** d'un algorithme nommé et versionné | La présenter comme une structure source |
| **Suggestion** | Une **hypothèse non établie** — `DEC-0021`, `P-04` | La compter comme une relation |

### 5.2 Ce qu'un agrégat doit porter

- Un **compte exact** des éléments qu'il représente. Pas une estimation, pas
  un « environ », pas un « 999+ ».
- Une **provenance / raison de regroupement** lisible : *« 12 480 enfants
  directs non matérialisés sous ce dossier »*, *« page 3 de 57 »*.
- Une **voie d'expansion** : ce qu'il résume doit rester atteignable.

### 5.3 Ce qu'un agrégat n'est jamais

- **Jamais un faux dossier.** Il n'apparaît pas dans un chemin, n'est pas
  copiable comme chemin, et n'est pas ouvrable dans l'Explorateur.
- **Jamais une relation.** Il ne crée aucune arête entre les éléments qu'il
  résume.
- **Jamais silencieux.** Un sous-arbre replié ou agrégé est **déclaré comme
  tel**, avec son compte exact.

---

## 6. Query engine borné

Primitive d'architecture, décrite ici en **contrats conceptuels**, jamais en
API finale. `TASK-0027` **ne fige aucune signature**.

| Requête | Ce qu'elle rend | Bornage exigé |
|---|---|---|
| **Enfants** | Les enfants directs d'un nœud | Paginée, cursorisée, ordre déterministe |
| **Ancêtres** | Le chemin jusqu'à la racine du cerveau | Borné par la profondeur, déjà plafonnée |
| **Voisinage relationnel** | Les relations d'un nœud, par type et direction | Paginée par type et par direction |
| **Chemin entre nœuds** | Un chemin, ou son absence déclarée | Profondeur et coût **plafonnés et déclarés** |
| **Recherche** | Les éléments correspondants | Paginée et bornée — `P-08` |
| **Filtres** | Le sous-ensemble retenu | Comptes exacts obtenus par requête, jamais par balayage du frontend |
| **Agrégats** | Comptes exacts d'un sous-ensemble non matérialisé | Calculés côté Rust/SQLite |

**Trois règles dures.**

1. **Le frontend ne reçoit jamais un whole-graph JSON.** Aucun contrat, présent
   ou futur, ne sérialise le graphe entier vers l'interface.
2. **Tout renvoi de collection est borné et paginé**, avec un curseur stable et
   un ordre déterministe.
3. **Les comptes sont calculés côté cœur privilégié**, pas dérivés de ce que le
   frontend a reçu. Un compte dérivé du rendu est faux par construction.

L'IPC reste **étroit, typé, validé, en identifiants seulement, jamais de chemin
brut** — [`ARCHITECTURE_BASELINE.md §2`](ARCHITECTURE_BASELINE.md), inchangé.

---

## 7. Layout et renderer

### 7.1 Le layout existant reste valide, dans sa portée

`layered-tree-cards-v1` — [`DEC-0024`](../decisions/DEC-0024-deterministic-layered-node-card-layout.md),
`src-tauri/src/map/layout.rs` — **reste une preuve valide pour une vue
bornée**. Rien de ce qui a été vérifié n'est retiré.

Ce qui change : **il ne doit plus être calculé comme une obligation sur tout le
corpus**. Le layout s'applique **à la vue matérialisée**, après le
materializer, et son coût se mesure sur cette vue.

### 7.2 Aucun renderer n'est choisi

**React Flow, ELK, Sigma, Cytoscape et Pixi ne sont pas choisis.** Ils restent
des **candidats futurs à benchmarker**, dans une tranche dédiée. `TASK-0027`
**n'en retient aucun** et n'en écarte aucun.

### 7.3 La contrainte matérielle est une contrainte produit

> Le fonctionnement de base **ne peut pas dépendre d'un GPU puissant ni de
> WebGL**.

Une accélération GPU pourra être une **option** plus tard. L'expérience
fonctionnelle doit rester possible sur une **machine modeste**, et le moyen de
cette possibilité est le **budget de vue** : on ne dessine pas beaucoup plus
vite, on dessine beaucoup moins.

---

## 8. Hachage et analyses lourdes à grande échelle

Les observations `sha256-v1` déjà vérifiées — `TASK-0023 / ACTION-0039`,
`TASK-0026 / ACTION-0043`, [`DEC-0025`](../decisions/DEC-0025-exact-content-observation-boundary.md),
[`DEC-0028`](../decisions/DEC-0028-exact-duplicate-query-boundary.md) —
**restent entières**. Leur **déclenchement** est précisé pour la grande
échelle.

- **Métadonnées et index structurel** = **chemin automatique principal**. C'est
  ce qui se produit à l'ouverture d'un cerveau.
- **Hachage de contenu** = **campagne explicite**, en **arrière-plan**, sur un
  **périmètre sélectionnable**.
- **Ne pas imposer le hachage automatique d'un cerveau d'un million de fichiers
  à l'ouverture.** Ce serait transformer une ouverture en opération de plusieurs
  heures, sur une machine que l'utilisateur veut continuer d'employer.
- **Aucune lecture forcée de placeholders ou de fichiers infonuagiques** dans le
  seul but d'enrichir la carte — [`ARCHITECTURE_BASELINE.md §6.3`](ARCHITECTURE_BASELINE.md),
  inchangé.

---

## 9. Graphify — `NOT INTEGRATED`

**Décision explicite : Graphify n'est pas intégré.** Ce n'est ni une
dépendance, ni un runtime, ni un adaptateur MVP, ni une roadmap d'intégration.

**Ce qui est exclu, nommément :**

- **aucune dépendance** Graphify, Python ou NetworkX;
- **aucun `graph.json` global** comme stockage FileTopo;
- **aucun dashboard Graphify** comme interface;
- **aucun pipeline LLM obligatoire**;
- **aucune détection de communautés globale obligatoire à l'ouverture**.

**Ce qui est conservé, et seulement cela — des enseignements, pas du code :**

- un **graphe logique interrogeable indépendamment du renderer**;
- l'**expansion progressive** plutôt que le rendu total;
- l'**agrégation** et les **communautés** comme possibilités;
- l'**analyse AST** comme piste facultative lointaine.

Si FileTopo a plus tard un **besoin réel** d'AST, de communautés ou de MCP, il
emploiera une **bibliothèque spécialisée** ou sa **propre implémentation**,
dans une **tranche dédiée**, jamais par adoption d'un projet tiers entier.

---

## 10. Forge

**Forge et FileTopo restent deux projets entièrement distincts.** Aucune
dépendance runtime, aucune fusion de produit, aucun composant partagé dans
l'application livrée.

Forge peut servir au **processus de développement** et à l'outillage de skills.
Il ne participe **jamais** au fonctionnement de FileTopo.

---

## 11. Échelle : trois niveaux de validation — protocole futur

> **Aucun des chiffres de cette section n'est un résultat.** Ce sont des
> **cibles de validation à exécuter dans la tranche suivante**. Aucune
> performance n'est acquise, aucune n'est promise à l'utilisateur.

| Niveau | Nature de la cible | Ce qu'il doit établir |
|---|---|---|
| **10 000** éléments | **Confort** sur laptop/desktop ordinaire | Navigation fluide, sans stratégie particulière |
| **100 000** éléments | **Cible MVP sérieuse** | Notamment la **recherche exacte et paginée** de `P-08` |
| **1 000 000** éléments | **Cible architecturale / spike obligatoire** | Le spike doit précéder **toute promesse produit** à cette échelle |

Les budgets historiques de
[`phase-2-architecture.md`](phase-2-architecture.md) et de
[`phase-2-budgets.md`](../performance/phase-2-budgets.md) restent des
**hypothèses et des critères de rejet historiques**, **pas des résultats**. La
réserve `R8` reste entière : **aucun chiffre de performance publié avant
l'étape C**, dans un véritable hôte WebView2.

### 11.1 Ce que le futur scale spike doit mesurer, au minimum

1. **Temps d'index / de reconstruction** sur corpus **synthétique**.
2. **Taille SQLite** et **mémoire du processus**.
3. **Latence des recherches** et des **requêtes de voisinage**.
4. **Latence de matérialisation d'une vue**.
5. **Nombre de nœuds et d'arêtes effectivement envoyés au frontend.**
6. **Temps de layout de la vue bornée** — pas du corpus.
7. **Interactivité** : panoramique, zoom, sélection, sur **machine modeste**.
8. **Comportement sans GPU puissant.**
9. **Absence de croissance du nombre rendu proportionnelle au corpus** — c'est
   le **critère de rejet principal** de l'architecture décrite ici.

### 11.2 Profil matériel

Le **profil matériel exact du banc est gelé dans la tranche suivante**, pas
inventé ici. La **classe** visée est : **Windows, laptop ou desktop ordinaire,
RAM modeste, iGPU ou GPU faible**.

---

## 12. Ce que ce document ne tranche pas

| Question | Où elle sera tranchée |
|---|---|
| La valeur numérique du budget de vue | Après le scale spike |
| Le renderer final | Tranche de benchmark dédiée, après le spike |
| Le schéma SQLite du query engine borné | Tranche d'implémentation du materializer |
| Les signatures d'API et de commandes IPC | Tranche d'implémentation |
| Le remplacement effectif de `MAX_NODES_PER_MAP` | Tranche d'implémentation |
| Le profil matériel exact du banc | Tranche du scale spike |
| L'usage éventuel d'AST, de communautés ou de MCP | Seulement si un besoin FileTopo réel le justifie |

## 13. Limites de ce livrable

- **Non testé, non mesuré, non implémenté.** Aucune ligne de code produit
  n'a été écrite par `TASK-0027`.
- Les trois niveaux 10k / 100k / 1M sont des **cibles**, jamais des mesures.
- Le **progressive materializer**, le **budget de vue**, le **LOD** et les
  **agrégats** n'existent pas encore dans le produit.
- **`F-046`** reste `PROPOSED` : l'identité physique persistante reste absente
  et [`DEC-0013`](../decisions/DEC-0013-post-risk-gate-technical-arbitration.md) F
  demeure bloquante.
- La garantie **`X10` race-safe hors Windows** reste non prouvée.

## 14. Documents liés

- [`ACTION-0044`](../reviews/ACTION-0044-independent-control.md)
- [`DEC-0029`](../decisions/DEC-0029-progressive-materialization-and-scale-boundary.md)
- [`TASK-0027`](../tasks/TASK-0027-progressive-scale-architecture-realignment.md)
- [`ARCHITECTURE_BASELINE.md`](ARCHITECTURE_BASELINE.md)
- [`CARTETOPO_FUNCTIONAL_PARITY.md`](../product/CARTETOPO_FUNCTIONAL_PARITY.md)
- [`FEATURE_MATRIX.md`](../product/FEATURE_MATRIX.md)
- [`REQUIREMENTS_BASELINE.md`](../product/REQUIREMENTS_BASELINE.md)
- [`PROJECT_VISION.md`](../../PROJECT_VISION.md)
- [`ROADMAP.md`](../../ROADMAP.md)
