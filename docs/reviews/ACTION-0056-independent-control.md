# ACTION-0056 — Contrôle indépendant de TASK-0035

- Date : 2026-09-11
- Statut : `CLOSED / VERIFIED`
- Tâche : `TASK-0035 — V1 Context Panel, Direct Children & Safe Copy`
- Branche contrôlée : `build/v0.2-a19-v1-context-panel`
- Livraison contrôlée : `62e13b8cd17d251b8f95f4253357da38457dc799`
- Exécuteur : Claude Code / Sonnet 5
- Autorité du verdict : orchestrateur ChatGPT indépendant
- Verdict : **TASK-0035 = VERIFIED dans sa portée**

## Contrôle indépendant

La lecture du diff et du code confirme les trois contrats de la tranche.

1. **Panneau contextuel.** La visibilité est une préférence non sensible stockée dans `catalog_meta`, défaut `true`, sans nouveau store ni migration. Le masquage retire seulement `DetailsPanel` du rendu; la sélection et les autres états restent dans `MapApp`. Les commandes IPC ne transportent qu'un booléen.
2. **Enfants directs.** `map_node_children` reçoit `BrainNodeRef`, ouvre le BrainIndex canonique et réutilise `Index::children_page()`. La page est bornée à 50. Le curseur hérite des contrôles index/révision/parent existants et `direct_child_count()` refuse un parent inexistant. `DetailsPanel` lit la page dédiée plutôt que `detail.children`; la navigation remplace la page courante et la pile de curseurs permet le retour sans accumuler le corpus dans le DOM.
3. **Copie sûre du chemin.** `map_copy_node_path` reçoit uniquement `BrainNodeRef`. Le chemin relatif vient de l'Index, la racine est résolue côté Rust et `resolve_confined_target()` est partagé avec l'ouverture Explorer. Le chemin absolu n'est jamais renvoyé au WebView; il est remis directement à l'API Rust du presse-papiers. La capability WebView reste `core:default`; aucune permission `clipboard-manager:*`, `shell:*`, `fs:*`, `opener:*` ou `dialog:*` n'est accordée.
4. **Architecture.** Aucun ancien Registry/commande 0.1 n'est réactivé, aucun SQL parallèle d'enfants n'est créé, et le moteur topographique n'est pas modifié.

## Preuves de l'exécuteur lues, sans les réattribuer à l'orchestrateur

Claude Code rapporte : Rust `365 PASS`, TypeScript `339 PASS`, `pnpm check`, `pnpm build`, `cargo build --offline` et `git diff --check` verts; Clippy strict conserve 26 diagnostics préexistants. Le rejeu réel Windows/Tauri/WebView2 utilise 5 206 éléments synthétiques, 4 356 enfants directs, trois lancements avec deux redémarrages réels, vérifie la persistance du panneau, l'aller-retour de pagination, la sélection d'un enfant hors projection, l'écriture réelle au presse-papiers et 0 erreur console fatale. L'artefact ne conserve jamais le chemin absolu.

## Dette hors portée

Ce verdict ne couvre pas : identité stable au renommage/déplacement, journal de changements, vu/non vu des changements, watcher/incrémental, filtres dynamiques, FTS5, préférences d'écran/icône ni acceptance laptop modeste.

## Verdict

**TASK-0035 est VERIFIED dans sa portée.** La prochaine dépendance structurante du MVP est l'identité stable avant le journal de changements : `DEC-0009` I-E et `DEC-0010` U-B rendent cette dépendance explicite, et le spike B3 existe déjà; il doit être réutilisé plutôt que refait.
