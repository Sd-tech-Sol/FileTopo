# ACTION-0054 — Recontrôle indépendant de TASK-0034 après ACTION-0053

- Date : 2026-09-11
- Statut : `OPEN / RECONTROL REQUIRED`
- Tâche contrôlée : `TASK-0034 — V1 Find & Open`
- Branche : `build/v0.2-a18-v1-find-open`
- Passe corrective contrôlée : `4f17fbb`
- Exécuteur : Claude Code / Sonnet 5
- Autorité du verdict : orchestrateur ChatGPT indépendant de l'exécuteur
- Verdict : **PAS ENCORE VERIFIED**

## Ce que la passe corrective 2 a bien fermé

La correction répond correctement aux deux verrous explicites d'`ACTION-0053` sur le chemin principal de recherche :

1. `updateSearchQuery()` invalide désormais `SearchCoordinator` dans la même pile d'appel que `onChange`, avant `setSearchQuery()`; une réponse de l'ancienne requête ne peut donc plus publier pendant la fenêtre événement → render/effect.
2. `canonicalizeSearchQuery()` aligne la requête frontend sur la sémantique du backend : `trim()` puis borne de 200 points de code Unicode avant l'IPC et avant la comparaison d'identité.
3. `offset` fait maintenant partie de `SearchResponseIdentity` et est vérifié avec `brainId`, requête et révision.
4. Les tests déterministes couvrent le cas strict A en vol → intention AB → invalidation → A se résout avant même le lancement de AB, ainsi que l'équivalent de changement de cerveau au niveau du coordinateur.
5. Les validations et le rejeu WebView2 sont des preuves de l'exécuteur, non réexécutées par l'orchestrateur : 312 tests TypeScript rapportés verts, 344 Rust inchangés, WebView2 5 206 éléments sans régression, aucune fuite de chemin absolu.

Aucune régression observée sur l'IPC Rust, `Index::query_nodes()`, la frontière Explorer ou les permissions WebView.

## Verrou restant — tous les changements de cerveau ne passent pas par les trois handlers protégés

La passe a ajouté une invalidation synchrone dans `onFocusBrain`, dans le changement de cerveau de `selectNode`, et dans le changement de cerveau de `changeProjection`. Cela ferme ces trois chemins.

Mais le modèle de composition contient d'autres chemins produit capables de changer `focusedBrainId` :

- `removeBrain()` transfère le focus au premier cerveau restant lorsqu'on retire le cerveau actuellement focalisé;
- `navigateCross` peut construire une nouvelle composition avec `focusBrain(addBrain(...), brainId)` puis la transmettre à `applyComposition()`;
- plus généralement, `applyComposition(next, ...)` est la porte commune utilisée par plusieurs transitions de composition et peut recevoir une composition dont `next.focusedBrainId` diffère du focus courant.

`onRemoveBrain()` appelle actuellement `applyComposition(removeBrain(...))` sans invalider la recherche en cours. Une réponse du cerveau retiré peut donc encore se résoudre pendant cette transition avec un ticket courant. Après bascule de composition, le `useEffect` qui efface la requête finira par invalider, mais il existe de nouveau une fenêtre render/effect du même type que celle qu'`ACTION-0053` a précisément interdite.

Le correctif doit être placé à la frontière commune plutôt que multiplier les exceptions : au début de `applyComposition`, si une composition courante existe et que `current.focusedBrainId !== next.focusedBrainId`, invalider `SearchCoordinator` **avant tout `await` et avant toute mutation de composition**. Les invalidations déjà présentes dans les handlers directs peuvent rester si elles sont utiles; le point important est que toute transition passant par `applyComposition` soit couverte une fois pour toutes.

## Correction exigée

Passe corrective minimale, même tâche et même branche :

1. protéger `applyComposition(next, ...)` : si le focus change, invalider immédiatement la recherche avant la première opération asynchrone;
2. ne pas invalider pour une composition dont le cerveau focalisé reste identique (refresh/rebuild/open de la même composition, ajout d'un cerveau sans déplacement du focus);
3. prouver le cas `removeBrain` du cerveau focalisé : une recherche A est en vol, l'intention passe à la composition focalisée sur B, A se résout avant tout prochain effet/recherche et ne publie rien;
4. prouver un second chemin `applyComposition` qui change le focus, idéalement la navigation inter-cerveaux vers un cerveau non encore affiché, ou une preuve structurelle équivalente que le garde est central et exécuté avant le premier `await`;
5. conserver les preuves de normalisation, offset, saisie synchrone, Clear et révision déjà acquises;
6. rejouer les tests TypeScript et le WebView2 TASK-0034 pour non-régression; aucun changement Rust/IPC/Explorer sauf défaut démontré.

## Action unique suivante

Exécuter `.orchestrator/NEXT_PROMPT.md` sur `build/v0.2-a18-v1-find-open`, puis refaire un contrôle indépendant. Aucune `TASK-0035` avant fermeture de TASK-0034.
