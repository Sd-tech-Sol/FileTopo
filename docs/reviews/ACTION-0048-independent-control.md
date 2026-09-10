# ACTION-0048 — Contrôle indépendant de TASK-0031

- **Date :** 2026-09-10
- **Statut :** `CLOSED`
- **Tâche contrôlée :** [`TASK-0031`](../tasks/TASK-0031-v1-brain-lifecycle.md)
- **Verdict :** `VERIFIED` dans sa portée synthétique V1
- **Exécuteurs :** Codex puis Claude Code
- **Autorité du verdict :** orchestrateur technique indépendant
- **Branche :** `build/v0.2-a15-v1-brain-lifecycle`
- **Décision :** [`DEC-0032`](../decisions/DEC-0032-persistent-brain-lifecycle-contract.md), `APPROVED`

## Verdict

> **PASS. TASK-0031 est VERIFIED dans sa portée synthétique.** La frontière de cycle de vie est effectivement séparée : ouvrir réutilise l'index persistant sans scanner la source; actualiser et reconstruire sont des intentions explicites qui lisent la source; une publication échouée conserve le dernier index fiable ouvrable.

Ce verdict ne signifie pas que `REAL_ROOT`, le watcher, la mise à jour incrémentale, les performances V1 finales ou la V1 complète sont vérifiés.

## Contrôles indépendants

1. **Chaîne Git.** Le gel documentaire `3ac6cbf3dac590d64e21639fd34dff3dc540935a` est enfant direct du commit d'orchestration `2ad4a0f6730612c39441283fc48dcd3c800ed207` et parent direct du premier commit de code `de60ef155b46fa9213ac1fda582e1f09387beae2`. La branche est sans divergence par rapport à ce point de départ.
2. **Open sans source.** `map_open` appelle `open_map`; `open_store` ouvre l'index par `BrainIndex::open_existing(..., false)` avec `SQLITE_OPEN_READ_ONLY`. Ce chemin ne matérialise pas la fixture, ne scanne pas la source, ne calcule pas d'empreinte, ne migre pas, ne publie pas et ne supprime pas l'index. `index_id` et `revision` restent inchangés.
3. **Erreurs explicites.** Index absent : `NotBuilt`; schéma incompatible : `IndexIncompatible`; cerveau étranger : `BrainMismatch`. Aucun rebuild automatique.
4. **Refresh/Rebuild explicites.** `map_refresh` et `map_rebuild` sont deux commandes distinctes et passent par `publish_map`. Un index existant est validé avant lecture de source. Le scan est refusé s'il porte des diagnostics, si la source change pendant le scan ou si l'opération est annulée.
5. **Dernier état fiable.** La publication canonique utilise la transaction existante de remplacement. Les tests injectent un `ABORT` SQLite réel après `DELETE` et insertion partielle et vérifient que corpus, métadonnées, identité et révision reviennent à l'état précédent. Aucun fichier d'index n'est supprimé avant publication.
6. **Source indisponible.** Le test retire physiquement la fixture sous une garde `Drop`; `open_map`, `map_view` et les détails restent utilisables depuis l'index. Refresh/Rebuild échouent et le dernier index reste identique et ouvrable.
7. **Frontend.** `runLifecycle` encode trois intentions explicites : `open` -> `map_open`; `refresh` -> `map_refresh` puis `map_open`; `rebuild` -> `map_rebuild` puis `map_open`. Le booléen `rebuild` a disparu de l'API produit.
8. **Isolation.** Deux cerveaux partageant une même fixture gardent des index, identités et révisions séparés; publier l'un ne modifie pas l'autre.
9. **Projection bornée préservée.** La carte continue de passer par `map_view`; le rejeu WebView2 déclaré montre 6001 nœuds indexés -> 256 nœuds + 1 agrégat sous le budget 512.
10. **Pas de vraie donnée.** `SourceKind` reste limité à `SyntheticFixture`; aucun `REAL_ROOT` ni picker utilisateur n'est introduit.
11. **Portée du diff.** La tâche ajoute le cycle de vie, ses tests et preuves; l'extension `vite.config.ts` ne concerne que le watcher du serveur de développement et évite que `.filetopo-sandbox` soit observé pendant les preuves. Aucun nouveau renderer, cloud, LLM ou MCP.
12. **Main et preuves protégées.** `origin/main` reste `1a7d652ca48281c1687f6d1404c56a1404df91d8`. Le diff n'altère aucun artefact X5 antérieur; X5 reste 36. `TASK-0031-webview2.json` reste une preuve d'ingénierie non canonique.

## Preuves d'exécuteur conservées comme telles

Claude rapporte : Rust 295 PASS / 0 FAIL / 5 ignored; TypeScript 269 PASS; `pnpm check`, `pnpm build`, `cargo build --offline`, `git diff --check` verts; fichiers touchés conformes à `cargo fmt --check`. Le contrôle indépendant n'a pas réexécuté ces commandes dans un checkout local.

Le Clippy strict reste rouge à 26 diagnostics. L'exécuteur rapporte un ensemble identique avant/après TASK-0031 et aucun diagnostic provenant des lignes écrites par cette tâche. Cette dette reste ouverte pour la V1 publiable.

## Réserves après fermeture

- `R-T30-2` est **levée dans la portée synthétique** : ouvrir / actualiser / reconstruire sont désormais séparés.
- `R-T30-1` reste ouverte : Clippy strict.
- `R-T30-3` reste ouverte : certaines analyses matérialisent encore le corpus en mémoire.
- `R-T30-4` et `R8` restent ouvertes : acceptance produit/laptop/GPU désactivé non faite.
- `R-T30-5` reste ouverte : aucun `REAL_ROOT` ni donnée réelle encore.
- `R-T30-6` reste ouverte : dette `legacy_store` test-only.
- `F-027`, `F-030`, `F-031` restent `PROPOSED`; aucun watcher/incrémental dans cette tranche.
- `F-050` et `F-051` restent `IMPLEMENTED`, pas `VERIFIED` globalement.

## Conclusion

`ACTION-0048 = CLOSED`; `TASK-0031 = VERIFIED` dans sa portée synthétique. La prochaine tranche peut désormais préparer l'introduction contrôlée de `REAL_ROOT`, sans remettre en cause la séparation du cycle de vie.