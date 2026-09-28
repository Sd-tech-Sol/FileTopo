# ACTION-0086 — Contrôle indépendant de TASK-0050

- **Date :** 2026-09-28
- **Statut :** `CLOSED — corrective requise`
- **Tâche :** `TASK-0050 — V1 Runtime Legend / P-10 Closure`
- **Branche :** `build/v0.2-a34-v1-runtime-legend`
- **Base auditée :** `4b444052b8bfe9dabbe6b6f83aca62666f77717e`
- **HEAD contrôlé :** `d60c0c1962323d6b0afdf15d4117ae4ef57757ff`
- **Commit produit contrôlé :** `73390e0065113f1484202316871b2592020d41ec`
- **Verdict :** `CORRECTIVE_REQUIRED`

## Verdict

L'implémentation principale de la légende est saine, mais TASK-0050 ne peut
pas être `VERIFIED` sur les preuves alors présentes.

## Confirmé indépendamment

- aucun Rust/backend/package modifié;
- état session-only, resume v2 inchangé, P-19 séparée;
- bouton natif avec `aria-expanded`, `aria-controls`, panneau nommé;
- FR/EN;
- contrat TypeScript fermé de 24 clés;
- test riche déterministe matérialisant les 24 familles;
- gestes de légende sans commande backend;
- source / Index / journal / resume inchangés;
- axe sans nouvelle violation.

## Écarts

1. L'artefact WebView2 n'exerçait que 12/24 clés carte.
2. Le harnais prouvait seulement `observed map keys ⊆ legend keys`, pas
   l'exhaustivité du périmètre réel.
3. `sharedVisualLanguage` enregistrait des signatures sans en imposer
   l'égalité carte ↔ légende.
4. Plusieurs familles restaient `exercisedOnMap=false`.
5. Le texte `node-cross-linked` annonçait un double contour alors que le
   rendu réel est un contour plein épaissi unique.

## Décision

Corrective ciblée dans TASK-0050. Aucune TASK-0051. Aucun VERIFIED avant
nouveau contrôle indépendant.
