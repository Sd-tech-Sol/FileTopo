# ACTION-0055 — Recontrôle indépendant final de TASK-0034

- Date : 2026-09-11
- Statut : `CLOSED / VERIFIED`
- Tâche contrôlée : `TASK-0034 — V1 Find & Open`
- Branche contrôlée : `build/v0.2-a18-v1-find-open`
- Livraison corrective finale contrôlée : `521fee1633af83f88952d563ed1a86a0377ee317`
- Exécuteur : Claude Code / Sonnet 5
- Autorité du verdict : orchestrateur ChatGPT indépendant de l’exécuteur
- Verdict : **TASK-0034 = VERIFIED dans sa portée**

## Contrôle indépendant

Le recontrôle source confirme que les trois verrous successivement trouvés par `ACTION-0052`, `ACTION-0053` et `ACTION-0054` sont fermés sans régression architecturale.

1. `SearchCoordinator` utilise un ticket monotone : seule la requête encore courante peut publier une page, une erreur ou `loading=false`.
2. L’identité d’une réponse couvre `brainId + query canonique + offset + indexRevision` lorsque la révision courante est connue.
3. La requête est canonisée côté frontend avec la même sémantique que le backend (`trim()` puis borne de 200 points de code Unicode) avant l’IPC; le champ visible conserve la saisie brute.
4. Le changement de texte invalide la requête en vol synchroniquement dans le gestionnaire `onChange`, avant le prochain rendu/effect React.
5. Les changements directs de cerveau dans `onFocusBrain`, `selectNode` et `changeProjection` invalident eux aussi synchroniquement la recherche lorsqu’ils déplacent réellement le focus.
6. `applyComposition(next, ...)` possède maintenant le garde commun manquant : après lecture de `composedRef.current`, avant son premier `await` et avant toute mutation de composition, il invalide la recherche si et seulement si `focusedBrainId` change. Ce garde couvre notamment le retrait du cerveau focalisé et la navigation inter-cerveaux vers un cerveau non encore affiché.
7. Une transition qui conserve le même cerveau focalisé n’est pas invalidée inutilement. Pour Refresh/Rebuild, la cohérence reste assurée par `focusedBrainRevision` qui relance la recherche après republication et par le garde d’activation qui refuse une page dont `indexRevision` n’est plus courante.
8. La frontière Explorer reste celle contrôlée avant les passes correctives : `map_reveal_node` reçoit uniquement `BrainNodeRef`; aucune racine ni chemin absolu ne vient du WebView, aucune permission `shell/fs/opener/dialog` n’a été ajoutée, et l’ancien Registry 0.1 n’est pas réactivé.

## Preuves de l’exécuteur lues mais non réattribuées à l’orchestrateur

Claude Code rapporte pour la passe finale :

- TypeScript : `317 PASS` sur 20 fichiers;
- Rust : `344 PASS`, `0 failed`, `5 ignored`;
- `pnpm check`, `pnpm build`, `cargo build --offline`, `git diff --check` verts;
- rejeu WebView2 complet sur le `REAL_ROOT` synthétique de 5 206 éléments, sans régression, sans fuite de chemin absolu et avec 0 erreur console fatale.

Ces résultats sont des preuves produites par l’exécuteur. Le verdict présent repose en plus sur la lecture indépendante du diff, du câblage `MapApp.tsx`, du coordinateur et des tests déterministes.

## Dette et hors portée

Le verdict ne valide pas : watcher/incrémental, journal de changements, FTS5, copie du chemin réel, préférences écran/icône, acceptance de performance sur laptop modeste ni la dette Clippy historique. La passe finale n’a touché aucun fichier Rust; le rapport de l’exécuteur conserve l’état antérieur de Clippy strict à 26 diagnostics préexistants.

## Verdict

**TASK-0034 est VERIFIED dans sa portée V1 Find & Open.**

La prochaine tranche ne doit pas rouvrir son architecture. Elle doit continuer la parité fonctionnelle MVP en réutilisant le panneau de détails et l’Index canonique avant d’attaquer la surveillance automatique.
