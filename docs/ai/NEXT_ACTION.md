# Action suivante

## Nouveau contrôle indépendant de TASK-0034 — sur les preuves de la passe corrective

`TASK-0034 — V1 Find & Open` reste `IMPLEMENTED`, **pas encore `VERIFIED`**.

Le contrôle indépendant `ACTION-0052` avait trouvé un défaut bloquant : une réponse de recherche asynchrone devenue obsolète pouvait remplacer la recherche courante — un changement de cerveau, une frappe rapide, un `Effacer` ou un changement de révision ne l'empêchaient pas tous, et le garde de révision d'`activateSearchHit()` ne couvrait pas deux requêtes/cerveaux différents à la même révision.

Une passe corrective a été exécutée sur la même branche `build/v0.2-a18-v1-find-open` : un module pur `src/map/searchCoordinator.ts` (`SearchCoordinator` + `runCoordinatedSearch()`) fait qu'une seule requête — la plus récente, vérifiée sur `brainId`/`query`/révision à la résolution — peut publier une page, une erreur ou `loading=false`. `MapApp.tsx::runSearch` délègue entièrement à cette primitive; le garde de révision existant à l'activation est conservé comme défense supplémentaire. Aucune surface IPC Rust, `Index::query_nodes()` ni frontière Explorer touchée.

Action unique suivante : nouveau contrôle indépendant de `TASK-0034`, par une instance distincte de l'exécuteur, sur les preuves de cette passe — 8 tests déterministes (`searchCoordinator.test.ts`, résolution inversée, changement de cerveau/`Effacer`/révision en vol) et le rejeu WebView2 complet sans régression. Détail dans [VALIDATION section BI](VALIDATION.md) et [`.orchestrator/RESULT.md`](../../.orchestrator/RESULT.md).

Aucune `TASK-0035` avant fermeture de ce verrou.
