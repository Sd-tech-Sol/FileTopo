# Action suivante

## Nouveau contrôle indépendant de TASK-0033, sur preuves de rejeu réel

`ACTION-0050` avait contrôlé `TASK-0033` : code cohérent avec `DEC-0034`,
mais **rejeu produit WebView2 obligatoire manquant**. Cette passe l'exécute
et corrige deux défauts qu'il a révélés. `TASK-0033` reste `IMPLEMENTED`,
**jamais auto-`VERIFIED`**. **Claude Code a exécuté la passe et ne peut donc
pas rendre le verdict.**

Ce qui a été fait cette fois :

- **Rejeu WebView2 réel exécuté**, sur une arborescence `REAL_ROOT`
  synthétique de 5 206 éléments, à 1366×768 puis 1920×1080. Preuve non
  canonique : `docs/performance/runs/TASK-0033-webview2.json`.
- **Défaut A, corrigé :** la vue ordinaire pouvait engloutir tout un arbre
  dans une seule branche arbitraire — `materialize_view` continuait à
  paginer récursivement les enfants du premier enfant rencontré au lieu de
  s'arrêter aux enfants directs du focus. Corrigé; verrouillé par un
  nouveau test Rust.
- **Défaut B, corrigé :** la caméra pouvait rester coincée hors du canevas
  visible quand `.map-view` grandissait après coup (panneau latéral rempli
  de façon asynchrone). Un effet dédié réapplique désormais `clampView` à
  chaque changement de dimensions du viewport.
- **Incohérence documentaire signalée par `ACTION-0050` corrigée** : c'est
  `readableView`, pas `fitView`, qui est utilisé à la première ouverture.

Action unique suivante : faire contrôler `TASK-0033` par une instance
**distincte de l'exécuteur**, sur les preuves de cette passe, et rendre un
verdict.

Ce que ce contrôle doit regarder en priorité :

- que le rejeu WebView2 est bien réel (processus WebView2, pas une
  simulation) et couvre effectivement les deux résolutions demandées;
- que la correction du défaut A n'a pas de portée plus large que
  « l'expansion automatique s'arrête aux enfants directs du focus » — aucun
  nouveau tri, aucune nouvelle architecture;
- que la correction du défaut B (`clampView` sur changement de viewport)
  reste un simple réajustement de bornes, jamais un recentrage déguisé;
- que les quatre tests Rust corrigés (`commands.rs`, `cross_commands.rs`,
  `relation_commands.rs`) testent toujours ce qu'ils prétendent tester,
  simplement via une navigation explicite plutôt que la vue par défaut;
- que rien dans cette passe n'a lu, listé ou touché une donnée personnelle.

Aucune tâche suivante n'est précréée.
