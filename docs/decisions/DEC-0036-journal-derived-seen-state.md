# DEC-0036 — État vu/non vu dérivé du journal de changements

- **Date :** 2026-09-23
- **Statut :** `APPROVED`
- **Portée :** `F-028` et fondation sémantique de `F-022` / parité `P-17`
- **Prérequis :** `TASK-0037 = VERIFIED` par `ACTION-0061`; porte public-readiness fermée par `ACTION-0063`

## Problème

Le schéma historique contient déjà `nodes.seen`, hérité du prototype. Ce booléen
ne peut pas devenir la vérité produit de `P-17` :

- il décrit un nœud, pas un **changement**;
- il ne sait pas représenter un changement supprimé;
- il ne distingue pas « nouveau » de « non vu »;
- il existait avant le journal de `TASK-0037`;
- `P-17` exige explicitement que « nouveau » et « non vu » soient **dérivés du journal**.

Créer une deuxième vérité à partir de `nodes.seen` rendrait ensuite les filtres
`F-022` incohérents avec le journal.

## Décision

La source de vérité V1 de l’état vu/non vu est :

`change_events append-only + état d’acquittement séparé`.

`nodes.seen` reste un champ historique/compatibilité. Il peut continuer à être
préservé par les chemins existants, mais **aucune nouvelle fonction V1
nouveau/non-vu ne doit en dépendre**.

### 1. Événement non vu

Un événement est **non vu** s’il n’est pas acquitté.

L’acquittement combine deux mécanismes dans le même SQLite du cerveau :

- un **watermark** `seen_through_event_id` : tout événement dont
  `event_id <= watermark` est vu;
- une petite table d’acquittements explicites pour les événements vus
  individuellement au-dessus du watermark.

Le journal `change_events` reste append-only : marquer vu ne modifie jamais une
ligne d’événement.

### 2. Nœud non vu

Un nœud **actuellement présent** est non vu s’il possède au moins un événement
non vu dans son historique.

Un nœud supprimé n’est plus un « élément » sélectionnable; ses événements
restent toutefois consultables et peuvent être acquittés individuellement.

### 3. Nœud nouveau

Un nœud actuellement présent est **nouveau** s’il possède un événement
`CREATED` non vu.

Conséquence volontaire :

- un nœud dont la création a été acquittée mais qui reçoit ensuite un
  `MODIFIED` devient **non vu**, mais n’est plus **nouveau**;
- marquer le nœud vu acquitte tous ses événements actuellement non vus;
- un changement futur sur ce même nœud redevient non vu.

### 4. Actions

Trois gestes produit distincts :

1. **Marquer ce changement vu** — acquitte un `event_id`;
2. **Marquer cet élément vu** — acquitte tous les événements actuellement non
   vus du `node_id` dans ce cerveau;
3. **Tout marquer vu** — avance atomiquement le watermark au plus grand
   `event_id` existant.

`P-17` exige que « tout marquer vu » soit réversible **ou confirmé**. La V1
retient **confirmation explicite** dans l’interface; aucune mutation silencieuse.

### 5. Migration depuis le journal v5

Un fichier v5 peut déjà contenir un historique créé avant que FileTopo sache
mémoriser ce qui a été vu.

La migration v5 → v6 doit donc établir une **baseline d’acquittement** au
`MAX(event_id)` déjà existant. Elle ne prétend pas que l’utilisateur a
réellement lu chaque ancien événement : elle signifie seulement
« le suivi vu/non-vu commence à partir de cette version ».

L’historique ancien reste entièrement consultable.

Cette baseline évite de présenter soudain tout le passé comme « non vu » ou
« nouveau », ce qui serait une affirmation que le produit ne peut pas prouver.

### 6. Concurrence

Les mutations d’acquittement sont transactionnelles.

- `mark all` lit le max courant et avance le watermark dans la même
  transaction;
- un événement publié **après** ce commit reste non vu;
- un événement déjà présent au moment du `mark all` devient vu;
- aucune action sur un cerveau ne touche le SQLite d’un autre cerveau.

### 7. Ce que cette décision ne fait pas

- pas de filtres de carte `F-022`;
- pas de watcher `F-030`;
- pas d’application incrémentale `F-031`;
- pas d’auto-mark au simple affichage;
- pas de suppression/rétention du journal;
- pas de réécriture de `nodes.seen`.

## Conséquence de séquence

La tranche suivante implémente d’abord cette sémantique (`F-028`).

Les filtres « nouveau/non vu » de `F-022` viendront ensuite en consommant
**exactement cette source de vérité**, jamais un état parallèle.
