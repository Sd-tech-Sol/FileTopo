# NEXT_PROMPT — TASK-0043 — V1 Automatic Watcher & Reconciliation

**TARGET_AGENT:** CLAUDE CODE  
**RECOMMENDED_MODEL:** Opus, high effort  
**STATUS:** READY  
**BRANCH:** `build/v0.2-a27-v1-watcher-reconciliation`

## /goal

Implémenter intégralement
`docs/tasks/TASK-0043-v1-automatic-watcher.md` selon
`docs/decisions/DEC-0041-watcher-signals-and-reconciliation.md`.

Principe non négociable :

`événement OS = hint, jamais vérité`

Le journal et l'Index viennent uniquement de :

`réénumération W-B/W-C -> reconcile -> apply_update_batch`.

Cette tranche est la première vraie surveillance automatique V1.

## 0 — Préconditions obligatoires

1. Appliquer `AGENTS.md` et `CLAUDE.md`.
2. Basculer explicitement sur
   `build/v0.2-a27-v1-watcher-reconciliation`.
3. `git fetch origin`.
4. Synchroniser uniquement en fast-forward avec
   `origin/build/v0.2-a27-v1-watcher-reconciliation`.
5. Vérifier arbre propre.
6. Vérifier que HEAD contient :
   - `ACTION-0070` — TASK-0042 VERIFIED;
   - `DEC-0041`;
   - `TASK-0043`.
7. Lire en entier `DEC-0041` puis `TASK-0043` avant toute modification.
8. Lire `DEC-0010` et ses preuves Microsoft avant de choisir l'API native.

STOP/BLOCKED si une précondition contredit le dépôt.

## 1 — Audit reuse-first avant code

Auditer et écrire dans RESULT :

- bindings exacts disponibles dans `windows-sys = 0.61.2`;
- possibilité d'utiliser `ReadDirectoryChangesExW` avec les features déjà
  présentes;
- cancellation/fermeture d'un read bloquant;
- PUBLICATION_LOCK et frontières d'écriture;
- scanner complet, reconcile_full_scan, apply_update_batch;
- machine SourceObservation;
- Tauri setup / managed state / events;
- anciens IndexJobs du prototype.

Règle :

- réutiliser `windows-sys` si suffisant;
- **ne pas ajouter `notify` par confort**;
- ne pas réactiver IndexJobs/collection comme architecture V1.

Si une API Win32 nécessaire n'est réellement pas exposée avec les features
actuelles, documenter le manque exact avant d'ajouter la feature minimale.
Aucune nouvelle crate sans preuve.

## 2 — Séparer lecture OS et réconciliation

Le lecteur OS :

- ne touche jamais SQLite;
- ne journalise jamais;
- n'interprète jamais ADDED/REMOVED/RENAMED comme un ChangeEvent FileTopo;
- pousse seulement des hints bornés / LOST.

Le worker de réconciliation :

- coalesce;
- choisit W-B ou W-C;
- passe par U-B;
- est le seul à faire évoluer l'Index.

Cette séparation doit être visible dans les types et les tests.

## 3 — Queue bornée et perte explicite

Aucune structure de hints non bornée.

Prouver :

- overflow OS;
- bytes returned = 0;
- ERROR_NOTIFY_ENUM_DIR;
- parser invalide;
- queue interne saturée;

=> **LOST**, puis W-C.

Il est interdit de dropper silencieusement un événement quand une borne est
atteinte.

## 4 — W-B ciblé réel

Le point critique de cette tâche est de ne pas remplacer « watcher » par « full
scan après chaque événement ».

Pour un changement profond dans une petite branche :

- le gros sibling non concerné ne doit pas être énuméré;
- seuls les scopes sûrs réduits sont parcourus;
- l'Index final doit être identique à un scan complet de référence.

Les actions OS restent des hints. Une disparition remonte au parent existant.

Si l'honnêteté du scope ne peut pas être démontrée : W-C.

## 5 — W-C et convergence

W-C réutilise :

`scan complet -> reconcile_full_scan -> U-B`.

L'ancien Index reste servi pendant le scan.

Le lecteur continue de recevoir les événements pendant W-B/W-C. S'il arrive
quelque chose pendant la réconciliation, un nouveau cycle doit suivre avant de
déclarer WATCHING/PERIODIC.

Aucune « mise à jour terminée » sur un cycle qui sait déjà qu'il a reçu de
nouveaux signaux.

## 6 — Root guard / F-032

Ne fais jamais dépendre la détection de disparition de la racine uniquement du
handle ouvert sur la racine : un dossier peut être renommé/déplacé tout en
laissant le handle valide.

Implémenter le root guard de DEC-0041 :

- 5 s produit;
- injectable en test;
- métadonnée/identité seulement;
- pas de scan complet.

Disparition => UNAVAILABLE.  
Racine remplacée => SOURCE_CHANGED.  
Aucun DELETED.

Même racine revenue => W-C avant retour stable.

## 7 — Startup/restart

Un watcher qui vient de démarrer n'a aucun droit d'afficher WATCHING avant une
W-C initiale.

C'est cette W-C qui rattrape :

- changements survenus pendant que FileTopo était fermé;
- événements perdus avant l'ouverture du handle;
- état précédemment UNAVAILABLE revenu.

## 8 — Native unsupported / fallback périodique

Si le mécanisme natif est indisponible :

- ne pas mentir;
- mode PERIODIC;
- W-C automatique 30 s;
- cadence injectable en test;
- UI distincte de WATCHING.

Ne pas utiliser le fallback périodique sur un watcher natif sain.

## 9 — Coordination manuelle

`Actualiser`, `Reconstruire` et watcher doivent partager une coordination
d'écriture.

Pas deux writers logiques en compétition.

Les hints reçus pendant une opération manuelle restent à réconcilier ensuite;
ne pas les vider arbitrairement.

## 10 — Événement frontend sans fuite

Le backend peut émettre seulement une enveloppe fermée du genre :

- brainId;
- WatchStatus;
- revision.

Jamais :

- relative path;
- absolute path;
- event file name;
- stable key;
- FileId;
- volume;
- erreur OS brute.

Le frontend n'emploie pas de polling.

## 11 — Tests de rejet obligatoires

Ne considère pas TASK-0043 terminée sans :

### Rafale 10 000
Mutation externe rapide d'un arbre synthétique réel Windows; convergence exacte
vers scan complet.

### Perte forcée
Injecter LOST dans le vrai moteur de réconciliation; W-C puis parité scan
complet.

### Interruption
Arrêter réellement FileTopo, muter la source, relancer; W-C initiale récupère
les changements avant statut stable.

### Source entière absente
Racine déplacée hors chemin; aucun DELETED, Index intact, UNAVAILABLE; remise
de la même racine => W-C + SYNCED.

## 12 — WebView2

Le rejeu doit démontrer **sans cliquer Actualiser** :

- watcher démarre automatiquement;
- mutations externes apparaissent;
- journal/new-unseen se mettent à jour;
- source absente garde la carte;
- récupération automatique;
- arrêt réel + mutation offline + restart;
- deuxième cerveau isolé.

Ne pas fabriquer les résultats via commandes de test qui appliquent
directement un lot.

Les helpers de preuve peuvent créer/muter les arbres synthétiques **hors du
processus** et lire l'état pour assertions.

## 13 — Performance / bornes

Ne réouvre pas F-031 sauf modification fonctionnelle d'`incremental.rs`.

Mesurer néanmoins et rapporter pour la preuve watcher :

- taille max observée de queue;
- nombre de W-B;
- nombre de W-C;
- nombre de signaux coalescés;
- temps de convergence de la rafale 10k sur la machine d'essai.

Ce sont des mesures d'ingénierie, pas des SLA universels.

## 14 — Gouvernance

À la fin :

- TASK-0043 = `IMPLEMENTED`, jamais `VERIFIED`;
- aucune TASK-0044;
- aucun USN;
- aucun PR/merge/tag/release;
- docs durables + FEATURE_MATRIX honnêtes;
- `.orchestrator/RESULT.md` complet;
- `NEXT_ACTION = contrôle indépendant de TASK-0043`;
- push uniquement sur la branche;
- arbre propre.
