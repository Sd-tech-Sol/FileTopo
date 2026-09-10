# ACTION-0050 — Contrôle indépendant de TASK-0033

- Date : 2026-09-10
- Statut : `OPEN / RECONTROL REQUIRED`
- Tâche contrôlée : `TASK-0033 — V1 Progressive Topographic UX`
- Branche : `build/v0.2-a17-v1-topographic-ux`
- Exécuteur : Claude Code / Sonnet 5
- Autorité du verdict : orchestrateur ChatGPT indépendant de l'exécuteur
- Verdict : **PAS ENCORE VERIFIED**

## Verdict

La tranche est techniquement cohérente au contrôle de code, mais le critère produit obligatoire de rejeu WebView2 n'a pas été exécuté. `TASK-0033` reste donc `IMPLEMENTED`, jamais `VERIFIED`.

Ce n'est pas un rejet de l'implémentation. C'est un verrou d'acceptation : la correction vise précisément un problème perceptuel réel (lisibilité, compression, navigation spatiale), donc les tests unitaires/composant seuls ne peuvent pas prouver que le résultat est utilisable dans le vrai WebView2.

## Contrôles indépendants effectués

1. Git : la livraison produit est `393d319`; le commit `2c1c17a` ne fait que pinner ce SHA dans `.orchestrator/RESULT.md`.
2. Projection : `VIEW_BUDGET = 512` et `MATERIAL_BUDGET = 256` restent les bornes techniques; `ORDINARY_MATERIAL_TARGET = 64` n'est qu'une cible visuelle ordinaire.
3. Focus/ancestry : `effective_target = max(64, selected.len()).min(256)` conserve une ancestry profonde au-delà de 64 sans ouvrir le corpus complet.
4. Dossier-first : aucun tri parallèle n'a été ajouté dans `projection.rs`; la projection continue de consommer l'ordre de pagination canonique existant.
5. Agrégats : `ViewAggregate` reste exact côté Rust; l'interface rend une petite pastille avec `aggregateLabel()` et ne présente pas les chaînes internes du backend.
6. Caméra : l'effet lié à `projectionKey` utilise `recenterOnFocus`, donc pas de fit global implicite à chaque navigation; la première ouverture et Réinitialiser passent par `readableView`; `Ajuster` reste le fit global explicite.
7. Architecture : aucun second index/store/catalogue, aucun snapshot intégral frontend, aucun renderer parallèle, aucun chemin absolu IPC ni nouvelle surface filesystem observés dans la tranche.
8. Preuves d'exécuteur conservées comme telles : Rust 327 PASS, TypeScript 289 PASS, check/build verts; Clippy strict reste rouge à 26 erreurs préexistantes selon le rapport. Ces commandes n'ont pas été réexécutées par l'orchestrateur.

## Blocage avant VERIFIED

Le rejeu produit obligatoire de TASK-0033 manque :

- WebView2 réel;
- arborescence synthétique générée >= 5 000 éléments;
- 1366×768 et 1920×1080;
- vrais noms lisibles à l'ouverture;
- absence de compression/chevauchement;
- pan/zoom réel;
- navigation de branche et activation d'une pastille vers de vrais nœuds;
- maintien d'une échelle lisible après changement de projection;
- relations autour d'une sélection toujours visibles;
- borne de projection respectée;
- aucune fuite de chemin absolu;
- 0 erreur console fatale.

Point à observer spécialement pendant le rejeu : la pastille est petite visuellement mais conserve actuellement un créneau de layout de taille carte. Ne pas modifier cela par hypothèse; seulement si le rejeu montre que ce choix dégrade réellement la topographie.

## Correction documentaire mineure

`NEXT_ACTION.md` / `HANDOFF.md` ont une phrase laissant entendre que `fitView` reste utilisé à la première ouverture. Le code livré utilise `readableView` pour cette ouverture. La prochaine passe doit harmoniser la documentation avec le comportement réel.

## Action unique suivante

Faire une passe **TASK-0033 / PRODUCT ACCEPTANCE** sur la même branche : exécuter le rejeu WebView2 obligatoire, corriger uniquement les défauts réellement observés dans cette portée, rejouer les tests pertinents, publier les preuves synthétiques et remettre `TASK-0033 = IMPLEMENTED` pour un nouveau contrôle indépendant.

Aucune `TASK-0034` ne doit être créée avant ce recontrôle.
