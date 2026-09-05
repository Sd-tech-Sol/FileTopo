TASK_ID: TASK-0025 — suggestion review + decision memory
AGENT: CLAUDE
RESULT: DONE
BRANCH: build/v0.2-a9-suggestion-review-memory
FINAL_HEAD: f1affa8

SUMMARY:
- Gel documentaire TASK-0025 (SR1–SR15) et DEC-0027 commité avant tout code produit.
- Toutes les destinations runtime migrées TASK-0024-* → TASK-0025-* avant le premier rejeu, replays et X11 compris; les 32 noms protégés intacts, SEALED_RUNTIME_DESTINATIONS = [], protectedDestinations = [], owningTaskId = TASK-0025, writesUnderItsOwnTaskOnly = true, X5 = 32.
- Schéma v3 → v4 par reconstruction versionnée : trois états exactement (pending/approved/rejected), colonne nullable decision_reconsider_cause laissée NULL, lignes et pragma_foreign_key_check contrôlés avant commit, déclencheurs X3 recréés; migrations depuis v1, v2 et v3 exercées. Aucun état deferred persistable.
- Rejet explicite (RelationStore::reject, map_relations_reject) : aucune relation créée, aucune autre suggestion touchée, refus nommés sur suggestion absente, déjà décidée, ou core périmée.
- Mémoire du rejet dans la reconciliation dre-v1, pas dans le moteur; survit à un run qui cesse de proposer l'identité; nouveau compteur rejectedSuggestionPreservations ajouté sans renommer les compteurs vérifiés; formule des suggestion_key de TASK-0024 inchangée.
- File de révision générique et paginée par cerveau (map_relations_review_queue), limite max explicite 100, totalPending exact, ordre publié « suggestion_key ascending ».
- UI « Relations à confirmer » : entrée annonçant le compte du backend, un item explicable à la fois, trois boutons natifs Confirmer / Rejeter / Plus tard; les comptes viennent du backend après chaque décision; Plus tard n'appelle aucune commande.
- F-044 et F-045 → IMPLEMENTED — contrôle indépendant requis. TASK-0025 reste IMPLEMENTED : VERIFIED non auto-attribué.

VALIDATIONS:
- Rust complet 221/221; ciblé map::relations 44/44, map::rule_engine 14/14, map::relation_commands 18/18, gardes X5 9/9.
- TypeScript complet 233/233, dont runArtifacts 34/34 et le nouveau reviewQueue 14/14; tsc --noEmit propre; vite build vert; Tauri debug --no-bundle construit.
- PowerShell 32/32 refus, 32 noms uniques, les cinq destinations TASK-0025 autorisées; git diff --check propre.
- SR15 pass1 (variante fraîche) : 7 en attente dont 3 core, une page, limit = maxLimit = 100; keydownIsTrusted et activationIsTrusted vrais sur les 5 activations mesurées et les 4 « Plus tard »; programmaticClickCalls = 0 et programmaticClickDispatches = 0; exactement 1 relation APPROVED pour la confirmée, aucune pour la rejetée, compte en attente 5 → 5 par « Plus tard »; rerun rejectedSuggestionPreservations = 1 et approvedSuggestionPreservations = 1; brain-gamma inchangé (4 → 4), digest inter-cerveaux identique; empreinte source SR15 identique sur deux campagnes.
- SR15 pass2 (nouveau processus, même variante) : dre-v1 CURRENT avant toute action, relation APPROVED persistée, rejetée absente des pending et des établies, reportée encore seule suggestion core en attente, rerun idempotent, processus fermés réellement. Les deux preuves SR15 ne rejoignent pas X5.
- Rejeux verts sous noms TASK-0025 : DR15 pass1/pass2, J12 intra-brain, X11 generic brain. Les 32 preuves protégées re-hachées avant/après chaque campagne : inchangées.

IMPORTANT_FILES:
- docs/tasks/TASK-0025-suggestion-review-memory.md; docs/decisions/DEC-0027-suggestion-review-memory.md.
- src-tauri/src/map/relations.rs; src-tauri/src/map/relation_commands.rs; src-tauri/src/map/rule_engine.rs; src-tauri/src/lib.rs; src-tauri/src/map/commands.rs.
- src/map/runArtifacts.ts; src/map/runArtifacts.test.ts; src/map/ReviewQueuePanel.tsx; src/map/reviewQueue.test.tsx; src/map/reviewScenario.ts; src/map/MapApp.tsx; src/map/types.ts; src/map/map.css; scripts/task0025-sr15-run-real-host.ps1.
- docs/performance/runs/TASK-0025-SR15-*-pass1.json, -pass2.json, TASK-0025-DR15-*, TASK-0025-J12-*, TASK-0025-X11-*.
- docs/product/FEATURE_MATRIX.md; docs/ai/CURRENT_STATE.md; docs/ai/NEXT_ACTION.md; docs/ai/HANDOFF.md; docs/ai/VALIDATION.md (section AP); docs/ai/CHANGELOG_AI.md.

COMMIT: f1affa8 docs(task-0025): record the implemented state across the durable memory
PUSHED: yes

LIMITS_OR_BLOCKERS:
- DEC-0013/F physical identity persistence remains blocked
- non-Windows X10 guarantee remains unproven
- no persistent DEFERRED state in v1; Plus tard leaves PENDING
- no automatic reconsideration policy; decision_reconsider_cause exists and stays NULL
- K11, K12, L12, M12, N15, H9 and EC15 not replayed — slice touches none of their subjects; decision documented in TASK-0025 §7
- three measurement fixes were required and are documented in VALIDATION.md AP.4: an index-file race in the SR15 scenario, a content campaign placed after the last engine run which left dre-v1 STALE, and a synchronous DOM sample in the DR15 replay
- ROADMAP.md left unchanged: A→D order intact and its dated 2026-09-02 note accurate in its own scope

NEXT_ORCHESTRATOR_DECISION:
- contrôle indépendant TASK-0025
