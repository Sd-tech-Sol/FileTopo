# ACTION-0095 — Audit V1 post-TASK-0051

- **Date :** 2026-10-06
- **Statut :** `CLOSED — prochaine tranche choisie`
- **Base auditée :** `e240eb97ceda9b3228438fe5c77229a5bede3f73`
- **Prérequis :** TASK-0051 / P-04 VERIFIED par ACTION-0094

## Candidats ouverts

### P-19 — persistance complète

Déjà acquis :

- caméra/focus/sélection par cerveau;
- filtres;
- panneau Détails;
- vu/non-vu;
- cerveau actif et identité;
- langue FR/EN globale persistante.

Encore ouverts ou session-only :

- état de légende;
- composition multi-cerveaux complète;
- préférences de densité/accessibilité à clarifier par M-1;
- futur état F-042 repli/focus de branche.

### F-042 — repli/dépli et focus de branche

Toujours `PROPOSED`, mais promu au MVP par DEC-0029 parce que ces gestes
déterminent le contenu de la vue matérialisée.

Primitives déjà disponibles :

- Index canonique;
- `children_page` keyset borné;
- `ancestor_chain`;
- `map_view(focusId, after)`;
- VIEW_BUDGET 512 / ordinary target 64;
- agrégats exacts d'enfants directs;
- navigation clavier et activation d'agrégats;
- composition/session memory.

Manque réel :

- aucun état explicite de branche repliée;
- aucun vrai mode « focaliser cette branche » excluant les nœuds extérieurs;
- aucun compte exact de descendants masqués par un repli.

### F-046 — identité physique persistante

Toujours `PROPOSED` pour la partie `VolumeSerialNumber + FileId`.
Indépendante de la persistance UI et de la navigation progressive.

## Ordre choisi

1. **F-042 maintenant.**
2. **P-19 ensuite**, afin que la fermeture de persistance inclue l'état F-042
   au lieu de devoir rouvrir P-19.
3. F-046 après cette fermeture de navigation/persistance, sauf nouveau blocage.

## Décision

Créer :

**TASK-0052 — V1 Branch Focus & Collapse / F-042 Closure**

La tranche ne ferme pas P-19 et ne persiste pas encore les états F-042 :
session-only volontairement, avec la persistance explicitement réservée à la
tranche P-19 suivante.

Aucune TASK-0053.
