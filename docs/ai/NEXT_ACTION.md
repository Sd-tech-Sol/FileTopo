# Action suivante

## Corrective pass ACTION-0081 — TASK-0048

TASK-0048 reste **IMPLEMENTED, non VERIFIED**.

Le contrôle indépendant a trouvé un défaut d'isolation async dans
`ExclusionsPanel` : un `map_brain_exclusions_replace` démarré sur A peut
publier son retour dans le panneau B si le focus change avant la résolution.

Action unique : exécuter
`.orchestrator/NEXT_PROMPT.md` sur
`build/v0.2-a32-v1-safe-exclusion-policy`.

**Exécuteur : Codex + GPT-5.6 Sol — Medium effort.**

Aucun changement backend attendu. Aucune TASK-0049 avant nouveau contrôle.
