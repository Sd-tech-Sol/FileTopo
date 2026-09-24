# ACTION-0069 — Recontrôle indépendant de TASK-0042

- Date : `2026-09-24`
- Statut : `OPEN / RECONTROL REQUIRED`
- Tâche : `TASK-0042 — V1 Source Availability & Stale Index Foundation`
- Branche contrôlée : `build/v0.2-a26-v1-source-availability`
- Livraison contrôlée : `656a54612e9f5084e5f24a0d349d24c8d03bb0b7`
- Verdict : **fondation F-032 fonctionnellement solide; TASK-0042 reste IMPLEMENTED**
- Blocage unique : **P1 — honnêteté quand l'écriture de l'observation d'échec échoue**

## A — Acquis acceptés

Le contrôle indépendant accepte :

- le stockage dans `catalog_meta`, sans nouvelle base;
- le modèle fermé `UNKNOWN / SYNCED / UNAVAILABLE / SOURCE_CHANGED /
  SCAN_INCOMPLETE / APPLY_FAILED`;
- les raisons fermées sans path, FileId, stable_key, volume ou texte OS;
- la classification depuis les types/variants structurés, jamais par parsing
  d'un `Display`;
- `map_open` et `map_source_observation` sans résolution/stat de la source;
- le dernier Index fiable conservé intégralement sur indisponibilité;
- absence de `DELETED` inventés;
- isolation par cerveau et persistance;
- cycle WebView2 réel
  `SYNCED -> UNAVAILABLE -> restart -> restore -> SYNCED`;
- racine recréée au même chemin refusée comme `SOURCE_CHANGED`;
- `incremental.rs` inchangé;
- F-032 correctement laissée en **fondation**, non déclarée complète.

Le choix de deux commits (Index puis observation) est acceptable à condition
que ses incohérences soient détectées ou signalées honnêtement.

## P1 — écriture d'une observation d'échec qui échoue

Le code actuel :

`publish_map -> record_failure(...) -> Err(error)`

ignore la valeur retournée par `record_failure`.

Or `record_failure` construit bien l'observation courante avec
`persisted:false` si l'écriture `catalog_meta` échoue, mais cette valeur est
perdue.

Le frontend, dans son `catch`, appelle ensuite
`map_source_observation`, qui relit **le record persistant précédent**.

Cas déterministe problématique :

1. Index courant + observation `SYNCED`;
2. rendre la racine absente;
3. installer un trigger SQLite qui refuse l'UPDATE/INSERT
   `source_observation.*` dans le catalogue;
4. cliquer / appeler Actualiser;
5. la classification courante est réellement
   `UNAVAILABLE / ROOT_NOT_FOUND`;
6. l'écriture de cette observation échoue;
7. le record persistant reste le vieux `SYNCED`;
8. `map_source_observation` renvoie ce vieux `SYNCED`;
9. l'UI peut donc afficher « À jour à la dernière vérification » après un
   Actualiser qui vient précisément de constater que la source est absente.

Cela contredit `DEC-0040 §4` :

> un échec d'écriture de cette métadonnée doit être signalé honnêtement.

Le test existant
`a_record_that_cannot_be_written_never_turns_an_applied_index_into_a_failure`
ne couvre que le **chemin succès**. Il prouve correctement
`SYNCED persisted:false` dans le report, mais il n'exerce pas le chemin
`record_failure`.

## P1b — record d'échec devenu stale après une réussite non persistée

Le lecteur invalide actuellement seulement un record `SYNCED` dont
`lastSuccessfulRevision` ne correspond plus à la révision servie.

Un record d'échec peut lui aussi devenir stale :

1. état persistant `UNAVAILABLE`, dernier succès révision R;
2. la source revient;
3. une actualisation réussit et l'Index passe à R+1;
4. crash ou échec d'écriture avant que `SYNCED R+1` soit persisté;
5. au redémarrage, le record `UNAVAILABLE` de R est encore présent à côté de
   l'Index R+1;
6. le lecteur actuel continue de croire ce `UNAVAILABLE`.

Un record d'échec valide avec `lastSuccessfulRevision = Some(R)` est créé
pendant que l'Index sert précisément R. S'il est ensuite lu à côté d'une autre
révision, il est donc stale et ne doit pas être présenté comme l'observation
courante.

Ce cas est la même frontière à deux commits et doit être fermé dans la même
correction.

## Correction exigée

Conserver l'architecture générale. Ne pas déplacer l'observation dans l'Index,
ne pas ajouter de DB et ne pas rendre un échec catalogue fatal au corpus.

Il faut garantir :

### 1. Honnêteté dans le processus courant

Après un refresh/rebuild refusé pour une raison source structurée, si le record
ne peut pas être persisté, l'UI doit pouvoir obtenir **l'observation réellement
constatée avec `persisted:false`**, pas l'ancien record.

Formes acceptables :

- petit fallback **en mémoire, par cerveau**, lu prioritairement par
  `map_source_observation`; ou
- erreur Tauri structurée transportant l'observation courante; ou
- autre mécanisme aussi étroit qui conserve le contrat.

Un simple changement de texte d'erreur n'est pas suffisant.

Si un fallback mémoire est choisi :

- aucun path/identité;
- borné à un record par cerveau;
- remplacé/effacé après une écriture persistante réussie;
- perdu au redémarrage par design;
- aucune nouvelle source de vérité pour l'Index.

### 2. Détection d'un record persistant devenu stale

À la lecture avec une `served_revision` connue :

- `SYNCED` reste valide seulement si sa révision de succès correspond;
- un état d'échec avec
  `lastSuccessfulRevision = Some(R)` et `R != served_revision` doit être
  traité comme **stale** (au minimum `UNKNOWN`), puisqu'une nouvelle révision a
  été servie après cette observation;
- un état d'échec avec `lastSuccessfulRevision = None` doit rester possible
  pour un ancien Index qui n'avait encore aucune observation de succès.

Ne pas inventer `SYNCED`.

## Tests obligatoires

### T1 — échec source + échec d'écriture observation

- baseline SYNCED;
- racine absente;
- trigger catalogue refuse uniquement `source_observation.*`;
- vrai `refresh_map` échoue pour la source;
- Index/revision/journal/seen/preferences intacts;
- lecture immédiatement après retourne
  `UNAVAILABLE / ROOT_NOT_FOUND / persisted:false`;
- ancien `SYNCED` n'est pas présenté;
- supprimer le trigger;
- retry source toujours absente → observation persistée `UNAVAILABLE`.

### T2 — UI

Avec la même condition simulée au niveau TypeScript ou intégration :

- le catch d'Actualiser met le badge à `UNAVAILABLE`;
- `data-persisted="false"`;
- la carte reste chargée;
- aucune reconstruction.

### T3 — record failure stale vs révision

- persister `UNAVAILABLE` avec dernier succès R;
- faire servir R+1 sans mettre à jour le record (simulation de la fenêtre de
  crash);
- `map_open` / `map_source_observation` ne doivent pas présenter cet
  `UNAVAILABLE` comme courant;
- résultat `UNKNOWN` acceptable.

### T4 — non-régressions

- le test succès + write failure continue de renvoyer
  `SYNCED persisted:false`;
- cycle WebView2 TASK-0042 ordinaire inchangé;
- aucune modification `incremental.rs`;
- aucun watcher/polling/W-B/W-C.

## Verdict

**TASK-0042 reste IMPLEMENTED.**

Tous les invariants F-032 de corpus sont acceptés. Seule l'honnêteté de la
petite observation locale dans la fenêtre d'échec d'écriture reste à fermer.
