# NEXT_PROMPT — TASK-0042 — corrective pass after ACTION-0069

**TARGET_AGENT:** CLAUDE CODE  
**RECOMMENDED_MODEL:** Sonnet 5, medium effort  
**STATUS:** READY  
**BRANCH:** `build/v0.2-a26-v1-source-availability`

## /goal

Fermer uniquement **P1 / P1b** de
`docs/reviews/ACTION-0069-task0042-independent-recontrol.md`.

La fondation F-032 est acceptée fonctionnellement. Ne pas refaire
l'architecture, ne pas déplacer l'observation dans l'Index, ne pas ajouter de
DB, ne pas construire le watcher.

Le correctif doit rendre l'observation honnête quand **son propre write**
échoue, et ne plus croire un ancien record d'échec à côté d'une révision
d'Index plus récente.

## 0 — Préconditions

1. Appliquer `AGENTS.md` et `CLAUDE.md`.
2. Basculer explicitement sur
   `build/v0.2-a26-v1-source-availability`.
3. `git fetch origin`.
4. Synchroniser uniquement en fast-forward.
5. Vérifier arbre propre.
6. Vérifier que HEAD contient `ACTION-0069`.
7. Lire ACTION-0069 en entier avant le premier changement.

STOP/BLOCKED si une précondition ne tient pas.

## 1 — Ne pas élargir la portée

Interdictions :

- aucun watcher;
- aucun polling;
- aucun W-B/W-C;
- aucune nouvelle DB;
- aucune migration du corpus;
- aucune modification de `incremental.rs`;
- aucun changement de la machine d'état ou des raisons fermées sauf nécessité
  démontrée par P1;
- aucun nouveau chemin/stable key/texte OS dans un DTO.

## 2 — P1 : observation courante malgré write failure

Cas à fermer :

`source absente -> UNAVAILABLE constaté -> write catalog_meta refusé`.

Aujourd'hui le frontend relit le vieux record persisté. Après correction,
`map_source_observation` ou l'erreur structurée doit permettre à l'UI
d'obtenir :

- state = `UNAVAILABLE`;
- reason = `ROOT_NOT_FOUND` dans le fixture;
- `persisted = false`;
- timestamps/last-success cohérents;
- aucun champ sensible.

Une solution de fallback process-local par cerveau est acceptable et
probablement la plus étroite, mais ce n'est pas imposé.

Si tu choisis un fallback mémoire :

- maximum un record courant par brainId;
- synchronisation thread-safe;
- une écriture persistante réussie doit enlever/remplacer le transient;
- le transient n'est jamais persisté implicitement;
- un redémarrage le perd, ce qui est normal;
- la lecture doit vérifier qu'il est compatible avec la révision servie;
- aucun état de corpus n'en dépend.

## 3 — P1b : record failure stale

Avec une `served_revision` connue :

- `SYNCED` avec autre revision reste `UNKNOWN`;
- un **failure record** dont
  `lastSuccessfulRevision = Some(R)` et `R != served_revision` devient aussi
  `UNKNOWN`;
- un failure record avec `lastSuccessfulRevision = None` peut rester valide
  pour un ancien Index sans succès TASK-0042 enregistré.

Ne transforme jamais un failure stale en SYNCED.

Si un fallback transient est présent, appliquer une cohérence équivalente.

## 4 — Tests obligatoires

### T1 — vrai pipeline, write failure du failure record

Dans Rust :

1. Index SYNCED;
2. rendre la racine absente;
3. trigger catalogue refuse INSERT/UPDATE des clés
   `source_observation.%`;
4. vrai `refresh_map` échoue;
5. Index/revision/journal/seen/preferences intacts;
6. `read_source_observation` répond
   `UNAVAILABLE / ROOT_NOT_FOUND / persisted:false`;
7. l'ancien SYNCED n'est pas visible;
8. retirer trigger;
9. retry source toujours absente;
10. lecture = UNAVAILABLE persisté true.

Le test doit traverser les mêmes fonctions que Tauri utilise.

### T2 — stale failure

- record UNAVAILABLE, last success R;
- Index sert R+1;
- aucun nouveau record;
- `open_map` et `read_source_observation` => UNKNOWN.

### T3 — success write failure non-régression

Le test existant garde :

- Index appliqué;
- report SYNCED;
- persisted:false;
- lecture cohérente avec la nouvelle politique.

S'il existe un transient, préciser le résultat attendu dans le même processus
et après simulation de restart.

### T4 — frontend catch

Prouver que, si la lecture locale renvoie
`UNAVAILABLE persisted:false`, le catch d'Actualiser :

- conserve `loaded`;
- met à jour le badge;
- garde `data-persisted="false"`;
- ne déclenche aucun rebuild.

## 5 — Crash-window semantics

Documenter honnêtement :

- un fallback mémoire corrige la session courante, pas un crash;
- après restart, si le record persistant est incompatible avec la révision
  servie, il doit être UNKNOWN;
- aucune promesse de retrouver une observation qui n'a jamais pu être
  persistée.

Ne pas prétendre à l'atomicité entre Index et catalogue.

## 6 — Validation

Rejouer au minimum :

- tests ciblés P1/P1b;
- `cargo test --offline`;
- `pnpm test`;
- `pnpm check`;
- `pnpm build`;
- `cargo build --offline`;
- Clippy avec dette historique distinguée;
- `git diff --check`;
- `scripts/audit-public-readiness.ps1 -AllowRemotes`.

WebView2 complet TASK-0042 n'est pas obligatoire si l'UI visible ne change
pas et si T4 couvre le catch; si le comportement UI ou le transport change,
rejouer WebView2.

## 7 — Mémoire durable

Mettre à jour :

- `.orchestrator/RESULT.md`;
- `docs/ai/CURRENT_STATE.md`;
- `docs/ai/HANDOFF.md`;
- `docs/ai/NEXT_ACTION.md`;
- `docs/ai/VALIDATION.md`;
- `docs/ai/CHANGELOG_AI.md`;
- TASK-0042 reste `IMPLEMENTED`, jamais auto-`VERIFIED`.

`NEXT_ACTION` = contrôle indépendant de P1/P1b.

## 8 — Gouvernance

- aucune TASK-0043;
- aucun watcher/polling/W-B/W-C;
- aucun PR/merge/tag/release;
- push uniquement sur la branche actuelle;
- arbre propre à la fin.
