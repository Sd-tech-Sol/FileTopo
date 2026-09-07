# TASK-0027 — Progressive Scale Architecture Realignment

- **Date :** 2026-09-06
- **Branche :** `build/v0.2-a11-progressive-scale-architecture`
- **Base contrôlée :** `b5809424bfa5c34f956dbe76c0b96777b84dc5fa`
- **Statut courant :** `IMPLEMENTED` — **contrôle indépendant requis**.
  L'exécuteur ne s'attribue jamais `VERIFIED`.
- **Transitions permises :** `PROPOSED → APPROVED → IN_PROGRESS →
  IMPLEMENTED → VERIFIED`; le GO technique de `.orchestrator/NEXT_PROMPT.md`
  autorise le passage à `IN_PROGRESS` après le gel des préconditions.
- **Agent d'exécution :** Claude Code
- **Nature :** **DOCUMENTAIRE / ARCHITECTURE UNIQUEMENT.** **Aucune
  implémentation produit.**
- **Décision :**
  [`DEC-0029`](../decisions/DEC-0029-progressive-materialization-and-scale-boundary.md)
- **Document d'architecture produit :**
  [`PROGRESSIVE_SCALE_ARCHITECTURE.md`](../architecture/PROGRESSIVE_SCALE_ARCHITECTURE.md)
- **Contribue à :** la frontière d'architecture et la roadmap de mise à
  l'échelle. **Ne contribue à aucune fonction implémentée.**

## 1. Objectif unique

Enregistrer la décision produit approuvée après réévaluation de FileTopo à
grande échelle :

> **FileTopo indexe grand, matérialise petit, et ne rend que le contexte
> utile.**

Le but fondamental **ne change pas** : application de bureau locale, légère,
généraliste, pensée notamment pour de très grands cerveaux numériques et des
environnements documentaires d'entreprise, utilisable sur un laptop ou PC
ordinaire **sans GPU puissant**, sans LLM, sans API infonuagique, sans compte
et sans envoi de documents.

Cette tâche **écrit la nouvelle frontière d'architecture et la roadmap. Elle
ne code rien.**

## 2. Préconditions contrôlées

| Précondition | Constat |
|---|---|
| Racine Git | `C:/Users/Vatfaire/Documents/TopographicDocumentMap` |
| Checkout de départ | `build/v0.2-a10-exact-duplicate-explorer` |
| Arbre local | **propre** avant et après le fast-forward |
| `git fetch origin` | exécuté |
| Fast-forward | **`Already up to date`** — le checkout portait déjà le commit d'orchestration |
| `HEAD` d'orchestration | `b5809424bfa5c34f956dbe76c0b96777b84dc5fa` |
| Parent direct exigé | `ffa950452e78cc2fc39678d9d0819527e3a12b21` — **conforme** |
| `TASK-0026` | `VERIFIED` |
| `ACTION-0043` | `CLOSED` |
| `X5` | **36** noms — comptés dans `src/map/runArtifacts.ts` |
| Preuves `TASK-0026-ED15-*` | **scellées, non touchées** |
| `origin/main` | `1a7d652ca48281c1687f6d1404c56a1404df91d8` — **non touché** |
| Identité canonique | `Sd-tech-Sol/FileTopo` |
| `TASK-0027` préexistante | **aucune** |
| `DEC-0029` préexistante | **aucune** |
| Branche de travail | `build/v0.2-a11-progressive-scale-architecture`, **créée et publiée** |

**Aucune divergence n'a été constatée.** Aucune condition de `STOP / BLOCKED`
n'a été rencontrée.

## 3. Périmètre écrit et fichiers autorisés

### 3.1 Créés

- `docs/tasks/TASK-0027-progressive-scale-architecture-realignment.md`
- `docs/decisions/DEC-0029-progressive-materialization-and-scale-boundary.md`
- `docs/architecture/PROGRESSIVE_SCALE_ARCHITECTURE.md`

### 3.2 Amendés

- `PROJECT_VISION.md`
- `ROADMAP.md`
- `docs/architecture/ARCHITECTURE_BASELINE.md`
- `docs/product/CARTETOPO_FUNCTIONAL_PARITY.md`
- `docs/product/FEATURE_MATRIX.md`
- `docs/product/REQUIREMENTS_BASELINE.md`
- `docs/ai/CURRENT_STATE.md`, `NEXT_ACTION.md`, `HANDOFF.md`,
  `VALIDATION.md`, `CHANGELOG_AI.md`
- `.orchestrator/RESULT.md`

### 3.3 Interdits, et non touchés

**Aucun** fichier sous `src/`, `src-tauri/`, `scripts/`, `graph/` ni
`docs/performance/runs/`. **Aucun** JSON de preuve. **Aucun** schéma SQLite,
**aucune** dépendance, **aucun** benchmark exécuté, **aucun** replay WebView2,
**aucune** modification de `X5`.

## 4. Frontière d'architecture gelée

Les huit points `A` à `I` de
[`DEC-0029`](../decisions/DEC-0029-progressive-materialization-and-scale-boundary.md)
sont la frontière. En résumé exécutif :

| Point | Ce qui est gelé |
|---|---|
| `A` | Corpus, graphe logique, vue matérialisée et rendu sont **quatre plans distincts**; `1 indexé` = `1 accessible`, **pas** `1 rendu`; `MAX_NODES_PER_MAP = 5000` est une **limite de tranche historique** |
| `B` | La navigation progressive est une **primitive**; **`F-042` monte au MVP** |
| `C` | Les **agrégats / méta-nœuds exacts** deviennent une capacité produit nommée, qui **ne devient jamais un faux dossier** |
| `D` | Le **query engine borné** est une primitive; **jamais de whole-graph JSON** au frontend |
| `E` | `layered-tree-cards-v1` reste valide **pour une vue bornée**; **aucun renderer final choisi**; **pas de dépendance à un GPU puissant ni à WebGL** |
| `F` | **Métadonnées automatiques**, **hachage sur campagne explicite**; pas de hachage d'un million de fichiers à l'ouverture |
| `G` | **Graphify : `NOT INTEGRATED`** |
| `H` | **Forge et FileTopo restent distincts** |
| `I` | **10k / 100k / 1M** sont un **protocole futur**, jamais une promesse |

## 5. Contrat de parité — amendement `P-SCALE-R1`

`P-01`, `P-02` et `P-03` reçoivent un **amendement normatif visible**, jamais
une réécriture silencieuse. Les formulations d'origine sont **conservées sous
les nouvelles**, comme `P02-R1` l'a fait.

- **`P-01`** : tous les éléments source doivent être **indexés et
  atteignables**, mais **ne sont pas requis simultanément dans la vue rendue**.
- **`P-02`** : la vue matérialisée est une **projection exacte de l'index** —
  aucune arête inventée, aucun mauvais parent; un sous-arbre **replié ou
  agrégé est déclaré comme tel, avec compte exact**.
- **`P-03`** : parent et enfants restent **consultables et navigables**, mais
  une **fratrie énorme peut être paginée ou agrégée** plutôt que rendue
  entièrement d'un coup.

**Le contrat reste à 22 exigences.** Aucune n'est supprimée, aucune n'est
affaiblie. **`P-08`** — recherche sur 100 000 nœuds — reste **entière** et
devient un **pilier du scale spike**.

## 6. Matrice — de 49 à 51 fonctions

| Changement | Détail |
|---|---|
| **`F-042`** | `ULTÉRIEUR` → **`MVP`**, motif écrit : navigation progressive **et** borne de rendu |
| **`F-050`** *(nouvelle)* | **Matérialisation progressive et vue bornée** — `MVP`, `P0` |
| **`F-051`** *(nouvelle)* | **Agrégats et méta-nœuds exacts** — `MVP`, `P0` |

**Arbitrage écrit de `F-051` en `P0`, et non `P1` :** `F-050` cache
nécessairement des éléments réels. Sans `F-051`, la vue n'a que deux façons de
traiter ce qu'elle cache — le taire, ce qui **viole `P-02` amendée**, ou
refuser de matérialiser, ce qui **annule `F-050`**. `F-051` est donc la
**contrepartie de véracité** de `F-050`, pas un enrichissement ultérieur : les
deux se livrent ensemble ou pas du tout.

Répartition après amendement : **`MVP` 44**, **`ULTÉRIEUR` 2**, **`DIFFÉRÉ` 5**,
**total 51**, `F-001` à `F-051`, **sans trou ni doublon**.

**Aucune autre fonction n'est reclassifiée.** `F-047` reste `DIFFÉRÉ`;
`F-043`, `F-044` et `F-045` restent `IMPLEMENTED` et vérifiées; **`F-046`
reste `PROPOSED`** pour son identité physique, malgré ses sous-capacités
vérifiées. **Graphify n'est ajouté comme aucune fonction.**

## 7. Séquence proposée pour la suite — aucune tâche créée

**`PROPOSED`. Aucune de ces tranches n'est créée par `TASK-0027`.**

1. **Scale spike synthétique** 10k / 100k / 1M, profil matériel gelé dans cette
   tranche-là.
2. **Progressive materializer** + budget de vue + repli/dépli/focus + agrégats.
3. **Recherche, filtres, watchers** et mise à jour incrémentale sur cette
   architecture.
4. **Permissions et équipe**, selon `DEC-0023`.
5. **Finition visuelle moderne**, seulement après stabilité fonctionnelle —
   étape `B`, dont la règle de passage est inchangée.

La **tranche design** reste explicitement prévue : design system FileTopo local
et neutre vis-à-vis des fournisseurs, skills et adapters Claude/Codex communs,
prototypes comparés, benchmark des renderers. **Aucun design ni renderer n'est
choisi ni implémenté dans `TASK-0027`.**

## 8. Validations effectuées

**Validations documentaires seulement.** Cette tâche ne produit ni ne rejoue
aucune preuve d'exécution.

| Contrôle | Résultat |
|---|---|
| Liens relatifs des trois nouveaux documents | **PASS** — chaque cible existe dans le dépôt |
| Contradiction vision / roadmap / parité / matrice / décision | **aucune trouvée** |
| `F-042` classée identiquement partout | **PASS** — `MVP` dans `FEATURE_MATRIX.md`, `REQUIREMENTS_BASELINE.md` et `DEC-0029` |
| Identifiants `F` sans trou ni doublon | **PASS** — `F-001` à `F-051` |
| Graphify présenté comme dépendance ou roadmap d'intégration | **aucune occurrence** — `NOT INTEGRATED` partout |
| Chiffre 10k / 100k / 1M présenté comme mesuré | **aucun** — tous déclarés cibles non mesurées |
| Changement sous `src/`, `src-tauri/`, `scripts/`, `docs/performance/runs/` | **aucun** |
| `X5` | **36**, inchangé |
| `origin/main` | `1a7d652c...`, **non touché** |
| `git diff --check` | **PASS** |

## 9. Règles de clôture

- Statut final exécuteur : **`IMPLEMENTED`**, jamais `VERIFIED`.
- **`DEC-0029` = `APPROVED`** — enregistrée, **jamais prouvée comme
  performance**.
- **Aucune `TASK-0028` n'est créée.**
- `NEXT_ACTION.md` demande **uniquement** le contrôle indépendant de
  `TASK-0027`.
- **Aucune modification de `X5`.**
- **Aucune fusion, PR, release, étiquette ni publication vers `main`.**
- Commit et push **uniquement** sur
  `build/v0.2-a11-progressive-scale-architecture`.

## 10. Non testé, limites et réserves

- **Performance 10k / 100k / 1M non mesurée.** Aucun benchmark n'a été exécuté.
- **Materializer, budget de vue, LOD et agrégats non implémentés.** Ils
  n'existent que comme cibles écrites.
- **`MAX_NODES_PER_MAP` reste à `5_000`** dans le code : rien n'a été modifié.
- **Aucune suite de tests rejouée**, aucun build Tauri, aucun `pnpm build`,
  aucun replay WebView2. La tâche ne touche aucun code, donc aucune régression
  d'exécution n'est possible ni contrôlée.
- **Graphify non intégré par décision produit.**
- **`F-046`** reste `PROPOSED` : identité physique persistante absente,
  `DEC-0013/F` bloquante.
- La garantie **`X10` race-safe hors Windows** reste non prouvée.
- La réserve **`R8`** reste entière : aucun chiffre de performance publiable
  avant l'étape `C`, dans un véritable hôte WebView2.

## 11. Résultat livré

Trois documents créés, onze amendés, **aucune ligne de code produit touchée**.
La frontière d'architecture de mise à l'échelle est écrite, la parité est
amendée sans perte d'exigence, la matrice passe à 51 fonctions cohérentes, et
la roadmap porte une séquence `PROPOSED` sans qu'aucune tâche soit créée.

`TASK-0027` est **`IMPLEMENTED`** et **attend un contrôle indépendant**, rendu
par une instance **distincte de l'exécuteur**, **sur preuves**.
