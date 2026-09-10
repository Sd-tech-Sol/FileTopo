# NEXT_PROMPT — TASK-0032 / V1 REAL_ROOT — Controlled Local Folder Onboarding

**TARGET_AGENT:** CLAUDE CODE  
**RECOMMENDED_MODEL:** Claude Opus 5  
**STATUS:** READY  
**OWNER:** orchestrateur technique  
**MODE:** code produit V1 — première vraie source locale, pas un spike  
**TASK:** `TASK-0032 — V1 REAL_ROOT — Controlled Local Folder Onboarding`  
**DECISION À CRÉER SI PRÉCONDITIONS OK:** `DEC-0033 — Real Root Privacy and Source Binding Contract`

## /goal

Introduire la première vraie source utilisateur dans FileTopo **sans casser les garanties obtenues par TASK-0030/TASK-0031**.

À la fin de cette tranche, FileTopo doit pouvoir :

1. laisser l'utilisateur choisir explicitement un dossier local avec le sélecteur natif déjà présent dans le code historique / dépendance `tauri-plugin-dialog` déjà installée;
2. créer un cerveau `REAL_ROOT` dans le catalogue local sans envoyer ni journaliser le chemin absolu;
3. conserver le chemin canonique uniquement dans l'état local FileTopo, hors de la racine analysée;
4. indexer ce dossier uniquement sur une action explicite `Actualiser/Indexer`, avec le scanner Rust existant en lecture seule;
5. ouvrir ensuite ce cerveau depuis son index persistant **sans relire la source**, conformément à DEC-0032;
6. afficher la projection bornée existante dans MapApp, sans whole-graph DTO et sans nouveau renderer;
7. continuer à fonctionner hors ligne, sans compte, sans cloud, sans télémétrie et sans LLM.

**Cette tranche NE doit PAS utiliser le vrai cerveau personnel de Sébastien.** Les preuves utilisent uniquement des arborescences de test générées localement. Le vrai cerveau sera demandé seulement après contrôle indépendant de TASK-0032.

---

## 0 — Synchronisation et vérité Git

1. Appliquer `AGENTS.md`, `CLAUDE.md` et les protocoles actifs.
2. `git fetch origin`, puis fast-forward uniquement.
3. Branche de départ attendue : `build/v0.2-a15-v1-brain-lifecycle`.
4. HEAD distant attendu au départ : `31bc4ac4decac7220083f24e2ce77010b5db294f`.
5. `ACTION-0048 = CLOSED` et son verdict externe est autoritatif : `TASK-0031 = VERIFIED` dans sa portée synthétique.
6. La fiche TASK-0031 et `CURRENT_STATE.md` peuvent encore contenir `IMPLEMENTED`/« attend le contrôle » : **corriger uniquement cette incohérence documentaire dans le commit de gel**, sans réinterpréter le verdict.
7. `TASK-0030 = VERIFIED`, `ACTION-0047 = CLOSED`; `TASK-0029 = VERIFIED`.
8. `DEC-0032 = APPROVED`.
9. `origin/main` doit rester exactement `1a7d652ca48281c1687f6d1404c56a1404df91d8`.
10. X5 = **36**, inchangé.
11. `TASK-0032`, `DEC-0033` et la branche suivante doivent être libres.
12. Arbre de travail propre avant écriture. Si le transfert Codex/Claude précédent a laissé des changements locaux non poussés, STOP et les inventorier; ne rien écraser.

Toute divergence inexpliquée : **BLOCKED**.

### Branche de travail

Créer depuis le HEAD synchronisé :

`build/v0.2-a16-v1-real-root`

Pas de PR, merge, tag, release ni modification de `main`.

---

## 1 — DEFINE : gel avant code

Avant le premier changement produit, créer et committer ensemble :

- `docs/tasks/TASK-0032-v1-real-root.md`
- `docs/decisions/DEC-0033-real-root-privacy-and-source-binding.md`
- correction documentaire minimale de TASK-0031/CURRENT_STATE vers `VERIFIED` par ACTION-0048 si nécessaire.

Le gel doit être parent direct du premier commit de code.

### DEC-0033 doit figer au minimum

#### A. Sélection explicite seulement

- Un `REAL_ROOT` n'est créé qu'après un geste utilisateur explicite sur **Ajouter un cerveau / Choisir un dossier**.
- Aucun scan n'est déclenché par l'ouverture du sélecteur ni par l'enregistrement du cerveau.
- Annuler le sélecteur ne crée ni cerveau, ni index, ni état partiel.
- Le frontend **ne fournit jamais un chemin arbitraire** à une commande produit. Le chemin est obtenu côté Rust via le sélecteur natif.

#### B. Chemin privé et local

- Le chemin absolu canonique peut être stocké uniquement dans la base de catalogue locale FileTopo.
- Il ne doit pas être sérialisé dans `BrainCatalogView`, `BrainRecord` destiné au frontend, `MapOpenReport`, `MapBuildReport`, logs, messages d'erreur, artefacts de preuve, docs ou Git.
- Le frontend reçoit seulement les informations nécessaires : identité FileTopo, nom/label local affichable, type de source et métadonnées non sensibles utiles.
- Les tests doivent prouver qu'un chemin sentinelle complet n'apparaît dans aucun DTO JSON retourné au WebView ni artefact TASK-0032.

#### C. Encodage Windows exact

- Réutiliser/adopter le codec de chemin déjà présent dans `registry.rs` (BLOB UTF-16 sous Windows) ou une primitive équivalente réutilisée, **pas `to_string_lossy()` pour persister le chemin canonique**.
- Les noms affichés peuvent être lossy si nécessaire, mais la résolution source doit conserver le chemin réel.

#### D. Source binding

- `brain_id` reste l'identité du cerveau, jamais le chemin.
- Deux cerveaux peuvent légitimement pointer vers le même dossier; pas de contrainte UNIQUE sur le chemin source.
- L'index reste séparé par `brain_id`.
- L'index doit pouvoir prouver qu'il correspond au cerveau/source attendus sans recopier le chemin absolu dans ses métadonnées. Utiliser un identifiant opaque/local (`source_ref`/UUID ou équivalent) plutôt que le chemin en clair.
- Une substitution silencieuse de source est interdite.

#### E. Séparation index / source conservée

- Nouveau cerveau REAL_ROOT non indexé : `map_open` répond `NotBuilt`; **aucun scan automatique**.
- Première indexation : action explicite `map_refresh`/« Indexer ».
- Ouverture suivante : index persistant seulement, sans source, conformément à TASK-0031.
- `map_rebuild` reste explicite et fail-safe.

#### F. Lecture seule absolue

- FileTopo ne crée, modifie, renomme ou supprime rien sous REAL_ROOT.
- Tout état FileTopo reste hors de la racine analysée.
- Reparse point/symlink comme racine : refus.
- Les reparse points internes continuent d'être gérés par le scanner existant sans suivi hors racine.
- Refuser une racine qui contiendrait l'espace d'état FileTopo ou qui serait un ancêtre de cet espace, afin d'éviter que l'index se scanne lui-même. Documenter précisément la règle de containment retenue.

#### G. Aucun réseau

- Aucun nouveau domaine CSP, aucune requête réseau, télémétrie, cloud, MCP, Graphify ou IA.
- `tauri-plugin-dialog` est déjà présent : ne pas ajouter une nouvelle bibliothèque de picker si l'existante suffit.
- Ne donner au WebView aucune permission filesystem générale pour contourner le backend Rust.

---

## 2 — PLAN : audit minimal de réutilisation avant code

Documenter dans TASK-0032, avant BUILD :

- l'ancien `choose_collection` dans `src-tauri/src/lib.rs` et ce qui peut être repris;
- `registry.rs` et son encode/decode path BLOB Windows;
- l'état actuel de `BrainCatalog` / `SourceKind` / schéma `brains` limité à `SYNTHETIC_FIXTURE`;
- l'initialisation réelle de `tauri-plugin-dialog` et les permissions Tauri nécessaires;
- le chemin `map_refresh -> scan_tree_controlled -> BrainIndex -> map_view` déjà existant;
- tout endroit où `BrainRecord.source_ref`, erreurs ou `hostLog()` pourraient exposer un chemin;
- les protections CSP/réseau existantes.

Ne recréer ni scanner, ni index, ni materializer, ni layout, ni catalogue parallèle.

Si l'ancien `Registry` n'est plus nécessaire au runtime final, **ne pas fusionner toute sa suppression dans cette tâche** : reprendre seulement les primitives utiles. La suppression de dette historique sera une tranche distincte si elle reste nécessaire.

---

## 3 — BUILD : catalogue REAL_ROOT

Étendre le catalogue existant, pas l'ancien Registry comme deuxième vérité.

### Migration catalogue

Passer le catalogue à un schéma qui supporte au minimum :

- `SYNTHETIC_FIXTURE`;
- `REAL_ROOT`.

Exigences :

- migration transactionnelle et idempotente depuis le schéma courant;
- préserver les cerveaux synthétiques existants, leurs noms/couleurs/icônes et `active_brain_id`;
- aucune perte du catalogue si la migration échoue;
- le chemin réel est stocké en BLOB/local uniquement;
- aucun chemin absolu dans une colonne destinée au DTO/UI;
- pas de contrainte empêchant deux cerveaux de partager la même racine.

Éviter un design où `BrainRecord` sérialisé transporte accidentellement `PathBuf`. Séparer au besoin **record public** et **source résolue interne**, ou utiliser un champ privé/skip explicite et testé.

### Enregistrement d'un REAL_ROOT

Ajouter une primitive interne testable du type `register_real_root(path)` et une seule commande produit de sélection native, par exemple :

`map_brain_choose_real_root()`

La commande :

1. ouvre le sélecteur natif de dossier;
2. sur annulation retourne `None` sans effet;
3. canonicalise et valide la racine;
4. refuse fichier, symlink/reparse root et conflit de containment avec l'espace FileTopo;
5. crée un `brain_id`/source binding opaques;
6. stocke le chemin uniquement localement;
7. retourne un DTO **sans chemin absolu**;
8. ne scanne rien.

Ne pas ajouter une commande produit `register_path(path: string)` accessible au WebView.

---

## 4 — BUILD : résolution de source unifiée

Remplacer les suppositions « une source = fixture » par une petite abstraction interne, sans framework :

- synthétique -> chemin de fixture contrôlé;
- REAL_ROOT -> chemin local résolu depuis le catalogue.

`map_open` ne doit toujours pas résoudre/lire physiquement la racine REAL_ROOT si l'index existe.

`map_refresh` / `map_rebuild` résolvent la source et passent le **même scanner existant**.

Généraliser les métadonnées qui portent aujourd'hui des noms `fixture_id` uniquement si nécessaire; ne pas conserver un mensonge sémantique pour REAL_ROOT. Les rapports UI doivent porter des faits réels, et aucun chemin absolu.

Pour une source réelle, ne pas exécuter un second parcours complet uniquement pour calculer une « empreinte de lecture seule » de production. La lecture seule se prouve par le design et les tests. Les empreintes synthétiques historiques peuvent rester pour leurs scénarios.

---

## 5 — BUILD : MapApp minimal

Pas de redesign.

Ajouter seulement ce qui est nécessaire pour le flux V1 :

- **Ajouter un cerveau / Choisir un dossier**;
- entrée du nouveau cerveau dans la composition/catalogue;
- état « non indexé » clair;
- action explicite **Indexer/Actualiser**;
- ensuite Ouvrir / Actualiser / Reconstruire continuent à utiliser le cycle TASK-0031;
- afficher un label de racine utile sans exposer inutilement le chemin complet dans les logs ou diagnostics.

Le choix de dossier ne doit jamais lancer automatiquement un scan.

Les cerveaux synthétiques/scénarios de preuve doivent continuer à fonctionner. Ne pas faire la finition visuelle dans cette tranche.

---

## 6 — VERIFY : preuves obligatoires

Toutes les preuves utilisent des données de test générées localement. **Aucun vrai cerveau personnel.**

### RR1 — Migration catalogue

Construire un catalogue v1 avec les données synthétiques courantes et un `active_brain_id` modifié. Ouvrir avec le nouveau code :

- migration réussie;
- mêmes cerveaux/noms/couleurs/icônes;
- même cerveau actif;
- réouverture idempotente;
- schéma courant exact.

### RR2 — Picker/registration sans scan

Tester la primitive interne avec une racine temporaire réelle :

- cerveau REAL_ROOT créé;
- source inchangée;
- aucun index créé;
- `map_open` -> `NotBuilt`;
- annulation du picker -> zéro effet;
- validation refuse fichier et root reparse/symlink lorsque la plateforme le permet.

Le test du picker natif lui-même peut être un smoke test si l'automatisation Windows du dialogue est raisonnable; **ne pas introduire une dépendance lourde juste pour automatiser le dialogue**. La logique d'enregistrement doit être testée indépendamment du GUI natif.

### RR3 — Confidentialité du chemin

Créer une racine portant une sentinelle clairement reconnaissable, par exemple un chemin temporaire avec `FILETOPO_PRIVATE_SENTINEL_<random>`.

Après création/indexation/ouverture :

- sérialiser les DTO publics pertinents;
- inspecter les logs/artefacts TASK-0032 générés;
- la chaîne absolue sentinelle ne doit apparaître nulle part hors du catalogue local de test et de la mémoire interne du test;
- aucun artefact Git ne doit contenir le chemin réel de la machine.

Ne pas écrire le chemin sentinelle lui-même dans un JSON de preuve; n'enregistrer que `absolutePathLeak=false`.

### RR4 — Première indexation réelle

Sur un dossier temporaire créé par le test avec dossiers/fichiers Unicode et profondeur >1 :

- `map_refresh` initialise l'index canonique;
- `map_view` rend une projection bornée;
- détails et résolution de chemin relatif fonctionnent;
- source binding et brain isolation corrects;
- aucun fichier FileTopo créé sous la racine.

### RR5 — Open offline de la source

Après indexation REAL_ROOT :

- relever index_id/revision/projection;
- renommer/déplacer temporairement la racine sous garde de restauration;
- `map_open` et `map_view` continuent de réussir exactement depuis le dernier index;
- `map_refresh`/`map_rebuild` échouent explicitement sans altérer l'index;
- restaurer la source quoi qu'il arrive.

### RR6 — Lecture seule

Avant/après refresh puis rebuild d'une racine de test :

- mêmes chemins relatifs;
- mêmes bytes/tailles des fichiers;
- mêmes mtimes lorsque le filesystem le permet de façon stable;
- aucun nouvel artefact sous la source;
- aucune suppression/rename par FileTopo.

Ne pas utiliser l'atime comme preuve normative.

### RR7 — Deux cerveaux, même REAL_ROOT

Créer deux cerveaux pointant vers la même racine :

- brain_id distincts;
- index_id distincts;
- index DB distinctes;
- refresh/rebuild de l'un ne change ni identité ni révision de l'autre;
- le chemin n'est pas exposé au frontend.

### RR8 — Containment

Prouver le refus d'une racine qui engloberait l'espace d'état FileTopo ou créerait une relation de containment dangereuse. Aucun scan récursif de l'index FileTopo lui-même ne doit être possible par construction.

### RR9 — Pas de réseau / pas de nouvelle stack

Garde structurelle :

- CSP Internet inchangée;
- aucun fetch/HTTP ajouté;
- aucune nouvelle dépendance sauf modification strictement nécessaire pour activer le plugin dialog **déjà déclaré**;
- aucun permission filesystem générique côté WebView;
- aucun Graphify/MCP/LLM/cloud/télémétrie.

### RR10 — Projection bornée inchangée

REAL_ROOT suit :

`catalogue -> source interne -> scanner -> Index canonique -> map_view bornée -> layout de vue -> MapApp`

Aucun `all_nodes` frontend, aucun layout global, aucun retour au vieux Registry/MapStore comme corpus produit.

---

## 7 — Validation générale

Exécuter :

- tests Rust ciblés puis complets;
- tests TypeScript ciblés puis complets;
- `pnpm check`;
- `pnpm build`;
- `cargo build --offline`;
- `cargo fmt --check` sur fichiers touchés et état global rapporté honnêtement;
- `cargo clippy --all-targets --offline -- -D warnings` : aucun nouveau diagnostic TASK-0032; ne pas transformer la tranche en nettoyage global Clippy;
- `git diff --check`.

Effectuer un passage Windows/Tauri/WebView2 **sans données personnelles** si possible avec un dossier temporaire local. Il doit au minimum prouver le chemin produit après enregistrement interne : REAL_ROOT -> explicit refresh -> open -> bounded map. Le dialogue natif n'a pas besoin d'une automatisation fragile si cela exige du surdéveloppement; sa commande/compilation et la primitive partagée doivent être prouvées séparément.

Artefacts `TASK-0032-*` : non canoniques, sans chemin absolu, hors X5 jusqu'au contrôle indépendant.

---

## 8 — Interdits

TASK-0032 ne doit PAS :

- utiliser le vrai cerveau de Sébastien;
- ajouter watcher/notify-rs ou mise à jour incrémentale;
- implémenter FTS5/recherche P-08;
- implémenter l'identité physique F-046;
- changer renderer/layout/stack;
- faire le redesign UX/UI;
- ajouter Graphify, MCP, IA, cloud, télémétrie ou réseau;
- envoyer un nom, chemin, métadonnée ou graphe à Internet;
- créer un second catalogue/index canonique;
- ressusciter l'ancien `Registry` comme vérité produit;
- exposer une API WebView qui accepte un chemin arbitraire;
- supprimer toute la dette legacy_store/Registry dans cette tranche;
- modifier X5 ou des preuves historiques;
- créer TASK-0033 / DEC-0034;
- modifier main / PR / merge / release / tag / force push.

`F-050/F-051` restent IMPLEMENTED jusqu'à leur acceptance globale. `F-042`, FTS, watcher et autres fonctions non visées gardent leur statut actuel.

---

## 9 — État final attendu

Mettre à jour :

- `docs/tasks/TASK-0032-v1-real-root.md`;
- `docs/decisions/DEC-0033-real-root-privacy-and-source-binding.md`;
- `docs/ai/CURRENT_STATE.md`;
- `docs/ai/NEXT_ACTION.md`;
- `docs/ai/HANDOFF.md`;
- `docs/ai/VALIDATION.md`;
- `docs/ai/CHANGELOG_AI.md`;
- `docs/product/FEATURE_MATRIX.md` uniquement si nécessaire;
- `.orchestrator/RESULT.md`.

À la fin :

- TASK-0032 = `IMPLEMENTED`, jamais auto-VERIFIED;
- DEC-0033 = `APPROVED`;
- TASK-0031 = `VERIFIED` par ACTION-0048 partout où son état courant est mentionné;
- R-T30-5 peut être déclarée **traitée uniquement dans la portée REAL_ROOT de test**; pas de validation sur données personnelles avant contrôle indépendant;
- R-T30-1/-3/-4/-6 et R8 restent ouvertes sauf preuve explicite contraire;
- `NEXT_ACTION` = contrôle indépendant de TASK-0032 uniquement;
- aucune tâche suivante précréée.

## 10 — RESULT.md

Rapporter au minimum :

```text
TASK_ID: TASK-0032 — V1 REAL_ROOT — Controlled Local Folder Onboarding
AGENT: CLAUDE
RESULT: DONE | BLOCKED | FAILED
BRANCH: build/v0.2-a16-v1-real-root
FINAL_HEAD: <commit substantif final avant RESULT-only>

SUMMARY:
-

REAL_ROOT_CONTRACT:
- picker explicit / no scan on registration
- absolute path local-only / not serialized
- first refresh explicit
- open index-only
- source read-only
- bounded projection unchanged

PRIVACY_PROOF:
- absolutePathLeak: true/false
- networkAdded: true/false
- sourceArtifacts: <count>

VALIDATIONS:
-

LIMITS:
- no personal brain used
- no watcher/incremental
- no FTS
- performance/laptop acceptance still separate

FILES_CHANGED:
-

X5: 36
MAIN_UNCHANGED: yes/no
TASK_STATUS: IMPLEMENTED
DECISION_STATUS: APPROVED
COMMIT:
PUSHED: yes/no
NEXT: independent control only
```

Push uniquement `build/v0.2-a16-v1-real-root`.