# Action suivante

## Reprendre TASK-0050 — preuve finale 23 clés atteignables + exception diagnostic

Branche : `build/v0.2-a34-v1-runtime-legend`.

ACTION-0087 a confirmé que `node-diagnostic` ne peut pas être produit par un
Index publié sans changer l'invariant backend. **Aucun changement Rust n'est
autorisé.**

DEC-0048 est amendée :

- WebView2 réel : 23/23 clés runtime atteignables;
- légende/contrat : 24/24;
- `node-diagnostic` : test déterministe + invariant backend, exception
  explicite `NOT_APPLICABLE_WHILE_SCAN_DIAGNOSTICS_ARE_REJECTED`;
- computed signatures carte ↔ légende réellement assertées pour les 23 clés.

**Exécuteur : Claude Code + Claude Sonnet 5 — Medium effort.**

Prompt autoritaire : `.orchestrator/NEXT_PROMPT.md`.

Aucune TASK-0051. Contrôle indépendant obligatoire après exécution.
