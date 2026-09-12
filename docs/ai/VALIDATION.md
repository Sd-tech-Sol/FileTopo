# VALIDATION.md — État de vérification

**Dernière mise à jour :** 2026-09-12
**Dernière livraison exécutée :** TASK-0036, section **BO** (passe corrective D4/D5, `ACTION-0058`), `IMPLEMENTED`, **en attente de vérification indépendante**. Section BN (passe corrective D1/D2/D3, `ACTION-0057`) acceptée sans régression par ce recontrôle. TASK-0035, section BL, est `VERIFIED` par `ACTION-0056`. TASK-0034, section **BH** (recherche bornée et « Ouvrir dans l'Explorateur »), `IMPLEMENTED`, **en attente de vérification indépendante**. TASK-0033, sections BE/BF, est `VERIFIED` dans sa portée par le verdict indépendant enregistré dans `ACTION-0051`, section BG.
**Dernière tâche évaluée indépendamment :** TASK-0033 — `VERIFIED` le
2026-09-10 par le verdict indépendant enregistré dans `ACTION-0051`, section
BG, dans sa portée. TASK-0032 — `VERIFIED` le 2026-09-10 par le verdict
indépendant enregistré dans `ACTION-0049`, section BD, dans sa portée.
TASK-0031 — `VERIFIED` le 2026-09-10
par le verdict indépendant enregistré dans `ACTION-0048`, dans sa portée
synthétique V1. TASK-0030 — `VERIFIED` le 2026-09-09 par le
verdict indépendant enregistré dans `ACTION-0047`, section AZ, **avec six
réserves `R-T30-1` à `R-T30-6` maintenues**. TASK-0029 — `VERIFIED` le
2026-09-09 par le verdict indépendant enregistré dans `ACTION-0046`, section AX.
TASK-0028 — `VERIFIED` le 2026-09-07 par le verdict indépendant enregistré dans
`ACTION-0045`, section AV.
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

---

## ACTION-0026 — Clôture, et installation du workflow de session (2026-08-31)

### Y.1 Clôture enregistrée

Verdict de l'**orchestrateur technique indépendant**, après re-contrôle direct
de GitHub sur le commit `a6cf092b7f2d0204de5f788e40f014b41c69ff11` :
**`X2` `CLOSED`, `ACTION-0026` `CLOSED`, `TASK-0016` `VERIFIED`.**
**Claude n'a pas rendu ce verdict; il l'a enregistré.**

Inchangés par cette clôture : **`R8` entière**, **`B0` non corrigé**, **aucune
conclusion nouvelle sur le budget adaptatif**, **états de parité strictement
limités au périmètre déjà déclaré**.

### Y.2 Workflow de session installé

| Contrôle | Résultat |
|---|---|
| Protocoles partagés | **exactement 3**, sous `.orchestrator/protocols/` |
| Skills Claude | **exactement 3**, sous `.claude/skills/` |
| Skills Codex | **exactement 3**, sous `.agents/skills/` |
| Skill `executer-tache` | **aucun**, conformément à l'instruction |
| Procédure dupliquée entre Claude et Codex | **aucune** — les six `SKILL.md` renvoient au protocole partagé |
| `.orchestrator/RESULT.md` | **créé**, au format compact imposé |
| `AGENTS.md` / `CLAUDE.md` | **cohérents**, sans recopier les procédures |
| Fichiers hors dépôt modifiés | **aucun** — ni `~/.claude`, ni `~/.codex`, ni ailleurs |
| Code de production modifié | **aucun** — `src/`, `src-tauri/`, tests, dépendances intacts |

### Y.3 Compatibilité vérifiée avec les CLI installés

**Claude Code `2.1.252`.** `claude --help` documente que « Skills still resolve
via `/skill-name` » et que `--disable-slash-commands` désactive les skills : la
convention `.claude/skills/<nom>/SKILL.md` → `/nom` est celle du CLI installé.

**Codex `codex-cli 0.151.0`.** Les drapeaux `skill_search` et
`skill_mcp_dependency_install` sont **stables et actifs**, et
`skip_host_skill_discovery` est **inactif**. La découverte a été **testée
réellement**, sans appeler le modèle, avec `codex debug prompt-input` :

- **avant** création : 5 racines de skills, **toutes** sous `~/.codex/`;
- **après** création : une **sixième racine** apparaît —
  `<dépôt>/.agents/skills` — et **les trois skills y sont listés** avec leur
  nom et leur description, ce qui confirme au passage que le frontmatter est
  bien formé;
- la règle de déclenchement rendue par Codex nomme explicitement la syntaxe
  **`$SkillName`**.

### Y.4 Ce qui n'a PAS pu être testé, et n'est pas déclaré PASS

**L'invocation `/debut-session` dans Claude Code n'a pas été exercée.** Les
skills sont énumérés **au démarrage d'une session**, et la présente session a
commencé avant que les fichiers existent. Aucune sous-commande du CLI ne liste
les skills hors session, et lancer une session de contrôle appellerait le
modèle — donc un usage payant, réservé à Sébastien.

**Ce qui est établi :** la convention est celle du CLI installé, l'arborescence
est conforme, et le frontmatter est **prouvé bien formé** puisqu'un autre outil
l'a analysé et en a extrait nom et description.

**Ce qui ne l'est pas :** que `/debut-session` réponde effectivement. **Cela se
vérifiera à la prochaine session Claude Code**, et c'est déclaré comme non
testé plutôt que présumé.

### Y.5 Conséquence

`TASK-0016` est **`VERIFIED`**. Aucune tâche n'est `IN_PROGRESS`. L'action
unique suivante est de **spécifier la prochaine tranche de l'étape A**, avec
ses critères **gelés avant tout code**.

---

## Z. TASK-0017 — relations transversales avec provenance

**Branche `build/v0.2-a2-relations`.** Gel `51a8cac` **avant** tout code,
premier code de production `a98676e`. Tâche **`IMPLEMENTED`**, **jamais
`VERIFIED`** : l'exécuteur ne s'auto-vérifie pas.

### Z.1 La commande `/debut-session` a été réellement exercée — PASS

**Ce que `ACTION-0026` avait laissé NON TESTÉ est maintenant testé.**

Le 2026-09-01, dans une **nouvelle session Claude Code**, ouverte **après**
l'installation des skills du commit `4fb5416` :

- le skill **`/debut-session` a été découvert et résolu** par le CLI;
- le renvoi a été suivi jusqu'à
  **`.orchestrator/protocols/debut-session.md`**, la procédure partagée, qui a
  été lue et exécutée intégralement;
- l'ordre du protocole a été respecté : **Git d'abord** — racine, branche,
  `HEAD`, `upstream`, propreté —, **puis** la lecture minimale
  `AGENTS.md` → `CURRENT_STATE.md` → `NEXT_ACTION.md`;
- **aucun travail interrompu** n'a été détecté, donc aucune bascule vers
  `reprise-session`;
- la lecture est restée **minimale** : ni parcours de `docs/`, ni lecture de
  `src/`, ni de `graph/`, ni de `VALIDATION.md` ou `CHANGELOG_AI.md` en entier.

**Verdict : PASS.** La réserve « non testé » de la section `Y.4` est **levée**
pour Claude Code. **Elle reste entière pour Codex** : l'exécution réelle d'un
`$debut-session` en session Codex **n'a toujours pas été jouée**.

### Z.2 Validation exécutée pour TASK-0017

| Contrôle | Commande | Résultat |
|---|---|---|
| Tests Rust | `CARGO_INCREMENTAL=0 cargo test --manifest-path src-tauri/Cargo.toml --lib` | **75 / 75** |
| Tests-gardes `X2` | idem, `exposed_commands_stay_within_the_slice`, `no_exposed_command_can_open_a_folder_picker` | **PASS** |
| Tests TypeScript | `pnpm test` | **81 / 81** |
| Types | `pnpm check` | **PASS** |
| Build interface | `pnpm build` | **PASS** |
| Build Tauri release, sans empaquetage | `CARGO_INCREMENTAL=0 pnpm tauri build --no-bundle` | **PASS**, `1 min 21 s` |
| `J12` dans WebView2 réel | `FILETOPO_AUTO_RELATIONS=1 pnpm tauri dev` | **PASS** — `TASK-0017-J12-webview2.json` |
| `J11` isolation | rejeu `FILETOPO_AUTO_VERIFY=1`, relations en place | **PASS** — `TASK-0017-J11-isolation.json` |

**Aucune nouvelle dépendance.** `package.json`, `pnpm-lock.yaml` et
`src-tauri/Cargo.toml` sont **inchangés**.

### Z.3 Les douze critères gelés

`J1` à `J12` : **TENUS**. Le détail, avec les motifs de rejet observés et les
chiffres relevés dans l'hôte, est en §7 de la fiche `TASK-0017`.

Points saillants, vérifiables sans relire la fiche :

- **La provenance est la table, pas une colonne.** Le schéma lu directement
  dans le SQLite ne contient **aucune** colonne `provenance`, et
  `relations_approved` n'a **aucune** colonne de règle.
- **Les cinq tentatives invalides** ont toutes été rejetées avec **exactement**
  le motif gelé, et **aucune** n'a laissé de ligne établie.
- **12 / 12 nœuds** conformes à l'attendu gelé de §4.6.3, **0 inverse
  inventé**, **0 suggestion** dans un compte de relations établies.
- **Après reconstruction complète des quatre index de carte :** 5 relations
  approuvées et 3 suggestions **intactes**, digest déterministe identique,
  **0 extrémité non résolue**.

### Z.4 Quatre défauts de protocole, déclarés

Trois dans le harnais de mesure — panneau lu trop tôt, attente bornée en images
plutôt qu'en temps, atténuation lue sur le mauvais élément — et un d'exécution,
**deux instances de l'application en parallèle sur le même magasin**.

**Chacun aurait produit un chiffre faux ou flatteur, et chacun est publié avec
ce qu'il aurait produit** — fiche §7.5. Les artefacts contradictoires ont été
**détruits**, et la campagne publiée provient d'une **exécution unique sur le
binaire final**.

### Z.5 Une lacune du modèle, trouvée et corrigée

Le type d'une relation était vérifié **non vide** mais **jamais confronté aux
deux types déclarés** en §4.2. Corrigé avant publication, motif
`relation_rejected_unknown_type`, couvert par un test.

### Z.6 Ce qui n'est PAS déclaré PASS

- **`R8` n'est pas levée.** **Aucune mesure de performance n'a été prise**, et
  `TASK-0017` n'en demandait aucune. **Aucun seuil n'a été inventé.**
- **`I-E` n'est pas implémentée.** `ek1` est un repli déterministe déclaré;
  `VolumeSerialNumber` + `FileId`, déplacements et renommages réels restent
  entiers.
- **`P-04` reste PARTIELLE** : la **révocation** d'une relation approuvée n'est
  pas implémentée, alors que la parité §5.2 l'exige. Déclarée manquante.
- **L'activation au clavier d'une entrée de panneau n'a pas été jouée par une
  frappe de confiance** : un script ne peut pas en forger une. Ce qui est
  prouvé est l'atteignabilité par le focus et l'activation par le comportement
  propre du bouton. **Les flèches de la carte, elles, sont exercées pour de
  vrai.**
- **`P-21` n'est pas satisfaite** : français seulement, aucun audit WCAG
  complet, **aucun lecteur d'écran réel**.
- **Les relations d'un seul cerveau synthétique sont exercées.** Les autres
  fixtures sont refusées **en toutes lettres**, pas servies à moitié.
- **`B0` n'est pas corrigé**, rien n'a été supprimé dans `src-tauri/target/`.
- **`$debut-session` en session Codex reste non testé.**

### Z.7 Conséquence

`TASK-0017` est **`IMPLEMENTED`**. L'action unique suivante est son **contrôle
indépendant**, mené par une instance **distincte de l'exécuteur** et se
prononçant **sur preuves**.

---

## Z-bis. TASK-0017 — contrôle indépendant `ACTION-0027`, réserves `X3` et `X4`

**Verdict du contrôle indépendant : `CHANGES_REQUIRED`.** Enregistré en
[`ACTION-0027`](../reviews/ACTION-0027-independent-control.md). **`TASK-0017`
reste `IMPLEMENTED`; `VERIFIED` n'est pas attribué.**

Le contrôle a **accepté** que le gel `51a8cac` précède le code `a98676e`, et
que `J1` à `J11` soient acceptables sous réserve de `X3`. **La révocation de
`P-04` n'est pas une réserve** : elle était hors du périmètre gelé.

### Z-bis.1 `X3` — corrigée, NON close

**Le défaut.** `insert_established()` acceptait `provenance=APPROVED` dès lors
que la suggestion nommée était déjà `approved`, **sans vérifier que la source,
la cible et le type correspondaient à cette suggestion**. Une suggestion déjà
approuvée pouvait **justifier une relation qui n'était pas elle-même**.

**La garde contrôlait qu'une clé existe, pas ce qu'elle désigne.** Même famille
que `X2` : juger ce que le code *appelle*, pas ce que le stockage *permet*.

**La correction, vérifiée dans le fichier SQLite après exécution** —
`TASK-0017-J11-isolation.json` :

| Garantie | Constat |
|---|---|
| `user_version` | **2** |
| `suggestion_key` | index **unique** (`sqlite_autoindex_relations_approved_2`) |
| Clé étrangère | `relations_approved.suggestion_key` → `relation_suggestions.suggestion_key` |
| Déclencheurs | `approved_must_match_its_suggestion_on_insert`, `..._on_update`, `suggestion_cannot_drift_from_its_relation` |
| Lignes approuvées ne correspondant pas à leur suggestion | **0** |

`insert_established` refuse désormais `APPROVED` **sans condition**;
`approve()` est la **seule** voie applicative; et `approve()` écrit un `INSERT`
**simple** — `OR IGNORE` transformait un refus en non-événement silencieux.

**La migration est explicite et auditable :** une ligne de version 1 qui ne
correspond pas à sa suggestion **n'est pas reprise**, et sa clé est écrite dans
`relation_meta` sous `migration_v2_discarded`. Données **synthétiques**
uniquement.

**Neuf tests ajoutés**, dont **cinq écrivent directement en SQL** en contournant
toute garde Rust — c'est ce qui prouve la contrainte **au niveau du stockage**
et non au niveau de l'API qui refuse déjà :

- `an_already_approved_suggestion_cannot_justify_a_direct_write`
- `insert_established_can_never_create_an_approved_relation`
- `the_storage_refuses_a_relation_that_is_not_its_suggestion` — 3 variantes
- `the_storage_refuses_a_pending_suggestion`
- `an_approved_relation_cannot_exist_without_its_suggestion`
- `one_suggestion_can_never_carry_two_approved_relations`
- `an_approved_suggestion_cannot_drift_away_from_its_relation`
- `migrating_a_version_1_store_drops_the_mismatched_row_and_names_it`
- `reopening_a_version_2_store_is_a_no_operation`

### Z-bis.2 `X4` — corrigée, preuve rejouée, NON close

**Le défaut.** Le gel exige « parcourir au clavier au moins une relation ».
L'artefact précédent **déclarait lui-même** qu'aucune frappe `Enter` de
confiance n'avait été jouée. **Une déclaration d'honnêteté n'est pas une
preuve** : le critère n'était pas tenu.

**La correction.** Le scénario **n'active plus rien**. Il pose le focus, écrit
un marqueur sur la sortie de l'hôte, et attend une **vraie frappe Windows**
envoyée par `scripts/j12-send-real-key.ps1` via **`WScript.Shell`**, après
`AppActivate`. **Aucune nouvelle dépendance** : `WScript.Shell` fait partie de
Windows.

**Trois instruments simultanés**, aucun ne suffisant seul : `isTrusted` de
l'événement d'activation; les compteurs d'appels à
`HTMLElement.prototype.click` et de `dispatchEvent` de type `click`, qui
doivent rester à **zéro** sur toute la fenêtre; et le changement observable.
**Si la frappe n'arrive pas, le scénario échoue** — jamais de repli sur un clic
synthétique.

**Relevé dans `TASK-0017-J12-webview2.json`, WebView2 `151.0.4129.107`, sur le
binaire portant les deux corrections :**

| | Traversée d'une relation | Approbation de `S-005` |
|---|---|---|
| Méthode d'entrée | `WScript.Shell SendKeys` après `AppActivate` | idem |
| Touche envoyée | `{ENTER}` | `{ENTER}` |
| Élément focalisé avant | `BUTTON` `relation__link` | `BUTTON` `suggestion__approve` |
| Focus atteint | **oui** | **oui** |
| `keydown` de confiance | **`true`**, touche `Enter` | **`true`**, touche `Enter` |
| Activation de confiance | **`true`** | **`true`** |
| Appels `click()` programmatiques | **0** | **0** |
| `dispatchEvent` de type `click` | **0** | **0** |
| Endpoint avant | `map-node-6` | — |
| Endpoint après | **`map-node-9`** | — |
| Endpoint attendu, lu sur l'entrée activée | **`map-node-9`** | — |
| L'index confirme que c'est une relation | **`true`** | — |
| Changement dû à la frappe | **`true`** | **`true`** |

### Z-bis.3 Un cinquième défaut de protocole

**Ma preuve était fausse, pas le produit.** Le premier rejeu avec frappe réelle
a publié `selectionFollowedTheRelation: false` : l'extrémité attendue était
calculée depuis `outgoing[0]` **de l'index**, alors que le panneau **groupe par
direction puis par type**. La sélection était allée **exactement** où l'entrée
activée menait.

**Corrigé à la source :** l'entrée porte son extrémité en attributs `data-`; la
preuve la lit **sur l'entrée activée**, puis l'index confirme que c'est bien
une relation de ce nœud. Un test unitaire verrouille la correspondance.
**Faux négatif**, mais publié comme les quatre autres.

### Z-bis.4 Revalidation complète

| Contrôle | Commande | Résultat |
|---|---|---|
| Tests Rust | `CARGO_INCREMENTAL=0 cargo test --lib` | **84 / 84** (75 → 84) |
| Tests-gardes `X2` | idem | **PASS** |
| Tests TypeScript | `pnpm test` | **82 / 82** (81 → 82) |
| Types | `pnpm check` | **PASS** |
| Build interface | `pnpm build` | **PASS** |
| Build Tauri release, sans empaquetage | `pnpm tauri build --no-bundle` | **PASS**, `47,8 s` |
| `J1` à `J5` dans l'hôte | `map_relations_self_check` | 5/5 rejets, rejeu stable, **12/12 nœuds**, 0 inverse |
| `J10` | reconstruction des 4 index | **PASS** — 8 déterministes, **5 approuvées**, 3 en attente, **0** correspondance rompue |
| `J11` | rejeu `FILETOPO_AUTO_VERIFY=1` | **PASS** — `H1`–`H7` identiques, **0 artefact** dans la racine analysée |
| `J12` complet | `FILETOPO_AUTO_RELATIONS=1` + frappe réelle | **PASS** sur le binaire final |

**Aucune nouvelle dépendance** : `package.json`, `pnpm-lock.yaml` et
`Cargo.toml` inchangés.

### Z-bis.5 Ce qui n'a PAS changé, et ce qui n'est PAS déclaré PASS

- **Aucun critère `J1` à `J12`, aucune fixture gelée, aucune règle gelée** n'a
  été modifié.
- **Aucune mesure de performance, aucun seuil.** `R8` reste entière.
- **`P-04` reste PARTIELLE** : la **révocation** n'est pas implémentée, et ne
  devait pas l'être dans cette correction.
- **`ek1` n'implémente toujours pas `I-E`.**
- **`P-21` non satisfaite** : français seulement, aucun audit WCAG complet,
  **aucun lecteur d'écran réel**. `J12` prouve désormais une **vraie** frappe
  clavier, ce qui n'est pas un audit d'accessibilité.
- **`B0` non corrigé**, rien supprimé dans `src-tauri/target/`. L'avertissement
  `unused import: self` de `map/commands.rs` est **antérieur** et hors
  périmètre.
- **`$debut-session` en session Codex reste non testé.**
- **`X3` et `X4` sont corrigées, PAS closes.** `ACTION-0027` reste **`OPEN`**.

### Z-bis.6 Conséquence

`TASK-0017` reste **`IMPLEMENTED`**. L'action unique suivante est le
**re-contrôle indépendant**, mené par une instance **distincte de l'exécuteur**
et se prononçant **sur preuves**.


---

## AA. TASK-0017 — re-contrôle indépendant : X3 et X4 CLOSED, TASK-0017 VERIFIED

**Date :** 2026-09-01. **Contrôleur :** orchestrateur technique, instance
**distincte de l'exécuteur**. **Rédacteur de cette entrée :** Claude Code,
exécuteur — **elle enregistre un verdict, elle ne le rend pas.**

| Élément | Verdict |
|---|---|
| `X3` | **`CLOSED`** |
| `X4` | **`CLOSED`** |
| `ACTION-0027` | **`CLOSED`** |
| `TASK-0017` | **`VERIFIED`** |

**Ce que ce `VERIFIED` ne porte pas.** **La révocation de `P-04` n'est pas
implémentée**; elle reste **déclarée manquante et hors périmètre**, et **`P-04`
demeure PARTIELLE**. **`TASK-0018` ne l'implémente pas.**

**Aucune réserve autre que `X3` et `X4` n'est levée.** `V1` à `V4`, `W1` à
`W4`, `R2` à `R9` restent en vigueur; `R8` ne peut l'être qu'à l'étape **C**.

## AB. TASK-0018 — gel des critères K1 à K12, avant tout code

**Date :** 2026-09-01. **Branche :** `build/v0.2-a3-multibrain-foundation`,
créée depuis le tip contrôlé `50de16b`.

**Aucun test n'est déclaré `PASS` par cette entrée.** Elle enregistre un
**gel**, pas un résultat : le modèle de cerveau, les **trois cerveaux
synthétiques figés**, la disposition du stockage et les critères **`K1` à
`K12`** de [`TASK-0018`](../tasks/TASK-0018-multibrain-foundation.md) §4 sont
commités **avant la première ligne de code**, comme pour `TASK-0016` et
`TASK-0017`.

**Non testé, et déclaré tel :** tout ce que `K1` à `K12` décrivent. Rien n'est
encore exécuté.

## AC. TASK-0018 — exécution : K1 à K12, contrôles d'exécution

**Date :** 2026-09-01. **Branche :** `build/v0.2-a3-multibrain-foundation`.
**Statut de la tâche : `IMPLEMENTED`.** **`VERIFIED` n'est pas attribué** —
l'exécuteur ne s'auto-vérifie pas. Cette entrée enregistre des **contrôles
d'exécution**, pas une vérification indépendante.

**Le gel précède le code :** `51bb687` (gel §4), puis `4cb1cf4` (premier code),
puis `2424ef2` (preuves). **Aucun critère retouché après le premier résultat.**

### AC.1 Les douze critères

| Critère | Preuve | Verdict |
|---|---|---|
| `K1` catalogue, 3 cerveaux, `brain_id` unique, `source_ref` partagé | tests `brains.rs`; `K12` passe 1 §1 | **TENU** |
| `K2` `brain_id` frontière, inconnu = erreur nommée | `MapError::UnknownBrain`; test `an_unknown_brain_is_refused_by_name_rather_than_defaulted` | **TENU** |
| `K3` isolation physique, chemins réels comparés | `brains/brain-alpha/map/index.sqlite` ≠ `brains/brain-gamma/map/index.sqlite`, publiés | **TENU** |
| `K4` bascule 12 → 157 → 12 → 12 | `K12` passe 1, comptes lus par commande | **TENU** |
| `K5` collision d'identifiants locaux | deux clés d'extrémité pour un même `node_id`; référence d'un autre cerveau **refusée** | **TENU** |
| `K6` relations isolées, scénario §4.5 | Alpha 4→5 / 4→3; Gamma **inchangé**, sa `S-005` en attente | **TENU** |
| `K7` métadonnées propres, seed non destructif | modification applicative, autres cerveaux inchangés, conservée après redémarrage | **TENU** |
| `K8` état de session par cerveau | `alphaRestored=true`, `betaRestored=true`, états différents | **TENU** |
| `K9` cerveau actif persistant | **fermeture et redémarrage réels**, Gamma actif au catalogue **et** à l'écran | **TENU** |
| `K10` sélecteur clavier, **frappe réelle** | 4 bascules, `activationIsTrusted=true`, `keydownIsTrusted=true`, **0** clic programmatique | **TENU** |
| `K11` lecture seule / `X2` | empreintes identiques ×3, **0** artefact dans les racines, surface `map_` seule | **TENU** |
| `K12` hôte réel, 12 étapes | `TASK-0018-K12-webview2-pass{1,2}.json`, WebView2 `151.0.4129.107` | **TENU** |

### AC.2 Validations exécutées

| Validation | Commande | Résultat |
|---|---|---|
| Tests Rust | `CARGO_INCREMENTAL=0 cargo test --lib` | **PASS** — **104/104** (84 → 104) |
| Tests TypeScript | `pnpm test` | **PASS** — **97/97** (82 → 97) |
| Types | `pnpm check` | **PASS** |
| Bundle web | `pnpm build` | **PASS** |
| Build Tauri debug | `pnpm tauri build --debug --no-bundle` | **PASS** |
| Build Tauri release | `pnpm tauri build --no-bundle` | **PASS**, 33,17 s |
| Tests-gardes `X2` | suite Rust | **PASS**, plus un test **positif** sur la surface cerveaux |
| Tests `X3` / `X4` | suite Rust | **PASS**, inchangés |
| `K11` hôte réel | `FILETOPO_AUTO_VERIFY=1` | **PASS** — `TASK-0018-K11-readonly-and-isolation.json` |
| `K12` hôte réel, 2 passes | `scripts/k12-run-real-host.ps1` | **PASS** — `pass1` et `pass2` |
| Redémarrage réel `K9`/`K12` | deux processus, deux artefacts | **PASS** |
| Nouvelle dépendance | `git diff` sur les manifestes | **aucune** |

### AC.3 Empreintes de `K11`, telles que relevées

| Cerveau | Source | Empreinte avant | Empreinte après reconstruction | Artefacts FileTopo dans la racine |
|---|---|---|---|---|
| `brain-alpha` | `quasi-empty` | `fnv1a64:bddfe1a16cac350f` | **identique** | **0** |
| `brain-beta` | `deep` | `fnv1a64:075a9c069126e8f1` | **identique** | **0** |
| `brain-gamma` | `quasi-empty` | `fnv1a64:bddfe1a16cac350f` | **identique** | **0** |

**Alpha et Gamma ont la même empreinte de source** — c'est bien la **même**
fixture — **et deux index dans deux fichiers différents.** C'est exactement ce
que `K3` demande de prouver.

### AC.4 Défauts trouvés en chemin, publiés

| # | Défaut | Ce qu'il a produit | Correction |
|---|---|---|---|
| 1 | Le menu se refermait sur un `blur` à `relatedTarget` nul | une désactivation de fenêtre fermait le menu; la frappe réelle arrivait sur un bouton démonté | fermeture seulement si le focus part vers un autre élément **de la page**; 2 tests de régression |
| 2 | La vue était ré-ajustée quand le viewport se stabilisait | `alphaRestored=false` **sur un produit dont la sélection revenait** — un faux négatif | `shouldFitOnOpen`, règle écrite une fois et testée |
| 3 | Un binaire `release` ne peut pas écrire d'artefact | la 1re tentative de `K12` **n'a rien publié, pas même son abandon** | évidence construite dans un objet fourni par l'appelant; lanceur sur binaire `debug` |
| 4 | `Write-Output` dans une fonction PowerShell entre dans sa valeur de retour | le lanceur a **annoncé un succès** alors que la passe 1 avait abandonné | `Write-Host`; l'attente s'arrête aussi sur l'artefact d'abandon |

### AC.5 Non testé, et déclaré tel

- **`J12` n'a PAS été rejoué dans l'hôte.** Le scénario a été migré vers
  `brain-alpha` — même fixture, même mécanisme, extrait dans `realInput.ts` —
  et il compile et typecheck, mais **il n'a pas été exécuté** : le rejouer
  aurait **écrasé `TASK-0017-J12-webview2.json`**, preuve publiée d'une tâche
  `VERIFIED`.
- **Aucune mesure de performance, aucun seuil.** `R8` reste entière.
- **Les campagnes de vérification et de mesure marchent désormais par cerveau**
  et ne couvrent plus `wide` ni `mixed`. Les artefacts publiés de `TASK-0016`
  sont **inchangés**.
- **Persistance de la vue** : `P-19`, **non revendiquée**.
- **Révocation de `P-04`** : **non implémentée**, `P-04` demeure **PARTIELLE**.
- **`P-21`** : français seulement, aucun audit WCAG, **aucun lecteur d'écran
  réel**.
- **`B0` s'est reproduit une quatrième fois**; rien n'a été supprimé ni renommé
  dans `src-tauri/target/`.
- **Une seule machine, un seul runtime WebView2.**

**Aucune réserve n'est levée par cette entrée.** `V1` à `V4`, `W1` à `W4`,
`R2` à `R9` restent en vigueur.


## AD — 2026-09-01 — `ACTION-0028`, réserve `X5` corrigée : les preuves `VERIFIED` sont protégées

**Objet :** correction ciblée de la réserve **`X5`** émise par le contrôle
indépendant de `TASK-0018`. **`TASK-0018` reste `IMPLEMENTED`.** **`X5` reste
`OPEN`** — corrigée, non close.

### AD.1 Ce que `X5` établissait

Les outils et scénarios du runtime courant pouvaient **écraser les artefacts
canoniques de tâches déjà `VERIFIED`** : la boucle de mesure et le scénario de
relations avaient été migrés vers les cerveaux mais écrivaient encore sous
`TASK-0016-H9-webview2.json` et `TASK-0017-J12-webview2.json`, et
`write_run_artifact` écrit par **remplacement**.

### AD.2 Ce qui a été fait

| Plan | Correction |
|---|---|
| **Structurel** | `write_run_artifact` refuse un nom de `PROTECTED_RUN_ARTIFACTS`, **avant tout accès au disque** |
| **Nommage** | `src/map/runArtifacts.ts` : une seule orthographe de chaque nom, importée par les sept sites d'écriture |
| **Contenu** | chaque artefact migrant porte `task`, `sourceCriterion`, `nature`, `doesNotReplace`, `replacesCanonicalEvidence: false` |
| **Garde** | 9 tests neufs — 7 TypeScript, 2 Rust — **éprouvés par mutation** |

### AD.3 Le `J12` de régression, rejoué dans l'hôte

Une exécution, `brain-alpha`, WebView2 `151.0.4129.107`, **vraie frappe
Windows** : `activationIsTrusted = true`, `keydownIsTrusted = true`, **0**
`click()` programmatique, **0** `dispatchEvent(click)`, traversée réelle,
approbation explicite de `S-005` (`3 → 4` sortantes,
`enteredCountsOnlyAfterApproval = true`), `X3` respecté (5/5 rejets, dont
`relation_rejected_suggestion_is_not_a_relation`), comptes cohérents
(`countsAgree`, `replayStable`, 0 extrémité non résolue).

**Artefact :** `docs/performance/runs/TASK-0018-J12-relations-regression-webview2.json`.

**Préparation déterministe :** le magasin de relations de `brain-alpha` — écrit
par FileTopo, reconstructible, sous `.filetopo-sandbox/` — a été remis à neuf
pour que `S-005` soit en attente. **Aucune preuve historique n'a été touchée.**

### AD.4 Validations

| Contrôle | Résultat |
|---|---|
| Tests Rust | **106/106** (104 → 106) |
| Tests TypeScript | **104/104** (97 → 104) |
| Tests-gardes `X2` | **PASS** |
| Tests `X3` / `X4` | **PASS**, inchangés |
| Nouveau test `X5` | **PASS** |
| `pnpm check` | **PASS** |
| `pnpm build` | **PASS** |
| Build Tauri `debug --no-bundle` | **PASS**, 12,12 s |
| `J12` de régression dans WebView2 | **PASS** |
| `TASK-0016-H9-webview2.json` | **inchangé** — `sha256 4bb12d9d…`, `git diff` vide |
| `TASK-0017-J12-webview2.json` | **inchangé** — `sha256 95fbab51…`, `git diff` vide |

### AD.5 Non testé, et déclaré tel

- **Aucune campagne `H9` n'a été exécutée.** `TASK-0018` n'a aucun critère de
  performance; **aucun seuil**, `R8` entière.
- **`K12` n'a pas été rejoué** : aucun code produit de bascule, de catalogue ou
  de session n'a été modifié.
- **`P-19` non revendiquée**, **révocation de `P-04` non implémentée**,
  **`P-21` non satisfaite**.
- **`B0` s'est reproduit une cinquième fois**, sur `cargo test`; **rien
  supprimé ni renommé** dans `src-tauri/target/`.
- **Une seule machine, un seul runtime WebView2.**

**Aucune réserve n'est levée par cette entrée.** `X5` reste **`OPEN`** jusqu'au
re-contrôle indépendant. `V1` à `V4`, `W1` à `W4`, `R2` à `R9` restent en
vigueur.

---

## Z. TASK-0019 — Vue composée multi-cerveaux (2026-09-02)

**Statut : `IMPLEMENTED`** le 2026-09-02, **`VERIFIED` NON attribué** —
l'exécuteur ne s'auto-vérifie pas. Branche
`build/v0.2-a4-composed-view`; gel `§4` en `bcbc4aa`, **avant** la première
ligne de code de cette tranche.

### Z.1 Vérifié

- **`pnpm check`** : PASS.
- **Tests TypeScript** : **139/139** (107 → 139). Trois suites neuves ou
  refaites — `composedView.test.ts` (31), `brains.test.tsx` refait contre la
  barre de composition (16), `runArtifacts.test.ts` étendu (10).
- **Tests Rust** : **107/107**.
- **`pnpm build`** : PASS. **Build Tauri `debug --no-bundle`** : PASS.
- **`L12` dans le vrai WebView2 `152.0.4191.53`**, **deux processus**, avec
  fermeture et redémarrage **réels** :
  `TASK-0019-L12-composed-view-webview2-pass{1,2}.json`.
  Seize des dix-sept étapes tenues; l'étape 7 est partielle, voir Z.2.
- **Vraies frappes Windows** aux étapes 3, 8, 13 et 14 : `isTrusted=true`,
  **0** `click()` programmatique, **0** `dispatchEvent(click)`.
- **`C2`** : 1 canevas, 2 territoires, 12 + 12, index `SQLite` **distincts**.
  **`C3`** : 3 territoires, 12 + 157 + 12 = **181**, **0** arête
  inter-cerveaux sur 32 dessinées.
- **Collision `L3`** : `node_id` 4 valide dans Alpha **et** Gamma,
  `brain-alpha-map-node-4` ≠ `brain-gamma-map-node-4`, sélection de l'un =
  **0** sélectionné dans l'autre, **aucun** `id` DOM partagé.
- **`L9`** : `C2 → C3 → C2` restitue **exactement** l'état de `C2`.
- **`L11` lecture seule** : `TASK-0019-K11-readonly-regression-webview2.json`
  — empreintes identiques avant/après sur **trois** cerveaux, **0** artefact
  FileTopo dans les racines analysées, trois chemins d'index distincts.
- **Régressions de la fondation** : `K12` deux passes
  (`TASK-0019-K12-foundation-regression-webview2-pass{1,2}.json`) et `J12` une
  passe (`TASK-0019-J12-relations-regression-webview2.json`), toutes deux à
  vraie frappe.
- **`X5`** : les **huit** preuves protégées sont **inchangées**, `git status`
  ne montre que des ajouts non suivis sous `docs/performance/runs/`.

### Z.2 Non tenu, et publié tel quel

- **`L12` étape 7, moitié « approuver `S-005` dans Alpha » : NON REJOUÉE.** Le
  bac à sable est persistant et `S-005` y était déjà approuvée par une
  exécution antérieure du rejeu `K12`; le magasin refuse une seconde
  approbation, ce qui est `X3` qui fonctionne. Aucune commande de remise à zéro
  n'existe, et effacer le bac à sable serait une suppression hors périmètre.
  **La moitié « Gamma inchangé » est tenue** : Gamma strictement identique
  avant/après, magasins séparés. L'artefact porte `approvalReplayable: false`
  et sa raison.

### Z.3 Non testé, et déclaré tel

- **Aucune campagne `H9`**, aucun seuil, aucune mesure de performance. `R8`
  reste entière.
- **Persistance de la composition** : non implémentée, `P-19` demeure.
  `L12` §17 le confirme sur redémarrage réel.
- **Relations inter-cerveaux** : hors périmètre, `TASK-0020`.
- **Révocation de `P-04`** : non implémentée, `P-21` non satisfaite.
- **`B0` s'est reproduit une sixième fois** — `rustc` a paniqué sur son cache
  incrémental. Contourné par `CARGO_INCREMENTAL=0`, qui ne supprime rien;
  **rien n'a été effacé ni renommé dans `src-tauri/target/`.**
- **Une seule machine, un seul runtime WebView2.**

### Z.4 Défauts trouvés en chemin

Quatre, tous corrigés et gardés par un test ou une garde d'exécution :

1. `scripts/k12-run-real-host.ps1` **supprimait** une preuve devenue canonique
   d'une tâche `VERIFIED`. Les deux scripts portent désormais une liste
   protégée et un `Assert-NotProtected`.
2. Le rejeu `J12` déclarait `task: "TASK-0018"` dans un fichier `TASK-0019`.
   Corrigé; un test de garde l'exige maintenant.
3. Trois scénarios lisaient trop tôt après `showOnly`, non `await`é. Corrigé en
   attendant que l'état **cesse de changer**, jamais qu'il atteigne une valeur
   attendue.
4. Un octet `NUL` était **commité** dans `src/map/brainScenario.ts`.

**Aucune réserve n'est levée par cette entrée.** `V1`–`V4`, `W1`–`W4`,
`R2`–`R9` restent en vigueur.

## AA. `TASK-0019` — correction de la réserve `X6`, `L12` rejoué en entier

**Date :** 2026-09-02. **Branche :** `build/v0.2-a4-composed-view`.
**Contrôle à l'origine :**
[`ACTION-0030`](../reviews/ACTION-0030-independent-control.md),
`CHANGES_REQUIRED`, `HEAD` contrôlé `21acd64`.

### AA.1 Ce que `X6` reprochait

`L12` étape 7 exigeait **l'ACTE** : « approuver `S-005` dans Alpha et confirmer
Gamma inchangé ». La preuve publiée portait `s005WasPending: false`,
`approvalReplayable: false`, `alphaMovedByExactlyOne: false`. **Gamma inchangé
était prouvé; l'approbation demandée n'avait pas eu lieu pendant `L12`.**

### AA.2 Le mécanisme ajouté — un namespace, pas une suppression

`src-tauri/src/map/sandbox.rs` accepte une variable de **développement**,
`FILETOPO_SANDBOX_VARIANT`, et résout
`<dépôt>/.filetopo-sandbox/variants/<variant>`.

| Propriété | Tenue par |
|---|---|
| Variable absente : chemin **exactement** historique | `without_a_variant_the_development_path_is_exactly_the_historical_one` |
| Variant valide : sous `.filetopo-sandbox/variants/` | `a_valid_variant_lands_under_the_sandbox_and_nowhere_else` |
| `..`, `../x`, `..\x`, `a/b`, `a\b`, `/abs`, `\\share`, `C:\abs`, `C:`, `a.b`, `x/../../y`, `a b`, `é`, `%TEMP%`, chaîne vide : **refusés** | `every_shape_of_a_path_is_refused` |
| Borne à **64** caractères, exactement | `the_length_bound_is_enforced_at_exactly_sixty_four` |
| **Aucun** variant accepté ne sort du bac à sable | `no_accepted_variant_ever_escapes_the_sandbox` |
| Libellé publié sans chemin absolu ni nom personnel | `a_variant_label_stays_free_of_any_absolute_path` |

**Aucun repli silencieux :** une valeur refusée est une **erreur** remontée par
`map_sandbox`, jamais un chemin de remplacement. **Aucun sélecteur de dossier,
aucune racine choisie par l'utilisateur.**

`scripts/l12-run-real-host.ps1` tire un variant **neuf** par invocation, le
garde **identique** pour les deux passes, retire la variable en sortant, et
**ne supprime ni le bac existant ni le répertoire du variant**.

### AA.3 `L12` rejoué, `WebView2` `152.0.4191.53`, deux processus réels

| | Alpha avant | Alpha après | Gamma avant | Gamma après |
|---|---|---|---|---|
| approuvées | **4** | **5** | 4 | 4 |
| en attente | **4** | **3** | 4 | 4 |
| `S-005` | **en attente** | **approuvée** | en attente | **en attente** |

`s005WasPending: true`, `approvalReplayable: true`, `approvalError: null`,
`alphaMovedByExactlyOne: true`, `gammaStrictlyUnchanged: true`,
`gammaS005StillPending: true`, `separateStores: true`. Approbation faite
**pendant que `C2` [Alpha, Gamma] était affichée**. `pass2` porte le **même**
`sandboxRoot` que `pass1` et confirme Gamma actif, composition **Gamma seul**.

### AA.4 Rien n'a été supprimé

- Le bac à sable existant est **intact** : empreinte de `.filetopo-sandbox/`,
  variants exclus, **identique** avant et après le rejeu.
- Les **huit** preuves protégées `TASK-0016`/`0017`/`0018` sont **bit-for-bit
  inchangées**.
- Seuls les deux artefacts `L12` de `TASK-0019` — tâche **non `VERIFIED`** —
  ont été remplacés par la preuve corrigée de cette même tâche.
- **Rien n'a été effacé ni renommé dans `src-tauri/target/`.**

### AA.5 Validations exécutées

**113/113** tests Rust (107 → 113); **139/139** tests TypeScript; `pnpm check`
**PASS**; `pnpm build` **PASS**; build Tauri `debug --no-bundle` **PASS**;
**`L12` deux passes** dans le vrai `WebView2`. `K11`, `K12` et `J12` **non
rejoués** — leur code fonctionnel n'a pas changé. **Aucune nouvelle
dépendance.**

**`B0` s'est reproduit une septième fois** — `rustc` a paniqué sur son cache
incrémental (`Failed to recover key for impl_trait_header`). Contourné par
`CARGO_INCREMENTAL=0`, qui ne supprime rien.

### AA.6 Défaut trouvé en chemin

**Un octet `NUL` était commité dans `docs/tasks/TASK-0019-composed-multibrain-view.md`**,
dans la phrase même qui décrit le `NUL` de `src/map/brainScenario.ts`. Il
rendait la fiche **binaire** pour `git diff` et `grep` — donc illisible en
revue, sur le fichier qu'un contrôle indépendant doit lire. Écrit `<NUL>`.

### AA.7 Ce que cette entrée ne lève pas

**`X6` reste `OPEN`.** La correction est exécutée; **l'exécuteur ne ferme pas
sa propre réserve**, et `TASK-0019` **reste `IMPLEMENTED`**. `X2`, `X3`, `X4`,
`X5` sont **maintenues**, ainsi que `V1`–`V4`, `W1`–`W4` et `R2`–`R9`.


---

## AB. `TASK-0020` — relations inter-cerveaux explicites (2026-09-02)

**Branche `build/v0.2-a5-interbrain-relations`.** Gel `7746fd4` **avant** le
code `d1adcf2`. **Aucun critère `M1`–`M12` retouché après le premier résultat.**

### AB.1 Les douze critères gelés

| Critère | Verdict | Ce qui a été observé |
|---|---|---|
| `M1` modèle / stockage | **TENU** | 9 tentatives invalides, 9 refus **nommés**; `CHECK(source_brain_id <> target_brain_id)` refusé **en contournant Rust**; aucune colonne `provenance` |
| `M2` déterminisme | **TENU** | 6 relations exactement; digest `fnv1a64:3020af7489aab581` identique sur deux rejeux; 0 inverse sur 10 paires interdites |
| `M3` approbation / `X3` | **TENU** | `XB-S01` → **une** relation `APPROVED`; insertion directe, mauvais champs et seconde approbation refusés, jusque dans les déclencheurs `SQLite` |
| `M4` direction / comptes | **TENU** | 19 extrémités contre l'attendu **gelé**, deux requêtes séparées; 4 témoins à `0`/`0` |
| `M5` persistance / rebuild | **TENU** | rebuild Alpha → Gamma → Bêta : magasin intact, digest inchangé, `APPROVED` et suggestions persistantes, 0 extrémité non résolue |
| `M6` rendu inter-territoires | **TENU** | 10 arêtes sur 6 paires ordonnées en `C3`, **0** dans un seul cerveau; trait doublé + tête + chevron + `<title>` en mots |
| `M7` panneau | **TENU** | deux sections, deux totaux, **deux espaces de noms `CSS` disjoints**; 4 entrées internes / 1 inter-cerveaux |
| `M8` navigation affichée | **TENU** | frappe réelle → endpoint exact dans Gamma, Gamma focused **et** actif, 1 seul nœud sélectionné |
| `M9` navigation hors vue | **TENU** | « hors de la vue » en mots; frappe réelle → Gamma ajouté en ordre catalogue, endpoint exact, digest **inchangé** |
| `M10` suggestion | **TENU** | 0 avant, **+1 exactement** après, `APPROVED`, `ruleName: null`, arête établie apparue |
| `M11` sécurité / historique | **TENU** | 12 et 157 entrées dans les racines, 0 artefact FileTopo; **14** preuves protégées inchangées; `main` intacte |
| `M12` hôte réel | **TENU** | deux passes, `WebView2 152.0.4191.53`, variant neuf, redémarrage réel; **aucun indicateur faux dans tout l'arbre de preuve** |

### AB.2 Validations exécutées

| Validation | Résultat |
|---|---|
| Tests Rust | **144 / 144** (114 → 144) |
| Tests TypeScript | **170 / 170** (141 → 170) |
| `pnpm check` | **PASS** |
| `pnpm build` | **PASS** |
| Tauri `debug --no-bundle` | **PASS**, sans avertissement |
| `M12` deux passes, vrai `WebView2` | **PASS** |
| Régression `J12` intra-cerveau | **PASS** — panneau stabilisé en 22 ms, 4 entrées, 2 sections |
| Régression `L12` vue composée | **PASS** — `L8` exact : 32 arêtes intra, **0** traversante |
| `X2` `X3` `X4` `X5` `X6` | **maintenues** — surface `map_` seulement, `approve()` unique voie, frappes `isTrusted`, 14 preuves intactes, confinement du variant |

### AB.3 Deux défauts que la mesure a trouvés

**Le rejeu a servi, et cela se dit.** Deux mesures **antérieures** se sont
mises à compter des éléments qui ne les regardaient pas, parce que le nouveau
panneau et les nouvelles arêtes partageaient des classes `CSS` avec les
anciennes : `J12` a publié un panneau « non stabilisé » et `L12` un
`everyEdgeStaysInOneBrain: false` **alors que rien n'était cassé**. Même faute
qu'un `id` `DOM` pour deux cerveaux, sous un autre habit. **Corrigée à la
source** : espaces de noms disjoints dans le balisage, style partagé par la
feuille de style, deux tests qui le tiennent. Après correction, `J12` et `L12`
retrouvent **exactement** leurs valeurs d'origine.

Second défaut : un contrôle `DOM` capturé **avant** un `await` peut être
remplacé par un re-rendu, et une frappe envoyée à un nœud détaché part dans le
vide. Le contrôle est désormais **re-interrogé à l'instant où il est pressé**.

### AB.4 Ce que cette entrée ne lève pas

**`TASK-0020` reste `IMPLEMENTED`.** L'exécuteur ne s'auto-vérifie pas.
**Aucune campagne `H9`**, aucun seuil : `R8` entière. **`I-E` complète** hors
périmètre — `cek1` est le repli déclaré, et un déplacement réel casserait une
extrémité. **`P-19`** et **`P-21`** demeurent. **`B0`** n'est pas corrigé.

## AC. `TASK-0020` — contrôle indépendant `ACTION-0032` : `CLOSED`, `TASK-0020` `VERIFIED`

**Date :** 2026-09-02. **Contrôleur :** orchestrateur technique, instance
**distincte de l'exécuteur**. **Rédacteur de cette entrée :** Claude Code,
exécuteur — **elle enregistre un verdict, elle ne le rend pas.**

**`HEAD` contrôlé :** `9a7206a1e246258259096b1679f19ac5b53005d7`, tip de
`build/v0.2-a5-interbrain-relations`. **`main` contrôlée intacte :**
`91bbe90f0f99026c28cd345784d4f579a0016db2`.

| Élément | Verdict |
|---|---|
| `ACTION-0032` | **`CLOSED`** |
| `TASK-0020` | **`VERIFIED`** |
| `M1` à `M12` | **acceptés** |
| Gel `7746fd4` **avant** le premier code `d1adcf2` | **accepté** |
| `X2`, `X3`, `X4`, `X5`, `X6` | **maintenues** |

### AC.1 Ce que le contrôle accepte

**Aucun critère n'est réinterprété, aucun `M1`–`M12` n'est modifié, aucun test
n'est rejoué.** Enregistré tel que rendu :

- les **relations inter-cerveaux explicites**;
- le **magasin commun** `brains/interbrain/relations.sqlite`;
- **`cek1` uniquement comme repli déclaré**, **PAS** comme `I-E` complète;
- l'**approbation `XB-S01`** et les **contraintes `SQLite`**;
- la **navigation inter-cerveaux**, cerveau **affiché** et **hors de la vue**;
- le **rebuild des trois index**, **digest inchangé**, **0** extrémité non
  résolue;
- **`M12` en deux passes** dans le vrai `WebView2`;
- les **régressions `J12` intra** et **`L12` composée**.

### AC.2 Aucune preuve n'a été touchée par cette clôture

**Intervention documentaire seulement.** `M12`, `J12`, `L12` et `H9` n'ont
**pas** été rejoués; **aucun artefact de preuve `TASK-0020` n'a été modifié**;
**aucun code produit n'a été modifié**; **aucune décision produit n'a été
modifiée**.

### AC.3 `X5` s'étend — mais pas encore dans les gardes

`TASK-0020` étant `VERIFIED`, ses **cinq** preuves —
`TASK-0020-M12-interbrain-relations-webview2-pass{1,2}.json`,
`TASK-0020-J12-intrabrain-regression-webview2.json`,
`TASK-0020-L12-composed-regression-webview2-pass{1,2}.json` — deviennent
**canoniques** au sens de la règle du 2026-09-01.

**Les gardes n'ont PAS été étendues ici.** La **tâche de réalignement à venir
devra commencer par protéger ces preuves** — porte Rust `write_run_artifact`,
`src/map/runArtifacts.ts`, `scripts/protected-run-artifacts.ps1` — **avant
toute autre écriture de preuve.**

### AC.4 Ce que cette entrée ne lève pas

**Aucune campagne `H9`**, aucun seuil : **`R8` entière**. **`I-E` complète**
hors périmètre. **Aucune détection automatique** entre cerveaux. **`P-19`**,
**`P-21`** demeurent, **`P-04`** reste PARTIELLE. **`B0`** n'est pas corrigé.
**`V1`–`V4`, `W1`–`W4`, `R2`–`R9`** restent en vigueur.

## `TASK-0021` — réalignement produit, `IMPLEMENTED` le 2026-09-02

**Intervention DOCUMENTAIRE, avec une seule exception de code : les gardes
`X5`.** Ce qui suit distingue strictement ce qui a été **exécuté** de ce qui ne
l'a pas été.

### AD.1 Ce qui a été exécuté — gardes `X5` seulement

| Contrôle | Commande | Résultat |
|---|---|---|
| Gardes `X5` TypeScript | `npx vitest run src/map/runArtifacts.test.ts` | **14 tests, 14 passés** |
| Gardes `X5` Rust | `CARGO_INCREMENTAL=0 cargo test --lib map::commands::tests` | **14 tests, 14 passés**, dont `task_0020s_own_evidence_became_protected_when_it_was_verified` |
| Garde `X5` PowerShell | chargement de `scripts/protected-run-artifacts.ps1` | **19** noms; les **cinq** preuves `TASK-0020` sont **refusées**; les variantes `-abandon` **passent** |
| Preuves intactes | `git status --porcelain docs/performance/runs/` | **vide** — aucun artefact touché |

**La liste protégée passe de 14 à 19 noms**, identiquement dans les trois
gardes : porte Rust `write_run_artifact`, `src/map/runArtifacts.ts`,
`scripts/protected-run-artifacts.ps1`.

**`B0` s'est reproduit une sixième fois** — panique interne du compilateur au
premier `cargo test`, en compilation incrémentale. `CARGO_INCREMENTAL=0` suffit
à contourner (`DEC-0013` E). **Rien n'a été supprimé ni renommé dans
`src-tauri/target/`.**

### AD.2 Ce que l'extension des gardes change, dit franchement

C'est la **première** extension d'`X5` dont les noms sont **encore employés
comme destinations** par le runtime livré. `crossScenario`, `relationScenario`
et `composedScenario` les demandent, et la porte répond désormais **non** : les
boutons `M12`, `J12` et `L12` **n'écrivent plus**, et les scripts de campagne
refusent de supprimer une copie périmée avant une passe.

**C'est le résultat voulu, pas un défaut.** `TASK-0020` est close et
contrôlée. Une tranche qui aurait besoin de rejouer l'un de ces scénarios
**republie sous son propre nom de tâche**, comme `TASK-0020` l'a fait pour
`TASK-0019`. Le constant `SEALED_RUNTIME_DESTINATIONS` nomme les cinq, et un
test asserte que l'intersection des deux listes vaut **exactement** ces cinq —
ni une sixième destination scellée sans qu'on le voie, ni l'une des cinq
silencieusement libérée.

### AD.3 Ce qui n'a PAS été exécuté

- **Aucune campagne `WebView2`** : ni `M12`, ni `J12`, ni `L12`, ni `H9`.
  **`R8` entière**, aucun seuil, aucune mesure.
- **La suite complète `vitest` et `cargo test` n'a PAS été exécutée.** Seuls
  les deux fichiers de garde `X5` l'ont été. Aucun autre code n'a été touché,
  mais ce n'est pas la même chose que de l'avoir vérifié.
- **Aucune cible de `DEC-0019` à `DEC-0023` n'est prouvée.** Ce sont des
  **cibles à falsifier** : aucun layout, aucun moteur de règles, aucune
  suggestion, aucune IA, aucune identité, aucune permission n'existe.

### AD.4 Contrôles documentaires — par relecture, non exécutés

| # | Contrôle | Constat |
|---|---|---|
| `N3` | Matrice sans trou ni doublon | **49** lignes, `F-001` à `F-049`; `MVP` 41, `ULTÉRIEUR` 3, `DIFFÉRÉ` 5 |
| `N4` | Contrat de parité | **22** exigences, inchangé en nombre; `P-02` **corrigée** par `P02-R1`, ancienne formulation **conservée et visible**; `P-01`, `P-03` à `P-22` **inchangées** |
| `N5` | Traçabilité normative | `F-042` → `DEC-0020`; `F-043` à `F-046` → `DEC-0021`; `F-047` → `DEC-0022`; `F-048`, `F-049` → `DEC-0023`; `P02-R1` → `DEC-0020` |
| — | Classifications existantes | **aucune** n'a changé, **aucune** n'est descendue, **aucune** n'a disparu |
| — | Comportement cible | `F-007` et `F-008` **modifiés** sous `DEC-0020`, **déclarés**, **classification inchangée** |

### AD.5 Ce que cette entrée ne lève pas

**`R8` entière.** **`I-E` complète** hors périmètre; **`cek1`** reste le repli
déclaré. **`P-19`**, **`P-21`** demeurent; **`P-04`** reste **PARTIELLE**;
**`P-02` n'est pas satisfaite**, sous sa formulation corrigée. **`B0`** n'est
pas corrigé. **`V1`–`V4`, `W1`–`W4`, `R2`–`R9`** restent en vigueur.
**`TASK-0021` n'est PAS `VERIFIED`** : elle attend un contrôle indépendant.


## `ACTION-0033` — contrôle indépendant de `TASK-0021` : `CHANGES_REQUIRED`, réserve `X7` (2026-09-02)

- **Fiche :** [`ACTION-0033`](../reviews/ACTION-0033-independent-control.md)
- **Contrôleur :** **orchestrateur technique indépendant**, instance
  **distincte** de l'exécuteur. **Le verdict est enregistré, non rendu, par
  l'exécuteur.**
- **`HEAD` contrôlé :** `68211c83c2390a250d6b9a42679202ee14782977`
- **Verdict :** **`CHANGES_REQUIRED`** — réserve **`X7`**, **`OPEN`**.
  **`TASK-0021` reste `IMPLEMENTED`**; **`VERIFIED` interdit avant re-contrôle
  indépendant ciblé.**

### AE.1 Fond accepté en entier

Gardes `X5` à **19** preuves; ordre des commits `aeee5a8` **avant** `7f97fc6`;
`DEC-0019` à `DEC-0023`; nouvelle direction topographique; **correction de fond
de `P-02`**; moteur déterministe sans IA; workflow humain de validation; IA
facultative `BYOK`; architecture mono/multi-utilisateur et permissions; matrice
`F-001` à `F-049`; séquence future proposée. **Aucune de ces cibles n'est
considérée implémentée.**

### AE.2 La réserve `X7` — collision d'identifiant

`X2` désigne **déjà** la réserve technique de `TASK-0016`, `CLOSED` par
[`ACTION-0026`](../reviews/ACTION-0026-independent-control.md). `TASK-0021`
avait **réutilisé** `X2` pour la correction normative de `P-02` : **deux sens
simultanés** dans `CURRENT_STATE.md` et les documents produit. **Ambiguïté
refusée.**

**Identifiant canonique de la correction de `P-02` : `P02-R1`** — `P-02`,
révision normative 1.

### AE.3 Contrôles mécaniques de la correction — exécutés par relecture et par `git`

| # | Contrôle | Constat |
|---|---|---|
| `G1` | Toute référence à la révision de `P-02` utilise `P02-R1` | **TENU** — **22** occurrences, **12** fichiers |
| `G2` | `X2` historique de `TASK-0016` intact et univoque | **TENU** — `ACTION-0026` et `TASK-0016` **non modifiés** |
| `G3` | Aucune occurrence de `X2` employé comme nom de la révision de `P-02` | **TENU** — recherche vide |
| `G4` | `P-02` inchangée sur le fond | **TENU** — `git diff --word-diff` : **22** retraits `X2`, **22** ajouts `P02-R1`, **aucun autre mot** |
| `G5` | `DEC-0019`–`DEC-0023` inchangées sur le fond | **TENU** — seul `DEC-0020`, **deux** lignes de nomenclature |
| `G6` | Matrice | **TENU** — **49** identifiants, **49** uniques, `F-001`–`F-049`, aucun trou, aucun doublon; `MVP` **41**, `ULTÉRIEUR` **3**, `DIFFÉRÉ` **5**; contrat **22** exigences |
| `G7` | Aucune preuve historique modifiée | **TENU** — `git status docs/performance/runs/` **vide** |
| `G8` | Aucun code produit modifié | **TENU** — `git status src/ src-tauri/ scripts/` **vide** |
| `G9` | Aucune garde `X5` modifiée | **TENU** — les trois fichiers de garde **non modifiés** (`git status` vide); `scripts/protected-run-artifacts.ps1` compte toujours **19** noms |
| `G10` | `main` intacte | **TENU** — `91bbe90f0f99026c28cd345784d4f579a0016db2` |

### AE.4 Non testé, volontairement

**Aucun `WebView2`**, **aucun `H9`**, **aucun test produit**, **aucun build**.
La correction est **strictement documentaire** et **rien n'a été exécuté**.

### AE.5 Ce que cette entrée ne lève pas

**`X7` reste `OPEN`** — **l'exécuteur ne la ferme pas et ne se prononce pas sur
sa correction**. **`TASK-0021` n'est PAS `VERIFIED`.** **`R8` entière**;
**`I-E` complète** hors périmètre, **`cek1`** repli déclaré; **`P-19`**,
**`P-21`** demeurent; **`P-04`** reste **PARTIELLE**; **`P-02` n'est pas
satisfaite**; **`B0`** n'est pas corrigé. **`V1`–`V4`, `W1`–`W4`, `R2`–`R9`**
restent en vigueur.


## `ACTION-0034` — re-contrôle indépendant ciblé de `X7` : `CLOSED`, `TASK-0021` `VERIFIED` (2026-09-02)

- **Fiche :**
  [`ACTION-0034`](../reviews/ACTION-0034-independent-recontrol.md)
- **Contrôleur :** **orchestrateur technique indépendant**, instance
  **distincte** de l'exécuteur. **Le verdict est enregistré, non rendu, par
  l'exécuteur.**
- **`HEAD` contrôlé :** `10cf54e31276edeb00bd99a5586578791d7b5bc2`
- **Verdict :** **`CLOSED`** — **`X7` `CLOSED`**, **`ACTION-0033` `CLOSED`**,
  **`TASK-0021` `VERIFIED`**
- **`main` :** `91bbe90f0f99026c28cd345784d4f579a0016db2`, **intacte**

### AF.1 Motif retenu — la collision documentaire est éliminée

Les **sept** points que
[`NEXT_ACTION`](NEXT_ACTION.md) avait gelés comme périmètre du re-contrôle
sont **TENUS**. **Aucun autre point n'a été rouvert.**

| # | Point re-contrôlé | Constat |
|---|---|---|
| 1 | La révision normative de `P-02` s'appelle `P02-R1` | **TENU** |
| 2 | Aucune référence à cette révision n'utilise encore `X2` | **TENU** |
| 3 | Le `X2` historique de `TASK-0016` reste `X2`, **`CLOSED`** | **TENU** |
| 4 | `P-02` inchangée sur le fond — **huit** contrôles identiques | **TENU** |
| 5 | `DEC-0019` à `DEC-0023` inchangées sur le fond | **TENU** |
| 6 | Matrice `F-001`–`F-049`, **49** uniques, `MVP` **41**, `ULTÉRIEUR` **3**, `DIFFÉRÉ` **5** | **TENU** |
| 7 | Aucune preuve historique, aucun code produit, aucune garde `X5` modifiés; `main` intacte | **TENU** |

### AF.2 Ce que ce `VERIFIED` atteste — et ce qu'il n'atteste pas

**`TASK-0021` est un livrable DOCUMENTAIRE.** `VERIFIED` atteste que la
**cible est correctement écrite** et que sa nomenclature est **non ambiguë**.

**Il n'atteste AUCUNE implémentation.** **Aucune** cible de `DEC-0019` à
`DEC-0023` n'est prouvée : ce sont des **cibles à falsifier**. **`P-02` n'est
pas satisfaite**, sous sa formulation corrigée **`P02-R1`**; le contrat reste à
**22** exigences.

### AF.3 Non testé, volontairement

**Aucun `WebView2`**, **aucun `H9`**, **aucun test produit**, **aucun build**,
**aucun rejeu** de `M12`, `J12` ou `L12`. Le re-contrôle porte sur des
**documents publiés**, à `HEAD` `10cf54e`, et **rien n'a été exécuté**.

### AF.4 Ce que cette entrée ne lève pas

**`R8` entière.** **`I-E` complète** hors périmètre, **`cek1`** repli déclaré;
**`P-19`**, **`P-21`** demeurent; **`P-04`** reste **PARTIELLE**; **`B0`**
n'est pas corrigé. **`V1`–`V4`, `W1`–`W4`, `R2`–`R9`** restent en vigueur.
Aucune autorisation de **fusion vers `main`**, de `PR`, de **release**,
d'**étiquette**, de `force push` ni de réécriture d'historique.

---

## AG. TASK-0022 — topographie à cartes et connexions explicites

**Date :** 2026-09-03. **État exécutant :** `IMPLEMENTED`, jamais
`VERIFIED`. **Gel :** `289cf9b`, poussé avant le code produit.

| Contrôle | Résultat | Preuve |
|---|---|---|
| N1 moteur/version | **PASS** | schéma 3, `layered-tree-cards-v1`, v2 reconstruit, invocation 1 |
| N2 exactitude | **PASS** | quatre fixtures, une racine, `edgeCount = nodeCount - 1` |
| N3 géométrie | **PASS** | cartes 240 × 64, x par profondeur, zéro collision |
| N4 déterminisme | **PASS** | rects/sérialisation/digest identiques aux rebuilds |
| N5 P02-R1 | **PASS exécutant** | huit contrôles couverts; verdict indépendant attendu |
| N6 cartes/labels | **PASS** | formes non-couleur, titre/ARIA complet, label sélectionné |
| N7 vue | **PASS** | pan/zoom/fit/reset réels; rects inchangés |
| N8 intra | **PASS** | comptes/provenance/suggestions conservés; ancres bord à bord |
| N9 multibrain | **PASS** | C2/C3, un SVG, géométrie Alpha/Gamma identique, DOM distinct |
| N10 interbrain | **PASS** | visible/hors vue, auto-ajout, cible exacte, aucune inverse |
| N11 rebuild/stores | **PASS** | stores et approbations intacts, zéro endpoint non résolu |
| N12 read-only | **PASS** | empreintes identiques, zéro état sous source |
| N13 X5 | **PASS** | 19 preuves protégées, zéro modification depuis `c16396d` |
| N14 global | **PASS** | suites complètes, check/build/Tauri, aucune dépendance |
| N15 hôte réel | **PASS** | deux processus, même variante, WebView2 `152.0.4191.53` |

Validations finales : `cargo test --lib` avec `CARGO_INCREMENTAL=0` — **149
passés**; `pnpm test` — **188 passés**; `pnpm check` — **PASS**; `pnpm build`
— **PASS**; `pnpm tauri build --debug --no-bundle` — **PASS**.

Artefacts : `TASK-0022-N15-topographic-node-graph-webview2-pass{1,2}.json`,
`TASK-0022-J12-intrabrain-relations-regression-webview2.json`,
`TASK-0022-K11-readonly-isolation-regression-webview2.json`,
`TASK-0022-L12-composed-view-regression-webview2-pass{1,2}.json`,
`TASK-0022-M12-interbrain-relations-regression-webview2-pass{1,2}.json`.

N15 relève `isTrusted = true` pour les frappes et activations applicables,
zéro `HTMLElement.click()`, zéro dispatch de clic, zéro collision Beta, six
relations inter déterministes, XB-S01 `APPROVED` après rebuild/redémarrage,
zéro extrémité non résolue et zéro artefact dans les racines analysées.

**B0 observé :** ICE incrémental `rustc 1.98.0`; succès avec
`CARGO_INCREMENTAL=0`. B0 n'est pas corrigé. **Non testé volontairement :**
H9 et seuils de performance; `F-042`; données réelles/picker; release.

## ACTION-0035 — correction X8 et rejeu M12 — 2026-09-03

Périmètre : la **seule** réserve `X8` de `ACTION-0035`. Ni le layout, ni le
schéma `3`, ni `DEC-0024`, ni `N1` à `N15`, ni une fixture n'ont été touchés.

| Contrôle | Résultat | Preuve |
|---|---|---|
| Garde `X8` — aucune source d'écriture ne code en dur un préfixe de tâche ni un compte protégé | **PASS** | `src/map/runArtifacts.test.ts`; **échoue** sur `crossScenario.ts` restauré depuis `f6f0214` |
| Parité liste protégée TypeScript ↔ garde Rust canonique | **PASS** | noms, ordre et longueur déclarée `[&str; 19]` identiques |
| 19 noms historiques protégés, nommés un à un, aucun retiré | **PASS** | `runArtifacts.test.ts` bloc `X8` |
| `artifactTaskId` distingue `TASK-0020` de `TASK-0022` | **PASS** | test non tautologique |
| Artefact `M12` appartient à la tâche propriétaire et n'est pas protégé | **PASS** | `runtimeWriteOwnership()` dérivé |
| `pnpm check` | **PASS** | `tsc --noEmit` |
| `pnpm test` | **PASS** | **196** tests TypeScript (188 → 196) |
| Build Tauri debug `--no-bundle` | **PASS** | `CARGO_INCREMENTAL=0`, aucun clean |
| `M12` passe 1, hôte réel | **PASS** | variant neuf `task0022-m12-20260903173531-65e5a8`, WebView2 `152.0.4191.53` |
| `M12` passe 2, après fermeture et redémarrage réels | **PASS** | même variant, second processus |
| `writesUnderItsOwnTaskOnly` **dérivé** | **`true`** | `step28`, non écrit en dur |
| `protectedArtifactCount` | **19** | longueur de la liste, jamais une constante |
| Aucune affirmation « 14 protected names » | **PASS** | absente des deux artefacts et du produit |
| Critères §8 non régressés | **PASS** | passe 1 : **1** feuille différente (`step7…waitedMs` 1180 → 958, gigue); passe 2 : **11**, toutes dans `step28` |
| 19 preuves protégées inchangées | **PASS** | empreintes `sha256` identiques avant/après |
| `main` intacte | **PASS** | `91bbe90f0f99026c28cd345784d4f579a0016db2` |

**Non testé volontairement**, hors périmètre de `X8` : `N15`, `J12`, `K11`,
`L12`, `H9`, la suite Rust — aucun source Rust modifié — et tout rejeu non
nécessaire. **B0** inchangé : contourné par `CARGO_INCREMENTAL=0`, non corrigé.
Aucune nouvelle dépendance.

---

## AH. ACTION-0036 — re-contrôle X8 enregistré et X5 étendue à 27

**Date :** 2026-09-03. **Verdict indépendant enregistré :** `ACTION-0036`,
`X8` et `ACTION-0035` **`CLOSED`**; `TASK-0022` **`VERIFIED`**. Verdict rendu
par l'orchestrateur technique indépendant sur le HEAD
`645b9484790f8e766f7eed93107b9431d144aaa6` et le commit substantif `X8`
`d6963e65e9829b8c17196eeb469eabfb3aa86aeb`, non par Codex.

| Contrôle ciblé | Résultat | Preuve |
|---|---|---|
| Parité Rust / TypeScript / PowerShell | **PASS** | `runArtifacts.test.ts` compare noms, ordre et longueur des trois listes |
| Nombre protégé exact | **PASS** | `[&str; 27]`; 27 noms dans chaque garde |
| Anciens noms conservés | **PASS** | les 19 noms antérieurs sont énumérés et présents dans les trois gardes |
| Nouvelles preuves exactes | **PASS** | exactement J12, K11, L12 pass1/pass2, M12 pass1/pass2 et N15 pass1/pass2 de `TASK-0022` |
| Aucune destination supplémentaire scellée | **PASS** | intersection runtime/protection exactement égale aux huit preuves canoniques |
| Refus Rust sur chacun des 27 noms | **PASS** | `cargo test a_verified_tasks_evidence_is_never_a_destination` — 1/1 |
| Tests Rust `TASK-0022` | **PASS** | `cargo test task_0022` — 2/2; huit preuves refusées et variantes non canoniques non protégées |
| Tests TypeScript X5/X8 | **PASS** | `pnpm test -- src/map/runArtifacts.test.ts` — 26/26 |
| Refus PowerShell sur chacun des 27 noms | **PASS** | module dot-sourcé, `Assert-NotProtectedRunArtifact` — 27/27 refus attendus |
| H9, K12 et `-abandon` | **PASS** | exclus des trois listes; sélection représentative acceptée par la garde PowerShell |
| Preuves `TASK-0022` | **INCHANGÉES** | aucun fichier sous `docs/performance/runs/` modifié |
| `main` | **INCHANGÉE** | `91bbe90f0f99026c28cd345784d4f579a0016db2` |

La fermeture `ACTION-0036` accepte les valeurs observées au HEAD re-contrôlé :
`writesUnderItsOwnTaskOnly = true`, `protectedArtifactCount = 19` et
`protectedDestinations = []`. Après le scellement consécutif à `VERIFIED`, les
valeurs courantes dérivées deviennent respectivement `false`, `27` et les huit
destinations canoniques : la porte refuse désormais leur réécriture. Les
preuves M12 publiées ne sont pas modifiées.

**Non rejoué, conformément au périmètre :** N15, J12, K11, L12, M12 et H9.
Aucun test complet, `pnpm check`, build ou Tauri n'était demandé; aucune
nouvelle dépendance, aucun clean, aucune suppression de `target`.

---

## AI. TASK-0023 — observations exactes de contenu

**Date :** 2026-09-03. **État exécutant :** `IMPLEMENTED`, jamais
`VERIFIED`. **Gel :** `711071c`, poussé avant le code produit.

| Contrôle | Résultat | Preuve |
|---|---|---|
| EC1 moteur | **PASS** | RustCrypto `sha2 0.11.0`, `sha256-v1`, buffer 64 KiB, aucune crypto maison |
| EC2 exactitude | **PASS** | vecteurs vide, `abc`, binaire multi-chunks |
| EC3–EC5 égalité | **PASS** | mêmes octets/deux chemins et fichiers vides égaux; même taille/octets différents distincts |
| EC6 store | **PASS** | schéma SQLite 1, CHECK SQL, génération atomique, chemin `brains/<brain_id>/signals/content.sqlite` |
| EC7 isolation | **PASS** | Alpha/Gamma : deux stores, même chemin/digest, deux `BrainNodeRef` |
| EC8 lecture seule | **PASS** | fingerprints avant/après identiques; zéro artefact dans la source |
| EC9 relations | **PASS** | digest octet du store inchangé autour du hashing; comptes/digests et arêtes UI inchangés |
| EC10 rebuild | **PASS** | génération/digest/store survivent, chemin toujours résolu |
| EC11 fraîcheur | **PASS** | nouvelle génération, fichier rouvert et digest recalculé malgré métadonnées de nœud inchangées |
| EC12 instabilité | **PASS** | mutation synchronisée; `UNSTABLE_DURING_READ`, aucun digest publié; campagne globale refusée |
| EC13 atomicité | **PASS** | échec avant commit conserve intégralement la génération précédente |
| EC14 X5 | **PASS** | 27 noms identiques dans trois gardes; preuves historiques inchangées; runtime `TASK-0023`, intersection vide |
| Suite Rust complète | **PASS** | `CARGO_INCREMENTAL=0 cargo test` — **171/171** |
| Suite TypeScript complète | **PASS** | `pnpm test` — **208/208** |
| Typecheck et build | **PASS** | `pnpm check`; `pnpm build` |
| Tauri debug | **PASS** | `pnpm tauri build --debug --no-bundle`, WebView2 réel disponible |
| EC15 passe 1 | **PASS** | vrai processus; 8 FILE hashés, 3 dossiers exclus, stores Alpha/Gamma distincts, interactions fiables, rebuild persistant |
| EC15 passe 2 | **PASS** | nouveau processus/même variant; UI stale honnête; 8 ouvertures, 1 424 octets relus, 8 digests recalculés |

Artefacts :
`TASK-0023-EC15-exact-content-observations-webview2-pass1.json` et
`TASK-0023-EC15-exact-content-observations-webview2-pass2.json`, WebView2
`152.0.4191.62`. Ils ne sont pas ajoutés à X5 avant contrôle indépendant.

Le lockfile ajoute exactement `sha2 0.11.0` et cinq transitives nécessaires :
`digest 0.11.3`, `block-buffer 0.12.1`, `crypto-common 0.2.2`,
`hybrid-array 0.4.14`, `cpufeatures 0.3.1`; aucune dépendance existante n'est
mise à jour. `windows-sys` n'est pas ajouté comme dépendance de production.

**Non testé / limites :** aucune donnée réelle, identité physique Windows,
hydratation B4, watcher, moteur F-043, règle `same-hash`, suggestion, IA, H9
ou seuil de volumétrie. Les scénarios N15/J12/K11/L12/M12 n'ont pas été
rejoués, car leurs structures n'ont reçu que la migration de destination; les
suites complètes couvrent leurs gardes. `DEC-0013/F`, R8 et B0 restent
ouverts; B0 contourné par `CARGO_INCREMENTAL=0`, sans clean.

---

## AJ. ACTION-0037 — contrôle indépendant de TASK-0023 et correction ciblée X9

**Date :** 2026-09-04. **Verdict enregistré, non rendu par l'exécuteur :**
`ACTION-0037` = `CHANGES_REQUIRED`, `TASK-0023` = `IMPLEMENTED`,
`X9` = `OPEN`. HEAD contrôlé `12b3c87`.

`X9` : le fingerprint **global de campagne** appelait encore
`fixtures::fingerprint(root)`, qui suit un symlink fichier par `fs::read` — donc
peut lire hors de la racine — et accumule tous les contenus dans un `Vec<u8>`,
donc n'est pas à mémoire bornée. Aucun autre élément accepté de `TASK-0023`
n'est rouvert.

### AJ.1 Correction livrée

| Contrôle | Résultat | Preuve |
|---|---|---|
| Nouvelle primitive dédiée | **PASS** | `content_signals::content_source_fingerprint`, publiée `sha256-tree-v1:<64 hex minuscules>`; `sha256-v1` reste le digest d'un fichier |
| Campagne branchée | **PASS** | `observe_root_with_hook` n'utilise plus que la nouvelle primitive pour `sourceFingerprintBefore`/`After`; les usages de `map/commands.rs` sont inchangés |
| Confinement structurel | **PASS** | `symlink_metadata` seul; symlink, jonction et reparse point sont marqués **lien**, jamais ouverts, lus, parcourus ni canonicalisés; type non interprétable = non traversable |
| Jonction Windows réelle | **PASS** | `a_windows_junction_out_of_the_root_is_never_entered` : jonction `mklink /J` créée sans privilège, classée `TREE_MARKER_LINK`; l'agrandissement de la cible **hors racine** ne change pas l'empreinte; l'ancien moteur échouait ici en `Accès refusé` |
| Détection reparse déterministe | **PASS** | `windows_reparse_attribute_detection_is_deterministic` sur `FILE_ATTRIBUTE_REPARSE_POINT`, et `a_reparse_point_is_a_link_even_when_it_looks_like_a_directory` sur la classification pure |
| Mémoire bornée / streaming | **PASS** | `the_source_fingerprint_streams_files_in_bounded_chunks` : observateur de lectures sur un fichier de `2 × 64 KiB + 17`; ≥ 3 chunks, chacun ≤ 64 KiB, somme = taille; aucun `fs::read` de contenu |
| Déterminisme et indépendance de chemin | **PASS** | même arbre → même valeur; mutation de même taille et entrée ajoutée → valeurs différentes; racine renommée → valeur identique; aucun chemin absolu publié |
| Campagne | **PASS** | `the_campaign_publishes_the_confined_tree_fingerprint` : préfixe, 64 hex minuscules, `before == after`, valeur reprise par le store |
| `SOURCE_CHANGED_DURING_OBSERVATION` | **PASS** | invariant EC12/EC13 inchangé : `source_change_before_final_fingerprint_refuses_the_generation` et `unstable_read_never_publishes_a_digest` passent |
| Fingerprint historique | **PASS** | `fixtures::fingerprint` non modifiée; seul son commentaire documente les deux rôles; preuves `TASK-0016`..`TASK-0022` inchangées |
| Suite Rust complète | **PASS** | `CARGO_INCREMENTAL=0 cargo test` — **178/178** (171 avant, +7 exécutés sur cet hôte) |
| Suite TypeScript complète | **PASS** | `pnpm test` — **208/208** |
| Typecheck et build | **PASS** | `pnpm check`; `pnpm build` |
| Tauri debug | **PASS** | `pnpm tauri build --debug --no-bundle` |
| EC15 passe 1 | **PASS** | vrai processus WebView2 `152.0.4191.62`; variante fraîche `task0023-ec15-x9-20260904145356-6ebb99`; 8 FILE, 3 dossiers non hashés, `sha256-v1`, stores Alpha/Gamma distincts, même digest par `relative_path`, aucune relation créée, rebuild persistant, `readOnlyConfirmed = true` |
| EC15 passe 2 | **PASS** | nouveau processus réel, même variante; « Dernière observation enregistrée »; nouveau `generationId`; 8 ouvertures, 1 424 octets relus, 8 digests = `hashedCount`; relations inchangées |
| Nouveau format dans les preuves | **PASS** | `sourceFingerprintBefore == sourceFingerprintAfter == sha256-tree-v1:85f73748…` dans les deux artefacts et dans `persistedBefore` |
| X5 | **PASS** | 27 noms identiques et dans le même ordre dans les gardes Rust, TypeScript et PowerShell; les 27 preuves protégées bit-for-bit inchangées; `protectedDestinations = []`, `writesUnderItsOwnTaskOnly = true`, runtime `TASK-0023` |

### AJ.2 Non testé et limites

- Les quatre tests `#[cfg(unix)]` de non-suivi de lien — lien fichier vers
  l'extérieur, lien fichier pendouillant, lien de répertoire, campagne sur lien
  pendouillant — **ne sont pas compilés sur cet hôte Windows** : ils sont
  écrits, jamais exécutés ici. Sur Windows, la création de `symlink_file` /
  `symlink_dir` a été **refusée faute de privilège**, donc
  `the_source_fingerprint_never_follows_windows_links_when_creation_is_allowed`
  s'est arrêté avant sa preuve. La preuve réellement exécutée du non-suivi est
  la **jonction** de `AJ.1`, plus les deux tests déterministes de
  classification.
- La preuve de streaming est comportementale (compteur de lectures), pas un
  profileur mémoire; aucune dépendance n'a été ajoutée.
- `J12`, `K11`, `K12`, `L12`, `M12`, `N15` et `H9` n'ont pas été rejoués :
  leur code n'est pas touché par cette correction.
- `DEC-0013/F` reste bloquante pour l'identité physique persistante; `R8` et
  `B0` inchangés, `B0` contourné par `CARGO_INCREMENTAL=0`, sans `clean`.
- `cargo fmt --check` et `cargo clippy -D warnings` signalent des écarts
  **préexistants** sur `lib.rs`, `relations.rs`, `relation_commands.rs`,
  `brains.rs`, `cross_relations.rs`, `store.rs`, `mod.rs` et `fixtures.rs` avec
  la chaîne d'outils locale (rustfmt style 2024, clippy 1.98). **Aucun de ces
  signalements ne porte sur le code ajouté ici**, et aucun reformatage global
  n'a été fait.
- L'exécuteur de la correction **ne clôt pas `X9`** et ne s'attribue pas
  `VERIFIED`.

---

## AK. ACTION-0038 — re-contrôle X9 et correction ciblée X10

**Date :** 2026-09-04. **Verdict externe enregistré, non rendu par Codex :**
`X9 = CLOSED`, `ACTION-0038 = CHANGES_REQUIRED`, `TASK-0023 = IMPLEMENTED`,
`X10 = OPEN`. HEAD contrôlé `d017c781`; commit substantif X9 `ca90b2a`.

| Contrôle | Résultat | Preuve |
|---|---|---|
| Audit `std` Windows | **PASS** | Rust 1.98.0; `OpenOptionsExt::{custom_flags,share_mode}`, `File::metadata`; aucune nouvelle dépendance |
| Objet réellement ouvert | **PASS** | `open_path_no_follow` utilise `FILE_FLAG_OPEN_REPARSE_POINT`; classification depuis la metadata du handle |
| Composant final | **PASS** | `open_confined_regular_file` retourne le `File` autorisé; SHA-256 lit ce même handle sans rouvrir le pathname |
| Composants intermédiaires | **PASS** | racine et répertoires conservés ouverts; partage `WRITE`/`DELETE` refusé; tentative réelle de renommage de `a` refusée |
| Parcours directory | **PASS** | répertoire ouvert/classé depuis handle et gardé vivant pendant `read_dir` et récursion |
| Race fichier | **PASS** | remplacement synchronisé par symlink fichier si disponible, sinon vraie jonction; `UNSUPPORTED`, 0 ouverture de hash, 0 octet, 0 digest |
| Race répertoire | **PASS** | répertoire remplacé de façon synchronisée par vraie jonction hors racine; seuls 6 octets intérieurs lus; mutation extérieure sans effet |
| Tests content_signals | **PASS** | `CARGO_INCREMENTAL=0 cargo test content_signals --lib` — **29/29** |
| Suite Rust complète | **PASS** | `CARGO_INCREMENTAL=0 cargo test` — **181/181** |
| Suite TypeScript complète | **PASS** | `pnpm test` — **208/208** |
| Typecheck et build | **PASS** | `pnpm check`; `pnpm build` |
| Tauri debug | **PASS** | `CARGO_INCREMENTAL=0 pnpm tauri build --debug --no-bundle` |
| EC15 passe 1 | **PASS** | vrai WebView2 `152.0.4191.62`; variante fraîche `task0023-ec15-x10-20260904153755-5a40e1`; 8 fichiers, Alpha/Gamma, relations intactes |
| EC15 passe 2 | **PASS** | nouveau processus/même variante; stale UI honnête; 8 ouvertures, 1 424 octets, 8 digests |
| X5 | **PASS** | exactement 27 noms/27 uniques; preuves historiques inchangées; `protectedDestinations = []`; `writesUnderItsOwnTaskOnly = true` |
| `main` | **INCHANGÉE** | `91bbe90f0f99026c28cd345784d4f579a0016db2` |

**Non testé / limites :** le repli `#[cfg(not(windows))]` conserve le
non-suivi statique historique, mais il n'est pas déclaré race-safe et n'a pas
été compilé ni exécuté. `cargo fmt --check` signale le formatage historique
global avec rustfmt 1.98; aucun reformatage global n'a été appliqué.
`DEC-0013/F` demeure bloquante. Aucun `J12`, `K11`, `K12`, `L12`, `M12`,
`N15` ou `H9` rejoué; aucune dépendance, donnée réelle, identité persistée,
suppression `target`, clean ou action sur `main`.

L'exécuteur ne ferme pas `X10` et ne s'attribue pas `VERIFIED`.

---

## AL. ACTION-0039 — re-contrôle X10 enregistré, TASK-0023 VERIFIED et X5 étendue à 29

**Verdict indépendant enregistré, non rendu par l'exécuteur :** `X9 = CLOSED`,
`X10 = CLOSED`, `ACTION-0038 = CLOSED`, `ACTION-0039 = CLOSED`, `TASK-0023`
**`VERIFIED`**. HEAD re-contrôlé `adba6568`; commit substantif `X10`
`9e9fb37a`. Détail dans
[`ACTION-0039`](../reviews/ACTION-0039-independent-recontrol.md).

Cette action est **gouvernance et scellement seulement**. Aucun rejeu `EC15`,
`J12`, `K11`, `K12`, `L12`, `M12`, `N15` ni `H9`. Aucune modification de
`content_signals.rs`, de SHA-256, de `sha256-tree-v1`, de SQLite, du layout,
des relations, des fixtures, des JSON `EC15`, de `Cargo.toml` ni de
`Cargo.lock`.

| Contrôle | Résultat | Preuve |
|---|---|---|
| X5 — cardinal | **PASS** | `PROTECTED_RUN_ARTIFACTS` déclare et contient **29** noms, **29** uniques, dans les trois gardes |
| X5 — les 27 antérieurs | **PASS** | `PROTECTED_RUN_ARTIFACTS[..27]` égal, positionnellement, aux 27 noms d'avant, dans le même ordre (Rust `the_seal_is_the_unchanged_twenty_seven_followed_by_task_0023s_two`; TS « the protected set is the unchanged twenty-seven plus TASK-0023's two ») |
| X5 — les 2 ajoutés | **PASS** | `[27..]` = exactement les deux `EC15` de `TASK-0023`, dans les trois gardes (TS « the two newly protected names are exactly TASK-0023's EC15 proofs ») |
| X5 — refus en écriture | **PASS** | `write_run_artifact` renvoie `ArtifactRejected` sur les deux `EC15` (Rust `task_0023s_two_ec15_proofs_are_protected_after_verification`) |
| X5 — pas d'élargissement | **PASS** | les 21 autres destinations `TASK-0023` (H9/J12/K11/K12/L12/M12/N15 et `-abandon`) restent non protégées; le filtre des noms `TASK-0023` du scellement rend exactement les deux `EC15` |
| X8 — parité des trois gardes | **PASS** | Rust, TypeScript et PowerShell comparés **liste contre liste** par lecture des sources : même contenu, même ordre, `declaredLength = 29` |
| État dérivé du runtime | **PASS** | `protectedArtifactCount = 29`; `protectedDestinations` = les deux `EC15`; `writesUnderItsOwnTaskOnly = false` — état attendu et assumé après `VERIFIED` |
| `SEALED_RUNTIME_DESTINATIONS` | **PASS** | miroir mis à jour : exactement les deux `EC15`, égal à l'intersection dérivée |
| Suite Rust complète | **PASS** | `cargo test` — **184/184** (181 + 3 tests de scellement) |
| Suite TypeScript complète | **PASS** | `pnpm test` — **211/211** (208 + 3 tests de scellement); `runArtifacts.test.ts` **30/30** |
| Typecheck et build | **PASS** | `pnpm check`; `pnpm build` |
| Preuves non modifiées | **PASS** | `git status --short docs/performance/runs/` vide pendant toute la fermeture |
| `main` | **INCHANGÉE** | `91bbe90f0f99026c28cd345784d4f579a0016db2` |

**Non testé / limites :** la garantie race-safe `X10` est prouvée **sur
Windows**; le repli `#[cfg(not(windows))]` n'est pas revendiqué race-safe et
n'a pas été compilé ni exécuté. Tauri debug `--no-bundle` n'a pas été rejoué
ici : cette fermeture ne touche aucun code produit Rust hors de la constante
`X5` et de ses tests. `cargo fmt --check` reste rouge sur le formatage
historique global; aucun reformatage global. `DEC-0013/F` demeure bloquante
pour l'identité physique persistante.

---

## AM. TASK-0024 — Deterministic Relation Engine v1

**Date :** 2026-09-05. **État exécuteur : `IMPLEMENTED`, non `VERIFIED`.**

| Contrôle | Résultat | Preuve |
|---|---|---|
| DR1 — catalogue | **PASS** | exactement `core.identical-content/v1` et `core.numbered-sibling-revision-candidate/v1`; tests Rust du catalogue |
| DR2–DR4 — sens des règles | **PASS** | SHA-256 courant/non vide seulement, N-1 ancré; frères même parent/extension/préfixe et numéros consécutifs en suggestion seulement; contre-exemples Rust |
| DR5–DR8 — store/reconciliation | **PASS** | schéma 3 migré, producteur structurel, clés stables, legacy et `APPROVED` préservés, collisions comptées, rerun idempotent |
| DR9 — fraîcheur | **PASS** | snapshot map + génération contenu; `NOT_RUN`/`CURRENT`/`STALE`; sorties core stale filtrées et approbation stale refusée |
| DR10–DR11 — isolation/rebuild | **PASS** | namespace par `brain_id`, store cross-brain inchangé dans DR15; tests rebuild/approbations historiques |
| DR12 — J12 | **PASS** | vrai WebView2, `TASK-0024-J12-intrabrain-relations-regression-webview2.json`; invariants 8 déterministes, suggestions/approbation et input fiable |
| DR13 — read-only/no AI | **PASS** | campagnes confinées synthétiques, fingerprints avant/après égaux, aucune dépendance/API/IA/LLM/OCR/RAG |
| DR14 — X5 | **PASS** | 29 noms/29 uniques inchangés dans les trois gardes; `protectedDestinations=[]`; propriétaire `TASK-0024`; `main=91bbe90f` |
| DR15 passe 1 | **PASS** | vrai WebView2 `152.0.4191.62`; variante fraîche; keydown/activation fiables; 2 relations `content-identical` pour 3 fichiers; vides sautés; 1 suggestion `revision` sans score; approbation puis rerun stable |
| DR15 passe 2 | **PASS** | nouveau processus, même variante; état `CURRENT`, approbation et run retrouvés, ensembles identiques après rerun, cross-store inchangé |
| Suite Rust complète | **PASS** | `cargo test` — **197/197** |
| Suite TypeScript complète | **PASS** | `pnpm test` — **213/213** |
| Typecheck/build | **PASS** | `pnpm check`; `pnpm build`; `pnpm tauri build --debug --no-bundle` |

**Preuves canoniques nouvelles :**

- `TASK-0024-DR15-deterministic-relation-engine-webview2-pass1.json`;
- `TASK-0024-DR15-deterministic-relation-engine-webview2-pass2.json`;
- `TASK-0024-J12-intrabrain-relations-regression-webview2.json`.

**Non testé / limites :** aucun K11/K12/L12/M12/N15/H9 rejoué; aucun besoin
fonctionnel ne l'imposait au-delà de J12. Le scénario DR15 est un mécanisme de
développement explicitement TASK-0024 et sa source synthétique demeure hors
des quatre fixtures gelées. Le repli non-Windows de X10 reste non revendiqué
race-safe. `cargo fmt --check` reste rouge sur le formatage historique global;
aucun reformatage global. `DEC-0013/F` demeure bloquante; `F-044` et `F-045`
ne sont pas implémentées.

---

## AN. ACTION-0040 — contrôle indépendant de TASK-0024 et correction ciblée X11

**Statut : `TASK-0024` reste `IMPLEMENTED`.** Verdict externe enregistré, non
rendu par Claude : `ACTION-0040 = CHANGES_REQUIRED`, réserve `X11 = OPEN`.
HEAD contrôlé avant correction `2e4c9842`, commit substantif initial
`6a4a5432`. Détail dans
[`ACTION-0040`](../reviews/ACTION-0040-independent-control.md).

**Réserve X11 :** `dre-v1` était générique côté backend, mais l'interface et
les lectures intra-relations restaient bloquées par `ensure_in_scope()` /
`RELATIONS_FIXTURE = quasi-empty`; `brain-beta` (`deep`) ne pouvait pas ouvrir
le panneau, lancer l'analyse, consulter ses sorties core ni approuver une
suggestion core.

| Contrôle | Résultat | Preuve |
|---|---|---|
| Découplage legacy / core | **PASS** | `legacy_fixture_spec()` + `source_spec()`; `ensure_in_scope()` réservé à `self_check`; tests Rust `relation_commands` |
| Aucun élargissement du legacy | **PASS** | `derive()` et seeds `TASK-0017` jamais exécutés hors `quasi-empty`; `seeded = 0` et `producers = ["core-rule-engine"]` sur Bêta |
| `self_check` toujours gelé | **PASS** | refusé hors `quasi-empty`, motif `relations_out_of_scope_for_fixture`; `J12` intact |
| Ouverture générique | **PASS** | `open_relations(Bêta)` réussit; `NOT_RUN` avant run; overview valide et vide |
| Run générique sans LLM/réseau | **PASS** | `map_relation_engine_run(Bêta)` : `dre-v1`, `CURRENT`, `sourceReadOnlyConfirmed` |
| Lecture nœud générique | **PASS** | `map_relations_for_node(Bêta)` réussit; clés d'endpoint toutes `brain-beta` |
| Approbation générique | **PASS** | plus filtrée par la fixture; refus de suggestion core périmée inchangé; test Rust dédié |
| Panneau UI vivant hors legacy | **PASS** | `panelSaysOutOfScope = false`, bouton présent et activable, note legacy affichée sans rien masquer |
| Frappe clavier réelle | **PASS** | `keydownIsTrusted = true`, `activationIsTrusted = true`, `programmaticClickCalls = 0`, `programmaticClickDispatches = 0` |
| Isolation Alpha/Gamma | **PASS** | invariants legacy d'Alpha identiques avant/après; store d'Alpha non agrandi; aucun store Gamma créé |
| DR15 pass1/pass2 rejouées | **PASS** | variante fraîche; activation et approbation fiables; ensembles stables; cross-store inchangé |
| J12 réel rejoué | **PASS** | 12 établies / 8 déterministes / 4 approuvées / 4 en attente; `countsAgree`, `replayStable`, `allRejected` |
| X5 / gouvernance | **PASS** | 29 preuves inchangées; `protectedDestinations = []`; `writesUnderItsOwnTaskOnly = true`; propriétaire `TASK-0024`; `main = 91bbe90f` |
| Suite Rust complète | **PASS** | `cargo test` — **200/200** |
| Suite TypeScript complète | **PASS** | `pnpm test` — **215/215** |
| Typecheck/build | **PASS** | `pnpm check`; `pnpm build`; `pnpm tauri build --debug --no-bundle` |

**Preuve corrective, NON canonique :**
`TASK-0024-X11-generic-brain-webview2.json`. Elle ne rejoint **pas** `X5` et ne
remplace aucune des trois preuves canoniques gelées de `TASK-0024`, ce qu'elle
déclare elle-même (`canonical: false`, `joinsX5: false`, `doesNotReplace`).

**Preuves réécrites :** les deux `TASK-0024-DR15-*` et
`TASK-0024-J12-intrabrain-relations-regression-webview2.json`, qui ne sont pas
protégées tant que `TASK-0024` n'est pas `VERIFIED`.

**Non testé / limites :** `K11`, `K12`, `L12`, `M12`, `N15`, `H9` non rejoués —
aucune dépendance directe constatée. Sur `deep`, `core.identical-content` est
sautée faute de signal de contenu : **zéro sortie est un résultat valide**, et
rien ici n'affirme qu'une règle doive produire sur une source donnée. La
généricité est prouvée sur `brain-beta` / `deep`; `wide` et `mixed` ne sont pas
couverts par une preuve en hôte réel. Le repli non-Windows de `X10` reste non
revendiqué race-safe. `cargo fmt --check` reste rouge sur le formatage
historique global; aucun reformatage global. `DEC-0013/F` demeure bloquante;
`F-044`, `F-045` et `F-046` restent `PROPOSED`.

**Claude ne ferme pas `X11` et ne s'attribue pas `VERIFIED`.** Action unique
suivante : re-contrôle indépendant ciblé `X11` / `TASK-0024`.

---

## AO. ACTION-0041 — re-contrôle X11 enregistré, TASK-0024 VERIFIED et X5 étendue à 32

**Verdict indépendant enregistré, non rendu par Codex :** `X11 = CLOSED`,
`ACTION-0040 = CLOSED`, `ACTION-0041 = CLOSED`, `TASK-0024 = VERIFIED`. HEAD
re-contrôlé `f78d1bf`; commit substantif X11 `bcc10a8`. Détail dans
[`ACTION-0041`](../reviews/ACTION-0041-independent-recontrol.md).

Cette action est **gouvernance et scellement seulement**. Aucun code produit,
aucune preuve JSON et aucun critère DR1–DR15 ne sont modifiés. Aucun rejeu
WebView2, DR15, J12, X11, K11, K12, L12, M12, N15, H9 ou EC15.

| Contrôle | Résultat | Preuve |
|---|---|---|
| X5 — cardinal | **PASS** | 32 noms, 32 uniques, dans les trois gardes |
| X5 — append-only | **PASS** | les 29 anciens noms gardent exactement leur ordre; les trois preuves `TASK-0024` suivent |
| X5 — ajout exact | **PASS** | DR15 pass1, DR15 pass2 et J12 seulement |
| X5 — non-élargissement | **PASS** | X11, H9/K11/K12/L12/M12/N15/EC15 et variantes `-abandon` restent non protégés |
| Parité Rust / TypeScript / PowerShell | **PASS** | comparaison liste contre liste par `runArtifacts.test.ts` |
| Refus Rust | **PASS** | `cargo test map::commands::tests:: --lib` avec `CARGO_INCREMENTAL=0` — **22/22** |
| Tests TypeScript ciblés | **PASS final** | `pnpm exec vitest run src/map/runArtifacts.test.ts` — **33/33** |
| Contrôle PowerShell | **PASS** | 32/32 refus, 32 uniques, X11 autorisée |
| État runtime dérivé | **PASS** | `protectedArtifactCount = 32`; `protectedDestinations = exact3`; propriétaire `TASK-0024`; `writesUnderItsOwnTaskOnly = false` |
| `git diff --check` | **PASS** | aucune sortie |
| Preuves immuables | **PASS** | empreintes SHA-256 des deux DR15, de J12 et de X11 inchangées; aucun chemin sous `docs/performance/runs/` modifié |
| `main` | **INCHANGÉE** | `91bbe90f0f99026c28cd345784d4f579a0016db2` |

**Échec intermédiaire rapporté :** le premier test TypeScript ciblé a rendu
**30/33**, avec trois écarts d'ordre : l'intersection contenait les trois bons
noms mais suivait l'ordre runtime (`J12`, DR15 pass1, DR15 pass2). La dérivation
a été corrigée pour suivre l'ordre canonique X5 (DR15 pass1, pass2, J12), puis
le même test a passé **33/33**.

**Non testé / limites :** suites produit complètes, Tauri debug et WebView2 non
rejoués, conformément au périmètre de fermeture. Les résultats Rust 200/200,
TypeScript 215/215, check/build/Tauri, DR15 et J12 sont ceux de la correction
X11, enregistrés par `ACTION-0040`; ils ne sont pas revendiqués comme rejoués
ici. La garantie X10 non-Windows reste non prouvée race-safe. `DEC-0013/F`
demeure bloquante; `F-044`, `F-045`, `F-046` restent `PROPOSED`.

---

## AP. TASK-0025 — file de révision et mémoire des décisions humaines

**Statut : `IMPLEMENTED`** le 2026-09-05, **en attente de contrôle
indépendant**. L'exécuteur ne s'attribue pas `VERIFIED`. Branche
`build/v0.2-a9-suggestion-review-memory`; `main` inchangé à `91bbe90f`.

### AP.1 Ce qui est vérifié, et par quelle preuve

| Critère | Preuve | Verdict |
|---|---|---|
| `SR1` migration `v3 → v4` sans perte | Rust `migrating_a_version_3_store_preserves_every_row_and_gains_the_third_state`, `a_version_1_store_reaches_v4_and_keeps_its_matching_approval`, `a_fresh_store_is_created_at_v4_…`, `migrating_a_version_1_store_drops_the_mismatched_row_and_names_it` | vérifié |
| `SR2` trois états, au niveau du stockage | Rust `the_store_admits_exactly_pending_approved_and_rejected` | vérifié |
| `SR3` aucun `deferred` persistable | Rust `no_fourth_state_is_storable_and_deferred_is_refused_by_name`; TS `SR3 — no fourth state` | vérifié |
| `SR4` file paginée, compte exact | Rust `the_queue_publishes_an_exact_pending_count_and_complete_items`, `the_queue_is_paginated_ordered_and_clamped`; preuve `SR15` pass1 (`totalPending = 7`, `limit = maxLimit = 100`, ordre publié) | vérifié |
| `SR5` items explicables | Rust idem; TS `SR5 — every item is explainable where it is decided` | vérifié |
| `SR6` `Confirmer` → une relation `APPROVED` | preuve `SR15` pass1 : `approvedRelationsForConfirmed = 1` | vérifié |
| `SR7` `Rejeter` → aucune relation | Rust `rejecting_records_the_decision_and_writes_no_relation`, `rejecting_removes_the_item_from_the_queue_and_creates_no_relation`; preuve `SR15` pass1 | vérifié |
| `SR8` `Plus tard` ne décide rien | TS `Plus tard mutates nothing and moves to the next item`; preuve `SR15` pass1 : compte en attente 5 → 5 | vérifié |
| `SR9` rejet non reproposé au rerun | Rust `a_rejected_core_suggestion_is_never_recreated_pending_by_a_rerun`, `a_refusal_outlives_a_run_that_does_not_repropose_it`; preuve `SR15` pass1 et pass2 | vérifié |
| `SR10` approbation préservée au rerun | Rust `approved_rejected_and_pending_identities_are_counted_separately`; preuve `SR15` pass1/pass2 | vérifié |
| `SR11` décisions après redémarrage réel | preuve `SR15` pass2, **nouveau processus** : `dre-v1 = CURRENT` avant toute action, relation `APPROVED` présente, rejetée absente, reportée encore en attente | vérifié |
| `SR12` isolation entre cerveaux | Rust `a_refusal_in_one_brain_leaves_another_brains_identical_suggestion_pending`, `a_refusal_in_alpha_leaves_gammas_queue_and_store_untouched`; preuve `SR15` pass1 sur `brain-gamma` | vérifié |
| `SR13` source en lecture seule | preuve `SR15` pass1 : empreintes identiques sur deux campagnes | vérifié |
| `SR14` `X5 = 32`, runtime `TASK-0025` | gardes Rust 9/9, TS `runArtifacts` 34/34, PowerShell 32/32; les cinq artefacts publiés déclarent `protectedDestinations = []` et `owningTaskId = TASK-0025` | vérifié |
| `SR15` WebView2 réel, activations fiables | preuves `SR15` pass1/pass2 : `keydownIsTrusted` et `activationIsTrusted` vrais, `programmaticClickCalls = 0`, `programmaticClickDispatches = 0` | vérifié |

### AP.2 Suites exécutées

Rust ciblé : `map::relations` **44/44**, `map::rule_engine` **14/14**,
`map::relation_commands` **18/18**, gardes X5 **9/9**. Suite Rust complète
**221/221**. Suite TypeScript complète **233/233**, dont `runArtifacts` 34/34 et
le nouveau `reviewQueue` 14/14. `tsc --noEmit` propre, `vite build` vert, Tauri
debug `--no-bundle` construit. PowerShell : **32 refus sur 32**, 32 noms
uniques, et les cinq destinations `TASK-0025` explicitement autorisées.
`git diff --check` propre.

### AP.3 Rejeux

Rejoués sous noms `TASK-0025`, tous verts : `DR15` pass1 et pass2, `J12`
intra-brain, `X11` generic brain. Les harnais ont re-haché les 32 preuves
protégées avant et après chaque campagne : **inchangées**.

**Non rejoués, et pourquoi :** `K11`, `K12`, `L12`, `M12`, `N15`, `H9` et
`EC15`. Cette tranche ne touche ni la composition, ni la vue composée, ni les
relations inter-cerveaux, ni le graphe topographique, ni les observations de
contenu, ni la boucle de mesure. Leurs destinations ont tout de même été
migrées, parce que la garde exige qu'aucune destination runtime ne reste sous
un nom scellé.

### AP.4 Incidents de mesure, corrigés à la source

Trois corrections de **mesure**, aucune de complaisance :

1. le scénario `SR15` émettait son propre `map_open(rebuild)` pendant que la
   composition ouvrait déjà l'index — `os error 32` sous Windows. Il attend
   désormais que l'instantané réponde;
2. la seconde campagne de contenu de `SR15`, placée après le dernier run du
   moteur, laissait `dre-v1` `STALE` et aurait fait mesurer à la passe 2 un
   store périmé plutôt qu'un store redémarré. Elle est émise avant le rerun;
3. le rejeu `DR15` échantillonnait le DOM du panneau dans le même tick que la
   commande dont le panneau n'avait pas rendu le résultat. Les assertions
   attendent maintenant, avec budget, ce qui doit finir par être vrai.

Aucune n'affaiblit un critère : une règle qui n'apparaît jamais échoue toujours.

### AP.5 Non testé, inconnu, limites

- **Non testé :** aucun contrôle indépendant n'a été rendu; `TASK-0025` reste
  `IMPLEMENTED` et les deux preuves `SR15` restent hors `X5`.
- **Non testé :** `K11`, `K12`, `L12`, `M12`, `N15`, `H9`, `EC15`.
- **Inconnu :** le comportement de la migration `v3 → v4` sur un store de très
  grande taille; les stores exercés sont synthétiques et petits.
- **Limite assumée :** aucune politique automatique de réévaluation d'une
  décision. `decision_reconsider_cause` existe et reste `NULL` partout.
- **Limite assumée :** aucun état `DEFERRED` persistant en v1.
- **Inchangé :** `DEC-0013/F` demeure bloquante, `F-046` reste `PROPOSED`, et la
  garantie `X10` hors Windows reste non prouvée.

---

## AQ. ACTION-0042 — contrôle indépendant enregistré, TASK-0025 VERIFIED et X5 étendue à 34

**Verdict indépendant enregistré, non rendu par Codex :** `SR1–SR15 = PASS`,
`ACTION-0042 = CLOSED`, `TASK-0025 = VERIFIED`, sans réserve corrective
ouverte. Claude Code était l'exécuteur de `TASK-0025`; Codex enregistre le
verdict de l'orchestrateur technique indépendant et ne s'attribue pas
`VERIFIED`. Détail dans
[`ACTION-0042`](../reviews/ACTION-0042-independent-control.md).

Cette action est **enregistrement, gouvernance et scellement seulement**. Elle
ne modifie aucun comportement produit et ne rejoue aucun scénario WebView2.

| Contrôle | Résultat | Preuve |
|---|---|---|
| X5 — cardinal | **PASS** | 34 noms, 34 uniques, dans les trois gardes |
| X5 — append-only | **PASS** | les 32 anciens noms gardent exactement leur ordre; les deux `SR15` suivent, pass1 puis pass2 |
| X5 — ajout exact | **PASS** | seules `TASK-0025-SR15-…-pass1.json` et `…-pass2.json` sont ajoutées |
| X5 — non-élargissement | **PASS** | `TASK-0025-DR15-*`, `J12` et `X11` restent non protégés |
| Parité Rust / TypeScript / PowerShell | **PASS** | comparaison liste contre liste dans `runArtifacts.test.ts` |
| Refus Rust | **PASS** | `cargo test map::commands::tests::` avec `CARGO_INCREMENTAL=0` — **24/24**, 199 filtrés |
| Tests TypeScript ciblés | **PASS** | `pnpm test -- src/map/runArtifacts.test.ts` — **36/36** |
| Contrôle PowerShell | **PASS** | **34/34 refus**, 34 uniques, X11 `TASK-0025` autorisée |
| État runtime dérivé | **PASS** | `protectedArtifactCount = 34`; `protectedDestinations = exact2 SR15`; propriétaire `TASK-0025`; `writesUnderItsOwnTaskOnly = false` |
| `git diff --check` | **PASS** | aucune sortie |
| Preuves immuables | **PASS** | aucun chemin sous `docs/performance/runs/` modifié |
| `main` | **INCHANGÉE** | `91bbe90f0f99026c28cd345784d4f579a0016db2` |

Les preuves `SR15` contrôlées gardent leur état historique pré-scellement
(`protectedArtifactCount = 32`, intersection vide) : elles ne sont ni
réécrites ni maquillées après verdict. Le checkout courant dérive désormais
l'état post-scellement exact : les deux `SR15` sont protégées et refusées à
l'écriture.

**Non testé / limites :** aucune suite produit complète, aucun typecheck, aucun
build Tauri et aucun replay SR15/DR15/J12/X11 ou autre campagne historique,
conformément au périmètre de fermeture. Aucun état persistant `DEFERRED` par
conception et aucune politique automatique de réévaluation en v1. La garantie
X10 race-safe hors Windows reste non prouvée. `DEC-0013/F` demeure bloquante;
`F-046` reste `PROPOSED`.

## AR. TASK-0026 — explorateur exact borné, preuves finales et replays — 2026-09-06

**Verdict d'exécution : IMPLEMENTED.** Aucun verdict `VERIFIED` n'est attribué
par l'exécuteur; un contrôle indépendant reste requis sur `ED1` à `ED15`.

### Produit livré et frontière sémantique

- Les requêtes Rust de groupes et de membres sont triées, paginées et bornées;
  elles refusent les limites supérieures à 100.
- L'explorateur React affiche les groupes puis leurs membres, avec états vide,
  erreur et chargement, et conserve la frontière : « Contenu binaire identique
  observé. Cela ne prouve pas qu'il s'agit du même fichier physique ni d'une
  copie. »
- La migration runtime `A10` conserve les 34 protections X5 existantes et
  n'ajoute aucune écriture dans la racine analysée.

### Preuves WebView2 finales

Les huit artefacts non canoniques suivants ont été produits par des processus
Tauri/WebView2 réels :

- `TASK-0026-ED15-exact-duplicate-explorer-webview2-pass1.json` et `pass2`;
- `TASK-0026-EC15-exact-content-observations-webview2-pass1.json` et `pass2`;
- `TASK-0026-DR15-deterministic-relation-engine-webview2-pass1.json` et `pass2`;
- `TASK-0026-SR15-suggestion-review-memory-webview2-pass1.json` et `pass2`.

`ED15` utilise la même variante fraîche
`task0026-ed15-20260906115530-c6adb4` sur les deux passages : 1 200 fichiers,
125 groupes, 373 occurrences groupées et un groupe vide. Les pages de groupes
et de membres sont stables à 50/50/25, sous la limite backend de 100. Le second
passage redémarre réellement l'application, reconstruit la carte et retrouve
les 125 groupes; la seconde campagne inchangée ouvre et hache 1 200/1 200
fichiers. Les empreintes source restent stables et les stores de relations ne
changent pas.

Les quatre campagnes totalisent des activations clavier réellement mesurées,
sans clic ni `dispatchEvent` programmatique non nul : `ED15` 11 frappes et 11
activations, `EC15` pass1 7/4 puis pass2 2/1, `DR15` pass1 2/2 et `SR15` pass1
5/5. Les activations nulles d'`EC15` correspondent uniquement à la sélection
par flèches. `EC15`, `DR15` et `SR15` confirment aussi les invariants hérités :
observations distinctes, relations déterministes, décisions persistantes,
redémarrages réels et source en lecture seule.

### Stabilisation du harnais

Le premier mécanisme d'attente pouvait accepter un artefact antérieur sans
nouvelle écriture. Le runner `ED15` compare désormais l'empreinte du fichier
existant et n'accepte qu'un contenu effectivement remplacé. L'injection de
touche n'est permise que lorsque la fenêtre FileTopo exacte est au premier
plan; sinon le marqueur est différé et réessayé. Des tests de source couvrent
ces deux garanties. Les preuves `ED15` finales ont été régénérées après ces
corrections.

### Validations exécutées

| Contrôle | Résultat |
|---|---|
| Rust exact duplicate ciblé | **3/3 PASS** |
| Rust rule engine ciblé | **14/14 PASS** |
| Rust complet, `CARGO_INCREMENTAL=0` | **227/227 PASS** |
| TypeScript `ExactDuplicateExplorer` + `runArtifacts` | **42/42 PASS** |
| TypeScript complet | **241/241 PASS** |
| `pnpm check` | **PASS** |
| `pnpm build` | **PASS**, 61 modules, JS ~403,35 KB |
| Tauri debug `--no-bundle` | **PASS**, WebView2 152.0.4191.66 |
| X5 PowerShell | **34/34 refus**, 34 noms uniques, probe TASK-0026 autorisée |
| Intersection TASK-0026 / X5 | **vide**; propriétaire runtime TASK-0026 |
| Artefacts X5 modifiés | **0** depuis `a691813` |
| `git diff --check` | **PASS** |
| `origin/main` | **inchangée** à `91bbe90f0f99026c28cd345784d4f579a0016db2` |

**Non testé / limites :** aucun contrôle indépendant n'a encore été exécuté;
les huit preuves restent non canoniques et hors X5. L'identité physique
persistante reste exclue et bloquée par `DEC-0013/F`; `F-046` reste
`PROPOSED`. La garantie X10 race-safe hors Windows reste non prouvée. Les deux
avertissements Rust existants (`SUGGESTION_STATES` inutilisé et message de
bibliothèque du linker) sont non bloquants.

---

## ACTION-0043 — contrôle indépendant de TASK-0026 et scellement X5 — 2026-09-06

**Agent :** Claude Code, rédacteur de l'enregistrement et du scellement.
**Verdict :** rendu par l'orchestrateur technique indépendant, instance
distincte de l'exécuteur Codex. `ED1–ED15 = PASS`, `ACTION-0043 = CLOSED`,
`TASK-0026 = VERIFIED`.

### Validations exécutées

| Contrôle | Résultat |
|---|---|
| `runArtifacts.test.ts` — gardes X5/X8 | **44/44 PASS** |
| Rust ciblés `map::commands::tests::` | **26/26 PASS**, 203 filtrés |
| Rust complet | **229/229 PASS** |
| TypeScript complet | **246/246 PASS** |
| `pnpm check` — `tsc --noEmit` | **PASS** |
| X5 PowerShell | **36/36 refus**, 36 noms uniques, six replays `TASK-0026` autorisés |
| Parité Rust / TypeScript / PowerShell | **PASS** — 36 noms, même ordre |
| Intersection runtime / X5 | **exactement les deux `ED15`**, comme attendu après scellement |
| Artefacts X5 modifiés | **0** — aucun chemin sous `docs/performance/runs/` touché |
| `git diff --check` | **PASS** |
| `main` locale | **inchangée** à `91bbe90f0f99026c28cd345784d4f579a0016db2` |

Les comptes montent — Rust 227 → **229**, TypeScript 241 → **246** — parce que
des tests ont été ajoutés pour démontrer le scellement et tenir la réparation
ci-dessous. Aucun test existant n'a été supprimé ni affaibli.

### Défaut trouvé et réparé pendant le scellement

`tsc` a refusé le passage à 36 : quatre scénarios d'écriture
(`dreScenario`, `exactDuplicateScenario`, `genericRelationScenario`,
`reviewScenario`) exigeaient `PROTECTED_RUN_ARTIFACTS.length === 34`, une
intersection vide et `writesUnderItsOwnTaskOnly` avant d'écrire. Ces trois
faits ne sont vrais qu'entre deux scellements; à 36 ils deviennent faux et les
quatre scénarios auraient avorté, rendant injouables les six replays qui
doivent rester rejouables. La précondition porte désormais sur le **nom que le
scénario s'apprête à écrire**, invariant qui ne pourrit pas. Deux tests `X5`
nouveaux interdisent le retour du littéral et exigent le contrôle par nom.

### Non testé / limites

- Le refus effectif d'une écriture `ED15` **par le harnais réel en hôte
  WebView2** n'a pas été rejoué : il est démontré par les tests Rust et
  TypeScript de la garde, qui exercent le refus avant tout accès disque.
- **Aucun replay WebView2**, aucune campagne `ED15`, `EC15`, `DR15` ni `SR15`,
  et **aucun build Tauri** ni `pnpm build` n'ont été refaits pour cette
  fermeture.
- `F-046` reste `PROPOSED`; l'identité physique persistante reste exclue et
  bloquée par `DEC-0013/F`. La garantie X10 race-safe hors Windows reste non
  prouvée.
- `origin/main` porte `1a7d652c`, un commit de documentation du propriétaire du
  dépôt daté du 2026-09-06, extérieur à cette branche et à cette fermeture.

---

## AS. TASK-0027 — réalignement d'architecture à grande échelle — 2026-09-06

**Nature :** tranche **documentaire / architecture uniquement**. **Aucune
implémentation produit, aucune mesure, aucun test exécuté.** Les seules
validations possibles ici sont **documentaires**, et elles sont énumérées
telles quelles.

**Statut livré :** `TASK-0027` = **`IMPLEMENTED`**, **contrôle indépendant
requis**. `DEC-0029` = **`APPROVED`** — enregistrée, **jamais prouvée comme
performance**. L'exécuteur ne s'attribue pas `VERIFIED`.

### Préconditions contrôlées avant écriture

| Contrôle | Constat |
|---|---|
| Racine Git | `C:/Users/Vatfaire/Documents/TopographicDocumentMap` |
| Branche de départ | `build/v0.2-a10-exact-duplicate-explorer` |
| Arbre local | **propre** |
| `git fetch origin` | exécuté |
| Fast-forward | **`Already up to date`** |
| `HEAD` d'orchestration | `b5809424bfa5c34f956dbe76c0b96777b84dc5fa` |
| Parent direct exigé | `ffa950452e78cc2fc39678d9d0819527e3a12b21` — **conforme** |
| `X5` | **36** entrées comptées dans `src/map/runArtifacts.ts` |
| `TASK-0027` / `DEC-0029` préexistantes | **aucune** |
| `origin/main` | `1a7d652ca48281c1687f6d1404c56a1404df91d8` |
| Branche de travail | `build/v0.2-a11-progressive-scale-architecture`, créée et publiée |

**Aucune condition de `STOP / BLOCKED` rencontrée.**

### Validations documentaires effectuées

| Contrôle | Résultat |
|---|---|
| Liens relatifs des trois nouveaux documents | **PASS** — chaque cible existe |
| Contradiction vision / roadmap / parité / matrice / baseline / décision | **aucune trouvée** |
| `F-042` classée identiquement partout | **PASS** — `MVP` dans `FEATURE_MATRIX.md`, `REQUIREMENTS_BASELINE.md` et `DEC-0029`; valeur d'origine `ULTÉRIEUR` conservée en note, non concurrente |
| Identifiants `F` sans trou ni doublon | **PASS** — `F-001` à `F-051` |
| Contrat de parité | **22 exigences**, inchangé; `P-01`/`P-02`/`P-03` amendées par `P-SCALE-R1`, formulations d'origine conservées et visibles |
| Graphify comme dépendance ou roadmap d'intégration | **aucune occurrence** — `NOT INTEGRATED` partout |
| Chiffre 10k / 100k / 1M présenté comme mesuré | **aucun** — tous déclarés cibles non mesurées |
| Changement sous `src/`, `src-tauri/`, `scripts/`, `graph/`, `docs/performance/runs/` | **aucun** |
| `X5` après écriture | **36**, inchangé |
| `MAX_NODES_PER_MAP` | **`5_000`, inchangé** dans `src-tauri/src/map/mod.rs` |
| `origin/main` | `1a7d652c...`, **non touché** |
| `git diff --check` | **PASS** |

### Non testé / limites

- **Aucune performance mesurée.** Les niveaux **10 000**, **100 000** et
  **1 000 000** sont des **cibles de validation futures**, pas des résultats.
  Aucun banc n'a été exécuté, aucun profil matériel n'a été gelé.
- **Materializer, budget de vue, LOD et agrégats non implémentés.** Ils
  n'existent que comme cibles écrites.
- **Aucune suite de tests rejouée**, aucun build Tauri, aucun `pnpm build`,
  aucun replay WebView2, aucune campagne `ED15`, `EC15`, `DR15` ni `SR15`. La
  tâche ne touche aucun code : aucune régression d'exécution n'est possible ni
  contrôlée.
- **La cohérence documentaire est établie par relecture**, pas par un
  vérificateur automatisé de liens ou d'identifiants. C'est une limite réelle
  de cette validation.
- **`F-046`** reste `PROPOSED`; identité physique persistante absente,
  `DEC-0013/F` bloquante. Garantie **`X10`** race-safe hors Windows toujours
  non prouvée. Réserve **`R8`** entière.
- **Graphify non intégré par décision produit** — `DEC-0029` G. **Forge reste
  un projet distinct** — `DEC-0029` H.

---

## AT. ACTION-0044 — contrôle indépendant documentaire de TASK-0027 — 2026-09-06

**Verdict indépendant enregistré, non rendu par Codex :** cohérence
architecture / vision / roadmap / parité / matrice **PASS**,
`ACTION-0044 = CLOSED`, `TASK-0027 = VERIFIED`, sans réserve corrective
bloquante. Claude Code était l'exécuteur; Codex est seulement le rédacteur de
l'enregistrement. Voir
[`ACTION-0044`](../reviews/ACTION-0044-independent-control.md).

### Validations documentaires de fermeture

| Contrôle | Résultat |
|---|---|
| Identité de livraison | **PASS** — base `b5809424`, substantif `beef152f`, HEAD exécuteur `b35e9813` |
| Diff base → livraison | **PASS** — 15 fichiers documentaires ou d'orchestration seulement |
| Cohérence architecture / vision / roadmap / parité / matrice | **PASS** — verdict indépendant |
| Frontière « indexe grand, matérialise petit » | **PASS** |
| `F-042` | **PASS** — `PROPOSED`, classification `MVP`, historique `ULTÉRIEUR` visible |
| `F-050` / `F-051` | **PASS** — `PROPOSED`, `MVP / P0`, non implémentées |
| Identifiants fonctionnels | **PASS** — `F-001` à `F-051`, sans trou ni doublon |
| `P-SCALE-R1` | **PASS** — formulations d'origine conservées, contrat à 22 exigences |
| Graphify / Forge | **PASS** — Graphify `NOT INTEGRATED`; Forge distinct |
| Renderer et matériel | **PASS** — aucun renderer choisi; aucune dépendance à un GPU puissant ou à WebGL |
| 10k / 100k / 1M | **PASS** — cibles futures explicitement non mesurées |
| Code, runtime et preuves | **PASS** — aucun changement sous `src/`, `src-tauri/`, `scripts/`, `graph/` ou `docs/performance/runs/` |
| X5 | **PASS** — 36 entrées, inchangé |
| `origin/main` | **PASS** — `1a7d652ca48281c1687f6d1404c56a1404df91d8`, non touché |
| `TASK-0028` / `DEC-0030` | **PASS** — aucune créée |

### Non testé / limites

- Aucun test produit, build Tauri, benchmark ou replay WebView2 : le contrôle
  est documentaire uniquement.
- Aucune performance 10k / 100k / 1M n'est vérifiée ni promise.
- `F-042`, `F-050` et `F-051` restent non implémentées et `PROPOSED`.
- `F-046` reste `PROPOSED`, avec identité physique persistante bloquée par
  `DEC-0013/F`; `F-047` reste `DEFERRED`.
- Graphify reste `NOT INTEGRATED`; aucun renderer final n'est choisi.
- `X10` hors Windows reste non prouvée race-safe et `R8` demeure entière.
- L'index incomplet préexistant de `docs/decisions/README.md` est une dette
  documentaire non bloquante, non réparée partiellement ici.

---

## AU. TASK-0028 — banc synthétique de mise à l'échelle — 2026-09-07

**Statut : `IMPLEMENTED`** le 2026-09-07, livré par Claude Code (exécuteur).
**Non `VERIFIED`** : l'exécuteur ne s'attribue pas cet état, et le contrôle
indépendant sur preuves reste à faire.

Trois qualificatifs seulement : **vérifié**, **non testé**, **inconnu**.

### AU.1 Validations exécutées

| Validation | Commande | Résultat |
|---|---|---|
| Tests Rust, suite complète | `cargo test --lib` | **258 passés, 0 échec, 3 ignorés** (les trois campagnes, `#[ignore]` par conception) |
| Tests du harness seuls | `cargo test --lib scale_spike` | **29 passés, 0 échec** |
| Tests TypeScript, suite complète | `pnpm test` | **261 passés, 0 échec**, 15 fichiers |
| Typage | `pnpm check` | **propre**, aucune erreur |
| Build frontend | `pnpm build` | **réussi**, 61 modules |
| Build produit Rust | `cargo build` | **réussi**; le seul avertissement (`SUGGESTION_STATES`, `relations.rs`) est **préexistant** et sans lien |
| Hygiène du diff | `git diff --check` | **propre** |
| Campagnes `SS1`–`SS6`, `SS9` | `cargo test --lib scale_spike::campaigns -- --ignored` | **3 campagnes réussies**, 4 artefacts écrits |
| Campagnes `SS7`/`SS8` | `scripts/task0028-ss7-bounded-view-webview2.ps1` | **2 processus WebView2 réels**, fermés proprement, `X5` intacte |

### AU.2 Vérifié, sur preuves

- **Non-proportionnalité (`SS9`) : PASS sur les cinq conditions.** À budget
  fixe, entités, arêtes, payload et temps de layout sont **plats** de 10 000 à
  1 000 000. Preuve : les 24 combinaisons budget × taille × focus des trois
  artefacts `TASK-0028-SS-*.json`.
- **Comptabilité exacte des éléments cachés.** `éléments comptés == éléments
  existants` dans les 24 combinaisons, vérifié par **deux méthodes
  indépendantes** — CTE récursive SQLite et recensement Rust `O(n)` — qui
  doivent s'accorder, sinon le test échoue.
- **Invariants `F-051`.** 0 infraction : aucun agrégat ne porte de chemin,
  d'identité de nœud, de compte approximatif, ni d'arête `hierarchy`.
- **Source non modifiée (`I-1`).** Empreinte structurelle identique avant et
  après chaque campagne physique, 9 999 et 99 999 entrées.
- **Isolation (`I-2`).** Source et index de banc côte à côte sous
  `.filetopo-sandbox/task0028`, ignoré par Git. Aucune écriture hors du dépôt.
- **`X5` intacte à 36.** Empreintes `git hash-object` des 36 preuves scellées
  relevées avant et après les passes WebView2, comparées, identiques. Le
  rédacteur d'artefacts **refuse par assertion** d'écrire un nom scellé.
- **Aucune donnée personnelle.** Les artefacts sont contrôlés octet à octet
  avant écriture; l'écriture échoue si un nom d'utilisateur, un nom d'hôte ou
  un chemin `Users` apparaît. Un test le prouve.
- **Empreinte produit nulle.** Le harness est entièrement `#[cfg(test)]`;
  `cargo build` réussit et n'ajoute aucun avertissement.

### AU.3 Non testé, déclaré comme tel

- **1 000 000 d'éléments physiques.** Jamais créés, jamais parcourus. Seul
  l'**index** à 1M est mesuré. Le scanner à cette taille reste **non testé**.
- **Composition bout-en-bout index → vue → WebView2.** Non testée : la relier
  exigerait une commande produit nouvelle, hors périmètre. Les deux couches
  sont prouvées **séparément**.
- **Budgets 256, 512 et 1024 dans WebView2.** Non mesurés : les vues réelles du
  runtime comptent 12 et 157 entités.
- **`SS8`, absence de dépendance au GPU : `NOT PROVEN`.** Le mécanisme
  `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS` est documenté, mais rien depuis
  l'extérieur de la page ne confirme qu'il a été honoré. Rien n'a été simulé.
- **Voisinage relationnel (`SS4`).** Non mesuré : le store d'index `nodes` ne
  porte aucune relation. Aucune expérience honnête n'était possible.
- **Temps en profil `release`.** Non mesurés : la suite de tests du crate ne
  compile pas en `--release`, constat **antérieur à cette tâche** et reproduit
  harness retiré. Tous les temps publiés sont des temps `debug`, pessimistes.

### AU.4 Réserves maintenues

- **Le banc n'est pas la classe d'acceptation** (`DEVELOPMENT_BENCH_NOT_ACCEPTANCE`) :
  **aucune cible « machine modeste » n'est validée**.
- **`R8` entière** : aucun chiffre publié hors des artefacts `TASK-0028`, tous
  marqués `NONCANONICAL UNTIL INDEPENDENT CONTROL`.
- `F-042`, `F-050`, `F-051` restent `PROPOSED` et non implémentées;
  `MAX_NODES_PER_MAP = 5000` reste en vigueur; aucun renderer n'est choisi;
  aucun budget de vue n'est décidé.
- `F-046` reste bloquée par `DEC-0013/F`; `F-047` reste `DEFERRED`; Graphify
  reste `NOT INTEGRATED`; `X10` hors Windows reste non prouvée race-safe.
- La dette préexistante de l'index de `docs/decisions/README.md` n'est pas
  corrigée ici.

---

## AV. ACTION-0045 — contrôle indépendant de TASK-0028 — 2026-09-07

**Verdict indépendant enregistré, non rendu par Codex :** `ACTION-0045 =
CLOSED`; `TASK-0028 = VERIFIED` comme preuve de faisabilité architecturale /
benchmark synthétique, sans validation de performance produit. Claude Code
était l'exécuteur; Codex est seulement le rédacteur de l'enregistrement. Voir
[`ACTION-0045`](../reviews/ACTION-0045-independent-control.md).

### Validations documentaires de fermeture

| Contrôle | Résultat |
|---|---|
| Identité | **PASS** — `HEAD 976bd05`, parent direct `db117fa`, substantif `66855a1`, gel `ae25670` parent de `670704d` |
| Gel antérieur au harness | **PASS** |
| Harness et surface | **PASS** — `#[cfg(test)]`, aucune commande Tauri, route ou UX normale ajoutée |
| SCAN-SCALE 10k / 100k | **PASS dans la portée du spike** — physique, cardinalité exacte, source inchangée |
| INDEX-SCALE 1M | **PASS dans la portée du spike** — construit et interrogé; pas un scan physique 1M |
| `P-08` 100k | **PASS** — requête de production, pagination et exactitude vérifiées |
| Budgets 128/256/512/1024 | **PASS au niveau harness/core** sur 10k, 100k et 1M indexé |
| `SS9` | **PASS** — cardinalité bornée, layout de la vue bornée seulement |
| WebView2 / GPU | **PARTIEL** / **`NOT PROVEN`** |
| État produit | **PASS** — `F-042`, `F-050`, `F-051` restent `PROPOSED`; `MAX_NODES_PER_MAP = 5000` |
| X5 | **PASS** — 36; aucun scellement ajouté |
| `origin/main` | **PASS** — `1a7d652ca48281c1687f6d1404c56a1404df91d8`, non touché |
| Diff de fermeture | **PASS** — 8 fichiers documentaires autorisés; aucun diff sous `src/`, `src-tauri/`, `scripts/` ou `docs/performance/runs/` |
| Liens relatifs | **PASS** — 0 cible absente dans les 8 documents de fermeture |
| Action suivante | **PASS** — un seul titre d'action; aucune `TASK-0029` ni `DEC-0030` |
| Hygiène du diff | **PASS** — `git diff --check` |

### Limites maintenues

- Banc `DEVELOPMENT_BENCH_NOT_ACCEPTANCE`; cible « machine modeste » non
  validée.
- 1M physique non prouvé; composition index→frontend non testée.
- `SS7` partiel; `SS8 NOT PROVEN`; temps Rust en `debug`; voisinage
  relationnel non mesuré.
- Le test jsdom prouve seulement la cardinalité DOM/SVG, pas la sémantique
  `F-051` ni la composition bout-en-bout.
- La dette préexistante de chemins locaux personnels dans d'anciens documents
  reste hors périmètre; `TASK-0028` n'en ajoute pas.
- Les quatre artefacts restent non canoniques et non protégés; X5 reste à 36.
- Aucun benchmark, replay WebView2, test produit ou build n'a été relancé pour
  cette fermeture documentaire; seules les validations de fermeture exigées
  ont été exécutées.

---

## AW. TASK-0029 — fondation de requête bornée — 2026-09-09

**Statut : `IMPLEMENTED`** le 2026-09-09, livré par Claude Code (exécuteur).
**Non `VERIFIED`** : l'exécuteur ne s'attribue pas cet état, et le contrôle
indépendant sur preuves reste à faire.

Trois qualificatifs seulement : **vérifié**, **non testé**, **inconnu**.

### AW.1 Validations exécutées

| Validation | Commande | Résultat |
|---|---|---|
| Tests Rust, suite complète | `cargo test --lib` | **285 passés, 0 échec, 5 ignorés** (les cinq campagnes, `#[ignore]` par conception) |
| Primitives bornées | `cargo test --lib hierarchy` | **17 passés, 0 échec** |
| Index, migration et révision | `cargo test --lib index::` | **5 passés, 0 échec** |
| Harness de mesure | `cargo test --lib scale_query` | **9 passés, 0 échec, 2 ignorés** |
| Campagnes `SQF1`–`SQF5` | `scripts/task0029-scale-query.ps1` | **2 campagnes réussies**, 2 artefacts écrits |
| Tests TypeScript, suite complète | `pnpm test` | **261 passés, 0 échec**, 15 fichiers |
| Typage | `pnpm check` | **propre**, aucune erreur |
| Build frontend | `pnpm build` | **réussi**, 61 modules |
| Build produit Rust | `cargo build` | **réussi**; le seul avertissement (`SUGGESTION_STATES`, `relations.rs`) est **préexistant** et sans lien |
| Hygiène du diff | `git diff --check` | **propre** |

### AW.2 Vérifié, sur preuves

- **Le coût d'une page ne suit plus la fratrie.** `p95` d'une page de 100
  enfants directs, entre 100k et 1M : première page **611 → 322 µs**, curseur
  médian **410 → 698 µs**, curseur proche de la fin **387 → 892 µs**, curseur
  après le dernier élément **219 → 175 µs**. Preuve : les deux artefacts
  `TASK-0029-SQF-*.json`.
- **Critère d'ingénierie `p95` 1M ≤ 5 × `p95` 100k : `PASS`**, pire rapport
  **2,30** à la position `curseur-proche-fin`. Le rapport est **calculé par la
  campagne 1M elle-même**, qui relit l'artefact 100k, et non recopié à la main.
- **L'ancien chemin, mesuré dans la même exécution, croît toujours.** Le
  prototype `OFFSET` de `TASK-0028` passe de 13,6 à 116,7 ms en première page
  et de 32,8 à 351,2 ms en fin de fratrie — rapport 8,6 à 10,8. Il reproduit
  les chiffres de `TASK-0028` (12,9 ms et 110,4 ms), ce qui montre que les deux
  campagnes parlent du même banc.
- **Critères structurels du plan, vérifiés par assertion pendant la campagne.**
  `idx_nodes_child_order` sert `parent_id` **et** l'ordre; **aucun
  `USE TEMP B-TREE FOR ORDER BY`**; aucun balayage du corpus; **aucun `OFFSET`**
  dans la requête de continuation. Une violation arrête la campagne. Le plan de
  l'ancien chemin, publié à côté, montre toujours son tri temporaire.
- **L'ordre fonctionnel est inchangé.** Un test compare l'ordre keyset à l'ordre
  préexistant `kind = 'directory' DESC, name COLLATE NOCASE, id` sur une fixture
  mêlant casses, doublons et caractères non ASCII : ils coïncident exactement.
- **Pagination sans doublon ni omission.** Sur 97 enfants dont la moitié ne
  diffèrent que par la casse, huit tailles de page — 1, 2, 5, 10, 96, 97, 98,
  500 — rendent le même ensemble, dans le même ordre, sans répétition.
- **Curseur périmé refusé.** Après reconstruction, la révision avance et un
  curseur antérieur est rejeté `stale`. Un curseur d'un autre index est rejeté
  `foreign`; d'un autre parent, `parent mismatch`. Deux index indépendants ont
  deux `index_id` distincts alors que leurs révisions coïncident.
- **Curseur sans donnée sensible.** Un test vérifie que le jeton ne contient ni
  `/`, ni `\`, ni `:`, ni le mot `offset`, et qu'il n'embarque aucun nom : la
  clé de tri de la ligne de reprise est relue dans l'index par clé primaire.
- **Aucune collection non bornée.** Une demande de `usize::MAX` rend exactement
  `MAX_CHILDREN_PAGE_SIZE = 500` lignes, avec le total exact déclaré et le reste
  atteignable par curseur. Une demande de 0 est ramenée à 1.
- **`child_count` est exact.** Audit contre le `COUNT(*)` réel, nœud par nœud,
  sur **tout le corpus** : **0 désaccord** à 100k et à 1M. Un test injecte
  volontairement un compte faux et vérifie que l'audit le signale.
- **Compte direct à coût constant.** 12 à 13 µs `p95` aux deux tailles, contre
  **342 ms** pour la CTE récursive de sous-arbre à 1M — mesurée une fois pour
  montrer ce que `DEC-0030 §D` interdit sur le hot path.
- **Chaîne d'ancêtres bornée.** 26 niveaux lus en 237 à 351 µs `p95`, plafond
  déclaré à 512, échec explicite au-delà.
- **Migration `user_version` 2 → 3 sans perte.** Prouvée sur une base construite
  avec le schéma v2 écrit en toutes lettres dans le test : les quatre nœuds, les
  métadonnées et les deux drapeaux `seen` survivent verbatim, et la base migrée
  sert immédiatement la page bornée sur le nouvel index. Une réouverture ne
  réécrit pas l'identité et ne fait pas avancer la révision.
- **Empreinte produit nulle.** Aucune commande Tauri, aucune route, aucun
  contrat IPC, aucun élément d'interface. Le harness de mesure est entièrement
  `#[cfg(test)]`; `cargo build` réussit sans avertissement nouveau.
- **`X5` intacte à 36**, dans la liste Rust comme dans la liste PowerShell. Le
  rédacteur d'artefacts `TASK-0029` **refuse par assertion** d'écrire un nom
  scellé ou un nom `TASK-0028`.
- **Artefacts `TASK-0028` inchangés.** `git diff b3923e0..HEAD` ne rapporte
  aucune modification des quatre JSON.
- **Aucune donnée personnelle.** Les artefacts sont contrôlés octet à octet
  avant écriture, par le même garde que `TASK-0028`.

### AW.3 Non testé, déclaré comme tel

- **Le scanner à 100 000 ou 1 000 000 de fichiers physiques.** Les deux
  campagnes sont `INDEX-SCALE` : aucun fichier n'a été créé. Le coût mesuré est
  un coût de requête.
- **Temps en profil `release`.** Non mesurés : la suite de tests du crate ne
  compile pas en `--release`, constat **antérieur à cette tâche**. Tous les
  temps publiés sont des temps `debug`.
- **La recherche `P-08` à ces tailles.** Inchangée par cette tranche, et
  toujours linéaire dans le corpus. Aucune mesure nouvelle n'a été prise.
- **L'indexation en flux ou par lots.** Hors périmètre; `Index::replace_nodes`
  prend toujours tout le corpus en mémoire.
- **La composition bout-en-bout index → vue → WebView2.** Non testée : aucune
  commande produit n'expose ces primitives, par décision de `DEC-0030`.
- **Aucun replay WebView2.** Aucun n'était requis : `TASK-0029` ne modifie ni
  interface, ni renderer, ni commande.
- **Une arborescence réelle.** Le corpus a une seule forme — un `hub` très
  large, une épine profonde. Les distributions réelles de noms, de casses et de
  profondeurs sont **inconnues** de cette mesure.

### AW.4 Réserves maintenues

- **Le banc n'est pas la classe d'acceptation**
  (`DEVELOPMENT_BENCH_NOT_ACCEPTANCE`, i9-9900K, 32 Gio) : **aucune cible
  « machine modeste » n'est validée**.
- **`R8` entière** : aucun chiffre publié hors des artefacts et du rapport
  `TASK-0029`. Les deux JSON `TASK-0029` restent non canoniques et hors `X5`
  après le contrôle indépendant; leurs libellés d'origine ne sont pas réécrits.
- **Deux positions rendent un rapport inférieur à 1.** C'est du bruit à
  l'échelle de quelques centaines de microsecondes, pas une amélioration.
- `F-042`, `F-050`, `F-051` restent `PROPOSED` et non implémentées; seule la
  **sémantique du compte** de `F-051` est clarifiée par `DEC-0030`.
  `MAX_NODES_PER_MAP = 5000` reste en vigueur; aucun renderer n'est choisi;
  aucun budget de vue n'est décidé.
- `DEC-0030` est `APPROVED` et son implémentation dans `TASK-0029` est
  contrôlée par `ACTION-0046`; `DEC-0029` est inchangée.
- `F-046` reste bloquée par `DEC-0013/F`; `F-047` reste `DEFERRED`; Graphify
  reste `NOT INTEGRATED`; `X10` hors Windows reste non prouvée race-safe.
- La dette préexistante de l'index de `docs/decisions/README.md` et celle des
  chemins locaux personnels dans d'anciens documents ne sont pas corrigées ici;
  `TASK-0029` n'en ajoute pas.

---

## AX. ACTION-0046 — contrôle indépendant de TASK-0029 — 2026-09-09

**Verdict indépendant enregistré, non rendu par Codex :** `ACTION-0046 =
CLOSED`; `TASK-0029 = VERIFIED — PASS` dans sa portée exacte de fondation
Rust/SQLite et mesure d'ingénierie non produit. Claude Code était l'exécuteur;
Codex est seulement le rédacteur de l'enregistrement. Voir
[`ACTION-0046`](../reviews/ACTION-0046-independent-control.md).

### Validations documentaires de fermeture

| Contrôle | Résultat |
|---|---|
| Identité Git | **PASS** — branche `build/v0.2-a13-scale-query-foundation`; commit d'orchestration `6ecec5b`; parent direct `aa1b91209a5fcc64b7d116829160047a7d2ccac4`; substantif `d8f3dbff2c6127352518b33f1ac7650c1652a23b` présent |
| `origin/main` | **PASS** — `1a7d652ca48281c1687f6d1404c56a1404df91d8`, inchangé |
| Verdict enregistré | **PASS** — `ACTION-0046 = CLOSED`; `TASK-0029 = VERIFIED`; autorité du verdict attribuée à l'orchestrateur technique indépendant |
| Portée produit | **PASS** — aucun code produit, benchmark, WebView2, commande Tauri, IPC, UI, materializer, renderer ou dépendance ajouté par la fermeture |
| Artefacts de mesure | **PASS** — aucun fichier sous `docs/performance/runs/` modifié |
| X5 | **PASS** — reste exactement à 36; les JSON `TASK-0029` restent non canoniques et non protégés |
| Action suivante | **PASS** — `NEXT_ACTION.md` contient une seule action de retour à l'orchestrateur |
| Absences exigées | **PASS** — aucune `TASK-0030`, aucune `DEC-0031` |
| Hygiène documentaire | **PASS** — `git diff --check`; liens relatifs des documents modifiés/créés vérifiés |

### Limites maintenues

- Banc `DEVELOPMENT_BENCH_NOT_ACCEPTANCE`; aucune cible « machine modeste » ni
  `TARGET_CLASS` validée.
- Timings Rust en `debug`; pas de mesure `release`.
- 1M = `INDEX-SCALE`, pas un million de fichiers physiques.
- Corpus synthétique de forme limitée.
- Aucun test bout-en-bout index -> vue -> frontend.
- `Index::replace_nodes` tient encore le corpus en mémoire, environ 189 Mo
  déclarés à 1M.
- Recherche `P-08` encore linéaire et inchangée.
- Aucune capacité produit `F-042`, `F-050` ou `F-051` implémentée par
  `TASK-0029`.

`TASK-0029` vérifie une fondation de requête. Elle ne vérifie ni la V1, ni le
million d'éléments comme capacité commerciale.

## AY. TASK-0030 — index canonique et projection bornée — 2026-09-09

Exécution Codex, **pas une vérification indépendante**. DEC-0031 APPROVED;
TASK-0030 IMPLEMENTED. Gel documentaire préalable `0255bd1`.

| Contrôle exécuté | Résultat et preuve |
|---|---|
| Rust complet `cargo test --lib --offline` | 290 PASS, 0 FAIL, 5 campagnes ignorées |
| Produit 100k, pagination complète, isolation, rebuild stale, read-only 6001, relation hors vue | 5 tests `map::projection::tests` PASS; `projection_tests.rs` |
| Garde runtime | PASS, contrôle explicitement non vide du code de commandes; rejeu ciblé après renforcement |
| TypeScript complet | 264 PASS, dont 3 sur le DTO produit 100k exporté |
| `pnpm check`, `pnpm build`, `cargo build --offline` | PASS |
| `cargo clippy --all-targets --offline -- -D warnings` | FAIL : 13 erreurs lib et 22 lib test; 24 extraits de diagnostic tous présents dans la base `896e2c3` (ancien store déplacé compris). Aucun clippy vert; base non réexécutée |
| WebView2 réel | 152.0.4191.66; petite vue 12 nœuds/11 arêtes; 6001 physiques → 256 nœuds, 1 agrégat exact, 255 arêtes; page suivante exacte; 24 keydowns isTrusted; aucune erreur fatale |
| Confidentialité | Empreinte source inchangée après build, navigation, sélection, relations, hash et rebuild; aucun fichier applicatif dans la source synthétique |
| X5 / Git | 36 noms protégés inchangés, aucun JSON antérieur modifié; diff sans erreur d'espaces |

Les résultats sont consultables dans
[`TASK-0030-validation.json`](../performance/runs/TASK-0030-validation.json),
[`TASK-0030-webview2.json`](../performance/runs/TASK-0030-webview2.json) et le
[DTO produit 100k exporté](../performance/runs/TASK-0030-materialized-view-100k.json).
Ils restent non canoniques. `scripts/task0030-webview2.ps1` prépare un catalogue
synthétique neuf (Bêta lit `scale-runtime`), puis utilise le runtime normal et
un pilote CDP. Vite doit servir ce checkout sur le port 1420. Aucun autre chemin
produit n'est substitué au scan/index/projection.

Échecs conservés : première suite Rust avec deux anciennes hypothèses de stockage
(non-régression migrée, fonctions conservées); première tentative WebView2 en
timeout sur l'activation native d'Entrée, pilote corrigé et rejeu neuf réussi.
Les durées de gestes incluent les pauses CDP, **pas des benchmarks de rendu**.
Non testé : 100k physique, 1M produit, portable modeste, GPU désactivé, hors Windows,
données personnelles et campagnes historiques ignorées. Les consommateurs
d'analyse restent en mémoire; aucune optimisation P-08 ou indexation streaming.

---

## AZ. ACTION-0047 — contrôle indépendant de TASK-0030 — 2026-09-09

**Statut : `CLOSED`.** `TASK-0030 = VERIFIED` **dans sa portée synthétique de
convergence V1** — un seul index canonique par cerveau, projection runtime
bornée, layout de la vue seulement, MapApp alimenté par cette projection.
Exécuteur de `TASK-0030` : Codex. Rédacteur de l'enregistrement : Claude Code.
Autorité du verdict : orchestrateur technique indépendant. Le rédacteur ne rend
pas le verdict et ne s'attribue pas `VERIFIED`. Fiche :
[`ACTION-0047`](../reviews/ACTION-0047-independent-control.md).

**Nature de cette action : fermeture documentaire.** Aucun banc, rejeu WebView2
ni suite lourde n'a été relancé. Les chiffres de la section AY restent des
**preuves d'exécuteur**, pas une réexécution indépendante.

| Contrôle de fermeture exécuté | Résultat |
|---|---|
| `git diff --check` | PASS, aucune erreur d'espaces |
| Diff de fermeture strictement documentaire | PASS, aucun fichier sous `src/`, `src-tauri/`, `scripts/`, `docs/performance/runs/` |
| Trois JSON `TASK-0030` | inchangés, non canoniques, non ajoutés à `X5` |
| `X5` | 36 noms, identiques côté TypeScript (`runArtifacts.ts`) et Rust (`commands.rs`) |
| `origin/main` | `1a7d652ca48281c1687f6d1404c56a1404df91d8`, inchangé |
| Chaîne Git | `896e2c3` -> `0255bd1` (gel) -> `ab1d7e2` (code) -> `58862b7` -> commit d'orchestration; aucune divergence |
| Absence de `TASK-0031` et `DEC-0032` | PASS, avant et après |
| Liens relatifs des documents créés et modifiés | PASS |

**Points structurels revérifiés sur la source pendant la rédaction**, pour ne
consigner que des faits opposables : `map::store` réduit aux DTO `MapNode`,
`MapSnapshot`, `NodeDetail`; `legacy_store` et `MAX_NODES_PER_MAP` déclarés
`#[cfg(test)]` dans `map/mod.rs`; `VIEW_BUDGET = 512` et
`MATERIAL_BUDGET = VIEW_BUDGET / 2` dans `map/projection.rs`; layout calculé
dans `materialize_view` après sélection bornée; `build_map` publiant
`layout_ms = 0.0`, `layout_invocations = 0`, `node_ceiling = 0`;
`ViewAggregate` portant `parent_id`, `omitted_direct_children`, `reason` et
`next_cursor`.

**Six réserves maintenues, non bloquantes :** `R-T30-1` clippy strict en échec
et baseline non réexécutée par le contrôle; `R-T30-2` `map_open`/`build_map`
rescanent encore un index compatible, ouverture / actualisation / reconstruction
à séparer avant toute racine réelle; `R-T30-3` analyses encore en mémoire
corpus; `R-T30-4` performances produit non acceptées, `R8` ouverte; `R-T30-5`
périmètre encore synthétique; `R-T30-6` dette test-only de `legacy_store.rs`.

**Non testé par cette action :** tout le reste. Aucune suite Rust ou TypeScript,
aucun build, aucun clippy, aucun WebView2, aucun banc n'a été exécuté ici.
`F-050` et `F-051` restent `IMPLEMENTED`, **pas `VERIFIED` globalement**.

---

## BA. TASK-0031 — séparation ouvrir / actualiser / reconstruire — 2026-09-10

**Statut : `IMPLEMENTED`**, livré sur `build/v0.2-a15-v1-brain-lifecycle`,
**en attente de vérification indépendante**. Exécuteurs : Codex pour
l'implémentation initiale, Claude Code pour la reprise, les corrections, les
preuves et la clôture. **Aucun des deux ne s'attribue `VERIFIED`.**

### BA.1 Vérifié par exécution — suites réelles

| Élément | Preuve |
|---|---|
| Suite Rust complète | `cargo test --offline` — **295 PASS**, 0 échec, 5 ignorés |
| Suite TypeScript complète | `pnpm test` — **269 PASS**, 17 fichiers |
| Typage | `pnpm check` — `tsc --noEmit`, aucune erreur |
| Build frontend | `pnpm build` — `tsc && vite build`, 62 modules, succès |
| Build Rust | `cargo build --offline` — succès, 1 avertissement préexistant (`SUGGESTION_STATES`, `relations.rs`, non touché) |
| Espaces et fins de ligne | `git diff --check` — aucune erreur |
| Forme Rust | `cargo fmt --check` — **propre sur tous les fichiers touchés par cette tâche**; dette de forme restante sur dix-sept fichiers non touchés |
| Clippy strict | `cargo clippy --all-targets --offline -- -D warnings` — **rouge, 26 erreurs**. Jeu de diagnostics **identique avant et après** la tâche : `relation_commands` 6, `scale_spike::profile` 3, `relations` 3, `scale_spike::bounded` 2, `rule_engine` 2, `content_signals` 2, `scale_spike::report` 1, `scale_query::mod` 1, `scale_query::campaigns` 1, `legacy_store` 1, `brains` 1, `lib.rs` 1. **Aucun ne provient d'une ligne écrite par cette tâche** : le seul diagnostic de `lib.rs` porte sur un `if` `unattended` non modifié. Réserve `R-T30-1` inchangée |

### BA.2 Vérifié par preuves de contrat — `L1` à `L9`

Tests dans `src-tauri/src/map/lifecycle_tests.rs`, avec **scanner et SQLite
réels**, jamais des doublures.

| Critère | Preuve |
|---|---|
| `L1` — ouvrir n'accède pas à la source | Index construit, source renommée sous garde `Drop` restaurant même en cas d'échec : `map_open` et `map_view` réussissent; `indexId`, `revision`, compte de nœuds et digest reconstructible **identiques** avant et pendant l'indisponibilité; `sourceRead = false`, `freshness = UNKNOWN` |
| `L2` — index absent | `map_open` rend `NotBuilt`; après l'appel, **ni `paths.fixtures` ni `paths.brains` n'existent** : aucune source matérialisée, aucun index partiel |
| `L3` — actualiser explicite | Fichier ajouté à la fixture **par le test**; `map_refresh` le voit, `indexId` conservé, `revision` +1, compte +1, empreintes avant/après **identiques**, `map_view` rend le nouveau corpus borné |
| `L4` — actualisation échouée | Source indisponible : `map_refresh` échoue explicitement, l'ancien index reste ouvrable et son état est inchangé au champ près |
| `L5` — reconstruire fail-safe | Réussi : `indexId` conservé, révision avancée, digest cohérent. Échoué : annulation, `ABORT` SQL injecté par **déclencheur réel** après `DELETE` et insertion partielle, et validation refusée — dans les trois cas l'ancien état reste lisible et identique |
| `L6` — pas de scan caché côté interface | `src/map/lifecycle.test.ts` : Ouvrir n'émet que `map_open`, Actualiser `map_refresh` puis `map_open`, Reconstruire `map_rebuild` puis `map_open`; un refus d'ouverture n'entraîne **ni scan ni préparation**; les trois `data-testid="lifecycle-*"` sont câblés sur leur action; **aucun booléen `rebuild`** dans `MapApp` |
| `L7` — projection bornée intacte | Garde structurale : région runtime de `commands.rs` sans `MapStore`, `all_nodes(` ni `layout::compute(`; les trois entrées de cycle de vie présentes dans `commands.rs` et `lib.rs`; **aucun `rebuild: bool`** dans `lib.rs`; `map_view` reste le seul chemin de rendu |
| `L8` — isolation | Deux cerveaux sur **la même fixture** : deux fichiers d'index, deux `indexId`, deux révisions; publier sur l'un laisse l'autre strictement inchangé |
| `L9` — lecture seule | Empreinte de source **identique avant et après** refresh et rebuild; `open` n'en calcule aucune, conformément au contrat; catalogue, relations et content-signals jamais créés par ces opérations |

### BA.3 Vérifié en hôte réel — rejeu WebView2

`scripts/task0031-webview2.ps1` sur catalogue synthétique neuf. WebView2
**152.0.4191.66**, Tauri **2.11.5**, SQLite **3.53.2**. **31 frappes réelles,
toutes `isTrusted`**, aucune erreur console fatale. Artefact
`docs/performance/runs/TASK-0031-webview2.json`, **non canonique**, hors X5.

| Élément | Preuve |
|---|---|
| Index absent | `map_open` rend `map_not_built`; aucun `index.sqlite`, aucune source `quasi-empty` créés |
| Trois intentions | Ouvrir : révision 1 → 1. Actualiser : 1 → 2. Reconstruire : 2 → 3. `indexId` **inchangé** aux trois étapes, chaque bouton activé par frappe réelle |
| Source retirée du disque | Ouvrir réussit; `map_open` et `map_view` rendent **exactement** les mêmes valeurs qu'avant le retrait; `map_refresh` échoue en annonçant que le dernier index enregistré reste disponible; la source est restaurée en `finally` |
| Projection bornée | 12/11 nœuds/arêtes sur petite fixture; **6 001 nœuds indexés rendus par 256 nœuds et 1 agrégat**, budget 512 respecté, DOM égal à la page produit; pagination sans doublon |
| Lecture seule | `map_integrity` final : **aucun artefact FileTopo** dans la source |

### BA.4 Corrections apportées pendant la reprise

| Défaut | Effet | Correction |
|---|---|---|
| Fichiers réécrits en CRLF contre `* text=auto eol=lf` | La garde `L7` lit `commands.rs` par `include_str!` et découpe sur un motif en LF. En CRLF le découpage échouait, la garde inspectait **le module de tests** et y voyait `MapStore` : **échec réel de la suite Rust** | Fichiers normalisés en LF; la garde compare désormais en LF |
| Sentinelle de la garde `L7` devenue creuse | `build_map` est passé sous `#[cfg(test)]` : la sentinelle ne prouvait plus qu'on inspectait la région runtime | Sentinelle déplacée sur `fixture_summaries`, dernier élément runtime avant le module de tests |
| Rejeu WebView2 impossible | Le serveur de développement Vite surveillait `.filetopo-sandbox/`, retenait des poignées de répertoire Windows — `EPERM` au renommage — et rechargeait la page à chaque écriture d'index | `vite.config.ts` exclut ce dossier de `server.watch`, comme `src-tauri` l'était déjà. **Extension de périmètre déclarée**, sans effet sur le produit construit |

### BA.5 Non testé, et limites

**Non testé :** toute racine réelle, tout dossier utilisateur, tout sélecteur de
dossier — hors portée et interdits. Aucun watcher, aucune mise à jour
incrémentale : `F-027`, `F-030` et `F-031` restent `PROPOSED`, non abordées. La
migration d'un index de schéma incompatible n'est **pas** implémentée : elle est
refusée explicitement, et son contrat de staging reste à écrire. Aucune
acceptance de performance produit : les mesures WebView2 viennent d'un poste de
développement et incluent des attentes de stabilisation CDP; ce ne sont pas des
latences de rendu. Aucun banc `TASK-0028`/`TASK-0029` rejoué ici.

**Réserves :** `R-T30-1` clippy strict rouge, inchangée. `R-T30-2` **traitée
dans sa portée synthétique**, en attente du contrôle indépendant. `R-T30-3`,
`R-T30-4`, `R-T30-6` et `R8` ouvertes. `R-T30-5` inchangée : tout reste
synthétique. `F-050` et `F-051` restent `IMPLEMENTED`, **pas `VERIFIED`
globalement**; `F-042` reste `PROPOSED / MVP`, `F-046` `PROPOSED`, `F-047`
`DIFFÉRÉ`. **X5 = 36.**

---

## BB. TASK-0032 — première racine réelle contrôlée — 2026-09-10

**Statut : `IMPLEMENTED`, jamais auto-`VERIFIED`.** Branche
`build/v0.2-a16-v1-real-root`, gel `c3507bf` parent direct du premier commit de
code. Exécuteur : Claude Code. Décision
[DEC-0033](../decisions/DEC-0033-real-root-privacy-and-source-binding.md),
`APPROVED`.

**Aucune donnée personnelle n'a été utilisée.** Toutes les arborescences lues
par cette tranche ont été créées par les preuves elles-mêmes, dans des
répertoires temporaires ou sous le bac à sable de la preuve, et détruites avec
eux.

### BB.1 Preuves Rust — `RR1` à `RR8`, sur de vrais dossiers

`src-tauri/src/map/real_root_tests.rs`. Scanner et SQLite réels.

| Preuve | Ce qui est établi |
|---|---|
| `RR1` migration | Un catalogue de schéma 1 écrit à la main — trois cerveaux dont un renommé en `Alpha renommé`/`#123456`/`★`, actif `brain-gamma` — migre vers le schéma 2 : mêmes cerveaux, mêmes noms, couleurs, icônes, positions et sources; **même cerveau actif**; réouverture idempotente; `user_version = 2` exact |
| `RR1` échec | Migration bloquée par une table `brains_next` préexistante : ouverture **refusée**, `user_version` reste 1, le renommage et le cerveau actif sont intacts. Rien de perdu |
| `RR2` enregistrement | Cerveau `REAL_ROOT` créé, `brain_id` en `real-<uuid>`, label = nom terminal du dossier; **source inchangée octet pour octet**; aucun index créé; `map_open` rend `map_not_built` **sans** créer d'index ni scanner |
| `RR2` refus | Un fichier, un dossier absent : refusés; le catalogue est **identique avant et après**, aucun dossier créé. Un lien symbolique de dossier est refusé comme racine tandis que sa cible reste enregistrable — le refus porte sur le lien, pas sur le dossier derrière |
| `RR3` confidentialité | Racine nommée `FILETOPO_PRIVATE_SENTINEL_<uuid>`. Après enregistrement, indexation et ouverture : `absolutePathLeak = false` sur `BrainRecord`, `BrainCatalogView`, `MapBuildReport`, `MapOpenReport`, la projection et le détail de nœud; **aucun message de refus ne nomme le chemin**; le fichier d'index ne contient pas la chaîne absolue. Le catalogue local, lui, rend bien le chemin canonique — la seule place où il a le droit d'être |
| `RR4` première indexation | Arbre Unicode de profondeur > 1, 8 nœuds : `map_refresh` publie la révision 1, `map_view` rend une projection bornée, la résolution de `Dossier accentué/sous-dossier` et le détail de nœud fonctionnent. `fingerprintBefore`/`After = null`, `readOnlyConfirmed = false`, `plannedNodes = 0` — dit, jamais prétendu. Aucun état FileTopo sous la racine |
| `RR5` ouverture hors ligne | Racine déplacée sous garde `Drop` : `map_open` et `map_view` rendent **exactement** les mêmes valeurs; `map_refresh` et `map_rebuild` échouent en `map_scan_failed`; le fichier d'index est **identique octet pour octet** après les échecs; la racine restaurée, une actualisation reprend et n'avance que la révision |
| `RR6` lecture seule | Inventaire complet — chemins relatifs, tailles, `mtime`, **contenu octet pour octet** — identique avant, après `map_refresh` et après `map_rebuild`. Rien d'ajouté, rien de supprimé, aucun `.sqlite` ni nom contenant `filetopo` sous la racine. `atime` volontairement exclu, non normatif |
| `RR7` deux cerveaux | Deux cerveaux sur **le même dossier** : `brain_id` distincts, `source_ref` distincts, `index_id` distincts, bases distinctes. Reconstruire le premier porte sa révision à 2 et laisse le second **rigoureusement identique** |
| `RR7` binding | Un index dont le `source_ref` ne correspond plus est refusé en `map_source_mismatch`, **le fichier reste intact**, et le vrai cerveau continue de s'ouvrir |
| `RR8` containment | La racine qui engloberait l'espace d'état FileTopo est refusée en nommant le risque; l'espace d'état lui-même, `brains/` et l'espace propre d'un cerveau le sont aussi. Aucun cerveau parasite créé. Un frère nommé `filetopo-state-archive` est **accepté** : la comparaison porte sur des composants, pas sur un préfixe de texte |

Le codec de chemin est prouvé séparément dans `src-tauri/src/path_codec.rs` :
aller-retour exact, y compris sur un chemin contenant un **surrogate isolé**
que `to_string_lossy()` détruit — le test échoue si la conversion lossy ne perd
rien, donc il ne peut pas passer par accident.

### BB.2 Preuves TypeScript — `RR9` et `RR10`

`src/map/realRoot.test.ts`, gardes structurelles lues sur les sources mêmes.

| Preuve | Ce qui est établi |
|---|---|
| Sélecteur | `map_brain_choose_real_root` est invoquée **sans aucun argument**; aucun appel `invoke` de `MapApp` ne porte une clé nommant un endroit du disque. `relativePath` est explicitement admis : c'est un chemin **dans l'index d'un cerveau**, résolu en SQL, jamais sur le disque |
| État non indexé | Lu de ce que la composition n'a pas réussi à charger, jamais d'une sonde de la source |
| Types | Aucun champ `rootPath`/`absolutePath`/`sourcePath`/`folderPath` déclaré; empreintes nullables |
| `RR9` réseau | CSP **identique** au caractère près à celle de `TASK-0031`; ~~capacité = `core:default` + `dialog:allow-open`~~ — **faux, corrigé en `BC.1`** : cette permission exposait `plugin:dialog\|open` à la page; la capacité porte désormais `core:default` seul; aucun `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `http://` ni `https://` dans l'interface; dépendances npm et `tauri-plugin-dialog` inchangées |
| `RR10` cycle | `runLifecycle` : ouvrir → `map_open` seul; actualiser → `map_refresh` puis `map_open`; reconstruire → `map_rebuild` puis `map_open`. `DEC-0032` intact |

Côté Rust, deux gardes supplémentaires remplacent la réserve `X2` : le runtime
**doit** initialiser le plugin de dialogue, `choose_collection` **doit** rester
non enregistrée, et **aucune signature de commande exposée** ne porte un type
`Path`/`PathBuf` ni un paramètre nommé `path`, `root`, `folder`, `directory` ou
`absolute_path` — lu sur le texte des signatures que `generate_handler!`
enregistre.

### BB.3 Rejeu WebView2 réel

`scripts/task0032-webview2.ps1`, WebView2 **152.0.4191.66**, Tauri **2.11.5**,
SQLite **3.53.2**. Artefact `docs/performance/runs/TASK-0032-webview2.json`,
**non canonique**, hors `X5`.

Arbre de test **généré par la preuve**, 1 209 entrées, noms accentués et
idéogrammes, sous le bac à sable de la preuve — jamais un dossier personnel.

- Le bouton **Ajouter un dossier** est présent et actif dans la page produit.
  **Le dialogue natif n'est pas ouvert** : il n'est pas automatisé, ce que
  `TASK-0032` §6 autorise explicitement, et ce que fait la commande derrière
  lui est prouvé par `RR2` sur la même primitive `register_real_root`.
- `map_open` avant indexation : `map_not_built`, **aucun fichier d'index créé**,
  source inchangée. Le bouton s'appelle alors **« Indexer »**.
- Frappe réelle sur **Indexer** : 1 210 nœuds indexés, `sourceKind = REAL_ROOT`,
  `sourceRef` = le UUID opaque, `fingerprintBefore/After = null`,
  `readOnlyConfirmed = false`, `plannedNodes = 0`, aucun diagnostic. Le bouton
  s'appelle ensuite **« Actualiser »**.
- Trois frappes réelles : ouvrir laisse la révision à 2, actualiser la porte à
  3, reconstruire à 4, `indexId` **inchangé** aux trois étapes, `sourceRead =
  false` à chaque ouverture, **source inchangée à chaque étape**.
- Projection bornée : **1 210 nœuds indexés rendus par 256 nœuds et 4
  agrégats**, budget 512 respecté, DOM égal exactement à la page produit.
- Lecture seule : inventaire complet identique avant et après; **aucun artefact
  FileTopo** sous la racine.
- Confidentialité : `absolutePathLeak = false` sur sept charges utiles DTO,
  **sur le fichier d'index lui-même** et **sur le journal de l'hôte**.
- 4 frappes, toutes `isTrusted`; **0 erreur console fatale**.

### BB.4 Validations générales

Rust **319 PASS**, 0 échec, 5 ignorés. TypeScript **279 PASS**, 18 fichiers.
`pnpm check`, `pnpm build`, `cargo build --offline` et `git diff --check` verts.

`cargo fmt --check` : **toutes les lignes écrites par cette tâche sont
propres**, vérifiées fichier par fichier. La dette de forme préexistante de
`hierarchy.rs`, `content_signals.rs` et `relation_commands.rs` est inchangée et
n'a pas été touchée.

`cargo clippy --all-targets --offline -- -D warnings` : **rouge à 26 erreurs**,
exactement le même nombre qu'à l'entrée. Un seul diagnostic tombe dans un
fichier modifié ici — `brains.rs`, `collapsible_if` sur `active()` — et ce code
est **antérieur à la tâche**, vérifié dans `git show HEAD:` : seul son numéro de
ligne a bougé. Un diagnostic **avait** été introduit, `too_many_arguments` sur
`BrainIndex::replace`, et il a été corrigé avant livraison en regroupant les
trois faits de source dans `SourceStamp`. `R-T30-1` inchangée.

### BB.5 Non testé, et limites

**Non testé :** le vrai cerveau personnel de Sébastien, et tout dossier
personnel — hors portée, et point d'arrêt qui lui est réservé. Le **dialogue
natif** lui-même n'est pas automatisé : sa compilation, son enregistrement et
sa primitive sont prouvés, son ouverture ne l'est pas. Aucun watcher, aucune
mise à jour incrémentale : `F-027`, `F-030`, `F-031` restent `PROPOSED`. Aucun
FTS5, aucune identité physique `F-046`. Aucune acceptance de performance sur
une grande racine réelle : 1 210 nœuds sur un poste de développement ne
mesurent rien de tel. La suppression de la dette `Registry`/`legacy_store`
n'est pas faite — seul le codec de chemin en a été extrait.

~~**Un refus délibérément large :** un index publié avant `DEC-0033` ne porte
aucun `source_ref` et est donc refusé en `map_source_mismatch`. Il n'est
**jamais supprimé**; une actualisation explicite le republie.~~ — **Faux,
corrigé en `BC.2`.** L'actualisation était refusée elle aussi : un tel index
était bloqué pour toujours. Ce n'était pas un coût assumé, c'était un défaut.

**Réserves :** `R-T30-1` clippy strict rouge, inchangée. `R-T30-5` est
**traitée uniquement dans la portée `REAL_ROOT` de test** — aucune validation
sur donnée personnelle, et aucune n'est demandée avant le contrôle indépendant.
`R-T30-3`, `R-T30-4`, `R-T30-6` et `R8` restent ouvertes. `R-T30-2` reste levée
dans sa portée synthétique par `ACTION-0048`. `F-050` et `F-051` restent
`IMPLEMENTED`, **pas `VERIFIED` globalement**; `F-042` reste `PROPOSED / MVP`,
`F-046` `PROPOSED`, `F-047` `DIFFÉRÉ`. **X5 = 36.**

---

## BC. TASK-0032 — passe corrective, deux défauts bloquants — 2026-09-10

**Statut inchangé : `IMPLEMENTED`, jamais auto-`VERIFIED`.** Même branche
`build/v0.2-a16-v1-real-root`, même décision `DEC-0033`, corrigée en `D`, `H`
et `I`. GO de la passe corrective à `a279ef9`. Aucune `TASK-0033`, aucune
`DEC-0034`. Exécuteur : Claude Code.

Le contrôle indépendant de `TASK-0032` a trouvé **deux défauts bloquants**.
**Les deux sont réels**, et la section `BB` ci-dessous affirmait le contraire
sur les deux points. Ce qui suit remplace ces affirmations.

### BC.1 Défaut A — `dialog:allow-open` ouvrait la frontière au lieu de la fermer

**Le constat.** La capacité accordait `dialog:allow-open` au WebView, et `BB.2`
présentait cela comme la garantie. Vérification sur les sources installées de
`tauri-plugin-dialog 2.7.2` :

- `permissions/autogenerated/commands/open.toml` : `allow-open` a pour effet
  `commands.allow = ["open"]`;
- `src/commands.rs` : `open` reçoit des options portant
  `default_path: Option<PathBuf>` — **fourni par la page** — et rend un
  `OpenResponse` contenant **les chemins choisis**.

C'est exactement ce que `DEC-0033` A et B interdisent : la page pouvait nommer
un emplacement disque, et recevoir un chemin absolu par l'IPC. La permission
n'était pas nécessaire au sélecteur; elle était la brèche. **Mon propre test
exigeait sa présence** : il prouvait le trou au lieu de la garantie.

**La correction.** La capacité `default` porte `core:default` et **rien
d'autre**. `tauri_plugin_dialog::init()` reste : une capacité ne gouverne que
les commandes atteignables depuis le WebView, jamais `app.dialog()` appelé
depuis l'hôte — vérifié sur les sources du plugin, dont le `FileDialogBuilder`
ne porte aucun contrôle de permission, l'ACL ne s'appliquant qu'aux commandes
IPC de `src/commands.rs`.

**Les preuves, retournées.**

| Preuve | Ce qui est établi |
|---|---|
| Rust, `the_capability_grants_the_webview_no_dialogue_and_no_filesystem_access` | La liste des permissions est **exactement** `["core:default"]`; aucune ne commence par `dialog:`, `fs:`, `shell:`, `opener:` ou `http:` |
| TypeScript, `realRoot.test.ts` | Même assertion sur le JSON, plus : aucune source de l'interface ne mentionne `plugin:dialog`, `@tauri-apps/plugin-dialog`, `plugin:fs` ni `@tauri-apps/plugin-fs` |
| Rust, garde de signatures | `map_brain_choose_real_root` reste enregistrée, `choose_collection` reste non enregistrée, et aucune signature exposée ne porte `Path`/`PathBuf` ni un paramètre nommé `path`, `root`, `folder`, `directory` ou `absolute_path` |
| **WebView2, à l'exécution** | Un `invoke` direct de `plugin:dialog\|open` — **avec et sans `defaultPath`** — et de `plugin:dialog\|save` est **refusé**. Aucun dialogue ne s'ouvre, aucun chemin réel n'est passé. Tauri nomme lui-même ce qui manque : `dialog.open not allowed. Permissions associated with this command: dialog:allow-open, dialog:default` |

### BC.2 Défaut B — un index antérieur à `DEC-0033` ne pouvait pas être republié

**Le constat.** `publish_map` faisait `if reused { open_store(paths, brain)?; }`
en pré-contrôle, et `open_store` exige un binding courant. Un index écrit par
`TASK-0031` n'en porte aucun : il était donc refusé **par tous les chemins**,
actualiser et reconstruire compris, et restait bloqué pour toujours. `DEC-0033`
D promettait l'inverse. **La « limite délibérément assumée » que `BB.5`
déclarait décrivait en réalité ce défaut.**

**La correction.** Ouvrir et republier ne posent plus la même question au même
fichier :

- `open_for_brain` — le fichier existe, sur un schéma compatible, et appartient
  à ce `brain_id`;
- `open_store` — y ajoute un binding **courant**; c'est ce que toute lecture de
  corpus exige;
- `check_publishable` — accepte en plus une voie **étroite** pour un index sans
  binding, sous toutes ces conditions à la fois : cerveau `SYNTHETIC_FIXTURE`,
  bon `brain_id`, schéma compatible, **ni** `source_kind` **ni** `source_ref`,
  et `fixture_id` exactement égal au `source_ref` du catalogue.

Le contrôle passe désormais **avant** la résolution de source, donc avant même
que le catalogue soit consulté pour une racine.

Le binding vérifié est la **paire** `source_kind` + `source_ref`. `BB` ne
vérifiait que l'identifiant : deux choses différentes peuvent porter le même
nom, et seule la paire dit laquelle un index contient.

**Les preuves** — `src-tauri/src/map/legacy_binding_tests.rs`, sur un index
ramené à la forme exacte de `TASK-0031`. Les douze clés de métadonnée de cette
forme sont **écrites dans le test**, relevées sur
`05fc371:src-tauri/src/map/brain_index.rs`, et le test échoue si l'index
fabriqué n'est pas exactement celle-là : il ne peut pas dériver vers la
compatibilité d'un fichier qui n'a jamais existé.

| Preuve | Ce qui est établi |
|---|---|
| `B1` | Le binding lu est `Legacy`. `map_open` refuse en `map_source_mismatch` et `map_view` échoue; le fichier est **identique octet pour octet** après le refus. Une actualisation explicite réussit : `index_id` **conservé**, `revision +1`, binding `Bound{SyntheticFixture, quasi-empty}` acquis, `indexReused = true`. Ensuite `map_open` réussit avec `sourceRead = false` |
| `B2` | Source retirée sous garde `Drop` : l'actualisation échoue, le fichier reste **identique octet pour octet**, et l'index reste refusé à l'ouverture — donc toujours republiable plus tard |
| `B3` | Un `REAL_ROOT` dont le binding a été retiré est refusé par **ouvrir, actualiser et reconstruire**; le fichier n'est pas muté et **la source n'est pas lue** |
| `B4` | Un `source_ref` différent est refusé; un `source_ref` **identique sous un `source_kind` différent** est refusé — le cas que la vérification d'origine laissait passer; un index legacy nommant une autre fixture n'est pas reconnu; un **demi-binding** est refusé partout. Aucune mutation dans aucun cas |
| `B5` | Reconstruire republie un index legacy exactement comme actualiser : `index_id` conservé, `revision +1` |

### BC.3 Validations de la passe corrective

Rust **324 PASS**, 0 échec, 5 ignorés. TypeScript **280 PASS**, 18 fichiers.
`pnpm check`, `pnpm build`, `cargo build --offline`, `git diff --check` verts.

`cargo fmt --check` : propre sur chaque ligne écrite par cette passe, vérifiée
fichier par fichier. La dette préexistante de `hierarchy.rs`,
`content_signals.rs` et `relation_commands.rs` reste inchangée.

`cargo clippy --all-targets --offline -- -D warnings` : **rouge à 26 erreurs**,
le même nombre qu'avant la passe. Une 27ᵉ était apparue —
`let_and_return` dans le nouveau fichier de test — et a été corrigée avant
livraison. `R-T30-1` inchangée.

Rejeu **WebView2 152.0.4191.66** relancé en entier : les trois refus de
permission ci-dessus, puis le cycle `REAL_ROOT` complet inchangé — 1 210 nœuds
indexés, révisions 2 → 3 → 4 à `indexId` constant, 256 nœuds et 4 agrégats sous
le budget de 512, `absolutePathLeak = false`, source inchangée, 0 erreur
console fatale. Artefact `docs/performance/runs/TASK-0032-webview2.json`
remplacé, **non canonique**, hors `X5`.

### BC.4 Non testé, et limites

**Non testé :** l'appel Rust au dialogue natif n'est pas exercé à l'exécution —
l'ouvrir demanderait de piloter une fenêtre modale Windows. Que `app.dialog()`
ne dépende d'aucune permission a été établi **sur les sources installées** de
`tauri-plugin-dialog 2.7.2`, non par une exécution. C'est une limite nouvelle,
créée par la correction elle-même, et elle est déclarée comme telle.

La voie de compatibilité legacy ne s'ouvre **que** pour un cerveau synthétique
dont le `fixture_id` correspond encore au `source_ref` du catalogue. Un index
legacy dont la fixture a été renommée n'est pas reconnu et doit être reconstruit
depuis zéro. C'est délibéré : le `fixture_id` est le seul fait de l'ancienne
métadonnée qui rattache le fichier à une source.

Tout le reste des limites de `BB.5` demeure : aucun cerveau personnel, aucun
watcher, aucun incrémental, aucun FTS5, aucune identité physique `F-046`,
aucune acceptance de performance sur grande racine, dette
`Registry`/`legacy_store` non supprimée.

**Réserves :** inchangées par rapport à `BB.5`. `R-T30-1` clippy strict rouge.
`R-T30-5` traitée uniquement dans la portée `REAL_ROOT` de test. `R-T30-3`,
`R-T30-4`, `R-T30-6` et `R8` ouvertes. `R-T30-2` levée dans sa portée
synthétique par `ACTION-0048`. **X5 = 36**, inchangé.

## BD. ACTION-0049 — contrôle indépendant enregistré, TASK-0032 VERIFIED — 2026-09-10

**Verdict indépendant déjà rendu et déjà sur la branche** —
[`docs/reviews/ACTION-0049-independent-recontrol.md`](../reviews/ACTION-0049-independent-recontrol.md),
commit `f6a7d06`, fusion `f549f7c` — **enregistré ici seulement maintenant**
parce que ce commit n'avait mis à jour aucun des cinq documents durables
(`CURRENT_STATE.md`, `HANDOFF.md`, `VALIDATION.md` — ce fichier —,
`CHANGELOG_AI.md`, la fiche `TASK-0032`), qui contredisaient donc le verdict
depuis lors. Cette section ne rend aucun verdict : elle consigne celui déjà
rendu par l'orchestrateur technique indépendant, comme `BA`, `AZ`, `AX` et les
autres sections « ACTION » le font pour les tâches précédentes.

**Verdict :** `TASK-0032 = VERIFIED` dans sa portée. Les dix contrôles
indépendants d'`ACTION-0049` couvrent : la frontière WebView refermée
(`core:default` seul, aucun `dialog:`/`fs:`/`shell:`/`opener:`/`http:`), la
porte unique `map_brain_choose_real_root(app)` sans chemin venu du WebView, la
commande réellement enregistrée dans `generate_handler!`, `open_store` exigeant
la paire `source_kind` + `source_ref`, `check_publishable` distinct d'`open`,
la voie legacy étroite (synthétique seulement, jamais `REAL_ROOT`), les
preuves `B1`-`B5` sur la forme exacte de `TASK-0031`, `RR1`-`RR10` non
affaiblies selon les preuves d'exécuteur, aucune donnée personnelle dans les
preuves canoniques, et une portée de changement maîtrisée.

**Limites maintenues, non levées par ce verdict :** modale native non
automatisée (contrôlée sur les sources installées, pas à l'exécution), aucun
watcher/incrémental, aucun FTS5/identité physique, aucune acceptance
laptop/performance sur grande racine, dette `Registry`/`legacy_store`, qualité
de visualisation d'un grand cerveau hors portée de `TASK-0032` — devenue la
tranche suivante, `TASK-0033` en section `BE`.

## BE. TASK-0033 — projection topographique progressive — 2026-09-10

**Statut : `IMPLEMENTED`, jamais auto-`VERIFIED`.** Branche
`build/v0.2-a17-v1-topographic-ux`. `DEC-0034 = APPROVED`, inchangée.
Exécuteur : Claude Code. Prérequis `TASK-0032 = VERIFIED` (`BD`) satisfait
avant tout code.

### BE.1 Le problème visé

Le premier essai sur un vrai cerveau local (rapporté dans `TASK-0033`, section
« Problème constaté ») montrait une carte techniquement correcte mais
illisible : jusqu'à 256 vrais blocs plus leurs agrégats, des rectangles
« N enfants hors vue » de la taille d'un vrai dossier, un `fitView()` global
qui rétrécissait toute la carte à chaque navigation. La référence historique
n'affichait qu'une cinquantaine de blocs sémantiques au-dessus d'un index de
plusieurs milliers d'entrées.

### BE.2 Projection dossier-first, cible ordinaire de 64 blocs

`src-tauri/src/map/projection.rs` introduit `ORDINARY_MATERIAL_TARGET = 64`.
`VIEW_BUDGET = 512` et `MATERIAL_BUDGET = 256` (la moitié, un créneau
d'agrégat par nœud matériel) restent les seules bornes dures, inchangées.
Un nouveau calcul,
`effective_target = ORDINARY_MATERIAL_TARGET.max(selected.len()).min(MATERIAL_BUDGET)`,
remplace `MATERIAL_BUDGET` comme cible de remplissage dans les trois appels
à `children_page` de `materialize_view`, sans toucher au garde-fou
préexistant (`selected.len() >= MATERIAL_BUDGET` reste l'unique refus
« ancestry dépasse le budget »).

**Aucun tri n'a été ajouté pour préférer les dossiers.**
`idx_nodes_child_order` (`parent_id, child_order_rank, name_fold, id`,
`hierarchy.rs`, en place depuis `DEC-0030`) trie déjà chaque page
dossiers-avant-fichiers — `child_order_rank` est une colonne **générée**
valant `0` pour un `directory`, `1` sinon. Remplir une cible plus petite est
donc la seule chose qui change, et cela suffit : les dossiers occupent les
premiers rangs de chaque page, les fichiers ne prennent que ce qu'il reste.

| Preuve (`projection_tests.rs`) | Ce qui est établi |
|---|---|
| `ordinary_view_targets_at_most_sixty_four_real_blocks` | Sur un arbre de 400 enfants mixtes, la projection ordinaire matérialise **exactement 64** nœuds, jamais plus — la cible est bien la cause de l'arrêt, pas un hasard de petit arbre |
| `directories_are_retained_over_files_when_the_ordinary_target_cuts_the_page` | Sur 50 dossiers + 100 fichiers, les **50 dossiers** sont tous retenus avant qu'un seul des 100 fichiers ne le soit; les 13 créneaux restants vont aux fichiers; le compte d'omission de l'agrégat racine (`150 - 63 = 87`) reste exact |
| `deep_ancestry_is_never_dropped_and_a_targeted_file_stays_bounded` | Une chaîne de 100 ancêtres + le fichier focus (101 nœuds) est matérialisée **entièrement**, bien au-delà de la cible de 64; aucun agrégat, aucune lecture hors de l'ancestry — le contexte d'un fichier explicitement ciblé reste borné à sa chaîne, pas au corpus environnant |

### BE.3 Les agrégats restent exacts, mais ne sont plus dessinés comme un faux dossier

Le type `ViewAggregate` (comptage exact d'omissions, curseur de continuation,
`reason` interne) est **inchangé** en Rust — `DEC-0031` reste respectée à la
lettre. Seul le rendu change, dans `src/map/MapView.tsx` :

- une pastille compacte (`AGGREGATE_PILL_MIN_WIDTH = 96`, hauteur `34`, au
  plus `150` de large) centrée dans le créneau que le layout lui réservait
  déjà (`a.rect`, plein format de carte, pour que rien ne chevauche);
- le libellé produit vient d'une seule fonction, `aggregateLabel()` — « +N
  élément(s) — Voir la suite » — jamais `view_budget_or_focus`,
  `outside_current_projection` ni un compte brut sans phrase;
- `MapApp.tsx`'s bouton de secours (section « Navigation progressive ») et la
  pastille SVG partagent la **même** fonction, pour qu'aucune des deux
  surfaces ne puisse dériver du vocabulaire de l'autre.

| Preuve (`projection.test.tsx`) | Ce qui est établi |
|---|---|
| Pastille compacte | `rect.map-aggregate__pill` a une largeur `< 160` et une hauteur `< 40`, très sous les `240 × 64` d'une carte |
| Aucun vocabulaire interne | Le texte rendu ne contient ni `view_budget_or_focus`, ni `outside_current_projection`, ni `omitted_direct_children`, ni l'ancien libellé `enfants directs hors vue`; il contient `Voir la suite` |
| Activable au clavier | `Enter` et `Espace` déclenchent `onExpand` sur le nouveau bouton, sans sélection inventée (test retourné, wording mis à jour) |

### BE.4 Caméra lisible avant caméra exhaustive

`src/map/viewState.ts` gagne deux fonctions pures :

- `readableView(focusRect, world, viewport)` — échelle `READABLE_SCALE = 1`
  ajustée par `clampScale`/`scaleBounds` (une carte minuscule est agrandie
  jusqu'au plancher des bornes plutôt que laissée flottante; une carte qui
  déborde garde l'échelle `1` et déborde, ce qui est le but), centrée sur
  `focusRect`;
- `recenterOnFocus(focusRect, view, world, viewport)` — un alias explicite
  d'`ensureRectVisible` à ce site d'appel : pan minimal, **échelle jamais
  changée**, aucun mouvement si le focus est déjà visible.

Dans `src/map/MapApp.tsx`, l'effet qui suivait `projectionKey` (déclenché par
toute navigation de branche, dépliage d'agrégat ou actualisation) appelait
`fitView(world, viewportRef.current)` — un ajustement **global** — à chaque
déclenchement, écrasant le zoom/pan choisi par la personne. Il appelle
désormais `recenterOnFocus`. L'effet d'ouverture d'une composition et le
bouton **Réinitialiser** utilisent `readableView`, centrée sur la sélection ou
sur la racine du cerveau actif. **Seul le bouton « Ajuster à l'écran »**
(et son équivalent clavier `f`/`F` sur la sélection) appelle encore
`fitView(world, …)` — c'est désormais la seule action qui force un
ajustement global, comme `DEC-0034` E l'exige. Le raccourci `r`/`R` de
`MapView.tsx` suit la même règle via un ancrage local
(`resetAnchorRect`, sélection ou racine du territoire actif).

| Preuve (`viewState.test.ts`) | Ce qui est établi |
|---|---|
| `readableView` centre à l'échelle lisible | Le focus est centré à l'écran, à l'échelle `READABLE_SCALE` sur un monde qui déborde |
| `readableView` n'agrandit jamais au-delà du nécessaire, ni ne réduit un grand monde | Sur un monde très grand, l'échelle reste `>= READABLE_SCALE`; sur un monde minuscule, elle monte au plancher des bornes (`scaleBounds().min`) |
| `recenterOnFocus` conserve l'échelle | L'échelle après recentrage est **identique** à l'échelle avant, y compris quand un pan est nécessaire |
| `recenterOnFocus` ne bouge rien quand le focus est déjà visible | Même référence d'objet renvoyée (`toBe`), comme `ensureRectVisible` |

### BE.5 Direction graphique amorcée, sans changement de moteur

Fond quadrillé clair référencé par id (`<pattern id="map-grid-pattern">` dans
`MapView.tsx`, classes `.map-grid-pattern__cell`/`.map-grid-pattern__lines`
dans `map.css`) appliqué au cadre de territoire — il pose et zoome avec le
contenu plutôt qu'avec la fenêtre. Racine assombrie (`--root: #203040`).
Ombre légère sur le cadre (`filter: drop-shadow`). **Non repris dans cette
tranche :** la palette de relations par direction (sortante verte, entrante
turquoise, bidirectionnelle violette) que `REFERENCE_UX_OLD_FILETOPO.md`
documente **comme une direction, pas une dépendance** — laissée à une tranche
ultérieure, `DEC-0034` G l'autorisant explicitement.

### BE.6 Validations

Rust **327 PASS**, 0 échec, 5 ignorés (`cargo test --offline`, suite
complète — 324 avant cette tâche, +3 nouveaux tests). TypeScript **289 PASS**,
18 fichiers (`vitest run`, suite complète — 280 avant, +9 nouveaux tests).
`tsc --noEmit` (`pnpm check`) et `vite build` (`pnpm build`) verts.
`cargo build --offline` vert. `git diff --check` vert.

`cargo fmt --check` : propre sur `projection.rs` et `projection_tests.rs`,
les deux seuls fichiers Rust touchés. La dette préexistante (143 diagnostics
dans d'autres fichiers du crate, non touchés par cette tâche) est **rapportée
et laissée intacte** — une reformattage accidentel plus large, produit par un
appel `rustfmt` direct avec la mauvaise édition, a été détecté et annulé avant
livraison (`git checkout` sur les fichiers non concernés).

`cargo clippy --all-targets --offline -- -D warnings` : rouge à **26
erreurs**, réparties sur 12 fichiers préexistants
(`relation_commands.rs`, `relations.rs`, `rule_engine.rs`,
`content_signals.rs`, `legacy_store.rs`, `brains.rs`, `lib.rs`, et le module
`scale_spike`/`scale_query`) — **aucune** dans `projection.rs` ni
`projection_tests.rs`. Même compte qu'avant cette tâche.

### BE.7 Non testé, et limites

**Non testé, déclaré explicitement : aucun rejeu WebView2** n'a été exécuté
par cette passe — ni sur `1366×768` ni sur `1920×1080`, ni sur une
arborescence synthétique de grande taille. La lisibilité perceptuelle (vrais
noms lisibles, absence de chevauchement, comportement réel de la caméra lors
d'une navigation de branche) n'est donc prouvée qu'au niveau des tests
unitaires/composant Vitest, pas au niveau produit dans un vrai processus
WebView2. C'est une limite de cette livraison, à couvrir avant tout
`VERIFIED` — pas une affirmation de succès non vérifiée.

**Hors portée, comme prévu par `DEC-0034` G :** aucun watcher, aucun
changement récent/vu-non-vu, aucun FTS5/recherche avancée, aucune
« Ouvrir dans l'Explorateur », aucune préférence d'écran/icône, aucun second
index/catalogue/store, aucun nouveau renderer Canvas/WebGL/Pixi, aucun chemin
absolu IPC, aucun réseau/cloud/LLM/MCP, aucune donnée personnelle.

**Réserves :** inchangées par rapport à `BC`/`BD` — `R-T30-1` (clippy strict
rouge), `R-T30-3`, `R-T30-4`, `R-T30-6`, `R8` ouvertes; `R-T30-5` traitée
uniquement dans la portée `REAL_ROOT` de test. **X5 = 36**, inchangé;
`origin/main` inchangé.

## BF. TASK-0033 — passe d'acceptation produit WebView2 — 2026-09-10

**Statut inchangé : `IMPLEMENTED`, jamais auto-`VERIFIED`.** Même branche
`build/v0.2-a17-v1-topographic-ux`, même `DEC-0034`, inchangée. Suite au
contrôle indépendant `ACTION-0050`, section ci-après, qui trouvait le code
cohérent mais le rejeu produit obligatoire manquant.

### BF.1 Le rejeu, réel

`scripts/task0033-seed-proof.py` génère une arborescence `REAL_ROOT`
synthétique de **5 206 éléments**, quatre branches délibérément
déséquilibrées : `A` (120 sous-dossiers, aucun fichier à ce niveau — un
overflow purement dossier), `B` (40 dossiers + 90 fichiers directs — la
vraie compétition dossier-first), `C` (4 356 fichiers plats — remplissage
par des fichiers quand rien ne fait concurrence, et une longue chaîne de
pagination), `D` (chaîne à enfant unique, 15 niveaux — ancestry profonde).
`scripts/task0033-webview2.mjs`/`.ps1` pilotent le vrai produit en WebView2
via CDP (`Input.dispatchKeyEvent` pour le clavier, `Input.dispatchMouseEvent`
pour un clic de sélection réel — jamais `element.click()`,
`Emulation.setDeviceMetricsOverride` pour rejouer 1366×768 puis 1920×1080
dans le même processus sans dépendre de `Browser.setWindowBounds`, non
garanti sur la session CDP scoped-page de WebView2). Preuve non canonique :
[`TASK-0033-webview2.json`](../performance/runs/TASK-0033-webview2.json).

Noms de dossiers volontairement très courts (`A`, `B`, `C`, `D`, `t` pour la
racine) : au-delà d'une quinzaine de niveaux, un chemin absolu réaliste sous
un vrai checkout dépasse vite `MAX_PATH` (260 caractères) sous Windows sans
support des chemins longs — mesuré en pratique lors de l'écriture de cette
passe.

### BF.2 Défaut trouvé A — la vue ordinaire pouvait engloutir un arbre entier dans une seule branche

**Le constat.** `materialize_view` gardait, après la page des enfants
directs du focus, une boucle qui continuait à paginer récursivement les
enfants du **premier** élément de la file — un reliquat de l'algorithme
d'avant `DEC-0034`, où le budget de 256 rendait la question sans
conséquence pratique. À la cible de 64, sur l'arbre de preuve, `A` (premier
dossier alphabétique parmi les enfants de la racine, 120 sous-dossiers)
consommait à lui seul presque toute la cible restante, si bien que `B`, `C`
et `D` n'apparaissaient dans la vue racine que comme de simples cartes,
**jamais leurs propres enfants** — mais surtout, le mécanisme aurait pu tout
aussi bien vider la cible entière sur `A` avant même que `B`/`C`/`D` ne
soient traités, selon l'ordre. C'est exactement ce que `DEC-0034` B
interdit : « la racine et l'ancestry du focus restent prioritaires; ensuite,
la projection privilégie les dossiers » — pas « le premier dossier rencontré
dévore le budget des autres ».

**La correction.** L'expansion automatique s'arrête à la page des enfants
directs du focus. Descendre d'un niveau est désormais **toujours** une
navigation explicite (`DEC-0034` C) — une nouvelle requête avec cet enfant
comme focus — jamais un effet de bord de l'affichage de son parent.

**Les preuves.**

| Preuve | Ce qui est établi |
|---|---|
| Rust, `ordinary_view_never_pulls_in_grandchildren_even_from_a_small_branch` | Sur un arbre à trois branches de tailles très différentes (100, 5 et 0 enfants), la vue ordinaire ne matérialise que les trois enfants directs — aucun petit-enfant, quelle que soit la taille de la branche; chaque branche non vide porte son propre agrégat au compte exact; entrer explicitement dans la grosse branche révèle bien ses propres enfants |
| WebView2, réel | Depuis la racine de l'arbre de preuve, `A`, `B`, `C`, `D` apparaissent tous les quatre comme cartes, chacun avec sa propre pastille d'agrégat si applicable; aucun enfant de `A` n'apparaît avant d'être explicitement sélectionné |
| Rust, `directories_are_retained_over_files_when_the_ordinary_target_cuts_the_page` (préexistant, revérifié) | Toujours vert : le retrait de l'expansion multi-niveaux ne change rien à la priorité dossier-first au niveau d'un seul focus |

**Corrections de tests entraînées, pas un changement de contrat.** Quatre
tests préexistants (`the_same_node_id_in_two_brains_resolves_only_inside_its_own`
dans `commands.rs`; `a_node_reference_resolves_only_inside_its_own_brain` et
`a_pending_suggestion_enters_no_count_until_it_is_approved` dans
`cross_commands.rs`; `approval_moves_a_suggestion_into_the_counts_and_only_then`
dans `relation_commands.rs`) obtenaient l'id d'un nœud imbriqué (par exemple
`dossier-a/note-1.txt`) en lisant la vue **par défaut** de `quasi-empty` —
qui, avant cette correction, listait accidentellement tout l'arbre parce que
`quasi-empty` est assez petit pour que l'ancienne expansion multi-niveaux
l'atteigne en entier. Une fois cette expansion retirée, la vue par défaut
n'y donne plus accès. Corrigés pour résoudre le chemin par navigation
explicite, segment par segment (`resolve_by_path` dans `cross_commands.rs`,
`source_id` dans `relation_commands.rs`) — ce que le produit fait
réellement désormais. Aucun de ces quatre tests ne portait sur la
profondeur de la vue par défaut; leur objet (isolation entre cerveaux,
comptage de suggestions) est inchangé et toujours vérifié.

### BF.3 Défaut trouvé B — la caméra pouvait rester coincée hors du canevas visible

**Le constat.** `.map-view` peut grandir **après** le premier
positionnement de la composition : le panneau latéral se remplit de données
réelles de façon asynchrone (relations, observations de contenu), ce qui
change la hauteur de la rangée de grille `.app__main` et donc la taille de
`.map-view`, qui la suit (`flex: 1`). Rien ne réappliquait alors les bornes
de la caméra à la nouvelle taille : la vue restait calculée pour l'ancienne
hauteur, plaçant potentiellement le focus hors du canevas désormais plus
grand — observé concrètement lors du rejeu, où la carte `A` rendait à une
coordonnée écran située au-dessus du sommet réel du canevas.

**La correction.** Un effet dédié, distinct de celui qui positionne une
composition fraîche, réapplique `clampView` — jamais un recentrage —
chaque fois que les dimensions du viewport changent. Il conserve tout pan/
zoom déjà choisi tant qu'il reste valide, et le ramène dans les bornes
seulement quand la nouvelle taille l'exige.

**La preuve.** Rejeu WebView2 réel : après redimensionnement du viewport
émulé de 1366×768 à 1920×1080 en cours de session, la sélection et la
navigation vers `A` restent cohérentes (panneau de détails, DOM) aux deux
tailles, sans qu'aucune carte ne rende hors du canevas mesuré.

### BF.4 Preuves confirmées en conditions réelles, aux deux résolutions

| Preuve | 1366×768 | 1920×1080 |
|---|---|---|
| Total indexé | 5 206 | 5 206 |
| Vue ordinaire ≤ 64 | ✓ | ✓ |
| Dossiers d'abord, overflow pur (`A`) | 62 affichés, tous dossiers, 58 omis | identique |
| Dossiers d'abord, overflow mixte (`B`) | 40 dossiers + 22 fichiers, aucun fichier avant un dossier, 68 omis | identique |
| Continuation sans accumulation (`C`) | ✓, pages disjointes | — |
| Navigation profonde (`D`) | ✓, 5 sauts réels | — |
| Échelle caméra inchangée sur navigation de branche | ✓ | ✓ |
| `Ajuster à l'écran` produit un fit exhaustif | échelle ≈ 0,094 (colonne de 62 cartes) | échelle ≈ 0,085 |
| `Réinitialiser` revient à l'échelle lisible | `1`, jamais le fit exhaustif | `1`, jamais le fit exhaustif |
| Pastille d'agrégat compacte | 150×34 | 150×34 |
| Vocabulaire interne visible | aucun | aucun |
| Fuite de chemin absolu | aucune | aucune |
| Erreurs console fatales | 0 | 0 |

### BF.5 Validations rejouées après correction

Rust **328 PASS**, 0 échec, 5 ignorés (327 avant cette passe, +1 nouveau
test de régression). TypeScript **289 PASS**, inchangé. `pnpm check`,
`pnpm build`, `cargo build --offline`, `git diff --check` verts.

`cargo fmt --check` : propre sur chaque ligne écrite par cette passe dans
`projection.rs`, `cross_commands.rs`, `relation_commands.rs`, `commands.rs`,
vérifiée hunk par hunk contre `git diff`. Dette préexistante ailleurs dans
le crate (143 diagnostics, dont l'essentiel dans `relation_commands.rs` en
dehors des lignes touchées ici) rapportée et laissée intacte.

`cargo clippy --all-targets --offline -- -D warnings` : rouge à **26
erreurs**, même compte qu'avant cette passe, aucune dans un fichier touché
par cette passe (vérifié ligne par ligne contre les emplacements rapportés).

### BF.6 Non testé, et limites

**Non testé :** acceptance laptop modeste — poste de développement
seulement. Le redimensionnement du rejeu utilise
`Emulation.setDeviceMetricsOverride` (CDP), pas un changement physique de
moniteur; le comportement d'un vrai changement de moniteur/DPI n'est pas
couvert.

**Incohérence documentaire signalée par `ACTION-0050`, corrigée :**
`NEXT_ACTION.md`/`HANDOFF.md` de la livraison précédente laissaient entendre
que `fitView` restait utilisé à la première ouverture d'une composition;
c'est `readableView` depuis le code livré à `393d319`. Corrigé dans la
fiche `TASK-0033`, `HANDOFF.md` et `CURRENT_STATE.md`.

Tout le reste des limites de `BE` demeure : aucun watcher, aucun
incrémental, aucun FTS5, aucune identité physique, aucune « Ouvrir dans
l'Explorateur », palette de relations par direction non reprise.

**Réserves :** inchangées par rapport à `BE` — `R-T30-1` (clippy strict
rouge), `R-T30-3`, `R-T30-4`, `R-T30-6`, `R8` ouvertes; `R-T30-5` traitée
uniquement dans la portée `REAL_ROOT` de test. **X5 inchangé**;
`origin/main` inchangé.

### BF.7 Conclusion

Le verrou d'acceptation qu'`ACTION-0050` avait posé est levé : le rejeu
produit obligatoire est fait, réel, aux deux résolutions demandées, et les
deux défauts qu'il a révélés sont corrigés dans la portée stricte de
`TASK-0033`. **`TASK-0033` reste `IMPLEMENTED` — le verdict `VERIFIED`
appartient au prochain contrôle indépendant, pas à cette passe.**

## BG. ACTION-0051 — contrôle indépendant enregistré, TASK-0033 VERIFIED — 2026-09-10

**Verdict indépendant déjà rendu, sur la branche précédente** —
[`docs/reviews/ACTION-0051-independent-recontrol.md`](../reviews/ACTION-0051-independent-recontrol.md),
livraison contrôlée `243e21b`, résultat épinglé par `156361a` — **enregistré
ici seulement maintenant** parce que ce commit n'avait mis à jour aucun des
cinq documents durables (`CURRENT_STATE.md`, `HANDOFF.md`, `VALIDATION.md`
— ce fichier —, `CHANGELOG_AI.md`, la fiche `TASK-0033`), qui affichaient
donc encore « en attente de contrôle » alors que le verdict était déjà sur
la branche. Cette section ne rend aucun verdict : elle consigne celui déjà
rendu par l'orchestrateur technique indépendant, comme `BD` l'a fait pour
`ACTION-0049`.

**Verdict :** `TASK-0033 = VERIFIED` dans sa portée. Le contrôle confirme :
preuve WebView2 réelle (152.0.4191.66, corpus 5 206 nœuds, deux résolutions);
`VIEW_BUDGET = 512` reste la borne dure, `ORDINARY_MATERIAL_TARGET = 64`
reste une cible produit; le défaut A (expansion automatique multi-niveaux de
la vue ordinaire) est correctement circonscrit — seule la page des enfants
directs du focus est matérialisée; le défaut B (`clampView` sur changement
de dimensions du viewport) ne recentre pas et ne remplace pas
`readableView`/`recenterOnFocus`; les tests ajustés naviguent explicitement
sans changer le sujet qu'ils testent; confidentialité confirmée (arbre
généré par le harnais, aucun chemin absolu observé); validations de
l'exécuteur (Rust 328, TypeScript 289, clippy rouge à 26 erreurs
historiques) rapportées telles quelles.

**Réserves non bloquantes maintenues :** redimensionnement émulé via CDP,
pas un changement physique de moniteur; poste de développement, pas un
laptop modeste; palette directionnelle historique des relations restée hors
portée.

**État :** `TASK-0033 = VERIFIED` dans sa portée; `DEC-0034 = APPROVED`.
Action suivante à cette date-là : continuer vers une V1 utilisable sans
rouvrir l'architecture — devenue `TASK-0034`, section `BH`.

## BH. TASK-0034 — V1 Find & Open — 2026-09-10

**Statut : `IMPLEMENTED`, jamais auto-`VERIFIED`.** Branche
`build/v0.2-a18-v1-find-open`. Aucune nouvelle décision — `DEC-0031`,
`DEC-0033`, `DEC-0034` inchangées. Exécuteur : Claude Code. Prérequis
`TASK-0033 = VERIFIED` (`BG`) satisfait avant tout code.

### BH.1 But et réutilisation

Retrouver un nœud par nom ou chemin relatif dans l'Index canonique, le
focaliser dans la carte progressive, puis permettre « Ouvrir dans
l'Explorateur Windows » sans jamais exposer de chemin absolu au WebView.
Aucun nouvel index, aucun nouveau moteur de recherche : la tranche raccorde
des primitives déjà présentes.

| Primitive | Statut |
|---|---|
| `Index::query_nodes()` | Réutilisée telle quelle — échappement `%`/`_`/`\`, tri dossiers-avant-fichiers, total exact, aucun SQL dupliqué |
| `map_view(brain_id, focus_id, after)` / `changeProjection()` | Réutilisés tels quels pour l'activation d'un résultat — aucune nouvelle logique de caméra |
| `BrainNodeRef` | Réutilisé tel quel comme identité IPC |
| `resolve_indexed_target()` (prototype 0.1) | Adapté en `confine_indexed_target()`, contre `BrainSource::resolve(...).root(...)` au lieu du `Registry` |
| lancement direct `explorer.exe` (prototype 0.1) | Adapté à l'identique (`/select,` fichier, chemin nu dossier), extrait dans `explorer_argument()` pour rester testable sans spawn |
| `query_collection_nodes`, `mark_node_seen`, `reveal_indexed_node` | **Non réactivés** — toujours `#[allow(dead_code)]`, non enregistrés |

### BH.2 Recherche bornée — `map_search_nodes`

`src-tauri/src/map/commands.rs::search_nodes` : `open_store()` obligatoire
(appartenance + binding), `SEARCH_LIMIT_MAX = 50` comme plafond serveur,
`SEARCH_QUERY_MAX_CHARS = 200`. Une requête vide ou blanche court-circuite
**avant** tout appel à `query_nodes` : sa clause `WHERE` traite `''` comme
« tout » pour d'autres appelants légitimes (la file de révision legacy), et
une recherche n'en est pas un. Chaque page publie `total`, `offset`,
`limit`, `indexRevision`.

| Preuve (`find_open_tests.rs`) | Ce qui est établi |
|---|---|
| `a_partial_name_or_path_match_is_found_and_the_page_is_bounded` | Correspondance nom et chemin relatif; une limite demandée au-delà de 50 est plafonnée, jamais honorée |
| `an_empty_or_blank_query_returns_an_empty_page_never_the_corpus` | `""`, `"   "`, `"\t"` rendent tous une page vide |
| `total_offset_and_limit_are_exact_across_pages` | Deux pages de 10 sur 30 résultats : comptes exacts, aucun id répété entre les pages |
| `percent_underscore_and_backslash_are_search_targets_not_wildcards` | `%`, `_` et `\` recherchés littéralement; un `_` non échappé ne se comporte jamais comme le joker SQL « un caractère quelconque » |
| `results_are_isolated_by_brain` | Deux cerveaux, même terme : chaque recherche ne rend que ses propres résultats |
| `search_reads_only_the_index_even_once_the_source_is_gone` | Recherche réussie sans qu'aucune fixture n'ait jamais été matérialisée sur disque |
| `the_search_dto_carries_no_absolute_or_source_path` | Le JSON sérialisé ne contient ni `absolutePath`, ni `rootPath`, ni `sourcePath`, ni `folderPath` |
| `the_published_revision_changes_when_the_index_is_republished` | Une republication fait avancer `indexRevision` |

### BH.3 « Ouvrir dans l'Explorateur » — `map_reveal_node`, frontière sûre

`reveal_node(paths, brain, reference: &BrainNodeRef)` : vérifie
`reference.belongs_to(&brain.brain_id)`, ouvre via `open_store()`, lit le
nœud depuis l'Index, refuse `reparse_point` ou `kind == Skipped` **avant**
toute résolution de racine. `BrainSource::resolve(paths, brain)?.root(paths)`
donne la vraie racine; `confine_indexed_target()` marche chaque composante du
`relative_path`, refusant tout lien/point d'analyse ou toute entrée absente.
`explorer_argument()` construit l'argument (`/select,<chemin>` pour un
fichier, chemin nu pour un dossier), et `reveal_node` lance
`std::process::Command::new("explorer.exe")` directement — jamais via un
shell. Aucun chemin n'est jamais retourné au frontend : `Result<(), MapError>`.

| Preuve (`find_open_tests.rs`) | Ce qui est établi |
|---|---|
| `reveal_refuses_a_reference_from_another_brain` | `BrainMismatch` sur un `BrainNodeRef` d'un autre cerveau |
| `reveal_refuses_a_skipped_or_reparse_flagged_node_before_touching_disk` | Refus avant toute résolution de racine, sur les deux drapeaux |
| `reveal_refuses_an_unknown_node_id` | `NodeMissing` sur un id absent de l'Index |
| `reveal_refuses_a_target_that_disappeared_after_indexing` | Sur un **vrai** dossier de fixture, fichier supprimé après indexation : refus `indexed_target_unavailable`, via la vraie marche de confinement |
| `confinement_rejects_a_crafted_parent_directory_component` | Un `..` injecté dans le chemin est refusé |
| `confinement_accepts_a_real_nested_entry_and_refuses_a_missing_one` | Chemin confiné exact sur une vraie entrée; refus exact sur une entrée absente |
| `the_explorer_argument_selects_a_file_and_opens_a_directory_directly` | Construction de l'argument, sans jamais lancer de processus |

Guard structurel (`lib.rs::search_and_reveal_are_exposed_and_reveal_takes_only_a_brain_node_ref`,
étend le guard existant `exposed_commands_stay_within_the_slice`) : les deux
commandes sont enregistrées; la signature de `map_reveal_node` ne contient
que `reference: map::brains::BrainNodeRef`, sans `path`/`root`/`folder`/
`directory`; celle de `map_search_nodes` ne contient aucun mot-clé
`absolute`/`root:`/`folder`/`directory`. Le guard préexistant
`the_capability_grants_the_webview_no_dialogue_and_no_filesystem_access`
reste vert sans modification — aucune permission nouvelle.

### BH.4 Interface — recherche et activation

`src/map/MapApp.tsx` ajoute une section de recherche dans la barre d'outils
du cerveau focalisé (champ, résultats, pagination, effacement). Activation
d'un résultat : vérifie la révision courante contre celle de la page (garde
défensive; l'effet de recherche se re-déclenche déjà automatiquement sur un
changement de révision), puis appelle **`changeProjection` tel quel** — la
même fonction qui gère déjà la navigation d'agrégat et de sélection depuis
`TASK-0033`. Aucune nouvelle logique de caméra n'a été écrite.

`src/map/DetailsPanel.tsx` ajoute « Ouvrir dans l'Explorateur », visible
uniquement avec une `reference` et un gestionnaire fournis, appelant
**exactement** `onReveal(reference)` — prouvé par
`DetailsPanel.test.tsx::calls onReveal with exactly the reference it was
given — no extra field`, qui compare les clés de l'objet reçu à
`["brainId", "nodeId"]` sans rien d'autre. États occupé et erreur générique
(sans chemin) également prouvés.

### BH.5 Rejeu WebView2

`scripts/task0034-seed-proof.py` réutilise le harnais `TASK-0033` — arbre
`REAL_ROOT` synthétique de **5 206 éléments**, quatre branches
déséquilibrées — avec un fichier nommé de façon fixe
(`C/cible-recherche-unique.txt`) comme cible de recherche connue, hors de
la projection ordinaire. `scripts/task0034-webview2.mjs`/`.ps1` pilotent le
vrai produit : `Input.insertText` pour une frappe réelle dans le champ de
recherche, `Input.dispatchMouseEvent`/`dispatchKeyEvent` pour la sélection
et l'activation.

| Étape | Résultat |
|---|---|
| Indexation | 5 206 nœuds |
| Cible hors projection ordinaire | Confirmé — absente de la vue racine |
| Recherche | 1 résultat exact, borné, chemin relatif et révision corrects; DOM et DTO direct concordent |
| Requête vide | Aucun panneau de résultats affiché |
| Activation | Nouvelle projection chargée, nœud sélectionné, panneau de détails cohérent (`.details__name`, `.details__path`) |
| Invalidation de révision | Un refresh réel fait avancer la révision (1 → 2); l'interface la republie automatiquement plutôt que de garder une page périmée |
| Ouvrir dans l'Explorateur | Invocation directe sur la cible synthétique, spawn réussi |
| Confidentialité | Aucune fuite de chemin absolu dans le DOM, les payloads `map_view`/`map_search_nodes`, ni le journal hôte |
| Erreurs console | 0 erreur fatale |

**Défaut de harnais trouvé et corrigé pendant l'écriture de cette preuve, pas
dans le produit :** appeler `map_refresh` directement depuis le script, en
plus du clic UI qui l'avait déjà déclenché, avançait la révision côté
backend sans que l'état React de l'application ne le sache — celui-ci
n'apprend une révision que par ses propres appels internes. Corrigé en
lisant l'état via `map_view` (lecture seule) plutôt qu'en rappelant
`map_refresh`. Documenté dans `HANDOFF.md` pour le prochain rejeu.

Preuve non canonique :
[`TASK-0034-webview2.json`](../performance/runs/TASK-0034-webview2.json).

### BH.6 Validations

Rust **344 PASS**, 0 échec, 5 ignorés (328 avant cette passe, +16 : 15
`find_open_tests` + 1 garde `lib.rs`). TypeScript **294 PASS** (289 avant,
+5 `DetailsPanel.test.tsx`). `pnpm check`, `pnpm build`,
`cargo build --offline`, `git diff --check` verts.

`cargo fmt --check` : propre sur `lib.rs`, `map/commands.rs`, `map/mod.rs`
et le nouveau `map/find_open_tests.rs`, vérifiée fichier par fichier et
hunk par hunk contre `git diff`. Dette préexistante ailleurs dans le crate
(143 diagnostics, essentiellement `relation_commands.rs` hors des lignes
touchées) rapportée et laissée intacte.

`cargo clippy --all-targets --offline -- -D warnings` : rouge à **26
erreurs**, même compte qu'avant cette passe, aucune dans un fichier touché
(vérifié emplacement par emplacement contre le rapport clippy).

### BH.7 Non testé, et limites

**Non testé :** acceptance laptop modeste — poste de développement
seulement. L'invocation « Ouvrir dans l'Explorateur » du rejeu est un appel
direct plutôt qu'un clic UI en plus, pour éviter un second spawn
`explorer.exe` visible pour le même fait — le câblage du bouton est prouvé
séparément par `DetailsPanel.test.tsx`. Une fenêtre Explorer réelle peut
rester ouverte après le rejeu; `explorer.exe` n'est jamais tué globalement,
conformément à la consigne.

Hors portée, comme prévu par la fiche `TASK-0034` : FTS5/recherche
avancée, filtres nouveaux/non-vus, watcher/incrémental, historique de
changements, copie de chemin absolu, préférences d'écran/icône, nouveau
moteur graphique, réseau/cloud/LLM/MCP. Palette de relations par direction
toujours non reprise.

**Réserves :** inchangées par rapport à `BF`/`BG` — `R-T30-1` (clippy strict
rouge), `R-T30-3`, `R-T30-4`, `R-T30-6`, `R8` ouvertes; `R-T30-5` traitée
uniquement dans la portée `REAL_ROOT` de test. **X5 inchangé**;
`origin/main` inchangé.

## BI. TASK-0034 — passe corrective, réponse de recherche obsolète — 2026-09-10

**Statut : `IMPLEMENTED`, jamais auto-`VERIFIED`.** Même branche
`build/v0.2-a18-v1-find-open`, mêmes `DEC-0031`/`DEC-0033`/`DEC-0034`,
inchangées. Exécuteur : Claude Code. Déclenchée par le défaut bloquant
trouvé au contrôle indépendant
[`ACTION-0052`](../reviews/ACTION-0052-independent-control.md) : `BH`
affirmait le contraire sur ce point précis; corrigé ici plutôt que laissé à
le contredire.

### BI.1 Le défaut

`MapApp.tsx::runSearch()` lançait `invoke("map_search_nodes", ...)` puis
appliquait directement `setSearchPage(page)`/`setSearchLoading(false)` sans
ticket de requête, sans annulation et sans vérifier que la réponse
correspondait encore au cerveau/requête/révision attendus. Le garde de
révision d'`activateSearchHit()` (`BH.4`) protège une ancienne **révision**,
mais deux pages de recherche différentes peuvent partager la même révision :
il ne protège donc pas contre une réponse tardive d'un ancien cerveau, d'une
ancienne requête (frappe rapide), ou contre une ancienne réponse qui remet
`searchLoading=false` pendant qu'une recherche plus récente est encore en
vol.

### BI.2 Correction — `SearchCoordinator`, un ticket monotone

Nouveau module pur `src/map/searchCoordinator.ts`, sur le même principe que
`projectionRequest` déjà présent dans `MapApp.tsx` :

- `SearchCoordinator` porte un compteur de ticket. `begin()` en prend un
  nouveau et supersède immédiatement celui d'avant; `invalidate()` supersède
  sans lancer de requête (cas « Effacer » et requête vide); `isCurrent(ticket)`
  dit si ce ticket est toujours le plus récent.
- `runCoordinatedSearch(coordinator, params, callbacks)` exécute une requête
  sous ce ticket : à la résolution, elle vérifie `isCurrent(ticket)`, puis que
  la page répond au `brainId`/`query` demandés, puis que `indexRevision`
  correspond à la révision courante connue de l'appelant (quand disponible)
  — trois vérifications indépendantes avant de publier `onPage`; le rejet à
  n'importe laquelle empêche aussi `onLoadingChange(false)` de s'exécuter,
  pour que seule la requête la plus récente puisse clore l'état de
  chargement.
- `MapApp.tsx::runSearch` délègue entièrement à cette primitive. L'effet dont
  la branche requête-vide ne lance jamais `runSearch` appelle désormais
  `searchCoordinator.invalidate()` lui-même — sinon une requête déjà en vol
  sur une requête non vide pourrait encore atterrir après que le champ ait
  été vidé. `clearSearch()` fait de même avant de vider l'état.
- Le garde de révision existant d'`activateSearchHit()` (`BH.4`) est
  **conservé sans modification**, comme défense supplémentaire à
  l'activation — jamais le garde principal.
- Aucun nouveau DTO, aucun nouveau store, aucune dépendance : `SearchPage`
  porte déjà `brainId`/`query`/`indexRevision`, suffisants pour les trois
  vérifications.

### BI.3 Preuves déterministes — `searchCoordinator.test.ts`

Huit tests, sans WebView, sans SQLite, contrôlant l'ordre de résolution des
promesses par des `deferred<T>()` résolus explicitement :

| Preuve | Ce qui est établi |
|---|---|
| `publishes only the most recent request when two responses settle in reverse order` | Requête « A » puis « AB »; « AB » résolue puis « A » (résolution inversée) : seule « AB » est publiée |
| `drops a late response from the previous brain after switching brains mid-search` | Cerveau A puis B avant que la réponse de A n'arrive : seule la réponse de B est publiée |
| `ignores a response that arrives after Clear invalidated its request` | `invalidate()` (Effacer) pendant que la requête est en vol : sa réponse tardive n'est jamais publiée |
| `lets only the latest request's settlement clear the loading flag` | La requête périmée qui se résout ne republie jamais `loading=false`; seule la requête la plus récente le fait |
| `drops a response whose revision no longer matches the caller's live revision` | La révision avance pendant que la requête est en vol : la page reçue à l'ancienne révision est rejetée |
| `drops a response naming a different brain or query than the one it was asked for` | Vérification directe des champs d'identité de la réponse |
| `does not surface an error from a request already superseded by Clear` | Un rejet tardif après `invalidate()` n'atteint jamais `onError` |
| `wires MapApp's search cycle through the coordinator instead of applying responses directly` | Vérification de câblage sur le texte source de `MapApp.tsx` (`?raw`, même convention que `lifecycle.test.ts`) : `runSearch` délègue à `runCoordinatedSearch`, la branche requête-vide et `clearSearch` appellent `invalidate()`, plus aucun `setSearchPage(page)` direct, garde de révision d'activation intact |

### BI.4 Rejeu WebView2 — non-régression, plus deux scénarios ajoutés

`scripts/task0034-webview2.mjs` rejoué en entier sur l'arbre `REAL_ROOT` de
5 206 éléments de `TASK-0033`/`TASK-0034` (`task0034-seed-proof.py`,
inchangé) : mêmes preuves qu'en `BH.5`, plus deux scénarios courts ajoutés à
la demande de la passe corrective — non adversariaux (SQLite réelle est trop
rapide pour être fiablement dépassée sans ralentir le produit lui-même, ce
que cette passe interdit de faire juste pour fabriquer une course; l'autorité
de la résolution inversée reste `BI.3`) :

| Scénario ajouté | Résultat |
|---|---|
| Frappe rapide (moitié du nom, puis le reste sans attendre) | Résultat final correspond au nom complet, jamais à la requête partielle |
| Effacer juste après avoir tapé, avant toute réponse observée | Champ vide, aucun panneau de résultats, même une fois la réponse en vol arrivée |

Non-régression confirmée : indexation 5 206 nœuds, cible confirmée hors
projection ordinaire, recherche exacte et bornée (DOM et DTO concordants),
requête vide sans panneau de résultats, activation vers une nouvelle
projection avec sélection correcte, refresh réel faisant avancer la révision
(1 → 2) republiée automatiquement, `map_reveal_node` sur cible synthétique
avec spawn réussi, aucune fuite de chemin absolu, **0 erreur console
fatale**. Artefact non canonique mis à jour :
[`TASK-0034-webview2.json`](../performance/runs/TASK-0034-webview2.json).

### BI.5 Validations

TypeScript **302 PASS** (294 avant, +8 `searchCoordinator.test.ts`). Rust
**344 PASS**, inchangé — aucun fichier Rust touché par cette passe.
`pnpm check`, `pnpm build`, `cargo build --offline`, `git diff --check`
verts. `cargo fmt`/Clippy Rust non rejoués : aucune ligne Rust modifiée;
l'état `BH.6` (rouge à 26 erreurs préexistantes) est inchangé par
construction.

### BI.6 Non fait, et limites

Portée volontairement étroite : ni la surface IPC Rust, ni
`Index::query_nodes()`, ni la frontière Explorer n'ont été touchés — aucun
défaut n'y a été démontré par cette passe. Les deux scénarios WebView2
ajoutés sont des vérifications de non-régression en conditions réelles, pas
une preuve de résolution inversée adversariale : cette preuve reste
`BI.3`, en TypeScript déterministe.

**Réserves :** inchangées par rapport à `BH` — `R-T30-1` (clippy strict
rouge), `R-T30-3`, `R-T30-4`, `R-T30-6`, `R8` ouvertes; `R-T30-5` traitée
uniquement dans la portée `REAL_ROOT` de test. **X5 inchangé**;
`origin/main` inchangé. Aucune `TASK-0035`, aucune nouvelle DEC, aucune PR,
fusion, étiquette ni release.

**Action unique suivante :** nouveau contrôle indépendant de `TASK-0034`,
sur les preuves de cette passe.

## BJ. TASK-0034 — passe corrective 2, invalidation tardive et normalisation de requête — 2026-09-11

**Statut : `IMPLEMENTED`, jamais auto-`VERIFIED`.** Même branche
`build/v0.2-a18-v1-find-open`, mêmes `DEC-0031`/`DEC-0033`/`DEC-0034`,
inchangées. Exécuteur : Claude Code. Déclenchée par les deux verrous
restants trouvés au recontrôle indépendant
[`ACTION-0053`](../reviews/ACTION-0053-independent-recontrol.md) : `BI`
avait fermé la course centrale une fois qu'une nouvelle recherche avait
effectivement commencé, mais pas le câblage qui décide **quand** elle
commence.

### BJ.1 Verrou 1 — invalidation trop tardive au changement d'intention

`SearchCoordinator` (`BI.2`) est correct : le seul défaut restant était que
`MapApp.tsx` n'appelait `searchCoordinator.invalidate()`/`begin()` que
depuis un `useEffect` réagissant à `searchQuery`/`focusedBrainId`, jamais
depuis l'événement lui-même. Un `useEffect` s'exécute après le rendu suivant
de React — sur un rendu ultérieur, pas dans la même pile d'appel que
l'événement. Une promesse déjà en vol peut se résoudre dans cette fenêtre et
tenir encore le ticket le plus récent au moment où elle le fait, exactement
le scénario qu'`ACTION-0053` a démontré pour la saisie, et par le même
principe pour un changement de cerveau.

**Correction : invalider de façon synchrone, dans la même pile d'appel que
l'action qui change l'intention — jamais seulement dans l'effet qui en
réagit.**

- `searchCoordinator` (le ref `useRef(new SearchCoordinator()).current`) est
  déplacé plus haut dans `MapApp.tsx`, avec les autres refs, pour être
  disponible à `onFocusBrain`, `selectNode` et `changeProjection` — définies
  plus tôt dans le corps du composant que l'ancien site de déclaration ne le
  permettait pas syntaxiquement pour un appel direct sans fermeture tardive.
- Nouveau `updateSearchQuery(value)` : appelle
  `searchCoordinator.invalidate()` **puis** `setSearchQuery(value)`,
  synchrone, dans le même appel que l'événement. L'`onChange` du champ
  appelle désormais `updateSearchQuery(event.target.value)` au lieu de
  `setSearchQuery(event.target.value)` directement.
- `onFocusBrain` : `searchCoordinator.invalidate()` juste après le garde
  « même cerveau, ne rien faire », avant tout changement d'état — un
  changement de focus réel invalide toujours une recherche en vol sur le
  cerveau quitté.
- `selectNode` : même invalidation, au même point relatif, dans sa branche
  qui change le focus vers un autre cerveau déjà affiché.
- `changeProjection` : invalidation **conditionnelle** —
  `if (current.focusedBrainId !== brainId) searchCoordinator.invalidate();`
  juste avant `setComposed(focusBrain(...))`. La condition est nécessaire :
  cette branche est aussi empruntée quand `activateSearchHit()` active un
  résultat **dans le cerveau déjà focalisé** (le cas courant, la recherche
  étant scopée au cerveau focalisé) — y invalider sans condition aurait
  annulé une navigation sans rapport avec un changement d'intention de
  recherche, une régression que rien dans `ACTION-0053` ne demandait.
- `clearSearch()` et la branche requête-vide de l'effet de recherche
  invalidaient déjà de façon synchrone (`BI.2`) — inchangés.

Le principe retenu : `SearchCoordinator.invalidate()` est un compteur JS
simple, indépendant de l'ordonnancement de rendu/effet de React. L'appeler
directement, dans la pile d'appel de l'événement qui change l'intention,
ferme la fenêtre quelle que soit la façon dont React planifie la suite —
alors qu'attendre un effet réintroduit exactement la course.

### BJ.2 Verrou 2 — requête brute comparée à la réponse normalisée

`search_nodes()` (`commands.rs`) normalise avec
`query.trim().chars().take(SEARCH_QUERY_MAX_CHARS)` (200) avant de remplir
`SearchPage.query`. Le coordinateur comparait `page.query` à `params.query`
**brut**, venu tel quel du champ : une requête légitime avec espaces de bord
ou dépassant 200 caractères était donc rejetée comme périmée, alors que Rust
l'avait correctement traitée.

**Correction : canoniser la requête avant qu'elle devienne `params.query`**
(option retenue plutôt que comparer après coup contre une forme calculée
séparément — un seul endroit décide de la forme canonique).

- `canonicalizeSearchQuery(query)`, nouvelle fonction pure dans
  `searchCoordinator.ts` : `Array.from(query.trim()).slice(0,
  SEARCH_QUERY_MAX_CHARS).join("")`. `Array.from` plutôt que `.slice` sur la
  chaîne brute : il itère par point de code Unicode, comme le `.chars()`
  Rust, plutôt que par unité UTF-16 — un caractère hors plan de base
  (paire de substituts) n'est donc jamais coupé en deux, contrairement à ce
  qu'un `.slice(0, 200)` naïf aurait pu faire.
- `SEARCH_QUERY_MAX_CHARS = 200` exporté, avec un commentaire documentant
  explicitement le lien vers la constante Rust homonyme dans
  `commands.rs` — exigé par `NEXT_PROMPT.md` §2.
- `runSearch` (`MapApp.tsx`) appelle
  `canonicalizeSearchQuery(query)` avant de construire `params.query`; le
  reste de `runCoordinatedSearch` (comparaison stricte à `page.query`) est
  inchangé — les deux côtés parlent maintenant de la même forme.
- Le champ de saisie affiché (`searchQuery`, état React) reste la valeur
  **brute** telle que tapée : seule la requête envoyée à l'IPC/au
  coordinateur est canonisée, jamais ce que la personne voit dans le champ.

### BJ.3 Identité complète — offset ajouté

`SearchResponseIdentity` gagne `offset: number`; `runCoordinatedSearch`
rejette désormais aussi une réponse dont `page.offset !== params.offset`,
en plus de `brainId`/`query`/révision. `SearchPage.offset` existait déjà
dans le DTO produit (`BH.A`) — aucun nouveau champ IPC. Défense en
profondeur plutôt que redondance déjà couverte par le ticket seul : le
ticket protège contre une réponse **temporellement** périmée, ce contrôle
protège en plus contre une réponse qui, à ticket égal, porterait une page
d'un autre offset que celui demandé (deux clics de pagination rapprochés,
par exemple).

### BJ.4 Preuves déterministes ajoutées — `searchCoordinator.test.ts`

Dix nouveaux tests (18 au total, contre 8 en `BI.3`), toujours sans WebView
ni SQLite :

| Preuve | Ce qui est établi |
|---|---|
| `invalidates the in-flight request the instant intent changes to a new query, before that query's own search begins` | `invalidate()` appelé directement (simulant `updateSearchQuery`) **avant** que la recherche « AB » ne soit lancée; « A » se résout ensuite : rien n'est publié; « AB », lancée après, publie normalement — `NEXT_PROMPT.md` §4.1 |
| `invalidates the in-flight request the instant focus moves to another brain, before that brain's own search begins` | Même schéma pour un changement de cerveau — §4.2/4.5 |
| `drops a response whose offset doesn't match the request it was asked for` | Nouveau contrôle d'offset, isolé des autres champs d'identité |
| `wires MapApp's search cycle...` (étendu) | Vérifie en plus `canonicalizeSearchQuery(query)` dans le bloc de `runSearch` |
| `invalidates synchronously in the onChange handler, before the query state changes...` | Câblage : dans `updateSearchQuery`, `invalidate()` précède textuellement `setSearchQuery(value)`; le JSX appelle `updateSearchQuery`, plus `setSearchQuery` directement |
| `invalidates synchronously wherever focus moves to another brain...` | Câblage : `onFocusBrain`, `changeProjection` et `selectNode` contiennent chacun `searchCoordinator.invalidate()` |
| `trims leading and trailing whitespace...` | `canonicalizeSearchQuery(" rapport ") === "rapport"` |
| `leaves an already-canonical query untouched` | Idempotence sur une requête déjà propre |
| `truncates to 200 Unicode codepoints...` | 250 caractères ASCII → exactement 200 |
| `counts codepoints, not UTF-16 code units...` | 201 répétitions d'un émoji (paire de substituts) → exactement 200 points de code, jamais coupé en deux |
| `trims before bounding, same order as the backend` | Ordre trim-puis-troncature identique à Rust, avec espaces au-delà de la 200ᵉ position |

Les huit preuves de `BI.3` restent inchangées et vertes (résolution
inversée, changement de cerveau en vol au niveau primitif, `Effacer` en
vol, révision en vol, identité brain/query, erreur supersédée — la primitive
`SearchCoordinator` elle-même n'a pas changé de comportement, seul son
câblage dans `MapApp.tsx` et l'identité vérifiée se sont étendus).

### BJ.5 Rejeu WebView2 — non-régression

`scripts/task0034-webview2.mjs`/`.ps1` rejoués sans modification sur un
nouvel arbre `REAL_ROOT` de 5 206 éléments (même générateur
`task0034-seed-proof.py`). Vérifié explicitement par exécution directe des
deux commandes internes (`python`/`node`) avec capture séparée de leurs
codes de sortie — `PYTHON_EXIT=0`, `NODE_EXIT=0` — après qu'un premier appel
via le script `.ps1` d'enveloppe s'est terminé en code 1 pour une raison
non liée à la preuve elle-même (à investiguer si elle se reproduit; le
contenu de la preuve, lui, est identique et complet dans les deux cas).
Artefact `docs/performance/runs/TASK-0034-webview2.json` réécrit,
**identique octet pour octet** au fichier déjà commité (`git diff` vide) :
même comportement produit exact, aucune régression perceptible dans ce
rejeu non adversarial.

Résultat complet, inchangé par rapport à `BI.4`/`BH.5` : 5 206 nœuds
indexés, cible confirmée hors projection ordinaire, recherche exacte et
bornée (DOM et DTO concordants), frappe rapide résolue sur la requête
complète, `Effacer` juste après une frappe gagnant sur une réponse encore
en vol, activation vers une nouvelle projection avec sélection correcte,
refresh réel faisant avancer la révision (1 → 2) republiée automatiquement,
`map_reveal_node` sur cible synthétique avec spawn réussi, aucune fuite de
chemin absolu, **0 erreur console fatale**.

Ce rejeu reste, comme en `BI.4`, une vérification de non-régression en
conditions réelles — SQLite y est trop rapide pour fiablement fabriquer la
course adversariale sans ralentir le produit lui-même, ce que cette passe
s'interdit de faire. L'autorité de l'ordre inversé et de l'invalidation
avant lancement reste `BJ.4`, en TypeScript déterministe.

### BJ.6 Validations

TypeScript **312 PASS** (302 avant, +10 dans `searchCoordinator.test.ts`).
Rust **344 PASS**, inchangé — aucun fichier Rust touché par cette passe.
`pnpm check`, `pnpm build`, `git diff --check` verts. `cargo build
--offline` vert, même avertissement préexistant unique
(`SUGGESTION_STATES` mort dans `relations.rs`), inchangé. `cargo fmt`/Clippy
Rust non rejoués : aucune ligne Rust modifiée; l'état `BH.6` (rouge à 26
erreurs préexistantes) est inchangé par construction.

### BJ.7 Non fait, et limites

Portée volontairement étroite, comme `BI` : ni la surface IPC Rust, ni
`Index::query_nodes()`, ni la frontière Explorer n'ont été touchés — aucun
défaut n'y a été démontré par cette passe. `changeProjection` gagne une
invalidation conditionnelle (`BJ.1`) plutôt que la retirer entièrement de
la portée « frontend/coordination seulement » du prompt : c'est le seul
autre point synchrone du fichier qui change le cerveau focalisé, et le
laisser sans garde aurait rouvert exactement le verrou 1 par un chemin que
`ACTION-0053` n'énumérait pas nommément mais que son principe général
couvre.

**Réserves :** inchangées par rapport à `BI`/`BH` — `R-T30-1` (clippy
strict rouge), `R-T30-3`, `R-T30-4`, `R-T30-6`, `R8` ouvertes; `R-T30-5`
traitée uniquement dans la portée `REAL_ROOT` de test. **X5 inchangé**;
`origin/main` inchangé. Aucune `TASK-0035`, aucune nouvelle DEC, aucune PR,
fusion, étiquette ni release.

**Action unique suivante :** nouveau contrôle indépendant de `TASK-0034`,
sur les preuves de cette passe.

## BK. TASK-0034 — passe corrective 3, garde central d'`applyComposition` — 2026-09-11

**Statut : `IMPLEMENTED`, jamais auto-`VERIFIED`.** Même branche
`build/v0.2-a18-v1-find-open`, mêmes `DEC-0031`/`DEC-0033`/`DEC-0034`,
inchangées. Exécuteur : Claude Code. Déclenchée par le dernier verrou
trouvé au recontrôle indépendant
[`ACTION-0054`](../reviews/ACTION-0054-independent-recontrol.md) : `BJ`
avait fermé la saisie et le changement de cerveau pour les trois handlers
qui mutent `composed` directement, mais pas la porte commune que d'autres
transitions empruntent.

### BK.1 Le verrou restant — toutes les transitions ne passent pas par les trois handlers protégés

`BJ.1` a ajouté une invalidation synchrone dans `onFocusBrain`, dans la
branche de changement de cerveau de `selectNode`, et dans celle de
`changeProjection` — les trois seuls endroits qui appellent
`setComposed(...)` **directement**. Mais le modèle de composition change
aussi `focusedBrainId` par une autre voie : `applyComposition(next, ...)`,
la porte commune utilisée par `onAddBrain`, `onRemoveBrain`,
`navigateCross`, l'ouverture/actualisation/reconstruction de la
composition affichée, et toute vue à un seul cerveau (`singleBrainView`).

Deux chemins concrets par cette porte changent réellement le focus sans
passer par les trois handlers protégés :

- `removeBrain()` (`composedView.ts`) transfère le focus au premier
  cerveau restant quand le cerveau retiré est celui qui était focalisé —
  `onRemoveBrain()` appelle `applyComposition(removeBrain(...))` sans
  invalider;
- `navigateCross()` construit
  `focusBrain(addBrain(current, order, brainId), order, brainId)` pour un
  cerveau **pas encore affiché** — et puisque le focus doit toujours
  pointer vers un cerveau affiché, ce nouveau focus diffère nécessairement
  du focus courant — puis le transmet à `applyComposition(next, ...)` sans
  invalider non plus.

Le même principe que `BJ` s'applique : attendre le `useEffect` qui vide la
recherche pour le nouveau cerveau focalisé rouvre la fenêtre
événement → render/effect qu'`ACTION-0053` interdit précisément.

### BK.2 Correction — un garde central dans `applyComposition`, avant son premier `await`

Plutôt que d'ajouter une invalidation à chaque nouvel appelant trouvé (une
liste qui ne finirait jamais), le garde est placé une fois, à la frontière
commune :

```ts
const current = composedRef.current;
if (current && current.focusedBrainId !== next.focusedBrainId) {
  searchCoordinator.invalidate();
}
const nextKey = compositionKey(next.displayedBrainIds);
```

Placé immédiatement après la lecture de `current` (`composedRef.current`),
avant `nextKey`, avant `setSessions`/`setLoaded`/`setComposed` et avant le
premier `await` de la fonction (`await loadBrain(...)`, dans la boucle de
chargement des cerveaux affichés). Une transition qui conserve le même
`focusedBrainId` — Ouvrir/Actualiser/Reconstruire sur la composition déjà
affichée, ou l'ajout d'un cerveau par `onAddBrain` (`addBrain()` ne déplace
jamais le focus, par contrat documenté dans `composedView.ts`) —
n'invalide rien.

Les invalidations de `BJ.1` dans `onFocusBrain`/`selectNode`/
`changeProjection` restent **inchangées** : elles ne passent pas par
`applyComposition` (elles appellent `setComposed` directement), donc ce
nouveau garde ne les rend redondantes qu'en apparence — en réalité elles
protègent un chemin distinct. Aucun refactor général : un seul bloc de
quatre lignes ajouté à un seul endroit.

### BK.3 Preuves déterministes ajoutées — `searchCoordinator.test.ts`

Cinq nouveaux tests (23 au total, contre 18 en `BJ.4`) :

| Preuve | Ce qui est établi |
|---|---|
| `invalidates the in-flight request the instant a composition transition moves focus off it — before that transition's own follow-up search begins` | Simule le garde central : recherche A en vol, `invalidate()` appelé directement (représentant ce que le garde ferait au moment où `removeBrain()` transfère le focus vers B), A se résout ensuite : rien n'est publié |
| `does not invalidate a composition transition that keeps the same focused brain` | Sans `invalidate()` (transition à focus identique, p. ex. un « Actualiser »), la recherche en vol se résout et publie normalement |
| `guards applyComposition centrally, before its first \`await\`, rather than duplicating the check per caller` | Verrou structurel : dans le bloc source d'`applyComposition`, `current.focusedBrainId !== next.focusedBrainId` précède `searchCoordinator.invalidate()`, qui précède lui-même le premier `await` du bloc |
| `routes removeBrain's focus-transferring transition through the central gate` | Verrou structurel : `onRemoveBrain` appelle bien `applyComposition(removeBrain(current, order, brainId))` |
| `routes navigateCross's not-yet-displayed-brain transition through the central gate` | Verrou structurel : `navigateCross` construit `focusBrain(addBrain(current, order, brainId), order, brainId)` (nécessairement un focus différent, puisque `brainId` n'est pas encore affiché) et le transmet à `applyComposition(next, ...)` |

Les preuves des passes précédentes (8 en `BI.3`, 10 en `BJ.4`) restent
inchangées et vertes — ni `SearchCoordinator` ni `runCoordinatedSearch`
n'ont changé de comportement dans cette passe, seul le câblage de
`MapApp.tsx` s'est étendu.

**Sur la méthode de preuve — pourquoi structurelle plutôt qu'un rendu
complet :** aucun test existant dans ce dépôt ne monte `MapApp` en entier
avec un `invoke` simulé (`MapApp` n'est importé que par `src/main.tsx`) —
la convention établie depuis `TASK-0030`/`lifecycle.test.ts` pour ce genre
de câblage est la lecture du texte source via `?raw`, déjà utilisée par
tous les tests de câblage de `BI`/`BJ`. Construire un harnais de rendu
complet aurait été le refactor général que le prompt demande d'éviter;
combiner un verrou structurel (le garde existe, au bon endroit, avant le
premier `await`) avec une preuve comportementale de la primitive
(`SearchCoordinator` n'oublie jamais une invalidation) est la preuve
équivalente que `NEXT_PROMPT.md` §2.7 autorise explicitement en alternative
à un test de bout en bout du chemin `navigateCross`.

### BK.4 Rejeu WebView2 — non-régression

`scripts/task0034-webview2.mjs`/`.ps1` rejoués sans modification sur un
nouvel arbre `REAL_ROOT` de 5 206 éléments. Vérifié par exécution directe
des deux commandes internes avec capture séparée des codes de sortie —
`PYTHON_EXIT=0`, `NODE_EXIT=0`. Artefact
`docs/performance/runs/TASK-0034-webview2.json` réécrit, **identique
octet pour octet** au fichier déjà commité (`git diff` vide). Résultat
complet inchangé par rapport à `BJ.5`/`BI.4`/`BH.5` : 5 206 nœuds indexés,
recherche exacte et bornée, activation correcte, refresh faisant avancer
la révision (1 → 2) republiée automatiquement, `map_reveal_node` avec
spawn réussi, aucune fuite de chemin absolu, **0 erreur console fatale**.

Comme en `BJ.5`, ce rejeu reste une vérification de non-régression en
conditions réelles — le prompt lui-même dispense explicitement de fabriquer
artificiellement une course adversariale dans WebView2 pour ce verrou :
l'autorité de cette preuve reste `BK.3`, en TypeScript déterministe.

### BK.5 Validations

TypeScript **317 PASS** (312 avant, +5 dans `searchCoordinator.test.ts`).
Rust **344 PASS**, inchangé — aucun fichier Rust touché par cette passe.
`pnpm check`, `pnpm build`, `git diff --check` verts. `cargo build
--offline` vert, même avertissement préexistant unique
(`SUGGESTION_STATES` mort dans `relations.rs`), inchangé. `cargo fmt`/
Clippy Rust non rejoués : aucune ligne Rust modifiée; l'état `BH.6` (rouge
à 26 erreurs préexistantes) est inchangé par construction.

### BK.6 Non fait, et limites

Portée volontairement étroite, comme `BJ`/`BI` : ni la surface IPC Rust, ni
`Index::query_nodes()`, ni la frontière Explorer n'ont été touchés — aucun
défaut n'y a été démontré par cette passe. Les invalidations directes de
`BJ.1` (`onFocusBrain`/`selectNode`/`changeProjection`) n'ont pas été
retirées au profit du seul garde central : le prompt autorise
explicitement à les laisser si elles restent claires et idempotentes, et
elles couvrent un chemin (mutation directe de `composed`) que le nouveau
garde ne couvre pas. Aucun autre appelant d'`applyComposition` n'a été
audité individuellement au-delà de `onRemoveBrain`/`navigateCross` — la
garantie tient parce que le garde est à la frontière commune, pas parce
que chaque appelant a été énuméré.

**Réserves :** inchangées par rapport à `BJ`/`BI`/`BH` — `R-T30-1` (clippy
strict rouge), `R-T30-3`, `R-T30-4`, `R-T30-6`, `R8` ouvertes; `R-T30-5`
traitée uniquement dans la portée `REAL_ROOT` de test. **X5 inchangé**;
`origin/main` inchangé. Aucune `TASK-0035`, aucune nouvelle DEC, aucune PR,
fusion, étiquette ni release.

**Action unique suivante :** nouveau contrôle indépendant de `TASK-0034`,
sur les preuves de cette passe.

## BL. TASK-0035 — V1 Context Panel, Direct Children & Safe Copy — 2026-09-11

**Statut : `IMPLEMENTED`, jamais auto-`VERIFIED`.** Branche
`build/v0.2-a19-v1-context-panel`. Prérequis `TASK-0034 = VERIFIED` par
`ACTION-0055` satisfait avant tout code. Aucune nouvelle DEC — l'implémentation
n'a exigé ni d'affaiblir la frontière de confidentialité ni d'ajouter une
seconde source de vérité.

### BL.1 But et réutilisation

Trois compléments de parité MVP autour de la sélection courante, sans toucher
au moteur topographique : masquer/réafficher le panneau de détails
(persisté); le contenu direct **exact et paginé** d'un dossier, indépendant
de la projection visuelle bornée; « Copier le chemin », le chemin absolu
restant hors du WebView.

Réutilisé tel quel : `BrainCatalog::meta()`/`put_meta()` et `catalog_meta`
(aucun nouveau store); `Index::children_page()` (`DEC-0030`, déjà porté par
`TASK-0029`); `map_view`/`selectNode`/`changeProjection` pour la
focalisation d'un enfant hors projection; la résolution/confinement de
`map_reveal_node` (`TASK-0034` C), extraite dans `resolve_confined_target()`
et partagée avec la nouvelle commande de copie plutôt que dupliquée.

### BL.2 A — Panneau masquable et persistant

`DETAILS_PANEL_VISIBLE_KEY = "details_panel_visible"`, une clé de plus dans
`catalog_meta`, au même niveau que `ACTIVE_BRAIN_KEY`. Aucune migration de
schéma : la table existe déjà. `BrainCatalog::ui_preferences()` rend
`{ detailsPanelVisible: true }` quand la clé est absente — visible par
défaut, y compris pour un catalogue antérieur à cette tâche.
`set_details_panel_visible(bool)` persiste puis relit, même aller-retour que
`set_active`.

Deux commandes IPC minimales, `map_ui_preferences`/
`map_ui_preferences_update(details_panel_visible: bool)`, ne transportant
que ce booléen. Côté React (`MapApp.tsx`), la préférence est lue **une
seule fois**, dans le même `Promise.all` que fixtures/hôte/catalogue au
démarrage — pas un second effet séparé qui pourrait courir devant ou
derrière le premier. `toggleDetailsPanel()` inverse l'état local et
persiste en tâche de fond (`invoke(...).catch(...)`, motif déjà établi pour
`activate`) : sa portée est délibérément étroite — invalidée
structurellement par un test qui vérifie que son corps ne référence ni
`setSelected`, `setSearchQuery`, `setSearchPage`, `setComposed`,
`setDetail`, `setChildrenPage` ni `setLoaded`. Masquer retire
`<DetailsPanel>` du JSX (`{detailsPanelVisible ? (<DetailsPanel .../>) : null}`);
tout l'état qui l'alimente (sélection, enfants, recherche, relations) vit
dans `MapApp`, jamais dans `DetailsPanel` lui-même, donc rien n'est perdu à
masquer et rien ne doit être reconstruit à réafficher.

### BL.3 B — Enfants directs exacts et paginés

`map_node_children(reference, after?, limit?)` (`commands.rs::node_children`) :
vérifie `reference.belongs_to`, passe par `open_store`, décode un curseur
opaque via `crate::hierarchy::ChildCursor::decode` puis délègue à
`Index::children_page()` — jamais une seconde requête SQL. Borné à
`CHILDREN_LIMIT_MAX = 50` (même esprit que `SEARCH_LIMIT_MAX`, une borne
produit distincte de la borne défensive `MAX_CHILDREN_PAGE_SIZE = 500` de
la couche `hierarchy`). Le DTO `NodeChildrenPage` porte `total` (colonne
durable `child_count`, jamais un `COUNT(*)`), `nextCursor` (keyset, lié à
l'index et à la révision), `indexRevision` et `limit` — aucun champ de
chemin.

`children_page()` refusait déjà, avant cette tâche, un curseur d'un autre
index (`ForeignCursor`), d'une révision périmée (`StaleCursor`) ou d'un
autre parent (`ParentMismatch`) — cette tâche n'a eu qu'à les exposer
fidèlement à travers `map_node_children`, sans réimplémenter cette
validation.

Dans `DetailsPanel.tsx`, la section « Enfants directs » lit désormais
`childrenPage`, plus jamais `detail.children` (qui reste la vue bornée par
la projection, non exhaustive — **retirée de cet usage**, l'ancien message
« N enfants supplémentaires » disparaît, remplacé par la vraie pagination).
Total exact affiché; navigation page suivante/précédente par une pile de
curseurs (`childrenCursorStack` dans `MapApp.tsx`) permettant un retour
exact à la page précédente; sélectionner un enfant appelle `onSelect(nodeId)`
— **exactement** la fonction `selectInSelectedBrain` déjà utilisée pour la
navigation parent/enfant historique, aucun chemin de sélection nouveau.
Bornage à 50 lignes DOM par page, jamais d'accumulation.

### BL.4 C — Copier le chemin

Audit préalable de `tauri-plugin-clipboard-manager` avant ajout de
dépendance : version `2.3.3` (dernière stable au moment de l'audit),
licence double MIT/Apache-2.0 (identique aux autres dépendances Tauri du
projet), API Rust `ClipboardExt::clipboard().write_text(text)` — synchrone,
aucun `await` requis côté hôte. Son propre fichier `permissions/default.toml`
déclare `permissions = []` : le plugin n'accorde **aucune** commande
frontend par défaut, et cette tâche n'en accorde aucune non plus.
Dépendance **épinglée en version exacte** (`= 2.3.3`) dans `Cargo.toml`,
conformément à l'exigence de ne pas laisser une version implicite.

`.plugin(tauri_plugin_clipboard_manager::init())` ajouté dans `lib.rs`,
juste après le plugin de dialogue, avec le même commentaire de garantie que
`DEC-0033` H établissait pour lui : le plugin est disponible **côté Rust
seulement** (`app.clipboard()`), et la capacité `default` reste
`core:default` seul — un test structurel étend la liste des préfixes
interdits (`dialog:`, `fs:`, `shell:`, `opener:`, `http:`) avec
`clipboard-manager:`, et un second test lit le texte du runtime pour
confirmer que le plugin est bien initialisé.

`resolve_confined_target()` — extraite de `reveal_node()`, qui l'appelle
maintenant elle aussi — est le **seul** endroit qui résout un
`BrainNodeRef` vers un chemin réel confiné : vérifie l'appartenance au
cerveau, lit le nœud dans l'Index, refuse un `reparse_point`/`Skipped`,
résout la racine via `BrainSource::resolve(...).root(...)`, puis confine
composant par composant via `confine_indexed_target()`, inchangée.
`copy_target_path()` appelle cette même fonction puis convertit le
`PathBuf` avec **`Path::to_str()`, jamais `to_string_lossy()`** —
`DEC-0033` C interdit la conversion avec perte pour *résoudre* une source,
et une conversion silencieusement lossy aurait aussi violé l'exigence
`TASK-0035` C d'un chemin copié **exact** pour un nom Unicode : un composant
non représentable est refusé explicitement (`indexed_target_not_representable`)
plutôt que remplacé par des caractères de substitution.

`map_copy_node_path(reference)` (`lib.rs`) est le **seul** appelant qui
détient le texte résolu : il l'obtient de `copy_target_path`, l'écrit via
`app.clipboard().write_text(text)`, et ne rend que succès/erreur générique
— le texte n'existe jamais ailleurs, n'est jamais journalisé, jamais
sérialisé. L'échec d'écriture réutilise `MapError::RevealRefused
("clipboard_write_failed")` : même variante, même préfixe de fil
`map_reveal_refused:` que les refus de résolution/confinement — un choix de
réutilisation assumé (documenté dans le commentaire de la variante) plutôt
qu'une nouvelle taxonomie d'erreur pour une action qui partage déjà tout le
reste de son chemin avec `reveal_node`. Côté frontend, `t.copyError` porte
un libellé propre à « copier » pour chaque code, distinct de `t.revealError`
qui dit « ouvrir » — la mécanique de fil est partagée, le texte affiché ne
l'est pas.

### BL.5 Preuves Rust

- **5 tests de préférence** (`brains.rs::tests`) : absente ⇒ visible;
  persistance à la réouverture (aller **et** retour, visible → masqué →
  visible); sérialisation ne portant que le seul booléen documenté.
- **16 tests** dans le nouveau fichier `context_panel_tests.rs`
  (`#[path]`, même convention que `find_open_tests.rs`) :
  - pagination bornée à 50 même si plus est demandé; ordre dossier-avant-fichier;
    couverture complète sans doublon/perte à travers toute la pagination
    (corpus de 131 enfants directs, plus un petit-enfant délibérément placé
    sous l'un d'eux pour prouver qu'il ne fuit jamais dans la page du
    parent); total exact depuis la colonne durable; refus cerveau étranger,
    curseur d'un autre index, révision périmée après republication, parent
    différent; DTO sans chemin absolu; fonctionne sans source sur le disque;
  - copie : refus cerveau étranger, refus reparse/skipped avant tout accès
    disque, refus id inconnu, refus cible disparue après indexation (sur un
    vrai dossier réel, comme `TASK-0034`), **exactitude Unicode et nom
    long** (un nom avec émoji en paire de substituts et accents, un nom de
    120 caractères, écrits par le test lui-même sous la racine synthétique
    réellement résolue — comparaison stricte du texte rendu contre le
    chemin attendu), partage prouvé de la marche de confinement avec
    `reveal_node`.
- **Structurels** (`lib.rs`) : les quatre commandes (`map_node_children`,
  `map_copy_node_path`, `map_ui_preferences`, `map_ui_preferences_update`)
  sont exposées; `map_copy_node_path` ne prend que `reference:
  map::brains::BrainNodeRef`; le test générique existant
  (`the_picker_exists_and_no_exposed_command_accepts_a_path`) couvre
  automatiquement les nouvelles commandes puisqu'il itère **tout** ce qui
  est exposé; plugin clipboard initialisé; aucune permission
  `clipboard-manager:*` dans la capacité.

### BL.6 Preuves TypeScript

- **14 tests** ajoutés à `DetailsPanel.test.tsx` : bouton copier
  masqué/actif selon `reference`/`onCopyPath`, appelle `onCopyPath` avec
  **exactement** la référence (comme `onReveal`), busy/erreur, reveal et
  copie coexistent; total exact depuis `childrenPage` (jamais
  `detail.children`, délibérément laissé vide dans ces tests pour le
  prouver); état de chargement distinct de l'état vide; sélectionner un
  enfant appelle `onSelect(nodeId)`; pagination bornée, boutons ordinaires
  clavier-opérables, désactivés au bon bord (première/dernière page),
  absentes quand tout tient sur une page; aucun texte en forme de chemin
  absolu dans la liste rendue.
- **8 tests structurels** dans le nouveau `contextPanel.test.ts` (même
  convention `?raw` que `lifecycle.test.ts`/`searchCoordinator.test.ts` —
  aucun test de ce dépôt ne monte `MapApp` en entier, celui-ci n'étant
  importé que par `src/main.tsx`) : préférence chargée une fois au
  démarrage; bascule isolée de tout autre état; bouton et rendu
  conditionnel branchés sur la même préférence; `map_node_children` invoqué
  sans jamais assembler de chemin; l'effet d'enfants ne réagit qu'à
  `[selected, fetchChildrenPage]`, même principe que l'effet `detail`
  voisin; sélection d'enfant réutilisant `onSelect`; `map_copy_node_path`
  invoqué avec exactement `{ reference }`; l'erreur de copie s'efface au
  changement de sélection, même garde que reveal.
- **Migration d'un test existant** : `mapView.test.tsx`
  (« offers the parent and the direct children as reachable controls »)
  supposait `detail.children` comme source des boutons; corrigé pour
  fournir un `childrenPage` explicite, `detail.children` restant vide à
  dessein — la preuve que la section lit maintenant la bonne source, pas
  seulement que les boutons apparaissent.

**312 → 339 TASK-0034/0035** : 302 → 312 (passe 3) → 339 ici (+22 net —
14 + 8, aucune régression sur les 317 précédents).

### BL.7 Rejeu WebView2 — trois lancements réels

`scripts/task0035-seed-proof.py` (dérivé de `task0034-seed-proof.py`, même
arbre `REAL_ROOT` de 5 206 éléments, même branche plate `C` à 4 356 enfants
directs, même needle `cible-recherche-unique.txt`) enregistré dans un
nouveau bac à sable; `scripts/task0035-webview2.mjs` prend un argument de
**phase** (1, 2 ou 3), et `scripts/task0035-webview2.ps1` orchestre **trois
lancements réels** du même exécutable, avec une **fermeture et un
redémarrage réels du processus** entre chacun — jamais simulés — sur le
**même** bac à sable (même `catalog.sqlite`, donc la préférence persiste
réellement) :

| Phase | Preuve |
|---|---|
| 1 (profil neuf) | panneau visible par défaut; sélection de `C` via la navigation clavier de la liste d'enfants (pas un clic SVG par coordonnées — voir note ci-dessous); pagination de `C` : total exact (4 356) contre le DTO direct, page suivante sans chevauchement avec la page 1, page précédente restaurant exactement la page 1; sélection du needle (premier enfant de `C`, jamais matérialisé comme sa propre carte) synchronisant carte (`aria-activedescendant`) et détails; `map_reveal_node` invoqué directement (cible synthétique, spawn réussi); « Copier le chemin » cliqué réellement; **Masquer les détails** par une vraie touche |
| (fermeture + redémarrage réels) | |
| 2 | panneau **toujours masqué** après le redémarrage réel; **Afficher les détails** par une vraie touche |
| (fermeture + redémarrage réels) | |
| 3 | panneau **toujours visible** après le second redémarrage réel |

Le presse-papiers OS est lu **par `task0035-webview2.ps1` lui-même**,
juste après la fermeture réelle du processus de la phase 1 — le même
presse-papiers que `tauri-plugin-clipboard-manager` vient d'écrire depuis
l'intérieur de l'application — et comparé **au caractère près** (`-ceq`,
sensible à la casse) au chemin attendu, reconstruit depuis les champs du
germe. Ni ce script ni `task0035-webview2.mjs` n'impriment jamais le
chemin : l'artefact ne garde que `copyClipboardMatchesExpectedPath: true`.

**Note de mise au point :** la première tentative sélectionnait `C` par un
clic à coordonnées SVG (`Input.dispatchMouseEvent` sur le centre de la
carte de la carte composée), exactement le mécanisme que `task0033-webview2.mjs`
utilise ailleurs avec succès — mais celui-ci n'a pas déclenché la sélection
ici (`aria-selected` restait `false`, la sélection restait sur la racine).
Remplacé par une navigation par clavier réel dans la liste d'enfants dédiée
de la racine elle-même (le nœud racine est auto-sélectionné au démarrage et
liste déjà `A`/`B`/`C`/`D` comme enfants directs) — plus robuste, et
accessoirement une preuve supplémentaire que la liste d'enfants est
elle-même clavier-opérable. La cause exacte de l'échec du clic SVG n'a pas
été investiguée plus avant, cette tâche ne portant pas sur le rendu de la
carte; à surveiller si un futur rejeu a spécifiquement besoin de cliquer
une carte.

Résultat complet, artefact
[`TASK-0035-webview2.json`](../performance/runs/TASK-0035-webview2.json) :
5 206 nœuds indexés, 4 356 enfants directs de `C`, toutes les preuves du
tableau à `true`, aucune fuite de chemin absolu, **0 erreur console
fatale** cumulée sur les trois phases.

### BL.8 Validations

Rust **365 PASS** (344 + 21 : 5 préférence + 16 pagination/copie), TypeScript
**339 PASS** (317 + 22), `pnpm check`, `pnpm build`, `cargo build --offline`,
`git diff --check` verts. `cargo fmt` propre sur chaque ligne ajoutée par
cette tâche (vérifié fichier par fichier, dette préexistante ailleurs dans
les mêmes fichiers laissée intacte). `cargo clippy --all-targets --offline
-- -D warnings` rouge à **26 erreurs**, même compte et mêmes diagnostics
qu'avant cette tâche (deux d'entre eux, dans `brains.rs`/`lib.rs`, décalés
de quelques lignes par l'insertion de code, jamais dans une ligne
elle-même ajoutée par cette tâche) — vérifié diagnostic par diagnostic,
aucun nouveau.

### BL.9 Non fait, et limites

Portée volontairement étroite, comme les tâches précédentes : ni la
surface IPC Rust existante (`map_view`, `map_search_nodes`,
`map_reveal_node`), ni `Index::query_nodes()`/`materialize_view()`, ni la
frontière Explorer n'ont été touchés au-delà de l'extraction partagée
`resolve_confined_target()`. `map_copy_node_path` réutilise le préfixe de
fil `map_reveal_refused:` plutôt qu'un préfixe `map_copy_refused:` distinct
— un choix de réutilisation assumé, documenté, pas un oubli. Le rejeu
WebView2 reste une vérification de non-régression/acceptation en
conditions réelles sur poste de développement, jamais une acceptance
laptop modeste. Hors portée comme prévu par la fiche : filtres, watcher,
journal de changements, FTS5, préférences moniteur/icône, refonte
graphique, moteur de relations, cloud/réseau/IA.

**Aucune donnée personnelle**, comme toujours. **X5 inchangé**,
`origin/main` inchangé. Aucune `TASK-0036`, aucune nouvelle DEC, aucune PR,
fusion, étiquette ni release.

## BM. TASK-0036 — V1 Stable Identity Foundation — 2026-09-11

**Statut : `IMPLEMENTED`, jamais auto-`VERIFIED`.** Branche
`build/v0.2-a20-v1-stable-identity`. Prérequis `TASK-0035 = VERIFIED` par
`ACTION-0056` satisfait avant tout code. Aucune nouvelle DEC — `DEC-0009` I-E
était déjà `APPROVED`; cette tâche la productionise, sans en changer le
contrat.

### BM.1 Audit avant code — réutiliser, adapter, ne pas reconstruire

Lu avant toute modification : `spikes/b3-windows-identity/src/main.rs` (B3,
`VERIFIED` par `PERF-0003`/`TASK-0012`), son `Cargo.toml`/`LICENCE.md`,
`DEC-0009`, `DEC-0010`, `DEC-0011`, `DEC-0030`, `DEC-0031`, `DEC-0033`,
`DEC-0034`, `scanner.rs`, `domain.rs`, `index.rs`, `hierarchy.rs`,
`map/brain_index.rs`, `map/commands.rs`, `map/source.rs`.

**Verdict : réutiliser la technique B3 telle quelle, adapter son point
d'intégration, ne rien reconstruire.** `GetFileInformationByHandleEx(FileIdInfo)`
sur un handle ouvert en métadonnées seules (`dwDesiredAccess = 0`,
`FILE_FLAG_BACKUP_SEMANTICS`) est repris verbatim dans la technique;
`windows-sys = 0.61.2` (mêmes quatre fonctionnalités, licence déjà
inventoriée par B3) est la seule dépendance ajoutée, **confinée à
`src-tauri/src/identity.rs`** via `[target.'cfg(windows)'.dependencies]` —
jamais dans `spikes/`, jamais hors cible Windows. Le point d'intégration lui
est propre : B3 mesurait un coût isolé sur une arborescence jetable; cette
tâche doit calculer une identité **par nœud pendant le parcours existant**
(`scanner.rs::scan_tree_controlled`) puis la faire survivre à une
republication (`index.rs`), ce que B3 ne faisait pas et n'avait pas à faire.

### BM.2 B — Modèle d'identité interne

Nouveau module `identity.rs`, sans dépendance vers `map/` (`scanner.rs` et
`index.rs` en dépendent, pas l'inverse) :

- `IdentityProvenance` : `System` ou `PathFallback`, **les deux seules**
  valeurs I-E autorise — jamais une troisième.
- `compute_identity(absolute_path, relative_path, kind, reparse_point,
  online_only)` : `SYSTEM` (clé `SYS1:<volume 16 hex>:<file id 32 hex>` — le
  **couple**, jamais `FileId` seul, l'invariant de l'amendement `DEC-0009`)
  quand le nœud est éligible **et** que l'appel Windows réussit;
  `PATH_FALLBACK` (`PFv1:<fnv1a64 du chemin relatif + type>`) sinon.
- **Éligibilité au `SYSTEM` :** ni `reparse_point`, ni `online_only`, ni
  `NodeKind::Skipped`. Aucune tentative d'ouverture de handle n'est même
  faite pour ces trois cas — `TASK-0036` B l'exige explicitement, pour
  respecter les exclusions déjà en place et ne jamais risquer d'hydrater un
  espace réservé cloud. C'est la façon dont cette tâche répond, sans la
  rouvrir, à la question laissée ouverte par l'amendement `DEC-0009`
  (« identité après hydratation ») : en ne touchant jamais ce cas par la voie
  système.
- Aucun identifiant système, clé stable ou empreinte n'existe dans
  `domain::NodeDto` ni dans aucun DTO : un `NodeIdentity` voyage **à côté**
  du corpus scanné (`ScanResult.identities`, aligné par l'id temporaire du
  scanner), jamais dedans — c'est ce qui a permis de ne toucher **aucun** des
  34 sites existants qui construisent un `NodeDto` littéralement.

### BM.3 C — Schéma canonique et migration

Même `Index` SQLite, aucun registre parallèle. `SCHEMA_VERSION` (`index.rs`)
et `MAP_SCHEMA_VERSION` (`map/store.rs`) passent **ensemble** de `3` à `4` —
ce sont deux constantes indépendantes qui décrivent le même
`PRAGMA user_version`, et les désynchroniser aurait fait refuser tout index
existant comme `IndexIncompatible` (découvert par la suite de tests : 68
échecs avant correction).

`migrate_to_stable_identity()`, chaînée après `migrate_to_bounded_hierarchy()`
dans `initialize()` : deux colonnes ordinaires nullables (`stable_key`,
`identity_provenance` — pas `VIRTUAL`, elles ne dérivent de rien), un index
`UNIQUE` partiel (`WHERE stable_key IS NOT NULL`, défense en profondeur sous
le refus applicatif) et le compteur durable `next_node_id`, amorcé à
`MAX(id) + 1` (`0` sur une table vide). Idempotente, ne réécrit aucune ligne
existante : une base migrée garde tous ses nœuds et son `seen`.

**Limite déclarée, pas cachée :** une ligne publiée avant cette migration a
`stable_key = NULL` jusqu'à la prochaine republication de son cerveau — rien
à quoi la faire correspondre à ce moment-là, donc ses ids sont réassignés
une seule fois lors de cette première republication post-migration, puis se
stabilisent à partir de la republication suivante. Aucune donnée n'est
perdue; seule la continuité d'id ne peut pas remonter avant l'existence de
la clé stable elle-même.

### BM.4 D et E — Remap des IDs et conservation de `seen`

`Index::publish` (interne, partagée) remplace l'ancien
`replace_nodes_with_metadata` en un point unique à deux modes :

- **`identities: None`** — comportement **strictement identique** à avant
  cette tâche : les lignes gardent l'id/`parent_id` fourni, aucun remap.
  Seule addition : une clé `PATH_FALLBACK` est quand même calculée et
  stockée pour chaque ligne, pour que les colonnes ne soient jamais à moitié
  écrites. C'est le chemin de **tous** les appelants synthétiques existants
  (34 sites `NodeDto { .. }`, `replace_nodes()`, les bancs `scale_spike`/
  `scale_query`) — **aucun n'a été modifié**.
- **`identities: Some(list)`** — le seul appelant est le pipeline réel
  (`map::commands::publish_map`, via `BrainIndex::replace_with_identity`,
  nouvelle méthode). Collision de clé stable **dans le nouveau scan** ⇒
  `PublishError::IdentityCollision`, retourné **avant** toute transaction
  d'écriture — l'index précédent n'est jamais touché. Sinon : clé déjà connue
  ⇒ même id canonique (`previous_by_key`, lu en tête de fonction); clé neuve
  ⇒ id frais du compteur `next_node_id`, qui n'avance **que** vers l'avant.
  `parent_id` de chaque nœud est remappé vers l'id canonique correspondant
  avant l'`INSERT`. `root_id`/`node_count` dans `schema_meta` sont réécrits
  **en dernier**, après le remap, jamais avant — un appelant peut fournir un
  id de racine non remappé sans conséquence, la valeur finale est toujours
  la vraie.
- **`seen`** reste porté par chemin (mécanisme historique, inchangé pour le
  mode `None`) **et**, uniquement en mode identité, par l'id canonique
  précédent d'une clé reconnue — union des deux, jamais un remplacement. Un
  renommage `SYSTEM` conserve donc `seen` même si le chemin change; un
  renommage `PATH_FALLBACK` ne le récupère pas — la limite honnête que
  `DEC-0009` attend explicitement de ce repli.
- `read_next_node_id` s'amorce lui-même depuis `MAX(id) + 1` si la clé
  `next_node_id` est absente — découvert nécessaire par
  `legacy_binding_tests.rs`, dont la republication d'un index simulé « avant
  `TASK-0036` » passe par `BrainIndex::open_existing`, qui ne migre jamais.

### BM.5 F — Compatibilité produit

`BrainNodeRef = brainId + nodeId` inchangé. `NODE_COLUMNS`/`node_from_row`
inchangés — aucune colonne d'identité n'y a été ajoutée, par construction du
modèle (BM.2). Projection 512/64, recherche `TASK-0034`, enfants directs
`TASK-0035`, Explorer/Copier confinés côté Rust : tous relus, aucun modifié.
Aucune permission frontend nouvelle. Revalidé par la suite TypeScript
complète (**339 PASS**, inchangée) et `pnpm check`/`pnpm build`.

### BM.6 Preuves Rust — 392 PASS (365 + 27), 5 ignorés

- **`identity.rs`, 12 tests** : clé de repli déterministe et versionnée,
  change avec le chemin et avec le type; reparse/online-only/skipped ne
  tentent jamais `SYSTEM`; **7 `#[cfg(windows)]`, exécutés sur Windows réel**
  — identité `SYSTEM` obtenue et de la forme du couple exact (16 + 32 hex);
  fichier renommé même volume; fichier déplacé en sous-dossier même volume;
  dossier renommé; deux fichiers distincts jamais la même identité; une
  copie reçoit une identité différente de sa source (ce qu'un déplacement
  inter-volume ferait).
- **`index.rs`, 8 tests nouveaux** : migration schéma 3→4 (littéral
  `SCHEMA_V3`, même convention que `SCHEMA_V2` déjà présent) — tout nœud et
  `seen` survivent, `index_id`/`index_revision` intacts, immédiatement
  publiable après migration; même clé stable ⇒ même id à travers un
  renommage; sous-arbre déplacé ⇒ dossier et enfant gardent leurs ids,
  `parent_id` remappé correctement; objet neuf après suppression ⇒ id
  jamais recyclé, y compris sur trois publications successives; collision
  artificielle ⇒ refusée, index précédent intact à la même révision; `seen`
  porté par id apparié même si le chemin change (`SYSTEM`); `seen` **non**
  porté à travers un renommage `PATH_FALLBACK`; mode legacy sans identité
  peuple quand même une clé de repli.
- **`map/stable_identity_tests.rs`, 7 tests nouveaux, pipeline réel
  complet** (`register_real_root` → `refresh_map`/`rebuild_map`, comme
  `real_root_tests.rs`) : renommage d'un vrai fichier Windows entre deux
  `refresh_map` conserve `nodeId` et `seen`; déplacement en sous-dossier
  conserve `nodeId` et met à jour `parentId`; dossier déplacé avec enfant
  conserve les deux ids et la cohérence parent/enfant; suppression puis
  création d'un objet différent ne recycle jamais l'id; deux cerveaux sur la
  même vraie racine restent isolés (`seen` de l'un n'affecte jamais
  l'autre); une reconstruction d'un arbre réel inchangé garde tous les ids;
  aucune clé stable/chemin absolu dans `MapSnapshot`/`NodeDetail` sérialisés.

`365 → 392` (+27, aucune régression sur les 365 précédents).

### BM.7 Rejeu WebView2 — un seul lancement réel, zéro redémarrage

Contrairement à `TASK-0035` A, l'identité de nœud n'a pas besoin de survivre
à un redémarrage réel : elle doit survivre à une republication. Un seul
lancement suffit. `scripts/task0036-seed-proof.py` enregistre un cerveau
`REAL_ROOT` sur un petit arbre réel (11 entrées : un fichier à renommer, un
dossier destination non vide, un sous-arbre à déplacer avec un enfant, un
fichier à supprimer, trois fichiers de remplissage).
`scripts/task0036-webview2.mjs`, piloté par CDP sur l'exécutable réel :
indexe (`Actualiser`), résout `avant.txt`, **renomme le fichier sur disque
avec `node:fs`** (hors du processus produit), `Actualiser` de nouveau,
résout `apres.txt` — puis répète pour un déplacement en sous-dossier, un
déplacement de sous-arbre avec enfant, et une suppression suivie d'une
création différente.

Résultat complet, artefact
[`TASK-0036-webview2.json`](../performance/runs/TASK-0036-webview2.json) :
`nodeIdIdenticalAfterRename`, `nodeIdIdenticalAfterMove`,
`movedParentIsDestinationFolder`, `movedFolderKeepsItsOwnId`,
`movedFoldersChildKeepsItsId`, `movedChildParentIsMovedFolder`,
`newObjectNeverRecyclesADeletedId`, `searchStillFinds`, `childrenStillPage`,
`projectionStillRenders`, `revealStillSucceeds`,
`noAbsolutePathOrStableKeyLeak` — **tous `true`**. **0 erreur console
fatale.**

**Un point à `false`, documenté, sans lien avec l'identité :**
`copyStillSucceeds` — `map_copy_node_path` échoue avec
`clipboard_write_failed` dans cette fenêtre automatisée cachée
(`-WindowStyle Hidden`), un défaut d'accès presse-papiers hors focus déjà
possible avant cette tâche et hors de son périmètre (`TASK-0035` C reste
l'autorité sur la copie elle-même). La tentative est faite dans un
`try`/`catch` qui consigne la raison plutôt que d'interrompre le rejeu.

**Non rejoué dans WebView2, par choix déclaré :** la conservation de `seen`
à travers un renommage `SYSTEM` réel **est** prouvée (BM.6, dernier item de
`stable_identity_tests.rs`, sur Windows réel) mais pas rejouée par ce
script : le produit n'expose aucune commande/UI `seen` à actionner depuis la
page, et réactiver l'ancienne commande 0.1 était explicitement interdit par
la tâche.

### BM.8 Validations

Rust **392 PASS, 5 ignorés** (bancs 100k/1M, ignorés par défaut, inchangé).
TypeScript **339 PASS**, inchangée. `pnpm check`, `pnpm build`,
`cargo build --offline`, `git diff --check` verts. `cargo fmt` propre sur
les 11 fichiers touchés (vérifié fichier par fichier : `rustfmt` sur un
fichier qui `mod`-déclare le reste de l'arbre reformate en réalité tout le
crate atteignable, donc `cargo fmt --check` du premier essai a effectivement
reformaté 14 fichiers hors de cette tâche — **annulés** avant commit; seuls
les 11 fichiers réellement modifiés par `TASK-0036` restent reformattés).
`cargo clippy --all-targets --offline -- -D warnings` rouge à **26
erreurs, même compte et mêmes diagnostics qu'avant cette tâche** — vérifié
par liste de fichiers : zéro diagnostic dans un fichier touché par
`TASK-0036` (un `collapsible_if` introduit dans `identity.rs` a été corrigé
dans cette même passe, avant le compte final).

### BM.9 Confidentialité

Aucune clé stable, `VolumeSerialNumber`, `FileId` ou empreinte n'existe dans
`NodeDto`, `MapNode`, `MapSnapshot`, `NodeDetail` ni aucun DTO sérialisé —
vérifié par test (`stable_identity_tests.rs`) et par le rejeu WebView2 réel
(recherche textuelle de `SYS1:`/`PFv1:`/`stableKey`/`identityProvenance`
dans le DOM et dans chaque payload `invoke`). Aucun identifiant global entre
cerveaux : deux cerveaux sur la même vraie racine ne partagent ni id ni
`seen` (BM.6). Aucune donnée réelle utilisée; tous les arbres sont générés
par les preuves et meurent avec elles.

### BM.10 Non fait, et limites

Hors portée comme prévu par la fiche : journal de changements (`F-027`),
watcher (`F-030`), application incrémentale (`F-031`/U-B), suggestions
heuristiques de déplacement, déplacement inter-volume comme identité
conservée, filtres, FTS5, refonte graphique, nouvelle source/second Index,
réseau/cloud/LLM/MCP. Le comportement après hydratation d'un espace réservé
cloud reste, comme avant cette tâche, une question non testée — contournée
en excluant `online_only` de la voie `SYSTEM` plutôt que résolue par la
mesure. Le premier renommage/déplacement après la migration d'un index
pré-existant n'est pas conservé (BM.3) : limite déclarée d'un remap qui n'a
rien à quoi se raccrocher avant que la clé stable existe.

**Aucune donnée personnelle**, comme toujours. **X5 inchangé**,
`origin/main` inchangé. Aucune `TASK-0037`, aucune nouvelle DEC, aucune PR,
fusion, étiquette ni release.

**Action unique suivante :** contrôle indépendant de `TASK-0035`.

## BN. TASK-0036 — passe corrective D1/D2/D3 (`ACTION-0057`) — 2026-09-11

**Statut : `IMPLEMENTED`, jamais auto-`VERIFIED`.** Même branche
`build/v0.2-a20-v1-stable-identity`, même `DEC-0009` I-E, inchangée.
Déclenchée par le contrôle indépendant
[`ACTION-0057`](../reviews/ACTION-0057-independent-control.md), qui confirme
le cœur I-E de BM mais bloque la fermeture sur trois défauts bloquants
(D1, D2, D3) et une réserve (R1).

### BN.1 D1 — migration `3 → 4` atteignable par le cycle produit

**Le défaut, exact.** `Index::open()` sait migrer `3 → 4`, et le test
`migrating_from_schema_three_…` (BM) le prouve — mais un cerveau **déjà
indexé** ne passe jamais par ce constructeur. Le cycle produit passe par
`publish_map` → `check_publishable` → `open_for_brain` →
`BrainIndex::open_existing()`, qui refusait tout `PRAGMA user_version !=
MAP_SCHEMA_VERSION` avant que la migration ait la moindre chance de
s'exécuter. `map_open`, `refresh_map` et `rebuild_map` n'offraient donc
aucun chemin produit transformant un v3 en v4.

**Correction, écrite pour rester étroite.** `BrainIndex::open_existing`
n'est **pas modifiée** : elle reste strictement `MAP_SCHEMA_VERSION`-only,
exactement comme `ACTION-0057` le permettait explicitement
(« le chemin strict `BrainIndex::open_existing()` peut rester v4-only »).
Une nouvelle méthode, `BrainIndex::open_existing_migrating(path, writable,
brain)`, est le seul point d'entrée migrant :

1. `PRAGMA user_version == MAP_SCHEMA_VERSION` → chemin inchangé, identique
   à `open_existing`.
2. `writable && PRAGMA user_version == MAP_PREVIOUS_SCHEMA_VERSION` (3, la
   seule marche que le produit migre jamais — `map/store.rs` définit la
   constante comme `MAP_SCHEMA_VERSION - 1`, jamais une chaîne générique) :
   - `built_for_brain()` doit nommer exactement `brain.brain_id`, sinon
     `MapError::BrainMismatch` — **avant** toute mutation, avant toute
     résolution de source;
   - `binding_matches(brain)` — nouvelle méthode partagée, extraite du
     `match` que `commands::check_publishable` appliquait déjà : `Bound`
     doit accorder `source_kind` **et** `source_ref`; `Legacy` n'est
     accepté que si `brain.source_kind == SyntheticFixture` **et** que
     `fixture_id` égale `source_ref` — un `REAL_ROOT` n'y a jamais droit,
     exactement la règle déjà établie par `TASK-0032`/`DEC-0033` D, jamais
     élargie; `Incoherent` est toujours refusé;
   - les deux checks passés seulement, `Index::migrate_previous_schema()`
     tourne — schéma seulement, aucune résolution ni lecture de source.
3. Toute autre version (plus ancienne, inconnue, plus récente) →
   `MapError::IndexIncompatible`, jamais de migration tentée.

`open_for_brain` — le seul goulot que `open_store` (lecture) et
`check_publishable` (republication) partagent déjà — appelle d'abord
`BrainIndex::peek_schema_version(path)`, une ouverture lecture-seule bon
marché qui lit seulement `PRAGMA user_version` sans autre effet, et ne
bascule sur `open_existing_migrating(path, true, brain)` que si elle vaut
exactement 3; sinon `open_existing(path, false)`, en lecture seule,
strictement inchangé. `map_open` continue donc de déclarer
`sourceRead=false` (`DEC-0032` A), et l'écrasante majorité des ouvertures
(fichier déjà v4) ne change ni de mode ni de coût.

**Preuve produit obligatoire (`ACTION-0057` exigeait explicitement).**
`stable_identity_tests::a_real_v3_index_upgrades_through_map_open_without_reading_the_source` :
construit un **vrai** index v4 `REAL_ROOT` via `refresh_map` (métadonnées
réelles — `brain_id`, `source_kind`, `source_ref`, `build_complete`,
`projection_contract`, `root_id`, `node_count`, `index_id`,
`index_revision`, `seen`), le réduit à la forme v3 exacte (`DROP INDEX
idx_nodes_stable_key`; `ALTER TABLE nodes DROP COLUMN
identity_provenance/stable_key`; `next_node_id` oublié;
`schema_version`/`user_version` ramenés à 3 — jamais de la SQL inventée,
un vrai fichier produit dégradé), puis :

- `map_open` migre réellement (`raw_schema_version` passe de 3 à 4);
- `sourceRead=false` dans le rapport;
- `index_id` et `index_revision` **inchangés** par la migration elle-même;
- corpus et `seen` intacts après migration;
- un curseur émis **avant** la dégradation reste valide juste après la
  migration (révision inchangée), puis devient explicitement périmé
  seulement après une vraie republication qui avance la révision;
- une republication normale avance la révision d'exactement un.

Trois refus dédiés, chacun prouvant qu'aucune mutation n'a eu lieu (bytes du
fichier comparés avant/après) :
`a_v3_index_naming_another_brain_is_refused_without_migrating` (brain_id
interne, fichier v3 réel copié dans l'emplacement d'un autre cerveau, sur
les trois portes open/refresh/rebuild),
`a_v3_index_with_a_disagreeing_binding_is_refused_without_migrating`
(`source_ref` différent), `a_future_schema_is_refused_and_never_migrated_backward`
(`user_version = 5`, refusé `map_index_incompatible` sur les trois portes,
jamais migré à rebours).

### BN.2 D2 — migration `3 → 4` atomique

**Le défaut, exact.** `migrate_to_stable_identity()` exécutait les deux
`ALTER TABLE`, la création de l'index unique et l'amorçage de
`next_node_id` en instructions autocommit séparées; `initialize()` écrivait
ensuite `PRAGMA user_version=4`/`schema_version=4` dans un `execute_batch`
**distinct**. Aucune transaction n'enveloppait la transition entière — une
erreur entre deux étapes pouvait laisser une base élargie mais toujours en
`user_version=3`.

**Correction.** Toute la transition — les deux `ALTER TABLE`, l'index
unique, l'amorçage de `next_node_id` et l'écriture finale de
`PRAGMA user_version`/`schema_meta.schema_version` — vit maintenant dans
`Index::run_stable_identity_migration()`, une seule
`connection.unchecked_transaction()` commise une seule fois à la toute fin.
`migrate_to_stable_identity()` (appelée par `initialize()`, le chemin
dev/test) lit d'abord la version et ne fait rien si elle est déjà
`>= SCHEMA_VERSION`, sinon délègue à cette même transaction. Le nouveau
chemin produit strict, `Index::migrate_previous_schema()`, vérifie en plus
`PRAGMA user_version == SCHEMA_VERSION - 1` **avant** de déléguer — sans ce
garde, la transaction stamperait `user_version=4` sur n'importe quel schéma
qu'on lui présenterait, y compris un schéma futur inconnu.

**Preuve d'échec obligatoire, par obstruction de schéma réelle, pas un hook
test-only.** `index::tests::migration_v3_to_v4_rolls_back_completely_on_injected_failure` :
sur un fichier v3 littéral, une `TABLE` nommée `idx_nodes_stable_key` est
créée **avant** la migration. Les deux `ALTER TABLE` de la transaction
réussissent (ils ne voient que les colonnes de `nodes`); `CREATE UNIQUE
INDEX IF NOT EXISTS idx_nodes_stable_key` échoue ensuite parce que
`IF NOT EXISTS` ne tolère qu'un **index** homonyme préexistant, jamais une
table — une vraie erreur SQL, après une vraie mutation de schéma déjà
appliquée dans la transaction. Après l'échec : `user_version` toujours à 3,
les deux colonnes `stable_key`/`identity_provenance` absentes (`ALTER
TABLE` annulé lui aussi), `next_node_id` toujours absent,
`schema_meta.schema_version` toujours `'3'`, 3 nœuds intacts, `seen`
intact, `index_id`/`index_revision` intacts. L'obstruction retirée
(`DROP TABLE`), le même fichier migre correctement.

### BN.3 D3 — `PATH_FALLBACK` sur le chemin OS brut

**Le défaut, exact.** Le scanner construisait `relative_display =
display_relative(&relative)` (`to_string_lossy().replace('\\', "/")`), puis
passait cette **chaîne d'affichage** à `compute_identity()` →
`path_fallback_key()`. `path_codec::encode_path()` existait déjà
précisément pour éviter cette perte (`DEC-0033` C), mais n'était pas
réutilisé ici.

**Correction.** `identity::path_fallback_key` prend maintenant `relative:
&Path` (plus `relative_path: &str`) et hache
`path_codec::encode_path(relative)` — UTF-16LE sous Windows, octets bruts
d'`OsStr` ailleurs — jamais la projection lossy. Le matériau haché est :
tag de version, séparateur, **longueur explicite** du chemin encodé (8
octets little-endian), les octets encodés eux-mêmes, séparateur, tag de
type — la longueur explicite ferme l'ambiguïté de concaténation qu'un
simple octet séparateur laisserait ouverte (`ACTION-0057`: « ajouter un
séparateur/version/type non ambigu »). `compute_identity` prend maintenant
`relative: &Path` en cohérence. `scanner.rs::scan_tree_controlled` passe le
`PathBuf` relatif **brut** du parcours (`&relative`, avant toute conversion
lossy) — `relative_display` reste calculée et stockée dans `NodeDto`
seulement pour l'affichage, exactement comme avant. Le mode interne/legacy
`identities: None` (`index.rs::publish`) dérive sa clé depuis
`Path::new(&node.relative_path)`, comme la fiche corrective l'autorisait
explicitement pour ce cas synthétique.

**Tests obligatoires :**

- `the_fallback_key_is_deterministic_and_versioned`/`_changes_with_the_path`/
  `_changes_with_the_kind` (inchangés dans leur intention, adaptés à `&Path`);
- `the_fallback_key_has_no_concatenation_ambiguity_between_path_and_kind` —
  un chemin dont la fin ressemble à un tag de type ne collisionne pas avec
  un chemin plus court suivi de ce tag;
- `two_distinct_raw_paths_with_unpaired_surrogates_never_collide_under_lossy_projection`
  (`#[cfg(windows)]`, exécuté sur Windows réel) — deux `PathBuf` construits
  avec des surrogates isolés **différents** (0xD800 puis 0xD801), dont
  `to_string_lossy()` produit le **même** texte (`U+FFFD` dans les deux
  cas — assertion qui vérifie que le test est réellement significatif),
  produisent des clés fallback **différentes**;
- `two_distinct_raw_paths_with_invalid_utf8_bytes_never_collide_under_lossy_projection`
  (`#[cfg(not(windows))]`, non exécuté sur cette plateforme mais présent et
  compilable) — équivalent non-Windows, octets non-UTF-8;
- `no_stable_key_or_absolute_path_ever_appears_in_a_serialized_dto` (BM,
  rejoué inchangé) continue de prouver que le scanner n'expose au frontend
  que la projection d'affichage, jamais le matériau brut de la clé.

### BN.4 R1 — « Copier le chemin », preuve fraîche plutôt que citée

**La réserve.** L'artefact BM notait `copyStillSucceeds: false`
(`clipboard_write_failed`) sur une fenêtre d'automatisation cachée. Aucune
ligne de `resolve_confined_target`/`copy_target_path`/`reveal_node`
(`map/commands.rs`) n'a été touchée par D1/D2/D3.

**Fermeture.** Le harnais existant (`scripts/task0036-webview2.ps1`/`.mjs`,
inchangé) a été **rejoué en entier** par cette passe plutôt que de citer
seulement `TASK-0035` `VERIFIED`. Résultat, dans le nouvel artefact :
`copyStillSucceeds: true`, `copyFailureReason: null` — le presse-papiers a
fonctionné cette fois-ci, sans qu'aucun code de copie n'ait changé.

### BN.5 Bonus — bijection de `publish_with_identity` vérifiée

Pendant l'audit de D1/D2, `Index::publish` s'est révélé pouvoir atteindre
`row_identity.get(&canonical_id).expect("an identity was computed for
every published node")` si l'appelant violait la précondition documentée
(« chaque entrée `identities` doit nommer le `node_id` d'un nœud de `nodes`,
un pour un ») — un panique **atteignable en entrée**, jamais exercé par le
vrai pipeline scanner (qui garantit déjà la bijection) mais jamais vérifié
non plus par la fonction `pub(crate)` elle-même. Fermé par une validation
bornée avant toute écriture : `PublishError::IdentityNotBijective` (+
`MapError::IdentityNotBijective` côté `map`), refusant explicitement
`node_id` dupliqué dans `identities`, puis un désaccord entre l'ensemble des
`node_id` de `nodes` et celui de `identities` (couvre à la fois une identité
manquante et une identité pour un `node_id` inconnu). Trois tests :
`publish_with_identity_refuses_a_missing_identity_instead_of_panicking`,
`_refuses_an_identity_for_an_unknown_node_id`,
`_refuses_a_duplicated_node_id_in_the_identity_list`.

### BN.6 Invariants `TASK-0036` rejoués sans régression

Les 402 tests Rust passent (392 BM + 10 cette passe), y compris **tous**
les tests `stable_identity_tests.rs`/`identity.rs`/`index.rs` de BM,
inchangés dans leur intention : `SYSTEM = VolumeSerialNumber + FileId`;
reparse/skipped/online-only sans ouverture supplémentaire; rename/move
intra-volume même `nodes.id`; sous-arbre déplacé cohérent; `seen` survit au
match `SYSTEM`; nouvel id monotone jamais recyclé; collision refusée, index
précédent intact; deux cerveaux isolés; `index_revision` atomique;
recherche/détails/enfants/projection/Explorer sans régression; aucune fuite
de clé stable/chemin absolu.

### BN.7 Rejeu WebView2

Un seul lancement réel, zéro redémarrage (même harnais que BM) :
`nodeIdIdenticalAfterRename`, `nodeIdIdenticalAfterMove`,
`movedFolderKeepsItsOwnId`, `movedFoldersChildKeepsItsId`,
`newObjectNeverRecyclesADeletedId`, `searchStillFinds`, `childrenStillPage`,
`projectionStillRenders`, `revealStillSucceeds`, `copyStillSucceeds` (R1,
fermée) tous `true`; `noAbsolutePathOrStableKeyLeak: true`;
`fatalConsoleErrors: 0`. Artefact :
[`TASK-0036-webview2.json`](../performance/runs/TASK-0036-webview2.json).

**Scénario `v3 → v4` non ajouté au harnais WebView2, séparation
explicite.** La preuve produit de la migration est en Rust
(BN.1, `a_real_v3_index_upgrades_through_map_open_without_reading_the_source`)
sur un index v4 réel réduit exactement à la forme v3, jugée plus fiable
qu'un scénario WebView2 qui devrait fabriquer le même fichier par un autre
moyen sans le bénéfice de l'assertion fine sur `index_id`/`index_revision`/
cursor qu'un test Rust permet directement. Le harnais WebView2 reste centré
sur le comportement produit post-migration — déjà démontré par le rejeu
complet de BN.7 sur un index qui, comme tout index construit par ce
harnais, est déjà en v4.

### BN.8 Validations générales

`cargo test --offline` : **402 PASS**, 0 échec, 5 ignorés. `pnpm check`,
`pnpm build`, `pnpm test` (**339 PASS**, inchangé — aucun fichier
TypeScript touché), `cargo build --offline`, `git diff --check` verts.
`cargo fmt` propre sur les 8 fichiers Rust touchés
(`identity.rs`, `index.rs`, `map/brain_index.rs`, `map/commands.rs`,
`map/mod.rs`, `map/stable_identity_tests.rs`, `map/store.rs`,
`scanner.rs`) — vérifié avec `--config style_edition=2024` explicite,
l'installation locale de `rustfmt` (1.9.0-stable) ne l'appliquant pas par
défaut avec `--edition` seul, ce qui produirait un style plus ancien
contredisant ce qui est déjà committé (reproduit sur `hierarchy.rs`, jamais
touché, à `HEAD`, avant toute modification — voir `HANDOFF.md`).
`cargo clippy --all-targets --offline -- -D warnings` reste rouge à **26
erreurs** (24 diagnostics uniques, doublons lib/test) — **confirmées
identiques à `HEAD` par `git stash`** avant cette passe (mêmes fichiers,
mêmes lignes, même compte), aucune dans les 8 fichiers touchés, aucun
nouveau diagnostic.

### BN.9 Non fait, et limites

Le scénario `v3 → v4` reste une preuve Rust, pas WebView2 (BN.7,
séparation expliquée). Le reste des limites de BM est inchangé :
déplacement inter-volume non testé, identité après hydratation cloud
contournée, `seen` non rejoué en WebView2 (prouvé côté Rust sur Windows
réel), aucun journal/watcher/incrémental. Aucune `TASK-0037`.

**Aucune donnée personnelle**, comme toujours. **X5 inchangé**,
`origin/main` inchangé. Aucune nouvelle DEC, aucune PR, fusion, étiquette ni
release.

**Action unique suivante :** nouveau contrôle indépendant de `TASK-0036`.

## BO. TASK-0036 — passe corrective D4/D5 (`ACTION-0058`) — 2026-09-12

**Statut : `IMPLEMENTED`, jamais auto-`VERIFIED`.** Même branche
`build/v0.2-a20-v1-stable-identity`, même `DEC-0009` I-E, inchangée.
Déclenchée par le recontrôle indépendant
[`ACTION-0058`](../reviews/ACTION-0058-independent-recontrol.md), qui
accepte D1/D2/D3/R1 d'`ACTION-0057` (section BN) sans régression, mais
trouve que la fiche `TASK-0036` initiale omettait
[`DEC-0013`](../decisions/DEC-0013-post-risk-gate-technical-arbitration.md),
approuvée le 2026-08-31 et jamais supplantée sur ses points B (migration) et
F (Cloud Files) avant [`DEC-0035`](../decisions/DEC-0035-cloud-files-stable-identity-boundary.md).
Une erreur d'orchestration, pas un écart de l'exécuteur.

### BO.1 D4 — migration `3 → 4` conforme à `M-B` de `DEC-0013` B

**Le défaut, exact.** La transaction SQL atomique de la section BN (D2) est
correcte comme moteur interne, mais `DEC-0013` B — arbitrée après le banc
d'essai `B1`, qui a mesuré `M-B` supérieure à `M-C` sur la sûreté, pas
seulement la vitesse — exige une couche supplémentaire et indépendante :
**copie de sûreté de fichier, sur base quiescée, avant la première
mutation, avec restauration explicite si la migration échoue.** Rien de tel
n'existait : le rollback SQL protège des échecs de transaction, pas d'un
crash de processus, d'une corruption disque ou d'un doute sur la
récupération automatique de SQLite elle-même.

**Correction.** Entre le contrôle de binding déjà acquis (D1, inchangé) et
l'appel à `Index::migrate_previous_schema()`, `BrainIndex::open_existing_migrating`
insère la séquence `M-B` complète :

1. **Verrou par `brain_id`** (`migration_lock_for`, une
   `HashMap<String, Arc<Mutex<()>>>` statique, un mutex créé à la demande
   par cerveau) — étroit et par cerveau, comme demandé par
   `ACTION-0058`, jamais une architecture nouvelle ni un second store. Ce
   n'est pas de la prudence excessive : la transaction SQL est déjà
   protégée par le verrouillage SQLite lui-même, mais la copie de sûreté au
   niveau **fichier** (`fs::copy`) ne l'est pas — un `fs::copy` lisant un
   fichier qu'un autre thread est en train de migrer pourrait capturer un
   instantané déchiré. Après acquisition, la version est relue : un autre
   thread a pu migrer entre-temps, auquel cas cette fonction rejoint le cas
   `v4` sans rien refaire.
2. **Quiescence** — `PRAGMA wal_checkpoint(TRUNCATE)` sur la connexion déjà
   ouverte. Son premier champ retourné (`busy`) dit si elle a réellement
   tout replié; `busy != 0` refuse (`MapError::MigrationUnavailable`,
   motif `quiesce_busy`) **avant toute copie et toute migration** — le
   texte même d'`ACTION-0058` : « busy/quiescence impossible ⇒ refus sans
   migration et sans backup trompeur ».
3. **Copie de sûreté** — `fs::copy` du fichier principal seul vers
   `<index>.v3-safety-copy`, **dans le même dossier `map/` du cerveau**,
   jamais sous la source. Aucun `-wal`/`-shm` à copier séparément : la
   quiescence de l'étape 2 garantit qu'ils sont vides après un `TRUNCATE`
   réussi, donc le fichier principal seul est déjà « un v3 cohérent et
   ouvrable ». Un échec de copie refuse
   (`MigrationUnavailable`, motif `safety copy failed`) sans avoir touché
   au schéma.
4. **Vérification indépendante** — la copie est rouverte en lecture seule,
   son `PRAGMA user_version` confirmé exactement
   `MAP_PREVIOUS_SCHEMA_VERSION`, sa table `nodes` confirmée lisible.
   Échec ⇒ refus, copie supprimée, aucune migration tentée. C'est la
   condition explicite d'`ACTION-0058` : « la copie doit exister et être
   validée avant le premier DDL v4 ».
5. **Migration** — `Index::migrate_previous_schema()`, section BN,
   inchangée.
6. **Échec de migration ⇒ restauration.** La connexion est fermée
   explicitement en premier (Windows refuse d'écraser un fichier qu'un
   handle tient encore ouvert), tout `-wal`/`-shm` résiduel supprimé, la
   copie recopiée par-dessus le fichier vivant, la copie transitoire
   supprimée, puis l'erreur d'origine (le vrai échec SQL, pas une
   enveloppe) est renvoyée.
7. **Succès ⇒ nettoyage.** La copie transitoire est supprimée; le chemin
   normal (`finish_open_existing`) continue comme en BN.

**Politique de portée de la copie — bornée, jamais accumulée.** Un seul nom
de fichier par cerveau (`<index>.v3-safety-copy`); une tentative en cours
écrase la précédente; la copie est supprimée dans les deux issues
terminales (succès ou restauration réussie). `ACTION-0058` : « ne multiplie
pas des backups à chaque ouverture » — respecté par construction, pas par
discipline. Aucun chemin absolu de la copie ne traverse jamais IPC, log ou
artefact : le `PathBuf` ne quitte jamais `brain_index.rs`, et aucune
commande ni DTO ne le porte.

**Preuves minimales — les huit demandées par `ACTION-0058`, toutes
couvertes :**

| Exigence | Preuve |
|---|---|
| v3 en WAL avec écriture committée réellement présente, copie ouvrable et correcte après quiescence | `d4_a_wal_pending_write_is_captured_and_restored_on_injected_migration_failure` — une connexion brute gardée ouverte laisse un `UPDATE` committé uniquement dans `-wal` (vérifié : le fichier `-wal` fait plus de 0 octet avant migration) |
| La copie existe avant le premier changement de schéma | Ordre du code (copie → vérification → `migrate_previous_schema`), et le test d'échec ci-dessus le prouve en creux : sans copie préexistante, aucune restauration ne serait possible |
| Échec déterministe après copie et début de migration ⇒ restauration complète (`seen`, `index_id`, `index_revision`, binding, nœuds, version) | Même test : obstruction de schéma réelle (la table `idx_nodes_stable_key`, identique à D2/BN) après que les deux `ALTER TABLE` ont déjà réussi; après restauration, `user_version == 3`, et — le point du test — l'écriture WAL-pending (`seen = 1`) est bien présente dans le fichier restauré, preuve que la quiescence l'a réellement repliée dans la copie |
| Après restauration, une nouvelle tentative peut réussir | Même test, suite : l'obstruction retirée, `open_map` migre proprement et `seen` reste vrai |
| Busy/quiescence impossible ⇒ refus sans migration et sans backup trompeur | `d4_a_busy_checkpoint_refuses_without_migrating_or_copying` — un lecteur concurrent ouvre sa lecture **avant** qu'une écriture n'existe (condition nécessaire : un WAL vide checkpointe trivialement quel que soit le lecteur), puis un `UPDATE` par un tiers crée le contenu que le lecteur retient; le `TRUNCATE` échoue, aucune copie n'existe, contenu logique inchangé |
| Mismatch/future schema ⇒ aucun backup créé, fichier inchangé | Les trois refus D1 existants (`a_v3_index_naming_another_brain_…`, `a_v3_index_with_a_disagreeing_binding_…`, `a_future_schema_…`) gagnent chacun `assert!(!safety_copy_path(&database).exists(), …)` |
| Migration réussie ⇒ v4 ouvrable, `index_id`/`index_revision` non modifiés, source non lue | Section BN, `a_real_v3_index_upgrades_through_map_open_without_reading_the_source`, inchangée — plus une nouvelle assertion « aucune copie de sûreté laissée derrière » |
| Republication suivante avance la révision, invalide les anciens curseurs | Même test BN, inchangé : toujours vert |

Aucune primitive de verrouillage globale ni second store n'a été créée — le
verrou est une simple carte en mémoire de processus, portée par `brain_id`,
exactement la taille qu'`ACTION-0058` demandait.

**Non couvert, déclaré honnêtement.** Un vrai `SIGKILL`/coupure de courant
pendant la migration n'est pas reproduit par ces tests — ils injectent un
échec SQL déterministe et un checkpoint occupé, tous deux dans le même
processus. C'est la même limite que `PERF-0002`/`B1` déclarait déjà pour le
spike M-B original.

### BO.2 D5 — frontière d'identité Cloud Files (`DEC-0035`)

**Le défaut, exact.** `DEC-0013` F avait laissé ouverte la question de la
continuité de l'identité système générique à travers une hydratation
Cloud Files, et l'avait élevée en porte bloquante avant l'identité
persistante. La livraison initiale de `TASK-0036` contournait cette
question pour les entrées `online_only`, mais **pas** pour un placeholder
déjà hydraté : un tel objet peut ne plus porter les attributs `RECALL_*`
qui déclenchaient ce repli, et retomber sur la voie `SYSTEM` générique —
changeant sa provenance, donc son `nodes.id` à la prochaine publication,
sans rien de visible dans le fichier lui-même.

**Fermeture par `DEC-0035`, sans réouvrir la question.** Plutôt que de
mesurer la survie du `FILE_ID_INFO` générique à l'hydratation (question
jamais résolue, faute de source Microsoft), `DEC-0035` rend cette réponse
inutile : **un placeholder Cloud Files reconnu n'emprunte jamais la voie
`SYSTEM`, hydraté ou non.**

**Audit d'abord — comme exigé.** `windows-sys = 0.61.2` (déjà pinnée)
expose `Win32::Storage::CloudFilters::{CfGetPlaceholderInfo,
CF_PLACEHOLDER_INFO_STANDARD, CF_PLACEHOLDER_STANDARD_INFO}` derrière la
feature `Win32_Storage_CloudFilters`, sans dépendance supplémentaire à
`Win32_System_CorrelationVector` pour cette fonction précise (vérifié dans
le code source vendu de la caisse : `CfGetPlaceholderInfo` ne porte aucun
`#[cfg(feature = …)]` propre, seulement le gate du module). Ajoutée aux
features de `Cargo.toml`, rien d'autre.

**Implémentation.** `identity::compute_identity` appelle
`cloud_files_detection(absolute_path)` juste après le test d'éligibilité
existant (`!reparse_point && !online_only && kind != Skipped` — inchangé,
donc aucune ouverture de handle supplémentaire pour les cas déjà exclus) et
juste avant `system_identity_key`. Trois issues
(`CloudFilesDetection::{Placeholder, NotCloudFile, Ambiguous}`), une seule
règle pure et testable séparément de l'appel Windows
(`blocks_system_identity`) : `Placeholder` et `Ambiguous` bloquent `SYSTEM`;
seul `NotCloudFile` le laisse disponible. Le handle Windows est ouvert pour
`FILE_READ_ATTRIBUTES` **seul** (jamais `GENERIC_READ`, jamais de contenu),
`CfGetPlaceholderInfo(…, CF_PLACEHOLDER_INFO_STANDARD, …)` sert
**uniquement** de détection — seul le succès ou l'échec de l'appel compte,
aucun champ de `CF_PLACEHOLDER_STANDARD_INFO` (`FileId`, `PinState`,
`InSyncState`…) n'est jamais lu. L'échec officiel `ERROR_NOT_A_CLOUD_FILE`
est reconnu via `HRESULT_FROM_WIN32` implémenté selon la macro standard
(`FACILITY_WIN32 = 7`), pas une valeur magique observée une fois — testé
séparément (`hresult_from_win32_matches_the_standard_macro`). Toute autre
erreur, ou un handle qui ne s'ouvre même pas, retombe sur `Ambiguous` —
jamais lu comme preuve dans un sens ou dans l'autre.

**Rien d'hydratation n'est jamais appelé.** `CfHydratePlaceholder`,
`CfDehydratePlaceholder` et les mutateurs de pin/sync-state ne sont
référencés nulle part dans le code de production — prouvé
structurellement par `no_hydrate_dehydrate_or_pin_state_api_is_referenced_in_source`,
qui scanne le texte source d'`identity.rs` **jusqu'à son propre module de
test** (celui-ci doit nommer ces symboles interdits dans sa propre liste
d'assertions, donc scanner au-delà rendrait le test faux par construction
contre lui-même — la même technique de preuve par lecture de source que
`DEC-0033` I emploie déjà ailleurs dans ce dépôt, adaptée à cette
contrainte particulière).

**Pas de fixture Cloud Files réelle — déclaré, pas caché.** Fabriquer un
vrai placeholder synthétique local aurait exigé `CfRegisterSyncRoot`, une
inscription réelle de fournisseur de synchronisation auprès de Windows :
un risque réel de laisser un état système si le nettoyage échouait, et un
élargissement de portée qu'`ACTION-0058` autorisait explicitement à éviter
(« si une fixture […] peut être créée […] elle est bienvenue mais pas au
prix d'élargir la portée »). La frontière est donc prouvée par trois
couches indépendantes, aucune ne portant seule le poids de la preuve :

1. **Table de décision pure**, sans aucun appel Windows —
   `a_detected_placeholder_blocks_system_identity`,
   `an_ambiguous_detection_is_conservative_and_blocks_system_identity`,
   `a_confirmed_non_cloud_file_leaves_system_identity_available` — les
   trois issues de `blocks_system_identity`, exactement la règle que
   `DEC-0035` §1 énonce.
2. **L'appel Windows réel**, contre un fichier ordinaire créé par le test
   lui-même — `an_ordinary_local_file_is_confirmed_not_a_cloud_file_and_still_reaches_system` :
   `cloud_files_detection` répond bien `NotCloudFile`, et
   `compute_identity` atteint toujours `SYSTEM` pour ce fichier — la preuve
   qu'aucune régression n'a été introduite sur le cas ordinaire, le seul
   cas que la suite `windows_system_identity` existante exerce déjà par
   ailleurs (rejouée sans modification, toujours verte).
3. **Les sources Microsoft** déjà citées en toutes lettres par `DEC-0035`
   (`CfGetPlaceholderInfo` ne modifie pas le fichier, ne requiert que
   `READ_ATTRIBUTES`, échoue explicitement si la cible n'est pas un
   placeholder).

**Confidentialité.** Aucune donnée CFAPI (`FileId`, `PinState`,
`InSyncState`, volume) n'est jamais lue, encore moins sérialisée — le
booléen de blocage est tout ce qui traverse la frontière de la fonction.

### BO.3 Invariants `TASK-0036`/`ACTION-0057` rejoués sans régression

411 tests Rust passent (402 BO-moins-1 + 9 cette passe), y compris
**tous** les tests des sections BM et BN sans modification de leur
intention : D1/D2/D3 (migration produit, atomicité, fallback brut),
bijection `publish_with_identity`, `SYSTEM` local, rename/move/sous-arbre,
`seen`, compteur monotone, isolation multi-cerveaux, révision/curseurs,
recherche/détails/enfants/projection/Explorer/copie, aucune fuite de clé
stable ou de chemin (source **ou** copie de sûreté maintenant).

### BO.4 Rejeu WebView2

Un seul lancement réel, zéro redémarrage, même harnais que BM/BN, inchangé :
tous les invariants déjà acquis restent verts, `copyStillSucceeds: true`
toujours, `fatalConsoleErrors: 0`. Artefact remplacé :
[`TASK-0036-webview2.json`](../performance/runs/TASK-0036-webview2.json).

**Scénario `v3 → v4` toujours non ajouté au harnais WebView2 — séparation
maintenue et réaffirmée par `NEXT_PROMPT.md` lui-même** : « La migration M-B
doit être prouvée au niveau Rust produit avec contrôle précis du fichier
v3/backup/WAL; inutile de fabriquer un scénario WebView moins précis si le
test Rust passe réellement par `open_map`/`open_for_brain`. » C'est
exactement le cas ici (BO.1) : le test Rust appelle `open_map`, le même
point d'entrée produit qu'une frappe réelle sur **Actualiser** déclenche.

### BO.5 Validations générales

`cargo test --offline` : **411 PASS**, 0 échec, 5 ignorés. `pnpm check`,
`pnpm build`, `pnpm test` (**339 PASS**, inchangé), `cargo build --offline`,
`git diff --check` verts. `cargo fmt` propre sur les 4 fichiers Rust
touchés (`identity.rs`, `map/brain_index.rs`, `map/mod.rs`,
`map/stable_identity_tests.rs`) — vérifié avec `--config style_edition=2024`
explicite, puis par `cargo fmt -- --config style_edition=2024` sur le
crate entier suivi d'un `git checkout` de chaque fichier hors du périmètre
réellement touché (le même piège de reformatage d'arbre entier documenté
par les deux passes précédentes, reproduit et évité de la même façon).
`cargo clippy --all-targets --offline -- -D warnings` reste rouge à **26
erreurs** (24 diagnostics uniques, doublons lib/test) — confirmées
identiques ligne par ligne à l'état d'avant cette passe, aucune dans les 4
fichiers touchés. Un `.err().expect(…)` introduit dans les trois nouveaux
tests D4 (là où `expect_err(…)` était en réalité disponible, le type `Ok`
`MapOpenReport` implémentant `Debug`) a été repéré par ce même passage de
Clippy et corrigé avant livraison.

### BO.6 Non fait, et limites

Aucune fixture Cloud Files réelle (BO.2, justifié). Aucun vrai crash de
processus pendant la migration `M-B` (BO.1, même limite que `B1`). Le reste
des limites de `TASK-0036` — déplacement inter-volume, identité après
hydratation cloud (désormais **évitée** plutôt que mesurée, exactement le
choix de `DEC-0035`), `seen` non rejoué en WebView2, aucun journal/watcher/
incrémental — est inchangé. Aucune `TASK-0037`.

**Aucune donnée personnelle**, comme toujours. **X5 inchangé**,
`origin/main` inchangé. Aucune PR, fusion, étiquette ni release.

**Action unique suivante :** nouveau contrôle indépendant de `TASK-0036`.
