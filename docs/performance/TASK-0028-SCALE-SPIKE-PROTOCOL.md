# TASK-0028 — Protocole du banc synthétique de mise à l'échelle

> **Gelé avant l'écriture du harness.** Ce document décrit ce qui **sera**
> mesuré et **comment**. Aucun chiffre n'y figure. Les résultats vivent dans
> [`TASK-0028-SCALE-SPIKE-REPORT.md`](TASK-0028-SCALE-SPIKE-REPORT.md).
>
> `ENGINEERING_MEASUREMENT / NOT A PRODUCT CLAIM / NONCANONICAL UNTIL
> INDEPENDENT CONTROL`

- **Tâche :** [`TASK-0028`](../tasks/TASK-0028-synthetic-scale-feasibility-spike.md)
- **Décision encadrante :** [`DEC-0029`](../decisions/DEC-0029-progressive-materialization-and-scale-boundary.md)
- **Cibles :** [`PROGRESSIVE_SCALE_ARCHITECTURE.md §11`](../architecture/PROGRESSIVE_SCALE_ARCHITECTURE.md)
- **Réserve :** `R8` entière — aucun chiffre hors des artefacts `TASK-0028`.

---

## 1. Question falsifiable

> L'architecture « **indexer grand, matérialiser petit** » est-elle
> techniquement plausible avec le cœur local Rust/SQLite et un rendu borné,
> **sans faire dépendre le coût graphique de la taille totale du corpus** ?

**Critère de rejet principal** — `§11.1` point 9 : si, à **budget de vue
fixe**, le nombre d'entités rendables **croît proportionnellement au corpus**,
l'architecture décrite par `DEC-0029` est **falsifiée**.

Ce protocole peut donc produire un **FAIL**. Un FAIL honnête est un résultat
valide et ne doit pas être converti en PASS par déplacement de la cible.

---

## 2. Deux couches, nommées séparément

| Sigle | Couche | Tailles | Ce qu'elle établit |
|---|---|---|---|
| **SCAN-SCALE** | Arborescence **physique** synthétique sur disque, lue par le vrai scanner | 10 000, 100 000 | Le pipeline réel `scan_tree_controlled` → `Index::replace_nodes` |
| **INDEX-SCALE** | Base de banc construite avec le **schéma et les types FileTopo courants** | 1 000 000 | SQLite, recherche, requêtes bornées, matérialisation bornée |

**`INDEX-SCALE` ne prouve pas** que le scanner traverse 1 000 000 de fichiers
physiques. Il ne sera jamais appelé « scan 1M » dans un artefact ou un rapport.

**1 000 000 de fichiers physiques ne seront pas créés** : cela mesurerait
surtout NTFS et gaspillerait temps et espace disque. Aucun fichier fixture
n'est committé, à aucune taille.

---

## 3. Source synthétique

### 3.1 Forme

Générateur **déterministe**, sans horloge, sans aléa non graine, produisant :

- un mélange de **dossiers et de fichiers**;
- des **branches larges** (beaucoup d'enfants directs) et des **branches
  profondes** (chaînes), afin que le materializer rencontre les deux formes;
- des **noms synthétiques** (`d-000123`, `f-004567.txt`);
- des fichiers **vides ou minuscules** — le contenu n'est jamais lu.

Aucun nom, chemin, contenu ou métadonnée provenant d'une source réelle.

### 3.2 Emplacement

`.filetopo-sandbox/task0028/` — **dans le dépôt**, **ignoré par Git** depuis
`TASK-0016`. La source et l'index de banc y vivent **côte à côte**, jamais
l'index dans la racine analysée (`I-2`).

Aucune écriture hors du dépôt. Aucun chemin personnel n'entre dans un artefact.

### 3.3 Empreinte structurelle — `I-1`

Avant **et** après chaque campagne, une **empreinte structurelle** de la source
est calculée : parcours ordonné de l'arborescence, agrégeant pour chaque entrée
le **chemin relatif**, le **type** et la **taille**, dans un condensé FNV-1a
64 bits.

- Elle prouve que la mesure **n'a rien modifié**.
- Elle **n'est pas** un hachage de contenu : **aucune campagne SHA-256**
  (`TASK-0023` / `TASK-0026`) n'est lancée, `DEC-0025` n'est pas sollicitée.

---

## 4. Profil matériel gelé

Capturé automatiquement, **sanitisé**, à chaque campagne :

- version de Windows;
- modèle de CPU, cœurs physiques et logiques;
- RAM installée;
- modèle(s) de GPU;
- type de disque du banc si raisonnablement accessible;
- versions de `rustc`, `cargo`, Node, SQLite embarqué.

**Jamais capturés, jamais committés :** nom d'hôte, nom d'utilisateur, chemin
`C:\Users\…`, numéro de série, identifiant de machine, adresse réseau. Toute
chaîne contenant le nom d'utilisateur est remplacée par un jeton neutre avant
écriture, et un test le vérifie.

### 4.1 Classification du banc

| Classe | Condition | Conséquence |
|---|---|---|
| `TARGET_CLASS` | laptop/desktop **ordinaire**, RAM modeste, iGPU ou GPU faible | La cible « machine modeste » peut être discutée sur preuves |
| `DEVELOPMENT_BENCH_NOT_ACCEPTANCE` | tout le reste | Les mesures restent des **données d'ingénierie**; **aucune** déclaration de cible validée |

Le critère est écrit **avant** de lire la machine : `TARGET_CLASS` exige
`RAM ≤ 16 Gio` **et** un GPU intégré ou d'entrée de gamme **et** un CPU de
classe mobile/bureautique. Un banc plus puissant est classé
`DEVELOPMENT_BENCH_NOT_ACCEPTANCE`, sans exception.

Le harness est **portable** : aucune valeur du banc n'est codée en dur, et le
protocole est rejouable tel quel sur un laptop plus modeste.

---

## 5. Méthode de mesure

- **Horloge haute résolution** : `std::time::Instant` côté Rust,
  `performance.now()` côté WebView2.
- **Warm-up séparé** des exécutions mesurées, toujours déclaré.
- **Requêtes courtes** : warm-up, puis au moins **21 répétitions**; rapport
  **p50 / p95 / max**, plus le nombre exact d'exécutions.
- **Opérations lourdes** : au moins **2 exécutions** quand c'est raisonnable.
  Si `INDEX-SCALE` 1M ne peut pas être répété sans coût excessif, le **nombre
  exact d'exécutions est déclaré**, jamais sous-entendu.
- **Cold / warm** distingués quand la distinction a un sens (base fraîchement
  ouverte contre base déjà interrogée).
- **Erreurs, timeouts et OOM sont journalisés tels quels**, jamais masqués,
  jamais réessayés en silence.
- **Aucun seuil n'est fixé a posteriori.** Cette tranche mesure et falsifie.

---

## 6. Les neuf familles de `§11.1`

### SS1 — index et reconstruction

| Taille | Ce qui est mesuré |
|---|---|
| 10k, 100k **physiques** | Génération synthétique **chronométrée à part** du temps FileTopo; durée de `scan_tree_controlled`; durée d'`Index::replace_nodes`; durée de **reconstruction** (second `replace_nodes`); nombre **attendu** contre nombre **indexé**; empreinte avant/après; diagnostics du scanner |
| 1M **INDEX-SCALE** | Temps de **construction** et de **chargement** de la base de banc, nommé comme tel |

### SS2 — SQLite et mémoire

À 10k / 100k / 1M :

- **taille du fichier de base** et des journaux WAL/SHM, en octets;
- **working set** du processus aux phases importantes, **méthode déclarée** :
  `Get-Process -Id <pid>` du processus de test, lu via PowerShell, sans
  dépendance nouvelle;
- **absence d'embarquement** du corpus complet dans le frontend : aucune
  sérialisation de plus que la vue bornée n'est produite par le harness.

### SS3 — recherche `P-08`

- **Obligatoire sur 100k**, **informatif sur 1M**.
- Chemin mesuré : **`Index::query_nodes`**, la vraie requête de production.
- Quatre motifs **déterministes** : `hit-début`, `hit-milieu`, `hit-fin`,
  `miss`.
- **Pagination réelle** : pages successives, tailles bornées, ordre
  déterministe.
- **Exactitude vérifiée** : le total rendu par la requête est comparé au total
  attendu du générateur; les pages successives ne se recouvrent pas.
- Warm-up séparé, p50 / p95 / max.
- **Aucun cache n'est inventé.** Ce qui n'existe pas n'est pas mesuré.

### SS4 — requêtes bornées expérimentales

Prototypées **dans le harness**, jamais exposées :

- **enfants directs paginés**, ordre déterministe, curseur stable;
- **ancêtres** jusqu'à la racine, bornés par la profondeur;
- **compte exact d'un sous-arbre non matérialisé**, calculé côté SQLite;
- **voisinage relationnel** : mesuré **seulement** si le store courant permet
  une expérience honnête; sinon déclaré non mesuré, jamais simulé.

Ces requêtes sont **benchmark-only**. Le query engine produit **n'est pas**
implémenté.

### SS5 — matérialisation expérimentale bornée

Prototype **non exposé au produit**, construisant une vue à partir de l'index
sous un **budget configurable** d'entités de vue.

- Budgets testés : **128 / 256 / 512 / 1024**. **Aucun n'est décidé final.**
- Pour un **même budget**, exécution sur **10k / 100k / 1M**.
- Enregistré pour chaque couple (budget, taille) : temps du prototype; nombre
  de **nœuds réels** inclus; nombre d'**agrégats**; **comptes exacts cachés**;
  total d'**entités** et d'**arêtes** de la vue.

Sémantique `F-051` imposée aux agrégats :

- **compte exact**, jamais estimé, jamais « 999+ »;
- **provenance lisible** et **voie d'expansion** vers ce qu'ils résument;
- **jamais un faux dossier** — pas de chemin, pas d'ouverture;
- **jamais une relation** — aucune arête entre les éléments résumés.

Ces invariants sont vérifiés par assertion à chaque exécution, pas seulement
décrits.

### SS6 — layout borné

- `layered-tree-cards-v1` (`DEC-0024`, `src-tauri/src/map/layout.rs`),
  **inchangé**, appliqué **uniquement aux vues bornées**.
- Le layout du corpus 100k/1M **n'est jamais calculé**.
- Aucune modification de l'algorithme n'est demandée.

### SS7 — frontend / WebView2 borné

Campagne **réelle Windows / Tauri / WebView2**, **sans nouveau comportement
produit**.

Le protocole reconnaît d'avance une limite : relier la base de banc
`INDEX-SCALE` au frontend exigerait une **nouvelle commande produit**, ce que
le périmètre interdit. La couche WebView2 est donc mesurée sur des **vues
bornées réelles du runtime existant**, dont les cardinalités **encadrent** la
plage de budgets 128–1024.

Mesuré ou vérifié :

- **ouverture** de la vue bornée;
- **pan / zoom** s'ils existent réellement dans le runtime; sinon « non
  disponible dans ce build », honnêtement;
- **sélection** clavier/souris selon ce qui existe;
- **nombre de nœuds et d'arêtes DOM/SVG réellement présents**;
- **absence d'un whole-graph payload** correspondant au corpus complet.

Si une partie ne peut pas être produite honnêtement, elle est enregistrée
`NOT PROVEN` et **aucun fichier PASS n'est fabriqué**.

### SS8 — sans GPU puissant

Tentative de passe WebView2 en **rendu logiciel**, via le mécanisme documenté
`WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--disable-gpu`.

- Si la désactivation est **confirmable proprement**, la vue bornée est mesurée
  et le mode est enregistré.
- Si elle **ne peut pas être confirmée honnêtement**, le sous-critère est
  `NOT PROVEN` et **rien n'est simulé**.
- Une passe logicielle **n'équivaut pas** à un test sur iGPU modeste : elle
  vérifie seulement l'absence d'une dépendance dure évidente au GPU.

### SS9 — non-proportionnalité

Comparaison **10k / 100k / 1M à budget identique**.

`PASS` structurel **seulement si les cinq conditions tiennent** :

1. la **cardinalité de la vue reste bornée** par le budget;
2. **aucun whole-graph JSON** n'est sérialisé;
3. les **comptes d'agrégats sont exacts**;
4. tout élément **non rendu** reste représenté par un **compte** et une **voie
   d'atteignabilité**;
5. **aucune relation ni hiérarchie n'est inventée**.

Ce `PASS` ne signifie **pas** que `F-050` ou `F-051` sont implémentées.

---

## 7. Artefacts

- `docs/performance/runs/TASK-0028-SS-10k.json`
- `docs/performance/runs/TASK-0028-SS-100k.json`
- `docs/performance/runs/TASK-0028-SS-1m-index.json`
- `docs/performance/runs/TASK-0028-SS-bounded-view-webview2.json` — seulement
  si SS7 est réellement exécuté

Chaque fichier porte l'en-tête `ENGINEERING_MEASUREMENT / NOT A PRODUCT CLAIM /
NONCANONICAL UNTIL INDEPENDENT CONTROL`, est **synthétique et sanitisé**, et
**n'est pas protégé** : `X5` reste à **36**. Le contrôle indépendant décidera
plus tard si l'un d'eux devient canonique.

---

## 8. Interdits du protocole

- Aucune commande produit nouvelle, aucun changement d'UX normale.
- `MAX_NODES_PER_MAP` **n'est pas remplacé**.
- Aucun renderer choisi, aucun budget de vue final décidé.
- Aucun état de `F-042` / `F-050` / `F-051` changé.
- Aucune `DEC-0030`, aucune `TASK-0029`.
- Aucun hachage de contenu massif, aucun watcher, aucune IA, aucune extraction,
  aucun Graphify, aucune permission/équipe.
- Aucune dépendance externe nouvelle sans nécessité démontrée.
- Aucune donnée réelle ou personnelle, sous aucune forme.
- Aucun chiffre recopié dans `README`, `PROJECT_VISION`, `ROADMAP`, une page
  publique, une note de version ou une promesse utilisateur.
