# Action suivante

## Contrôle indépendant de TASK-0044 — V1 Per-Brain Resume State

`TASK-0044 — V1 Per-Brain Resume State` est **`IMPLEMENTED`** sur
`build/v0.2-a28-v1-brain-resume-state` (commit de travail `00743fb`), jamais auto-`VERIFIED`.

Ce qui existe : un cerveau rouvre là où il a été laissé — branche, sélection, caméra, filtre logique et panneau
Détails — depuis **son propre** enregistrement versionné du catalogue, après une bascule et après un vrai
redémarrage; les identifiants sont validés contre l'Index courant du même cerveau; un match hors première page est
restauré sur une page reconstruite avec un curseur frais. Preuves : Rust 750, TypeScript 521, rejeu WebView2 réel
avec deux redémarrages réels et trois cerveaux ([VALIDATION CA](VALIDATION.md)).

Action unique : contrôle **indépendant, sur preuves,** de `TASK-0044` (instance distincte de l'exécuteur) — relire
`DEC-0042`, le code (`resume_state.rs`, `resumeState.ts`, `MapApp.tsx`), rejouer les tests et, si utile, la preuve
`scripts/task0044-webview2.ps1`.

`P-19` reste **partielle** : FR/EN, accessibilité, préférence de légende et persistance d'une composition
multi-cerveaux ne sont pas traités. Aucune TASK-0045 et aucun PR/merge/tag/release avant ce contrôle.
