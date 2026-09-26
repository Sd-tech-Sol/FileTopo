# Action suivante

## Contrôle indépendant de TASK-0047 — V1 Accessibility Closure

Branche : `build/v0.2-a31-v1-accessibility-closure`.

`TASK-0047` est **IMPLEMENTED** (commit produit `ec22b07`), jamais auto-`VERIFIED`. Une instance distincte de
l'exécuteur doit se prononcer **sur preuves** : `docs/performance/runs/TASK-0047-webview2.json` (0 violation axe,
0 constat) et `TASK-0047-baseline-webview2.json` (16 violations, 212 constats avant corrections), VALIDATION CF,
la table « Corrections » de la fiche, et le code (`MapView.tsx`, `map.css`, `focusRestore.ts`, `CompositionBar.tsx`).

Si le contrôle passe : `TASK-0047` et `F-036` = `VERIFIED` dans leur portée, `P-21` = `CLOSED / VERIFIED` par composition
avec ACTION-0077, `P-19` reste `PARTIELLE`. Aucune TASK-0048 avant ce contrôle. Aucun PR / fusion / étiquette / release.
