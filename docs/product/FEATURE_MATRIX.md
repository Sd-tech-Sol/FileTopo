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

| Identifiant | Fonction | Comportement cible | Prototype actuel | Preuve dans le dépôt | Écart | Priorité | Phase | État | Critères d'acceptation | Baseline TASK-0011 |
|---|---|---|---|---|---|---|---|---|---|---|
| F-001 | Choix de racine | Sélecteur Windows guidé | Présent | src-tauri/src/lib.rs:136 | Flux cerveau incomplet | P0 | 2 | IMPLEMENTED | Sélection synthétique testée, annulation sûre | `MVP` |
| F-002 | Cerveau indépendant | Racine, index et état isolés | Présent mais incomplet | registry.rs:60; lib.rs:229 | Préférences et reprise manquent | P0 | 3 | PROPOSED | Deux cerveaux ne partagent aucun état | `MVP` |
| F-003 | Scan hiérarchique | Dossiers, fichiers, noms, métadonnées | Présent | scanner.rs:46 | Robustesse à étendre | P0 | 2 | IMPLEMENTED | Arbre synthétique exact, sources inchangées | `MVP` |
| F-004 | Identifiants stables | Survivre aux changements raisonnables | IDs recréés par parcours | scanner.rs:68; index.rs:85 | Instables au déplacement | P0 | 2 | PROPOSED | Renommage/déplacement corrélé sans faux positif | `MVP` |
| F-005 | Exclusions | Règles sûres, visibles et configurables | Reparse points ignorés | scanner.rs:121 | Pas de politique complète | P0 | 2 | PROPOSED | Exclusions testées et explicables | `MVP` |
| F-006 | Index reconstructible | Refaire depuis la source sans perte | Schéma versionné, remplacement complet | index.rs:70,75 | Migration/reprise à préciser | P0 | 3 | PROPOSED | Reconstruction déterministe et atomique | `MVP` |
| F-007 | Carte topographique à nœuds reliés | **Nœuds/cartes identifiables** issus de la hiérarchie réelle, reliés par des **connexions explicites** — *cible modifiée le 2026-09-02 par `DEC-0020`; classification inchangée* | `layered-tree-cards-v1`, cartes indépendantes et arêtes parent/enfant | `src-tauri/src/map/layout.rs`; `src/map/MapView.tsx` | Contrôle indépendant attendu | P0 | 4 | IMPLEMENTED | Parent/enfants lisibles sur arbres variés, **sans arête inventée ni nœud dans la mauvaise branche** — `P-02` corrigée par `P02-R1` | `MVP` |
| F-008 | Adaptation aux arbres | Disposition générique de graphe hiérarchique, **aucun algorithme imposé** — *cible modifiée le 2026-09-02 par `DEC-0020`; classification inchangée* | Layout déterministe gauche→droite, monde non comprimé | `src-tauri/src/map/layout.rs`; preuves `TASK-0022-N15-*` | `F-042` reste ultérieure | P0 | 4 | IMPLEMENTED | Les quatre fixtures — large, profonde, mixte, quasi vide — restent lisibles, **noms disponibles au zoom prévu** | `MVP` |
| F-009 | Panoramique | Déplacer la carte | Aucune preuve trouvée | TerrainMap.tsx | Manquant | P1 | 5 | PROPOSED | Souris, pavé et clavier testés | `MVP` |
| F-010 | Zoom | Zoom avant/arrière | Niveau de détail seulement | TerrainMap.tsx:77 | Pas de transformation de vue | P1 | 5 | PROPOSED | Zoom borné et centré | `MVP` |
| F-011 | Ajuster à l'écran | Cadrer carte ou sélection | Aucune preuve trouvée | TerrainMap.tsx | Manquant | P1 | 5 | PROPOSED | Toute carte peut être recadrée | `MVP` |
| F-012 | Réinitialiser la vue | Restaurer vue initiale/enregistrée | Aucune preuve trouvée | App.tsx | Manquant | P1 | 5 | PROPOSED | Commande déterministe et accessible | `MVP` |
| F-013 | Panneau latéral | Masquer/afficher sans perte | Panneau fixe | App.tsx:358 | Commande et persistance manquent | P1 | 5 | PROPOSED | État conservé au redémarrage | **`MVP`** (parité `P-12`) — *origine : `ULTÉRIEUR`* |
| F-014 | Légende | Couleurs expliquées | Légende dossiers/fichiers/en ligne | App.tsx:345 | Sémantique limitée | P1 | 5 | IMPLEMENTED | Légende accessible suit les données | `MVP` |
| F-015 | Sélection | Sélectionner un bloc | Points/liste sélectionnables | App.tsx:244; TerrainMap.tsx | Pas un bloc hiérarchique | P0 | 5 | IMPLEMENTED | Sélection synchronisée clavier/souris | `MVP` |
| F-016 | Relations hiérarchiques | Parent et enfants directs visibles | Une arête orthogonale exacte par nœud non racine; navigation parent/enfants/frères | `src/map/hierarchy.ts`; `src/map/MapView.tsx` | Contrôle indépendant attendu | P0 | 5 | IMPLEMENTED | Arêtes et panneau concordent avec l'arbre | `MVP` |
| F-017 | Relations transversales | Provenance explicite, jamais inventée | Aucun modèle observé | domain.rs | Manquant | P1 | 5 | PROPOSED | Chaque relation expose type et provenance | **`MVP`** (parité `P-04`) — *origine : `ULTÉRIEUR`* |
| F-018 | Mise en évidence | Accentuer liés, atténuer non liés | Sélection agrandit un point | TerrainMap.tsx:59 | Relations non prises en compte | P1 | 5 | PROPOSED | États visuels accessibles et testés | **`MVP`** (parité `P-06`) — *origine : `ULTÉRIEUR`* |
| F-019 | Relations entrantes/sortantes | Distinguer directions | Aucune preuve trouvée | domain.rs | Manquant | P2 | 5 | PROPOSED | Panneau et carte donnent mêmes comptes | **`MVP`** (parité `P-05`) — *origine : `ULTÉRIEUR`* |
| F-020 | Recherche nom/chemin | Recherche locale simple | Présente et paginée | index.rs:128; App.tsx:113 | Sujet/rôle absent | P0 | 5 | IMPLEMENTED | Résultats exacts, bornés et cités | `MVP` |
| F-021 | Recherche sujet/rôle | Exploiter contenu/enrichissement | Non présente | aucun extracteur | Future | P2 | 10 | DEFERRED | Sources citées, fonctionnement local | `DIFFÉRÉ` |
| F-022 | Filtres dynamiques | Tout, nouveaux, non vus et facettes | Type, en ligne, non vus | App.tsx:366 | Nouveaux et facettes manquent | P1 | 5 | PROPOSED | Filtres dérivés des données et combinables | `MVP` |
| F-023 | Détails | Chemin, dates, parent, enfants, état | Type, taille, nombre d'enfants | App.tsx:389 | Panneau insuffisant | P0 | 5 | PROPOSED | Toutes propriétés essentielles cohérentes | `MVP` |
| F-024 | Copier le chemin | Presse-papiers explicite | Aucune preuve trouvée | App.tsx | Manquant | P1 | 5 | PROPOSED | Copie exacte sans journal sensible | `MVP` |
| F-025 | Ouvrir dans Explorateur | Dossier ouvert/fichier sélectionné | Présent, confinement vérifié par code | lib.rs:310 | Non rejoué dans TASK-0010 | P0 | 5 | IMPLEMENTED | Essai Windows synthétique et erreurs gérées | `MVP` |
| F-026 | Contenu du dossier | Enfants directs consultables | Liste globale filtrée | App.tsx:378 | Vue contextuelle manque | P1 | 5 | PROPOSED | Liste exacte, paginée et navigable | `MVP` |
| F-027 | Journal de changements | Créations, modifications, mouvements, renommages, suppressions | Absent | replace_nodes dans index.rs | Manquant | P0 | 6 | PROPOSED | Événements synthétiques complets et ordonnés | `MVP` |
| F-028 | Vu/non vu | Élément/changement et tout marquer vu | Marquage d'un nœud vu | index.rs:178; App.tsx:244 | Pas changements ni tout marquer | P1 | 6 | PROPOSED | Persistance et commandes unitaires/globales | `MVP` |
| F-029 | Actualisation manuelle | Rafraîchir le cerveau | Réindexation manuelle complète | App.tsx:215 | Destructive pour l'index courant | P0 | 6 | PROPOSED | Mise à jour sûre avec résumé de changements | `MVP` |
| F-030 | Surveillance automatique | Observer sans rescanner inutilement | Absente | aucune commande watcher dans lib.rs | Manquant | P0 | 6 | PROPOSED | Rafales, pertes et reprise testées | `MVP` |
| F-031 | Mise à jour incrémentale | Modifier seulement les éléments touchés | DELETE puis réinsertion | index.rs:75-110 | À remplacer | P0 | 6 | PROPOSED | Coût proportionnel aux changements | `MVP` |
| F-032 | Indisponibilité temporaire | Conserver le dernier état fiable | Diagnostics de lecture | scanner.rs:92 | Reprise complète non prouvée | P0 | 6 | PROPOSED | Lecteur absent ne vide pas l'index | `MVP` |
| F-033 | Personnalisation | Nom, couleur, icône, préférences | Nom/couleur générés, pas d'icône | registry.rs:99-115 | Non configurable | P1 | 7 | PROPOSED | Valeurs éditables et persistantes | `MVP` |
| F-034 | Plusieurs cerveaux | Sélection et chargement indépendants | Onglets enregistrés | App.tsx:148,310 | Onglet ne charge pas l'index | P0 | 7 | PROPOSED | Redémarrage et bascule restaurent chaque carte | `MVP` |
| F-035 | FR/EN | Interface bilingue persistante | Présente | App.tsx; lib/locale.ts | Revalidation requise | P1 | 8 | IMPLEMENTED | Tests des deux langues et repli | `MVP` |
| F-036 | Accessibilité | Clavier, contraste, alternatives | Liste DOM et attributs partiels | App.tsx; TerrainMap.tsx | Audit absent | P1 | 8 | PROPOSED | Audit automatisé, clavier et manuel | `MVP` |
| F-037 | Extraction de contenu | Formats approuvés, facultatifs | Absente | aucun extracteur | Hors MVP structurel | P2 | 10 | DEFERRED | Provenance, opt-in et erreurs par format | `DIFFÉRÉ` |
| F-038 | RAG cité | Réponses avec citations et choix fournisseur | Absent | aucune dépendance IA | Facultatif | P3 | 11 | DEFERRED | Réponse locale/citée, consentement distant | `DIFFÉRÉ` |
| F-039 | GraphRAG | Seulement si besoin démontré | Absent | aucune dépendance graphe IA | Facultatif | P3 | 12 | DEFERRED | Gain mesuré après RAG fiable | `DIFFÉRÉ` |
| F-040 | Vue composée multi-cerveaux | Un ou plusieurs cerveaux indépendants dans le même graphique, sans fusion | Absent | aucun catalogue de cerveaux dans le prototype | Manquant | P1 | 7 | PROPOSED | Deux cerveaux affichés ensemble ne partagent aucun stockage ni aucun état, et chaque élément porte son cerveau d'origine | **`MVP`** (extension produit `DEC-0017`) |
| F-041 | Relations inter-cerveaux explicites | Un nœud d'un cerveau relié explicitement à un nœud d'un autre cerveau, avec provenance, sans jamais fusionner les deux | Absent | aucune relation entre cerveaux dans le prototype | Manquant | P1 | 7 | PROPOSED | Une relation `A → B` porte deux extrémités, un type et une provenance `DETERMINISTIC` ou `APPROVED`; elle survit à une reconstruction d'index; elle n'implique jamais `B → A`; et la ressemblance de noms ou de fichiers n'en crée aucune | **`MVP`** (extension produit `DEC-0018`) |
| F-042 | Repli/dépli et focus de branche | Replier ou déplier une branche du graphe, et focaliser la vue sur une branche ou un sous-ensemble, sans perdre la position dans la hiérarchie | Absent | aucun graphe repliable dans le prototype | Manquant | P2 | 5 | PROPOSED | Replier une branche masque **exactement** ses descendants et rien d'autre; déplier restitue l'état antérieur; le focus sur une branche n'affiche **aucun** nœud extérieur à elle et le signale en mots; les deux sont atteignables au clavier et réversibles en une action | **`ULTÉRIEUR`** (extension produit `DEC-0020`) — *possibilité future, non promise au MVP* |
| F-043 | Moteur de signaux et relations déterministes explicables | Des règles **nommées et versionnées** produisent des relations `DETERMINISTIC` et des suggestions, à partir de signaux observables, **sans aucun LLM** | `dre-v1`; exactement deux règles `core.*`; `content-identical` non vide et suggestion `revision` explicable; fraîcheur et reconciliation idempotente | `TASK-0024` **`VERIFIED`** (`ACTION-0041`, 2026-09-05); `DEC-0026`; `rule_engine.rs`; preuves `TASK-0024-DR15-*` et `TASK-0024-J12-*` | Implémentation vérifiée par `TASK-0024` / `ACTION-0041` | P0 | 5 | IMPLEMENTED | Chaque relation produite cite la **règle** et sa **version**; chaque suggestion est **explicable en langage ordinaire** par les signaux observés; **aucun score numérique seul** ne crée de relation établie; **contenu binaire identique** n'est jamais présenté comme « même fichier physique »; le moteur fonctionne **hors ligne, sans clé et sans compte** | **`MVP`** (extension produit `DEC-0021`) |
| F-044 | File de révision des suggestions | Une file simple — « 17 relations à confirmer » — où l'utilisateur traite oui / non / plus tard, sans ouvrir d'interface technique | File « Relations à confirmer » par cerveau, paginée, à trois actions | `TASK-0025` **`VERIFIED` par `ACTION-0042`**; `DEC-0027`; `relation_commands::review_queue`; `ReviewQueuePanel.tsx`; preuves canoniques `TASK-0025-SR15-*` scellées dans X5 | Implémentation vérifiée par `TASK-0025 / ACTION-0042`; aucun état `DEFERRED` persistant par conception | P1 | 5 | IMPLEMENTED | États **`PENDING`, `APPROVED`, `REJECTED`**, plus `DEFERRED` seulement si le besoin est démontré; activer une suggestion montre **source, cible, type proposé, pourquoi, signaux observés**; **`Confirmer`** produit une relation de provenance **`APPROVED`** et **jamais** une troisième valeur; une suggestion est distinguable d'une relation établie **sans recourir à la seule couleur** | **`MVP`** (extension produit `DEC-0021`) |
| F-045 | Mémoire des décisions humaines sur les suggestions | Une suggestion rejetée n'est pas reproposée indéfiniment à chaque scan, sans changement pertinent des données ou de la règle | État `rejected` persisté en schema v4, préservé par la reconciliation `dre-v1` | `TASK-0025` **`VERIFIED` par `ACTION-0042`**; `DEC-0027`; `RelationStore::reject`; `rejectedSuggestionPreservations`; preuves canoniques `TASK-0025-SR15-*` scellées dans X5 | Implémentation vérifiée; **aucun état `DEFERRED` persistant** en v1 et **aucune politique automatique de réévaluation** — hors scope `DEC-0021` | P1 | 6 | IMPLEMENTED | Une décision enregistre **suggestion, règle et version, extrémités, décision, date**, et l'éventuelle **cause de réévaluation**; rejouer un scan **sans changement** ne repropose **aucune** suggestion déjà rejetée; la décision **survit au redémarrage** et **n'affecte aucun autre cerveau** | **`MVP`** (extension produit `DEC-0021`) |
| F-046 | Identité de contenu et doublons exacts | Distinguer **même objet physique**, **contenu identique**, **copie probable**, **nom similaire** et **relation logique**, sans jamais les confondre | Fondation `sha256-v1` vérifiée; explorateur exact par cerveau, persistant, borné et paginé | `TASK-0023` **`VERIFIED`** (`ACTION-0039`); `TASK-0026` **`VERIFIED`** (`ACTION-0043`, 2026-09-06); `DEC-0025`, `DEC-0028`; preuves canoniques `TASK-0026-ED15-*` scellées dans X5; aucune identité physique persistante | **Reste PROPOSED** : observation exacte vérifiée et exploration exacte à l'échelle désormais **vérifiée par `TASK-0026 / ACTION-0043`**, mais « même objet physique » reste **absent** et `DEC-0013/F` toujours bloquante | P1 | 5 | PROPOSED | Deux fichiers de **hash identique** sont déclarés « contenu binaire identique » et **jamais** « même fichier physique »; l'identité d'objet, quand l'OS la donne, emploie le couple **`VolumeSerialNumber` + `FileId`** — `FileId` seul interdit, `DEC-0013`; le calcul **ne modifie aucune source** — `I-1`; deux fichiers vides identiques ne produisent **aucune** relation logique automatique | **`MVP`** (extension produit `DEC-0021`) — fondation exacte vérifiée par `TASK-0023`, exploration bornée vérifiée par `TASK-0026 / ACTION-0043`, identité physique persistante non implémentée |
| F-047 | Couche IA facultative `BYOK` | Un fournisseur choisi par l'utilisateur, avec sa propre clé, produit des **suggestions enrichies** — jamais des relations établies | Absent | aucune dépendance IA | Facultatif, jamais requis | P3 | 11 | DEFERRED | Le produit est **complet sans clé, sans compte et sans connexion**; l'architecture est **agnostique du fournisseur**; une suggestion IA porte **fournisseur, modèle, date et justification** pour l'audit; approuvée, elle devient une relation de provenance **`APPROVED`** — **aucune troisième provenance « AI »**; **rien ne sort** sans autorisation explicite, par niveaux — métadonnées, contenu, pièces jointes, OCR, aucun envoi | **`DIFFÉRÉ`** (extension produit `DEC-0022`) |
| F-048 | Identités, groupes et mode équipe | Le même modèle conceptuel représente un utilisateur seul ou plusieurs utilisateurs et groupes, sans créer deux produits | Absent | un seul utilisateur implicite | Manquant | P2 | 7 | PROPOSED | Le mode personnel emploie l'**identité de l'OS courante**, sans compte ni connexion, et **ne montre aucune trace** du mode équipe; `Identity`, `Groups`, `Brains`, `Views`, `Relations`, `Permissions` sont **un seul modèle**, pas deux; **aucun contrôleur de domaine n'est exigé** | **`ULTÉRIEUR`** (extension produit `DEC-0023`) |
| F-049 | Rendu, recherche et relations conscients des permissions | Ce qu'un utilisateur n'a pas le droit de voir ne lui est **pas divulgué**, à aucun endroit du produit | Absent | aucune notion de permission par utilisateur | Manquant | P0 | 7 | PROPOSED | Pour un objet non autorisé, l'utilisateur n'obtient **ni nom, ni chemin, ni métadonnée, ni relation, ni suggestion, ni résultat de recherche, ni compteur révélateur** — un total qui trahit par soustraction est un échec; le filtrage s'applique **avant** le rendu, la recherche et les relations, **jamais** au moment de l'ouverture; **la source reste autoritaire** et **aucun droit n'est écrit, créé ni modifié** — `I-1` | **`ULTÉRIEUR`** (extension produit `DEC-0023`) — **prérequis dur de `F-048`** |
