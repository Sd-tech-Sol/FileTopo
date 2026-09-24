# TASK-0041 — V1 Manual Refresh Through Incremental Apply

- **Date :** 2026-09-24
- **Statut :** `IMPLEMENTED` (jamais auto-`VERIFIED`)
- **Branche :** `build/v0.2-a25-v1-manual-refresh-incremental`
- **Décision :** `DEC-0039`
- **Portée :** `F-029` + branchement produit de `F-031`
- **Prérequis :** `TASK-0040 = VERIFIED` (`ACTION-0067`)
- **Hors portée :** `F-030`, `F-032`, W-B/W-C

## But

Faire de **Actualiser** un vrai consommateur du noyau U-B :

`scan complet manuel -> réconciliation -> UpdateBatch minimal -> apply_update_batch`

sans changer la sémantique de **Reconstruire**, qui reste un remplacement
complet explicite.

## A — Audit avant code

Lire en entier :

- `ACTION-0067`;
- `DEC-0039`, `DEC-0038`, `DEC-0010`, `DEC-0009`;
- `TASK-0040`;
- `map/commands.rs::publish_map`;
- `incremental.rs`;
- `index.rs`, `brain_index.rs`, `scanner.rs`;
- `lifecycle.ts`, `MapApp.tsx`, `types.ts`;
- `REQUIREMENTS_BASELINE` F-029.

Auditer spécialement :

- comment reconnaître un Index estampé vs un v3 migré non restampé;
- `built_unix_ms` et autres métadonnées de build;
- `node_diagnostics`;
- le résumé déjà affiché dans l'UI.

Réutiliser le maximum. Ne pas créer un second chemin de vérité pour identité ou
journal.

## B — Réconciliateur complet -> lot minimal

Créer une primitive Rust interne dédiée, nom libre, qui compare le scan complet
à l'Index courant et construit un `UpdateBatch`.

Exigences :

- aucune sérialisation/Tauri;
- aucune stable key hors du cœur;
- aucune heuristique;
- validation bijective `nodes <-> identities`;
- root unique;
- correspondance par stable key uniquement;
- seulement les nœuds nouveaux/changés en upsert;
- toutes les suppressions exactes;
- descendant déplacé/renommé inclus si chemin/profondeur changent;
- PATH_FALLBACK = delete+create;
- parents résolus correctement en `Existing` / `InBatch`;
- root metadata renseignée;
- résultat déterministe;
- no-op si rien d'observable ne change.

Le réconciliateur peut scanner l'Index courant parce que cette opération part
d'un scan manuel complet. Il ne doit pas persister un second catalogue/index.

## C — Câblage de map_refresh

### Index absent

Conserver le chemin full actuel pour la baseline.

Rapport :

`applicationMode = BASELINE_FULL`.

### Index existant, estampé

Après scan réussi :

- dériver le batch minimal;
- appliquer via `apply_update_batch`;
- aucune publication complète;
- résumé = celui du noyau;
- rapport `applicationMode = INCREMENTAL`.

### Index migré mais non estampé

Un seul chemin de restamp complet :

`applicationMode = IDENTITY_RESTAMP_FULL`.

Après ce restamp, une actualisation suivante doit être `INCREMENTAL`.

### Reconstruire

Toujours publication complète explicite :

`applicationMode = EXPLICIT_REBUILD_FULL`.

Une erreur U-B ne doit **jamais** appeler ce chemin automatiquement.

## D — Cohérence des métadonnées

Décider après audit comment conserver correctement :

- `built_unix_ms`;
- `build_complete`;
- source binding;
- `layout_algorithm`;
- `projection_contract`;
- diagnostics.

Ne modifier le noyau TASK-0040 que si une métadonnée nécessaire doit être
écrite atomiquement avec le lot et qu'aucune solution plus étroite n'existe.

Si le noyau est modifié :

- tests TASK-0040 complets obligatoires;
- aucune régression F-031 admise;
- expliquer précisément pourquoi l'extension ne change pas son modèle U-B.

## E — Résumé / UI

Le résumé de changements est déjà affiché : le conserver.

Ajouter seulement le type/DTO `applicationMode` nécessaire à la preuve et, si
utile, un libellé diagnostic discret. Ne pas refaire l'interface.

Prouver :

- actualisation avec changements → résumé exact;
- actualisation no-op → « Aucun changement détecté »;
- aucune fausse création massive;
- filtre NEW/UNSEEN et journal reflètent immédiatement la nouvelle révision;
- sélection/projection rechargées comme aujourd'hui.

## F — Tests produit obligatoires

Au minimum :

1. premier refresh d'un cerveau neuf = BASELINE_FULL;
2. deuxième refresh inchangé = INCREMENTAL + no-op + même révision;
3. création fichier → INCREMENTAL + CREATED;
4. modification → MODIFIED;
5. SYSTEM rename → même id + RENAMED;
6. SYSTEM move → même id + MOVED;
7. rename+move → deux événements selon contrat;
8. PATH_FALLBACK rename → delete+create;
9. création/suppression de sous-arbre;
10. déplacement/renommage dossier avec descendants cohérents;
11. lot mixte;
12. compte child_count exact;
13. filters NEW/UNSEEN exacts après refresh;
14. seen-state antérieur conservé;
15. journal antérieur conservé;
16. no-op n'invalide pas les curseurs/revision;
17. refresh effectif invalide les curseurs liés à revision;
18. v3/v4/v5/v6 migré non estampé → restamp full une fois, puis incremental;
19. Reconstruire = EXPLICIT_REBUILD_FULL;
20. échec U-B ne déclenche pas de rebuild;
21. erreur scan avant application laisse Index/logical state identique;
22. erreur SQL injectée pendant application via le vrai chemin refresh laisse
    Index/journal/révision identiques;
23. deux cerveaux isolés;
24. aucune fuite absolue/stable key/FileId.

## G — Preuve « pas de full replacement sur refresh courant »

Ajouter une preuve qui échoue si `map_refresh` d'un Index estampé repasse par
`publish_with_identity`.

Approches acceptables :

- injection/test hook qui rend le chemin full impossible tout en laissant U-B
  fonctionner;
- instrumentation test-only;
- assertion structurale robuste.

Une simple recherche de texte est insuffisante à elle seule.

## H — Interruption / sûreté F-029

Prouver le critère F-029 :

- scan annulé/incomplet → ancien Index intact;
- erreur entre scan et apply → ancien Index intact;
- erreur pendant apply → rollback intégral;
- aucun instant où l'Index courant est vidé;
- source inchangée.

Utiliser seulement des fixtures synthétiques.

## I — WebView2 réel

Rejeu Windows réel obligatoire car le chemin produit `map_refresh` change.

Scénario minimal :

1. créer cerveau synthétique;
2. premier Actualiser → BASELINE_FULL;
3. second Actualiser inchangé → INCREMENTAL/no-op;
4. mutation disque synthétique externe;
5. Actualiser → INCREMENTAL;
6. résumé visible et exact;
7. journal/NEW/UNSEEN mis à jour;
8. marquer vu puis nouvelle mutation → état réapparaît;
9. Reconstruire → EXPLICIT_REBUILD_FULL;
10. redémarrage réel → Index/journal/seen-state conservés;
11. 0 fuite de chemin absolu/identité système;
12. 0 erreur console fatale.

## J — Validation

- tests ciblés;
- `cargo test --offline`;
- `pnpm test`;
- `pnpm check`;
- `pnpm build`;
- `cargo build --offline`;
- build Tauri debug + WebView2;
- Clippy dette historique vs nouvelle;
- `git diff --check`;
- `scripts/audit-public-readiness.ps1 -AllowRemotes`.

Si le noyau U-B change, rejouer également le banc canonique F-031 ou une preuve
équivalente suffisante pour démontrer qu'aucune régression n'a été introduite.

## Gouvernance

- `TASK-0041 = IMPLEMENTED`, jamais auto-`VERIFIED`;
- aucune TASK-0042;
- aucun watcher;
- aucun W-B/W-C;
- F-032 reste hors portée;
- pas de PR/merge/tag/release;
- docs durables + FEATURE_MATRIX honnêtes;
- `NEXT_ACTION = contrôle indépendant de TASK-0041`;
- push uniquement sur la branche, arbre propre.

## Résultat de l'exécution (2026-09-24)

- **Ce qui existe.** `Actualiser` d'un Index déjà estampé fait maintenant
  `scan complet manuel -> src-tauri/src/reconcile.rs -> UpdateBatch minimal ->
  Index::apply_update_batch` (`BrainIndex::refresh_incrementally`). Jamais
  `publish_with_identity` sur ce chemin. Le noyau `TASK-0040` n'a **pas** été modifié
  (`incremental.rs` : commentaires de tête seulement, aucune ligne de code).
- **Mode d'application** (`MapBuildReport.applicationMode`, fermé, non sensible) :
  `BASELINE_FULL` (aucun Index), `INCREMENTAL`, `IDENTITY_RESTAMP_FULL` (Index legacy sans
  estampille durable), `EXPLICIT_REBUILD_FULL` (Reconstruire). Un échec incrémental est une
  erreur : **aucune bascule** vers l'un des modes complets.
- **Réconciliateur.** Comparaison par clé stable uniquement, un seul passage en flux sur les
  lignes stockées; n'entrent dans le lot que les nœuds nouveaux ou dont une colonne stockée
  change (descendants d'un dossier déplacé / renommé compris); suppressions exactes;
  `PATH_FALLBACK` renommé = suppression + création (la clé change avec le chemin);
  observation de la racine seulement si elle diffère; déterministe; scan sans changement =
  lot vide, **aucun verrou d'écriture**, révision inchangée. Refus avant toute écriture d'un
  scan qui n'est pas une bijection à racine unique, ou dont la racine n'est plus la racine
  indexée (`F-032` : ni devinette ni reconstruction automatique).
- **Preuve « pas de remplacement complet ».** Un garde SQLite refuse d'insérer toute ligne
  dont l'id existe déjà : une publication complète (DELETE puis réinsertion) ne peut pas le
  franchir, le noyau n'insère que des ids neufs. Un test de contrôle montre que le garde
  arrête bel et bien **Reconstruire** et `publish_with_identity`; un test de mutation (l'arm
  incrémental remplacé par la publication complète, étiquette conservée) fait échouer
  22 tests sur les 41 alors écrits (mesure faite avant l'ajout de deux tests).
- **Preuves.** Rust **593 PASS** (550 + 43, tous dans `map/refresh_incremental_tests.rs`, dont
  la parité aléatoire réconciliateur / publication complète; le test de contrat de
  `TASK-0040` sur `commands.rs` est mis à jour, non ajouté); TypeScript **415 PASS** (412 + 3); rejeu WebView2 **réel**
  (`scripts/task0041-webview2.ps1`, un redémarrage réel, 0 erreur fatale, 0 fuite).
- **Décisions à examiner par le contrôle** (détail : `.orchestrator/RESULT.md`) :
  (1) un Index legacy **estampé mais sans liaison de source** (avant `DEC-0033`) est routé
  vers le restamp complet `IDENTITY_RESTAMP_FULL`, car le noyau ne réécrit jamais les
  métadonnées de cerveau et l'Actualiser explicite est précisément ce qui acquiert la
  liaison (`DEC-0033` D); (2) `built_unix_ms` garde l'instant de la dernière **publication
  complète** (aucun lecteur ne s'en sert; l'instant d'une application incrémentale est le
  `detectedUnixMs` de ses événements); (3) racine changée d'identité = refus explicite;
  (4) un Actualiser sans changement **n'avance plus la révision** (`DEC-0039` §6), une date
  de dossier seule l'avance sans événement; (5) `Reconstruire` sans Index = `BASELINE_FULL`.
- **Limites.** Le scan reste complet et le rapport recalcule `reconstructibleDigest` sur tout
  le corpus (`O(corpus)`, `F-029` manuel, hors périmètre du watcher); coût d'un Actualiser
  incrémental sur 100 000 nœuds non mesuré de bout en bout; `PATH_FALLBACK` d'origine
  « en ligne seulement » non fabriqué (jonction Windows réelle testée); aucun crash de
  processus provoqué; le corps des réponses IPC n'est pas lisible par CDP : le mode est lu
  sur l'étiquette que le produit affiche depuis le rapport réel.
