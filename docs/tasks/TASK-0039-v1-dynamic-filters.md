# TASK-0039 — V1 Dynamic Filters

- **Date :** 2026-09-23
- **Statut :** `READY`
- **Branche :** `build/v0.2-a23-v1-dynamic-filters`
- **Prérequis :** `TASK-0038 = VERIFIED` (`ACTION-0064`)
- **Décision :** `DEC-0037 — Dynamic filters over the canonical Index and bounded projection`
- **Portée :** `F-022`, parité `P-09`
- **Hors portée :** `F-030`, `F-031`, persistance P-19 des filtres

## But

Livrer les filtres de base de la carte :

- État : Tout / Nouveaux / Non vus;
- Type;
- Disponibilité;
- combinaison des critères;
- total exact côté Index;
- filtre actif visible et révocable;
- projection toujours bornée.

« Nouveau / non vu » doit consommer la vérité de `TASK-0038`, jamais
`nodes.seen`.

## A — Audit avant code

Lire en entier :

- `ACTION-0064`, `DEC-0037`, cette fiche;
- `DEC-0031`, `DEC-0034`, `DEC-0036`;
- `PROGRESSIVE_SCALE_ARCHITECTURE.md` § requêtes/filtres;
- `REQUIREMENTS_BASELINE.md` F-022;
- `CARTETOPO_FUNCTIONAL_PARITY.md` P-09;
- `projection.rs`, `hierarchy.rs`, `index.rs`, `change_journal.rs`,
  `map/commands.rs`, `lib.rs`;
- `MapApp.tsx`, `MapView.tsx`, `types.ts`.

Auditer et réutiliser les requêtes/index existants. Ne pas réactiver
`query_collection_nodes(unseen_only)` ni aucune commande prototype.

## B — Contrat de filtre

Implémenter un type fermé et sérialisable équivalent à :

- `state: ALL | NEW | UNSEEN`;
- `kinds: [] | [DIRECTORY, FILE, SKIPPED...]`;
- `availability: ALL | LOCAL | ONLINE_ONLY`.

Normaliser :

- doublons de kind supprimés;
- ordre canonique;
- valeurs inconnues refusées;
- `ALL + kinds=[] + availability=ALL` = filtre inactif.

Les critères sont AND entre groupes, OR à l’intérieur des kinds.

## C — Requête SQLite bornée

Ajouter une primitive read-only sur le canonical Index qui, dans **une même
transaction de lecture**, retourne :

- total exact;
- page keyset de matches;
- cursor suivant.

Exigences :

- aucune lecture du corpus complet en Rust;
- aucun `OFFSET` pour la page;
- ordre déterministe;
- racine exclue des matches;
- type et disponibilité dérivés de `nodes`;
- NEW/UNSEEN dérivés de `change_events + watermark + seen_change_events`;
- `nodes.seen` absent du SQL;
- résultats limités côté serveur.

Le cursor doit être lié à index_id + revision + filtre canonique. Mauvais
cursor : refus clair.

## D — Projection filtrée

Étendre `map_view` sans casser son contrat normal.

### Aucun filtre actif

Comportement actuel identique : focus, child cursor, agrégats et budget
inchangés.

### Filtre actif

- requête globale dans le cerveau;
- ajouter chaque match puis ses ancêtres;
- dédupliquer;
- conserver parent/enfant réel seulement;
- aucun faux edge;
- viser ≤64 vrais nœuds au total contexte compris;
- ne jamais dépasser les bornes techniques existantes;
- si le prochain match ne rentre pas avec son contexte, le reporter page
  suivante;
- ne pas utiliser les agrégats enfants comme faux « résultats restants ».

Le DTO doit exposer au minimum :

- filtre appliqué;
- `filteredTotal`;
- `materializedMatchCount`;
- `filterMatchIds`;
- `filterNextCursor`.

Les nœuds de contexte doivent être clairement identifiables côté UI.

## E — UI

Ajouter une surface de filtres près de la carte.

### État

Contrôle accessible :

- Tout;
- Nouveaux;
- Non vus.

### Type

Contrôles combinables :

- dossiers;
- fichiers;
- ignorés/skipped.

### Disponibilité

- Tout;
- local;
- en ligne seulement.

### Comportement

- chaque changement recharge la projection depuis le backend;
- changement de filtre repart à la première page;
- bouton **Réinitialiser les filtres** en une action;
- filtre actif visible textuellement;
- compteur exact « X correspondance(s) »;
- page suivante/précédente sans accumulation;
- match marqué **Correspondance**;
- ancêtre non match marqué **Contexte**;
- sélection fonctionne pour les deux;
- marquer vu depuis TASK-0038 re-query la projection si filtre NEW/UNSEEN actif;
- aucun état d’un autre cerveau conservé lors d’un switch.

Persistance après redémarrage : hors portée déclarée.

## F — Tests Rust

Prouver au minimum :

1. filtre inactif reproduit la projection normale;
2. NEW vient du journal, pas `nodes.seen`;
3. UNSEEN vient du journal, pas `nodes.seen`;
4. CREATED acquitté disparaît de NEW;
5. MODIFIED non vu apparaît dans UNSEEN mais pas NEW;
6. mark-node / mark-all retirent les matches concernés après relecture;
7. type seul exact;
8. disponibilité seule exacte;
9. type + disponibilité exact;
10. NEW/UNSEEN + type + disponibilité exact;
11. racine jamais comptée;
12. total filtré = requête indépendante sur un corpus synthétique;
13. >100 matches paginés sans trou/doublon;
14. cursor d’un autre index refusé;
15. cursor d’une autre révision refusé;
16. cursor d’un autre filtre refusé;
17. matches + ancêtres restent sous budget;
18. ancêtres de contexte ne deviennent jamais matches;
19. arêtes seulement entre nœuds matérialisés avec parent réel;
20. aucun whole-corpus read/DTO;
21. deux cerveaux isolés;
22. DTO sans chemin absolu/clé stable/identité système.

Ajouter un corpus synthétique **100k nœuds** pour vérifier que :

- total exact;
- page bornée;
- quantité sérialisée indépendante du corpus.

Aucun seuil de performance nouveau inventé dans cette tâche.

## G — Tests TypeScript

Prouver :

- contrôles visibles et accessibles;
- état + type + disponibilité combinés;
- reset en une action;
- compte exact affiché;
- match/contexte distincts sans couleur seule;
- pagination remplace la page;
- changement de filtre remet page 1;
- changement de cerveau efface les filtres de l’autre;
- stale backend reply refusée;
- après un « marquer vu », NEW/UNSEEN actif est rechargé;
- aucun whole graph stocké côté frontend.

## H — WebView2 réel

Utiliser seulement des données générées par la preuve.

Scénario minimal :

1. index de référence;
2. créer fichier + dossier, modifier un fichier;
3. filtre Nouveaux → créations seulement;
4. filtre Non vus → créations + modification;
5. combiner type fichier → dossiers exclus;
6. disponibilité local → cohérente sur la fixture réelle;
7. marquer un changement vu → compteur/projection se mettent à jour;
8. mark-all → filtre Non vus devient vide;
9. enlever les filtres → projection normale revient;
10. >64 matches → pagination filtrée, sans accumulation;
11. changement de cerveau → aucun filtre/compteur transporté;
12. 0 chemin absolu / stable_key / FileId / volume;
13. 0 erreur console fatale.

La branche disponibilité `ONLINE_ONLY` peut rester couverte au niveau Rust si
une vraie fixture Cloud Files sûre n’est pas disponible; ne jamais hydrater un
placeholder pour fabriquer une preuve.

## I — Validation

Exécuter :

- tests ciblés;
- `cargo test --offline`;
- `pnpm test`;
- `pnpm check`;
- `pnpm build`;
- `cargo build --offline`;
- build Tauri debug + WebView2;
- Clippy en distinguant dette historique / nouveaux diagnostics;
- `git diff --check`;
- `scripts/audit-public-readiness.ps1 -AllowRemotes`.

## Gouvernance

- `TASK-0039 = IMPLEMENTED`, jamais auto-`VERIFIED`;
- aucune TASK-0040;
- aucun watcher/incrémental;
- aucune persistance cross-restart des filtres;
- aucun PR/merge/tag/release;
- mettre à jour `CURRENT_STATE`, `HANDOFF`, `NEXT_ACTION`, `VALIDATION`,
  `CHANGELOG_AI`, `FEATURE_MATRIX` pour F-022 seulement;
- `.orchestrator/RESULT.md` complet;
- `NEXT_ACTION = contrôle indépendant de TASK-0039`;
- push uniquement sur la branche de tâche, arbre propre.
