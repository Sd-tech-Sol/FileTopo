# Action suivante

## Exécuter TASK-0034 — V1 Find & Open

`TASK-0033 — V1 Progressive Topographic UX` est **VERIFIED dans sa portée** par `docs/reviews/ACTION-0051-independent-recontrol.md`.

La branche de travail est désormais :

`build/v0.2-a18-v1-find-open`

La tâche est définie dans :

`docs/tasks/TASK-0034-v1-find-open.md`

Le prompt exécutable est prêt dans :

`.orchestrator/NEXT_PROMPT.md`

Objectif unique : raccorder les primitives déjà présentes au runtime convergé pour livrer une recherche locale bornée nom/chemin relatif, focaliser un résultat hors projection, puis permettre « Ouvrir dans l'Explorateur Windows » via `BrainNodeRef` seulement. Aucun ancien `Registry`, aucun chemin absolu IPC, aucun FTS5, aucun plugin shell/fs/opener frontend.

Exécuteur recommandé : **Claude Code — Sonnet 5, high effort**.

Après exécution : `TASK-0034 = IMPLEMENTED`, rapport dans `.orchestrator/RESULT.md`, puis contrôle indépendant par ChatGPT avant toute tâche suivante.