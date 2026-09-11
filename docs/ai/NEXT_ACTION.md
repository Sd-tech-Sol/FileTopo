# Action suivante

## TASK-0034 — seconde passe corrective ciblée

`TASK-0034 — V1 Find & Open` reste `IMPLEMENTED`, **pas encore `VERIFIED`**.

Le premier correctif d'`ACTION-0052` a bien ajouté un coordinateur à ticket monotone et fermé la majorité des courses asynchrones. Le recontrôle indépendant `ACTION-0053` conserve toutefois deux verrous précis :

1. pour une requête non vide, l'invalidation actuelle n'arrive qu'au prochain `useEffect` qui lance `runSearch()`. L'`onChange` du champ fait d'abord seulement `setSearchQuery(...)`; une ancienne réponse peut donc encore se résoudre dans cette courte fenêtre et publier une page avant que le nouveau ticket existe;
2. le backend normalise la requête (`trim()` + maximum 200 caractères) avant de remplir `SearchPage.query`, alors que le coordinateur compare cette valeur à la chaîne frontend brute. Une requête légitime avec espaces de bord ou >200 caractères peut donc être rejetée par le garde d'identité alors que Rust l'a correctement traitée.

Action unique suivante : exécuter la seconde passe corrective écrite dans `.orchestrator/NEXT_PROMPT.md` sur `build/v0.2-a18-v1-find-open`.

La passe doit rester strictement frontend/coordination sauf nécessité démontrée : invalidation dès le changement d'intention, normalisation compatible avec le backend, identité de page complète (incluant l'offset si possible), tests déterministes puis rejeu WebView2 de non-régression. Aucune `TASK-0035` avant fermeture de ce verrou.
