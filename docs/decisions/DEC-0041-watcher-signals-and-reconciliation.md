# DEC-0041 — Watcher signals are hints; reconciliation remains authoritative

- **Date :** 2026-09-24
- **Statut :** `APPROVED`
- **Portée :** `F-030`, consommation automatique de la fondation `F-032`
- **Prérequis :** `F-031/U-B` VERIFIED, `TASK-0041` VERIFIED, `TASK-0042` VERIFIED dans sa portée
- **Encadrement :** `DEC-0010` (W-B + repli W-C), `DEC-0040`
- **Hors portée :** USN journal, contenu fichier, nouvelles heuristiques d'identité

## Principe

Un événement de surveillance **n'est jamais la vérité du changement**.

Le pipeline est :

`lecteur OS -> signaux bornés -> réconciliation W-B/W-C -> UpdateBatch -> U-B`

Les actions Windows (créé/supprimé/renommé/etc.) servent uniquement de
**hints de portée**. Le journal FileTopo est produit après réénumération et
comparaison canonique, jamais directement depuis l'événement OS.

## 1. Backend Windows

Réutiliser `windows-sys = 0.61.2`, déjà audité et déjà configuré avec
`Win32_Storage_FileSystem` et `Win32_System_IO`.

Ne pas ajouter `notify` sauf preuve explicite qu'un binding requis manque.

Sur Windows, le chemin natif utilise `ReadDirectoryChangesExW` (ou l'appel
Win32 strictement équivalent démontré pendant l'audit) avec :

- handle de dossier lecture/notification seulement;
- partage READ/WRITE/DELETE;
- surveillance récursive;
- buffer fixe **<= 64 KiB**;
- aucun accès au contenu;
- fermeture/cancellation propre au shutdown/restart du watcher.

Les noms reçus restent internes au cœur et ne sont jamais exposés/loggés.

## 2. Deux étages concurrents

### Lecteur OS

Un lecteur par cerveau surveillé :

- lit continuellement le flux OS;
- convertit les données en signaux internes bornés;
- ne touche jamais SQLite;
- ne produit jamais un événement du journal;
- détecte explicitement overflow/perte/erreur.

La file entre lecteur et réconciliateur est **bornée**. Si elle est saturée,
FileTopo marque la séquence comme **perdue** au lieu de bloquer ou accumuler
sans limite.

### Réconciliateur

Un worker de réconciliation consomme les signaux, coalesce une courte rafale,
puis choisit W-B ou W-C.

Le chemin d'écriture SQLite reste sérialisé avec les publications manuelles;
aucun lot concurrent partiel.

## 3. W-B — portée ciblée

Pour une rafale dont les chemins relatifs sont fiables :

1. normaliser/refuser tout nom hors racine;
2. choisir pour chaque hint le **plus petit dossier parent sûr** encore
   observable;
3. réduire les portées qui se recouvrent (un ancêtre couvre son descendant);
4. réénumérer uniquement ces sous-arbres;
5. dériver un lot différentiel avec les mêmes règles d'identité que le scan
   complet;
6. fusionner en un lot atomique si les portées sont disjointes et cohérentes;
7. appliquer par U-B.

Un changement d'un fichier profond ne doit pas forcer l'énumération d'un gros
frère non concerné.

Si la portée ne peut pas être établie honnêtement, on ne devine pas : W-C.

## 4. W-C — vérification complète différée

Déclencheurs au minimum :

- buffer OS perdu / `lpBytesReturned == 0`;
- `ERROR_NOTIFY_ENUM_DIR`;
- saturation de la file interne;
- signal invalide/non confinable;
- démarrage/reprise du watcher après période non observée;
- arrêt brutal/restart de l'application;
- doute de cohérence après une réconciliation ciblée.

W-C signifie désormais, dans l'architecture actuelle :

`scan complet en arrière-plan -> reconcile_full_scan -> U-B`

L'ancien Index continue d'être servi pendant le scan; le commit U-B est
atomique. Il n'est plus nécessaire de maintenir un deuxième SQLite complet,
car U-B et le journal atomique n'existaient pas lors de la rédaction initiale
de DEC-0010.

Pendant W-C, l'UI dit **À vérifier / Vérification en cours**, jamais « à jour ».

## 5. Événements pendant une réconciliation

Le lecteur OS continue de collecter pendant W-B/W-C.

Chaque cycle a une génération. Si de nouveaux signaux arrivent pendant la
réconciliation :

- ils restent en file pour le cycle suivant;
- le statut ne repasse à `WATCHING` qu'après convergence d'une fenêtre calme.

Aucune boucle infinie : après un nombre borné de cycles sans quiescence, rester
`VERIFYING` et replanifier, sans bloquer l'UI.

## 6. Racine entière / F-032

La disparition ou substitution de la racine ne doit jamais devenir un lot de
suppressions.

Le watcher a un **root guard** périodique léger (métadonnée/identité de racine,
pas un scan complet). Valeur produit : **5 secondes**, testable via un clock
injectable.

Si la racine :

- disparaît/devient inaccessible → machine DEC-0040 `UNAVAILABLE`;
- devient fichier/reparse/autre identité → `SOURCE_CHANGED`.

L'Index courant reste servi.

Quand la même racine revient, effectuer W-C avant de déclarer `WATCHING`.

## 7. Systèmes non pris en charge par le watcher natif

La surveillance native ne doit jamais être supposée disponible.

Si l'ouverture/lecture native est refusée comme mécanisme non supporté, le
cerveau passe en **PERIODIC** et effectue une W-C automatique toutes les
**30 secondes** (intervalle produit, injectable en test).

L'UI doit distinguer :

- surveillance native active;
- vérification périodique;
- vérification en cours;
- source indisponible/remplacée.

Aucune fausse mention « surveillance active » sur un mécanisme absent.

## 8. WatchStatus

État process-local, non reconstructible et non persistant :

- `STOPPED`
- `STARTING`
- `VERIFYING`
- `WATCHING`
- `PERIODIC`
- `DEGRADED`

DTO fermé, par brainId, sans chemin ni nom d'événement.

Il expose au minimum :

- state;
- mode `NATIVE | PERIODIC | NONE`;
- indexRevision;
- pending/coalescing bool ou count borné;
- reason fermé si dégradé.

La **SourceObservation** reste la vérité persistante sur la dernière observation
de la source; WatchStatus ne la remplace pas.

## 9. Démarrage automatique

Le watcher est backend-owned.

Au lancement de l'application :

- détecter les cerveaux REAL_ROOT déjà indexés;
- démarrer leur watcher sans intervention manuelle;
- **W-C initial obligatoire** avant de déclarer WATCHING/PERIODIC, car aucun
  événement produit pendant l'arrêt de l'application n'a pu être observé.

Après première indexation réussie d'un nouveau cerveau, démarrer son watcher.

Un `map_open` reste source-free en lui-même.

## 10. Notification frontend

Le backend émet un événement Tauri **sans données sensibles** quand :

- WatchStatus change;
- une réconciliation commit une nouvelle révision;
- SourceObservation change.

Payload minimal : brainId, status fermé, revision éventuelle.

Le frontend recharge alors uniquement les lectures locales nécessaires
(`map_open/map_view/journal/filter/status`) pour le cerveau actif.

Pas de polling du frontend.

## 11. Critère de vérité F-030

Le watcher est accepté uniquement si :

1. changements normaux convergent vers le même Index qu'un scan complet;
2. **10 000 événements synthétiques** convergent;
3. perte explicite/overflow converge via W-C;
4. changement pendant réconciliation converge sans trou;
5. arrêt de l'application, mutations hors ligne, redémarrage → W-C initial et
   parité scan complet;
6. racine absente → aucun DELETED, dernier Index conservé;
7. récupération → W-C puis retour à WATCHING/PERIODIC;
8. aucune source n'est écrite;
9. aucune donnée de path/identité n'atteint l'UI/log exportable.

## 12. Ce qui reste hors portée

- USN;
- contenu/empreinte de fichiers ordinaires;
- support spécifique à un fournisseur cloud;
- monitoring hors processus quand FileTopo est fermé;
- SLA de latence universel;
- plusieurs processus FileTopo sur le même cerveau.

## 13. Précisions d'implémentation (`TASK-0043`, 2026-09-24)

Non normatif : ces lignes disent **comment** `TASK-0043` a réalisé la décision, et les écarts de
lecture que le contrôle indépendant doit trancher. Aucun point d'arrêt de Sébastien n'est touché.

1. **Une portée est un dossier et ses entrées directes, pas son sous-arbre.** Lire une portée,
   c'est observer le dossier lui-même, lister ses entrées, et **entrer seulement** dans un enfant
   dossier **nouveau ou qui n'est pas là où l'Index l'a** (création, déplacement, renommage :
   il faut alors tout son sous-arbre, sinon le noyau refuse). Un enfant déjà en place n'est pas
   ouvert : un gros frère non concerné n'est jamais énuméré. Cela lit **moins** que « réénumérer
   le sous-arbre » du §3 et repose sur la même hypothèse : chaque entrée qui change a son propre
   hint, donc sa propre portée; quand les hints ne suffisent plus à le garantir, la réponse est
   W-C, pas un sous-arbre plus large. « Un ancêtre couvre son descendant » se réalise à
   l'application : deux hints dont le dossier n'est pas (encore) sûr montent au même ancêtre et
   ne font qu'une portée.
2. **Un hint porte un bit fermé** en plus du nom relatif : « l'appartenance de l'entrée à son
   dossier a pu changer » (ajout, retrait, les deux moitiés d'un renommage) ou « seule l'entrée
   elle-même a bougé » (modification). Il ne dit pas *créé*, *déplacé* ou *supprimé* et ne peut
   donc pas devenir une nature du journal — l'action de l'OS est jetée au parseur. Il sert à ne
   pas transformer en W-C chaque *modification* d'un dossier de premier niveau que le système
   signale à chaque changement dedans : cette entrée est **observée seule** (aucune lecture de
   la racine); un ajout / retrait / renommage d'une entrée de premier niveau, lui, a bien la
   racine pour portée et reste un W-C (§3 : « si le scope sûr devient la racine, traiter comme
   W-C »).
3. **Une portée qui n'est pas sûre monte à l'ancêtre sûr** : le dossier existe dans l'Index **et**
   sur le disque, est un vrai dossier (ni lien ni point d'analyse) et est **le même objet**
   (même clé stable). Un dossier supprimé, remplacé ou jamais indexé monte d'un cran; arrivée à la
   racine = W-C.
4. **Toute dérivation refusée est une escalade, jamais une erreur montrée** : portée qui monte à
   la racine, dossier illisible, plus de 20 000 entrées, lot refusé par le noyau, racine illisible
   → W-C. Un Index sans identités durables ou sans liaison de source n'est jamais écrit par le
   watcher (`NEEDS_MANUAL_REFRESH`) : seul l'Actualiser explicite le restampe.
5. **Le watcher partage `PUBLICATION_LOCK`** avec Actualiser et Reconstruire (une seule
   coordination d'écriture). W-C **est** le pipeline de l'Actualiser (`publish_map`, geste
   `Refresh`), donc il enregistre l'observation de la source comme lui; un W-B qui commit et
   trouve l'observation `SYNCED` la ré-enregistre à la nouvelle révision (sinon elle se lirait
   `UNKNOWN`), mais **ne promeut jamais** un état d'échec.
6. **Racine** : le garde compare la **clé système** de la racine (identité `SYSTEM` seulement)
   à celle de l'Index; une identité qui ne se compare pas (repli d'un côté) n'est pas une
   preuve de changement. Racine revenue = W-C avant `WATCHING`; racine refusée par un W-C
   (`SOURCE_CHANGED`) = pas de nouveau W-C tant que la racine reste refusée (attente croissante),
   jusqu'à un **Reconstruire** explicite.
7. **Aucune limite universelle** : la file (4 096 hints distincts), le nombre de portées (128), le
   nombre d'entrées d'un W-B (20 000), la fenêtre de coalescence (300 ms), la fenêtre calme
   (300 ms), le garde (5 s) et le repli périodique (30 s) sont des valeurs produit, injectables,
   mesurées sur une machine — pas des SLA.
