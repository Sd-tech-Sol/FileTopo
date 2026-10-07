# NEXT_PROMPT — TASK-0054 — Progressive Scale & Exact Aggregate Global Closure

**TARGET_AGENT:** CLAUDE CODE
**RECOMMENDED_MODEL:** Claude Sonnet 5.5
**RECOMMENDED_EFFORT:** High
**STATUS:** READY
**BRANCH:** `build/v0.2-a38-v1-scale-closure`
**BASE_ORCHESTRATION:** `befd86a73216131eae9675961a758c1df73bffa1`

## Instruction de départ

Synchronise cette branche **en fast-forward seulement**, vérifie que l'arbre est
propre, puis lis et exécute intégralement :

1. `AGENTS.md`;
2. `docs/reviews/ACTION-0100-v1-gap-audit-after-task0053.md`;
3. `docs/tasks/TASK-0054-v1-progressive-scale-closure.md`;
4. `DEC-0029`, `DEC-0031`;
5. `TASK-0028/ACTION-0045`;
6. `TASK-0030/ACTION-0047`.

**Tu peux faire `/clear` avant cette tâche.** Elle est autonome et tout le
contexte obligatoire est versionné dans le repo.

## Mission

Rendre `F-050` et `F-051` candidates à une fermeture globale indépendante,
en réutilisant le materializer/projection/agrégats actuels et en construisant
les preuves manquantes sur le runtime V1 courant.

Ne réarchitecture pas FileTopo.

## Reuse-first obligatoire

Avant de modifier du code produit, fais un tableau :

- EXISTE / RÉUTILISER;
- ADAPTER / INTÉGRER;
- MANQUANT / DÉVELOPPER.

Inspecte au minimum :

- Index/BrainIndex;
- `map_view` / materializer / projection;
- `ViewAggregate`;
- `children_page` / recherche;
- REAL_ROOT;
- MapApp/MapView;
- branch focus/collapse;
- scripts TASK-0028 et TASK-0030;
- harness WebView2/CDP/axe récent.

**Aucune nouvelle dépendance** sauf nécessité démontrée et arrêt pour décision
orchestrateur. N'ajoute ni renderer, ni store, ni service.

## Règle principale

Le premier objectif est de **prouver l'existant**, pas de le réécrire.

Si un critère passe déjà :
- ajoute seulement la garde/preuve discriminante nécessaire.

Si un critère échoue :
- corrige le minimum;
- ajoute un test qui échoue sur l'ancien comportement;
- ne déborde pas vers F-046 ou une autre fonction.

## Échelle

Exerce le cœur produit sur 10k / 100k / 1M éléments **indexés synthétiques**.

Ne crée pas 1M fichiers physiques.

Mesure et vérifie :
- cardinalité Index;
- VIEW_BUDGET;
- nœuds/agrégats/arêtes;
- taille sérialisée;
- layout seulement sur vue;
- absence whole-graph;
- cursors/revision;
- couverture/atteignabilité.

Réutilise les fixtures/protocoles TASK-0028/0030 lorsqu'ils restent valides.

## Atteignabilité

Ne prouve pas seulement quelques échantillons UI.

Établis structurellement que les primitives bornées couvrent le corpus :
pagination exacte, recherche exacte, navigation vers hors-vue, expansion/focus,
résolution d'une destination.

Toute omission ou duplication doit faire échouer la preuve.

## Agrégats

Prouve sur large/profond/mixte :
- compte exact;
- raison lisible;
- pas faux dossier;
- pas path/open/copy;
- pas arête inventée;
- expansion/pagination exacte;
- distinct de F-042 collapse.

Ajoute une falsification count +1/-1.

## REAL_ROOT

Utilise une racine temporaire synthétique, jamais une donnée personnelle.

Prouve bout-en-bout :
`REAL_ROOT -> Index canonique -> map_view/materializer -> MapApp`.

Vérifie source inchangée avant/après.

## WebView2 GPU-disabled

Réutilise le harness réel actuel.

Passe normale + passe avec :

`WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--disable-gpu`

Microsoft documente ce mécanisme et ce flag :
https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/webview-features-flags

Mais **ne considère pas la variable comme preuve** : vérifie de façon
discriminante que le run observé applique effectivement la configuration.

Exerce pan/zoom/sélection/clavier/navigation/agrégat + axe + console.

Ne revendique aucun SLA sur laptop modeste.

## Interdictions

- pas de whole-graph DTO;
- pas de second corpus;
- pas de nouveau renderer;
- pas de cloud/LLM/MCP;
- pas de F-046;
- pas de données personnelles;
- pas de TASK-0055;
- pas de VERIFIED auto-attribué.

## Falsifications

Réalise les 11 falsifications de TASK-0054 §11. Une table « on pense que ça
échouerait » n'est pas suffisante : chaque garde doit être concrète.

## Validation et artefacts

Exécute TASK-0054 §13.

Crée des artefacts TASK-0054 lisibles et liés au HEAD réellement testé.
Distingue clairement :
- preuves Rust;
- preuves frontend;
- preuves WebView2 normal;
- preuves WebView2 GPU-disabled;
- résultats d'exécuteur;
- NOT_TESTED.

Aucun chemin personnel ou secret.

## Fin

Quand tout est terminé :

- TASK-0054 = IMPLEMENTED / candidate;
- F-050/F-051 = candidates seulement;
- P-01/P-02/P-03 candidates seulement si réellement couvertes;
- F-046 inchangée;
- RESULT + VALIDATION + CURRENT_STATE + HANDOFF + NEXT_ACTION à jour;
- commit/push;
- git status propre;
- STOP.

Le prochain geste appartient à ChatGPT : contrôle indépendant.
