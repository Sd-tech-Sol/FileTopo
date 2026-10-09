# TASK-0060 — Stage B / B03 — Commandes primaires visibles, outils avancés accessibles

- **Date :** 2026-10-09
- **État :** APPROVED / NOT STARTED (documentation seulement; Claude Code n'a pas exécuté cette tâche).
- **Branche :** `build/v0.2-b03-primary-chrome`
- **Base :** `f5da1d41226c7fcf34a24351af8fe55b3bb4525b`, TASK-0059 `VERIFIED` par ACTION-0110.
- **Décision :** `docs/reviews/ACTION-0110-task0059-independent-control.md`
- **Exécuteur :** Claude Code Sonnet, effort **HIGH** par défaut (Opus seulement si nécessaire et signalé).
- **Stage :** B03, ni Stage C ni Stage D.

## Hypothèse produit falsifiable

B02 a rendu la carte visible, mais introduit une **triple navigation par défilement**. À 960×640, chrome = 176 CSS px affichés sur 723 de contenu, contrôles carte = 134 sur 625, aside = 422 sur 2192. La nav composition/identité/exclusions/actions = 389 px. Dans la capture initiale, une grande partie de l'interface primaire est invisible derrière deux bandes. C'est `B02-O1`, pas un défaut backend.

**Objectif :** à l'ouverture, garder immédiatement visibles le contexte/cerveau actif, **au moins une action de chargement/actualisation, la recherche, les commandes essentielles de caméra et la carte**, tandis que les opérations avancées et diagnostics demeurent clairement découvrables et utilisables au clavier/souris dans des régions sémantiques nommées. Préserver toutes les fonctions de Stage A. La composition, les exclusions et les réglages ne doivent pas devenir cachés sans indication.

## Portée B03 autorisée

- Rechercher la **réorganisation minimale** du haut de fenêtre et de `app__map-controls` : hiérarchie visuelle primaire/secondaire et accès explicite aux diagnostics/actions avancées. Évaluer prioritairement `<details><summary>` natifs et regroupement CSS, sans ajouter état applicatif ou persistance. Si `<details>` ferme des zones, étudier et corriger les usages unitaires/end-to-end qui attendent les contrôles visibles.
- UI autorisée : `src/map/MapApp.tsx`, `src/map/map.css`, `src/map/mapStrings.ts` si nécessaire pour les deux langues. Petits tests UI existants directement touchés par cette seule réorganisation sont permis **si** leur couverture sémantique est maintenue; nommer chacun et ce qu'il valide.
- Preuves : `scripts/task0060-*.mjs`/`.ps1` et `docs/performance/runs/TASK-0060-*` (sans effacer/revoir les témoins B01/B02), `src/map/responsiveLayout.test.ts`, `docs/tasks/TASK-0060-*`, `.orchestrator/RESULT.md` et les cinq fichiers `docs/ai/*` d'état/validation.
- **Interdits :** Rust/`src-tauri`, Index, SQLite, IPC, modèles de relations, source REAL_ROOT, calcul de projection, `MapView.tsx`, viewState, resumeState, dépendances/lockfile, nouveaux composants/frameworks/menu tiers, nouveaux services, nouvelle logique métier, modification des critères P-01..P-22, suppression de contrôles, `main`.
- Si les règles de portée rendent un correctif responsable impossible, consigner les preuves, statut **BLOCKED** et STOP. Pas d'extension autonome.

## Méthode d'exécution

1. Lire `AGENTS.md`, `docs/ai/START_HERE.md`, ACTION-0110, DEC-0015, DEC-0034, DEC-0044, DEC-0045, DEC-0051, TASK-0058/0059, leurs artefacts et les fichiers UI autorisés. Vérifier état Git, branche B03, base et absence de modifications locales.
2. **Préflight obligatoire :** rechercher où `CompositionBar`, `BrainIdentityEditor`, `ExclusionsPanel`, boutons diagnostic, recherche, filtres et outils sont déclarés et utilisés dans les tests existants et les harnais. Établir la liste de commandes invariantes (59 de la campagne B02, dont `data-testid`), les commandes primaires, avancées et le chemin d'accès au clavier. Ne pas changer des identifiants pour contourner un échec.
3. Capturer `BEFORE` dans le vrai Tauri/WebView2 à 960x640/1280x800/1366x768, FR/EN, clair/sombre, compact et reduced motion. Mesurer pixels visibles du chrome/carte, nombre de bandes qui doivent défiler **dans l'état de départ**, taille des panneaux, commandes visibles et atteignables. Utiliser une racine REAL_ROOT **strictement synthétique** et les harnais B02 (ou extension versionnée distincte).
4. Appliquer une petite réorganisation **explicite** des outils primaires versus avancés; préférer composants natifs accessibles, libellés FR/EN. Garder l'accès aux exclusions et diagnostics même sans souris. Ne pas transformer la carte en miniature par `fit` artificiel; ne pas forcer le zoom; ne pas changer l'ordre des nœuds/arêtes ni le modèle de caméra.
5. Rejouer le même tableau `AFTER` et démontrer la visibilité de la carte **au moins égale à la baseline B02 de 240 CSS px à toutes les tailles/états**, avec un **gain mesuré de place utile ou de visibilité des commandes primaires**. Objectif secondaire souhaitable de 300px sur 960x640, si atteignable sans perte de contrôle. Interdire le scroll horizontal et le scroll du document, conserver panneau droit et clavier. La commande avancée la plus éloignée doit être atteinte par Tab et par activation du groupe accessible qui la contient, sans perte de focus après fermeture.
6. P-19 : si un groupe de présentation n'est pas persisté, le mentionner comme tel; les préférences métier et la sélection/caméra restent restaurées entre deux vrais processus. P-22 strict before/after et aucune écriture sous racine. P-02/05/07/11/21 ciblées, sans prétendre revalider toute la parité. Mesurer contrastes axe INCOMPLETE sans les déclarer OK.
7. `pnpm test` au moins deux fois si le test `workspaceMapApp.test.tsx > writes the collapsed folders with the branch` rééchoue : toute instabilité supplémentaire inexpliquée bloque la promotion. `pnpm check`, `pnpm build`, `git diff --check`, WebView2 natif, captures avant/après à `scrollY=0`. Si tests Rust non touchés, mentionner non exécutés. CI GitHub absente tant qu'aucune exécution n'est confirmée.
8. Livrer mesures, captures, résultat `IMPLEMENTED` ou `BLOCKED` (jamais VERIFIED), état/HANDOFF/NEXT_ACTION/VALIDATION/CHANGELOG, commit + push sur **B03 uniquement**, puis STOP. Ne pas créer TASK-0061, Stage C/D, PR/merge/tag/release.

## Critères d'acceptation

- Les outils courants (cerveau actif, ouvrir/actualiser, recherche, caméra) ont un chemin visuel accessible au démarrage à 960x640; la carte reste immédiatement visible et utilisable; sa surface ne régresse pas sous 240px.
- L'inventaire de 59 commandes B02 est conservé en identité et reste atteignable, y compris derrière un groupe avancé étiqueté; interactions FR/EN, clair/sombre et clavier prouvées. Compter explicitement les commandes des groupes fermés sans confondre présence DOM et visibilité.
- Défilement horizontal 0, document à `scrollY=0`; aucune nouvelle superposition bloquante, pas de focus piégé, pas de changement involontaire de caméra/coordonnées/selection et aucune écriture source.
- Les scripts des tests historiques n'échouent pas simplement parce que l'interface a désormais un disclosure : les adapters/test harness concernés ouvrent le groupe par une action utilisateur explicite. Ne pas désactiver des assertions ni contourner les échecs.
- Contrôle final par ChatGPT sur GitHub avant toute tâche suivante; Stage A CLOSED et Stage B non CLOSED, R8 non levée.
