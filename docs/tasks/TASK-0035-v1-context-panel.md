# TASK-0035 — V1 Context Panel, Direct Children & Safe Copy

- Date : 2026-09-11
- Statut : `READY`
- Branche : `build/v0.2-a19-v1-context-panel`
- Prérequis : `TASK-0034 = VERIFIED` par `ACTION-0055`
- Décisions applicables : `DEC-0031`, `DEC-0033`, `DEC-0034`
- Nouvelle DEC : **aucune prévue**. Si l’implémentation exige d’affaiblir la frontière de confidentialité ou d’ajouter une seconde source de vérité, arrêter et rapporter `BLOCKED` au lieu d’inventer une architecture.

## But

Compléter une tranche immédiatement utile de la parité MVP autour de la sélection courante, sans toucher au moteur topographique :

1. permettre de masquer/réafficher le panneau de détails et faire survivre ce choix au redémarrage;
2. afficher le **contenu direct exact et paginé** du dossier sélectionné indépendamment de la projection visuelle bornée;
3. permettre **Copier le chemin** comme geste explicite, tout en gardant le chemin absolu hors du WebView.

Cette tâche ne construit ni watcher, ni journal de changements, ni filtres dynamiques. Elle prépare l’usage quotidien avant la phase de surveillance.

## Audit de réutilisation établi

### Réutiliser

- `DetailsPanel.tsx` : panneau contextuel existant, sélection déjà synchronisée avec la carte.
- `BrainNodeRef` : identité `brainId + nodeId`; aucune chaîne de chemin ne doit venir de React pour les actions hôte.
- `BrainCatalog::meta()` / `put_meta()` et la table générique `catalog_meta` : stockage persistant déjà présent pour un booléen d’UI non sensible; **pas de nouvelle base ni de nouveau fichier de préférences**.
- `Index::children_page(parent_id, page_size, after)` : primitive keyset déjà présente pour une page bornée d’enfants directs; **ne pas refaire une requête SQL parallèle**.
- `map_view` / `selectNode` / `changeProjection` : sélection/focalisation existantes lorsqu’un enfant n’est pas dans la projection courante.
- la résolution sûre déjà utilisée par `map_reveal_node` : cerveau → Index → `relative_path` → racine résolue côté Rust → confinement.

### Presse-papiers

La voie privilégiée est l’API Rust officielle Tauri `tauri-plugin-clipboard-manager` si elle est compatible avec le lock courant : initialisation côté hôte et `ClipboardExt::write_text`. **Ne pas installer le package JavaScript**, ne pas appeler l’API clipboard depuis React et ne donner aucune permission `clipboard-manager:*` au WebView.

Avant ajout de dépendance, vérifier version/compatibilité/licence et la surface réellement exposée. Épingler une version compatible plutôt que `latest` implicite. Si cette voie ne peut pas écrire côté Rust sans ouvrir une permission frontend, arrêter cette sous-partie et la rapporter plutôt que contourner via PowerShell, `cmd.exe`, shell ou une permission large.

## A — Panneau masquable et persistant

Ajouter une préférence globale non sensible `details_panel_visible`, avec **visible par défaut** si aucune valeur n’existe.

Exigences :

- utiliser `catalog_meta` existant; aucun nouveau store;
- commande(s) IPC dédiée(s) minimale(s), p. ex. `map_ui_preferences` et `map_ui_preferences_update`, ne transportant que des valeurs d’UI non sensibles;
- bouton clavier/souris « Masquer les détails » / « Afficher les détails »;
- masquer le panneau ne doit effacer ni sélection, ni recherche, ni projection, ni relations;
- réafficher doit rendre la même sélection et le même contexte;
- la valeur survit à un vrai redémarrage Tauri/WebView2;
- aucune préférence ne contient chemin, nom de fichier personnel ou donnée de cerveau.

Pas de migration de schéma si `catalog_meta` permet la clé sans changement structurel.

## B — Contenu direct exact et paginé

Le `NodeDetail` actuel prend ses enfants dans `materialize_view()`. C’est volontairement borné pour la carte, mais ce n’est pas une liste exhaustive/paginée indépendante du dossier.

Créer une commande dédiée, p. ex. `map_node_children(reference, after?, limit?)`, qui :

- reçoit `BrainNodeRef` et un curseur/pagination bornée, jamais un chemin;
- passe par `resolve_brain` + `open_store`;
- réutilise **`Index::children_page()`**;
- maximum **50 enfants** par page;
- retourne uniquement des enfants dont `parent_id == reference.node_id`, jamais petits-enfants ou résultat global;
- publie les informations nécessaires à la pagination et à la cohérence d’index (`indexRevision`/identité ou le mécanisme déjà porté par le curseur existant);
- n’expose aucun chemin absolu;
- une cible qui n’est plus dans la révision courante doit être refusée/rechargée explicitement, jamais résolue silencieusement sur un autre nœud.

Dans `DetailsPanel` :

- la section « Enfants directs » lit cette page dédiée, pas `detail.children` comme vérité exhaustive;
- total exact visible;
- page suivante/précédente ou historique de curseurs permettant de parcourir toutes les pages;
- pagination remplace la page courante ou reste autrement strictement bornée; ne pas accumuler des milliers de DOM rows;
- sélectionner un enfant réutilise la navigation existante et focalise la carte si nécessaire;
- racine/fichier sans enfant : état vide clair.

## C — Copier le chemin réel sans fuite WebView

Ajouter une action explicite `Copier le chemin` pour la sélection.

Frontière obligatoire :

- React transmet **uniquement `BrainNodeRef`** à une commande produit dédiée, p. ex. `map_copy_node_path(reference)`;
- le chemin relatif est lu dans l’Index côté Rust;
- la racine réelle est résolue côté Rust;
- le chemin est construit/confiné côté Rust en réutilisant la logique sûre de `map_reveal_node` autant que possible;
- le texte complet est écrit au presse-papiers **côté hôte**;
- la commande retourne seulement succès/erreur générique, jamais le chemin;
- aucun chemin absolu dans DTO, DOM, `hostLog`, erreur frontend ou artefact Git;
- aucune permission frontend `clipboard-manager:*`, `shell:*`, `fs:*`, `opener:*` ou `dialog:*` ajoutée;
- aucun PowerShell/cmd/shell pour écrire le presse-papiers.

Le chemin copié doit être exact pour noms Unicode et noms longs. La racine sélectionnée elle-même doit être traitée explicitement, pas par concaténation fragile d’une chaîne vide.

## D — Preuves obligatoires

### Rust / modèle

Prouver au minimum :

- préférence absente => panneau visible;
- écriture/lecture de préférence persiste à la réouverture du catalogue;
- aucune donnée sensible n’est sérialisée dans la préférence;
- `map_node_children` page exactement les enfants directs, max 50, ordre déterministe, aucune duplication/perte entre pages, aucun petit-enfant;
- curseur/révision d’un autre cerveau ou d’une ancienne révision refusé;
- commande de copie reçoit uniquement `BrainNodeRef`;
- résolution/confinement du chemin réutilise la frontière sûre existante;
- aucune ancienne commande 0.1 ni permission frontend sensible n’est réactivée.

### TypeScript

Prouver au minimum :

- masquer/réafficher ne change pas la sélection;
- le panneau utilise la page d’enfants dédiée et non la projection comme liste exhaustive;
- pagination reste bornée et navigable au clavier;
- sélectionner un enfant utilise la navigation existante;
- `Copier le chemin` envoie seulement `{ reference: { brainId, nodeId } }`;
- aucun chemin absolu ne transite par l’état/frontend.

### WebView2 réel

Réutiliser les harnais existants autant que possible et une arborescence synthétique, jamais une donnée personnelle. Prouver :

1. panneau visible par défaut sur profil neuf;
2. masquer, redémarrer réellement l’application, préférence toujours masquée; réafficher, redémarrer, toujours visible;
3. dossier synthétique >50 enfants : première page bornée, navigation vers page suivante, total exact, aucun petit-enfant;
4. sélection d’un enfant hors projection => carte/détails synchronisés;
5. `Copier le chemin` sur cible synthétique : lecture du presse-papiers dans le **harnais de preuve uniquement**, comparaison interne exacte, mais l’artefact ne conserve que `match: true/false`, jamais la valeur du chemin;
6. DOM/payload/log/artifact : aucun chemin absolu;
7. 0 erreur console fatale.

## E — Hors portée

- filtres « tout/nouveaux/non vus/type/disponibilité »;
- watcher, journal de changements, seen/unseen;
- FTS5 / recherche contenu;
- préférences de moniteur ou icône;
- refonte graphique générale;
- modification du moteur de relations;
- cloud/réseau/IA.

## F — Validation générale

Exécuter tests ciblés puis suites complètes pertinentes : Rust, TypeScript, `pnpm check`, `pnpm build`, `cargo build --offline`, `git diff --check`, fmt sur fichiers Rust touchés et Clippy strict en distinguant toute dette préexistante. Toute nouvelle dépendance doit être présente dans `Cargo.lock` et documentée.

## Sortie attendue

À la fin :

- `TASK-0035 = IMPLEMENTED`, jamais auto-`VERIFIED`;
- aucune `TASK-0036` précréée par l’exécuteur;
- mettre à jour `docs/ai/CURRENT_STATE.md`, `HANDOFF.md`, `NEXT_ACTION.md`, `VALIDATION.md`, `CHANGELOG_AI.md` et `.orchestrator/RESULT.md`;
- `NEXT_ACTION = contrôle indépendant de TASK-0035`;
- commit/push uniquement sur `build/v0.2-a19-v1-context-panel`;
- aucun PR/merge/tag/release;
- aucune donnée personnelle dans tests, captures, logs ou artefacts.

## Livraison — 2026-09-11

Détail complet dans [VALIDATION section BL](../ai/VALIDATION.md). Résumé :

### A — Panneau masquable et persistant

`catalog_meta` porte une clé de plus, `details_panel_visible`, exactement
comme `active_brain_id` : `BrainCatalog::ui_preferences()`/
`set_details_panel_visible()` (`brains.rs`), aucune migration de schéma.
Deux commandes minimales, `map_ui_preferences`/`map_ui_preferences_update`,
ne transportant que ce booléen. Côté React, `detailsPanelVisible` est lu une
fois au démarrage (même `Promise.all` que fixtures/hôte/catalogue) et
persisté par `toggleDetailsPanel()`, qui ne touche rien d'autre — ni
sélection, ni recherche, ni projection, ni composition. Masquer retire
`<DetailsPanel>` du rendu (jamais son état, qui vit dans `MapApp`) : la
réafficher restitue exactement le même contexte.

### B — Enfants directs exacts et paginés

`map_node_children(reference, after?, limit?)` réutilise
`Index::children_page()` sans SQL parallèle, borné à 50
(`CHILDREN_LIMIT_MAX`), curseur keyset opaque refusant explicitement un
index étranger, une révision périmée ou un parent différent —
`crate::hierarchy` faisait déjà tout ce travail pour `DEC-0030`. La section
« Enfants directs » de `DetailsPanel` lit désormais cette page dédiée,
jamais `detail.children` (qui reste la vue bornée de la projection, non
exhaustive) : total exact, navigation page suivante/précédente par pile de
curseurs, sélection d'un enfant réutilisant `onSelect` tel quel.

### C — Copier le chemin

`tauri-plugin-clipboard-manager` épinglé en version exacte
(`= 2.3.3`, licence MIT/Apache-2.0, API Rust `ClipboardExt::clipboard()
.write_text()`) — audité avant ajout : son propre jeu de permissions par
défaut est **vide** (`permissions = []`), et aucune n'est accordée à la
capacité `default`, qui reste `core:default` seul. `map_copy_node_path`
partage la résolution/confinement de `map_reveal_node`
(`resolve_confined_target`, extrait des deux) et convertit le chemin avec
`Path::to_str` — jamais `to_string_lossy()` — pour rester exact sur un nom
Unicode plutôt que de corrompre silencieusement un composant non
représentable. Le texte n'existe que le temps de l'écrire au
presse-papiers côté hôte; le frontend ne reçoit que succès/erreur générique.

### Preuves

**Rust** — 5 tests de préférence (`brains.rs`), 16 tests de pagination/copie
(`context_panel_tests.rs`) : bornage à 50, couverture exacte sans
doublon/perte/petit-enfant à travers la pagination complète, refus
cerveau/curseur étranger/révision périmée/parent différent, copie exacte
sur noms Unicode et longs (écrits par le test lui-même sous la racine
synthétique résolue), refus reparse/skipped/disparu, DTO sans chemin
absolu. Structurels dans `lib.rs` : les quatre commandes exposées et rien
de plus, `map_copy_node_path` ne prend que `BrainNodeRef`, plugin clipboard
initialisé et aucune permission `clipboard-manager:*` dans la capacité.

**TypeScript** — 14 tests `DetailsPanel.test.tsx` (copie, pagination bornée
et navigable, sélection d'enfant, total exact, absence de chemin absolu),
8 tests `contextPanel.test.ts` (câblage `MapApp.tsx` : chargement de la
préférence au démarrage, bascule isolée de tout autre état, invoke exact de
`map_copy_node_path`/`map_node_children`), plus la migration du test
préexistant qui supposait `detail.children` comme source exhaustive.
**317 → 339 PASS.**

**WebView2 réel**, trois lancements réels du même exécutable sur le même
bac à sable (`task0035-seed-proof.py`, arbre `REAL_ROOT` de 5 206 éléments
réutilisé de `TASK-0034`, dossier `C` à 4 356 enfants directs) :
panneau visible par défaut; masquer puis **fermeture et redémarrage réels
du processus** confirme masqué; réafficher puis **second redémarrage réel**
confirme visible; pagination de `C` sans chevauchement ni perte
aller-retour; sélection d'un enfant hors projection synchronisant carte et
détails; `map_reveal_node` sur cible synthétique; `Copier le chemin` cliqué
réellement, presse-papiers comparé **par ce script, hors du processus
applicatif**, correspondance exacte confirmée (`copyClipboardMatchesExpectedPath:
true`) sans que le chemin ne soit jamais journalisé; aucune fuite de chemin
absolu; **0 erreur console fatale** cumulée sur les trois passes.

### Validations

Rust **365 PASS** (344 + 21), TypeScript **339 PASS** (317 + 22), `pnpm
check`, `pnpm build`, `cargo build --offline`, `git diff --check` verts;
`cargo fmt` propre sur les lignes ajoutées; `cargo clippy --all-targets
--offline -- -D warnings` rouge à **26 erreurs**, même compte et mêmes
diagnostics qu'avant (décalés de quelques lignes par l'insertion), aucun
nouveau.

### Non testé, limites

Poste de développement, pas une acceptance laptop modeste. Le rejeu
WebView2 clique réellement sur « Copier le chemin » (sans risque de fenêtre
visible) mais invoque `map_reveal_node` directement, comme `TASK-0034`,
pour éviter un second `explorer.exe`. `map_copy_node_path` réutilise le mot
d'erreur `map_reveal_refused: <code>` de `map_reveal_node` plutôt qu'un
préfixe distinct — un choix de réutilisation délibéré, documenté dans
`MapError::RevealRefused`. Hors portée comme prévu : filtres, watcher,
FTS5, préférences moniteur/icône.
