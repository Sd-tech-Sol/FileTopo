# Action suivante

## Choisir la prochaine tranche de fondation d'échelle

[`TASK-0028`](../tasks/TASK-0028-synthetic-scale-feasibility-spike.md) est
`VERIFIED` comme spike de faisabilité architecturale par
[`ACTION-0045`](../reviews/ACTION-0045-independent-control.md), sans promesse de
performance produit.

L'action unique suivante appartient à l'orchestrateur : **choisir et autoriser
la prochaine tranche de fondation d'échelle avant le materializer produit**.
Le choix doit traiter les coûts dominants révélés par le spike :

- ordre et pagination des enfants compatibles avec un index SQLite;
- sémantique du compte d'agrégat — enfants directs exacts ou total de
  sous-arbre exact/précalculé;
- stratégie de recherche indexée avant toute promesse au-delà de 100k;
- indexation et reconstruction en flux ou par lots, sans `&[NodeDto]` global;
- ensuite seulement materializer, `F-042`/`F-050`/`F-051`, budget de vue
  candidat et replay sur une vraie machine `TARGET_CLASS`.

Ne créer ni `TASK-0029` ni `DEC-0030` sans fiche approuvée et GO. Les quatre
artefacts `TASK-0028` restent non canoniques et non protégés; X5 reste à 36.
