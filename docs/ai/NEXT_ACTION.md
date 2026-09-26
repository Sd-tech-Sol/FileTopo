# Action suivante

## Préparer TASK-0048 — V1 Safe Exclusion Policy

F-005 est la prochaine lacune P0 réelle après la réconciliation ACTION-0080.

Architecture retenue :
- aucune nouvelle base/store;
- politique brain-scoped dans le catalogue existant;
- sous-arbres relatifs exacts, sans glob;
- reparse/symlink toujours non suivi et non désactivable;
- scanner/refresh/rebuild/watcher utilisent la même politique;
- une modification de politique ne doit jamais être journalisée comme une suppression/création de source;
- aucun chemin absolu dans les DTO/logs publics.

Exécuteur suivant : Codex. Aucune TASK-0049 avant contrôle indépendant.
