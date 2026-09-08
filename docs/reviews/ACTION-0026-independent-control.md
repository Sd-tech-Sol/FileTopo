# ACTION-0026 — Contrôle indépendant de TASK-0016 : CHANGES_REQUIRED, réserve X2

- **Date :** 2026-08-31
- **Objet :** contrôle indépendant de la **première tranche de code de
  production** livrée par
  [TASK-0016](../tasks/TASK-0016-p4-vertical-slice.md) — examen direct du
  commit final `8cb752b`, du code et des preuves publiées
- **Contrôleur :** **orchestrateur technique**, instance **distincte** de
  l'exécuteur de `TASK-0016`
- **Rédacteur de la présente fiche :** Claude Code, **exécuteur de la
  correction**, sous le GO technique de l'orchestrateur. **Cette fiche
  enregistre un verdict; elle ne le rend pas.**
- **Verdict :** **`CHANGES_REQUIRED`**. `TASK-0016` **reste `IMPLEMENTED`**,
  **pas `VERIFIED`**.

> **Ce que cette fiche est.** L'enregistrement d'un constat indépendant, de la
> réserve bloquante `X2` qu'il émet, et de la correction exécutée en réponse.
>
> **Ce qu'elle n'est pas.** Elle **n'attribue pas `VERIFIED`**. La correction a
> été faite par l'exécuteur de la tranche; **elle appelle donc un
> re-contrôle**, par une instance distincte, avant tout changement de statut.

## 1. Résultat du contrôle

**`H1` à `H11` et les preuves publiées sont jugés acceptables** — mais **sous
réserve de `X2`**, qui est **bloquante**.

`ACTION-0026` reste **`CHANGES_REQUIRED`** tant que `X2` n'est pas corrigée et
re-contrôlée.

## 2. Réserve X2 — surface runtime héritée hors périmètre

**Ce qui a été constaté.** La nouvelle interface démarre bien sur `MapApp` et
n'offre **aucun accès aux données réelles**. Mais `src-tauri/src/lib.rs`
**enregistrait encore**, dans l'`invoke_handler` **actif du produit courant**,
huit commandes héritées de la 0.1 :

`list_collections`, `choose_collection`, `index_collection`,
`cancel_indexing`, `index_progress`, `query_collection_nodes`,
`mark_node_seen`, `reveal_indexed_node`

— et **initialisait encore `tauri_plugin_dialog`**.

**Pourquoi c'est bloquant, et pas cosmétique.** `TASK-0016` §12.4 fait des
fixtures synthétiques la **seule** source de la tranche, et interdit d'exposer
un sélecteur de dossier réel, une recherche, un état vu/non vu ou une ouverture
dans l'Explorateur. **Enregistrer une commande est précisément ce qui la rend
atteignable :** une commande enregistrée est invocable depuis la WebView, que
l'interface propose ou non un bouton pour elle. Un sélecteur de dossier réel se
trouvait donc à **un `invoke` de distance** d'une tranche qui ne doit pas en
avoir.

**Comment le défaut est né.** Par **addition** : les commandes de la tranche
ont été ajoutées au gestionnaire sans que celles du prototype en soient
retirées. Le rapport de clôture affirmait « aucun sélecteur de dossier
utilisateur » en s'appuyant sur ce que l'interface **appelle**, pas sur ce que
le runtime **expose**. La distinction est exactement celle qui manquait.

## 3. Correction exécutée

Sur `build/v0.2-p4-vertical-slice`, depuis le tip contrôlé `8cb752b`, arbre
propre vérifié.

| # | Geste | Détail |
|---|---|---|
| `C1` | **Gestionnaire réduit à la tranche** | L'`invoke_handler` n'enregistre plus que les **neuf commandes `map_*`** nécessaires à la tranche synthétique. Les huit commandes héritées, plus `health`, `demo_snapshot` et `scan_synthetic_fixture`, n'y figurent plus |
| `C2` | **Plugin de dialogue retiré du runtime** | `tauri_plugin_dialog::init()` n'est plus appelé : aucune commande exposée ne s'en sert |
| `C3` | **`.manage(IndexJobs)` retiré** | Cet état ne servait qu'aux commandes d'indexation héritées, désormais non exposées |
| `C4` | **Code historique conservé** | **Aucune fonction supprimée**, `src/App.tsx` et ses **douze tests intacts**, **aucun historique réécrit**. Les éléments devenus inatteignables portent une annotation explicite qui dit *pourquoi* ils sont conservés |
| `C5` | **Deux tests-gardes ajoutés** | `exposed_commands_stay_within_the_slice` et `no_exposed_command_can_open_a_folder_picker` |

**La dépendance `tauri-plugin-dialog` reste au manifeste**, conformément à
l'instruction : ce n'est pas un nettoyage général, et aucune nécessité de la
retirer n'a été démontrée.

### 3.1 Les tests-gardes, et la preuve qu'ils mordent

`generate_handler!` se compile en une fermeture opaque : il n'y a **rien à
introspecter à l'exécution**. Les gardes lisent donc la **source embarquée à la
compilation** (`include_str!`, qui embarque le **contenu**, jamais le chemin),
extraient la liste réellement enregistrée, et échouent si une commande hors
tranche y figure — ou si une commande enregistrée ne commence pas par `map_`.

**Un test-garde qui ne peut pas échouer ne garde rien.** La correction a donc
été éprouvée en **réintroduisant temporairement `choose_collection`** dans le
gestionnaire : les **deux** gardes ont échoué, avec le message attendu

> `X2: `choose_collection` is out of the slice's scope and must not be
> registered; it is reachable from the WebView the moment it is`

puis l'état corrigé a été restauré et l'arbre laissé propre.

## 4. Vérification explicite des cinq capacités interdites

| Capacité | Atteignable par un chemin normal ? | Sur quoi repose la réponse |
|---|---|---|
| Ouvrir un **sélecteur de dossier utilisateur** | **non** | `choose_collection` non enregistrée; **plugin de dialogue non initialisé** |
| **Enregistrer ou indexer une racine réelle** | **non** | `index_collection`, `cancel_indexing`, `index_progress`, `list_collections` non enregistrées |
| **Rechercher dans une ancienne collection** | **non** | `query_collection_nodes` non enregistrée |
| **Marquer vu / non vu** | **non** | `mark_node_seen` non enregistrée |
| **Ouvrir l'Explorateur** sur une ancienne collection | **non** | `reveal_indexed_node` non enregistrée |

**Contrôlé aussi côté interface :** `src/main.tsx` ne monte que `MapApp`, et le
frontend actif n'invoque **que** les neuf commandes `map_*` — vérifié par
recherche exhaustive des appels `invoke` sous `src/map/`.

**Ce que cette vérification ne dit pas.** Elle porte sur les **chemins normaux
de l'application courante**. Le code du prototype **existe toujours** dans le
binaire; la garantie est qu'il est **inatteignable**, pas qu'il a disparu —
c'est précisément le compromis demandé par l'instruction de conserver le code
historique.

## 5. Validation rejouée sur le binaire corrigé

Le binaire runtime ayant changé, **tout a été rejoué**.

| Contrôle | Résultat |
|---|---|
| Tests Rust | **42 passés**, 0 échec (40 avant + les 2 gardes) |
| Tests TypeScript | **59 passés**, 0 échec — dont les **12 tests du prototype**, intacts |
| Avertissements de compilation, configuration livrée | **0** |
| `H1`, `H2`, `H3`, `H5`, `H6`, `H7`, `H10`, `H11` | **tenus sur les quatre fixtures**, rejoués dans le véritable hôte |
| `H8` | **tenu** — WebView2 `151.0.4129.107`, Tauri `2.11.5`, SQLite `3.53.2` |
| `H9` | **rejoué complet** — 4 fixtures × 5 exécutions, protocole gelé **inchangé** |

**Aucun critère `H1` à `H11` n'a été modifié. Aucune borne `B-1` à `B-4` n'a
été retouchée. Aucune optimisation de performance n'a été faite à l'occasion de
cette correction. Aucune dépendance nouvelle.**

### 5.1 H9 sur le binaire corrigé — publié tel quel

| Fixture | Nœuds | Image médiane | Image min–max | Sélection médiane | Sélection max |
|---|---:|---:|---:|---:|---:|
| `quasi-empty` | 12 | 4,20 ms **(butée)** | 2,00 – 8,80 | 8,30 ms | 9,80 |
| `deep` | 157 | 4,20 ms **(butée)** | 2,20 – 8,70 | 8,40 ms | 12,30 |
| `wide` | 2 207 | **17,80 ms** | 4,10 – 32,10 | 38,45 ms | 63,90 |
| `mixed` | 2 420 | **21,35 ms** | 4,60 – 40,30 | 42,95 ms | 77,50 |

Médianes des cinq exécutions : `wide` 17,6 / 17,8 / 17,6 / 17,4 / 18,5 ;
`mixed` 21,9 / 20,9 / 21,6 / 22,0 / 21,2.

**Ces chiffres sont légèrement moins bons que ceux du commit `8cb752b`** —
`wide` 17,80 ms contre 16,70 ms, `mixed` 21,35 ms contre 20,20 ms. **Ils sont
publiés tels quels**, et **remplacent** les précédents comme mesure de
référence, parce qu'ils portent sur le binaire corrigé.

**Aucune explication a posteriori n'est proposée.** La correction retire des
enregistrements de commandes, ce qui n'a aucun rapport connu avec le coût d'une
image; l'écart est du même ordre que la dispersion entre exécutions d'une même
campagne. **Rien dans les mesures ne permet de trancher**, et rien ne sera
affirmé au-delà.

**La butée reste une butée :** 4,20 ms est le pas de synchronisation verticale
de 4,1667 ms sur cet écran 240 Hz. Elle dit que le rendu tient dans une image,
pas ce qu'il coûte, et **ne peut jamais être citée comme une performance**.

### 5.2 B0, troisième reproduction

`cargo build --locked` a **de nouveau** déclenché la panique interne de
`rustc 1.98.0` sur le cache incrémental — troisième reproduction, identique.
**Rien n'a été supprimé, nettoyé ni renommé dans `src-tauri/target/`**
(`DEC-0013` E), et tous les builds ont employé `CARGO_INCREMENTAL=0`. **`B0`
n'est pas corrigé.**

## 6. Ce que cette correction ne change pas

- **`TASK-0016` reste `IMPLEMENTED`.** L'exécuteur ne s'attribue pas
  `VERIFIED`, et **corriger sa propre tranche ne la vérifie pas**.
- **Aucune fonctionnalité de la tranche `map` n'a été modifiée**, hors ce que
  `X2` exigeait strictement.
- **Aucune réserve n'est levée** : `R8` en particulier reste entière et
  appartient à l'**étape C**.
- **Aucune exigence de parité ne change d'état.** Six restent satisfaites *sur
  ce périmètre*, `P-12` et `P-06` partielles, seize non commencées.
- **Aucune fusion vers `main`, PR, release, étiquette, `force push`**, aucune
  réécriture d'historique.

## 7. Suite ordonnée

**`ACTION-0026` reste ouverte, en attente du RE-CONTRÔLE indépendant.**

Le re-contrôle doit, au minimum :

1. **relire l'`invoke_handler`** et confirmer qu'il n'expose que la tranche;
2. **juger les deux tests-gardes** — lisent-ils la bonne chose, et la preuve
   qu'ils échouent quand le défaut revient est-elle convaincante ?
3. **vérifier que le code historique est conservé** et non supprimé, et que les
   annotations `#[allow(dead_code)]` disent bien *pourquoi*;
4. **contrôler que `H1` à `H11` sont inchangés** et que les bornes `B-1` à
   `B-4` n'ont pas bougé;
5. **juger la publication du `H9` moins bon** : est-il présenté sans
   atténuation, et l'absence d'explication est-elle assumée plutôt que comblée ?
