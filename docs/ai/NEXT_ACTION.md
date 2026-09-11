# Action suivante

## TASK-0034 — passe corrective avant nouveau contrôle indépendant

`TASK-0034 — V1 Find & Open` reste `IMPLEMENTED`, **pas encore `VERIFIED`**.

Le contrôle indépendant `ACTION-0052` confirme que les frontières principales sont cohérentes : recherche bornée sur l'Index canonique, `map_reveal_node` limité à `BrainNodeRef`, aucune ancienne commande 0.1 réactivée, aucune permission filesystem/shell/dialog/opener ajoutée, et rejeu WebView2 sur 5 206 éléments synthétiques sans fuite de chemin absolu.

Le contrôle a toutefois trouvé un défaut bloquant côté frontend : `runSearch()` accepte toute réponse asynchrone dès qu'elle revient. Une réponse devenue obsolète peut donc remplacer la recherche courante après une nouvelle frappe, un changement de cerveau, un effacement ou un changement de révision. Le garde `indexRevision` à l'activation ne couvre pas deux requêtes ou cerveaux différents qui ont la même révision.

Action unique suivante : exécuter la passe corrective décrite dans `.orchestrator/NEXT_PROMPT.md` sur **la même branche** `build/v0.2-a18-v1-find-open`.

La correction doit rester étroite : coordination/ticket monotone des requêtes de recherche, invalidation sur cerveau/requête/révision/effacement, tests déterministes avec réponses résolues hors ordre, puis rejeu WebView2 TASK-0034. Ne pas modifier la surface IPC Rust, le moteur `Index::query_nodes()` ni la frontière Explorer sans défaut directement démontré.

Après cette passe, `TASK-0034` reste `IMPLEMENTED`, jamais auto-`VERIFIED`, et revient à l'orchestrateur pour un nouveau contrôle indépendant. Aucune `TASK-0035` avant fermeture de ce verrou.
