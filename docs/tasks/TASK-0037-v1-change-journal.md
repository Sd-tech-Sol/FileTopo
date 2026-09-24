# TASK-0037 — V1 Change Journal on Manual Refresh

- Date : 2026-09-12
- Statut : `VERIFIED` (2026-09-23) par `ACTION-0061`
- Branche : `build/v0.2-a21-v1-change-journal`
- Prérequis : `TASK-0036 = VERIFIED` par `ACTION-0060`
- Portée produit : `F-027` / parité `P-16`, plus le résumé manuel de changements de `P-18`
- Décisions applicables : `DEC-0009`, `DEC-0010` (U-B comme direction future), `DEC-0011`, `DEC-0013` B (migration M-B), `DEC-0031`, `DEC-0032`, `DEC-0033`, `DEC-0035`

## But

Ajouter un **journal de changements persistant par cerveau**, alimenté lors d’une **Actualisation/Reconstruction explicite** à partir de la comparaison entre l’Index canonique précédent et le nouveau scan remappé par l’identité stable de `TASK-0036`.

Cette tranche doit détecter et conserver les cinq natures exigées par `P-16` :

- création;
- modification observable;
- renommage;
- déplacement;
- suppression.

Le journal doit être consultable, paginé, filtrable et persister au redémarrage. Cette tâche **ne construit pas encore le watcher automatique**, l’application incrémentale U-B, les filtres de carte `nouveau/non vu`, ni les commandes « marquer vu ».

## Pourquoi cette tranche vient maintenant

`P-09` exige les filtres `nouveaux/non vus`, mais `P-17` exige explicitement que ces états soient **dérivés du journal**. Écrire les filtres avant le journal fabriquerait une seconde vérité. `TASK-0036` vient de rendre les `nodes.id` suffisamment stables pour attribuer correctement un rename/move prouvé au même nœud.

Le watcher (`F-030`) et l’incrémental (`F-031`) restent après cette tranche : ils devront produire/appliquer le **même modèle de changement**, pas un journal parallèle.

## A — Audit avant code

Avant toute modification de production, lire et comparer :

- `ACTION-0060`, `TASK-0036` et son schéma courant;
- `DEC-0010` en entier, surtout U-B et l’invariant « ne pas supprimer l’index courant avant remplacement valide »;
- `DEC-0013` B et le chemin M-B déjà implémenté;
- `src-tauri/src/index.rs`, `identity.rs`, `scanner.rs`;
- `map/brain_index.rs`, `map/commands.rs`, `map/store.rs`;
- `MapApp.tsx`, `types.ts`, les modèles de pagination/cursor déjà utilisés par recherche et enfants;
- `FEATURE_MATRIX.md` lignes `F-022`, `F-027` à `F-031` et `CARTETOPO_FUNCTIONAL_PARITY.md` `P-16` à `P-18`.

Dans `RESULT.md`, écrire clairement ce qui est **réutilisé**, **adapté** et **non construit**. Ne pas créer une deuxième base, un second index ou un moteur de diff parallèle si l’Index canonique peut porter le journal.

## B — Un seul journal, dans l’Index canonique du cerveau

Le journal appartient au **même SQLite par cerveau** que les nœuds canoniques.

Si le schéma courant est bien v4 après audit, faire évoluer proprement vers v5. Ne pas modifier silencieusement un schéma sans version.

La migration vers le nouveau schéma doit réutiliser la frontière M-B déjà éprouvée :

1. contrôles cerveau/binding avant mutation;
2. quiescence;
3. copie de sûreté validée;
4. migration transactionnelle;
5. validation canonique du nouveau schéma;
6. restauration si migration **ou validation** échoue;
7. suppression de la copie seulement après validation réussie.

Ne pas dupliquer `open_existing_migrating()` ni recréer une seconde stratégie de migration. Généraliser/adapter le dispatcher de migration uniquement autant que nécessaire pour le nouveau saut de schéma. Un schéma futur reste refusé. Si le chemin produit ne peut plus migrer un index v4 réel vers le nouveau schéma, la tâche est bloquée.

### Données minimales d’un événement

Le schéma exact appartient à l’implémentation, mais chaque entrée doit permettre au minimum :

- un identifiant d’événement monotone dans ce cerveau;
- la révision d’Index à laquelle le changement a été **détecté**;
- un ordinal déterministe dans cette révision;
- nature : `CREATED`, `MODIFIED`, `RENAMED`, `MOVED`, `DELETED` — aucune sixième nature implicite;
- `node_id` canonique du nœud concerné;
- type de nœud;
- ancien/nouveau nom ou chemin **relatif** lorsque pertinent;
- ancien/nouveau `parent_id` lorsque pertinent;
- instant de **détection** de l’actualisation si un horodatage est conservé.

Interdits dans le journal : chemin absolu, racine réelle, `stable_key`, FileId, volume serial, matériau raw-path, contenu de fichier, heuristique de similarité.

**Ne jamais présenter l’horodatage comme l’instant réel où le système de fichiers a changé.** Un diff de deux snapshots ne connaît que l’instant où FileTopo a détecté l’écart.

## C — Règles de diff exactes

Le diff se fait après que le nouveau scan a été remappé vers les IDs canoniques stables, en comparant **ancien corpus canonique** et **nouveau corpus canonique**.

### Création / suppression

- `node_id` présent seulement après => `CREATED`;
- `node_id` présent seulement avant => `DELETED`.

Un objet en `PATH_FALLBACK` renommé/déplacé change volontairement d’identité : il doit donc rester honnêtement **DELETED + CREATED**, jamais être recollé par ressemblance.

### Renommage / déplacement

Pour un même `node_id` présent avant et après :

- `name` changé avec même parent direct => `RENAMED`;
- `parent_id` changé => `MOVED`;
- si parent **et** nom changent dans la même actualisation, les deux natures doivent être représentées sans prétendre connaître leur ordre réel.

Un descendant dont seul le chemin relatif change parce qu’un **ancêtre** a bougé, mais dont le propre nom et le propre `parent_id` canoniques sont inchangés, **ne doit pas générer un faux MOVED/RENAMED individuel**. Le mouvement structurel appartient au nœud dont le parent ou le nom a réellement changé.

### Modification observable

`MODIFIED` signifie uniquement : **une métadonnée réellement indexée et observée par FileTopo a changé** pour le même `node_id`, hors changements purement structurels déjà classés ci-dessus.

Auditer les champs existants et figer explicitement la liste. À minima, taille et `modified_unix_ms` sont candidats. Ne pas lire le contenu pour décider. Ne pas produire un `MODIFIED` seulement parce que `child_count`, profondeur ou chemin dérivé a changé à cause d’une création/suppression/déplacement ailleurs.

### Ordre

Le scan complet ne permet pas de reconstruire l’ordre réel des opérations qui ont eu lieu entre deux actualisations. Ne pas l’inventer.

Les événements d’une même publication portent le même `detected_revision` et un **ordre de journal déterministe** (`ordinal`) défini par le code. L’UI doit présenter cet ordre comme ordre de détection/publication, pas comme chronologie système garantie.

## D — Atomicité publication + journal

C’est une frontière dure.

Le nouveau corpus, le `index_revision` et les événements du diff doivent être publiés dans **la même transaction logique SQLite**. Une publication qui échoue ne laisse **aucun** événement. Un insert de journal qui échoue fait échouer la publication et conserve l’ancien Index ouvrable.

Le journal doit survivre à une reconstruction/actualisation : ne jamais le vider avec les lignes `nodes`.

Premier build d’un cerveau : il établit la **baseline** et ne doit pas créer artificiellement des milliers d’événements `CREATED`. Le journal commence à comparer à partir du deuxième état valide.

Une actualisation sans changement produit **zéro événement**, même si la révision technique de l’Index avance selon le contrat actuel.

## E — API bornée de consultation

Ajouter une commande produit du genre `map_change_journal(...)`, nom exact à choisir après audit.

Contraintes :

- cerveau identifié explicitement, jamais chemin en argument;
- max 50 événements/page;
- pagination keyset/cursor, pas de chargement global;
- curseur lié à `index_id`/cerveau pour refuser un curseur d’un autre Index;
- **ne pas lier le curseur à la révision courante** si cela rend chaque nouvelle actualisation incapable de continuer une page d’historique ancienne : le journal est append-only et son curseur doit rester cohérent par identifiant d’événement;
- filtre par une ou plusieurs natures d’événement;
- total exact correspondant aux filtres;
- ordre stable, plus récent d’abord par défaut;
- aucun chemin absolu ou identité système dans le DTO.

Ajouter au rapport d’Actualiser/Reconstruire un **résumé borné de compteurs** par nature (`created/modified/renamed/moved/deleted/total`) pour amorcer le critère manuel de `P-18`, sans renvoyer la liste complète dans le rapport de build.

## F — UI V1 du journal

Ajouter une surface simple et intégrée à `MapApp`, sans refonte graphique :

- bouton/section « Changements »;
- liste paginée max 50;
- filtres visibles par nature, combinables et révocables;
- total exact;
- groupe/indication claire de la révision ou de l’actualisation où les événements ont été détectés;
- ancien/nouveau chemin **relatif** seulement lorsque utile;
- événement d’un nœud encore présent : action de sélection/focus via `BrainNodeRef` existant;
- événement `DELETED` : jamais tenter de sélectionner un nœud disparu; afficher l’information historique seulement;
- clavier/accessibilité au même niveau que les panneaux existants.

Ne pas construire ici les filtres de **carte** `nouveau/non vu` de `P-09`, ni « marquer vu », ni « tout marquer vu ». Cette tranche prépare leur source de vérité.

## G — Tests Rust obligatoires

Utiliser uniquement des arbres synthétiques générés par les tests.

Prouver au minimum :

1. migration produit schéma précédent → nouveau schéma via le chemin M-B, avec restauration si migration/validation échoue;
2. premier build => journal vide;
3. refresh inchangé => 0 événement;
4. création => exactement un `CREATED` attribué au nouvel ID;
5. suppression => exactement un `DELETED` sur l’ancien ID non recyclé;
6. modification observable => `MODIFIED` sans contenu lu;
7. renommage SYSTEM intra-volume => même ID + `RENAMED`, pas delete/create;
8. déplacement SYSTEM intra-volume => même ID + `MOVED`, pas delete/create;
9. dossier déplacé avec descendant : événement structurel sur le dossier, pas faux `MOVED` sur chaque descendant si leur parent canonique n’a pas changé;
10. rename/move non prouvable en PATH_FALLBACK => delete+create, jamais heuristique;
11. parent+nom changés dans une publication => représentation des deux natures sans chronologie inventée;
12. publication échouée => corpus, révision et journal précédents intacts;
13. échec d’écriture du journal => rollback de la publication entière;
14. historique survit au redémarrage/réouverture et à un rebuild;
15. pagination 50, total exact, filtre par nature, aucun doublon/perte entre pages;
16. curseur d’un autre cerveau/index refusé;
17. aucun absolute path/stable key/FileId/volume dans DTO sérialisés;
18. deux cerveaux sur la même racine conservent des journaux indépendants.

Les preuves rename/move qui exigent `FileIdInfo` doivent rester `#[cfg(windows)]`; compléter au niveau Index avec identités synthétiques contrôlées si nécessaire pour tester la logique sur toutes plateformes.

## H — WebView2 Windows

Réutiliser les harness existants et un `REAL_ROOT` entièrement généré par la preuve.

Scénario minimal :

1. premier index => journal vide;
2. créer un fichier, Actualiser => `CREATED`;
3. modifier une métadonnée observable de façon déterministe, Actualiser => `MODIFIED`;
4. renommer intra-volume, Actualiser => même nodeId + `RENAMED`;
5. déplacer intra-volume, Actualiser => même nodeId + `MOVED`;
6. supprimer, Actualiser => `DELETED`;
7. vérifier les compteurs de résumé à chaque étape;
8. filtrer le journal par nature et paginer sur un lot >50 généré synthétiquement;
9. redémarrage réel du processus => historique toujours présent;
10. 0 chemin absolu/clé stable/FileId/volume dans DOM, payloads exposés ou artefact;
11. 0 erreur console fatale.

L’artefact ne doit stocker que des noms/chemins **synthétiques relatifs**, IDs synthétiques, compteurs et booléens.

## I — Hors portée

- watcher `F-030`;
- `ReadDirectoryChangesExW` / notify;
- application incrémentale U-B `F-031`;
- réconciliation W-B/W-C;
- USN journal;
- filtres de carte nouveaux/non vus `F-022`;
- marquer vu / tout marquer vu `F-028`;
- FTS5;
- heuristique de move inter-volume;
- IA/RAG/GraphRAG;
- nouvelle base ou store parallèle;
- refonte graphique.

## J — Validation générale

Exécuter les tests ciblés puis :

- `cargo test --offline`;
- tests Windows réels rename/move;
- suite TypeScript complète;
- `pnpm check`;
- `pnpm build`;
- `cargo build --offline`;
- formatage limité aux fichiers touchés;
- `cargo clippy --all-targets --offline -- -D warnings`, en distinguant strictement dette historique et nouveaux diagnostics;
- `git diff --check`.

Aucune donnée personnelle. Aucun PR/merge/tag/release.

## Sortie attendue

À la fin :

- `TASK-0037 = IMPLEMENTED`, jamais auto-`VERIFIED`;
- ne pas créer TASK-0038;
- mettre à jour `CURRENT_STATE`, `HANDOFF`, `NEXT_ACTION`, `VALIDATION`, `CHANGELOG_AI`, `FEATURE_MATRIX` seulement pour refléter honnêtement `F-027`/`P-16`;
- `.orchestrator/RESULT.md` doit donner : schéma/migration, modèle d’événement, règles exactes de classification, atomicité, pagination/filtres, résumé manuel, tests Rust/TS/WebView2, limites;
- `NEXT_ACTION = contrôle indépendant de TASK-0037`;
- commit/push uniquement sur `build/v0.2-a21-v1-change-journal`, arbre propre.


## Clôture indépendante — ACTION-0061

TASK-0037 est **VERIFIED dans sa portée**. Le journal manuel, sa migration v5, l’atomicité, les cinq natures, la consultation bornée, l’UI et les preuves produit sont acceptés. Une porte de dépôt distincte reste obligatoire avant toute TASK-0038 : l’audit public-readiness du tree courant doit redevenir vert après suppression d’un ancien chemin local absolu hérité de TASK-0027. Cette réserve ne vient pas du code de TASK-0037 mais bloque la tranche suivante.
