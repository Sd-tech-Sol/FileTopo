# NEXT_PROMPT — TASK-0033 — V1 Progressive Topographic UX

**TARGET_AGENT:** CLAUDE CODE  
**STATUS:** READY  
**OWNER:** orchestrateur ChatGPT  
**MODE:** exécution technique ciblée  
**TASK:** `TASK-0033 — V1 Progressive Topographic UX`  
**BRANCHE:** `build/v0.2-a17-v1-topographic-ux`

## /goal

Reprendre FileTopo exactement à l'état du dépôt et implémenter `TASK-0033` sans nouvelle architecture. Conserver Tauri + Rust + SQLite + React/TypeScript, `REAL_ROOT`, l'Index canonique, la projection bornée et le renderer SVG existant. Faire converger la carte vers la lisibilité de l'ancien FileTopo : vrais noms de dossiers en blocs, branches lisibles, navigation spatiale, pan/zoom, panneau contextuel et relations visibles. La carte normale doit viser quelques dizaines de blocs utiles, pas 256 cartes + agrégats techniques. Ne jamais envoyer le corpus complet ni un chemin absolu au frontend.

---

## 0 — Préconditions

1. Lire `AGENTS.md`, `CLAUDE.md` et les protocoles actifs.
2. `git fetch origin`, fast-forward uniquement.
3. Travailler uniquement sur `build/v0.2-a17-v1-topographic-ux`.
4. Vérifier arbre propre avant code; divergence inexpliquée => `BLOCKED`.
5. `TASK-0032` est désormais `VERIFIED` par `docs/reviews/ACTION-0049-independent-recontrol.md`.
6. Lire avant code :
   - `docs/tasks/TASK-0033-v1-topographic-ux.md`
   - `docs/decisions/DEC-0034-progressive-topographic-view.md`
   - `docs/product/REFERENCE_UX_OLD_FILETOPO.md`
   - `docs/decisions/DEC-0031-one-canonical-brain-index-and-bounded-projection.md`
   - `docs/decisions/DEC-0033-real-root-privacy-and-source-binding.md`
   - `src-tauri/src/map/projection.rs`
   - `src-tauri/src/map/layout.rs`
   - `src-tauri/src/map/store.rs`
   - `src/map/MapView.tsx`
   - `src/map/MapApp.tsx`
   - `src/map/types.ts`
7. Audit de réutilisation d'abord : utiliser le SVG, la sélection, les relations, le panneau et le layout borné existants. Aucun nouveau renderer/store/index/catalogue.

## 1 — Projection topographique

- Garder `VIEW_BUDGET = 512` comme borne dure, agrégats inclus.
- Introduire une cible visuelle ordinaire de **<= 64 vrais blocs**.
- Racine + ancestry du focus toujours prioritaires.
- Dans la vue d'ensemble, prioriser les `DIRECTORY`; les fichiers restent dans l'Index et accessibles aux détails/analyses mais ne doivent pas saturer la carte.
- Un fichier explicitement ciblé par navigation/relation peut être matérialisé avec contexte borné.
- Navigation/pagination remplace la projection; ne jamais accumuler les pages précédentes hors budget.
- Aucun whole-corpus read, snapshot intégral IPC ou layout global.

## 2 — Remplacer les gros agrégats techniques

Le type technique peut rester pour préserver l'exactitude de `DEC-0031`, mais il ne doit plus être rendu comme une grande carte.

- Remplacer visuellement les rectangles `N enfants hors vue` par un indicateur compact attaché au parent.
- Vocabulaire utilisateur seulement : p. ex. `+17 dossiers`, `+23 éléments`, `Voir la suite`.
- Aucun `view_budget_or_focus`, `outside_current_projection`, `omitted_direct_children` ou vocabulaire interne visible.
- Activer l'indicateur => projection suivante contenant de vrais nœuds issus de l'Index.

## 3 — Layout et rendu

Adapter le moteur actuel, pas le remplacer.

- vrais noms de dossiers clairement lisibles;
- cartes plus proches du prototype historique : fond clair quadrillé, coins arrondis, ombre légère, racine sombre/dominante;
- branches hiérarchiques nettes par profondeur;
- espace vertical suffisant, aucune superposition;
- relations transversales discrètes au repos, fortes autour de la sélection;
- direction de palette documentée dans `REFERENCE_UX_OLD_FILETOPO.md`;
- police système / Segoe UI sur Windows;
- panneau contextuel droit et toolbar sans recouvrement.

Ne copier aucun nom, chemin, capture ou donnée privée de l'ancien prototype dans Git.

## 4 — Caméra / navigation

Le problème principal actuel est le `fitView(world)` automatique après chaque projection.

- Le supprimer comme comportement implicite.
- Première ouverture : échelle lisible centrée sur racine/focus.
- Entrer dans une branche : recentrer sur le nouveau focus sans miniaturiser toute la carte.
- Conserver le zoom/pan utilisateur lorsque spatialement cohérent.
- `Ajuster à l'écran` reste la seule action qui force un fit global.
- `Réinitialiser` revient à une vue lisible centrée, pas à un fit exhaustif.
- À 1366x768, autoriser le débordement + pan plutôt que réduire les cartes jusqu'à l'illisibilité.

## 5 — Interactions existantes à préserver

- clic/sélection;
- clavier;
- pan/zoom molette et boutons +/-;
- panneau parent/enfants;
- relations intra/inter-brain;
- navigation vers une cible hors projection en demandant une nouvelle projection;
- détails et diagnostics.

**Ne pas ajouter `Ouvrir dans Explorer` dans cette tâche** si cela exige une nouvelle surface Rust. Cette fonction viendra plus tard via `brain_id + node_id`, jamais via chemin IPC.

## 6 — Hors portée

Aucun watcher/incrémental, changements récents/vu-non-vu, FTS5/recherche avancée, préférence d'écran/icône, raccourci Bureau, Canvas/WebGL/Pixi obligatoire, réseau/cloud/LLM/MCP, GPU puissant ou nouvelle API filesystem frontend.

## 7 — Preuves obligatoires

### Rust

Prouver au minimum :

1. total projection <= 512;
2. vue ordinaire <= 64 vrais blocs;
3. ancestry/focus conservés;
4. priorité dossiers;
5. pagination/navigation remplace la projection sans accumulation;
6. comptes d'omission exacts;
7. fichier explicitement ciblé possible avec contexte borné;
8. aucun parcours/layout global réintroduit.

### TypeScript

Prouver :

1. aucun gros bloc d'agrégat;
2. aucun vocabulaire technique d'agrégat visible;
3. indicateur compact activable;
4. aucun auto-fit global sur changement de projection;
5. `Ajuster à l'écran` fonctionne explicitement;
6. reset/recentrage conserve une échelle lisible;
7. sélection, clavier, détails et relations sans régression.

### Rejeu WebView2

Utiliser **uniquement une arborescence synthétique générée**, idéalement >= 5 000 éléments. Vérifier 1366x768 et 1920x1080 si possible : vrais noms visibles, carte non comprimée, pan/zoom, navigation de branche, relations sélectionnées, borne respectée, aucune fuite de chemin, 0 erreur console fatale.

## 8 — Validation générale

Exécuter les suites ciblées puis complètes pertinentes : Rust, TypeScript, `pnpm check`, `pnpm build`, `cargo build --offline`, `git diff --check`, `cargo fmt --check` sur les fichiers touchés. Exécuter Clippy strict et rapporter honnêtement la dette historique; aucun nouveau diagnostic attribuable à TASK-0033.

## 9 — Documentation / sortie

Mettre à jour après implémentation :

- `docs/tasks/TASK-0033-v1-topographic-ux.md`
- `docs/ai/CURRENT_STATE.md`
- `docs/ai/HANDOFF.md`
- `docs/ai/NEXT_ACTION.md`
- `docs/ai/VALIDATION.md`
- `docs/ai/CHANGELOG_AI.md`
- `.orchestrator/RESULT.md`

À la fin :

- `TASK-0033 = IMPLEMENTED`, **jamais auto-VERIFIED**;
- `DEC-0034 = APPROVED`;
- aucun TASK-0034 précréé;
- `NEXT_ACTION = contrôle indépendant de TASK-0033`;
- commit + push uniquement sur `build/v0.2-a17-v1-topographic-ux`;
- aucun PR/merge/tag/release sauf instruction explicite ultérieure de l'orchestrateur.

Dans `.orchestrator/RESULT.md`, fournir HEAD, commits, fichiers modifiés, décisions techniques, résultats de tests, preuve WebView2, limites restantes, état Clippy, confirmation confidentialité, `TASK_STATUS: IMPLEMENTED`, puis `NEXT: independent control only`.
