# ACTION-0074 — Audit des écarts V1 après TASK-0044

- Date : `2026-09-25`
- Statut : `CLOSED / NEXT SLICE SELECTED`
- Base : `TASK-0044 VERIFIED` par `ACTION-0073`
- Portée : choisir la prochaine tranche V1 à partir du runtime courant, sans se fier aux statuts historiques périmés

## 1 — Ce que TASK-0044 ferme

Le contrôle de TASK-0044 permet de réconcilier la matrice :

- `F-002` : isolation + reprise brain-scoped présentes;
- `F-013` : panneau masquable et persistant par cerveau;
- `F-022` : filtre désormais persistant par cerveau, sans curseur stocké;
- `F-034` : trois cerveaux retrouvent leur état après bascule et redémarrage.

`P-19` reste partielle, explicitement.

## 2 — Écart P-20 restant dans le runtime courant

`P-20` exige aussi :

> nom, couleur et icône modifiables et persistants par cerveau.

Le backend existe déjà :

- `map_brain_update`;
- `BrainCatalog::update_metadata`;
- validation Rust du nom, de la couleur et de l'icône;
- persistance dans la table `brains`;
- isolation déjà prouvée historiquement par `TASK-0018 / K7`.

Mais le runtime produit actuel `src/map/MapApp.tsx` :

- n'appelle jamais `map_brain_update`;
- affiche nom/couleur/icône;
- n'offre aucun geste utilisateur pour les modifier.

Donc `F-033` reste réellement manquante dans le runtime V1 courant et empêche
de considérer `P-20` complète.

C'est un écart petit, borné et reuse-first : aucun modèle de stockage nouveau
n'est nécessaire.

## 3 — Écart FR/EN confirmé, mais tranche suivante après F-033

La matrice disait historiquement `F-035 = IMPLEMENTED`.

Ce statut ne décrit plus le runtime courant :

- `src/App.tsx` + `src/lib/locale.ts` sont le prototype historique bilingue;
- `src/map/MapApp.tsx` force `strings.fr`;
- `document.documentElement.lang = "fr"`;
- `SourceObservationBadge`, `WatchStatusBadge` et
  `ContentObservationsPanel` possèdent déjà FR/EN;
- plusieurs panneaux actuels restent entièrement codés en français.

La matrice est corrigée : `F-035 = PROPOSED` pour le runtime V1 courant.

Cet écart est plus large que F-033 : il traverse MapApp et plusieurs panneaux.
Il doit rester une tranche distincte afin de ne pas mélanger personnalisation
multi-cerveaux et localisation.

## 4 — Accessibilité

`F-036 / P-21` reste partielle :

- plusieurs bases clavier existent;
- aucun audit complet WCAG 2.2 AA du runtime courant n'est établi;
- la localisation et l'accessibilité doivent rester deux contrôles distincts,
  même si `P-21` les regroupe.

Aucune tranche accessibilité n'est ouverte ici.

## 5 — Choix de séquence

La prochaine tranche est :

**TASK-0045 — V1 Brain Identity Editor**

Motifs :

1. réutilise exactement le backend déjà acquis;
2. ne crée aucun nouveau stockage;
3. ferme le dernier comportement utilisateur explicitement manquant de
   `F-033 / P-20`;
4. peut être prouvée avec les trois cerveaux déjà utilisés par TASK-0044;
5. garde `F-035 / P-21` séparée et auditable.

La tranche suivante probable, **après contrôle indépendant de TASK-0045**, sera
la localisation complète FR/EN du runtime V1. Elle n'est pas créée par cette
action.
