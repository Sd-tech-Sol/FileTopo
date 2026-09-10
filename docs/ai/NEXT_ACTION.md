# Action suivante

## Contrôle indépendant de TASK-0032, sur la version corrigée

`TASK-0032` reste `IMPLEMENTED` sur `build/v0.2-a16-v1-real-root`, gel `c3507bf`
parent direct du premier commit de code. `DEC-0033` est `APPROVED`, **corrigée**
en `D`, `H` et `I`. **Claude Code a exécuté la tâche et sa passe corrective, et
ne peut donc pas rendre le verdict.**

Le premier contrôle indépendant avait trouvé deux défauts bloquants. **Les deux
étaient réels et sont corrigés :**

- **A** — `dialog:allow-open` exposait `plugin:dialog|open` à la page, avec un
  `defaultPath` entrant et les chemins choisis en retour. La capacité porte
  désormais `core:default` seul; le refus est prouvé au repos et **à
  l'exécution** dans WebView2.
- **B** — un index antérieur à `DEC-0033` était refusé sur tous les chemins et
  ne pouvait plus jamais être republié. Ouvrir et republier posent maintenant
  des questions distinctes, et une voie de compatibilité étroite, interdite aux
  `REAL_ROOT`, rend la promesse de `DEC-0033` D exécutable.

Action unique suivante : refaire contrôler `TASK-0032` par une instance
**distincte de l'exécuteur**, sur preuves, et rendre un verdict.

Ce que ce contrôle doit regarder en priorité :

- que la correction A est complète : aucune commande de plugin atteignable
  depuis la page, et le sélecteur natif toujours fonctionnel par la seule
  commande sans argument. **La limite déclarée ici est que l'appel Rust au
  dialogue n'est pas exercé à l'exécution** — l'ouvrir demanderait de piloter
  une modale Windows; l'absence de contrôle de permission côté Rust a été
  établie sur les sources installées du plugin, pas par une exécution;
- que la voie de compatibilité de la correction B est **étroite** : un
  `REAL_ROOT` ne doit jamais l'emprunter, et un demi-binding non plus;
- que le binding vérifié est bien la paire `source_kind` + `source_ref`;
- que rien de `RR1`-`RR10` n'a été affaibli au passage;
- que rien dans cette tranche n'a lu, listé ou touché une donnée personnelle.

Aucune tâche suivante n'est précréée. `R-T30-5` n'est traitée que dans la
portée `REAL_ROOT` **de test** : toute première utilisation d'un vrai cerveau
reste un point d'arrêt réservé à Sébastien, et n'est pas demandée ici.
