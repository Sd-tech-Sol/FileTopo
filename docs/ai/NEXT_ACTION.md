# Action suivante

## Porte de confidentialité avant la prochaine tranche V1

`TASK-0037 — V1 Change Journal on Manual Refresh` est **VERIFIED** par
[`ACTION-0061`](../reviews/ACTION-0061-independent-control.md).

La prochaine action n’est **pas** `TASK-0038`. Le contrôle indépendant a confirmé
un écart hérité du dépôt : `scripts/audit-public-readiness.ps1 -AllowRemotes`
échoue sur un ancien chemin local absolu déjà présent dans
`docs/ai/VALIDATION.md` (section TASK-0027).

Action unique :

1. nettoyer uniquement les occurrences de chemins utilisateurs absolus / données
   locales similaires dans le **tree courant public**, sans toucher au code produit;
2. conserver le sens historique des preuves en remplaçant la valeur concrète par
   une formulation générique (ex. « racine Git locale »);
3. rejouer `scripts/audit-public-readiness.ps1 -AllowRemotes` jusqu’au vert;
4. documenter honnêtement que ce nettoyage ne réécrit pas l’historique Git déjà
   publié;
5. ne créer aucune TASK-0038 avant contrôle de cette porte.

Le prompt d’exécution est dans `.orchestrator/NEXT_PROMPT.md`.
