# NEXT_PROMPT — TASK-0031 / V1 Brain Lifecycle — Open, Refresh, Rebuild

**TARGET_AGENT:** CODEX  
**RECOMMENDED_MODEL:** GPT-6 Astra — High  
**STATUS:** READY  
**OWNER:** orchestrateur technique  
**MODE:** code produit V1 — convergence et sûreté, pas un spike  
**TASK:** `TASK-0031 — V1 Brain Lifecycle — Open / Refresh / Rebuild Separation`  
**DECISION À CRÉER SI PRÉCONDITIONS OK:** `DEC-0032 — Persistent Brain Lifecycle Contract`

## /goal

Faire de la réserve `R-T30-2` une vraie frontière produit avant toute racine utilisateur réelle.

À la fin de cette tranche, FileTopo doit distinguer structurellement et dans son API runtime :

1. **OUVRIR** un cerveau déjà indexé = lire/réutiliser l'index persistant existant, **sans scanner ni lire la source**, sans reconstruction et sans avancer inutilement la révision;
2. **ACTUALISER** = action explicite qui lit/scanne la source puis publie un nouvel état canonique de façon sûre;
3. **RECONSTRUIRE** = action explicite qui reconstruit l'index dérivé, sans détruire le dernier index fiable si la reconstruction échoue.

Cette tâche reste **100 % synthétique**. Elle ne crée PAS encore `REAL_ROOT`, ne réactive PAS le folder picker historique et ne lit aucune donnée personnelle.

Le but n'est pas d'ajouter des fonctionnalités : c'est d'empêcher qu'un futur vrai cerveau de 100k fichiers soit rescanné simplement parce que l'utilisateur l'ouvre.

---

## 0 — Synchronisation et préconditions

1. Appliquer `AGENTS.md`, `CLAUDE.md` et les protocoles actifs.
2. `git fetch origin` puis fast-forward uniquement.
3. Branche de départ attendue : `build/v0.2-a14-v1-pipeline-convergence`.
4. HEAD distant attendu au moment du départ :
   `eda358b1294c1bd46344143fe945b83efd1d2cd2`.
5. `TASK-0030 = VERIFIED` par `ACTION-0047 = CLOSED`.
6. `DEC-0031 = APPROVED`.
7. `TASK-0029 = VERIFIED`, `ACTION-0046 = CLOSED`.
8. `origin/main` doit rester exactement :
   `1a7d652ca48281c1687f6d1404c56a1404df91d8`.
9. X5 = **36**, intact.
10. `TASK-0031`, `DEC-0032` et la branche suivante doivent être libres.
11. Arbre de travail propre avant toute écriture.

Toute divergence non expliquée : **STOP / BLOCKED**.

### Branche de travail

Créer depuis le HEAD synchronisé, sans réécriture d'historique :

`build/v0.2-a15-v1-brain-lifecycle`

Publier cette branche seulement. Aucun travail sur `main`.

---

## 1 — DEFINE : gel documentaire AVANT le premier code

Avant toute modification sous `src/` ou `src-tauri/`, créer et committer ensemble :

- `docs/tasks/TASK-0031-v1-brain-lifecycle.md`
- `docs/decisions/DEC-0032-persistent-brain-lifecycle-contract.md`

Le commit de gel doit être parent direct du premier commit de code.

### DEC-0032 doit figer au minimum

#### A. Open est une lecture de l'index, jamais un scan

`open` :

- exige un index canonique existant, construit pour le bon `brain_id` et compatible;
- **ne matérialise pas la fixture/source**;
- **ne parcourt pas la source**;
- ne publie aucun nouveau corpus;
- ne supprime aucun index;
- ne change pas `index_id`;
- ne change pas `revision`;
- permet immédiatement `map_view`, détails et autres lectures compatibles sur le dernier index fiable.

Index absent ou incompatible : réponse/erreur typée et explicite; **aucun rebuild automatique**.

#### B. Refresh est explicite

`refresh` :

- est déclenché explicitement par l'appelant;
- lit/scanne la source en lecture seule;
- ne modifie jamais la source;
- publie le nouveau corpus canonique seulement après un scan réussi;
- conserve l'identité `index_id` d'un index compatible et avance sa `revision` lorsqu'une nouvelle publication est faite;
- si le scan échoue ou est annulé, **le dernier index fiable reste utilisable**.

Aucune exigence de watcher/incrémental ici. `F-027/F-030/F-031` restent hors portée.

#### C. Rebuild est explicite et fail-safe

`rebuild` :

- est une action distincte et volontaire;
- peut remplacer/recréer les données dérivées de l'index;
- ne touche jamais au catalogue, aux relations, aux décisions humaines ni à la source;
- **ne détruit pas le dernier index fiable avant d'avoir un remplacement valide**;
- sur échec de scan, d'indexation ou de validation, l'ancien index reste lisible;
- un rebuild compatible conserve l'`index_id` et avance la révision conformément aux décisions déjà prises; une incompatibilité de schéma/brain doit être traitée explicitement et documentée, jamais silencieusement.

#### D. Pas de politique cachée

Supprimer la sémantique ambiguë `map_open(brain_id, rebuild: bool)` du contrat produit. Le frontend/backend doivent exprimer les trois intentions par des opérations nommées distinctement.

Les anciens helpers de preuve peuvent être adaptés, mais aucune API publique ne doit cacher un scan derrière une opération appelée « open ».

#### E. Source indisponible

Un cerveau déjà indexé doit pouvoir **s'ouvrir et se consulter depuis son dernier index fiable même si sa source est temporairement indisponible**. L'UI/API doit signaler cette situation lorsque pertinente; elle ne doit ni vider l'index ni prétendre que la source est fraîche.

---

## 2 — PLAN : audit minimal avant code

Avant de modifier, documenter dans TASK-0031 :

- appels actuels à `map_open` dans `MapApp` et scénarios;
- comportement actuel de `map::commands::build_map`;
- métadonnées déjà disponibles dans `BrainIndex` pour `brain_id`, `index_id`, `revision`, schéma et digest;
- quelles opérations touchent réellement la source aujourd'hui;
- quelles opérations peuvent être séparées sans introduire un second index ou un nouveau store.

Réutiliser le code existant. Ne pas recréer scanner, index, materializer, layout ou catalogue.

---

## 3 — BUILD : API de cycle de vie

Implémenter une séparation explicite côté Rust/Tauri. Les noms exacts peuvent être légèrement ajustés si l'architecture existante l'exige, mais le contrat doit être sans ambiguïté :

- `map_open` — **index existant seulement**, aucune lecture source;
- `map_refresh` — scan/publication explicites;
- `map_rebuild` — reconstruction explicite et fail-safe.

### Rapports

Éviter de réutiliser trompeusement `MapBuildReport` pour une simple ouverture si ses champs impliquent un scan. Introduire au besoin un petit rapport de cycle de vie (`MapOpenReport`, `MapRefreshReport`, ou équivalent) exposant seulement des faits réels, par exemple :

- `brain_id`;
- état (`OPENED_EXISTING`, `REFRESHED`, `REBUILT`, etc.);
- `index_id`;
- `revision`;
- `node_count`;
- `schema_version`;
- source lue oui/non;
- index réutilisé oui/non;
- fraîcheur connue/inconnue si pertinent.

Ne pas inventer un timestamp de fraîcheur que le store ne peut pas justifier.

### Compatibilité et dernier état fiable

Une ouverture sur index absent/incompatible ne doit jamais supprimer ce fichier et ne doit jamais scanner silencieusement.

Pour refresh/rebuild :

- un échec avant publication laisse l'index courant intact;
- si une reconstruction incompatible exige un nouveau fichier SQLite, utiliser un staging/temp atomique ou une stratégie équivalente prouvant qu'un échec ne détruit pas le dernier état fiable;
- ne jamais toucher aux DB relations/catalogue/content-signals sauf si une migration explicitement requise et justifiée par cette tâche — par défaut, **ne pas les toucher**.

---

## 4 — BUILD : MapApp minimal, sans redesign

Adapter `MapApp` et les helpers/scénarios nécessaires pour que :

- le bouton/action **Ouvrir** utilise uniquement `map_open`;
- l'action **Actualiser** utilise explicitement `map_refresh`;
- l'action **Reconstruire l'index** utilise explicitement `map_rebuild`;
- une ouverture sans index affiche un état clair demandant une construction/actualisation explicite, au lieu de scanner automatiquement;
- une source temporairement absente n'empêche pas l'ouverture du dernier index fiable;
- la carte continue d'être alimentée par `map_view` et la projection bornée TASK-0030.

Pas de refonte visuelle. Pas de nouvelle navigation. Pas de REAL_ROOT.

Les scénarios synthétiques automatisés peuvent appeler refresh/rebuild explicitement pour préparer leur index. Aucun test existant ne doit être « réparé » en remettant un scan caché dans open.

---

## 5 — VERIFY : preuves obligatoires

### L1 — Open n'accède pas à la source

Test de produit, pas mock superficiel :

1. construire explicitement un index synthétique valide;
2. relever `index_id`, `revision`, nombre de nœuds et un digest de projection/index;
3. rendre la source temporairement indisponible **dans le sandbox de test seulement** (rename/déplacement contrôlé, puis restauration);
4. appeler `map_open`;
5. vérifier que l'ouverture réussit depuis l'index;
6. vérifier que `map_view` fonctionne encore;
7. `index_id`, `revision`, nombre et digest restent identiques;
8. restaurer la source même si le test échoue (RAII/guard/finally équivalent).

Ce test est la preuve centrale que « ouvrir » ne signifie plus « scanner ».

### L2 — Index absent

Sur un cerveau sans index :

- `map_open` retourne un état/erreur `NotBuilt` explicite;
- aucun fichier source n'est matérialisé/scanné à cause de l'ouverture;
- aucun index partiel n'est créé.

### L3 — Refresh explicite

Après modification **du fixture synthétique de test uniquement** :

- `map_refresh` voit le nouvel état;
- la source reste inchangée par FileTopo pendant le scan;
- le nouvel index est publié atomiquement;
- `index_id` reste cohérent;
- `revision` avance lorsqu'une publication est effectuée;
- `map_view` reflète le nouveau corpus borné.

### L4 — Refresh échoué préserve le dernier index

Avec source volontairement indisponible ou scan forcé en erreur :

- `map_refresh` échoue explicitement;
- l'ancien index reste ouvrable;
- son `index_id`, sa `revision`, son nombre de nœuds et son digest restent inchangés.

### L5 — Rebuild explicite et fail-safe

Prouver les deux cas :

- rebuild réussi : nouvelle publication valide, invariants brain/index respectés;
- rebuild échoué : dernier index fiable intact et ouvrable.

### L6 — Pas de scan caché par le frontend

Test TypeScript ou garde structurale prouvant que l'action Ouvrir invoque `map_open`, Actualiser `map_refresh`, Reconstruire `map_rebuild`, sans booléen magique `rebuild` réintroduit.

### L7 — Projection bornée intacte

Après open/refresh/rebuild, `map_view` reste le seul chemin de rendu du corpus : aucun whole-graph DTO, aucune réintroduction de `MapStore/map_nodes`, aucun layout global.

### L8 — Isolation

Deux cerveaux partageant la même fixture/source synthétique gardent :

- deux indexes séparés;
- révisions indépendantes;
- refresh/rebuild de l'un sans mutation de l'autre.

### L9 — Lecture seule

Pour toute opération qui lit réellement la source (refresh/rebuild), empreinte avant/après identique. `open` n'a pas à calculer d'empreinte de source — le faire violerait précisément le contrat.

---

## 6 — Validation générale

Exécuter les suites nécessaires après implementation :

- tests Rust pertinents puis suite complète;
- tests TypeScript pertinents puis suite complète;
- `pnpm check`;
- `pnpm build`;
- `cargo build --offline`;
- `cargo fmt --check` si configuré;
- `cargo clippy --all-targets --offline -- -D warnings` et rapporter honnêtement l'état. Ne pas élargir la tâche pour corriger toute dette Clippy historique, mais **aucun nouveau diagnostic introduit par TASK-0031 ne doit rester**;
- `git diff --check`.

Un passage WebView2 réel est requis si les scénarios existants permettent de démontrer sans données réelles :

- open d'un index déjà préparé;
- refresh explicite;
- rebuild explicite;
- carte toujours interactive et bornée.

Créer des artefacts `TASK-0031-*` uniquement si nécessaires. Ils restent **non canoniques** jusqu'au contrôle indépendant. Ne rien ajouter à X5.

---

## 7 — Portée interdite

TASK-0031 ne doit PAS :

- ajouter `REAL_ROOT`;
- réactiver `choose_collection` ou `tauri_plugin_dialog` dans le runtime;
- lire un vrai dossier utilisateur;
- ajouter watcher/notify-rs;
- implémenter FTS5 ou modifier P-08;
- implémenter identité physique F-046;
- corriger tout le Clippy historique;
- ajouter Graphify, MCP, IA, cloud, télémétrie ou réseau;
- changer de renderer ou de stack;
- faire le redesign UX/UI;
- introduire une seconde base canonique;
- créer `TASK-0032` ou `DEC-0033`;
- modifier `main`, ouvrir PR, merger, tagger ou releaser.

`F-042` reste PROPOSED/MVP. `F-050/F-051` restent IMPLEMENTED et ne deviennent pas globalement VERIFIED par cette tâche. `F-046` reste PROPOSED. `F-047` reste DEFERRED.

---

## 8 — Documentation et état final

Mettre à jour au minimum :

- `docs/tasks/TASK-0031-v1-brain-lifecycle.md`;
- `docs/decisions/DEC-0032-persistent-brain-lifecycle-contract.md`;
- `docs/ai/CURRENT_STATE.md`;
- `docs/ai/NEXT_ACTION.md`;
- `docs/ai/HANDOFF.md`;
- `docs/ai/VALIDATION.md`;
- `docs/ai/CHANGELOG_AI.md`;
- `docs/product/FEATURE_MATRIX.md` seulement pour refléter honnêtement les fonctions réellement touchées;
- `.orchestrator/RESULT.md`.

À la fin :

- `TASK-0031 = IMPLEMENTED`, **jamais auto-VERIFIED**;
- `DEC-0032 = APPROVED`;
- `NEXT_ACTION` contient une seule action : contrôle indépendant de TASK-0031;
- aucune TASK suivante précréée.

---

## 9 — RESULT.md

Écrire au minimum :

```text
TASK_ID: TASK-0031 — V1 Brain Lifecycle — Open / Refresh / Rebuild Separation
AGENT: CODEX
RESULT: DONE | BLOCKED | FAILED
BRANCH: build/v0.2-a15-v1-brain-lifecycle
FINAL_HEAD: <commit substantif>

SUMMARY:
-

LIFECYCLE_CONTRACT:
- open:
- refresh:
- rebuild:

LAST_KNOWN_GOOD_PROOF:
-

VALIDATIONS:
-

WEBVIEW2:
-

FILES_CHANGED:
-

LIMITS_OR_BLOCKERS:
- real roots still disabled
- no watcher/incremental update
- R-T30-3/R-T30-4/R-T30-6 status

X5: 36
MAIN_UNCHANGED: yes/no
TASK_STATUS: IMPLEMENTED
DECISION_STATUS: APPROVED

COMMIT:
PUSHED: yes/no
NEXT: independent control only
```

---

## 10 — Git final

Commits cohérents et petits. Le gel documentaire précède le code.

Push uniquement :

`build/v0.2-a15-v1-brain-lifecycle`

Interdits : force push, reset destructif, réécriture d'historique, `main`, PR, merge, release, tag, données réelles.
