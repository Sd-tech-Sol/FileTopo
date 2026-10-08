# DEC-0052 — Node occurrence identity vs Windows physical object identity

- **Date :** 2026-10-07
- **Statut :** `APPROVED`
- **Décidée par :** ACTION-0102
- **Implémentation prévue :** TASK-0055
- **Supplémente :** DEC-0009 I-E, DEC-0013 D/F, DEC-0035
- **Ne remplace pas :** la frontière SHA-256 de DEC-0025/DEC-0028

## A. Deux niveaux, une seule source canonique

FileTopo distingue désormais explicitement :

1. **occurrence de nœud** : une entrée de l'arborescence, identifiée par son
   `nodes.id` canonique;
2. **objet physique Windows** : l'objet que Windows identifie par
   `VolumeSerialNumber + FileId`.

Deux occurrences peuvent désigner le même objet physique (hard links).

Cette décision ne crée **aucun second store**. L'Index canonique reste
l'unique propriétaire du fait SYSTEM.

## B. Sémantique de stable_key

`stable_key` reste interne.

- `SYSTEM` : la clé représente l'identité physique prouvée par Windows; elle
  **peut être partagée** par plusieurs occurrences.
- `PATH_FALLBACK` : la clé représente l'occurrence déterministe
  chemin-relatif-brut + type; un doublon dans un même corpus reste invalide.

L'ancien invariant « toute stable_key est unique » est donc remplacé par :

> `PATH_FALLBACK` est unique par occurrence; `SYSTEM` peut former un groupe
> d'occurrences du même objet physique.

Le `nodes.id` reste toujours unique.

## C. Schéma 7

Migration 6 → 7 :

- `DROP INDEX idx_nodes_stable_key`;
- recréer `idx_nodes_stable_key` **non unique**, filtré sur
  `stable_key IS NOT NULL`;
- aucun row rewrite;
- version 7 stampée en dernier dans la transaction;
- migration exécutée sous l'enveloppe M-B existante.

Aucune nouvelle table/DB/colonne d'identité physique n'est requise par défaut.

## D. Publication / remap

Le remap se fait par groupes de `stable_key`.

### D1 — groupe non ambigu

Une ancienne et une nouvelle occurrence d'une même clé :
- même id canonique;
- comportement F-004 inchangé.

### D2 — groupe SYSTEM partagé

Si un groupe contient plusieurs occurrences :

1. apparier d'abord ancien/nouveau par chemin relatif exact;
2. ces occurrences gardent leur id;
3. ne jamais apparier les alias restants par ordre, nom, date, taille ou
   proximité;
4. occurrence nouvelle/non appariée => nouvel id monotone;
5. occurrence ancienne/non appariée => disparition;
6. le journal reflète uniquement ces décisions prouvables.

### D3 — doublon PATH_FALLBACK

Toujours refusé explicitement avant mutation.

## E. Une seule règle dans tous les chemins de mise à jour

Le même modèle s'applique à :

- première publication;
- Actualiser / noyau incrémental;
- watcher W-B / W-C;
- rebase d'exclusions;
- Reconstruire.

Aucun chemin ne garde une ancienne hypothèse « SYSTEM doit être unique ».

## F. Surface produit sûre

Le WebView ne reçoit jamais :

- `stable_key`;
- `VolumeSerialNumber`;
- `FileId`;
- une version hashée/encodée de ces valeurs;
- un identifiant machine dérivé.

Il reçoit au plus une classification fermée par membre :

- `PROVEN_SHARED`;
- `PROVEN_SINGLE`;
- `UNKNOWN`;

et, si utile, un compte d'occurrences **dans ce cerveau**.

Cette classification est calculée côté Rust à partir du seul Index du cerveau.

## G. F-046 ne devient pas un moteur heuristique

Cette décision n'ajoute aucun calcul de :

- copie probable;
- similarité de nom;
- version/filiation;
- relation logique automatique.

Elle rend seulement les cinq concepts de DEC-0021 non confondables dans le
produit :

- objet physique : preuve OS;
- contenu identique : SHA-256;
- copie probable : hypothèse non produite ici;
- nom similaire : hypothèse non produite ici;
- relation logique : store/moteur de relations existant.

## H. Cloud / reparse / plateforme

DEC-0035 reste autoritaire.

- placeholder/Cloud ambigu/reparse/non-Windows sans preuve OS => `UNKNOWN`;
- aucune hydratation forcée;
- aucune lecture de contenu pour établir l'identité physique.

## I. Sécurité de migration

Toute migration v6 → v7 doit conserver les garanties M-B :

- cerveau/source vérifiés avant mutation;
- quiescence/WAL;
- safety copy vérifiée;
- transaction atomique;
- validation canonique finale;
- restauration sur échec;
- copie supprimée seulement après validation.

## J. Critère de réussite

TASK-0055 peut fermer F-046 seulement si elle prouve au minimum :

- deux hard links = deux occurrences, même objet physique;
- une copie byte-for-byte = contenu identique, objet physique distinct;
- deux fichiers vides distincts = contenu identique mais aucune relation logique;
- un SYSTEM simple garde la stabilité de F-004;
- les flux incrémentaux ne réintroduisent pas la collision;
- aucune identité brute ne franchit IPC/DOM/log/artefact.
