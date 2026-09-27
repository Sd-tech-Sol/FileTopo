# DEC-0047 — Frontière de reconstructibilité et génération d'Index V1

- **Date :** 2026-09-26
- **Statut :** `APPROVED`
- **Portée :** `F-006`
- **Prérequis :** `ACTION-0082`, `ACTION-0083`
- **Branche :** `build/v0.2-a33-v1-reconstructibility-closure`

## Contexte

FileTopo sait déjà reconstruire transactionnellement un Index existant. F-006
demande plus : démontrer qu'après perte complète du fichier d'Index, le produit
peut recréer le **même corpus logique et la même hiérarchie** depuis la source
et la configuration brain-scoped conservée, tout en déclarant honnêtement ce
qui n'est pas reconstructible.

Les tranches journal/seen/resume ont rendu l'ancien inventaire
`NON_RECONSTRUCTIBLE_KEYS = ["built_unix_ms"]` incomplet.

## A — une génération existe déjà : index_id

Aucun nouvel identifiant de génération n'est créé.

L'`index_id` durable existant est la génération canonique de l'Index :

- un rebuild normal du même Index conserve `index_id`;
- une perte complète suivie d'une création fraîche produit un nouvel
  `index_id`;
- le produit ne tente jamais de réutiliser artificiellement l'ancien.

Toute donnée externe contenant un `node_id` doit savoir à quelle génération
cet ID appartenait, ou être traitée comme non liée/suspecte.

## B — resume lié à la génération

Le resume persiste hors Index, mais `focus_node_id` et
`selected_node_id` sont des références **Index-scoped**.

Le record persistant de resume doit donc mémoriser la génération
`index_id` sur laquelle ces références ont été enregistrées.

Règles :

1. même génération : comportement actuel conservé;
2. génération différente : ne jamais tester seulement l'existence numérique
   de l'ancien id; les refs node-scoped sont corrigées/effacées avant usage;
3. vue/caméra, filtre et visibilité du panneau Détails peuvent être conservés
   s'ils restent valides indépendamment de l'ID;
4. un ancien record de resume sans génération ne peut pas prouver son lien :
   préférer une correction sûre des refs node-scoped, puis réécrire le record
   sous le contrat courant;
5. aucune tentative de deviner l'identité d'un nœud par nom/taille/date.

Le backend reste autoritaire. Le frontend ne devient pas gardien de génération.

## C — sauvegarde du resume

L'exécuteur doit auditer l'API actuelle avant code.

Préférence : la génération est attachée au record persistant côté backend au
moment où le resume est sauvegardé, à partir de l'Index courant. Ne pas ajouter
un champ frontend contrôlable si le backend peut connaître la génération
lui-même.

Si aucun Index courant n'existe, une sauvegarde contenant des refs node-scoped
ne peut pas être déclarée liée.

## D — reconstructibilité logique

Le critère F-006 compare ce qui est réellement reconstructible :

- corpus courant;
- hiérarchie parent/enfant;
- kind;
- nom et chemin relatif;
- métadonnées source pertinentes;
- stable identity/provenance quand recalculable;
- diagnostics reconstructibles;
- policy d'exclusion effective conservée hors Index.

Les **numéros `node_id` ne font pas partie de l'équivalence inter-génération**.

Le digest/comparateur utilisé par F-006 doit être indépendant de l'allocation
numérique des rows. L'ancien `reconstructible_digest()` inclut `parent_id`;
l'exécuteur doit auditer ses consommateurs avant de changer sa sémantique.
Réutiliser ou ajouter le plus petit comparateur/digest qui ne confond pas
hiérarchie logique et numéro interne.

## E — état non reconstructible

L'inventaire produit doit être dérivé du runtime courant, pas de TASK-0031.

Au minimum, auditer et classer explicitement :

- `built_unix_ms`;
- `index_id`;
- `index_revision`;
- journal `change_events`;
- état d'acquittement seen/unseen;
- `next_node_id`;
- allocation numérique des `node_id`;
- tout usage résiduel de `nodes.seen`.

Ne pas affirmer qu'un élément est perdu si une autre base autoritaire le
préserve.

## F — état hors Index

La suppression de preuve ne touche jamais :

- catalogue;
- exclusion policy;
- resume record;
- relations et décisions humaines;
- content-signals;
- source.

Ces stores doivent être hashés/inspectés avant et après la reconstruction pour
prouver leur isolation quand applicable.

## G — journal après reconstruction fraîche

L'historique perdu avec l'Index n'est **jamais inventé**.

Un premier build d'une nouvelle génération établit une nouvelle baseline :

- aucun faux CREATED/DELETED/etc. pour recréer le passé;
- aucun faux NEW/UNSEEN historique;
- le nouveau journal démarre selon le contrat de baseline courant.

Le fait que l'ancien journal soit perdu doit figurer dans
`nonReconstructible`.

## H — suppression uniquement dans le harnais

FileTopo V1 n'ajoute aucun bouton ni commande « supprimer l'Index ».

La preuve F-006 :

1. ferme réellement le processus;
2. supprime hors produit uniquement le fichier d'Index du cerveau ciblé et ses
   sidecars éventuels;
3. laisse tous les autres stores intacts;
4. relance le vrai produit;
5. constate `NotBuilt`;
6. déclenche le pipeline existant de reconstruction.

## I — scénario avec historique obligatoire

La preuve doit créer un historique qui fait réellement diverger l'allocation
numérique :

- au moins quatre nœuds ordonnés;
- supprimer un nœud antérieur;
- appliquer la mutation afin que les IDs survivants restent stables dans
  l'ancienne génération;
- enregistrer un resume sur un nœud dont l'ancien numéro sera réutilisé ou
  déplacé dans une reconstruction fraîche.

Une preuve où les IDs tombent par hasard aux mêmes numéros ne suffit pas.

## J — invariants

Inchangés :

- un seul Index canonique;
- VIEW_BUDGET = 512;
- aucun whole-graph DTO;
- source read-only;
- aucune donnée personnelle;
- policy F-005 inchangée;
- watcher = hints;
- journal append-only dans une génération;
- FR/EN et accessibilité inchangés;
- pas de nouveau store.

## K — clôture

Si la tranche passe :

- TASK-0049 = IMPLEMENTED, jamais auto-VERIFIED;
- F-006 = IMPLEMENTED, candidate à contrôle indépendant;
- F-014 et P-19 restent séparés;
- aucune TASK-0050 avant contrôle indépendant.
