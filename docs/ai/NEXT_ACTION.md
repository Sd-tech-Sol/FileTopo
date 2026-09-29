# Action suivante

## Diagnostic indépendant : J12 lui-même ne retrouve plus son pivot sous fenêtre bornée

Branche : `build/v0.2-a34-v1-runtime-legend`.

La stratégie ACTION-0088 (cellule A = harnais TASK-0050, cellule B = replay
`J12`) a été exécutée. Cellule A ferme réellement 21/23 clés atteignables,
reproduit deux fois à l'identique (quatre défauts de harnais corrigés,
jamais exercés en réel avant cette passe). Cellule B (`J12`) échoue
systématiquement, après correction d'un défaut d'amorçage
(`map_not_built: brain-alpha`, corrigé), sur `noeud introuvable:
dossier-a/note-1.txt` : `MapNode::snapshot()` renvoie une vue **bornée**
(`materialize_view`, `DEC-0034`), pas un dump plat, et `J12` cherche son
nœud pivot directement dedans sans jamais révéler de pastille d'agrégat —
une hypothèse vraie avant `DEC-0034`, plus maintenant. Détail complet :
`docs/tasks/TASK-0050-v1-runtime-legend-p10.md` section R.

Choisir entre :

- (a) diagnostiquer/corriger le pivot de `J12` sous fenêtre bornée (scénario
  de test, pas nécessairement le produit);
- (b) revenir à l'option Q.3(b) : une brique synthétique dédiée où les deux
  relations manquantes sont les seules arêtes du nœud choisi.

Aucune TASK-0051. Contrôle indépendant obligatoire sur cellule A (21/23,
quatre corrections de harnais) avant toute nouvelle tentative sur cellule B.

**TASK-0050 reste `BLOCKED`.**
