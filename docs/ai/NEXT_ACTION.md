# Action suivante

## Reprendre TASK-0050 — fermer 23/23 avec la projection filtrée FILE-only

Branche : `build/v0.2-a34-v1-runtime-legend`.

ACTION-0090 a trouvé le défaut du harnais :

- `DEFAULT_FILTER.kinds=[]`;
- la cellule A clique DIRECTORY puis SKIPPED;
- elle obtient donc DIRECTORY+SKIPPED, pas FILE malgré son commentaire.

La projection filtrée peut matérialiser des fichiers de plusieurs branches
avec leurs ancêtres. Tester FILE-only sur `brain-alpha`.

**Exécuteur : Claude Code + Claude Sonnet 5 — Medium effort.**

Prompt autoritaire : `.orchestrator/NEXT_PROMPT.md`.

Aucun changement produit/Rust/backend/fixture. Aucune TASK-0051.
