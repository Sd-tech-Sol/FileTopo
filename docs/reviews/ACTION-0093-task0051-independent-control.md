# ACTION-0093 — Contrôle indépendant de TASK-0051

- Date : 2026-10-05
- Statut : `CHANGES_REQUIRED`
- HEAD contrôlé : `6e725725ca4af11bd3369f6a4dd28875da61fb43`
- HEAD produit prouvé : `14a821d9cfc690ad4365fc7572bc455edc7144d4`

## Accepté

Atomicité intra/cross, rollback, DETERMINISTIC refusé, revoke->reapprove,
UI FR/EN, clavier réel, restart/rebuild/isolation, source/Index inchangés.

## Bloqueur

`relation_commands::revoke_relation` refuse explicitement une APPROVED liée à
une suggestion `core-rule-engine` lorsque `is_current == false`.

Cela contredit :
- P-04 / DEC-0049 : toute APPROVED humaine est révocable;
- DEC-0026 §D : les APPROVED humaines ne sont ni supprimées ni masquées par la
  fraîcheur du moteur.

Une APPROVED stockée porte `producer=human-approval` et reste visible; le
backend regarde toutefois le producer de la suggestion liée et refuse le geste.

## Corrective

Retirer seulement cette garde stale de revoke. Ne pas assouplir l'approbation
stale. Prouver avec DR15 : CURRENT -> approbation core -> STALE sans rerun ->
APPROVED visible -> revoke clavier PASS -> store pending, relation absente,
moteur toujours STALE, focus sûr -> rerun explicite ensuite.

Aucune TASK-0052.
