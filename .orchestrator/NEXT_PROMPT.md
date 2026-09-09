# NEXT_PROMPT — TASK-0030 / V1 Pipeline Convergence — Canonical Brain Index + Bounded Runtime Projection

**TARGET_AGENT:** CODEX  
**RECOMMENDED_MODEL:** GPT-6 Astra — High  
**STATUS:** READY  
**OWNER:** orchestrateur technique  
**MODE:** code produit V1 — convergence, pas un spike  
**TASK:** `TASK-0030 — V1 Pipeline Convergence — Canonical Brain Index and Bounded Runtime Projection`  
**DECISION:** `DEC-0031 — One Canonical Brain Index and Bounded Projection Boundary`

## /goal

Faire le premier vrai pas de convergence V1 : **FileTopo ne doit plus avoir deux vérités concurrentes pour les mêmes nœuds.**

Aujourd'hui :

- `src-tauri/src/index.rs` possède la fondation d'index générique avec la pagination bornée de `TASK-0029`;
- le runtime `MapApp` courant passe encore par `map::MapStore`, `map_nodes`, `MapSnapshot.nodes`, `MAX_NODES_PER_MAP = 5000`, et un layout calculé/persisté sur tout le corpus de la tranche;
- le frontend courant reçoit encore un snapshot complet de la carte de la tranche synthétique.

La cible de cette tâche est :

> **Un seul index SQLite canonique par cerveau. Le runtime MapApp lit une projection matérialisée bornée de cet index. Le layout ne porte que sur cette projection. Aucun whole-graph JSON n'est envoyé au frontend.**

Cette tâche est du **code produit**, pas un nouveau prototype. Elle doit réutiliser les briques déjà vérifiées et supprimer la duplication conceptuelle plutôt que créer une troisième couche parallèle.

**Ne branche pas encore un cerveau personnel de Sébastien.** Utiliser uniquement les fixtures synthétiques et des répertoires temporaires synthétiques. L'activation d'une vraie racine utilisateur sera la tranche suivante après contrôle de la frontière read-only.

---

## 0 — synchronisation, identité et branche

1. Lire et appliquer `AGENTS.md` et les protocoles actifs du dépôt.
2. Branche de départ attendue : `build/v0.2-a13-scale-query-foundation`.
3. `git fetch origin`, puis fast-forward uniquement.
4. HEAD doit être le commit d'orchestration qui porte ce fichier.
5. Son parent direct doit être exactement :
   `981e5fe262556208f118ebfc299e5c9333600c4e`.
6. Vérifier :
   - `TASK-0029 = VERIFIED`;
   - `ACTION-0046 = CLOSED`;
   - `DEC-0030 = APPROVED`;
   - `origin/main = 1a7d652ca48281c1687f6d1404c56a1404df91d8`;
   - `X5 = 36`;
   - aucune `TASK-0030` ni `DEC-0031` préexistante.
7. Arbre propre avant écriture.
8. Créer et publier exactement :
   `build/v0.2-a14-v1-pipeline-convergence`.
9. Ne toucher ni `main`, ni PR, ni release, ni tag.

Toute divergence : **STOP / BLOCKED**.

---

## 1 — audit ciblé obligatoire AVANT le gel

Avant toute modification, tracer les dépendances réelles de :

- `src-tauri/src/index.rs`;
- `src-tauri/src/map/store.rs`;
- `src-tauri/src/map/commands.rs`;
- `src-tauri/src/map/brains.rs`;
- `src-tauri/src/map/layout.rs`;
- `src-tauri/src/map/content_signals.rs`;
- relations intra/inter-cerveaux;
- `src/map/MapApp.tsx`;
- `src/map/MapView.tsx`;
- DTOs partagés dans `src/map/types.ts`.

Identifier précisément :

1. quels consommateurs lisent `MapStore`;
2. lesquels ont besoin de nœuds seulement;
3. lesquels ont besoin des rectangles persistés;
4. lesquels ont seulement besoin d'une identité `brain_id + node_id`;
5. quels invariants/tests supposent encore `MapSnapshot.nodes = tout le corpus`;
6. si les relations/doublons dépendent de `map_nodes` ou seulement de l'identité/path.

**Ne pas créer une couche de compatibilité durable sans nécessité.** Si un adaptateur transitoire est nécessaire pour migrer un consommateur, il doit être explicitement temporaire et ne doit pas écrire une deuxième copie canonique des nœuds.

---

## 2 — gel documentaire AVANT le code

Créer et committer avant toute modification de code :

- `docs/tasks/TASK-0030-v1-pipeline-convergence.md`
- `docs/decisions/DEC-0031-one-canonical-brain-index-and-bounded-projection.md`

`TASK-0030` part `APPROVED`, puis `IN_PROGRESS` après le gel.

### DEC-0031 doit décider explicitement

### A. Une seule vérité de corpus

`Index` devient la **source canonique unique** des nœuds d'un cerveau pour le produit V1.

Il est interdit d'entretenir deux tables concurrentes contenant chacune la vérité complète du même corpus (`nodes` d'un côté, `map_nodes` de l'autre).

`MapStore` peut :

- être supprimé;
- être réduit à un cache non canonique;
- ou rester temporairement comme lecteur de migration/tests,

mais il ne doit plus être le store canonique utilisé par le runtime normal une fois TASK-0030 terminée.

### B. Layout = propriété de la vue, pas du corpus

Les rectangles/coordonnées de layout ne sont plus une propriété durable obligatoire de chaque nœud du corpus.

Le pipeline devient :

`Index canonique -> materialize_view() borné -> layout(view) -> DTO borné -> MapApp`

Le layout `layered-tree-cards-v1` est **conservé**. Aucun nouveau renderer ni moteur de layout n'est introduit dans cette tâche.

### C. Vue matérialisée bornée

Créer une primitive produit réelle, pas test-only, équivalente à :

- focus courant;
- ancêtres nécessaires;
- enfants directs paginés/bornés via les primitives `TASK-0029`;
- nœuds utiles jusqu'à un budget fini;
- agrégat exact lorsqu'une partie réelle n'est pas matérialisée.

La cardinalité envoyée au frontend doit dépendre du **budget de vue**, pas du nombre total d'éléments indexés.

Un budget d'ingénierie fixe peut être choisi pour cette tranche (ex. 512 ou valeur mieux justifiée par les tests existants), mais il doit être documenté comme **borne de runtime de la vue**, jamais comme limite de corpus ni promesse marketing.

### D. Sémantique d'agrégat

Un agrégat FileTopo :

- n'est PAS un dossier;
- n'a PAS de chemin de fichier;
- n'est PAS une relation;
- n'est PAS une suggestion;
- porte un **compte exact d'enfants directs non matérialisés**;
- porte une raison explicite de regroupement;
- est expansible/paginable;
- n'invente aucune arête.

Ne pas calculer un total récursif de descendants sur le hot path.

### E. Frontière IPC

Le runtime normal ne doit plus exposer au frontend une API qui sérialise implicitement tout le corpus.

Créer/adapter un contrat Tauri borné pour la vue courante. Les commandes peuvent être renommées/ajoutées si nécessaire, mais la nouvelle frontière doit être explicite et testée.

Un garde automatisé doit empêcher la réintroduction d'un `all_nodes()`/`MapSnapshot.nodes` complet sur le chemin runtime normal.

### F. Confidentialité

- aucun réseau;
- aucun contenu/nom/path de fixture ou cerveau dans un artefact public hors données synthétiques;
- aucun log automatique de chemin réel;
- aucune écriture sous une racine analysée;
- aucun compte/cloud/LLM;
- aucune télémétrie.

### G. Portée volontaire

**TASK-0030 ne branche PAS encore une vraie racine utilisateur.** Elle converge le moteur et le runtime sur données synthétiques seulement. Cela évite d'exposer des données personnelles tant que la nouvelle frontière canonique n'est pas contrôlée.

---

## 3 — implémentation attendue

Le design exact des types/fichiers est à déterminer après l'audit, mais le résultat fonctionnel doit comporter au minimum :

### 3.1 Index canonique par cerveau

- chaque cerveau de la tranche synthétique utilise le `Index` canonique sous son espace applicatif isolé;
- identité `brain_id + node_id` préservée;
- `index_id` / `index_revision` de TASK-0029 préservés;
- pagination enfants keyset préservée;
- `child_count` exact préservé;
- aucun partage de lignes entre cerveaux.

### 3.2 Build/rebuild

Le build synthétique doit :

1. matérialiser la fixture synthétique;
2. scanner read-only;
3. publier/remplacer l'index canonique;
4. ne PAS calculer un layout sur tout le corpus avant publication;
5. ne PAS refuser le corpus uniquement parce qu'il dépasse `MAX_NODES_PER_MAP = 5000`.

La constante historique peut rester pour des tests/compatibilité si nécessaire, mais **elle ne doit plus être la limite produit du chemin runtime convergé**.

### 3.3 Materializer produit

Créer un materializer déterministe et testable qui produit un DTO borné contenant au minimum :

- `brainId`;
- `indexRevision`;
- focus;
- nœuds matériels;
- arêtes hiérarchiques exactes entre nœuds matériels;
- agrégats exacts nécessaires;
- compte total indexé;
- compte matérialisé;
- compte non matérialisé déclaré;
- indicateur/raison lorsqu'une partie est masquée.

Pas de whole-graph JSON caché dans un autre champ.

### 3.4 Layout borné

`layered-tree-cards-v1` s'applique uniquement aux nœuds/agrégats de la vue matérialisée.

Le layout ne doit jamais demander l'ensemble du corpus pour positionner une vue de 512 éléments.

### 3.5 Runtime MapApp

Faire consommer à `MapApp` le nouveau DTO borné.

Préserver autant que possible les comportements actuels :

- pan;
- zoom;
- fit;
- reset;
- sélection souris/clavier;
- parent/enfants;
- détails;
- multi-cerveaux;
- relations/suggestions/doublons déjà exposés lorsque leurs extrémités sont matérialisées.

Pour une relation dont une extrémité existe dans l'index mais n'est pas dans la vue, **ne jamais la faire disparaître silencieusement** : le panneau peut la déclarer « hors de la vue courante »/équivalent; ne pas fabriquer de coordonnée ni d'arête fantôme.

Sur les petites fixtures existantes qui tiennent dans le budget, le comportement observable doit rester équivalent à la tranche actuelle.

### 3.6 MapStore

À la fin :

- aucun runtime normal ne doit dépendre de `MapStore` comme vérité complète des nœuds;
- aucune nouvelle écriture du corpus complet dans `map_nodes`;
- si le module reste, documenter exactement pourquoi et dans quel rôle non canonique;
- idéalement supprimer le code devenu mort plutôt que le garder « au cas où », si les tests prouvent qu'il n'est plus nécessaire.

Appliquer la discipline Ponytail/YAGNI de l'audit : **réutiliser, simplifier, supprimer la duplication**. Ne pas installer Ponytail ni exécuter ses hooks dans cette tâche.

---

## 4 — tests obligatoires

### 4.1 Non-régression complète

- tests Rust ciblés;
- `cargo test --lib` complet;
- `pnpm test` complet;
- `pnpm check`;
- `pnpm build`;
- `cargo build`;
- `cargo clippy --all-targets -- -D warnings` si le dépôt courant le permet sans dette préexistante nouvelle;
- `git diff --check`.

Toute régression d'une fonction déjà vérifiée doit être réparée, jamais masquée en modifiant un test.

### 4.2 Convergence structurelle

Ajouter des tests qui prouvent :

1. un cerveau a un seul index canonique de nœuds;
2. le runtime convergé ne lit pas `MapStore::all_nodes()`;
3. le runtime convergé ne sérialise jamais tout le corpus par défaut;
4. le layout reçoit seulement la vue matérialisée;
5. `MapStore`, s'il existe encore, n'écrit plus de copie canonique concurrente;
6. deux cerveaux restent isolés.

### 4.3 Vue bornée 100k

Créer/réutiliser une fixture synthétique 100k **sans utiliser un harness parallèle qui contourne le runtime produit**.

Le test doit passer par le même cœur produit :

`Index canonique -> materializer produit -> layout -> DTO sérialisable`

Vérifier :

- corpus = 100 000 exactement;
- DTO <= budget déclaré;
- arêtes <= borne cohérente avec la vue;
- payload ne contient pas les 100 000 noms/paths;
- tout élément omis est comptabilisé par agrégat/raison exacte;
- aucune arête inventée;
- chaque nœud matériel existe dans l'index;
- `P-01/P-02/P-03` amendées ne sont pas contredites.

### 4.4 Navigation progressive

Sur une fixture large :

- page/expansion suivante n'a ni doublon ni omission;
- agrégat compte exactement les enfants non matérialisés;
- expansion d'un agrégat remplace correctement une partie agrégée par des nœuds réels;
- curseur stale après rebuild = erreur explicite, jamais résultat silencieux;
- clavier et sélection continuent de fonctionner sur la vue.

### 4.5 Read-only

Empreinte synthétique avant/après une session couvrant build, materialize, expand, select, relations et doublons : identique.

Aucun fichier FileTopo créé sous la racine synthétique analysée.

---

## 5 — preuve WebView2 obligatoire

Cette tâche modifie réellement le runtime et le frontend. Exécuter au moins une preuve Windows/WebView2 réelle sur :

1. une petite fixture actuelle — non-régression fonctionnelle;
2. une vue matérialisée bornée issue d'un corpus synthétique large, si le protocole de test permet de la charger honnêtement par le chemin produit.

Mesurer au minimum :

- nombre de nœuds DOM/SVG;
- nombre d'arêtes;
- pan;
- zoom;
- sélection;
- absence d'erreur console fatale;
- moteur WebView2 réellement utilisé.

**Ne pas publier un chiffre « laptop modeste » et ne pas prétendre avoir prouvé un mode sans GPU.** Le produit ne doit cependant introduire aucune dépendance WebGL/GPU obligatoire.

Les nouveaux artefacts de preuve restent non canoniques jusqu'au contrôle indépendant; ne pas modifier X5 pendant l'exécution.

---

## 6 — explicitement HORS TASK-0030

Ne pas implémenter :

- vraie racine personnelle de Sébastien;
- activation générale du folder picker sur données personnelles;
- watcher / `notify-rs`;
- journal de changements;
- FTS5 / optimisation `P-08`;
- indexation en streaming/batches — sauf le minimum strictement nécessaire si la convergence est impossible autrement; dans ce cas STOP et documenter avant d'élargir;
- identité physique `F-046`;
- OCR/RAG/IA/LLM;
- Graphify;
- MCP;
- OmniRoute;
- React Flow / ELK / Sigma / Cytoscape;
- refonte graphique complète;
- mode équipe/permissions;
- nouvelle télémétrie;
- compte ou cloud.

Ne pas installer de nouveau skill/plugin/hook externe dans le repo ou la machine pour cette tâche.

---

## 7 — dette à supprimer, pas déplacer

À la fin, produire dans la fiche TASK un tableau :

- code supprimé;
- code réutilisé;
- code migré;
- code encore temporaire;
- raison exacte de tout doublon restant.

Une nouvelle abstraction n'est acceptable que si elle **remplace** une duplication ou matérialise une frontière de DEC-0031.

Ne pas ajouter une troisième base/table de nœuds.

---

## 8 — état produit attendu en sortie exécuteur

Si tout passe :

- `TASK-0030 = IMPLEMENTED`, jamais `VERIFIED`;
- `DEC-0031 = APPROVED`, implémentation en attente de contrôle indépendant;
- `F-050` peut passer de `PROPOSED` à `IMPLEMENTED` **seulement si** le runtime produit utilise effectivement une vue bornée et les critères structurels ci-dessus passent;
- `F-051` peut passer de `PROPOSED` à `IMPLEMENTED` **seulement si** les agrégats exacts sont réellement dans le runtime produit et testés;
- `F-042` reste `PROPOSED` sauf si les gestes de repli/dépli/focus sont effectivement exposés et testés dans le produit; ne pas la promouvoir par association;
- `F-046 = PROPOSED`;
- `F-047 = DEFERRED`;
- Graphify `NOT INTEGRATED`;
- aucun renderer nouveau;
- `X5 = 36` pendant la livraison;
- aucune `TASK-0031` / `DEC-0032` créée;
- `origin/main` inchangé.

`NEXT_ACTION.md` doit contenir une seule action : **contrôle indépendant de TASK-0030**.

---

## 9 — documentation à mettre à jour

- `docs/tasks/TASK-0030-v1-pipeline-convergence.md`
- `docs/decisions/DEC-0031-one-canonical-brain-index-and-bounded-projection.md`
- `docs/architecture/PROGRESSIVE_SCALE_ARCHITECTURE.md` uniquement si nécessaire pour refléter l'implémentation réelle sans changer la décision;
- `docs/product/FEATURE_MATRIX.md` uniquement pour les états réellement implémentés;
- `docs/product/CARTETOPO_FUNCTIONAL_PARITY.md` uniquement si un état de preuve doit être ajouté — aucune exigence ne doit être réécrite;
- `docs/ai/CURRENT_STATE.md`;
- `docs/ai/NEXT_ACTION.md`;
- `docs/ai/HANDOFF.md`;
- `docs/ai/VALIDATION.md`;
- `docs/ai/CHANGELOG_AI.md`;
- `.orchestrator/RESULT.md`.

Créer un rapport technique court si nécessaire, mais pas une nouvelle collection de documents redondants.

---

## 10 — RESULT.md

Écrire :

```text
TASK_ID: TASK-0030 — V1 Pipeline Convergence — Canonical Brain Index and Bounded Runtime Projection
AGENT: CODEX
RESULT: DONE | BLOCKED | FAILED
BRANCH: build/v0.2-a14-v1-pipeline-convergence
FINAL_HEAD: <commit substantif>

SUMMARY:
-

CANONICAL_INDEX_RESULT:
-

BOUNDED_RUNTIME_RESULT:
-

REMOVED_OR_RETIRED_DUPLICATION:
-

VALIDATIONS:
-

WEBVIEW2_EVIDENCE:
-

FILES_CHANGED:
-

COMMIT:
PUSHED: yes/no

LIMITS_OR_BLOCKERS:
-

NEXT_ORCHESTRATOR_DECISION:
- independent control of TASK-0030
```

---

## 11 — Git final

Commit/push uniquement sur `build/v0.2-a14-v1-pipeline-convergence`.

Interdits : merge, PR, main, release, tag, force push, vraie donnée personnelle, nouvelle tâche, prochaine décision, nouveau renderer, cloud/LLM/MCP.
