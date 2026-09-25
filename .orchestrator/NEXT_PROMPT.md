# NEXT_PROMPT — TASK-0043 — corrective shutdown pass after ACTION-0071

**TARGET_AGENT:** CLAUDE CODE  
**RECOMMENDED_MODEL:** Opus, high effort  
**STATUS:** READY  
**BRANCH:** `build/v0.2-a27-v1-watcher-reconciliation`

## /goal

Fermer uniquement le blocage **P1** de
`docs/reviews/ACTION-0071-task0043-shutdown-recontrol.md`.

La surveillance F-030 est acceptée fonctionnellement. Cette passe ne doit pas
refaire le watcher. Elle doit garantir qu'un shutdown **ne détache jamais un
worker encore vivant**, même si celui-ci attend le `PUBLICATION_LOCK`.

Aucune TASK-0044. Aucun USN. Aucun changement frontend.

## 0 — Préconditions obligatoires

1. Appliquer `AGENTS.md` et `CLAUDE.md`.
2. Basculer explicitement sur
   `build/v0.2-a27-v1-watcher-reconciliation`.
3. `git fetch origin`.
4. Synchroniser uniquement en fast-forward avec
   `origin/build/v0.2-a27-v1-watcher-reconciliation`.
5. Vérifier arbre propre.
6. Vérifier que HEAD contient `ACTION-0071`.
7. Lire ACTION-0071 en entier avant toute modification.

STOP/BLOCKED si une précondition ne tient pas.

## 1 — Portée strictement backend shutdown/cancellation

Interdictions :

- ne pas modifier le parser;
- ne pas modifier coalesce/sémantique des hints;
- ne pas modifier W-B/W-C fonctionnellement;
- ne pas modifier l'UI;
- ne pas modifier les cadences;
- ne pas ajouter de crate;
- ne pas toucher `incremental.rs`;
- ne pas ajouter de TASK-0044.

## 2 — Publication lock annulable côté watcher

Le problème à fermer :

un worker peut attendre `PUBLICATION_LOCK` pendant qu'un geste manuel le tient,
et son callback `cancelled` n'est alors jamais consulté.

Construire une acquisition **watcher-only** qui :

- utilise toujours le même `PUBLICATION_LOCK`;
- teste régulièrement `cancelled()`;
- n'attend jamais indéfiniment dans `Mutex::lock()`;
- retourne une issue distincte `Cancelled` si le watcher est arrêté;
- ne transforme pas un mutex empoisonné en panne permanente.

Une boucle `try_lock` + attente courte est acceptable.

Le chemin manuel peut garder son `.lock()` bloquant.

## 3 — Brancher les DEUX chemins watcher

### W-B

`watch_ops::apply_scopes` doit abandonner proprement si le stop arrive pendant
l'attente du lock.

Aucune lecture/source/SQLite mutation avant d'avoir acquis le lock.

### W-C

`watch_ops::verify_full` doit avoir la même propriété.

Attention : aujourd'hui il appelle `commands::publish_map`, qui acquiert lui-même
le lock avant d'exécuter le callback `cancelled`.

Refactorer **le minimum** pour permettre au watcher d'obtenir le même pipeline
de publication sans attendre un lock non annulable.

Formes acceptables :

- helper `publish_map_with_lock(...)` + variante watcher;
- exposition interne minimale de `publish_locked`;
- autre structure équivalente.

Ne pas dupliquer la logique source observation / application mode / journal.

## 4 — Shutdown sans détachement

Après `request_stop()`, `WatchManager::shutdown` doit **rejoindre tous les
workers qu'il possédait**.

Il ne doit plus exister de branche où un `JoinHandle` encore vivant est simplement
jeté/détaché.

La fermeture doit rester bornée en pratique grâce à :

- stop du reader natif;
- acquisition du publication lock annulable;
- callbacks d'annulation déjà utilisés par les scans watcher.

Le paramètre `patience` peut :

- disparaître si devenu inutile; ou
- rester comme métrique/seuil diagnostique;

mais il ne peut plus autoriser le détachement.

## 5 — Preuve déterministe obligatoire T1

Créer un test qui aurait échoué avec le code actuel :

1. démarrer un watcher jusqu'à WATCHING;
2. faire tenir `PUBLICATION_LOCK` par un autre thread;
3. injecter LOST pour forcer W-C;
4. attendre que le worker soit dans la tentative de publication;
5. appeler `shutdown` avec une patience très courte;
6. **ne pas libérer le lock avant le retour de shutdown**;
7. shutdown doit retourner;
8. status final STOPPED;
9. reader/handle libéré;
10. capturer revision + longueur historique;
11. libérer ensuite le lock;
12. attendre un intervalle significatif;
13. aucune révision tardive, aucun nouvel événement tardif.

Le test doit clairement documenter qu'il falsifie l'ancien comportement de
détachement.

## 6 — Preuve W-B également

Ajouter une preuve analogue ou un test structurel fort démontrant que le chemin
W-B utilise **la même acquisition annulable**.

Préférence : test réel avec un hint ciblé et lock retenu.

Aucun batch partiel.

## 7 — Test natif existant

Rejouer et conserver :

`shutdown_closes_the_native_handle_and_the_operating_system_agrees`

Windows doit encore permettre une ouverture exclusive de la racine après shutdown.

## 8 — Non-régressions

Rejouer au minimum les tests watcher qui couvrent :

- initial W-C;
- changements natifs;
- signal pendant W-B;
- signal pendant W-C;
- perte forcée;
- root absent/revenu;
- Actualiser concurrent;
- shutdown pendant W-C.

Si la logique de réconciliation elle-même n'est pas modifiée, la rafale 10k
complète n'est pas obligatoire dans cette passe; expliquer pourquoi.

## 9 — Validation

- tests ciblés ACTION-0071;
- `cargo test --offline`;
- `pnpm test`;
- `pnpm check`;
- `pnpm build`;
- `cargo build --offline`;
- Clippy avec dette historique séparée;
- `git diff --check`;
- `scripts/audit-public-readiness.ps1 -AllowRemotes`.

Pas de WebView2 requis si aucun code frontend et aucune sémantique produit visible
ne changent.

## 10 — Mémoire durable

Mettre à jour :

- `.orchestrator/RESULT.md`;
- `docs/ai/CURRENT_STATE.md`;
- `docs/ai/HANDOFF.md`;
- `docs/ai/NEXT_ACTION.md`;
- `docs/ai/VALIDATION.md`;
- `docs/ai/CHANGELOG_AI.md`;
- TASK-0043 reste `IMPLEMENTED`, jamais auto-`VERIFIED`.

`NEXT_ACTION` = contrôle indépendant du correctif ACTION-0071.

## 11 — Gouvernance

- aucune TASK-0044;
- aucun USN;
- aucun PR/merge/tag/release;
- push uniquement sur la branche actuelle;
- arbre propre à la fin.
