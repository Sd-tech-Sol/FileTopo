# TASK-0058 — Stage B / B01 — baseline visuelle WebView2 du chrome
AGENT: CLAUDE CODE (Opus 5; la fiche prévoyait Sonnet / MEDIUM)
RESULT: IMPLEMENTED — NO CHROME DEFECT PROVEN — PRODUCT DIFF EMPTY
TASK_STATE: IMPLEMENTED (jamais VERIFIED par l'exécuteur)
WORK_BRANCH: build/v0.2-b01-responsive-shell
BASE_HEAD: cd59d1d7208419b63b5ad88a0b6a7aed542738d0 (ACTION-0108, fast-forward depuis origin)
HEAD_TESTED: de6c9e6048def459a22f9332e7d17ca2407d73a1
NOTE_HEAD: les commits postérieurs à HEAD_TESTED sont documentaires uniquement; aucun code ni harnais après la campagne.

## Verdict

QUESTION: le chrome deux colonnes rend-il du contenu inaccessible ou déborde-t-il horizontalement a 960x640 / 1280x800 / 1366x768 ?
ANSWER: NON. 0 px de débordement horizontal, 0 commande perdue, 0 recouvrement, panneau droit atteint au clavier partout.
PRODUCT_CHANGE: AUCUN. src/map/map.css inchangé. Seul ajout sous src/ : src/map/responsiveLayout.test.ts (un test).
DIFF_SCOPE_PROOF: git diff --stat 81e7c4fa..HEAD -- src src-tauri package.json pnpm-lock.yaml => src/map/responsiveLayout.test.ts uniquement.

## Mesure

HOST: vraie fenêtre redimensionnée par SetWindowPos Win32 (scripts/task0058-resize.ps1); PAS Emulation.setDeviceMetricsOverride.
GRANTED_CLIENT: 960x640 / 1280x800 / 1366x768 exactement; viewport CSS confirmé par le moteur; devicePixelRatio 1.
MEDIA: prefers-color-scheme et prefers-reduced-motion posés ensemble et explicitement a chaque état; matchMedia relu et vérifié.
MATRIX: 3 tailles x 6 états = 18 états (fr-light, fr-dark-legend, en-light-legend, en-dark, fr-light-compact-legend, fr-light-reduced-motion); chaque état a chaque taille.
COLUMNS: carte 535/855/941 px, panneau 360 px constant; grille calculée "535px 360px" etc.
OVERFLOW_X: 0 px dans les 18 états. ESCAPERS: 0. SIDEWAYS_SCROLLERS: 0. CLIPPED_CONTROLS: 0. COLUMN_OVERLAP: 0.
CONTROLS: 59, ensemble identique aux trois tailles pour chaque état.
KEYBOARD: panneau droit atteint en 45 tabulations depuis language-fr, meme compte dans les 18 états; anneau de focus 3 px.
AXE: axe-core 4.13.0, 0 violation dans les 18 états; incomplete = color-contrast uniquement, 12 a 20 noeuds, publiés état par état.
CONSOLE: 0 erreur fatale, processus 1 et 2.

## Contrôles ciblés a 960x640

P-02: agrégat archives, 120 omis; montrés + omis = 120 enfants réels recomptés sur disque; role treeitem.
P-05: 5 arêtes hiérarchiques dans la première vue; ligne hors première vue atteinte par la recherche; vue bornée (5/512).
P-07: sélection souris, aria-selected true, panneau de détails d'accord avec map_node_detail; 1719 px de défilement vertical pour atteindre la carte.
P-11: molette CDP réelle puis clavier déplacent la caméra (meme primitive WheelEvent qu'un pavé tactile; périphérique non rejoué).
P-19: panneau/langue/densité/mouvement basculés; SECOND PROCESSUS après fermeture réelle retrouve en + compact + reduce + légende ouverte + panneau masqué.
P-22: empreinte stricte identique fe9d9f5566ad748db7373a63b87b2d7d0148c1edb6bd16bedc5d2a09d690824a; empreinte d'accès identique 98d101fa14f2ab4ebfbed5fc0dfb6951bde782e007efe90f71839427ef492de4; 160 entrées; 0 artefact FileTopo sous la racine; 0 écriture sur le fil; révision d'Index stable.
PORTEE: aucune de ces lignes ne vaut PASS pour l'exigence entière; les 22 P restent réservées a la clôture Stage B.

## Constat remonté, NON réparé

B01-O1: le chrome ne se borne pas a la hauteur de la fenêtre. .app__main est une rangée dimensionnée par son contenu, le panneau droit ne défile jamais dans lui-même, le document monte a 4185 px pour une fenêtre de 640, et a 960x640 la colonne carte commence a 727 px — sous la ligne de flottaison.
RAISON DE NE PAS RÉPARER: c'est du défilement VERTICAL, que TASK-0058 autorise explicitement; et borner .app__main changerait la hauteur de .map-view, donc le viewport de MapView, donc la caméra — ce que le critère d'acceptation interdit ("aucun changement de caméra involontaire causé par modification responsive"). DÉCISION RÉSERVÉE A L'ORCHESTRATEUR.

## Portes

pnpm test: 726/726, 49 fichiers, PASS.
pnpm check: PASS. pnpm build: PASS. git diff --check: propre.
RUST: NON EXÉCUTÉ (aucun code Rust touché); cette tranche ne rejoue pas le gate de Stage A.
CI: aucune CI distante sur ce dépôt.

## Non testé / limites

- Aucun lecteur d'écran; aucune certification WCAG revendiquée.
- Les noeuds color-contrast laissés incomplete par axe ne sont pas tranchés ici.
- Thème et mouvement posés comme overrides de media feature dans le vrai moteur, pas en changeant Windows.
- Aucune fenêtre sous 960x640: borne hôte intacte, Windows refuse.
- Panneaux relations / file de révision / inter-cerveaux en largeur étroite: NON MESURÉS (la fixture ne les peuple pas).
- P-14 presse-papiers et périphérique P-11: réserves d'ACTION-0107 maintenues, non rejouées.
- Aucune mesure de performance.

## Artefacts

docs/performance/runs/TASK-0058-visual-baseline.json
docs/performance/runs/TASK-0058-960x640-fr-light.png
docs/performance/runs/TASK-0058-960x640-fr-dark-legend.png
docs/performance/runs/TASK-0058-1280x800-fr-light.png
docs/performance/runs/TASK-0058-1366x768-fr-light.png
docs/tasks/TASK-0058-stage-b-visual-baseline-responsive-shell.md (section Résultat)

## Actions distantes et destructives

REMOTE: push non forcé vers build/v0.2-b01-responsive-shell uniquement. Aucune PR, aucune fusion, aucun tag, aucune release, aucun nouveau distant.
DESTRUCTIVE: aucune. Aucun reset, clean, force push ni réécriture d'historique. Les bacs a sable jetables supprimés sont sous .filetopo-sandbox/, ignoré par Git et créé par cette tranche.
OUT_OF_REPO: lecture/écriture limitée au répertoire de travail du harnais passé en -WorkDirectory (empreintes détaillées, qui portent des chemins absolus et ne doivent pas entrer dans le dépôt) — meme précédent que TASK-0056.

NEXT: contrôle indépendant de TASK-0058 par l'orchestrateur; VERIFIED ou refus. Trancher B01-O1.
HOLD: pas de TASK-0059, pas de Stage C/D, pas de PR ni de fusion vers main.
