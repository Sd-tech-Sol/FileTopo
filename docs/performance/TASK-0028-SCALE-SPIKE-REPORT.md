# TASK-0028 — Rapport du banc synthétique de mise à l'échelle

> **`ENGINEERING_MEASUREMENT / NOT A PRODUCT CLAIM / NONCANONICAL UNTIL
> INDEPENDENT CONTROL`**
>
> Aucun chiffre de ce document n'est une promesse de performance produit,
> une cible validée, ni un résultat canonique. `R8` reste entière : rien d'ici
> n'est recopié dans `README`, `PROJECT_VISION`, `ROADMAP`, une page publique,
> une note de version ou une promesse utilisateur.

- **Tâche :** [`TASK-0028`](../tasks/TASK-0028-synthetic-scale-feasibility-spike.md) — `IMPLEMENTED`
- **Protocole gelé avant le harness :** [`TASK-0028-SCALE-SPIKE-PROTOCOL.md`](TASK-0028-SCALE-SPIKE-PROTOCOL.md)
- **Décision encadrante :** [`DEC-0029`](../decisions/DEC-0029-progressive-materialization-and-scale-boundary.md), non modifiée
- **Cibles :** [`PROGRESSIVE_SCALE_ARCHITECTURE.md §11`](../architecture/PROGRESSIVE_SCALE_ARCHITECTURE.md)
- **Date d'exécution :** 2026-09-07

---

## 1. Réponse à la question posée

> **L'architecture « indexer grand, matérialiser petit » est-elle techniquement
> plausible avec le cœur local Rust/SQLite et un rendu borné, sans faire
> dépendre le coût graphique de la taille totale du corpus ?**

**Sur le critère structurel : oui, et la mesure le montre.** À budget fixe, la
cardinalité de la vue, le nombre d'arêtes, la taille du payload et le temps de
layout sont **plats** de 10 000 à 1 000 000 d'éléments — un corpus multiplié par
**100** ne change rien à ce qui serait rendu.

**Sur le coût des requêtes qui produisent cette vue : non, pas avec le schéma
actuel.** Trois chemins mesurés croissent avec le corpus ou le sous-arbre, pas
avec le budget. Ils sont détaillés en `§6` et constituent le vrai résultat
exploitable de ce spike : **ce qui reste à faire pour que « matérialiser petit »
soit aussi *bon marché* que « petit ».**

Ce verdict **ne signifie pas** que `F-042`, `F-050` ou `F-051` sont
implémentées. Aucune ne l'est, et aucun état produit n'a changé.

---

## 2. Profil du banc — et pourquoi il ne valide aucune cible

| Élément | Valeur |
|---|---|
| Classe | **`DEVELOPMENT_BENCH_NOT_ACCEPTANCE`** |
| OS | Microsoft Windows 11 Professionnel, 10.0.26200 |
| CPU | Intel Core i9-9900K @ 3.60 GHz — 8 cœurs, 16 logiques |
| RAM | 34 272 813 056 octets (≈ 31,9 Gio) |
| GPU | NVIDIA GeForce RTX 2070 |
| Disques | HDD, SSD |
| Chaîne d'outils | rustc 1.98.0, cargo 1.98.0, Node v24.13.1, SQLite 3.53.2 |
| **Profil de compilation** | **`debug`** — voir `§2.1` |

> **Le banc est plus puissant que la classe visée.** La cible produit est
> « Windows, laptop ou desktop ordinaire, RAM modeste, iGPU ou GPU faible ».
> Ce banc n'en est pas. **Aucune cible « machine modeste » n'est validée par
> ces mesures.** Le harness est portable et le protocole rejouable tel quel sur
> un laptop plus modeste, sans réécriture.

La règle de classification a été écrite **avant** de lire la machine
(`protocole §4.1`), et un test la vérifie : un banc à 64 Gio et RTX 4090 ne peut
pas être classé `TARGET_CLASS`.

Aucun nom d'hôte, nom d'utilisateur, chemin personnel ou identifiant machine
n'a été lu ni écrit. Les artefacts sont contrôlés octet à octet avant écriture,
et l'écriture échoue si un identifiant apparaît.

### 2.1 Les chiffres sont des chiffres `debug`

La suite de tests du crate **ne compile pas en `--release`** : plusieurs
auxiliaires de test sont derrière `#[cfg(debug_assertions)]`. Constat
reproductible et **antérieur à cette tâche** — vérifié en retirant tout le
harness `TASK-0028` : `cargo test --release --lib --no-run` échoue avec les
mêmes 16 erreurs.

Conséquence : **tous les temps Rust de ce rapport sont des temps `debug`,
non optimisés.** Ils sont donc **pessimistes**, parfois d'un facteur important.
Le verdict structurel de `§5` ne dépend pas du profil — il porte sur des
**comptes**, pas sur des durées.

---

## 3. Ce qui a été mesuré, et sur quelle couche

| Sigle | Couche | Tailles | Statut |
|---|---|---|---|
| **SCAN-SCALE** | Arborescence **physique** réellement créée puis parcourue par `scan_tree_controlled` | 10 000, 100 000 | **mesuré** |
| **INDEX-SCALE** | Base de banc sur le **schéma FileTopo courant**, `Index::open` + `Index::replace_nodes` | 1 000 000 | **mesuré** |

> **`INDEX-SCALE` n'est pas un « scan 1M ».** Aucun million de fichiers
> physiques n'a été créé ni parcouru. Cette couche ne prouve **rien** sur le
> scanner à cette taille. **1 000 000 physique reste non prouvé.**

Le corpus synthétique porte volontairement les deux formes difficiles : un
**hub** contenant environ un quart du corpus en enfants directs — 249 981
enfants directs à 1M — et une **chaîne profonde** de 24 niveaux.

Artefacts : [`TASK-0028-SS-10k.json`](runs/TASK-0028-SS-10k.json),
[`TASK-0028-SS-100k.json`](runs/TASK-0028-SS-100k.json),
[`TASK-0028-SS-1m-index.json`](runs/TASK-0028-SS-1m-index.json),
[`TASK-0028-SS-bounded-view-webview2.json`](runs/TASK-0028-SS-bounded-view-webview2.json).

---

## 4. SS1 / SS2 — index, reconstruction, stockage, mémoire

| Mesure | 10k | 100k | 1M *(INDEX-SCALE)* |
|---|---:|---:|---:|
| Génération synthétique *(hors FileTopo)* | 3,03 s | 29,19 s | 0,54 s *(plan)* + 0,56 s *(lignes)* |
| Scan à froid — `scan_tree_controlled` | 0,357 s | 3,62 s | **non applicable** |
| Scan à chaud | 0,362 s | 3,58 s | **non applicable** |
| Construction d'index — `replace_nodes` | 0,048 s | 0,643 s | 6,94 s |
| Reconstruction | 0,087 s | 1,14 s | *(1 seule exécution — voir ci-dessous)* |
| Réouverture de la base | — | — | 0,006 s |
| Éléments attendus / indexés | 10 000 / 10 000 | 100 000 / 100 000 | 1 000 000 / 1 000 000 |
| Diagnostics du scanner | 0 | 0 | — |
| Taille de la base | 1,29 Mo | 12,92 Mo | 125,68 Mo |
| WAL / SHM après fermeture | 0 / 0 | 0 / 0 | 0 / 0 |
| Working set — max relevé | 19,9 Mo | 74,4 Mo | **339,7 Mo** |

**Répétitions.** Scan : 2 exécutions (froid puis chaud), résultats identiques en
cardinalité. Index : 2 exécutions (construction puis reconstruction).
`INDEX-SCALE` 1M : **une seule construction**, déclarée comme telle — un million
de lignes ne se reconstruit pas gratuitement.

**Méthode mémoire.** `Get-Process -Id <pid>` sur le processus de test, via
PowerShell, sans dépendance nouvelle. Les relevés sont **ponctuels** : le
maximum publié est le plus grand des échantillons pris, **pas** un pic garanti
du processus.

### 4.1 Constat d'architecture — la mémoire de `replace_nodes`

À 1M, le working set passe de **6,3 Mo** au départ à **335,4 Mo** dès que le
corpus est en mémoire, avant même que SQLite soit touché.

La cause est la signature actuelle : `Index::replace_nodes(&mut self, nodes:
&[NodeDto])` **exige la totalité du corpus en mémoire**. C'est une **contrainte
pour la tranche d'implémentation du materializer**, pas un résultat de
performance : indexer en flux, par lots, supprimerait ce coût. Constat
enregistré, pas contourné.

### 4.2 Intégrité de la source — `I-1`

Empreinte structurelle FNV-1a sur `chemin|type|taille`, calculée **avant et
après** chaque campagne physique.

| Campagne | Entrées | Empreinte avant | Empreinte après | Source modifiée ? |
|---|---:|---|---|---|
| 10k | 9 999 | *(identique)* | *(identique)* | **non** |
| 100k | 99 999 | *(identique)* | *(identique)* | **non** |

Aucun octet de contenu n'a été lu. **Aucune campagne SHA-256** de `TASK-0023` /
`TASK-0026` n'a été lancée; `DEC-0025` n'a pas été sollicitée.

---

## 5. SS5 / SS6 / SS9 — le résultat principal

Budgets testés : **128 / 256 / 512 / 1024**. **Aucun n'est décidé final.**

### 5.1 Non-proportionnalité — à budget 1024, focus racine

| Corpus | Entités | Arêtes | Agrégats | Payload JSON | Layout | Éléments comptés / existants |
|---:|---:|---:|---:|---:|---:|---|
| 10 000 | **1 024** | 1 023 | 1 | 206 626 o | 0,26 ms | 10 000 / 10 000 |
| 100 000 | **1 024** | 1 023 | 1 | 194 266 o | 0,23 ms | 100 000 / 100 000 |
| 1 000 000 | **1 024** | 1 023 | 1 | 197 418 o | 0,25 ms | 1 000 000 / 1 000 000 |

**Le corpus est multiplié par 100. La vue ne bouge pas.** Le même constat tient
aux budgets 128, 256 et 512, et pour un focus placé sur le dossier le plus large
du corpus.

### 5.2 Verdict structurel `SS9`

| Condition `SS9` | Verdict | Preuve |
|---|---|---|
| Cardinalité bornée par le budget | **PASS** | 24 combinaisons (budget × taille × focus) : `entités ≤ budget`, toujours atteint exactement |
| Aucun whole-graph JSON sérialisé | **PASS** *(couche cœur)* | Payload plat à ~200 Ko à budget 1024, de 10k à 1M. Réserve : voir `§7` pour le bout-en-bout |
| Comptes d'agrégats exacts | **PASS** | Deux méthodes indépendantes — CTE récursive SQLite et recensement Rust `O(n)` — comparées à chaque agrégat, toujours d'accord |
| Tout élément non rendu reste compté et atteignable | **PASS** | `éléments comptés == éléments existants` dans **les 24 combinaisons**, sans exception |
| Aucune relation ni hiérarchie inventée | **PASS** | Invariants `F-051` vérifiés par assertion à chaque exécution : 0 infraction |

**Ce `PASS` ne signifie pas que `F-050` ou `F-051` sont implémentées dans le
produit.** Il porte sur un prototype de banc, non exposé.

### 5.3 Ce que les agrégats portent réellement

Vérifié par assertion, pas seulement décrit :

- **compte exact** des enfants directs cachés — jamais estimé, jamais « 999+ »;
- **compte exact des éléments** derrière l'agrégat (enfants cachés *et* toute
  leur descendance), quand la variante exacte est demandée;
- une **provenance lisible** et un **curseur de reprise** : *« N enfants directs
  non matérialisés sous ce dossier — reprise à l'offset K »*;
- **jamais un dossier** : pas de chemin, pas d'identité de nœud, `is_directory`
  faux;
- **jamais une relation** : une seule arête, étiquetée
  `aggregate-attachment` et non `hierarchy`, et aucune arête entre les éléments
  résumés.

### 5.4 Layout borné — `SS6`

`layered-tree-cards-v1` (`DEC-0024`) est **inchangé**, appliqué **uniquement à
la vue bornée**. Le layout du corpus 100k/1M **n'a jamais été calculé**.

Coût mesuré : **0,04 à 0,33 ms**, fonction du budget seul, **indépendant du
corpus** à budget égal.

---

## 6. Ce qui ne passe pas à l'échelle — les vrais résultats exploitables

Trois chemins mesurés croissent avec le corpus ou le sous-arbre, **pas** avec le
budget de vue. Ils ne falsifient pas `DEC-0029`, mais ils décrivent exactement
ce que la tranche d'implémentation devra régler.

### 6.1 `SS3` — la recherche `P-08` est linéaire dans le corpus

`Index::query_nodes`, le chemin de production, p50 / p95 sur 21 exécutions après
3 warm-ups, page de 100 résultats :

| Motif | 10k | 100k | 1M *(informatif)* |
|---|---:|---:|---:|
| hit-début | 5,6 / 6,4 ms | 67,0 / 68,6 ms | 668,7 / 687,9 ms |
| hit-milieu | 6,6 / 7,7 ms | 71,0 / 85,3 ms | 690,5 / 724,2 ms |
| hit-fin | 5,3 / 5,8 ms | 64,7 / 67,8 ms | 635,9 / 664,4 ms |
| miss | 5,2 / 6,2 ms | 64,6 / 68,6 ms | 634,5 / 655,0 ms |

Pagination **réelle** vérifiée à chaque motif : deuxième page obtenue, **aucun
recouvrement**, total **stable** entre les pages, exactitude confirmée contre le
compte attendu du générateur. Aucun cache n'existe sur ce chemin, **aucun n'a
été simulé**.

**Constat.** `query_nodes` fait un `COUNT(*)` puis une page, tous deux avec
`LIKE '%…%'` — un balayage complet. Le coût suit la taille du corpus : ×10 de
corpus ≈ ×10 de latence. **`P-08` à 100 000 est mesuré et tient** (~67 ms p50 en
`debug`). **À 1 000 000, ~0,67 s p50** : utilisable pour un banc, pas pour une
promesse produit. Un index de recherche — FTS ou index de préfixe — sera
nécessaire **avant** toute promesse à cette échelle.

### 6.2 `SS4` — une page « bornée » coûte le sous-arbre, pas la page

| Requête | 10k | 100k | 1M |
|---|---:|---:|---:|
| Page de 100 enfants directs *(p50)* | 1,01 ms | 11,01 ms | **105,9 ms** |
| Ancêtres jusqu'à la racine *(p50)* | 0,043 ms | 0,042 ms | **0,043 ms** |
| Compte exact des enfants directs *(p50)* | 0,15 ms | 1,38 ms | 21,3 ms |
| Compte exact d'un sous-arbre *(p50, 3 exéc.)* | 2,3 ms | 29,1 ms | 321,7 ms |

**Constat.** Une page de **100 lignes** coûte **106 ms** à 1M. L'ordre
déterministe de production —
`kind = 'directory' DESC, name COLLATE NOCASE, id` — **ne peut pas utiliser**
l'index `idx_nodes_parent(parent_id, name)` : l'expression `kind = 'directory'`
et la collation `NOCASE` forcent SQLite à trier **tous** les enfants du parent,
249 981 lignes dans le cas du hub. La pagination est donc **bornée en
résultat mais pas en coût**.

Contre-exemple utile dans le même tableau : **les ancêtres sont plats** — 43 µs
de 10k à 1M. Une requête réellement bornée existe déjà; c'est l'ordre de tri qui
défait les autres.

**Conséquence pour la tranche d'implémentation :** un index couvrant l'ordre
d'affichage — ou un ordre qui s'aligne sur un index existant — est une
précondition du materializer, pas un raffinement.

### 6.3 `SS5` — le prix de l'exactitude des agrégats

Deux variantes, **toutes deux exactes**, mesurées séparément :

| Budget 1024, focus racine | 10k | 100k | 1M |
|---|---:|---:|---:|
| Comptes **directs** exacts | 3,9 ms | 2,7 ms | **40,6 ms** |
| Comptes **d'éléments** exacts *(CTE récursive)* | 3,6 ms | 57,9 ms | **1 336,9 ms** |

**Constat.** Donner à chaque agrégat le compte exact de **tout ce qu'il
représente** coûte **1,34 s** à 1M, parce que la CTE récursive parcourt le
sous-arbre entier. Le compte des **enfants directs** reste ~33× moins cher et
reste exact — mais il répond à une question plus étroite.

`F-051` exige un compte exact; il ne dit pas *lequel*. **Trancher entre les deux
sémantiques, ou précalculer les tailles de sous-arbre à l'indexation, est une
décision qui revient à l'orchestrateur.** Ce spike la documente et ne la prend
pas.

---

## 7. `SS7` / `SS8` — la couche WebView2, et sa limite

### 7.1 Ce qui a réellement tourné

**Deux processus Tauri / WebView2 réels**, WebView2 **152.0.4191.66**, Tauri
2.11.5, boucle de mesure **déjà présente dans le runtime**, démarrée par
`FILETOPO_AUTO_MEASURE=1`. **Aucun comportement produit n'a été ajouté.**

| Passe | Vue | Entités | Trame p50 | Pire trame | Sélection p50 | Trames |
|---|---|---:|---:|---:|---:|---:|
| GPU par défaut | brain-alpha | 12 | 4,2 ms | 30,9 ms | 8,4 ms | 750 |
| GPU par défaut | brain-beta | **157** | 4,2 ms | 8,9 ms | 8,3 ms | 750 |
| GPU par défaut | brain-gamma | 12 | 4,2 ms | 8,0 ms | 8,4 ms | 750 |
| GPU désactivé | brain-alpha | 12 | 4,1 ms | 25,3 ms | 8,5 ms | 750 |
| GPU désactivé | brain-beta | **157** | 4,1 ms | 10,3 ms | 8,4 ms | 750 |
| GPU désactivé | brain-gamma | 12 | 4,1 ms | 10,1 ms | 8,5 ms | 750 |

Ouverture de la vue : **oui**. Pan et zoom : **oui**, réellement offerts par ce
build. Sélection souris et clavier : **oui**.

### 7.2 Cardinalité DOM/SVG exacte — mesurée hors WebView2

Le nombre d'éléments réellement présents est compté sur le **vrai composant
`MapView`**, rendu sous **jsdom** — qui **n'est pas un moteur de rendu et n'est
pas WebView2**. Cela établit une **cardinalité**, jamais un temps de rendu.

| Budget | `treeitem` | Arêtes de hiérarchie | Éléments SVG | Corpus 10k / 100k / 1M |
|---:|---:|---:|---:|---|
| 128 | 128 | 127 | 903 | **identiques** |
| 256 | 256 | 255 | 1 799 | **identiques** |
| 512 | 512 | 511 | 3 591 | **identiques** |
| 1 024 | 1 024 | 1 023 | 7 175 | **identiques** |

Le DOM suit le **budget** et **rien d'autre** : à budget égal, un corpus cent
fois plus grand produit un DOM **identique au comptage près**. Coût mesuré :
**~7 éléments SVG par entité**.

### 7.3 Limites — déclarées, non contournées

- **La composition bout-en-bout n'a pas été testée.** L'index de banc
  `TASK-0028` (100k / 1M) **ne peut pas** atteindre ce runtime sans une
  **nouvelle commande produit**, que le périmètre interdit. Les deux couches —
  vue bornée côté cœur, rendu borné côté WebView2 — ont été prouvées
  **séparément**.
- **Les budgets 256, 512 et 1024 ne sont pas mesurés dans WebView2.** Les vues
  réellement mesurées comptent **12 et 157** entités : le **bas** de la plage
  candidate. Les cardinalités du runtime sont fixées par ses trois cerveaux
  gelés (`quasi-empty`, `deep`, `quasi-empty`), et les changer serait une
  modification produit.
- **L'absence de whole-graph payload n'est pas prouvée bout-en-bout ici** :
  `MAX_NODES_PER_MAP = 5000` borne ce que ce runtime charge, et aucun corpus
  100k/1M ne lui a jamais été présenté. La preuve d'absence porte sur la couche
  cœur (`§5.1`), pas sur la chaîne complète.

### 7.4 `SS8` — **`NOT PROVEN`**

La désactivation du GPU a été demandée par le mécanisme documenté
`WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--disable-gpu --disable-gpu-compositing`.

**Rien, depuis l'extérieur de la page, ne confirme que le runtime l'a
honoré.** Le confirmer exigerait que la page rapporte son renderer, c'est-à-dire
du code produit nouveau. **Aucune preuve n'a été fabriquée** : la passe est
enregistrée comme **indicative**, le sous-critère reste **`NOT PROVEN`**.

Les deux passes donnent des trames p50 quasi identiques (4,2 contre 4,1 ms), ce
qui est **compatible** avec deux lectures opposées — le drapeau a été ignoré, ou
la vue est trop petite pour que le GPU compte. **Le spike ne tranche pas.**

Et même confirmée, une passe logicielle **n'équivaut pas** à un test sur iGPU
modeste : elle ne vérifierait que l'absence d'une dépendance dure évidente au
GPU.

---

## 8. Bilan par critère du protocole

| Critère | Verdict |
|---|---|
| `SS1` index / reconstruction | **mesuré** — 10k, 100k physiques; 1M INDEX-SCALE |
| `SS2` SQLite et mémoire | **mesuré** — méthode déclarée; constat sur `replace_nodes` |
| `SS3` recherche `P-08` | **mesuré** — obligatoire à 100k, informatif à 1M; linéaire dans le corpus |
| `SS4` requêtes bornées | **mesuré** — voisinage relationnel **non mesuré**, honnêtement : le store d'index ne porte aucune relation |
| `SS5` matérialisation bornée | **mesuré** — 4 budgets × 3 tailles × 2 focus, invariants `F-051` vérifiés |
| `SS6` layout borné | **mesuré** — 0,04 à 0,33 ms, indépendant du corpus |
| `SS7` frontend WebView2 | **partiellement mesuré** — réel mais borné à 12 et 157 entités; bout-en-bout **non testé** |
| `SS8` sans GPU puissant | **`NOT PROVEN`** |
| `SS9` non-proportionnalité | **PASS** sur les cinq conditions |

---

## 9. Limites globales

- **Le banc n'est pas de la classe d'acceptation.** Aucune cible « machine
  modeste » n'est validée.
- **Tous les temps Rust sont des temps `debug`**, donc pessimistes, pour une
  raison **antérieure à cette tâche**.
- **1 000 000 physique n'est pas prouvé.** Seul l'index à 1M l'est.
- **Le prototype de matérialisation est benchmark-only** : ni API, ni commande,
  ni engagement de signature.
- **Aucun renderer n'est choisi. Aucun budget de vue n'est décidé.**
- **`MAX_NODES_PER_MAP = 5000` n'a pas été remplacé** et reste en vigueur.
- Aucun état de `F-042` / `F-050` / `F-051` n'a changé. `X5` reste à **36**.

---

## 10. Ce que l'orchestrateur doit décider ensuite

Ce spike **mesure et falsifie**; il ne décide pas. Quatre questions lui
reviennent, toutes documentées ci-dessus :

1. **L'ordre d'affichage et son index** — `§6.2`. Précondition du materializer.
2. **La sémantique exacte des agrégats** — `§6.3` : enfants directs, éléments
   totaux, ou tailles de sous-arbre précalculées à l'indexation.
3. **L'index de recherche** avant toute promesse au-delà de 100 000 — `§6.1`.
4. **L'indexation en flux** plutôt que `&[NodeDto]` en un bloc — `§4.1`.

Le **budget de vue candidat** et la **tranche d'implémentation** restent à
trancher après contrôle indépendant.

---

## 11. Documents liés

- [`TASK-0028`](../tasks/TASK-0028-synthetic-scale-feasibility-spike.md)
- [`TASK-0028-SCALE-SPIKE-PROTOCOL.md`](TASK-0028-SCALE-SPIKE-PROTOCOL.md)
- [`DEC-0029`](../decisions/DEC-0029-progressive-materialization-and-scale-boundary.md)
- [`PROGRESSIVE_SCALE_ARCHITECTURE.md`](../architecture/PROGRESSIVE_SCALE_ARCHITECTURE.md)
- [`DEC-0024`](../decisions/DEC-0024-deterministic-layered-node-card-layout.md) — `layered-tree-cards-v1`
- [`ACTION-0044`](../reviews/ACTION-0044-independent-control.md)
