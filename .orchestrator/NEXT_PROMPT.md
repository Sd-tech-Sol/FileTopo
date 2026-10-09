# NEXT_PROMPT — TASK-0059 / Stage B B02

**TÂCHE APPROVED, NON COMMENCÉE.**
**Agent : Claude Code — Sonnet / effort HIGH.**
**Branche distante : `build/v0.2-b02-first-screen-map`.**
**Source de vérité :** `docs/reviews/ACTION-0109-task0058-independent-control.md`, `docs/tasks/TASK-0059-stage-b-first-screen-map.md`.

1. Synchronise `origin/build/v0.2-b02-first-screen-map` par **fast-forward uniquement**, confirme la branche/HEAD attendu et un arbre Git propre. Pas de reset, clean, force push, merge/rebase destructif. Si un travail local non prévu existe, STOP.
2. Lis `AGENTS.md`, `docs/ai/START_HERE.md`, `docs/ai/CURRENT_STATE.md`, `docs/ai/NEXT_ACTION.md`, ACTION-0109, puis **l'intégralité** de TASK-0059.
3. Fais d'abord une **mesure visuelle reproductible dans le vrai Tauri/WebView2** du défaut B01-O1 à 960×640 / 1280×800 / 1366×768, sur REAL_ROOT synthétique. La carte est sous la première fenêtre. Une capture à `scrollY=0` et les bounding boxes sont obligatoires avant tout changement.
4. Livre le **plus petit correctif de présentation** qui rende la carte et un nœud de contexte visibles immédiatement à 960×640, sans cacher définitivement les commandes, ni changer backend, Index, IPC, modèles, MapView/algorithme/caméra métier. Utilise et adapte les composants existants. Si cela exige de sortir des fichiers permis ou de casser P-19, **BLOCKED et STOP**.
5. Rejoue les contrôles de la fiche dans WebView2, clavier, FR/EN, clair/sombre, compact/reduced motion, P-22, réouverture et tests frontend. Les tests CSS historiques peuvent être adaptés pour prouver un nouveau comportement, jamais simplement effacés. Publie les échecs et limites.
6. Complète `.orchestrator/RESULT.md` et les docs de mémoire, puis commit/push sur `build/v0.2-b02-first-screen-map`. Statut **IMPLEMENTED** ou **BLOCKED**, **jamais VERIFIED**; aucune TASK-0060 ni Stage C/D ni PR/merge/main.
7. Arrête-toi. ChatGPT vérifiera directement GitHub.

Une nouvelle session `/clear` est adaptée : les décisions, preuves et contraintes sont versionnées.
