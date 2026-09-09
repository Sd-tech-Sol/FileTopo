# TASK-0030 — V1 Pipeline Convergence — Canonical Brain Index and Bounded Runtime Projection

- Date : 2026-09-09
- Statut : `APPROVED` — GO technique dans `.orchestrator/NEXT_PROMPT.md`, exécuté à la demande de Sébastien.
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
