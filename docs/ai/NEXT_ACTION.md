# Action suivante

## Contrôle indépendant de TASK-0036 — READY

`TASK-0036 — V1 Stable Identity Foundation` est livrée `IMPLEMENTED`,
**jamais auto-`VERIFIED`**, sur `build/v0.2-a20-v1-stable-identity`. Détail
complet : [`VALIDATION.md` section BM](VALIDATION.md).

Action unique : un contrôle indépendant, par une instance distincte de
l'exécuteur et sur preuves, de la productionisation de `DEC-0009` I-E —
identité Windows `SYSTEM` (`VolumeSerialNumber + FileId`) quand disponible,
repli déterministe/versionné du chemin relatif + type sinon, remap des
`nodes.id` à la publication, compteur monotone sans recyclage, migration de
schéma `3 → 4`. Preuves : Rust 392 PASS (365 + 27, dont 7 tests Windows
réels et 7 tests de pipeline réel complet), TypeScript 339 PASS inchangée,
rejeu WebView2 réel (`docs/performance/runs/TASK-0036-webview2.json`).

Hors portée, comme prévu par la fiche : journal de changements, watcher,
mise à jour incrémentale, filtres, FTS5, refonte graphique. Aucun
`TASK-0037` avant ce contrôle.
