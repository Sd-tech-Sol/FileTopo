# NEXT_PROMPT — TASK-0051 — Approved Relation Revocation / P-04 Closure

**TARGET_AGENT:** CLAUDE CODE
**RECOMMENDED_MODEL:** Claude Sonnet 5.5
**RECOMMENDED_EFFORT:** High
**STATUS:** READY
**BRANCH:** `build/v0.2-a35-v1-approved-relation-revocation`

## Objectif unique

Implémenter intégralement TASK-0051 selon DEC-0049 : toute relation
`APPROVED`, intra ou inter-cerveaux, est révocable; une relation
`DETERMINISTIC` ne l'est jamais.

## Préconditions

1. Applique `AGENTS.md`.
2. Checkout la branche ci-dessus, fetch + fast-forward seulement.
3. Arbre propre.
4. Lis ACTION-0092, DEC-0049 et TASK-0051.
5. Inspecte/réutilise les stores, commandes, panneaux et scénarios existants
   avant d'ajouter une nouvelle brique.

STOP si un invariant gelé contredit l'implémentation actuelle.

## Sémantique obligatoire

Révocation intra et cross, en une transaction :

1. vérifier suggestion existante et `state=approved`;
2. vérifier la ligne APPROVED exactement liée;
3. supprimer cette ligne APPROVED;
4. remettre la suggestion à `pending`;
5. mettre `decided_unix_ms = NULL`.

Aucun nouvel état. `rejected` reste un refus. DETERMINISTIC reste intact.

La réapprobation de la suggestion remise pending doit fonctionner et recréer
exactement une relation.

## Backend/store

Ajouter les primitives minimales et nommées, intra + cross.

Refus nommés et sans changement partiel pour :

- clé inconnue;
- suggestion non approved;
- relation APPROVED absente/incohérente;
- tentative de viser DETERMINISTIC.

Tests au niveau store et commande, y compris rollback.

## Frontend

RelationsPanel et CrossRelationsPanel :

- bouton `Révoquer / Revoke` uniquement sur APPROVED;
- jamais sur DETERMINISTIC;
- état busy explicite;
- activation clavier native;
- après succès, recharger les overviews/panneaux/cartes depuis le backend,
  ne pas décrémenter des compteurs localement.

Réutiliser les systèmes FR/EN et patterns d'approbation existants.

## Preuves

Construire un scénario réel qui couvre :

### Intra

- suggestion pending;
- approbation;
- APPROVED visible;
- révocation par vrai geste clavier;
- relation absente;
- suggestion revenue pending;
- comptes exacts;
- réapprobation;
- exactement une relation revenue.

### Cross

Même cycle sur une suggestion inter-cerveaux.

### Persistance / sécurité

- redémarrage réel après révocation : reste pending;
- rebuild de l'Index : reste pending, pas de relation ressuscitée;
- rerun moteur intra : pas d'auto-réapprobation;
- isolation Alpha/Gamma/cross;
- source et Index inchangés par les gestes de révocation.

## Falsifications

Au minimum :

1. tentative DETERMINISTIC -> refus;
2. clé inconnue -> refus;
3. appeler revoke deux fois -> deuxième refus, aucun drift;
4. sabotage transaction entre DELETE et UPDATE -> rollback intégral;
5. réapprouver deux fois -> aucun doublon;
6. cross revoke ne change aucun store intra;
7. intra revoke ne change aucun autre cerveau/cross.

## Validation

- tests ciblés Rust/frontend;
- suite complète pertinente;
- pnpm check/build;
- Tauri debug;
- WebView2 réel;
- git diff --check;
- audit public.

Ne modifie aucun artefact VERIFIED historique; publie seulement les nouvelles
preuves TASK-0051.

## Gouvernance

À la fin :

- TASK-0051 = IMPLEMENTED / candidate contrôle indépendant;
- P-04 = candidate fermeture, jamais auto-VERIFIED;
- P-19 inchangée;
- aucune TASK-0052;
- NEXT_ACTION = contrôle indépendant TASK-0051;
- RESULT complet;
- commit + push;
- arbre propre.
