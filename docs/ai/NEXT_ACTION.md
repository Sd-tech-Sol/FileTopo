# Action suivante

## Contrôle indépendant final de TASK-0036

`TASK-0036 — V1 Stable Identity Foundation` reste **IMPLEMENTED, pas VERIFIED** sur `build/v0.2-a20-v1-stable-identity`.

Le recontrôle [`ACTION-0059`](../reviews/ACTION-0059-independent-recontrol.md) a accepté D1/D2/D3/R1 et D5 sans réserve, et a confirmé D4 largement corrigé — mais a trouvé un dernier défaut bloquant, D6, dans `BrainIndex::open_existing_migrating` : la copie de sûreté `M-B` était supprimée dès que la migration SQL réussissait, **avant** que `finish_open_existing()` ait validé le contrat canonique v4 complet. Une erreur de validation à cette étape laissait donc le fichier déjà migré en v4, sans copie v3 disponible pour s'en remettre.

**D6 est fermé** : la copie ne disparaît plus qu'après le succès de `finish_open_existing()` elle-même; son échec restaure la copie v3 sur le fichier vivant avant de renvoyer l'erreur de validation (jamais l'erreur de migration); un échec de restauration remonte sa propre erreur claire sans supprimer la copie. `finish_open_existing()` n'a été ni dupliquée ni affaiblie.

Preuve : un test qui corrompt une métadonnée canonique (`build_complete`) que la migration ne touche jamais, de sorte que le DDL réussisse et que seule la validation échoue — confirmé **faux sur le code précédent** (`0daf342f`) par rejeu direct, puis vert après correction. Aucun rejeu WebView2 refait : le chemin heureux est identique avant/après cette passe, et le harnais n'exerce jamais le chemin de refus de validation corrigé — justifié explicitement dans `VALIDATION.md` section BP.4.

Détail complet, preuves et validations : [VALIDATION.md section BP](VALIDATION.md), [HANDOFF.md](HANDOFF.md), [`.orchestrator/RESULT.md`](../../.orchestrator/RESULT.md).

Action unique : un contrôle indépendant **final** de `TASK-0036`, par une instance distincte de l'exécuteur, sur l'ensemble des preuves accumulées (D1 à D6). Ne créer aucune TASK-0037 et ne commencer ni journal, ni watcher, ni incrémental avant `TASK-0036 = VERIFIED`.
