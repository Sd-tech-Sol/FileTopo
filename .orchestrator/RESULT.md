# ACTION-0115 — correction TASK-0062 / Stage B B05 (B05-O1 focus après APPROUVER, B05-O2 témoins B03/B04)
AGENT: CLAUDE CODE SONNET 5.5 / HIGH
STATUS: IMPLEMENTED (jamais VERIFIED — contrôle indépendant dû à ChatGPT)
BRANCH: build/v0.2-b05-populated-panels; base de la correction `dd01d73` (ACTION-0115), sans divergence, fast-forward seulement
PRODUCT_COMMIT: `0278d1d` (RelationsPanel, CrossRelationsPanel, MapApp, map.css + 2 tests); le HEAD mesuré `824388d` ne diffère du produit que par le harnais `scripts/task0062-*`.

## B05-O1 — focus après APPROUVER
- Mesure BEFORE sur le produit précédent avec le MÊME harnais (`TASK-0062-populated-panels-o1-before.json`, HEAD `59de054`) : 14 cas jugés (3 tailles × FR clair / EN sombre compact réduit × intra / inter-cerveaux au clavier, + souris à 960×640) → **14/14 le focus tombe sur `body`**. Le harnais détecte donc bien le focus perdu.
- Correctif (interface seulement) : après un APPROUVER réussi, le panneau, une fois rechargé, met le focus sur la **commande Révoquer de la même suggestion** (`data-relation-revoke` / `data-cross-revoke`), avec le hook existant `useRestoreFocusAfterReload` **inchangé** (une 2e instance par panneau). Repli : « Analyser les relations » (relations) / titre du panneau, `tabIndex=-1` + anneau `:focus-visible` (inter-cerveaux) ; jamais une autre suggestion, un autre cerveau ni `body`. Aucun Rust, IPC, store, flux d'approbation, restoreFocus.ts, dépendance.
- AFTER (`…-o1-after-r2.json`, HEAD `824388d`, produit `0278d1d`) : **14/14** cas tiennent : focus sur la révocation de la même suggestion, contrôle entier, anneau 3 px, `scrollY=0`, Tab ne tombe pas sur `body` (sauf bord de document, voir ci-dessous), Shift+Tab revient à la révocation, aller-retour OK, compteurs restaurés après révocation clavier. Matrice 19/19 + redémarrage 2/2 sans critère en échec, 8/8 interactions, carte ≥257 px, 13/13, P-22 (strict + accès identiques, 0 artefact, 0 appel mutant).
- **Critère affiné après coup, publié tel quel :** le premier AFTER (`…-o1-after.json`, HEAD `0278d1d`) donnait déjà 14/14 sur « focus sur la bonne révocation » mais échouait 6 cas inter-cerveaux clavier sur le sous-critère Tab, parce que la révocation y est le **dernier focusable du document** : Tab passe par un arrêt hôte (`body`) ou reboucle sur `language-fr`. Le harnais mesure maintenant `revokeIsLastFocusable` et tolère ≤ 2 arrêts de bord uniquement dans ce cas. Les deux JSON sont publiés; le contre-essai (14/14 en échec) ne dépend pas de ce sous-critère.
- Tests jsdom ciblés : 7 nouveaux (relations 3, inter-cerveaux 4) — focus sur la même suggestion après rechargement et une seule fois, jamais une autre relation, rien volé sans approbation, replis.

## B05-O2 — témoins versionnés rejoués TELS QUELS
- **B04** `scripts/task0061-multibrain-shell.ps1 -Label b05-replay` → `TASK-0061-multibrain-shell-b05-replay.json` : 30 + 2 + 6 états. Comparaison feuille à feuille avec la référence `TASK-0061-multibrain-shell-correction.json` : 7 175 / 472 / 1 327 feuilles de verdict, **12 écarts**, tous un identifiant de cerveau aléatoire (9) ou la largeur d'un avis (915,5 → 910,6 px, 3). Menu fermé : 13/13 et groupes entiers; **lectures strictes `false` menu ouvert conservées** (6 états, voile bloquant, non transformées en `true`); `menuIsModal`, promesse modale tenue 6/6, activation des groupes récupérée par la voie modale, première action ferme / suivante active, Échap ferme l'avis, entiers après fermeture; P-22 identique.
- **B03** `scripts/task0060-primary-chrome.ps1 -Phase after -Out …TASK-0062-b03-witness-replay.json` : 18 états; 5 138 + 280 feuilles de verdict **identiques** à `TASK-0060-primary-chrome-after.json` (0 écart); 13/13, 3 groupes entiers souris/clavier, carte 261–535 px; P-22 identique. Les 6 PNG que ce script réécrit sous `TASK-0060-after-*` ont été renommés `TASK-0062-b03-replay-*` et les originaux versionnés remis octet pour octet : aucun fichier B03 suivi n'est modifié.

## Validations
- `pnpm check` PASS; `pnpm build` PASS; `git diff --check` PASS.
- `pnpm test` sur le produit final : 12 runs complets séparés; 11 PASS (804/804 vérifiés sur les runs 5 et 7–12; 1–4 sans ligne FAIL, comptes non capturés), **1 échec** `workspaceMapApp.test.tsx > a branch focus survives a restart > writes the collapsed folders with the branch` (run 6). Ce fichier seul : 1 échec sur 30 runs isolés. **Base B04 `5dcd9d4` : 0 échec sur 6 suites complètes (794/794) et 0/12 en isolation.** Intermittence NON attribuée, NON masquée, aucun test touché; la correction ne touche ni branch focus ni dossiers repliés, mais « zéro différence de taux » n'est pas démontré (échantillons petits). L'intermittence `brainIdentity` du run antérieur n'est pas réapparue sur ces 12 runs; elle reste signalée (2 échecs / 4 runs complets avant la correction; 0/8 isolé).
- Aucune CI distante n'a été lancée ni consultée.

## Non testé / limites
- Aucun lecteur d'écran; axe `color-contrast` INCOMPLETE (18 nœuds max), pas de certification WCAG; texte minimal 10,5 px.
- Pas de replay P-01..P-22 complet; P-22 sur une racine REAL_ROOT synthétique à chaque campagne (pas quatre racines, hors B04 rejoué qui en empreinte quatre).
- Rust non touché ni rejoué.
- Couche de statut fixe : recouvre 39 px du bas de l'aside à 960×640 (mesure conservée, 0 contrôle définitivement inatteignable).
- Le focus après approbation par SOURIS arrive aussi sur la révocation (même mécanisme) : choix assumé, mesuré 2 cas.
- Les mesures et tests sont rapportés par l'exécutant; ChatGPT ne les a pas rejoués.

GIT: voir `git log`; push B05 sans force; main, TASK-0063, Stage C/D, PR, release intacts.
NEXT: contrôle indépendant ChatGPT de la correction ACTION-0115 sur GitHub.
