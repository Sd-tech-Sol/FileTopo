# ACTION-0113 — Contrôle indépendant TASK-0061 : B04 correction ciblée

**Date :** 2026-10-09  
**Rôle :** ChatGPT, orchestrateur / vérificateur indépendant (lecture du dépôt et des preuves, non exécution de WebView2).  
**Branche contrôlée :** `build/v0.2-b04-multibrain-shell`  
**HEAD distant contrôlé :** `b964c45359bf2427d38ce177c09119ca5195a417`  
**HEAD produit testé :** `9b68c1ac6b1ebc9f199cfdd25376e0fcc7eebf99`

## Verdict

**TASK-0061 = IMPLEMENTED / NOT VERIFIED — CORRECTION REQUIRED.**

Claude a effectivement terminé son exécution et poussé 14 commits sur la branche B04; son rapport reste correctement IMPLEMENTED. Le correctif de pastilles et menu multi-cerveaux est robuste sur les critères primaires, mais **deux éléments d'acceptation B04 ne sont pas vérifiés / ne passent pas**. Même branche, même tâche, aucun démarrage TASK-0062/Stage C/D.

## Contrôles indépendants effectués

- Ref B04 réel `b964c45359bf2427d38ce177c09119ca5195a417`. Diff depuis préparation ACTION-0112 : `CompositionBar.tsx`, `map.css`, tests `brains.test.tsx` et `responsiveLayout.test.ts` et scripts/artefacts/docs; aucun Rust/`src-tauri`, Index, SQLite, IPC, `MapView.tsx`, `viewState`, `resumeState`, dépendance, lockfile ni référence personnelle modifiée. De `9b68c1ac6b1ebc9f199cfdd25376e0fcc7eebf99` au HEAD, seulement deux commits de scripts/preuves/docs, pas de code UI.
- JSON réels GitHub lus : `TASK-0061-multibrain-shell-{after,previous-product}.json` (30 états pass1; redémarrage pass2 et retrait de cerveau pass3), `TASK-0061-b03-baseline-harness-on-b04.json` (18 états, baseline B03 sans régression), `TASK-0061-status-visibility-{after,previous-product}.json`. PNG inspectés visuellement : 960 multi FR, 960 menu EN sombre, 960 notice FR, 960 restored, 1280 FR.
- Succès **portée vérifiée** : dans 30/30 états, 13/13 commandes primaires entières et accessibles, pastilles/× et éléments de menu entiers; nom long conservé dans `title` et nom accessible, actif identifié en mots. Carte visible 253,4–496px (>=240); 0 scroll horizontal/document, caméra stable et navigation à focus explicite. P-19 / P-22 source stricte + accès identiques sur quatre racines synthétiques, 0 artefact sous racines. Baseline B03 18/18=13/13 et trois groupes entiers; contre-épreuve sur ancien produit donne 9/13 au pire et révèle les défauts.
- Tests `pnpm test 787/787` deux fois, check/build/diff-check, 0 axe violations, 0 erreur console fatale : **rapportés par Claude** et artefacts examinés; aucun test Windows/pnpm exécuté indépendamment par ChatGPT. Rust non rejoué, car inchangé. Aucun résultat CI distant connu.
- Le harnais distingue `onScreen`, `fullyVisible`, clippage par ancêtre, souris/Tab, accessibilité et effet du popover. Nous ne convertissons ni axe `color-contrast INCOMPLETE` ni absence de lecteur d'écran en certification WCAG.

## Réserve bloquante B04-O1 : entrée Diagnostics couverte par le menu ouvert

La tâche spécifie que les trois disclosures gardent une **entrée visible et activable**, y compris avec la composition et le menu exercés. Or l'artefact AFTER expose explicitement :
- `pass1.verdict.groupEntryPointsWholeEveryState = false`;
- `statesWithAGroupEntryPointNotWhole` : **six états** (à 960, 1280 et 1366 lorsque menu de composition ouvert), tous `chrome-diagnostics` recouvert par `composition-menu-layer`;
- `statesWhereGroupActivationWasNotMeasured` : les **mêmes six états**.

Ce n'est pas le même type de régression que les commandes principales, qui restent 13/13. Mais on ne peut pas qualifier le critère de groupes comme intégralement PASS en écartant les six états les plus exigeants. Au besoin, démontrer formellement une interaction de menu **modale** et la récupération de l'accès au groupe par fermeture clavier/souris, ou déplacer la surcouche sans masquer son point d'entrée et sans recouvrir la carte. Le contrat actuel n'a **aucune exception explicitement approuvée** pour une entrée masquée lors du menu ouvert. Ne pas modifier le verdict dans le harnais pour le rendre vert artificiellement.

## Réserve bloquante B04-O2 : retours d'erreur invisibles à 960

La même tâche imposait de mesurer les états d'erreur/statut et de corrections de composition. `TASK-0061-status-visibility-after.json` indique :
- à `960x640` : statut `Index absent` et statut de refus `Composition refused` visibles sur **0px des 35px** chacun, entièrement sous le pli de `.app__chrome` dès émission;
- en pass3 `960x640` corrections après disparition d'un cerveau : panneau 0/154px en FR confortable et 51,6/138px en EN compact; bouton de fermeture 0px visible dans les deux;
- à `1280x800` FR confortable, fermeture de corrections partiellement visible (11/35px). Le contrôle peut être atteint en défilant mais un refus invisible est un retour utilisateur insuffisant. Cela existait en partie avant B04 : **dette héritée mais désormais démontrée**, pas changement silencieusement attribué au patch.

**Décision :** ces retours d'échec doivent être lisibles / accessibles au déclenchement, sans scroll préalable de la bande ni suppression de la carte; et le contrôle de fermeture doit être utilisable. Une présentation native (statut ou région de notice annoncée et visible) ou autre solution UI minimale est acceptable, sans nouvelle logique métier, pas de nouvelle dépendance ou de perte des 13 primaires/carte.

## Autres limites, non bloquantes après correction

- À 960 quand Diagnostics est **ouvert**, son `summary` peut quitter la zone visible (six états), mais le clavier et le défilement de la bande permettent de le fermer. Vérifier que ce mouvement reste compréhensible et sans piège, ne pas refuser pour la seule présence de scroll intérieur volontaire.
- Quatre pastilles à 960 peuvent ne montrer que 4–8 caractères de chaque nom; titres complets et noms accessibles publiés. Si on augmente le nombre de cerveaux, ce confort visuel pourra être revu dans une autre tranche; la tâche B04 se limite aux scénarios de 2–4 cerveaux synthétiques.

## Correction autorisée

**Même TASK-0061 sur `build/v0.2-b04-multibrain-shell`** :
1. mesurer et corriger B04-O1 et B04-O2 sans perdre le gain B04, le menu clavier/Escape/clic, les trois groupes, les 13 commandes et le plancher carte 240px;
2. utiliser seulement `src/map/CompositionBar.tsx`, `src/map/MapApp.tsx`, `src/map/map.css`, éventuellement chaînes FR/EN existantes dans `mapStrings.ts` si réellement indispensable; petits tests directement concernés et scripts `task0061-*` permis;
3. mettre à jour le harnais avec des critères honnêtes : menu ouvert vs fermable/entrée de groupe, statuts/corrections et fermeture **pleinement visibles à l'apparition** et vérifiés par interaction. Conserver contre-épreuve et baseline B03 ;
4. rejouer les 30 états + passes 2/3, captures à `scrollY=0`, tests frontend/TS/build, P-19/P-22, aucune écriture racine; si les critères sont incompatibles avec scope, `BLOCKED` documenté et STOP, **pas** de TASK-0062;
5. Claude consigne `IMPLEMENTED` ou `BLOCKED`, commit/push B04, puis stop. ChatGPT seul accorde VERIFIED.

Stage A = CLOSED/VERIFIED, B01–B03 = VERIFIED, B04 = **NOT VERIFIED**, Stage B = IN PROGRESS / NOT CLOSED. Stage C/D et R8 non commencées, `main` inchangée.
