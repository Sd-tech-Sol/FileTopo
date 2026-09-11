# NEXT_PROMPT — TASK-0036 — corrective pass after ACTION-0057

**TARGET_AGENT:** CLAUDE CODE  
**RECOMMENDED_MODEL:** Sonnet 5, high effort  
**STATUS:** READY  
**OWNER:** orchestrateur ChatGPT  
**TASK:** `TASK-0036 — V1 Stable Identity Foundation`  
**BRANCHE:** `build/v0.2-a20-v1-stable-identity`

## /goal

Corriger uniquement les défauts D1, D2 et D3 de [`docs/reviews/ACTION-0057-independent-control.md`](../docs/reviews/ACTION-0057-independent-control.md), puis rejouer les preuves de TASK-0036. La tâche reste `IMPLEMENTED`, jamais auto-`VERIFIED`.

Ne créer aucune TASK-0037. Ne commencer ni journal de changements, ni watcher, ni application incrémentale, ni nouvelle UI.

## 0 — Préconditions

1. Appliquer `AGENTS.md` et `CLAUDE.md`.
2. Basculer explicitement sur `build/v0.2-a20-v1-stable-identity`, `git fetch origin`, fast-forward uniquement, arbre propre.
3. Le HEAD doit être `15f3d63` ou un descendant contenant `ACTION-0057` et ce prompt.
4. Lire avant tout changement : `ACTION-0057`, `TASK-0036`, `DEC-0009`, `DEC-0011`, `DEC-0032`, `DEC-0033`, `src-tauri/src/path_codec.rs`, `identity.rs`, `scanner.rs`, `index.rs`, `map/brain_index.rs`, `map/commands.rs`, les tests stable identity et les harness TASK-0036.
5. Ne pas refaire le spike B3 et ne pas changer la stratégie I-E.

## 1 — D1 : rendre l'upgrade v3 → v4 réellement atteignable par le produit

Le défaut à fermer est exact : `Index::open()` sait migrer, mais le cycle produit d'une base existante passe d'abord par `BrainIndex::open_existing()`, qui exige déjà `MAP_SCHEMA_VERSION == 4`. Le test actuel ne couvre donc pas le vrai chemin produit.

### Contrat exigé

Un cerveau possédant un **index canonique v3 valide de la version précédente** doit pouvoir être utilisé après mise à jour de FileTopo sans suppression manuelle de l'index et sans scanner la source pour effectuer la migration elle-même.

Conserver les frontières existantes :

- vérifier l'identité du cerveau et le binding de source à partir de la base/index et du catalogue **avant** toute migration qui modifierait une base qui ne leur appartient pas;
- un mismatch `brain_id`, `source_kind` ou `source_ref` doit être refusé **sans migrer la base et sans lire la source**;
- le cas legacy synthétique déjà autorisé par `DEC-0033` doit rester explicitement géré, pas élargi à REAL_ROOT;
- un schéma futur/inconnu doit être refusé; aucune migration à rebours;
- la migration d'index est une opération dans l'espace applicatif : elle ne doit ni résoudre, ni scanner, ni fingerprint la racine;
- `map_open` doit continuer à déclarer `sourceRead=false`. Une migration connue d'index lors de l'ouverture est acceptable si elle ne touche pas la source et si les contrôles ci-dessus sont respectés;
- après migration, le chemin strict `BrainIndex::open_existing()` peut rester v4-only. Préférer un chemin de migration étroit plutôt que d'affaiblir toutes les ouvertures.

Ne contourne pas en supprimant/recréant l'index. `index_id`, `index_revision`, nœuds et `seen` doivent survivre à la migration elle-même.

### Preuve produit obligatoire

Ajouter un test de pipeline qui construit littéralement un index canonique **v3** avec les métadonnées réelles nécessaires (`brain_id`, binding/source, `build_complete`, `projection_contract`, root/node count, index identity/revision), puis passe par les mêmes fonctions que le produit (`open_map` et/ou le chemin lifecycle réellement utilisé) et démontre :

- migration vers v4 réellement déclenchée;
- `map_open` fonctionne ensuite sans lecture de source;
- `index_id` et `index_revision` inchangés par la migration;
- données et `seen` intacts;
- une republication suivante fonctionne et avance la révision normalement;
- ancien curseur invalide seulement après republication, pas à cause de la migration si la révision n'a pas bougé.

Ajouter aussi les refus : v3 d'un autre cerveau/source et schéma >4 restent non modifiés et la source n'est jamais lue.

## 2 — D2 : migration 3 → 4 atomique

`migrate_to_stable_identity()` ne peut plus laisser les deux `ALTER TABLE`, l'index unique, `next_node_id`, `schema_version` et `PRAGMA user_version` se committer séparément.

### Contrat exigé

La transition v3 → v4 est une **transaction unique** :

- ajouter `stable_key` et `identity_provenance`;
- créer l'index unique partiel;
- initialiser `next_node_id` depuis `MAX(id)+1`;
- écrire la version logique et `PRAGMA user_version=4`;
- commit une seule fois.

Si une étape échoue : rollback complet vers le v3 original. Aucun demi-schéma considéré crédible.

### Preuve d'échec obligatoire

Injecter de façon synthétique et déterministe un échec **après au moins une modification DDL dans la transaction** (par exemple obstruction contrôlée d'un objet de schéma, ou hook test-only étroit si nécessaire). Après l'échec, prouver :

- `user_version == 3`;
- les colonnes v4 ne sont pas partiellement présentes;
- données/`seen`/`index_id`/`index_revision` inchangés;
- la base v3 reste lisible selon son contrat précédent et peut être migrée correctement après retrait de l'obstruction.

Ne pas inventer une migration M-C complète ou un nouveau fichier d'index dans cette passe : fermer le contrat atomique explicitement demandé par TASK-0036, sans élargir la portée.

## 3 — D3 : PATH_FALLBACK doit utiliser le chemin OS brut

Le fallback actuel passe `scanner::display_relative()` (`to_string_lossy`) à `path_fallback_key()`. Ce n'est pas le chemin brut exigé par TASK-0036 / DEC-0009.

### Correction exigée

- faire calculer `PATH_FALLBACK` depuis le `Path` relatif brut, pas depuis la `String` d'affichage;
- **réutiliser `crate::path_codec::encode_path()`**, déjà approuvé pour représenter exactement un chemin OS : UTF-16LE sous Windows, bytes OS sous Unix;
- ajouter un séparateur/version/type non ambigu au matériau hashé;
- aucune taille, mtime, contenu ou heuristique;
- conserver `NodeDto.relative_path`/`name` tels quels pour l'affichage : ne pas transformer cette correction en refonte du modèle DTO;
- aucune représentation brute ne doit traverser IPC/log/artefact.

Le mode interne/synthétique `identities: None` peut dériver sa clé depuis `Path::new(node.relative_path)` puisque ses chemins de fixture sont déjà des chaînes contrôlées; le pipeline scanner REAL_ROOT doit impérativement utiliser le `PathBuf relative` brut avant projection lossy.

### Tests obligatoires

- même chemin brut + type => même PFv1;
- renommage brut => clé différente;
- type différent => clé différente;
- Windows : construire au moins deux `PathBuf` distincts avec unités UTF-16 non Unicode (dont un surrogate non apparié) qui produiraient une projection lossy ambiguë et prouver que leurs clés fallback restent différentes;
- non-Windows : si supporté par la suite, équivalent avec bytes non UTF-8;
- démontrer que le scanner continue d'exposer uniquement la projection d'affichage dans ses DTO, jamais le matériau brut de la clé.

## 4 — Invariants TASK-0036 à rejouer

Après correction, rejouer et conserver verts :

- SYSTEM = `VolumeSerialNumber + FileId`, jamais FileId seul;
- reparse/skipped/online-only : aucune ouverture SYSTEM supplémentaire;
- rename/move intra-volume : même `nodes.id`;
- déplacement de sous-arbre : IDs et parentage cohérents;
- `seen` survit au match SYSTEM;
- nouveau nœud : ID monotone jamais recyclé;
- collision artificielle : refus, index précédent intact;
- deux cerveaux sur la même racine restent isolés;
- `index_revision` avance atomiquement à chaque republication;
- recherche, détails, enfants directs, projection, Explorer restent sans régression;
- aucune clé stable, volume id, FileId ou chemin absolu dans DTO/DOM/log/artefact;
- aucune permission frontend, aucune nouvelle commande 0.1.

### Validation de la liste d'identités

Pendant l'audit, vérifie aussi que `publish_with_identity(nodes, identities, ...)` refuse proprement une liste non bijective (identité manquante, identité pour node_id inconnu, node_id dupliqué) plutôt que de pouvoir atteindre un `expect()`/panic. Si le scanner garantit déjà la bijection mais que la fonction publique interne la documente comme précondition non vérifiée, ferme cette frontière avec une validation bornée et des tests dans cette passe; ne crée pas une nouvelle architecture.

## 5 — WebView2

Réutiliser le harness TASK-0036, jamais une donnée personnelle. Rejouer au minimum rename, move, moved subtree, no-recycle, search, children, projection, reveal et confidentialité.

Ajouter un scénario **upgrade produit v3 → v4** si le harness peut le semer proprement dans son sandbox : lancer l'application sur un index v3 synthétique préconstruit et démontrer qu'il devient utilisable/migré sans lecture de la source pour la migration. Si cette preuve est plus fiable en Rust pipeline qu'en WebView2, la preuve Rust est obligatoire et le harness peut rester centré sur le comportement produit post-migration; expliquer précisément la séparation.

`Copier le chemin` : l'artefact courant a `copyStillSucceeds=false` parce que la fenêtre automatisée était cachée. Ne déclare pas ce sous-critère vert sans preuve. Soit exécuter la passe dans une fenêtre où le clipboard est disponible et obtenir succès, soit citer explicitement la preuve TASK-0035 déjà VERIFIED et démontrer que le chemin de copie n'a pas été modifié par cette correction.

0 erreur console fatale.

## 6 — Validation générale

Exécuter :

- tests Rust ciblés puis `cargo test --offline`;
- tests Windows réels de l'identité et migration produit;
- TypeScript complet;
- `pnpm check`;
- `pnpm build`;
- `cargo build --offline`;
- `cargo fmt --check` / formatage limité aux fichiers touchés;
- `cargo clippy --all-targets --offline -- -D warnings`, en séparant dette historique et nouveau diagnostic;
- `git diff --check`.

Aucune donnée personnelle. Aucun PR/merge/tag/release. `origin/main` inchangé.

## 7 — Livrables

À la fin :

- `TASK-0036` reste `IMPLEMENTED`, jamais auto-`VERIFIED`;
- mettre à jour la fiche TASK-0036 et la mémoire durable (`CURRENT_STATE`, `HANDOFF`, `NEXT_ACTION`, `VALIDATION`, `CHANGELOG_AI`, `RESULT.md`);
- `RESULT.md` doit nommer explicitement D1/D2/D3 et comment chacun a été fermé, avec tests et limites;
- `NEXT_ACTION = nouveau contrôle indépendant de TASK-0036`;
- aucune TASK-0037 précréée.
