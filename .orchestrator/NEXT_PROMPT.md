# NEXT_PROMPT — TASK-0035 — V1 Context Panel, Direct Children & Safe Copy

**TARGET_AGENT:** CLAUDE CODE  
**RECOMMENDED_MODEL:** Sonnet 5, high effort  
**STATUS:** READY  
**OWNER:** orchestrateur ChatGPT  
**TASK:** `TASK-0035 — V1 Context Panel, Direct Children & Safe Copy`  
**BRANCHE:** `build/v0.2-a19-v1-context-panel`

## /goal

Implémenter intégralement `docs/tasks/TASK-0035-v1-context-panel.md`. `TASK-0034` est `VERIFIED` par `ACTION-0055`. Ne rouvrir ni recherche, ni projection progressive, ni frontière Explorer sans régression prouvée. Finir `IMPLEMENTED`, jamais auto-`VERIFIED`.

## 0 — Préconditions

- Appliquer `AGENTS.md` et `CLAUDE.md`.
- Basculer explicitement sur `build/v0.2-a19-v1-context-panel`, `git fetch origin`, fast-forward uniquement, arbre propre.
- HEAD doit contenir `ACTION-0055` et TASK-0035.
- Lire ACTION-0055, TASK-0035, DEC-0031/0033/0034, `brains.rs`, `index.rs`, `brain_index.rs`, `commands.rs`, `lib.rs`, `capabilities/default.json`, `MapApp.tsx`, `DetailsPanel.tsx`, `types.ts` et les tests/harness WebView2.
- Avant code, consigner dans `RESULT.md` : réutiliser / adapter / ne pas réactiver.

## 1 — Panneau masquable persistant

Réutiliser `BrainCatalog::meta()/put_meta()` et `catalog_meta`; pas de nouveau store/fichier/localStorage.

- préférence globale `details_panel_visible`, défaut `true`;
- petite surface IPC non sensible;
- bouton « Masquer les détails » / « Afficher les détails », clavier + souris;
- masquer ne modifie ni sélection, recherche, projection, relations ou composition;
- réafficher conserve le contexte;
- préférence prouvée après vrai redémarrage Tauri.

Pas de migration du catalogue si `catalog_meta` suffit.

## 2 — Enfants directs exacts et paginés

`detail.children` vient de la projection bornée et n’est pas une liste exhaustive. Créer une commande dédiée, p. ex. `map_node_children`, qui :

- reçoit `BrainNodeRef` + pagination/cursor + limite;
- passe par `resolve_brain` + `open_store`;
- réutilise `Index::children_page()`; pas de SQL parallèle;
- page <= 50;
- uniquement enfants directs, jamais petits-enfants;
- cursor/révision cohérents avec l’Index courant;
- aucun chemin absolu.

`DetailsPanel` doit utiliser cette page dédiée, afficher le total exact, permettre page suivante/précédente (ou historique de cursors borné), ne jamais accumuler des milliers de lignes, et sélectionner un enfant via la navigation existante.

## 3 — Copier le chemin côté hôte seulement

Ajouter « Copier le chemin ».

- React envoie uniquement `BrainNodeRef`;
- Rust lit le `relative_path` depuis l’Index, résout la racine en interne et réutilise la logique de confinement de `map_reveal_node`;
- chemin complet écrit au presse-papiers côté Rust;
- retour frontend = succès/erreur générique seulement;
- aucun chemin absolu dans DTO/DOM/log/erreur/artefact.

Auditer d’abord `tauri-plugin-clipboard-manager`. Si compatible : dépendance Rust épinglée, API Rust uniquement, aucun package JS et **aucune permission `clipboard-manager:*` frontend**; `capabilities/default.json` doit rester `core:default` uniquement. Si cette voie sûre est impossible, ne contourner ni par PowerShell/cmd/shell ni par permission large : rapporter cette sous-partie `BLOCKED`.

## 4 — Preuves

### Rust
- préférence absente => visible; persiste après réouverture du catalogue;
- enfants >50 : pages <=50, ensemble complet exact, aucun doublon/perte/petit-enfant, ordre déterministe;
- mauvais cerveau / vieux cursor-révision refusé;
- copie : commande reçoit seulement `BrainNodeRef`, Unicode/noms longs exacts, reparse/skipped/disparu refusé sans fuite;
- aucune permission frontend sensible ni commande 0.1 réactivée.

### TypeScript
- masquer/réafficher conserve sélection/contexte;
- liste d’enfants vient de la commande paginée, reste bornée et clavier utilisable;
- sélection enfant réutilise la navigation existante;
- copie envoie seulement `{reference:{brainId,nodeId}}`;
- aucun chemin absolu dans l’état/frontend.

### WebView2 réel
Réutiliser les harness existants sur données synthétiques uniquement :
1. panneau visible par défaut;
2. masquer -> vrai redémarrage -> toujours masqué; réafficher -> redémarrage -> visible;
3. dossier >50 enfants : total exact, page suivante, aucun petit-enfant;
4. enfant hors projection : carte/détails synchronisés;
5. copie sur cible synthétique : le harness compare le presse-papiers en mémoire, mais l’artefact ne conserve que `match: true/false`, jamais le chemin;
6. aucune fuite de chemin absolu; 0 erreur console fatale.

## 5 — Hors portée

Pas de watcher, journal de changements, nouveaux/non vus, filtres, FTS5, extraction de contenu, préférence moniteur/icône, nouveau renderer, réseau/cloud/IA.

## 6 — Validation et sortie

Exécuter tests Rust/TS ciblés + suites complètes, `pnpm check`, `pnpm build`, `cargo build --offline`, fmt Rust touché, Clippy strict avec dette préexistante distinguée, `git diff --check`, WebView2.

Mettre à jour TASK-0035, CURRENT_STATE, HANDOFF, NEXT_ACTION, VALIDATION, CHANGELOG_AI et `RESULT.md`. À la fin : TASK-0035 `IMPLEMENTED`, aucun TASK-0036, `NEXT_ACTION = contrôle indépendant`, commit/push seulement sur cette branche, aucun PR/merge/tag/release.
