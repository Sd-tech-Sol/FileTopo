# Action suivante

## Exécuter TASK-0047 — V1 Accessibility Closure

Branche : `build/v0.2-a31-v1-accessibility-closure`.

`TASK-0047` est **READY** sous `DEC-0045`. Objectif unique : fermer la
lacune accessibilité `F-036` / partie accessibilité de `P-21`, en conservant
les primitives existantes et en corrigeant seulement les violations mesurées.

Exécuteur recommandé : **Claude Code + Sonnet 5 — High effort**.

Le prompt autoritaire est `.orchestrator/NEXT_PROMPT.md`.

Reuse-first imposé : revalider puis, si conforme, utiliser uniquement
`axe-core@4.13.0` en devDependency exacte et localement dans le vrai WebView2.
Aucun MCP/service Axe distant. P-19 reste hors tranche. Aucune TASK-0048.
