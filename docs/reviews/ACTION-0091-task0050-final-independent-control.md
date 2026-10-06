# ACTION-0091 — Contrôle indépendant final de TASK-0050

- **Date :** 2026-10-05
- **Statut :** `CLOSED — VERIFIED`
- **Tâche :** `TASK-0050 — V1 Runtime Legend / P-10 Closure`
- **Branche :** `build/v0.2-a34-v1-runtime-legend`
- **HEAD de preuve produit :** `8656d84f6f85f53b55e44f60452d0e3fe609f32c`
- **HEAD documentaire contrôlé :** `2e3bd9eccc1110b1dc5c046936db3d9a8df4b3ec`
- **Verdict :** `VERIFIED`

## Contrôle indépendant

Le second commit après le HEAD testé ne modifie que documentation et artefact;
aucun script ou code produit n'a changé après le run WebView2.

### Couverture réelle

Le harnais impose :

- légende = 24 clés uniques;
- exception unique = `node-diagnostic`;
- attendu runtime = 23 clés;
- égalité stricte `observed === expectedReachable`;
- aucune exemption `CELL_B_ONLY_KEYS`.

L'artefact courant porte exactement 23 clés `exercisedOnMap=true`; la seule
clé non exercée dans WebView2 est `node-diagnostic`.

### Corrective FILE-only

La cellule vérifie l'état filtre initial, active uniquement `FILE`, puis
prouve avant lecture des clés que les deux extrémités d'une relation
`APPROVED` et d'une suggestion pending coexistent réellement dans le DOM.

`intra-approved` et `intra-suggestion` sont ensuite rendues et capturées
par le même mécanisme de signature que les autres clés.

### Signatures visuelles

Pour chaque clé runtime exercée, le harnais :

- exige au moins une classe/primitive partagée carte ↔ légende;
- compare réellement `strokeWidth`, `strokeDasharray`, `fillOpacity`,
  `fontWeight` et `opacity`;
- échoue sur divergence.

Les deux familles qui bloquaient auparavant portent désormais une preuve
complète : suggestion pointillée + anneaux, approved avec motif dédié.

### node-diagnostic

L'exception est bornée et auto-invalide :

- test déterministe MapView doit PASS;
- l'invariant `commands.rs:745-749` est relu par le harnais;
- si le backend cesse de rejeter les diagnostics de scan, la garde échoue et
  l'exception doit être redérivée.

### Accessibilité / clavier / passivité

Artefact courant :

- axe fermé = 0 violation;
- axe ouvert = 0 violation;
- Enter et Space ouvrent la légende;
- parcours Tab sans piège;
- aucun backend command causé par les gestes de légende;
- source / Index / journal / resume inchangés;
- 0 erreur console fatale.

### Limite maintenue

Le redémarrage de l'application pour l'état ouvert/fermé de la légende reste
`NON TESTED` et appartient à `P-19`. TASK-0050 ne le revendique pas.

## Verdict

- `TASK-0050 = VERIFIED`
- `F-014 = VERIFIED`
- `P-10 = CLOSED / VERIFIED`
- `P-19` reste `PARTIELLE`
- aucune TASK-0051 n'est validée par ce contrôle à lui seul.
