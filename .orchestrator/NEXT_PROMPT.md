# NEXT_PROMPT — TASK-0029 / Scale Query Foundation — Bounded Hierarchy Paging

**TARGET_AGENT:** CLAUDE  
**STATUS:** READY  
**OWNER:** orchestrateur technique  
**TASK:** `TASK-0029 — Scale Query Foundation — Bounded Hierarchy Paging`  
**DECISION:** `DEC-0030 — Bounded Hierarchy Query Contract at Scale`  
**MODE:** fondation produit interne Rust/SQLite — aucune UX/materializer

## /goal

Implémenter la **première fondation de mise à l’échelle révélée par TASK-0028** avant tout progressive materializer produit : une lecture hiérarchique **réellement bornée et index-driven** pour les enfants directs, avec ordre déterministe, pagination keyset/cursor, invalidation honnête des curseurs après reconstruction, et une sémantique d’agrégat qui reste exacte sans CTE récursive coûteuse sur le hot path.

Le but n’est PAS d’implémenter `F-042`, `F-050` ou `F-051` dans l’UI. Le but est de rendre le futur materializer techniquement possible sans qu’une page de 100 enfants coûte proportionnellement à une fratrie de 250 000 éléments.

Le résultat de TASK-0028 à préserver : l’architecture « indexer grand, matérialiser petit » est structurellement plausible, mais les requêtes qui fabriquent la petite vue doivent elles-mêmes être bornées. `ACTION-0045` a fermé le spike avec cette réserve.

---

## 0 — synchronisation et branche

1. Appliquer `AGENTS.md` et tous les protocoles actifs du dépôt.
2. Branche de départ attendue : `build/v0.2-a12-synthetic-scale-spike`.
3. `git fetch origin`, puis fast-forward uniquement.
4. HEAD doit être le commit d’orchestration contenant ce fichier.
5. Son parent direct doit être exactement `0afb72fd271eacb4a42629b2566d5daa8633416b`.
6. `TASK-0028 = VERIFIED`, `ACTION-0045 = CLOSED`, `DEC-0029 = APPROVED`.
7. X5 = **36** et reste inchangé pendant TASK-0029.
8. `origin/main = 1a7d652ca48281c1687f6d1404c56a1404df91d8`; ne pas toucher `main`.
9. `TASK-0029` et `DEC-0030` doivent être libres.
10. Créer et publier : `build/v0.2-a13-scale-query-foundation`.
11. Arbre propre avant écriture.

Toute divergence : **STOP / BLOCKED**.

---

## 1 — gel documentaire AVANT le code

Créer et committer avant toute modification Rust :

- `docs/tasks/TASK-0029-scale-query-foundation.md`
- `docs/decisions/DEC-0030-bounded-hierarchy-query-contract.md`

La fiche tâche doit partir `APPROVED` puis `IN_PROGRESS` après le gel. La décision est approuvée par le présent GO de l’orchestrateur, mais ne doit pas prétendre qu’elle est vérifiée avant contrôle indépendant.

### DEC-0030 doit décider explicitement

**A. Ordre des enfants directs**  
Conserver la sémantique d’ordre déjà visible dans le code actuel :

1. dossiers avant les autres types;
2. `name COLLATE NOCASE`;
3. `id` comme tie-break déterministe.

Ne pas changer silencieusement l’ordre fonctionnel existant. Les collisions de nom/casse doivent rester déterministes.

**B. Pagination**  
Le chemin produit interne pour les enfants directs devient **keyset/cursor**, pas `OFFSET` pour la navigation progressive. Le curseur doit contenir/porter suffisamment d’information pour reprendre après la dernière ligne selon l’ordre ci-dessus.

**C. Cohérence du curseur**  
Un curseur appartient à une **révision d’index**. Après reconstruction/remplacement de l’index, un ancien curseur doit être rejeté explicitement comme périmé; il ne doit jamais continuer silencieusement dans un index différent.

Implémenter une révision monotone dans les métadonnées de l’index ou un mécanisme équivalent durable et testable. La publication d’un nouvel index/rebuild doit faire avancer cette révision atomiquement avec les données visibles.

**D. Sémantique d’agrégat pour le hot path**  
Le compte obligatoire et exact de `F-051` pour un agrégat hiérarchique représente les **enfants directs non matérialisés** sous un parent, par exemple :

> `249 857 enfants directs non matérialisés`

Ce nombre doit être exact. L’agrégat ne prétend PAS que ce nombre est le total de tous les descendants de ces branches.

Un éventuel `total descendants` exact peut exister plus tard comme information séparée **seulement s’il est pré-calculé/maintenu à coût raisonnable**. Il est interdit de rendre une CTE récursive sur tout le sous-arbre obligatoire dans le hot path du materializer.

Cette décision doit être cohérente avec `PROGRESSIVE_SCALE_ARCHITECTURE.md` : un agrégat est un résumé calculé, jamais un faux dossier ni une relation.

**E. Index SQL**  
Le schéma doit posséder un index capable de servir le filtre `parent_id` ET l’ordre d’affichage sans tri temporaire global. La forme exacte (index d’expression, colonne de rang, autre) est à choisir après inspection du schéma, mais elle doit être prouvée avec `EXPLAIN QUERY PLAN`.

Si le schéma ou `user_version` change, migration explicite et testée depuis la version courante. Aucune perte de `seen`, de nœuds ou de métadonnées.

---

## 2 — portée produit interne

Implémenter dans le cœur Rust/SQLite, **sans nouvelle commande Tauri ni changement UI**, les primitives nécessaires au futur materializer.

Au minimum, fournir une primitive interne équivalente à :

- lecture d’une page d’enfants directs bornée;
- ordre déterministe défini par DEC-0030;
- curseur de continuation keyset;
- total exact d’enfants directs du parent à coût O(1) ou équivalent indexé, en exploitant l’information durable déjà disponible lorsqu’elle est fiable;
- révision d’index permettant de détecter un curseur périmé;
- lecture de la chaîne d’ancêtres bornée par la profondeur, si elle n’existe pas déjà comme primitive produit interne réutilisable.

Les signatures finales sont à concevoir proprement dans le code existant; ne pas exposer un contrat IPC prématuré.

### Contraintes du curseur

- pas de chemin absolu;
- pas de donnée personnelle;
- pas de position `OFFSET` comme source de vérité;
- doit reprendre **strictement après** la dernière ligne déjà rendue;
- doit empêcher doublons et omissions quand plusieurs noms sont identiques ou diffèrent seulement par la casse;
- doit être rejeté si sa révision ne correspond plus à l’index courant.

### Total direct exact

Le `child_count` durable peut être utilisé si et seulement si TASK-0029 prouve qu’il est exact après indexation/reconstruction pour les fixtures couvertes. Ajouter les invariants/tests nécessaires. Ne pas recalculer `COUNT(*)` sur 250 000 enfants à chaque frame simplement pour obtenir un nombre que l’index possède déjà.

---

## 3 — ce qui est explicitement HORS TASK-0029

Ne pas implémenter :

- recherche FTS/trigram ou autre optimisation de `P-08` — **tranche suivante**;
- indexation/reconstruction en flux ou par lots — **tranche suivante**;
- watcher / `ReadDirectoryChangesExW` / USN;
- progressive materializer produit;
- repli/dépli/focus UI (`F-042`);
- `F-050` ou `F-051` comme capacité produit;
- renderer, React Flow, Sigma, ELK, Cytoscape, Pixi;
- Graphify;
- Forge dans le runtime;
- IA, LLM, cloud, RAG, embeddings;
- identité physique `F-046`;
- hash SHA-256 massif;
- nouvelle dépendance externe sans nécessité démontrée.

`MAX_NODES_PER_MAP = 5000` reste inchangé dans cette tâche.

---

## 4 — benchmark / preuve obligatoire

Réutiliser le banc synthétique de TASK-0028 quand utile, mais produire des artefacts TASK-0029 séparés et **non canoniques**.

Créer :

- `docs/performance/TASK-0029-SCALE-QUERY-REPORT.md`
- `docs/performance/runs/TASK-0029-SQF-100k.json`
- `docs/performance/runs/TASK-0029-SQF-1m-index.json`

Aucun de ces artefacts n’entre dans X5 pendant l’exécution.

### Corpus

- 100k : corpus synthétique/index existant ou reconstruit honnêtement avec le vrai schéma;
- 1M : `INDEX-SCALE` seulement, clairement nommé comme tel; ne pas créer 1M fichiers physiques.

### Cas de pagination

Sur le dossier large de chaque corpus, mesurer au moins :

- première page;
- page après un curseur situé dans une zone médiane;
- page après un curseur situé près de la fin;
- page vide après le dernier élément;
- page avec noms/casses en collision dans une fixture ciblée fonctionnelle.

Taille de page mesurée : **100**. Le code produit interne doit imposer un maximum fini documenté; ne jamais accepter une collection non bornée.

### Méthode

Pour les requêtes courtes : warm-up séparé puis au moins 21 runs; publier p50/p95/max.

Capturer `EXPLAIN QUERY PLAN` pour la requête d’enfants. Critères structurels obligatoires :

- l’index choisi est effectivement utilisé pour `parent_id` + ordre;
- **aucun `USE TEMP B-TREE FOR ORDER BY`** sur le chemin mesuré;
- pas de scan du corpus complet;
- pas d’`OFFSET` dans la requête produit de continuation.

### Critère de mise à l’échelle

Pour une page de 100, à position comparable et après warm-up :

> le p95 à 1M ne doit pas être supérieur à **5×** le p95 à 100k.

Ce seuil est un **critère d’ingénierie de TASK-0029**, pas une promesse produit. S’il échoue, ne pas déplacer le seuil : documenter le FAIL/BLOCKED.

Le spike TASK-0028 avait ~11 ms à 100k et ~106 ms à 1M avec l’ancienne requête. L’objectif de TASK-0029 est de supprimer cette croissance quasi linéaire structurelle, pas de publier un temps marketing.

---

## 5 — tests fonctionnels obligatoires

Couvrir au minimum :

1. dossier vide;
2. un seul enfant;
3. mélange dossier/fichier/skipped selon les types réellement permis;
4. noms identiques;
5. noms qui ne diffèrent que par casse;
6. plusieurs pages successives : aucun doublon, aucune omission;
7. reprise à partir du curseur exact de la dernière ligne;
8. curseur après dernière ligne → page vide honnête;
9. curseur d’une autre révision → erreur explicite `stale`/équivalente;
10. reconstruction complète → révision augmente;
11. `child_count` durable = compte SQL réel pour fixtures 10k/100k et tests ciblés;
12. migration depuis le schéma/version courante si schéma modifié;
13. état `seen` préservé après migration/rebuild comme avant;
14. deux index/cerveaux indépendants ne partagent ni révision ni curseur;
15. aucune collection non bornée vers le frontend ou une commande produit.

Le test doit prouver l’ordre exact défini par DEC-0030.

---

## 6 — validations globales

À la fin :

- tests Rust ciblés;
- `cargo test --lib` complet;
- `pnpm test` complet;
- `pnpm check`;
- `pnpm build`;
- `cargo build`;
- `git diff --check`;
- X5 toujours exactement 36 et anciens artefacts protégés inchangés;
- `origin/main` toujours `1a7d652ca48281c1687f6d1404c56a1404df91d8`.

Aucun replay WebView2 n’est requis : TASK-0029 ne modifie aucune UI ni aucun renderer.

---

## 7 — documentation / état

Mettre à jour :

- `docs/tasks/TASK-0029-scale-query-foundation.md`;
- `docs/decisions/DEC-0030-bounded-hierarchy-query-contract.md`;
- `docs/performance/TASK-0029-SCALE-QUERY-REPORT.md`;
- `docs/ai/CURRENT_STATE.md`;
- `docs/ai/NEXT_ACTION.md`;
- `docs/ai/HANDOFF.md`;
- `docs/ai/VALIDATION.md`;
- `docs/ai/CHANGELOG_AI.md`;
- `.orchestrator/RESULT.md`.

Ne pas modifier les quatre JSON TASK-0028 ni leurs chiffres.

Les mesures TASK-0029 restent `ENGINEERING_MEASUREMENT / NOT A PRODUCT CLAIM / NONCANONICAL UNTIL INDEPENDENT CONTROL`.

### États finaux exécuteur

- `TASK-0029 = IMPLEMENTED`, jamais `VERIFIED`;
- `DEC-0030 = APPROVED`, avec mention que son implémentation TASK-0029 attend contrôle indépendant;
- `F-042 = PROPOSED / MVP`;
- `F-050 = PROPOSED / MVP/P0`;
- `F-051 = PROPOSED / MVP/P0`, sémantique de compte clarifiée par DEC-0030 mais capacité produit non implémentée;
- X5 = 36;
- aucune `TASK-0030` / `DEC-0031` créée.

`NEXT_ACTION.md` doit contenir **une seule action : contrôle indépendant de TASK-0029**.

---

## 8 — RESULT.md

Écrire :

```text
TASK_ID: TASK-0029 — Scale Query Foundation — Bounded Hierarchy Paging
AGENT: CLAUDE
RESULT: DONE | BLOCKED | FAILED
BRANCH: build/v0.2-a13-scale-query-foundation
FINAL_HEAD: <commit substantif>

SUMMARY:
-

VALIDATIONS:
-

PERFORMANCE_EVIDENCE:
-

IMPORTANT_FILES:
-

COMMIT:
PUSHED: yes/no

LIMITS_OR_BLOCKERS:
-

NEXT_ORCHESTRATOR_DECISION:
- independent control of TASK-0029
```

---

## 9 — Git final

Commit/push uniquement sur `build/v0.2-a13-scale-query-foundation`.

Interdits : merge, PR, release, tag, main, force push, réécriture d’historique, nouveau renderer, nouvelle UX, TASK-0030, DEC-0031.
