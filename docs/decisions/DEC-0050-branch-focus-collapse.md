# DEC-0050 — F-042 branch focus & collapse semantics

- **Date :** 2026-10-06
- **Statut :** `APPROVED`
- **Décision issue de :** ACTION-0095
- **Implémentation prévue :** TASK-0052

## A — Deux gestes distincts

F-042 comporte deux gestes :

1. **Focaliser une branche** : la branche choisie devient la racine de la vue
   temporaire. Aucun nœud extérieur à son sous-arbre n'est rendu.
2. **Replier / déplier** : un dossier visible peut cacher/restaurer exactement
   ses descendants dans cette vue.

Les deux sont réversibles et session-only dans TASK-0052.

## B — Branch focus est une projection bornée, pas un filtre CSS

Le backend matérialise réellement une projection de branche.

Interdit :

- recevoir le graphe entier puis cacher côté React;
- garder des nœuds extérieurs dans le rendu et les rendre invisibles;
- cloner l'Index;
- sérialiser un whole-graph DTO.

La projection de branche réutilise l'Index, `children_page`, le budget de vue,
les agrégats et le layout existants.

## C — Matérialisation dans le sous-arbre

La projection de branche part du dossier focalisé et remplit la vue avec des
descendants uniquement, de façon déterministe et bornée.

- le dossier focalisé reste présent;
- aucun ancêtre, frère ou autre cerveau n'est rendu dans le mode branch focus;
- les dossiers non repliés peuvent être parcourus récursivement tant que le
  budget courant le permet;
- la pagination/agrégation reste honnête;
- aucune perte silencieuse d'enfant.

L'ordre canonique existant est conservé.

## D — Repli

Un dossier replié reste visible, mais **aucun de ses descendants** n'est
matérialisé/rendu dans la projection.

Le repli porte un compte exact :

`hiddenDescendantCount`

qui compte tous les descendants réels masqués, pas seulement les enfants
directs.

Le compte est calculé depuis l'Index canonique. Il ne peut être estimé,
tronqué ou remplacé par `child_count`.

Aucun nouveau nœud fictif de dossier n'est créé. L'état replié est signalé sur
le dossier lui-même avec un mot + un glyphe, sans couleur seule.

## E — Dépli

Déplier retire seulement ce dossier de l'ensemble des replis.

À focus, filtre, pagination et budget identiques, la projection redevient
déterministement celle qui existait avant son repli. Les descendants redeviennent
atteignables; aucune autre branche n'est modifiée.

## F — Focus de branche

L'action « Focaliser la branche / Focus branch » est disponible pour un dossier.

Entrer :

- mémorise en session la composition/vue/sélection à restaurer;
- quitte une projection filtrée par le chemin de navigation existant;
- montre uniquement le sous-arbre du dossier;
- affiche explicitement « Branche focalisée / Focused branch » et le chemin;
- offre « Quitter le focus / Exit branch focus » en une action.

Quitter restaure la composition/session précédente sans modifier l'Index.

## G — Plusieurs cerveaux

Le branch focus est temporairement mono-cerveau : les autres territoires ne sont
pas rendus pendant le focus de branche. Ils réapparaissent exactement en
quittant le focus.

Aucun store relation, cerveau, source ou Index n'est modifié.

## H — Clavier / accessibilité

Tous les gestes ont des boutons natifs ou treeitems existants :

- focus branch;
- collapse;
- expand;
- exit focus.

Enter et Space doivent fonctionner là où approprié. Le focus clavier ne tombe
jamais sur `body` lorsqu'un sous-arbre est retiré.

État focalisé/replié annoncé en mots; aucune sémantique par couleur seule.

## I — Compte exact des descendants

TASK-0052 peut ajouter une primitive Index dédiée
`descendant_count(node_id)`, mais :

- pas de nouvelle DB;
- pas de cache approximatif;
- pas de colonne persistante sans justification séparée;
- plan SQLite et exactitude doivent être testés;
- le calcul ne doit pas sérialiser les descendants vers le frontend.

## J — Persistance

Dans TASK-0052 :

- branch focus et collapsed ids sont **session-only**;
- aucune modification de resume-state P-19;
- la tâche suivante de fermeture P-19 devra intégrer ces valeurs.

## K — Invariants

- VIEW_BUDGET reste 512;
- ordinary target reste borné;
- source en lecture seule;
- relations inchangées;
- filtres dynamiques inchangés;
- agrégats FileTopo restent distincts d'un dossier replié;
- F-046 hors portée.


## L — Clarification ACTION-0096 : le root focalisé est repliable

Le dossier qui sert de racine à la projection de branche est un **dossier
visible** au sens des §§A/D. Il n'est pas une exception.

Le replier :

- garde le root lui-même;
- retire tous ses descendants matérialisés;
- porte le compte exact de tous ses descendants réels;
- retire tout agrégat attaché au root pendant le repli;
- conserve la possibilité de déplier immédiatement.

Aucune règle « rootCannotCollapse » n'est autorisée.
