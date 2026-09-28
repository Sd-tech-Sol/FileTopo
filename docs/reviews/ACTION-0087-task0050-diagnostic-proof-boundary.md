# ACTION-0087 — Contrôle indépendant du blocage node-diagnostic

- **Date :** 2026-09-28
- **Statut :** `CLOSED — frontière de preuve amendée`
- **Tâche :** `TASK-0050 — V1 Runtime Legend / P-10 Closure`
- **Branche :** `build/v0.2-a34-v1-runtime-legend`
- **HEAD contrôlé :** `fa429db6f2324269bfddd21b78be6b1f5eed9785`
- **Verdict :** blocage réel; **aucun changement Rust autorisé ou nécessaire**

## Contrôle indépendant

Le commit Claude est limité au frontend/docs. Aucun fichier Rust, backend ou
manifeste de dépendances n'a changé.

Le correctif `node-cross-linked` est conforme au rendu réel :
`.map-node--cross-linked rect` porte `stroke-width: 3` et
`stroke-dasharray: none`; les textes FR/EN disent maintenant
« contour plein épaissi / heavy solid outline ».

## Invariant node-diagnostic

Le blocage est confirmé dans le produit :

- `src-tauri/src/map/commands.rs:745-749` refuse la publication dès que
  `scan.diagnostics` n'est pas vide;
- le refus intervient avant la phase d'écriture de l'Index;
- la famille de tests `SCAN_INCOMPLETE` confirme que ce comportement est
  volontaire et protégé;
- aucun chemin de publication d'un Index portant un diagnostic n'est visible
  dans le backend actuel.

Conséquence : `node-diagnostic` existe comme sémantique défensive de MapView
et doit rester expliqué par la légende, mais il n'est pas matérialisable dans
un WebView2 réel alimenté par un Index publié tant que cet invariant reste vrai.

## Décision d'architecture

Ne pas modifier Rust pour fabriquer une preuve.

- les **23 clés runtime atteignables** doivent être exercées en WebView2 réel;
- `node-diagnostic` reste dans le contrat 24/24 et dans la légende;
- `node-diagnostic` est prouvé par le test de rendu déterministe de MapView
  + l'invariant backend;
- l'artefact doit déclarer l'exception
  `NOT_APPLICABLE_WHILE_SCAN_DIAGNOSTICS_ARE_REJECTED`;
- si le backend permet un jour de publier `accessDiagnostic != null`,
  l'exception expire et cette clé redevient obligatoire en WebView2 réel.

Ce n'est pas P-19.

## Suite

TASK-0050 redevient `CORRECTIVE_REQUIRED`. La prochaine passe doit rendre la
séquence 23/24 reproductible, imposer l'égalité des signatures visuelles
pertinentes pour les 23 clés atteignables et publier un nouvel artefact.

Aucune TASK-0051.
