# TASK-0051 — V1 Approved Relation Revocation / P-04 Closure

- **Date :** 2026-10-05
- **Statut :** `READY`
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
