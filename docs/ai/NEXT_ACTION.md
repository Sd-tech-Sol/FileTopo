# Action suivante

## Exécuter TASK-0056 — Final V1 Parity Acceptance

Branche : `build/v0.2-a40-v1-final-parity-acceptance`.

Tâche :
`docs/tasks/TASK-0056-v1-final-parity-acceptance.md`.

Audit :
`docs/reviews/ACTION-0105-final-v1-audit-after-action0104.md`.

Prompt :
`.orchestrator/NEXT_PROMPT.md`.

Agent recommandé : **Claude Code — Claude Opus 5.5 — High**.

**Faire `/clear` avant cette tâche.**

Instruction :

> Synchronise `build/v0.2-a40-v1-final-parity-acceptance` en fast-forward
> seulement, puis lis et exécute intégralement `.orchestrator/NEXT_PROMPT.md`.

C'est une acceptance pure. Aucun fichier de code produit ne doit changer.

PASS => Stage A candidate CLOSED, puis contrôle indépendant ChatGPT.
FAIL => TASK-0056 BLOCKED, gap exact, aucune corrective dans la même tâche.

Aucune TASK-0057. Ne commence ni B, ni C, ni D.
