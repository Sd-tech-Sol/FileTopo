# Action suivante

## Nouveau contrôle indépendant de TASK-0055

Branche : `build/v0.2-a39-v1-physical-identity-closure`.

HEAD à contrôler : voir `.orchestrator/RESULT.md`. Le code **et** l'artefact
WebView2 sont au même commit; seuls des documents ont changé après lui.

Tâche :
`docs/tasks/TASK-0055-v1-physical-identity-closure.md`, **§17** pour le
correctif.

Décision :
`docs/decisions/DEC-0052-node-vs-physical-identity.md`.

Premier contrôle :
`docs/reviews/ACTION-0103-task0055-independent-control.md` — verdict
`REWORK REQUIRED`, dont les deux points sont fermés.

Preuves :
`docs/ai/VALIDATION.md` sections **DK** (tranche) et **DM** (correctif),
`docs/performance/runs/TASK-0055-webview2.json`.

`TASK-0055` et `F-046` sont **`IMPLEMENTED` / candidates**. L'exécuteur ne
s'attribue pas `VERIFIED` : le verdict appartient à une instance distincte, sur
preuves.

À examiner en priorité, parce que c'est là que la défense pourrait encore être
trop faible ou la sémantique encore fausse :

1. l'**audit structurel d'identité** de `physical_identity_tests` : c'est une
   liste épinglée de fichiers autorisés à lire `stable_key` /
   `identity_provenance`. Il attrape un nouveau lecteur; il n'attraperait pas une
   valeur dérivée que l'un des huit fichiers privilégiés publierait lui-même.
   Chercher s'il existe une troisième surface publique que les deux tests
   d'influence ne couvrent pas;
2. `incremental.rs` — la garde de groupe partagé : vérifier qu'elle ne redevient
   pas une politique, que `DEC-0052` D1 reste exacte, et que le `relative_path`
   dont elle dépend est bien vérifié contre la chaîne de parents avant toute
   écriture;
3. `brain_index.rs::reconstructible_digest` — que l'ordre par **tous** les champs
   digérés soit réellement déterministe, et que `H7` prouve encore ce qu'il doit
   prouver après le retrait des deux colonnes;
4. `scope.rs::reconcile_scopes` — la complétion de l'image d'un groupe de clé
   partagée dans une lecture partielle, toujours prouvée sur deux topologies
   seulement.

Aucune `TASK-0056` n'est créée. Après ce contrôle, `ACTION-0102` §9 demande un
audit V1 final avant toute nouvelle fonctionnalité.
