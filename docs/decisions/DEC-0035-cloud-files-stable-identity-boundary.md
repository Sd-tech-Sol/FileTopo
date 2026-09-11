# DEC-0035 — Frontière d’identité stable pour les placeholders Cloud Files

- **Date :** 2026-09-11
- **Statut :** `APPROVED`
- **Phase :** V1 — fermeture d’une réserve technique préalable à `TASK-0036`
- **Décideur :** orchestrateur technique ChatGPT, sous la délégation technique déjà consignée dans `AGENTS.md`
- **Fondée sur :** `DEC-0009` I-E, `DEC-0013` F, `DEC-0033`, documentation Microsoft Cloud Filter API citée ci-dessous
- **Supplante :** rien. Cette fiche **ferme la porte technique de `DEC-0013` F par évitement du risque**, sans réécrire `DEC-0009` ni prétendre avoir mesuré l’identité système générique à travers une hydratation.

## Problème

`DEC-0013` F a laissé ouverte une question bloquante : l’identité système générique d’un fichier reste-t-elle la même lorsqu’un fournisseur Cloud Files hydrate ou déshydrate un placeholder ? Cette question devait être fermée avant de persister l’identité et l’état vu/non vu, parce qu’un changement silencieux d’identité pourrait détacher l’état non reconstructible de son objet.

`TASK-0036` a initialement contourné les entrées `online_only` en leur donnant `PATH_FALLBACK`, mais ce n’est pas suffisant : une fois hydraté, le même placeholder peut ne plus porter les attributs `RECALL_*` qui avaient déclenché ce repli, puis passer au chemin `SYSTEM`. Le changement de provenance lui-même recréerait alors un `nodes.id`.

La bonne réponse n’est pas d’inventer la continuité du `FILE_ID_INFO` générique. La bonne réponse est de **ne jamais en dépendre pour un objet que Windows identifie comme placeholder Cloud Files**.

## Décision

### 1. Un placeholder Cloud Files utilise toujours `PATH_FALLBACK`

Sous Windows, avant de tenter l’identité `SYSTEM` générique de `DEC-0009`, FileTopo doit déterminer de façon non destructive si l’entrée est un placeholder géré par la Cloud Filter API.

- si `CfGetPlaceholderInfo(..., CF_PLACEHOLDER_STANDARD_INFO, ...)` réussit, l’entrée est traitée comme **Cloud Files placeholder** et reçoit **toujours** `PATH_FALLBACK`, qu’elle soit hydratée ou déshydratée;
- FileTopo **n’utilise ni le `FileId` CFAPI ni le `FILE_ID_INFO.FileId` générique comme clé stable de ce placeholder** dans le MVP;
- si l’API établit que le fichier n’est pas un placeholder Cloud Files, la voie `SYSTEM = VolumeSerialNumber + FileId 128 bits` de `DEC-0009` reste inchangée;
- si la détection Cloud Files échoue de manière ambiguë alors qu’un risque de placeholder ne peut pas être exclu, choisir le repli conservateur `PATH_FALLBACK` plutôt que tenter une identité système non prouvée.

Il reste donc exactement **deux provenances** : `SYSTEM` et `PATH_FALLBACK`. Aucune troisième provenance, aucune heuristique, aucun identifiant de fournisseur n’est introduit.

### 2. Pourquoi cela ferme `DEC-0013` F

La clé `PATH_FALLBACK` dépend uniquement du **chemin relatif OS brut + type**, selon `DEC-0009` et la correction `ACTION-0057` D3. L’hydratation ou la déshydratation ne fait pas partie de son entrée. Tant que le placeholder garde le même chemin et le même type, son identité FileTopo ne dépend donc d’aucune propriété dont la continuité à travers l’hydratation était inconnue.

Cette décision **ne prétend pas** que `FILE_ID_INFO.FileId` survit à l’hydratation. Elle rend cette réponse inutile au contrat FileTopo : le produit refuse simplement d’utiliser cette identité pour les placeholders Cloud Files.

Un renommage ou déplacement d’un placeholder reste la limite honnête déjà acceptée du `PATH_FALLBACK` : la clé change, et FileTopo ne prétend pas qu’il s’agit automatiquement du même objet.

### 3. Détection sans hydratation

Microsoft documente `CfGetPlaceholderInfo` ainsi :

- l’appel échoue si le fichier n’est pas un Cloud Files placeholder;
- contrairement à la plupart des API Cloud Files prenant un handle, **cet appel ne modifie le fichier d’aucune façon**;
- le handle n’a besoin que de `READ_ATTRIBUTES`;
- `CF_PLACEHOLDER_STANDARD_INFO.FileId` est décrit comme un nombre 64 bits, à portée volume, **non volatile**, identifiant de façon unique un fichier ou dossier.

FileTopo utilise ici les trois premiers faits pour la **détection**. Le quatrième est consigné comme propriété officielle de CFAPI, mais **n’est pas adopté comme clé stable** : `DEC-0013` D impose que toute identité système FileTopo soit une paire avec l’identité du volume, et cette tranche n’a pas besoin d’ajouter une seconde forme de `SYSTEM` pour fermer le risque.

Aucun appel à `CfHydratePlaceholder`, `CfDehydratePlaceholder`, lecture de contenu, téléchargement ou modification de pin/in-sync state n’est autorisé par cette décision.

## Contrat d’implémentation

`TASK-0036` doit donc :

1. auditer si `windows-sys = 0.61.2` déjà retenu expose les bindings Cloud Filter nécessaires avec des features minimales;
2. ajouter une primitive interne de détection Cloud Files, sans DTO ni permission WebView;
3. ouvrir uniquement un handle de métadonnées/`READ_ATTRIBUTES` adapté à `CfGetPlaceholderInfo`;
4. retourner `PATH_FALLBACK` pour tout placeholder Cloud Files détecté, **avant** la tentative `FILE_ID_INFO` générique;
5. conserver `PATH_FALLBACK` sur le même chemin aussi bien pour l’état hydraté que déshydraté par construction;
6. sur erreur ambiguë de détection, préférer le repli sûr plutôt que l’identité `SYSTEM`;
7. ne jamais appeler une API d’hydratation/déshydratation dans le produit ou les tests de cette tâche;
8. ne sérialiser ni état Cloud Files interne, ni `FileId`, ni volume serial vers React/log/artefact.

Si les bindings nécessaires ne peuvent pas être obtenus proprement avec la pile déjà approuvée, l’exécuteur doit s’arrêter et rapporter `BLOCKED` plutôt que choisir une nouvelle caisse ou une API de contenu sans décision.

## Interaction avec la migration

Cette fiche **ne modifie pas** `DEC-0013` B. La baseline de migration reste **M-B** : base quiescée, copie de sûreté de fichier avant mutation, migration transactionnelle en place, restauration si échec. Fermer la porte Cloud Files ne dispense donc pas `TASK-0036` de corriger son chemin `v3 → v4` pour respecter M-B.

## Sources primaires Microsoft

Consultées le **2026-09-11** :

- `CfGetPlaceholderInfo function (cfapi.h)` — Microsoft Learn : https://learn.microsoft.com/en-us/windows/win32/api/cfapi/nf-cfapi-cfgetplaceholderinfo
  - l’appel interroge les caractéristiques d’un placeholder;
  - il ne modifie pas le fichier et ne requiert que `READ_ATTRIBUTES`;
  - il échoue si la cible n’est pas un Cloud Files placeholder.
- `CF_PLACEHOLDER_STANDARD_INFO structure (cfapi.h)` — Microsoft Learn : https://learn.microsoft.com/en-us/windows/win32/api/cfapi/ns-cfapi-cf_placeholder_standard_info
  - `FileId` est documenté comme un identifiant 64 bits, à portée volume, non volatile.
- `CfHydratePlaceholder function (cfapi.h)` — Microsoft Learn : https://learn.microsoft.com/en-us/windows/win32/api/cfapi/nf-cfapi-cfhydrateplaceholder
  - l’hydratation rend la plage demandée présente sur disque **dans le placeholder**.
- `CfDehydratePlaceholder function` — Microsoft Learn : https://learn.microsoft.com/en-us/previous-versions/mt827480(v=vs.85)
  - la déshydratation rend la plage demandée non présente sur disque **dans le placeholder**.

## Limites

- Cette décision ne prouve rien sur un fournisseur qui **n’utilise pas** la Cloud Filter API de Windows. Si FileTopo ne peut pas établir le statut Cloud Files avec la primitive approuvée, il doit rester conservateur et utiliser `PATH_FALLBACK` lorsque le doute subsiste.
- Aucun vrai compte OneDrive/Dropbox/autre, aucun fichier utilisateur et aucun placeholder personnel ne doit être utilisé comme preuve.
- Cette décision ne crée ni watcher, ni journal, ni état `seen` UI, ni logique de déplacement heuristique.

## Verdict de porte

La question de `DEC-0013` F est **fermée pour le contrat V1** non pas en affirmant la stabilité de l’identité générique à travers l’hydratation, mais en supprimant cette dépendance : **un placeholder Cloud Files reconnu ne prend jamais la voie `SYSTEM`; il reste `PATH_FALLBACK` indépendamment de son état d’hydratation.**
