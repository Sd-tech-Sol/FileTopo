# TASK-0051 — V1 Approved Relation Revocation / P-04 Closure

- **Date :** 2026-10-05
- **Statut :** `IMPLEMENTED` — candidate au contrôle indépendant (§Exécution)
- **Branche :** `build/v0.2-a35-v1-approved-relation-revocation`
- **Décision :** `DEC-0049`
- **Portée :** `P-04`, `F-017`, régression `F-041`
- **Exécuteur prévu :** Claude Code

## Objectif

Fermer le dernier manque explicitement déclaré de P-04 : toute relation
`APPROVED` créée par une action utilisateur doit pouvoir être révoquée,
intra-cerveau comme inter-cerveaux, sans toucher aux relations
`DETERMINISTIC`.

## Sémantique gelée

`approve → relation APPROVED + suggestion approved`

`revoke → relation supprimée + suggestion pending`

`reapprove → exactement une relation APPROVED`

Aucun état `revoked`. Une révocation n'est pas un rejet.

## Critères R1–R12

| ID | Critère |
|---|---|
| R1 | Store intra : révocation transactionnelle, relation APPROVED supprimée + suggestion `approved→pending`, `decided_unix_ms=NULL`. |
| R2 | Store cross : même transition transactionnelle. |
| R3 | Une relation DETERMINISTIC ne peut jamais être révoquée par ce chemin. |
| R4 | Suggestion inconnue, pending/rejected ou relation APPROVED incohérente : refus nommé, aucun changement partiel. |
| R5 | Révoquer puis réapprouver produit exactement une relation, jamais doublon. |
| R6 | Les comptes/panneaux intra sont exacts avant/après; l'arête disparaît puis revient après réapprobation. |
| R7 | Même preuve pour une relation inter-cerveaux. |
| R8 | UI FR/EN : contrôle Révoquer/Revoke visible uniquement sur APPROVED, atteignable et activable au clavier. |
| R9 | Redémarrage réel : la révocation reste pending; aucune auto-réapprobation. |
| R10 | Rebuild/rerun moteur : relation révoquée ne revient pas sans nouvelle approbation explicite. |
| R11 | Isolation : intra Alpha n'altère ni Gamma ni cross; cross n'altère aucun store intra. |
| R12 | Source/Index inchangés; tests, WebView2 réel, audit public, aucune régression des preuves relations historiques. |

## Frontière

Ne pas :

- modifier la signification de `rejected`;
- ajouter un état de suggestion;
- rendre DETERMINISTIC supprimable;
- créer une relation sans suggestion;
- modifier les sources analysées;
- mélanger P-19 ou une autre fonction à cette tranche.

## Preuve attendue

Un scénario WebView2 réel doit exercer au minimum :

1. APPROVED intra visible;
2. révocation clavier;
3. relation absente + suggestion pending + comptes exacts;
4. réapprobation clavier;
5. relation revenue exactement une fois;
6. même cycle inter-cerveaux;
7. redémarrage réel après une révocation;
8. rebuild/rerun sans résurrection automatique.

Le contrôle indépendant est obligatoire avant tout `VERIFIED`.

## Exécution — 2026-10-05 — `IMPLEMENTED`

Exécuteur : Claude Code (Sonnet 5.5). Branche
`build/v0.2-a35-v1-approved-relation-revocation`. Commits produit :
`d5b4880` (implémentation) et `14a821d` (tests de données hostiles). HEAD testé
par la preuve WebView2 : `14a821d9cfc690ad4365fc7572bc455edc7144d4` (le produit y
est identique à `d5b4880`).

### Ce qui a été construit

- **Stores** — `RelationStore::revoke(Provenance, suggestion_key)` et
  `CrossRelationStore::revoke(CrossProvenance, suggestion_key)`. Une
  transaction : lecture/vérification, `DELETE` de la ligne `APPROVED` exactement
  liée, puis `UPDATE … SET state='pending', decided_unix_ms=NULL`. Chaque
  instruction est gardée (un nombre de lignes inattendu abandonne la
  transaction, qui s'annule à la fermeture). Aucun nouvel état, aucune migration
  de schéma, aucun nouveau trigger.
- **Refus nommés** (intra / inter) : `…_revocation_of_deterministic`,
  `…_unknown_suggestion`, `…_revocation_suggestion_not_approved`,
  `…_revocation_relation_inconsistent`, `…_unknown_provenance`. La provenance
  visée est un paramètre explicite : une relation `DETERMINISTIC` est refusée
  **avant** toute lecture du store.
- **Commandes** — `relation_commands::revoke_relation`,
  `cross_commands::revoke_cross_relation`, commandes Tauri
  `map_relations_revoke(brainId, provenance, suggestionKey)` et
  `map_cross_relations_revoke(provenance, suggestionKey)`. Elles renvoient
  l'overview complet relu du store. Intra : même politique de péremption que
  l'approbation (une suggestion du moteur dont l'analyse est périmée n'est pas
  révocable : « relancer l'analyse »). Inter : ne touche que le store commun.
- **DTO** — `NodeRelationEntry.suggestionKey` (additif) : identité qu'une
  révocation nomme. `RelationsSelfCheck.revokedSinceSeed` (additif) : le tableau
  gelé de TASK-0017 comptait les quatre approbations du seed; une approbation
  du seed révoquée retire une arête de l'attendu, et le dit, sans faire échouer
  `counts_agree`.
- **Frontend** — bouton `Révoquer <clé>` / `Revoke <clé>` dans
  `RelationsPanel` et `CrossRelationsPanel`, **uniquement** sur une entrée
  `APPROVED` qui nomme sa suggestion; `<button type="button">` natif, état occupé
  explicite (`aria-busy`, libellé `Révocation…` / `Revoking…`), nom accessible
  complet côté inter-cerveaux. Après succès, l'overview renvoyé remplace celui du
  cerveau (ou du store commun) : panneaux, arêtes de la carte et file de
  révision sont relus, **aucun compteur n'est décrémenté localement**.
- **Focus** — `restoreFocus.ts` : après la révocation et le rechargement du
  panneau, le focus va au contrôle d'approbation **de la même suggestion**.
  Découverte en preuve réelle : sans cela le focus atterrissait sur le bouton
  « Révoquer » **d'une autre relation** (le hook générique de TASK-0047 retrouve
  « le même contrôle » par `data-testid` partagé) — un Entrée de plus aurait
  révoqué une relation non choisie. Les boutons intra n'ont donc **plus de
  `data-testid` partagé** (`data-relation-revoke=<clé>`), et le focus est placé
  explicitement. Le hook de TASK-0047 est inchangé.

### Critères R1–R12

| ID | Verdict | Preuve |
|---|---|---|
| R1 | PASS | `relations::tests::revoking_deletes_the_approved_relation_and_returns_the_suggestion_to_pending`, `a_failure_between_the_delete_and_the_update_rolls_everything_back` (sabotage par trigger sur l'`UPDATE` : relation et état intacts) |
| R2 | PASS | idem côté `cross_relations::tests::*` |
| R3 | PASS | `revoking_a_deterministic_relation_is_refused_and_changes_nothing` (4 clés, digest déterministe inchangé), commandes, IPC réel |
| R4 | PASS | clé inconnue, `pending`, `rejected`, relation absente, relation au type altéré : refus nommé, instantané des trois tables identique |
| R5 | PASS | `revoking_then_approving_again_yields_exactly_one_relation`, commande, IPC réel (`secondApprove` refusé) |
| R6 | PASS | commande + WebView2 : intra 8/4/4 → 8/5/3 → 8/4/4 → 8/5/3 relus du backend; arête `intra-approved` → `intra-suggestion` → `intra-approved`; entrantes du nœud 1 → 2 → 1 → 2 |
| R7 | PASS | idem inter : 6/0/4 → 6/1/3 → 6/0/4 → 6/1/3, arête `inter-approved` ↔ `inter-suggestion` |
| R8 | PASS | Vitest (visible seulement sur `APPROVED`, y compris donnée hostile; natif; occupé; FR/EN) + WebView2 : vrai **Tab** sur le contrôle, **Entrée** pour révoquer, **Espace**/**Entrée** pour réapprouver; axe 0 violation avec le contrôle à l'écran |
| R9 | PASS | WebView2 : fermeture normale puis relance réelle; Alpha `S-005` et `XB-S02` restent `pending`; lecteur externe (python, produit fermé) concordant |
| R10 | PASS | rebuild réel des deux Index (`map_rebuild`) puis rerun du moteur par le bouton produit : rien ne revient; store-level : `rule_engine::a_revoked_core_approval_is_not_reapproved_by_a_rerun` |
| R11 | PASS | commande + WebView2 : Gamma (qui a **sa propre** approbation de la même clé `S-005`) et store commun inchangés par une révocation Alpha; stores intra inchangés par une révocation inter |
| R12 | PASS (limites ci-dessous) | empreintes source + Index inchangées autour des gestes (produit et lecteur externe); suites Rust/Vitest complètes vertes; audit public |

### Falsifications

Exigées par le prompt : (1) DETERMINISTIC → refus; (2) clé inconnue → refus;
(3) double révocation → second refus sans dérive; (4) sabotage entre `DELETE` et
`UPDATE` → rollback intégral; (5) double réapprobation → aucun doublon; (6) la
révocation inter ne change aucun store intra; (7) la révocation intra ne change
aucun autre cerveau ni le store commun. Toutes couvertes au niveau store,
commande et IPC réel, intra et inter.

Mutations du produit (appliquées, observées en échec, restaurées par
`git checkout`) : garde DETERMINISTIC retirée → 2 tests rouges; `DELETE`
commité avant l'`UPDATE` → le test de sabotage rouge; `decided_unix_ms` non remis
à `NULL` → 3 rouges; état laissé `approved` côté inter → 9 rouges; bouton
affiché pour toute provenance → 1 rouge (inter), puis, après ajout du cas de
donnée hostile, 1 rouge (intra). **Preuve réelle falsifiée** : le backend saboté
(état laissé `approved`) fait échouer la preuve WebView2 réelle
(`timeout: S-005 revoked`), puis restauré, reconstruit et rejoué : PASS.

### Validations

- `cargo test` : 798 passés, 0 échec, 6 ignorés (préexistants).
- `pnpm test` : 654 / 654 (43 fichiers); `pnpm check`; `pnpm build`; Tauri
  debug (`pnpm tauri build --debug --no-bundle`); `git diff --check`.
- WebView2 réel : `scripts/task0051-webview2.ps1`, deux processus autour d'un
  redémarrage réel; artefact `docs/performance/runs/TASK-0051-webview2.json`
  (`headTested` = `14a821d9…`).
- Audit public : `scripts/audit-public-readiness.ps1 -AllowRemotes`.

### Non testé / limites

- Redémarrage **brutal** pendant une révocation (kill) : non testé; l'atomicité
  est prouvée par le test de rollback au niveau store, pas par un crash réel.
- `brain-beta` (`deep`) non construit dans la preuve réelle : aucune relation de
  la preuve ne le touche. Le cycle inter-cerveaux réel utilise `XB-S02`
  (Gamma → Alpha, deux fichiers de racine).
- Une suggestion du **moteur** (`dre-v1`) révoquée puis un rerun : prouvé au niveau
  store (`rule_engine`), pas par un geste réel — le moteur ne produit aucune
  suggestion sur la fixture synthétique d'Alpha (compte inchangé après rerun).
- La révocation d'une relation du moteur dont l'analyse est périmée est
  **refusée** (politique d'approbation reprise); non exercée en WebView2.
- Aucune preuve historique VERIFIED n'est modifiée ni rejouée (TASK-0047,
  TASK-0050, etc.). `cargo clippy` : avertissements préexistants inchangés,
  `-D warnings` non exigé ici; `cargo fmt` non appliqué (écarts préexistants).
- Axe : 0 violation; 1 `incomplete` (TASK-0050 en avait 1, `color-contrast`;
  l'identifiant n'est pas relevé dans cette preuve).
- **P-19 inchangée** (PARTIELLE) : seule la persistance d'une révocation est
  revendiquée. Aucune TASK-0052.

**TASK-0051 = IMPLEMENTED**, candidate au contrôle indépendant. P-04 =
candidate à la fermeture, **jamais auto-`VERIFIED`**.
