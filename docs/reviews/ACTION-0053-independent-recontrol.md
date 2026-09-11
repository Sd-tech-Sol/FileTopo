# ACTION-0053 — Recontrôle indépendant de TASK-0034 après ACTION-0052

- Date : 2026-09-10
- Statut : `OPEN / RECONTROL REQUIRED`
- Tâche contrôlée : `TASK-0034 — V1 Find & Open`
- Branche : `build/v0.2-a18-v1-find-open`
- Passe corrective contrôlée : `3424298`
- Exécuteur : Claude Code / Sonnet 5
- Autorité du verdict : orchestrateur ChatGPT indépendant de l'exécuteur
- Verdict : **PAS ENCORE VERIFIED**

## Ce que la passe corrective a bien fermé

Le mécanisme `SearchCoordinator` corrige la course centrale identifiée par `ACTION-0052` une fois qu'une nouvelle recherche a effectivement commencé : ticket monotone, publication réservée à la requête courante, garde de cerveau/requête/révision, ownership du `loading`, invalidation explicite pour `Effacer`, et conservation du garde de révision au moment de l'activation. Les huit tests déterministes prouvent correctement l'ordre inversé des réponses au niveau de cette primitive. Le rejeu WebView2 complet est également revenu vert sur le scénario TASK-0034 existant.

Aucune régression architecturale observée : aucune surface IPC Rust nouvelle, aucun changement de `Index::query_nodes()`, aucune modification de la frontière Explorer ou des permissions WebView.

## Verrou restant 1 — invalidation trop tardive au changement de requête

Dans l'UI actuelle, `onChange` du champ de recherche exécute seulement `setSearchQuery(event.target.value)`. Pour une requête non vide, l'ancien ticket n'est invalidé qu'ensuite lorsque le `useEffect` déclenché par le nouvel état appelle `runSearch()`, qui prend alors le ticket suivant.

Il reste donc une fenêtre entre l'événement utilisateur et l'exécution de cet effet : si l'ancienne promesse se résout dans cette fenêtre, son ticket est encore courant et sa page peut être publiée sous le nouveau texte saisi. Les tests actuels appellent directement `runCoordinatedSearch()` pour A puis AB; ils ne reproduisent pas le cas plus strict où l'intention utilisateur change **avant** que la seconde recherche ait commencé.

`ACTION-0052` exigeait explicitement que changement de requête/cerveau/révision ou `Effacer` invalide immédiatement la requête précédente. La primitive est bonne; son câblage au changement d'intention n'est pas encore assez tôt pour satisfaire cette formulation.

## Verrou restant 2 — comparaison de requête brute contre réponse normalisée

Le backend `search_nodes()` normalise la requête avec `trim()` puis la borne à 200 caractères avant de remplir `SearchPage.query`. Le coordinateur compare pourtant `page.query === params.query` avec la chaîne brute provenant du champ.

Conséquence : une requête légitime comportant des espaces de bord, ou dépassant la borne serveur, peut être correctement traitée par Rust puis rejetée silencieusement par le coordinateur parce que la réponse porte la forme normalisée. Le frontend et le backend doivent partager une sémantique compatible : soit la requête envoyée au coordinateur est canonisée avant l'appel, soit la vérification d'identité tient compte explicitement de la normalisation serveur, sans affaiblir le garde contre les réponses périmées.

## Correction exigée

Passe corrective minimale, même tâche et même branche :

1. invalider/superséder une requête en vol dès que l'intention de recherche change, avant qu'une ancienne réponse puisse republier une page; couvrir au minimum la saisie et `Effacer`, et garantir le même résultat lors d'un changement de cerveau;
2. rendre la comparaison d'identité compatible avec la normalisation réelle du backend (`trim`, borne 200) sans réintroduire de possibilité de réponse obsolète;
3. vérifier l'offset de réponse ou démontrer clairement pourquoi le ticket monotone rend son identité suffisante; préférer le vérifier puisque `SearchPage` le publie déjà;
4. ajouter un test déterministe où la requête A est en vol, l'intention passe à AB et invalide A **avant que la recherche AB soit lancée**, puis A se résout : A ne doit rien publier;
5. ajouter l'équivalent pour le changement de cerveau, et un test de requête avec espaces de bord (et, si simple, >200 caractères) qui doit produire la même recherche canonique que Rust;
6. rejouer la suite TypeScript et le WebView2 TASK-0034; aucun changement Rust/IPC/Explorer sauf nécessité démontrée.

## Action unique suivante

Exécuter `.orchestrator/NEXT_PROMPT.md` sur `build/v0.2-a18-v1-find-open`, puis refaire un contrôle indépendant. Aucune `TASK-0035` avant fermeture de TASK-0034.
