# TASK-0028 — Synthetic Scale Feasibility Spike

- **Date :** 2026-09-07
- **Branche :** `build/v0.2-a12-synthetic-scale-spike`
- **Base contrôlée :** `670704dbe563c77bd71d5f353139a78a46779881`
- **Statut courant :** `IN_PROGRESS` → livré `IMPLEMENTED`. **Jamais
  `VERIFIED` par l'exécuteur** — le contrôle indépendant appartient à
  l'orchestrateur technique.
- **Transitions permises :** `PROPOSED → APPROVED → IN_PROGRESS →
  IMPLEMENTED → VERIFIED`. Le GO technique de `.orchestrator/NEXT_PROMPT.md`
  autorise `IN_PROGRESS` après le gel des préconditions.
- **Agent d'exécution :** Claude Code
- **Nature :** **BANC SYNTHÉTIQUE / PREUVE D'ARCHITECTURE.** **Aucune
  implémentation produit du materializer, du query engine borné ou d'un
  renderer.**
- **Décision encadrante :**
  [`DEC-0029`](../decisions/DEC-0029-progressive-materialization-and-scale-boundary.md)
  — `APPROVED`, non modifiée par cette tâche.
- **Architecture encadrante :**
  [`PROGRESSIVE_SCALE_ARCHITECTURE.md §11`](../architecture/PROGRESSIVE_SCALE_ARCHITECTURE.md)
- **Contribue à :** la falsification de la frontière de mise à l'échelle.
  **Ne fait avancer l'état d'aucune fonction produit.**

## 1. Objectif unique

Falsifier, sur un banc synthétique reproductible à **10 000 / 100 000 /
1 000 000 d'éléments indexés**, l'énoncé approuvé par `DEC-0029` :

> **FileTopo indexe grand, matérialise petit, et ne rend que le contexte
> utile.**

La question précise à laquelle le spike répond :

> **L'architecture « indexer grand, matérialiser petit » est-elle techniquement
> plausible avec le cœur local Rust/SQLite et un rendu borné, sans faire
> dépendre le coût graphique de la taille totale du corpus ?**

Un **FAIL technique honnête est une donnée valide**. `RESULT: DONE` signifie
que le protocole a été exécuté, pas que toutes les hypothèses ont réussi.

## 2. Préconditions contrôlées

| Précondition | Constat |
|---|---|
| Racine Git | racine du dépôt public, confirmée par `git rev-parse --show-toplevel`; le chemin local n'est pas consigné |
| Checkout de départ | `build/v0.2-a11-progressive-scale-architecture` |
| Arbre local | **propre** avant et après le fast-forward |
| `git fetch origin` | exécuté |
| Fast-forward | `db65546..670704d`, **fast-forward seul** |
| `HEAD` d'orchestration | `670704dbe563c77bd71d5f353139a78a46779881` |
| Parent direct exigé | `db655468789d5ace6853950c52232027c6b56e71` — **conforme** |
| `TASK-0027` | `VERIFIED` |
| `ACTION-0044` | `CLOSED` |
| `DEC-0029` | `APPROVED` |
| `X5` | **36** noms — comptés dans `src/map/runArtifacts.ts` |
| `origin/main` | `1a7d652ca48281c1687f6d1404c56a1404df91d8` — **non touché** |
| `TASK-0028` préexistante | **aucune** |
| `TASK-0029` / `DEC-0030` | **aucune, et aucune n'est créée** |
| Branche de travail | `build/v0.2-a12-synthetic-scale-spike`, **créée et publiée** |

**Aucune divergence n'a été constatée.** Aucune condition de `STOP / BLOCKED`
n'a été rencontrée à l'ouverture.

## 3. Périmètre écrit et fichiers autorisés

### 3.1 Documents gelés avant tout code

- `docs/tasks/TASK-0028-synthetic-scale-feasibility-spike.md` — cette fiche
- `docs/performance/TASK-0028-SCALE-SPIKE-PROTOCOL.md`

### 3.2 Harness créé après le gel

- `src-tauri/src/scale_spike/mod.rs`
- `src-tauri/src/scale_spike/generator.rs`
- `src-tauri/src/scale_spike/profile.rs`
- `src-tauri/src/scale_spike/census.rs`
- `src-tauri/src/scale_spike/bounded.rs`
- `src-tauri/src/scale_spike/campaigns.rs`
- `src-tauri/src/scale_spike/report.rs`
- `scripts/task0028-scale-spike.ps1`
- `scripts/task0028-ss7-bounded-view-webview2.ps1`
- `src/map/boundedViewCardinality.test.tsx`

### 3.3 Modifié

Deux fichiers, **deux ajouts, tous deux `#[cfg(test)]`**. Aucune signature
existante n'est changée, aucune ligne existante n'est supprimée.

- `src-tauri/src/lib.rs` — la déclaration `#[cfg(test)] mod scale_spike;`.
- `src-tauri/src/index.rs` — `Index::connection_for_bench()`, un accès en
  lecture à la connexion, gardé par `#[cfg(test)]`, pour que le harness
  prototype ses requêtes bornées contre le **vrai** schéma au lieu de le
  recopier.

Voir §5.

### 3.4 Preuves produites

- `docs/performance/TASK-0028-SCALE-SPIKE-REPORT.md`
- `docs/performance/runs/TASK-0028-SS-10k.json`
- `docs/performance/runs/TASK-0028-SS-100k.json`
- `docs/performance/runs/TASK-0028-SS-1m-index.json`
- `docs/performance/runs/TASK-0028-SS-bounded-view-webview2.json`

### 3.5 Documents de session

`docs/ai/CURRENT_STATE.md`, `docs/ai/NEXT_ACTION.md`, `docs/ai/HANDOFF.md`,
`docs/ai/VALIDATION.md`, `docs/ai/CHANGELOG_AI.md`, `.orchestrator/RESULT.md`.

### 3.6 Hors périmètre, non touchés

`graph/`, `main`, `DEC-0029`, `MAX_NODES_PER_MAP`, l'état de `F-042`, `F-050`,
`F-051`, la liste `X5`, les 36 preuves scellées, `README`, `PROJECT_VISION`,
`ROADMAP`, tout renderer, tout watcher, Graphify, Forge.

## 4. Ce que la tâche n'a pas le droit de faire

- Exposer une **nouvelle commande produit** ou un nouveau comportement
  accessible en utilisation normale.
- Remplacer ou déplacer **`MAX_NODES_PER_MAP = 5000`**.
- **Implémenter** le progressive materializer ou le query engine borné dans
  l'application.
- **Choisir** un renderer.
- Changer l'état produit de **`F-042` / `F-050` / `F-051`**.
- Créer **`DEC-0030`** ou **`TASK-0029`**.
- Étendre **`X5`**.
- Toucher une **donnée réelle**, un chemin personnel, un secret.
- Lancer les campagnes **SHA-256** de `TASK-0023` / `TASK-0026`.
- Publier un chiffre de benchmark hors des artefacts `TASK-0028`.

## 5. Justification des ajouts `#[cfg(test)]` sous `src-tauri/`

Le protocole demande un harness isolé. Un crate séparé sous `tools/` aurait dû
**recopier le schéma SQLite et les types `NodeDto`**, ce que le GO interdit
explicitement (« Ne pas créer un second modèle produit concurrent »). Les
modules `domain`, `index`, `scanner` et `map` sont **privés au crate**
(`mod domain;` … dans `src-tauri/src/lib.rs`), donc inatteignables depuis
`src-tauri/tests/`.

Le harness vit donc **dans le crate, derrière `#[cfg(test)]`** :

```rust
#[cfg(test)]
mod scale_spike;
```

Conséquences vérifiables :

- le module **n'est compilé que par `cargo test`**; il est absent de tout
  binaire produit, debug ou release;
- il n'ajoute **aucune commande Tauri**, aucune route, aucun élément
  d'interface;
- il **réutilise** `crate::domain::NodeDto`, `crate::index::Index`,
  `crate::scanner::scan_tree_controlled` et `crate::map::layout` sans les
  modifier;
- aucune signature publique existante n'est changée.

Le second ajout, `Index::connection_for_bench()`, obéit à la même règle : il
est lui aussi derrière `#[cfg(test)]`, ne rend qu'une référence en lecture, et
existe pour que les requêtes bornées du banc s'exécutent contre le **schéma
réel** plutôt que contre une copie.

**Aucun comportement normal du produit n'est modifié.**

## 6. Contraintes d'exécution respectées

- **`I-1`** — la source synthétique est **lue seulement** pendant la mesure;
  une empreinte structurelle est calculée avant et après chaque campagne.
- **`I-2`** — rien de FileTopo n'est écrit dans la racine analysée : la source
  et l'index de banc vivent côte à côte sous `.filetopo-sandbox/task0028/`,
  répertoire **ignoré par Git** depuis `TASK-0016`.
- **`I-3`** — aucun contenu de document n'est lu; seules des métadonnées
  d'arborescence sont observées.
- **`DEC-0025`** — aucune observation de contenu exact n'est produite; aucune
  campagne de hachage n'est lancée.
- **`DEC-0028`** — la frontière des doublons exacts n'est pas sollicitée.
- **`R8`** — aucun chiffre n'est publié hors des artefacts `TASK-0028`, tous
  marqués `ENGINEERING_MEASUREMENT / NOT A PRODUCT CLAIM / NONCANONICAL UNTIL
  INDEPENDENT CONTROL`.
- **`P-08`** — la recherche exacte et paginée est mesurée sur 100 000, comme
  l'exige la parité.

## 7. Deux couches, jamais confondues

| Couche | Ce qu'elle prouve | Ce qu'elle ne prouve pas |
|---|---|---|
| **SCAN-SCALE** — 10k et 100k **physiques** | Le vrai pipeline `scan_tree_controlled` → `Index::replace_nodes` sur une arborescence réelle du disque | Rien au-delà de 100 000 |
| **INDEX-SCALE** — 1 000 000 **indexés** | Le stockage, les requêtes et la matérialisation bornée sur le **schéma FileTopo courant** | **Ne prouve pas** que le scanner traverse 1 000 000 de fichiers physiques |

`INDEX-SCALE` n'est **jamais** appelé « scan 1M ». Aucun million de fichiers
fixture n'est committé, et aucun n'est créé sur disque.

## 8. Résultats

**Verdict structurel `SS9` : PASS sur les cinq conditions.** À budget fixe, la
cardinalité de la vue, ses arêtes, son payload et son temps de layout sont
**plats** de 10 000 à 1 000 000 d'éléments, et **chaque élément non rendu
reste compté exactement et atteignable** dans les 24 combinaisons mesurées.

**Trois chemins ne passent pas à l'échelle avec le schéma actuel** — la
recherche `P-08`, la pagination des enfants directs et le compte exact des
éléments d'un agrégat. Ce sont les résultats exploitables du spike, pas des
échecs de l'architecture.

**`SS7` est partiel** (vues réelles bornées à 12 et 157 entités; composition
bout-en-bout non testée) et **`SS8` est `NOT PROVEN`**.

Les mesures, la méthode, le profil matériel et les verdicts structurels sont
dans
[`TASK-0028-SCALE-SPIKE-REPORT.md`](../performance/TASK-0028-SCALE-SPIKE-REPORT.md).
Le protocole gelé avant le harness est dans
[`TASK-0028-SCALE-SPIKE-PROTOCOL.md`](../performance/TASK-0028-SCALE-SPIKE-PROTOCOL.md).

## 9. Limites déclarées

- Le **profil matériel du banc** peut ne pas être la **classe d'acceptation**
  « machine modeste ». Le rapport le classe explicitement et un banc puissant
  interdit toute déclaration de cible validée.
- **1 000 000 physique n'est pas prouvé**, et cette tâche ne prétend pas le
  prouver.
- Le prototype de matérialisation bornée est **benchmark-only**. Il n'est ni
  une API, ni une commande, ni un engagement de signature.
- **Aucun renderer n'est choisi**, aucun budget de vue final n'est décidé.
- Aucun chiffre de cette tâche n'est une **promesse de performance produit**.

## 10. Documents liés

- [`DEC-0029`](../decisions/DEC-0029-progressive-materialization-and-scale-boundary.md)
- [`PROGRESSIVE_SCALE_ARCHITECTURE.md`](../architecture/PROGRESSIVE_SCALE_ARCHITECTURE.md)
- [`TASK-0027`](TASK-0027-progressive-scale-architecture-realignment.md)
- [`ACTION-0044`](../reviews/ACTION-0044-independent-control.md)
- [`DEC-0025`](../decisions/DEC-0025-exact-content-observation-boundary.md)
- [`DEC-0028`](../decisions/DEC-0028-exact-duplicate-query-boundary.md)
- [`REQUIREMENTS_BASELINE.md`](../product/REQUIREMENTS_BASELINE.md) — `P-08`
- [`FEATURE_MATRIX.md`](../product/FEATURE_MATRIX.md) — `F-042`, `F-050`, `F-051`
