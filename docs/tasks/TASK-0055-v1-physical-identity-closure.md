# TASK-0055 — V1 Physical Object Identity / F-046 Closure

- **Date :** 2026-10-07
- **Date du correctif :** 2026-10-08 (voir §17)
- **Statut :** `IMPLEMENTED`, jamais auto-`VERIFIED`. Un premier contrôle
  indépendant (`ACTION-0103`) a rendu `REWORK REQUIRED`; les deux défauts sont
  corrigés en §17 et la tâche attend un **nouveau** contrôle. Détail :
  [`VALIDATION.md` sections DK, DL et DM](../ai/VALIDATION.md).
- **Branche :** `build/v0.2-a39-v1-physical-identity-closure`
- **Base :** `393ac6d190295d979b58c9a03cc4712391d93335`
- **Sélection :** ACTION-0102
- **Décision :** DEC-0052
- **Portée :** F-046 uniquement
- **Exécuteur prévu :** Claude Code
- **F-050/F-051/P-01/P-02/P-03 :** fermés, hors portée

## 1. Résultat unique attendu

Fermer F-046 en réutilisant :

- l'identité SYSTEM persistante de TASK-0036;
- la frontière Cloud Files de DEC-0035;
- SHA-256 de TASK-0023;
- l'explorateur exact de TASK-0026;
- le moteur de relations existant.

La tranche corrige le cas où plusieurs chemins légitimes partagent une identité
SYSTEM et expose une classification sûre. Elle ne construit aucun moteur de
similarité.

## 2. Audit reuse-first avant code

Lire et cartographier avant modification :

- `identity.rs`;
- `scanner.rs` / `scope.rs`;
- `index.rs::publish`, migrations et `apply_update_batch`;
- `reconcile.rs`;
- watcher W-B/W-C;
- rebase/rebuild;
- `content_signals.rs` exact duplicate;
- `ExactDuplicateExplorer.tsx`;
- TASK-0036/ACTION-0060;
- TASK-0023/ACTION-0039;
- TASK-0026/ACTION-0043.

Produire le tableau :
- EXISTE / RÉUTILISER;
- ADAPTER;
- MANQUANT.

Aucune nouvelle dépendance sans nécessité démontrée.

## 3. Migration schema 7

Implémenter DEC-0052 C dans l'Index actuel.

- version 6 → 7;
- index stable_key non unique;
- aucune ligne existante réécrite;
- stamp final atomique;
- dispatcher versionné;
- `MAP_SCHEMA_VERSION` cohérent;
- M-B complet;
- migration fraîche + v6 réel + rollback injecté;
- schéma futur/refus historique inchangés.

## 4. Remap SYSTEM group-aware

Remplacer l'hypothèse HashMap `stable_key -> id` par une logique de groupe.

Invariants :

- groupe 1↔1 : comportement historique inchangé;
- groupe SYSTEM multiple : chemin exact d'abord;
- jamais d'appariement ambigu d'alias;
- IDs neufs monotones pour nouvelles occurrences;
- PATH_FALLBACK dupliqué reste erreur;
- bijection node_id / identité d'entrée toujours contrôlée.

Ajouter des tests discriminants qui échouent sur le code actuel.

## 5. Tous les chemins de mutation

Auditer et corriger si nécessaire :

- full publish;
- refresh incrémental;
- watcher ciblé;
- W-C;
- exclusions/rebase;
- rebuild.

Une règle SYSTEM différente entre scan complet et incrémental est un bloqueur.

## 6. Backend de classification physique

Réutiliser les colonnes existantes `stable_key` /
`identity_provenance`.

Créer une primitive Rust interne sûre qui, pour un nœud/path d'un cerveau,
retourne seulement :

- `PROVEN_SHARED` + occurrenceCount >= 2;
- `PROVEN_SINGLE` + occurrenceCount = 1;
- `UNKNOWN` + count null.

Le compte est limité au cerveau courant.

La primitive ne retourne jamais la clé brute.

## 7. Intégration ExactDuplicateExplorer

Étendre le DTO de membre de groupe SHA-256 avec la classification sûre.

UI FR/EN :

- `PROVEN_SHARED` : « même objet physique — N chemins dans ce cerveau »;
- `PROVEN_SINGLE` : identité OS disponible, aucune autre occurrence du même
  objet dans ce cerveau;
- `UNKNOWN` : identité physique non prouvable.

Ajouter une explication compacte distinguant :

1. objet physique;
2. contenu identique;
3. copie probable — non inférée ici;
4. nom similaire — non inféré ici;
5. relation logique — indépendante.

Aucun FileId/volume/clé/empreinte machine dans le DTO ou le DOM.

## 8. Scénario Windows réel obligatoire

Dans une racine temporaire créée par le harness :

- créer `a.bin`;
- créer `b-hardlink.bin` avec un vrai hard link vers A;
- créer `c-copy.bin` par copie des octets;
- créer deux fichiers vides distincts.

Prouver :

- scan/index avec A+B réussit;
- A et B = deux nodeIds distincts;
- A/B = `PROVEN_SHARED`, même groupe physique interne;
- C = même SHA mais `PROVEN_SINGLE`/objet distinct;
- les deux vides = même SHA, objets distincts;
- aucune relation logique n'est créée automatiquement à cause du hash vide,
  du hard link ou de la copie;
- UI ne confond aucune catégorie;
- refresh puis redémarrage préservent le résultat.

Si l'API `std::fs::hard_link` suffit, la réutiliser; ne pas ajouter une
bibliothèque pour créer le hard link.

## 9. Régressions F-004

Rejouer explicitement :

- fichier SYSTEM simple renommé => même nodeId;
- fichier SYSTEM simple déplacé intra-volume => même nodeId;
- ajout d'un hard link : chemin original garde son nodeId via match exact;
- le nouveau lien obtient un id neuf;
- deux liens inchangés gardent chacun leur id;
- alias ambigu renommé n'est pas corrélé par heuristique.

Journal/seen ne doivent pas être attribués au mauvais alias.

## 10. Cloud / non-Windows / erreurs

- Cloud placeholder / ambigu : UNKNOWN;
- reparse/symlink : UNKNOWN / politique existante;
- identité Win32 indisponible : UNKNOWN;
- non-Windows : UNKNOWN;
- aucune erreur d'identité ne doit forcer une lecture/hydratation.

## 11. Falsifications minimales

Prouver effectivement que les gardes échouent si :

1. un doublon PATH_FALLBACK est accepté;
2. deux SYSTEM partagés sont rejetés comme collision;
3. un alias ambigu est apparié arbitrairement;
4. une copie byte-for-byte est dite « même objet physique »;
5. UNKNOWN devient PROVEN_SINGLE;
6. une clé SYSTEM brute fuit dans un DTO;
7. un FileId/volume apparaît dans DOM/log/artefact;
8. deux fichiers vides créent une relation logique;
9. la migration v6→v7 échoue après DROP INDEX et laisse un demi-schéma;
10. refresh/watcher réintroduit une collision de hard link.

## 12. Preuves / validation

Minimum :

- tests Rust ciblés identité/migration/index/reconcile;
- suite `cargo test --lib`;
- tests Windows réels `#[cfg(windows)]`;
- frontend ciblé + suite pertinente;
- `pnpm check`;
- `pnpm build`;
- Tauri debug;
- WebView2 Windows réel avec hardlink/copy/empty;
- axe sur l'explorateur;
- source fingerprint avant/après la **session FileTopo** (les créations de
  fixture se font avant le baseline);
- `git diff --check`;
- public-readiness;
- artefacts liés au HEAD testé.

Distinguer exécution locale, CI éventuelle et NOT_TESTED.

## 13. Gouvernance

À la fin :

- TASK-0055 = IMPLEMENTED / candidate seulement;
- F-046 = IMPLEMENTED / candidate seulement;
- aucune nouvelle fonction;
- aucun TASK-0056;
- NEXT_ACTION = contrôle indépendant;
- RESULT/HANDOFF/CURRENT_STATE/VALIDATION complets;
- commit + push;
- arbre propre.


## 14. Audit reuse-first — EXISTE / ADAPTER / MANQUANT

Écrit **avant** toute modification de code produit, à partir de la lecture de
`identity.rs`, `scanner.rs`, `scope.rs`, `index.rs`, `brain_index.rs`,
`reconcile.rs`, `incremental.rs`, `watch_ops.rs`, `content_signals.rs`,
`ExactDuplicateExplorer.tsx` et des fiches `TASK-0036/ACTION-0060`,
`TASK-0023/ACTION-0039`, `TASK-0026/ACTION-0043`.

| Élément | Constat | Décision |
|---|---|---|
| `GetFileInformationByHandleEx(FileIdInfo)`, couple volume + `FileId` 128 bits | **EXISTE** — `identity.rs::system_identity_key`, productionisé par `TASK-0036` | **RÉUTILISER** tel quel |
| Frontière Cloud Files `CfGetPlaceholderInfo` | **EXISTE** — `identity.rs::cloud_files_detection`, `DEC-0035` | **RÉUTILISER** tel quel |
| Colonnes `nodes.stable_key` / `identity_provenance` | **EXISTE** depuis le schéma 4 | **RÉUTILISER** — aucune colonne ajoutée |
| Compteur durable `next_node_id` | **EXISTE** — `index.rs::read_next_node_id` | **RÉUTILISER** |
| Enveloppe de migration `M-B` | **EXISTE** — `brain_index.rs::open_existing_migrating` | **RÉUTILISER** — un pas de plus dans le dispatcher versionné |
| Dispatcher versionné de migration | **EXISTE** — `index.rs::migrate_to_current_schema` | **ADAPTER** — un bras `6 => …` |
| Index SQL `idx_nodes_stable_key` **UNIQUE** | **EXISTE** — et c'est précisément le gap | **ADAPTER** — recréé non unique (`6 → 7`) |
| Remap `HashMap<stable_key, id>` dans `publish` | **EXISTE** — hypothèse « une clé, une ligne » | **ADAPTER** — groupes d'occurrences |
| `reconcile_full_scan` keyé par clé unique | **EXISTE** | **ADAPTER** — groupes, avec le flux conservé |
| Noyau `U-B` résolvant par `WHERE stable_key = ?1` | **EXISTE** | **ADAPTER** — vérifie l'appariement du producteur |
| `W-B` `stored_by_key` / `must_enter` | **EXISTE** | **ADAPTER** — par occurrence, image de groupe complétée |
| SHA-256 `sha256-v1`, campagnes datées | **EXISTE** — `TASK-0023`, `VERIFIED` | **RÉUTILISER** tel quel |
| Explorateur borné de contenus identiques | **EXISTE** — `TASK-0026`, `VERIFIED` | **ADAPTER** — deux champs de DTO, un bloc d'explication |
| Moteur de relations, suggestions | **EXISTE** | **NE PAS TOUCHER** — aucune relation produite ici |
| Résolution de racine `BrainSource` | **EXISTE** — scanner, refresh, watcher l'emploient | **ADAPTER** — `observe_content` l'emploie aussi |
| Primitive de classification physique sûre | **MANQUANT** | **CRÉER** — `index::physical_object_fact`, trois valeurs fermées |
| Règle d'appariement group-aware | **MANQUANT** | **CRÉER** — `identity::pair_group`, écrite **une seule fois** |
| `FILE_STANDARD_INFO.NumberOfLinks` | **MANQUANT** et **non ajouté** | La clé `SYSTEM` suffit, et le compte demandé est celui du cerveau, pas celui du volume |
| Seconde base, second store d'identité, moteur de similarité | **MANQUANT** et **non ajouté** | `DEC-0052` A et G l'interdisent |
| Nouvelle dépendance | aucune | `Cargo.toml` et `Cargo.lock` inchangés |

## 15. Résultat livré

- **Deux niveaux séparés.** `nodes.id` reste unique par occurrence; une clé
  `SYSTEM` identifie l'objet physique et peut être partagée. `PATH_FALLBACK`
  reste une clé d'occurrence, unique par corpus.
- **Schéma 7.** `DROP INDEX` puis `CREATE INDEX` non unique sur la même
  expression et le même prédicat partiel; aucune ligne réécrite; version
  estampillée en dernier dans la transaction du pas; contrat canonique v7
  (« index présent et non unique ») ajouté à l'étape 5 de `M-B`.
- **Une règle, quatre chemins.** `identity::pair_group` : groupe non ambigu
  (1 ↔ 1) = même id, donc `F-004` intact; groupe partagé = chemin relatif exact
  d'abord, alias restant jamais corrélé, nouvelle occurrence = id monotone neuf,
  occurrence stockée non appariée = disparition. Employée par la publication
  complète, `reconcile_full_scan`, le noyau `U-B` (par vérification) et `W-B`.
- **Noyau et watcher.** `ObservedNode::continues` porte l'appariement prouvé par
  le producteur; le noyau le vérifie (ligne existante, même clé, même provenance,
  jamais deux fois) et refuse une « nouvelle » occurrence qui écraserait une
  occurrence stockée. `W-B` complète l'image d'un groupe par une relecture
  ciblée, uniquement quand une occurrence observée n'a pas de correspondance
  exacte.
- **Surface produit.** Par membre d'un groupe SHA-256 :
  `PROVEN_SHARED` + compte d'occurrences du cerveau, `PROVEN_SINGLE` + 1, ou
  `UNKNOWN` + `null`. Les cinq notions de `DEC-0021` sont énoncées
  distinctement, en FR et EN, « copie probable » et « nom similaire » déclarées
  non inférées. Aucune clé, volume, `FileId` ou dérivé en IPC, DOM, log ou
  artefact.
- **Preuve Windows réelle.** `std::fs::hard_link` / `os.link`, fixture `a.bin` +
  hard link + copie octet pour octet + deux fichiers vides distincts, créée
  avant le baseline d'empreinte source. Deux processus WebView2 réels, même
  digest sémantique, axe 0 violation, source inchangée.
- **Validations :** Rust 894 PASS / 0 failed / 13 ignored; frontend 721 PASS;
  `pnpm check`, `pnpm build`, Tauri debug `--no-bundle`, audit public et
  `git diff --check` verts. Détail et limites : `VALIDATION.md` section DK.
- **Limites conservées :** aucun fournisseur Cloud Files réel; aucun hard link
  inter-volume; repli non-Windows `UNKNOWN` par construction non exercé; crash
  physique pendant `M-B` non testé; `W-B` prouvé sur deux topologies de groupe
  partagé, pas sur toutes; aucune CI distante.

## 16. Journal d'exécution

- 2026-10-07 — `IN_PROGRESS` : branche synchronisée en fast-forward
  (`7f86417`, base d'orchestration `393ac6d`), arbre propre, audit reuse-first
  §14 écrit avant toute modification de code produit.
- 2026-10-07 — `IMPLEMENTED` : `§3` à `§12` livrées. Discrimination des tests
  mesurée en réintroduisant temporairement la règle d'avant la tranche. `F-046` =
  `IMPLEMENTED` / candidate. Aucune `TASK-0056`.

## 17. Correctif après ACTION-0103 (2026-10-08)

Le contrôle indépendant `ACTION-0103` a rendu **`REWORK REQUIRED`** sur le HEAD
`831ba73` : le modèle central passait, mais deux défauts bloquaient le verdict.
Les deux sont corrigés ici, sans rien redessiner de `TASK-0055`.

### A — un dérivé de l'identité machine traversait l'IPC (`DEC-0052` F)

**Le défaut.** `BrainIndex::reconstructible_digest` sélectionnait
`n.stable_key` et `n.identity_provenance`, poussait les deux dans ses octets, et
la valeur `fnv1a64:` obtenue traversait l'IPC Tauri comme
`MapBuildReport.reconstructible_digest`, déclarée en TypeScript
`reconstructibleDigest`. `DEC-0052` F interdit la clé brute, le
`VolumeSerialNumber`, le `FileId` **et tout condensé ou encodage dérivé** : une
valeur publique était donc fonction de l'identité physique Windows des fichiers
analysés. Les tests de fuite de `TASK-0055` ne pouvaient pas le voir : ils
cherchent des graphies dans la charge sérialisée, et un digest n'en contient
aucune.

**Le correctif.** Les deux colonnes quittent l'entrée du digest, et aussi son
`ORDER BY`, où elles servaient de départage. Les lignes sont désormais ordonnées
par **tous** les champs digérés, donc le résultat est fonction du seul multi-
ensemble des lignes logiques — déterministe sans emprunter une identité pour
trancher. Le but `H7` est conservé sur des champs logiques et dérivés de la
source : chemin, parenté par le chemin relatif du parent, nom, nature,
profondeur, taille, horodatage, les deux drapeaux de substitut, le compte
d'enfants, le diagnostic d'accès. **Aucun digest d'identité de remplacement**
n'est publié, et `F-004` n'est pas affaibli : aucun chemin d'identité ne lit
cette fonction.

**Tests, tous trois en échec si les colonnes revenaient.**

1. le test discriminant demandé : le digest ne bouge pas quand seuls
   `stable_key` ou `identity_provenance` changent, y compris vers `NULL`, et il
   bouge quand un vrai champ reconstructible change (une taille, puis un chemin);
2. l'audit de fuite généralisé : **réétiqueter injectivement** chaque identité
   physique — ce qui laisse intacte la structure de partage, donc la
   classification fermée que `DEC-0052` G autorise — et exiger que chaque octet
   publié soit identique. Toute valeur dérivée par condensé, encodage ou ordre
   bouge là, alors qu'aucune graphie interdite n'apparaît jamais;
3. l'audit structurel, à l'échelle du dépôt : **quels fichiers de production
   peuvent lire de la matière d'identité** est épinglé au noyau privilégié
   (`identity`, `index`, `incremental`, `reconcile`, `scope`, `scanner`, plus
   deux lecteurs à réponse fermée). Un nouveau lecteur ailleurs échoue le test,
   et `brain_index.rs` ne doit plus jamais en être un.

**Et la preuve vivante**, parce qu'une recherche de graphies ne voit pas un
dérivé : dans la passe 1 du harnais WebView2, un fichier est remplacé par un
fichier identique octet pour octet, les deux horodatages — le sien et celui de
son dossier — étant **fixés** au même instant dans les deux états. Windows donne
au nouveau fichier son propre `FileId`, donc l'identité physique change
réellement, ce que le nouveau `nodeId` prouve, et
`reconstructibleDigest` ne doit pas bouger d'un bit. Mesuré : avec les colonnes
réintroduites et l'application reconstruite, le vrai WebView2 **échoue** cette
assertion.

### B — le noyau ne vérifiait pas l'alias d'un groupe partagé (`DEC-0052` D2)

**Le défaut.** Le noyau acceptait un `continues = Some(id)` du producteur dès
lors que la ligne existait, portait la même clé stable et la même provenance, et
n'était pas réclamée deux fois. Avec une clé `SYSTEM` partagée, ces contrôles ne
prouvent rien : l'alias `A` et l'alias `B` d'un même objet physique portent
exactement la même clé. Un producteur pouvait donc déplacer la ligne de
l'original sur un alias, et le noyau l'appliquait. Tous les producteurs du
produit emploient `pair_group` correctement : c'était un trou dans la défense,
pas un résultat faux sur le terrain — mais le noyau existe pour refuser un
mauvais producteur, pas pour lui faire confiance.

**Le correctif.** Dès que le groupe est **partagé**, une continuation doit être
l'occurrence stockée **au chemin relatif observé**. « Partagé » signifie soit
plusieurs occurrences stockées de cette clé, soit un lot qui observe cette clé
plus d'une fois — la seconde moitié compte, parce qu'un hard link tout neuf est
la deuxième observation d'une clé que l'Index ne détient encore qu'une fois, et
qu'il est sinon indiscernable d'un renommage de l'objet visé. `DEC-0052` D1 est
préservée exactement : une occurrence stockée observée une fois peut toujours
changer de chemin et garder son id, ce qui est `F-004`. **Aucune heuristique
ajoutée** : rien n'est inféré d'un nom, d'un ordre, d'une date ou d'une taille.
C'est une frontière de vérification, pas une seconde copie de la politique de
`pair_group`, et elle réutilise le `COUNT` indexé existant et la variante
`CorrelationMismatch` existante, dont le diagnostic reste fermé (un id, aucun
chemin, aucune clé).

**Tests, discrimination mesurée** — garde retirée : les deux refus échouent, les
deux acceptations passent toujours.

1. la falsification demandée : deux alias stockés d'un même objet `SYSTEM`, celui
   du chemin `B` prétendant continuer la ligne de `A` — refusé;
2. la moitié côté lot : l'Index détient la clé une fois, le lot l'observe deux
   fois, et une continuation vers un autre chemin est refusée;
3. la même observation correctement appariée est appliquée, donc un groupe
   partagé reste utilisable;
4. une occurrence `SYSTEM` seule se renomme toujours sans perdre son id, ce qui
   casserait si la garde était un « les chemins doivent correspondre » aveugle.

### Portée respectée

Inchangés : migration `6 → 7`, modèle SHA-256, sémantique de
`ExactDuplicateExplorer`, moteur de relations, politique Cloud Files,
dépendances (`Cargo.toml` et `Cargo.lock` intacts). Aucune `TASK-0056`.

### Revalidation

Rust **901 PASS / 0 failed / 13 ignored** (depuis 894 : 7 tests neufs);
frontend **721 PASS** (48 fichiers); `pnpm check`, `pnpm build`,
`pnpm tauri build --debug --no-bundle`, `git diff --check` verts; `clippy`
26 diagnostics, tous historiques, **aucun** dans les quatre fichiers touchés;
harnais WebView2 réel rejoué en **deux processus**, même digest sémantique
`22dfc466…`, axe-core 4.13.0 **0 violation**, 0 erreur console fatale, source
analysée inchangée. Artefact régénéré : `headTested e9c6747…`.

### Statut

`TASK-0055` et `F-046` restent **`IMPLEMENTED` / candidates**. L'exécuteur ne
s'attribue pas `VERIFIED` : le verdict appartient à un nouveau contrôle
indépendant.

- 2026-10-08 — correctif `ACTION-0103` A et B livré. Toujours `IMPLEMENTED`.
