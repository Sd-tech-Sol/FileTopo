# REQUIREMENTS_BASELINE — Baseline fonctionnelle de reconstruction

- **Date :** 2026-08-31
- **Tâche :** `TASK-0011`, sous le GO de Sébastien du 2026-08-31
- **Statut du document :** livrable `L1`, **APPROUVÉ** — approuvé par Sébastien le 2026-08-31 (porte P2 franchie). Livrable documentaire; **rien n'a été exécuté ni mesuré : non testé physiquement**
- **Portée couverte :** points 1 et 11 de `TASK-0011` §7.1
- **Nature :** arbitrage écrit du périmètre. Aucune ligne de code n'est écrite,
  aucune mesure n'est exécutée, aucun test n'est rejoué. **Non testé.**
- **Amendé le 2026-08-31** par `TASK-0015`, sur l'**instruction produit
  autoritative de Sébastien** enregistrée dans
  [DEC-0015](../decisions/DEC-0015-product-parity-and-layout-scope.md) : quatre
  fonctions passent d'`ULTÉRIEUR` à `MVP`. **Voir §8.** La classification
  d'origine de `TASK-0011` est **conservée et visible** dans le tableau de §3.

> **Amendement du 2026-08-31 — la référence produit a changé.** Ce document
> avait été rédigé en prenant pour point de comparaison **l'ancienne version
> publique de FileTopo**. Sébastien établit que ce point de comparaison est
> erroné : l'ancienne version est un **prototype et un audit technique**, et la
> **référence fonctionnelle est CarteTopo**. Le contrat qui en découle est
> [CARTETOPO_FUNCTIONAL_PARITY.md](CARTETOPO_FUNCTIONAL_PARITY.md).
> **Quatre fonctions remontent en conséquence** — `F-013`, `F-017`, `F-018`,
> `F-019` — et **aucune ne descend**. **IA, OCR, extraction de contenu, RAG et
> GraphRAG restent `DIFFÉRÉ`.**

Ce document classe les 40 fonctions de la
[matrice fonctionnelle](FEATURE_MATRIX.md) et fixe, pour chacune, un critère
d'acceptation mesurable. Il ne remplace pas la matrice : celle-ci conserve les
constats d'audit et les preuves de code; celui-ci ajoute la **coupe de MVP**
qui manquait.

---

## 1. Définitions employées

| Classification | Sens exact |
|---|---|
| `MVP` | Doit exister et satisfaire son critère pour qu'une première version reconstruite soit **utile et honnête**. Son absence rend le produit trompeur ou inutilisable. |
| `ULTÉRIEUR` | Prévu dans la reconstruction, mais après le MVP. Son absence dégrade le confort, pas la véracité du produit. |
| `DIFFÉRÉ` | Hors du MVP structurel. Facultatif, conditionné à un besoin mesuré et à une décision humaine séparée. |

**Fait.** La règle de coupe dérive du paragraphe « MVP de reconstruction » de
[PROJECT_VISION.md](../../PROJECT_VISION.md) : « un index de métadonnées fiable
et reconstructible, une persistance versionnée, une carte hiérarchique en
blocs, la navigation et les détails essentiels, puis une surveillance
incrémentale robuste ».

**Inférence.** La coupe est donc **conservatrice sur la chaîne structurelle**
(racine → index → carte → navigation → surveillance) : rien n'y est retiré,
parce qu'un maillon manquant y rend les autres mensongers. Elle retient
aussi les gestes que la vision décrit comme essentiels et que la
reconstruction doit reproduire de façon générique : agir sur l'élément
sélectionné (F-024, F-025) et distinguer un cerveau d'un autre par son nom, sa
couleur et son icône (F-033). Elle reste **agressive au-dessus** : relations
transversales, enrichissement, extraction et IA sortent du MVP.

**Incertitude.** Cette coupe est un jugement de projet, pas un résultat
mesuré. Elle est falsifiable par la phase de développement : si un critère
d'acceptation `MVP` s'avère impossible à tenir, la fonction redescend par une
décision écrite, jamais par omission silencieuse.

## 2. Répartition obtenue

**Répartition courante, après l'amendement du 2026-09-06 (`DEC-0029`,
réalignement d'architecture à grande échelle de
[`TASK-0027`](../tasks/TASK-0027-progressive-scale-architecture-realignment.md)) :**

| Classification | Nombre | Fonctions |
|---|---:|---|
| `MVP` | **44** | F-001 à F-020, F-022 à F-036, F-040, F-041, **F-042**, F-043, F-044, F-045, F-046, **F-050**, **F-051** |
| `ULTÉRIEUR` | **2** | F-048, F-049 |
| `DIFFÉRÉ` | **5** | F-021, F-037, F-038, F-039, F-047 |
| **Total** | **51** | `F-001` à `F-051`, sans trou ni doublon |

**Deux fonctions sont ajoutées et une seule monte.** `F-050` —
matérialisation progressive et vue bornée — et `F-051` — agrégats et
méta-nœuds exacts — sont des **extensions produit décidées** par
[`DEC-0029`](../decisions/DEC-0029-progressive-materialization-and-scale-boundary.md),
classées `MVP` / `P0`. **`F-042` passe d'`ULTÉRIEUR` à `MVP`** : sous une
architecture progressive, replier, déplier et focaliser deviennent les gestes
qui **déterminent le contenu de la vue matérialisée**, donc une **primitive de
navigation et de performance**, et non plus un confort d'interface. **Aucune
fonction ne descend, aucune ne disparaît.**

**`F-051` est classée `P0` par arbitrage écrit** : `F-050` cache
nécessairement des éléments réels, et sans `F-051` la vue devrait soit les
taire — violation de `P-02` amendée — soit renoncer à matérialiser —
annulation de `F-050`. Les deux se livrent **ensemble ou pas du tout**.

**Répartition du 2026-09-02, après le réalignement produit `DEC-0019` à
`DEC-0023` et avant `DEC-0029`, conservée pour mémoire :**

| Classification | Nombre | Fonctions |
|---|---:|---|
| `MVP` | 41 | F-001 à F-020, F-022 à F-036, F-040, F-041, F-043, F-044, F-045, F-046 |
| `ULTÉRIEUR` | 3 | F-042, F-048, F-049 |
| `DIFFÉRÉ` | 5 | F-021, F-037, F-038, F-039, F-047 |
| **Total** | 49 | `F-001` à `F-049`, sans trou ni doublon |

**Note d'époque, conservée :** « La catégorie `ULTÉRIEUR` cesse d'être vide.
Elle l'était depuis l'amendement du 2026-08-31, et la note de §4 disait que
"la parité ne laisse rien entre nécessaire et différé". Cela reste vrai **de la
parité** : aucune des trois fonctions qui l'occupent désormais n'est une
exigence de parité. `F-042` est une **possibilité future** nommée par
`DEC-0020`; `F-048` et `F-049` préparent le **multi-utilisateur** de
`DEC-0023`, qui ne peut pas être `DIFFÉRÉ` — il conditionne la couche IA — ni
`MVP` — rien ne l'exige pour un utilisateur seul. » **`DEC-0029` a depuis
retiré `F-042` de cette catégorie**, sans toucher à `F-048` ni `F-049`.

**Répartition du 2026-09-02, avant le réalignement produit, conservée pour
mémoire :**

| Classification | Nombre | Fonctions |
|---|---:|---|
| `MVP` | 37 | F-001 à F-020, F-022 à F-036, F-040, F-041 |
| `ULTÉRIEUR` | 0 | — |
| `DIFFÉRÉ` | 4 | F-021, F-037, F-038, F-039 |
| **Total** | 41 | `F-001` à `F-041`, sans trou ni doublon |

**Répartition du 2026-08-31, avant l'ajout de `F-040`, conservée pour
mémoire :**

| Classification | Nombre | Fonctions |
|---|---:|---|
| `MVP` | 35 | F-001 à F-020, F-022 à F-036 |
| `ULTÉRIEUR` | 0 | — |
| `DIFFÉRÉ` | 4 | F-021, F-037, F-038, F-039 |
| **Total** | 39 | `F-001` à `F-039` |

**Répartition d'origine, arrêtée par `TASK-0011` le 2026-08-31, conservée pour
mémoire :**

| Classification | Nombre | Fonctions |
|---|---:|---|
| `MVP` | 31 | F-001 à F-012, F-014 à F-016, F-020, F-022 à F-036 |
| `ULTÉRIEUR` | 4 | F-013, F-017, F-018, F-019 |
| `DIFFÉRÉ` | 4 | F-021, F-037, F-038, F-039 |

## 3. Baseline des 51 fonctions

Colonne « Écart » : justification obligatoire lorsque la classification
s'écarte de la colonne « Priorité » de la matrice fonctionnelle. Un `P0`
classé `MVP`, un `P2`/`P3` classé `DIFFÉRÉ` et un `P1` classé `ULTÉRIEUR` sont
des correspondances attendues et ne constituent pas un écart.

| # | Fonction | Classification | Motif (une phrase) | Dépendance amont | Critère d'acceptation mesurable | Écart vs Priorité |
|---|---|---|---|---|---|---|
| F-001 | Choix de racine | `MVP` | Sans racine choisie, aucun cerveau n'existe et le produit n'a pas de point d'entrée. | — | Sur trois racines synthétiques (courte, profonde, à noms longs), la sélection crée un cerveau; l'annulation ne crée rien et ne laisse aucun fichier. | — (P0) |
| F-002 | Cerveau indépendant | `MVP` | La vision promet plusieurs cerveaux isolés; un état partagé ferait mentir la promesse dès le deuxième cerveau. | F-001 | Deux cerveaux synthétiques ouverts successivement ne partagent aucune ligne d'index, aucune préférence et aucun état vu/non vu; contrôle par comparaison des fichiers de données. | — (P0) |
| F-003 | Scan hiérarchique | `MVP` | La carte n'a aucune source de vérité sans parcours des dossiers, fichiers, noms et métadonnées. | F-001 | Sur une arborescence synthétique connue, l'ensemble des nœuds indexés égale l'ensemble attendu; empreinte des sources identique avant et après scan. | — (P0) |
| F-004 | Identifiants stables | `MVP` | Sans identité qui survit à un renommage, le journal de changements et l'état vu/non vu deviennent du bruit. | F-003 | Sur un jeu synthétique, renommer et déplacer 50 éléments produit 50 corrélations et 0 paire création/suppression non corrélée; les cas non corrélables sont comptés et déclarés. | — (P0) |
| F-005 | Exclusions | `MVP` | Une politique d'exclusion absente expose l'utilisateur à des parcours interminables et à des points de réanalyse suivis par accident. | F-003 | Chaque exclusion appliquée est listable dans l'interface avec sa règle et son motif; une fixture contenant jonction, lien symbolique et dossier exclu produit exactement les exclusions attendues. | — (P0) |
| F-006 | Index reconstructible | `MVP` | Un index non reconstructible transforme une corruption en perte définitive. | F-003 | Supprimer l'index d'un cerveau synthétique puis relancer produit un index équivalent au précédent (mêmes nœuds, mêmes relations hiérarchiques); l'état non reconstructible restauré est explicitement énuméré. | — (P0) |
| F-007 | Carte en blocs | `MVP` | Le nuage de points artificiel du prototype est précisément ce que la reconstruction doit remplacer. | F-003, F-006 | Sur quatre arbres synthétiques de formes différentes, chaque bloc affiché correspond à un dossier réel et la relation d'inclusion visuelle reproduit la relation parent/enfant de l'index, contrôlée nœud par nœud. | — (P0) |
| F-008 | Adaptation aux arbres | `MVP` | Une disposition qui ne tient que sur un arbre équilibré n'est pas une carte générique. | F-007 | Arbres large (1 dossier, 5 000 enfants), profond (profondeur 40), vide et mixte : aucun bloc de largeur nulle, aucun chevauchement de frères, et le libellé du bloc sélectionné reste lisible. | — (P0) |
| F-009 | Panoramique | `MVP` | Une carte plus grande que l'écran et non déplaçable n'est pas navigable. | F-007 | Déplacement à la souris, au pavé tactile et au clavier; après déplacement, la position du bloc sélectionné dans l'index est inchangée. | **Oui** : P1 → `MVP`, car la navigation est nommée dans le paragraphe MVP de la vision et une carte immobile rend F-007 inutile. |
| F-010 | Zoom | `MVP` | Sans zoom, les niveaux profonds d'un arbre réel sont inatteignables. | F-009 | Zoom borné (facteur minimal et maximal déclarés), centré sur le pointeur ou sur la sélection, accessible au clavier; aucun état de vue hors bornes atteignable. | **Oui** : P1 → `MVP`, même motif que F-009. |
| F-011 | Ajuster à l'écran | `MVP` | Sans recadrage, un utilisateur qui s'est perdu n'a aucun moyen de revenir à une vue utile. | F-010 | Depuis n'importe quel état de vue atteignable, la commande rend la carte complète — ou la sélection — entièrement visible en une action. | **Oui** : P1 → `MVP`, sortie de secours indispensable dès que F-009 et F-010 existent. |
| F-012 | Réinitialiser la vue | `MVP` | Une commande déterministe de retour à l'état initial est le filet de sécurité minimal du parcours. | F-010 | La commande produit exactement la même vue que l'ouverture du cerveau, vérifiée par comparaison des paramètres de vue; elle est atteignable au clavier. | **Oui** : P1 → `MVP`. Le rappel d'une vue *enregistrée* n'appartient pas à la portée MVP de F-033 et reste hors du critère. |
| F-013 | Panneau latéral | **`MVP`** — amendé 2026-08-31, §8<br>*`TASK-0011` : `ULTÉRIEUR`* | **Motif courant :** exigence de parité `P-12`; masquer le panneau **et retrouver l'état intégral** est un geste de navigation de la référence fonctionnelle. — *Motif d'origine, conservé : « Masquer le panneau est un gain d'espace, pas une condition de véracité de la carte. »* | F-023 | Masquer puis afficher conserve la sélection, le défilement et les filtres; l'état survit au redémarrage. | **Oui** : P1 → `MVP`, par `DEC-0015` C |
| F-014 | Légende | `MVP` | Un codage couleur non expliqué contrevient au critère WCAG 1.4.1 et rend la carte indéchiffrable. | F-007 | Chaque couleur ou motif employé sur la carte figure dans la légende avec son sens; la légende est atteignable au clavier et lisible sans distinction de couleur. | **Oui** : P1 → `MVP`, exigence d'accessibilité de niveau A, pas un ornement (voir §5). |
| F-015 | Sélection | `MVP` | Sans sélection, ni le panneau de détails ni l'ouverture Windows n'ont d'objet. | F-007 | Sélection à la souris et au clavier; la carte et la liste sémantique désignent le même nœud à tout instant, contrôlé sur une fixture synthétique. | — (P0) |
| F-016 | Relations hiérarchiques | `MVP` | La hiérarchie est la seule relation que la vision autorise à dériver automatiquement; c'est le contenu même de la carte. | F-007, F-023 | Pour chaque nœud d'une fixture, le parent et les enfants directs affichés égalent ceux de l'index; aucun lien affiché sans contrepartie dans l'arborescence. | — (P0) |
| F-017 | Relations transversales | **`MVP`** — amendé 2026-08-31, §8<br>*`TASK-0011` : `ULTÉRIEUR`* | **Motif courant :** exigence de parité `P-04`; les relations transversales avec provenance sont un comportement de la référence fonctionnelle, pas un enrichissement. — *Motif d'origine, conservé : « Une carte hiérarchique fidèle est déjà utile; les relations transversales exigent un modèle de provenance non nécessaire au premier usage. »* | F-016 | Chaque relation affichée expose son type et sa provenance (`déterministe`, `approuvée`, `suggérée`); aucune relation sans provenance n'est représentable dans le modèle. **La provenance est visible à l'écran, et le stockage vit hors de l'arborescence analysée.** | **Oui** : P1 → `MVP`, par `DEC-0015` C |
| F-018 | Mise en évidence | **`MVP`** — amendé 2026-08-31, §8<br>*`TASK-0011` : `ULTÉRIEUR`* | **Motif courant :** exigence de parité `P-06`; accentuer parent et enfants directs et atténuer le reste vaut **aussi pour la hiérarchie seule**, indépendamment de F-017. — *Motif d'origine, conservé : « La mise en évidence sert surtout les relations transversales, elles-mêmes `ULTÉRIEUR`. »* | F-015, F-016, F-017 | Les états « accentué » et « atténué » sont distinguables sans recours à la seule couleur et n'altèrent aucun contenu de l'index. **L'information atténuée reste lisible et atteignable.** | **Oui** : P1 → `MVP`, par `DEC-0015` C |
| F-019 | Relations entrantes/sortantes | **`MVP`** — amendé 2026-08-31, §8<br>*`TASK-0011` : `ULTÉRIEUR`* | **Motif courant :** exigence de parité `P-05`; une relation dont la direction n'est pas lisible est une information incomplète. — *Motif d'origine, conservé : « Distinguer les directions n'a de sens qu'une fois les relations transversales existantes. »* | F-017 | Pour une fixture de relations synthétiques, les comptes entrants et sortants du panneau et de la carte coïncident exactement. **La distinction est perceptible sans recours à la seule couleur.** | **Oui** : P2 → `MVP`, par `DEC-0015` C |
| F-020 | Recherche nom/chemin | `MVP` | Sur un arbre réel, retrouver un élément sans recherche est impraticable. | F-006 | Sur une fixture de 100 000 nœuds synthétiques, une requête retourne exactement l'ensemble attendu, paginé et borné, et aucun résultat hors du cerveau actif. | — (P0) |
| F-021 | Recherche sujet/rôle | `DIFFÉRÉ` | Elle suppose une couche d'extraction de contenu explicitement hors du MVP structurel. | F-037 | Chaque résultat cite le fichier et l'emplacement extrait; fonctionnement entièrement local. | — (P2) |
| F-022 | Filtres dynamiques | `MVP` | « Tout / Nouveaux / Non vus » est le mécanisme par lequel l'utilisateur consomme le journal de changements. | F-027, F-028 | Les trois filtres de base plus type et disponibilité sont combinables et dérivés de l'index; le total filtré égale le compte issu d'une requête indépendante. Les **facettes dynamiques dérivées des données** restent hors du critère MVP. | — (P1) |
| F-023 | Détails | `MVP` | Sans chemin, dates, parent, enfants et état, la sélection n'apprend rien à l'utilisateur. | F-015 | Pour chaque nœud d'une fixture, les propriétés essentielles affichées égalent celles de l'index; les diagnostics d'accès sont affichés au lieu d'être masqués. | — (P0) |
| F-024 | Copier le chemin | `MVP` | Transporter un chemin vers un autre outil est un geste essentiel de l'interface de référence, que l'ouverture dans l'Explorateur (F-025) ne remplace pas. | F-023 | La copie reproduit le chemin réel exact du nœud sélectionné et est atteignable au clavier; contrôlée sur une fixture synthétique à noms longs et à caractères non ASCII; aucun chemin n'est écrit dans un journal exportable. | **Oui** : P1 → `MVP`, geste essentiel repris de l'interface de référence et reproduit de façon générique. |
| F-025 | Ouvrir dans Explorateur | `MVP` | C'est la seule action sortante du produit et un critère de succès explicite de la vision. | F-023 | Sur une fixture synthétique Windows, un dossier s'ouvre et un fichier est sélectionné; une cible hors racine ou disparue produit une erreur explicite sans modification de la source. | — (P0) |
| F-026 | Contenu du dossier | `MVP` | Descendre dans un dossier est le geste central d'une carte hiérarchique; sans lui, la carte ne se parcourt pas. | F-016 | La liste affiche exactement les enfants directs du nœud, paginée, et chaque entrée est sélectionnable au clavier. | **Oui** : P1 → `MVP`, parce que F-007 et F-016 ne produisent une navigation qu'accompagnés de ce geste. |
| F-027 | Journal de changements | `MVP` | Sans journal, « Nouveaux », « Non vus » et la surveillance n'ont rien à afficher. | F-004, F-006 | Un scénario synthétique de créations, modifications, déplacements, renommages et suppressions produit exactement les événements attendus, ordonnés et attribués au bon nœud. | — (P0) |
| F-028 | Vu/non vu | `MVP` | Un journal sans marquage vu oblige l'utilisateur à relire indéfiniment les mêmes changements. | F-027 | Marquer un élément, marquer un changement et « tout marquer vu » persistent au redémarrage et n'affectent aucun autre cerveau. | **Oui** : P1 → `MVP`, l'état vu/non vu fait partie de l'isolation des cerveaux exigée par la vision. |
| F-029 | Actualisation manuelle | `MVP` | L'utilisateur doit pouvoir forcer une mise à jour sans attendre la surveillance. | F-031 | L'actualisation produit un résumé des changements et **ne vide jamais** l'index courant avant d'avoir un remplacement valide, vérifié par interruption forcée en cours d'opération. | — (P0) |
| F-030 | Surveillance automatique | `MVP` | La vision promet une carte « maintenue à jour »; sans surveillance, la promesse est fausse. | F-027, F-031 | Rafale de 10 000 événements synthétiques, perte simulée d'événements et reprise après interruption aboutissent tous à un index égal à celui d'un scan complet de référence. | — (P0) |
| F-031 | Mise à jour incrémentale | `MVP` | Le `DELETE` puis réinsertion du prototype rend toute surveillance inutilisable en coût. | F-004 | Le coût d'une mise à jour est proportionnel au nombre de changements, non à la taille de l'index : mesuré sur 1 000, 10 000 et 100 000 nœuds avec 10 changements, l'écart de durée reste sous un facteur déclaré. | — (P0) |
| F-032 | Indisponibilité temporaire | `MVP` | Un lecteur débranché ne doit jamais être interprété comme une suppression massive. | F-030 | Racine rendue inaccessible : l'index et les préférences sont intacts, l'état est signalé, et aucun événement de suppression n'est journalisé. | — (P0) |
| F-033 | Personnalisation du cerveau | `MVP` | Sans nom, couleur et icône propres, l'isolation promise par F-002 et F-034 n'est pas perceptible : plusieurs cerveaux deviennent indiscernables pour l'utilisateur. | F-002 | **Portée MVP : nom modifiable, couleur modifiable, icône modifiable, persistance indépendante par cerveau, valeurs par défaut utilisables sans configuration obligatoire.** Sur trois cerveaux synthétiques : éditer l'un n'altère aucun autre; les valeurs éditées persistent au redémarrage; un cerveau créé sans aucune édition reste pleinement utilisable; aucune de ces valeurs n'apparaît dans un document analysé. | **Oui** : P1 → `MVP`, condition pour distinguer plusieurs cerveaux et reproduire génériquement les options essentielles de l'interface de référence. |
| F-034 | Plusieurs cerveaux | `MVP` | Le défaut connu du prototype — l'onglet ne charge pas son index — est traité ici comme exigence, pas comme bogue reporté. | F-002 | Basculer d'onglet charge l'index, la carte, les filtres et la vue du cerveau visé; après redémarrage, chaque cerveau retrouve son état, vérifié sur trois cerveaux synthétiques. | — (P0) |
| F-035 | FR/EN | `MVP` | Le bilinguisme persistant existe déjà dans le prototype; le perdre serait une régression visible. | — | Les deux langues couvrent l'intégralité des libellés de l'interface, le choix persiste au redémarrage, et un libellé manquant est détecté par un contrôle automatisé. | **Oui** : P1 → `MVP`, la vision exige FR/EN persistants et le prototype le fournit déjà. |
| F-036 | Accessibilité | `MVP` | Le clavier (WCAG 2.1.1, niveau A) et le non-recours à la seule couleur (1.4.1, niveau A) sont des exigences, pas des ajouts. | F-009, F-014, F-015 | Niveau visé **WCAG 2.2 AA** : parcours complet au clavier sans piège, contraste ≥ 4,5:1 pour le texte, alternative non colorée pour chaque codage, `prefers-reduced-motion` respecté; audit automatisé plus contrôle clavier manuel. | **Oui** : P1 → `MVP`, motif ci-dessus et §5. |
| F-037 | Extraction de contenu | `DIFFÉRÉ` | La vision place l'extraction hors du MVP structurel et la conditionne au consentement. | F-006 | Chaque format déclare sa couche, sa provenance et son traitement d'erreur; l'extraction est désactivée par défaut. | — (P2) |
| F-038 | RAG cité | `DIFFÉRÉ` | Facultatif par décision de vision; sa présence ne doit jamais devenir nécessaire au produit. | F-037 | Réponse fondée sur des sources locales citées; aucun transfert distant sans consentement explicite et révocable. | — (P3) |
| F-039 | GraphRAG | `DIFFÉRÉ` | À n'étudier qu'après un RAG hybride cité et sur besoin mesuré. | F-038 | Gain mesuré et reproductible contre le RAG cité, sur données synthétiques. | — (P3) |
| F-040 | Vue composée multi-cerveaux | `MVP` | La direction produit (`DEC-0017`) fait du multi-cerveaux la forme du produit; une vue doit pouvoir en montrer plusieurs sans jamais les fusionner. | F-002, F-034 | Deux cerveaux synthétiques affichés dans la même vue n'ont **aucun** fichier de stockage commun, **aucun** état commun, et **chaque** élément affiché porte un cerveau d'origine non ambigu; retirer un cerveau de la vue ne modifie **aucune** de ses données. | **Oui** : P1 → `MVP`, extension produit décidée par `DEC-0017`. |
| F-041 | Relations inter-cerveaux explicites | `MVP` | La direction produit (`DEC-0018`) veut qu'un document d'un cerveau puisse en référencer un autre **sans** que les deux cerveaux soient fusionnés; une vue composée qui montre deux cerveaux côte à côte sans jamais pouvoir les relier reste muette. | F-002, F-017, F-040 | Une relation inter-cerveaux porte **deux** extrémités de **deux cerveaux différents**, un type, et une provenance `DETERMINISTIC` (règle nommée et versionnée) ou `APPROVED` (approbation explicite) — jamais une troisième valeur; elle **survit** à une reconstruction complète des deux index; elle n'implique **jamais** son inverse; une suggestion n'entre dans **aucun** compte avant approbation; et la seule ressemblance de noms, de chemins ou de fichiers n'en crée **aucune**. | **Oui** : P1 → `MVP`, extension produit décidée par `DEC-0018`. |
| F-042 | Repli/dépli et focus de branche | **`MVP`** *(promue le 2026-09-06 par `DEC-0029` B; valeur d'origine : `ULTÉRIEUR`, `DEC-0020`)* | `DEC-0020` fait de la représentation principale un **graphe hiérarchique à nœuds reliés**; replier une branche et focaliser sur un sous-ensemble sont les deux gestes qu'un graphe rend possibles et qu'un pavage ne permettait pas. **Motif de la promotion :** sous l'architecture progressive de `DEC-0029`, ces gestes **déterminent le contenu de la vue matérialisée**; ils deviennent donc **primitive de navigation ET primitive de performance**, et non plus un confort. **Motif d'origine, conservé :** « nommés pour ne pas être oubliés, non promis au MVP : `P-02` corrigée est satisfaisable sans eux » — vrai avant `DEC-0029`, faux depuis, parce que `P-02` **amendée par `P-SCALE-R1`** exige de déclarer tout repli avec son compte exact. | F-007, F-008, F-009, F-010, **F-050**, **F-051** | Replier une branche masque **exactement** ses descendants; déplier restitue l'état antérieur; le focus n'affiche **aucun** nœud extérieur à la branche et le **dit en mots**; les deux sont atteignables au clavier et réversibles en une action; **tout sous-arbre replié est déclaré avec son compte exact**. | Non : `P2` → `MVP` **monte** la fonction. Aucune règle de §3 n'interdit une montée; la promotion est **déclarée** par `DEC-0029` B et la valeur d'origine est **conservée** dans cette colonne. |
| F-043 | Moteur de signaux et relations déterministes explicables | `MVP` | Six tranches ont livré le **modèle** de relation avec provenance, mais **aucune règle n'en produit** : `DETERMINISTIC` est une valeur d'énumération dont rien ne remplit la définition. Sans producteur, un utilisateur obtient une carte et **zéro** relation transversale, et `P-04` reste indéfiniment partielle. `DEC-0021`. | F-003, F-006, F-016, F-017 | Chaque relation produite cite sa **règle** et sa **version**; chaque suggestion est **explicable en langage ordinaire**; **aucun score numérique seul** ne crée de relation établie; le moteur fonctionne **hors ligne, sans clé, sans compte et sans LLM**; aucune règle du noyau ne suppose un métier (`DEC-0019`). | **Oui** : `P0` → `MVP`, conforme; extension produit décidée par `DEC-0021`. |
| F-044 | File de révision des suggestions | `MVP` | Une suggestion sans moyen simple de la confirmer est une nuisance, et le produit en produira beaucoup dès que `F-043` existe. La file est ce qui rend la distinction « suggestion / relation établie » **utilisable** plutôt que seulement correcte. `DEC-0021` §8. | F-017, F-043 | États **`PENDING`, `APPROVED`, `REJECTED`**, plus `DEFERRED` seulement si le besoin est démontré; l'explication montre **source, cible, type proposé, pourquoi, signaux**; **`Confirmer`** produit une relation `APPROVED` et jamais une troisième valeur; suggestion et relation établie sont distinguables **sans recourir à la seule couleur**; aucune interface technique n'est requise. | **Oui** : `P1` → `MVP`, extension produit décidée par `DEC-0021`. |
| F-045 | Mémoire des décisions humaines sur les suggestions | `MVP` | Un moteur qui repropose à chaque scan ce que l'utilisateur vient de rejeter est abandonné en une semaine. La mémoire des rejets est ce qui empêche `F-044` de devenir une corvée périodique. `DEC-0021` §9. | F-043, F-044, F-028 | Une décision enregistre **suggestion, règle et version, extrémités, décision, date** et l'éventuelle **cause de réévaluation**; un scan **sans changement pertinent** ne repropose **aucune** suggestion rejetée; la décision **survit au redémarrage** et **n'affecte aucun autre cerveau**. | **Oui** : `P1` → `MVP`, extension produit décidée par `DEC-0021`. |
| F-046 | Identité de contenu et doublons exacts | `MVP` | Le hash est le signal le plus fort et le plus falsifiable dont dispose un moteur déterministe. Il mérite sa propre ligne parce que c'est aussi le signal le plus facile à **surinterpréter** : « même contenu » n'est ni « même objet », ni « copie », ni « relation ». `DEC-0021` §5. | F-003, F-004, F-043 | **Hash identique ⇒ contenu binaire identique**, jamais « même fichier physique »; l'identité d'objet emploie **`VolumeSerialNumber` + `FileId`**, `FileId` seul interdit (`DEC-0013`); le calcul **ne modifie aucune source** (`I-1`); deux fichiers vides identiques ne produisent **aucune** relation logique automatique. | **Oui** : `P1` → `MVP`, extension produit décidée par `DEC-0021`. |
| F-047 | Couche IA facultative `BYOK` | `DIFFÉRÉ` | `PROJECT_VISION.md` prévoit un enrichissement facultatif à fournisseurs configurables; `DEC-0012` a placé la frontière `F-D`. `DEC-0022` dit ce qui a le droit de la traverser : **des suggestions, jamais des relations établies**. Reste `DIFFÉRÉ`, comme `F-037` à `F-039`. | F-043, F-044, F-049 | Le produit est **complet sans clé, sans compte et sans connexion**; l'architecture est **agnostique du fournisseur**; une suggestion IA porte **fournisseur, modèle, date, justification** pour l'audit; approuvée, elle devient `APPROVED` — **aucune troisième provenance « AI »**; **rien ne sort** sans autorisation explicite par niveaux. | Non : `P3` → `DIFFÉRÉ`, conforme. |
| F-048 | Identités, groupes et mode équipe | `ULTÉRIEUR` | `DEC-0019` nomme les équipes, entreprises et cabinets parmi les cibles; un modèle mono-utilisateur les exclurait dès la première ligne de schéma. `DEC-0023` retient **un seul modèle conceptuel, deux modes de remplissage**, pour éviter deux produits qui divergent. | F-002, F-034, F-040, F-049 | Le mode personnel emploie l'**identité de l'OS courante**, sans compte ni connexion, et **ne montre aucune trace** du mode équipe; `Identity`, `Groups`, `Brains`, `Views`, `Relations`, `Permissions` forment **un seul modèle**; **aucun contrôleur de domaine n'est exigé**; le mode personnel ne paie **aucun** coût du mode équipe. | **Oui** : `P2` → `ULTÉRIEUR`, conforme; extension produit décidée par `DEC-0023`. |
| F-049 | Rendu, recherche et relations conscients des permissions | `ULTÉRIEUR` | « L'utilisateur ne peut pas ouvrir le fichier » **n'est pas suffisant** : dans beaucoup d'environnements, le **nom** d'un dossier est plus révélateur que son contenu. Le filtrage doit précéder le rendu, la recherche et les relations. `DEC-0023` §5. **Prérequis dur de `F-048`** : un mode équipe sans lui serait une régression de confidentialité. | F-020, F-022, F-023, F-043, F-048 | Pour un objet non autorisé : **ni nom, ni chemin, ni métadonnée, ni relation, ni suggestion, ni résultat de recherche, ni compteur révélateur** — un total qui trahit **par soustraction** est un échec; le filtrage s'applique **avant** rendu, recherche et relations; **la source reste autoritaire**, et **aucun droit n'est écrit, créé ni modifié** (`I-1`). | **Oui** : `P0` → `ULTÉRIEUR`. **Écart déclaré et assumé** : `P0` classé `ULTÉRIEUR` **abaisserait** normalement une fonction, ce que ce document interdit. Ici il n'y a **aucun abaissement**, parce que la fonction est **nouvelle** et n'a jamais été `MVP` : la priorité `P0` dit son **importance quand le mode équipe existera**, et `ULTÉRIEUR` dit qu'un utilisateur seul n'en a pas besoin. Elle devient **obligatoire** dès que `F-048` est entreprise, et les deux se livrent **ensemble ou pas du tout**. |
| F-050 | Matérialisation progressive et vue bornée | **`MVP`** *(extension produit `DEC-0029` A, 2026-09-06)* | `P-08` exige déjà une recherche exacte sur **100 000 nœuds**, et `P-18` une mise à jour incrémentale mesurée à la même échelle. Aucune des deux n'est satisfaisable tant qu'« exister dans le cerveau » et « être rendu » sont la même chose. `MAX_NODES_PER_MAP = 5_000` refuse la carte au-delà du plafond : c'est une **borne de tranche**, pas une réponse produit. La vue bornée est la **seule** façon de tenir la promesse « très grands cerveaux numériques » sur un laptop **sans GPU puissant**. | F-007, F-008, F-042, F-051 | Le **nombre de nœuds et d'arêtes envoyés au frontend ne croît pas proportionnellement au corpus**, à 10 000, 100 000 et 1 000 000 d'éléments synthétiques; **aucun whole-graph JSON** n'est sérialisé vers l'interface; le layout s'applique **à la vue matérialisée seulement**; le fonctionnement de base **ne dépend ni d'un GPU puissant ni de WebGL**; **tout élément indexé reste atteignable** en un nombre borné d'actions — `P-01` amendée. | Non : `P0` → `MVP`, conforme. |
| F-051 | Agrégats et méta-nœuds exacts | **`MVP`** *(extension produit `DEC-0029` C, 2026-09-06)* | `F-050` cache nécessairement des éléments réels. Sans une façon **exacte et honnête** de représenter ce qui est caché, la vue devrait soit le **taire** — violation de `P-02` amendée, qui interdit désormais de mentir par omission — soit **renoncer à matérialiser** — annulation de `F-050`. L'agrégat est la **contrepartie de véracité** de la vue bornée, pas un enrichissement ultérieur. | F-050, F-016, F-026 | Un agrégat porte un **compte exact** — jamais estimé, arrondi ni tronqué en « 999+ » — et une **provenance ou raison de regroupement** lisible; ce qu'il résume reste **atteignable**; il **n'est jamais présenté comme un dossier**, ni dans un chemin, ni à la copie, ni à l'ouverture Windows; il **ne crée aucune arête**; **dossier réel**, **agrégat FileTopo**, **communauté calculée** et **suggestion** restent **quatre natures distinctes**. | Non : `P0` → `MVP`, conforme. **Livrée avec `F-050` ou pas du tout** : l'une sans l'autre produit une vue qui ment. |

## 4. Contrôle de couverture

**Fait, contrôlé mécaniquement pendant l'exécution de `TASK-0011`** (résultats
reportés dans [VALIDATION.md](../ai/VALIDATION.md), section `TASK-0011`) :

- 39 lignes, identifiants `F-001` à `F-039`, aucun manquant, aucun dupliqué;
- chaque ligne porte exactement une valeur parmi `MVP`, `ULTÉRIEUR`, `DIFFÉRÉ`;
- **11 écarts** avec la colonne « Priorité » de la matrice fonctionnelle sont
  déclarés et justifiés : F-009, F-010, F-011, F-012, F-014, F-024, F-026,
  F-028, F-033, F-035, F-036. Tous vont de `P1` vers `MVP`; aucun n'abaisse
  une fonction `P0`.

**Après l'amendement du 2026-08-31 — contrôlé par relecture, non exécuté :**

- 39 lignes, `F-001` à `F-039`, aucun manquant, aucun dupliqué; **la matrice
  reste à 39 fonctions, aucune n'a été inventée**;
- **15 écarts** avec la colonne « Priorité » : les 11 ci-dessus, **plus**
  F-013, F-017, F-018 et F-019. Trois vont de `P1` vers `MVP`, un — F-019 — de
  `P2` vers `MVP`. **Aucun n'abaisse une fonction**;
- **la catégorie `ULTÉRIEUR` est désormais vide.** Ce n'est pas une erreur : la
  parité ne laisse rien entre « nécessaire » et « différé ».

**Après l'ajout de `F-040` le 2026-09-01 — contrôlé par relecture, non
exécuté :**

- **40 lignes**, `F-001` à `F-040`, aucun manquant, aucun dupliqué. **Une
  fonction a été ajoutée, et elle est déclarée** : `F-040`, par
  [DEC-0017](../decisions/DEC-0017-multibrain-and-composed-views.md). **Aucune
  ligne existante n'a changé de classification, aucune n'est descendue, aucune
  n'a disparu**;
- **16 écarts** avec la colonne « Priorité » : les 15 ci-dessus, **plus**
  `F-040`, qui va de `P1` vers `MVP`. **Aucun n'abaisse une fonction**;
- `F-040` **n'est pas une exigence de parité** et n'en remplace aucune :
  **`P-20` reste entière**, et le contrat CarteTopo n'est pas retouché.

**Après l'ajout de `F-041` le 2026-09-02 — contrôlé par relecture, non
exécuté :**

- **41 lignes**, `F-001` à `F-041`, aucun manquant, aucun dupliqué. **Une
  fonction a été ajoutée, et elle est déclarée** : `F-041`, par
  [DEC-0018](../decisions/DEC-0018-explicit-interbrain-relations.md). **Aucune
  ligne existante n'a changé de classification, aucune n'est descendue, aucune
  n'a disparu**;
- **17 écarts** avec la colonne « Priorité » : les 16 ci-dessus, **plus**
  `F-041`, qui va de `P1` vers `MVP`. **Aucun n'abaisse une fonction**;
- `F-041` **n'est pas une exigence de parité** et n'en remplace aucune :
  **`P-04`, `P-05`, `P-06` et `P-20` restent entières**, et le contrat
  CarteTopo n'est pas retouché — il conserve ses 22 exigences;
- **`F-041` n'ouvre aucune détection automatique** entre cerveaux, aucune
  heuristique, aucune révocation (`P-21` demeure), et **aucune fusion**.

**Après le réalignement produit du 2026-09-02 — contrôlé par relecture, non
exécuté :**

- **49 lignes**, `F-001` à `F-049`, aucun manquant, aucun dupliqué. **Huit
  fonctions ont été ajoutées, et elles sont déclarées** : `F-042` par
  [DEC-0020](../decisions/DEC-0020-topographic-node-graph.md), `F-043` à
  `F-046` par [DEC-0021](../decisions/DEC-0021-deterministic-relation-engine.md),
  `F-047` par [DEC-0022](../decisions/DEC-0022-optional-byok-ai-layer.md),
  `F-048` et `F-049` par
  [DEC-0023](../decisions/DEC-0023-identity-and-source-permissions.md).
  **Aucune ligne existante n'a changé de classification, aucune n'est
  descendue, aucune n'a disparu**;
- **21 écarts** avec la colonne « Priorité » : les 17 ci-dessus, **plus**
  `F-043` (`P0` → `MVP`, conforme), `F-044`, `F-045` et `F-046` (`P1` →
  `MVP`). **Aucun n'abaisse une fonction**;
- **un écart d'une nature nouvelle est déclaré séparément : `F-049`**, `P0`
  classée `ULTÉRIEUR`. Ce document interdit d'**abaisser** une fonction, et
  rien n'est abaissé ici : `F-049` est **nouvelle** et n'a jamais été `MVP`.
  Sa priorité `P0` exprime son importance **quand le mode équipe existera**;
  sa classification `ULTÉRIEUR` exprime qu'un utilisateur seul n'en a pas
  besoin. Elle devient **obligatoire** dès que `F-048` est entreprise;
- **`F-007` et `F-008` changent de comportement cible**, sous `DEC-0020`, et
  **pas de classification** : elles restent `MVP` et `P0`. Le changement est
  déclaré dans la matrice et dans cette section, jamais silencieux;
- **le contrat de parité conserve ses 22 exigences.** `P-02` est **corrigée**
  par la correction normative **`P02-R1`** — l'ancienne formulation est conservée
  et visible —, et `P-01`, `P-03` à `P-22` sont **inchangées**. Aucune de ces
  huit fonctions n'est une exigence de parité, et aucune n'en remplace une;
- **aucune de ces huit fonctions n'est implémentée, prouvée ni commencée.**
  Elles sont toutes `PROPOSED`.

**Après le réalignement d'architecture à grande échelle du 2026-09-06 —
contrôlé par relecture, non exécuté :**

- **51 lignes**, `F-001` à `F-051`, aucun manquant, aucun dupliqué. **Deux
  fonctions ont été ajoutées, et elles sont déclarées** : `F-050` et `F-051`,
  par [DEC-0029](../decisions/DEC-0029-progressive-materialization-and-scale-boundary.md).
  **Aucune ligne n'est descendue, aucune n'a disparu**;
- **une seule classification existante change, et elle MONTE** : **`F-042`**
  passe d'`ULTÉRIEUR` à **`MVP`**, par `DEC-0029` B. La valeur d'origine est
  **conservée et visible** dans sa colonne, ainsi que son motif d'époque. Ce
  document interdit d'**abaisser** une fonction; il n'interdit pas d'en monter
  une, à condition que la montée soit **déclarée** — elle l'est;
- **24 écarts** avec la colonne « Priorité » : les 21 ci-dessus, **plus**
  `F-042` (`P2` → `MVP`), `F-050` et `F-051` (`P0` → `MVP`, conformes).
  **Aucun n'abaisse une fonction**;
- **la catégorie `ULTÉRIEUR` retombe à deux fonctions**, `F-048` et `F-049`,
  toutes deux liées au multi-utilisateur de `DEC-0023`. Rien d'autre n'y entre
  ni n'en sort;
- **`F-050` et `F-051` ne sont pas des exigences de parité** et n'en
  remplacent aucune. **Le contrat de parité conserve ses 22 exigences** :
  `P-01`, `P-02` et `P-03` sont **amendées** par l'amendement normatif
  **`P-SCALE-R1`** — les formulations d'origine sont **conservées et
  visibles** —, et `P-04` à `P-22` sont **inchangées**. **`P-08` devient un
  pilier du scale spike**, entière et inchangée;
- **`F-051` est livrée avec `F-050` ou pas du tout** : une vue bornée sans
  agrégat exact ment par omission, ce que `P-02` amendée interdit;
- **Graphify n'est ajouté comme aucune fonction** : `NOT INTEGRATED`,
  `DEC-0029` G. **Forge reste un projet distinct**, `DEC-0029` H;
- **ni `F-050` ni `F-051` n'est implémentée, prouvée ni commencée.** Elles
  sont `PROPOSED`. **Aucune mesure de performance n'existe** à 10 000,
  100 000 ni 1 000 000 d'éléments : les trois niveaux sont des **cibles de
  validation futures**, jamais des résultats.

**Inférence.** Ces 11 écarts se concentrent dans « la navigation et les
détails essentiels » que la vision place explicitement dans le MVP, plus
l'accessibilité et le bilinguisme, qui sont des exigences de niveau A ou déjà
acquises, plus les deux gestes essentiels repris de l'interface de référence
et reproduits de façon générique : agir sur l'élément sélectionné (F-024) et
distinguer un cerveau d'un autre (F-033). Aucun écart n'élargit le MVP vers
l'enrichissement, l'extraction ou l'IA.

## 5. Sources officielles citées par ce document

| Source | URL | Consultée le | Sert à |
|---|---|---|---|
| WCAG 2.2, critères 2.1.1 (Clavier, A), 1.4.1 (Utilisation de la couleur, A), 1.4.3 (Contraste minimal, AA), 2.4.7 (Visibilité du focus, AA) | https://www.w3.org/WAI/WCAG22/quickref/ | 2026-08-31 | Niveau visé de F-036 et exigence de F-014 |
| W3C Media Queries Level 5, `prefers-reduced-motion` | https://www.w3.org/TR/mediaqueries-5/#prefers-reduced-motion | 2026-08-31 | Critère de réduction de mouvement de F-036 |
| ARIA Authoring Practices Guide, motif « Tree View » | https://www.w3.org/WAI/ARIA/apg/patterns/treeview/ | 2026-08-31 | Modèle clavier de F-015, F-016 et F-026 |

## 6. Limites de ce livrable

- **Non testé.** Aucun critère d'acceptation de ce document n'a été exécuté.
  Ce sont des cibles à falsifier, pas des résultats.
- La classification est un **arbitrage soumis à Sébastien** : elle n'engage
  rien tant que la porte P2 n'est pas franchie.
- Certains critères délèguent leurs seuils chiffrés à
  [BASELINE_TARGETS.md](../performance/BASELINE_TARGETS.md) (facteur de F-031)
  ou à la phase de développement (bornes de zoom de F-010).
- Un `MVP` impossible à tenir doit être **redescendu par décision écrite**;
  le livrer partiellement en le déclarant fait serait exactement la dérive que
  `TASK-0010` a documentée sur le prototype.

## 7. Documents liés

- [CARTETOPO_FUNCTIONAL_PARITY.md](CARTETOPO_FUNCTIONAL_PARITY.md) — **contrat
  produit courant**, 22 exigences de parité
- [FEATURE_MATRIX.md](FEATURE_MATRIX.md) — constats d'audit et preuves de code
- [USER_JOURNEY.md](USER_JOURNEY.md) — parcours servi par ces fonctions
- [ARCHITECTURE_BASELINE.md](../architecture/ARCHITECTURE_BASELINE.md)
- [FORMAT_MATRIX.md](../architecture/FORMAT_MATRIX.md)
- [BASELINE_TARGETS.md](../performance/BASELINE_TARGETS.md)
- [TEST_STRATEGY.md](../architecture/TEST_STRATEGY.md)
- [DEC-0015](../decisions/DEC-0015-product-parity-and-layout-scope.md) —
  décision qui porte l'amendement de §8

## 8. Amendement du 2026-08-31 — réalignement sur la référence fonctionnelle

- **Tâche :** `TASK-0015`
- **Décideur :** **Sébastien**, au titre de la **direction produit**. Ce point
  n'est **pas délégué** à l'orchestrateur technique.
- **Décision qui l'enregistre :**
  [DEC-0015](../decisions/DEC-0015-product-parity-and-layout-scope.md), point
  `C`
- **Nature :** documentaire. **Non testé.** Aucun critère n'a été exécuté.

### 8.1 Pourquoi la classification changeait

Ce document avait été rédigé en 2026-08-31 en comparant le périmètre à
**l'ancienne version publique de FileTopo**. Sébastien établit que cette
version est un **prototype et un audit technique**, et que la **référence
fonctionnelle est CarteTopo**. Quatre fonctions avaient donc été jugées
« confort » alors qu'elles sont des **comportements de la référence**.

**FileTopo final doit généraliser le bon fonctionnement de CarteTopo à
n'importe quelle arborescence ou « cerveau numérique ».** L'interface visuelle
reste **entièrement libre** — formes, couleurs, typographie, panneaux,
animations, organisation —, mais **aucune amélioration visuelle ne peut
supprimer la parité fonctionnelle**. Le contrat complet est
[CARTETOPO_FUNCTIONAL_PARITY.md](CARTETOPO_FUNCTIONAL_PARITY.md).

### 8.2 Les quatre reclassements

| Fonction | Classification `TASK-0011` | Classification courante | Exigence de parité |
|---|---|---|---|
| `F-013` — panneau latéral masquable | `ULTÉRIEUR` | **`MVP`** | `P-12` |
| `F-017` — relations transversales | `ULTÉRIEUR` | **`MVP`** | `P-04` |
| `F-018` — mise en évidence | `ULTÉRIEUR` | **`MVP`** | `P-06` |
| `F-019` — relations entrantes/sortantes | `ULTÉRIEUR` | **`MVP`** | `P-05` |

**Aucune fonction n'est descendue.** Aucune fonction n'a été ajoutée ni
supprimée : la matrice reste à **39** lignes.

### 8.3 Ce qui reste DIFFÉRÉ, explicitement

`F-021` recherche par sujet ou rôle, `F-037` extraction de contenu et OCR,
`F-038` RAG cité et `F-039` GraphRAG **restent `DIFFÉRÉ`**.
[DEC-0012](../decisions/DEC-0012-ai-architectural-boundary.md) est
**inchangée**. **Aucune exigence de parité ne peut être satisfaite au moyen de
l'une de ces couches** : un produit sans IA, sans OCR, sans extraction et sans
RAG doit satisfaire l'intégralité du contrat.

### 8.4 Ce que cet amendement coûte, dit franchement

Il **augmente** la charge du MVP de quatre fonctions. `F-017` apporte un
**modèle de provenance** dont `DEC-0009` fixe les principes (`R-C`) mais dont
la mise en œuvre est **entièrement à écrire**. La feuille de route en tient
compte : l'étape **A** est plus longue qu'avant cet amendement. **Aucune
estimation d'effort n'est fournie, et aucune ne doit être supposée.**

### 8.5 Manque déclaré

La **persistance des préférences** — vue, panneau, filtres, légende, densité,
accessibilité — n'a **pas de fonction propre** dans la matrice : elle est
répartie entre `F-012`, `F-013`, `F-022`, `F-033` et `F-034`. C'est le manque
`M-1` du contrat de parité. **Aucune fonction n'a été inventée pour le
combler** : une révision ultérieure devra soit en créer une, soit rattacher
explicitement chaque valeur à une fonction existante.
