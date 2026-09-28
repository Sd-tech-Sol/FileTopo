# Action suivante

## Exécuter la corrective pass de TASK-0050 — WebView2 exhaustif / exactitude de légende

Branche : `build/v0.2-a34-v1-runtime-legend`.

ACTION-0086 a contrôlé indépendamment TASK-0050 et refuse `VERIFIED` pour deux
écarts ciblés :

1. la preuve WebView2 réelle n'exerce que 12/24 clés sémantiques;
2. le texte `node-cross-linked` décrit un double contour absent du rendu réel.

**Exécuteur : Claude Code + Claude Sonnet 5 — Medium effort.**

La corrective doit rester frontend/harness uniquement, sans Rust/backend,
sans nouvelle dépendance, sans resume v2 et sans toucher P-19.

Prompt autoritaire : `.orchestrator/NEXT_PROMPT.md`.

Aucune TASK-0051. Après exécution, contrôle indépendant obligatoire de TASK-0050.
