# Action suivante

## TASK-0036 — dernière passe corrective avant vérification

`TASK-0036 — V1 Stable Identity Foundation` reste **IMPLEMENTED, pas VERIFIED** sur `build/v0.2-a20-v1-stable-identity`.

Le recontrôle [`ACTION-0058`](../reviews/ACTION-0058-independent-recontrol.md) accepte les corrections D1/D2/D3/R1 d’`ACTION-0057` : migration atteignable par le cycle produit, transition SQL atomique, fallback basé sur le chemin OS brut, et rejeu WebView2 avec Copier le chemin vert.

Le contrôle des décisions applicables a toutefois retrouvé une omission de la spécification orchestrée : [`DEC-0013`](../decisions/DEC-0013-post-risk-gate-technical-arbitration.md) restait normative et n’était pas citée par TASK-0036. Deux points doivent encore être fermés :

1. **D4 — migration M-B.** La migration transactionnelle actuelle doit être précédée d’une quiescence et d’une copie de sûreté de fichier en espace applicatif, avec restauration sur échec, conformément à la baseline M-B de DEC-0013.
2. **D5 — Cloud Files.** [`DEC-0035`](../decisions/DEC-0035-cloud-files-stable-identity-boundary.md) ferme la porte de DEC-0013 F : tout placeholder Cloud Files reconnu reste `PATH_FALLBACK`, hydraté ou déshydraté; `CfGetPlaceholderInfo` sert uniquement à une détection métadonnée non destructive, jamais à hydrater ni à lire du contenu.

Action unique : exécuter la passe corrective décrite dans `.orchestrator/NEXT_PROMPT.md`, sur la **même branche**. Aucun `TASK-0037`, journal, watcher ou incrémental avant un nouveau contrôle indépendant et `TASK-0036 = VERIFIED`.
