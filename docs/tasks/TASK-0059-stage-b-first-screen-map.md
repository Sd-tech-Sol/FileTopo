# TASK-0059 — Stage B / B02 — Carte visible dès le premier écran

- **Date :** 2026-10-09
- **Statut :** APPROVED — NOT STARTED, aucune exécution incluse dans ce commit.
- **Branch :** `build/v0.2-b02-first-screen-map`
- **Base :** `672da90dfb3c8c5720ee99273896b282fb0e5d72` (TASK-0058 VERIFIED par ACTION-0109).
- **Décision :** `docs/reviews/ACTION-0109-task0058-independent-control.md`
- **Exécuteur conseillé :** Claude Code — Sonnet, effort HIGH.
- **Stage :** B uniquement. A CLOSED. C/D non démarrées.

## Problème démontré et résultat attendu

B01-O1 (preuve WebView2 réelle de TASK-0058) : à 960×640, première capture sans carte; `.app__main` commence à 727px et le document peut atteindre 4185px. Ce n'est pas un échec contractuel de B01, mais un défaut de hiérarchie visuelle pour l'étape B. Référence autoritative : `DEC-0034`, `REFERENCE_UX_OLD_FILETOPO.md` (reconnaître racine, branches et orientation d'un cerveau réel), sans copie privée ni changement de modèle.

### Critères falsifiables B02

Sur REAL_ROOT **synthétique temporaire**, workspace **neuf** et chargement achevé, à **960×640**, **1280×800** et **1366×768**, FR et EN, clair et sombre :
1. À `scrollY=0`, la surface `MapView` SVG est visible et exploitable dans le viewport physique; une partie utile de la carte (au moins **200 CSS px** de hauteur visible) et la carte racine ou un nœud de contexte initial identifiable sont dans la première fenêtre, **sans** défilement du document. Si techniquement impossible avec les contraintes actuelles, enregistrer le cas `BLOCKED` avec métriques, ne pas truquer via zoom/fit ou image factice.
2. Une fenêtre restreinte n'enlève **aucune commande**, n'interdit pas l'accès aux exclusions/diagnostics et ne casse ni clavier, ni focus, ni FR/EN, ni thème, ni reduced-motion, ni contraste applicable. Un panneau **explicitement déplié par l'utilisateur** peut autoriser le défilement vertical; les commandes restent accessibles.
3. Les arêtes/nœuds de la carte gardent leurs **coordonnées du monde**; une modification de hauteur de viewport n'autorise pas un zoom-to-fit automatique, une perte de sélection/état ou un décalage silencieux d'une caméra persistée. Il faut comparer les invariants de caméra sous viewport redimensionné selon les routines de `viewState.ts` / `resumeState.ts` existantes, et vérifier que les cibles naviguées restent visibles.
4. P-19 : fermer et rouvrir le vrai processus préserve cerveau/composition/focus/sélection/locale/densité/motion/légende conformément au contrat, sans écriture sous la racine. P-22 : empreintes strictes identiques, aucun artefact FileTopo dans la source.
5. Les cas densité compact, reduced motion et légende/panneaux ouverts demeurent navigables; au moins les interactions ciblées P-02/P-05/P-07/P-11/P-19/P-21/P-22 sont rejouées sans les déclarer intégralement VERIFIED.
6. Diff petit et documenté. Aucune modification backend, no patch hidden to relax tests. Captures **avant/après** démontrent le vrai écran initial, pas une page scrollée.

## Reuse-first / ce qu'il faut regarder avant de toucher

Lire `AGENTS.md`, `docs/ai/START_HERE.md`, la décision ACTION-0109, B01 et son JSON/PNG, `DEC-0015`, `DEC-0034`, `DEC-0044`, `DEC-0045`, `DEC-0051`, `MapApp.tsx` JSX (header/brains/exclusions/actions/rapports avant main), `map.css`, `MapView.tsx`, `viewState.ts`, `workspaceCss.test.ts`, `responsiveLayout.test.ts`, `task0058-visual.*` et les anciens harnais du runtime.

Réutiliser les composants, CSS/tokens, les contrôles de visibilité, les primitives natives accessibles de dépli, les tests existants. Évaluer la compaction/organisation ou l'accès explicite aux **diagnostics de développeur** avant d'introduire de l'état/persistance. Ne pas retirer ou renommer à la légère les `data-testid` utilisés par les campagnes historiques : recenser les dépendances avant de déplacer/plier les contrôles. Aucune nouvelle bibliothèque, design system, framework d'overlay, second renderer ou dépendance.

## Fichiers autorisés

- UI : `src/map/MapApp.tsx`, `src/map/map.css` **seulement**, et `src/map/mapStrings.ts` si une chaîne FR/EN réellement nouvelle est indispensable.
- Tests/harnas : `src/map/responsiveLayout.test.ts` et tests UI ciblés déjà existants si nécessaire, `scripts/task0059-*.mjs` / `.ps1` ou adaptation d'un harnais compatible B01 **sans effacer le témoin B01**, preuves `docs/performance/runs/TASK-0059-*`.
- Docs : cette fiche, `.orchestrator/RESULT.md`, `docs/ai/{CURRENT_STATE,HANDOFF,NEXT_ACTION,VALIDATION,CHANGELOG_AI}.md`.

Hors portée sans GO additionnel : `src-tauri/**`, Rust, SQLite, scanner, REAL_ROOT, relations, Index, migrations, données/wire/IPC, `MapView.tsx`, `viewState.ts`, `resumeState.ts`, modèle/caméra métier, `package.json`, lockfile, `src/App.*` ancien prototype, suppression d'un contrôle. **Si un de ces fichiers doit changer : STOP/BLOCKED et justification documentée.**

## Garde-fous / preuves

1. Commencer par capturer/mesurer **B01-O1** sur le HEAD de départ (pas seulement reprendre la conclusion de B01). Établir comptes et état de l'écran dans les deux langues et thèmes, taille client réelle Win32, `scrollY=0`, bounding boxes carte/toolbar/aside/root, screenshot.
2. Montrer que le changement est principalement de **présentation**, éventuellement avec disclosure DOM minimal; aucun nouveau système d'état. Toute section déplacée reste nommée et activable au clavier. Si `MapApp` change, démontrer une absence de modification des chemins d'invocation et de persistence métier.
3. Capturer après aux trois tailles, au moins états FR/EN clair/sombre, plus reduced motion et compact. Comparer `DOMRect` de la carte, visibilité du premier nœud, horizontal overflow, focus et axe-core avec les `incomplete` publiés. Ne pas assimiler 0 violation à certification.
4. Rejouer les scénarios ciblés + redémarrage WebView2 + empreinte source stricte, et `pnpm test`, `pnpm check`, `pnpm build`, `git diff --check`; tout échec non expliqué est bloquant. Les tests Rust ne sont pas nécessaires si code Rust inchangé, le noter explicitement. CI distante si elle existe, sinon dire NON.
5. Le test B01 `responsiveLayout.test.ts` documente une baseline historique, il **ne doit pas interdire** une correction légitime de Stage B. Si la grille change, remplacer les assertions de CSS figé par des invariants UX falsifiables et de vrais résultats WebView2; ne pas supprimer les garde-fous fonctionnels.
6. Écrire artefacts synthétiques et `.orchestrator/RESULT.md`, mettre à jour mémoire, statut **IMPLEMENTED** ou **BLOCKED** (jamais VERIFIED). Commit/push non forcé sur cette branche et STOP. Ne pas préparer TASK-0060.

## Interdits

Aucune source personnelle/privée, aucune copie de maquette privée, aucune modification de la racine analysée, aucune connexion tierce, ni OCR/IA/FTS/cloud, pas de modification fonctionnelle Stage A, pas de chiffres de performance R8, aucune PR/release/tag/merge main. Stage C/D ne commencent pas. Si le critère visuel exige d'enfreindre ces garde-fous, refuser et exposer la preuve.
