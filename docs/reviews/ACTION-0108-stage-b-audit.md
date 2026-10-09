# ACTION-0108 — Audit indépendant Stage B / première tranche

- **Date :** 2026-10-09
- **Auteur :** ChatGPT, orchestrateur indépendant (aucun exécutant)
- **Base GitHub vérifiée :** `build/v0.2-a41-v1-real-root-relations` @ `81e7c4fa0135652fd4afae7f6c566628a64ef003`
- **Verdict :** **GO technique pour une première tranche B bornée ; A reste CLOSED**
- **Tâche suivante :** `TASK-0058`, `APPROVED / NOT STARTED` sur `build/v0.2-b01-responsive-shell`
- **Exécution aujourd'hui :** lecture des objets GitHub et audit statique ciblé; aucun test local Rust/JS ni WebView2 relancé par l'orchestrateur.

## 1. Chaîne d'autorité / contrôle réel

Le ref distant et l'API commits retournent exactement `81e7c4fa0135652fd4afae7f6c566628a64ef003`; le dernier commit clôt ACTION-0107. Comparaison `7f43d60a...81e7c4f` : 4 commits d'avance, uniquement documents/artefacts de preuve, aucun fichier produit. L'arbre de 822 entrées contient `TASK-0057` et `ACTION-0107`, aucune `TASK-0058`. Pas de branche Stage B avant cet audit; pas de run Actions attaché au HEAD contrôlé. Le fichier CI existe dans le dépôt : cela n'est pas une preuve de CI exécutée.

`ACTION-0107`, `RESULT.md`, `ROADMAP.md`, `CURRENT_STATE.md` et les 22 lignes JSON de `parity-matrix-p01-p22.json` convergent : 22/22 `CLOSED/VERIFIED` + `SATISFIED`, I-1..I-3 `SATISFIED`. Les preuves historiques 3 x 906/0/13 (Rust), WebView2 REAL_ROOT, P-22 inchangé et axe 0 sont **relues**, pas rejouées dans ACTION-0108. Le collage P-14 (presse-papiers hôte indisponible), la composition P-05 (vue bornée), la primitive commune P-11 (WheelEvent) et l'absence de CI distante demeurent déclarés, pas effacés.

## 2. Contrat exact de l'étape B

Références normatives : `ROADMAP.md` (A→B→C→D), `DEC-0015` B/D/E/F, `DEC-0020`, `DEC-0024`, `DEC-0034`, `REFERENCE_UX_OLD_FILETOPO.md`, `DEC-0044`, `DEC-0045`, `DEC-0051`, `CARTETOPO_FUNCTIONAL_PARITY.md`.

Stage B = **finition visuelle du runtime existant**, en gardant intactes les 22 exigences et 3 invariants : typographie, couleurs et contrastes, géométrie du chrome/panneaux, hiérarchie perceptuelle, états sélection/focus/survol, organisation responsive, mouvement non essentiel. CarteTopo reste référence FONCTIONNELLE, pas apparence à copier. La référence UX historique est une direction publique générique, jamais un droit d'utiliser les fichiers privés; `DEC-0034` encadre la carte dossier-first, la racine dominante, le quadrillage, les arêtes hiérarchiques, les indicateurs compacts, la navigation progressive et le panneau droit.

Stage B **n'est pas** l'occasion de changer les identités, le rendu des données, les requêtes, les commandes IPC, la persistance, les relations, le tri, l'Index, la borne de projection, l'algorithme layout ou les modèles. Sous `DEC-0024`, `layered-tree-cards-v1` et ses boîtes coordonnées restent inchangés. Toute mutation sémantique constatée est un BLOCKER et revient à l'orchestrateur, pas une réparation silencieuse.

## 3. Reuse-first / dettes visuelles constatées

**Existe et se réutilise :** `src/map/MapApp.tsx` est l'écran réel (pas `src/App.tsx`), `MapView.tsx` SVG, `mapVisualPrimitives.tsx`, `mapLegendContract.ts`, `MapLegend.tsx`, composants React existants, `map.css` (tokens, Segoe UI, thème OS clair/sombre, cartes et quadrillage, focus), `src/lib/locale.ts` (FR/EN), `WorkspacePreferences` (density et motion) et les tests/harnais WebView2 et axe-core déjà épinglé. Aucun kit UI, moteur graphique, package de thème ou design framework supplémentaire justifié.

**Dette statique confirmée :** `.app__main` déclare `grid-template-columns: minmax(0, 1fr) minmax(280px, 360px)`, et `map.css` n'a aucune media query de largeur (seulement `prefers-color-scheme`, `prefers-reduced-motion`). Les formulaires et barres utilisent en partie `flex-wrap`, donc **aucune rupture responsive n'est encore prouvée visuellement**. La fenêtre Tauri impose `minWidth: 960` / `minHeight: 640` et démarre à 1280 x 800; ne pas inventer un contrat mobile 320px. Vérifier d'abord en vrai WebView2 ce qui déborde, se comprime ou devient inatteignable à 960x640/1280x800/1366x768.

**Dette visuelle déjà nommée par la référence :** lisibilité sur 1366x768, vrais noms de dossiers, racine immédiatement reconnaissable, relations secondaires au repos et mises en évidence sur sélection, panneaux non couvrants, hiérarchie claire, indicateurs d'omission compacts et langage produit plutôt que jargon d'Index. **Ce sont des cibles à mesurer, pas une accusation que toutes sont en défaut aujourd'hui**. Un recalepinage du graphe ou changement des primitives de projection ne découle pas de l'audit.

## 4. Accessibilité / FR-EN / responsive / préférences

Chaque modification B doit maintenir : clavier réel Tab/Shift+Tab/Enter/Space/Escape, ordre et visibilité du focus, navigation du graphe, aria accessible, aucune information portée par la seule couleur, contraste texte >=4,5:1 sauf exceptions, non-texte WCAG applicable, axe-core réel (déclarer `incomplete`), deux langues avec chaînes et noms accessibles, thèmes OS clair/sombre, préférence `motion=system|reduce` + media query `prefers-reduced-motion`, densité de chrome sans changer le monde, scroll et zoom/pan sans piège, fenêtres redimensionnées jusqu'aux bornes supportées. Aucun fournisseur tiers ni télémétrie dans le harnais.

La perspective Stage B vérifie **les composants réels dans WebView2**. JSDOM est un garde-fou, pas une preuve de contraste visuel. Ne pas prétendre une certification WCAG exhaustive ni une preuve lecteur d'écran lorsqu'elle n'a pas lieu.

## 5. Non-régression et frontière des étapes

À chaque tranche : tests JS ciblés et complets, `pnpm check`, `pnpm build`, tests Rust affectés si interface backend touchée (normalement aucun), tests axe/clavier dans WebView2 aux états visuels touchés, étalon de géométrie de carte (nœuds, arêtes, compte exact, caméra stable). Utiliser les fixtures synthétiques et ne rien écrire sous une racine analysée. Préserver API/DOM/testids/semantics; ne pas affaiblir des tests pour faire passer le style.

**Avant clôture Stage B :** rejouer la matrice **P-01..P-22 EN ENTIER**, en incluant `REAL_ROOT` pour les six opérations de relations, `P-22` avec fingerprint strict avant/après, FR/EN, clavier, contraste/reduced-motion, thèmes, agrégats et vues bornées, restauration et isolation des cerveaux. Tout conflit exige correction ciblée, verdict indépendant et historique intact. Rappeler les réserves P-05/P-11/P-14 sans leur attribuer une couverture qu'on n'a pas mesurée.

**Stage C :** confirmation formelle Windows/Tauri/WebView2 et mesure de performance du moteur de production, R8, décision sur budget adaptatif, profils faibles/hautes charges; les essais WebView2 précédents établissent la fonction, **pas** la clôture de C. **Stage D :** packaging/installateur, audit de diffusion, documentation et décision explicite de release/PR/merge/tag.

**Fonctions différées :** extraction, OCR, FTS/sémantique, RAG, GraphRAG, IA/BYOK; nouvelles fonctions Windows/Explorer/écran, cloud ou mode équipe au-delà de la portée déjà prouvée; aucun réveil de fonctionnalités différées sans nouvelle décision produit. Ne pas transformer la vue en liste totale du corpus.

## 6. Première tranche retenue : TASK-0058

**Stage B / B01 — Relevé visuel WebView2 et correction conditionnelle du chrome responsive.**

1. Capturer un étalon mesuré avant modification (vrai Tauri/WebView2, synthétique, FR/EN, OS clair/sombre, 960x640 / 1280x800 / 1366x768).
2. Falsifier le comportement de la grille et l'accessibilité du panneau. Si défaut confirmé, corriger **uniquement CSS du chrome** (priorité `.app__main` / panneaux) et les tests/harnais correspondants; sinon **ne pas changer le CSS** et documenter le résultat.
3. Conserver SVG, coordonnées de la carte, JS/TSX produit, commandes IPC et stores inchangés; ne pas modifier la borne d'hôte de 960 x 640.
4. Comparer baseline/après et rejouer les contrôles ciblés (P-02/P-05/P-11/P-19/P-21/P-22), sans considérer que cette tranche remplace l'acceptance complète B finale.
5. Livrer mesures et captures exclusivement synthétiques, erreurs/limites, diff documenté. Aucun paquet ajouté. Aucun passage à C/D.

La tâche est assez étroite pour être falsifiable et ne dépend pas d'un choix esthétique arbitraire. L'agent devra s'arrêter si l'observation révèle un changement de contrat fonctionnel nécessaire. Aucune autre TASK n'est autorisée.
