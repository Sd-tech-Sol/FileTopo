# TASK-0034 — V1 Find & Open

- Date : 2026-09-10
- Statut : `READY`
- Branche : `build/v0.2-a18-v1-find-open`
- Prérequis : `TASK-0033 = VERIFIED` par `ACTION-0051`
- Décisions applicables : `DEC-0031`, `DEC-0033`, `DEC-0034`
- Nouvelle DEC : **aucune requise** — cette tranche adapte des primitives déjà présentes à l'Index canonique et à la frontière de confidentialité existante.

## But

Rendre la V1 réellement navigable sur un gros cerveau : retrouver rapidement un nœud par **nom ou chemin relatif**, focaliser ce résultat dans la carte progressive, puis permettre l'action explicite **Ouvrir dans l'Explorateur Windows** sans jamais exposer un chemin absolu au WebView.

Cette tâche ne crée ni nouvel index ni nouveau moteur de recherche. Elle réutilise les primitives existantes et les raccorde au runtime convergé `BrainIndex`.

## Audit de réutilisation déjà établi

### Réutiliser

- `Index::query_nodes()` : recherche SQL locale nom/chemin, paramètres liés, résultats bornés, tri dossiers avant fichiers.
- `map_view(brain_id, focus_id, after)` : focalisation progressive d'un résultat hors projection.
- `BrainNodeRef` : identité IPC `brain_id + node_id` déjà utilisée par les détails/relations.
- logique historique `resolve_indexed_target()` + lancement direct `explorer.exe` : référence technique pour confinement et comportement fichier/dossier.

### Adapter

- l'ancien `query_collection_nodes` dépend du `Registry` 0.1 : **ne pas l'enregistrer ni le réactiver**; porter uniquement l'appel à `Index::query_nodes()` derrière `open_store()` du cerveau courant;
- l'ancien `reveal_indexed_node` dépend du `Registry` 0.1 : **ne pas l'exposer tel quel**; adapter la résolution au `BrainRecord`/`BrainIndex` actuels et accepter uniquement un `BrainNodeRef` depuis le frontend.

### Ne pas construire

- pas de FTS5;
- pas d'index de recherche parallèle;
- pas de service externe;
- pas de nouveau renderer;
- pas de plugin shell/fs/opener côté frontend.

## A — Recherche bornée dans l'Index canonique

Ajouter une commande produit dédiée, p. ex. `map_search_nodes`, qui :

1. reçoit `brain_id`, `query`, `offset` et une limite bornée;
2. résout le cerveau via le catalogue courant;
3. passe obligatoirement par `open_store()` pour vérifier l'appartenance et le binding `source_kind + source_ref`;
4. appelle **l'existant** `Index::query_nodes()` au lieu de dupliquer le SQL;
5. renvoie uniquement une page bornée de résultats, jamais le corpus complet.

DTO minimal attendu pour chaque résultat :

- `BrainNodeRef` ou paire explicite `brainId + nodeId`;
- `name`;
- `relativePath`;
- `kind`.

La page doit aussi publier `total`, `offset`, `limit` et `indexRevision` afin qu'un résultat ne soit pas silencieusement réutilisé après un refresh/rebuild qui a changé la révision.

Aucun champ `absolutePath`, `rootPath`, `sourcePath`, `folderPath` ou équivalent.

### Bornes produit

- limite par page : **50 maximum**;
- requête vide : ne pas transformer l'interface en dump du corpus; retourner/afficher aucun résultat tant qu'aucun texte de recherche n'est fourni;
- longueur de requête bornée raisonnablement;
- `%`, `_` et `\` doivent rester des caractères recherchés et non des wildcards injectés — réutiliser l'échappement de `Index::query_nodes()`.

## B — Recherche dans l'interface

Ajouter une recherche simple dans la barre d'outils de la carte du cerveau focalisé :

- champ « Rechercher un dossier ou fichier »;
- résultats locaux affichant nom, type et chemin **relatif**;
- maximum 50 résultats visibles par page;
- total explicite si plus de résultats;
- navigation page précédente/suivante si nécessaire;
- clavier utilisable : Tab, flèches dans la liste si implémentées, Enter pour ouvrir/focaliser le résultat; clic souris équivalent;
- bouton/commande pour effacer la recherche.

Quand un résultat est activé :

1. demander `map_view` avec son `brain_id + node_id` comme focus;
2. remplacer la projection courante, sans accumulation;
3. sélectionner ce nœud;
4. recentrer avec le comportement de caméra déjà `VERIFIED` par TASK-0033;
5. charger le panneau de détails normal.

Aucun chemin absolu n'est nécessaire pour focaliser un résultat.

## C — Ouvrir dans l'Explorateur Windows, frontière sûre

Ajouter une commande produit p. ex. `map_reveal_node(reference: BrainNodeRef)`.

### Contrat obligatoire

- le frontend transmet **uniquement `BrainNodeRef`**;
- aucun argument `path`, `relativePath`, `root`, `folder`, `directory`, `target` fourni par le WebView;
- Rust résout le cerveau et ouvre son `BrainIndex` avec les contrôles de binding courants;
- Rust lit le `relative_path` du nœud depuis l'Index canonique;
- Rust résout la vraie racine **en interne** à partir du catalogue/source du cerveau;
- chaque composante du chemin indexé doit rester confinée à la racine et être revalidée; refuser symlink/reparse/skipped/target disparu;
- lancement **direct** de `explorer.exe`, jamais via shell de commande;
- dossier : ouvrir le dossier;
- fichier : ouvrir Explorer avec le fichier sélectionné;
- ne jamais retourner le chemin absolu au frontend;
- ne jamais écrire ce chemin dans un log ou une preuve Git.

Réutiliser/adopter la logique historique `resolve_indexed_target()` lorsque sûre; ne pas réactiver l'ancien `Registry`.

Aucune permission frontend `shell:*`, `fs:*`, `opener:*` ou `dialog:*` nouvelle.

## D — Panneau de détails

Ajouter au panneau de la sélection : **« Ouvrir dans l'Explorateur »**.

- visible/actif uniquement lorsqu'une sélection indexée est disponible;
- appelle la nouvelle commande avec `BrainNodeRef` seulement;
- succès discret;
- erreur lisible si le fichier/dossier a disparu, est inaccessible, reparse ou si la plateforme ne le permet pas;
- ne jamais afficher un chemin absolu en cas d'erreur.

Le « chemin relatif » déjà affiché reste autorisé.

## E — Cohérence de révision

La recherche doit être liée à une `indexRevision`.

Après Refresh/Rebuild du cerveau recherché :

- les résultats de recherche précédents doivent être invalidés/effacés ou explicitement rechargés;
- aucun ancien `node_id` ne doit être activé silencieusement contre une nouvelle révision.

## F — Preuves Rust obligatoires

Prouver au minimum :

1. recherche partielle nom/chemin correcte et bornée à 50;
2. total/offset/limit exacts;
3. `%`, `_`, `\` correctement échappés;
4. résultats isolés par cerveau;
5. recherche ne scanne pas la source et fonctionne depuis l'Index existant;
6. DTO de recherche sans chemin absolu;
7. révision publiée et changement de révision détectable;
8. `map_reveal_node` refuse un `BrainNodeRef` d'un autre cerveau;
9. cible reparse/skipped/disparue refusée;
10. confinement du chemin indexé;
11. construction de la commande Windows dossier/fichier sans shell;
12. aucune commande historique `query_collection_nodes`/`reveal_indexed_node` réenregistrée.

## G — Preuves TypeScript obligatoires

Prouver :

1. champ de recherche et résultats bornés;
2. une recherche vide n'affiche pas/demande pas le corpus;
3. activation d'un résultat hors projection demande une nouvelle projection et sélectionne le bon nœud;
4. changement de révision invalide les résultats précédents;
5. bouton Explorer appelle uniquement `{ reference: { brainId, nodeId } }`;
6. aucune propriété de chemin absolu dans les invokes/frontend DTO;
7. aucune régression sélection, caméra, détails, relations ou agrégats.

## H — Rejeu WebView2

Réutiliser autant que possible le harnais TASK-0033 et une arborescence synthétique >= 5 000 éléments.

Prouver en vrai WebView2 :

- recherche d'un élément volontairement hors projection;
- résultat exact et borné;
- activation -> nouvelle projection avec le résultat sélectionné et panneau cohérent;
- recherche puis refresh/rebuild -> ancien résultat non réutilisé silencieusement;
- invocation « Ouvrir dans l'Explorateur » sur **une cible synthétique seulement**; un spawn `explorer.exe` réussi suffit comme preuve hôte, sans capturer de chemin;
- aucune fuite de chemin absolu dans DOM/payload/log;
- 0 erreur console fatale.

## I — Hors portée

- FTS5 / recherche sujet-rôle;
- filtres « nouveaux/non vus »;
- watcher/incrémental;
- historique de changements;
- copie du chemin absolu;
- préférences d'écran/icône;
- nouveau moteur graphique;
- réseau/cloud/LLM/MCP.

## J — Validation générale

Exécuter les tests ciblés puis les suites pertinentes complètes : Rust, TypeScript, `pnpm check`, `pnpm build`, `cargo build --offline`, `git diff --check`, `cargo fmt --check` sur les lignes/fichiers touchés. Exécuter Clippy strict et distinguer la dette historique de tout nouveau diagnostic.

## Sortie attendue

À la fin de l'exécution :

- `TASK-0034 = IMPLEMENTED`, jamais auto-`VERIFIED`;
- aucun `TASK-0035` précréé par l'exécuteur;
- `.orchestrator/RESULT.md` contient HEAD, commits, réutilisation/adaptation, code modifié, preuves, WebView2, confidentialité, dette restante;
- `docs/ai/CURRENT_STATE.md`, `HANDOFF.md`, `NEXT_ACTION.md`, `VALIDATION.md`, `CHANGELOG_AI.md` mis à jour;
- `NEXT_ACTION = contrôle indépendant de TASK-0034`;
- commit/push uniquement sur `build/v0.2-a18-v1-find-open`;
- aucun PR/merge/tag/release sans instruction ultérieure de l'orchestrateur.