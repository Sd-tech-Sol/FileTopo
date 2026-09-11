# ACTION-0057 — Contrôle indépendant de TASK-0036

- Date : 2026-09-11
- Statut : `OPEN / RECONTROL REQUIRED`
- Tâche : `TASK-0036 — V1 Stable Identity Foundation`
- Branche contrôlée : `build/v0.2-a20-v1-stable-identity`
- Livraison fonctionnelle contrôlée : `e603e9dfc75d643388ac67babfd6baced8c32df6`
- Rapport exécuteur : `a3d0790406164c4a2158c31325bb89d678603d16`
- Exécuteur : Claude Code / Sonnet 5
- Autorité du verdict : orchestrateur ChatGPT indépendant
- Verdict : **TASK-0036 reste IMPLEMENTED; pas VERIFIED**

## Ce qui est confirmé

Le cœur I-E est réellement implémenté : `SYSTEM = VolumeSerialNumber + FileId`, repli versionné, remap vers `nodes.id` canoniques, compteur monotone sans recyclage, `seen` porté par identité reconnue, aucune clé stable dans les DTO frontend. Le code Windows reprend bien la technique du spike B3 et la dépendance `windows-sys = 0.61.2` est ciblée Windows. Les tests et le rejeu WebView2 apportent une preuve utile des renommages/déplacements intra-volume sur une base fraîche.

## Défaut bloquant D1 — migration 3 → 4 inaccessible par le cycle produit

`Index::open()` sait exécuter `migrate_to_stable_identity()`, et le test `migrating_from_schema_three...` appelle précisément ce constructeur. Mais un cerveau déjà présent ne passe pas par ce chemin :

1. `publish_map()` voit que la base existe et appelle `check_publishable()` avant de lire la source;
2. `check_publishable()` appelle `open_for_brain()`;
3. `open_for_brain()` appelle `BrainIndex::open_existing()`;
4. `BrainIndex::open_existing()` refuse tout `PRAGMA user_version != MAP_SCHEMA_VERSION`, maintenant `4`.

Un index canonique v3 produit par la version précédente est donc `IndexIncompatible` avant que la migration 3 → 4 puisse s'exécuter. `map_open`, `refresh` et `rebuild` ne fournissent actuellement aucun chemin produit qui transforme ce v3 en v4. Le test de migration prouve une primitive interne, pas l'upgrade d'un cerveau existant.

**Conséquence :** le contrat TASK-0036 C/G1 (« migration du schéma précédent avec données existantes et index ouvrable ») n'est pas rempli dans le produit.

## Défaut bloquant D2 — migration 3 → 4 non transactionnelle

`migrate_to_stable_identity()` exécute séparément les `ALTER TABLE`, le `CREATE UNIQUE INDEX` et l'initialisation de `next_node_id`; `initialize()` écrit ensuite `PRAGMA user_version=4` / `schema_version=4` dans un autre `execute_batch`. Il n'y a pas de transaction enveloppant la migration 3 → 4.

Une erreur entre deux étapes peut donc laisser une base partiellement élargie sous version 3. L'idempotence facilite une reprise ultérieure, mais ne satisfait pas l'exigence explicite de TASK-0036 C : migration **transactionnelle** sans index partiellement crédible.

**Correction exigée :** la transition v3 → v4 doit être atomique. En cas d'échec injecté, le schéma, les données, `seen`, `index_id`, `index_revision` et `user_version` v3 doivent rester intacts.

## Défaut bloquant D3 — PATH_FALLBACK hashé depuis une projection lossy, pas le chemin brut

TASK-0036 B exige une empreinte du **chemin relatif brut + type**. Or le scanner construit `relative_display = display_relative(&relative)`, où `display_relative()` utilise `Path::to_string_lossy()`, puis passe cette `String` à `compute_identity()` / `path_fallback_key()`.

Le dépôt possède déjà `path_codec::encode_path()`, précisément parce qu'un chemin Windows peut contenir des unités UTF-16 non représentables en UTF-8 et que `to_string_lossy()` peut fusionner deux chemins distincts vers la même projection avec U+FFFD.

Cette faiblesse touche exactement les cas qui retombent sur `PATH_FALLBACK` (reparse/skipped/online-only, plateforme sans SYSTEM). Deux chemins bruts différents peuvent donc produire la même entrée de hash avant même FNV, entraînant une fausse collision/refus ou une identité fallback non conforme à DEC-0009.

**Correction exigée :** calculer le fallback depuis la représentation OS brute du `Path` relatif, en réutilisant `path_codec::encode_path()` ou une primitive équivalente déjà approuvée; conserver la chaîne lossy uniquement comme projection d'affichage DTO. Ajouter un test Windows avec surrogate non apparié (et non-Windows bytes non UTF-8 si la suite le permet) démontrant que deux chemins bruts distincts ne sont pas confondus.

## Réserve R1 — preuve WebView2 Copier le chemin

L'artefact TASK-0036 note `copyStillSucceeds: false` avec `clipboard_write_failed` dans la fenêtre d'automatisation cachée. Ce point n'est pas la cause du rejet de TASK-0036 : TASK-0035 a déjà vérifié cette fonction et le code de copie n'est pas le cœur modifié ici. La passe corrective doit néanmoins éviter de présenter ce sous-critère comme vert : soit rejouer dans une fenêtre où le presse-papiers est disponible, soit documenter explicitement la preuve antérieure TASK-0035 et l'absence de modification du chemin de copie.

## Recontrôle exigé

La passe corrective reste sur `build/v0.2-a20-v1-stable-identity` et doit au minimum prouver :

- upgrade produit réel d'un index v3 existant vers v4 sans lecture de source pour la migration elle-même, puis ouverture/republication normale;
- source/brain mismatch et schéma futur/inconnu refusés avant toute migration destructive ou lecture de source;
- migration v3 → v4 atomique avec échec injecté et rollback intégral;
- fallback basé sur le chemin OS brut, pas `to_string_lossy()`;
- rename/move SYSTEM, remap parent, seen, no-recycle, isolation, invalidation de curseur et confidentialité toujours verts;
- suites Rust/TS/build/check et WebView2 de non-régression;
- aucune TASK-0037, aucun watcher/journal/incrémental.

## Verdict

**TASK-0036 = IMPLEMENTED / RECONTROL REQUIRED.** Aucun passage à `VERIFIED` tant que D1, D2 et D3 ne sont pas corrigés et recontrôlés indépendamment.
