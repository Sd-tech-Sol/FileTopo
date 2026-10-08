# TASK-0056 — V1 Final Parity Acceptance / Stage A Closure

- **Date :** 2026-10-08
- **Statut :** **`BLOCKED`** — un gap produit a été trouvé pendant l'exercice de
  `P-01..P-21`. Conformément à §9 et à `ACTION-0105` §5, la tâche s'arrête sans
  aucune correction produit. Voir §11 ci-dessous.
- **Branche :** `build/v0.2-a40-v1-final-parity-acceptance`
- **Base :** `446a4e4922f46bf4cdd71dd1aff65f08b5318b9d`
- **Sélection :** ACTION-0105
- **Nature :** acceptance / preuves / documentation uniquement
- **Code produit :** modification interdite

## 1. Résultat unique attendu

Produire la preuve finale permettant à un contrôleur indépendant de décider si
l'étape A « Parité fonctionnelle MVP » peut être fermée.

Aucune nouvelle capacité produit.

## 2. Audit reuse-first

Avant d'écrire un nouveau harness, inventorier les preuves/harness existants :

- TASK-0016..TASK-0055;
- ACTION indépendantes correspondantes;
- artefacts WebView2 canoniques;
- scenario runners déjà présents dans MapApp/tests;
- harness de recherche/scale;
- harness journal/watcher/incrémental;
- harness resume/workspace;
- harness relations intra/cross;
- harness accessibilité;
- harness TASK-0055.

Classer :
- RÉUTILISER;
- COMPOSER;
- MANQUANT POUR L'ACCEPTANCE FINALE.

Ne dupliquer un scénario que si P-22 exige une observation qui n'existe pas.

## 3. Matrice P-01..P-22

Créer un artefact/document machine-lisible + lisible humainement.

Pour chaque P :
- critère exact;
- preuves indépendantes;
- preuve runtime réelle si disponible;
- limites;
- statut courant;
- verdict de TASK-0056 : `SATISFIED`, `GAP`, ou `NOT_APPLICABLE` seulement
  si le contrat lui-même l'autorise.

P-01..P-04/P-19..P-21 ont déjà des clôtures : vérifier qu'aucune régression
postérieure ne les invalide.

P-05..P-18 : composition formelle des preuves, sans les déclarer CLOSED soi-même.

P-22 : nouvelle preuve finale obligatoire.

## 4. Campagne P-22

Utiliser un vrai Tauri/WebView2.

Source :
- temporaire;
- synthétique;
- aucun chemin personnel;
- suffisamment riche pour couvrir fichiers/dossiers, unicode, profondeur,
  largeur, hard link/copie, relations et plusieurs cerveaux selon besoin.

Baseline externe AVANT session :
- liste relative;
- nature;
- contenu/hash;
- taille;
- timestamps contractuels;
- structure;
- absence d'artefact FileTopo dans source.

Ensuite exercer explicitement P-01..P-21 via le produit.

À la fin :
- même empreinte exacte;
- zéro artefact FileTopo sous la source;
- aucun changement de timestamp;
- indisponibilité temporaire restaurée et sans suppression massive;
- logs/IPC sans chemin personnel ou secret.

Les gestes qui doivent réellement muter une source pour préparer un cas se font
avant le baseline. Pendant la fenêtre P-22, seules les actions FileTopo et les
manipulations d'indisponibilité explicitement restaurées sont admises.

## 5. Couverture runtime minimale P-22

La table P-01..P-21 doit pointer vers une observation de la campagne pour chaque
P. Au minimum :

- carte exacte + hiérarchie + enfants;
- relation établie + suggestion distincte + entrée/sortie;
- sélection souris/clavier + accentuation;
- recherche + filtres + légende;
- pan, zoom, fit, reset;
- panneau détails masqué/réaffiché;
- enfants paginés;
- copie du chemin;
- ouverture Explorateur sur fixture synthétique;
- journal consulté;
- vu/non-vu + marquer vu;
- Actualiser;
- watcher/incrémental;
- fermeture/réouverture réelle;
- plusieurs cerveaux indépendants;
- FR puis EN;
- parcours clavier/axe sur les états retenus.

Les seuils lourds restent prouvés par les campagnes historiques; P-22 demande
ici leur **exercice non destructif**, pas de refaire 1M nœuds dans l'UI finale.

## 6. Régression globale — sortie capturée

Le flake non identifié de TASK-0055 devient un gate.

Exécuter au minimum **trois** suites Rust complètes consécutives au même HEAD :

`cargo test --lib --offline`

Pour chaque run :
- capturer stdout/stderr;
- exit code;
- passed/failed/ignored;
- liste exacte des tests en échec, vide si PASS;
- hash du log;
- heure/durée.

Si un seul run échoue :
- conserver le nom + extrait du failure;
- tenter un rejeu ciblé pour diagnostic;
- **TASK-0056 = BLOCKED** tant que l'échec n'est pas expliqué ou corrigé par une
  tâche séparée;
- ne pas masquer comme flake.

Aussi :
- frontend suite complète;
- `pnpm check`;
- `pnpm build`;
- Tauri debug;
- tests ciblés des surfaces P-05..P-18;
- `git diff --check`;
- public readiness.

Aucune CI GitHub distante n'est supposée; si elle existe, l'inclure séparément.

## 7. Invariants et sécurité

Prouver explicitement :
- I-1 lecture seule source;
- I-2 aucun artefact dans source;
- I-3 frontières produit selon le contrat courant;
- aucune donnée personnelle;
- aucun secret;
- aucune identité machine brute/dérivée publiée;
- aucun whole-graph DTO;
- aucun élargissement Tauri/capability par cette tâche.

## 8. Documentation

Réconcilier les statuts historiques périmés, au minimum :

- ROADMAP Stage A;
- FEATURE_MATRIX;
- CARTETOPO_FUNCTIONAL_PARITY;
- CURRENT_STATE;
- HANDOFF;
- VALIDATION;
- CHANGELOG_AI;
- NEXT_ACTION;
- RESULT.

Ne supprimer aucun historique; ajouter des clôtures datées.

## 9. Interdiction de code produit

Le diff de TASK-0056 ne doit toucher aucun fichier de production.

Autorisé :
- scripts/harness;
- tests dédiés si pure preuve et sans changer le produit;
- docs/artefacts.

Si un bug produit est trouvé : STOP/BLOCKED, sans patch.

## 10. Fin

Si PASS :
- TASK-0056 = IMPLEMENTED / candidate;
- P-05..P-18/P-22 = candidates;
- Stage A = candidate CLOSED;
- NEXT_ACTION = contrôle indépendant final Stage A;
- aucune TASK-0057.

Si FAIL :
- TASK-0056 = BLOCKED;
- Stage A = EN COURS;
- NEXT_ACTION = gap exact à arbitrer;
- aucune correction produit dans cette tâche.

Commit/push, arbre propre, STOP.

---

## 11. Résultat de l'exécution — 2026-10-08

**Verdict : `BLOCKED`.** Un gap produit a été trouvé, et non corrigé.

### 11.1 Le gap

La **surface des relations est inatteignable sur un cerveau `REAL_ROOT`.**
`map_relations_open`, `map_relations_for_node` et
`map_relations_review_queue` passent toutes par
`BrainRecord::source_fixture()` (`src-tauri/src/map/brains.rs`), qui refuse une
racine réelle avec `map_source_not_synthetic`. Le panneau des relations rend
donc sa forme « indisponible » : aucune provenance, aucune direction, aucune
suggestion, aucune file de révision. Le **moteur** est générique —
`map_relation_engine_run` et `map_relation_engine_status` répondent sur le même
cerveau —, mais rien ne peut lire ce qu'il produit.

Depuis `DEC-0033` A, **une racine réelle est la seule façon dont l'arborescence
d'une personne entre dans FileTopo**. `P-04`, `P-05` et `P-07` sont donc
inatteignables pour les données de l'utilisateur, ce que le contrat de parité
§3 règle 2 assimile à leur suppression. Verdict de la matrice : **`GAP`** pour
les trois.

**Le contre-argument est écrit, pas tu :** le contrat dit qu'un critère est
*vérifiable sur fixtures synthétiques* (§1.2, §9), et la campagne l'a vérifié
là — la surface fonctionne, provenance, direction, suggestion, approbation au
clavier et file de révision comprises. Ce qui tranche, à la lecture de
l'exécuteur, est §1.1 point 3 — généraliser à **n'importe quelle** arborescence
— plus le fait que le code et `ACTION-0040`/`ACTION-0041` déclarent
l'intention inverse (« `source_spec()` valide la source de n'importe quel
cerveau »). L'écart est donc entre une intention décidée et son implémentation.
**L'arbitrage appartient au contrôle indépendant**, y compris sur ce que cela
implique pour `P-04`, déjà fermée par `ACTION-0094` sur preuves synthétiques.

**Aucun correctif n'est appliqué** : §9 l'interdit, et la pureté du diff est
prouvée (0 fichier de production touché sur 21 fichiers modifiés depuis la
base).

### 11.2 Ce qui est livré malgré l'arrêt

| Livrable | État | Artefact |
|---|---|---|
| Matrice `P-01..P-22`, lisible et machine-lisible | livrée | `docs/product/PARITY_MATRIX_P01_P22.md`, `docs/product/parity-matrix-p01-p22.json` |
| Gate de régression Rust à sorties capturées | **PASS**, 3/3 vertes | `docs/performance/runs/TASK-0056-rust-gate.json` |
| Campagne finale `P-22` | **PASS** comme mesure d'immuabilité | `docs/performance/runs/TASK-0056-p22-webview2.json` |
| Pureté du diff | **PURE** | `docs/performance/runs/TASK-0056-diff-purity.json` |
| Audit reuse-first | livré | §4 de la matrice |

**Gate Rust :** `cargo test --manifest-path src-tauri/Cargo.toml --lib
--offline` trois fois de suite au `HEAD` `7196fff`, sorties capturées hors
dépôt : **901 passed / 0 failed / 13 ignored** à chaque fois, codes de sortie
`0`, durées `192,0 s`, `189,7 s`, `200,2 s`, hash de log distinct par run.
**Aucun échec**, donc le flake non identifié de `TASK-0055` ne s'est pas
reproduit; il n'est pas pour autant déclaré inexistant.

**Campagne `P-22` :** trois processus Tauri/WebView2 réels, quatre racines
empreintées, `P-01..P-22` tous couverts par au moins une observation runtime.
Empreinte stricte **identique** avant et après la fenêtre, horodatages de
dernier accès compris, **aucun artefact FileTopo** sous une racine, et le
chemin copié — relu hors du WebView — est le chemin réel de l'élément
sélectionné.

### 11.3 Un faux échec, et ce qu'il a coûté

La première campagne complète a rapporté l'empreinte comme **changée**. Elle ne
l'était pas : les trois valeurs changées sont des horodatages **de dossier**
dont la nouvelle valeur est un instant **antérieur à l'ouverture de la
fenêtre** (`11:35:58.058`–`.060` pour une fenêtre allant de `11:35:58` à
`11:37:50`), et **rien** dans les arbres ne portait un instant pris dans la
fenêtre. NTFS n'avait pas encore écrit ces trois horodatages quand la ligne de
base a été lue, une seconde après les changements pré-baseline. Les deux
empreintes sont désormais lues **jusqu'à ce que deux lectures consécutives
concordent**, et le nombre de lectures est publié avec l'artefact.

### 11.4 Suite

- `TASK-0056` reste **`BLOCKED`**; l'étape **A** reste **`EN COURS`**.
- Action unique suivante : **arbitrage du gap** par Sébastien et contrôle
  indépendant. La correction, si elle est décidée, appartient à une **tâche
  séparée**.
- **Aucune `TASK-0057` n'est créée.** Aucune étape **B**, **C** ou **D** n'est
  commencée.
