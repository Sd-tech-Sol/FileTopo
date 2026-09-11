# NEXT_PROMPT — TASK-0034 corrective pass 2 — immediate search intent invalidation

**TARGET_AGENT:** CLAUDE CODE  
**RECOMMENDED_MODEL:** Sonnet 5, high effort  
**STATUS:** READY  
**OWNER:** orchestrateur ChatGPT  
**MODE:** correction ciblée + preuves  
**TASK:** `TASK-0034 — V1 Find & Open`  
**BRANCHE:** `build/v0.2-a18-v1-find-open`

## /goal

Fermer uniquement les deux verrous restants relevés par `ACTION-0053` dans le cycle de recherche frontend :

1. une requête en vol doit être invalidée **dès que l'intention utilisateur change**, avant qu'une ancienne réponse puisse publier pendant la fenêtre entre l'événement et le `useEffect` suivant;
2. l'identité de requête doit rester compatible avec la normalisation réelle du backend (`trim()` + borne de 200 caractères), au lieu de rejeter une réponse valide parce qu'elle porte la forme canonique.

Ne crée aucune nouvelle fonctionnalité. Ne change ni l'IPC Rust, ni `Index::query_nodes()`, ni la logique Explorer sauf nécessité directement démontrée. `TASK-0034` reste `IMPLEMENTED`, jamais auto-`VERIFIED`.

## 0 — Préconditions

1. Lire `AGENTS.md`, `CLAUDE.md`, `docs/reviews/ACTION-0052-independent-control.md`, `docs/reviews/ACTION-0053-independent-recontrol.md`, `docs/tasks/TASK-0034-v1-find-open.md`, `docs/ai/NEXT_ACTION.md`, `.orchestrator/RESULT.md`.
2. Basculer explicitement sur `build/v0.2-a18-v1-find-open`.
3. `git fetch origin`, fast-forward uniquement; arbre propre avant écriture.
4. HEAD doit contenir `ACTION-0053`. Divergence inexpliquée => `BLOCKED`.
5. Réutiliser `SearchCoordinator` / `runCoordinatedSearch`; pas de second mécanisme parallèle.

## 1 — Invalidation immédiate de l'intention

Le câblage actuel invalide correctement une ancienne requête une fois que `runSearch()` de la nouvelle requête a commencé. Mais `onChange` du champ appelle d'abord seulement `setSearchQuery(...)`; le nouveau `runSearch()` arrive dans un `useEffect` ultérieur.

Rendre impossible ce scénario :

1. recherche A en vol;
2. l'utilisateur modifie le champ vers AB;
3. **avant que la recherche AB soit lancée**, A se résout;
4. A ne doit publier ni page, ni erreur, ni `loading=false` appartenant à la nouvelle intention.

La correction doit invalider/superséder le ticket courant au moment où l'intention change, pas seulement au lancement asynchrone suivant. Le même principe doit empêcher qu'une réponse du cerveau A réapparaisse après une bascule vers le cerveau B. `Effacer` doit rester sûr.

Évite un refactor général de `MapApp.tsx`. Une petite fonction de changement de requête, un ref d'intention ou une autre adaptation minimale est préférable.

## 2 — Normalisation de requête cohérente

Rust fait aujourd'hui : `query.trim().chars().take(200)` avant de remplir `SearchPage.query`.

Le frontend doit traiter l'identité avec une sémantique compatible. Une requête comme `" rapport "` doit pouvoir produire la même recherche que `"rapport"`, et une requête >200 caractères ne doit pas être silencieusement rejetée par le coordinateur uniquement parce que le backend l'a bornée.

Choisir une seule stratégie claire :

- canoniser la requête utilisée pour l'appel/coordinator avant l'IPC avec exactement la sémantique attendue; ou
- comparer la réponse contre une forme canonique explicitement calculée côté frontend.

Ne modifie pas Rust seulement pour contourner le coordinateur si le contrat backend actuel est correct. Si une constante/helper frontend est créée, documenter le lien avec la borne serveur et tester la compatibilité.

## 3 — Identité complète

`SearchPage` publie déjà `brainId`, `query`, `offset`, `limit`, `indexRevision`.

En plus du ticket monotone :

- vérifier `brainId`;
- vérifier la requête canonique;
- vérifier `indexRevision` lorsqu'elle est connue;
- vérifier aussi `offset` de la réponse contre la requête lancée, sauf justification forte et testée qu'il est réellement redondant.

Le garde de révision d'`activateSearchHit()` reste en place comme défense supplémentaire.

## 4 — Preuves TypeScript obligatoires

Étendre les tests déterministes pour couvrir au minimum :

1. A en vol -> intention passe à AB et invalide A -> **A se résout avant que AB soit lancée** -> aucune publication de A;
2. cerveau A en vol -> intention/focus passe à B avant lancement d'une recherche B -> A tardif ne publie rien;
3. `Effacer` pendant une requête -> réponse tardive ignorée;
4. requête `" rapport "` -> forme canonique `"rapport"` acceptée et page publiée;
5. requête >200 caractères -> comportement canonique cohérent avec le backend, pas de rejet silencieux;
6. offset de réponse incorrect -> page refusée si la vérification d'offset est retenue;
7. loading appartient toujours à la dernière intention/requête;
8. tests existants d'ordre inversé/révision restent verts.

Les tests doivent rester déterministes; ne dépends pas de la vitesse SQLite.

## 5 — Rejeu WebView2 / non-régression

Rejouer le scénario TASK-0034 existant sur le `REAL_ROOT` synthétique de 5 206 éléments : recherche hors projection, activation, refresh/révision, reveal Explorer, aucune fuite de chemin absolu, 0 erreur console fatale.

Ajouter si raisonnable une preuve live simple d'une recherche avec espaces de bord. Ne ralentis pas le produit artificiellement pour fabriquer une course : les tests TypeScript sont l'autorité pour l'ordre adversarial.

## 6 — Validation

Exécuter :

- tests TypeScript ciblés puis suite complète;
- `pnpm check`;
- `pnpm build`;
- `git diff --check`;
- `cargo test --offline` et `cargo build --offline` pour non-régression si le workflow courant le permet, même si Rust reste inchangé;
- fmt/clippy seulement selon fichiers réellement touchés, en signalant la dette historique sans l'attribuer à cette passe.

Aucune donnée personnelle.

## 7 — Documentation / sortie

Mettre à jour `docs/tasks/TASK-0034-v1-find-open.md`, `docs/ai/CURRENT_STATE.md`, `HANDOFF.md`, `NEXT_ACTION.md`, `VALIDATION.md`, `CHANGELOG_AI.md` et `.orchestrator/RESULT.md`.

À la fin :

- `TASK-0034 = IMPLEMENTED`, jamais auto-`VERIFIED`;
- aucun `TASK-0035` précréé;
- `NEXT_ACTION = contrôle indépendant de TASK-0034`;
- commit + push uniquement sur `build/v0.2-a18-v1-find-open`;
- aucun PR/merge/tag/release;
- le rapport doit expliquer précisément comment l'intention est invalidée **avant** le prochain `useEffect`, comment la normalisation est rendue cohérente, et les preuves associées.
