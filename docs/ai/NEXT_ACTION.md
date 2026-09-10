# Action suivante

## Contrôle indépendant de TASK-0033, sur preuves

`TASK-0033` est `IMPLEMENTED` sur `build/v0.2-a17-v1-topographic-ux`. `DEC-0034`
reste `APPROVED`, inchangée. **Claude Code a exécuté la tâche et ne peut donc
pas rendre le verdict.**

TASK-0033 fait converger la projection topographique vers une carte
sémantique lisible : cible ordinaire de 64 vrais blocs (dossiers d'abord,
ancestry/focus toujours matérialisés même au-delà de cette cible), un
indicateur compact « +N éléments — Voir la suite » à la place des grands
rectangles d'agrégat, et une caméra qui ne réduit plus toute la carte à
chaque changement de projection (`fitView` réservé à l'action explicite
« Ajuster à l'écran » et à la première ouverture; navigation et
« Réinitialiser » recentrent à une échelle lisible sans fit exhaustif).

Action unique suivante : faire contrôler `TASK-0033` par une instance
**distincte de l'exécuteur**, sur preuves, et rendre un verdict.

Ce que ce contrôle doit regarder en priorité :

- que la cible de 64 blocs est un objectif produit et non un nouveau plafond
  de sécurité — `VIEW_BUDGET = 512` doit rester la seule borne dure, et
  `idx_nodes_child_order` (directories d'abord) doit rester la seule raison
  pour laquelle les dossiers l'emportent, sans tri ajouté ailleurs;
- que l'ancestry/focus restent prioritaires même quand ils dépassent 64, et
  qu'aucun `REAL_ROOT` ni élargissement de portée n'a été introduit;
- que l'indicateur compact ne réintroduit aucun vocabulaire interne
  (`view_budget_or_focus`, `outside_current_projection`) dans l'interface;
- que le retrait du `fitView` automatique sur changement de projection amène
  toujours le nouveau focus à l'écran, seulement sans réduire toute la carte
  pour y parvenir;
- **le rejeu WebView2 sur une arborescence synthétique de grande taille n'a
  pas été exécuté par cette passe** — déclaré non testé explicitement, à
  faire par le contrôle ou par une passe ultérieure avant tout `VERIFIED`.

Aucune tâche suivante n'est précréée. Aucune donnée personnelle n'est en jeu.
