# DEC-0038 — Incremental application kernel before watcher integration

- **Date :** 2026-09-23
- **Statut :** `APPROVED`
- **Portée :** `F-031`, option `U-B` de `DEC-0010`
- **Prérequis :** identité stable `TASK-0036`, journal `TASK-0037`, vu/non-vu `TASK-0038`, filtres `TASK-0039` — tous VERIFIED dans leur portée
- **Hors portée :** watcher `F-030`, indisponibilité `F-032`, persistance P-19

## Problème

Le runtime actuel est sûr mais reste un remplacement complet :

`scan complet -> diff global -> DELETE FROM nodes -> réinsertion complète`

dans une transaction.

Cela protège l'ancien Index en cas d'échec de scan et rend le journal exact,
mais le coût d'application reste proportionnel à la taille du corpus.
`DEC-0010` a déjà retenu `U-B` : appliquer seulement les changements par
identité stable.

Le watcher ne doit pas être construit avant ce noyau, sinon il n'aurait qu'un
chemin de remplacement complet à appeler.

## Décision

Construire d'abord un **noyau interne d'application incrémentale**, sans
nouvelle commande WebView et sans mécanisme de surveillance.

Le noyau reçoit un lot déjà observé/réconcilié par le cœur privilégié et
applique seulement les nœuds touchés.

### 1. Frontière du lot

La forme Rust exacte reste à l'implémentation, mais le contrat doit distinguer :

- des **upserts** portant les métadonnées observées et une
  `NodeIdentity { stable_key, provenance }`;
- des **suppressions** nommant des ids canoniques déjà connus;
- les références de parent nécessaires pour résoudre un parent existant ou un
  autre nœud du même lot.

Aucun type de lot ne traverse Tauri/React. Les stable keys restent internes.

### 2. Identité

Pour chaque upsert :

- stable key déjà connue → réutiliser exactement le même id canonique;
- stable key nouvelle → allouer via `next_node_id`, monotone;
- collision → refus explicite;
- `PATH_FALLBACK` ne corrèle jamais un renommage/déplacement : le producteur
  du lot fournit alors suppression + création;
- aucune ressemblance nom/taille/date ne devient identité.

### 3. Atomicité

Un lot est une transaction `IMMEDIATE`.

Dans la même transaction :

1. valider le lot;
2. lire seulement les lignes nécessaires;
3. résoudre/allouer les ids;
4. appliquer inserts/updates/deletes ciblés;
5. remettre à jour les parents/compteurs nécessaires;
6. produire les événements du journal pour les seules lignes touchées;
7. écrire `node_count`, `next_node_id` si nécessaire;
8. avancer la révision une seule fois;
9. commit.

Erreur n'importe où → corpus, journal, watermark/acquittements, métadonnées et
révision restent exactement comme avant.

Un lot sans changement observable est un **no-op** : aucun événement et aucune
révision artificielle.

### 4. Hiérarchie

Le noyau ne doit jamais laisser un orphelin ou inventer un parent.

Une suppression de dossier doit être fermée sur ses descendants, sauf si ces
descendants sont explicitement réattachés dans le même lot.

Un déplacement/renommage de dossier qui change chemin/profondeur doit inclure
la matière nécessaire pour remettre ses descendants cohérents, ou être refusé
comme lot incomplet. Le futur `W-B` produira naturellement un lot de
sous-arbre.

Le noyau peut recalculer les `child_count` des seuls parents affectés; il ne
doit pas rescanner le corpus pour les reconstruire tous.

### 5. Journal et état vu/non-vu

Le journal existant reste append-only.

Le moteur incrémental ne doit pas appeler le diff global `load_previous` sur
tout le corpus. Il compare seulement l'avant/après des nœuds du lot.

Les cinq natures de `TASK-0037` restent les seules.

Les nouveaux événements ont la révision unique du lot et deviennent non vus
selon `TASK-0038`. Aucun ancien événement ni acquittement n'est réécrit.

### 6. Métadonnées / diagnostics

Le nombre de nœuds, root_id, next_node_id et diagnostics affectés doivent rester
cohérents.

La racine ne peut pas être supprimée ou réparentée par un lot incrémental.
L'absence/inaccessibilité de la racine appartient à `F-032`.

### 7. Performance

La preuve de `F-031` porte sur **l'application d'un lot déjà réconcilié**,
qui est précisément `U-B`.

Mesurer le même noyau produit sur des Index synthétiques de 1k, 10k et 100k
avec 10 changements, plus 100k avec 1000 changements, au moins cinq exécutions
par cas.

Rapporter médiane et min/max.

Le critère de rejet de `BASELINE_TARGETS §3.3` est obligatoire :

> à 10 changements, la durée 100k ne dépasse pas 2× la durée 1k.

Les cibles absolues sont rapportées comme mesures de la machine d'essai, jamais
généralisées.

### 8. Ce que cette décision ne livre pas

- détection de changements disque;
- `ReadDirectoryChangesExW`;
- coalescence watcher;
- réénumération W-B/W-C;
- états « à vérifier » / « indisponible »;
- remplacement de l'Actualiser produit actuel.

Ces éléments consommeront ce noyau dans les tranches suivantes.
