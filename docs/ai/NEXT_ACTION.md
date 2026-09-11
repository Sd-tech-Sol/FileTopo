# Action suivante

## TASK-0035 fermée — identité stable avant journal/watchers

`TASK-0035 — V1 Context Panel, Direct Children & Safe Copy` est **VERIFIED dans sa portée** par [`ACTION-0056`](../reviews/ACTION-0056-independent-control.md), sur la livraison `62e13b8cd17d251b8f95f4253357da38457dc799`.

Le prochain verrou MVP est **F-004 — identifiants stables**. Ne pas démarrer le journal de changements, le watcher ni l'application incrémentale avant cette fondation : [`DEC-0010`](../decisions/DEC-0010-indexing-and-watching.md) retient U-B, application différentielle par clé stable, et dit explicitement qu'une clé instable transforme un renommage en suppression + création et rend le journal bruyant.

La stratégie est déjà décidée et éprouvée en spike : [`DEC-0009`](../decisions/DEC-0009-data-model-and-relations.md) retient I-E — identité Windows prouvée quand disponible, empreinte de chemin déterministe/versionnée sinon, heuristique jamais utilisée comme identité. Le banc B3 de `TASK-0012`, déjà `VERIFIED`, a validé sur Rust stable la voie `GetFileInformationByHandleEx(FileIdInfo)` avec `windows-sys 0.61.2`; elle doit être **réutilisée/adaptée**, pas réinventée.

Action unique suivante : `TASK-0036 — V1 Stable Identity Foundation`, sur une branche dédiée. Portée : intégrer l'identité I-E au scanner/Index canonique et préserver l'identité d'un nœud lors d'un renommage/déplacement intra-volume prouvé, sans journal, watcher ni mise à jour incrémentale dans cette tranche.
