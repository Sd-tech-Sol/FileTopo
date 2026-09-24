# DEC-0039 — Manual refresh reconciles a full scan into the incremental kernel

- **Date :** 2026-09-24
- **Statut :** `APPROVED`
- **Portée :** `F-029`, productisation de `F-031 / U-B`
- **Prérequis :** `TASK-0040 = VERIFIED` par `ACTION-0067`
- **Encadrement :** `DEC-0009`, `DEC-0010`, `DEC-0038`
- **Hors portée :** watcher `F-030`, indisponibilité `F-032`, W-B/W-C

## Problème

Le bouton produit **Actualiser** existe déjà et :

- relit explicitement la source;
- refuse un scan incomplet;
- conserve l'ancien Index en cas d'erreur;
- produit un résumé exact des changements;
- recharge ensuite la projection.

Mais, après un scan réussi, le chemin appelle encore la publication complète :

`scan complet -> Index::publish_with_identity -> DELETE FROM nodes + réinsertion`.

`TASK-0040` a maintenant vérifié un noyau `U-B` qui applique seulement un lot
déjà réconcilié. Il faut le mettre sur un vrai chemin produit avant de construire
la surveillance automatique.

## Décision

### 1. Actualiser un cerveau existant

Pour un Index actuel et estampé par identité durable :

1. valider brain/source binding avant lecture;
2. résoudre la source;
3. effectuer le **scan complet manuel** actuel;
4. si le scan est incomplet, annulé ou refusé : **zéro mutation**, ancien Index
   servi;
5. comparer ce scan complet à l'Index canonique et dériver un **UpdateBatch
   minimal**;
6. appeler `Index::apply_update_batch`;
7. renvoyer le résumé de journal du lot;
8. recharger la carte comme aujourd'hui.

Le scan reste complet dans cette tranche. `F-029` exige une actualisation
manuelle sûre; la détection incrémentale appartient au futur watcher.

### 2. Première indexation

Si l'Index n'existe pas encore, `Actualiser` conserve le chemin de publication
complète pour établir la baseline.

Aucun événement `CREATED` de masse n'est inventé au premier build.

### 3. Index migré mais non estampé

Un ancien Index dont les lignes n'ont pas encore de `stable_key` ne peut pas
alimenter U-B honnêtement.

Dans ce seul cas, `Actualiser` peut effectuer **une publication complète
identity-aware de restamp**, puis les actualisations suivantes doivent utiliser
U-B.

Ce fallback doit être explicite, testable et impossible sur un Index déjà
estampé.

### 4. Reconstruire

Le geste explicite **Reconstruire** reste un chemin de publication complète.

Il ne sert pas de fallback silencieux pour un échec du noyau incrémental.

Si une actualisation incrémentale échoue après un scan valide, l'opération
échoue et l'ancien Index reste intact; le produit ne doit pas masquer cette
erreur en lançant automatiquement Reconstruire.

### 5. Réconciliateur de scan complet

Le réconciliateur est interne au cœur privilégié.

Entrées :

- le scan complet `nodes + identities`;
- l'Index canonique courant.

Sortie :

- un `UpdateBatch` minimal ou un no-op.

Règles :

- SYSTEM stable key connue → même id canonique;
- clé inconnue → création;
- clé existante absente du scan → suppression;
- PATH_FALLBACK renommé/déplacé → suppression + création;
- un nœud existant n'entre dans `upserts` que si une colonne observée change;
- un déplacement/renommage de dossier inclut naturellement les descendants dont
  chemin/profondeur changent;
- root metadata passe par `RootObservation`;
- aucune heuristique de ressemblance;
- aucun contenu fichier.

Le réconciliateur peut parcourir le corpus canonique pour comparer un **scan
manuel complet**. Cela ne change pas le verdict F-031, qui porte sur
l'application U-B d'un lot déjà réconcilié. Il doit toutefois rester
streaming/borné autant que possible et ne jamais créer un second Index persistant.

### 6. No-op

Si le scan complet représente exactement le même état observable :

- aucun événement;
- aucune révision artificielle;
- aucun rewrite du corpus;
- résumé total = 0.

Un changement de métadonnée réellement stockée mais non journalisée par contrat
(ex. timestamp propre d'un dossier) peut avancer la révision si U-B le considère
effectif; le résumé peut alors rester à 0. Cette distinction doit être
documentée, pas masquée.

### 7. Diagnostics

Le flux doit auditer la cohérence de `node_diagnostics`.

Un scan complet accepté par le produit est aujourd'hui sans diagnostic; si des
diagnostics historiques existent, le résultat après actualisation réussie ne
doit pas laisser un diagnostic obsolète attaché à un chemin qui n'a plus le
même sens.

Toute extension nécessaire doit rester transactionnelle avec l'application du
lot, sans créer une seconde publication parallèle.

### 8. Transparence du mode d'application

Le rapport interne/DTO de build doit exposer un mode fermé, non sensible,
permettant de prouver quel chemin a été utilisé :

- `BASELINE_FULL`;
- `INCREMENTAL`;
- `IDENTITY_RESTAMP_FULL`;
- `EXPLICIT_REBUILD_FULL`.

Ce champ est un diagnostic de cycle de vie, pas une identité ni un chemin.

### 9. Interruption et erreur

Avant le commit du lot, toute erreur conserve :

- corpus;
- journal;
- vu/non-vu;
- index_id;
- révision;
- préférences;
- binding.

Aucun fallback complet automatique après erreur U-B.

## Conséquence

Après cette tranche, le noyau U-B sera réellement consommé par **Actualiser**.
Le prochain prérequis avant watcher pourra alors traiter explicitement
l'indisponibilité `F-032` et l'état de fraîcheur, plutôt que construire une
surveillance sur un flux manuel encore ancien.
