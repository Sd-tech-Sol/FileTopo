# TASK-0029 — Scale Query Foundation — Bounded Hierarchy Paging

- **Date :** 2026-09-09
- **Branche :** `build/v0.2-a13-scale-query-foundation`
- **Base contrôlée :** `b3923e0001034d1c752c9e416d5ca9aeabd830d5`
- **Statut courant :** `IN_PROGRESS`
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
  `APPROVED` par le GO de l'orchestrateur, **implémentation en attente de
  contrôle indépendant**.
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

À compléter à la livraison.

## 9. Limites déclarées

À compléter à la livraison.

## 10. Documents liés

- [`DEC-0030`](../decisions/DEC-0030-bounded-hierarchy-query-contract.md)
- [`DEC-0029`](../decisions/DEC-0029-progressive-materialization-and-scale-boundary.md)
- [`TASK-0028`](TASK-0028-synthetic-scale-feasibility-spike.md)
- [`ACTION-0045`](../reviews/ACTION-0045-independent-control.md)
- [`PROGRESSIVE_SCALE_ARCHITECTURE.md`](../architecture/PROGRESSIVE_SCALE_ARCHITECTURE.md)
- [`TASK-0029-SCALE-QUERY-REPORT.md`](../performance/TASK-0029-SCALE-QUERY-REPORT.md)

## 11. Contrôle indépendant

**Requis, et non effectué par l'exécuteur.** `TASK-0029` s'arrête à
`IMPLEMENTED`. L'action suivante unique est le contrôle indépendant sur
preuves.
