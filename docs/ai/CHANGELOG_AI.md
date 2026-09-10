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

---

## 2026-08-31 — Clôture d'ACTION-0026, et workflow de session Claude/Codex

**Nature : gouvernance, workflow et documentation.** **Aucun code de production
n'a changé.**

### Fait

- **Verdict indépendant enregistré** : après re-contrôle direct de GitHub sur
  le commit `a6cf092`, l'orchestrateur technique déclare **`X2` `CLOSED`**,
  **`ACTION-0026` `CLOSED`** et **`TASK-0016` `VERIFIED`**. **Claude n'a pas
  rendu ce verdict.**
- **Trois procédures partagées** créées sous `.orchestrator/protocols/` —
  début, reprise et fermeture de session — en **un seul exemplaire** pour
  Claude Code et Codex.
- **Six wrappers courts** : `.claude/skills/` et `.agents/skills/`. Ils
  **renvoient** au protocole partagé et ne le recopient pas.
- **`.orchestrator/RESULT.md`** créé : rapport compact de la **dernière
  exécution seulement**, remplacé à chaque fois, **Git portant l'historique**.
- **Compatibilité vérifiée avec les CLI installés**, pas supposée. Côté Codex,
  la découverte de `.agents/skills/` a été **testée réellement** avec
  `codex debug prompt-input` : une racine de skills du dépôt apparaît, et les
  trois skills y sont listés.
- **`AGENTS.md` et `CLAUDE.md`** documentent les trois skills et l'emplacement
  des procédures, **sans les recopier**.

### Non fait, volontairement

- **Aucun skill `executer-tache`** : les prompts de l'orchestrateur sont collés
  directement à l'agent.
- **Aucune installation globale.** **Ni `~/.claude`, ni `~/.codex`, ni aucun
  fichier hors dépôt n'a été modifié.**
- **Aucun code de production, aucun test produit, aucune dépendance, aucune
  mesure de performance.**
- **Aucune migration de mémoire ni d'orchestration** : `CURRENT_STATE`,
  `NEXT_ACTION`, fiches, décisions, validations et Git restent les sources
  durables. `.orchestrator/` reste petit.
- **`R8` non levée**, **`B0` non corrigé**, **aucune conclusion nouvelle sur le
  budget adaptatif**, **états de parité inchangés**.
- **Aucune fusion, PR, release, étiquette, `force push`**, aucune réécriture
  d'historique.

### Non testé, déclaré tel quel

**L'invocation `/debut-session` dans Claude Code n'a pas pu être exercée** :
les skills sont énumérés au démarrage d'une session, et celle-ci a commencé
avant la création des fichiers. La convention et l'arborescence sont conformes
au CLI installé, et le frontmatter est prouvé bien formé — mais la réponse
effective de la commande **se vérifiera à la prochaine session**.

### Prochaine action unique

**Spécifier la prochaine tranche de l'étape A**, avec ses critères **gelés
avant tout code**.

---

## 2026-09-01 — TASK-0017 : relations transversales avec provenance

**Branche `build/v0.2-a2-relations`**, créée depuis le tip contrôlé `33704a1`.
**Deuxième tranche de production de l'étape A.** État final : **`IMPLEMENTED`**,
**jamais `VERIFIED`**.

### Fait

- **Fiche `TASK-0017` écrite et gelée AVANT tout code** — commit `51a8cac` :
  modèle normatif, deux types, clé d'endpoint `ek1`, lieu de stockage, deux
  règles déterministes versionnées, fixture synthétique de 12 relations et
  8 suggestions, **comptes attendus nœud par nœud**, et critères `J1` à `J12`.
  Premier code de production : `a98676e`.
- **Un modèle de provenance, structurel.** `relations_deterministic` et
  `relations_approved` sont **deux tables séparées** (`DEC-0009` `R-C`) : la
  provenance **est** la table, donc une relation établie sans provenance n'est
  **pas représentable**. Il n'existe **aucune troisième valeur**.
- **La correction `X1` est implémentée.** Une suggestion est un objet et un
  état **distincts**, dans sa propre table; elle n'entre dans aucun compte, et
  **seule** une approbation explicite la transforme en relation `APPROVED`.
- **Aucun inverse n'est jamais déduit.** Une règle peut se déclarer symétrique;
  **aucune des deux règles de cette tranche ne l'est**, et l'absence d'inverse
  est vérifiée sur les huit paires concernées.
- **Quatre commandes `map_*`** — `map_relations_open`, `map_relations_for_node`,
  `map_relations_approve`, `map_relations_self_check` — donc **sous la
  protection des tests-gardes `X2`**, qui restent `PASS`.
- **Panneau des relations** groupé par direction puis par type, provenance en
  toutes lettres, règle et version consultables, chaque entrée étant un
  `<button>` qui sélectionne l'autre extrémité.
- **Relations dessinées sur la carte** à partir des rectangles **déjà
  persistés**, sans aucun recalcul de calepinage : relation établie en trait
  plein à tête de flèche, suggestion en trait tireté **sans tête** et à anneaux
  ouverts. **Jamais la couleur seule.**
- **Accentuation `P-06` complétée** de sa part transversale, l'atténué restant
  **visible, nommé et dans l'arbre**.
- **Preuves publiées :** `TASK-0017-J12-webview2.json`, scénario complet dans
  **WebView2 `151.0.4129.107`**, et `TASK-0017-J11-isolation.json`.

### Trouvé, et corrigé avant publication

- **Le type d'une relation n'était pas confronté aux deux types déclarés**,
  seulement à la non-vacuité — une lacune du modèle gelé, révélée par un
  avertissement de code mort. Corrigé, motif
  `relation_rejected_unknown_type`, couvert par un test.
- **Trois défauts du harnais de mesure** — panneau lu trop tôt, attente bornée
  en images plutôt qu'en temps, atténuation lue sur le groupe et non sur le
  rectangle — et **un incident d'exécution**, deux instances de l'application
  en parallèle sur le même magasin. **Tous publiés avec ce qu'ils auraient
  produit.** Les artefacts contradictoires ont été **détruits**; la campagne
  publiée vient d'une **exécution unique sur le binaire final**.

### Non fait, volontairement

- **`P-08`, `P-09`, surveillance, journal, vu/non-vu, `P-19`** : non commencés.
- **Aucune heuristique réelle de suggestion.** Les huit suggestions sont
  écrites d'avance dans la fiche.
- **Aucune donnée réelle, aucun sélecteur de dossier**, aucune commande héritée
  de la 0.1 réactivée, **aucune nouvelle dépendance**.
- **La révocation d'une relation approuvée n'est pas implémentée** : aucun
  critère gelé ne la nomme. **`P-04` reste PARTIELLE**, et c'est écrit.
- **Canvas et WebGL restent fermés.** `src/App.tsx` est **intact**.
- **`R8` non levée**, **`B0` non corrigé**, **aucune mesure de performance,
  aucun seuil inventé**, **rien supprimé** dans `src-tauri/target/`.
- **Aucune fusion, PR, release, étiquette, `force push`**, aucune réécriture
  d'historique.

### Gouvernance

**La commande `/debut-session` a été réellement exercée avec succès dans Claude
Code `2.1.252`**, dans une **nouvelle session** ouverte après l'installation des
skills : skill découvert et résolu, protocole partagé
`.orchestrator/protocols/debut-session.md` lu et exécuté, Git vérifié avant
toute lecture, lecture minimale respectée, aucun travail interrompu.
**La réserve « non testé » du 2026-08-31 est levée pour Claude Code.** Elle
**reste entière pour Codex**.

### Prochaine action unique

**Contrôle indépendant de `TASK-0017`**, par une instance **distincte de
l'exécuteur**, **sur preuves**.

---

## 2026-09-01 — TASK-0017 : contrôle indépendant `ACTION-0027`, réserves `X3` et `X4`

**Branche `build/v0.2-a2-relations`.** Corrections en `8a259e9`.
**`TASK-0017` reste `IMPLEMENTED`. `VERIFIED` n'est pas attribué.**

### Verdict enregistré

**`CHANGES_REQUIRED`**, rendu par l'orchestrateur technique, instance distincte
de l'exécuteur, après lecture directe du code, du gel et des preuves.
Le gel `51a8cac` est **accepté comme antérieur** au code `a98676e`; `J1` à
`J11` sont acceptables **sous réserve de `X3`**; `J12` n'était **pas** prouvé
intégralement — `X4`.

### Fait — `X3`

- **Le défaut :** `insert_established()` acceptait `provenance=APPROVED` dès
  lors que la suggestion nommée était déjà approuvée, **sans vérifier que
  source, cible et type correspondaient à cette suggestion**. Une suggestion
  pouvait donc justifier **une relation qui n'était pas elle-même**. La garde
  contrôlait qu'une clé **existe**, pas ce qu'elle **désigne**.
- `insert_established` refuse désormais `APPROVED` **sans condition**.
  **`approve()` est la seule voie applicative.**
- **Schéma en version 2 :** `suggestion_key` **`UNIQUE`** dans
  `relations_approved`, **clé étrangère** vers `relation_suggestions`, et
  **trois déclencheurs** SQLite qui exigent que la ligne approuvée **soit
  exactement sa suggestion** — à l'insertion, à la mise à jour, et en empêchant
  la suggestion de dériver ensuite. **La correspondance est portée par le
  stockage, plus par le Rust.**
- `approve()` écrit un `INSERT` **simple** : `OR IGNORE` transformait un refus
  en non-événement silencieux, ce que `J4` interdit.
- **Migration explicite** d'un magasin de version 1 : la ligne qui ne
  correspond pas à sa suggestion **n'est pas reprise**, et sa clé est écrite
  dans `relation_meta` sous `migration_v2_discarded` — **jamais effacée en
  silence**. Données **synthétiques** uniquement.
- **Neuf tests ajoutés**, dont **cinq écrivent directement en SQL** pour
  prouver les contraintes **au niveau du stockage**.

### Fait — `X4`

- **Le défaut :** l'artefact `J12` **déclarait lui-même** qu'aucune frappe
  `Enter` de confiance n'avait été jouée. **Une déclaration d'honnêteté n'est
  pas une preuve.**
- Le scénario **n'active plus rien**. Il pose le focus, écrit un marqueur, et
  attend une **vraie frappe Windows** envoyée par
  `scripts/j12-send-real-key.ps1` via `WScript.Shell` après `AppActivate`.
  **Aucune nouvelle dépendance** — `WScript.Shell` fait partie de Windows.
- **Trois instruments simultanés :** `isTrusted` de l'activation; les compteurs
  d'appels à `HTMLElement.prototype.click` et de `dispatchEvent` de type
  `click`, qui doivent rester à **zéro**; et le changement observable.
- **Si la frappe n'arrive pas, le scénario échoue.** Jamais de repli sur un
  clic synthétique. **L'approbation d'une suggestion passe par le même
  chemin.**
- **Relevé :** activation de confiance **`true`**, `keydown` de confiance
  **`true`** touche `Enter`, **0** appel `click()`, **0** `dispatchEvent` de
  type `click`, sélection passée de `map-node-6` à **`map-node-9`**, extrémité
  attendue lue **sur l'entrée activée** et confirmée par l'index.

### Trouvé, et publié

**Un cinquième défaut de protocole, dans ma preuve et non dans le produit.**
L'extrémité attendue était calculée depuis `outgoing[0]` **de l'index**, alors
que le panneau **groupe par direction puis par type** : la preuve a publié
`selectionFollowedTheRelation: false` pour un produit qui avait raison.
**Corrigé à la source** — l'entrée porte son extrémité en attributs `data-`, la
preuve la lit sur l'entrée activée, et l'index confirme. Test unitaire ajouté.
**Faux négatif**, publié comme les quatre autres.

### Non fait, volontairement

- **La révocation de `P-04` n'a pas été ajoutée** : explicitement hors du
  périmètre gelé, réservée à une tranche future. **`P-04` reste PARTIELLE.**
- **Aucun critère `J1` à `J12`, aucune fixture gelée, aucune règle gelée**
  modifié.
- **Aucune optimisation de performance, aucune mesure, aucun seuil.** `R8`
  entière.
- **Aucune nouvelle dépendance, aucune donnée réelle, aucun sélecteur de
  dossier.**
- **`B0` non corrigé**, rien supprimé dans `src-tauri/target/`.
- **Aucune fusion, PR, release, étiquette, `force push`**, aucune réécriture
  d'historique.

### Revalidation

**84 / 84** tests Rust, **82 / 82** tests TypeScript, `pnpm check`, `pnpm
build`, build Tauri release sans empaquetage, `J1`–`J5`, `J10`, `J11`,
tests-gardes `X2`, et **`J12` complet dans WebView2 `151.0.4129.107` sur le
binaire final corrigé**.

### Prochaine action unique

**Re-contrôle indépendant de `TASK-0017`.** `X3` et `X4` sont **corrigées, pas
closes**; `ACTION-0027` reste **`OPEN`**.


---

## 2026-09-01 — TASK-0017 VERIFIED, DEC-0017 multi-cerveaux, gel de TASK-0018

**Branche :** `build/v0.2-a3-multibrain-foundation`, créée depuis le tip
contrôlé `50de16b` de `build/v0.2-a2-relations`. **`main` non touchée.**

### Enregistré, pas rendu

Le **re-contrôle indépendant** de l'orchestrateur clôt **`X3`**, **`X4`** et
**`ACTION-0027`**, et attribue **`VERIFIED`** à `TASK-0017`. L'exécuteur
**enregistre** ce verdict; il ne se l'attribue pas.

### Décidé

**`DEC-0017` — FileTopo est multi-cerveaux.** Un cerveau a une identité
`brain_id` **distincte de sa source**, son index, ses relations, son état, son
nom, sa couleur et son icône. Une **vue composée** pourra afficher plusieurs
cerveaux **dans le même graphique, sans jamais les fusionner**; l'affichage
conjoint **ne crée jamais** de relation; une relation inter-cerveaux n'existe
qu'**explicitement**; **supprimer un cerveau ne supprime jamais sa source**;
**la couleur n'est jamais le seul identifiant**.

**`F-040` — vue composée multi-cerveaux**, `MVP`, est ajoutée au modèle
produit : **`MVP` 36, `ULTÉRIEUR` 0, `DIFFÉRÉ` 4, total 40**. **`P-20` reste
entière** et le **contrat de parité n'est pas retouché**.

**Séquence :** `TASK-0018` → `TASK-0019` → `TASK-0020`.

### Gelé, avant tout code

`TASK-0018` §4 : modèle de cerveau, **trois cerveaux synthétiques figés** —
`brain-alpha` et `brain-gamma` partageant **volontairement** la fixture
`quasi-empty` —, disposition du stockage par `brain_id`, et critères **`K1` à
`K12`**.

### Non fait, volontairement

- **Aucune ligne de code** dans ce commit. Le gel précède le code.
- **La révocation de `P-04` n'est pas implémentée** et reste hors périmètre.
- **Aucune nouvelle dépendance, aucune donnée réelle, aucun sélecteur de
  dossier.**
- **`B0` non corrigé**, rien supprimé dans `src-tauri/target/`.
- **Aucune fusion, PR, release, étiquette, `force push`**, aucune réécriture.

### Prochaine action unique

**Exécuter `TASK-0018`** sur ses critères gelés.

---

## 2026-09-01 — TASK-0018 — Fondation multi-cerveaux, exécution

**Agent :** exécuteur Claude Code
**Statut à l'issue :** **`IMPLEMENTED`** — **`VERIFIED` non attribué**,
l'exécuteur ne s'auto-vérifie pas
**Branche :** `build/v0.2-a3-multibrain-foundation`
**Commits :** `51bb687` (gel `K1`–`K12`, **avant tout code**) → `4cb1cf4`
(premier code) → `2424ef2` (preuves `K11` et `K12`)

### Fait

**FileTopo a des cerveaux, et l'isolation est une affaire de stockage.**

- **`src-tauri/src/map/brains.rs`** — `SourceKind` à une seule variante,
  `FROZEN_BRAINS` (§4.2), `BrainRecord`, **`BrainNodeRef`**, et `BrainCatalog`
  : seed **idempotent qui ne corrige jamais** un nom modifié, cerveau actif
  persistant, métadonnées éditables et validées au niveau du magasin.
  `source_ref` **n'a délibérément aucune contrainte `UNIQUE`** : deux cerveaux
  sur une source sont un cas **supporté**, pas un accident à empêcher.
- **`sandbox.rs`** — disposition §4.4 : `brains/catalog.sqlite`,
  `brains/<brain_id>/map/index.sqlite`,
  `brains/<brain_id>/relations/relations.sqlite`. `relative_name()` publie un
  chemin **relatif au bac**, pour qu'aucun chemin local personnel n'entre dans
  le dépôt. Les anciens `maps/` et `relations/` **restent, inutilisés** :
  aucun accesseur n'y mène, **rien n'est supprimé**.
- **`store.rs`** — schéma **version 2** : `map_meta` porte le **`brain_id` pour
  lequel l'index a été construit**, et `built_for_brain()` le rend lisible. Un
  index de version 1 ne nomme **aucun** cerveau, donc n'est celui de personne.
- **`commands.rs`** — pipeline scopé par cerveau; `open_store` **refuse** un
  index construit pour un autre cerveau (`MapError::BrainMismatch`); `detail`
  prend un **`BrainNodeRef`** et refuse une référence frappée ailleurs.
- **`relation_commands.rs`** — clés d'extrémité et magasin **par cerveau**.
  Alpha et Gamma lisent `quasi-empty` et ne partagent **ni fichier ni clé**.
- **`lib.rs`** — `map_brains`, `map_brain_activate`, `map_brain_update`; toutes
  les commandes carte et relations prennent `brain_id`. **La surface reste
  `map_`**, et un test **positif** l'exige désormais aussi.
- **Interface** — `BrainSelector` (menu accessible, opérable au clavier seul,
  actif marqué **par le mot « actif » et `aria-checked`**, jamais par la seule
  couleur), `brainSession.ts` (mémoire de vue **par cerveau**, session
  seulement), `MapApp` démarre sur le **cerveau actif du catalogue** et bascule
  réellement. Le choix de fixture devient un **diagnostic développeur**.
- **`brainScenario.ts` + `scripts/k12-run-real-host.ps1`** — `K12` en **deux
  passes**, avec une **fermeture et un redémarrage réels**, et de **vraies
  frappes Windows**. `realInput.ts` extrait `pressRealKey`/`waitUntil` de
  `relationScenario` **sans changer le mécanisme**, pour que `J12` et `K10`
  aient une seule implémentation de « une vraie frappe ».

### Les douze critères gelés sont tenus

`K1` à `K12`. Comptes `12 → 157 → 12 → 12`, index distincts pour Alpha et
Gamma, approbation dans Alpha sans effet sur Gamma, session par cerveau
restaurée à l'identique, cerveau actif et métadonnées **survivant à un
redémarrage réel**, quatre bascules par frappe réelle avec
`activationIsTrusted = true` et **0** clic programmatique.

### Trouvé et publié

- **Le menu se refermait sur un `blur` à `relatedTarget` nul** — ce qu'une
  **désactivation de fenêtre** produit exactement. La frappe réelle arrivait
  sur un bouton démonté. **`K10` avait raison, le contrôle avait tort.**
- **La vue était ré-ajustée** quand le viewport se stabilisait, effaçant la vue
  qu'un cerveau venait de retrouver : `K12` a publié `alphaRestored=false`
  **sur un produit dont la sélection revenait parfaitement**. Règle désormais
  écrite une fois — `shouldFitOnOpen` — et testée.
- **Un binaire `release` ne peut pas écrire d'artefact**, si bien que la
  première tentative de `K12` **n'a rien publié, pas même son abandon**.
- **`Write-Output` dans une fonction PowerShell entre dans sa valeur de
  retour**, ce qui a fait **annoncer un succès** après un abandon.

### Validations

104/104 Rust (84 → 104), 97/97 TypeScript (82 → 97), `pnpm check` **PASS**,
`pnpm build` **PASS**, builds Tauri `debug` et `release` **PASS**, `K11` et
`K12` **PASS** dans WebView2 `151.0.4129.107`.

### Non fait, et déclaré tel

- **`J12` n'a pas été rejoué dans l'hôte** : le rejouer aurait **écrasé** la
  preuve publiée d'une tâche `VERIFIED`. **Non testé.**
- **Aucune mesure de performance, aucun seuil.** `R8` entière.
- **Les campagnes de vérification et de mesure marchent par cerveau** et ne
  couvrent plus `wide` ni `mixed`; les artefacts de `TASK-0016` sont
  **inchangés**.
- **`P-19` non revendiquée**, **révocation de `P-04` non implémentée**,
  **`P-21` non satisfaite**, **`ek1` toujours pas `I-E`**.
- **`B0` s'est reproduit une quatrième fois**; **rien supprimé ni renommé**
  dans `src-tauri/target/`.
- **Aucune nouvelle dépendance, aucune donnée réelle, aucun sélecteur de
  dossier.**
- **Aucune fusion, PR, release, étiquette, `force push`**, aucune réécriture.

### Prochaine action unique

**Contrôle indépendant de `TASK-0018`**, par une instance distincte de
l'exécuteur, **sur preuves**.


## 2026-09-01 — TASK-0018 — Correction de la réserve `X5` d'`ACTION-0028`

**Contrôle indépendant enregistré :**
[`ACTION-0028`](../reviews/ACTION-0028-independent-control.md) —
**`CHANGES_REQUIRED`**. Le fond de `K1` à `K12` est **accepté**; une seule
réserve bloque `VERIFIED`.

**`X5` — les outils du runtime courant pouvaient écraser les artefacts
canoniques de tâches déjà `VERIFIED`.** Le rapport de `TASK-0018` le disait
lui-même : `J12` n'avait pas été rejoué **parce que** le rejouer aurait détruit
la preuve publiée de `TASK-0017`. Le risque n'était pas théorique — il avait
déjà coûté une preuve.

### La règle instaurée

**Une exécution d'une tâche ultérieure ne remplace jamais la preuve canonique
d'une tâche antérieure `VERIFIED`.** Elle est tenue **à la porte** :
`write_run_artifact` refuse un nom protégé **avant tout accès au disque**.
Quatre artefacts sont protégés — les campagnes `H1`–`H7` et `H9` de
`TASK-0016`, `J11` et `J12` de `TASK-0017` — et restent **bit-for-bit**
inchangés.

### Les scénarios migrants, renommés

| Ce qui s'exécute | Écrit désormais |
|---|---|
| boucle de mesure, par cerveau | `TASK-0018-H9-multibrain-regression-webview2.json` |
| scénario relations, sur `brain-alpha` | `TASK-0018-J12-relations-regression-webview2.json` |

Chaque artefact déclare `task`, `sourceCriterion`, `nature`, `doesNotReplace`
et `replacesCanonicalEvidence: false`. **Aucune mesure `H9` n'a été
exécutée** : cette tranche n'a aucun critère de performance, `R8` reste
entière.

### Le `J12` de régression a été rejoué

Une exécution, `brain-alpha`, WebView2 `151.0.4129.107`, **vraie frappe
Windows** : `isTrusted` à `true` sur la traversée **et** sur l'approbation,
**0** `click()` programmatique, **0** `dispatchEvent(click)`, `S-005` approuvée
explicitement, `X3` respecté, comptes cohérents. **La preuve originale de
`TASK-0017` est inchangée.**

### Garde

**9 tests neufs** — 7 TypeScript, 2 Rust — **éprouvés par mutation** : en
réintroduisant `name: "TASK-0017-J12-webview2.json"`, deux tests échouent en
nommant le fichier fautif.

### Validations

106/106 Rust (104 → 106), 104/104 TypeScript (97 → 104), `pnpm check`
**PASS**, `pnpm build` **PASS**, build Tauri `debug --no-bundle` **PASS**,
`J12` de régression **PASS** dans WebView2. Empreintes des deux artefacts
protégés **inchangées**, `git diff` vide.

### Non fait, et déclaré tel

- **Aucune campagne `H9`**, aucun seuil. `R8` entière.
- **`K12` non rejoué** : aucun code produit de bascule, de catalogue ou de
  session n'a été modifié.
- **`B0` s'est reproduit une cinquième fois**, sur `cargo test`; **rien
  supprimé ni renommé** dans `src-tauri/target/`.
- **Aucune nouvelle dépendance, aucune donnée réelle, aucun sélecteur de
  dossier.**
- **Aucune fusion, PR, release, étiquette, `force push`**, aucune réécriture.

### État

**`X5` : `OPEN`** — corrigée, **non close**. **`ACTION-0028` :
`CHANGES_REQUIRED`**. **`TASK-0018` : `IMPLEMENTED`**, `VERIFIED` non attribué.

### Prochaine action unique

**Re-contrôle indépendant de `TASK-0018`, sur `X5` uniquement**, par une
instance distincte de l'exécuteur, **sur preuves**.

---

## 2026-09-02 — TASK-0019 — Vue composée multi-cerveaux, exécution

**Agent :** exécuteur Claude Code
**Statut à l'issue :** **`IMPLEMENTED`** — `VERIFIED` **non attribué**
**Branche :** `build/v0.2-a4-composed-view`
**Session :** reprise après une session interrompue; l'arbre portait une
implémentation à mi-refactor qui ne compilait pas. **Rien n'a été effacé ni
recommencé** : le point d'arrêt a été situé, puis le travail repris.

### Ce que FileTopo sait faire maintenant

**Plusieurs cerveaux dans UN SEUL graphique, sans être mélangés.** Un canevas
`SVG`, un territoire par cerveau, chacun gardant son index, ses relations et son
état. `C2` affiche 12 + 12 nœuds venus de **deux** fichiers `SQLite` distincts;
`C3` en affiche 181 en trois territoires. Composer ne fusionne rien : ajouter et
retirer sont des actes d'**affichage**, et l'artefact publie les chemins réels
qui le montrent.

**Le gel précède le code.** `bcbc4aa` fige le modèle, `C1`/`C2`/`C3`, les
formules de territoire et les critères `L1`–`L12` **avant** la première ligne de
cette tranche. **Aucun critère n'a été retouché après le premier résultat.**

### Les douze critères

`L1` à `L11` : **TENUS**. `L12` : **tenu à seize étapes sur dix-sept**, la
dix-septième incluse — le redémarrage réel confirme Gamma actif et la
composition **non** persistée, qui est la limite déclarée en §3.

**La seule cible manquée est publiée comme manquée** : la moitié « approuver
`S-005` dans Alpha » de l'étape 7 n'a pas pu être **rejouée**, `S-005` étant
déjà approuvée dans le bac à sable persistant par une exécution antérieure du
rejeu `K12`. Le magasin refuse une seconde approbation — c'est `X3` qui
fonctionne. La moitié qui porte `L8`, « Gamma strictement inchangé », est
tenue, et l'artefact dit en toutes lettres pourquoi l'autre ne l'est pas.

### L'isolation, à l'écran cette fois

**Un `id` DOM n'est jamais partagé.** Alpha et Gamma lisent la même fixture,
donc `node_id = 4` existe des deux côtés; les éléments s'appellent
`brain-alpha-map-node-4` et `brain-gamma-map-node-4`. Ce n'est pas cosmétique :
`aria-activedescendant` pointe vers **un** `id`, et `getElementById` renvoie **le
premier** — le lecteur d'écran et le scénario auraient tous deux suivi le mauvais
cerveau, en silence.

**Aucune arête ne traverse une frontière.** 32 arêtes dessinées, **0**
inter-cerveaux, lues en comparant les **deux** extrémités de chaque arête plutôt
qu'en comptant.

**Composer ne recalcule aucun calepinage.** Les rectangles d'Alpha seul et
d'Alpha dans `C2` sont **identiques**, et un pan ou un zoom ne les touche pas.

### L'UX du sélecteur unique est remplacée

`BrainSelector.tsx` est **supprimé** : §4.4 le remplace par la barre de
composition. Les affirmations `K7`, `K8` et `K10` qu'il portait sont **reprises
une à une** dans `brains.test.tsx`, contre le nouveau contrôle — les supprimer
avec le composant aurait retiré trois critères de la suite sans le dire.

### Quatre défauts trouvés en chemin

1. **`scripts/k12-run-real-host.ps1` supprimait une preuve protégée.** Il
   effaçait `TASK-0018-K12-webview2-pass$Pass.json` avant chaque passe — devenu
   preuve canonique d'une tâche `VERIFIED` par `ACTION-0029`. **La porte
   d'écriture de l'application ne dit rien d'un script qui la contourne.** Les
   deux scripts portent désormais une liste protégée et un `Assert-NotProtected`.
2. **Le rejeu `J12` déclarait `task: "TASK-0018"` dans un fichier `TASK-0019`.**
   Le nom et la charge utile se contredisaient. Corrigé, et un **test de garde**
   exige maintenant que toute source qui écrit un artefact déclare `TASK-0019`.
3. **Un défaut de mesure, dans le scénario et non dans le produit.** La première
   exécution de `L12` a publié `restoredExactly=false` : la vue **était**
   restaurée, un rendu plus tard. Corrigé en attendant que la valeur *cesse de
   changer*, jamais qu'elle atteigne une valeur attendue — attendre une valeur
   précise serait supposer la réponse.
4. **Un octet `NUL` était commité** dans `src/map/brainScenario.ts`, dans un
   littéral. Réparé.

### Validations

`pnpm check` **PASS**; **139/139** TypeScript (107 → 139); **107/107** Rust;
`pnpm build` **PASS**; build Tauri `debug --no-bundle` **PASS**; `L12` **deux
passes** dans WebView2 `152.0.4191.53` avec fermeture et redémarrage réels;
`K12` de régression deux passes; `J12` de régression une passe; `L11` lecture
seule sur trois cerveaux. **Les huit preuves protégées sont inchangées.**

### Non fait, et déclaré tel

- **Aucune campagne `H9`**, aucun seuil. `R8` entière.
- **Persistance de la composition non implémentée** — `P-19` demeure.
- **Aucune relation inter-cerveaux** — `TASK-0020`.
- **`P-04` non révoquée**, `P-21` non satisfaite.
- **`B0` s'est reproduit une sixième fois** sur `cargo test`; contourné par
  `CARGO_INCREMENTAL=0`, **rien supprimé ni renommé** dans `src-tauri/target/`.
- **Aucune nouvelle dépendance, aucune donnée réelle, aucun sélecteur de
  dossier.**
- **Aucune fusion, PR, release, étiquette, `force push`**, aucune réécriture.

### État

**`TASK-0019` : `IMPLEMENTED`.** L'action suivante est son **contrôle
indépendant**, par une instance **distincte de l'exécuteur**, **sur preuves**.

## 2026-09-02 — `TASK-0019` : réserve `X6` corrigée, `L12` rejoué en entier

**`ACTION-0030` a rendu `CHANGES_REQUIRED`** sur `TASK-0019`. Le fond est
accepté — gel avant code, `L1`–`L11`, `L12` étapes 1–6 et 8–17, `C2`/`C3`, un
seul `SVG`, territoires, collisions `DOM`, relations intra-cerveau, mémoire,
clavier réel, redémarrage réel. **Une seule réserve, `X6` :** `L12` étape 7
exigeait d'**approuver** `S-005` dans Alpha, et l'**acte** n'avait pas eu lieu.

### Ce qui a été fait

**Rien n'a été supprimé.** Effacer le bac à sable pour retrouver un `S-005` en
attente serait une suppression, réservée à Sébastien. Le bac existant est resté
**intact** — empreinte identique avant et après.

**Un namespace neuf, confiné.** `FILETOPO_SANDBOX_VARIANT`, variable de
**développement** lue par `map/sandbox.rs`, résout
`<dépôt>/.filetopo-sandbox/variants/<variant>`. Variable absente :
**comportement exactement inchangé**. La valeur est un **nom**, jamais un
chemin — basename ASCII `[A-Za-z0-9_-]`, 1 à 64 caractères; tout le reste est
une **erreur explicite**, jamais un repli silencieux vers un chemin fourni par
l'appelant. **Aucun sélecteur de dossier, aucune racine utilisateur.** Six
tests couvrent le confinement, dont « aucun variant accepté ne sort du bac à
sable ».

**`scripts/l12-run-real-host.ps1`** tire un variant neuf par invocation, le
garde identique pour les deux passes, retire la variable en sortant, et **ne
supprime pas le répertoire du variant**.

**`L12` a été rejoué en entier.** Alpha : `4` approuvées / `4` en attente →
`5` / `3`, `S-005` approuvée, variation **exactement `+1` / `-1`**, pendant que
`C2` [Alpha, Gamma] était affichée. Gamma : `4` / `4`, `S-005` toujours en
attente, magasin distinct. `pass2`, après une fermeture et un redémarrage
réels, porte le **même** variant et confirme Gamma seul.

### Défaut trouvé en chemin

**Un octet `NUL` était commité dans la fiche `TASK-0019` elle-même**, dans la
phrase qui décrit le `NUL` de `brainScenario.ts`. Il rendait le fichier binaire
pour `git diff` et `grep`. Écrit `<NUL>`.

### Validations

**113/113** Rust (107 → 113); **139/139** TypeScript; `pnpm check`, `pnpm build`
et Tauri `debug --no-bundle` **PASS**; **`L12` deux passes** dans `WebView2`
`152.0.4191.53`. `K11`, `K12`, `J12` **non rejoués** — code fonctionnel
inchangé. **Les huit preuves protégées sont bit-for-bit inchangées.**

### Non fait, et déclaré tel

- **`X6` reste `OPEN`** — l'exécuteur ne ferme pas sa propre réserve.
- **Aucune campagne `H9`**, aucun seuil. `R8` entière.
- **Aucune relation inter-cerveaux**, **aucune persistance de composition**.
- **`B0` s'est reproduit une septième fois**; contourné par
  `CARGO_INCREMENTAL=0`, **rien supprimé ni renommé** dans `src-tauri/target/`.
- **Aucune nouvelle dépendance, aucune donnée réelle, aucun sélecteur de
  dossier.**
- **Aucune fusion, PR, release, étiquette, `force push`**, aucune réécriture.

### État

**`TASK-0019` : `IMPLEMENTED`.** L'action suivante est le **re-contrôle
indépendant de `X6` uniquement**, par une instance **distincte de l'exécuteur**,
**sur preuves**.


---

## 2026-09-02 — `TASK-0020` : deux cerveaux peuvent être reliés sans être fusionnés

**Branche `build/v0.2-a5-interbrain-relations`, depuis le tip contrôlé
`8d1e271`.** Gel `7746fd4` **avant** le code `d1adcf2`.

### Enregistré, non attribué

**`TASK-0019` est `VERIFIED`** — verdict de l'**orchestrateur technique**,
instance distincte de l'exécuteur, sur preuves :
[`ACTION-0031`](../reviews/ACTION-0031-independent-recontrol.md), réserve `X6`
**`CLOSED`**, `ACTION-0030` **`CLOSED`**, `HEAD` contrôlé `8d1e271`.

### Décision produit

**`DEC-0018` — une relation inter-cerveaux est explicite et ne fusionne rien.**
`F-041` ajoutée, `MVP`. Matrice **41** lignes : `MVP` **37**, `ULTÉRIEUR` 0,
`DIFFÉRÉ` 4. Aucune ligne existante n'a changé de classification, aucune n'est
descendue, aucune n'a disparu. `P-04`, `P-05`, `P-06`, `P-20` entières, contrat
CarteTopo non retouché.

### Ce qui a été construit

- **`brains/interbrain/relations.sqlite`** — un magasin **commun**, à côté des
  cerveaux et dans aucun d'eux, hors de tout `map/` qu'un rebuild remplace,
  distinct du catalogue. Une relation `A → B` appartient au **lien**.
- **`cek1|<brain_id>|<relative_path>`** — un endpoint versionné, sans aucune
  dépendance à un `map_nodes.id`, résolu **dans le cerveau que la clé nomme**.
  Déclaré comme le **repli déterministe** : ce n'est pas `I-E`.
- **Un modèle où l'invalide est irreprésentable** — pas de colonne
  `provenance` (la table *est* la provenance), `CHECK` sur les deux `brain_id`,
  et les défenses `X3` transposées **au niveau `SQLite`** sur les six champs.
- **`XBR-1`** — 6 relations `DETERMINISTIC` de règles nommées et versionnées,
  4 suggestions `pending`, 0 approuvée. Les **seize** chemins confrontés au
  planificateur de fixtures **avant** le gel; tous existent.
- **Quatre commandes `map_*`** et une lecture des références gelées. Aucune
  commande héritée, aucun sélecteur de dossier.
- **Des arêtes qui traversent vraiment**, distinctes **sans couleur**; un
  **panneau séparé** qui nomme les deux cerveaux en mots; une **navigation**
  vers un cerveau hors de la vue qui **ne crée rien**.

### Ce que la mesure a trouvé, et qui a été corrigé à la source

Le nouveau panneau et les nouvelles arêtes partageaient des classes `CSS` avec
les anciennes, et **deux mesures antérieures se sont mises à compter des
éléments qui ne les regardaient pas** — `J12` et `L12` ont publié des écarts
alors que rien n'était cassé. Espaces de noms disjoints, style partagé par la
feuille de style, deux tests de garde. Après correction, les deux régressions
retrouvent **exactement** leurs valeurs d'origine.

### Limites déclarées

**Aucune détection automatique**, aucune heuristique, aucune inverse inventée.
**Aucune campagne `H9`**, aucun seuil : `R8` entière. **`I-E` complète** hors
périmètre. **`P-19`** et **`P-21`** demeurent. **`B0`** non corrigé, rien
supprimé dans `src-tauri/target/`. Une seule machine, un seul `WebView2`.

### État

**`TASK-0020` : `IMPLEMENTED`.** L'action suivante est le **contrôle
indépendant**, par une instance **distincte de l'exécuteur**, **sur preuves**.

---

## 2026-09-02 — `ACTION-0032` : contrôle indépendant de `TASK-0020`, `VERIFIED`

**Agent :** exécuteur Claude Code. **Branche
`build/v0.2-a5-interbrain-relations`.** **Intervention documentaire
seulement** — aucun code produit, aucune preuve, aucune décision produit
modifiés.

### Enregistré, pas rendu

Le **contrôle indépendant** de l'**orchestrateur technique** — instance
**distincte de l'exécuteur**, se prononçant **sur les preuves publiées** — clôt
**`ACTION-0032`** et attribue **`VERIFIED`** à `TASK-0020`. **L'exécuteur
enregistre ce verdict; il ne se l'attribue pas.**

**`HEAD` contrôlé :** `9a7206a1e246258259096b1679f19ac5b53005d7`.
**`main` contrôlée intacte :** `91bbe90f0f99026c28cd345784d4f579a0016db2`.

### Accepté

`M1` à `M12`; le **gel `7746fd4` antérieur au premier code `d1adcf2`**; les
relations inter-cerveaux explicites; le magasin commun
`brains/interbrain/relations.sqlite`; l'approbation `XB-S01` et les contraintes
`SQLite`; la navigation inter-cerveaux affichée et **hors de la vue**; le
rebuild des trois index à **digest inchangé** et **0** extrémité non résolue;
`M12` en **deux passes** dans le vrai `WebView2`; les régressions `J12` intra
et `L12` composée. **`X2`, `X3`, `X4`, `X5`, `X6` maintenues.**

**`cek1` est accepté UNIQUEMENT comme repli déclaré, PAS comme `I-E`
complète.**

### Conséquence — `X5`

Les **cinq** preuves de `TASK-0020` deviennent **canoniques**. **Les gardes
n'ont pas été étendues dans cette clôture**, qui est documentaire : la **tâche
de réalignement à venir devra commencer par les protéger** avant toute autre
écriture de preuve.

### Non fait, volontairement

- **Aucun rejeu** — ni `M12`, ni `J12`, ni `L12`, ni `H9`, ni aucun test.
- **Aucun artefact de preuve `TASK-0020` modifié.**
- **Aucune nouvelle `TASK` d'implémentation créée**, aucune `DEC` créée ni
  modifiée, **aucun code produit touché**.
- **Aucune garde `X5` modifiée** à ce stade.
- **Aucune fusion vers `main`, aucune PR, aucune release, aucune étiquette,
  aucun `force push`**, aucune réécriture d'historique, aucune suppression.

### Prochaine action unique

**Réalignement produit post-`TASK-0020`, à formaliser AVANT tout nouveau
code** : topographie finale à cartes/nœuds reliés plutôt que l'imbrication de
rectangles; correction explicite du contrat `P-02`; moteur déterministe de
relations automatiques sans IA; workflow humain simple de confirmation/rejet
des suggestions; IA en couche **optionnelle `BYOK`, jamais requise par le
noyau**; préparation architecture mono-utilisateur / multi-utilisateur /
permissions héritées de la source. Détail dans `docs/ai/NEXT_ACTION.md`.

## 2026-09-02 — `TASK-0021` : réalignement produit, `IMPLEMENTED`

**Intervention documentaire et produit. Une seule exception de code : les
gardes `X5`.**

### Gardes `X5` étendues aux cinq preuves de `TASK-0020`

`TASK-0020` étant `VERIFIED` (`ACTION-0032`), ses cinq preuves sont
**canoniques**. La liste protégée passe de **14 à 19 noms**, identiquement dans
les **trois** gardes — porte Rust `write_run_artifact`,
`src/map/runArtifacts.ts`, `scripts/protected-run-artifacts.ps1`. **Testé** :
`vitest` 14/14, `cargo test map::commands::tests` 14/14, et le module
PowerShell refuse effectivement les cinq tout en laissant passer les variantes
`-abandon`.

**Conséquence assumée et déclarée :** les destinations `M12`, `J12` et `L12`
du runtime livré sont désormais **scellées** — la porte refuse au lieu
d'écrire. C'est le résultat voulu; une tranche qui rejouerait ces scénarios
republie sous son propre nom de tâche.

### Cinq décisions produit enregistrées

- **`DEC-0019`** — FileTopo **n'est pas** un produit juridique. Cible
  générique; le juridique est un **cas d'usage**, pas une hypothèse
  d'architecture; **aucune catégorie métier codée en dur** dans le noyau; des
  **packs** spécialisés pourront exister plus tard.
- **`DEC-0020`** — la **représentation principale finale** est un **graphe
  topographique hiérarchique à nœuds/cartes et connexions explicites**. Le
  **treemap n'est plus la cible visuelle** : primitive de calcul,
  représentation technique, vue secondaire éventuelle. **Aucun algorithme
  imposé**, **aucune copie pixel de CarteTopo**.
- **`DEC-0021`** — **FileTopo doit être très utile SANS LLM.** Trois niveaux :
  prouvé/observé, relation déterministe (règle **nommée, versionnée,
  explicable**), suggestion. **Une suggestion n'est jamais une relation.**
  Architecture de signaux; **« hash identique » = contenu binaire identique**,
  jamais « même fichier physique »; **un score seul ne crée aucune vérité**;
  workflow `PENDING`/`APPROVED`/`REJECTED`, file de révision, **mémoire des
  rejets**. **Provenance inchangée : `DETERMINISTIC` ou `APPROVED`.**
- **`DEC-0022`** — l'IA n'est **jamais nécessaire au noyau**;
  **provider-agnostic** et **`BYOK`**; un `LLM` produit une **suggestion**,
  jamais une relation établie; **aucune troisième provenance « AI »**;
  autorisations d'envoi par niveaux. **`F-047` `DIFFÉRÉ`.**
- **`DEC-0023`** — **un seul modèle conceptuel** pour un ou plusieurs
  utilisateurs; **la source reste autoritaire** sur les permissions; **aucun
  contrôleur de domaine exigé**; « ne peut pas ouvrir le fichier » **n'est pas
  suffisant** — ni nom, ni chemin, ni métadonnée, ni relation, ni suggestion,
  ni résultat, ni **compteur révélateur**; filtrage **avant** rendu, recherche
  et relations.

### Correction normative `P02-R1` — `P-02`

L'ancienne formulation exigeait que l'**inclusion visuelle** reproduise la
hiérarchie, ce qui rendait le pavage imbriqué **obligatoire**. La nouvelle
demande une **connexion et/ou organisation spatiale explicite**, **aucune arête
inventée**, **aucun nœud dans la mauvaise branche**. **L'ancienne formulation
est conservée et visible**; **le contrat reste à 22 exigences**; **`P-02` ne
descend pas** — elle est plus forte — et **n'est pas satisfaite**.

### Matrice : 41 → 49 fonctions

`F-042` à `F-049` ajoutées. Répartition **`MVP` 41, `ULTÉRIEUR` 3, `DIFFÉRÉ`
5**, total **49**, `F-001` à `F-049`, **sans trou ni doublon**. **Aucune
classification existante n'a changé, aucune n'est descendue.** `F-007` et
`F-008` changent de **comportement cible**, déclaré, **pas de classification**.

### Séquence de sept tranches futures — `PROPOSED`, non exécutée

Layout à nœuds → moteur de signaux → workflow de validation → doublons à
l'échelle → recherche/filtres/watchers → fondation permissions/identités →
couche IA `BYOK`. Ordre justifié par dépendances dans `TASK-0021` §6. **Aucune
`TASK` d'implémentation n'a été créée.**

### Non fait, volontairement

- **Aucun code d'implémentation** : ni layout, ni moteur de règles, ni IA, ni
  serveur, ni permissions.
- **Aucun rejeu** — ni `M12`, ni `J12`, ni `L12`, ni `H9`. **`R8` entière.**
- **Aucun artefact de preuve modifié**, aucune preuve historique touchée.
- **Aucune fusion vers `main`, aucune PR, aucune release, aucune étiquette,
  aucun `force push`**, aucune réécriture d'historique, aucune suppression.

### Prochaine action unique

**Contrôle indépendant de `TASK-0021`.** La première tranche recommandée — le
**layout topographique à nœuds/cartes/liens** — reste **`PROPOSED`** tant que
l'orchestrateur n'a pas contrôlé le réalignement. Détail dans
`docs/ai/NEXT_ACTION.md`.


## 2026-09-02 — `ACTION-0033` : contrôle indépendant de `TASK-0021`, réserve `X7`

**Verdict `CHANGES_REQUIRED`**, rendu par l'**orchestrateur technique
indépendant** sur `HEAD` `68211c83c2390a250d6b9a42679202ee14782977`, et
**enregistré** par l'exécuteur —
[`ACTION-0033`](../reviews/ACTION-0033-independent-control.md). **`TASK-0021`
reste `IMPLEMENTED`**; **`VERIFIED` est interdit avant re-contrôle indépendant
ciblé de `X7`**.

### Le fond est accepté en entier

Gardes `X5` à **19** preuves; ordre des commits `aeee5a8` **avant** `7f97fc6`;
`DEC-0019` à `DEC-0023`; nouvelle direction topographique; **correction de fond
de `P-02`**; moteur déterministe sans IA; workflow humain de validation; IA
facultative `BYOK`; architecture mono/multi-utilisateur et permissions; matrice
`F-001` à `F-049`; séquence future proposée. **Aucune de ces cibles n'est
considérée implémentée** — ce sont des cibles à falsifier.

### `X7` — un identifiant ne peut pas désigner deux choses

`X2` désignait **déjà**, depuis le 2026-08-31, la **réserve technique de
`TASK-0016`** sur la surface runtime héritée, `CLOSED` par `ACTION-0026`.
`TASK-0021` a **réutilisé le même nom** pour la correction normative de `P-02`.
Les deux sens coexistaient dans `CURRENT_STATE.md` et dans les documents
produit. **Cette ambiguïté est refusée.**

### `X2` → `P02-R1`, et rien d'autre

La correction de `P-02` s'appelle désormais **`P02-R1`** — `P-02`, **révision
normative 1**. **22** occurrences renommées dans **12** fichiers : `ROADMAP.md`,
`CARTETOPO_FUNCTIONAL_PARITY.md`, `FEATURE_MATRIX.md`,
`REQUIREMENTS_BASELINE.md`, `DEC-0020`, `docs/decisions/README.md`,
`TASK-0021`, `CURRENT_STATE.md`, `NEXT_ACTION.md`, `HANDOFF.md`,
`VALIDATION.md`, `CHANGELOG_AI.md`. `PROJECT_VISION.md` n'en contenait
**aucune**.

**Aucun remplacement aveugle.** Les **110** occurrences de `X2` du dépôt ont
été examinées une par une. **Le `X2` de `TASK-0016` reste `X2` et reste
`CLOSED`**; `X1` reste `X1`; `X3`, `X4`, `X5`, `X6` sont inchangées; **`X7`
désigne uniquement la présente réserve de contrôle**.

**La substance ne bouge pas.** Le `diff` mot-à-mot ne porte **que** sur
l'identifiant : **22** retraits `X2`, **22** ajouts `P02-R1`, **aucun autre mot
changé**. Nouveau comportement de `P-02` et ses **huit** contrôles :
identiques. Contrat : **22** exigences. `DEC-0020` : décision topographique,
`T-B`, statut du treemap, critères et conséquences **inchangés**. Matrice :
`F-001`–`F-049`, **49** uniques, `MVP` 41 / `ULTÉRIEUR` 3 / `DIFFÉRÉ` 5.

### Non fait, volontairement

- **Aucun `WebView2`**, **aucun `H9`**, **aucun test produit**, **aucun
  build**. Rien n'a été exécuté : la correction est **strictement
  documentaire**.
- **Aucune preuve historique modifiée**, **aucun code produit modifié**,
  **aucune garde `X5` modifiée**, **`main` intacte** `91bbe90f`.
- **Aucune fusion vers `main`, aucune PR, aucune release, aucune étiquette,
  aucun `force push`**, aucune réécriture d'historique, aucune suppression.
- **`X7` n'est PAS fermée par l'exécuteur.** Il enregistre la correction; il ne
  se prononce pas sur elle.

### Prochaine action unique

**Re-contrôle indépendant ciblé de `X7` / `TASK-0021`.** Détail dans
`docs/ai/NEXT_ACTION.md`.

---

## 2026-09-02 — `ACTION-0034` : re-contrôle indépendant ciblé de `X7`, `TASK-0021` `VERIFIED`

**Agent :** exécuteur Claude Code — **enregistrement** d'un verdict rendu par
l'**orchestrateur technique indépendant**
**Statut à l'issue :** **`ACTION-0034` `CLOSED`**, **`X7` `CLOSED`**,
**`ACTION-0033` `CLOSED`**, **`TASK-0021` `VERIFIED`**
**`HEAD` contrôlé :** `10cf54e31276edeb00bd99a5586578791d7b5bc2`

### Fait

- Création de
  [`ACTION-0034`](../reviews/ACTION-0034-independent-recontrol.md) : fiche du
  **re-contrôle indépendant ciblé** de la seule réserve laissée ouverte par
  `ACTION-0033`.
- **`X7` fermée.** La collision documentaire est **éliminée** : la révision
  normative de `P-02` s'appelle **`P02-R1`**, plus aucune référence à cette
  révision n'utilise `X2`, et le **`X2` historique de `TASK-0016` reste `X2` et
  reste `CLOSED`**.
- **Les sept points du périmètre gelé sont TENUS** : nomenclature `P02-R1`,
  absence d'occurrence ambiguë, `X2` historique intact, `P-02` inchangée sur le
  fond avec ses **huit** contrôles, `DEC-0019` à `DEC-0023` inchangées sur le
  fond, matrice `F-001`–`F-049` à **49** uniques (`MVP` **41**, `ULTÉRIEUR`
  **3**, `DIFFÉRÉ` **5**), et aucune preuve historique, aucun code produit,
  aucune garde `X5` modifiés, `main` intacte.
- **`ACTION-0033` close** et `TASK-0021` passée à **`VERIFIED`** — le fond
  avait déjà été **accepté en entier** par `ACTION-0033` §2.
- Mise à jour de `docs/tasks/TASK-0021-product-realignment.md`,
  `docs/reviews/ACTION-0033-independent-control.md`,
  `docs/ai/CURRENT_STATE.md`, `docs/ai/NEXT_ACTION.md`, `docs/ai/HANDOFF.md`,
  `docs/ai/VALIDATION.md` et du présent journal.
  `.orchestrator/RESULT.md` est **remplacé**.

### Ce que ce `VERIFIED` ne dit pas

**`TASK-0021` est un livrable DOCUMENTAIRE.** `VERIFIED` atteste que la
**cible est correctement écrite**, **jamais** qu'elle est implémentée.

- **Aucune** cible de `DEC-0019` à `DEC-0023` n'est prouvée — ce sont des
  **cibles à falsifier**.
- **`P-02` n'est pas satisfaite**, sous sa formulation corrigée `P02-R1`; le
  contrat reste à **22** exigences.
- **`R8` entière**; **`I-E` complète** hors périmètre, **`cek1`** repli
  déclaré; **`P-19`**, **`P-21`** demeurent; **`P-04`** reste **PARTIELLE**;
  **`B0`** n'est pas corrigé.

### Non fait, volontairement

- **Aucun `WebView2`**, **aucun `H9`**, **aucun test produit**, **aucun
  build**, **aucun rejeu** de `M12`, `J12` ou `L12`. Intervention
  **strictement documentaire**.
- **Aucune preuve historique modifiée**, **aucun code produit modifié**,
  **aucune garde `X5` modifiée**, **aucune `DEC` modifiée**, **`main`
  intacte** `91bbe90f`.
- **Aucune fusion vers `main`, aucune PR, aucune release, aucune étiquette,
  aucun `force push`**, aucune réécriture d'historique, aucune suppression.
- **`TASK-0022` n'est ni créée ni exécutée.**
- **L'exécuteur ne s'est pas attribué `VERIFIED`** : il l'enregistre.

### Prochaine action unique

**Première tranche d'implémentation de la cible post-réalignement :
`TASK-0022` — layout topographique hiérarchique à nœuds/cartes et connexions
explicites**, sous `DEC-0020` et `P02-R1`, **sans supprimer les capacités
`VERIFIED` existantes**. Détail dans `docs/ai/NEXT_ACTION.md`. Son
architecture, ses fixtures, ses critères gelés, sa compatibilité
multi-cerveaux, ses relations intra et inter-cerveaux, son `pan`/`zoom`, son
clavier, ses labels et ses tests réels `WebView2` seront définis par le
**prochain prompt de l'orchestrateur**.

## 2026-09-03 — TASK-0022 IMPLEMENTED

- Gel `TASK-0022` et `DEC-0024` en `289cf9b`, poussé avant tout code produit;
  N1 à N15 demeurés immuables.
- Remplacement du treemap principal par `layered-tree-cards-v1` : schéma carte
  3, cartes 240 × 64, profondeur gauche→droite, espaces 120/28, arêtes
  hiérarchiques orthogonales exactes.
- Refus et reconstruction sûre des index v2; catalogue et stores relationnels
  hors index conservés; algorithme exposé par les DTO backend.
- `MapView` conserve un SVG C1/C2/C3, ids brain+node, labels screen-space et
  glyphes structurels; relations intra, suggestions et interbrain projetées
  bord à bord.
- Navigation clavier gauche/droite/haut/bas alignée sur parent/enfant/frères;
  destinations hors vue rendues visibles sans relayout; pan/zoom/fit/reset
  restent des transformations de vue.
- Ajout de tests Rust/TypeScript et de N15 réel en deux processus; rejeux J12,
  K11, L12 et M12 sous huit noms `TASK-0022-*`.
- Validation : 149 tests Rust, 188 tests TypeScript, check/build/Tauri debug,
  N1–N15 et régressions réelles passés. WebView2 `152.0.4191.53`.
- `F-007`, `F-008`, `F-016` → `IMPLEMENTED`; `F-042` reste
  `PROPOSED / ULTÉRIEUR`. Aucun statut `VERIFIED` attribué par l'exécuteur.
- B0 observé puis contourné avec `CARGO_INCREMENTAL=0`, non corrigé. Aucune
  dépendance, donnée réelle, opération sur `main`, PR, release ou suppression
  de preuve historique.

## 2026-09-03 — ACTION-0035 : correction X8, TASK-0022 toujours IMPLEMENTED

- `ACTION-0035` enregistrée `CHANGES_REQUIRED` dans
  `docs/reviews/ACTION-0035-independent-control.md`; fond de `TASK-0022`
  accepté, réserve unique `X8` `OPEN`.
- `X8` : `M12.28` publiait `writesUnderItsOwnTaskOnly: false` et « 14 noms
  proteges » à cause d'un préfixe `TASK-0020-` codé en dur et d'un compte
  périmé — migration incomplète du harnais de preuve, pas du modèle interbrain.
- `src/map/runArtifacts.ts` : ajout de `artifactTaskId()` et
  `runtimeWriteOwnership()`, qui **découvrent** la tâche propriétaire depuis
  les noms de destination et dérivent le compte protégé de la longueur de la
  liste. Aucune constante indépendante, aucun nom protégé modifié.
- `src/map/crossScenario.ts` : `M12.28` consomme ces valeurs dérivées;
  commentaire et chaîne obsolètes corrigés. Les autres mentions historiques de
  `TASK-0020` sont conservées — elles nomment l'origine du critère.
- `src/map/runArtifacts.test.ts` : bloc `X8`, huit tests, dont un qui échoue
  sur le code contrôlé `f6f0214` et un contrôle de parité avec la garde Rust
  canonique `PROTECTED_RUN_ARTIFACTS: [&str; 19]`.
- `M12` rejoué en entier dans le vrai hôte avec un variant neuf
  `task0022-m12-20260903173531-65e5a8`; ancien variant conservé, rien supprimé.
  `step28` publie désormais `writesUnderItsOwnTaskOnly: true` et
  `protectedArtifactCount: 19`.
- Validations : 196 tests TypeScript, `pnpm check`, build Tauri debug. 19
  preuves protégées identiques par `sha256`. `main` intacte.
- `TASK-0022` reste `IMPLEMENTED`, `X8` reste `OPEN`, `ACTION-0035` reste
  `CHANGES_REQUIRED`. L'exécuteur ne s'attribue pas `VERIFIED`.

## 2026-09-03 — ACTION-0036 : TASK-0022 VERIFIED et scellement X5

- Verdict rendu par l'orchestrateur technique indépendant et enregistré par
  Codex, sans auto-attribution : `ACTION-0036`, `X8` et `ACTION-0035`
  **`CLOSED`**; `TASK-0022` **`VERIFIED`**.
- HEAD re-contrôlé `645b9484790f8e766f7eed93107b9431d144aaa6`; commit substantif
  de correction `X8` `d6963e65e9829b8c17196eeb469eabfb3aa86aeb`; aucun autre point
  de `TASK-0022` rouvert.
- Extension X5 de **19 à 27** preuves canoniques : ajout exact des huit
  artefacts `TASK-0022` J12, K11, L12 pass1/pass2, M12 pass1/pass2 et N15
  pass1/pass2 dans les gardes Rust, TypeScript et PowerShell.
- H9 non exécuté, K12 non publié comme preuve `TASK-0022` et variantes
  `-abandon` laissés hors protection.
- Tests de parité renforcés pour comparer exactement Rust, TypeScript et
  PowerShell; les 19 noms antérieurs sont explicitement conservés et les huit
  ajouts sont contrôlés sans neuvième destination.
- Validations ciblées : `runArtifacts.test.ts` **26/26**; Rust X5 **3/3**;
  PowerShell **27/27** refus attendus et variantes non canoniques autorisées.
- Aucun rejeu N15/J12/K11/L12/M12/H9, aucun artefact de preuve modifié, aucune
  dépendance, aucun clean ni suppression de `target`; `main` intacte à
  `91bbe90f0f99026c28cd345784d4f579a0016db2`.
- Action unique suivante : retour à l'orchestrateur pour définir la prochaine
  tranche. `TASK-0023` n'est pas créée.

## 2026-09-03 — TASK-0023 IMPLEMENTED

- Auto-initialisation contrôlée sur `cf51d631`, branche
  `build/v0.2-a7-exact-content-observations`; gel `TASK-0023`/`DEC-0025`
  poussé en `711071c` avant le code produit.
- Ajout minimal de RustCrypto `sha2 0.11.0` et de cinq transitives au lockfile,
  sans mise à jour opportuniste ni `windows-sys` de production.
- Nouveau store `brains/<brain_id>/signals/content.sqlite`, schéma 1 : dernière
  génération datée, remplacement transactionnel, chemins relatifs et quatre
  statuts sans faux digest.
- SHA-256 streaming par blocs de 64 KiB sur les seuls nœuds FILE indexés;
  containment, symlinks/reparse, métadonnées avant/après et fingerprint global
  avant/après contrôlés. Chaque campagne relit les octets, sans cache de
  confiance taille+mtime.
- API Tauri séparée des relations; UI FR/EN « Observations de contenu », digest
  complet, date/génération, occurrences intra-cerveau et formulation de
  dernière observation après redémarrage.
- Aucun contenu, chemin absolu, identifiant physique, relation, suggestion,
  provenance ou nouvelle arête. Alpha/Gamma restent séparés; map rebuild et
  stores relationnels restent intacts.
- Migration des destinations runtime H9/J12/K11/K12/L12/M12/N15 sous
  `TASK-0023-*`; X5 reste à 27, intersection runtime/protection vide.
- Validations : 171 tests Rust, 208 TypeScript, check/build/Tauri debug; EC15
  deux processus WebView2 `152.0.4191.62`, même variante fraîche, deux preuves
  seulement. Au second passage : 8 fichiers ouverts, 1 424 octets relus, 8
  digests recalculés.
- `TASK-0023` devient `IMPLEMENTED`, jamais `VERIFIED` par Codex. `F-043` à
  `F-046` restent `PROPOSED`; `DEC-0013/F` bloque toujours l'identité physique
  persistante. Prochaine action : contrôle indépendant de `TASK-0023`.

---

## 2026-09-04 — ACTION-0037 — Contrôle indépendant TASK-0023 et correction X9

**Agent :** exécuteur Claude Code
**Statut à l'issue :** `ACTION-0037` = `CHANGES_REQUIRED`, `TASK-0023` =
`IMPLEMENTED`, `X9` = `OPEN`. Aucun `VERIFIED` attribué par l'exécuteur.

### Fait

- Enregistrement du verdict indépendant dans
  `docs/reviews/ACTION-0037-independent-control.md`, sur le HEAD contrôlé
  `12b3c87` : fond de `TASK-0023` accepté, réserve unique `X9` sur le
  fingerprint global de campagne.
- Ajout de `content_signals::content_source_fingerprint`, publié
  `sha256-tree-v1:<64 hex>` : SHA-256 d'arbre, déterministe, streaming, mémoire
  bornée par un unique tampon de 64 KiB réutilisé, et **incapable** de suivre
  un symlink, une jonction ou un reparse point ou d'en parcourir la cible. Un
  type d'entrée non interprétable est traité comme non traversable.
- `observe_root_with_hook` publie désormais `sourceFingerprintBefore` et
  `sourceFingerprintAfter` par ce seul moteur. L'invariant
  `SOURCE_CHANGED_DURING_OBSERVATION` est inchangé.
- `fixtures::fingerprint` (`fnv1a64:…`) reste inchangée dans son comportement :
  seul son commentaire documente son rôle historique de fingerprint des
  fixtures gelées, distinct du fingerprint de campagne.
- Sept tests ajoutés : jonction Windows réelle non parcourue, détection
  `FILE_ATTRIBUTE_REPARSE_POINT` déterministe, classification pure des liens,
  streaming par compteur de chunks, déterminisme/sensibilité/indépendance de
  chemin, campagne publiant le format confiné, plus quatre équivalents
  `#[cfg(unix)]` non compilés sur cet hôte.
- Régénération des deux seules preuves `TASK-0023-EC15-*` sur la variante
  fraîche `task0023-ec15-x9-20260904145356-6ebb99`, moteur publié désormais `sha256-tree-v1`.
- Ajout d'une garde EC15 dans `contentScenario.ts` : format et égalité du
  fingerprint de campagne.

### Validé

`cargo test` **178/178**; `pnpm test` **208/208**; `pnpm check`; `pnpm build`;
`pnpm tauri build --debug --no-bundle`; EC15 passes 1 et 2 en deux vrais
processus WebView2 `152.0.4191.62`. X5 reste exactement à 27 noms dans les
trois gardes, les 27 preuves protégées sont bit-for-bit inchangées et `main`
n'est pas touchée.

### Non testé

Les quatre tests `#[cfg(unix)]` ne sont pas compilés sur cet hôte Windows, et
la création de symlink Windows a été refusée faute de privilège : la preuve
exécutée du non-suivi de lien est la jonction `mklink /J`. Aucun rejeu de
`J12`, `K11`, `K12`, `L12`, `M12`, `N15` ni `H9`. `DEC-0013/F` reste bloquante.

---

## 2026-09-04 — ACTION-0038 — Correction ciblée X10

**Agent :** exécuteur Codex
**Statut à l'issue :** `X9 = CLOSED`, `ACTION-0038 = CHANGES_REQUIRED`,
`TASK-0023 = IMPLEMENTED`, `X10 = OPEN`. Aucun `VERIFIED` attribué par
l'exécuteur.

### Fait

- Enregistrement du verdict externe `ACTION-0038`, sans le rendre : X9 fermé,
  réserve unique X10 sur les races entre validation de pathname et
  ouverture/parcours.
- Audit de Rust `1.98.0`, de `std::os::windows::fs::OpenOptionsExt`, des
  sémantiques `CreateFile` et du graphe Cargo. Conclusion : std suffit pour la
  chaîne Windows; aucune dépendance ajoutée.
- Ajout de `open_path_no_follow` et `open_confined_regular_file` : ouverture
  sans suivi du composant final reparse, décision sur le handle réel, racine et
  composants intermédiaires épinglés sans partage écriture/suppression, lecture
  du même handle.
- Migration de `sha256-tree-v1` vers la même ouverture sûre : classification
  depuis le handle, fichiers streamés depuis ce handle et répertoires épinglés
  pendant `read_dir` et récursion.
- Trois tests TOCTOU synchronisés et sans sommeil : remplacement fichier,
  remplacement répertoire par vraie jonction et refus de renommage d'un
  composant intermédiaire déjà épinglé.
- Rejeu EC15 dans deux vrais processus WebView2 sur la variante fraîche
  `task0023-ec15-x10-20260904153755-5a40e1`; seules les deux preuves EC15 non
  protégées sont réécrites.

### Validé

`content_signals` **29/29**; Rust **181/181**; TypeScript **208/208**;
`pnpm check`; `pnpm build`; Tauri debug `--no-bundle`; EC15 passes 1 et 2,
WebView2 `152.0.4191.62`. X5 reste exactement à 27; `main` reste
`91bbe90f0f99026c28cd345784d4f579a0016db2`.

### Non testé / limites

Le repli non-Windows n'est pas déclaré race-safe et n'a pas été compilé ou
exécuté. `cargo fmt --check` reste rouge sur le formatage historique global;
aucun reformatage global n'a été fait. `DEC-0013/F` reste bloquante. Aucun
rejeu J12/K11/K12/L12/M12/N15/H9, aucune donnée réelle, dépendance, identité
persistée, suppression `target`, clean ni action sur `main`.

**Action unique suivante :** re-contrôle indépendant ciblé `X10` /
`TASK-0023`.

---

## 2026-09-04 — ACTION-0039 — Verdict indépendant X10, TASK-0023 VERIFIED, scellement X5 27 → 29

**Agent :** exécuteur Claude Code
**Statut à l'issue :** `TASK-0023` = **`VERIFIED`**; `ACTION-0038` = `CLOSED`;
`ACTION-0039` = `CLOSED`; `X9` et `X10` = `CLOSED`

### Fait

- Création de `docs/reviews/ACTION-0039-independent-recontrol.md`, qui
  **enregistre** le verdict rendu par l'orchestrateur technique indépendant sur
  le HEAD re-contrôlé `adba6568` et le commit substantif `X10` `9e9fb37a` :
  `X9 = CLOSED`, `X10 = CLOSED`, `ACTION-0038 = CLOSED`,
  `ACTION-0039 = CLOSED`, `TASK-0023 = VERIFIED`. **Claude ne rend pas ce
  verdict** et ne clôt aucune réserve de sa propre autorité.
- Motifs de clôture `X10` consignés factuellement : ouverture Windows avec
  `FILE_FLAG_OPEN_REPARSE_POINT`, classification sur la metadata du handle
  réellement ouvert, composant final jamais rouvert par pathname pour le hash,
  racine et composants intermédiaires épinglés, `FILE_SHARE_DELETE` omis,
  répertoires gardés ouverts pendant `read_dir` et la récursion, trois tests
  TOCTOU synchronisés, zéro octet extérieur lu, `sha256-tree-v1` conservant
  `X9`, `EC15` réelle réussie, aucune nouvelle dépendance, `main` intacte.
- Scellement `X5` : les **deux** preuves canoniques `EC15` de `TASK-0023`
  rejoignent la réserve, qui passe de **27** à **29** noms dans les trois
  gardes canoniques — Rust `PROTECTED_RUN_ARTIFACTS`, TypeScript
  `PROTECTED_RUN_ARTIFACTS`, PowerShell `$script:ProtectedRunArtifacts`. Les 27
  antérieurs conservent exactement le même ordre; les deux `EC15` sont
  ajoutées à la suite. Aucune autre preuve `TASK-0023` ne devient canonique.
- `SEALED_RUNTIME_DESTINATIONS` passe de la liste vide aux deux `EC15` : le
  runtime de ce checkout écrit encore sous `TASK-0023`, donc ses deux
  destinations sont désormais refusées par le portail d'écriture. État assumé
  d'une tranche `VERIFIED`, non « corrigé » par un renommage anticipé.
- Tests de garde `X5`/`X8` étendus des deux côtés : cardinal 29, immutabilité
  positionnelle des 27, ajout exact des 2, refus effectif en écriture,
  non-élargissement aux 21 autres destinations `TASK-0023`, et parité des trois
  gardes vérifiée liste contre liste.
- Documentation : `ACTION-0038` marquée close et renvoyant à `ACTION-0039`;
  `TASK-0023` passée à `VERIFIED` avec sa section de clôture; `FEATURE_MATRIX`
  précisant que la fondation de contenu exact de `F-046` est désormais
  `VERIFIED`, `F-046` restant `PROPOSED`.

### Validé

Rust **184/184**; TypeScript **211/211** dont `runArtifacts.test.ts` **30/30**;
`pnpm check`; `pnpm build`. `git status --short docs/performance/runs/` reste
vide : aucune preuve n'a été modifiée pendant la fermeture. `main` reste
`91bbe90f0f99026c28cd345784d4f579a0016db2`.

### Non testé / limites

Aucun rejeu `EC15`, `J12`, `K11`, `K12`, `L12`, `M12`, `N15` ni `H9` — la
fermeture est gouvernance et scellement seulement. Tauri debug `--no-bundle`
non rejoué : aucun code produit hors la constante `X5` et ses tests n'est
touché. La garantie race-safe `X10` est prouvée **sur Windows**; le repli
non-Windows n'est pas revendiqué race-safe. `cargo fmt --check` reste rouge sur
le formatage historique global. `DEC-0013/F` demeure bloquante pour l'identité
physique persistante. `F-043`, `F-044`, `F-045` et `F-046` restent `PROPOSED`.

**Action unique suivante :** retour à l'orchestrateur pour définir la prochaine
tranche. Aucune `TASK-0024` créée.

---

## 2026-09-05 — TASK-0024 — Deterministic Relation Engine v1

**Agent :** exécuteur Codex
**Statut à l'issue :** `IMPLEMENTED` — contrôle indépendant requis

### Fait

- Gel préalable de `TASK-0024` et `DEC-0026`, puis commit/push avant tout code
  produit.
- Ajout du runtime intra-cerveau `dre-v1` et de deux règles `core.*`
  exactement : vérité `content-identical` sur SHA-256 non vide courant en N-1,
  et suggestion `revision` pour frères numérotés consécutifs.
- Migration du store intra-relations au schéma 3 : producteur structurel,
  explications/signaux, snapshot de fraîcheur, reconciliation idempotente,
  préservation legacy/approbations et suppression des collisions.
- Ajout des commandes explicites run/status, de l'action UI accessible, des
  états stale/current et de l'affichage FR/EN règle/version/explication/signaux
  sans score.
- Migration de toutes les destinations runtime `TASK-0023` vers `TASK-0024`
  avant le premier replay, sans changer les 29 noms X5.
- Ajout d'un mécanisme DR15 de développement synthétique, hors des quatre
  fixtures gelées, puis publication des deux preuves réelles WebView2.
- Replay réel J12 publié sous `TASK-0024`.

### Validé

Rust **197/197**; TypeScript **213/213**; `pnpm check`; `pnpm build`; Tauri
debug `--no-bundle`. DR15 pass1/pass2 dans deux processus WebView2
`152.0.4191.62`, même variante fraîche : activation/analyse et approbation
fiables, zéro clic programmatique, N-1 exact, fichiers vides sautés, suggestion
sans score, persistance/idempotence et cross-store inchangé. J12 réel passe.
X5 reste 29, `protectedDestinations=[]`, runtime propriétaire `TASK-0024`;
`main` reste `91bbe90f`.

### Non testé / limites

K11/K12/L12/M12/N15/H9 non rejoués. Repli non-Windows X10 non revendiqué
race-safe. `cargo fmt --check` reste rouge sur le formatage historique global;
aucun reformatage global. `F-044`, `F-045`, `F-046` restent `PROPOSED` et
`DEC-0013/F` demeure bloquante.

**Action unique suivante :** contrôle indépendant de `TASK-0024`. Aucune
`TASK-0025` créée.

---

## 2026-09-05 — TASK-0024 — Correction ciblée X11, moteur générique sur tous les cerveaux

**Agent :** exécuteur Claude Code
**Statut à l'issue :** `TASK-0024` reste **`IMPLEMENTED`**;
`ACTION-0040 = CHANGES_REQUIRED`; réserve `X11` **`OPEN`**. Claude ne ferme pas
`X11` et ne s'attribue pas `VERIFIED`.

### Fait

- Enregistrement du verdict externe dans
  `docs/reviews/ACTION-0040-independent-control.md` — rendu par l'orchestrateur
  technique, pas par Claude.
- Découplage du périmètre legacy `TASK-0017` et du périmètre du moteur core
  dans `relation_commands.rs` : `legacy_fixture_spec()` pour la seule fixture
  historique, `source_spec()` pour la validité de n'importe quelle source,
  `ensure_in_scope()` réservé à `self_check`.
- `open_relations` ne rejoue `derive()` et ne sème les suggestions gelées que
  dans le périmètre legacy; ailleurs le store est lu tel qu'il est.
- `node_relations` et `approve_suggestion` ne sont plus filtrés par la fixture;
  le refus d'approbation d'une suggestion core périmée est inchangé.
- DTO `inScope` → `legacyInScope`; `RelationsPanel` reçoit `available` et
  `legacyInScope`, et n'est plus mort hors `quasi-empty`. La note legacy
  explique la limite sans masquer le bouton **Analyser les relations**, l'état
  `dre-v1`, les relations core, les suggestions core ni leur approbation.
- Ajout du scénario `X11` (`src/map/genericRelationScenario.ts`), de son drapeau
  d'hôte `FILETOPO_AUTO_X11` et de son harnais
  `scripts/task0024-x11-run-real-host.ps1`.
- Ajout de trois tests Rust sur `brain-beta` : ouverture/run/lecture
  génériques, isolation stricte d'Alpha et de Gamma, approbation core hors
  fixture legacy. Réécriture des tests UI correspondants.
- Rejeu et réécriture des deux preuves `TASK-0024-DR15-*` sur une variante
  fraîche, et du replay réel `TASK-0024-J12-*`.

### Validé

Rust **200/200**; TypeScript **215/215**; `pnpm check`; `pnpm build`; Tauri
debug `--no-bundle`. Preuve corrective `TASK-0024-X11-generic-brain-webview2.json`
écrite dans un vrai processus WebView2 `152.0.4191.62` sur `brain-beta`
(`deep`, 157 nœuds) : panneau disponible, bouton présent et activable,
`keydownIsTrusted` et `activationIsTrusted` vrais, zéro clic programmatique,
report `brain-beta` / `dre-v1` / `CURRENT`, `map_relations_open` réussi après
run, producteurs `core-rule-engine` seulement, `seeded = 0`, empreinte de
source inchangée, processus fermé. Elle est **non canonique** et ne rejoint pas
`X5`. DR15 pass1/pass2 et J12 réel repassent; les invariants legacy d'Alpha
sont strictement identiques. X5 reste 29, `protectedDestinations = []`, runtime
propriétaire `TASK-0024`; `main` reste `91bbe90f`.

### Non testé / limites

`K11`, `K12`, `L12`, `M12`, `N15`, `H9` non rejoués — aucune dépendance directe
constatée. Sur `deep`, `core.identical-content` est sautée faute de signal :
zéro sortie est un résultat valide, et rien n'affirme qu'une règle doive
produire. La généricité est prouvée en hôte réel sur `brain-beta` / `deep`;
`wide` et `mixed` ne le sont pas. Repli non-Windows `X10` non revendiqué
race-safe. `cargo fmt --check` reste rouge sur le formatage historique global;
aucun reformatage global. `F-044`, `F-045`, `F-046` restent `PROPOSED` et
`DEC-0013/F` demeure bloquante.

**Action unique suivante :** re-contrôle indépendant ciblé `X11` /
`TASK-0024`. Aucune `TASK-0025` créée.

---

## 2026-09-05 — ACTION-0041 — Verdict indépendant X11, TASK-0024 VERIFIED, scellement X5 29 → 32

**Agent :** exécuteur Codex
**Statut à l'issue :** `TASK-0024 = VERIFIED`; `X11`, `ACTION-0040` et
`ACTION-0041 = CLOSED`

### Fait

- Création de `docs/reviews/ACTION-0041-independent-recontrol.md`, qui
  **enregistre** le verdict externe de l'orchestrateur technique indépendant.
  Codex ne rend pas ce verdict et ne s'attribue pas `VERIFIED`.
- Scellement X5 de 29 à 32 : les deux DR15 et le J12 canoniques de `TASK-0024`
  sont ajoutés après les 29 noms inchangés, dans les gardes Rust, TypeScript et
  PowerShell.
- La preuve corrective X11, les replays H9/K11/K12/L12/M12/N15/EC15 et les
  variantes `-abandon` restent non canoniques et non protégés.
- `SEALED_RUNTIME_DESTINATIONS` publie l'intersection exacte : les trois
  preuves canoniques. Le runtime garde l'identité `TASK-0024`, donc
  `writesUnderItsOwnTaskOnly = false`, état normal après vérification.
- Mise à jour des états durables et de `F-043`, dont le statut produit reste
  `IMPLEMENTED` mais dont l'implémentation est maintenant vérifiée par
  `TASK-0024` / `ACTION-0041`.

### Validé

Rust ciblé X5 **22/22**; TypeScript ciblé `runArtifacts` **33/33**; PowerShell
**32/32 refus**, 32 noms uniques et X11 autorisée; parité exacte des trois
gardes; `git diff --check`; preuves JSON inchangées.

Le premier lancement TypeScript a rendu **30/33** à cause de l'ordre de
l'intersection dérivée (`J12` avant DR15). La dérivation a été alignée sur
l'ordre canonique X5 et le rejeu a passé **33/33**.

### Non testé / limites

Aucune suite produit complète, aucun build Tauri et aucun scénario WebView2
rejoué : cette fermeture ne touche pas le code produit. X10 non-Windows reste
non prouvée race-safe. `DEC-0013/F` demeure bloquante; `F-044`, `F-045` et
`F-046` restent `PROPOSED`.

**Action unique suivante :** retour à l'orchestrateur pour définir la prochaine
tranche après `TASK-0024 VERIFIED`. Aucune `TASK-0025` créée.

---

## 2026-09-05 — TASK-0025 — File de révision et mémoire des décisions humaines

**Agent :** exécuteur Claude Code
**Statut à l'issue :** `TASK-0025 = IMPLEMENTED`, contrôle indépendant requis;
`DEC-0027 = IMPLEMENTED`; `F-044` et `F-045` passent à
`IMPLEMENTED — contrôle indépendant requis`

### Fait

- Gel documentaire **avant tout code produit** : `TASK-0025` avec les critères
  `SR1` à `SR15`, et `DEC-0027` qui fixe la frontière sémantique, les trois
  états persistants et le contrat de la mémoire du rejet.
- Migration de **toutes** les destinations runtime de `TASK-0024-*` vers
  `TASK-0025-*` avant le premier rejeu, replays et destination corrective `X11`
  compris. Les 32 noms protégés sont intacts : l'intersection est vidée en
  déplaçant les destinations, jamais en réduisant le sceau. La garde couvre
  désormais aussi `genericRelationScenario.ts` et `reviewScenario.ts`.
- Schéma `v3 → v4` : reconstruction versionnée de `relation_suggestions`,
  `CHECK(state IN ('pending','approved','rejected'))` et colonne nullable
  `decision_reconsider_cause` laissée `NULL`. Nombre de lignes et
  `pragma_foreign_key_check` contrôlés avant le commit; les trois déclencheurs
  `X3` déposés pour le `RENAME` puis recréés.
- `RelationStore::reject`, la commande `map_relations_reject` et la lecture
  générique paginée `map_relations_review_queue`, avec une limite maximale
  explicite et un ordre publié.
- Mémoire du rejet dans la **reconciliation**, jamais dans le moteur : une
  identité core `rejected` le reste, n'est jamais recréée `pending`, et survit à
  un run qui cesse de la proposer. Nouveau compteur
  `rejectedSuggestionPreservations`, ajouté à côté des compteurs déjà vérifiés.
  La formule des `suggestion_key` de `TASK-0024` est inchangée.
- Panneau « Relations à confirmer » : une entrée qui annonce le compte du
  backend, un item à la fois, et exactement trois boutons natifs — `Confirmer`,
  `Rejeter`, `Plus tard`. Les deux comptes affichés viennent du backend après
  chaque décision; `Plus tard` n'appelle aucune commande.
- Scénario `SR15` et son harnais, sur une source synthétique dédiée hors des
  quatre fixtures gelées.

### Validé

Rust **221/221**, TypeScript **233/233**, `tsc --noEmit`, `vite build`, Tauri
debug `--no-bundle`, PowerShell **32/32 refus** avec les cinq destinations
`TASK-0025` autorisées, `git diff --check` propre.

Preuves réelles `SR15` pass1 et pass2 écrites : clavier réel, activations
fiables, zéro clic programmatique, une seule relation `APPROVED` pour la
confirmée, aucune pour la rejetée, compte en attente inchangé par « Plus tard »,
et — après un **vrai** redémarrage de processus — approbation et rejet
conservés, reportée encore en attente, rerun idempotent. Rejeux verts sous noms
`TASK-0025` : `DR15` pass1/pass2, `J12`, `X11`.

Trois corrections de mesure ont été nécessaires et sont documentées dans
`VALIDATION.md` AP.4 : une course sur le fichier d'index, une campagne de
contenu mal placée qui laissait `dre-v1` `STALE`, et un échantillonnage
synchrone du DOM dans le rejeu `DR15`. Aucune n'affaiblit un critère.

### Non testé / limites

`K11`, `K12`, `L12`, `M12`, `N15`, `H9` et `EC15` ne sont pas rejoués — décision
documentée. Aucune politique automatique de réévaluation d'une décision;
`decision_reconsider_cause` reste `NULL`. Aucun état `DEFERRED` persistant.
Les deux preuves `SR15` **ne rejoignent pas `X5`**, qui reste à 32 noms.
`DEC-0013/F` demeure bloquante, `F-046` reste `PROPOSED`, et `X10` hors Windows
reste non prouvée.

**Action unique suivante :** contrôle indépendant de `TASK-0025`. Aucune
`TASK-0026` créée.

---

## 2026-09-05 — ACTION-0042 — Verdict indépendant TASK-0025, scellement X5 32 → 34

**Agent :** exécuteur Codex
**Statut à l'issue :** `TASK-0025 = VERIFIED`; `ACTION-0042 = CLOSED`;
`SR1–SR15 = PASS`; aucune réserve corrective ouverte

### Fait

- Création de `docs/reviews/ACTION-0042-independent-control.md`, qui
  **enregistre** le verdict externe de l'orchestrateur technique indépendant.
  Claude Code était l'exécuteur de `TASK-0025`; Codex ne rend pas le verdict et
  ne s'attribue pas `VERIFIED`.
- Scellement X5 de 32 à 34 : les deux preuves `SR15` canoniques de `TASK-0025`
  sont ajoutées, pass1 puis pass2, après les 32 noms historiques inchangés dans
  les gardes Rust, TypeScript et PowerShell.
- Les replays `TASK-0025-DR15-*`, `TASK-0025-J12-*` et
  `TASK-0025-X11-*` restent non canoniques et non protégés.
- `SEALED_RUNTIME_DESTINATIONS` publie l'intersection exacte des deux `SR15`.
  Le runtime garde l'identité `TASK-0025`, donc
  `writesUnderItsOwnTaskOnly = false`, état normal après vérification.
- Mise à jour de `TASK-0025`, `DEC-0027`, de la matrice produit et des documents
  durables. `F-044` et `F-045` restent `IMPLEMENTED`, désormais vérifiées par
  `TASK-0025 / ACTION-0042`.

### Validé

TypeScript ciblé `runArtifacts` **36/36**; Rust ciblé X5 **24/24** avec 199
tests filtrés; PowerShell **34/34 refus**, 34 noms uniques et X11 `TASK-0025`
autorisée; parité exacte des trois gardes; `git diff --check`; aucun fichier
sous `docs/performance/runs/` modifié.

### Non testé / limites

Aucune suite produit complète, aucun typecheck, aucun build Tauri et aucun
scénario WebView2 rejoué : cette fermeture ne touche pas le comportement
produit. Aucun état `DEFERRED` persistant par conception et aucune politique
automatique de réévaluation en v1. X10 hors Windows reste non prouvée
race-safe. `DEC-0013/F` demeure bloquante et `F-046` reste `PROPOSED`.

**Action unique suivante :** retour à l'orchestrateur pour définir la prochaine
tranche fonctionnelle après `TASK-0025 VERIFIED`. Aucune `TASK-0026` ni
`DEC-0028` créée.

## 2026-09-06 — TASK-0026 — explorateur de doublons exacts borné

- Synchronisation fast-forward de la branche de travail avec `origin`, de
  `e6ba328` à `c92fe90`, sans réécriture d'historique.
- `TASK-0026` et `DEC-0028` passent à **IMPLEMENTED**, jamais `VERIFIED` par
  l'exécuteur.
- Ajout des requêtes Rust bornées et paginées pour groupes exacts et membres,
  limite maximale 100, ordre stable et couverture unitaire.
- Ajout de l'explorateur React avec navigation groupes/membres, états vide,
  erreur et chargement, et frontière explicite entre égalité binaire observée
  et identité physique non prouvée.
- Migration runtime `A10` sous identité `TASK-0026`, sans extension X5 : 34
  artefacts protégés et intersection vide avec les huit nouvelles preuves.
- Stabilisation du harnais d'entrée réelle : fenêtre FileTopo exacte au premier
  plan, retry sans consommation du marqueur, succès conditionné à un changement
  UI mesuré et remplacement effectif de l'artefact `ED15`.
- Rejeu final WebView2 de `ED15`, puis `EC15`, `DR15` et `SR15`, deux passages
  chacun. Les huit JSON `TASK-0026` sont publiés comme preuves non canoniques.
- Validations : Rust ciblé 3/3 et 14/14, Rust complet 227/227, TypeScript ciblé
  42/42 et complet 241/241, `pnpm check`, `pnpm build`, Tauri debug, X5 34/34
  refus et aucun artefact protégé modifié.
- Mise à jour de la fiche, de la décision, de `FEATURE_MATRIX` et des documents
  durables de transmission.

**Limites :** contrôle indépendant encore requis; preuves `TASK-0026` hors X5;
identité physique persistante toujours bloquée par `DEC-0013/F`; X10 hors
Windows toujours non prouvée race-safe; `F-046` reste `PROPOSED`.

**Action unique suivante :** contrôle indépendant de `TASK-0026` sur `ED1` à
`ED15`, les huit preuves finales, les bornes, la frontière sémantique et
l'intégrité X5. Ne pas créer `TASK-0027` ni `DEC-0029`.

---

## 2026-09-06 — ACTION-0043 — Contrôle indépendant de TASK-0026 et scellement X5

**Agent :** Claude Code, rédacteur de l'enregistrement, de l'hygiène `X5` et du
scellement. **Pas l'exécuteur de `TASK-0026`** — c'était Codex.
**Statut à l'issue :** `ACTION-0043 = CLOSED`, `TASK-0026 = VERIFIED`,
`DEC-0028` validée par `TASK-0026 / ACTION-0043`.

### Fait

- Enregistrement du verdict externe rendu par l'orchestrateur technique
  indépendant dans `docs/reviews/ACTION-0043-independent-control.md` :
  `ED1–ED15 = PASS`, aucune réserve fonctionnelle bloquante, aucune réserve
  corrective ouverte. Ni Codex ni Claude Code ne se sont attribué `VERIFIED`.
- **Scellement X5 : 34 → 36**, append-only. Les deux seuls ajouts sont
  `TASK-0026-ED15-exact-duplicate-explorer-webview2-pass1.json` et `…-pass2`.
  Les six replays `EC15`, `DR15` et `SR15` republiés sous `TASK-0026` restent
  non canoniques et non protégés. Gardes Rust, TypeScript et PowerShell en
  parité exacte.
- Correction des commentaires `X5` périmés de `src-tauri/src/map/commands.rs`
  et `src/map/runArtifacts.ts`, qui décrivaient encore l'état
  post-`ACTION-0042`. Aucun comportement produit changé par cette correction.
- **Réparation d'un défaut découvert pendant le scellement :** quatre
  scénarios d'écriture conditionnaient leur écriture au littéral
  `PROTECTED_RUN_ARTIFACTS.length === 34` et à une intersection vide — vrai
  seulement entre deux scellements. À 36, cela aurait rendu injouables les six
  replays devant le rester. La précondition porte désormais sur le nom que le
  scénario s'apprête à écrire. Deux tests `X5` nouveaux interdisent le retour
  du littéral et exigent le contrôle par nom.
- Mise à jour de `TASK-0026`, `DEC-0028`, `FEATURE_MATRIX.md`,
  `CURRENT_STATE.md`, `NEXT_ACTION.md`, `HANDOFF.md`, `VALIDATION.md` et
  `.orchestrator/RESULT.md`.

### Preuves

`runArtifacts.test.ts` **44/44**; Rust ciblés **26/26**; suite Rust
**229/229**; suite TypeScript **246/246**; `pnpm check` **PASS**; garde
PowerShell **36 refus / 36 noms uniques** avec les six replays toujours
autorisés; parité Rust/TS/PowerShell **PASS**; `git diff --check` **PASS**;
**aucun** JSON sous `docs/performance/runs/` modifié, renommé ou supprimé.

### Non fait / limites

- Aucun replay WebView2, aucune campagne `ED15`, `EC15`, `DR15` ni `SR15`,
  aucun build Tauri ni `pnpm build`.
- Aucune fusion, PR, release, étiquette, publication vers `main`, force push ni
  réécriture d'historique.
- `F-046` reste `PROPOSED`; identité physique persistante toujours absente et
  bloquée par `DEC-0013/F`; X10 hors Windows non prouvée race-safe.
- `origin/main` porte `1a7d652c`, commit de documentation du propriétaire daté
  du 2026-09-06, extérieur à cette branche et non touché.

---

## 2026-09-06 — TASK-0027 — Réalignement d'architecture à grande échelle

**Agent :** exécuteur Claude Code
**Statut à l'issue :** `IMPLEMENTED` — **contrôle indépendant requis**.
L'exécuteur ne s'attribue pas `VERIFIED`.
**Branche :** `build/v0.2-a11-progressive-scale-architecture`, créée et
publiée depuis `b580942` (parent `ffa9504`).
**Nature :** **documentaire / architecture uniquement. Aucune implémentation
produit.**

### Fait

- Création de
  [`DEC-0029`](../decisions/DEC-0029-progressive-materialization-and-scale-boundary.md),
  `APPROVED` : **FileTopo indexe grand, matérialise petit, et ne rend que le
  contexte utile.** Neuf points `A` à `I` — quatre plans distincts (corpus,
  graphe logique, vue matérialisée, rendu); navigation progressive comme
  primitive; agrégats exacts; query engine borné; layout et renderer;
  hachage sur campagne explicite; **Graphify `NOT INTEGRATED`**; **Forge
  distinct**; protocole d'échelle 10k / 100k / 1M.
- Création de
  [`PROGRESSIVE_SCALE_ARCHITECTURE.md`](../architecture/PROGRESSIVE_SCALE_ARCHITECTURE.md),
  frontière d'architecture de mise à l'échelle, avec la chaîne cible index →
  graphe logique → query engine borné → progressive materializer →
  sous-graphe et agrégats → layout de cette vue → renderer borné.
- Création de la fiche
  [`TASK-0027`](../tasks/TASK-0027-progressive-scale-architecture-realignment.md).
- **Requalification de `MAX_NODES_PER_MAP = 5000`** en **limite de tranche
  historique**, pas en limite produit de corpus. **La constante n'est pas
  modifiée** : la tâche est documentaire.
- **Amendement normatif `P-SCALE-R1`** du contrat de parité sur `P-01`,
  `P-02` et `P-03`, avec **conservation visible des formulations d'origine**,
  à la manière de `P02-R1`. Les amendements **ajoutent** des obligations —
  atteignabilité de tout élément indexé, déclaration de tout repli ou agrégat
  **avec compte exact**, pagination qui ne perd aucun enfant réel. **Le
  contrat reste à 22 exigences.** **`P-08` devient le pilier du scale spike.**
- **Matrice fonctionnelle 49 → 51 :** ajout de **`F-050`** matérialisation
  progressive et vue bornée, et **`F-051`** agrégats et méta-nœuds exacts,
  toutes deux `MVP` / `P0`. **`F-042` promue `ULTÉRIEUR` → `MVP`**, motif
  écrit : sous une architecture progressive, repli/dépli/focus deviennent la
  primitive qui détermine le contenu de la vue. Répartition `MVP` 44 /
  `ULTÉRIEUR` 2 / `DIFFÉRÉ` 5, `F-001` à `F-051`.
- **Arbitrage écrit de `F-051` en `P0`** : `F-050` sans `F-051` produirait une
  vue qui ment par omission — interdit par `P-02` amendée. Les deux se livrent
  ensemble ou pas du tout.
- Amendements par renvoi de `PROJECT_VISION.md`, `ROADMAP.md` et
  `ARCHITECTURE_BASELINE.md`, **historique préservé**. `ROADMAP.md` reçoit la
  **séquence proposée** après `TASK-0027` — scale spike, materializer,
  recherche/watchers, permissions, finition visuelle — **`PROPOSED`, sans
  qu'aucune tâche soit créée**.
- Mise à jour de `REQUIREMENTS_BASELINE.md`, `CURRENT_STATE.md`,
  `NEXT_ACTION.md`, `HANDOFF.md`, `VALIDATION.md` (section `AS`) et
  `.orchestrator/RESULT.md`.

### Preuves

Validations **documentaires** seulement, détaillées en
[`VALIDATION.md §AS`](VALIDATION.md) : liens relatifs des trois nouveaux
documents **PASS**; aucune contradiction entre vision, roadmap, parité,
matrice, baseline et décision; `F-042` classée **`MVP`** identiquement
partout; identifiants `F-001` à `F-051` **sans trou ni doublon**; **aucune**
occurrence de Graphify comme dépendance ou roadmap d'intégration; **aucun**
chiffre 10k/100k/1M présenté comme mesuré; **aucun** changement sous `src/`,
`src-tauri/`, `scripts/`, `graph/` ni `docs/performance/runs/`; `X5` toujours
**36**; `MAX_NODES_PER_MAP` toujours `5_000`; `origin/main` toujours
`1a7d652c` et non touché; `git diff --check` **PASS**.

### Non fait / limites

- **Aucune performance mesurée** à 10 000, 100 000 ni 1 000 000 d'éléments :
  ce sont des **cibles**, pas des résultats. Aucun banc exécuté, aucun profil
  matériel gelé.
- **Materializer, budget de vue, LOD et agrégats non implémentés.**
- Aucune suite de tests rejouée, aucun build Tauri, aucun `pnpm build`, aucun
  replay WebView2. La tâche ne touche aucun code.
- La cohérence documentaire est établie **par relecture**, pas par un
  vérificateur automatisé.
- Aucune `TASK-0028` créée. Aucune fusion, PR, release, étiquette,
  publication vers `main`, force push ni réécriture d'historique.
- **Graphify non intégré par décision produit.** **Forge reste distinct.**
  **Aucun renderer final choisi.**
- `F-046` reste `PROPOSED`; `DEC-0013/F` bloquante; `X10` hors Windows non
  prouvée race-safe; réserve `R8` entière.

---

## 2026-09-06 — ACTION-0044 — Contrôle documentaire de TASK-0027

**Agent :** Codex, rédacteur de l'enregistrement. Claude Code était
l'exécuteur de `TASK-0027`.
**Statut à l'issue :** `ACTION-0044 = CLOSED`; `TASK-0027 = VERIFIED` par
verdict de l'orchestrateur technique indépendant; aucune réserve corrective
bloquante.

### Fait

- Création de
  [`ACTION-0044`](../reviews/ACTION-0044-independent-control.md), qui
  enregistre le verdict externe. Ni Claude Code ni Codex ne s'attribuent
  `VERIFIED`.
- Mise à jour de `TASK-0027`, `DEC-0029`, de la frontière d'architecture et
  des documents durables de transmission pour refléter la clôture.
- `DEC-0029` reste `APPROVED`; le contrôle porte sur sa cohérence
  documentaire, pas sur une performance.
- `F-042` reste `PROPOSED / MVP`; `F-050` et `F-051` restent
  `PROPOSED / MVP / P0`. Aucune de ces capacités n'est implémentée.
- Graphify reste `NOT INTEGRATED`, Forge distinct, aucun renderer final choisi
  et la finition visuelle moderne reste future en étape B.

### Validé

Contrôle documentaire indépendant **PASS** sur l'architecture, la vision, la
roadmap, la parité et la matrice; diff substantif limité à 15 fichiers
documentaires ou d'orchestration; aucune modification de code, runtime, garde
X5 ou preuve; `X5 = 36`; `origin/main = 1a7d652c`, non touché; aucune
`TASK-0028` ni `DEC-0030` créée.

### Non testé / limites

Aucun test produit, build Tauri, benchmark ou replay WebView2. Les niveaux
10k / 100k / 1M restent non mesurés; `F-042`, `F-050` et `F-051` restent non
implémentées. `F-046` reste bloquée par `DEC-0013/F`; `X10` hors Windows reste
non prouvée race-safe et `R8` entière. La dette préexistante de l'index des
décisions n'est pas corrigée partiellement.

**Action unique suivante :** l'orchestrateur décide si le scale spike
synthétique devient `TASK-0028`. Aucune fiche n'est créée ici.

---

## 2026-09-07 — TASK-0028 — Banc synthétique de mise à l'échelle

**Agent :** exécuteur Claude Code
**Statut à l'issue :** `IMPLEMENTED` — **jamais `VERIFIED` par l'exécuteur**
**Branche :** `build/v0.2-a12-synthetic-scale-spike`, créée et publiée depuis
`670704d`

### Fait

- **Gel documentaire avant tout code**, en un commit distinct : fiche
  `TASK-0028` et `TASK-0028-SCALE-SPIKE-PROTOCOL.md`, pour qu'aucun critère ne
  puisse être ajusté après coup aux mesures.
- **Harness de banc entièrement `#[cfg(test)]`** sous
  `src-tauri/src/scale_spike/` : générateur synthétique déterministe,
  recensement exact, requêtes bornées, materializer expérimental, profil
  matériel sanitisé, rédacteur d'artefacts. Il vit dans le crate parce que
  `domain`, `index`, `scanner` et `map` y sont privés, et que recopier le
  schéma était explicitement interdit.
- **Deux ajouts `#[cfg(test)]` seulement** hors du module : la déclaration
  `mod scale_spike;` dans `lib.rs`, et `Index::connection_for_bench()` dans
  `index.rs`. Aucune signature existante changée, aucune commande, aucune
  route, aucun élément d'interface.
- **Campagnes exécutées :** `SCAN-SCALE` à 10 000 et 100 000 éléments
  **physiques** réellement créés puis parcourus par le scanner de production;
  `INDEX-SCALE` à 1 000 000 d'éléments **indexés** sur le schéma courant.
- **`SS7`/`SS8` :** deux processus **Tauri/WebView2 réels** (152.0.4191.66),
  boucle de mesure déjà présente dans le runtime, plus une mesure de
  cardinalité DOM/SVG exacte sur le vrai `MapView` sous jsdom.
- **Quatre artefacts** écrits dans `docs/performance/runs/`, tous marqués
  `ENGINEERING_MEASUREMENT / NOT A PRODUCT CLAIM / NONCANONICAL UNTIL
  INDEPENDENT CONTROL`, et **non protégés** : `X5` reste à 36.
- **Deux scripts de rejeu :** `scripts/task0028-scale-spike.ps1` et
  `scripts/task0028-ss7-bounded-view-webview2.ps1`.

### Résultat

**`SS9` PASS sur les cinq conditions.** À budget fixe, la vue ne bouge pas
quand le corpus est multiplié par 100 : mêmes 1 024 entités, mêmes 1 023
arêtes, ~200 Ko de payload, 0,25 ms de layout, et **chaque élément non rendu
reste compté exactement et atteignable** dans les 24 combinaisons mesurées.

**Trois chemins ne passent pas à l'échelle avec le schéma actuel** — c'est le
résultat exploitable : recherche `P-08` linéaire dans le corpus; page d'enfants
directs coûtant le sous-arbre parce que l'ordre d'affichage n'utilise pas
`idx_nodes_parent`; compte exact des éléments d'un agrégat en CTE récursive.
`Index::replace_nodes` exige de surcroît tout le corpus en mémoire.

### Non fait, et déclaré

1 000 000 **physique** non prouvé; composition bout-en-bout index→vue non
testée; budgets 256/512/1024 non mesurés dans WebView2; `SS8` **`NOT PROVEN`**;
voisinage relationnel non mesuré, le store d'index ne portant aucune relation;
temps `release` non mesurés, la suite de tests du crate ne compilant pas en
`--release` — constat **antérieur à cette tâche**.

Le banc est `DEVELOPMENT_BENCH_NOT_ACCEPTANCE` : **aucune cible « machine
modeste » n'est validée**. `R8` entière. Aucun état de `F-042`, `F-050`,
`F-051` changé; `MAX_NODES_PER_MAP = 5000` en vigueur; aucun renderer choisi;
aucun budget de vue décidé; **aucune `DEC-0030`, aucune `TASK-0029`**.
`X5 = 36`, `origin/main = 1a7d652c`, non touché.

**Action unique suivante :** contrôle indépendant de `TASK-0028`.

---

## 2026-09-07 — ACTION-0045 — Contrôle indépendant de TASK-0028

**Agent :** Codex, rédacteur de l'enregistrement. Claude Code était
l'exécuteur de `TASK-0028`.
**Statut à l'issue :** `ACTION-0045 = CLOSED`; `TASK-0028 = VERIFIED` par
verdict de l'orchestrateur technique indépendant, comme spike de faisabilité
architecturale et non comme validation de performance produit.

### Fait

- Création de
  [`ACTION-0045`](../reviews/ACTION-0045-independent-control.md), qui
  enregistre le verdict externe sans auto-attribution de `VERIFIED`.
- Mise à jour de la fiche `TASK-0028`, du rapport et des documents durables de
  transmission. Aucune mesure n'est réécrite.
- Critère structurel `SS9` accepté au niveau harness/core; résultats négatifs
  conservés comme fondations de la tranche suivante.
- Décision explicite de ne pas étendre X5 : les quatre JSON restent non
  canoniques et non protégés.

### Limites conservées

Banc hors `TARGET_CLASS`; 1M physique non prouvé; composition bout-en-bout non
testée; `SS7` partiel; `SS8 NOT PROVEN`; temps Rust en `debug`; voisinage
relationnel non mesuré; jsdom limité à la cardinalité. `F-042`, `F-050` et
`F-051` restent `PROPOSED`; `DEC-0029` reste `APPROVED`; `R8` reste entière.
La dette préexistante de chemins locaux personnels dans d'anciens documents
reste hors périmètre; `TASK-0028` n'en ajoute pas.

**Action unique suivante :** l'orchestrateur choisit la prochaine tranche de
fondation d'échelle avant le materializer produit. Aucune `TASK-0029` ni
`DEC-0030` n'est créée.

---

## 2026-09-09 — TASK-0029 — Fondation de requête bornée

**Agent :** exécuteur Claude Code
**Statut à l'issue :** `IMPLEMENTED`. **Jamais `VERIFIED`** : le contrôle
indépendant sur preuves appartient à l'orchestrateur technique.

### Fait

- **Gel documentaire avant tout code**, en un commit distinct :
  [`DEC-0030`](../decisions/DEC-0030-bounded-hierarchy-query-contract.md) —
  ordre des enfants, pagination keyset, cohérence curseur/révision, sémantique
  du compte d'agrégat sur le hot path, index SQL et migration — et la fiche
  [`TASK-0029`](../tasks/TASK-0029-scale-query-foundation.md).
- **Cœur produit interne.** Nouveau module `src-tauri/src/hierarchy.rs` :
  ordre canonique, curseur keyset, page bornée, compte direct exact, chaîne
  d'ancêtres bornée, audit de `child_count` et publication du plan de requête.
  `src-tauri/src/index.rs` reçoit la migration `user_version` 2 → 3, l'identité
  et la révision d'index, et quatre primitives déléguées.
- **Schéma.** Deux colonnes générées `VIRTUAL` — `child_order_rank` et
  `name_fold` — et l'index `idx_nodes_child_order(parent_id, child_order_rank,
  name_fold, id)`. Migration idempotente, sans réécriture de table.
- **Banc de mesure** `src-tauri/src/scale_query/`, entièrement `#[cfg(test)]`,
  campagnes `#[ignore]`, lancé par `scripts/task0029-scale-query.ps1`. Deux
  artefacts écrits : `TASK-0029-SQF-100k.json` et `TASK-0029-SQF-1m-index.json`,
  plus le rapport `TASK-0029-SCALE-QUERY-REPORT.md`.

### Prouvé

La réserve d'`ACTION-0045` portait sur un point précis : les requêtes qui
fabriquent la petite vue n'étaient pas bornées. Elles le sont. `p95` d'une page
de 100 enfants directs, de 100k à 1M : **611 → 322 µs** en première page,
**387 → 892 µs** en fin de fratrie. Le prototype `OFFSET` de `TASK-0028`,
appelé tel quel sur la même base et dans le même processus, va de **13,6 à
116,7 ms** et de **32,8 à 351,2 ms**. Critère d'ingénierie `p95` 1M ≤ 5 × `p95`
100k : **`PASS`**, pire rapport **2,30**, calculé par la campagne elle-même.

Les critères structurels sont vérifiés **par assertion pendant la campagne** :
index utilisé pour `parent_id` et pour l'ordre, aucun
`USE TEMP B-TREE FOR ORDER BY`, aucun balayage du corpus, aucun `OFFSET` de
continuation. L'ordre fonctionnel est prouvé **identique** au précédent. Un
curseur périmé, étranger ou d'un autre parent est refusé explicitement. Le
compte direct exact coûte 12 à 13 µs et son audit contre le `COUNT(*)` réel
rapporte **0 désaccord** sur tout le corpus, aux deux tailles. La migration
préserve nœuds, métadonnées et état `seen`, prouvé sur une base `user_version =
2`.

### Non fait, et déclaré

Scanner à 100 000 ou 1 000 000 de fichiers **physiques** : non testé, les deux
campagnes sont `INDEX-SCALE`. Temps `release` non mesurés, la suite de tests du
crate ne compilant pas en `--release` — constat **antérieur à cette tâche**.
Recherche `P-08` inchangée et toujours linéaire dans le corpus. Indexation en
flux non faite : `Index::replace_nodes` prend toujours tout le corpus en
mémoire, 189 Mo à 1M. Composition bout-en-bout non testée : aucune commande
n'expose ces primitives, par décision. Aucun replay WebView2, aucun n'étant
requis.

Le banc est `DEVELOPMENT_BENCH_NOT_ACCEPTANCE` : **aucune cible « machine
modeste » n'est validée**. `R8` entière. Aucun état de `F-042`, `F-050`,
`F-051` changé; `MAX_NODES_PER_MAP = 5000` en vigueur; aucun renderer choisi;
aucun budget de vue décidé; aucune dépendance ajoutée; **aucune `TASK-0030`,
aucune `DEC-0031`**. `X5 = 36`, les quatre artefacts `TASK-0028` inchangés,
`origin/main = 1a7d652c`, non touché.

**Action unique suivante :** contrôle indépendant de `TASK-0029`.

---

## 2026-09-09 — ACTION-0046 — Contrôle indépendant de TASK-0029

**Agent :** Codex, rédacteur de l'enregistrement. Claude Code était
l'exécuteur de `TASK-0029`.
**Statut à l'issue :** `ACTION-0046 = CLOSED`; `TASK-0029 = VERIFIED` par
verdict de l'orchestrateur technique indépendant, dans sa portée exacte de
fondation Rust/SQLite et mesure d'ingénierie non produit.

### Fait

- Création de
  [`ACTION-0046`](../reviews/ACTION-0046-independent-control.md), qui
  enregistre le verdict externe sans auto-attribution de `VERIFIED`.
- Mise à jour de la fiche `TASK-0029`, de `DEC-0030` et des documents durables
  de transmission. Aucun code produit, benchmark ou JSON de preuve n'est
  modifié.
- Confirmation que les deux JSON `TASK-0029` restent non canoniques et non
  protégés, hors `X5`.

### Limites conservées

Banc `DEVELOPMENT_BENCH_NOT_ACCEPTANCE`; timings Rust en `debug`;
`INDEX-SCALE` seulement, pas un million de fichiers physiques; corpus
synthétique limité; aucun bout-en-bout index -> vue -> frontend; aucun résultat
`TARGET_CLASS`; `Index::replace_nodes` garde le corpus en mémoire; recherche
`P-08` inchangée et linéaire. `F-042`, `F-050` et `F-051` restent `PROPOSED`;
`MAX_NODES_PER_MAP = 5000`; aucun renderer; `X5 = 36`; `origin/main =
1a7d652c`, non touché.

**Action unique suivante :** retour à l'orchestrateur pour ouvrir la prochaine
tranche V1 de convergence du pipeline réel.

## 2026-09-09 — TASK-0030 — convergence V1 du pipeline

**Agent :** Codex. **Statut :** IMPLEMENTED, contrôle indépendant attendu.
Branche `build/v0.2-a14-v1-pipeline-convergence`, gel préalable `0255bd1`.

Remplacement du store runtime par l'Index canonique; publication atomique de ses
métadonnées/diagnostics/révision; projection keyset et agrégats exacts sous budget
512; layout de vue et IPC borné; navigation progressive et résolution d'extrémités
hors vue. Ancien MapStore limité aux fixtures de migration et tests historiques.
Build synthétique au-delà de 5000; aucune racine personnelle activée.

Rust 290 PASS (5 ignorés), TS 264 PASS, typage/builds PASS; clippy en échec sur
extraits préexistants retrouvés dans la base. WebView2 réel 12 puis 6001 indexés,
vue large de 256 nœuds + 1 agrégat, page suivante et 24 keydowns fiables. Échec
initial du pilote CDP conservé dans les limites de validation. F-050/F-051
IMPLEMENTED dans la tranche; F-042/F-046 PROPOSED, F-047 DEFERRED. X5 inchangé.
Branche de travail publiée, aucune action sur main/PR/tag/release; aucun reset,
clean, force push ni suppression de sandbox persistant. Suite unique : contrôle indépendant.

## 2026-09-09 — ACTION-0047 — TASK-0030 VERIFIED, fermeture indépendante

**Agent :** Claude Code, rédacteur seulement. **Autorité du verdict :**
orchestrateur technique indépendant. **Exécuteur de TASK-0030 :** Codex.
Branche `build/v0.2-a14-v1-pipeline-convergence`.

`ACTION-0047 = CLOSED`; `TASK-0030 = VERIFIED` **dans sa portée exacte de
convergence V1 synthétique** : un seul index canonique par cerveau, projection
runtime bornée, layout de la vue seulement, MapApp alimenté par cette
projection. Claude Code ne rend pas le verdict et ne s'attribue pas `VERIFIED`.

Fermeture documentaire uniquement : aucun code produit, aucun manifeste, aucun
script, aucun JSON de preuve modifié; aucun banc, rejeu WebView2 ou suite lourde
relancé. Treize points PASS consignés — chaîne Git `896e2c3` -> `0255bd1` ->
`ab1d7e2`, `map::store` réduit aux DTO, `legacy_store` et `MAX_NODES_PER_MAP`
sous `#[cfg(test)]`, build sans layout global, `VIEW_BUDGET = 512` avec 256
places matérielles, agrégats à compte exact, layout calculé sur la projection,
100k sur le cœur produit, 6001 physiques, WebView2 réel, extrémités hors vue
résolues contre l'index, aucune dépendance nouvelle, données synthétiques
seulement. Les validations de l'exécuteur — Rust 290 PASS/5 ignorés, TS 264
PASS, `pnpm check`, `pnpm build`, `cargo build --offline`, garde de source,
`git diff --check` — sont enregistrées comme preuves d'exécuteur.

Six réserves maintenues et non effacées : `R-T30-1` clippy strict non vert,
baseline non réexécutée; `R-T30-2` ouvrir ne réutilise pas encore l'index
existant, à séparer d'actualiser et de reconstruire avant toute racine réelle;
`R-T30-3` analyses encore en mémoire corpus; `R-T30-4` performances produit non
acceptées; `R-T30-5` périmètre encore synthétique; `R-T30-6` dette test-only de
`legacy_store.rs`.

`DEC-0031` reste `APPROVED`, implémentation contrôlée. `F-050` et `F-051`
restent `IMPLEMENTED`, **pas `VERIFIED` globalement**; `F-042 = PROPOSED/MVP`,
`F-046 = PROPOSED`, `F-047 = DEFERRED`. `X5 = 36`, trois JSON `TASK-0030`
inchangés et non canoniques. Aucune `TASK-0031`, `DEC-0032`, branche suivante,
PR, fusion, étiquette, release, `reset`, `clean`, `force push` ni donnée réelle.
`origin/main = 1a7d652c`, non touché.

**Action unique suivante :** retour à l'orchestrateur pour décider et ouvrir la
prochaine tranche V1, priorité au pipeline `REAL_ROOT` sûr et à la séparation
ouverture / actualisation / reconstruction.

---

## 2026-09-10 — TASK-0031 — Cycle de vie du cerveau : ouvrir, actualiser, reconstruire

**Agents :** Codex (implémentation initiale), puis Claude Code (reprise du
worktree en l'état, corrections, preuves, clôture)
**Statut à l'issue :** `IMPLEMENTED`, **jamais auto-`VERIFIED`**
**Branche :** `build/v0.2-a15-v1-brain-lifecycle`; gel documentaire `3ac6cbf`,
parent direct du premier commit de code

### Fait

Transformation de la réserve `R-T30-2` en frontière produit, **avant** toute
racine utilisateur réelle. Ouvrir un cerveau déjà indexé ne scanne plus sa
source.

- **`map_open`** lit un index existant et rien d'autre. `open_store` passe par
  `BrainIndex::open_existing`, qui ouvre en `SQLITE_OPEN_READ_ONLY`, sans
  `CREATE` ni migration, refuse un schéma différent de `MAP_SCHEMA_VERSION` par
  `IndexIncompatible`, refuse un cerveau étranger par `BrainMismatch`, ne touche
  pas la source, ne calcule aucune empreinte et n'avance pas la révision. Index
  absent : `NotBuilt`. **Aucun rebuild automatique, aucune suppression.**
- **`MapOpenReport`** remplace `MapBuildReport` à l'ouverture et ne porte que
  des faits d'ouverture : `OPENED_EXISTING`, `indexId`, `revision`, `nodeCount`,
  `schemaVersion`, `sourceRead = false`, `indexReused = true`,
  `freshness = UNKNOWN`. Aucune fraîcheur inventée.
- **`map_refresh` et `map_rebuild`** passent par `publish_map`, sous verrou de
  publication : refus d'un index incompatible **avant** toute lecture de source,
  scan, refus si le scan porte un diagnostic, si l'empreinte a bougé pendant le
  scan ou si l'appelant a annulé, puis publication du corpus, des métadonnées et
  de la révision dans **une seule** transaction. Aucun index n'est supprimé
  avant d'avoir un remplaçant valide; `remove_index_files` a quitté le runtime.
- **`prepare_synthetic_source`** devient une commande distincte, appelée
  explicitement par un geste ou un scénario. `build_map(paths, brain, rebuild)`
  survit **uniquement** sous `#[cfg(test)]` : le booléen a disparu de l'API.
- **Interface :** `src/map/lifecycle.ts` porte les trois intentions; `loadBrain`
  n'appelle plus `map_integrity`, qui lit la source; une ouverture sans index
  demande une construction explicite au lieu de scanner; un cerveau dont la
  source est absente s'ouvre depuis son dernier index enregistré, annoncé comme
  tel et jamais comme frais.

### Corrigé pendant la reprise

- **Fins de ligne.** Des fichiers réécrits en CRLF contre `* text=auto eol=lf`
  cassaient la garde structurale `L7` : elle lit `commands.rs` par
  `include_str!` et découpe sur un motif en LF; le découpage échouait, la garde
  inspectait le module de tests, y voyait `MapStore` et **la suite Rust
  échouait**. Fichiers normalisés; la garde compare désormais en LF.
- **Sentinelle creuse.** `build_map` étant passé sous `#[cfg(test)]`, la
  sentinelle de la garde ne prouvait plus qu'on inspectait la région runtime.
  Elle porte maintenant sur `fixture_summaries`, dernier élément runtime.
- **Rejeu WebView2 impossible.** Le serveur de développement Vite surveillait
  `.filetopo-sandbox/`, retenait des poignées de répertoire Windows — `EPERM` au
  renommage — et rechargeait la page à chaque écriture d'index. `vite.config.ts`
  l'exclut de `server.watch`, comme `src-tauri` l'était déjà. **Extension de
  périmètre déclarée**, réglage du serveur de développement seulement.

### Prouvé

`L1` à `L9` dans `src-tauri/src/map/lifecycle_tests.rs` et
`src/map/lifecycle.test.ts`, avec **scanner et SQLite réels** : source retirée
sous garde `Drop`, `ABORT` SQL injecté par déclencheur après `DELETE` et
insertion partielle, deux cerveaux sur une même fixture restant isolés.

Rejeu **WebView2 152.0.4191.66**, Tauri 2.11.5, SQLite 3.53.2, 31 frappes
réelles toutes `isTrusted`, aucune erreur console fatale : ouvrir laisse la
révision à 1, actualiser la porte à 2, reconstruire à 3, `indexId` inchangé;
source retirée du disque, l'ouverture réussit et rend exactement les mêmes
valeurs; 6 001 nœuds indexés rendus par 256 nœuds et 1 agrégat sous le budget de
512; `map_integrity` final sans aucun artefact FileTopo dans la source.

Validations : Rust **295 PASS**/5 ignorés, TypeScript **269 PASS**,
`pnpm check`, `pnpm build`, `cargo build --offline`, `git diff --check` verts;
`cargo fmt --check` propre sur les fichiers touchés. `cargo clippy` strict reste
**rouge à 26 erreurs**, jeu de diagnostics **identique avant et après** :
`R-T30-1` inchangée, **aucune dette nouvelle**.

### Non fait, et limites

Aucune racine réelle, aucun `REAL_ROOT`, aucun sélecteur de dossier, aucune
donnée personnelle. Aucun watcher ni mise à jour incrémentale : `F-027`,
`F-030`, `F-031` restent `PROPOSED`. Un index de schéma incompatible est
**refusé, jamais migré** : le contrat de staging reste à écrire. Les mesures
WebView2 viennent d'un poste de développement et incluent des attentes de
stabilisation CDP.

`DEC-0032` reste `APPROVED`. `R-T30-2` est **traitée dans sa portée
synthétique** et attend le contrôle indépendant; `R-T30-1`, `R-T30-3`,
`R-T30-4`, `R-T30-5`, `R-T30-6` et `R8` restent ouvertes. `F-050` et `F-051`
restent `IMPLEMENTED`, **pas `VERIFIED` globalement**; `F-042 = PROPOSED/MVP`,
`F-046 = PROPOSED`, `F-047 = DEFERRED`. **`X5 = 36`**, l'artefact
`TASK-0031-webview2.json` reste non canonique et hors sceau. Aucune
`TASK-0032`, `DEC-0033`, branche suivante, PR, fusion, étiquette, release,
`reset`, `clean`, `force push` ni donnée réelle.
`origin/main = 1a7d652c`, non touché.

**Action unique suivante :** contrôle indépendant de `TASK-0031`, par une
instance distincte de Codex et de Claude Code.

---

## 2026-09-10 — TASK-0032 — Première racine réelle contrôlée

**Agent :** exécuteur Claude Code
**Statut à l'issue :** `IMPLEMENTED`, **jamais auto-`VERIFIED`**
**Branche :** `build/v0.2-a16-v1-real-root`, depuis `05fc371`
**Décision :** `DEC-0033`, `APPROVED`

### Gel avant code

`c3507bf` — fiche `TASK-0032`, décision `DEC-0033`, et correction de
l'incohérence documentaire laissée par `ACTION-0048` : `TASK-0031` est
`VERIFIED` dans sa portée synthétique, `R-T30-2` y est levée. Le gel est le
**parent direct** du premier commit de code.

### Fait

- **Contrat figé avant la première ligne de produit.** `DEC-0033` fixe la
  sélection explicite, l'interdiction de tout chemin sur l'IPC, le chemin
  absolu local au catalogue et jamais sérialisé, un codec Windows exact, un
  binding de source opaque, le cycle `DEC-0032` inchangé, la lecture seule
  absolue, la règle de containment exacte, et l'absence de réseau ou de pile
  nouvelle. Elle **lève la réserve `X2`** et la remplace par une garantie plus
  étroite et testée.
- **Catalogue en schéma 2.** `REAL_ROOT` rejoint `SYNTHETIC_FIXTURE`; un
  `source_label` affichable apparaît; le chemin absolu est persisté en `BLOB`
  dans une colonne `source_path` que la requête alimentant les `BrainRecord`
  **ne sélectionne pas**. Migration transactionnelle et idempotente, sans
  toucher `catalog_meta` — donc sans risque pour `active_brain_id`. Aucune
  contrainte `UNIQUE` sur la source : deux cerveaux peuvent lire le même
  dossier.
- **Codec de chemin partagé.** `encode_path`/`decode_path` et
  `is_reparse_point` sortent de `registry.rs` vers `src/path_codec.rs`;
  `registry.rs` y délègue au lieu d'en garder une copie. La branche non-Windows
  est **corrigée** : elle passait par `to_string_lossy()`, ce que `DEC-0033` C
  interdit pour persister une source. Le reste du `Registry` n'est pas touché.
- **Une seule commande produit pour le sélecteur**,
  `map_brain_choose_real_root`, **sans argument**. Annuler ne crée rien;
  enregistrer ne scanne rien.
- **Résolution de source explicite.** `map/source.rs` porte la validation de
  racine — pas un dossier, un lien ou point d'analyse, et les trois cas de
  containment — et la résolution vers la fixture ou le chemin catalogué.
  `map_open` ne l'appelle pas : ouvrir ne résout ni ne lit la source.
- **Binding de source dans l'index.** Il porte `brain_id`, `source_kind` et le
  `source_ref` opaque, jamais le chemin. `open_store` refuse en
  `map_source_mismatch` un index dont le binding ne correspond plus, **sans
  rien supprimer**.
- **Rapports honnêtes.** `fixtureId` devient `sourceKind` + `sourceRef` +
  `sourceLabel`; les empreintes deviennent nullables, `null` sur une racine
  réelle, avec `readOnlyConfirmed = false` — « aucune empreinte prise », jamais
  « lecture seule confirmée ».
- **MapApp minimal :** un bouton **Ajouter un dossier**, un état non indexé lu
  de ce que la composition n'a pas chargé, et l'action existante renommée
  **Indexer** tant que l'index n'existe pas. Aucun redesign.
- **Plugin de dialogue initialisé**, capacité étendue à `dialog:allow-open` et
  à rien d'autre. Le test `X2` est réécrit en la garantie qui le remplace.

### Preuves

`RR1` à `RR8` en Rust, sur de vrais dossiers créés par les tests : migration et
migration échouée sans perte, enregistrement sans scan, refus sans effet,
sentinelle de chemin absente de tout DTO, première indexation d'un arbre
Unicode, ouverture avec la source déplacée, lecture seule octet pour octet à
travers actualiser et reconstruire, deux cerveaux sur un dossier, containment.
`RR9` et `RR10` en gardes structurelles : CSP, capacité, absence de réseau,
dépendances inchangées, cycle `DEC-0032` intact.

Rejeu **WebView2 152.0.4191.66** sur un arbre de 1 209 entrées généré par la
preuve, jamais un dossier personnel : `map_not_built` avant indexation sans
créer de fichier, 1 210 nœuds indexés par une frappe réelle, révisions 2 → 3 →
4 avec `indexId` inchangé, **256 nœuds et 4 agrégats** sous le budget de 512,
`absolutePathLeak = false` sur sept DTO, sur le fichier d'index et sur le
journal de l'hôte, source inchangée, 0 erreur console fatale.

Rust **319 PASS**, TypeScript **279 PASS**, `pnpm check`, `pnpm build`,
`cargo build --offline`, `git diff --check` verts. `cargo fmt --check` propre
sur chaque ligne écrite ici. `cargo clippy` strict reste **rouge à 26
erreurs**, le même nombre qu'à l'entrée : un diagnostic avait été introduit sur
`BrainIndex::replace` et a été corrigé avant livraison par `SourceStamp`.

### Non fait, et limites

**Aucune donnée personnelle, aucun vrai cerveau** — point d'arrêt réservé à
Sébastien. Le dialogue natif lui-même n'est pas automatisé. Aucun watcher ni
incrémental : `F-027`, `F-030`, `F-031` restent `PROPOSED`. Aucun FTS5, aucune
identité physique `F-046`, aucun redesign, aucune acceptance de performance sur
grande racine. La dette `Registry`/`legacy_store` n'est **pas** supprimée :
seul le codec de chemin en a été extrait.

Un refus délibérément large est déclaré : un index publié avant `DEC-0033` ne
porte aucun binding et est refusé — jamais supprimé, republié par une
actualisation explicite.

`R-T30-5` est traitée **uniquement dans la portée `REAL_ROOT` de test**.
`R-T30-1`, `R-T30-3`, `R-T30-4`, `R-T30-6` et `R8` restent ouvertes; `R-T30-2`
reste levée dans sa portée synthétique par `ACTION-0048`. `F-050` et `F-051`
restent `IMPLEMENTED`, **pas `VERIFIED` globalement**; `F-042 = PROPOSED/MVP`,
`F-046 = PROPOSED`, `F-047 = DEFERRED`. **`X5 = 36`**, l'artefact
`TASK-0032-webview2.json` est non canonique et hors sceau. Aucune `TASK-0033`,
`DEC-0034`, branche suivante, PR, fusion, étiquette, release, `reset`,
`clean`, `force push` ni donnée réelle. `origin/main = 1a7d652c`, non touché.

**Action unique suivante :** contrôle indépendant de `TASK-0032`, par une
instance distincte de Claude Code.
