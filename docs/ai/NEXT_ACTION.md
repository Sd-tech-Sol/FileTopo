# Action suivante

## TASK-0036 — V1 Stable Identity Foundation — READY

`TASK-0035` est **VERIFIED** par `ACTION-0056`. La branche courante dédiée est `build/v0.2-a20-v1-stable-identity`.

Action unique : exécuter `TASK-0036-v1-stable-identity.md` via `.orchestrator/NEXT_PROMPT.md`.

Cette tranche traite **F-004 — identifiants stables** avant le journal/watchers. Elle productionnalise `DEC-0009` I-E en réutilisant le spike B3 déjà vérifié : identité Windows `VolumeSerialNumber + FileId` lorsque disponible, fallback déterministe/versionné du chemin relatif + type sinon, heuristique jamais utilisée comme identité. Le même objet doit conserver son `nodes.id` lors d'un renommage/déplacement intra-volume prouvé.

Hors portée : journal de changements, watcher, mise à jour incrémentale, filtres, FTS5 et refonte graphique. Aucun TASK-0037 avant contrôle indépendant de TASK-0036.
