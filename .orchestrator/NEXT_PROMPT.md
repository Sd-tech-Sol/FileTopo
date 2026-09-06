# NEXT_PROMPT — TASK-0026 / contrôle indépendant + scellement X5

**TARGET_AGENT:** CLAUDE  
**STATUS:** READY  
**OWNER:** orchestrateur technique indépendant  
**TASK:** `TASK-0026 — Exact Duplicate Explorer + Bounded Scale`  
**MODE:** enregistrement du verdict externe, hygiène documentaire ciblée et scellement

> Ce fichier enregistre un verdict indépendant déjà rendu après inspection du code, de l’historique Git, des preuves ED15 finales et des replays EC15/DR15/SR15. Claude n’est pas l’exécuteur de TASK-0026 et ne doit ni refaire la fonctionnalité ni s’auto-attribuer le verdict.

## /goal

Enregistrer le contrôle indépendant de `TASK-0026`, corriger deux commentaires X5 devenus factuellement périmés sans changer le comportement, puis sceller **exactement les deux preuves ED15 propres à la nouvelle capacité**.

Verdict externe à enregistrer :

- `ED1` à `ED15` : **PASS**;
- aucune réserve fonctionnelle bloquante;
- `TASK-0026 = VERIFIED` après enregistrement de ce contrôle;
- `DEC-0028` : implémentation validée par `TASK-0026 / ACTION-0043`;
- `F-046` reste **PROPOSED** : l’exploration exacte à l’échelle est validée, mais l’identité physique persistante reste absente;
- `DEC-0013/F` demeure bloquante;
- la garantie X10 race-safe hors Windows reste non prouvée;
- aucune identité physique, aucun `FileId`, aucun cache digest taille+mtime, aucune IA/RAG/vector DB/extraction, aucune donnée réelle.

Un écart **documentaire non fonctionnel** a été trouvé pendant le contrôle : certains commentaires X5 dans `src-tauri/src/map/commands.rs` et `src/map/runArtifacts.ts` décrivent encore l’état post-`ACTION-0042` comme si le runtime courant écrivait des destinations `TASK-0025` protégées. C’est faux pour le checkout actuel : avant ce scellement, toutes les destinations ont déjà été migrées vers `TASK-0026`, X5 vaut 34, `SEALED_RUNTIME_DESTINATIONS = []`, l’intersection runtime/protected est vide et `writesUnderItsOwnTaskOnly = true`. Corriger uniquement ces commentaires pendant la fermeture; ne modifier aucune logique pour ce point.

---

## 0 — synchronisation obligatoire

1. Appliquer les protocoles de début de session du dépôt.
2. Branche attendue : `build/v0.2-a10-exact-duplicate-explorer`.
3. `git fetch origin`, puis fast-forward uniquement sur cette branche.
4. HEAD doit être le commit d’orchestration qui contient ce fichier.
5. Son parent direct doit être exactement `b7c94d45dab52a70faa4220a131830c11c54bc19`.
6. Le commit final substantif/preuve avant handoff reste `b40e1ceb568acad77982738c6634fd810d4d7662`.
7. Arbre propre; aucun autre changement local.
8. `TASK-0026 = IMPLEMENTED`, contrôle indépendant requis.
9. `ACTION-0043` doit être libre.
10. X5 doit être exactement 34 avant scellement.
11. `SEALED_RUNTIME_DESTINATIONS = []` avant scellement.
12. Toutes les destinations runtime doivent appartenir à `TASK-0026`.
13. `main` doit rester `91bbe90f0f99026c28cd345784d4f579a0016db2`.

Si divergence, `ACTION-0043` occupée, preuve manquante, X5 différent ou autre modification locale : **STOP / BLOCKED**.

---

## 1 — ACTION-0043 à créer

Créer :

`docs/reviews/ACTION-0043-independent-control.md`

Le document doit préciser :

- verdict rendu par l’orchestrateur technique indépendant;
- Codex était l’agent d’exécution de TASK-0026;
- Claude est uniquement le rédacteur de l’enregistrement, de l’hygiène documentaire et du scellement;
- ni Codex ni Claude ne s’auto-attribuent `VERIFIED`.

### Historique contrôlé

Enregistrer au minimum :

- base d’orchestration initiale : `a6918130202dc164684ed37c969efc90efd8b159`;
- gel documentaire avant code : `7202e8005d61b25f3171eef65dad64c9c0603080`;
- migration runtime sous TASK-0026 avant les replays : `9e775024c4889260d668677ed8bca93d812641a1`;
- backend borné : `7517a592b4c9b7e533a1d22131e5e42ddb71cc73`;
- UI explorateur : `7efbdabc51a79bb71694784fdfb074d17671bc22`;
- reprise finale orchestrée depuis `c92fe90d013f889d7cfb6154c3c9ace4dac728ce`;
- ED15 final rejoué après le dernier durcissement du harnais;
- EC15, DR15 et SR15 ensuite rejoués sous noms TASK-0026;
- handoff final : `b7c94d45dab52a70faa4220a131830c11c54bc19`.

### Points fonctionnels contrôlés

Enregistrer que le contrôle indépendant a vérifié notamment :

- lecture du store de contenu en **read-only** pour les requêtes d’exploration; une lecture sur store absent ne crée pas `content.sqlite`;
- source = génération courante, filtrée explicitement par `generation_id`;
- seuls `HASHED + sha256-v1 + digest valide` participent;
- incohérence de taille pour un même digest est rejetée, la taille n’établit jamais le groupe;
- groupes via agrégation SQLite et `LIMIT/OFFSET`, limite max 100;
- membres via requête séparée SQLite `ORDER BY relative_path ASC LIMIT/OFFSET`, limite max 100;
- ordre groupes `size_bytes DESC, hash_hex ASC`;
- groupe vide visible comme fait exact, aucune relation/suggestion/gain garanti;
- UI avec boutons natifs, digest complet, date/génération, pages groupes/membres et membre non résolu honnête;
- texte canonique : « Contenu binaire identique observé » + limite disant que cela ne prouve ni même fichier physique ni copie;
- isolation stricte par `brain_id`;
- consultation sans mutation des stores relationnels/intra/inter;
- aucune identité physique persistante ajoutée.

### ED15 final contrôlé

Les deux preuves propres à TASK-0026 sont :

- `TASK-0026-ED15-exact-duplicate-explorer-webview2-pass1.json`
- `TASK-0026-ED15-exact-duplicate-explorer-webview2-pass2.json`

Pass1 final, capturé après les correctifs du harnais :

- vrai Windows/WebView2;
- variante fraîche synthétique;
- 1 200 fichiers;
- 1 200 HASHED, 1 200 ouvertures et 1 200 digests;
- 125 groupes, 373 occurrences groupées, 1 groupe vide;
- pagination groupes sur plusieurs pages et limite backend 100;
- groupe >100 membres et pagination membres;
- activation clavier fiable (`keydownIsTrusted = true`, `activationIsTrusted = true`), zéro clic programmatique;
- seconde campagne explicite inchangée : 1 200 fichiers réellement rouverts et rehachés;
- source fingerprint avant/après identique;
- stores relationnels inchangés;
- Beta/Gamma non fusionnés;
- X5 = 34 et intersection vide avant scellement.

Pass2 final :

- vrai nouveau processus sur la même variante;
- vrai rebuild map;
- 125 groupes / 373 occurrences persistés avant nouvelle campagne;
- ordre de pages stable;
- membres devenus non résolus après rebuild signalés sans effacement;
- groupe vide persistant, 125 membres;
- vraies activations clavier, zéro clic programmatique;
- stores relationnels inchangés;
- nouvelle campagne lit encore les 1 200 fichiers;
- source inchangée.

### Régressions contrôlées mais non canoniques

Les six replays suivants sont verts, utiles au contrôle, mais **ne rejoignent pas X5** :

- `TASK-0026-EC15-exact-content-observations-webview2-pass1.json`
- `TASK-0026-EC15-exact-content-observations-webview2-pass2.json`
- `TASK-0026-DR15-deterministic-relation-engine-webview2-pass1.json`
- `TASK-0026-DR15-deterministic-relation-engine-webview2-pass2.json`
- `TASK-0026-SR15-suggestion-review-memory-webview2-pass1.json`
- `TASK-0026-SR15-suggestion-review-memory-webview2-pass2.json`

Enregistrer que DR15 conserve notamment `dre-v1`, deux relations `content-identical` pour trois contenus non vides identiques, skip du groupe vide, approbation persistée/idempotente et source read-only. SR15 conserve la mémoire `approved/rejected` après vrai redémarrage et rerun.

### Validations rapportées et cohérentes avec les artefacts

- Rust exact duplicate : 3/3;
- moteur de règles : 14/14;
- suite Rust : 227/227;
- TypeScript ciblé : 42/42;
- suite TypeScript : 241/241;
- `pnpm check` PASS;
- `pnpm build` PASS;
- Tauri debug `--no-bundle` PASS;
- `git diff --check` PASS;
- X5 : 34/34 historiques refusés avant scellement, aucune destination TASK-0026 protégée.

Verdict du document :

- `ED1–ED15 = PASS`;
- `ACTION-0043 = CLOSED`;
- `TASK-0026 = VERIFIED`;
- aucune réserve fonctionnelle corrective ouverte.

---

## 2 — hygiène documentaire X5, sans comportement

Corriger les commentaires périmés dans :

- `src-tauri/src/map/commands.rs` autour de `PROTECTED_RUN_ARTIFACTS`;
- `src/map/runArtifacts.ts` autour de la migration TASK-0026, `SEALED_RUNTIME_DESTINATIONS`, `protectedDestinations` et `writesUnderItsOwnTaskOnly`.

Avant scellement, la vérité est : runtime entièrement TASK-0026, X5 34, intersection vide.

Après scellement ACTION-0043, la vérité devient : le runtime reste TASK-0026 mais ses **deux destinations ED15** sont désormais protégées; l’intersection runtime/protected est exactement ces deux ED15.

Ne pas modifier d’autre commentaire historique sans nécessité. Ne changer aucune API, aucun algorithme, aucune règle, aucun scénario ou comportement produit pour cette correction documentaire.

---

## 3 — preuves canoniques TASK-0026

Sceller **exactement deux** preuves, et seulement elles :

1. `TASK-0026-ED15-exact-duplicate-explorer-webview2-pass1.json`
2. `TASK-0026-ED15-exact-duplicate-explorer-webview2-pass2.json`

Ce sont les preuves propres à la nouvelle capacité ED1–ED15.

Les six EC15/DR15/SR15 restent des replays non canoniques et non protégés.

Ne modifier, régénérer, renommer ni supprimer **aucun JSON** sous `docs/performance/runs/` pendant cette fermeture.

---

## 4 — X5 : 34 → 36

Faire passer les trois gardes à **exactement 36** noms, en parité stricte :

- Rust `PROTECTED_RUN_ARTIFACTS`;
- TypeScript `src/map/runArtifacts.ts`;
- PowerShell `scripts/protected-run-artifacts.ps1`.

Règles append-only :

- conserver les 34 anciens noms exactement et dans le même ordre;
- ajouter ED15 pass1 puis ED15 pass2;
- aucun EC15/DR15/SR15 TASK-0026 n’est ajouté.

Après scellement :

- `protectedArtifactCount = 36`;
- `SEALED_RUNTIME_DESTINATIONS` = exactement ED15 pass1 + ED15 pass2;
- `protectedDestinations` = exactement ces deux ED15;
- `owningTaskId = TASK-0026`;
- `writesUnderItsOwnTaskOnly = false` — état attendu d’un runtime dont les preuves propres viennent d’être scellées.

Adapter les tests X5 pour démontrer : ancien34 append-only, longueur/unique = 36, parité Rust/TS/PowerShell, exact intersection ED15x2, écriture refusée pour ED15x2, replays EC15/DR15/SR15 TASK-0026 toujours autorisés/non protégés.

Exécuter seulement les tests de garde nécessaires à cette fermeture + `git diff --check`. **Aucun replay WebView2.**

---

## 5 — documentation de clôture

Mettre à jour de façon cohérente :

- `docs/reviews/ACTION-0043-independent-control.md`;
- `docs/tasks/TASK-0026-exact-duplicate-explorer.md` → `VERIFIED`, référence ACTION-0043;
- `docs/decisions/DEC-0028-exact-duplicate-query-boundary.md` → implémentation validée par TASK-0026/ACTION-0043, sans inventer un statut incompatible avec les conventions;
- `docs/product/FEATURE_MATRIX.md` : F-046 reste `PROPOSED`, mais l’exploration exacte à l’échelle est désormais **vérifiée par TASK-0026 / ACTION-0043**;
- `docs/ai/CURRENT_STATE.md`;
- `docs/ai/NEXT_ACTION.md`;
- `docs/ai/HANDOFF.md`;
- `docs/ai/VALIDATION.md`;
- `docs/ai/CHANGELOG_AI.md`;
- `.orchestrator/RESULT.md`.

Conserver explicitement :

- F-043 vérifiée TASK-0024;
- F-044/F-045 vérifiées TASK-0025;
- F-046 PROPOSED;
- DEC-0013/F bloquante;
- X10 hors Windows non race-safe/non prouvée;
- aucune IA/RAG/vector DB/extraction;
- aucune refonte graphique;
- aucune donnée réelle.

`NEXT_ACTION.md` rend la main à l’orchestrateur pour définir la tranche suivante. Ne pas créer `TASK-0027` ni `DEC-0029`.

---

## 6 — RESULT.md

Écrire :

```text
TASK_ID: TASK-0026 — VERIFIED / scellement X5
AGENT: CLAUDE
RESULT: DONE | BLOCKED | FAILED
BRANCH: build/v0.2-a10-exact-duplicate-explorer
FINAL_HEAD: <commit substantif de fermeture>

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
- définir la prochaine tranche après TASK-0026 VERIFIED
```

---

## 7 — Git final

Commit/push uniquement sur `build/v0.2-a10-exact-duplicate-explorer`.

Interdits : merge, PR, release, tag, main, force push, réécriture d’historique, modification des JSON de preuve.
