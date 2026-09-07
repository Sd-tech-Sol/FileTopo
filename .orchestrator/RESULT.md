TASK_ID: TASK-0026 — VERIFIED / scellement X5
AGENT: CLAUDE
RESULT: DONE
BRANCH: build/v0.2-a10-exact-duplicate-explorer
FINAL_HEAD: 87d5baa1526e5ffe70f00c7f0f080abb38b17e59

SUMMARY:
- Verdict externe enregistré dans docs/reviews/ACTION-0043-independent-control.md : ED1–ED15 = PASS, ACTION-0043 = CLOSED, TASK-0026 = VERIFIED, aucune réserve fonctionnelle bloquante ni réserve corrective ouverte. Codex était l'exécuteur; Claude n'a fait qu'enregistrer, corriger et sceller. Aucun des deux ne s'attribue VERIFIED.
- Scellement X5 34 → 36, append-only : exactement les deux ED15 canoniques ajoutés après les 34 noms historiques inchangés, en parité exacte Rust/TypeScript/PowerShell. Les six replays EC15/DR15/SR15 sous TASK-0026 restent non canoniques et non protégés.
- Après scellement : protectedArtifactCount = 36, SEALED_RUNTIME_DESTINATIONS = protectedDestinations = [ED15 pass1, ED15 pass2], owningTaskId = TASK-0026, writesUnderItsOwnTaskOnly = false — état attendu; rejouer ED15 depuis ce checkout est refusé.
- Commentaires X5 périmés corrigés dans commands.rs et runArtifacts.ts, sans changement de comportement.
- DÉFAUT TROUVÉ ET RÉPARÉ : quatre scénarios d'écriture (dre, exactDuplicate, genericRelation, review) exigeaient avant d'écrire PROTECTED_RUN_ARTIFACTS.length === 34 et une intersection vide — vrai seulement entre deux scellements. À 36 les quatre auraient avorté, rendant INJOUABLES les six replays qui doivent rester rejouables. La précondition porte désormais sur le nom que le scénario s'apprête à écrire. Deux tests X5 nouveaux interdisent le littéral et exigent le contrôle par nom. Même défaut que la réserve X8, sous forme numérique.

VALIDATIONS:
- runArtifacts.test.ts : 44/44 PASS
- Rust ciblés map::commands::tests:: : 26/26 PASS, 203 filtrés
- Suite Rust complète : 229/229 PASS
- Suite TypeScript complète : 246/246 PASS
- pnpm check (tsc --noEmit) : PASS
- Garde PowerShell : 36 refus, 36 noms uniques, six replays TASK-0026 toujours autorisés
- Parité Rust / TypeScript / PowerShell : PASS, 36 noms, même ordre
- git diff --check : PASS
- Aucun chemin sous docs/performance/runs/ modifié, renommé ou supprimé

IMPORTANT_FILES:
- docs/reviews/ACTION-0043-independent-control.md (créé)
- src-tauri/src/map/commands.rs, src/map/runArtifacts.ts, scripts/protected-run-artifacts.ps1 (gardes X5 34 → 36)
- src/map/runArtifacts.test.ts (tests du scellement et de la réparation)
- src/map/dreScenario.ts, exactDuplicateScenario.ts, genericRelationScenario.ts, reviewScenario.ts (précondition d'écriture réparée)
- docs/tasks/TASK-0026-*, docs/decisions/DEC-0028-*, docs/product/FEATURE_MATRIX.md, docs/ai/*

COMMIT: 87d5baa docs(action-0043): record independent control, seal X5 34 to 36
PUSHED: yes

LIMITS_OR_BLOCKERS:
- DEC-0013/F physical identity persistence remains blocked
- non-Windows X10 race-safe guarantee remains unproven
- F-046 remains PROPOSED
- Non testé : aucun replay WebView2, aucune campagne ED15/EC15/DR15/SR15, aucun build Tauri ni pnpm build pour cette fermeture. Le refus d'écriture ED15 est démontré par les gardes Rust/TS, pas par une campagne réelle.
- ÉCART SIGNALÉ, hors périmètre : main locale reste 91bbe90f, mais origin/main porte un commit de plus, 1a7d652c « docs: update canonical GitHub identity », signé Sébastien Dubé, 2026-09-06 18:16 −0400. Action du propriétaire, hors de cette branche; rien n'a été publié vers main par cette fermeture.

NEXT_ORCHESTRATOR_DECISION:
- définir la prochaine tranche après TASK-0026 VERIFIED
