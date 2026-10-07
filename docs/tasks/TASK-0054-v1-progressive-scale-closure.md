# TASK-0054 — V1 Progressive Scale & Exact Aggregate Global Closure / F-050 + F-051

- **Date :** 2026-10-07
- **Statut :** `READY`
- **Branche :** `build/v0.2-a38-v1-scale-closure`
- **Base :** `befd86a73216131eae9675961a758c1df73bffa1`
- **Sélection :** `ACTION-0100`
- **Portée :** `F-050`, `F-051`; préparation de fermeture `P-01/P-02/P-03`
- **Exécuteur prévu :** Claude Code
- **Décisions à réutiliser :** `DEC-0029`, `DEC-0030`, `DEC-0031`
- **Nouvelle décision d'architecture :** aucune par défaut

## 1. Résultat unique attendu

Fermer le manque entre la tranche synthétique VERIFIED de `TASK-0030` et le
contrat produit global de F-050/F-051, sur le runtime V1 actuel.

Ce n'est **pas** une réécriture du materializer. Le chemin normal est :

1. auditer l'existant;
2. construire les preuves manquantes en réutilisant les harness existants;
3. ne corriger du produit que si une falsification démontre un défaut concret;
4. laisser `F-050/F-051 = IMPLEMENTED / candidate`, jamais auto-VERIFIED.

## 2. Invariants d'architecture

Doivent rester vrais :

- un seul Index canonique par cerveau;
- aucune table/copie `map_nodes` runtime;
- aucun whole-graph DTO vers le frontend;
- layout seulement sur la vue matérialisée;
- collections IPC bornées;
- aucun chemin absolu envoyé au WebView;
- aucun contenu de document lu;
- source en lecture seule;
- aucun nouveau renderer;
- aucune dépendance cloud/LLM/MCP;
- aucun besoin de GPU puissant/WebGL pour le fonctionnement de base.

## 3. Audit reuse-first obligatoire avant code

Inspecter et documenter ce qui est réutilisé, adapté ou réellement manquant :

- `src-tauri/src/index.rs`;
- materializer/projection courant sous `src-tauri/src/map/`;
- `map_view`, `map_branch_view`, `children_page`, recherche;
- `ViewAggregate`, counts/cursors;
- `MapApp.tsx`, `MapView.tsx`, agrégats et navigation;
- `TASK-0028` + ses scripts/artefacts;
- `TASK-0030` + ses scripts/artefacts;
- `TASK-0032` REAL_ROOT;
- `TASK-0047` accessibilité si réutilisée;
- `TASK-0052` branch focus/collapse;
- derniers harness WebView2/CDP/axe.

Classer chaque besoin en :
- existe déjà / réutilisable;
- à adapter / intégrer;
- à développer.

Si l'existant couvre le critère, ajouter une preuve discriminante au lieu de
dupliquer le code.

## 4. F50-1 — échelle structurelle 10k / 100k / 1M

Sur le **cœur produit courant**, créer des corpus synthétiques indexés de :

- 10 000;
- 100 000;
- 1 000 000.

Ne pas fabriquer 1M fichiers physiques.

Pour chaque taille, prouver au minimum :

- compte Index exact;
- DTO sérialisé borné;
- `nodes + aggregates <= VIEW_BUDGET`;
- nœuds matériels dans la borne courante;
- nombre d'arêtes borné par la vue, non par le corpus;
- payload IPC non proportionnel au corpus;
- layout invoqué seulement sur la projection;
- aucun whole-graph JSON;
- curseurs liés à index/revision et refus des curseurs périmés.

Publier chiffres, méthode, machine et durée comme **engineering evidence**, pas
comme promesse commerciale.

## 5. F50-2 — atteignabilité

Le contrat exige que tout élément indexé reste atteignable.

La preuve doit combiner :

- pagination exacte sans doublon/omission;
- recherche exacte bornée;
- navigation vers un résultat hors vue;
- focus/expansion d'agrégat;
- résolution de destination hors projection.

Ne pas prétendre « tout est atteignable » sur la base de quelques clics.

Il faut une falsification structurelle :
- si un id indexé n'appartient à aucun chemin d'accès couvert par les primitives
  bornées, le test échoue;
- les totaux/paginations doivent permettre de démontrer la couverture du corpus
  sans sérialiser le corpus au frontend.

Déclarer le nombre maximal d'actions de la route d'accès choisie selon la
primitive (par ex. recherche exacte → sélection/navigation), sans inventer une
borne plus forte que ce que le produit garantit.

## 6. F51-1 — agrégats exacts

Sur arbres large, profond et mixte :

- chaque agrégat représente uniquement des éléments réels non matérialisés;
- compte exact, jamais estimé/arrondi/tronqué;
- raison/provenance lisible;
- aucun faux dossier;
- aucun chemin copiable;
- aucune ouverture Explorateur;
- aucune arête hiérarchique inventée;
- pagination/expansion ne duplique ni n'omet;
- un agrégat et un repli F-042 restent deux natures différentes;
- les counts restent corrects après filtre/focus/rebuild lorsque le contrat les
  rend applicables.

Ajouter au moins une falsification où un compte faux de +1/-1 doit faire
échouer le test.

## 7. F50/F51 — intégration au vrai flux V1

Prouver que le runtime courant `REAL_ROOT` utilise la même chaîne canonique :

`REAL_ROOT temporaire -> scan/index -> map_view/materializer -> MapApp`.

Utiliser uniquement une racine temporaire créée par le harness.

Prouver :

- aucune voie whole-graph spéciale pour REAL_ROOT;
- ouverture/reprise n'introduit pas une deuxième copie canonique;
- vue bornée et agrégats visibles dans le vrai MapApp;
- recherche/navigation vers un élément non initialement matérialisé;
- détails/selection cohérents;
- source inchangée avant/après.

Aucune racine personnelle.

## 8. F50-3 — WebView2 réel sans accélération GPU matérielle

Faire au moins deux runs du même scénario :

1. WebView2 normal;
2. WebView2 avec `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--disable-gpu`.

Le mécanisme est celui documenté officiellement par Microsoft.

La preuve GPU-disabled doit vérifier l'application effective de la
configuration, par une observation discriminante disponible dans le processus
ou via CDP; définir seulement la variable n'est pas une preuve.

Dans les deux runs :

- application Tauri réelle;
- vue matérialisée bornée;
- agrégat réel;
- pan;
- zoom;
- sélection;
- clavier;
- navigation/expansion;
- zéro erreur console fatale;
- axe sur les états testés;
- même sémantique de données.

**Ne pas convertir ce test en promesse de FPS sur machine modeste.**
Le critère fermé est l'absence de dépendance fonctionnelle à l'accélération GPU
matérielle/WebGL, pas une certification de performance sur tout matériel.

## 9. P-01 / P-02 / P-03

TASK-0054 doit produire les preuves nécessaires pour qu'un contrôle indépendant
puisse fermer les amendements scale de :

- `P-01` : tous indexés, vue exacte/bornée, omissions déclarées;
- `P-02` : hiérarchie exacte, repli/agrégat déclaré, compte exact, agrégat
  jamais faux dossier;
- `P-03` : parent/enfants directs tous atteignables malgré pagination/agrégats.

Ne pas marquer ces P CLOSED soi-même.

## 10. Budget et performance

Réutiliser les budgets existants; ne pas inventer de SLA.

Enregistrer :
- temps des opérations mesurées;
- taille/payload;
- cardinalités;
- mémoire/processus si le harness courant sait la mesurer proprement;
- profil matériel.

Le banc actuel peut être plus puissant que la cible. Le dire.

Un résultat lent n'est pas masqué; s'il démontre un problème fonctionnel ou un
coût proportionnel au corpus côté rendu, STOP / BLOCKED.

## 11. Falsifications minimales

La livraison doit montrer des gardes effectives pour au moins :

1. retour d'un whole-graph DTO;
2. dépassement du VIEW_BUDGET;
3. layout calculé sur le corpus complet;
4. agrégat count +1/-1;
5. agrégat présenté comme dossier/path/openable;
6. pagination qui omet/duplique;
7. destination indexée mais inatteignable;
8. curseur stale accepté;
9. REAL_ROOT contournant le materializer;
10. GPU-disabled non réellement appliqué;
11. source modifiée par la session.

Une « falsification » sans test/garde discriminant ne compte pas.

## 12. Sécurité et public readiness

- données synthétiques uniquement;
- aucun secret;
- aucun chemin personnel dans artefacts;
- aucun hostname/user/account id;
- temporaires sous emplacement ignoré/contrôlé;
- aucun fichier FileTopo écrit dans la racine analysée;
- audit public-readiness pertinent rejoué.

## 13. Validation

Minimum :

- tests Rust ciblés;
- `cargo test --lib`;
- frontend ciblé + suite complète pertinente;
- `pnpm check`;
- `pnpm build`;
- Tauri debug réel;
- WebView2 normal + GPU-disabled;
- axe;
- `git diff --check`;
- vérification des artefacts JSON avec HEAD testé exact.

Si une suite historique est trop coûteuse ou non disponible, déclarer
exactement ce qui n'a pas été exécuté; ne jamais remplacer par « probablement ».

## 14. Gouvernance de fin

À la fin :

- `TASK-0054 = IMPLEMENTED`, jamais auto-VERIFIED;
- `F-050/F-051 = IMPLEMENTED / candidates`;
- `P-01/P-02/P-03` = candidates seulement si leurs critères sont réellement
  couverts;
- `F-046` inchangée;
- aucune `TASK-0055`;
- documenter limites et NOT_TESTED;
- écrire `.orchestrator/RESULT.md`;
- `NEXT_ACTION` = contrôle indépendant de TASK-0054;
- commit + push sur la branche cible;
- arbre propre.
