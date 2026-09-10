# TASK-0031 — V1 Brain Lifecycle — Open / Refresh / Rebuild Separation

- Date : 2026-09-10
- Statut : `IMPLEMENTED` le 2026-09-10, sur preuves; gel APPROVED `3ac6cbf`; GO technique du NEXT_PROMPT à `2ad4a0f`, exécuté à la demande explicite de Sébastien.
- Exécuteurs : Codex (implémentation initiale), puis Claude Code (reprise, correction, preuves et clôture). Aucun VERIFIED auto-attribué.
- Branche : `build/v0.2-a15-v1-brain-lifecycle`.
- Décision : [DEC-0032](../decisions/DEC-0032-persistent-brain-lifecycle-contract.md).

## Préconditions

Arbre propre; base synchronisée `2ad4a0f`, enfant direct de `eda358b1294c1bd46344143fe945b83efd1d2cd2`.
L'écart est expliqué par le seul nouveau NEXT_PROMPT. TASK-0030/TASK-0029 VERIFIED,
ACTION-0047/ACTION-0046 CLOSED, DEC-0031 APPROVED. Identifiants et branche libres.
origin/main = `1a7d652ca48281c1687f6d1404c56a1404df91d8`; X5 = 36, gardes intactes.

## Audit minimal avant code

- `src/map/MapApp.tsx` : loadBrain appelle map_open avec rebuild booléen,
  puis map_view et map_integrity (ce dernier lit la source). applyComposition
  ouvre automatiquement les cerveaux manquants; le bouton rebuild utilise le booléen.
- `src/map/*Scenario.ts` et auto-vérification MapApp préparent leurs index par map_open.
  Ils devront demander explicitement préparation synthétique puis refresh/rebuild.
- `src-tauri/src/lib.rs` : map_open résout le cerveau et lance build_map sur worker.
- `map/commands.rs::build_map` matérialise la fixture, calcule son empreinte,
  ouvre/migre l'index, supprime un index incompatible AVANT scan, scanne,
  publie puis calcule l'empreinte finale. Ce chemin ne constitue pas une ouverture.
- `map/brain_index.rs` expose brain_id, build_complete, projection_contract,
  node_count, root_id, built_unix_ms, schema_version; Index porte index_id et
  index_revision. reconstructible_digest est calculé depuis les métadonnées indexées.
- `index.rs::open` initialise/migre : il faut une ouverture existante sans mutation.
  replace_nodes_with_metadata publie déjà corpus, métadonnées et révision dans
  une transaction; cette primitive suffit pour refresh et rebuild compatibles.
- Scanner, index canonique, projection bornée, layout et catalogue seront réutilisés.
  Aucun nouveau store. Les incompatibilités seront refusées, sans migration destructive.

## Périmètre écrit

Code autorisé : src-tauri/src/{lib.rs,index.rs,map/commands.rs,map/brain_index.rs,
map/mod.rs}, tests consommateurs sous src-tauri/src/map/ nécessitant adaptation,
src/map/{MapApp.tsx,types.ts,*Scenario.ts}, helper/tests lifecycle dédiés sous
src/map/, scripts/task0030-webview2.* et nouveaux scripts/task0031-* nécessaires
au rejeu. Lecture ciblée de leurs dépendances seulement. Scanner inchangé sauf
si une erreur de scan silencieuse impose un correctif ciblé et prouvé.
Documents : cette fiche, DEC-0032, les cinq documents ai obligatoires,
FEATURE_MATRIX si nécessaire, RESULT et nouveaux artefacts TASK-0031-*.
Métadonnées techniques minimales d'outillage autorisées; sorties temporaires
et profils dans le dépôt. Aucun graph/, preuve ancienne, garde X5 ou manifeste modifié.

## Contrat et critères gelés

DEC-0032 est normative. L1 : source renommée sous sandbox avec guard de restauration,
open + map_view réussissent, identité/révision/compte/digest inchangés.
L2 : NotBuilt sans source ni index créé. L3 : mutation fixture de test détectée
par refresh, publication atomique, identité conservée/révision avancée.
L4 : refresh échoué préserve intégralement l'ancien index. L5 : rebuild réussi
et échecs scan/indexation/validation conservent les invariants et l'ancien état.
L6 : actions UI explicitement map_open/map_refresh/map_rebuild, aucun booléen magique.
L7 : seul map_view alimente le rendu borné, aucun layout global ni second corpus.
L8 : deux cerveaux d'une même source restent isolés. L9 : empreinte avant/après
refresh/rebuild identique; aucune empreinte source dans open.

Préparation d'une fixture : opération synthétique distincte et explicitement
nommée, jamais dans open/refresh/rebuild. Les scénarios de preuve peuvent préparer
leur source avant refresh. L'UI permet cette préparation volontaire dans le sandbox.

Validation : Rust ciblé puis complet, TS ciblé puis complet, pnpm check/build,
cargo build --offline, fmt --check, clippy strict (dette historique déclarée,
aucun nouveau diagnostic), diff --check; rejeu réel WebView2 synthétique.

## Livraison attendue

Gel documentaire commité avant code, parent direct du premier commit de code.
Puis IN_PROGRESS et enfin IMPLEMENTED sur preuves; DEC-0032 reste APPROVED.
Push seulement sur la branche ci-dessus. Action finale unique : contrôle indépendant.
REAL_ROOT, picker, watcher, FTS5/P-08, F-046, renderer, refonte, réseau et tâches
suivantes interdits. F-042/F-046 PROPOSED; F-050/F-051 IMPLEMENTED; F-047 DEFERRED.
R-T30-3/-4/-6 et R8 maintenues. Aucun accès réel, aucune suppression opérationnelle.

## Livré — 2026-09-10

### Séparation réellement implémentée

`map_open` ouvre un index existant et rien d'autre : `open_map` appelle
`open_store`, qui passe désormais par `BrainIndex::open_existing`. Cette
ouverture emploie `SQLITE_OPEN_READ_ONLY` — sans `CREATE`, sans migration —
refuse un schéma différent de `MAP_SCHEMA_VERSION` par `IndexIncompatible`,
refuse un cerveau étranger par `BrainMismatch`, ne touche pas la source, ne
calcule aucune empreinte et n'avance pas la révision. `MapOpenReport` ne porte
que des faits d'ouverture : `state = OPENED_EXISTING`, `indexId`, `revision`,
`nodeCount`, `schemaVersion`, `sourceRead = false`, `indexReused = true`,
`freshness = UNKNOWN`. Aucun timestamp de fraîcheur n'est inventé.

`map_refresh` et `map_rebuild` passent par `publish_map`, sous un verrou de
publication. L'ordre est celui du contrat : refus d'un index incompatible
**avant** toute lecture de source; scan; refus si le scan porte un diagnostic,
si l'empreinte a bougé pendant le scan ou si l'appelant a annulé; puis
publication du corpus, des métadonnées et de la révision dans **une seule**
transaction `replace_nodes_with_metadata`. Un échec à n'importe laquelle de ces
étapes laisse l'index précédent intact et ouvrable : aucun fichier n'est
supprimé avant d'avoir un remplaçant valide. `remove_index_files` n'existe plus
dans le runtime, seulement sous `#[cfg(test)]`.

`prepare_synthetic_source` matérialise la fixture. C'est une commande distincte,
appelée explicitement par un geste ou un scénario de preuve, jamais un effet de
bord d'`open`, `refresh` ou `rebuild`. `build_map(paths, brain, rebuild)` reste
uniquement comme aide de test `#[cfg(test)]`; le booléen a disparu de l'API.

Côté interface, `runLifecycle` (`src/map/lifecycle.ts`) est le seul chemin :
Ouvrir n'invoque que `map_open`, Actualiser `map_refresh` puis `map_open`,
Reconstruire `map_rebuild` puis `map_open`. `loadBrain` n'appelle plus
`map_integrity`, qui lit la source. Une ouverture sans index affiche une
demande de construction explicite au lieu de scanner.

### Preuves

Tests Rust `src-tauri/src/map/lifecycle_tests.rs`, scanner et SQLite réels :

- **L1** — index construit, puis source renommée sous garde `Drop` : `map_open`
  et `map_view` réussissent, `indexId`, `revision`, compte et digest sont
  identiques avant et pendant l'indisponibilité, et la source est restaurée même
  en cas d'échec.
- **L2** — sans index, `map_open` rend `NotBuilt`; ni `paths.fixtures` ni
  `paths.brains` n'existent après, donc aucune source matérialisée et aucun
  index partiel.
- **L3** — un fichier ajouté à la fixture **par le test** est vu par
  `map_refresh`; `indexId` conservé, `revision` +1, empreintes avant/après
  identiques, `map_view` reflète le nouveau corpus borné.
- **L4/L5** — trois modes d'échec réels : annulation, `ABORT` SQL injecté par
  déclencheur après `DELETE` et insertion partielle, et validation refusée. Dans
  les trois cas l'erreur est explicite et l'état lisible est inchangé.
- **L7** — `runtime_source_guard_excludes_full_snapshot_and_global_layout`
  vérifie l'absence de `MapStore`, `all_nodes(` et `layout::compute(` dans la
  région runtime de `commands.rs`, la présence des trois entrées de cycle de vie
  dans `commands.rs` et `lib.rs`, et l'absence de tout `rebuild: bool`.
- **L8** — deux cerveaux sur la même fixture gardent deux fichiers, deux
  `indexId` et deux révisions; publier sur l'un ne change rien à l'autre.
- **L9** — empreinte avant/après identique sur refresh et rebuild; `open` n'en
  calcule aucune, ce qui est précisément le contrat.

Test TypeScript `src/map/lifecycle.test.ts` pour **L6** : chaque intention
n'émet que ses commandes nommées, un refus d'ouverture ne déclenche ni scan ni
préparation, les trois boutons `data-testid="lifecycle-*"` sont câblés sur leur
action, et aucun booléen `rebuild` ne subsiste dans `MapApp`.

### Corrections apportées à la reprise

Trois défauts de la première passe ont été corrigés avant clôture :

1. **Fins de ligne.** Plusieurs fichiers avaient été réécrits en CRLF contre
   `* text=auto eol=lf`. La garde L7 lit `commands.rs` par `include_str!` et
   découpe sur `"\n#[cfg(test)]\nmod tests"` : en CRLF le découpage ne
   correspondait plus, la garde inspectait le fichier entier, y voyait le
   `MapStore` du module de tests et échouait. Les fichiers sont normalisés.
2. **Garde L7 fragile.** Elle compare désormais en LF, et sa sentinelle est
   `fixture_summaries`, dernier élément runtime avant le module de tests, au
   lieu de `build_map`, passé sous `#[cfg(test)]` par cette tâche.
3. **Rejeu WebView2 impossible.** Le serveur de développement Vite surveillait
   `.filetopo-sandbox/` et gardait des poignées de répertoire Windows dessus :
   la preuve ne pouvait pas retirer sa propre source (`EPERM` au renommage), et
   toute écriture d'index rechargeait la page en pleine mesure. `vite.config.ts`
   exclut maintenant ce dossier de la surveillance, comme `src-tauri` l'était
   déjà. **Extension de périmètre assumée et déclarée** : réglage
   `server.watch` du serveur de développement seulement, sans effet sur le
   produit construit.

### Rejeu WebView2 réel

`scripts/task0031-webview2.ps1`, WebView2 **152.0.4191.66**, Tauri **2.11.5**,
SQLite **3.53.2**, catalogue synthétique neuf, 31 frappes réelles toutes
`isTrusted`, aucune erreur console fatale. Artefact
`docs/performance/runs/TASK-0031-webview2.json`, **non canonique**, hors X5.

`map_open` avant construction rend `map_not_built` sans créer index ni source.
Après préparation et actualisation explicites : Ouvrir laisse la révision à 1,
Actualiser la porte à 2, Reconstruire à 3, `indexId` inchangé aux trois étapes.
Source retirée du disque : Ouvrir réussit, `map_open` et `map_view` rendent
exactement les mêmes valeurs qu'avant, et un `map_refresh` échoue en annonçant
que le dernier index enregistré reste disponible. Projection bornée intacte :
6 001 nœuds indexés rendus par 256 nœuds et 1 agrégat, sous le budget de 512, le
DOM correspondant exactement à la page produit. `map_integrity` final ne trouve
aucun artefact FileTopo dans la source.

### Validations

Rust **295 PASS**, 0 échec, 5 ignorés. TypeScript **269 PASS**, 17 fichiers.
`pnpm check`, `pnpm build`, `cargo build --offline` et `git diff --check` verts.
`cargo fmt --check` : les fichiers touchés par cette tâche sont propres; la
dette de forme restante porte sur dix-sept fichiers non touchés.
`cargo clippy --all-targets --offline -- -D warnings` : **rouge, 26 erreurs**,
réserve `R-T30-1` inchangée. Le jeu de diagnostics est **identique avant et
après** cette tâche; aucun ne provient d'une ligne écrite ici, le seul
diagnostic dans `lib.rs` portant sur du code `unattended` non modifié.

### Limites

Aucune racine réelle, aucun sélecteur de dossier, aucune donnée personnelle.
Aucun watcher ni mise à jour incrémentale : `F-027`, `F-030` et `F-031` restent
`PROPOSED` et hors portée. Un index de schéma incompatible est refusé, jamais
migré ni remplacé : cette tranche ne porte pas de contrat de staging. Les
mesures WebView2 viennent d'un poste de développement et incluent des attentes
de stabilisation CDP; ce ne sont pas des latences de rendu. `R-T30-3`,
`R-T30-4`, `R-T30-6` et `R8` restent ouvertes. `R-T30-2` est **traitée dans sa
portée synthétique** et attend le contrôle indépendant.
