# NEXT_PROMPT — TASK-0025 / file de révision + mémoire des décisions

**TARGET_AGENT:** CLAUDE  
**STATUS:** READY  
**OWNER:** orchestrateur technique  
**TASK:** `TASK-0025 — Suggestion Review Queue + Human Decision Memory`  
**MODE:** exécution autonome depuis le dépôt

> Cette tranche reste entièrement fonctionnelle. **Aucune refonte visuelle**, aucun changement de thème/fond du graphe, aucune IA/RAG/vector DB/extraction de contenu. Le polish graphique viendra plus tard, après stabilisation fonctionnelle.

## /goal

Implémenter la tranche suivante proposée par `TASK-0021 §6` après le moteur `F-043` :

- **F-044 — file de révision des suggestions**;
- **F-045 — mémoire des décisions humaines sur les suggestions**.

L'utilisateur doit pouvoir traiter rapidement les suggestions d'un cerveau par une file simple :

`[ Confirmer ]  [ Rejeter ]  [ Plus tard ]`

avec une explication vérifiable de chaque suggestion.

**Confirmer** crée exactement une relation `APPROVED` via le flux déjà vérifié.  
**Rejeter** mémorise la décision et ne crée aucune relation.  
**Plus tard** passe simplement à la suggestion suivante en laissant l'élément `PENDING`; **aucun état persistant `DEFERRED` n'est ajouté en v1**, puisque `DEC-0021` dit de ne l'introduire que si le besoin est démontré.

Un rejet doit survivre au redémarrage et empêcher qu'une suggestion identique soit reproposée indéfiniment lors d'un nouveau run inchangé du moteur.

---

## 0 — synchronisation et préconditions obligatoires

Appliquer les protocoles projet de début de session.

Avant toute modification :

1. checkout local attendu : `build/v0.2-a8-deterministic-relation-engine`;
2. arbre local propre;
3. `git fetch origin`;
4. fast-forward uniquement vers `origin/build/v0.2-a8-deterministic-relation-engine`;
5. le HEAD obtenu doit être le commit d'orchestration qui contient **ce** fichier;
6. son parent direct doit être exactement :
   `b084de786890af9cca4bf1a54fe9796f809af62d`;
7. `TASK-0024 = VERIFIED`;
8. `ACTION-0041 = CLOSED`;
9. `X5 = 32`;
10. `main = 91bbe90f0f99026c28cd345784d4f579a0016db2`;
11. `TASK-0025` doit être libre;
12. `DEC-0027` doit être libre;
13. aucune tâche ne doit être `IN_PROGRESS`.

Si divergence, autre modification locale, fast-forward impossible, ou identifiant déjà occupé : **STOP / BLOCKED**.

---

## 1 — nouvelle branche

Créer depuis le commit d'orchestration courant :

`build/v0.2-a9-suggestion-review-memory`

Publier la branche normalement, sans toucher `main`.

---

## 2 — gel AVANT code

Avant toute implémentation produit, créer et committer un gel documentaire :

- `docs/tasks/TASK-0025-suggestion-review-memory.md`;
- `docs/decisions/DEC-0027-suggestion-review-memory.md`.

Statut de départ : `APPROVED → IN_PROGRESS` seulement après le gel.

Le gel doit reprendre exactement les règles de cette instruction et référencer :

- `DEC-0021`;
- `TASK-0021 §6`, tranche proposée #3;
- `TASK-0024 VERIFIED / ACTION-0041`;
- `F-044` et `F-045`.

Ne pas réécrire les décisions historiques.

---

## 3 — frontière sémantique obligatoire

Conserver strictement :

1. une **suggestion n'est jamais une relation établie**;
2. une relation établie reste exclusivement `DETERMINISTIC` ou `APPROVED`;
3. aucun état ou provenance `AI`, `SUGGESTED`, `REJECTED_RELATION`, etc.;
4. un rejet ne crée aucune relation et ne modifie aucune source;
5. le bouton `Plus tard` ne décide rien : l'élément reste `PENDING`;
6. aucune règle déterministe existante n'est modifiée dans son sens;
7. aucune suggestion n'est auto-approuvée;
8. aucune relation inter-cerveaux n'est inventée;
9. aucune donnée réelle.

---

## 4 — migration X5 / runtime AVANT tout rejeu

`TASK-0024` est maintenant `VERIFIED`; ses trois preuves canoniques sont protégées.

Avant de lancer **le moindre scénario qui écrit sous `docs/performance/runs/`**, migrer toutes les destinations runtime encore nommées `TASK-0024-*` vers des noms `TASK-0025-*`.

Cela inclut toutes les destinations réellement présentes dans `RUNTIME_RUN_ARTIFACTS`, y compris les replays et la destination corrective X11 si le scénario reste compilé/rejouable.

Règles :

- ne jamais modifier les 32 noms de `PROTECTED_RUN_ARTIFACTS`;
- `X5` reste exactement **32** pendant toute `TASK-0025`;
- après migration, `SEALED_RUNTIME_DESTINATIONS = []`;
- toutes les destinations runtime doivent appartenir à `TASK-0025`;
- `owningTaskId = TASK-0025`;
- `protectedDestinations = []`;
- `writesUnderItsOwnTaskOnly = true`.

Adapter les tests de garde avant tout replay.

Ne modifier aucun JSON protégé historique.

---

## 5 — schéma SQLite v4 : états humains

Le store intra-relations actuel est schema v3 et `relation_suggestions.state` n'accepte que `pending` / `approved`.

Faire une migration **versionnée v3 → v4**, sans perte de données.

### États persistants v1

Exactement :

- `pending`;
- `approved`;
- `rejected`.

**Ne pas ajouter `deferred` en base.**

### Données de décision

Une suggestion décidée doit conserver au minimum, directement dans la ligne ou via une structure versionnée équivalente et auditable :

- `suggestion_key`;
- `rule_name` et `rule_version` quand disponibles;
- `source_key`;
- `target_key`;
- `relation_type`;
- décision (`approved` ou `rejected`);
- `decided_unix_ms`;
- producteur;
- explication/signaux déjà présents;
- un champ nullable permettant de documenter une éventuelle cause future de réévaluation, **sans inventer aujourd'hui une politique automatique de réévaluation**.

La migration doit préserver bit-for-bit la sémantique des rows legacy et des relations déjà `APPROVED`.

---

## 6 — rejet explicite

Ajouter une opération backend explicite de rejet, dans la couche de commandes de relations.

Comportement :

- prend `brain_id` + `suggestion_key`;
- refuse une suggestion absente;
- refuse une suggestion déjà décidée;
- si suggestion core `STALE`, conserver une politique cohérente avec l'approbation actuelle : ne pas permettre une décision sur une suggestion core périmée sans que le moteur soit actualisé;
- met l'état à `rejected` et `decided_unix_ms`;
- ne crée aucune ligne dans `relations_approved`;
- ne crée aucune relation déterministe;
- ne modifie aucune autre suggestion;
- n'affecte aucun autre cerveau;
- retourne un état/overview permettant à l'UI de se rafraîchir depuis la vérité du store.

La commande doit être testée sur une suggestion core et sur le périmètre legacy sans généraliser les règles legacy.

---

## 7 — mémoire de rejet dans la reconciliation `dre-v1`

Modifier la reconciliation du moteur de manière minimale et explicite :

- une suggestion core `approved` de même identité reste préservée comme aujourd'hui;
- une suggestion core `rejected` de même identité reste **rejected**;
- elle n'est jamais recréée `pending` lors d'un rerun inchangé;
- un rejet doit rester stocké même si le run courant ne repropose plus temporairement cette suggestion, afin que la mémoire existe lorsqu'elle réapparaît avec la même identité;
- une suggestion encore `pending` peut continuer à être reconciliée normalement;
- aucune décision d'un autre cerveau ne compte;
- aucun rejet legacy/core ne devient une relation.

Pour le moteur `dre-v1` actuel, l'identité déterministe déjà produite par `suggestion_key` (règle/version + brain + endpoints + type) est la base de la mémoire.

**Ne change pas la formule actuelle des `suggestion_key` de TASK-0024 uniquement pour cette tranche**, sauf si une contradiction technique prouvée l'exige. Un changement gratuit casserait les décisions déjà persistées.

La politique générale « quand une ancienne décision doit être reconsidérée parce que des signaux ont changé » reste **hors scope v1** conformément à `DEC-0021`; le schéma doit seulement pouvoir l'enregistrer plus tard.

Le report du moteur peut ajouter des compteurs explicites du genre `rejectedSuggestionPreservations`, mais ne renomme ni ne retire les compteurs déjà vérifiés sans nécessité.

---

## 8 — API file de révision

Créer une API backend générique par cerveau pour obtenir la file `PENDING`.

Elle doit :

- fonctionner pour n'importe quel `BrainRecord` valide;
- lire le store du cerveau seulement;
- retourner un `totalPending` exact;
- retourner des éléments dans un ordre stable et documenté;
- être bornée/paginée; limite maximale raisonnable et explicite, pas de chargement illimité silencieux;
- chaque item doit contenir :
  - source;
  - cible;
  - type proposé;
  - `suggestion_key`;
  - producteur;
  - règle/version quand disponibles;
  - explication FR/EN;
  - signaux structurés disponibles;
  - état `PENDING`.

Aucun contenu privé de fichier n'est nécessaire ni ajouté à cette API.

Le compteur ne doit pas mélanger suggestions approuvées/rejetées.

---

## 9 — UI fonctionnelle : « Relations à confirmer »

Ajouter une file de révision simple dans l'interface actuelle, sans refonte graphique.

Objectif UX fonctionnel :

- une entrée visible du type **« N relations à confirmer »** pour le cerveau focalisé/sélectionné;
- ouverture d'une file ou panneau simple;
- un item actif à la fois est acceptable;
- afficher clairement : source, cible, type proposé, pourquoi, règle/version, signaux;
- trois actions principales exactement :
  - `Confirmer`;
  - `Rejeter`;
  - `Plus tard`.

### Confirmer

Réutiliser le chemin `APPROVED` déjà vérifié. Après action :

- suggestion disparaît de la file pending;
- relation `APPROVED` apparaît exactement une fois;
- compte pending diminue depuis la réponse backend, jamais par simple incrément optimiste.

### Rejeter

Après action :

- suggestion disparaît de la file pending;
- aucune relation n'apparaît;
- décision persistée;
- compte pending diminue depuis le backend.

### Plus tard

- aucun appel de mutation requis;
- aucune décision persistée;
- suggestion reste `PENDING`;
- passer à la prochaine suggestion localement;
- lorsque la file est rechargée, elle peut réapparaître parce qu'elle est toujours en attente.

### Accessibilité minimale obligatoire

- contrôles natifs `button`;
- ordre clavier cohérent;
- aucun comportement dépendant uniquement de la couleur;
- état/action lisible en texte.

Pas de design-system nouveau dans cette tranche.

---

## 10 — isolation multi-cerveaux

Prouver explicitement :

- Alpha et Gamma/Bêta ont des décisions indépendantes;
- rejeter une suggestion dans un cerveau ne modifie ni le store, ni le compteur, ni l'état de la suggestion équivalente d'un autre cerveau;
- aucune clé d'endpoint d'un autre cerveau n'entre dans une décision;
- redémarrage/rebuild du map index ne perd pas la décision humaine, puisque le store relation reste hors index reconstructible.

---

## 11 — critères fonctionnels gelés TASK-0025

Numéroter dans la fiche de tâche des critères `SR1` à `SR15` (ou autre préfixe unique cohérent) couvrant au minimum :

1. migration schema v3 → v4 sans perte;
2. trois états persistants exacts `pending/approved/rejected`;
3. aucun `deferred` persistant;
4. queue paginée avec compteur exact;
5. détails explicables complets;
6. Confirmer → exactement une relation `APPROVED`;
7. Rejeter → aucune relation;
8. Plus tard → reste `PENDING`;
9. rerun moteur inchangé → rejet non reproposé pending;
10. rerun moteur inchangé → approbation toujours préservée;
11. redémarrage réel → décisions conservées;
12. isolation stricte entre cerveaux;
13. source read-only;
14. X5 = 32, runtime TASK-0025, aucune collision protégée;
15. vrai WebView2 avec actions utilisateur fiables et aucune mutation programmatique simulant les décisions.

Le gel doit exister dans un commit **avant** le premier commit de code produit.

---

## 12 — preuve réelle WebView2 TASK-0025

Créer un scénario synthétique dédié, hors données réelles et sans modifier les quatre fixtures gelées.

Publier deux preuves TASK-0025, pass1/pass2, sous des noms nouveaux appartenant à TASK-0025, par exemple :

- `TASK-0025-SR15-suggestion-review-memory-webview2-pass1.json`;
- `TASK-0025-SR15-suggestion-review-memory-webview2-pass2.json`.

Ces noms **ne rejoignent pas X5 maintenant** : TASK-0025 restera `IMPLEMENTED` jusqu'au contrôle indépendant.

### Pass1 — processus réel

Sur un fresh variant :

- produire plusieurs suggestions core synthétiques contrôlées;
- ouvrir la file;
- confirmer une suggestion par vraie interaction clavier;
- rejeter une autre par vraie interaction clavier;
- utiliser `Plus tard` sur une troisième par vraie interaction clavier;
- `keydownIsTrusted = true` / activation réelle pour les boutons mesurés;
- `programmaticClickCalls = 0` et `programmaticClickDispatches = 0`;
- confirmer que :
  - la confirmée est relation `APPROVED` exactement une fois;
  - la rejetée n'est aucune relation;
  - la « plus tard » reste `PENDING`;
  - un rerun `dre-v1` inchangé ne ressuscite pas la rejetée;
  - la confirmée reste approuvée;
  - la pending reste pending;
  - source inchangée;
  - aucun store d'un autre cerveau n'est modifié.

### Pass2 — vrai restart

Relancer un **nouveau processus WebView2** sur le même variant :

- prouver la persistance de `APPROVED` et `REJECTED`;
- prouver que la queue pending contient encore la suggestion laissée « Plus tard » et pas la rejetée/approuvée;
- rerun moteur inchangé;
- même résultat après rerun;
- processus fermé réellement.

---

## 13 — régressions

Cette tranche touche le store de relations, l'approbation, le moteur et l'UI relations. Rejouer sous des **noms TASK-0025** au minimum :

- DR15 pass1/pass2;
- J12 intra-brain;
- X11 generic brain si le chemin générique est directement impacté par les changements;

et ajouter les tests unitaires/intégration nécessaires pour :

- migrations v1/v2/v3 → v4;
- legacy seed;
- core reconciliation;
- approval;
- rejection;
- queue pagination;
- isolation.

Ne rejouer K11/K12/L12/M12/N15/H9/EC15 que si une dépendance directe réellement modifiée le justifie; documenter la décision.

Aucune preuve historique protégée n'est modifiée.

---

## 14 — validations minimales

Exécuter :

- tests Rust ciblés relations/rule_engine/review queue;
- suite Rust complète;
- suite TypeScript complète;
- `pnpm check`;
- `pnpm build`;
- Tauri debug `--no-bundle`;
- vrai WebView2 SR15 pass1/pass2;
- replays TASK-0025 requis ci-dessus;
- tests X5/parité des gardes;
- `git diff --check`.

`CARGO_INCREMENTAL=0` autorisé si nécessaire; aucun `cargo clean`, aucune suppression `target`.

---

## 15 — invariants qui restent hors scope

Ne pas implémenter :

- `F-046` identité physique persistante;
- `VolumeSerialNumber + FileId` tant que `DEC-0013/F` bloque;
- extraction de contenu;
- recherche sémantique;
- embeddings/vector DB;
- RAG/GraphRAG;
- LLM/AI/BYOK;
- permissions/mode équipe;
- watcher/incrémental;
- refonte graphique, React Flow, ELK, thème clair/sombre;
- données réelles.

Le fond noir du graphe et le système visuel sont explicitement reportés à la passe graphique future.

---

## 16 — documentation / état final

Mettre à jour :

- `TASK-0025`;
- `DEC-0027`;
- `docs/product/FEATURE_MATRIX.md`;
- `docs/ai/CURRENT_STATE.md`;
- `docs/ai/NEXT_ACTION.md`;
- `docs/ai/HANDOFF.md`;
- `docs/ai/VALIDATION.md`;
- `docs/ai/CHANGELOG_AI.md`;
- `.orchestrator/RESULT.md`;
- `ROADMAP.md` uniquement si une mise à jour factuelle de l'état devient nécessaire, sans réécrire l'ordre A→D.

État final attendu :

- `TASK-0025 = IMPLEMENTED`, jamais auto-attribuée `VERIFIED`;
- `F-044 = IMPLEMENTED — contrôle indépendant requis`;
- `F-045 = IMPLEMENTED — contrôle indépendant requis`;
- `F-043` reste vérifiée par TASK-0024;
- `F-046` reste `PROPOSED` avec sa fondation contenu déjà vérifiée;
- X5 reste 32;
- aucune nouvelle réserve auto-fermée;
- aucune `TASK-0026` créée.

`NEXT_ACTION` = contrôle indépendant de TASK-0025.

---

## 17 — RESULT.md

```text
TASK_ID: TASK-0025 — suggestion review + decision memory
AGENT: CLAUDE
RESULT: DONE | BLOCKED | FAILED
BRANCH: build/v0.2-a9-suggestion-review-memory
FINAL_HEAD: <commit substantif final>

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
- non-Windows X10 guarantee remains unproven
- no persistent DEFERRED state in v1; Plus tard leaves PENDING

NEXT_ORCHESTRATOR_DECISION:
- contrôle indépendant TASK-0025
```

---

## 18 — Git / sécurité / arrêt

Aucun :

- merge `main`;
- PR;
- release;
- tag;
- label;
- force push;
- rebase/reset destructif;
- données réelles;
- suppression de preuve protégée;
- modification d'un JSON X5;
- modification de la source analysée.

Commit/push sur la nouvelle branche uniquement.

Appliquer le protocole de fermeture de session, rapport terminal court, puis arrêt.