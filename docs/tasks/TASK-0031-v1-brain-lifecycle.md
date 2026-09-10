# TASK-0031 — V1 Brain Lifecycle — Open / Refresh / Rebuild Separation

- Date : 2026-09-10
- Statut : `APPROVED`; GO technique du NEXT_PROMPT à `2ad4a0f`, exécuté à la demande explicite de Sébastien.
- Exécuteur : Codex. Aucun VERIFIED auto-attribué.
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
