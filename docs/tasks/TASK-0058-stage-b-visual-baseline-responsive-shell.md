# TASK-0058 — Stage B / B01 — Visual Baseline & Responsive Shell

- **Date :** 2026-10-09
- **Status :** `VERIFIED` — contrôle indépendant ACTION-0109 (2026-10-09), dans la portée B01 seulement.
  Aucun défaut horizontal; B01-O1 reporté à TASK-0059.
  Démarrée le 2026-10-09 après vérification du point fixe : Stage A `CLOSED`,
  `P-01..P-22` = 22/22 `CLOSED/VERIFIED` dans `docs/product/parity-matrix-p01-p22.json`,
  aucune autre tâche `IN_PROGRESS`, `.orchestrator/NEXT_PROMPT.md` seul GO technique
  courant. **Verdict : aucun défaut de chrome prouvé; diff produit vide.**
  Voir la section « Résultat » en fin de fiche.
- **Branch :** `build/v0.2-b01-responsive-shell`
- **Base :** `81e7c4fa0135652fd4afae7f6c566628a64ef003` (ACTION-0107 Stage A CLOSED)
- **Chosen by :** `ACTION-0108`
- **Executor :** Claude Code, **Sonnet**, effort **MEDIUM**
- **Stage :** B only; A remains VERIFIED; C/D not started.

## Objectif falsifiable

Contrôler, sur un vrai hôte Tauri/WebView2, si le chrome 2 colonnes rend le contenu inaccessible ou horizontalement débordant à la plus petite fenêtre Windows déclarée (960x640) et aux tailles 1280x800/1366x768. Si défaut prouvé : correctif CSS minimal de disposition des panneaux/chrome; sinon : zéro changement produit, verdict documentaire (aucune réparation inventée).

## Reuse first

Lire `AGENTS.md`, `docs/ai/START_HERE.md`, `ACTION-0108`, `DEC-0015`, `DEC-0034`, `DEC-0045`, `DEC-0051`, `src-tauri/tauri.conf.json`, `src/main.tsx`, `src/map/map.css`, `src/map/MapApp.tsx` (sections JSX), `src/map/MapView.tsx` et les harnais `scripts/task0056-webview2.*`, `scripts/task0055-webview2.*`, `scripts/task0047-webview2.*`, `src/map/workspaceCss.test.ts`. Réutiliser les tests, axe-core, styles/tokens et commandes existants. Aucune librairie UI, aucun renderer, aucun outil externe, aucun téléchargement non nécessaire.

## Périmètre d'écriture produit

- AUTORISÉ SI défaut reproductible : `src/map/map.css`, règle de responsive chrome/panneaux existants exclusivement.
- AUTORISÉ en preuves : scripts nommés `scripts/task0058-visual.*` si un harnais additionnel est indispensable; test `src/map/responsiveLayout.test.ts` si garde statique utile; `docs/performance/runs/TASK-0058-*` synthétiques; note de résultat dans la fiche TASK; docs de mémoire `.orchestrator/RESULT.md` et `docs/ai/{CURRENT_STATE,HANDOFF,NEXT_ACTION,VALIDATION,CHANGELOG_AI}.md`.
- INTERDIT : changement de `src/map/MapApp.tsx`, `MapView.tsx`, CSS des cartes/arêtes internes si cela modifie la géométrie, tout `src-tauri`, IPC, Rust, SQLite, index, projection, limites, couleurs métier, critères P-01..P-22, changement de dépendance/lock, `src/App.css` prototype, `main`, `ROADMAP` ou `ACTION-0108`. Si inévitable : STOP/BLOCKED, pas de hors-scope silencieux.

## Méthode

1. Vérifier HEAD/branche/état Git propre et comparer au commit d'audit. Capturer mesures ET captures avant CSS, sur fixture générée uniquement, sans chemin personnel et sans fichier utilisateur. Préférer le harnais CDP WebView2 existant.
2. Observer à 960x640, 1280x800, 1366x768 : taille effective CSS du viewport, scrollWidth/clientWidth document et descendants chrome, largeur de la carte et de l'aside, superposition, tronquage réel d'actions, accès clavier au panneau. Refaire des états FR et EN et clair/sombre (les variantes peuvent être réparties en une matrice explicite, mais chaque taille doit être testée). Inclure une passe `prefers-reduced-motion: reduce` et densité compact. Distinguer scroll VERTICAL autorisé et débordement HORIZONTAL bloquant.
3. Si et seulement si un échec est prouvé, ajouter la règle responsive CSS la plus petite qui garde la carte utilisable et le panneau atteignable, sans changer le contenu, le DOM sémantique, l'ordre de tabulation ou les coordonnées SVG. Mesurer après dans les mêmes conditions.
4. Contrôles ciblés dans la vraie app : sélection nœud + détails P-07/P-11, reconnaissance parent/agrégats P-02, liens visibles/hors vue P-05, bascule panneau/langue/densité/état restauré P-19, focus/clavier/contraste P-21, fingerprint lecture seule et artefacts hors racine P-22. Aucun "pass" attribué si la preuve ne l'exerce pas. Conserver les exceptions de P-14 clipboard et P-11 device touchpad nommées.
5. `pnpm test`, `pnpm check`, `pnpm build`, `git diff --check`; exécuter les tests Rust uniquement si nécessaire (code Rust normalement inchangé), sans prétendre refaire le gate de Stage A. Signaler CI distante absente, compte des tests, anomalies.
6. Publier les artefacts synthétiques non sensibles et le rapport. Si productGaps ou a11y regression : `BLOCKED`, rapport et STOP. Sinon `IMPLEMENTED` seulement, jamais `VERIFIED`. Aucun démarrage d'une autre TASK.

## Critères d'acceptation

- Baseline WebView2 complète, état avant/après reproductible et HEAD exact.
- À toutes les tailles **supportées** : aucune commande ou surface produit perdue; pas de scroll horizontal involontaire ni overlay qui masque définitivement le panneau, clavier utilisable, focus visible; carte ne devient pas illisible pour faire un fit global; aucun changement de caméra involontaire causé par modification responsive.
- FR/EN, thèmes OS, motion reduce et compact ne créent ni régression de contraste ni perte d'action. Axe-core : violations et incompletes publiées; vérification interactionnelle clavier explicitée.
- Si correction : diff CSS chrome uniquement, aucune différence de comptes/arêtes/coordonnées mondiales, aucune mutation du catalogue/source. Si aucun défaut : diff produit vide, conclusion mesurée.
- Preuves P-02/P-05/P-07/P-11/P-19/P-21/P-22 dans leur périmètre; les 22 P complets seront rejoués avant fermeture Stage B, **pas** déclarés ici.
- Aucun nouveau package, zéro changement de contrat, pas de merge, pas de release, `main` intacte.

## Livrables et contrôle

Captures/mesures WebView2 pré/post sur fixtures synthétiques, commandes et sorties, scripts spécifiques éventuels, `.orchestrator/RESULT.md`, docs état/validation, commit(s) et push sur la branche B01. L'orchestrateur vérifie ensuite indépendant les nouveaux HEAD/diffs/preuves et donne ou refuse `VERIFIED`. Ne pas préparer `TASK-0059`.

---

## Résultat — 2026-10-09

### La réponse à la question posée

**La question était falsifiable, et elle est tombée du côté négatif.** Le chrome à
deux colonnes ne rend **rien** inaccessible et ne déborde **jamais**
horizontalement, à aucune des trois tailles ni dans aucun des six états. Le
produit n'a donc **pas** été touché : `src/map/map.css` est **inchangé**, et le
seul fichier ajouté sous `src/` est un test.

`HEAD` mesuré : `de6c9e6048def459a22f9332e7d17ca2407d73a1`, identique au `HEAD`
que l'artefact déclare — le harnais refuse de démarrer sur un arbre suivi modifié,
donc l'artefact ne peut pas décrire autre chose que ce qui a été testé.

### Comment la mesure a été faite, et pourquoi ainsi

La fenêtre est **réellement redimensionnée** par `SetWindowPos` Win32
(`scripts/task0058-resize.ps1`), pas par `Emulation.setDeviceMetricsOverride` : un
viewport émulé n'aurait rien prouvé d'un hôte Tauri/WebView2. Windows a accordé
exactement `960x640`, `1280x800` et `1366x768` pixels de zone cliente, le moteur
a confirmé le même viewport CSS (`devicePixelRatio` = 1), et la borne hôte de
`src-tauri/tauri.conf.json` n'a pas été touchée.

`prefers-color-scheme` et `prefers-reduced-motion` sont posés **ensemble et
explicitement** à chaque état par `Emulation.setEmulatedMedia`, pour qu'aucun
état n'hérite silencieusement du thème du poste. Le moteur évalue les vraies
media queries de `map.css`; `matchMedia` est relu et vérifié à chaque état.

### La matrice — 3 tailles x 6 états, chaque état à chaque taille

| État | `960x640` | `1280x800` | `1366x768` |
|---|---|---|---|
| `fr-light` | carte 535 / panneau 360 | 855 / 360 | 941 / 360 |
| `fr-dark-legend` | 535 / 360 | 855 / 360 | 941 / 360 |
| `en-light-legend` | 535 / 360 | 855 / 360 | 941 / 360 |
| `en-dark` | 535 / 360 | 855 / 360 | 941 / 360 |
| `fr-light-compact-legend` | 547 / 360 | 867 / 360 | 953 / 360 |
| `fr-light-reduced-motion` | 535 / 360 | 855 / 360 | 941 / 360 |

Dans les **18** états :

- **débordement horizontal du document : 0 px**. La piste `minmax(0, 1fr)` cède,
  le panneau garde sa largeur déclarée, rien ne sort du viewport;
- **0** descendant du chrome obligé de défiler latéralement, **0** élément qui
  dépasse le bord droit, **0** contrôle dont la boîte rogne sa propre étiquette;
- **0** recouvrement entre la colonne carte et le panneau; le panneau reste une
  colonne en flux (`position: static`), jamais un calque couvrant;
- **59 contrôles**, **le même ensemble exactement** aux trois tailles pour un état
  donné : aucune commande n'est perdue en rétrécissant;
- le panneau droit est atteint au clavier en **45 tabulations** depuis
  `language-fr`, **le même compte dans les 18 états**, et l'élément atteint
  (`open-duplicate-explorer`) porte un **anneau de focus de 3 px**;
- **axe-core 4.13.0 : 0 violation** dans les 18 états. `incomplete` : **uniquement
  `color-contrast`**, 12 à 20 nœuds selon l'état, **publiés** état par état dans
  l'artefact — axe ne tranche pas ces nœuds, et cette tranche **ne prétend pas**
  les avoir tranchés à sa place;
- **0** erreur de console fatale, dans les deux processus.

### Ce qui a été observé et **non** réparé — `B01-O1`

Le chrome **ne se borne pas à la hauteur de la fenêtre**. `.app__main` est une
rangée de grille dimensionnée par son contenu : le panneau droit ne défile donc
jamais **dans** lui-même, c'est le document entier qui grandit — jusqu'à
**4185 px** pour une fenêtre de 640. À `960x640`, la colonne carte commence à
**727 px** du haut du document : **sous la ligne de flottaison**, et il faut
**1719 px** de défilement vertical pour atteindre une carte cliquable.

Ce n'est **pas** le défaut que `TASK-0058` demandait de corriger, et ce n'est pas
un oubli : c'est du défilement **vertical**, que la fiche autorise explicitement
et distingue du débordement **horizontal** bloquant. Surtout, le plus petit
correctif — borner `.app__main` à la hauteur du viewport — changerait la hauteur
mesurée de `.map-view`, donc le `viewport` que `MapView` rapporte, donc la caméra.
Le critère d'acceptation interdit précisément « un changement de caméra
involontaire causé par modification responsive ». **Constat remonté, non réparé** :
la suite appartient à l'orchestrateur, pas à cette tranche.

### Contrôles ciblés, dans leur périmètre seulement

Exécutés à `960x640`, la taille la plus dure, sur la racine réelle synthétique :

- **`P-02`** — l'agrégat de `archives` annonce **120** enfants omis; l'addition
  « montrés + omis » égale les **120** enfants réellement sur le disque, recomptés
  par le harnais. Rôle `treeitem`.
- **`P-05`** — **5** arêtes hiérarchiques dessinées dans la première vue; une
  ligne **absente** de cette vue (`archives/piece-0119.txt`) est atteinte par la
  recherche, et la vue reste **bornée** (5 emplacements sur un budget de 512).
- **`P-07`** — après être descendu à la carte, une carte est sélectionnée à la
  souris, `aria-selected` passe à `true` et le panneau de détails nomme le nœud
  que `map_node_detail` nomme.
- **`P-11`** — une vraie molette CDP déplace la caméra, puis le clavier la déplace
  encore. C'est la **même primitive `WheelEvent`** qu'un pavé tactile produit; le
  périphérique lui-même n'a **pas** été rejoué et garde la réserve d'`ACTION-0107`.
- **`P-19`** — panneau, langue, densité et mouvement basculent; le premier
  processus laisse délibérément un espace de travail non par défaut, et le
  **second processus**, après une vraie fermeture, retrouve `en`, `compact`,
  `reduce`, légende ouverte et panneau de détails masqué.
- **`P-22`** — empreinte stricte **identique** avant/après
  (`fe9d9f5566ad748db7373a63b87b2d7d0148c1edb6bd16bedc5d2a09d690824a`), empreinte
  d'accès **identique** elle aussi
  (`98d101fa14f2ab4ebfbed5fc0dfb6951bde782e007efe90f71839427ef492de4`),
  **160** entrées inchangées, **aucun** artefact FileTopo sous la racine, et
  **aucune** commande d'écriture sur le fil pendant la fenêtre mesurée. Témoin :
  `scripts/task0056-fingerprint.py` **réutilisé tel quel**.

Aucune de ces lignes ne vaut `PASS` pour l'exigence entière : les 22 `P` seront
rejouées avant la clôture de Stage B, comme `ACTION-0108` le réserve.

### Portes

`pnpm test` **726/726** sur 49 fichiers · `pnpm check` sans erreur · `pnpm build`
réussi · `git diff --check` propre. Tests Rust **non exécutés** : aucun code Rust
n'est touché, et cette tranche **ne rejoue pas** le gate de Stage A. **Aucune CI
distante** n'existe sur ce dépôt.

### Non testé / limites

- Aucun lecteur d'écran; aucune certification WCAG n'est revendiquée.
- Thème et mouvement posés comme **overrides de media feature** dans le vrai
  moteur, pas en changeant les réglages Windows — une opération hors dépôt.
- Aucune fenêtre sous `960x640` : la borne hôte est intacte et Windows refuse.
- Les panneaux **relations**, **file de révision** et **inter-cerveaux** de la
  colonne droite ne sont pas peuplés par cette fixture : leur comportement en
  largeur étroite reste **NON MESURÉ**.
- `P-14` presse-papiers et le périphérique `P-11` gardent les réserves
  d'`ACTION-0107`; ni l'un ni l'autre n'a été rejoué ici.
- Aucune mesure de performance.
