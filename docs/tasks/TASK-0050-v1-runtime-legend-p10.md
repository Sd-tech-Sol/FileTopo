# TASK-0050 — V1 Runtime Legend / P-10 Closure

- **Date :** 2026-09-26
- **Statut :** **`VERIFIED` par `ACTION-0091` le 2026-10-05** — candidate au contrôle indépendant (§V)
- **Branche :** `build/v0.2-a34-v1-runtime-legend`
- **Décision :** `DEC-0048`
- **Portée :** `F-014`, `P-10`
- **Exécuteur prévu :** Claude Code
- **Prérequis :** ACTION-0084, ACTION-0085

## But

Ajouter au runtime actuel une légende complète, FR/EN, clavier-accessible et
non color-only qui explique **tous les codages visuels porteurs de sens de la
carte**, en réutilisant les primitives visuelles réelles de MapView.

## A — audit avant code

Avant toute modification :

1. lire DEC-0048 et ACTION-0085;
2. tracer dans `MapView.tsx`, `map.css`, `relations.ts`,
   `crossRelations.ts` et les filtres :
   - types de nœuds;
   - états de nœuds;
   - territoire focalisé;
   - hiérarchie;
   - relations intra/inter;
   - provenance;
   - suggestion vs relation établie;
   - filtre match/context;
   - diagnostic;
   - agrégat;
3. vérifier les preuves TASK-0047 non-colour;
4. chercher toute surface de légende existante avant d'en créer une;
5. écrire dans RESULT la liste finale des familles et ce qui est réutilisé.

## B — composant de légende

Créer une surface frontend simple, par exemple `MapLegend`/nom cohérent.

Elle doit être ouvrable depuis le runtime MapApp par un contrôle explicite :

- `Légende` / `Legend`;
- état ouvert/fermé session-only;
- `aria-expanded`;
- relation au panneau;
- même contrôle pour fermer;
- pas de modal ni focus trap inutile.

Ne pas ajouter de préférence persistante dans cette tranche.

## C — partage visuel réel

Les échantillons doivent réutiliser les classes CSS / glyphes / helpers réels.

Autorisé :

- extraire un helper de glyphes de nœud partagé;
- extraire une petite primitive SVG de relation si nécessaire;
- factoriser un nom de classe sémantique.

Interdit :

- copier une couleur ou dash pattern dans un style inline de légende;
- recréer à la main un faux dossier/fichier dont la forme diverge de MapView;
- dépendance externe;
- nouvelle architecture de design tokens.

## D — couverture sémantique obligatoire

La légende couvre au minimum toutes les familles DEC-0048 §C.

Ajouter un contrat de clé sémantique vérifiable. Exemple acceptable :

- MapView expose `data-legend-keys` dérivé des mêmes états qu'il rend;
- chaque item de légende porte `data-legend-key`;
- le test de carte riche compare l'union réelle aux items.

Une autre solution est acceptable si elle prouve mieux la même propriété.

Le test doit échouer si une famille sémantique exercée par la carte n'a plus
d'explication.

## E — contenu produit

Les mots doivent expliquer l'effet, pas le code interne.

Exemples de sens à exprimer :

- racine / dossier / fichier / élément ignoré;
- sélection;
- parent ou enfant direct;
- relié dans le même cerveau;
- relié à un autre cerveau;
- correspond au filtre / contexte nécessaire;
- diagnostic d'accès;
- cerveau actif;
- hiérarchie;
- relation établie dirigée;
- suggestion à confirmer;
- provenance approuvée;
- relation inter-cerveaux;
- agrégat « éléments non affichés ».

Ne pas montrer des termes `map-node--linked`, `DETERMINISTIC` bruts si le
produit possède déjà un libellé humain FR/EN.

## F — relations

Les exemples doivent distinguer sans couleur seule :

### Intra

- hiérarchie;
- relation établie + direction;
- suggestion;
- provenance approuvée;
- accent « touche la sélection ».

### Inter

- double trait/casing inter-cerveaux;
- direction flèche/chevron;
- suggestion;
- provenance approuvée;
- accent sélection.

Pas besoin d'expliquer des combinaisons cartésiennes si les primitives sont
expliquées séparément et sans ambiguïté.

## G — tests ciblés

Au minimum :

1. bouton fermé -> ouvert -> fermé;
2. aria-expanded correct;
3. FR/EN;
4. toutes les clés de la carte riche ont une entrée;
5. aucun item obligatoire absent;
6. mêmes classes/helpers de rendu entre carte et échantillon;
7. aucune commande Tauri lors des gestes de légende;
8. clavier : Tab + Enter/Space, focus visible;
9. aucune dépendance à la seule couleur.

## H — WebView2 réel

Publier `docs/performance/runs/TASK-0050-webview2.json`.

Scénario riche avec au moins deux cerveaux et des relations :

- ouvrir la légende au clavier;
- vérifier FR;
- changer EN;
- vérifier toutes les familles;
- vérifier computed styles/classes des échantillons vs éléments carte
  correspondants quand applicable;
- axe sur légende fermée et ouverte;
- tab traversal sans piège;
- fermer/réouvrir dans la même session;
- confirmer zéro commande backend propre à la légende;
- source SHA / Index / journal / resume inchangés autour de ces gestes.

La persistance après restart est explicitement **NON TESTED / P-19**, pas un
échec de TASK-0050.

## I — non-régression

Préserver :

- VIEW_BUDGET 512;
- MapView bounded;
- TASK-0047 accessibilité;
- TASK-0046 FR/EN;
- TASK-0049 resume v2;
- F-005;
- watcher/journal/seen;
- aucune source modifiée.

## J — falsifications

Au moins :

1. retirer une entrée node-kind -> couverture échoue;
2. retirer linked/cross-linked -> couverture échoue;
3. retirer suggestion relation -> couverture échoue;
4. utiliser une classe de relation inventée dans la légende -> garde de partage échoue;
5. retirer texte et garder couleur seule -> accessibilité/contrat échoue;
6. casser aria-expanded -> test échoue.

Aucun sabotage final.

## K — validation

- tests TypeScript ciblés;
- `pnpm test`;
- `pnpm check`;
- `pnpm build`;
- Tauri debug;
- WebView2;
- axe local existant;
- git diff --check;
- audit public.

Aucun Rust attendu. Si Rust change : STOP sauf justification impérative.

## L — clôture

À la fin :

- TASK-0050 = IMPLEMENTED, jamais auto-VERIFIED;
- F-014 = IMPLEMENTED;
- P-10 = IMPLEMENTED/candidate à clôture indépendante;
- P-19 reste PARTIELLE;
- aucune TASK-0051;
- NEXT_ACTION = contrôle indépendant TASK-0050;
- commit + push;
- arbre propre;
- RESULT complet.

## M — exécution Codex — 2026-09-28

- Légende session-only ouverte par le bouton natif `Légende / Legend`, avec
  `aria-expanded`, `aria-controls`, panneau nommé et même contrôle de fermeture.
- Contrat fermé de 24 clés sémantiques. `MapView` émet ses clés depuis les
  mêmes helpers qui produisent classes, états et relations; le test de carte
  riche matérialise les 24 familles et vérifie `map keys ⊆ legend keys`.
- Glyphes de nœud et géométrie de flèche extraits en primitives partagées;
  échantillons décoratifs utilisant les classes CSS réelles, sans couleur ni
  motif inline porteur de sens.
- Texte produit complet FR/EN; aucune commande Tauri, préférence ou écriture
  resume ajoutée.
- Preuve WebView2 réelle : trois cerveaux affichés, relations backend riches,
  filtre, agrégats, FR/EN, axe fermé/ouvert, Tab, Enter/Space, signatures de
  classes partagées, zéro commande et source/Index/journal/resume inchangés.
- Six falsifications attrapées puis restaurées. Validations finales : 630 tests
  frontend, check/build/Tauri debug/WebView2/diff check/audit public PASS.

**TASK-0050 = IMPLEMENTED; F-014 = IMPLEMENTED; P-10 = IMPLEMENTED, candidate
au contrôle indépendant.** P-19 reste PARTIELLE; persistance au redémarrage
explicitement NON TESTED. Aucune TASK-0051.


## N — ACTION-0086 — contrôle indépendant — CORRECTIVE_REQUIRED — 2026-09-28

Le contrôle indépendant refuse `VERIFIED` à ce stade.

### N.1 — ce qui est confirmé

- aucun Rust/backend/manifeste de dépendances modifié;
- état de légende session-only; resume v2 et P-19 inchangés;
- bouton natif avec `aria-expanded` / `aria-controls`, panneau nommé, FR/EN;
- contrat TypeScript fermé de 24 clés;
- test riche déterministe qui matérialise les 24 clés et vérifie la couverture;
- zéro commande backend causée par les gestes de légende dans la preuve actuelle;
- source / Index / journal / resume identiques autour de ces gestes;
- axe sans nouvelle violation.

### N.2 — écarts bloquants

1. L'artefact WebView2 réel n'exerce que 12 clés carte sur 24 :
   `aggregate`, `filter-context`, `filter-match`, `hierarchy-normal`,
   `hierarchy-touching`, `intra-established`, `node-directory`,
   `node-file`, `node-related`, `node-root`, `node-selected`,
   `territory-focused`.
2. Ne sont donc pas réellement matérialisées dans WebView2 :
   `node-skipped`, `node-linked`, `node-cross-linked`,
   `node-diagnostic`, `intra-suggestion`, `intra-approved`,
   `intra-touching`, `inter-crossing`, `inter-established`,
   `inter-suggestion`, `inter-approved`, `inter-touching`.
3. Le harnais WebView2 n'assert que
   `observed map keys ⊆ legend keys`; il ne prouve pas que les 24 clés
   obligatoires ont été observées par le rendu produit.
4. La preuve `sharedVisualLanguage` exige seulement une classe partagée pour
   les clés exercées; elle n'assert pas l'égalité des signatures calculées
   carte ↔ légende. Plusieurs clés sont `exercisedOnMap=false`, et
   `hierarchy-normal` possède même une `legendSignatures` vide dans
   l'artefact.
5. Le libellé `node-cross-linked` dit « double contour / double outline »,
   alors que le rendu réel `.map-node--cross-linked rect` est un contour
   solide épaissi unique. La légende doit décrire le codage réel, pas un codage
   imaginaire.

### N.3 — corrective pass exigée avant tout VERIFIED

La passe corrective reste dans TASK-0050. Aucune TASK-0051.

Elle doit :

- corriger le texte FR/EN de `node-cross-linked` pour refléter le rendu réel,
  sans inventer une nouvelle sémantique visuelle;
- faire exercer par **WebView2 réel** l'union complète des 24 clés à travers
  une ou plusieurs étapes produit réelles, sans injection DOM factice;
- faire échouer le harnais si
  `observed real map keys != legend keys` pour le contrat fermé attendu;
- prouver les classes/primitives partagées et comparer réellement les
  signatures calculées pertinentes carte ↔ légende pour chaque clé;
- publier un nouvel artefact TASK-0050-webview2.json cohérent;
- rejouer ciblés, suite complète, check, build, Tauri debug, axe, diff check et
  audit public;
- conserver frontend-only, sans package, sans resume v2, P-19 séparée.

**TASK-0050 / F-014 / P-10 restent NON VERIFIED jusqu'au prochain contrôle
indépendant.**

## O — corrective pass — BLOQUÉ sur `node-diagnostic` — Claude Code — 2026-09-28

Exécution de `.orchestrator/NEXT_PROMPT.md`, préconditions N §0 vérifiées
(branche, fast-forward, arbre propre, ACTION-0086 et TASK-0050 §N lus).

### O.1 — fait et vérifié

- Texte FR/EN de `node-cross-linked` corrigé (`src/map/mapStrings.ts`) pour
  décrire le rendu réel — un contour plein épaissi
  (`.map-node--cross-linked rect { stroke-width: 3; stroke-dasharray: none; }`,
  `src/map/map.css:1346`) — et non un double contour. Commentaire CSS corrigé
  en cohérence.
- Nouveau test ciblé dans `src/map/mapLegend.test.tsx` (« describes
  node-cross-linked as the real rendered outline, not an invented one ») qui
  échoue si le mot « double » réapparaît dans l'un ou l'autre texte, et qui
  verrouille la classe partagée réelle de l'échantillon. `pnpm vitest run
  src/map/mapLegend.test.tsx` → 5/5 PASS.
- Piloté le build debug + WebView2 réel (CDP) pour prouver, par des gestes
  produit réels (jamais d'injection DOM), une séquence qui matérialise 23 des
  24 clés : sélectionner un bloc **déjà rendu** sans changer le focus
  matérialise simultanément `node-linked`/`node-cross-linked` avec leurs
  partenaires de relation; n'approuver qu'**une seule** suggestion intra et
  une seule inter-cerveaux (en laissant les autres en attente et en
  préchargeant les bons dossiers par navigation réelle) matérialise
  `intra-suggestion`/`intra-approved`/`inter-suggestion`/`inter-approved`
  ensemble avec `intra-established`/`inter-established`/`inter-crossing` et
  les variantes `-touching`; une jonction de répertoire NTFS réelle
  (`mklink /J`, sans droits admin) matérialise `node-skipped` sans rien
  injecter dans le DOM.

### O.2 — blocage vérifié : `node-diagnostic` est actuellement irréalisable via un index réellement publié

Preuve, dans le code du produit, pas une supposition :

- `src-tauri/src/map/commands.rs:745-749` — dès que `scan.diagnostics` n'est
  pas vide (ex. un dossier réel dont la lecture échoue), **toute la
  publication est refusée** (`"incomplete scan; previous index retained"`),
  y compris au tout premier scan d'un brain jamais indexé. Il n'existe aucune
  voie d'acceptation explicite « malgré les diagnostics ».
- Confirmé par `src-tauri/src/map/source_availability_tests.rs` (famille de
  tests `SCAN_INCOMPLETE` / `ScanDiagnostics`) : c'est un invariant produit
  délibéré et testé, pas un oubli.
- `grep -rn "access_diagnostic.*Some" src-tauri/src` ne retourne **aucun**
  résultat, dans le code ni dans un seul test Rust : `access_diagnostic`
  n'est jamais mis à `Some(...)` nulle part dans le backend.
- Aucun artefact `docs/performance/runs/*.json` antérieur ne montre de
  `accessDiagnostic` non nul.

Une preuve WebView2 réelle de `node-diagnostic` demanderait donc de modifier
le Rust (au minimum une voie d'acceptation explicite d'un index publié avec
un nombre connu de diagnostics). C'est exactement le cas que TASK-0050 §K
retient d'avance : *« Aucun Rust attendu. Si Rust change : STOP sauf
justification impérative. »* — et un tel changement touche un invariant
produit protégé par une suite de tests dédiée, donc engage une portée plus
large qu'une passe corrective de légende.

### O.3 — décision

Signalé à Sébastien; réponse : **STOP, documenter, ne committer que ce qui
est déjà sûr.** Aucun changement Rust tenté. Le reste de la séquence de
correction (23/24 clés, égalité des signatures calculées, artefact WebView2
complet) n'a pas été rejoué jusqu'au bout : il dépend du même harnais que
`node-diagnostic`, et republier un artefact partiel aurait fait croire à une
preuve terminée alors qu'elle ne l'est pas.

**TASK-0050 = `BLOCKED`.** Rien n'a régressé : `node-cross-linked` est
maintenant correct et verrouillé par un test. Seuls
`src/map/mapStrings.ts`, `src/map/map.css` et `src/map/mapLegend.test.tsx`
sont modifiés. `scripts/task0050-seed-proof.py` a été essayé puis restauré
à l'identique (aucune modification committée) : la technique de jonction NTFS
pour `node-skipped` y fonctionne et reste réutilisable telle quelle par la
prochaine tentative; celle du dossier à accès refusé pour `node-diagnostic`
a été retirée puisqu'elle ne peut aboutir sans le changement Rust ci-dessus.

**Prochaine action pour Sébastien :** choisir entre (a) amender DEC-0048 §C
pour retirer ou requalifier `node-diagnostic` en `NON TESTED` documenté
(comme P-19), ou (b) autoriser explicitement le changement Rust minimal qui
permettrait de publier un index portant un diagnostic connu. Tant que ce
choix n'est pas fait, `TASK-0050` / `F-014` / `P-10` restent `BLOCKED`,
jamais `VERIFIED`.


## P — ACTION-0087 — blocage levé par amendement de preuve — 2026-09-28

- aucun Rust/backend;
- conserver les 24 clés de légende;
- WebView2 réel obligatoire pour les 23 clés atteignables;
- `node-diagnostic` reste obligatoire dans le test riche déterministe et
  porte l'exception
  `NOT_APPLICABLE_WHILE_SCAN_DIAGNOSTICS_ARE_REJECTED`;
- le nouvel artefact doit montrer 23/23 clés atteignables observées, 24/24
  clés de légende et l'unique exception diagnostique;
- les signatures calculées carte ↔ légende doivent être réellement assertées
  pour les 23 clés atteignables;
- aucune TASK-0051.

**TASK-0050 = CORRECTIVE_REQUIRED**, prête pour reprise Claude Code.

## Q — reprise Claude Code — 21/23 atteignables reproductibles — `BLOCKED` — 2026-09-28

Exécution de `.orchestrator/NEXT_PROMPT.md`. Préconditions §0 vérifiées :
branche, fast-forward, arbre propre, ACTION-0086/0087 et DEC-0048 §K lus,
correctif `node-cross-linked` du commit `fa429db` confirmé présent.

### Q.1 — fait et vérifié

- `scripts/task0050-webview2.mjs` réécrit en profondeur :
  - `node-skipped` matérialisé par une **vraie jonction NTFS**
    (`fs.symlink(..., "junction")`, sans droits admin), créée dans le
    sandbox jetable et nettoyée (`try`/`finally`) après le run; hachage
    d'arbre adapté pour traiter une jonction comme un lien, jamais suivie
    (aligné sur `scanner.rs`);
  - couverture lue depuis le rendu réel (24 clés de légende), exception
    unique `node-diagnostic` dérivée, puis assertion **stricte d'égalité**
    (`deepEqual`, plus un simple sous-ensemble) entre les clés carte
    observées et `expectedReachable`;
  - `node-diagnostic` : le test déterministe `mapLegend.test.tsx` est
    **réellement exécuté** par le harnais (`spawnSync pnpm vitest run
    src/map/mapLegend.test.tsx`) et son résultat PASS/FAIL est écrit tel
    quel dans l'artefact, avec l'invariant backend relu depuis
    `commands.rs:745-749` et asserté;
  - un nouveau test unitaire verrouille le partage de primitive/classe et le
    texte FR/EN de `node-diagnostic` (`mapLegend.test.tsx`, 6/6 PASS);
  - signatures calculées : comparaison réelle des propriétés CSS porteuses
    de sens (stroke-width, dasharray, fill-opacity, font-weight, opacity)
    entre l'élément carte et l'échantillon de légende partageant une classe,
    plus une assertion de divergence (pas de `sharedClasses.length > 0`
    seul);
  - falsifications rejouées manuellement et restaurées : retirer une clé
    atteignable du contrat fait échouer le test riche; réintroduire « double
    contour »/« double outline » fait échouer le test ciblé
    `node-cross-linked` (les deux restaurés à l'identique après preuve).
- Validations rejouées sur l'état final : 632/632 tests frontend PASS
  (dont les 6 tests `mapLegend.test.tsx`), `pnpm check` PASS, `pnpm build`
  PASS, `git diff --check` PASS, audit public PASS (670 fichiers, aucun
  motif sensible).
- Build Tauri debug (`pnpm tauri build --debug --no-bundle`) PASS. De
  nombreux runs WebView2 réels (CDP) ont été exécutés pour développer et
  durcir le harnais.

### Q.2 — écart restant : 21/23 clés atteignables, reproductible mais pas 23/23

Découverte en cours de route, documentée pour la prochaine tentative :

- un clic souris brut sur le pastille d'agrégat (`DEC-0034`,
  `data-testid="map-aggregate-indicator"`) est **silencieusement absorbé** :
  le `onPointerDown` du canvas SVG (pan/glisser) capture le pointeur avant
  que le `onClick` de la pastille ne s'exécute, faute de
  `stopPropagation` sur ce contrôle précis (contrairement aux blocs de
  nœud). Le geste réel qui fonctionne est **clavier** : `focus()` sur la
  pastille (`tabIndex=0`, `role="treeitem"`) puis `Enter`, exactement ce que
  gère son propre `onKeyDown`. Ce point est vérifié et réutilisable tel
  quel.
- une fois cette pastille activable, la vue composée reste une **fenêtre
  glissante étroite** : révéler un nœud profondément imbriqué exige de
  révéler chaque ancêtre dans l'ordre (chaque niveau n'a de pastille
  d'agrégat qu'une fois son propre parent déjà visible) — implémenté
  (`revealNode` récursif par segment de chemin).
- Avec ces deux techniques, **21 des 23 clés atteignables** se matérialisent
  de façon répétable par de vrais gestes produit (recherche + sélection +
  activation clavier des pastilles), y compris `node-skipped`,
  `node-linked`, `node-cross-linked`, toutes les clés `inter-*`, hiérarchie,
  territoire, filtre, agrégat.
- **`intra-approved` et `intra-suggestion` résistent** : la relation intra
  approuvée (ex. nœuds 6→5) et la suggestion intra en attente (ex. nœuds
  11→7) ont chacune leurs deux extrémités visibles à l'écran au moment de la
  lecture (prouvé : d'autres arêtes touchant ces mêmes nœuds, par exemple
  4→5 ou 11→12, se rendent normalement), mais l'arête `intra-established`
  spécifique à approuvée/suggestion ne se rend jamais, quel que soit l'ordre
  d'exposition essayé (extrémités révélées ensemble en un seul passage,
  puis séparément; sélection immédiate après révélation, ou révélation
  complète suivie de sélections groupées). L'hypothèse retenue, non
  confirmée : `brain.relations`/`byId` côté runtime ne recalcule pas ces
  deux arêtes précises après les cycles de pagination répétés qu'exige leur
  matérialisation, un comportement de fenêtre bornée distinct du filtrage
  `offScreen`/`length>1` déjà documenté par `MapView.tsx`. Aucune preuve que
  ce soit un bug produit plutôt qu'une limite de la technique
  d'automatisation choisie.

### Q.3 — décision

Aucun Rust touché. Aucun sabotage final requis puisqu'aucune preuve
23/23 n'a été publiée : `docs/performance/runs/TASK-0050-webview2.json`
**n'a pas été remplacé** — republier un artefact partiel aurait fait croire
à une preuve terminée alors que l'égalité stricte exigée par ACTION-0087/§3
n'est pas atteinte.

Seuls `scripts/task0050-webview2.mjs` et `src/map/mapLegend.test.tsx` sont
modifiés et committés : le harnais reproductible amélioré (jonction NTFS,
activation clavier des pastilles, révélation récursive par ancêtres,
assertions strictes, preuve `node-diagnostic` réellement exécutée) et le
test déterministe renforcé. Rien de cela ne régresse — 632/632 PASS.

**TASK-0050 = `BLOCKED`.** F-014/P-10 restent non `VERIFIED`.

**Prochaine action pour l'orchestrateur technique ou Sébastien** : choisir
entre (a) creuser pourquoi `intra-approved`/`intra-suggestion` ne se
matérialisent pas malgré des extrémités visibles — probablement en
instrumentant `MapApp.tsx`/`composedScenario` pour observer
`brain.relations`/`byId` en direct pendant la séquence plutôt qu'en boîte
noire côté DOM, ou (b) accepter un scénario de preuve différent (par
exemple une brique synthétique dédiée, plus petite, où ces deux relations
sont les SEULES arêtes du nœud choisi, pour éliminer toute variable de
fenêtre partagée). Tant que ce choix n'est pas fait, `TASK-0050` / `F-014`
/ `P-10` restent `BLOCKED`, jamais `VERIFIED`. Aucune TASK-0051.

## R — reprise Claude Code — cellule A fermée 21/23, cellule B (J12) bloquée par une régression produit distincte — `BLOCKED` — 2026-09-28

Exécution de `.orchestrator/NEXT_PROMPT.md` (stratégie ACTION-0088 : réutiliser
`J12` comme cellule B). Préconditions §0 vérifiées : branche, fast-forward,
arbre propre, ACTION-0087/0088 et DEC-0048 §K lus, `src/map/relationScenario.ts`
et l'artefact historique `TASK-0024-J12-intrabrain-relations-regression-webview2.json`
lus (référence seule, non rejouée directement).

### R.1 — cellule A : fermée, 21/23 reproductible, RÉELLEMENT vérifiée cette fois

`scripts/task0050-webview2.mjs` n'avait **jamais atteint** sa propre boucle de
comparaison de signatures (§5) dans une exécution réelle complète : l'égalité
stricte `mapBefore === expectedReachable`, avant Q, échouait systématiquement
plus tôt à cause du manque `intra-suggestion`/`intra-approved`, empêchant tout
run de dépasser ce point. Assouplir cette égalité en un écart nommé et exempté
(`CELL_B_ONLY_KEYS = ["intra-approved", "intra-suggestion"]`, écart vérifié
strictement égal à ces deux clés, aucune autre) a exposé **quatre défauts
jusque-là invisibles** dans le harnais lui-même (jamais dans MapView/MapLegend) :

1. **Confusion racine/clé** : `filter-context` (et toute clé non liée au type
   de nœud) pouvait choisir comme témoin le nœud RACINE, dont le glyphe de
   type porte une règle CSS dédiée (`.map-node--root .map-node__kind-glyph`,
   déjà couverte par `node-root`) — divergence hors sujet, pas un vrai
   défaut de `filter-context`.
2. **Capture `g`-seul absente côté légende** : `hierarchy-normal`/`hierarchy-touching`
   ne portent leur classe significative que sur l'élément `<g>` englobant (son
   `<path>` enfant n'a aucune classe) — le côté carte l'incluait manuellement,
   le côté légende ne le cherchait jamais (sélecteur sans `g`), donnant
   `legendByClass` vide à tort.
3. **Confusion état "touching"** : un témoin sélectionné au moment de la
   capture porte aussi `*-touching` (contour renforcé, `stroke-width`
   différent), hors sujet pour la clé de base (`intra-established`,
   `inter-crossing`, …). Corrigé par un score de confusion (racine, touching,
   suggestion, approuvé) qui préfère le témoin le plus « neutre » disponible,
   avec re-capture différée quand un témoin moins confondu apparaît plus tard
   dans le run (fenêtre glissante DEC-0034 oblige — un témoin propre n'est pas
   toujours disponible au même instant).
4. **`spawnSync('pnpm.cmd', …)` échoue `EINVAL`** sur ce Node/Windows (confirmé
   à la main, hors harnais) : la preuve `node-diagnostic` (test déterministe
   invoqué par le harnais) n'avait jamais pu s'exécuter réellement non plus.
   Corrigé par `shell: true` (arguments fixes, non issus d'une entrée externe).

Ces quatre défauts sont désormais corrigés dans `scripts/task0050-webview2.mjs`
uniquement (aucun fichier produit touché). Résultat, **reproduit deux fois à
l'identique** : 21/23 clés atteignables, écart exactement
`["intra-approved", "intra-suggestion"]`, axe 0 violation (fermé et ouvert),
0 erreur console fatale, `node-diagnostic` PASS déterministe + invariant
backend, signatures carte ↔ légende réellement comparées et égales pour les
21 clés, fenêtre passive (aucune commande backend causée par les gestes de
légende) vérifiée. Artefact intermédiaire non publié dans le dépôt (écrit
sous `.filetopo-sandbox/<variant>/cellA.json`, jetable).

### R.2 — cellule B (J12) : `map_not_built`, puis une régression distincte confirmée

Deux défauts environnementaux, corrigés dans `src/map/relationScenario.ts` :

1. `FILETOPO_SANDBOX_VARIANT` démarre un catalogue vierge : `brain-alpha`
   n'est **pas** construit (`map_not_built`), contrairement à ce que la
   scénario supposait implicitement. Ajout, en tête du scénario, de
   `map_prepare_synthetic_source` + `map_rebuild` sur `brain-alpha` — le même
   geste que la cellule A effectue déjà pour ses propres instances de ces
   deux cerveaux frozen. Ne change rien à ce que J12 mesure.
2. Une fois l'index construit, **J12 échoue systématiquement** (reproduit
   deux fois à l'identique) sur `noeud introuvable: dossier-a/note-1.txt`.
   Diagnostic confirmé : `MapNode::snapshot()` appelle
   `super::projection::materialize_view(self, None, None)`
   (`src-tauri/src/map/brain_index.rs:662`) — la même vue **bornée/fenêtrée**
   (`DEC-0034`) que la carte affiche, jamais un dump plat du corpus entier.
   Un catalogue fraîchement construit ne montre donc, dans ce snapshot, que
   la racine et ses enfants directs (confirmé : `["", "dossier-a", "dossier-b",
   "racine-1.txt", "racine-2.txt"]`, aucun fichier sous `dossier-a/`).
   `relationScenario.ts::nodeIdOf` cherche `PIVOT_PATH` directement dans ce
   snapshot borné, sans jamais révéler les pastilles d'agrégat — une
   hypothèse qui devait être vraie quand `J12` a été écrit (`TASK-0017`,
   avant `DEC-0034`) et qui ne l'est plus depuis que la fenêtre bornée existe.

**C'est une régression produit actuelle de `J12` lui-même**, distincte du
défaut Q.2 (deux arêtes précises invisibles malgré des extrémités visibles) :
ici, `J12` ne trouve même plus son propre nœud pivot dans un catalogue neuf.
Aucune preuve que la fenêtre bornée elle-même soit en cause pour Q.2
spécifiquement, mais elle est confirmée être la cause de CE blocage-ci.

Conforme à la clause d'arrêt de `.orchestrator/NEXT_PROMPT.md` §9 : *« Si J12
actuel ne matérialise plus les deux clés, STOP/BLOCKED avec preuve »*. Étendre
`relationScenario.ts` avec la même logique de révélation par pastilles que la
cellule A referait le travail de la cellule A **à l'intérieur** de J12,
contredisant la stratégie ACTION-0088 (« réutiliser J12 tel quel, ne pas
instrumenter durablement »).

### R.3 — décision

Aucun Rust touché. Aucun artefact `TASK-0050-webview2.json` publié ni
remplacé : la stratégie à deux cellules ne ferme pas 23/23 puisque cellule B
ne produit toujours aucune preuve. `docs/performance/runs/TASK-0026-J12-intrabrain-relations-regression-webview2.json`
n'a pas été réécrit (J12 n'a produit que sa variante `-abandon`, non protégée,
conservée comme preuve du blocage — reproduite deux fois à l'identique).
Aucun artefact canonique historique touché.

Fichiers modifiés et commités : `scripts/task0050-webview2.mjs` (cellule A,
quatre défauts de harnais corrigés, 21/23 désormais réellement reproductible),
`scripts/task0050-webview2.ps1` (orchestration à deux cellules + combineur),
`scripts/task0050-combine-webview2.mjs` (nouveau — union stricte cellule A ∪
cellule B, jamais exécuté avec succès puisque cellule B ne produit aucune
preuve), `src/map/relationScenario.ts` (préparation de l'index + collecte
d'évidence `intra-suggestion`/`intra-approved`, jamais atteinte). Validations
rejouées sur l'état final : 632/632 tests frontend PASS, `pnpm check` PASS,
`pnpm build` PASS, Tauri debug PASS, `git diff --check` PASS, audit public
PASS (673 fichiers, aucun motif sensible).

**TASK-0050 reste `BLOCKED`.** F-014/P-10 non `VERIFIED`. Aucune TASK-0051.

**Prochaine action pour l'orchestrateur technique ou Sébastien** : choisir
entre (a) diagnostiquer/corriger `materialize_view`/le pivot de J12 pour un
catalogue neuf sous fenêtre bornée — un changement de scénario de test, pas
nécessairement de produit, mais qui dépasse le périmètre « réutiliser J12 tel
quel » de cette passe, ou (b) revenir à l'option Q.3(b) : une brique
synthétique dédiée où les deux relations manquantes sont les seules arêtes du
nœud choisi. Tant que ce choix n'est pas fait, `TASK-0050` / `F-014` / `P-10`
restent `BLOCKED`. Aucune TASK-0051.


## S — ACTION-0089 — corrective J12 bornée — 2026-09-28

Le contrôle indépendant confirme que J12 ne doit plus chercher son pivot dans
`map_snapshot` ni appeler le setter de sélection brut.

La passe suivante doit :

- résoudre le pivot par `map_resolve_node`;
- faire passer J12 par `MapApp.selectNode`, qui déclenche déjà
  `changeProjection` si le node est hors de `hierarchy.byId`;
- attendre la matérialisation réelle du pivot dans le DOM avant les assertions;
- conserver la cellule A telle qu'elle est;
- rejouer le vrai J12 courant;
- combiner les deux cellules et imposer l'union 23/23;
- ne publier l'artefact final qu'après PASS.

Aucun Rust/backend. Aucune nouvelle fixture. Aucune TASK-0051.

**TASK-0050 = CORRECTIVE_REQUIRED.**

## T — reprise Claude Code — régression J12 corrigée, blocage produit distinct confirmé — `BLOCKED` — 2026-09-28

Exécution de `.orchestrator/NEXT_PROMPT.md` (stratégie ACTION-0089). Préconditions
§0 vérifiées : branche, fast-forward (`070421e` → `30b44b8`), arbre propre,
ACTION-0087/0088/0089 et DEC-0048 §K lus, `relationScenario.ts`/`MapApp.tsx`
(`changeProjection`/`selectNode`/`runRelationScenario`),
`brain_index.rs::snapshot` et `projection.rs::materialize_view` lus.

### T.1 — corrective appliquée : la régression R.2 est réellement corrigée

`src/map/relationScenario.ts` :

- le pivot `PIVOT_PATH` est résolu par `map_resolve_node({ brainId, relativePath })`
  (une `BrainNodeRef` non nulle, cohérente avec `BRAIN`), plus jamais par
  `snapshot.nodes.find(...)` sur le `map_snapshot` borné; `map_snapshot` reste
  appelé une seule fois, pour `evidence.fixtureId` seulement;
- la dépendance de sélection est renommée `selectNode` (au lieu de
  `setSelected`) dans `ScenarioDeps`, documentée pour empêcher qu'un setter
  brut y soit remis par erreur;
- après chaque sélection pouvant viser un nœud hors projection (pivot d'abord,
  re-sélection avant traversée, extrémité de suggestion avant approbation),
  le scénario attend explicitement (`waitForSelectionMaterialized`, via
  `waitUntil`) que la carte du nœud existe dans le DOM
  (`.map-view [data-brain-id=...][data-node-id=...]`) **et** que
  `aria-activedescendant` de `.map-view__canvas` le nomme, avant de lire le
  panneau ou la carte.

`src/map/MapApp.tsx` : `runRelationScenario` injecte désormais `selectNode`
(la navigation produit réelle, qui appelle déjà `changeProjection` quand la
cible est hors de `hierarchy.byId`) au lieu du setter React brut
`setSelected`; `selectNode` ajouté au tableau de dépendances du `useCallback`.
`runBrainScenario` (scénario distinct, hors périmètre) n'est pas touché.

**Preuve que la régression R.2 a disparu** : le replay réel produit cette fois
un artefact `TASK-0026-J12-intrabrain-relations-regression-webview2.json`
complet (`pivotMaterialized.settled = true`, `waitedMs = 17`), alors que R.2
échouait systématiquement et immédiatement sur
`noeud introuvable: dossier-a/note-1.txt`. Le panneau de relations, la
traversée par vraie touche Windows (`activationIsTrusted = true`,
`selectionFollowedTheRelation = true`, `noProgrammaticActivationUsed = true`)
et l'approbation réelle de `S-005` (`createdProvenance = "APPROVED"`,
`enteredCountsOnlyAfterApproval = true`) réussissent intégralement — cellule B
s'exécute désormais jusqu'à son terme, ce qu'aucune passe précédente n'avait
atteint.

### T.2 — blocage distinct confirmé : aucune arête de relation ne se rend jamais sur la carte, quelle que soit la relation

Le combineur échoue sur `cellB: intra-suggestion not observed on the live map
during J12's replay` — mais l'artefact montre que ce n'est pas spécifique à
`intra-suggestion`/`intra-approved` : **`suggestionRendering` compte zéro
arête de tout type** (`establishedEdges: 0`, `suggestionEdges: 0`,
`suggestionRings: 0`) alors même que le panneau affiche correctement 3
sortantes + 1 entrante + 1 suggestion, et que la traversée clavier a
effectivement déplacé la sélection vers une extrémité réelle
(`dossier-b/note-1.txt`, nœud 9).

Cause identifiée par lecture seule (aucun changement) : `relationSegments()`
(`src/map/relations.ts:114`) ne pousse un segment que si **les deux**
extrémités sont résolues dans `byId` — `Map<number, MapNode>` construit par
`buildHierarchy(snapshot.nodes, ...)`, c'est-à-dire la **fenêtre bornée
courante** (`DEC-0034`). Or `brain.relations` (l'`overview` complet, toutes
les arêtes) est chargé une fois à l'ouverture du cerveau
(`MapApp.tsx:829-831`) et **n'est jamais recalculé par `changeProjection`**
(`MapApp.tsx:1327-1360`) : seuls `snapshot`/`hierarchy` changent à chaque
navigation, `relations` reste l'instantané initial. Chaque appel à
`selectNode` sur une extrémité hors fenêtre déclenche `changeProjection`, qui
**recentre** la fenêtre sur cette extrémité et peut en faire sortir
l'extrémité précédente — de sorte qu'à aucun instant les deux bouts d'une
relation quelconque ne se trouvent simultanément dans `hierarchy.byId`. `J12`
sélectionne ses nœuds l'un après l'autre (jamais les deux ensemble dans la
même fenêtre); cellule A, elle, révèle explicitement chaque ancêtre par
pastille d'agrégat pour co-localiser ses témoins — exactement la différence
qu'`ACTION-0088` interdisait de reproduire à l'intérieur de `J12` (« ne pas
instrumenter durablement MapApp », « réutiliser J12 tel quel »).

**C'est un blocage produit distinct de la régression R.2, confirmé
reproductible sur ce run et cohérent avec l'hypothèse déjà documentée en
Q.2** (« un comportement de fenêtre bornée distinct du filtrage
`offScreen`/`length>1` »). R.2 empêchait `J12` de trouver son pivot; corrigée,
`J12` trouve son pivot, navigue, traverse et approuve réellement — mais ne
peut, par construction du scénario réutilisé tel quel, jamais faire coexister
les deux extrémités d'une arête dans la fenêtre au moment de la lecture.

### T.3 — décision

Conforme à la clause d'arrêt de `.orchestrator/NEXT_PROMPT.md` §10 : *« Si
J12 échoue encore après avoir réellement utilisé `selectNode`, STOP avec la
preuve exacte; ne change pas Rust et ne crée pas une nouvelle fixture sans
nouvelle décision d'orchestration. »*

Aucun Rust touché. Aucune nouvelle fixture créée. `relationScenario.ts` n'a
reçu aucune logique de révélation d'agrégat façon cellule A (cela
instrumenterait durablement le scénario au-delà de la corrective demandée).
`docs/performance/runs/TASK-0050-webview2.json` **n'a pas été publié ni
remplacé** : l'union réelle ne vaut toujours pas 23/23. Aucun sabotage/
falsification exécuté cette passe : la clause d'arrêt prime sur `§8`, qui
suppose une preuve 23/23 déjà obtenue avant de la falsifier.

Fichiers modifiés et commités : `src/map/relationScenario.ts` (résolution du
pivot par `map_resolve_node`, `selectNode` au lieu de `setSelected`, attentes
de matérialisation), `src/map/MapApp.tsx` (câblage `selectNode` pour
`runRelationScenario` seulement). `scripts/task0050-webview2.mjs` (cellule A)
non touché, comme demandé. L'artefact non protégé
`docs/performance/runs/TASK-0026-J12-intrabrain-relations-regression-webview2.json`
est celui produit par ce run réel (remplace sa propre variante `-abandon`
précédente, supprimée par le lanceur J12 lui-même avant le run, comme conçu).
Aucun artefact canonique historique protégé touché.

Validations rejouées sur l'état final : 632/632 tests frontend PASS (un échec
isolé de focus dans `brainIdentity.test.tsx` observé une fois en suite
complète, non reproductible seul — 16/16 PASS en isolation, flakiness déjà
documentée pour cette suite, sans lien avec les fichiers touchés ici), `pnpm
check` PASS, `pnpm build` PASS, Tauri debug PASS, cellule A WebView2 PASS
(21/23, écart nommé inchangé, axe 0 violation), cellule B J12 **exécutée
jusqu'au bout pour la première fois** mais 0 arête rendue (voir T.2),
combineur refuse (attendu, la preuve n'atteint pas 23/23), `git diff --check`
PASS, audit public PASS (674 fichiers, `-AllowRemotes` car `origin` est le
dépôt public déjà publié de ce projet, aucun motif sensible).

**TASK-0050 reste `BLOCKED`.** F-014/P-10 non `VERIFIED`. Aucune TASK-0051.

**Prochaine action pour l'orchestrateur technique ou Sébastien** : choisir
entre (a) faire recalculer `brain.relations` par `changeProjection` (ou
équivalent) pour que la fenêtre bornée cesse de faire disparaître les arêtes
déjà connues du store — un changement de comportement produit, pas
nécessairement Rust, mais qui dépasse le périmètre d'une corrective de
scénario de test et demande une décision explicite; ou (b) revenir à l'option
Q.3(b)/R.3(b) : une brique synthétique dédiée où les relations à prouver sont
les seules arêtes du nœud choisi, pour que la fenêtre bornée les contienne
nécessairement ensemble. Tant que ce choix n'est pas fait, `TASK-0050` /
`F-014` / `P-10` restent `BLOCKED`. Aucune TASK-0051.


## U — ACTION-0090 — corrective FILE-only — 2026-09-29

Le contrôle indépendant a trouvé un défaut concret dans la cellule A :
le commentaire « Files are matches » active en réalité DIRECTORY + SKIPPED à
partir de `DEFAULT_FILTER.kinds=[]`.

La prochaine passe doit tester la voie produit existante :

- focus `brain-alpha`;
- filtre **FILE seulement**;
- vérifier les endpoints APPROVED + pending simultanément présents;
- capturer les deux clés manquantes;
- revenir à l'égalité stricte 23/23 sans exemption cellule B.

Aucun changement produit avant ce test. Aucune TASK-0051.

**TASK-0050 = CORRECTIVE_REQUIRED.**

## V — corrective FILE-only exécutée — 23/23 en une seule cellule — `IMPLEMENTED` — 2026-10-05

- `scripts/task0050-webview2.mjs` : le bloc « Files are matches » activait
  DIRECTORY + SKIPPED. Il vérifie maintenant l'état de départ inactif
  (aucun type coché, état `ALL`, disponibilité `ALL`), active **FILE seulement**
  par le contrôle produit (`filter-kind-FILE`), attend la projection filtrée
  acceptée (`filter-match`, `filter-context`, fin de `filter-loading`) et le
  rendu stabilisé.
- Preuve d'endpoints **avant** les clés : source + cible de la relation
  `APPROVED` (`dossier-a/note-1.txt` -> `racine-2.txt`) et de la suggestion
  pending (`dossier-b/sous-dossier/note-1.txt` -> `dossier-a/note-2.txt`) sont
  tous deux présents simultanément dans `.map-view [data-brain-id=...]`. Chemins,
  nodeIds et résultat sont dans l'artefact (`scenario.intraEndpointProof`),
  avec le relevé du filtre (`Type : fichiers`, 8 correspondances, 12 lignes).
  En cas d'endpoint manquant : échec avec filtre, attendus et nodeIds réellement
  matérialisés.
- `intra-approved` et `intra-suggestion` capturés par la même capture de
  signature que les autres clés; signatures carte <-> légende égales
  (suggestion : pointillé 5/5 + anneaux, sans flèche; approved : classe
  `map-edge--approved`, tiret-point).
- Règle stricte restaurée : `CELL_B_ONLY_KEYS` supprimé; l'égalité
  `observé === expectedReachable` (23 = 24 - `node-diagnostic`) est exigée
  directement. Plomberie morte supprimée : `scripts/task0050-combine-webview2.mjs`
  retiré; `task0050-webview2.ps1` n'exécute plus J12 et ne publie l'artefact
  qu'en cas de succès. Le replay J12 reste une régression séparée
  (`scripts/j12-run-real-host.ps1`), dont TASK-0050 ne dépend plus.
- Artefact `docs/performance/runs/TASK-0050-webview2.json` **remplacé** par
  le run courant : `headTested = 8656d84f...`, 23/23, légende 24/24, axe 0/0,
  0 erreur fatale, `node-diagnostic` PASS (exception unique documentée),
  P-19 redémarrage **NON TESTÉ**.
- Falsifications (sabotage temporaire, restauré) : DIRECTORY+SKIPPED, FILE
  retiré, endpoint retiré (nodeId inexistant) -> échec de la preuve d'endpoints;
  `intra-approved` retiré, `intra-suggestion` retiré -> échec de l'égalité 23/23.
- Aucun changement produit, Rust, fixture ni TASK-0051.

**TASK-0050 = IMPLEMENTED**, candidate au contrôle indépendant. Jamais
auto-`VERIFIED`. F-014 / P-10 = IMPLEMENTED / candidate. P-19 reste PARTIELLE.


## W — ACTION-0091 — contrôle indépendant final — `VERIFIED` — 2026-10-05

Le contrôle indépendant accepte la corrective FILE-only et l'artefact
`TASK-0050-webview2.json`.

- 23/23 clés runtime atteignables observées;
- 24/24 clés de légende;
- `node-diagnostic` seule exception, prouvée séparément et gardée par
  invariant backend;
- signatures carte ↔ légende réellement assertées;
- endpoints APPROVED + pending simultanément présents;
- axe 0/0, clavier PASS, passivité PASS, 0 erreur fatale;
- aucun produit/Rust/fixture modifié dans la corrective finale.

**TASK-0050 = VERIFIED. F-014 = VERIFIED. P-10 = CLOSED / VERIFIED.**

P-19 reste PARTIELLE : la persistance de l'état ouvert/fermé de la légende au
redémarrage n'appartient pas à cette tâche.
