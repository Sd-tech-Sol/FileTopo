# Matrice fonctionnelle de reconstruction

Les états portent sur la cible réelle, pas sur les anciennes phases. Aucune
ligne n'est VERIFIED par TASK-0010; les preuves sont des constats statiques et
les tests applicatifs n'ont pas été rejoués.

La colonne « Baseline TASK-0011 » reporte la classification arrêtée par
[REQUIREMENTS_BASELINE.md](REQUIREMENTS_BASELINE.md), qui porte aussi le
motif, la dépendance amont et le critère d'acceptation mesurable de chaque
fonction. Cette classification est `PROPOSED` : elle attend l'examen humain.
Les preuves et constats ci-dessous sont inchangés.

> **Amendement du 2026-08-31 — `TASK-0015`, décision
> [DEC-0015](../decisions/DEC-0015-product-parity-and-layout-scope.md) `C`.**
>
> **La référence produit a changé.** Les colonnes « Prototype actuel »,
> « Preuve dans le dépôt » et « Écart » de ce tableau décrivent l'**ancienne
> version publique de FileTopo**, désormais établie comme **prototype et audit
> technique** — **pas** comme référence produit. La **référence fonctionnelle
> est CarteTopo**, et le contrat exigible est
> [CARTETOPO_FUNCTIONAL_PARITY.md](CARTETOPO_FUNCTIONAL_PARITY.md).
> **Ces constats d'audit restent valides dans leur portée d'origine** et ne
> sont pas retouchés : ils disent ce que le prototype fait, jamais ce que le
> produit doit faire.
>
> **Quatre classifications changent** — `F-013`, `F-017`, `F-018`, `F-019`
> passent d'`ULTÉRIEUR` à **`MVP`**. La valeur d'origine est conservée et
> visible dans la colonne. **Aucune fonction ne descend, aucune n'est ajoutée :
> la matrice reste à 39 lignes.** `F-021`, `F-037`, `F-038` et `F-039` restent
> **`DIFFÉRÉ`**.
>
> La colonne « Priorité » est celle de l'audit d'origine et **n'est pas
> retouchée**; les écarts avec la classification courante sont déclarés en §4
> de [REQUIREMENTS_BASELINE.md](REQUIREMENTS_BASELINE.md).

> **Amendement du 2026-09-01 — `DEC-0017`, direction produit.**
>
> **Une ligne est ajoutée : `F-040` — vue composée multi-cerveaux**, classée
> **`MVP`**. C'est une **extension produit décidée**, déclarée comme telle, et
> **non** une reclassification silencieuse : aucune ligne existante ne change
> de classification, aucune ne descend, aucune ne disparaît.
>
> **La matrice passe de 39 à 40 lignes.** Répartition : **`MVP` 36**,
> **`ULTÉRIEUR` 0**, **`DIFFÉRÉ` 4**, **total 40**.
>
> **`F-040` n'est pas une exigence de parité.** L'exigence de parité
> correspondante reste **`P-20`**, entière et inchangée. Le contrat
> [CARTETOPO_FUNCTIONAL_PARITY.md](CARTETOPO_FUNCTIONAL_PARITY.md) **n'est pas
> retouché** et conserve ses 22 exigences.
>
> La colonne « Prototype actuel » de `F-040` décrit, comme toutes les autres,
> l'**ancienne version publique** — audit technique, jamais référence produit.

> **Amendement du 2026-09-02 — `DEC-0018`, direction produit.**
>
> **Une ligne est ajoutée : `F-041` — relations inter-cerveaux explicites**,
> classée **`MVP`**. C'est une **extension produit décidée**, déclarée comme
> telle, et **non** une reclassification silencieuse : aucune ligne existante
> ne change de classification, aucune ne descend, aucune ne disparaît.
>
> **La matrice passe de 40 à 41 lignes.** Répartition : **`MVP` 37**,
> **`ULTÉRIEUR` 0**, **`DIFFÉRÉ` 4**, **total 41**.
>
> **`F-041` n'est pas une exigence de parité.** `P-04`, `P-05`, `P-06` et
> `P-20` restent entières et inchangées, et le contrat
> [CARTETOPO_FUNCTIONAL_PARITY.md](CARTETOPO_FUNCTIONAL_PARITY.md) **n'est pas
> retouché** : il conserve ses 22 exigences.
>
> **Une relation inter-cerveaux ne fusionne jamais deux cerveaux**, n'est jamais
> créée par le seul fait d'un affichage, et n'invente jamais son inverse.

> **Amendement du 2026-09-02 — réalignement produit, `DEC-0019` à `DEC-0023`.**
>
> **Huit lignes sont ajoutées : `F-042` à `F-049`.** Ce sont des **extensions
> produit décidées**, déclarées comme telles, et **non** des reclassifications
> silencieuses : **aucune ligne existante ne change de classification, aucune
> ne descend, aucune ne disparaît.**
>
> **La matrice passe de 41 à 49 lignes.** Répartition : **`MVP` 41**,
> **`ULTÉRIEUR` 3**, **`DIFFÉRÉ` 5**, **total 49**. `F-001` à `F-049`, **sans
> trou ni doublon**. La colonne `ULTÉRIEUR` **cesse d'être vide** : elle
> accueille trois fonctions **nommées pour ne pas être oubliées**, et **non
> promises au MVP**.
>
> **`F-007` et `F-008` changent de COMPORTEMENT CIBLE, pas de
> classification.** [`DEC-0020`](../decisions/DEC-0020-topographic-node-graph.md)
> fait de la **représentation principale finale** un **graphe hiérarchique à
> nœuds/cartes reliés**, et non un pavage de rectangles imbriqués. Leur cible
> se lit désormais « **nœuds identifiables reliés** » là où elle disait
> « blocs »; elles restent **`MVP`**, **`P0`**, et leur colonne « Prototype
> actuel » — qui décrit l'ancienne version publique — **n'est pas retouchée**.
> Le pavage `CAL-B` **demeure une primitive technique**, une représentation de
> diagnostic et une vue secondaire éventuelle : **il n'impose plus l'UX
> finale**. `DEC-0014` et `DEC-0015` sont **inchangées**.
>
> **Le contrat de parité conserve ses 22 exigences.** `P-02` est **corrigée**
> par la correction normative **`P02-R1`**, jamais supprimée; `P-01` et `P-03` à
> `P-22` sont **inchangées**. `F-047` rejoint les fonctions `DIFFÉRÉ` du §6 du
> contrat.
>
> **Aucune de ces huit fonctions n'est implémentée, prouvée ni commencée.**
> Elles sont toutes `PROPOSED`, et ce sont des **cibles à falsifier**.

> **Amendement du 2026-09-06 — `DEC-0029`, réalignement d'architecture à
> grande échelle.**
>
> **Deux lignes sont ajoutées : `F-050` — matérialisation progressive et vue
> bornée**, et **`F-051` — agrégats et méta-nœuds exacts**, toutes deux
> classées **`MVP`**, priorité **`P0`**. Ce sont des **extensions produit
> décidées**, déclarées comme telles.
>
> **Une seule classification existante change, et elle MONTE : `F-042` passe
> d'`ULTÉRIEUR` à `MVP`.** La valeur d'origine est conservée et visible dans
> sa colonne. **Motif explicite :** sous l'architecture progressive de
> [`DEC-0029`](../decisions/DEC-0029-progressive-materialization-and-scale-boundary.md),
> replier, déplier et focaliser cessent d'être des conforts d'interface pour
> devenir **les gestes qui déterminent le contenu de la vue matérialisée** —
> donc à la fois une **primitive de navigation** et une **primitive de
> performance**. **Aucune fonction ne descend, aucune ne disparaît.**
>
> **La matrice passe de 49 à 51 lignes.** Répartition : **`MVP` 44**,
> **`ULTÉRIEUR` 2**, **`DIFFÉRÉ` 5**, **total 51**. `F-001` à `F-051`,
> **sans trou ni doublon**.
>
> **`F-051` est classée `P0`, et non `P1`, par arbitrage écrit.** `F-050`
> cache nécessairement des éléments réels. Sans `F-051`, la vue n'a que deux
> issues : **taire** ce qu'elle cache, ce qui **viole `P-02` amendée**, ou
> **refuser de matérialiser**, ce qui **annule `F-050`**. `F-051` est la
> **contrepartie de véracité** de `F-050`, pas un enrichissement ultérieur :
> **les deux se livrent ensemble ou pas du tout.**
>
> **Le contrat de parité conserve ses 22 exigences.** `P-01`, `P-02` et `P-03`
> sont **amendées** par l'amendement normatif **`P-SCALE-R1`**, jamais
> supprimées ni affaiblies; `P-04` à `P-22` sont **inchangées**, et **`P-08`
> devient un pilier du scale spike**.
>
> **`F-047` reste `DIFFÉRÉ`.** `F-043`, `F-044` et `F-045` restent
> `IMPLEMENTED` et vérifiées. **`F-046` reste `PROPOSED`** pour son identité
> physique, malgré ses sous-capacités vérifiées par `TASK-0023 / ACTION-0039`
> et `TASK-0026 / ACTION-0043`. **Graphify n'est ajouté comme aucune
> fonction** : il est **`NOT INTEGRATED`** — `DEC-0029 G`.
>
> **Ni `F-050` ni `F-051` n'est implémentée, prouvée ni commencée.** Elles
> sont `PROPOSED`, et ce sont des **cibles à falsifier**. **Aucune mesure de
> performance n'existe** à 10 000, 100 000 ni 1 000 000 d'éléments.

> **Note du 2026-09-10 — `TASK-0031`, décision
> [DEC-0032](../decisions/DEC-0032-persistent-brain-lifecycle-contract.md).**
>
> **Aucune ligne n'est ajoutée, aucune classification ne change, aucune
> fonction ne monte ni ne descend.** La matrice reste à **51 lignes**,
> `F-001` à `F-051`.
>
> `TASK-0031` sépare **ouvrir**, **actualiser** et **reconstruire** un cerveau :
> ouvrir lit désormais l'index persistant **sans scanner la source**, et les
> deux autres sont des intentions explicites dont l'échec laisse le dernier
> index fiable ouvrable. C'est une **frontière de cycle de vie**, pas une
> fonction du produit : elle ne satisfait à elle seule aucun critère
> d'acceptation de ce tableau.
>
> **Ce qu'elle change pour les lignes existantes, honnêtement :** `F-027`
> journal de changements, `F-030` surveillance automatique et `F-031` mise à
> jour incrémentale restent **`PROPOSED`** et **hors portée** — aucun watcher,
> aucun incrémental n'est écrit. Leur précondition est simplement posée :
> tant qu'ouvrir signifiait rescanner, « observer sans rescanner inutilement »
> n'avait pas de socle. `F-050` et `F-051` restent **`IMPLEMENTED`**, pas
> `VERIFIED` globalement : la projection bornée est inchangée et reste le seul
> chemin de rendu après les trois opérations. `F-001` choix de racine reste
> **`IMPLEMENTED` sur synthétique seulement** : aucun `REAL_ROOT`, aucun
> sélecteur de dossier réel n'est ajouté ni réactivé.
>
> **`TASK-0031` est `IMPLEMENTED`, en attente de contrôle indépendant.**

### Note du 2026-09-10 — `TASK-0032`, première racine réelle contrôlée

> **`DEC-0033` est `APPROVED`. Aucune ligne n'est ajoutée, aucune
> classification ne change, et aucune donnée personnelle n'est utilisée.**
>
> **Une seule ligne change de constat : `F-001` choix de racine.** Le sélecteur
> Windows existe désormais pour de vrai : `map_brain_choose_real_root` ouvre le
> dialogue natif, crée un cerveau `REAL_ROOT` et **ne scanne rien**. La note de
> `TASK-0031` disait « aucun `REAL_ROOT`, aucun sélecteur de dossier réel n'est
> ajouté ni réactivé » — c'était vrai alors, ce ne l'est plus, et la ligne est
> corrigée plutôt que laissée à contredire le code.
>
> **`F-001` reste `IMPLEMENTED`, pas `VERIFIED`**, et son critère d'acceptation
> n'est atteint que dans une portée de test : toutes les racines analysées par
> `TASK-0032` sont créées par ses propres preuves. **La première utilisation
> d'un vrai cerveau reste un point d'arrêt réservé à Sébastien.**
>
> **Ce qui ne change pas :** `F-002` cerveau indépendant reste `PROPOSED` — deux
> cerveaux sur un même dossier réel sont prouvés isolés, mais les préférences et
> la reprise manquent toujours. `F-027`, `F-030` et `F-031` restent `PROPOSED`
> et hors portée : aucun watcher, aucun incrémental. `F-050` et `F-051` restent
> `IMPLEMENTED`, pas `VERIFIED` globalement; la projection bornée est inchangée
> et reste le seul chemin de rendu, y compris pour une racine réelle. `F-042`
> reste `PROPOSED / MVP`, `F-046` `PROPOSED`, `F-047` `DIFFÉRÉ`.
>
> **`TASK-0032` est `IMPLEMENTED`, en attente de contrôle indépendant.**

### Note du 2026-09-11 — `TASK-0036`, fondation d'identité stable

> **Aucune ligne n'est ajoutée, aucune classification ne change au-delà de
> `F-004`, et aucune donnée personnelle n'est utilisée.**
>
> **Une seule ligne change de constat : `F-004` identifiants stables.**
> `DEC-0009` I-E est productionisée : identité système Windows
> (`VolumeSerialNumber + FileId`, jamais `FileId` seul) quand disponible,
> repli déterministe et versionné du chemin relatif + type sinon, provenance
> toujours l'une des deux — jamais une heuristique. La publication remappe
> le scan vers les `nodes.id` canoniques : un objet reconnu par sa clé
> stable garde son id à travers un renommage ou un déplacement intra-volume
> prouvé; un objet neuf reçoit un id d'un compteur durable qui n'avance
> jamais à rebours, donc ne recycle jamais silencieusement un id supprimé.
>
> **`F-004` passe de `PROPOSED` à `IMPLEMENTED`, pas `VERIFIED`.** Prouvé sur
> arborescences synthétiques et, pour la voie `SYSTEM`, sur de vrais fichiers
> Windows — y compris un rejeu produit réel en WebView2 qui renomme puis
> déplace des fichiers réels entre deux `Actualiser`. Le déplacement
> **inter-volume** reste, honnêtement, hors de ce qui est prouvable sans
> écrire hors du dépôt : il continue de se comporter comme une création plus
> une suppression, exactement le compromis assumé par `DEC-0009`.
>
> **Ce qui ne change pas :** cette tâche est une fondation, pas le journal de
> changements. `F-027` journal, `F-030` surveillance et `F-031` mise à jour
> incrémentale restent `PROPOSED` et hors portée — aucun watcher, aucun
> incrémental n'est écrit. `F-050`/`F-051` restent `IMPLEMENTED`, pas
> `VERIFIED` globalement. `BrainNodeRef = brainId + nodeId` reste la seule
> identité frontend; aucune clé stable, empreinte ou donnée machine n'est
> jamais sérialisée vers le WebView.
>
> **`TASK-0036` est `VERIFIED`** (`ACTION-0060`).

> **`TASK-0037` — journal de changements sur Actualiser/Reconstruire, **`VERIFIED` par `ACTION-0061`**.** `F-027` passe de `PROPOSED` à
> `IMPLEMENTED` **pour la détection manuelle seulement** : chaque
> Actualiser/Reconstruire compare l'Index canonique précédent au nouveau corpus
> remappé par l'identité stable de `TASK-0036` et journalise, dans le même
> SQLite et la même transaction que le corpus et la révision, les cinq natures
> (`CREATED`, `MODIFIED`, `RENAMED`, `MOVED`, `DELETED`), avec historique
> persistant, consultation paginée (50 max), filtres par nature et une surface
> « Changements » dans `MapApp`. **Ce que cela ne fait pas, honnêtement :**
> `F-030` surveillance automatique et `F-031` mise à jour incrémentale restent
> `PROPOSED` et hors portée; `P-16` n'est donc **que partiellement couvert** (la
> détection automatique manque), et son mot « ordonnés » est tenu au sens
> honnête — l'ordre d'un même lot est l'ordre **de publication du journal**,
> jamais la chronologie réelle des opérations disque, qu'un scan complet ne peut
> pas connaître. `F-022` filtres « nouveau / non vu » et `F-028` marquer vu
> restent `PROPOSED` : cette tranche ne fait que poser la source de vérité dont
> `P-17` exige qu'ils dérivent. `F-029` reste `PROPOSED` : l'Actualiser est
> toujours un rescan complet; il gagne seulement le **résumé de compteurs par
> nature** que `P-18` (manuel) réclame.

> **`TASK-0039` — filtres dynamiques, `VERIFIED` par `ACTION-0065`.**
> `F-022` passe de `PROPOSED` à `IMPLEMENTED` : Tout / Nouveaux / Non vus, type et
> disponibilité, combinables, avec total exact et projection filtrée bornée. **Ce que
> cela ne fait pas :** la persistance des filtres au redémarrage (`P-19`), le watcher
> (`F-030`) et l'incrémental (`F-031`) restent hors portée; `ONLINE_ONLY` n'est prouvé
> qu'au niveau Rust. Aucune autre ligne de cette matrice n'est modifiée par cette tâche.

> **`TASK-0038` — état vu/non vu dérivé du journal, `VERIFIED` par `ACTION-0064`.**
> `F-028` passe de `PROPOSED` à `IMPLEMENTED` : la source de vérité, les trois
> gestes, la persistance et l'isolation par cerveau que `P-17` exige existent, avec
> confirmation explicite pour « tout marquer vu ». **Ce que cela ne fait pas,
> honnêtement :** `F-022` (filtres « nouveau / non vu » de la carte), `F-030` et
> `F-031` restent `PROPOSED` et hors portée; `P-17` n'est donc couverte que pour
> l'état, les gestes et le panneau — pas pour les filtres. `nodes.seen` du prototype
> reste un champ historique que la V1 ne lit ni n'écrit.

> **`TASK-0041` — Actualiser manuel par le noyau incrémental, `IMPLEMENTED`, en attente de contrôle.**
> `F-029` passe de `PROPOSED` à `IMPLEMENTED` : l'Actualiser d'un Index estampé applique un lot
> minimal réconcilié par le noyau de `TASK-0040`, avec résumé exact, et ne remplace plus le
> corpus. **Ce que cela ne fait pas, honnêtement :** le scan reste complet à chaque
> Actualiser (`O(corpus)`); `F-030` (watcher) et `F-032` (indisponibilité, dont une racine
> remplacée) restent hors portée; le coût d'un Actualiser sur 100 000+ nœuds n'est pas mesuré.
> La ligne `F-031` n'a changé que sur son écart « non branché ».
>
> **`TASK-0042` — fondation de source indisponible, `IMPLEMENTED`, en attente de contrôle.**
> `F-032` **reste `PROPOSED`** : ce n'est qu'une **fondation**. Une **dernière observation de
> la source** (par cerveau, fermée, sans chemin, persistée) est écrite par l'Actualiser manuel;
> une racine absente, remplacée ou illisible ne vide plus l'Index et ne crée aucune suppression
> (`DEC-0040`). **Ce que cela ne fait pas, honnêtement :** aucune détection automatique —
> `F-030` (watcher) est toujours absent, donc rien n'observe la source tant que la personne ne
> clique pas; l'état est la **dernière observation**, jamais une disponibilité en temps réel.

> **`TASK-0043` — surveillance automatique, `IMPLEMENTED`, en attente de contrôle.** `F-030` passe de
> `PROPOSED` à `IMPLEMENTED` et `F-032` aussi (le contrat de `TASK-0042` est maintenant consommé
> automatiquement). Un événement du système est un **hint**, jamais la vérité : l'Index et le journal ne
> viennent que d'une réénumération (W-B ciblé ou W-C complet) puis de `apply_update_batch`. **Ce que cela
> ne fait pas, honnêtement :** volume NTFS local seulement (réseau, FAT, dossier synchronisé, USN non
> exercés); repli périodique prouvé au niveau Rust; cadences produit non attendues en réel.

> **`TASK-0044` — état de reprise par cerveau, `IMPLEMENTED`, en attente de contrôle.** Chaque cerveau retrouve sa
> **branche, sa sélection, sa caméra, son filtre logique et son panneau Détails** depuis son propre
> enregistrement versionné du catalogue (`DEC-0042`), après une bascule et après un vrai redémarrage; les
> identifiants sont validés contre l'Index courant du même cerveau et un match hors première page est restauré
> sur une page reconstruite avec un curseur frais. **Aucun statut de cette matrice ne change** : `F-002` et
> `F-034` restent `PROPOSED` tant qu'un contrôle indépendant ne les a pas relus (leur colonne « Écart » dit ce
> que la tranche apporte). **Ce que cela ne fait pas, honnêtement :** `P-19` reste **partielle** — pas de choix
> FR/EN, pas de préférences d'accessibilité, aucune préférence de légende (il n'en existe pas), pas de
> persistance d'une composition de plusieurs cerveaux (session seule); après Reconstruire, un identifiant stocké
> n'est vérifié que par existence. `F-022` (les filtres au redémarrage) gagne la reprise du filtre **logique**
> par cerveau, sans changer de statut.

| Identifiant | Fonction | Comportement cible | Prototype actuel | Preuve dans le dépôt | Écart | Priorité | Phase | État | Critères d'acceptation | Baseline TASK-0011 |
|---|---|---|---|---|---|---|---|---|---|---|
| F-001 | Choix de racine | Sélecteur Windows guidé | **Sélecteur natif réel** : `map_brain_choose_real_root`, sans argument, crée un cerveau `REAL_ROOT` **sans rien scanner**; annuler ne crée rien | `TASK-0032` `IMPLEMENTED`, en attente de contrôle; `DEC-0033`; `map/source.rs::validate_real_root`; preuves `RR2`, `RR3`, `RR8` et rejeu WebView2 | Prouvé **sur des arborescences créées par les preuves seulement**. Aucune racine personnelle : point d'arrêt réservé à Sébastien. Flux cerveau encore incomplet — préférences et reprise, voir `F-002` | P0 | 2 | IMPLEMENTED | Sélection réelle et synthétique testées, annulation sûre, racine invalide ou englobant l'état FileTopo refusée, **chemin absolu jamais exposé** | `MVP` |
| F-002 | Cerveau indépendant | Racine, index et état isolés | Catalogue + stockage physiquement isolé par cerveau; état de reprise brain-scoped | `TASK-0018` **VERIFIED** (`ACTION-0029`) pour l'isolation catalogue/index/relations; `TASK-0044` **VERIFIED** (`ACTION-0073`) pour caméra, focus/sélection, filtre et panneau sur trois cerveaux avec redémarrages réels | La persistance d'une **composition multi-cerveaux complète** reste hors portée; la langue et les préférences d'accessibilité sont globales, pas un état de cerveau | P0 | 3 | IMPLEMENTED | Deux cerveaux ne partagent aucun état | `MVP` |
| F-003 | Scan hiérarchique | Dossiers, fichiers, noms, métadonnées | Présent | scanner.rs:46 | Robustesse à étendre | P0 | 2 | IMPLEMENTED | Arbre synthétique exact, sources inchangées | `MVP` |
| F-004 | Identifiants stables | Survivre aux changements raisonnables | **`DEC-0009` I-E productionisée** : identité Windows `VolumeSerialNumber + FileId` quand disponible (`SYSTEM`), repli déterministe/versionné du chemin relatif + type sinon (`PATH_FALLBACK`); remap à la publication préserve `nodes.id` pour une clé stable reconnue, compteur monotone pour un objet neuf | `TASK-0036` `IMPLEMENTED`, en attente de contrôle; `identity.rs`; `index.rs::publish_with_identity`; `scanner.rs`; preuves Rust (27 tests, dont 7 `#[cfg(windows)]`) et rejeu WebView2 réel (`TASK-0036-webview2.json`) : renommage et déplacement intra-volume réels conservent le même `nodeId` | Déplacement **inter-volume** non prouvable reste création + suppression, honnêtement (`DEC-0009`, non testé — écrire hors dépôt requis). Aucun watcher, journal ni application incrémentale : fondation seulement, `F-027`/`F-031` restent `PROPOSED`. Identité après hydratation cloud : question ouverte, contournée en excluant `online_only`/reparse de `SYSTEM` plutôt que résolue | P0 | 2 | IMPLEMENTED | Renommage/déplacement intra-volume prouvé conserve `nodeId`; provenance jamais une heuristique; collision refusée sans perte de l'index précédent | `MVP` |
| F-005 | Exclusions | Règles sûres, visibles et configurables | Le scanner refuse une racine reparse/symlink et matérialise les entrées reparse/symlink comme `Skipped` sans les suivre; **aucune exclusion utilisateur configurable** | `scanner.rs`; `ACTION-0080`; `DEC-0046`; `TASK-0048` READY | Socle de sécurité présent; TASK-0048 doit ajouter une policy brain-scoped/versionnée de sous-arbres relatifs exacts, visible FR/EN, commune scan/refresh/rebuild/W-B/W-C/watcher, sans faux événements journal de source | P0 | 2 | PROPOSED | Exclusions testées et explicables | `MVP` |
| F-006 | Index reconstructible | Refaire depuis la source sans perte | Cycle Open / Refresh / Rebuild séparé; rebuild transactionnel, rollback réel et dernier Index fiable conservé | `TASK-0031` **VERIFIED** (`ACTION-0048`); `DEC-0032`; publication transactionnelle | Le noyau de reconstruction existe, mais le critère F-006 exact « supprimer l'index puis relancer => corpus/hiérarchie équivalents + état non reconstructible énuméré » n'a pas encore une preuve indépendante dédiée sur le runtime courant | P0 | 3 | PROPOSED | Reconstruction déterministe et atomique | `MVP` |
| F-007 | Carte topographique à nœuds reliés | **Nœuds/cartes identifiables** issus de la hiérarchie réelle, reliés par des **connexions explicites** — *cible modifiée le 2026-09-02 par `DEC-0020`; classification inchangée* | `layered-tree-cards-v1`, cartes indépendantes et arêtes parent/enfant | `src-tauri/src/map/layout.rs`; `src/map/MapView.tsx` | Contrôle indépendant attendu | P0 | 4 | IMPLEMENTED | Parent/enfants lisibles sur arbres variés, **sans arête inventée ni nœud dans la mauvaise branche** — `P-02` corrigée par `P02-R1` | `MVP` |
| F-008 | Adaptation aux arbres | Disposition générique de graphe hiérarchique, **aucun algorithme imposé** — *cible modifiée le 2026-09-02 par `DEC-0020`; classification inchangée* | Layout déterministe gauche→droite, monde non comprimé | `src-tauri/src/map/layout.rs`; preuves `TASK-0022-N15-*` | *(constat d'époque, 2026-09-02 : « `F-042` reste ultérieure ») —* **corrigé le 2026-09-06 : `F-042` est `MVP` depuis `DEC-0029` B**, et le layout ne se calcule plus comme une obligation sur tout le corpus, mais **sur la vue matérialisée** — `DEC-0029` E | P0 | 4 | IMPLEMENTED | Les quatre fixtures — large, profonde, mixte, quasi vide — restent lisibles, **noms disponibles au zoom prévu** | `MVP` |
| F-009 | Panoramique | Déplacer la carte | Pan réel du `MapView`, borné/clampé; navigation de branche conserve l'échelle; clavier contrôlé dans la fermeture accessibilité | `TASK-0033` **VERIFIED** (`ACTION-0051`); `TASK-0047` **VERIFIED** (`ACTION-0079`) | Pavé tactile physique non exercé dans ACTION-0051; aucune modification d'Index par la vue | P1 | 5 | IMPLEMENTED | Souris, pavé et clavier testés | `MVP` |
| F-010 | Zoom | Zoom avant/arrière | Zoom borné du `MapView`; navigation sans changement d'échelle non demandé; gestes et clavier présents | `TASK-0033` **VERIFIED** (`ACTION-0051`); `viewState.ts`; `MapView.tsx`; `TASK-0047/ACTION-0079` | Pas d'acceptance matérielle pavé tactile dédiée | P1 | 5 | IMPLEMENTED | Zoom borné et centré | `MVP` |
| F-011 | Ajuster à l'écran | Cadrer carte ou sélection | Action explicite `Ajuster à l'écran`; `fitView` réservé à ce geste et au raccourci de sélection; plus de fit global automatique | `TASK-0033` **VERIFIED** (`ACTION-0051`) : WebView2 1366×768 et 1920×1080, fit exhaustif observé | Ne constitue pas à elle seule la clôture formelle de P-11 | P1 | 5 | IMPLEMENTED | Toute carte peut être recadrée | `MVP` |
| F-012 | Réinitialiser la vue | Restaurer vue initiale/enregistrée | `Réinitialiser` utilise `readableView`; caméra/pan/zoom sont persistés par cerveau depuis TASK-0044 | `TASK-0033` **VERIFIED** (`ACTION-0051`); `TASK-0044` **VERIFIED** (`ACTION-0073`) | ACTION-0051 observe le retour à l'échelle lisible 1; l'égalité paramètre-par-paramètre du critère historique F-012 n'est pas re-déclarée ici | P1 | 5 | IMPLEMENTED | Commande déterministe et accessible | `MVP` |
| F-013 | Panneau latéral | Masquer/afficher sans perte | Panneau Détails masquable; choix persistant **par cerveau** avec fallback legacy global | `TASK-0035` **VERIFIED** (`ACTION-0056`) pour le panneau; `TASK-0044` **VERIFIED** (`ACTION-0073`) pour la persistance brain-scoped et le redémarrage | Le contenu complet du panneau relève aussi de `F-023`; cette ligne porte seulement le masquage/restauration | P1 | 5 | IMPLEMENTED | État conservé au redémarrage | **`MVP`** (parité `P-12`) — *origine : `ULTÉRIEUR`* |
| F-014 | Légende | Couleurs, formes et motifs expliqués | **Ancien prototype seulement** : le runtime courant `MapApp` n'a aucune légende produit | Audit `ACTION-0080`; `MapApp.tsx` / `mapStrings.ts` sans surface de légende; TASK-0047 prouve seulement les alternatives non colorées | Le statut historique IMPLEMENTED était périmé. P-10 reste ouvert; la future légende devra refléter les codages réels et rester clavier/FR-EN, sans dupliquer leur logique | P1 | 5 | PROPOSED | Légende accessible suit les données | `MVP` |
| F-015 | Sélection | Sélectionner un bloc | Points/liste sélectionnables | App.tsx:244; TerrainMap.tsx | Pas un bloc hiérarchique | P0 | 5 | IMPLEMENTED | Sélection synchronisée clavier/souris | `MVP` |
| F-016 | Relations hiérarchiques | Parent et enfants directs visibles | Une arête orthogonale exacte par nœud non racine; navigation parent/enfants/frères | `src/map/hierarchy.ts`; `src/map/MapView.tsx` | Contrôle indépendant attendu | P0 | 5 | IMPLEMENTED | Arêtes et panneau concordent avec l'arbre | `MVP` |
| F-017 | Relations transversales | Provenance explicite, jamais inventée | Aucun modèle observé | domain.rs | Manquant | P1 | 5 | PROPOSED | Chaque relation expose type et provenance | **`MVP`** (parité `P-04`) — *origine : `ULTÉRIEUR`* |
| F-018 | Mise en évidence | Accentuer liés, atténuer non liés | Sélection agrandit un point | TerrainMap.tsx:59 | Relations non prises en compte | P1 | 5 | PROPOSED | États visuels accessibles et testés | **`MVP`** (parité `P-06`) — *origine : `ULTÉRIEUR`* |
| F-019 | Relations entrantes/sortantes | Distinguer directions | Aucune preuve trouvée | domain.rs | Manquant | P2 | 5 | PROPOSED | Panneau et carte donnent mêmes comptes | **`MVP`** (parité `P-05`) — *origine : `ULTÉRIEUR`* |
| F-020 | Recherche nom/chemin | Recherche locale simple | Présente et paginée | index.rs:128; App.tsx:113 | Sujet/rôle absent | P0 | 5 | IMPLEMENTED | Résultats exacts, bornés et cités | `MVP` |
| F-021 | Recherche sujet/rôle | Exploiter contenu/enrichissement | Non présente | aucun extracteur | Future | P2 | 10 | DEFERRED | Sources citées, fonctionnement local | `DIFFÉRÉ` |
| F-022 | Filtres dynamiques | Tout, nouveaux, non vus et facettes | **Filtres appliqués par SQLite à l'Index canonique** (`DEC-0037`) : état Tout / Nouveaux / Non vus (dérivé du **journal**, jamais de `nodes.seen`), type dossiers / fichiers / ignorés (OU), disponibilité Tout / local / en ligne seulement, combinés par ET; **total exact**, page de correspondances keyset bornée (curseur `ftf1` lié à l'index, à la révision et au filtre), correspondance / contexte explicites, « Réinitialiser les filtres » | `TASK-0039` **VERIFIED** par `ACTION-0065`; `node_filter.rs`; `map/filtered_projection.rs`; `map_view(filter?)`; `FilterPanel.tsx`; `useProjectionFilter.ts`; preuves Rust (26 tests dont 100 000 nœuds) et rejeu WebView2 réel (`TASK-0039-webview2.json`, 151 correspondances en 3 pages) | `ONLINE_ONLY` prouvé au niveau Rust seulement (aucun placeholder Cloud Files fabriqué). Filtres **persistés par cerveau** au redémarrage depuis `TASK-0044` / `ACTION-0073`, sans persister de curseur keyset; pas de facette supplémentaire. Un nœud de contexte peut satisfaire le filtre : compté comme correspondance seulement là où le keyset l'atteint. Total recalculé à chaque page; latence non mesurée, aucun seuil nouveau. Watcher (`F-030`) et incrémental (`F-031`) sont maintenant implémentés/contrôlés dans leurs tranches propres | P1 | 5 | IMPLEMENTED | Filtres dérivés des données et combinables | `MVP` |
| F-023 | Détails | Chemin, dates, parent, enfants, état | `DetailsPanel` courant affiche nom/type/chemin relatif, taille, date, diagnostic, parent, enfants; état journal/content intégré | `TASK-0035` **VERIFIED** (`ACTION-0056`); `DetailsPanel.tsx`; preuves WebView2; compléments TASK-0038/0046/0047 | Les chemins absolus restent backend-only; cette ligne n'autorise aucune fuite de source | P0 | 5 | IMPLEMENTED | Toutes propriétés essentielles cohérentes | `MVP` |
| F-024 | Copier le chemin | Presse-papiers explicite | Geste `Copier le chemin` depuis `BrainNodeRef`; chemin absolu résolu et copié côté Rust, jamais renvoyé au WebView | `TASK-0035` **VERIFIED** (`ACTION-0056`) : presse-papiers Windows réel, confinement partagé, aucun chemin absolu dans l'artefact | Action explicite seulement; capability WebView non élargie | P1 | 5 | IMPLEMENTED | Copie exacte sans journal sensible | `MVP` |
| F-025 | Ouvrir dans Explorateur | Dossier ouvert/fichier sélectionné | Présent, confinement vérifié par code | lib.rs:310 | Non rejoué dans TASK-0010 | P0 | 5 | IMPLEMENTED | Essai Windows synthétique et erreurs gérées | `MVP` |
| F-026 | Contenu du dossier | Enfants directs consultables | `map_node_children` réutilise `Index::children_page()`, page bornée à 50; `DetailsPanel` pagine sans accumuler le corpus | `TASK-0035` **VERIFIED** (`ACTION-0056`) : 4 356 enfants directs, aller-retour pagination et sélection hors projection en WebView2 réel | Aucun whole-graph DTO; curseurs liés à l'Index/révision/parent | P1 | 5 | IMPLEMENTED | Liste exacte, paginée et navigable | `MVP` |
| F-027 | Journal de changements | Créations, modifications, mouvements, renommages, suppressions | **Journal persistant par cerveau** dans le même SQLite (`change_events`, schéma v5), alimenté par la comparaison de l'Index canonique précédent et du nouveau corpus remappé par l'identité stable; cinq natures exactes; publié dans la **même transaction** que le corpus et la révision; consultable via `map_change_journal` (50 max, curseur keyset lié à l'index, filtres par nature, total exact) et panneau « Changements » | `TASK-0037` **VERIFIED** par `ACTION-0061`; `change_journal.rs`; `index.rs::publish`; `map/commands.rs::change_journal`; `ChangeJournalPanel.tsx`; preuves Rust (31 tests journal/exposition, dont des cas `#[cfg(windows)]` réels) et rejeu WebView2 réel avec vrai redémarrage (`TASK-0037-webview2.json`) | Détection **manuelle seulement** : aucun watcher (`F-030`) ni incrémental (`F-031`). L'ordre d'un lot est celui de la publication, pas la chronologie disque; l'horodatage est l'instant de **détection**. Un `MODIFIED` n'observe que taille/date de fichier et indicateurs en ligne/lien (jamais le contenu, jamais l'horodatage propre d'un dossier). `PATH_FALLBACK` renommé/déplacé = suppression + création (`DEC-0009`). Premier build et premier republish après une migration `v3` = référence sans événement | P0 | 6 | IMPLEMENTED | Événements synthétiques complets et ordonnés | `MVP` |
| F-028 | Vu/non vu | Élément/changement et tout marquer vu | **État vu/non vu persistant par cerveau, dérivé du journal** (`DEC-0036`) : watermark `seen_through_event_id` + table `seen_change_events` (schéma v6) à côté de `change_events` append-only; trois gestes — marquer un changement, marquer un élément (`BrainNodeRef`), tout marquer vu (confirmation inline) — et l'état dérivé d'un élément présent (`isNew` = `CREATED` non vu, `isUnseen` = au moins un changement non vu); baseline v5 → v6 au `MAX(event_id)` existant | `TASK-0038` **VERIFIED** par `ACTION-0064`; `change_journal.rs`; `index.rs::run_seen_state_migration`; `map/commands.rs` (`map_change_mark_seen`, `map_node_mark_seen`, `map_change_mark_all_seen`, `map_node_change_state`); `ChangeJournalPanel.tsx`; `NodeChangeState.tsx`; preuves Rust (30 tests `seen_state_tests.rs`) et rejeu WebView2 réel sur deux cerveaux avec vrai redémarrage (`TASK-0038-webview2.json`) | `nodes.seen` (prototype) reste un champ historique, ni lu ni écrit par la V1. « Tout marquer vu » vise **tout** le journal du cerveau, pas le filtre courant. Détection toujours **manuelle**; les **filtres** « nouveau / non vu » de `F-022` consommeront cette source et **ne sont pas construits** (`F-022` reste `PROPOSED`); watcher (`F-030`) et incrémental (`F-031`) hors portée. La baseline v5 → v6 veut dire « le suivi commence ici », pas « tout a été lu » | P1 | 6 | IMPLEMENTED | Persistance et commandes unitaires/globales | `MVP` |
| F-029 | Actualisation manuelle | Rafraîchir le cerveau | **Actualiser d'un Index déjà estampé = scan complet manuel → lot minimal → `apply_update_batch`** (`DEC-0039`) : scan incomplet, annulé ou en erreur ⇒ ancien Index servi, aucune écriture; échec pendant l'application ⇒ rollback exact, jamais de bascule vers un chemin complet; résumé exact (`changeSummary`); sans changement ⇒ même révision. Première indexation, restamp legacy et **Reconstruire** restent des remplacements complets explicites; le rapport porte `applicationMode` | `TASK-0041` **VERIFIED** par `ACTION-0068`; `reconcile.rs`; `map/brain_index.rs::refresh_incrementally`; 43 tests Rust (`map/refresh_incremental_tests.rs`) dont la parité aléatoire avec une publication complète, un garde SQLite qui échoue si le refresh repasse par le chemin complet, rollback par injection; rejeu WebView2 réel avec redémarrage réel (`TASK-0041-webview2.json`) | Le scan reste **complet** à chaque Actualiser (`O(corpus)`, ainsi que l'empreinte du rapport); coût sur 100 000+ nœuds non mesuré; une racine dont l'identité change est refusée explicitement (`F-032` non traité); un Index legacy sans liaison de source passe une fois par le restamp complet | P0 | 6 | IMPLEMENTED | Mise à jour sûre avec résumé de changements | `MVP` |
| F-030 | Surveillance automatique | Observer sans rescanner inutilement | **Watcher V1 propre au cœur** (`DEC-0041`) : lecteur natif `ReadDirectoryChangesExW` (`windows-sys`, aucune crate) -> **hints** bornés (file de 4 096, saturation = perte explicite) -> **W-B** (dossiers pointés relus, jamais un gros frère non concerné) ou **W-C** (le pipeline de l'Actualiser) -> `apply_update_batch`; démarrage automatique avec **W-C initial obligatoire**, cycle supplémentaire si un signal arrive pendant une réconciliation, repli périodique honnête, verrou d'écriture partagé avec Actualiser / Reconstruire; événement fermé et badge d'état | `TASK-0043` **VERIFIED** par `ACTION-0072`; `watch/`, `scope.rs`, `map/watch_ops.rs`; Rust 727 tests (W-B contre scan complet dont 90 tours aléatoires, pertes injectées dans le moteur produit, redémarrage, Actualiser concurrent), rafale de **10 000 opérations externes** = scan complet (voie ciblée et voie débordement), rejeu WebView2 réel avec redémarrage réel (`TASK-0043-webview2.json`) | Volume NTFS local d'un poste de développement seulement (réseau, FAT, cloud, USN non exercés); repli `PERIODIC` prouvé au niveau Rust; cadences produit 5 s / 30 s non attendues en réel; deux processus, crash brutal non testés; une portée est un dossier + ses entrées directes (`DEC-0041` §13, à trancher) | P0 | 6 | IMPLEMENTED | Rafales, pertes et reprise testées | `MVP` |
| F-031 | Mise à jour incrémentale | Modifier seulement les éléments touchés | **Noyau interne d'application d'un lot déjà réconcilié** (`DEC-0038`, `DEC-0010 U-B`) : `Index::apply_update_batch`, une transaction `IMMEDIATE`, une révision, identité stable réutilisée, événements du journal par le **même** `diff` que `publish`, aucune requête sans clé | `TASK-0040` **VERIFIED** par `ACTION-0067`; `incremental.rs`; 49 tests Rust (parité avec un scan complet sur 3 × 40 lots aléatoires et sur un vrai arbre disque, rollback par injection, préflight sans écriture, deux écrivains, lecteur sans lot partiel, plans `EXPLAIN` keyés); banc `incremental_bench.rs` → `TASK-0040-incremental-apply-*.json` | **Branché sur l'Actualiser manuel** (`TASK-0041` **VERIFIED** par `ACTION-0068` : `reconcile.rs` est le producteur de lot; le noyau est inchangé), et **branché sur le watcher** (`F-030`) : W-B produit des lots ciblés et W-C réutilise le scan complet seulement sur perte/doute/restart. Preuve canonique F-031 (`ACTION-0067`) : 5 campagnes × 7 échantillons, ratio médian 100k/1k à 10 changements = **1,533 ≤ 2**; l'ancienne campagne à 2,11 reste conservée comme mesure historique; coût mesuré = application seule, une machine | P0 | 6 | IMPLEMENTED | Coût proportionnel aux changements | `MVP` |
| F-032 | Indisponibilité temporaire | Conserver le dernier état fiable | **Fondation posée** (`DEC-0040`) : dernière observation de la source **par cerveau** — `UNKNOWN` / `SYNCED` / `UNAVAILABLE` / `SOURCE_CHANGED` / `SCAN_INCOMPLETE` / `APPLY_FAILED` + raison fermée, sans chemin ni identité ni message OS — écrite par le vrai Actualiser, **persistée** (`catalog_meta`), lue par `Ouvrir` **sans toucher la source**. Une racine absente, remplacée (autre identité, fichier, lien) ou un scan incomplet **conserve le dernier Index fiable** : corpus, `index_id`, révision, journal, vu / non vu et préférences intacts, **aucune suppression inventée**; le même dossier remis en place = no-op `SYNCED` | `TASK-0042` **VERIFIED dans sa portée** par `ACTION-0070`; `map/source_observation.rs`; `map_source_observation`; `SourceObservationBadge.tsx`; 33 tests Rust (`map/source_availability_tests.rs`) dont le cycle central « racine absente → aucun changement → racine remise → `SYNCED` sans événement inventé »; rejeu WebView2 réel avec redémarrage réel, source encore absente (`TASK-0042-webview2.json`) | **Détection automatique VERIFIED** depuis `TASK-0043` / `ACTION-0072` : un **garde de racine** (métadonnée + identité, jamais un scan) enregistre `UNAVAILABLE` / `SOURCE_CHANGED` par ce même contrat, sans jamais produire de suppression, et le retour de la même racine est un W-C avant l'état stable (rejeu WebView2 réel). L'état dit la **dernière** observation, pas le présent. Permission refusée, lecteur débranché et partage réseau : classés par genre d'erreur, **non fabriqués en réel**; `SCAN_INCOMPLETE` et `APPLY_FAILED` prouvés au niveau Rust seulement; un write d'observation échoué reste honnête dans la session via un fallback mémoire `persisted:false`; après redémarrage, tout record succès/échec incompatible avec la révision servie se lit `UNKNOWN`; crash réel non provoqué | P0 | 6 | IMPLEMENTED | Lecteur absent ne vide pas l'index | `MVP` |
| F-033 | Personnalisation | Nom, couleur, icône, préférences | Le runtime `MapApp` offre **« Personnaliser le cerveau »** : formulaire Nom / Couleur / Icône / Enregistrer / Annuler pour le cerveau focalisé, par le chemin existant `map_brain_update` (aucune seconde commande, aucun stockage); le `BrainRecord` **renvoyé** remplace le catalogue et le cerveau chargé, sans relecture d'Index | `TASK-0018` **VERIFIED** (`ACTION-0029`) pour le modèle, l'isolation et la persistance; `TASK-0045` **VERIFIED** (`ACTION-0075`) : Rust 753 / TypeScript 537 PASS, WebView2 réel (`TASK-0045-webview2.json`) — trois cerveaux dont deux sur **un même dossier**, édition au clavier (`Entrée` système) et à la souris, autres cerveaux bit pour bit, source / Index / journal / reprise inchangés, **fermeture et relance réelles**; **P-20 CLOSED / VERIFIED** | « Préférences » au sens large (langue `F-035`, accessibilité `F-036`, légende) **non traitées**; couleur posée sans sélecteur natif dans la preuve; une icône d'un espace reste acceptée par la borne backend existante | P1 | 7 | IMPLEMENTED | Valeurs éditables et persistantes | `MVP` |
| F-034 | Plusieurs cerveaux | Sélection et chargement indépendants | Plusieurs cerveaux chargés/composés sans fusion; cerveau actif persistant; bascule et reprise propres à chacun | `TASK-0018/0019/0020` **VERIFIED** pour catalogue/composition/relations; `TASK-0044` **VERIFIED** (`ACTION-0073`) : trois cerveaux, états distincts, deux redémarrages réels | Une **composition multi-cerveaux complète** reste session-only; cette limite relève de `P-19`, pas de l'isolation des cerveaux | P0 | 7 | IMPLEMENTED | Redémarrage et bascule restaurent chaque carte | `MVP` |
| F-035 | FR/EN | Interface bilingue persistante | Le runtime `MapApp` est **intégralement FR/EN** : une locale **globale** résolue par `src/lib/locale.ts` (choix explicite persistant, puis langue de l'hôte, puis anglais), un contrôle **Français / English** dans l'en-tête, `<html lang>` qui suit, la clé unique `filetopo.locale` écrite **seulement** sur un choix; dictionnaires `Record<Locale, …>` pour `MapApp` et chaque panneau; lignes d'état re-dites à la bascule; **aucune commande**, aucune table, aucune seconde clé, aucun paquet i18n; données utilisateur jamais traduites | `TASK-0046` **VERIFIED par `ACTION-0077`** : TypeScript 582 PASS, Rust 753 PASS; complétude automatique (mêmes clés FR/EN, feuilles identiques justifiées, gardes de source contre le français forcé); vrai `MapApp` dans les deux langues sur 39 surfaces avec balayage du français résiduel; bascule sans commande, redémarrage, storage refusé / corrompu; WebView2 réel (`TASK-0046-webview2.json`) — hôte français simulé, **fermeture et relance réelles** sur le même profil, EN par un vrai clic puis FR, zéro commande, une seule clé, état identique; **contrôle indépendant CLOSED / VERIFIED** | Hôte simulé par `--lang`; scénarios de preuve historiques (`K12`…`SR15`) supposent une locale française; cerveaux adossés à un dossier : panneaux relations / contenu / doublons « indisponible » (prouvés dans cet état); « 1 nœuds » conservé en français; partie langue de `P-19` / `P-21` acquise; `P-19` reste partiel (composition multi-cerveaux / préférences restantes) et `P-21` reste partiel pour `F-036` | P1 | 8 | IMPLEMENTED | Tests des deux langues et repli | `MVP` |
| F-036 | Accessibilité | Clavier, contraste, alternatives | Le runtime `MapApp` a été **audité dans le vrai WebView2** avec `axe-core@4.13.0` (devDependency exacte, locale) : 36 cellules (9 états × FR/EN × clair/sombre), **0 violation** après corrections (16 avant), les 74 cibles `incomplete` revues et mesurées; marches Tab / Shift+Tab réelles (646 arrêts, ordre DOM, sortie sans piège, focus **visible par pixels**, ≥ 4,71:1); 12 parcours clavier; contraste calculé sur 6 420 éléments + glyphes + champs + objets graphiques (0 échec); 13 codages avec alternative non colorée; `prefers-reduced-motion` avec sonde; invariants inchangés. Onze causes corrigées (ARIA de la carte, focus, contrastes en sombre, racine, champs); aucun Rust, aucune préférence | `TASK-0047` **VERIFIED par `ACTION-0079`** (`DEC-0045`; commit `ec22b07`) : TypeScript 618 PASS, Rust 753 PASS; `TASK-0047-baseline-webview2.json` (avant) et `TASK-0047-webview2.json` (après); six sabotages du produit réel attrapés | Pas de lecteur d'écran réel, pas de zoom / reflow; doublons / relations inter-cerveaux / pagination / « marquer vu » non exercés au clavier réel; clavier par CDP; **aucune certification WCAG générale**; `P-21` **CLOSED / VERIFIED** par `ACTION-0077` + `ACTION-0079`; `P-19` reste PARTIELLE | P1 | 8 | IMPLEMENTED | Audit automatisé WebView2 + parcours clavier/focus + contrastes + non-couleur + reduced motion, puis contrôle indépendant | `MVP` |
| F-037 | Extraction de contenu | Formats approuvés, facultatifs | Absente | aucun extracteur | Hors MVP structurel | P2 | 10 | DEFERRED | Provenance, opt-in et erreurs par format | `DIFFÉRÉ` |
| F-038 | RAG cité | Réponses avec citations et choix fournisseur | Absent | aucune dépendance IA | Facultatif | P3 | 11 | DEFERRED | Réponse locale/citée, consentement distant | `DIFFÉRÉ` |
| F-039 | GraphRAG | Seulement si besoin démontré | Absent | aucune dépendance graphe IA | Facultatif | P3 | 12 | DEFERRED | Gain mesuré après RAG fiable | `DIFFÉRÉ` |
| F-040 | Vue composée multi-cerveaux | Un ou plusieurs cerveaux indépendants dans le même graphique, sans fusion | Absent | aucun catalogue de cerveaux dans le prototype | Manquant | P1 | 7 | PROPOSED | Deux cerveaux affichés ensemble ne partagent aucun stockage ni aucun état, et chaque élément porte son cerveau d'origine | **`MVP`** (extension produit `DEC-0017`) |
| F-041 | Relations inter-cerveaux explicites | Un nœud d'un cerveau relié explicitement à un nœud d'un autre cerveau, avec provenance, sans jamais fusionner les deux | Absent | aucune relation entre cerveaux dans le prototype | Manquant | P1 | 7 | PROPOSED | Une relation `A → B` porte deux extrémités, un type et une provenance `DETERMINISTIC` ou `APPROVED`; elle survit à une reconstruction d'index; elle n'implique jamais `B → A`; et la ressemblance de noms ou de fichiers n'en crée aucune | **`MVP`** (extension produit `DEC-0018`) |
| F-042 | Repli/dépli et focus de branche | Replier ou déplier une branche du graphe, et focaliser la vue sur une branche ou un sous-ensemble, sans perdre la position dans la hiérarchie. **Primitive de navigation ET de performance** : ces gestes déterminent le contenu de la vue matérialisée — *cible précisée le 2026-09-06 par `DEC-0029` B* | Absent | aucun graphe repliable dans le prototype | Manquant | P2 | 5 | PROPOSED | Replier une branche masque **exactement** ses descendants et rien d'autre; déplier restitue l'état antérieur; le focus sur une branche n'affiche **aucun** nœud extérieur à elle et le signale en mots; les deux sont atteignables au clavier et réversibles en une action; **tout sous-arbre replié est déclaré avec son compte exact** — `P-02` amendée | **`MVP`** (promue le 2026-09-06 par `DEC-0029` B) — *valeur d'origine : **`ULTÉRIEUR`**, extension produit `DEC-0020`, « possibilité future, non promise au MVP »* |
| F-043 | Moteur de signaux et relations déterministes explicables | Des règles **nommées et versionnées** produisent des relations `DETERMINISTIC` et des suggestions, à partir de signaux observables, **sans aucun LLM** | `dre-v1`; exactement deux règles `core.*`; `content-identical` non vide et suggestion `revision` explicable; fraîcheur et reconciliation idempotente | `TASK-0024` **`VERIFIED`** (`ACTION-0041`, 2026-09-05); `DEC-0026`; `rule_engine.rs`; preuves `TASK-0024-DR15-*` et `TASK-0024-J12-*` | Implémentation vérifiée par `TASK-0024` / `ACTION-0041` | P0 | 5 | IMPLEMENTED | Chaque relation produite cite la **règle** et sa **version**; chaque suggestion est **explicable en langage ordinaire** par les signaux observés; **aucun score numérique seul** ne crée de relation établie; **contenu binaire identique** n'est jamais présenté comme « même fichier physique »; le moteur fonctionne **hors ligne, sans clé et sans compte** | **`MVP`** (extension produit `DEC-0021`) |
| F-044 | File de révision des suggestions | Une file simple — « 17 relations à confirmer » — où l'utilisateur traite oui / non / plus tard, sans ouvrir d'interface technique | File « Relations à confirmer » par cerveau, paginée, à trois actions | `TASK-0025` **`VERIFIED` par `ACTION-0042`**; `DEC-0027`; `relation_commands::review_queue`; `ReviewQueuePanel.tsx`; preuves canoniques `TASK-0025-SR15-*` scellées dans X5 | Implémentation vérifiée par `TASK-0025 / ACTION-0042`; aucun état `DEFERRED` persistant par conception | P1 | 5 | IMPLEMENTED | États **`PENDING`, `APPROVED`, `REJECTED`**, plus `DEFERRED` seulement si le besoin est démontré; activer une suggestion montre **source, cible, type proposé, pourquoi, signaux observés**; **`Confirmer`** produit une relation de provenance **`APPROVED`** et **jamais** une troisième valeur; une suggestion est distinguable d'une relation établie **sans recourir à la seule couleur** | **`MVP`** (extension produit `DEC-0021`) |
| F-045 | Mémoire des décisions humaines sur les suggestions | Une suggestion rejetée n'est pas reproposée indéfiniment à chaque scan, sans changement pertinent des données ou de la règle | État `rejected` persisté en schema v4, préservé par la reconciliation `dre-v1` | `TASK-0025` **`VERIFIED` par `ACTION-0042`**; `DEC-0027`; `RelationStore::reject`; `rejectedSuggestionPreservations`; preuves canoniques `TASK-0025-SR15-*` scellées dans X5 | Implémentation vérifiée; **aucun état `DEFERRED` persistant** en v1 et **aucune politique automatique de réévaluation** — hors scope `DEC-0021` | P1 | 6 | IMPLEMENTED | Une décision enregistre **suggestion, règle et version, extrémités, décision, date**, et l'éventuelle **cause de réévaluation**; rejouer un scan **sans changement** ne repropose **aucune** suggestion déjà rejetée; la décision **survit au redémarrage** et **n'affecte aucun autre cerveau** | **`MVP`** (extension produit `DEC-0021`) |
| F-046 | Identité de contenu et doublons exacts | Distinguer **même objet physique**, **contenu identique**, **copie probable**, **nom similaire** et **relation logique**, sans jamais les confondre | Fondation `sha256-v1` vérifiée; explorateur exact par cerveau, persistant, borné et paginé | `TASK-0023` **`VERIFIED`** (`ACTION-0039`); `TASK-0026` **`VERIFIED`** (`ACTION-0043`, 2026-09-06); `DEC-0025`, `DEC-0028`; preuves canoniques `TASK-0026-ED15-*` scellées dans X5; aucune identité physique persistante | **Reste PROPOSED** : observation exacte vérifiée et exploration exacte à l'échelle désormais **vérifiée par `TASK-0026 / ACTION-0043`**, mais « même objet physique » reste **absent** et `DEC-0013/F` toujours bloquante | P1 | 5 | PROPOSED | Deux fichiers de **hash identique** sont déclarés « contenu binaire identique » et **jamais** « même fichier physique »; l'identité d'objet, quand l'OS la donne, emploie le couple **`VolumeSerialNumber` + `FileId`** — `FileId` seul interdit, `DEC-0013`; le calcul **ne modifie aucune source** — `I-1`; deux fichiers vides identiques ne produisent **aucune** relation logique automatique | **`MVP`** (extension produit `DEC-0021`) — fondation exacte vérifiée par `TASK-0023`, exploration bornée vérifiée par `TASK-0026 / ACTION-0043`, identité physique persistante non implémentée |
| F-047 | Couche IA facultative `BYOK` | Un fournisseur choisi par l'utilisateur, avec sa propre clé, produit des **suggestions enrichies** — jamais des relations établies | Absent | aucune dépendance IA | Facultatif, jamais requis | P3 | 11 | DEFERRED | Le produit est **complet sans clé, sans compte et sans connexion**; l'architecture est **agnostique du fournisseur**; une suggestion IA porte **fournisseur, modèle, date et justification** pour l'audit; approuvée, elle devient une relation de provenance **`APPROVED`** — **aucune troisième provenance « AI »**; **rien ne sort** sans autorisation explicite, par niveaux — métadonnées, contenu, pièces jointes, OCR, aucun envoi | **`DIFFÉRÉ`** (extension produit `DEC-0022`) |
| F-048 | Identités, groupes et mode équipe | Le même modèle conceptuel représente un utilisateur seul ou plusieurs utilisateurs et groupes, sans créer deux produits | Absent | un seul utilisateur implicite | Manquant | P2 | 7 | PROPOSED | Le mode personnel emploie l'**identité de l'OS courante**, sans compte ni connexion, et **ne montre aucune trace** du mode équipe; `Identity`, `Groups`, `Brains`, `Views`, `Relations`, `Permissions` sont **un seul modèle**, pas deux; **aucun contrôleur de domaine n'est exigé** | **`ULTÉRIEUR`** (extension produit `DEC-0023`) |
| F-049 | Rendu, recherche et relations conscients des permissions | Ce qu'un utilisateur n'a pas le droit de voir ne lui est **pas divulgué**, à aucun endroit du produit | Absent | aucune notion de permission par utilisateur | Manquant | P0 | 7 | PROPOSED | Pour un objet non autorisé, l'utilisateur n'obtient **ni nom, ni chemin, ni métadonnée, ni relation, ni suggestion, ni résultat de recherche, ni compteur révélateur** — un total qui trahit par soustraction est un échec; le filtrage s'applique **avant** le rendu, la recherche et les relations, **jamais** au moment de l'ouverture; **la source reste autoritaire** et **aucun droit n'est écrit, créé ni modifié** — `I-1` | **`ULTÉRIEUR`** (extension produit `DEC-0023`) — **prérequis dur de `F-048`** |
| F-050 | Matérialisation progressive et vue bornée | Le frontend ne reçoit qu'une **vue matérialisée bornée** — focus, ancêtres nécessaires, enfants paginés, frères pertinents, relations sélectionnées, agrégats —, jamais le corpus entier. Un **budget de vue** déclaré remplace la logique « tout rendre ou refuser » | Projection produit synthétique, budget 512 entités, layout de vue | `TASK-0030` VERIFIED dans sa portée synthétique de convergence V1, par `ACTION-0047`; `DEC-0031`; tests produit 100k et WebView2 6001 physiques | Tranche synthétique contrôlée; l'acceptation produit 10k/100k/1M, la cible portable modeste et le GPU désactivé restent à établir, donc **`F-050` n'est pas `VERIFIED` globalement** | P0 | 4 | IMPLEMENTED | Le **nombre de nœuds et d'arêtes envoyés au frontend ne croît pas proportionnellement au corpus**, mesuré à 10 000, 100 000 et 1 000 000 d'éléments synthétiques; **aucun whole-graph JSON** n'est jamais sérialisé vers l'interface; le layout s'applique **à la vue matérialisée seulement**; le fonctionnement de base **ne dépend ni d'un GPU puissant ni de WebGL**; tout élément indexé reste **atteignable** en un nombre borné d'actions — `P-01` amendée | **`MVP`** (extension produit `DEC-0029` A) |
| F-051 | Agrégats et méta-nœuds exacts | Représenter un sous-ensemble **réel mais non matérialisé** sans mentir : un résumé calculé, à **compte exact** et **raison de regroupement**, expansible | Agrégats distincts, enfants directs absents exactement comptés et paginables | `TASK-0030` VERIFIED dans sa portée synthétique de convergence V1, par `ACTION-0047`; `DEC-0031`; pagination Rust 100k, activation clavier et WebView2 | Tranche synthétique contrôlée; aucun compte récursif revendiqué; l'intégration au vrai flux V1 reste à faire, donc **`F-051` n'est pas `VERIFIED` globalement** | P0 | 4 | IMPLEMENTED | Un agrégat porte un **compte exact** — jamais estimé, arrondi ni tronqué en « 999+ » — et une **provenance ou raison de regroupement** lisible; ce qu'il résume reste **atteignable**; il **n'est jamais présenté comme un dossier** — ni dans un chemin, ni à la copie de chemin, ni à l'ouverture Windows; il **ne crée aucune arête**; **dossier réel**, **agrégat FileTopo**, **communauté calculée** et **suggestion** restent **quatre natures distinctes** et ne se confondent jamais | **`MVP`** (extension produit `DEC-0029` C) — **contrepartie de véracité de `F-050`**, livrée avec elle ou pas du tout |
