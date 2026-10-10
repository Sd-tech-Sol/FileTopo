# ACTION-0114 — Contrôle indépendant de la correction TASK-0061 (Stage B / B04)

- Date : 2026-10-09, heure Québec.
- Orchestrateur : ChatGPT, contrôle GitHub indépendant (diff, JSON, photos, sources, CI API); aucun test WebView2/pnpm exécuté localement par ChatGPT.
- Branche livrée : `build/v0.2-b04-multibrain-shell`; HEAD : `db2392f7f428712d6233399f3e27a497cf5dbb71`. Produit/harnais final effectivement mesuré : `3363b6976704d1b8b56702b1537fe1f59e3b6414`.
- **Verdict : TASK-0061 = PASS / VERIFIED dans la portée B04.** B04-O1 et B04-O2 levés selon l'alternative modale **explicitement autorisée par ACTION-0113**. Stage A CLOSED, B01-B04 VERIFIED dans leurs périmètres, Stage B toujours IN_PROGRESS/NOT CLOSED.

## Contrôle du dépôt

- ACTION-0113 `e31384fe7a9ac446241d938927acdf4591c65888` -> HEAD : sept commits fast-forward; fichiers produit uniquement `src/map/{CompositionBar.tsx,MapApp.tsx,map.css,mapStrings.ts}`, tests UI ciblés, scripts et artefacts. Aucun code Rust/`src-tauri`, Index, SQLite, source REAL_ROOT, IPC, `MapView.tsx`, `viewState.ts`, `resumeState.ts`, lockfile ou dépendance modifié.
- Un seul commit de documents et preuves après le HEAD testé; aucun changement produit/harnais après la campagne. API GitHub Actions/check-runs : **0** au HEAD. `main` restée `b575ad6e7440d11ade69a4ecab9a873943f5e918`.
- Preuves GitHub consultées : `TASK-0061-multibrain-shell-{before-correction,correction}.json`, `TASK-0061-b03-baseline-correction.json`, `TASK-0061-status-visibility-{before-correction,correction}.json` et captures à `960x640` menu EN sombre, notice FR, correction du catalogue FR et `1280x800` multi-cerveaux. Les images correspondent aux placements annoncés.

## B04-O2 — PASS

- 12/12 cas d'apparition pertinents (statuts « index absent » / refus et corrections de catalogue, 3 tailles, FR/EN, clair/sombre/compact/réduit mesurés) : messages **entiers**, cinq points de hit-test valides, boutons de fermeture **entiers**. Avant : statuts à 0px et corrections invisibles/partielles en 960.
- Statut : couche fixe en bas, à 960 aucun recouvrement de la carte; aux deux autres tailles, <=15px (3,4 % de la hauteur carte), aucune commande ou résumé ou pastille masquée; fermeture souris, vrai Tab+Entrée et Échap mesurés pour le statut. Corrections : première section du panneau droit (0 recouvrement carte), fermeture souris et accès clavier dans la campagne, Entrée sur la correction en WebView2 non spécifiquement rejouée, mais tests UI jsdom le couvrent.
- Le premier essai de corrections en overlay a été rejeté car il masquait les cartes; version publiée ne le fait pas.

## B04-O1 — PASS **avec règle d'interaction modale explicite**

- Dans les 6 états menu ouvert, les métriques strictes `groupEntryPointsWholeEveryState`, `primaryThirteenWholeEveryState`, `mapAtLeastFloorEveryState` restent correctement **false** : un voile bloque les clics dans l'interface derrière le menu. **Elles ne sont pas requalifiées comme un succès en état modal.**
- La voie alternative, prévue mot pour mot par ACTION-0113, est vérifiée : première pression hors menu ferme sans déclencher le contrôle masqué; `Escape` ferme et restitue le focus; deuxième pression active le résumé et les 3 groupes ont leurs interactions souris/Tab/Entrée/arbre d'accessibilité testées après fermeture. `everyMenuOpenStateRecoversGroupActivationByTheModalRoute=true`, `groupEntryReachableEveryState=true`, `essentialReachableEveryState=true`.
- Dans 24 états menu fermé, 13/13 commandes, pastilles/× et 3 groupes pleinement visibles; carte >=257px. Mêmes invariants après redémarrage P-19 et après retrait d'un cerveau avec corrections (6 états); baseline mono-cerveau B03 rejouée 18/18, 13/13 et carte 261–535px.
- Contrat d'interaction retenu : le menu constitue un **état de superposition temporaire** qui ferme au premier clic en dehors; il n'est PAS prouvé être un dialogue ARIA `aria-modal` ni validé par un lecteur d'écran. Garder cette limite pour l'audit d'accessibilité ultérieur; ne pas inventer la conformité WCAG générale.

## Qualité et réserve explicites

- P-22 : quatre racines synthétiques strictes et empreintes d'accès inchangées; aucun artefact sous les racines, aucun appel d'écriture sur le fil. Caméra, focus et composition P-19 conservés; 0 débordement horizontal et 0 erreur console fatale selon artefacts.
- `pnpm test 794/794` répété deux fois, `pnpm check`, `pnpm build`, `git diff --check` PASS **selon Claude**, non rejoués par ChatGPT. Un échec `brainIdentity.test.tsx` ponctuel sous charge, non reproduit (4 isolements et deux exécutions globales), retenu comme signal, cause non établie. Rust non touché/non rejoué. Axe-core 0 violation automatisée mais `color-contrast INCOMPLETE`; pas de lecteur d'écran réel, ni performance R8.
- Résumés Diagnostics ouverts qui quittent partiellement la bande à 960 avec plusieurs rangées : défilement interne et clavier les referment, dette de confort à revoir lors du contrôle des panneaux.
- Panneaux de relations, file de révision et relations inter-cerveaux **toujours pas peuplés à 960** dans les campagnes récentes; P-01..P-22 complet devra être rejoué avant fermeture de Stage B.

## Une seule suite autorisée

**TASK-0062 / B05 — panneaux contextuels réellement peuplés en fenêtre étroite : APPROVED / NOT STARTED**, sur la branche `build/v0.2-b05-populated-panels`, partie de finition visuelle B (non revalidation fonctionnelle A à la place du replay complet). Commencer par mesurer les panneaux RelationsPanel, ReviewQueuePanel et CrossRelationsPanel avec fixtures strictement synthétiques et harnais existants J12/M12/SR15; ne modifier le code UI que si un défaut visuel/clavier est prouvé. Aucun Stage C/D, pas de PR, merge, tag ni release.
