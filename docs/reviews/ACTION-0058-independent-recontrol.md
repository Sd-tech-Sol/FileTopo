# ACTION-0058 — Nouveau contrôle indépendant de TASK-0036

- Date : 2026-09-11
- Statut : `OPEN / RECONTROL REQUIRED`
- Tâche : `TASK-0036 — V1 Stable Identity Foundation`
- Branche contrôlée : `build/v0.2-a20-v1-stable-identity`
- Livraison corrective contrôlée : `48cee3f34fac9ea569e7f358a4dd4dad43bbf65d`
- Livraison fonctionnelle précédente : `e603e9dfc75d643388ac67babfd6baced8c32df6`
- Exécuteur : Claude Code / Sonnet 5
- Autorité du verdict : orchestrateur ChatGPT indépendant
- Verdict : **TASK-0036 reste IMPLEMENTED; pas VERIFIED**

## Résultat du recontrôle d’ACTION-0057

Les quatre points demandés par [`ACTION-0057`](ACTION-0057-independent-control.md) sont techniquement fermés dans la livraison `48cee3f` :

1. **D1 fermé — migration atteignable par le produit.** `open_for_brain()` détecte exactement le schéma précédent, passe par `BrainIndex::open_existing_migrating()`, et cette voie vérifie `brain_id` puis le binding source avant toute mutation. Un schéma futur/inconnu et les mismatches sont refusés sans migration ni lecture de source. `map_open` garde `sourceRead=false`.
2. **D2 fermé dans sa portée locale — transition SQL atomique.** Les deux `ALTER TABLE`, l’index d’unicité, `next_node_id` et les versions vivent dans une transaction unique; un échec réel après modification de schéma prouve le rollback vers le v3 initial.
3. **D3 fermé — fallback sur chemin OS brut.** `path_fallback_key(&Path, kind)` hash `path_codec::encode_path(relative)`, jamais `to_string_lossy()`. Le test Windows à surrogates isolés couvre précisément l’ambiguïté précédente.
4. **R1 fermé — copie de chemin.** Le rejeu WebView2 frais donne `copyStillSucceeds=true`, `copyFailureReason=null`, 0 erreur console fatale.

Le durcissement supplémentaire de la bijection `nodes ↔ identities` est également acceptable : une liste manquante/étrangère/dupliquée est refusée avant publication au lieu de pouvoir atteindre un `expect()`.

## Pourquoi le verdict reste ouvert

Le contrôle complet des décisions applicables a révélé que la fiche initiale `TASK-0036` — rédigée par l’orchestrateur — avait omis [`DEC-0013`](../decisions/DEC-0013-post-risk-gate-technical-arbitration.md). C’est une **erreur d’orchestration**, pas une dissimulation ni un écart volontaire de l’exécuteur. Deux contraintes de cette décision sont encore normatives et n’ont été supplantées par aucune décision ultérieure jusqu’à `DEC-0034`.

## D4 — la migration corrigée ne respecte pas encore la baseline M-B de DEC-0013

`DEC-0013` B a renversé l’ancienne préférence de `DEC-0011` après le banc B1 : **M-B est la baseline**. Le contrat est :

1. quiescer la base;
2. prendre une **copie de sûreté de fichier** dans l’espace applicatif **avant la première mutation**;
3. effectuer la migration transactionnelle en place;
4. restaurer la copie si la migration échoue.

La livraison actuelle remplit le point 3, mais ne crée aucune copie de sûreté et n’a aucun chemin de restauration. Le rollback SQLite protège des échecs transactionnels; il ne remplace pas la baseline M-B arrêtée après le banc de risque.

### Correction exigée

La voie produit `v3 → v4` doit appliquer M-B sans lire la source : validation brain/binding d’abord, quiescence, checkpoint/traitement WAL nécessaire, copie de fichier sûre en espace applicatif, migration transactionnelle, restauration sur échec, puis validation canonique. Un échec de quiescence/copie doit refuser la migration et laisser l’index v3 intact.

Preuves minimales :

- un v3 WAL avec données committées est copié seulement après quiescence/checkpoint et la copie est ouvrable comme v3;
- la copie existe avant la première mutation de schéma;
- un échec injecté après la copie restaure l’index précédent intégralement;
- mismatch/future schema ne crée aucune copie et ne mute rien;
- échec de quiescence/busy => refus sans migration;
- `map_open` reste `sourceRead=false`.

## D5 — la porte Cloud Files de DEC-0013 F doit être fermée explicitement

`DEC-0013` F avait laissé ouverte la continuité de l’identité système à travers hydratation/déshydratation et l’avait élevée au rang de **porte avant identité persistante / seen-unseen**. L’implémentation initiale évite `SYSTEM` pour `online_only`, mais cela n’est pas suffisant : un placeholder hydraté peut cesser d’être détecté uniquement par les attributs `RECALL_*`, puis entrer dans la voie `SYSTEM`; sa clé/provenance FileTopo changerait alors même si le chemin n’a pas changé.

L’orchestrateur ferme maintenant cette porte par [`DEC-0035`](../decisions/DEC-0035-cloud-files-stable-identity-boundary.md), sur documentation Microsoft officielle : **tout placeholder Cloud Files reconnu reste `PATH_FALLBACK`, hydraté ou non.** `CfGetPlaceholderInfo` est utilisé uniquement comme détection métadonnée; Microsoft documente que cet appel ne modifie pas le fichier et n’exige que `READ_ATTRIBUTES`. FileTopo ne dépend donc plus de la réponse inconnue « le FILE_ID_INFO générique survit-il à l’hydratation ? ».

### Correction exigée

Implémenter `DEC-0035` sans nouvelle provenance :

- détecter Cloud Files avant toute tentative `SYSTEM`;
- placeholder détecté => `PATH_FALLBACK` dans tous ses états;
- aucun `CfHydratePlaceholder`, `CfDehydratePlaceholder`, lecture de contenu ou modification du placeholder;
- erreur de détection ambiguë => repli conservateur, jamais identité système affirmée au hasard;
- auditer d’abord `windows-sys 0.61.2`; ne pas choisir une nouvelle dépendance sans nécessité démontrée;
- preuves synthétiques seulement, aucun compte/fichier cloud personnel.

## Ce qui reste acquis de TASK-0036

Le recontrôle ne remet pas en cause :

- `SYSTEM = VolumeSerialNumber + FileId 128 bits` pour les objets locaux éligibles non Cloud Files;
- remap vers `nodes.id` canonique;
- maintien des IDs au rename/move intra-volume prouvé;
- remap de `parent_id`;
- `seen` conservé pour une identité SYSTEM reconnue;
- compteur monotone sans recyclage;
- isolation entre cerveaux;
- fallback raw-path corrigé;
- aucune clé stable/chemin absolu dans les DTO;
- suites Rust/TypeScript et rejeu WebView2 rapportés par l’exécuteur.

## Recontrôle final exigé

La prochaine passe reste **TASK-0036 sur la même branche**. Elle doit fermer D4 et D5, rejouer les garanties déjà acquises, et rester hors journal/watcher/incrémental. Aucun `TASK-0037` avant un nouveau contrôle indépendant.

## Verdict

**TASK-0036 = IMPLEMENTED / RECONTROL REQUIRED.** Les corrections d’`ACTION-0057` sont acceptées; le blocage restant vient de contraintes antérieures que la spécification orchestrée avait omises. `VERIFIED` exige désormais conformité à M-B et à `DEC-0035`.
