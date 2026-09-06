# TASK-0026 — Exact Duplicate Explorer + Bounded Scale

- **Date :** 2026-09-05
- **Branche :** `build/v0.2-a10-exact-duplicate-explorer`
- **Base contrôlée :** `a6918130202dc164684ed37c969efc90efd8b159`
- **Statut courant :** `IMPLEMENTED` — contrôle indépendant requis; Codex ne
  s'attribue pas `VERIFIED`
- **Transitions permises :** `PROPOSED → APPROVED → IN_PROGRESS → IMPLEMENTED
  → VERIFIED`; le GO technique de `.orchestrator/NEXT_PROMPT.md` autorise le
  passage à `IN_PROGRESS` après ce gel; l'exécuteur ne s'attribue jamais
  `VERIFIED`.
- **Agent d'exécution :** Codex
- **Décision :**
  [`DEC-0028`](../decisions/DEC-0028-exact-duplicate-query-boundary.md)
- **Contribue à :** exploitation/groupement exact à l'échelle de `F-046`, sans
  implémenter l'identité physique persistante ni compléter `F-046`

## 1. Objectif unique

Construire un explorateur par cerveau, persistant, borné, paginé et utilisable
des **contenus binaires identiques observés** dans la génération courante déjà
produite par `sha256-v1`. Il répond au nombre de groupes, à leurs occurrences,
à leur date d'observation et au cas des fichiers vides, sans conclure même
objet physique, copie, version, filiation ou espace disque récupérable.

Cette tâche réalise la partie sûre et non bloquée de la tranche proposée #4 de
[`TASK-0021 §6`](TASK-0021-product-realignment.md). Elle applique
[`DEC-0021`](../decisions/DEC-0021-deterministic-relation-engine.md),
[`DEC-0025`](../decisions/DEC-0025-exact-content-observation-boundary.md) et
[`DEC-0028`](../decisions/DEC-0028-exact-duplicate-query-boundary.md), après
`TASK-0023 VERIFIED / ACTION-0039`, `TASK-0024 VERIFIED / ACTION-0041` et
`TASK-0025 VERIFIED / ACTION-0042`. `DEC-0013` D et F restent normatives.

## 2. Préconditions contrôlées

| Précondition | Constat |
|---|---|
| Checkout de départ | `build/v0.2-a9-suggestion-review-memory` |
| Arbre local | propre |
| `git fetch origin` | exécuté |
| Fast-forward | `e795984 → a691813`, uniquement fast-forward |
| HEAD d'orchestration | `a6918130202dc164684ed37c969efc90efd8b159` |
| Parent direct | `e7959845839938fcb839d95e57e5363a5af326c1` |
| `TASK-0025` / `ACTION-0042` | `VERIFIED` / `CLOSED` |
| `X5` | 34 noms |
| `main` | `91bbe90f0f99026c28cd345784d4f579a0016db2` |
| `TASK-0026` / `DEC-0028` | identifiants libres avant ce gel |
| Tâche `IN_PROGRESS` | aucune |
| `F-046` | `PROPOSED` |
| `DEC-0013/F` | bloquante pour l'identité physique persistante |

La branche dédiée a été créée depuis le HEAD d'orchestration et publiée sans
toucher `main`.

## 3. Périmètre écrit et fichiers autorisés

Dans le périmètre :

- backend Rust de lecture du store `signals/content.sqlite`, avec résumé,
  groupes et membres paginés;
- résolution honnête des membres contre la carte courante;
- commandes Tauri strictement nécessaires et leur enregistrement;
- DTO/clients TypeScript, section UI « Contenus identiques », navigation vers
  un membre résolu, accessibilité clavier et tests;
- générateur/scénario synthétique d'échelle, harnais Windows/WebView2 et deux
  preuves `ED15`;
- migration préalable de toutes les destinations runtime `TASK-0025-*` vers
  `TASK-0026-*`, sans changer les 34 noms X5;
- rejeux `EC15`, `DR15` et `SR15` sous noms `TASK-0026`;
- documents durables de clôture et `.orchestrator/RESULT.md`.

Fichiers autorisés : cette fiche et `DEC-0028`; modules concernés sous
`src-tauri/src/`; composants, clients, types, scénarios et tests concernés sous
`src/`; scripts de preuve concernés sous `scripts/`; nouvelles preuves sous
`docs/performance/runs/`; et exclusivement les registres
`docs/ai/CURRENT_STATE.md`, `docs/ai/NEXT_ACTION.md`, `docs/ai/HANDOFF.md`,
`docs/ai/VALIDATION.md`, `docs/ai/CHANGELOG_AI.md`, ainsi que
`docs/product/FEATURE_MATRIX.md` et `.orchestrator/RESULT.md`.

Hors périmètre : données réelles, interface privée, identité physique
persistante, `FileId` seul ou couplé, cache de digest taille + mtime, watcher,
change token, IA/LLM/OCR/extraction/RAG/vector DB, refonte graphique, changement
de thème/fond, modification des quatre fixtures gelées, source analysée,
scellement X5, `TASK-0027`, `DEC-0029` et `main`.

## 4. Frontière sémantique gelée

Les cinq concepts de `DEC-0021` restent distincts : même objet physique,
contenu identique, copie probable, nom similaire, relation logique. Cette tâche
ne traite réellement que **contenu identique**. La formulation UI est
« Contenu binaire identique observé » et la limite adjacente est « Cela ne
prouve pas qu'il s'agit du même fichier physique ni d'une copie. »

Un groupe n'est créé que dans un cerveau, à partir de la génération courante,
pour au moins deux observations `HASHED`, `sha256-v1`, au digest valide égal.
Les fichiers vides restent visibles comme fait, sans relation, suggestion ou
gain disque. Aucun groupe n'est une identité de fichier ou une clé globale.

## 5. Contrat de requête et d'interface

Le résumé publie cerveau, génération, date, algorithme, groupes exacts,
occurrences groupées, groupes vides et disponibilité explicite. La liste des
groupes et la liste séparée de leurs membres sont paginées avec une limite
maximale de 100. SQLite agrège et borne avant matérialisation. Ordres stables :
groupes `size_bytes DESC, hash_hex ASC`; membres `relative_path ASC`.

L'interface n'affiche jamais `0 doublon` avant une campagne : elle demande
d'abord d'observer le contenu. Elle affiche un groupe actif, son digest complet
inspectable, sa taille, son nombre, sa génération/date et ses membres paginés.
Un membre résolu peut être sélectionné dans la carte sans mutation de relation.
Boutons natifs, ordre clavier cohérent, informations essentielles en texte et
aucune dépendance exclusive à la couleur.

## 6. Critères fonctionnels gelés — `ED1` à `ED15`

| Id | Critère |
|---|---|
| `ED1` | Seule la génération courante de `brains/<brain_id>/signals/content.sqlite` participe; une génération antérieure ne fuit dans aucun total ni groupe. |
| `ED2` | Un groupe existe exactement pour au moins deux lignes `HASHED` de digest `sha256-v1` valide égal; taille contrôlée comme invariant, jamais comme substitut. |
| `ED3` | Les fichiers vides forment un groupe visible et explicitement marqué, sans relation ni suggestion automatique et sans estimation de gain. |
| `ED4` | Backend, DTO et UI ne confondent jamais contenu identique avec identité physique, copie, filiation, version, relation logique ou espace récupérable garanti. |
| `ED5` | Le résumé backend publie exactement cerveau, génération/date, algorithme, disponibilité, groupes, occurrences groupées et groupes vides. |
| `ED6` | La liste des groupes est paginée dans SQLite, bornée par une limite maximale explicite de 100 et ne charge jamais tous les membres. |
| `ED7` | Les membres d'un groupe sont lus par une API séparée, paginée dans SQLite et bornée par la même limite maximale de 100. |
| `ED8` | Ordre déterministe : groupes par `size_bytes DESC, hash_hex ASC`, membres par `relative_path ASC`; redémarrage et pages répétées donnent le même ordre. |
| `ED9` | L'UI « Contenus identiques » est fonctionnelle au clavier, emploie des boutons natifs, expose la limite sémantique en texte et permet de naviguer vers un membre résolu sans relation. |
| `ED10` | Isolation stricte : Alpha, Bêta et Gamma ne partagent ni groupes ni membres; un même hash inter-cerveaux ne fusionne rien; la consultation ne modifie aucun store relationnel, de suggestions ou inter-cerveaux. |
| `ED11` | Après vrai redémarrage et rebuild de `map/`, les observations/groupes persistent; un membre non résolu reste signalé honnêtement et rien n'est présenté comme fraîcheur actuelle implicite. |
| `ED12` | Une seconde campagne explicite inchangée rouvre et rehache réellement chaque fichier attendu; aucun cache validé par taille + mtime n'existe. |
| `ED13` | Source strictement read-only, empreinte avant/après identique, et garanties Windows `X9`/`X10` non affaiblies; le repli non-Windows reste déclaré non race-safe. |
| `ED14` | X5 reste exactement 34 noms inchangés; toutes les destinations runtime sont `TASK-0026-*`, `SEALED_RUNTIME_DESTINATIONS = []`, `protectedDestinations = []`, `owningTaskId = TASK-0026`, `writesUnderItsOwnTaskOnly = true`. |
| `ED15` | Deux preuves réelles Windows/WebView2 sur une source synthétique volumineuse exercent plusieurs pages de groupes et de membres, groupe vide, isolation, persistance, vrai redémarrage et vraie activation clavier (`keydownIsTrusted = true`, activation fiable), avec zéro clic programmatique. |

## 7. Preuves et régressions attendues

La source ED15 est engendrée à l'exécution dans le sandbox de preuve, sous le
plafond courant de map, avec 1 000 à 3 000 fichiers minuscules : plusieurs
pages de groupes, un groupe de plus de 100 membres, fichiers uniques et groupe
vide. Aucun millier de fichiers n'est commité.

Preuves non canoniques :

- `TASK-0026-ED15-exact-duplicate-explorer-webview2-pass1.json`;
- `TASK-0026-ED15-exact-duplicate-explorer-webview2-pass2.json`.

Pass1 mesure campagne, fichiers ouverts, octets lus, digests, requêtes et
pagination, puis rejoue une campagne inchangée prouvant le rehash. Pass2 est un
nouveau processus sur la même variante et prouve persistance, ordre, absence de
mutation relationnelle et source inchangée. Aucun seuil universel n'en est
déduit.

Après migration runtime et seulement après elle, rejouer sous noms
`TASK-0026` : `EC15`, `DR15` pass1/pass2 et `SR15` pass1/pass2. Ces replays et
les deux `ED15` restent hors X5 jusqu'au contrôle indépendant.

## 8. Validations obligatoires

- tests Rust ciblés du store/signaux/groupes et du moteur de règles;
- suite Rust utile, avec `CARGO_INCREMENTAL=0` si B0 se reproduit, sans
  supprimer ni renommer le cache historique;
- tests TypeScript UI/explorateur et `runArtifacts.test.ts`;
- `pnpm check` et `pnpm build`;
- preuves WebView2 `ED15` et replays `EC15`, `DR15`, `SR15`;
- gardes X5, parité des destinations et `git diff --check`.

## 9. Règles de clôture

Si `ED1` à `ED15` passent, cette tâche devient `IMPLEMENTED`, jamais
`VERIFIED` par Codex. `F-046` reste `PROPOSED`; `DEC-0013/F` reste bloquante;
aucun cache taille + mtime ni identité physique persistante n'est introduit.
Les documents durables et `.orchestrator/RESULT.md` sont mis à jour et
`NEXT_ACTION.md` demande uniquement le contrôle indépendant de `TASK-0026`.

## 10. Journal d'exécution

- 2026-09-05 — `APPROVED` : critères `ED1` à `ED15` et `DEC-0028` gelés et
  commités avant toute modification de code produit.
- 2026-09-05 — `IN_PROGRESS` : exécution ouverte après le gel documentaire.
- 2026-09-06 — `IMPLEMENTED` : `ED1` à `ED15` satisfaits sur preuves
  synthétiques. Deux nouvelles passes `ED15` ont été capturées sur le HEAD
  final, puis `EC15`, `DR15` et `SR15` ont été rejoués sous noms `TASK-0026`.
  Aucun de ces huit JSON n'entre dans X5 avant contrôle indépendant.

## 11. Résultat livré

- **Lecture bornée :** résumé, groupes et membres séparés; génération courante
  uniquement; limites SQLite maximales à 100; ordres déterministes; invariant
  de taille contrôlé; aucun store absent créé par une lecture.
- **Interface :** « Contenus identiques », état non observé explicite, digest
  complet, pagination groupes/membres, groupe vide marqué et navigation vers
  un membre résolu par boutons natifs et clavier.
- **Frontière :** l'interface dit « Contenu binaire identique observé » et
  rappelle que cela ne prouve ni même fichier physique ni copie. Aucun gain
  disque, relation ou suggestion n'est produit par l'explorateur.
- **Échelle ED15 :** 1 200 fichiers, 125 groupes, 373 occurrences groupées,
  pages groupes et membres `50/50/25`, limite backend 100, groupe vide de 125
  membres, seconde campagne inchangée rouvrant et rehachant 1 200 fichiers.
- **Persistance ED15 :** nouveau processus sur la même variante, rebuild map
  réel, 125 groupes persistés et 50/50 membres non résolus signalés sans être
  supprimés; source et stores relationnels inchangés.
- **Entrée réelle :** 11 `keydown` et 11 activations fiables sur ED15, zéro
  `click()` ou `dispatchEvent(click)` programmatique. Le watcher refuse toute
  injection tant que le handle FileTopo n'est pas réellement au premier plan.
- **Régressions :** `EC15`, `DR15` et `SR15`, deux passes chacune, verts sous
  `TASK-0026`; aucun rejeu H9/J12/K11/K12/L12/M12/N15/X11, conformément au
  prompt de reprise qui les exclut sans dépendance fonctionnelle nouvelle.
- **Validations :** Rust exact duplicate **3/3**, moteur **14/14**, suite
  **227/227**; TypeScript ciblé **42/42**, suite **241/241**;
  `pnpm check`, `pnpm build`, Tauri debug `--no-bundle` et
  `git diff --check` verts.
- **Gouvernance :** X5 reste exactement 34 noms historiques inchangés;
  `protectedDestinations = []`, `owningTaskId = TASK-0026`,
  `writesUnderItsOwnTaskOnly = true`. `main` reste `91bbe90f`.
- **Limites :** `F-046` reste `PROPOSED`; aucune identité physique persistante
  ni cache taille + mtime; `DEC-0013/F` reste bloquante et X10 hors Windows
  reste non prouvée race-safe.
