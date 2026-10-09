# Action suivante — ACTION-0111 / correction de TASK-0060

**UNE action seulement :** exécuter **la correction ciblée de B03-O1 sur la même branche `build/v0.2-b03-primary-chrome`** par Claude Code Sonnet/HIGH selon `.orchestrator/NEXT_PROMPT.md`. Ne pas créer TASK-0061.

- Revue indépendante GitHub au `79128682d61cedf22b39ea18fb1f022c33149c39` : 13 primaires avec aire cliquable dans 18 états, mais **seulement 10/13 entièrement visibles au pire**. Les trois actions principales sont rognées à **20/35px** à 960x640 confortable; les résumés avancé/diagnostics sont invisibles sans défilement de la bande (25/70px sous pli). Critère visuel de B03 **non satisfait** : `TASK-0060 = IMPLEMENTED / NOT VERIFIED — CORRECTION REQUIRED`.
- Bons résultats conservés : 59 commandes dans DOM; trois disclosures clavier; carte 240–474px; caméra et P-19/P-22 stables; 770/770 tests rapportés deux fois. Pas de CI distante ni test relancé par ChatGPT.
- L'audit de correction est `docs/reviews/ACTION-0111-task0060-independent-control.md`. Demander `primaryContractSatisfiedWhole=true` sur 18 états et un point d'entrée explicite aux outils avancés visible dès l'ouverture à 960×640.
- Stage A CLOSED; B01 et B02 VERIFIED; B03 non VERIFIED; Stage B EN COURS; R8/Stage C/D inchangés, pas de PR/merge main.
