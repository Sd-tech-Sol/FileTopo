# TASK-0038 — V1 Journal-derived Seen/Unseen State

- **Date :** 2026-09-23
- **Statut :** `IMPLEMENTED`
- **Branche :** `build/v0.2-a22-v1-seen-state`
- **Prérequis :** `TASK-0037 = VERIFIED` (`ACTION-0061`), public-readiness vert (`ACTION-0063`)
- **Décision :** `DEC-0036 — État vu/non vu dérivé du journal de changements`
- **Portée produit :** `F-028`; parité `P-17` **partielle mais structurelle**
- **Hors portée explicite :** `F-022`, `F-030`, `F-031`

## But

Ajouter un état **vu / non vu** persistant et par cerveau, dérivé du journal
`change_events` de `TASK-0037`, avec trois gestes :

- marquer un changement vu;
- marquer un élément vu;
- tout marquer vu avec confirmation explicite.

Ajouter également les indicateurs backend/UI nécessaires pour distinguer un
élément **nouveau** d’un élément **non vu**, selon `DEC-0036`.

Cette tâche ne construit **aucun filtre de carte**. Elle livre la source de
vérité que la tranche suivante utilisera.

## A — Audit avant code

Lire avant modification :

- `ACTION-0061`, `ACTION-0063`;
- `DEC-0036`;
- `TASK-0037` et `.orchestrator/RESULT.md`;
- `DEC-0009`, `DEC-0010`, `DEC-0011`, `DEC-0013`;
- `change_journal.rs`, `index.rs`, `map/brain_index.rs`,
  `map/commands.rs`, `lib.rs`;
- `ChangeJournalPanel.tsx`, `MapApp.tsx`, `types.ts`;
- `FEATURE_MATRIX.md` lignes `F-022`, `F-027` à `F-031`;
- `CARTETOPO_FUNCTIONAL_PARITY.md` `P-17`.

Dans le rapport, distinguer clairement ce qui est réutilisé, adapté et non
construit. Le vieux `nodes.seen` doit être audité mais ne doit pas devenir la
source de vérité de cette tranche.

## B — Schéma v6 et migration M-B

Le schéma v5 contient le journal append-only. Faire évoluer vers **v6** avec une
structure minimale d’acquittement.

Forme attendue, sauf meilleure preuve pendant audit :

- `schema_meta['seen_through_event_id']` — watermark monotone;
- table du genre `seen_change_events(event_id PRIMARY KEY ...)` pour les
  acquittements individuels au-dessus du watermark;
- index `change_events(node_id, event_id)` si nécessaire pour des requêtes
  bornées par nœud.

Le nom exact appartient à l’implémentation; les invariants de `DEC-0036`
négocient la sémantique, pas l’orthographe SQL.

### Migration v5 → v6

Réutiliser **la même frontière M-B** :

1. contrôles brain/binding avant mutation;
2. quiescence;
3. copie de sûreté validée;
4. migration transactionnelle;
5. validation canonique v6;
6. restauration sur échec migration **ou validation**;
7. suppression de la copie seulement après validation réussie.

La migration doit :

- conserver toutes les lignes `change_events`;
- conserver `index_id`, révision, nœuds, binding et états existants;
- établir le watermark initial au `MAX(event_id)` existant;
- ne créer aucun faux événement;
- ne lire aucune source analysée.

Un fichier frais v6 démarre avec watermark 0.

## C — Sémantique obligatoire

### Événement vu

Vu si :

- `event_id <= seen_through_event_id`, **ou**
- acquittement explicite de cet event au-dessus du watermark.

Sinon : non vu.

### Élément non vu

Pour un nœud actuellement présent :

`unseen = existe au moins un change_event non vu pour node_id`.

### Élément nouveau

Pour un nœud actuellement présent :

`new = existe au moins un CREATED non vu pour node_id`.

Ne jamais dériver `new` ou `unseen` de `nodes.seen`.

### Marquer un changement vu

Commande bornée, cerveau explicite + `event_id`.

- événement inexistant dans ce cerveau : erreur claire;
- déjà vu : no-op idempotent;
- événement non vu : acquittement persistant;
- jamais de chemin/clé stable/identité système en argument.

### Marquer un élément vu

Entrée : `BrainNodeRef`.

- vérifier que le nœud existe actuellement dans ce cerveau;
- acquitter tous ses événements actuellement non vus;
- ne rien changer aux autres nœuds;
- un futur événement du même nœud reste non vu.

### Tout marquer vu

Entrée : `brainId` seulement.

Transaction atomique :

- lire le max `event_id` du cerveau;
- avancer le watermark à ce max;
- nettoyer les acquittements explicites devenus redondants.

Le backend ne gère pas le dialogue de confirmation; l’UI doit demander une
confirmation **explicite en deux étapes** avant d’invoquer la commande.

## D — API de lecture

Étendre le journal sans casser son curseur :

- chaque `ChangeEvent` expose `seen: boolean`;
- le total historique existant reste le total des événements filtrés;
- ajouter un compte exact `unseenTotal` si utile à l’UI;
- marquer vu **ne crée, supprime ni réordonne** aucun `change_event`;
- un curseur de journal valide avant un marquage reste valide après.

Ajouter une lecture bornée pour l’état du nœud sélectionné, du genre :

`map_node_change_state(BrainNodeRef) -> { isNew, isUnseen, unseenChangeCount }`.

Le nom exact peut varier après audit.

## E — UI V1

### Journal « Changements »

Pour chaque événement :

- afficher clairement `Vu` / `Non vu` sans dépendre uniquement de la couleur;
- un événement non vu offre **Marquer vu**;
- un événement déjà vu ne doit pas déclencher une mutation inutile;
- un événement supprimé peut toujours être marqué vu comme **changement**.

Ajouter « Tout marquer vu » avec confirmation inline :

1. premier geste ouvre l’état de confirmation;
2. second geste explicite confirme;
3. `Annuler` ne fait aucun appel mutateur;
4. après succès, recharger l’état visible depuis le backend.

### Élément sélectionné

Dans le panneau contextuel existant, afficher les états dérivés :

- `Nouveau` si `isNew`;
- `Non vu` si `isUnseen`;
- `Vu` sinon.

Si non vu, offrir **Marquer cet élément vu**.

Le simple fait d’afficher/sélectionner un élément **ne le marque jamais vu
automatiquement**.

## F — Tests Rust obligatoires

Prouver au minimum :

1. migration produit v5 → v6 via M-B;
2. historique v5 conservé et baseliné : ancien historique consultable mais pas
   soudain « non vu »;
3. premier événement post-v6 = non vu;
4. CREATED non vu ⇒ nœud nouveau + non vu;
5. après acquittement du CREATED, le nœud n’est plus nouveau;
6. un MODIFIED ultérieur ⇒ non vu mais pas nouveau;
7. mark event idempotent et persistant après réouverture;
8. mark node acquitte seulement ce nœud;
9. événement futur du nœud après mark node reste non vu;
10. mark all acquitte tout ce qui existe au moment du commit;
11. événement publié après mark all reste non vu;
12. DELETED peut être acquitté comme événement mais n’est pas un nœud
    sélectionnable;
13. rename/move SYSTEM conserve le même nodeId et rend le nœud non vu;
14. PATH_FALLBACK delete+create : le nouveau nœud est nouveau/non vu, l’ancien
    delete reste un événement indépendant;
15. deux cerveaux sont totalement isolés;
16. `nodes.seen` peut être forcé à une valeur contradictoire sans changer
    `isNew/isUnseen` — preuve que le journal est la vérité;
17. curseur journal valide avant/après marquage, aucun eventId modifié;
18. rollback migration/validation v6 restaure v5;
19. aucune donnée sensible dans les DTO.

## G — Tests TypeScript / WebView2

Tests UI au minimum :

- badges Vu / Non vu;
- marquer un changement;
- confirmation + annulation de « tout marquer vu »;
- marquer l’élément sélectionné;
- aucun auto-mark à la sélection;
- changement de cerveau ne réutilise aucun état de l’autre;
- réponse backend d’un autre cerveau refusée.

WebView2 Windows réel, arbre synthétique généré par la preuve :

1. baseline;
2. créer → événement non vu, élément nouveau/non vu;
3. marquer le changement créé → plus nouveau;
4. modifier → élément non vu mais pas nouveau;
5. marquer l’élément vu;
6. créer plusieurs changements, déclencher « tout marquer vu », vérifier la
   confirmation;
7. produire un changement **après** mark-all → il reste non vu;
8. redémarrage réel → états persistants identiques;
9. second cerveau → aucun état partagé;
10. 0 fuite de chemin absolu/clé stable/FileId/volume;
11. 0 erreur console fatale.

## H — Validation générale

Exécuter :

- tests ciblés;
- `cargo test --offline`;
- `pnpm test`;
- `pnpm check`;
- `pnpm build`;
- `cargo build --offline`;
- build Tauri debug si requis par WebView2;
- `cargo clippy --all-targets --offline -- -D warnings`, dette historique
  distinguée des nouveaux diagnostics;
- `git diff --check`;
- `scripts/audit-public-readiness.ps1 -AllowRemotes`.

## I — Hors portée

- filtres de carte `F-022`;
- type/disponibilité/facettes;
- watcher `F-030`;
- `ReadDirectoryChangesExW`;
- application différentielle `U-B` / `F-031`;
- réconciliation `W-B/W-C`;
- USN;
- journal retention/pruning;
- suppression de `nodes.seen`;
- refonte graphique;
- IA/RAG.

## Sortie attendue

- `TASK-0038 = IMPLEMENTED`, jamais auto-`VERIFIED`;
- ne pas créer `TASK-0039`;
- mettre à jour `CURRENT_STATE`, `HANDOFF`, `NEXT_ACTION`, `VALIDATION`,
  `CHANGELOG_AI`, `FEATURE_MATRIX` honnêtement pour `F-028` seulement;
- `.orchestrator/RESULT.md` détaille schéma v6, baseline, règles new/unseen,
  mutations, tests et limites;
- `NEXT_ACTION = contrôle indépendant de TASK-0038`;
- commit/push uniquement sur la branche de tâche;
- aucun PR/merge/tag/release.

## Livraison (2026-09-23) — `IMPLEMENTED`, en attente de contrôle indépendant

Exécutée sur `build/v0.2-a22-v1-seen-state`. **Jamais auto-`VERIFIED`.** Détail :
[VALIDATION section BR](../ai/VALIDATION.md) et `.orchestrator/RESULT.md`.

- **Forme SQL retenue :** celle attendue — `schema_meta['seen_through_event_id']`,
  `seen_change_events(event_id PK REFERENCES change_events ON DELETE CASCADE)` et
  `idx_change_events_node(node_id, event_id)`. Aucun écart de forme.
- **Migration :** même `M-B`, un bras de plus au dispatcher (`5 → 6`); la baseline
  du watermark est `MAX(event_id)` existant (`0` pour un fichier frais).
- **Choix à examiner :** `unseenTotal` est le compte **de tout le journal**, non
  restreint par le filtre de nature (c'est ce que « Tout marquer vu » affecterait).
  La fiche laissait la définition ouverte (« si utile »).
- **Hors portée respectée :** `F-022`, `F-030`, `F-031`, `nodes.seen` conservé
  tel quel (historique), aucune `TASK-0039`.
