# ACTION-0070 — Clôture indépendante de TASK-0042

- Date : `2026-09-24`
- Statut : `CLOSED / VERIFIED`
- Tâche : `TASK-0042 — V1 Source Availability & Stale Index Foundation`
- Branche contrôlée : `build/v0.2-a26-v1-source-availability`
- Livraison finale contrôlée : `86476d20a9db7878ee3e46f766d0b98bcd1474cb`
- Recontrôle précédent : `ACTION-0069`
- Verdict : **TASK-0042 = VERIFIED dans sa portée; F-032 reste une fondation jusqu'au watcher**

## A — Machine d'état et persistance : acceptées

Le contrôle indépendant confirme :

- états fermés `UNKNOWN / SYNCED / UNAVAILABLE / SOURCE_CHANGED /
  SCAN_INCOMPLETE / APPLY_FAILED`;
- raisons fermées, sans path, stable_key, FileId, volume ou texte OS;
- stockage par cerveau dans `catalog_meta`, sans nouvelle DB;
- aucune dépendance de validité du corpus à cette petite métadonnée;
- `map_open` et `map_source_observation` ne touchent jamais la source;
- dernier Index fiable conservé intégralement en cas d'échec source.

## B — ACTION-0069 P1 : fermée

Le fallback process-local est accepté.

Il est :

- borné à un record par `(catalogue, brainId)`;
- thread-safe;
- jamais sérialisé;
- jamais utilisé comme vérité de l'Index;
- prioritaire à la lecture dans la session courante;
- automatiquement retiré dès qu'une écriture persistante réussit;
- perdu au redémarrage par design.

Le cas problématique est maintenant fermé :

`source absente -> UNAVAILABLE -> write catalog_meta refusé`

donne immédiatement, via les mêmes fonctions que Tauri appelle :

`UNAVAILABLE / ROOT_NOT_FOUND / persisted:false`

et non plus l'ancien `SYNCED` encore présent sur disque.

Le test T1 vérifie en plus que l'Index, son digest, sa révision, le journal et le
catalogue hors observation sont inchangés.

## C — ACTION-0069 P1b : fermée

La fonction `describes()` invalide désormais :

- un `SYNCED` lié à une autre révision;
- un **failure record** dont `lastSuccessfulRevision = Some(R)` alors que la
  révision servie n'est plus R.

Dans ce cas la lecture retourne `UNKNOWN`, jamais `SYNCED`.

Un failure record avec `lastSuccessfulRevision = None` reste accepté, ce qui
préserve le cas d'un ancien Index n'ayant jamais enregistré de succès TASK-0042.

## D — Fenêtre de crash : contrat honnête

La correction n'affirme pas une atomicité qui n'existe pas.

- Le fallback mémoire corrige la session courante.
- Un crash/redémarrage le perd.
- Au redémarrage, un record persistant incompatible avec la révision servie est
  neutralisé en `UNKNOWN`.
- Si l'ancien record `SYNCED` décrit encore exactement la même révision après
  un failure non persisté, il reste ce qui est connu sur disque. Ce cas est
  explicitement testé et documenté.

Ce compromis est accepté pour cette portée.

## E — Frontend : accepté

Le test T4 traverse le vrai `MapApp` avec :

- `map_refresh` refusé;
- `map_source_observation` retournant
  `UNAVAILABLE / persisted:false`.

Il prouve :

- carte chargée conservée;
- badge `UNAVAILABLE`;
- `data-persisted=false`;
- mention « non enregistrée »;
- ancien texte `SYNCED` absent;
- une seule lecture locale de l'observation;
- aucun `map_rebuild`, aucun `map_open`, aucun nouveau `map_view`.

Aucun changement produit TypeScript n'était requis; le comportement existant
consomme correctement le nouveau backend.

## F — Validations

Rapportées et cohérentes avec le diff contrôlé :

- Rust : **629 PASS**, 0 fail, 6 ignored;
- TypeScript : **439 PASS**;
- `pnpm check`, `pnpm build`, `cargo build --offline` : verts;
- Clippy : dette historique seulement;
- `git diff --check` propre;
- audit public-readiness vert;
- `incremental.rs`, `scanner.rs`, `lib.rs`, `MapApp.tsx`,
  `lifecycle.ts` non modifiés par la passe corrective.

Le rejeu WebView2 complet n'était pas nécessaire pour la passe corrective :
aucune surface visible ni transport n'a changé, et la preuve WebView2 de
TASK-0042 reste valable; T4 couvre précisément le nouveau cas.

## Limites maintenues

Ce VERIFIED ne livre toujours pas :

- watcher F-030;
- détection automatique de source absente;
- W-B/W-C;
- polling;
- deux processus sur le même catalogue;
- récupération d'une observation qui n'a jamais pu être persistée après crash.

## Verdict

**TASK-0042 = VERIFIED dans sa portée.**

La machine d'état F-032 est maintenant une fondation stable que le futur
watcher devra obligatoirement consommer avant toute réconciliation ou lot de
suppressions.
