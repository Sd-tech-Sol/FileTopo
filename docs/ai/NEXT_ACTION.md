# Action suivante

## Contrôle indépendant de TASK-0039

[`TASK-0039 — V1 Dynamic Filters`](../tasks/TASK-0039-v1-dynamic-filters.md) est
**IMPLEMENTED** sur `build/v0.2-a23-v1-dynamic-filters`, selon
[`DEC-0037`](../decisions/DEC-0037-dynamic-filtered-projection.md). Elle n'est **pas**
`VERIFIED` : l'exécuteur ne s'attribue jamais ce statut.

Action unique : **contrôle indépendant, sur preuves, de `TASK-0039`** par une instance
distincte de l'exécuteur — `.orchestrator/RESULT.md`, `docs/ai/VALIDATION.md` § BS,
`docs/performance/runs/TASK-0039-webview2.json`, puis le code (`node_filter.rs`,
`map/filtered_projection.rs`, `map/filter_tests.rs`, `FilterPanel.tsx`,
`useProjectionFilter.ts`).

Points à examiner en priorité :

- NEW / UNSEEN viennent du journal (`unseen_predicate`), jamais de `nodes.seen`;
- total exact et page bornée, curseur `ftf1` refusé hors index / révision / filtre;
- la projection sans filtre est inchangée (test d'égalité octet pour octet);
- un nœud de **contexte** peut satisfaire le filtre sans être compté deux fois;
- `ONLINE_ONLY` n'est prouvé qu'au niveau Rust.

Hors portée : watcher `F-030`, incrémental `F-031`, persistance `P-19` des filtres,
`TASK-0040`, PR, fusion, étiquette, release.
