> **REVUE INDÉPENDANTE ACTION-0113 — NOT VERIFIED / CORRECTION REQUIRED.** Six états avec Diagnostics sous la surcouche du menu et retours d'erreur/corrections hors fenêtre 960. Rapport de Claude ci-dessous préservé.

# TASK-0061 — Stage B / B04 — barre multi-cerveaux
AGENT: CLAUDE CODE (Sonnet 5.5, HIGH)
RESULT: IMPLEMENTED — jamais VERIFIED par l'exécuteur; contrôle indépendant à venir (ChatGPT).
BRANCH: build/v0.2-b04-multibrain-shell (fast-forward depuis origin, base `bd3fbca`)
PRODUCT_HEAD_TESTED: `9b68c1ac6b1ebc9f199cfdd25376e0fcc7eebf99` (produit identique à HEAD; seuls des scripts/docs suivent)
SCOPE: mesure d'abord, défaut démontré, patch UI minimal; aucun fichier interdit touché (ni Rust/src-tauri, ni MapView, viewState, resumeState, Index, IPC, lockfile).

## Mesure AVANT (produit B03 inchangé, harnais final, 30 états = 3 tailles × 10 compositions)
- 4 cerveaux synthétiques REAL_ROOT (nom FR Unicode 60 car., nom EN 75 car., court, non indexé) + 3 intégrés au catalogue.
- Défaut **démontré** : à 960×640 les résumés de groupes du chrome sont sous le pli dès **2** cerveaux; avec 3, **3 des 13** commandes usuelles sont rognées (18/35 px); menu ouvert, **4/13 sans aucun pixel** (aussi à 1280×800 et 1366×768); 4 cerveaux + statut, 4/13 perdues. Pire cas **9/13**, 8 états sur 30 hors contrat, 11 entrées de groupe non entières.
- Cause : texte des pastilles qui se replie (une rangée par nom long) et menu d'ajout **dans le flux** (+ toute la liste dans la bande).

## Correction (4 fichiers) : `CompositionBar.tsx`, `map.css`, `responsiveLayout.test.ts`, `brains.test.tsx`
- Pastilles sur une rangée, nom abrégé par ellipse **mais entier** dans le nom accessible et `title`; le mot « actif » ne rétrécit jamais; indice « rendre actif » masqué à l'œil seulement (reste dans le nom accessible).
- Menu d'ajout = surcouche `position: fixed` placée sur le déclencheur.
- Régression que **mon** patch avait introduite, trouvée par la campagne : presser le déclencheur d'un menu ouvert le rouvrait (blur puis clic). Corrigée + test (échoue sans le correctif).
- Garde statique B03 « pas de text-overflow sur les premières rangées » levée pour **un seul** sélecteur (`.composition__name`), avec preuves exigées.

## Mesure APRÈS (même harnais, `docs/performance/runs/TASK-0061-multibrain-shell-after.json`)
- Pass 1, 30 états : **13/13** primaires entières, **chaque pastille et son ×**, **chaque élément de menu** entiers; 1 rangée de pastilles; carte **253,4–496 px** (≥240); 0 débordement/échappé/contrôle rogné; axe-core 0 violation; noms longs lisibles (17 états abrégés, nom entier en titre + nom accessible); Diagnostics liste les références de **tous** les cerveaux affichés, entières.
- Clavier réel (960×640) : Tab → déclencheur, ↓ ouvre le menu, flèches/Home/End, Échap rend le focus, Entrée ajoute, Tab+Entrée change l'actif, retire (focus sur pastille restante), dernier cerveau refusé avec statut : 12/12.
- Caméra : identique aux 3 tailles (translation comprise). Changer de focus **panoramique seulement** (DEC-0034 E), échelle inchangée, racine focalisée visible.
- Pass 2 (redémarrage, 960 et 1280) : composition de 3, focus, langue, densité, mouvement, légende, panneau restaurés; 13/13, groupes entiers. Pass 3 (un cerveau retiré du catalogue jetable) : corrections `BRAIN_MISSING, FOCUSED_BRAIN_MISSING, VIEW_COMPOSITION_CHANGED, SELECTION_BRAIN_NOT_DISPLAYED`, 6 états à 13/13, notice fermable.
- **P-22 strict identique** (4 racines, 0 artefact); aucun appel d'écriture sur le fil; 0 erreur console fatale.
- **Contre-épreuve** : même harnais sur le produit précédent (commit jetable local, supprimé) → échoue (`TASK-0061-multibrain-shell-previous-product.json`, `headTested d071e8a` = commit jetable inexistant sur origin).
- **Baseline B03** : `scripts/task0060-primary-chrome.ps1` inchangé rejoué sur ce HEAD : 13/13, groupes entiers, 18 états, carte 261–535 px (`TASK-0061-b03-baseline-harness-on-b04.json`).

## Limites constatées, NON corrigées (dites, pas masquées)
1. 960×640, 2+ rangées de composition : le **résumé de Diagnostics, une fois ouvert**, passe sous le plafond de la bande (le fermer à la souris exige de défiler la bande; clavier OK) — 7 états.
2. 960×640 : le **statut** (« index absent », refus) est **entièrement sous le pli** de la bande (déjà vrai avant); les corrections n'y montrent qu'une partie. 1280×800 et 1366×768 : entiers.
3. Menu ouvert : la surcouche recouvre l'entrée Diagnostics (par construction); l'activation des groupes n'y est pas mesurée.
4. 4 pastilles à 960 : noms visibles sur 4–8 caractères (entiers en titre).
Dérivé du JSON : `TASK-0061-status-visibility-{after,previous-product}.json`.

## Portes
`pnpm test` **787/787** ×2, `pnpm check`, `pnpm build`, `git diff --check` PASS. Rust non touché/non rejoué. CI distante: aucune.

## Non testé
Lecteur d'écran; contraste (axe `color-contrast` INCOMPLETE, non converti en claim); P-14; pavé tactile P-11; panneaux relations/review/cross; >4 pastilles ou nom à 80 car.; P-01..P-22 intégral (réservé à la clôture de Stage B). Seuls P-01/02/05/07/11/19/21/22 ciblés.

STATE: TASK-0061 IMPLEMENTED. Stage B EN COURS, non close. Stage C/D, R8 inchangées. Aucune TASK-0062, PR, tag, release ni fusion main.
GIT: commit + push sur la branche B04 uniquement (fast-forward, aucun force push).
NEXT: contrôle indépendant de TASK-0061 par l'orchestrateur.
