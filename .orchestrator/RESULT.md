TASK_ID: TASK-0028 — Synthetic Scale Feasibility Spike
AGENT: CLAUDE
RESULT: DONE
BRANCH: build/v0.2-a12-synthetic-scale-spike
FINAL_HEAD: <voir COMMIT>

SUMMARY:
- Protocole gelé et commité AVANT toute ligne de harness, en un commit distinct,
  pour qu'aucun critère ne puisse être ajusté après coup aux mesures.
- Harness de banc entièrement `#[cfg(test)]` sous `src-tauri/src/scale_spike/`.
  Empreinte produit nulle : aucune commande, aucune route, aucun élément
  d'interface; `cargo build` produit le même binaire sans avertissement nouveau.
  Deux ajouts hors du module, tous deux `#[cfg(test)]` : `mod scale_spike;` dans
  `lib.rs` et `Index::connection_for_bench()` dans `index.rs`.
- Le harness vit dans le crate parce que `domain`, `index`, `scanner` et `map`
  y sont privés, et que recopier le schéma était explicitement interdit.
- RÉSULTAT PRINCIPAL — à budget de vue fixe, ce qui serait rendu NE BOUGE PAS
  quand le corpus est multiplié par 100 : 1 024 entités, 1 023 arêtes, ~200 Ko
  de payload et ~0,25 ms de layout, identiques à 10k, 100k et 1M.
- Chaque élément non rendu reste COMPTÉ EXACTEMENT et ATTEIGNABLE dans les
  24 combinaisons budget × taille × focus, vérifié par deux méthodes
  indépendantes (CTE récursive SQLite et recensement Rust O(n)) qui doivent
  s'accorder sous peine d'échec du test.
- RÉSULTAT EXPLOITABLE — trois chemins coûtent le corpus ou le sous-arbre, pas
  le budget : recherche `P-08` linéaire (~67 ms p50 à 100k, ~0,67 s à 1M); page
  de 100 enfants directs à 106 ms à 1M, l'ordre d'affichage
  `kind = 'directory' DESC, name COLLATE NOCASE, id` n'utilisant pas
  `idx_nodes_parent`; compte exact des éléments d'un agrégat à 1,34 s à 1M.
  Contre-exemple utile : les ancêtres sont plats à 43 µs.
- `Index::replace_nodes` exige tout le corpus en mémoire — 335 Mo à 1M.
- Banc classé `DEVELOPMENT_BENCH_NOT_ACCEPTANCE` : aucune cible « machine
  modeste » n'est validée. Tous les temps Rust sont des temps `debug`.

SCALE_LEVELS:
- 10k physical: measured
- 100k physical: measured
- 1m index-scale: measured

STRUCTURAL_VERDICT:
- bounded-cardinality: PASS
- whole-graph-to-frontend: ABSENT (couche cœur) / NOT_PROVEN (bout-en-bout)
- exact-aggregate-counts: PASS
- modest-GPU-path: NOT_PROVEN

VALIDATIONS:
- cargo test --lib : 258 passés, 0 échec, 3 ignorés (les campagnes, par conception)
- cargo test --lib scale_spike : 29 passés, 0 échec
- pnpm test : 261 passés, 0 échec, 15 fichiers
- pnpm check : propre
- pnpm build : réussi, 61 modules
- cargo build : réussi; seul avertissement (`SUGGESTION_STATES`) préexistant et sans lien
- git diff --check : propre
- Campagnes SS1–SS6/SS9 : 3 réussies, 3 artefacts écrits
- Campagnes SS7/SS8 : 2 processus WebView2 réels (152.0.4191.66), fermés proprement
- X5 : empreintes des 36 preuves scellées relevées avant et après, identiques

IMPORTANT_FILES:
- docs/tasks/TASK-0028-synthetic-scale-feasibility-spike.md (IMPLEMENTED)
- docs/performance/TASK-0028-SCALE-SPIKE-PROTOCOL.md (gelé avant le harness)
- docs/performance/TASK-0028-SCALE-SPIKE-REPORT.md
- docs/performance/runs/TASK-0028-SS-10k.json
- docs/performance/runs/TASK-0028-SS-100k.json
- docs/performance/runs/TASK-0028-SS-1m-index.json
- docs/performance/runs/TASK-0028-SS-bounded-view-webview2.json
- src-tauri/src/scale_spike/{mod,generator,census,bounded,campaigns,profile,report}.rs
- src/map/boundedViewCardinality.test.tsx
- scripts/task0028-scale-spike.ps1
- scripts/task0028-ss7-bounded-view-webview2.ps1
- docs/ai/{CURRENT_STATE,NEXT_ACTION,HANDOFF,VALIDATION,CHANGELOG_AI}.md

COMMIT:
PUSHED: yes

LIMITS_OR_BLOCKERS:
- 1 000 000 PHYSIQUE NON PROUVÉ. Aucun million de fichiers créé ni parcouru.
  `INDEX-SCALE` ne dit rien du scanner à cette taille et n'est jamais appelé
  « scan 1M ».
- COMPOSITION BOUT-EN-BOUT NON TESTÉE. Relier l'index de banc au frontend
  exigerait une commande produit nouvelle, que le périmètre interdit. Les deux
  couches — vue bornée côté cœur, rendu borné côté WebView2 — sont prouvées
  SÉPARÉMENT. C'est aussi pourquoi l'absence de whole-graph payload n'est
  prouvée que sur la couche cœur.
- SS7 PARTIEL : les vues mesurées dans WebView2 réel comptent 12 et 157 entités,
  le bas de la plage 128–1024. Les budgets 256/512/1024 ne sont pas mesurés dans
  WebView2 — les cardinalités du runtime sont fixées par ses trois cerveaux
  gelés, et les changer serait une modification produit.
- SS8 NOT PROVEN : la désactivation du GPU par
  `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS` n'est pas confirmable depuis
  l'extérieur de la page. Aucune preuve n'a été fabriquée. Les deux passes
  donnent 4,2 contre 4,1 ms p50, compatible avec deux lectures opposées.
- SS4 voisinage relationnel NON MESURÉ : le store d'index `nodes` ne porte
  aucune relation. Rien n'a été simulé.
- TEMPS `debug` UNIQUEMENT : la suite de tests du crate ne compile pas en
  `--release` (auxiliaires de test derrière `#[cfg(debug_assertions)]`).
  Constat ANTÉRIEUR à cette tâche, reproduit harness retiré. Les temps publiés
  sont donc pessimistes; le verdict structurel porte sur des comptes, pas des
  durées.
- BANC HORS CLASSE D'ACCEPTATION : i9-9900K, 32 Gio, RTX 2070. Aucune cible
  « machine modeste » n'est validée par ces mesures.
- La cardinalité DOM/SVG exacte est mesurée sous jsdom, qui n'est pas un moteur
  de rendu : elle établit un compte, jamais un temps de rendu.
- OBSERVATION HORS PÉRIMÈTRE, non corrigée ici : des fiches antérieures
  (`TASK-0027`, section AS de `VALIDATION.md`) consignent le chemin local absolu
  `C:/Users/<utilisateur>/...`, ce qu'`AGENTS.md` interdit (« aucun chemin local
  personnel dans le dépôt »). `TASK-0028` n'en ajoute aucun — sa propre fiche
  décrit la racine sans la nommer. Le nettoyage des occurrences préexistantes
  appartient à l'orchestrateur, pas à cette tranche.

NEXT_ORCHESTRATOR_DECISION:
- independent control of TASK-0028; then decide materializer/query-engine
  implementation and candidate view budget
- quatre questions documentées attendent l'orchestrateur : l'ordre d'affichage
  et son index (§6.2 du rapport), la sémantique exacte des agrégats (§6.3),
  l'index de recherche avant toute promesse au-delà de 100 000 (§6.1), et
  l'indexation en flux plutôt que `&[NodeDto]` en un bloc (§4.1)
- artefacts NON CANONIQUES et NON PROTÉGÉS : X5 reste à 36, et c'est au contrôle
  indépendant seul de décider si l'un d'eux devient canonique
