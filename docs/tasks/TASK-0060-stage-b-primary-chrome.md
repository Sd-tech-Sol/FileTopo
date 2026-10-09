# TASK-0060 — Stage B / B03 — Commandes primaires visibles, outils avancés accessibles

- **Date :** 2026-10-09
- **État :** `IMPLEMENTED` — jamais `VERIFIED` par l'exécuteur. Résultats mesurés en §Résultats.
- **Branche :** `build/v0.2-b03-primary-chrome`
- **Base :** `f5da1d41226c7fcf34a24351af8fe55b3bb4525b`, TASK-0059 `VERIFIED` par ACTION-0110.
- **HEAD mesuré :** `before` = `a03b8bc0a3ed75abca10012cdbbea5a4fc090663` (produit inchangé), `after` = `a645303631db59063b463bc4d44f0cf4f95bc258`.
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

## Résultats mesurés — `IMPLEMENTED` le 2026-10-09

Campagnes WebView2 réelles, **même harnais et même procédure pour les deux
phases** : `scripts/task0060-primary-chrome.ps1 -Phase before|after`, trois
tailles réelles redimensionnées par `SetWindowPos`, six états, deux processus.

- `before` — `docs/performance/runs/TASK-0060-primary-chrome-before.json`, HEAD `a03b8bc`
- `after` — `docs/performance/runs/TASK-0060-primary-chrome-after.json`, HEAD `a645303`
- douze captures `docs/performance/runs/TASK-0060-{before,after}-*.png`, prises à `scrollY=0`

### Ce que la tranche devait faire

| Mesure, 18 états | `before` | `after` |
|---|---|---|
| Les **13 commandes usuelles** vraiment sur le premier écran | 9/13 à 960x640, 10/13 aux deux autres tailles | **13/13 dans 18 états sur 18** |
| ... et **entières**, non rognées par une bande | 7/13 au pire | 10/13 au pire, **13/13 dans 13 états sur 18** |
| `brain-add-real-root`, `lifecycle-open`, `lifecycle-refresh` | **0 état sur 18** | **18 états sur 18** |
| `composition-add-trigger` | absent des 6 états à 960x640 | présent dans les 18 |
| Commandes réellement à l'écran, pire état | 16 sur 59 | **19 sur 59** |
| Commandes entières, pire état | 14 | 16 |
| Carte visible, pire / meilleur | 240 / 240 | **240 / 474** |
| Bandes qui défilent à 1280x800 et 1366x768 | chrome + commandes carte + aside | **aside seul** (chrome 183/183, carte 121/121) |
| Bandes qui défilent à 960x640 | les trois | chrome + aside; la bande carte ne défile plus |

Détail de la carte, `after` : 240–263 px à 960x640, 422–474 px à 1280x800,
390–442 px à 1366x768, exploitable au test de pointage dans les 18 états.
L'objectif **souhaitable** de 300 px est atteint à 1280x800 et 1366x768, **pas**
à 960x640.

Ledger du chrome à 960x640, état `fr-light` : en-tête 163 → **99**, nav
composition/identité/exclusions/actions 389 → **82**, diagnostics 38 + rapports
83 → **deux lignes de 35 px**. Contenu de la bande 703 → **281** pour une boîte
de 176. Bande des commandes carte : contenu 625 → **121**, soit exactement sa
boîte — elle ne défile plus.

### Ce qui ne devait pas bouger, et n'a pas bougé

- **59 commandes dans le DOM** dans les 18 états, `before` comme `after`, mêmes
  `data-testid`; **28** d'entre elles sont dans un groupe fermé. Présence et
  visibilité sont comptées **séparément** et jamais additionnées.
- **Clavier, les trois groupes** : `summary` atteint en 12, 13 et 20 tabulations
  avec un anneau de focus de 3 px, ouvert par `Entrée`, commande la plus
  éloignée atteinte 8 et 12 tabulations plus loin et **dans le viewport**,
  retour par `Maj+Tab`, fermeture par `Entrée` — le focus **reste sur le
  `summary`**, et le document est à `scrollY=0` à chaque étape. La marche B02
  est rejouée telle quelle à côté : `cross-check` y est désormais refusé, ce qui
  **est** un disclosure, dit en chiffres.
- **Caméra** : mêmes `tx`, `ty` et `scale` à travers 960x640 → 1280x800 →
  1366x768 → 960x640, coordonnées du monde stables, sélection conservée et
  visible.
- **P-19** : langue, densité, mouvement, légende, panneau, sélection et caméra
  restaurés par un **second processus réel** (carte 474 px, 1 carte visible).
- **P-22** : empreintes stricte et d'accès **identiques**, 160 entrées, aucun
  artefact sous la racine, aucune écriture sur le fil.
- **P-02** 120 = 120 enfants réels; **P-05** arêtes dessinées, ligne hors
  première vue atteinte, vue bornée, cible toujours visible; **P-07** sélection
  à 960x640 sans défiler le document; **P-11** molette et clavier; **P-21**
  FR/EN + axe.
- **axe-core 4.13.0 : 0 violation**, 0 erreur console fatale. `color-contrast`
  reste `INCOMPLETE` (16 à 17 nœuds), publié état par état et **non tranché**.
- Débordement horizontal **0 px**, défilement vertical du document **0 px**.

### Ce que ce correctif a touché, et seulement cela

- `src/map/MapApp.tsx` — trois `<details class="app__group">` natifs
  (`chrome-advanced-tools`, `chrome-diagnostics`, `map-advanced-tools`); aucun
  contrôle supprimé, renommé ni réordonné à l'intérieur de son niveau.
- `src/map/map.css` — les règles des groupes, et celles de `.composition`, qui
  n'en avait **aucune** : le navigateur appliquait ses propres défauts de liste.
- `src/map/mapStrings.ts` — six chaînes FR/EN, `t.groups.*`.
- `src/map/responsiveLayout.test.ts` — 15 tests → **49**. Les invariants de
  forme : quelles commandes sont hors de tout groupe, lesquelles sont dans le
  groupe qui les nomme, qu'aucun `<details>` n'est piloté par une prop, que les
  deux langues nomment les trois groupes, qu'aucune règle CSS ne masque une
  commande. Deux falsifications exécutées : déplacer une commande d'un côté à
  l'autre de la frontière et poser `display: none` sur le corps d'un groupe
  font échouer exactement les tests qui les nomment.
- `scripts/task0060-primary-chrome.{mjs,ps1}`, `scripts/task0060-seed-proof.py`
  — **extension versionnée** du harnais B02, qui reste intact à côté.

**Aucun fichier interdit n'a été touché** : ni Rust/`src-tauri`, ni Index,
SQLite, IPC, modèles de relations, `MapView.tsx`, `viewState`, `resumeState`,
dépendances ou verrou. Aucun composant, framework ni service nouveau.

### Aucun état applicatif, et ce que cela coûte

Les groupes sont des `<details>` natifs : le moteur possède `open`. Rien ne le
lit, ne l'écrit, ne le stocke ni ne le restaure. La campagne le **prouve** :
la passe 1 laisse délibérément `chrome-advanced-tools` ouvert, et le second
processus trouve les trois groupes **fermés**. C'est une **non-persistance
assumée**, publiée comme telle et jamais présentée comme une préférence
restaurée.

### Réserve ouverte et chiffrée — `B03-O1`, **non réparée**

À **960x640 en densité confortable**, la bande de chrome tient encore 281 px de
contenu dans une boîte de 176. Deux conséquences mesurées :

1. `brain-add-real-root`, `lifecycle-open` et `lifecycle-refresh` montrent
   **20 px de leurs 35** — visés et cliquables en leur centre, mais rognés par
   le pli de la bande. Entiers en densité compacte, entiers à 1280x800 et à
   1366x768.
2. Les deux lignes de groupe du chrome sont à 215 px et 260 px, donc **25 px et
   70 px sous le pli** à l'ouverture. Atteintes au clavier en 12 et 13
   tabulations, et visibles dès que la bande défile; en densité compacte la
   première est visible d'emblée.

Le budget est arithmétique : dans une fenêtre de 640, la coquille dispose de
598 px, le plancher de la rangée carte en prend 422, il reste 176 pour le
chrome. Fermer cet écart signifie **reprendre des pixels à la carte** — ce que
le critère d'acceptation de cette tranche interdit — ou **retirer du contenu**.
C'est une décision de portée produit : **arbitrage orchestrateur**.

### Jamais mesuré, à ne pas supposer couvert

- Aucun lecteur d'écran réel n'a été piloté. Ce qui est mesuré des `summary` :
  ils sont dans l'ordre de tabulation, portent leur libellé dans la langue de
  l'état, s'ouvrent à `Entrée`, et axe ne signale aucune violation. **Comment un
  lecteur d'écran rend un disclosure est INCONNU.**
- Les contrastes `color-contrast` restent `INCOMPLETE`, non tranchés.
- Les panneaux relations, file de révision et inter-cerveaux ne sont toujours
  pas peuplés par la fixture : leur comportement en largeur étroite est
  **INCONNU**.
- La marche clavier n'est mesurée qu'à **960x640**, la taille la plus dure.
- Le menu `composition__menu` n'a pas été ouvert pendant la campagne; il reste
  sans règle de positionnement, donc **en flux**.
- Les tests Rust n'ont **pas** été exécutés : aucun code Rust n'est touché.
- **Aucune CI distante** : zéro workflow, zéro contrôle sur ce HEAD.
- Les 22 exigences `P` ne sont **pas** rejouées ici; `ACTION-0108` les réserve à
  la clôture de Stage B.

### Portes

`pnpm test` **770/770** (49 fichiers), exécuté **deux fois** — le test
`workspaceMapApp.test.tsx > writes the collapsed folders with the branch` que
B02 avait vu échouer une fois sous charge passe aux deux exécutions.
`pnpm check`, `pnpm build`, `git diff --check` : passés.

**Statut : `IMPLEMENTED`.** Pas de `TASK-0061`, pas de Stage C/D, pas de PR, pas
de fusion.
