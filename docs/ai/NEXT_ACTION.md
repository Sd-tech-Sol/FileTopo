# Action suivante

## Exécuter TASK-0054

Branche : `build/v0.2-a38-v1-scale-closure`.

Tâche :
`docs/tasks/TASK-0054-v1-progressive-scale-closure.md`.

Prompt exécuteur :
`.orchestrator/NEXT_PROMPT.md`.

Objectif unique : rendre `F-050` et `F-051` candidates à une fermeture
globale indépendante par preuve du runtime V1 courant, sans réarchitecture.

Agent : **Claude Code — Claude Sonnet 5.5 — High**.

Avant l'exécution, un `/clear` est souhaitable : la tâche est autonome dans
GitHub.

Instruction à l'agent :

> Synchronise `build/v0.2-a38-v1-scale-closure` en fast-forward seulement,
> puis lis et exécute intégralement `.orchestrator/NEXT_PROMPT.md`.

À la fin : TASK-0054 doit rester `IMPLEMENTED / candidate`, jamais
auto-`VERIFIED`. L'action suivante redevient le contrôle indépendant ChatGPT.

`F-046` reste inchangée. Aucune TASK-0055.
