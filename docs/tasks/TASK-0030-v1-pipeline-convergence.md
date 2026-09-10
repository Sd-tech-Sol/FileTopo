# TASK-0030 — V1 Pipeline Convergence — Canonical Brain Index and Bounded Runtime Projection

- Date : 2026-09-09
- Statut : `IMPLEMENTED` — GO technique dans `.orchestrator/NEXT_PROMPT.md`, exécuté à la demande de Sébastien.
- Exécuteur : Codex; contrôle indépendant requis, jamais auto-attribué.
- Branche : `build/v0.2-a14-v1-pipeline-convergence`.
- Base : `896e2c39b955688e6a740427691be62255436a04`, parent `981e5fe262556208f118ebfc299e5c9333600c4e`.
- Décision : [DEC-0031](../decisions/DEC-0031-one-canonical-brain-index-and-bounded-projection.md).

## Préconditions et audit avant gel

Git propre, fast-forward effectué. TASK-0029 VERIFIED, ACTION-0046 CLOSED,
DEC-0030 APPROVED, X5 = 36 (`commands.rs`, déclaration de la liste protégée).
origin/main = `1a7d652ca48281c1687f6d1404c56a1404df91d8`.
Les identifiants TASK-0030 et DEC-0031 étaient libres. Branche créée et publiée
selon le prompt explicitement exécuté par Sébastien.

| Consommateur inspecté | Dépendance réelle | Migration nécessaire |
|---|---|---|
| `index.rs`, `hierarchy.rs` | `nodes`, identité/révision, enfants keyset, comptes directs | Réutiliser l'index et ses transactions |
| `map/store.rs` | Copie complète `map_nodes`, métadonnées, diagnostics, rectangles persistés | Retirer la copie et la persistance du layout |
| `map/commands.rs` build/snapshot/detail/self_check | Layout global avant publication, plafond 5000; self-check attend la totalité | Publier l'index puis matérialiser; distinguer contrôle corpus et vue |
| `map/brains.rs`, `map/sandbox.rs` | Catalogue séparé; chemin d'index isolé par cerveau | Préserver l'identité et l'isolation |
| `map/layout.rs` | Seulement un tableau de positions des parents | Réutiliser sur la projection |
| `map/content_signals.rs` | Campagne sur les fichiers; résolution doublons par SQL `map_nodes.relative_path`; préparation ED15 écrit MapStore | Migrer source canonique et résolution; aucun rectangle nécessaire au hash |
| `map/relation_commands.rs`, `map/rule_engine.rs` | Snapshot complet pour dériver/résoudre les clés `brain_id + relative_path`; digest pour fraîcheur | Séparer analyse corpus de projection; préserver toutes les relations |
| `map/cross_commands.rs`, `map/cross_relations.rs` | Résolution par cerveau, chemin, id; aucun rectangle nécessaire | Résoudre contre l'index, indépendamment de la présence dans la vue |
| `MapApp.tsx`, `MapView.tsx`, `types.ts` | Snapshot intégral; géométrie pour composition, gestes et arêtes; hiérarchie construite depuis nodes | DTO borné, navigation progressive, déclaration hors vue |
| Tests store/commands et scénarios frontend | Égalité snapshot/corpus, rectangles persistés, un layout par build; ED15 attend 1201 nœuds | Conserver les critères fonctionnels; remplacer explicitement les hypothèses rendues obsolètes par DEC-0031 |

## Périmètre écrit

Autorisé : `src-tauri/src/index.rs`, `src-tauri/src/hierarchy.rs`,
`src-tauri/src/lib.rs`, les modules et tests sous `src-tauri/src/map/`,
les composants, DTO, helpers et tests concernés sous `src/map/`;
nouveau materializer produit et tests de convergence dans ces mêmes répertoires.
Scripts de contrôle/preuve `scripts/task0030-*`, réutilisation en lecture des
scripts WebView2 et X5 existants; nouveaux artefacts
`docs/performance/runs/TASK-0030-*` seulement, non canoniques.
Lecture ciblée des manifests/configurations nécessaires aux builds et tests.
Métadonnées techniques minimales de l'outillage autorisées; temporaires,
profils WebView2 et sorties de tests exclusivement sous le dépôt.

Documents autorisés : cette fiche, DEC-0031, CURRENT_STATE, NEXT_ACTION,
HANDOFF, VALIDATION, CHANGELOG_AI, RESULT; architecture progressive,
FEATURE_MATRIX et parité seulement pour refléter les résultats réellement établis.
Interdits : graph/, preuves préexistantes, modification X5, données réelles,
racine personnelle, folder picker, streaming d'indexation, watcher, FTS5,
identité physique, nouveau renderer, nouvelle dépendance, cloud/LLM/MCP.
Ne pas supprimer un sandbox ou réécrire l'historique. Aucun main/PR/tag/release.

## Critères gelés avant code

1. Une table canonique `nodes` par cerveau, aucune nouvelle copie `map_nodes`.
2. Build read-only synthétique, publication sans layout global ni plafond 5000.
3. Projection produit de budget 512 entités, comprenant agrégats et nœuds;
   ancêtres, focus, enfants keyset, comptes exacts, arêtes réelles seulement.
4. Layout `layered-tree-cards-v1` sur cette projection seulement; frontière IPC
   bornée par défaut, garde automatisée contre le retour d'un snapshot intégral.
5. Test 100 000 indexés exacts par le cœur produit jusqu'au DTO sérialisé :
   budget, payload, comptabilité des omissions, existence et arêtes contrôlés.
6. Pagination sans doublon/omission, comptes directs exacts, curseur périmé
   refusé après rebuild, isolation de deux cerveaux.
7. Petites fixtures : gestes, détails, clavier, multi-cerveaux, relations,
   suggestions et doublons préservés; extrémités hors vue déclarées.
8. Empreinte source identique après build, projection, expansion, sélection,
   relations et doublons; aucun artefact applicatif sous la source.
9. Rust ciblé et `cargo test --lib`, `pnpm test`, `pnpm check`, `pnpm build`,
   `cargo build`, clippy avec dette antérieure distinguée, `git diff --check`.
10. Preuve Windows/WebView2 réelle petite fixture et grande projection si
    chargeable par le produit : DOM/SVG, arêtes, pan, zoom, sélection, erreurs
    fatales, version moteur. Aucune promesse machine modeste ou sans GPU.

## Livraison attendue

Après le commit de gel : `IN_PROGRESS`. Livraison complète : `IMPLEMENTED`,
jamais VERIFIED. F-050/F-051 ne changent que sur preuves; F-042 reste PROPOSED
sauf gestes effectivement exposés et testés; F-046 PROPOSED, F-047 DEFERRED.
X5 reste 36. Aucune TASK-0031/DEC-0032. Action suivante : contrôle indépendant
de TASK-0030. Tableau final de code supprimé/réutilisé/migré/temporaire requis.

## Résultat livré

Gel `APPROVED` commité en `0255bd1`, puis exécution `IN_PROGRESS`, livraison
`IMPLEMENTED`. Aucun VERIFIED auto-attribué. Les critères 1–10 ci-dessus sont
exécutés dans leur portée synthétique; clippy reste en échec sur dette antérieure
et n'est jamais déclaré PASS. Résultats détaillés : [VALIDATION AY](../ai/VALIDATION.md),
[rapport de checks](../performance/runs/TASK-0030-validation.json),
[WebView2](../performance/runs/TASK-0030-webview2.json),
[projection 100k](../performance/runs/TASK-0030-materialized-view-100k.json).

### Contrat effectivement livré

`BrainIndex` porte seulement les opérations/métadonnées de cerveau autour de
`Index`; il ne possède aucune table de nœuds supplémentaire. `schema_meta` et
`node_diagnostics` sont publiés avec `nodes` et sa révision. `map_view` est le
contrat principal; `map_snapshot` son alias borné pour les anciens scénarios.
`map_resolve_node` résout un chemin relatif dans l'index du cerveau pour la
navigation inter-cerveaux; il n'accède pas au système de fichiers.

Le budget de 512 réserve une place d'agrégat par nœud matériel : **256 nœuds
matériels maximum**; un arbre adversarial dont chaque nœud omet des enfants ne
peut pas dépasser 512 entités. Sur la fratrie plate 100k, 256 nœuds + 1 agrégat.
Le compte global absent vaut total indexé moins matérialisé. Chaque agrégat
compte seulement les enfants directs absents de **la page courante**, y compris
ceux des pages antérieures; ce n'est jamais un total récursif ni un compte
« restant à visiter ». Une dernière page propose de revenir à la première.

Les ancêtres au-delà des places matérielles sont refusés explicitement; les
fixtures produit restent sous profondeur 40. Pan/zoom/sélection ordinaires ne
recalculent pas le layout; focus/page en produisent un nouveau, borné. Les
petites fixtures historiques de 12 et 157 éléments restent complètes. Les
fixtures historiques plus grandes sont désormais projetées sous budget.

### Dette supprimée, réutilisée, migrée et temporaire

| Nature | Code et résultat |
|---|---|
| Retiré du produit | `MapStore`, table `map_nodes`, ses requêtes globales, rectangles persistés, plafond 5000 au build, layout sur le corpus |
| Réutilisé | `Index`, transactions SQLite, keyset/révision/child_count TASK-0029, scanner, catalogue isolé, `layered-tree-cards-v1`, composants de rendu et gestes |
| Migré | Build, vue/détails, campagnes de hash/ED15, SQL du résolveur de doublons, consommateurs de relations et règles; ils lisent tous l'index canonique |
| Temporaire | `BrainIndex::analysis_nodes` et `commands::AnalysisInput` non sérialisable : adaptent les moteurs existants qui attendent des métadonnées `MapNode`; rectangles à zéro inutilisés par ces moteurs, jamais rendus. Leur optimisation demanderait une tranche distincte; aucun cache durable ni second corpus |
| Historique test-only | `legacy_store.rs`, copie de l'ancien store et de ses tests pour fabriquer de vrais anciens schémas et vérifier leur reconstruction. Module `cfg(test)` privé, absent du binaire produit; aucune écriture runtime `map_nodes` |
| Alias transitoire | `map_snapshot` reste compilé pour les scénarios historiques, mais appelle exclusivement le même materializer borné que `map_view` |

Les changements de tests ne suppriment pas des fonctions : le contrôle d'un
layout au build est remplacé par l'interdiction de layout au build et le contrôle
de la géométrie de vue; la migration fabrique une vraie base ancienne plutôt
que de supposer que la nouvelle possède encore des colonnes de rectangles.
La garde source teste explicitement qu'elle a bien lu le corps runtime.

### Validations et limites

- Rust complet : **290 PASS**, **5 ignorés**. Ciblés projection : **5 PASS**;
  garde renforcée rejouée : **1 PASS**. TS complet : **264 PASS**.
- Typage, build web, build Rust : PASS. Clippy strict : FAIL sur dette préexistante;
  **24 extraits de diagnostic** retrouvés dans `896e2c3` (ancien store compris).
  Ce contrôle est une comparaison de sources, pas une réexécution de la baseline.
- WebView2 **152.0.4191.66**, 12 puis 6001 indexés : cardinalités et arêtes exactes,
  24 keydowns fiables, pan/zoom/sélection et page suivante exercés, aucune erreur
  fatale. Première tentative du pilote en timeout sur Entrée; rejeu neuf réussi
  après correction. Aucun artefact raté publié comme PASS.
- Pas de 100k physique, 1M produit, cible portable modeste, mode GPU désactivé,
  données personnelles ou exécution hors Windows. `R8`, `DEC-0013/F`, X10 restent
  entières. Les campagnes d'analyse ont encore un coût proportionnel au corpus.
- Trois nouveaux JSON TASK-0030 non canoniques, aucun scellement; **X5 reste 36**.
  Aucun artefact antérieur modifié. Aucun renderer, cloud/LLM/MCP, nouvelle tâche
  ou prochaine décision. F-042/F-046 PROPOSED, F-047 DEFERRED; F-050/F-051
  IMPLEMENTED dans cette tranche, pas VERIFIED.

**Action unique suivante : contrôle indépendant de TASK-0030.**
