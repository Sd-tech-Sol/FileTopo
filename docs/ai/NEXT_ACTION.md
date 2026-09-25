# Action suivante

## Préparer TASK-0047 — V1 Accessibility Closure

`TASK-0046` et `F-035` sont **VERIFIED** par `ACTION-0077`.
`ACTION-0078` a audité `F-036` et choisi la tranche suivante.

Action unique : créer `DEC-0045`, `TASK-0047` et
`.orchestrator/NEXT_PROMPT.md` sur une nouvelle branche issue du HEAD de
review, puis faire exécuter **uniquement** la fermeture accessibilité de
`F-036` / partie accessibilité de `P-21`.

Architecture retenue : conserver les primitives ARIA/clavier/focus/reduced
motion existantes; ajouter au besoin `axe-core@4.13.0` en **devDependency
épinglée seulement**, injectée localement dans le vrai WebView2; aucun MCP ou
service Axe distant. Corriger seulement les violations réellement observées.

`P-19` reste PARTIELLE et hors tranche. Aucune persistance ou préférence
d'accessibilité nouvelle ne doit être inventée pour TASK-0047.
