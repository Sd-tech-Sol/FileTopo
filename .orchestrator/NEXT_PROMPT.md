# NEXT_PROMPT — TASK-0027 / Progressive Scale Architecture Realignment

**TARGET_AGENT:** CLAUDE  
**STATUS:** READY  
**OWNER:** orchestrateur technique  
**TASK:** `TASK-0027 — Progressive Scale Architecture Realignment`  
**MODE:** documentaire / architecture uniquement — AUCUNE implémentation produit

## /goal

Enregistrer la décision produit approuvée après réévaluation de FileTopo à grande échelle : **FileTopo indexe grand, matérialise petit et ne rend que le contexte utile**.

Le but fondamental ne change pas : application de bureau locale, légère, généraliste, pensée notamment pour de très grands cerveaux numériques et environnements documentaires d’entreprise, utilisable sur un laptop/PC ordinaire **sans GPU puissant**, sans LLM, API cloud, compte ou envoi de documents.

`Graphify` **n’est pas intégré** : aucune dépendance, aucun runtime, aucun adaptateur MVP. Les concepts utiles observés peuvent inspirer FileTopo, mais sont réimplémentés seulement si un besoin FileTopo réel le justifie. `Forge` reste un projet entièrement distinct.

Cette tâche **écrit la nouvelle frontière d’architecture et la roadmap. Elle ne code rien.**

---

## 0 — synchronisation / branche

1. Appliquer les protocoles du dépôt.
2. `git fetch origin`.
3. Branche de départ : `build/v0.2-a10-exact-duplicate-explorer`.
4. Fast-forward uniquement jusqu’au commit d’orchestration contenant ce prompt.
5. Son parent direct doit être `ffa950452e78cc2fc39678d9d0819527e3a12b21`.
6. `TASK-0026 = VERIFIED`, `ACTION-0043 = CLOSED`, X5 = **36**.
7. Les deux `TASK-0026-ED15-*` sont scellées; aucun JSON de preuve ne doit être touché.
8. `origin/main = 1a7d652ca48281c1687f6d1404c56a1404df91d8`, commit propriétaire documentaire « update canonical GitHub identity », descendant direct de `91bbe90f...`. C’est la nouvelle baseline externe de `main`; **ne pas la reset, merger, cherry-pick ni modifier dans cette tâche**.
9. Identité canonique du dépôt : `Sd-tech-Sol/FileTopo`.
10. Créer/publier la branche : `build/v0.2-a11-progressive-scale-architecture`.
11. Arbre propre avant écriture.

Si TASK-0027 ou DEC-0029 existent déjà, si X5 ≠ 36, ou si le checkout diverge autrement : STOP / BLOCKED.

---

## 1 — nature de TASK-0027

Créer :

- `docs/tasks/TASK-0027-progressive-scale-architecture-realignment.md`
- `docs/decisions/DEC-0029-progressive-materialization-and-scale-boundary.md`
- `docs/architecture/PROGRESSIVE_SCALE_ARCHITECTURE.md`

TASK-0027 est **DOCUMENTAIRE**. Aucun fichier produit sous `src/`, `src-tauri/`, aucun script de campagne, aucun schéma SQLite, aucune dépendance, aucun benchmark exécuté, aucun WebView2 replay, aucun X5.

Statut final exécuteur : `IMPLEMENTED`, jamais `VERIFIED`.

---

## 2 — décisions architecture à enregistrer

### A. Corpus ≠ vue rendue

Figer explicitement :

- le **corpus complet** vit dans l’index local durable (SQLite / stores FileTopo);
- le **graphe logique** existe dans les données, pas dans le SVG/DOM/canvas;
- le frontend reçoit une **vue matérialisée bornée** seulement;
- la taille totale du cerveau ne doit pas entraîner proportionnellement la même charge de rendu;
- `1 élément indexé` signifie `1 entité accessible`, **pas** `1 carte simultanément rendue`;
- le plafond actuel `MAX_NODES_PER_MAP = 5000` est une limite de tranche historique, **pas une limite produit de corpus**;
- un futur budget de matérialisation/remplissage de vue remplace la logique « tout rendre ou refuser ».

Architecture cible à documenter :

```text
Sources read-only
    ↓
Index complet local / SQLite
    ↓
Graphe logique + relations + états
    ↓
Query engine borné
    ↓
Progressive materializer
    ↓
Sous-graphe / agrégats utiles
    ↓
Layout de cette vue seulement
    ↓
Renderer borné
```

### B. Navigation progressive

Le coût doit suivre le **contexte courant**, pas le corpus complet.

Une vue matérialisée peut contenir : focus courant, ancêtres nécessaires, enfants utiles/paginés, frères pertinents, relations sélectionnées et agrégats/méta-nœuds.

`F-042 — repli/dépli et focus` cesse d’être un confort ultérieur : **le promouvoir explicitement au MVP**, car il devient aussi une primitive de performance et de navigation.

### C. Agrégats / méta-nœuds

Ajouter une capacité produit explicite à la matrice (nouvel identifiant libre après F-049, normalement `F-050` ou `F-051` selon ce que la fiche décide proprement) pour représenter un sous-ensemble non matérialisé sans mentir.

Distinguer en mots et dans le modèle :

- dossier/hiérarchie réelle = fait source;
- agrégat/méta-nœud FileTopo = résumé calculé exact d’éléments cachés;
- communauté calculée éventuelle = classification dérivée;
- suggestion = hypothèse non établie.

Un agrégat doit porter des comptes exacts et une provenance/raison de regroupement; il ne devient jamais un faux dossier.

### D. Query engine borné

Documenter comme primitive d’architecture : enfants/ancêtres, voisinage relationnel, chemin entre nœuds, recherche, filtres, agrégats — requêtes bornées/paginées/cursorisées côté Rust/SQLite. Le frontend ne reçoit jamais un whole-graph JSON géant.

Ne pas inventer une API finale; décrire les contrats conceptuels et bornes.

### E. Layout / renderer

Le layout `layered-tree-cards-v1` reste une preuve valide pour une vue bornée, mais **ne doit plus être calculé comme obligation sur tout le corpus**.

Ne choisir maintenant ni React Flow, ni ELK, ni Sigma, ni Cytoscape, ni Pixi comme renderer final. Ils restent des candidats futurs à benchmarker.

Le fonctionnement de base **ne peut pas dépendre d’un GPU puissant ou de WebGL**. Une accélération GPU peut être optionnelle plus tard; l’expérience fonctionnelle doit rester possible sur machine modeste grâce au budget de vue.

### F. Hash / analyses lourdes

Conserver les observations SHA-256 déjà vérifiées, mais préciser pour grande échelle :

- métadonnées/index structurel = chemin automatique principal;
- hash contenu = campagne explicite / arrière-plan / périmètre sélectionnable;
- ne pas imposer le hachage automatique d’un cerveau de 1M fichiers à l’ouverture;
- aucune lecture forcée de placeholders/cloud juste pour enrichir la carte.

### G. Graphify

Décision explicite : **NOT INTEGRATED**.

- aucune dépendance Graphify/Python/NetworkX;
- aucun `graph.json` global comme stockage FileTopo;
- aucun dashboard Graphify comme UI;
- aucun pipeline LLM obligatoire;
- aucune communauté globale obligatoire à l’ouverture.

Conserver seulement comme enseignements/concepts : graphe logique interrogeable indépendamment du renderer; expansion progressive; agrégation/communautés possibles; analyse AST facultative future. Si FileTopo a plus tard besoin d’AST, communautés ou MCP, il pourra employer une bibliothèque spécialisée ou sa propre implémentation, par tranche dédiée.

### H. Forge

Écrire explicitement : **Forge et FileTopo restent deux projets distincts**, sans dépendance runtime ni fusion de produit. Forge peut servir au processus de développement/skills, jamais au fonctionnement de FileTopo.

---

## 3 — contrat de parité à réaligner sans affaiblir la vérité

Mettre à jour `docs/product/CARTETOPO_FUNCTIONAL_PARITY.md` par amendements normatifs visibles, jamais réécriture silencieuse.

Au minimum, corriger les points incompatibles avec un rendu progressif :

- **P-01** : tous les éléments source doivent être indexés/atteignables, mais ne sont pas requis simultanément dans la vue rendue;
- **P-02** : la vue matérialisée est une projection exacte de l’index; aucune arête inventée, aucun mauvais parent; un sous-arbre replié/agrégé est déclaré comme tel avec compte exact;
- **P-03** : parent/enfants restent consultables et navigables, mais une fratrie énorme peut être paginée/agrégée plutôt que rendue entièrement d’un coup.

Conserver les anciennes formulations pour historique, comme `P02-R1` l’a fait. Ne supprimer aucune exigence; le contrat reste à 22 exigences.

`P-08` recherche sur 100 000 nœuds reste entière et devient un pilier du scale spike.

---

## 4 — matrice / nouvelles capacités

Mettre à jour `docs/product/FEATURE_MATRIX.md` et, si nécessaire pour cohérence, `docs/product/REQUIREMENTS_BASELINE.md`.

Décisions minimales :

- `F-042` : `ULTÉRIEUR` → **MVP**, avec motif explicite : navigation progressive + borne de rendu;
- ajouter **Progressive materialization / bounded view** comme fonction MVP P0;
- ajouter **agrégats / méta-nœuds exacts** comme fonction MVP (P0/P1 selon arbitrage écrit);
- ne pas ajouter Graphify comme fonction;
- `F-047` IA reste DEFERRED;
- F-043/F-044/F-045 restent implémentées/vérifiées;
- F-046 reste PROPOSED pour son identité physique, malgré ses sous-capacités vérifiées.

Ne reclassifier aucune autre fonction sans nécessité démontrée.

---

## 5 — échelle 10k / 100k / 1M : protocole futur, PAS des promesses

Documenter trois niveaux de validation à exécuter dans la tranche suivante :

- **10 000** éléments : cible de confort sur laptop/desktop ordinaire;
- **100 000** : cible MVP sérieuse, notamment recherche exacte/paginée;
- **1 000 000** : cible architecturale / spike obligatoire avant toute promesse produit.

Ne publier aucun chiffre comme performance acquise. Les budgets historiques de `phase-2-architecture.md` restent des hypothèses/critères de rejet historiques, pas des résultats.

Le futur scale spike doit mesurer au minimum :

- temps d’index/reconstruction synthétique;
- taille SQLite / mémoire processus;
- latence recherches et requêtes de voisinage;
- latence de matérialisation d’une vue;
- nombre de nœuds/arêtes effectivement envoyés au frontend;
- temps de layout de la vue bornée;
- interactivité/pan/zoom/sélection sur machine modeste;
- comportement sans GPU puissant;
- aucune croissance du nombre rendu proportionnelle au corpus.

Le profil matériel exact du benchmark doit être gelé dans la prochaine tâche, pas inventé ici; viser la classe « Windows laptop/desktop ordinaire, RAM modeste, iGPU ou GPU faible ».

---

## 6 — roadmap future à proposer

Mettre à jour `PROJECT_VISION.md`, `ROADMAP.md` et `docs/architecture/ARCHITECTURE_BASELINE.md` par amendement/renvoi, en préservant l’historique.

Séquence proposée après TASK-0027, **sans créer ces tâches** :

1. scale spike synthétique 10k / 100k / 1M;
2. progressive materializer + budget de vue + repli/dépli/focus + agrégats;
3. recherche/filtres/watchers et mise à jour incrémentale sur cette architecture;
4. permissions/équipe selon décisions existantes;
5. finition visuelle moderne seulement après stabilité fonctionnelle.

La future tranche design reste explicitement prévue : design system FileTopo local/provider-neutral, skills/adapters Claude/Codex communs, prototypes comparés et benchmark des renderers. **Aucun design/renderer n’est choisi ni implémenté dans TASK-0027.**

---

## 7 — documents durables

Mettre à jour uniquement ce qui est nécessaire et cohérent :

- `PROJECT_VISION.md`
- `ROADMAP.md`
- `docs/architecture/ARCHITECTURE_BASELINE.md` (amendement/renvoi; ne pas effacer l’historique)
- `docs/architecture/PROGRESSIVE_SCALE_ARCHITECTURE.md` (nouveau)
- `docs/product/CARTETOPO_FUNCTIONAL_PARITY.md`
- `docs/product/FEATURE_MATRIX.md`
- `docs/product/REQUIREMENTS_BASELINE.md` si la classification F-042 y est normative
- `docs/tasks/TASK-0027-progressive-scale-architecture-realignment.md`
- `docs/decisions/DEC-0029-progressive-materialization-and-scale-boundary.md`
- `docs/ai/CURRENT_STATE.md`
- `docs/ai/NEXT_ACTION.md`
- `docs/ai/HANDOFF.md`
- `docs/ai/VALIDATION.md`
- `docs/ai/CHANGELOG_AI.md`
- `.orchestrator/RESULT.md`

Ne modifier aucun ancien JSON de preuve, aucun code produit, aucun README sauf nécessité stricte liée à un lien cassé — sinon laisser `main` porter ses changements d’identité.

---

## 8 — validation documentaire

Avant clôture :

- liens relatifs des nouveaux docs cohérents;
- aucune contradiction entre vision / roadmap / parité / matrice / décision;
- `F-042` classée de façon identique partout;
- nouveaux identifiants F sans trou/doublon;
- aucun `Graphify` présenté comme dépendance ou roadmap d’intégration;
- aucun chiffre 10k/100k/1M présenté comme résultat mesuré;
- aucun changement sous `src/`, `src-tauri/`, scripts ou `docs/performance/runs/`;
- X5 toujours 36;
- `origin/main` toujours `1a7d652c...` et non touché;
- `git diff --check` PASS.

Si le réalignement exige finalement du code pour être cohérent : STOP / BLOCKED et explique pourquoi. Ne code pas.

---

## 9 — clôture

Si tout est cohérent :

- `TASK-0027 = IMPLEMENTED`, contrôle indépendant requis;
- `DEC-0029 = APPROVED/IMPLEMENTED` selon la convention documentaire du dépôt, mais jamais « prouvée » comme performance;
- aucune TASK-0028 créée;
- `NEXT_ACTION.md` demande uniquement le contrôle indépendant de TASK-0027;
- aucune modification X5;
- aucune fusion/PR/release/tag/main.

`.orchestrator/RESULT.md` :

```text
TASK_ID: TASK-0027
AGENT: CLAUDE
RESULT: DONE | BLOCKED | FAILED
BRANCH: build/v0.2-a11-progressive-scale-architecture
FINAL_HEAD: <commit final>

SUMMARY:
-

VALIDATIONS:
-

IMPORTANT_FILES:
-

COMMIT:
PUSHED: yes/no

LIMITS_OR_BLOCKERS:
- performance 10k/100k/1M not yet measured
- materializer/LOD/meta-nodes not yet implemented
- Graphify not integrated by product decision
- F-046 physical identity remains blocked by DEC-0013/F

NEXT_ORCHESTRATOR_DECISION:
- independent control of TASK-0027, then scale spike
```

Commit/push uniquement sur `build/v0.2-a11-progressive-scale-architecture`.
