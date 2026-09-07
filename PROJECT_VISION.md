# Vision de FileTopo

## Vision finale

FileTopo doit permettre à une personne non technique de comprendre et parcourir
son cerveau numérique sans programmer une carte. L'utilisateur choisit un
répertoire racine; l'application construit automatiquement une représentation
topographique interactive de sa hiérarchie réelle, puis la maintient à jour.

Le produit vise le grand public sur Windows : gratuit, général, open source,
local d'abord et utilisable sans compte, connexion Internet ou modèle d'IA.
La métaphore topographique doit rester lisible pour des arborescences
différentes, sans catégories personnelles codées en dur.

## Expérience souhaitée

Après la sélection d'une racine, FileTopo crée un cerveau indépendant, indexe
dossiers, fichiers, noms et métadonnées, puis affiche des blocs représentant la
structure réelle. La personne recherche, filtre, déplace et zoome la carte,
sélectionne un bloc, comprend parents, enfants et relations autorisées, consulte
les changements et ouvre un élément dans l'Explorateur Windows.

Plusieurs cerveaux peuvent coexister. Chacun conserve sa racine, son nom, sa
couleur, son icône, ses préférences, sa vue, son index et son état vu/non vu.

> **Précision du 2026-09-02 — réalignement produit, `DEC-0019` à `DEC-0023`.**
> Rien de cette vision n'est retiré; quatre points sont **précisés** :
>
> 1. **FileTopo n'est PAS un produit juridique** — `DEC-0019`. La cible est
>    générique : particuliers, équipes, entreprises, cabinets professionnels,
>    développeurs, chercheurs, architecture, comptabilité, juridique, autres
>    environnements documentaires. Le juridique est un **cas d'usage
>    important**, jamais une hypothèse du noyau, et **aucune catégorie métier
>    n'est codée en dur**.
> 2. **La représentation principale finale est un graphe topographique
>    hiérarchique à nœuds/cartes reliés** — `DEC-0020` —, non un pavage de
>    rectangles imbriqués. « Blocs », plus haut, se lit désormais « **nœuds
>    identifiables reliés** ».
> 3. **Le produit doit être très utile SANS LLM** — `DEC-0021`. Les relations
>    automatiques viennent de **règles nommées, versionnées et explicables**,
>    jamais d'un score seul. Une **suggestion n'est jamais une relation
>    établie**.
> 4. **L'IA reste facultative et `BYOK`** — `DEC-0022` — et **ne produit que
>    des suggestions**. **Un ou plusieurs utilisateurs** partagent un seul
>    modèle conceptuel, et **la source reste autoritaire sur les
>    permissions** — `DEC-0023`.

> **Précision du 2026-09-06 — réalignement d'architecture à grande échelle,
> [`DEC-0029`](docs/decisions/DEC-0029-progressive-materialization-and-scale-boundary.md).**
> Rien de cette vision n'est retiré. **Le but fondamental ne change pas** :
> application de bureau **locale**, **légère**, **généraliste**, pensée
> notamment pour de **très grands cerveaux numériques** et des
> **environnements documentaires d'entreprise**, utilisable sur un **laptop ou
> PC ordinaire sans GPU puissant**, **sans LLM**, **sans API infonuagique**,
> **sans compte** et **sans envoi de documents**.
>
> Un seul point est **précisé**, et il porte sur *où le coût est payé* :
>
> > **FileTopo indexe grand, matérialise petit, et ne rend que le contexte
> > utile.**
>
> Le **corpus complet** vit dans l'index local durable; le **graphe logique**
> vit dans les données, jamais dans le SVG ou le DOM; le frontend ne reçoit
> qu'une **vue matérialisée bornée**. **`1 élément indexé` signifie `1 entité
> accessible`, et non `1 carte simultanément rendue`.** Le coût de rendu suit
> le **contexte courant**, jamais la taille du cerveau.
>
> Ce que cela **n'autorise pas** : cacher sans le dire. Un sous-arbre replié
> ou agrégé est **déclaré comme tel, avec son compte exact**, et **tout
> élément indexé reste atteignable**. Un agrégat n'est **jamais** un faux
> dossier.
>
> **Graphify n'est pas intégré** — aucune dépendance, aucun runtime, aucun
> adaptateur. **Forge reste un projet entièrement distinct.** **Aucun
> renderer final n'est choisi**, et le fonctionnement de base **ne peut
> dépendre ni d'un GPU puissant ni de WebGL**.
>
> Détail dans
> [`PROGRESSIVE_SCALE_ARCHITECTURE.md`](docs/architecture/PROGRESSIVE_SCALE_ARCHITECTURE.md).
> **Non testé :** aucune performance n'est mesurée à 10 000, 100 000 ni
> 1 000 000 d'éléments; ce sont des **cibles de validation futures**.

## Carte générique et relations

La hiérarchie vient exclusivement de l'arborescence observée. Les relations
transversales ne sont jamais inventées silencieusement : elles résultent d'une
règle déterministe documentée, d'une relation approuvée par l'utilisateur, ou
d'une suggestion facultative clairement identifiée et validée.

## MVP de reconstruction

Le MVP doit d'abord offrir un index de métadonnées fiable et reconstructible,
une persistance versionnée, une carte hiérarchique en blocs, la navigation et
les détails essentiels, puis une surveillance incrémentale robuste. Il demeure
en lecture seule sur les documents analysés. Extraction de contenu, OCR, IA,
RAG et GraphRAG sont hors du MVP structurel.

## Évolution facultative

L'extraction de formats approuvés et la recherche plein texte peuvent suivre
l'index fiable. Un futur chatbot RAG doit rester facultatif, citer précisément
les fichiers, accepter des fournisseurs configurables et des modèles locaux,
et exiger un consentement avant tout transfert distant. GraphRAG ne sera étudié
qu'après un RAG hybride cité et seulement si un besoin mesuré le justifie.

## Confidentialité et robustesse

Les index et caches vivent dans l'espace applicatif, jamais dans la racine
analysée. Les fichiers en ligne ne sont pas téléchargés automatiquement. Les
erreurs d'accès, lecteurs absents et fichiers verrouillés sont signalés sans
corrompre l'état. Aucune opération de renommage, déplacement, suppression ou
réécriture n'est permise sur les documents utilisateur.

## État actuel distinct

La version 0.1 alpha est conservée comme prototype historique. Elle prouve des
éléments techniques utiles, mais sa carte de points artificielle, sa persistance
partielle et l'absence de surveillance complète ne satisfont pas cette vision.
Voir [le bilan alpha](docs/archive/v0.1-alpha/BASELINE_ASSESSMENT.md) et
[la matrice fonctionnelle](docs/product/FEATURE_MATRIX.md).

## Critères de succès

- Une personne crée un cerveau en choisissant simplement une racine.
- La carte reflète automatiquement la hiérarchie réelle sans configuration codée.
- Plusieurs cerveaux reprennent leur état exact après redémarrage.
- Recherche, filtres, sélection, détails et ouverture Windows sont cohérents.
- Les changements sont détectés et appliqués incrémentalement avec historique.
- Une indisponibilité temporaire ne détruit ni l'index ni les préférences.
- Les documents sources restent inchangés, démontré par tests synthétiques.
- Le produit reste utile hors ligne et sans IA.
- **Un très grand cerveau reste navigable sur une machine ordinaire** : tout
  élément indexé est atteignable, ce qui est caché est déclaré avec un compte
  exact, et la charge de rendu **ne croît pas proportionnellement au corpus**
  — `DEC-0029`. **Non mesuré à ce jour.**
