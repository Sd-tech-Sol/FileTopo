# NEXT_PROMPT — TASK-0034 corrective pass — stale search responses

**TARGET_AGENT:** CLAUDE CODE  
**RECOMMENDED_MODEL:** Sonnet 5, high effort  
**STATUS:** READY  
**OWNER:** orchestrateur ChatGPT  
**MODE:** correction ciblée + preuves  
**TASK:** `TASK-0034 — V1 Find & Open`  
**BRANCHE:** `build/v0.2-a18-v1-find-open`

## /goal

Corriger uniquement le défaut bloquant trouvé par `ACTION-0052` : une réponse asynchrone de recherche devenue obsolète peut encore remplacer la recherche courante dans `MapApp.tsx`. Ne crée aucune nouvelle fonctionnalité et ne change pas l'architecture de TASK-0034.

`TASK-0034` reste `IMPLEMENTED`, jamais auto-`VERIFIED`. Après cette passe, le verdict appartient à l'orchestrateur indépendant.

## 0 — Préconditions

1. Lire `AGENTS.md`, `CLAUDE.md`, `docs/reviews/ACTION-0052-independent-control.md`, `docs/tasks/TASK-0034-v1-find-open.md`, `docs/ai/NEXT_ACTION.md` et `.orchestrator/RESULT.md`.
2. Basculer explicitement sur `build/v0.2-a18-v1-find-open`.
3. `git fetch origin`, fast-forward uniquement; arbre propre avant écriture.
4. HEAD doit contenir `ACTION-0052`. Divergence inexpliquée => `BLOCKED`.
5. Ne modifier ni la surface IPC Rust, ni `Index::query_nodes`, ni la logique Explorer, sauf si une preuve montre un défaut directement causé par la correction.

## 1 — Défaut à corriger

Aujourd'hui `runSearch(brainId, query, offset)` fait un `invoke("map_search_nodes", ...)` puis applique directement la réponse avec `setSearchPage(page)` et termine par `setSearchLoading(false)`.

Une ancienne requête peut donc finir après une nouvelle et écraser l'état courant. Le garde `indexRevision` d'`activateSearchHit()` protège une ancienne **révision**, mais pas une ancienne requête ou un ancien cerveau à la même révision.

Cas à rendre impossibles :

- taper rapidement A puis AB : la réponse A arrive après AB et remplace AB;
- changer du cerveau A au cerveau B pendant une recherche : une réponse tardive de A réapparaît dans B;
- effacer le champ pendant une requête : sa réponse ne doit pas repopuler les résultats;
- une ancienne requête ne doit pas remettre `searchLoading=false` pendant qu'une plus récente est encore active;
- refresh/rebuild : seule une recherche correspondant à la révision courante peut être publiée.

## 2 — Correction minimale attendue

Utiliser un mécanisme monotone de génération/ticket/ref, sur le même principe que `projectionRequest` déjà présent si cela s'intègre proprement.

Exigences :

1. chaque lancement de recherche obtient une identité/génération unique;
2. seule la recherche la plus récente peut publier `searchPage`, une erreur ou `searchLoading=false`;
3. changement de cerveau, requête, révision ou `Effacer` invalide immédiatement toute requête précédente;
4. au retour, vérifier au minimum que la réponse appartient encore au `brainId` et à la requête attendus; vérifier la révision lorsque le snapshot courant est disponible;
5. ne jamais activer un hit dont la page n'est plus la page courante;
6. conserver le garde de révision d'activation comme défense supplémentaire;
7. aucune donnée absolue/path supplémentaire, aucun nouveau DTO, aucun nouveau store, aucune dépendance.

Évite un refactor général de `MapApp.tsx`. Corrige le cycle de recherche uniquement.

## 3 — Preuves obligatoires

Ajouter une preuve TypeScript déterministe du comportement asynchrone. Préférer extraire une petite primitive pure/testable de coordination si cela évite de monter tout `MapApp`; sinon utiliser le harnais de composant existant.

Prouver au minimum :

- requête 1 puis requête 2, réponses résolues volontairement dans l'ordre **2 puis 1** => seule 2 est publiée;
- cerveau A puis cerveau B, réponse A tardive => aucun résultat A publié sous B;
- `Effacer` pendant une requête => réponse tardive ignorée;
- l'état loading appartient à la requête la plus récente;
- changement de révision invalide l'ancienne page/réponse;
- activation reste impossible sur une page périmée.

Les tests doivent être déterministes, pas dépendre de la vitesse réelle de SQLite.

## 4 — Rejeu / non-régression

Rejouer le scénario WebView2 TASK-0034 existant sur le `REAL_ROOT` synthétique de 5 206 éléments : recherche hors projection, activation, refresh/révision, reveal Explorer, aucune fuite de chemin absolu, 0 erreur console fatale.

Si raisonnablement possible, ajouter au script un petit scénario de changement/effacement pendant recherche; ne ralentis pas artificiellement le backend produit uniquement pour fabriquer une course. La preuve déterministe TypeScript reste l'autorité pour l'ordre inversé.

## 5 — Validation

Exécuter :

- tests TypeScript ciblés puis suite complète;
- tests Rust pertinents puis `cargo test --offline` si le Rust reste inchangé;
- `pnpm check`;
- `pnpm build`;
- `cargo build --offline`;
- `git diff --check`;
- Clippy/fmt selon les fichiers réellement touchés, en distinguant la dette préexistante.

## 6 — Documentation / sortie

Mettre à jour :

- `docs/tasks/TASK-0034-v1-find-open.md`;
- `docs/ai/CURRENT_STATE.md`;
- `docs/ai/HANDOFF.md`;
- `docs/ai/NEXT_ACTION.md`;
- `docs/ai/VALIDATION.md`;
- `docs/ai/CHANGELOG_AI.md`;
- `.orchestrator/RESULT.md`.

À la fin :

- `TASK-0034 = IMPLEMENTED`, jamais auto-`VERIFIED`;
- aucun `TASK-0035` précréé;
- `NEXT_ACTION = nouveau contrôle indépendant de TASK-0034`;
- commit + push uniquement sur `build/v0.2-a18-v1-find-open`;
- aucun PR/merge/tag/release;
- `RESULT.md` doit identifier précisément le mécanisme de staleness choisi, les tests d'ordre inversé, le résultat WebView2, les validations et toute limite restante.
