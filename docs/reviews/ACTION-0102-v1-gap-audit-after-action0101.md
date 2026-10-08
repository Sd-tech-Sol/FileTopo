# ACTION-0102 — Audit V1 après ACTION-0101 / cadrage F-046

- **Date :** 2026-10-07
- **Statut :** `CLOSED — prochaine tranche choisie`
- **Base auditée :** `393ac6d190295d979b58c9a03cc4712391d93335`
- **Prérequis :** TASK-0054 / F-050 / F-051 / P-01 / P-02 / P-03 VERIFIED/CLOSED par ACTION-0101
- **Prochaine branche :** `build/v0.2-a39-v1-physical-identity-closure`

## 1. Résultat de l'audit

Le dernier gap fonctionnel MVP nommé dans la matrice est `F-046 — Identité de
contenu et doublons exacts`.

Le texte historique de la matrice est partiellement périmé : il affirme encore
que l'identité physique persistante est absente et bloquée par `DEC-0013/F`.

État Git réel :

- `TASK-0036 / ACTION-0060` a déjà productionisé l'identité Windows
  `VolumeSerialNumber + FileId` dans l'Index;
- `DEC-0035` ferme le risque Cloud Files de `DEC-0013/F` : placeholder ou
  état ambigu => pas d'identité SYSTEM;
- `nodes.stable_key` + `identity_provenance=SYSTEM|PATH_FALLBACK` sont
  persistés depuis le schéma 4;
- `TASK-0023 / ACTION-0039` a déjà VERIFIED l'observation SHA-256 exacte;
- `TASK-0026 / ACTION-0043` a déjà VERIFIED l'explorateur borné des contenus
  identiques;
- l'UI dit déjà explicitement qu'un hash identique ne prouve ni « même fichier
  physique » ni « copie ».

Donc F-046 ne justifie **ni nouveau store, ni nouveau moteur de hash, ni nouvel
algorithme de similarité**.

## 2. Gap réel découvert

L'Index impose actuellement :

`CREATE UNIQUE INDEX idx_nodes_stable_key ON nodes(stable_key)`

et `publish()` refuse deux clés stables identiques dans un même scan.

Or, sous la sémantique SYSTEM déjà retenue, deux chemins Windows qui sont des
**hard links vers le même objet physique** ont légitimement le même couple
`VolumeSerialNumber + FileId`.

Conséquence actuelle : une source contenant deux hard links peut être refusée
comme `IdentityCollision`, alors que F-046 doit précisément savoir dire
« même objet physique ».

Le modèle confond donc encore deux niveaux :

- **occurrence/nœud FileTopo** : un chemin dans l'arborescence, `nodes.id`
  unique;
- **objet physique Windows** : fait OS qui peut être partagé par plusieurs
  occurrences.

## 3. Sources officielles

Microsoft documente `FILE_ID_INFO` comme le couple numéro de série du volume
+ identifiant 128 bits du fichier; comparer ces valeurs permet de déterminer
si deux handles représentent le même fichier.

Aucun `FileId` brut ni numéro de volume ne doit être envoyé au WebView.

Références :
- https://learn.microsoft.com/en-us/windows/win32/api/winbase/ns-winbase-file_id_info
- https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-getfileinformationbyhandleex

`FILE_STANDARD_INFO.NumberOfLinks` existe également, mais **TASK-0055 ne doit
pas l'ajouter si la clé SYSTEM déjà observée suffit**. Reuse-first : ne pas
ouvrir un second chemin Win32 sans nécessité démontrée.

## 4. Décision d'architecture

Créer `DEC-0052`.

Principe :

> Le `nodeId` identifie une occurrence dans l'arborescence. Une clé
> `SYSTEM` identifie un objet physique et peut donc être partagée par plusieurs
> occurrences. Une clé `PATH_FALLBACK`, elle, reste une clé d'occurrence
> déterministe et ne peut pas être dupliquée dans un cerveau valide.

Ainsi :

- le schéma n'ajoute pas une deuxième identité physique;
- `stable_key` reste interne et n'est jamais exposée;
- l'unicité SQL de `stable_key` doit être retirée;
- les doublons de clé sont acceptés **uniquement** pour provenance `SYSTEM`;
- les doublons `PATH_FALLBACK` restent refusés;
- le remap d'identité devient group-aware.

## 5. Remap group-aware

Le cas simple reste inchangé :

- 1 ancienne occurrence + 1 nouvelle occurrence d'une clé SYSTEM => même
  `nodeId`, donc renommage/déplacement intra-volume toujours stable.

Quand une clé SYSTEM est partagée :

1. faire les correspondances exactes par `relative_path` en premier;
2. préserver le `nodeId` des chemins inchangés;
3. ne jamais deviner quel hard link a été « renommé » parmi plusieurs alias;
4. toute nouvelle occurrence ambiguë reçoit un nouvel id monotone;
5. une occurrence disparue est supprimée;
6. aucune heuristique de nom/date/taille ne participe au remap.

Exemples obligatoires :
- 1 chemin → ajout d'un hard link : l'ancien chemin garde son id, le nouveau en reçoit un;
- 2 hard links inchangés : les deux ids survivent;
- 2 hard links, un alias renommé : chemins inchangés gardent leurs ids; l'alias
  sans correspondance exacte n'est pas corrélé par supposition;
- retour à une seule occurrence : l'occurrence au chemin inchangé garde son id.

## 6. Migration

Réutiliser l'enveloppe M-B de TASK-0036.

Schéma 6 → 7 minimal :

- supprimer l'index UNIQUE `idx_nodes_stable_key`;
- recréer le même index comme index non unique sur les clés non nulles;
- aucun contenu de ligne n'est réécrit;
- stamp version 7 à la fin de la transaction;
- rollback / safety-copy existants restent autoritaires.

Pas de nouvelle DB.

## 7. Surface produit F-046

Réutiliser `ExactDuplicateExplorer`.

Pour chaque membre d'un groupe SHA-256, le backend peut dériver depuis l'Index,
sans exposer la clé brute, une classification fermée et brain-scoped :

- `PROVEN_SHARED` : identité SYSTEM disponible et plusieurs chemins du cerveau
  portent cette même identité physique;
- `PROVEN_SINGLE` : identité SYSTEM disponible et une seule occurrence du
  cerveau porte cette identité;
- `UNKNOWN` : l'OS / la politique FileTopo ne permet pas de l'affirmer.

Le DTO peut inclure un **compte sûr** d'occurrences physiques dans ce cerveau,
mais jamais la clé SYSTEM, le volume, le FileId, un hash de cette clé ou une
empreinte machine dérivée.

L'interface FR/EN doit distinguer explicitement :

- même objet physique = fait OS quand disponible;
- contenu identique = SHA-256;
- copie probable = **non inférée** par cette vue;
- nom similaire = **non inféré** par cette vue;
- relation logique = moteur de relations / décision utilisateur, pas identité.

Aucun nouvel algorithme de « copie probable » ou de similarité de noms.

## 8. Preuve obligatoire

Sur Windows, avec une racine temporaire :

- fichier A + hard link B : deux nœuds, même objet physique, scan/refresh
  réussissent, aucun `IdentityCollision`;
- copie byte-for-byte C : même SHA que A/B, mais objet physique différent;
- deux fichiers vides distincts : même SHA, objets physiques distincts et
  **aucune relation logique automatique**;
- renommage/déplacement d'un fichier SYSTEM non partagé continue de préserver
  son `nodeId`;
- ajouter/retirer un hard link n'invente pas de corrélation d'alias;
- refresh incrémental et watcher utilisent les mêmes règles;
- raw stable key / volume / FileId absent des DTO, DOM, logs et artefacts;
- source inchangée hors opérations de fixture explicitement réalisées par le
  harness avant les empreintes d'acceptation.

Sur non-Windows ou identité indisponible : `UNKNOWN`, jamais faux
`PROVEN_SINGLE`/ `PROVEN_SHARED`.

## 9. Choix

Créer :

**TASK-0055 — V1 Physical Object Identity / F-046 Closure**

Après contrôle indépendant de TASK-0055, refaire un audit V1 final avant toute
nouvelle fonctionnalité. La prochaine étape attendue devrait être une fermeture
de parité/release, pas une extension produit.
