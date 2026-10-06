# ACTION-0092 — Audit V1 après TASK-0050

- **Date :** 2026-10-05
- **Statut :** `CLOSED — prochaine tranche choisie`
- **Base auditée :** `88e71231b3372807253893b2742386b0279bc5bb`
- **Prérequis :** ACTION-0091 / TASK-0050 VERIFIED

## Réconciliation des statuts historiques

Plusieurs lignes `PROPOSED` de la matrice sont périmées :

- `F-017` relations transversales : socle VERIFIED par
  `TASK-0017 / ACTION-0027`;
- `F-018` mise en évidence des liés : livrée et contrôlée avec TASK-0017,
  puis réexercée dans le runtime courant par TASK-0050;
- `F-019` entrantes/sortantes : VERIFIED par TASK-0017 / ACTION-0027;
- `F-040` vue composée multi-cerveaux : VERIFIED par
  `TASK-0019 / ACTION-0031`;
- `F-041` relations inter-cerveaux : VERIFIED par
  `TASK-0020 / ACTION-0032`.

Ces lignes passent à `IMPLEMENTED` dans la matrice. Cela ne ferme pas les
limites explicitement déclarées par leurs tâches.

## Lacune réelle P-04

Le contrat de parité interdit explicitement de rendre une relation approuvée
irrévocable :

> Toute relation approuvée par l'utilisateur est révocable par lui.

Le manque est encore présent et déclaré dans les tâches historiques :

- TASK-0017 : révocation P-04 absente;
- TASK-0018 : toujours absente;
- TASK-0019 : toujours absente;
- TASK-0020 : « Aucune révocation — P-04 révocation demeure ».

Le runtime courant confirme le manque :

- `relation_commands.rs` expose approbation/rejet de suggestion, pas de
  révocation d'une relation APPROVED;
- `RelationsPanel.tsx` n'offre aucun geste de révocation;
- `cross_commands.rs` expose `approve_cross_suggestion`, pas de révocation;
- `CrossRelationsPanel.tsx` n'offre aucun geste de révocation.

## Reuse-first

Le modèle possède déjà tout ce qui permet une révocation sans nouvel état :

- une relation APPROVED est structurellement liée à sa `suggestion_key`;
- une suggestion intra connaît `pending | approved | rejected`;
- une suggestion inter connaît déjà le couple pending/approved nécessaire;
- l'approbation est transactionnelle;
- la suggestion reste la mémoire/identité de la décision.

Décision : **révoquer n'est pas rejeter**. La révocation retire l'approbation
courante et remet la suggestion en `pending`, afin que l'utilisateur puisse
la réapprouver plus tard. Aucun état `revoked` n'est ajouté.

## Priorité

`P-19` reste PARTIELLE, mais il s'agit surtout d'une fermeture de
persistance. La révocation P-04 est une capacité fonctionnelle explicitement
manquante et normative depuis TASK-0017.

## Choix

Prochaine tranche :

**TASK-0051 — V1 Approved Relation Revocation / P-04 Closure**

Périmètre : APPROVED intra + inter-cerveaux, même sémantique, UI FR/EN,
clavier, persistance, isolation et preuve WebView2.

Les relations DETERMINISTIC restent non révocables.

`F-042`, `F-046` et la fermeture générale de `P-19` restent des audits
distincts ultérieurs.
