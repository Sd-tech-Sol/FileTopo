# Action suivante

## TASK-0033 — passe PRODUCT ACCEPTANCE WebView2

`ACTION-0050` a contrôlé indépendamment la livraison de `TASK-0033`. Le code est cohérent avec `DEC-0034`, mais **TASK-0033 reste `IMPLEMENTED`, pas `VERIFIED`**, parce que le rejeu produit WebView2 obligatoire n'a pas été exécuté.

Le contrôle indépendant confirme sur lecture du code :

- `VIEW_BUDGET = 512` reste la borne dure; `ORDINARY_MATERIAL_TARGET = 64` est seulement la cible visuelle ordinaire;
- ancestry/focus restent prioritaires;
- la priorité dossiers repose sur l'ordre canonique existant, sans nouveau tri parallèle;
- les agrégats sont rendus comme pastilles compactes avec vocabulaire utilisateur;
- les changements de projection utilisent `recenterOnFocus` au lieu d'un `fitView` global;
- la première ouverture et Réinitialiser utilisent `readableView`; `Ajuster` reste l'action explicite de fit global;
- aucune nouvelle architecture, aucun chemin absolu IPC ni corpus complet frontend n'a été introduit.

**Blocage unique avant VERIFIED :** acceptance WebView2 réelle sur arborescence synthétique >= 5 000 éléments, au minimum à 1366×768 et 1920×1080, avec validation de la lisibilité, pan/zoom, navigation progressive, relations, borne, absence de fuite de chemin et 0 erreur console fatale.

Action unique suivante : exécuter la passe `TASK-0033 / PRODUCT ACCEPTANCE` décrite dans `.orchestrator/NEXT_PROMPT.md`, corriger uniquement les défauts observés dans cette portée, puis remettre le résultat à un nouveau contrôle indépendant.

Aucune `TASK-0034` ne doit être créée avant ce recontrôle.
