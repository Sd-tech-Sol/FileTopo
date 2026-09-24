# DEC-0037 — Dynamic filters over the canonical Index and bounded projection

- **Date :** 2026-09-23
- **Statut :** `APPROVED`
- **Portée :** `F-022`, parité `P-09`
- **Prérequis :** `TASK-0038 = VERIFIED` par `ACTION-0064`
- **Encadrement :** `DEC-0031`, `DEC-0034`, `DEC-0036`

## Problème

`F-022` doit fournir « Tout / Nouveaux / Non vus », le type et la
disponibilité, avec critères combinables et compte exact dérivé de l’Index.

Deux contraintes existantes interdisent une implémentation naïve :

1. le frontend ne reçoit jamais le corpus complet;
2. « nouveau / non vu » doit provenir du journal de changements, jamais de
   `nodes.seen`.

Un filtre appliqué seulement aux quelques nœuds déjà rendus donnerait un total
faux et cacherait les correspondances hors de la projection. À l’inverse,
sérialiser tous les matches violerait la frontière bornée.

## Décision

Les filtres sont des **paramètres de projection read-only** appliqués côté
Rust/SQLite au **seul Index canonique**.

### 1. Modèle de filtre

Trois groupes :

- état : `ALL | NEW | UNSEEN` — un seul mode à la fois;
- types : ensemble parmi `DIRECTORY | FILE | SKIPPED`; ensemble vide = tous;
- disponibilité : `ALL | LOCAL | ONLINE_ONLY`.

Les groupes se combinent par **ET**. Les types sélectionnés se combinent par
**OU**.

`NEW` et `UNSEEN` sont dérivés exactement de `DEC-0036` :

- `NEW` : nœud courant avec au moins un `CREATED` non vu;
- `UNSEEN` : nœud courant avec au moins un événement non vu.

`nodes.seen` est interdit dans les requêtes de cette fonction.

La racine n’est jamais une correspondance filtrée; elle peut seulement être
affichée comme contexte.

### 2. « Tout »

Dans le groupe d’état, `ALL` signifie « aucune contrainte new/unseen ».
Cela n’annule pas les facettes type/disponibilité.

L’interface porte une action séparée **Réinitialiser les filtres** qui remet
tous les groupes à leur défaut.

### 3. Projection filtrée

Sans filtre actif, `map_view` garde son comportement actuel inchangé.

Avec au moins une contrainte active :

1. SQLite calcule le **total exact** de nœuds correspondants dans le cerveau;
2. une page keyset bornée de matches est lue côté cœur;
3. pour chaque match accepté, sa chaîne d’ancêtres nécessaire au contexte est
   ajoutée;
4. matches + contexte restent sous les bornes de `DEC-0031/DEC-0034`;
5. le layout est recalculé uniquement sur cette vue bornée;
6. le DTO distingue explicitement **match** et **contexte**.

Un ancêtre de contexte qui ne satisfait pas le filtre ne doit jamais être
compté comme match.

### 4. Budget

La borne technique reste **512 entités par cerveau, agrégats inclus** et la
projection reste petite.

Le mode filtré vise au plus la cible ordinaire de **64 vrais nœuds au total,
contexte compris**, sauf ancestry obligatoire déjà plus grande; le plafond
technique reste l’unique hard stop.

Les matches sont consommés un par un. Si ajouter le prochain match avec ses
ancêtres ferait dépasser la cible de cette page, ce match devient le premier de
la page suivante; il n’est ni perdu ni partiellement matérialisé.

### 5. Pagination filtrée

La pagination porte sur les **matches**, pas sur les nœuds de contexte.

Cursor versionné, opaque, lié au minimum à :

- `index_id`;
- `index_revision`;
- la forme canonique du filtre;
- le dernier match servi.

Un cursor d’un autre cerveau/index, d’une autre révision ou d’un autre filtre est
refusé.

L’ordre des matches est déterministe et keyset; aucun `OFFSET` sur le hot path.

Les marquages vu/non-vu ne peuvent que retirer des matches de `NEW/UNSEEN`,
jamais en créer. Une relecture après marquage repart de la première page dans
l’UI; la correction du cursor n’a pas à inventer un « seen revision ».

### 6. DTO

La projection filtrée expose au minimum :

- filtre canonique appliqué;
- `filteredTotal` exact;
- nombre de matches matérialisés;
- ids matérialisés qui sont de vrais matches;
- cursor de page suivante;
- nœuds de contexte distincts des matches.

Aucun chemin absolu, stable_key, FileId ou donnée machine supplémentaire.

Les agrégats « enfants omis » du mode topographique normal ne doivent pas être
réinterprétés comme des résultats de filtre. En mode filtré, ils peuvent être
vides; la pagination filtrée est une surface distincte.

### 7. Disponibilité

`LOCAL` / `ONLINE_ONLY` dérivent du champ canonique `nodes.online_only`.
Aucune hydratation Cloud Files ni lecture de contenu n’est déclenchée.

### 8. Interaction

Le filtre porte sur tout le cerveau actif.

En mode filtré :

- cliquer un match ou un nœud de contexte peut le sélectionner;
- l’UI indique explicitement quels nœuds sont **Correspondance** et lesquels
  sont **Contexte**;
- la pagination du filtre remplace la page de matches, sans accumuler;
- effacer les filtres revient à la projection topographique normale.

La persistance des filtres au redémarrage appartient à `P-19` et n’est pas
requise pour fermer `F-022 / P-09` dans cette tranche.

## Hors portée

- watcher `F-030`;
- incrémental `F-031`;
- persistance cross-restart des filtres;
- facettes dynamiques supplémentaires;
- filtre par contenu/IA;
- nouvelle base, second Index, whole-graph DTO.
