# NEXT_PROMPT — TASK-0037 — V1 Change Journal on Manual Refresh

**TARGET_AGENT:** CLAUDE CODE  
**RECOMMENDED_MODEL:** Sonnet 5, high effort  
**STATUS:** READY  
**OWNER:** orchestrateur ChatGPT  
**TASK:** `TASK-0037 — V1 Change Journal on Manual Refresh`  
**BRANCHE:** `build/v0.2-a21-v1-change-journal`

## /goal

Implémenter intégralement `docs/tasks/TASK-0037-v1-change-journal.md` : journal persistant par cerveau alimenté lors d’Actualiser/Reconstruire, avec les cinq natures `CREATED`, `MODIFIED`, `RENAMED`, `MOVED`, `DELETED`, publication atomique avec l’Index, consultation paginée/filtrable et UI V1.

`TASK-0036` est **VERIFIED** par `ACTION-0060`. Sa fondation d’identité stable et sa migration M-B sont des acquis à réutiliser, pas à réécrire.

Cette tâche reste `IMPLEMENTED`, jamais auto-`VERIFIED`. Ne créer aucune TASK-0038. Ne commencer aucun watcher, `ReadDirectoryChangesExW`, application incrémentale U-B, réconciliation W-B/W-C, filtres de carte nouveau/non-vu, ou marquage vu.

## 0 — Préconditions et audit

1. Appliquer `AGENTS.md` et `CLAUDE.md`.
2. Bascule explicitement sur `build/v0.2-a21-v1-change-journal`, `git fetch origin`, fast-forward uniquement, arbre propre.
3. Le HEAD doit contenir `ACTION-0060` et `TASK-0037`.
4. Lire **en entier** `TASK-0037` avant de coder.
5. Lire les décisions et sources nommées en section A de la tâche, particulièrement `DEC-0010`, `DEC-0013`, le chemin M-B actuel et la publication stable de `TASK-0036`.
6. Auditer avant de construire : réutiliser les transactions, curseurs, DTO et composants existants; pas de second Index, pas de journal parallèle.

## 1 — Points de contrôle obligatoires

### Schéma / migration

Si l’audit confirme que le schéma courant est v4, faire un saut versionné vers v5 pour le journal. Le chemin produit v4→v5 doit passer par la **même frontière M-B** que TASK-0036 : contrôles binding, quiescence, copie, migration transactionnelle, validation canonique, restauration sur échec de migration ou validation, suppression de copie seulement après succès final.

Ne transforme pas `open_existing_migrating()` en collection de chemins divergents. Si nécessaire, factorise un dispatcher de migration par version tout en conservant les preuves de sécurité existantes.

### Diff

Le diff se fait entre l’ancien corpus canonique et le nouveau corpus **après remap des IDs stables**.

- présent seulement après → `CREATED`;
- présent seulement avant → `DELETED`;
- même ID, nom changé avec même parent → `RENAMED`;
- même ID, parent changé → `MOVED`;
- même ID, métadonnée observable non structurelle changée → `MODIFIED`.

Ne journalise pas un faux move sur chaque descendant d’un dossier déplacé si son `parent_id` propre est inchangé. `PATH_FALLBACK` renommé/déplacé reste delete+create. Aucun heuristic matching.

Si nom et parent changent ensemble, représente les deux natures avec le même `detected_revision`; l’ordre de journal est déterministe mais **n’est jamais présenté comme l’ordre réel des opérations filesystem**.

### Atomicité

Corpus + révision + événements = une seule publication transactionnelle. Échec du journal => rollback publication. Échec publication => aucun événement. Premier build => baseline, journal vide. Refresh inchangé => zéro événement. Historique jamais vidé par rebuild.

### Consultation / UI

API max 50/page, keyset cursor lié à l’`index_id` mais pas rendu obsolète uniquement parce qu’une nouvelle révision s’ajoute au journal. Filtres par nature, total exact, plus récent d’abord.

UI simple « Changements » : pagination, filtres visibles/révocables, chemins relatifs seulement, sélection d’un nœud encore vivant via les primitives existantes, aucun focus possible sur un DELETE.

Ajouter aux rapports Actualiser/Reconstruire un résumé de compteurs par nature, pas la liste complète.

## 2 — Preuves obligatoires

Exécuter toutes les preuves G/H de `TASK-0037`, notamment :

- migration produit vers le nouveau schéma sous M-B;
- first build vide / no-op refresh zéro événement;
- cinq natures exactes;
- rename/move SYSTEM gardent le nodeId;
- dossier déplacé sans faux événements descendants;
- PATH_FALLBACK rename/move = delete+create;
- publication/journal atomiques sous échec injecté;
- historique persistant au redémarrage;
- pagination >50 sans trou/doublon + filtres/total;
- isolation entre cerveaux;
- aucune donnée sensible dans DTO/DOM/artefacts;
- WebView2 Windows avec un vrai redémarrage de processus et 0 erreur console fatale.

Ne pas utiliser de donnée personnelle ni de vrai cerveau utilisateur.

## 3 — Non-régression TASK-0036

Les invariants D1–D6 restent verts : stable IDs, raw-path fallback, Cloud Files conservative boundary, M-B, recherche, enfants directs, Explorer, Copier le chemin, projection bornée et aucune permission WebView nouvelle.

## 4 — Validation

Exécuter :

- tests Rust ciblés puis `cargo test --offline`;
- suite TypeScript complète;
- `pnpm check`;
- `pnpm build`;
- `cargo build --offline`;
- formatage limité aux fichiers touchés;
- Clippy strict en séparant dette historique et nouveau diagnostic;
- `git diff --check`.

## 5 — Livrables

À la fin :

- `TASK-0037 = IMPLEMENTED`, jamais auto-`VERIFIED`;
- mettre à jour `CURRENT_STATE`, `HANDOFF`, `NEXT_ACTION`, `VALIDATION`, `CHANGELOG_AI` et `FEATURE_MATRIX` honnêtement;
- `.orchestrator/RESULT.md` doit résumer : audit reuse/adapt/not-build, schéma/migration, modèle d’événement, règles de diff, atomicité, API/UI, preuve des cinq natures, pagination, WebView2, tests et limites;
- `NEXT_ACTION = contrôle indépendant de TASK-0037`;
- aucun TASK-0038, PR, merge, tag ou release;
- commit/push uniquement sur `build/v0.2-a21-v1-change-journal`, arbre propre.
