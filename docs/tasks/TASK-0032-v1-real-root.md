# TASK-0032 — V1 REAL_ROOT — Controlled Local Folder Onboarding

- Date : 2026-09-10
- Statut : `IMPLEMENTED` le 2026-09-10, sur preuves; **jamais auto-`VERIFIED`**. Gel `c3507bf`, parent direct du premier commit de code; GO technique du NEXT_PROMPT à `05fc371`.
- Exécuteur : Claude Code. Aucun `VERIFIED` auto-attribué.
- Branche : `build/v0.2-a16-v1-real-root`, créée depuis `05fc371`.
- Décision : [DEC-0033](../decisions/DEC-0033-real-root-privacy-and-source-binding.md).

## Portée

Introduire la première vraie source locale — un dossier choisi explicitement par
l'utilisateur — sans casser les garanties de `TASK-0030` et `TASK-0031`.

**Aucun cerveau personnel n'est utilisé.** Toutes les preuves portent sur des
arborescences de test créées par les tests eux-mêmes, dans des répertoires
temporaires, et détruites avec eux.

## Préconditions vérifiées avant écriture

Arbre propre, branche `build/v0.2-a15-v1-brain-lifecycle` synchronisée en
fast-forward vers `05fc371`. Le NEXT_PROMPT attendait `31bc4ac` : l'écart est
expliqué en entier par le seul commit `05fc371`, qui est le NEXT_PROMPT lui-même,
enfant direct de `31bc4ac`. Aucun changement local non poussé.

`ACTION-0048 = CLOSED`, verdict `TASK-0031 = VERIFIED` dans sa portée synthétique.
`TASK-0030 = VERIFIED`, `ACTION-0047 = CLOSED`, `TASK-0029 = VERIFIED`,
`DEC-0032 = APPROVED`. `origin/main = 1a7d652ca48281c1687f6d1404c56a1404df91d8`,
inchangé. `X5 = 36`, inchangé. `TASK-0032`, `DEC-0033` et
`build/v0.2-a16-v1-real-root` étaient libres.

## Audit minimal de réutilisation — avant code

- **`src-tauri/src/lib.rs::choose_collection`** — le sélecteur du prototype 0.1,
  `#[allow(dead_code)]`, non enregistré. Il montre la forme exacte à reprendre :
  `app.dialog().file().set_title(...).blocking_pick_folder()`, puis
  `into_path()`. Ce qui est repris est cette forme; ce qui n'est **pas** repris
  est sa suite, `registry.register(&root)`, qui écrit dans l'ancien `Registry`.
- **`src-tauri/src/registry.rs`** — `encode_path`/`decode_path`, BLOB UTF-16LE
  sous Windows. Sous les autres systèmes la version historique passait par
  `to_string_lossy()`, ce que `DEC-0033` C interdit pour persister une source.
  Les deux fonctions sont **extraites** dans un module partagé,
  `src-tauri/src/path_codec.rs`, la branche non-Windows corrigée en octets bruts
  d'`OsStr`; `registry.rs` délègue désormais au module au lieu d'en garder une
  copie. Le reste du `Registry` n'est pas touché : sa suppression, si elle reste
  nécessaire, sera une tranche distincte.
  `is_reparse_point` est extrait de la même façon, pour la validation de racine.
- **`src-tauri/src/map/brains.rs`** — `SourceKind` n'avait qu'une variante,
  `SyntheticFixture`; le schéma `brains` valait `1` et contraignait
  `source_kind IN ('SYNTHETIC_FIXTURE')`. `source_ref` ne porte **déjà** aucune
  contrainte `UNIQUE`, exactement ce que `DEC-0033` D exige : `brain-alpha` et
  `brain-gamma` partagent `quasi-empty` depuis `TASK-0018`. Rien à inventer là.
- **`tauri-plugin-dialog`** — déjà dans `Cargo.toml`, déjà importé dans
  `lib.rs`, mais **jamais initialisé** dans `run()` : la réserve `X2` l'interdisait
  et un test le vérifiait. Il manque `.plugin(tauri_plugin_dialog::init())` et la
  permission `dialog:allow-open` dans `capabilities/default.json`.
- **Le chemin `map_refresh -> scan_tree_controlled -> BrainIndex -> map_view`**
  existe et reste tel quel. `publish_map` refuse un index incompatible **avant**
  de lire la source, refuse un scan diagnostiqué, publie en une transaction et ne
  supprime jamais un index sans remplaçant. Rien de tout cela n'est réécrit.
- **Endroits par lesquels un chemin pourrait fuir** : `BrainRecord.source_ref`
  (opaque par construction pour un `REAL_ROOT`), `MapBuildReport.fixture_id`,
  `FixtureIntegrity`, `MapSelfCheck`, `MapError::Io` — dont le `Display` de
  `std::io::Error` **ne** contient pas le chemin, mais dont les appelants
  pourraient l'ajouter —, `hostLog()` côté frontend, et les artefacts
  `map_write_run_artifact`. Chacun est traité en §Build.
- **CSP et réseau** : `tauri.conf.json` fige
  `connect-src ipc: http://ipc.localhost` et rien d'autre. Aucune modification.

Aucun scanner, index, materializer, layout ni catalogue parallèle n'est recréé.

## Build — ce qui est écrit

### Catalogue

Schéma `2`. Migration transactionnelle et idempotente : reconstruction de la
table `brains` avec `source_kind IN ('SYNTHETIC_FIXTURE','REAL_ROOT')` et une
colonne `source_path BLOB` nullable, copie des lignes existantes, échange, dans
**une** transaction. `catalog_meta` — donc `active_brain_id` — n'est pas touché.
Aucune contrainte `UNIQUE` sur `source_path`.

`BrainRecord` gagne `source_label` et **ne gagne aucun champ de chemin**. Le
chemin se lit par `BrainCatalog::real_root_path(brain_id)`, qui rend un
`PathBuf` interne, jamais sérialisé.

`register_real_root` est la primitive interne testable : elle valide, canonicalise,
tire un `brain_id` et un `source_ref` opaques, écrit le BLOB, et **ne scanne rien**.

### Commande produit

`map_brain_choose_real_root()` — sans argument. Elle ouvre le sélecteur natif,
rend `null` sur annulation, appelle `register_real_root`, et rend un `BrainRecord`
sans chemin. Aucune commande acceptant un chemin n'est exposée.

### Résolution de source

`src-tauri/src/map/source.rs` : `BrainSource` résout `SYNTHETIC_FIXTURE` vers la
fixture contrôlée et `REAL_ROOT` vers le chemin lu dans le catalogue. `map_open`
ne l'appelle **pas** : ouvrir ne résout ni ne lit la source. `map_refresh` et
`map_rebuild` l'appellent et passent le **même** scanner existant.

`MapBuildReport.fixture_id` devient `source_kind` + `source_ref` + `source_label`,
pour ne pas faire dire « fixture » à une vraie racine. `fingerprintBefore` et
`fingerprintAfter` deviennent nullables, `null` pour un `REAL_ROOT`, avec
`readOnlyConfirmed = false` — voir `DEC-0033` F.

### MapApp

Un bouton **Ajouter un dossier**, l'entrée du nouveau cerveau dans la
composition, un état « non indexé » explicite, et le bouton **Indexer** existant
(`Actualiser`). Aucun redesign, aucune finition visuelle.

## Preuves

Le détail exécuté est en section `BB` de `docs/ai/VALIDATION.md`. En résumé :

- `RR1` à `RR8` en Rust, dans `src-tauri/src/map/real_root_tests.rs`, sur de
  vrais dossiers créés par les tests eux-mêmes, avec le scanner et SQLite
  réels : migration et migration échouée sans perte, enregistrement sans scan,
  refus sans effet, sentinelle de chemin absente de tout DTO et du fichier
  d'index, première indexation d'un arbre Unicode, ouverture avec la source
  déplacée, lecture seule octet pour octet, deux cerveaux sur un dossier,
  containment.
- `RR9` et `RR10` en gardes structurelles, dans `src/map/realRoot.test.ts` :
  CSP inchangée au caractère près, capacité limitée à `dialog:allow-open`,
  aucun réseau, dépendances inchangées, cycle `DEC-0032` intact.
- Le codec de chemin est prouvé séparément, y compris sur un chemin contenant
  un surrogate isolé que `to_string_lossy()` détruit.
- Rejeu **WebView2 152.0.4191.66** par `scripts/task0032-webview2.ps1`, sur un
  arbre de 1 209 entrées généré par la preuve. Artefact
  `docs/performance/runs/TASK-0032-webview2.json`, **non canonique**, hors
  `X5`. `absolutePathLeak = false`, y compris sur le fichier d'index et sur le
  journal de l'hôte.
- Rust **319 PASS**, TypeScript **279 PASS**, `pnpm check`, `pnpm build`,
  `cargo build --offline`, `git diff --check` verts. `cargo fmt --check` propre
  sur chaque ligne écrite ici. `cargo clippy` strict reste rouge à **26**
  erreurs, le même nombre qu'à l'entrée.

## Limites déclarées

Aucun cerveau personnel : toutes les arborescences analysées sont créées par
les preuves. Aucun watcher, aucune mise à jour incrémentale. Aucun FTS5.
Aucune identité physique `F-046`. Aucune acceptation de performance sur grande
racine réelle. Le dialogue natif lui-même n'est pas automatisé : sa
compilation, son enregistrement et sa primitive sont prouvés, son ouverture ne
l'est pas. La dette `Registry`/`legacy_store` n'est pas supprimée.

Un refus délibérément large est assumé : un index publié avant `DEC-0033` ne
porte aucun `source_ref` et est refusé en `map_source_mismatch`. Il n'est
jamais supprimé; une actualisation explicite le republie.
