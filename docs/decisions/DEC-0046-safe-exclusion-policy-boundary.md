# DEC-0046 — Frontière de la politique d'exclusion sûre V1

- **Date :** 2026-09-26
- **Statut :** `APPROVED`
- **Portée :** `F-005`
- **Prérequis :** `ACTION-0080`
- **Branche d'exécution :** `build/v0.2-a32-v1-safe-exclusion-policy`

## Contexte

Le scanner FileTopo possède déjà une frontière de sécurité non désactivable :

- une racine symlink/reparse est refusée;
- une entrée symlink/reparse est classée `Skipped`;
- elle n'est jamais suivie;
- `observe_entry` est déjà la classification commune au scan complet et au
  chemin W-B du watcher.

Ce socle ne satisfait pas encore `F-005` : l'utilisateur ne peut pas définir,
voir ou modifier des exclusions propres à un cerveau.

## Décision A — réutiliser l'existant, aucune dépendance de glob

La V1 n'introduit ni `ignore`, ni `globset`, ni moteur `.gitignore`.

Le contrat V1 est volontairement plus petit :

- une règle = **un chemin relatif exact de sous-arbre**;
- la règle vise ce chemin et tous ses descendants;
- aucune wildcard;
- aucune négation;
- aucune règle globale implicite supplémentaire;
- la sécurité reparse/symlink reste indépendante et non désactivable.

La normalisation et la comparaison reposent sur `std::path`.

## Décision B — représentation canonique

Le backend est autoritaire.

Une règle acceptée doit être :

- relative à la racine du cerveau;
- non vide;
- jamais absolue;
- sans préfixe disque/UNC;
- sans composant `..`;
- sans composant `.` persistant après normalisation;
- indépendante du séparateur saisi par l'UI;
- stockée sous une forme canonique portable et sans chemin absolu.

Les doublons sont éliminés. Une règle descendante rendue redondante par une
règle ancêtre peut être supprimée par canonicalisation, si ce comportement est
testé et documenté.

Aucun contrôle d'existence sur la source n'est requis pour accepter une règle :
une politique doit pouvoir être préparée pendant que la source est absente.

## Décision C — stockage

La politique est **brain-scoped** et persiste dans le catalogue FileTopo
existant, sous `catalog_meta`, avec une enveloppe versionnée.

Aucune nouvelle base, table ou préférence navigateur.

Le stockage ne contient que les chemins **relatifs** des règles.

## Décision D — lecture et modification

Exposer le minimum nécessaire :

- lecture de la politique d'un cerveau;
- remplacement autoritaire de la politique complète d'un cerveau.

Privilégier une commande de remplacement complète et idempotente plutôt qu'une
API add/remove dont l'ordre pourrait devenir une seconde source de vérité.

Le frontend travaille toujours à partir du record renvoyé par le backend.

## Décision E — même politique sur tous les chemins de scan

La politique effective d'un cerveau doit être la même pour :

- scan initial / construction;
- Actualiser;
- Reconstruire;
- W-B ciblé;
- W-C complet;
- traitement des hints watcher.

Une entrée située **dans** un sous-arbre exclu ne doit jamais être lue comme
contenu de ce sous-arbre. Le scanner peut lire le parent nécessaire pour
décider qu'un enfant est exclu; il ne descend pas dans l'exclusion.

Les événements watcher sont toujours des hints. Un hint entièrement situé sous
un sous-arbre exclu ne doit pas provoquer une réconciliation de ce contenu.

## Décision F — visibilité produit

L'utilisateur doit pouvoir :

- voir les règles du cerveau focalisé;
- ajouter un chemin relatif;
- retirer une règle;
- comprendre que la règle porte sur un sous-arbre;
- comprendre que symlink/reparse reste toujours exclu pour sécurité.

Aucun chemin absolu ne traverse le DTO ou l'UI.

FR et EN sont obligatoires dès cette tranche.

## Décision G — effet d'une modification de politique

Une modification de politique est une **modification de configuration FileTopo**,
pas un changement de la source.

Elle ne doit donc jamais fabriquer des événements de journal
`CREATED` / `DELETED` / `MOVED` / `RENAMED` / `MODIFIED` comme si les
fichiers avaient changé.

Avant de coder, l'exécuteur doit auditer le comportement de
`Reconstruire`, du journal et de la publication pour choisir le plus petit
chemin cohérent qui garantit cela.

Acceptable :

- rebase/rebuild explicite de l'Index sous la nouvelle politique sans journal
  de changement source;
- ou autre chemin existant équivalent déjà prouvé.

Interdit :

- masquer des événements après leur création;
- effacer l'historique du journal;
- traiter une exclusion comme une suppression réelle de fichier;
- laisser silencieusement le catalogue et l'Index sous deux politiques sans
  l'indiquer.

Si l'application immédiate ne peut pas rester cohérente sans créer une nouvelle
architecture de transaction inter-DB, préférer une sémantique explicite
« politique enregistrée / application requise » avec état visible, plutôt que
prétendre à une atomicité inexistante. Ce cas doit être documenté et prouvé.

## Décision H — absence de source

Changer/lire la politique n'exige pas que la source soit disponible.

Toute action qui doit rescanner la source peut échouer honnêtement; le dernier
Index fiable reste disponible conformément à `F-032`.

Aucune indisponibilité ne devient une suppression massive.

## Décision I — isolation

Deux cerveaux pointant vers le même dossier peuvent avoir des politiques
différentes.

Leur Index, politique, journal, resume et watcher restent isolés par
`brainId`.

## Décision J — limites et invariants

Inchangés :

- un seul Index canonique;
- VIEW_BUDGET = 512;
- aucun whole-graph DTO;
- chemins absolus backend-only;
- identité stable inchangée;
- watcher = hints;
- PUBLICATION_LOCK pour les writers;
- journal append-only;
- NEW/UNSEEN dérivé du journal;
- source jamais modifiée.

## Décision K — clôture

Si la tranche passe :

- `TASK-0048 = IMPLEMENTED`, jamais auto-`VERIFIED`;
- `F-005 = IMPLEMENTED`, candidate à contrôle indépendant;
- aucune TASK-0049;
- `F-006`, `F-014` et `P-19` restent séparées.
