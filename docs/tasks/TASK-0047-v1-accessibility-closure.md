# TASK-0047 — V1 Accessibility Closure

- **Date :** 2026-09-25
- **Statut :** `READY`
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
