# Action suivante

## Exécuter TASK-0048 — V1 Safe Exclusion Policy

Branche : `build/v0.2-a32-v1-safe-exclusion-policy`.

F-005 est la prochaine lacune P0 réelle après ACTION-0080.

**Exécuteur : Codex + GPT-5.6 Sol — High effort.**

Architecture : politique brain-scoped/versionnée dans `catalog_meta`, règles de
sous-arbres relatifs exacts, aucune dépendance glob/ignore, même politique pour
scanner/refresh/rebuild/W-B/W-C/watcher, aucune fausse entrée de journal lors
d'un changement de politique.

Prompt autoritaire : `.orchestrator/NEXT_PROMPT.md`.

Aucune TASK-0049 avant contrôle indépendant.
