# Action suivante

## TASK-0044 — V1 Per-Brain Resume State

`TASK-0043 — V1 Automatic Watcher & Reconciliation` est **VERIFIED dans sa
portée** par
[`ACTION-0072`](../reviews/ACTION-0072-task0043-final-control.md).

Le watcher, W-B/W-C, U-B et F-032 forment maintenant une chaîne automatique
contrôlée. Le prochain écart V1 est l'état utilisateur non reconstructible
encore seulement en mémoire de session.

Audit actuel :

- cerveau actif : déjà persistant;
- nom/couleur/icône : déjà persistants par cerveau;
- vu/non vu : déjà persistant par cerveau;
- caméra + sélection : session-only via `CompositionSessionMemory`;
- filtre : session-only via `useProjectionFilter`;
- panneau Détails : persisté globalement, pas par cerveau;
- langue/accessibilité : ne font pas partie de cette tranche.

La prochaine tranche est
[`TASK-0044 — V1 Per-Brain Resume State`](../tasks/TASK-0044-v1-per-brain-resume-state.md),
encadrée par
[`DEC-0042`](../decisions/DEC-0042-per-brain-resume-state.md).

Action unique : exécuter `.orchestrator/NEXT_PROMPT.md` sur
`build/v0.2-a28-v1-brain-resume-state`.

Aucune TASK-0045, aucun travail FR/EN/accessibilité et aucun PR/merge/tag/release
avant contrôle indépendant de TASK-0044.
