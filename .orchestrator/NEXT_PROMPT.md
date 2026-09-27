# NEXT_PROMPT — TASK-0049 — V1 Reconstructibility & Index-Generation Safety

**TARGET_AGENT:** CODEX
**RECOMMENDED_MODEL:** GPT-5.6 Sol
**RECOMMENDED_EFFORT:** High
**STATUS:** READY
**BRANCH:** `build/v0.2-a33-v1-reconstructibility-closure`

## Objectif unique

Exécute intégralement
`docs/tasks/TASK-0049-v1-reconstructibility-index-generation.md`
selon
`docs/decisions/DEC-0047-reconstructibility-index-generation-boundary.md`.

F-006 seulement. Aucune TASK-0050.

## 0 — préconditions

1. Applique `AGENTS.md` et les instructions Codex du repo.
2. Bascule explicitement sur
   `build/v0.2-a33-v1-reconstructibility-closure`.
3. `git fetch origin`.
4. Synchronise uniquement en fast-forward avec
   `origin/build/v0.2-a33-v1-reconstructibility-closure`.
5. Vérifie arbre propre.
6. Lis :
   - ACTION-0082;
   - ACTION-0083;
   - DEC-0047;
   - TASK-0049;
   - TASK-0031 / DEC-0032;
   - resume_state.rs;
   - brain_index.rs;
   - index.rs;
   - change_journal.rs.
7. Vérifie que TASK-0048/F-005 sont bien VERIFIED et que F-006 reste ouvert.

STOP/BLOCKED si une précondition est fausse.

## 1 — audit avant code

Ne code rien avant d'avoir établi :

- comment un Index frais reçoit son index_id;
- comment next_node_id est alloué;
- comment un rebuild normal conserve les IDs;
- comment un Index frais peut réattribuer les node_id après historique;
- comment resume est sauvegardé/restauré;
- tous les consommateurs de reconstructible_digest et nonReconstructible;
- quels stores hors Index utilisent node_id vs chemin/stable identity.

Écris cette conclusion dans RESULT.

## 2 — génération : réutiliser index_id

Aucun nouveau generation_id.

Le backend doit lier les refs node-scoped du resume à l'index_id sur lequel
elles ont été enregistrées.

Le frontend ne fournit pas une génération qu'il pourrait falsifier si le
backend peut la lire lui-même.

## 3 — resume génération-safe

Même index_id : aucun changement de comportement.

Index_id différent :

- ne jamais valider l'ancien focus/selected par simple exists(node_id);
- corriger/effacer les refs node-scoped avant usage;
- garder view/filter/details si leur contrat ne dépend pas du node id;
- persister la correction.

Record legacy sans génération :

- ne prétends pas que ses IDs sont liés;
- applique la politique sûre de DEC-0047;
- couvre la transition par tests.

Le test le plus important doit démontrer qu'un ancien numéro **existe encore
mais pointe vers un autre chemin** après reconstruction fraîche, et que le
resume ne choisit pas ce mauvais chemin.

## 4 — digest/comparateur inter-génération

L'actuel reconstructible_digest inclut parent_id numérique.

N'en déduis pas qu'il convient à F-006.

Après audit des consommateurs :

- rends la preuve logique indépendante des IDs numériques;
- compare parenté par identité logique/chemin;
- ne change l'ancien digest que si ses consommateurs restent corrects;
- sinon ajoute le plus petit digest/comparateur distinct.

Pas de whole-graph DTO frontend.

## 5 — inventaire nonReconstructible

L'inventaire built_unix_ms seul est périmé.

Audite et classe exactement :

- built_unix_ms;
- index_id;
- revision;
- journal;
- seen/unseen acknowledgements/watermark;
- next_node_id;
- allocation node_id;
- nodes.seen legacy.

Tests exacts et ordre déterministe.

N'ajoute pas à la liste ce qui survit réellement dans catalogue/relations/
content-signals.

## 6 — preuve de perte complète

La suppression de l'Index est **harness-only, processus fermé**.

Aucun bouton ni commande produit de suppression.

Scénario WebView2 obligatoire, trois processus, racine REAL_ROOT générée :

1. construire état + historique + policy + journal/seen + resume;
2. fermer;
3. hors produit, supprimer uniquement Index + sidecars;
4. relancer : Open => NotBuilt;
5. Reconstruire via pipeline existant;
6. nouveau index_id;
7. équivalence corpus/hiérarchie logique;
8. divergence réelle de node_id;
9. resume corrigé, jamais mauvais chemin;
10. journal historique non recréé;
11. policy et stores externes inchangés;
12. source SHA inchangé;
13. troisième relance : correction resume persistée.

Artefact :
`docs/performance/runs/TASK-0049-webview2.json`.

## 7 — scénario d'IDs divergents

Force le cas, ne compte pas sur le hasard :

- source ordonnée a,b,c,d;
- premier Index;
- supprimer a côté harness/test puis appliquer;
- sélectionner un survivant dont l'ancien ID sera réutilisé/décalé dans un
  Index frais;
- prouver le mapping avant/après.

## 8 — journal / seen

Une nouvelle génération établit une nouvelle baseline.

Interdit :

- recréer artificiellement l'ancien journal;
- produire des CREATED/DELETED pour simuler le passé;
- transporter des acknowledgements seen vers des event IDs qui n'existent plus.

Déclare honnêtement cette perte dans nonReconstructible.

## 9 — falsification

Exécute les huit sabotages de TASK-0049 §J.

En particulier, retire temporairement la garde de génération resume et montre
que le test attrape une sélection valide numériquement mais fausse
sémantiquement.

## 10 — non-régression

Préserve :

- F-005 exclusions;
- TASK-0031 rollback;
- F-032 source absente;
- stable identity normal;
- watcher;
- bounded projection 512;
- FR/EN;
- accessibilité;
- relations/content-signals/décisions hors Index.

Pas de refactor opportuniste.

## 11 — validation

Exécute TASK-0049 §K.

Clippy : dette historique séparée.

Audit public obligatoire.

## 12 — gouvernance

À la fin :

- TASK-0049 = IMPLEMENTED, jamais auto-VERIFIED;
- F-006 = IMPLEMENTED, jamais auto-VERIFIED;
- F-014/P-19 inchangés;
- aucune TASK-0050;
- NEXT_ACTION = contrôle indépendant TASK-0049;
- commit + push;
- arbre propre.

RESULT doit contenir :
- audit avant code;
- design de génération resume choisi;
- inventaire reconstructible/non-reconstructible;
- preuve IDs divergents;
- WebView2 3 processus;
- falsifications;
- validations;
- limites;
- HEAD final.
