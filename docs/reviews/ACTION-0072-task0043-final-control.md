# ACTION-0072 — Clôture indépendante de TASK-0043

- Date : `2026-09-25`
- Statut : `CLOSED / VERIFIED`
- Tâche : `TASK-0043 — V1 Automatic Watcher & Reconciliation`
- Branche contrôlée : `build/v0.2-a27-v1-watcher-reconciliation`
- Livraison finale contrôlée : `ac7ed345b8288e5b83bed31520434d5761df99c2`
- Recontrôle précédent : `ACTION-0071`
- Verdict : **TASK-0043 = VERIFIED dans sa portée**

## A — F-030 : accepté

Le contrôle indépendant accepte la surveillance automatique :

- backend Windows natif `ReadDirectoryChangesExW` via `windows-sys 0.61.2`;
- handle notification seulement, buffer fixe 64 KiB, récursif;
- événements OS réduits à des hints bornés, jamais à des natures de journal;
- file bornée avec perte explicite;
- W-B ciblé;
- W-C sur overflow/perte/restart/doute;
- U-B seul pour appliquer;
- initial W-C avant état stable;
- signaux reçus pendant W-B/W-C repris avant retour stable;
- root guard F-032;
- fallback PERIODIC honnête quand le backend natif n'est pas disponible;
- coordination unique avec Actualiser/Reconstruire;
- payload frontend fermé et sans donnée de source;
- reload frontend borné et isolation par cerveau.

## B — ACTION-0071 : fermée

Le blocage de shutdown est fermé.

### Acquisition du lock

Le watcher utilise toujours **le même** `PUBLICATION_LOCK`.

`lock_publication_cancellable` :

- consulte le callback d'arrêt avant chaque tentative;
- utilise `try_lock`, jamais un `Mutex::lock` non annulable côté watcher;
- attend par pas de 10 ms;
- reprend proprement un mutex empoisonné;
- retourne une issue `PublicationCancelled`.

Les gestes manuels gardent leur acquisition bloquante.

### W-C

`verify_full` :

- acquiert d'abord le lock annulable;
- puis appelle le même pipeline
  `publish_map_with_lock -> publish_locked`;
- ne duplique ni application mode, ni journal, ni SourceObservation.

### W-B

`apply_scopes` :

- acquiert le lock annulable avant toute lecture source et toute ouverture SQLite;
- un stop pendant l'attente devient `ScopedFailure::Cancelled`;
- aucune portée ni aucun batch n'est appliqué après cette annulation.

### Root guard

L'écriture de l'observation du root guard utilise la même acquisition annulable.
Aucun record tardif après arrêt.

## C — Shutdown : accepté

`WatchManager::shutdown` :

1. retire les entries du manager;
2. demande le stop de tous les workers;
3. **join chaque JoinHandle possédé**;
4. retourne seulement après leur terminaison.

Il n'existe plus de branche qui jette un `JoinHandle` vivant.

Le paramètre `patience` est maintenant purement diagnostique
(`beyond_patience`) et n'autorise aucun détachement.

Une phase de commit atomique déjà commencée n'est pas interrompue : le shutdown
l'attend. Ce compromis est correct; il privilégie l'intégrité et garantit qu'une
fois `shutdown` retourné, aucun worker watcher ne reste actif.

## D — Preuves déterministes ACTION-0071

Trois scénarios retiennent réellement `PUBLICATION_LOCK` pendant le shutdown :

1. W-C forcé par LOST;
2. W-B forcé par hint ciblé;
3. root guard voulant enregistrer une source partie.

Dans les trois cas :

- worker prouvé engagé dans la tentative;
- `shutdown(1 ms)` retourne alors que le lock externe est encore détenu;
- `joined = 1`;
- dernier status = `STOPPED` avant retour;
- reader live = 0;
- Index inchangé;
- lock externe libéré seulement **après** le retour;
- attente supplémentaire d'une seconde;
- aucun event/status tardif;
- aucune nouvelle révision;
- aucun write tardif;
- aucun batch partiel.

La falsification de l'ancien comportement est documentée : rétablir
temporairement verrou bloquant + détachement fait échouer ces tests.

Le test natif existant confirme aussi que Windows autorise de nouveau une
ouverture exclusive de la racine après shutdown.

## E — Régressions et validations

Rapportées et cohérentes avec le diff :

- Rust : **727 PASS**, 0 fail, 6 ignored;
- TypeScript : **471 PASS**;
- 72 tests watcher, y compris initial W-C, changements natifs, signaux pendant
  W-B/W-C, perte forcée, root absent/revenu, Actualiser concurrent, shutdown
  pendant W-C;
- les deux tests réels 10 000 opérations passent encore;
- build/check Rust et TypeScript verts;
- Clippy : dette historique inchangée;
- `git diff --check` propre;
- audit public-readiness vert;
- aucun changement frontend dans la passe ACTION-0071.

Le rejeu WebView2 n'était pas requis pour ACTION-0071 : aucune sémantique
visible ni transport frontend n'a changé. La preuve WebView2 de TASK-0043 reste
la preuve hôte canonique de la tranche fonctionnelle.

## F — Limites maintenues

Ce VERIFIED ne prétend toujours pas couvrir :

- partages réseau;
- FAT;
- dossiers cloud synchronisés;
- USN;
- plusieurs processus FileTopo sur le même cerveau;
- crash brutal pendant commit;
- SLA universel de temps de convergence.

Ces limites ne bloquent pas la V1 locale Windows.

## Verdict

**TASK-0043 = VERIFIED dans sa portée.**

F-030 est maintenant une capacité V1 réellement automatique :
les événements système sont des hints, la réconciliation reste autoritaire,
les pertes convergent, la source absente ne détruit rien et le runtime se ferme
sans laisser de worker détaché.
