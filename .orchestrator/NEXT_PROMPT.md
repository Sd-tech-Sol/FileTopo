# NEXT_PROMPT — TASK-0051 corrective stale-core

**TARGET_AGENT:** CLAUDE CODE
**RECOMMENDED_MODEL:** Claude Sonnet 5.5
**RECOMMENDED_EFFORT:** Medium
**STATUS:** READY
**BRANCH:** `build/v0.2-a35-v1-approved-relation-revocation`

Objectif unique : une relation humaine `APPROVED` issue du moteur doit être
révocable même si le moteur est `STALE`.

1. Lis ACTION-0093, DEC-0049 §I, DEC-0026 §D.
2. Dans `relation_commands::revoke_relation`, retire uniquement la garde
   `core-rule-engine && !is_current`.
3. Ne change pas la garde stale de `approve_suggestion`.
4. Ne change pas le masquage des sorties automatiques core stale.
5. Ajoute un test de commande : APPROVED core -> moteur STALE -> revoke réussit
   et store revient pending.
6. Gère le focus : en STALE la pending core peut être masquée; ne cherche pas un
   bouton approve absent. Focus sûr, préférence sur `Analyser les relations`.
   Le cas CURRENT doit garder son focus actuel vers la suggestion réapparue.
7. Réutilise `dreScenario.ts` / DR15 pour une preuve WebView2 réelle :
   CURRENT -> suggestion core -> approve clavier -> rendre STALE sans rerun ->
   APPROVED toujours visible + bouton revoke -> revoke clavier -> relation
   absente, suggestion store pending, timestamp NULL, moteur toujours STALE,
   pending stale non présentée comme actuelle, focus sûr -> rerun explicite.
8. Sépare explicitement toute mutation de fixture utilisée pour créer STALE de
   l'empreinte source/Index autour du geste revoke.
9. Falsification : réintroduire temporairement la garde stale doit faire échouer
   la preuve; restaurer puis PASS.
10. Mets à jour `TASK-0051-webview2.json` avec `staleCoreRevocation`.
11. Rejoue suites pertinentes, build Tauri, audit public.
12. Fin : TASK-0051 IMPLEMENTED/candidate re-control, jamais VERIFIED;
    P-19 inchangée; aucune TASK-0052; commit+push; arbre propre.
