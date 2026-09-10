# DEC-0034 — Progressive Topographic View and Historical UX Convergence

- Date : 2026-09-10
- Statut : `APPROVED`
- Exécution : `TASK-0033`
- Prérequis : `TASK-0032 = VERIFIED` par `ACTION-0049`
- Référence UX : [`REFERENCE_UX_OLD_FILETOPO.md`](../product/REFERENCE_UX_OLD_FILETOPO.md)
- Encadrement : raffine `DEC-0031`; ne le remplace pas.

## A. Architecture inchangée

La chaîne reste :

`REAL_ROOT / fixture -> scanner -> Index canonique SQLite -> projection bornée -> layout de vue -> React/TypeScript SVG`

Aucun second catalogue, second index, `MapStore` produit, snapshot complet frontend, layout global, renderer parallèle, Canvas/WebGL/Pixi obligatoire, cloud, réseau, LLM ou MCP.

Le budget de sécurité de `DEC-0031` reste **512 entités maximum par cerveau, agrégats inclus**. Ce budget n'est plus interprété comme une cible visuelle.

## B. Une carte topographique n'est pas une liste du corpus

La vue normale vise **quelques dizaines de cartes lisibles**, avec une cible produit de **64 vrais blocs maximum** dans une projection topographique ordinaire. Cette cible est inférieure à la borne technique et peut être encore réduite par l'ancestry/focus nécessaire.

La racine et la chaîne d'ancêtres du focus restent prioritaires. Ensuite, la projection privilégie les **dossiers** qui structurent l'espace. Les fichiers restent dans l'Index canonique et demeurent accessibles aux détails, analyses et futures fonctions de recherche/aperçu; ils ne doivent pas saturer la carte d'ensemble.

Une projection spécialisée pourra matérialiser un fichier lorsqu'il est lui-même la cible d'une navigation/relation, mais le mode d'ensemble n'est pas un explorateur de milliers de fichiers.

## C. Navigation progressive, sans accumulation

Explorer une branche remplace la projection courante sous le même budget. Aucune expansion ne concatène indéfiniment les pages précédentes.

L'utilisateur doit pouvoir :

- partir de la racine et reconnaître les grandes branches;
- sélectionner un dossier;
- entrer dans une branche et voir de **vrais noms**;
- revenir au parent / contexte précédent;
- suivre une relation vers une cible, même si cela exige une nouvelle projection;
- conserver un contexte spatial compréhensible.

La navigation doit s'appuyer sur `brain_id + node_id`, jamais sur un chemin absolu fourni par le WebView.

## D. Les agrégats restent techniques, pas des faux dossiers

Le type d'agrégat exact de `DEC-0031` reste autorisé comme métadonnée de projection et comme mécanisme de continuation. Il **ne doit plus être rendu comme une grande carte sœur d'un vrai dossier**.

L'information d'omission devient un indicateur compact attaché au parent, par exemple `+17 dossiers` / `+23 éléments`, avec une action de navigation explicite. Les libellés internes tels que `view_budget_or_focus`, `outside_current_projection` ou « enfants directs hors vue » ne sont jamais présentés comme vocabulaire produit.

L'indicateur ne doit inventer aucun nom ou relation. Lorsque l'utilisateur demande la suite, la projection suivante doit montrer de vrais nœuds issus de l'Index.

## E. Caméra lisible avant caméra exhaustive

La carte ne doit plus appliquer automatiquement un `fit` global à chaque changement de projection.

- **Ajuster à l'écran** reste une action explicite.
- **Réinitialiser** revient à une vue lisible centrée sur la racine ou le focus.
- Une navigation de branche recentre sur la nouvelle cible sans réduire automatiquement toute la carte jusqu'à rendre les blocs illisibles.
- Le pan/zoom choisi par l'utilisateur est conservé lorsque cela reste spatialement cohérent.

Sur une fenêtre de type laptop (référence 1366×768), il est acceptable que la carte déborde et exige du pan. Il n'est pas acceptable de sacrifier la lisibilité pour faire entrer toute la projection à l'écran.

## F. Direction graphique

Sans copier les données privées du prototype, le rendu converge vers :

- fond clair quadrillé;
- cartes larges, arrondies, ombre légère;
- racine sombre et dominante;
- vrais noms de dossiers avec typographie de taille écran lisible;
- branches hiérarchiques nettes;
- relations transversales plus discrètes au repos et fortes autour de la sélection;
- sélection/survol évidents;
- panneau contextuel droit masquable;
- barre d'outils compacte en haut;
- police système / Segoe UI sur Windows.

La palette de référence est documentée dans `REFERENCE_UX_OLD_FILETOPO.md`.

## G. Ce que TASK-0033 doit livrer, et ce qui attend

`TASK-0033` livre le **cœur topographique** : projection dossier-first bornée, indicateurs compacts, layout/rendu lisible, caméra, sélection/navigation et conservation des relations existantes.

La parité historique complète reste une cible de produit, mais watcher, changements récents/vu-non-vu, ouverture Explorer, préférences d'icône/écran et FTS/recherche avancée sont des tranches séparées lorsqu'elles exigent de nouvelles frontières ou persistance.

## H. Confidentialité

Les captures privées, noms, chemins et contenus du prototype historique ne sont jamais copiés dans Git. Les preuves publiques utilisent uniquement fixtures/arborescences générées. Le vrai chemin d'un `REAL_ROOT` reste côté Rust conformément à `DEC-0033`.

## I. Critère de non-régression

Une amélioration visuelle est refusée si elle exige l'un des éléments suivants : corpus complet envoyé au frontend, layout global sur tout l'Index, hausse non bornée de la matérialisation, nouveau store concurrent, chemin absolu IPC, accès réseau, ou dépendance à un GPU puissant.
