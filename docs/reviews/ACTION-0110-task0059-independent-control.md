# ACTION-0110 — Contrôle indépendant TASK-0059 et arbitrage de la suite Stage B

- **Date :** 2026-10-09
- **Orchestrateur :** ChatGPT (contrôle indépendant sur GitHub, sans exécution locale).
- **Branche contrôlée :** `build/v0.2-b02-first-screen-map`
- **HEAD distant contrôlé :** `f5da1d41226c7fcf34a24351af8fe55b3bb4525b`
- **HEAD réel de la campagne AFTER :** `921dacb1591e4a1d076705b4cfaae13bc08bdab7`
- **Décision :** **TASK-0059 = VERIFIED**, dans sa portée B02 seulement.
- **Stage A :** CLOSED / VERIFIED. **Stage B :** IN_PROGRESS — pas CLOSED.
- **Suite autorisée :** TASK-0060 `APPROVED / NOT STARTED` sur `build/v0.2-b03-primary-chrome`.

## Audit de GitHub — constatations indépendantes

1. La branche B02 est bien sur `f5da1d41226c7fcf34a24351af8fe55b3bb4525b`, huit commits après `afd6bf85`, aucun force-push observé. Les modifications productives touchent exclusivement `src/map/MapApp.tsx` et `src/map/map.css`; les tests ne touchent que `src/map/responsiveLayout.test.ts`. Aucun fichier Rust, Tauri, Index/IPC, modèle, lockfile, dépendance, composant MapView ou persistance modifié.
2. Les preuves `docs/performance/runs/TASK-0059-first-screen-{before,after}.json` et les douze captures PNG sont présentes. Le JSON BEFORE porte `0b6de20`, le JSON AFTER porte `921dacb1591e4a1d076705b4cfaae13bc08bdab7`. `921dacb1591e4a1d076705b4cfaae13bc08bdab7` -> `f5da1d41226c7fcf34a24351af8fe55b3bb4525b` : **trois commits de preuves et documentation seulement**, sans code ni harnais modifié après la campagne.
3. La matrice de 18 états BEFORE indique `firstScreenSatisfied=false` partout, zéro carte visible à `scrollY=0`. Celle AFTER donne `firstScreenSatisfied=true` dans **18/18** états, `worstVisibleMapHeightPx=240`, `worstDocumentVerticalScrollPx=0`. Les captures publiées inspectées directement (FR clair/sombre 960, FR clair 1280) corroborent réellement l'apparition de la carte au premier écran.
4. Sur AFTER, mesures WebView2 publiées : 59 contrôles/état, aucun perdu, débordement horizontal/recouvrement/clipping/escaper=0; panneaux atteints au clavier avec contour de focus 3 px; axe 0 violation, mais `color-contrast` **INCOMPLETE** (9–18 nœuds). Contrôles clavier particuliers `brain-add-real-root`, `cross-check`, `map-legend-toggle` déclarés atteints sans scroll du document.
5. Caméra : séquence 960x640 -> 1280x800 -> 1366x768 -> 960x640, mêmes tx/ty/scale dans l'artefact AFTER (sélection conservée et carte visible). Le redémarrage P-19 a de très légers écarts flottants (~1e-13) dans tx et scale : c'est **une stabilité de caméra à la précision machine**, ne pas écrire « bit-à-bit » pour la restauration. P-22 : empreintes stricte et accès identiques avant/après, 160 entrées, aucun artefact sous la racine.
6. Les portes pnpm rapportées par Claude : `pnpm test 736/736` (49 fichiers) sur deux campagnes finales, `pnpm check`, `pnpm build`, `git diff --check` PASS. Un échec `workspaceMapApp.test.tsx > writes the collapsed folders with the branch` a été observé une fois sous charge, non reproduit ensuite : signalement conservé, cause non prouvée, aucune correction attribuée.
7. API GitHub : **0 workflow run et 0 check associé au HEAD**. Je n'ai pas exécuté les tests moi-même; contrôle indépendant = revue du code GitHub, des diffs, du harnais, des JSON, des PNG et des allégations. Les réserves P-11 pavé tactile physique, P-14 clipboard, lecteur d'écran, contraste incomplete, panneaux relations/review/cross en mode étroit et performance R8 restent ouvertes.

## Décision B02

**PASS / VERIFIED :** le contrat TASK-0059 imposait carte exploitable dès `scrollY=0` (seuil >=200 CSS px), visibilité d'un nœud racine/contexte, conservation des commandes, de la caméra, de P-19/P-22, et un diff UI limité. Les preuves sont cohérentes avec les modifications CSS/JSX et les captures. La vérification ne vaut ni certification WCAG ni fermeture Stage B.

## Nouvelle dette concrète à résoudre : B02-O1

Les captures montrent un résultat visible, mais avec **trois panneaux défilants simultanés**. Sur 960x640, la bande de chrome affiche **176px sur 723px** de contenu, la bande commandes carte **134px sur 625px**, l'aside 422px sur 2192px. La composition/identité/exclusions/actions occupe **389px** en premier niveau. À l'ouverture, les actions usuelles et la recherche sont enfouies dans des bandes tandis que la carte ne reçoit que 240px, y compris sur les grandes fenêtres. Ce n'est pas un échec B02 (accès clavier démontré), mais une priorité d'organisation fonctionnelle et de hiérarchie visuelle pour Stage B.

**Arbitrage :** sélectionner une seule tranche B03, `TASK-0060` : séparer **contrôles primaires** et **outils avancés/diagnostics** à l'aide des composants natifs accessibles existants, sans faire disparaître de fonctionnalité, et redonner des pixels à la carte. Conserver protections B02/B01, mesurer avant/après dans le vrai WebView2. Autoriser une micro-organisation JSX et chaînes FR/EN, non une refonte architecturale. Si les nombreux tests existants reposent sur la visibilité initiale des commandes, préserver leur sens et adapter les témoins; aucun effacement de tests.

## Protection du plan

- Stage A 22/22 CLOSED / VERIFIED et I-1..I-3 immuables.
- Stage B = IN PROGRESS. P-01..P-22 seront intégralement rejoués avant sa fermeture.
- Stage C validation/performance Windows réserve R8; Stage D publication. Aucun début de Stage C/D, aucune PR, release, tag ni fusion main.
- NEXT = une tâche B03 seulement, l'exécuteur ne la marque pas VERIFIED.
