# TASK-0055 — V1 Physical Object Identity / F-046 Closure

- **Date :** 2026-10-07
- **Statut :** `READY`
- **Branche :** `build/v0.2-a39-v1-physical-identity-closure`
- **Base :** `393ac6d190295d979b58c9a03cc4712391d93335`
- **Sélection :** ACTION-0102
- **Décision :** DEC-0052
- **Portée :** F-046 uniquement
- **Exécuteur prévu :** Claude Code
- **F-050/F-051/P-01/P-02/P-03 :** fermés, hors portée

## 1. Résultat unique attendu

Fermer F-046 en réutilisant :

- l'identité SYSTEM persistante de TASK-0036;
- la frontière Cloud Files de DEC-0035;
- SHA-256 de TASK-0023;
- l'explorateur exact de TASK-0026;
- le moteur de relations existant.

La tranche corrige le cas où plusieurs chemins légitimes partagent une identité
SYSTEM et expose une classification sûre. Elle ne construit aucun moteur de
similarité.

## 2. Audit reuse-first avant code

Lire et cartographier avant modification :

- `identity.rs`;
- `scanner.rs` / `scope.rs`;
- `index.rs::publish`, migrations et `apply_update_batch`;
- `reconcile.rs`;
- watcher W-B/W-C;
- rebase/rebuild;
- `content_signals.rs` exact duplicate;
- `ExactDuplicateExplorer.tsx`;
- TASK-0036/ACTION-0060;
- TASK-0023/ACTION-0039;
- TASK-0026/ACTION-0043.

Produire le tableau :
- EXISTE / RÉUTILISER;
- ADAPTER;
- MANQUANT.

Aucune nouvelle dépendance sans nécessité démontrée.

## 3. Migration schema 7

Implémenter DEC-0052 C dans l'Index actuel.

- version 6 → 7;
- index stable_key non unique;
- aucune ligne existante réécrite;
- stamp final atomique;
- dispatcher versionné;
- `MAP_SCHEMA_VERSION` cohérent;
- M-B complet;
- migration fraîche + v6 réel + rollback injecté;
- schéma futur/refus historique inchangés.

## 4. Remap SYSTEM group-aware

Remplacer l'hypothèse HashMap `stable_key -> id` par une logique de groupe.

Invariants :

- groupe 1↔1 : comportement historique inchangé;
- groupe SYSTEM multiple : chemin exact d'abord;
- jamais d'appariement ambigu d'alias;
- IDs neufs monotones pour nouvelles occurrences;
- PATH_FALLBACK dupliqué reste erreur;
- bijection node_id / identité d'entrée toujours contrôlée.

Ajouter des tests discriminants qui échouent sur le code actuel.

## 5. Tous les chemins de mutation

Auditer et corriger si nécessaire :

- full publish;
- refresh incrémental;
- watcher ciblé;
- W-C;
- exclusions/rebase;
- rebuild.

Une règle SYSTEM différente entre scan complet et incrémental est un bloqueur.

## 6. Backend de classification physique

Réutiliser les colonnes existantes `stable_key` /
`identity_provenance`.

Créer une primitive Rust interne sûre qui, pour un nœud/path d'un cerveau,
retourne seulement :

- `PROVEN_SHARED` + occurrenceCount >= 2;
- `PROVEN_SINGLE` + occurrenceCount = 1;
- `UNKNOWN` + count null.

Le compte est limité au cerveau courant.

La primitive ne retourne jamais la clé brute.

## 7. Intégration ExactDuplicateExplorer

Étendre le DTO de membre de groupe SHA-256 avec la classification sûre.

UI FR/EN :

- `PROVEN_SHARED` : « même objet physique — N chemins dans ce cerveau »;
- `PROVEN_SINGLE` : identité OS disponible, aucune autre occurrence du même
  objet dans ce cerveau;
- `UNKNOWN` : identité physique non prouvable.

Ajouter une explication compacte distinguant :

1. objet physique;
2. contenu identique;
3. copie probable — non inférée ici;
4. nom similaire — non inféré ici;
5. relation logique — indépendante.

Aucun FileId/volume/clé/empreinte machine dans le DTO ou le DOM.

## 8. Scénario Windows réel obligatoire

Dans une racine temporaire créée par le harness :

- créer `a.bin`;
- créer `b-hardlink.bin` avec un vrai hard link vers A;
- créer `c-copy.bin` par copie des octets;
- créer deux fichiers vides distincts.

Prouver :

- scan/index avec A+B réussit;
- A et B = deux nodeIds distincts;
- A/B = `PROVEN_SHARED`, même groupe physique interne;
- C = même SHA mais `PROVEN_SINGLE`/objet distinct;
- les deux vides = même SHA, objets distincts;
- aucune relation logique n'est créée automatiquement à cause du hash vide,
  du hard link ou de la copie;
- UI ne confond aucune catégorie;
- refresh puis redémarrage préservent le résultat.

Si l'API `std::fs::hard_link` suffit, la réutiliser; ne pas ajouter une
bibliothèque pour créer le hard link.

## 9. Régressions F-004

Rejouer explicitement :

- fichier SYSTEM simple renommé => même nodeId;
- fichier SYSTEM simple déplacé intra-volume => même nodeId;
- ajout d'un hard link : chemin original garde son nodeId via match exact;
- le nouveau lien obtient un id neuf;
- deux liens inchangés gardent chacun leur id;
- alias ambigu renommé n'est pas corrélé par heuristique.

Journal/seen ne doivent pas être attribués au mauvais alias.

## 10. Cloud / non-Windows / erreurs

- Cloud placeholder / ambigu : UNKNOWN;
- reparse/symlink : UNKNOWN / politique existante;
- identité Win32 indisponible : UNKNOWN;
- non-Windows : UNKNOWN;
- aucune erreur d'identité ne doit forcer une lecture/hydratation.

## 11. Falsifications minimales

Prouver effectivement que les gardes échouent si :

1. un doublon PATH_FALLBACK est accepté;
2. deux SYSTEM partagés sont rejetés comme collision;
3. un alias ambigu est apparié arbitrairement;
4. une copie byte-for-byte est dite « même objet physique »;
5. UNKNOWN devient PROVEN_SINGLE;
6. une clé SYSTEM brute fuit dans un DTO;
7. un FileId/volume apparaît dans DOM/log/artefact;
8. deux fichiers vides créent une relation logique;
9. la migration v6→v7 échoue après DROP INDEX et laisse un demi-schéma;
10. refresh/watcher réintroduit une collision de hard link.

## 12. Preuves / validation

Minimum :

- tests Rust ciblés identité/migration/index/reconcile;
- suite `cargo test --lib`;
- tests Windows réels `#[cfg(windows)]`;
- frontend ciblé + suite pertinente;
- `pnpm check`;
- `pnpm build`;
- Tauri debug;
- WebView2 Windows réel avec hardlink/copy/empty;
- axe sur l'explorateur;
- source fingerprint avant/après la **session FileTopo** (les créations de
  fixture se font avant le baseline);
- `git diff --check`;
- public-readiness;
- artefacts liés au HEAD testé.

Distinguer exécution locale, CI éventuelle et NOT_TESTED.

## 13. Gouvernance

À la fin :

- TASK-0055 = IMPLEMENTED / candidate seulement;
- F-046 = IMPLEMENTED / candidate seulement;
- aucune nouvelle fonction;
- aucun TASK-0056;
- NEXT_ACTION = contrôle indépendant;
- RESULT/HANDOFF/CURRENT_STATE/VALIDATION complets;
- commit + push;
- arbre propre.
