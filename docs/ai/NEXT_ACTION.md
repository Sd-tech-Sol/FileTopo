# Action suivante — ACTION-0113 / correction ciblée B04

**UNE action :** reprendre `TASK-0061` sur **la même branche `build/v0.2-b04-multibrain-shell`**, prompt `.orchestrator/NEXT_PROMPT.md`, agent Claude Code Sonnet/HIGH. Aucune TASK-0062.

- ChatGPT a directement inspecté GitHub au `b964c45359bf2427d38ce177c09119ca5195a417` : travail terminé et poussé, 14 commits, `IMPLEMENTED` par Claude. Code produit limité à CompositionBar.tsx + map.css, tests UI. Preuves : 30 états (13/13 primaires; carte 253,4–496px), 18 états baseline B03, contre-épreuve 9/13, P-19/P-22, tests 787/787 ×2 rapportés (non rejoués indépendamment), CI distante zéro.
- **VERDICT indépendant : NOT VERIFIED / CORRECTION REQUIRED.** B04-O1 : 6 états menu ouvert recouvrent Diagnostics et l'activation de ce groupe n'est pas mesurée. B04-O2 : à 960, statuts refus/index absent **0/35px** visibles; corrections et fermeture hors écran, y compris certaines à 1280 FR. Détails et attentes : `docs/reviews/ACTION-0113-task0061-independent-control.md`.
- Stage A CLOSED / VERIFIED, B01–B03 VERIFIED, Stage B EN COURS, B04 non close. R8, Stage C/D, `main` inchangés.
