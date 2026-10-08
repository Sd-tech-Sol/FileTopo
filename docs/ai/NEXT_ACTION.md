# Action suivante

## Exécuter TASK-0055

Branche : `build/v0.2-a39-v1-physical-identity-closure`.

Tâche :
`docs/tasks/TASK-0055-v1-physical-identity-closure.md`.

Décision :
`docs/decisions/DEC-0052-node-vs-physical-identity.md`.

Prompt :
`.orchestrator/NEXT_PROMPT.md`.

Agent recommandé : **Claude Code — Claude Opus 5.5 — High**.

**Faire `/clear` avant la tâche.**

Instruction :

> Synchronise `build/v0.2-a39-v1-physical-identity-closure` en fast-forward
> seulement, puis lis et exécute intégralement `.orchestrator/NEXT_PROMPT.md`.

Objectif unique : fermer F-046 en corrigeant le modèle hard-link autour de la
clé SYSTEM existante et en exposant une classification physique sûre dans
l'explorateur de contenus identiques.

Pas de nouveau moteur de similarité, pas de nouvelle DB, pas de TASK-0056.

À la fin, TASK-0055/F-046 restent IMPLEMENTED/candidates; le contrôle
indépendant revient à ChatGPT.
