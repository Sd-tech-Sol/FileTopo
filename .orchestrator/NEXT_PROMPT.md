# NEXT_PROMPT — TASK-0026 / reprise et clôture d’implémentation

**TARGET_AGENT:** CODEX  
**STATUS:** READY  
**OWNER:** orchestrateur technique  
**TASK:** `TASK-0026 — Exact Duplicate Explorer + Bounded Scale`  
**MODE:** reprise ciblée depuis l’état courant

## /goal

Reprendre **la même TASK-0026**, sans recommencer ce qui est déjà implémenté, et terminer proprement l’exécution jusqu’à `IMPLEMENTED` uniquement.

Le contrôle indépendant a constaté que le dépôt est encore `IN_PROGRESS` malgré la fin annoncée par la session précédente :

- branche : `build/v0.2-a10-exact-duplicate-explorer`;
- HEAD distant attendu avant reprise : `e6ba32800e868222e2f06d3479fd6422abba46de`;
- gel documentaire valide : `7202e8005d61b25f3171eef65dad64c9c0603080`, antérieur au code produit;
- runtime déjà migré sous `TASK-0026-*`;
- X5 reste exactement à 34;
- les deux preuves `TASK-0026-ED15-*` existent, mais elles ont été capturées **avant** plusieurs corrections du harnais de saisie clavier partagée (`realInput` / scripts). Elles doivent donc être **rejouées sur le HEAD final** avant clôture;
- `.orchestrator/RESULT.md` est encore celui de TASK-0025;
- `docs/tasks/TASK-0026-exact-duplicate-explorer.md` est encore `IN_PROGRESS`;
- les replays obligatoires EC15 / DR15 / SR15 sous noms `TASK-0026-*` ne sont pas encore publiés.

## 0 — synchronisation et sécurité

1. Applique les protocoles de début de session du dépôt.
2. `git fetch origin`.
3. Fast-forward uniquement sur `origin/build/v0.2-a10-exact-duplicate-explorer`.
4. HEAD doit être le commit d’orchestration contenant ce prompt; son parent direct doit être `e6ba32800e868222e2f06d3479fd6422abba46de`.
5. Arbre local propre avant toute nouvelle écriture.
6. Ne touche ni `main`, ni les 34 preuves X5 historiques, ni des données réelles.
7. Si divergence, autre modification locale inconnue ou fast-forward impossible : STOP / BLOCKED.

## 1 — ne pas réinventer TASK-0026

Conserver le périmètre et les critères `ED1` à `ED15` déjà gelés dans :

- `docs/tasks/TASK-0026-exact-duplicate-explorer.md`;
- `docs/decisions/DEC-0028-exact-duplicate-query-boundary.md`.

Ne change aucun critère pour faire passer l’implémentation.

Ne pas introduire : identité physique persistante, FileId, cache digest taille+mtime, watcher, IA/RAG/vector DB/extraction, changement graphique, données réelles, TASK-0027 ou DEC-0029.

`F-046` doit rester `PROPOSED`; `DEC-0013/F` reste bloquante.

## 2 — stabiliser d’abord le harnais réel

Les derniers commits ont modifié la mise au premier plan / injection de vraies touches. Avant toute preuve finale :

- vérifie que le harnais ne peut pas injecter une touche hors de FileTopo;
- aucune temporisation arbitraire ne doit être utilisée comme preuve de succès;
- les preuves finales doivent mesurer `keydownIsTrusted = true`, `activationIsTrusted = true`, `programmaticClickCalls = 0`, `programmaticClickDispatches = 0`;
- le changement observé doit correspondre à l’action UI réellement attendue.

Si un correctif supplémentaire du harnais est nécessaire, fais-le avant les replays finaux et commit/push-le.

## 3 — rejouer ED15 sur le HEAD final

Rejouer **les deux passes ED15** sur le code final :

- `TASK-0026-ED15-exact-duplicate-explorer-webview2-pass1.json`
- `TASK-0026-ED15-exact-duplicate-explorer-webview2-pass2.json`

La même variante synthétique doit être utilisée pour pass1/pass2.

Vérifier au minimum :

- 1 000 à 3 000 fichiers synthétiques;
- plusieurs pages de groupes;
- au moins un groupe >100 membres;
- groupe vide visible et explicitement marqué;
- limite 100 réellement appliquée côté SQLite;
- ordre stable groupes/membres;
- rehash explicite complet sur campagne inchangée;
- source inchangée;
- stores relationnels/intra/inter inchangés;
- vrai redémarrage pass2;
- persistance après rebuild map;
- membre non résolu signalé honnêtement;
- X5 = 34, `protectedDestinations = []`, `owningTaskId = TASK-0026`, `writesUnderItsOwnTaskOnly = true`;
- aucune formulation « même fichier physique », « copie » ou gain disque garanti.

Les JSON ED15 restent **non canoniques** tant que TASK-0026 n’a pas subi de contrôle indépendant ultérieur.

## 4 — replays obligatoires TASK-0026

Après stabilité du HEAD et sans jamais écrire sous un ancien nom protégé, exécuter les régressions demandées par la fiche TASK-0026 sous leurs noms TASK-0026 :

- `TASK-0026-EC15-exact-content-observations-webview2-pass1.json`
- `TASK-0026-EC15-exact-content-observations-webview2-pass2.json`
- `TASK-0026-DR15-deterministic-relation-engine-webview2-pass1.json`
- `TASK-0026-DR15-deterministic-relation-engine-webview2-pass2.json`
- `TASK-0026-SR15-suggestion-review-memory-webview2-pass1.json`
- `TASK-0026-SR15-suggestion-review-memory-webview2-pass2.json`

Ces six replays restent non canoniques et hors X5.

Ne rejoue pas H9/J12/K11/K12/L12/M12/N15/X11 sauf si une dépendance fonctionnelle réellement modifiée depuis leur dernière preuve l’exige et documente alors précisément pourquoi.

## 5 — validations finales obligatoires

Exécuter et enregistrer au minimum :

- tests Rust ciblés `content_signals` / exact duplicate queries;
- tests Rust utiles du moteur de règles touché par les replays, si nécessaire;
- `CARGO_INCREMENTAL=0` si B0 se reproduit, sans supprimer/renommer le cache historique;
- tests `ExactDuplicateExplorer`;
- `runArtifacts.test.ts`;
- `pnpm check`;
- `pnpm build`;
- contrôles X5 / ownership runtime;
- `git diff --check`.

Le résultat final doit démontrer :

- X5 toujours exactement 34 et append-only intact;
- toutes les destinations runtime appartiennent à TASK-0026;
- intersection runtime/protected vide;
- aucune preuve historique X5 modifiée;
- `main` toujours `91bbe90f0f99026c28cd345784d4f579a0016db2`.

## 6 — clôture de TASK-0026

Seulement si `ED1` à `ED15` passent et si les replays/validations obligatoires sont verts :

- `TASK-0026` : `IMPLEMENTED`, **jamais VERIFIED**;
- `DEC-0028` : `IMPLEMENTED — contrôle indépendant requis` ou formulation conforme aux conventions existantes;
- `F-046` : reste `PROPOSED`, mais sa capacité d’exploration exacte à l’échelle est documentée comme fondation implémentée par TASK-0026;
- `DEC-0013/F` : reste bloquante;
- aucun TASK-0027 / DEC-0029;
- `docs/ai/NEXT_ACTION.md` : demande uniquement un contrôle indépendant de TASK-0026.

Mettre à jour les documents durables prévus dans la fiche :

- `docs/ai/CURRENT_STATE.md`
- `docs/ai/NEXT_ACTION.md`
- `docs/ai/HANDOFF.md`
- `docs/ai/VALIDATION.md`
- `docs/ai/CHANGELOG_AI.md`
- `docs/product/FEATURE_MATRIX.md`
- `docs/tasks/TASK-0026-exact-duplicate-explorer.md`
- `docs/decisions/DEC-0028-exact-duplicate-query-boundary.md`
- `.orchestrator/RESULT.md`

## 7 — RESULT.md

Écrire :

```text
TASK_ID: TASK-0026
AGENT: CODEX
RESULT: DONE | BLOCKED | FAILED
BRANCH: build/v0.2-a10-exact-duplicate-explorer
FINAL_HEAD: <commit final substantif/documentaire>

SUMMARY:
-

VALIDATIONS:
-

IMPORTANT_FILES:
-

COMMIT:
PUSHED: yes/no

LIMITS_OR_BLOCKERS:
- DEC-0013/F physical identity persistence remains blocked
- non-Windows X10 race-safe guarantee remains unproven
- F-046 remains PROPOSED

NEXT_ORCHESTRATOR_DECISION:
- independent control of TASK-0026
```

## 8 — Git final

Commit/push sur `build/v0.2-a10-exact-duplicate-explorer` uniquement.

À la fin : arbre propre, origin aligné, aucune fusion/PR/release/tag/main.
