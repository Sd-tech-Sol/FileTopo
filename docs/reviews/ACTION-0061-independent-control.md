# ACTION-0061 — Contrôle indépendant de TASK-0037

- Date : 2026-09-23
- Statut : `CLOSED / VERIFIED`
- Tâche : `TASK-0037 — V1 Change Journal on Manual Refresh`
- Branche contrôlée : `build/v0.2-a21-v1-change-journal`
- Livraison contrôlée : `17dd6500899da7b5d96f7ab5b000f29aaeaaaabb`
- Exécuteur : Claude Code / Sonnet 5
- Autorité du verdict : orchestrateur ChatGPT indépendant
- Verdict : **TASK-0037 = VERIFIED dans sa portée**
- Porte avant tranche suivante : **nettoyage public-readiness requis**, voir R1.

## Contrôle indépendant

Le contrôle a relu le diff depuis `c34096c7bd8c7dba345dfb8af77b22d6317c2149`, le rapport d’exécution, le schéma/migrations, `change_journal.rs`, `Index::publish`, `BrainIndex::open_existing_migrating`, les commandes de consultation, le panneau React, les tests et l’artefact WebView2.

## A — Journal canonique et migration v5 : accepté

Le journal vit dans le **même SQLite par cerveau**. Le saut v4→v5 ajoute `change_events` et ses index dans une transaction versionnée; le chemin produit conserve la frontière M-B déjà vérifiée : contrôle brain/binding avant mutation, quiescence, copie de sûreté validée, migration, validation canonique puis suppression de la copie seulement après succès. Les schémas v3 et v4 sont migrables par le dispatcher versionné; plus ancien que v3, inconnu ou futur reste refusé.

La conservation de v3 comme entrée migrable est **acceptée** : elle ne saute aucune migration; elle exécute 3→4 puis 4→5, chacune atomique, sous une seule enveloppe M-B. Elle évite de strander un index encore supportable sans affaiblir les refus de versions inconnues.

## B — Modèle et diff des cinq natures : accepté

Les cinq natures sont fermées : `CREATED`, `MODIFIED`, `RENAMED`, `MOVED`, `DELETED`.

- création/suppression : présence du `node_id` d’un seul côté;
- renommage : même id, nom différent;
- déplacement : même id, parent canonique différent;
- nom + parent changés : deux événements, sans chronologie disque inventée;
- descendants d’un dossier déplacé/renommé : pas de faux événement si leur propre nom/parent n’a pas changé;
- `PATH_FALLBACK` non prouvable : suppression + création, jamais corrélation heuristique;
- `MODIFIED` : uniquement métadonnées observées et figées par le code; le contenu n’est jamais lu.

L’exclusion du timestamp propre des dossiers est **acceptée** : les opérations structurelles réécrivent normalement ce timestamp et le compter produirait des `MODIFIED` parasites sur les parents. La limite « changement de timestamp de dossier seul non journalisé » est explicitement documentée.

## C — Baseline et identité : accepté

Le premier build ne fabrique pas des milliers de `CREATED`. De même, le premier republish d’un ancien corpus v3 dont les `stable_key` sont NULL réétablit une baseline plutôt que de prétendre reconnaître des identités que l’ancien schéma ne possédait pas. Cette perte de l’historique pré-journal est honnête et nécessaire.

Seul le pipeline avec identités durables écrit le journal. Les helpers synthétiques à ids choisis ne produisent pas d’historique produit. Cette frontière est acceptée.

## D — Atomicité : accepté

Le chemin produit sérialise les publications dans le processus. `Index::publish` prend ensuite une transaction `IMMEDIATE`; lecture de l’ancien corpus, diff, remplacement des nœuds, insertion des événements et incrément de révision sont dans cette transaction. Un échec du journal ou de la dernière écriture restaure corpus/révision/journal précédents.

## E — Consultation / curseur : accepté

La consultation est bornée à 50, filtrable par une ou plusieurs natures, plus récente d’abord, avec total exact et pagination keyset. Le curseur `fjc1.<index_id>.<event_id>` est lié à l’Index et **pas à la révision**. Ce choix est accepté : le journal est append-only; une nouvelle publication ajoute des événements plus récents et ne doit pas invalider une marche déjà commencée dans l’historique ancien.

Aucun chemin absolu, `stable_key`, FileId ou volume serial n’entre dans le DTO du journal. Les chemins exposés sont relatifs.

## F — UI et preuve produit : accepté

Le panneau « Changements » est intégré, paginé, filtrable et révocable; les événements sont regroupés par révision de détection. Un nœud encore présent est sélectionnable par `BrainNodeRef`; un événement supprimé reste historique seulement.

L’artefact WebView2 rapporte un vrai redémarrage, les cinq natures, les mêmes nodeIds sur rename/move SYSTEM, 135 événements persistants, pagination 50/50/35 sans trou ni doublon, filtres exacts et 0 erreur console fatale.

Dernière validation rapportée :
- Rust : **444 PASS**, 5 ignored, 0 failed;
- TypeScript : **352 PASS**;
- `pnpm check`, `pnpm build`, `cargo build --offline`, build Tauri debug, `git diff --check` : verts;
- aucun nouveau diagnostic Clippy dans les fichiers touchés.

## R1 — porte dépôt : audit public-readiness rouge sur un héritage antérieur

Le contrôle de l’exécuteur a correctement signalé que `scripts/audit-public-readiness.ps1 -AllowRemotes` échoue sur un **chemin local absolu historique** déjà présent dans `docs/ai/VALIDATION.md` (section de TASK-0027). Cette donnée n’a pas été introduite par TASK-0037; elle ne remet donc pas en cause la correction fonctionnelle du journal.

Elle contrevient néanmoins à la règle de dépôt public « aucun chemin réel/personnel ». **Aucune TASK-0038 ne doit être ouverte avant nettoyage du tree courant et retour au vert de l’audit public-readiness.**

Le nettoyage doit rester documentaire et étroit : remplacer la valeur concrète par une formulation générique, rechercher les autres chemins utilisateurs similaires dans le tree courant, rejouer l’audit, sans réécriture d’historique Git ni changement fonctionnel sauf décision séparée.

## Limites maintenues

Ce VERIFIED ne prétend pas livrer watcher F-030, application incrémentale F-031, états nouveau/non-vu F-022/F-028, chronologie réelle des opérations disque, déplacement inter-volume prouvé, fixture Cloud Files réelle, crash physique/power-loss, rétention du journal ni performance 100k du journal.

## Verdict

**TASK-0037 = VERIFIED dans sa portée.**

La prochaine action n’est pas TASK-0038 : c’est la fermeture de R1 afin de retrouver un tree public conforme avant de poursuivre le MVP.
