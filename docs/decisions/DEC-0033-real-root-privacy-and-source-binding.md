# DEC-0033 — Real Root Privacy and Source Binding Contract

- Date : 2026-09-10
- Statut : `APPROVED` — GO technique du NEXT_PROMPT ouvrant `TASK-0032`.
- **Corrigée le 2026-09-10**, sections **D**, **H** et **I**, sur constat du
  contrôle indépendant de `TASK-0032`. Deux affirmations étaient fausses : la
  permission `dialog:allow-open` **ouvrait** la frontière au lieu de la fermer,
  et la republication promise d'un index antérieur était en réalité
  impossible. Les corrections sont marquées **« Corrigé »** là où elles
  portent; le reste de la décision est inchangé.
- Exécution : [TASK-0032](../tasks/TASK-0032-v1-real-root.md).
- Décision antérieure conservée : [DEC-0032](DEC-0032-persistent-brain-lifecycle-contract.md),
  `APPROVED`, dont le cycle ouvrir / actualiser / reconstruire reste inchangé.

Cette décision introduit la **première vraie source locale** de FileTopo. Elle
n'autorise aucune donnée personnelle : la portée de `TASK-0032` est le
mécanisme, prouvé sur des arborescences de test générées localement.

## A. Sélection explicite seulement

Un cerveau `REAL_ROOT` n'existe qu'après un geste utilisateur explicite sur
**Ajouter un dossier**. Ouvrir le sélecteur ne crée rien; enregistrer le
cerveau ne scanne rien. Annuler le sélecteur ne crée ni cerveau, ni index, ni
état partiel — la commande rend `null` et le catalogue est inchangé.

Le frontend **ne fournit jamais un chemin** à une commande produit. Il n'existe
aucune commande exposée au WebView qui accepte un chemin en argument. Le chemin
est obtenu côté Rust, par le sélecteur natif de `tauri-plugin-dialog`, et ne
traverse jamais l'IPC dans l'autre sens.

## B. Chemin privé et local

Le chemin absolu canonique est stocké **uniquement** dans la base de catalogue
locale FileTopo, colonne `source_path`, en BLOB.

Il n'est sérialisé ni dans `BrainRecord`, ni dans `BrainCatalogView`, ni dans
`MapOpenReport`, ni dans `MapBuildReport`, ni dans aucun autre DTO rendu au
WebView, ni dans les journaux, les messages d'erreur, les artefacts de preuve,
la documentation ou Git. `BrainRecord` ne porte **aucun champ de type chemin** :
la source résolue est une valeur interne distincte, obtenue par une lecture
explicite du catalogue.

Le frontend reçoit l'identité FileTopo (`brainId`), le nom, la couleur et
l'icône choisis localement, le type de source (`sourceKind`), une référence de
source **opaque** (`sourceRef`) et un **label** affichable. Pour un `REAL_ROOT`
le label est le **nom terminal** du dossier choisi, jamais son chemin : un nom
de dossier est ce que l'utilisateur vient de choisir et voit déjà à l'écran; un
chemin absolu révèle en plus le nom de compte et l'arborescence personnelle.

Une preuve automatisée exige qu'un chemin sentinelle absolu complet n'apparaisse
dans aucun DTO JSON rendu au WebView ni dans aucun artefact `TASK-0032`.

## C. Encodage Windows exact

Le chemin canonique est persisté par un codec sans perte, partagé, extrait du
codec historique de `registry.rs` : UTF-16LE sous Windows, octets bruts d'`OsStr`
ailleurs. `to_string_lossy()` est interdit pour **persister ou résoudre** une
source. Un nom **affiché** peut rester lossy.

Un BLOB illisible est une erreur explicite, jamais un chemin réparé ou deviné.

## D. Source binding

`brain_id` reste l'identité du cerveau; il n'est jamais un chemin et n'est
jamais dérivé du chemin. Deux cerveaux peuvent légitimement pointer vers le même
dossier : la colonne de chemin ne porte **aucune contrainte `UNIQUE`**.

Chaque cerveau porte un `source_ref` **opaque** — un UUID v4 pour un `REAL_ROOT`,
l'identifiant de fixture pour une source synthétique. L'index canonique
enregistre `brain_id`, `source_kind` et ce `source_ref`, jamais le chemin.

Ouvrir un index dont le binding ne correspond pas à celui que le catalogue
attend est un **refus explicite**, `map_source_mismatch`, jamais une
substitution silencieuse.

**Corrigé le 2026-09-10 — le binding, c'est la paire.** La vérification porte
sur `source_kind` **et** `source_ref`, jamais sur le seul identifiant : deux
choses différentes peuvent porter le même nom, et seule la paire dit laquelle
un index contient. Un `source_ref` identique sous un `source_kind` différent
est refusé.

**Corrigé le 2026-09-10 — la republication d'un index antérieur.** La première
livraison refusait un index sans binding sur **tous** les chemins, y compris
actualiser et reconstruire : la republication promise ci-dessous était donc
impossible, et un tel fichier restait bloqué pour toujours. Ouvrir et
republier ne posent pas la même question au même fichier :

- **Ouvrir** exige un binding courant. Un index sans binding est refusé, et
  **rien n'est supprimé**.
- **Actualiser ou reconstruire** est le geste par lequel un fichier *acquiert*
  un binding. Une voie de compatibilité **étroite** l'autorise, sous toutes ces
  conditions à la fois :
  - le cerveau lit une `SYNTHETIC_FIXTURE`. **Un `REAL_ROOT` n'y a jamais
    droit** : aucune racine réelle n'existait avant cette décision, donc un
    index sans binding sous un `REAL_ROOT` n'est pas ancien, il est faux;
  - le fichier porte le bon `brain_id`, sur un schéma canonique compatible;
  - il ne porte **ni** `source_kind` **ni** `source_ref`. Un fichier qui n'en
    porte qu'un seul n'a été écrit par aucune version de ce programme et n'est
    accepté nulle part;
  - son `fixture_id` est exactement la fixture que le catalogue nomme encore.
    C'est le seul fait de l'ancienne métadonnée qui rattache le fichier à une
    source; sans lui il n'y a rien à reconnaître.

  La republication rescanne la source et remplace le corpus dans la même
  transaction : `index_id` est conservé, `revision` n'avance qu'à la
  publication réussie, et le binding moderne est écrit à ce moment-là. Un échec
  laisse l'ancien index intact et toujours refusé par l'ouverture.

Aucune de ces voies ne supprime jamais un fichier pour « réparer ».

## E. Séparation index / source conservée — DEC-0032 inchangé

- Cerveau `REAL_ROOT` non indexé : `map_open` répond `map_not_built`. Aucun scan
  automatique, jamais.
- Première indexation : action explicite **Indexer / Actualiser**, `map_refresh`.
- Ouverture suivante : index persistant seulement, source non lue,
  `sourceRead = false`, conformément à `DEC-0032` A.
- `map_rebuild` reste une intention distincte et fail-safe : aucun index n'est
  supprimé avant d'avoir un remplaçant valide.

## F. Lecture seule absolue

FileTopo ne crée, ne modifie, ne renomme ni ne supprime rien sous un `REAL_ROOT`.
Tout état FileTopo — catalogue, index, relations, signaux de contenu, artefacts
— vit dans l'espace applicatif, hors de la racine analysée.

Le scanner en lecture seule de `scan_tree_controlled` est réutilisé tel quel;
aucun second scanner n'est écrit.

Une racine qui est un lien symbolique ou un point d'analyse est **refusée**. Les
points d'analyse **internes** restent traités par le scanner existant, qui ne
sort pas de la racine.

**L'empreinte de source n'est pas une preuve de production pour un `REAL_ROOT`.**
Le double parcours d'empreinte de `TASK-0016` reste réservé aux fixtures
synthétiques : sur une vraie arborescence il doublerait le coût de chaque
indexation pour un contrôle que le design et les tests établissent déjà. Le
rapport le **dit** au lieu de le prétendre : `fingerprintBefore` et
`fingerprintAfter` valent `null` et `readOnlyConfirmed` vaut `false` pour un
`REAL_ROOT` — « aucune empreinte prise », jamais « lecture seule confirmée par
empreinte ». La garantie de lecture seule reste portée par le scanner et par les
tests `RR6`.

## G. Containment — la règle exacte

Soit `S` la racine de l'espace d'état FileTopo (le bac à sable résolu, qui
contient `brains/`, donc le catalogue et tous les index) et `R` la racine
candidate, toutes deux canonicalisées.

Une racine est **refusée** si :

1. `R == S`;
2. `R` est un ancêtre de `S` — sinon un scan de `R` parcourrait l'index FileTopo
   lui-même;
3. `S` est un ancêtre de `R` — sinon l'état FileTopo vivrait au-dessus de la
   racine analysée, et une racine choisie plus haut par la suite retomberait
   dans le cas 2.

La comparaison porte sur des composants de chemin entiers, après
canonicalisation, jamais sur des préfixes de chaîne : `C:\a\bc` n'est pas
contenu dans `C:\a\b`.

## H. Aucun réseau, aucune nouvelle pile

Aucun nouveau domaine CSP, aucune requête réseau, aucune télémétrie, aucun
cloud, aucun MCP, aucun Graphify, aucune IA. Aucune nouvelle dépendance :
`tauri-plugin-dialog`, déjà déclaré dans `Cargo.toml` depuis le prototype 0.1,
est **initialisé** dans le runtime; c'est la seule modification de pile.

**Corrigé le 2026-09-10.** La première rédaction disait que la capacité
`default` porterait « `core:default` plus la seule permission
`dialog:allow-open`, nécessaire au sélecteur ». C'était faux, et dans le sens
qui compte : `dialog:allow-open` n'accorde pas « le sélecteur qu'utilise notre
commande », elle accorde la **commande frontend du plugin**,
`plugin:dialog|open`, qui accepte un `defaultPath` **venu de la page** et lui
**retourne les chemins choisis**. Les deux moitiés sont exactement ce que les
sections A et B interdisent. La permission n'était pas nécessaire : elle était
la brèche.

La règle correcte est donc :

- **plugin initialisé côté Rust**, ce qui rend `app.dialog()` disponible à
  `lib.rs`;
- **aucune commande frontend du plugin autorisée**. La capacité `default` porte
  `core:default` et **rien d'autre** — ni `dialog:allow-open`, ni
  `dialog:default`, ni `dialog:allow-save`, ni `fs:*`, ni `shell:*`.

Une capacité ne contrôle que les **commandes atteignables depuis le WebView**;
elle ne gouverne jamais `app.dialog()` appelé depuis l'hôte. Le sélecteur natif
continue donc de fonctionner par notre seule commande sans argument, et la page
ne peut plus l'appeler directement.

## I. Réserve X2 — levée, et remplacée

`X2` interdisait au runtime d'initialiser le plugin de dialogue, parce qu'aucune
tâche n'avait alors le droit d'ouvrir un dossier réel. `TASK-0032` est cette
tâche, et `X2` est **levée par la présente décision**.

Elle est remplacée par une garantie plus étroite, testée, **en trois parties**
— la troisième ajoutée le 2026-09-10, la garantie initiale ayant été jugée
incomplète par le contrôle indépendant :

1. **aucune commande exposée n'accepte un chemin en argument**, vérifié sur le
   texte des signatures que `generate_handler!` enregistre;
2. `choose_collection` — le sélecteur du prototype 0.1, qui écrivait dans
   l'ancien `Registry` — reste **non enregistré**;
3. **la commande frontend du plugin de dialogue est hors de portée de la
   page**, faute de permission dans la capacité. Prouvé au repos sur le JSON de
   la capacité, et **à l'exécution** dans WebView2 : un `invoke` direct de
   `plugin:dialog|open`, avec et sans `defaultPath`, est refusé par la couche
   de permissions avant que le plugin ne le voie, et aucun dialogue ne s'ouvre.

L'ancien `Registry` n'est pas ressuscité comme vérité produit; seul son codec de
chemin est réutilisé.

## J. Frontière inchangée

`catalogue -> source interne résolue -> scanner -> Index canonique -> map_view
bornée (512 entités) -> layout de vue -> MapApp`.

Aucun `all_nodes` frontend, aucun layout global, aucun second catalogue, aucun
second index canonique, aucun retour à l'ancien `Registry`/`MapStore` comme
corpus produit, aucun nouveau renderer.
