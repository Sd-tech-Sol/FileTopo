# NEXT_PROMPT — TASK-0040 — V1 Incremental Update Application Kernel

**TARGET_AGENT:** CLAUDE CODE  
**RECOMMENDED_MODEL:** Sonnet 5, high effort  
**STATUS:** READY  
**BRANCH:** `build/v0.2-a24-v1-incremental-apply`

## /goal

Implémenter intégralement
`docs/tasks/TASK-0040-v1-incremental-apply.md` selon
`docs/decisions/DEC-0038-incremental-application-kernel.md`.

La tâche construit le noyau `U-B` de `DEC-0010` : appliquer seulement un
lot de changements déjà réconcilié, avec identité stable, journal et révision
atomiques.

**Ne pas construire le watcher. Ne pas remplacer encore `map_refresh`.**

## 0 — Préconditions obligatoires

1. Appliquer `AGENTS.md` et `CLAUDE.md`.
2. Basculer explicitement sur
   `build/v0.2-a24-v1-incremental-apply`.
3. `git fetch origin`.
4. Synchroniser uniquement en fast-forward avec
   `origin/build/v0.2-a24-v1-incremental-apply`.
5. Vérifier arbre propre.
6. Vérifier que HEAD contient :
   - `ACTION-0065` — TASK-0039 VERIFIED;
   - `DEC-0038`;
   - `TASK-0040`.
7. Lire **en entier** `DEC-0038` puis `TASK-0040` avant modification.
8. Lire `DEC-0010` et `BASELINE_TARGETS §3.3`.

Si une précondition contredit le dépôt : STOP/BLOCKED. Ne pas improviser une
autre architecture.

## 1 — Audit reuse-first

Avant le code, auditer précisément :

- `Index::publish` actuel;
- remapping d’identité stable / `next_node_id`;
- journal TASK-0037;
- seen-state TASK-0038;
- hiérarchie et child_count;
- les index SQLite disponibles;
- busy timeout / concurrence existants.

Dans `.orchestrator/RESULT.md`, distinguer **réutilisé / adapté / laissé
historique**.

Ne dupliquer aucune règle d’identité si elle peut être extraite/réutilisée
proprement.

## 2 — Frontière interne seulement

Le lot incrémental est une API Rust privilégiée :

- pas `Serialize`;
- pas `#[tauri::command]`;
- aucune stable key envoyée au WebView;
- aucune commande debug publique pour contourner cette règle.

Les tests peuvent construire des lots directement en Rust.

## 3 — U-B réel

Le chemin incrémental ne doit jamais :

- faire `DELETE FROM nodes` global;
- réinsérer le corpus complet;
- charger tout `nodes` en mémoire;
- appeler le diff global de tout le journal;
- corréler par nom/taille/date;
- lire le contenu des fichiers.

Il doit toucher seulement :

- les nœuds du lot;
- les parents/descendants explicitement nécessaires;
- les métadonnées globales minimales.

## 4 — Préflight avant mutation

Refuser sans écrire :

- doublons d’identité / token;
- stable-key collision;
- suppression inconnue;
- suppression/réparentage de la racine;
- parent absent;
- cycle;
- orphelin survivant;
- lot de déplacement de sous-arbre incomplet.

PATH_FALLBACK reste delete+create.

## 5 — Transaction / journal

Un lot effectif = une transaction `IMMEDIATE`, une révision.

Dans la transaction :

- snapshot minimal des lignes touchées;
- résolution/allocation d’identités;
- mutations ciblées;
- child_count/métadonnées ciblés;
- événements exacts;
- append journal;
- revision +1;
- commit.

No-op = aucune révision, aucun événement.

Toute erreur après mutation SQL doit prouver rollback exact.

## 6 — Parité avec le résultat d’un scan complet

La preuve fonctionnelle centrale n’est pas seulement « les lignes attendues
ont changé ».

Pour plusieurs lots synthétiques, construire le même état final par :

A. noyau incrémental;  
B. pipeline de référence par scan/publication complète.

Comparer les invariants reconstruisibles pertinents : ids stables attendus,
nœuds, parents, chemins relatifs, profondeurs, child_count, node_count,
root_id, et événements attendus.

Les différences intentionnelles (par exemple révision/nombre d’étapes) doivent
être expliquées, jamais masquées.

## 7 — Performance obligatoire

Mesurer le **vrai noyau produit** :

- 1k / 10 changements;
- 10k / 10;
- 100k / 10;
- 100k / 1000.

Minimum 5 runs par cas, médiane + min/max.

Le ratio médian `100k(10) / 1k(10)` doit être **≤ 2**. S’il échoue, écrire
FAIL et ne pas prétendre F-031 satisfaite.

Rapporter les cibles absolues de §3.3 comme PASS/FAIL sur la machine mesurée,
avec environnement déclaré.

Ne pas optimiser le benchmark au détriment du chemin produit.

## 8 — Non-régressions

Prouver explicitement :

- journal + seen-state;
- filtres NEW/UNSEEN après commit;
- cursors/revision;
- deux cerveaux;
- rollback;
- aucun changement frontend;
- aucune nouvelle permission/capability.

## 9 — Validation

Exécuter la fiche TASK-0040 complètement, incluant :

- `cargo test --offline`;
- `pnpm test`;
- `pnpm check`;
- `pnpm build`;
- `cargo build --offline`;
- Clippy avec dette historique distinguée;
- `git diff --check`;
- `scripts/audit-public-readiness.ps1 -AllowRemotes`.

Pas de WebView2 si aucun code/UI frontend n’est touché.

## 10 — Gouvernance

À la fin :

- TASK-0040 = `IMPLEMENTED`, jamais `VERIFIED`;
- aucune TASK-0041;
- aucun watcher;
- `map_refresh` reste sur son flux actuel;
- aucun PR/merge/tag/release;
- docs durables + `.orchestrator/RESULT.md` complets;
- `NEXT_ACTION` = contrôle indépendant de TASK-0040;
- push uniquement sur la branche;
- arbre propre.
