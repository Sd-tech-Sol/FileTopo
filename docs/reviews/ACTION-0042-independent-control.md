# ACTION-0042 — Contrôle indépendant de TASK-0025 : CLOSED, TASK-0025 VERIFIED

- **Date :** 2026-09-05
- **Objet :** enregistrement du contrôle indépendant de `TASK-0025` et
  scellement de ses deux preuves canoniques `SR15`
- **Contrôleur :** **orchestrateur technique indépendant**, instance distincte
  de l'exécuteur de `TASK-0025`
- **Exécuteur de TASK-0025 :** Claude Code
- **Rédacteur :** Codex. **Ce document ENREGISTRE le verdict externe rendu par
  l'orchestrateur technique indépendant; Codex ne rend pas ce verdict et ne
  s'attribue pas `VERIFIED`.** Claude Code ne s'est pas attribué `VERIFIED`.
- **HEAD re-contrôlé avant verdict :**
  `ca1666b91ab2990a41a246074536b07efc13df0c`
- **Commit substantif/documentaire final de l'exécuteur :**
  `f1affa85b04a2fa6f8876f3a9250a1ac795aabbd`
- **Gel documentaire antérieur au code :**
  `135fdb2ace28e58eb9f969a7775965b6cf7f9d9b`
- **`main` :** `91bbe90f0f99026c28cd345784d4f579a0016db2`, intacte

## 1. Verdict externe enregistré

| Élément | Verdict |
|---|---|
| `SR1` à `SR15` | **`PASS`** |
| `ACTION-0042` | **`CLOSED`** |
| `TASK-0025` | **`VERIFIED`** |
| `F-044` | implémentation vérifiée par `TASK-0025 / ACTION-0042` |
| `F-045` | implémentation vérifiée par `TASK-0025 / ACTION-0042` |
| Réserve corrective | aucune ouverte |

`F-046` reste `PROPOSED`. `DEC-0013/F` reste bloquante pour l'identité
physique persistante. La garantie race-safe `X10` hors Windows reste non
prouvée. L'absence d'état persistant `DEFERRED` est volontaire et conforme à
`DEC-0021 / DEC-0027` : « Plus tard » laisse la suggestion `PENDING`. Cette
fermeture ne crée aucune politique automatique de réévaluation des rejets.

## 2. Points factuels du verdict

Enregistrés tels que rendus par l'orchestrateur technique indépendant :

- le gel `TASK-0025 / DEC-0027` a été commité avant tout code produit;
- toutes les destinations runtime ont été migrées sous `TASK-0025-*` avant le
  premier replay, sans réduire les 32 protections X5 alors existantes;
- le store intra-relations est en schéma `v4`, avec exactement les états
  `pending`, `approved` et `rejected`; aucun état `deferred` n'est persistable;
- `decision_reconsider_cause` est nullable et reste `NULL` en v1;
- les migrations versionnées depuis v1, v2 et v3 préservent les lignes et les
  contraintes `X3`;
- `RelationStore::reject` décide une seule fois, date le rejet, ne crée aucune
  relation et refuse les cas invalides;
- une suggestion core périmée ne peut être ni confirmée ni rejetée tant que
  `dre-v1` n'est pas à jour;
- la reconciliation préserve les identités `approved` et `rejected`; une
  rejetée n'est ni recréée `pending` sur rerun inchangé, ni effacée parce qu'un
  run cesse temporairement de la proposer;
- la formule de `suggestion_key` de `TASK-0024` n'a pas changé;
- la file backend est générique par cerveau, stable, paginée et bornée par
  `MAX_REVIEW_QUEUE_LIMIT = 100`; `totalPending` exclut les décisions prises;
- l'interface rend chaque item explicable et offre exactement les trois actes
  `Confirmer`, `Rejeter` et `Plus tard`;
- `Confirmer` réutilise le flux `APPROVED` déjà vérifié; `Rejeter` appelle le
  backend puis relit le compte du store; `Plus tard` n'appelle aucune mutation
  et avance seulement le curseur local;
- l'isolation entre cerveaux est maintenue;
- aucune donnée réelle, IA, RAG, vector DB, extraction de contenu ni refonte
  graphique n'entre dans cette tranche.

## 3. Preuves SR15 contrôlées

### Pass 1

`TASK-0025-SR15-suggestion-review-memory-webview2-pass1.json` montre :

- un vrai hôte Windows/WebView2 sur une variante synthétique fraîche;
- avant scellement, `protectedArtifactCount = 32`,
  `protectedDestinations = []`, `owningTaskId = TASK-0025` et
  `writesUnderItsOwnTaskOnly = true`;
- une file backend de `totalPending = 7`, `limit = maxLimit = 100`, ordonnée
  par `suggestion_key ascending`, dont trois suggestions core;
- une suggestion confirmée, une rejetée et une laissée « Plus tard »;
- des activations par vraies frappes avec `keydownIsTrusted = true`,
  `activationIsTrusted = true`, `programmaticClickCalls = 0` et
  `programmaticClickDispatches = 0`;
- exactement une relation `APPROVED` pour la confirmée, aucune pour la rejetée;
- un compte pending inchangé par « Plus tard », la suggestion restant
  `pending`;
- au rerun, `approvedSuggestionPreservations >= 1` et
  `rejectedSuggestionPreservations >= 1`;
- l'autre cerveau et le digest inter-cerveaux inchangés, ainsi qu'une source
  synthétique restée en lecture seule.

### Pass 2

`TASK-0025-SR15-suggestion-review-memory-webview2-pass2.json` montre :

- un nouveau processus réel sur la même variante;
- `dre-v1 = CURRENT` avant toute nouvelle action;
- la relation approuvée déjà persistée, le rejet toujours mémorisé et absent de
  la file, et la suggestion « Plus tard » toujours `pending`;
- un rerun idempotent, un compte de file inchangé et les préservations
  `approved` et `rejected` encore observées;
- le digest inter-cerveaux inchangé et la fermeture réelle du processus.

## 4. Régressions contrôlées, non canoniques

Les replays suivants sont verts mais ne rejoignent pas X5 :

- `TASK-0025-DR15-deterministic-relation-engine-webview2-pass1.json`;
- `TASK-0025-DR15-deterministic-relation-engine-webview2-pass2.json`;
- `TASK-0025-J12-intrabrain-relations-regression-webview2.json`;
- `TASK-0025-X11-generic-brain-webview2.json`.

Ils restent non canoniques et non protégés par `ACTION-0042`.

## 5. Scellement X5 — 32 → 34

Exactement deux preuves rejoignent X5, dans cet ordre et après les 32 noms
historiques inchangés :

1. `TASK-0025-SR15-suggestion-review-memory-webview2-pass1.json`
2. `TASK-0025-SR15-suggestion-review-memory-webview2-pass2.json`

Les gardes Rust, TypeScript et PowerShell portent les mêmes 34 noms dans le
même ordre. Aucun JSON de preuve n'est modifié, renommé, supprimé ni régénéré.

Après scellement :

```text
protectedArtifactCount    = 34
SEALED_RUNTIME_DESTINATIONS = [SR15 pass1, SR15 pass2]
protectedDestinations     = [SR15 pass1, SR15 pass2]
owningTaskId              = TASK-0025
writesUnderItsOwnTaskOnly = false
```

Cet état est normal après `VERIFIED`. Le runtime n'est pas migré vers une
`TASK-0026`, qui n'est pas créée.

## 6. Contrôles de fermeture

- `runArtifacts.test.ts` : **36/36 PASS**;
- tests Rust ciblés `map::commands::tests::` : **24/24 PASS**, **199 filtrés**;
- PowerShell : **34/34 refus**, **34 noms uniques**, X11 `TASK-0025` autorisée;
- parité exacte Rust / TypeScript / PowerShell : **PASS**;
- `git diff --check` : **PASS**;
- aucun chemin sous `docs/performance/runs/` modifié : **PASS**.

Aucun replay WebView2, SR15, DR15, J12, X11 ni campagne historique. Aucune
suite produit complète, aucun typecheck et aucun build Tauri ne sont rejoués :
la fermeture touche uniquement l'enregistrement du contrôle et les gardes X5.

## 7. État et action suivante

`ACTION-0042 = CLOSED`, `TASK-0025 = VERIFIED`, `SR1–SR15 = PASS`, sans réserve
corrective ouverte. L'action suivante unique est de rendre la main à
l'orchestrateur pour définir la prochaine tranche fonctionnelle après
`TASK-0025 VERIFIED`.
