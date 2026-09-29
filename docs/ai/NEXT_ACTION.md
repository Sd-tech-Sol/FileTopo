# Action suivante

## Reprendre TASK-0050 — réparer J12 pour la projection bornée actuelle

Branche : `build/v0.2-a34-v1-runtime-legend`.

ACTION-0089 a identifié le dernier blocage :

- J12 cherche encore son pivot dans `map_snapshot`, désormais borné;
- J12 reçoit le setter `setSelected` brut;
- le produit possède déjà `selectNode`, qui appelle `changeProjection` si
  le nœud est hors fenêtre;
- `map_resolve_node` résout déjà un chemin hors projection.

Corrective :

1. résoudre `PIVOT_PATH` avec `map_resolve_node`;
2. faire utiliser à J12 `selectNode` au lieu du setter brut;
3. attendre la matérialisation/sélection réelle;
4. rejouer cellule A + J12 + combineur;
5. publier TASK-0050-webview2.json seulement si union = 23/23.

**Exécuteur : Claude Code + Claude Sonnet 5 — Medium effort.**

Prompt autoritaire : `.orchestrator/NEXT_PROMPT.md`.

Aucun Rust/backend, aucune nouvelle fixture, aucune TASK-0051.
