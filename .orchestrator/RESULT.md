TASK_ID: TASK-0024 — correction X11
AGENT: CLAUDE
RESULT: DONE
BRANCH: build/v0.2-a8-deterministic-relation-engine
FINAL_HEAD: bcc10a8

SUMMARY:
- ACTION-0040 enregistré : CHANGES_REQUIRED, X11 OPEN, TASK-0024 IMPLEMENTED. Verdict externe, non rendu par Claude.
- Périmètre legacy TASK-0017 et périmètre core découplés : legacy_fixture_spec() pour la seule fixture historique, source_spec() pour toute source valide, ensure_in_scope() réservé à self_check.
- open_relations ne dérive et ne sème que dans le périmètre legacy; node_relations et approve_suggestion ne sont plus filtrés par la fixture; refus d'approbation core périmée inchangé.
- DTO inScope -> legacyInScope; RelationsPanel reçoit available et legacyInScope; la note legacy ne masque ni le bouton, ni l'état dre-v1, ni les relations/suggestions core, ni leur approbation.
- self_check reste gelé sur quasi-empty; homonymes/v1, suites-numerotees/v1 et les seeds TASK-0017 ne sont jamais élargis; derive() legacy jamais lancé sur wide/deep/mixed.
- Preuve corrective non canonique écrite sur brain-beta en vrai WebView2; elle ne rejoint pas X5 et ne remplace aucune preuve gelée.
- X11 non fermée, VERIFIED non attribué, aucune TASK-0025 créée, aucune réserve auto-fermée.

VALIDATIONS:
- cargo test : 200/200 (dont 3 tests brain-beta : ouverture/run/lecture génériques, isolation Alpha/Gamma, approbation core hors legacy).
- pnpm test : 215/215; pnpm check; pnpm build; pnpm tauri build --debug --no-bundle.
- X11 WebView2 152.0.4191.62 sur brain-beta (deep, 157 nœuds) : panelSaysOutOfScope=false, bouton présent et activable, keydownIsTrusted=true, activationIsTrusted=true, programmaticClickCalls=0, programmaticClickDispatches=0, report brain-beta/dre-v1/CURRENT, map_relations_open réussi après run, producers=["core-rule-engine"], seeded=0, empreinte source inchangée, processus fermé.
- DR15 pass1/pass2 rejouées sur variante fraîche : activation et approbation fiables, 2 relations content-identical, 1 suggestion revision, idempotence et cross-store inchangé.
- J12 réel rejoué : 12 établies / 8 déterministes / 4 approuvées / 4 en attente, countsAgree, replayStable, allRejected, aucun inverse inventé, aucun endpoint non résolu.
- X5 = 29 preuves inchangées; protectedDestinations=[]; writesUnderItsOwnTaskOnly=true; owningTaskId=TASK-0024; main=91bbe90f intacte.

IMPORTANT_FILES:
- src-tauri/src/map/relation_commands.rs
- src/map/RelationsPanel.tsx, src/map/MapApp.tsx, src/map/types.ts
- src/map/genericRelationScenario.ts, src/map/runArtifacts.ts
- scripts/task0024-x11-run-real-host.ps1
- docs/reviews/ACTION-0040-independent-control.md
- docs/performance/runs/TASK-0024-X11-generic-brain-webview2.json
- docs/tasks/TASK-0024-deterministic-relation-engine.md, docs/decisions/DEC-0026-deterministic-rule-runtime.md

COMMIT: bcc10a8 fix(task-0024): decouple the legacy relation scope from the core engine
PUSHED: yes

LIMITS_OR_BLOCKERS:
- K11/K12/L12/M12/N15/H9 non rejoués : aucune dépendance directe constatée.
- Sur deep, core.identical-content est sautée (SKIPPED_MISSING_SIGNAL) : zéro sortie est un résultat valide; rien n'affirme qu'une règle doive produire.
- Généricité prouvée en hôte réel sur brain-beta/deep; wide et mixed non couverts par une preuve réelle.
- DEC-0013/F physical identity persistence remains blocked
- non-Windows X10 guarantee remains unproven

NEXT_ORCHESTRATOR_DECISION:
- re-contrôle indépendant X11 / TASK-0024
