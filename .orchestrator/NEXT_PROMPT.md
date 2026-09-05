# NEXT_PROMPT — TASK-0024 / VERIFIED + scellement X5

**TARGET_AGENT:** CODEX  
**STATUS:** READY  
**OWNER:** orchestrateur technique  
**TASK:** `TASK-0024 — enregistrement VERIFIED / scellement X5`  
**MODE:** exécution autonome depuis le dépôt

> Ce fichier enregistre un verdict indépendant déjà rendu par l'orchestrateur. Codex ne refait pas le jugement produit; il l'enregistre, scelle les preuves canoniques et vérifie les gardes.

## /goal

Enregistrer la clôture indépendante de `TASK-0024`, fermer `X11`, puis sceller **exactement les trois preuves canoniques** de la tâche dans `X5`.

Aucun code produit, aucune preuve WebView2 et aucun critère `DR1–DR15` ne doivent être modifiés.

---

## 0 — synchronisation obligatoire

Appliquer :

- `.agents/skills/debut-session/SKILL.md`;
- `.orchestrator/protocols/debut-session.md`.

Avant toute modification :

1. branche locale attendue : `build/v0.2-a8-deterministic-relation-engine`;
2. arbre local propre;
3. `git fetch origin`;
4. fast-forward uniquement vers `origin/build/v0.2-a8-deterministic-relation-engine`;
5. le HEAD obtenu doit être le commit d'orchestration qui contient **ce** fichier;
6. son parent direct doit être exactement :
   `f78d1bf4842ced5201608f59a31747f02fce0332`;
7. commit substantif X11 :
   `bcc10a8d0196d55dd07f1998558d4ca5e9586292`;
8. `TASK-0024 = IMPLEMENTED`;
9. `ACTION-0040 = CHANGES_REQUIRED`;
10. `X11 = OPEN`;
11. `X5 = 29`;
12. `main = 91bbe90f0f99026c28cd345784d4f579a0016db2`;
13. `ACTION-0041` doit être libre.

Si divergence, autre modification locale ou fast-forward impossible : **STOP / BLOCKED**.

---

## 1 — verdict indépendant à enregistrer

Créer :

`docs/reviews/ACTION-0041-independent-recontrol.md`

Le document **ENREGISTRE** le verdict externe rendu par l'orchestrateur technique indépendant.

Codex ne s'attribue pas ce verdict.

Enregistrer exactement :

- `X11 = CLOSED`;
- `ACTION-0040 = CLOSED`;
- `ACTION-0041 = CLOSED`;
- `TASK-0024 = VERIFIED`.

HEAD re-contrôlé avant cette fermeture :

`f78d1bf4842ced5201608f59a31747f02fce0332`

Commit substantif X11 :

`bcc10a8d0196d55dd07f1998558d4ca5e9586292`

### Motifs de clôture X11

Enregistrer factuellement :

- `source_spec()` valide la source sans appliquer le périmètre legacy;
- `legacy_fixture_spec()` limite toujours `TASK-0017` à `quasi-empty`;
- `self_check` reste limité au contrat historique;
- `open_relations` fonctionne pour tout `BrainRecord` valide et ne dérive/seed le legacy que sur `quasi-empty`;
- `node_relations` et `approve_suggestion` ne sont plus bloqués par la fixture legacy;
- une suggestion core périmée reste refusée;
- le panneau distingue disponibilité core et périmètre legacy;
- le bouton `Analyser les relations` reste présent hors `quasi-empty`;
- preuve réelle WebView2 X11 sur `brain-beta` / `deep` : panneau disponible, vraie frappe clavier, zéro clic programmatique, report `brain-beta / dre-v1 / CURRENT`, aucun producteur legacy, `seeded = 0`, source inchangée;
- Rust 200/200, TypeScript 215/215, check/build/Tauri passés lors de la correction;
- DR15 pass1/pass2 rejoués avec succès sur variante fraîche;
- J12 réel rejoué sans affaiblissement des invariants legacy;
- X5 resté à 29 pendant la correction;
- `main` intacte.

Conserver les limites honnêtes :

- X10 race-safe prouvée sur Windows seulement;
- `DEC-0013/F` reste bloquante pour l'identité physique persistante;
- `F-044`, `F-045`, `F-046` ne sont pas implémentées par cette fermeture.

---

## 2 — preuves canoniques TASK-0024

`TASK-0024` possède **exactement trois** preuves canoniques à sceller :

1. `TASK-0024-DR15-deterministic-relation-engine-webview2-pass1.json`
2. `TASK-0024-DR15-deterministic-relation-engine-webview2-pass2.json`
3. `TASK-0024-J12-intrabrain-relations-regression-webview2.json`

La preuve corrective :

`TASK-0024-X11-generic-brain-webview2.json`

reste **NON CANONIQUE** et **NE rejoint PAS X5**.

Ne protéger aucune autre preuve `TASK-0024`.

---

## 3 — X5 : 29 → 32

Faire passer `X5` de **29 à exactement 32** preuves protégées.

Mettre à jour en parité exacte les trois gardes canoniques :

- Rust : liste `PROTECTED_RUN_ARTIFACTS`;
- TypeScript : `src/map/runArtifacts.ts`;
- PowerShell : `scripts/protected-run-artifacts.ps1`.

Ordre append-only :

- conserver les 29 anciens noms exactement dans le même ordre;
- ajouter ensuite exactement les trois preuves canoniques TASK-0024 dans l'ordre indiqué en section 2.

Aucune autre entrée.

---

## 4 — état runtime attendu après scellement

Le runtime courant écrit toujours sous `TASK-0024`.

Après scellement, l'intersection protégée/runtime doit donc être exactement :

- `TASK-0024-DR15-deterministic-relation-engine-webview2-pass1.json`;
- `TASK-0024-DR15-deterministic-relation-engine-webview2-pass2.json`;
- `TASK-0024-J12-intrabrain-relations-regression-webview2.json`.

Mettre à jour `SEALED_RUNTIME_DESTINATIONS` en conséquence.

État dérivé attendu :

- `protectedArtifactCount = 32`;
- `protectedDestinations` = exactement les 3 noms ci-dessus;
- `owningTaskId = TASK-0024`;
- `writesUnderItsOwnTaskOnly = false`.

**C'est normal après VERIFIED.**

Ne pas migrer le runtime vers `TASK-0025` dans cette fermeture.

`TASK-0024-X11-generic-brain-webview2.json` reste une destination non protégée et non canonique.

---

## 5 — tests de garde

Adapter `src/map/runArtifacts.test.ts` pour prouver au minimum :

- ensemble protégé = ancien29 + exact3;
- longueur = 32;
- parité exacte Rust / TypeScript / PowerShell;
- intersection runtime/protected = exact3;
- X11 corrective **absente** de X5;
- H9/K11/K12/L12/M12/N15/EC15 et variantes `-abandon` TASK-0024 restent non protégées sauf les trois noms canoniques ci-dessus;
- les trois preuves canoniques sont refusées en écriture après scellement;
- une destination TASK-0024 non canonique représentative reste autorisée.

Exécuter :

- test TypeScript ciblé `runArtifacts.test.ts`;
- tests Rust ciblés du write gate X5;
- contrôle PowerShell des 32 refus + au moins un nom non canonique autorisé;
- `git diff --check`.

Aucun rejeu WebView2.

Pas besoin de relancer les suites produit complètes puisque le code produit ne doit pas changer.

---

## 6 — preuves immuables pendant cette fermeture

NE MODIFIER AUCUN JSON dans `docs/performance/runs/`.

En particulier, les blobs actuels des trois preuves canoniques et de la preuve X11 doivent rester inchangés pendant cette action.

Ne rejouer :

- ni DR15;
- ni J12;
- ni X11;
- ni K11/K12/L12/M12/N15/H9/EC15.

---

## 7 — ne pas toucher au code produit

Cette fermeture est **gouvernance + gardes X5 seulement**.

Ne pas modifier :

- `src-tauri/src/map/rule_engine.rs`;
- `src-tauri/src/map/relation_commands.rs` hors constante/garde X5 si celle-ci y vit réellement;
- logique SQLite de relations;
- `RelationsPanel.tsx`;
- `MapApp.tsx`;
- `genericRelationScenario.ts`;
- fixtures;
- dépendances;
- Cargo.toml / Cargo.lock;
- preuves JSON.

Aucune nouvelle dépendance.

---

## 8 — documentation / états

Mettre à jour :

- `ACTION-0040` pour référencer la clôture par `ACTION-0041`;
- `ACTION-0041`;
- `TASK-0024` → `VERIFIED`;
- `docs/ai/CURRENT_STATE.md`;
- `docs/ai/NEXT_ACTION.md`;
- `docs/ai/HANDOFF.md`;
- `docs/ai/VALIDATION.md`;
- `docs/ai/CHANGELOG_AI.md`;
- `.orchestrator/RESULT.md`;
- `docs/product/FEATURE_MATRIX.md` seulement pour retirer la mention « contrôle indépendant requis » de `F-043` et référencer `TASK-0024 VERIFIED / ACTION-0041`; garder son statut produit `IMPLEMENTED` si la matrice utilise ce vocabulaire.

Ne réécrire aucune décision normative de `DEC-0026`.

État final attendu :

- `TASK-0024 = VERIFIED`;
- `X11 = CLOSED`;
- `ACTION-0040 = CLOSED`;
- `ACTION-0041 = CLOSED`;
- `F-043` = implémentation vérifiée par `TASK-0024`, sans inventer un nouveau statut si la matrice n'utilise pas `VERIFIED`;
- `F-044`, `F-045`, `F-046` restent dans leur état actuel;
- `DEC-0013/F` reste bloquante;
- X5 = 32.

---

## 9 — NEXT_ACTION

`NEXT_ACTION` doit rendre la main à l'orchestrateur :

> définir la prochaine tranche après `TASK-0024 VERIFIED`.

Ne pas créer `TASK-0025`.

---

## 10 — RESULT.md

```text
TASK_ID: TASK-0024 — VERIFIED / scellement X5
AGENT: CODEX
RESULT: DONE | BLOCKED | FAILED
BRANCH: build/v0.2-a8-deterministic-relation-engine
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
- non-Windows X10 guarantee remains unproven

NEXT_ORCHESTRATOR_DECISION:
- définir la prochaine tranche après TASK-0024 VERIFIED
```

---

## 11 — Git / arrêt

Commit/push fast-forward sur la branche actuelle uniquement.

Interdits :

- merge `main`;
- PR;
- release;
- tag;
- label;
- force push;
- rebase/reset destructif;
- `clean`;
- suppression `target`;
- suppression sandbox historique;
- modification d'une preuve JSON.

Appliquer ensuite le protocole de fermeture de session.

Rapport terminal court, puis arrêt.
