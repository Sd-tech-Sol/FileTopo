# Action suivante

## Contrôle indépendant de TASK-0032

`TASK-0032` est `IMPLEMENTED` sur `build/v0.2-a16-v1-real-root`, gel `c3507bf`
parent direct du premier commit de code. `DEC-0033` est `APPROVED`.
**Claude Code l'a exécutée et ne peut donc pas rendre le verdict.**

Action unique suivante : faire contrôler `TASK-0032` par une instance
**distincte de l'exécuteur**, sur preuves, et rendre un verdict.

Ce que le contrôle doit regarder en priorité :

- que **rien** dans cette tranche n'a lu, listé ou touché une donnée
  personnelle : toutes les arborescences analysées sont créées par les preuves
  elles-mêmes;
- que le chemin absolu d'une racine réelle ne quitte jamais le catalogue local
  — `RR3`, et la garde `absolutePathLeak` du rejeu WebView2, qui inspecte aussi
  le fichier d'index et le journal de l'hôte;
- qu'aucune commande exposée au WebView n'accepte un chemin, la réserve `X2`
  ayant été **levée** par `DEC-0033` I et remplacée par cette garantie plus
  étroite;
- que le cycle `DEC-0032` est intact : ouvrir ne lit pas la source, actualiser
  et reconstruire sont explicites, un échec conserve le dernier index ouvrable;
- que la migration du catalogue ne peut rien perdre, y compris quand elle
  échoue;
- que le refus large des index sans binding — `map_source_mismatch` — est bien
  un refus et jamais une suppression.

Aucune tâche suivante n'est précréée. `R-T30-5` n'est traitée que dans la
portée `REAL_ROOT` **de test** : toute première utilisation d'un vrai cerveau
reste un point d'arrêt réservé à Sébastien, et n'est pas demandée ici.
