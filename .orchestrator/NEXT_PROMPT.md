# NEXT_PROMPT — TASK-0034 — V1 Find & Open

**TARGET_AGENT:** CLAUDE CODE  
**RECOMMENDED_MODEL:** Sonnet 5, high effort  
**STATUS:** READY  
**OWNER:** orchestrateur ChatGPT  
**MODE:** exécution technique ciblée  
**TASK:** `TASK-0034 — V1 Find & Open`  
**BRANCHE:** `build/v0.2-a18-v1-find-open`

## /goal

Implémenter `TASK-0034` telle qu'écrite dans `docs/tasks/TASK-0034-v1-find-open.md` : recherche locale bornée par nom/chemin relatif dans l'Index canonique, focalisation d'un résultat hors projection, puis action sûre « Ouvrir dans l'Explorateur Windows » basée uniquement sur `BrainNodeRef` côté IPC.

Ne crée aucune architecture parallèle. Réutilise `Index::query_nodes()`, `map_view`, `BrainNodeRef` et la logique historique de confinement/ouverture Windows lorsque sûre, mais **ne réactive jamais** l'ancien `Registry`, `query_collection_nodes` ou `reveal_indexed_node` comme surface produit.

`TASK-0034` doit finir `IMPLEMENTED`, jamais auto-`VERIFIED`. Le verdict appartiendra ensuite à l'orchestrateur indépendant.

---

## 0 — Préconditions Git et source de vérité

1. Appliquer `AGENTS.md`, `CLAUDE.md` et les protocoles actifs.
2. Basculer explicitement sur `build/v0.2-a18-v1-find-open`.
3. `git fetch origin`, puis fast-forward uniquement.
4. HEAD d'orchestration attendu au minimum : `81f9d2c` ou un descendant explicable contenant `TASK-0034` et ce prompt.
5. Arbre propre avant écriture; divergence inexpliquée => `BLOCKED`.
6. Lire avant code :
   - `docs/reviews/ACTION-0051-independent-recontrol.md`;
   - `docs/tasks/TASK-0033-v1-topographic-ux.md`;
   - `docs/tasks/TASK-0034-v1-find-open.md`;
   - `docs/decisions/DEC-0031-one-canonical-brain-index-and-bounded-projection.md`;
   - `docs/decisions/DEC-0033-real-root-privacy-and-source-binding.md`;
   - `docs/decisions/DEC-0034-progressive-topographic-view.md`;
   - `src-tauri/src/index.rs` (`Index::query_nodes`);
   - `src-tauri/src/map/brain_index.rs`;
   - `src-tauri/src/map/commands.rs`;
   - `src-tauri/src/lib.rs` (ancien `query_collection_nodes`, `resolve_indexed_target`, `reveal_indexed_node`, invoke handler actuel);
   - `src/map/MapApp.tsx`, `DetailsPanel.tsx`, `types.ts`, tests associés;
   - harnais WebView2 de TASK-0033 avant d'en créer un autre.
7. Avant de coder, confirmer dans `RESULT.md` quelles briques sont **réutilisées**, **adaptées** et **non réactivées**.

## 1 — Recherche : une seule source canonique

Implémenter une commande produit dédiée, nom raisonnable comme `map_search_nodes`, derrière le runtime courant.

Contraintes :

- cerveau résolu depuis le catalogue;
- `open_store()` obligatoire avant toute recherche;
- réutiliser `Index::query_nodes()`; ne dupliquer le SQL que si une impossibilité réelle est démontrée;
- aucune lecture de source/scanner;
- aucun `analysis_nodes`, `list_nodes` ou snapshot complet;
- requête vide => page vide, jamais un dump du corpus;
- limite serveur <= 50 résultats par page;
- résultat borné avec `total`, `offset`, `limit`, `indexRevision`;
- chaque hit contient uniquement identité de cerveau/nœud, nom, chemin relatif et type;
- aucun chemin absolu/root/source dans le DTO.

Tests : recherche nom, chemin relatif, casse, `%`, `_`, `\\`, pagination, total, isolement entre cerveaux, source indisponible après index mais recherche encore fonctionnelle, révision explicite.

## 2 — UI recherche

Dans la barre d'outils du cerveau focalisé :

- champ « Rechercher un dossier ou fichier »;
- recherche locale simple, sans FTS5;
- résultats nom + type + chemin relatif;
- pagination bornée si total > 50;
- effacement simple;
- accessibilité clavier raisonnable;
- aucun jargon technique.

Activation d'un résultat :

1. vérifier qu'il appartient encore à la révision attendue; sinon invalider/rechercher plutôt que réutiliser silencieusement un ancien `nodeId`;
2. appeler `map_view` avec `brainId + nodeId` comme focus;
3. remplacer la projection courante;
4. sélectionner le résultat;
5. laisser la caméra `TASK-0033` gérer le recentrage sans auto-fit;
6. afficher les détails normaux.

Après refresh/rebuild, invalider les résultats de recherche du cerveau concerné.

## 3 — Ouvrir dans l'Explorateur : frontière de sécurité

Créer une commande produit, p. ex. `map_reveal_node(reference: BrainNodeRef)`.

Obligatoire :

- **seul argument frontend : `BrainNodeRef`**;
- aucune chaîne `path`, `relativePath`, `root`, `folder`, `directory` ou target provenant du WebView;
- `resolve_brain` + `open_store` vérifient cerveau et binding;
- le `relative_path` est lu depuis l'Index canonique;
- la vraie racine est résolue côté Rust uniquement;
- adapter la logique `resolve_indexed_target()` historique : composantes normales, refus reparse/symlink/skipped, cible disparue/inaccessible refusée;
- `explorer.exe` lancé directement via `std::process::Command`, jamais via shell;
- dossier : ouvrir; fichier : sélectionner;
- aucun chemin absolu retourné, journalisé ou inclus dans une erreur frontend;
- aucune permission `shell:*`, `fs:*`, `opener:*`, `dialog:*` ajoutée à la capability WebView.

Ne pas enregistrer les anciennes commandes `query_collection_nodes` ou `reveal_indexed_node`.

## 4 — DetailsPanel

Ajouter une action « Ouvrir dans l'Explorateur » pour la sélection courante.

- invoque uniquement la nouvelle commande avec `reference`;
- succès discret;
- erreurs utilisateur génériques et sans chemin absolu;
- chemin relatif existant inchangé.

## 5 — Preuves structurelles

Ajouter des gardes qui échouent si :

- une commande search/reveal accepte une propriété de chemin venant du frontend;
- une permission shell/fs/opener/dialog frontend est ajoutée;
- une ancienne commande 0.1 est réenregistrée;
- le search DTO contient un champ absolu/root/source;
- la recherche dépasse 50 hits dans une page;
- un résultat d'une ancienne révision est activé silencieusement.

## 6 — Rejeu WebView2

Réutiliser le harnais TASK-0033 et son principe de `REAL_ROOT` synthétique >= 5 000 éléments. Adapter plutôt que créer un second framework.

Scénario obligatoire :

1. indexer le corpus synthétique;
2. rechercher par nom un fichier volontairement hors projection ordinaire;
3. confirmer résultat borné et `indexRevision`;
4. activer le résultat par entrée utilisateur réelle/CDP : la carte doit charger une nouvelle projection avec ce nœud sélectionné et le panneau cohérent;
5. effectuer refresh/rebuild puis prouver qu'un résultat de l'ancienne révision n'est pas réutilisé silencieusement;
6. tester l'action Explorer sur une **cible synthétique seulement**. Le retour réussi après `spawn` direct d'Explorer est suffisant; ne capture ni ne persiste le chemin absolu;
7. vérifier DOM/payload/log : aucune fuite de chemin absolu;
8. 0 erreur console fatale.

Si lancer Explorer laisse une fenêtre ouverte, ne tue jamais globalement `explorer.exe`; laisse Windows gérer la fenêtre ou ferme seulement une instance si une méthode sûre et ciblée existe.

## 7 — Validation générale

Exécuter au minimum :

- tests Rust ciblés search/reveal/privacy puis suite `cargo test --offline`;
- tests TypeScript ciblés puis suite complète;
- `pnpm check`;
- `pnpm build`;
- `cargo build --offline`;
- `cargo fmt --check` sur les lignes/fichiers touchés;
- `cargo clippy --all-targets --offline -- -D warnings`, dette historique distinguée de tout nouveau diagnostic;
- `git diff --check`;
- rejeu WebView2 ci-dessus.

Aucune donnée personnelle dans les tests, captures, logs ou artefacts Git.

## 8 — Documentation et sortie

Après implémentation, mettre à jour :

- `docs/tasks/TASK-0034-v1-find-open.md`;
- `docs/ai/CURRENT_STATE.md`;
- `docs/ai/HANDOFF.md`;
- `docs/ai/NEXT_ACTION.md`;
- `docs/ai/VALIDATION.md`;
- `docs/ai/CHANGELOG_AI.md`;
- `.orchestrator/RESULT.md`.

Harmoniser aussi l'état durable de `TASK-0033 = VERIFIED par ACTION-0051` là où les documents hérités disent encore qu'un recontrôle est attendu; ne réécris pas l'historique, ajoute/corrige seulement l'état courant.

À la fin :

- `TASK-0034 = IMPLEMENTED`, jamais auto-`VERIFIED`;
- `DEC-0031/0033/0034` inchangées sauf correction factuelle indispensable;
- aucun TASK-0035 précréé;
- `NEXT_ACTION = contrôle indépendant de TASK-0034`;
- commit/push uniquement sur `build/v0.2-a18-v1-find-open`;
- aucun PR/merge/tag/release;
- `RESULT.md` doit inclure HEAD, commits, réutilisation/adaptation, surface IPC finale, preuves search/revision/reveal, WebView2, validations, confidentialité, limites et dette restante.