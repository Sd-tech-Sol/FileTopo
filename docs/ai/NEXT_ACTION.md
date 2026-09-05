# Action suivante

## Re-contrôle indépendant ciblé X11 de TASK-0024

`TASK-0024` reste **`IMPLEMENTED`**, jamais auto-attribuée `VERIFIED`, sur
`build/v0.2-a8-deterministic-relation-engine`. La correction demandée par
[`ACTION-0040`](../reviews/ACTION-0040-independent-control.md) est appliquée :
le périmètre legacy `TASK-0017` et le périmètre du moteur core sont découplés,
et `dre-v1` est prouvé générique sur `brain-beta` en vrai hôte WebView2.

Contrôler indépendamment la réserve `X11` : que `map_relation_engine_status`,
`map_relation_engine_run`, `map_relations_open`, `map_relations_for_node` et
`map_relations_approve` fonctionnent pour n'importe quel `BrainRecord` valide;
qu'aucune règle ni aucun seed legacy ne soit inventé hors `quasi-empty`; que
`self_check` reste limité à la fixture gelée et que `J12` soit intact; que la
preuve corrective `TASK-0024-X11-generic-brain-webview2.json` ne rejoigne pas
`X5`; et que les invariants `X5` = 29, `protectedDestinations = []`,
`writesUnderItsOwnTaskOnly = true` et `main = 91bbe90f` tiennent.

Claude ne ferme pas `X11`. Ne créer aucune `TASK-0025` et ne commencer aucune
nouvelle tranche avant ce verdict. `F-044`, `F-045` et `F-046` restent
`PROPOSED`; `DEC-0013/F` demeure bloquante pour l'identité physique
persistante.
