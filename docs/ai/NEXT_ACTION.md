# Action suivante

## Reprendre TASK-0050 — fermer 23/23 en réutilisant le scénario J12

Branche : `build/v0.2-a34-v1-runtime-legend`.

ACTION-0088 établit que les deux clés manquantes du harnais composé
(`intra-approved`, `intra-suggestion`) sont déjà couvertes par la brique
WebView2 réelle `src/map/relationScenario.ts`.

Stratégie :

- cellule A : TASK-0050 actuel -> 21 clés réelles;
- cellule B : replay J12 sur le HEAD courant -> les deux familles intra;
- union A ∪ B -> exactement 23/23 clés atteignables;
- node-diagnostic reste l'exception ACTION-0087.

Ne pas instrumenter durablement MapApp et ne pas créer une nouvelle fixture
tant que J12 suffit.

**Exécuteur : Claude Code + Claude Sonnet 5 — Medium effort.**

Prompt autoritaire : `.orchestrator/NEXT_PROMPT.md`.

Aucune TASK-0051. Contrôle indépendant obligatoire après exécution.
