# Action suivante

## Contrôle indépendant de TASK-0029

[`TASK-0029`](../tasks/TASK-0029-scale-query-foundation.md) est `IMPLEMENTED`
sur `build/v0.2-a13-scale-query-foundation`. L'exécuteur ne s'est pas attribué
`VERIFIED`.

L'action unique suivante est le **contrôle indépendant sur preuves**, par une
instance distincte de l'exécuteur. À contrôler :

- le gel documentaire avant tout code —
  [`DEC-0030`](../decisions/DEC-0030-bounded-hierarchy-query-contract.md) et la
  fiche, en un commit distinct et antérieur;
- les critères structurels de `DEC-0030 §E` : index utilisé pour `parent_id`
  **et** pour l'ordre, aucun `USE TEMP B-TREE FOR ORDER BY`, aucun balayage du
  corpus, aucun `OFFSET` de continuation — ils sont vérifiés par assertion
  pendant la campagne, donc rejouables;
- le critère d'ingénierie `p95` à 1M ≤ 5 × `p95` à 100k, page de 100, position
  comparable : verdict `PASS`, pire rapport **2,30**, calculé par la campagne
  elle-même dans
  [`TASK-0029-SQF-1m-index.json`](../performance/runs/TASK-0029-SQF-1m-index.json);
- le refus explicite d'un curseur périmé, étranger ou d'un autre parent, et
  l'avancée de révision atomique à la reconstruction;
- l'exactitude de `child_count`, auditée contre le `COUNT(*)` réel sur tout le
  corpus;
- la migration `user_version` 2 → 3 sans perte de `seen`, de nœud ni de
  métadonnée;
- l'absence de toute commande Tauri, de tout contrat IPC et de tout changement
  d'interface;
- `X5 = 36`, artefacts `TASK-0028` inchangés, `origin/main = 1a7d652c`.

Les deux artefacts `TASK-0029` restent **non canoniques et non protégés** tant
que ce contrôle n'a pas eu lieu, et portent la mention
`ENGINEERING_MEASUREMENT / NOT A PRODUCT CLAIM / NONCANONICAL UNTIL INDEPENDENT
CONTROL`. Ne créer ni `TASK-0030` ni `DEC-0031` sans fiche approuvée et GO.
