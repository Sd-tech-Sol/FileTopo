# DEC-0030 — Contrat de requête hiérarchique bornée à l'échelle

- **Date :** 2026-09-09
- **Statut :** `APPROVED` — décision technique **enregistrée**. Son
  implémentation par [`TASK-0029`](../tasks/TASK-0029-scale-query-foundation.md)
  a passé le contrôle indépendant enregistré dans
  [`ACTION-0046`](../reviews/ACTION-0046-independent-control.md).
- **Phase :** étape A — fondation de mise à l'échelle, **avant** tout
  materializer produit
- **Décideur :** orchestrateur technique, par le GO explicite de
  `.orchestrator/NEXT_PROMPT.md`, sous la délégation d'`AGENTS.md`
- **Rédacteur :** Claude Code, agent d'exécution
- **Encadrée par :**
  [`DEC-0029`](DEC-0029-progressive-materialization-and-scale-boundary.md) —
  `APPROVED`, **non modifiée** par la présente décision
- **Document d'architecture :**
  [`PROGRESSIVE_SCALE_ARCHITECTURE.md §6`](../architecture/PROGRESSIVE_SCALE_ARCHITECTURE.md)
- **replaced_by :** —

## Contexte

[`DEC-0029 §D`](DEC-0029-progressive-materialization-and-scale-boundary.md) a
posé que le query engine borné est une primitive d'architecture, en contrats
conceptuels et **sans aucune signature**. `TASK-0028` a ensuite falsifié
l'énoncé « indexer grand, matérialiser petit » sur un banc synthétique, et
[`ACTION-0045`](../reviews/ACTION-0045-independent-control.md) a fermé ce spike
avec une réserve explicite : **l'architecture est structurellement plausible,
mais les requêtes qui fabriquent la petite vue ne sont elles-mêmes pas
bornées.**

Le prototype de banc mesurait la page d'enfants à **p95 ≈ 12,9 ms** sur 100 000
éléments indexés et **p95 ≈ 110,4 ms** sur 1 000 000 — une croissance quasi
linéaire avec la taille de la fratrie, pour une page de taille fixe. Deux causes
structurelles, et non un défaut de réglage :

1. l'ordre d'affichage `kind = 'directory' DESC, name COLLATE NOCASE, id`
   n'était servi par **aucun index** — `idx_nodes_parent(parent_id, name)` porte
   `name` en collation `BINARY` —, donc SQLite triait la **fratrie entière** dans
   un B-tree temporaire pour rendre cent lignes;
2. la pagination se faisait par `OFFSET`, dont le coût croît avec la position
   demandée et dont la stabilité n'est garantie par rien.

Un materializer produit construit sur ces deux requêtes coûterait, pour une page
de 100 enfants, proportionnellement à une fratrie de 250 000 éléments. La
présente décision fixe le contrat qui rend ce materializer techniquement
possible. **Elle n'implémente ni `F-042`, ni `F-050`, ni `F-051`.**

## Décision

### A — ordre des enfants directs

L'ordre fonctionnel **existant est conservé, sans changement silencieux** :

1. les **dossiers avant les autres types** — `kind = 'directory'` d'abord;
2. puis le **nom en `COLLATE NOCASE`**;
3. puis l'**`id`** comme départage déterministe.

C'est exactement l'ordre déjà visible dans `Index::query_nodes` et dans le
prototype de banc de `TASK-0028`. Les collisions de nom, y compris celles qui ne
diffèrent que par la casse, restent **totalement ordonnées** par l'`id`.

**Encodage durable de cet ordre.** Deux colonnes générées, dérivées et jamais
saisies, portent la clé de tri sous une collation `BINARY` :

| Colonne | Expression | Rôle |
|---|---|---|
| `child_order_rank` | `CASE WHEN kind = 'directory' THEN 0 ELSE 1 END` | dossiers d'abord, en ordre **croissant** |
| `name_fold` | `lower(name)` | le nom replié, **ordonné comme `COLLATE NOCASE`** |

`lower()` et `NOCASE` replient tous deux **le seul ASCII** et laissent le reste
des octets intact : trier par `name_fold` en `BINARY` produit **le même ordre**
que trier par `name COLLATE NOCASE`. Ce n'est pas une hypothèse — `TASK-0029` le
prouve par un test d'équivalence sur une fixture qui mélange casses, doublons et
caractères non ASCII.

L'ordre canonique est donc `child_order_rank ASC, name_fold ASC, id ASC`,
**strictement total**, et entièrement croissant — ce qui le rend seekable par un
index.

### B — pagination par keyset, jamais par `OFFSET`

Le chemin produit interne des enfants directs devient **keyset/cursor**.
`OFFSET` n'est **plus** la source de vérité de la navigation progressive : ni
pour la position, ni pour la continuation.

Une page rend, au plus, `page_size` lignes et — **seulement s'il reste des
lignes** — un curseur de continuation. Une page qui ne rend pas de curseur
déclare la fin de la fratrie; elle ne la laisse pas deviner.

`Index::query_nodes`, chemin de **recherche** `P-08`, garde son `OFFSET` : il est
hors du périmètre de cette décision et n'est pas modifié.

### C — un curseur appartient à une révision d'index

Un curseur est **lié à un index précis et à une révision précise de cet index** :

- l'index porte une **identité durable** `index_id`, écrite une fois à la
  création de la base et jamais réécrite;
- l'index porte une **révision monotone** `index_revision`, qui **avance d'un
  cran à chaque reconstruction**, dans **la même transaction** que le
  remplacement des lignes. La révision et les données visibles changent donc
  ensemble, ou pas du tout;
- un curseur porte `index_id`, `index_revision`, le `parent_id` et l'`id` de la
  dernière ligne rendue.

Trois refus explicites, jamais silencieux :

| Situation | Réponse |
|---|---|
| révision du curseur ≠ révision courante | erreur **`stale`** — la reprise est refusée |
| `index_id` du curseur ≠ identité de l'index | erreur **`foreign`** |
| curseur appliqué à un autre parent | erreur **`parent mismatch`** |

Un curseur périmé **ne continue jamais silencieusement** dans un index
différent. Deux cerveaux indépendants ont deux `index_id` distincts et ne
partagent donc **ni révision ni curseur**, même si leurs compteurs de révision
affichent le même nombre.

**Ce que le curseur ne contient pas :** aucun chemin, absolu ou relatif; aucun
nom; aucune donnée personnelle; aucune position `OFFSET`. Il ne porte que des
identifiants et un numéro de révision. La clé de tri de la ligne de reprise est
**relue dans l'index** par recherche sur clé primaire, elle n'est pas
transportée.

### D — sémantique du compte d'agrégat sur le hot path

Le compte obligatoire et exact d'un agrégat hiérarchique de `F-051` représente
les **enfants directs non matérialisés** sous un parent :

> `249 857 enfants directs non matérialisés`

Ce nombre est **exact**, jamais estimé, jamais « 999+ ». Il est obtenu à coût
constant depuis la colonne durable `child_count`, elle-même calculée par le
producteur du corpus à partir des lignes réellement émises. `TASK-0029` en
**prouve l'exactitude** par un audit qui compare `child_count` au `COUNT(*)` SQL
réel, nœud par nœud, après indexation **et** après reconstruction.

**Un agrégat ne prétend pas que ce nombre est le total de tous les descendants**
des branches qu'il résume. Il dit ce qu'il compte.

Un `total descendants` exact **peut** exister plus tard, comme **information
séparée et nommée**, à la seule condition d'être **pré-calculé et maintenu à
coût raisonnable**. **Il est interdit de rendre une CTE récursive sur tout le
sous-arbre obligatoire dans le hot path du materializer** : le coût d'une telle
requête suit la taille du sous-arbre, pas le budget de vue, ce qui détruirait
précisément la borne que cette décision installe.

Cohérence avec
[`PROGRESSIVE_SCALE_ARCHITECTURE.md §5`](../architecture/PROGRESSIVE_SCALE_ARCHITECTURE.md) :
un agrégat reste **un résumé calculé**, jamais un faux dossier, jamais une
relation.

### E — index SQL et migration

Le schéma porte un index capable de servir **à la fois** le filtre `parent_id`
**et** l'ordre d'affichage, sans tri temporaire :

```sql
CREATE INDEX idx_nodes_child_order
    ON nodes(parent_id, child_order_rank, name_fold, id);
```

Trois propriétés sont **exigées et prouvées par `EXPLAIN QUERY PLAN`** sur le
chemin mesuré :

1. l'index est effectivement utilisé pour `parent_id` **et** pour l'ordre;
2. **aucun `USE TEMP B-TREE FOR ORDER BY`**;
3. aucun balayage du corpus complet, et **aucun `OFFSET`** dans la requête de
   continuation.

La continuation utilise une **comparaison de valeurs de ligne**
`(child_order_rank, name_fold, id) > (?, ?, ?)`, que SQLite convertit en
**recherche indexée**. C'est la raison technique pour laquelle `name_fold` existe
en `BINARY` plutôt qu'un `name COLLATE NOCASE` posé dans la comparaison :
`TASK-0029` a mesuré que la variante `COLLATE` dégrade la recherche en balayage
et coûte, sur 200 000 frères, **≈ 31 700 µs** contre **≈ 60 µs** pour la variante
repliée. La forme retenue n'est pas une préférence de style.

**Migration.** `user_version` passe de `2` à `3`. Les deux colonnes générées sont
ajoutées en `VIRTUAL` — elles ne coûtent aucun octet de table, se recalculent
depuis `kind` et `name`, et **ne peuvent pas dériver** de leur source. La
migration est **idempotente**, s'applique à une base existante sans la réécrire,
et ne perd **ni `seen`, ni nœud, ni métadonnée**.

## Conséquences

- Le cœur Rust/SQLite gagne des **primitives produit internes** — page d'enfants
  bornée, curseur keyset, compte direct exact, chaîne d'ancêtres bornée,
  identité et révision d'index. **Aucune commande Tauri, aucun contrat IPC,
  aucun changement d'interface** n'est créé : l'IPC prématuré est explicitement
  refusé.
- Toute collection rendue par ces primitives est **bornée par un maximum fini
  documenté**. Une demande au-delà du maximum est **plafonnée**, jamais servie
  entière.
- `MAX_NODES_PER_MAP = 5000` est **inchangé**. `F-042`, `F-050` et `F-051`
  restent `PROPOSED`; seule la **sémantique du compte** de `F-051` est clarifiée
  ici, sans que la capacité produit existe.
- `Index::query_nodes` et le chemin `P-08` sont **inchangés**.
- Le prototype de banc `TASK-0028` reste tel quel, avec ses chiffres : il est la
  mesure de l'ancien chemin, et cette décision ne le réécrit pas.

## Alternatives écartées

| Alternative | Pourquoi elle est écartée |
|---|---|
| **Garder `OFFSET` et poser un index** | Supprime le tri temporaire mais pas le coût de position : atteindre la page *k* balaye toujours *k × page_size* lignes. Mesuré à 200 000 frères : ≈ 20 600 µs en fin de fratrie contre ≈ 60 µs en keyset. |
| **Curseur portant le nom de la dernière ligne** | Transporterait une donnée d'origine utilisateur hors du cœur pour rien : la clé de tri se relit en une recherche sur clé primaire. |
| **`name COLLATE NOCASE` dans la comparaison de valeurs de ligne** | Mesuré : SQLite retombe sur un balayage filtré. ≈ 31 700 µs contre ≈ 60 µs, sur la même base et le même index. |
| **Index d'expression `(kind = 'directory') DESC, name COLLATE NOCASE`** | Sert l'ordre, mais un ordre **mixte ASC/DESC** ne peut pas s'exprimer en valeurs de ligne, donc interdit la recherche indexée de continuation. |
| **Colonnes de tri réelles, écrites à l'insertion** | Mesurées équivalentes, mais elles peuvent **dériver** de `kind` et `name`, et coûtent de la table. Une colonne générée ne peut pas mentir. |
| **`COUNT(*)` par page pour le total direct** | Recompterait 250 000 lignes pour un nombre que l'index possède déjà en `child_count`. |
| **CTE récursive de sous-arbre sur le hot path** | Coût proportionnel au sous-arbre, pas au budget de vue : reprendrait d'une main la borne posée de l'autre. |
| **Curseur numéroté sans révision** | Continuerait silencieusement dans un index reconstruit, en sautant ou en dupliquant des lignes sans le dire. |

## Preuves attendues

`TASK-0029` doit rendre, et **rien de moins** :

- l'`EXPLAIN QUERY PLAN` des requêtes de première page et de continuation, avec
  l'absence de `USE TEMP B-TREE FOR ORDER BY` vérifiée comme critère structurel;
- des mesures de page de **100** enfants — première page, curseur médian, curseur
  proche de la fin, page vide après la dernière ligne — sur corpus synthétiques
  de **100 000** et **1 000 000** d'éléments indexés, en p50/p95/max sur au moins
  21 exécutions après échauffement séparé;
- le critère d'ingénierie **p95 à 1M ≤ 5 × p95 à 100k**, à position comparable.
  Un échec se **documente**; le seuil ne se déplace pas;
- des tests fonctionnels sur l'ordre exact, les noms identiques, les casses en
  collision, la continuation sans doublon ni omission, le refus de curseur
  périmé, l'avancée de révision après reconstruction, l'exactitude de
  `child_count` et la préservation de `seen` après migration.

## Preuves rendues

Voir [`TASK-0029 §8`](../tasks/TASK-0029-scale-query-foundation.md),
[`TASK-0029-SCALE-QUERY-REPORT.md`](../performance/TASK-0029-SCALE-QUERY-REPORT.md)
et la section correspondante de [`VALIDATION.md`](../ai/VALIDATION.md).

Les mesures de `TASK-0029` portent la mention `ENGINEERING_MEASUREMENT / NOT A
PRODUCT CLAIM / NONCANONICAL UNTIL INDEPENDENT CONTROL`. **Elles ne sont pas
canoniques** et n'entrent pas dans `X5`.

**Non testé par la présente décision :** elle n'exécute rien. Tout ce qu'elle
avance de mesuré vient de `TASK-0029`, dont le contrôle indépendant est
enregistré dans [`ACTION-0046`](../reviews/ACTION-0046-independent-control.md).
