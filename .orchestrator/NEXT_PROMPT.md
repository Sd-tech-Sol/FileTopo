# NEXT_PROMPT — TASK-0034 corrective pass 3 — central focus-change invalidation

**TARGET_AGENT:** CLAUDE CODE  
**RECOMMENDED_MODEL:** Sonnet 5, high effort  
**STATUS:** READY  
**OWNER:** orchestrateur ChatGPT  
**MODE:** correction ciblée + preuves  
**TASK:** `TASK-0034 — V1 Find & Open`  
**BRANCHE:** `build/v0.2-a18-v1-find-open`

## /goal

Fermer uniquement le dernier verrou relevé par `ACTION-0054` : les invalidations synchrones ajoutées par la passe précédente couvrent `onFocusBrain`, `selectNode` et `changeProjection`, mais certaines transitions de composition peuvent encore changer `focusedBrainId` via `applyComposition()` sans invalider une recherche en vol au point d'intention.

La correction doit être centrale et minimale : toute transition passant par `applyComposition(next, ...)` qui change réellement de cerveau focalisé doit invalider immédiatement `SearchCoordinator`, avant tout `await` et avant toute mutation de composition. Une transition qui conserve le même cerveau focalisé ne doit pas invalider inutilement.

Ne crée aucune nouvelle fonctionnalité. Ne change ni l'IPC Rust, ni `Index::query_nodes()`, ni la logique Explorer. `TASK-0034` reste `IMPLEMENTED`, jamais auto-`VERIFIED`.

## 0 — Préconditions

1. Lire `AGENTS.md`, `CLAUDE.md`, `docs/reviews/ACTION-0052-independent-control.md`, `docs/reviews/ACTION-0053-independent-recontrol.md`, `docs/reviews/ACTION-0054-independent-recontrol.md`, `docs/tasks/TASK-0034-v1-find-open.md`, `docs/ai/NEXT_ACTION.md`, `.orchestrator/RESULT.md`.
2. Basculer explicitement sur `build/v0.2-a18-v1-find-open`.
3. `git fetch origin`, fast-forward uniquement; arbre propre avant écriture.
4. HEAD doit contenir `ACTION-0054`. Divergence inexpliquée => `BLOCKED`.
5. Réutiliser `SearchCoordinator`; aucun second mécanisme de staleness.

## 1 — Correction centrale

Auditer les chemins qui changent `ComposedView.focusedBrainId`, notamment :

- `onFocusBrain`;
- `selectNode`;
- `changeProjection`;
- `removeBrain()` lorsqu'on retire le cerveau focalisé;
- `navigateCross` lorsqu'une relation amène vers un cerveau non affiché;
- tout autre appel à `applyComposition(next, ...)` pouvant fournir un focus différent.

Ajouter à la frontière commune `applyComposition(next, ...)` un garde équivalent à :

- lire la composition courante depuis la ref déjà utilisée par cette fonction;
- si elle existe et `current.focusedBrainId !== next.focusedBrainId`, appeler `searchCoordinator.invalidate()` immédiatement;
- ce garde doit s'exécuter avant le premier `await`, avant `setComposed`, et avant toute attente de chargement de cerveau;
- ne rien invalider si le focus reste identique.

Les invalidations déjà présentes dans les handlers directs peuvent rester si elles conservent un comportement clair et idempotent. Évite un refactor général.

## 2 — Preuves obligatoires

Étendre les preuves TypeScript de manière déterministe :

1. une recherche du cerveau A est en vol;
2. une transition de composition retire A alors qu'il est focalisé, donc `removeBrain()` choisit B comme nouveau focus;
3. l'invalidation centrale se produit avant tout prochain effet/recherche;
4. A se résout ensuite et ne publie ni page, ni erreur, ni `loading=false` appartenant à la nouvelle intention;
5. une transition `applyComposition` qui conserve le même focus ne doit pas annuler une recherche courante sans raison;
6. ajouter un verrou structurel raisonnable montrant que le garde de changement de focus est bien dans `applyComposition` avant son premier `await`;
7. si simple, couvrir aussi le chemin `navigateCross` vers un cerveau non affiché; sinon démontrer que ce chemin passe bien par le garde central.

Conserver et rejouer les preuves acquises : ordre inversé, saisie avant effet, changement direct de cerveau, Clear, loading, révision, normalisation `trim` + 200 points de code, Unicode et offset.

## 3 — WebView2 / non-régression

Rejouer le scénario TASK-0034 existant sur le `REAL_ROOT` synthétique de 5 206 éléments : recherche hors projection, activation, refresh/révision, reveal Explorer, aucune fuite de chemin absolu, 0 erreur console fatale.

Aucune nécessité de fabriquer artificiellement une course dans WebView2 : la preuve adversariale déterministe TypeScript est l'autorité pour ce verrou.

## 4 — Validation

Exécuter au minimum :

- tests TypeScript ciblés puis suite complète;
- `pnpm check`;
- `pnpm build`;
- `git diff --check`;
- `cargo test --offline` et `cargo build --offline` pour non-régression si le workflow courant le permet;
- fmt/clippy seulement selon les fichiers réellement touchés, en distinguant la dette historique.

Aucune donnée personnelle.

## 5 — Documentation / sortie

Mettre à jour `docs/tasks/TASK-0034-v1-find-open.md`, `docs/ai/CURRENT_STATE.md`, `HANDOFF.md`, `NEXT_ACTION.md`, `VALIDATION.md`, `CHANGELOG_AI.md` et `.orchestrator/RESULT.md`.

À la fin :

- `TASK-0034 = IMPLEMENTED`, jamais auto-`VERIFIED`;
- aucun `TASK-0035` précréé;
- `NEXT_ACTION = contrôle indépendant de TASK-0034`;
- commit + push uniquement sur `build/v0.2-a18-v1-find-open`;
- aucun PR/merge/tag/release;
- le rapport doit expliquer le garde central de `applyComposition`, ses preuves et les validations.
