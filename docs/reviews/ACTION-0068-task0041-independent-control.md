# ACTION-0068 — Contrôle indépendant de TASK-0041

- Date : 2026-09-24
- Statut : `CLOSED / VERIFIED`
- Tâche : `TASK-0041 — V1 Manual Refresh Through Incremental Apply`
- Branche contrôlée : `build/v0.2-a25-v1-manual-refresh-incremental`
- Livraison contrôlée : `2b519588fa7280ad5b66b5753593c7dc7bc686ac`
- Prérequis : `TASK-0040 = VERIFIED` par `ACTION-0067`
- Verdict : **TASK-0041 = VERIFIED dans sa portée**

## A — Chemin produit Actualiser : accepté

Le vrai `refresh_map` appelle maintenant le pipeline commun
`publish_map(... Gesture::Refresh ...)`.

Après un scan complet réussi :

- Index absent → `BASELINE_FULL`;
- Index existant, identité + binding actuels → `INCREMENTAL`;
- Index legacy non estampé / non lié mais reconnu → `IDENTITY_RESTAMP_FULL`;
- geste Reconstruire sur Index existant → `EXPLICIT_REBUILD_FULL`.

Le chemin `INCREMENTAL` appelle
`BrainIndex::refresh_incrementally -> reconcile_full_scan -> Index::apply_update_batch`.
Il n'appelle pas `publish_with_identity`.

Aucun fallback full n'existe après une erreur du réconciliateur ou du noyau.

## B — Réconciliateur scan complet → lot minimal : accepté

`reconcile_full_scan` :

- valide la bijection scan/identités;
- exige une racine unique;
- corrèle uniquement par stable key;
- refuse les clés dupliquées, parents pendants et racine différente;
- lit les lignes stockées en un passage;
- produit seulement les créations / changements observables et les suppressions;
- résout les parents via `Existing` ou `InBatch`;
- entraîne naturellement les descendants dont chemin/profondeur changent;
- produit PATH_FALLBACK rename/move comme delete+create;
- n'écrit rien lui-même;
- ne crée aucun second Index.

Un scan identique produit un batch vide.

Le coût de cette réconciliation reste O(corpus), ce qui est accepté pour F-029
manuel. Le verdict F-031 porte toujours sur l'application U-B du lot déjà
réconcilié.

## C — Preuve « pas de full replacement » : acceptée

La preuve n'est pas un grep.

Un trigger SQLite garde l'ensemble des ids existants et refuse tout INSERT d'un
id déjà présent. Une publication complète supprime puis réinsère ces ids et
échoue donc sous ce garde; le chemin U-B, lui, n'insère que les nouveaux ids.

Le contrôle associé démontre que le garde bloque bien :

- `Reconstruire`;
- un `publish_with_identity` direct.

Le vrai `refresh_map` estampé traverse ce garde avec succès. Le test de
mutation remplaçant l'arm incrémental par le full path fait échouer de nombreux
tests, ce qui confirme que le harnais détecte précisément cette régression.

## D — Sûreté F-029 : acceptée

Les scénarios produit prouvent :

- scan incomplet / annulé / source absente → aucune mutation;
- refus de racine changée → Index intact;
- erreur SQL injectée pendant INSERT / UPDATE / DELETE / journal / révision →
  rollback intégral;
- aucun fallback full après échec U-B;
- no-op → révision inchangée;
- lot effectif → une seule révision;
- journal, seen-state, filtres et curseurs restent cohérents.

Le critère « ne jamais vider l'Index courant avant un remplacement valide » est
donc satisfait par le vrai chemin produit.

## E — Décisions étroites relevées par l'exécuteur

### E1 — legacy sans binding

Accepté. Un Index pré-DEC-0033 reconnu peut nécessiter un full restamp même si
ses lignes portent déjà des clés PATH_FALLBACK. Le kernel ne réécrit pas le
binding; un restamp unique est donc la solution la plus étroite et respecte
DEC-0033 D.

### E2 — `built_unix_ms`

Accepté dans cette portée. Il reste l'instant de la dernière publication
**complète**, n'est utilisé comme freshness par aucun lecteur et un no-op
incrémental doit écrire zéro octet logique. La fraîcheur source sera traitée
séparément avant le watcher.

### E3 — diagnostics

Accepté. Le pipeline actuel refuse tout scan incomplet avant application; un
Index estampé produit par ce pipeline ne conserve donc pas un diagnostic
partiel. Le noyau efface en plus les diagnostics ciblés des chemins changés /
supprimés.

### E4 — no-op / timestamp de dossier

Accepté. Un no-op réel ne change pas la révision. Une métadonnée stockée
effectivement changée mais non journalisée par contrat peut avancer la révision
avec résumé zéro; ce n'est pas une contradiction.

### E5 — identité de racine changée

Accepté comme frontière explicite de F-032 : Actualiser refuse plutôt que
d'interpréter le corpus entier comme suppressions/créations. Reconstruire reste
une action explicite disponible.

### E6 — Reconstruire sans Index

Accepté : il établit une baseline et rapporte `BASELINE_FULL`. Le mode décrit
la réalité de l'application plutôt que le libellé du bouton.

## F — Noyau TASK-0040

Le diff de `incremental.rs` entre la base et la livraison ne modifie que son
commentaire de portée / callers. Aucune logique U-B, aucun réglage SQLite et
aucun seuil F-031 n'ont changé. Le rejeu canonique F-031 n'était donc pas requis.

## G — UI / WebView2

Le DTO fermé `applicationMode` est non sensible et affiché discrètement à côté
du résumé existant.

Le rejeu réel WebView2 rapporte :

- BASELINE_FULL;
- Actualiser no-op INCREMENTAL, même révision;
- mutations disque externes → un Actualiser INCREMENTAL avec résumé exact;
- journal + NEW/UNSEEN;
- seen puis changement futur redevient unseen;
- dossier renommé avec descendants;
- Reconstruire EXPLICIT_REBUILD_FULL;
- retour à INCREMENTAL;
- second cerveau isolé;
- redémarrage réel : même Index/révision/journal/seen-state;
- 0 fuite d'identité/chemin;
- 0 erreur console fatale.

## H — Validations

Rapportées :

- Rust : **593 PASS**, 6 ignorés;
- TypeScript : **415 PASS**;
- `pnpm check`, `pnpm build`, `cargo build --offline`, Tauri debug : verts;
- Clippy : dette historique seulement, aucun diagnostic nouveau;
- `git diff --check` propre;
- audit public-readiness vert, allowlist inchangée.

## Limites maintenues

Ce VERIFIED ne livre pas :

- watcher F-030;
- W-B/W-C;
- indisponibilité temporaire F-032;
- coût end-to-end d'Actualiser à 100k+;
- crash physique de processus;
- concurrence multi-processus;
- Cloud Files réel.

## Verdict

**TASK-0041 = VERIFIED dans sa portée.**

Le prochain prérequis avant la surveillance automatique est de donner une
sémantique durable et explicite à l'indisponibilité temporaire / fraîcheur de
la source, sans jamais transformer une racine absente en suppression massive.
