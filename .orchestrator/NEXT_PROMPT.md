# NEXT_PROMPT — TASK-0036 — final corrective pass after ACTION-0059

**TARGET_AGENT:** CLAUDE CODE  
**RECOMMENDED_MODEL:** Sonnet 5, high effort  
**STATUS:** READY  
**OWNER:** orchestrateur ChatGPT  
**TASK:** `TASK-0036 — V1 Stable Identity Foundation`  
**BRANCHE:** `build/v0.2-a20-v1-stable-identity`

## /goal

Corriger **uniquement D6** de `docs/reviews/ACTION-0059-independent-recontrol.md` : la copie de sûreté M-B ne doit être supprimée qu’après réussite de la validation canonique v4. D1/D2/D3/R1, D4 hors D6 et D5 sont acceptés; ne pas les réécrire sans nécessité démontrée.

Aucune TASK-0037. Aucun journal, watcher, incrémental, filtre ou nouvelle UI. Finir `IMPLEMENTED`, jamais auto-`VERIFIED`.

## 0 — Préconditions

1. Appliquer `AGENTS.md` et `CLAUDE.md`.
2. Bascule explicitement sur `build/v0.2-a20-v1-stable-identity`, `git fetch origin`, fast-forward uniquement, arbre propre.
3. Le HEAD doit contenir `ACTION-0059`.
4. Lire `ACTION-0058`, `ACTION-0059`, `DEC-0013`, `DEC-0035`, `TASK-0036`, puis `src-tauri/src/map/brain_index.rs` et les tests stable identity.

## 1 — Correction D6

Le flux actuel supprime `safety_copy` immédiatement après `migrate_previous_schema()` puis appelle `finish_open_existing()`. C’est trop tôt : `finish_open_existing()` peut encore refuser le contrat canonique v4.

Construire le flux suivant sans dupliquer ni affaiblir `finish_open_existing()` :

```text
checks v3 brain/binding
lock + quiesce
copy + verify v3
migrate_previous_schema()
finish_open_existing(connection)
  OK  -> supprimer safety copy -> retourner store v4
  ERR -> connexion v4 fermée -> restaurer safety copy v3 -> nettoyer la copie
         si restauration réussie -> retourner l’erreur de validation
```

Exigences :

- la copie doit rester disponible pendant **toute** la validation v4;
- une erreur de migration conserve le comportement D4 déjà acquis;
- une erreur de validation finale restaure également le v3;
- si la restauration échoue, retourner une erreur de restauration claire et **ne pas supprimer** une copie encore utile à récupération;
- aucun chemin absolu de copie dans DTO/log/artefact;
- succès normal : pas de copie résiduelle;
- ne pas introduire de nouveau store ou mécanisme de migration.

## 2 — Test obligatoire

Ajouter un test produit déterministe qui passe réellement par `open_map/open_for_brain` :

1. produire un index réel, le ramener en v3;
2. conserver brain_id + binding corrects pour que D1 autorise la migration;
3. rendre volontairement invalide un invariant canonique **que la migration ne répare pas** (ex. `build_complete`, `projection_contract`, `root_id` ou équivalent);
4. appeler `open_map` : le DDL v3→v4 doit réussir, puis `finish_open_existing()` doit échouer;
5. après l’erreur, prouver restauration du fichier actif au v3 antérieur : `user_version == 3`, contenu attendu, `seen`, `index_id`, `index_revision`, brain/binding inchangés selon la fixture;
6. prouver que la copie temporaire a été supprimée après restauration réussie;
7. réparer l’invariant de fixture, relancer `open_map`, prouver migration v4 réussie et aucune copie résiduelle.

Le test doit échouer sur le code de `0daf342f` et passer après correction.

## 3 — Non-régression

Rejouer au minimum :

- tous les tests D4 M-B (WAL pending + restore + retry, busy checkpoint, failed safety copy, refus brain/binding/future schema);
- tous les tests D5 Cloud Files;
- D1/D2/D3/R1 et les invariants stable identity;
- `cargo test --offline`;
- suite TS complète, `pnpm check`, `pnpm build`, `cargo build --offline`, fmt limité, `git diff --check`;
- Clippy strict en distinguant les 26 diagnostics historiques de tout nouveau diagnostic;
- WebView2 TASK-0036 seulement si le code touché peut affecter son scénario; sinon justifier explicitement pourquoi le dernier replay `0daf342f` reste applicable. Ne fabrique pas une preuve inutile.

## 4 — Livrables

- `TASK-0036` reste `IMPLEMENTED`, jamais auto-`VERIFIED`;
- mettre à jour `.orchestrator/RESULT.md`, `CURRENT_STATE`, `HANDOFF`, `NEXT_ACTION`, `VALIDATION`, `CHANGELOG_AI` honnêtement;
- `RESULT.md` nomme D6 et la preuve de restauration après **échec de validation post-migration**;
- `NEXT_ACTION = contrôle indépendant final de TASK-0036`;
- commit + push sur cette branche, arbre propre;
- aucun PR/merge/tag/release, aucune TASK-0037.
