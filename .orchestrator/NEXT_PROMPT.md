# NEXT_PROMPT — TASK-0038 — V1 Journal-derived Seen/Unseen State

**TARGET_AGENT:** CLAUDE CODE  
**RECOMMENDED_MODEL:** Sonnet 5, high effort  
**STATUS:** READY  
**BRANCH:** `build/v0.2-a22-v1-seen-state`

## /goal

Implémenter intégralement
`docs/tasks/TASK-0038-v1-journal-seen-state.md` selon
`docs/decisions/DEC-0036-journal-derived-seen-state.md`.

La tâche doit rendre persistants et par cerveau :

- l’état vu/non vu d’un changement;
- l’état nouveau/non vu d’un nœud courant, **dérivé du journal**;
- « marquer ce changement vu »;
- « marquer cet élément vu »;
- « tout marquer vu » avec confirmation UI explicite.

Ne pas construire les filtres de carte `F-022`, le watcher `F-030` ni
l’incrémental `F-031`.

## 0 — Préconditions obligatoires

1. Appliquer `AGENTS.md` et `CLAUDE.md`.
2. Basculer explicitement sur
   `build/v0.2-a22-v1-seen-state`.
3. `git fetch origin`.
4. Synchroniser uniquement en fast-forward avec
   `origin/build/v0.2-a22-v1-seen-state`.
5. Vérifier arbre propre.
6. Vérifier que HEAD contient :
   - `ACTION-0061` (TASK-0037 VERIFIED);
   - `ACTION-0063` (public-readiness fermé);
   - `DEC-0036`;
   - `TASK-0038`.
7. Lire **en entier** `DEC-0036` puis `TASK-0038` avant le premier changement.

Si une précondition contredit le dépôt, STOP/BLOCKED et rapporter l’écart. Ne
pas improviser une autre branche ni une autre architecture.

## 1 — Audit avant code

Auditer les implémentations existantes citées par TASK-0038, en particulier :

- le journal v5 et son curseur;
- le dispatcher de migration et M-B;
- `nodes.seen`, `Index::mark_seen`, les vieux chemins prototype
  `mark_node_seen/query_collection_nodes`;
- la projection courante et le panneau contextuel;
- `ChangeJournalPanel`.

Dans `.orchestrator/RESULT.md`, écrire ce qui est **réutilisé**, **adapté** et
**laissé historique**.

Interdiction : réactiver les commandes prototype pour aller plus vite.
La V1 doit utiliser les frontières `map_*` actuelles et `BrainNodeRef`.

## 2 — Source de vérité

Appliquer `DEC-0036` sans dilution :

- `change_events` reste append-only;
- les acquittements sont séparés;
- `nodes.seen` n’est jamais la vérité de `isNew/isUnseen`;
- `new` = CREATED non vu sur nœud courant;
- `unseen` = au moins un événement non vu sur nœud courant;
- aucun auto-mark à la sélection ou à l’ouverture.

Si l’audit démontre qu’un détail SQL proposé par TASK-0038 est mauvais, tu peux
adapter **la forme** en conservant tous ces invariants; documente le choix.

## 3 — Migration v6

Faire le saut v5→v6 via **le même M-B**, sans second chemin.

La migration d’un vrai v5 existant doit baseliner l’état vu/non-vu au dernier
`event_id` déjà présent : historique conservé, mais aucun faux backlog
« non vu » fabriqué au moment où la fonction apparaît.

Conserver les preuves de restauration migration/validation et les scénarios
v3/v4/v5 qui restent supportés par le dispatcher.

## 4 — Mutations et lecture

Implémenter les trois gestes et l’état du nœud avec transactions et isolation
par cerveau. Les commandes Tauri n’acceptent ni chemin ni identité système.

Points à contrôler explicitement :

- event inexistant → refus clair;
- node inexistant → refus clair;
- idempotence;
- mark-all ne voit que les événements commités avant son propre commit;
- événement futur reste non vu;
- curseur journal inchangé et toujours valide après marquage;
- aucun autre cerveau touché.

## 5 — UI

Réutiliser le panneau « Changements » et le panneau contextuel existant.

« Tout marquer vu » doit être **confirmé inline** : aucune mutation sur le
premier clic ni sur Annuler.

Ne pas utiliser seulement la couleur pour Vu/Non vu/Nouveau.

## 6 — Preuves

Les tests de TASK-0038 sont des critères de sortie, pas des suggestions.

Rejouer les suites et le WebView2 réel demandés. L’artefact de preuve doit
rester synthétique et public-safe.

Rejouer aussi :

`scripts/audit-public-readiness.ps1 -AllowRemotes`

et ne pas élargir ses exceptions.

## 7 — Gouvernance

À la fin :

- TASK-0038 = `IMPLEMENTED`, jamais `VERIFIED`;
- aucune TASK-0039;
- pas de watcher/incrémental/filtres de carte;
- pas de PR/merge/tag/release;
- mettre à jour seulement les documents durables demandés;
- `.orchestrator/RESULT.md` complet;
- `NEXT_ACTION` = contrôle indépendant de TASK-0038;
- commit + push sur la branche;
- arbre propre.
