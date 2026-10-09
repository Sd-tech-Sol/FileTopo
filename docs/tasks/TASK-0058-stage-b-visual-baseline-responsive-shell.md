# TASK-0058 — Stage B / B01 — Visual Baseline & Responsive Shell

- **Date :** 2026-10-09
- **Status :** `IN_PROGRESS` — démarrée le 2026-10-09 (point fixe vérifié : Stage A `CLOSED`,
  `P-01..P-22` = 22/22 `CLOSED/VERIFIED` dans `docs/product/parity-matrix-p01-p22.json`,
  aucune autre tâche `IN_PROGRESS`, `.orchestrator/NEXT_PROMPT.md` seul GO technique courant)
- **Branch :** `build/v0.2-b01-responsive-shell`
- **Base :** `81e7c4fa0135652fd4afae7f6c566628a64ef003` (ACTION-0107 Stage A CLOSED)
- **Chosen by :** `ACTION-0108`
- **Executor :** Claude Code, **Sonnet**, effort **MEDIUM**
- **Stage :** B only; A remains VERIFIED; C/D not started.

## Objectif falsifiable

Contrôler, sur un vrai hôte Tauri/WebView2, si le chrome 2 colonnes rend le contenu inaccessible ou horizontalement débordant à la plus petite fenêtre Windows déclarée (960x640) et aux tailles 1280x800/1366x768. Si défaut prouvé : correctif CSS minimal de disposition des panneaux/chrome; sinon : zéro changement produit, verdict documentaire (aucune réparation inventée).

## Reuse first

Lire `AGENTS.md`, `docs/ai/START_HERE.md`, `ACTION-0108`, `DEC-0015`, `DEC-0034`, `DEC-0045`, `DEC-0051`, `src-tauri/tauri.conf.json`, `src/main.tsx`, `src/map/map.css`, `src/map/MapApp.tsx` (sections JSX), `src/map/MapView.tsx` et les harnais `scripts/task0056-webview2.*`, `scripts/task0055-webview2.*`, `scripts/task0047-webview2.*`, `src/map/workspaceCss.test.ts`. Réutiliser les tests, axe-core, styles/tokens et commandes existants. Aucune librairie UI, aucun renderer, aucun outil externe, aucun téléchargement non nécessaire.

## Périmètre d'écriture produit

- AUTORISÉ SI défaut reproductible : `src/map/map.css`, règle de responsive chrome/panneaux existants exclusivement.
- AUTORISÉ en preuves : scripts nommés `scripts/task0058-visual.*` si un harnais additionnel est indispensable; test `src/map/responsiveLayout.test.ts` si garde statique utile; `docs/performance/runs/TASK-0058-*` synthétiques; note de résultat dans la fiche TASK; docs de mémoire `.orchestrator/RESULT.md` et `docs/ai/{CURRENT_STATE,HANDOFF,NEXT_ACTION,VALIDATION,CHANGELOG_AI}.md`.
- INTERDIT : changement de `src/map/MapApp.tsx`, `MapView.tsx`, CSS des cartes/arêtes internes si cela modifie la géométrie, tout `src-tauri`, IPC, Rust, SQLite, index, projection, limites, couleurs métier, critères P-01..P-22, changement de dépendance/lock, `src/App.css` prototype, `main`, `ROADMAP` ou `ACTION-0108`. Si inévitable : STOP/BLOCKED, pas de hors-scope silencieux.

## Méthode

1. Vérifier HEAD/branche/état Git propre et comparer au commit d'audit. Capturer mesures ET captures avant CSS, sur fixture générée uniquement, sans chemin personnel et sans fichier utilisateur. Préférer le harnais CDP WebView2 existant.
2. Observer à 960x640, 1280x800, 1366x768 : taille effective CSS du viewport, scrollWidth/clientWidth document et descendants chrome, largeur de la carte et de l'aside, superposition, tronquage réel d'actions, accès clavier au panneau. Refaire des états FR et EN et clair/sombre (les variantes peuvent être réparties en une matrice explicite, mais chaque taille doit être testée). Inclure une passe `prefers-reduced-motion: reduce` et densité compact. Distinguer scroll VERTICAL autorisé et débordement HORIZONTAL bloquant.
3. Si et seulement si un échec est prouvé, ajouter la règle responsive CSS la plus petite qui garde la carte utilisable et le panneau atteignable, sans changer le contenu, le DOM sémantique, l'ordre de tabulation ou les coordonnées SVG. Mesurer après dans les mêmes conditions.
4. Contrôles ciblés dans la vraie app : sélection nœud + détails P-07/P-11, reconnaissance parent/agrégats P-02, liens visibles/hors vue P-05, bascule panneau/langue/densité/état restauré P-19, focus/clavier/contraste P-21, fingerprint lecture seule et artefacts hors racine P-22. Aucun "pass" attribué si la preuve ne l'exerce pas. Conserver les exceptions de P-14 clipboard et P-11 device touchpad nommées.
5. `pnpm test`, `pnpm check`, `pnpm build`, `git diff --check`; exécuter les tests Rust uniquement si nécessaire (code Rust normalement inchangé), sans prétendre refaire le gate de Stage A. Signaler CI distante absente, compte des tests, anomalies.
6. Publier les artefacts synthétiques non sensibles et le rapport. Si productGaps ou a11y regression : `BLOCKED`, rapport et STOP. Sinon `IMPLEMENTED` seulement, jamais `VERIFIED`. Aucun démarrage d'une autre TASK.

## Critères d'acceptation

- Baseline WebView2 complète, état avant/après reproductible et HEAD exact.
- À toutes les tailles **supportées** : aucune commande ou surface produit perdue; pas de scroll horizontal involontaire ni overlay qui masque définitivement le panneau, clavier utilisable, focus visible; carte ne devient pas illisible pour faire un fit global; aucun changement de caméra involontaire causé par modification responsive.
- FR/EN, thèmes OS, motion reduce et compact ne créent ni régression de contraste ni perte d'action. Axe-core : violations et incompletes publiées; vérification interactionnelle clavier explicitée.
- Si correction : diff CSS chrome uniquement, aucune différence de comptes/arêtes/coordonnées mondiales, aucune mutation du catalogue/source. Si aucun défaut : diff produit vide, conclusion mesurée.
- Preuves P-02/P-05/P-07/P-11/P-19/P-21/P-22 dans leur périmètre; les 22 P complets seront rejoués avant fermeture Stage B, **pas** déclarés ici.
- Aucun nouveau package, zéro changement de contrat, pas de merge, pas de release, `main` intacte.

## Livrables et contrôle

Captures/mesures WebView2 pré/post sur fixtures synthétiques, commandes et sorties, scripts spécifiques éventuels, `.orchestrator/RESULT.md`, docs état/validation, commit(s) et push sur la branche B01. L'orchestrateur vérifie ensuite indépendant les nouveaux HEAD/diffs/preuves et donne ou refuse `VERIFIED`. Ne pas préparer `TASK-0059`.
