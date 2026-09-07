# NEXT_PROMPT — TASK-0028 / contrôle indépendant du scale spike

**TARGET_AGENT:** CODEX  
**STATUS:** READY  
**OWNER:** orchestrateur technique indépendant  
**TASK:** `TASK-0028 — Synthetic Scale Feasibility Spike`  
**MODE:** enregistrer le verdict externe et fermer le spike — AUCUNE implémentation produit

> Le verdict ci-dessous a déjà été rendu par l’orchestrateur technique indépendant après inspection de la branche, du diff, du protocole gelé, du harness test-only, du rapport et des quatre artefacts de mesure. Codex ne rend pas ce verdict et ne s’attribue pas `VERIFIED`; il l’enregistre seulement.

## /goal

Fermer proprement `TASK-0028` comme **spike d’architecture vérifié**, sans transformer ses mesures en promesses produit et sans démarrer la tranche d’implémentation suivante.

Verdict externe à enregistrer :

- `TASK-0028 = VERIFIED` **comme preuve de faisabilité architecturale / benchmark synthétique**, pas comme validation de performance produit;
- `DEC-0029` reste `APPROVED`;
- le critère structurel principal « à budget fixe, la cardinalité rendable ne croît pas proportionnellement au corpus » = **PASS au niveau du harness/core**;
- aucune capacité produit `F-042`, `F-050` ou `F-051` n’est implémentée par TASK-0028; leurs états restent `PROPOSED`;
- aucune réserve corrective bloquante sur la livraison du spike;
- les limites ci-dessous restent explicites et empêchent toute affirmation « FileTopo supporte 1M » ou « validé sur machine modeste ».

## 0 — synchronisation obligatoire

1. Appliquer les protocoles du dépôt.
2. Branche attendue : `build/v0.2-a12-synthetic-scale-spike`.
3. `git fetch origin`, puis fast-forward uniquement.
4. HEAD doit être le commit d’orchestration contenant ce fichier.
5. Son parent direct doit être exactement `db117fa57cc5f1997d4cd1aec657a281ea35c1c9`.
6. Commit substantif TASK-0028 : `66855a12b63ccbffbb2567fa09dc42c6194e3fdd`.
7. Commit de gel protocole : `ae25670819c4332a2c76959a7558e59114b98aad`, parent direct `670704dbe563c77bd71d5f353139a78a46779881`.
8. `TASK-0028 = IMPLEMENTED`, jamais auto-VERIFIED avant cette fermeture.
9. X5 = **36**, inchangé.
10. `origin/main = 1a7d652ca48281c1687f6d1404c56a1404df91d8`.
11. `ACTION-0045` libre.
12. Aucune `TASK-0029` / `DEC-0030` précréée.

Toute divergence : STOP / BLOCKED.

## 1 — enregistrer ACTION-0045

Créer :

`docs/reviews/ACTION-0045-independent-control.md`

Le document doit préciser :

- Claude Code était l’exécuteur de TASK-0028;
- Codex est seulement le rédacteur de l’enregistrement du verdict;
- le protocole a été gelé dans un commit séparé **avant** le harness;
- contrôle indépendant fondé sur le diff, le protocole, le code test-only, le rapport et les quatre artefacts;
- aucun benchmark n’est requalifié en promesse produit.

### Verdicts à enregistrer

**Identité / périmètre**
- branche a12 descend exactement du commit d’orchestration;
- gel protocole `ae25670...` avant harness : PASS;
- harness isolé derrière `#[cfg(test)]`; les seuls ajouts hors module sont `#[cfg(test)] mod scale_spike;` et `Index::connection_for_bench()` : PASS;
- aucune commande Tauri, route ou UX normale ajoutée : PASS;
- `MAX_NODES_PER_MAP = 5000` inchangé : PASS;
- aucun état F-042/F-050/F-051 changé : PASS;
- X5 = 36 et main inchangé : PASS.

**Mesures**
- SCAN-SCALE physique 10k : mesuré, cardinalité exacte, source inchangée;
- SCAN-SCALE physique 100k : mesuré, cardinalité exacte, source inchangée;
- INDEX-SCALE 1M : réellement construit/interrogé, mais **ce n’est pas un scan physique 1M**;
- P-08 100k : vraie requête de production, pagination et exactitude vérifiées;
- prototype borné aux budgets 128/256/512/1024 sur 10k/100k/1M : exécuté;
- `SS9` cardinalité bornée : PASS au niveau harness/core;
- layout appliqué à la vue bornée seulement : PASS;
- WebView2 réel : exécuté mais **PARTIEL**;
- chemin sans GPU puissant : **NOT PROVEN**.

**Constat structurel indépendant**
À budget 1024, focus racine :
- 10k → 1024 entités / 1023 arêtes;
- 100k → 1024 / 1023;
- 1M INDEX-SCALE → 1024 / 1023.
Le payload et le layout restent bornés par la vue, pas par le corpus. Les artefacts portent `accountingExact=true`, `aggregateInvariantBreaches=0` et la comparaison couvre les budgets/focus prévus.

### Résultats négatifs à préserver comme résultats utiles

Ne pas les présenter comme bugs de TASK-0028 : le spike avait précisément pour rôle de les découvrir.

- `Index::replace_nodes(&[NodeDto])` impose le corpus en mémoire; ~335 Mio observés à 1M sur ce banc;
- `Index::query_nodes` est linéaire : ~67 ms p50 à 100k, ~0,67 s p50 à 1M, en **debug**;
- page de 100 enfants directs ~106 ms à 1M avec l’ordre actuel;
- compte récursif exact d’un agrégat ~1,34 s à 1M;
- ancêtres restent plats (~43 µs), preuve qu’une requête réellement bornée est possible.

Ces chiffres restent des **mesures d’ingénierie de ce banc**, pas des objectifs ni promesses.

## 2 — réserves obligatoires du verdict

ACTION-0045 et les docs de clôture doivent conserver explicitement :

1. **Banc hors classe d’acceptation** : i9-9900K / ~32 Gio / RTX 2070 = `DEVELOPMENT_BENCH_NOT_ACCEPTANCE`. La contrainte « machine modeste » reste NON VALIDÉE.
2. **1M physique NON PROUVÉ** : 1M est INDEX-SCALE seulement.
3. **Composition index→materializer→frontend NON TESTÉE bout-en-bout** : aucune nouvelle commande produit n’a été ajoutée.
4. **SS7 PARTIEL** : WebView2 réel a mesuré 12 / 157 entités; les budgets 256/512/1024 n’ont pas été mesurés dans WebView2.
5. **SS8 NOT PROVEN** : les arguments `--disable-gpu` ont été demandés mais leur application n’est pas confirmable honnêtement.
6. **Temps Rust en debug seulement** : les nombres de durée ne sont pas une baseline release.
7. **Voisinage relationnel non mesuré** dans SS4, store incompatible à cette couche.
8. Le test `boundedViewCardinality.test.tsx` établit seulement la cardinalité DOM/SVG sous jsdom. Son `hiddenCount` local n’est pas injecté dans `MapView`; ne jamais utiliser ce test comme preuve de sémantique F-051 ni de composition bout-en-bout. Ce point est une réserve non bloquante, car la sémantique d’agrégat est testée séparément dans le harness Rust et le rapport limite déjà jsdom à la cardinalité.
9. La dette préexistante de chemins locaux personnels déjà présente dans d’anciens docs reste hors scope; TASK-0028 n’en ajoute pas.

## 3 — décision X5

**Ne pas étendre X5 dans cette fermeture.**

Raison du verdict indépendant : les quatre JSON TASK-0028 sont des mesures d’ingénierie utiles mais :
- banc non `TARGET_CLASS`;
- SS7 partiel;
- SS8 NOT PROVEN;
- composition bout-en-bout non prouvée.

Ils restent **non canoniques et non protégés** comme prévu par le protocole. La future preuve d’acceptation sur machine modeste pourra utiliser de nouveaux artefacts dédiés sans confondre les deux niveaux de preuve.

Donc :
- `PROTECTED_RUN_ARTIFACTS` inchangé;
- aucune garde Rust/TS/PowerShell modifiée;
- aucun JSON TASK-0028 modifié, renommé ou supprimé;
- X5 reste exactement 36.

## 4 — clôture documentaire uniquement

Mettre à jour uniquement ce qui est nécessaire :

- `docs/reviews/ACTION-0045-independent-control.md` — créer;
- `docs/tasks/TASK-0028-synthetic-scale-feasibility-spike.md` → `VERIFIED`, référence ACTION-0045;
- `docs/performance/TASK-0028-SCALE-SPIKE-REPORT.md` → ajouter le statut de contrôle indépendant sans réécrire les mesures;
- `docs/ai/CURRENT_STATE.md`;
- `docs/ai/NEXT_ACTION.md`;
- `docs/ai/HANDOFF.md`;
- `docs/ai/VALIDATION.md`;
- `docs/ai/CHANGELOG_AI.md`;
- `.orchestrator/RESULT.md`.

Ne modifier aucun fichier sous :
- `src/`;
- `src-tauri/`;
- `scripts/`;
- `docs/performance/runs/`.

Ne créer ni TASK-0029 ni DEC-0030.

## 5 — état produit à conserver

- `DEC-0029 = APPROVED`;
- `F-042 = PROPOSED / MVP`;
- `F-050 = PROPOSED / MVP/P0`;
- `F-051 = PROPOSED / MVP/P0`;
- `F-046 = PROPOSED`;
- `F-047 = DEFERRED`;
- Graphify = `NOT INTEGRATED`;
- Forge distinct;
- aucun renderer choisi;
- `MAX_NODES_PER_MAP = 5000` encore en vigueur;
- `R8` entière;
- identité physique DEC-0013/F toujours bloquée;
- X10 hors Windows toujours non prouvée race-safe.

## 6 — prochaine décision, sans la prendre

`NEXT_ACTION.md` doit rendre la main à l’orchestrateur.

Il doit consigner que le spike recommande de traiter **avant le materializer produit** les fondations qui dominent le coût :

- ordre/pagination des enfants compatible avec un index SQLite;
- sémantique du compte d’agrégat : enfants directs exacts vs total de sous-arbre exact/précalculé;
- stratégie de recherche indexée avant toute promesse au-delà de 100k;
- indexation/reconstruction en flux ou par lots au lieu d’un `&[NodeDto]` global;
- puis seulement materializer/F-042/F-050/F-051 et choix d’un budget candidat;
- replay ultérieur sur une vraie machine `TARGET_CLASS` avant toute promesse « machine modeste ».

**Ne pas créer ces tâches dans cette fermeture.**

## 7 — validations de fermeture

- `git diff --check`;
- diff de fermeture documentaire seulement;
- ACTION-0045 lié correctement;
- X5 toujours 36;
- aucun JSON de mesure modifié;
- `origin/main` toujours `1a7d652c...`;
- aucune TASK-0029 / DEC-0030;
- aucune formulation « supporte 1M », « validé machine modeste », « F-050 implémentée » ou équivalente.

Aucun nouveau benchmark, aucun WebView2 replay, aucun test produit requis pour cette fermeture.

## 8 — RESULT.md

Écrire :

```text
TASK_ID: TASK-0028 — VERIFIED / synthetic scale feasibility spike
AGENT: CODEX
RESULT: DONE | BLOCKED | FAILED
BRANCH: build/v0.2-a12-synthetic-scale-spike
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
- development bench is not TARGET_CLASS
- 1M physical scan not proven
- end-to-end index→frontend composition not proven
- SS7 partial
- SS8 NOT PROVEN
- release timing baseline unavailable
- F-042/F-050/F-051 remain PROPOSED

NEXT_ORCHESTRATOR_DECISION:
- choose next scale-foundation slice before product materializer
```

## 9 — Git final

Commit/push uniquement sur `build/v0.2-a12-synthetic-scale-spike`.

Interdits : merge, PR, release, tag, main, force push, réécriture d’historique, nouvelle mesure, code produit, TASK-0029, DEC-0030.
