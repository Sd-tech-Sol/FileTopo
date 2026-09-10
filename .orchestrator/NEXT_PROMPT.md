# NEXT_PROMPT — ACTION-0047 / Fermeture indépendante de TASK-0030

**TARGET_AGENT:** CLAUDE  
**STATUS:** READY  
**OWNER:** orchestrateur technique  
**MODE:** fermeture documentaire uniquement — aucun code produit, aucun benchmark  
**TASK:** `TASK-0030 — V1 Pipeline Convergence — Canonical Brain Index and Bounded Runtime Projection`  
**ACTION:** `ACTION-0047 — Contrôle indépendant de TASK-0030`

## /goal

Enregistrer dans le dépôt le **verdict indépendant déjà rendu par l’orchestrateur** après inspection de la livraison `TASK-0030` sur `build/v0.2-a14-v1-pipeline-convergence`.

Verdict externe à enregistrer :

> **TASK-0030 = VERIFIED — PASS dans sa portée exacte de convergence V1 synthétique : un seul index canonique par cerveau, projection runtime bornée, layout de la vue seulement, et MapApp alimenté par cette projection.**

Ce verdict **ne signifie pas** que FileTopo V1 est terminé, ni que `F-050`/`F-051` sont entièrement VERIFIED dans leur contrat produit global. Claude ne rend pas le verdict et ne s’attribue pas la vérification : il ne fait que consigner le contrôle externe.

Aucun code produit ne doit changer. Aucun benchmark ni replay WebView2 ne doit être relancé. Aucun JSON de preuve ne doit être modifié.

---

## 0 — synchronisation et préconditions

1. Appliquer `AGENTS.md` et les protocoles actifs du dépôt.
2. Branche attendue : `build/v0.2-a14-v1-pipeline-convergence`.
3. `git fetch origin`, puis fast-forward uniquement.
4. Le commit d’orchestration courant doit avoir comme parent direct le HEAD livré par Codex :
   `58862b7f7cddb149c41e59ccfb9ae40d10b53630`.
5. Le commit substantif de TASK-0030 reste :
   `ab1d7e2386dd0cf5b935377c867c89617e4e3e56`.
6. Le gel documentaire TASK-0030 / DEC-0031 reste :
   `0255bd10717e11e460ab5a405aa07f9e516fa535`, parent direct du premier code et lui-même enfant de `896e2c39b955688e6a740427691be62255436a04`.
7. `TASK-0029 = VERIFIED`, `ACTION-0046 = CLOSED`.
8. `origin/main` doit rester exactement :
   `1a7d652ca48281c1687f6d1404c56a1404df91d8`.
9. X5 = **36** et reste inchangé.
10. `ACTION-0047` doit être libre.
11. Ne créer ni `TASK-0031`, ni `DEC-0032`, ni branche suivante, PR, merge, tag ou release.
12. Arbre propre avant écriture.

Toute divergence : **STOP / BLOCKED**.

---

## 1 — contrôle indépendant à enregistrer

Créer :

- `docs/reviews/ACTION-0047-independent-control.md`

Le document doit indiquer explicitement :

- `ACTION-0047 = CLOSED`;
- `TASK-0030 = VERIFIED`;
- exécuteur de TASK-0030 : **Codex**;
- rédacteur de la fermeture : **Claude Code**;
- autorité du verdict : **orchestrateur technique indépendant**;
- Claude ne rend pas le verdict et ne s’attribue pas `VERIFIED`.

### Points PASS du contrôle externe

Consigner au minimum les faits suivants, sans les exagérer :

1. **Chaîne Git correcte.** Le gel TASK-0030 + DEC-0031 précède le code; la branche descend sans divergence du commit d’orchestration `896e2c39...`.
2. **Un seul corpus canonique runtime.** `crate::index::Index` / table `nodes` est la vérité de corpus par cerveau. `map::store` est devenu DTO-only; l’ancien `MapStore/map_nodes` ne subsiste que comme `legacy_store` sous `#[cfg(test)]` pour migration/régression.
3. **Build sans layout global.** `map::commands::build_map` scanne la source synthétique en lecture seule, publie l’Index canonique puis ne calcule aucun layout de corpus; `MAX_NODES_PER_MAP=5000` n’est plus une limite runtime et reste seulement sous `#[cfg(test)]`.
4. **Projection produit bornée réelle.** `map_view -> materialize_view() -> layered-tree-cards-v1 -> DTO -> MapApp`; `VIEW_BUDGET=512`, avec au plus 256 nœuds matériels et suffisamment de places réservées pour que nœuds + agrégats restent <= 512.
5. **Agrégats exacts et distincts.** Ils portent le parent, le nombre exact d’enfants directs absents de la vue, la raison et un curseur éventuel; aucun chemin, faux dossier, relation ou suggestion n’est inventé.
6. **Layout seulement sur la projection.** Les rectangles de la vue sont calculés après sélection bornée des entités; aucun rectangle n’est persisté pour tout le corpus runtime.
7. **100k sur le cœur produit.** Le test produit crée un Index de 100 000 nœuds, appelle le vrai materializer, sérialise un DTO borné, vérifie que les 99 999 enfants sont atteignables par pagination sans doublon ni omission, et refuse un curseur périmé après révision.
8. **Passage physique >5000.** Le scénario synthétique réel à 6001 nœuds passe par scan -> Index canonique -> projection, confirme la source inchangée et invalide le curseur après rebuild.
9. **WebView2 réel.** La preuve non canonique rapporte 6001 indexés -> 256 matérialisés + 1 agrégat, navigation progressive, pan/zoom/sélection, 24 keydowns de confiance et 0 erreur console fatale.
10. **Relations/contenu hors projection.** Un endpoint relationnel hors vue reste résolu contre l’Index canonique et l’UI le déclare au lieu d’inventer des coordonnées; les consommateurs d’analyse ne créent aucun second stockage canonique.
11. **Aucune nouvelle dépendance/stack.** Aucun changement de renderer, package manifest, cloud, LLM, MCP ou réseau produit.
12. **Données exclusivement synthétiques.** Aucun folder picker réel n’est exposé; aucun cerveau réel n’a été lu.
13. Les validations exécutées par l’agent sont enregistrées comme **preuves d’exécuteur**, pas comme nouvelle exécution indépendante : Rust 290/0/5 ignored, TypeScript 264/0, `pnpm check`, `pnpm build`, `cargo build --offline`, runtime source guard et `git diff --check` PASS.

---

## 2 — réserves non bloquantes à conserver explicitement

La fermeture DOIT enregistrer ces réserves; aucune ne doit être effacée ou transformée en promesse :

### R-T30-1 — Clippy strict non vert

`cargo clippy --all-targets --offline -- -D warnings` est rapporté en échec. L’exécuteur a classé les diagnostics comme dette préexistante à partir d’extraits présents au baseline, mais **le contrôle indépendant n’a pas réexécuté le baseline Clippy**. La V1 publiable devra avoir une chaîne CI/release propre ou une décision écrite sur chaque exception. TASK-0030 n’est pas bloquée par ce point car aucun nouveau diagnostic propre à la convergence n’a été démontré.

### R-T30-2 — ouvrir != encore réutiliser l’index existant

Le code courant `map_open/build_map` rescane et republie encore le corpus lors du chargement, même lorsque l’index est compatible; `rebuild=false` ne signifie pas encore « ouvrir l’index persistant sans rescan ». **Avant d’exposer une vraie racine utilisateur**, la V1 doit distinguer clairement :

- ouverture/reprise d’un index valide existant;
- actualisation explicite/reconciliation;
- reconstruction forcée.

Sinon un cerveau réel pourrait être rescanné inutilement à chaque chargement et les révisions/cursors seraient invalidés sans besoin.

### R-T30-3 — certaines analyses restent corpus-memory

`AnalysisInput` / `analysis_nodes()` et certaines opérations d’analyse/digest peuvent encore matérialiser les métadonnées du corpus complet en mémoire. Cela ne traverse pas le DTO de carte et ne recrée pas `map_nodes`, donc la frontière de rendu reste correcte, mais la dette mémoire/indexation doit être traitée avant la validation V1 sur très gros cerveaux.

### R-T30-4 — performances produit non encore acceptées

- WebView2 physique : 6001 nœuds synthétiques, pas 100k physiques;
- 100k : cœur produit Rust/jsdom, pas acceptance Windows complète;
- aucune validation laptop `TARGET_CLASS`;
- aucune preuve GPU désactivé;
- aucun 1M physique;
- R8 reste ouverte.

### R-T30-5 — périmètre produit encore synthétique

`SourceKind`/MapApp restent synthétiques et le folder picker réel reste volontairement non exposé. Ce contrôle autorise **la prochaine tranche de préparation au vrai cerveau**, pas l’utilisation silencieuse de données personnelles.

### R-T30-6 — dette test-only historique

`legacy_store.rs` conserve une copie importante de l’ancien store pour les tests/migrations. C’est acceptable pour TASK-0030, mais avant publication il faudra réduire/supprimer ce code s’il n’est plus nécessaire, plutôt que conserver un second pseudo-moteur uniquement par inertie.

---

## 3 — états à poser après fermeture

Mettre à jour uniquement les documents nécessaires pour refléter :

- `TASK-0030 = VERIFIED` dans **sa portée synthétique de convergence**;
- `ACTION-0047 = CLOSED`;
- `DEC-0031 = APPROVED`, implémentation TASK-0030 contrôlée;
- `F-050 = IMPLEMENTED`, **pas VERIFIED globalement**;
- `F-051 = IMPLEMENTED`, **pas VERIFIED globalement**;
- `F-042 = PROPOSED / MVP`;
- `F-046 = PROPOSED`;
- `F-047 = DEFERRED`;
- X5 = 36;
- `origin/main` inchangé.

Raison de ne pas mettre `F-050/F-051` à VERIFIED : leur contrat produit complet exige encore davantage que cette tranche synthétique, notamment acceptance d’échelle/rendu et intégration ultérieure au vrai flux V1. Le contrôle valide la **tranche**, pas toute la fonction commerciale finale.

Mettre à jour :

- `docs/tasks/TASK-0030-v1-pipeline-convergence.md`;
- `docs/decisions/DEC-0031-one-canonical-brain-index-and-bounded-projection.md`;
- `docs/ai/CURRENT_STATE.md`;
- `docs/ai/NEXT_ACTION.md`;
- `docs/ai/HANDOFF.md`;
- `docs/ai/VALIDATION.md`;
- `docs/ai/CHANGELOG_AI.md`;
- `.orchestrator/RESULT.md`;
- éventuellement `docs/product/FEATURE_MATRIX.md` uniquement si nécessaire pour remplacer « contrôle indépendant attendu » par la portée exacte contrôlée, **sans promouvoir F-050/F-051 à VERIFIED**.

Ne modifier aucun code sous `src/`, `src-tauri/`, `scripts/`, aucun package manifest et aucun JSON sous `docs/performance/runs/`.

---

## 4 — artefacts / X5

Les trois artefacts TASK-0030 restent **non canoniques**, non protégés et inchangés :

- `TASK-0030-materialized-view-100k.json`
- `TASK-0030-webview2.json`
- `TASK-0030-validation.json`

Ne pas les régénérer, modifier, renommer, supprimer ni ajouter à X5.

Les 36 noms existants de X5 restent bit-for-bit inchangés.

---

## 5 — action suivante après fermeture

`NEXT_ACTION.md` doit contenir **une seule action**, formulée sans créer la prochaine TASK :

> Retour à l’orchestrateur pour décider et ouvrir la prochaine tranche V1 après convergence, avec priorité à la préparation sûre du vrai pipeline `REAL_ROOT` et à la séparation ouverture / actualisation / reconstruction avant toute donnée réelle.

Ne pas créer `TASK-0031`, `DEC-0032` ni une branche suivante. L’orchestrateur le fera après avoir vérifié cette fermeture.

---

## 6 — validations de fermeture

Exécuter seulement les contrôles documentaires/structurels nécessaires :

- `git diff --check`;
- diff de fermeture uniquement documentaire;
- aucun changement sous `src/`, `src-tauri/`, `scripts/`, `docs/performance/runs/`;
- X5 exactement 36;
- trois JSON TASK-0030 inchangés;
- anciens artefacts protégés inchangés;
- `origin/main` inchangé;
- liens relatifs des documents modifiés/créés valides;
- absence de `TASK-0031`, `DEC-0032` avant et après.

Ne pas relancer les benchmarks, WebView2 ou les suites lourdes : cette action consigne un verdict déjà rendu.

---

## 7 — RESULT.md

Écrire :

```text
TASK_ID: ACTION-0047 — Independent closure of TASK-0030
AGENT: CLAUDE
RESULT: DONE | BLOCKED | FAILED
BRANCH: build/v0.2-a14-v1-pipeline-convergence
FINAL_HEAD: <commit de fermeture>

SUMMARY:
- recorded external independent PASS with explicit reserves
- TASK-0030 -> VERIFIED in synthetic convergence scope
- ACTION-0047 -> CLOSED
- F-050/F-051 remain IMPLEMENTED, not globally VERIFIED

VALIDATIONS:
-

RESERVES_RECORDED:
- R-T30-1 through R-T30-6

FILES_CHANGED:
-

CODE_OR_EVIDENCE_CHANGED: no
X5: 36
MAIN_UNCHANGED: yes/no

COMMIT:
PUSHED: yes/no

NEXT_ORCHESTRATOR_DECISION:
- decide/open next V1 tranche; no real data yet
```

---

## 8 — Git final

Commit/push uniquement sur `build/v0.2-a14-v1-pipeline-convergence`.

Interdits : code produit, benchmark, JSON de preuve, nouveau TASK/DEC, nouvelle branche, PR, merge, main, release, tag, force push, données réelles.