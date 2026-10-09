# Action suivante — contrôle indépendant de TASK-0059

**UNE action :** contrôler indépendamment `TASK-0059` sur
`build/v0.2-b02-first-screen-map` au `HEAD` poussé, puis prononcer `VERIFIED` ou
refuser. L'exécuteur ne s'attribue pas `VERIFIED`.

- Livré `IMPLEMENTED` : la carte est sur le premier écran dans les 18 états et aux trois tailles — 240 px de `.map-view` visible et exploitable pour un plancher demandé de 200, **0 px** de défilement vertical du document, contre **0 px** de carte visible et jusqu'à 3545 px de document avant.
- Preuves à relire : `docs/performance/runs/TASK-0059-first-screen-before.json` et `…-after.json`, les 12 captures `TASK-0059-*.png` prises à `scrollY=0`, et la section « Exécution » de `docs/tasks/TASK-0059-stage-b-first-screen-map.md`.
- Points à contrôler en priorité : aucune commande perdue (59 contrôles par état, mêmes identifiants que B01); caméra identique au bit près à travers les trois hauteurs et retour; `P-19` restauré par un second processus; `P-22` empreintes identiques; `responsiveLayout.test.ts` adapté sans effacer les garde-fous fonctionnels de B01.
- **Réserve ouverte à arbitrer :** les bandes de chrome défilent dans elles-mêmes à toutes les tailles mesurées (176 px montrés sur 723 à 960×640). Aucune commande n'est perdue et le clavier les atteint toutes, mais la nav composition/identité/exclusions pèse 389 px à elle seule. La compacter relève de l'organisation produit, hors de cette tranche.
- Stage A CLOSED, Stage B EN COURS et **non close**, R8 maintenue. Aucune `TASK-0060`, aucun Stage C/D, aucune PR, aucune fusion vers `main`.
