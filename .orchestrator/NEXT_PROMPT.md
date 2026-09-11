# NEXT_PROMPT — TASK-0036 — corrective pass after ACTION-0058

**TARGET_AGENT:** CLAUDE CODE  
**RECOMMENDED_MODEL:** Sonnet 5, high effort  
**STATUS:** READY  
**OWNER:** orchestrateur ChatGPT  
**TASK:** `TASK-0036 — V1 Stable Identity Foundation`  
**BRANCHE:** `build/v0.2-a20-v1-stable-identity`

## /goal

Fermer uniquement **D4 et D5** de `docs/reviews/ACTION-0058-independent-recontrol.md`, puis rejouer les preuves de TASK-0036. Les corrections D1/D2/D3/R1 d’`ACTION-0057` sont **acceptées** et ne doivent pas être réécrites sans régression prouvée.

Cette passe corrige une omission de l’orchestrateur : `DEC-0013` était applicable mais absent de la fiche initiale TASK-0036. Lire et appliquer **DEC-0013 + DEC-0035** comme normes obligatoires.

Ne créer aucune TASK-0037. Ne commencer ni journal, watcher, incrémental, filtres ni nouvelle UI. Finir `IMPLEMENTED`, jamais auto-`VERIFIED`.

## 0 — Préconditions

1. Appliquer `AGENTS.md` et `CLAUDE.md`.
2. Basculer explicitement sur `build/v0.2-a20-v1-stable-identity`, `git fetch origin`, fast-forward uniquement, arbre propre.
3. Le HEAD doit contenir `ACTION-0058` et `DEC-0035`.
4. Lire avant code : `ACTION-0057`, `ACTION-0058`, `TASK-0036`, `DEC-0009`, **`DEC-0013`**, `DEC-0032`, `DEC-0033`, **`DEC-0035`**, `TASK-0012` B1/B3, `identity.rs`, `path_codec.rs`, `index.rs`, `brain_index.rs`, `commands.rs`, `scanner.rs`, tests stable identity et harness TASK-0036.
5. Auditer/réutiliser. Ne refaire ni B1 ni B3.

## 1 — D4 : migration v3→v4 conforme à M-B de DEC-0013

La transaction v3→v4 actuelle est correcte comme **moteur interne**, mais insuffisante comme stratégie de migration produit. `DEC-0013` B impose M-B : **base quiescée → copie de sûreté de fichier → migration transactionnelle en place → restauration si échec**.

### Contrat obligatoire

Conserver les contrôles D1 déjà acquis : brain_id, binding source et version **avant toute mutation et avant toute lecture de source**. Ensuite, pour exactement v3 :

1. obtenir une quiescence réelle et bornée de l’index cible; ne jamais copier une base avec des écritures applicatives concurrentes;
2. traiter correctement WAL/SHM avant la copie : la copie de sûreté doit représenter un v3 cohérent et ouvrable, jamais un `main.db` auquel il manque des commits encore seulement dans `-wal`;
3. fermer/relâcher ce qui doit l’être avant la copie de fichier selon la stratégie M-B mesurée par B1;
4. écrire la copie **uniquement dans l’espace applicatif du cerveau**, jamais dans la source;
5. la copie doit exister et être validée avant le premier DDL v4;
6. exécuter ensuite le `run_stable_identity_migration()` transactionnel déjà corrigé;
7. réouvrir/valider le contrat canonique v4;
8. si migration ou validation échoue, restaurer le v3 de sûreté de façon sûre, avec gestion cohérente des éventuels `-wal`/`-shm`, et rendre l’ancien index ouvrable;
9. si quiescence, checkpoint ou copie échoue : **aucune migration**, ancien v3 intact;
10. mismatch brain/source, legacy REAL_ROOT non autorisé, schéma futur/inconnu : refus sans backup, sans mutation, sans lecture de source;
11. `map_open` conserve `sourceRead=false`.

Ne remplace pas ceci par SQLite Online Backup : `DEC-0013` précise que B1 a mesuré une **copie de fichier sur base quiescée**, pas l’API Online Backup.

### Portée de la copie

Définis une politique simple, bornée et documentée pour le fichier de sûreté dans le répertoire applicatif du cerveau. Ne multiplie pas des backups à chaque ouverture. La tâche doit prouver qu’aucun chemin absolu du backup ne traverse IPC/log/artefact.

### Preuves minimales D4

Ajouter des tests produit/synthétiques qui prouvent :

- v3 en WAL avec une écriture committée réellement présente avant migration : après quiescence/checkpoint, la copie de sûreté s’ouvre en v3 et contient l’état attendu;
- la copie existe avant le premier changement de schéma;
- échec déterministe **après création de la copie** et après début de migration ⇒ restauration de l’index v3 complet, avec `seen`, `index_id`, `index_revision`, brain/source binding, nœuds et version inchangés;
- après restauration, une nouvelle tentative peut réussir;
- busy/quiescence impossible ⇒ refus sans migration et sans backup trompeur;
- mismatch/future schema ⇒ aucun backup créé, fichier byte-identical/logiquement identique;
- migration réussie ⇒ v4 ouvrable, `index_id`/`index_revision` non modifiés par la migration elle-même, source non lue;
- une republication suivante avance la révision et invalide les anciens curseurs comme avant.

Si la quiescence correcte exige une petite primitive de verrouillage commune au cycle d’index, fais-la **étroite et par index/brain**; ne crée pas une nouvelle architecture globale ni un second store.

## 2 — D5 : appliquer DEC-0035 aux placeholders Cloud Files

La règle finale est volontairement conservatrice : **un placeholder Cloud Files reconnu utilise toujours PATH_FALLBACK, hydraté ou déshydraté.** On ne tente jamais `FILE_ID_INFO` pour lui. On ferme ainsi la porte `DEC-0013` F sans prétendre connaître la continuité du FileId générique à travers l’hydratation.

### Audit d’abord

- vérifier si `windows-sys = 0.61.2` déjà épinglé expose `CfGetPlaceholderInfo`, `CF_PLACEHOLDER_STANDARD_INFO` et les constantes/features nécessaires;
- réutiliser cette dépendance si possible avec le minimum de features;
- ne choisir aucune nouvelle caisse sans nécessité démontrée;
- si le binding n’est pas proprement disponible avec la pile approuvée et qu’une FFI Win32 minimale n’est pas sûre/maintenable, **STOP / BLOCKED** plutôt que contourner.

### Contrat obligatoire

Sous Windows, pour un nœud autrement éligible à SYSTEM :

1. ouvrir uniquement un handle métadonnée permettant `READ_ATTRIBUTES`; aucun `GENERIC_READ`, aucun contenu;
2. appeler `CfGetPlaceholderInfo(... CF_PLACEHOLDER_STANDARD_INFO ...)` comme **détection seulement**;
3. succès ⇒ l’objet est Cloud Files ⇒ `PATH_FALLBACK`, sans tentative `GetFileInformationByHandleEx(FileIdInfo)`;
4. réponse officielle « pas un Cloud Files placeholder » ⇒ la voie SYSTEM générique existante peut continuer;
5. erreur ambiguë ⇒ comportement conservateur : `PATH_FALLBACK`, jamais SYSTEM affirmé par défaut;
6. aucun appel à `CfHydratePlaceholder`, `CfDehydratePlaceholder`, pin-state, sync-state mutation ou API de transfert;
7. aucune nouvelle provenance : seulement `SYSTEM` / `PATH_FALLBACK`;
8. aucune donnée CFAPI/FileId/volume dans DTO, logs ou artefacts.

Ne te sers pas des attributs `RECALL_*` comme unique détection : le but précisément est qu’un même placeholder garde la même politique d’identité quand son état d’hydratation change.

### Preuves minimales D5

Sans donnée personnelle ni compte cloud réel :

- tests de décision pure/abstraction Win32 : détection Cloud Files positive ⇒ aucun appel SYSTEM possible, résultat PATH_FALLBACK;
- « not a cloud file » ⇒ chemin SYSTEM normal encore disponible;
- erreur ambiguë ⇒ PATH_FALLBACK;
- prouver structurellement qu’aucune fonction d’hydratation/déshydratation n’est importée/appelée;
- raw-path fallback D3 reste exact;
- si une fixture Cloud Files locale **entièrement synthétique** peut être créée sans compte, réseau, provider réel ni risque d’hydratation, elle est bienvenue mais **pas au prix d’élargir la portée**. Sinon rapporter honnêtement que la frontière CFAPI est prouvée par abstraction + source Microsoft, pas par un vrai compte cloud.

## 3 — Rejouer les invariants déjà acquis

Doivent rester verts :

- D1 : upgrade produit seulement v3→v4, vérification brain/binding avant mutation;
- D2 : transaction SQL atomique et rollback;
- D3 : PATH_FALLBACK depuis chemin OS brut;
- bijection nodes↔identities refusée proprement;
- SYSTEM local = `VolumeSerialNumber + FileId 128 bits`, jamais FileId seul;
- rename/move local intra-volume : même nodeId;
- moved subtree : IDs + parentage cohérents;
- seen sur match SYSTEM;
- no-recycle monotone;
- isolation multi-cerveaux;
- index_revision/cursors;
- recherche, détails, enfants directs, projection, Explorer, Copier le chemin;
- aucune clé stable/path absolu/backup path dans frontend/log/artefact;
- capability WebView inchangée.

## 4 — WebView2

Réutiliser le harness TASK-0036. Rejouer rename/move/moved subtree/no-recycle/search/children/projection/reveal/copy/confidentialité et 0 erreur console fatale.

La migration M-B doit être prouvée au niveau Rust produit avec contrôle précis du fichier v3/backup/WAL; inutile de fabriquer un scénario WebView moins précis si le test Rust passe réellement par `open_map/open_for_brain`.

Aucun vrai fichier cloud, aucun compte OneDrive/Dropbox, aucune donnée utilisateur.

## 5 — Validation générale

Exécuter les tests ciblés puis : `cargo test --offline`, suite TS complète, `pnpm check`, `pnpm build`, `cargo build --offline`, fmt limité aux fichiers touchés, Clippy strict en distinguant dette historique/nouveau diagnostic, `git diff --check`.

## 6 — Livrables

- `TASK-0036 = IMPLEMENTED`, jamais auto-VERIFIED;
- mettre à jour `.orchestrator/RESULT.md`, `CURRENT_STATE`, `HANDOFF`, `NEXT_ACTION`, `VALIDATION`, `CHANGELOG_AI`; corriger honnêtement la fiche TASK-0036 pour inclure `DEC-0013`, `ACTION-0058` et `DEC-0035`;
- `RESULT.md` sépare clairement D4/M-B et D5/Cloud Files, preuves et limites;
- `NEXT_ACTION = nouveau contrôle indépendant de TASK-0036`;
- aucun TASK-0037, PR, merge, tag ou release.
