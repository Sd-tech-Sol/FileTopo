# TASK-0047 — V1 Accessibility Closure

- **Date :** 2026-09-25
- **Statut :** `VERIFIED` (2026-09-26; ACTION-0079)
- **Branche :** `build/v0.2-a31-v1-accessibility-closure`
- **Décision :** `DEC-0045`
- **Portée :** `F-036`, partie accessibilité de `P-21`
- **Prérequis :** TASK-0046 / F-035 VERIFIED par ACTION-0077; audit ACTION-0078

## But

Fermer la **lacune réelle** d'accessibilité du runtime V1 en auditant le vrai
`MapApp`, en corrigeant uniquement les violations observées, puis en publiant
une preuve reproductible : audit automatisé local, parcours clavier, contraste,
alternatives non colorées et reduced motion.

Ne pas réécrire l'interface accessible déjà présente.

## A — préflight et audit reuse-first

Avant tout code :

1. synchroniser la branche en fast-forward et confirmer arbre propre;
2. lire DEC-0045, ACTION-0077, ACTION-0078, P-21, F-036;
3. inventorier les composants interactifs réels et les mécanismes déjà présents :
   - `MapView`;
   - `CompositionBar`;
   - toolbar/lifecycle;
   - recherche;
   - filtres;
   - journal;
   - DetailsPanel + enfants;
   - relations / cross-relations;
   - review queue;
   - duplicate explorer;
   - BrainIdentityEditor;
   - contrôle FR/EN;
4. inventorier `role`, `aria-*`, `tabIndex`, handlers clavier,
   `:focus-visible`, animation/transition et codages visuels;
5. dans RESULT, séparer clairement **existant réutilisé**, **à corriger** et
   **hors portée**.

## B — validation de la dépendance avant installation

Revalider `axe-core@4.13.0` avant l'ajout :

- paquet npm officiel `axe-core`;
- repository `dequelabs/axe-core`;
- version exacte 4.13.0;
- licence MPL-2.0;
- organisation/auteur cohérents avec Deque;
- dépendances npm déclarées;
- intégrité/lockfile.

Ajouter uniquement si tout concorde, par une version **exacte**, dev-only.
Ne pas ajouter `@axe-core/playwright`, `jest-axe`, un MCP Axe ou un service
cloud si `axe-core` seul suffit.

Si le contrôle ne peut pas être fait ou si les faits ont changé de façon
significative : STOP, RESULT = BLOCKED, ne pas substituer.

## C — baseline axe avant corrections

Construire un harnais local qui injecte le `axe-core` installé dans le vrai
WebView2 Tauri via le mécanisme de preuve existant.

Avant correction, publier un baseline machine-readable avec :

- version axe;
- moteur/WebView2;
- locale;
- préférence de thème;
- état/surface;
- violations : rule id, impact, WCAG tags, cibles;
- résultats `incomplete`;
- aucune donnée personnelle/source réelle.

La baseline doit ouvrir les surfaces, pas seulement auditer l'écran initial.

## D — corriger les violations réelles, pas les masquer

Pour chaque violation :

- corriger la cause minimale;
- conserver la logique métier;
- pas de `aria-hidden`, `tabIndex=-1`, suppression de rôle ou règle axe
  désactivée uniquement pour faire passer le test;
- aucune allowlist globale.

Un faux positif/inapplicable est permis **seulement** avec justification
précise par rule id + élément + preuve manuelle, dans l'artefact final.

## E — parcours clavier complet

Ajouter une preuve du vrai runtime à partir d'événements clavier réels du
navigateur.

Le harnais doit :

1. partir d'un focus connu;
2. parcourir Tab et Shift+Tab sans piège;
3. contrôler le focus visible;
4. activer les contrôles natifs et custom via Enter/Space;
5. exercer le menu de CompositionBar et ses flèches/Escape;
6. exercer la carte/arbre via son contrat clavier;
7. ouvrir/fermer l'éditeur d'identité;
8. utiliser recherche, filtres, journal, détails, relations, review queue et
   doublons;
9. démontrer que chaque classe d'action pointeur rencontrée a une voie clavier,
   ou documenter l'exception permise par WCAG quand la fonction dépend
   réellement d'un tracé/pointeur;
10. vérifier qu'une sortie de chaque zone est possible au clavier.

Publier la séquence logique et le focus avant/après; pas « testé manuellement »
sans données.

## F — focus et sémantique

Contrôler notamment :

- focus visible sur tous les contrôles atteignables;
- ordre de focus cohérent;
- focus non perdu après ouverture/fermeture de menu/formulaire;
- noms accessibles non vides et cohérents FR/EN;
- rôles/états ARIA valides;
- aucune clé ou structure React qui fasse disparaître un état accessible.

## G — contraste

Dans le vrai WebView2 :

- axe `color-contrast` actif;
- FR et EN;
- clair et sombre si le runtime sert les deux;
- texte normal >= 4,5:1, exceptions WCAG explicites seulement;
- grand texte selon le seuil WCAG applicable;
- contraste non textuel des composants/états lorsque requis par WCAG 2.2 AA.

Ajouter un contrôle déterministe des tokens/éléments critiques via couleurs
calculées du navigateur afin qu'une régression CSS simple casse la preuve.

## H — aucune couleur seule

Inventorier les sens portés visuellement et prouver une alternative non
colorée pour chacun, notamment :

- cerveau actif/focalisé;
- sélection/focus;
- NEW / UNSEEN / seen;
- filtre match/context/dimmed;
- source availability et watcher;
- relation direction/type/provenance;
- groupes/agrégats;
- états de review;
- tout autre codage découvert.

Les couleurs personnalisables des cerveaux ne doivent jamais être la seule
identification.

## I — reduced motion

Émuler `prefers-reduced-motion: reduce` dans WebView2 et vérifier les styles
calculés des éléments qui ont animation/transition dans le mode normal.

Le mode reduce doit supprimer/réduire les mouvements non essentiels et ne doit
casser aucune fonction.

## J — matrice d'audit réelle

Le résultat final doit auditer au minimum :

- locale FR + EN;
- préférence claire + sombre lorsque applicable;
- écran initial;
- menu composition ouvert;
- cerveau synthétique riche avec recherche/filtre/journal/détails/relations/
  review/doublons ouverts;
- cerveau REAL_ROOT généré par le harnais pour ses états différents;
- éditeur d'identité ouvert;
- état reduced-motion.

Aucune donnée personnelle. Les noms/racines sont générés par le harnais et
supprimés ensuite.

## K — régressions et invariants

Prouver que la tranche n'altère pas :

- VIEW_BUDGET 512;
- bounded projection / aucun whole-graph DTO;
- cerveau/source/index/journal/seen;
- resume state TASK-0044;
- watcher/reconciliation;
- FR/EN TASK-0046;
- identité TASK-0045.

Avant/après la session de preuve, SHA-256 de la source générée identique.

## L — tests

Obligatoire :

- tests unitaires ciblés pour chaque correctif;
- garde/régression axe adaptée sans dépendre uniquement de JSDOM pour le
  contraste;
- `pnpm test`;
- `pnpm check`;
- `pnpm build`;
- `cargo test --offline`;
- `cargo build --offline`;
- `pnpm tauri build --debug --no-bundle`;
- `git diff --check`;
- `scripts/audit-public-readiness.ps1 -AllowRemotes`;
- vrai WebView2 avec artefact JSON dédié TASK-0047.

Clippy : mesurer, séparer toute dette historique. Ne pas élargir la tranche pour
la nettoyer.

## M — falsification

Créer au moins les sabotages suivants et prouver que la validation les attrape :

1. retirer le chemin clavier d'une action importante;
2. masquer le focus visible;
3. rendre un texte critique insuffisamment contrasté;
4. retirer l'alternative non colorée d'un état;
5. casser `prefers-reduced-motion`;
6. introduire une violation ARIA que axe-core détecte.

Les sabotages ne restent pas dans le commit final.

## N — documentation finale

À la fin :

- `TASK-0047 = IMPLEMENTED`, jamais auto-VERIFIED;
- `F-036 = IMPLEMENTED`, pas VERIFIED;
- partie accessibilité de `P-21` prête pour contrôle indépendant;
- `P-21` reste PARTIELLE jusqu'au contrôle indépendant;
- `P-19` reste PARTIELLE;
- aucune TASK-0048;
- aucune « certification WCAG » générale;
- documenter violations corrigées, exceptions/incomplete, parcours clavier,
  contrastes, non-couleur et reduced motion.

## O — gouvernance Git

- aucun PR / merge / tag / release;
- commit(s) propres sur la branche courante;
- push sur `build/v0.2-a31-v1-accessibility-closure`;
- remplir `.orchestrator/RESULT.md`;
- `NEXT_ACTION = contrôle indépendant de TASK-0047`;
- arbre propre.

---

## Exécution — 2026-09-26 (exécuteur Claude Code, Sonnet 5)

Commit produit `ec22b07`; preuves `docs/performance/runs/TASK-0047-baseline-webview2.json` (avant
corrections, code de base `29170ec`) et `docs/performance/runs/TASK-0047-webview2.json` (code final).
Détail chiffré : `docs/ai/VALIDATION.md` section CF.

### A — existant réutilisé / à corriger / hors portée

- **Réutilisé tel quel :** l'arbre `role=tree` + `aria-activedescendant` + `handleKeyDown` de `MapView`, le
  menu clavier de `CompositionBar`, les labels/alertes/`aria-invalid` du formulaire d'identité, le
  `:focus-visible` global, le bloc `prefers-reduced-motion`, les mots + symboles de tous les codages
  (états, filtres, source, watcher, relations, revue). Aucun composant réécrit, aucun framework.
- **Corrigé (chaque écart est mesuré dans le baseline, jamais supposé) :** voir « Corrections » ci-dessous.
- **Hors portée, inchangé :** P-19; toute préférence d'accessibilité; Rust; source/Index/journal/seen/resume/
  watcher; la boîte de dialogue native de couleur (dialogue système).

### B — dépendance

`axe-core@4.13.0` revalidé avant installation : paquet npm officiel, dépôt `dequelabs/axe-core`
(actif, non archivé), licence **MPL-2.0**, mainteneurs Deque (`dqlabs`, `npmdeque`), publié par GitHub Actions
avec provenance SLSA, **0 dépendance**, intégrité `sha512-UzGt8zg7…HKcy0A==` identique au lockfile.
Ajouté **seulement** comme devDependency exacte; jamais importé par le bundle produit; chargé localement
dans WebView2 par le harnais. Ni `@axe-core/playwright`, ni `jest-axe`, ni MCP/service.

### C/D — baseline (avant corrections) puis corrections

Baseline, 36 cellules (9 états × FR/EN × clair/sombre) : **16 violations axe** (2 règles) et **212 constats**
au total, dont : contraste de texte 58, contraste non textuel (bordure des champs) 44, `incomplete` axe
mesurés en échec 54, focus invisible sur la carte 11, focus hors du canevas sur un agrégat 20, focus perdu
sur `<body>` 7, agrégat non conforme 2.

| # | Écart mesuré (WebView2 réel) | Cause minimale | Correction |
|---|---|---|---|
| 1 | axe `aria-valid-attr-value` (critique) : `aria-activedescendant` nommait une carte non dessinée (sélection trouvée par recherche, hors vue bornée) | référence d'id vers un élément absent | `MapView` : pas d'`aria-activedescendant` si la carte n'est pas dessinée |
| 2 | axe `aria-required-children` : `role=button` (agrégat « +N éléments ») dans `role=tree` | un arbre ne possède que des `treeitem` / `group` | l'agrégat devient `role=treeitem` + `aria-level` (parent + 2), toujours focalisable, Entrée/Espace inchangés |
| 3 | focus sur un agrégat que le pan a laissé hors du canevas (invisible, non atteignable à l'œil) | aucun recadrage au focus | `onFocus` → `ensureRectVisible` (mécanisme existant de la sélection) |
| 4 | focus perdu sur `<body>` après Entrée sur un agrégat (l'élément est remplacé) | élément démonté | le focus revient à l'arbre (dont `aria-activedescendant` nomme la sélection), seulement s'il est réellement perdu |
| 5 | le contour de focus de la carte ne change **aucun pixel** | contour extérieur rogné par `.map-view { overflow: hidden }` | `.map-view__canvas:focus-visible { outline-offset: -3px }` |
| 6 | sombre : noms de cartes (`--ink` clair) sur cartes claires (1,4–2,2:1) | `--directory` / `--file` / `--skipped` non redéfinis en sombre | 3 jetons sombres (≥ 4,5:1 à toutes les opacités, calculé par test et mesuré) |
| 7 | sombre : titre de territoire noir sur fond sombre (1,16:1) | `.map-territory__title` sans aucune règle | `fill: var(--ink)`; le territoire focalisé en gras |
| 8 | clair : nom et étiquette de filtre de la racine (1,5:1) sur carte racine sombre; 2,9:1 quand la racine est atténuée (0,66) | `--ink` sombre sur `--root`; opacité d'état | `.map-node__label--root` / `.map-node--root .map-node__filter-tag` en clair; racine à 0,95 quel que soit l'état |
| 9 | bordure des champs texte 1,4:1 (WCAG 1.4.11); *placeholder* 3,6:1 en sombre | `--line` (filet décoratif); défaut du moteur | bordure `--ink-soft`; `input::placeholder { color: var(--ink-soft); opacity: 1 }` |
| 10 | Entrée sur un contrôle qui se désactive pendant son action (Analyser, Observer, Actualiser, ajout d'un cerveau) : focus sur `<body>`, non rendu | `disabled` pendant l'action | `useRestoreFocusAfterDisabled` (`focusRestore.ts`) : rend le focus au contrôle réactivé (ou à son remplaçant de même `data-testid`), sans commande ni état |
| 11 | retrait d'une pastille (×) : le focus tombe sur `<body>` | l'élément disparaît avec le focus | le focus passe à la pastille qui reste (cerveau focalisé) |

### E–I — parcours clavier, focus, contraste, non-couleur, mouvement

Voir VALIDATION CF (chiffres) et l'artefact. Séquences Tab / Shift+Tab sur 9 états (646 arrêts), focus
prouvé visible **par pixels** (capture de l'élément focalisé vs flou), contraste de l'indicateur ≥ 4,71:1,
12 parcours (101 pas) d'événements clavier réels, contraste texte / glyphes / champs / pseudo-éléments /
objets graphiques calculé sur les styles réels (6 420 éléments de texte), 13 codages avec alternative non
colorée, `prefers-reduced-motion` avec sonde.

### J–K — matrice et invariants

Matrice : 9 états × FR/EN × clair/sombre (36 cellules), dont l'écran initial, le menu, l'éditeur (avec
refus), le cerveau adossé à un dossier riche, le cerveau synthétique riche, deux et trois cerveaux composés
(agrégat) et le mouvement réduit. VIEW_BUDGET 512 : 10 cartes dessinées au plus; le cerveau large (127
nœuds) n'en dessine que 4. Neuf fenêtres passives (marches Tab) : **0 commande** du produit, catalogue,
reprise, Index, journal, seen et SHA-256 de la source inchangés; SHA-256 des deux racines identique avant /
après (le harnais ajoute un seul fichier, documenté, avant la référence).

### M — falsification

Six sabotages du produit réel, chacun **attrapé** en WebView2 (voir VALIDATION CF.7), plus 15 tests
unitaires qui échouent contre le code de base. Aucun sabotage ne reste dans le commit.

### Écarts d'exécution assumés

- L'agrégat passe de `role=button` à `role=treeitem` : `projection.test.tsx` a été mis à jour (nombre de
  `treeitem` = cartes + agrégats; recherche par rôle `treeitem`). Le comportement (Entrée / Espace,
  aucune sélection inventée) est inchangé.
- Le harnais garde une option `TASK0047_FAIL_FAST` (arrêt au premier constat) utilisée pour les
  falsifications; elle ne modifie aucun produit.


## Contrôle indépendant — ACTION-0079 — VERIFIED — 2026-09-26

- HEAD contrôlé : `5d6a88036eac0a6b23564c677021e868b91d5cb4`; commit produit : `ec22b07`.
- Baseline 16 violations / 212 problèmes et final 0 / 0 recoupés; 74/74 cibles axe incomplete revues PASS.
- Clavier, focus, contrastes, alternatives non colorées, reduced motion, invariants et frontière frontend recoupés indépendamment.
- **TASK-0047 = VERIFIED; F-036 = VERIFIED dans sa portée; P-21 = CLOSED / VERIFIED par ACTION-0077 + ACTION-0079.**
- P-19 reste PARTIELLE. Détail : [ACTION-0079](../reviews/ACTION-0079-task0047-independent-control.md).
