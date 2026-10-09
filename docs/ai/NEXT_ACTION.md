# Action suivante — contrôle indépendant de TASK-0060

**UNE action :** l'orchestrateur contrôle `TASK-0060` sur GitHub, branche
`build/v0.2-b03-primary-chrome`, HEAD à contrôler après le commit documentaire
de cette tranche, puis prononce `VERIFIED` ou refuse. L'exécuteur ne se
l'attribue pas.

- Preuves à lire : `docs/performance/runs/TASK-0060-primary-chrome-{before,after}.json`
  (HEAD `a03b8bc` et `a645303`), les douze captures `TASK-0060-*.png`, le diff de
  `src/map/{MapApp.tsx,map.css,mapStrings.ts,responsiveLayout.test.ts}` et le
  harnais `scripts/task0060-*`.
- Ce qui est affirmé : **13 commandes usuelles sur 13 vraiment sur le premier
  écran dans 18 états sur 18** (avant : 9/13 à 960×640, 10/13 ailleurs, et les
  trois actions de cycle de vie dans **0** état sur 18); 59 commandes toujours
  dans le DOM, 28 derrière un groupe fermé; carte 240 → 474 px au meilleur;
  clavier, caméra, `P-19`, `P-22` et axe inchangés ou meilleurs.
- Ce qui est **réservé**, chiffré, non réparé : `B03-O1` — à 960×640 en densité
  confortable, trois boutons montrent 20 px sur 35 et les deux lignes de groupe
  du chrome sont 25 px et 70 px sous le pli de leur bande. Fermer l'écart
  reprend des pixels à la carte ou retire du contenu : **décision produit**.
- Rappels : jsdom n'implémente pas un `<details>` fermé, donc `pnpm test`
  770/770 ne prouve rien du disclosure — seule la campagne WebView2 le mesure.
  Aucune CI distante sur ce HEAD. Lecteur d'écran, `color-contrast` et panneaux
  relations/review/cross restent **INCONNUS**.

Stage A reste `CLOSED / VERIFIED`; Stage B reste `IN_PROGRESS`, **non fermé**;
`P-01..P-22` seront rejouées au contrôle de sortie de Stage B; `R8` inchangée.
Pas de `TASK-0061`, pas de Stage C/D, pas de PR, pas d'étiquette, pas de fusion
vers `main`.
