# NEXT_PROMPT — ACTION-0046 / Fermeture indépendante de TASK-0029

**TARGET_AGENT:** CODEX  
**STATUS:** READY  
**OWNER:** orchestrateur technique  
**MODE:** enregistrement documentaire uniquement — aucun code, aucun benchmark  
**TASK:** `TASK-0029 — Scale Query Foundation — Bounded Hierarchy Paging`  
**ACTION:** `ACTION-0046 — Contrôle indépendant de TASK-0029`

## /goal

Enregistrer dans le dépôt le **verdict indépendant déjà rendu par l’orchestrateur** après audit de la branche `build/v0.2-a13-scale-query-foundation`.

Le verdict externe est :

> **TASK-0029 = VERIFIED — PASS dans sa portée exacte de fondation Rust/SQLite et mesure d’ingénierie non produit.**

Tu ne rends pas ce verdict toi-même et tu ne t’attribues pas `VERIFIED`. Tu ne fais que l’enregistrer proprement, comme lors des fermetures précédentes.

Aucun code produit ne doit changer. Aucun benchmark ne doit être relancé. Aucun JSON de preuve ne doit être modifié.

---

## 0 — synchronisation obligatoire

1. Appliquer `AGENTS.md` et les protocoles actifs du dépôt.
2. Branche attendue : `build/v0.2-a13-scale-query-foundation`.
3. `git fetch origin`, puis fast-forward uniquement.
4. Le parent direct du commit d’orchestration courant doit être exactement :
   `aa1b91209a5fcc64b7d116829160047a7d2ccac4`.
5. Le commit substantif TASK-0029 reste :
   `d8f3dbff2c6127352518b33f1ac7650c1652a23b`.
6. `origin/main` doit rester :
   `1a7d652ca48281c1687f6d1404c56a1404df91d8`.
7. Arbre propre avant écriture.
8. `ACTION-0046` doit être libre avant création.
9. Ne pas créer `TASK-0030`, `DEC-0031`, branche suivante, PR, merge, tag ou release.

Toute divergence : **STOP / BLOCKED**.

---

## 1 — verdict indépendant à enregistrer

Créer :

- `docs/reviews/ACTION-0046-independent-control.md`

Le document doit indiquer clairement :

- `ACTION-0046 = CLOSED`;
- `TASK-0029 = VERIFIED`;
- exécuteur de TASK-0029 : **Claude Code**;
- rédacteur de l’enregistrement : **Codex**;
- autorité du verdict : **orchestrateur technique indépendant**;
- Codex n’a pas rendu le verdict et ne s’attribue pas la vérification.

### Verdict technique à conserver exactement dans sa portée

Le contrôle indépendant accepte TASK-0029 parce que :

1. la lecture des enfants directs est désormais bornée et index-driven;
2. l’ordre fonctionnel reste dossiers d’abord, `name COLLATE NOCASE`, puis `id`;
3. la continuation utilise un curseur/keyset, pas `OFFSET`;
4. le curseur est lié à l’index, à sa révision et au parent et refuse les curseurs périmés/étrangers;
5. `idx_nodes_child_order` sert le filtre et l’ordre;
6. le plan mesuré n’utilise aucun `USE TEMP B-TREE FOR ORDER BY`, aucun scan complet du corpus et aucun `OFFSET` sur la continuation;
7. le compte exact d’enfants directs utilise `child_count`, audité à zéro désaccord dans les campagnes;
8. la migration `user_version 2 -> 3` est testée sans perte de nœuds, métadonnées ou état `seen`;
9. la campagne d’ingénierie respecte le critère `p95(1M) <= 5 × p95(100k)`, pire ratio déclaré `2.30`;
10. aucune UI, commande Tauri, IPC, materializer, renderer, dépendance produit ni `MAX_NODES_PER_MAP` n’a été modifié par TASK-0029.

### Limites qui DOIVENT rester visibles

Ne jamais transformer ces résultats en promesse produit :

- benchmark `DEVELOPMENT_BENCH_NOT_ACCEPTANCE`;
- timings Rust en debug;
- 1M = `INDEX-SCALE`, pas 1M fichiers physiques;
- corpus synthétique de forme limitée;
- aucun test bout-en-bout index -> vue -> frontend;
- `Index::replace_nodes` tient encore le corpus en mémoire (~189 Mo déclaré à 1M);
- recherche `P-08` encore linéaire et inchangée;
- aucun résultat de machine modeste / TARGET_CLASS;
- aucune capacité produit `F-042`, `F-050` ou `F-051` implémentée par cette tâche.

Le point important : **TASK-0029 vérifie une fondation de requête, pas la V1 et pas le million d’éléments comme capacité commerciale.**

---

## 2 — artefacts et X5

Les deux JSON TASK-0029 restent **non canoniques et non protégés** :

- `docs/performance/runs/TASK-0029-SQF-100k.json`
- `docs/performance/runs/TASK-0029-SQF-1m-index.json`

Interdictions absolues :

- ne pas les régénérer;
- ne pas les modifier;
- ne pas les renommer;
- ne pas les supprimer;
- ne pas les ajouter à X5.

Les quatre JSON TASK-0028 restent eux aussi inchangés.

**X5 reste exactement 36.**

---

## 3 — mises à jour documentaires autorisées

Mettre à jour uniquement ce qui est nécessaire pour fermer proprement la tâche :

- `docs/tasks/TASK-0029-scale-query-foundation.md` -> `VERIFIED` avec référence à ACTION-0046;
- `docs/decisions/DEC-0030-bounded-hierarchy-query-contract.md` -> garder `APPROVED`, mais indiquer que son implémentation dans TASK-0029 a passé le contrôle indépendant;
- `docs/ai/CURRENT_STATE.md`;
- `docs/ai/NEXT_ACTION.md`;
- `docs/ai/HANDOFF.md`;
- `docs/ai/VALIDATION.md`;
- `docs/ai/CHANGELOG_AI.md`;
- `.orchestrator/RESULT.md`;
- créer `docs/reviews/ACTION-0046-independent-control.md`.

Ne modifier aucun fichier sous :

- `src/`;
- `src-tauri/`;
- `scripts/`;
- `graph/`;
- `docs/performance/runs/`.

Ne modifier aucune mesure numérique de TASK-0029.

---

## 4 — état produit après fermeture

La fermeture doit laisser explicitement :

- `TASK-0029 = VERIFIED`;
- `ACTION-0046 = CLOSED`;
- `DEC-0030 = APPROVED`, implémentation contrôlée;
- `F-042 = PROPOSED / MVP`;
- `F-050 = PROPOSED / MVP / P0`;
- `F-051 = PROPOSED / MVP / P0`;
- `F-046 = PROPOSED`;
- `F-047 = DEFERRED`;
- `MAX_NODES_PER_MAP = 5000` inchangé;
- Graphify `NOT INTEGRATED`;
- aucun nouveau renderer;
- X5 = 36;
- `origin/main` inchangé.

`NEXT_ACTION.md` doit contenir une seule action :

> **Retour à l’orchestrateur pour ouvrir la prochaine tranche V1 de convergence du pipeline réel.**

Ne pas nommer ni créer la prochaine TASK; l’orchestrateur la gère après vérification de cette fermeture.

---

## 5 — validations de fermeture

Exécuter uniquement les contrôles documentaires/structurels nécessaires :

- `git diff --check`;
- vérifier que le diff de fermeture ne touche aucun code produit;
- vérifier que rien sous `docs/performance/runs/` n’a changé;
- vérifier X5 = 36;
- vérifier `origin/main` inchangé;
- vérifier les liens relatifs des documents modifiés/créés;
- vérifier absence de `TASK-0030` et `DEC-0031`.

**Ne pas relancer** :

- campagne TASK-0029;
- WebView2;
- benchmark;
- tests complets Rust/TS déjà couverts par la tâche, sauf si une validation documentaire existante du dépôt les exige réellement — dans ce cas STOP et explique plutôt que de modifier la portée.

---

## 6 — RESULT.md

Écrire :

```text
TASK_ID: ACTION-0046 — Independent closure of TASK-0029
AGENT: CODEX
RESULT: DONE | BLOCKED | FAILED
BRANCH: build/v0.2-a13-scale-query-foundation
FINAL_HEAD: <commit de fermeture>

SUMMARY:
- recorded external independent PASS
- TASK-0029 -> VERIFIED
- ACTION-0046 -> CLOSED

VALIDATIONS:
-

FILES_CHANGED:
-

CODE_OR_EVIDENCE_CHANGED: no
X5: 36
MAIN_UNCHANGED: yes/no

COMMIT:
PUSHED: yes/no

LIMITS_OR_BLOCKERS:
-

NEXT_ORCHESTRATOR_DECISION:
- open the V1 pipeline-convergence slice
```

---

## 7 — Git final

Commit/push uniquement sur `build/v0.2-a13-scale-query-foundation`.

Interdits : merge, PR, main, release, tag, force push, code produit, benchmarks, JSON de preuve, nouvelle tâche, nouvelle décision, nouveau renderer.