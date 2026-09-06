# TASK-0025 — Suggestion Review Queue + Human Decision Memory

- **Date :** 2026-09-05
- **Branche :** `build/v0.2-a9-suggestion-review-memory`
- **Base contrôlée :** `7bb98573d115f3423617efa55628f39eb41d31ab`
- **Statut courant :** `VERIFIED` — verdict indépendant enregistré par
  [`ACTION-0042`](../reviews/ACTION-0042-independent-control.md)
- **Transitions :** `PROPOSED → APPROVED → IN_PROGRESS → IMPLEMENTED →
  VERIFIED`; démarrage par GO technique explicite de
  `.orchestrator/NEXT_PROMPT.md`; verdict `VERIFIED` rendu par l'orchestrateur
  technique indépendant et enregistré par Codex dans `ACTION-0042`.
  **`VERIFIED` n'est auto-attribué ni par Claude Code ni par Codex.**
- **Agent d'exécution :** Claude Code
- **Décision :** [`DEC-0027`](../decisions/DEC-0027-suggestion-review-memory.md)
- **Implémente :** `F-044` et `F-045`, sans implémenter `F-046`

## 1. Objectif unique

Permettre à un humain de traiter rapidement les suggestions d'un cerveau par
une file simple — `[ Confirmer ] [ Rejeter ] [ Plus tard ]` — avec une
explication vérifiable de chaque suggestion, et faire en sorte qu'un rejet
survive au redémarrage et ne soit pas reproposé indéfiniment par un rerun
inchangé du moteur `dre-v1`.

Tranche entièrement fonctionnelle : **aucune refonte visuelle**, aucun
changement de thème ou de fond du graphe, aucune IA, RAG, vector DB ou
extraction de contenu.

Cette tranche est la tranche proposée #3 de
[`TASK-0021 §6`](TASK-0021-product-realignment.md), après le moteur `F-043`
livré par [`TASK-0024`](TASK-0024-deterministic-relation-engine.md), désormais
`VERIFIED` par
[`ACTION-0041`](../reviews/ACTION-0041-independent-recontrol.md).

## 2. Préconditions contrôlées

Contrôlées avant le gel, à la racine du dépôt public FileTopo :

| Précondition | Constat |
|---|---|
| Branche de départ | `build/v0.2-a8-deterministic-relation-engine` |
| Arbre local | propre |
| `git fetch origin` | exécuté |
| Fast-forward | `b084de7 → 7bb9857`, sans autre opération |
| HEAD | `7bb9857`, commit d'orchestration portant `NEXT_PROMPT.md` |
| Parent direct | `b084de786890af9cca4bf1a54fe9796f809af62d` |
| `TASK-0024` | `VERIFIED` |
| `ACTION-0041` | `CLOSED` |
| `X5` | 32 noms |
| `main` | `91bbe90f0f99026c28cd345784d4f579a0016db2` |
| `TASK-0025` | libre |
| `DEC-0027` | libre |
| Tâche `IN_PROGRESS` | aucune |

La branche `build/v0.2-a9-suggestion-review-memory` a été créée directement
depuis ce commit d'orchestration et publiée sans toucher `main`.

## 3. Périmètre écrit

Dans le périmètre :

- migration versionnée `v3 → v4` du store intra-relations, sans perte;
- trois états persistants exactement — `pending`, `approved`, `rejected`;
- données de décision auditables dans la ligne de la suggestion, dont un champ
  nullable de cause de réévaluation future, laissé `NULL`;
- opération backend explicite de rejet dans la couche de commandes de
  relations;
- mémoire du rejet dans la reconciliation `dre-v1`;
- API backend générique et paginée de file `PENDING` par cerveau;
- entrée UI « N relations à confirmer » et file fonctionnelle à trois actions;
- migration de **toutes** les destinations runtime `TASK-0024-*` vers
  `TASK-0025-*` avant tout rejeu, gardes adaptées;
- preuves réelles WebView2 `SR15` pass1/pass2 sous des noms `TASK-0025`;
- rejeux `DR15` pass1/pass2, `J12` intra-brain et `X11` sous noms `TASK-0025`;
- tests unitaires et d'intégration des migrations, du rejet, de la
  reconciliation, de la pagination et de l'isolation.

Hors périmètre : `F-046`, `VolumeSerialNumber + FileId` tant que `DEC-0013/F`
bloque, extraction de contenu, recherche sémantique, embeddings, vector DB,
RAG/GraphRAG, LLM/AI/BYOK, permissions et mode équipe, watcher et
incrémental, refonte graphique, React Flow, ELK, thème clair/sombre, données
réelles, politique automatique de réévaluation des décisions, état persistant
`DEFERRED`, création d'une `TASK-0026`.

## 4. Frontière sémantique gelée

Reprise de la consigne d'orchestration et de
[`DEC-0027` §A](../decisions/DEC-0027-suggestion-review-memory.md) :

1. une suggestion n'est jamais une relation établie;
2. une relation établie reste exclusivement `DETERMINISTIC` ou `APPROVED`;
3. aucun état ou provenance `AI`, `SUGGESTED`, `REJECTED_RELATION`, etc.;
4. un rejet ne crée aucune relation et ne modifie aucune source;
5. le bouton `Plus tard` ne décide rien : l'élément reste `PENDING`;
6. aucune règle déterministe existante n'est modifiée dans son sens;
7. aucune suggestion n'est auto-approuvée;
8. aucune relation inter-cerveaux n'est inventée;
9. aucune donnée réelle.

## 5. Contrat de la mémoire de décision

L'identité de la mémoire est la `suggestion_key` produite par `TASK-0024` —
`core.numbered-sibling-revision-candidate`, version, `brain_id`, extrémités et
type. **Sa formule n'est pas modifiée par cette tranche.**

Une suggestion core `rejected` reste `rejected` au rerun, n'est jamais recréée
`pending`, et reste stockée même quand le run courant ne la repropose pas. Une
suggestion core `approved` reste préservée comme aujourd'hui. Une suggestion
encore `pending` est reconciliée normalement. Aucune décision d'un autre
cerveau ne compte.

La politique générale de réévaluation d'une décision reste **hors scope v1**
conformément à `DEC-0021`; le schéma doit seulement pouvoir l'enregistrer plus
tard.

## 6. Critères fonctionnels gelés — `SR1` à `SR15`

| Id | Critère |
|---|---|
| `SR1` | Migration `v3 → v4` sans perte : lignes legacy, suggestions, relations `APPROVED` et contraintes `X3` préservées; migrations depuis `v1`, `v2` et `v3` toutes exercées. |
| `SR2` | Le store n'accepte exactement que trois états de suggestion : `pending`, `approved`, `rejected`. Tout autre état est refusé au niveau du stockage. |
| `SR3` | Aucun état `deferred` n'est persistable ni persisté. |
| `SR4` | La file `PENDING` d'un cerveau est paginée, bornée par une limite maximale explicite, et publie un `totalPending` exact qui ne compte ni les approuvées ni les rejetées. |
| `SR5` | Chaque item de la file porte source, cible, type proposé, `suggestion_key`, producteur, règle et version quand disponibles, explication FR et EN, signaux structurés et l'état `PENDING`. Aucun contenu privé de fichier. |
| `SR6` | `Confirmer` crée exactement une relation `APPROVED`, par le flux déjà vérifié, et la suggestion quitte la file. |
| `SR7` | `Rejeter` ne crée aucune relation, ne touche aucune source, persiste la décision et la suggestion quitte la file. |
| `SR8` | `Plus tard` n'appelle aucune mutation, ne persiste rien, laisse la suggestion `PENDING` et avance localement. |
| `SR9` | Un rerun inchangé de `dre-v1` ne repropose pas `pending` une suggestion rejetée. |
| `SR10` | Un rerun inchangé de `dre-v1` préserve une suggestion approuvée et sa relation `APPROVED`. |
| `SR11` | Un redémarrage réel du processus conserve les décisions `approved` et `rejected`, et la file rechargée contient encore la suggestion laissée « Plus tard ». |
| `SR12` | Isolation stricte : une décision dans un cerveau ne modifie ni le store, ni le compteur, ni l'état de la suggestion équivalente d'un autre cerveau, et aucune clé d'endpoint d'un autre cerveau n'entre dans une décision. |
| `SR13` | La source analysée reste en lecture seule : empreinte inchangée avant et après la campagne. |
| `SR14` | `X5` reste exactement 32; toutes les destinations runtime appartiennent à `TASK-0025`; `protectedDestinations = []`; `writesUnderItsOwnTaskOnly = true`; aucune preuve protégée n'est modifiée. |
| `SR15` | Preuve en vrai WebView2 : actions utilisateur fiables — `keydownIsTrusted = true`, activation réelle — et `programmaticClickCalls = 0`, `programmaticClickDispatches = 0`; aucune mutation programmatique ne simule une décision. |

## 7. Preuves attendues

- `TASK-0025-SR15-suggestion-review-memory-webview2-pass1.json` — processus
  réel, fresh variant, confirmation, rejet et « Plus tard » par vraie
  interaction clavier, puis rerun inchangé;
- `TASK-0025-SR15-suggestion-review-memory-webview2-pass2.json` — nouveau
  processus WebView2 sur le même variant, persistance et rerun.

Ces deux noms ne rejoignaient pas `X5` avant le contrôle indépendant. Depuis
`ACTION-0042`, et seulement après le verdict externe `VERIFIED`, ils sont les
deux preuves canoniques scellées de `TASK-0025`.

Rejeux de régression sous noms `TASK-0025` : `DR15` pass1/pass2, `J12`
intra-brain, `X11` generic brain. `K11`, `K12`, `L12`, `M12`, `N15`, `H9` et
`EC15` ne sont pas rejoués : cette tranche ne touche ni la composition, ni la
vue composée, ni les relations inter-cerveaux, ni le graphe topographique, ni
les observations de contenu, ni la boucle de mesure. Leurs destinations sont
néanmoins migrées sous `TASK-0025`, parce que la garde `X5` exige qu'aucune
destination runtime ne reste sous un nom scellé.

## 8. Journal d'exécution

### 8.1 Gel documentaire

`TASK-0025` et `DEC-0027` créés et commités **avant** tout code produit,
conformément au §2 et au §11 de la consigne d'orchestration.

### 8.2 Migration runtime X5 — avant tout rejeu

Toutes les destinations runtime sont passées de `TASK-0024-*` à `TASK-0025-*`
avant le premier rejeu : les trois noms scellés, les replays `H9`, `K11`,
`K12`, `L12`, `M12`, `N15`, `EC15`, chaque variante `-abandon`, et la
destination corrective `X11`, qui reste compilée et rejouable. Les **32** noms
protégés n'ont pas été touchés : l'intersection est vidée en déplaçant les
destinations, jamais en réduisant le sceau.

`SEALED_RUNTIME_DESTINATIONS` est de nouveau vide, `protectedDestinations = []`,
`owningTaskId = TASK-0025`, `writesUnderItsOwnTaskOnly = true`, `X5 = 32`.

La garde a par ailleurs été élargie à deux sources d'écriture qu'elle ne tenait
pas : `genericRelationScenario.ts`, qui écrit la preuve `X11`, et le nouveau
`reviewScenario.ts`.

### 8.3 Schéma v4

Migration `v3 → v4` par reconstruction versionnée de `relation_suggestions` :
`CHECK(state IN ('pending','approved','rejected'))` et colonne nullable
`decision_reconsider_cause`, laissée `NULL`. La reconstruction recopie chaque
colonne par son nom, contrôle le nombre de lignes et `pragma_foreign_key_check`
**avant** de committer, et recrée les trois déclencheurs `X3` qu'elle a dû
déposer pour que le `RENAME` puisse reparser le schéma.

Migrations depuis `v1`, `v2` et `v3` toutes exercées; un store neuf naît en
`v4`.

### 8.4 Preuves réelles

| Preuve | Résultat |
|---|---|
| `TASK-0025-SR15-…-pass1.json` | écrite — 3 suggestions core, file ouverte et parcourue au clavier réel, une confirmée, une rejetée, une reportée |
| `TASK-0025-SR15-…-pass2.json` | écrite — nouveau processus, décisions persistées, rerun idempotent |
| `TASK-0025-DR15-…-pass1/pass2.json` | rejeu vert |
| `TASK-0025-J12-intrabrain-relations-regression-webview2.json` | rejeu vert |
| `TASK-0025-X11-generic-brain-webview2.json` | rejeu vert, `outcome = written` |

Chiffres mesurés en `SR15` pass1 : `totalPending = 7` dont 3 core, une seule
page, `limit = 100 = maxLimit`, `hasMore = false`, ordre
`suggestion_key ascending`. `keydownIsTrusted` et `activationIsTrusted` **vrais**
sur les cinq activations mesurées et sur les quatre déplacements « Plus tard »;
`programmaticClickCalls = 0` et `programmaticClickDispatches = 0` partout.
Exactement **une** relation `APPROVED` pour la clé confirmée, **aucune** pour la
rejetée, compte en attente **inchangé** (5 → 5) par « Plus tard ».
`rejectedSuggestionPreservations = 1` et `approvedSuggestionPreservations = 1`
au rerun. `brain-gamma` : store et compte en attente inchangés, digest
inter-cerveaux identique. Empreinte de la source `SR15` identique avant et
après.

En pass2, avant toute action : `dre-v1 = CURRENT`, la relation
`revue/note-1.txt → revue/note-2.txt` de type `revision` est toujours
`APPROVED`, la reportée `dre1:ebaf403cddeba4c7` est la seule suggestion core
encore en attente, la rejetée n'est ni en attente ni établie, et le rerun rend
un état identique.

### 8.5 Incidents de mesure, corrigés dans le scénario

Deux tentatives `SR15` ont été interrompues sans rien publier, et la cause a
été corrigée dans le scénario plutôt que contournée dans le harnais :

1. le scénario émettait son propre `map_open(rebuild)` pendant que la
   composition ouvrait déjà l'index, ce qui sous Windows donne un
   `os error 32` sur le fichier SQLite. Il attend désormais que l'instantané
   réponde au lieu d'ouvrir la carte une seconde fois;
2. la seconde campagne de contenu, placée **après** le dernier run du moteur,
   ouvrait une nouvelle génération et laissait `dre-v1` `STALE`, si bien que la
   passe 2 aurait mesuré un store périmé au lieu d'un store redémarré. Elle est
   maintenant émise avant le rerun.

Le rejeu `DR15` a exigé une troisième correction de mesure, de même nature : il
échantillonnait le DOM du panneau dans le même tick que la commande dont le
panneau n'avait pas encore rendu le résultat. Les assertions attendent
désormais, avec budget, ce qui doit finir par être vrai. Le critère n'est pas
affaibli : une règle qui n'apparaît jamais échoue toujours.

### 8.6 Validations

Rust ciblé relations **44/44**, `rule_engine` **14/14**, `relation_commands`
**18/18**, gardes X5 **9/9**; suite Rust complète **221/221**; suite TypeScript
complète **233/233** dont `runArtifacts` 34/34 et `reviewQueue` 14/14;
`tsc --noEmit`; `vite build`; Tauri debug `--no-bundle`; PowerShell **32/32
refus**, 32 noms uniques, les cinq destinations `TASK-0025` autorisées;
`git diff --check` propre.

### 8.7 Non testé et limites

- À la livraison, `TASK-0025` restait `IMPLEMENTED` : aucun contrôle
  indépendant n'avait encore été rendu, et l'exécuteur ne s'attribuait pas
  `VERIFIED`.
- À la livraison, les deux preuves `SR15` ne rejoignaient pas encore `X5`.
- `K11`, `K12`, `L12`, `M12`, `N15`, `H9` et `EC15` n'ont pas été rejoués —
  décision documentée au §7.
- Aucune politique automatique de réévaluation d'une décision n'existe;
  `decision_reconsider_cause` reste `NULL` partout.
- Aucun état `DEFERRED` persistant : « Plus tard » laisse `PENDING`.
- `DEC-0013/F` demeure bloquante pour l'identité physique persistante; `F-046`
  reste `PROPOSED`.
- La garantie `X10` hors Windows reste non prouvée.

## 9. Contrôle indépendant et scellement

[`ACTION-0042`](../reviews/ACTION-0042-independent-control.md) enregistre le
verdict rendu par l'orchestrateur technique indépendant : `SR1` à `SR15 =
PASS`, `ACTION-0042 = CLOSED`, `TASK-0025 = VERIFIED`, sans réserve corrective
ouverte. Claude Code était l'exécuteur; Codex n'a fait qu'enregistrer le
verdict et appliquer le scellement.

X5 passe de 32 à 34 noms par ajout append-only des deux preuves `SR15`, pass1
puis pass2. Les replays `DR15`, `J12` et `X11` de `TASK-0025` restent non
canoniques et non protégés. Le runtime porte toujours ses destinations
`TASK-0025`; l'intersection protégée contient donc exactement les deux `SR15`,
`owningTaskId = TASK-0025` et `writesUnderItsOwnTaskOnly = false`, état normal
après vérification.
