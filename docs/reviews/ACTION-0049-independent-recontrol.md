# ACTION-0049 — Recontrôle indépendant de TASK-0032

- **Date :** 2026-09-10
- **Statut :** `CLOSED`
- **Tâche contrôlée :** [`TASK-0032`](../tasks/TASK-0032-v1-real-root.md)
- **Verdict :** `VERIFIED` dans la portée de TASK-0032
- **Exécuteur :** Claude Code
- **Autorité du verdict :** orchestrateur technique indépendant
- **Branche contrôlée :** `build/v0.2-a16-v1-real-root`
- **HEAD contrôlé :** `a2e1dfa78d09202da9021ce06c7d14b69b660870`
- **Passe corrective :** `cc0d46c`
- **Décision :** [`DEC-0033`](../decisions/DEC-0033-real-root-privacy-and-source-binding.md), `APPROVED`

## Verdict

> **PASS. TASK-0032 est VERIFIED dans sa portée.** Les deux défauts bloquants trouvés au premier contrôle sont corrigés sans élargir la frontière de confidentialité ni affaiblir le cycle de vie de l'index.

Ce verdict valide l'onboarding contrôlé d'un `REAL_ROOT`, le binding de source, l'ouverture sans rescan et la republication legacy synthétique étroite. Il **ne valide pas** encore l'UX finale, le watcher, l'incrémental, FTS5, les performances produit sur grande racine, ni la V1 complète.

## Contrôles indépendants

1. **Frontière WebView refermée.** `src-tauri/capabilities/default.json` contient `core:default` et aucune permission `dialog:*`, `fs:*`, `shell:*`, `opener:*` ou `http:*`. Le plugin de dialogue reste initialisé côté Rust seulement.
2. **Une seule porte REAL_ROOT.** `map_brain_choose_real_root(app)` ne reçoit aucun chemin, dossier, `Path` ou `PathBuf` du WebView. Le chemin est produit par `app.dialog().file().blocking_pick_folder()` côté hôte, puis passé à `register_real_root`. Le DTO retourné reste un `BrainRecord` sans chemin absolu.
3. **Commande réellement enregistrée.** `map_brain_choose_real_root` est dans le `generate_handler!` produit; l'ancien `choose_collection` reste conservé comme prototype mais absent du handler courant.
4. **Open exige le binding courant.** `open_store` vérifie la paire complète `source_kind + source_ref`. Une égalité du seul identifiant ne suffit pas.
5. **Republication distincte de l'ouverture.** `publish_map` appelle `check_publishable` avant `BrainSource::resolve`; un état incompatible est donc refusé avant résolution et lecture de source.
6. **Voie legacy étroite.** `check_publishable` accepte un index non bindé uniquement si le catalogue indique `SYNTHETIC_FIXTURE` et si le `fixture_id` historique correspond exactement au `source_ref`. `REAL_ROOT` ne peut jamais emprunter cette voie; `IndexBinding::Incoherent` est refusé.
7. **Preuves B1-B5 cohérentes avec le contrat.** Les tests construisent un index ramené aux douze clés de métadonnée de TASK-0031, prouvent le refus à l'ouverture sans mutation, la republication explicite avec `index_id` conservé et `revision +1`, la conservation byte-identique en cas d'échec, le refus d'un legacy sous `REAL_ROOT`, le refus des bindings divergents/demi-bindings et l'équivalence rebuild.
8. **RR1-RR10 non affaiblies selon les preuves d'exécuteur.** La passe corrective rapporte le cycle REAL_ROOT WebView2 inchangé et des suites complètes supérieures à la première livraison.
9. **Aucune donnée personnelle dans les preuves canoniques.** Les tests et le rejeu utilisent des arborescences générées/tempdir. Le contrôle n'introduit ni chemin privé, ni capture, ni contenu du cerveau réel dans Git.
10. **Portée du changement maîtrisée.** Aucun nouveau scanner, index, catalogue, renderer, réseau, cloud, LLM ou MCP. La correction reste sur la branche TASK-0032.

## Preuves d'exécuteur conservées comme telles

Claude Code rapporte : Rust **324 PASS**, TypeScript **280 PASS**, `pnpm check`, `pnpm build`, `cargo build --offline` et `git diff --check` verts; `cargo fmt --check` propre sur les lignes écrites par la passe. Le contrôle indépendant n'a pas réexécuté localement ces commandes et ne les présente donc pas comme ses propres exécutions.

Le rejeu WebView2 rapporté refuse les appels frontend directs à `plugin:dialog|open`/`save`, puis rejoue le cycle REAL_ROOT synthétique avec `absolutePathLeak = false`, source inchangée et aucune erreur console fatale.

`cargo clippy --all-targets --offline -- -D warnings` reste rouge à **26 diagnostics**, même dette qu'avant la passe; aucune promotion de cette dette n'est faite ici.

## Limites maintenues

- L'ouverture physique de la modale native par `app.dialog()` n'est pas automatisée. La compilation/enregistrement de la commande et l'absence de permission frontend sont contrôlés; la modale elle-même reste une vérification manuelle.
- Pas de watcher ni mise à jour incrémentale.
- Pas de FTS5 ni identité physique `F-046`.
- Pas d'acceptance laptop/performance finale sur grande racine.
- Dette `Registry` / `legacy_store` toujours présente selon sa portée déclarée.
- La qualité de visualisation d'un grand cerveau n'est pas couverte par TASK-0032; elle devient la prochaine tranche produit.

## Conclusion

`ACTION-0049 = CLOSED`; `TASK-0032 = VERIFIED` dans sa portée. La frontière REAL_ROOT est suffisamment contrôlée pour passer à la tranche UX suivante **sans changer l'architecture** : conserver Tauri + Rust + SQLite + React/TypeScript, l'Index canonique, REAL_ROOT et la projection bornée, puis faire converger le rendu vers la lisibilité du prototype historique.
