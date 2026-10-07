# ACTION-0098 — Audit P-19 après F-042

- **Date :** 2026-10-06
- **Statut :** `CLOSED — prochaine tranche choisie`
- **Base auditée :** `9d682ee71198f7550db724fb2d78f99f026ea22f`
- **Prérequis :** TASK-0052 / F-042 VERIFIED par ACTION-0097

## Ce qui est déjà persistant et VERIFIED

### Par cerveau

`TASK-0044 / ACTION-0073` :

- focus de projection;
- sélection;
- caméra;
- filtre logique;
- panneau Détails;
- restauration après vrai redémarrage;
- isolation sur trois cerveaux.

`TASK-0038 / ACTION-0064` :

- vu/non-vu et gestes associés.

### Global

`TASK-0046 / ACTION-0077` :

- choix FR/EN, source de vérité actuelle = `filetopo.locale` dans
  `localStorage`.

Catalogue :

- cerveau actif;
- identités de cerveau.

## Ce qui reste réellement ouvert

1. **Composition multi-cerveaux courante**
   - `compositionSession.ts` est explicitement session-only;
   - seulement le cerveau actif survit aujourd'hui.

2. **Légende**
   - `legendOpen` est un `useState(false)`;
   - TASK-0050 a explicitement laissé le restart à P-19.

3. **F-042**
   - branch focus + collapsed ids sont explicitement session-only;
   - TASK-0052/ACTION-0097 les a réservés à P-19.

4. **M-1 / Préférences**
   - REFERENCE_INTERFACE exige de mémoriser « vue, panneau, filtres, légende,
     densité et accessibilité »;
   - la matrice n'a toujours aucun propriétaire dédié;
   - densité n'existe encore comme préférence runtime nulle part;
   - l'accessibilité runtime respecte `prefers-reduced-motion`, mais il n'existe
     aucune préférence utilisateur FileTopo à mémoriser.

## Décision M-1

Créer une fonction dédiée :

**F-052 — Préférences et reprise du workspace**

Elle possède seulement ce qui n'a pas déjà un propriétaire persistant :

- composition actuellement affichée;
- caméra + sélection de cette composition;
- légende ouverte/fermée;
- densité globale `comfortable | compact`;
- préférence de mouvement `system | reduce`;
- branch focus actif + collapsed ids + état nécessaire à « Quitter le focus ».

Elle **ne duplique pas** :

- resume-state par cerveau;
- langue;
- vu/non-vu;
- identité du cerveau.

Ainsi M-1 est résolu par propriété explicite, pas par duplication.

## Densité

Aucune sémantique historique n'existe dans le repo.

Pour éviter d'inventer un changement de topologie, la densité V1 est définie
comme **densité du chrome applicatif** :

- `comfortable` par défaut;
- `compact` réduit espacements/paddings des contrôles et panneaux;
- ne modifie ni layout de carte, ni positions de nœuds, ni budget, ni Index.

## Accessibilité configurable

La préférence V1 est :

- `motion = system` : respecter `prefers-reduced-motion`;
- `motion = reduce` : forcer la réduction des animations.

Il n'existe volontairement aucun mode « force motion » : FileTopo ne doit
jamais contourner une préférence OS de réduction du mouvement.

Les autres exigences d'accessibilité restent des invariants P-21, pas des
préférences.

## Stockage

Réutiliser `catalog_meta`, déjà utilisé pour l'état applicatif
non reconstructible.

Créer un enregistrement global versionné et borné. Pas de nouvelle DB.

Le backend doit attacher lui-même les `index_id` nécessaires aux références
de nœuds persistées afin qu'un rebuild ne puisse jamais faire pointer un ancien
`nodeId` vers un autre objet.

## Ordre

Créer :

**TASK-0053 — V1 Workspace Preferences & Persistence / P-19 Closure**

Si VERIFIED, cette tranche ferme :

- F-052;
- M-1;
- P-19.

F-046 reste indépendante. Aucune TASK-0054.
