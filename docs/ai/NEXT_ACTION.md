# Action suivante

## Contrôle indépendant de `TASK-0037`

`TASK-0037 — V1 Change Journal on Manual Refresh` est **`IMPLEMENTED`** sur
`build/v0.2-a21-v1-change-journal`. Elle n'est **pas** `VERIFIED` : l'exécuteur ne
s'attribue jamais cet état.

Une **instance distincte de l'exécuteur** contrôle la tâche sur preuves, en
relisant [`TASK-0037`](../tasks/TASK-0037-v1-change-journal.md),
`.orchestrator/RESULT.md`, [VALIDATION section BQ](VALIDATION.md) et le code
(`change_journal.rs`, `index.rs::publish`, `brain_index.rs`, `map/commands.rs`,
`ChangeJournalPanel.tsx`), et rejoue au minimum `cargo test --offline`,
`pnpm test` et le harnais `scripts/task0037-webview2.ps1`. Le contrôle doit
trancher explicitement les décisions listées dans le [HANDOFF](HANDOFF.md) (v3
reste migrable; `MODIFIED` sans horodatage de dossier; référence sans événement
après migration v3; seul le pipeline à identités journalise; curseur lié à
l'index).

**Hors portée de cette tranche, à ne pas ouvrir avant ce verdict :** watcher
`F-030`, application incrémentale `F-031`, réconciliation W-B/W-C, filtres de
carte nouveau/non vu `F-022`, marquer vu `F-028`, `TASK-0038`.
