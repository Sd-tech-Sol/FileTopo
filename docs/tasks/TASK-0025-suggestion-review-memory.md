# TASK-0025 — Suggestion Review Queue + Human Decision Memory

- **Date :** 2026-09-05
- **Branche :** `build/v0.2-a9-suggestion-review-memory`
- **Base contrôlée :** `7bb98573d115f3423617efa55628f39eb41d31ab`
- **Statut courant :** `IN_PROGRESS`
- **Transitions :** `PROPOSED → APPROVED → IN_PROGRESS`; démarrage par GO
  technique explicite de `.orchestrator/NEXT_PROMPT.md`
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

Ces deux noms **ne rejoignent pas `X5`** : `TASK-0025` reste `IMPLEMENTED`
jusqu'au contrôle indépendant.

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
