# NEXT_PROMPT — TASK-0042 — V1 Source Availability & Stale Index Foundation

**TARGET_AGENT:** CLAUDE CODE  
**RECOMMENDED_MODEL:** Sonnet 5, high effort  
**STATUS:** READY  
**BRANCH:** `build/v0.2-a26-v1-source-availability`

## /goal

Implémenter intégralement
`docs/tasks/TASK-0042-v1-source-availability.md` selon
`docs/decisions/DEC-0040-source-observation-stale-index.md`.

Le but est de rendre une source absente/inaccessible **explicite sans jamais
la convertir en suppressions**. Le dernier Index fiable reste servi.

Cette tranche prépare F-032 mais ne construit **aucun watcher**.

## 0 — Préconditions

1. Appliquer `AGENTS.md` et `CLAUDE.md`.
2. Basculer explicitement sur
   `build/v0.2-a26-v1-source-availability`.
3. `git fetch origin`.
4. Synchroniser uniquement en fast-forward avec
   `origin/build/v0.2-a26-v1-source-availability`.
5. Vérifier arbre propre.
6. Vérifier que HEAD contient :
   - `ACTION-0068` — TASK-0041 VERIFIED;
   - `DEC-0040`;
   - `TASK-0042`.
7. Lire en entier `DEC-0040` puis `TASK-0042` avant modification.

STOP/BLOCKED si le dépôt contredit ces préconditions.

## 1 — Audit du stockage avant code

Auditer en priorité :

- `catalog_meta` / catalogue cerveau;
- `schema_meta` de l'Index;
- les invariants no-op de TASK-0041;
- les chemins de migration/rebuild.

Choisir le store existant qui préserve le mieux :

- persistance par cerveau;
- aucun nouveau fichier DB;
- aucune dépendance de validité du corpus à cette métadonnée;
- no-op canonique sans revision/event;
- lecture par `Ouvrir` sans source.

Dans `.orchestrator/RESULT.md`, expliquer le choix et les conséquences
d'atomicité. Ne pas cacher un éventuel compromis.

## 2 — Machine d'état fermée

Implémenter exactement les états de DEC-0040 :

- UNKNOWN
- SYNCED
- UNAVAILABLE
- SOURCE_CHANGED
- SCAN_INCOMPLETE
- APPLY_FAILED

Les raisons exposées sont des codes fermés.

Jamais de :

- chemin;
- stable key;
- FileId;
- volume serial;
- message OS brut.

L'état signifie **dernière observation**, pas disponibilité temps réel.

## 3 — Transitions du vrai pipeline

Brancher le vrai `publish_map`.

### Succès
Tout succès BASELINE_FULL / RESTAMP / INCREMENTAL / REBUILD → SYNCED.

### UNAVAILABLE
Erreur de métadonnée racine indiquant qu'elle ne peut pas être observée.

### SOURCE_CHANGED
- root non directory;
- root reparse;
- root stable identity différente.

### SCAN_INCOMPLETE
- diagnostics;
- fingerprint drift.

### APPLY_FAILED
Scan valide puis réconciliation/application refusée ou erreur.

### Annulation
Ne touche pas l'observation précédente.

Aucun des quatre états d'échec ne doit produire un événement du journal ou
avancer la révision.

## 4 — Classification d'erreurs

Ne pars pas du texte `Display` des erreurs.

Préserver ou introduire une classification structurée suffisamment haut dans la
pile pour distinguer les états ci-dessus.

Sur Windows, les erreurs réelles de lecteur/réseau peuvent varier. Une erreur
de métadonnée de **racine** non classable mais empêchant totalement
l'observation peut tomber dans une raison fermée générique
`ROOT_METADATA_UNAVAILABLE`; ne pas exposer le code/message OS brut.

## 5 — Lecture sans toucher la source

`map_open` reste strictement source-free.

Ajouter l'observation au report ou une commande read-only par brainId si
nécessaire pour l'UI après un refresh en erreur.

Une telle commande :

- ouvre seulement l'état local FileTopo;
- ne résout pas la racine;
- ne fait aucun `metadata/stat`;
- est bornée et sans path.

## 6 — UI : garder la carte

Après un échec d'Actualiser :

- ne pas vider `loaded`;
- ne pas remplacer la projection par une vue vide;
- relire uniquement l'observation locale;
- afficher le badge/message prévu;
- garder les actions locales sur l'Index disponibles lorsque c'est sûr.

Aucune couleur seule.

Respecter FR/EN : ne pas ajouter des libellés uniquement français.

## 7 — Preuve centrale

La preuve prioritaire est le cycle :

`SYNCED -> racine absente -> UNAVAILABLE -> restart -> Ouvrir sans source -> restauration -> SYNCED`.

Vérifier à chaque étape :

- index_id;
- revision;
- corpus;
- journal;
- seen state;
- préférences;
- projection;
- absence de DELETED inventés.

La restauration du **même dossier** déplacé puis remis doit produire un no-op
si aucun contenu n'a changé.

## 8 — Refus d'une racine remplacée

Prouver séparément qu'un dossier supprimé puis recréé au même chemin ne devient
pas une reprise silencieuse :

- état SOURCE_CHANGED;
- ancien Index servi;
- aucune suppression/création de masse;
- Reconstruire reste le geste explicite si l'utilisateur veut accepter la
  nouvelle racine.

## 9 — Non-régressions TASK-0041

Rejouer les preuves clés :

- Actualiser estampé = INCREMENTAL;
- Reconstruire = full explicite;
- no-op revision inchangée;
- guard anti-full;
- journal/seen/filters.

Si `incremental.rs` est modifié, STOP et justifier avant de continuer : cette
tranche ne devrait normalement pas toucher le noyau U-B.

## 10 — WebView2 réel

Rejeu obligatoire avec REAL_ROOT synthétique externe :

- baseline;
- source déplacée hors chemin;
- Actualiser échoue proprement;
- carte reste;
- badge UNAVAILABLE;
- restart réel source toujours absente;
- Ouvrir sans accès source, carte + observation persistées;
- source remise;
- Actualiser SYNCED/no-op;
- 0 fuite;
- 0 erreur fatale.

## 11 — Gouvernance

À la fin :

- TASK-0042 = `IMPLEMENTED`, jamais `VERIFIED`;
- F-032 reste **partielle/fondation**, pas entièrement VERIFIED;
- aucune TASK-0043;
- aucun watcher/polling;
- aucun W-B/W-C;
- pas de PR/merge/tag/release;
- docs durables + FEATURE_MATRIX honnêtes;
- `.orchestrator/RESULT.md` complet;
- `NEXT_ACTION` = contrôle indépendant de TASK-0042;
- push uniquement sur la branche;
- arbre propre.

## 12 — Validation

Exécuter la fiche complète :

- `cargo test --offline`;
- `pnpm test`;
- `pnpm check`;
- `pnpm build`;
- `cargo build --offline`;
- Tauri debug + WebView2;
- Clippy dette historique distinguée;
- `git diff --check`;
- `scripts/audit-public-readiness.ps1 -AllowRemotes`.
