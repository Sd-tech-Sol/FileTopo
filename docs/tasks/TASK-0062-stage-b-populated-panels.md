# TASK-0062 — Stage B / B05 — Panneaux relations et révision réellement peuplés à 960×640
- **Décision indépendante ACTION-0116 (2026-10-12) : VERIFIED dans la portée B05.** La mention d'exécution IMPLEMENTED et non VERIFIED plus bas reflète uniquement le rapport antérieur de Claude. B05-O1 focus après APPROUVER corrigé (14/14) et B05-O2 témoins B03/B04 rejoués; réserves `workspaceMapApp`, `brainIdentity`, contrastes INCOMPLETE et full P-01..P-22 conservées. Stage B non fermée. Voir `docs/reviews/ACTION-0116-task0062-independent-control.md`.

- Date : 2026-10-09.
- **État : IMPLEMENTED — NOT VERIFIED** (démarrée le 2026-10-12, reprise du harnais `scripts/task0062-*` laissé non commité le 2026-10-09; résultats en fin de fiche; contrôle indépendant dû à ChatGPT).
- Branche : `build/v0.2-b05-populated-panels`; base vérifiée : `db2392f7f428712d6233399f3e27a497cf5dbb71`.
- Décision : `docs/reviews/ACTION-0114-task0061-independent-control.md`.
- Agent conseillé : Claude Code **Sonnet / effort HIGH**. Ne pas changer de modèle sans justification.
- Portée : Stage B uniquement, pas Stage C/performance R8, pas Stage D.

## Pourquoi maintenant : risque identifié et jamais mesuré

Les tranches B01–B04 ont validé la carte au premier écran et les commandes sur 960×640, mais les fixtures actuelles ne contenaient pas de vraies relations intra-cerveau/inter-cerveaux ni file de revue peuplée dans le panneau droit. Le triptyque rendu dans `src/map/MapApp.tsx` est `RelationsPanel`, `ReviewQueuePanel`, `CrossRelationsPanel` (avec `DetailsPanel`, `ChangeJournalPanel` et corrections d'espace de travail avant eux). Ni échec ni succès UX à cette densité ne peut être présumé. Les preuves antérieures J12/M12/SR15 existent, à réutiliser plutôt que simuler des états impossibles du produit.

## Travail demandé — mesure d'abord

1. Avant tout patch, lire `AGENTS.md`, `docs/ai/START_HERE.md`, ACTION-0114, TASK-0059/0060/0061, `DEC-0034`, `DEC-0045`, `REFERENCE_UX_OLD_FILETOPO.md`, et les tests J12/M12/SR15 + code des trois panneaux + leurs contrats. Chercher les fixtures/harnas existants par noms dans GitHub/local; **réutiliser et prolonger**, ne pas inventer un modèle de relations ni des mutations sur données personnelles.
2. Construire un **état réellement peuplé par les voies produit** avec des cerveaux et Index **synthétiques jetables** : des relations intra, suggestions encore en attente + file de revue, relations inter-cerveaux sortantes/entrantes, descriptions courtes/longues, et un panneau de détails/ journal lorsque pertinent. Si un sous-état n'est pas atteignable avec les outils existants, noter **NOT MEASURED** et STOP si cela bloque les critères; pas de mocks prétendant être WebView2 réel.
3. Capturer le **BEFORE** dans le vrai hôte Tauri/WebView2, client Win32 à `960×640`, `1280×800` et `1366×768`, FR/EN, clair/sombre et compact/reduced-motion. Inspecter : carte visible >=240px, panneau droit scrollable indépendamment, textes/valeurs lisibles, boutons de revue/approbation/navigation atteignables sans piégeage, résultat d'action visible et focus préservé. Faire une matrice par sous-état (relations, revue, cross), pas un seul écran vide.
4. Rejouer ouvert/fermé du panneau, sélection/navigations vers relation hors vue, passage d'un cerveau à l'autre, entrée/sortie clavier des sections, boutons de confirmation/refus/later ou équivalents **sur données synthétiques seulement**; vérifier que les actions ne confondent pas les cerveaux/les endpoints. Tester des noms/chemins fictifs longs, palette claire/sombre. Le menu modal B04 se ferme proprement; les corrections et statut n'écrasent pas le panneau.
5. En présence d'un **défaut reproductible**, autoriser un correctif minimal dans `src/map/map.css` et `src/map/{MapApp,RelationsPanel,ReviewQueuePanel,CrossRelationsPanel,DetailsPanel,ChangeJournalPanel}.tsx` seulement. Adapter les tests UI ciblés directement affectés. **Ne pas étendre le modèle de données, ne pas corriger silencieusement la logique de relations, ne pas changer les événements IPC ou flux d'approbation.** Si un vrai bug fonctionnel est trouvé, le rapporter BLOCKED, pas de patch hors scope sans décision de l'orchestrateur. Si aucune régression, livraison de preuves peut être 100% documentaire/test.
6. Publier une preuve d'interaction WebView2 ciblée : au minimum 2 actions significatives par panneau peuplé, navigation souris ET clavier, Tab/Shift+Tab, Enter/Escape où pertinent, accessibilité et contrastes axe `incomplete` conservés explicitement, éventuelles erreurs et écrans BEFORE/AFTER. Les préférences FR/EN, densité, reduced-motion et panneau visible après vrai redémarrage restent stables (P-19). Les sources P-22 restent byte-identical, 0 artefact et 0 écriture sous les quatre racines synthétiques.
7. Préserver B03 `13/13` et les trois groupes pleinement accessibles en état menu fermé et l'alternative modale B04 (pression hors menu ferme sans double activation), carte >=240px, caméra et focus, zéro overflow horizontal/document, aucun contrôle perdu. Si de nouveaux états requièrent défilement **dans l'aside**, celui-ci est intentionnel, mais **aucun contrôle ne doit devenir inatteignable ou rogné définitivement**.
8. Exécuter `pnpm test`, `pnpm check`, `pnpm build`, `git diff --check`; Rust inchangé donc pas de nouvelle revendication Rust. Répéter `pnpm test` si l'instabilité `brainIdentity` réapparaît, la signaler sans la masquer. CI GitHub seulement si une exécution distante existe réellement.
9. Résultat `IMPLEMENTED` ou `BLOCKED` (jamais `VERIFIED`), preuves JSON/PNG sous `docs/performance/runs/TASK-0062-*`, scripts dédiés `scripts/task0062-*.{mjs,ps1,py}`, rapport `.orchestrator/RESULT.md`, `docs/ai/` (CURRENT_STATE, HANDOFF, NEXT_ACTION, VALIDATION, CHANGELOG_AI), commit/push B05 **sans force**, puis STOP. Aucune TASK-0063, Stage C/D, PR, release ou merge vers main.

## Invariants non négociables

- Aucun `src-tauri/**`, scanner, Index canonique, SQLite, projection, `MapView.tsx`, `viewState.ts`, `resumeState.ts`, modèle `relations`, wire/IPC, services, nouvelles dépendances ou lockfile. Pas de nouvelles fonctions SaaS/AI/cloud.
- Aucune donnée privée ou vraie racine personnelle dans Git; preuves reproductibles synthétiques seulement.
- Ne pas relâcher les tests de Stage A ou transformer une absence de violation axe en certification WCAG. Aucun replay P-01..P-22 complet affirmé sur cette tranche.
- **La validation indépendante de B05 appartient à ChatGPT** après lecture de GitHub. Stage B restera non CLOSED jusqu'aux vérifications accessibilité/contrastes et full P-01..P-22.

## Résultat d'exécution — 2026-10-12 — `IMPLEMENTED`, non VERIFIED

- **Mesure d'abord :** harnais `scripts/task0062-{populated-panels.mjs,populated-panels.ps1,seed-proof.py}` (extension versionnée du harnais B04, mêmes outils de redimensionnement natif et d'empreinte). Panneaux peuplés par les voies du produit (3 cerveaux synthétiques gelés + 1 REAL_ROOT synthétique dont le moteur est lancé depuis l'interface). BEFORE : `docs/performance/runs/TASK-0062-populated-panels-before.json` + captures `TASK-0062-before-*.png`.
- **Défauts démontrés (3) :** hash SHA-256 de 64 hex dans `.relation__rule` et nom de 90–108 car. dans la section « hors de la vue » donnaient à l'aside un `scrollWidth` de 623 (ou 615) dans une colonne de 345 px, soit un défilement latéral dans 10/19 états; lien inter-cerveaux : endpoints et nom du nœud en ellipse, le nom du nœud n'avait plus de largeur avec des noms de cerveaux de 60/75 car. (10/19 états).
- **Correctif (CSS + une className, aucun autre fichier de produit) :** `src/map/map.css`, `src/map/MapApp.tsx` (`app__offscreen`), tests `responsiveLayout.test.ts` (3 tripwires) et `localeRuntime.test.tsx` (sélecteur adapté à la classe). AFTER : `…-after.json` + `TASK-0062-after-*.png`.
- **Preuves :** 19/19 + 2/2 états sans critère en échec; 7/7 interactions WebView2 (≥2 par panneau, souris et clavier); P-19 (redémarrage, même profil) et P-22 (empreintes stricte et d'accès identiques, 0 artefact).
- **Limites et réserves :** voir `.orchestrator/RESULT.md` — focus après APPROUVER retombe sur `body` (non corrigé); baseline B03 18/18 et 6 états menu ouvert B04 non rejoués; échec intermittent `brainIdentity` sous charge conservé; axe color-contrast INCOMPLETE; pas de replay P-01..P-22; Rust non touché.
- **Aucune** TASK-0063, Stage C/D, PR, fusion ou release.

## Correction ACTION-0115 — 2026-10-12 — `IMPLEMENTED`, non VERIFIED

- **B05-O1 :** après APPROUVER (relations et inter-cerveaux, clavier et souris) le focus tombait sur `body` (14/14 sur le produit précédent avec le harnais enrichi). Correctif d'interface dans `RelationsPanel.tsx`, `CrossRelationsPanel.tsx`, `MapApp.tsx`, `map.css` : focus sur la révocation de la même suggestion, repli analyse / titre. 14/14 tiennent après correction (`TASK-0062-populated-panels-o1-after-r2.json`); le premier AFTER (`…-o1-after.json`) et le critère Tab affiné sont tous deux publiés.
- **B05-O2 :** témoins B03 (`TASK-0062-b03-witness-replay.json`, 18 états) et B04 (`TASK-0061-multibrain-shell-b05-replay.json`, 30+2+6) rejoués sans modification; strictes `false` menu ouvert conservées.
- Réserves inchangées ou nouvelles : `workspaceMapApp` intermittent non attribué, `brainIdentity` signalé, axe contraste INCOMPLETE, pas de replay P-01..P-22, Rust non touché. Voir `.orchestrator/RESULT.md`.
