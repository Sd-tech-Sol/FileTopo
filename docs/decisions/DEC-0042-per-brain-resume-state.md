# DEC-0042 — Per-brain resume state belongs to the catalogue

- **Date :** 2026-09-25
- **Statut :** `APPROVED`
- **Portée :** reprise V1 par cerveau, `P-19` / `P-20` partiels
- **Prérequis :** `TASK-0043` VERIFIED par `ACTION-0072`
- **Hors portée :** persistance d'une composition multi-cerveaux, traduction FR/EN, préférences d'accessibilité

## Constat

Le runtime possède déjà plusieurs morceaux de reprise :

- le **cerveau actif** survit au redémarrage dans `catalog_meta`;
- nom, couleur et icône sont déjà persistants dans `brains`;
- vu / non vu est déjà persistant dans l'Index du cerveau;
- la visibilité du panneau Détails est persistée, mais **globalement**;
- pan/zoom, sélection et composition vivent seulement dans
  `CompositionSessionMemory`;
- le filtre dynamique vit seulement dans `useProjectionFilter` et est
  abandonné lors d'un changement de cerveau.

Créer un autre magasin serait une architecture parallèle inutile.

## Décision

Le **catalogue existant** reste le magasin du non-reconstructible d'interface.
Chaque cerveau possède un petit état de reprise versionné.

Aucune nouvelle base.

Le pipeline de reprise est :

`catalogue -> état de reprise du brain -> validation contre l'Index courant -> projection bornée -> MapApp`.

L'Index reste la vérité du corpus. Le resume state ne peut jamais rendre un
nœud valide s'il ne l'est plus dans l'Index.

## 1. Contenu du resume state V1

Le record est strictement non sensible et borné. Il peut contenir :

- `focusNodeId` optionnel;
- `selectedNodeId` optionnel;
- caméra `scale / tx / ty`;
- critères du filtre dynamique:
  `state / kinds / availability`;
- visibilité du panneau Détails.

Il **ne contient jamais** :

- chemin absolu ou relatif;
- nom de fichier/dossier;
- stable key;
- FileId / volume / identité système;
- contenu;
- curseur SQLite opaque;
- page entière, liste de nœuds ou projection;
- état vu/non vu, déjà autoritaire dans l'Index;
- nom/couleur/icône, déjà autoritaires dans `brains`.

Le cerveau est la clé de stockage; un `nodeId` stocké seul n'est jamais exposé
comme identité globale.

## 2. Stockage

Réutiliser `catalog_meta` avec une clé versionnée et brain-scoped, par exemple
`brain_resume.v1.<brainId>`, ou une forme équivalente démontrée sûre.

Le JSON persisté est une enveloppe fermée et versionnée.

Pas de bump de `CATALOG_SCHEMA_VERSION` si aucune structure SQL ne change.

Un record :

- absent;
- d'une version inconnue;
- JSON invalide;
- avec nombre non fini / hors bornes;
- avec filtre hors vocabulaire

doit être traité comme **état absent**, jamais comme raison de ne pas ouvrir le
cerveau.

La lecture d'un record corrompu ne touche ni la source ni l'Index.

## 3. Ancienne préférence globale du panneau

`details_panel_visible` existe déjà comme préférence historique globale.

Compatibilité :

- si un cerveau n'a pas encore de resume state, cette ancienne valeur sert de
  **défaut de transition**;
- dès qu'un état brain-scoped existe, il est autoritaire pour ce cerveau;
- une modification future du panneau écrit seulement l'état du cerveau actif;
- deux cerveaux peuvent donc conserver des valeurs opposées.

Ne pas supprimer brutalement l'ancienne clé : elle reste un fallback de
migration pour les profils existants.

## 4. Caméra

Le format stocké est `scale / tx / ty`, mais une valeur sauvegardée n'est
jamais appliquée aveuglément.

Après chargement de la projection courante :

- nombres finis obligatoires;
- `clampView` contre le **world et viewport courants**;
- si l'état est invalide, utiliser la vue d'ouverture normale;
- aucun NaN/Infinity ou ancienne géométrie ne peut rendre la carte
  inatteignable.

La persistance doit être **bornée en écritures** : ne pas écrire SQLite à
chaque frame d'un drag.

Une action terminée doit cependant atteindre le catalogue rapidement et un
changement de cerveau doit sauvegarder l'état sortant avant la bascule.

## 5. Focus et sélection

Au restore :

- vérifier le `nodeId` dans **l'Index courant du même cerveau**;
- un focus encore présent peut alimenter `map_view(focusId)`;
- une sélection encore présente doit être restaurée dans une projection où elle
  est atteignable;
- si le nœud a disparu, repli explicite vers un état valide (focus/racine) et
  correction du record persisté;
- jamais d'erreur parce qu'un vieux id existe dans un autre cerveau.

Le watcher peut avancer la révision pendant ou avant la reprise; le restore se
fait toujours contre la révision réellement servie.

## 6. Filtre

On persiste **le filtre logique**, jamais son curseur keyset.

Au redémarrage :

- normaliser le filtre avec les mêmes règles que `TASK-0039`;
- repartir d'une page construite sur la révision actuelle;
- ne jamais réutiliser un curseur lié à une ancienne révision.

Si la sélection sauvegardée est toujours valide **et correspond toujours au
filtre**, la reprise doit être capable de matérialiser la page qui la contient,
même si elle n'est pas sur la première page.

Cela peut exiger une primitive backend bornée pour retrouver une page à partir
d'un `nodeId`; elle doit interroger l'Index canonique, pas parcourir tout le
frontend.

Si la sélection ne correspond plus au filtre courant, le filtre reste
autoritaire et la sélection retombe vers une cible valide avec un comportement
documenté.

## 7. Composition multi-cerveaux

La composition complète reste **session-only** dans cette tranche.

Au redémarrage :

- le cerveau actif persistant s'ouvre seul;
- son resume state brain-scoped est restauré.

Pendant une même session, `CompositionSessionMemory` continue de gérer les
compositions multi-cerveaux.

Ne pas créer un second système concurrent : pour une composition d'un seul
cerveau, l'état persistant doit s'intégrer à la mémoire existante.

## 8. Frontières de P-19 / P-20

Cette décision **ne ferme pas P-19 au complet**.

Restent explicitement séparés :

- choix de langue FR/EN;
- options d'accessibilité;
- toute éventuelle préférence de légende si le produit en crée une.

Le but est de fermer la **reprise brain-scoped actuellement manquante** :
caméra, focus/sélection, filtre et panneau.

Elle renforce fortement `P-20` et peut fermer les écarts de reprise de
`F-002 / F-034`, mais aucun statut ne monte sans preuve indépendante.

## 9. Écriture et concurrence

Les writes de resume state :

- touchent seulement le catalogue;
- ne prennent pas `PUBLICATION_LOCK`;
- ne déclenchent jamais le watcher;
- ne touchent jamais l'Index;
- sont sérialisés / latest-wins de façon bornée côté interface ou backend.

Un événement watcher qui recharge une projection ne doit pas effacer l'état
persisté du cerveau.

## 10. Critère de vérité

Sur **trois cerveaux** :

1. donner à chacun caméra, sélection/focus, filtre et visibilité de panneau
   différents;
2. basculer entre eux et retrouver exactement leur état propre;
3. fermer réellement l'application;
4. relancer;
5. le cerveau actif précédent revient seul avec son état;
6. basculer vers les deux autres et retrouver leur propre état;
7. aucune préférence n'a fui d'un cerveau à l'autre;
8. supprimer le nœud sauvegardé d'un cerveau, laisser le watcher converger,
   relancer : aucun crash ni référence stale, fallback valide;
9. aucune donnée de source n'est stockée dans le resume state.

