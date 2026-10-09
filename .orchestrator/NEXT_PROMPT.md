# NEXT_PROMPT — TASK-0060 / Stage B B03

**Une seule tâche APPROVED, NOT STARTED.**
**Branche :** `build/v0.2-b03-primary-chrome`
**Base requise :** `f5da1d41226c7fcf34a24351af8fe55b3bb4525b`
**Agent conseillé :** Claude Code, Sonnet / effort HIGH.
**Source de vérité :** `docs/reviews/ACTION-0110-task0059-independent-control.md` et `docs/tasks/TASK-0060-stage-b-primary-chrome.md`.

1. Synchronise `origin/build/v0.2-b03-primary-chrome` en **fast-forward uniquement**, confirme un worktree propre et le HEAD attendu après le commit documentaire ACTION-0110. Pas de reset/clean/force push.
2. Lis `AGENTS.md`, `docs/ai/START_HERE.md`, `CURRENT_STATE.md`, `NEXT_ACTION.md`, ACTION-0110, TASK-0060 **en entier**, puis les références UX et le harnais WebView2 cité.
3. La B02 est VERIFIED, mais ses trois régions défilantes masquent les commandes primaires (B02-O1). Fais d'abord un inventaire des commandes/test IDs et des dépendances tests + un relevé **avant** avec captures en vrai WebView2.
4. Réorganise **minimement** primaire/avancé dans les fichiers UI autorisés. Conserve tous les contrôles, les intitulés FR/EN, la navigabilité clavier et la projection/caméra. Mesure au moins 240px de carte immédiatement visible dans chaque état; recherche, changement/activation cerveau et caméra facilement accessibles. Mesure l'amélioration, ne l'invente pas.
5. Exécute les campagnes après, compare les preuves, tests complets, P-19/P-22 ciblés, effets sur tests existants. Arrête **BLOCKED** si hors-scope, fuite source, perte de commande, échec inexpliqué, ou absence de preuves.
6. Complète `.orchestrator/RESULT.md` (`IMPLEMENTED` ou `BLOCKED`, jamais `VERIFIED`), docs état/validation/HANDOFF, commit/push **B03 uniquement**, puis STOP. Ne crée pas TASK-0061, ne commence pas Stage C/D, ne fusionne rien.

`/clear` au début d'une nouvelle session est acceptable : toute la mémoire nécessaire est versionnée dans GitHub.
