# Action suivante

## Audit/orchestration de la tranche V1 suivante

`ACTION-0062` **R2 est fermée** : l'exception d'audit pour les noms d'utilisateur
synthétiques `quelquun` et `other` n'est plus globale, elle est limitée au fichier
exact où chacun est employé (`src-tauri/src/map/sandbox.rs`, `src-tauri/src/scale_spike/profile.rs`).
Ces noms restent détectés partout ailleurs (test négatif exécuté), et
`scripts/audit-public-readiness.ps1 -AllowRemotes` est vert. Le tree courant reste
assaini; l'historique Git n'a pas été réécrit.

`TASK-0037` reste `VERIFIED` (`ACTION-0061`).

Action unique : l'orchestrateur contrôle cette branche, puis audite l'état du
produit et cadre la **tranche V1 suivante** (candidats déjà nommés : watcher
`F-030`, application incrémentale `F-031`, filtres nouveau/non-vu `F-022`,
marquer vu `F-028`) et crée lui-même la fiche de tâche correspondante.

L'exécuteur ne précrée aucune `TASK-0038`.
