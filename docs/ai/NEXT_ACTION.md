# Action suivante

## Décider comment lever le dernier écart de TASK-0050 (21/23 clés atteignables reproductibles)

Branche : `build/v0.2-a34-v1-runtime-legend`.

TASK-0050 §Q (reprise Claude Code, 2026-09-28) a rendu le harnais WebView2
réellement reproductible et durci (jonction NTFS réelle pour
`node-skipped`, activation clavier correcte des pastilles d'agrégat,
révélation récursive par ancêtres, assertion stricte d'égalité 23 clés,
preuve `node-diagnostic` réellement exécutée, signatures calculées assertées
strictement). 21 des 23 clés atteignables se matérialisent de façon
répétable par de vrais gestes produit. `intra-approved` et
`intra-suggestion` résistent : leurs deux extrémités sont visibles à
l'écran mais l'arête ne se rend jamais — cause non confirmée, détail complet
dans `docs/tasks/TASK-0050-v1-runtime-legend-p10.md` section Q.2.

Aucun artefact `docs/performance/runs/TASK-0050-webview2.json` n'a été
republié : une preuve 21/23 ne satisfait pas ACTION-0087/DEC-0048 §K qui
exigent l'égalité stricte 23/23.

**TASK-0050 = `BLOCKED`.** Aucun changement Rust nécessaire ni autorisé.

Décision à prendre par l'orchestrateur technique ou Sébastien :

- (a) instrumenter `MapApp.tsx`/`composedScenario` pour observer
  `brain.relations`/`byId` en direct pendant la séquence de révélation, afin
  de confirmer si `intra-approved`/`intra-suggestion` sont un bug produit ou
  une limite de la technique d'automatisation choisie;
- (b) accepter un scénario de preuve différent (fixture synthétique dédiée,
  plus petite, où ces deux relations sont les seules arêtes du nœud choisi).

Aucune TASK-0051. Contrôle indépendant obligatoire après la prochaine passe.
