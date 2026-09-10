# TASK-0033 — V1 Progressive Topographic UX

- Date : 2026-09-10
- Statut : `IMPLEMENTED`, jamais auto-`VERIFIED`. Exécuteur : Claude Code.
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

## Livraison — 2026-09-10

Détail complet dans [VALIDATION section BE](../ai/VALIDATION.md) et
[CURRENT_STATE.md](../ai/CURRENT_STATE.md). Résumé :

- `src-tauri/src/map/projection.rs` : `ORDINARY_MATERIAL_TARGET = 64`
  remplace le plafond de 256 pour un focus ordinaire; `VIEW_BUDGET`/
  `MATERIAL_BUDGET` inchangés comme bornes dures. Priorité dossier-first
  obtenue par la cible plus petite, sans nouveau tri : `idx_nodes_child_order`
  ordonnait déjà chaque page dossiers-avant-fichiers depuis `DEC-0030`.
  Ancestry/focus jamais tronqués au-delà de la cible
  (`effective_target = ORDINARY_MATERIAL_TARGET.max(selected.len()).min(MATERIAL_BUDGET)`).
- `src/map/MapView.tsx` : l'agrégat se dessine en pastille compacte
  (`AGGREGATE_PILL_MIN_WIDTH`/`AGGREGATE_PILL_HEIGHT`, très sous les
  `240 × 64` d'une carte) avec le libellé produit `aggregateLabel()`
  (« +N élément(s) — Voir la suite »), jamais le vocabulaire interne du
  backend. Grille de fond ajoutée via `<pattern id="map-grid-pattern">`.
- `src/map/viewState.ts` : `readableView()` (échelle lisible centrée, jamais
  un fit exhaustif) et `recenterOnFocus()` (pan minimal, échelle inchangée)
  remplacent `fitView(world, …)` partout sauf sur l'action explicite
  « Ajuster à l'écran » (et le raccourci `f`/`F` sur la sélection).
- `src/map/MapApp.tsx` : la première ouverture d'une composition et le
  bouton « Réinitialiser » utilisent `readableView`; l'effet de changement de
  projection utilise `recenterOnFocus` — plus aucun `fitView` global n'est
  appelé à chaque navigation ni à l'ouverture.
- Tests ajoutés : 3 tests Rust (`projection_tests.rs`), 9 tests TypeScript
  (`viewState.test.ts`, `projection.test.tsx`). Suites complètes : Rust
  **327 PASS**, TypeScript **289 PASS**, `pnpm check`, `pnpm build`,
  `cargo build --offline`, `git diff --check` verts; `cargo fmt --check`
  propre sur les fichiers touchés; `cargo clippy --all-targets --offline --
  -D warnings` rouge à **26 erreurs**, aucune nouvelle.
- **Non testé, déclaré explicitement : aucun rejeu WebView2** dans cette
  passe (ni 1366×768 ni 1920×1080, ni arborescence synthétique à grande
  échelle). La lisibilité produit sur un vrai volume n'est donc prouvée qu'au
  niveau unitaire/composant, pas au niveau produit — à faire avant tout
  `VERIFIED`.
- Palette de relations par direction (sortante/entrante/bidirectionnelle) de
  `REFERENCE_UX_OLD_FILETOPO.md` **non reprise** : laissée à une tranche
  ultérieure, comme direction plutôt que dépendance.

## Passe d'acceptation produit WebView2 — 2026-09-10

Suite à `ACTION-0050` (contrôle indépendant : code cohérent, mais rejeu
produit obligatoire manquant). Détail complet dans
[VALIDATION section BF](../ai/VALIDATION.md).

- **Rejeu réel exécuté** : arborescence synthétique `REAL_ROOT` de **5 206
  éléments** (générée par `scripts/task0033-seed-proof.py`, quatre branches
  délibérément déséquilibrées — `A` 120 sous-dossiers, `B` 40 dossiers + 90
  fichiers, `C` 4 356 fichiers plats, `D` une chaîne de 15 niveaux), pilotée
  en WebView2 réel (`scripts/task0033-webview2.mjs`/`.ps1`) à **1366×768**
  puis **1920×1080** dans le même processus. Preuve non canonique :
  [`docs/performance/runs/TASK-0033-webview2.json`](../performance/runs/TASK-0033-webview2.json).
- **Un vrai défaut trouvé et corrigé dans la portée de cette tâche.**
  `materialize_view` continuait, après la page des enfants directs du focus,
  à paginer récursivement les enfants du **premier** enfant rencontré tant
  que la cible n'était pas atteinte — un reliquat d'avant `DEC-0034`. Sur un
  arbre où ce premier enfant a un gros sous-arbre (`A`, 120 dossiers), cela
  consommait presque toute la cible de 64 sur une seule branche arbitraire,
  masquant les vraies branches soeurs (`B`, `C`, `D`) de la vue racine —
  exactement ce que `DEC-0034` B interdit. **Corrigé :** l'expansion
  automatique s'arrête désormais aux enfants directs du focus; descendre
  d'un niveau est toujours une navigation explicite. Un test Rust dédié
  (`ordinary_view_never_pulls_in_grandchildren_even_from_a_small_branch`)
  verrouille ce comportement. Quatre tests préexistants qui présupposaient
  l'ancien comportement (obtenir un nœud imbriqué via la vue par défaut) ont
  été corrigés pour naviguer explicitement plutôt que de changer le contrat
  produit qu'ils testaient par ailleurs.
- **Un second défaut trouvé et corrigé, dans la caméra.** `.map-view` peut
  grandir après le premier positionnement (le panneau latéral se remplit de
  vraies données de manière asynchrone, ce qui change la hauteur de rangée
  de la grille `.app__main`); rien ne réappliquait alors les bornes de la
  caméra à la nouvelle taille, laissant la vue échouée hors du canevas
  visible. **Corrigé :** un effet dédié réapplique `clampView` (jamais un
  recentrage) à chaque changement de dimensions du viewport, en plus de
  l'effet d'ouverture existant.
- **Preuves confirmées en conditions réelles :** cible ordinaire ≤ 64
  respectée; dossiers d'abord sur un dossier purement dossiers (120 → 62
  affichés, 58 omis) et sur un dossier mixte (40 dossiers + 90 fichiers → 40
  dossiers + 22 fichiers affichés, aucun fichier avant qu'un dossier ne le
  soit); continuation sans accumulation sur la pile plate; navigation vers
  la chaîne profonde; caméra à échelle constante lors d'une navigation de
  branche; `Ajuster à l'écran` produit bien un fit exhaustif (échelle très
  inférieure à l'échelle lisible sur cette colonne haute); `Réinitialiser`
  revient à l'échelle lisible (`1`), jamais au fit exhaustif; pastille
  d'agrégat mesurée à 150×34, très sous une carte 240×64; aucun vocabulaire
  interne, aucune fuite de chemin absolu, 0 erreur console fatale aux deux
  résolutions.
- **Incohérence documentaire signalée par `ACTION-0050` corrigée** : la
  fiche et `HANDOFF.md` disaient encore que `fitView` restait utilisé à la
  première ouverture; c'est `readableView` depuis la livraison initiale.
- **Validations rejouées après correction** : Rust **328 PASS** (327 + 1
  nouveau test de régression), TypeScript **289 PASS** (inchangé),
  `pnpm check`, `pnpm build`, `cargo build --offline`, `git diff --check`
  verts; `cargo fmt --check` propre sur les fichiers Rust touchés par cette
  passe; `cargo clippy --all-targets --offline -- -D warnings` rouge à **26
  erreurs**, même compte qu'avant, aucune dans un fichier touché par cette
  passe.
- **Non testé, limite assumée :** poste de développement, pas une
  acceptance laptop modeste; le redimensionnement utilise
  `Emulation.setDeviceMetricsOverride` (CDP), pas un changement physique de
  moniteur.
- **État final :** `TASK-0033` reste `IMPLEMENTED`, **jamais auto-
  `VERIFIED`**. `DEC-0034` reste `APPROVED`. Aucune `TASK-0034` précréée.
  **Action unique suivante : nouveau contrôle indépendant de `TASK-0033`.**
