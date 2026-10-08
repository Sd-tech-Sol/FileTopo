# TASK-0054 — Rapport de fermeture : échelle progressive et agrégats exacts

- **Statut :** `IMPLEMENTED` — candidate au contrôle indépendant. Jamais auto-`VERIFIED`.
- **Portée :** `F-050`, `F-051`; préparation de `P-01`, `P-02`, `P-03`.
- **Classification des chiffres :** `DEVELOPMENT_BENCH_ENGINEERING_EVIDENCE`. Ce ne sont
  **pas** des promesses commerciales ni un SLA.
- **Code produit testé :** `fd3f6067c47a50bccff4713bda04f7f89bc8af85`. Les commits suivants ne
  touchent que `scripts/` (harness) et `docs/`; l'artefact Rust refuse de s'écrire si un fichier
  de `src/` ou `src-tauri/src/` a changé depuis le HEAD testé.
- **HEAD testé des artefacts :** `42a06a1add90b9b7286fd8b9b7170c76d4ceac23`
  (`docs/performance/runs/TASK-0054-scale-rust.json`, `TASK-0054-webview2.json`).
- **Banc :** i9-9900K, 16 processeurs logiques, 31,9 Gio — **plus puissant que la cible
  « portable modeste »**. Aucune mesure sur matériel modeste.

## 1. Audit reuse-first (avant tout code)

| Besoin | Statut | Où |
|---|---|---|
| Index canonique unique, cardinalité exacte | **EXISTE / RÉUTILISER** | `BrainIndex`, `Index::count` |
| Vue bornée (`VIEW_BUDGET=512`, `MATERIAL_BUDGET=256`, cible 64) | **EXISTE** | `map/projection.rs` |
| Agrégat exact `ViewAggregate` + curseur | **EXISTE** | `projection.rs`, `hierarchy.rs` |
| Pagination exacte par curseur lié index/révision | **EXISTE** | `hierarchy::children_page` |
| Recherche bornée + total exact | **EXISTE** | `commands::search_nodes`, `Index::query_nodes` |
| Résolution de destination hors vue | **EXISTE** | `BrainIndex::resolve_path` + `materialize_view(focus)` |
| REAL_ROOT → Index → vue | **EXISTE** | `register_real_root`, `refresh_map`, `view` (TASK-0032) |
| Layout une fois par projection | **EXISTE** | `layout::compute` (3 appels, 3 projections) |
| Agrégat ≠ repli F-042 | **EXISTE** | `branch_projection.rs` |
| Harness WebView2/CDP/axe | **EXISTE / ADAPTER** | `scripts/task0052-webview2.mjs`, `task0030-webview2.mjs` |
| Corpus 10k/100k/1M **indexés** (sans fichiers physiques) | **MANQUANT → DÉVELOPPÉ** | `map/scale_closure_tests.rs` |
| Preuve d'atteignabilité structurelle (couverture de tout id) | **MANQUANT → DÉVELOPPÉ** | idem, `guard_coverage` |
| Gardes d'agrégat exact contre un oracle indépendant | **MANQUANT → DÉVELOPPÉ** | idem, `guard_exact` |
| Preuve que `--disable-gpu` est **réellement appliqué** | **MANQUANT → DÉVELOPPÉ** | `scripts/task0054-webview2.mjs` (`SystemInfo.getInfo`) |
| Gardes frontend de l'indicateur d'agrégat | **MANQUANT → DÉVELOPPÉ** | `src/map/scaleAggregate.test.tsx` |

Aucune dépendance, aucun renderer, aucun store, aucune copie du corpus n'a été ajouté.

## 2. Preuves Rust (`cargo test --lib scale_closure_tests -- --include-ignored --test-threads=1`)

Résultat : `30 passed; 0 failed; 0 ignored` (1 826 s). Artefact : `TASK-0054-scale-rust.json`.
Les sept tests à 1 M de lignes sont `#[ignore]` dans la suite ordinaire (minutes et plusieurs Gio);
la suite complète `cargo test --lib` reste à `862 passed; 13 ignored`.

### F50-1 — Échelle structurelle (vue initiale)

| Forme | Indexés | Nœuds | Agrégats | Arêtes | Créneaux layout | Charge JSON | Hauteur layout |
|---|---:|---:|---:|---:|---:|---:|---:|
| large | 10 000 | 64 | 1 | 63 | 65 | 16 211 o | 5 860 |
| large | 100 000 | 64 | 1 | 63 | 65 | 16 215 o | 5 860 |
| large | 1 000 000 | 64 | 1 | 63 | 65 | 16 219 o | 5 860 |
| mixte | 10 000 | 64 | 64 | 63 | 128 | 25 636 o | 5 860 |
| mixte | 100 000 | 64 | 64 | 63 | 128 | 25 639 o | 5 860 |
| mixte | 1 000 000 | 64 | 64 | 63 | 128 | 25 768 o | 5 860 |
| profond+large | 1 000 000 | 2 | 1 | 1 | 3 | 994 o | 64 |

Le corpus est multiplié par 100; la charge IPC, les nœuds, les arêtes et la géométrie ne bougent pas
(+0,07 % pour le mixte). `view_size_does_not_grow_with_the_corpus` en fait une assertion (10 k → 200 k).
Temps de la vue : 0 à 2 ms à toutes les tailles (écriture de l'Index : 0,1 s à 10 k, 32–34 s à 1 M;
512 s pour 1 M de lignes dont les chemins ont 200 niveaux — extrême synthétique).

Vérifié par vue : cardinalité Index = corpus; `nœuds + agrégats ≤ 512`; `matérialisés + non matérialisés =
total`; arêtes ≤ nœuds − 1; aucune arête vers un non-nœud; chemins et parents identiques à l'**oracle**
(les liens parents du corpus, jamais le `child_count` du produit); hauteur de layout ≤ ce qu'une vue
bornée peut produire; aucun nom de la fin du corpus dans la charge; curseurs liés à l'index et à la révision.

### F50-2 — Atteignabilité

Pour chaque forme (large, mixte, profond+large) à 10 k, 100 k et 1 M :

- **Pagination exacte** : un parcours complet par `children_page` à la taille de page produit (50) visite
  **chaque id `2..=n` exactement une fois** (`guard_coverage`), 20 000 pages à 1 M, page max = 50. La somme des
  totaux exacts par parent vaut `n − 1` : la couverture se démontre sans sérialiser le corpus au frontend.
- **Recherche exacte** : des cibles réparties sur tout le corpus (les deux extrémités comprises), 13 à 61
  selon la taille. Un nom de fichier est unique : `total == 1`. Pour un dossier, `total = 1 + descendants`
  de l'oracle, paginé sans doublon (`exact_search_counts_a_folder_and_all_its_descendants`).
- **Navigation vers hors-vue** : chaque cible est résolue (`resolve_path`) puis focalisée
  (`materialize_view(focus)`) : elle est affichée, la vue reste bornée et exacte.
- **Nombre d'actions** : saisie du nom → **1 clic** sur le résultat (qui focalise la vue) = **2 actions**; sans recherche,
  au plus `⌈total/50⌉` requêtes de page par dossier (details panel / `map_node_children`). Aucune borne plus
  forte n'est revendiquée.

### F51-1 — Agrégats exacts

Plus gros dossier de chaque corpus, large/mixte/profond, 10 k, 100 k et 1 M (large et mixte) :
`omis + visibles == enfants réels` (oracle) à chaque page; l'expansion par curseur atteint **tous** les enfants,
une fois chacun (999 999 enfants en 15 873 pages à 1 M); aucune arête inventée; raison fixe lisible
(`view_budget_or_focus`); le JSON d'un agrégat ne porte que `parentId`, `omittedDirectChildren`, `reason`,
`nextCursor`, `rect` — ni chemin, ni `kind`, ni nom. `an_aggregate_is_not_a_collapse` : un repli F-042 ne produit
aucun agrégat et son compte caché est exact. Garde frontend : `+N élément(s) — Voir la suite` exact pour
1, 2, 63, 999 999 et 1 000 000, sans arrondi ni abréviation.

### Correction produit minimale (trouvée par la preuve)

`aggregates_are_exact_on_wide_mixed_and_deep_corpora` a montré que, pour un focus à 200 niveaux, la page
d'expansion tombait à **un seul enfant** par appel (cible = longueur de l'ascendance) : exact, mais 9 799 appels
pour 9 800 enfants. `projection.rs` garantit désormais un plancher de `MIN_FOCUS_PAGE = 16` enfants par page;
`MATERIAL_BUDGET` reste l'unique arrêt dur, l'ascendance n'est toujours jamais tronquée. Le test échoue sur
l'ancien comportement (613 pages au lieu de 9 799 pour 9 799 enfants). Aucun autre code produit n'a changé.

### Intégration au vrai flux V1 (REAL_ROOT)

`real_root_goes_through_the_canonical_index_and_the_bounded_view` : racine temporaire synthétique (747 entrées,
dont un dossier de 700 enfants) → `register_real_root` → `refresh_map` → `view` **égal** à
`materialize_view(open_store)`; cardinalité = marche indépendante du test; agrégat exact (700); pagination des
700 enfants; recherche + navigation vers une ligne absente de la première vue; `node_children` total 700 / page 50;
aucun chemin absolu dans les DTO; **inventaire source (taille + contenu) identique avant/après**.
`reopening_a_real_root_does_not_create_a_second_canonical_copy` : mêmes `index_id` et révision à la réouverture,
`source_read=false`, exactement une base d'Index par cerveau, aucune sous la racine analysée.

## 3. Falsifications (TASK-0054 §11) — chacune est une garde qui peut échouer

| # | Garde | Test | Comment elle échoue |
|---|---|---|---|
| 1 | whole-graph DTO | `falsification_1_…` | une vue portant les 10 000 nœuds → `guard_bounded` Err; `snapshot()` produit reste borné |
| 2 | dépassement VIEW_BUDGET | `falsification_2_…` | vue gonflée > 512 créneaux → Err |
| 3 | layout sur le corpus | `falsification_3_…` | `layout::compute` réel sur 10 000 nœuds → hauteur > borne → Err; garde source : exactement 1 appel dans chacune des 3 projections, 0 ailleurs, le détecteur rejette une injection |
| 4 | compte +1 / −1 | `falsification_4_…` | `guard_exact` Err dans les deux sens; côté frontend le libellé change |
| 5 | agrégat dossier/path/openable | `falsification_5_…`, `scaleAggregate.test.tsx` | six champs interdits injectés → Err; DTO trafiqué ne rend ni chemin ni carte |
| 6 | pagination omet/duplique | `falsification_6_…` | un id retiré / un id dupliqué → `guard_coverage` Err |
| 7 | destination inatteignable | `falsification_7_…` | id 7 777 retiré du parcours → Err nommant l'id; la route réelle (recherche → focus) l'atteint |
| 8 | curseur périmé | `falsification_8_…` | `stale` après réécriture de l'Index; mauvais parent et index étranger refusés |
| 9 | REAL_ROOT contourne le materializer | `real_root_goes_through_…` | `view == materialize_view(open_store)`; une seconde copie ferait diverger `index_id`/révision |
| 10 | GPU-disabled non appliqué | `scripts/task0054-webview2.mjs` | le **même** verdict `gpuDisabledApplied` est évalué sur le run normal et doit être FAUX (assertion) |
| 11 | source modifiée | `real_root_goes_through_…` | octet changé dans la source → l'inventaire diffère (détecté) ; WebView2 : hash de l'arbre avant/après |

## 4. Preuves frontend

`src/map/scaleAggregate.test.tsx` : 11 tests (libellé exact FR/EN pour 1…1 000 000 sans arrondi, singulier/pluriel,
`role=treeitem`, ni `data-node-id` ni `data-card` ni chemin/lien, DTO trafiqué sans effet, expansion avec le
parent et le curseur exacts sur clic/Entrée/Espace seulement). Suite complète : **48 fichiers, 719 tests PASS**
(708 + 11). `pnpm check` et `pnpm build` PASS.

## 5. Preuves WebView2 réelles (application Tauri, `src-tauri/target/debug/filetopo.exe`)

Même scénario, deux processus, racine REAL_ROOT synthétique jetable (747 entrées, dossier de 700 enfants),
`headTested = 42a06a1…`. Chaque compte est recalculé par le harness depuis le disque.

Scénario (aux deux modes) : Index = disque (747); première vue bornée (5 nœuds, 3 agrégats, 1 980 o), nœuds
dessinés = matérialisés; recherche `f-0699` (total exact 1) → clic → la ligne hors vue est dessinée; recherche
`large` → focus → **12 pages d'agrégat par vrais appuis sur Entrée**, libellé exact (`affichés + omis == 700` à
chaque page), union des pages = les 700 enfants du disque, aucun doublon; sélection clavier, zoom `+`/`-`,
déplacement Alt+→, ajustement `f`/`r`, sélection à la souris; axe-core 4.13.0 (WCAG 2 A/AA, 2.1, 2.2 AA) : **0
violation** dans quatre états; zéro erreur console fatale; aucune commande d'écriture/rafraîchissement/ouverture
externe pendant les gestes; révision d'Index inchangée; **hash du dossier analysé identique**.

| | WebView2 normal | WebView2 GPU-désactivé |
|---|---|---|
| `--disable-gpu` dans la ligne de commande du navigateur | **non** | **oui** |
| `gpu_compositing` | `enabled` | `disabled_software` |
| `webgl` (statut) / classe de contexte WebGL | `enabled` / matériel | `unavailable_software` / logiciel |
| périphériques GPU vus | 2 | 1 |
| verdict `gpuDisabledApplied` | **faux** (falsification 10) | **vrai** |
| digest de sémantique | `6b1817c7…` | `6b1817c7…` (identique) |
| axe | 0/0/0/0 | 0/0/0/0 |

La variable d'environnement n'est pas la preuve : c'est la ligne de commande et le statut GPU **rapportés par le
navigateur** (`SystemInfo.getInfo` sur le CDP) et la classe du contexte WebGL de la page. Le run GPU-désactivé
échoue si l'un d'eux contredit la demande. **Aucun SLA de fluidité ou de latence n'est revendiqué.**

## 6. Limites et `NOT_TESTED` (déclarées, pas masquées)

- **Aucune mesure sur portable modeste.** Le banc est un i9-9900K / 31,9 Gio avec GPU matériel.
- **Latence de recherche proportionnelle au corpus** : la recherche est un balayage `LIKE` sur le nom *et* le chemin
  (pas d'index plein texte). La sortie est bornée (50 résultats) et exacte, mais le coût côté backend croît avec le
  corpus : ≈ 0,8 s par recherche+focus à 1 M (mixte), ≈ 12 s sur 1 M de lignes aux chemins de 200 niveaux.
  Ce n'est pas un coût de rendu (le rendu reste borné); un index de recherche relève d'une autre tâche.
- **Focus profond** : une destination dont l'ascendance atteint `MATERIAL_BUDGET` (256) est refusée par
  « focus ancestry exceeds view budget », et au-delà de 512 niveaux par `hierarchy_chain_too_deep` (erreurs fixes,
  testées : `a_destination_deeper_than_the_budget_is_refused_cleanly`). Elle reste atteignable par recherche,
  `map_node_children` et la pagination de son parent, pas par le focus de vue. Les chemins Windows plafonnent
  bien avant en pratique; la limite est documentée, non modifiée.
- **Dernière page d'un agrégat** : l'agrégat compte ce que *la page courante* ne montre pas; sur la dernière page il
  garde donc un libellé « Voir la suite » et un Entrée de plus **revient à la première page** (observé :
  `lastPageCyclesToFirst: true`). Exact et sans perte, mais le libellé n'indique pas la fin du parcours; à examiner
  par le contrôle indépendant, non changé ici (la tranche TASK-0030 VERIFIED définit ce comportement).
- 1 M de lignes = lignes **indexées** synthétiques, pas 1 M de fichiers; WebView2 couvre 747 entrées réelles sur
  disque. Aucune mesure de mémoire par processus. Aucun FPS.
- Un seul cerveau dans la preuve WebView2 (le multi-cerveaux est couvert par TASK-0030/0036/0053).

## 7. Candidatures

- `F-050` : `IMPLEMENTED` / candidate. `F-051` : `IMPLEMENTED` / candidate. Paire livrée ensemble.
- `P-01` (tous indexés, vue exacte/bornée, omissions déclarées), `P-02` (hiérarchie exacte, agrégat jamais faux
  dossier, compte exact), `P-03` (parent/enfants directs atteignables malgré pagination/agrégats) : **candidates
  seulement**; aucune n'est marquée `CLOSED` par l'exécuteur.
- `F-046` inchangée. Aucune `TASK-0055`.
