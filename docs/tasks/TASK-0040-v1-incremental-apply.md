# TASK-0040 — V1 Incremental Update Application Kernel

- **Date :** 2026-09-23
- **Statut :** `READY`
- **Branche :** `build/v0.2-a24-v1-incremental-apply`
- **Décision :** `DEC-0038`
- **Portée :** `F-031` / `DEC-0010 U-B`
- **Hors portée :** `F-030`, `F-032`, remplacement du flux Actualiser

## But

Ajouter un noyau interne qui applique un lot de changements déjà observé à
l'Index canonique sans remplacement total du corpus, avec journal et révision
atomiques.

Aucune commande Tauri publique de mutation incrémentale n'est ajoutée.

## A — Audit avant code

Lire en entier :

- `DEC-0038`, `DEC-0010`, `DEC-0009`;
- `ACTION-0059/ACTION-0060` pour les invariants d'identité/migration;
- `TASK-0037`, `TASK-0038`, `TASK-0039`;
- `index.rs`, `change_journal.rs`, `identity.rs`, `hierarchy.rs`;
- `scanner.rs`, `map/commands.rs`;
- `BASELINE_TARGETS §3.3`, `TEST_STRATEGY` scénarios « appliquer 10 changements ».

Identifier ce qui peut être réutilisé sans dupliquer les règles de journal et
d'identité.

## B — API interne du lot

Créer une API Rust interne, non `Serialize` et non enregistrée comme commande
Tauri, pour :

- upsert d'un nœud observé + identité stable;
- suppression d'un nœud canonique;
- résolution sûre des parents existants ou présents dans le lot.

La forme précise peut différer si l'audit démontre une meilleure structure.

Préflight obligatoire :

- local tokens/ids du lot uniques;
- stable keys d'upsert uniques;
- aucun id de suppression inconnu;
- racine jamais supprimée/réparentée;
- parent résolvable;
- aucune collision stable key;
- aucun orphelin survivant;
- aucun cycle;
- lot de déplacement de dossier cohérent avec ses descendants.

Échec de préflight : zéro écriture.

## C — Application différentielle

Interdictions dans le chemin incrémental :

- `DELETE FROM nodes` sans prédicat;
- réinsertion de tous les nœuds;
- lecture de tout le corpus dans un `Vec`;
- `change_journal::load_previous` global;
- calcul d'identité par ressemblance;
- lecture de contenu fichier.

Le coût SQL doit porter sur les ids/stable keys du lot et les parents/descendants
explicitement affectés.

Préserver les ids SYSTEM à travers rename/move.

PATH_FALLBACK rename/move = delete+create.

## D — Journal / seen-state

Produire exactement les événements correspondant au lot, dans la même
transaction et à une seule révision.

Prouver :

- created;
- modified;
- renamed;
- moved;
- deleted;
- rename + move dans un même lot → deux événements si c'est toujours le contrat
  de TASK-0037;
- aucun événement pour une ligne identique;
- événements nouveaux non vus;
- anciens acquittements inchangés;
- deleted event reste consultable.

## E — Hiérarchie / métadonnées

Après commit :

- parent_id valides;
- child_count exact uniquement via mises à jour ciblées;
- depth/relative_path cohérents pour un sous-arbre déplacé;
- `node_count` exact;
- `next_node_id` monotone;
- root_id stable;
- index_id stable;
- révision +1 exactement pour un lot effectif;
- révision inchangée pour un no-op.

## F — Rollback / concurrence

Tests d'injection :

- erreur après au moins une mutation SQL ciblée → rollback intégral;
- erreur pendant append journal → rollback;
- contrainte/collision → rollback;
- deux writers sérialisés par transaction `IMMEDIATE`;
- reader snapshot ne voit jamais un lot partiel;
- `SQLITE_BUSY` prolongé échoue proprement selon le timeout existant, sans
  demi-lot.

## G — Tests fonctionnels

Au minimum :

1. 10 créations sur grand Index : seuls les nouveaux rows écrits;
2. 10 modifications : ids inchangés;
3. SYSTEM rename : même id + RENAMED;
4. SYSTEM move : même id + MOVED;
5. rename+move : contrat journal identique à TASK-0037;
6. PATH_FALLBACK rename : delete+create, nouveaux ids;
7. suppression fichier;
8. suppression sous-arbre complète;
9. déplacement sous-arbre, descendants chemins/profondeurs cohérents;
10. parent child_count ancien/nouveau exact;
11. lot mixte create/update/delete;
12. no-op;
13. deux cerveaux isolés;
14. state seen/unseen cohérent;
15. filtres NEW/UNSEEN voient immédiatement les événements après commit;
16. curseurs invalidés par la nouvelle révision comme prévu;
17. aucune fuite stable_key/path absolu dans un DTO;
18. aucune commande Tauri incrémentale exposée.

Comparer l'état final d'une série de lots avec un **Index de référence produit
par scan complet** du même arbre synthétique : nœuds, hiérarchie, identités,
journal attendu et métadonnées reconstructibles doivent être cohérents.

## H — Performance réelle F-031

Créer des fixtures/index synthétiques déterministes :

- 1 000;
- 10 000;
- 100 000 nœuds.

Mesurer **le noyau produit**, pas une fonction factice :

- 10 changements mixtes sur 1k;
- 10 sur 10k;
- 10 sur 100k;
- 1000 sur 100k.

Au moins cinq exécutions par scénario. Rapporter environnement, médiane,
min/max et ratio 100k/1k à 10 changements dans un fichier
`docs/performance/runs/TASK-0040-*.json` ou un `PERF-XXXX` conforme au
registre existant.

Le ratio > 2 est un **échec de F-031**, pas un nombre à masquer ou à ajuster.

Rapporter aussi les cibles absolues §3.3 comme PASS/FAIL sur cette machine.

## I — Validation générale

- tests ciblés;
- `cargo test --offline`;
- `pnpm test` si aucun frontend touché, au minimum non-régression existante;
- `pnpm check`;
- `pnpm build`;
- `cargo build --offline`;
- Clippy avec dette historique séparée;
- `git diff --check`;
- `scripts/audit-public-readiness.ps1 -AllowRemotes`.

Aucun WebView2 n'est obligatoire si aucune surface UI n'est modifiée. Si une
surface UI est touchée, le rejeu devient obligatoire.

## Gouvernance

- `TASK-0040 = IMPLEMENTED`, jamais auto-`VERIFIED`;
- aucune TASK-0041;
- aucun watcher;
- aucune commande Tauri incrémentale;
- ne pas remplacer encore `map_refresh`;
- pas de PR/merge/tag/release;
- mettre à jour les docs durables et `FEATURE_MATRIX` honnêtement;
- `NEXT_ACTION = contrôle indépendant de TASK-0040`;
- commit/push uniquement sur la branche de tâche, arbre propre.
