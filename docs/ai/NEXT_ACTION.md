# Action suivante

## Contrôle indépendant de TASK-0038

`TASK-0038 — V1 Journal-derived Seen/Unseen State` est **`IMPLEMENTED`** sur
`build/v0.2-a22-v1-seen-state`, jamais auto-`VERIFIED`.

Action unique : **contrôle indépendant de `TASK-0038`**, par une instance
distincte de l'exécuteur et **sur preuves** (Git, code, tests, artefact
`docs/performance/runs/TASK-0038-webview2.json`, `.orchestrator/RESULT.md`,
[VALIDATION section BR](VALIDATION.md)), selon
[`DEC-0036`](../decisions/DEC-0036-journal-derived-seen-state.md) et la fiche
[`TASK-0038`](../tasks/TASK-0038-v1-journal-seen-state.md).

Points à regarder en priorité : la baseline v5 → v6 (aucun faux « non vu »),
l'absence de toute lecture ou écriture de `nodes.seen` par le nouveau code, la
confirmation de « Tout marquer vu » (aucun appel au premier clic ni sur
« Annuler »), l'isolation par cerveau, et le choix déclaré de `unseenTotal`
non filtré.

Hors portée : filtres de carte `F-022`, watcher `F-030`, incrémental `F-031`,
toute `TASK-0039`, PR, fusion, étiquette, release.
