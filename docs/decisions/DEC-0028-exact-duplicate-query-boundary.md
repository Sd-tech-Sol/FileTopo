# DEC-0028 — Frontière de requête des contenus binaires identiques observés

- **Date :** 2026-09-05
- **Statut :** `IMPLEMENTED` — contrôle indépendant requis sur `TASK-0026`
- **Phase :** étape A — exploitation bornée des observations exactes
- **Décideur :** orchestrateur technique, par le GO explicite de
  `.orchestrator/NEXT_PROMPT.md`
- **Rédacteur :** Codex, agent d'exécution
- **Implémentée par :**
  [`TASK-0026`](../tasks/TASK-0026-exact-duplicate-explorer.md)
- **replaced_by :** —

## Contexte

[`TASK-0021 §6`](../tasks/TASK-0021-product-realignment.md) propose une
tranche d'identité de contenu et de doublons exacts. [`DEC-0021`](DEC-0021-deterministic-relation-engine.md)
sépare cinq concepts : même objet physique, contenu identique, copie probable,
nom similaire et relation logique. [`DEC-0025`](DEC-0025-exact-content-observation-boundary.md),
implémentée par `TASK-0023` puis vérifiée par `ACTION-0039`, fournit déjà
l'observation exacte `sha256-v1`, persistante par cerveau et reconstruite à
chaque campagne explicite.

`TASK-0024 / ACTION-0041` a ensuite vérifié le moteur déterministe qui consomme
ces observations, et `TASK-0025 / ACTION-0042` a vérifié la file de révision et
la mémoire des décisions humaines. Il manque une lecture produit réellement
bornée et exploitable des groupes de contenu identique.

[`DEC-0013`](DEC-0013-post-risk-gate-technical-arbitration.md) D impose
`VolumeSerialNumber + FileId`, jamais `FileId` seul, pour toute identité système;
son point F maintient une porte bloquante avant toute identité physique
persistante. Cette décision ne franchit pas cette porte.

## Décision

### A — un groupe décrit seulement un contenu observé

Un groupe existe si et seulement si au moins deux lignes `HASHED` de la
génération courante d'un même cerveau portent le même couple
`(hash_algorithm = sha256-v1, hash_hex valide)`. Sa formulation utilisateur
canonique est **« Contenu binaire identique observé »**.

Un groupe n'est ni un fichier, ni une identité physique, ni une copie, ni une
version, ni une relation. Son identifiant est dérivé du digest dans le
namespace du cerveau et n'est jamais une identité de fichier ni une clé
globale inter-cerveaux. La taille sert d'invariant de cohérence, jamais de
substitut au digest.

### B — source de vérité et fraîcheur

L'explorateur lit uniquement la génération courante de
`brains/<brain_id>/signals/content.sqlite`. Il ne transforme pas une dernière
observation persistée en affirmation implicite sur l'état présent de la
source. Une nouvelle campagne explicite continue à rouvrir et rehacher les
fichiers selon `DEC-0025 §E`.

Cette tranche **n'autorise ni identité physique persistante ni cache de digest
validé par taille + mtime**. Elle n'ajoute aucun watcher, change token,
`VolumeSerialNumber`, `FileId`, inode ou équivalent. `DEC-0013` D et F restent
entiers.

### C — requêtes réellement bornées

Le backend publie trois lectures séparées : résumé exact, liste paginée des
groupes, membres paginés d'un groupe. Les limites maximales sont explicites et
appliquées avant lecture; l'agrégation et la pagination vivent dans SQLite.
Les groupes sont ordonnés par `size_bytes DESC, hash_hex ASC`; les membres par
`relative_path ASC`. Aucune réponse ne charge silencieusement tous les groupes
et tous leurs membres.

### D — fichiers vides

Des fichiers vides portant le même digest forment un groupe exact visible,
marqué `emptyContent`. Cette observation ne crée aucune relation, suggestion,
direction de copie ou estimation de gain disque. Le comportement vérifié de
`core.identical-content/v1`, qui ne produit pas de relation pour les fichiers
vides, reste inchangé.

### E — isolation et lecture seule

Chaque store est propre à un `brain_id`. Un digest égal dans deux cerveaux ne
fusionne ni groupes ni membres. Lire l'explorateur ne modifie aucun store de
contenu, de relations, de suggestions ou inter-cerveaux, et ne modifie jamais
la source analysée.

Après reconstruction de `map/`, les observations restent dans le store de
signaux. Un membre non résolu contre la carte courante reste visible et est
signalé honnêtement; il n'est ni effacé ni transformé en fait courant.

### F — présentation produit

L'interface affiche à proximité de chaque exploration la limite :
**« Cela ne prouve pas qu'il s'agit du même fichier physique ni d'une copie. »**
Elle ne parle jamais de `same file`, `physical duplicate`, copie, sauvegarde,
version ou espace récupérable garanti. Consulter ou naviguer vers un membre ne
crée aucune relation ni suggestion.

## Conséquences

- `TASK-0026` peut implémenter l'exploration et l'échelle des groupes exacts,
  sans compléter la tranche #4 entière proposée par `TASK-0021`.
- `F-046` reste `PROPOSED` : sa fondation `sha256-v1` est vérifiée par
  `TASK-0023 / ACTION-0039`, mais l'identité physique persistante demeure
  absente et bloquée par `DEC-0013/F`.
- Les résultats persistés sont des observations datées, non une garantie de
  fraîcheur présente.
- Aucune relation ou suggestion n'est produite par l'explorateur.
- Aucun seuil universel de performance n'est adopté.

## Alternatives écartées

- Charger tous les groupes et membres : mémoire et latence non bornées.
- Valider un digest par taille + mtime : fraîcheur non prouvée.
- Appeler un groupe « doublon physique » ou « copie » : conclusion que le hash
  ne démontre pas.
- Persister une identité Windows : porte `DEC-0013/F` non franchie.
- Transformer chaque digest partagé en relation : confusion entre fait et
  relation, contraire à `DEC-0021`.

## Preuves attendues

Les critères gelés `ED1` à `ED15` de `TASK-0026`, les tests synthétiques et les
deux preuves Windows/WebView2 `ED15` constituent le protocole de preuve.
`VERIFIED` appartient exclusivement à un contrôle indépendant.
