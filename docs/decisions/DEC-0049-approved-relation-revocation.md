# DEC-0049 — Révocation des relations APPROVED

- **Date :** 2026-10-05
- **Statut :** `APPROVED`
- **Décision issue de :** ACTION-0092
- **Implémentation prévue :** TASK-0051

## Contexte

P-04 exige que toute relation approuvée par l'utilisateur soit révocable.
Les stores intra et inter-cerveaux savent approuver une suggestion, mais
aucun chemin produit ne sait retirer cette approbation.

## Décision

### A — Seules les relations APPROVED sont révocables

Une relation `DETERMINISTIC` provient d'une règle documentée et n'est jamais
supprimée par ce geste utilisateur.

La révocation s'adresse exclusivement à une relation portant
`provenance = APPROVED` et une `suggestion_key` valide.

### B — Révocation = retour à pending

La transition canonique est :

`pending → approved → pending`

Une révocation :

1. supprime exactement la ligne APPROVED liée à la suggestion;
2. remet exactement cette suggestion à `state = pending`;
3. remet `decided_unix_ms = NULL`;
4. ne modifie ni extrémité, ni type, ni producteur, ni identité de suggestion.

Aucun état `revoked` n'est ajouté.

### C — Pourquoi pas rejected

`rejected` signifie que l'utilisateur refuse la suggestion et que la mémoire
doit empêcher sa reproposition. Révoquer une approbation signifie seulement
retirer la relation établie. La suggestion redevient donc en attente et peut
être approuvée à nouveau.

### D — Atomicité

La suppression de la relation et le retour de la suggestion à `pending`
forment une seule transaction. Aucun état intermédiaire observable n'est
acceptable.

La transition est refusée si :

- la suggestion n'existe pas;
- elle n'est pas `approved`;
- la ligne APPROVED correspondante n'existe pas;
- les endpoints/type ne correspondent pas;
- la provenance visée est DETERMINISTIC.

### E — Même règle intra et inter-cerveaux

Les stores intra et cross appliquent la même sémantique. Une relation
inter-cerveaux révoquée ne modifie aucun cerveau, aucun Index et aucune source;
seul le store commun de relations et la suggestion correspondante changent.

### F — UI

Les panneaux intra et inter affichent un contrôle `Révoquer / Revoke`
uniquement pour une relation APPROVED.

Après activation :

- la relation disparaît des établies;
- les comptes entrants/sortants diminuent exactement de 1 aux extrémités;
- la suggestion réapparaît comme pending;
- la carte perd l'arête APPROVED;
- le contrôle reste utilisable au clavier;
- une nouvelle approbation recrée exactement une relation.

### G — Persistance / isolation

La révocation doit survivre :

- à un redémarrage réel;
- à un rebuild de l'Index;
- à un rerun du moteur sans auto-réapprobation.

Une révocation intra d'Alpha ne change ni Gamma ni le store cross. Une
révocation cross ne change aucun store intra.

### H — Invariants

- aucune source analysée modifiée;
- aucune relation DETERMINISTIC supprimée;
- aucune troisième provenance;
- aucune nouvelle dépendance;
- aucune donnée réelle dans les preuves.


## I — Clarification ACTION-0093 : fraîcheur du moteur

La fraîcheur du moteur ne conditionne jamais le droit de retirer une
approbation humaine. Une relation `APPROVED` issue d'une suggestion core reste
une relation humaine et doit rester révocable en `STALE`, conformément à
`DEC-0026 §D`.

La garde STALE reste obligatoire pour **approuver** une suggestion core pending.

Après révocation en STALE, le store revient à `pending`, mais cette sortie
automatique périmée peut rester masquée jusqu'au rerun. L'interface doit alors
conserver un focus sûr, sans prétendre que la suggestion est immédiatement
approuvable.
