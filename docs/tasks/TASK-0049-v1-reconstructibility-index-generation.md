# TASK-0049 — V1 Reconstructibility & Index-Generation Safety

- **Date :** 2026-09-26
- **Statut :** `IMPLEMENTED` — contrôle indépendant requis
- **Branche :** `build/v0.2-a33-v1-reconstructibility-closure`
- **Décision :** `DEC-0047`
- **Portée :** `F-006`
- **Exécuteur prévu :** Codex
- **Prérequis :** ACTION-0082, ACTION-0083

## But

Fermer F-006 sur le runtime courant en prouvant qu'une perte complète du
fichier d'Index peut être reconstruite depuis la source + configuration
brain-scoped conservée, sans confondre les numéros internes de nœuds avec
l'identité logique, et sans laisser un resume ancien se recoller au mauvais
nœud d'une nouvelle génération.

## A — audit avant code obligatoire

Avant toute modification :

1. lire DEC-0047, ACTION-0083 et TASK-0031;
2. tracer :
   - création d'un Index frais;
   - rebuild d'un Index existant;
   - allocation `next_node_id`;
   - calcul de `reconstructible_digest`;
   - journal + seen/unseen;
   - save/restore du resume;
   - relations, content-signals et autres stores hors Index;
3. chercher tous les consommateurs de `reconstructible_digest` et
   `nonReconstructible`;
4. écrire dans RESULT :
   - ce qui est réellement reconstructible;
   - ce qui ne l'est pas;
   - pourquoi le resume actuel est ou n'est pas sûr inter-génération;
   - mécanisme minimal choisi.

Ne commence pas par une nouvelle abstraction d'identité.

## B — génération d'Index

Réutiliser uniquement l'`index_id` existant.

Aucun nouveau `generation_id`, UUID parallèle ou table.

Le backend doit pouvoir savoir à quelle génération un resume node-scoped a été
enregistré.

## C — resume génération-safe

Corriger le record persistant de resume pour que `focusNodeId` et
`selectedNodeId` ne puissent jamais être appliqués aveuglément à une autre
génération.

Contraintes :

- même `index_id` : comportement actuel;
- `index_id` différent : refs node-scoped corrigées/effacées avant toute
  résolution par numéro;
- les préférences indépendantes des IDs sont conservées si valides;
- record legacy sans génération : politique sûre explicite; ne jamais prétendre
  que l'ancien nodeId est prouvé;
- le record corrigé est persisté pour éviter de refaire la correction;
- frontend non autoritaire : ne lui fais pas fournir un indexId que le backend
  peut lire lui-même.

Tester un cas où l'ancien numéro existe encore mais désigne réellement un autre
chemin dans la nouvelle génération.

## D — équivalence reconstructible

Définir une comparaison/digest **inter-génération** indépendante de
l'allocation numérique.

Comparer au minimum :

- chemins relatifs;
- parenté logique par chemin/identité, pas parent_id numérique;
- nom;
- kind;
- profondeur;
- taille et métadonnées pertinentes;
- child_count;
- diagnostics;
- stable identity/provenance si cette information fait partie du contrat
  reconstructible courant.

Si `reconstructible_digest()` est modifié, prouver que ses consommateurs ne
sont pas cassés. Si son ancienne sémantique doit rester pour compatibilité,
introduire le plus petit digest/comparateur distinct clairement nommé.

Aucun whole-graph DTO vers le frontend : les comparaisons de preuve peuvent
rester backend/harness.

## E — inventaire non reconstructible

Remplacer/corriger l'inventaire historique `built_unix_ms` seul.

L'inventaire final doit classifier sur faits le runtime actuel et inclure, si
confirmés :

- timestamp de build;
- index_id;
- revision;
- journal;
- seen/unseen acknowledgements/watermark;
- next_node_id;
- allocation numérique node_id;
- legacy nodes.seen selon usage réel.

L'ordre doit être déterministe. Ajouter des tests exacts.

Ne pas inclure dans cette liste un store hors Index qui survit réellement.

## F — nouvelle baseline, jamais un faux passé

Après suppression complète puis reconstruction :

- nouveau `index_id`;
- nouveau journal selon la baseline normale;
- aucun événement artificiel pour recréer l'ancien historique;
- aucun faux NEW/UNSEEN hérité;
- exclusion policy appliquée comme avant;
- catalogue/relations/content-signals/décisions restent intacts.

## G — test Rust déterministe avec IDs réattribués

Construire un vrai scénario qui force la divergence :

1. source générée avec au moins `a,b,c,d` dans un ordre connu;
2. premier Index;
3. supprimer `a` dans la **source de test** puis appliquer le changement :
   les IDs de b/c/d restent ceux de l'ancienne génération;
4. placer focus/sélection resume sur un nœud survivant;
5. vérifier que dans un Index frais du corpus courant, le même numéro ancien
   correspond à un autre nœud ou n'est plus l'identité sélectionnée;
6. reconstruire;
7. prouver que le resume ne se recolle pas au mauvais nœud;
8. prouver l'équivalence logique du corpus/hiérarchie.

La mutation de source est faite par le test/harness, jamais par FileTopo.

## H — preuve WebView2 réelle

Publier `docs/performance/runs/TASK-0049-webview2.json`.

Avec une racine REAL_ROOT générée et aucune donnée personnelle :

### Processus 1

- créer/ouvrir le cerveau;
- policy d'exclusion non vide;
- construire l'Index;
- créer un historique avec création/suppression/modification puis laisser le
  watcher/Actualiser converger;
- créer au moins un événement non vu puis en marquer un vu;
- enregistrer un resume focus/sélection node-scoped;
- capturer :
  - index_id;
  - revision;
  - inventaire/digest logique;
  - journal/seen state;
  - policy;
  - hashes des stores hors Index;
  - SHA source.

Fermer réellement.

### Entre processus, hors produit

- supprimer **seulement** l'Index du cerveau et ses sidecars;
- ne toucher ni catalogue, ni relations, ni content-signals, ni source.

### Processus 2

- relancer;
- `Ouvrir` => NotBuilt;
- reconstruire avec le pipeline produit existant, de préférence par le geste
  UI Reconstruire si compatible avec ce cas;
- prouver :
  - nouveau index_id;
  - corpus/hiérarchie logiquement équivalents au pré-delete courant;
  - node IDs effectivement différents sur le scénario préparé;
  - resume node-scoped corrigé, jamais attaché au mauvais chemin;
  - filtre/view/details non-node-scoped conservés selon contrat;
  - policy identique;
  - journal ancien non recréé;
  - inventaire nonReconstructible exact;
  - stores hors Index inchangés;
  - SHA source inchangé par la reconstruction.

### Processus 3

Fermer/relauncher encore une fois et vérifier que le resume corrigé est
persisté et stable sur la nouvelle génération.

## I — rollback et source absente

Ne régresse pas TASK-0031/F-032 :

- source absente après perte d'Index => reconstruction refuse honnêtement;
- aucune base/catalogue externe n'est effacée;
- si un Index existe, un rebuild échoué conserve le dernier fiable;
- aucun mécanisme de reconstruction automatique silencieuse dans `map_open`.

## J — falsifications obligatoires

Au moins :

1. restore resume par simple `exists(node_id)` sans génération -> le test doit
   détecter la sélection du mauvais chemin;
2. comparer parent_id numérique dans le digest inter-génération -> échec lorsque
   les IDs divergent;
3. omettre journal de `nonReconstructible` -> test exact casse;
4. recopier l'ancien index_id dans l'Index frais -> preuve casse;
5. synthétiser des CREATED au premier build de la nouvelle génération -> test
   journal casse;
6. ignorer la policy conservée -> corpus logique diffère;
7. supprimer/toucher le catalogue avec l'Index -> hash externe casse;
8. même génération normale qui efface inutilement le resume -> test casse.

Aucun sabotage final.

## K — validations

- Rust ciblé reconstructibilité/resume;
- tests lifecycle/resume/journal/exclusion concernés;
- suite Rust complète offline;
- suite TypeScript complète;
- pnpm check/build;
- cargo build offline;
- Tauri debug;
- vrai WebView2 multi-processus;
- Clippy dette historique séparée;
- git diff --check;
- audit public.

## L — frontières

- aucun bouton/commande produit de suppression d'Index;
- aucune nouvelle DB/table pour la génération;
- aucun glob/ignore nouveau;
- aucune refonte du stable identity;
- aucune migration générale hors besoin resume prouvé;
- F-014 et P-19 hors tranche, sauf le strict correctif génération-safe du
  resume requis par F-006.

## M — clôture

À la fin :

- TASK-0049 = IMPLEMENTED, jamais auto-VERIFIED;
- F-006 = IMPLEMENTED, jamais auto-VERIFIED;
- NEXT_ACTION = contrôle indépendant TASK-0049;
- aucune TASK-0050;
- commit + push sur cette branche;
- arbre propre;
- RESULT complet.

## N — résultat d'exécution — 2026-09-26

### Livraison

- L'enveloppe privée de reprise passe en v2 et porte l'`index_id` lu par le
  backend. Le DTO frontend reste limité aux cinq champs historiques.
- Une reprise legacy, non liée ou issue d'une autre génération efface
  `focusNodeId` et `selectedNodeId` avant toute résolution numérique,
  conserve les préférences indépendantes des nœuds et persiste la correction
  sous la génération courante. Une reprise de même génération reste inchangée.
- `reconstructible_digest()` compare désormais l'identité logique
  inter-génération : chemins et parenté par chemins, métadonnées
  reconstructibles, identité stable et provenance; aucun `node_id`,
  `parent_id`, revision ou géométrie.
- L'inventaire fermé et déterministe comprend exactement :
  `built_unix_ms`, `index_id`, `index_revision`, `change_events`,
  `seen_change_events`, `seen_through_event_id`, `next_node_id`,
  `node_id_allocation`, `nodes.seen_legacy`.

### Preuves

- Test Rust déterministe : après retrait de `a`, l'ancien `b=3` devient
  `b=2` dans un Index frais et l'ancien id 3 nomme `c`; les digests
  logiques restent égaux et aucune reprise ne sélectionne `c`.
- Preuve Tauri / vrai WebView2 en trois processus :
  `docs/performance/runs/TASK-0049-webview2.json`. Elle constate un nouvel
  `index_id`, la correction focus/sélection persistée, zéro événement et zéro
  unseen dans la nouvelle baseline, la policy conservée, les stores externes
  inchangés et le SHA-256 source inchangé.
- Les huit sabotages de §J ont chacun cassé la garde attendue puis ont été
  restaurés. Aucun sabotage final.

### Validations et limites

- Rust ciblé reprise/reconstructibilité : 27 PASS; suite Rust finale :
  770 PASS, 6 ignorés, 0 échec.
- Frontend ciblé reprise : 41 PASS; suite TypeScript : 625 PASS.
- `pnpm check`, `pnpm build`, `cargo build --offline`, Tauri debug,
  WebView2 trois processus, `git diff --check` et audit public : PASS.
- Clippy reste à la dette historique 13 diagnostics lib / 22 lib-test, sans
  diagnostic sur les lignes TASK-0049.
- Portée de la preuve réelle : Windows/NTFS local, fermetures normales. Le
  rebuild passe par la commande produit existante via IPC, pas par un clic
  physique. Aucun crash recovery ni comportement inter-volume revendiqué.

**Verdict exécuteur : TASK-0049 et F-006 sont `IMPLEMENTED`, jamais
auto-`VERIFIED`. F-014 et P-19 restent inchangés.**
