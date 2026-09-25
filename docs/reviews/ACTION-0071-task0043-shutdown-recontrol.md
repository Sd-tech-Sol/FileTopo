# ACTION-0071 — Recontrôle indépendant de TASK-0043

- Date : `2026-09-25`
- Statut : `OPEN / RECONTROL REQUIRED`
- Tâche : `TASK-0043 — V1 Automatic Watcher & Reconciliation`
- Branche contrôlée : `build/v0.2-a27-v1-watcher-reconciliation`
- Livraison contrôlée : `b848a8aae705e378af9065ee3701c54a35ca5438`
- Verdict : **F-030 fonctionnellement convaincant; TASK-0043 reste IMPLEMENTED**
- Blocage unique : **P1 — shutdown peut détacher un worker encore vivant**

## A — Éléments acceptés

Le contrôle indépendant accepte la structure principale :

- `ReadDirectoryChangesExW` via le `windows-sys 0.61.2` déjà présent;
- buffer natif fixe 64 KiB, récursif, handle notification seulement;
- parser défensif et confinement des noms;
- actions OS réduites à des hints de portée, jamais à des natures de journal;
- file bornée et perte explicite;
- W-B ciblé, W-C sur perte/doute/restart;
- U-B seul pour appliquer;
- initial W-C avant état stable;
- événements reçus pendant W-B/W-C traités dans un cycle suivant;
- root guard F-032;
- fallback PERIODIC quand le backend natif est indisponible;
- coordination de publication unique avec Actualiser/Reconstruire;
- payload frontend fermé;
- rafale réelle 10 000 opérations convergente;
- perte forcée convergente;
- mutations pendant arrêt récupérées au redémarrage;
- WebView2 réel sans clic Actualiser, avec source absente/revenue et deuxième cerveau.

Le choix d'une portée W-B « dossier + entrées directes, descente seulement dans
un enfant nouveau/déplacé » est accepté comme raffinement de DEC-0010 :
le lecteur récursif fournit un hint propre pour les changements internes et toute
perte connue force W-C. Les tests ciblés et aléatoires établissent la parité avec
un scan complet.

## P1 — le timeout de shutdown détache le worker

Le code actuel de `WatchManager::shutdown(patience)` :

1. demande l'arrêt de chaque worker;
2. attend jusqu'à `deadline`;
3. joint le thread seulement si `join.is_finished()`;
4. sinon laisse tomber le `JoinHandle`.

En Rust, laisser tomber un `JoinHandle` **détache le thread**. Cela n'annule pas
le worker.

Le commentaire du code l'assume explicitement :

> « a worker that is inside a long manual publication is abandoned after patience »

C'est contraire aux exigences de TASK-0043 :

- « Le shutdown doit fermer/canceller les handles sans laisser de thread bloqué. »
- validation M29 : shutdown/cancel handle propre.

Le test actuel
`shutdown_releases_the_reader_and_leaves_nothing_blocked` n'exerce pas la
branche timeout; le worker répond rapidement.

Le test
`a_shutdown_during_a_full_verification_cancels_it_and_leaves_the_index_untouched`
non plus : sa pause dure 400 ms et le shutdown lui donne 5 s.

### Pourquoi la branche timeout est atteignable

Les chemins watcher prennent `PUBLICATION_LOCK`.

Si un geste manuel détient déjà ce mutex pendant un scan long, le watcher peut
rester bloqué **avant** d'entrer dans la partie de scan qui consulte son flag
`cancelled`.

Un shutdown peut donc atteindre sa deadline, abandonner le JoinHandle, retourner,
et laisser :

- le worker détaché;
- son reader natif / handle de racine encore vivant jusqu'à ce que le worker
  retrouve le CPU et sorte;
- potentiellement un notifier encore actif après destruction de la fenêtre.

Le fait que le processus doive souvent quitter peu après ne constitue pas une
preuve de fermeture propre.

## Correction exigée

Ne changer ni W-B, ni W-C, ni le parser, ni l'UI.

### 1. Attente du lock annulable pour les chemins watcher

Un worker qui attend le `PUBLICATION_LOCK` doit pouvoir constater
`shared.stop` et abandonner **avant** d'acquérir le lock.

Formes acceptables :

- boucle `try_lock` avec attente courte/bornée et test du callback
  `cancelled`; ou
- primitive équivalente.

Le geste manuel peut conserver son acquisition bloquante.

Le watcher ne doit pas créer un second mutex.

Les deux chemins doivent être couverts :

- W-B / `apply_scopes`;
- W-C / `verify_full`.

Si cela exige d'exposer une variante interne de `publish_map` ou de
`publish_locked`, garder la surface `pub(super)` minimale.

### 2. Shutdown ne doit plus détacher

Après `request_stop()`, `WatchManager::shutdown` doit joindre tous les workers
qu'il possédait.

Il ne doit pas retourner en ayant volontairement abandonné un JoinHandle vivant.

La borne de fermeture vient du fait que :

- le reader natif vérifie son stop chaque tranche;
- l'attente du publication lock devient annulable;
- les scans watcher reçoivent déjà un callback d'annulation.

Un éventuel délai `patience` peut rester comme seuil diagnostique/interne, mais
pas comme autorisation de détacher un worker.

### 3. Aucun write tardif

Une fois le shutdown retourné :

- aucun nouvel événement watcher ne doit être émis;
- aucune mutation d'Index ne doit survenir plus tard;
- le handle natif doit être fermé.

## Tests obligatoires

### T1 — timeout réel sur publication lock

Créer une preuve déterministe :

1. watcher stable;
2. un autre thread détient `PUBLICATION_LOCK` et ne le libère pas;
3. provoquer un cycle W-C (LOST suffit) ou W-B;
4. attendre que le worker soit engagé dans cette tentative;
5. appeler `shutdown` avec une patience volontairement très courte;
6. **sans libérer le lock**, le shutdown doit revenir proprement grâce à
   l'annulation de l'attente watcher;
7. statut final STOPPED;
8. reader live = 0 / handle natif libéré;
9. libérer ensuite le lock;
10. attendre encore : aucun status/event tardif et aucune révision tardive.

Le test doit échouer avec l'implémentation actuelle.

### T2 — W-B et W-C

Prouver que l'acquisition annulable est commune ou tester séparément :

- watcher attendant le lock pour W-B;
- watcher attendant le lock pour W-C.

Aucun lot partiel.

### T3 — shutdown natif

Le test natif existant doit continuer de prouver que Windows accepte une
ouverture exclusive de la racine après shutdown.

### T4 — régressions

Rejouer :

- startup initial W-C;
- changements natifs;
- événement pendant W-B/W-C;
- perte forcée;
- source absente/revenue;
- Actualiser concurrent;
- 10k si le moteur de réconciliation est touché (il ne devrait pas l'être).

## Ce qui n'est PAS demandé

- pas de nouvelle task;
- pas de changement du modèle de hint;
- pas de nouvelle crate;
- pas d'USN;
- pas de modification frontend;
- pas de changement des cadences;
- pas de réouverture F-031;
- pas de nouveau WebView2 si seule la mécanique backend de shutdown change et
  que les tests natifs/intégration couvrent le correctif.

## Verdict

**TASK-0043 reste IMPLEMENTED.**

F-030 est accepté sur le plan fonctionnel, mais la fermeture propre du runtime
watcher doit être garantie avant `VERIFIED`.
