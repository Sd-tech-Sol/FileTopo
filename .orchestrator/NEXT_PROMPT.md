# NEXT_PROMPT — TASK-0048 — V1 Safe Exclusion Policy

**TARGET_AGENT:** CODEX
**RECOMMENDED_MODEL:** GPT-5.6 Sol
**RECOMMENDED_EFFORT:** High
**STATUS:** READY
**BRANCH:** `build/v0.2-a32-v1-safe-exclusion-policy`

## Objectif unique

Exécute intégralement
`docs/tasks/TASK-0048-v1-safe-exclusion-policy.md`
selon
`docs/decisions/DEC-0046-safe-exclusion-policy-boundary.md`.

F-005 seulement. Aucune TASK-0049.

## 0 — préconditions

1. Applique `AGENTS.md` et les instructions Codex du repo.
2. Basculer explicitement sur
   `build/v0.2-a32-v1-safe-exclusion-policy`.
3. `git fetch origin`.
4. Synchroniser uniquement en fast-forward avec
   `origin/build/v0.2-a32-v1-safe-exclusion-policy`.
5. Vérifier arbre propre.
6. Vérifier présence de :
   - ACTION-0079;
   - ACTION-0080;
   - DEC-0046;
   - TASK-0048.
7. Lire DEC-0046, TASK-0048, ACTION-0080 et RESULT actuel.

STOP/BLOCKED si une précondition est fausse.

## 1 — audit avant code

Ne code rien avant d'avoir tracé :

- initial build;
- Actualiser;
- Reconstruire;
- `scan_tree_controlled`;
- `observe_entry`;
- W-B;
- W-C;
- hints watcher;
- publication + journal;
- stockage `catalog_meta`.

Écris la conclusion dans RESULT avant de choisir le chemin d'application d'une
nouvelle politique.

Point critique : **un changement de politique d'exclusion n'est pas un
changement de la source**. Il ne doit jamais produire de faux événements
CREATED/DELETED/etc.

Ne présume pas que Reconstruire a déjà cette propriété : prouve-la dans le code
et les tests.

## 2 — architecture imposée

- aucune dépendance `ignore` / `globset`;
- aucune wildcard;
- règles = sous-arbres relatifs exacts;
- stockage brain-scoped/versionné dans `catalog_meta`;
- backend autoritaire;
- lecture + remplacement complet de policy;
- scanner/refresh/rebuild/W-B/W-C/watcher = même policy;
- reparse/symlink = sécurité intégrée toujours active;
- aucun chemin absolu dans DTO/UI/logs publics;
- aucune nouvelle base/table/store.

## 3 — cohérence policy / Index

C'est la partie la plus risquée.

Tu dois choisir le plus petit mécanisme qui garantit :

- politique persistée;
- Index correspondant ou état explicitement « application requise »;
- dernier Index fiable conservé sur échec;
- aucune fausse entrée de journal lors d'un changement de policy;
- watcher cohérent avec la policy effective.

N'invente pas une transaction inter-DB inexistante.

Si une application immédiate propre nécessite une grosse architecture,
implémente plutôt une sémantique explicite et testée de policy enregistrée /
application requise, visible dans l'UI. Mais essaie d'abord de réutiliser le
chemin Reconstruire/rebase existant si sa sémantique réelle convient.

Documente la décision dans RESULT.

## 4 — UI minimale

Surface brain-scoped dans MapApp :

- Exclusions;
- liste;
- champ chemin relatif;
- Ajouter;
- Retirer;
- explication sous-arbre;
- note reparse/symlink;
- FR/EN;
- clavier/focus/contraste conformes TASK-0047.

Pas de gros écran Settings.

## 5 — preuves obligatoires

Rust + TypeScript + vrai WebView2.

Le vrai scénario doit prouver :

- A/C même source, policy différente;
- B autre source;
- persistance au restart;
- add/remove par UI;
- règle refusée = aucun optimistic state durable;
- modification sous exclusion ignorée par watcher;
- modification hors exclusion réconciliée normalement;
- politique modifiée = aucun faux événement journal source;
- source absente = policy toujours gérable, dernier Index fiable;
- SHA-256 source inchangé;
- aucune fuite de chemin absolu.

Artefact :
`docs/performance/runs/TASK-0048-webview2.json`.

## 6 — tests de falsification

Exécute les sabotages TASK-0048 §M. Le test `foo` vs `foobar` est obligatoire :
aucun préfixe texte naïf.

## 7 — dépendances et sécurité

N'ajoute aucune dépendance externe pour cette tranche.

Si tu crois qu'une dépendance est réellement nécessaire, STOP et écris BLOCKED
avec justification au lieu de l'ajouter.

## 8 — non-régression

Ne touche pas hors nécessité démontrée :

- identité stable;
- bounded projection;
- resume;
- FR/EN;
- accessibilité;
- content signals/relations;
- watcher hors intégration policy;
- journal hors mécanisme nécessaire pour distinguer policy vs source.

Pas de refactor opportuniste.

## 9 — validation

Exécute tout TASK-0048 §L.

Clippy : distingue dette historique et nouvelle dette.

Audit public obligatoire.

## 10 — gouvernance

À la fin :

- TASK-0048 = IMPLEMENTED, jamais auto-VERIFIED;
- F-005 = IMPLEMENTED, jamais auto-VERIFIED;
- F-006/F-014/P-19 inchangés;
- aucune TASK-0049;
- NEXT_ACTION = contrôle indépendant de TASK-0048;
- commit + push;
- arbre propre.

`.orchestrator/RESULT.md` doit être compact mais contenir :
- audit avant code;
- architecture réellement retenue;
- preuves exécutées;
- falsifications;
- limites;
- HEAD final;
- décision attendue de l'orchestrateur.
