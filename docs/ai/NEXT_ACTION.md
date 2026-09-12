# Action suivante

## Nouveau contrôle indépendant de TASK-0036

`TASK-0036 — V1 Stable Identity Foundation` reste **IMPLEMENTED, pas VERIFIED** sur `build/v0.2-a20-v1-stable-identity`.

Le recontrôle [`ACTION-0058`](../reviews/ACTION-0058-independent-recontrol.md) a accepté les corrections D1/D2/D3/R1 d'`ACTION-0057` sans régression, mais a trouvé une omission de la spécification orchestrée : [`DEC-0013`](../decisions/DEC-0013-post-risk-gate-technical-arbitration.md) restait normative sur deux points jamais cités par la fiche `TASK-0036` initiale — B (migration) et F (Cloud Files) — et n'a été supplantée sur F que par la nouvelle [`DEC-0035`](../decisions/DEC-0035-cloud-files-stable-identity-boundary.md). La passe corrective décrite par `.orchestrator/NEXT_PROMPT.md` ferme les deux défauts nommés D4 et D5 :

1. **D4** — la migration `3 → 4` applique maintenant `M-B` de `DEC-0013` B : quiescence (`PRAGMA wal_checkpoint(TRUNCATE)`), copie de sûreté de fichier en espace applicatif avant la première mutation de schéma v4, vérification indépendante de la copie, migration transactionnelle déjà acquise (D2), restauration complète si la migration échoue. Un verrou étroit par `brain_id` sérialise deux tentatives concurrentes sur le même fichier. Prouvé par un scénario combiné WAL-pending/échec injecté/restauration/nouvelle tentative, plus des refus dédiés sur checkpoint occupé et sur échec de copie — dans tous les cas, aucune copie trompeuse, aucune migration.
2. **D5** — un placeholder Cloud Files reconnu (`CfGetPlaceholderInfo`, détection seulement, `FILE_READ_ATTRIBUTES`) reste toujours `PATH_FALLBACK`, hydraté ou non, fermant `DEC-0013` F par `DEC-0035`. Aucune API d'hydratation/déshydratation n'est jamais appelée ni importée. Aucune fixture Cloud Files réelle n'a été fabriquée (risque de scope explicitement écarté par `ACTION-0058`); la frontière est prouvée par table de décision pure + appel Windows réel sur un fichier ordinaire + sources Microsoft.

Détail complet, preuves et validations : [VALIDATION.md section BO](VALIDATION.md), [HANDOFF.md](HANDOFF.md), [`.orchestrator/RESULT.md`](../../.orchestrator/RESULT.md).

Action unique : un contrôle indépendant de `TASK-0036`, par une instance distincte de l'exécuteur, sur les preuves de cette passe corrective. Ne créer aucune TASK-0037 et ne commencer ni journal, ni watcher, ni incrémental avant `TASK-0036 = VERIFIED`.
