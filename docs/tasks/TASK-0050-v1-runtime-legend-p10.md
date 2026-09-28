# TASK-0050 — V1 Runtime Legend / P-10 Closure

- **Date :** 2026-09-26
- **Statut :** `BLOCKED`
- **Branche :** `build/v0.2-a34-v1-runtime-legend`
- **Décision :** `DEC-0048`
- **Portée :** `F-014`, `P-10`
- **Exécuteur prévu :** Codex
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
