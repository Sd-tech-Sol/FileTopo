# ARCHITECTURE_BASELINE — Synthèse d'architecture de reconstruction

- **Date :** 2026-08-31
- **Tâche :** `TASK-0011`, livrable `L3`
- **Portée couverte :** points 5 à 10 et 15 de `TASK-0011` §7.1
- **Statut :** livrable `L3`, **APPROUVÉ** — approuvé par Sébastien le 2026-08-31 (porte P2 franchie). Livrable documentaire; **rien n'a été exécuté ni mesuré : non testé physiquement**
- **Nature :** synthèse écrite. **Aucun code, aucun build, aucune mesure.
  Non testé.**

Ce document relie modèle de données, indexation, surveillance, exclusions,
relations, cerveaux multiples et migrations. Il **ne tranche pas** : chaque
question ouverte renvoie à une fiche `DEC-0007` à `DEC-0012`, toutes
`PROPOSED`. Il ne remplace pas
[phase-2-architecture.md](phase-2-architecture.md), qui reste le document
historique `VERIFIED` de la conception à un million de nœuds en relief.

> **Amendement par renvoi du 2026-09-06 — `DEC-0029`, réalignement
> d'architecture à grande échelle.**
>
> **Rien de cette baseline n'est retiré, réécrit ni invalidé.** Ses
> contraintes, ses invariants et sa §2 restent en vigueur tels quels — en
> particulier l'**IPC étroit, typé, validé, en identifiants seulement**,
> l'**invariant structurel** de la flèche unidirectionnelle en métadonnées
> seules vers la racine analysée, et la politique de §6.3 sur les fichiers en
> ligne seulement.
>
> **Ce qui s'y ajoute** est une **frontière d'échelle**, écrite dans
> [`PROGRESSIVE_SCALE_ARCHITECTURE.md`](PROGRESSIVE_SCALE_ARCHITECTURE.md) et
> décidée par
> [`DEC-0029`](../decisions/DEC-0029-progressive-materialization-and-scale-boundary.md) :
> **FileTopo indexe grand, matérialise petit, et ne rend que le contexte
> utile.**
>
> La §2 de ce document décrit **le cœur privilégié et l'interface**. Elle
> reste exacte, et elle est désormais **complétée** par une chaîne interne
> plus fine entre le cœur et l'interface : index complet → graphe logique →
> **query engine borné** → **progressive materializer** → sous-graphe et
> agrégats → **layout de cette vue seulement** → **renderer borné**. La
> « Disposition hiérarchique déterministe » du cœur s'applique **à la vue
> matérialisée**, plus au corpus entier, et le frontend **ne reçoit jamais un
> whole-graph JSON**.
>
> `MAX_NODES_PER_MAP = 5_000` — `src-tauri/src/map/mod.rs` — est une **limite
> de tranche historique**, **pas une limite produit de corpus**. Elle est
> **inchangée** par `TASK-0027`, qui est documentaire, et destinée à être
> remplacée par un **budget de matérialisation et de remplissage de vue**.
>
> **Aucun renderer n'est choisi**, **aucun schéma SQLite n'est défini**,
> **aucune API n'est figée** et **aucune dépendance n'est ajoutée** par cet
> amendement. **Graphify n'est pas intégré** — `DEC-0029` G. **Forge reste un
> projet distinct** — `DEC-0029` H. **Non testé, non mesuré :** les niveaux
> 10 000, 100 000 et 1 000 000 sont des **cibles de validation futures**, et
> les budgets de [phase-2-architecture.md](phase-2-architecture.md) restent
> des **hypothèses et critères de rejet historiques**, jamais des résultats.
> La réserve `R8` demeure entière.

---

## 1. Contraintes officielles qui structurent tout le reste

Ce sont des **faits**, chacun issu d'une source primaire consultée le
2026-08-31. Ils précèdent toute décision parce qu'ils la contraignent.

| # | Fait établi par une source officielle | Source | Conséquence architecturale |
|---|---|---|---|
| C1 | Quand le tampon de notification déborde, `ReadDirectoryChangesExW` « return **true**, but the entire contents of the buffer are discarded and the *lpBytesReturned* parameter will be zero ». Dans ce cas « you should compute the changes by enumerating the directory or subtree ». | [MS ReadDirectoryChangesExW](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-readdirectorychangesexw) | La perte d'événements est un **comportement documenté et normal**, pas une panne. La réconciliation par réénumération est obligatoire, pas optionnelle. |
| C2 | La fonction échoue avec `ERROR_NOTIFY_ENUM_DIR` « when the system was unable to record all the changes to the directory ». | idem | Deuxième chemin de perte, à traiter identiquement à C1. |
| C3 | « **ReadDirectoryChangesExW** is currently supported only for the NTFS file system », et échoue avec `ERROR_INVALID_PARAMETER` si le tampon dépasse 64 Kio sur un répertoire réseau. | idem | La surveillance ne peut pas être supposée disponible partout. Un cerveau sur un système de fichiers non NTFS doit dégrader vers le parcours périodique, sans se déclarer « à jour ». |
| C4 | `FILE_ID_INFO` combine `VolumeSerialNumber` et un `FileId` 128 bits; « The file identifier and the volume serial number uniquely identify a file on a single computer ». | [MS FILE_ID_INFO](https://learn.microsoft.com/en-us/windows/win32/api/winbase/ns-winbase-file_id_info) | C'est la meilleure identité disponible — mais **par ordinateur**, pas universelle. |
| C5 | En Rust stable, `std::os::windows::fs::MetadataExt` expose `file_attributes`, `creation_time`, `last_access_time`, `last_write_time`, `file_size`; `volume_serial_number()`, `file_index()`, `number_of_links()` et `change_time()` sont **`nightly-only`** et renvoient `None` si la métadonnée vient de `DirEntry::metadata`. | [Rust std MetadataExt (Windows)](https://doc.rust-lang.org/std/os/windows/fs/trait.MetadataExt.html) | **Contradiction avec une hypothèse du projet** : `DEC-0003` impose Rust **stable**, et `DEC-0004` fait de l'identité de volume + identifiant de fichier la clé stable préférée. Sur stable, cette clé n'est **pas** accessible par la bibliothèque standard. Voir §3 et [DEC-0009](../decisions/DEC-0009-data-model-and-relations.md). |
| C6 | `FILE_ATTRIBUTE_RECALL_ON_OPEN` « only appears in directory enumeration classes »; `FILE_ATTRIBUTE_RECALL_ON_DATA_ACCESS` signifie que le contenu « is not fully present locally » et que lire le fichier « will cause at least some of the file/directory content to be fetched from a remote store ». | [MS File Attribute Constants](https://learn.microsoft.com/en-us/windows/win32/fileio/file-attribute-constants) | Détecter « en ligne seulement » exige l'énumération de répertoire, pas une interrogation par fichier. Toute lecture de contenu est un déclencheur d'hydratation. |
| C7 | Il est « recommended that all minifilters shouldn't issue reads/writes on files that have `FILE_ATTRIBUTE_RECALL_ON_DATA_ACCESS` set », toute lecture causant « unnecessary hydration when no user application has requested the file data ». | [MS Handling placeholders](https://learn.microsoft.com/en-us/windows-hardware/drivers/ifs/placeholders_guidance) | Interdiction absolue, au MVP, de lire le contenu, de calculer une empreinte ou de produire une miniature d'un espace réservé. |
| C8 | Un point de réanalyse porte `FILE_ATTRIBUTE_REPARSE_POINT`; limite de 63 points de réanalyse sur un chemin donné (31 si le point cible un chemin pleinement qualifié). | [MS Reparse Points](https://learn.microsoft.com/en-us/windows/win32/fileio/reparse-points), [File Attribute Constants](https://learn.microsoft.com/en-us/windows/win32/fileio/file-attribute-constants) | Le non-suivi par défaut protège des cycles; la limite système fournit une borne de sûreté supplémentaire. |
| C9 | `fs::symlink_metadata` « queries the metadata about a file without following symlinks ». | [Rust std symlink_metadata](https://doc.rust-lang.org/std/fs/fn.symlink_metadata.html) | Le mécanisme de non-suivi déjà employé par le prototype (`src-tauri/src/scanner.rs:50`) est le bon; il est conservé. |
| C10 | `MAX_PATH` vaut 260; les chemins étendus jusqu'à 32 767 caractères exigent le préfixe `\\?\`, **et** la valeur de registre `LongPathsEnabled=1`, **et** l'élément de manifeste `longPathAware`. « Because you cannot use the `\\?\` prefix with a relative path, relative paths are always limited to a total of **MAX_PATH** characters. » | [MS Maximum Path Length Limitation](https://learn.microsoft.com/en-us/windows/win32/fileio/maximum-file-path-limitation) | Les chemins longs ne « marchent » pas par défaut : ils exigent une action de l'application **et** une configuration de la machine. Un chemin trop long est un diagnostic attendu, pas un bogue. |
| C11 | WAL : « All processes using a database must be on the same host computer; WAL does not work over a network filesystem. » Un seul écrivain, lecteurs concurrents; les longues transactions de lecture peuvent affamer le checkpoint. | [SQLite WAL](https://www.sqlite.org/wal.html) | WAL reste utilisable pour un index local dans l'espace applicatif, jamais pour un index qui serait placé sur un partage réseau. |
| C12 | `PRAGMA user_version` est « entirely application-defined »; `integrity_check` détecte la corruption mais **pas** les erreurs de clé étrangère (`foreign_key_check`); `quick_check` est en O(N) contre O(N log N). | [SQLite PRAGMA](https://www.sqlite.org/pragma.html#pragma_user_version) | Le versionnement de schéma et la détection de corruption ont des primitives officielles; leurs limites sont connues et doivent être écrites. |
| C13 | L'API de sauvegarde en ligne produit « a bit-wise identical copy of the source database as it was when the copying commenced »; une écriture concurrente externe « usually restarts the backup process », et « if the backup process is restarted frequently enough it may never run to completion ». | [SQLite Online Backup API](https://www.sqlite.org/backup.html) | La copie de sûreté avant migration doit être faite **pendant une fenêtre sans écriture applicative**, sinon elle peut ne jamais aboutir. |
| C14 | PixiJS 8 : le renderer WebGL est « ✅ Recommended », WebGPU est « 🚧 Experimental », et un renderer Canvas est listé « ❌ Coming-soon ». | [PixiJS 8 renderers](https://pixijs.com/8.x/guides/components/renderers) | **Il n'existe pas de repli Canvas 2D dans PixiJS 8.** Une machine sans WebGL utilisable n'a donc aucun rendu Pixi. Voir [DEC-0008](../decisions/DEC-0008-hierarchical-rendering.md). |
| C15 | `getContext()` « Returns null if contextId is not supported ». Les auteurs « must also provide content that, when presented to the user, conveys essentially the same function or purpose as the canvas's bitmap ». | [WHATWG HTML — Canvas](https://html.spec.whatwg.org/multipage/canvas.html) | Le repli sans GPU n'est pas une option de confort : c'est la conséquence normative d'un `getContext` pouvant renvoyer `null`, et le contenu alternatif est exigé par la spécification. |
| C16 | Tauri 2 : le cœur Rust a « full access to all available system resources », le WebView « only access to exposed system resources via the well-defined IPC layer »; les capacités déclarent quelles permissions sont accordées à quelles fenêtres. | [Tauri 2 — Security](https://v2.tauri.app/security/), [Capabilities](https://v2.tauri.app/security/capabilities/) | La frontière de confiance de `DEC-0003` reste valide et documentée par l'éditeur. |
| C17 | WebView2 « is already installed on Windows 10 (from version 1803 onward) and later versions of Windows ». | [Tauri 2 — Prerequisites](https://v2.tauri.app/start/prerequisites/) | La dépendance WebView2 est réelle mais faible sur la cible Windows 10/11; elle reste à documenter pour l'installation hors ligne. |

## 2. Vue d'ensemble

```text
                    Personne non technique
                              │
        clavier ──────────────┼────────────── souris / pavé
                              ▼
   ┌──────────────────────────────────────────────────────┐
   │  Interface (WebView, non privilégiée)                 │
   │   ├─ Représentation sémantique autoritative           │
   │   │    (arbre/liste virtuelle, ARIA, clavier)         │
   │   └─ Carte en blocs hiérarchiques (exploration)       │
   └──────────────────────────┬───────────────────────────┘
                              │ IPC étroit, typé, validé
                              │ (identifiants seulement, jamais de chemin brut)
                              ▼
   ┌──────────────────────────────────────────────────────┐
   │  Cœur privilégié (Rust) — autorité unique             │
   │   ├─ Catalogue des cerveaux                           │
   │   ├─ Indexeur (parcours borné, annulable)             │
   │   ├─ Réconciliateur (surveillance + réénumération)    │
   │   ├─ Modèle de relations (hiérarchie + provenance)    │
   │   ├─ Disposition hiérarchique déterministe            │
   │   └─ Ouverture Windows revalidée                      │
   └───────────┬──────────────────────────┬───────────────┘
               ▼                          ▼
   Espace applicatif                 Racine choisie
   (lecture/écriture :               (métadonnées seulement,
    index, préférences,               AUCUNE écriture,
    sauvegardes)                      AUCUNE lecture de contenu)
```

**Invariant structurel.** La flèche vers la racine choisie est
**unidirectionnelle et en métadonnées seules**. Aucun artefact du produit ne
se trouve dans la racine analysée; c'est la règle de `AGENTS.md` et de la
vision, et elle n'est négociable dans aucune décision.

## 3. Modèle de données (point 5)

### 3.1 Entités

| Entité | Rôle | Reconstructible depuis les sources ? |
|---|---|---|
| Cerveau | Racine, identité de volume, nom, couleur, icône, préférences, vue, version de schéma, état | **Non** pour le nom, la couleur, l'icône et les préférences |
| Nœud | Dossier ou fichier : parent, nom, chemin relatif autoritatif, type, taille, dates, attributs, indicateurs (en ligne, exclu, erreur) | Oui |
| Clé stable | Identité d'un nœud à travers renommage et déplacement | Partiellement — voir §3.2 |
| Relation | Hiérarchique (dérivée) ou transversale (avec provenance) | Hiérarchique : oui. Transversale approuvée : **non** |
| Changement | Création, modification, déplacement, renommage, suppression, horodatés et séquencés | **Non** — l'historique passé n'est pas reconstructible |
| Attention | État vu/non vu par élément et par changement | **Non** |
| Version de schéma | `PRAGMA user_version` plus une table de métadonnées | s.o. |

**Conséquence de conception, à retenir.** Les lignes « **Non** » forment
l'**état non reconstructible**. Il doit être stocké de façon à survivre à une
destruction complète de l'index dérivé, et sauvegardé séparément avant toute
migration. Confondre les deux transformerait chaque reconstruction en perte
de données utilisateur.

### 3.2 Ce qui survit, et ce qui ne survit pas

**Fait (C4).** `VolumeSerialNumber` + `FileId` identifient un fichier de façon
unique sur un ordinateur donné.

**Fait (C5).** En **Rust stable**, ces valeurs ne sont pas exposées par la
bibliothèque standard : `volume_serial_number()` et `file_index()` sont
`nightly-only`, et renvoient `None` si la métadonnée provient de
`DirEntry::metadata`.

**Conséquence, à trancher par [DEC-0009](../decisions/DEC-0009-data-model-and-relations.md).**
Soit le projet ajoute une dépendance d'API Windows pour appeler
`GetFileInformationByHandleEx(FileIdInfo)`, soit il s'en passe et retombe sur
une empreinte **déterministe et versionnée** du chemin relatif. Les deux
options ont un coût réel; aucune n'est gratuite. **`TASK-0011` ne tranche
pas.**

**Règle de sûreté proposée par `DEC-0009` (option I-E).** La ressemblance —
nom, taille, dates, type — n'est **jamais** une source d'identité. Elle ne
produit qu'un **« déplacement possible »**, affiché comme suggestion visible et
révocable. Aucune heuristique ne peut préserver automatiquement l'identité,
l'état vu/non vu ou le journal comme s'il s'agissait d'un fait. Un déplacement
inter-volume non prouvable reste une **création plus une suppression**, avec
suggestion facultative.

Tableau de survie visé (**cible, non testée**). La troisième colonne décrit ce
que la ressemblance permettrait de **suggérer**, jamais ce qu'elle autorise à
écrire :

| Événement sur la source | Identité système (C4) | Empreinte de chemin versionnée (repli déterministe) | Ressemblance — **suggestion seulement** |
|---|---|---|
| Renommage dans le même dossier | Survit | **Ne survit pas** | Suggestion probable |
| Déplacement dans le même volume | Survit | **Ne survit pas** | Suggestion probable |
| Déplacement vers un autre volume | **Ne survit pas** (le numéro de série change) | **Ne survit pas** | Suggestion possible; sinon création + suppression |
| Copie puis suppression de l'original | **Ne survit pas** (nouvel identifiant) | **Ne survit pas** | Suggestion possible, **faux positif possible** |
| Modification du contenu seul | Survit | Survit (le chemin est inchangé) | Sans objet |
| Restauration depuis une sauvegarde | **Ne survit généralement pas** | Survit si les chemins sont identiques | Suggestion possible |
| Reformatage ou changement de lettre de lecteur | **Ne survit pas** | Survit si les chemins relatifs sont identiques | Suggestion possible |

**Incertitude déclarée.** Aucune de ces lignes n'a été mesurée. Les
fournisseurs de synchronisation infonuagique peuvent invalider l'identité
sans que le projet en soit informé — `DEC-0004` le notait déjà, et aucune
source officielle consultée ne le contredit ni ne le garantit.

### 3.3 Forme autoritative du chemin

**Fait (C10).** Les chemins relatifs sont limités à `MAX_PATH`; le préfixe
`\\?\` ne s'applique pas à un chemin relatif et exige registre plus manifeste.

**Conséquence.** Le chemin relatif reste la forme autoritative stockée — elle
ne fuit pas la racine absolue vers l'interface, conformément au
[modèle de menace](../security/threat-model.md) — mais le produit doit :

1. déclarer explicitement s'il est `longPathAware`;
2. traiter un chemin trop long comme un **diagnostic nommé**, affiché à
   l'utilisateur, jamais comme un échec silencieux du cerveau entier;
3. conserver la distinction entre forme autoritative et texte affiché, comme
   `DEC-0004` l'avait établi pour les unités UTF-16 non représentables.

## 4. Indexation (point 6)

### 4.1 Invariant central

> **Une réindexation ne vide jamais l'index courant avant de disposer d'un
> remplacement valide.**

**Constat sur le prototype.** `Index::replace_nodes`
(`src-tauri/src/index.rs:74-107`) exécute `DELETE FROM nodes` puis réinsère
dans une même transaction, après avoir relevé les chemins marqués vus. La
transaction protège d'un arrêt brutal, mais le comportement reste un
**remplacement total** : le coût est proportionnel à la taille de l'index, pas
au nombre de changements, ce qui rend F-031 inatteignable en l'état.

### 4.2 Propriétés exigées

| Propriété | Exigence |
|---|---|
| Sûre | Parcours itératif borné, sans suivi des points de réanalyse (C8, C9), concurrence bornée, hors du fil d'interface. |
| Non destructive sur les sources | Aucune écriture, aucun renommage, aucune ouverture de contenu. Aucun calcul d'empreinte sur un espace réservé (C6, C7). |
| Reconstructible | L'index dérivé est jetable. L'état non reconstructible (§3.1) est stocké séparément. |
| Incrémentale | Le coût d'une mise à jour est fonction du nombre de changements. |
| Annulable | Annulation coopérative vérifiée entre lots; un scan annulé produit un index **partiel déclaré tel**, jamais un index vide déclaré complet. |
| Diagnostique | Permission refusée, chemin disparu, chemin trop long, cycle potentiel deviennent des diagnostics comptés, jamais un échec global. |

### 4.3 États d'un cerveau

```text
nouveau → lecture → agrégation → disposition → à jour
                │                                 │
                ├── arrêté ──▶ incomplet ─────────┤ (reprise)
                ├── perte d'événements ──▶ à vérifier ─▶ réénumération
                └── racine absente ──▶ indisponible (index préservé)
```

Aucune transition ne conduit à « index vidé ». C'est la traduction en machine
à états de l'invariant §4.1.

## 5. Surveillance Windows (point 7)

### 5.1 Ce qui est établi

**Fait (C1, C2).** Deux modes de perte sont documentés par Microsoft :
débordement du tampon (retour vrai, contenu **entièrement** jeté, zéro octet
retourné) et `ERROR_NOTIFY_ENUM_DIR`. Dans les deux cas, la documentation
prescrit explicitement de recalculer les changements en réénumérant.

**Fait (C3).** `ReadDirectoryChangesExW` est documenté comme supporté
uniquement sur NTFS, et refuse un tampon supérieur à 64 Kio sur un répertoire
réseau.

**Fait (source secondaire de bibliothèque, marquée comme telle).** La
documentation officielle de la caisse Rust `notify` déclare que « Large
directory watching may result in missed events » et que certains systèmes de
fichiers n'émettent aucun événement. Licence déclarée : `CC0-1.0`.
[docs.rs/notify](https://docs.rs/notify/latest/notify/), consultée le
2026-08-31. *Cette source documente une bibliothèque, pas la plateforme; elle
illustre, elle ne prouve pas le comportement de Windows.*

### 5.2 Comportement attendu, écrit et non supposé

| Situation | Comportement exigé |
|---|---|
| Rafale d'événements | Coalescence par clé stable, application par lots bornés. L'interface reste réactive; le compteur « Nouveautés » peut être en retard, jamais faux. |
| Débordement de tampon (C1) | Le cerveau passe à **« à vérifier »**, une réénumération du sous-arbre concerné est planifiée, et l'index existant reste servi pendant ce temps. |
| `ERROR_NOTIFY_ENUM_DIR` (C2) | Traité **identiquement** au débordement. |
| Renommage | Corrélé par clé stable (§3.2). Non corrélable : journalisé comme une suppression **plus** une création, avec une mention explicite « non corrélé » et, le cas échéant, une suggestion de « déplacement possible » que l'utilisateur accepte ou refuse. Une suggestion non acceptée n'écrit rien. |
| Déplacement | Idem renommage. Un déplacement **inter-volume non prouvable** reste une création **plus** une suppression : il n'est jamais requalifié automatiquement en déplacement sur la seule foi d'une ressemblance. |
| Suppression | Journalisée. **Jamais** déduite d'une absence d'événement ni d'une racine devenue illisible. |
| Lecteur absent ou déconnecté | Cerveau « indisponible ». Aucune suppression journalisée. L'index et les préférences sont intacts (F-032). |
| Système de fichiers non NTFS (C3) | Surveillance déclarée indisponible; repli sur parcours périodique explicite. Le cerveau ne s'affiche **jamais** « à jour » sur la seule foi d'un mécanisme absent. |
| Sortie de veille, changement de volume | Traités comme une perte d'événements : « à vérifier » puis réénumération. |
| Interruption de l'application | À la reprise, tout cerveau qui n'était pas « à jour » repasse par « à vérifier ». |

**Principe.** Le mécanisme de surveillance **améliore la fraîcheur; il n'est
jamais la source de vérité**. La source de vérité est l'énumération.
`DEC-0004` et [phase-2-architecture.md](phase-2-architecture.md) posaient déjà
ce principe; les sources C1 à C3 le confirment textuellement.

## 6. Exclusions et fichiers infonuagiques (point 8)

### 6.1 Politique d'exclusion

| Exigence | Contenu |
|---|---|
| Sûre | Par défaut, ne jamais suivre point de réanalyse, jonction ni lien symbolique (C8, C9). Le prototype le fait déjà (`scanner.rs:50`, `scanner.rs:114`) et le comportement est conservé. |
| Visible | Toute exclusion appliquée est **listable** avec sa règle et son motif. Une exclusion invisible est indistinguable d'un bogue de parcours. |
| Configurable | L'utilisateur peut ajouter et retirer des règles; les règles par défaut sont affichées et désactivables. |
| Auditable | Le nombre d'éléments exclus par règle est compté et affiché. |
| Non destructive | Exclure ne supprime rien, ni dans les sources, ni dans l'historique du cerveau. |

### 6.2 Points de réanalyse, jonctions et liens symboliques

Traités comme une **classe de nœud à part entière** (`ignoré : point de
réanalyse`), affichée dans la carte avec sa cause, plutôt que silencieusement
omise. Cela rend visible pour l'utilisateur pourquoi une branche de son
arborescence n'apparaît pas.

### 6.3 Fichiers en ligne seulement

**Fait (C6).** `FILE_ATTRIBUTE_RECALL_ON_DATA_ACCESS` (0x00400000) signale un
contenu non entièrement présent localement; `FILE_ATTRIBUTE_RECALL_ON_OPEN`
(0x00040000) **n'apparaît que dans les classes d'énumération de répertoire**.
`FILE_ATTRIBUTE_OFFLINE` (0x00001000) indique une donnée déplacée en stockage
hors ligne, et « Applications should not arbitrarily change this attribute ».

**Note de vérification.** La valeur documentée de
`FILE_ATTRIBUTE_RECALL_ON_OPEN`, 0x00040000, est **identique** à celle de
`FILE_ATTRIBUTE_EA` dans la même table Microsoft. Le prototype utilise déjà
cette valeur (`src-tauri/src/scanner.rs:10`). C'est une ambiguïté réelle de la
documentation officielle, **non résolue ici**, et une source de faux positifs
possible : elle est signalée comme incertitude à lever par un test Windows,
pas tranchée par ce document.

**Règles.** Aucun téléchargement automatique. Aucune lecture de contenu,
aucune miniature, aucune empreinte sur un fichier portant l'un de ces
attributs (C7). Ouverture uniquement sur action explicite, précédée d'un
avertissement d'hydratation possible. Représentation : métadonnées plus
marquage visuel **et** textuel distinct.

## 7. Relations (point 9)

| Type | Provenance | Créée comment | Statut baseline |
|---|---|---|---|
| Hiérarchique (inclusion, parent, enfants) | **Dérivée** de l'arborescence observée | Automatiquement, à l'indexation | `MVP` (F-016) |
| Transversale déterministe | **Règle documentée et versionnée** | Automatiquement, la règle étant nommée et consultable | `ULTÉRIEUR` (F-017) |
| Transversale approuvée | **Utilisateur** | Action explicite; révocable | `ULTÉRIEUR` (F-017) |
| Transversale suggérée | **Suggestion facultative** | Proposée, visuellement distincte, révocable, jamais promue sans action | `ULTÉRIEUR` (F-017) |

**Invariant.** Une relation sans provenance ne doit pas être **représentable**
dans le modèle de données — c'est-à-dire que le champ de provenance est
obligatoire, et non seulement rempli par convention. C'est la traduction
technique de « les relations ne sont jamais inventées silencieusement ».

**Constat.** Le prototype stocke `parent_id` (`src-tauri/src/domain.rs:36`)
mais ne modélise ni relation transversale ni provenance. Il n'y a donc rien à
préserver ici : le modèle est à construire.

## 8. Cerveaux multiples réellement isolés (point 10)

### 8.1 Ce qui doit être séparé

Racine, index, nom, couleur, icône, préférences, état de vue, filtres, état
vu/non vu, journal de changements, version de schéma, état de disponibilité.

### 8.2 Le défaut du prototype traité comme exigence

**Constat vérifié par lecture du code.** Dans `src/App.tsx:314`, cliquer un
onglet de collection exécute `setActiveCollectionId(collection.id)` et
`setPageOffset(0)`, sans aucune commande de chargement. Or `persistentSnapshot`
(`src/App.tsx:110`) n'est défini que si `snapshot.collectionId ===
activeCollectionId`. Basculer d'onglet laisse donc l'interface sans
instantané pour le cerveau visé.

**Exigence F-034 qui en découle.** Basculer d'onglet **charge** l'index, la
carte, les filtres et la vue du cerveau visé. Ce n'est pas un correctif
d'interface : c'est la conséquence de l'isolation, et la raison pour laquelle
le chargement doit être une opération du cœur, pas un effet de bord de
l'état React.

### 8.3 Stockage par cerveau

Deux stratégies sont comparées dans
[DEC-0011](../decisions/DEC-0011-brain-isolation-and-migrations.md) : un
fichier de base par cerveau (position de `DEC-0004`), ou une base unique
partitionnée. **Non tranché ici.**

## 9. Migrations, sauvegarde, intégrité et retour arrière (point 15)

### 9.1 Séquence exigée

```text
1. Lire la version de schéma          (PRAGMA user_version, C12)
2. Si à jour ─────────────────────▶ ouvrir
3. Sinon : copie de sûreté           (API de sauvegarde en ligne, C13)
             │
             ├── échec de la copie ──▶ NE PAS MIGRER. Ouvrir en lecture seule
             │                          et avertir. La source reste intacte.
             ▼
4. Migration transactionnelle, séquentielle, une version à la fois
             │
             ├── échec ──▶ restaurer la copie de sûreté
             │              (retour arrière possible)
             │             ou, si impossible : conserver l'ancien index,
             │              créer un index neuf et reconstruire depuis
             │              les sources
             ▼
5. Contrôle d'intégrité               (integrity_check, C12)
6. Écrire la nouvelle version
```

### 9.2 Points durs, établis par les sources

- **La copie de sûreté peut ne jamais aboutir.** L'API de sauvegarde en ligne
  redémarre à chaque écriture externe, et « if the backup process is
  restarted frequently enough it may never run to completion » (C13). La
  copie doit donc être prise dans une **fenêtre sans écriture applicative**
  (surveillance suspendue, aucun scan en cours), avec un délai maximal
  au-delà duquel la migration est **différée** plutôt que forcée.
- **`integrity_check` ne voit pas tout.** Il ne détecte pas les erreurs de
  clé étrangère (C12); `foreign_key_check` est nécessaire en complément si le
  schéma en utilise.
- **`quick_check` n'est pas équivalent.** O(N) contre O(N log N), au prix de
  ne pas vérifier les contraintes d'unicité ni la cohérence des index (C12).
  Il convient à un contrôle de démarrage, pas à une validation post-migration.

### 9.3 Invariant absolu

> **Une migration impossible ne touche jamais les documents sources.**

Aucun chemin de la §9.1 ne comporte d'écriture dans la racine analysée. Le
pire cas est : ancien index conservé, cerveau ouvert en lecture seule,
avertissement affiché, reconstruction proposée.

## 10. Ce que cette baseline ne tranche pas

| Question | Fiche | Statut |
|---|---|---|
| Conserver ou faire évoluer Tauri 2 / Rust / React / TypeScript / SQLite | [DEC-0007](../decisions/DEC-0007-rebuild-tech-stack.md) | `PROPOSED` |
| Comment dessiner une carte en blocs hiérarchiques | [DEC-0008](../decisions/DEC-0008-hierarchical-rendering.md) | `PROPOSED` |
| Stratégie d'identifiant stable et modèle de relations | [DEC-0009](../decisions/DEC-0009-data-model-and-relations.md) | `PROPOSED` |
| Indexation incrémentale et réconciliation après perte d'événements | [DEC-0010](../decisions/DEC-0010-indexing-and-watching.md) | `PROPOSED` |
| Stockage par cerveau et stratégie de migration | [DEC-0011](../decisions/DEC-0011-brain-isolation-and-migrations.md) | `PROPOSED` |
| Où s'arrête le MVP structurel et où commence l'IA facultative | [DEC-0012](../decisions/DEC-0012-ai-architectural-boundary.md) | `PROPOSED` |
| Comment un corpus très grand est indexé, matérialisé et rendu | [DEC-0029](../decisions/DEC-0029-progressive-materialization-and-scale-boundary.md) | `APPROVED` — **tranchée depuis le 2026-09-06**, voir [PROGRESSIVE_SCALE_ARCHITECTURE.md](PROGRESSIVE_SCALE_ARCHITECTURE.md) |

**Restent non tranchés après `DEC-0029`, et le sont explicitement :** la
**valeur numérique du budget de vue**, le **renderer final**, le **schéma
SQLite du query engine borné**, les **signatures d'API et d'IPC**, le
**remplacement effectif de `MAX_NODES_PER_MAP`** et le **profil matériel exact
du banc d'échelle** — [`PROGRESSIVE_SCALE_ARCHITECTURE.md §12`](PROGRESSIVE_SCALE_ARCHITECTURE.md).

## 11. Limites de ce livrable

- **Non testé.** Aucun build, aucune exécution, aucune mesure, aucun essai
  Windows. Tous les comportements décrits sont des exigences, pas des
  constats d'exécution.
- Les constats sur le prototype sont issus d'une **lecture statique** du code
  au commit `01e6860f`. L'absence d'un symbole ne prouve pas l'absence de tout
  comportement indirect.
- La contradiction C5 (Rust stable contre identité de fichier Windows) est un
  **fait vérifié sur la documentation officielle**, mais sa portée pratique
  n'a pas été testée par compilation.
- L'ambiguïté de valeur signalée en §6.3 est **non résolue**.
- Le dossier `graph/` n'a pas été utilisé comme source, conformément à
  `TASK-0011` §4.
