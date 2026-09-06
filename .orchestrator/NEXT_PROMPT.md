# NEXT_PROMPT — TASK-0026 / exact duplicate explorer à l’échelle

**TARGET_AGENT:** CODEX  
**STATUS:** READY  
**OWNER:** orchestrateur technique  
**TASK:** `TASK-0026 — Exact Duplicate Explorer + Bounded Scale`  
**MODE:** exécution autonome depuis le dépôt

> Cette tranche reste fonctionnelle. **Aucune refonte graphique**, aucun changement de thème/fond du graphe, aucune IA/RAG/vector DB/extraction de contenu. Elle prend la partie sûre et non bloquée de la tranche #4 proposée par `TASK-0021 §6` : rendre les observations de contenu identique réellement exploitables à grande échelle, sans contourner `DEC-0013/F`.

## /goal

Construire un explorateur de **contenus binaires identiques observés** par cerveau, borné, paginé, persistant et utilisable dans l’interface, à partir de la génération courante déjà produite par `sha256-v1`.

Le produit doit pouvoir répondre clairement à des questions comme :

- combien de groupes de contenus identiques sont observés dans ce cerveau;
- quels fichiers appartiennent à un groupe exact;
- combien d’occurrences ce groupe contient;
- quand cette observation a été faite;
- quels groupes sont des fichiers vides.

Mais il doit **continuer à refuser les conclusions qu’il ne peut pas prouver** :

- hash égal ≠ même objet physique;
- hash égal ≠ copie;
- hash égal ≠ filiation/version;
- hash égal ≠ espace disque récupérable garanti.

`F-046` **ne passe pas à IMPLEMENTED** dans cette tranche. Sa fondation exacte est vérifiée, et cette tâche ajoute l’exploration/échelle, mais l’identité physique persistante reste bloquée par `DEC-0013/F`.

---

## 0 — synchronisation et préconditions obligatoires

Appliquer les protocoles projet de début de session.

Avant toute modification :

1. checkout local attendu : `build/v0.2-a9-suggestion-review-memory`;
2. arbre local propre;
3. `git fetch origin`;
4. fast-forward uniquement vers `origin/build/v0.2-a9-suggestion-review-memory`;
5. le HEAD obtenu doit être le commit d’orchestration qui contient **ce** fichier;
6. son parent direct doit être exactement :
   `e7959845839938fcb839d95e57e5363a5af326c1`;
7. `TASK-0025 = VERIFIED`;
8. `ACTION-0042 = CLOSED`;
9. `X5 = 34`;
10. `main = 91bbe90f0f99026c28cd345784d4f579a0016db2`;
11. `TASK-0026` doit être libre;
12. `DEC-0028` doit être libre;
13. aucune tâche ne doit être `IN_PROGRESS`;
14. `F-046 = PROPOSED`;
15. `DEC-0013/F` doit encore être explicitement bloquante pour l’identité physique persistante.

Si divergence, modification locale étrangère, fast-forward impossible, identifiant occupé ou état de gouvernance incohérent : **STOP / BLOCKED**.

---

## 1 — nouvelle branche

Créer depuis le commit d’orchestration courant :

`build/v0.2-a10-exact-duplicate-explorer`

Publier la branche normalement. Ne pas toucher `main`.

---

## 2 — gel documentaire AVANT code produit

Avant toute implémentation, créer et committer :

- `docs/tasks/TASK-0026-exact-duplicate-explorer.md`;
- `docs/decisions/DEC-0028-exact-duplicate-query-boundary.md`.

Le gel doit référencer explicitement :

- `TASK-0021 §6`, tranche proposée #4;
- `DEC-0021`;
- `DEC-0025`;
- `TASK-0023 VERIFIED / ACTION-0039`;
- `TASK-0024 VERIFIED / ACTION-0041`;
- `TASK-0025 VERIFIED / ACTION-0042`;
- `DEC-0013` points D et F.

La décision `DEC-0028` doit dire explicitement que cette tranche **n’autorise ni identité physique persistante ni cache de digest validé par taille+mtime**.

Après le gel seulement : `APPROVED → IN_PROGRESS`.

---

## 3 — frontière sémantique obligatoire

Conserver strictement les cinq concepts de `DEC-0021` :

1. même objet physique;
2. contenu identique;
3. copie probable;
4. nom similaire;
5. relation logique.

Cette tâche ne traite réellement que **#2 — contenu identique**.

### Formulation utilisateur canonique

Utiliser une formulation du type :

**« Contenu binaire identique observé »**

et afficher à proximité une limite explicite :

**« Cela ne prouve pas qu’il s’agit du même fichier physique ni d’une copie. »**

Interdictions :

- ne pas appeler un groupe `same file`, `same physical file`, `physical duplicate`, `copy`, `backup copy`, `version` ou équivalent;
- ne pas présenter `(count - 1) × size` comme « espace récupérable »;
- ne pas inventer de direction de copie;
- ne pas créer de relation ou suggestion simplement parce qu’un groupe est affiché;
- ne pas fusionner deux occurrences dans le store.

---

## 4 — source de vérité : génération courante `content.sqlite`

L’explorateur lit **uniquement la génération courante** du store de signaux du cerveau :

`brains/<brain_id>/signals/content.sqlite`

Seules les lignes :

- `observation_status = HASHED`;
- avec `hash_algorithm = sha256-v1`;
- avec digest valide;

peuvent participer aux groupes exacts.

Un groupe exact existe si et seulement si au moins **deux occurrences** de la génération courante portent le même `(hash_algorithm, hash_hex)`.

La taille peut être vérifiée comme invariant de cohérence, mais **elle ne remplace jamais le hash**.

### Fichiers vides

Les fichiers vides peuvent former un groupe exact de contenu binaire identique. Ils doivent être visibles comme **fait observé**, avec `emptyContent = true` ou équivalent.

Ils ne doivent créer :

- aucune relation logique automatique;
- aucune suggestion de copie;
- aucune estimation de gain disque.

Le comportement `core.identical-content/v1` déjà vérifié sur les fichiers vides ne doit pas être affaibli.

---

## 5 — API bornée et paginée

Créer une API backend générique par cerveau, avec des noms cohérents avec le projet, couvrant au minimum trois lectures.

### A. Résumé

Retourner au minimum :

- `brainId`;
- génération courante;
- date d’observation;
- algorithme;
- nombre exact de groupes;
- nombre exact d’occurrences appartenant à des groupes;
- nombre de groupes de fichiers vides;
- état de disponibilité (`NOT_OBSERVED`, `AVAILABLE`, ou équivalent explicite);
- éventuellement nombre d’endpoints non résolus contre la map courante, si cette vérification est effectuée.

### B. Liste des groupes

API paginée, limite maximale explicite et raisonnable, par exemple **100**.

Chaque groupe doit fournir au minimum :

- identifiant de groupe **dérivé du contenu**, jamais une identité de fichier;
- `hashAlgorithm`;
- `hashHex` ou une représentation complète disponible à l’inspection;
- `sizeBytes`;
- `memberCount`;
- `emptyContent`;
- génération et date observée.

Ordre stable documenté. Préférence :

1. `size_bytes DESC`;
2. `hash_hex ASC`.

### C. Membres d’un groupe

API séparée et paginée, limite maximale explicite.

Chaque membre doit contenir uniquement les données nécessaires :

- `relativePath`;
- nom;
- taille;
- date d’observation;
- statut/hash déjà prouvé;
- référence de nœud si elle est résolue dans la map courante.

Ordre stable : `relative_path ASC`.

### Exigence d’échelle

Ne pas charger silencieusement tous les groupes et tous leurs membres dans une seule réponse. Utiliser l’agrégation/pagination SQLite ou une structure équivalente réellement bornée.

---

## 6 — aucune optimisation de fraîcheur non prouvée

`DEC-0025 §E` reste pleinement normative.

Dans cette tranche :

- **ne pas** réutiliser un ancien digest parce que taille+mtime sont identiques;
- **ne pas** ajouter de cache de hash supposé frais;
- **ne pas** ajouter de watcher implicite;
- **ne pas** ajouter de change token inventé;
- **ne pas** persister `VolumeSerialNumber`, `FileId`, handle id, inode ou identité système équivalente.

Une campagne explicite `sha256-v1` continue donc de **relire/rehasher les fichiers comme aujourd’hui**.

La preuve TASK-0026 doit même vérifier qu’un second run explicite inchangé ouvre et rehache réellement les fichiers attendus, plutôt que de prétendre avoir introduit un cache.

Cette tâche améliore l’**exploration et le coût des requêtes/rendus de résultats**, pas la vérité/fraîcheur du hash par une optimisation non prouvée.

---

## 7 — UI fonctionnelle « Contenus identiques »

Ajouter une section simple dans l’interface actuelle, sans refonte graphique.

Pour le cerveau focalisé/sélectionné :

- entrée visible du type `N groupes de contenu identique`;
- si aucune campagne : message explicite demandant d’observer le contenu d’abord, pas `0 doublon`;
- ouvrir la liste de groupes;
- afficher un groupe actif à la fois ou une liste paginée simple;
- afficher taille, nombre d’occurrences, digest/algorithme inspectable, date d’observation;
- ouvrir les membres du groupe;
- permettre de sélectionner/naviguer vers un membre résolu dans la carte sans créer de relation;
- afficher en texte la frontière : **contenu identique ≠ même fichier physique ≠ copie**;
- signaler clairement les groupes de fichiers vides.

Accessibilité minimale :

- boutons natifs;
- ordre clavier cohérent;
- état lisible sans couleur seule;
- aucune information essentielle uniquement dans un tooltip.

Ne pas changer le thème ou le fond noir dans cette tâche.

---

## 8 — isolation multi-cerveaux

Prouver explicitement :

- le résumé d’Alpha vient uniquement de `brains/brain-alpha/signals/content.sqlite`;
- Gamma/Bêta ont leurs propres groupes;
- un hash identique présent dans deux cerveaux ne fusionne jamais leurs groupes ni leurs membres;
- l’identifiant de groupe ne devient jamais une clé inter-cerveaux globale;
- aucun store inter-cerveaux n’est modifié par l’explorateur;
- aucun store de relations/suggestions n’est modifié par une simple lecture de groupes.

---

## 9 — map rebuild et résolution honnête

Le store `signals/content.sqlite` reste hors de l’index reconstructible.

Après rebuild de `map/` :

- les observations persistées restent présentes;
- les groupes persistent puisqu’ils sont dérivés de la génération courante du store de contenu;
- si un membre ne peut plus être résolu contre la map courante, **ne pas le supprimer silencieusement** : le signaler comme non résolu ou comme observation historique/stale selon l’architecture existante;
- ne jamais transformer une observation persistée en affirmation implicite que la source est encore identique aujourd’hui.

---

## 10 — X5 / runtime AVANT tout replay

`TASK-0025` est maintenant `VERIFIED`; ses deux `SR15` sont protégées.

Avant **tout** scénario qui écrit sous `docs/performance/runs/` :

1. migrer toutes les destinations runtime `TASK-0025-*` vers `TASK-0026-*`;
2. inclure toutes les destinations réellement compilées/rejouables, canoniques ou non canoniques;
3. laisser les **34 noms X5 exactement inchangés**;
4. `SEALED_RUNTIME_DESTINATIONS = []` après migration;
5. `protectedDestinations = []`;
6. `owningTaskId = TASK-0026`;
7. `writesUnderItsOwnTaskOnly = true`.

Adapter les tests de garde **avant** tout replay.

Les deux nouvelles preuves propres à TASK-0026 restent hors X5 jusqu’au contrôle indépendant.

---

## 11 — critères gelés TASK-0026

Créer des critères `ED1` à `ED15` couvrant au minimum :

1. génération courante seulement;
2. groupe = exact `sha256-v1` égal avec au moins deux occurrences;
3. fichiers vides visibles comme fait, sans relation/suggestion automatique;
4. aucune confusion avec identité physique/copie/version;
5. résumé exact calculé par le backend;
6. groupes paginés et bornés;
7. membres paginés et bornés;
8. ordre stable et déterministe;
9. UI fonctionnelle et accessible par clavier;
10. isolation stricte entre cerveaux et aucun store relationnel modifié;
11. persistance après vrai redémarrage/rebuild, avec fraîcheur honnête;
12. second run explicite inchangé **rehash réellement** les fichiers — aucun cache taille+mtime;
13. source strictement read-only et garanties Windows X9/X10 non affaiblies;
14. X5 reste 34, runtime TASK-0026, aucune collision protégée;
15. vraie preuve Windows/WebView2 sur un jeu synthétique volumineux avec pagination réellement exercée et zéro clic programmatique.

---

## 12 — preuve d’échelle synthétique

Créer une source de preuve dédiée **générée à l’exécution**, hors des quatre fixtures gelées, sans donnée réelle.

Objectif : assez d’éléments pour prouver que l’API et l’UI ne reposent pas sur « tout tient en une page ».

Cible raisonnable : **1 000 à 3 000 fichiers minuscules**, sous le plafond actuel de map, avec :

- plusieurs dizaines/centaines de groupes exacts;
- certains groupes > limite d’une page de membres;
- plusieurs pages de groupes;
- fichiers uniques;
- au moins un groupe de fichiers vides;
- chemins et contenus purement synthétiques.

Ne pas committer des milliers de fichiers fixtures. Les matérialiser uniquement dans le sandbox de preuve.

### Pas de seuil universel de performance

Mesurer et publier :

- durée de campagne;
- fichiers ouverts;
- octets lus;
- digests calculés;
- temps de requête résumé/groupes/membres si mesurable;
- tailles de pages et compte total.

**Ne pas transformer ces mesures en promesse universelle de performance.**

---

## 13 — preuves WebView2 TASK-0026

Publier deux nouvelles preuves non canoniques, par exemple :

- `TASK-0026-ED15-exact-duplicate-explorer-webview2-pass1.json`;
- `TASK-0026-ED15-exact-duplicate-explorer-webview2-pass2.json`.

### Pass1 — fresh variant

Démontrer au minimum :

- vrai Windows + WebView2;
- source synthétique volumineuse;
- campagne `sha256-v1` complète et read-only;
- groupes exacts conformes aux attentes de la fixture;
- pagination de groupes réellement exercée;
- pagination de membres réellement exercée sur un groupe > limite;
- ouverture de l’explorateur par vraie frappe clavier;
- navigation vers au moins un membre par vraie frappe si l’UI le permet;
- `keydownIsTrusted = true` / activation fiable;
- `programmaticClickCalls = 0`;
- `programmaticClickDispatches = 0`;
- groupe vide signalé mais aucune relation créée;
- autre cerveau inchangé;
- store relations/suggestions inchangé;
- X5 = 34, runtime entièrement TASK-0026.

Puis relancer **une seconde campagne explicite inchangée dans le même pass** et prouver qu’elle relit/rehache réellement les fichiers selon le contrat actuel : aucun cache taille+mtime ne doit apparaître.

### Pass2 — vrai redémarrage

Nouveau processus réel sur la même variante :

- avant nouvelle campagne, le résumé et les groupes persistés sont encore disponibles;
- génération/date observée inchangées au chargement;
- mêmes groupes/membres dans le même ordre;
- aucune relation/suggestion ajoutée par la simple consultation;
- source toujours inchangée;
- fermeture réelle du processus.

---

## 14 — régressions minimales

Rejouer au minimum après migration runtime, sous noms TASK-0026 :

- `EC15` exact-content observations si le scénario demeure compatible;
- `DR15` deterministic relation engine, car `core.identical-content/v1` consomme le store de contenu;
- `SR15` suggestion review memory, car la migration runtime touche ses destinations et TASK-0025 vient d’être scellée.

Ne sceller aucune de ces régressions dans cette tâche. Elles sont de nouvelles preuves de non-régression TASK-0026 seulement.

Si un replay est réellement inutile ou techniquement incompatible avec le périmètre, documenter la raison au lieu de prétendre l’avoir exécuté.

---

## 15 — F-046 et limites à la fin

À la fin, mettre à jour `FEATURE_MATRIX.md` honnêtement :

- `F-046` reste **PROPOSED**;
- mentionner que :
  - fondation `sha256-v1` = vérifiée TASK-0023;
  - exploitation/groupement exact à l’échelle = implémentée par TASK-0026 si les critères passent;
  - identité physique persistante = **absente et bloquée** par `DEC-0013/F`;
  - aucun cache de digest par taille+mtime n’est introduit;
  - « même objet physique » n’est toujours pas implémenté.

Ne déclarer ni tranche #4 complète ni F-046 complète.

---

## 16 — validations

Exécuter les suites utiles au code réellement touché, au minimum :

- tests Rust du store/signaux/groupes;
- tests Rust du moteur de règles affecté indirectement;
- tests TypeScript de l’UI/explorateur;
- `runArtifacts.test.ts` après migration;
- `pnpm check`;
- `pnpm build`;
- tests/replays WebView2 exigés ci-dessus;
- `git diff --check`.

Si `cargo` reproduit la panne incrémentale historique B0, utiliser `CARGO_INCREMENTAL=0`; ne supprimer aucun cache historique réservé.

Ne pas utiliser de donnée réelle.

---

## 17 — états et gouvernance finale

Si tous les critères de l’exécuteur passent :

- `TASK-0026 = IMPLEMENTED`, **jamais VERIFIED par l’exécuteur**;
- `DEC-0028` = état cohérent avec les conventions du dépôt, sans auto-vérification;
- mettre à jour `CURRENT_STATE`, `NEXT_ACTION`, `HANDOFF`, `VALIDATION`, `CHANGELOG_AI`, `FEATURE_MATRIX`;
- `NEXT_ACTION` doit demander un contrôle indépendant de TASK-0026;
- ne pas créer TASK-0027;
- ne pas créer DEC-0029;
- X5 reste exactement 34;
- nouvelles preuves ED15 restent hors X5 jusqu’au verdict indépendant.

---

## 18 — commits / push

Faire des commits logiques, notamment :

1. gel documentaire avant code;
2. migration runtime/X5 destinations avant replay;
3. backend exact-duplicate explorer;
4. UI/tests;
5. preuves réelles et documentation finale.

Push normal uniquement. Aucun force push, aucun rebase destructif, aucune réécriture d’historique.

---

## 19 — RESULT.md

Remplacer `.orchestrator/RESULT.md` par :

```text
TASK_ID: TASK-0026 — Exact Duplicate Explorer + Bounded Scale
AGENT: CODEX
RESULT: DONE | PAUSED | BLOCKED | FAILED
BRANCH: build/v0.2-a10-exact-duplicate-explorer
FINAL_HEAD: <sha>

SUMMARY:
-

VALIDATIONS:
-

IMPORTANT_FILES:
-

COMMIT:
PUSHED: yes/no

LIMITS_OR_BLOCKERS:
- DEC-0013/F physical identity persistence remains blocked
- F-046 remains PROPOSED
- no size+mtime digest cache
- non-Windows X10 race-safe guarantee remains unproven

NEXT_ORCHESTRATOR_DECISION:
- independent control of TASK-0026 if IMPLEMENTED
```

---

## Interdictions finales

- aucune donnée réelle;
- aucune identité physique persistante;
- aucun `FileId` seul;
- aucun cache digest taille+mtime;
- aucune IA/RAG/vector DB/OCR/extraction;
- aucune modification de source analysée;
- aucune refonte graphique;
- aucun scellement X5 avant contrôle indépendant;
- aucun `VERIFIED` auto-attribué;
- aucun `TASK-0027` anticipé.
