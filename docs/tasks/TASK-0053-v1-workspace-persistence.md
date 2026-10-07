# TASK-0053 — V1 Workspace Preferences & Persistence / P-19 Closure

- **Date :** 2026-10-06
- **Statut :** `READY`
- **Branche :** `build/v0.2-a37-v1-workspace-persistence`
- **Décision :** `DEC-0051`
- **Portée :** `F-052`, `M-1`, `P-19`
- **Exécuteur prévu :** Claude Code

## Objectif

Fermer P-19 sans dupliquer les sources de vérité déjà vérifiées.

Livrer F-052, persister le workspace global et les préférences manquantes, puis
prouver au redémarrage la composition de toutes les valeurs P-19.

## Réutilisation obligatoire

Avant code, inventorier et réutiliser :

- `BrainCatalog::meta/put_meta`;
- versioning/validation de `resume_state.rs`;
- scheduling/flush du resume frontend;
- `compositionSession.ts`;
- `branchFocus.ts`;
- `locale.ts`;
- store vu/non-vu existant.

Aucune nouvelle DB.

## P19-1 — F-052 store

Créer un store global workspace versionné, borné, fermé, dans
`catalog_meta`.

Tests :

- defaults;
- round-trip;
- version inconnue;
- JSON corrompu;
- taille excessive;
- unknown fields;
- aucun path/content;
- écriture atomique;
- ancienne installation sans record.

## P19-2 — composition

Persister/restaurer :

- displayed brains;
- focused brain;
- composition camera;
- composition selection.

Tester 1, 2 et 3 cerveaux, ordre catalogue, cerveau supprimé et sélection
invalide.

Ne persister que la composition active, pas toute `CompositionSessionMemory`.

## P19-3 — génération de nœuds

Le frontend ne choisit jamais l'`index_id`.

Le backend lie lui-même :

- sélection workspace;
- branch root;
- collapsed ids;

à la génération d'Index concernée.

Après rebuild, toute référence d'une ancienne génération est corrigée/abandonnée
avec raison nommée.

## P19-4 — branch focus / collapse

Si FileTopo ferme pendant un branch focus :

- même root après restart;
- mêmes collapsed ids valides;
- même branch view/camera;
- même sélection;
- « Quitter le focus » restaure la composition/vue/sélection pré-focus.

Rebuild entre fermeture et réouverture => branch focus non restauré, correction
explicite.

## P19-5 — légende

`legendOpen` persiste globalement.

Tester ouvert→restart→ouvert et fermé→restart→fermé.

## P19-6 — densité

Ajouter une préférence globale :

- Comfortable / Confortable;
- Compact / Compacte.

Elle modifie seulement le chrome/panneaux. Aucun changement de MapView
topologique, rectangles, projection ou budget.

Persistance après restart.

## P19-7 — accessibilité configurable

Ajouter :

- Mouvement : Système / Réduit;
- Motion: System / Reduced.

`reduce` force transitions/animations nulles.
`system` conserve la media query existante.
Aucun mode ne contourne un OS en reduced motion.

Persistance après restart + preuve computed style.

## P19-8 — langue

Ne pas migrer la langue.

Rejouer la preuve existante : choix explicite FR/EN persiste après un vrai
restart et reste la source unique `filetopo.locale`.

## P19-9 — resume par cerveau

Ne pas dupliquer.

Sur trois cerveaux synthétiques, avant fermeture donner des valeurs différentes
à :

- caméra/focus;
- sélection;
- filtre;
- panneau.

Après restart comparer valeur par valeur.

## P19-10 — vu/non-vu

Utiliser le store existant.

Créer des états différents sur trois cerveaux, restart réel, comparaison
exacte.

## P19-11 — corrections visibles

Toute valeur non restaurable doit être déclarée.

Le frontend affiche un résumé non bloquant des corrections de workspace, sur le
pattern des corrections resume existantes.

Aucune réinitialisation silencieuse.

## P19-12 — isolation

- préférences globales identiques quel que soit le cerveau;
- resume reste brain-scoped;
- seen reste brain-scoped;
- composition ne copie aucun filtre/panneau d'un cerveau vers un autre.

## P19-13 — empreintes

Les changements de préférences/workspace ne modifient jamais :

- source;
- Index;
- journal;
- relations;
- exclusions;
- seen, sauf le geste vu/non-vu explicitement exercé.

## P19-14 — fermeture M-1

Mettre à jour la matrice pour attribuer explicitement :

- vue : F-012 + resume;
- panneau : F-013 + resume;
- filtres : F-022 + resume;
- légende : F-014 + F-052 persistence;
- densité : F-052;
- accessibilité configurable : F-036 + F-052;
- langue : F-035;
- branch state : F-042 + F-052;
- vu/non-vu : F-028.

## Preuve WebView2

Au minimum trois processus réels :

### Phase A — configurer

Sur trois cerveaux synthétiques :

- états resume distincts;
- composition de 3 cerveaux;
- cerveau focalisé non défaut;
- caméra composition non défaut;
- sélection dans un cerveau non défaut;
- légende ouverte;
- densité compact;
- mouvement reduce;
- branch focus + deux collapsed ids;
- langue FR;
- seen states distincts.

Fermer normalement.

### Phase B — restart exact

Relancer :

- comparer toutes les valeurs ci-dessus;
- vérifier branch focus actif;
- quitter branch focus et retrouver la composition sauvegardée;
- vérifier computed density;
- vérifier animation/transition réduite;
- vérifier aucune correction inattendue.

Puis régler d'autres valeurs, dont légende fermée et EN, fermer.

### Phase C — second restart + invalidation

- confirmer les nouvelles valeurs;
- provoquer un rebuild contrôlé d'un cerveau portant des node refs persistées;
- restart;
- vérifier corrections explicites;
- aucun vieux nodeId ne doit viser un nouvel objet.

## Falsifications

Au minimum :

1. retirer la persistance legend => restart gate échoue;
2. omettre un brain de composition => gate échoue;
3. réutiliser nodeId après changement indexId => test refuse;
4. persister branch root sans index binding => test échoue;
5. compact modifie MapView rectangles => gate échoue;
6. motion=system ignore OS reduced => gate échoue;
7. correction silencieuse => gate échoue;
8. écrire filtre global au lieu de brain-scoped => isolation échoue;
9. écriture brute à chaque pointermove => budget de writes échoue.

## Validation

- Rust ciblé + suite complète pertinente;
- frontend ciblé + suite complète;
- `pnpm check`;
- `pnpm build`;
- Tauri debug;
- WebView2 multi-process réel;
- axe;
- `git diff --check`;
- audit public.

## Gouvernance

À la fin :

- TASK-0053 = IMPLEMENTED / candidate contrôle indépendant;
- F-052 = IMPLEMENTED / candidate;
- P-19 et M-1 = candidates, jamais auto-VERIFIED;
- F-046 inchangée;
- aucune TASK-0054;
- RESULT/NEXT_ACTION complets;
- commit + push;
- arbre propre.
