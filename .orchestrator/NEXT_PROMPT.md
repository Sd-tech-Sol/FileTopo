# NEXT_PROMPT — TASK-0027 / contrôle indépendant documentaire

**TARGET_AGENT:** CODEX  
**STATUS:** READY  
**OWNER:** orchestrateur technique indépendant  
**TASK:** `TASK-0027 — Progressive Scale Architecture Realignment`  
**MODE:** enregistrer le verdict externe et fermer la tranche documentaire — AUCUNE implémentation produit

> Le verdict ci-dessous a déjà été rendu par l’orchestrateur technique indépendant après inspection de la branche, du diff, des trois nouveaux documents et des documents produit amendés. Codex ne rend pas ce verdict et ne s’attribue pas `VERIFIED`; il l’enregistre seulement.

## /goal

Enregistrer le contrôle indépendant de `TASK-0027` et fermer proprement la tranche documentaire.

Verdict externe à enregistrer :

- `TASK-0027 = VERIFIED`;
- `DEC-0029` reste `APPROVED` comme décision produit/architecture, maintenant contrôlée indépendamment sur sa cohérence documentaire;
- **aucune performance 10k / 100k / 1M n’est vérifiée ni promise**;
- **aucune capacité F-042, F-050 ou F-051 n’est implémentée par TASK-0027** : leurs états produit restent `PROPOSED`; seule la classification MVP/P0 et la frontière d’architecture sont approuvées;
- aucune réserve corrective bloquante ouverte.

Constats indépendants contrôlés :

1. Branche livrée `build/v0.2-a11-progressive-scale-architecture`, HEAD exécuteur terminal `b35e9813b121fdfdde1e35bc5249d1fb7cf8fb68`, commit substantif `beef152f2474b04b1f8147434947165bc4eba8c6`, base d’orchestration `b5809424bfa5c34f956dbe76c0b96777b84dc5fa`.
2. Diff base → livraison : **15 fichiers seulement**, tous documentaires / orchestration. Aucun changement sous `src/`, `src-tauri/`, `scripts/`, `graph/` ou `docs/performance/runs/`.
3. `TASK-0027` est bien `IMPLEMENTED — contrôle indépendant requis` avant cette fermeture et n’auto-attribue pas VERIFIED.
4. `DEC-0029` enregistre correctement la frontière : **corpus, graphe logique, vue matérialisée et rendu sont quatre plans distincts**; `1 indexé = 1 accessible`, pas `1 rendu`; `MAX_NODES_PER_MAP = 5000` est requalifié en limite historique sans modifier le code.
5. `PROGRESSIVE_SCALE_ARCHITECTURE.md` fige la chaîne : source read-only → index complet local → graphe logique → query engine borné → progressive materializer → sous-graphe/agrégats → layout de la vue → renderer borné.
6. `F-042` est promue `ULTÉRIEUR → MVP` pour devenir primitive de navigation **et** de performance; sa valeur historique reste visible.
7. `F-050` (matérialisation progressive/vue bornée) et `F-051` (agrégats/méta-nœuds exacts) existent, sont `MVP/P0`, mais restent **PROPOSED / non implémentées**. `F-051` reste la contrepartie de véracité de `F-050`.
8. La matrice passe de 49 à 51 fonctions, `F-001` à `F-051` sans trou ni doublon; aucune fonction ne descend; `F-047` reste DEFERRED; `F-046` reste PROPOSED; F-043/F-044/F-045 conservent leur historique vérifié.
9. `P-SCALE-R1` amende visiblement P-01/P-02/P-03, conserve leurs formulations d’origine et maintient le contrat à 22 exigences; P-08 reste entière et devient le pilier du futur scale spike.
10. Graphify est explicitement **NOT INTEGRATED** : aucune dépendance, aucun runtime, aucun adaptateur ni roadmap d’intégration. Les idées utiles restent des enseignements seulement.
11. Forge reste un projet entièrement distinct de FileTopo.
12. Aucun renderer final n’est choisi; React Flow, ELK, Sigma, Cytoscape et Pixi restent candidats futurs à benchmarker. Le fonctionnement de base ne dépend ni d’un GPU puissant ni de WebGL.
13. Hachage lourd = campagne explicite/arriére-plan/périmètre sélectionnable; pas de hash automatique d’un cerveau d’un million de fichiers à l’ouverture.
14. 10k/100k/1M sont explicitement des **cibles futures non mesurées**. Aucun chiffre n’est présenté comme performance acquise.
15. Roadmap proposée : scale spike → progressive materializer/budget/F-042/F-050/F-051 → recherche/filtres/watchers/incrémental → permissions/équipe → finition visuelle moderne en étape B. La tranche design reste explicitement prévue avec design system local, skills/adapters Claude/Codex, prototypes comparés et benchmark des renderers.
16. X5 reste **36**, inchangé; aucun JSON de preuve touché.
17. `origin/main` reste `1a7d652ca48281c1687f6d1404c56a1404df91d8`, non touché.
18. `ACTION-0044` est libre; aucune `TASK-0028` n’existe sur la branche livrée.

L’écart préexistant `docs/decisions/README.md` qui n’indexe déjà pas DEC-0024 à DEC-0028 n’est **pas** à réparer partiellement dans cette fermeture. Le signaler comme dette documentaire non bloquante si nécessaire.

---

## 0 — synchronisation obligatoire

1. Appliquer les protocoles du dépôt.
2. Branche attendue : `build/v0.2-a11-progressive-scale-architecture`.
3. `git fetch origin`, puis fast-forward uniquement.
4. HEAD doit être le commit d’orchestration contenant ce fichier.
5. Son parent direct doit être exactement `b35e9813b121fdfdde1e35bc5249d1fb7cf8fb68`.
6. Le commit substantif de TASK-0027 doit rester `beef152f2474b04b1f8147434947165bc4eba8c6`.
7. X5 = 36.
8. `origin/main = 1a7d652ca48281c1687f6d1404c56a1404df91d8`.
9. `ACTION-0044` libre.
10. Aucun `TASK-0028` / `DEC-0030` précréé.

Si divergence : STOP / BLOCKED.

---

## 1 — enregistrer ACTION-0044

Créer :

`docs/reviews/ACTION-0044-independent-control.md`

Le document doit préciser :

- verdict rendu par l’orchestrateur technique indépendant;
- Claude Code était l’exécuteur de TASK-0027;
- Codex est seulement le rédacteur de l’enregistrement;
- ni Claude ni Codex ne s’auto-attribuent VERIFIED;
- contrôle documentaire uniquement, car TASK-0027 ne touche aucun code.

Verdict à enregistrer :

- cohérence architecture / vision / roadmap / parité / matrice : **PASS**;
- frontière `indexe grand, matérialise petit` : **PASS**;
- promotion F-042 et ajouts F-050/F-051 : **PASS**;
- Graphify NOT INTEGRATED / Forge distinct : **PASS**;
- statut non mesuré de 10k/100k/1M : **PASS**;
- absence de code/runtime/proof changes : **PASS**;
- X5=36 et main inchangé : **PASS**;
- `ACTION-0044 = CLOSED`;
- `TASK-0027 = VERIFIED`;
- aucune réserve corrective bloquante.

Ne transformer **aucune** cible d’architecture en affirmation de performance.

---

## 2 — aucun X5, aucune preuve runtime

TASK-0027 est documentaire :

- ne pas modifier `PROTECTED_RUN_ARTIFACTS`;
- ne pas modifier les gardes Rust/TS/PowerShell;
- ne pas écrire, modifier, renommer ou supprimer quoi que ce soit sous `docs/performance/runs/`;
- ne lancer aucun WebView2 replay;
- ne créer aucune preuve canonique;
- X5 reste exactement **36**.

---

## 3 — clôture documentaire

Mettre à jour seulement ce qui est nécessaire pour enregistrer le contrôle :

- `docs/reviews/ACTION-0044-independent-control.md`;
- `docs/tasks/TASK-0027-progressive-scale-architecture-realignment.md` → `VERIFIED`, référence ACTION-0044;
- `docs/decisions/DEC-0029-progressive-materialization-and-scale-boundary.md` → ajouter le contrôle indépendant, **statut décision toujours APPROVED**;
- `docs/architecture/PROGRESSIVE_SCALE_ARCHITECTURE.md` → retirer « en attente de contrôle indépendant » et indiquer contrôle ACTION-0044, tout en conservant explicitement `non testé / non mesuré / non implémenté`;
- `docs/ai/CURRENT_STATE.md`;
- `docs/ai/NEXT_ACTION.md`;
- `docs/ai/HANDOFF.md`;
- `docs/ai/VALIDATION.md`;
- `docs/ai/CHANGELOG_AI.md`;
- `.orchestrator/RESULT.md`.

`FEATURE_MATRIX.md`, `REQUIREMENTS_BASELINE.md`, `CARTETOPO_FUNCTIONAL_PARITY.md`, `PROJECT_VISION.md` et `ROADMAP.md` ne doivent être modifiés **que si une référence minimale au contrôle est strictement nécessaire**. Ne pas réécrire les décisions déjà correctes.

Conserver explicitement :

- F-042 = PROPOSED, classification MVP;
- F-050 = PROPOSED, MVP/P0;
- F-051 = PROPOSED, MVP/P0;
- F-046 = PROPOSED;
- F-047 = DEFERRED;
- Graphify NOT INTEGRATED;
- Forge distinct;
- 10k/100k/1M non mesurés;
- aucun renderer choisi;
- design moderne toujours futur étape B;
- DEC-0013/F bloquante pour identité physique;
- X10 hors Windows non prouvée race-safe;
- R8 entière.

`NEXT_ACTION.md` rend la main à l’orchestrateur pour décider si le **scale spike** devient TASK-0028. **Ne pas créer TASK-0028 ni DEC-0030.**

---

## 4 — validations de fermeture

Validations documentaires seulement :

- `git diff --check`;
- vérifier que le diff de fermeture ne touche aucun fichier sous `src/`, `src-tauri/`, `scripts/`, `graph/`, `docs/performance/runs/`;
- X5 toujours 36;
- `origin/main` toujours `1a7d652c...`;
- aucune TASK-0028 / DEC-0030 créée;
- liens du nouveau ACTION-0044 valides;
- aucun statut de performance inventé.

Aucune suite produit, aucun build Tauri, aucun benchmark, aucun replay WebView2 requis.

---

## 5 — RESULT.md

Écrire :

```text
TASK_ID: TASK-0027 — VERIFIED / contrôle documentaire
AGENT: CODEX
RESULT: DONE | BLOCKED | FAILED
BRANCH: build/v0.2-a11-progressive-scale-architecture
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
- performance 10k/100k/1M remains unmeasured
- F-042/F-050/F-051 remain unimplemented / PROPOSED
- Graphify remains NOT INTEGRATED
- F-046 physical identity remains blocked by DEC-0013/F
- non-Windows X10 race-safe guarantee remains unproven

NEXT_ORCHESTRATOR_DECISION:
- decide whether to open TASK-0028 as the synthetic scale spike
```

---

## 6 — Git final

Commit/push uniquement sur `build/v0.2-a11-progressive-scale-architecture`.

Interdits : merge, PR, release, tag, main, force push, réécriture d’historique, benchmark, code produit, création de TASK-0028/DEC-0030.
