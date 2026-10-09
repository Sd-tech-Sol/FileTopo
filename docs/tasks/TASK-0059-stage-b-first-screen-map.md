# TASK-0059 — Stage B / B02 — Carte visible dès le premier écran

- **Date :** 2026-10-09
- **Statut :** `IMPLEMENTED` — livré, en attente de vérification indépendante.
  **Jamais `VERIFIED` par l'exécuteur.** Voir « Exécution » en fin de fiche.
- **Branch :** `build/v0.2-b02-first-screen-map`
- **Base :** `672da90dfb3c8c5720ee99273896b282fb0e5d72` (TASK-0058 VERIFIED par ACTION-0109).
- **Décision :** `docs/reviews/ACTION-0109-task0058-independent-control.md`
- **Exécuteur conseillé :** Claude Code — Sonnet, effort HIGH.
- **Stage :** B uniquement. A CLOSED. C/D non démarrées.

## Problème démontré et résultat attendu

B01-O1 (preuve WebView2 réelle de TASK-0058) : à 960×640, première capture sans carte; `.app__main` commence à 727px et le document peut atteindre 4185px. Ce n'est pas un échec contractuel de B01, mais un défaut de hiérarchie visuelle pour l'étape B. Référence autoritative : `DEC-0034`, `REFERENCE_UX_OLD_FILETOPO.md` (reconnaître racine, branches et orientation d'un cerveau réel), sans copie privée ni changement de modèle.

### Critères falsifiables B02

Sur REAL_ROOT **synthétique temporaire**, workspace **neuf** et chargement achevé, à **960×640**, **1280×800** et **1366×768**, FR et EN, clair et sombre :
1. À `scrollY=0`, la surface `MapView` SVG est visible et exploitable dans le viewport physique; une partie utile de la carte (au moins **200 CSS px** de hauteur visible) et la carte racine ou un nœud de contexte initial identifiable sont dans la première fenêtre, **sans** défilement du document. Si techniquement impossible avec les contraintes actuelles, enregistrer le cas `BLOCKED` avec métriques, ne pas truquer via zoom/fit ou image factice.
2. Une fenêtre restreinte n'enlève **aucune commande**, n'interdit pas l'accès aux exclusions/diagnostics et ne casse ni clavier, ni focus, ni FR/EN, ni thème, ni reduced-motion, ni contraste applicable. Un panneau **explicitement déplié par l'utilisateur** peut autoriser le défilement vertical; les commandes restent accessibles.
3. Les arêtes/nœuds de la carte gardent leurs **coordonnées du monde**; une modification de hauteur de viewport n'autorise pas un zoom-to-fit automatique, une perte de sélection/état ou un décalage silencieux d'une caméra persistée. Il faut comparer les invariants de caméra sous viewport redimensionné selon les routines de `viewState.ts` / `resumeState.ts` existantes, et vérifier que les cibles naviguées restent visibles.
4. P-19 : fermer et rouvrir le vrai processus préserve cerveau/composition/focus/sélection/locale/densité/motion/légende conformément au contrat, sans écriture sous la racine. P-22 : empreintes strictes identiques, aucun artefact FileTopo dans la source.
5. Les cas densité compact, reduced motion et légende/panneaux ouverts demeurent navigables; au moins les interactions ciblées P-02/P-05/P-07/P-11/P-19/P-21/P-22 sont rejouées sans les déclarer intégralement VERIFIED.
6. Diff petit et documenté. Aucune modification backend, no patch hidden to relax tests. Captures **avant/après** démontrent le vrai écran initial, pas une page scrollée.

## Reuse-first / ce qu'il faut regarder avant de toucher

Lire `AGENTS.md`, `docs/ai/START_HERE.md`, la décision ACTION-0109, B01 et son JSON/PNG, `DEC-0015`, `DEC-0034`, `DEC-0044`, `DEC-0045`, `DEC-0051`, `MapApp.tsx` JSX (header/brains/exclusions/actions/rapports avant main), `map.css`, `MapView.tsx`, `viewState.ts`, `workspaceCss.test.ts`, `responsiveLayout.test.ts`, `task0058-visual.*` et les anciens harnais du runtime.

Réutiliser les composants, CSS/tokens, les contrôles de visibilité, les primitives natives accessibles de dépli, les tests existants. Évaluer la compaction/organisation ou l'accès explicite aux **diagnostics de développeur** avant d'introduire de l'état/persistance. Ne pas retirer ou renommer à la légère les `data-testid` utilisés par les campagnes historiques : recenser les dépendances avant de déplacer/plier les contrôles. Aucune nouvelle bibliothèque, design system, framework d'overlay, second renderer ou dépendance.

## Fichiers autorisés

- UI : `src/map/MapApp.tsx`, `src/map/map.css` **seulement**, et `src/map/mapStrings.ts` si une chaîne FR/EN réellement nouvelle est indispensable.
- Tests/harnas : `src/map/responsiveLayout.test.ts` et tests UI ciblés déjà existants si nécessaire, `scripts/task0059-*.mjs` / `.ps1` ou adaptation d'un harnais compatible B01 **sans effacer le témoin B01**, preuves `docs/performance/runs/TASK-0059-*`.
- Docs : cette fiche, `.orchestrator/RESULT.md`, `docs/ai/{CURRENT_STATE,HANDOFF,NEXT_ACTION,VALIDATION,CHANGELOG_AI}.md`.

Hors portée sans GO additionnel : `src-tauri/**`, Rust, SQLite, scanner, REAL_ROOT, relations, Index, migrations, données/wire/IPC, `MapView.tsx`, `viewState.ts`, `resumeState.ts`, modèle/caméra métier, `package.json`, lockfile, `src/App.*` ancien prototype, suppression d'un contrôle. **Si un de ces fichiers doit changer : STOP/BLOCKED et justification documentée.**

## Garde-fous / preuves

1. Commencer par capturer/mesurer **B01-O1** sur le HEAD de départ (pas seulement reprendre la conclusion de B01). Établir comptes et état de l'écran dans les deux langues et thèmes, taille client réelle Win32, `scrollY=0`, bounding boxes carte/toolbar/aside/root, screenshot.
2. Montrer que le changement est principalement de **présentation**, éventuellement avec disclosure DOM minimal; aucun nouveau système d'état. Toute section déplacée reste nommée et activable au clavier. Si `MapApp` change, démontrer une absence de modification des chemins d'invocation et de persistence métier.
3. Capturer après aux trois tailles, au moins états FR/EN clair/sombre, plus reduced motion et compact. Comparer `DOMRect` de la carte, visibilité du premier nœud, horizontal overflow, focus et axe-core avec les `incomplete` publiés. Ne pas assimiler 0 violation à certification.
4. Rejouer les scénarios ciblés + redémarrage WebView2 + empreinte source stricte, et `pnpm test`, `pnpm check`, `pnpm build`, `git diff --check`; tout échec non expliqué est bloquant. Les tests Rust ne sont pas nécessaires si code Rust inchangé, le noter explicitement. CI distante si elle existe, sinon dire NON.
5. Le test B01 `responsiveLayout.test.ts` documente une baseline historique, il **ne doit pas interdire** une correction légitime de Stage B. Si la grille change, remplacer les assertions de CSS figé par des invariants UX falsifiables et de vrais résultats WebView2; ne pas supprimer les garde-fous fonctionnels.
6. Écrire artefacts synthétiques et `.orchestrator/RESULT.md`, mettre à jour mémoire, statut **IMPLEMENTED** ou **BLOCKED** (jamais VERIFIED). Commit/push non forcé sur cette branche et STOP. Ne pas préparer TASK-0060.

## Interdits

Aucune source personnelle/privée, aucune copie de maquette privée, aucune modification de la racine analysée, aucune connexion tierce, ni OCR/IA/FTS/cloud, pas de modification fonctionnelle Stage A, pas de chiffres de performance R8, aucune PR/release/tag/merge main. Stage C/D ne commencent pas. Si le critère visuel exige d'enfreindre ces garde-fous, refuser et exposer la preuve.

---

## Exécution — 2026-10-09 — `IMPLEMENTED`

- **Branche :** `build/v0.2-b02-first-screen-map`. **Base :** `afd6bf8` (ACTION-0109), elle-même descendante de `672da90`.
- **HEAD mesuré `before` :** `0b6de20` (produit inchangé, harnais seul ajouté). **HEAD mesuré `after` :** `921dacb`.
- **Exécuteur :** Claude Code, Opus 5 (la fiche conseillait Sonnet / HIGH).

### Ce que la mesure a trouvé avant toute modification

La campagne `before` ne reprend pas la conclusion de B01, elle la refait — et elle
trouve **plus** que ce que `B01-O1` disait. À `scrollY=0`, sur le vrai hôte :

| | 960×640 | 1280×800 | 1366×768 |
|---|---|---|---|
| px de `.map-view` dans la fenêtre | **0** | **0** | **0** |
| cartes visibles | **0** | **0** | **0** |
| bandes au-dessus de `<main>` | 635–727 px | 517–628 px | 517–585 px |
| défilement vertical du document | 2089–3545 px | 1756–3286 px | 1788–3275 px |

Dans les **18** états, aux **trois** tailles. Le défaut n'était donc pas un défaut
de 960×640 : il n'avait simplement jamais été posé aux deux autres tailles.

Le relevé des bandes chiffre où partaient les pixels, à 960×640 : en-tête 163, nav
composition/identité/exclusions/actions **389**, diagnostic développeur 38, rapport
83 — puis, **dans la colonne carte elle-même**, une pile de commandes de **633 px**
(barre d'outils 121, recherche, filtres, projection). La surface de carte commençait
à **1360 px** de document. `asideScrollsInside` était `false` partout : la colonne
droite ne défilait jamais dans elle-même, et c'est pour cela que le document
grandissait à sa place.

Tous les garde-fous de B01 sont remesurés et restent propres sur ce build : 0 px de
débordement horizontal, 0 boîte hors viewport, 0 commande rognée, 0 recouvrement,
panneau atteint au clavier, 0 violation axe-core. Le défaut est une hiérarchie
**verticale**, et rien d'autre.

### Le correctif

Présentation seulement, dans les deux seuls fichiers UI autorisés.

- `src/map/map.css` — `.app` reçoit `height: 100vh` en plus de son plancher
  `min-height: 100vh`, et `overflow: hidden`. **C'est la cause racine :** un
  plancher sans plafond laissait le contenu dimensionner la coquille. Trois régions
  déclarent alors qu'elles défilent dans elles-mêmes : `.app__chrome`,
  `.app__map-controls` et `.app__aside` — cette dernière le demandait déjà par son
  propre `overflow: auto`, sans jamais en avoir l'occasion. La carte reçoit un
  plancher exprimé contre la fenêtre (`min-height: min(240px, 38vh)` au lieu d'un
  `420px` plat qui, dans une fenêtre de 640, demandait plus que la coquille n'avait),
  la rangée carte un plancher (`min(430px, 66vh)`) et la bande de chrome un plafond
  (`max-height: min(38vh, 340px)`).
- `src/map/MapApp.tsx` — **quatre lignes** : deux `<div>` d'enveloppe. Les mêmes
  éléments, dans le même ordre, avec les mêmes commandes et les mêmes `data-testid`.
  Les balises d'enveloppe sont volontairement posées au niveau d'indentation de leurs
  enfants : réindenter 320 lignes aurait caché les quatre qui agissent derrière un
  diff de blancs.
- Aucune media query de largeur ou de hauteur n'a été ajoutée : les trois tailles
  partagent toujours un seul chemin de code, donc une seule campagne les décrit.
- **Aucun** état nouveau, aucune persistance, aucun composant, aucune bibliothèque,
  aucune commande retirée, déplacée ou repliée.

### Ce que la mesure a trouvé après — `docs/performance/runs/TASK-0059-first-screen-after.json`

- **Critère 1 — satisfait dans les 18 états.** 240 px de `.map-view` dans la fenêtre
  partout, pour un plancher demandé de 200, contre 0 avant. La carte répond à un test
  de pointage au centre de sa partie visible dans les 18 : visible **et** exploitable,
  pas seulement disposée. 3 à 4 cartes réellement à l'écran et atteignables; la carte
  **racine** est l'une d'elles dans 12 états sur 18. Dans les 6 autres — tous à
  960×640 — les cartes visibles sont ses propres enfants, c'est-à-dire le « nœud de
  contexte identifiable » que le critère nomme comme alternative. Défilement vertical
  du document : **0 px** partout.
- **Critère 2 — aucune commande perdue.** 59 contrôles dans chaque état à chaque
  taille, les mêmes 59 que l'inventaire B01, une seule empreinte par état. 0 px de
  débordement horizontal, 0 escaper, 0 scroll latéral, 0 contrôle rogné, 0
  recouvrement, panneau droit atteint au clavier avec un anneau de focus de 3 px, 0
  violation axe-core. Trois commandes situées **au-delà du pli** d'une bande sont
  atteintes nommément au clavier — la première et la dernière de la bande de
  composition, la dernière de la bande carte — en 12, 19 et 28 tabulations : chacune
  arrive **dans** le viewport et le document reste à `scrollY=0`. C'est la bande qui
  a défilé, pas la page.
- **Critère 3 — caméra intacte.** À travers 960×640 → 1280×800 → 1366×768 →
  960×640, la caméra est **identique au bit près** : même `tx`, même `ty`, même
  `scale` (1.9344728533297966). Les rectangles de cartes et les translations de
  territoire lus **sous** la caméra ne bougent pas; la sélection est conservée et
  reste visible à chaque hauteur. `clampView` n'a rien eu à corriger, et aucun
  `fitView` automatique n'a eu lieu.
- **Critère 4 — `P-19` et `P-22`.** Un second processus réel restaure langue,
  densité, mouvement, légende, sélection et caméra, et retrouve la carte sur son
  propre premier écran : 240 px, 0 px de défilement. Empreinte `P-22` stricte et
  empreinte d'accès **identiques**, 160 entrées, 0 artefact sous la racine, 0
  écriture sur le fil IPC.
- **Critère 5 — contrôles ciblés.** `P-02` : 120 omis = 120 enfants réels sur le
  disque. `P-05` : arêtes dessinées, ligne hors de la première vue atteinte, vue
  bornée à 5 slots sur 512, **cible naviguée visible à `scrollY=0`**. `P-07` : carte
  sélectionnée à 960×640 **sans défiler le document** — `scrollY` vaut 0 au moment de
  la sélection, là où B01 devait descendre de 1719 px — et nommée par le panneau en
  accord avec l'Index. `P-11` : molette et clavier déplacent la caméra. `P-21` : FR
  et EN avec axe-core dans les 18 états.
- **Critère 6 — diff petit.** Captures avant/après aux trois tailles, prises à
  `scrollY=0` et avec les bandes remises à leur origine, donc de vrais premiers
  écrans.

### Le témoin de test, adapté et non effacé

`src/map/responsiveLayout.test.ts` cessait d'affirmer que la feuille dit encore ce
qu'elle disait : `B01-O1` est la preuve que la forme CSS n'était pas la promesse. Le
témoin énonce désormais les invariants dont dépend le premier écran — coquille bornée
par la fenêtre, trois régions qui défilent dans elles-mêmes, plancher de carte exprimé
contre la fenêtre, plafond de bande — chacun falsifiable en supprimant la règle qu'il
nomme, chacun renvoyant à l'artefact WebView2 qui l'a réellement mesuré. **Les
garde-fous fonctionnels de B01 sont conservés** : la paire de pistes, le plancher `0`,
l'absence de breakpoint, le panneau droit en flux, la densité compacte tenue hors de la
géométrie de la carte. 5 tests deviennent 15.

### Portes

`pnpm test` **736/736** sur 49 fichiers, `pnpm check`, `pnpm build`,
`git diff --check` — toutes passées. **Rust non exécuté**, aucun code Rust touché.
**Aucune CI distante** sur ce dépôt : la réponse est NON, pas « verte ».

### Non testé, limites, et une réserve qui reste ouverte

- **Les bandes défilent dans elles-mêmes à toutes les tailles mesurées.** À 960×640
  la bande de chrome montre 176 px de 723, la bande de commandes carte 134 px de 625.
  Aucune commande n'est perdue et le clavier les atteint toutes, mais à la souris il
  faut faire défiler une bande. La cause est chiffrée : la nav
  composition/identité/exclusions fait **389 px** à elle seule, à 960 comme à 1280. La
  réduire est une question d'**organisation produit**, pas de présentation, et elle
  sort explicitement de cette tranche. **Décision à l'orchestrateur.**
- Un plancher de carte fixe à 240 px signifie que la surface de carte ne grandit plus
  avec la fenêtre au-delà de ce que la bande lui laisse. Une tranche ultérieure qui
  compacte la nav rendra mécaniquement de la hauteur à la carte, sans retoucher ces
  règles.
- La campagne `before` a été prise avec le harnais à `0b6de20`, l'`after` avec celui
  de `921dacb`, qui remet en plus chaque région défilante à son origine avant de
  mesurer. Sur le build `before` cette remise est **démontrablement sans effet** : son
  propre artefact donne `asideScrollsInside: false` dans les 18 états et aucune autre
  région défilante, donc seule la page pouvait défiler, et elle était déjà remise à
  zéro. L'asymétrie est signalée plutôt que gommée.
- Aucun lecteur d'écran réel. Les nœuds `color-contrast` qu'axe laisse `incomplete`
  sont publiés état par état — 9 à 18 après, 12 à 20 avant — et ne sont **pas**
  transformés en revendication de contraste, dans un sens ni dans l'autre.
- Panneaux **relations**, **file de révision** et **inter-cerveaux** : toujours **NON
  MESURÉS** en largeur étroite, la fixture ne les peuple pas.
- Les 22 `P` ne sont **pas** rejouées; `ACTION-0108` les réserve à la clôture de
  Stage B. `P-14` presse-papiers et le périphérique `P-11` gardent les réserves
  d'`ACTION-0107`.
- Une exécution de `pnpm test` a montré **un** échec isolé, `workspaceMapApp.test.tsx
  > writes the collapsed folders with the branch` (`expected undefined to match
  object`), non reproduit sur le fichier seul ni sur les deux exécutions complètes
  suivantes. Instabilité de minutage sous charge, signalée telle quelle, **pas**
  attribuée au correctif ni corrigée ici.

### Artefacts

- `docs/performance/runs/TASK-0059-first-screen-before.json` + 6 captures `TASK-0059-before-*.png`
- `docs/performance/runs/TASK-0059-first-screen-after.json` + 6 captures `TASK-0059-after-*.png`
- Harnais : `scripts/task0059-first-screen.ps1`, `scripts/task0059-first-screen.mjs`,
  `scripts/task0059-seed-proof.py`. `scripts/task0058-resize.ps1` et
  `scripts/task0056-fingerprint.py` **réutilisés tels quels**. Le témoin B01
  `scripts/task0058-*` n'est pas effacé.

### Non fait, volontairement

Aucune `TASK-0060`, aucun Stage C/D, aucune PR, aucune fusion vers `main`, aucune
étiquette, aucune dépendance, aucun fichier hors de la liste autorisée.
