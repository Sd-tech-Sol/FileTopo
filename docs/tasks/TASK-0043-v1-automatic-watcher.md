# TASK-0043 — V1 Automatic Watcher & Reconciliation

- **Date :** 2026-09-24
- **Statut :** `VERIFIED` par `ACTION-0072`
- **Branche :** `build/v0.2-a27-v1-watcher-reconciliation`
- **Décision :** `DEC-0041`
- **Portée :** `F-030`, consommation automatique W-B/W-C + U-B + F-032
- **Prérequis :** `TASK-0040/0041/0042` VERIFIED dans leurs portées

## But

Livrer la surveillance automatique V1 sans jamais faire confiance aux événements
OS comme vérité.

Pipeline obligatoire :

`ReadDirectoryChangesExW -> hints bornés -> W-B/W-C -> apply_update_batch`.

## A — Audit avant code

Lire en entier :

- `ACTION-0070`;
- `DEC-0041`, `DEC-0010`, `DEC-0040`, `DEC-0038`, `DEC-0039`;
- F-030/F-032 dans REQUIREMENTS_BASELINE et FEATURE_MATRIX;
- `scanner.rs`, `reconcile.rs`, `incremental.rs`;
- `map/commands.rs`, `source_observation.rs`;
- Tauri setup/runtime dans `lib.rs`;
- dépendances `Cargo.toml` / `package.json`.

Audit reuse-first obligatoire :

- réutiliser `windows-sys 0.61.2` si ses bindings suffisent;
- réutiliser le PUBLICATION_LOCK ou extraire une coordination équivalente au
  lieu d'un second mécanisme d'écriture;
- ne pas réutiliser les anciens `IndexJobs/collection` du prototype comme
  architecture V1.

## B — WatchManager backend

Créer un manager process-local par application, avec un worker par cerveau
REAL_ROOT surveillé.

Responsabilités :

- démarrer/arrêter/reprendre idempotemment;
- état par cerveau;
- thread/handle natif;
- queue bornée;
- coalescence;
- root guard;
- réconciliation;
- notification Tauri.

Aucune stable key/path dans un DTO frontend.

Le shutdown doit fermer/canceller les handles sans laisser de thread bloqué.

## C — Lecteur natif Windows

Implémenter l'adaptateur `ReadDirectoryChangesExW` directement via
`windows-sys` si possible.

Exigences :

- recursive subtree;
- buffer <= 64 KiB;
- lecture notification/metadata seulement;
- aucune lecture de contenu;
- parser défensif des records;
- path relatif validé/confiné;
- overflow/loss explicitement détecté;
- queue bornée;
- queue full => LOST, jamais drop silencieux;
- aucun log de nom/path.

Tester le parseur sans Windows avec buffers synthétiques si possible, et le vrai
appel sous `#[cfg(windows)]`.

## D — Coalescence

Fenêtre courte bornée (ordre de grandeur 100–500 ms; choisir et documenter).

La rafale devient soit :

- ensemble réduit de scopes W-B; soit
- `LOST/VERIFY_FULL`.

Limite explicite sur le nombre de scopes/hints retenus. Dépassement => W-C.

Les actions OS ne déterminent jamais CREATED/MOVED/etc.

## E — Scanner/réconciliateur de sous-arbre W-B

Ajouter la primitive minimale nécessaire pour réénumérer un dossier interne
sans parcourir les branches non concernées.

Exigences :

- même classification que le scanner complet;
- même identité DEC-0009;
- même frontière Cloud Files;
- relative_path/depth réancrés correctement au cerveau;
- reparse non suivi;
- aucun contenu lu;
- diagnostics structurés;
- sortie transformée en UpdateBatch par comparaison au **sous-arbre canonique
  seulement**.

Pour un hint sur un objet disparu, remonter au plus proche parent existant.

Réduire les scopes ancêtre/descendant.

Si le scope sûr devient la racine, traiter comme W-C.

## F — W-C complet

Réutiliser le pipeline de scan complet + `reconcile_full_scan` + U-B.

Pendant le scan :

- ancien Index servi;
- WatchStatus = VERIFYING;
- lecteur OS continue de collecter.

Après commit, s'il reste des signaux arrivés pendant le scan, traiter un nouveau
cycle avant WATCHING.

## G — Initial reconcile / reprise

Au démarrage d'un watcher :

- ne jamais déclarer WATCHING immédiatement;
- W-C obligatoire;
- seulement après convergence → WATCHING/PERIODIC.

Test obligatoire : app arrêtée, source mutée, app relancée; l'Index rejoint le
scan complet de référence avant status stable.

## H — Root guard / F-032

Toutes les 5 s en produit (clock injectable) :

- vérifier seulement racine + identité;
- disparition/inaccessibilité → SourceObservation UNAVAILABLE;
- root changée → SOURCE_CHANGED;
- aucun lot de suppression;
- status DEGRADED/VERIFYING;
- retry léger;
- même racine revenue → W-C puis status stable.

Ne pas changer la machine DEC-0040; la consommer.

## I — Fallback périodique

Si le watcher natif est indisponible/non supporté :

- mode PERIODIC;
- W-C toutes les 30 s;
- intervalle injectable dans les tests;
- badge explicite, jamais WATCHING.

Une erreur source utilise toujours DEC-0040.

## J — Coordination avec Actualiser/Reconstruire

Manual refresh/rebuild et watcher ne doivent jamais écrire en concurrence.

Réutiliser une coordination unique.

Après un Actualiser/Reconstruire réussi :

- watcher recale sa génération;
- ne rejournalise pas les mêmes changements;
- si des hints ont été reçus pendant le geste manuel, ils sont réconciliés
  ensuite.

No-op manuel n'invente rien.

## K — Commands/events

Surface autorisée :

- `map_watch_status(brainId)` read-only;
- éventuellement `map_watch_ensure(brainId)` interne/commande si nécessaire
  au wiring, mais l'UI ne doit pas demander à l'utilisateur de démarrer;
- événement backend vers frontend avec **brainId + état fermé + revision**, sans
  path.

Aucune commande ne prend un chemin.

## L — UI

Ajouter un indicateur accessible et textuel :

- Surveillance active;
- Vérification en cours;
- Vérification périodique;
- Surveillance dégradée/Source indisponible.

SourceObservationBadge reste séparé.

Pour le cerveau actif, une notification de nouvelle révision recharge :

- map_view;
- journal/change counters si nécessaire;
- filters NEW/UNSEEN;
- node state sélectionné.

Ne pas accumuler les vues.

Pour cerveau inactif, enregistrer seulement revision/status; charger sa vue à
l'activation.

## M — Tests Rust obligatoires

Au minimum :

1. parser normal de plusieurs records;
2. record malformé => LOST/W-C, jamais panic;
3. bytes=0 => LOST;
4. ERROR_NOTIFY_ENUM_DIR => LOST;
5. queue pleine => LOST;
6. hints coalescés/dédupliqués;
7. scope profond n'énumère pas gros sibling;
8. create/modify/delete fichier via W-B = parité scan complet;
9. rename/move SYSTEM = ids/journal corrects;
10. PATH_FALLBACK = delete+create;
11. dossier rename/move descendants cohérents;
12. plusieurs scopes disjoints fusionnés atomiquement;
13. hint supprimé remonte au parent;
14. scope impossible => W-C;
15. W-C = parité scan complet;
16. événement pendant W-B => second cycle;
17. événement pendant W-C => second cycle;
18. overflow pendant W-C => nouveau W-C;
19. 10 000 événements => convergence;
20. source absente => UNAVAILABLE, zéro DELETED;
21. source remplacée => SOURCE_CHANGED;
22. même source revenue => W-C puis SYNCED;
23. native unsupported => PERIODIC;
24. periodic change => convergence;
25. startup initial W-C;
26. mutations pendant app fermée => convergence au restart;
27. manual refresh concurrent sérialisé;
28. deux cerveaux isolés;
29. shutdown/cancel handle propre;
30. aucun DTO/log sensible.

## N — Tests frontend

Prouver :

- status initial STARTING/VERIFYING;
- WATCHING et PERIODIC distincts;
- event active-brain nouvelle revision recharge vue/journal/filtres;
- event inactive-brain ne remplace pas la carte active;
- UNAVAILABLE garde carte + badge F-032;
- aucun polling;
- aucun path dans payload;
- stale event d'une ancienne generation/brain ignoré.

## O — Tests de rejet F-030

### O1 — 10 000 événements

Sur arbre synthétique Windows réel :

- produire 10 000 changements rapidement hors processus;
- attendre convergence;
- Index FileTopo = scan complet de référence;
- journal cohérent;
- aucune source modifiée par FileTopo.

Que le chemin soit W-B ou overflow→W-C, le résultat final doit être exact.

### O2 — perte simulée

Injecter explicitement `LOST` dans le moteur de réconciliation produit :

- WatchStatus VERIFYING;
- W-C;
- Index final = scan complet;
- retour WATCHING/PERIODIC.

### O3 — interruption

- lancer app + watcher;
- arrêter;
- muter source pendant arrêt;
- relancer;
- initial W-C récupère tous les écarts avant statut stable.

## P — WebView2 réel

Scénario minimal :

1. baseline cerveau REAL_ROOT;
2. watcher auto démarre, VERIFYING puis WATCHING;
3. mutations externes sans cliquer Actualiser;
4. carte/journal/NEW-UNSEEN se mettent à jour;
5. rafale;
6. racine déplacée => UNAVAILABLE, carte conservée, zéro DELETED;
7. racine remise => VERIFYING puis SYNCED/WATCHING;
8. arrêt réel, mutation hors ligne, redémarrage;
9. réconciliation automatique;
10. second cerveau isolé;
11. 0 fuite;
12. 0 erreur console fatale.

## Q — Validation

- tests ciblés;
- `cargo test --offline`;
- `pnpm test`;
- `pnpm check`;
- `pnpm build`;
- `cargo build --offline`;
- build Tauri debug + WebView2;
- Clippy dette historique séparée;
- `git diff --check`;
- `scripts/audit-public-readiness.ps1 -AllowRemotes`.

Ne pas modifier le seuil F-031. Si le noyau U-B est modifié fonctionnellement,
rejouer la preuve F-031 canonique.

## Gouvernance

- `TASK-0043 = IMPLEMENTED`, jamais auto-`VERIFIED`;
- aucune TASK-0044;
- aucun USN;
- aucun PR/merge/tag/release;
- docs durables + FEATURE_MATRIX honnêtes;
- `NEXT_ACTION = contrôle indépendant de TASK-0043`;
- push uniquement sur la branche de tâche, arbre propre.

## Livraison (`IMPLEMENTED`, 2026-09-24)

Exécutée par le prompt `.orchestrator/NEXT_PROMPT.md` sur la branche de tâche. Le détail chiffré est
dans [`VALIDATION` section BY](../ai/VALIDATION.md), le rapport compact dans
`.orchestrator/RESULT.md`, les précisions de lecture de la décision dans
[`DEC-0041` §13](../decisions/DEC-0041-watcher-signals-and-reconciliation.md).

- **Audit reuse-first** (§A) : `windows-sys 0.61.2` expose déjà, avec les features **existantes**
  (`Win32_Foundation`, `Win32_Storage_FileSystem`, `Win32_System_IO`), `ReadDirectoryChangesExW`,
  `READ_DIRECTORY_NOTIFY_INFORMATION_CLASS`, `OVERLAPPED`, `GetOverlappedResultEx`, `CancelIoEx` et
  `ERROR_NOTIFY_ENUM_DIR` : **aucune crate, aucune feature ajoutée**, pas de `notify`. Les anciens
  `IndexJobs` / collections du prototype ne sont pas réactivés.
- **Modules** : `src-tauri/src/watch/` (types fermés, file bornée, parseur défensif, coalescence,
  lecteur natif, worker de réconciliation, `WatchManager`), `src-tauri/src/scope.rs` (W-B),
  `src-tauri/src/map/watch_ops.rs` (W-C, W-B et garde de racine sous le **même** `PUBLICATION_LOCK`
  qu'Actualiser / Reconstruire), `scanner::observe_entry` (la classification unique du scan complet
  et de W-B), hook Tauri (`map_watch_status`, événement `map-watch-status`, arrêt propre).
- **Interface** : `WatchStatusBadge`, `watchStatus.ts`, rechargement sur place à une nouvelle
  révision, aucun polling.
- **Non fait, voulu** : aucune TASK-0044, aucun USN, aucune PR / fusion / étiquette / release,
  `graph/` non touché, seuil `F-031` non touché (`incremental.rs` **non modifié**).

## Correctif `ACTION-0071` P1 (`IMPLEMENTED`, 2026-09-25)

Recontrôle : [`ACTION-0071`](../reviews/ACTION-0071-task0043-shutdown-recontrol.md) — F-030 accepté
fonctionnellement, blocage unique : `shutdown` pouvait détacher un worker qui attendait
`PUBLICATION_LOCK`. Correctif `001f18f`, détail dans [`VALIDATION` section BZ](../ai/VALIDATION.md).

- Le watcher prend le **même** `PUBLICATION_LOCK` de façon **annulable** (W-C, W-B, enregistrement de la
  garde de racine); le geste manuel garde son acquisition bloquante.
- `WatchManager::shutdown` joint tous les workers; `patience` n'autorise plus aucun détachement.
- Preuves : shutdown avec le verrou tenu par un autre thread (W-C, W-B, garde), rien de tardif après
  libération; test natif de fermeture du handle rejoué.
- La tâche **reste `IMPLEMENTED`**; contrôle indépendant du correctif attendu.


## Clôture indépendante — ACTION-0072

`TASK-0043` est **VERIFIED dans sa portée**. Le watcher natif, W-B/W-C, le fallback périodique, le root guard F-032, la convergence après pertes/restart et la fermeture propre du runtime ont été contrôlés indépendamment. `ACTION-0071` est fermée : aucun worker vivant n'est détaché au shutdown.
