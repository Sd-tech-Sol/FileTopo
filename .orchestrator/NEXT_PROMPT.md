# NEXT_PROMPT — TASK-0041 — V1 Manual Refresh Through Incremental Apply

**TARGET_AGENT:** CLAUDE CODE  
**RECOMMENDED_MODEL:** Sonnet 5, high effort  
**STATUS:** READY  
**BRANCH:** `build/v0.2-a25-v1-manual-refresh-incremental`

## /goal

Implémenter intégralement
`docs/tasks/TASK-0041-v1-manual-refresh-incremental.md` selon
`docs/decisions/DEC-0039-manual-refresh-incremental-apply.md`.

Le but est précis :

`Actualiser (index existant estampé) = scan complet manuel -> lot minimal -> apply_update_batch`

**Reconstruire reste un remplacement complet explicite.**

Ne pas construire le watcher, W-B/W-C ni F-032 dans cette passe.

## 0 — Préconditions

1. Appliquer `AGENTS.md` et `CLAUDE.md`.
2. Basculer explicitement sur
   `build/v0.2-a25-v1-manual-refresh-incremental`.
3. `git fetch origin`.
4. Synchroniser uniquement en fast-forward avec
   `origin/build/v0.2-a25-v1-manual-refresh-incremental`.
5. Vérifier arbre propre.
6. Vérifier que HEAD contient :
   - `ACTION-0067` — TASK-0040 VERIFIED;
   - `DEC-0039`;
   - `TASK-0041`.
7. Lire en entier `DEC-0039` puis `TASK-0041` avant toute modification.

STOP/BLOCKED si le dépôt contredit ces préconditions.

## 1 — Audit reuse-first obligatoire

Avant de coder, auditer :

- `map::commands::publish_map / refresh_map / rebuild_map`;
- `Index::apply_update_batch`;
- `Index::publish_with_identity`;
- le remapping/stable identity existant;
- `BrainIndex::replace_with_identity`;
- métadonnées `built_unix_ms`, binding, build_complete,
  projection_contract, layout_algorithm;
- diagnostics;
- `lifecycle.ts`, `MapApp.tsx`, résumé existant.

Dans `.orchestrator/RESULT.md`, séparer clairement :

- **réutilisé**;
- **adapté**;
- **laissé full volontairement**.

Ne pas recopier la logique du journal ou de l'identité.

## 2 — Réconciliateur produit

Créer une primitive interne qui reçoit le scan complet déjà réussi et l'Index
courant, puis dérive un `UpdateBatch` **minimal**.

Elle doit :

- comparer par stable key uniquement;
- ne mettre en upsert que nouveau/changé;
- détecter les suppressions exactes;
- résoudre les parents correctement;
- inclure les descendants dont chemin/profondeur changent lors d'un move/rename
  de dossier;
- produire PATH_FALLBACK rename/move comme delete+create;
- porter la root observation;
- être déterministe;
- retourner un vrai no-op quand rien ne change.

Le scan complet peut être O(corpus) dans cette tranche : c'est F-029 manuel,
pas le futur watcher. Ne pas transformer pour autant le noyau U-B en batch de
tout le corpus.

## 3 — Câblage lifecycle

### Refresh neuf

Aucun Index :
- chemin full de baseline;
- `applicationMode = BASELINE_FULL`.

### Refresh existant estampé

- scan actuel réussi;
- réconciliation;
- `apply_update_batch`;
- **jamais** `publish_with_identity`;
- `applicationMode = INCREMENTAL`.

### Legacy migré mais non estampé

- full restamp identity-aware autorisé une fois;
- `applicationMode = IDENTITY_RESTAMP_FULL`;
- le refresh suivant doit être `INCREMENTAL`.

### Rebuild explicite

- full publication;
- `applicationMode = EXPLICIT_REBUILD_FULL`.

Un échec incrémental ne doit jamais basculer automatiquement sur rebuild/full.

## 4 — Métadonnées et diagnostics

Auditer avant modification du noyau.

Si `built_unix_ms` / diagnostics ou une autre métadonnée doivent bouger
atomiquement avec le lot pour que l'Index reste exact, choisir la modification
la plus étroite possible.

Toute modification de `incremental.rs` exige :

- justification dans RESULT;
- tests TASK-0040 de non-régression;
- aucune nouvelle lecture globale;
- aucune régression du contrat F-031.

Ne toucher au noyau que si nécessaire.

## 5 — Preuve structurelle

Il faut une preuve qui **échoue réellement** si un refresh estampé repasse par
le chemin full.

Ne te contente pas d'un grep/commentaire.

Exemples acceptables :

- test hook qui interdit le full path;
- instrumentation test-only comptant les appels;
- contrainte de test qui ferait échouer le full publish mais pas U-B.

La preuve doit traverser le vrai `refresh_map`/chemin produit.

## 6 — F-029 sûreté

Prouver via le chemin produit :

- scan incomplet/annulé -> aucune écriture;
- erreur après scan avant apply -> ancien Index;
- erreur injectée pendant U-B -> rollback exact;
- aucun fallback full;
- no-op -> même révision;
- changement effectif -> une seule nouvelle révision;
- résumé exact;
- source inchangée.

## 7 — UI / DTO

Ajouter uniquement `applicationMode` au rapport/type si nécessaire pour la
preuve et le diagnostic.

Le résumé existant doit rester la surface utilisateur principale :
ne pas refaire le panneau.

Après refresh :

- projection relue;
- journal relu via révision;
- filtres NEW/UNSEEN cohérents;
- seen-state conservé.

## 8 — WebView2 réel

Obligatoire : le vrai chemin `map_refresh` change.

Rejouer le scénario TASK-0041, incluant au minimum :

- baseline full;
- refresh no-op incremental;
- mutation synthétique externe;
- refresh incremental + résumé;
- journal + NEW/UNSEEN;
- geste vu puis changement futur;
- rebuild explicite full;
- vrai redémarrage;
- aucune fuite;
- 0 erreur fatale.

## 9 — Validation

Exécuter toute la fiche, notamment :

- tests ciblés;
- `cargo test --offline`;
- `pnpm test`;
- `pnpm check`;
- `pnpm build`;
- `cargo build --offline`;
- Tauri debug + WebView2;
- Clippy dette historique distinguée;
- `git diff --check`;
- `scripts/audit-public-readiness.ps1 -AllowRemotes`.

Si le noyau U-B est modifié, rejouer une preuve F-031 pertinente; le ratio
canonique existant ne doit pas être réécrit.

## 10 — Gouvernance

À la fin :

- TASK-0041 = `IMPLEMENTED`, jamais `VERIFIED`;
- aucune TASK-0042;
- aucun watcher;
- aucun W-B/W-C;
- F-032 hors portée;
- pas de PR/merge/tag/release;
- docs durables + FEATURE_MATRIX à jour honnêtement;
- `.orchestrator/RESULT.md` complet;
- `NEXT_ACTION` = contrôle indépendant de TASK-0041;
- push uniquement sur la branche;
- arbre propre.
