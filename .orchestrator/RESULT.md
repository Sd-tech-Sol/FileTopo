# TASK-0059 — Stage B / B02 — carte dès le premier écran
AGENT: CLAUDE CODE (Opus 5; fiche: Sonnet/HIGH)
STATUS: IMPLEMENTED — jamais VERIFIED par l'exécuteur
BRANCH: build/v0.2-b02-first-screen-map
BASE: afd6bf8 (ACTION-0109)
HEAD_MEASURED_BEFORE: 0b6de20 (produit inchangé, harnais seul)
HEAD_MEASURED_AFTER: 921dacb
HEAD_PUSHED: voir dernier commit de la branche

BEFORE: a scrollY=0, 0 px de .map-view visible et 0 carte, dans les 18 etats ET aux 3 tailles — pas seulement 960x640. Document jusqu'a 3545 px. Bandes au-dessus de <main> 517-727 px; pile de commandes DANS la colonne carte 633 px; surface de carte a 1360 px de document; asideScrollsInside=false partout.

FIX: presentation seulement. Cause racine: .app n'avait qu'un plancher min-height:100vh — ajout de height:100vh + overflow:hidden, donc la coquille est la fenetre. Trois regions defilent alors dans elles-memes: .app__chrome (neuf), .app__map-controls (neuf), .app__aside (qui le demandait deja). .map-view passe de min-height:420px plat a min(240px,38vh); .app__main recoit min(430px,66vh); bande de chrome plafonnee a min(38vh,340px). MapApp.tsx: QUATRE lignes, deux <div> d'enveloppe. Aucune media query, aucun etat, aucune commande retiree/deplacee/repliee.

AFTER (18 etats, 3 tailles):
- C1 SATISFAIT: 240 px de carte visible (plancher 200), hit-test a l'interieur dans les 18, 3-4 cartes visibles et atteignables, racine visible dans 12/18 et noeud de contexte dans les 6 autres, defilement vertical du document = 0 px.
- C2 SATISFAIT: 59 controles par etat a chaque taille (memes identifiants que B01), 0 overflow horizontal, 0 escaper, 0 scroll lateral, 0 controle rogne, 0 recouvrement, panneau atteint au clavier, anneau 3 px, 0 violation axe-core. Commandes au-dela du pli atteintes au clavier: brain-add-real-root 12 Tab, cross-check 19, map-legend-toggle 28 — chacune dans le viewport, document toujours a scrollY=0.
- C3 SATISFAIT: camera identique au bit pres a travers 960x640 -> 1280x800 -> 1366x768 -> 960x640 (scale 1.9344728533297966); coordonnees du monde stables; selection conservee et visible; aucun fitView automatique.
- C4 SATISFAIT: P-19 second processus restaure langue/densite/mouvement/legende/selection/camera et retrouve la carte sur son premier ecran. P-22 empreintes stricte et d'acces identiques, 160 entrees, 0 artefact, 0 ecriture sur le fil.
- C5 SATISFAIT: P-02 120=120; P-05 vue bornee 5/512 et cible naviguee visible a scrollY=0; P-07 selection a 960x640 SANS defiler le document; P-11 molette et clavier; P-21 FR/EN + axe.
- C6 SATISFAIT: diff petit, captures avant/apres a scrollY=0 avec les bandes remises a leur origine.

TESTS: pnpm test 736/736 (49 fichiers), pnpm check, pnpm build, git diff --check — toutes passees. Rust NON EXECUTE (aucun code Rust touche). AUCUNE CI DISTANTE.

WITNESS: src/map/responsiveLayout.test.ts adapte et NON efface — invariants UX falsifiables a la place du CSS fige; garde-fous fonctionnels de B01 conserves (paire de pistes, plancher 0, aucun breakpoint, panneau en flux, densite compacte hors geometrie carte). 5 tests -> 15.

FILES: src/map/map.css, src/map/MapApp.tsx, src/map/responsiveLayout.test.ts, scripts/task0059-first-screen.{ps1,mjs}, scripts/task0059-seed-proof.py, docs/performance/runs/TASK-0059-* (2 JSON + 12 PNG), docs/tasks/TASK-0059-*, docs/ai/{CURRENT_STATE,NEXT_ACTION,HANDOFF,VALIDATION,CHANGELOG_AI}.md, .orchestrator/RESULT.md. Aucun fichier hors liste autorisee.

RESERVE OUVERTE (arbitrage orchestrateur): les bandes defilent dans elles-memes a TOUTES les tailles mesurees — a 960x640 la bande de chrome montre 176 px sur 723, la bande carte 134 px sur 625. Aucune commande perdue, clavier OK, mais la nav composition/identite/exclusions pese 389 px a elle seule, a 960 comme a 1280. La compacter rendrait de la hauteur a la carte SANS retoucher les regles posees ici, mais c'est de l'organisation produit, pas de la presentation: hors perimetre ecrit de cette tranche.

NOT TESTED: lecteur d'ecran; contrastes color-contrast laisses incomplete par axe (9-18 apres, 12-20 avant) non tranches; panneaux relations/review/cross en largeur etroite NON MESURES (fixture ne les peuple pas); les 22 P non rejouees (reservees a la cloture Stage B); P-14 et peripherique P-11 gardent les reserves d'ACTION-0107.
FLAKE SIGNALE, NON ATTRIBUE: workspaceMapApp.test.tsx > "writes the collapsed folders with the branch" a echoue UNE fois sous charge, non reproduit sur le fichier seul ni sur deux executions completes suivantes. Non corrige ici.
HARNESS ASYMMETRY SIGNALEE: before mesure au harnais 0b6de20, after a 921dacb (qui remet aussi chaque region defilante a son origine). Sans effet sur le build before: asideScrollsInside=false dans les 18 etats, aucune autre region defilante.

GIT: commits non forces sur build/v0.2-b02-first-screen-map, pousses. Aucun reset, clean, force push ni reecriture d'historique. Aucune PR, aucune fusion vers main, aucune etiquette, aucun nouveau distant.
STAGE_A: CLOSED. STAGE_B: IN_PROGRESS, NOT CLOSED. R8 maintenue.
NEXT: controle independant de TASK-0059 par l'orchestrateur, puis VERIFIED ou refus.
HOLD: pas de TASK-0060, pas de Stage C/D, pas de PR, pas de fusion main.
