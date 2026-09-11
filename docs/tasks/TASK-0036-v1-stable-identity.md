# TASK-0036 — V1 Stable Identity Foundation

- Date : 2026-09-11
- Statut : `IMPLEMENTED`, jamais auto-`VERIFIED`. Détail :
  [`VALIDATION.md` section BM](../ai/VALIDATION.md).
- Branche : `build/v0.2-a20-v1-stable-identity`
- Prérequis : `TASK-0035 = VERIFIED` par `ACTION-0056`
- Décisions applicables : `DEC-0009` I-E, `DEC-0010` U-B, `DEC-0011`, `DEC-0030`, `DEC-0031`, `DEC-0033`, `DEC-0034`
- Preuve à réutiliser : `TASK-0012` B3 / `PERF-0003-b3-windows-identity.md`

## But

Donner au **BrainIndex canonique** une identité de nœud durable suffisante pour qu'un renommage ou un déplacement intra-volume prouvé ne transforme plus automatiquement le même objet en « supprimé + créé ».

Cette tâche est la fondation de `F-004 — Identifiants stables` et une précondition de `F-027` journal de changements / `F-031` mise à jour incrémentale. Elle **n'implémente pas encore** le journal, le watcher ni l'application incrémentale.

## Décision déjà prise — ne pas la réinventer

`DEC-0009` a retenu **I-E** :

1. sous Windows, utiliser l'identité système `VolumeSerialNumber + FileId` lorsqu'elle est obtenable et fiable;
2. sinon utiliser une empreinte **déterministe et versionnée** du chemin relatif brut + type;
3. la provenance de l'identité est obligatoire et ne peut être que prouvable (`SYSTEM` ou `PATH_FALLBACK`);
4. aucune heuristique de ressemblance ne peut devenir une identité ni préserver automatiquement un état;
5. un déplacement inter-volume non prouvable reste, plus tard, création + suppression; une éventuelle corrélation ne sera qu'une suggestion visible.

Le banc B3 déjà `VERIFIED` a démontré sur Rust stable la voie Windows avec `GetFileInformationByHandleEx(FileIdInfo)` et la candidate `windows-sys = 0.61.2` (`windows-link 0.2.1`, MIT OR Apache-2.0). **Auditer et adapter ce code existant. Ne pas refaire le spike.**

## A — Audit avant code

Avant toute modification de production, lire et comparer :

- `spikes/b3-windows-identity/src/main.rs`, son `Cargo.toml`, `LICENCE.md`, `PERF-0003` et le résultat B3 de `TASK-0012`;
- `scanner.rs`, `domain.rs`, `index.rs`, `hierarchy.rs`;
- `map/brain_index.rs`, `map/commands.rs`, `map/source.rs`;
- les migrations/index versions actuelles et les tests de reconstruction/republication;
- la conservation actuelle de `seen`, aujourd'hui liée au chemin dans `replace_nodes_with_metadata`.

Écrire dans `.orchestrator/RESULT.md` avant le résumé final : **réutiliser / adapter / ne pas construire**.

## B — Modèle d'identité interne

Ajouter à la représentation indexable d'un nœud les informations minimales nécessaires pour I-E, sans exposer de nouvel identifiant de système de fichiers au WebView.

Le modèle doit distinguer clairement :

- **identité interne FileTopo** : `nodes.id`, entier monotone et seulement unique dans un cerveau;
- **clé stable de correspondance** : valeur interne servant à reconnaître le même objet entre deux publications;
- **provenance** : `SYSTEM` ou `PATH_FALLBACK`, jamais une heuristique.

Contraintes :

- aucune clé stable brute, volume serial, FileId, empreinte ou donnée machine dans les DTO frontend, DOM, logs ou artefacts;
- aucun identifiant n'est global entre cerveaux;
- deux cerveaux pointant vers le même dossier restent indépendants;
- les points de réanalyse/skipped ne doivent pas forcer une ouverture dangereuse pour obtenir une identité;
- aucun contenu de fichier n'est lu pour établir l'identité.

### Windows / REAL_ROOT

Réutiliser la technique B3 avec Rust stable. Si une dépendance de production est nécessaire :

- préférer la candidate déjà auditée `windows-sys 0.61.2`, épinglée et limitée à la cible Windows;
- réutiliser les feature flags minimaux nécessaires, pas un ensemble large;
- documenter que licence/compatibilité proviennent du spike B3 déjà vérifié;
- ne pas choisir une nouvelle caisse sans nécessité démontrée.

L'ouverture de handle doit être métadonnée seulement; ne pas lire le contenu. Respecter les exclusions/reparse/online-only existantes et ne pas introduire d'hydratation implicite.

### Repli déterministe

Lorsque l'identité système n'est pas disponible ou n'est pas utilisée (notamment fixtures synthétiques / plateforme non Windows), produire une empreinte versionnée du **chemin relatif brut + type**, conformément à `DEC-0004` remplacée par `DEC-0009`.

La version de l'algorithme doit être explicite. Aucune date, taille, mtime ou score de ressemblance ne peut entrer dans cette identité de repli.

## C — Schéma canonique et migration

Faire évoluer **le même Index SQLite**, jamais créer une seconde base ou un registre d'identité parallèle.

Le schéma physique exact appartient à l'implémentation après audit, mais doit satisfaire :

- persistance de la clé stable/provenance avec chaque nœud;
- unicité suffisante à l'intérieur d'un index pour empêcher deux lignes actives de prétendre la même identité prouvée;
- migration versionnée, transactionnelle et testée depuis le schéma courant;
- `index_id` reste l'identité de la base et ne doit pas être confondu avec l'identité d'un nœud;
- une migration échouée ne doit pas produire un index partiellement crédible;
- les chemins de lecture bornés (`map_view`, recherche, enfants, détails) restent compatibles.

Si la migration correcte exigerait d'affaiblir les garanties déjà approuvées de `DEC-0011` ou de rendre un ancien index silencieusement faux, arrêter et rapporter `BLOCKED` plutôt qu'inventer une réparation.

## D — Préserver `nodes.id` lors d'une republication

Le scanner peut continuer à produire des identifiants temporaires pendant son parcours si c'est plus simple. À la publication, le système doit remapper de façon déterministe le nouveau scan vers les IDs canoniques existants.

Règles :

1. même clé stable prouvée dans le même cerveau => **même `nodes.id`**;
2. nouveau nœud => nouvel ID monotone, sans réutiliser silencieusement l'ID d'un objet supprimé;
3. parent_id de tous les nœuds remappé vers les IDs canoniques correspondants avant publication;
4. renommage ou déplacement intra-volume avec identité `SYSTEM` => même ID, nouveau nom/chemin/parent selon le scan;
5. repli `PATH_FALLBACK` => un renommage/déplacement change volontairement la clé; ce cas reste donc un nouveau nœud et l'ancien disparaît — comportement honnête prévu par I-E;
6. aucune heuristique pour recoller automatiquement deux clés différentes;
7. collisions/duplicats d'identité => refus explicite de la publication, jamais choix arbitraire.

Préférer un compteur durable/monotone interne (ou mécanisme équivalent prouvé) afin d'éviter de recycler les IDs supprimés.

## E — Préserver l'état non reconstructible attaché au nœud

La conservation actuelle de `seen` par `relative_path` doit cesser d'être la seule règle lorsqu'une identité stable est disponible.

Pour un nœud reconnu comme le même par clé stable :

- conserver son `seen` et tout état **déjà stocké dans la ligne nodes** qui est explicitement non reconstructible;
- un renommage/déplacement `SYSTEM` ne doit pas remettre `seen` à faux;
- un `PATH_FALLBACK` renommé est un nouvel objet du point de vue prouvable et ne récupère pas automatiquement l'ancien état.

Ne déplacer aucun autre état entre tables ou cerveaux dans cette tranche.

## F — Compatibilité produit

Aucune nouvelle fonction UI n'est attendue. Les contrats suivants doivent rester intacts :

- `BrainNodeRef = brainId + nodeId` reste la seule identité frontend;
- projection progressive 512 / cible ordinaire 64 inchangées;
- recherche TASK-0034 inchangée fonctionnellement;
- enfants directs TASK-0035 inchangés;
- Explorer et Copier le chemin restent confinés côté Rust;
- aucune permission frontend nouvelle;
- aucun watcher, journal, filtre ou mécanisme incrémental.

Une révision de l'Index doit continuer d'avancer atomiquement à chaque republication; les anciens curseurs deviennent périmés comme aujourd'hui.

## G — Preuves Rust obligatoires

Utiliser uniquement des données/arborescences générées par les tests.

Prouver au minimum :

1. migration du schéma précédent vers le nouveau schéma avec données existantes et index ouvrable;
2. identité `PATH_FALLBACK` déterministe/versionnée : même chemin brut + type => même clé entre exécutions; renommage => clé différente;
3. sous Windows, identité `SYSTEM` exacte pour un fichier et un dossier, en adaptant le code B3;
4. renommage d'un fichier sur le même volume => même clé SYSTEM et même `nodes.id` après refresh;
5. déplacement d'un fichier vers un autre dossier du même volume => même clé SYSTEM, même ID, nouveau parent/chemin;
6. équivalent pour un dossier contenant au moins un enfant : parent et descendant restent cohérents après déplacement;
7. `seen=true` survit au renommage/déplacement SYSTEM;
8. un nouveau fichier reçoit un ID neuf; suppression puis création différente ne recycle pas silencieusement l'ancien ID;
9. deux cerveaux construits depuis le même dossier n'utilisent jamais un ID/état de l'autre comme autorité;
10. collision artificielle de clé stable => publication refusée, index précédent toujours ouvrable;
11. reparse/skipped/identité système indisponible => comportement I-E explicite, sans heuristique;
12. migration/republication conserve `index_id`, avance `index_revision`, et invalide les anciens curseurs;
13. aucun identifiant système/clés stables dans DTO sérialisés exposés au frontend.

Les preuves Windows qui dépendent réellement de `FileIdInfo` doivent être marquées `#[cfg(windows)]`; ne pas faire semblant de les prouver sur une autre plateforme.

## H — Rejeu produit Windows / WebView2

Réutiliser les harness existants. Créer uniquement une arborescence REAL_ROOT synthétique générée par le script de preuve.

Scénario minimal :

1. indexer le cerveau synthétique réel;
2. rechercher/sélectionner un fichier connu et enregistrer **dans le script seulement** son `BrainNodeRef.nodeId`;
3. hors du processus produit, renommer ce fichier dans la racine synthétique, sans journaliser le chemin absolu;
4. déclencher `Actualiser` par le produit;
5. rechercher le nouveau nom et vérifier que le **nodeId est identique** lorsque l'identité SYSTEM est disponible;
6. déplacer ensuite le fichier dans un autre dossier de la même racine, actualiser, vérifier même nodeId et parent/chemin relatif mis à jour;
7. marquer/installer si possible un état `seen` via la primitive existante de test ou de modèle et vérifier sa conservation sans réactiver l'ancienne commande 0.1;
8. confirmer recherche, détails, enfants directs, projection, Explorer/Copier sans régression;
9. 0 chemin absolu/clé stable/volume id/FileId dans DOM, payloads exposés, logs ou artefacts;
10. 0 erreur console fatale.

L'artefact peut conserver des booléens, IDs synthétiques et provenances générales; **jamais** les clés stables brutes ni les chemins absolus.

## I — Hors portée

- journal de changements F-027;
- watcher F-030;
- application incrémentale U-B/F-031;
- suggestions heuristiques de déplacement;
- déplacement inter-volume comme identité conservée;
- filtres nouveaux/non vus;
- FTS5;
- refonte graphique;
- nouvelle source de données ou second Index;
- réseau/cloud/LLM/MCP.

## J — Validation générale

Exécuter les tests ciblés puis les suites pertinentes complètes :

- `cargo test --offline`;
- tests Windows ciblés de l'identité;
- suite TypeScript pour non-régression;
- `pnpm check`;
- `pnpm build`;
- `cargo build --offline`;
- `cargo fmt --check` sur le code Rust touché / formatage global si faisable;
- `cargo clippy --all-targets --offline -- -D warnings`, en distinguant la dette historique de tout nouveau diagnostic;
- `git diff --check`.

Toute dépendance nouvelle doit être verrouillée et justifiée par le spike B3.

## Sortie attendue

À la fin :

- `TASK-0036 = IMPLEMENTED`, jamais auto-`VERIFIED`;
- aucune TASK-0037 précréée par l'exécuteur;
- mettre à jour `docs/ai/CURRENT_STATE.md`, `HANDOFF.md`, `NEXT_ACTION.md`, `VALIDATION.md`, `CHANGELOG_AI.md`, `FEATURE_MATRIX.md` seulement pour refléter honnêtement l'état de F-004, et `.orchestrator/RESULT.md`;
- `RESULT.md` donne : HEAD/commits, audit B3 réutilisé, schéma/migration, forme des deux provenances, stratégie de remap IDs, preuves rename/move/seen, rejeu WebView2, tests, confidentialité, dette/limites;
- `NEXT_ACTION = contrôle indépendant de TASK-0036`;
- commit/push uniquement sur `build/v0.2-a20-v1-stable-identity`;
- aucun PR/merge/tag/release.
