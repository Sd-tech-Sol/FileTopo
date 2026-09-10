# HANDOFF — passage de relais

## Relais actuel — TASK-0033, acceptation WebView2 faite, en attente de contrôle — 2026-09-10

- **Ce qui vient d'être fait :** `ACTION-0050` avait contrôlé `TASK-0033` et
  trouvé le code cohérent avec `DEC-0034`, mais **le rejeu produit WebView2
  obligatoire manquait**. Cette passe l'exécute : arborescence `REAL_ROOT`
  synthétique de 5 206 éléments, quatre branches délibérément déséquilibrées,
  pilotée en WebView2 réel à 1366×768 puis 1920×1080. `TASK-0033` reste
  `IMPLEMENTED`, jamais auto-`VERIFIED`.
- **Le rejeu a trouvé un vrai défaut, corrigé dans la portée de la tâche :**
  la vue ordinaire continuait, après les enfants directs du focus, à
  paginer récursivement les enfants du **premier** enfant rencontré tant
  que la cible de 64 n'était pas atteinte — un reliquat d'avant `DEC-0034`.
  Sur un dossier au premier rang avec un gros sous-arbre, cela consommait
  presque toute la cible sur une seule branche arbitraire, masquant les
  vraies branches soeurs de la vue racine. **Ne jamais réintroduire cette
  expansion automatique multi-niveaux.** `materialize_view` ne doit paginer
  que les enfants directs du focus; descendre d'un niveau est toujours une
  navigation explicite (`DEC-0034` C), jamais un effet de bord de la vue du
  parent.
- **Un second défaut, dans la caméra :** `.map-view` peut grandir après le
  premier positionnement (le panneau latéral se remplit de données réelles
  de façon asynchrone, changeant la hauteur de rangée de la grille
  `.app__main`); rien ne réappliquait alors les bornes de la caméra à la
  nouvelle taille, laissant la vue échouée hors du canevas visible. **Un
  effet dédié réapplique désormais `clampView` à chaque changement de
  dimensions du viewport — ne jamais confondre ceci avec un recentrage : il
  ne fait que garder le pan/zoom existant valide, jamais n'en calcule un
  nouveau.**
- **Qui a fait quoi :** Claude Code a exécuté le rejeu et les deux
  corrections. **Il ne peut pas rendre le verdict.**
- **Ce que le prochain relais doit savoir :**
  - `scripts/task0033-seed-proof.py` + `task0033-webview2.mjs`/`.ps1` sont
    le harnais réutilisable pour tout futur rejeu produit de la topographie.
    Noms de dossiers volontairement très courts (`A`, `B`, `C`, `D`,
    `t`) : au-delà d'une quinzaine de niveaux, un chemin absolu réaliste
    dépasse vite `MAX_PATH` (260 caractères) sous Windows sans support des
    chemins longs.
  - Le redimensionnement du rejeu utilise `Emulation.setDeviceMetricsOverride`
    (CDP), pas `Browser.setWindowBounds` : ce dernier n'est pas garanti
    disponible sur la session CDP scoped-page de WebView2.
  - Quatre tests préexistants (`commands.rs`, `cross_commands.rs`,
    `relation_commands.rs`) obtenaient l'id d'un chemin imbriqué via la vue
    par défaut (désormais trop étroite pour l'atteindre). Corrigés pour
    naviguer explicitement (`resolve_by_path`/`source_id` par segment) au
    lieu de changer le contrat produit qu'ils testaient par ailleurs.
  - L'incohérence documentaire qu'`ACTION-0050` avait signalée
    (« `fitView` reste utilisé à la première ouverture ») est corrigée ici
    et dans la fiche `TASK-0033` : c'est `readableView` depuis la livraison
    initiale.
- **Ce qui reste ouvert :** `cargo clippy` strict rouge à 26 erreurs, dette
  inchangée. Palette de relations par direction non reprise. Aucun watcher,
  aucun incrémental, aucun FTS5, aucune identité physique, aucune
  acceptance laptop modeste (poste de développement seulement).
- **Action unique suivante :** nouveau contrôle indépendant de `TASK-0033`,
  sur les preuves de cette passe.

## Relais précédent — TASK-0033 livrée, en attente de contrôle — 2026-09-10

- **Ce qui vient d'être fait :** `TASK-0032` était déjà `VERIFIED` dans sa
  portée par `ACTION-0049` (déjà sur la branche avant cette session, mais dont
  les documents durables n'avaient jamais été synchronisés — corrigé au
  passage, aucun contenu technique changé). `TASK-0033 — V1 Progressive
  Topographic UX` est livrée sur `build/v0.2-a17-v1-topographic-ux` :
  `IMPLEMENTED`, jamais auto-`VERIFIED`. `DEC-0034` reste `APPROVED`,
  inchangée.
- **Le geste central :** une projection ordinaire vise désormais **64 vrais
  blocs**, dossiers d'abord, au lieu de remplir jusqu'à 256. Aucun nouveau tri
  n'a été écrit — `idx_nodes_child_order` triait déjà chaque page
  dossiers-avant-fichiers depuis `DEC-0030`; remplir une cible plus petite
  suffit à faire gagner les dossiers. `VIEW_BUDGET`/`MATERIAL_BUDGET`
  restent les seules bornes dures.
- **Le second geste :** la caméra ne réduit plus toute la carte à chaque
  changement de projection. `fitView(world, …)` était appelé à chaque
  navigation de branche, dépliage d'agrégat et actualisation — c'est le défaut
  que `DEC-0034` E visait. **`fitView` ne reste que sur l'action explicite
  Ajuster à l'écran** (et le raccourci `f`/`F` sur la sélection); partout
  ailleurs, `recenterOnFocus` pan minimal sans jamais changer l'échelle. La
  **première ouverture d'une composition et Réinitialiser utilisent
  `readableView`** (échelle `1`, jamais un fit exhaustif), pas `fitView`.
- **Qui a fait quoi :** Claude Code a écrit la tranche entière. **Il ne peut
  pas rendre le verdict.**
- **Ce que le prochain relais doit savoir :**
  - **`ORDINARY_MATERIAL_TARGET` (64) n'est pas `VIEW_BUDGET`/`MATERIAL_BUDGET`.**
    Le premier est une cible produit dans `projection.rs`; les deux autres
    restent les bornes de sécurité inchangées. Ne pas les confondre en
    modifiant l'un pour changer l'autre.
  - **La priorité dossier-first vient de la base, pas de `projection.rs`.**
    `child_order_rank` (colonne générée, `hierarchy.rs`) classe les dossiers
    avant les fichiers dans chaque page. `materialize_view` n'a **aucun** tri
    à faire : il lui suffit de remplir une cible plus petite pour que les
    dossiers l'emportent. Si un jour la priorité doit changer, c'est là qu'il
    faut regarder en premier.
  - **`readableView`/`recenterOnFocus` (`viewState.ts`) sont les deux seules
    fonctions qui doivent toucher la caméra en dehors d'une action explicite.**
    Ne pas réintroduire `fitView(world, …)` dans un effet déclenché par un
    changement de projection : c'est exactement le défaut corrigé ici.
  - **L'agrégat est un `<g data-aggregate>` avec une pastille
    `.map-aggregate__pill`, pas un `<rect>` de la taille d'une carte.** Le
    créneau (`a.rect`) reste plein-carte pour que le layout ne superpose rien;
    seul le dessin est réduit. `aggregateLabel()` (`MapView.tsx`) est la
    **seule** source du texte visible — ne jamais réintroduire
    `omittedDirectChildren` brut ou `reason` dans un libellé produit.
  - **Aucun rejeu WebView2 n'a été fait dans cette passe.** C'est une limite
    déclarée, pas un oubli caché : la lisibilité produit sur un vrai volume
    (vrais noms, absence de chevauchement, comportement de la caméra en usage
    réel) reste à prouver avant tout `VERIFIED`.
- **Ce qui reste ouvert :** `cargo clippy` strict rouge à 26 erreurs, dette
  inchangée. Palette de relations par direction non reprise. Aucun watcher,
  aucun incrémental, aucun FTS5, aucune identité physique, aucun
  « Ouvrir dans l'Explorateur », aucune acceptance de performance sur grande
  racine.
- **Action unique suivante :** contrôle indépendant de `TASK-0033`.

## Relais précédent — TASK-0032 corrigée, en attente d'un nouveau contrôle — 2026-09-10

- **Ce qui vient d'être fait :** le contrôle indépendant de `TASK-0032` a trouvé
  **deux défauts bloquants**. Les deux étaient réels; les deux sont corrigés sur
  la même branche, `build/v0.2-a16-v1-real-root`. `TASK-0032` reste
  `IMPLEMENTED`, **jamais auto-`VERIFIED`**; `DEC-0033` reste `APPROVED`,
  corrigée en `D`, `H` et `I`.
- **Défaut A, corrigé :** `dialog:allow-open` n'accordait pas « le sélecteur
  qu'utilise notre commande ». Elle accordait `plugin:dialog|open`, la commande
  **frontend** du plugin, qui accepte un `defaultPath` venu de la page et lui
  retourne les chemins choisis. La capacité porte désormais `core:default` et
  rien d'autre.
- **Défaut B, corrigé :** `publish_map` utilisait `open_store` en pré-contrôle,
  donc un index écrit par `TASK-0031` — sans binding — était refusé partout et
  bloqué pour toujours, alors que `DEC-0033` D promettait sa republication.
- **Qui a fait quoi :** Claude Code a écrit la tranche **et** sa passe
  corrective. **Il ne peut pas rendre le verdict.**
- **Ce que le prochain relais doit savoir :**
  - **Ne jamais rajouter `dialog:allow-open`.** Le plugin doit rester
    initialisé côté Rust — `app.dialog()` en dépend — mais sa commande frontend
    ne doit jamais être autorisée. Une capacité ne gouverne que les commandes
    atteignables depuis le WebView; elle ne gouverne pas `app.dialog()` appelé
    depuis l'hôte, ce qui a été vérifié sur les sources installées de
    `tauri-plugin-dialog 2.7.2`, dont le `FileDialogBuilder` ne porte aucun
    contrôle de permission.
  - **Trois portes distinctes, à ne pas refondre en une :** `open_for_brain`
    (appartenance), `open_store` (appartenance + binding courant, exigé par
    toute lecture de corpus) et `check_publishable` (appartenance + binding
    courant **ou** la voie legacy étroite). Rebrancher `publish_map` sur
    `open_store` reproduirait exactement le défaut B.
  - **La voie legacy est interdite aux `REAL_ROOT`,** et ce n'est pas une
    précaution décorative : aucune racine réelle n'existait avant `DEC-0033`,
    donc un index sans binding sous un `REAL_ROOT` n'est pas ancien, il est
    faux. `B3` échoue si quelqu'un l'élargit.
  - **Le binding est la paire** `source_kind` + `source_ref`. Vérifier le seul
    identifiant laisse passer le cas que `B4` couvre.
  - `legacy_binding_tests.rs` **écrit les douze clés** de métadonnée d'un index
    `TASK-0031`. Si un jour la forme change, ce tableau doit changer avec elle,
    sans quoi le test prouverait la compatibilité d'un fichier qui n'existe pas.
  - `scripts/task0032-webview2.ps1` prouve maintenant aussi la frontière de
    permission : trois `invoke` directs de commandes du plugin, refusés, sans
    ouvrir de dialogue et sans passer de chemin réel.
- **Ce qui reste ouvert :** `R-T30-1` clippy strict rouge à 26 erreurs.
  `R-T30-3`, `R-T30-4`, `R-T30-6` et `R8` ouvertes. `R-T30-5` traitée
  **uniquement** dans la portée `REAL_ROOT` de test. L'appel Rust au dialogue
  natif n'est pas exercé à l'exécution. Un index legacy dont la fixture a été
  renommée n'est pas republiable et doit être reconstruit. Aucun watcher, aucun
  incrémental, aucun FTS5, aucune identité physique, aucun redesign, aucune
  acceptance de performance sur grande racine. Dette `Registry`/`legacy_store`
  non supprimée.
- **Action unique suivante :** contrôle indépendant de `TASK-0032`, sur la
  version corrigée.

## Relais précédent — TASK-0032, première livraison — 2026-09-10

- **Ce qui vient d'être fait :** FileTopo peut recevoir un **vrai dossier
  local**, choisi explicitement par la personne, sans jamais faire sortir son
  chemin du catalogue local et sans rien lire tant que personne n'a pressé
  **Indexer**. `TASK-0032 = IMPLEMENTED`, **jamais auto-`VERIFIED`**;
  [DEC-0033](../decisions/DEC-0033-real-root-privacy-and-source-binding.md) est
  `APPROVED`. Branche `build/v0.2-a16-v1-real-root`, gel `c3507bf` parent
  direct du premier commit de code.
- **Aucune donnée personnelle n'a été utilisée**, et aucune n'est demandée. Le
  vrai cerveau de Sébastien reste un point d'arrêt qui lui est réservé.
- **Qui a fait quoi :** Claude Code a écrit la tranche entière. **Il ne peut
  pas rendre le verdict.** Le contrôle doit venir d'une instance distincte.
- **Ce que le prochain relais doit savoir :**
  - Le contrat vit dans `DEC-0033` et se lit dans le code à quatre endroits :
    `map/source.rs` pour la validation de racine et la résolution,
    `map/brains.rs` pour le stockage `BLOB` et la migration, `path_codec.rs`
    pour l'encodage exact, et `commands.rs::open_store` pour le refus de
    binding.
  - **`BrainRecord` ne doit jamais gagner un champ de chemin.** C'est le DTO
    que l'IPC sérialise, et un `PathBuf` ajouté là arriverait dans le WebView
    dès que personne ne regarderait le JSON. La seule porte est
    `BrainCatalog::real_root_path`, qui rend un type non-`Serialize`.
  - **Aucune commande exposée ne doit accepter un chemin.** Un test lit le
    texte des signatures que `generate_handler!` enregistre. `relativePath` de
    `map_resolve_node` est admis et documenté : c'est un chemin **dans l'index
    d'un cerveau**, résolu en SQL, jamais sur le disque.
  - **`source_fixture()` refuse maintenant un `REAL_ROOT`** en
    `map_source_not_synthetic`. Les fonctions synthétiques par nature —
    `integrity`, `self_check`, la préparation de fixture, les scénarios de
    relations historiques — échouent donc explicitement sur un cerveau réel.
    C'est voulu : elles comparent à un plan figé qui n'existe pas pour un vrai
    dossier. **Ne pas les « réparer » en inventant une fixture.**
  - **Le second parcours d'empreinte reste synthétique.** Sur une racine réelle
    il doublerait le coût de chaque indexation. Le rapport porte donc `null`
    et `readOnlyConfirmed = false` : c'est « aucune empreinte prise », pas
    « quelque chose a changé ». Ne pas le rebrancher sans mesurer.
  - **Un index sans `source_ref` est refusé, jamais supprimé.** Un bac à sable
    de développement antérieur à `DEC-0033` verra donc `map_source_mismatch` à
    l'ouverture; une actualisation explicite le republie. C'est le
    comportement voulu.
  - `scripts/task0032-webview2.ps1` rejoue le chemin produit dans le vrai
    hôte. Il **génère lui-même** son arbre de test et écrit la ligne
    `REAL_ROOT` par `scripts/task0032-seed-proof.py` : le dialogue natif n'est
    pas automatisé, ce que `TASK-0032` §6 autorise. Le serveur Vite doit servir
    ce dépôt sur le port 1420 avant de le lancer.
- **Ce qui reste ouvert :** `R-T30-1` clippy strict rouge, inchangée à 26
  erreurs. `R-T30-3`, `R-T30-4`, `R-T30-6` et `R8` ouvertes. `R-T30-5` traitée
  **uniquement** dans la portée `REAL_ROOT` de test. Aucun watcher, aucun
  incrémental, aucun FTS5, aucune identité physique, aucun redesign, aucune
  acceptance de performance sur grande racine. La dette
  `Registry`/`legacy_store` n'est pas supprimée : seul le codec de chemin en a
  été extrait, et sa retraite éventuelle est une tranche distincte.
- **Action unique suivante :** contrôle indépendant de `TASK-0032`.

## Relais précédent — TASK-0031, VERIFIED depuis par ACTION-0048 — 2026-09-10

- **Ce qui vient d'être fait :** la réserve `R-T30-2` est devenue une frontière
  produit. Ouvrir un cerveau lit l'index persistant et **ne scanne plus la
  source**; actualiser et reconstruire sont deux intentions explicites et
  nommées; un échec de publication laisse le dernier index fiable ouvrable.
  `TASK-0031 = IMPLEMENTED`, **jamais auto-`VERIFIED`**;
  [DEC-0032](../decisions/DEC-0032-persistent-brain-lifecycle-contract.md)
  reste `APPROVED`. Branche `build/v0.2-a15-v1-brain-lifecycle`, gel `3ac6cbf`
  parent direct du premier commit de code.
- **Qui a fait quoi :** Codex a produit l'implémentation initiale; Claude Code a
  repris le worktree en l'état, corrigé, prouvé et clôturé. **Aucun des deux ne
  peut rendre le verdict.** Le contrôle doit venir d'une instance distincte.
- **Ce que le prochain relais doit savoir :**
  - Le contrat vit dans `DEC-0032` et se lit dans le code à trois endroits :
    `BrainIndex::open_existing` pour la lecture seule, `publish_map` pour
    l'ordre refus / scan / contrôles / publication transactionnelle, et
    `src/map/lifecycle.ts` pour les trois intentions côté interface.
  - `build_map(paths, brain, rebuild)` **existe encore, mais seulement sous
    `#[cfg(test)]`**. Ne pas le rappeler dans le runtime : c'est exactement le
    scan caché que cette tranche a retiré.
  - `prepare_synthetic_source` est une commande **séparée**. Les scénarios de
    preuve préparent leur fixture eux-mêmes; aucun test ne doit être « réparé »
    en remettant une préparation ou un scan dans `open`.
  - La garde structurale `runtime_source_guard_excludes_full_snapshot_and_global_layout`
    compare désormais en **LF**. Un fichier réécrit en CRLF cassait le découpage
    et lui faisait inspecter le module de tests. Respecter `* text=auto eol=lf`.
  - `vite.config.ts` n'observe plus `.filetopo-sandbox/`. Ne pas le remettre :
    la surveillance retenait des poignées de répertoire Windows, empêchait un
    rejeu de retirer sa propre source et rechargeait la page en pleine mesure.
- **Ce qui n'est pas fait, et ne doit pas être supposé fait :** aucun watcher,
  aucune mise à jour incrémentale — `F-027`, `F-030`, `F-031` restent
  `PROPOSED`. Un index de schéma incompatible est **refusé, jamais migré** :
  écrire un contrat de staging avant d'en avoir besoin. `cargo clippy` strict
  reste rouge, `R-T30-1` inchangée. `R-T30-3`, `R-T30-4`, `R-T30-6` et `R8`
  restent ouvertes.
- **`F-050` et `F-051` restent `IMPLEMENTED`, pas `VERIFIED` globalement.**
- **Interdits inchangés :** aucune donnée réelle, aucun `REAL_ROOT`, aucun
  sélecteur de dossier réel, aucune `TASK-0032`/`DEC-0033`, aucune branche
  suivante, PR, fusion, étiquette ni release. **X5 = 36**, l'artefact
  `TASK-0031-webview2.json` reste non canonique;
  `origin/main = 1a7d652ca48281c1687f6d1404c56a1404df91d8`, inchangé.


## Relais antérieur — ACTION-0047 close, TASK-0030 VERIFIED — 2026-09-09

- **Ce qui vient d'être fait :** enregistrement du verdict indépendant sur
  `TASK-0030`. `ACTION-0047 = CLOSED`; `TASK-0030 = VERIFIED` **dans sa portée
  synthétique de convergence V1** — un index canonique par cerveau, projection
  runtime bornée, layout de la vue seulement, MapApp alimenté par cette
  projection. Exécuteur `TASK-0030` : Codex. Rédacteur de la fermeture :
  Claude Code. Autorité du verdict : orchestrateur technique indépendant.
  [Fiche de contrôle](../reviews/ACTION-0047-independent-control.md).
- **Fermeture documentaire seulement :** aucun fichier sous `src/`,
  `src-tauri/`, `scripts/` ni `docs/performance/runs/` n'a changé; aucun banc,
  rejeu WebView2 ou suite lourde n'a été relancé.
- **Ce que le prochain relais doit savoir :** six réserves restent ouvertes,
  `R-T30-1` à `R-T30-6`. La plus structurante pour la suite est **`R-T30-2`** :
  `map_open`/`build_map` rescanent et republient encore un index compatible, et
  `rebuild = false` ne veut pas encore dire « ouvrir l'index persistant sans
  rescan ». Ouvrir, actualiser et reconstruire doivent être séparés **avant**
  d'exposer une vraie racine utilisateur, sinon un cerveau réel serait rescané
  à chaque chargement et les révisions et curseurs invalidés sans nécessité.
- **`F-050` et `F-051` restent `IMPLEMENTED`, pas `VERIFIED` globalement.**
  Ne pas les promouvoir sans acceptance d'échelle et de rendu, puis intégration
  au vrai flux V1.
- **Interdits inchangés :** aucune donnée réelle, aucun sélecteur de dossier
  réel, aucune `TASK-0031`/`DEC-0032` créée, aucune branche suivante, PR,
  fusion, étiquette ni release. `X5 = 36`;
  `origin/main = 1a7d652ca48281c1687f6d1404c56a1404df91d8`, inchangé.

## Livraison contrôlée — TASK-0030 — 2026-09-09

- **Statut : `VERIFIED`** dans sa portée synthétique, livré par Codex, contrôlé
  par `ACTION-0047`.
  [Fiche et audit](../tasks/TASK-0030-v1-pipeline-convergence.md);
  [DEC-0031](../decisions/DEC-0031-one-canonical-brain-index-and-bounded-projection.md)
  reste `APPROVED`, implémentation contrôlée.
- **Branche active :** `build/v0.2-a14-v1-pipeline-convergence`; gel préalable
  `0255bd1`. `Index.nodes` devient canonique par cerveau. `MapStore` est retiré
  du runtime et conservé uniquement comme fixture historique sous `cfg(test)`.
  Métadonnées, diagnostics et révision sont publiés dans la transaction du corpus.
- **Vue produit bornée :** `map_view` fournit focus, ancêtres, enfants keyset,
  agrégats d'enfants directs exacts et géométrie calculée sur la projection.
  Budget **512 entités**, dont au plus 256 nœuds matériels et une place réservée
  par nœud pour un agrégat. `map_snapshot` reste un alias borné. Aucun layout
  global au build; la limite historique de 5000 est désormais test-only.
- **Preuves :** 100 000 nœuds indexés par le cœur produit, toutes les pages
  parcourues sans doublon ni omission; build physique synthétique de **6 001**
  nœuds, empreinte inchangée après navigation, relations, hash et rebuild.
  WebView2 **152.0.4191.66** : **12/11** nœuds/arêtes sur petite fixture;
  **256 nœuds + 1 agrégat / 255 arêtes** sur 6001 indexés; 24 keydowns fiables,
  page suivante conforme au DTO produit, zéro erreur fatale. Preuves
  [WebView2](../performance/runs/TASK-0030-webview2.json) et
  [validations](../performance/runs/TASK-0030-validation.json), non canoniques.
- **Validations :** Rust **290 PASS, 5 ignorés**, TypeScript **264 PASS**,
  typage et builds PASS. Clippy **échoue sur la dette préexistante** : 24 extraits
  de diagnostics retrouvés dans `896e2c3`, dont l'ancien store déplacé en tests.
  Aucun passage clippy vert n'est revendiqué; baseline clippy non réexécutée.
- **Limites :** analyse/hash/règles/résolution de relations collectent encore des
  métadonnées du corpus en mémoire via un adaptateur temporaire non sérialisable.
  Pas de streaming ni optimisation P-08. Pas de racine personnelle, de preuve
  physique 100k/1M, de promesse laptop modeste ou de preuve GPU désactivé.
- **États :** F-050/F-051 `IMPLEMENTED` dans cette première tranche synthétique;
  F-042/F-046 restent `PROPOSED`, F-047 `DEFERRED`. Graphify `NOT INTEGRATED`;
  aucun renderer nouveau; R8, DEC-0013/F et X10 hors Windows restent ouvertes.
  **X5 = 36**, preuves antérieures intactes; `origin/main = 1a7d652c`, inchangé.
- **Action unique suivante : retour à l'orchestrateur pour décider et ouvrir la prochaine tranche V1** — contrôle indépendant enregistré dans `ACTION-0047`.

Le contrôleur doit porter une attention particulière à `brain_index.rs`,
`projection.rs`, à la séparation des entrées d'analyse dans les commandes de
relations, et aux curseurs après rebuild. Les 3 artefacts TASK-0030 ne sont pas
scellés. La première tentative WebView2 a échoué dans le pilote CDP; la preuve
publiée est celle du rejeu neuf après correction. Aucun état VERIFIED attribué.

## Relais actuel — ACTION-0046, TASK-0029 VERIFIED, 2026-09-09

Le verdict rendu par l'orchestrateur technique indépendant est enregistré dans
[`ACTION-0046`](../reviews/ACTION-0046-independent-control.md) :
`ACTION-0046 = CLOSED`, `TASK-0029 = VERIFIED — PASS` dans sa portée exacte de
fondation Rust/SQLite et mesure d'ingénierie non produit. Claude Code était
l'exécuteur de `TASK-0029`; Codex a seulement rédigé l'enregistrement du
verdict externe et ne s'attribue pas `VERIFIED`.

**Ce qui a été prouvé.** La réserve d'`ACTION-0045` portait sur un point
précis : les requêtes qui fabriquent la petite vue n'étaient pas elles-mêmes
bornées. Elles le sont. Une page de 100 enfants directs coûte `p95` **611 →
322 µs** en première page et **387 → 892 µs** en fin de fratrie quand le corpus
passe de 100k à 1M, là où le prototype `OFFSET` de `TASK-0028`, appelé tel quel
sur la même base et dans le même processus, va de **13,6 à 116,7 ms** et de
**32,8 à 351,2 ms**. Critère d'ingénierie `p95` 1M ≤ 5 × `p95` 100k : **`PASS`**,
pire rapport **2,30**.

L'ordre fonctionnel n'a pas bougé — dossiers d'abord, nom insensible à la
casse, puis `id` — et un test prouve qu'il coïncide exactement avec l'ordre
préexistant. Ce qui a changé est **comment** il est servi : deux colonnes
générées `VIRTUAL`, un index qui couvre le filtre et l'ordre, et une
continuation par comparaison de valeurs de ligne que SQLite convertit en
recherche. Le plan est vérifié **par assertion pendant la campagne**, pas
raconté après coup.

**Ce qu'il faut lire avant d'implémenter la suite.** Trois choses.

1. `Index::replace_nodes` prend toujours **tout le corpus en mémoire** —
   189 Mo de working set à un million. `TASK-0029` n'y touche pas.
2. La recherche `P-08` est **inchangée** et reste linéaire dans le corpus. Elle
   garde son `OFFSET`, délibérément : c'est la tranche suivante.
3. Un `total descendants` exact reste **interdit sur le hot path** tant qu'il
   n'est pas pré-calculé : mesuré à **342 ms** à 1M, son coût suit le
   sous-arbre et non le budget de vue.

**Ce qui n'a pas été livré, et ne devait pas l'être.** Aucune commande Tauri,
aucun contrat IPC, aucun changement d'interface, aucun materializer, aucun
renderer. `F-042`, `F-050` et `F-051` restent `PROPOSED`; seule la sémantique
du compte de `F-051` est clarifiée par `DEC-0030`, sans que la capacité existe.
`MAX_NODES_PER_MAP = 5000` est inchangé. Aucune dépendance ajoutée. Aucune
`TASK-0030`, aucune `DEC-0031`.

**Limites obligatoires.** Banc `DEVELOPMENT_BENCH_NOT_ACCEPTANCE`, hors classe
cible; temps `debug`, la suite de tests du crate ne compilant pas en `release`;
`INDEX-SCALE` seulement, aucun fichier physique créé, donc rien n'est dit du
scanner à ces tailles; corpus synthétique d'une seule forme; deux positions
rendent un rapport inférieur à 1, ce qui est du bruit à l'échelle de quelques
centaines de microsecondes et non un gain. Les deux JSON restent non canoniques
et non protégés; `X5` reste à **36** et les quatre artefacts `TASK-0028` sont
inchangés. `origin/main = 1a7d652c`, non touché.

**Relais unique :** retour à l'orchestrateur pour ouvrir la prochaine tranche
V1 de convergence du pipeline réel. Ne créer ni `TASK-0030` ni `DEC-0031`
sans nouveau GO.

## Relais précédent — ACTION-0045, TASK-0028 VERIFIED, 2026-09-07

Le verdict de l'orchestrateur technique indépendant est enregistré dans
[`ACTION-0045`](../reviews/ACTION-0045-independent-control.md) : `TASK-0028 =
VERIFIED` comme **preuve de faisabilité architecturale / benchmark
synthétique**, sans validation de performance produit. Claude Code était
l'exécuteur; Codex a seulement rédigé l'enregistrement.

Le critère structurel tient au niveau harness/core : à budget 1024 et focus
racine, 10k, 100k et 1M `INDEX-SCALE` donnent chacun 1 024 entités et 1 023
arêtes, avec comptabilité exacte dans les 24 combinaisons. Les résultats
négatifs guident la suite : corpus global en mémoire pour `replace_nodes`,
recherche linéaire, tri des enfants non servi par l'index et compte récursif
exact coûteux.

Les limites restent obligatoires : banc hors `TARGET_CLASS`, 1M physique non
prouvé, composition index→frontend non testée, `SS7` partiel, `SS8 NOT PROVEN`,
temps Rust en `debug`, voisinage relationnel non mesuré et portée jsdom limitée
à la cardinalité. Les quatre JSON restent non canoniques et non protégés; X5
reste à 36. La dette préexistante de chemins locaux personnels dans d'anciens
documents reste hors périmètre; `TASK-0028` n'en ajoute pas.

**Relais unique :** l'orchestrateur choisit la prochaine tranche de fondation
d'échelle avant le materializer produit : pagination/index des enfants,
sémantique du compte d'agrégat, recherche indexée et indexation par flux ou
lots. Il décidera ensuite seulement du materializer, de
`F-042`/`F-050`/`F-051`, d'un budget candidat et d'un replay `TARGET_CLASS`.
Aucune `TASK-0029` ni `DEC-0030` n'est créée.

## Relais actuel — TASK-0028 IMPLEMENTED, 2026-09-07

`TASK-0028`, le banc synthétique de mise à l'échelle, est **`IMPLEMENTED`** sur
`build/v0.2-a12-synthetic-scale-spike`. L'exécuteur ne s'est pas attribué
`VERIFIED`; le contrôle indépendant reste à faire.

**Ce qui a été prouvé.** À budget de vue fixe, ce qui serait rendu ne bouge pas
quand le corpus passe de 10 000 à 1 000 000 : mêmes 1 024 entités, mêmes 1 023
arêtes, ~200 Ko de payload, 0,25 ms de layout. Chaque élément non rendu reste
**compté exactement** et **atteignable**, vérifié dans les 24 combinaisons par
deux méthodes indépendantes qui doivent s'accorder. C'est le critère de rejet
principal de `DEC-0029`, et il tient.

**Ce qui ne tient pas, et qu'il faut lire avant d'implémenter.** Trois chemins
coûtent le corpus ou le sous-arbre, pas le budget : la recherche `P-08`
(`LIKE` non ancré balaie tout — ~0,67 s à 1M), la page d'enfants directs
(l'ordre `kind = 'directory' DESC, name COLLATE NOCASE, id` **n'utilise pas**
`idx_nodes_parent`, d'où 106 ms pour 100 lignes à 1M), et le compte exact des
éléments d'un agrégat (CTE récursive, 1,34 s à 1M). Les ancêtres, eux, sont
plats à 43 µs : une requête réellement bornée existe déjà, c'est l'ordre de tri
qui défait les autres. `Index::replace_nodes` exige en outre **tout le corpus en
mémoire** — 335 Mo à 1M.

**Ce qui n'a pas été prouvé, et ne doit pas être présenté autrement.** La
composition bout-en-bout index→vue n'a **pas** été testée : la relier au
frontend exigerait une commande produit nouvelle, hors périmètre. Les vues
mesurées dans WebView2 réel comptent **12 et 157** entités, le bas de la plage
de budgets candidats. `SS8` est **`NOT PROVEN`** : la désactivation du GPU n'est
pas confirmable depuis l'extérieur de la page. **1 000 000 physique n'est pas
prouvé** — seul l'index à 1M l'est. Le banc est
`DEVELOPMENT_BENCH_NOT_ACCEPTANCE` : **aucune cible « machine modeste » n'est
validée**, et tous les temps Rust sont des temps `debug`.

**Ce qui n'a pas changé.** Aucun état produit : `F-042`, `F-050`, `F-051`
restent `PROPOSED`; `MAX_NODES_PER_MAP = 5000` est en vigueur; aucun renderer
n'est choisi; aucun budget de vue n'est décidé; aucune `DEC-0030` ni
`TASK-0029` n'existe. `X5` reste à **36** et les 36 preuves scellées sont
intactes, empreintes relevées avant et après les passes WebView2.
`origin/main = 1a7d652c`, non touché. `R8` est entière : aucun chiffre ne sort
des artefacts `TASK-0028`.

Le harness est **entièrement `#[cfg(test)]`** : `cargo build` produit le même
binaire produit, sans avertissement nouveau. Les campagnes sont `#[ignore]` et
se relancent par `scripts/task0028-scale-spike.ps1`, puis
`scripts/task0028-ss7-bounded-view-webview2.ps1` pour WebView2.

## Relais actuel — ACTION-0044, TASK-0027 VERIFIED, 2026-09-06

Le verdict rendu par l'orchestrateur technique indépendant est enregistré dans
[`ACTION-0044`](../reviews/ACTION-0044-independent-control.md) : cohérence
architecture / vision / roadmap / parité / matrice **PASS**,
`ACTION-0044 = CLOSED`, `TASK-0027 = VERIFIED`, sans réserve corrective
bloquante. Claude Code était l'exécuteur de `TASK-0027`; Codex a seulement
rédigé l'enregistrement. Aucun des deux ne s'est auto-attribué `VERIFIED`.

Le contrôle est **documentaire uniquement**. Le diff substantif porte sur 15
fichiers documentaires ou d'orchestration; aucun code, runtime, garde X5 ou
JSON de preuve n'a changé. `X5` reste à 36 et `origin/main` à `1a7d652c`, non
touché.

La frontière approuvée demeure une cible : `F-042 = PROPOSED / MVP`;
`F-050` et `F-051 = PROPOSED / MVP / P0`. Le materializer, le budget de vue,
le LOD et les agrégats restent non implémentés. Les niveaux 10k / 100k / 1M
restent non mesurés. Graphify est `NOT INTEGRATED`, Forge reste distinct,
aucun renderer n'est choisi et la finition visuelle moderne reste future en
étape B.

`F-046` reste `PROPOSED`, avec `DEC-0013/F` bloquante. `F-047` reste
`DEFERRED`; `X10` hors Windows reste non prouvée race-safe et `R8` entière.
La dette préexistante de l'index `docs/decisions/README.md`, qui omet déjà
`DEC-0024` à `DEC-0028`, n'a pas été réparée partiellement.

**Relais unique :** l'orchestrateur décide si le scale spike synthétique doit
devenir `TASK-0028`. Aucune `TASK-0028` ni `DEC-0030` n'est créée.

## Relais actuel — TASK-0027, réalignement d'architecture à grande échelle, 2026-09-06

**Tranche documentaire livrée `IMPLEMENTED`, en attente de contrôle
indépendant.** Branche `build/v0.2-a11-progressive-scale-architecture`, créée
et publiée depuis `b580942`, dont le parent est bien `ffa9504`. Agent
d'exécution : Claude Code.

**Ce qui a été écrit.** Trois documents créés —
[`TASK-0027`](../tasks/TASK-0027-progressive-scale-architecture-realignment.md),
[`DEC-0029`](../decisions/DEC-0029-progressive-materialization-and-scale-boundary.md),
[`PROGRESSIVE_SCALE_ARCHITECTURE.md`](../architecture/PROGRESSIVE_SCALE_ARCHITECTURE.md) —
et onze amendés : `PROJECT_VISION.md`, `ROADMAP.md`,
`ARCHITECTURE_BASELINE.md`, `CARTETOPO_FUNCTIONAL_PARITY.md`,
`FEATURE_MATRIX.md`, `REQUIREMENTS_BASELINE.md`, les cinq documents `docs/ai/`
et `.orchestrator/RESULT.md`.

**Ce qui n'a PAS été touché, et c'est le point le plus important pour le
contrôleur.** **Aucun** fichier sous `src/`, `src-tauri/`, `scripts/`,
`graph/` ni `docs/performance/runs/`. **Aucun** JSON de preuve. **`X5` reste à
36 noms.** `MAX_NODES_PER_MAP` reste à `5_000` dans
`src-tauri/src/map/mod.rs`. `origin/main` reste `1a7d652c`, non fusionné, non
mergé, non cherry-piqué.

**La frontière gelée.** *FileTopo indexe grand, matérialise petit, et ne rend
que le contexte utile.* Corpus, graphe logique, vue matérialisée et rendu sont
quatre plans distincts. `1 élément indexé` = `1 entité accessible`, pas `1
carte rendue`. `MAX_NODES_PER_MAP = 5000` est requalifié en **limite de
tranche historique**, destinée à être remplacée par un **budget de vue** — mais
**pas dans cette tâche**.

**Parité.** `P-01`, `P-02`, `P-03` amendées par **`P-SCALE-R1`**, formulations
d'origine conservées et visibles sous les nouvelles, à la manière de `P02-R1`.
Les amendements **ajoutent** des obligations de véracité; aucune exigence n'est
retirée. **22 exigences**, inchangé. **`P-08` devient le pilier du scale
spike.**

**Matrice.** 49 → 51. `F-050` et `F-051` ajoutées, `MVP` / `P0`. `F-042` monte
`ULTÉRIEUR` → `MVP`, motif écrit. Répartition `MVP` 44 / `ULTÉRIEUR` 2 /
`DIFFÉRÉ` 5. `F-046` reste `PROPOSED`, `F-047` reste `DIFFÉRÉ`.

**Frontières produit.** **Graphify `NOT INTEGRATED`** : aucune dépendance,
aucun runtime, aucun adaptateur, aucun `graph.json` global, aucun dashboard,
aucun pipeline LLM obligatoire. **Forge reste distinct.** **Aucun renderer
choisi.** **Pas de dépendance à un GPU puissant ni à WebGL.**

**Ce que le prochain agent doit faire.** Le **contrôle indépendant de
`TASK-0027`**, sur preuves documentaires, par une instance distincte de
l'exécuteur. Rien d'autre. Aucune `TASK-0028` n'est créée; la séquence
proposée dans `ROADMAP.md` est `PROPOSED` et n'autorise aucun travail.

**Pièges connus pour le contrôleur.**

- Les mentions « 49 lignes » et « `F-001` à `F-049` » subsistent dans
  `FEATURE_MATRIX.md`, `REQUIREMENTS_BASELINE.md` et `ROADMAP.md` : ce sont
  des **enregistrements d'époque** du 2026-09-02, volontairement conservés,
  pas des incohérences. Les répartitions courantes disent bien **51**.
- `F-042` apparaît en `MVP` dans trois documents — matrice, baseline,
  `DEC-0029` — avec sa **valeur d'origine `ULTÉRIEUR` conservée en note**.
  C'est voulu; la note n'est pas une classification concurrente.
- Les chiffres 10 000 / 100 000 / 1 000 000 apparaissent partout comme
  **cibles**. Toute lecture qui les prendrait pour des mesures serait fausse :
  **aucun banc n'a été exécuté**.

**Non testé.** Aucune mesure de performance, aucune suite de tests rejouée,
aucun build Tauri, aucun `pnpm build`, aucun replay WebView2. La tâche ne
touchant aucun code, aucune régression d'exécution n'est possible ni
contrôlée. Réserve `R8` entière; `DEC-0013/F` toujours bloquante; garantie
`X10` hors Windows toujours non prouvée.

## Relais précédent — ACTION-0043, TASK-0026 VERIFIED, 2026-09-06

Le verdict rendu par l'orchestrateur technique indépendant est enregistré dans
[`ACTION-0043`](../reviews/ACTION-0043-independent-control.md) : `ED1` à
`ED15 = PASS`, `ACTION-0043 = CLOSED`, `TASK-0026 = VERIFIED`, sans réserve
fonctionnelle bloquante ni réserve corrective ouverte. Codex était l'exécuteur
de la tranche; Claude Code a seulement rédigé l'enregistrement, corrigé les
commentaires `X5` périmés et appliqué le scellement. Aucun des deux ne s'est
auto-attribué `VERIFIED`.

X5 passe de **34** à **36** noms. Les deux seuls ajouts, après les 34 noms
historiques inchangés, sont les preuves `TASK-0026-ED15-*` pass1 puis pass2.
Les six replays `TASK-0026-EC15-*`, `TASK-0026-DR15-*` et `TASK-0026-SR15-*`
restent non canoniques et non protégés. Les gardes Rust, TypeScript et
PowerShell sont en parité exacte sur les 36 noms, dans le même ordre.

Après scellement : `protectedArtifactCount = 36`,
`protectedDestinations = [ED15 pass1, ED15 pass2]`,
`owningTaskId = TASK-0026`, `writesUnderItsOwnTaskOnly = false`. Rejouer
`ED15` depuis ce checkout est refusé — c'est la porte qui fonctionne, pas une
régression.

**Un défaut a été trouvé et réparé pendant le scellement.** Quatre scénarios
d'écriture — `dreScenario`, `exactDuplicateScenario`, `genericRelationScenario`
et `reviewScenario` — exigeaient avant d'écrire que `X5` vaille exactement 34
et que l'intersection soit vide. Ces deux faits ne sont vrais qu'entre deux
scellements : portés à 36, les quatre scénarios auraient avorté, rendant
**injouables** les six replays qui doivent rester rejouables. La condition
porte désormais sur le nom que le scénario s'apprête à écrire, ce qui ne
pourrit pas, et deux tests `X5` nouveaux l'imposent. C'est le défaut de la
réserve `X8` sous forme numérique.

Validations de clôture : `runArtifacts.test.ts` **44/44**, Rust ciblés
**26/26**, suite Rust **229/229**, suite TypeScript **246/246**, `pnpm check`
**PASS**, garde PowerShell **36 refus / 36 noms uniques** avec les six replays
toujours autorisés, parité Rust/TS/PowerShell **PASS**, `git diff --check`
**PASS**, aucun JSON de preuve modifié. Aucun replay WebView2 et aucun build
Tauri n'ont été refaits.

`F-046` reste `PROPOSED` : l'exploration exacte à l'échelle est vérifiée,
l'identité physique persistante reste absente et `DEC-0013/F` bloquante. X10
hors Windows reste non prouvée race-safe.

**Écart signalé, hors périmètre :** `main` locale reste `91bbe90f`, mais
`origin/main` porte un commit de plus, `1a7d652c` — « docs: update canonical
GitHub identity », signé Sébastien Dubé, 2026-09-06 18:16 −0400. C'est une
action du propriétaire, hors de cette branche; rien n'a été publié vers `main`
par cette fermeture.

**Relais unique :** rendre la main à l'orchestrateur technique pour définir la
tranche suivante. Ne pas créer `TASK-0027` ni `DEC-0029` sans GO.

## Relais précédent — TASK-0026 IMPLEMENTED, 2026-09-06

`TASK-0026` livre l'explorateur borné de contenus binaires identiques observés
sur `build/v0.2-a10-exact-duplicate-explorer`. Son statut est
**`IMPLEMENTED`**, jamais `VERIFIED` par Codex; `DEC-0028` est implémentée et
attend le même contrôle indépendant.

Le backend lit seulement la génération courante d'un cerveau, agrège et page
dans SQLite avant matérialisation, avec un plafond 100 pour groupes et membres.
L'UI distingue l'absence de campagne de zéro résultat, montre digest complet,
groupe vide et fraîcheur, et permet une navigation clavier sans créer relation
ni suggestion. La limite « contenu identique ≠ même fichier physique/copie »
reste adjacente et explicite.

ED15 final porte sur 1 200 fichiers synthétiques : 125 groupes, 373
occurrences, pages `50/50/25`, rehash complet inchangé, vrai restart/rebuild,
persistance et résolution honnête. Les replays `EC15`, `DR15`, `SR15` sont
également publiés en deux passes. Les huit JSON `TASK-0026` sont non canoniques
et hors X5.

Validations finales : Rust **227/227** plus ciblés exact duplicate **3/3** et
moteur **14/14**; TypeScript **241/241** et ciblés **42/42**; typage, build web,
Tauri debug et `git diff --check` verts. X5 reste 34/34 inchangé et refusé,
intersection runtime/protected vide, propriétaire runtime `TASK-0026`.

`F-046` reste `PROPOSED`; aucune identité physique persistante ni cache taille
+ mtime n'existe. `DEC-0013/F` demeure bloquante et X10 hors Windows non
prouvée race-safe. `main` reste `91bbe90f`.

**Relais alors demandé :** contrôle indépendant de `TASK-0026` sur `ED1` à
`ED15`, les huit preuves WebView2 et l'intégrité X5. Il a été rendu par
`ACTION-0043`, enregistré en tête de ce fichier.

## Relais actuel — ACTION-0042, TASK-0025 VERIFIED, 2026-09-05

Le verdict rendu par l'orchestrateur technique indépendant est enregistré dans
[`ACTION-0042`](../reviews/ACTION-0042-independent-control.md) : `SR1` à `SR15
= PASS`, `ACTION-0042 = CLOSED`, `TASK-0025 = VERIFIED`, sans réserve
corrective ouverte. Claude Code était l'exécuteur de la tranche; Codex a
seulement rédigé l'enregistrement et appliqué le scellement. Aucun des deux ne
s'est auto-attribué `VERIFIED`.

X5 passe de **32** à **34** noms. Les deux seuls ajouts, après les 32 noms
historiques inchangés, sont les preuves `TASK-0025-SR15-*` pass1 puis pass2.
Les replays `TASK-0025-DR15-*`, `TASK-0025-J12-*` et `TASK-0025-X11-*` restent
non canoniques et non protégés. Les gardes Rust, TypeScript et PowerShell sont
en parité exacte.

Le runtime écrit encore sous `TASK-0025`; les deux `SR15` sont donc maintenant
des destinations refusées. État dérivé : `protectedArtifactCount = 34`,
`protectedDestinations = exact2 SR15`, `owningTaskId = TASK-0025`,
`writesUnderItsOwnTaskOnly = false`. C'est l'état normal après `VERIFIED` et il
ne faut pas le masquer par une migration anticipée vers `TASK-0026`.

Validations ciblées : TypeScript **36/36**, Rust **24/24**, PowerShell **34/34
refus** avec 34 noms uniques et X11 autorisée, parité exacte et
`git diff --check`. Aucun JSON sous `docs/performance/runs/` n'a changé; aucun
replay WebView2 ni build produit n'a été lancé.

`F-044` et `F-045` restent `IMPLEMENTED`, désormais vérifiées par
`TASK-0025 / ACTION-0042`. `F-043` reste vérifiée par `TASK-0024`; `F-046`
reste `PROPOSED`. Aucun état `DEFERRED` persistant n'est ajouté et aucune
politique automatique de réévaluation n'est créée. `DEC-0013/F` et la limite
X10 hors Windows demeurent.

**Relais unique :** retour à l'orchestrateur pour définir la prochaine tranche
fonctionnelle après `TASK-0025 VERIFIED`. Ne créer ni `TASK-0026` ni
`DEC-0028` avant ce nouveau GO.

## Relais actuel — TASK-0025 IMPLEMENTED, 2026-09-05

`TASK-0025` livre `F-044` et `F-045` sur la branche
`build/v0.2-a9-suggestion-review-memory`, créée depuis le commit
d'orchestration `7bb9857` et publiée. `main` n'a pas bougé : `91bbe90f`.

**Statut : `IMPLEMENTED`, contrôle indépendant requis.** L'exécuteur ne s'est
pas attribué `VERIFIED`, et les deux preuves `TASK-0025-SR15-*` ne rejoignent
donc pas `X5`, qui reste à **32** noms.

Ce qui est fait, en une phrase chacun :

- le store intra-relations est en **schema v4**, avec exactement trois états de
  suggestion — `pending`, `approved`, `rejected` — et une colonne nullable
  `decision_reconsider_cause` laissée `NULL`;
- **aucun état `deferred`** n'existe : « Plus tard » n'appelle aucune commande;
- une **file de révision** générique et paginée existe par cerveau, avec un
  `totalPending` exact et une limite maximale publiée;
- un **rejet explicite** est enregistré, ne crée aucune relation, et la
  reconciliation `dre-v1` ne le défait pas;
- toutes les **destinations runtime** sont passées sous `TASK-0025` avant le
  premier rejeu, sans toucher aux 32 noms protégés.

Ce qu'il reste à décider, et par qui :

- **le contrôle indépendant de `TASK-0025`**, par une instance distincte de
  l'exécuteur, sur les critères `SR1` à `SR15` et les preuves publiées. Lui seul
  peut faire passer `F-044` et `F-045` au-delà de `IMPLEMENTED`, et lui seul
  peut décider d'étendre `X5` aux deux preuves `SR15`;
- la suite produit après cette tranche. Aucune `TASK-0026` n'a été créée.

Ce qui reste explicitement ouvert : la **politique de réévaluation** d'une
décision humaine est hors scope v1 — le schéma peut l'enregistrer, rien ne la
décide. `DEC-0013/F` demeure bloquante et `F-046` reste `PROPOSED`. La garantie
`X10` hors Windows reste non prouvée.

## Relais actuel — ACTION-0041, TASK-0024 VERIFIED, 2026-09-05

Le verdict indépendant est enregistré dans
[`ACTION-0041`](../reviews/ACTION-0041-independent-recontrol.md), sans être
rendu par Codex : `X11 = CLOSED`, `ACTION-0040 = CLOSED`, `ACTION-0041 =
CLOSED`, `TASK-0024 = VERIFIED`. Le HEAD re-contrôlé est `f78d1bf` et le
commit substantif X11 est `bcc10a8`.

X5 passe de **29** à **32** preuves. Les trois ajouts, à la suite des 29 noms
inchangés, sont DR15 pass1, DR15 pass2 et J12 de `TASK-0024`. Les gardes Rust,
TypeScript et PowerShell portent la même liste. La preuve corrective X11, H9,
K11, K12, L12, M12, N15, EC15 et toutes les variantes `-abandon` restent non
canoniques et non protégées.

Le runtime écrit encore sous `TASK-0024`; exactement les trois preuves
canoniques sont maintenant des destinations refusées. État dérivé :
`protectedArtifactCount = 32`, `protectedDestinations = exact3`,
`owningTaskId = TASK-0024`, `writesUnderItsOwnTaskOnly = false`. C'est l'état
normal après `VERIFIED`; la prochaine tranche migrera ses destinations avant
tout éventuel rejeu.

Cette fermeture touche seulement la gouvernance et les gardes X5. Aucun JSON
de preuve ni code produit n'est modifié, et aucun scénario WebView2 n'est
rejoué. `F-043` reste `IMPLEMENTED` dans la matrice, désormais vérifiée par
`TASK-0024`. `F-044`, `F-045`, `F-046` restent `PROPOSED`; `DEC-0013/F` et la
limite non-Windows de X10 demeurent.

**Relais unique :** retour à l'orchestrateur pour définir la prochaine tranche
après `TASK-0024 VERIFIED`. Aucune `TASK-0025` créée.

## Relais actuel — TASK-0024 corrigée sur X11, toujours IMPLEMENTED, 2026-09-05

`TASK-0024` reste livrée **`IMPLEMENTED`**, jamais auto-attribuée `VERIFIED`,
sur `build/v0.2-a8-deterministic-relation-engine`. `DEC-0026` et `F-043` restent
`IMPLEMENTED — contrôle indépendant requis`.

Le contrôle indépendant [`ACTION-0040`](../reviews/ACTION-0040-independent-control.md)
a rendu `CHANGES_REQUIRED` et ouvert la réserve `X11` : le moteur était
générique, mais la couche héritée de `TASK-0017` filtrait encore les lectures
intra-relations sur `quasi-empty`, si bien que `brain-beta` (`deep`) ne pouvait
ni ouvrir le panneau, ni lancer l'analyse depuis l'interface, ni approuver une
suggestion core. **Claude enregistre ce verdict; il ne le rend pas et ne ferme
pas `X11`.**

La correction découple les deux périmètres. `legacy_fixture_spec()` répond
`Some` pour la seule fixture historique, `source_spec()` valide la source de
n'importe quel cerveau, et `ensure_in_scope()` ne sert plus qu'à `self_check`,
qui reste gelé sur `quasi-empty`. `open_relations` ne rejoue `derive()` et ne
sème les suggestions gelées que dans le périmètre legacy; ailleurs il lit le
store tel qu'il est. `node_relations` et `approve_suggestion` ne sont plus
filtrés par la fixture, le refus d'approbation d'une suggestion core périmée
étant inchangé. Le DTO dit `legacyInScope`, et `RelationsPanel` reçoit
`available` et `legacyInScope` : la note legacy explique la limite sans jamais
masquer le bouton **Analyser les relations**, l'état `dre-v1`, les relations
core, les suggestions core ni leur approbation.

Validations exécutées : Rust **200/200**, TypeScript **215/215**, `pnpm check`,
`pnpm build`, Tauri debug `--no-bundle`. La preuve corrective
`TASK-0024-X11-generic-brain-webview2.json` a été écrite dans un vrai processus
WebView2 `152.0.4191.62` sur `brain-beta` : activation clavier fiable, zéro clic
programmatique, report `brain-beta` / `dre-v1` / `CURRENT`, aucun producteur
legacy, source inchangée, processus fermé. Elle est **non canonique**, ne
rejoint pas `X5` et ne remplace aucune preuve gelée. Les deux `DR15` ont été
rejouées sur une variante fraîche et le `J12` réel repasse : les invariants
legacy d'Alpha sont strictement identiques.

Sur `deep`, `core.identical-content` est sautée faute de signal de contenu et la
règle des frères numérotés produit 39 suggestions. **Zéro sortie serait un
résultat valide** : ce qui est prouvé est la généricité du moteur et de
l'interface, pas qu'une règle doive produire.

X5 reste exactement à **29** noms, inchangés dans les trois gardes. Toutes les
destinations actives appartiennent à `TASK-0024`, aucune n'est protégée.
`main` reste `91bbe90f`. Les quatre fixtures gelées sont inchangées.

**Relais unique :** re-contrôle indépendant ciblé `X11` / `TASK-0024`. Ne créer
aucune `TASK-0025`. `F-044`, `F-045`, `F-046` restent `PROPOSED`; `DEC-0013/F`
demeure bloquante.

## Relais actuel — TASK-0024 IMPLEMENTED, 2026-09-05

`TASK-0024` est livrée **`IMPLEMENTED`**, jamais auto-attribuée `VERIFIED`, sur
`build/v0.2-a8-deterministic-relation-engine`. `DEC-0026` et `F-043` sont
`IMPLEMENTED — contrôle indépendant requis`.

Le runtime `dre-v1` possède exactement deux règles `core.*`. La première
établit `content-identical` seulement sur SHA-256 non vide de la génération
courante et produit N-1 arêtes ancrées; la seconde laisse des frères numérotés
consécutifs au statut de suggestion `revision`, avec explications FR/EN et
signaux structurés sans score. Le store distingue structurellement les sorties
core des lignes legacy, conserve `APPROVED`, réconcilie sans duplication et
masque les sorties core devenues stale jusqu'au rerun.

Validations exécutées : Rust **197/197**, TypeScript **213/213**, `pnpm check`,
`pnpm build`, Tauri debug `--no-bundle`. DR15 passe dans deux vrais processus
WebView2 `152.0.4191.62` sur une même variante fraîche, avec activation clavier
et approbation fiables, zéro clic programmatique, persistance et idempotence.
J12 réel passe sous `TASK-0024`.

X5 reste exactement à **29** noms, inchangés dans les trois gardes. Toutes les
destinations actives appartiennent à `TASK-0024`, aucune n'est protégée et les
trois nouvelles preuves ne seront scellées qu'après vérification indépendante.
`main` reste `91bbe90f`. Les quatre fixtures gelées sont inchangées; DR15
emploie une source synthétique dédiée au scénario, hors de leur catalogue.

**Relais unique :** contrôle indépendant de `TASK-0024`. Ne créer aucune
`TASK-0025`. `F-044`, `F-045`, `F-046` restent `PROPOSED`; `DEC-0013/F`
demeure bloquante.

## Relais actuel — ACTION-0039, TASK-0023 VERIFIED, 2026-09-04

Le verdict indépendant est enregistré dans
[`ACTION-0039`](../reviews/ACTION-0039-independent-recontrol.md), sans être
rendu par Claude : `X9 = CLOSED`, `X10 = CLOSED`, `ACTION-0038 = CLOSED`,
`ACTION-0039 = CLOSED`, `TASK-0023` **`VERIFIED`**, sur le HEAD re-contrôlé
`adba6568` et le commit substantif `X10` `9e9fb37a`. Aucune réserve ne reste
ouverte.

`X5` est passée de **27** à **29** preuves protégées. Les deux ajoutées sont
les seules preuves canoniques de `TASK-0023` :
`TASK-0023-EC15-exact-content-observations-webview2-pass1.json` et
`…-pass2.json`. Les 27 antérieures conservent exactement le même ordre, et les
trois gardes canoniques — `src-tauri/src/map/commands.rs`,
`src/map/runArtifacts.ts`, `scripts/protected-run-artifacts.ps1` — portent la
même liste. Aucun autre artefact de la tranche n'est scellé : ses replays `H9`,
`J12`, `K11`, `K12`, `L12`, `M12`, `N15` et toutes les variantes `-abandon`
restent écrivables.

**Ce qu'il faut savoir avant de reprendre le code.** Le runtime livré dans ce
checkout écrit encore sous `TASK-0023`, donc ses deux destinations `EC15` sont
maintenant refusées par `write_run_artifact` :
`protectedArtifactCount = 29`, `protectedDestinations` = les deux `EC15`,
`writesUnderItsOwnTaskOnly = false`. **C'est l'état normal d'une tranche
vérifiée**, exactement ce qui est arrivé à `TASK-0020`, et
`SEALED_RUNTIME_DESTINATIONS` le publie. Ne pas « réparer » cela en renommant
d'avance le runtime : la prochaine tranche migre ses destinations sous son
propre nom de tâche **avant** tout nouveau rejeu, comme chaque tranche
précédente l'a fait.

Cette action était gouvernance et scellement seulement : rien de
`content_signals.rs`, SHA-256, `sha256-tree-v1`, SQLite, layout, relations,
fixtures, JSON `EC15`, `Cargo.toml` ou `Cargo.lock` n'a été touché, et aucune
campagne n'a été rejouée. Validations : Rust **184/184**, TypeScript
**211/211**, `pnpm check`, `pnpm build`; aucune preuve modifiée; `main` reste
`91bbe90f`.

**Limites transmises :** la garantie race-safe `X10` est prouvée **sur
Windows** et le repli non-Windows n'est pas revendiqué race-safe;
`DEC-0013/F` demeure bloquante pour l'identité physique persistante, donc
`F-046` reste `PROPOSED` bien que sa fondation de contenu exact soit désormais
vérifiée.

**Relais :** retour à l'orchestrateur technique pour définir la prochaine
tranche. Aucune `TASK-0024` n'est créée; aucun travail de code n'est ouvert
avant ce GO.

## Relais actuel — ACTION-0038, correction X10, 2026-09-04

Le verdict externe est enregistré dans
[`ACTION-0038`](../reviews/ACTION-0038-independent-recontrol.md), sans être
rendu par Codex : `X9 = CLOSED`, `ACTION-0038 = CHANGES_REQUIRED`,
`TASK-0023 = IMPLEMENTED`, `X10 = OPEN`. Aucun autre point accepté n'est
rouvert.

Sur Windows, `open_confined_regular_file` épingle la racine puis chaque
composant intermédiaire par un handle ouvert avec
`FILE_FLAG_OPEN_REPARSE_POINT | FILE_FLAG_BACKUP_SEMANTICS`. La classification
porte sur `File::metadata()` du handle réel; les répertoires refusent les
partages écriture et suppression jusqu'à la fin de la lecture. Le fichier
final refuse le partage suppression, est classé depuis son handle, puis ce
même `File` alimente SHA-256. `sha256-tree-v1` utilise la même primitive bas
niveau : un répertoire reste épinglé pendant `read_dir` et toute sa récursion.

L'audit préalable a confirmé que Rust `1.98.0` fournit les primitives requises
dans `std::os::windows::fs::OpenOptionsExt`. Aucune dépendance n'est ajoutée;
`Cargo.toml` et `Cargo.lock` restent inchangés. Aucune metadata d'identité de
handle n'est persistée.

Trois tests TOCTOU synchronisés passent réellement : fichier remplacé par un
reparse sortant avant l'ouverture sûre, répertoire remplacé par une jonction
sortante avant le parcours, et composant `a` de `root/a/b/file` impossible à
renommer après épinglage. Aucun test n'utilise de sommeil et aucun octet
extérieur n'est lu.

Validation : `content_signals` 29/29, Rust 181/181, TypeScript 208/208,
`pnpm check`, `pnpm build`, Tauri debug `--no-bundle`. EC15 passe 1/2 dans deux
processus WebView2 `152.0.4191.62`, variante fraîche
`task0023-ec15-x10-20260904153755-5a40e1` : 8 fichiers, 1 424 octets, 8
digests, redémarrage réel, stale UI honnête, Alpha/Gamma et relations
inchangés. X5 reste exactement 27; seules les deux preuves EC15 non protégées
sont réécrites.

Limites : le repli non-Windows n'est pas revendiqué race-safe et n'a pas été
compilé/exécuté; `DEC-0013/F` reste bloquante. `cargo fmt --check` reste rouge
sur le formatage historique global avec rustfmt 1.98; aucun reformatage global
n'a été appliqué.

**Prochaine action unique : re-contrôle indépendant ciblé `X10` /
`TASK-0023`.** `X10` reste `OPEN` et Codex ne s'attribue pas `VERIFIED`.

## Relais actuel — ACTION-0037, correction X9, 2026-09-04

Le verdict indépendant est enregistré dans
[`ACTION-0037`](../reviews/ACTION-0037-independent-control.md) : sur le HEAD
`12b3c87`, `ACTION-0037` = `CHANGES_REQUIRED`, `TASK-0023` = `IMPLEMENTED`,
`X9` = `OPEN`. Claude a enregistré ce verdict sans le rendre.

`X9` visait le seul fingerprint global de campagne, resté sur
`fixtures::fingerprint(root)` : suivi possible d'un symlink fichier par
`fs::read`, donc lecture possible hors racine, et accumulation de tous les
contenus dans un `Vec<u8>`, donc mémoire non bornée.

La correction ajoute `content_signals::content_source_fingerprint`, publiée
`sha256-tree-v1:<64 hex minuscules>`. Elle parcourt les entrées dans un ordre
déterministe, n'utilise que `symlink_metadata`, marque tout symlink, jonction
ou reparse point comme lien sans ouvrir, lire, parcourir ni canonicaliser sa
cible, traite un type non interprétable comme non traversable, et alimente le
hasher par un unique tampon réutilisé de 64 KiB. `observe_root_with_hook` ne
publie plus que cette valeur pour `sourceFingerprintBefore`/`After`;
l'invariant `SOURCE_CHANGED_DURING_OBSERVATION` est inchangé.

`fixtures::fingerprint` n'est pas modifiée : elle garde son rôle historique de
fingerprint des fixtures gelées et des preuves `TASK-0016`..`TASK-0022`, dont
les valeurs `fnv1a64:…` restent reproductibles. Les deux rôles sont documentés
côte à côte dans le code.

Validation : `cargo test` **178/178**, `pnpm test` **208/208**, `pnpm check`,
`pnpm build`, Tauri debug `--no-bundle`, puis EC15 passes 1 et 2 en deux vrais
processus WebView2 `152.0.4191.62` sur la variante fraîche
`task0023-ec15-x9-20260904145356-6ebb99`. Les deux preuves EC15 — les seules
réécrites, non protégées — publient
`sourceFingerprintBefore == sourceFingerprintAfter == sha256-tree-v1:85f73748…`
et conservent 8 FILE hashés, 3 dossiers exclus, stores Alpha/Gamma distincts,
zéro relation créée, rebuild persistant, UI honnête au redémarrage, 8
ouvertures, 1 424 octets relus et 8 digests recalculés. X5 reste exactement à
27, bit-for-bit.

Limites : les quatre tests `#[cfg(unix)]` de non-suivi de lien ne sont pas
compilés sur cet hôte Windows; la création de symlink Windows a été refusée
faute de privilège, donc la preuve exécutée du non-suivi est une jonction
`mklink /J`, complétée par deux tests déterministes de classification. La
preuve de streaming est un compteur de lectures, pas un profileur.
`DEC-0013/F` reste bloquante pour l'identité physique persistante; `R8` et
`B0` inchangés, `B0` contourné par `CARGO_INCREMENTAL=0`, sans `clean`.

**Prochaine action unique : re-contrôle indépendant ciblé `X9` de
`TASK-0023`.** `TASK-0023` reste `IMPLEMENTED`, `X9` reste `OPEN`,
`ACTION-0037` reste `CHANGES_REQUIRED`; aucune `TASK-0024` n'est créée.

## Relais actuel — TASK-0023 IMPLEMENTED, 2026-09-03

`TASK-0023` est livrée sur `build/v0.2-a7-exact-content-observations`, mais
n'est pas `VERIFIED`. Le gel `711071c` précède tout code produit et EC1–EC15
sont restés immuables.

Le backend calcule SHA-256 avec RustCrypto `sha2 0.11.0` par blocs bornés,
persiste seulement la dernière génération atomique dans un store schéma 1 par
cerveau et refuse les chemins non relatifs, traversals et sorties par
symlink/reparse. Taille+mtime ne servent jamais à réutiliser un digest. Une
mutation pendant lecture invalide le digest; un changement global de source
empêche la nouvelle génération de devenir courante.

Alpha et Gamma lisent la fixture synthétique commune dans deux stores
distincts. Le même chemin porte le même digest mais deux `BrainNodeRef`. Le
rebuild map conserve store/génération/digest. Le hashing ne modifie aucun
store, compte ou graphe relationnel. Aucun contenu, extrait, chemin absolu,
identifiant physique Windows, relation, suggestion ou provenance n'est stocké.

Validation : 171 tests Rust, 208 tests TypeScript, `pnpm check`, `pnpm build`
et Tauri debug `--no-bundle` passés. EC15 passe 1 et passe 2 ont utilisé deux
processus WebView2 `152.0.4191.62`, fermés réellement, sur la même variante
fraîche. Le second processus a affiché « Dernière observation enregistrée »
puis ouvert 8 fichiers, relu 1 424 octets et recalculé 8 digests. Les deux
preuves `TASK-0023-EC15-*` sont publiées mais non protégées.

X5 reste exactement à 27 noms dans Rust, TypeScript et PowerShell, sans
modification des preuves historiques. Les destinations courantes appartiennent
toutes à `TASK-0023`, aucune n'est protégée.

Limites : `F-043`, `F-044`, `F-045` et `F-046` restent `PROPOSED`; aucune
règle `same-hash`, relation, suggestion ni IA. L'identité physique persistante
de `F-046` reste non implémentée, `DEC-0013/F` toujours bloquante. R8 et B0
sont inchangés; `CARGO_INCREMENTAL=0` a été employé sans clean.

**Prochaine action unique : contrôle indépendant de `TASK-0023`.** Contrôler
EC1–EC15 et les deux preuves, puis attribuer seul ou non `VERIFIED`. Ne pas
créer `TASK-0024` dans ce contrôle.

## Relais actuel — TASK-0022 VERIFIED, 2026-09-03

Le verdict rendu par l'orchestrateur technique indépendant est enregistré dans
[`ACTION-0036`](../reviews/ACTION-0036-independent-recontrol.md) : sur le HEAD
`645b9484790f8e766f7eed93107b9431d144aaa6` et le commit substantif `X8`
`d6963e65e9829b8c17196eeb469eabfb3aa86aeb`, `ACTION-0036`, `X8` et
`ACTION-0035` sont **`CLOSED`**; `TASK-0022` est **`VERIFIED`**. Codex a
enregistré ce verdict sans le rendre et sans rouvrir un autre point.

Conséquence X5 : les huit preuves canoniques `TASK-0022` — J12, K11, L12 en
deux passes, M12 en deux passes et N15 en deux passes — sont ajoutées aux 19
preuves antérieures. Rust, TypeScript et PowerShell portent exactement les
mêmes **27** noms, dans le même ordre. Le H9 non exécuté, K12 non publié comme
preuve `TASK-0022` et les variantes `-abandon` ne sont pas protégés.

Validations limitées au périmètre demandé : 26/26 tests TypeScript
`runArtifacts`, 3/3 tests Rust X5 ciblés, et garde PowerShell exercée sur les
27 refus. Aucun scénario WebView2 n'a été rejoué et aucun artefact de preuve
n'a été modifié. `main` est intacte à `91bbe90f0f99026c28cd345784d4f579a0016db2`.

**Prochaine action unique : retour à l'orchestrateur pour définir la prochaine
tranche.** Ne pas créer `TASK-0023` sans nouvelle décision.

## Relais actuel — TASK-0022 IMPLEMENTED, 2026-09-03

`TASK-0022` est livrée sur `build/v0.2-a6-topographic-node-graph`, mais n'est
pas `VERIFIED`. Le commit de gel `289cf9b` précède tout code produit et N1 à
N15 sont restés immuables.

Le backend persiste le schéma carte `3` et
`layout_algorithm = layered-tree-cards-v1`. Le layout construit en parcours
linéaires des cartes `240 × 64`, profondeur en colonnes de 360 unités, et un
monde non comprimé. Un index v2 est refusé puis reconstruit sans toucher au
catalogue ni aux stores intra/inter. `MapSnapshot` et `MapBuildReport` exposent
l'algorithme effectivement lu du backend.

`MapView` conserve un SVG commun à C1/C2/C3. Les cartes root/directory/file et
diagnostic se distinguent sans couleur seule; chaque non-racine porte une
arête hiérarchique orthogonale namespacée. Les relations établies, suggestions
et relations inter-cerveaux sont ancrées bord à bord. Les flèches suivent
parent, premier enfant, frère précédent et frère suivant, avec mise en vue sans
relayout. Pan, zoom, fit et reset ne modifient aucun rectangle.

Preuves : 149 tests Rust et 188 tests TypeScript; check/build/Tauri debug
passés; N15 pass1/pass2 et régressions J12/K11/L12/M12 dans le vrai WebView2
`152.0.4191.53`. Les huit artefacts sont sous
`docs/performance/runs/TASK-0022-*`. Les frappes probatoires sont fiables,
aucun clic programmatique n'est utilisé. Les 19 preuves X5 sont inchangées.

Limites : Beta/deep n'a pas de store intra par contrat historique; cette
absence reste explicite. `F-042`, H9, R8, P-19 et P-21 restent hors de cette
tranche. B0 n'est pas corrigé; employer `CARGO_INCREMENTAL=0` pour les
validations Rust si l'ICE réapparaît.

**Prochaine action unique : contrôle indépendant de `TASK-0022`.** Vérifier les
artefacts et le commit substantif, puis décider seul de `VERIFIED`. Ne pas
créer `TASK-0023` dans ce contrôle.

- **Dernière mise à jour :** 2026-09-02
- **Branche active :** **`build/v0.2-a5-interbrain-relations`**, créée depuis
  le tip **contrôlé** `8d1e27151f53d082551e05b00816100cb790542b` de
  `build/v0.2-a4-composed-view`
- **Dernière tâche vérifiée :** **`TASK-0021`, `VERIFIED`** le 2026-09-02, sur
  **re-contrôle indépendant ciblé**
  [`ACTION-0034`](../reviews/ACTION-0034-independent-recontrol.md) —
  **`CLOSED`**, `HEAD` contrôlé
  **`10cf54e31276edeb00bd99a5586578791d7b5bc2`**, `main` intacte `91bbe90f`.
  **`X7` `CLOSED`**, **`ACTION-0033` `CLOSED`**. Verdict **rendu par
  l'orchestrateur**, **enregistré** par l'exécuteur. **Livrable DOCUMENTAIRE :
  `VERIFIED` atteste que la CIBLE est correctement écrite, jamais qu'elle est
  implémentée**
- **Dernière tâche de code vérifiée :** **`TASK-0020`, `VERIFIED`** le
  2026-09-02, sur **contrôle indépendant**
  [`ACTION-0032`](../reviews/ACTION-0032-independent-control.md) — **`CLOSED`**,
  `HEAD` contrôlé **`9a7206a1e246258259096b1679f19ac5b53005d7`**, `main`
  intacte `91bbe90f`. Verdict **rendu par l'orchestrateur**, **enregistré** par
  l'exécuteur. **Sixième** tâche `VERIFIED` de l'étape A
- **Tâche vérifiée précédente :** **`TASK-0019`, `VERIFIED`** le 2026-09-02, sur
  re-contrôle indépendant
  [`ACTION-0031`](../reviews/ACTION-0031-independent-recontrol.md) — **réserve
  `X6` et `ACTION-0030` : `CLOSED`**, `HEAD` contrôlé `8d1e271`. La cible
  autrefois manquée de `L12` étape 7 a été **corrigée et `L12` rejoué en
  entier** avant ce verdict. `TASK-0018` est `VERIFIED` depuis le 2026-09-01,
  `TASK-0017` depuis le 2026-09-01, `TASK-0016` depuis le 2026-08-31
- **Tâche livrée, NON vérifiée :** **aucune**
- **Son contrôle indépendant s'est déroulé en DEUX temps, et il est clos :**
  [`ACTION-0033`](../reviews/ACTION-0033-independent-control.md),
  **`CHANGES_REQUIRED`** sur `HEAD` `68211c8`, puis **`CLOSED`**. **Le FOND
  avait été accepté en entier**; **aucune** de ses cibles n'est considérée
  implémentée. La réserve **`X7`** était **documentaire** : `X2` désignait
  **déjà** la réserve technique de `TASK-0016` (`ACTION-0026`, `CLOSED`), et
  `TASK-0021` avait réutilisé le même nom pour la correction de `P-02` —
  **deux sens simultanés**, refusés. **La correction de `P-02` s'appelle
  désormais `P02-R1`**, sur **22** occurrences dans **12** fichiers; **le `X2`
  de `TASK-0016` n'a pas bougé** et reste **`CLOSED`**; **la substance de
  `P-02` n'a pas changé**. **`X7` a été fermée** par
  [`ACTION-0034`](../reviews/ACTION-0034-independent-recontrol.md) sur `HEAD`
  `10cf54e` — **les sept points du périmètre gelé sont TENUS**, la collision
  documentaire est **éliminée**. **Aucune réserve n'est ouverte : `X1` à `X7`
  sont toutes `CLOSED`**
- **Ce que `TASK-0021` a livré :** cinq fiches `DEC-0019` à `DEC-0023`; la
  **correction normative `P02-R1`** de `P-02`, dont l'ancienne formulation est
  **conservée et visible**; **huit fonctions** `F-042` à `F-049`, matrice
  **41 → 49**; une **séquence de sept tranches futures**, `PROPOSED` et **non
  exécutée**. **Aucun layout, aucun moteur, aucune IA, aucun serveur
  implémenté.**
- **Ce que `TASK-0020` a livré, désormais `VERIFIED`** — **relations
  inter-cerveaux explicites**, sous
  [`DEC-0018`](../decisions/DEC-0018-explicit-interbrain-relations.md),
  fonction **`F-041`**. Gel `M1`–`M12` en `7746fd4`, **avant la première ligne
  de code** de la tranche. **`M1`–`M12` tenus**, `M12` aux **vingt-huit
  étapes** dans le vrai `WebView2`, **deux passes**, fermeture et redémarrage
  réels, **aucun indicateur faux** dans l'arbre de preuve.
- **Ce que la mesure a trouvé, publié tel quel :** **deux défauts**, corrigés
  **à la source** et non contournés dans la mesure — des classes `CSS`
  partagées entre panneaux et couches d'arêtes, qui faisaient compter `J12` et
  `L12` de travers alors que rien n'était cassé; et un contrôle `DOM` capturé
  avant un `await`, remplacé par un re-rendu. Après correction, `J12` et `L12`
  retrouvent **exactement** leurs valeurs d'origine.
- **Son contrôle indépendant a eu lieu :** `ACTION-0032`, `CLOSED`,
  `TASK-0020` **`VERIFIED`**. **`cek1` n'est accepté que comme repli déclaré,
  PAS comme `I-E` complète.** `R8` reste entière, `P-19` et `P-21` demeurent,
  `B0` n'est pas corrigé
- **`X5` couvre désormais les cinq preuves de `TASK-0020`** — `M12`
  `pass{1,2}`, `J12` intra, `L12` composée `pass{1,2}` — **et les gardes ont
  été étendues** par `TASK-0021` : **14 → 19 noms** dans les **trois** gardes.
  Testé : `vitest` 14/14, `cargo test map::commands::tests` 14/14, et le
  module PowerShell refuse effectivement les cinq. **Conséquence assumée :**
  les boutons `M12`, `J12` et `L12` du runtime livré n'écrivent plus — la porte
  refuse. Une tranche qui aurait besoin de rejouer l'un de ces scénarios
  **republie sous son propre nom de tâche**
- **Tâche IN_PROGRESS :** aucune
- **Porte `P4` :** **FRANCHIE** —
  [`DEC-0016`](../decisions/DEC-0016-p4-gate-crossing-and-first-slice.md)

## Où en est le projet

`ACTION-0025` a **clos** `TASK-0015` — contrôle accepté, `VERIFIED`, réserve
normative `X1` corrigée dans le même geste — et **franchi la porte `P4`**.

`TASK-0016` a ensuite produit **la première ligne de code de production du
projet**, et la chaîne complète existe : fixture synthétique → scan en lecture
seule → index SQLite persistant → calepinage → carte HTML/SVG accessible **dans
un véritable hôte Tauri/WebView2** → navigation → sélection → détails.

**Les onze critères gelés sont tenus**, et pour la première fois du projet des
temps d'image ont été relevés **dans le moteur de production**.

`ACTION-0026` a **contrôlé** cette tranche et rendu **`CHANGES_REQUIRED`** :
la réserve bloquante **`X2`** a établi que le runtime enregistrait encore huit
commandes héritées de la 0.1, dont un **sélecteur de dossier réel**. La
correction est faite — le gestionnaire n'expose plus que les neuf commandes de
la tranche — et **deux tests-gardes** empêchent la régression.

**Le re-contrôle indépendant a eu lieu, directement sur GitHub.** `X2` est
**`CLOSED`**, `ACTION-0026` est **`CLOSED`**, et **`TASK-0016` est
`VERIFIED`**. `R8` reste entière, `B0` reste non corrigé, **aucune conclusion
nouvelle sur le budget adaptatif**, et les **états de parité restent
strictement limités au périmètre déjà déclaré**.

## Ce qu'il faut savoir en douze lignes

1. **CarteTopo est la RÉFÉRENCE FONCTIONNELLE.** L'ancienne version publique de
   FileTopo est un **prototype et un audit technique**. « L'ancienne version ne
   le faisait pas » **n'est pas un argument recevable**.
2. **L'apparence est entièrement libre** et peut être **entièrement
   modernisée**; **aucune amélioration visuelle ne supprime la parité**. En cas
   de conflit, **la parité gagne**.
3. **Le contrat exigible est
   [`CARTETOPO_FUNCTIONAL_PARITY.md`](../product/CARTETOPO_FUNCTIONAL_PARITY.md)** :
   22 exigences, 3 invariants. **Six sont satisfaites sur le seul périmètre de
   la première tranche, deux sont partielles, seize ne sont pas commencées.**
4. **Correction `X1` :** une **suggestion n'est pas une provenance de
   relation**. Une relation établie a pour provenance **`déterministe`** ou
   **`approuvée`**, sans troisième valeur; une suggestion est un **objet et un
   état distincts**, affichable mais **jamais** comptée comme relation.
5. **`TASK-0016` est `IMPLEMENTED`, jamais auto-déclarée `VERIFIED`.**
6. **Les critères ont été gelés AVANT le code** — commit `6edd5bd`, code en
   `130b670`. **Aucun n'a été retouché après le premier résultat.**
7. **`H9` n'imposait aucune cible d'images par seconde.** Il n'y a **ni cible
   atteinte, ni cible manquée** à annoncer.
8. **`4,20 ms` est une butée**, pas une mesure : synchronisation verticale à
   4,1667 ms sur un écran 240 Hz. **Jamais citable comme performance.** Seuls
   `wide` (**17,80 ms**) et `mixed` (**21,35 ms**) sont au-dessus de la butée —
   valeurs du **binaire corrigé**, légèrement moins bonnes que celles de
   `8cb752b` et publiées telles quelles.
9. **`R8` n'est pas levée** et ne peut l'être qu'à l'**étape C** : une machine,
   un **binaire de développement**, des fixtures **≤ 2 420 nœuds**.
10. **Aucun budget adaptatif** n'est employé, adopté, abandonné ni validé. La
    borne `B-1` de 5 000 nœuds est un **plafond déclaré**, qui ne s'ajuste à
    rien. Réserve `W2` : **aucune stabilité n'est prouvée**.
11. **`B0` s'est reproduit trois fois et n'est pas corrigé.** **Ne rien
    supprimer** dans `src-tauri/target/` — `DEC-0013` E. Employer
    `CARGO_INCREMENTAL=0`.
12. **Aucune donnée réelle, aucun sélecteur de dossier, aucun chemin local
    personnel dans le dépôt** — artefacts de mesure compris.

## TASK-0018 — la troisième tranche, livrée et non vérifiée

**FileTopo a des cerveaux.** Un cerveau est une **identité FileTopo**, pas une
source : `brain-alpha` et `brain-gamma` lisent la **même** fixture
`quasi-empty` et sont totalement indépendants.

1. **Le `brain_id` est le nom d'un répertoire, pas une colonne.**
   `<bac>/brains/catalog.sqlite`, `<bac>/brains/<brain_id>/map/index.sqlite`,
   `<bac>/brains/<brain_id>/relations/relations.sqlite`. Deux cerveaux ne
   peuvent pas se rencontrer parce qu'ils **ne sont pas dans le même fichier**.
   **Ne pas remplacer cela par une colonne `brain_id` dans un magasin
   partagé** : ce serait rendre l'isolation dépendante d'une clause `WHERE`.
2. **L'index nomme le cerveau pour lequel il a été construit** — schéma
   **version 2**, `map_meta.brain_id`. `open_store` **refuse** un index
   construit pour un autre cerveau (`MapError::BrainMismatch`), et un index de
   version 1 n'est celui de personne. **Ne pas assouplir cette garde.**
3. **Un `node_id` ne voyage jamais seul.** `map_node_detail` et
   `map_relations_for_node` prennent un **`BrainNodeRef`**. **Ne jamais
   revenir à un `nodeId` nu** : après une bascule, l'interface tient encore la
   sélection du cerveau précédent, et `12` est valide dans les deux.
4. **Le seed du catalogue crée, il ne corrige jamais.** Un cerveau renommé
   reste renommé au démarrage suivant — `K7`. **Ne pas transformer le
   `INSERT … ON CONFLICT DO NOTHING` en upsert.**
5. **L'état de vue par cerveau est SESSION SEULEMENT.** Seuls le **cerveau
   actif** et les **métadonnées** survivent au redémarrage. **Ne pas prétendre
   que `P-19` est faite.**
6. **`K10` s'exerce par une vraie frappe Windows**, comme `J12` : le mécanisme
   est partagé dans `realInput.ts`. **Ne jamais remplacer la frappe par un
   `.click()`** — la preuve est `isTrusted` et les compteurs à zéro.
7. **Le menu du sélecteur ne se referme pas sur un `blur` à `relatedTarget`
   nul.** Ce n'est pas un détail : une **désactivation de fenêtre** produit ce
   `blur`, et refermer dessus faisait arriver la frappe réelle sur un bouton
   démonté. **Ne pas « simplifier » ce gestionnaire.**
8. **La vue n'est ajustée qu'une fois par cerveau** — `shouldFitOnOpen`. Un
   second ajustement, quand le viewport se stabilise, **effaçait** la vue
   qu'un cerveau venait de retrouver. **Ne pas remettre un `fitView`
   inconditionnel dans cet effet.**
9. **UNE EXÉCUTION D'UNE TÂCHE ULTÉRIEURE N'ÉCRASE JAMAIS LA PREUVE
   CANONIQUE D'UNE TÂCHE `VERIFIED`** — réserve `X5`. La règle est tenue **à la
   porte** : `write_run_artifact` refuse les noms de
   `PROTECTED_RUN_ARTIFACTS`, et tous les noms d'artefacts du runtime vivent
   dans `src/map/runArtifacts.ts`. **Ne jamais écrire un nom d'artefact en
   dur**, et ne jamais retirer un nom de la liste protégée pour « débloquer »
   un scénario : renommer le scénario, pas la preuve. `J12` migré écrit
   désormais `TASK-0018-J12-relations-regression-webview2.json`, **et il a été
   rejoué** dans l'hôte réel.
10. **Les campagnes de vérification et de mesure marchent par cerveau** et ne
    couvrent donc plus `wide` ni `mixed`. **Les artefacts publiés de
    `TASK-0016` sont inchangés** et restent le relevé pour ces deux fixtures.
11. **Ne pas afficher deux cerveaux dans le même graphique** (`TASK-0019`) et
    **ne créer aucune relation inter-cerveaux** (`TASK-0020`).
12. **`B0` s'est reproduit une quatrième fois.** Rien n'a été supprimé dans
    `src-tauri/target/`; `CARGO_INCREMENTAL=0` suffit.

### Comment rejouer `K12`

`K12` demande **deux processus et deux passes**, avec une fermeture et un
redémarrage **réels** :

    CARGO_INCREMENTAL=0 pnpm tauri build --debug --no-bundle
    rm -rf .filetopo-sandbox/brains          # repartir du catalogue neuf
    pwsh scripts/k12-run-real-host.ps1

**Le binaire doit être `debug`.** `map_write_run_artifact` n'existe qu'en
`debug` : un binaire `release` ne peut écrire aucune preuve, pas même son
abandon. La première tentative a été perdue exactement ainsi.

Le lanceur démarre `scripts/j12-send-real-key.ps1` pour la passe 1 — **le même
guetteur que `J12`**, sur la même convention de marqueur. Sans lui, `K10`
échoue, et c'est voulu.

## TASK-0017 — la deuxième tranche, VERIFIED

**Un modèle de provenance existe.** C'est la première fois du projet.

1. **La provenance est la table, pas une colonne.** `relations_deterministic`
   et `relations_approved` sont **deux tables séparées** — `DEC-0009` `R-C`.
   Il n'existe **aucune** colonne `provenance` qu'un `NULL` pourrait vider, et
   **aucune** colonne de règle dans la table des approuvées. Une relation
   établie sans provenance est **non représentable**, pas seulement interdite.
2. **Une suggestion n'est pas une relation** — correction `X1`. Table
   distincte, état propre, **jamais** dans un compte, et **seule** une
   approbation explicite la transforme.
3. **Aucun inverse n'est jamais déduit.** Aucune des deux règles n'est
   symétrique.
4. **Les relations vivent hors de l'index reconstructible :**
   `<bac à sable>/relations/<fixture>/relations.sqlite`. Une reconstruction
   complète de `maps/` n'y touche pas — vérifié sur les quatre fixtures.
5. **La clé d'endpoint `ek1|<fixture>|<chemin relatif>` n'est PAS `I-E`.**
   C'est le repli déterministe, déclaré comme tel. `VolumeSerialNumber` +
   `FileId`, déplacements et renommages réels restent entiers.
6. **Les relations ne sont ouvertes que pour `quasi-empty`**, la fixture gelée.
   Toute autre fixture est refusée **en toutes lettres** — la règle
   `homonymes` est quadratique et produirait des centaines de milliers de
   paires sur `wide`. **C'est une portée, pas une troncature.**
7. **`P-04` reste PARTIELLE** : la **révocation** d'une relation approuvée
   n'est pas implémentée, alors que la parité §5.2 l'exige. Déclarée manquante.
8. **Aucune mesure de performance n'a été prise et aucun seuil n'a été
   inventé** : `TASK-0017` n'en demandait aucun.
9. **La création d'une relation `APPROVED` est verrouillée par le stockage**
   — réserve `X3`. `approve()` est la **seule** voie applicative; le schéma de
   **version 2** ajoute `suggestion_key` **`UNIQUE`**, une **clé étrangère** et
   **trois déclencheurs** qui exigent que la ligne approuvée **soit exactement
   sa suggestion**. **Ne pas rouvrir cette porte** en ajoutant un chemin
   d'écriture.
10. **`J12` s'exerce par une vraie frappe clavier Windows** — réserve `X4`.
    Le scénario n'active rien : il attend `scripts/j12-send-real-key.ps1`.
    **Ne jamais remplacer la frappe par un `.click()`** : la preuve est
    `isTrusted` et les compteurs à zéro.
11. **Ne pas s'attribuer `VERIFIED`.** La tâche est `IMPLEMENTED`.

## Comment faire tourner la tranche

    pnpm install
    CARGO_INCREMENTAL=0 pnpm tauri dev

Les quatre fixtures sont **engendrées** au premier clic, dans
`.filetopo-sandbox/` — ignoré par Git, reproductible depuis les graines fixes
`20260831001` à `20260831004`.

Deux modes non surveillés, **développement seulement** :

    CARGO_INCREMENTAL=0 FILETOPO_AUTO_VERIFY=1 pnpm tauri dev     # lecture seule et isolation, par cerveau
    CARGO_INCREMENTAL=0 FILETOPO_AUTO_MEASURE=1 pnpm tauri dev    # campagne d'images, par cerveau
    CARGO_INCREMENTAL=0 FILETOPO_AUTO_RELATIONS=1 pnpm tauri dev  # rejoue J12 en regression
    FILETOPO_AUTO_BRAINS=1|2                                      # les deux passes de K12

Depuis `TASK-0018`, **les deux premières marchent par cerveau** : le runtime
n'expose plus aucune commande indexée par fixture. Elles couvrent donc
`quasi-empty` (deux fois) et `deep`, **et non** `wide` ni `mixed`.

Chacun écrit son artefact sous `docs/performance/runs/`.

**`J12` demande deux processus.** Le scénario n'active rien lui-même : il pose
le focus et attend une **vraie frappe Windows**. Rediriger la sortie vers un
fichier, puis, dans un autre terminal :

    pwsh scripts/j12-send-real-key.ps1 -LogPath run.log

Sans ce second processus, `J12` **échoue** — et c'est voulu : il ne se rabat
jamais sur un clic synthétique.

**Avant de rejouer `J12` :** remettre le magasin de relations **du cerveau**
à neuf — `rm -rf .filetopo-sandbox/brains/brain-alpha/relations` — pour que
`S-005` soit bien en attente, et **n'ouvrir qu'une seule instance de
l'application**. Deux instances partageant le même magasin produisent des
artefacts contradictoires; c'est arrivé, c'est déclaré, et les artefacts
concernés ont été détruits.

**Si une course reste muette :** la fenêtre doit rester visible. Chromium
suspend `requestAnimationFrame` pour une fenêtre occultée; la course échoue
alors explicitement au bout de 8 s au lieu d'attendre indéfiniment.

## Gouvernance en vigueur

Les **GO techniques** viennent de l'**orchestrateur technique**, sous
délégation de Sébastien. **Restent réservés à Sébastien**, sans délégation :
dépense, **donnée réelle ou personnelle**, publication externe exceptionnelle
(fusion vers `main`, PR, release, étiquette, nouveau distant), opération
destructive ou hors dépôt, **changement important de portée produit**.

## État Git

| Référence | SHA |
|---|---|
| `main` locale et distante | `91bbe90f0f99026c28cd345784d4f579a0016db2` — **non touchée** |
| `rebuild/v0.2-project-brain` | `db8d3de0b20e7efbfe463a17c218cc14face39a8` — **non touchée** |
| `spike/v0.2-technical-risk-gates` | `746f1b5f93c9d7085516c0e56473a95dc2c2d178` — **non touchée** |
| `spike/v0.2-render-budget` | `933bd0d5e7e05e4e7fe233c5fc6b9320a194264d` — **non touchée** |
| `spike/v0.2-budget-controller` | porte la clôture d'`ACTION-0025` |
| `build/v0.2-p4-vertical-slice` | branche de `TASK-0016`, voir `git rev-parse HEAD` |

Aucune fusion, aucune PR, aucune release, aucune étiquette, aucun `force push`,
aucune réécriture d'historique, aucune suppression de branche.

## Points ouverts

| # | Point | Ce qui est demandé |
|---|---|---|
| 1 | **Aucune tranche suivante n'a de fiche** | La spécifier et **geler ses critères avant tout code**. `P4` n'autorisait que `TASK-0016` |
| 1 bis | **La surface runtime doit rester celle de la tranche** | Les deux tests-gardes échouent si une commande hors tranche est réenregistrée. **Ne pas les contourner** |
| 2 | **Seize exigences de parité non commencées** | Chaque tranche suivante exige sa **propre fiche**, ses **critères gelés** et son **GO**. Les relations transversales portent la correction `X1` |
| 3 | **`P-12` et `P-06` sont partielles** | Masquage du panneau, survie au redémarrage, relations transversales et atténuation liée à `F-017` restent à faire |
| 4 | **`P-08` exige 100 000 nœuds** | La borne de 5 000 est une **limite de `TASK-0016`**, pas une limite produit |
| 5 | **Manque `M-1`** — persistance des préférences | À résoudre **avant** la tranche qui implémente réellement `P-19` — `DEC-0016` D |
| 6 | **`R8`** | En vigueur. **Levée seulement à l'étape C** |
| 7 | **Réserves `V1`–`V4`, `W1`–`W4`, `R2`–`R9`** | Toutes en vigueur; `R1` levée depuis `ACTION-0023` |
| 8 | **`B0`, `B3` inter-volume, `B4` question 3** | Inchangés. Le cache fautif est **conservé**; la question 3 se ferme **avant** l'identité persistante et l'état vu/non vu |
| 9 | **`P-21`** | Interface **en français seulement**; bilinguisme intégral et audit WCAG restent à faire |
| 10 | **Aucune réserve `X` ouverte** | `X1` à `X7` sont **toutes `CLOSED`**. `X7` a été fermée par [`ACTION-0034`](../reviews/ACTION-0034-independent-recontrol.md) le 2026-09-02 |

## Sessions : trois procédures partagées

`/debut-session`, `/reprise-session`, `/fermeture-session` côté Claude;
`$debut-session`, `$reprise-session`, `$fermeture-session` côté Codex. La
logique vit dans **`.orchestrator/protocols/`**, en un seul exemplaire; les
`SKILL.md` ne sont que des renvois.

**`.orchestrator/RESULT.md`** est le rapport compact de la **dernière
exécution seulement**, commité et poussé — c'est lui que l'orchestrateur lit
avant de contrôler GitHub, ce qui permet au rapport terminal de rester court.

## Prochaine action unique

**Le réalignement produit est FIGÉ et `VERIFIED`.** `TASK-0021` est
`VERIFIED`, `X7` et `ACTION-0033` sont `CLOSED`, **aucune réserve n'est
ouverte**, aucune tâche n'est `IN_PROGRESS` ni `IMPLEMENTED` en attente.

**Première tranche d'implémentation de la cible post-réalignement :
`TASK-0022` — layout topographique hiérarchique à nœuds/cartes et connexions
explicites**, sous
[`DEC-0020`](../decisions/DEC-0020-topographic-node-graph.md) et **`P02-R1`**.
Elle devra **remplacer la représentation principale imbriquée par une vraie
topographie à nœuds reliés**, **sans supprimer les capacités `VERIFIED`
existantes**. Détail dans [NEXT_ACTION.md](NEXT_ACTION.md).

**`TASK-0022` n'est ni créée ni exécutée à ce stade.** Le **prochain prompt de
l'orchestrateur** définira son architecture, ses fixtures, ses critères gelés,
sa compatibilité multi-cerveaux, ses relations intra et inter-cerveaux, son
`pan`/`zoom`, son clavier, ses labels et ses tests réels `WebView2`.

## Commandes sûres

    git rev-parse --show-toplevel
    git branch --show-current
    git rev-parse HEAD
    git status --short
    git log --oneline 73f0327..HEAD
    git show 6edd5bd --stat    # TASK-0016 : le gel, AVANT tout code
    git show 130b670 --stat    # TASK-0016 : le premier code de production
    git show 51a8cac --stat    # TASK-0017 : le gel, AVANT tout code
    git show a98676e --stat    # TASK-0017 : le premier code de production
    git show 8a259e9 --stat    # TASK-0017 : les corrections X3 et X4
    git show 51bb687 --stat    # TASK-0018 : le gel, AVANT tout code
    git show 4cb1cf4 --stat    # TASK-0018 : le premier code de production
    git show 2424ef2 --stat    # TASK-0018 : les preuves K11 et K12

    CARGO_INCREMENTAL=0 cargo test --manifest-path src-tauri/Cargo.toml --lib
    pnpm check && pnpm test

## Message court pour Claude Code

Lance `/debut-session`. Elle lit ce qu'il faut, dans l'ordre, et rien de plus.

`TASK-0012` à `TASK-0018` sont **closes et `VERIFIED`** — `TASK-0018` par
`ACTION-0029`, qui a clos `X5`. **`TASK-0019` est `IMPLEMENTED`** : gel
`L1`–`L12` commité avant tout code, douze critères tenus, preuves publiées. Son
contrôle indépendant, `ACTION-0030`, a rendu **`CHANGES_REQUIRED`** sur une
seule réserve, **`X6`** — `L12` étape 7 exigeait d'**approuver** `S-005` dans
Alpha, et l'**acte** n'avait pas eu lieu. Elle est **corrigée, `L12` rejoué en
entier, et `X6` reste `OPEN`** : `TASK-0019` **attend son re-contrôle**, sur
`X6` **uniquement**.

**FileTopo est multi-cerveaux** — `DEC-0017`. **Un `brain_id` n'est pas un
`fixture_id`** : deux cerveaux peuvent partager une source et **doivent** rester
indépendants. **Un `node_id` seul n'est jamais une identité globale.**
**Deux cerveaux s'affichent maintenant dans le même graphique** — un canevas
`SVG`, un territoire chacun, `TASK-0019`. **Composer est un affichage :**
ajouter ou retirer ne touche ni catalogue, ni index, ni relation, ni source.
**Un `id` DOM est namespacé par `brain_id`** — `brain-alpha-map-node-4` — parce
que deux cerveaux sur une même source portent le même `node_id`. **Ne crée
aucune relation inter-cerveaux** — c'est `TASK-0020`. **Ne persiste aucune
composition** — c'est `P-19`; au redémarrage, le cerveau actif seul.

**Une preuve devenue canonique ne se supprime pas non plus depuis un script.**
La porte d'écriture de l'application ne dit rien d'un outil qui la contourne :
`scripts/*-run-real-host.ps1` portent une liste protégée et refusent d'y toucher.

**Le bac à sable `<dépôt>/.filetopo-sandbox` est persistant**, et rien
n'annule une approbation. Un scénario qui approuve `S-005` sans vérifier
qu'elle est en attente échoue à sa deuxième exécution — **et l'effacer serait
une suppression, réservée à Sébastien.** Quand un scénario de preuve a besoin
d'un état **neuf**, il ne supprime rien : il demande un **namespace** avec la
variable de développement `FILETOPO_SANDBOX_VARIANT`, et travaille sous
`<dépôt>/.filetopo-sandbox/variants/<variant>`. **Variable absente :
comportement exactement inchangé.** La valeur est un **nom**, jamais un chemin
— basename ASCII `[A-Za-z0-9_-]`, 1 à 64 caractères; tout le reste est une
**erreur explicite**. **N'ajoute ni sélecteur de dossier, ni racine choisie par
l'utilisateur, ni commande de remise à zéro au runtime.**

**Une tranche suivante exige sa propre fiche, ses critères gelés d'avance et
son propre GO.** Ne t'attribue pas `VERIFIED`.

**Une suggestion n'est jamais une relation** — correction `X1`. **La provenance
d'une relation établie n'a que deux valeurs**, et c'est la table qui la porte.
**`approve()` est la seule voie vers une relation approuvée**, et le stockage
l'impose — réserve `X3`. **N'implémente aucune heuristique réelle de
suggestion.** **Ne prétends pas que `ek1` implémente `I-E`.**

**N'ouvre pas Canvas 2D ni WebGL.** **Ne reprends aucun contrôleur de budget de
spike.** **Ne corrige pas `B0` et ne supprime rien** dans `src-tauri/target/`.
**Ne cite jamais 4,20 ms comme une performance** — c'est une butée de
synchronisation verticale. **Ne lève pas `R8`.** Ne fusionne rien, ne crée ni
PR, ni release, ni étiquette.

---

## Depuis `TASK-0020` — les relations inter-cerveaux

**Une relation entre deux cerveaux n'appartient à aucun des deux.** Elle vit
dans `brains/interbrain/relations.sqlite`, **à côté** des cerveaux et dans aucun
d'eux, **hors** de tout `map/` qu'un rebuild remplace, **distinct** du
catalogue. **Ne la range jamais dans le magasin privé d'un cerveau** : une
reconstruction de ce cerveau détruirait un lien dont l'autre est la moitié.

**`source_brain_id` doit différer de `target_brain_id`**, et c'est un `CHECK`,
pas une convention. **Il n'y a pas de colonne `provenance`** : la table où vit
une ligne *est* sa provenance, comme dans `TASK-0017`. **`approve()` est la
seule voie** vers une relation `APPROVED`, et les déclencheurs l'imposent sur
les **six** champs. **N'invente jamais l'inverse d'une relation.**

**`cek1` n'est pas `I-E`.** C'est le repli déterministe : un déplacement ou un
renommage réel casserait une extrémité, et rien ne prétend le contraire.

**Le magasin ignore la composition.** Une relation vers un cerveau non affiché
— ou dont l'index n'a jamais été construit — revient quand même, et
l'interface le **dit** : « hors de la vue ». **Suivre une relation est une
navigation** : elle ajoute le cerveau à la vue et **ne crée, ne modifie ni
n'approuve rien**.

**Deux panneaux, deux espaces de noms `CSS` disjoints; deux couches d'arêtes,
deux classes disjointes.** Ce n'est pas cosmétique : les scénarios `J12` et
`L12` comptent `.relations__direction .relation__link` et `.map-edge` sur tout
le document, et une classe partagée leur fait compter les mauvais éléments —
la même faute qu'un `id` `DOM` pour deux cerveaux. **N'ajoute jamais une classe
`relation__*`, `relations__*`, `suggestion*` ou `map-edge` à un élément
inter-cerveaux.**

**Ne capture pas un contrôle `DOM` avant un `await` pour le presser après** :
un re-rendu peut l'avoir remplacé, et la frappe part dans le vide. Re-interroge
au moment de presser.

**N'implémente aucune détection automatique entre cerveaux**, aucune
heuristique, aucun glisser-déposer, aucun éditeur manuel de relations. **Ne
fusionne jamais deux cerveaux.**

## X8 — une preuve se dérive, elle ne se recopie pas

`M12.28` affirmait « j'écris sous ma propre tâche » en comparant le nom qu'il
venait d'écrire à un préfixe `TASK-0020-` **écrit à la main**, et annonçait le
nombre de preuves protégées par un **littéral**. Les deux étaient vrais quand
ils ont été écrits. La migration des noms sous `TASK-0022` a rendu le premier
faux, et deux extensions de `X5` ont rendu le second périmé — sans que rien
n'échoue, parce qu'une affirmation recopiée ne peut pas se contredire.

**Ne réécris jamais un constat que le produit peut calculer.** L'identité de
tâche se lit dans le nom d'artefact — `artifactTaskId()` — et la tâche
propriétaire se **découvre** en analysant toutes les destinations —
`runtimeWriteOwnership()`. Le nombre de noms protégés est la **longueur** de
`PROTECTED_RUN_ARTIFACTS`, jamais un chiffre. La source canonique reste la
garde Rust `PROTECTED_RUN_ARTIFACTS: [&str; 19]` de
`src-tauri/src/map/commands.rs` — celle qui refuse réellement l'écriture; un
test lit ce source et échoue si le miroir TypeScript diverge.

**Corollaire pour la tranche suivante :** ne « répare » pas ce genre de défaut
en remplaçant `TASK-0022` par `TASK-0023`. Le remplacement littéral reconduit
la panne d'un cran. Un test de garde interdit désormais, dans toute source
d'écriture, `startsWith("TASK-00xx-")` et tout compte de noms protégés écrit en
chiffres ou en lettres.
