# CHANGELOG_AI.md — Journal des interventions d'agents

Ordre chronologique, du plus ancien au plus récent. Une entrée par intervention.

---

## 2026-08-25 — TASK-0001 — Amorçage de la mémoire (phase 0)

**Agent :** exécuteur Claude Code
**Statut à l'issue :** `VERIFIED` (livré `IMPLEMENTED`, puis vérifié par
l'orchestrateur sur preuves le 2026-08-25)

### Fait

- Création des règles de travail : `AGENTS.md` et `CLAUDE.md` (contenu
  identique) — périmètre au dépôt, lecture seule des documents utilisateur,
  une seule tâche `IN_PROGRESS`, preuves obligatoires, GO humain avant étape
  importante.
- Création de `PROJECT_VISION.md` : application publique, générale, gratuite,
  MIT sous réserve de vérification, carte topographique locale, Windows d'abord,
  MVP hors ligne sans IA, collections indépendantes, surveillance incrémentale,
  accessibilité FR/EN, non-destruction.
- Création de `ROADMAP.md` : phases 0 à 7, phase 0 seule engagée.
- Création de `README.md` : dépôt local d'amorçage, nom de dossier provisoire,
  aucune fonction terminée, création originale de Sébastien Dubé, aucune adresse
  de dépôt public inventée.
- Création de `docs/ai/` : `START_HERE.md`, `OPERATING_MANUAL.md`,
  `CURRENT_STATE.md`, `NEXT_ACTION.md`, `HANDOFF.md`, `VALIDATION.md`,
  `CHANGELOG_AI.md`.
- Création de `docs/tasks/TASK-0001-phase-0-bootstrap.md`.
- Création de `docs/decisions/README.md` et `docs/performance/README.md`.
- Création de `graph/project_graph.yaml`, `graph/current_state.yaml`,
  `graph/history.jsonl` (schémas minimaux versionnés).
- Création de `tests/fixtures_synthetic/README.md` : aucune donnée réelle
  autorisée.

### Non fait, volontairement

- Aucun code applicatif, aucune dépendance, aucune installation.
- Aucun accès réseau, aucune publication, aucun commit.
- Aucune recherche, aucune architecture, aucun prototype.
- Aucun choix de nom public, de licence ni de pile technologique.

### Vérifié par l'orchestrateur (2026-08-25)

19 fichiers, absence de référence privée, encodage UTF-8, syntaxe du JSONL et
des deux YAML, état Git local. Avertissement Git **non bloquant** : fichier
d'exclusion global inaccessible, sans effet sur la lecture de l'état local.

### Non testé

Fins de ligne sur le disque, cohérence des liens relatifs. Détail dans
`VALIDATION.md`.

---

## 2026-08-25 — TASK-0001 — Correction du vocabulaire d'états

**Agent :** exécuteur Claude Code
**Motif :** non-conformité relevée par l'orchestrateur — emploi de `VALIDATED`
et `NOT_STARTED`, hors des huit états permis.

- Les huit états permis (`PROPOSED`, `APPROVED`, `IN_PROGRESS`, `BLOCKED`,
  `IMPLEMENTED`, `VERIFIED`, `REJECTED`, `DEFERRED`) et leur sens sont inscrits
  dans `AGENTS.md`, `CLAUDE.md`, `OPERATING_MANUAL.md` et
  `graph/project_graph.yaml`.
- `VALIDATED` → `VERIFIED` ; `human_validated` → `verified`.
- Phase 0 et TASK-0001 → `VERIFIED`, sur preuves de l'orchestrateur.
- Phase 1 → `PROPOSED` ; phases 2 à 7 → `DEFERRED`.
- `VALIDATION.md`, `graph/current_state.yaml` et `graph/history.jsonl` portent
  les preuves réelles de la vérification.

Aucun fichier créé, aucun fichier supprimé. `NEXT_ACTION.md` inchangé : une
seule action, `ACTION-0002`, `PROPOSED`, GO requis. **Aucun travail de phase 1
n'a démarré.**

### Suite

`ACTION-0002` dans `NEXT_ACTION.md` : préparer la recherche de phase 1.
`PROPOSED`, **GO humain requis**, sans exécution de la recherche.

---

## 2026-08-25 — Correction documentaire : alignement sur le prompt maître

**Agent :** exécuteur Claude Code
**Motif :** non-conformités relevées entre la documentation existante et le
prompt maître (intitulés de phases, éléments de vision manquants, vocabulaire
d'états hors gabarits de décisions/performance).

- `ROADMAP.md` : intitulés des huit phases corrigés — 0 Isolation et
  démarrage (`VERIFIED`), 1 Recherche et positionnement (`PROPOSED`), 2
  Architecture, 3 Squelette vérifiable, 4 MVP local sans IA, 5 Préparation
  publique, 6 Publication (GO humain spécial obligatoire), 7 Fonctions
  avancées facultatives (`DEFERRED`). Nom public et licence rattachés à la
  phase 1 ; pile technologique et mode de rendu rattachés à la phase 2.
  Contenus décrits comme envisagés, non comme exécutés.
- `PROJECT_VISION.md` : ajout des éléments de vision absents — cerveaux
  nommés/colorés/iconisés, navigation/recherche/filtre de la carte
  progressive, ouverture des fichiers et dossiers via Windows, état vu/non
  vu, MVP sans compte/clé/abonnement/télémétrie obligatoire, index
  reconstructible et versionné, exclusions sûres, surveillance incrémentale,
  fichiers en ligne seulement non téléchargés automatiquement, robustesse
  Windows, mode de rendu (SVG/Canvas/WebGL) non décidé avant comparaison,
  IA/OCR/connecteurs distants comme fonctions futures, facultatives et
  explicites. La non-destruction est reformulée comme règle du MVP (« par
  défaut »), sans clause « sans exception » présentée comme permanente ; une
  fonction future de classement virtuel avec aperçu, simulation,
  confirmation, journal et restauration est mentionnée comme hypothèse non
  décidée.
- `docs/ai/CURRENT_STATE.md` et `docs/ai/HANDOFF.md` : mis en cohérence avec
  les nouveaux intitulés de phases et de vision.
- `docs/decisions/README.md` : le gabarit remplace `ACCEPTED`/`SUPERSEDED`
  par les huit états permis et ajoute un champ `replaced_by` séparé.
- `docs/performance/README.md` : le gabarit remplace le statut
  `MESURÉ`/`NON TESTÉ` par un état permis, avec un champ `Résultat` distinct
  (mesuré / non testé) pour le constat textuel.
- `graph/project_graph.yaml` : intitulés des phases 0 à 7 et cibles des
  questions ouvertes (Q-001, Q-002 → phase 1 ; Q-003, Q-004 → phase 2)
  alignés sur `ROADMAP.md`.
- `graph/history.jsonl` : événement `documentation_corrected` ajouté en fin
  de fichier, sans suppression d'événement existant.

### Non modifié

`TASK-0001` reste `VERIFIED` avec ses preuves réelles (19 fichiers), et
`ACTION-0002` reste seule action, `PROPOSED`, dans `NEXT_ACTION.md`. Aucun
fichier créé, aucun accès réseau, aucune dépendance, aucun commit, aucun
travail de phase 1.

---

## 2026-08-25 — TASK-0002 — Préparation de la recherche de phase 1

**Agent :** exécuteur Claude Code
**Statut à l'issue :** `PROPOSED`

### Fait

- Lecture préalable de `AGENTS.md`, `docs/ai/START_HERE.md`,
  `docs/ai/OPERATING_MANUAL.md`, `docs/ai/CURRENT_STATE.md`,
  `docs/ai/NEXT_ACTION.md`, `PROJECT_VISION.md`, `ROADMAP.md`, ainsi que
  `TASK-0001`, `HANDOFF.md`, `VALIDATION.md`, `graph/project_graph.yaml`,
  `graph/current_state.yaml`, `graph/history.jsonl`,
  `docs/decisions/README.md`, `docs/performance/README.md`.
- Création de `docs/tasks/TASK-0002-phase-1-research-and-positioning.md`
  (`PROPOSED`) : objectif unique, répertoire autorisé, fichiers à lire,
  fichiers créables ou modifiables lors de l'exécution future, dix
  interdictions, livrables, méthode en huit sous-sections (analyse sourcée de
  GraphRAG Workbench avec quatorze questions explicites, comparaison de
  solutions réellement comparables, public cible et limites du MVP sans IA,
  recherche de plusieurs noms publics candidats sans réservation,
  vérification des termes de MIT et d'une alternative, tableau des sources,
  distinction faits/inférences/recommandations/incertitudes, recommandation
  finale soumise à décision humaine), tests et validations prévus, quatorze
  critères d'acceptation, conditions d'arrêt, et format du rapport final
  attendu.
- Mise à jour de `docs/ai/CURRENT_STATE.md` : ajout de TASK-0002
  `PROPOSED` au tableau des tâches, aucune tâche `IN_PROGRESS`, précision que
  la recherche n'est pas exécutée, ajout de `docs/research/` (dossier pas
  encore créé) à l'inventaire.
- Remplacement de `docs/ai/NEXT_ACTION.md` par `ACTION-0003` (action unique,
  `PROPOSED`) : demander le GO humain pour approuver et exécuter TASK-0002 ;
  la recherche n'est pas lancée par cette action.
- Mise à jour de `docs/ai/HANDOFF.md` en cohérence avec TASK-0002 et
  `ACTION-0003`.
- Correction de `docs/ai/START_HERE.md` : la règle réseau absolue
  (« tout accès réseau interdit ») est remplacée par une règle conditionnelle
  — accès réseau interdit sans GO humain, mais permis en lecture seule et de
  façon bornée pour une tâche de recherche explicitement approuvée.
- Mise à jour de `graph/project_graph.yaml` : ajout de TASK-0002 à la liste
  des tâches et à la phase 1 ; `next_action` mis à jour vers `ACTION-0003`.
- Mise à jour de `graph/current_state.yaml` : ajout de TASK-0002 `PROPOSED`,
  `next_action` mis à jour vers `ACTION-0003`.
- Ajout, en fin de `graph/history.jsonl` (append-only, aucune ligne
  existante modifiée), des événements `task_proposed` (TASK-0002),
  `next_action_proposed` (ACTION-0003) et `documentation_corrected`
  (règle réseau de `START_HERE.md`).

### Non fait, volontairement

- **Aucune recherche exécutée.** Aucune source consultée, aucun accès
  réseau effectué, aucun nom candidat identifié, aucune conclusion de
  licence, aucune comparaison de solutions menée.
- `docs/research/phase-1-research-and-positioning.md` n'a **pas** été créé :
  c'est le livrable de l'exécution future de TASK-0002, après GO.
- Aucun choix de nom public, de licence ou de pile technologique.
- Aucun code applicatif, aucune dépendance, aucun commit, aucune publication.

### Vérifié par l'agent exécuteur (lecture directe, non indépendante)

- `docs/tasks/TASK-0002-*.md` créé et lu après écriture : présent, structuré
  selon le gabarit demandé.
- `docs/ai/NEXT_ACTION.md` : une seule action, `ACTION-0003`, `PROPOSED`.
- `graph/current_state.yaml` et `graph/project_graph.yaml` : syntaxe YAML
  relue visuellement après édition, cohérente avec les autres fichiers.
- `graph/history.jsonl` : lignes 1 à 8 non modifiées ; nouvelles lignes
  ajoutées après la ligne 8 uniquement.
- Aucune référence à un projet privé introduite.

### Non testé

- Analyse syntaxique automatisée des fichiers YAML et JSONL modifiés (relue
  à l'œil, non passée dans un analyseur).
- Vérification indépendante par l'orchestrateur : non effectuée à ce stade.

### Suite

`ACTION-0003` dans `NEXT_ACTION.md` : demander le GO humain pour approuver
et exécuter TASK-0002 (recherche de phase 1). **Aucune recherche n'a
démarré.**

---

## 2026-08-25 — TASK-0002 — Correction de la fiche : alignement sur les quatorze questions du prompt maître

**Agent :** exécuteur Claude Code
**Motif :** la section 7.1 de `TASK-0002-phase-1-research-and-positioning.md`
contenait quatorze questions techniques inventées (objectif, licence,
mainteneur, activité, architecture, dépendance IA, hors ligne, plateformes,
etc.) qui ne correspondaient pas aux quatorze questions obligatoires du
prompt maître.

### Fait

- `docs/tasks/TASK-0002-phase-1-research-and-positioning.md`, section 7.1 :
  la liste numérotée des quatorze questions inventées est remplacée par les
  quatorze questions exactes du prompt maître (même besoin, fonctions
  semblables, différences fondamentales, simplicité/légèreté/accessibilité,
  ce que GraphRAG fait mieux, remplacement complet possible, usage en moteur
  ou module facultatif, idées reprenables légalement, reconstruction
  inutile, valeur distincte de l'approche topographique, caractère facultatif
  de GraphRAG, obligations de licence/attribution, éviter l'apparence de
  copie, positionnement public distinct).
- Les éléments factuels auparavant listés comme questions (objectif,
  licence, architecture, activité, dépendances, hors ligne, plateformes,
  limites) sont conservés, reformulés comme « éléments factuels à relever »
  au service des quatorze questions, et non comme questions à part entière.
- Chaque question est explicitement assortie de l'exigence : faits sourcés,
  inférences signalées comme telles, incertitudes marquées.
- Critère d'acceptation n°2 et étape de vérification de la section 8
  reformulés en cohérence avec les quatorze questions du prompt maître.

### Non fait, volontairement

- Aucune recherche exécutée, aucun résultat, aucun nom candidat, aucune
  conclusion ajoutée.
- Aucune autre exigence de la fiche supprimée (méthode 7.2 à 7.8, tests,
  critères d'acceptation restants, conditions d'arrêt, format du rapport :
  inchangés).
- Aucune ligne existante de `graph/history.jsonl` modifiée ; ajout en fin de
  fichier uniquement.

### Suite

`ACTION-0003` dans `NEXT_ACTION.md` reste l'action unique, `PROPOSED` : GO
humain requis pour approuver et exécuter TASK-0002. Aucune recherche n'a
démarré.

---

## 2026-08-25 — Mise à jour administrative : autorisation permanente

**Agent :** orchestrateur (mise en cohérence documentaire)
**Motif :** l'utilisateur remplace l'obligation de GO répété par une
autorisation permanente : l'orchestrateur mène le projet de bout en bout de
façon autonome, ne demandant que lorsqu'une ambiguïté réelle ou une
information/clé indispensable manque, une dépense est en jeu, une action
destructive sur des documents utilisateur est envisagée, ou une action
externe sort de l'objectif. Claude Code demeure l'exécuteur principal. Aucune
activation automatique d'un portefeuille payant Anthropic ni de dépense
externe sans instruction explicite.

### Fait

- `AGENTS.md` et `CLAUDE.md` : section 5 réécrite en « Autorisation
  permanente et points d'arrêt », contenu identique dans les deux fichiers.
  Les sections 1 (périmètre) et 2 (lecture seule des documents utilisateur)
  restent inchangées.
- `docs/ai/START_HERE.md` : règle 5 des cinq règles réécrite ; règle réseau
  de la section 5 (« Ce qui est interdit ») reformulée — la lecture seule de
  sources publiques pour une tâche de recherche documentée est désormais
  couverte par l'autorisation permanente, sans GO répété par tâche.
- `docs/ai/OPERATING_MANUAL.md` : section 4 réécrite en « Autorisation
  permanente et points d'arrêt » ; étape 3 du cycle de session (section 1)
  mise en cohérence.
- `docs/ai/CURRENT_STATE.md` : résumé et section « Tâches » mis à jour —
  TASK-0002 `PROPOSED` → `APPROVED` ; phase 1 `PROPOSED` → `APPROVED` ;
  mention explicite de l'autorisation permanente et de ses limites.
- `docs/ai/NEXT_ACTION.md` : `ACTION-0003` reformulée en « Exécuter
  TASK-0002 », statut `APPROVED`, sans demande de GO.
- `docs/ai/HANDOFF.md` : réécrit en cohérence avec l'autorisation permanente
  et le statut `APPROVED` de TASK-0002.
- `docs/tasks/TASK-0002-phase-1-research-and-positioning.md` : statut
  `PROPOSED` → `APPROVED` ; en-tête et section 12 (rapport de préparation)
  mis à jour pour refléter l'autorisation permanente, sans GO distinct.
- `graph/project_graph.yaml` : phase 1 et `TASK-0002` → `APPROVED` ;
  `network_access` de TASK-0002 précisé comme couvert par l'autorisation
  permanente.
- `graph/current_state.yaml` : `TASK-0002` → `APPROVED` ; `next_action`
  (`ACTION-0003`) → `APPROVED`.
- `graph/history.jsonl` (ajout seul, aucune ligne existante modifiée) :
  ajout d'un événement `policy_updated` documentant l'autorisation
  permanente et le passage de TASK-0002/`ACTION-0003` à `APPROVED`.

### Non fait, volontairement

- **Aucune recherche exécutée.** TASK-0002 est `APPROVED`, pas
  `IN_PROGRESS` : cette mise à jour ne lance pas la recherche elle-même.
- **Aucune tâche `IN_PROGRESS`** ouverte par cette mise à jour.
- Aucun code applicatif, aucune dépendance, aucun commit, aucune
  publication, aucun accès réseau effectué.
- `ROADMAP.md` non modifié par cette mise à jour (hors périmètre demandé).

### Vérifié par l'agent exécuteur (lecture directe, non indépendante)

- Les onze fichiers listés ci-dessus ont été relus après édition : contenu
  cohérent entre eux, mêmes dates, mêmes statuts.
- `graph/history.jsonl` : lignes existantes non modifiées ; nouvel événement
  ajouté en fin de fichier uniquement.
- Une seule action dans `NEXT_ACTION.md` (`ACTION-0003`).
- Aucune tâche `IN_PROGRESS` dans `CURRENT_STATE.md` ni `graph/current_state.yaml`.
- Aucune référence à un projet privé introduite.

### Non testé

- Analyse syntaxique automatisée des fichiers YAML et JSONL modifiés (relue
  à l'œil, non passée dans un analyseur externe).
- Vérification indépendante de cette mise à jour par un humain.

### Suite

`ACTION-0003` dans `NEXT_ACTION.md` : exécuter TASK-0002 (recherche de
phase 1), sans nouveau GO. L'exécution proprement dite n'a pas démarré par
cette mise à jour.

---

## 2026-08-25 — TASK-0002 — Exécution de la recherche de phase 1

**Agent :** exécuteur Claude Code
**Statut à l'issue :** `IMPLEMENTED` — **pas** `VERIFIED`

### Fait

- Lecture préalable, dans l'ordre imposé : `AGENTS.md`,
  `docs/ai/START_HERE.md`, `docs/ai/OPERATING_MANUAL.md`,
  `docs/ai/CURRENT_STATE.md`, `docs/ai/NEXT_ACTION.md`, `PROJECT_VISION.md`,
  `ROADMAP.md`, `README.md`, `docs/ai/HANDOFF.md`, `docs/ai/VALIDATION.md`,
  `graph/project_graph.yaml`, `graph/current_state.yaml`,
  `graph/history.jsonl`, et la fiche
  `docs/tasks/TASK-0002-phase-1-research-and-positioning.md` en entier.
- **Passage de TASK-0002 à `IN_PROGRESS` avant toute consultation de
  source** : fiche de tâche, `CURRENT_STATE.md`, `graph/current_state.yaml`,
  `graph/project_graph.yaml`, et événement `task_started` ajouté en fin de
  `graph/history.jsonl`.
- Recherche menée **en lecture seule** sur des sources publiques, priorité
  stricte aux sources officielles et primaires : dépôts de code, fichiers
  `README` et `LICENSE` bruts, pages de release, API GitHub, sites officiels
  d'éditeurs, registres officiels de paquets (npm, PyPI, `crates.io`),
  service RDAP officiel de Verisign pour `.com`, texte SPDX de la licence
  MIT, texte officiel de la licence Apache 2.0, liste de licences de la Free
  Software Foundation.
- Création du livrable
  **`docs/research/phase-1-research-and-positioning.md`** : en-tête daté,
  analyse de GraphRAG Workbench et de sa dépendance amont Microsoft GraphRAG,
  **quatorze questions exactes** avec réponses séparant faits, inférences et
  incertitudes, tableau comparatif de **dix** solutions, public cible et
  valeur distincte, **neuf** limites du MVP sans IA, **sept** noms candidats
  avec constats de disponibilité sur cinq registres, vérification des termes
  de MIT et examen d'Apache-2.0 comme alternative non retenue, tableau des
  sources à cinq colonnes, section faits/inférences/recommandations/
  incertitudes, recommandation finale marquée « SOUMISE À DÉCISION HUMAINE »,
  sections « Non testé » et « Risques ».
- Trois sources **secondaires** seulement, explicitement signalées comme
  telles dans le rapport : Softpedia pour l'existence de « Folderscope », un
  résultat de moteur de recherche pour une absence de résultat, et les listes
  de résultats ayant servi à repérer deux pages officielles ensuite
  consultées directement.
- **Passage de TASK-0002 à `IMPLEMENTED`** et mise à jour de la mémoire :
  fiche de tâche (statut + section 13, rapport d'exécution),
  `docs/ai/CURRENT_STATE.md`, `docs/ai/NEXT_ACTION.md` (`ACTION-0004`,
  action unique), `docs/ai/VALIDATION.md` (réécrit, section A pour
  TASK-0002), `docs/ai/HANDOFF.md`, `graph/current_state.yaml`,
  `graph/project_graph.yaml`, `graph/history.jsonl` (ajout seul), et
  `ROADMAP.md` **statut de la phase 1 uniquement**.
- Correction demandée dans `CURRENT_STATE.md` : la phrase obsolète « GO
  humain avant étape importante » est remplacée par l'énoncé de
  l'autorisation permanente du 2026-08-25 et la liste exacte des cas
  réservés où un agent s'arrête et demande un GO.

### Non fait, volontairement

- **Aucune décision** de nom public, de licence ou de pile technologique. Le
  rapport recommande et marque ses recommandations « soumises à décision
  humaine ».
- **Aucun nom réservé, aucun domaine acheté, aucun compte créé, aucun dépôt
  distant ouvert.** Toutes les requêtes réseau ont été des lectures.
- Aucun code applicatif, aucune dépendance, aucun commit, aucune publication.
- Aucun code tiers copié dans le dépôt.
- Aucune référence à un projet privé.
- `ROADMAP.md` ligne 18 (« GO humain explicite » à chaque passage de phase),
  devenue obsolète, **n'a pas été corrigée** : la fiche `TASK-0002` limitait
  les modifications de ce fichier au statut de la phase 1. Non-conformité
  consignée dans `VALIDATION.md` section A.4, `CURRENT_STATE.md` et
  `HANDOFF.md`.

### Vérifié par l'agent exécuteur (lecture directe, **non indépendante**)

Détail dans `docs/ai/VALIDATION.md`, section A.1 : existence du livrable,
présence des huit sous-sections et des quatorze questions dans leur libellé
exact, marquage systématique faits/inférences/recommandations/incertitudes,
absence de toute réservation ou achat, mention « soumise à décision humaine »,
absence de choix de pile technologique, une seule action dans
`NEXT_ACTION.md`, aucune tâche `IN_PROGRESS` à la clôture, et ajouts seuls
dans `graph/history.jsonl`.

### Non testé

- **Analyse syntaxique automatisée des fichiers YAML et JSONL : non
  effectuée.** Aucun outil d'exécution de commande n'était disponible dans
  cette session — ni interpréteur, ni analyseur. Les fichiers ont été relus à
  l'écran après édition, sans validation par un analyseur.
- Contrôle croisé automatisé entre les affirmations du corps du rapport et le
  tableau des sources : non effectué ; confié à `ACTION-0004`.
- Aucun des dix outils comparés n'a été installé ni exécuté.
- Aucune mesure de performance, pour aucun outil.
- `crates.io` non vérifié pour cinq des sept noms candidats.
- Aucune recherche d'antériorité de marque ; la tentative sur le service de
  l'USPTO n'a renvoyé aucun résultat exploitable.
- Aucun TLD autre que `.com`.
- Aucun avis juridique sur les raisonnements de licence.
- Vérification indépendante de TASK-0002 : non effectuée.

### Suite

`ACTION-0004` dans `NEXT_ACTION.md` : vérification indépendante de TASK-0002
sur preuves, par l'orchestrateur, contre les quatorze critères d'acceptation
de la fiche. Débouche sur `VERIFIED` ou `REJECTED` avec motif écrit.

---

## 2026-08-25 — TASK-0002 — Corrections après vérification indépendante partielle

**Agent :** orchestrateur
**Statut à l'issue :** `TASK-0002` reste `IMPLEMENTED` — **pas** `VERIFIED`
**Motif :** l'orchestrateur, instance distincte de l'agent exécuteur, a obtenu
des preuves indépendantes contredisant certaines affirmations du rapport de
phase 1 et a corrigé le rapport, sans clore `ACTION-0004`.

### Preuves indépendantes obtenues

- API GitHub du dépôt `graphrag-workbench` : `full_name`
  `lyon-industries/graphrag-workbench`, licence MIT, `created_at`
  `2025-09-04T15:29:08Z`, `pushed_at` `2026-07-18T09:47:42Z`, 713 étoiles, 91
  bifurcations, non archivé, TypeScript.
- API des releases : tag `v0.1.0-alpha.1`, nom exact « v0.1.0-alpha.1 —
  GraphRAG Workbench (First alpha) », `prerelease: true`, `published_at`
  `2025-09-04T16:22:04Z`.
- API des contributeurs : `ChristopherLyon`, 14 contributions.
- Citations du README et du `LICENSE` : confirmées.
- Microsoft GraphRAG : MIT, `pushed_at` `2026-08-24`, 35 679 étoiles, 3 747
  bifurcations, non archivé ; mention « maintenance mode » et avertissement de
  coût confirmés.
- `folderscape` et `cartodoc` : HTTP 404 confirmé sur npm, PyPI, `crates.io`,
  comptes/organisations GitHub, et RDAP Verisign `.com`.
- 25 liens officiels du tableau de sources (7.6) répondaient HTTP 200 ;
  Softpedia (S-27) a répondu **HTTP 403** et reste une source secondaire non
  vérifiée indépendamment.

### Corrections apportées à `docs/research/phase-1-research-and-positioning.md`

1. Intitulé inventé « Initial Alpha » et année inférée remplacés par le nom
   exact et la date officielle de l'API des releases ; `S-04` pointe
   désormais vers l'URL API officielle des releases.
2. Formulations « fichier NOTICE obligatoire » d'Apache-2.0 nuancées : la
   clause §4(d) n'impose la reproduction des notices que si l'œuvre
   distribuée comporte déjà un fichier `NOTICE`.
3. Tableau de compatibilité GPL/AGPL nuancé : une distribution combinée ou
   liée à un composant copyleft doit respecter sa licence et ne peut pas se
   présenter comme « MIT seule » ; les limites plugiciel/processus
   séparé/liaison dynamique restent des questions juridiques non tranchées
   ici, sans valoir avis juridique.

### Corrections apportées à `ROADMAP.md`

Ligne 19 : la formulation obsolète « GO humain explicite » à chaque passage
de phase est remplacée par la description des transitions autonomes dès que
critères et preuves sont satisfaits, conformément à l'autorisation permanente
du 2026-08-25 ; la phase 6 conserve son GO humain spécial, désormais
explicitement conditionné à des audits préalables.

### Fichiers modifiés

`docs/research/phase-1-research-and-positioning.md`, `ROADMAP.md`,
`docs/ai/VALIDATION.md` (section A.4 mise à jour, section A.6 ajoutée),
`docs/ai/CURRENT_STATE.md`, `docs/ai/NEXT_ACTION.md`,
`graph/current_state.yaml`, `graph/history.jsonl` (ajout seul).

### Non fait, volontairement

- **`TASK-0002` n'est pas portée à `VERIFIED`** par cette correction : cette
  vérification est **partielle**, elle ne couvre pas l'intégralité des
  quatorze critères d'acceptation ni le contrôle croisé exhaustif du corps du
  rapport contre le tableau des sources.
- Aucune recherche formelle de marque n'a été faite (mêmes limites d'accès
  que celles déjà rapportées par l'agent exécuteur).
- Aucune tâche `IN_PROGRESS` ouverte.

### Suite

`ACTION-0004` reste l'action unique de `docs/ai/NEXT_ACTION.md` :
vérification indépendante **finale**, débouchant sur `VERIFIED` ou
`REJECTED` avec motif écrit.

---

## 2026-08-25 — TASK-0002 — Vérification indépendante finale : VERIFIED, et ouverture de TASK-0003

**Agent :** orchestrateur
**Statut à l'issue :** `TASK-0002` et la phase 1 → `VERIFIED` ;
`TASK-0003` ouverte, `APPROVED`

### Fait

- **`crates.io` vérifié pour les cinq candidats restants** (`topodoc`,
  `docscape`, `isodoc`, `terradoc`, `reliefdoc`) : HTTP 404 confirmé pour
  chacun, comme déjà constaté pour `cartodoc` et `folderscape`. Les **sept**
  candidats sont désormais confirmés libres sur `crates.io`.
- `docs/research/phase-1-research-and-positioning.md` corrigé, section 7.4 :
  la limite « `crates.io` non vérifié pour cinq candidats » retirée,
  remplacée par la confirmation des sept ; source `S-24` mise à jour ;
  sections 7.7.4 (Incertitudes) et 8 (Non testé) mises en cohérence. **Les
  limites relatives aux marques déposées et aux TLD hors `.com` restent
  intactes.** En-tête et dernière ligne du rapport mis à jour pour refléter
  la vérification indépendante.
- **Vérification indépendante finale de `TASK-0002`**, grille de preuves
  consignée dans `docs/ai/VALIDATION.md`, section A.7 : quatorze questions
  répondues, 32 sources définies (tableau 7.6), API GraphRAG confirmée
  (dépôt, releases, contributeurs), 25 liens officiels en HTTP 200, sept
  candidats vérifiés sur cinq registres chacun (7×5), syntaxe YAML/JSONL et
  encodage UTF-8 cohérents, absence de tout scan de document privé et de
  toute référence privée, aucune pile technologique choisie.
- `TASK-0002` et la **phase 1** passées à `VERIFIED`, `verified_by:
  orchestrator`, `verified_on: 2026-08-25`, dans la fiche de tâche (section
  14 ajoutée), `docs/ai/CURRENT_STATE.md`, `ROADMAP.md`,
  `graph/current_state.yaml`, `graph/project_graph.yaml`, avec événements
  `crates_io_verified`, `report_corrected`, `independent_verification_final`,
  `task_verified` et `phase_verified` ajoutés en fin de
  `graph/history.jsonl` (ajout seul).
- `ACTION-0004` close.
- Création de `docs/tasks/TASK-0003-public-name-due-diligence.md`, statut
  `APPROVED` via l'autorisation permanente du 2026-08-25 : diligence
  raisonnable complémentaire sur le nom public — recherche officielle de
  marques (CIPO, USPTO, WIPO, EUIPO) si accessible, recherche Web générale,
  collisions phonétiques/orthographiques/logicielles, TLD
  `.org`/`.app`/`.dev`/`.ca`, au moins trois nouveaux candidats distinctifs si
  `folderscape` reste jugé risqué, aucune réservation ni achat, décision
  consignée dans `docs/decisions/DEC-0001-public-name.md`, modèle recommandé
  Opus à effort élevé.
- Création de `docs/decisions/DEC-0001-public-name.md`, statut `PROPOSED`,
  décision non encore prise, options reprises de `TASK-0002`.
- `docs/ai/NEXT_ACTION.md` remplacé par `ACTION-0005`, action unique,
  `APPROVED` : exécuter `TASK-0003` immédiatement.
- `docs/ai/HANDOFF.md` réécrit en cohérence avec cette clôture et l'ouverture
  de `TASK-0003`.

### Non fait, volontairement

- **`TASK-0003` n'a pas été exécutée** par cette mise à jour : aucune
  recherche de marque complémentaire, aucune collision phonétique,
  orthographique ou logicielle, aucun TLD hors `.com` vérifié. C'est l'objet
  d'`ACTION-0005`.
- Aucune décision de nom public, de licence ou de pile technologique.
- Aucun nom réservé, aucun domaine acheté, aucun compte créé.
- Aucun code applicatif, aucune dépendance, aucun commit, aucune publication.
- Les limites « marques déposées » et « TLD autres que `.com` » du rapport de
  phase 1 **ne sont pas levées** par cette mise à jour.

### Vérifié par l'orchestrateur (indépendant)

Détail complet dans `docs/ai/VALIDATION.md`, section A.7.

### Non testé

- Recherche formelle de marques déposées (CIPO, USPTO, WIPO, EUIPO) —
  transmise à `TASK-0003`.
- TLD autres que `.com` — transmis à `TASK-0003`.
- Fins de ligne sur le disque, cohérence des liens relatifs entre documents.

### Suite

`ACTION-0005` dans `docs/ai/NEXT_ACTION.md` : exécuter `TASK-0003`
immédiatement, sans GO distinct pour la recherche en lecture seule. Un GO
humain reste requis avant toute fixation irréversible du nom public.

---

## 2026-08-25 — TASK-0003 — Diligence du nom public

**Agent :** Codex
**Statut à l'issue :** `IMPLEMENTED`, vérification `ACTION-0006` ouverte

### Fait

- Claude Code arrêté dès le constat de limite Pro atteinte; aucune reprise sur
  crédits Anthropic payants.
- Contrôle de trois nouveaux candidats (`filetopo`, `folderatlas`,
  `terrafolder`) sur npm, PyPI, `crates.io`, GitHub exact et cinq TLD.
- Recherche officielle exacte CIPO : 0 résultat combiné pour le trio.
- Recherche officielle exacte EUIPO : 0 résultat pour chacun.
- Limite USPTO consignée (AWS WAF) et limite WIPO respectée (conditions
  interdisant les requêtes automatisées).
- Recherche Web de collisions : `folderscape`, `FolderAtlas` et
  `TerraFolder` écartés.
- `DEC-0001` complétée : **FileTopo** retenu comme nom de travail public
  réversible.
- Documents d'état et graphes synchronisés vers `IMPLEMENTED`.

### Non fait, volontairement

- Aucun domaine, compte, dépôt distant ou marque réservé, acheté ou créé.
- Aucune licence ni pile technologique décidée.
- Aucun code applicatif, aucune dépendance, aucun commit, aucune publication.
- Aucun accès à un corpus privé.

### Limites

- USPTO et WIPO non vérifiés au niveau des résultats exacts.
- Recherche juridique exhaustive à refaire avant fixation irréversible.

### Suite

`ACTION-0006` : vérification de cohérence de `TASK-0003`; si conforme,
ouverture automatique de la phase 2 — architecture.

---

## 2026-08-25 — ACTION-0006 — Vérification de TASK-0003

**Agent :** orchestrateur
**Résultat :** `TASK-0003` et `DEC-0001` → `VERIFIED`

- Dix critères d'acceptation contrôlés.
- Deux YAML parsés, 39 lignes JSONL validées avant ajout des événements.
- Zéro référence au corpus privé interdit dans 23 fichiers.
- Aucun remote Git, achat, compte, domaine ou publication.
- Limites USPTO/WIPO et recherche juridique exhaustive maintenues.
- Phase 2 et `TASK-0004` ouvertes automatiquement; `ACTION-0007` devient
  l'action unique en cours.

---

## 2026-08-26 — TASK-0006 — MVP local sans IA

**Agent :** Codex puis vérification orchestrateur
**Résultat :** `VERIFIED`, phase 4 close, `TASK-0007` ouverte

### Fait

- Registre de collections et index SQLite persistants hors corpus.
- Sélecteur de dossier natif, scan asynchrone, progression et annulation sans index partiel.
- Recherche et filtres paginés, état vu/non vu, détection en ligne seulement.
- Carte à niveau de détail progressif et liste accessible synchronisée.
- Ouverture explicite confinée dans l’Explorateur Windows.
- Guides FR/EN, mesures 10 k/100 k, 11 tests Rust et 4 tests d’interface.
- Clippy strict, audit de dépendances sans vulnérabilité connue, build release et NSIS.
- Inspection visuelle corrigée et revérifiée en français et en anglais.

### Sécurité

Aucun dossier utilisateur choisi par l’agent, aucun corpus privé, aucun contenu réel, aucune publication, aucun dépôt distant et aucun crédit Anthropic.

### Suite

`ACTION-0010` : exécuter `TASK-0007`, préparation publique strictement locale. La phase 6 reste soumise à un GO humain spécial.

---

## 2026-08-26 — TASK-0007 — Préparation publique locale

**Agent :** Codex puis vérification orchestrateur
**Résultat :** `VERIFIED`, phase 5 close, publication différée

### Fait

- Ajout de `SECURITY.md`, `PRIVACY.md`, `CONTRIBUTING.md` et du modèle de menace.
- Avis de tiers recoupé avec les verrous; scripts reproductibles d'inventaire
  et d'audit public ajoutés.
- Notes candidates 0.1.0 et checklist distincte pour préparation, signature
  et publication.
- Audit de 102 fichiers candidats : zéro motif sensible, zéro chemin
  personnel, zéro fichier supérieur à 5 Mio et aucun remote.
- 4 tests interface, 11 tests Rust, TypeScript, Vite, fmt, Clippy strict,
  audit de vulnérabilités, release et NSIS réussis.
- Empreintes SHA-256 des deux artefacts locaux non signés consignées.

### Non fait, volontairement

- Aucun corpus réel ou privé consulté.
- Aucun remote, compte, secret, achat, signature, téléversement, release ou
  publication.
- La phase 6 et `ACTION-0011` restent `DEFERRED` jusqu'au GO humain spécial.
---

## 2026-08-26 — TASK-0008 — Revue indépendante de pré-publication

**Agent :** Claude Code, exécuteur
**Cadre :** GO humain spécial de phase 6, donné par le propriétaire le 2026-08-26
**Résultat :** `IMPLEMENTED`, non commité, en attente de vérification indépendante

### Fait

- Ouverture de `TASK-0008` et passage de la mémoire en `IN_PROGRESS`
  (`CURRENT_STATE.md`, `NEXT_ACTION.md`, `graph/current_state.yaml`,
  `graph/history.jsonl`).
- Chaîne de vérification réexécutée sur l'arbre modifié : 10 étapes, 0 échec —
  TypeScript, 4 tests d'interface, Vite, `pnpm audit --prod`, `cargo fmt`,
  Clippy strict, 11 tests Rust, inventaire de dépendances, audit de
  publiabilité.
- Formats validés par analyseur réel : 6 YAML, 3 JSON stricts, 2 JSONC,
  54 lignes JSONL sans erreur, UTF-8 sans BOM sur tous les fichiers touchés.
- Documentation : 0 lien relatif cassé et 0 chemin cité introuvable sur
  46 fichiers `.md`.
- Historique Git complet audité : 143 blobs, objets non atteignables compris.
  0 secret, 0 chemin personnel, 0 référence à un projet privé, 0 remote.
  Les 5 blobs non atteignables sont d'anciennes versions de documents, lues et
  identifiées une par une.
- Ajouts publics justifiés : `CODE_OF_CONDUCT.md`, `CHANGELOG.md` public,
  `.github/workflows/ci.yml` (Windows), `.gitattributes`, modèles d'issues et
  de demande de fusion, `README.md` réécrit avec paternité, lien
  `https://github.com/Vat-faire`, statut alpha et limites exactes.
- Corrections : `SECURITY.md` nomme le canal prévu, `CONTRIBUTING.md` renvoie
  au code de conduite et à la CI, `scripts/audit-public-readiness.ps1` reçoit
  `-AllowRemotes` pour rester utilisable après publication, `package.json`
  reçoit ses métadonnées publiques, `docs/ai/START_HERE.md` perd trois
  affirmations devenues fausses.
- Rapport factuel : `docs/reviews/TASK-0008-independent-review.md`.

### Constat de sécurité

Le binaire release compilé — **non versionné** — contient 336 occurrences de
chemins de la machine de compilation et le chemin absolu du dossier de
développement, issu de `env!("CARGO_MANIFEST_DIR")`. Le **code source du dépôt
est propre**. Les correctifs sont décrits mais **non appliqués** : ils
modifient un comportement vérifié en phase 4 et invalident des empreintes
consignées. Inscrits comme bloquants en section B de la checklist.

### Recommandation

Publier le **code source seul**, sans binaire ni release signée. Réversible
dans un sens, pas dans l'autre.

### Non fait, volontairement

- Aucune connexion, authentification, ni appel réseau.
- Aucun remote, push, branche publique, dépôt distant, release, signature ou
  téléversement.
- Aucune nouvelle dépendance; PyYAML utilisé est un module de l'interpréteur
  déjà présent sur la machine, hors du dépôt.
- Aucun corpus utilisateur ou privé consulté.
- **Aucun `git commit`** : l'arbre est laissé à l'examen de l'orchestrateur.
- Aucun statut `VERIFIED` auto-attribué.

### Non testé

Construction Tauri release et NSIS non refaites; workflow CI jamais exécuté
sur un exécuteur GitHub; branche `-AllowRemotes` non testée avec un remote
réel; liens externes non résolus sur le réseau; aucune inspection visuelle de
l'application.

### Suite

`ACTION-0012` : l'orchestrateur examine, décide de la forme de publication,
puis commite. Les actions distantes attendent la réauthentification humaine du
compte GitHub `Vat-faire`.

---

## 2026-08-26 — Vérification indépendante de TASK-0008

**Agent :** orchestrateur
**Résultat :** `TASK-0008` → `VERIFIED`; `TASK-0009` ouverte

- Identité publique minimale et divulgation IA approuvées par le propriétaire.
- Version harmonisée à `0.1.0-alpha.1`; identifiant technique remplacé par
  `io.github.vat-faire.filetopo`.
- Détection de langue corrigée pour suivre la première préférence valide.
- 36 tests interface, 13 tests Rust, TypeScript, Vite, fmt, Clippy strict
  debug/release, audit de vulnérabilités et inventaires réussis.
- Release/NSIS reconstruits avec remappage de quatre préfixes; scan de trois
  artefacts sur cinq motifs et deux encodages : zéro fuite.
- Publication décidée : prerelease GitHub source seulement, aucun binaire.
- Aucun remote, push, tag ou publication pendant cette vérification.
---

## 2026-08-26 — TASK-0008, second tour — anglais, langue système, fuite de chemins

**Agent :** Claude Code, exécuteur
**Cadre :** cinq décisions du propriétaire, dans le prolongement du GO de phase 6
**Résultat :** `IMPLEMENTED`, non commité, en attente de vérification indépendante

### Identité publique approuvée

Le propriétaire a approuvé une identité publique **minimale** : nom
« Sébastien Dubé », copyright 2026 et profil GitHub
`https://github.com/Vat-faire`, afin que le projet soit attribuable dans un
portfolio professionnel. Ne sont **jamais** publiables : courriel réel, nom de
compte Windows, chemin local absolu, document privé ou autre donnée
personnelle.

### Fait

- **Anglais comme langue principale.** `README.md` entièrement anglais et
  `README.fr.md` complet et équivalent, avec liens croisés. `CONTRIBUTING.md`,
  `CODE_OF_CONDUCT.md`, `SECURITY.md`, `PRIVACY.md`, `CHANGELOG.md`,
  `THIRD_PARTY_NOTICES.md`, `ROADMAP.md`, `PROJECT_VISION.md`, `.github/**`,
  `.gitattributes` et `index.html` traduits. `docs/ai/**`, `graph/**`,
  `AGENTS.md`, `CLAUDE.md` et la checklist restent en français.
- **Langue de l'application.** Nouveau module `src/lib/locale.ts` : choix
  explicite mémorisé d'abord, puis langue système ou navigateur — toute locale
  `fr` donne le français —, puis anglais en repli. Bouton FR/EN conservé avec
  `aria-label`, `document.documentElement.lang` synchronisé, une seule clé de
  stockage `filetopo.locale`, protégée contre un stockage indisponible.
- **32 tests réels ajoutés** : 24 dans `src/lib/locale.test.ts` et 8 dans
  `src/App.test.tsx`. `en-FR` reste anglais, `af-ZA`, `fy-NL` et `frr` ne sont
  pas confondus avec le français, un choix corrompu est ignoré, et un choix
  explicite survit au remontage dans les deux sens.
- **Fuite de chemins de compilation corrigée.**
  `env!("CARGO_MANIFEST_DIR")` a quitté le code livré en release; la fixture
  synthétique est résolue à l'exécution et compilée sous
  `#[cfg(debug_assertions)]`; `health` expose `syntheticFixtureAvailable` et
  l'interface masque le bouton hors développement.
- **Mécanisme stable de nettoyage des chemins.**
  `scripts/build-release-clean.ps1` applique `--remap-path-prefix` avec des
  préfixes calculés à l'exécution, jamais écrits dans le dépôt.
  `scripts/scan-binary-for-personal-paths.ps1` vérifie l'artefact.
- **Deux tests Rust ajoutés** pour la résolution de la fixture à l'exécution et
  pour le drapeau de `health`.
- **Mentions nominatives opérationnelles réduites** dans huit documents publics
  mutables; le nom reste pour la paternité, la licence et les métadonnées.
  `graph/history.jsonl` **n'a pas** été réécrit.

### Correction d'une hypothèse fausse

`trim-paths` avait été ajouté au profil `release` en supposant sa stabilité.
C'était **faux** pour Cargo 1.98 : le manifeste devenait impossible à analyser
(`feature 'trim-paths' is required ... not stabilized in this version of
Cargo`). L'option a été retirée; le manifeste documente son absence.

### Preuves

- Chaîne de vérification : **12 étapes, 0 échec**. Tests d'interface 4 → **36**,
  tests Rust 11 → **13**, Clippy strict en debug **et** release.
- Fuite mesurée dans `filetopo.exe` : **336 occurrences → 0**, sur cinq motifs,
  deux encodages et deux artefacts.
- Nouvelles empreintes SHA-256 dans `docs/releases/0.1.0.md`; celles de la
  phase 5 sont périmées.
- Formats : 6 YAML, 3 JSON, 2 JSONC, 57 lignes JSONL sans erreur, UTF-8 sans
  BOM. 49 fichiers `.md`, 0 lien cassé.

### Non fait, volontairement

- Aucune connexion, authentification, réseau, remote, push, release,
  signature, téléversement ou publication.
- Aucune nouvelle dépendance.
- Aucun corpus utilisateur ou privé consulté.
- **Aucun `git commit`**; aucun statut `VERIFIED` auto-attribué.

### Non testé

Workflow CI jamais exécuté sur un exécuteur GitHub; branche `-AllowRemotes` non
testée avec un remote réel; liens externes non résolus; aucune inspection
visuelle de l'application; charge utile NSIS non analysée après décompression.
Le journal de construction contient toujours le chemin, via un message de
l'éditeur de liens MSVC : c'est signalé dans `SECURITY.md`.

### Suite

`ACTION-0012` : l'orchestrateur examine, décide de la forme de publication,
puis commite. La recommandation reste de publier le **code source seul**.
---

## 2026-08-26 — TASK-0008, troisième tour — transparence sur l'assistance IA

**Agent :** Claude Code, exécuteur
**Cadre :** décision du propriétaire, transparence publique sur l'assistance IA
**Résultat :** `IMPLEMENTED`, non commité

### Fait

- `AI_ASSISTANCE.md` créé, bilingue anglais/français. Sens exact préservé :
  Sébastien Dubé détient l'idée, la vision produit, les exigences, les
  priorités et toutes les décisions finales; orchestration avec l'application
  de bureau OpenAI Codex; implémentation, tests, audits, documentation et
  revues par OpenAI Codex et Anthropic Claude Code; aucun outil n'est auteur,
  propriétaire ou mainteneur; aucune affiliation ni approbation d'OpenAI ou
  Anthropic; responsabilité et maintenance finales à Sébastien Dubé. Renvoie
  aux décisions, tâches, tests et revues versionnés — aucune chaîne de pensée
  ni journal privé publié.
- Section courte ajoutée dans `README.md` et `README.fr.md`, renvoyant vers
  `AI_ASSISTANCE.md`.
- `CHANGELOG.md` mis à jour.

### Non fait, volontairement

- Aucun changement de code : aucune reconstruction refaite.
- Aucun commit, remote, connexion ou publication.

### Preuves

- `scripts/audit-public-readiness.ps1` : 118 fichiers versionnés, 0 motif
  sensible.
- Liens relatifs sur 50 fichiers `.md` : 0 cassé.
- `AI_ASSISTANCE.md`, `README.md`, `README.fr.md` : UTF-8, sans BOM.

### Suite

`ACTION-0012` inchangée : l'orchestrateur examine, décide, commite.

---

## 2026-08-26 — TASK-0009 vérifiée — publication source GitHub

**Agent :** orchestrateur
**Cadre :** GO humain spécial de phase 6 et authentification humaine GitHub
**Résultat :** `VERIFIED`

- Dépôt public `Vat-faire/FileTopo` créé et branche `main` poussée.
- Description anglaise, huit sujets, issues actives, wiki inactif.
- Signalement privé de vulnérabilités, analyse de secrets et blocage au push
  activés; Dependabot volontairement inactif.
- Trois chaînes CI Windows réussies. Les actions GitHub ont été modernisées
  après un avertissement Node.js 20; la CI finale `33036847625` est verte sans
  cet avertissement.
- Prerelease source seulement `v0.1.0-alpha.1` créée : non brouillon, zéro
  actif joint, aucun binaire, installateur, journal local, signature ou dépense.
- `SECURITY.md` pointe vers le canal privé exact.

Phase 6 `VERIFIED`. `ACTION-0014` conserve la phase 7 en `DEFERRED` jusqu'à un
besoin concret.

---

## 2026-08-31 — TASK-0010 — Rebaseline et mémoire permanente

**Agent :** Codex, exécuteur principal
**Résultat :** IMPLEMENTED à la livraison, puis VERIFIED le 2026-08-31
(voir l'entrée suivante)

### Rebaseline et décisions

- FileTopo reste le projet public officiel; dépôt, historique Git, licence MIT
  et prototype alpha conservés sans réécriture.
- Le prototype devient une référence historique et n'est plus présenté comme
  le produit final demandé.
- Reconstruction progressive sur branches, avec réutilisation du code seulement
  après inspection, tests et décision documentée; DEC-0006 consigne ce choix.
- IA, RAG et GraphRAG restent facultatifs et hors du MVP structurel.

### Mémoire concernée

- Mis à jour : AGENTS.md, CLAUDE.md, PROJECT_VISION.md, ROADMAP.md,
  START_HERE.md, OPERATING_MANUAL.md, CURRENT_STATE.md, NEXT_ACTION.md,
  HANDOFF.md, VALIDATION.md et CHANGELOG_AI.md.
- Créé : RECOVERY.md, TOKEN_POLICY.md, COMMANDS.md, REFERENCE_INTERFACE.md,
  FEATURE_MATRIX.md, DATA_PIPELINE_VISION.md, TASK-0010, DEC-0006 et le bilan
  archivé de l'alpha.
- graph/ inspecté en lecture seule et déclaré non fiable pour l'état courant
  tant que ses contradictions ne sont pas normalisées dans une future tâche.

### Validations

- Contrôles Git préalables réussis; branche créée depuis le HEAD propre attendu.
- 20 livrables présents; CLAUDE.md, taille d'AGENTS.md, liens, états, action
  unique, portée du diff, secrets probables et git diff --check contrôlés.
- Aucun test applicatif, build, test manuel ou essai physique exécuté.
- Aucun code, dépendance, graphe, tag, release ou historique modifié.

### Publication autorisée

Le GO explicite du 2026-08-31 a autorisé les branches de secours et de
reconstruction. La branche de secours a été publiée au SHA vérifié
7104cfcb2623d5f7d5960358e26254de88e677d7. Le commit documentaire
`d1119fad06b4296d67bcd0365572b78517b9fb29` a été publié sur
`origin/rebuild/v0.2-project-brain`.

---

## 2026-08-31 — TASK-0010 vérifiée — cerveau de projet v0.2

**Agent :** Claude Code, sous mandat de l'orchestrateur
**Cadre :** GO explicite de Sébastien, 2026-08-31
**Résultat :** `VERIFIED`

### Vérification

- Contrôle distant de l'orchestrateur sur GitHub : branches de secours et de
  reconstruction présentes, SHA conformes, un seul commit documentaire au-dessus
  de `main`, 20 fichiers autorisés, aucun code modifié, `CLAUDE.md` commençant
  par `@AGENTS.md`, `AGENTS.md` compact, mémoire cohérente, `main`, prototype,
  historique et licence MIT conservés.
- Contrôle local de la présente session : racine, branche
  `rebuild/v0.2-project-brain`, HEAD `d1119fad06b4296d67bcd0365572b78517b9fb29`,
  arbre propre, amont `origin/rebuild/v0.2-project-brain`, SHA local et distant
  identiques, `main` à `91bbe90f0f99026c28cd345784d4f579a0016db2`, 1 commit
  au-dessus de `main`, 20 fichiers `.md`, 0 tâche `IN_PROGRESS`, 1 action.
- Preuves détaillées : `docs/ai/VALIDATION.md`, section J bis.

### Fait

- `TASK-0010` passe de `IMPLEMENTED` à `VERIFIED`, avec l'approbation humaine
  de Sébastien datée du 2026-08-31 et l'historique d'état complété.
- Formulations périmées corrigées : les livrables ne sont plus décrits comme
  « prêts pour le commit », mais comme commités et publiés.
- `CURRENT_STATE.md` : dernière tâche `TASK-0010` `VERIFIED`, aucune tâche
  `IN_PROGRESS`, branche de reconstruction publiée, code applicatif inchangé.
- `NEXT_ACTION.md` : `ACTION-0016`, action unique, spécification `TASK-0011`.
- `HANDOFF.md`, `VALIDATION.md` et `CHANGELOG_AI.md` alignés sur le résultat
  réel.

### Non fait, volontairement

- `TASK-0011` n'est ni créée ni démarrée.
- Aucun code, test, dépendance, `graph/`, fusion, PR, release, tag ou force
  push. `main` n'est pas touchée.
- Aucun test applicatif, build, test manuel ou essai physique.
- Aucun accès à l'interface privée de référence.

### Suite

`ACTION-0016` : rédiger et soumettre à Sébastien la spécification `TASK-0011`
sur la baseline des exigences fonctionnelles et les décisions d'architecture,
avant toute écriture de code.

---

## 2026-08-31 — ACTION-0016 — Proposition de TASK-0011

**Agent :** Claude Code
**Cadre :** GO explicite de Sébastien pour exécuter `ACTION-0016` uniquement
**Résultat :** `TASK-0011` créée au statut `PROPOSED`

### Fait

- Création de `docs/tasks/TASK-0011-functional-architecture-baseline.md` :
  objectif unique, contexte et problème réel, fichiers à lire, fichiers
  modifiables pendant l'exécution future, douze interdictions, sept livrables
  documentaires, recherches officielles requises, six décisions à comparer,
  tests et preuves, treize critères d'acceptation, conditions d'arrêt, format
  du rapport et quatre portes d'approbation de Sébastien.
- La fiche exige, si elle est approuvée : la classification des 39 fonctions
  `F-001` à `F-039` en MVP, ultérieur ou différé; le parcours de la sélection
  d'une racine à la carte construite automatiquement; la comparaison
  conserver/faire évoluer Tauri 2, Rust, React, TypeScript et SQLite sans
  supposer de réécriture; la comparaison HTML/SVG, Canvas et WebGL pour un
  rendu hiérarchique; le modèle de données complet; l'indexation sûre,
  reconstructible, incrémentale et non destructive; la surveillance Windows
  avec rafales, renommages, déplacements, suppressions, lecteurs absents et
  reprise; les exclusions sûres et les fichiers infonuagiques sans
  téléchargement automatique; les relations hiérarchiques automatiques et
  transversales à provenance explicite; l'isolation réelle de plusieurs
  cerveaux; l'accessibilité, le français/anglais et le clavier; des objectifs
  mesurables à 1 000, 10 000 et 100 000 fichiers synthétiques; la matrice de
  formats avec OCR désactivé par défaut; la limite architecturale gardant IA,
  embeddings, RAG et GraphRAG facultatifs et hors du MVP structurel; les
  migrations, sauvegarde, intégrité et retour arrière; et le plan de tests
  unitaires, intégration, Windows manuel, récupération et performance.
- Les décisions `DEC-0007` à `DEC-0012` restent à créer plus tard et devront
  demeurer `PROPOSED` jusqu'au GO de Sébastien. La fiche rappelle que
  `DEC-0003`, `DEC-0004` et `DEC-0005`, étant `VERIFIED`, sont remplacées et
  jamais modifiées.
- Mémoire mise à jour : `CURRENT_STATE.md`, `NEXT_ACTION.md`, `HANDOFF.md`,
  `VALIDATION.md` (section K) et ce journal.

### Non fait, volontairement

- `TASK-0011` n'est ni approuvée, ni démarrée; aucun de ses livrables n'existe.
- Aucune décision n'est prise, aucune fiche `DEC` n'est créée.
- Aucun code, test, dépendance, `graph/`, `ROADMAP.md`, fusion, PR, release,
  tag ou force push. `main` n'est pas touchée.
- `TASK-0008` n'est pas corrigée, conformément au mandat.
- Aucun test applicatif, build, test manuel ou essai physique.
- Aucun accès à l'interface privée de référence, aucune donnée réelle.

### Preuves

- Contrôles Git préalables réussis; HEAD `1096fafa482b4e0f98cfb58c02bb5a258c7e9d23`,
  arbre propre, SHA local égal au SHA distant, `main` inchangée à
  `91bbe90f0f99026c28cd345784d4f579a0016db2`, 0 tâche `IN_PROGRESS`.
- Contrôles documentaires détaillés en section K de `docs/ai/VALIDATION.md`.

### Suite

`ACTION-0017` : Sébastien examine `TASK-0011`, puis la corrige, l'approuve ou
la rejette. Aucun agent ne démarre cette tâche avant ce GO.

---

## 2026-08-31 — TASK-0011 — Baseline fonctionnelle et décisions d'architecture

**Agent :** exécuteur Claude Code
**GO :** Sébastien, 2026-08-31, porte P1 franchie; le GO couvrait l'exécution
documentaire et le push du commit documentaire vers
`origin/rebuild/v0.2-project-brain`, à l'exclusion de toute publication de
produit, release, fusion ou tag
**Statut à l'issue :** `IMPLEMENTED` — l'exécuteur ne s'attribue pas `VERIFIED`

### Fait

- Vérifications Git préalables : racine, branche `rebuild/v0.2-project-brain`,
  HEAD `01e6860f`, arbre propre, SHA local égal au SHA distant, `main` à
  `91bbe90f`, aucune tâche `IN_PROGRESS`. Toutes conformes.
- TASK-0011 passée de `PROPOSED` à `APPROVED` puis `IN_PROGRESS`, le GO daté
  étant inscrit dans la fiche.
- **L1** — `docs/product/REQUIREMENTS_BASELINE.md` : les 39 fonctions `F-001`
  à `F-039` classées `MVP` (29), `ULTÉRIEUR` (6) ou `DIFFÉRÉ` (4), chacune
  avec motif, dépendance amont et critère d'acceptation mesurable. Neuf écarts
  avec la colonne « Priorité » déclarés et justifiés, tous de `P1` vers `MVP`,
  aucun abaissant une fonction `P0`.
- **L2** — `docs/product/USER_JOURNEY.md` : parcours E0 à E8, de la sélection
  d'une racine à la carte construite automatiquement, sans aucune étape de
  configuration manuelle de la carte; annulation, reprise, erreurs,
  indisponibilité et accessibilité couvertes.
- **L3** — `docs/architecture/ARCHITECTURE_BASELINE.md` : dix-sept contraintes
  établies par sources officielles, puis modèle de données, indexation,
  surveillance, exclusions, relations, cerveaux isolés et migrations.
- **L4** — `docs/architecture/FORMAT_MATRIX.md` : le MVP lit des métadonnées
  et n'ouvre aucun contenu; extraction et courriels ultérieurs; OCR désactivé
  par défaut et soumis à consentement.
- **L5** — `docs/performance/BASELINE_TARGETS.md` : objectifs à 1 000, 10 000
  et 100 000 fichiers synthétiques, chacun avec protocole reproductible et
  mention **« non testé »**.
- **L6** — `docs/architecture/TEST_STRATEGY.md` : cinq catégories T1 à T5,
  quinze scénarios manuels Windows, neuf scénarios de récupération, tous sur
  données synthétiques, avec le critère rendant chaque catégorie
  satisfaisante.
- **L7** — `DEC-0007` à `DEC-0012` créées, **toutes `PROPOSED`**, chacune
  comparant au moins deux options réelles avec avantages, inconvénients et
  motif de classement.
- `docs/product/FEATURE_MATRIX.md` : ajout d'une seule colonne
  « Baseline TASK-0011 » et d'un paragraphe de renvoi; les 39 lignes
  conservent leur contenu d'origine caractère pour caractère avant la nouvelle
  cellule, contrôlé mécaniquement.
- `ROADMAP.md` : phase 0 `IMPLEMENTED` vers `VERIFIED`, phase 1 `PROPOSED`
  vers `IMPLEMENTED`, plus une section « État réel au 2026-08-31 ».
- Mémoire obligatoire mise à jour : `CURRENT_STATE.md`, `NEXT_ACTION.md`
  (`ACTION-0018`, action unique), `HANDOFF.md`, `VALIDATION.md` (section L) et
  ce journal.

### Deux constats touchant des fiches déjà `VERIFIED`

Aucune de ces fiches n'a été modifiée; les révisions sont **proposées**.

1. **`DEC-0003` (Rust stable) et `DEC-0004` (clé stable = identité de volume +
   identifiant de fichier Windows) sont en tension.** La documentation
   officielle de Rust indique que `volume_serial_number()`, `file_index()`,
   `number_of_links()` et `change_time()` sont `nightly-only`, et renvoient
   `None` depuis `DirEntry::metadata`. Traité par `DEC-0009`.
2. **PixiJS 8 n'offre aucun repli Canvas 2D** : le renderer Canvas est listé
   « Coming-soon » par l'éditeur. Sans WebGL utilisable, il n'y aurait aucune
   carte. Traité par `DEC-0008`.

### Vérifié

Les douze contrôles de la section 10 de la fiche ont été exécutés. Onze
réussissent. Le douzième — « chaque décision cite au moins une source primaire
datée » — est **partiellement réussi** : `DEC-0012` ne cite aucune source
primaire externe, étant une décision de périmètre de produit; elle est déclarée
**incertaine** avec son risque écrit, comme la section 8 de la fiche l'exige.
Résultats détaillés en section L de [VALIDATION.md](VALIDATION.md).

### Non testé

Aucun test automatisé, aucun build, aucune installation, aucun test manuel
d'interface, aucun essai physique Windows, aucune mesure de performance réelle.
Les tests existants du prototype n'ont pas été rejoués. Tous les objectifs de
performance sont des cibles à falsifier, jamais des résultats.

### Lacunes de recherche déclarées

- Les spécifications WebGL 1.0 et 2.0 du registre Khronos ont renvoyé
  **HTTP 403** et n'ont pas pu être consultées; aucune source secondaire n'a
  été substituée.
- Le journal USN n'a pas été instruit sur source primaire; l'option
  correspondante de `DEC-0010` est classée « non instruite ».
- L'ambiguïté de valeur entre `FILE_ATTRIBUTE_RECALL_ON_OPEN` et
  `FILE_ATTRIBUTE_EA` (0x00040000 pour les deux dans la table Microsoft) est
  signalée comme incertitude à lever par un test Windows, non tranchée.

### Non fait, volontairement

Aucun code, test, dépendance, fichier généré, `graph/`, tag, release ni
historique modifié. `DEC-0001` à `DEC-0006` inchangées.
`docs/decisions/README.md` non modifié, faute d'appartenir à la liste des
fichiers autorisés de la section 5. Aucune tâche suivante créée ni démarrée.

### Conséquence

Aucune tâche n'est `IN_PROGRESS`. L'action unique suivante, `ACTION-0018`,
appartient à Sébastien : examiner la baseline et les six décisions (porte P2).
Aucune ligne de code ne peut être écrite avant P2 puis P3.

---

## 2026-08-31 — TASK-0011 — Révision de la baseline après corrections

**Agent :** exécuteur Claude Code
**GO :** corrections motivées de l'orchestrateur, 2026-08-31; le GO couvre la
révision documentaire et le push du commit vers
`origin/rebuild/v0.2-project-brain`, à l'exclusion de toute publication de
produit, release, fusion, tag ou accès privé
**Statut à l'issue :** `IMPLEMENTED`, **inchangé** — la baseline générale est
acceptée mais la porte **P2 n'est pas franchie**; l'exécuteur ne s'attribue pas
`VERIFIED`

### Fait

- Vérifications Git préalables : racine, branche `rebuild/v0.2-project-brain`,
  HEAD `d7d9118e`, arbre propre, SHA local égal au SHA distant, `main` à
  `91bbe90f` et **inchangée**, aucune tâche `IN_PROGRESS`. Toutes conformes.
- **Correction 1 — périmètre MVP.** `F-024` « Copier le chemin » et `F-033`
  « Personnalisation du cerveau » reclassées `ULTÉRIEUR` → **`MVP`**. Motif :
  ces fonctions font partie de l'expérience explicitement demandée, pour
  reproduire de façon générique les options essentielles de l'interface de
  référence et pour distinguer plusieurs cerveaux. La portée `MVP` de `F-033`
  couvre nom modifiable, couleur modifiable, icône modifiable, persistance
  indépendante par cerveau, et valeurs par défaut utilisables sans
  configuration obligatoire. Répartition : **31 `MVP`, 4 `ULTÉRIEUR`
  (F-013, F-017, F-018, F-019), 4 `DIFFÉRÉ` (F-021, F-037, F-038, F-039)**,
  total 39; écarts déclarés portés de 9 à **11**. Comptes, tableaux,
  dépendances, parcours et références mis à jour dans
  `REQUIREMENTS_BASELINE.md`, `FEATURE_MATRIX.md`, `USER_JOURNEY.md` et
  `DEC-0012`.
- **Correction 2 — rendu hiérarchique.** Dans `DEC-0008`, la recommandation
  principale devient : HTML/SVG avec virtualisation et niveaux de détail pour
  le MVP; Canvas 2D **seulement si** un banc d'essai synthétique démontre que
  HTML/SVG ne tient pas les objectifs; WebGL **différé** jusqu'à un besoin
  mesuré. Motifs écrits : la carte n'affiche jamais 100 000 blocs
  simultanément; seuls les niveaux pertinents sont visibles; accessibilité,
  clavier, libellés, focus et repli sans GPU sont natifs ou plus simples en
  HTML/SVG; Canvas imposerait immédiatement une deuxième représentation DOM
  synchronisée; aucune mesure actuelle ne justifie cette complexité. Un
  **plafond initial proposé** de blocs DOM/SVG simultanément visibles est
  ajouté, marqué **« non testé »** et à falsifier — **ce n'est pas une
  capacité déclarée du produit**.
- **Correction 3 — identité des fichiers.** Dans `DEC-0009`, la recommandation
  `I-D` (repli **automatique** sur l'heuristique) est remplacée par `I-E` :
  identité Windows `VolumeSerialNumber` + `FileId` lorsqu'elle est disponible;
  repli **déterministe** par empreinte versionnée du chemin relatif sinon;
  heuristique **uniquement** comme « déplacement possible » ou suggestion
  visible et révocable. **Aucune heuristique ne peut préserver automatiquement
  l'identité, le vu/non-vu ou le journal comme s'il s'agissait d'un fait.** Un
  déplacement inter-volume non prouvable reste **création + suppression**, avec
  suggestion facultative. La provenance obligatoire de l'identité et la
  recommandation `R-C` pour les relations sont **conservées**.
  `ARCHITECTURE_BASELINE.md` §3.2 et §5.2 alignées.
- **Correction 4 — migration.** Dans `DEC-0011`, `S-C` **conservée** comme
  recommandation de stockage. `M-C` **conservée comme direction proposée**,
  avec mention explicite qu'elle ne pourra être approuvée pour implémentation
  qu'après un banc d'essai synthétique **Windows** démontrant : bascule sûre;
  traitement de `.wal` et `.shm`; arrêt brutal; espace disque insuffisant;
  retour à l'ancienne base. **`M-B` demeure le repli** si `M-C` n'est pas
  démontrée. `TEST_STRATEGY.md` reçoit les scénarios `R10` et `R11` et une
  section §6.1 décrivant les bancs d'essai `B1` et `B2`, **tous deux non
  exécutés**.
- Mémoire obligatoire mise à jour : `CURRENT_STATE.md`, `NEXT_ACTION.md`
  (`ACTION-0019`, action unique), `HANDOFF.md`, `VALIDATION.md` (section M) et
  ce journal.

### Points acceptés sans correction

`DEC-0007` (conserver Tauri 2, Rust, React, TypeScript et SQLite, en
remplaçant le rendu); `DEC-0010` (`W-B` avec repli `W-C`, application `U-B`);
`DEC-0012` (frontière `F-D`, IA entièrement facultative). L'absence de source
externe dans `DEC-0012` est acceptable : c'est une décision de périmètre
produit fondée sur la vision approuvée. Le journal USN reste une piste
**différée**. La lacune WebGL n'est **pas** bloquante. L'ambiguïté des
attributs infonuagiques demeure un point à résoudre **avant leur
implémentation**.

### Vérifié

Douze contrôles exécutés, **douze réussis** : 39 fonctions sans trou ni
doublon; 31 / 4 / 4; 11 écarts justifiés; 0 divergence entre la baseline et la
colonne de la matrice fonctionnelle; 0 état hors vocabulaire; 6 décisions sur 6
à `PROPOSED`; `DEC-0001` à `DEC-0006` intactes; 217 liens locaux vérifiés, 0
cassé; 1 action dans `NEXT_ACTION.md`; 0 tâche `IN_PROGRESS`; 0 donnée
sensible sur 751 lignes ajoutées; 16 fichiers modifiés, tous dans le périmètre
autorisé; 0 fichier de code, de test, de dépendance ou de `graph/`;
`git diff --check` réussi. Détail en section M de [VALIDATION.md](VALIDATION.md).

Un faux positif est déclaré : le motif `sk-` a d'abord signalé quinze
correspondances, toutes issues de la chaîne « TASK-0011 » lue sans distinction
de casse. Motif resserré : 0 correspondance.

### Non testé

Aucun test automatisé, build, installation, test manuel d'interface, essai
physique Windows ni mesure de performance. Les tests du prototype n'ont pas été
rejoués. Les deux bancs d'essai introduits, `B1` et `B2`, **n'ont pas été
exécutés** : ce sont des preuves exigées, pas des résultats. Le plafond de
blocs DOM/SVG est une hypothèse à réfuter, jamais une capacité.

### Non fait, volontairement

Aucun code, test, dépendance, fichier généré, `graph/`, tag, release ni
historique modifié. `ROADMAP.md`, `FORMAT_MATRIX.md`, `DEC-0007`, `DEC-0010`,
`docs/decisions/README.md` et `DEC-0001` à `DEC-0006` non modifiés. Aucune
tâche suivante créée ni démarrée. Aucun push vers `main`, aucune fusion,
aucune pull request, aucune release, aucun tag, aucun accès privé.

### Conséquence

`TASK-0011` reste `IMPLEMENTED`, jamais `VERIFIED`. `DEC-0007` à `DEC-0012`
restent toutes `PROPOSED`. Aucune tâche n'est `IN_PROGRESS`. La porte **P2
reste ouverte et non franchie**. L'action unique suivante, `ACTION-0019`,
appartient à Sébastien : examen humain final et décision P2 après corrections.
Aucune ligne de code ne peut être écrite avant P2 puis P3.

---

## 2026-08-31 — Porte P2 franchie et TASK-0012 proposée

**Agent :** exécuteur Claude Code, sous le **GO explicite de Sébastien** du
2026-08-31
**Statut à l'issue :** `TASK-0011` → **`VERIFIED`** (attribué par Sébastien,
jamais par l'exécuteur); `TASK-0012` → **`PROPOSED`**

### Fait

- **Vérifications Git préalables** : racine, branche
  `rebuild/v0.2-project-brain`, `HEAD` `57e181f5`, arbre propre, SHA local égal
  au distant, `main` inchangée à `91bbe90f`, aucune tâche `IN_PROGRESS`. Les
  huit contrôles ont réussi.
- **`TASK-0011` passe à `VERIFIED`** : en-tête, table des portes (P2 franchie,
  P3 ouverte), historique d'état, et **section 18** consignant le
  franchissement, les six arbitrages, l'état des livrables et ce que
  l'approbation n'autorise pas.
- **`DEC-0007` à `DEC-0012` passent à `APPROVED`**, chacune avec son option
  arrêtée écrite dans sa section « Décision » : **B** (pile conservée, seul le
  rendu évolue), **A** (HTML/SVG, Canvas 2D seulement si `B2` réfute, WebGL
  différé), **I-E** + **R-C** (l'heuristique reste une simple suggestion),
  **W-B** avec repli **W-C** et **U-B**, **S-C** avec **M-C** conditionnelle à
  `B1` et **M-B** en repli obligatoire, **F-D** (aucune IA dans le noyau MVP).
- **Exception humaine consignée** : l'absence de source primaire externe dans
  `DEC-0012` est acceptée par Sébastien comme décision **interne de périmètre**;
  l'absence reste déclarée, non comblée.
- **Sept livrables à l'état approuvé**, chacun portant la mention explicite
  qu'il **n'a pas été testé physiquement**.
- **Trois champs `replaced_by`** renseignés sur des fiches `VERIFIED` :
  `DEC-0003` → `DEC-0007`, `DEC-0004` → `DEC-0009`, `DEC-0005` → `DEC-0008`.
  Aucun autre contenu de `DEC-0001` à `DEC-0006` n'a changé.
- **Création de `docs/tasks/TASK-0012-technical-risk-gates.md`** au statut
  `PROPOSED` : objectif futur unique, cinq bancs d'essai `B0` (santé du
  prototype), `B1` (migration SQLite Windows), `B2` (rendu HTML/SVG),
  `B3` (identité Windows), `B4` (attributs infonuagiques); branche future
  dédiée `spike/v0.2-technical-risk-gates`; fichiers autorisés et répertoire
  isolé `spikes/`; dépendances soumises à un inventaire de licence préalable;
  critères de succès et d'échec par banc d'essai; preuves et mesures réelles
  exigées; conditions d'arrêt immédiat; aucun changement de code de production;
  aucune fusion automatique; état final `IMPLEMENTED`, **jamais** `VERIFIED`;
  rapport final complet; **GO P3 obligatoire avant exécution**.
- Mise à jour de `docs/decisions/README.md`, de `ROADMAP.md` et de la mémoire
  obligatoire. `NEXT_ACTION.md` contient exactement une action, `ACTION-0020`.

### Vérifié

Quatorze contrôles documentaires exécutés et consignés : états autorisés,
absence de tâche `IN_PROGRESS`, six décisions `APPROVED`, aucun reliquat de
formulation « décision non prise », trois `replaced_by` autorisés et contenu
historique préservé, sept livrables approuvés, action unique, liens internes,
périmètre limité à la documentation, 0 fichier de code, de test, de dépendance
ou de `graph/`, 0 donnée sensible, `git diff --check` réussi, encodage UTF-8 et
fins de ligne LF. Détail en section N de [VALIDATION.md](VALIDATION.md).

### Non testé

Aucun test automatisé, build, installation, test manuel d'interface, essai
physique Windows, rendu ni mesure de performance. Les tests du prototype n'ont
pas été rejoués et leur état de réussite reste **inconnu**. Les cinq bancs
d'essai `B0` à `B4` **n'ont pas été exécutés**. **Une décision `APPROVED`
n'est pas une preuve** : `M-C` reste conditionnée à `B1`, le plafond de blocs
DOM/SVG reste une hypothèse à réfuter par `B2` et n'est pas une capacité
déclarée, l'identité Windows reste non démontrée en Rust stable, et
l'ambiguïté des attributs infonuagiques reste non résolue.

### Non fait, volontairement

Aucun code, test, dépendance, verrou, fichier généré, `graph/`, tag, release ni
historique modifié. `TASK-0012` **n'a pas été exécutée**. Aucune branche de
spike créée, aucun répertoire `spikes/` créé. `DEC-0001`, `DEC-0002` et
`DEC-0006` non modifiées; sur `DEC-0003` à `DEC-0005`, seule la ligne
`replaced_by`. Aucun push vers `main`, aucune fusion, aucune pull request,
aucune release, aucun tag, aucun `force push`, aucun accès privé, aucune
dépense.

### Conséquence

La porte **P2 est franchie**. La porte **P3 est ouverte et non franchie**.
Aucune tâche n'est `IN_PROGRESS`. L'action unique suivante, `ACTION-0020`,
appartient à Sébastien : examiner et approuver ou corriger `TASK-0012` avant
P3. Aucune ligne de code de production ne peut être écrite avant que les bancs
d'essai aient rendu leurs verdicts et qu'une tâche d'implémentation ait été
approuvée séparément.

---

## 2026-08-31 — TASK-0012 exécutée : cinq bancs d'essai, cinq verdicts

**Branche :** `spike/v0.2-technical-risk-gates`, créée depuis `db8d3de0…`
**Autorisation :** GO P3 explicite de Sébastien, avec correction des livrables
**État final :** `TASK-0012` **`IMPLEMENTED`**, jamais auto-déclarée `VERIFIED`

**Première intervention exécutée et mesurée depuis `TASK-0010`.** Les
précédentes étaient documentaires.

### Fait

- `TASK-0012` : `PROPOSED` → `APPROVED` → `IN_PROGRESS` → `IMPLEMENTED`.
  Correction autorisée appliquée : `PERF-0002` et `PERF-0003` ajoutés aux
  livrables, pour que `B1`, `B2` et `B3` portent chacun sa fiche.
- `spikes/` créé : quatre bancs d'essai, un générateur de données synthétiques,
  une charte de non-production, un `.gitignore` pour l'espace de travail.
- Quatre documents de preuves publiés :
  `docs/research/TASK-0012-risk-gate-results.md`, `PERF-0001`, `PERF-0002`,
  `PERF-0003`.
- Six points de contrôle poussés vers `origin/spike/v0.2-technical-risk-gates`,
  SHA local vérifié égal au SHA distant à chacun.

### Verdicts

| Banc | Verdict |
|---|---|
| `B0` | **SUCCÈS** — 36/36 Vitest et 13/13 Rust passent; `cargo build` échoue sur une panique du compilateur, **non corrigée** |
| `B1` | **`M-C` RÉFUTÉE telle qu'écrite** — corruption prouvée par `-wal` orphelin; confirmée seulement durcie |
| `B2` | **Étude Canvas 2D autorisée** — 14,08 ips contre 30 sur `SYN-WIDE`; plafonds réels 3 743 / 3 063 / 939 |
| `B3` | **`I-E` confirmée sur 5 points sur 6** — coût 28,3 µs/élément, 3,1 % du budget; inter-volume **non observé** |
| `B4` | **SUCCÈS** — 3 réponses sourcées Microsoft, 1 question **déclarée non résolue** |

### Ce que ces verdicts changent, et ce qu'ils ne changent pas

Ils **alimentent** des décisions futures. **Ils n'en prennent aucune.** Aucune
fiche `DEC-0001` à `DEC-0012` n'a été modifiée, conformément à §3.

Deux hypothèses approuvées sont **atteintes** : la bascule `M-C` de `DEC-0011`
est une procédure de corruption si elle ne traite pas les fichiers annexes, et
le plafond de 3 000 blocs de `DEC-0008` est remplacé par trois plafonds mesurés
qui varient d'un facteur 4 selon la forme de l'arborescence.

### Non fait, volontairement

Aucun code de production, aucun test, aucune dépendance, aucun verrou, aucun
fichier de `graph/` modifié. **L'échec de `B0` n'a pas été corrigé** — interdit
sans autorisation distincte. **L'inter-volume de `B3` n'a pas été testé** —
`§13.2` en fait une condition d'arrêt, et la règle a été appliquée sans
contournement. **La question 3 de `B4` n'a pas été comblée** — déclarée non
résolue. Aucune fusion, PR, release, étiquette, `force push`, ni push vers
`main` ou `rebuild/v0.2-project-brain`. Aucune dépense.

### Conséquence

La porte **P3 est franchie**. La porte **P4 est ouverte et non franchie**.
Aucune tâche n'est `IN_PROGRESS`. L'action unique suivante, `ACTION-0021`,
appartient à Sébastien : contrôler les preuves de `TASK-0012` et attribuer
`VERIFIED`, ou renvoyer la tâche. La branche de spike n'est **pas** fusionnée;
son sort appartient à Sébastien.

---

## 2026-08-31 — ACTION-0021 close : TASK-0012 VERIFIED, six arbitrages, gouvernance

**Branche :** `spike/v0.2-technical-risk-gates`
**Autorisation :** **GO technique de l'orchestrateur**, sous la délégation
explicite de Sébastien du 2026-08-31, **pour cette étape documentaire
uniquement**
**État final :** `TASK-0012` **`VERIFIED`**; `TASK-0013` **`PROPOSED`**

**Intervention documentaire.** Aucun banc d'essai relancé, aucune mesure
refaite, aucun chiffre nouveau.

### Fait

- **`TASK-0012` : `IMPLEMENTED` → `VERIFIED`**, sur contrôle indépendant
  `ACTION-0021`, mené par une instance distincte de l'exécuteur. **Neuf
  réserves `R1` à `R9` maintenues** : `VERIFIED` ne les lève pas. La question 3
  de `B4` ne bloque pas le passage.
- **`docs/reviews/ACTION-0021-independent-control.md` créé** : ce qui a été
  contrôlé, le résultat, le statut des réserves, ce qui n'a pas été fait.
- **`DEC-0013` créée** — six arbitrages :
  **B** `M-B` baseline (copie de sûreté **de fichier** sur base **quiescée**,
  migration transactionnelle en place, restauration si échec), `M-C` naïve
  réfutée, `M-C` durcie documentée comme alternative défensive, et interdiction
  d'écrire que le `M-B` mesuré exerçait l'**API SQLite Online Backup** — c'était
  une copie de fichier;
  **C** Canvas 2D **non ouvert**, HTML/SVG accessible conservé, **plafond
  universel de 3 000 blocs abandonné**, direction = **budget de rendu
  auto-régulé** + **étude d'un calepin squarifié**, valeurs de `B2` non
  universelles, **réserve `SYN-100K`** respectée;
  **D** inter-volume **non testé**, invariant **`VolumeSerialNumber` +
  `FileId`**, `FileId` seul **interdit**;
  **E** **aucune suppression**, cache incrémental fautif à **conserver ou
  renommer avant** renouvellement, dans une tâche distincte;
  **F** identité après hydratation **ouverte**, risque **requalifié** en perte
  potentielle d'**état utilisateur non reconstructible, possiblement en masse**,
  à fermer **avant** l'identité persistante et l'état vu/non vu.
- **`DEC-0008`, `DEC-0009` et `DEC-0011` amendées par ajout en fin de fiche**,
  avec renvoi vers `DEC-0013`. **Aucun texte antérieur modifié ni supprimé.**
- **Gouvernance clarifiée** dans `AGENTS.md` et `CLAUDE.md` : les **GO
  techniques** viennent de l'orchestrateur technique sous délégation de
  Sébastien; restent **réservés à Sébastien** la dépense, la donnée réelle ou
  personnelle, la publication externe exceptionnelle, l'opération destructive ou
  hors dépôt, et le changement important de portée produit.
- **`TASK-0013` créée, `PROPOSED`** : `B2 bis` — calepin squarifié contre
  calepin actuel, budget de rendu auto-régulé, `SYN-100K`, WebView2 ou substitut
  déclaré, accessibilité sans régression, **critères falsifiables `F1` à `F8`
  écrits avant toute mesure**.
- Mémoire obligatoire mise à jour; `NEXT_ACTION.md` contient **exactement une
  action**, `ACTION-0022`.

### Lacune déclarée, non comblée

Le **texte intégral des réserves `R1` à `R9`** n'a pas été transmis à
l'exécuteur documentaire et **n'est donc pas dans le dépôt**. Il n'a été ni
reformulé, ni résumé, ni reconstitué de mémoire : une reformulation serait une
atténuation, et l'instruction reçue l'interdit. La lacune est déclarée en
section 3 d'`ACTION-0021`, à la manière de la question 3 de `B4`.

### Non fait, volontairement

Aucun banc d'essai relancé. **Aucun document de preuve modifié** — le rapport de
`TASK-0012` et `PERF-0001` à `PERF-0003` sont intacts, et la requalification du
risque de `B4` est écrite dans `DEC-0013`, pas dans le rapport. Aucun code de
production, test, dépendance, verrou ni `graph/`. **Aucune suppression** dans
`src-tauri/target/`. Aucun accès hors dépôt. **`TASK-0013` non exécutée.**
Aucune fusion, PR, release, étiquette, `force push`, ni push vers `main` ou
`rebuild/v0.2-project-brain`. Aucune dépense.

### Conséquence

`TASK-0012` est close. La porte **P4 reste ouverte et non franchie** : aucune
ligne de code de production. La porte suivante est **P3 bis** — approuver ou
corriger `TASK-0013`. Aucune tâche n'est `IN_PROGRESS`. L'action unique
suivante est `ACTION-0022`.

---

## 2026-08-31 — TASK-0013 — B2 bis : calepins comparés, budget de rendu, SYN-100K

**Agent :** exécuteur Claude Code, sous **GO technique de l'orchestrateur**,
porte **P3 bis franchie**
**Statut à l'issue :** **`IMPLEMENTED`** — `VERIFIED` **non attribuée**,
l'exécuteur ne juge pas ses propres preuves
**Branche :** `spike/v0.2-render-budget`, créée depuis `746f1b5` et publiée

### Fait, avant la campagne

- **Annexe jointe à `ACTION-0021`** : le **texte intégral des neuf réserves
  `R1` à `R9`** du contrôle indépendant, sans changement de sens. La lacune
  déclarée en section 3 point 3 et section 6 point 3 est **comblée**; **aucune
  réserve n'est levée**. Commité et poussé sur
  `spike/v0.2-technical-risk-gates` (`746f1b5`).
- Branche dédiée créée depuis cette pointe contrôlée, racine, HEAD, distant et
  arbre propre vérifiés.
- `TASK-0013` passée `APPROVED` puis `IN_PROGRESS`.
- **Banc d'essai écrit et commité AVANT toute mesure** (`85a4a05`) : les huit
  critères `F1` à `F8` étaient déjà dans la fiche; le **plancher de lisibilité**
  du budget et le **matériel de référence** sont commités dans le même point de
  contrôle. **La préséance est vérifiable dans l'historique Git.**

### Fait, pendant la campagne

- **WebView2 tenté en premier**, comme §5.4 l'exige. Six tentatives conservées
  avec commandes, codes de sortie et sorties d'erreur.
- **Quatre phases mesurées, cinq exécutions par mesure**, sur **Microsoft Edge
  152.0.4191.53**, avec **contrôle de continuité** sur **Google Chrome
  151.0.7922.175**.
- `SYN-100K` — 100 000 nœuds, graine fixe — **réellement joué**.
- Déterminisme du budget vérifié par **rejeu hors navigateur de 80 traces
  réelles**.
- Verdicts `F1` à `F8` **calculés par script**, appliquant les énoncés à la
  lettre.

### Résultats

| # | Verdict |
|---|---|
| `F1` calepin squarifié corrige `SYN-WIDE` | **CONFIRMÉE** — 119,05 ips et 14,1 ms p95 contre 21,79 et 43,5, **à nœuds DOM identiques** |
| `F2` la géométrie explique l'avantage | **CONFIRMÉE** — aspect médian 1,01 contre 3 987,79 |
| `F3` le squarifié ne coûte rien ailleurs | **CONFIRMÉE** — +20,2 % à +97,6 % |
| `F4` le budget tient la cible | **RÉFUTÉE** — 26,60 ips en régime stable, convergence jusqu'à 6 065 ms |
| `F5` le budget reste lisible | **CONFIRMÉE** — plancher atteint, tenu, **jamais franchi** |
| `F6` `SYN-100K` tient `DEC-0008` | **CONFIRMÉE** — 120,48 ips, 8,2 ms p95, **3 461 blocs pour 100 000 indexés** |
| `F7` l'accessibilité ne régresse pas | **CONFIRMÉE** — 32 / 32 |
| `F8` le moteur est WebView2 | **RÉFUTÉE** — non instrumentable sans hôte embarqueur |

**Deux réfutations sur huit, publiées telles quelles.** Les deux causes de
`F4` sont mesurées et nommées : une zone morte qui tolère **26,1 ips** alors
que la cible est 30, et un refroidissement qui rend la descente vers le détail
trop lente. **Aucune constante n'a été retouchée** pour faire passer le critère.

Deux constats de méthode : **le moteur pèse plus lourd que le calepin sur deux
formes** — Chrome rend 0,50 à 0,71 fois les ips d'Edge sur la même machine — et
**le banc reproduit `B2`** — 13,32 ips contre 14,08 publiées, même calepin,
même moteur.

### Non fait, volontairement

- **Aucun fichier de production, de test, de dépendance, de verrou ni de
  `graph/`** touché; quatre empreintes SHA-256 **inchangées**.
- **Aucune dépendance** installée. **Ni Canvas 2D ni WebGL.**
- **Aucune fiche `DEC` modifiée, aucune décision prise** : `TASK-0013` §6.1
  interdit de choisir le calepin du produit ou d'adopter un budget.
- **Aucune réserve levée.** `R1` est déclarée *comblée quant au protocole*, pas
  levée : c'est au contrôle indépendant de trancher.
- **Aucune correction de `B0`**, aucune suppression dans `src-tauri/target/`,
  **aucun test inter-volume**.
- **Aucune donnée réelle**, **aucune écriture hors du dépôt**, **aucune
  dépense**.
- **Aucune fusion, PR, release, étiquette, `force push`**, aucun push vers
  `main`.

### Correction de protocole, déclarée

La phase de contrainte du plancher, d'abord jouée à 240 ips, s'est révélée
**atteignable** en mode sans affichage sur écran 240 Hz et n'exerçait donc pas
le plancher. Elle a été rejouée à **1 000 ips**, physiquement inatteignable.
**Le protocole de cette phase a changé; aucun des huit critères n'a bougé.**

### Fichiers

**Créés :** `spikes/fixtures/synthetic-shapes.mjs`;
`spikes/b2bis-layout-and-budget/` — `README.md`, `calepins.mjs`, `budget.mjs`,
`map2.html`, `run-b2bis.mjs`, `detect-webview2.mjs`, `describe-shapes.mjs`,
`replay-budget.mjs`, `verdicts.mjs`, `tables.mjs`;
`docs/performance/PERF-0004-b2bis-layout-and-budget.md`;
`docs/research/TASK-0013-b2-bis-results.md`.

**Modifiés :** `docs/reviews/ACTION-0021-independent-control.md` (annexe
`R1`–`R9`, sur la branche de départ); `docs/tasks/TASK-0013-*.md`; la mémoire
obligatoire.

### Prochaine action unique

`ACTION-0023` — **contrôle indépendant de `TASK-0013`**, par une instance
**distincte de l'exécuteur**. La porte **P4 reste ouverte et non franchie**.

---

## 2026-08-31 — ACTION-0023 — Contrôle indépendant de TASK-0013, et clôture

**Agent :** Claude Code, étape documentaire sous GO technique de
l'orchestrateur
**Statut à l'issue :** `TASK-0013` passe de `IMPLEMENTED` à **`VERIFIED`**

### Fait

- Contrôle indépendant **accepté**, par une instance **distincte de
  l'exécuteur**, **sur preuves**. **Quatre réserves `V1` à `V4`** enregistrées
  dans [`ACTION-0023`](../reviews/ACTION-0023-independent-control.md).
- **`R1` d'`ACTION-0021` LEVÉE** — `SYN-100K` a été réellement joué. **`R8`
  reste EN VIGUEUR**, renforcée. Les sept autres réserves sont inchangées.
- [`DEC-0014`](../decisions/DEC-0014-layout-baseline-and-budget-direction.md)
  enregistre six décisions : `CAL-B` squarifié devient le **calepin baseline**;
  **HTML/SVG accessible** reste la direction; le **contrôleur de budget de
  `TASK-0013` n'est pas adopté** — `F4` réfutée; le **principe** du budget
  auto-régulé est **conservé**; **aucune nouvelle tentative WebView2** avant un
  véritable hôte Tauri.
- `AGENTS.md` et `CLAUDE.md` clarifiés : une tâche `APPROVED` peut autoriser la
  **lecture minimale, ciblée et non récursive** de métadonnées d'outillage.
  Jamais de contenu utilisateur. Aucune écriture hors dépôt ajoutée.

### Non fait, volontairement

**Aucune mesure rejouée, aucune preuve de `TASK-0013` retouchée.** Ni Canvas 2D,
ni WebGL, ni WebView2. Aucune fusion, PR, release, étiquette. **P4 reste
ouverte et non franchie.**

---

## 2026-08-31 — TASK-0014 — B2 ter : correction minimale du contrôleur de budget

**Agent :** exécuteur Claude Code, session `filetopo-task-0014-budget`
**Statut à l'issue :** **`IMPLEMENTED`**, jamais auto-déclarée `VERIFIED`
**Branche :** `spike/v0.2-budget-controller`, créée depuis `933bd0d`

### Fait

- **Critères `G1` à `G9`, configuration du contrôleur, matériel et protocole
  commités AVANT toute mesure**, dans le commit `4a5520b`. Empreintes SHA-256
  du contrôleur, de la page et du pilote **identiques après la campagne**.
- Contrôleur corrigé sur les **deux causes** mesurées de la réfutation de
  `F4` : plus de zone morte sous la cible — seuil lent exactement `1000 / 30`
  ms —, et plus de refroidissement sur un mouvement de même sens.
- Campagne jouée sur **deux moteurs** — Edge 152.0.4191.53 en principal,
  Chrome 151.0.7922.175 en continuité —, **quatre formes**, **cinq exécutions**
  par scénario, plus un **contrôle ponctuel `CAL-A`** qui ne fonde aucun
  critère.
- **De vraies revirtualisations** : 42 à 51 par exécution, contre **0** dans
  `B2 bis`. **De vraies reconstructions DOM**, chronométrées : coût médian
  18,1 à 25,5 ms, soit 0,57 à 0,76 image du budget de 33,3 ms.
- **Neuf verdicts publiés : deux réfutations `G1` et `G2`, un critère bloqué
  `G3`, six confirmations.**
- **Deux défauts de protocole découverts après la première mesure, publiés
  sans atténuation** : le « régime stable » peut ne contenir qu'une poignée
  d'images; la fenêtre stable de `G3` est **vide par construction**. Le
  protocole **n'a pas été changé**, aucune mesure n'a été rejouée, aucune cible
  n'a été déplacée.

### Le résultat, en clair

**La correction minimale n'est pas validée.** Elle corrige bien les deux
causes — c'est vérifiable — mais ne tient **ni la cible** ni **la
convergence** dès que la charge varie réellement. Cause mesurée : les **deux
bornes** de la zone morte tombent **exactement** sur un pas de synchronisation
verticale de 4,1667 ms, si bien qu'une fluctuation inférieure à la milliseconde
fait basculer la décision.

### Non fait, volontairement

- **Aucune tentative WebView2** — `DEC-0014` F l'interdit. Ni Canvas 2D, ni
  WebGL.
- **Aucun budget adopté**, aucune porte franchie, **aucune réserve levée**.
- **Aucune preuve de `TASK-0013` retouchée**, aucune fiche `DEC` existante
  modifiée, aucun fichier de production, de test, de verrou ni de `graph/`
  touché.
- **Aucune donnée réelle**, **aucune écriture hors du dépôt**, **aucune
  dépendance installée**, **aucune dépense**.
- **Aucune fusion, PR, release, étiquette, `force push`**, aucun push vers
  `main`.

### Fichiers

**Créés :** `docs/reviews/ACTION-0023-independent-control.md`;
`docs/decisions/DEC-0014-layout-baseline-and-budget-direction.md`;
`docs/tasks/TASK-0014-b2-ter-budget-controller.md`;
`docs/performance/PERF-0005-b2ter-budget-controller.md`;
`docs/research/TASK-0014-b2-ter-results.md`;
`spikes/b2ter-budget-controller/` — `README.md`, `budget2.mjs`, `map3.html`,
`run-b2ter.mjs`, `replay-budget2.mjs`, `verdicts2.mjs`, `tables2.mjs`,
`analyse-defauts.mjs`.

**Modifiés :** `AGENTS.md`, `CLAUDE.md`, `docs/decisions/README.md`,
`docs/tasks/TASK-0013-b2-bis-layout-and-render-budget.md` (statut, historique
et clôture uniquement), et la mémoire obligatoire.

### Prochaine action unique

**`ACTION-0024`** — contrôle indépendant de `TASK-0014`, par une instance
**distincte de l'exécuteur**. La porte **P4 reste ouverte et non franchie**.

---

## 2026-08-31 — ACTION-0024 et TASK-0015 — Clôture de B2 ter et réalignement produit sur CarteTopo

**Agent :** Claude Code, session `filetopo-task-0015-product-parity`
**Autorisations :** **GO technique de l'orchestrateur** pour la clôture
`ACTION-0024` et pour l'exécution documentaire de `TASK-0015`;
**instruction produit autoritative de Sébastien** pour la direction produit,
point **non délégué**
**Statut à l'issue :** `TASK-0014` → **`VERIFIED`**; `TASK-0015` →
**`IMPLEMENTED`**, jamais auto-déclarée `VERIFIED`; `TASK-0016` →
**`PROPOSED`**, non exécutée

### Fait — ACTION-0024, clôture de TASK-0014

- Contrôle indépendant des preuves de `B2 ter`, par une instance **distincte de
  l'exécuteur**, **sans rejouer aucune mesure**.
- **`TASK-0014` passe à `VERIFIED`**, avec **quatre réserves `W1` à `W4`**.
  `VERIFIED` porte sur la **qualité des preuves**, pas sur le succès du
  mécanisme.
- **La correction minimale du budget est REJETÉE** : `G1` et `G2` réfutées,
  éprouvées sur des critères écrits avant mesure.
- **`G3` bloqué accepté** : la mesure était **vacueuse par construction**;
  **aucune stabilité n'est prouvée** — réserve `W2`.
- **`G9` accepté** : rien n'a changé après mesure; le geste sur la ligne de
  verdict de `G3` **retire une fausse confirmation et n'en ajoute aucune**.
- **`G8` accepté avec la réserve `W1`** : grandeur fragile, mais échantillons
  réels et corroboration sur toute la période.
- **Le budget adaptatif reste une piste mais cesse d'être un prérequis à
  `P4`** : réévalué dans le véritable hôte Tauri/WebView2. **Aucun contrôleur
  de `TASK-0013` ni de `TASK-0014` ne devient du code de production.**

### Fait — TASK-0015, réalignement produit

- **La référence produit est corrigée.** CarteTopo est la **référence
  fonctionnelle**; l'ancienne version publique de FileTopo est un **prototype
  et un audit technique**. « L'ancienne version ne le faisait pas » cesse
  d'être un argument recevable.
- **Contrat de parité créé** — `docs/product/CARTETOPO_FUNCTIONAL_PARITY.md` :
  **22 exigences `P-01` à `P-22`** avec critères falsifiables, **trois
  invariants** `I-1` à `I-3`, **règle de liberté visuelle** et sa
  subordination, **règle complète des relations transversales**, **cinq manques
  déclarés** `M-1` à `M-5`.
- **L'interface visuelle est déclarée entièrement libre** — formes, couleurs,
  typographie, panneaux, animations, organisation —, **sans copie pixel pour
  pixel**, une nouvelle UX étant **encouragée**; **mais aucune amélioration
  visuelle ne peut supprimer la parité**. En cas de conflit, **la parité
  gagne**, et une suppression exige une fiche `DEC`.
- **Quatre fonctions reclassées** d'`ULTÉRIEUR` à **`MVP`** : `F-013` panneau
  latéral, `F-017` relations transversales, `F-018` mise en évidence, `F-019`
  relations entrantes/sortantes. Répartition courante : **`MVP` 35,
  `ULTÉRIEUR` 0, `DIFFÉRÉ` 4**, sur **39** lignes inchangées.
- **`DEC-0015` créée**, qui supplante `DEC-0014` **sur deux points seulement** :
  la **lecture produit** de son point `B` — `CAL-B` est une **primitive
  technique**, pas un contrat visuel ni comportemental — et le **statut de
  prérequis** de son point `E`. **`DEC-0014` n'a pas été réécrite** : un
  **renvoi** est ajouté en tête de fiche.
- **Feuille de route en quatre étapes** : **A** parité fonctionnelle MVP,
  **B** finition visuelle moderne, **C** validation Windows/WebView2 réelle,
  **D** empaquetage et publication. **La parité précède l'esthétique.**
- **`TASK-0016` rédigée, `PROPOSED`** : une **tranche verticale de production
  minimale** — racine synthétique → scan → index persistant → calepinage →
  carte en blocs → sélection → détails, dans un **véritable hôte
  Tauri/WebView2**. Six exigences de parité couvertes, le reste explicitement
  hors périmètre. **Sans budget adaptatif, avec une borne de charge à déclarer
  avant exécution.**

### Non fait, volontairement

- **Aucune ligne de code de production.** La porte **`P4` reste ouverte et non
  franchie**, et **`TASK-0016` n'a pas été exécutée**.
- **Aucune mesure, aucune exécution, aucun test, aucune dépendance.**
  `TASK-0015` est **strictement documentaire** : les 22 critères de parité sont
  des **cibles à falsifier**, **non testées**.
- **Aucune réserve levée.** `V1` à `V4`, `W1` à `W4`, `R2` à `R9` restent en
  vigueur; `R1` reste levée depuis `ACTION-0023`.
- **Aucune fonction inventée** dans la matrice, même pour combler le manque
  `M-1` sur la persistance des préférences.
- **IA, OCR, extraction de contenu, RAG et GraphRAG restent `DIFFÉRÉ`** :
  `DEC-0012` est inchangée, et **aucune exigence de parité ne peut être
  satisfaite au moyen de l'une de ces couches**.
- **Aucun paragraphe de `DEC-0014` modifié**, aucune preuve de `TASK-0012` à
  `TASK-0014` retouchée, **`PROJECT_VISION.md` inchangé**.
- **Aucune tentative WebView2**, ni Canvas 2D, ni WebGL.
- **Aucune donnée, aucun nom privé, aucun chemin privé, aucune métadonnée ni
  aucun code de la référence privée.** Aucune lecture ni écriture hors du
  dépôt. Aucune donnée réelle. Aucune dépense.
- **Aucune fusion, PR, release, étiquette, `force push`**, aucune réécriture
  d'historique, aucun push vers `main`.

### Fichiers

**Créés :** `docs/reviews/ACTION-0024-independent-control.md`;
`docs/tasks/TASK-0015-cartetopo-functional-parity.md`;
`docs/product/CARTETOPO_FUNCTIONAL_PARITY.md`;
`docs/decisions/DEC-0015-product-parity-and-layout-scope.md`;
`docs/tasks/TASK-0016-p4-vertical-slice.md`.

**Modifiés :** `docs/tasks/TASK-0014-b2-ter-budget-controller.md` (statut et
historique uniquement); `docs/decisions/DEC-0014-layout-baseline-and-budget-direction.md`
(**renvoi ajouté en tête, texte d'origine intact**);
`docs/decisions/README.md`; `docs/product/REQUIREMENTS_BASELINE.md`;
`docs/product/FEATURE_MATRIX.md`; `docs/product/REFERENCE_INTERFACE.md`
(renvoi uniquement); `ROADMAP.md`; et la mémoire obligatoire —
`CURRENT_STATE.md`, `NEXT_ACTION.md`, `HANDOFF.md`, `VALIDATION.md`,
`CHANGELOG_AI.md`.

**Inchangés, contrôlés par `git diff` : `src/`, `src-tauri/`, `tests/`,
`public/`, `scripts/`, `.github/`, `spikes/`, `graph/` — sortie vide.**

### Prochaine action unique

**`ACTION-0025`** — contrôle indépendant du **réalignement produit** de
`TASK-0015`, par une instance **distincte de l'exécuteur**, **puis décision de
franchir la porte `P4`**. La porte **`P4` reste ouverte et non franchie**.

---

## 2026-08-31 — ACTION-0025 : contrôle de TASK-0015, correction X1, franchissement de P4

**Nature : strictement documentaire.** Aucune ligne de code, aucune mesure,
aucune exécution, aucune dépendance.

### Fait

- **Contrôle indépendant de `TASK-0015` accepté.** La tâche passe de
  `IMPLEMENTED` à **`VERIFIED`**, par une instance **distincte de
  l'exécuteur**. `VERIFIED` porte sur la **qualité du livrable documentaire**,
  pas sur la faisabilité du contrat de parité : **aucun de ses 22 critères n'a
  été exécuté**.
- **Réserve normative `X1` émise et corrigée dans le même geste.** Le contrat
  employait « suggérée » comme **provenance de relation** en §4 (`P-04`) et
  §5.1.2, contre §5.1.3 qui établit qu'**une suggestion n'est pas une
  relation**. Désormais : **relation établie** ⇒ provenance `déterministe`
  **ou** `approuvée`, sans troisième valeur; **suggestion** ⇒ **objet et état
  distincts**, **affichables** mais **jamais** présentés comme relation
  établie ni comptés dans `P-05`; l'approbation **transforme** la suggestion
  en relation `approuvée`. **Trois formulations alignées, aucune portée
  changée.**
- **La porte `P4` est FRANCHIE.** Elle autorise l'approbation puis l'exécution
  de **`TASK-0016`**, dans le périmètre écrit de sa §4, **et rien d'autre**.
- **`M-1` daté** : ne bloque pas `P4`, doit être résolu **avant** la tranche
  qui implémente réellement `P-19`.
- **`H1` à `H11` de `TASK-0016` deviennent obligatoires**, à compléter, commiter
  et **figer avant la première exécution**.

### Non fait, volontairement

- **Aucune mesure, aucune exécution, aucun test.**
- **Aucune réserve levée** : `V1` à `V4`, `W1` à `W4`, `R2` à `R9` en vigueur;
  `R1` reste levée depuis `ACTION-0023`. **`R8` appartient à l'étape C.**
- **Aucune décision produit de Sébastien rejugée** — `DEC-0015` `A`, `B`, `C`.
- **Aucun paragraphe de `DEC-0014` modifié**, aucune preuve de `TASK-0012` à
  `TASK-0014` retouchée, **aucun historique réécrit**.
- **`M-1` non comblé**, question 3 de `B4` non fermée, inter-volume de `B3`
  non testé, échec de `B0` non corrigé.
- **Aucune donnée réelle, aucune dépense, aucune lecture ni écriture hors du
  dépôt, aucune publication externe.**
- **Aucune fusion, PR, release, étiquette, `force push`.**

### Fichiers

**Créés :** `docs/reviews/ACTION-0025-independent-control.md`;
`docs/decisions/DEC-0016-p4-gate-crossing-and-first-slice.md`.

**Modifiés :** `docs/product/CARTETOPO_FUNCTIONAL_PARITY.md` (**correction
`X1`**, trois formulations, portée inchangée);
`docs/tasks/TASK-0015-cartetopo-functional-parity.md` (statut et historique);
`docs/decisions/README.md`; `ROADMAP.md`; et la mémoire obligatoire —
`CURRENT_STATE.md`, `NEXT_ACTION.md`, `HANDOFF.md`, `VALIDATION.md`,
`CHANGELOG_AI.md`.

**Inchangés : `src/`, `src-tauri/`, `tests/`, `public/`, `scripts/`,
`.github/`, `spikes/`, `graph/`.**

### Prochaine action unique

**Figer puis exécuter `TASK-0016`** — première tranche verticale de
production, branche `build/v0.2-p4-vertical-slice`.

---

## 2026-08-31 — TASK-0016 : première tranche verticale de code de production

**Nature : code de production, exécuté et mesuré dans un véritable hôte
Tauri/WebView2.** Première tâche du projet à écrire du code de production.

### Fait

- **La chaîne verticale existe** : fixture synthétique → scan Rust en lecture
  seule → index SQLite persistant et reconstructible → calepinage hiérarchique
  → carte HTML/SVG accessible dans **WebView2** → panoramique, zoom, ajuster,
  réinitialiser → sélection **souris et clavier** → détails avec parent et
  enfants directs.
- **Les critères ont été gelés AVANT le code.** Commit `6edd5bd` fige `H1` à
  `H11`, les quatre fixtures et les bornes `B-1` à `B-4`; le premier code
  arrive en `130b670`. **Aucun critère n'a été retouché après le premier
  résultat.**
- **Les onze critères sont tenus**, chacun rejoué deux fois : par les tests
  automatisés en répertoires temporaires, et **à travers les vraies commandes
  dans l'hôte réel**.
- **`H8` : le moteur de production est enfin nommé** — **WebView2
  `151.0.4129.107`**, Tauri `2.11.5`, SQLite `3.53.2`.
- **`H9` : premières mesures du projet dans WebView2**, cinq exécutions par
  fixture, 750 images et 60 sélections chacune. `wide` 2 207 nœuds à
  **16,70 ms** d'image médiane, `mixed` 2 420 nœuds à **20,20 ms**.
- **`H10` : le calepinage est bien un coût d'indexation** — une invocation par
  arborescence, **zéro** pendant la navigation, moins de 1 % du temps de
  construction.
- **Un calepinage qui ne perd aucun nœud.** Un treemap pondéré par la taille
  effondrerait les dossiers vides en lamelles nulles; la propagation d'aire
  minimale ascendante garantit à chaque nœud une aire utilisable, et la racine
  dérive sa taille de la demande. `DEC-0015` D veut que **l'algorithme cède**,
  pas l'exigence.
- **Trois défauts de protocole trouvés en mesurant, et publiés** avec ce que
  chacun aurait produit : fenêtre occultée suspendant les images, carte mesurée
  à 1 × 1 pixel, remise en page pendant la course.
- **Une fuite de confidentialité trouvée et corrigée avant tout commit
  d'artefact** : le chemin du bac à sable était publié en absolu. Il est
  désormais **nommé** et jamais épelé, et un test le verrouille.
- **`B0` s'est reproduit deux fois**, exactement comme `DEC-0013` E le décrit.
  **Enregistré comme reproduction connue**, contourné par `CARGO_INCREMENTAL=0`.

### Non fait, volontairement

- **`B0` n'est pas corrigé**, et **rien n'a été supprimé, nettoyé ni renommé**
  dans `src-tauri/target/` — `DEC-0013` E.
- **Aucun budget adaptatif** employé, adopté, abandonné ni validé. **Aucun
  contrôleur de spike repris** — `DEC-0015` F. La borne `B-1` est un **plafond
  déclaré** qui ne s'ajuste à rien.
- **Ni Canvas 2D, ni WebGL.** **Aucune dépendance nouvelle.**
- **Aucune relation transversale, recherche, filtre, légende, surveillance,
  journal, état vu/non vu, multi-cerveaux, bilinguisme intégral.**
- **Aucun sélecteur de dossier utilisateur, aucune donnée réelle**, aucun
  dossier personnel lu, listé ou écrit.
- **Aucune réserve levée** : `V1` à `V4`, `W1` à `W4`, `R2` à `R9`. **`R8`
  reste entière** — sa levée appartient à l'étape **C**.
- **Aucune exigence de parité déclarée satisfaite sans preuve.** Six le sont
  **sur ce périmètre**, deux sont **partielles**, **seize ne sont pas
  commencées**.
- **`src/App.tsx` et ses douze tests sont intacts.**
- **Aucune fusion, PR, release, étiquette, `force push`**, aucune réécriture
  d'historique, aucun push vers `main`.

### Fichiers

**Créés :** `src-tauri/src/map/{mod,fixtures,layout,store,sandbox,commands}.rs`;
`src/map/{types,viewState,hierarchy,measure,MapView,DetailsPanel,MapApp}.tsx|ts`;
`src/map/map.css`; `src/map/{viewState,mapView}.test.*`;
`docs/research/TASK-0016-p4-vertical-slice-results.md`;
`docs/performance/PERF-0006-p4-vertical-slice.md`;
`docs/performance/runs/TASK-0016-H9-webview2.json`;
`docs/performance/runs/TASK-0016-H1-H7-verification.json`.

**Modifiés :** `src-tauri/src/lib.rs` (commandes de la tranche, ajoutées sans
retirer les commandes existantes); `src/main.tsx` (démarre sur la tranche);
`.gitignore`; `docs/tasks/TASK-0016-p4-vertical-slice.md` (§12 gel, §13
résultat, §14 historique); et la mémoire obligatoire — `CURRENT_STATE.md`,
`NEXT_ACTION.md`, `HANDOFF.md`, `VALIDATION.md`, `CHANGELOG_AI.md`.

**Inchangés :** `graph/`, `spikes/`, `scripts/`, `.github/`, `public/`,
`src/App.tsx` et ses tests, `PROJECT_VISION.md`, `DEC-0014`, `DEC-0015`.

### Prochaine action unique

**`ACTION-0026`** — **contrôle indépendant de `TASK-0016`**, par une instance
**distincte de son exécuteur**. `TASK-0016` reste **`IMPLEMENTED`**.

---

## 2026-08-31 — ACTION-0026 : réserve bloquante X2, et correction

**Verdict du contrôle indépendant : `CHANGES_REQUIRED`.** `TASK-0016` **reste
`IMPLEMENTED`**.

### Fait

- **`X2` enregistrée.** Le runtime du produit courant enregistrait encore huit
  commandes héritées de la 0.1 — dont `choose_collection`, un **sélecteur de
  dossier réel** — et initialisait `tauri_plugin_dialog`, contre §12.4.
  **Une commande enregistrée est invocable**, qu'un bouton la propose ou non.
- **Runtime isolé.** L'`invoke_handler` n'enregistre plus que les **neuf
  commandes `map_*`**; plugin de dialogue et `.manage(IndexJobs)` retirés.
- **Code historique conservé** : aucune fonction supprimée, `src/App.tsx` et
  ses douze tests intacts, aucun historique réécrit. Les éléments devenus
  inatteignables portent une annotation qui dit **pourquoi** ils sont gardés.
- **Deux tests-gardes**, qui lisent la source embarquée à la compilation faute
  de pouvoir introspecter `generate_handler!`, et **éprouvés en réintroduisant
  temporairement le défaut** : les deux échouent alors.
- **Validation intégralement rejouée** sur le binaire corrigé : 42 tests Rust,
  59 TypeScript, 0 avertissement, `H1` à `H11` dans l'hôte réel, **`H9`
  complet**.
- **`H9` est légèrement moins bon** — `wide` 17,80 ms contre 16,70, `mixed`
  21,35 contre 20,20 — **publié tel quel, sans explication a posteriori**.
- **Chiffres inventés corrigés.** Quatre minima de latence de sélection avaient
  été écrits de mémoire dans `PERF-0006` au lieu d'être lus dans l'artefact;
  ils sont remplacés par les valeurs réelles.
- **`B0` : troisième reproduction**, identique, non corrigé, rien supprimé de
  `src-tauri/target/`.

### Non fait, volontairement

- **Aucun critère `H1` à `H11` modifié. Aucune borne `B-1` à `B-4` retouchée.**
- **Aucune optimisation de performance** à l'occasion de la correction.
- **Aucune dépendance nouvelle**, et **`tauri-plugin-dialog` reste au
  manifeste** : ce n'est pas un nettoyage général.
- **Aucune fonctionnalité de la tranche `map` modifiée** hors ce que `X2`
  exigeait.
- **Aucune réserve levée**; `R8` reste entière.
- **Aucune donnée réelle, aucune fusion, PR, release, étiquette, `force
  push`**, aucune réécriture d'historique.

### Fichiers

**Créés :** `docs/reviews/ACTION-0026-independent-control.md`.

**Modifiés :** `src-tauri/src/lib.rs` (gestionnaire, runtime, 2 tests-gardes,
annotations); `src-tauri/src/{domain,index,scanner}.rs` (annotations
uniquement); `docs/tasks/TASK-0016-p4-vertical-slice.md` (§15, §16);
`docs/research/TASK-0016-p4-vertical-slice-results.md` (§13, chiffres rejoués);
`docs/performance/PERF-0006-p4-vertical-slice.md`;
`docs/performance/runs/*.json` (preuves rejouées); et la mémoire obligatoire.

### Prochaine action unique

**RE-CONTRÔLE indépendant de `TASK-0016`**, par une instance **distincte de son
exécuteur**. Corriger son propre livrable ne le vérifie pas.
