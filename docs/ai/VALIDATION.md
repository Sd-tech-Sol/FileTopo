# VALIDATION.md — État de vérification

**Dernière mise à jour :** 2026-08-25
**Portée :** TASK-0001 (phase 0) — `VERIFIED` ; TASK-0002 (phase 1) —
`VERIFIED` le 2026-08-25, sur preuves indépendantes de l'orchestrateur
(section A.7)

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
| Dépôt | `Sd-tech-Sol/FileTopo`, public, branche `main` |
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
