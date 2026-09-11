# ACTION-0052 — Contrôle indépendant de TASK-0034

- Date : 2026-09-10
- Statut : `OPEN / RECONTROL REQUIRED`
- Tâche contrôlée : `TASK-0034 — V1 Find & Open`
- Branche : `build/v0.2-a18-v1-find-open`
- Livraison produit contrôlée : `d0f79ac` (résultat épinglé par `4eddcd8`)
- Exécuteur : Claude Code / Sonnet 5
- Autorité du verdict : orchestrateur ChatGPT indépendant de l'exécuteur
- Verdict : **PAS ENCORE VERIFIED**

## Ce qui passe au contrôle

La tranche est cohérente sur ses frontières principales :

1. `map_search_nodes` réutilise l'`Index::query_nodes()` canonique derrière `open_store()`, borne la page à 50, coupe une requête vide avant tout dump du corpus et publie `indexRevision`.
2. Les DTO `SearchPage` / `SearchHit` ne transportent que l'identité du cerveau/nœud, le nom, le chemin relatif et le type; aucun chemin absolu/root/source n'est ajouté.
3. `map_reveal_node` reçoit uniquement `BrainNodeRef`; `resolve_brain` puis `open_store` gardent l'appartenance/binding, le chemin relatif vient de l'Index et la racine réelle est résolue côté Rust.
4. `confine_indexed_target` marche chaque composante et refuse composante non normale, cible absente, symlink/reparse; `Skipped` et le drapeau `reparse_point` sont refusés avant ouverture.
5. `explorer.exe` est lancé directement, jamais via shell; dossier = chemin nu, fichier = `/select,<cible>`.
6. La capability WebView reste `core:default` uniquement; aucune permission `dialog:`, `fs:`, `shell:`, `opener:` ou `http:` n'a été ajoutée.
7. Les anciennes commandes 0.1 (`query_collection_nodes`, `mark_node_seen`, `reveal_indexed_node`) restent hors du handler produit.
8. Le rejeu WebView2 publié utilise un `REAL_ROOT` synthétique de 5 206 éléments : cible hors projection trouvée, activation vers une nouvelle projection, refresh 1→2, spawn Explorer réussi, aucune fuite de chemin absolu et 0 erreur console fatale.
9. Les résultats de tests sont des preuves de l'exécuteur, non réexécutées par l'orchestrateur : Rust 344 PASS, TypeScript 294 PASS, check/build verts; Clippy strict reste rouge à 26 erreurs préexistantes selon son rapport.

## Défaut bloquant trouvé au contrôle

### Réponse de recherche obsolète pouvant remplacer la recherche courante

`MapApp.tsx::runSearch()` lance un `invoke("map_search_nodes", ...)` puis applique directement `setSearchPage(page)` et `setSearchLoading(false)` sans ticket/génération de requête, sans annulation et sans vérifier que la réponse correspond encore au cerveau focalisé + requête + révision attendus.

L'effet relance bien la recherche sur `focusedBrainId`, `focusedBrainRevision` et `searchQuery`, et `activateSearchHit()` protège contre une **ancienne révision**. Mais cela ne protège pas contre :

- une réponse tardive de l'ancien cerveau après un changement de cerveau;
- une réponse tardive d'une ancienne requête après plusieurs frappes rapides;
- une réponse ancienne qui remet `searchLoading=false` alors qu'une recherche plus récente est encore en vol.

Deux pages de recherche peuvent avoir la même `indexRevision`; le garde de révision ne distingue donc pas ces cas. Une ancienne réponse peut alors être affichée sous le nouveau champ de recherche et, pour un ancien cerveau encore chargé dans la composition, être activée sans déclencher le garde de révision. Cela contredit la portée de TASK-0034 / `P-08` : la recherche active doit appartenir au cerveau actif/focalisé et à la requête courante.

Le rejeu WebView2 actuel ne falsifie pas ce cas : `Input.insertText` injecte la cible connue sans forcer deux requêtes concurrentes hors ordre, et aucun changement de cerveau n'est exercé pendant une recherche en vol.

## Correction exigée

Faire une passe corrective **sur TASK-0034, même branche**, sans nouvelle fonctionnalité :

1. ajouter un mécanisme monotone de requête (ticket/génération/ref) pour que seule la réponse de recherche la plus récente puisse modifier `searchPage` et `searchLoading`;
2. l'identité de la requête doit couvrir au minimum `brainId + query + offset` et être invalidée lors d'un changement de cerveau, de requête, de révision et d'un effacement;
3. au moment d'accepter une réponse, vérifier qu'elle correspond au cerveau/requête encore courants; conserver le garde de révision existant à l'activation comme défense supplémentaire;
4. ajouter un test déterministe avec deux promesses/invokes différés résolus **dans l'ordre inverse**, pour prouver qu'une réponse obsolète ne peut remplacer la plus récente;
5. couvrir aussi le changement de cerveau pendant une recherche en vol, ou une preuve équivalente montrant qu'un résultat du cerveau A ne peut réapparaître après passage au cerveau B;
6. rejouer les tests pertinents et le WebView2 existant pour éviter une régression de TASK-0034;
7. ne toucher ni à la surface IPC, ni au moteur de recherche Rust, ni à la frontière Explorer sauf défaut réellement découvert.

## Action unique suivante

Exécuter la passe corrective TASK-0034 décrite dans `.orchestrator/NEXT_PROMPT.md`, puis refaire un contrôle indépendant. Aucune `TASK-0035` avant fermeture de ce verrou.
