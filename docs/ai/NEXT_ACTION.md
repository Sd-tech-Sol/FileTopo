# Action suivante — ACTION-0116 / préparation Stage B B06

**UNE SEULE ACTION :** démarrer la tranche **TASK-0063 / B06 — audit d'accessibilité et contraste en vrai Tauri/WebView2**, à partir de la branche `build/v0.2-b06-a11y-contrast` préparée par l'orchestrateur. Claude Code Sonnet/HIGH exécute seulement `.orchestrator/NEXT_PROMPT.md` sur B06, commit/push et STOP. Pas de B07 ni de Stage C.

- TASK-0062 **VERIFIED** indépendamment dans sa portée B05 par `docs/reviews/ACTION-0116-task0062-independent-control.md`, après cinq commits ACTION-0115, preuve focus 14/14 (ancien produit 14/14 échecs) et témoins B03/B04 relus/contrôlés. Stage A CLOSED, B01–B05 VERIFIED, Stage B EN COURS / NOT CLOSED.
- Lacune de sortie Stage B : axe `color-contrast` INCOMPLETE, pas de lecteur d'écran réel, pas de validation complète WCAG 2.2 AA ni de replay final P-01..P-22. **B06** mesure d'abord la lisibilité/contraste, le focus, les cibles et les interactions réellement peuplées; correction UI limitée seulement si un défaut est prouvé. Il ne suffit pas de compter « 0 violation axe ».
- Les intermittences `workspaceMapApp` (1/12 runs globaux; 1/30 isolé) et `brainIdentity` (signal ancien) sont des réserves non attribuées : ni ignorer ni réécrire les tests pour les masquer. 0 CI B05, tests natifs et pnpm rapportés par Claude seulement.
- P-01..P-22 intégral ne sera déclaré revalidé qu'après une véritable campagne dédiée. R8 reste pour Stage C. Main, Stage C/D, PR, tag, release, merge non autorisés.
