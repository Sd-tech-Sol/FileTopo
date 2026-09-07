# Action suivante

## Contrôle indépendant de TASK-0028

[`TASK-0028`](../tasks/TASK-0028-synthetic-scale-feasibility-spike.md) est
**`IMPLEMENTED`**, livrée par Claude Code sur la branche
`build/v0.2-a12-synthetic-scale-spike`. L'exécuteur **ne s'est pas attribué**
`VERIFIED`.

L'action unique suivante est le **contrôle indépendant de `TASK-0028` sur
preuves**, par une instance distincte de l'exécuteur. Les preuves sont
[`TASK-0028-SCALE-SPIKE-REPORT.md`](../performance/TASK-0028-SCALE-SPIKE-REPORT.md),
le protocole gelé avant le harness, et les quatre artefacts
`docs/performance/runs/TASK-0028-SS-*.json`.

Ces artefacts sont **non canoniques et non protégés**. `X5` reste à **36** :
c'est au contrôle indépendant, et à lui seul, de décider si l'un d'eux devient
canonique.

Après ce contrôle, l'orchestrateur décidera de l'implémentation du materializer
et du query engine borné, et d'un budget de vue candidat. **Ne créer ni
`DEC-0030` ni `TASK-0029` sans fiche approuvée et GO.**

`F-042`, `F-050` et `F-051` restent `PROPOSED` et non implémentées;
`MAX_NODES_PER_MAP = 5000` reste en vigueur; `F-046` reste `PROPOSED`;
`F-047` reste `DEFERRED`; Graphify reste `NOT INTEGRATED`; Forge reste
distinct; aucun renderer n'est choisi. `DEC-0013/F`, `X10` hors Windows et
`R8` demeurent entières. **1 000 000 physique reste non prouvé.**
