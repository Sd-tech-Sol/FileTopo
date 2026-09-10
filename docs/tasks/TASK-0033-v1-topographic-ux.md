# TASK-0033 — V1 Progressive Topographic UX

- Date : 2026-09-10
- Statut : `READY`
- Branche : `build/v0.2-a17-v1-topographic-ux`
- Prérequis : `TASK-0032 = VERIFIED` par `ACTION-0049`
- Décision : `DEC-0034-progressive-topographic-view.md`, `APPROVED`
- Référence UX : `docs/product/REFERENCE_UX_OLD_FILETOPO.md`

## But

Faire converger le FileTopo actuel vers l'expérience visuelle et fonctionnelle de l'ancien prototype, sans revenir à son moteur ni créer d'architecture parallèle.

Le moteur actuel reste intact dans ses principes : Tauri + Rust + SQLite + React/TypeScript, local-first, REAL_ROOT, Index canonique, projection bornée et aucun corpus complet envoyé au frontend.

## Problème constaté

Le premier essai sur un vrai cerveau local a montré que l'indexation et la borne fonctionnent, mais que l'expérience reste mauvaise : trop de blocs, gros agrégats techniques, carte comprimée par le fit automatique, noms difficiles à lire et hiérarchie visuelle moins claire que dans l'ancien prototype.

L'ancien prototype fourni par l'utilisateur est la référence UX. Il indexait plusieurs milliers d'entrées mais sa carte topographique n'affichait qu'environ 54 blocs et 74 connexions : l'objectif est donc une petite carte sémantique lisible au-dessus d'un gros index, pas l'affichage du corpus.

## Portée obligatoire

1. Conserver `VIEW_BUDGET = 512` comme borne dure de sécurité.
2. Introduire une cible visuelle ordinaire d'au plus 64 vrais blocs, en priorité des dossiers.
3. Garder la racine et l'ancestry du focus prioritaires.
4. Éviter que les fichiers remplissent la carte d'ensemble lorsque des dossiers structurants existent.
5. Un fichier explicitement ciblé par une relation/navigation peut être matérialisé avec son contexte borné.
6. Ne plus rendre les agrégats comme de grands faux dossiers. Garder l'information exacte, mais la présenter comme indicateur compact sur le parent (`+N dossiers`, `+N éléments`, `Voir la suite`).
7. L'activation d'un indicateur doit remplacer la projection par de vrais nœuds issus de l'Index, sans accumulation hors budget.
8. Supprimer le `fitView()` global automatique à chaque changement de projection.
9. Garder `Ajuster à l'écran` comme action explicite; `Réinitialiser` doit revenir à une vue lisible centrée sur racine/focus.
10. Conserver pan, zoom, sélection, clavier, panneau contextuel, relations intra/inter-brain et navigation vers une cible hors projection.
11. Adapter le layout actuel plutôt que créer un moteur global : cartes lisibles, branches par profondeur, espace vertical suffisant, aucune superposition.
12. Faire converger le style vers la référence historique : fond clair quadrillé, cartes arrondies, racine sombre dominante, hiérarchie bleue, relations sortantes vertes, entrantes turquoise, bidirectionnelles violettes, police système/Segoe UI.

## Interdits

- Aucun second index/catalogue/store.
- Aucun snapshot complet frontend.
- Aucun layout global du corpus.
- Aucun nouveau renderer Canvas/WebGL/Pixi imposé.
- Aucun chemin absolu IPC.
- Aucun accès réseau/cloud/LLM/MCP.
- Aucun GPU requis.
- Aucun watcher/incrémental/FTS5 dans cette tâche.
- Aucun ajout de données privées du prototype historique dans Git.

## Fichiers à auditer avant code

- `docs/decisions/DEC-0031-one-canonical-brain-index-and-bounded-projection.md`
- `docs/decisions/DEC-0033-real-root-privacy-and-source-binding.md`
- `docs/decisions/DEC-0034-progressive-topographic-view.md`
- `docs/product/REFERENCE_UX_OLD_FILETOPO.md`
- `src-tauri/src/map/projection.rs`
- `src-tauri/src/map/layout.rs`
- `src-tauri/src/map/store.rs`
- `src/map/MapView.tsx`
- `src/map/MapApp.tsx`
- `src/map/types.ts`
- tests associés

## Preuves minimales

### Rust

- projection totale <= 512 entités;
- projection ordinaire <= 64 vrais blocs;
- ancestry/focus conservés;
- priorité dossier-first;
- pagination/navigation remplace la projection sans accumulation;
- comptes d'omission exacts;
- fichier explicitement ciblé servi avec contexte borné;
- aucune lecture/layout global du corpus réintroduit.

### TypeScript

- aucun gros bloc d'agrégat;
- aucun vocabulaire technique d'agrégat visible;
- indicateur compact navigable;
- aucun fit exhaustif automatique sur changement de projection;
- `Ajuster à l'écran` explicite fonctionne;
- reset/recentrage reste lisible;
- relations, sélection, clavier et panneau de détails ne régressent pas.

### Rejeu produit

Utiliser uniquement une arborescence synthétique générée, idéalement >= 5 000 éléments, pour reproduire l'échelle du vrai cas sans donnée privée. Vérifier au moins 1366x768 et 1920x1080 : vrais noms de dossiers visibles, carte non comprimée, pan/zoom, navigation de branche, relations autour d'une sélection, borne respectée, aucune fuite de chemin, aucune erreur console fatale.

## Sortie attendue

À la fin :

- code + tests + documentation sur `build/v0.2-a17-v1-topographic-ux`;
- `TASK-0033 = IMPLEMENTED`, jamais auto-`VERIFIED`;
- rapport complet dans `.orchestrator/RESULT.md`;
- `docs/ai/CURRENT_STATE.md`, `HANDOFF.md`, `NEXT_ACTION.md`, `VALIDATION.md`, `CHANGELOG_AI.md` mis à jour;
- aucune TASK-0034 précréée;
- `NEXT_ACTION` = contrôle indépendant de TASK-0033.
