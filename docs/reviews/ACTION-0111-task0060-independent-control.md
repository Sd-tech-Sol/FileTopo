# ACTION-0111 — Contrôle indépendant TASK-0060 : correction ciblée exigée

**Date :** 2026-10-09  
**Orchestrateur :** ChatGPT, relecture indépendante de GitHub; aucune exécution locale de Windows/WebView2/pnpm.  
**Branche :** `build/v0.2-b03-primary-chrome`  
**HEAD contrôlé :** `79128682d61cedf22b39ea18fb1f022c33149c39`  
**HEAD déclaré comme testé après correctif :** `a645303631db59063b463bc4d44f0cf4f95bc258`

## Verdict

**TASK-0060 = IMPLEMENTED / NOT VERIFIED — CORRECTION REQUIRED.** La tranche est largement fonctionnelle, mais le contrat d'organisation primaire/avancée n'est pas entièrement satisfait en fenêtre minimale. Ne pas créer TASK-0061 ni démarrer Stage C/D avant cette correction et un nouvel audit.

## Ce qui est réellement contrôlé

- Ref distant de B03 et sept commits descendants de `a03b8bc0a3ed75abca10012cdbbea5a4fc090663`; diff : `MapApp.tsx`, `map.css`, `mapStrings.ts`, `responsiveLayout.test.ts`, scripts et preuves, docs seulement; aucun backend, Rust, index, modèle, IPC, lockfile, `MapView.tsx` ou géométrie métier modifié.
- Depuis `a645303631db59063b463bc4d44f0cf4f95bc258` jusqu'au HEAD contrôlé, deux commits de **preuves et documentation seulement**; aucun produit ou harnais changé.
- JSON `TASK-0060-primary-chrome-{before,after}.json` lus directement sur GitHub (~1,19 Mo pour AFTER). Révision corrigée du harnais : les limites d'un élément tiennent compte de **tous ses ancêtres défilants**, et le test de pointage porte sur l'intersection réellement visible. `before.headTested = a03b8bc...`, `after.headTested = a645303631db59063b463bc4d44f0cf4f95bc258`.
- Les 12 captures sont présentes; images AFTER `960x640-fr-light`, `960x640-fr-light-compact-legend`, `1280x800-fr-light` inspectées visuellement. La carte apparaît dans les trois; les boutons de chargement sont rognés en 960 confortable.
- Preuves positives : `primaryContractSatisfied=true` (13 commandes/13 ont une surface cliquable visible dans 18/18 états), **mais `primaryContractSatisfiedWhole=false`** et `worstPrimaryFullyVisible=10/13`. 59 contrôles dans DOM (28 dans disclosures fermés), 0 scroll horizontal, 0 perte de contrôle, caméra et sélection stables lors des redimensionnements; 3 disclosures natifs testés par Tab/Enter, fermeture sans perte de focus; redémarrage P-19 avec disclosures non persistés; P-22 empreintes strictes et d'accès identiques, 160 entrées, zéro artefact.
- Carte visible minimum 240px et maximum 474px, aucun scroll document. P-02/P-05/P-07/P-11/P-21 ciblés. Axe-core 4.13.0 : 0 violation détectée, **contraste INCOMPLETE**; pas de lecteur d'écran.
- Tests pnpm 770/770 deux fois, check/build, diff --check sont **rapportés par Claude, non rejoués indépendamment**. Les API GitHub Actions / check runs / commit statuses retournent 0 sur ce HEAD; **aucune CI vérifiée**.

## Blocage produit vérifié : B03-O1

Dans la capture FR clair, taille cliente `960x640` et densité `comfortable`, les boutons essentiels `brain-add-real-root`, `lifecycle-open`, `lifecycle-refresh` ne montrent chacun que **20px de 35px**. Ils sont partiellement visibles et cliquables par un point de test, mais leur **libellé et zone visuelle sont coupés par la bande défilante**. Les résumés `chrome-advanced-tools` et `chrome-diagnostics` sont situés à **25px** et **70px au-dessous du pli**; ils sont atteints après avoir défilé la bande, **non découvrables visuellement à l'ouverture**. Cela contrevient à l'objectif de TASK-0060 de rendre les commandes primaires réellement visibles et les outils avancés clairement découvrables dès le départ à 960×640. La métrique `onScreen` ne doit pas être prise pour `fullyVisible`.

L'hypothèse d'une impossibilité arithmétique avec le layout actuel (176px de chrome contre 281px de contenu) est documentée, **pas une preuve qu'aucune autre organisation compacte des mêmes éléments n'est possible**. Une solution peut revoir le placement ou la compaction des lignes d'en-tête / composition / contrôles / résumés, sans déplacer le moteur et sans réduire la carte sous sa baseline B02 de 240px.

## Correction strictement autorisée — même tâche, même branche

1. Corriger `B03-O1` **dans TASK-0060** : les 13 commandes usuelles doivent être **entièrement** lisibles et actionnables à `960x640` en FR/EN, clair/sombre, densité confortable ainsi que compacte; les accès avancés/diagnostics doivent être immédiatement et explicitement découvrables, visibles au premier écran ou par un point d'entrée nommé déjà visible. Pas de défilement requis pour découvrir l'existence des outils.
2. Préserver les 59 commandes, les trois groupes ou leur équivalent natif sans nouvelle dépendance, la caméra, l'état, les 22 exigences de Stage A, la carte visible **≥240px**, focus/clavier, P-19/P-22, zéro scroll du document et zéro horizontal.
3. Étendre les critères automatiques : `primaryContractSatisfiedWhole=true`, `worstPrimaryFullyVisible=13` à toutes les 18 mesures; la découverte des outils avancés doit être **une mesure interactionnelle explicite** et un test hit-test / aria / clavier, plutôt qu'une simple présence DOM.
4. Vérifier le comportement réel des commandes transférées derrière `<details>` (notamment exclusions, checks et options carte) et les dépendances des harnais historiques; jsdom ne simule pas les disclosures fermés. Ne pas effacer / affaiblir les témoins existants.
5. Publier une nouvelle campagne WebView2 native, captures AFTER actualisées, codes/test complet, P-19/P-22, limites et éventuels échecs. Si cela exige des fichiers interdits ou une régression, **BLOCKED et STOP** avec explication, pas d'invention de PASS.
6. Commits non forcés sur B03 et arrêt. Contrôle indépendant ChatGPT **après** push, statut agent `IMPLEMENTED` ou `BLOCKED`, jamais `VERIFIED`.

## État de phase

Stage A = CLOSED / VERIFIED. B01/B02 = VERIFIED. B03 = **NOT VERIFIED** jusqu'à levée de B03-O1. Stage B = IN_PROGRESS, non CLOSED; P-01..P-22 relecture complète avant fermeture B. Stage C/D non commencées, R8 non levée. `main` inchangée.
