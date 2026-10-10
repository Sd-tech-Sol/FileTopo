# HANDOFF — passage de relais

## ACTION-0114 — TASK-0061 B04 VERIFIED / B05 approuvée — 2026-10-09

- Contrôle GitHub indépendant au `db2392f7f428712d6233399f3e27a497cf5dbb71` (campagne WebView2 sur `3363b6976704d1b8b56702b1537fe1f59e3b6414`, docs/preuves ensuite). Deux critères ACTION-0113 résolus : messages/corrections et fermeture visibles dès l'apparition 12/12; menu de composition explicitement temporairement modal, clic/Escape le ferme sans activer l'arrière-plan, trois groupes souris/clavier testés après fermeture dans 6 états.
- IMPORTANT : strict `groupEntryPointsWholeEveryState=false` menu ouvert est **honnête** : le voile bloque le clic derrière, les contrôles ne sont pas perdus. Alternative modal autorisée et acceptée dans ACTION-0114, pas une certification ARIA.
- B04 mono/multi : 13/13 commandes, carte ≥257px menu fermé; P-19 redémarrage, P-22 empreintes strict+access inchangées sur 4 racines; baseline B03 18/18. Tests 794/794 ×2 PASS **rapportés par Claude**, pas relancés par ChatGPT; 0 CI distante; instabilité brainIdentity isolée à surveiller.
- **TASK-0061 VERIFIED dans sa portée, Stage B EN COURS non fermée.**
- Une prochaine tâche seulement : TASK-0062 B05 APPROVED / NOT STARTED sur `build/v0.2-b05-populated-panels`, mesurer vrais panneaux peuplés Relations/Review/Cross à 960x640. Finition sans toucher moteurs/Index/IPC. Contrastes/accessibilité WCAG et replay P-01..P-22 restent à faire avant clôture Stage B.


## TASK-0061 — correction ACTION-0113 `IMPLEMENTED`, relais au contrôle indépendant — 2026-10-09

- Lecture à faire : `.orchestrator/RESULT.md`, `docs/tasks/TASK-0061-stage-b-multibrain-shell.md` (dernière section), `docs/performance/runs/TASK-0061-multibrain-shell-{correction,before-correction}.json`, `TASK-0061-b03-baseline-correction.json`, `TASK-0061-status-visibility-{correction,before-correction}.json`, captures `TASK-0061-correction-*.png`.
- **Leçons de méthode** : (1) une surcouche corrective doit être mesurée contre ce qu'elle recouvre : ma première couche pour les corrections tenait « entière » mais cachait les cartes de la carte à 960×640 (`visibleCardCount` 0) — trouvé par le harnais, pas par jsdom; (2) un voile modal rend fausses, par construction, les lectures strictes de pointage : il faut les publier telles quelles ET mesurer la récupération (première pression, Échap, activation après fermeture), jamais les réinterpréter; (3) `click()` du harnais fait `scrollIntoView` et masquerait le défaut des notices : utiliser `pressWithoutScrolling`; (4) un verdict sur ce qu'une passe n'a pas soulevé est `null`, pas `false`; (5) sous Windows, un script Python qui réécrit un fichier source LF y met du CRLF et casse les gardes de source : écrire avec `newline=""`.
- Contre-épreuve : commit jetable sur une branche locale temporaire (jamais poussée, supprimée) avec les quatre fichiers produit de `e31384f`; ~15 min par campagne complète.
- Limites ouvertes : Diagnostics ouvert sous le plafond de la bande à 960×640; 4 pastilles = 4–8 caractères; Entrée/Échap sur le bouton des corrections prouvés par jsdom seulement; statut ≈3,4 % de la carte à 1280/1366.
- Aucune TASK-0062, aucune Stage C/D, aucune PR/release/tag/fusion. Prochaine action UNIQUE : contrôle indépendant de TASK-0061.

## ACTION-0113 — contrôle indépendant B04 / correction requise — 2026-10-09

- Contrôle GitHub B04 au `b964c45359bf2427d38ce177c09119ca5195a417` : 14 commits, après 30 états WebView2 et 18 de baseline B03, 13/13 primaires entières, carte 253,4–496px, noms et menu des 2–4 cerveaux, P-19/P-22. Contre-épreuve ancien produit 9/13, tests 787/787 ×2 RAPPORTÉS, CI distante absente.
- **TASK-0061 IMPLEMENTED / NOT VERIFIED / CORRECTION REQUIRED.** B04-O1 : dans 6 états menu ouvert, Diagnostics est recouvert et son activation n'a pas été testée. B04-O2 : à 960x640, retours de statut refus/index absent visibles à 0/35px, corrections et bouton de fermeture sous le pli; certains boutons de fermeture aussi rognés à 1280 FR.
- Même tâche, même branche B04, prompt ACTION-0113 publié. Ne pas créer TASK-0062; Stage B reste EN COURS et main/Stage C/D/R8 intacts.


## TASK-0061 — B04 `IMPLEMENTED`, relais au contrôle indépendant — 2026-10-09

- Lecture à faire : `.orchestrator/RESULT.md`, `docs/tasks/TASK-0061-stage-b-multibrain-shell.md`, `docs/performance/runs/TASK-0061-multibrain-shell-{after,previous-product}.json`, `TASK-0061-b03-baseline-harness-on-b04.json`, `TASK-0061-status-visibility-*.json` et les captures `TASK-0061-{after,previous-product}-*.png`.
- **Leçons de méthode** : (1) le catalogue contient aussi les trois cerveaux intégrés — un menu d'ajout n'est jamais vide et son premier élément n'est pas votre fixture; (2) une surcouche `position: fixed` n'est pas rognée par la bande qui la contient : le harnais doit arrêter le calcul de rognage à un élément fixe; (3) un clic « là où le résumé était » peut tomber sur un autre contrôle (la légende) et décaler toute la colonne : ne jamais cliquer où le test de pointage n'a pas répondu; (4) mon premier patch avait **cassé** la fermeture du menu par son déclencheur (blur puis clic) — trouvé par la campagne, jamais par jsdom; (5) la contre-épreuve sur le produit précédent est faite par un commit jetable local, supprimé ensuite (`headTested d071e8a` n'existe pas sur origin).
- Harnais : `scripts/task0061-multibrain-shell.{ps1,mjs}`, `task0061-seed-proof.py`, `task0061-catalog-drop.py`, `task0061-derive-status-visibility.py`; `T61_ONLY=menu|groups|walk|p` isole un segment pour déboguer. Compter ~35 min par campagne complète.
- Limites ouvertes, volontairement non traitées : Diagnostics ouvert sous le plafond de la bande à 960×640 (2+ rangées), statut sous le pli à 960×640, surcouche du menu sur Diagnostics, noms de 4–8 caractères avec 4 pastilles à 960. Le « panneaux avancés en petite fenêtre » de la note de séquencement les recoupe.
- Aucune TASK-0062, aucune Stage C/D, aucune PR/release/tag/fusion. Prochaine action UNIQUE : contrôle indépendant de TASK-0061.

## ACTION-0112 — TASK-0060 VERIFIED / B04 approuvée — 2026-10-09

- Ref B03 contrôlée `c055181d8236a6681c97aea4d5ed77731d9d1e30` (artefact WebView2 AFTER testé au HEAD `fb01e3cdbe5fa76538e01f597965bac32412fe63` et docs seulement ensuite). Action ACTION-0111 close : les 13 actions primaires sont **entièrement** visibles, les trois groupes avancés entièrement détectables et souris/clavier dans 18/18 états réels, carte visible entre 261 et 535px, aucune commande perdue, P-19/P-22 conservées.
- Contre-épreuve harnais `TASK-0060-primary-chrome-previous-product.json` échoue sur l'ancien produit (10/13 entières, groupes rognés), preuve anti-faux PASS. Captures 960 FR clair/sombre et 1280 FR clair inspectées.
- `pnpm test 781/781` 2 fois, check/build/diff-check PASS **rapportés par Claude seulement**, non relancés par ChatGPT. CI distant 0. Rust non touché/non rejoué.
- **VERDICT : TASK-0060 VERIFIED dans la portée B03. Stage B demeure EN COURS.**
- Dette ciblée suivante : absence d'essais avec 2–3 cerveaux, noms longs/Unicode, statut et menu de composition. TASK-0061 B04 approuvée (mesure d'abord; patch UI uniquement si besoin) sur `build/v0.2-b04-multibrain-shell`, agent Sonnet/HIGH. Aucune task après B04, R8/C/D/main intacts.


## Relais — correction ACTION-0111 de TASK-0060 (`B03-O1`) — 2026-10-09

- Branche `build/v0.2-b03-primary-chrome`; `HEAD` mesuré `fb01e3c`. Le diagnostic « arithmétique » de `B03-O1` — « il faut reprendre des pixels à la carte ou retirer du contenu » — était **faux** : le chrome tenait 125 px, pas 281, dès qu'on a rangé les mêmes éléments autrement. Un budget calculé à la main sur une disposition n'est pas une preuve qu'aucune autre n'existe; ACTION-0111 avait raison de le dire.
- **Ce qui pesait vraiment :** trois rangées qui n'en avaient pas besoin (en-tête sur deux lignes, composition et actions sur deux, deux groupes sur deux) et un diagnostic développeur — la référence de source, 36 caractères — écrit dans **chaque pastille de cerveau**. Elle repliait les trois actions principales sous le pli. Déplacée dans Diagnostics, en entier.
- **Ce que la campagne a refusé en route, et c'est ce qui la rend crédible :** une ellipse sur la source (le tripwire « défileur latéral » de B01 l'a signalée), puis la source sur sa propre ligne (la rangée composition s'est repliée à 103 px). Aucun témoin n'a été affaibli : la solution a plié, pas le test.
- **Piège de mesure appris :** WebView2 dessine un `<details>` fermé avec `content-visibility: hidden`; ses enfants gardent des rectangles (`getClientRects` non vide, `laidOut = true` pour les 59). Une commande « présente » dans un groupe fermé n'est donc pas « mise en page » au sens utile : seul le test de pointage dit si elle est atteignable. `laidOut` est publié à part et ne juge plus rien.
- **Piège de mesure, suite :** `click()` du harnais fait `scrollIntoView` — il aurait caché exactement le défaut mesuré. La nouvelle mesure `measureGroupEntryPoints` clique au centre du résumé **tel que la première fenêtre le dessine**, sans rien défiler avant, et lit `expanded` dans l'arbre d'accessibilité (`Accessibility.getPartialAXTree`).
- **Méthode :** le harnais a été **falsifié** avant d'être cru : même procédure sur le produit précédent (arbre `src/` identique à `7912868`, commit jetable local) → il échoue à 10/13 et sur 6 entrées de groupe. Les deux nouvelles gardes statiques ont aussi été falsifiées (retirer un `openGroup`, poser un `text-overflow`).
- **jsdom :** `localeRuntime`, `brainIdentity`, `resumeMapApp`, `watchMapApp`, `workspaceMapApp` pilotaient des commandes de groupes fermés — et passaient. Elles ouvrent maintenant le groupe via `src/test/disclosure.ts`; une garde dans `responsiveLayout.test.ts` l'exige pour tout `data-testid` de groupe. Elle ne voit pas une commande trouvée par rôle ou libellé : ne pas lire un `pnpm test` vert comme une preuve de visibilité.
- **Méthode à réutiliser :** `scripts/task0060-primary-chrome.ps1 -Phase after -WorkDirectory <hors dépôt>` (pwsh 7, arbre suivi propre — commiter avant de mesurer, restaurer les captures régénérées avant une exploration), 6 min. `-Out` permet de nommer un artefact distinct.
- Reste, dit : rangée composition non mesurée avec plusieurs cerveaux, un nom long ou une ligne de statut (51 px de marge); pas de lecteur d'écran; contraste `INCOMPLETE`; `P-01..P-22` à la clôture de Stage B; aucune CI distante.
- Prochaine action UNIQUE : contrôle indépendant de `TASK-0060` par l'orchestrateur, puis `VERIFIED` ou refus. Pas de `TASK-0061`, pas de Stage C/D, pas de PR ni de fusion.

## ACTION-0111 — audit indépendant : B03 correction requise — 2026-10-09

- HEAD vérifié sur GitHub : `79128682d61cedf22b39ea18fb1f022c33149c39`; preuve WebView2 AFTER au commit `a645303631db59063b463bc4d44f0cf4f95bc258`. Campagne et 12 captures inspectées, diff de produit autorisé, zéro GitHub Actions/check.
- Mesure principale : `primaryContractSatisfied=true` mais **`primaryContractSatisfiedWhole=false`, 10/13 entières au pire**. À 960x640 confortable : les boutons Ajouter un dossier/Ouvrir/Actualiser ne montrent que 20/35px; les deux résumés chrome avancé/diagnostic sont 25/70px sous le pli. Cela ne livre pas encore le premier écran clair demandé par TASK-0060.
- Verdict : `TASK-0060 IMPLEMENTED / NOT VERIFIED / CORRECTION REQUIRED`, pas un échec backend. Les autres preuves positives (59 dans DOM, carte 240-474, focus disclosures, P-19/P-22, 770 tests pnpm rapportés 2 fois) restent valables dans leurs limites.
- Une seule suite autorisée : **corriger TASK-0060 sur B03**, pas de TASK-0061. Source de vérité ACTION-0111 + NEXT_PROMPT. Stage B non close, Stage C/D et R8 inchangées, main non fusionnée.


## Relais — TASK-0060 / Stage B B03, ce qu'on fait toujours est sur le premier écran — 2026-10-09

- Branche `build/v0.2-b03-primary-chrome`; `HEAD` mesuré `before` `a03b8bc`, `after` `a645303`.
- **Mesurer d'abord a encore payé, et dans l'autre sens.** `B02-O1` parlait de bandes qui défilent. La campagne `before` dit **quelles commandes** cela coûte : `brain-add-real-root`, `lifecycle-open` et `lifecycle-refresh` ne sont sur le premier écran dans **aucun** des 18 états, `composition-add-trigger` dans aucun des 6 à 960×640. Un défaut de disposition se raconte en pixels de bande; il se **prouve** en commandes nommées, une par une, jamais en total.
- **La plus grosse cause n'était pas celle qu'on cherchait.** `.composition` n'avait **aucune règle** dans `map.css` : le navigateur appliquait ses défauts de `<ul>` — marqueur, 40 px de retrait, une pastille par ligne — et `nav.app__brains` pesait 389 px à elle seule. Avant d'organiser quoi que ce soit, chercher ce qui n'est **pas** stylé.
- **Piège de mesure, celui qui aurait tout faussé.** La première campagne `after` annonçait trois boutons « entiers, 35 px » que la capture publiée montrait coupés en deux. Depuis B02, trois régions défilent dans elles-mêmes : clipper un élément par **la fenêtre** ne décrit plus rien. Le bon clip est la fenêtre **intersectée avec la boîte client de chaque ancêtre qui défile**, et le test de pointage se prend au centre de **ce** rectangle. Sans cela, un bouton qui montre 20 px sur 35 se lit « complet ». **Toujours comparer le chiffre à la capture du même état.**
- **jsdom n'implémente pas un `<details>` fermé.** Il donne aux enfants d'un groupe fermé une boîte, un `display` calculé, une place dans l'arbre d'accessibilité et une cible `fireEvent`. Les 736 tests existants sont donc passés **sans une seule modification** quand les groupes sont arrivés : c'est une bonne nouvelle — aucune couverture sémantique perdue — et **zéro preuve** sur le disclosure. Ne jamais lire un `pnpm test` vert comme une preuve de visibilité.
- **Méthode à réutiliser :** `scripts/task0060-primary-chrome.ps1 -Phase before|after -WorkDirectory <hors dépôt>` (pwsh 7). Même fixture, même procédure, mêmes six états, mêmes trois tailles pour les deux phases. Quand le harnais change, **les deux phases sont reprises** : ici elles l'ont été deux fois, et le `before` a été remesuré en `git checkout --detach a03b8bc` avec le harnais copié en non suivi, pour que `headTested` dise la vérité. `scripts/task0058-resize.ps1` et `scripts/task0056-fingerprint.py` restent **réutilisés tels quels**; les témoins B01 et B02 ne sont pas touchés.
- **Ce que le correctif a touché, et seulement cela :** trois `<details class="app__group">` natifs dans `MapApp.tsx`; les règles des groupes et de `.composition` dans `map.css`; six chaînes FR/EN `t.groups.*` dans `mapStrings.ts`; `responsiveLayout.test.ts` de 15 à 49 tests. Aucun contrôle supprimé, renommé ni réordonné dans son niveau : 59 commandes dans le DOM dans les 18 états, avant comme après.
- **Aucun état applicatif pour un disclosure.** Le moteur possède `open`; rien ne le lit, l'écrit ou le restaure. La passe 1 laisse un groupe ouvert **exprès**, et le second processus les trouve **fermés** : c'est la non-persistance choisie, mesurée, et publiée comme telle plutôt qu'habillée en préférence restaurée.
- **Le sujet de la suite, chiffré — `B03-O1` :** à 960×640 en densité confortable la bande de chrome tient 281 px dans une boîte de 176. Trois boutons montrent 20 px sur 35, et les deux lignes de groupe du chrome sont 25 px et 70 px sous le pli à l'ouverture. Le budget est arithmétique : 598 px de coquille, 422 au plancher de la rangée carte, 176 au chrome. On ne ferme pas cet écart en présentation : il faut **reprendre des pixels à la carte** — interdit par le critère de cette tranche — ou **retirer du contenu**. **Arbitrage orchestrateur.**
- Jamais mesuré, à ne pas supposer couvert : **lecteur d'écran réel** sur un disclosure (ce qui est mesuré : ordre de tabulation, libellé dans la langue de l'état, ouverture à `Entrée`, 0 violation axe); `color-contrast` laissé `INCOMPLETE` (16–17 nœuds); panneaux **relations**, **file de révision** et **inter-cerveaux**, que la fixture ne peuple toujours pas; la marche clavier n'est faite qu'à **960×640**; le menu `composition__menu` n'a pas été ouvert pendant la campagne et reste **en flux**, sans règle de position.
- Portes : `pnpm test` **770/770** **deux fois** — l'échec isolé `workspaceMapApp` signalé par B02 n'est pas reparu; `pnpm check`, `pnpm build`, `git diff --check`. Rust non exécuté. **Aucune CI distante.**
- Prochaine action UNIQUE : contrôle indépendant de `TASK-0060` par l'orchestrateur, puis `VERIFIED` ou refus. Pas de `TASK-0061`, pas de Stage C/D, pas de PR ni de fusion.

## Relais — ACTION-0110 / Stage B B03 — 2026-10-09

- B02 = VERIFIED sur GitHub `f5da1d41226c7fcf34a24351af8fe55b3bb4525b` (preuves enregistrées à `921dacb1591e4a1d076705b4cfaae13bc08bdab7`). Lecture indépendante diffs/JSON/captures; aucun test local relancé par ChatGPT. 18/18 = carte visible 240px; parité ciblée P-02/05/07/11/19/21/22 toujours dans les limites publiées.
- Problème restant `B02-O1` : UX a une bande en haut 176px pour 723px de contenus, une bande de commandes carte 134 pour 625, aside 422 pour 2192 à 960x640. La fonction de scroll clavier marche, mais les commandes ne sont pas lisibles en premier écran.
- B03 `TASK-0060` sur `build/v0.2-b03-primary-chrome` : organiser primaire (cerveau, ouvrir/actualiser, recherche, caméra) vs avancé (diagnostics, outils secondaires, exclusions), préserver 59 commandes, tester au moins 240px de carte; ne pas confondre commandes dans DOM et visibles avec disclosure fermé.
- Nouvelles chaînes localisées dans mapStrings.ts seulement si nécessaires. Réutiliser natif details/summary, pas de dépendance/UI framework, conserver P-19, P-22, caméra/Index.
- CI distante absente; tests PNPM rapportés 736 PASS, un échec workspaceMapApp ponctuel sous charge à surveiller. Contraste INCOMPLETE, lecteur d'écran et panneaux relations/review/cross non mesurés.
- `.orchestrator/NEXT_PROMPT.md` = unique GO, l'agent s'arrête après IMPLEMENTED/BLOCKED et push. Ne pas lancer TASK-0061/Stage C/D ni modifier main.


## Relais — TASK-0059 / Stage B B02, la carte est sur le premier écran — 2026-10-09

- Branche `build/v0.2-b02-first-screen-map`; `HEAD` mesuré `before` `0b6de20`, `after` `921dacb`.
- **Mesurer d'abord a payé.** `B01-O1` disait « carte sous la ligne de flottaison à 960×640 ». La campagne `before` dit : **0 px de carte et 0 carte visible dans les 18 états, aux trois tailles**. 1280×800 et 1366×768 n'étaient pas meilleures — personne ne leur avait posé la question. Ne pas reprendre une conclusion : la refaire.
- **La cause racine était une ligne.** `.app { min-height: 100vh }` est un plancher, jamais un plafond : le contenu dimensionnait la coquille, le panneau droit faisait grandir la rangée de grille, et le document montait à 3545 px. `height: 100vh` + `overflow: hidden` rend la coquille à la fenêtre, et à partir de là `.app__aside` défile **enfin** dans lui-même, ce que son propre `overflow: auto` demandait depuis toujours.
- **Deux pièges spécifiques à ce correctif, déjà payés.** (1) Un plancher en pixels plats — `min-height: 420px` sur `.map-view` — demande plus que la fenêtre n'a dans une fenêtre de 640, et le moteur répond en faisant grandir le document : tout plancher doit être exprimé contre la fenêtre. (2) Dès qu'une région défile dans elle-même, `window.scrollTo(0, 0)` ne décrit plus un écran d'ouverture : il faut aussi remettre chaque région à son origine, sinon une capture montre une interface à mi-défilement en prétendant montrer la première.
- **Piège de harnais, transposable :** un commentaire contenant une apostrophe inverse à l'intérieur du littéral gabarit envoyé au moteur **ferme le littéral**. Node le signale comme un `TypeError` quatre-vingts lignes plus loin, après une passe WebView2 complète. Les deux scripts de page sont désormais vérifiés hors moteur avant la campagne.
- **Méthode à réutiliser :** `scripts/task0059-first-screen.ps1 -Phase before|after -WorkDirectory <hors dépôt>` (pwsh 7). Même fixture, même procédure, mêmes six états, mêmes trois tailles pour les deux phases : une campagne avant et une campagne après mesurées autrement ne comparent rien. `scripts/task0058-resize.ps1` et `scripts/task0056-fingerprint.py` sont **réutilisés tels quels**; le témoin B01 `scripts/task0058-*` n'est pas effacé.
- **Ce que le correctif a touché, et seulement cela :** `.app`, `.app__chrome` (neuf), `.app__main`, `.app__map`, `.app__map-controls` (neuf), `.map-view` dans `map.css`; deux `<div>` d'enveloppe dans `MapApp.tsx` — quatre lignes. Aucune commande retirée, déplacée ou repliée; les 59 contrôles et leurs `data-testid` sont ceux de l'inventaire B01.
- **Le sujet de la suite, chiffré :** les bandes défilent dans elles-mêmes à toutes les tailles mesurées — à 960×640 la bande de chrome montre 176 px sur 723. Rien n'est perdu, le clavier atteint tout, mais la nav composition/identité/exclusions pèse **389 px** à elle seule, à 960 comme à 1280. La compacter rendrait mécaniquement de la hauteur à la carte **sans retoucher une seule des règles posées ici**. C'est de l'organisation produit, pas de la présentation : **arbitrage orchestrateur**.
- Jamais mesuré, à ne pas supposer couvert : panneaux **relations**, **file de révision** et **inter-cerveaux** en largeur étroite — la fixture ne les peuple toujours pas; lecteur d'écran réel; contrastes `color-contrast` laissés `incomplete` par axe (9 à 18 après, 12 à 20 avant), non tranchés.
- Instabilité observée et non attribuée : `workspaceMapApp.test.tsx > writes the collapsed folders with the branch` a échoué **une fois** sous charge, non reproduit sur le fichier seul ni sur deux exécutions complètes suivantes.
- Prochaine action UNIQUE : contrôle indépendant de `TASK-0059` par l'orchestrateur, puis `VERIFIED` ou refus. Pas de `TASK-0060`, pas de Stage C/D, pas de PR ni de fusion.


## Relais — ACTION-0109 / B02 premier écran — 2026-10-09

- B01 indépendante : `TASK-0058 = VERIFIED` au HEAD `672da90dfb3c8c5720ee99273896b282fb0e5d72` (ACTION-0109). Validation scope horizontal/focus uniquement; pas de CSS modifié et aucune CI GitHub.
- B01-O1 : sur une fenêtre réelle 960×640, la carte commence à 727px; le premier écran n'affiche pas la carte. Le rapport garde 1719px pour atteindre une carte et un document jusqu'à 4185px. Constat corroboré par captures publiées.
- Début `<main className="app__main">` seulement après header/brains/exclusions/contrôles développeur/reports dans MapApp; `map.css` construit des colonnes 1fr+360px et un long document non borné en hauteur.
- Choix ACTION-0109 : une seule tâche B02, `TASK-0059`, sur `build/v0.2-b02-first-screen-map`. Faire apparaître carte/nœud utile dans la première fenêtre **par présentation seulement**, sans refactor du moteur, ni perte des opérations existantes.
- Préserver caméra et état restauré P-19, clavier/FR-EN/dark-light/reduced-motion, source P-22 inchangée. Les tests B01 peuvent être adaptés si la baseline change, mais en gardant preuve comportementale.
- `.orchestrator/NEXT_PROMPT.md` est le GO unique. Claude rend IMPLEMENTED/BLOCKED; ChatGPT contrôle. Stage C/D non commencées, pas de TASK-0060.


## Relais — TASK-0058 / Stage B B01 mesurée, produit non touché — 2026-10-09

- Branche `build/v0.2-b01-responsive-shell`; `HEAD` mesuré `de6c9e6048def459a22f9332e7d17ca2407d73a1`.
- **Le défaut supposé n'existe pas.** `ACTION-0108` avait nommé une dette statique — grille à deux colonnes sans media query de largeur — en demandant de la **mesurer** avant de la croire. Mesurée sur vrai hôte, elle ne produit **aucun** débordement horizontal, **aucune** perte de commande, **aucun** recouvrement : `minmax(0, 1fr)` fait céder la carte et le panneau garde ses 360 px. `src/map/map.css` est **inchangé**.
- Méthode à réutiliser : `scripts/task0058-visual.ps1` (pwsh 7, `-WorkDirectory` hors dépôt). Elle redimensionne la **vraie** fenêtre par `SetWindowPos` — un override de device metrics ne prouve rien d'un hôte WebView2 — et pose `prefers-color-scheme` / `prefers-reduced-motion` ensemble et explicitement, pour qu'aucun état n'hérite du thème du poste.
- Trois pièges déjà payés, à ne pas repayer : lancer la campagne avec **`pwsh` 7** (5.1 écrit un BOM et casse l'UTF-8 de l'artefact); lire les boîtes **depuis le haut du document** (`getBoundingClientRect` est relatif au viewport, une marche au clavier antérieure fausse tout); démarrer la marche clavier d'un **point fixe** (Chromium garde un point de départ de navigation séquentielle sur le dernier élément défocalisé).
- **Le vrai sujet de la suite, `B01-O1` :** le chrome ne se borne pas à la hauteur de la fenêtre. Le panneau droit ne défile jamais dans lui-même, le document monte à 4185 px pour 640 de haut, et à `960x640` la carte commence à 727 px — sous la ligne de flottaison. **Non réparé volontairement** : borner `.app__main` changerait la hauteur de `.map-view`, donc le `viewport` de `MapView`, donc la caméra, ce que le critère d'acceptation de `TASK-0058` interdit. Une tranche suivante devra décider **explicitement** si Stage B accepte ce déplacement de caméra, et le mesurer.
- Jamais mesuré, à ne pas supposer couvert : les panneaux **relations**, **file de révision** et **inter-cerveaux** de la colonne droite — la fixture ne les peuple pas, et `.review__facts` utilise une piste `auto` qui n'a donc pas été éprouvée en largeur étroite.
- Garde statique posée : `src/map/responsiveLayout.test.ts` épingle ce que la feuille dit aujourd'hui (deux colonnes, plancher `0`, panneau en flux, aucune media query de largeur). Une tranche qui change le chrome fera tomber ce test d'abord — c'est le signal de **re-mesurer**, pas d'adapter le test.
- Prochaine action UNIQUE : contrôle indépendant de `TASK-0058` par l'orchestrateur, puis `VERIFIED` ou refus. Pas de `TASK-0059`, pas de Stage C/D, pas de PR ni de fusion.

## Relais — ACTION-0108 / début contrôlé de Stage B — 2026-10-09

- Branche de travail B01 : `build/v0.2-b01-responsive-shell`; base Stage A `81e7c4fa0135652fd4afae7f6c566628a64ef003`.
- ACTION-0108 audite Stage B et sélectionne seulement `TASK-0058` (APPROVED, non démarrée).
- Contrat : présentation CSS/visuelle; préserve cartes SVG, projection, modèle, IPC, données, clavier, FR/EN, couleurs non exclusives, reduced motion, P-01..P-22.
- Code existant : `src/map/map.css` est la feuille du vrai écran `src/map/MapApp.tsx`, pas `src/App.css` historique.
- Fait vérifié : `.app__main` à deux colonnes; aucune media query largeur; fenêtre Tauri `minWidth=960` / `minHeight=640`. **Bug visuel non prouvé sans WebView2.**
- Exécuteur : mesurer d'abord en WebView2; corriger uniquement CSS chrome si défaut; sinon preuve sans modification produit. Ne pas changer l'intérieur SVG ni l'algorithme `layered-tree-cards-v1`.
- Tests avant PASS : FR/EN, light/dark, 960x640/1280x800/1366x768, clavier/focus, axe, motion reduce, P-22 source inchangée, checks/test/build.
- Anciennes limites P-05/P-11/P-14 et R8 restent documentées; aucune nouvelle preuve d'exécution dans ACTION-0108.
- Prochaine action UNIQUE : exécuter intégralement `.orchestrator/NEXT_PROMPT.md`. Stop après IMPLEMENTED/BLOCKED, contrôle indépendant par ChatGPT, pas de TASK-0059.


## Relais — ACTION-0107 — Stage A CLOSED — 2026-10-09

- Branche contrôlée : `build/v0.2-a41-v1-real-root-relations`.
- HEAD documentaire contrôlé : `362acc2edfe339f67c37a22e81d83a8775596b89`.
- Produit WebView2 testé : `7f43d60a034e21b5ebe5091a1a8180032cd31108`; gate Rust final : `b21c607b1fdae1da331a7bed49b020d464f7bb99`.
- Aucun code produit après le HEAD WebView2; après le HEAD Rust, seulement docs/artefacts.
- TASK-0057 VERIFIED; P-01..P-22 tous CLOSED / VERIFIED.
- Stage A CLOSED.
- Ne pas créer TASK-0058 par inertie et ne pas lancer Claude pour Stage B avant audit orchestrateur.

## Passation du 2026-10-08 — TASK-0057, relations sur une racine réelle, `IMPLEMENTED`

**Où en est l'étape A.** Elle reste **`EN COURS`**, mais plus parce qu'un manque
est ouvert : parce que **l'exécuteur ne ferme rien**. Le seul manque que
`TASK-0056` avait trouvé et qu'`ACTION-0106` avait confirmé est corrigé, la
campagne `P-22` a été rejouée au `HEAD` corrigé et la matrice passe à
`SATISFIED`. `P-04`, `P-05` et `P-07` sont **candidates**. Seule une `ACTION`
indépendante peut clore l'étape.

**Ce qui a changé, et ce qui n'a pas changé.** La frontière des relations, et
elle seule. `generic_source_spec` remplace un `source_spec` qui n'était que
`brain.source_fixture()` sous un autre nom : `Some(spec)` pour un cerveau
synthétique, `None` pour une racine réelle. Le modèle des relations, le
catalogue de règles, le moteur `dre-v1`, le schéma, les dépôts, la surface
inter-cerveaux, les rendus et les dépendances sont intacts — prouvé par
`scripts/task0057-diff-scope.ps1`.

**Ce qu'il ne faut pas refaire.**

- **Ne pas rendre `map_relations_self_check` générique.** Il rejoue une attente
  **gelée** que seule `quasi-empty` peut satisfaire, et il doit refuser une
  racine réelle par son nom — `DEC-0053` B. Le garde structurel échouerait, et
  c'est voulu : il exige à la fois que les six actions génériques n'appellent
  plus `source_fixture()` **et** que `self_check` appelle encore
  `ensure_in_scope()`. On ne peut pas le satisfaire en rendant tout générique.
- **Ne pas lire le panneau des relations avec `.relation__link` tout court.** Une
  ligne de suggestion porte le même bouton (« voir la cible ») sans aucun des
  attributs d'une entrée de relation. Les entrées se comptent sous
  `.relations__direction .relation__link`.
- **Ne pas prendre la note du périmètre legacy pour un refus.** Sur un cerveau
  hors du périmètre `TASK-0017`, `legacy-scope-note` **doit** être là : elle dit
  que la démonstration figée ne s'applique pas et que `dre-v1` s'applique à tous
  les cerveaux. Un premier run corrigé a échoué sur une assertion qui la voulait
  absente.
- **Ne pas écrire de backquote dans un commentaire envoyé à `Runtime.evaluate`.**
  L'expression est un gabarit JavaScript : une backquote le termine.
- **Ne pas confondre « le produit n'a pas pu copier » et « cette machine n'a pas
  de presse-papiers ».** Le `.ps1` écrit lui-même le presse-papiers **avant** la
  fenêtre : quand ce contrôle échoue, `OpenClipboard` échoue pour tout le monde,
  `P-14` est déclarée **non exécutée** et le geste est quand même joué. Quand il
  réussit, rien ne change et une erreur du produit fait toujours échouer le run.
  Même discipline que l'empreinte « settled » de `TASK-0056` : une mesure
  impossible se déclare, elle ne se devine pas et ne passe jamais en silence.
- **Ne pas comparer le nombre d'arêtes dessinées au total de l'index.** Déjà écrit
  par `TASK-0056`, et vérifié de nouveau ici : la vue bornée n'en dessine que
  lorsque **les deux** extrémités sont matérialisées. Le contrôle honnête est à
  deux côtés, et la campagne publie les deux nombres.

**Ce qui est réutilisable tel quel.**

- `scripts/task0057-diff-scope.ps1` — prouve qu'une **correction** n'a touché que
  les fichiers de production que sa fiche autorise, et vérifie ligne par ligne
  qu'un fichier admis pour une seule déclaration `#[cfg(test)]` n'a rien gagné
  d'autre.
- `src-tauri/src/map/relation_real_root_tests.rs` — une campagne unitaire sur un
  vrai dossier jetable, avec un oracle qui lit le dépôt **à côté** de la commande
  sous test, et un garde **structurel** qui énonce la règle au lieu des six cas.
- Le harnais `task0056-webview2.{ps1,mjs}` et `task0056-seed-proof.py`, désormais
  avec la sonde de presse-papiers et la campagne des relations sur racine réelle.

- **Ne pas lancer le gate Rust en travaillant à côté.** La suite contient des
  tests **sensibles au temps** — un observateur natif qui attend jusqu'à 30 s son
  premier événement. Le premier gate de `TASK-0057` a rendu `BLOCKED` à 2/3
  parce qu'un audit lourd en entrées/sorties tournait pendant le run 3, et parce
  que des fichiers suivis ont été modifiés en vol. Le gate avorte maintenant si
  l'arbre suivi bouge entre deux runs, et il enregistre `runAlone`. Le lancer
  avec `-RunAlone` **et** ne rien faire d'autre.

**Action unique suivante :** contrôle indépendant de `TASK-0057`. Deux points à
arbitrer explicitement, écrits dans `NEXT_ACTION.md` : `P-14` non exécutée sur
cette machine, et la moitié « carte » de `P-05` observée à deux côtés. Aucune
`TASK-0058`; ni B, ni C, ni D.

## Relais — ACTION-0106 / TASK-0057 READY — 2026-10-08

- Branche : `build/v0.2-a41-v1-real-root-relations`.
- Base : TASK-0056 BLOCKED, HEAD `ca17df50…`.
- Gap indépendant confirmé : relations intra-cerveau indisponibles sur REAL_ROOT alors que dre-v1 y fonctionne.
- Six actions à corriger ensemble : open, node read, review queue, approve, reject, revoke.
- Legacy frozen derive/seed/self-check reste fixture-only.
- DTO relationnel `fixtureId` : string sur synthétique, null sur REAL_ROOT; jamais sourceRef/path.
- Rejouer le harness complet TASK-0056 au produit corrigé; P-04/P-05/P-07 doivent devenir SATISFIED sur REAL_ROOT et P-22 rester strictement identique.
- Rejouer 3 suites Rust capturées.
- Agent : Claude Code, Opus 5.5 High; **/clear** avant.
- Aucun Stage B/C/D, aucune TASK-0058.

## Passation du 2026-10-08 — TASK-0056, acceptance finale V1, `BLOCKED`

**Où en est l'étape A.** Elle reste **`EN COURS`**. La matrice de preuve
`P-01..P-22` existe enfin, le gate de régression Rust à sorties capturées est
vert trois fois de suite, et `P-22` possède sa première preuve runtime. Mais la
campagne a trouvé un **gap produit**, et `TASK-0056` §9 interdit de le corriger
dans la même tâche : la tâche s'arrête.

**Le gap, à relire d'abord.** Sur un cerveau `REAL_ROOT`,
`map_relations_open`, `map_relations_for_node` et
`map_relations_review_queue` passent par `BrainRecord::source_fixture()`
(`src-tauri/src/map/brains.rs`), qui rend `map_source_not_synthetic` pour une
racine réelle. Le panneau des relations rend donc sa forme « indisponible ».
Le **moteur** est générique et répond sur le même cerveau, ce qui situe l'écart
dans les **lectures**. `DEC-0033` A faisant de la racine réelle la seule entrée
d'une arborescence personnelle, `P-04`, `P-05` et `P-07` sont inatteignables
pour les données de l'utilisateur. Détail et contre-argument :
`TASK-0056` §11, `docs/product/PARITY_MATRIX_P01_P22.md`.

**Ce qu'il ne faut pas refaire.**

- **Ne pas rejouer les seuils lourds** pour fermer une exigence : 100 000 et
  1 000 000 de lignes indexées, la rafale de 10 000 événements, la courbe de
  coût incrémental et la matrice de contrastes sont **composés** depuis leurs
  campagnes `VERIFIED`, nommées ligne par ligne dans la matrice.
- **Ne pas éditer `PARITY_MATRIX_P01_P22.md` à la main.** Il est **généré** par
  `scripts/task0056-render-matrix.py` depuis
  `docs/product/parity-matrix-p01-p22.json`. Le renderer **contrôle** aussi la
  matrice : il refuse une exigence `CLOSED/VERIFIED` sans l'`ACTION` qui l'a
  fermée, une `CANDIDATE` qui prétend l'être fermée, et une ligne qui réclame
  une observation runtime que la campagne n'a pas.
- **Ne pas lire une empreinte de source une seule fois.** NTFS écrit
  l'horodatage d'un dossier paresseusement : la première campagne a rapporté un
  faux échec parce que la ligne de base avait capté trois valeurs non encore
  écrites. `Get-SettledFingerprint` lit jusqu'à ce que deux lectures
  consécutives concordent, et publie le nombre de lectures. Garder cette
  discipline dans toute preuve qui compare des horodatages.
- **Ne pas compter sur un watcher endormi.** Il est **propriété du cœur** et
  démarre pour **chaque** cerveau `REAL_ROOT` qui a un index, avec une
  vérification complète obligatoire : allonger `FILETOPO_WATCH_*` ne l'empêche
  pas de faire sa **première** vérification. La seule façon obtenue de garder un
  « Actualiser » manuel décisif est d'ouvrir la fenêtre avec la racine **absente**
  (son watcher dort alors derrière un garde long) puis de la restaurer dans la
  fenêtre.
- **Ne pas comparer le nombre d'arêtes de relation dessinées au total de
  l'index.** `relationSegments` ne dessine une arête que si **les deux** bouts
  sont matérialisés; un bout non dessiné est déclaré dans la région « extrémités
  hors de la vue courante » avec un contrôle pour l'amener à l'écran. Le contrôle
  honnête est à deux côtés.
- **Ne pas demander `map_integrity` sur une racine réelle** : il compare à un
  plan de fixture figé et refuse, par construction. Pour une racine réelle,
  `I-2` se juge par l'empreinte externe.
- **Ne pas écrire dans la boîte de recherche sans la vider** : l'entrée est
  contrôlée, et deux requêtes s'empilent. `searchFor()` vide puis saisit.

**Ce qui est réutilisable tel quel.**

- `scripts/task0056-rust-gate.ps1` — N suites Rust consécutives avec code de
  sortie, comptes, **noms exacts des tests en échec**, hash de log et durée;
  logs hors dépôt, résumé déterministe publié.
- `scripts/task0056-fingerprint.py` — empreinte de source **hors du produit**,
  horodatages d'accès digérés **à part** et déclarés.
- `scripts/task0056-diff-purity.ps1` — prouve, contre une base, qu'aucun fichier
  de production n'a changé.
- `scripts/task0056-webview2.{ps1,mjs}` et `task0056-seed-proof.py` — la
  campagne : pré-baseline, fenêtre jugée, couverture machine-lisible par
  exigence.

**Statuts historiques réconciliés le 2026-10-08 :** les en-têtes de
`TASK-0034` et `TASK-0036` disaient encore `IMPLEMENTED` alors
qu'`ACTION-0055` et `ACTION-0060` les ont `VERIFIED`. Corps des fiches
inchangés.

**Action unique suivante :** arbitrage du gap. La correction, si elle est
décidée, appartient à une **tâche séparée**. Aucune `TASK-0057` n'est créée;
ni B, ni C, ni D ne commence.

## Relais — ACTION-0105 / TASK-0056 READY — 2026-10-08

- Branche : `build/v0.2-a40-v1-final-parity-acceptance`.
- Base : ACTION-0104 `446a4e4922f46bf4cdd71dd1aff65f08b5318b9d`.
- Aucun nouveau développement fonctionnel : TASK-0056 = acceptance/preuves/docs seulement.
- P-05..P-18 : composer les preuves indépendantes existantes et chercher les vrais sous-critères manquants.
- P-22 : nouvelle campagne globale non destructive, couverture machine-lisible P-01..P-21.
- 3 suites Rust complètes capturées; le flake inconnu de TASK-0055 devient un gate.
- Aucun code produit ne peut changer; sinon STOP/BLOCKED.
- Agent : Claude Code, Opus 5.5 High.
- **Faire /clear** avant la tâche.
- Aucune TASK-0057; ne pas commencer B/C/D.

## Relais — ACTION-0104 — TASK-0055 / F-046 VERIFIED — 2026-10-08

- Code/runtime vérifié : `e9c67473df2c46ce99926869a6a1f8940eba2d4d`.
- F-046 fermée après corrective ACTION-0103.
- Digest public désormais indépendant de l'identité physique; kernel shared-group renforcé sans casser D1.
- Réserve transférée au gate final : une passe Rust complète 900/1 non capturée, puis trois 901/0; la prochaine campagne globale doit capturer toute sortie et bloquer sur tout échec inexpliqué.
- Aucune CI distante.
- Prochaine action : audit V1 final avant toute nouvelle fonction.

## Relais — TASK-0055 — correctif ACTION-0103 livré — 2026-10-08

- Branche : `build/v0.2-a39-v1-physical-identity-closure`. `main` intacte.
- **Ne pas marquer `VERIFIED`** : l'exécuteur ne s'attribue pas le verdict.
  `TASK-0055` et `F-046` sont `IMPLEMENTED` / candidates et attendent un
  **nouveau** contrôle indépendant.
- Correctif A livré : plus aucune matière d'identité dans
  `reconstructible_digest`, donc plus aucun dérivé en IPC. Correctif B livré : le
  noyau exige le chemin relatif exact dès que le groupe est partagé, `D1`
  préservée.
- HEAD du code **et** de l'artefact : `e9c67473df2c46ce99926869a6a1f8940eba2d4d`.
  Seuls des documents ont changé après lui.
- À attaquer d'abord au contrôle : la **liste épinglée** de l'audit structurel
  d'identité — elle attrape un nouveau lecteur, pas une valeur dérivée qu'un des
  huit fichiers privilégiés publierait lui-même; puis la complétion d'image de
  `W-B`, toujours prouvée sur deux topologies seulement.
- Lire : `TASK-0055` §17, `VALIDATION.md` section **DM**,
  `docs/performance/runs/TASK-0055-webview2.json`.
- Aucune `TASK-0056`.

## Relais — ACTION-0103 — corrective TASK-0055 — 2026-10-08

- Branche : `build/v0.2-a39-v1-physical-identity-closure`.
- Ne pas marquer VERIFIED.
- Corrective A bloquante : le digest public `reconstructibleDigest` dépend actuellement de `stable_key` et traverse IPC; DEC-0052 F interdit tout dérivé/hash de l'identité machine.
- Corrective B : renforcer le kernel pour refuser `continues=id(A)` quand l'observation est l'alias B d'un groupe SYSTEM partagé.
- Garder D1 : 1 stored + 1 observed peut conserver l'id à travers rename/move.
- Rejouer TASK-0055 et régénérer l'artefact au HEAD corrigé.
- Même session Claude : **ne pas /clear**, utiliser /compact si nécessaire. Nouvelle session : prompt autonome.
- Aucun TASK-0056.

## Relais — ACTION-0102 / TASK-0055 READY — 2026-10-07

- Branche : `build/v0.2-a39-v1-physical-identity-closure`.
- Base contrôlée : ACTION-0101, commit `393ac6d190295d979b58c9a03cc4712391d93335`.
- F-050/F-051 et P-01/P-02/P-03 sont fermés.
- F-046 est le dernier gap fonctionnel MVP nommé.
- Ne pas recréer l'identité physique : `stable_key SYSTEM` existe déjà.
- Correction de modèle : SYSTEM peut être partagé par des hard links; PATH_FALLBACK reste unique; remap group-aware par chemin exact, jamais par heuristique.
- Schema 6→7 : retirer uniquement l'unicité de l'index stable_key, sous M-B.
- ExactDuplicateExplorer reçoit seulement PROVEN_SHARED / PROVEN_SINGLE / UNKNOWN + compte safe; aucune clé brute.
- Agent recommandé : Claude Code, **Opus 5.5 High**.
- **Faire /clear** avant TASK-0055 : contexte entièrement versionné, sémantique de migration sensible.
- Aucune TASK-0056.

## Relais — ACTION-0101 — TASK-0054 VERIFIED — 2026-10-07

- Branche : `build/v0.2-a38-v1-scale-closure`.
- Produit vérifié : `fd3f6067c47a50bccff4713bda04f7f89bc8af85`; artefacts/harness contrôlés : `42a06a1add90b9b7286fd8b9b7170c76d4ceac23`.
- `F-050/F-051 = VERIFIED`; `P-01/P-02/P-03 = CLOSED / VERIFIED`.
- Limites non bloquantes conservées : pas de mesure portable modeste/SLA, recherche proportionnelle, focus >256 refusé, boucle dernière page.
- Aucun code produit après le commit produit; aucune CI GitHub distante.
- `F-046` reste inchangée. Faire un audit V1 frais avant toute TASK-0055.

## Relais — TASK-0054 IMPLEMENTED — 2026-10-07

- Branche `build/v0.2-a38-v1-scale-closure`; code `fd3f6067c47a50bccff4713bda04f7f89bc8af85`; artefacts sur `42a06a1add90b9b7286fd8b9b7170c76d4ceac23`.
- À contrôler : `src-tauri/src/map/scale_closure_tests.rs` (oracle indépendant, gardes, onze falsifications),
  `src-tauri/src/map/projection.rs` (seule modification produit : `MIN_FOCUS_PAGE`),
  `src/map/scaleAggregate.test.tsx`, `scripts/task0054-webview2.mjs` et `.ps1` (preuve GPU-désactivé discriminante),
  `docs/performance/runs/TASK-0054-scale-rust.json` et `TASK-0054-webview2.json`, rapport
  `docs/performance/TASK-0054-SCALE-CLOSURE-REPORT.md`.
- Relancer les tests 1 M : `cargo test --lib scale_closure_tests -- --include-ignored --test-threads=1` (environ 30 min,
  plusieurs Gio; ne pas les lancer en parallèle). WebView2 : `pnpm build`, `pnpm tauri build --debug --no-bundle`, puis
  `pwsh scripts/task0054-webview2.ps1` (arbre suivi propre exigé). L'artefact Rust se reconstruit avec
  `python scripts/task0054-collect-rust-evidence.py`.
- Limites dites : banc plus puissant que la cible; recherche en balayage proportionnel au corpus; focus de vue refusé
  quand l'ascendance atteint 256 nœuds; l'agrégat de la dernière page reboucle vers la première (exact, libellé à examiner).
- F-050/F-051 et P-01/P-02/P-03 : candidates; F-046 inchangée; aucune TASK-0055.

## Relais — ACTION-0100 / TASK-0054 READY — 2026-10-07

- Nouvelle branche : `build/v0.2-a38-v1-scale-closure`, basée sur `befd86a73216131eae9675961a758c1df73bffa1`.
- TASK-0053/P-19 restent fermés par ACTION-0099.
- Audit V1 : F-050/F-051 sont le prochain bloc P0/MVP; F-046 reste le bloc P1/MVP suivant, non commencé.
- TASK-0054 doit d'abord réutiliser Index/materializer/ViewAggregate/REAL_ROOT/harness TASK-0028/0030/0052.
- 10k/100k/1M = corpus indexés synthétiques; pas 1M fichiers physiques.
- WebView2 normal + `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--disable-gpu`, avec preuve discriminante que la configuration est réellement appliquée.
- Pas de nouveau renderer/dépendance/store. Pas d'auto-VERIFIED. Aucune TASK-0055.
- Agent recommandé : Claude Code, Sonnet 5.5 High. `/clear` est recommandé avant cette tâche, car tout le contexte est versionné.

## Relais — ACTION-0099 — TASK-0053 VERIFIED — 2026-10-07

- Branche : `build/v0.2-a37-v1-workspace-persistence`.
- Produit vérifié : `804e1daa29b30e60b098ff677d06b452f02ecad6`; HEAD documentaire contrôlé : `a28f354ff9625287c41284f058e132628a3dd32d`.
- Clôtures : `TASK-0053 / F-052 = VERIFIED`, `M-1 = CLOSED`, `P-19 = CLOSED / VERIFIED`.
- CI distante : aucune attachée au commit testé.
- Limites conservées : crash brutal pendant debounce non testé; préférence OS reduced-motion émulée par CDP; piège de réutilisation numérique démontré en Rust, changement de génération/rejet démontré en WebView2.
- Ne pas créer `TASK-0054` par inertie : faire d'abord un audit V1 frais. `F-046` reste inchangée jusqu'à cet audit.

## Relais — TASK-0053 IMPLEMENTED — 2026-10-07

- Branche `build/v0.2-a37-v1-workspace-persistence`, code `804e1daa29b30e60b098ff677d06b452f02ecad6`.
- À contrôler : stockage F-052 (`workspace_state.rs`), règle de propriété
  (`workspaceState.ts` : un cerveau seul garde caméra/sélection dans le resume),
  démarrage restauré (`MapApp.tsx`), corrections visibles, densité/mouvement (CSS).
- Limites dites : « Reconstruire » garde les ids si les chemins survivent (piège
  numérique prouvé en Rust, pas en WebView2); crash non testé; réduction OS émulée.
- Ne rien marquer VERIFIED sans contrôle indépendant. Aucune TASK-0054.


## Relais — ACTION-0098 / TASK-0053 READY — 2026-10-06

- Branche cible : `build/v0.2-a37-v1-workspace-persistence`.
- Objectif : fermer F-052 + M-1 + P-19.
- Ne pas dupliquer resume, locale ou seen.
- Workspace global : composition, legendOpen, density, motion, branch focus.
- catalog_meta versionné; node refs liées à index_id côté backend.
- WebView2 multi-process réel sur 3 cerveaux.
- Claude Code + Sonnet 5.5 High. Aucune TASK-0054.


## Relais — ACTION-0097 — TASK-0052 VERIFIED — 2026-10-06

- HEAD produit contrôlé : `cfba445bdaabc0d74a3bd6b7551fd6398e5b179d`.
- TASK-0052 / F-042 = VERIFIED.
- L'état branch focus + collapsed ids reste volontairement session-only.
- P-19 est maintenant la prochaine candidate logique à auditer.
- F-046 reste séparée.
- Aucune TASK-0053 créée sans audit.


## Relais — corrective TASK-0052 livrée, re-contrôle requis — 2026-10-06

- Code `cfba445bdaabc0d74a3bd6b7551fd6398e5b179d`. Seule l'exception root retirée : `branch_projection.rs`
  (`collapsed_in_view` accepte le root, kind `directory` ou `root`),
  `branchFocus.ts::canCollapse(node, alreadyCollapsed)`, `BranchFocusPanel.tsx`.
- Rejouer : `pnpm build`, `pnpm tauri build --debug --no-bundle` (**pas** un
  `cargo build` simple : l'exe pointerait sur `localhost:1420`), puis
  `powershell -File scripts/task0052-webview2.ps1`.
- Aucune TASK-0053; P-19 PARTIELLE; F-046 inchangée.

## Relais — ACTION-0096 / TASK-0052 corrective READY — 2026-10-06

- Ne pas refaire l'architecture F-042.
- Retirer uniquement l'exception rootCannotCollapse.
- Backend + UI + tests + WebView2 doivent accepter le root focalisé comme
  dossier repliable.
- Repli root : root seul, hiddenDescendantCount exact, aucun aggregate root.
- Dépli root : projection de référence exacte.
- Sonnet 5.5 Medium. Aucune TASK-0053.


## Relais — TASK-0052 IMPLEMENTED, contrôle indépendant requis — 2026-10-06

- Code `bdb5e91d677ec6dd0c64de2f93506cc1aa1ad17a` (backend `branch_projection.rs` + primitive `descendant_count`,
  commande `map_branch_view`, `BranchFocusPanel`, `branchFocus.ts`, marqueurs de
  carte dans `MapView`).
- Le repli/dépli n'existe **que dans la vue de branche focalisée** : la
  projection ordinaire n'affiche qu'un niveau d'enfants plus l'ascendance, il n'y
  a rien de profond à replier. À dire au contrôle, pas à cacher.
- Remplissage : largeur d'abord depuis le dossier focalisé, dossiers d'abord
  (ordre canonique), plafond ordinaire de 64; un dossier large peut donc épuiser
  le budget avant ses cadets — les agrégats le disent. Le repli ne refait pas le
  remplissage : il retire seulement.
- Entrer dans un focus quitte le filtre par `filter.dropForNavigation` (chemin
  existant) et le dit. Un autre cerveau, une nouvelle composition ou une nouvelle
  révision d'Index quittent le focus sans restaurer.
- Rejouer : `pnpm build`, `pnpm tauri build --debug --no-bundle`, puis
  `pwsh scripts/task0052-webview2.ps1` (deux processus réels, sans touche
  envoyée à la fenêtre : événements CDP).
- Suite logique : P-19 (y intégrer ces deux états), puis F-046.

## Relais — ACTION-0095 / TASK-0052 READY — 2026-10-06

- Branche cible : `build/v0.2-a36-v1-branch-focus-collapse`.
- F-042 avant P-19 pour respecter la dépendance d'état.
- Réutiliser projection.rs, children_page, agrégats, compositionSession.
- Aucun masque CSS/whole graph; compte descendant exact.
- État F-042 session-only dans cette tranche; P-19 après.
- Claude Code + Sonnet 5.5 High.


## Relais — ACTION-0094 — TASK-0051 VERIFIED — 2026-10-05

- HEAD produit contrôlé : `1418262e4e4edf7e131bdb7d96fe9992066b1f5a`.
- TASK-0051 / P-04 = VERIFIED.
- F-017/F-041 n'ont plus de manque de révocation.
- P-19, F-042 et F-046 restent des audits distincts.
- Prochaine étape : audit V1 frais avant toute TASK-0052.


## Relais — TASK-0051 corrective stale-core IMPLEMENTED — 2026-10-05

- Code : `1418262e4e4edf7e131bdb7d96fe9992066b1f5a` (garde stale retirée de `revoke_relation` seulement; focus de
  repli sur `analyze-relations`; DR15 passe 3; script
  `scripts/task0051-stale-core-run-real-host.ps1`).
- Ne pas refaire TASK-0051 : contrôler uniquement la corrective.
- Le décor DR15 (debug) liste désormais aussi les APPROVED liées à une
  suggestion sur le nœud sélectionné : ses extrémités ne sont pas des nœuds de
  l'Index, sans quoi la relation n'était jamais visible.
- Rejouer la preuve : `pnpm build`, `pnpm tauri build --debug --no-bundle`, puis
  `pwsh scripts/task0051-stale-core-run-real-host.ps1` (envoie de vraies touches
  à la fenêtre).

## Relais — ACTION-0093 / TASK-0051 corrective READY — 2026-10-05

- HEAD contrôle : 6e725725; orchestration corrective : 6481eae3.
- Ne pas refaire toute TASK-0051.
- Retirer uniquement la garde stale de revoke_relation.
- Approval stale reste refusée; sorties core stale restent non actuelles.
- APPROVED humaine doit être révocable en STALE; focus sûr après revoke.
- Réutiliser dreScenario/DR15. Claude Sonnet 5.5 Medium.


## Relais — TASK-0051 IMPLEMENTED, contrôle indépendant requis — 2026-10-05

- Branche `build/v0.2-a35-v1-approved-relation-revocation`; commits produit
  `d5b4880` et `14a821d`; HEAD testé `14a821d9cfc690ad4365fc7572bc455edc7144d4`.
- Révocation intra + inter livrée (stores, commandes, Tauri, deux panneaux,
  FR/EN, clavier natif); preuve WebView2 réelle en deux processus autour d'un
  redémarrage réel (`docs/performance/runs/TASK-0051-webview2.json`).
- À savoir : les boutons « Révoquer » intra n'ont plus de `data-testid` partagé
  (le hook de focus générique de TASK-0047 les confondait d'une relation à
  l'autre); le focus est rendu à l'approbation de la même suggestion.
- Limites déclarées dans la tâche (kill pendant révocation, Beta non construit,
  moteur révoqué prouvé au niveau store). P-19 inchangée. Pas d'auto-VERIFIED.
- Reste : contrôle indépendant de TASK-0051.

## Relais — ACTION-0092 / TASK-0051 READY — 2026-10-05

- TASK-0050 est VERIFIED.
- Prochaine branche : `build/v0.2-a35-v1-approved-relation-revocation`.
- TASK-0051 ferme la révocation P-04 intra + inter.
- Sémantique gelée par DEC-0049 : supprimer l'APPROVED et remettre sa
  suggestion à pending dans une transaction; réapprobation possible.
- DETERMINISTIC non révocable. P-19 hors tranche.


## Relais — ACTION-0091 — TASK-0050 VERIFIED — 2026-10-05

- HEAD produit contrôlé : `8656d84f6f85f53b55e44f60452d0e3fe609f32c`.
- HEAD documentaire contrôlé : `2e3bd9eccc1110b1dc5c046936db3d9a8df4b3ec`.
- TASK-0050 / F-014 / P-10 sont VERIFIED.
- P-19 reste PARTIELLE; aucune persistance de légende au redémarrage n'est
  revendiquée ici.
- Prochaine étape : audit V1 post-TASK-0050 avant toute TASK-0051.


## Relais — TASK-0050 §V IMPLEMENTED, contrôle indépendant requis — 2026-10-05

- Harnais corrigé (FILE-only), HEAD testé `8656d84f6f85f53b55e44f60452d0e3fe609f32c`;
  run WebView2 réel : 23/23, légende 24/24, axe 0/0.
- Exemption cellule B et combineur supprimés; J12 reste un replay de régression séparé.
- Aucun produit/Rust/fixture touché. Pas d'auto-VERIFIED. Aucune TASK-0051.
- Reste : contrôle indépendant sur preuves (voir NEXT_ACTION).

## Relais — ACTION-0090 / TASK-0050 corrective READY — 2026-09-29

- HEAD contrôlé : `a6e3e6d7fcf226d9cb6158ed43e2597b0f121754`.
- J12 est réparé mais n'est probablement plus nécessaire pour la preuve finale.
- Cellule A a un défaut concret : elle active DIRECTORY + SKIPPED, pas FILE.
- Tester FILE-only sur brain-alpha et exiger les endpoints APPROVED + pending
  simultanément dans le DOM.
- Si les deux clés apparaissent, supprimer l'exemption cellule B et fermer
  23/23 dans la cellule A seule.
- Claude Code + Claude Sonnet 5 Medium. Aucune TASK-0051.


## Relais — TASK-0050 §T / régression J12 corrigée, nouveau blocage produit confirmé — `BLOCKED` — 2026-09-28

- HEAD contrôlé avant exécution : `070421eeea7562736a931766c9192c06de0562ec`,
  fast-forward vers `30b44b8` avant démarrage.
- Corrective ACTION-0089 appliquée intégralement : `map_resolve_node` pour le
  pivot, `selectNode` (navigation produit) au lieu de `setSelected`, attente
  DOM explicite avant chaque lecture dépendant d'une sélection.
- **La régression R.2 (pivot introuvable) est corrigée** : J12 s'exécute pour
  la première fois jusqu'à son terme complet (pivot, panneau, traversée par
  vraie touche Windows, approbation réelle — tous PASS).
- **Nouveau blocage confirmé, distinct** : aucune arête de relation (établie
  ou suggestion) ne se rend jamais sur la carte pendant le replay —
  `relationSegments()` exige les deux extrémités dans la fenêtre bornée
  courante (`hierarchy.byId`), mais `brain.relations` n'est jamais recalculé
  par `changeProjection`, qui ne fait que recentrer cette fenêtre. Une
  sélection séquentielle des extrémités (J12) ne les fait donc jamais
  coexister. Confirme et précise Q.2.
- Conforme à la clause d'arrêt `.orchestrator/NEXT_PROMPT.md` §10 : STOP avec
  preuve exacte. Aucun Rust, aucune nouvelle fixture, aucune instrumentation
  de révélation d'agrégat ajoutée à J12.
- Aucun artefact `TASK-0050-webview2.json` publié. TASK-0050/F-014/P-10
  restent `BLOCKED`. Aucune TASK-0051.
- Prochaine décision, réservée à l'orchestrateur technique ou à Sébastien :
  (a) faire recalculer `brain.relations` par `changeProjection` (changement de
  comportement produit, hors périmètre d'une corrective de scénario), ou
  (b) revenir à l'option Q.3(b)/R.3(b) — une brique synthétique dédiée où les
  relations à prouver sont les seules arêtes du nœud choisi.
- Détail complet : `docs/tasks/TASK-0050-v1-runtime-legend-p10.md` section T;
  `docs/ai/VALIDATION.md` section CW.


## Relais — ACTION-0089 / TASK-0050 corrective READY — 2026-09-28

- HEAD contrôlé : `070421eeea7562736a931766c9192c06de0562ec`.
- Ne pas modifier la cellule A sauf nécessité démontrée.
- J12 doit arrêter de résoudre le pivot dans `snapshot.nodes`.
- Utiliser `map_resolve_node` puis la navigation produit existante
  `MapApp.selectNode` (pas `setSelected` brut).
- Attendre que le pivot soit réellement présent/sélectionné dans MapView avant
  de poursuivre J12.
- Rejouer les deux cellules et le combineur; artefact final seulement sur PASS.
- Claude Code + Claude Sonnet 5 Medium. Aucune TASK-0051.


## Relais — TASK-0050 §R / cellule A fermée, cellule B bloquée par régression distincte — 2026-09-28

- HEAD contrôlé avant exécution : `0f24fbfa2877991910129d2c9d59fd2a4f8cf991`.
- Stratégie ACTION-0088 exécutée : cellule A (harnais TASK-0050) ∪ cellule B
  (replay `J12`).
- Cellule A **fermée pour de vrai** cette fois : 21/23 reproductible deux
  fois à l'identique, après correction de quatre défauts de harnais jamais
  exercés en réel auparavant (racine/clé confondues, capture de classe
  `<g>`-seul absente côté légende, confusion d'état « touching »,
  `spawnSync` `EINVAL`). Aucun fichier produit touché — seul
  `scripts/task0050-webview2.mjs`.
- Cellule B (`J12`) reste bloquée, par une régression **distincte** de Q.2 :
  `MapNode::snapshot()` renvoie une vue bornée (`materialize_view`,
  `DEC-0034`), pas le corpus plat que `J12` suppose depuis son écriture
  (avant `DEC-0034`) — `J12` ne retrouve même plus son propre nœud pivot
  dans un catalogue neuf. Reproduit deux fois à l'identique. Un défaut
  d'amorçage séparé (`map_not_built: brain-alpha`) a été corrigé dans
  `src/map/relationScenario.ts` (prépare l'index avant d'ouvrir les
  relations) — nécessaire mais pas suffisant.
- Aucun changement Rust. Aucun artefact `TASK-0050-webview2.json` publié.
  Aucun artefact canonique historique touché.
- Prochaine décision, réservée à l'orchestrateur technique ou à Sébastien :
  diagnostiquer/corriger le pivot de `J12` sous fenêtre bornée, ou revenir à
  l'option Q.3(b) (brique synthétique dédiée). Aucune TASK-0051.
- Contrôle indépendant obligatoire sur cellule A avant toute nouvelle
  tentative. Détail complet : `docs/tasks/TASK-0050-v1-runtime-legend-p10.md`
  section R.


## Relais — ACTION-0087 / TASK-0050 corrective READY — 2026-09-28

- HEAD contrôlé : `fa429db6f2324269bfddd21b78be6b1f5eed9785`.
- Le correctif cross-linked de Claude est accepté.
- `node-diagnostic` est réellement non atteignable dans un Index publié;
  aucun Rust ne doit être ajouté pour le test.
- DEC-0048 est amendée : WebView2 = 23 clés atteignables; diagnostic = test
  déterministe + invariant backend, exception explicite dans l'artefact.
- Il reste à rendre la séquence 23/24 reproductible, à assert les signatures
  carte↔légende, puis à republier TASK-0050-webview2.json.
- Exécuteur : Claude Code + Claude Sonnet 5, effort Medium.
- Aucune TASK-0051.


## Relais — ACTION-0086 / TASK-0050 corrective READY — 2026-09-28

- HEAD contrôlé avant préparation : `d60c0c1962323d6b0afdf15d4117ae4ef57757ff`.
- TASK-0050 n'est pas VERIFIED.
- Écarts : WebView2 12/24 clés réelles; pas d'assert d'égalité des computed
  signatures; texte cross-linked inexact (« double contour »).
- Corrective ciblée seulement; aucun Rust/backend/package/resume v2; P-19
  reste séparée; aucune TASK-0051.
- Exécuteur prévu pour la corrective : Claude Code + Claude Sonnet 5, effort Medium.
- Lire et exécuter intégralement `.orchestrator/NEXT_PROMPT.md`.


## Relais — TASK-0050 IMPLEMENTED / contrôle indépendant requis — 2026-09-28

- Branche `build/v0.2-a34-v1-runtime-legend`; TASK-0050/F-014/P-10 sont
  `IMPLEMENTED`, jamais auto-`VERIFIED`.
- Contrôler d'abord `mapLegendContract.ts`, `MapLegend.tsx`, les émissions
  `data-legend-keys` de `MapView.tsx`, `mapLegend.test.tsx`, VALIDATION §CP et
  `TASK-0050-webview2.json`.
- La garde de carte riche rend les 24 clés obligatoires et prouve que toute clé
  carte possède une entrée. Les classes de nœud/relation/hiérarchie et les
  glyphes/flèches viennent de helpers partagés, pas d'une copie visuelle.
- WebView2 : trois cerveaux affichés, relations backend 13/3 intra et 7/3
  inter, filtre, trois agrégats, FR/EN, axe fermé/ouvert, navigation clavier,
  zéro commande et état source/Index/journal/resume identique.
- Axe : 0 violation; le même `incomplete color-contrast` sur éléments
  décoratifs préexiste fermé et ouvert, donc aucune trouvaille ajoutée par la
  légende. Recouper avec les preuves TASK-0047 si nécessaire.
- Frontend 630 PASS; check/build/Tauri/diff/audit PASS; six falsifications.
  Aucun Rust/backend/package. P-19 reste PARTIELLE; restart de la légende NON
  TESTED; aucune TASK-0051.

## Relais — TASK-0050 READY — 2026-09-26

- ACTION-0084 ferme TASK-0049/F-006.
- ACTION-0085 choisit F-014/P-10.
- Branche : `build/v0.2-a34-v1-runtime-legend`.
- Lire DEC-0048, TASK-0050 puis `.orchestrator/NEXT_PROMPT.md`.
- Frontend uniquement; aucun Rust attendu.
- Réutiliser les classes/glyphes réels de MapView et prouver la couverture
  sémantique par rendu riche.
- Persistance ouvert/fermé de la légende hors tranche, rattachée à P-19.

## Relais — TASK-0049 IMPLEMENTED / contrôle indépendant requis — 2026-09-26

- Branche `build/v0.2-a33-v1-reconstructibility-closure`; TASK-0049 et F-006
  sont `IMPLEMENTED`, jamais auto-`VERIFIED`.
- Lire d'abord TASK-0049 §N, VALIDATION §CL, `.orchestrator/RESULT.md` et
  `docs/performance/runs/TASK-0049-webview2.json`.
- Contrôler l'enveloppe privée resume v2 : `index_id` vient du backend,
  legacy/foreign generation efface les références node-scoped avant lookup,
  même génération ne change pas; le DTO frontend reste exactement à cinq
  champs.
- Contrôler le digest logique inter-génération et le cas adversarial :
  historique `b=3`, Index frais `b=2`, ancien id 3 = `c`, digest égal,
  aucune sélection erronée.
- Inventaire fermé attendu : `built_unix_ms`, `index_id`,
  `index_revision`, `change_events`, `seen_change_events`,
  `seen_through_event_id`, `next_node_id`, `node_id_allocation`,
  `nodes.seen_legacy`.
- La preuve réelle couvre trois processus Tauri/WebView2, nouvel Index,
  baseline journal vide, correction persistée, policy/source/catalogue stable,
  relations et content-signals inchangés. La suppression est strictement une
  action du harnais après fermeture, jamais une commande produit.
- Rejouer ou recouper les huit falsifications. Suite finale : Rust 770 PASS /
  6 ignorés; frontend 625 PASS; builds, audit et preuve réelle verts. Clippy
  reste à la référence historique 13/22.
- Limites : Windows/NTFS local et fermetures normales; rebuild via commande
  produit IPC, sans clic physique. F-014/P-19 inchangés; aucune TASK-0050.

## Relais — ACTION-0081 corrigée / contrôle indépendant requis — 2026-09-26

- TASK-0048 reste `IMPLEMENTED`, jamais auto-`VERIFIED`; aucune TASK-0049.
- Contrôler la génération brain-scoped ajoutée à `ExclusionsPanel.replace()` :
  après A -> B, aucun retour A ne peut publier state/error/busy, appeler
  `onApplied` ni signaler succès à l'ancien `add/remove`.
- R1–R4 emploient des Promises différées. La falsification sans correctif fait
  échouer R1–R3; avec correctif, ciblé 7/7 et suite frontend 625/625.
- Tauri debug PASS. WebView2 : première campagne expirée sur l'attente source
  absente, seconde campagne fraîche PASS phases 1/2 avec redémarrage réel.
- Aucun fichier Rust/backend, package ni artefact de données modifié.

## Relais — TASK-0048 IMPLEMENTED / contrôle indépendant requis — 2026-09-26

- Branche `build/v0.2-a32-v1-safe-exclusion-policy`; F-005 et TASK-0048 sont
  `IMPLEMENTED`, jamais auto-`VERIFIED`.
- Contrôler d'abord `DEC-0046`, la fiche TASK-0048, `VALIDATION.md` section CI,
  `.orchestrator/RESULT.md` et `TASK-0048-webview2.json`.
- Architecture : politique désirée brain-scoped/versionnée dans `catalog_meta`;
  estampille appliquée dans chaque Index; rebase complet atomique de l'Index
  sans écrire de faux événements source. Une application impossible laisse le
  dernier Index fiable ouvert et rend `applicationRequired` explicite.
- Même matcher de composants pour scan complet, Actualiser, Reconstruire, W-B,
  W-C et watcher; `foo` ne couvre pas `foobar`; reparse/symlink reste fermé.
- Preuve réelle : A/C partagent une source avec politiques différentes, B en a
  une autre; UI clavier/souris FR/EN, watcher inclus/exclus, retrait, redémarrage,
  source absente/restaurée, SHA inchangé et zéro erreur console fatale.
- À surveiller : aucune transaction catalogue/Index inter-base n'est prétendue;
  la policy désirée peut donc précéder son application. Mutation physique
  strictement concurrente au rebase non séparable atomiquement.
- F-006, F-014 et P-19 inchangés; aucune TASK-0049 avant verdict indépendant.

## Relais — TASK-0048 READY / Codex — 2026-09-26

- Branche : `build/v0.2-a32-v1-safe-exclusion-policy`.
- Lire DEC-0046, TASK-0048, ACTION-0080 puis
  `.orchestrator/NEXT_PROMPT.md`.
- Exécuteur : Codex, GPT-5.6 Sol, High effort.
- Aucun glob/ignore : règles exactes relatives, backend autoritaire,
  `catalog_meta` brain-scoped.
- Le point le plus important à auditer avant code est la cohérence policy/Index
  et l'absence de faux événements du journal lorsque seule la policy change.
- Reparse/symlink reste non désactivable.
- F-006/F-014/P-19 hors tranche; aucune TASK-0049.

## Relais — ACTION-0080 / prochaine exécution Codex — 2026-09-26

- ACTION-0079 a fermé TASK-0047/F-036/P-21.
- ACTION-0080 a réconcilié les statuts historiques périmés.
- Prochaine lacune choisie : F-005, exclusions sûres et configurables.
- Ne pas introduire `ignore` ou `globset` sans nouvelle preuve qu'un glob est nécessaire : le contrat V1 utilise des sous-arbres relatifs exacts et `std::path`.
- Reparse/symlink reste une règle de sécurité intégrée non désactivable.
- F-014 (légende), F-006 (preuve reconstructible exacte) et P-19 restent ouvertes, séparées.
- Exécuteur suivant : Codex jusqu'au retour du quota Claude.
## Relais — ACTION-0079, accessibilité VERIFIED — 2026-09-26

- TASK-0047 / F-036 : VERIFIED.
- P-21 : CLOSED / VERIFIED par ACTION-0077 + ACTION-0079.
- Ne pas rouvrir FR/EN ou l'accessibilité sans régression concrète.
- P-19 reste PARTIELLE.
- Prochaine action : auditer les vrais écarts V1 et la FEATURE_MATRIX avant de créer TASK-0048.
- Les prochaines exécutions doivent utiliser **Codex** jusqu'au retour des tokens Claude; l'orchestration reste dans ChatGPT.

## Relais — TASK-0047, fermeture accessibilité, IMPLEMENTED — 2026-09-26

- **Fait :** `TASK-0047` est **IMPLEMENTED** sur `build/v0.2-a31-v1-accessibility-closure` (code `ec22b07`), jamais auto-`VERIFIED`.
  F-036 = IMPLEMENTED; P-21 / P-19 PARTIELLES. Aucun Rust, aucune commande, aucun stockage, aucune préférence; aucune TASK-0048.
- **Où regarder, dans l'ordre :** `DEC-0045`; la table « Corrections » de `docs/tasks/TASK-0047-…md`; VALIDATION CF;
  `MapView.tsx` (`aria-activedescendant`, agrégat `treeitem`, `refocusTree`), `map.css` (jetons sombres, `.map-territory__title`,
  `.map-node--root`, contour du canevas, `input::placeholder`), `focusRestore.ts`, `CompositionBar.tsx` (focus au retrait);
  `accessibilityClosure.test.tsx` et `focusRestore.test.tsx`; `scripts/task0047-*` et les deux artefacts.
- **À savoir pour la reprise :**
  1. **Un `role=button` ne va pas dans le `role=tree`** de la carte (axe `aria-required-children`) : l'agrégat est un `treeitem`.
     Le test de source refuse tout `role="button"` dans `MapView.tsx`.
  2. **Une référence d'id doit nommer un élément dessiné** : pas d'`aria-activedescendant` pour une sélection hors vue bornée.
  3. **Les jetons `--directory` / `--file` / `--skipped` ont des valeurs sombres** parce que les noms de cartes sont en `--ink` :
     un test calcule ≥ 4,5:1 à chaque opacité de carte, et la racine reste à 0,95 dans tous les états.
  4. **Le contour de focus du canevas est intérieur** (`outline-offset: -3px`) : l'hôte a `overflow: hidden`.
  5. **`useRestoreFocusAfterDisabled`** ne lit aucun état et n'appelle aucune commande; il rend le focus à un contrôle réactivé
     (ou à son remplaçant de même `data-testid`, revenu sous 15 s). Ne pas remplacer `disabled` par `aria-disabled` ailleurs sans
     décision : ce hook est la réponse retenue.
  6. **La preuve** : `pnpm build && pnpm tauri build --debug --no-bundle`, puis `scripts/task0047-webview2.ps1 -Mode final`
     (≈ 12 min, fenêtre non masquée; `-Mode baseline` publie sans juger; `TASK0047_FAIL_FAST=1` s'arrête au premier constat).
     Vérifier le **journal de build** avant de conclure d'un sabotage : un build en échec laisse l'ancien binaire.
- **Non fait / non testé :** lecteur d'écran, zoom / reflow, contrôles de navigation absents des données synthétiques,
  pagination, « marquer comme vu » / confirmer / rejeter, clavier système.
- **Action suivante :** contrôle indépendant de `TASK-0047`.

## Relais — TASK-0047 READY — 2026-09-25

- Branche : `build/v0.2-a31-v1-accessibility-closure`.
- Lire DEC-0045 puis TASK-0047 puis `.orchestrator/NEXT_PROMPT.md`.
- La cible est F-036/P-21 accessibilité; F-035 est déjà VERIFIED et ne doit pas
  être rouvert.
- axe-core 4.13.0 est le choix reuse-first **sous revalidation**, dev-only et
  local; aucun service/MCP Axe.
- Le vrai WebView2 est autoritaire pour axe/contraste; JSDOM n'est pas une
  preuve de contraste.
- Ne pas créer de préférence d'accessibilité ni toucher P-19.
- Après l'exécution : contrôle indépendant; aucune TASK-0048.

## Relais — TASK-0046 VERIFIED / prochaine tranche accessibilité — 2026-09-25

- **TASK-0046 / F-035 sont VERIFIED** par ACTION-0077. Ne pas rouvrir la
  localisation sauf régression.
- ACTION-0078 a audité le vrai runtime : arbre/map, CompositionBar, formulaires,
  focus visible et reduced-motion possèdent déjà des fondations d'accessibilité.
  Le manque est la preuve globale + les corrections révélées par cet audit.
- Architecture retenue pour TASK-0047 : **axe-core 4.13.0**, dev-only, local,
  injecté dans le vrai WebView2; pas de MCP/service Axe externe; parcours
  clavier manuel automatisé par le harnais, contrastes et non-color codings
  vérifiés explicitement.
- `P-21` reste PARTIELLE avant TASK-0047. `P-19` reste PARTIELLE et ne doit
  pas être mélangée à cette tranche.
- Références : ACTION-0077, ACTION-0078, F-036 et P-21.

## Relais — TASK-0046, FR/EN complet du runtime, IMPLEMENTED — 2026-09-25

- **Fait :** `TASK-0046` est **IMPLEMENTED** sur `build/v0.2-a30-v1-complete-fr-en-runtime` (code `678c417`), jamais
  auto-`VERIFIED`. Aucune TASK-0047, aucun audit WCAG, aucun PR, fusion, étiquette ni release; `locale.ts`, le backend,
  le parseur, le watcher, `graph/` non touchés.
- **Où regarder, dans l'ordre :** `DEC-0044`; `src/map/mapStrings.ts` (contrat + deux langues de `MapApp`);
  `chooseLocale` et `say(...)` dans `MapApp.tsx`; le dictionnaire `Record<Locale, …>` de chaque panneau (en tête de
  son fichier); `localeText.ts`; `localeCompleteness.test.tsx` (parité, liste revue des feuilles identiques, gardes de
  source); `localeRuntime.test.tsx` (le vrai `MapApp` en FR / EN, zéro commande à la bascule);
  `scripts/task0046-*` et `docs/performance/runs/TASK-0046-webview2.json`.
- **À savoir pour la reprise :**
  1. **Ne jamais écrire la locale au démarrage** et ne jamais l'ajouter aux dépendances d'un effet qui invoque : la
     bascule ne lit rien. Deux tests et un garde de source le vérifient; le sabotage réel (`chooseLocale` qui appelle
     `map_brains`) fait échouer la preuve.
  2. Un statut est une **fonction de la locale** (`say((t, l) => …)`), jamais une phrase stockée; un détail d'erreur passe
     par `describeError` (invariants internes = `LocalizedError`, diagnostic brut du backend = tel quel).
  3. **Une valeur de fil n'est jamais traduite** (`DETERMINISTIC`, `map_not_built`, clés, enums de filtre); on traduit
     l'étiquette au rendu. Les noms de cerveaux / fichiers non plus.
  4. Une liste React à clé partagée garde une ligne périmée à la bascule : toute clé dupliquée fait échouer
     `localeRuntime.test.tsx`.
  5. Les scénarios historiques `FILETOPO_AUTO_*` comparent des libellés français : à rejouer sous locale française.
  6. Le harnais réel simule l'hôte français avec `--lang=fr-CA` et vérifie **deux étapes** (cerveau adossé à un dossier,
     cerveau synthétique) parce que les deux n'offrent pas les mêmes panneaux aujourd'hui.
- **Non fait / non testé :** `F-036` accessibilité complète, hôte réellement configuré en anglais, crash brutal, scénarios
  réels antérieurs, relations / contenu / doublons pour un cerveau adossé à un dossier (le backend répond « source non
  synthétique » : décision produit hors tranche).
- **Action suivante :** contrôle indépendant de `TASK-0046`.

## Relais — TASK-0045, éditeur d'identité d'un cerveau, IMPLEMENTED — 2026-09-25

- **Fait :** `TASK-0045` est **IMPLEMENTED** sur `build/v0.2-a29-v1-brain-identity-editor` (code `9e951d2`), jamais
  auto-`VERIFIED`. Aucune TASK-0046, aucun travail FR/EN / accessibilité, aucun PR, fusion, étiquette ni release;
  backend, parseur, watcher, journal, `graph/` non touchés (Rust : tests ajoutés seulement).
- **Où regarder, dans l'ordre :** `DEC-0043`; `src/map/BrainIdentityEditor.tsx` (formulaire, bornes, focus);
  `saveBrainIdentity` dans `MapApp.tsx` (et la relecture du record à la fin de `loadBrain`);
  `brainIdentity.test.tsx` (le vrai `MapApp` contre un backend scripté qui applique `validate_metadata`);
  les trois tests Rust en fin de `brains.rs`; `scripts/task0045-*` et `docs/performance/runs/TASK-0045-webview2.json`.
- **À savoir pour la reprise :**
  1. **Ne jamais reconstruire une identité depuis le formulaire** : la réponse de `map_brain_update` est l'autorité.
  2. Le formulaire reste lié au cerveau **ouvert**, pas au focus qui bouge ensuite.
  3. Remplacer `loaded` relance, en **lecture seule**, `map_cross_relations_open` puis `..._for_node` : c'est voulu,
     leurs réponses embarquent nom et icône. Toute autre commande pendant une édition est une régression.
  4. Le harnais réel compare, après chaque édition, autres cerveaux, source (SHA-256), Index, journal, reprise et fil
     IPC; il **échoue** si le produit lit `map_view` à la sauvegarde (sabotage vérifié).
  5. La couleur ne peut pas être saisie par le sélecteur natif en preuve; nom et icône sont tapés en événements clavier.
- **Non fait / non testé :** `F-035` FR/EN, `F-036` accessibilité complète, icône « espace » (règle produit à décider),
  crash brutal, scénarios réels antérieurs.
- **Action suivante :** contrôle indépendant de `TASK-0045`.

## Relais — TASK-0044, état de reprise par cerveau, VERIFIED — 2026-09-25

- **Fait :** `TASK-0044` est **VERIFIED par `ACTION-0073`** sur `build/v0.2-a28-v1-brain-resume-state` (code `00743fb`). Aucune TASK-0045, aucun travail FR/EN / accessibilité, aucun PR,
  fusion, étiquette ni release; `graph/`, watcher, parseur, journal et `incremental.rs` non touchés.
- **Où regarder, dans l'ordre :** `DEC-0042`; `src-tauri/src/map/resume_state.rs` (modèle, stockage, `restore`) puis
  `resume_state_tests.rs`; `node_filter.rs` (`filter_anchor`); `lib.rs` (trois commandes); côté interface
  `resumeState.ts` (analyse + `ResumeWriter`), `useProjectionFilter.ts` (une session par cerveau, `adopt`),
  `MapApp.tsx` (`loadBrain`, `applyComposition`, effet de positionnement, `captureLiveResume`),
  `resumeMapApp.test.tsx` (le vrai `MapApp` contre un catalogue scripté); `scripts/task0044-*`.
- **À savoir pour la reprise :**
  1. Le catalogue est l'autorité de la reprise; **`ResumeWriter` en garde la copie** (un patch fusionne, ne fait
     rien s'il ne change rien, est écrit après 250 ms de silence ou 1,5 s au plus). Ne pas ajouter un second
     cache ni écrire depuis un autre endroit.
  2. `loadBrain` **vide** l'écrivain du cerveau, puis restaure : ce que la personne vient de faire est dans le
     catalogue avant d'être relu. Une restauration qui échoue retombe sur la lecture simple (`map_view`).
  3. Pour **un** cerveau seul, l'état vient du catalogue (frais ou copie de l'écrivain); pour une composition de
     plusieurs cerveaux, `CompositionSessionMemory` garde la main (`DEC-0042` §7).
  4. La caméra n'est stockée que pour un cerveau **seul** à l'écran. Elle est appliquée quand la fenêtre est
     mesurée, clampée, puis ré-appliquée **depuis la valeur d'origine** pendant 4 s tant qu'elle n'a pas été
     touchée (la taille de la fenêtre n'est pas finale à la première mesure). L'effet « suivre le focus » saute
     la projection sur laquelle une caméra vient d'être restaurée.
  5. Une page filtrée **reprise** commence à la sélection retenue : son rang réel est inconnu, l'interface dit
     « Page reprise ». Un match de la première page garde la page canonique.
  6. `nodeId` n'est jamais une identité globale : chaque enregistrement est sous l'identifiant de son cerveau et
     validé contre l'Index de ce cerveau. `docs` porte le même id dans les trois cerveaux de la preuve réelle.
- **Non fait / non testé :** crash brutal (aucune promesse); Reconstruire sans rejeu WebView2 dédié (le contrôle confirme toutefois l'absence de recyclage silencieux d'id dans le chemin identity-aware actuel);
  composition multi-cerveaux persistante; FR/EN; accessibilité; scénarios réels antérieurs non rejoués.
- **Action suivante :** audit des écarts V1 restants; ne pas ouvrir automatiquement une nouvelle tâche sans ce contrôle.

## Relais actuel — TASK-0043, correctif ACTION-0071 P1, en attente de contrôle — 2026-09-25

- **Fait :** commit `001f18f` sur `build/v0.2-a27-v1-watcher-reconciliation` (partie de `8f02e34`).
  `TASK-0043` reste `IMPLEMENTED`. Aucune TASK-0044, USN, PR, fusion, étiquette ni release; `graph/` et
  `incremental.rs` non touchés; aucun changement frontend.
- **Où regarder :** `map/commands.rs` (`lock_publication_cancellable`, `lock_cancellable`,
  `publish_map_with_lock`, module `publication_lock_tests`); `map/watch_ops.rs` (`verify_full` et
  `FullFailure`, `apply_scopes`, `record_guard_failure`); `watch/mod.rs` (`shutdown`, `ShutdownReport`);
  `watch/tests.rs`, section « ACTION-0071 » (`shutdown_while_the_lock_is_held` et les trois preuves).
- **À savoir pour la reprise :**
  1. Plus aucun `Mutex::lock` côté watcher : les trois chemins passent par la même acquisition annulable.
     Le geste manuel garde `lock()` (et son refus historique d'un verrou empoisonné, non modifié).
  2. Les preuves tiennent le verrou **global** quelques centaines de ms et n'affirment qu'après l'avoir
     relâché, pour ne jamais l'empoisonner pour le reste de la suite.
  3. Nouveau point d'observation de test `before_guard_record` (`#[cfg(test)]`).
  4. La falsification (ancien comportement rétabli temporairement sous les nouveaux tests) est décrite en
     VALIDATION BZ.3; elle n'a laissé aucune trace dans le dépôt.
- **Non fait / non testé :** durée d'un commit déjà commencé que le shutdown attend, sur un gros arbre;
  WebView2 non rejoué (non requis).
- **Action unique suivante :** contrôle indépendant du correctif `ACTION-0071`.

## Relais actuel — TASK-0043, watcher automatique, en attente de contrôle — 2026-09-24

- **Fait :** `TASK-0043` est implémentée sur `build/v0.2-a27-v1-watcher-reconciliation` (partie de
  `5b752be`). Elle reste `IMPLEMENTED`. Aucune TASK-0044, USN, PR, fusion, étiquette ni release;
  `graph/` non touché; `incremental.rs` **non modifié** (seuil `F-031` intact).
- **Où regarder, dans l'ordre :** `DEC-0041` (dont §13); `src-tauri/src/watch/worker.rs` (la boucle) puis
  `queue.rs`, `parser.rs`, `backend.rs` / `native.rs`, `coalesce.rs`; `src-tauri/src/scope.rs` (W-B);
  `map/watch_ops.rs`; `map/watch_scope_tests.rs` (parité avec un scan complet, dont 90 tours aléatoires) et
  `watch/tests.rs` (manager, pertes, garde, périodique, 10 000); côté interface `watchStatus.ts`,
  `WatchStatusBadge.tsx`, `watchMapApp.test.tsx`; `scripts/task0043-webview2.{ps1,mjs}` + le seed.
- **À savoir pour la reprise :**
  1. Une portée est **un dossier et ses entrées directes**; un hint porte **un bit fermé** (l'appartenance de
     l'entrée a pu changer / seule l'entrée a bougé) — sans lui chaque modification d'un dossier de premier
     niveau serait un W-C. Ce n'est pas une nature du journal. À trancher : `DEC-0041` §13.
  2. `PUBLICATION_LOCK` est maintenant `pub(super)` : c'est la **seule** coordination d'écriture.
  3. Les tests utilisent des points d'observation `#[cfg(test)]` dans le worker (`before/after_wb/wc`) pour
     faire arriver un signal *pendant* un cycle; absents d'un binaire produit.
  4. Rejeu : `pnpm tauri build --debug --no-bundle` puis `pwsh scripts/task0043-webview2.ps1` (pwsh, pas
     PowerShell 5.1). Les cadences sont raccourcies par `FILETOPO_WATCH_*` (**build de développement
     seulement**). Le fil CDP compte les `POST` (un préflight comptait deux fois).
  5. Le rejeu réel a révélé un défaut d'interface (badge d'observation figé au retour de la racine), corrigé
     et couvert.
- **Non fait / non testé :** réseau, FAT, cloud, USN; repli périodique dans l'hôte; cadences produit en
  réel; deux processus; crash brutal.
- **Action unique suivante :** contrôle indépendant de `TASK-0043`.

## Relais actuel — TASK-0042, correctif ACTION-0069 P1/P1b, en attente de contrôle — 2026-09-24

- **Fait :** commit `4bed627` sur `build/v0.2-a26-v1-source-availability`. `TASK-0042` reste
  `IMPLEMENTED`. Aucune TASK-0043, watcher, polling, W-B/W-C, PR, fusion, étiquette ni release.
- **Où regarder :** `map/source_observation.rs` (`describes`, `TRANSIENT`, `commit`,
  `lose_transient_as_a_restart_would` réservé aux tests); les trois nouveaux tests de
  `map/source_availability_tests.rs` (`an_unwritable_failure_record_…`,
  `a_failure_record_left_next_to_a_newer_revision_…`, `a_restart_loses_an_unwritten_failure_…`);
  `src/map/refreshFailure.test.tsx` (rendu réel de `MapApp`, backend scripté).
- **À savoir pour la reprise :**
  1. L'emplacement mémoire est clé par (fichier du catalogue, cerveau), jamais sérialisé : deux
     bacs à sable de test ne partagent jamais une entrée. **Il ne rend pas l'état durable** : un
     redémarrage le perd, et c'est voulu.
  2. Un failure record est jugé contre la révision servie **comme** un `SYNCED` (sauf `None`).
     `record_failure` part du transient s'il existe pour garder le dernier succès.
  3. Deux tests existants ont bougé légitimement : `lifecycle_tests::state()` compare l'Index sans
     l'observation (comme `rr5`), et `a_synced_record_for_another_revision_is_not_believed`
     attend maintenant `UNKNOWN` pour un échec d'une autre révision.
- **Non fait / non testé :** WebView2 non rejoué; crash de processus réel entre les deux commits
  (seulement simulé par la perte du transient); deux processus.
- **Action unique suivante :** contrôle indépendant du correctif P1 / P1b.

## Relais actuel — TASK-0041, Actualiser manuel par le noyau incrémental, en attente de contrôle — 2026-09-24

- **Fait :** `TASK-0041` est implémentée sur `build/v0.2-a25-v1-manual-refresh-incremental`
  (partie de `d7b17a1`, `TASK-0040 = VERIFIED`). Elle reste `IMPLEMENTED`, jamais
  auto-`VERIFIED`. Aucune TASK-0042, watcher, W-B/W-C, F-032, PR, fusion, étiquette ni release.
- **Où regarder, dans l'ordre :** `DEC-0039`; `src-tauri/src/reconcile.rs` (le
  réconciliateur, ~310 lignes); `map/brain_index.rs::refresh_incrementally` /
  `has_current_stamp`; `map/commands.rs::publish_map` (`Gesture`, `ApplicationMode`);
  `map/refresh_incremental_tests.rs` (parité aléatoire, scénarios sur vrai arbre, garde
  « aucun remplacement complet »); `scripts/task0041-webview2.{ps1,mjs}` + le seed.
- **À savoir pour la reprise :**
  1. Le garde de preuve est un **trigger SQLite** refusant d'insérer un id déjà existant : la
     publication complète (DELETE puis réinsertion) ne le franchit pas, le noyau oui. Il
     persiste dans le fichier de test; `assert_incremental_equals_full` le retire avant
     l'unique **Reconstruire** de comparaison.
  2. Le réconciliateur lit toutes les lignes stockées en un passage (`O(corpus)`) : c'est
     `F-029` manuel, pas le watcher. Le coût du **lot** reste celui de `TASK-0040`.
  3. Un Index legacy sans liaison de source est **estampé** mais passe par le restamp complet
     (le noyau n'écrit jamais les métadonnées de cerveau). `built_unix_ms` n'avance qu'aux
     publications complètes.
  4. Le rejeu WebView2 lit le mode sur l'étiquette `data-testid="application-mode"`; le fil
     (CDP `Network`) ne prouve que la complétion. Il faut `pnpm tauri build --debug
     --no-bundle` (un simple `cargo build` pointe sur le serveur de développement).
- **Non fait / non testé :** coût d'un Actualiser sur 100 000+ nœuds; crash de processus;
  deux processus sur un même Index; F-030, F-032, W-B/W-C.
- **Action unique suivante :** contrôle indépendant de `TASK-0041`.

## Relais actuel — TASK-0040, recontrôle canonique F-031, en attente de contrôle — 2026-09-24

- **Fait :** les 5 campagnes canoniques d'`ACTION-0066` (35 échantillons bruts par cas) ont
  été exécutées; **ratio canonique 1,533 ≤ 2 → PASS**, cibles absolues PASS. `TASK-0040`
  reste `IMPLEMENTED`. Noyau, harnais Rust, réglages SQLite et seuil non touchés.
- **Où regarder :** `docs/performance/runs/TASK-0040-incremental-apply-canonical-summary.json`
  (sources, 35 échantillons bruts par cas, médianes, ratios, environnement identique),
  les cinq `…-canonical-0N.json`, `scripts/task0040-f031-canonical.ps1`,
  `BASELINE_TARGETS §3.3`, `VALIDATION BU`.
- **À savoir :** le script recalcule la synthèse seul avec `-SummaryOnly`. Le build
  `opt-level=3` vit dans `src-tauri/target/opt` (ignoré par Git). Les campagnes antérieures
  (dont 2,11) sont conservées.
- **Non fait :** suite Rust complète non rejouée (aucun code Rust modifié); TASK-0041,
  watcher, F-030/F-032, branchement de `map_refresh`.
- **Action unique suivante :** contrôle indépendant de la preuve canonique F-031.

## Relais actuel — TASK-0040, noyau d'application incrémentale, en attente de contrôle — 2026-09-24

- **Ce qui vient d'être fait :** `TASK-0040` est implémentée sur
  `build/v0.2-a24-v1-incremental-apply` (partie de `TASK-0039 = VERIFIED`). Elle reste
  `IMPLEMENTED`, jamais auto-`VERIFIED`. Aucune TASK-0041, watcher, PR, fusion,
  étiquette ni release; `map_refresh` inchangé.
- **Où regarder, dans l'ordre :** `DEC-0038`; `src-tauri/src/incremental.rs` (types
  `UpdateBatch` / `ObservedNode` / `ParentRef` / `RootObservation` / `BatchError`,
  `Index::apply_update_batch`, requêtes nommées `SQL_*`); `change_journal.rs::diff`
  (réutilisé tel quel); `index.rs::read_next_node_id` (seule visibilité changée);
  `map/incremental_apply_tests.rs` (monde de test, producteur de lot de test
  `derive_batch`, `Pair` = noyau contre scan complet); `incremental_bench.rs` +
  `scripts/task0040-incremental-bench.ps1`.
- **À savoir pour la reprise :**
  1. Le journal est produit par le **même** `diff` que `publish` sur les seules lignes
     touchées (`previous` = lignes connues du lot + supprimées; « seulement avant ⇒
     DELETED » = exactement les suppressions).
  2. Ordre d'écriture : insertions par profondeur croissante (clé étrangère), mises à
     jour, suppressions par profondeur décroissante (`ON DELETE CASCADE` : une sonde
     refuse si un enfant reste), deltas de `child_count`, métadonnées, journal, révision.
  3. Un lot est **complet** ou refusé : un dossier dont le chemin change amène tous ses
     descendants; un dossier supprimé, tous ses enfants.
  4. Les tests de parité exigent un monde en **ordre de scan** (parents avant enfants) :
     `publish` de référence l'exige aussi.
  5. La CI locale ne compile les tests qu'avec `debug_assertions` : les mesures « dev »
     ont SQLite compilé sans optimisation; « opt3 » = `CARGO_PROFILE_DEV_OPT_LEVEL=3`
     dans `src-tauri/target/opt` (supprimé après usage).
- **Non fait, volontairement :** watcher, réconciliation W-B/W-C, indisponibilité
  `F-032`, remplacement de `map_refresh`, producteur réel de lots.
- **Action unique suivante :** contrôle indépendant de `TASK-0040`.

## Relais précédent — TASK-0039, filtres dynamiques, en attente de contrôle — 2026-09-23

- **Ce qui vient d'être fait :** `TASK-0039` est implémentée sur
  `build/v0.2-a23-v1-dynamic-filters` (partie de `TASK-0038 = VERIFIED`). Elle reste
  `IMPLEMENTED`, jamais auto-`VERIFIED`. Aucune `TASK-0040`, PR, fusion, étiquette ni
  release.
- **Où regarder, dans l'ordre :** `DEC-0037`; `src-tauri/src/node_filter.rs` (types
  fermés, `NodeFilter::predicate`, `FilterCursor` `ftf1`, `Index::filtered_matches`);
  `map/filtered_projection.rs` (`materialize` = l'unique aiguillage de `map_view`,
  `materialize_filtered_view`, DTO `FilteredProjection`); `map/projection.rs` (deux
  constantes passées `pub(super)`, `filtered: None`); `map/commands.rs`
  (`view_with_filter`); `lib.rs` (`map_view` + paramètre `filter`); `change_journal.rs`
  (`unseen_predicate` rendu `pub(crate)`, **réutilisé**); tests
  `map/filter_tests.rs` et `node_filter.rs::tests`; côté interface `filters.ts`,
  `useProjectionFilter.ts`, `FilterPanel.tsx`, rôles dans `MapView.tsx`, câblage dans
  `MapApp.tsx`; preuve réelle `scripts/task0039-webview2.ps1` →
  `docs/performance/runs/TASK-0039-webview2.json`.
- **À savoir pour la reprise :**
  1. La requête de page **ne nomme pas** `nodes.seen` : la colonne du DTO est
     remplacée par la constante `0` (`page_columns`), un test l'impose sur le texte SQL.
  2. Ordre des correspondances = `id` croissant (keyset `id > :after`, `LIMIT` lié, pas
     d'`OFFSET`); la vue filtrée trie les nœuds par `(depth, id)` pour que le layout voie
     toujours le parent avant l'enfant (un sous-arbre déplacé garde son ancien `id`).
  3. Page filtrée = au plus **63 correspondances** (cible de 64 nœuds racine comprise);
     la première correspondance est toujours prise, seul le plafond de 256 la refuse.
  4. Un nœud de contexte qui satisfait lui-même le filtre reste « Contexte » sur la page
     où il n'est qu'ancêtre; il est compté et paginé comme correspondance là où le keyset
     l'atteint. Décision à examiner.
  5. Côté interface, le hook ne garde que le filtre, le cerveau et une pile de curseurs;
     la page (≤ 64 nœuds) est rangée dans `loaded` comme toute projection. Changer de
     cerveau abandonne le filtre et relit la projection normale de l'ancien cerveau;
     naviguer (`changeProjection`) abandonne le filtre sans relecture.
  6. `pnpm tauri build --debug --no-bundle` est **indispensable** avant le rejeu : un
     simple `cargo build` produit un binaire qui vise `localhost` (page d'erreur).
- **Non fait, volontairement :** persistance des filtres au redémarrage (`P-19`),
  watcher `F-030`, incrémental `F-031`, facettes supplémentaires, `ONLINE_ONLY` sur un
  vrai placeholder Cloud Files.
- **Action unique suivante :** contrôle indépendant de `TASK-0039`.

## Relais précédent — TASK-0038, état vu/non vu dérivé du journal, en attente de contrôle — 2026-09-23

- **Ce qui vient d'être fait :** `TASK-0038` est implémentée sur
  `build/v0.2-a22-v1-seen-state` (partie de `TASK-0037 = VERIFIED`, porte
  public-readiness fermée). Elle reste `IMPLEMENTED`, jamais auto-`VERIFIED`.
  Aucune `TASK-0039`, aucune PR, fusion, étiquette ni release.
- **Où regarder, dans l'ordre :** `DEC-0036`; `src-tauri/src/change_journal.rs`
  (`SEEN_STATE_DDL`, `validate_seen_schema`, `mark_event_seen`, `mark_node_seen`,
  `mark_all_seen`, `node_change_state`, `page` qui lit le watermark dans son
  snapshot); `src-tauri/src/index.rs` (`run_seen_state_migration`, bras `5 =>` du
  dispatcher, `migrate_to_seen_state`); `map/brain_index.rs` (validation v6,
  méthodes de marquage); `map/commands.rs` (`open_store_writable`, DTO et quatre
  fonctions); `lib.rs` (`map_change_mark_seen`, `map_node_mark_seen`,
  `map_change_mark_all_seen`, `map_node_change_state`);
  `src/map/ChangeJournalPanel.tsx`, `src/map/NodeChangeState.tsx`,
  `src/map/DetailsPanel.tsx` (une fente `changeState`); tests
  `map/seen_state_tests.rs`, `NodeChangeState.test.tsx`,
  `ChangeJournalSeenState.test.tsx`; preuve réelle
  `scripts/task0038-webview2.ps1` → `docs/performance/runs/TASK-0038-webview2.json`.
- **À savoir pour la reprise :**
  1. `nodes.seen` est **historique** : ni lu ni écrit par la V1, jamais la vérité de
     `isNew`/`isUnseen` (un test force une valeur contradictoire).
  2. La **baseline** v5 → v6 est le `MAX(event_id)` existant : ce n'est pas « l'utilisateur
     a tout lu », c'est « le suivi commence ici ».
  3. Les commandes de marquage ouvrent l'index en **écriture** (`open_store_writable`),
     avec les mêmes contrôles brain/binding et la même migration `M-B` que la lecture.
  4. Après un Actualiser, la sélection revient sur la racine (comportement existant) :
     le panneau d'élément montre alors l'état de la racine jusqu'à une nouvelle sélection.
  5. Le harnais `TASK-0037` affirme le schéma 5 et échouerait sur cette ligne; il n'a pas
     été rejoué et son artefact vérifié n'a pas été touché.
  6. `unseenTotal` est celui de **tout** le journal (pas du filtre) — choix déclaré.
- **Non fait, volontairement :** filtres de carte `F-022`, watcher `F-030`, incrémental
  `F-031`, rétention du journal, suppression de `nodes.seen`.
- **Action unique suivante :** contrôle indépendant de `TASK-0038`.

## Relais précédent — porte public-readiness fermée, prête pour l'orchestration de la tranche V1 suivante — 2026-09-23

- **Ce qui vient d'être fait :** sur `chore/v0.2-public-readiness-cleanup`, le
  chemin Git local absolu hérité de `TASK-0027` a été retiré du tree courant
  (`docs/ai/VALIDATION.md` et `docs/tasks/TASK-0027-…md`) et l'audit
  `scripts/audit-public-readiness.ps1 -AllowRemotes` est **vert** (487 fichiers).
  `TASK-0037` est `VERIFIED` (`ACTION-0061`); son code n'a pas été modifié.
- **À savoir pour la reprise :**
  1. C'est un nettoyage du **tree courant**, pas une réécriture de l'historique
     Git : l'ancien chemin reste dans les commits publiés.
  2. Le script d'audit s'arrêtait à la première trouvaille et masquait les
     suivantes; il les liste désormais toutes. Il tolère deux noms fictifs
     (`quelquun`, `other`) issus de tests synthétiques — décision à confirmer
     (l'alternative est de réécrire ces constantes de test).
  3. Rien de fonctionnel n'a changé; Rust/TS non rejoués, à raison.
  4. Incident de méthode consigné dans `.orchestrator/RESULT.md` : un
     `checkout` échoué suivi d'un `merge --ff-only` chaîné avait avancé
     localement la branche build; remise sur son `origin`, rien poussé.
- **Non fait, volontairement :** aucune `TASK-0038`; watcher, incrémental,
  filtres nouveau/non-vu, marquer vu restent hors portée tant que
  l'orchestrateur n'a pas cadré la tranche.
- **Action unique suivante :** audit/orchestration de la tranche V1 suivante.

## Relais précédent — TASK-0037, V1 Change Journal livrée, en attente de contrôle — 2026-09-23

- **Ce qui vient d'être fait :** `TASK-0037` est implémentée sur
  `build/v0.2-a21-v1-change-journal` (partie de `TASK-0036 = VERIFIED`,
  `ACTION-0060`). Elle reste `IMPLEMENTED`, jamais auto-`VERIFIED`. Aucune
  `TASK-0038`, aucune PR, fusion, étiquette ni release.
- **Où regarder, dans l'ordre :** `src-tauri/src/change_journal.rs` (DDL,
  `diff` pure, `append_events`, `page`, curseur `fjc1`);
  `src-tauri/src/index.rs` (`publish` : diff + événements dans la même
  transaction `IMMEDIATE`; dispatcher `migrate_to_current_schema`, étape
  `run_change_journal_migration`); `map/brain_index.rs`
  (`open_existing_migrating` : même `M-B`, validation qui exige le journal;
  `change_journal_page`); `map/commands.rs` (`change_journal`, DTO,
  `MapBuildReport.changeSummary`); `lib.rs` (`map_change_journal`);
  `src/map/ChangeJournalPanel.tsx`; `map/change_journal_tests.rs`;
  `scripts/task0037-*`.
- **Décisions à examiner en priorité (le contrôle indépendant doit les
  trancher, pas les subir) :**
  1. **v3 reste migrable.** Le dispatcher enchaîne `3 → 4 → 5` dans **une**
     enveloppe `M-B` (une copie de sûreté du fichier tel que trouvé) au lieu de
     n'accepter que « exactement la version précédente » comme `ACTION-0057` D1.
     Choisi pour ne pas abandonner un index v3 existant et garder valides les
     preuves D1–D6; à confirmer ou à resserrer.
  2. **`MODIFIED` n'observe pas l'horodatage propre d'un dossier** (réécrit par
     l'OS à chaque entrée créée/supprimée/renommée dedans; sinon chaque parent
     de chaque changement structurel serait un faux `MODIFIED`). Limite déclarée.
  3. **Référence sans événement** au premier build **et** au premier republish
     d'un index migré depuis v3 (lignes sans clé stable) : sinon tout nœud serait
     « supprimé puis créé ».
  4. **Seul le pipeline à identités journalise** (`publish_map`). Les chemins
     `replace`/`replace_nodes` de test, à ids choisis par l'appelant, ne journalisent
     pas.
  5. **Curseur lié à l'`index_id`, pas à la révision** : le journal est en ajout
     seul, une nouvelle actualisation n'invalide pas une lecture de l'historique.
- **Preuves à rejouer si besoin :** `cargo test --offline` (444),
  `pnpm test` (352), et — après `pnpm build` **puis
  `pnpm tauri build --debug --no-bundle`** (un `cargo build` seul vise `devUrl`
  et le harnais n'affiche rien) — `powershell -File scripts/task0037-webview2.ps1`
  (deux lancements réels, un redémarrage réel).
- **Rappels d'hygiène :** le rejeu du harnais `TASK-0036` réécrit
  `docs/performance/runs/TASK-0036-webview2.json` (artefact d'une tâche
  `VERIFIED`) : le restaurer avec `git checkout --` après un rejeu, comme fait ici.
  `scripts/audit-public-readiness.ps1` échoue sur un contenu antérieur
  (`VALIDATION.md` ligne 3793); `graph/*` n'est plus tenu depuis `TASK-0009`.
- **Non fait, hors périmètre :** watcher, `ReadDirectoryChangesExW`,
  application incrémentale U-B, réconciliation W-B/W-C, filtres de carte
  nouveau/non vu, marquer vu, FTS5, rétention du journal.
- **Action unique suivante :** contrôle indépendant de `TASK-0037`.

## Relais précédent — TASK-0036, passe corrective D6 (`ACTION-0059`) livrée — 2026-09-12

- **Ce qui vient d'être fait :** le recontrôle indépendant
  [`ACTION-0059`](../reviews/ACTION-0059-independent-recontrol.md) a accepté
  D1/D2/D3/R1 (relais d'avant-hier) et D5 (relais précédent) sans réserve, et
  a confirmé que D4 était **largement** corrigé — mais a trouvé un dernier
  défaut bloquant, D6, dans la même zone de code. `TASK-0036` reste
  `IMPLEMENTED`, jamais auto-`VERIFIED`. Aucune `TASK-0037`, aucun
  watcher/journal/incrémental.
- **D6 — la copie de sûreté M-B était supprimée un cran trop tôt.** Le flux
  de la livraison précédente (`0daf342f`) faisait : `migrate_previous_schema()`
  réussit → supprimer `safety_copy` → **puis** appeler
  `finish_open_existing(connection)`. Le contrat `ACTION-0058` D4 exigeait
  pourtant explicitement que la restauration couvre un échec de **migration
  OU de validation** — et `finish_open_existing()` (contrat canonique v4 :
  `is_built()`, identité, compte, `root_id`) peut encore refuser un fichier
  que le DDL SQL a pourtant migré correctement. Dans ce cas précis, l'ancien
  flux retournait une erreur en laissant le fichier **déjà en v4**, sans
  aucune copie v3 pour s'en remettre — exactement l'écart que `M-B` de
  `DEC-0013` B existe pour empêcher.
- **Correction, sans dupliquer ni affaiblir `finish_open_existing()`.** La
  copie reste maintenant en vie jusqu'à ce que `finish_open_existing()`
  **elle-même** ait réussi :
  ```
  migrate_previous_schema() OK
  match finish_open_existing(connection) {
      Ok(store)  => supprimer la copie, retourner store
      Err(erreur) => restaurer la copie (connexion déjà fermée par le Drop
                     interne de finish_open_existing sur son propre chemin
                     d'erreur), supprimer la copie, retourner erreur
  }
  ```
  Aucune fermeture de connexion manuelle n'était nécessaire sur la branche
  de validation : `finish_open_existing(connection)` possède la connexion
  localement et la relâche par simple `Drop` de Rust quand elle retourne
  `Err` sans l'avoir rendue — le fichier est donc déjà libre d'écriture au
  moment où la restauration s'exécute. Si la restauration elle-même échoue,
  son erreur remonte **avant** toute suppression de la copie — elle reste
  disponible pour une récupération manuelle, exactement comme le chemin
  d'échec de migration (D4) le faisait déjà.
- **Preuve, et confirmée fausse sur le code d'avant** (exigence explicite du
  prompt correctif) : `d6_a_post_migration_validation_failure_restores_the_v3_index_in_full`
  corrompt `build_complete` — une métadonnée canonique que
  `migrate_previous_schema()` ne touche ni ne lit jamais — de sorte que le
  DDL `v3 → v4` réussisse réellement et que seule la validation échoue
  ensuite. Rejoué contre `0daf342f` (via `git stash` temporaire sur
  `brain_index.rs` seul), le test échoue bien : `user_version` reste à `4`
  au lieu d'être restauré à `3`. Avec la correction, il prouve la
  restauration complète (schéma, nœuds, `seen`, `index_id`,
  `index_revision`, binding `source_kind`/`source_ref`), la suppression de
  la copie transitoire après restauration réussie, puis qu'une nouvelle
  tentative après réparation de l'invariant migre proprement vers v4 sans
  laisser de copie derrière elle.
- **Rejeu WebView2 non refait, justifié plutôt qu'omis.** Le changement ne
  touche que l'ordre relatif de deux étapes et un chemin de restauration
  qui ne s'exerce que si `finish_open_existing()` refuse un fichier après
  une migration SQL par ailleurs réussie — un cas que le harnais WebView2
  (des arbres synthétiques valides, jamais volontairement corrompus) n'a
  jamais exercé et n'exerce toujours pas. Le chemin heureux — migration
  réussie, validation réussie, copie supprimée, store retourné — est
  **identique** avant et après cette passe. Le rejeu déjà publié sous
  `0daf342f` (`docs/performance/runs/TASK-0036-webview2.json`, inchangé par
  cette passe) reste donc pleinement applicable; en refaire un aurait été
  fabriquer une preuve que rien dans ce changement ne justifie.
- **Ce que le prochain relais doit savoir :**
  - Le motif du bug lui-même est un piège général à retenir : **une
    ressource de secours (backup, verrou, copie) ne doit jamais être
    libérée avant que *toute* la chaîne de validation qui suit l'opération
    protégée ait fini de se prononcer** — pas seulement l'opération SQL/IO
    elle-même. `finish_open_existing()` est une validation à part entière,
    pas un simple accessoire après la migration.
  - Le même piège `rustfmt`/module-tree s'est reproduit une quatrième fois,
    identique aux relais précédents; évité de la même façon. Cette fois,
    seuls deux fichiers étaient touchés (`brain_index.rs`,
    `stable_identity_tests.rs`), et `brain_index.rs` s'est révélé déjà
    propre — seul le fichier de tests avait deux lignes héritées du relais
    précédent que `rustfmt` préfère maintenant recomposer sur une seule
    ligne (sous la limite de largeur), sans rapport avec cette passe.
- **Ce qui reste ouvert :** exactement ce que les relais précédents
  listaient — aucun watcher, incrémental, FTS5, filtre; déplacement
  inter-volume non testé; `seen` non rejoué en WebView2; aucune fixture
  Cloud Files réelle; vrai crash/coupure de courant pendant la migration non
  reproduit.
- **Action unique suivante :** contrôle indépendant final de `TASK-0036`,
  sur cette passe corrective.

## Relais précédent — TASK-0036, passe corrective D4/D5 (`ACTION-0058`) livrée — 2026-09-12

- **Ce qui vient d'être fait :** le recontrôle indépendant
  [`ACTION-0058`](../reviews/ACTION-0058-independent-recontrol.md) a accepté
  les quatre corrections d'`ACTION-0057` (D1/D2/D3/R1, relais précédent) sans
  régression, mais a trouvé une **omission de la spécification orchestrée
  elle-même** : `DEC-0013`, approuvée le 2026-08-31, restait normative sur
  deux points jamais cités par la fiche `TASK-0036` initiale — B (migration
  `M-B`) et F (frontière Cloud Files) — et n'a été supplantée sur F que par
  la nouvelle [`DEC-0035`](../decisions/DEC-0035-cloud-files-stable-identity-boundary.md).
  Deux défauts en découlaient, nommés D4 et D5. La passe corrective décrite
  par `.orchestrator/NEXT_PROMPT.md` les ferme tous les deux, sur la même
  branche. `TASK-0036` reste `IMPLEMENTED`, jamais auto-`VERIFIED`. Aucune
  nouvelle `TASK-0037`, aucun watcher/journal/incrémental commencé.
- **D4 — la migration `3 → 4` suit maintenant `M-B` de `DEC-0013` B :
  quiescer, copier, migrer, restaurer si échec.** La transaction SQL
  atomique d'`ACTION-0057` D2 reste le moteur interne, inchangée — mais
  `DEC-0013` B exige une couche supplémentaire, indépendante du moteur
  transactionnel : une copie de sûreté **de fichier**, prise sur une base
  **quiescée**, avant la première mutation, avec restauration explicite si
  la migration échoue. `BrainIndex::open_existing_migrating` gagne, entre le
  contrôle de binding (inchangé) et l'appel à
  `Index::migrate_previous_schema()` : un verrou par `brain_id`
  (`migration_lock_for`, une `HashMap<String, Arc<Mutex<()>>>` en mémoire de
  processus — étroit et par cerveau, comme demandé, jamais une nouvelle
  architecture ni un second store) qui sérialise deux tentatives
  concurrentes sur le **même** fichier — nécessaire parce que la copie de
  sûreté au niveau fichier, contrairement au SQL, n'est pas protégée par le
  verrouillage SQLite; une quiescence par `PRAGMA wal_checkpoint(TRUNCATE)`,
  refusée (`MigrationUnavailable`, aucune copie, aucune migration) si elle ne
  peut pas compléter (`busy != 0`, typiquement un lecteur concurrent qui
  retient un ancien instantané); une copie `fs::copy` vers
  `<index>.v3-safety-copy`, dans le même dossier `map/` du cerveau — jamais
  sous la source — vérifiée indépendamment ouvrable en v3 **avant** le
  premier `ALTER TABLE` v4; en cas d'échec de la migration, la connexion est
  fermée explicitement (Windows refuse d'écraser un fichier qu'un handle
  tient encore ouvert) puis la copie restaurée par-dessus le fichier vivant;
  la copie transitoire est supprimée dans les deux issues terminales
  (succès ou restauration réussie) — une seule copie par tentative, jamais
  accumulée.
- **Preuve WAL réelle, pas seulement transactionnelle.** Le test
  `d4_a_wal_pending_write_is_captured_and_restored_on_injected_migration_failure`
  laisse une écriture **committée uniquement dans `-wal`** (une connexion
  brute gardée ouverte, ce qui empêche le checkpoint automatique de
  fermeture de SQLite de la replier avant l'heure), injecte la même
  obstruction de schéma réelle que D2, et prouve que la restauration après
  échec récupère **cette même écriture** — la preuve que la quiescence a
  réellement replié le `-wal` dans la copie avant que la migration ne
  commence, pas seulement que le rollback SQL fonctionne. Complété par
  `d4_a_busy_checkpoint_refuses_without_migrating_or_copying` (un lecteur
  concurrent retenant un ancien instantané bloque le `TRUNCATE`; refus
  propre, aucune copie) et `d4_a_failed_safety_copy_refuses_without_migrating`
  (un dossier occupe la destination de la copie; `fs::copy` échoue; refus
  propre). Les trois refus D1 déjà acquis (brain mismatch, binding
  disagreeing, future schema) gagnent chacun une assertion « aucune copie de
  sûreté créée », et le test de succès D1 gagne « aucune copie de sûreté
  laissée derrière ».
- **D5 — un placeholder Cloud Files reconnu reste `PATH_FALLBACK`, hydraté
  ou non.** `DEC-0035` ferme la porte que `DEC-0013` F avait laissée
  ouverte : l'exclusion `online_only` seule ne suffit pas, parce qu'un
  placeholder hydraté peut perdre ses attributs `RECALL_*` et retomber sur
  la voie `SYSTEM` générique, changeant sa provenance — et donc son
  `nodes.id` à la prochaine publication — sans rien de visible dans le
  fichier lui-même. `identity::compute_identity` appelle désormais
  `cloud_files_detection(absolute_path)` (nouvelle primitive, confinée à
  `identity.rs` comme le reste de l'accès Windows) **avant** toute tentative
  `SYSTEM`, seulement pour les nœuds déjà éligibles (reparse/skipped/
  online-only restent exclus comme avant — aucune ouverture de handle
  supplémentaire pour eux). `windows-sys` gagne la feature
  `Win32_Storage_CloudFilters`, déjà auditée dans la même caisse pinnée
  `=0.61.2` — aucune nouvelle dépendance. Le handle est ouvert pour
  `FILE_READ_ATTRIBUTES` seul (jamais `GENERIC_READ`, jamais de contenu);
  `CfGetPlaceholderInfo(..., CF_PLACEHOLDER_INFO_STANDARD, ...)` sert
  **uniquement** de détection — son succès seul suffit (`Placeholder`,
  jamais `SYSTEM`), l'échec `ERROR_NOT_A_CLOUD_FILE` (converti par
  `HRESULT_FROM_WIN32` standard, pas une valeur magique) laisse `SYSTEM`
  disponible (`NotCloudFile`), toute autre erreur ou handle non ouvrable est
  conservatrice (`Ambiguous`, jamais `SYSTEM`). Aucun appel à
  `CfHydratePlaceholder`/`CfDehydratePlaceholder`/pin-state — jamais importé,
  prouvé structurellement par un test qui scanne le texte source de
  `identity.rs` (même technique que le test `DEC-0033` I existant ailleurs
  dans le dépôt) en excluant son propre module de test (qui doit *nommer*
  ces symboles interdits dans sa propre liste d'assertions).
- **D5 — pas de fixture Cloud Files réelle, et pourquoi.** Fabriquer un vrai
  placeholder synthétique demanderait `CfRegisterSyncRoot` — une inscription
  réelle de fournisseur de synchronisation auprès de Windows, avec un risque
  réel de laisser un état système si le nettoyage échouait. `ACTION-0058`
  autorisait explicitement à s'en passer plutôt que d'élargir la portée.
  La frontière est donc prouvée par trois couches : une table de décision
  pure (`blocks_system_identity`), testée sans aucun appel Windows, sur les
  trois issues de `CloudFilesDetection`; l'appel Windows réel
  (`cloud_files_detection`) exercé contre un fichier ordinaire, prouvant la
  réponse officielle « pas un Cloud Files » et que `compute_identity`
  atteint toujours `SYSTEM` pour lui — aucune régression sur le cas commun;
  et les sources Microsoft déjà citées en toutes lettres par `DEC-0035`.
- **Rejeu WebView2 complet, aucun scénario `v3 → v4` ajouté au harnais —
  séparation expliquée, pas dette cachée.** `NEXT_PROMPT.md` §4 l'autorisait
  explicitement : la preuve produit de la migration M-B est en Rust, avec un
  contrôle précis du fichier v3/copie/WAL qu'un scénario WebView2 ne
  pourrait pas offrir sans le refabriquer autrement. Le harnais existant
  (inchangé) reste centré sur le comportement produit :
  rename/move/sous-arbre déplacé/non-recyclage/recherche/enfants/projection/
  reveal/copie/confidentialité, tous verts, `copyStillSucceeds` toujours
  `true`, 0 erreur console fatale.
- **Ce que le prochain relais doit savoir :**
  - `migration_lock_for` est un registre **en mémoire de processus** —
    aucune persistance, aucune portée inter-processus. Ce n'est pas un
    défaut pour `TASK-0036` (un seul processus FileTopo à la fois par
    session), mais si une future tâche introduit plusieurs processus contre
    le même espace applicatif, ce verrou ne les coordonnera pas.
  - Le fichier de copie de sûreté (`<index>.v3-safety-copy`) n'est **jamais**
    retourné par une commande, écrit dans un log ou embarqué dans un
    artefact — son `PathBuf` ne quitte jamais `brain_index.rs`. Un futur
    lecteur qui voudrait exposer un statut de migration à l'UI doit
    reconstruire ce nom lui-même plutôt que d'exporter la fonction interne.
  - Le même piège `rustfmt`/module-tree documenté par les deux relais
    précédents s'est reproduit une troisième fois à l'identique : `cargo
    fmt -- --config style_edition=2024` sur le crate entier, puis
    `git checkout` de tout fichier hors du périmètre réellement touché
    (14 fichiers cette fois, aucun cette passe ne les a modifiés). Les trois
    nouveaux tests D4 avaient d'abord repris le `.err().expect(...)` du
    relais précédent (nécessaire là où le type `Ok` ne porte pas `Debug`) —
    mais `open_map` rend `MapOpenReport`, qui **implémente** `Debug`, donc
    `expect_err(...)` était disponible directement; `cargo clippy` sur les
    fichiers touchés l'a signalé et la correction a été faite avant
    livraison.
  - `cargo clippy --all-targets --offline -- -D warnings` reste rouge à 26
    erreurs uniques (mêmes 24 diagnostics + doublons lib/test qu'au relais
    précédent), confirmées identiques ligne par ligne — aucune dans un
    fichier touché par cette passe.
- **Ce qui reste ouvert :** exactement ce que les relais précédents
  listaient — aucun watcher, incrémental, FTS5, filtre; déplacement
  inter-volume non testé; `seen` non rejoué en WebView2 (prouvé côté Rust
  sur Windows réel); aucune fixture Cloud Files réelle (voir D5 ci-dessus,
  couvert par abstraction + Win32 réel sur cas ordinaire + sources
  Microsoft); vrai crash/coupure de courant pendant la migration non
  reproduit (les tests D4 injectent un échec SQL déterministe et une
  obstruction de checkpoint, pas un `SIGKILL` du processus — la même limite
  que `B1` déclarait déjà pour le spike de migration).
- **Action unique suivante :** nouveau contrôle indépendant de `TASK-0036`,
  sur cette passe corrective.

## Relais précédent — TASK-0036, passe corrective D1/D2/D3 (`ACTION-0057`) livrée — 2026-09-11

- **Ce qui vient d'être fait :** le contrôle indépendant
  [`ACTION-0057`](../reviews/ACTION-0057-independent-control.md) a confirmé
  le cœur I-E de `TASK-0036` mais bloqué la fermeture sur trois défauts
  précis (D1, D2, D3) plus une réserve (R1). La passe corrective décrite par
  `.orchestrator/NEXT_PROMPT.md` les ferme tous les quatre, sur la même
  branche `build/v0.2-a20-v1-stable-identity`. `TASK-0036` reste
  `IMPLEMENTED`, jamais auto-`VERIFIED`. Aucune nouvelle DEC, aucune
  `TASK-0037`, aucun watcher/journal/incrémental commencé.
- **D1 — la migration `3 → 4` est maintenant atteignable par le cycle
  produit.** `BrainIndex::open_existing` reste strictement v4-only, comme
  demandé — rien n'y a changé. La nouvelle méthode
  `BrainIndex::open_existing_migrating(path, writable, brain)` est le seul
  endroit qui migre : elle ouvre le fichier, et seulement si son
  `PRAGMA user_version` est **exactement** `MAP_PREVIOUS_SCHEMA_VERSION`
  (3), vérifie `brain_id` puis `binding_matches(brain)` (logique désormais
  partagée avec `commands::check_publishable`, qui a été simplifié pour
  l'appeler plutôt que de dupliquer le `match`) **avant** de toucher un seul
  octet du fichier. Un mismatch refuse sans migrer et sans lire la source.
  Seuls les deux checks passés, `Index::migrate_previous_schema()` tourne
  (schéma seulement, jamais la source). `open_for_brain` — le seul goulot
  que `map_open`/`refresh_map`/`rebuild_map` partagent déjà — fait d'abord
  un `peek_schema_version` en lecture seule bon marché et ne bascule sur le
  chemin migrant, réouvert en écriture, que si le fichier est exactement en
  v3; le chemin ordinaire (déjà v4, l'écrasante majorité) reste identique à
  avant, en lecture seule. `map_open` continue donc de déclarer
  `sourceRead=false`.
- **D2 — la transition `3 → 4` est maintenant une seule transaction.** Les
  deux `ALTER TABLE`, l'index unique, l'amorçage de `next_node_id` **et**
  l'écriture finale de `PRAGMA user_version`/`schema_meta.schema_version`
  sont tous dans la même `unchecked_transaction()`
  (`Index::run_stable_identity_migration`), qui ne committe qu'une fois, à
  la toute fin. Toute erreur avant ce commit fait rollback automatiquement
  (comportement par défaut de `Transaction` au `Drop`) vers le fichier v3
  original, octet pour octet. Testé avec une **obstruction de schéma réelle**
  (une `TABLE` nommée `idx_nodes_stable_key`, qui bloque le
  `CREATE UNIQUE INDEX IF NOT EXISTS` du même nom après que les deux
  `ALTER TABLE` ont déjà réussi) plutôt qu'un hook test-only : preuve qu'un
  échec **après** mutation de schéma fait un rollback complet, pas seulement
  un refus avant que quoi que ce soit n'ait commencé.
- **D3 — `PATH_FALLBACK` hache maintenant le chemin OS brut.**
  `identity::path_fallback_key` prend désormais un `&Path` et hache
  `path_codec::encode_path(relative)` (UTF-16LE sous Windows, octets bruts
  ailleurs) — jamais la chaîne d'affichage `to_string_lossy()`. Le matériau
  haché porte le tag de version, une longueur explicite du chemin encodé,
  puis le tag de type — un préfixe de longueur, pas seulement un octet
  séparateur, pour qu'aucune concaténation ambiguë ne soit possible.
  `scanner.rs` passe maintenant le `PathBuf` relatif brut du parcours
  (`relative`), plus `&relative_display`. Un nouveau test Windows construit
  deux chemins avec des **surrogates isolés différents** (0xD800 vs 0xD801)
  dont la projection `to_string_lossy()` est **identique** (les deux
  deviennent `U+FFFD`) et prouve que leurs clés fallback restent
  différentes — exactement l'ambiguïté que D3 devait fermer.
- **R1 — « Copier le chemin » a réussi au rejeu, avec preuve fraîche, pas
  seulement citée.** Le rejeu WebView2 complet de cette passe
  (`scripts/task0036-webview2.ps1`) donne `copyStillSucceeds: true`,
  `copyFailureReason: null` — l'échec précédent (`clipboard_write_failed`,
  fenêtre cachée) ne s'est pas reproduit. Aucune ligne de
  `resolve_confined_target`/`copy_target_path`/`reveal_node` n'a été
  modifiée par cette passe; le nouvel artefact remplace l'ancien dans
  `docs/performance/runs/TASK-0036-webview2.json`.
- **Bonus hors défaut nommé, trouvé en lisant `publish()` pour D1/D2 :**
  `publish_with_identity` documentait une précondition de bijection
  (« chaque `identities` doit nommer chaque nœud de `nodes`, une fois »)
  **jamais vérifiée** — une identité manquante pouvait atteindre
  `row_identity.get(&canonical_id).expect(...)` et **paniquer**. Fermé avec
  une validation bornée (`PublishError::IdentityNotBijective`, nouveau) sur
  trois cas : identité manquante, identité pour un `node_id` inconnu,
  `node_id` dupliqué dans la liste — trois tests dédiés, aucun panique
  possible désormais. Le scanner réel garantissait déjà la bijection; c'est
  la fonction `pub(crate)` elle-même qui ne la vérifiait pas.
- **Ce que le prochain relais doit savoir :**
  - `MAP_PREVIOUS_SCHEMA_VERSION` (`map/store.rs`) = `MAP_SCHEMA_VERSION - 1`
    = 3, exactement le seul saut que le produit migre automatiquement. Un
    futur bump de schéma (`5`) n'active **aucune** migration produit tant
    que cette constante et la nouvelle méthode `open_existing_migrating`
    n'ont pas été étendues délibérément — ce n'est pas une chaîne générique.
  - `BrainIndex::binding_matches(brain)` est maintenant la seule
    implémentation de la règle Bound/Legacy/Incoherent de `DEC-0033` D;
    `check_publishable` et `open_existing_migrating` l'appellent tous les
    deux. Ne pas réécrire cette logique une troisième fois ailleurs.
  - Le même piège `rustfmt`/module-tree documenté dans le relais précédent
    (ci-dessous) s'est reproduit à l'identique cette fois-ci : `cargo fmt`
    et même `rustfmt --edition 2024` bruts reformatent tout le crate
    atteignable dès qu'on leur passe un fichier qui `mod`-déclare le reste.
    En plus : cette installation locale de `rustfmt` (1.9.0-stable)
    n'applique **pas** le style 2024 par défaut avec `--edition 2024` seul
    — il faut `--config style_edition=2024` explicitement, sinon il
    réécrit vers un style plus ancien qui **contredit** ce qui est déjà
    committé. Vérifié en reproduisant la même dérive sur `hierarchy.rs`
    (jamais touché par cette passe) à `HEAD`, avant toute modification.
  - `cargo clippy --all-targets --offline -- -D warnings` reste rouge à 26
    erreurs uniques (24 diagnostics + doublons lib/test), **confirmées
    identiques à `HEAD` par `git stash`** avant cette passe : aucun fichier
    touché par D1/D2/D3 n'y figure.
- **Ce qui reste ouvert :** exactement ce que le relais précédent listait —
  aucun watcher, incrémental, FTS5, filtre; déplacement inter-volume non
  testé; identité après hydratation cloud contournée; `seen` non rejoué en
  WebView2 (prouvé côté Rust sur Windows réel). Le scénario de mise à niveau
  `v3 → v4` en WebView2 n'a **pas** été ajouté au harnais : la preuve produit
  du chemin de migration est en Rust (`stable_identity_tests.rs`, sur un
  index v4 réel réduit exactement à la forme v3 puis migré via `map_open`),
  jugée plus fiable qu'un scénario WebView2 qui devrait fabriquer le même
  fichier par un autre moyen; le harnais WebView2 reste centré sur le
  comportement produit (rename/move/search/children/projection/reveal/copy/
  confidentialité), rejoué sans régression.
- **Action unique suivante :** nouveau contrôle indépendant de `TASK-0036`,
  sur cette passe corrective.

## Relais précédent — TASK-0036, V1 Stable Identity Foundation livrée, en attente de contrôle — 2026-09-11

- **Ce qui vient d'être fait :** `TASK-0035` était déjà `VERIFIED` par
  `ACTION-0056` (déjà sur la branche précédente, documents durables déjà
  synchronisés). `TASK-0036 — V1 Stable Identity Foundation` est livrée sur
  `build/v0.2-a20-v1-stable-identity` : `IMPLEMENTED`, jamais
  auto-`VERIFIED`. Aucune nouvelle DEC — productionise `DEC-0009` I-E, déjà
  `APPROVED` depuis la porte P2.
- **Le geste central :** `identity.rs`, nouveau module sans dépendance vers
  `map/`, calcule une identité par nœud pendant le parcours existant du
  scanner — `SYSTEM` (`VolumeSerialNumber + FileId`, la technique B3 déjà
  `VERIFIED`, adaptée sur Rust stable) quand le nœud y est éligible, repli
  déterministe/versionné du chemin relatif + type sinon. À la publication,
  `Index::publish` (fonction interne unifiée qui remplace l'ancienne
  `replace_nodes_with_metadata`) remappe le scan vers les `nodes.id`
  canoniques : une clé stable reconnue garde son id; un objet neuf reçoit un
  id d'un compteur durable (`next_node_id`) qui n'avance jamais à rebours.
- **Le choix de conception qui a tout simplifié :** `Index::publish` a DEUX
  modes, `identities: None` et `identities: Some(list)`. Le mode `None` est
  **exactement** le comportement d'avant cette tâche — id/`parent_id`
  gardés verbatim — et c'est le mode que prennent **tous** les appelants
  synthétiques existants (`replace_nodes()`, les 34 sites `NodeDto { .. }`
  littéraux du dépôt, les bancs `scale_spike`/`scale_query`). **Aucun d'eux
  n'a été touché.** Seul `map::commands::publish_map` (le pipeline réel)
  appelle `identities: Some(...)`, via une nouvelle méthode
  `BrainIndex::replace_with_identity`. C'est ce qui a permis de livrer sans
  toucher un seul test synthétique préexistant.
- **Qui a fait quoi :** Claude Code a écrit la tranche entière. **Il ne
  peut pas rendre le verdict.**
- **Ce que le prochain relais doit savoir :**
  - **`SCHEMA_VERSION` (`index.rs`) et `MAP_SCHEMA_VERSION` (`map/store.rs`)
    sont deux constantes indépendantes qui doivent toujours être bumpées
    ensemble.** Elles décrivent le même `PRAGMA user_version`, comparé dans
    `BrainIndex::open_existing`. Les désynchroniser fait refuser **tout**
    index comme `IndexIncompatible` — découvert par 68 tests rouges avant
    correction. Si un futur schéma bump se prépare, chercher les deux.
  - **`identity.rs` a délibérément sa propre copie de `fnv1a64`** plutôt que
    d'importer celle de `map::fnv1a64` : `scanner.rs`/`index.rs` sont des
    modules cœur dont `map/` dépend, jamais l'inverse. Ne pas « déduplicer »
    en important dans le mauvais sens.
  - **Un `NodeIdentity` ne voyage jamais dans `NodeDto`.** C'est le choix
    qui a évité de toucher les 34 sites `NodeDto { .. }` existants :
    `ScanResult.identities` est un `Vec` parallèle, aligné par l'id
    temporaire du scanner, consommé seulement par `publish_with_identity`.
    Ne pas ajouter `stable_key`/`identity_provenance` à `NodeDto` pour une
    future tâche sans relire pourquoi ce choix a été fait ici.
  - **`read_next_node_id` s'auto-amorce depuis `MAX(id) + 1` si la clé
    `next_node_id` est absente.** Nécessaire parce qu'une republication peut
    passer par `BrainIndex::open_existing`, qui ne migre jamais (contrairement
    à `Index::open`) — `legacy_binding_tests.rs` l'exerçait déjà sans le
    savoir avant cette tâche.
  - **`seen` est maintenant porté par DEUX mécanismes, jamais un seul :** par
    `relative_path` (historique, inchangé) **et**, seulement en mode
    identité, par l'id canonique précédent d'une clé reconnue — union, jamais
    remplacement. Un renommage `SYSTEM` conserve `seen`; un renommage
    `PATH_FALLBACK` ne le récupère pas — la limite honnête que `DEC-0009`
    attend explicitement du repli. Ne pas « corriger » ce cas en cherchant à
    faire porter `seen` par chemin pour le mode identité aussi : ce serait
    exactement l'heuristique par ressemblance que `DEC-0009` interdit.
  - **Piège découvert en écrivant `cargo fmt --check` :** invoquer `rustfmt`
    directement sur un fichier qui `mod`-déclare le reste de l'arbre (par
    exemple `lib.rs`) reformate en réalité **tout le crate atteignable**, pas
    seulement ce fichier. Un premier passage a ainsi reformaté 14 fichiers
    hors du périmètre de cette tâche (débit de formatage historique) — annulé
    avant commit avec `git restore --source=HEAD`. Pour formater seulement ce
    qu'une tâche touche : passer les fichiers réellement modifiés à `rustfmt`
    directement, puis vérifier par `git status` qu'aucun autre fichier n'a
    bougé avant de committer.
  - `scripts/task0036-seed-proof.py` + `task0036-webview2.mjs`/`.ps1` sont
    un nouveau harnais, plus léger que `TASK-0034`/`0035` : **un seul
    lancement réel, zéro redémarrage** — l'identité de nœud doit survivre à
    une republication, pas à un redémarrage de processus. Le script Node
    renomme/déplace/supprime des fichiers réels **directement avec
    `node:fs`**, entre deux clics réels sur `Actualiser` de la même session.
  - **`map_copy_node_path` a échoué en environnement automatisé** (fenêtre
    cachée, `clipboard_write_failed`) — sans lien avec l'identité, un défaut
    d'accès presse-papiers hors focus déjà possible avant cette tâche. Le
    rejeu l'encaisse dans un `try`/`catch` et le consigne plutôt que
    d'échouer tout le script; `copyStillSucceeds: false` est visible dans
    l'artefact, documenté comme limite, pas caché.
- **Ce qui reste ouvert :** `cargo clippy` strict rouge à 26 erreurs, même
  compte qu'avant cette tâche (zéro nouveau diagnostic dans les fichiers
  touchés). Aucun watcher, aucun incrémental, aucun FTS5, aucun filtre,
  déplacement inter-volume non testé (écrire hors dépôt requis), identité
  après hydratation cloud contournée plutôt que mesurée, `seen` non rejoué
  en WebView2 (aucune UI/commande `seen` exposée par le produit — prouvé au
  niveau Rust sur Windows réel à la place).
- **Action unique suivante :** contrôle indépendant de `TASK-0036`, sur les
  preuves de cette tranche.

## Relais précédent — TASK-0035, V1 Context Panel livrée, en attente de contrôle — 2026-09-11

- **Ce qui vient d'être fait :** `TASK-0034` était déjà `VERIFIED` dans sa
  portée par `ACTION-0055` (déjà sur la branche précédente, mais dont les
  documents durables n'avaient jamais été synchronisés — corrigé au
  passage, aucun contenu technique changé). `TASK-0035 — V1 Context Panel,
  Direct Children & Safe Copy` est livrée sur
  `build/v0.2-a19-v1-context-panel` : `IMPLEMENTED`, jamais
  auto-`VERIFIED`. Aucune nouvelle DEC.
- **Le geste central :** trois compléments MVP indépendants du moteur
  topographique. Une préférence persistée (`details_panel_visible`) dans
  `catalog_meta`, exactement comme `active_brain_id`. Une commande dédiée,
  `map_node_children`, qui donne au panneau de détails une page **exacte et
  paginée** des enfants directs — indépendante de la projection visuelle
  bornée que `detail.children` porte depuis toujours. Une nouvelle
  dépendance auditée avant ajout, `tauri-plugin-clipboard-manager`, pour
  « Copier le chemin », qui partage sa résolution/confinement avec
  `map_reveal_node` plutôt que de la dupliquer.
- **Qui a fait quoi :** Claude Code a écrit la tranche entière. **Il ne
  peut pas rendre le verdict.**
- **Ce que le prochain relais doit savoir :**
  - **`resolve_confined_target()` (`commands.rs`) est maintenant le seul
    endroit qui résout un `BrainNodeRef` vers un chemin réel confiné** —
    extraite de `reveal_node()`, qui l'appelle elle-même désormais, et
    partagée par `copy_target_path()`. Ne pas réintroduire une seconde
    marche de résolution/confinement pour une future action sur un
    `BrainNodeRef` : étendre celle-ci ou en discuter d'abord.
  - **`copy_target_path()` convertit le chemin confiné avec `Path::to_str()`,
    jamais `to_string_lossy()`.** `DEC-0033` C interdit la conversion avec
    perte pour résoudre une source, et une conversion silencieusement
    lossy aurait aussi trahi l'exigence `TASK-0035` C d'un chemin copié
    exact pour un nom Unicode. Un composant non représentable est refusé
    explicitement, jamais substitué.
  - **`tauri-plugin-clipboard-manager` est initialisé côté Rust seulement,
    exactement comme le plugin de dialogue (`DEC-0033` H).** Son propre
    fichier `permissions/default.toml` déclare `permissions = []` : aucune
    de ses commandes frontend n'est jamais accordée. Ne jamais ajouter
    `clipboard-manager:*` à `capabilities/default.json` — un test
    structurel dans `lib.rs` le vérifie.
  - **`map_node_children` a une borne produit (`CHILDREN_LIMIT_MAX = 50`)
    distincte de la borne défensive de la couche `hierarchy`
    (`MAX_CHILDREN_PAGE_SIZE = 500`).** Ne pas les confondre en modifiant
    l'une pour changer l'autre — même relation que `SEARCH_LIMIT_MAX` avec
    la couche `Index::query_nodes()`.
  - **`DetailsPanel`'s « Enfants directs » ne lit plus jamais
    `detail.children` comme liste exhaustive** — seulement `childrenPage`.
    `detail.children` reste dans le DTO (la projection bornée en a encore
    besoin ailleurs) mais n'alimente plus cette section : ne pas revenir en
    arrière en cas de refactor futur du panneau.
  - **`toggleDetailsPanel()` doit rester étroit.** Un test structurel
    (`contextPanel.test.ts`) vérifie que son corps ne référence aucun autre
    setter d'état (`setSelected`, `setSearchQuery`, `setComposed`, etc.) —
    masquer/réafficher ne doit jamais acquérir d'effet de bord sur un autre
    concern.
  - `scripts/task0035-seed-proof.py` réutilise l'arbre `REAL_ROOT` de
    `TASK-0034` (dérivé, pas partagé littéralement — la tâche précédente
    est déjà `VERIFIED`, on ne rouvre pas son script). La branche plate `C`
    à 4 356 enfants directs, déjà présente pour la recherche, sert
    maintenant aussi la pagination des enfants.
  - **Piège de harnais découvert en écrivant le rejeu :** sélectionner un
    nœud par un clic à coordonnées SVG sur sa carte de la carte composée
    (`Input.dispatchMouseEvent` au centre de `getBoundingClientRect()`) —
    le mécanisme que `task0033-webview2.mjs` utilise ailleurs avec succès —
    n'a pas fonctionné ici pour sélectionner `C` (la sélection restait sur
    la racine). Remplacé par une navigation clavier réelle dans la liste
    d'enfants dédiée du nœud déjà sélectionné (la racine liste déjà ses
    propres enfants directs au démarrage) : plus robuste, et une preuve
    supplémentaire que cette liste est elle-même clavier-opérable. La cause
    exacte du clic SVG manqué n'a pas été investiguée davantage.
  - `scripts/task0035-webview2.ps1` orchestre **trois lancements réels**
    du même exécutable avec **deux fermetures/redémarrages réels** entre
    eux, sur le **même** bac à sable (même `catalog.sqlite`) — nécessaire
    puisque `TASK-0035` A exige une préférence qui survit un vrai
    redémarrage, ce qu'aucune page ne peut simuler de l'intérieur. Le
    presse-papiers OS est comparé **par ce script**, juste après la
    fermeture réelle de la phase 1, jamais par le script Node piloté par
    CDP — l'artefact ne garde que le booléen de correspondance.
- **Ce qui reste ouvert :** `cargo clippy` strict rouge à 26 erreurs, dette
  inchangée. Aucun watcher, aucun incrémental, aucun FTS5, aucun filtre,
  aucune préférence d'écran/icône, aucune acceptance laptop modeste.
- **Action unique suivante :** contrôle indépendant de `TASK-0035`, sur les
  preuves de cette tranche.

## Relais précédent — TASK-0034, passe corrective 3 livrée, en attente de contrôle — 2026-09-11

- **Ce qui vient d'être fait :** le recontrôle indépendant
  [`ACTION-0054`](../reviews/ACTION-0054-independent-recontrol.md) a
  confirmé que la passe précédente fermait bien la saisie et le changement
  de cerveau pour `onFocusBrain`, `selectNode` et `changeProjection`, mais a
  trouvé un dernier chemin non couvert : `removeBrain()` (transfert de
  focus quand le cerveau focalisé est retiré) et `navigateCross`
  (composition focalisée sur un cerveau pas encore affiché) passent par la
  porte commune `applyComposition(next, ...)` sans jamais passer par ces
  trois handlers. Cette passe ferme ce dernier verrou, sur la même branche
  `build/v0.2-a18-v1-find-open`. `TASK-0034` reste `IMPLEMENTED`, jamais
  auto-`VERIFIED`. Aucune nouvelle DEC.
- **Le geste central :** un garde unique, à la frontière commune, plutôt
  qu'une invalidation ajoutée à chaque nouvel appelant trouvé. Au tout
  début d'`applyComposition`, juste après `const current =
  composedRef.current;`, avant `nextKey`, avant toute mutation de
  composition et avant le premier `await` :
  `if (current && current.focusedBrainId !== next.focusedBrainId)
  searchCoordinator.invalidate();`. Une transition à focus identique
  (Ouvrir/Actualiser/Reconstruire sur la composition affichée, ajout d'un
  cerveau qui ne déplace jamais le focus) n'invalide rien.
- **Qui a fait quoi :** Claude Code a écrit la correction et les preuves.
  **Il ne peut pas rendre le verdict.**
- **Ce que le prochain relais doit savoir :**
  - **Le garde central d'`applyComposition` et les invalidations directes
    de la passe précédente (`onFocusBrain`/`selectNode`/`changeProjection`)
    couvrent deux ensembles de chemins DIFFÉRENTS, pas le même deux fois.**
    Les trois handlers mutent `composed` via `setComposed(...)` directement
    — ils ne passent jamais par `applyComposition`. Le nouveau garde
    couvre tout ce qui passe par `applyComposition` — `onAddBrain`,
    `onRemoveBrain`, `navigateCross`, Ouvrir/Actualiser/Reconstruire,
    `singleBrainView`. **Ne retirer ni l'un ni l'autre** : chacun est la
    seule protection de son propre ensemble de chemins.
  - **Tout nouvel appelant d'`applyComposition` est protégé automatiquement,
    sans rien ajouter.** C'est le point de la correction centrale plutôt
    que par appelant : une future transition de composition qui change de
    focus n'a besoin d'aucun code d'invalidation supplémentaire, tant
    qu'elle passe par `applyComposition(next, ...)`.
  - **Le garde doit rester avant le premier `await` de la fonction.** Il
    est actuellement juste après la lecture de `current`, avant `nextKey`.
    Le déplacer après un `await` (par exemple après la boucle de
    chargement des cerveaux) réintroduirait exactement la fenêtre
    événement → async qu'`ACTION-0053`/`ACTION-0054` ont fait fermer.
  - `src/map/searchCoordinator.test.ts` porte maintenant 23 tests : les 18
    des passes précédentes, inchangés, plus 5 nouveaux — invalidation avant
    effet suivant pour une transition à focus changeant (cas `removeBrain`,
    simulé au niveau du coordinateur puisqu'aucun test de ce dépôt ne monte
    `MapApp` en entier), absence d'invalidation pour une transition à focus
    identique, verrou structurel sur la position du garde avant le premier
    `await`, et deux vérifications structurelles que `onRemoveBrain`/
    `navigateCross` acheminent bien leurs transitions par cette porte.
  - Le rejeu WebView2 n'a pas changé et a été rejoué à l'identique — non
    adversarial : le prompt de cette passe dispense explicitement de
    fabriquer une course dans WebView2 pour ce verrou, l'autorité restant
    la suite TypeScript déterministe. Vérifié par exécution directe des
    deux commandes internes (`python`, puis `node`) avec codes de sortie
    capturés séparément, tous deux à 0.
- **Ce qui reste ouvert :** identique à la livraison précédente — `cargo
  clippy` strict rouge à 26 erreurs, dette inchangée (aucun fichier Rust
  touché par cette passe). Aucun watcher, aucun incrémental, aucun FTS5,
  aucune acceptance laptop modeste, aucune copie de chemin absolu, aucune
  préférence d'écran/icône.
- **Action unique suivante :** nouveau contrôle indépendant de `TASK-0034`,
  sur les preuves de cette passe.

## Relais précédent — TASK-0034, passe corrective 2 livrée, en attente de contrôle — 2026-09-11

- **Ce qui vient d'être fait :** le recontrôle indépendant
  [`ACTION-0053`](../reviews/ACTION-0053-independent-recontrol.md) a
  confirmé que `SearchCoordinator` (passe précédente) fermait bien la
  course une fois qu'une nouvelle recherche avait effectivement commencé,
  mais a trouvé deux verrous plus fins dans son câblage : l'invalidation
  n'arrivait qu'au prochain `useEffect`, pas au moment de l'événement; et
  la comparaison d'identité utilisait la requête brute, pas la forme que le
  backend normalise. Cette passe corrige les deux, sur la même branche
  `build/v0.2-a18-v1-find-open`. `TASK-0034` reste `IMPLEMENTED`, jamais
  auto-`VERIFIED`. Aucune nouvelle DEC.
- **Le geste central :** appeler `searchCoordinator.invalidate()`
  **synchrone, dans la même pile d'appel que l'action qui change
  l'intention** — jamais seulement depuis l'effet React qui en réagit sur
  un rendu ultérieur. Concrètement : un nouveau `updateSearchQuery(value)`
  câblé à l'`onChange` du champ (invalide puis `setSearchQuery`, dans cet
  ordre), et la même invalidation ajoutée à `onFocusBrain`, `selectNode` et
  à la branche de `changeProjection` qui change réellement le cerveau
  focalisé (conditionnelle là, pour ne pas annuler une recherche sans
  rapport quand cette fonction ne fait que réafficher le cerveau déjà
  focalisé — le cas d'une activation de résultat de recherche).
- **Le second geste :** `canonicalizeSearchQuery()`, nouvelle fonction pure
  dans `searchCoordinator.ts`, applique exactement la même normalisation
  que le backend (`trim()` + 200 points de code Unicode, via `Array.from`
  pour ne jamais couper une paire de substituts en deux) à la requête
  **avant** qu'elle devienne l'identité vérifiée — le champ affiché à
  l'écran reste la valeur brute telle que tapée.
- **Qui a fait quoi :** Claude Code a écrit la correction et les preuves.
  **Il ne peut pas rendre le verdict.**
- **Ce que le prochain relais doit savoir :**
  - **`searchCoordinator.invalidate()` doit toujours être appelé de façon
    synchrone, dans le même gestionnaire d'événement ou la même
    continuation que l'action qui change l'intention de recherche — jamais
    seulement depuis un `useEffect` qui réagit à l'état résultant.** C'est
    exactement le verrou 1 qu'`ACTION-0053` a trouvé : un `useEffect`
    s'exécute sur un rendu ultérieur, après que l'événement soit retourné;
    une promesse déjà en vol peut se résoudre dans cette fenêtre et tenir
    encore le ticket le plus récent.
  - **`searchCoordinator` est déclaré avec les autres refs, près du haut du
    composant** — pas près de `runSearch` où il vivait avant — précisément
    pour être utilisable par `onFocusBrain`/`selectNode`/`changeProjection`,
    définies plus tôt dans le fichier.
  - **`changeProjection` n'invalide que si le cerveau change réellement**
    (`current.focusedBrainId !== brainId`). Cette branche est aussi
    empruntée par l'activation d'un résultat de recherche dans le cerveau
    déjà focalisé (le cas courant) : y invalider sans condition annulerait
    une recherche sans rapport avec la navigation en cours.
  - **Toute requête envoyée au coordinateur/à l'IPC doit passer par
    `canonicalizeSearchQuery()` d'abord.** Le champ affiché, lui, ne l'est
    jamais — ne pas confondre les deux valeurs.
  - `src/map/searchCoordinator.test.ts` porte maintenant 18 tests : les 8
    de la passe précédente, inchangés, plus 10 nouveaux — invalidation
    avant lancement de la recherche suivante (requête et cerveau), rejet
    d'un offset de réponse incorrect, câblage des quatre points
    d'invalidation synchrone et de la canonicalisation, et
    `canonicalizeSearchQuery` elle-même (espaces de bord, idempotence,
    troncature à 200, points de code hors plan de base).
  - Le rejeu WebView2 (`scripts/task0034-webview2.mjs`/`.ps1`) n'a pas
    changé et a été rejoué à l'identique — non adversarial, comme la passe
    précédente : SQLite y est trop rapide pour fiablement fabriquer la
    course sans ralentir le produit lui-même. Un premier appel via le
    script `.ps1` d'enveloppe a rendu un code de sortie 1 pour une raison
    non liée à la preuve; l'exécution directe des deux commandes internes
    (`python`, puis `node`) a confirmé séparément un code 0 pour chacune et
    une preuve complète et identique.
- **Ce qui reste ouvert :** identique à la livraison précédente — `cargo
  clippy` strict rouge à 26 erreurs, dette inchangée (aucun fichier Rust
  touché par cette passe). Aucun watcher, aucun incrémental, aucun FTS5,
  aucune acceptance laptop modeste, aucune copie de chemin absolu, aucune
  préférence d'écran/icône.
- **Action unique suivante :** nouveau contrôle indépendant de `TASK-0034`,
  sur les preuves de cette passe.

## Relais précédent — TASK-0034, passe corrective livrée, en attente de contrôle — 2026-09-10

- **Ce qui vient d'être fait :** le contrôle indépendant
  [`ACTION-0052`](../reviews/ACTION-0052-independent-control.md) a trouvé un
  défaut bloquant dans la livraison précédente de `TASK-0034` : une réponse
  de recherche asynchrone devenue obsolète pouvait remplacer la recherche
  courante. Cette passe le corrige, sur la même branche
  `build/v0.2-a18-v1-find-open`. `TASK-0034` reste `IMPLEMENTED`, jamais
  auto-`VERIFIED`. Aucune nouvelle DEC.
- **Le geste central :** un ticket monotone. `src/map/searchCoordinator.ts`
  (`SearchCoordinator` + `runCoordinatedSearch()`) est une primitive pure,
  sans React ni Tauri, que `MapApp.tsx::runSearch` appelle plutôt que
  d'appliquer une réponse `invoke()` directement. Seule la requête encore la
  plus récente au moment où elle se résout peut publier une page, une
  erreur ou `loading=false` — et elle doit en plus nommer le bon
  `brainId`/`query` et la bonne révision.
- **Qui a fait quoi :** Claude Code a écrit la correction et les preuves.
  **Il ne peut pas rendre le verdict.**
- **Ce que le prochain relais doit savoir :**
  - **`searchCoordinator.ts` est la seule porte pour appliquer une réponse
    de recherche.** Ne jamais réintroduire un `setSearchPage(page)` direct
    dans `MapApp.tsx` après un `invoke("map_search_nodes", ...)` — c'est
    exactement le défaut qu'`ACTION-0052` a trouvé.
  - **La branche requête-vide de l'effet de recherche et `clearSearch()`
    doivent toutes deux appeler `searchCoordinator.invalidate()`** — ni
    l'une ni l'autre ne relance jamais `runSearch`, donc rien d'autre
    n'invaliderait une requête déjà en vol au moment où le champ se vide.
  - **Le garde de révision d'`activateSearchHit()` reste une défense
    supplémentaire, jamais le garde principal.** Le garde principal est
    maintenant dans `runCoordinatedSearch` lui-même, avant toute
    publication.
  - `src/map/searchCoordinator.test.ts` prouve l'ordre inversé (deux
    requêtes, réponses résolues 2 puis 1), un changement de cerveau en vol,
    un `Effacer` en vol et un changement de révision en vol — tous avec des
    promesses résolues à la main (`deferred<T>()`), sans dépendre de la
    vitesse réelle de SQLite. Un test de câblage (même convention que
    `lifecycle.test.ts`, texte source de `MapApp.tsx` via `?raw`) vérifie
    que `runSearch` délègue bien à `runCoordinatedSearch`.
  - `scripts/task0034-webview2.mjs` porte maintenant deux scénarios courts
    supplémentaires (frappe rapide en deux temps; Effacer juste après une
    frappe) — des vérifications de non-régression en conditions réelles,
    **pas** une preuve adversariale : ne pas ralentir artificiellement le
    backend produit pour en fabriquer une, l'autorité de l'ordre inversé
    reste la suite déterministe TypeScript.
- **Ce qui reste ouvert :** identique à la livraison précédente — `cargo
  clippy` strict rouge à 26 erreurs, dette inchangée (aucun fichier Rust
  touché par cette passe). Aucun watcher, aucun incrémental, aucun FTS5,
  aucune acceptance laptop modeste, aucune copie de chemin absolu, aucune
  préférence d'écran/icône.
- **Action unique suivante :** nouveau contrôle indépendant de `TASK-0034`,
  sur les preuves de cette passe.

## Relais précédent — TASK-0034 livrée, en attente de contrôle — 2026-09-10

- **Ce qui vient d'être fait :** `TASK-0033` était déjà `VERIFIED` dans sa
  portée par `ACTION-0051` (déjà sur la branche précédente, mais dont les
  documents durables n'avaient jamais été synchronisés — corrigé au
  passage, aucun contenu technique changé). `TASK-0034 — V1 Find & Open`
  est livrée sur `build/v0.2-a18-v1-find-open` : `IMPLEMENTED`, jamais
  auto-`VERIFIED`. Aucune nouvelle DEC.
- **Le geste central :** deux commandes raccordées au runtime convergé,
  `map_search_nodes` (recherche bornée à 50, sur `Index::query_nodes()`
  existant, jamais dupliqué) et `map_reveal_node` (« Ouvrir dans
  l'Explorateur », **seul** argument `BrainNodeRef`). L'activation d'un
  résultat de recherche réutilise `changeProjection`/`map_view` tels quels —
  aucune nouvelle logique de caméra n'a été écrite, celle de `TASK-0033`
  gère déjà tout ce qu'il fallait.
- **Qui a fait quoi :** Claude Code a écrit la tranche entière. **Il ne peut
  pas rendre le verdict.**
- **Ce que le prochain relais doit savoir :**
  - **`confine_indexed_target()` (`commands.rs`) est l'unique porte entre un
    `relative_path` indexé et le disque.** Elle revalide chaque composante
    contre un lien/point d'analyse et refuse toute cible absente — ne jamais
    contourner cette fonction pour un raccourci de confort.
  - **`explorer_argument()` est délibérément séparée de `reveal_node()`**
    pour rester testable sans lancer de processus — un test qui appellerait
    `reveal_node()` en entier spawnerait une vraie fenêtre Explorer à chaque
    `cargo test`. Ne pas fusionner les deux.
  - **La recherche ne doit jamais appeler `Index::query_nodes()` avec une
    requête vide.** Sa clause `WHERE` traite `''` comme « tout » pour
    d'autres appelants légitimes (la file de révision legacy); `search_nodes`
    court-circuite avant l'appel pour une requête vide/blanche.
  - **Piège de harnais découvert en écrivant le rejeu :** appeler
    `map_refresh`/`map_rebuild` directement depuis un script de preuve, en
    plus du clic UI qui l'a déjà déclenché, avance la révision côté backend
    **sans que l'état React de l'application ne le sache** (celui-ci
    n'apprend une nouvelle révision que par ses propres appels internes).
    Un futur rejeu qui a besoin d'un rapport de build doit le lire via
    `map_view` (lecture seule), jamais via un second `map_refresh`/
    `map_rebuild` direct.
  - `scripts/task0034-seed-proof.py` + `task0034-webview2.mjs`/`.ps1`
    réutilisent l'arbre `REAL_ROOT` à quatre branches de `TASK-0033`, avec un
    nom de fichier fixe (`cible-recherche-unique.txt`, sous `C/`) ajouté
    comme cible de recherche connue.
  - L'invocation « Ouvrir dans l'Explorateur » du rejeu est un appel direct,
    pas un clic UI en plus : cela évite un second spawn `explorer.exe`
    visible pour le même fait. Une fenêtre Explorer réelle **peut rester
    ouverte** après un rejeu — ne jamais la fermer en tuant `explorer.exe`
    globalement.
- **Ce qui reste ouvert :** `cargo clippy` strict rouge à 26 erreurs, dette
  inchangée. Aucun watcher, aucun incrémental, aucun FTS5, aucune
  acceptance laptop modeste (poste de développement seulement), aucune
  copie de chemin absolu, aucune préférence d'écran/icône.
- **Action unique suivante :** contrôle indépendant de `TASK-0034`, sur les
  preuves de cette passe.

## Relais précédent — TASK-0033, acceptation WebView2 faite, en attente de contrôle — 2026-09-10

- **Ce qui vient d'être fait :** `ACTION-0050` avait contrôlé `TASK-0033` et
  trouvé le code cohérent avec `DEC-0034`, mais **le rejeu produit WebView2
  obligatoire manquait**. Cette passe l'exécute : arborescence `REAL_ROOT`
  synthétique de 5 206 éléments, quatre branches délibérément déséquilibrées,
  pilotée en WebView2 réel à 1366×768 puis 1920×1080. `TASK-0033` reste
  `IMPLEMENTED`, jamais auto-`VERIFIED`.
- **Le rejeu a trouvé un vrai défaut, corrigé dans la portée de la tâche :**
  la vue ordinaire continuait, après les enfants directs du focus, à
  paginer récursivement les enfants du **premier** enfant rencontré tant
  que la cible de 64 n'était pas atteinte — un reliquat d'avant `DEC-0034`.
  Sur un dossier au premier rang avec un gros sous-arbre, cela consommait
  presque toute la cible sur une seule branche arbitraire, masquant les
  vraies branches soeurs de la vue racine. **Ne jamais réintroduire cette
  expansion automatique multi-niveaux.** `materialize_view` ne doit paginer
  que les enfants directs du focus; descendre d'un niveau est toujours une
  navigation explicite (`DEC-0034` C), jamais un effet de bord de la vue du
  parent.
- **Un second défaut, dans la caméra :** `.map-view` peut grandir après le
  premier positionnement (le panneau latéral se remplit de données réelles
  de façon asynchrone, changeant la hauteur de rangée de la grille
  `.app__main`); rien ne réappliquait alors les bornes de la caméra à la
  nouvelle taille, laissant la vue échouée hors du canevas visible. **Un
  effet dédié réapplique désormais `clampView` à chaque changement de
  dimensions du viewport — ne jamais confondre ceci avec un recentrage : il
  ne fait que garder le pan/zoom existant valide, jamais n'en calcule un
  nouveau.**
- **Qui a fait quoi :** Claude Code a exécuté le rejeu et les deux
  corrections. **Il ne peut pas rendre le verdict.**
- **Ce que le prochain relais doit savoir :**
  - `scripts/task0033-seed-proof.py` + `task0033-webview2.mjs`/`.ps1` sont
    le harnais réutilisable pour tout futur rejeu produit de la topographie.
    Noms de dossiers volontairement très courts (`A`, `B`, `C`, `D`,
    `t`) : au-delà d'une quinzaine de niveaux, un chemin absolu réaliste
    dépasse vite `MAX_PATH` (260 caractères) sous Windows sans support des
    chemins longs.
  - Le redimensionnement du rejeu utilise `Emulation.setDeviceMetricsOverride`
    (CDP), pas `Browser.setWindowBounds` : ce dernier n'est pas garanti
    disponible sur la session CDP scoped-page de WebView2.
  - Quatre tests préexistants (`commands.rs`, `cross_commands.rs`,
    `relation_commands.rs`) obtenaient l'id d'un chemin imbriqué via la vue
    par défaut (désormais trop étroite pour l'atteindre). Corrigés pour
    naviguer explicitement (`resolve_by_path`/`source_id` par segment) au
    lieu de changer le contrat produit qu'ils testaient par ailleurs.
  - L'incohérence documentaire qu'`ACTION-0050` avait signalée
    (« `fitView` reste utilisé à la première ouverture ») est corrigée ici
    et dans la fiche `TASK-0033` : c'est `readableView` depuis la livraison
    initiale.
- **Ce qui reste ouvert :** `cargo clippy` strict rouge à 26 erreurs, dette
  inchangée. Palette de relations par direction non reprise. Aucun watcher,
  aucun incrémental, aucun FTS5, aucune identité physique, aucune
  acceptance laptop modeste (poste de développement seulement).
- **Action unique suivante :** nouveau contrôle indépendant de `TASK-0033`,
  sur les preuves de cette passe.

## Relais précédent — TASK-0033 livrée, en attente de contrôle — 2026-09-10

- **Ce qui vient d'être fait :** `TASK-0032` était déjà `VERIFIED` dans sa
  portée par `ACTION-0049` (déjà sur la branche avant cette session, mais dont
  les documents durables n'avaient jamais été synchronisés — corrigé au
  passage, aucun contenu technique changé). `TASK-0033 — V1 Progressive
  Topographic UX` est livrée sur `build/v0.2-a17-v1-topographic-ux` :
  `IMPLEMENTED`, jamais auto-`VERIFIED`. `DEC-0034` reste `APPROVED`,
  inchangée.
- **Le geste central :** une projection ordinaire vise désormais **64 vrais
  blocs**, dossiers d'abord, au lieu de remplir jusqu'à 256. Aucun nouveau tri
  n'a été écrit — `idx_nodes_child_order` triait déjà chaque page
  dossiers-avant-fichiers depuis `DEC-0030`; remplir une cible plus petite
  suffit à faire gagner les dossiers. `VIEW_BUDGET`/`MATERIAL_BUDGET`
  restent les seules bornes dures.
- **Le second geste :** la caméra ne réduit plus toute la carte à chaque
  changement de projection. `fitView(world, …)` était appelé à chaque
  navigation de branche, dépliage d'agrégat et actualisation — c'est le défaut
  que `DEC-0034` E visait. **`fitView` ne reste que sur l'action explicite
  Ajuster à l'écran** (et le raccourci `f`/`F` sur la sélection); partout
  ailleurs, `recenterOnFocus` pan minimal sans jamais changer l'échelle. La
  **première ouverture d'une composition et Réinitialiser utilisent
  `readableView`** (échelle `1`, jamais un fit exhaustif), pas `fitView`.
- **Qui a fait quoi :** Claude Code a écrit la tranche entière. **Il ne peut
  pas rendre le verdict.**
- **Ce que le prochain relais doit savoir :**
  - **`ORDINARY_MATERIAL_TARGET` (64) n'est pas `VIEW_BUDGET`/`MATERIAL_BUDGET`.**
    Le premier est une cible produit dans `projection.rs`; les deux autres
    restent les bornes de sécurité inchangées. Ne pas les confondre en
    modifiant l'un pour changer l'autre.
  - **La priorité dossier-first vient de la base, pas de `projection.rs`.**
    `child_order_rank` (colonne générée, `hierarchy.rs`) classe les dossiers
    avant les fichiers dans chaque page. `materialize_view` n'a **aucun** tri
    à faire : il lui suffit de remplir une cible plus petite pour que les
    dossiers l'emportent. Si un jour la priorité doit changer, c'est là qu'il
    faut regarder en premier.
  - **`readableView`/`recenterOnFocus` (`viewState.ts`) sont les deux seules
    fonctions qui doivent toucher la caméra en dehors d'une action explicite.**
    Ne pas réintroduire `fitView(world, …)` dans un effet déclenché par un
    changement de projection : c'est exactement le défaut corrigé ici.
  - **L'agrégat est un `<g data-aggregate>` avec une pastille
    `.map-aggregate__pill`, pas un `<rect>` de la taille d'une carte.** Le
    créneau (`a.rect`) reste plein-carte pour que le layout ne superpose rien;
    seul le dessin est réduit. `aggregateLabel()` (`MapView.tsx`) est la
    **seule** source du texte visible — ne jamais réintroduire
    `omittedDirectChildren` brut ou `reason` dans un libellé produit.
  - **Aucun rejeu WebView2 n'a été fait dans cette passe.** C'est une limite
    déclarée, pas un oubli caché : la lisibilité produit sur un vrai volume
    (vrais noms, absence de chevauchement, comportement de la caméra en usage
    réel) reste à prouver avant tout `VERIFIED`.
- **Ce qui reste ouvert :** `cargo clippy` strict rouge à 26 erreurs, dette
  inchangée. Palette de relations par direction non reprise. Aucun watcher,
  aucun incrémental, aucun FTS5, aucune identité physique, aucun
  « Ouvrir dans l'Explorateur », aucune acceptance de performance sur grande
  racine.
- **Action unique suivante :** contrôle indépendant de `TASK-0033`.

## Relais précédent — TASK-0032 corrigée, en attente d'un nouveau contrôle — 2026-09-10

- **Ce qui vient d'être fait :** le contrôle indépendant de `TASK-0032` a trouvé
  **deux défauts bloquants**. Les deux étaient réels; les deux sont corrigés sur
  la même branche, `build/v0.2-a16-v1-real-root`. `TASK-0032` reste
  `IMPLEMENTED`, **jamais auto-`VERIFIED`**; `DEC-0033` reste `APPROVED`,
  corrigée en `D`, `H` et `I`.
- **Défaut A, corrigé :** `dialog:allow-open` n'accordait pas « le sélecteur
  qu'utilise notre commande ». Elle accordait `plugin:dialog|open`, la commande
  **frontend** du plugin, qui accepte un `defaultPath` venu de la page et lui
  retourne les chemins choisis. La capacité porte désormais `core:default` et
  rien d'autre.
- **Défaut B, corrigé :** `publish_map` utilisait `open_store` en pré-contrôle,
  donc un index écrit par `TASK-0031` — sans binding — était refusé partout et
  bloqué pour toujours, alors que `DEC-0033` D promettait sa republication.
- **Qui a fait quoi :** Claude Code a écrit la tranche **et** sa passe
  corrective. **Il ne peut pas rendre le verdict.**
- **Ce que le prochain relais doit savoir :**
  - **Ne jamais rajouter `dialog:allow-open`.** Le plugin doit rester
    initialisé côté Rust — `app.dialog()` en dépend — mais sa commande frontend
    ne doit jamais être autorisée. Une capacité ne gouverne que les commandes
    atteignables depuis le WebView; elle ne gouverne pas `app.dialog()` appelé
    depuis l'hôte, ce qui a été vérifié sur les sources installées de
    `tauri-plugin-dialog 2.7.2`, dont le `FileDialogBuilder` ne porte aucun
    contrôle de permission.
  - **Trois portes distinctes, à ne pas refondre en une :** `open_for_brain`
    (appartenance), `open_store` (appartenance + binding courant, exigé par
    toute lecture de corpus) et `check_publishable` (appartenance + binding
    courant **ou** la voie legacy étroite). Rebrancher `publish_map` sur
    `open_store` reproduirait exactement le défaut B.
  - **La voie legacy est interdite aux `REAL_ROOT`,** et ce n'est pas une
    précaution décorative : aucune racine réelle n'existait avant `DEC-0033`,
    donc un index sans binding sous un `REAL_ROOT` n'est pas ancien, il est
    faux. `B3` échoue si quelqu'un l'élargit.
  - **Le binding est la paire** `source_kind` + `source_ref`. Vérifier le seul
    identifiant laisse passer le cas que `B4` couvre.
  - `legacy_binding_tests.rs` **écrit les douze clés** de métadonnée d'un index
    `TASK-0031`. Si un jour la forme change, ce tableau doit changer avec elle,
    sans quoi le test prouverait la compatibilité d'un fichier qui n'existe pas.
  - `scripts/task0032-webview2.ps1` prouve maintenant aussi la frontière de
    permission : trois `invoke` directs de commandes du plugin, refusés, sans
    ouvrir de dialogue et sans passer de chemin réel.
- **Ce qui reste ouvert :** `R-T30-1` clippy strict rouge à 26 erreurs.
  `R-T30-3`, `R-T30-4`, `R-T30-6` et `R8` ouvertes. `R-T30-5` traitée
  **uniquement** dans la portée `REAL_ROOT` de test. L'appel Rust au dialogue
  natif n'est pas exercé à l'exécution. Un index legacy dont la fixture a été
  renommée n'est pas republiable et doit être reconstruit. Aucun watcher, aucun
  incrémental, aucun FTS5, aucune identité physique, aucun redesign, aucune
  acceptance de performance sur grande racine. Dette `Registry`/`legacy_store`
  non supprimée.
- **Action unique suivante :** contrôle indépendant de `TASK-0032`, sur la
  version corrigée.

## Relais précédent — TASK-0032, première livraison — 2026-09-10

- **Ce qui vient d'être fait :** FileTopo peut recevoir un **vrai dossier
  local**, choisi explicitement par la personne, sans jamais faire sortir son
  chemin du catalogue local et sans rien lire tant que personne n'a pressé
  **Indexer**. `TASK-0032 = IMPLEMENTED`, **jamais auto-`VERIFIED`**;
  [DEC-0033](../decisions/DEC-0033-real-root-privacy-and-source-binding.md) est
  `APPROVED`. Branche `build/v0.2-a16-v1-real-root`, gel `c3507bf` parent
  direct du premier commit de code.
- **Aucune donnée personnelle n'a été utilisée**, et aucune n'est demandée. Le
  vrai cerveau de Sébastien reste un point d'arrêt qui lui est réservé.
- **Qui a fait quoi :** Claude Code a écrit la tranche entière. **Il ne peut
  pas rendre le verdict.** Le contrôle doit venir d'une instance distincte.
- **Ce que le prochain relais doit savoir :**
  - Le contrat vit dans `DEC-0033` et se lit dans le code à quatre endroits :
    `map/source.rs` pour la validation de racine et la résolution,
    `map/brains.rs` pour le stockage `BLOB` et la migration, `path_codec.rs`
    pour l'encodage exact, et `commands.rs::open_store` pour le refus de
    binding.
  - **`BrainRecord` ne doit jamais gagner un champ de chemin.** C'est le DTO
    que l'IPC sérialise, et un `PathBuf` ajouté là arriverait dans le WebView
    dès que personne ne regarderait le JSON. La seule porte est
    `BrainCatalog::real_root_path`, qui rend un type non-`Serialize`.
  - **Aucune commande exposée ne doit accepter un chemin.** Un test lit le
    texte des signatures que `generate_handler!` enregistre. `relativePath` de
    `map_resolve_node` est admis et documenté : c'est un chemin **dans l'index
    d'un cerveau**, résolu en SQL, jamais sur le disque.
  - **`source_fixture()` refuse maintenant un `REAL_ROOT`** en
    `map_source_not_synthetic`. Les fonctions synthétiques par nature —
    `integrity`, `self_check`, la préparation de fixture, les scénarios de
    relations historiques — échouent donc explicitement sur un cerveau réel.
    C'est voulu : elles comparent à un plan figé qui n'existe pas pour un vrai
    dossier. **Ne pas les « réparer » en inventant une fixture.**
  - **Le second parcours d'empreinte reste synthétique.** Sur une racine réelle
    il doublerait le coût de chaque indexation. Le rapport porte donc `null`
    et `readOnlyConfirmed = false` : c'est « aucune empreinte prise », pas
    « quelque chose a changé ». Ne pas le rebrancher sans mesurer.
  - **Un index sans `source_ref` est refusé, jamais supprimé.** Un bac à sable
    de développement antérieur à `DEC-0033` verra donc `map_source_mismatch` à
    l'ouverture; une actualisation explicite le republie. C'est le
    comportement voulu.
  - `scripts/task0032-webview2.ps1` rejoue le chemin produit dans le vrai
    hôte. Il **génère lui-même** son arbre de test et écrit la ligne
    `REAL_ROOT` par `scripts/task0032-seed-proof.py` : le dialogue natif n'est
    pas automatisé, ce que `TASK-0032` §6 autorise. Le serveur Vite doit servir
    ce dépôt sur le port 1420 avant de le lancer.
- **Ce qui reste ouvert :** `R-T30-1` clippy strict rouge, inchangée à 26
  erreurs. `R-T30-3`, `R-T30-4`, `R-T30-6` et `R8` ouvertes. `R-T30-5` traitée
  **uniquement** dans la portée `REAL_ROOT` de test. Aucun watcher, aucun
  incrémental, aucun FTS5, aucune identité physique, aucun redesign, aucune
  acceptance de performance sur grande racine. La dette
  `Registry`/`legacy_store` n'est pas supprimée : seul le codec de chemin en a
  été extrait, et sa retraite éventuelle est une tranche distincte.
- **Action unique suivante :** contrôle indépendant de `TASK-0032`.

## Relais précédent — TASK-0031, VERIFIED depuis par ACTION-0048 — 2026-09-10

- **Ce qui vient d'être fait :** la réserve `R-T30-2` est devenue une frontière
  produit. Ouvrir un cerveau lit l'index persistant et **ne scanne plus la
  source**; actualiser et reconstruire sont deux intentions explicites et
  nommées; un échec de publication laisse le dernier index fiable ouvrable.
  `TASK-0031 = IMPLEMENTED`, **jamais auto-`VERIFIED`**;
  [DEC-0032](../decisions/DEC-0032-persistent-brain-lifecycle-contract.md)
  reste `APPROVED`. Branche `build/v0.2-a15-v1-brain-lifecycle`, gel `3ac6cbf`
  parent direct du premier commit de code.
- **Qui a fait quoi :** Codex a produit l'implémentation initiale; Claude Code a
  repris le worktree en l'état, corrigé, prouvé et clôturé. **Aucun des deux ne
  peut rendre le verdict.** Le contrôle doit venir d'une instance distincte.
- **Ce que le prochain relais doit savoir :**
  - Le contrat vit dans `DEC-0032` et se lit dans le code à trois endroits :
    `BrainIndex::open_existing` pour la lecture seule, `publish_map` pour
    l'ordre refus / scan / contrôles / publication transactionnelle, et
    `src/map/lifecycle.ts` pour les trois intentions côté interface.
  - `build_map(paths, brain, rebuild)` **existe encore, mais seulement sous
    `#[cfg(test)]`**. Ne pas le rappeler dans le runtime : c'est exactement le
    scan caché que cette tranche a retiré.
  - `prepare_synthetic_source` est une commande **séparée**. Les scénarios de
    preuve préparent leur fixture eux-mêmes; aucun test ne doit être « réparé »
    en remettant une préparation ou un scan dans `open`.
  - La garde structurale `runtime_source_guard_excludes_full_snapshot_and_global_layout`
    compare désormais en **LF**. Un fichier réécrit en CRLF cassait le découpage
    et lui faisait inspecter le module de tests. Respecter `* text=auto eol=lf`.
  - `vite.config.ts` n'observe plus `.filetopo-sandbox/`. Ne pas le remettre :
    la surveillance retenait des poignées de répertoire Windows, empêchait un
    rejeu de retirer sa propre source et rechargeait la page en pleine mesure.
- **Ce qui n'est pas fait, et ne doit pas être supposé fait :** aucun watcher,
  aucune mise à jour incrémentale — `F-027`, `F-030`, `F-031` restent
  `PROPOSED`. Un index de schéma incompatible est **refusé, jamais migré** :
  écrire un contrat de staging avant d'en avoir besoin. `cargo clippy` strict
  reste rouge, `R-T30-1` inchangée. `R-T30-3`, `R-T30-4`, `R-T30-6` et `R8`
  restent ouvertes.
- **`F-050` et `F-051` restent `IMPLEMENTED`, pas `VERIFIED` globalement.**
- **Interdits inchangés :** aucune donnée réelle, aucun `REAL_ROOT`, aucun
  sélecteur de dossier réel, aucune `TASK-0032`/`DEC-0033`, aucune branche
  suivante, PR, fusion, étiquette ni release. **X5 = 36**, l'artefact
  `TASK-0031-webview2.json` reste non canonique;
  `origin/main = 1a7d652ca48281c1687f6d1404c56a1404df91d8`, inchangé.


## Relais antérieur — ACTION-0047 close, TASK-0030 VERIFIED — 2026-09-09

- **Ce qui vient d'être fait :** enregistrement du verdict indépendant sur
  `TASK-0030`. `ACTION-0047 = CLOSED`; `TASK-0030 = VERIFIED` **dans sa portée
  synthétique de convergence V1** — un index canonique par cerveau, projection
  runtime bornée, layout de la vue seulement, MapApp alimenté par cette
  projection. Exécuteur `TASK-0030` : Codex. Rédacteur de la fermeture :
  Claude Code. Autorité du verdict : orchestrateur technique indépendant.
  [Fiche de contrôle](../reviews/ACTION-0047-independent-control.md).
- **Fermeture documentaire seulement :** aucun fichier sous `src/`,
  `src-tauri/`, `scripts/` ni `docs/performance/runs/` n'a changé; aucun banc,
  rejeu WebView2 ou suite lourde n'a été relancé.
- **Ce que le prochain relais doit savoir :** six réserves restent ouvertes,
  `R-T30-1` à `R-T30-6`. La plus structurante pour la suite est **`R-T30-2`** :
  `map_open`/`build_map` rescanent et republient encore un index compatible, et
  `rebuild = false` ne veut pas encore dire « ouvrir l'index persistant sans
  rescan ». Ouvrir, actualiser et reconstruire doivent être séparés **avant**
  d'exposer une vraie racine utilisateur, sinon un cerveau réel serait rescané
  à chaque chargement et les révisions et curseurs invalidés sans nécessité.
- **`F-050` et `F-051` restent `IMPLEMENTED`, pas `VERIFIED` globalement.**
  Ne pas les promouvoir sans acceptance d'échelle et de rendu, puis intégration
  au vrai flux V1.
- **Interdits inchangés :** aucune donnée réelle, aucun sélecteur de dossier
  réel, aucune `TASK-0031`/`DEC-0032` créée, aucune branche suivante, PR,
  fusion, étiquette ni release. `X5 = 36`;
  `origin/main = 1a7d652ca48281c1687f6d1404c56a1404df91d8`, inchangé.

## Livraison contrôlée — TASK-0030 — 2026-09-09

- **Statut : `VERIFIED`** dans sa portée synthétique, livré par Codex, contrôlé
  par `ACTION-0047`.
  [Fiche et audit](../tasks/TASK-0030-v1-pipeline-convergence.md);
  [DEC-0031](../decisions/DEC-0031-one-canonical-brain-index-and-bounded-projection.md)
  reste `APPROVED`, implémentation contrôlée.
- **Branche active :** `build/v0.2-a14-v1-pipeline-convergence`; gel préalable
  `0255bd1`. `Index.nodes` devient canonique par cerveau. `MapStore` est retiré
  du runtime et conservé uniquement comme fixture historique sous `cfg(test)`.
  Métadonnées, diagnostics et révision sont publiés dans la transaction du corpus.
- **Vue produit bornée :** `map_view` fournit focus, ancêtres, enfants keyset,
  agrégats d'enfants directs exacts et géométrie calculée sur la projection.
  Budget **512 entités**, dont au plus 256 nœuds matériels et une place réservée
  par nœud pour un agrégat. `map_snapshot` reste un alias borné. Aucun layout
  global au build; la limite historique de 5000 est désormais test-only.
- **Preuves :** 100 000 nœuds indexés par le cœur produit, toutes les pages
  parcourues sans doublon ni omission; build physique synthétique de **6 001**
  nœuds, empreinte inchangée après navigation, relations, hash et rebuild.
  WebView2 **152.0.4191.66** : **12/11** nœuds/arêtes sur petite fixture;
  **256 nœuds + 1 agrégat / 255 arêtes** sur 6001 indexés; 24 keydowns fiables,
  page suivante conforme au DTO produit, zéro erreur fatale. Preuves
  [WebView2](../performance/runs/TASK-0030-webview2.json) et
  [validations](../performance/runs/TASK-0030-validation.json), non canoniques.
- **Validations :** Rust **290 PASS, 5 ignorés**, TypeScript **264 PASS**,
  typage et builds PASS. Clippy **échoue sur la dette préexistante** : 24 extraits
  de diagnostics retrouvés dans `896e2c3`, dont l'ancien store déplacé en tests.
  Aucun passage clippy vert n'est revendiqué; baseline clippy non réexécutée.
- **Limites :** analyse/hash/règles/résolution de relations collectent encore des
  métadonnées du corpus en mémoire via un adaptateur temporaire non sérialisable.
  Pas de streaming ni optimisation P-08. Pas de racine personnelle, de preuve
  physique 100k/1M, de promesse laptop modeste ou de preuve GPU désactivé.
- **États :** F-050/F-051 `IMPLEMENTED` dans cette première tranche synthétique;
  F-042/F-046 restent `PROPOSED`, F-047 `DEFERRED`. Graphify `NOT INTEGRATED`;
  aucun renderer nouveau; R8, DEC-0013/F et X10 hors Windows restent ouvertes.
  **X5 = 36**, preuves antérieures intactes; `origin/main = 1a7d652c`, inchangé.
- **Action unique suivante : retour à l'orchestrateur pour décider et ouvrir la prochaine tranche V1** — contrôle indépendant enregistré dans `ACTION-0047`.

Le contrôleur doit porter une attention particulière à `brain_index.rs`,
`projection.rs`, à la séparation des entrées d'analyse dans les commandes de
relations, et aux curseurs après rebuild. Les 3 artefacts TASK-0030 ne sont pas
scellés. La première tentative WebView2 a échoué dans le pilote CDP; la preuve
publiée est celle du rejeu neuf après correction. Aucun état VERIFIED attribué.

## Relais actuel — ACTION-0046, TASK-0029 VERIFIED, 2026-09-09

Le verdict rendu par l'orchestrateur technique indépendant est enregistré dans
[`ACTION-0046`](../reviews/ACTION-0046-independent-control.md) :
`ACTION-0046 = CLOSED`, `TASK-0029 = VERIFIED — PASS` dans sa portée exacte de
fondation Rust/SQLite et mesure d'ingénierie non produit. Claude Code était
l'exécuteur de `TASK-0029`; Codex a seulement rédigé l'enregistrement du
verdict externe et ne s'attribue pas `VERIFIED`.

**Ce qui a été prouvé.** La réserve d'`ACTION-0045` portait sur un point
précis : les requêtes qui fabriquent la petite vue n'étaient pas elles-mêmes
bornées. Elles le sont. Une page de 100 enfants directs coûte `p95` **611 →
322 µs** en première page et **387 → 892 µs** en fin de fratrie quand le corpus
passe de 100k à 1M, là où le prototype `OFFSET` de `TASK-0028`, appelé tel quel
sur la même base et dans le même processus, va de **13,6 à 116,7 ms** et de
**32,8 à 351,2 ms**. Critère d'ingénierie `p95` 1M ≤ 5 × `p95` 100k : **`PASS`**,
pire rapport **2,30**.

L'ordre fonctionnel n'a pas bougé — dossiers d'abord, nom insensible à la
casse, puis `id` — et un test prouve qu'il coïncide exactement avec l'ordre
préexistant. Ce qui a changé est **comment** il est servi : deux colonnes
générées `VIRTUAL`, un index qui couvre le filtre et l'ordre, et une
continuation par comparaison de valeurs de ligne que SQLite convertit en
recherche. Le plan est vérifié **par assertion pendant la campagne**, pas
raconté après coup.

**Ce qu'il faut lire avant d'implémenter la suite.** Trois choses.

1. `Index::replace_nodes` prend toujours **tout le corpus en mémoire** —
   189 Mo de working set à un million. `TASK-0029` n'y touche pas.
2. La recherche `P-08` est **inchangée** et reste linéaire dans le corpus. Elle
   garde son `OFFSET`, délibérément : c'est la tranche suivante.
3. Un `total descendants` exact reste **interdit sur le hot path** tant qu'il
   n'est pas pré-calculé : mesuré à **342 ms** à 1M, son coût suit le
   sous-arbre et non le budget de vue.

**Ce qui n'a pas été livré, et ne devait pas l'être.** Aucune commande Tauri,
aucun contrat IPC, aucun changement d'interface, aucun materializer, aucun
renderer. `F-042`, `F-050` et `F-051` restent `PROPOSED`; seule la sémantique
du compte de `F-051` est clarifiée par `DEC-0030`, sans que la capacité existe.
`MAX_NODES_PER_MAP = 5000` est inchangé. Aucune dépendance ajoutée. Aucune
`TASK-0030`, aucune `DEC-0031`.

**Limites obligatoires.** Banc `DEVELOPMENT_BENCH_NOT_ACCEPTANCE`, hors classe
cible; temps `debug`, la suite de tests du crate ne compilant pas en `release`;
`INDEX-SCALE` seulement, aucun fichier physique créé, donc rien n'est dit du
scanner à ces tailles; corpus synthétique d'une seule forme; deux positions
rendent un rapport inférieur à 1, ce qui est du bruit à l'échelle de quelques
centaines de microsecondes et non un gain. Les deux JSON restent non canoniques
et non protégés; `X5` reste à **36** et les quatre artefacts `TASK-0028` sont
inchangés. `origin/main = 1a7d652c`, non touché.

**Relais unique :** retour à l'orchestrateur pour ouvrir la prochaine tranche
V1 de convergence du pipeline réel. Ne créer ni `TASK-0030` ni `DEC-0031`
sans nouveau GO.

## Relais précédent — ACTION-0045, TASK-0028 VERIFIED, 2026-09-07

Le verdict de l'orchestrateur technique indépendant est enregistré dans
[`ACTION-0045`](../reviews/ACTION-0045-independent-control.md) : `TASK-0028 =
VERIFIED` comme **preuve de faisabilité architecturale / benchmark
synthétique**, sans validation de performance produit. Claude Code était
l'exécuteur; Codex a seulement rédigé l'enregistrement.

Le critère structurel tient au niveau harness/core : à budget 1024 et focus
racine, 10k, 100k et 1M `INDEX-SCALE` donnent chacun 1 024 entités et 1 023
arêtes, avec comptabilité exacte dans les 24 combinaisons. Les résultats
négatifs guident la suite : corpus global en mémoire pour `replace_nodes`,
recherche linéaire, tri des enfants non servi par l'index et compte récursif
exact coûteux.

Les limites restent obligatoires : banc hors `TARGET_CLASS`, 1M physique non
prouvé, composition index→frontend non testée, `SS7` partiel, `SS8 NOT PROVEN`,
temps Rust en `debug`, voisinage relationnel non mesuré et portée jsdom limitée
à la cardinalité. Les quatre JSON restent non canoniques et non protégés; X5
reste à 36. La dette préexistante de chemins locaux personnels dans d'anciens
documents reste hors périmètre; `TASK-0028` n'en ajoute pas.

**Relais unique :** l'orchestrateur choisit la prochaine tranche de fondation
d'échelle avant le materializer produit : pagination/index des enfants,
sémantique du compte d'agrégat, recherche indexée et indexation par flux ou
lots. Il décidera ensuite seulement du materializer, de
`F-042`/`F-050`/`F-051`, d'un budget candidat et d'un replay `TARGET_CLASS`.
Aucune `TASK-0029` ni `DEC-0030` n'est créée.

## Relais actuel — TASK-0028 IMPLEMENTED, 2026-09-07

`TASK-0028`, le banc synthétique de mise à l'échelle, est **`IMPLEMENTED`** sur
`build/v0.2-a12-synthetic-scale-spike`. L'exécuteur ne s'est pas attribué
`VERIFIED`; le contrôle indépendant reste à faire.

**Ce qui a été prouvé.** À budget de vue fixe, ce qui serait rendu ne bouge pas
quand le corpus passe de 10 000 à 1 000 000 : mêmes 1 024 entités, mêmes 1 023
arêtes, ~200 Ko de payload, 0,25 ms de layout. Chaque élément non rendu reste
**compté exactement** et **atteignable**, vérifié dans les 24 combinaisons par
deux méthodes indépendantes qui doivent s'accorder. C'est le critère de rejet
principal de `DEC-0029`, et il tient.

**Ce qui ne tient pas, et qu'il faut lire avant d'implémenter.** Trois chemins
coûtent le corpus ou le sous-arbre, pas le budget : la recherche `P-08`
(`LIKE` non ancré balaie tout — ~0,67 s à 1M), la page d'enfants directs
(l'ordre `kind = 'directory' DESC, name COLLATE NOCASE, id` **n'utilise pas**
`idx_nodes_parent`, d'où 106 ms pour 100 lignes à 1M), et le compte exact des
éléments d'un agrégat (CTE récursive, 1,34 s à 1M). Les ancêtres, eux, sont
plats à 43 µs : une requête réellement bornée existe déjà, c'est l'ordre de tri
qui défait les autres. `Index::replace_nodes` exige en outre **tout le corpus en
mémoire** — 335 Mo à 1M.

**Ce qui n'a pas été prouvé, et ne doit pas être présenté autrement.** La
composition bout-en-bout index→vue n'a **pas** été testée : la relier au
frontend exigerait une commande produit nouvelle, hors périmètre. Les vues
mesurées dans WebView2 réel comptent **12 et 157** entités, le bas de la plage
de budgets candidats. `SS8` est **`NOT PROVEN`** : la désactivation du GPU n'est
pas confirmable depuis l'extérieur de la page. **1 000 000 physique n'est pas
prouvé** — seul l'index à 1M l'est. Le banc est
`DEVELOPMENT_BENCH_NOT_ACCEPTANCE` : **aucune cible « machine modeste » n'est
validée**, et tous les temps Rust sont des temps `debug`.

**Ce qui n'a pas changé.** Aucun état produit : `F-042`, `F-050`, `F-051`
restent `PROPOSED`; `MAX_NODES_PER_MAP = 5000` est en vigueur; aucun renderer
n'est choisi; aucun budget de vue n'est décidé; aucune `DEC-0030` ni
`TASK-0029` n'existe. `X5` reste à **36** et les 36 preuves scellées sont
intactes, empreintes relevées avant et après les passes WebView2.
`origin/main = 1a7d652c`, non touché. `R8` est entière : aucun chiffre ne sort
des artefacts `TASK-0028`.

Le harness est **entièrement `#[cfg(test)]`** : `cargo build` produit le même
binaire produit, sans avertissement nouveau. Les campagnes sont `#[ignore]` et
se relancent par `scripts/task0028-scale-spike.ps1`, puis
`scripts/task0028-ss7-bounded-view-webview2.ps1` pour WebView2.

## Relais actuel — ACTION-0044, TASK-0027 VERIFIED, 2026-09-06

Le verdict rendu par l'orchestrateur technique indépendant est enregistré dans
[`ACTION-0044`](../reviews/ACTION-0044-independent-control.md) : cohérence
architecture / vision / roadmap / parité / matrice **PASS**,
`ACTION-0044 = CLOSED`, `TASK-0027 = VERIFIED`, sans réserve corrective
bloquante. Claude Code était l'exécuteur de `TASK-0027`; Codex a seulement
rédigé l'enregistrement. Aucun des deux ne s'est auto-attribué `VERIFIED`.

Le contrôle est **documentaire uniquement**. Le diff substantif porte sur 15
fichiers documentaires ou d'orchestration; aucun code, runtime, garde X5 ou
JSON de preuve n'a changé. `X5` reste à 36 et `origin/main` à `1a7d652c`, non
touché.

La frontière approuvée demeure une cible : `F-042 = PROPOSED / MVP`;
`F-050` et `F-051 = PROPOSED / MVP / P0`. Le materializer, le budget de vue,
le LOD et les agrégats restent non implémentés. Les niveaux 10k / 100k / 1M
restent non mesurés. Graphify est `NOT INTEGRATED`, Forge reste distinct,
aucun renderer n'est choisi et la finition visuelle moderne reste future en
étape B.

`F-046` reste `PROPOSED`, avec `DEC-0013/F` bloquante. `F-047` reste
`DEFERRED`; `X10` hors Windows reste non prouvée race-safe et `R8` entière.
La dette préexistante de l'index `docs/decisions/README.md`, qui omet déjà
`DEC-0024` à `DEC-0028`, n'a pas été réparée partiellement.

**Relais unique :** l'orchestrateur décide si le scale spike synthétique doit
devenir `TASK-0028`. Aucune `TASK-0028` ni `DEC-0030` n'est créée.

## Relais actuel — TASK-0027, réalignement d'architecture à grande échelle, 2026-09-06

**Tranche documentaire livrée `IMPLEMENTED`, en attente de contrôle
indépendant.** Branche `build/v0.2-a11-progressive-scale-architecture`, créée
et publiée depuis `b580942`, dont le parent est bien `ffa9504`. Agent
d'exécution : Claude Code.

**Ce qui a été écrit.** Trois documents créés —
[`TASK-0027`](../tasks/TASK-0027-progressive-scale-architecture-realignment.md),
[`DEC-0029`](../decisions/DEC-0029-progressive-materialization-and-scale-boundary.md),
[`PROGRESSIVE_SCALE_ARCHITECTURE.md`](../architecture/PROGRESSIVE_SCALE_ARCHITECTURE.md) —
et onze amendés : `PROJECT_VISION.md`, `ROADMAP.md`,
`ARCHITECTURE_BASELINE.md`, `CARTETOPO_FUNCTIONAL_PARITY.md`,
`FEATURE_MATRIX.md`, `REQUIREMENTS_BASELINE.md`, les cinq documents `docs/ai/`
et `.orchestrator/RESULT.md`.

**Ce qui n'a PAS été touché, et c'est le point le plus important pour le
contrôleur.** **Aucun** fichier sous `src/`, `src-tauri/`, `scripts/`,
`graph/` ni `docs/performance/runs/`. **Aucun** JSON de preuve. **`X5` reste à
36 noms.** `MAX_NODES_PER_MAP` reste à `5_000` dans
`src-tauri/src/map/mod.rs`. `origin/main` reste `1a7d652c`, non fusionné, non
mergé, non cherry-piqué.

**La frontière gelée.** *FileTopo indexe grand, matérialise petit, et ne rend
que le contexte utile.* Corpus, graphe logique, vue matérialisée et rendu sont
quatre plans distincts. `1 élément indexé` = `1 entité accessible`, pas `1
carte rendue`. `MAX_NODES_PER_MAP = 5000` est requalifié en **limite de
tranche historique**, destinée à être remplacée par un **budget de vue** — mais
**pas dans cette tâche**.

**Parité.** `P-01`, `P-02`, `P-03` amendées par **`P-SCALE-R1`**, formulations
d'origine conservées et visibles sous les nouvelles, à la manière de `P02-R1`.
Les amendements **ajoutent** des obligations de véracité; aucune exigence n'est
retirée. **22 exigences**, inchangé. **`P-08` devient le pilier du scale
spike.**

**Matrice.** 49 → 51. `F-050` et `F-051` ajoutées, `MVP` / `P0`. `F-042` monte
`ULTÉRIEUR` → `MVP`, motif écrit. Répartition `MVP` 44 / `ULTÉRIEUR` 2 /
`DIFFÉRÉ` 5. `F-046` reste `PROPOSED`, `F-047` reste `DIFFÉRÉ`.

**Frontières produit.** **Graphify `NOT INTEGRATED`** : aucune dépendance,
aucun runtime, aucun adaptateur, aucun `graph.json` global, aucun dashboard,
aucun pipeline LLM obligatoire. **Forge reste distinct.** **Aucun renderer
choisi.** **Pas de dépendance à un GPU puissant ni à WebGL.**

**Ce que le prochain agent doit faire.** Le **contrôle indépendant de
`TASK-0027`**, sur preuves documentaires, par une instance distincte de
l'exécuteur. Rien d'autre. Aucune `TASK-0028` n'est créée; la séquence
proposée dans `ROADMAP.md` est `PROPOSED` et n'autorise aucun travail.

**Pièges connus pour le contrôleur.**

- Les mentions « 49 lignes » et « `F-001` à `F-049` » subsistent dans
  `FEATURE_MATRIX.md`, `REQUIREMENTS_BASELINE.md` et `ROADMAP.md` : ce sont
  des **enregistrements d'époque** du 2026-09-02, volontairement conservés,
  pas des incohérences. Les répartitions courantes disent bien **51**.
- `F-042` apparaît en `MVP` dans trois documents — matrice, baseline,
  `DEC-0029` — avec sa **valeur d'origine `ULTÉRIEUR` conservée en note**.
  C'est voulu; la note n'est pas une classification concurrente.
- Les chiffres 10 000 / 100 000 / 1 000 000 apparaissent partout comme
  **cibles**. Toute lecture qui les prendrait pour des mesures serait fausse :
  **aucun banc n'a été exécuté**.

**Non testé.** Aucune mesure de performance, aucune suite de tests rejouée,
aucun build Tauri, aucun `pnpm build`, aucun replay WebView2. La tâche ne
touchant aucun code, aucune régression d'exécution n'est possible ni
contrôlée. Réserve `R8` entière; `DEC-0013/F` toujours bloquante; garantie
`X10` hors Windows toujours non prouvée.

## Relais précédent — ACTION-0043, TASK-0026 VERIFIED, 2026-09-06

Le verdict rendu par l'orchestrateur technique indépendant est enregistré dans
[`ACTION-0043`](../reviews/ACTION-0043-independent-control.md) : `ED1` à
`ED15 = PASS`, `ACTION-0043 = CLOSED`, `TASK-0026 = VERIFIED`, sans réserve
fonctionnelle bloquante ni réserve corrective ouverte. Codex était l'exécuteur
de la tranche; Claude Code a seulement rédigé l'enregistrement, corrigé les
commentaires `X5` périmés et appliqué le scellement. Aucun des deux ne s'est
auto-attribué `VERIFIED`.

X5 passe de **34** à **36** noms. Les deux seuls ajouts, après les 34 noms
historiques inchangés, sont les preuves `TASK-0026-ED15-*` pass1 puis pass2.
Les six replays `TASK-0026-EC15-*`, `TASK-0026-DR15-*` et `TASK-0026-SR15-*`
restent non canoniques et non protégés. Les gardes Rust, TypeScript et
PowerShell sont en parité exacte sur les 36 noms, dans le même ordre.

Après scellement : `protectedArtifactCount = 36`,
`protectedDestinations = [ED15 pass1, ED15 pass2]`,
`owningTaskId = TASK-0026`, `writesUnderItsOwnTaskOnly = false`. Rejouer
`ED15` depuis ce checkout est refusé — c'est la porte qui fonctionne, pas une
régression.

**Un défaut a été trouvé et réparé pendant le scellement.** Quatre scénarios
d'écriture — `dreScenario`, `exactDuplicateScenario`, `genericRelationScenario`
et `reviewScenario` — exigeaient avant d'écrire que `X5` vaille exactement 34
et que l'intersection soit vide. Ces deux faits ne sont vrais qu'entre deux
scellements : portés à 36, les quatre scénarios auraient avorté, rendant
**injouables** les six replays qui doivent rester rejouables. La condition
porte désormais sur le nom que le scénario s'apprête à écrire, ce qui ne
pourrit pas, et deux tests `X5` nouveaux l'imposent. C'est le défaut de la
réserve `X8` sous forme numérique.

Validations de clôture : `runArtifacts.test.ts` **44/44**, Rust ciblés
**26/26**, suite Rust **229/229**, suite TypeScript **246/246**, `pnpm check`
**PASS**, garde PowerShell **36 refus / 36 noms uniques** avec les six replays
toujours autorisés, parité Rust/TS/PowerShell **PASS**, `git diff --check`
**PASS**, aucun JSON de preuve modifié. Aucun replay WebView2 et aucun build
Tauri n'ont été refaits.

`F-046` reste `PROPOSED` : l'exploration exacte à l'échelle est vérifiée,
l'identité physique persistante reste absente et `DEC-0013/F` bloquante. X10
hors Windows reste non prouvée race-safe.

**Écart signalé, hors périmètre :** `main` locale reste `91bbe90f`, mais
`origin/main` porte un commit de plus, `1a7d652c` — « docs: update canonical
GitHub identity », signé Sébastien Dubé, 2026-09-06 18:16 −0400. C'est une
action du propriétaire, hors de cette branche; rien n'a été publié vers `main`
par cette fermeture.

**Relais unique :** rendre la main à l'orchestrateur technique pour définir la
tranche suivante. Ne pas créer `TASK-0027` ni `DEC-0029` sans GO.

## Relais précédent — TASK-0026 IMPLEMENTED, 2026-09-06

`TASK-0026` livre l'explorateur borné de contenus binaires identiques observés
sur `build/v0.2-a10-exact-duplicate-explorer`. Son statut est
**`IMPLEMENTED`**, jamais `VERIFIED` par Codex; `DEC-0028` est implémentée et
attend le même contrôle indépendant.

Le backend lit seulement la génération courante d'un cerveau, agrège et page
dans SQLite avant matérialisation, avec un plafond 100 pour groupes et membres.
L'UI distingue l'absence de campagne de zéro résultat, montre digest complet,
groupe vide et fraîcheur, et permet une navigation clavier sans créer relation
ni suggestion. La limite « contenu identique ≠ même fichier physique/copie »
reste adjacente et explicite.

ED15 final porte sur 1 200 fichiers synthétiques : 125 groupes, 373
occurrences, pages `50/50/25`, rehash complet inchangé, vrai restart/rebuild,
persistance et résolution honnête. Les replays `EC15`, `DR15`, `SR15` sont
également publiés en deux passes. Les huit JSON `TASK-0026` sont non canoniques
et hors X5.

Validations finales : Rust **227/227** plus ciblés exact duplicate **3/3** et
moteur **14/14**; TypeScript **241/241** et ciblés **42/42**; typage, build web,
Tauri debug et `git diff --check` verts. X5 reste 34/34 inchangé et refusé,
intersection runtime/protected vide, propriétaire runtime `TASK-0026`.

`F-046` reste `PROPOSED`; aucune identité physique persistante ni cache taille
+ mtime n'existe. `DEC-0013/F` demeure bloquante et X10 hors Windows non
prouvée race-safe. `main` reste `91bbe90f`.

**Relais alors demandé :** contrôle indépendant de `TASK-0026` sur `ED1` à
`ED15`, les huit preuves WebView2 et l'intégrité X5. Il a été rendu par
`ACTION-0043`, enregistré en tête de ce fichier.

## Relais actuel — ACTION-0042, TASK-0025 VERIFIED, 2026-09-05

Le verdict rendu par l'orchestrateur technique indépendant est enregistré dans
[`ACTION-0042`](../reviews/ACTION-0042-independent-control.md) : `SR1` à `SR15
= PASS`, `ACTION-0042 = CLOSED`, `TASK-0025 = VERIFIED`, sans réserve
corrective ouverte. Claude Code était l'exécuteur de la tranche; Codex a
seulement rédigé l'enregistrement et appliqué le scellement. Aucun des deux ne
s'est auto-attribué `VERIFIED`.

X5 passe de **32** à **34** noms. Les deux seuls ajouts, après les 32 noms
historiques inchangés, sont les preuves `TASK-0025-SR15-*` pass1 puis pass2.
Les replays `TASK-0025-DR15-*`, `TASK-0025-J12-*` et `TASK-0025-X11-*` restent
non canoniques et non protégés. Les gardes Rust, TypeScript et PowerShell sont
en parité exacte.

Le runtime écrit encore sous `TASK-0025`; les deux `SR15` sont donc maintenant
des destinations refusées. État dérivé : `protectedArtifactCount = 34`,
`protectedDestinations = exact2 SR15`, `owningTaskId = TASK-0025`,
`writesUnderItsOwnTaskOnly = false`. C'est l'état normal après `VERIFIED` et il
ne faut pas le masquer par une migration anticipée vers `TASK-0026`.

Validations ciblées : TypeScript **36/36**, Rust **24/24**, PowerShell **34/34
refus** avec 34 noms uniques et X11 autorisée, parité exacte et
`git diff --check`. Aucun JSON sous `docs/performance/runs/` n'a changé; aucun
replay WebView2 ni build produit n'a été lancé.

`F-044` et `F-045` restent `IMPLEMENTED`, désormais vérifiées par
`TASK-0025 / ACTION-0042`. `F-043` reste vérifiée par `TASK-0024`; `F-046`
reste `PROPOSED`. Aucun état `DEFERRED` persistant n'est ajouté et aucune
politique automatique de réévaluation n'est créée. `DEC-0013/F` et la limite
X10 hors Windows demeurent.

**Relais unique :** retour à l'orchestrateur pour définir la prochaine tranche
fonctionnelle après `TASK-0025 VERIFIED`. Ne créer ni `TASK-0026` ni
`DEC-0028` avant ce nouveau GO.

## Relais actuel — TASK-0025 IMPLEMENTED, 2026-09-05

`TASK-0025` livre `F-044` et `F-045` sur la branche
`build/v0.2-a9-suggestion-review-memory`, créée depuis le commit
d'orchestration `7bb9857` et publiée. `main` n'a pas bougé : `91bbe90f`.

**Statut : `IMPLEMENTED`, contrôle indépendant requis.** L'exécuteur ne s'est
pas attribué `VERIFIED`, et les deux preuves `TASK-0025-SR15-*` ne rejoignent
donc pas `X5`, qui reste à **32** noms.

Ce qui est fait, en une phrase chacun :

- le store intra-relations est en **schema v4**, avec exactement trois états de
  suggestion — `pending`, `approved`, `rejected` — et une colonne nullable
  `decision_reconsider_cause` laissée `NULL`;
- **aucun état `deferred`** n'existe : « Plus tard » n'appelle aucune commande;
- une **file de révision** générique et paginée existe par cerveau, avec un
  `totalPending` exact et une limite maximale publiée;
- un **rejet explicite** est enregistré, ne crée aucune relation, et la
  reconciliation `dre-v1` ne le défait pas;
- toutes les **destinations runtime** sont passées sous `TASK-0025` avant le
  premier rejeu, sans toucher aux 32 noms protégés.

Ce qu'il reste à décider, et par qui :

- **le contrôle indépendant de `TASK-0025`**, par une instance distincte de
  l'exécuteur, sur les critères `SR1` à `SR15` et les preuves publiées. Lui seul
  peut faire passer `F-044` et `F-045` au-delà de `IMPLEMENTED`, et lui seul
  peut décider d'étendre `X5` aux deux preuves `SR15`;
- la suite produit après cette tranche. Aucune `TASK-0026` n'a été créée.

Ce qui reste explicitement ouvert : la **politique de réévaluation** d'une
décision humaine est hors scope v1 — le schéma peut l'enregistrer, rien ne la
décide. `DEC-0013/F` demeure bloquante et `F-046` reste `PROPOSED`. La garantie
`X10` hors Windows reste non prouvée.

## Relais actuel — ACTION-0041, TASK-0024 VERIFIED, 2026-09-05

Le verdict indépendant est enregistré dans
[`ACTION-0041`](../reviews/ACTION-0041-independent-recontrol.md), sans être
rendu par Codex : `X11 = CLOSED`, `ACTION-0040 = CLOSED`, `ACTION-0041 =
CLOSED`, `TASK-0024 = VERIFIED`. Le HEAD re-contrôlé est `f78d1bf` et le
commit substantif X11 est `bcc10a8`.

X5 passe de **29** à **32** preuves. Les trois ajouts, à la suite des 29 noms
inchangés, sont DR15 pass1, DR15 pass2 et J12 de `TASK-0024`. Les gardes Rust,
TypeScript et PowerShell portent la même liste. La preuve corrective X11, H9,
K11, K12, L12, M12, N15, EC15 et toutes les variantes `-abandon` restent non
canoniques et non protégées.

Le runtime écrit encore sous `TASK-0024`; exactement les trois preuves
canoniques sont maintenant des destinations refusées. État dérivé :
`protectedArtifactCount = 32`, `protectedDestinations = exact3`,
`owningTaskId = TASK-0024`, `writesUnderItsOwnTaskOnly = false`. C'est l'état
normal après `VERIFIED`; la prochaine tranche migrera ses destinations avant
tout éventuel rejeu.

Cette fermeture touche seulement la gouvernance et les gardes X5. Aucun JSON
de preuve ni code produit n'est modifié, et aucun scénario WebView2 n'est
rejoué. `F-043` reste `IMPLEMENTED` dans la matrice, désormais vérifiée par
`TASK-0024`. `F-044`, `F-045`, `F-046` restent `PROPOSED`; `DEC-0013/F` et la
limite non-Windows de X10 demeurent.

**Relais unique :** retour à l'orchestrateur pour définir la prochaine tranche
après `TASK-0024 VERIFIED`. Aucune `TASK-0025` créée.

## Relais actuel — TASK-0024 corrigée sur X11, toujours IMPLEMENTED, 2026-09-05

`TASK-0024` reste livrée **`IMPLEMENTED`**, jamais auto-attribuée `VERIFIED`,
sur `build/v0.2-a8-deterministic-relation-engine`. `DEC-0026` et `F-043` restent
`IMPLEMENTED — contrôle indépendant requis`.

Le contrôle indépendant [`ACTION-0040`](../reviews/ACTION-0040-independent-control.md)
a rendu `CHANGES_REQUIRED` et ouvert la réserve `X11` : le moteur était
générique, mais la couche héritée de `TASK-0017` filtrait encore les lectures
intra-relations sur `quasi-empty`, si bien que `brain-beta` (`deep`) ne pouvait
ni ouvrir le panneau, ni lancer l'analyse depuis l'interface, ni approuver une
suggestion core. **Claude enregistre ce verdict; il ne le rend pas et ne ferme
pas `X11`.**

La correction découple les deux périmètres. `legacy_fixture_spec()` répond
`Some` pour la seule fixture historique, `source_spec()` valide la source de
n'importe quel cerveau, et `ensure_in_scope()` ne sert plus qu'à `self_check`,
qui reste gelé sur `quasi-empty`. `open_relations` ne rejoue `derive()` et ne
sème les suggestions gelées que dans le périmètre legacy; ailleurs il lit le
store tel qu'il est. `node_relations` et `approve_suggestion` ne sont plus
filtrés par la fixture, le refus d'approbation d'une suggestion core périmée
étant inchangé. Le DTO dit `legacyInScope`, et `RelationsPanel` reçoit
`available` et `legacyInScope` : la note legacy explique la limite sans jamais
masquer le bouton **Analyser les relations**, l'état `dre-v1`, les relations
core, les suggestions core ni leur approbation.

Validations exécutées : Rust **200/200**, TypeScript **215/215**, `pnpm check`,
`pnpm build`, Tauri debug `--no-bundle`. La preuve corrective
`TASK-0024-X11-generic-brain-webview2.json` a été écrite dans un vrai processus
WebView2 `152.0.4191.62` sur `brain-beta` : activation clavier fiable, zéro clic
programmatique, report `brain-beta` / `dre-v1` / `CURRENT`, aucun producteur
legacy, source inchangée, processus fermé. Elle est **non canonique**, ne
rejoint pas `X5` et ne remplace aucune preuve gelée. Les deux `DR15` ont été
rejouées sur une variante fraîche et le `J12` réel repasse : les invariants
legacy d'Alpha sont strictement identiques.

Sur `deep`, `core.identical-content` est sautée faute de signal de contenu et la
règle des frères numérotés produit 39 suggestions. **Zéro sortie serait un
résultat valide** : ce qui est prouvé est la généricité du moteur et de
l'interface, pas qu'une règle doive produire.

X5 reste exactement à **29** noms, inchangés dans les trois gardes. Toutes les
destinations actives appartiennent à `TASK-0024`, aucune n'est protégée.
`main` reste `91bbe90f`. Les quatre fixtures gelées sont inchangées.

**Relais unique :** re-contrôle indépendant ciblé `X11` / `TASK-0024`. Ne créer
aucune `TASK-0025`. `F-044`, `F-045`, `F-046` restent `PROPOSED`; `DEC-0013/F`
demeure bloquante.

## Relais actuel — TASK-0024 IMPLEMENTED, 2026-09-05

`TASK-0024` est livrée **`IMPLEMENTED`**, jamais auto-attribuée `VERIFIED`, sur
`build/v0.2-a8-deterministic-relation-engine`. `DEC-0026` et `F-043` sont
`IMPLEMENTED — contrôle indépendant requis`.

Le runtime `dre-v1` possède exactement deux règles `core.*`. La première
établit `content-identical` seulement sur SHA-256 non vide de la génération
courante et produit N-1 arêtes ancrées; la seconde laisse des frères numérotés
consécutifs au statut de suggestion `revision`, avec explications FR/EN et
signaux structurés sans score. Le store distingue structurellement les sorties
core des lignes legacy, conserve `APPROVED`, réconcilie sans duplication et
masque les sorties core devenues stale jusqu'au rerun.

Validations exécutées : Rust **197/197**, TypeScript **213/213**, `pnpm check`,
`pnpm build`, Tauri debug `--no-bundle`. DR15 passe dans deux vrais processus
WebView2 `152.0.4191.62` sur une même variante fraîche, avec activation clavier
et approbation fiables, zéro clic programmatique, persistance et idempotence.
J12 réel passe sous `TASK-0024`.

X5 reste exactement à **29** noms, inchangés dans les trois gardes. Toutes les
destinations actives appartiennent à `TASK-0024`, aucune n'est protégée et les
trois nouvelles preuves ne seront scellées qu'après vérification indépendante.
`main` reste `91bbe90f`. Les quatre fixtures gelées sont inchangées; DR15
emploie une source synthétique dédiée au scénario, hors de leur catalogue.

**Relais unique :** contrôle indépendant de `TASK-0024`. Ne créer aucune
`TASK-0025`. `F-044`, `F-045`, `F-046` restent `PROPOSED`; `DEC-0013/F`
demeure bloquante.

## Relais actuel — ACTION-0039, TASK-0023 VERIFIED, 2026-09-04

Le verdict indépendant est enregistré dans
[`ACTION-0039`](../reviews/ACTION-0039-independent-recontrol.md), sans être
rendu par Claude : `X9 = CLOSED`, `X10 = CLOSED`, `ACTION-0038 = CLOSED`,
`ACTION-0039 = CLOSED`, `TASK-0023` **`VERIFIED`**, sur le HEAD re-contrôlé
`adba6568` et le commit substantif `X10` `9e9fb37a`. Aucune réserve ne reste
ouverte.

`X5` est passée de **27** à **29** preuves protégées. Les deux ajoutées sont
les seules preuves canoniques de `TASK-0023` :
`TASK-0023-EC15-exact-content-observations-webview2-pass1.json` et
`…-pass2.json`. Les 27 antérieures conservent exactement le même ordre, et les
trois gardes canoniques — `src-tauri/src/map/commands.rs`,
`src/map/runArtifacts.ts`, `scripts/protected-run-artifacts.ps1` — portent la
même liste. Aucun autre artefact de la tranche n'est scellé : ses replays `H9`,
`J12`, `K11`, `K12`, `L12`, `M12`, `N15` et toutes les variantes `-abandon`
restent écrivables.

**Ce qu'il faut savoir avant de reprendre le code.** Le runtime livré dans ce
checkout écrit encore sous `TASK-0023`, donc ses deux destinations `EC15` sont
maintenant refusées par `write_run_artifact` :
`protectedArtifactCount = 29`, `protectedDestinations` = les deux `EC15`,
`writesUnderItsOwnTaskOnly = false`. **C'est l'état normal d'une tranche
vérifiée**, exactement ce qui est arrivé à `TASK-0020`, et
`SEALED_RUNTIME_DESTINATIONS` le publie. Ne pas « réparer » cela en renommant
d'avance le runtime : la prochaine tranche migre ses destinations sous son
propre nom de tâche **avant** tout nouveau rejeu, comme chaque tranche
précédente l'a fait.

Cette action était gouvernance et scellement seulement : rien de
`content_signals.rs`, SHA-256, `sha256-tree-v1`, SQLite, layout, relations,
fixtures, JSON `EC15`, `Cargo.toml` ou `Cargo.lock` n'a été touché, et aucune
campagne n'a été rejouée. Validations : Rust **184/184**, TypeScript
**211/211**, `pnpm check`, `pnpm build`; aucune preuve modifiée; `main` reste
`91bbe90f`.

**Limites transmises :** la garantie race-safe `X10` est prouvée **sur
Windows** et le repli non-Windows n'est pas revendiqué race-safe;
`DEC-0013/F` demeure bloquante pour l'identité physique persistante, donc
`F-046` reste `PROPOSED` bien que sa fondation de contenu exact soit désormais
vérifiée.

**Relais :** retour à l'orchestrateur technique pour définir la prochaine
tranche. Aucune `TASK-0024` n'est créée; aucun travail de code n'est ouvert
avant ce GO.

## Relais actuel — ACTION-0038, correction X10, 2026-09-04

Le verdict externe est enregistré dans
[`ACTION-0038`](../reviews/ACTION-0038-independent-recontrol.md), sans être
rendu par Codex : `X9 = CLOSED`, `ACTION-0038 = CHANGES_REQUIRED`,
`TASK-0023 = IMPLEMENTED`, `X10 = OPEN`. Aucun autre point accepté n'est
rouvert.

Sur Windows, `open_confined_regular_file` épingle la racine puis chaque
composant intermédiaire par un handle ouvert avec
`FILE_FLAG_OPEN_REPARSE_POINT | FILE_FLAG_BACKUP_SEMANTICS`. La classification
porte sur `File::metadata()` du handle réel; les répertoires refusent les
partages écriture et suppression jusqu'à la fin de la lecture. Le fichier
final refuse le partage suppression, est classé depuis son handle, puis ce
même `File` alimente SHA-256. `sha256-tree-v1` utilise la même primitive bas
niveau : un répertoire reste épinglé pendant `read_dir` et toute sa récursion.

L'audit préalable a confirmé que Rust `1.98.0` fournit les primitives requises
dans `std::os::windows::fs::OpenOptionsExt`. Aucune dépendance n'est ajoutée;
`Cargo.toml` et `Cargo.lock` restent inchangés. Aucune metadata d'identité de
handle n'est persistée.

Trois tests TOCTOU synchronisés passent réellement : fichier remplacé par un
reparse sortant avant l'ouverture sûre, répertoire remplacé par une jonction
sortante avant le parcours, et composant `a` de `root/a/b/file` impossible à
renommer après épinglage. Aucun test n'utilise de sommeil et aucun octet
extérieur n'est lu.

Validation : `content_signals` 29/29, Rust 181/181, TypeScript 208/208,
`pnpm check`, `pnpm build`, Tauri debug `--no-bundle`. EC15 passe 1/2 dans deux
processus WebView2 `152.0.4191.62`, variante fraîche
`task0023-ec15-x10-20260904153755-5a40e1` : 8 fichiers, 1 424 octets, 8
digests, redémarrage réel, stale UI honnête, Alpha/Gamma et relations
inchangés. X5 reste exactement 27; seules les deux preuves EC15 non protégées
sont réécrites.

Limites : le repli non-Windows n'est pas revendiqué race-safe et n'a pas été
compilé/exécuté; `DEC-0013/F` reste bloquante. `cargo fmt --check` reste rouge
sur le formatage historique global avec rustfmt 1.98; aucun reformatage global
n'a été appliqué.

**Prochaine action unique : re-contrôle indépendant ciblé `X10` /
`TASK-0023`.** `X10` reste `OPEN` et Codex ne s'attribue pas `VERIFIED`.

## Relais actuel — ACTION-0037, correction X9, 2026-09-04

Le verdict indépendant est enregistré dans
[`ACTION-0037`](../reviews/ACTION-0037-independent-control.md) : sur le HEAD
`12b3c87`, `ACTION-0037` = `CHANGES_REQUIRED`, `TASK-0023` = `IMPLEMENTED`,
`X9` = `OPEN`. Claude a enregistré ce verdict sans le rendre.

`X9` visait le seul fingerprint global de campagne, resté sur
`fixtures::fingerprint(root)` : suivi possible d'un symlink fichier par
`fs::read`, donc lecture possible hors racine, et accumulation de tous les
contenus dans un `Vec<u8>`, donc mémoire non bornée.

La correction ajoute `content_signals::content_source_fingerprint`, publiée
`sha256-tree-v1:<64 hex minuscules>`. Elle parcourt les entrées dans un ordre
déterministe, n'utilise que `symlink_metadata`, marque tout symlink, jonction
ou reparse point comme lien sans ouvrir, lire, parcourir ni canonicaliser sa
cible, traite un type non interprétable comme non traversable, et alimente le
hasher par un unique tampon réutilisé de 64 KiB. `observe_root_with_hook` ne
publie plus que cette valeur pour `sourceFingerprintBefore`/`After`;
l'invariant `SOURCE_CHANGED_DURING_OBSERVATION` est inchangé.

`fixtures::fingerprint` n'est pas modifiée : elle garde son rôle historique de
fingerprint des fixtures gelées et des preuves `TASK-0016`..`TASK-0022`, dont
les valeurs `fnv1a64:…` restent reproductibles. Les deux rôles sont documentés
côte à côte dans le code.

Validation : `cargo test` **178/178**, `pnpm test` **208/208**, `pnpm check`,
`pnpm build`, Tauri debug `--no-bundle`, puis EC15 passes 1 et 2 en deux vrais
processus WebView2 `152.0.4191.62` sur la variante fraîche
`task0023-ec15-x9-20260904145356-6ebb99`. Les deux preuves EC15 — les seules
réécrites, non protégées — publient
`sourceFingerprintBefore == sourceFingerprintAfter == sha256-tree-v1:85f73748…`
et conservent 8 FILE hashés, 3 dossiers exclus, stores Alpha/Gamma distincts,
zéro relation créée, rebuild persistant, UI honnête au redémarrage, 8
ouvertures, 1 424 octets relus et 8 digests recalculés. X5 reste exactement à
27, bit-for-bit.

Limites : les quatre tests `#[cfg(unix)]` de non-suivi de lien ne sont pas
compilés sur cet hôte Windows; la création de symlink Windows a été refusée
faute de privilège, donc la preuve exécutée du non-suivi est une jonction
`mklink /J`, complétée par deux tests déterministes de classification. La
preuve de streaming est un compteur de lectures, pas un profileur.
`DEC-0013/F` reste bloquante pour l'identité physique persistante; `R8` et
`B0` inchangés, `B0` contourné par `CARGO_INCREMENTAL=0`, sans `clean`.

**Prochaine action unique : re-contrôle indépendant ciblé `X9` de
`TASK-0023`.** `TASK-0023` reste `IMPLEMENTED`, `X9` reste `OPEN`,
`ACTION-0037` reste `CHANGES_REQUIRED`; aucune `TASK-0024` n'est créée.

## Relais actuel — TASK-0023 IMPLEMENTED, 2026-09-03

`TASK-0023` est livrée sur `build/v0.2-a7-exact-content-observations`, mais
n'est pas `VERIFIED`. Le gel `711071c` précède tout code produit et EC1–EC15
sont restés immuables.

Le backend calcule SHA-256 avec RustCrypto `sha2 0.11.0` par blocs bornés,
persiste seulement la dernière génération atomique dans un store schéma 1 par
cerveau et refuse les chemins non relatifs, traversals et sorties par
symlink/reparse. Taille+mtime ne servent jamais à réutiliser un digest. Une
mutation pendant lecture invalide le digest; un changement global de source
empêche la nouvelle génération de devenir courante.

Alpha et Gamma lisent la fixture synthétique commune dans deux stores
distincts. Le même chemin porte le même digest mais deux `BrainNodeRef`. Le
rebuild map conserve store/génération/digest. Le hashing ne modifie aucun
store, compte ou graphe relationnel. Aucun contenu, extrait, chemin absolu,
identifiant physique Windows, relation, suggestion ou provenance n'est stocké.

Validation : 171 tests Rust, 208 tests TypeScript, `pnpm check`, `pnpm build`
et Tauri debug `--no-bundle` passés. EC15 passe 1 et passe 2 ont utilisé deux
processus WebView2 `152.0.4191.62`, fermés réellement, sur la même variante
fraîche. Le second processus a affiché « Dernière observation enregistrée »
puis ouvert 8 fichiers, relu 1 424 octets et recalculé 8 digests. Les deux
preuves `TASK-0023-EC15-*` sont publiées mais non protégées.

X5 reste exactement à 27 noms dans Rust, TypeScript et PowerShell, sans
modification des preuves historiques. Les destinations courantes appartiennent
toutes à `TASK-0023`, aucune n'est protégée.

Limites : `F-043`, `F-044`, `F-045` et `F-046` restent `PROPOSED`; aucune
règle `same-hash`, relation, suggestion ni IA. L'identité physique persistante
de `F-046` reste non implémentée, `DEC-0013/F` toujours bloquante. R8 et B0
sont inchangés; `CARGO_INCREMENTAL=0` a été employé sans clean.

**Prochaine action unique : contrôle indépendant de `TASK-0023`.** Contrôler
EC1–EC15 et les deux preuves, puis attribuer seul ou non `VERIFIED`. Ne pas
créer `TASK-0024` dans ce contrôle.

## Relais actuel — TASK-0022 VERIFIED, 2026-09-03

Le verdict rendu par l'orchestrateur technique indépendant est enregistré dans
[`ACTION-0036`](../reviews/ACTION-0036-independent-recontrol.md) : sur le HEAD
`645b9484790f8e766f7eed93107b9431d144aaa6` et le commit substantif `X8`
`d6963e65e9829b8c17196eeb469eabfb3aa86aeb`, `ACTION-0036`, `X8` et
`ACTION-0035` sont **`CLOSED`**; `TASK-0022` est **`VERIFIED`**. Codex a
enregistré ce verdict sans le rendre et sans rouvrir un autre point.

Conséquence X5 : les huit preuves canoniques `TASK-0022` — J12, K11, L12 en
deux passes, M12 en deux passes et N15 en deux passes — sont ajoutées aux 19
preuves antérieures. Rust, TypeScript et PowerShell portent exactement les
mêmes **27** noms, dans le même ordre. Le H9 non exécuté, K12 non publié comme
preuve `TASK-0022` et les variantes `-abandon` ne sont pas protégés.

Validations limitées au périmètre demandé : 26/26 tests TypeScript
`runArtifacts`, 3/3 tests Rust X5 ciblés, et garde PowerShell exercée sur les
27 refus. Aucun scénario WebView2 n'a été rejoué et aucun artefact de preuve
n'a été modifié. `main` est intacte à `91bbe90f0f99026c28cd345784d4f579a0016db2`.

**Prochaine action unique : retour à l'orchestrateur pour définir la prochaine
tranche.** Ne pas créer `TASK-0023` sans nouvelle décision.

## Relais actuel — TASK-0022 IMPLEMENTED, 2026-09-03

`TASK-0022` est livrée sur `build/v0.2-a6-topographic-node-graph`, mais n'est
pas `VERIFIED`. Le commit de gel `289cf9b` précède tout code produit et N1 à
N15 sont restés immuables.

Le backend persiste le schéma carte `3` et
`layout_algorithm = layered-tree-cards-v1`. Le layout construit en parcours
linéaires des cartes `240 × 64`, profondeur en colonnes de 360 unités, et un
monde non comprimé. Un index v2 est refusé puis reconstruit sans toucher au
catalogue ni aux stores intra/inter. `MapSnapshot` et `MapBuildReport` exposent
l'algorithme effectivement lu du backend.

`MapView` conserve un SVG commun à C1/C2/C3. Les cartes root/directory/file et
diagnostic se distinguent sans couleur seule; chaque non-racine porte une
arête hiérarchique orthogonale namespacée. Les relations établies, suggestions
et relations inter-cerveaux sont ancrées bord à bord. Les flèches suivent
parent, premier enfant, frère précédent et frère suivant, avec mise en vue sans
relayout. Pan, zoom, fit et reset ne modifient aucun rectangle.

Preuves : 149 tests Rust et 188 tests TypeScript; check/build/Tauri debug
passés; N15 pass1/pass2 et régressions J12/K11/L12/M12 dans le vrai WebView2
`152.0.4191.53`. Les huit artefacts sont sous
`docs/performance/runs/TASK-0022-*`. Les frappes probatoires sont fiables,
aucun clic programmatique n'est utilisé. Les 19 preuves X5 sont inchangées.

Limites : Beta/deep n'a pas de store intra par contrat historique; cette
absence reste explicite. `F-042`, H9, R8, P-19 et P-21 restent hors de cette
tranche. B0 n'est pas corrigé; employer `CARGO_INCREMENTAL=0` pour les
validations Rust si l'ICE réapparaît.

**Prochaine action unique : contrôle indépendant de `TASK-0022`.** Vérifier les
artefacts et le commit substantif, puis décider seul de `VERIFIED`. Ne pas
créer `TASK-0023` dans ce contrôle.

- **Dernière mise à jour :** 2026-09-02
- **Branche active :** **`build/v0.2-a5-interbrain-relations`**, créée depuis
  le tip **contrôlé** `8d1e27151f53d082551e05b00816100cb790542b` de
  `build/v0.2-a4-composed-view`
- **Dernière tâche vérifiée :** **`TASK-0021`, `VERIFIED`** le 2026-09-02, sur
  **re-contrôle indépendant ciblé**
  [`ACTION-0034`](../reviews/ACTION-0034-independent-recontrol.md) —
  **`CLOSED`**, `HEAD` contrôlé
  **`10cf54e31276edeb00bd99a5586578791d7b5bc2`**, `main` intacte `91bbe90f`.
  **`X7` `CLOSED`**, **`ACTION-0033` `CLOSED`**. Verdict **rendu par
  l'orchestrateur**, **enregistré** par l'exécuteur. **Livrable DOCUMENTAIRE :
  `VERIFIED` atteste que la CIBLE est correctement écrite, jamais qu'elle est
  implémentée**
- **Dernière tâche de code vérifiée :** **`TASK-0020`, `VERIFIED`** le
  2026-09-02, sur **contrôle indépendant**
  [`ACTION-0032`](../reviews/ACTION-0032-independent-control.md) — **`CLOSED`**,
  `HEAD` contrôlé **`9a7206a1e246258259096b1679f19ac5b53005d7`**, `main`
  intacte `91bbe90f`. Verdict **rendu par l'orchestrateur**, **enregistré** par
  l'exécuteur. **Sixième** tâche `VERIFIED` de l'étape A
- **Tâche vérifiée précédente :** **`TASK-0019`, `VERIFIED`** le 2026-09-02, sur
  re-contrôle indépendant
  [`ACTION-0031`](../reviews/ACTION-0031-independent-recontrol.md) — **réserve
  `X6` et `ACTION-0030` : `CLOSED`**, `HEAD` contrôlé `8d1e271`. La cible
  autrefois manquée de `L12` étape 7 a été **corrigée et `L12` rejoué en
  entier** avant ce verdict. `TASK-0018` est `VERIFIED` depuis le 2026-09-01,
  `TASK-0017` depuis le 2026-09-01, `TASK-0016` depuis le 2026-08-31
- **Tâche livrée, NON vérifiée :** **aucune**
- **Son contrôle indépendant s'est déroulé en DEUX temps, et il est clos :**
  [`ACTION-0033`](../reviews/ACTION-0033-independent-control.md),
  **`CHANGES_REQUIRED`** sur `HEAD` `68211c8`, puis **`CLOSED`**. **Le FOND
  avait été accepté en entier**; **aucune** de ses cibles n'est considérée
  implémentée. La réserve **`X7`** était **documentaire** : `X2` désignait
  **déjà** la réserve technique de `TASK-0016` (`ACTION-0026`, `CLOSED`), et
  `TASK-0021` avait réutilisé le même nom pour la correction de `P-02` —
  **deux sens simultanés**, refusés. **La correction de `P-02` s'appelle
  désormais `P02-R1`**, sur **22** occurrences dans **12** fichiers; **le `X2`
  de `TASK-0016` n'a pas bougé** et reste **`CLOSED`**; **la substance de
  `P-02` n'a pas changé**. **`X7` a été fermée** par
  [`ACTION-0034`](../reviews/ACTION-0034-independent-recontrol.md) sur `HEAD`
  `10cf54e` — **les sept points du périmètre gelé sont TENUS**, la collision
  documentaire est **éliminée**. **Aucune réserve n'est ouverte : `X1` à `X7`
  sont toutes `CLOSED`**
- **Ce que `TASK-0021` a livré :** cinq fiches `DEC-0019` à `DEC-0023`; la
  **correction normative `P02-R1`** de `P-02`, dont l'ancienne formulation est
  **conservée et visible**; **huit fonctions** `F-042` à `F-049`, matrice
  **41 → 49**; une **séquence de sept tranches futures**, `PROPOSED` et **non
  exécutée**. **Aucun layout, aucun moteur, aucune IA, aucun serveur
  implémenté.**
- **Ce que `TASK-0020` a livré, désormais `VERIFIED`** — **relations
  inter-cerveaux explicites**, sous
  [`DEC-0018`](../decisions/DEC-0018-explicit-interbrain-relations.md),
  fonction **`F-041`**. Gel `M1`–`M12` en `7746fd4`, **avant la première ligne
  de code** de la tranche. **`M1`–`M12` tenus**, `M12` aux **vingt-huit
  étapes** dans le vrai `WebView2`, **deux passes**, fermeture et redémarrage
  réels, **aucun indicateur faux** dans l'arbre de preuve.
- **Ce que la mesure a trouvé, publié tel quel :** **deux défauts**, corrigés
  **à la source** et non contournés dans la mesure — des classes `CSS`
  partagées entre panneaux et couches d'arêtes, qui faisaient compter `J12` et
  `L12` de travers alors que rien n'était cassé; et un contrôle `DOM` capturé
  avant un `await`, remplacé par un re-rendu. Après correction, `J12` et `L12`
  retrouvent **exactement** leurs valeurs d'origine.
- **Son contrôle indépendant a eu lieu :** `ACTION-0032`, `CLOSED`,
  `TASK-0020` **`VERIFIED`**. **`cek1` n'est accepté que comme repli déclaré,
  PAS comme `I-E` complète.** `R8` reste entière, `P-19` et `P-21` demeurent,
  `B0` n'est pas corrigé
- **`X5` couvre désormais les cinq preuves de `TASK-0020`** — `M12`
  `pass{1,2}`, `J12` intra, `L12` composée `pass{1,2}` — **et les gardes ont
  été étendues** par `TASK-0021` : **14 → 19 noms** dans les **trois** gardes.
  Testé : `vitest` 14/14, `cargo test map::commands::tests` 14/14, et le
  module PowerShell refuse effectivement les cinq. **Conséquence assumée :**
  les boutons `M12`, `J12` et `L12` du runtime livré n'écrivent plus — la porte
  refuse. Une tranche qui aurait besoin de rejouer l'un de ces scénarios
  **republie sous son propre nom de tâche**
- **Tâche IN_PROGRESS :** aucune
- **Porte `P4` :** **FRANCHIE** —
  [`DEC-0016`](../decisions/DEC-0016-p4-gate-crossing-and-first-slice.md)

## Où en est le projet

`ACTION-0025` a **clos** `TASK-0015` — contrôle accepté, `VERIFIED`, réserve
normative `X1` corrigée dans le même geste — et **franchi la porte `P4`**.

`TASK-0016` a ensuite produit **la première ligne de code de production du
projet**, et la chaîne complète existe : fixture synthétique → scan en lecture
seule → index SQLite persistant → calepinage → carte HTML/SVG accessible **dans
un véritable hôte Tauri/WebView2** → navigation → sélection → détails.

**Les onze critères gelés sont tenus**, et pour la première fois du projet des
temps d'image ont été relevés **dans le moteur de production**.

`ACTION-0026` a **contrôlé** cette tranche et rendu **`CHANGES_REQUIRED`** :
la réserve bloquante **`X2`** a établi que le runtime enregistrait encore huit
commandes héritées de la 0.1, dont un **sélecteur de dossier réel**. La
correction est faite — le gestionnaire n'expose plus que les neuf commandes de
la tranche — et **deux tests-gardes** empêchent la régression.

**Le re-contrôle indépendant a eu lieu, directement sur GitHub.** `X2` est
**`CLOSED`**, `ACTION-0026` est **`CLOSED`**, et **`TASK-0016` est
`VERIFIED`**. `R8` reste entière, `B0` reste non corrigé, **aucune conclusion
nouvelle sur le budget adaptatif**, et les **états de parité restent
strictement limités au périmètre déjà déclaré**.

## Ce qu'il faut savoir en douze lignes

1. **CarteTopo est la RÉFÉRENCE FONCTIONNELLE.** L'ancienne version publique de
   FileTopo est un **prototype et un audit technique**. « L'ancienne version ne
   le faisait pas » **n'est pas un argument recevable**.
2. **L'apparence est entièrement libre** et peut être **entièrement
   modernisée**; **aucune amélioration visuelle ne supprime la parité**. En cas
   de conflit, **la parité gagne**.
3. **Le contrat exigible est
   [`CARTETOPO_FUNCTIONAL_PARITY.md`](../product/CARTETOPO_FUNCTIONAL_PARITY.md)** :
   22 exigences, 3 invariants. **Six sont satisfaites sur le seul périmètre de
   la première tranche, deux sont partielles, seize ne sont pas commencées.**
4. **Correction `X1` :** une **suggestion n'est pas une provenance de
   relation**. Une relation établie a pour provenance **`déterministe`** ou
   **`approuvée`**, sans troisième valeur; une suggestion est un **objet et un
   état distincts**, affichable mais **jamais** comptée comme relation.
5. **`TASK-0016` est `IMPLEMENTED`, jamais auto-déclarée `VERIFIED`.**
6. **Les critères ont été gelés AVANT le code** — commit `6edd5bd`, code en
   `130b670`. **Aucun n'a été retouché après le premier résultat.**
7. **`H9` n'imposait aucune cible d'images par seconde.** Il n'y a **ni cible
   atteinte, ni cible manquée** à annoncer.
8. **`4,20 ms` est une butée**, pas une mesure : synchronisation verticale à
   4,1667 ms sur un écran 240 Hz. **Jamais citable comme performance.** Seuls
   `wide` (**17,80 ms**) et `mixed` (**21,35 ms**) sont au-dessus de la butée —
   valeurs du **binaire corrigé**, légèrement moins bonnes que celles de
   `8cb752b` et publiées telles quelles.
9. **`R8` n'est pas levée** et ne peut l'être qu'à l'**étape C** : une machine,
   un **binaire de développement**, des fixtures **≤ 2 420 nœuds**.
10. **Aucun budget adaptatif** n'est employé, adopté, abandonné ni validé. La
    borne `B-1` de 5 000 nœuds est un **plafond déclaré**, qui ne s'ajuste à
    rien. Réserve `W2` : **aucune stabilité n'est prouvée**.
11. **`B0` s'est reproduit trois fois et n'est pas corrigé.** **Ne rien
    supprimer** dans `src-tauri/target/` — `DEC-0013` E. Employer
    `CARGO_INCREMENTAL=0`.
12. **Aucune donnée réelle, aucun sélecteur de dossier, aucun chemin local
    personnel dans le dépôt** — artefacts de mesure compris.

## TASK-0018 — la troisième tranche, livrée et non vérifiée

**FileTopo a des cerveaux.** Un cerveau est une **identité FileTopo**, pas une
source : `brain-alpha` et `brain-gamma` lisent la **même** fixture
`quasi-empty` et sont totalement indépendants.

1. **Le `brain_id` est le nom d'un répertoire, pas une colonne.**
   `<bac>/brains/catalog.sqlite`, `<bac>/brains/<brain_id>/map/index.sqlite`,
   `<bac>/brains/<brain_id>/relations/relations.sqlite`. Deux cerveaux ne
   peuvent pas se rencontrer parce qu'ils **ne sont pas dans le même fichier**.
   **Ne pas remplacer cela par une colonne `brain_id` dans un magasin
   partagé** : ce serait rendre l'isolation dépendante d'une clause `WHERE`.
2. **L'index nomme le cerveau pour lequel il a été construit** — schéma
   **version 2**, `map_meta.brain_id`. `open_store` **refuse** un index
   construit pour un autre cerveau (`MapError::BrainMismatch`), et un index de
   version 1 n'est celui de personne. **Ne pas assouplir cette garde.**
3. **Un `node_id` ne voyage jamais seul.** `map_node_detail` et
   `map_relations_for_node` prennent un **`BrainNodeRef`**. **Ne jamais
   revenir à un `nodeId` nu** : après une bascule, l'interface tient encore la
   sélection du cerveau précédent, et `12` est valide dans les deux.
4. **Le seed du catalogue crée, il ne corrige jamais.** Un cerveau renommé
   reste renommé au démarrage suivant — `K7`. **Ne pas transformer le
   `INSERT … ON CONFLICT DO NOTHING` en upsert.**
5. **L'état de vue par cerveau est SESSION SEULEMENT.** Seuls le **cerveau
   actif** et les **métadonnées** survivent au redémarrage. **Ne pas prétendre
   que `P-19` est faite.**
6. **`K10` s'exerce par une vraie frappe Windows**, comme `J12` : le mécanisme
   est partagé dans `realInput.ts`. **Ne jamais remplacer la frappe par un
   `.click()`** — la preuve est `isTrusted` et les compteurs à zéro.
7. **Le menu du sélecteur ne se referme pas sur un `blur` à `relatedTarget`
   nul.** Ce n'est pas un détail : une **désactivation de fenêtre** produit ce
   `blur`, et refermer dessus faisait arriver la frappe réelle sur un bouton
   démonté. **Ne pas « simplifier » ce gestionnaire.**
8. **La vue n'est ajustée qu'une fois par cerveau** — `shouldFitOnOpen`. Un
   second ajustement, quand le viewport se stabilise, **effaçait** la vue
   qu'un cerveau venait de retrouver. **Ne pas remettre un `fitView`
   inconditionnel dans cet effet.**
9. **UNE EXÉCUTION D'UNE TÂCHE ULTÉRIEURE N'ÉCRASE JAMAIS LA PREUVE
   CANONIQUE D'UNE TÂCHE `VERIFIED`** — réserve `X5`. La règle est tenue **à la
   porte** : `write_run_artifact` refuse les noms de
   `PROTECTED_RUN_ARTIFACTS`, et tous les noms d'artefacts du runtime vivent
   dans `src/map/runArtifacts.ts`. **Ne jamais écrire un nom d'artefact en
   dur**, et ne jamais retirer un nom de la liste protégée pour « débloquer »
   un scénario : renommer le scénario, pas la preuve. `J12` migré écrit
   désormais `TASK-0018-J12-relations-regression-webview2.json`, **et il a été
   rejoué** dans l'hôte réel.
10. **Les campagnes de vérification et de mesure marchent par cerveau** et ne
    couvrent donc plus `wide` ni `mixed`. **Les artefacts publiés de
    `TASK-0016` sont inchangés** et restent le relevé pour ces deux fixtures.
11. **Ne pas afficher deux cerveaux dans le même graphique** (`TASK-0019`) et
    **ne créer aucune relation inter-cerveaux** (`TASK-0020`).
12. **`B0` s'est reproduit une quatrième fois.** Rien n'a été supprimé dans
    `src-tauri/target/`; `CARGO_INCREMENTAL=0` suffit.

### Comment rejouer `K12`

`K12` demande **deux processus et deux passes**, avec une fermeture et un
redémarrage **réels** :

    CARGO_INCREMENTAL=0 pnpm tauri build --debug --no-bundle
    rm -rf .filetopo-sandbox/brains          # repartir du catalogue neuf
    pwsh scripts/k12-run-real-host.ps1

**Le binaire doit être `debug`.** `map_write_run_artifact` n'existe qu'en
`debug` : un binaire `release` ne peut écrire aucune preuve, pas même son
abandon. La première tentative a été perdue exactement ainsi.

Le lanceur démarre `scripts/j12-send-real-key.ps1` pour la passe 1 — **le même
guetteur que `J12`**, sur la même convention de marqueur. Sans lui, `K10`
échoue, et c'est voulu.

## TASK-0017 — la deuxième tranche, VERIFIED

**Un modèle de provenance existe.** C'est la première fois du projet.

1. **La provenance est la table, pas une colonne.** `relations_deterministic`
   et `relations_approved` sont **deux tables séparées** — `DEC-0009` `R-C`.
   Il n'existe **aucune** colonne `provenance` qu'un `NULL` pourrait vider, et
   **aucune** colonne de règle dans la table des approuvées. Une relation
   établie sans provenance est **non représentable**, pas seulement interdite.
2. **Une suggestion n'est pas une relation** — correction `X1`. Table
   distincte, état propre, **jamais** dans un compte, et **seule** une
   approbation explicite la transforme.
3. **Aucun inverse n'est jamais déduit.** Aucune des deux règles n'est
   symétrique.
4. **Les relations vivent hors de l'index reconstructible :**
   `<bac à sable>/relations/<fixture>/relations.sqlite`. Une reconstruction
   complète de `maps/` n'y touche pas — vérifié sur les quatre fixtures.
5. **La clé d'endpoint `ek1|<fixture>|<chemin relatif>` n'est PAS `I-E`.**
   C'est le repli déterministe, déclaré comme tel. `VolumeSerialNumber` +
   `FileId`, déplacements et renommages réels restent entiers.
6. **Les relations ne sont ouvertes que pour `quasi-empty`**, la fixture gelée.
   Toute autre fixture est refusée **en toutes lettres** — la règle
   `homonymes` est quadratique et produirait des centaines de milliers de
   paires sur `wide`. **C'est une portée, pas une troncature.**
7. **`P-04` reste PARTIELLE** : la **révocation** d'une relation approuvée
   n'est pas implémentée, alors que la parité §5.2 l'exige. Déclarée manquante.
8. **Aucune mesure de performance n'a été prise et aucun seuil n'a été
   inventé** : `TASK-0017` n'en demandait aucun.
9. **La création d'une relation `APPROVED` est verrouillée par le stockage**
   — réserve `X3`. `approve()` est la **seule** voie applicative; le schéma de
   **version 2** ajoute `suggestion_key` **`UNIQUE`**, une **clé étrangère** et
   **trois déclencheurs** qui exigent que la ligne approuvée **soit exactement
   sa suggestion**. **Ne pas rouvrir cette porte** en ajoutant un chemin
   d'écriture.
10. **`J12` s'exerce par une vraie frappe clavier Windows** — réserve `X4`.
    Le scénario n'active rien : il attend `scripts/j12-send-real-key.ps1`.
    **Ne jamais remplacer la frappe par un `.click()`** : la preuve est
    `isTrusted` et les compteurs à zéro.
11. **Ne pas s'attribuer `VERIFIED`.** La tâche est `IMPLEMENTED`.

## Comment faire tourner la tranche

    pnpm install
    CARGO_INCREMENTAL=0 pnpm tauri dev

Les quatre fixtures sont **engendrées** au premier clic, dans
`.filetopo-sandbox/` — ignoré par Git, reproductible depuis les graines fixes
`20260831001` à `20260831004`.

Deux modes non surveillés, **développement seulement** :

    CARGO_INCREMENTAL=0 FILETOPO_AUTO_VERIFY=1 pnpm tauri dev     # lecture seule et isolation, par cerveau
    CARGO_INCREMENTAL=0 FILETOPO_AUTO_MEASURE=1 pnpm tauri dev    # campagne d'images, par cerveau
    CARGO_INCREMENTAL=0 FILETOPO_AUTO_RELATIONS=1 pnpm tauri dev  # rejoue J12 en regression
    FILETOPO_AUTO_BRAINS=1|2                                      # les deux passes de K12

Depuis `TASK-0018`, **les deux premières marchent par cerveau** : le runtime
n'expose plus aucune commande indexée par fixture. Elles couvrent donc
`quasi-empty` (deux fois) et `deep`, **et non** `wide` ni `mixed`.

Chacun écrit son artefact sous `docs/performance/runs/`.

**`J12` demande deux processus.** Le scénario n'active rien lui-même : il pose
le focus et attend une **vraie frappe Windows**. Rediriger la sortie vers un
fichier, puis, dans un autre terminal :

    pwsh scripts/j12-send-real-key.ps1 -LogPath run.log

Sans ce second processus, `J12` **échoue** — et c'est voulu : il ne se rabat
jamais sur un clic synthétique.

**Avant de rejouer `J12` :** remettre le magasin de relations **du cerveau**
à neuf — `rm -rf .filetopo-sandbox/brains/brain-alpha/relations` — pour que
`S-005` soit bien en attente, et **n'ouvrir qu'une seule instance de
l'application**. Deux instances partageant le même magasin produisent des
artefacts contradictoires; c'est arrivé, c'est déclaré, et les artefacts
concernés ont été détruits.

**Si une course reste muette :** la fenêtre doit rester visible. Chromium
suspend `requestAnimationFrame` pour une fenêtre occultée; la course échoue
alors explicitement au bout de 8 s au lieu d'attendre indéfiniment.

## Gouvernance en vigueur

Les **GO techniques** viennent de l'**orchestrateur technique**, sous
délégation de Sébastien. **Restent réservés à Sébastien**, sans délégation :
dépense, **donnée réelle ou personnelle**, publication externe exceptionnelle
(fusion vers `main`, PR, release, étiquette, nouveau distant), opération
destructive ou hors dépôt, **changement important de portée produit**.

## État Git

| Référence | SHA |
|---|---|
| `main` locale et distante | `91bbe90f0f99026c28cd345784d4f579a0016db2` — **non touchée** |
| `rebuild/v0.2-project-brain` | `db8d3de0b20e7efbfe463a17c218cc14face39a8` — **non touchée** |
| `spike/v0.2-technical-risk-gates` | `746f1b5f93c9d7085516c0e56473a95dc2c2d178` — **non touchée** |
| `spike/v0.2-render-budget` | `933bd0d5e7e05e4e7fe233c5fc6b9320a194264d` — **non touchée** |
| `spike/v0.2-budget-controller` | porte la clôture d'`ACTION-0025` |
| `build/v0.2-p4-vertical-slice` | branche de `TASK-0016`, voir `git rev-parse HEAD` |

Aucune fusion, aucune PR, aucune release, aucune étiquette, aucun `force push`,
aucune réécriture d'historique, aucune suppression de branche.

## Points ouverts

| # | Point | Ce qui est demandé |
|---|---|---|
| 1 | **Aucune tranche suivante n'a de fiche** | La spécifier et **geler ses critères avant tout code**. `P4` n'autorisait que `TASK-0016` |
| 1 bis | **La surface runtime doit rester celle de la tranche** | Les deux tests-gardes échouent si une commande hors tranche est réenregistrée. **Ne pas les contourner** |
| 2 | **Seize exigences de parité non commencées** | Chaque tranche suivante exige sa **propre fiche**, ses **critères gelés** et son **GO**. Les relations transversales portent la correction `X1` |
| 3 | **`P-12` et `P-06` sont partielles** | Masquage du panneau, survie au redémarrage, relations transversales et atténuation liée à `F-017` restent à faire |
| 4 | **`P-08` exige 100 000 nœuds** | La borne de 5 000 est une **limite de `TASK-0016`**, pas une limite produit |
| 5 | **Manque `M-1`** — persistance des préférences | À résoudre **avant** la tranche qui implémente réellement `P-19` — `DEC-0016` D |
| 6 | **`R8`** | En vigueur. **Levée seulement à l'étape C** |
| 7 | **Réserves `V1`–`V4`, `W1`–`W4`, `R2`–`R9`** | Toutes en vigueur; `R1` levée depuis `ACTION-0023` |
| 8 | **`B0`, `B3` inter-volume, `B4` question 3** | Inchangés. Le cache fautif est **conservé**; la question 3 se ferme **avant** l'identité persistante et l'état vu/non vu |
| 9 | **`P-21`** | Interface **en français seulement**; bilinguisme intégral et audit WCAG restent à faire |
| 10 | **Aucune réserve `X` ouverte** | `X1` à `X7` sont **toutes `CLOSED`**. `X7` a été fermée par [`ACTION-0034`](../reviews/ACTION-0034-independent-recontrol.md) le 2026-09-02 |

## Sessions : trois procédures partagées

`/debut-session`, `/reprise-session`, `/fermeture-session` côté Claude;
`$debut-session`, `$reprise-session`, `$fermeture-session` côté Codex. La
logique vit dans **`.orchestrator/protocols/`**, en un seul exemplaire; les
`SKILL.md` ne sont que des renvois.

**`.orchestrator/RESULT.md`** est le rapport compact de la **dernière
exécution seulement**, commité et poussé — c'est lui que l'orchestrateur lit
avant de contrôler GitHub, ce qui permet au rapport terminal de rester court.

## Prochaine action unique

**Le réalignement produit est FIGÉ et `VERIFIED`.** `TASK-0021` est
`VERIFIED`, `X7` et `ACTION-0033` sont `CLOSED`, **aucune réserve n'est
ouverte**, aucune tâche n'est `IN_PROGRESS` ni `IMPLEMENTED` en attente.

**Première tranche d'implémentation de la cible post-réalignement :
`TASK-0022` — layout topographique hiérarchique à nœuds/cartes et connexions
explicites**, sous
[`DEC-0020`](../decisions/DEC-0020-topographic-node-graph.md) et **`P02-R1`**.
Elle devra **remplacer la représentation principale imbriquée par une vraie
topographie à nœuds reliés**, **sans supprimer les capacités `VERIFIED`
existantes**. Détail dans [NEXT_ACTION.md](NEXT_ACTION.md).

**`TASK-0022` n'est ni créée ni exécutée à ce stade.** Le **prochain prompt de
l'orchestrateur** définira son architecture, ses fixtures, ses critères gelés,
sa compatibilité multi-cerveaux, ses relations intra et inter-cerveaux, son
`pan`/`zoom`, son clavier, ses labels et ses tests réels `WebView2`.

## Commandes sûres

    git rev-parse --show-toplevel
    git branch --show-current
    git rev-parse HEAD
    git status --short
    git log --oneline 73f0327..HEAD
    git show 6edd5bd --stat    # TASK-0016 : le gel, AVANT tout code
    git show 130b670 --stat    # TASK-0016 : le premier code de production
    git show 51a8cac --stat    # TASK-0017 : le gel, AVANT tout code
    git show a98676e --stat    # TASK-0017 : le premier code de production
    git show 8a259e9 --stat    # TASK-0017 : les corrections X3 et X4
    git show 51bb687 --stat    # TASK-0018 : le gel, AVANT tout code
    git show 4cb1cf4 --stat    # TASK-0018 : le premier code de production
    git show 2424ef2 --stat    # TASK-0018 : les preuves K11 et K12

    CARGO_INCREMENTAL=0 cargo test --manifest-path src-tauri/Cargo.toml --lib
    pnpm check && pnpm test

## Message court pour Claude Code

Lance `/debut-session`. Elle lit ce qu'il faut, dans l'ordre, et rien de plus.

`TASK-0012` à `TASK-0018` sont **closes et `VERIFIED`** — `TASK-0018` par
`ACTION-0029`, qui a clos `X5`. **`TASK-0019` est `IMPLEMENTED`** : gel
`L1`–`L12` commité avant tout code, douze critères tenus, preuves publiées. Son
contrôle indépendant, `ACTION-0030`, a rendu **`CHANGES_REQUIRED`** sur une
seule réserve, **`X6`** — `L12` étape 7 exigeait d'**approuver** `S-005` dans
Alpha, et l'**acte** n'avait pas eu lieu. Elle est **corrigée, `L12` rejoué en
entier, et `X6` reste `OPEN`** : `TASK-0019` **attend son re-contrôle**, sur
`X6` **uniquement**.

**FileTopo est multi-cerveaux** — `DEC-0017`. **Un `brain_id` n'est pas un
`fixture_id`** : deux cerveaux peuvent partager une source et **doivent** rester
indépendants. **Un `node_id` seul n'est jamais une identité globale.**
**Deux cerveaux s'affichent maintenant dans le même graphique** — un canevas
`SVG`, un territoire chacun, `TASK-0019`. **Composer est un affichage :**
ajouter ou retirer ne touche ni catalogue, ni index, ni relation, ni source.
**Un `id` DOM est namespacé par `brain_id`** — `brain-alpha-map-node-4` — parce
que deux cerveaux sur une même source portent le même `node_id`. **Ne crée
aucune relation inter-cerveaux** — c'est `TASK-0020`. **Ne persiste aucune
composition** — c'est `P-19`; au redémarrage, le cerveau actif seul.

**Une preuve devenue canonique ne se supprime pas non plus depuis un script.**
La porte d'écriture de l'application ne dit rien d'un outil qui la contourne :
`scripts/*-run-real-host.ps1` portent une liste protégée et refusent d'y toucher.

**Le bac à sable `<dépôt>/.filetopo-sandbox` est persistant**, et rien
n'annule une approbation. Un scénario qui approuve `S-005` sans vérifier
qu'elle est en attente échoue à sa deuxième exécution — **et l'effacer serait
une suppression, réservée à Sébastien.** Quand un scénario de preuve a besoin
d'un état **neuf**, il ne supprime rien : il demande un **namespace** avec la
variable de développement `FILETOPO_SANDBOX_VARIANT`, et travaille sous
`<dépôt>/.filetopo-sandbox/variants/<variant>`. **Variable absente :
comportement exactement inchangé.** La valeur est un **nom**, jamais un chemin
— basename ASCII `[A-Za-z0-9_-]`, 1 à 64 caractères; tout le reste est une
**erreur explicite**. **N'ajoute ni sélecteur de dossier, ni racine choisie par
l'utilisateur, ni commande de remise à zéro au runtime.**

**Une tranche suivante exige sa propre fiche, ses critères gelés d'avance et
son propre GO.** Ne t'attribue pas `VERIFIED`.

**Une suggestion n'est jamais une relation** — correction `X1`. **La provenance
d'une relation établie n'a que deux valeurs**, et c'est la table qui la porte.
**`approve()` est la seule voie vers une relation approuvée**, et le stockage
l'impose — réserve `X3`. **N'implémente aucune heuristique réelle de
suggestion.** **Ne prétends pas que `ek1` implémente `I-E`.**

**N'ouvre pas Canvas 2D ni WebGL.** **Ne reprends aucun contrôleur de budget de
spike.** **Ne corrige pas `B0` et ne supprime rien** dans `src-tauri/target/`.
**Ne cite jamais 4,20 ms comme une performance** — c'est une butée de
synchronisation verticale. **Ne lève pas `R8`.** Ne fusionne rien, ne crée ni
PR, ni release, ni étiquette.

---

## Depuis `TASK-0020` — les relations inter-cerveaux

**Une relation entre deux cerveaux n'appartient à aucun des deux.** Elle vit
dans `brains/interbrain/relations.sqlite`, **à côté** des cerveaux et dans aucun
d'eux, **hors** de tout `map/` qu'un rebuild remplace, **distinct** du
catalogue. **Ne la range jamais dans le magasin privé d'un cerveau** : une
reconstruction de ce cerveau détruirait un lien dont l'autre est la moitié.

**`source_brain_id` doit différer de `target_brain_id`**, et c'est un `CHECK`,
pas une convention. **Il n'y a pas de colonne `provenance`** : la table où vit
une ligne *est* sa provenance, comme dans `TASK-0017`. **`approve()` est la
seule voie** vers une relation `APPROVED`, et les déclencheurs l'imposent sur
les **six** champs. **N'invente jamais l'inverse d'une relation.**

**`cek1` n'est pas `I-E`.** C'est le repli déterministe : un déplacement ou un
renommage réel casserait une extrémité, et rien ne prétend le contraire.

**Le magasin ignore la composition.** Une relation vers un cerveau non affiché
— ou dont l'index n'a jamais été construit — revient quand même, et
l'interface le **dit** : « hors de la vue ». **Suivre une relation est une
navigation** : elle ajoute le cerveau à la vue et **ne crée, ne modifie ni
n'approuve rien**.

**Deux panneaux, deux espaces de noms `CSS` disjoints; deux couches d'arêtes,
deux classes disjointes.** Ce n'est pas cosmétique : les scénarios `J12` et
`L12` comptent `.relations__direction .relation__link` et `.map-edge` sur tout
le document, et une classe partagée leur fait compter les mauvais éléments —
la même faute qu'un `id` `DOM` pour deux cerveaux. **N'ajoute jamais une classe
`relation__*`, `relations__*`, `suggestion*` ou `map-edge` à un élément
inter-cerveaux.**

**Ne capture pas un contrôle `DOM` avant un `await` pour le presser après** :
un re-rendu peut l'avoir remplacé, et la frappe part dans le vide. Re-interroge
au moment de presser.

**N'implémente aucune détection automatique entre cerveaux**, aucune
heuristique, aucun glisser-déposer, aucun éditeur manuel de relations. **Ne
fusionne jamais deux cerveaux.**

## X8 — une preuve se dérive, elle ne se recopie pas

`M12.28` affirmait « j'écris sous ma propre tâche » en comparant le nom qu'il
venait d'écrire à un préfixe `TASK-0020-` **écrit à la main**, et annonçait le
nombre de preuves protégées par un **littéral**. Les deux étaient vrais quand
ils ont été écrits. La migration des noms sous `TASK-0022` a rendu le premier
faux, et deux extensions de `X5` ont rendu le second périmé — sans que rien
n'échoue, parce qu'une affirmation recopiée ne peut pas se contredire.

**Ne réécris jamais un constat que le produit peut calculer.** L'identité de
tâche se lit dans le nom d'artefact — `artifactTaskId()` — et la tâche
propriétaire se **découvre** en analysant toutes les destinations —
`runtimeWriteOwnership()`. Le nombre de noms protégés est la **longueur** de
`PROTECTED_RUN_ARTIFACTS`, jamais un chiffre. La source canonique reste la
garde Rust `PROTECTED_RUN_ARTIFACTS: [&str; 19]` de
`src-tauri/src/map/commands.rs` — celle qui refuse réellement l'écriture; un
test lit ce source et échoue si le miroir TypeScript diverge.

**Corollaire pour la tranche suivante :** ne « répare » pas ce genre de défaut
en remplaçant `TASK-0022` par `TASK-0023`. Le remplacement littéral reconduit
la panne d'un cran. Un test de garde interdit désormais, dans toute source
d'écriture, `startsWith("TASK-00xx-")` et tout compte de noms protégés écrit en
chiffres ou en lettres.


> **Relais 2026-09-23 — prochaine exécution : TASK-0038.** TASK-0037 est VERIFIED; ACTION-0063 ferme la porte public-readiness. La prochaine tranche est `F-028` : état vu/non-vu dérivé du journal selon DEC-0036. Le booléen `nodes.seen` reste historique et ne doit pas devenir la vérité de `new/unseen`. F-022/F-030/F-031 restent hors portée. Lire `.orchestrator/NEXT_PROMPT.md` sur `build/v0.2-a22-v1-seen-state`.


> **Relais 2026-09-23 — TASK-0039 prête.** TASK-0038 est VERIFIED par ACTION-0064. La suite est F-022/P-09 : filtres dynamiques côté Index, exacts et bornés, avec projection spécialisée matches + ancêtres de contexte. Aucun calcul NEW/UNSEEN via `nodes.seen`; aucune sérialisation whole-corpus. Lire DEC-0037, TASK-0039 puis `.orchestrator/NEXT_PROMPT.md` sur `build/v0.2-a23-v1-dynamic-filters`.


> **Relais 2026-09-23 — TASK-0040 prête.** TASK-0039 est VERIFIED par ACTION-0065. La suite n’est pas encore le watcher : DEC-0010 exige d’abord U-B, un noyau d’application différentielle interne. TASK-0040 doit muter uniquement les nœuds touchés, garder identité/journal/seen-state atomiques et mesurer le critère F-031 sur 1k/10k/100k. `map_refresh` reste inchangé dans cette tranche. Lire DEC-0038, TASK-0040 puis `.orchestrator/NEXT_PROMPT.md` sur `build/v0.2-a24-v1-incremental-apply`.


> **Relais 2026-09-24 — TASK-0041 prête.** TASK-0040 est VERIFIED par ACTION-0067 et le critère F-031 canonique passe à 1,533. La prochaine étape ne construit pas encore le watcher : elle branche U-B dans le vrai bouton Actualiser. Sur un Index estampé : scan manuel complet, réconciliation en lot minimal, `apply_update_batch`; no-op = pas de révision. Première indexation/restamp legacy et Reconstruire restent full explicites. Lire DEC-0039, TASK-0041 puis `.orchestrator/NEXT_PROMPT.md` sur `build/v0.2-a25-v1-manual-refresh-incremental`.


> **Relais 2026-09-24 — TASK-0042 prête.** TASK-0041 est VERIFIED par ACTION-0068. Avant le watcher, la prochaine fondation est l'état de source : dernière observation UNKNOWN/SYNCED/UNAVAILABLE/SOURCE_CHANGED/SCAN_INCOMPLETE/APPLY_FAILED, persistée sans chemin sensible, avec dernier Index fiable toujours servi. Aucun watcher/W-B/W-C dans cette tranche. Lire DEC-0040, TASK-0042 puis `.orchestrator/NEXT_PROMPT.md` sur `build/v0.2-a26-v1-source-availability`.



> **Relais 2026-09-24 — TASK-0042 exécutée, en attente de contrôle.** La dernière observation de la source (`UNKNOWN`/`SYNCED`/`UNAVAILABLE`/`SOURCE_CHANGED`/`SCAN_INCOMPLETE`/`APPLY_FAILED`, raison fermée, sans chemin) est persistée par cerveau dans `catalog_meta`, écrite par le vrai `publish_map`, relue par `Ouvrir` sans source et par `map_source_observation(brainId)` après un échec. **Ne fais aucun watcher ici** : `F-030` doit passer par cette machine d'état puis W-B/W-C, et un signal « source absente » ne devient jamais un lot de suppressions. **N'écris jamais l'observation dans l'Index** (deux commits assumés, fenêtre de crash bornée par la règle « un `SYNCED` d'une autre révision se lit `UNKNOWN` »). **Ne classe jamais sur le texte d'une erreur** : `classify_scan_error`, `probe_root`, `MapError::RefreshRootChanged`, `Refused::apply`. Pour un rejeu WebView2 : `pnpm tauri build --debug --no-bundle` (un simple `cargo build` pointe sur `localhost:1420`) et `pwsh`, pas Windows PowerShell 5.1. Lire VALIDATION section BW puis `.orchestrator/RESULT.md`.


> **Relais 2026-09-24 — TASK-0043 prête.** TASK-0042 est VERIFIED par ACTION-0070. Tous les prérequis watcher sont en place. La prochaine tranche implémente F-030 selon DEC-0010/DEC-0041 : lecteur Windows natif borné, événements seulement comme hints, W-B ciblé, W-C sur perte/restart/doute, U-B pour appliquer, root guard F-032, fallback périodique si native indisponible. Lire DEC-0041, TASK-0043 puis `.orchestrator/NEXT_PROMPT.md` sur `build/v0.2-a27-v1-watcher-reconciliation`.


> **Relais 2026-09-25 — TASK-0044 prête.** TASK-0043 est VERIFIED par ACTION-0072. Le prochain écart est la reprise par cerveau : caméra/focus/sélection, filtre et panneau Détails. Réutiliser BrainCatalog/catalog_meta, CompositionSessionMemory, viewState/clampView et useProjectionFilter; aucune nouvelle DB ni localStorage. P-19 reste partielle : FR/EN, accessibilité et composition multi-brain persistante sont hors tranche. Lire DEC-0042, TASK-0044 puis `.orchestrator/NEXT_PROMPT.md` sur `build/v0.2-a28-v1-brain-resume-state`.


> **Relais 2026-09-25 — TASK-0045 prête.** TASK-0044 est VERIFIED par ACTION-0073. ACTION-0074 choisit le dernier écart utilisateur nommé de P-20 : le catalogue et `map_brain_update` savent déjà persister nom/couleur/icône, mais `MapApp` ne permet pas de les éditer. TASK-0045 doit réutiliser ce backend, sans nouveau store, sans toucher la source, le watcher, l'Index ou le resume state. FR/EN est confirmé manquant mais reste hors tranche. Lire DEC-0043, TASK-0045 puis `.orchestrator/NEXT_PROMPT.md` sur `build/v0.2-a29-v1-brain-identity-editor`.


> **Relais 2026-09-25 — ACTION-0075.** TASK-0045 est VERIFIED et P-20 est CLOSED / VERIFIED. Le prochain écart V1 déjà confirmé est F-035 : le runtime courant `MapApp` reste français seulement alors que le prototype historique possède `src/lib/locale.ts`. Ne pas rouvrir P-20 sans nouvelle preuve.


> **Relais 2026-09-25 — TASK-0046 prête.** TASK-0045 est VERIFIED; P-20 est CLOSED / VERIFIED. ACTION-0076 confirme que le runtime courant `MapApp` reste français seulement. Réutiliser `src/lib/locale.ts` et localiser toute chaîne produit visible/aria sans nouveau backend ni système i18n. F-036 / WCAG global reste hors tranche. Lire DEC-0044, TASK-0046 puis `.orchestrator/NEXT_PROMPT.md` sur `build/v0.2-a30-v1-complete-fr-en-runtime`.

## Relais — TASK-0050 corrective `BLOCKED` sur `node-diagnostic` — 2026-09-28

- Exécution de `.orchestrator/NEXT_PROMPT.md`. Texte/test `node-cross-linked`
  corrigés et sûrs (committés). 23/24 clés validées en WebView2 réel par une
  séquence de gestes produit; `node-diagnostic` bloqué par un invariant Rust
  vérifié (`src-tauri/src/map/commands.rs:745-749`, aucune voie d'acceptation
  d'un index avec diagnostic). Changement Rust nécessaire, hors périmètre
  sans GO explicite (TASK-0050 §K).
- Décision de Sébastien : documenter, s'arrêter, ne committer que le
  correctif sûr. Aucun artefact `TASK-0050-webview2.json` republié.
- Prochaine action : Sébastien tranche entre amender DEC-0048 §C ou autoriser
  le changement Rust minimal. Détail :
  `docs/tasks/TASK-0050-v1-runtime-legend-p10.md` section O.

## Relais — TASK-0050 §Q — 21/23 clés atteignables reproductibles — `BLOCKED` — 2026-09-28

- ACTION-0087 a levé le blocage `node-diagnostic` (amendement de preuve, pas
  de Rust). Cette passe rend le harnais WebView2 réellement reproductible :
  jonction NTFS réelle pour `node-skipped`, activation **clavier** correcte
  des pastilles d'agrégat (`focus()` + `Enter` — un clic souris brut est
  silencieusement absorbé par le pan du canvas SVG), révélation récursive
  par ancêtres pour les nœuds imbriqués, assertion stricte d'égalité des 23
  clés atteignables (plus un sous-ensemble), preuve `node-diagnostic`
  réellement exécutée par le harnais (`pnpm vitest run
  src/map/mapLegend.test.tsx` invoqué depuis le script), signatures
  calculées carte ↔ légende réellement comparées (pas seulement enregistrées).
- 21 des 23 clés atteignables se matérialisent de façon répétable. Les deux
  qui résistent — `intra-approved`, `intra-suggestion` — ont chacune leurs
  deux extrémités visibles au moment de la lecture (prouvé par d'autres
  arêtes touchant les mêmes nœuds), mais l'arête elle-même ne se rend jamais
  quel que soit l'ordre de révélation essayé. Cause non confirmée : détail
  complet dans `docs/tasks/TASK-0050-v1-runtime-legend-p10.md` section Q.2.
- Aucun nouvel artefact `TASK-0050-webview2.json` publié : une preuve 21/23
  ne satisfait pas l'égalité stricte exigée par ACTION-0087.
- Seuls `scripts/task0050-webview2.mjs` et `src/map/mapLegend.test.tsx`
  modifiés; 632/632 tests frontend, check, build, Tauri debug, diff check et
  audit public PASS. Aucun Rust touché.
- **TASK-0050 = `BLOCKED`.** Prochaine action pour l'orchestrateur technique
  ou Sébastien : instrumenter `MapApp.tsx`/`composedScenario` pour observer
  `brain.relations`/`byId` en direct, ou accepter un scénario de preuve avec
  une fixture dédiée plus petite. Aucune TASK-0051.

## Relais — TASK-0055 / F-046 `IMPLEMENTED` — contrôle indépendant attendu — 2026-10-07

- Branche `build/v0.2-a39-v1-physical-identity-closure`, synchronisée en
  fast-forward depuis `7f86417` (base d'orchestration `393ac6d`). `main`
  intacte, aucun PR, aucune étiquette, aucune release.
- `DEC-0052` appliquée : `nodes.id` = occurrence, clé `SYSTEM` = objet physique
  Windows partageable. Le refus `IdentityCollision` d'une source à hard links est
  levé; `PATH_FALLBACK` dupliqué reste refusé.
- Ce qu'un contrôleur doit relire en premier : `identity::pair_group` (la règle,
  écrite une fois), `index.rs::publish` (groupes + migration `6 → 7`),
  `incremental.rs` (le noyau **vérifie** l'appariement, il ne le redérive plus),
  `scope.rs::reconcile_scopes` (complétion de l'image d'un groupe partiel) et
  `content_signals.rs::MapResolver` (classification fermée, un seul handle par
  page).
- Ce qui mérite d'être attaqué en premier, honnêtement : la **complétion d'image**
  de `W-B` est l'endroit où une lecture partielle pourrait encore mal conclure.
  Elle est prouvée sur deux topologies (alias dans un sous-dossier non listé,
  deux occurrences dans un même dossier listé), pas sur toutes.
- Preuve réelle : `docs/performance/runs/TASK-0055-webview2.json`, deux processus,
  digest `22dfc466…`, HEAD testé `d0502fa1`.
- Détail des validations : `docs/ai/VALIDATION.md` section **DK**. Rapport
  compact : `.orchestrator/RESULT.md`.
- `TASK-0055` et `F-046` restent `IMPLEMENTED` / candidates. Aucune `TASK-0056`
  n'est créée; le choix de la tranche suivante appartient à l'orchestrateur,
  après un audit V1 final comme `ACTION-0102` §9 le demande.
