# NEXT_PROMPT — TASK-0025 / VERIFIED + scellement X5

**TARGET_AGENT:** CODEX  
**STATUS:** READY  
**OWNER:** orchestrateur technique indépendant  
**TASK:** `TASK-0025 — enregistrement du verdict indépendant + scellement X5`  
**MODE:** exécution autonome depuis le dépôt

> Ce fichier **enregistre** un verdict indépendant déjà rendu par l’orchestrateur après inspection du code, de l’historique Git et des preuves réelles. Codex ne refait pas le jugement, ne s’attribue pas `VERIFIED` et ne modifie aucun comportement produit de `TASK-0025`.

## /goal

Enregistrer la vérification indépendante de `TASK-0025 — Suggestion Review Queue + Human Decision Memory`, fermer le contrôle `ACTION-0042`, puis sceller **exactement les deux preuves SR15 canoniques** dans X5.

Verdict externe à enregistrer :

- `SR1` à `SR15` : **PASS**;
- `TASK-0025 = VERIFIED`;
- `ACTION-0042 = CLOSED`;
- `F-044` : implémentation vérifiée par `TASK-0025 / ACTION-0042`;
- `F-045` : implémentation vérifiée par `TASK-0025 / ACTION-0042`;
- aucune nouvelle réserve bloquante;
- `F-046` reste `PROPOSED`;
- `DEC-0013/F` reste bloquante pour l’identité physique persistante;
- la garantie X10 race-safe hors Windows reste non prouvée;
- l’absence d’état persistant `DEFERRED` est **volontaire et conforme** à `DEC-0021 / DEC-0027` : « Plus tard » laisse `PENDING`;
- aucune politique automatique de réévaluation des rejets n’est créée par cette fermeture.

---

## 0 — synchronisation obligatoire

Appliquer les protocoles projet de début de session.

Avant toute écriture :

1. branche locale attendue : `build/v0.2-a9-suggestion-review-memory`;
2. arbre local propre;
3. `git fetch origin`;
4. fast-forward **uniquement** vers `origin/build/v0.2-a9-suggestion-review-memory`;
5. le HEAD obtenu doit être le commit d’orchestration qui contient **ce** fichier;
6. son parent direct doit être exactement :
   `ca1666b91ab2990a41a246074536b07efc13df0c`;
7. le commit substantif/documentaire final de l’exécuteur reste :
   `f1affa85b04a2fa6f8876f3a9250a1ac795aabbd`;
8. le gel documentaire de `TASK-0025` doit rester antérieur au code :
   `135fdb2ace28e58eb9f969a7775965b6cf7f9d9b`;
9. `TASK-0025 = IMPLEMENTED`, contrôle indépendant requis;
10. `F-044` et `F-045 = IMPLEMENTED — contrôle indépendant requis`;
11. `X5 = 32`;
12. `SEALED_RUNTIME_DESTINATIONS = []`;
13. toutes les destinations runtime actuelles appartiennent à `TASK-0025`;
14. `main = 91bbe90f0f99026c28cd345784d4f579a0016db2`;
15. `ACTION-0042` doit être libre.

Si divergence, autre modification locale, fast-forward impossible, preuve manquante ou `ACTION-0042` déjà occupée : **STOP / BLOCKED**.

---

## 1 — contrôle indépendant à enregistrer

Créer :

`docs/reviews/ACTION-0042-independent-control.md`

Le document doit dire explicitement que :

- le **verdict appartient à l’orchestrateur technique indépendant**;
- Codex est seulement le rédacteur de l’enregistrement et du scellement;
- Claude Code était l’exécuteur de `TASK-0025`;
- `VERIFIED` n’est pas auto-attribué par Claude ni par Codex.

### HEAD recontrôlé avant verdict

`ca1666b91ab2990a41a246074536b07efc13df0c`

### Points factuels du verdict

Enregistrer notamment :

- le gel `TASK-0025 / DEC-0027` a été commité avant tout code produit;
- toutes les destinations runtime ont été migrées sous `TASK-0025-*` avant le premier replay, sans réduire les 32 protections X5;
- schéma intra-relations `v4`, avec exactement `pending / approved / rejected`;
- aucun état persistant `deferred`;
- `decision_reconsider_cause` nullable existe mais reste `NULL` en v1;
- migration versionnée depuis v1/v2/v3, avec préservation des lignes et contraintes X3;
- `RelationStore::reject` décide une seule fois, date le rejet, ne crée aucune relation et refuse les cas invalides;
- une suggestion core périmée ne peut ni être confirmée ni rejetée tant que `dre-v1` n’est pas à jour;
- la reconciliation préserve les identités `approved` **et** `rejected`; une rejetée n’est pas recréée `pending` sur rerun inchangé et n’est pas effacée simplement parce qu’un run ne la repropose temporairement plus;
- la formule de `suggestion_key` de `TASK-0024` n’a pas été changée;
- la file backend est générique par cerveau, stable, paginée/bornée, `MAX_REVIEW_QUEUE_LIMIT = 100`, et son `totalPending` exclut les décisions déjà prises;
- l’UI affiche un item explicable et exactement les trois actes `Confirmer / Rejeter / Plus tard`;
- `Confirmer` réutilise le flux `APPROVED` déjà vérifié;
- `Rejeter` appelle le rejet backend puis relit le compte du store;
- `Plus tard` n’appelle aucune mutation et ne fait qu’avancer le curseur local;
- isolation stricte entre cerveaux maintenue;
- aucune donnée réelle, aucune IA/RAG/vector DB/extraction de contenu, aucune refonte graphique.

### Preuves SR15 contrôlées

Pass1 :

`TASK-0025-SR15-suggestion-review-memory-webview2-pass1.json`

Constats à enregistrer :

- vrai Windows/WebView2;
- fresh variant synthétique;
- `protectedArtifactCount = 32` avant scellement;
- `protectedDestinations = []`;
- `owningTaskId = TASK-0025`;
- `writesUnderItsOwnTaskOnly = true`;
- file backend : `totalPending = 7`, `limit = maxLimit = 100`, ordre `suggestion_key ascending`, trois suggestions core;
- une suggestion confirmée, une rejetée, une laissée « Plus tard »;
- activation par vraies frappes : `keydownIsTrusted = true`, `activationIsTrusted = true`;
- `programmaticClickCalls = 0`, `programmaticClickDispatches = 0`;
- confirmée → exactement une relation `APPROVED`;
- rejetée → aucune relation et absente des `pending`;
- « Plus tard » → compteur pending inchangé et suggestion toujours `pending`;
- rerun : `approvedSuggestionPreservations >= 1` et `rejectedSuggestionPreservations >= 1`;
- autre cerveau inchangé et digest inter-cerveaux inchangé;
- source synthétique read-only.

Pass2 :

`TASK-0025-SR15-suggestion-review-memory-webview2-pass2.json`

Constats à enregistrer :

- nouveau processus réel sur le même variant;
- `dre-v1 = CURRENT` **avant toute nouvelle action**;
- relation approuvée déjà persistée;
- rejet toujours mémorisé et absent de la file;
- suggestion « Plus tard » toujours `pending`;
- rerun idempotent;
- compte de file inchangé;
- préservations `approved` et `rejected` toujours observées;
- digest inter-cerveaux inchangé;
- processus fermé réellement.

### Régressions contrôlées mais non canoniques pour le scellement

Les replays suivants sont verts et utiles au contrôle, mais **ne rejoignent pas X5** pour `TASK-0025` :

- `TASK-0025-DR15-deterministic-relation-engine-webview2-pass1.json`;
- `TASK-0025-DR15-deterministic-relation-engine-webview2-pass2.json`;
- `TASK-0025-J12-intrabrain-relations-regression-webview2.json`;
- `TASK-0025-X11-generic-brain-webview2.json`.

Ils restent non canoniques / non protégés par cette action.

Verdict final du document :

- `ACTION-0042 = CLOSED`;
- `TASK-0025 = VERIFIED`;
- `SR1–SR15 = PASS`;
- aucune réserve corrective ouverte.

---

## 2 — preuves canoniques TASK-0025

Sceller **exactement deux** preuves et aucune autre :

1. `TASK-0025-SR15-suggestion-review-memory-webview2-pass1.json`
2. `TASK-0025-SR15-suggestion-review-memory-webview2-pass2.json`

Raison : la fiche `TASK-0025 §7` les définit comme les deux preuves propres à la tranche et précise qu’elles restent hors X5 **jusqu’au contrôle indépendant**. Les DR15/J12/X11 sont des replays/régressions, pas les preuves canoniques de la nouvelle capacité.

Ne modifier, renommer, supprimer ni régénérer **aucun** JSON de preuve.

---

## 3 — X5 : 32 → 34

Faire passer X5 de **32 à exactement 34** noms protégés.

Mettre à jour en parité exacte les trois gardes :

- Rust : `PROTECTED_RUN_ARTIFACTS` au lieu où la porte `write_run_artifact` la consomme;
- TypeScript : `src/map/runArtifacts.ts`;
- PowerShell : `scripts/protected-run-artifacts.ps1`.

Règles append-only :

- conserver les **32 anciens noms exactement dans le même ordre**;
- ajouter ensuite exactement les deux SR15, dans l’ordre pass1 puis pass2;
- aucun autre nom TASK-0025 n’est protégé.

Après scellement :

- `protectedArtifactCount = 34`;
- `SEALED_RUNTIME_DESTINATIONS` = exactement les deux SR15;
- `protectedDestinations` = exactement les deux SR15;
- `owningTaskId = TASK-0025`;
- `writesUnderItsOwnTaskOnly = false`.

**Cet état est normal après `VERIFIED`** : le runtime courant porte encore ses deux destinations SR15, désormais scellées. Ne migre pas encore le runtime vers `TASK-0026`.

---

## 4 — tests de garde à adapter

Adapter `src/map/runArtifacts.test.ts` et les tests Rust/PowerShell nécessaires pour prouver au minimum :

- X5 = ancien32 + exact2 SR15;
- longueur = 34 et unicité = 34;
- les 32 noms historiques gardent exactement leur ordre;
- parité Rust / TypeScript / PowerShell exacte;
- intersection runtime/protected = exactement SR15 pass1/pass2;
- les deux SR15 sont refusées à l’écriture après scellement;
- `TASK-0025-DR15-*`, `TASK-0025-J12-*`, `TASK-0025-X11-*` restent hors X5;
- au moins une destination TASK-0025 non canonique représentative reste autorisée;
- aucun nom historique n’est retiré.

Exécuter uniquement ce qui est utile à cette fermeture :

- test TypeScript ciblé `runArtifacts.test.ts`;
- tests Rust ciblés du garde X5;
- contrôle PowerShell des 34 refus + au moins une destination TASK-0025 non canonique autorisée;
- `git diff --check`.

**Aucun replay WebView2.**  
**Aucun test produit ne doit nécessiter de réécrire une preuve.**

---

## 5 — immutabilité absolue des preuves

Ne modifier aucun fichier sous `docs/performance/runs/`.

Vérifier dans le diff final qu’aucun JSON de preuve n’a changé pendant cette fermeture.

En particulier, ne rejouer ni SR15, ni DR15, ni J12, ni X11, ni les autres campagnes historiques.

---

## 6 — aucun changement de comportement produit

Cette action est **contrôle enregistré + gouvernance + gardes X5**.

Ne pas modifier la logique fonctionnelle de :

- `relations.rs` hors éventuelle constante X5 si elle y vivait réellement;
- `relation_commands.rs`;
- `rule_engine.rs`;
- `MapApp.tsx`;
- `ReviewQueuePanel.tsx`;
- `reviewScenario.ts`;
- migrations SQLite;
- formule de `suggestion_key`;
- règles `dre-v1`;
- fixtures;
- dépendances;
- Cargo.toml / Cargo.lock.

Ne pas « améliorer » la pagination UI, le design, `DEFERRED` ou la politique de reconsidération dans cette fermeture.

---

## 7 — documentation / états

Mettre à jour de façon cohérente :

- `docs/reviews/ACTION-0042-independent-control.md`;
- `docs/tasks/TASK-0025-suggestion-review-memory.md` → `VERIFIED`, en citant `ACTION-0042`;
- `docs/decisions/DEC-0027-suggestion-review-memory.md` : retirer seulement la mention « contrôle indépendant requis » et enregistrer que l’implémentation est validée par `TASK-0025 / ACTION-0042`; ne pas inventer un statut de décision incompatible avec les conventions du dépôt;
- `docs/product/FEATURE_MATRIX.md` : F-044 et F-045 restent `IMPLEMENTED` mais sont désormais référencées comme implémentations vérifiées par `TASK-0025 / ACTION-0042`;
- `docs/ai/CURRENT_STATE.md`;
- `docs/ai/NEXT_ACTION.md`;
- `docs/ai/HANDOFF.md`;
- `docs/ai/VALIDATION.md`;
- `docs/ai/CHANGELOG_AI.md`;
- `.orchestrator/RESULT.md`.

Conserver explicitement :

- `F-043` vérifiée par TASK-0024;
- `F-046 = PROPOSED`;
- `DEC-0013/F` bloquante;
- pas d’état `DEFERRED` persistant dans F-044/F-045 v1;
- pas de politique automatique de réévaluation;
- pas de changement graphique;
- pas d’IA/RAG/vector DB.

---

## 8 — NEXT_ACTION

`docs/ai/NEXT_ACTION.md` doit rendre la main à l’orchestrateur :

> définir la prochaine tranche fonctionnelle après `TASK-0025 VERIFIED`.

Ne pas créer `TASK-0026`, `DEC-0028`, ni commencer la tranche suivante.

---

## 9 — RESULT.md

Écrire un rapport final dans ce format :

```text
TASK_ID: TASK-0025 — VERIFIED / scellement X5
AGENT: CODEX
RESULT: DONE | BLOCKED | FAILED
BRANCH: build/v0.2-a9-suggestion-review-memory
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
- no persistent DEFERRED state by design
- no automatic reconsideration policy in v1

NEXT_ORCHESTRATOR_DECISION:
- définir la prochaine tranche après TASK-0025 VERIFIED
```

Le `FINAL_HEAD` du RESULT doit être le commit substantif de fermeture créé par Codex, même si un commit terminal distinct met ensuite à jour uniquement le rapport.

---

## 10 — Git / arrêt

Commit et push en fast-forward sur **la branche actuelle seulement**.

Interdits :

- merge vers `main`;
- PR;
- release;
- tag;
- label;
- force push;
- rebase destructif;
- reset destructif;
- `git clean`;
- suppression du sandbox historique;
- suppression de `target`;
- modification/régénération d’une preuve JSON.

Appliquer ensuite le protocole projet de fermeture de session, rapport terminal court, puis arrêt.
