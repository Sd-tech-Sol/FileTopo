# Action suivante

## Corrective TASK-0055 après ACTION-0103

Branche : `build/v0.2-a39-v1-physical-identity-closure`.

Lire :
- `docs/reviews/ACTION-0103-task0055-independent-control.md`
- `.orchestrator/NEXT_PROMPT.md`

Agent : **Claude Code — Opus 5.5 — High**.

Si tu es encore dans la même session Claude qui vient de finir TASK-0055 :
**ne fais pas /clear**; utilise `/compact` seulement si nécessaire.

Instruction :

> Synchronise la branche en fast-forward seulement, puis lis et exécute
> intégralement `.orchestrator/NEXT_PROMPT.md`.

Deux corrections seulement :
1. retirer toute influence de stable_key/identity_provenance du digest public IPC;
2. faire refuser par le kernel une corrélation vers le mauvais alias d'un groupe SYSTEM partagé.

Pas de TASK-0056. À la fin, retour au contrôle indépendant.
