# TASK-0042 — V1 Source Availability & Stale Index Foundation

- **Date :** 2026-09-24
- **Statut :** `READY`
- **Branche :** `build/v0.2-a26-v1-source-availability`
- **Décision :** `DEC-0040`
- **Portée :** fondation de `F-032`, cycle manuel + persistance
- **Prérequis :** `TASK-0041 = VERIFIED` (`ACTION-0068`)
- **Hors portée :** `F-030`, W-B/W-C, watcher/background polling

## But

Faire en sorte qu'une source temporairement indisponible ou remplacée soit
traitée comme **un état de source**, jamais comme une suppression massive.

Le dernier Index fiable doit rester visible, intact et réouvrable.

## A — Audit avant code

Lire en entier :

- `ACTION-0068`;
- `DEC-0040`, `DEC-0039`, `DEC-0010`;
- F-032 dans `REQUIREMENTS_BASELINE` et `FEATURE_MATRIX`;
- `scanner.rs` et ses `ScanError`;
- `map/source.rs`;
- `map/commands.rs::publish_map/open_map`;
- `map/brains.rs` / `catalog_meta`;
- `MapApp.tsx`, `lifecycle.ts`, `types.ts`.

Auditer le meilleur store existant pour cette métadonnée. Aucun nouveau fichier
de base de données.

## B — Modèle fermé

Créer un DTO/type Rust + TypeScript équivalent à :

- state:
  - UNKNOWN
  - SYNCED
  - UNAVAILABLE
  - SOURCE_CHANGED
  - SCAN_INCOMPLETE
  - APPLY_FAILED
- reason: code fermé ou null;
- observedUnixMs;
- lastSuccessfulRevision: number | null;
- lastSuccessfulUnixMs: number | null;
- persisted: bool si nécessaire pour être honnête sur une erreur d'écriture de
  la métadonnée.

Le nom exact peut varier, pas la sémantique.

Interdit dans le DTO :

- chemin;
- source_path;
- stable_key;
- FileId;
- volume serial;
- texte brut d'erreur OS.

## C — Persistance par cerveau

Persister la dernière observation dans un store existant et local.

Prouver :

- isolation par brain_id;
- redémarrage;
- absence de nouvelle DB;
- aucune modification de préférence quand l'état source change;
- aucun changement de revision/journal/corpus causé seulement par cette
  observation.

Un ancien profil sans métadonnée répond `UNKNOWN`.

## D — Transitions du vrai pipeline

Brancher la machine d'état au vrai `publish_map`.

### Succès

Après un succès effectif ou no-op de :

- BASELINE_FULL;
- IDENTITY_RESTAMP_FULL;
- INCREMENTAL;
- EXPLICIT_REBUILD_FULL;

→ `SYNCED`, avec la révision servie comme dernier succès.

### Root indisponible

Si la métadonnée de racine ne peut pas être lue pour une raison d'absence /
permission / appareil / réseau :

→ `UNAVAILABLE`.

Aucune ligne de nœud supprimée.

### Source changée

- root non directory;
- root reparse;
- `reconcile_root_identity_changed`;

→ `SOURCE_CHANGED`.

Aucune publication automatique.

### Scan incomplet

- diagnostics non vides;
- fingerprint synthétique différent avant/après;

→ `SCAN_INCOMPLETE`.

### Apply failed

Après scan complet valide, toute erreur/refus de réconciliation/application
autre que root identity changed :

→ `APPLY_FAILED`.

### Annulation

`scan_cancelled` explicite :

- retourner l'annulation;
- **ne pas** remplacer l'observation précédente.

## E — Lecture sans source

Ajouter une lecture bornée, par brain_id, de l'observation.

`map_open` doit inclure ou rendre immédiatement disponible cette observation
**sans résoudre ni stat la racine**.

Si une nouvelle commande du type `map_source_observation` est nécessaire pour
rafraîchir l'UI après un échec de `map_refresh`, elle :

- prend seulement brainId;
- ne lit jamais la source;
- n'expose aucune donnée sensible.

## F — UI

Ajouter une surface discrète mais claire pour le cerveau actif :

- SYNCED : « À jour à la dernière vérification »;
- UNAVAILABLE : « Source indisponible — dernier index conservé »;
- SOURCE_CHANGED : « Source remplacée ou différente — dernier index conservé »;
- SCAN_INCOMPLETE : « Vérification incomplète — dernier index conservé »;
- APPLY_FAILED : « Mise à jour non appliquée — dernier index conservé »;
- UNKNOWN : « Source non vérifiée ».

Respecter FR/EN du mécanisme existant; aucune couleur seule.

Après un échec d'Actualiser :

- garder la carte chargée;
- mettre le badge à jour depuis le backend;
- ne pas demander à l'utilisateur de rouvrir la carte;
- aucune reconstruction automatique.

## G — Tests Rust obligatoires

Au minimum :

1. ancien Index sans observation → UNKNOWN;
2. baseline réussie → SYNCED;
3. incremental no-op → SYNCED, même revision, aucun event;
4. racine renommée hors chemin → UNAVAILABLE;
5. racine absente → UNAVAILABLE;
6. root devenu fichier → SOURCE_CHANGED;
7. root reparse → SOURCE_CHANGED;
8. delete/recreate même chemin avec nouvelle identité → SOURCE_CHANGED;
9. scan partiel injecté → SCAN_INCOMPLETE;
10. fingerprint drift synthétique → SCAN_INCOMPLETE;
11. erreur SQL pendant U-B → APPLY_FAILED + rollback canonique exact;
12. annulation → état précédent inchangé;
13. récupération sans changement → SYNCED, aucun faux event;
14. récupération avec vrais changements → seulement ces changements au journal;
15. indisponibilité ne crée **aucun DELETED**;
16. index_id/revision/corpus/journal/seen-state inchangés pendant indisponibilité;
17. préférences UI/catalogue inchangées;
18. deux cerveaux isolés;
19. état persiste après fermeture/réouverture;
20. `map_open` ne lit/stat jamais la source;
21. aucune fuite de path/stable key/FileId/volume/message OS brut;
22. aucune commande watcher ajoutée.

## H — Test de sûreté central F-032

Créer une preuve forte :

1. Indexer un arbre synthétique;
2. capturer digest logique, revision, journal, seen-state, préférences;
3. rendre la **racine entière inaccessible/absente**;
4. appeler le vrai `refresh_map`;
5. constater `UNAVAILABLE`;
6. comparer le corpus/journal/revision/seen/preferences : identiques;
7. vérifier 0 événement de suppression;
8. restaurer exactement la même racine;
9. Actualiser → SYNCED;
10. aucun événement inventé si rien n'a changé.

## I — WebView2 Windows réel

Obligatoire car l'UX/lifecycle change.

Sur un REAL_ROOT synthétique généré par la preuve :

1. baseline et SYNCED;
2. déplacer la racine hors de son chemin **depuis le harnais externe**;
3. cliquer Actualiser;
4. carte reste affichée;
5. badge UNAVAILABLE visible;
6. résumé/journal/revision inchangés;
7. redémarrage réel pendant que la racine reste absente;
8. Ouvrir affiche encore la carte + dernière observation UNAVAILABLE **sans
   accès source**;
9. remettre le même dossier à son chemin;
10. Actualiser → SYNCED, no-op, même revision;
11. 0 fuite;
12. 0 erreur console fatale.

Les états SOURCE_CHANGED / SCAN_INCOMPLETE / APPLY_FAILED peuvent être prouvés
au niveau Rust s'ils sont dangereux ou artificiels à provoquer dans le host.

## J — Gouvernance

- `TASK-0042 = IMPLEMENTED`, jamais auto-`VERIFIED`;
- **F-032 ne doit pas être déclaré entièrement VERIFIED** tant que F-030 ne
  consomme pas ce contrat automatiquement;
- aucune TASK-0043;
- aucun watcher/polling;
- aucun W-B/W-C;
- pas de PR/merge/tag/release;
- docs durables et matrice mises à jour honnêtement;
- `NEXT_ACTION = contrôle indépendant de TASK-0042`;
- push uniquement sur la branche, arbre propre.

## K — Validation

- tests ciblés;
- `cargo test --offline`;
- `pnpm test`;
- `pnpm check`;
- `pnpm build`;
- `cargo build --offline`;
- Tauri debug + WebView2;
- Clippy dette historique séparée;
- `git diff --check`;
- `scripts/audit-public-readiness.ps1 -AllowRemotes`.

Aucun benchmark F-031 requis si `incremental.rs` n'est pas modifié.
