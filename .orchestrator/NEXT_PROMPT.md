# NEXT_PROMPT — TASK-0039 — V1 Dynamic Filters

**TARGET_AGENT:** CLAUDE CODE  
**RECOMMENDED_MODEL:** Sonnet 5, high effort  
**STATUS:** READY  
**BRANCH:** `build/v0.2-a23-v1-dynamic-filters`

## /goal

Implémenter intégralement
`docs/tasks/TASK-0039-v1-dynamic-filters.md` selon
`docs/decisions/DEC-0037-dynamic-filtered-projection.md`.

La tâche livre `F-022 / P-09` :

- état Tout / Nouveaux / Non vus;
- type;
- disponibilité;
- combinaisons;
- total exact;
- projection filtrée bornée;
- match/contexte distingués;
- pagination filtrée.

Ne pas construire le watcher, l’incrémental ni la persistance cross-restart des
filtres.

## 0 — Préconditions

1. Appliquer `AGENTS.md` et `CLAUDE.md`.
2. Basculer explicitement sur
   `build/v0.2-a23-v1-dynamic-filters`.
3. `git fetch origin`.
4. Synchroniser uniquement en fast-forward avec
   `origin/build/v0.2-a23-v1-dynamic-filters`.
5. Vérifier arbre propre.
6. Vérifier que HEAD contient :
   - `ACTION-0064` — TASK-0038 VERIFIED;
   - `DEC-0037`;
   - `TASK-0039`.
7. Lire en entier `DEC-0037` puis `TASK-0039` avant toute modification.

STOP/BLOCKED si le dépôt contredit ces préconditions.

## 1 — Audit / reuse-first

Avant de coder, auditer :

- `projection.rs`;
- `hierarchy.rs`;
- `Index::query_nodes` et les index SQLite existants;
- `change_journal.rs` seen/unseen;
- `MapApp.tsx` / `MapView.tsx`;
- les curseurs déjà existants.

Le rapport doit distinguer :

- réutilisé;
- adapté;
- laissé historique.

Interdictions :

- aucun second Index;
- aucun whole-corpus JSON;
- aucun filtre calculé sur les seuls nœuds déjà rendus;
- aucun usage de `nodes.seen` pour NEW/UNSEEN;
- aucune réactivation de `query_collection_nodes`.

## 2 — Exactitude avant UX

La requête filtrée doit être une primitive SQLite bornée et paginée.

Le total est calculé côté Rust/SQLite sur le corpus canonique, jamais au
frontend.

NEW / UNSEEN utilisent uniquement la vérité de DEC-0036.

Type et disponibilité utilisent uniquement les colonnes canoniques de
`nodes`.

La racine n’est jamais un match.

## 3 — Projection filtrée

Préserver **strictement** le comportement de `map_view` quand aucun filtre
n’est actif.

Quand un filtre est actif :

- construire une vue spécialisée à partir d’une page de matches;
- ajouter seulement les ancêtres nécessaires;
- distinguer matches et contexte;
- conserver de vraies arêtes parent/enfant seulement;
- ne pas transformer les agrégats enfants de la vue normale en résultats de
  filtre;
- conserver les budgets DEC-0031 / DEC-0034;
- pagination sans accumulation.

Si l’audit montre qu’un détail du DTO proposé par TASK-0039 doit être ajusté,
adapter la forme, pas les invariants.

## 4 — Cursor

Le cursor filtré doit être opaque/versionné et lié au minimum à :

- index_id;
- index_revision;
- filtre canonique;
- dernier match.

Refuser explicitement un cursor d’un autre index, d’une autre révision ou d’un
autre filtre.

Pas d’OFFSET sur le hot path.

## 5 — UI

Le filtre actif doit être lisible sans couleur seule.

- État : Tout / Nouveaux / Non vus;
- Type : dossiers / fichiers / ignorés;
- Disponibilité : Tout / local / en ligne seulement;
- Réinitialiser les filtres;
- compteur exact;
- match = « Correspondance »;
- ancêtre = « Contexte »;
- page suivante/précédente;
- switch de cerveau : aucun état transporté.

Après une mutation TASK-0038, si NEW ou UNSEEN est actif, relire la projection
depuis le backend.

## 6 — Preuves

Les tests listés dans TASK-0039 sont obligatoires.

Le test 100k doit prouver exactitude + sortie bornée, sans inventer de nouveau
budget de performance.

Le WebView2 doit employer des données générées par la preuve uniquement.
Ne pas fabriquer un vrai placeholder Cloud Files pour tester ONLINE_ONLY :
cette branche peut rester prouvée au niveau Rust.

## 7 — Validation / confidentialité

Rejouer toutes les validations demandées, y compris :

`scripts/audit-public-readiness.ps1 -AllowRemotes`

Ne pas élargir son allowlist.

## 8 — Gouvernance

À la fin :

- TASK-0039 = `IMPLEMENTED`, jamais `VERIFIED`;
- aucune TASK-0040;
- pas de watcher/incrémental;
- pas de PR/merge/tag/release;
- durable docs à jour;
- `.orchestrator/RESULT.md` complet;
- `NEXT_ACTION` = contrôle indépendant de TASK-0039;
- push uniquement sur la branche;
- arbre propre.
