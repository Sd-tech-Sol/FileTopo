# ACTION-0115 — Contrôle indépendant TASK-0062 / Stage B B05 — correction requise

- Date : 2026-10-12 (Québec).
- Orchestrateur : ChatGPT, instance distincte de Claude Code.
- Branche : `build/v0.2-b05-populated-panels`; HEAD audité : `962b55cd1ecd3ea892e280cfacff28d91d046174`.
- Base : `5dcd9d45adac1698036ae8b5b61ac62bc2db83f7`; cinq commits en fast-forward, sans divergence.
- Produit corrigé : `4dbe49f8d3075b732f5e62a54cab6e03790237a6`; campagne AFTER mesurée au `570096630eb6efb42342448864c6d8574a6f5d61`, suivie seulement de preuves/docs et adaptation du test `localeRuntime`.
- **VERDICT : TASK-0062 IMPLEMENTED / NOT VERIFIED / CORRECTION REQUIRED.** Stage B demeure EN COURS. Aucun nouveau TASK-0063 avant résolution de la présente correction.

## Ce que j'ai inspecté indépendamment

1. Commits, comparaison de base à HEAD et diff : modifications produit limitées à `src/map/map.css` et à une classe CSS dans `src/map/MapApp.tsx`; tests `responsiveLayout.test.ts` et `localeRuntime.test.tsx`, scripts et données synthétiques, documentation et PNG/JSON. Aucune modification dans `src-tauri`, Rust, Index, scanner, SQLite, IPC, projection, `MapView`, lockfile ou dépendances.
2. JSON publiés `docs/performance/runs/TASK-0062-populated-panels-{before,after}.json`, lus et analysés directement : BEFORE sur `c61725f`, AFTER sur `5700966`. Les champs du verdict indiquent 19 états après correction et deux états au redémarrage, tous les critères **effectivement inclus dans le verdict du harnais** réussis.
3. PNG avant/après inspectés visuellement au 960×640 (panneaux Relations, Revue, Inter-cerveaux, y compris nom long). Le lien inter-cerveaux est maintenant lisible sur plusieurs lignes, la carte est présente; l'aside est défilable verticalement.
4. BEFORE : défilement latéral (aside jusqu'à 623/345), jeton SHA-256 et nom hors vue insécables, lien inter-cerveaux dont le nom de nœud est ellipsé. AFTER : `asideColumn.scrollWidth=clientWidth=345` pour les 19 états, aucun défilement horizontal enregistré; carte min 257 px; 13/13 primaires; trois panneaux peuplés; axe-core 0 violation automatisée mais contraste `INCOMPLETE`.
5. Sept interactions ciblées rapportées réussies sur le vrai WebView2 : approbation/révocation, file de revue, navigation intra/inter, menu modal et statut. Leurs états avant/après montrent les comptes correctement modifiés, sans mélanger les cerveaux. Je n'ai **pas** exécuté moi-même WebView2/pnpm sur une seconde machine : preuves d'exécution fournies par Claude, vérification indépendante du contenu et des sources par ChatGPT.
6. P-19 : redémarrage du même sandbox, langue, densité, motion, cerveaux, sélection et détails restaurés; le panneau de revue replié n'est **pas** restauré, annoncé comme état éphémère non persisté et non requalifié ici comme panne de la persistance de composition. P-22 : **une racine REAL_ROOT synthétique** empreinte à chaque campagne (24 entrées), digests stricts et accès identiques avant/après, zéro artefact et zéro appel mutant pendant la mesure. Ne pas appeler cela un nouveau replay à quatre racines.
7. `pnpm check`, `pnpm build`, `git diff --check` PASS selon Claude. `pnpm test` : deux runs 797/797 PASS, deux runs intermittents en échec sur `brainIdentity.test.tsx`; aucune paire consécutive entièrement verte revendiquée. Les runs frontend ne sont pas relancés indépendamment. GitHub Actions : **0 run sur B05**, check-runs distants non confirmés. `main` au `b575ad6e7440d11ade69a4ecab9a873943f5e918`, inchangée.

## Blocage B05-O1 — focus clavier perdu après APPROUVER

- Preuve explicite AFTER : `pass1.interactions["relations.approveKeyboardRevokeMouse"].focusAfterApprove = {key:null,isBody:true,panel:null}`, idem `cross.approveRevokeNavigate` : `{key:null,isBody:true}`. Les compteurs mutent correctement, mais le bouton qui détenait le focus disparaît; le focus tombe sur `body`.
- Le contrat TASK-0062 demande la **préservation du focus**, de la navigation Tab et de l'accessibilité après interactions. Le critère `everythingHoldsEveryState=true` ne juge que la matrice d'états statiques et **n'inclut pas cette restauration après APPROUVER**; ce PASS ne ferme donc pas B05-O1.
- Après RÉVOQUER, le focus revient déjà sur le bouton Approuver de la même suggestion. Le code de `MapApp.tsx` et des deux panneaux utilise déjà `useRestoreFocusAfterReload` pour ce sens de transition. Il faut **mesurer et corriger seulement l'accessibilité UI après approbation**, sans modifier le wire, le modèle, le magasin ni la logique d'approbation.
- Critère attendu : après APPROUVER au clavier, restaurer un focus réel, visible, stable et contextuellement associé à la même suggestion (p. ex. commande Révoquer de la relation APPROVED correspondante), sinon repli explicite vers le panneau pertinent. Aucune activation d'un contrôle d'une autre suggestion ou d'un autre cerveau. Vérifier Tab et Shift+Tab après la mutation, souris/clavier, FR/EN et tailles demandées, absence de défilement du document.

## Blocage B05-O2 — preuves de non-régression ciblées incomplètes

- Le rapport de Claude reconnaît que les scripts B03 18/18 et B04 six états de menu ouvert **n'ont pas été rejoués**. Les vérifications B05 (13/13 et un comportement modal) constituent une preuve partielle, pas la preuve ciblée prévue par TASK-0062.
- Rejouer les témoins versionnés B03 et B04 sans changement de contrat; conserver les lectures strictes `false` quand le voile modal est ouvert, et prouver la fermeture préalable sans double activation (Escape/clic extérieur), puis la récupération de l'accès. Si un témoin est irréalisable, publier le blocage, ne pas remplacer par un faux succès.

## Réserves non bloquantes à conserver

- Instabilité déjà signalée sur `brainIdentity.test.tsx` sous charge, deux échecs sur quatre runs après patch. Reproduire/isoler et, si possible, comparer à la base B04. Ne **pas** assouplir le test ni corriger hors périmètre sans décision. Ne jamais annoncer suite complète uniformément verte si ce n'est pas démontré.
- Contraste axe-core `INCOMPLETE`, pas de lecteur d'écran réel, texte minimum 10,5 px, pas de replay intégral P-01..P-22, performance R8 différée à Stage C. Une couche de statut masque visuellement 39 px du bas de l'aside à 960 : les mesures montrent zéro contrôle définitivement inatteignable après défilement. Conserver cette mesure lors de la correction.

## Prochaine action unique

**Correction ACTION-0115 de TASK-0062 sur la même branche B05**, sans créer TASK-0063. Agent : Claude Code Sonnet, effort HIGH. Lire `.orchestrator/NEXT_PROMPT.md` et ce contrôle en entier. Modification produit autorisée uniquement pour la restauration de focus d'interface (composants `MapApp.tsx`, `RelationsPanel.tsx`, `CrossRelationsPanel.tsx` si nécessaire) avec tests UI et harnais ciblés, plus les preuves de replay B03/B04. Aucune autre modification fonctionnelle; STOP/BLOCKED si la solution exige un changement hors périmètre. Commit/push B05 puis STOP. Sans PR, merge, tag, release ni Stage C/D.
