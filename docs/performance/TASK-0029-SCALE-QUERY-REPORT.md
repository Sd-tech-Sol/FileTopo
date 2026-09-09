# TASK-0029 — Rapport de la fondation de requête bornée

> **`ENGINEERING_MEASUREMENT / NOT A PRODUCT CLAIM / NONCANONICAL UNTIL
> INDEPENDENT CONTROL`**
>
> Aucun chiffre de ce document n'est une promesse de performance produit, une
> cible validée, ni un résultat canonique. `R8` reste entière : rien d'ici
> n'est recopié dans `README`, `PROJECT_VISION`, `ROADMAP`, une page publique,
> une note de version ou une promesse utilisateur. `X5` reste à **36** et
> aucun de ces deux artefacts n'y entre.

- **Tâche :** [`TASK-0029`](../tasks/TASK-0029-scale-query-foundation.md) — `IMPLEMENTED`, contrôle indépendant requis
- **Décision encadrante :** [`DEC-0030`](../decisions/DEC-0030-bounded-hierarchy-query-contract.md) — `APPROVED`
- **Réserve qui a ouvert la tâche :** [`ACTION-0045`](../reviews/ACTION-0045-independent-control.md) — `CLOSED`
- **Artefacts :** [`TASK-0029-SQF-100k.json`](runs/TASK-0029-SQF-100k.json), [`TASK-0029-SQF-1m-index.json`](runs/TASK-0029-SQF-1m-index.json)
- **Harness :** `src-tauri/src/scale_query/`, `#[cfg(test)]`, campagnes `#[ignore]`
- **Lanceur :** `scripts/task0029-scale-query.ps1`
- **Date d'exécution :** 2026-09-09

---

## 1. La question posée

> **Une page de 100 enfants coûte-t-elle la même chose selon que la fratrie
> compte 25 000 lignes ou 250 000 ?**

`TASK-0028` avait répondu « non » sans le vouloir : sa page de banc coûtait
p95 ≈ 12,9 ms à 100 000 éléments indexés et p95 ≈ 110,4 ms à 1 000 000, pour
une page de taille identique. `ACTION-0045` a fermé le spike en nommant
exactement ce point.

**Réponse mesurée : oui, désormais.** À position comparable, le p95 de la page
keyset varie d'un facteur **0,53 à 2,30** entre 100k et 1M, là où l'ancien
chemin variait d'un facteur **8,6 à 10,7** sur le même banc, dans le même
processus, contre la même base.

Ce n'est pas une promesse produit. C'est un critère d'ingénierie tenu sur un
corpus synthétique, dans un profil `debug`, sur un banc plus puissant que la
classe visée.

---

## 2. Profil du banc — et pourquoi il ne valide aucune cible

| | |
|---|---|
| Classe | `DEVELOPMENT_BENCH_NOT_ACCEPTANCE` |
| CPU | Intel Core i9-9900K, 8 cœurs physiques / 16 logiques |
| RAM | 31,9 GiB |
| OS | Windows 11, 10.0.26200 |
| SQLite | 3.53.2, embarqué |
| Toolchain | rustc 1.98.0, cargo 1.98.0 |
| Profil de build | **`debug` (non optimisé, assertions actives)** |

**Ce banc est plus puissant que la classe visée.** Aucune cible « machine
modeste, sans GPU puissant » n'est validée ici. Et les chiffres sont des
chiffres `debug` : la suite de tests du crate ne compile pas en `release`, donc
la campagne ne peut pas être exécutée en `release` sans changer le code testé.
Un profil optimisé donnerait d'autres nombres — probablement meilleurs, ce qui
est précisément pourquoi ceux-ci ne sont pas publiés comme un plancher.

Ce que le profil `debug` **ne** change **pas** : la forme du plan de requête, le
nombre de lignes que SQLite doit visiter, et donc la **croissance** — qui est
l'objet de la tâche.

---

## 3. Ce qui a été mesuré, et sur quelle couche

Les deux campagnes sont **INDEX-SCALE** : 100 000 et 1 000 000 de lignes
construites sur le schéma FileTopo courant à partir du plan synthétique
déterministe de `TASK-0028`.

**Aucun fichier physique n'est créé.** Ce n'est ni un « scan 100k » ni un
« scan 1M », et cette couche ne prouve rien sur le scanner à ces tailles. Le
coût mesuré est un coût de **requête** : il dépend de ce que l'index contient,
pas de la façon dont il a été rempli.

Le dossier mesuré est le plus large du corpus — le `hub` du générateur, qui
tient environ un quart des éléments comme enfants directs :

| Corpus | Enfants directs du dossier mesuré |
|---|---|
| 100k | **24 981** |
| 1M | **249 981** |

Taille de page mesurée : **100**, après **3** exécutions d'échauffement jetées
et **21** exécutions mesurées. Percentiles au rang le plus proche, sans
interpolation : chaque valeur publiée est une valeur réellement observée, et le
maximum est publié à côté de la médiane.

---

## 4. Le résultat principal — la page keyset

`p95`, en microsecondes, page de 100 :

| Position | 100k | 1M | Rapport 1M/100k |
|---|---|---|---|
| première page | 611 | 322 | **0,53** |
| curseur médian | 410 | 698 | **1,70** |
| curseur proche de la fin | 387 | 892 | **2,30** |
| curseur après le dernier élément | 219 | 175 | **0,80** |

**Critère d'ingénierie : p95 à 1M ≤ 5 × p95 à 100k, à position comparable.**

> **Verdict : `PASS`.** Pire position : `curseur-proche-fin`, rapport
> **2,30**, sous le plafond de 5.

Le rapport est calculé par la campagne 1M elle-même, qui relit l'artefact 100k
et écrit son verdict dans son propre JSON. Il n'est pas recalculé à la main
pour ce rapport.

Deux positions rendent un rapport **inférieur à 1** — la page à 1M est mesurée
plus rapide qu'à 100k. Il ne faut pas y lire une amélioration : à ces durées,
quelques centaines de microsecondes, le bruit de l'ordonnanceur et du cache
domine l'écart. C'est le signe attendu d'un coût qui **ne dépend plus** de la
taille de la fratrie, pas la preuve d'un gain.

### 4.1 Ce que le même banc dit de l'ancien chemin

Le prototype `OFFSET` de `TASK-0028` est appelé tel quel, sur **la même base,
dans le même processus, dans la même exécution** :

| Position | 100k | 1M | Rapport 1M/100k |
|---|---|---|---|
| première page | 13 566 | 116 743 | **8,6** |
| offset médian | 21 823 | 236 237 | **10,8** |
| offset proche de la fin | 32 806 | 351 203 | **10,7** |

Deux choses s'y lisent. D'abord, la reproduction des chiffres de `TASK-0028` —
13,6 ms contre 12,9 ms à 100k, 116,7 ms contre 110,4 ms à 1M — ce qui indique
que les deux campagnes parlent bien du même banc. Ensuite, que l'ancien chemin
croît **avec la fratrie**, et le nouveau non.

Le rapport ancien/nouveau à 1M, à position proche de la fin, est de **351 203
contre 892 µs**. Ce nombre n'est pas publié comme un « gain de 394× » : il
mesure surtout à quel point l'ancien chemin faisait un travail qui n'avait pas
lieu d'être.

**Le nouvel index n'accélère pas l'ancienne requête par accident.** Son ordre
diffère par la collation et par l'expression, donc `idx_nodes_child_order` ne
la sert pas : l'ancien chemin reste servi par `idx_nodes_parent` suivi d'un tri
temporaire, ce que le plan ci-dessous montre.

---

## 5. Les plans de requête — critère structurel, pas illustration

`DEC-0030 §E` fait du plan un **critère**. Il est vérifié par assertion
**pendant** la campagne : une violation arrête la mesure au lieu de devenir une
note dans un fichier que personne ne relit.

| Requête | Plan rapporté par SQLite |
|---|---|
| première page, bornée | `SEARCH nodes USING INDEX idx_nodes_child_order (parent_id=?)` |
| continuation, keyset | `SEARCH nodes USING INDEX idx_nodes_child_order (parent_id=? AND (child_order_rank,name_fold)>(?,?))` |
| ancien chemin `OFFSET` | `SEARCH nodes USING INDEX idx_nodes_parent (parent_id=?)` puis **`USE TEMP B-TREE FOR ORDER BY`** |

Les quatre critères sont donc tenus sur le chemin mesuré :

1. l'index de tri des enfants est effectivement utilisé, pour `parent_id`
   **et** pour l'ordre;
2. **aucun `USE TEMP B-TREE FOR ORDER BY`**;
3. aucun balayage du corpus complet;
4. **aucun `OFFSET`** dans la requête de continuation.

La ligne `(child_order_rank,name_fold)>(?,?)` est ce qui distingue une
recherche indexée d'un balayage filtré : SQLite se place directement à la
position de reprise. C'est la raison mesurée pour laquelle `name_fold` existe
en collation `BINARY` — voir §7.

---

## 6. Comptes exacts, chaîne d'ancêtres, et ce qui reste interdit

| Mesure | 100k | 1M |
|---|---|---|
| compte exact d'enfants directs, p95 | **12 µs** | **13 µs** |
| chaîne d'ancêtres (26 niveaux), p95 | 351 µs | 237 µs |
| audit `child_count` sur tout le corpus | 105 ms, **0 désaccord** | 1 063 ms, **0 désaccord** |
| CTE récursive de sous-arbre, 1 exécution | 32 ms | **342 ms** |

Le compte exact d'enfants directs — le nombre que `F-051` doit afficher, par
exemple `249 981 enfants directs non matérialisés` — coûte **12 à 13 µs quelle
que soit la taille de la fratrie**, parce qu'il vient de la colonne durable
`child_count` par recherche sur clé primaire.

Cette colonne n'est pas crue sur parole : l'audit la compare au `COUNT(*)` réel
**nœud par nœud, sur tout le corpus**, et rapporte **zéro désaccord** aux deux
tailles. L'audit est chronométré à part; son coût n'est jamais crédité à la
primitive qu'il contrôle.

La dernière ligne est la raison d'être de `DEC-0030 §D` : une CTE récursive sur
le sous-arbre coûte **342 ms** à 1M, et ce coût suit la taille du sous-arbre,
pas le budget de vue. La mesurer une fois montre ce qui est interdit sur le hot
path; elle n'est pas proposée.

---

## 7. Ce que la mesure a tranché pendant la conception

Trois variantes d'index ont été mesurées sur une fratrie de 200 000 avant
d'écrire `DEC-0030`. Les nombres qui suivent viennent de cette exploration, et
non des deux artefacts publiés :

| Variante | Page en fin de fratrie |
|---|---|
| clé de tri repliée en `BINARY`, comparaison de valeurs de ligne | **≈ 60 µs** |
| `OFFSET` sur le même index | ≈ 20 600 µs |
| `name COLLATE NOCASE` dans la comparaison de valeurs de ligne | ≈ 31 700 µs |

La troisième ligne est celle qui a décidé la forme du schéma. Avec `COLLATE`
posé dans la comparaison, SQLite ne convertit plus la valeur de ligne en
recherche : il retombe sur un balayage filtré, et la page en fin de fratrie
coûte plus cher qu'avec `OFFSET`. `name_fold = lower(name)` existe pour cette
raison mesurée, pas par préférence de style — et l'ordre qu'il produit est
prouvé identique à `name COLLATE NOCASE` par un test dédié.

---

## 8. Coût de construction et mémoire — déclarés, pas cachés

| | 100k | 1M |
|---|---|---|
| lignes depuis le plan | 0,12 s | 1,31 s |
| construction de l'index de banc | 0,93 s | 9,58 s |
| working set, corpus vivant en mémoire | 28,5 Mo | **189,1 Mo** |
| working set, corpus libéré | 10,9 Mo | 12,1 Mo |

Une seule construction par campagne. **La construction n'est pas l'objet de
`TASK-0029`**, et ces chiffres sont publiés pour ne pas les taire, pas comme un
résultat.

Le relevé « corpus vivant » est pris pendant que le `Vec<NodeDto>` existe
encore; le suivant après sa libération, et il est plus bas pour cette seule
raison. Les deux sont publiés parce que l'écart est le constat :

> **`Index::replace_nodes` prend toujours la totalité du corpus en mémoire.**
> À un million d'éléments, cela représente environ 189 Mo de working set.
> `TASK-0029` **ne corrige pas** ce point : l'indexation en flux ou par lots est
> la tranche suivante, et le constat de `TASK-0028` reste entier.

Les relevés sont ponctuels, pris via `Get-Process` : le maximum publié est le
plus grand des échantillons pris, **pas un pic garanti du processus**.

---

## 9. Limites déclarées

1. **Banc hors classe cible.** i9-9900K, 32 Gio : aucune cible « machine
   modeste » n'est validée.
2. **Profil `debug`.** Les valeurs absolues n'ont pas de sens comme plancher de
   performance. Seule la croissance est exploitable.
3. **Corpus synthétique, forme unique.** Un `hub` très large et une épine
   profonde. Une arborescence réelle a d'autres distributions de noms, de
   casses et de profondeurs. **Aucune donnée réelle n'a été lue.**
4. **INDEX-SCALE seulement.** Rien ici ne dit quoi que ce soit d'un scanner sur
   100 000 ou 1 000 000 de fichiers physiques.
5. **Une seule machine, une seule exécution par campagne.** Les 21 répétitions
   portent sur la requête, pas sur la construction ni sur la machine.
6. **Deux positions rendent un rapport inférieur à 1.** C'est du bruit à
   l'échelle de quelques centaines de microsecondes, pas un gain.
7. **Aucune capacité produit n'est livrée.** Pas de commande, pas d'IPC, pas
   d'interface, pas de materializer. `F-042`, `F-050` et `F-051` restent
   `PROPOSED`.
8. **Non testé :** la recherche `P-08` à ces tailles — inchangée et toujours
   linéaire dans le corpus, c'est la tranche suivante; l'indexation en flux;
   le watcher; tout replay WebView2, qu'aucune modification d'interface ne
   rendait nécessaire.
9. **Contrôle indépendant non fait.** Ces mesures restent non canoniques.

---

## 10. Bilan par critère du protocole

| Critère | Résultat |
|---|---|
| Ordre déterministe, dossiers d'abord, `NOCASE`, `id` | **tenu**, et prouvé identique à l'ordre préexistant |
| Pagination keyset, sans `OFFSET` sur le chemin produit | **tenu**, prouvé par le plan |
| Curseur sans chemin, sans nom, sans `OFFSET` | **tenu**, prouvé par test |
| Curseur périmé refusé explicitement | **tenu** — `stale`, `foreign`, `parent mismatch` |
| Révision avancée atomiquement à la reconstruction | **tenu** |
| Index servant `parent_id` **et** l'ordre | **tenu** |
| Aucun `USE TEMP B-TREE FOR ORDER BY` | **tenu** |
| Aucun balayage du corpus complet | **tenu** |
| Compte direct exact à coût constant | **tenu** — 12 à 13 µs, audit à 0 désaccord |
| Chaîne d'ancêtres bornée par la profondeur | **tenu** — plafond 512, échec explicite au-delà |
| Aucune collection non bornée | **tenu** — plafond 500, demande au-delà plafonnée |
| Migration sans perte de `seen`, de nœud ni de métadonnée | **tenu**, prouvé sur une base `user_version = 2` |
| **p95 à 1M ≤ 5 × p95 à 100k** | **`PASS`** — pire rapport **2,30** |

---

## 11. Ce que l'orchestrateur doit décider ensuite

`TASK-0029` s'arrête à `IMPLEMENTED`. L'action suivante unique est le
**contrôle indépendant** de cette tranche, sur preuves.

Les coûts dominants encore ouverts, dans l'ordre où le banc les a révélés :

1. la recherche `P-08`, toujours linéaire dans le corpus, avant toute promesse
   au-delà de 100 000;
2. l'indexation et la reconstruction en flux ou par lots, pour supprimer le
   `&[NodeDto]` global et ses 189 Mo;
3. ensuite seulement le materializer progressif, `F-042` / `F-050` / `F-051`, le
   budget de vue candidat, et un rejeu sur une vraie machine `TARGET_CLASS`.

## 12. Documents liés

- [`TASK-0029`](../tasks/TASK-0029-scale-query-foundation.md)
- [`DEC-0030`](../decisions/DEC-0030-bounded-hierarchy-query-contract.md)
- [`DEC-0029`](../decisions/DEC-0029-progressive-materialization-and-scale-boundary.md)
- [`TASK-0028-SCALE-SPIKE-REPORT.md`](TASK-0028-SCALE-SPIKE-REPORT.md) — dont les quatre artefacts et les chiffres sont inchangés
- [`ACTION-0045`](../reviews/ACTION-0045-independent-control.md)
- [`PROGRESSIVE_SCALE_ARCHITECTURE.md §6`](../architecture/PROGRESSIVE_SCALE_ARCHITECTURE.md)
