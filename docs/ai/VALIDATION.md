# VALIDATION.md — État de vérification

**Dernière mise à jour :** 2026-08-31
**Portée :** TASK-0001 (phase 0) — `VERIFIED` ; TASK-0002 (phase 1) —
`VERIFIED` le 2026-08-25, sur preuves indépendantes de l'orchestrateur
(section A.7) ; TASK-0010 (rebaseline et mémoire) — `VERIFIED` le 2026-08-31,
sur preuves indépendantes (section J bis) ; TASK-0011 (baseline fonctionnelle
et architecture) — `IMPLEMENTED` le 2026-08-31, contrôles d'exécution en
section L, **en attente de vérification indépendante** ; TASK-0012 (bancs
d'essai de levée des risques techniques) — **`VERIFIED` le 2026-08-31**, sur
contrôle indépendant `ACTION-0021` (section P), **avec neuf réserves `R1` à
`R9` maintenues**

Trois qualificatifs seulement : **vérifié**, **non testé**, **inconnu**.

---

## A. TASK-0002 — Phase 1, recherche et positionnement (2026-08-25)

**Statut : `VERIFIED`** le 2026-08-25, sur preuves indépendantes de
l'orchestrateur (section A.7). L'agent exécuteur ne s'était pas attribué cet
état ; il a été posé par une instance indépendante de l'exécuteur, conformément
à `AGENTS.md`/`CLAUDE.md` §3. `ACTION-0004` (`docs/ai/NEXT_ACTION.md`) est
close par cette vérification.

### A.1 Vérifié par l'agent exécuteur — lecture directe, **non indépendante**

| Élément | Preuve |
|---------|--------|
| Le livrable existe | `docs/research/phase-1-research-and-positioning.md` créé ; création confirmée par l'outil d'écriture |
| Les huit sous-sections 7.1 à 7.8 sont présentes | Rédigées et relues dans cet ordre, plus les sections « Non testé » et « Risques » |
| Les quatorze questions figurent dans leur libellé exact | Recopiées depuis la section 7.1 de `TASK-0002` en sous-sections 7.1.1 à 7.1.14 |
| Chaque question porte faits sourcés, inférences signalées et incertitudes | Marquage `[FAIT]`, `[INFÉRENCE]`, `[RECOMMANDATION]`, `[INCERTITUDE]` appliqué |
| Le tableau comparatif couvre dix solutions | Section 7.2, une ligne par solution, source citée par ligne |
| Sept noms candidats avec constats de disponibilité | Section 7.4, cinq registres interrogés |
| **Aucune réservation, aucun achat, aucun compte créé** | Toutes les requêtes réseau ont été des lectures : `GET` sur registres npm, PyPI, crates.io, API GitHub, RDAP Verisign, et pages web publiques |
| Les termes de MIT sont cités depuis une source officielle | Texte SPDX reproduit en 7.5.1 |
| Une alternative est examinée sans être retenue | Apache-2.0, texte officiel de l'ASF, section 7.5.3 |
| La recommandation finale est marquée « SOUMISE À DÉCISION HUMAINE » | Section 7.8, encadré en tête |
| Aucune pile technologique n'est choisie | Section 7.8.3, qui le déclare explicitement |
| Aucune référence à un projet privé | Rapport rédigé uniquement à partir de sources publiques citées |
| Aucun code tiers copié | Seuls des textes de licence et des accroches produit sont cités, en citation attribuée |
| Une seule tâche `IN_PROGRESS` pendant l'exécution, aucune à la clôture | `graph/current_state.yaml` : `in_progress_count: 0` à la clôture |
| `NEXT_ACTION.md` contient exactement une action | `ACTION-0004`, seule entrée |
| `graph/history.jsonl` n'a subi que des ajouts | Les lignes 1 à 15 existantes sont inchangées ; les nouvelles lignes sont ajoutées en fin de fichier |

### A.2 Non testé — déclaré explicitement

| Élément | Raison |
|---------|--------|
| **Analyse syntaxique automatisée des fichiers YAML** | **Aucun outil d'exécution de commande n'est disponible dans cette session** : ni interpréteur, ni analyseur YAML. `graph/current_state.yaml` et `graph/project_graph.yaml` ont été **relus à l'écran** après édition, pas passés dans un analyseur. |
| **Analyse syntaxique automatisée de `graph/history.jsonl`** | Même raison. Les lignes ajoutées ont été relues : accolades et guillemets appariés, une ligne par événement, aucune virgule terminale. **Non validé par un analyseur JSON.** |
| Couverture exhaustive du tableau des sources | Chaque affirmation factuelle porte un identifiant `S-nn`, mais **aucun contrôle croisé automatisé** n'a été fait entre le corps du rapport et le tableau 7.6. Ce contrôle est confié à `ACTION-0004`, point 7. |
| Comportement réel des dix outils comparés | **Aucun n'a été installé ni exécuté.** Toutes les cellules du tableau 7.2 reposent sur des déclarations d'éditeurs. |
| Toute mesure de performance ou de volumétrie | Aucune n'a été prise, pour aucun outil. |
| `crates.io` pour cinq des sept noms candidats | Non interrogé. Ces noms ne sont **pas** déclarés libres sur ce registre. |
| Antériorité de marque des noms candidats | Les bases officielles (USPTO, CIPO, EUIPO, WIPO) exigent une session interactive ou une requête POST. La tentative sur le service de l'USPTO n'a renvoyé aucun résultat exploitable. |
| TLD autres que `.com` | Non interrogés. |
| Validité juridique des raisonnements de licence | **Aucun avis juridique.** Le rapport n'en tient pas lieu. |
| Fins de ligne sur le disque | Non contrôlées ; aucun `.gitattributes` n'a été posé. |
| Cohérence des liens relatifs entre documents | Aucun vérificateur de liens n'a été exécuté. |

### A.3 Inconnu

- Si un outil existant applique déjà la métaphore topographique à des fichiers
  locaux. La recherche menée n'a rien trouvé de pertinent, ce qui **ne prouve
  pas** l'absence.
- Si le relief est réellement plus lisible qu'un pavage rectangulaire pour
  cette tâche. C'est l'hypothèse centrale du projet ; elle n'est pas éprouvée.
- Si le public cible postulé correspond à une demande réelle.
- Faisabilité et coût des principes annoncés (surveillance incrémentale,
  volumétrie, rendu) — phases 3 à 5.

### A.4 Non-conformité résiduelle — **corrigée le 2026-08-25**

`ROADMAP.md`, ligne 19, énonçait « Chaque passage d'une phase à la suivante
requiert un **GO humain explicite** », obsolète depuis l'autorisation
permanente du 2026-08-25. Cette correction, hors du périmètre de `TASK-0002`,
a été effectuée par l'orchestrateur dans le cadre de la présente correction
post-vérification (section A.6) : le passage d'une phase à l'autre est
désormais décrit comme autonome dès critères et preuves satisfaits, la phase 6
conservant son GO humain spécial et sa condition d'audits préalables.

### A.6 Corrections apportées après vérification indépendante de l'orchestrateur (2026-08-25)

**Contexte.** L'orchestrateur a conduit une vérification indépendante de
`docs/research/phase-1-research-and-positioning.md` et a obtenu, en lecture
seule, les preuves suivantes — distinctes de celles rassemblées par l'agent
exécuteur en A.1 :

| Élément vérifié | Preuve indépendante obtenue |
|---|---|
| Identité du dépôt GraphRAG Workbench | API GitHub : `full_name: lyon-industries/graphrag-workbench`, licence `MIT`, `created_at: 2025-09-04T15:29:08Z`, `pushed_at: 2026-07-18T09:47:42Z`, 713 étoiles, 91 bifurcations, `archived: false`, langage TypeScript |
| Version publiée | API des releases : tag `v0.1.0-alpha.1`, nom exact « v0.1.0-alpha.1 — GraphRAG Workbench (First alpha) », `prerelease: true`, `published_at: 2025-09-04T16:22:04Z` — **le rapport citait auparavant un intitulé inventé (« Initial Alpha ») et une année inférée plutôt que constatée** ; corrigé (section 7.1.0 et tableau des sources, S-04) |
| Contributeurs | API GitHub : un seul contributeur, `ChristopherLyon`, 14 contributions |
| Citations du README/LICENSE | Toutes les expressions citées dans le rapport confirmées telles quelles |
| Microsoft GraphRAG | MIT, `pushed_at: 2026-08-24`, 35 679 étoiles, 3 747 bifurcations, non archivé ; mention « largely in maintenance mode » et avertissement de coût d'indexation confirmés |
| Noms candidats `folderscape` et `cartodoc` | HTTP 404 confirmé sur npm, PyPI, `crates.io`, comptes/organisations GitHub, et RDAP Verisign `.com` — disponibilité déclarée par le rapport confirmée |
| 25 liens officiels du tableau de sources (7.6) | HTTP 200 |
| Source S-27 (Softpedia) | HTTP **403** — reste une source **secondaire non vérifiée indépendamment**, déjà signalée comme secondaire dans le rapport |

**Validations de format déjà effectuées par l'orchestrateur** (reprises de
l'exercice de vérification, en complément de A.1) : structure en huit
sous-sections, présence des quatorze questions dans leur libellé exact,
marquage systématique faits/inférences/recommandations/incertitudes, mention
« soumise à décision humaine », absence de choix de pile technologique,
absence de réservation de nom/domaine/compte.

**Corrections apportées au rapport à la suite de cette vérification :**

1. **Intitulé et date de la version `v0.1.0-alpha.1`** — l'intitulé inventé
   « Initial Alpha » et l'année inférée sont remplacés par le nom exact et la
   date officielle de l'API des releases ; la source `S-04` pointe désormais
   vers l'URL API officielle des releases plutôt que vers la page HTML.
2. **Nuance Apache-2.0** — les formulations affirmant un fichier `NOTICE`
   « obligatoire » sont corrigées : la clause §4(d) n'impose de reproduire les
   notices d'un fichier `NOTICE` que **si l'œuvre distribuée en comporte déjà
   un**. Ce n'est pas un fichier universellement à créer.
3. **Nuance GPL/AGPL** — le tableau de compatibilité de licence précise
   qu'une distribution combinée ou liée à un composant copyleft doit
   respecter sa licence et ne peut pas se présenter comme « MIT seul », mais
   que les limites exactes (module en plugiciel, processus séparé, liaison
   dynamique) restent des questions de qualification juridique non tranchées
   par ce rapport, qui ne constitue pas un avis juridique.

**Limites de cette vérification, déclarées explicitement :**

- **Aucune vérification formelle en base de marques** n'a été faite par
  l'orchestrateur, pour les mêmes raisons d'accès que celles déjà rapportées
  par l'agent exécuteur (A.2) : les bases officielles (USPTO, CIPO, EUIPO,
  WIPO) exigent une session interactive ou une requête POST.
- **Softpedia (S-27) a répondu HTTP 403** lors de cette vérification et reste
  une **source secondaire non vérifiée indépendamment** ; le rapport le
  signale déjà comme tel et aucune affirmation factuelle ne repose sur cette
  seule source sans l'indiquer.
- Cette vérification ne porte pas sur la totalité des contrôles de
  `ACTION-0004` (par exemple le contrôle croisé exhaustif du corps du rapport
  contre le tableau des sources) : elle documente les preuves obtenues à ce
  stade, pas une clôture de `ACTION-0004`.

**Statut à l'issue de cette étape.** `TASK-0002` restait `IMPLEMENTED` à
l'issue de cette correction partielle. La clôture finale est en section A.7.

### A.7 Vérification indépendante finale et clôture de `ACTION-0004` (2026-08-25)

**Exécutant :** orchestrateur, instance indépendante de l'agent exécuteur.
**Résultat :** `TASK-0002` déclarée **`VERIFIED`** sur la grille de preuves
ci-dessous, en complément des preuves déjà rassemblées en A.1 et A.6.

**Grille de preuves.**

| Élément | Preuve |
|---|---|
| Quatorze questions du prompt maître | Réponses présentes et complètes en sections 7.1.1 à 7.1.14 du rapport |
| Sources définies dans le tableau 7.6 | **32 sources** (`S-01` à `S-31`, y compris `S-21bis`), chacune avec URL, organisme, nature et affirmation soutenue |
| API GraphRAG (dépôt, releases, contributeurs) | Confirmée en A.6 : `full_name`, licence, dates, étoiles, bifurcations, tag `v0.1.0-alpha.1`, contributeur unique |
| Liens officiels du tableau des sources | **25 liens vérifiés, 25 en HTTP 200** (A.6) ; Softpedia (S-27) en HTTP 403, resté signalé comme source secondaire |
| Registres de noms candidats | **7 candidats × 5 registres** (npm, PyPI, `crates.io`, GitHub, RDAP `.com`) : `crates.io` confirmé en HTTP 404 pour les **sept** candidats le 2026-08-25 — `topodoc`, `docscape`, `cartodoc`, `folderscape`, `isodoc`, `terradoc`, `reliefdoc`. Résultats complémentaires confirmés : `topodoc` npm+RDAP `.com` = HTTP 200 (pris) ; `docscape` GitHub+RDAP = HTTP 200 (pris) ; `cartodoc` cinq registres = HTTP 404 (libre) ; `folderscape` cinq registres = HTTP 404 (libre) ; `isodoc` GitHub+RDAP = HTTP 200 (pris) ; `terradoc` PyPI+GitHub+RDAP = HTTP 200 (pris) ; `reliefdoc` RDAP = HTTP 200 (domaine pris), npm/PyPI/`crates.io`/GitHub = HTTP 404 (libres) |
| Syntaxe et encodage des fichiers d'état | `graph/current_state.yaml`, `graph/project_graph.yaml` : YAML lu et cohérent ; `graph/history.jsonl` : JSONL en ajout seul ; encodage UTF-8 conservé sur tous les fichiers modifiés |
| Absence de donnée réelle ou de scan privé | Aucune référence à un projet privé, aucun secret, aucun chemin local personnel introduit par le rapport ni par ses corrections |
| Pile technologique | **Aucune choisie** — confirmé en section 7.8.3 du rapport, inchangée par cette vérification |
| Limite marques | **Conservée** : aucune recherche formelle en base de marques (USPTO/CIPO/EUIPO/WIPO) n'a pu être faite ; reste déclarée non testée |
| Limite TLD | **Conservée** : seul `.com` a été vérifié ; les autres TLD (`.org`, `.app`, `.dev`, `.ca`) restent non testés |

**Correction apportée au rapport à la suite de cette clôture.** La limite
« `crates.io` n'a été vérifié que pour deux candidats » est **retirée** de la
section 7.4 du rapport, remplacée par le constat que les sept candidats sont
confirmés libres sur `crates.io`. Les sections « Non testé » (§8) et
« Incertitudes » (§7.7.4) du rapport sont mises à jour en conséquence. Les
limites relatives aux marques et aux TLD **restent intactes**, non levées par
cette vérification.

**Ce que cette vérification ne couvre pas.** Aucune recherche formelle de
marque, aucun TLD hors `.com`, aucune mesure de performance, aucun test
d'utilisabilité. Ces points demeurent « non testé », transmis à `TASK-0003`
(diligence raisonnable sur le nom public).

**Conséquence.** `TASK-0002` et la phase 1 passent à `VERIFIED`,
`verified_by: orchestrator`, `verified_on: 2026-08-25`. `ACTION-0004` est
close. Une nouvelle action unique, `ACTION-0005`, ouvre `TASK-0003`.

### A.5 Ce qu'un humain reste seul à pouvoir juger

1. Le **nom public** — le rapport propose `folderscape`, déconseille
   `cartodoc`. Rien n'est arrêté ni réservé.
2. La **licence définitive** — le rapport propose MIT et écarte Apache-2.0
   après examen. Rien n'est apposé.
3. Si la valeur distincte formulée en 7.3.2 correspond bien à son intention.
4. S'il accepte les limites du MVP sans IA énoncées en 7.3.3.

---

## B. TASK-0001 — Phase 0, isolation et démarrage

**Statut : `VERIFIED` le 2026-08-25**, sur vérification indépendante de
l'orchestrateur. L'agent exécuteur ne s'est pas attribué cet état.

### B.1 Vérification indépendante de l'orchestrateur — 2026-08-25

| Contrôle | Indicateur | Résultat |
|----------|-----------|----------|
| Décompte des fichiers du dépôt | `file_count` | 19 |
| Syntaxe des deux fichiers YAML | `yaml_parsed_by_tool` | `true` |
| Syntaxe de `graph/history.jsonl` | `jsonl_parsed_by_tool` | `true` |
| Encodage des fichiers | `encoding_inspected` | `true` — UTF-8 |
| Absence de référence privée | `private_reference_scan` | `true` — aucune |
| État Git local | — | obtenu |

**Avertissement Git, non bloquant.** Le fichier d'exclusion global déclaré dans
la configuration n'était pas accessible lors du contrôle. Cet avertissement n'a
pas empêché l'obtention de l'état local du dépôt, qui a bien été lu.

### B.2 Vérifié

| Élément | Preuve |
|---------|--------|
| Le dépôt ne contenait aucun fichier de projet avant TASK-0001 | Listage du dépôt : seuls `.git/` et ses gabarits de crochets existaient |
| Tous les fichiers listés dans `CURRENT_STATE.md` ont été créés | Confirmation de création retournée pour chaque écriture |
| `AGENTS.md` et `CLAUDE.md` portent les mêmes règles | Rédigés à partir du même texte, sections 1 à 7 identiques |
| Aucun code applicatif, aucune dépendance | Aucun fichier source ni manifeste de dépendances créé |
| Aucune installation, aucune publication, aucun commit | Aucune commande de ce type exécutée pendant la tâche |
| Aucun secret ni chemin local personnel dans les fichiers versionnés | Rédaction sans chemin absolu ni identifiant ; relecture du contenu produit |
| Aucune donnée réelle, aucune référence à un projet tiers privé | Contenu entièrement rédigé pour ce projet |

### B.3 Non testé

| Élément | Raison |
|---------|--------|
| Fins de ligne | Non contrôlées ; aucun `.gitattributes` n'a été posé |
| Cohérence des liens relatifs entre documents | Aucun vérificateur de liens n'a été exécuté |

**Note.** La ligne « Adéquation de la vision au besoin réel — relève de la
phase 1, non faite » figurait ici avant le 2026-08-25. La phase 1 est
désormais **exécutée** : voir la section A et
`docs/research/phase-1-research-and-positioning.md`. Cette adéquation reste
néanmoins **non validée auprès d'utilisateurs** (section A.3).

---

## C. TASK-0003 — Diligence du nom public (2026-08-25)

### C.1 Vérification de l'orchestrateur — ACTION-0006

L'orchestrateur a relu le livrable, contrôlé les dix critères d'acceptation,
parsée les deux structures YAML et les 39 lignes JSONL, inspecté l'état Git et
recherché toute référence au corpus privé interdit. Cette vérification est
distincte de la rédaction du livrable attribuée à Codex dans la fiche de
tâche et le journal.

| # | Critère | Résultat | Preuve |
|---|---------|----------|--------|
| 1 | `DEC-0001` existe au gabarit | Conforme | Contexte, options, décision, motif, conséquences, preuves et limites présents |
| 2 | CIPO, USPTO, WIPO, EUIPO tentés | Conforme avec limites | CIPO/EUIPO : résultats directs; USPTO : WAF; WIPO : conditions interdisant l'automatisation |
| 3 | Collisions Web et proches documentées | Conforme | `FileTopo`, `FolderAtlas`, `TerraFolder`, `folderscape` comparés dans `DEC-0001` |
| 4 | `.org`, `.app`, `.dev`, `.ca` vérifiés | Conforme | Trio final contrôlé, 404 ponctuel sur les quatre TLD et `.com` |
| 5 | Trois nouveaux candidats si risque `folderscape` | Conforme | `filetopo`, `folderatlas`, `terrafolder`, neuf contrôles chacun |
| 6 | Aucune réservation, achat ou compte | Conforme | Aucun remote Git; aucune opération d'écriture réseau ou financière |
| 7 | Aucune référence au projet privé | Conforme | 0 correspondance au scan ciblé dans 23 fichiers |
| 8 | Licence et pile non décidées | Conforme | YAML et `CURRENT_STATE.md` conservent ces questions ouvertes |
| 9 | Aucune tâche `IN_PROGRESS` à la clôture | Conforme | `in_progress_count: 0`; `TASK-0003: IMPLEMENTED` avant vérification |
| 10 | Exactement une prochaine action | Conforme | `NEXT_ACTION.md` contient seulement `ACTION-0006` |

### C.2 Contrôles structurels

- `graph/current_state.yaml` : parse valide; compteur `IN_PROGRESS` à 0;
  `TASK-0003` à `IMPLEMENTED` lors du contrôle.
- `graph/project_graph.yaml` : parse valide; `public_name: FileTopo` et
  `public_name_decided: true`; `TASK-0003` à `IMPLEMENTED` lors du contrôle.
- `graph/history.jsonl` : 39 lignes valides avant ajout de l'événement de
  vérification.
- Git : aucun remote; tous les fichiers restent locaux et non suivis, aucun
  commit.
- Corpus privé interdit : zéro référence textuelle introduite; aucun accès au
  corpus n'a été effectué.

### C.3 Limites maintenues

- Résultats USPTO et WIPO non vérifiés.
- Pas de recherche juridique exhaustive par classes, similarités ou droits
  non enregistrés.
- Les disponibilités techniques sont ponctuelles et devront être refaites
  avant publication.

### C.4 Conclusion

Les critères de `TASK-0003` sont satisfaits sans masquer les limites. Le nom
**FileTopo** est acceptable pour poursuivre localement et de façon réversible.
`ACTION-0006` peut être close et `TASK-0003` portée à `VERIFIED`. Cette
conclusion n'autorise aucune fixation externe ou irréversible du nom.

---

## D. TASK-0004 — Architecture (2026-08-25)

### D.1 Vérification de l'orchestrateur

| # | Critère | Résultat | Preuve |
|---|---------|----------|--------|
| 1 | Quatre décisions, ≥3 options | Conforme | `DEC-0002` à `DEC-0005`, quatre options chacune |
| 2 | Pile Windows sourcée | Conforme | Tauri, Microsoft, Electron et Wails officiels cités |
| 3 | Frontières/processus explicites | Conforme | Diagramme, IPC typé, capacités minimales, menaces |
| 4 | Données/migrations définies | Conforme | Tables logiques, UTF-16LE, `user_version`, reconstruction |
| 5 | Rendu/relief pour 1 M | Conforme comme stratégie | Tuiles, LOD, ≤50 k primitives, calcul Rust |
| 6 | Budgets falsifiables | Conforme | Tableau 10 k/100 k/1 M avec p95, mémoire, FPS |
| 7 | Lecture seule testable | Conforme | Non-suivi reparse, placeholders, IDs IPC, aucune écriture corpus |
| 8 | Tests synthétiques erreurs/volumes | Conforme | Plan unitaire, SQLite, I/O, benchmarks, E2E |
| 9 | Aucun code/dépendance | Conforme | 0 source applicative, 0 manifeste |
| 10 | États structurés cohérents | Conforme | Deux YAML et JSONL parsés avant clôture |

### D.2 Contrôles observés

- Six livrables : 209, 57, 88, 109, 106 et 39 lignes.
- Zéro fichier `.rs`, `.ts`, `.tsx`, `.js`, `.jsx` ou `.toml`.
- Zéro `package.json`, `Cargo.toml` ou fichier de verrouillage.
- Zéro correspondance au nom du corpus privé interdit.
- Source SQLite officielle datée du 2026-08-24 intégrée : exigence d'une
  version corrigée du bogue WAL-reset.

### D.3 Conclusion

`TASK-0004` et les décisions `DEC-0002` à `DEC-0005` passent à `VERIFIED`.
Les performances demeurent des budgets, non des résultats; elles doivent être
mesurées dans le squelette avant toute promesse publique.

---

## E. TASK-0005 — Squelette vérifiable (2026-08-26)

### E.1 Vérification de l'orchestrateur

| # | Critère | Résultat | Preuve |
|---|---------|----------|--------|
| 1 | Installation, TypeScript, tests et build Web | Conforme | `pnpm install`, `check`, 1 test Vitest et build Vite réussis |
| 2 | Tests Rust | Conforme | 5 tests réussis avec cache incrémental désactivé |
| 3 | Fixture → index → DTO | Conforme | test d'intégration et commande Tauri, 9 éléments |
| 4 | Fixture inchangée | Conforme | empreinte des chemins et octets identique avant/après |
| 5 | IPC étroit | Conforme | trois commandes sans chemin ou SQL fourni par le frontend |
| 6 | Aucun réseau à l'exécution | Conforme | aucune permission réseau, CDN, télémétrie ou mise à jour |
| 7 | Aucune donnée réelle | Conforme | fixtures inventées et répertoires temporaires seulement |
| 8 | Licence et avis | Conforme | `LICENSE` MIT et `THIRD_PARTY_NOTICES.md` présents |
| 9 | Mesures 10 k/100 k | Conforme | 97 ms et 1 027 ms pour le pipeline mesuré |
| 10 | Mémoire synchronisée | Conforme | tâche, README, deux YAML, feuille de route et action actualisés |

### E.2 Chaîne Windows

- Rust 1.98.0 et Visual Studio Build Tools 2022 détectés.
- SQLite embarqué : 3.53.2, supérieur au minimum fixé pour le correctif WAL.
- Exécutable produit dans la sortie Tauri de débogage.
- Installateur NSIS `FileTopo_0.1.0_x64-setup.exe` produit localement.
- Aucun installateur n'a été exécuté et rien n'a été publié.

### E.3 Inspection visuelle avec Ordinateur

L'application compilée a été ouverte directement. La première inspection a
révélé que la liste accessible agrandissait toute la grille et repoussait le
centre de la carte hors écran. Un relief SVG de secours a été ajouté sous
PixiJS et la grille a été contrainte avec une liste interne défilable. Après
reconstruction, l'inspection a confirmé :

- relief et points visibles;
- statistiques 96 éléments et SQLite 3.53.2;
- bouton Fixture synthétique fonctionnel;
- pipeline réel affichant 9 éléments et 390 octets;
- aucune fenêtre d'autorisation, aucun réseau et aucun accès à une donnée
  utilisateur.

### E.4 Mesures observées

| Éléments | Génération | Indexation | Requête | Total |
|----------|-----------:|-----------:|--------:|------:|
| 10 000 | 18 ms | 55 ms | 24 ms | 97 ms |
| 100 000 | 77 ms | 726 ms | 224 ms | 1 027 ms |

Les limites sont détaillées dans
`docs/performance/phase-3-measurements.md`. Il s'agit d'un profil de test non
optimisé et d'un index en mémoire, pas d'une promesse de performance disque.

### E.5 Conclusion

`TASK-0005` et la phase 3 passent à `VERIFIED`. `ACTION-0008` est close.
L'autorisation permanente permet d'ouvrir immédiatement `TASK-0006` et
`ACTION-0009` pour la phase 4, sans autoriser de scan réel par l'agent ni de
publication.

---

## F. TASK-0006 — MVP local sans IA (2026-08-26)

### F.1 Vérification de l’orchestrateur

| # | Critère | Résultat | Preuve |
|---|---------|----------|--------|
| 1 | Racine choisie explicitement | Conforme | dialogue natif déclenché par bouton; ajout sans scan automatique |
| 2 | Contenu jamais lu | Conforme | scanner limité à `symlink_metadata`, `read_dir` et attributs; tests d’empreinte |
| 3 | Reparse jamais suivi | Conforme | racine refusée, descendants `Skipped`, ouverture revérifiée composant par composant |
| 4 | Index séparé/reconstructible | Conforme | données d’application `collections/<UUID>/index.sqlite`, jamais dans la racine |
| 5 | Progression/annulation/erreurs | Conforme | worker bloquant, compte atomique, annulation coopérative, aucun index partiel |
| 6 | Recherche/filtres/pagination 100 k | Conforme | deux pages de 120 distinctes, filtre type/en ligne, 126 ms observés |
| 7 | Clavier et FR/EN | Conforme | liste DOM, contrôles nommés, 4 tests et inspection réelle corrigée |
| 8 | Ouverture explicite | Conforme | bouton seulement après sélection; commande par collection ID + node ID, confinement testé |
| 9 | Tests/build/audit | Conforme | 11 Rust, 4 Vitest, TypeScript, Vite, Clippy `-D warnings`, audit 0 vulnérabilité, release + NSIS |
| 10 | Aucun réseau/donnée/publication | Conforme | CSP IPC seulement, données synthétiques/temp, aucun remote ou publication |

### F.2 Mesures et artefacts

- 10 000 : génération 7 ms, indexation 54 ms, lecture 19 ms, filtre paginé 14 ms.
- 100 000 : génération 69 ms, indexation 587 ms, lecture 181 ms, filtre paginé 126 ms.
- Exécutable optimisé et `FileTopo_0.1.0_x64-setup.exe` produits localement.
- Inspection avec Ordinateur : filtre « En ligne », sélection carte/liste, état non vu, niveau de détail et bascule FR/EN vérifiés. Une première inspection a révélé des légendes anglaises incomplètes; corrigées et revérifiées après reconstruction.

### F.3 Conclusion

`TASK-0006` et la phase 4 passent à `VERIFIED`; `ACTION-0009` est close. `TASK-0007` et `ACTION-0010` ouvrent automatiquement la préparation publique locale. Aucune publication n’est autorisée.

---

## G. TASK-0007 — Préparation publique (2026-08-26)

### G.1 Vérification de l'orchestrateur

| # | Critère | Résultat | Preuve |
|---|---|---|---|
| 1 | Aucun secret, chemin personnel ou contenu réel | Conforme | audit reproductible sur 102 fichiers candidats; zéro motif; fixtures synthétiques seulement |
| 2 | MIT et avis de tiers cohérents | Conforme | `LICENSE`, deux verrous, inventaire JS/Rust et `THIRD_PARTY_NOTICES.md` recoupés |
| 3 | Sécurité, confidentialité, contribution et limites | Conforme | `SECURITY.md`, `PRIVACY.md`, `CONTRIBUTING.md`, modèle de menace et notes 0.1.0 |
| 4 | Tests, analyses, audits et build | Conforme | 4 Vitest, 11 Rust, TypeScript, Vite, fmt, Clippy strict, audit 0, release + NSIS |
| 5 | Préparation/signature/publication séparées | Conforme | trois sections et deux arrêts explicites dans `docs/release-checklist.md` |
| 6 | Aucune action externe | Conforme | aucun remote, signature, distribution, compte, achat ou publication |

### G.2 Inventaire et artefacts

- JavaScript : 16 entrées de production et 172 entrées dans le graphe complet.
- Rust : 456 paquets dans le graphe verrouillé conservateur toutes cibles;
  zéro licence absente.
- `pnpm audit --prod` : aucune vulnérabilité connue.
- `filetopo.exe` SHA-256 :
  `A187BAF6072055B9ED223ACD22FDC22491FCFED8BE7804F14C8CD09383EAFC65`.
- `FileTopo_0.1.0_x64-setup.exe` SHA-256 :
  `DA85199FC69EBA9298CA3EAA3ECEABD41B9569BBEDC38EA974CE1B3CAA0C450A`.
- Artefacts locaux non signés et non distribués.

### G.3 Limites maintenues

- Le graphe Cargo toutes cibles est conservateur; certains paquets
  conditionnels ne sont pas embarqués dans le binaire Windows.
- L'inventaire technique ne remplace pas une analyse juridique.
- Le nom public n'a pas fait l'objet d'une recherche juridique exhaustive.
- Le canal privé de signalement et la signature n'existent pas encore.

### G.4 Conclusion

`TASK-0007` et la phase 5 passent à `VERIFIED`; `ACTION-0010` est close.
`ACTION-0011` est `DEFERRED`. La phase 6 ne peut commencer qu'après un GO
humain spécial et distinct.
---

## H. TASK-0008 — Revue indépendante de pré-publication (2026-08-26)

**Exécutant :** Claude Code. **Statut livré :** `IMPLEMENTED`.
Cette section consigne des **preuves d'exécution**, pas une vérification
indépendante. `VERIFIED` reste à poser par l'orchestrateur ou l'humain.

### H.1 Chaîne de vérification, réexécutée après modifications

| Étape | Code de sortie | Détail |
|---|---:|---|
| `pnpm install --frozen-lockfile` | 0 | lockfile inchangé |
| `pnpm check` | 0 | TypeScript |
| `pnpm test` | 0 | 4 tests d'interface |
| `pnpm build` | 0 | Vite |
| `pnpm audit --prod` | 0 | *No known vulnerabilities found* |
| `cargo fmt --all -- --check` | 0 | Rust 1.98.0 |
| `cargo clippy --all-targets -- -D warnings` | 0 | strict |
| `cargo test` | 0 | 11 tests |
| `scripts/dependency-inventory.ps1` | 0 | 456 paquets Rust, 0 licence absente |
| `scripts/audit-public-readiness.ps1` | 0 | 112 fichiers candidats, 0 motif |

### H.2 Formats

- YAML analysés par PyYAML 6.0.3 : `graph/current_state.yaml`,
  `graph/project_graph.yaml`, `.github/workflows/ci.yml` et les trois modèles
  d'issues — 6/6.
- JSON strict : `package.json`, `src-tauri/tauri.conf.json`,
  `src-tauri/capabilities/default.json` — 3/3.
- JSONC : `tsconfig.json`, `tsconfig.node.json` — 2/2, commentaires normaux.
- JSONL : `graph/history.jsonl`, **55 lignes, 0 invalide**, saut de ligne final.
- Encodage : tous les fichiers ajoutés ou modifiés sont en UTF-8, sans BOM.
- Documentation : 46 fichiers `.md`, **0 lien relatif cassé**, **0 chemin cité
  introuvable**. Ceci lève deux entrées de `still_untested`.

### H.3 Audit de l'historique Git

| Contrôle | Résultat |
|---|---|
| Blobs analysés, objets non atteignables compris | **143** |
| Secrets, clés, jetons | 0 |
| Chemins personnels absolus | 0 |
| Adresses de messagerie personnelles | 0 |
| Références à un projet privé | 0 |
| Dépôts distants, étiquettes, remisages | 0, 0, 0 |
| Commits, branches | 3, 1 (`main`) |
| Auteur | `Sébastien Dubé <filetopo@local.invalid>` — domaine non routable |

Les 5 blobs non atteignables sont d'anciennes versions de quatre documents et
de `src-tauri/Cargo.toml`; lus intégralement, sans donnée sensible.

Les occurrences de « GraphRAG Workbench » renvoient au dépôt **public**
`ChristopherLyon/graphrag-workbench`, comparé en phase 1. Ce n'est pas un
projet privé.

### H.4 Constat de sécurité sur le binaire compilé

`src-tauri/target/release/filetopo.exe`, **non versionné**, contient
**336 occurrences** de chemins de la machine de compilation — 240 fragments
distincts, issus des métadonnées de panique des dépendances Cargo — et
**1 occurrence** du chemin absolu du dossier de développement, provenant de
`env!("CARGO_MANIFEST_DIR")` dans `scan_synthetic_fixture`.

L'installateur NSIS ne montre aucune occurrence en ASCII ni en UTF-16LE, mais
sa charge utile est **compressée** : l'absence n'est **pas** une preuve. Non
vérifié après décompression.

**Le code source versionné est propre.** Les correctifs sont décrits dans
`docs/reviews/TASK-0008-independent-review.md` et **non appliqués**.

### H.5 Non testé dans cette tâche

- Construction Tauri release et paquet NSIS non refaites; empreintes SHA-256
  de `docs/releases/0.1.0.md` non recalculées.
- Workflow CI jamais exécuté sur un exécuteur GitHub; syntaxe validée, logique
  non validée.
- Branche `-AllowRemotes` non testée avec un remote réel : créer un remote est
  interdit, créer un dépôt de test hors du dossier violerait la section 1
  d'`AGENTS.md`.
- Les quatre liens externes du dépôt n'ont pas été résolus sur le réseau.
- Aucune inspection visuelle de l'application.
- Recherche de marque USPTO/WIPO toujours non levée.

### H.6 Conclusion

`TASK-0008` est livrée en `IMPLEMENTED`, non commitée. Le dépôt est publiable
sous forme de **code source**; il ne l'est pas sous forme de **binaire** tant
que H.4 n'est pas traité.
---

## H bis. TASK-0008, second tour (2026-08-26)

**Exécutant :** Claude Code. **Statut livré :** `IMPLEMENTED`.
Preuves d'exécution, **pas** une vérification indépendante.

### H bis.1 Chaîne complète, réexécutée après toutes les modifications

| Étape | Code de sortie | Détail |
|---|---:|---|
| `pnpm install --frozen-lockfile` | 0 | lockfile inchangé |
| `pnpm check` | 0 | TypeScript |
| `pnpm test` | 0 | **36 tests** (4 auparavant) |
| `pnpm build` | 0 | Vite |
| `pnpm audit --prod` | 0 | aucune vulnérabilité connue |
| `cargo fmt --all -- --check` | 0 | Rust 1.98.0 |
| `cargo clippy --all-targets -- -D warnings` | 0 | profil debug |
| `cargo clippy --release -- -D warnings` | 0 | profil release, nouveau |
| `cargo test` | 0 | **13 tests** (11 auparavant) |
| `scripts/dependency-inventory.ps1` | 0 | 456 paquets Rust, 0 licence absente |
| `scripts/audit-public-readiness.ps1` | 0 | aucun motif sensible |
| `scripts/scan-binary-for-personal-paths.ps1` | 0 | **aucune fuite** |

**12 étapes, 0 échec.**

### H bis.2 Fuite de chemins de compilation

Mesures réelles, par `scripts/scan-binary-for-personal-paths.ps1`, sur
`filetopo.exe` :

| Motif | Avant | Après |
|---|---:|---:|
| Nom de compte Windows | 336 | 0 |
| Profil utilisateur | 336 | 0 |
| Racine du dépôt | 1 | 0 |
| Nom du dossier du dépôt | 1 | 0 |
| `CARGO_HOME` | 335 | 0 |

Cinq motifs, deux encodages — ASCII et UTF-16LE —, deux artefacts.

**`trim-paths` rejeté sur preuve.** Ajouté au profil `release`, il rend le
manifeste impossible à analyser : *feature `trim-paths` is required ... not
stabilized in this version of Cargo (1.98.0)*. Remplacé par
`--remap-path-prefix`, stable, appliqué par `scripts/build-release-clean.ps1`
avec des préfixes calculés à l'exécution.

`env!("CARGO_MANIFEST_DIR")` retiré du code livré : le remappage seul ne
l'aurait pas corrigé, la macro étant une expansion textuelle.

Nouvelles empreintes SHA-256 :

- `filetopo.exe`, 11 195 904 octets :
  `71BEA4EFC76AAB8C66FBCF315BD903981450851FAED67972E45AE5BD712CB7B6`;
- `FileTopo_0.1.0_x64-setup.exe`, 2 927 778 octets :
  `BF71FF7EA6CA4DF178CF1F459E4891A422D047B5BA23A7E2D0826CF748124A72`.

Les empreintes de la phase 5 sont **périmées**; leurs artefacts contenaient les
chemins et ne doivent pas être distribués.

### H bis.3 Langue

Règle implémentée dans `src/lib/locale.ts` : choix explicite mémorisé, puis
langue système ou navigateur — toute locale `fr` donne le français —, puis
anglais en repli. **32 tests réels** couvrent la détection, la persistance, les
cas limites (`en-FR` reste anglais; `af-ZA`, `fy-NL`, `frr` ne sont pas
confondus avec le français), une valeur stockée corrompue et un stockage qui
lève une exception.

Documentation publique en anglais, avec `README.fr.md` complet et équivalent.
`docs/ai/**`, `graph/**`, `AGENTS.md`, `CLAUDE.md` et la checklist restent en
français.

### H bis.4 Formats et documentation

6 YAML, 3 JSON stricts, 2 JSONC, **57 lignes JSONL sans erreur**, UTF-8 sans
BOM sur les 43 fichiers touchés. 49 fichiers `.md`, **0 lien relatif cassé**,
4 liens externes déclarés et non résolus sur le réseau.

### H bis.5 Non testé

- Workflow CI jamais exécuté sur un exécuteur GitHub.
- Branche `-AllowRemotes` non testée avec un remote réel.
- Liens externes non résolus sur le réseau.
- Aucune inspection visuelle de l'application; la détection de langue est
  couverte sous jsdom, pas dans l'application Tauri réelle.
- Charge utile NSIS non analysée après décompression.
- Le **journal de construction** contient toujours le chemin, via un message de
  l'éditeur de liens MSVC remonté en `linker_messages`. C'est dans la sortie
  console, pas dans l'artefact; `SECURITY.md` l'indique.

### H bis.6 Conclusion

`TASK-0008` est livrée en `IMPLEMENTED`, non commitée. Le dépôt est publiable
sous forme de **code source**. La distribution d'un binaire reste déconseillée,
non plus pour un défaut technique mais par prudence : installateur non signé,
coût et responsabilité d'un certificat, statut alpha.
---

## H ter. TASK-0008, troisième tour (2026-08-26)

**Exécutant :** Claude Code. **Statut livré :** `IMPLEMENTED`.

Transparence publique sur l'assistance IA, décision du propriétaire.
`AI_ASSISTANCE.md` créé (bilingue), sections ajoutées dans `README.md` et
`README.fr.md`, `CHANGELOG.md` mis à jour. Sens préservé exactement, voir
`docs/tasks/TASK-0008-phase-6-publication-readiness.md`.

**Aucun changement de code** : pas de reconstruction. Ré-audits documentaires
seulement :

| Étape | Résultat |
|---|---|
| `scripts/audit-public-readiness.ps1` | 118 fichiers, 0 motif sensible |
| Liens relatifs, 50 fichiers `.md` | 0 cassé |
| Encodage des 3 fichiers touchés | UTF-8, sans BOM |

Non commité. `TASK-0008` reste `IMPLEMENTED`.

---

## H quater. Vérification indépendante de TASK-0008 (2026-08-26)

**Vérificateur :** orchestrateur, après les trois tours Claude Code.

### Décisions finales

- Identité publique minimale approuvée : nom, copyright et profil GitHub.
- Assistance IA divulguée en anglais et en français.
- Documentation publique anglaise avec README français complet.
- Version harmonisée à `0.1.0-alpha.1`.
- Identifiant d'application : `io.github.vat-faire.filetopo`.
- Publication retenue : prerelease GitHub **source seulement**, sans binaire.

### Preuves rejouées indépendamment

| Contrôle | Résultat |
|---|---|
| `pnpm install --frozen-lockfile` | réussi, verrou inchangé |
| TypeScript et Vite | réussis |
| Vitest | **36/36** |
| `pnpm audit --prod` | 0 vulnérabilité connue |
| Inventaire | 172 entrées JS, 456 paquets Rust, 0 licence Rust absente |
| Rustfmt | réussi |
| Clippy strict debug et release | réussi |
| Tests Rust | **13/13** |
| Audit public | 118 fichiers, 0 motif sensible, 0 remote |
| Historique Git atteignable | 0 secret, chemin personnel ou référence privée |
| Build release/NSIS propre | réussi pour `0.1.0-alpha.1` |
| Scan binaire | 3 artefacts, 5 motifs, ASCII + UTF-16LE, **0 fuite** |

La détection de langue a été corrigée lors de cette revue pour suivre la
première préférence système valide; un français secondaire ne remplace plus
une préférence anglaise principale. Le script de build utilise
`CARGO_ENCODED_RUSTFLAGS`, compatible avec les chemins Windows contenant des
espaces, et remappe l'ensemble du profil utilisateur.

Empreintes de la candidate locale non distribuée :

- `filetopo.exe` :
  `9721613541E1430D83246DAF3087942A0BE97260C1C8E0688A6B34C2D74D92C0`;
- `FileTopo_0.1.0-alpha.1_x64-setup.exe` :
  `628EAB32AFFED631041A69F96EB4610A9CD444360BFE72C40C02C20D9201DA20`.

### Conclusion

Les huit critères locaux de `TASK-0008` sont conformes. `TASK-0008` passe à
`VERIFIED`. La phase 6 reste `IN_PROGRESS`; `TASK-0009` attend uniquement la
réauthentification humaine GitHub avant la publication source contrôlée.

---

## I. Vérification de TASK-0009 — publication GitHub (2026-08-26)

**Exécutant et vérificateur :** orchestrateur, sous le GO humain spécial de
phase 6.

| Contrôle | Résultat |
|---|---|
| Dépôt | `Vat-faire/FileTopo`, public, branche `main` |
| Licence | MIT détectée par GitHub |
| CI finale | exécution `33036847625`, succès, chaîne Windows complète |
| Sécurité | signalement privé, analyse de secrets et blocage au push actifs |
| Release | `v0.1.0-alpha.1`, prerelease, non brouillon |
| Actifs joints | **0**; archives source GitHub seulement |
| Binaire, signature ou dépense | aucun |
| Donnée privée ou chemin personnel transmis | aucun |

La première CI a réussi mais signalait trois actions fondées sur Node.js 20.
Les références ont été mises à jour vers `actions/checkout@v6`,
`actions/setup-node@v6` et `actions/cache@v5`; les deux CI suivantes ont réussi
sans cet avertissement. `TASK-0009` et la phase 6 passent à `VERIFIED`.

---

## J. TASK-0010 — Rebaseline et mémoire (2026-08-31)

**Exécuteur :** Codex, agent principal.
**Nature :** auto-validation documentaire et Git, non indépendante.
**Statut livré :** IMPLEMENTED. La vérification indépendante est en
section J bis.

### Vérification Git préalable

- Racine : dépôt autorisé confirmé par git rev-parse --show-toplevel.
- Branche de base : main au SHA
  91bbe90f0f99026c28cd345784d4f579a0016db2, état propre.
- Remote : https://github.com/Vat-faire/FileTopo.git.
- Aucun tag local; connectivité Git valide; branche de reconstruction absente
  avant sa création.
- Branche créée : rebuild/v0.2-project-brain, directement depuis la base.

### Contrôles documentaires exécutés

| Contrôle | Résultat réel |
|---|---|
| Livrables obligatoires | 20 présents, 0 absent |
| Première ligne de CLAUDE.md | exactement @AGENTS.md |
| Taille d'AGENTS.md | 2 611 caractères lors du contrôle |
| Liens Markdown locaux créés | 15 contrôlés, 0 cassé |
| Action dans NEXT_ACTION.md | 1 |
| Tâches au statut courant IN_PROGRESS à la clôture | 0 |
| États de ROADMAP et FEATURE_MATRIX | 13 phases et 39 fonctions, 0 état invalide |
| Recherche sensible à haute confiance | 0 correspondance |
| git diff --check | réussi après normalisation des fins de fichier |
| Fichiers hors périmètre dans le diff | 0 |
| Code, dépendances, graphes ou fichiers générés modifiés | 0 |

Les recherches sensibles ont couvert chemins de profils Windows/macOS,
signatures usuelles de clés privées, jetons GitHub/OpenAI/Slack/AWS et JWT.
L'interface privée de référence n'a pas été ouverte, listée ni recherchée.

### Audit statique du prototype

Lecture ciblée de package.json, src/, src-tauri/, tests/, mémoire existante et
graph/. Les preuves détaillées sont dans
docs/archive/v0.1-alpha/BASELINE_ASSESSMENT.md et
docs/product/FEATURE_MATRIX.md. graph/ a été lu sans écriture; ses YAML sont
contradictoires sur certains états et nécessitent une future normalisation.

### Non testé

- Aucun test automatisé applicatif : Vitest, TypeScript, Vite, Cargo test,
  rustfmt, Clippy et build Tauri non exécutés.
- Aucun test manuel de l'interface.
- Aucun test physique Windows, lecteur amovible, lecteur réseau ou fichier
  infonuagique.
- Aucun contrôle complet de performance, migration ou surveillance.

Une vérification documentaire contrôle les fichiers et leur cohérence. Un test
automatisé exécute le logiciel ou un analyseur. Un test manuel observe une
interaction réelle. Un test physique exerce matériel, OS ou périphérique réel.
TASK-0010 ne prétend valider que la première catégorie et les propriétés Git.

---

## J bis. Vérification indépendante de TASK-0010 (2026-08-31)

**Statut : `VERIFIED`** le 2026-08-31. État posé hors de l'exécuteur, sur
preuves, et approuvé explicitement par Sébastien le même jour.

**Vérificateurs :** orchestrateur, contrôle direct sur GitHub; Claude Code,
contrôle local du dépôt de travail.

### J bis.1 Vérifié — preuves distantes de l'orchestrateur

| Élément | Résultat |
|---|---|
| Branche de secours `rescue/pre-rebuild-local-changes-20260831` présente | oui |
| Branche de reconstruction `rebuild/v0.2-project-brain` présente | oui |
| SHA annoncés conformes à ceux publiés | oui |
| Commits documentaires au-dessus de `main` | 1 |
| Fichiers du commit | 20, exactement ceux autorisés |
| Fichiers de code modifiés | 0 |
| Première ligne de `CLAUDE.md` | `@AGENTS.md` |
| `AGENTS.md` compact | oui |
| Cohérence CURRENT_STATE, NEXT_ACTION, HANDOFF et TASK-0010 | vérifiée |
| `main`, prototype, historique et licence MIT conservés | oui |

### J bis.2 Vérifié — preuves locales de la présente session

| Contrôle | Commande ou source | Résultat |
|---|---|---|
| Racine du dépôt | `git rev-parse --show-toplevel` | dépôt public autorisé |
| Branche active | `git rev-parse --abbrev-ref HEAD` | `rebuild/v0.2-project-brain` |
| HEAD avant modification | `git rev-parse HEAD` | `d1119fad06b4296d67bcd0365572b78517b9fb29` |
| État de travail avant modification | `git status --porcelain` | vide |
| Amont | `git rev-parse --abbrev-ref @{u}` | `origin/rebuild/v0.2-project-brain` |
| SHA local et distant | `git rev-parse HEAD` et `git rev-parse origin/rebuild/v0.2-project-brain` | identiques |
| `main` local et distant | `git rev-parse main`, `git rev-parse origin/main` | `91bbe90f0f99026c28cd345784d4f579a0016db2` |
| Commits au-dessus de `main` | `git log --oneline main..HEAD` | 1, `docs: establish v0.2 project brain` |
| Fichiers du commit | `git show --name-only --format="" HEAD` | 20 fichiers `.md`, aucun code |
| Tâches au statut `IN_PROGRESS` | recherche dans `docs/tasks/` | 0 |
| Actions dans `NEXT_ACTION.md` | lecture directe | 1 |

### J bis.3 Non testé

- Aucun test automatisé, manuel ou physique du logiciel n'a été exécuté pour
  cette vérification. Elle porte uniquement sur les fichiers, leur cohérence et
  les propriétés Git.
- Aucune exécution, aucun build, aucune installation, aucune dépendance.
- `graph/` reste non normalisé et n'a pas été vérifié comme source d'état.
- `TASK-0008` demeure `IMPLEMENTED`; son état n'était pas dans le périmètre de
  cette vérification et n'a pas été modifié.

### J bis.4 Inconnu

Le comportement réel du prototype sur une arborescence utilisateur reste
inconnu tant qu'aucun essai physique Windows n'a été mené.

### J bis.5 Conséquence

`TASK-0010` passe de `IMPLEMENTED` à `VERIFIED`. Aucune tâche n'est
`IN_PROGRESS`. L'action unique suivante porte sur la spécification `TASK-0011`,
qui n'est ni créée ni démarrée.

---

## K. TASK-0011 — Fiche proposée, baseline fonctionnelle et architecture (2026-08-31)

**Statut de la tâche : `PROPOSED`.** Rien n'a été exécuté de son contenu.
Cette section valide **l'existence et la conformité de la fiche**, pas la
baseline qu'elle décrit.

**Agent :** Claude Code, sous `ACTION-0016` et GO explicite de Sébastien du
2026-08-31.

### K.1 Vérifications Git préalables — réussies

| Contrôle | Commande | Résultat |
|---|---|---|
| Racine | `git rev-parse --show-toplevel` | dépôt public autorisé |
| Branche | `git rev-parse --abbrev-ref HEAD` | `rebuild/v0.2-project-brain` |
| HEAD avant modification | `git rev-parse HEAD` | `1096fafa482b4e0f98cfb58c02bb5a258c7e9d23` |
| Arbre de travail | `git status --porcelain` | vide |
| SHA local et distant | `git rev-parse HEAD` / `origin/rebuild/v0.2-project-brain` | identiques |
| `main` local et distant | `git rev-parse main` / `origin/main` | `91bbe90f0f99026c28cd345784d4f579a0016db2` |
| Tâches `IN_PROGRESS` | recherche dans `docs/tasks/` | 0 |

### K.2 Contrôles documentaires exécutés sur la fiche

| Contrôle | Résultat réel |
|---|---|
| Fichier créé | `docs/tasks/TASK-0011-functional-architecture-baseline.md` |
| Statut de TASK-0011 | `PROPOSED`, jamais `APPROVED` ni `IN_PROGRESS` |
| Sections obligatoires du mandat | 13 présentes : objectif, contexte, fichiers à lire, fichiers modifiables, interdictions, livrables, recherches officielles, décisions à comparer, tests et preuves, critères d'acceptation, conditions d'arrêt, format du rapport, portes d'approbation |
| Points de portée future exigés | 16 énumérés en section 7.1 |
| Références `F-001` à `F-039` | portée déclarée sur les 39 fonctions, sans exception |
| Décisions à comparer | 6 fiches futures, `DEC-0007` à `DEC-0012`, toutes exigées `PROPOSED` |
| Fiches `DEC-0001` à `DEC-0006` | inchangées |
| Tâches `IN_PROGRESS` après modification | 0 |
| Actions dans `NEXT_ACTION.md` | 1 |
| Fichiers modifiés hors des six autorisés | 0 |
| Fichiers de code, tests, dépendances ou `graph/` | 0 |
| Liens Markdown locaux de la fiche | tous contrôlés, 0 cassé |
| Recherche de chemins personnels, secrets et données réelles | 0 correspondance |
| `git diff --check` | réussi |

### K.3 Non testé

- **Aucune partie du contenu de TASK-0011 n'a été exécutée** : pas de baseline
  des 39 fonctions, pas de parcours utilisateur, pas de comparaison de pile ni
  de rendu, pas de modèle de données, pas d'objectifs mesurés, pas de plan de
  tests appliqué. La fiche décrit un travail à faire.
- Aucun test automatisé, build, installation, test manuel ou essai physique
  Windows.
- La pertinence technique des options à comparer n'est pas démontrée; elle
  relève de l'exécution future.

### K.4 Écarts connus, hors périmètre de cette intervention

- `docs/tasks/TASK-0008-phase-6-publication-readiness.md` demeure `IMPLEMENTED`
  et se décrit encore comme « non commitée ». Correction explicitement exclue
  du mandat courant.
- `ROADMAP.md` décrit encore la phase 0 comme `IMPLEMENTED` avec « validation
  humaine en attente », alors que TASK-0010 est `VERIFIED` depuis le
  2026-08-31. `ROADMAP.md` n'était pas modifiable dans ce mandat; sa mise à
  jour est prévue par TASK-0011, section 5.

### K.5 Conséquence

`TASK-0011` existe au statut `PROPOSED`. Aucune tâche n'est `IN_PROGRESS`.
L'action unique suivante, `ACTION-0017`, appartient à Sébastien : examiner,
corriger, approuver ou rejeter la fiche.

---

## L. TASK-0011 — Exécution de la baseline fonctionnelle et d'architecture (2026-08-31)

**Statut à l'issue : `IMPLEMENTED`.** L'agent exécuteur ne s'attribue pas
`VERIFIED`. Une vérification indépendante reste requise (porte P2).

**GO :** Sébastien, 2026-08-31, porte P1 franchie. Le GO couvrait l'exécution
documentaire et le push du commit documentaire vers
`origin/rebuild/v0.2-project-brain`. Il ne couvrait ni publication du produit,
ni release, ni fusion, ni tag.

### L.1 Vérifications Git préalables — toutes réussies

| Contrôle | Attendu | Constaté |
|---|---|---|
| Racine du dépôt | racine du dépôt public FileTopo | conforme |
| Branche | `rebuild/v0.2-project-brain` | conforme |
| HEAD au démarrage | `01e6860fbbe68b98da8a28bec7b65ba796090cf1` | conforme |
| Arbre de travail | propre | conforme, `git status --porcelain` vide |
| SHA local = SHA distant | oui | `origin/rebuild/v0.2-project-brain` = `01e6860f...` |
| `main` | `91bbe90f0f99026c28cd345784d4f579a0016db2` | conforme, local et distant |
| Tâches `IN_PROGRESS` au démarrage | 0 | conforme |

Aucune condition d'arrêt de la section 12 de la fiche n'a été rencontrée.

### L.2 Contrôles de la section 10 de TASK-0011 — résultats réels

| Contrôle | Attendu | **Résultat réel** |
|---|---|---|
| Couverture fonctionnelle | 39 lignes `F-001` à `F-039`, aucune manquante, aucune dupliquée | **réussi** — 39 lignes; 0 manquante; 0 dupliquée |
| Classification | `MVP`, `ULTÉRIEUR` ou `DIFFÉRÉ` uniquement | **réussi** — 29 `MVP`, 6 `ULTÉRIEUR`, 4 `DIFFÉRÉ`, total 39; 0 valeur hors vocabulaire |
| Vocabulaire d'états | seuls les huit états permis dans les fiches créées | **réussi** — seuls `PROPOSED` et `VERIFIED` apparaissent; 0 état hors liste |
| Statut des décisions | `DEC-0007` à `DEC-0012` toutes `PROPOSED` | **réussi** — 6 fiches sur 6 à `PROPOSED` |
| Liens Markdown locaux | tous contrôlés, aucun cassé | **réussi** — 184 liens locaux vérifiés sur 74 fichiers Markdown suivis ou nouveaux; 0 cassé |
| Action unique | `NEXT_ACTION.md` contient exactement une action | **réussi** — 1 action, `ACTION-0018` |
| Tâches `IN_PROGRESS` | 0 à la clôture | **réussi** — 0 après passage de TASK-0011 à `IMPLEMENTED` |
| Recherche de données sensibles | aucun chemin personnel, secret, jeton ni donnée réelle | **réussi** — 0 chemin absolu local, 0 courriel, 0 identité personnelle, 0 secret. Les seules correspondances du motif « secret/jeton » sont les **interdictions elles-mêmes** rédigées dans les documents |
| Portée du diff | aucun fichier hors de la section 5 | **réussi** — 12 créations et 8 modifications, toutes listées en L.3, toutes prévues par la section 5 |
| Code, dépendances, `graph/` | 0 fichier modifié | **réussi** — `git status --porcelain` sur `src/`, `src-tauri/`, `tests/`, `public/`, `scripts/`, `.github/`, `graph/`, `package.json`, `pnpm-lock.yaml`, `Cargo.toml`, `Cargo.lock` : sortie vide |
| `git diff --check` | réussi | **réussi** — aucun problème d'espaces |
| Sources officielles | chaque décision cite au moins une source primaire datée | **partiellement réussi — voir L.4** |

### L.3 Fichiers touchés

**Créés (12)**

- `docs/product/REQUIREMENTS_BASELINE.md`
- `docs/product/USER_JOURNEY.md`
- `docs/architecture/ARCHITECTURE_BASELINE.md`
- `docs/architecture/FORMAT_MATRIX.md`
- `docs/architecture/TEST_STRATEGY.md`
- `docs/performance/BASELINE_TARGETS.md`
- `docs/decisions/DEC-0007-rebuild-tech-stack.md`
- `docs/decisions/DEC-0008-hierarchical-rendering.md`
- `docs/decisions/DEC-0009-data-model-and-relations.md`
- `docs/decisions/DEC-0010-indexing-and-watching.md`
- `docs/decisions/DEC-0011-brain-isolation-and-migrations.md`
- `docs/decisions/DEC-0012-ai-architectural-boundary.md`

**Modifiés (8, tous prévus par la section 5)**

- `docs/tasks/TASK-0011-functional-architecture-baseline.md` — GO, états,
  rapport d'exécution
- `docs/ai/CURRENT_STATE.md`, `docs/ai/NEXT_ACTION.md`, `docs/ai/HANDOFF.md`,
  `docs/ai/VALIDATION.md`, `docs/ai/CHANGELOG_AI.md`
- `docs/product/FEATURE_MATRIX.md` — **ajout d'une seule colonne**
  « Baseline TASK-0011 » et d'un paragraphe de renvoi. Contrôle mécanique
  exécuté : les 39 lignes conservent leur contenu d'origine **caractère pour
  caractère** avant la nouvelle cellule; 0 ligne altérée. Les 41 lignes de
  tableau portent 11 colonnes
- `ROADMAP.md` — phase 0 `IMPLEMENTED` vers `VERIFIED`, phase 1 `PROPOSED`
  vers `IMPLEMENTED`, plus une section « État réel au 2026-08-31 »

`docs/decisions/README.md` **n'a pas été modifié** : il n'appartient pas à la
liste de la section 5, bien qu'il énumère les décisions vérifiées. Sa mise à
jour relève d'une tâche ultérieure.

### L.4 Contrôle « sources officielles » — résultat partiel, détaillé

| Fiche | URL de sources primaires citées | Verdict |
|---|---:|---|
| `DEC-0007` | 8 | réussi |
| `DEC-0008` | 7 | réussi |
| `DEC-0009` | 6 | réussi |
| `DEC-0010` | 4 | réussi |
| `DEC-0011` | 4 | réussi |
| `DEC-0012` | **0** | **échec au sens strict** |

`DEC-0012` ne cite aucune source primaire **externe** : elle ne s'appuie que
sur des documents du dépôt (`PROJECT_VISION.md`, `DATA_PIPELINE_VISION.md`,
`threat-model.md`, `DEC-0006`). C'est une décision de périmètre de produit,
non contrainte par une plateforme ou une spécification. Conformément à la
section 8 de la fiche — « Une décision sans source officielle est déclarée
**incertaine** et son risque est écrit » — elle porte cette déclaration et son
risque écrit. **Le contrôle est donc rapporté comme partiellement réussi, et
non comme réussi.**

### L.5 Recherches officielles — sources réellement consultées le 2026-08-31

Vingt-deux pages de sources primaires ont été consultées en lecture seule :
`ReadDirectoryChangesExW`, `FILE_ID_INFO`, `GetFileInformationByHandleEx`,
File Attribute Constants, Handling placeholders, Reparse Points, Maximum Path
Length Limitation et Change Journals (Microsoft); WAL, FTS5, PRAGMA, Online
Backup API et Limits (SQLite); Security, Capabilities et Prerequisites
(Tauri 2); WCAG 2.2, Media Queries Level 5 et ARIA APG Tree View (W3C);
Canvas (WHATWG); SVG 2 (W3C); `symlink_metadata` et `MetadataExt` Windows
(Rust); Renderers (PixiJS). Une source de bibliothèque, `docs.rs/notify`, est
citée et **explicitement marquée comme secondaire**.

**Échec de consultation déclaré :** les spécifications WebGL 1.0 et 2.0 du
registre Khronos ont renvoyé **HTTP 403** aux tentatives du 2026-08-31 et
n'ont **pas** pu être lues. `DEC-0008` le déclare et s'appuie sur la
spécification HTML du WHATWG à la place. Aucune source secondaire n'a été
substituée pour combler cette lacune.

**Lacune déclarée :** le journal USN n'a été instruit sur aucune source
primaire quant aux privilèges requis, à sa troncature et à son support.
`DEC-0010` classe l'option correspondante « non instruite » plutôt que de la
noter sans preuve.

### L.6 Non testé — déclaration explicite

Aucun test automatisé, aucun build, aucune installation, aucun test manuel
d'interface, aucun essai physique Windows, aucune mesure de performance réelle
n'ont été exécutés. Les tests existants du prototype — 36 cas Vitest et 13
tests Rust déclarés — **n'ont pas été rejoués**.

Toutes les valeurs de
[BASELINE_TARGETS.md](../performance/BASELINE_TARGETS.md) sont des **cibles à
falsifier**, portant chacune la mention « non testé »; aucune n'est un
résultat. Les constats sur le prototype proviennent d'une **lecture statique**
du code au commit `01e6860f` : l'absence d'un symbole recherché ne prouve pas
l'absence de tout comportement indirect.

### L.7 Confidentialité

Aucun accès à l'interface privée de référence : ni lecture, ni listage, ni
recherche, ni citation de ses noms, chemins, données, métadonnées ou code.
Aucune donnée réelle employée. Toutes les arborescences et volumétries citées
sont synthétiques et décrites comme telles. Aucun accès hors du dépôt public,
hormis la consultation en lecture seule des sources officielles publiques
listées en L.5. Aucune écriture distante autre que le push autorisé.

### L.8 Conséquence

`TASK-0011` est `IMPLEMENTED`. `DEC-0007` à `DEC-0012` sont toutes `PROPOSED`.
`DEC-0001` à `DEC-0006` sont inchangées. Aucune tâche n'est `IN_PROGRESS`.
L'action unique suivante, `ACTION-0018`, appartient à Sébastien : examiner la
baseline et les six décisions (porte P2).

---

## M. TASK-0011 — Révision après corrections de l'orchestrateur (2026-08-31)

**Statut à l'issue : `IMPLEMENTED`, inchangé.** La baseline générale a été
acceptée; la porte **P2 n'est pas franchie**. L'agent exécuteur ne s'attribue
pas `VERIFIED`. Cette section valide **l'application des quatre corrections**,
pas la baseline elle-même.

**Portée :** quatre corrections motivées, décrites en section 17 de
[TASK-0011](../tasks/TASK-0011-functional-architecture-baseline.md). Aucun
code, test, dépendance, `graph/`, fiche `VERIFIED` antérieure ni tâche suivante
n'a été touché.

### M.1 Vérifications Git préalables — toutes réussies

| Contrôle | Attendu | Constaté |
|---|---|---|
| Racine du dépôt | racine du dépôt public FileTopo | conforme |
| Branche | `rebuild/v0.2-project-brain` | conforme |
| HEAD au démarrage | `d7d9118ea66c63cd9ae8e18b406c6c0facb87689` | conforme |
| Arbre de travail | propre | conforme, `git status --porcelain` vide |
| SHA local = SHA distant | oui | `git ls-remote origin` = `d7d9118e...` |
| `main` local et distant | `91bbe90f0f99026c28cd345784d4f579a0016db2` | conforme, **inchangée** |
| Tâches `IN_PROGRESS` | 0 | conforme |

Aucune condition d'arrêt de la section 12 de la fiche n'a été rencontrée.

### M.2 Contrôles exécutés — résultats réels

| Contrôle | Attendu | **Résultat réel** |
|---|---|---|
| Couverture fonctionnelle | 39 lignes `F-001` à `F-039` | **réussi** — 39 lignes; 0 manquante; 0 dupliquée; ordre `F-001`…`F-039` conforme |
| Classification | 31 `MVP`, 4 `ULTÉRIEUR`, 4 `DIFFÉRÉ` | **réussi** — 31 / 4 / 4, total 39; 0 valeur hors vocabulaire. `ULTÉRIEUR` = F-013, F-017, F-018, F-019. `DIFFÉRÉ` = F-021, F-037, F-038, F-039 |
| Écarts déclarés | tous justifiés | **réussi** — 11 écarts : F-009, F-010, F-011, F-012, F-014, **F-024**, F-026, F-028, **F-033**, F-035, F-036; tous de `P1` vers `MVP` |
| Cohérence baseline ↔ matrice | colonne « Baseline TASK-0011 » identique aux 39 classifications | **réussi** — 39 lignes comparées une à une; **0 divergence** |
| Vocabulaire d'états | seuls les huit états permis | **réussi** — états rencontrés dans les fichiers modifiés : `PROPOSED`, `APPROVED`, `IN_PROGRESS`, `BLOCKED`, `IMPLEMENTED`, `VERIFIED`, `DEFERRED`; 0 hors liste |
| Statut des décisions | `DEC-0007` à `DEC-0012` toutes `PROPOSED` | **réussi** — 6 sur 6 à `PROPOSED` |
| `DEC-0001` à `DEC-0006` | inchangées | **réussi** — 0 fichier modifié |
| Liens Markdown locaux | aucun cassé | **réussi** — 217 liens locaux vérifiés sur l'ensemble des fichiers Markdown du dépôt; **0 cassé** |
| Action unique | `NEXT_ACTION.md` contient exactement une action | **réussi** — 1 action, `ACTION-0019` |
| Tâches `IN_PROGRESS` | 0 à la clôture | **réussi** — 0 |
| Recherche de données sensibles | aucun chemin personnel, secret, jeton ni donnée réelle | **réussi** — 751 lignes ajoutées analysées; 0 chemin absolu local, 0 courriel, 0 jeton, 0 clé privée, 0 adresse IP |
| Portée du diff | aucun fichier hors de la section 5 de la fiche | **réussi** — 16 fichiers modifiés, 0 création, tous prévus; liste en M.3 |
| Code, dépendances, `graph/` | 0 fichier modifié | **réussi** — 0 fichier sous `src/`, `src-tauri/`, `tests/`, `public/`, `scripts/`, `.github/`, `graph/`; 0 fichier de dépendances; 0 fichier non suivi créé |
| `git diff --check` | réussi | **réussi** — code de retour 0, aucune sortie |

**Douze contrôles sur douze réussis.** Le contrôle « sources officielles »
n'est pas rejoué : cette révision n'ajoute aucune source primaire et ne modifie
la section « Preuves » d'aucune fiche. Le verdict partiel de la section L.4
sur `DEC-0012` **reste valable et inchangé**; l'orchestrateur l'a explicitement
accepté comme décision de périmètre produit.

**Faux positif écarté et déclaré.** Un premier passage de la recherche de
données sensibles a signalé quinze correspondances au motif `sk-`. Contrôle
manuel : toutes proviennent de la chaîne « **TASK**-0011 » lue sans
distinction de casse. Un second passage, motif resserré, retourne **0
correspondance**. Le contrôle est rapporté réussi sur la base du second
passage.

### M.3 Fichiers touchés — 16 modifiés, 0 créé

| Fichier | Correction |
|---|---|
| `docs/product/REQUIREMENTS_BASELINE.md` | 1 |
| `docs/product/FEATURE_MATRIX.md` | 1 |
| `docs/product/USER_JOURNEY.md` | 1 |
| `docs/decisions/DEC-0012-ai-architectural-boundary.md` | 1 (compte de fonctions `MVP` seulement) |
| `docs/decisions/DEC-0008-hierarchical-rendering.md` | 2 |
| `docs/performance/BASELINE_TARGETS.md` | 2 |
| `docs/decisions/DEC-0009-data-model-and-relations.md` | 3 |
| `docs/architecture/ARCHITECTURE_BASELINE.md` | 3 |
| `docs/decisions/DEC-0011-brain-isolation-and-migrations.md` | 4 |
| `docs/architecture/TEST_STRATEGY.md` | 2 et 4 |
| `docs/tasks/TASK-0011-functional-architecture-baseline.md` | section 17, historique d'état |
| `docs/ai/CURRENT_STATE.md`, `NEXT_ACTION.md`, `HANDOFF.md`, `VALIDATION.md`, `CHANGELOG_AI.md` | mémoire obligatoire |

**Non modifiés, volontairement :** `ROADMAP.md`, `FORMAT_MATRIX.md`,
`DEC-0007`, `DEC-0010`, `docs/decisions/README.md`, `DEC-0001` à `DEC-0006`,
et l'intégralité du code, des tests, des dépendances et de `graph/`.

### M.4 Ce que les corrections changent, en substance

| # | Avant | Après |
|---|---|---|
| 1 | 29 `MVP`, 6 `ULTÉRIEUR`, 9 écarts | **31 `MVP`, 4 `ULTÉRIEUR`, 11 écarts**; `F-024` et `F-033` au MVP, portée `MVP` de `F-033` écrite en cinq points |
| 2 | `DEC-0008` recommandait **D** (Canvas 2D, montée WebGL sur seuil) | **A** (HTML/SVG, virtualisation et niveaux de détail); Canvas 2D **sur banc d'essai seulement**; WebGL **différé**; plafond DOM/SVG initial proposé et marqué **non testé** |
| 3 | `DEC-0009` recommandait **I-D** (repli **automatique** sur l'heuristique) | **I-E** : identité Windows si disponible, repli **déterministe** par chemin relatif versionné sinon, heuristique réduite à une **suggestion** révocable; aucune heuristique ne préserve identité, vu/non-vu ni journal; déplacement inter-volume non prouvable = création + suppression. `R-C` et la provenance obligatoire **conservées** |
| 4 | `DEC-0011` recommandait **M-C** sans condition | `S-C` **conservée**; **M-C conditionnée** à un banc d'essai synthétique Windows en cinq points; **M-B demeure le repli** |

### M.5 Non testé — déclaration explicite

Cette révision est **entièrement documentaire**. Aucun test automatisé, build,
installation, test manuel d'interface, essai physique Windows ni mesure de
performance n'a été exécuté. Les tests existants du prototype n'ont **pas** été
rejoués.

Les **deux bancs d'essai introduits** par la révision — `B1`, bascule de
migration Windows; `B2`, plafond de blocs DOM/SVG — sont décrits en
[TEST_STRATEGY.md](../architecture/TEST_STRATEGY.md) §6.1 et **n'ont pas été
exécutés**. Le plafond de 3 000 blocs DOM/SVG proposé par `DEC-0008` est une
hypothèse à réfuter : **ce n'est pas une capacité déclarée du produit** et il
ne peut être cité comme telle.

### M.6 Confidentialité

Aucun accès à l'interface privée de référence : ni lecture, ni listage, ni
recherche, ni citation. Aucune donnée réelle. Aucun accès hors du dépôt
public — **aucune source externe n'a été consultée pendant cette révision**,
qui ne repose que sur les documents du dépôt et sur les corrections reçues.
Aucune écriture distante autre que le push autorisé vers
`origin/rebuild/v0.2-project-brain`.

### M.7 Conséquence

`TASK-0011` **reste `IMPLEMENTED`**, jamais `VERIFIED`. `DEC-0007` à
`DEC-0012` restent toutes `PROPOSED`. `DEC-0001` à `DEC-0006` sont inchangées.
Aucune tâche n'est `IN_PROGRESS`. La porte **P2 reste ouverte et non
franchie**. L'action unique suivante, `ACTION-0019`, appartient à Sébastien :
examen humain final et décision P2 après corrections.

---

## N. Franchissement de la porte P2 et proposition de TASK-0012 (2026-08-31)

**Nature :** intervention **entièrement documentaire**, sous le **GO explicite
de Sébastien** du 2026-08-31. Aucun code, aucun test, aucune dépendance,
aucune mesure. Objet : enregistrer l'approbation P2, faire passer `TASK-0011` à
`VERIFIED` et `DEC-0007` à `DEC-0012` à `APPROVED`, créer `TASK-0012` au
statut `PROPOSED`.

### N.1 Vérifications Git préalables — toutes réussies

| # | Contrôle | Attendu | Observé | Verdict |
|---|---|---|---|---|
| 1 | Racine | dépôt public FileTopo | racine du dépôt confirmée par `git rev-parse` | réussi |
| 2 | Branche | `rebuild/v0.2-project-brain` | `rebuild/v0.2-project-brain` | réussi |
| 3 | `HEAD` | `57e181f5100d69bfbb3dc2bfc749d9ebd96507d7` | identique | réussi |
| 4 | Arbre de travail | propre | `git status --porcelain` vide | réussi |
| 5 | SHA local = distant | égalité | `origin/rebuild/v0.2-project-brain` = `57e181f5100d69bfbb3dc2bfc749d9ebd96507d7` | réussi |
| 6 | `main` inchangée | `91bbe90f…` locale et distante | `main` = `origin/main` = `91bbe90f0f99026c28cd345784d4f579a0016db2` | réussi |
| 7 | Remote | `origin` = dépôt public FileTopo | `https://github.com/Vat-faire/FileTopo.git` | réussi |
| 8 | Tâche `IN_PROGRESS` | aucune | aucune | réussi |

Aucune vérification n'a échoué; l'exécution a donc pu commencer.

### N.2 Contrôles documentaires exécutés — résultats réels

| # | Contrôle | Méthode | Résultat |
|---|---|---|---|
| 1 | États autorisés | inspection des états dans les fiches touchées | Seuls `PROPOSED`, `APPROVED`, `VERIFIED`, `IMPLEMENTED` apparaissent, tous prévus par `AGENTS.md` |
| 2 | Une seule tâche `IN_PROGRESS` | inventaire des statuts de `docs/tasks/` | 0 tâche `IN_PROGRESS` |
| 3 | Six décisions à `APPROVED` | inspection des en-têtes `DEC-0007` à `DEC-0012` | 6/6 `APPROVED`, chacune avec décideur, date d'approbation et option retenue |
| 4 | Aucun reliquat « décision non prise » | recherche de « Aucune. », « soumis à Sébastien », « ne tranche pas », `PROPOSED` | 0 occurrence résiduelle dans les six fiches |
| 5 | `replaced_by` autorisés | inspection de `DEC-0003`, `DEC-0004`, `DEC-0005` | 3/3 renseignés vers `DEC-0007`, `DEC-0009`, `DEC-0008` |
| 6 | Contenu historique préservé | `git diff` sur `DEC-0001` à `DEC-0006` | seule la ligne `replaced_by` diffère, sur 3 fiches; `DEC-0001`, `DEC-0002`, `DEC-0006` intactes |
| 7 | Sept livrables à l'état approuvé | inspection des en-têtes `L1` à `L7` | 7/7, chacun portant la mention « non testé physiquement » |
| 8 | `NEXT_ACTION.md` | comptage des actions | exactement **une** action, `ACTION-0020` |
| 9 | Liens internes | résolution de chaque lien relatif créé ou modifié | toutes les cibles existent |
| 10 | Périmètre | `git status` restreint à `docs/` et `ROADMAP.md` | 0 fichier hors documentation |
| 11 | Code, tests, dépendances, `graph/` | `git status` | 0 fichier modifié sous `src/`, `src-tauri/`, `tests/`, `public/`, `scripts/`, `.github/`, `graph/`; verrous intacts |
| 12 | Données sensibles | recherche de motifs de secrets, de chemins locaux personnels et de données réelles | 0 correspondance |
| 13 | `git diff --check` | exécuté avant commit | aucun défaut signalé |
| 14 | Encodage et fins de ligne | inspection des fichiers écrits | UTF-8, fins de ligne LF, conformes à `.gitattributes` |

### N.3 Fichiers touchés

**Créé — 1 :**

| Fichier | Objet |
|---|---|
| `docs/tasks/TASK-0012-technical-risk-gates.md` | Fiche `PROPOSED` des cinq bancs d'essai `B0` à `B4` |

**Modifiés :**

| Fichier | Modification |
|---|---|
| `docs/tasks/TASK-0011-functional-architecture-baseline.md` | `VERIFIED`; table des portes; historique d'état; **section 18** nouvelle |
| `docs/decisions/DEC-0007-rebuild-tech-stack.md` | `APPROVED`; option **B** arrêtée; conséquences et `replaced_by` alignés |
| `docs/decisions/DEC-0008-hierarchical-rendering.md` | `APPROVED`; option **A** arrêtée, `B2` seule voie de réfutation |
| `docs/decisions/DEC-0009-data-model-and-relations.md` | `APPROVED`; **I-E** et **R-C** arrêtées; conséquence sur la dépendance Windows renvoyée à `B3` |
| `docs/decisions/DEC-0010-indexing-and-watching.md` | `APPROVED`; **W-B**/**W-C** et **U-B** arrêtées |
| `docs/decisions/DEC-0011-brain-isolation-and-migrations.md` | `APPROVED`; **S-C** arrêtée, **M-C** conditionnelle à `B1`, **M-B** repli obligatoire |
| `docs/decisions/DEC-0012-ai-architectural-boundary.md` | `APPROVED`; **F-D** arrêtée; exception humaine consignée |
| `docs/decisions/DEC-0003-tech-stack.md` | `replaced_by` → `DEC-0007`, **seule ligne modifiée** |
| `docs/decisions/DEC-0004-index-and-data-model.md` | `replaced_by` → `DEC-0009`, **seule ligne modifiée** |
| `docs/decisions/DEC-0005-rendering-and-relief.md` | `replaced_by` → `DEC-0008`, **seule ligne modifiée** |
| `docs/decisions/README.md` | Tableau des six décisions approuvées; rappel qu'`APPROVED` n'est pas une preuve; règle `replaced_by` |
| `docs/product/REQUIREMENTS_BASELINE.md`, `docs/product/USER_JOURNEY.md`, `docs/architecture/ARCHITECTURE_BASELINE.md`, `docs/architecture/FORMAT_MATRIX.md`, `docs/performance/BASELINE_TARGETS.md`, `docs/architecture/TEST_STRATEGY.md` | `L1` à `L6` portent l'état **APPROUVÉ** avec la mention « non testé physiquement »; §6.1 de `TEST_STRATEGY.md` renvoie à `TASK-0012` |
| `docs/ai/CURRENT_STATE.md`, `NEXT_ACTION.md`, `HANDOFF.md`, `VALIDATION.md`, `CHANGELOG_AI.md` | mémoire obligatoire |
| `ROADMAP.md` | phase 1 → `VERIFIED`; état réel du 2026-08-31 réécrit |

**Non modifiés, volontairement :** `DEC-0001`, `DEC-0002`, `DEC-0006`,
`docs/product/FEATURE_MATRIX.md`, `PROJECT_VISION.md`, et l'intégralité du
code, des tests, des dépendances, des verrous et de `graph/`.

### N.4 Non testé — déclaration explicite

Cette intervention est **entièrement documentaire**. Aucun test automatisé,
build, installation, essai manuel d'interface, essai physique Windows, rendu ni
mesure de performance n'a été exécuté. Les tests existants du prototype n'ont
**pas** été rejoués : leur état de réussite reste **inconnu**.

Les cinq bancs d'essai `B0` à `B4` spécifiés par `TASK-0012` **n'ont pas été
exécutés** : `TASK-0012` est `PROPOSED` et n'autorise rien.

**L'approbation P2 n'est pas une preuve.** Elle fixe une direction sur des
documents. `M-C` reste conditionnée à `B1`; le plafond de 3 000 blocs DOM/SVG
reste une hypothèse à réfuter par `B2` et **n'est pas une capacité déclarée du
produit**; l'identité Windows de `DEC-0009` reste non démontrée en Rust stable;
l'ambiguïté des attributs infonuagiques reste non résolue.

Les sept livrables sont **approuvés**, jamais **testés physiquement**. Cette
distinction est écrite dans chacun d'eux.

### N.5 Confidentialité

Aucun accès à l'interface privée de référence : ni lecture, ni listage, ni
recherche, ni citation. Aucune donnée réelle. Aucun chemin local personnel ni
secret écrit dans un fichier commité. Aucun accès hors du dépôt public —
**aucune source externe n'a été consultée pendant cette intervention**. Aucune
écriture distante autre que le push autorisé vers
`origin/rebuild/v0.2-project-brain`. Aucune fusion, PR, release, étiquette,
`force push` ni push vers `main`.

### N.6 Conséquence

`TASK-0011` est `VERIFIED`, attribué **par Sébastien**. `DEC-0007` à
`DEC-0012` sont `APPROVED`. `DEC-0001` à `DEC-0006` conservent leur contenu,
avec trois champs `replaced_by` renseignés. `TASK-0012` est `PROPOSED` et
**n'a pas été exécutée**. Aucune tâche n'est `IN_PROGRESS`. La porte **P2 est
franchie**; la porte **P3 est ouverte et non franchie**. L'action unique
suivante, `ACTION-0020`, appartient à Sébastien : examiner et approuver ou
corriger `TASK-0012` avant P3.

---

## O. Exécution de TASK-0012 — bancs d'essai de levée des risques techniques

- **Date :** 2026-08-31
- **Branche :** `spike/v0.2-technical-risk-gates`
- **Autorisation :** GO P3 explicite de Sébastien
- **Nature :** **première intervention exécutée et mesurée** depuis
  `TASK-0010`. Les sections précédentes étaient documentaires.

### O.1 Contrôles Git effectués avant toute modification

Les sept vérifications exigées ont été faites **avant** la première écriture :

| Contrôle | Attendu | Observé | Résultat |
|---|---|---|---|
| Racine Git | dépôt public FileTopo | conforme | OK |
| Branche | `rebuild/v0.2-project-brain` | conforme | OK |
| `HEAD` | `db8d3de0b20e7efbfe463a17c218cc14face39a8` | identique | OK |
| Arbre de travail | propre | vide, y compris non suivis | OK |
| Local contre `origin/rebuild/v0.2-project-brain` | égaux | `db8d3de0…` = `db8d3de0…` | OK |
| `main` locale et distante | `91bbe90f0f99026c28cd345784d4f579a0016db2` | identiques | OK |
| Tâche `IN_PROGRESS` | aucune | aucune | OK |

### O.2 Ce qui a été exécuté, et ce qui a été mesuré

| Banc | Exécuté ? | Nature de la preuve |
|---|---|---|
| `B0` | oui | 7 commandes, codes de retour, sorties, durées |
| `B1` | oui | 20 interruptions, `integrity_check`, listes de fichiers, 5 exécutions chronométrées par stratégie |
| `B2` | oui | 18 scénarios × 5 exécutions, images par seconde relevées dans le navigateur, recherche dichotomique de plafond |
| `B3` | **partiellement** | 5 points sur 6 observés; l'inter-volume est **bloqué**, pas omis |
| `B4` | oui | 7 pages Microsoft, simulation de 10 cas fabriqués |

### O.3 Intégrité du dépôt

- **Aucun fichier de production modifié.** `git diff` contre `db8d3de0…` sur
  `src/`, `src-tauri/`, `tests/`, `public/`, `scripts/`, `.github/` et `graph/`
  est **vide**.
- **Aucun verrou modifié.** Les quatre empreintes SHA-256 de `package.json`,
  `pnpm-lock.yaml`, `src-tauri/Cargo.toml` et `src-tauri/Cargo.lock` sont
  **identiques avant et après**. `--frozen-lockfile` et `--locked` auraient
  fait échouer toute commande qui aurait voulu les réécrire.
- **Aucune fiche `DEC` modifiée.**
- Les dépendances des spikes sont **confinées** : `spikes/b3-windows-identity/`
  porte son propre `Cargo.toml` et son propre `Cargo.lock`, avec une table
  `[workspace]` vide qui empêche tout rattachement à la racine.
- Tout ce que les spikes ont écrit sur le disque est resté sous
  `spikes/.work/`, ignoré par Git.

### O.4 Ce qui n'a PAS été fait, volontairement

- **L'échec de `B0` n'a pas été corrigé.** §7.1.4 et §14 l'interdisent sans une
  autorisation distincte. Le cache incrémental fautif est **toujours en place**.
- **Le comportement inter-volume de `B3` n'a pas été observé.** Le tester
  exigeait d'écrire hors du dépôt : §13.2 en fait une condition d'arrêt. La
  règle a été appliquée — arrêt et demande, sans contournement.
- **La question 3 de `B4` n'a pas été comblée.** Faute de source officielle,
  elle est **déclarée non résolue**. La déduction possible est consignée comme
  hypothèse, jamais comme réponse.
- Aucune fusion, PR, release, étiquette, `force push`, ni push vers `main` ou
  `rebuild/v0.2-project-brain`.

### O.5 Honnêteté des mesures

- **Une mesure a été jetée**, pas publiée : la première recherche de plafond de
  `B2`, menée fenêtre affichée, s'est bloquée parce que Chrome cesse d'émettre
  des images sur une fenêtre occultée. Le fait est consigné dans `PERF-0001`, et
  la mesure refaite sans affichage après vérification que les deux modes
  concordent.
- **Un défaut du banc d'essai a été corrigé et déclaré** : le contrôle clavier
  de `B2` comptait à tort un échec sur `SYN-WIDE`; c'était l'attente qui était
  fausse, pas le rendu.
- **Une erreur de mesure a été corrigée** : la première version de `B1` relevait
  0 octet d'espace transitoire, parce qu'un échantillonnage par minuterie ne
  peut pas se déclencher pendant du code synchrone. La mesure a été refaite aux
  frontières d'étapes.
- **Les cibles manquées sont publiées comme manquées** : les 14,08 ips de
  `SYN-WIDE`, la marge de 0,4 ms sur la latence de sélection au pire cas, et la
  panique du compilateur de `B0`.

### O.6 Confidentialité

Aucun accès à l'interface privée de référence, sous aucune forme. Aucune donnée
réelle : toutes les arborescences, bases et fixtures sont **synthétiques**, à
graine fixe. Aucun fichier de l'utilisateur lu, listé, ouvert, copié, déplacé,
migré ni hydraté. **Aucun espace réservé d'un fournisseur de synchronisation
n'a été touché.** Aucun chemin local personnel ni secret dans un fichier
commité — vérifié par recherche sur les fichiers indexés avant chaque commit.

Accès externes : **uniquement** sept pages `learn.microsoft.com` et deux fiches
`crates.io`, pour `B4` et pour l'inventaire de licence de `B3`. Aucune dépense.

### O.7 Conséquence

`TASK-0012` est **`IMPLEMENTED`**. Elle **n'est pas** `VERIFIED` : l'exécuteur
ne juge pas ses propres preuves. Aucune tâche n'est `IN_PROGRESS`. La porte
**P3 est franchie**; la porte **P4 est ouverte et non franchie**. L'action
unique suivante, `ACTION-0021`, appartient à Sébastien : contrôler les preuves
et attribuer `VERIFIED`, ou renvoyer la tâche.

---

## P. ACTION-0021 — contrôle indépendant de TASK-0012, et clôture (2026-08-31)

**Statut : `TASK-0012` → `VERIFIED`**, attribué par une instance **distincte**
de l'exécuteur, sous la délégation d'orchestration technique de Sébastien du
2026-08-31. Fiche complète :
[ACTION-0021-independent-control.md](../reviews/ACTION-0021-independent-control.md).
Arbitrages :
[DEC-0013](../decisions/DEC-0013-post-risk-gate-technical-arbitration.md).

### P.1 Ce qui a été vérifié, et par qui

| Élément | Qualificatif | Preuve |
|---|---|---|
| Les critères d'acceptation de §15 de `TASK-0012` sont remplis | **vérifié**, par le contrôle indépendant | section 2 d'`ACTION-0021` |
| `VERIFIED` n'a pas été auto-attribué | **vérifié** | l'exécuteur a livré `IMPLEMENTED`; l'attribution vient du contrôle |
| La question 3 de `B4` ne bloque pas `VERIFIED` | **vérifié** | §11.3 de `TASK-0012` prévoit la déclaration de non-résolution comme livrable conforme |
| Les neuf réserves `R1` à `R9` sont maintenues | **vérifié** | `VERIFIED` ne les lève pas; section 3 d'`ACTION-0021` |
| Le **texte intégral** de `R1` à `R9` est dans le dépôt | **inconnu — absent** | non transmis à l'exécuteur documentaire; lacune **déclarée**, jamais comblée par reformulation |

### P.2 Ce que l'étape de clôture a écrit

| Fichier | Nature |
|---|---|
| `docs/reviews/ACTION-0021-independent-control.md` | **créé** — enregistrement du contrôle |
| `docs/decisions/DEC-0013-post-risk-gate-technical-arbitration.md` | **créé** — six arbitrages A à F |
| `docs/tasks/TASK-0013-b2-bis-layout-and-render-budget.md` | **créé** — `PROPOSED`, **non exécutée** |
| `docs/tasks/TASK-0012-technical-risk-gates.md` | **modifié** — statut `VERIFIED`, note ajoutée en §16, entrée ajoutée en §19 |
| `docs/decisions/DEC-0008`, `DEC-0009`, `DEC-0011` | **modifiés** — amendement **ajouté en fin de fiche**, texte antérieur **intact** |
| `docs/decisions/README.md` | **modifié** — `DEC-0013` référencée |
| `AGENTS.md`, `CLAUDE.md` | **modifiés** — délégation d'orchestration technique, points d'arrêt réservés |
| `docs/ai/CURRENT_STATE.md`, `NEXT_ACTION.md`, `HANDOFF.md`, `VALIDATION.md`, `CHANGELOG_AI.md` | **modifiés** — mémoire obligatoire |

### P.3 Ce que l'étape de clôture n'a PAS fait

- **Aucun banc d'essai relancé**, aucune mesure refaite, **aucun chiffre
  nouveau**. Rien de ce qui est écrit ici n'est une mesure.
- **Aucun document de preuve modifié** : le rapport de `TASK-0012` et
  `PERF-0001` à `PERF-0003` sont **intacts**. La requalification du risque de
  `B4` est écrite dans `DEC-0013`, **pas** dans le rapport.
- **Aucun texte antérieur supprimé ni atténué** dans les fiches `DEC`.
- **Aucun code de production, test, dépendance, verrou ni `graph/`** touché.
- **Aucune suppression** dans `src-tauri/target/`.
- **Aucun accès hors dépôt**, aucune lecture, aucun listage, aucune écriture.
- **Aucune fusion, PR, release, étiquette, `force push`**, aucun push vers
  `main` ni `rebuild/v0.2-project-brain`. **Aucune dépense.**
- **`TASK-0013` n'a pas été exécutée** : `PROPOSED`, aucune branche, aucun
  spike, aucune mesure.

### P.4 Conséquence

`TASK-0012` est **`VERIFIED`**, réserves maintenues. Aucune tâche n'est
`IN_PROGRESS`. La porte **P4 reste ouverte et non franchie** : aucune ligne de
code de production. La porte suivante est **P3 bis** — approuver ou corriger
`TASK-0013`. L'action unique suivante est `ACTION-0022`.

---

## Q. TASK-0013 — B2 bis : calepins, budget de rendu, SYN-100K (2026-08-31)

**Statut : `TASK-0013` → `IMPLEMENTED`, jamais `VERIFIED`.** L'exécuteur ne
juge pas ses propres preuves. Journal complet :
[TASK-0013-b2-bis-results.md](../research/TASK-0013-b2-bis-results.md).
Mesures : [PERF-0004](../performance/PERF-0004-b2bis-layout-and-budget.md).

### Q.1 Ce qui a été exécuté, et ce qui a été seulement affirmé

| Élément | Qualificatif | Preuve |
|---|---|---|
| Les deux calepins ont été mesurés sur les mêmes données et la même trajectoire | **mesuré** | 24 scénarios, 5 exécutions, `rapport-b2bis-edge.json` |
| `SYN-100K` a été **réellement joué**, 100 000 nœuds | **mesuré** | phases B et C, `describe-shapes.mjs` confirme 100 000 nœuds obtenus |
| Les deux seuils de §3.6 sont tenus sur `SYN-100K` sous budget et `CAL-B` | **mesuré** | 120,48 ips, 8,2 ms p95, 5 exécutions |
| Le nombre de blocs simultanément visibles est **compté**, pas supposé | **mesuré** | `querySelectorAll` et longueur de l'ensemble visible, dans la page |
| Le budget ne franchit jamais son plancher de lisibilité | **mesuré** | 16 lignes, dont 8 sous contrainte inatteignable |
| Le plancher est **réellement atteint et tenu** sous contrainte | **mesuré** | niveau 13/13, seuil exactement 2 400 px², 8 lignes sur 8 |
| Le contrôleur de budget est déterministe à entrées égales | **mesuré** | **80 traces réelles** rejouées hors navigateur, 0 divergence |
| Le contrôleur n'écrit rien | **mesuré**, contrôle statique | 89 lignes de code examinées, commentaires retirés, aucun motif interdit |
| Aucune régression d'accessibilité | **mesuré** | 32 / 32 scénarios, ARIA et clavier, `document.activeElement` inclus |
| WebView2 n'est pas instrumentable sans hôte embarqueur | **mesuré** | 6 tentatives, codes de sortie et sorties d'erreur conservés |
| Le banc reproduit `B2` | **mesuré** | 13,32 ips contre 14,08 publiées par `B2`, même calepin, même moteur |
| L'écart entre WebView2 et les moteurs mesurés | **NON MESURÉ**, déclaré | §3.6 du journal |
| Le comportement dans une fenêtre visible | **NON MESURÉ** | tout est en `--headless=new` |
| Le seuil de lisibilité de 2 400 px² | **choisi, non mesuré** | aucun essai avec des personnes |
| La causalité géométrique de `F2` | **non établie** | les deux classements coïncident, ils n'ont pas pu diverger |
| Le comportement avec un lecteur d'écran réel | **NON TESTÉ** | conformité sur les attributs produits |

### Q.2 Verdicts, tels que calculés par script

| # | Verdict | Ce qui le fonde |
|---|---|---|
| `F1` | **CONFIRMÉE** | 119,05 ips et 14,1 ms p95 à 2 856 blocs, seuils tenus sur les 5 exécutions |
| `F2` | **CONFIRMÉE** | aspect médian 1,01 contre 3 987,79; classements coïncidents sur 3 formes |
| `F3` | **CONFIRMÉE** | `CAL-B` ne perd jamais; +20,2 % à +97,6 % |
| `F4` | **RÉFUTÉE** | 4 lignes sur 8 échouent : 26,60 ips en régime stable, convergence jusqu'à 6 065 ms |
| `F5` | **CONFIRMÉE** | plancher jamais franchi sur 16 lignes, atteint et tenu sous contrainte |
| `F6` | **CONFIRMÉE** | `SYN-100K` joué, deux seuils tenus, 3 461 blocs relevés |
| `F7` | **CONFIRMÉE** | 32 / 32 |
| `F8` | **RÉFUTÉE** | serveur CDP jamais joignable, §5.4 appliqué intégralement |

**Aucun critère n'a été modifié après la première mesure.** Le commit `85a4a05`
porte les huit critères, le plancher de lisibilité et le matériel de référence;
il précède toute mesure publiée. **La préséance est vérifiable dans
l'historique Git**, elle n'est pas seulement affirmée.

### Q.3 Une correction de protocole, déclarée et non dissimulée

La phase de contrainte du plancher a d'abord été jouée à **240 ips**, cible qui
s'est révélée **atteignable** en mode sans affichage sur un écran à 240 Hz :
elle n'exerçait donc pas le plancher. La contrainte publiée a été portée à
**1 000 ips**. **Ce changement porte sur le protocole de cette seule phase; les
huit critères sont inchangés.** Déclaré en §2.2 de `PERF-0004`.

### Q.4 Ce que l'étape n'a PAS fait

- **Aucun fichier de production, de test, de dépendance, de verrou ni de
  `graph/`** touché. `git diff` restreint à ces chemins : **vide**. Quatre
  empreintes SHA-256 **inchangées**.
- **Aucune dépendance installée**, ni dans le dépôt, ni sur le système.
- **Ni Canvas 2D ni WebGL** prototypés, mesurés ou comparés.
- **Aucune fiche `DEC` modifiée.** Aucune décision prise : `TASK-0013` §6.1
  l'interdit.
- **Aucune réserve levée.** `R1` à `R9` restent en vigueur; leur texte intégral
  a été **joint en annexe** d'`ACTION-0021`, ce qui comble une lacune sans lever
  aucune réserve.
- **Aucune correction de `B0`**, aucune suppression dans `src-tauri/target/`.
- **Aucun test inter-volume.**
- **Aucune donnée réelle**, aucun fichier ni dossier de l'utilisateur.
- **Aucune écriture hors du dépôt** : les profils de navigateur sont créés sous
  `spikes/.work/b2bis/`, à l'intérieur du dépôt — contrairement à `B2`, qui les
  plaçait dans le répertoire temporaire du système.
- **Aucune fusion, PR, release, étiquette, `force push`**, aucune réécriture
  d'historique, aucun push vers `main` ni vers `rebuild/v0.2-project-brain`.
- **Aucune dépense.**

### Q.5 Une précision de périmètre, déclarée

`TASK-0013` §5.4 **impose** de tenter WebView2 en premier, ce qui suppose de
**localiser puis lancer un exécutable installé sur le système** — ce que `B2`
avait déjà fait pour Chrome sous le GO P3.

Ce qui a été fait, exactement : lecture d'**une** valeur de version dans le
registre, contrôle d'existence de **trois** chemins d'exécutables, et
**lancement** de ces programmes. Ce qui n'a **pas** été fait : aucune lecture
de document, de dossier utilisateur, de donnée personnelle ou de contenu hors
du dépôt; **aucune écriture** hors du dépôt.

Cette précision est écrite pour qu'un contrôle indépendant la juge, plutôt que
de la découvrir.

### Q.6 Rappel de la réserve `R9`, toujours applicable

**Aucune dépense** n'a été engagée par cette étape. La précision de `R9` reste
valable : la limite de dépense rencontrée par `B4` avait **refusé** la dépense,
rien n'a été facturé.

### Q.7 Conséquence

`TASK-0013` est **`IMPLEMENTED`**. Aucune tâche n'est `IN_PROGRESS`. Les portes
**P3** et **P3 bis** sont franchies; la porte **P4 reste ouverte et non
franchie** : aucune ligne de code de production. L'action unique suivante est
**`ACTION-0023`** — le contrôle indépendant de `TASK-0013`, par une instance
**distincte de l'exécuteur**.

---

## R. ACTION-0023 — contrôle indépendant de TASK-0013, et clôture (2026-08-31)

**Nature :** étape documentaire, sous GO technique de l'orchestrateur.
**Aucune mesure rejouée, aucune preuve retouchée.**

### R.1 Ce qui a été contrôlé, et le résultat

Les preuves de `TASK-0013` — journal, `PERF-0004`, spike, préséance Git — ont
été contrôlées par l'**orchestrateur technique**, instance **distincte de
l'exécuteur**, **sur preuves**. Le contrôle est **accepté** : `TASK-0013` passe
de `IMPLEMENTED` à **`VERIFIED`**, **avec quatre réserves `V1` à `V4`**,
enregistrées intégralement dans
[`ACTION-0023`](../reviews/ACTION-0023-independent-control.md) §3.

### R.2 Sort des réserves d'`ACTION-0021`

**`R1` est LEVÉE** — son objet était l'absence de `SYN-100K`, qui a été
réellement joué. **`R8` reste EN VIGUEUR** et sort renforcée : aucune mesure
WebView2 de production. Les sept autres réserves sont **inchangées**.

### R.3 Décisions enregistrées

[`DEC-0014`](../decisions/DEC-0014-layout-baseline-and-budget-direction.md) :
`CAL-B` squarifié devient le calepin baseline; HTML/SVG accessible reste la
direction; le contrôleur de budget de `TASK-0013` **n'est pas adopté**; le
**principe** du budget auto-régulé est conservé; **aucune nouvelle tentative
WebView2** avant un véritable hôte Tauri.

### R.4 Clarification normative

`AGENTS.md` et `CLAUDE.md` reçoivent la règle de **lecture minimale, ciblée et
non récursive** de métadonnées d'environnement et d'outillage, qui corrige la
contradiction relevée par `V4`. Elle **n'autorise aucun accès à du contenu
utilisateur** et **n'ajoute aucune écriture hors dépôt**. Les points d'arrêt
réservés à Sébastien sont inchangés.

---

## S. TASK-0014 — B2 ter : correction minimale du contrôleur de budget (2026-08-31)

### S.1 Préséance vérifiable

Le commit **`4a5520b`** porte les **neuf critères `G1` à `G9`**, la
**configuration complète du contrôleur**, le **matériel de référence** et le
**protocole**, y compris les amplitudes de trajectoire et la contrainte de la
phase 2 **déclarée inatteignable avant mesure**. Il **précède toute mesure**.

Après la campagne, les empreintes SHA-256 de `budget2.mjs`, `map3.html` et
`run-b2ter.mjs` sont **identiques** à celles du commit `4a5520b`.

### S.2 Verdicts

**Deux réfutations** — `G1`, la cible; `G2`, la convergence. **Un critère
bloqué** — `G3`, dont la mesure s'est révélée **nulle par construction**. Six
confirmations — `G4`, `G5`, `G6`, `G7`, `G8`, `G9`.

**La correction minimale n'est pas validée.** Elle corrige les deux causes
mesurées de `F4`, et c'est vérifiable, mais ne tient ni la cible ni la
convergence dès que la charge varie réellement.

### S.3 Deux défauts de protocole, publiés sans atténuation

`D1` — le « régime stable » peut ne contenir qu'une poignée d'images, parfois
aucune. `D2` — la fenêtre stable de `G3` est **vide par construction**.

Conformément à §6.1 de `TASK-0014` : **le protocole n'a pas été changé**,
**aucune mesure n'a été rejouée**, aucune cible n'a été déplacée, et le critère
concerné est publié **bloqué**, jamais confirmé.

### S.4 Ce qui a été touché après la première mesure — déclaration

1. **`verdicts2.mjs`, ligne de verdict de `G3`** : « CONFIRMÉE » remplacée par
   **« BLOQUÉE »**. Ce geste **retire une confirmation et n'en ajoute aucune**.
   Aucun seuil, aucune constante, aucun paramètre n'a bougé.
2. **`analyse-defauts.mjs`**, fichier nouveau, qui **ne mesure rien** : il
   relit les mesures déjà collectées pour publier les défauts et des lectures
   supplémentaires, toutes étiquetées comme n'établissant aucun verdict.

**C'est au contrôle indépendant de juger si ces deux gestes respectent `G9`.**
L'exécuteur les déclare et ne se donne pas quitus.

### S.5 Périmètre

- **Aucune donnée réelle**, aucun fichier de l'utilisateur.
- **Aucune écriture hors du dépôt** : tout est allé sous `spikes/.work/b2ter/`,
  ignoré par Git, profils de navigateur compris.
- **Lecture d'environnement** : métadonnées matérielles du poste, présence,
  chemin et version d'Edge et de Chrome. Lecture **minimale, ciblée et non
  récursive**, autorisée par `TASK-0014` §3 au titre de la section « Lecture
  minimale de l'environnement technique » d'`AGENTS.md`. **Aucun dossier
  personnel, aucun document, aucun contenu utilisateur.**
- **Aucune tentative WebView2**, aucun Canvas 2D, aucun WebGL.
- **Aucune dépendance installée**, ni dans le dépôt, ni sur le système.
- **Aucune dépense.** La précision de `R9` reste valable.
- **Aucune preuve de `TASK-0013` retouchée**, aucune fiche `DEC` existante
  modifiée, aucun fichier de production, de test, de verrou ni de `graph/`
  touché.
- **Aucune fusion, PR, release, étiquette, `force push`**, aucun push vers
  `main`.

### S.6 Conséquence

`TASK-0014` est **`IMPLEMENTED`**, jamais auto-déclarée `VERIFIED`. Aucune
tâche n'est `IN_PROGRESS`. La porte **P4 reste ouverte et non franchie**.
L'action unique suivante est **`ACTION-0024`** — le contrôle indépendant de
`TASK-0014`, par une instance **distincte de l'exécuteur**.

## T. ACTION-0024 — contrôle indépendant de TASK-0014, et clôture (2026-08-31)

**Contrôleur :** orchestrateur technique, instance **distincte de l'exécuteur**
de `B2 ter`, sous la délégation de Sébastien du 2026-08-31.

**Nature :** contrôle **sur preuves déjà publiées**. **Aucune mesure n'a été
rejouée, aucune preuve nouvelle n'a été produite**, aucun fichier de spike n'a
été retouché.

**Résultat :** contrôle **accepté**. `TASK-0014` passe de `IMPLEMENTED` à
**`VERIFIED`**, avec **quatre réserves `W1` à `W4`**.

### T.1 Ce qui a été jugé, point par point

| Point | Verdict du contrôle |
|---|---|
| `G1` et `G2` réfutées, publiées sans atténuation | **Accepté.** Publiées telles quelles partout, avec la **pire exécution** citée. Les trois lectures supplémentaires sont étiquetées comme n'établissant aucun verdict |
| **Correction minimale du budget** | **REJETÉE.** Éprouvée sur ses propres critères écrits avant mesure, elle en manque les deux principaux |
| `G3` bloqué | **Accepté.** Mesure **vacueuse par construction** : la fenêtre stable commence au dernier changement de niveau. **Aucune stabilité n'est prouvée** |
| `G9` | **Accepté.** Aucun critère, seuil, configuration, contrôleur, page ni pilote n'a changé après mesure. Le geste sur `G3` **retire une fausse confirmation et n'en ajoute aucune** |
| `G8` | **Accepté avec réserve `W1`** : la grandeur est fragile, mais la mesure possède des échantillons — 11 à 384 images sur Edge, 14 à 137 sur Chrome — et est corroborée par la médiane sur toute la période |
| Contrôle ponctuel `CAL-A` / `SYN-WIDE` | **Ne valide rien** — réserve `W3`. Il tient sur Edge, pas sur Chrome |

### T.2 Les quatre réserves du contrôle

`W1` — `ips régime stable` reste fragile : toute citation de `G8` porte le
nombre d'échantillons et la corroboration sur toute la période.

`W2` — **aucune stabilité n'est prouvée.** Interdit d'écrire que le contrôleur
corrigé est stable ou qu'il n'oscille pas.

`W3` — le contrôle ponctuel ne valide rien, et rien n'en est déductible pour
WebView2.

`W4` — aucune marge alternative n'a été mesurée : ni hystérésis, ni marge
intermédiaire, ni fenêtre désalignée du pas de synchronisation verticale.

### T.3 Sort des réserves antérieures

`V1` à `V4` d'`ACTION-0023` : **inchangées, en vigueur**. `R1` : **levée**
depuis `ACTION-0023`. `R8` : **en vigueur, renforcée**. `R2` à `R7` et `R9` :
inchangées. **Aucune réserve n'est levée par cette clôture.**

### T.4 Conséquence

Le **budget adaptatif reste une piste** mais **cesse d'être un prérequis à
`P4`** : il sera réévalué dans le véritable hôte Tauri/WebView2. **Aucun
contrôleur de `TASK-0013` ni de `TASK-0014` ne devient du code de production.**
La porte **`P4` reste ouverte et non franchie**.

## U. TASK-0015 — Réalignement produit sur la référence fonctionnelle (2026-08-31)

**Nature du livrable :** **strictement documentaire. Aucune exécution, aucune
mesure, aucun test, aucune dépendance, aucune ligne de code.** Les contrôles
ci-dessous sont des **contrôles de contenu et de périmètre**, vérifiables par
lecture et par `git diff`, **jamais des résultats d'exécution**.

**Autorisations :** **instruction produit autoritative de Sébastien** pour la
direction — point **non délégué**, `AGENTS.md` réservant les changements
importants de portée produit —; **GO technique de l'orchestrateur** pour
l'exécution documentaire et le push vers la branche de travail publiée.

### U.1 Ce que l'instruction produit établit

1. **CarteTopo est la référence fonctionnelle.**
2. **L'ancienne version publique de FileTopo est un prototype et un audit
   technique**, pas la référence produit.
3. **FileTopo doit généraliser le bon fonctionnement de CarteTopo** à
   n'importe quelle arborescence.
4. **L'interface visuelle est entièrement libre**, sans copie pixel pour pixel;
   une nouvelle UX est encouragée.
5. **Aucune amélioration visuelle ne supprime la parité fonctionnelle.**

### U.2 Livrables produits

| # | Livrable | État |
|---|---|---|
| `L1` | `docs/product/CARTETOPO_FUNCTIONAL_PARITY.md` — 22 exigences `P-01` à `P-22`, 3 invariants, règle visuelle, règle des relations, 5 manques déclarés | **produit** |
| `L2` | Reclassement de `F-013`, `F-017`, `F-018`, `F-019` d'`ULTÉRIEUR` à `MVP`, dans `REQUIREMENTS_BASELINE.md` et `FEATURE_MATRIX.md` | **produit** |
| `L3` | `DEC-0015`, qui supplante `DEC-0014` sur **deux points seulement** | **produit** |
| `L4` | Feuille de route `A` à `D` dans `ROADMAP.md` | **produit** |
| `L5` | `TASK-0016`, première tâche `P4`, **`PROPOSED`, non exécutée** | **produit** |
| `L6` | Mémoire obligatoire à jour | **produit** |

### U.3 Contrôles de périmètre

- **`git diff` sur `src/`, `src-tauri/`, `tests/`, `public/`, `scripts/`,
  `.github/`, `spikes/` et `graph/` : sortie vide.** Aucun fichier de
  production, de test, de spike ni de graphe n'a changé.
- **`DEC-0014` n'a pas été réécrite** : un **renvoi** est ajouté en tête de
  fiche; **aucun de ses paragraphes existants n'a été modifié**.
- **La classification d'origine de `TASK-0011` est conservée et visible** pour
  les quatre fonctions reclassées, ainsi que la répartition d'origine.
- **La matrice reste à 39 lignes.** Aucune fonction n'a été inventée, même pour
  combler le manque `M-1`.
- **`F-021`, `F-037`, `F-038`, `F-039` restent `DIFFÉRÉ`.** `DEC-0012` est
  inchangée.
- **Aucune donnée, aucun nom privé, aucun chemin privé, aucune métadonnée et
  aucun code de la référence privée** n'apparaît dans le contrat de parité ni
  ailleurs. Toutes les exigences sont **génériques** et destinées à des
  **fixtures synthétiques**. Le nom « CarteTopo » est employé parce que
  **Sébastien l'a lui-même nommé** et a nommé le fichier.
- **Aucune lecture, aucun listage et aucune écriture hors du dépôt.**
- **Aucune dépense**, aucune donnée réelle, aucune publication externe.
- **Aucune fusion, PR, release, étiquette, `force push`**, aucune réécriture
  d'historique, aucun push vers `main`.
- **Aucune tentative WebView2**, aucun Canvas 2D, aucun WebGL.
- **`PROJECT_VISION.md` inchangé.**

### U.4 Ce qui n'est pas prouvé, et doit être dit

- **Aucun des 22 critères de parité n'a été exécuté.** Ce sont des **cibles à
  falsifier**, pas des résultats.
- **Aucune estimation d'effort** n'accompagne le reclassement, qui **augmente**
  la charge du MVP de quatre fonctions dont un **modèle de provenance
  entièrement à écrire**.
- **Le manque `M-1` est déclaré, pas comblé** : la persistance des préférences
  n'a pas de fonction propre dans la matrice.
- **`R8` reste en vigueur** : aucune mesure de production n'existe, et aucun
  chiffre de spike ne borne ce que FileTopo rendra.

### U.5 Conséquence

`TASK-0015` est **`IMPLEMENTED`**, jamais auto-déclarée `VERIFIED`. Aucune
tâche n'est `IN_PROGRESS`. La porte **`P4` reste ouverte et non franchie** et
**`TASK-0016` n'a pas été exécutée**. L'action unique suivante est
**`ACTION-0025`** — contrôle indépendant du réalignement, **puis décision de
franchir `P4`**.

---

## ACTION-0025 — Contrôle indépendant de TASK-0015 et franchissement de P4 (2026-08-31)

### V.1 Nature de cette étape

**Documentaire.** Aucune mesure, aucune exécution, aucun test, aucune
dépendance. Le contrôle **ne rejoue rien** : il lit les livrables de
`TASK-0015` et les documents qu'ils touchent.

### V.2 Contrôles effectués, et leur résultat

| # | Contrôle | Résultat |
|---|---|---|
| `C1` | Les 22 exigences couvrent les domaines nommés par l'instruction produit | **conforme** |
| `C2` | Chaque critère d'acceptation est falsifiable sur fixtures synthétiques, non déclaratif | **conforme**, avec la limite déclarée que certaines volumétries (`P-08` 100 000 nœuds, `P-18` 10 000 événements) dépassent la première tranche |
| `C3` | §3 rend impossible la **disparition silencieuse** d'une fonction par refonte visuelle | **conforme** — cinq voies fermées, règle de conflit explicite, abandon par fiche `DEC` |
| `C4` | §5 interdit toute relation inventée, exige provenance **visible à l'écran** et stockage **hors de l'arborescence analysée** | **conforme sur le fond**, **contradiction interne trouvée** — réserve `X1` |
| `C5` | Reclassement : quatre remontées justifiées, classification d'origine **conservée et visible**, **rien** n'est descendu, `F-021`/`F-037`/`F-038`/`F-039` restent `DIFFÉRÉ` | **conforme** — matrice à 39 lignes, `MVP` 35 / `ULTÉRIEUR` 0 / `DIFFÉRÉ` 4 |
| `C6` | `DEC-0015` supplante `DEC-0014` sur **deux points seulement**; `DEC-0014` **intacte**, simple renvoi; `V1`, `V2`, `R8` conservées | **conforme** |
| `C7` | `TASK-0016` est une **tranche verticale**, borne de charge exigée **avant** exécution, préalables bloquants avant `P4` | **conforme** |
| `C8` | `M-1` **déclaré** plutôt que comblé par une fonction inventée | **conforme**, avec **échéance ajoutée** — `DEC-0016` D |

### V.3 Réserve X1, et sa correction

**Défaut constaté.** `CARTETOPO_FUNCTIONAL_PARITY.md` §4 (`P-04`) énumérait
`déterministe`, `approuvée`, `suggérée` comme provenances d'une relation, et
§5.1.2 parlait des « trois provenances », **alors que §5.1.3 établit qu'une
suggestion n'est pas une relation**.

**Correction appliquée**, dans le même geste, **sans changement de portée** :

- **relation établie** ⇒ provenance `déterministe` **ou** `approuvée`, sans
  troisième valeur;
- **suggestion** ⇒ **objet et état distincts**, **affichables**, **jamais**
  comptés comme relation avant approbation, **jamais** présentés comme
  relation établie;
- l'approbation **transforme** la suggestion en relation `approuvée`.

**Trois emplacements alignés**, et **seulement trois** : §4 `P-04`, §5.1.2,
§5.1.3. **§5.2 n'a pas été touchée** : elle était déjà juste.

### V.4 Contrôles de périmètre

- **`git diff` sur `src/`, `src-tauri/`, `tests/`, `public/`, `scripts/`,
  `.github/`, `spikes/` et `graph/` : sortie vide** pour cette étape
  documentaire. Le code de production commence **après**, sur une **branche
  dédiée**.
- **Aucun paragraphe de `DEC-0014` modifié.** **Aucune preuve de `TASK-0012` à
  `TASK-0014` retouchée.** **Aucun historique réécrit.**
- **`DEC-0015` inchangée**, confirmée dans tous ses points.
- **`PROJECT_VISION.md` inchangé.**
- **Aucune lecture, aucun listage et aucune écriture hors du dépôt. Aucune
  donnée réelle. Aucune dépense. Aucune publication externe.**
- **Aucune fusion, PR, release, étiquette, `force push`.**

### V.5 Ce qui n'est pas prouvé, et doit être dit

- **Aucun des 22 critères de parité n'a été exécuté.** Le contrôle porte sur
  la **qualité du livrable documentaire**, pas sur la **faisabilité** du
  contrat.
- **Aucune mesure de production n'existe.** `R8` en vigueur; sa levée
  appartient à l'**étape C**.
- **Aucune réserve technique n'est levée** : `V1` à `V4`, `W1` à `W4`, `R2` à
  `R9`.
- **`M-1` est daté, pas comblé.** La question 3 de `B4` reste ouverte,
  l'inter-volume de `B3` reste NON TESTÉ, l'échec de `B0` n'est pas corrigé.

### V.6 Conséquence

`TASK-0015` est **`VERIFIED`**. La porte **`P4` est FRANCHIE** — `DEC-0016`.
Elle autorise **`TASK-0016`, et rien d'autre**. L'action unique suivante est
**figer puis exécuter `TASK-0016`**, sur `build/v0.2-p4-vertical-slice`.

---

## TASK-0016 — Première tranche verticale de code de production (2026-08-31)

### W.1 Nature de cette étape

**Code de production, exécuté et mesuré.** Première tâche du projet à écrire du
code de production, à le faire tourner dans un **véritable hôte
Tauri/WebView2** et à en relever des mesures.

**Préséance du gel :** les critères `H1` à `H11`, les quatre fixtures et les
bornes `B-1` à `B-4` ont été **écrits et commités avant la première ligne de
code** — commit `6edd5bd`, code en `130b670`. **Aucun critère n'a été retouché
après le premier résultat.**

### W.2 Contrôles exécutés

Chaque critère est rejoué **deux fois** : par les tests automatisés en
répertoires temporaires, et **à travers les vraies commandes dans l'hôte réel**,
ce second passage étant écrit dans
[`TASK-0016-H1-H7-verification.json`](../performance/runs/TASK-0016-H1-H7-verification.json).

| # | Critère | Résultat |
|---|---|---|
| `H1` | Ensembles plan / disque / index égaux, 4 fixtures | **TENU** — 0 manquant, 0 inattendu |
| `H2` | Aucune dimension nulle, aucun chevauchement, inclusion = hiérarchie | **TENU** — 0 violation |
| `H3` | Parent et enfants directs = index, pour chaque nœud | **TENU** — 0 écart |
| `H4` | Souris **et** clavier; 10 000 opérations sans état hors bornes; réinitialisation paramètre par paramètre | **TENU** |
| `H5` | Détails = index, diagnostics d'accès **affichés** | **TENU** — 0 écart |
| `H6` | Empreinte source identique avant/après — noms, structure, tailles, **contenus**, horodatages | **TENU** — 4/4, aucun fichier de FileTopo dans la racine |
| `H7` | Index supprimé puis reconstruit, équivalent; non reconstructible **énuméré** | **TENU** — `built_unix_ms`, dont un test prouve qu'il **diffère réellement** |
| `H8` | Démarre et rend dans WebView2, moteur relevé | **TENU** — **WebView2 `151.0.4129.107`**, Tauri `2.11.5`, SQLite `3.53.2` |
| `H9` | Temps d'image et latence, **5 exécutions par fixture**, médiane et min–max | **TENU** — 750 images et 60 sélections par fixture |
| `H10` | Calepinage payé une fois, mesuré séparément | **TENU** — 1 invocation, **0** pendant la navigation, < 1 % de la construction |
| `H11` | Bornes déclarées d'avance et respectées | **TENU** |

**Tests automatisés :** 40 tests Rust, 59 tests TypeScript, tous verts.

### W.3 Mesures, publiées sans sélection

| Fixture | Nœuds | Image médiane | Image min–max | Sélection médiane | Sélection min–max |
|---|---:|---:|---:|---:|---:|
| `quasi-empty` | 12 | 4,20 ms **(butée)** | 2,80 – 6,30 | 8,30 ms | 8,20 – 8,60 |
| `deep` | 157 | 4,20 ms **(butée)** | 2,20 – 7,10 | 8,30 ms | 8,00 – 8,80 |
| `wide` | 2 207 | **16,70 ms** | 4,10 – 21,00 | 34,65 ms | 32,40 – 60,30 |
| `mixed` | 2 420 | **20,20 ms** | 3,70 – 28,90 | 38,20 ms | 35,80 – 62,50 |

**Toutes les exécutions comptent**, et les cinq médianes par fixture sont
publiées dans le journal. **`H9` n'imposait aucune cible d'images par
seconde :** il n'y a ni cible atteinte, ni cible manquée.

### W.4 Trois défauts de protocole, trouvés et publiés

Trouvés en essayant de mesurer sans surveillance. **Chacun aurait produit un
chiffre flatteur**, et chacun est corrigé **avant** la campagne publiée.

| # | Défaut | Ce qu'il aurait produit |
|---|---|---|
| `E1` | Fenêtre occultée : Chromium suspend `requestAnimationFrame` | Attente indéfinie, **indiscernable d'une course lente** |
| `E2` | Première fixture mesurée dans une vue de **1 × 1 pixel** | Images **rapides parce que rien n'était affiché** |
| `E3` | Tableau des résultats remettant la page en page pendant la course | Chaque fixture mesurée à une **taille de carte différente** |

**Un quatrième point, de rendu :** la première version reprojetait chaque nœud à
chaque image; elle a été remplacée par un **groupe unique transformé**.
**Aucune mesure n'existait avant ce remplacement** — il n'y avait pas de
résultat à améliorer.

### W.5 Contrôles de périmètre

- **Aucun code de spike repris**; **aucun contrôleur de budget** de `TASK-0013`
  ni de `TASK-0014` — `DEC-0015` F.
- **Ni Canvas 2D, ni WebGL.** Rendu **HTML/SVG accessible**.
- **Aucune dépendance nouvelle** : `rusqlite`, `tauri`, `serde`, `thiserror`,
  `uuid`, `tempfile` étaient déjà au manifeste.
- **Aucune relation transversale, aucune recherche, aucun filtre, aucune
  légende, aucun watcher, aucun journal, aucun état vu/non vu, aucun
  multi-cerveaux.**
- **Aucun sélecteur de dossier utilisateur.** Les quatre fixtures sont
  **engendrées** depuis des graines fixes.
- **Aucune donnée réelle. Aucun dossier personnel lu, listé ou écrit.**
- **Index et état hors de la racine analysée** — `I-2`, vérifié sur disque.
- **Aucun chemin local personnel dans le dépôt**, artefacts compris : le bac à
  sable est **nommé** et jamais épelé, et un test verrouille cette propriété.
  Un défaut inverse a été trouvé et corrigé **avant** tout commit d'artefact.
- **Rien n'a été supprimé, nettoyé ni renommé dans `src-tauri/target/`** —
  `DEC-0013` E.
- **`src/App.tsx` et ses douze tests sont intacts.**
- **Aucune dépense, aucune publication externe, aucune fusion, PR, release,
  étiquette, `force push`**, aucune réécriture d'historique.

### W.6 Ce qui n'est pas prouvé, et doit être dit

- **`R8` n'est pas levée** : une machine, écran **240 Hz**, **binaire de
  développement non optimisé**, fixtures **≤ 2 420 nœuds**. **Étape C.**
- **Les valeurs de 4,20 ms sont butées** par la synchronisation verticale à
  4,1667 ms. **Jamais citables comme performance.**
- **Les temps de scan, calepinage et index viennent d'un binaire `dev`.**
  Leur **rapport** est instructif; leurs valeurs absolues ne sont pas une
  performance du produit.
- **`P-21` n'est pas satisfaite** : français seulement, aucun audit WCAG
  complet, **aucun lecteur d'écran réel**.
- **Seize exigences de parité ne sont pas commencées**; `P-12` et `P-06` sont
  **partielles** et déclarées telles.
- **L'aire minimale de bloc de 2 400 unités² est un choix, pas une mesure.**
- **Aucun budget adaptatif** n'est employé, adopté, abandonné ni validé.
  Réserve `W2` : **aucune stabilité n'est prouvée**.
- **`B0` s'est reproduit deux fois et n'est pas corrigé.**

### W.7 État déclaré de chaque exigence touchée

Conformément à §8.2 du contrat de parité.

| Exigence | État |
|---|---|
| `P-01`, `P-02`, `P-03`, `P-11`, `P-22` | **satisfaites sur ce périmètre**, chacune avec sa preuve |
| `P-12` | **partielle** — contenu et diagnostics prouvés; masquage et survie au redémarrage hors périmètre |
| `P-06` | **partielle**, déclarée telle d'avance — sélection et accentuation **hiérarchique** seulement |
| Les seize autres | **non commencées** |

**Aucune exigence n'est déclarée satisfaite sans preuve.**

### W.8 Conséquence

`TASK-0016` est **`IMPLEMENTED`**, jamais auto-déclarée `VERIFIED`. Aucune
tâche n'est `IN_PROGRESS`. L'action unique suivante est **`ACTION-0026`** — le
**contrôle indépendant de la première tranche de code de production**.

---

## ACTION-0026 — Contrôle indépendant de TASK-0016 : X2, et correction (2026-08-31)

### X.1 Verdict du contrôle

**`CHANGES_REQUIRED`.** `H1` à `H11` et les preuves publiées sont acceptables
**sous réserve de `X2`**, bloquante. **`TASK-0016` reste `IMPLEMENTED`.**

### X.2 Réserve X2

Le runtime du produit courant enregistrait encore huit commandes héritées de la
0.1 — dont `choose_collection`, un **sélecteur de dossier réel** — et
initialisait `tauri_plugin_dialog`, contre `TASK-0016` §12.4.

**Ce que la clôture précédente avait mal contrôlé :** elle avait jugé sur ce
que l'interface **appelle**, pas sur ce que le runtime **expose**. Une commande
enregistrée est invocable depuis la WebView, qu'un bouton la propose ou non.

### X.3 Correction, et preuve qu'elle tient

| Contrôle | Résultat |
|---|---|
| Commandes exposées par le runtime | **9**, toutes `map_*` |
| Les 8 commandes héritées, `health`, `demo_snapshot`, `scan_synthetic_fixture` | **aucune enregistrée** |
| `tauri_plugin_dialog::init()` dans `run()` | **absent** |
| `.manage(IndexJobs)` | **retiré** |
| Appels du frontend actif | **9**, toutes `map_*` |
| `src/main.tsx` | monte **`MapApp` seul** |
| Code historique | **conservé**, aucune fonction supprimée, `src/App.tsx` et ses 12 tests intacts |
| Tests-gardes | **2 ajoutés**, et **éprouvés** : réintroduire `choose_collection` les fait échouer tous les deux |

### X.4 Validation rejouée sur le binaire corrigé

| Contrôle | Résultat |
|---|---|
| Tests Rust | **42 passés** |
| Tests TypeScript | **59 passés**, dont les 12 du prototype |
| Avertissements, configuration livrée | **0** |
| `H1`, `H2`, `H3`, `H5`, `H6`, `H7`, `H10`, `H11` | **tenus**, 4 fixtures, dans l'hôte réel |
| `H8` | **tenu** — WebView2 `151.0.4129.107` |
| `H9` | **rejoué complet**, protocole gelé inchangé |
| Chemins locaux personnels dans les artefacts | **aucun** |
| `B0` | **troisième reproduction**, non corrigé, rien supprimé de `target/` |

### X.5 H9 moins bon, publié tel quel

`wide` **17,80 ms** contre 16,70; `mixed` **21,35 ms** contre 20,20. **Aucune
explication a posteriori.** L'écart est du même ordre que la dispersion entre
exécutions — `wide` s'étale de 17,40 à 18,50 ms — et **rien dans les mesures ne
permet de trancher**.

### X.6 Ce qui n'a pas changé

**Aucun critère `H1` à `H11` modifié. Aucune borne `B-1` à `B-4` retouchée.
Aucune optimisation de performance. Aucune dépendance nouvelle. Aucune donnée
réelle. Aucune fusion, PR, release, étiquette, `force push`, ni réécriture
d'historique.** Aucune réserve levée; `R8` reste entière.

### X.7 Conséquence

**`TASK-0016` reste `IMPLEMENTED`.** La correction vient de l'exécuteur : elle
appelle un **re-contrôle indépendant**, qui est l'action unique suivante.
