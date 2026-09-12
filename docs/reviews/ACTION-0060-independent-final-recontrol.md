# ACTION-0060 — Contrôle indépendant final de TASK-0036

- Date : 2026-09-12
- Statut : `CLOSED / VERIFIED`
- Tâche : `TASK-0036 — V1 Stable Identity Foundation`
- Branche contrôlée : `build/v0.2-a20-v1-stable-identity`
- Livraison finale contrôlée : `90b4e7662c34bdb06f571201419578874a60f4dc`
- Exécuteur : Claude Code / Sonnet 5
- Autorité du verdict : orchestrateur ChatGPT indépendant
- Verdict : **TASK-0036 = VERIFIED dans sa portée**

## Portée du contrôle

Ce contrôle ferme l’ensemble des recontrôles `ACTION-0057`, `ACTION-0058` et `ACTION-0059`. Il ne se contente pas de la déclaration de l’exécuteur : le source final, les tests ajoutés et les invariants de migration/identité ont été relus indépendamment.

## D1 à D3 et R1 — acquis maintenus

Les acquis déjà acceptés restent inchangés :

- migration produit `v3 → v4` atteignable uniquement pour le schéma précédent, avec `brain_id` et binding vérifiés avant mutation et sans lecture de source;
- migration SQL atomique;
- `PATH_FALLBACK` calculé depuis la représentation OS brute via `path_codec`, jamais depuis `to_string_lossy()`;
- copie de chemin toujours sûre et preuve WebView2 antérieure applicable.

## D4 — M-B conforme à DEC-0013

La voie `v3 → v4` applique désormais la baseline M-B retenue par `DEC-0013` :

1. sérialisation étroite par cerveau dans le processus;
2. quiescence avec checkpoint WAL `TRUNCATE`;
3. copie de sûreté dans l’espace applicatif du cerveau;
4. vérification indépendante que cette copie est ouvrable en v3;
5. migration transactionnelle en place;
6. restauration de la copie sur échec de migration;
7. validation canonique v4 avant abandon de la copie.

Les scénarios WAL-pending, checkpoint occupé, destination de copie invalide, mismatch cerveau/source et schéma futur restent couverts.

## D5 — frontière Cloud Files conforme à DEC-0035

La détection Cloud Files intervient avant l’identité système générique. Les états `Placeholder` et `Ambiguous` bloquent `SYSTEM` et forcent `PATH_FALLBACK`; seul `NotCloudFile` permet la voie `VolumeSerialNumber + FileId` déjà approuvée. Aucune troisième provenance, aucune hydratation/déshydratation, aucune lecture de contenu ni donnée CFAPI exposée au frontend n’est introduite.

La limite reste déclarée : aucun vrai compte/fournisseur Cloud Files n’est utilisé comme fixture. La frontière est couverte par abstraction de décision, appel Win32 sur fichier ordinaire et contrat Microsoft déjà enregistré par `DEC-0035`.

## D6 — durée de vie de la copie M-B fermée

Le dernier défaut de `ACTION-0059` est fermé dans `BrainIndex::open_existing_migrating()`.

Le flux final est :

```text
checks v3 brain/binding
lock + quiesce
copy + verify v3
migrate_previous_schema()
finish_open_existing(connection)
  OK  -> suppression de la copie -> retour du store v4
  ERR -> restauration du v3 -> suppression de la copie si restauration réussie
```

La copie n’est donc plus supprimée entre la migration SQL et la validation canonique.

Le test `d6_a_post_migration_validation_failure_restores_the_v3_index_in_full` force un invariant `build_complete` invalide que la migration SQL ne corrige pas. Il démontre que le DDL réussit, que `finish_open_existing()` refuse ensuite, puis que l’index actif revient au v3 avec ses nœuds, `seen`, `index_id`, `index_revision` et binding intacts. Après réparation de l’invariant, un retry migre en v4 sans copie résiduelle. L’exécuteur a également confirmé que ce test échoue sur le code antérieur à D6, ce qui rend la preuve discriminante.

## Validation accumulée

Dernière passe rapportée :

- Rust : `412 PASS`, `5 ignored`, `0 failed`;
- TypeScript : `339 PASS`;
- `pnpm check`, `pnpm build`, `cargo build --offline`, `git diff --check` : verts;
- fichiers Rust touchés : formatés proprement;
- Clippy strict reste rouge uniquement sur les 26 diagnostics historiques déjà identifiés, aucun nouveau diagnostic dans les fichiers de D6;
- le dernier rejeu WebView2 de TASK-0036 reste applicable au chemin produit heureux, D6 ne touchant qu’un chemin de restauration après refus canonique volontaire.

## Limites conservées

Ce `VERIFIED` ne prétend pas valider :

- déplacement inter-volume;
- vrai fournisseur/compte Cloud Files;
- crash physique/power-loss pendant M-B;
- watcher automatique;
- application incrémentale;
- journal de changements;
- filtres nouveaux/non vus;
- dette Clippy historique.

Ces sujets restent explicitement hors portée de TASK-0036.

## Verdict final

**TASK-0036 = VERIFIED dans sa portée.**

La fondation d’identité stable est suffisamment fermée pour servir de prérequis au journal de changements. La tranche suivante ne doit pas sauter directement au watcher : `P-16/P-17` imposent d’abord un journal persistant fiable, et `P-09` dépend de ses états `nouveau/non vu`.
