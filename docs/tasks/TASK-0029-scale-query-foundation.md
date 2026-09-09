# TASK-0029 — Scale Query Foundation — Bounded Hierarchy Paging

- **Date :** 2026-09-09
- **Branche :** `build/v0.2-a13-scale-query-foundation`
- **Base contrôlée :** `b3923e0001034d1c752c9e416d5ca9aeabd830d5`
- **Statut courant :** `VERIFIED` — verdict indépendant enregistré dans
  [`ACTION-0046`](../reviews/ACTION-0046-independent-control.md). Claude Code a
  livré `IMPLEMENTED`; Codex enregistre le verdict externe et ne s'attribue pas
  la vérification.
- **Transitions permises :** `PROPOSED → APPROVED → IN_PROGRESS →
  IMPLEMENTED → VERIFIED`. Le GO technique de `.orchestrator/NEXT_PROMPT.md`
  autorise `IN_PROGRESS` après le gel documentaire. **L'exécuteur ne
  s'attribue jamais `VERIFIED`.**
- **Agent d'exécution :** Claude Code
- **Nature :** **FONDATION PRODUIT INTERNE Rust/SQLite.** **Aucune commande
  Tauri, aucun changement d'interface, aucun materializer produit, aucun
  renderer.**
- **Décision encadrante :**
  [`DEC-0030`](../decisions/DEC-0030-bounded-hierarchy-query-contract.md) —
  `APPROVED` par le GO de l'orchestrateur, implémentation contrôlée par
  [`ACTION-0046`](../reviews/ACTION-0046-independent-control.md).
- **Décision antérieure :**
  [`DEC-0029`](../decisions/DEC-0029-progressive-materialization-and-scale-boundary.md)
  — `APPROVED`, **non modifiée** par cette tâche.
- **Architecture encadrante :**
  [`PROGRESSIVE_SCALE_ARCHITECTURE.md §6`](../architecture/PROGRESSIVE_SCALE_ARCHITECTURE.md)
- **Contribue à :** la faisabilité technique du futur materializer.
  **Ne fait avancer l'état d'aucune fonction produit.**

## 1. Objectif unique

Rendre la lecture hiérarchique des **enfants directs réellement bornée et
index-driven**, pour qu'une page de 100 enfants ne coûte plus
proportionnellement à une fratrie de 250 000 éléments.

[`ACTION-0045`](../reviews/ACTION-0045-independent-control.md) a fermé
`TASK-0028` en retenant que l'architecture « indexer grand, matérialiser
petit » est **structurellement plausible**, avec une réserve explicite : **les
requêtes qui fabriquent la petite vue doivent elles-mêmes être bornées.** Le
banc avait mesuré la page d'enfants à p95 ≈ 12,9 ms sur 100 000 éléments et
p95 ≈ 110,4 ms sur 1 000 000 — une croissance quasi linéaire pour une page de
taille fixe.

Cette tâche supprime cette croissance structurelle. **Elle ne publie aucun
temps marketing et ne promet aucune performance produit.**

## 2. Préconditions contrôlées

Vérifiées avant toute écriture, le 2026-09-09 :

| Précondition | Contrôle |
|---|---|
| Branche de départ | `build/v0.2-a12-synthetic-scale-spike`, arbre propre |
| Synchronisation | `git fetch origin` puis fast-forward seul — `0afb72f → b3923e0` |
| `HEAD` | `b3923e0`, le commit d'orchestration portant le prompt |
| Parent direct de `HEAD` | `0afb72fd271eacb4a42629b2566d5daa8633416b` |
| `TASK-0028` | `VERIFIED` |
| `ACTION-0045` | `CLOSED` |
| `DEC-0029` | `APPROVED` |
| `X5` | **36**, inchangé pour toute la durée de la tâche |
| `origin/main` | `1a7d652ca48281c1687f6d1404c56a1404df91d8`, non touché |
| `TASK-0029` / `DEC-0030` | libres avant le gel |
| Branche de travail | `build/v0.2-a13-scale-query-foundation`, créée et publiée |

## 3. Périmètre écrit et fichiers autorisés

### 3.1 Documents gelés avant tout code

- `docs/decisions/DEC-0030-bounded-hierarchy-query-contract.md`
- `docs/tasks/TASK-0029-scale-query-foundation.md`

### 3.2 Cœur produit interne, modifié

- `src-tauri/src/index.rs` — migration de schéma, révision d'index, primitives
  hiérarchiques exposées au crate.
- `src-tauri/src/hierarchy.rs` — **créé** : ordre canonique, curseur keyset,
  page bornée, compte direct exact, chaîne d'ancêtres bornée, audit de
  `child_count`.
- `src-tauri/src/lib.rs` — déclaration des modules seulement.

### 3.3 Banc de mesure créé après le gel, `#[cfg(test)]`

- `src-tauri/src/scale_query/mod.rs`
- `src-tauri/src/scale_query/campaigns.rs`
- `scripts/task0029-scale-query.ps1`

### 3.4 Preuves produites

- `docs/performance/TASK-0029-SCALE-QUERY-REPORT.md`
- `docs/performance/runs/TASK-0029-SQF-100k.json`
- `docs/performance/runs/TASK-0029-SQF-1m-index.json`

**Aucun de ces artefacts n'est canonique et aucun n'entre dans `X5`.**

### 3.5 Documents de session

`docs/ai/CURRENT_STATE.md`, `docs/ai/NEXT_ACTION.md`, `docs/ai/HANDOFF.md`,
`docs/ai/VALIDATION.md`, `docs/ai/CHANGELOG_AI.md`, `.orchestrator/RESULT.md`.

### 3.6 Hors périmètre, non touchés

`graph/`, `src/` (frontend), les commandes Tauri, `docs/architecture/`,
la matrice de fonctions, le contrat de parité, les quatre artefacts
`TASK-0028` et leurs chiffres, les 36 noms scellés de `X5`.

## 4. Ce que la tâche n'a pas le droit de faire

- Implémenter `F-042`, `F-050` ou `F-051` comme capacité produit.
- Exposer une commande Tauri, une route, un contrat IPC ou un élément
  d'interface.
- Toucher au materializer produit, au renderer, à React Flow, Sigma, ELK,
  Cytoscape ou Pixi.
- Optimiser la recherche `P-08` — FTS, trigram ou autre : **tranche suivante**.
- Rendre l'indexation ou la reconstruction en flux ou par lots : **tranche
  suivante**.
- Toucher au watcher, à `ReadDirectoryChangesExW` ou à l'USN.
- Toucher à Graphify, à Forge dans le runtime, à l'IA, aux LLM, au cloud, au
  RAG ou aux embeddings.
- Toucher à l'identité physique `F-046` ou lancer une campagne SHA-256.
- Modifier `MAX_NODES_PER_MAP`, qui reste **5 000**.
- Ajouter une dépendance externe : **aucune n'a été ajoutée**.
- Créer `TASK-0030` ou `DEC-0031`.
- Lire, lister ou écrire hors du dépôt public; utiliser une donnée réelle ou
  personnelle.

## 5. Ce qui est implémenté

### 5.1 Ordre canonique et index

L'ordre fonctionnel existant — dossiers d'abord, `name COLLATE NOCASE`, puis
`id` — est **conservé** et rendu index-driven par deux colonnes générées
`VIRTUAL` (`child_order_rank`, `name_fold`) et l'index
`idx_nodes_child_order(parent_id, child_order_rank, name_fold, id)`.
`user_version` passe de `2` à `3` par une migration idempotente qui ne réécrit
pas la table.

### 5.2 Pagination keyset

`Index::children_page` rend au plus `page_size` lignes, plafonné par
`MAX_CHILDREN_PAGE_SIZE`, dans l'ordre canonique, avec un curseur de
continuation **seulement s'il reste des lignes**. La continuation est une
comparaison de valeurs de ligne convertie en recherche indexée; **aucun
`OFFSET`** n'intervient.

### 5.3 Révision et identité d'index

`schema_meta` porte `index_id` — écrit une fois, jamais réécrit — et
`index_revision` — monotone, incrémentée **dans la transaction même** de
`replace_nodes`. Un curseur porte les deux et est refusé explicitement s'il ne
correspond plus.

### 5.4 Comptes exacts

`Index::direct_child_count` lit la colonne durable `child_count` par recherche
sur clé primaire. `hierarchy::child_count_mismatches` audite cette colonne
contre le `COUNT(*)` réel et sert d'invariant testé, pas de promesse.

### 5.5 Chaîne d'ancêtres bornée

`Index::ancestor_chain` remonte au parent par clé primaire, du plus proche à la
racine, plafonnée à `MAX_ANCESTOR_CHAIN`; au-delà elle **échoue explicitement**
plutôt que de rendre une collection non bornée.

## 6. Contraintes d'exécution respectées

- Tout se passe dans le dépôt public. Le banc écrit sous
  `.filetopo-sandbox/task0029`, ignoré par Git depuis `TASK-0016`.
- Corpus et fixtures **entièrement synthétiques**, dérivés du générateur
  déterministe de `TASK-0028`. **Aucune donnée réelle, aucun chemin personnel.**
- Le banc est `#[cfg(test)]` et ses campagnes sont `#[ignore]` : un
  `cargo test --lib` ordinaire ne les démarre pas.
- Chaque artefact porte la mention `ENGINEERING_MEASUREMENT / NOT A PRODUCT
  CLAIM / NONCANONICAL UNTIL INDEPENDENT CONTROL` et refuse d'écrire un nom
  scellé.

## 7. Deux couches, jamais confondues

- **INDEX-SCALE 100k** — 100 000 éléments **indexés** sur le schéma FileTopo
  courant, construits depuis le plan synthétique. `TASK-0029` mesure un coût de
  **requête**; elle ne rejoue pas le scanner et ne prétend rien sur lui.
- **INDEX-SCALE 1M** — 1 000 000 d'éléments **indexés**. Ce n'est **pas** un
  « scan 1M » : aucun million de fichiers physiques n'a été créé ni parcouru.

## 8. Résultats

### 8.1 Le résultat principal

`p95` d'une page de **100** enfants directs, sur le dossier le plus large du
corpus — 24 981 enfants à 100k, 249 981 à 1M :

| Position | 100k | 1M | Rapport |
|---|---|---|---|
| première page | 611 µs | 322 µs | **0,53** |
| curseur médian | 410 µs | 698 µs | **1,70** |
| curseur proche de la fin | 387 µs | 892 µs | **2,30** |
| curseur après le dernier élément | 219 µs | 175 µs | **0,80** |

**Critère d'ingénierie « p95 à 1M ≤ 5 × p95 à 100k » : `PASS`**, pire rapport
**2,30**. Le rapport est calculé par la campagne 1M elle-même, qui relit
l'artefact 100k, et non à la main.

Le prototype `OFFSET` de `TASK-0028`, appelé tel quel sur la même base et dans
le même processus, va de 13,6 ms à 116,7 ms en première page et de 32,8 ms à
351,2 ms en fin de fratrie — **un rapport de 8,6 à 10,8**. La croissance
quasi linéaire que `ACTION-0045` avait relevée est donc supprimée sur le chemin
produit interne, et reproduite sur l'ancien, ce qui montre que les deux
campagnes parlent bien du même banc.

### 8.2 Critères structurels

`EXPLAIN QUERY PLAN`, vérifié **par assertion pendant la campagne** :

- première page : `SEARCH nodes USING INDEX idx_nodes_child_order (parent_id=?)`;
- continuation :
  `SEARCH nodes USING INDEX idx_nodes_child_order (parent_id=? AND (child_order_rank,name_fold)>(?,?))`;
- **aucun `USE TEMP B-TREE FOR ORDER BY`**, aucun balayage du corpus, aucun
  `OFFSET` dans la requête de continuation.

L'ancien chemin, publié à côté, montre toujours
`USE TEMP B-TREE FOR ORDER BY` : le nouvel index ne l'accélère pas par
accident.

### 8.3 Comptes et bornes

- compte exact d'enfants directs : **12 à 13 µs**, indépendant de la taille de
  la fratrie;
- audit `child_count` contre le `COUNT(*)` réel, sur **tout le corpus** :
  **0 désaccord** aux deux tailles;
- chaîne d'ancêtres de 26 niveaux : p95 237 à 351 µs, plafond 512;
- CTE récursive de sous-arbre : **342 ms** à 1M — mesurée une fois pour montrer
  ce que `DEC-0030 §D` interdit d'imposer au hot path.

### 8.4 Validations

| Validation | Commande | Résultat |
|---|---|---|
| Tests Rust, suite complète | `cargo test --lib` | **285 passés, 0 échec, 5 ignorés** (les cinq campagnes, `#[ignore]` par conception) |
| Primitives bornées | `cargo test --lib hierarchy` | **17 passés, 0 échec** |
| Index et migration | `cargo test --lib index::` | **5 passés, 0 échec** |
| Harness de mesure | `cargo test --lib scale_query` | **9 passés, 0 échec, 2 ignorés** |
| Campagnes | `scripts/task0029-scale-query.ps1` | **2 campagnes réussies**, 2 artefacts écrits |
| Tests TypeScript | `pnpm test` | **261 passés, 0 échec**, 15 fichiers |
| Typage | `pnpm check` | **propre** |
| Build frontend | `pnpm build` | **réussi**, 61 modules |
| Build produit Rust | `cargo build` | **réussi**; seul avertissement `SUGGESTION_STATES` (`relations.rs`), **préexistant** et sans lien |
| Hygiène du diff | `git diff --check` | **propre** |
| `X5` | liste Rust et liste PowerShell | **36** des deux côtés, inchangée |
| `origin/main` | `git rev-parse origin/main` | `1a7d652ca48281c1687f6d1404c56a1404df91d8`, non touché |
| Artefacts `TASK-0028` | `git diff b3923e0..HEAD -- docs/performance/runs/` | **aucun des quatre modifié** |

Aucun replay WebView2 n'a été exécuté, et aucun n'était requis : `TASK-0029` ne
touche ni interface, ni renderer, ni commande.

## 9. Limites déclarées

1. **Banc hors classe cible.** i9-9900K, 32 Gio, `DEVELOPMENT_BENCH_NOT_ACCEPTANCE`.
   **Aucune cible « machine modeste » n'est validée.**
2. **Profil `debug`.** La suite de tests du crate ne compile pas en `release` —
   constat antérieur à cette tâche. Les valeurs absolues ne sont pas un
   plancher de performance; seule la **croissance** est exploitable.
3. **INDEX-SCALE seulement.** Aucun fichier physique n'a été créé. Rien ici ne
   dit quoi que ce soit d'un scanner à 100 000 ou 1 000 000 de fichiers.
4. **Corpus synthétique de forme unique** — un `hub` très large, une épine
   profonde. Une arborescence réelle a d'autres distributions de noms, de
   casses et de profondeurs. Aucune donnée réelle n'a été lue.
5. **Deux positions rendent un rapport inférieur à 1.** C'est du bruit à
   l'échelle de quelques centaines de microsecondes, pas un gain.
6. **`Index::replace_nodes` prend toujours tout le corpus en mémoire** —
   189 Mo de working set à 1M. `TASK-0029` **ne corrige pas** ce point;
   l'indexation en flux est la tranche suivante et le constat de `TASK-0028`
   reste entier.
7. **La recherche `P-08` est inchangée** et reste linéaire dans le corpus.
   Son `OFFSET` est conservé, hors périmètre.
8. **Aucune capacité produit n'est livrée** : pas de commande, pas d'IPC, pas
   d'interface, pas de materializer.
9. **Contrôle indépendant fait par l'orchestrateur technique indépendant** et
   enregistré dans [`ACTION-0046`](../reviews/ACTION-0046-independent-control.md).
   Les deux artefacts restent non canoniques et hors `X5`.
10. La dette préexistante de chemins locaux personnels dans d'anciens documents
    reste hors périmètre; `TASK-0029` n'en ajoute pas.

## 10. Documents liés

- [`DEC-0030`](../decisions/DEC-0030-bounded-hierarchy-query-contract.md)
- [`DEC-0029`](../decisions/DEC-0029-progressive-materialization-and-scale-boundary.md)
- [`TASK-0028`](TASK-0028-synthetic-scale-feasibility-spike.md)
- [`ACTION-0045`](../reviews/ACTION-0045-independent-control.md)
- [`PROGRESSIVE_SCALE_ARCHITECTURE.md`](../architecture/PROGRESSIVE_SCALE_ARCHITECTURE.md)
- [`TASK-0029-SCALE-QUERY-REPORT.md`](../performance/TASK-0029-SCALE-QUERY-REPORT.md)

## 11. Contrôle indépendant

**Effectué par l'orchestrateur technique indépendant** et enregistré dans
[`ACTION-0046`](../reviews/ACTION-0046-independent-control.md) :
`TASK-0029 = VERIFIED — PASS` dans sa portée exacte de fondation Rust/SQLite et
mesure d'ingénierie non produit.

Claude Code était l'exécuteur de `TASK-0029`. Codex est seulement le rédacteur
de l'enregistrement du verdict externe et ne s'attribue pas `VERIFIED`.
