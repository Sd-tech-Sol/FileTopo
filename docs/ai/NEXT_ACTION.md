# Action suivante

## TASK-0036 — passe corrective exigée par ACTION-0057

`TASK-0036 — V1 Stable Identity Foundation` reste **IMPLEMENTED, pas VERIFIED** sur `build/v0.2-a20-v1-stable-identity`.

Le contrôle indépendant [`ACTION-0057`](../reviews/ACTION-0057-independent-control.md) confirme le cœur I-E sur une base fraîche, mais bloque la fermeture sur trois défauts précis :

1. la migration `3 → 4` n'est pas atteignable par le cycle produit d'un cerveau déjà indexé, parce que `open_existing()` exige déjà le schéma 4 avant que le chemin de migration puisse être appelé;
2. la migration `3 → 4` n'est pas enveloppée dans une transaction atomique;
3. `PATH_FALLBACK` est calculé depuis `to_string_lossy()` plutôt que depuis le chemin relatif OS brut, malgré la primitive exacte `path_codec::encode_path()` déjà présente.

Action unique : exécuter la passe corrective décrite dans `.orchestrator/NEXT_PROMPT.md` **sur la même branche**, puis refaire un contrôle indépendant de TASK-0036. Ne créer aucune TASK-0037 et ne commencer ni journal, ni watcher, ni incrémental avant `TASK-0036 = VERIFIED`.
