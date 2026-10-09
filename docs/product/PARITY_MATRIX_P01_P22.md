<!-- Généré par scripts/task0056-render-matrix.py depuis
     docs/product/parity-matrix-p01-p22.json. Ne pas éditer à la main :
     éditer le JSON, puis réexécuter le rendu. -->

# Matrice de preuve P-01..P-22 — établie par TASK-0056, corrigée par TASK-0057

- **Date :** 2026-10-08
- **Tâche :** `TASK-0057`
- **Branche :** `build/v0.2-a41-v1-real-root-relations`
- **Base :** `ca17df50d1fa904e8387628347bbf2f9792b9ae8`
- **Contrat de référence :** [CARTETOPO_FUNCTIONAL_PARITY.md](CARTETOPO_FUNCTIONAL_PARITY.md)
- **Nature :** matrice établie par TASK-0056 (acceptance, aucun code produit modifié), mise à jour par TASK-0057 après la correction du seul blocage qu'elle avait trouvé : la surface des relations refusait une racine réelle. Les preuves composées sont inchangées; seules les trois lignes concernées et la campagne runtime finale sont refaites au `HEAD` corrigé.
- **Preuve runtime finale :** `docs/performance/runs/TASK-0057-p22-webview2.json`
- **Verdict d'ensemble de `TASK-0057` :** **SATISFIED** — aucun sous-critère nommé sans preuve

> **Constat d'ensemble.** TASK-0056 a établi cette matrice et a trouvé **un** manque : sur un cerveau dont la source est un vrai dossier, la surface des relations était inatteignable, ce que le contrat §3 règle 2 assimile à la suppression de `P-04`, `P-05` et `P-07`. TASK-0057 a corrigé ce seul point sous `DEC-0053`, sans toucher au modèle des relations, au catalogue de règles, au moteur déterministe ni aux relations inter-cerveaux, et la campagne finale a été rejouée au `HEAD` corrigé : les trois exigences sont désormais exercées **sur une racine réelle**, et l'empreinte externe de la source est restée identique. Aucune exigence n'est fermée ici. `P-05` à `P-18` et `P-22` restent candidates au contrôle indépendant; les seuils lourds restent composés depuis leurs campagnes `VERIFIED` propres, nommées ligne par ligne.

> **Autorité.** Cette matrice ne ferme AUCUNE exigence. L'exécuteur ne s'attribue pas VERIFIED : chaque verdict ci-dessous est au mieux une candidature au contrôle indépendant.

## Comment lire ce document

| Valeur | Sens |
|---|---|
| `SATISFIED` | chaque sous-critère nommé par le texte courant possède une preuve indépendante, et la campagne finale l'a exercé dans le vrai moteur |
| `GAP` | un sous-critère nommé n'a aucune preuve indépendante |
| `NOT_APPLICABLE` | le contrat lui-même l'autorise |
| `CLOSED/VERIFIED` | clôture formelle déjà inscrite dans le contrat de parité |
| `CANDIDATE` | candidate à la fermeture par contrôle indépendant; jamais fermée par l'exécuteur |

La campagne finale P-22, rejouée au `HEAD` corrigé avec le harnais que TASK-0056 a construit. Son tableau `coverage` porte au moins une ligne par exigence P-01..P-22, avec l'observation faite dans le vrai Tauri/WebView2. Les lignes citées ci-dessous par `runtimeRows` sont celles de ce tableau. La campagne de TASK-0056, `docs/performance/runs/TASK-0056-p22-webview2.json`, reste le relevé historique de ce qu'elle avait mesuré, blocage compris.

## 1. Tableau de synthèse

| # | Exigence | Fonctions propriétaires | État courant | Fermée par | Verdict TASK-0057 |
|---|---|---|---|---|---|
| `P-01` | Carte construite depuis l'arborescence réelle (amendée par P-SCALE-R1) | `F-001`, `F-003`, `F-006`, `F-007`, `F-050`, `F-051` | `CLOSED/VERIFIED` | ACTION-0101 (2026-10-07) | **SATISFIED** |
| `P-02` | Hiérarchie lisible et non ambiguë (corrigée par P02-R1, amendée par P-SCALE-R1) | `F-007`, `F-008`, `F-042`, `F-050`, `F-051` | `CLOSED/VERIFIED` | ACTION-0101 (2026-10-07) | **SATISFIED** |
| `P-03` | Parent et enfants directs (amendée par P-SCALE-R1) | `F-016`, `F-050`, `F-051` | `CLOSED/VERIFIED` | ACTION-0101 (2026-10-07) | **SATISFIED** |
| `P-04` | Relations transversales explicites, avec provenance | `F-017` | `CLOSED/VERIFIED` | ACTION-0094 (2026-10-05) | **SATISFIED** |
| `P-05` | Relations entrantes et sortantes distinguées | `F-019` | `CANDIDATE` | — | **SATISFIED** |
| `P-06` | Sélection, accentuation des liés, atténuation du reste | `F-015`, `F-018` | `CANDIDATE` | — | **SATISFIED** |
| `P-07` | Panneau des relations | `F-016`, `F-017`, `F-019` | `CANDIDATE` | — | **SATISFIED** |
| `P-08` | Recherche | `F-020` | `CANDIDATE` | — | **SATISFIED** |
| `P-09` | Filtres | `F-022` | `CANDIDATE` | — | **SATISFIED** |
| `P-10` | Légende | `F-014` | `CANDIDATE` | — | **SATISFIED** |
| `P-11` | Panoramique, zoom, ajuster à l'écran, réinitialiser | `F-009`, `F-010`, `F-011`, `F-012` | `CANDIDATE` | — | **SATISFIED** |
| `P-12` | Panneau de détails masquable | `F-013`, `F-023` | `CANDIDATE` | — | **SATISFIED** |
| `P-13` | Contenu direct d'un dossier | `F-026` | `CANDIDATE` | — | **SATISFIED** |
| `P-14` | Copier le chemin | `F-024` | `CANDIDATE` | — | **SATISFIED** |
| `P-15` | Ouvrir dans l'Explorateur | `F-025` | `CANDIDATE` | — | **SATISFIED** |
| `P-16` | Détection et historique des changements | `F-027`, `F-030` | `CANDIDATE` | — | **SATISFIED** |
| `P-17` | Nouveaux, non vus, marquer vu, tout marquer vu | `F-022`, `F-028` | `CANDIDATE` | — | **SATISFIED** |
| `P-18` | Actualisation manuelle et surveillance incrémentale | `F-029`, `F-030`, `F-031` | `CANDIDATE` | — | **SATISFIED** |
| `P-19` | Persistance des préférences et de l'état | `F-012`, `F-013`, `F-022`, `F-033`, `F-034`, `F-052` | `CLOSED/VERIFIED` | ACTION-0099 (2026-10-07) | **SATISFIED** |
| `P-20` | Plusieurs cerveaux indépendants | `F-002`, `F-033`, `F-034` | `CLOSED/VERIFIED` | ACTION-0075 (2026-09-25) | **SATISFIED** |
| `P-21` | FR/EN et accessibilité | `F-035`, `F-036` | `CLOSED/VERIFIED` | ACTION-0079 (2026-09-26) | **SATISFIED** |
| `P-22` | Aucun changement physique des fichiers analysés | `I-1`, `I-2`, `F-003` | `CANDIDATE` | — | **SATISFIED** |

**Déjà fermées formellement :** `P-01`, `P-02`, `P-03`, `P-04`, `P-19`, `P-20`, `P-21`.

**Candidates à la fermeture par contrôle indépendant :** `P-05`, `P-06`, `P-07`, `P-08`, `P-09`, `P-10`, `P-11`, `P-12`, `P-13`, `P-14`, `P-15`, `P-16`, `P-17`, `P-18`, `P-22`. Aucune n'est fermée par cette tâche.

## 2. Exigence par exigence

### `P-01` — Carte construite depuis l'arborescence réelle (amendée par P-SCALE-R1)

- **Fonctions propriétaires :** `F-001`, `F-003`, `F-006`, `F-007`, `F-050`, `F-051`
- **État courant :** `CLOSED/VERIFIED`, fermée par **ACTION-0101 (2026-10-07)**
- **Verdict de `TASK-0057` :** **SATISFIED**
- **Régression postérieure à la clôture :** aucune : les seules livraisons postérieures sont TASK-0055 (identité physique, VERIFIED par ACTION-0104) et TASK-0056 (acceptance sans code produit). La campagne finale a réexercé le critère et retrouvé l'index égal au disque élément par élément.

**Sous-critères du texte courant, un par un :**

- sur quatre arbres de formes différentes, l'ensemble des nœuds indexés égale l'ensemble attendu
- chaque élément indexé est atteignable en un nombre borné et déclaré d'actions
- la vue rendue est un sous-ensemble déclaré de l'index
- aucun élément affiché absent de la source, aucun élément de la source absent sans agrégat exact ou motif affiché
- choisir une racine suffit : aucune configuration préalable, aucune catégorie codée en dur

**Preuves indépendantes :**

- TASK-0022/ACTION-0036 — quatre formes d'arbre, hiérarchie exacte nœud par nœud
- TASK-0030/ACTION-0047 — Index canonique et projection bornée
- TASK-0031/ACTION-0048 — ouvrir/actualiser/reconstruire séparés (F-001)
- TASK-0032/ACTION-0049 — première racine réelle contrôlée, sans sélecteur de dossier
- TASK-0049/ACTION-0084 — index reconstructible (F-006)
- TASK-0054/ACTION-0101 — 10k/100k/1M indexés, atteignabilité exhaustive, agrégats exacts

**Limites, écrites plutôt que corrigées en silence :**

- les chiffres d'échelle viennent d'un banc de développement; réserve R8 en vigueur, aucune performance publiée
- une profondeur de focus supérieure à 256 est refusée proprement et déclarée

**Preuve runtime de la campagne finale :**

- *(phase 1)* the map was built from the real tree alone; the Index equals the disk element for element, and a row absent from the bounded first view was reached by two real gestures (type, click)

### `P-02` — Hiérarchie lisible et non ambiguë (corrigée par P02-R1, amendée par P-SCALE-R1)

- **Fonctions propriétaires :** `F-007`, `F-008`, `F-042`, `F-050`, `F-051`
- **État courant :** `CLOSED/VERIFIED`, fermée par **ACTION-0101 (2026-10-07)**
- **Verdict de `TASK-0057` :** **SATISFIED**
- **Régression postérieure à la clôture :** aucune. La campagne finale a recomparé, pour chaque nœud dessiné, le parent et le compte d'enfants directs au disque, et chaque arête de hiérarchie affichée à sa contrepartie réelle.

**Sous-critères du texte courant, un par un :**

- (1) ensemble de nœuds matérialisés sous-ensemble exact de l'index, sans ajout
- (2) parent exact pour chaque nœud matérialisé
- (3) enfants directs exacts, ou agrégat exact déclaré à leur place
- (4) aucune arête hiérarchique inventée
- (5) aucun nœud attribué à la mauvaise branche
- (6) labels disponibles au niveau de zoom prévu, une indisponibilité étant déclarée
- (7) navigation souris ET clavier, sans piège
- (8) hiérarchie compréhensible sans la couleur seule
- (9) tout repli ou agrégat déclaré en mots
- (10) son compte exact, jamais estimé, arrondi ni tronqué
- (11) un agrégat n'est jamais présenté comme un dossier

**Preuves indépendantes :**

- TASK-0022/ACTION-0036 — les onze contrôles de structure sur quatre formes d'arbre, souris et clavier
- TASK-0033/ACTION-0051 — acceptance produit de la projection topographique dans WebView2
- TASK-0052/ACTION-0097 — repli/dépli et focus de branche, compte exact des descendants masqués (F-042)
- TASK-0054/ACTION-0101 — agrégats exacts contre un oracle indépendant, jamais un faux dossier
- TASK-0047/ACTION-0079 — alternative non colorée, focus visible, parcours clavier sans piège

**Limites, écrites plutôt que corrigées en silence :**

- aucun algorithme de disposition n'est imposé par le contrat et aucun n'est jugé ici
- la dernière page d'un agrégat reboucle sur la première : déclaré depuis TASK-0054

**Preuve runtime de la campagne finale :**

- *(phase 1)* on the view the brain opens with, every drawn node is a real element of the source, its parent and its direct-children count equal the disk, every hierarchy edge on screen has a real parent/child counterpart, and every card carries its label
- *(phase 1)* a real Enter on the aggregate paged every real child of the wide folder exactly once; the label is the exact count of what the page does not show, it is a tree item and no path resolves to it

### `P-03` — Parent et enfants directs (amendée par P-SCALE-R1)

- **Fonctions propriétaires :** `F-016`, `F-050`, `F-051`
- **État courant :** `CLOSED/VERIFIED`, fermée par **ACTION-0101 (2026-10-07)**
- **Verdict de `TASK-0057` :** **SATISFIED**
- **Régression postérieure à la clôture :** aucune. La campagne finale a paginé les 150 enfants réels d'un dossier large sans en perdre un, sans afficher un seul petit-enfant, et a marché parent/enfant au clavier.

**Sous-critères du texte courant, un par un :**

- le parent affiché égale celui de l'index, pour chaque nœud
- l'ensemble des enfants directs atteignables par pagination ou expansion égale celui de l'index
- la pagination ne fait disparaître aucun enfant réel et son total annoncé est exact
- aucun lien affiché sans contrepartie dans l'arborescence
- le déplacement vers le parent et vers chaque enfant reste possible à la souris et au clavier, y compris au-delà de la première page

**Preuves indépendantes :**

- TASK-0022/ACTION-0036 — parent et enfants directs exacts pour chaque nœud
- TASK-0035/ACTION-0056 — page d'enfants directs exacte, bornée à 50, curseur keyset lié à l'index et à la révision, pile de curseurs pour le retour
- TASK-0054/ACTION-0101 — atteignabilité exhaustive par les primitives bornées

**Limites, écrites plutôt que corrigées en silence :**

- le total annoncé vient de la colonne durable `child_count`, jamais d'un COUNT(*) : c'est une propriété de l'index, contrôlée comme telle

**Preuve runtime de la campagne finale :**

- *(phase 1)* the details panel announced the exact total of direct children and paged through all of them without losing one; not a single grandchild appeared; the parent and a child were reached with real arrow keys on the canvas

### `P-04` — Relations transversales explicites, avec provenance

- **Fonctions propriétaires :** `F-017`
- **État courant :** `CLOSED/VERIFIED`, fermée par **ACTION-0094 (2026-10-05)**
- **Verdict de `TASK-0057` :** **SATISFIED**
- **Régression postérieure à la clôture :** La clôture `ACTION-0094` reposait sur des preuves prises sur cerveaux synthétiques, et la campagne de TASK-0056 a montré que la surface refusait une racine réelle : TASK-0056 a rapporté que cette clôture **ne couvrait pas** une racine réelle, sans la révoquer. TASK-0057 a corrigé la cause. La campagne du `HEAD` corrigé exerce la révocation d'une relation `APPROVED` sur une racine réelle, et une relation `DETERMINISTIC` y est toujours refusée par son nom. Confirmer que la clôture couvre désormais les deux genres de source appartient au contrôle indépendant.

> **Correction.** MANQUE TROUVÉ PAR TASK-0056, CORRIGÉ PAR TASK-0057 sous `DEC-0053`. Les six actions génériques d'un même cerveau — ouvrir, relations d'un nœud, file de révision, approuver, rejeter, révoquer — ne passent plus par `BrainRecord::source_fixture()`, qui refusait un vrai dossier par son nom. Elles résolvent la source par `generic_source_spec`, qui rend `None` pour une racine réelle : une réponse, pas un refus. Le périmètre `TASK-0017` figé et l'auto-contrôle gelé restent synthétiques, et `map_relations_self_check` refuse toujours une racine réelle, par son nom. Le champ `fixtureId` des trois DTO génériques vaut `null` sur une racine réelle et ne porte ni chemin, ni empreinte de chemin, ni substitut. La campagne finale du `HEAD` corrigé exerce les trois exigences **sur la racine réelle**, avec le moteur réel et les vrais gestes : relation déterministe avec sa règle et sa provenance en mots, comptes entrants et sortants confrontés à deux lectures séparées du dépôt, suggestion jamais comptée, file ouverte, approbation au clavier, révocation, rejet, puis persistance à travers un vrai redémarrage. L'arbitrage final reste au contrôle indépendant : l'exécuteur ne s'attribue pas `VERIFIED`.

**Sous-critères du texte courant, un par un :**

- une relation établie expose son type et sa provenance, `déterministe` ou `approuvée`, sans troisième valeur
- le modèle rend une relation sans provenance non représentable
- une suggestion est un objet distinct, portant son propre état, jamais comptée comme relation avant approbation
- suggestion et relation établie distinguables sans recourir à la seule couleur
- une fixture qui tente d'insérer une relation sans provenance, ou de faire passer une suggestion pour une relation, est rejetée avec un motif
- toute relation approuvée par l'utilisateur est révocable par lui (§5.2)

**Preuves indépendantes :**

- TASK-0017/ACTION-0027 puis le re-contrôle X3/X4 — la provenance est la table, pas une colonne; cinq tentatives invalides rejetées avec le motif gelé; 0 inverse inventé; 0 suggestion dans un compte de relations établies
- TASK-0020/ACTION-0032 — relations inter-cerveaux explicites, deux extrémités de deux cerveaux
- TASK-0024/ACTION-0041 — moteur déterministe `dre-v1` : règle nommée et versionnée, aucune relation issue d'un score seul
- TASK-0025/ACTION-0042 — file de révision et mémoire des décisions humaines
- TASK-0051/ACTION-0094 — révocation de toute relation APPROVED, intra et inter, y compris quand l'état devient STALE

**Limites, écrites plutôt que corrigées en silence :**

- les relations DETERMINISTIC ne sont pas révocables par ce geste : elles disparaissent quand la règle ne les produit plus. Déclaré par ACTION-0094
- Exercée dans la campagne finale du `HEAD` corrigé sur un cerveau `REAL_ROOT` — le genre de source que `DEC-0033` A fait seule entrée d'une arborescence personnelle — et confrontée sur le cerveau `SYNTHETIC_FIXTURE` figé, dont le comportement historique est inchangé.

**Preuve runtime de la campagne finale :**

- *(phase 1)* on the brain whose source is a real folder, a content campaign then a real « Analyser » produced established relations whose type and provenance are on screen in words and glyphs (never colour alone), with the rule and version of the deterministic one consultable; a suggestion was shown as a distinct, explained object with its own state, was counted in neither direction before approval, was never a provenance of an established relation, and the model's own refusals were re-exercised on the frozen fixture
- *(phase 2)* after a real close and relaunch of the process, the relations of the REAL_ROOT brain came back from its own store: the deterministic relations, the revocation and the rejection all survived, no legacy relation was seeded, and the fixture diagnostic is still null

### `P-05` — Relations entrantes et sortantes distinguées

- **Fonctions propriétaires :** `F-019`
- **État courant :** `CANDIDATE`
- **Verdict de `TASK-0057` :** **SATISFIED**

> **Correction.** MANQUE TROUVÉ PAR TASK-0056, CORRIGÉ PAR TASK-0057 sous `DEC-0053`. Les six actions génériques d'un même cerveau — ouvrir, relations d'un nœud, file de révision, approuver, rejeter, révoquer — ne passent plus par `BrainRecord::source_fixture()`, qui refusait un vrai dossier par son nom. Elles résolvent la source par `generic_source_spec`, qui rend `None` pour une racine réelle : une réponse, pas un refus. Le périmètre `TASK-0017` figé et l'auto-contrôle gelé restent synthétiques, et `map_relations_self_check` refuse toujours une racine réelle, par son nom. Le champ `fixtureId` des trois DTO génériques vaut `null` sur une racine réelle et ne porte ni chemin, ni empreinte de chemin, ni substitut. La campagne finale du `HEAD` corrigé exerce les trois exigences **sur la racine réelle**, avec le moteur réel et les vrais gestes : relation déterministe avec sa règle et sa provenance en mots, comptes entrants et sortants confrontés à deux lectures séparées du dépôt, suggestion jamais comptée, file ouverte, approbation au clavier, révocation, rejet, puis persistance à travers un vrai redémarrage. L'arbitrage final reste au contrôle indépendant : l'exécuteur ne s'attribue pas `VERIFIED`.

**Sous-critères du texte courant, un par un :**

- les comptes entrants et sortants du panneau coïncident exactement avec ceux de l'index
- les comptes entrants et sortants de la carte coïncident exactement avec ceux de l'index
- la distinction est perceptible sans recourir à la seule couleur

**Preuves indépendantes :**

- TASK-0017/ACTION-0027 + re-contrôle AA — critère gelé J : 12/12 nœuds conformes à l'attendu, comptes du panneau et de la carte confrontés à l'index, 0 inverse inventé, 0 suggestion comptée
- TASK-0020/ACTION-0032 — directions des relations inter-cerveaux, une extrémité par cerveau, aucun inverse impliqué
- TASK-0024/ACTION-0041 — le moteur produit des relations dirigées (`revision`) et des relations symétriques (`content-identical`), distinctement
- TASK-0047/ACTION-0079 — alternative non colorée pour chaque codage : la direction est portée par une tête de flèche pleine et un glyphe, le type par un mot
- TASK-0051/ACTION-0094 — les comptes restent justes après révocation

**Limites, écrites plutôt que corrigées en silence :**

- une suggestion n'entre dans aucun compte : c'est le contrat, pas une limite, mais il faut le lire ainsi quand on compare un total à l'écran
- Exercée dans la campagne finale du `HEAD` corrigé sur un cerveau `REAL_ROOT` — le genre de source que `DEC-0033` A fait seule entrée d'une arborescence personnelle — et confrontée sur le cerveau `SYNTHETIC_FIXTURE` figé, dont le comportement historique est inchangé.
- La moitié « carte » de l'exigence est jugée à deux côtés, parce que la vue est bornée : `relationSegments` ne dessine une arête que si ses **deux** extrémités sont matérialisées. Dans la campagne du `HEAD` corrigé, le nœud observé avait 1 relation sortante dont l'extrémité n'était pas dessinée : la carte en a donc dessiné 0, ce qui est exact, et les 3 relations du cerveau dont une extrémité manquait sont nommées une par une dans la région « extrémités hors de la vue courante », chacune avec son contrôle pour l'amener à l'écran. La campagne ne montre donc PAS une arête dessinée confrontée à l'index : elle montre que la carte dessine exactement ce qu'elle peut dessiner et ne perd rien. La confrontation panneau/index, elle, est exacte.

**Preuve runtime de la campagne finale :**

- *(phase 1)* the incoming and outgoing counts shown by the PANEL and drawn on the MAP both equal the Index's for the same node of a REAL_ROOT brain, read from two separate store queries; the direction is carried by a glyph, a heading and a filled arrow head rather than by colour; approving a suggestion with the real keyboard added exactly one established relation — outgoing on its source and incoming on its target — and revoking it took exactly that one back

### `P-06` — Sélection, accentuation des liés, atténuation du reste

- **Fonctions propriétaires :** `F-015`, `F-018`
- **État courant :** `CANDIDATE`
- **Verdict de `TASK-0057` :** **SATISFIED**

**Sous-critères du texte courant, un par un :**

- la sélection est possible à la souris et au clavier
- carte et liste sémantique désignent le même nœud à tout instant
- « accentué » et « atténué » distinguables sans recourir à la seule couleur
- la sélection n'altère aucune donnée de l'index
- l'information atténuée reste lisible et atteignable

**Preuves indépendantes :**

- TASK-0016/ACTION-0026 — la sélection et la liste sémantique désignent le même nœud (critères H gelés)
- TASK-0022/ACTION-0036 — sélection souris ET clavier sur quatre formes d'arbre; voisinage hiérarchique accentué, reste atténué
- TASK-0033/ACTION-0051 — acceptance produit de l'accentuation dans WebView2
- TASK-0047/ACTION-0079 — contrastes, focus visible, alternative non colorée, rien d'effacé ni d'inatteignable

**Limites, écrites plutôt que corrigées en silence :**

- l'accentuation porte sur le voisinage hiérarchique et les relations du nœud; elle ne prétend pas accentuer un voisinage transitif

**Preuve runtime de la campagne finale :**

- *(phase 1)* the same element was selected with the mouse and with the keyboard, the canvas and the semantic tree name the same node, the emphasised and dimmed states are named tokens rather than colours, nothing dimmed is erased or unreachable, and no Index value moved

### `P-07` — Panneau des relations

- **Fonctions propriétaires :** `F-016`, `F-017`, `F-019`
- **État courant :** `CANDIDATE`
- **Verdict de `TASK-0057` :** **SATISFIED**

> **Correction.** MANQUE TROUVÉ PAR TASK-0056, CORRIGÉ PAR TASK-0057 sous `DEC-0053`. Les six actions génériques d'un même cerveau — ouvrir, relations d'un nœud, file de révision, approuver, rejeter, révoquer — ne passent plus par `BrainRecord::source_fixture()`, qui refusait un vrai dossier par son nom. Elles résolvent la source par `generic_source_spec`, qui rend `None` pour une racine réelle : une réponse, pas un refus. Le périmètre `TASK-0017` figé et l'auto-contrôle gelé restent synthétiques, et `map_relations_self_check` refuse toujours une racine réelle, par son nom. Le champ `fixtureId` des trois DTO génériques vaut `null` sur une racine réelle et ne porte ni chemin, ni empreinte de chemin, ni substitut. La campagne finale du `HEAD` corrigé exerce les trois exigences **sur la racine réelle**, avec le moteur réel et les vrais gestes : relation déterministe avec sa règle et sa provenance en mots, comptes entrants et sortants confrontés à deux lectures séparées du dépôt, suggestion jamais comptée, file ouverte, approbation au clavier, révocation, rejet, puis persistance à travers un vrai redémarrage. L'arbitrage final reste au contrôle indépendant : l'exécuteur ne s'attribue pas `VERIFIED`.

**Sous-critères du texte courant, un par un :**

- pour chaque nœud, le contenu du panneau égale l'ensemble des relations de l'index pour ce nœud
- chaque entrée porte type, direction et provenance
- chaque entrée est atteignable au clavier
- sélectionner une entrée sélectionne l'élément visé sur la carte
- les relations sont groupées par nature et par direction

**Preuves indépendantes :**

- TASK-0017/ACTION-0027 + re-contrôle AA — panneau confronté à l'index nœud par nœud; type, direction et provenance présents; parcours du panneau
- TASK-0020/ACTION-0032 — panneau des relations inter-cerveaux et navigation vers l'autre cerveau
- TASK-0024/ACTION-0041 — explication en langage ordinaire, règle et version affichées
- TASK-0025/ACTION-0042 — file de révision : source, cible, type proposé, pourquoi, signaux
- TASK-0051/ACTION-0094 — révocation depuis le panneau, focus restauré après l'acte
- TASK-0047/ACTION-0079 — accessibilité du panneau

**Limites, écrites plutôt que corrigées en silence :**

- TASK-0017 avait déclaré que l'activation au clavier d'une entrée de panneau n'avait pas été jouée par une frappe de confiance. La campagne finale la joue avec un vrai `Input.dispatchKeyEvent` : la limite historique est levée par observation, pas par déclaration
- Exercée dans la campagne finale du `HEAD` corrigé sur un cerveau `REAL_ROOT` — le genre de source que `DEC-0033` A fait seule entrée d'une arborescence personnelle — et confrontée sur le cerveau `SYNTHETIC_FIXTURE` figé, dont le comportement historique est inchangé.

**Preuve runtime de la campagne finale :**

- *(phase 1)* on a REAL_ROOT brain the relations panel is available and lists the selected element's relations grouped by nature and direction, each entry carrying its type, direction and provenance and an enabled control the real keyboard activated to select the endpoint it names; the review queue opened on the same brain, named what was pending and why, and a rejection removed it from the queue without creating any relation

### `P-08` — Recherche

- **Fonctions propriétaires :** `F-020`
- **État courant :** `CANDIDATE`
- **Verdict de `TASK-0057` :** **SATISFIED**

**Sous-critères du texte courant, un par un :**

- sur une fixture de 100 000 nœuds, une requête retourne exactement l'ensemble attendu
- le résultat est paginé et borné
- aucun résultat hors du cerveau actif
- les résultats sont atteignables au clavier et sélectionnent sur la carte
- retrouver un élément sans quitter la carte

**Preuves indépendantes :**

- TASK-0029/ACTION-0046 — fondation de requête bornée, 100 000 nœuds, page bornée, aucun dump du corpus
- TASK-0034/ACTION-0055 — `map_search_nodes` sur l'Index canonique, page bornée à 50, requête vide coupée, DTO sans chemin absolu; trois verrous de concurrence fermés (ticket monotone, identité de réponse, invalidation synchrone)
- TASK-0054/ACTION-0101 — recherche exacte à 100 000 et 1 000 000 de lignes indexées, atteignabilité par la recherche
- TASK-0047/ACTION-0079 — résultats atteignables au clavier

**Limites, écrites plutôt que corrigées en silence :**

- la recherche backend reste proportionnelle au corpus : déclaré par TASK-0054; aucun chiffre de latence n'est publié (réserve R8)

**Preuve runtime de la campagne finale :**

- *(phase 1)* typing in the search field returned exactly the expected set, paginated and bounded, keyboard-reachable, and a name that exists in all three synthetic trees returned only the active brain's row

### `P-09` — Filtres

- **Fonctions propriétaires :** `F-022`
- **État courant :** `CANDIDATE`
- **Verdict de `TASK-0057` :** **SATISFIED**

**Sous-critères du texte courant, un par un :**

- les filtres de base — tout, nouveaux, non vus — plus type et disponibilité sont combinables
- ils sont dérivés de l'index
- le total filtré égale le compte issu d'une requête indépendante
- un filtre actif est visible
- il est révocable en une action

**Preuves indépendantes :**

- TASK-0039/ACTION-0065 — projection filtrée dérivée de l'Index canonique, sans second index ni colonne ajoutée; prédicat non-vu de DEC-0036 appelé et non recopié; total filtré durable
- ACTION-0090 — contrôle indépendant du filtre FILE seul
- TASK-0044/ACTION-0073 — le filtre appartient à son cerveau et survit au redémarrage
- TASK-0053/ACTION-0099 — le filtre est écrit comme un filtre logique, sans curseur

**Limites, écrites plutôt que corrigées en silence :**

- les facettes dynamiques dérivées des données restent hors du critère MVP : REQUIREMENTS_BASELINE F-022 le déclare

**Preuve runtime de la campagne finale :**

- *(phase 1)* three criteria of different kinds were combined through real clicks and all three totals were derived from the Index; the FILE total equals an independent count of the files on disk; an active filter is visible and was revoked in a single action

### `P-10` — Légende

- **Fonctions propriétaires :** `F-014`
- **État courant :** `CANDIDATE`
- **Verdict de `TASK-0057` :** **SATISFIED**

**Sous-critères du texte courant, un par un :**

- chaque couleur, forme ou motif porteur de sens figure dans la légende avec sa signification
- la légende est atteignable au clavier
- elle reste déchiffrable sans distinction de couleur
- un codage présent sur la carte et absent de la légende est un échec

**Preuves indépendantes :**

- ACTION-0085 — audit F-014/P-10 : le manque est nommé avant d'être comblé
- TASK-0050/ACTION-0091 — légende du runtime : contrat fermé `LEGEND_KEYS`, la carte et la légende tirent leurs clés du même contrat, donc ajouter un état visuel sans l'expliquer est observable par un test; 21/23 états atteignables dans le harnais, les deux restants déclarés
- TASK-0047/ACTION-0079 — la légende est atteignable au clavier et lisible sans la couleur

**Limites, écrites plutôt que corrigées en silence :**

- TASK-0050 a déclaré deux états de la légende non atteignables par son harnais reproductible (21/23) et les a publiés comme tels; ACTION-0091 a clos la tâche avec cette limite écrite

**Preuve runtime de la campagne finale :**

- *(phase 1)* every visual coding token present on the rendered map is listed in the legend with its meaning in words; the legend was opened and closed through the real keyboard order

### `P-11` — Panoramique, zoom, ajuster à l'écran, réinitialiser

- **Fonctions propriétaires :** `F-009`, `F-010`, `F-011`, `F-012`
- **État courant :** `CANDIDATE`
- **Verdict de `TASK-0057` :** **SATISFIED**

**Sous-critères du texte courant, un par un :**

- panoramique souris, pavé tactile et clavier; après déplacement la sélection est inchangée
- zoom borné par un facteur minimal et maximal déclarés, centré de façon prévisible, atteignable au clavier
- aucun état de vue hors bornes n'est atteignable
- ajuster : depuis n'importe quel état, une seule action rend la carte complète — ou la sélection — entièrement visible
- réinitialiser produit exactement la vue d'ouverture du cerveau, comparée paramètre par paramètre, et est atteignable au clavier

**Preuves indépendantes :**

- TASK-0022/ACTION-0036 — panoramique, zoom, ajuster et réinitialiser sur la topographie à cartes et connexions
- TASK-0033/ACTION-0051 — passe d'acceptation produit WebView2 de l'expérience de navigation
- TASK-0044/ACTION-0073 — la caméra d'un cerveau est restaurée après un vrai redémarrage, comparée valeur par valeur
- TASK-0053/ACTION-0099 — la caméra d'une composition est restaurée; une caméra n'est jamais appliquée contre un viewport non mesuré
- TASK-0047/ACTION-0079 — toute la navigation est atteignable au clavier, sans piège

**Limites, écrites plutôt que corrigées en silence :**

- le pavé tactile n'est pas distinguable de la souris par un harnais CDP : la molette et le pointeur sont exercés, le geste tactile propre reste non testé et déclaré tel

**Preuve runtime de la campagne finale :**

- *(phase 1)* pan, zoom, fit and reset were exercised with real keys and with real clicks; the zoom is bounded (further presses no longer move the transform), panning left the selection unchanged, and reset is deterministic

### `P-12` — Panneau de détails masquable

- **Fonctions propriétaires :** `F-013`, `F-023`
- **État courant :** `CANDIDATE`
- **Verdict de `TASK-0057` :** **SATISFIED**

**Sous-critères du texte courant, un par un :**

- pour chaque nœud, nom, type, chemin réel, taille, dates, parent, enfants et état affichés égalent ceux de l'index
- les diagnostics d'accès sont affichés, jamais masqués
- masquer puis afficher conserve la sélection, le défilement et les filtres
- l'état masqué/affiché survit au redémarrage

**Preuves indépendantes :**

- TASK-0035/ACTION-0056 — contenu du panneau lu depuis l'Index; visibilité persistée dans `catalog_meta` sans nouveau store ni migration; masquer ne retire que le rendu, tout l'état vit dans MapApp; portée du bascule invalidée structurellement par un test
- TASK-0044/ACTION-0073 — le panneau est par cerveau et revient après un vrai redémarrage
- TASK-0053/ACTION-0099 — propriété explicite : panneau = F-013 + resume
- TASK-0050/ACTION-0091 — le diagnostic d'accès est affiché et expliqué par la légende

**Limites, écrites plutôt que corrigées en silence :**

- le défilement du panneau n'est pas une valeur persistée distincte : il est conservé parce que le panneau n'est pas démonté, ce qui est la façon dont le critère est tenu, pas une valeur comparée

**Preuve runtime de la campagne finale :**

- *(phase 1)* the details panel showed the Index's own values for the selection, with the access diagnostic on screen rather than hidden; hiding and showing it again kept the selection, the search text and the filters; the hidden/shown state is a stored preference (its survival across the restart is read in phase 2)
- *(phase 2)* the hidden/shown state of the details panel survived a real restart and the panel came back on one click

### `P-13` — Contenu direct d'un dossier

- **Fonctions propriétaires :** `F-026`
- **État courant :** `CANDIDATE`
- **Verdict de `TASK-0057` :** **SATISFIED**

**Sous-critères du texte courant, un par un :**

- la liste affiche exactement les enfants directs du nœud — ni les petits-enfants, ni une liste globale filtrée
- elle est paginée
- chaque entrée est sélectionnable au clavier
- elle est synchronisée avec la carte

**Preuves indépendantes :**

- TASK-0035/ACTION-0056 — `map_node_children` sur `Index::children_page()`, page bornée à 50, curseur refusé s'il vient d'un autre index, d'une révision périmée ou d'un autre parent; `detail.children` retiré de cet usage; sélectionner un enfant passe par la fonction de sélection existante
- TASK-0054/ACTION-0101 — la pagination d'un dossier large ne perd aucun enfant

**Preuve runtime de la campagne finale :**

- *(phase 1)* the list showed exactly the direct children of the selected folder, and one entry was activated through the real keyboard order

### `P-14` — Copier le chemin

- **Fonctions propriétaires :** `F-024`
- **État courant :** `CANDIDATE`
- **Verdict de `TASK-0057` :** **SATISFIED**

**Sous-critères du texte courant, un par un :**

- la copie reproduit le chemin réel exact
- contrôlée sur une fixture à noms longs et à caractères non ASCII
- atteignable au clavier
- aucun chemin n'est écrit dans un journal exportable
- la copie est un geste explicite, jamais automatique

**Preuves indépendantes :**

- TASK-0035/ACTION-0056 — `map_copy_node_path` ne reçoit qu'un `BrainNodeRef`; le chemin relatif vient de l'Index, la racine est résolue côté Rust, le chemin absolu n'est jamais renvoyé au WebView mais remis directement à l'API presse-papiers; `resolve_confined_target()` partagé avec l'ouverture Explorer; capability WebView inchangée (`core:default`)
- ACTION-0058 R1 — rejeu WebView2 frais : la copie réussit, aucun motif d'échec, 0 erreur console fatale

**Limites, écrites plutôt que corrigées en silence :**

- la vérification du presse-papiers se fait hors du WebView : ni le chemin ni le contenu du presse-papiers n'est publié dans un artefact

**Preuve runtime de la campagne finale :**

- *(phase 1)* NOT EXECUTED on this machine: before the window opened, a control write to the clipboard from outside the product was refused by Windows, so there was no clipboard to compare against. The real click on « Copier le chemin » was still played and the interface's own answer is published; P-14 stays composed from TASK-0034/ACTION-0055, where it was verified on a machine that had a clipboard. No path travelled to the artifact either way

### `P-15` — Ouvrir dans l'Explorateur

- **Fonctions propriétaires :** `F-025`
- **État courant :** `CANDIDATE`
- **Verdict de `TASK-0057` :** **SATISFIED**

**Sous-critères du texte courant, un par un :**

- un dossier s'ouvre
- un fichier est sélectionné dans son dossier
- une cible hors racine ou disparue produit une erreur explicite
- aucune modification de la source (I-1)
- le confinement à la racine du cerveau est vérifié avant l'appel

**Preuves indépendantes :**

- TASK-0034/ACTION-0052..0055 — `map_reveal_node` ne reçoit qu'un `BrainNodeRef`; `confine_indexed_target` marche chaque composante et refuse une composante non normale, une cible absente, un lien symbolique ou un point de réanalyse; `explorer.exe` lancé directement, jamais via un shell; dossier = chemin nu, fichier = `/select,<cible>`; capability WebView inchangée

**Limites, écrites plutôt que corrigées en silence :**

- la fenêtre `explorer.exe` qu'un vrai dévoilement ouvre est laissée à Windows : TASK-0034/0035 interdisent de tuer le processus globalement

**Preuve runtime de la campagne finale :**

- *(phase 1)* while the root of a brain was really absent, a real click on « Ouvrir dans l'Explorateur » produced an explicit error instead of opening something else, and nothing in the source was changed
- *(phase 1)* a real click opened the Explorer on a folder of the synthetic fixture and selected a file in its folder, without an error and without touching the source; the refusal of a target outside the root or gone is exercised in phase 2 on the unavailable root and composed from TASK-0034/ACTION-0055

### `P-16` — Détection et historique des changements

- **Fonctions propriétaires :** `F-027`, `F-030`
- **État courant :** `CANDIDATE`
- **Verdict de `TASK-0057` :** **SATISFIED**

**Sous-critères du texte courant, un par un :**

- un scénario portant les cinq natures produit exactement les événements attendus
- ils sont ordonnés
- ils sont attribués au bon nœud
- l'historique est consultable et filtrable
- il ne se perd pas au redémarrage

**Preuves indépendantes :**

- TASK-0037/ACTION-0061 — journal de changements au schéma v5, append-only, publié dans la transaction de publication; migration par l'enveloppe M-B, restaurée en entier si elle échoue à mi-chemin ou à la validation canonique; un index migré est re-baselé, jamais inondé
- TASK-0038/ACTION-0064 — historique consultable, filtrable par nature, paginé par curseur, et vu/non-vu dérivé sans réécrire un événement
- TASK-0040/ACTION-0066+0067 — les événements du chemin incrémental viennent du même `change_journal::diff` que la publication complète
- TASK-0043/ACTION-0072 — surveillance automatique : rafale réelle de 10 000 opérations convergente, perte simulée, reprise après interruption

**Limites, écrites plutôt que corrigées en silence :**

- une suppression massive réelle n'est pas provoquée : l'indisponibilité de racine est traitée avant tout scan, ce qui est précisément la défense de F-032

**Preuve runtime de la campagne finale :**

- *(phase 1)* the five natures of change applied to the source BEFORE the baseline were detected, journalled, grouped by the revision that found them and attributed to the right element; the page announces the Index's own total and is filterable

### `P-17` — Nouveaux, non vus, marquer vu, tout marquer vu

- **Fonctions propriétaires :** `F-022`, `F-028`
- **État courant :** `CANDIDATE`
- **Verdict de `TASK-0057` :** **SATISFIED**

**Sous-critères du texte courant, un par un :**

- « nouveau » et « non vu » sont dérivés du journal, pas saisis
- marquer un élément, marquer un changement et « tout marquer vu » persistent au redémarrage
- ils n'affectent aucun autre cerveau
- « tout marquer vu » est réversible ou confirmé, jamais silencieux

**Preuves indépendantes :**

- TASK-0038/ACTION-0064 — état vu/non-vu dérivé du journal par un prédicat, porté par cerveau, persistant, avec confirmation avant « tout marquer vu »; aucun acquittement historique réécrit
- TASK-0039/ACTION-0065 — les filtres « nouveaux » et « non vus » appellent le prédicat de DEC-0036, ils ne le recopient pas
- TASK-0044/ACTION-0073 — l'état d'un cerveau ne rejoint jamais celui d'un autre, bien que l'id numérique d'un nœud puisse être le même dans trois cerveaux
- TASK-0053/ACTION-0099 — vu/non-vu garde son propriétaire existant dans la répartition de M-1

**Preuve runtime de la campagne finale :**

- *(phase 1)* « nouveau » and « non vu » are derived from the journal, not typed; the deleted element's change was marked seen through the real keyboard order and a different element was marked seen from its own panel, both with a badge in words as well as a symbol; « tout marquer vu » opens a confirmation and cancelling it changed nothing

### `P-18` — Actualisation manuelle et surveillance incrémentale

- **Fonctions propriétaires :** `F-029`, `F-030`, `F-031`
- **État courant :** `CANDIDATE`
- **Verdict de `TASK-0057` :** **SATISFIED**

**Sous-critères du texte courant, un par un :**

- manuelle : produit un résumé des changements
- manuelle : ne vide jamais l'index courant avant d'avoir un remplacement valide, vérifié par interruption forcée en cours d'opération
- automatique : une rafale de 10 000 événements, une perte simulée et une reprise après interruption aboutissent toutes à un index égal à celui d'un scan complet de référence
- incrémentale : le coût d'une mise à jour est proportionnel au nombre de changements, non à la taille de l'index, mesuré sur 1 000, 10 000 et 100 000 nœuds avec 10 changements

**Preuves indépendantes :**

- TASK-0041/ACTION-0068 — « Actualiser » passe par le pipeline commun et le noyau incrémental; résumé des changements produit; l'index courant n'est jamais vidé avant un remplacement valide
- TASK-0040/ACTION-0066+0067 — F-031 recontrôlé canoniquement : 5 campagnes indépendantes, 7 échantillons par cas, 35 mesures brutes recalculées par le contrôleur sans se servir du fichier de synthèse; ratio 100k/1k à 10 changements = 1,533, plafond approuvé 2,0, PASS
- TASK-0043/ACTION-0071+0072 — rafale réelle de 10 000 opérations convergente, perte simulée, reprise, arrêt sans détachement
- TASK-0042/ACTION-0069+0070 — source indisponible et index périmé : l'index et les préférences restent intacts, l'état est signalé, aucun événement de suppression n'est journalisé

**Limites, écrites plutôt que corrigées en silence :**

- les mesures de F-031 viennent d'un banc de développement au profil déclaré; aucune performance produit n'est publiée, réserve R8 en vigueur
- la campagne finale n'a pas refait la rafale de 10 000 ni la courbe de coût : elle a exercé un vrai « Actualiser » incrémental et laissé les seuils lourds à leurs campagnes propres, comme TASK-0056 §5 l'autorise

**Preuve runtime de la campagne finale :**

- *(phase 1)* both halves, inside the window and on two different trees: the backend-owned watcher applied the first tree's pre-baseline changes with NO gesture at all, and on the third tree — whose root was absent when the window opened, so its watcher slept — ONE real click on « Actualiser » applied its changes INCREMENTALLY, produced a summary of them and published a new revision without ever emptying the Index

### `P-19` — Persistance des préférences et de l'état

- **Fonctions propriétaires :** `F-012`, `F-013`, `F-022`, `F-033`, `F-034`, `F-052`
- **État courant :** `CLOSED/VERIFIED`, fermée par **ACTION-0099 (2026-10-07)**
- **Verdict de `TASK-0057` :** **SATISFIED**
- **Régression postérieure à la clôture :** aucune. La campagne finale a refermé et relancé le processus et retrouvé le panneau, la densité, la langue, la composition et l'état vu/non-vu.

**Sous-critères du texte courant, un par un :**

- après redémarrage, chacune de ces valeurs est identique à celle d'avant fermeture, comparée valeur par valeur sur trois cerveaux
- une valeur non restaurable est déclarée et énumérée, jamais silencieusement réinitialisée

**Preuves indépendantes :**

- TASK-0044/ACTION-0073 — vue, sélection, filtres et panneau restaurés sur trois cerveaux après un vrai redémarrage
- TASK-0053/ACTION-0099 — F-052 propriétaire du workspace global; preuve WebView2 à quatre processus, trois fermetures réelles; restauration valeur par valeur et corrections explicites après changement de génération; M-1 CLOSED

**Limites, écrites plutôt que corrigées en silence :**

- l'état `branch focus + collapsed ids` était volontairement session-only au HEAD de TASK-0052; TASK-0053 l'a repris dans F-052

**Preuve runtime de la campagne finale :**

- *(phase 2)* a real close and relaunch of the process gave back the panel, the density, the language, the composition and the seen/unseen state value by value; anything the backend had to correct would have been declared on screen

### `P-20` — Plusieurs cerveaux indépendants

- **Fonctions propriétaires :** `F-002`, `F-033`, `F-034`
- **État courant :** `CLOSED/VERIFIED`, fermée par **ACTION-0075 (2026-09-25)**
- **Verdict de `TASK-0057` :** **SATISFIED**
- **Régression postérieure à la clôture :** aucune. La campagne finale a composé trois cerveaux par de vrais clics; marquer des changements vus dans l'un a laissé l'autre intact.

**Sous-critères du texte courant, un par un :**

- deux cerveaux ne partagent aucune ligne d'index, aucune préférence et aucun état vu/non vu
- basculer d'un cerveau à l'autre charge son index, sa carte, ses filtres et sa vue
- après redémarrage, chacun retrouve son état, vérifié sur trois cerveaux
- nom, couleur et icône modifiables, persistants par cerveau, utilisables sans configuration obligatoire

**Preuves indépendantes :**

- TASK-0018/ACTION-0029 — catalogue, isolation par répertoire de `brain_id`, deux cerveaux sur la même source
- TASK-0038/ACTION-0064 — vu/non-vu porté par cerveau
- TASK-0044/ACTION-0073 — vue, sélection, filtres et panneau restaurés sur trois cerveaux après un vrai redémarrage
- TASK-0045/ACTION-0075 — nom, couleur et icône modifiables et persistants par l'interface

**Preuve runtime de la campagne finale :**

- *(phase 1)* three independent brains were composed through real clicks, each keeping its own Index and its own seen/unseen state, and every drawn element names the brain it comes from

### `P-21` — FR/EN et accessibilité

- **Fonctions propriétaires :** `F-035`, `F-036`
- **État courant :** `CLOSED/VERIFIED`, fermée par **ACTION-0079 (2026-09-26)**
- **Verdict de `TASK-0057` :** **SATISFIED**
- **Régression postérieure à la clôture :** aucune. La campagne finale a tourné en français, basculé en anglais par un vrai clic, vérifié qu'aucun libellé français ne survivait, et passé axe-core sans violation en FR, en EN, en sombre et en mouvement réduit.

**Sous-critères du texte courant, un par un :**

- les deux langues couvrent l'intégralité des libellés
- le choix persiste au redémarrage
- un libellé manquant est détecté par un contrôle automatisé
- parcours complet au clavier sans piège
- contraste du texte ≥ 4,5:1
- alternative non colorée pour chaque codage
- `prefers-reduced-motion` respecté
- audit automatisé ET contrôle clavier manuel

**Preuves indépendantes :**

- ACTION-0076 — audit F-035 de la localisation du runtime
- TASK-0046/ACTION-0077 — FR/EN complet du runtime, un seul choix global, persistance
- ACTION-0078 — audit F-036/P-21
- TASK-0047/ACTION-0079 — audit axe dans le vrai WebView2 sur toute la matrice d'états (FR/EN, clair/sombre, panneaux, composition, mouvement réduit), parcours clavier sans piège, focus visible, contrastes, alternatives non colorées

**Limites, écrites plutôt que corrigées en silence :**

- aucune certification WCAG générale n'est revendiquée : le niveau visé est contrôlé par axe-core plus un parcours clavier, sur les états retenus
- aucun lecteur d'écran réel n'est exercé

**Preuve runtime de la campagne finale :**

- *(phase 1)* the whole session ran in French on a French host, with `<html lang>` and the controls' own words in French; the focus order was walked with real Tab presses without a trap, and axe-core reported no violation on the state with every panel open (the English half and the full matrix of states are read in phase 2 and composed from TASK-0046/ACTION-0077 and TASK-0047/ACTION-0079)
- *(phase 2)* the interface was switched to English with a real click: `<html lang>`, `aria-pressed` and the controls' own words followed, and no French label survived; axe-core reported no violation in English, in the dark scheme and with reduced motion honoured

### `P-22` — Aucun changement physique des fichiers analysés

- **Fonctions propriétaires :** `I-1`, `I-2`, `F-003`
- **État courant :** `CANDIDATE`
- **Verdict de `TASK-0057` :** **SATISFIED**

**Sous-critères du texte courant, un par un :**

- empreinte de l'arborescence synthétique — contenu, noms, structure, horodatages — identique avant et après une session complète exerçant toutes les exigences P-01 à P-21
- indisponibilité temporaire comprise
- aucun fichier de FileTopo n'est créé dans la racine analysée (I-2)
- critère bloquant : son échec invalide la version

**Preuves indépendantes :**

- M-2 du contrat demandait que ce contrôle soit rejoué à chaque clôture de tranche; il l'a été au titre de chaque tranche (lecture seule constatée par les harnais TASK-0016 à TASK-0055), mais aucune de ces vérifications ne portait sur une session exerçant P-01..P-21 ensemble, et aucune clôture formelle de P-22 n'existait avant TASK-0056

**Limites, écrites plutôt que corrigées en silence :**

- l'horodatage de dernier accès est digéré séparément et rapporté à part : ouvrir un fichier pour le lire est ce que fait un analyseur en lecture seule, et là où le volume enregistre le dernier accès, un accès modifié est une conséquence de la lecture, jamais un changement de contenu, de nom, de structure ou d'horodatage contractuel
- les seuils lourds (100k/1M, 10 000 événements, matrice complète de contrastes) ne sont pas refaits dans la fenêtre : ils restent composés depuis leurs campagnes propres
- la campagne porte sur trois racines synthétiques temporaires; elle ne dit rien d'un volume réseau, d'un fournisseur Cloud Files ni d'un système de fichiers autre que NTFS

**Preuve runtime de la campagne finale :**

- *(phase 2)* a root was made temporarily unavailable inside the window, with the watcher's own cadences short, and restored: the guard — not a poll from the interface — noticed it leaving and coming back, the Index and the preferences stayed intact, the state was signalled on screen in words, and not one deletion was journalled. The external fingerprint taken after the window is compared to the one taken before by the .ps1

## 3. Invariants I-1 à I-3

| # | Invariant | Verdict | Preuve |
|---|---|---|---|
| `I-1` | Lecture seule absolue sur les documents analysés | **SATISFIED** | Campagne finale P-22 : empreinte externe stricte identique avant et après la fenêtre, sur trois racines, couvrant chemin relatif, nature, taille, SHA-256 du contenu, nombre de liens physiques, horodatage de modification et de création, et les métadonnées de la racine elle-même. Plus : aucune commande d'écriture ou de reconstruction sur le fil IPC pendant la fenêtre. |
| `I-2` | Rien de FileTopo ne vit dans l'arborescence analysée | **SATISFIED** | Campagne finale P-22 : l'outil d'empreinte cherche tout artefact FileTopo sous chaque racine (index, journal, cache, magasin de relations, rapport) avant et après la fenêtre, et n'en trouve aucun; `map_integrity` du produit lui-même le confirme pour les trois cerveaux. L'espace applicatif reste `.filetopo-sandbox/variants/<variant>`. |
| `I-3` | Rien n'est inventé silencieusement | **SATISFIED** | Provenance d'une relation établie limitée à DETERMINISTIC ou APPROVED, suggestion objet distinct, règle nommée et versionnée (TASK-0024/ACTION-0041, TASK-0051/ACTION-0094); agrégat à compte exact jamais présenté comme un dossier (TASK-0054/ACTION-0101); légende fermée qui rend observable tout codage non expliqué (TASK-0050/ACTION-0091); diagnostic d'accès affiché plutôt que masqué (TASK-0035/ACTION-0056). Aucune surface IPC ni capability n'est élargie par TASK-0056 : le diff ne touche aucun fichier de production. Le refus `map_source_not_synthetic` de la surface des relations sur une racine réelle est lui-même explicite et nommé, jamais un silence : c'est un gap de portée, pas une invention silencieuse. |

## 4. Audit reuse-first

Inventaire exigé par TASK-0056 §2, fait avant d'écrire le moindre harnais.

### RÉUTILISER

- scripts/task0054-webview2.mjs — plomberie CDP, lecture de la toile, marche d'agrégat, empreinte de répertoire : reprise telle quelle comme squelette de la campagne finale
- scripts/task0053-seed-proof.py — forme d'un catalogue à trois cerveaux REAL_ROOT : reprise comme modèle du seed
- scripts/task0055-webview2.ps1 — orchestration multi-processus, variant de bac à sable, contrôles de fuite de l'artefact : reprise comme modèle du .ps1
- node_modules/axe-core (devDependency déjà présente, injectée dans la page, jamais empaquetée) — reprise pour l'audit d'accessibilité
- les harnais TASK-0030..TASK-0055 et leurs artefacts dans docs/performance/runs/ — repris comme PREUVES, jamais rejoués : ils portent les seuils lourds

### COMPOSER

- P-01/P-02/P-03 — composés depuis TASK-0022, TASK-0030, TASK-0052, TASK-0054 et leurs ACTION
- P-04/P-05/P-07 — composés depuis TASK-0017, TASK-0020, TASK-0024, TASK-0025, TASK-0051
- P-08 — composé depuis TASK-0029, TASK-0034, TASK-0054
- P-16/P-17/P-18 — composés depuis TASK-0037..TASK-0043
- P-19/P-20/P-21 — composés depuis TASK-0044, TASK-0045, TASK-0046, TASK-0047, TASK-0053

### MANQUANT POUR L'ACCEPTANCE FINALE

- P-22 — il n'existait aucune campagne exerçant P-01..P-21 dans UNE session et mesurant l'immuabilité de la source par une empreinte externe prise avant et après cette session. C'est le seul harnais neuf de TASK-0056 : scripts/task0056-seed-proof.py, scripts/task0056-fingerprint.py, scripts/task0056-webview2.mjs, scripts/task0056-webview2.ps1
- Le gate de régression Rust à sorties capturées — trois suites complètes consécutives au même HEAD avec code de sortie, comptes, noms des tests en échec, hash du log et durée : scripts/task0056-rust-gate.ps1
- Rien n'a été écrit pour « réparer » le gap des relations : TASK-0056 est une acceptance et §9 l'interdit. La preuve du gap est une observation de la campagne, dans le vrai moteur, à travers l'IPC réel.

