# TASK-0063 — Stage B / B06 — Audit accessibilité, contrastes et navigation assistée

- Préparée par ChatGPT le 2026-10-12.
- **État : APPROVED / NOT STARTED.**
- Branche : `build/v0.2-b06-a11y-contrast`; issue de B05 vérifiée (ACTION-0116).
- Décision : `docs/reviews/ACTION-0116-task0062-independent-control.md`.
- Exécutant : Claude Code Sonnet, effort HIGH.
- Stage B seulement. **Mesurer avant de corriger**; ne pas déclarer l'ensemble de Stage B CLOSED.

## Risque et portée

B01–B05 ont validé l'interface responsive et les panneaux peuplés, mais axe-core reste `color-contrast: INCOMPLETE` (zéro violation automatique ne démontre pas WCAG 2.2 AA). Quelques textes ont été mesurés à 10,5px; le menu B04 est explicitement une superposition modale fonctionnelle sans certification ARIA; aucun vrai lecteur d'écran n'a été testé. Il faut identifier ce qui est prouvé, ce qui échoue et ce qui requiert encore une validation manuelle. Préserver l'intégralité des fonctions Stage A P-01..P-22; leur **replay intégral reste une porte distincte**.

Réutiliser les bibliothèques et harnais existants : axe-core intégré, `scripts/task0058-*`, `task0060-*`, `task0061-*`, `task0062-*`, et la configuration de tests UI. **Pas de nouvelle dépendance, nouveau framework, MCP/skill, ni nouveau harnais géant.**

## Exécution obligatoire

1. Après synchro Git, lire `AGENTS.md`, `docs/ai/START_HERE.md`, `docs/ai/CURRENT_STATE.md`, `docs/ai/NEXT_ACTION.md`, `docs/reviews/ACTION-0116-task0062-independent-control.md`, cette tâche et les règles de conception/accessibilité déjà versionnées. Vérifier l'outillage présent AVANT toute proposition de changement. Source officielle normative si nécessaire : W3C WCAG 2.2 (`https://www.w3.org/TR/WCAG22/`).
2. **BEFORE sans patch produit.** Dans le vrai hôte Windows Tauri/WebView2 (pas seulement jsdom ni Edge), avec états réellement peuplés strictement synthétiques, évaluer 960×640, 1280×800 et 1366×768, FR/EN, clair/sombre, compact/reduced-motion; menu B04 ouvert/fermé, statuts, panneaux Relations/Revue/Inter-cerveaux. Couvrir aussi le premier écran sans panneau. Réduire la matrice avec justification si nécessaire, mais indiquer exactement les états non évalués.
3. Mesurer et publier les contrastes réels texte/fond et éléments UI indispensables (norme de référence : **4,5:1** texte normal, **3:1** gros texte et frontières/icônes nécessaires), dans chaque thème. Tenir compte des états `:focus-visible`, `:disabled`, `:hover`, liens, pastilles, badges de provenance, menus, boutons de revue, avis fixes et éléments sur SVG si réellement applicables. Quand les couleurs semi-transparentes ou les fonds composés ne sont pas mesurables de manière défendable, marquer **INCOMPLETE / NOT MEASURED**, ne pas inventer un ratio.
4. Inspecter les exigences d'accès au clavier, focus visible et non masqué, ordre Tab/Shift+Tab, activation Entrée/Échap, noms/roles/états accessibles et taille/espacement des cibles pour **WCAG 2.2 AA** (incluant la cible 24×24 CSS px ou exception normative justifiée). Tester surtout le menu temporairement modal de B04 et le focus après APPROUVER de B05, sans inventer `aria-modal` ou déclarer qu'un vrai lecteur d'écran a été utilisé. Publier les erreurs/incomplete de axe.
5. Vérifier si une **vraie technologie d'assistance** (p. ex. Narrator déjà intégré à Windows) peut être essayée avec des actions humaines et des preuves pertinentes, sans installer de pilote ou outil sensible; si cette preuve ne peut être produite par l'agent, déclarer cette section **NOT MEASURED** et indiquer ce qui reste à faire. Aucune certification WCAG globale à partir de l'outil automatisé seul.
6. Pour **chaque défaut reproductible**, publier une mesure BEFORE ciblée et la règle WCAG affectée, puis autoriser seulement la **plus petite correction UI** dans `src/map/map.css`, `src/map/MapApp.tsx`, `src/map/CompositionBar.tsx`, `src/map/{RelationsPanel,ReviewQueuePanel,CrossRelationsPanel,DetailsPanel,ChangeJournalPanel}.tsx` et leurs tests ciblés directement liés. Aucun changement de logique métier, données réelles, index, moteur Rust, scanner, SQLite, IPC, projection, `MapView`, modèles de relations, `viewState`, `resumeState`, dépendance ou lockfile. Si un défaut critique exige une modification interdite ou un choix produit, **BLOCKED puis STOP**, pas de contournement.
7. Exécuter les mesures AFTER avec le **même harnais/critère**, publier une preuve de contre-épreuve qui aurait détecté l'ancien défaut, ainsi que les captures ciblées. Rejouer les garanties B03/B04/B05 pertinentes sur tout composant touché, P-19 et P-22 sur des racines synthétiques; carte immédiatement visible ≥240px, 13/13 commandes, modal B04 sans double activation, focus B05 après APPROUVER. Faire une vérification différentielle que les données/sources n'ont pas changé.
8. `pnpm test`, `pnpm check`, `pnpm build`, `git diff --check`. Surveiller `workspaceMapApp` et `brainIdentity` (intermittences connues), distinguer défaut reproduit, échec lié au patch, et cause inconnue; ne pas relâcher tests ou seuils pour afficher un faux PASS. GitHub CI seulement si elle est effectivement lancée.
9. Livrer le tableau des critères **PASS / FAIL / INCOMPLETE / NOT TESTED**, les échantillons de contraste et leur calcul, captures/JSON et un rapport honnête sur la couverture; ajouter les scripts minimaux nécessaires sous `scripts/task0063-*` si réutilisation directe impossible, preuves sous `docs/performance/runs/TASK-0063-*`. Actualiser `.orchestrator/RESULT.md`, `docs/ai/{CURRENT_STATE,HANDOFF,NEXT_ACTION,VALIDATION,CHANGELOG_AI}.md` et cette fiche; **IMPLEMENTED** ou **BLOCKED**, jamais VERIFIED.

## Invariants et arrêt

- Aucun accès à des fichiers personnels ou à l'interface privée de référence. Sources de test synthétiques seulement, Windows host réel si disponible, aucune sortie de données réelles.
- Ne pas changer le comportement produit démontré : Stages A, B03/B04/B05, P-19/P-22, relation validée par humain, lecture seule, carte au premier écran, commandes et menu.
- Ne pas prétendre que le contrôle accessibilité vaut replay complet P-01..P-22 ni certification WCAG. Même après B06, **Stage B reste ouverte** jusqu'à décision indépendante et replay complet.
- Aucun nouveau TASK-0064, Stage C/D, R8, PR, fusion vers `main`, tag ou release.
- Commit/push **B06 seulement**, sans réécriture, puis STOP; ChatGPT vérifie ensuite directement GitHub.
