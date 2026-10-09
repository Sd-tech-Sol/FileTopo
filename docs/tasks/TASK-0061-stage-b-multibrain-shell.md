# TASK-0061 — Stage B / B04 — Robustesse de la barre multi-cerveaux

- **Date :** 2026-10-09
- **État :** `IMPLEMENTED` (2026-10-09, exécuteur Claude) — contrôle indépendant à venir; l'exécuteur ne s'attribue pas `VERIFIED`.
- **Branche :** `build/v0.2-b04-multibrain-shell`
- **Base :** `c055181d8236a6681c97aea4d5ed77731d9d1e30` (TASK-0060 B03 VERIFIED, ACTION-0112).
- **Exécuteur :** Claude Code Sonnet, effort HIGH; basculer vers Opus uniquement si un obstacle justifié et le signaler.
- **Source de vérité :** `docs/reviews/ACTION-0112-task0060-independent-control.md`.
- **Stage :** B04 seulement, Stage C/D non démarrées.

## Question falsifiable

B03 atteint 13/13 commandes et 3 résumés entièrement visibles à 960×640 **avec un seul cerveau synthétique**. Or son correctif dépend d'une rangée de composition sur une ligne et a déplacé les sources dans Diagnostics. Cela n'a pas été mesuré avec une composition multiple, des noms longs, une ligne de statut ou le menu de sélection ouvert. **Ne pas supposer le défaut ni supposer que cela passe. Mesurer.**

Sur un ensemble de **racines REAL_ROOT synthétiques temporaires** (jamais de dossier personnel), créer au moins trois cerveaux (un avec un nom court, un avec un nom français Unicode/accents de 45-70 caractères, un avec un nom long anglais/de test). Ouvrir deux puis trois cerveaux dans une composition, choisir un focus autre que le premier, et inclure un état avec menu de composition ouvert ainsi qu'un état de notice/statut représentatif. Les chemins d'accès, les références des sources et les identifiants doivent rester purement fictifs.

## Critères de sortie

1. **Baseline mono-cerveau B03 préservée** : reprendre le même produit/harnais ou comparer au JSON contrôlé de TASK-0060, sans réduire la couverture. Tous les 13 contrôles primaires, 3 résumés et carte ≥240px restent visibles dans les 18 états B03.
2. **Matrice de stress distincte**, vrai hôte Tauri/WebView2 redimensionné nativement (pas émulation d'appareil) aux 960×640, 1280×800, 1366×768, FR/EN, light/dark et compact/reduced-motion. Tester composition de **deux puis trois** cerveaux, focus actif, bouton ajout/suppression (sans enlever le dernier), ouverture/fermeture du menu, navigation clavier de la composition, statut/correction si déclenchable de façon sûre. Captures à scrollY=0, panneaux scrolls remis à l'origine pour l'état initial.
3. Chaque action **essentielle** (ouvrir, actualiser, ajouter un dossier, contrôle de composition/focus, recherche et caméra) doit être entièrement visible et atteignable au clavier/souris à la fenêtre minimale, ou la preuve documente le défaut et STOP si non résoluble dans la portée. Les groupes avancés et diagnostics ont une entrée visible et activable. **Zéro débordement horizontal, aucun contrôle perdu, aucun texte du nom long rendu illisible sans moyen accessible d'en lire le nom complet.** Une pastille avec ellipsis est recevable si nom entier dans intitulé accessible et détail/menu, pas si le focus actif devient indéterminable.
4. `MapView` toujours visible et exploitable à **≥240 CSS px** initialement dans toutes les dimensions/états; caméra persistée inchangée lors de transitions de taille et de focus si le contrat de caméra n'exige pas un recentrage explicite. Pas de zoom-to-fit artificiel, pas de changement du modèle d'arbre.
5. Les trois disclosures natifs doivent garder leur sens et leur accessibilité, y compris les références de sources de **tous** les cerveaux affichés dans Diagnostics. Clavier Tab/Entrée, souris, FR/EN, thème, density/reduced-motion, aria-expanded, focus sans piège. P-19 redémarrage sur profil synthétique, P-22 fingerprints strict/access identiques, aucune écriture sur racines.
6. Contrôles ciblés P-01/P-02/P-05/P-07/P-11/P-19/P-21/P-22, sans déclarer le replay intégral P-01..P-22. Tester les cas d'erreur/statut où la surface d'écran grandit et la composition de noms longs; ne rien camoufler en changeant de fixture après avoir trouvé un défaut.
7. `pnpm test`, `pnpm check`, `pnpm build`, `git diff --check`, essais Windows WebView2, rapport `IMPLEMENTED` ou `BLOCKED` et captures. Pas de CI distante présumée; pas de certification WCAG sur axe incomplet.

## Exécution reuse-first, puis conditionnelle

- Lire `AGENTS.md`, `docs/ai/START_HERE.md`, ACTION-0112, TASK-0059/0060, DEC-0034/0044/0045/0051, `MapApp.tsx`, `CompositionBar.tsx`, `map.css`, tests de composition/workspace, scripts `task0060-primary-chrome.*` et ses deux campagnes. **Ne pas recoder une primitive déjà présente.**
- Mesurer **avant toute modification du produit**. Le résultat peut être **PASS sans diff produit**, si la campagne prouve la robustesse sur tous les états et actions. En cas de défaut, limiter la correction au rendu de la barre/menus/espacements dans `src/map/MapApp.tsx`, `src/map/CompositionBar.tsx`, `src/map/map.css` et `src/map/mapStrings.ts` seulement pour une chaîne FR/EN indispensable. Les tests directement concernés et scripts `task0061-*.mjs/.ps1/.py` sont autorisés; documentation/JSON/PNG sous `docs/performance/runs/TASK-0061-*`, `.orchestrator/RESULT.md`, `docs/ai/{CURRENT_STATE,HANDOFF,NEXT_ACTION,VALIDATION,CHANGELOG_AI}.md`.
- Aucun changement `src-tauri/**`, Rust, SQLite, moteur de projection, scanner/Index, REAL_ROOT, IPC, persistance, `MapView.tsx`, `viewState.ts`, `resumeState.ts`, dépendances/lockfiles, nouveau composant/framework/service. Si un changement hors périmètre serait nécessaire : **BLOCKED et STOP**, preuves chiffrées.
- Ne pas modifier les contrats de Stage A, ne pas enlever de commandes ni de `data-testid`, ne pas contourner les témoins en ne mesurant plus les dimensions/états difficiles. Le maintien du `P-22` est non négociable. Réutiliser sources strictement synthétiques sans données privées.
- À la fin, commit + push **uniquement B04**; remplir résultat et handoff, **jamais VERIFIED par Claude**. Ne pas préparer TASK-0062, ne pas lancer Stage C/D et ne pas fusionner dans main.

## Note de séquencement

Après B04, Stage B doit encore vérifier accessibilité/contrastes, panneaux avancés en petite fenêtre et rejouer **l'intégralité** de la parité P-01..P-22 avant fermeture. Cette tâche **n'est pas** un raccourci vers Stage C.

## Résultats mesurés — `IMPLEMENTED` le 2026-10-09 (exécuteur Claude, jamais VERIFIED)

Campagne WebView2 réelle `scripts/task0061-multibrain-shell.ps1` (3 processus sur un même bac à sable jetable : matrice, redémarrage, redémarrage après retrait d'un cerveau du catalogue jetable), 4 racines synthétiques (noms de 60 et 75 caractères) et les 3 cerveaux intégrés au catalogue. Détails et chiffres : `.orchestrator/RESULT.md`.

- **Défaut démontré** (`TASK-0061-multibrain-shell-previous-product.json`, produit B03 inchangé, harnais final) : pire cas 9/13 usuelles entières; 8 états sur 30 hors contrat; 11 entrées de groupe non entières; menu ouvert = 4/13 sans pixel visible aux trois tailles.
- **Patch** : `CompositionBar.tsx`, `map.css`, `responsiveLayout.test.ts`, `brains.test.tsx` seulement. Pastilles sur une rangée à nom abrégé (entier en `title` et nom accessible), menu d'ajout en surcouche fixe, garde statique B03 levée pour `.composition__name` uniquement.
- **Après** (`TASK-0061-multibrain-shell-after.json`, HEAD produit `9b68c1a`) : 30/30 états à 13/13, pastilles/×/éléments de menu entiers, carte 253,4–496 px, 0 débordement, axe 0 violation, P-19/P-22 conservées; contre-épreuve et baseline B03 rejouée (`TASK-0061-b03-baseline-harness-on-b04.json`, 13/13, 261–535 px).
- **Limites non corrigées** : Diagnostics ouvert sous le plafond de la bande à 960×640 (2+ rangées); statut entièrement sous le pli à 960×640 (déjà vrai avant); surcouche du menu sur l'entrée Diagnostics; 4 pastilles à 960 = 4–8 caractères visibles.
- **Critère 4 (caméra)** : identique aux trois tailles; un changement de focus **panoramique** (DEC-0034 E) sans changer d'échelle, ce que le code existant fait déjà et que B04 n'a pas touché.
