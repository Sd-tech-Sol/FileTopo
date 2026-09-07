# Feuille de route de reconstruction

Cette feuille de route remplace l'interprétation trop étroite des anciennes
phases. Les preuves historiques restent valides dans leur portée d'origine,
mais aucune phase future ci-dessous n'est déclarée terminée.

## Les quatre étapes courantes — A à D

**Établies le 2026-08-31 par `TASK-0015`**, sur l'instruction produit de
Sébastien enregistrée dans
[DEC-0015](docs/decisions/DEC-0015-product-parity-and-layout-scope.md).

Ces quatre étapes **ordonnent** les phases 2 à 9 du tableau ci-dessous; elles
ne les remplacent pas. **Elles se franchissent dans l'ordre**, et chacune
attend un contrôle indépendant avant la suivante.

| Étape | Objet | État | Ce qui doit être vrai à sa sortie |
|---|---|---|---|
| **A** | **Parité fonctionnelle MVP** | **EN COURS** — porte **P4 franchie** ([DEC-0016](docs/decisions/DEC-0016-p4-gate-crossing-and-first-slice.md)); première tranche [TASK-0016](docs/tasks/TASK-0016-p4-vertical-slice.md) livrée **`IMPLEMENTED`**, en attente de contrôle. **Six exigences satisfaites sur ce périmètre, deux partielles, seize non commencées** | Les **22 exigences** `P-01` à `P-22` du [contrat de parité](docs/product/CARTETOPO_FUNCTIONAL_PARITY.md) sont satisfaites et **prouvées sur fixtures synthétiques**, avec contrôle indépendant. Les **trois invariants** `I-1` à `I-3` tiennent. **L'apparence n'est pas jugée à cette étape** : seule la fonction l'est |
| **B** | **Finition visuelle moderne** | PROPOSED | Le style est refondu — formes, couleurs, typographie, panneaux, animations, organisation. **Aucune exigence de parité n'a disparu ni n'est devenue inatteignable**, contrôlé en rejouant l'intégralité des critères de l'étape **A**. L'accessibilité **WCAG 2.2 AA** et le bilinguisme tiennent après refonte |
| **C** | **Validation Windows / WebView2 réelle** | PROPOSED | Un **véritable hôte Tauri** existe et l'application s'exécute dans **WebView2**, sur Windows. Les mesures de performance sont refaites **dans ce moteur** : elles remplacent, pour toute communication, les mesures Edge et Chrome des spikes. **La réserve `R8` ne peut être levée qu'ici.** Le **budget adaptatif est réévalué ici**, et pas avant — `DEC-0015` F |
| **D** | **Empaquetage et publication** | PROPOSED | Application empaquetée, audit, tests, documentation FR/EN, notes de version. **La décision de publier appartient à Sébastien** : fusion vers `main`, PR, release, étiquette et annonce sont des **points d'arrêt réservés**, jamais délégués |

> **Réalignement produit du 2026-09-02 — l'étape A ne change ni de rang ni de
> nature, sa CIBLE est précisée.**
>
> Après le `VERIFIED` de `TASK-0020`,
> [`TASK-0021`](docs/tasks/TASK-0021-product-realignment.md) enregistre cinq
> décisions produit — [`DEC-0019`](docs/decisions/DEC-0019-general-purpose-product-scope.md)
> à [`DEC-0023`](docs/decisions/DEC-0023-identity-and-source-permissions.md).
> **L'étape A reste « parité fonctionnelle MVP »** et conserve ses **22
> exigences**; **`P-02` est corrigée** par la correction normative **`P02-R1`** :
> la hiérarchie s'exprime par **connexion et organisation spatiale explicites**,
> et non plus obligatoirement par **inclusion visuelle**. **La représentation
> principale finale est un graphe à nœuds reliés; le pavage imbriqué n'est plus
> la cible visuelle.**
>
> **La matrice passe de 41 à 49 fonctions** — `F-042` à `F-049` —, **sans
> qu'aucune classification existante ne change**. `F-047` rejoint les fonctions
> `DIFFÉRÉ`, aux phases 10 à 12, qui **restent différées**.
>
> **Aucune étape n'est franchie, aucune réserve n'est levée, `R8` demeure
> entière**, et **rien de ces cinq fiches n'est implémenté ni prouvé**. La
> séquence de tranches proposée par `TASK-0021` §6 est **`PROPOSED`** : le
> contrôle indépendant l'a **acceptée** — `TASK-0021` est **`VERIFIED`** depuis
> [`ACTION-0034`](docs/reviews/ACTION-0034-independent-recontrol.md),
> **`CLOSED`**, `HEAD` contrôlé `10cf54e` —, mais **aucune de ses tranches
> n'est créée ni exécutée**. La première, **`TASK-0022`**, attend le prochain
> prompt de l'orchestrateur.

> **Réalignement d'architecture du 2026-09-06 — aucune étape ne change de rang
> ni de nature; l'étape A reçoit une CONTRAINTE D'ARCHITECTURE supplémentaire.**
>
> [`TASK-0027`](docs/tasks/TASK-0027-progressive-scale-architecture-realignment.md)
> enregistre [`DEC-0029`](docs/decisions/DEC-0029-progressive-materialization-and-scale-boundary.md) :
> **FileTopo indexe grand, matérialise petit, et ne rend que le contexte
> utile.** Corpus, graphe logique, vue matérialisée et rendu sont **quatre
> plans distincts**; `1 élément indexé` = `1 entité accessible`, **pas** `1
> carte rendue`; `MAX_NODES_PER_MAP = 5000` est une **limite de tranche
> historique**, pas une limite produit de corpus.
>
> **L'étape A reste « parité fonctionnelle MVP »** et conserve ses **22
> exigences**. `P-01`, `P-02` et `P-03` sont **amendées** par l'amendement
> normatif **`P-SCALE-R1`**, qui **ajoute** des obligations de véracité —
> atteignabilité de tout élément indexé, déclaration de tout repli ou agrégat
> **avec compte exact**, interdiction qu'une pagination perde un enfant réel.
> **Aucune exigence n'est supprimée ni affaiblie.** **`P-08` — recherche sur
> 100 000 nœuds — devient le pilier du scale spike.**
>
> **La matrice passe de 49 à 51 fonctions** — `F-050` matérialisation
> progressive et vue bornée, `F-051` agrégats et méta-nœuds exacts, toutes
> deux `MVP` / `P0`. **Une seule classification existante change, et elle
> monte : `F-042` passe d'`ULTÉRIEUR` à `MVP`**, parce que repli, dépli et
> focus deviennent la **primitive** qui détermine le contenu de la vue.
> `F-047` reste `DIFFÉRÉ`; `F-046` reste `PROPOSED`.
>
> **`Graphify` n'est pas intégré** — `NOT INTEGRATED`, `DEC-0029` G : aucune
> dépendance, aucun runtime, aucun adaptateur MVP, aucune roadmap
> d'intégration. **`Forge` reste un projet entièrement distinct** —
> `DEC-0029` H.
>
> **Aucune étape n'est franchie, aucune réserve n'est levée, `R8` demeure
> entière**, **aucun renderer n'est choisi**, et **rien de cette fiche n'est
> implémenté ni mesuré**. `TASK-0027` est **`IMPLEMENTED`** et attend un
> contrôle indépendant.

**Trois règles de passage propres à ces étapes :**

1. **La parité précède l'esthétique.** L'étape **B** ne peut pas commencer
   avant que **A** soit contrôlée. L'inverse — moderniser puis rattraper la
   fonction — est exactement la dérive que `TASK-0010` a documentée sur le
   prototype.
2. **Aucun chiffre de performance publié avant C.** Les mesures de `B2`,
   `B2 bis` et `B2 ter` sont des mesures de **spike**, sur Edge et Chrome,
   **jamais WebView2**. Réserve `R8`, en vigueur.
3. **Aucune exigence ne disparaît par refonte.** Toute suppression passe par
   une fiche `DEC` écrite, jamais par omission silencieuse — contrat de parité
   §3.

## Phases historiques

| Phase | Objet | État | Sortie attendue |
|---|---|---|---|
| 0 | Rebaseline et mémoire | VERIFIED | TASK-0010 vérifiée le 2026-08-31 |
| 1 | Exigences, matrice fonctionnelle et architecture | VERIFIED | TASK-0011 vérifiée le 2026-08-31, porte P2 franchie : baseline L1 à L7 approuvée, DEC-0007 à DEC-0012 au statut APPROVED |
| 1 bis | Bancs d'essai de levée des risques techniques | PROPOSED | TASK-0012 : B0 à B4 sur données synthétiques, avant tout code de production; GO P3 requis |
| 2 | Moteur d'indexation fiable | PROPOSED | scan robuste, exclusions et identifiants stables |
| 3 | Modèle de données et persistance | PROPOSED | schéma versionné, migrations, reprise et index reconstructible |
| 4 | Carte topographique hiérarchique | PROPOSED | blocs dérivés de l'arborescence réelle |
| 5 | Interactions, panneau et filtres | PROPOSED | navigation, détails, relations, recherche et filtres dynamiques |
| 6 | Surveillance et changements incrémentaux | PROPOSED | détection, journal, vu/non vu et reprise après indisponibilité |
| 7 | Plusieurs cerveaux et personnalisation | PROPOSED | états indépendants, nom, couleur, icône et préférences |
| 8 | Accessibilité, langues et performance | PROPOSED | FR/EN, clavier, contraste et budgets mesurés |
| 9 | Préparation d'une nouvelle alpha publique | PROPOSED | audit, tests, documentation et décision humaine de publication |
| 10 | Extraction de contenu et recherche locale | DEFERRED | formats approuvés, plein texte, citations locales; OCR facultatif |
| 11 | RAG facultatif cité | DEFERRED | recherche hybride, fournisseurs configurables et consentement |
| 12 | GraphRAG facultatif si justifié | DEFERRED | étude fondée sur des besoins et mesures après RAG fiable |

## État réel au 2026-08-31

Les phases 2 à 12 restent PROPOSED ou DEFERRED : **aucune ligne de code n'a été
écrite depuis TASK-0010**. La phase 1 est VERIFIED **au sens documentaire** :
Sébastien a franchi la porte P2 le 2026-08-31, la baseline est approuvée et les
six décisions DEC-0007 à DEC-0012 sont APPROVED.

**Une décision approuvée n'est pas une preuve.** Rien n'a été construit, testé
ni mesuré. La phase 1 bis (TASK-0012, PROPOSED) doit lever quatre risques
techniques sur données synthétiques — santé du prototype, migration SQLite
Windows, rendu HTML/SVG, identité Windows — plus l'ambiguïté des attributs
infonuagiques, **avant** le premier code de production. La phase 2 ne peut pas
démarrer avant que TASK-0012 soit approuvée (porte P3), exécutée, et ses
verdicts lus.

**Mise à jour du 2026-08-31, fin de journée.** La phase 1 bis a eu lieu :
`TASK-0012`, `TASK-0013` et `TASK-0014` sont toutes trois **`VERIFIED`** sur
contrôle indépendant — `ACTION-0021`, `ACTION-0023`, `ACTION-0024`. Les portes
**P3** et **P3 bis** sont franchies; la porte **P4 reste ouverte et non
franchie**, et **aucune ligne de code de production n'a encore été écrite**.

**Deux contrôleurs de budget auto-régulé ont été éprouvés et rejetés.** Le
principe **reste une piste** mais **cesse d'être un prérequis à P4** : il sera
réévalué à l'étape **C**, dans le véritable hôte Tauri/WebView2 —
[DEC-0015](docs/decisions/DEC-0015-product-parity-and-layout-scope.md) F.

**La référence produit a été corrigée.** CarteTopo est la **référence
fonctionnelle**; l'ancienne version publique de FileTopo est un **prototype et
audit technique**. Le
[contrat de parité](docs/product/CARTETOPO_FUNCTIONAL_PARITY.md) est le contrat
produit courant, et quatre fonctions — `F-013`, `F-017`, `F-018`, `F-019` —
sont remontées d'`ULTÉRIEUR` à `MVP`. **IA, OCR, extraction de contenu, RAG et
GraphRAG restent DIFFÉRÉ.**

**Mise à jour du 2026-08-31 — la porte P4 est FRANCHIE.** Le contrôle
indépendant [ACTION-0025](docs/reviews/ACTION-0025-independent-control.md) a
accepté le réalignement produit — `TASK-0015` est **`VERIFIED`** — et émis la
réserve normative **`X1`**, corrigée dans le même geste : **une suggestion
n'est pas une provenance de relation**. `P4` autorise
[TASK-0016](docs/tasks/TASK-0016-p4-vertical-slice.md), **et rien d'autre** —
[DEC-0016](docs/decisions/DEC-0016-p4-gate-crossing-and-first-slice.md).
**L'étape B ne commence pas** : la parité précède l'esthétique.

## Règles de passage

Chaque phase exige une tâche approuvée, des critères d'acceptation, des données
synthétiques et des preuves. IMPLEMENTED ne devient VERIFIED qu'après contrôle
indépendant. Une phase ultérieure ne justifie jamais de contourner la lecture
seule, la confidentialité, la validation humaine des relations ou les points
d'arrêt de [AGENTS.md](AGENTS.md).

**S'y ajoutent, depuis le 2026-08-31 :** aucune amélioration visuelle ne peut
supprimer une exigence de parité; toute suppression passe par une fiche `DEC`
écrite; et une tranche de production qui n'embarque pas de budget adaptatif
**doit borner sa charge autrement et le déclarer** dans sa fiche.

**S'y ajoute, depuis le 2026-09-06 — `DEC-0029` :** aucune tranche ne peut
introduire un chemin où **le frontend reçoit le graphe entier**, ni faire
croître le nombre d'éléments rendus **proportionnellement au corpus**. Une
tranche qui rend du contenu **déclare la borne de sa vue** et **déclare ce
qu'elle cache, avec un compte exact**. Et **aucun chiffre d'échelle — 10 000,
100 000, 1 000 000 — n'est publiable comme résultat avant d'avoir été mesuré**
dans un banc dont le profil matériel est gelé; la réserve `R8` s'y applique
entièrement.

## Séquence proposée après TASK-0027 — `PROPOSED`, aucune tâche créée

**Proposée le 2026-09-06 par
[`TASK-0027`](docs/tasks/TASK-0027-progressive-scale-architecture-realignment.md),
sous `DEC-0029`.** Cette séquence **ordonne** des travaux à l'intérieur de
l'étape **A**, sauf son point 5 qui appartient à l'étape **B**. Elle **ne
remplace ni les quatre étapes A à D, ni les phases historiques**, et **aucune
de ces tranches n'est créée**. Chacune exigera sa propre fiche approuvée, son
périmètre écrit et son contrôle indépendant.

1. **Scale spike synthétique 10k / 100k / 1M.** Le **profil matériel exact du
   banc est gelé dans cette tranche-là**, pas avant; classe visée : Windows
   laptop ou desktop ordinaire, RAM modeste, iGPU ou GPU faible. Les neuf
   mesures minimales sont listées dans
   [`PROGRESSIVE_SCALE_ARCHITECTURE.md §11.1`](docs/architecture/PROGRESSIVE_SCALE_ARCHITECTURE.md).
2. **Progressive materializer** + budget de vue + repli/dépli/focus (`F-042`)
   + agrégats (`F-050`, `F-051`).
3. **Recherche, filtres, watchers** et mise à jour incrémentale sur cette
   architecture — `P-08`, `P-09`, `P-18`.
4. **Permissions et mode équipe** — `F-048`, `F-049`, selon `DEC-0023`, qui se
   livrent ensemble ou pas du tout.
5. **Finition visuelle moderne**, **seulement après stabilité fonctionnelle**.
   C'est l'étape **B**, et sa règle de passage est inchangée : **la parité
   précède l'esthétique**.

**La tranche design reste explicitement prévue** : design system FileTopo
**local et neutre vis-à-vis des fournisseurs**, skills et adapters
Claude/Codex communs, prototypes comparés, et **benchmark des renderers** —
React Flow, ELK, Sigma, Cytoscape, Pixi restant des candidats. **Aucun design
ni renderer n'est choisi ni implémenté par `TASK-0027`.**
