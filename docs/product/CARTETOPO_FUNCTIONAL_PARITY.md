# CARTETOPO_FUNCTIONAL_PARITY — Contrat de parité fonctionnelle

- **Date :** 2026-08-31
- **Tâche :** `TASK-0015`, sur l'**instruction produit autoritative de
  Sébastien** du 2026-08-31
- **Statut du document :** **contrat produit courant**, livrable `L1` de
  `TASK-0015`, **`VERIFIED`** le 2026-08-31 par le contrôle indépendant
  [`ACTION-0025`](../reviews/ACTION-0025-independent-control.md). **Non testé :
  rien n'a été exécuté ni mesuré.** Ce sont des cibles à falsifier, pas des
  résultats.
- **Correction normative `X1`, 2026-08-31.** `ACTION-0025` a relevé que
  « suggérée » était employée comme **provenance de relation** en §4 (`P-04`)
  et en §5.1.2, alors que §5.1.3 établit qu'**une suggestion n'est pas une
  relation**. Les formulations contradictoires sont **alignées** :
  **relation établie** ⇒ provenance `déterministe` **ou** `approuvée`, sans
  troisième valeur; **suggestion** ⇒ **objet et état distincts**, affichables,
  **jamais comptés comme relation** avant approbation. **Aucune portée n'a
  changé**, aucune exigence n'a été ajoutée ni retirée. Enregistrée par
  [`DEC-0016`](../decisions/DEC-0016-p4-gate-crossing-and-first-slice.md) B.
- **Correction normative `P02-R1`, 2026-09-02.** Le **réalignement produit** de
  [`TASK-0021`](../tasks/TASK-0021-product-realignment.md), sous
  [`DEC-0020`](../decisions/DEC-0020-topographic-node-graph.md), corrige
  **`P-02`** et **elle seule**. L'ancienne formulation exigeait que la
  **relation d'inclusion visuelle** reproduise la hiérarchie : ainsi écrite,
  elle **rendait le pavage imbriqué obligatoire** et **interdisait
  contractuellement** la topographie à nœuds reliés que la direction produit
  retient. La formulation est remplacée **sur ce point**; **l'ancienne est
  conservée, visible, sous la nouvelle** — §4.1 — et **n'est ni supprimée ni
  réécrite en silence**. **`P-02` ne descend pas** : l'exigence corrigée est
  **plus forte**, puisqu'elle ajoute l'interdiction d'une **arête inventée** et
  d'un **nœud placé dans la mauvaise branche**, deux échecs qu'un pavage
  correct peut commettre. **Le contrat reste à 22 exigences**; `P-01` et `P-03`
  à `P-22` sont **inchangées**.
- **Amendement normatif `P-SCALE-R1`, 2026-09-06.** Le **réalignement
  d'architecture à grande échelle** de
  [`TASK-0027`](../tasks/TASK-0027-progressive-scale-architecture-realignment.md),
  sous [`DEC-0029`](../decisions/DEC-0029-progressive-materialization-and-scale-boundary.md),
  amende **`P-01`, `P-02` et `P-03`**, et **elles seules**. Les trois
  formulations d'origine confondaient implicitement **« exister dans le
  cerveau »** et **« être rendu simultanément »** : ainsi écrites, elles
  **rendaient contractuellement impossible** la matérialisation progressive
  qu'exige un corpus de 100 000 ou de 1 000 000 d'éléments — et que `P-08` et
  `P-18` réclament déjà. Les formulations sont amendées **sur ce point**;
  **les anciennes sont conservées, visibles, sous les nouvelles** — §4.1 — et
  **ne sont ni supprimées ni réécrites en silence**. **Aucune des trois ne
  descend** : chaque amendement **ajoute** une obligation de véracité —
  atteignabilité de tout élément indexé, déclaration explicite avec **compte
  exact** de tout sous-arbre replié ou agrégé, et interdiction qu'une
  pagination fasse disparaître un enfant réel. **Le contrat reste à 22
  exigences**; `P-04` à `P-22` sont **inchangées**. **`P-08` est entière et
  inchangée**, et devient un **pilier du scale spike** — voir §8.
- **Autorité :** ce document **prime** sur toute lecture antérieure du
  périmètre produit tirée de l'ancienne version publique de FileTopo.

---

## 1. Ce que ce contrat établit

### 1.1 Les cinq énoncés fondateurs

1. **CarteTopo est la RÉFÉRENCE FONCTIONNELLE de FileTopo.**
2. **L'ancienne version publique de FileTopo — la 0.1 alpha — est un prototype
   et un audit technique. Elle n'est PAS la référence produit.** Elle conserve
   sa valeur historique de preuve technique, et rien de plus. Voir
   [le bilan alpha](../archive/v0.1-alpha/BASELINE_ASSESSMENT.md).
3. **FileTopo final doit généraliser le bon fonctionnement de CarteTopo à
   n'importe quelle arborescence ou « cerveau numérique ».** Ce qui, dans la
   référence, fonctionne pour une structure donnée doit fonctionner dans
   FileTopo **sans catégorie codée en dur, sans configuration manuelle
   préalable et sans hypothèse sur la forme de l'arbre**.
4. **L'interface visuelle peut être entièrement modernisée.** Formes,
   couleurs, typographie, panneaux, animations et organisation peuvent changer.
   **Aucune copie pixel pour pixel n'est demandée.** Une nouvelle UX est
   **encouragée** si elle est plus claire et plus attirante.
5. **Aucune amélioration visuelle ne doit supprimer la parité fonctionnelle.**

### 1.2 Ce que ce document ne contient pas, et ne contiendra jamais

Conformément à [AGENTS.md](../../AGENTS.md), la référence privée n'est pas
accessible et rien n'en est copié.

Ce document décrit **des comportements**, jamais un contenu. Il ne contient
**aucune** capture, **aucun** nom de dossier ou de fichier réel, **aucun**
chemin, **aucune** catégorie personnelle, **aucune** valeur de données,
**aucune** ligne de code et **aucune** structure interne de la référence.
Chaque exigence est formulée de façon **générique**, applicable à n'importe
quelle arborescence, et vérifiable sur des **fixtures synthétiques**.

Le nom « CarteTopo » est employé parce que **Sébastien l'a lui-même nommé**
comme référence fonctionnelle, et a nommé ce fichier. Rien d'autre de la
référence n'est employé.

### 1.3 Rapport avec les autres documents produit

| Document | Rapport |
|---|---|
| [PROJECT_VISION.md](../../PROJECT_VISION.md) | **Inchangé.** Ce contrat en est l'application, pas une révision. Les critères de succès de la vision restent la cible finale |
| [REFERENCE_INTERFACE.md](REFERENCE_INTERFACE.md) | **Conservé.** Il décrit le comportement cible domaine par domaine; ce contrat le **rend exigible** et lui ajoute des critères d'acceptation |
| [REQUIREMENTS_BASELINE.md](REQUIREMENTS_BASELINE.md) | **Amendé** par `TASK-0015` : `F-013`, `F-017`, `F-018`, `F-019` remontent au rang de parité |
| [FEATURE_MATRIX.md](FEATURE_MATRIX.md) | **Amendée** en conséquence. Ses constats d'audit sur le prototype restent intacts |
| [USER_JOURNEY.md](USER_JOURNEY.md) | **Conservé.** Aucun parcours n'est retiré |
| [DEC-0015](../decisions/DEC-0015-product-parity-and-layout-scope.md) | Enregistre la décision qui découle de ce contrat, et supplante `DEC-0014` sur la **lecture produit** de `CAL-B` |

## 2. Les trois invariants non négociables

Aucune exigence de parité, aucune modernisation visuelle et aucune décision
technique ne peut les affaiblir.

| # | Invariant |
|---|---|
| `I-1` | **Lecture seule absolue sur les documents analysés.** Aucune opération de FileTopo ne renomme, ne déplace, ne supprime, ne réécrit, ne crée ni ne modifie quoi que ce soit dans l'arborescence analysée — contenu, métadonnées et horodatages compris |
| `I-2` | **Rien de FileTopo ne vit dans l'arborescence analysée.** Index, caches, relations, préférences, état vu/non vu et rapports vivent dans l'espace applicatif |
| `I-3` | **Rien n'est inventé silencieusement.** Toute information affichée provient soit de l'arborescence observée, soit d'une règle déterministe documentée, soit d'une action explicite de l'utilisateur. Chacune est distinguable des autres à l'écran |

## 3. La règle de liberté visuelle, et sa subordination

**Ce qui est libre.** Le style visuel de FileTopo est **entièrement libre** :
la forme des blocs et des nœuds, la palette, la typographie, la densité, la
disposition des panneaux, les transitions et animations, l'organisation des
commandes, la navigation entre les vues, les icônes et le vocabulaire de
l'interface. Une refonte complète de l'UX est **encouragée** si elle rend le
produit plus clair et plus attirant.

**Ce qui ne l'est pas.** Une modernisation visuelle ne peut jamais :

1. **supprimer** une exigence de parité `P-01` à `P-22`;
2. **rendre inatteignable** une exigence de parité — la reléguer derrière un
   geste non découvrable, un menu masqué sans équivalent clavier, ou un mode
   que rien ne signale, revient à la supprimer;
3. **retirer** un invariant `I-1` à `I-3`;
4. **remplacer une information par une impression** : une atténuation, un flou,
   une animation ou une abstraction graphique ne peut pas se substituer à une
   donnée que l'utilisateur doit pouvoir lire;
5. **contourner l'accessibilité** : tout ce qui est atteignable à la souris est
   atteignable au clavier, et aucun codage ne repose sur la seule couleur.

**Règle de conflit.** Si une intention visuelle et une exigence de parité
s'opposent, **la parité gagne**, et l'intention visuelle doit être réalisée
autrement. Un abandon d'exigence ne peut venir que d'une **décision écrite** —
une fiche `DEC` —, **jamais d'une omission silencieuse**.

## 4. Les 22 exigences de parité

**Comment lire ce tableau.** « Comportement exigé » dit ce que l'utilisateur
doit pouvoir faire, sans dire à quoi cela ressemble. « Critère d'acceptation »
est falsifiable sur fixtures synthétiques. « Matrice » renvoie aux fonctions de
[FEATURE_MATRIX.md](FEATURE_MATRIX.md). **Aucun critère n'a été exécuté.**

### 4.1 Construire la carte

| # | Exigence | Comportement exigé | Critère d'acceptation | Matrice |
|---|---|---|---|---|
| `P-01` | **Carte construite depuis l'arborescence réelle** — *amendée par `P-SCALE-R1`* | Choisir une racine suffit : la carte se construit à partir de la structure réellement observée, sans configuration préalable, sans catégorie codée en dur et sans intervention manuelle. **Tous les éléments source doivent être indexés et atteignables; ils ne sont pas requis simultanément dans la vue rendue** | Sur quatre arbres synthétiques de formes différentes — large, profond, mixte, quasi vide —, l'ensemble des nœuds **indexés égale** l'ensemble attendu de la fixture, et **chaque** élément indexé est **atteignable** en un nombre **borné et déclaré** d'actions, par navigation, recherche ou expansion d'agrégat. La **vue rendue** est un **sous-ensemble déclaré** de l'index : **aucun élément affiché n'est absent de la source**, et **aucun élément de la source n'est absent de la vue sans être compté dans un agrégat exact ou déclaré par un motif affiché**. Un élément indexé **inatteignable** est un échec, au même titre qu'un élément inventé | `F-001`, `F-003`, `F-006`, `F-007`, `F-050`, `F-051` |

> **`P-01` — formulation d'origine, conservée pour mémoire, amendée le
> 2026-09-06 par [`DEC-0029`](../decisions/DEC-0029-progressive-materialization-and-scale-boundary.md) :**
>
> | `P-01` | **Carte construite depuis l'arborescence réelle** | Choisir une racine suffit : la carte se construit à partir de la structure réellement observée, sans configuration préalable, sans catégorie codée en dur et sans intervention manuelle | Sur quatre arbres synthétiques de formes différentes — large, profond, mixte, quasi vide —, l'ensemble des nœuds cartographiés **égale** l'ensemble des nœuds indexés, qui égale l'ensemble attendu de la fixture. Aucun élément affiché n'est absent de la source, aucun élément de la source n'est absent sans motif affiché | `F-001`, `F-003`, `F-006`, `F-007` |
>
> **Ce qui a été retiré :** l'égalité implicite entre « nœuds cartographiés »
> et « nœuds indexés », qui rendait obligatoire de **rendre tout le corpus**.
> **Ce qui a été ajouté :** l'obligation que **tout élément indexé soit
> atteignable** en un nombre borné d'actions, et que **toute absence de la vue
> soit comptée dans un agrégat exact ou déclarée**. L'exigence est **plus
> forte** : l'ancienne formulation était satisfaite par une carte qui rend
> tout, mais **échouait à interdire** une vue qui cache silencieusement.
> **`P-01` n'a jamais été déclarée satisfaite, ni avant ni après
> `P-SCALE-R1`.**
| `P-02` | **Hiérarchie lisible et non ambiguë** — *corrigée par `P02-R1`, amendée par `P-SCALE-R1`* | La topographie rend la **hiérarchie réelle lisible et non ambiguë**. Chaque nœud/fichier/dossier possède une **représentation identifiable**. La relation parent/enfant est représentée **nœud par nœud** par une **connexion et/ou une organisation spatiale explicite**. **Aucune relation hiérarchique affichée ne peut être inventée. Aucun parent/enfant réel ne peut être attribué au mauvais nœud.** **La vue matérialisée est une projection exacte de l'index : un sous-arbre replié ou agrégé est déclaré comme tel, avec son compte exact** | Sur les mêmes quatre arbres — large, profond, mixte, quasi vide — **onze** contrôles : (1) **ensemble de nœuds correct** — les nœuds **matérialisés** sont un sous-ensemble exact de l'index, sans ajout; (2) **parent exact** pour chaque nœud matérialisé; (3) **enfants directs exacts**, ou **agrégat exact** déclaré à leur place; (4) **aucune arête hiérarchique inventée**; (5) **aucun nœud attribué à la mauvaise branche**; (6) **labels disponibles** au niveau de zoom prévu, une indisponibilité étant **déclarée** et non silencieuse; (7) **navigation souris ET clavier**, sans piège; (8) **hiérarchie compréhensible sans la couleur seule**; (9) **tout repli ou agrégat est déclaré en mots**, jamais silencieux; (10) **son compte est exact**, jamais estimé, arrondi ni tronqué en « 999+ »; (11) **un agrégat n'est jamais présenté comme un dossier** — ni dans un chemin, ni à la copie, ni à l'ouverture Windows. **Aucun algorithme de disposition n'est imposé** — Sugiyama, *layered graph*, *tree layout*, *orthogonal layout* et les autres restent des choix techniques futurs | `F-007`, `F-008`, `F-042`, `F-050`, `F-051` |

> **`P02-R1` — formulation d'origine de `P-02`, conservée pour mémoire, remplacée
> le 2026-09-02 par [`DEC-0020`](../decisions/DEC-0020-topographic-node-graph.md) :**
>
> | `P-02` | **Blocs et nœuds hiérarchiques lisibles** | La carte montre des blocs et des nœuds dont l'imbrication visuelle **est** la hiérarchie réelle, et qui restent lisibles quelle que soit la forme de l'arbre | Sur les mêmes quatre arbres : aucun bloc de largeur ou de hauteur nulle, aucun chevauchement entre frères, la relation d'inclusion visuelle reproduit la relation parent/enfant **nœud par nœud**, et l'étiquette du bloc sélectionné reste lisible | `F-007`, `F-008` |
>
> **Ce qui a été retiré :** l'obligation que la hiérarchie passe par
> l'**inclusion visuelle**. **Ce qui a été ajouté :** l'interdiction d'inventer
> une arête et celle d'attribuer un nœud à la mauvaise branche. Les garanties
> de non-dégénérescence de l'ancienne version — largeur nulle, chevauchement
> entre frères — étaient des propriétés **du pavage**; sur un graphe de nœuds,
> elles sont remplacées par les contrôles (1) à (5), qui portent sur la
> **structure affichée** plutôt que sur la géométrie des rectangles.
> **`P-02` n'a jamais été déclarée satisfaite, ni avant ni après `P02-R1`.**

> **`P-02` — formulation issue de `P02-R1`, conservée pour mémoire, amendée le
> 2026-09-06 par [`DEC-0029`](../decisions/DEC-0029-progressive-materialization-and-scale-boundary.md) :**
>
> | `P-02` | **Hiérarchie lisible et non ambiguë** — *corrigée par `P02-R1`* | La topographie rend la **hiérarchie réelle lisible et non ambiguë**. Chaque nœud/fichier/dossier possède une **représentation identifiable**. La relation parent/enfant est représentée **nœud par nœud** par une **connexion et/ou une organisation spatiale explicite**. **Aucune relation hiérarchique affichée ne peut être inventée. Aucun parent/enfant réel ne peut être attribué au mauvais nœud** | Sur les mêmes quatre arbres — large, profond, mixte, quasi vide — **huit** contrôles : (1) **ensemble de nœuds correct**, égal à l'index et à l'attendu; (2) **parent exact** pour chaque nœud; (3) **enfants directs exacts** pour chaque nœud; (4) **aucune arête hiérarchique inventée**; (5) **aucun nœud attribué à la mauvaise branche**; (6) **labels disponibles** au niveau de zoom prévu, une indisponibilité étant **déclarée** et non silencieuse; (7) **navigation souris ET clavier**, sans piège; (8) **hiérarchie compréhensible sans la couleur seule**. **Aucun algorithme de disposition n'est imposé** | `F-007`, `F-008`, `F-042` |
>
> **Ce qui a été retiré :** l'égalité du contrôle (1) entre les nœuds affichés
> et **tout** l'index, et l'exigence du contrôle (3) que **tous** les enfants
> directs soient affichés. **Ce qui a été ajouté :** trois contrôles, (9) à
> (11) — tout repli ou agrégat **déclaré en mots**, son **compte exact**, et
> l'**interdiction qu'un agrégat se fasse passer pour un dossier**. L'exigence
> est **plus forte** : l'ancienne interdisait de **mentir par ajout**, la
> nouvelle interdit aussi de **mentir par omission**.

| `P-03` | **Parent et enfants directs** — *amendée par `P-SCALE-R1`* | Depuis n'importe quel nœud, l'utilisateur voit son parent et ses enfants directs, et peut se déplacer vers chacun. **Parent et enfants restent consultables et navigables; une fratrie énorme peut être paginée ou agrégée plutôt que rendue entièrement d'un coup** | Pour **chaque** nœud d'une fixture, le parent affiché égale celui de l'index, et l'ensemble des enfants directs **atteignables par pagination ou expansion** égale celui de l'index — **la pagination ne fait disparaître aucun enfant réel**, et son **total annoncé est exact**. Aucun lien affiché sans contrepartie dans l'arborescence. Le déplacement vers le parent et vers **chaque** enfant reste possible **à la souris et au clavier**, y compris pour un enfant situé au-delà de la première page | `F-016`, `F-050`, `F-051` |

> **`P-03` — formulation d'origine, conservée pour mémoire, amendée le
> 2026-09-06 par [`DEC-0029`](../decisions/DEC-0029-progressive-materialization-and-scale-boundary.md) :**
>
> | `P-03` | **Parent et enfants directs** | Depuis n'importe quel nœud, l'utilisateur voit son parent et ses enfants directs, et peut se déplacer vers chacun | Pour **chaque** nœud d'une fixture, le parent et l'ensemble des enfants directs affichés égalent ceux de l'index. Aucun lien affiché sans contrepartie dans l'arborescence | `F-016` |
>
> **Ce qui a été retiré :** l'exigence que les enfants directs soient
> **affichés** en une fois. **Ce qui a été ajouté :** l'exigence qu'ils soient
> tous **atteignables**, que la pagination **n'en perde aucun**, que son
> **total annoncé soit exact**, et que le déplacement clavier atteigne aussi
> les enfants au-delà de la première page. **`P-03` n'a jamais été déclarée
> satisfaite, ni avant ni après `P-SCALE-R1`.**

### 4.2 Relations

| # | Exigence | Comportement exigé | Critère d'acceptation | Matrice |
|---|---|---|---|---|
| `P-04` | **Relations transversales explicites, avec provenance** | Des relations autres que la hiérarchie peuvent exister, être affichées et être parcourues. Chacune porte sa **provenance visible**. Une **suggestion** peut être affichée, mais **jamais présentée comme une relation établie**. Voir la règle complète en §5 | Une **relation établie** expose son **type** et sa **provenance**, qui vaut `déterministe` **ou** `approuvée` — **il n'existe aucune troisième provenance**. **Le modèle rend une relation sans provenance non représentable.** Une **suggestion** est un **objet distinct**, portant son propre état, **jamais comptée comme relation avant approbation**; elle est visuellement distinguable d'une relation établie **sans recourir à la seule couleur**. Une fixture qui tente d'insérer une relation sans provenance, ou de faire passer une suggestion pour une relation établie, est rejetée avec un motif | `F-017` |
| `P-05` | **Relations entrantes et sortantes distinguées** | L'utilisateur distingue ce qui pointe **vers** l'élément sélectionné de ce qu'il pointe **lui-même** | Sur une fixture de relations synthétiques, les comptes entrants et sortants du panneau **et** de la carte coïncident exactement avec ceux de l'index. La distinction est perceptible **sans recourir à la seule couleur** | `F-019` |
| `P-06` | **Sélection, accentuation des liés, atténuation du reste** | Sélectionner un élément accentue ce qui lui est lié — parent, enfants directs, relations transversales — et atténue le reste, sans rien effacer | La sélection est possible à la souris **et** au clavier; carte et liste sémantique désignent le même nœud à tout instant. Les états « accentué » et « atténué » sont distinguables **sans recourir à la seule couleur**, n'altèrent **aucune** donnée de l'index, et l'information atténuée reste **lisible et atteignable** | `F-015`, `F-018` |
| `P-07` | **Panneau des relations** | Un panneau liste les relations de l'élément sélectionné, groupées par nature et par direction, et chaque entrée mène à l'élément visé | Pour chaque nœud d'une fixture, le contenu du panneau **égale** l'ensemble des relations de l'index pour ce nœud. Chaque entrée porte type, direction et provenance, est atteignable au clavier, et sélectionner une entrée sélectionne l'élément visé sur la carte | `F-016`, `F-017`, `F-019` |

### 4.3 Trouver

| # | Exigence | Comportement exigé | Critère d'acceptation | Matrice |
|---|---|---|---|---|
| `P-08` | **Recherche** | Retrouver un élément par nom ou par chemin, dans le cerveau actif, sans quitter la carte | Sur une fixture de 100 000 nœuds synthétiques, une requête retourne **exactement** l'ensemble attendu, paginé et borné. **Aucun résultat hors du cerveau actif.** Les résultats sont atteignables au clavier et sélectionnent sur la carte | `F-020` |
| `P-09` | **Filtres** | Restreindre ce qui est montré, en combinant plusieurs critères, tous dérivés des données du cerveau | Les filtres de base — tout, nouveaux, non vus — plus type et disponibilité sont **combinables** et **dérivés de l'index**. Le total filtré égale le compte issu d'une requête indépendante. Un filtre actif est **visible** et **révocable en une action** | `F-022` |
| `P-10` | **Légende** | Tout codage visuel employé sur la carte est expliqué, au même endroit, en permanence ou à la demande | **Chaque** couleur, forme ou motif porteur de sens figure dans la légende avec sa signification. La légende est atteignable au clavier et reste **déchiffrable sans distinction de couleur**. Un codage présent sur la carte et absent de la légende est un échec | `F-014` |

### 4.4 Naviguer

| # | Exigence | Comportement exigé | Critère d'acceptation | Matrice |
|---|---|---|---|---|
| `P-11` | **Panoramique, zoom, ajuster à l'écran, réinitialiser** | Déplacer la carte, zoomer, cadrer l'ensemble ou la sélection, et revenir à un état connu | **Panoramique :** souris, pavé tactile et clavier; après déplacement, la sélection est inchangée. **Zoom :** borné par un facteur minimal et maximal déclarés, centré de façon prévisible, atteignable au clavier; **aucun état de vue hors bornes n'est atteignable**. **Ajuster :** depuis n'importe quel état atteignable, une seule action rend la carte complète — ou la sélection — entièrement visible. **Réinitialiser :** produit exactement la vue d'ouverture du cerveau, comparée paramètre par paramètre, et est atteignable au clavier | `F-009`, `F-010`, `F-011`, `F-012` |
| `P-12` | **Panneau de détails masquable** | Le panneau de détails montre les propriétés essentielles de la sélection, et peut être masqué puis réaffiché sans rien perdre | **Contenu :** pour chaque nœud d'une fixture, nom, type, chemin réel, taille, dates, parent, enfants et état affichés **égalent** ceux de l'index; les diagnostics d'accès sont **affichés**, jamais masqués. **Masquage :** masquer puis afficher conserve la sélection, le défilement et les filtres; l'état masqué/affiché **survit au redémarrage** | `F-013`, `F-023` |
| `P-13` | **Contenu direct d'un dossier** | Consulter les enfants directs du dossier sélectionné, sous forme de liste, et les sélectionner | La liste affiche **exactement** les enfants directs du nœud — ni les petits-enfants, ni une liste globale filtrée —, est paginée, et chaque entrée est sélectionnable au clavier et synchronisée avec la carte | `F-026` |

### 4.5 Agir

| # | Exigence | Comportement exigé | Critère d'acceptation | Matrice |
|---|---|---|---|---|
| `P-14` | **Copier le chemin** | Copier le chemin réel de l'élément sélectionné, pour l'emmener dans un autre outil | La copie reproduit le chemin réel **exact**, contrôlée sur une fixture à noms longs et à caractères non ASCII, et est atteignable au clavier. **Aucun chemin n'est écrit dans un journal exportable.** La copie est un **geste explicite**, jamais automatique | `F-024` |
| `P-15` | **Ouvrir dans l'Explorateur** | Ouvrir le dossier sélectionné, ou sélectionner le fichier dans l'Explorateur Windows | Sur une fixture synthétique Windows : un dossier s'ouvre; un fichier est **sélectionné** dans son dossier. Une cible **hors racine** ou **disparue** produit une **erreur explicite**, et **aucune modification de la source** — `I-1`. Le confinement à la racine du cerveau est vérifié avant l'appel | `F-025` |

### 4.6 Suivre les changements

| # | Exigence | Comportement exigé | Critère d'acceptation | Matrice |
|---|---|---|---|---|
| `P-16` | **Détection et historique des changements** | Les créations, modifications, déplacements, renommages et suppressions sont détectés, journalisés, ordonnés et consultables | Un scénario synthétique portant les cinq natures produit **exactement** les événements attendus, **ordonnés**, et **attribués au bon nœud**. L'historique est consultable, filtrable et **ne se perd pas** au redémarrage | `F-027`, `F-030` |
| `P-17` | **Nouveaux, non vus, marquer vu, tout marquer vu** | Distinguer ce qui est nouveau, ce qui n'a pas été vu, marquer un élément ou un changement comme vu, et tout marquer vu en une action | Les états « nouveau » et « non vu » sont **dérivés du journal**, pas saisis. Marquer un élément, marquer un changement et « tout marquer vu » **persistent au redémarrage** et **n'affectent aucun autre cerveau**. « Tout marquer vu » est **réversible ou confirmé**, jamais silencieux | `F-022`, `F-028` |
| `P-18` | **Actualisation manuelle et surveillance incrémentale** | Forcer une mise à jour à tout moment, et bénéficier d'une surveillance automatique qui n'impose pas de tout rescanner | **Manuelle :** produit un **résumé des changements** et **ne vide jamais** l'index courant avant d'avoir un remplacement valide — vérifié par interruption forcée en cours d'opération. **Automatique :** une rafale de 10 000 événements synthétiques, une perte simulée d'événements et une reprise après interruption aboutissent **toutes** à un index égal à celui d'un scan complet de référence. **Incrémentale :** le coût d'une mise à jour est proportionnel au nombre de changements, non à la taille de l'index, mesuré sur 1 000, 10 000 et 100 000 nœuds avec 10 changements | `F-029`, `F-030`, `F-031` |

### 4.7 Durer

| # | Exigence | Comportement exigé | Critère d'acceptation | Matrice |
|---|---|---|---|---|
| `P-19` | **Persistance des préférences et de l'état** | Fermer puis rouvrir FileTopo restitue le cerveau tel qu'il a été laissé : vue, panneau, filtres, légende, langue, options d'accessibilité, sélection et état vu/non vu | Après redémarrage, **chacune** de ces valeurs est identique à celle d'avant fermeture, comparée valeur par valeur sur trois cerveaux synthétiques. Une valeur non restaurable est **déclarée et énumérée**, jamais silencieusement réinitialisée. **Voir le manque déclaré `M-1` en §7** | `F-012`, `F-013`, `F-022`, `F-033`, `F-034` |
| `P-20` | **Plusieurs cerveaux indépendants** | Plusieurs cerveaux coexistent, chacun avec sa racine, son identité et son état, sans jamais se mélanger | Deux cerveaux synthétiques ouverts successivement ne partagent **aucune** ligne d'index, **aucune** préférence et **aucun** état vu/non vu — contrôlé par comparaison des fichiers de données. Basculer d'un cerveau à l'autre charge son index, sa carte, ses filtres et sa vue. Après redémarrage, **chacun** retrouve son état, vérifié sur trois cerveaux. Nom, couleur et icône sont **modifiables**, **persistants par cerveau**, et utilisables **sans configuration obligatoire** | `F-002`, `F-033`, `F-034` |
| `P-21` | **FR/EN et accessibilité** | Le produit est intégralement utilisable en français et en anglais, et intégralement utilisable au clavier | **Langues :** les deux couvrent **l'intégralité** des libellés; le choix **persiste au redémarrage**; un libellé manquant est détecté par un contrôle automatisé. **Accessibilité :** niveau visé **WCAG 2.2 AA** — parcours complet au clavier **sans piège**, contraste du texte ≥ 4,5:1, **alternative non colorée pour chaque codage**, `prefers-reduced-motion` respecté. Audit automatisé **et** contrôle clavier manuel | `F-035`, `F-036` |
| `P-22` | **Aucun changement physique des fichiers analysés** | Utiliser FileTopo ne modifie rien dans l'arborescence analysée, quelle que soit l'action entreprise | Empreinte de l'arborescence synthétique — contenu, noms, structure, horodatages — **identique avant et après** une session complète exerçant **toutes** les exigences `P-01` à `P-21`, indisponibilité temporaire comprise. **Aucun fichier de FileTopo n'est créé dans la racine analysée** — `I-2`. Ce critère est **bloquant** : son échec invalide la version | `I-1`, `I-2`, `F-003` |

## 5. Relations transversales : la règle complète

Cette règle gouverne `P-04`, `P-05` et `P-07`. Elle est reprise de
[PROJECT_VISION.md](../../PROJECT_VISION.md) et de
[DEC-0009](../decisions/DEC-0009-data-model-and-relations.md), et **rendue
exigible** ici.

### 5.1 Les quatre obligations

1. **Une relation transversale n'est jamais inventée.** Elle provient **soit**
   d'une **règle déterministe documentée**, **soit** d'une **action ou d'une
   approbation explicite de l'utilisateur**. Il n'existe pas de troisième
   origine.
2. **Sa provenance est visible**, à l'écran, au moment où la relation est
   montrée — pas seulement dans un journal ou une infobulle facultative. Une
   **relation établie** a exactement **deux** provenances possibles —
   `déterministe` et `approuvée` —, **visuellement distinctes** et
   distinguables **sans recourir à la seule couleur**. Une **suggestion** n'est
   pas une provenance de relation : c'est un **état distinct**, porté par un
   objet distinct, lui aussi distinguable des deux provenances **sans recourir
   à la seule couleur**.
3. **Une suggestion n'est pas une relation.** C'est un **objet et un état
   distincts**, jamais une valeur de provenance. Tant qu'elle n'est pas
   approuvée, elle est signalée comme suggestion, **révocable**, et **ne compte
   pas** dans les comptes de relations entrantes et sortantes. **Elle peut être
   affichée sur la carte et dans les panneaux** — c'est même souhaitable pour
   la rendre approuvable —, mais **jamais présentée comme une relation
   établie**. L'approbation la **transforme** en relation de provenance
   `approuvée`; c'est la seule voie.
4. **Le stockage vit hors de l'arborescence analysée**, dans l'espace
   applicatif du cerveau — invariant `I-2`. Aucune relation n'est écrite dans
   un document analysé, sous aucune forme.

### 5.2 Ce qui est explicitement interdit

- Déduire une relation d'une **proximité graphique**, d'un **hasard de
  disposition** ou d'un **regroupement visuel** : une position sur la carte
  n'est jamais une donnée.
- **Créer une relation par le seul fait de sélectionner** deux éléments.
- Présenter une relation **suggérée** comme établie, ou la faire entrer
  silencieusement dans les comptes de `P-05`.
- **Rendre une relation irrévocable.** Toute relation approuvée par
  l'utilisateur est révocable par lui.
- Faire dépendre une relation d'une **extraction de contenu**, d'un modèle d'IA
  ou d'un service distant : ces couches restent `DIFFÉRÉ` — §6.
- **Ajouté le 2026-09-02, [`DEC-0021`](../decisions/DEC-0021-deterministic-relation-engine.md)
  et [`DEC-0022`](../decisions/DEC-0022-optional-byok-ai-layer.md).** Créer une
  relation établie à partir d'un **score numérique seul**, sans règle **nommée,
  versionnée et de sens explicitement défini**. Confondre **contenu binaire
  identique** — ce qu'un hash prouve — avec **même objet physique**, **copie**,
  **nom similaire** ou **relation logique** : ce sont cinq notions distinctes,
  de valeurs de vérité différentes. Et faire produire à un `LLM` une relation
  **établie** : il ne produit que des **suggestions**, et **aucune troisième
  provenance « AI » n'existe**.

## 6. Ce qui reste DIFFÉRÉ, et ne remonte pas

**Aucune** des couches suivantes n'entre dans la parité, ni dans le MVP
structurel. Elles restent `DIFFÉRÉ`, conditionnées à un besoin mesuré et à une
décision humaine séparée, conformément à `PROJECT_VISION.md` et à
[DEC-0012](../decisions/DEC-0012-ai-architectural-boundary.md).

| Fonction | Classification | Inchangée |
|---|---|---|
| `F-021` — recherche par sujet ou rôle | `DIFFÉRÉ` | oui |
| `F-037` — extraction de contenu, OCR | `DIFFÉRÉ` | oui |
| `F-038` — RAG cité | `DIFFÉRÉ` | oui |
| `F-039` — GraphRAG | `DIFFÉRÉ` | oui |
| `F-047` — couche IA facultative `BYOK` | `DIFFÉRÉ` | **ajoutée le 2026-09-02** par [`DEC-0022`](../decisions/DEC-0022-optional-byok-ai-layer.md) |

**Conséquence pour la parité :** aucune exigence `P-01` à `P-22` ne peut être
satisfaite **au moyen** d'une de ces couches. Un produit qui n'a ni IA, ni OCR,
ni extraction, ni RAG doit satisfaire **l'intégralité** du contrat.

## 7. Écarts et manques déclarés

Ils sont écrits ici plutôt que corrigés en silence.

| # | Manque | Ce qu'il impose |
|---|---|---|
| `M-1` | **La persistance des préférences n'a pas de fonction propre dans la matrice.** `P-19` s'appuie sur `F-012`, `F-013`, `F-022`, `F-033` et `F-034`, dont **aucune** ne couvre à elle seule « mémoriser vue, panneau, filtres, légende, densité et accessibilité » — ligne « Préférences » de [REFERENCE_INTERFACE.md](REFERENCE_INTERFACE.md) | La couverture est **répartie, pas garantie**. Une révision ultérieure de la matrice devra soit créer une fonction propre, soit rattacher explicitement chaque valeur à une fonction existante. **Aucune fonction n'a été inventée ici** : la matrice reste à 39 lignes |
| `M-2` | **`P-22` n'a pas de fonction propre** : c'est un invariant, contrôlé à travers les critères de `F-003`, `F-025`, `F-029` et `F-032` | Le contrôle doit être **explicitement rejoué en fin de chaque tranche**, jamais présumé acquis parce qu'aucune écriture n'est prévue |
| `M-3` | **L'indisponibilité temporaire (`F-032`) n'est pas nommée par l'instruction produit**, mais reste `MVP` | Elle est **conservée**. Ce contrat couvre « au minimum » les points nommés; il n'en retire aucun |
| `M-4` | **Aucun critère de ce document n'a été exécuté.** | Ce sont des **cibles à falsifier**. Un critère de parité qui s'avérerait impossible à tenir devra **redescendre par décision écrite**, jamais par omission |
| `M-5` | **La performance de la parité n'est pas garantie par les mesures existantes.** `B2`, `B2 bis` et `B2 ter` ont mesuré Edge et Chrome, jamais WebView2 — réserve `R8`, en vigueur | Aucun chiffre de spike ne peut être cité comme performance de FileTopo. La validation réelle appartient à l'étape **C** de la feuille de route |

## 8. Comment ce contrat se contrôle

1. **Une exigence de parité n'est réputée satisfaite qu'après exécution de son
   critère sur fixtures synthétiques**, et contrôle indépendant. Une
   déclaration ne vaut pas une preuve.
2. **Une tranche de développement déclare, à sa clôture, l'état de chaque
   exigence qu'elle touche** : satisfaite, partielle, non commencée. « Partielle »
   est un état légitime; « satisfaite » sans preuve ne l'est pas.
3. **`P-22` est rejouée à chaque clôture de tranche.**
4. **Aucune exigence ne disparaît par refonte visuelle** — §3. Toute
   suppression passe par une fiche `DEC`.
5. **Aucune exigence ne disparaît par mise à l'échelle non plus**, depuis
   `P-SCALE-R1`. Un contrat amendé pour rendre la matérialisation progressive
   possible **ajoute** des obligations de véracité; il n'en retire aucune.
   **Le contrat reste à 22 exigences.**
6. **`P-08` est le pilier du scale spike.** Sa fixture de **100 000 nœuds
   synthétiques** et son exigence de résultat **exact, paginé et borné**
   restent **entières et inchangées** : c'est l'exigence qui, la première,
   oblige le produit à séparer le **corpus** de la **vue rendue**, et c'est
   par elle que le futur banc d'échelle sera jugé —
   [`DEC-0029 I`](../decisions/DEC-0029-progressive-materialization-and-scale-boundary.md).
   **Aucun chiffre de performance n'est publiable avant l'étape `C`** :
   réserve `R8`, en vigueur.

## 9. Confidentialité de ce document

- **Aucune donnée réelle, aucun nom privé, aucun chemin privé, aucune
  métadonnée et aucun code provenant de la référence privée.**
- Toutes les exigences sont **génériques** et vérifiables sur des **fixtures
  synthétiques**.
- Ce document reste **interne au dépôt public**. Il n'est ni publié ailleurs,
  ni transmis à un service externe : toute publication externe exceptionnelle
  est réservée à Sébastien.

## 10. Documents liés

- [PROJECT_VISION.md](../../PROJECT_VISION.md)
- [REFERENCE_INTERFACE.md](REFERENCE_INTERFACE.md)
- [REQUIREMENTS_BASELINE.md](REQUIREMENTS_BASELINE.md)
- [FEATURE_MATRIX.md](FEATURE_MATRIX.md)
- [USER_JOURNEY.md](USER_JOURNEY.md)
- [DEC-0015](../decisions/DEC-0015-product-parity-and-layout-scope.md)
- [DEC-0029](../decisions/DEC-0029-progressive-materialization-and-scale-boundary.md)
- [PROGRESSIVE_SCALE_ARCHITECTURE.md](../architecture/PROGRESSIVE_SCALE_ARCHITECTURE.md)
- [ROADMAP.md](../../ROADMAP.md)
- [TASK-0015](../tasks/TASK-0015-cartetopo-functional-parity.md)
