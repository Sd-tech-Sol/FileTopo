# TASK-0016 — P4-1 : tranche verticale de production minimale

- **Identifiant :** `TASK-0016`
- **Titre :** Première tranche de code de production — **une tranche verticale
  minimale** de la racine synthétique jusqu'à la carte sélectionnable, dans un
  **véritable hôte Tauri/WebView2**
- **Statut :** **`IMPLEMENTED`** le 2026-08-31 — **jamais `VERIFIED`**.
  Contrôle indépendant
  [`ACTION-0026`](../reviews/ACTION-0026-independent-control.md) →
  **`CHANGES_REQUIRED`**, réserve bloquante **`X2`** corrigée, **re-contrôle
  attendu** — voir §15.
  Porte `P4` franchie par
  [DEC-0016](../decisions/DEC-0016-p4-gate-crossing-and-first-slice.md);
  critères **gelés avant exécution** en §12; résultat en §13
- **Phase :** étape **A** de la feuille de route — parité fonctionnelle MVP,
  première tranche
- **Proposée le :** 2026-08-31
- **Rédacteur de la fiche :** Claude Code, sous le GO technique de
  l'orchestrateur pour `TASK-0015`
- **Exécuteur :** Claude Code, session `filetopo-p4-vertical-slice`
- **GO d'exécution :** **ACQUIS** le 2026-08-31 — GO technique de
  l'orchestrateur nommant cette fiche, après le franchissement de `P4`
- **Branche :** `build/v0.2-p4-vertical-slice`, créée depuis le tip contrôlé
  `73f03273101f43096bafd4ac634253a2dd3dd5a9` **après** le commit documentaire
  de clôture d'`ACTION-0025`

> **§1 à §11 sont le texte d'origine du 2026-08-31, conservé intact.** Elles
> décrivaient une tâche qui ne s'exécutait pas encore. **Elles ne sont pas
> réécrites** : le **gel** et l'**exécution** s'ajoutent en §12 et suivantes.
>
> **§12 fige, avant la première ligne de code**, les critères `H1` à `H11`, les
> quatre fixtures et la borne de charge. **Rien de §12 ne se retouche après le
> premier résultat.**

## 1. Ce qui doit être vrai avant que cette fiche puisse démarrer

| # | Préalable | État au 2026-08-31 |
|---|---|---|
| 1 | Le **réalignement produit `TASK-0015`** est contrôlé par une instance distincte de son exécuteur | **non fait** |
| 2 | La porte **`P4`** est **franchie**, explicitement et par écrit | **non franchie** |
| 3 | Un GO d'exécution nomme cette fiche | **non acquis** |

**Tant que ces trois lignes ne sont pas vraies, aucune ligne de code de
production ne peut être écrite.**

## 2. Pourquoi une tranche verticale, et pas l'application

**Une tranche verticale traverse toutes les couches sur un périmètre étroit**,
plutôt que de construire une couche entière sur tout le périmètre. Le motif est
mesuré, pas théorique.

Trois campagnes de spike — `B2`, `B2 bis`, `B2 ter` — ont produit des chiffres
sur **Edge et Chrome**, et **jamais** sur le moteur de production. `DEC-0014` F
a établi que WebView2 **n'est pas instrumentable sans hôte embarqueur**, et que
l'écart avec Edge et Chrome est **NON MESURÉ**. Sur 18 couples non butés,
Chrome rend entre **0,50 et 0,71** fois les images par seconde d'Edge, sur la
même machine et la même page : **le moteur pèse au moins autant que le
mécanisme.**

**Conséquence :** la première chose que le code de production doit produire
n'est pas une fonctionnalité de plus, c'est **un hôte réel dans lequel mesurer
quoi que ce soit ait un sens**. Une tranche étroite l'atteint en semaines
plutôt qu'en mois, et transforme les hypothèses restantes en observations.

**Ce que la tranche n'est pas :** ni une maquette, ni un prototype jetable, ni
une reprise du code des spikes. C'est du **code de production**, écrit pour
durer, sur un périmètre volontairement petit.

## 3. Objectif unique

**Faire exister, en code de production et dans un véritable hôte
Tauri/WebView2, la chaîne complète : racine synthétique → scan → index
persistant → calepinage → carte en blocs hiérarchique → sélection → détails
avec parent et enfants directs.**

Rien d'autre.

## 4. Périmètre — les six exigences de parité couvertes, et aucune autre

| Exigence | Ce que la tranche doit satisfaire | Fonctions |
|---|---|---|
| `P-01` | La carte est construite depuis l'arborescence réellement observée, sans configuration ni catégorie codée en dur | `F-001`, `F-003`, `F-006`, `F-007` |
| `P-02` | Blocs hiérarchiques lisibles : aucune dimension nulle, aucun chevauchement entre frères, inclusion visuelle = relation parent/enfant | `F-007`, `F-008` |
| `P-03` | Parent et enfants directs visibles et atteignables depuis n'importe quel nœud | `F-016` |
| `P-11` | Panoramique, zoom borné, ajuster à l'écran, réinitialiser — souris **et** clavier | `F-009` à `F-012` |
| `P-12` | Panneau de détails : nom, type, chemin réel, taille, dates, parent, enfants, diagnostics d'accès **affichés** | `F-023` |
| `P-22` | **Aucun changement physique de l'arborescence analysée**, contrôlé par empreinte avant/après | `I-1`, `I-2` |

**Partiellement couverte, et déclarée telle :** `P-06`, pour la **seule**
sélection et l'accentuation **hiérarchique** — parent et enfants directs. Ni
relations transversales, ni atténuation liée à `F-017`.

**Explicitement hors périmètre de cette tranche**, et à reprendre dans des
tranches suivantes de l'étape **A** : `P-04`, `P-05`, `P-07` — relations
transversales, directions, panneau des relations —; `P-08`, `P-09` — recherche
et filtres —; `P-10` — légende —; `P-13` — contenu direct listé —; `P-14`,
`P-15` — copier le chemin, ouvrir dans l'Explorateur —; `P-16`, `P-17`,
`P-18` — changements, vu/non vu, surveillance —; `P-19`, `P-20` — persistance
des préférences, plusieurs cerveaux —; `P-21` — FR/EN complet.

**`P-21` mérite une précision.** L'accessibilité **clavier** de `P-11` et
`P-12` est **dans** le périmètre, parce qu'un parcours au clavier qu'on ajoute
après coup se reconstruit. Le **bilinguisme intégral** et l'**audit WCAG
complet** n'y sont pas.

## 5. Ce que la tranche doit produire

### 5.1 Chaîne fonctionnelle

1. **Hôte Tauri réel**, qui démarre sur Windows et charge l'interface dans
   **WebView2**.
2. **Choix d'une racine** parmi des **fixtures synthétiques du dépôt**,
   uniquement. **Aucun sélecteur de dossier réel dans cette tranche** : le
   point d'arrêt « donnée réelle » reste réservé à Sébastien.
3. **Scan** de l'arborescence, en **lecture seule stricte**.
4. **Index persistant**, schéma versionné, **reconstructible** : supprimer
   l'index et relancer produit un index équivalent.
5. **Calepinage** produisant des blocs hiérarchiques. **`CAL-B` est le candidat
   le mieux mesuré, et rien de plus** — `DEC-0015` D. Le code doit traiter le
   calepinage comme un **coût d'indexation**, payé une fois par arborescence,
   **jamais** comme un coût par image.
6. **Rendu** de la carte, **sélection** souris et clavier, **navigation**
   `P-11`, **panneau de détails** `P-12`.

### 5.2 La charge doit être bornée, et déclarée

**`DEC-0015` F l'impose :** cette tranche **n'embarque aucun budget de rendu
adaptatif**. Aucun contrôleur de `TASK-0013` ni de `TASK-0014` ne peut être
repris, en tout ou en partie.

**Elle doit donc borner sa charge autrement, et l'écrire dans la fiche avant
d'exécuter :** une volumétrie maximale de fixture, une profondeur maximale, ou
un plafond de blocs construits — **au choix de l'exécuteur, mais déclaré
d'avance et non retouché ensuite**.

**Interdit :** fixer une constante de budget « au jugé » et la présenter comme
mesurée. **Interdit :** ne rien déclarer.

### 5.3 Première mesure honnête dans WebView2

Une fois l'hôte réel existant, la tranche relève — **pour la première fois du
projet** — des temps d'image et une latence de sélection **dans WebView2**, sur
ses fixtures.

**Ces mesures ne lèvent pas `R8` à elles seules** : la réserve porte sur la
transposabilité à la production dans son ensemble, et sa levée appartient à
l'étape **C**. Elles constituent le **premier point de comparaison réel** entre
le moteur de production et les mesures de spike, et **ce seul écart est déjà un
livrable**.

## 6. Critères d'acceptation — à figer avant exécution

Ils devront être **écrits, commités et non retouchés** avant la première
exécution, sur le modèle de `TASK-0013` et `TASK-0014`. Les énoncés ci-dessous
sont la **trame à compléter**, pas des critères figés.

| # | Trame d'énoncé falsifiable |
|---|---|
| `H1` | Sur **quatre** fixtures synthétiques de formes différentes — large, profonde, mixte, quasi vide —, l'ensemble des nœuds cartographiés **égale** l'ensemble attendu, nœud par nœud |
| `H2` | Aucun bloc de dimension nulle, aucun chevauchement entre frères, et l'inclusion visuelle reproduit la relation parent/enfant **sur chaque nœud** |
| `H3` | Parent et enfants directs affichés **égalent** ceux de l'index, pour **chaque** nœud des quatre fixtures |
| `H4` | Panoramique, zoom borné, ajuster et réinitialiser sont atteignables **à la souris et au clavier**; **aucun état de vue hors bornes n'est atteignable**; « réinitialiser » reproduit exactement la vue d'ouverture, comparée paramètre par paramètre |
| `H5` | Le panneau de détails affiche des valeurs **égales à l'index** pour chaque nœud, **diagnostics d'accès compris**, jamais masqués |
| `H6` | **Empreinte de la fixture identique avant et après** une session complète exerçant `H1` à `H5`; **aucun fichier de FileTopo dans la racine analysée** |
| `H7` | Supprimer l'index puis relancer produit un index **équivalent** — mêmes nœuds, mêmes relations hiérarchiques; l'état non reconstructible est **énuméré** |
| `H8` | L'application **démarre et rend dans WebView2** sur Windows; le moteur employé et sa version sont **relevés et déclarés** |
| `H9` | Temps d'image et latence de sélection relevés **dans WebView2**, sur les fixtures, avec **médiane et écart min–max**, **cinq exécutions**; l'écart avec les mesures Edge et Chrome des spikes est **publié tel quel**, sans être expliqué a posteriori |
| `H10` | Le calepinage est payé **une fois par arborescence**, mesuré séparément du coût par image |
| `H11` | La borne de charge de §5.2 est **déclarée avant exécution** et **respectée** |

**Une cible manquée se publie comme manquée.** Aucune ne se réécrit après coup.

## 7. Conditions d'arrêt immédiat

L'exécution **s'arrête et demande**, sans contourner, si :

1. une étape exigerait une **donnée réelle**, un fichier ou un dossier de
   l'utilisateur — **point d'arrêt réservé à Sébastien**;
2. une action écrirait **hors du dépôt public**, hors de l'espace applicatif
   normal de l'application en cours d'exécution;
3. une action **modifierait** un élément de l'arborescence analysée —
   invariant `I-1`;
4. une **dépendance nouvelle** serait nécessaire sans être justifiée et
   approuvée;
5. l'état Git observé **diffère** de l'état attendu;
6. la portée s'élargit au-delà de §4 — **notamment** vers les relations
   transversales, la surveillance, la recherche ou plusieurs cerveaux;
7. il faudrait **reprendre un contrôleur de budget** de `TASK-0013` ou
   `TASK-0014` — `DEC-0015` F l'interdit.

## 8. Portes

| Porte | Objet | État |
|---|---|---|
| **P4** | **Autoriser la première tâche d'implémentation** | **Ouverte, non franchie.** Cette fiche ne peut pas démarrer avant |
| P5 | GO de Sébastien pour publication externe exceptionnelle, dépense, donnée réelle, opération destructive ou hors dépôt | Permanente |

**Qui franchit `P4`.** `TASK-0012` §18 la définit comme « autoriser la première
tâche d'implémentation, après lecture des verdicts ». C'est une **porte
technique**, que la délégation du 2026-08-31 place chez l'**orchestrateur
technique** — **sauf si Sébastien choisit de la reprendre**, ce qu'il peut
faire à tout moment. La décision de la franchir **n'est pas prise par cette
fiche**.

## 9. État final attendu

**`TASK-0016` se terminera `IMPLEMENTED`, jamais `VERIFIED`.** L'exécuteur ne
juge pas ses propres preuves.

## 10. Historique de l'état

- 2026-08-31 — `PROPOSED` : fiche rédigée par `TASK-0015`, **non approuvée,
  non exécutée**. Aucune ligne de code, aucune mesure, aucune branche créée.
- 2026-08-31 — `APPROVED` : porte `P4` **franchie** par `ACTION-0025` et
  `DEC-0016`; GO technique de l'orchestrateur nommant cette fiche.
- 2026-08-31 — **GEL** : §12 écrite et commitée **avant toute modification de
  code**, sur `build/v0.2-p4-vertical-slice`. Critères `H1` à `H11`, quatre
  fixtures et borne de charge **figés**.

## 11. Ce que cette fiche ne fait pas

Elle **n'exécute rien**, **ne franchit pas `P4`**, **n'écrit aucune ligne de
code**, **ne crée aucune branche**, **n'installe aucune dépendance** et **ne
mesure rien**. Elle ne lève aucune réserve : `V1` à `V4`, `W1` à `W4` et `R2` à
`R9` restent en vigueur.

---

## 12. GEL AVANT EXÉCUTION — écrit et commité avant la première ligne de code

- **Date du gel :** 2026-08-31
- **Branche :** `build/v0.2-p4-vertical-slice`
- **Autorité :** `ACTION-0025` `D7` et `DEC-0016` C

> **Rien de cette section ne se retouche après le premier résultat.** Une cible
> manquée **se publie comme manquée**. Un critère qui s'avère mal posé **se
> déclare bloqué**, comme `G3` de `TASK-0014`; il ne se réécrit pas.

### 12.1 Les quatre fixtures synthétiques — graine et structure figées

**Toutes sont générées par du code déterministe du dépôt**, à partir d'une
graine fixe et d'une règle structurelle écrite ici. **Aucune donnée réelle,
aucun contenu utilisateur, aucun nom personnel.** Le contenu des fichiers est
un texte synthétique dérivé du chemin relatif.

| Fixture | Graine | Règle structurelle figée | Borne de nœuds |
|---|---|---|---|
| `QUASI_EMPTY` | `20260831001` | racine; 2 dossiers de premier niveau; le premier contient 3 fichiers; le second contient 1 sous-dossier de 2 fichiers et 1 fichier; 2 fichiers à la racine | **≤ 25** |
| `DEEP` | `20260831002` | chaîne de **39 dossiers imbriqués** `niveau-01` … `niveau-39`; **chaque** niveau contient 2 fichiers **et** 1 dossier vide `annexe`. **Profondeur maximale = 40**, atteinte par les fichiers et l'`annexe` du niveau 39 | **≤ 500** |
| `WIDE` | `20260831003` | racine; 12 dossiers de premier niveau; **chacun** 20 sous-dossiers; **chaque** sous-dossier contient entre **5 et 11** fichiers, tiré de la graine | **≤ 3 000** |
| `MIXED` | `20260831004` | six branches de formes différentes : `large` 20 sous-dossiers de 10 à 20 fichiers; `profond` chaîne de 30 niveaux de 2 à 4 fichiers; `plat` un seul dossier de 1 200 à 1 800 fichiers; `equilibre` 8 fois 8 sous-dossiers de 5 à 12 fichiers; `vide` 4 dossiers vides; `noms` 60 fichiers à noms longs et non ASCII | **≤ 5 000** |

**Aucune fixture de cette tranche ne dépasse 5 000 nœuds.**

**Ce que cette borne est, et ce qu'elle n'est pas.** C'est une **limite de
`TASK-0016`**, choisie pour que la tranche soit exécutable et mesurable
aujourd'hui. **Ce n'est pas une limite produit finale**, ni un plafond de
capacité, ni une mesure. Le contrat de parité exige, lui, `P-08` sur
**100 000 nœuds** : cette volumétrie appartient aux tranches suivantes de
l'étape **A**.

**Le nombre exact de nœuds produit par chaque graine est un résultat**, publié
après exécution. Seules la **graine**, la **règle** et la **borne** sont
figées ici.

### 12.2 La borne de charge de §5.2 — déclarée d'avance

| # | Borne | Valeur figée |
|---|---|---|
| `B-1` | **Plafond de nœuds par carte**, appliqué par l'indexeur | **5 000**. Au-delà, la construction **échoue avec une erreur explicite**. **Aucune troncature silencieuse**, aucun échantillonnage, aucun niveau de détail |
| `B-2` | **Profondeur maximale de fixture** | **40** |
| `B-3` | **Aire minimale d'un bloc de calepinage** | **2 400 unités² de l'espace de calepinage**. **C'est un choix, pas une mesure**, et il se déclare comme tel |
| `B-4` | **Bornes de zoom** | de **0,25 fois** à **4 096 fois** l'échelle d'ajustement, calculées par carte à l'ouverture. **Aucun état hors bornes n'est atteignable** |

**`B-1` est la borne exigée par `DEC-0015` F.** Elle est un **plafond de blocs
construits**, exprimé et appliqué, **pas** un budget adaptatif : elle ne
s'ajuste à rien, ne mesure rien et ne se règle pas en cours d'exécution.

**Aucun contrôleur de `TASK-0013` ni de `TASK-0014` n'est repris, en tout ou en
partie.**

### 12.3 Critères d'acceptation figés — H1 à H11

| # | Énoncé falsifiable, figé |
|---|---|
| `H1` | Sur **les quatre** fixtures, l'ensemble des chemins relatifs présents dans l'index **égale** l'ensemble attendu calculé indépendamment par le générateur de fixture, **et** l'ensemble réellement présent sur disque énuméré par un parcours indépendant. **Trois ensembles, une seule égalité.** Toute différence est un échec |
| `H2` | Sur **les quatre** fixtures, pour **chaque** nœud : largeur et hauteur **strictement positives**; pour **chaque** paire de frères : aire d'intersection **nulle**; pour **chaque** enfant : rectangle **entièrement contenu** dans celui de son parent. **Zéro violation** exigée |
| `H3` | Pour **chaque** nœud des quatre fixtures, le parent et l'ensemble des enfants directs rendus par l'API de détail **égalent** ceux obtenus par une requête indépendante sur l'index |
| `H4` | Panoramique, zoom, ajuster et réinitialiser sont atteignables **à la souris et au clavier**; sur une séquence pseudo-aléatoire de **10 000 opérations** de vue, **aucun état hors des bornes `B-4` n'est atteignable**; « réinitialiser » reproduit **exactement** la vue d'ouverture, comparée **paramètre par paramètre** — échelle, translation en x, translation en y |
| `H5` | Le panneau de détails affiche, pour chaque nœud, des valeurs **égales à l'index** : nom, type, chemin relatif, taille, date de modification, parent, nombre d'enfants, **et diagnostics d'accès**. Les diagnostics sont **affichés**, jamais masqués |
| `H6` | **Empreinte de la fixture identique avant et après** une session complète exerçant `H1` à `H5` — noms, structure, contenu, tailles et horodatages de modification. **Aucun fichier de FileTopo dans la racine analysée** |
| `H7` | Supprimer le fichier d'index puis relancer produit un index **équivalent** : mêmes nœuds, même hiérarchie, **mêmes rectangles de calepinage**, comparés par empreinte. **L'état non reconstructible est énuméré**, jamais présumé vide |
| `H8` | L'application **démarre et rend dans WebView2** sur Windows. Le **moteur employé et sa version** sont **relevés et déclarés** |
| `H9` | Temps d'image et latence de sélection relevés **dans WebView2**, sur les quatre fixtures, **cinq exécutions par fixture**, avec **médiane** et **écart min–max**. **`H9` n'impose aucune cible d'images par seconde.** Le succès est d'**obtenir honnêtement les mesures** et de les **publier sans sélection favorable** : toutes les exécutions comptent, et la pire est citée avec la médiane. L'écart avec les mesures Edge et Chrome des spikes est **publié tel quel**, **sans être expliqué a posteriori**. **Les performances finales appartiennent à l'étape C** |
| `H10` | Le calepinage est payé **une fois par arborescence** : son coût est mesuré **séparément** du coût par image, et le nombre d'invocations du calepinage pendant la navigation est **exactement zéro** |
| `H11` | Les bornes `B-1` à `B-4` de §12.2 sont **déclarées avant exécution** — le présent commit le prouve — et **respectées**. Un dépassement de `B-1` produit une **erreur explicite**, jamais une troncature |

### 12.4 Ce que l'exécution n'a pas le droit de faire

En plus des conditions d'arrêt de §7, **figées ici** :

- **aucune donnée réelle**, **aucun sélecteur vers un dossier utilisateur** —
  la seule source est une fixture synthétique générée par le dépôt;
- **aucune relation transversale** — `P-04`, `P-05`, `P-07` sont hors
  périmètre;
- **aucune recherche, aucun filtre, aucune légende, aucun watcher, aucun
  journal de changements, aucun état vu/non vu, aucun multi-cerveaux**;
- **aucun contrôleur de budget** de `TASK-0013` ni de `TASK-0014`;
- **ni Canvas 2D, ni WebGL** — le rendu est **HTML/SVG accessible**;
- **`CAL-B` est un candidat technique, pas une obligation visuelle** :
  l'apparence reste libre, et **aucune fonction de parité couverte ne peut
  être sacrifiée au calepinage**. Si le calepinage rend une exigence
  inatteignable, **c'est l'algorithme qui cède**;
- **aucune écriture ni modification dans les fixtures analysées** après leur
  matérialisation — invariant `I-1`;
- **aucune suppression, aucun nettoyage, aucun renommage** dans
  `src-tauri/target/` — `DEC-0013` E. Si le défaut `B0` se reproduit, il est
  **enregistré comme reproduction connue** et contourné par
  `CARGO_INCREMENTAL=0` **pour les builds de cette tâche seulement**. **`B0`
  n'est pas corrigé par cette tranche**, et rien ne peut le laisser entendre;
- **aucune dépendance nouvelle** sans arrêt préalable, justification et
  licence rapportées.

### 12.5 Où vivent les données d'exécution

- **La fixture analysée** est matérialisée dans un **bac à sable contrôlé**,
  hors de l'arborescence versionnée du dépôt — `.filetopo-sandbox/`, ignoré
  par Git — en développement, et dans l'**espace applicatif** de l'application
  en production. **Elle n'est jamais un dossier de l'utilisateur.**
- **L'index et tout état de FileTopo** vivent **hors de la racine analysée** —
  invariant `I-2`.
- **Les tests automatisés** travaillent dans des **répertoires temporaires**.
- **Aucun dossier utilisateur n'est lu, listé ni écrit.**

### 12.6 État final attendu

**`TASK-0016` se termine `IMPLEMENTED`.** L'exécuteur **ne s'attribue pas
`VERIFIED`**. L'action suivante sera le **contrôle indépendant** de cette
tranche.

---

## 13. Résultat — état `IMPLEMENTED`

- **Date :** 2026-08-31
- **Branche :** `build/v0.2-p4-vertical-slice`
- **Journal, preuves et verdicts :**
  [TASK-0016-p4-vertical-slice-results.md](../research/TASK-0016-p4-vertical-slice-results.md)
- **Mesures :** [PERF-0006](../performance/PERF-0006-p4-vertical-slice.md)
- **Preuves brutes :** `docs/performance/runs/`

### 13.1 Les onze critères gelés sont tenus

| Critère | Verdict |
|---|---|
| `H1` plan = disque = index, sur les quatre fixtures | **TENU** |
| `H2` aucune dimension nulle, aucun chevauchement, inclusion = hiérarchie | **TENU**, 0 violation |
| `H3` parent et enfants directs = index, pour chaque nœud | **TENU**, 0 écart |
| `H4` souris **et** clavier, aucun état hors bornes sur 10 000 opérations, réinitialisation exacte | **TENU** |
| `H5` détails = index, diagnostics d'accès **affichés** | **TENU**, 0 écart |
| `H6` empreinte de la source identique avant/après | **TENU**, 4 fixtures sur 4 |
| `H7` index supprimé puis reconstruit, équivalent; non reconstructible **énuméré** | **TENU** — `built_unix_ms` |
| `H8` démarre et rend dans **WebView2 `151.0.4129.107`** | **TENU** |
| `H9` temps d'image et latence, **5 exécutions par fixture**, publiées sans sélection | **TENU** — aucune cible n'était fixée |
| `H10` calepinage payé **une fois** par arborescence, 0 appel en navigation | **TENU**, < 1 % de la construction |
| `H11` bornes `B-1` à `B-4` déclarées d'avance et respectées | **TENU** |

**Aucun critère n'a été retouché après le premier résultat.**

### 13.2 Fixtures réalisées

| Fixture | Nœuds obtenus | Plafond gelé | Profondeur |
|---|---:|---:|---:|
| `QUASI_EMPTY` | 12 | 25 | 3 |
| `DEEP` | 157 | 500 | **40** |
| `WIDE` | 2 207 | 3 000 | 3 |
| `MIXED` | 2 420 | 5 000 | 32 |

### 13.3 Ce qui n'est pas prouvé

- **`R8` n'est pas levée** et ne peut pas l'être ici : une machine, un écran
  240 Hz, un **binaire de développement**, des fixtures ≤ 2 420 nœuds.
- **Les valeurs de 4,20 ms sont butées** par la synchronisation verticale à
  4,1667 ms — elles disent que le rendu tient dans une image, pas ce qu'il coûte.
- **`P-21` n'est pas satisfaite** : interface **en français seulement**, aucun
  audit WCAG complet, aucun lecteur d'écran réel.
- **Seize exigences de parité restent entières**, dont toutes les relations
  transversales.
- **`B0` s'est reproduit deux fois et n'est pas corrigé**; rien n'a été
  supprimé de `src-tauri/target/`.
- **Aucun budget adaptatif** n'est employé, adopté, abandonné ni validé.

### 13.4 Trois défauts de protocole, trouvés et corrigés avant la campagne publiée

Fenêtre occultée suspendant les images, carte mesurée à 1 × 1 pixel, remise en
page pendant la course. Chacun aurait produit un chiffre flatteur; chacun est
décrit en §10 du journal avec ce qu'il aurait produit. **Aucune mesure
n'existait avant ces corrections.**

### 13.5 État de chaque exigence de parité touchée

Conformément à §8.2 du contrat de parité, qui exige qu'une tranche déclare
l'état de chaque exigence qu'elle touche.

| Exigence | État déclaré |
|---|---|
| `P-01` carte construite depuis l'arborescence réelle | **satisfaite sur ce périmètre** — prouvée par `H1`, sur ≤ 2 420 nœuds |
| `P-02` blocs hiérarchiques lisibles | **satisfaite sur ce périmètre** — prouvée par `H2` |
| `P-03` parent et enfants directs | **satisfaite sur ce périmètre** — prouvée par `H3` |
| `P-11` panoramique, zoom borné, ajuster, réinitialiser | **satisfaite sur ce périmètre** — prouvée par `H4` |
| `P-12` panneau de détails | **partielle** — contenu et diagnostics prouvés par `H5`; le **masquage** et la **survie au redémarrage** sont hors périmètre |
| `P-22` aucun changement physique | **satisfaite sur ce périmètre** — prouvée par `H6`, à rejouer à chaque tranche |
| `P-06` sélection et accentuation | **partielle**, déclarée telle d'avance — sélection et accentuation **hiérarchique** seulement |

**Aucune autre exigence n'est touchée**, et aucune n'est déclarée satisfaite
sans preuve.

## 14. Historique de l'état, suite

- 2026-08-31 — `IN_PROGRESS` : branche `build/v0.2-p4-vertical-slice`, arbre
  Git propre vérifié, aucune autre tâche `IN_PROGRESS`.
- 2026-08-31 — **`IMPLEMENTED`** : la chaîne verticale existe en code de
  production et tourne dans un véritable hôte Tauri/WebView2; les onze critères
  gelés sont tenus et les preuves sont commitées. **`VERIFIED` appartient au
  contrôle indépendant.** L'exécuteur ne juge pas ses propres preuves.

---

## 15. Réserve bloquante X2, et correction

Émise par le contrôle indépendant
[`ACTION-0026`](../reviews/ACTION-0026-independent-control.md), qui a rendu
**`CHANGES_REQUIRED`** après examen direct du commit `8cb752b`.

### 15.1 Le défaut

L'`invoke_handler` **actif du produit courant** enregistrait encore huit
commandes héritées de la 0.1 — `list_collections`, `choose_collection`,
`index_collection`, `cancel_indexing`, `index_progress`,
`query_collection_nodes`, `mark_node_seen`, `reveal_indexed_node` — et
initialisait `tauri_plugin_dialog`, en contradiction avec **§12.4**.

**Une commande enregistrée est invocable depuis la WebView**, qu'un bouton la
propose ou non : un **sélecteur de dossier réel** se trouvait à un `invoke` de
distance d'une tranche dont la seule source doit être les fixtures
synthétiques. Le défaut était né **par addition** — les commandes de la tranche
ajoutées sans que celles du prototype soient retirées.

### 15.2 La correction

| # | Geste |
|---|---|
| `C1` | L'`invoke_handler` n'enregistre plus que les **neuf commandes `map_*`** |
| `C2` | `tauri_plugin_dialog::init()` **retiré** du runtime |
| `C3` | `.manage(IndexJobs)` retiré — il ne servait qu'aux commandes non exposées |
| `C4` | **Code historique conservé** : aucune fonction supprimée, `src/App.tsx` et ses 12 tests intacts, aucun historique réécrit |
| `C5` | **Deux tests-gardes**, éprouvés en réintroduisant temporairement le défaut |

**La dépendance `tauri-plugin-dialog` reste au manifeste** : ce n'est pas un
nettoyage général, et aucune nécessité de la retirer n'a été démontrée.

### 15.3 Les cinq capacités interdites, vérifiées

Sélecteur de dossier utilisateur, enregistrement ou indexation d'une racine
réelle, recherche dans une ancienne collection, marquage vu/non vu, ouverture
de l'Explorateur : **aucune n'est atteignable par un chemin normal de
l'application courante**. Le détail figure en §4 d'`ACTION-0026`.

**Portée exacte de la garantie :** le code du prototype **existe toujours**
dans le binaire; il est **inatteignable**, pas absent — c'est le compromis
qu'impose la conservation du code historique.

### 15.4 Validation rejouée

42 tests Rust, 59 tests TypeScript, **0 avertissement** en configuration
livrée. `H1` à `H11` rejoués dans le véritable hôte, **`H9` complet** : 4
fixtures × 5 exécutions, **protocole gelé inchangé**.

**Aucun critère `H1` à `H11` modifié. Aucune borne `B-1` à `B-4` retouchée.
Aucune optimisation de performance. Aucune dépendance nouvelle.**

**`H9` est légèrement moins bon** sur le binaire corrigé — `wide` 17,80 ms
contre 16,70, `mixed` 21,35 contre 20,20 — **publié tel quel, sans explication
a posteriori**.

**`B0` s'est reproduit une troisième fois**, identique; rien n'a été supprimé
de `src-tauri/target/`.

### 15.5 État

**`TASK-0016` reste `IMPLEMENTED`.** La correction vient de l'exécuteur de la
tranche : **corriger son propre livrable ne le vérifie pas**. `ACTION-0026`
attend un **re-contrôle indépendant**.

## 16. Historique de l'état, suite

- 2026-08-31 — **`CHANGES_REQUIRED`** : contrôle indépendant `ACTION-0026`,
  réserve bloquante `X2` sur la surface runtime héritée.
- 2026-08-31 — **correction de `X2` exécutée**, validation intégralement
  rejouée. **Statut inchangé : `IMPLEMENTED`.** En attente de re-contrôle.
