# Action suivante

## Nouveau contrôle indépendant de TASK-0036

`TASK-0036 — V1 Stable Identity Foundation` reste **IMPLEMENTED, pas VERIFIED** sur `build/v0.2-a20-v1-stable-identity`.

La passe corrective exigée par [`ACTION-0057`](../reviews/ACTION-0057-independent-control.md) est livrée. Les trois défauts bloquants et la réserve sont fermés :

1. **D1** — la migration `3 → 4` est maintenant atteignable par le cycle produit : `BrainIndex::open_existing_migrating` vérifie `brain_id` et le binding source avant toute mutation, refuse sans migrer sur tout désaccord, et `open_for_brain` y bascule seulement pour un fichier exactement en schéma `3`. `BrainIndex::open_existing` reste strictement v4-only, inchangée. `map_open` déclare toujours `sourceRead=false`.
2. **D2** — la migration `3 → 4` est maintenant une seule transaction (`Index::run_stable_identity_migration`), commise une fois; un échec injecté après mutation de schéma prouve un rollback complet vers le v3 original.
3. **D3** — `PATH_FALLBACK` est calculé depuis `path_codec::encode_path()` sur le chemin `Path` brut, jamais depuis `to_string_lossy()`; un test Windows prouve que deux chemins avec des surrogates isolés distincts, dont la projection lossy est identique, produisent des clés fallback distinctes.
4. **R1** — le rejeu WebView2 complet donne `copyStillSucceeds: true` avec preuve fraîche, pas seulement une citation de `TASK-0035 VERIFIED`.

Détail complet, preuves et validations : [VALIDATION.md section BN](VALIDATION.md), [HANDOFF.md](HANDOFF.md), [`.orchestrator/RESULT.md`](../../.orchestrator/RESULT.md).

Action unique : un contrôle indépendant de `TASK-0036`, par une instance distincte de l'exécuteur, sur les preuves de cette passe corrective. Ne créer aucune TASK-0037 et ne commencer ni journal, ni watcher, ni incrémental avant `TASK-0036 = VERIFIED`.
