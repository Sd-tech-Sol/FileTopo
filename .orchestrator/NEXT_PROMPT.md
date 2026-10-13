# NEXT_PROMPT — TASK-0063 / Stage B B06

**Une seule tâche : TASK-0063, APPROVED / NOT STARTED.**
Branche : `build/v0.2-b06-a11y-contrast`.
Source de vérité : `docs/reviews/ACTION-0116-task0062-independent-control.md` (B05 VERIFIED), `docs/tasks/TASK-0063-stage-b-a11y-contrast.md`.
Agent : Claude Code **Sonnet / HIGH**.

1. `git fetch origin`, vérifie le remote et les modifications locales, positionne-toi sur B06, synchronise-la **fast-forward seulement**. Si état local inconnu, divergence, fichiers personnels à lire, STOP; pas de reset/clean/force. Les fichiers non suivis hors tâche restent intacts.
2. Lis dans cet ordre `AGENTS.md`, `docs/ai/START_HERE.md`, `docs/ai/CURRENT_STATE.md`, `docs/ai/NEXT_ACTION.md`, ACTION-0116, **l'intégralité** de TASK-0063, et les règles de conception et contrats P-19/P-22 utiles. Ne réexécute pas TASK-0062, déjà VERIFIED.
3. **Mesure d'abord** l'accessibilité réelle du premier écran et des panneaux peuplés sur Tauri/WebView2 Windows synthétique. Contrastes de texte/fond, icônes et contrôles, modes clair/sombre FR/EN, tailles 960/1280/1366, densité compacte, mouvement réduit, focus, navigation clavier, cibles. Axe `color-contrast INCOMPLETE` n'est PAS un PASS. Table de preuves avec règle WCAG 2.2 AA et ratio lorsqu'il est calculable correctement. Réutilise harnais B03/B04/B05, axe et outils existants avant d'ajouter le minimum.
4. N'apporte une correction **UI strictement autorisée dans TASK-0063** que si un défaut reproductible est démontré et publié. Aucun Rust, SQLite, scanner, Index, IPC, projection, MapView, modèle de relations, nouvelle dépendance, lockfile ni changement fonctionnel. Tout blocage hors scope : `BLOCKED`, STOP, ne pas élargir silencieusement.
5. Rejoue les mesures AFTER avec mêmes critères et compare. Prouve B03/B04/B05, P-19/P-22 selon portée du patch; menu modal fermé/ouvert et focus après APPROUVER ne doivent pas régresser. Pas de faux PASS axe, pas de fausse preuve de lecteur d'écran ou WCAG générale.
6. Exécute `pnpm test`, `pnpm check`, `pnpm build`, `git diff --check`; publie toute intermittence `workspaceMapApp` et `brainIdentity`, aucune suppression/relaxation de tests. CI uniquement si elle a effectivement eu lieu.
7. Mets à jour la fiche TASK-0063, preuves `TASK-0063-*`, `.orchestrator/RESULT.md` (`IMPLEMENTED` ou `BLOCKED`, **jamais VERIFIED**), documents d'état/handoff/validation/changelog. Commit et push sur B06, sans force, puis **STOP**. Ne démarre TASK-0064, Stage C/D, PR, fusion main, tag ou release.

`/clear` autorisé avant cette tâche puisque le contexte est documenté dans GitHub.
