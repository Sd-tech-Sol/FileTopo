# DEC-0040 — Last-known source observation and stale-index contract

- **Date :** 2026-09-24
- **Statut :** `APPROVED`
- **Portée :** fondation de `F-032` avant `F-030`
- **Prérequis :** `TASK-0041 = VERIFIED` par `ACTION-0068`
- **Hors portée :** watcher, W-B/W-C, détection automatique en arrière-plan

## Problème

FileTopo sait maintenant actualiser un Index existant sans remplacement global.
Il conserve déjà l'ancien Index lorsque le scan ou l'application échoue.

Ce qui manque avant la surveillance automatique est une sémantique produit
explicite pour répondre à une question simple :

> la source n'est pas lisible maintenant; que doit afficher FileTopo sans
> transformer cette absence en suppressions massives ?

Le champ historique `MapOpenReport.freshness = "UNKNOWN"` ne répond pas à
cette question. Une erreur ponctuelle dans une bannière UI ne survit pas non
plus à un redémarrage.

## Décision

### 1. État observé, pas vérité temps réel

FileTopo mémorise, **par cerveau**, la dernière observation explicite de la
source. Cet état ne prétend jamais être une surveillance temps réel.

Énumération fermée :

- `UNKNOWN` — aucune observation fiable enregistrée;
- `SYNCED` — la dernière opération source complète a réussi et l'Index servi
  correspondait à ce scan au moment indiqué;
- `UNAVAILABLE` — la racine n'a pas pu être lue/ouverte;
- `SOURCE_CHANGED` — la racine est observable mais n'est plus la même racine
  acceptable (fichier à la place, reparse root, identité de racine différente);
- `SCAN_INCOMPLETE` — la racine est lisible mais l'arbre complet n'a pas pu
  être établi de façon fiable;
- `APPLY_FAILED` — un scan complet valide existait, mais son application à
  l'Index a échoué/été refusée.

Un geste explicitement **annulé par l'utilisateur** n'est pas une observation
sur la source : il ne remplace pas l'état précédent.

### 2. État servi

Les états `UNAVAILABLE`, `SOURCE_CHANGED`, `SCAN_INCOMPLETE` et
`APPLY_FAILED` signifient tous :

> **le dernier Index fiable continue d'être servi**.

Ils ne modifient pas :

- le corpus canonique;
- l'index_id;
- la révision;
- le journal;
- seen/unseen;
- les préférences;
- les filtres persistés éventuels.

Ils peuvent seulement modifier la petite métadonnée d'observation source.

### 3. Données mémorisées

L'observation expose au minimum :

- état fermé;
- raison fermée, non sensible;
- `observedUnixMs`;
- dernière révision ayant réussi à synchroniser la source, si elle existe;
- instant du dernier succès, si connu.

Aucun chemin absolu, stable_key, FileId, volume serial, message OS brut ou
contenu de fichier.

### 4. Stockage

Cette observation est un **état non reconstructible du cerveau**, distinct du
corpus. Elle doit réutiliser un store local existant; **aucune nouvelle base de
données**.

Le choix précis (catalogue/meta existante ou métadonnée équivalente) appartient
à l'audit d'implémentation, sous ces invariants :

- un no-op ne crée aucun événement et n'avance aucune révision d'Index;
- la valeur persiste au redémarrage;
- un cerveau ne peut pas modifier l'état d'un autre;
- la perte de cette métadonnée ne peut jamais rendre l'Index invalide;
- un échec d'écriture de cette métadonnée ne doit pas transformer un Index déjà
  correctement appliqué en faux échec transactionnel du corpus; il doit être
  signalé honnêtement.

### 5. Classification minimale

- échec de métadonnée **de la racine** (absente, accès refusé, lecteur/réseau
  indisponible) → `UNAVAILABLE`;
- racine devenue non-dossier / reparse root → `SOURCE_CHANGED`;
- `reconcile_root_identity_changed` → `SOURCE_CHANGED`;
- diagnostics de scan partiel ou fingerprint synthétique instable →
  `SCAN_INCOMPLETE`;
- erreur/refus après scan valide lors de réconciliation/application →
  `APPLY_FAILED`;
- succès baseline, restamp, incremental ou rebuild → `SYNCED`.

Les codes de raison peuvent être plus précis, mais restent fermés et sans
texte/path OS.

### 6. Ouverture

`Ouvrir` **ne touche toujours jamais la source**.

Il lit seulement l'Index et la dernière observation persistée. L'interface doit
parler de **dernière observation**, jamais affirmer qu'un lecteur est
actuellement disponible si aucune vérification vient d'avoir lieu.

### 7. UX

Quand un refresh échoue pour une des raisons ci-dessus :

- la carte déjà chargée reste visible;
- un message/badge texte indique que le dernier Index fiable est conservé;
- la raison est intelligible sans couleur seule;
- aucune action automatique Reconstruire;
- l'utilisateur peut réessayer Actualiser plus tard.

Après récupération et Actualiser réussi, l'état redevient `SYNCED`.

### 8. Frontière avec le watcher

Cette décision **ne ferme pas F-032 à elle seule**.

Elle construit le contrat que le futur watcher F-030 devra utiliser :
un signal de source absente ne peut jamais être converti directement en lot de
suppressions. Le watcher devra d'abord passer par cette machine d'état puis
W-B/W-C.

La matrice doit donc rester honnête : F-032 = fondation implémentée après cette
tranche, détection automatique encore manquante jusqu'à F-030.
