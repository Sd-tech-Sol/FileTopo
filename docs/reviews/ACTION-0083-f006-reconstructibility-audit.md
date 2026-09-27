# ACTION-0083 — Audit F-006 : reconstructibilité réelle de l'Index

- Date : 2026-09-26
- Statut : `CLOSED — prochaine tranche choisie`
- Base auditée : `fb8a7a610440973575991d61b97ccc057a97bb9f`
- Prérequis : ACTION-0082

## But

Vérifier si F-006 peut être fermé par preuve seulement ou s'il reste un écart
produit après les tranches journal, seen/unseen, stable identity et resume.

## Socle déjà présent

Le runtime possède déjà :

- Open / Refresh / Rebuild séparés;
- publication/rebuild transactionnels;
- rollback et dernier Index fiable;
- `reconstructible_digest()` du corpus/hiérarchie;
- `MapBuildReport.nonReconstructible`;
- source binding, stable identity et exclusion policy;
- relations/content-signals stockés hors Index et adressés par des identités
  logiques/chemins relatifs plutôt que par un numéro d'Index durable;
- resume state stocké dans le catalogue.

TASK-0031 / ACTION-0048 a déjà prouvé qu'un rebuild **sur le même Index**
conserve le digest et l'`index_id`.

F-006 demande autre chose : supprimer l'Index canonique puis le refaire.

## Écart 1 — inventaire non reconstructible périmé

`NON_RECONSTRUCTIBLE_KEYS` vaut encore seulement `built_unix_ms`.

Depuis TASK-0037/TASK-0038, l'Index contient aussi de l'état qui n'est pas
recréable depuis la source seule :

- `index_id`;
- `index_revision`;
- journal `change_events`;
- accusés/filigrane seen-unseen;
- compteur `next_node_id`;
- numéros canoniques de node quand l'historique a créé des trous;
- tout état legacy `nodes.seen` encore significatif doit être classé sur faits.

L'inventaire F-006 doit être mis à jour, pas déduire la vérité de la vieille
constante.

## Écart 2 — IDs numériques après perte complète de l'Index

Un rebuild normal réutilise les `stable_key` déjà stockées et conserve les
IDs. Après suppression physique du fichier, cette mémoire n'existe plus.

Un cerveau avec historique peut donc reconstruire le même corpus logique avec
une autre allocation de `node_id`.

La preuve F-006 doit comparer le corpus/hiérarchie par identité logique et
parenté, pas prétendre que les numéros de ligne sont reconstructibles.

## Écart 3 — resume hors Index peut se recoller au mauvais nœud

`ResumeState` persiste dans `catalog_meta` avec `focus_node_id` et
`selected_node_id`.

Au restore, `resume_state.rs` vérifie actuellement seulement que le numéro
existe dans l'Index courant. Il ne vérifie pas que l'Index est la même
**génération** que celle sur laquelle le resume a été enregistré.

Après perte/recréation complète de l'Index, un ancien numéro peut exister de
nouveau mais désigner un autre nœud. Le restore pourrait alors accepter un
focus/sélection sémantiquement faux.

Ceci empêche de fermer F-006 par simple preuve.

## Choix

La prochaine tranche est :

**TASK-0049 — V1 Reconstructibility & Index-Generation Safety.**

Elle doit réutiliser `index_id` comme génération canonique d'Index, et rendre
le resume sûr face à une génération différente, sans créer un second système
d'identité.

L'exécuteur doit auditer avant code la manière la plus petite de lier un resume
à la génération sur laquelle ses node IDs ont été enregistrés.

## Invariants

- pas de bouton produit « supprimer l'Index »;
- la suppression est un geste de preuve hors runtime, application fermée;
- reconstruction par le pipeline existant;
- policy d'exclusion du catalogue conservée;
- relations/content-signals/décisions hors Index non effacés;
- source jamais modifiée;
- journal perdu par suppression déclaré non reconstructible, jamais synthétisé;
- aucun faux événement source pour recréer l'historique;
- aucune tentative de préserver artificiellement l'ancien `index_id`;
- la sécurité resume préfère corriger/effacer une ref node-scoped plutôt que la
  recoller à un numéro potentiellement réutilisé.

## Conclusion

F-006 reste PROPOSED. Ce n'est plus seulement un manque de preuve :
l'inventaire non reconstructible et la sécurité resume inter-génération
nécessitent une tranche ciblée.
