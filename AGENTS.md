# AGENTS.md — Règles canoniques

## Périmètre et confidentialité

- Travailler uniquement dans ce dépôt public; ne jamais lire, lister ou écrire ailleurs.
- L'interface privée de référence est interdite d'accès. Ne jamais en copier noms, chemins, données, métadonnées, code ou historique.
- Aucun secret, chemin local personnel ou donnée réelle dans le dépôt.
- Tests et exemples exclusivement synthétiques.
- FileTopo analyse les documents en lecture seule. Index, caches et rapports restent dans l'espace applicatif, jamais dans la racine analysée.

## Lecture minimale de l'environnement technique

Précisé le 2026-08-31 par la clôture d'`ACTION-0023`, réserve `V4`.

- Une tâche `APPROVED` peut autoriser la **lecture minimale, ciblée et non
  récursive** de métadonnées d'environnement et d'outillage **nécessaires à son
  exécution** : version de compilateur, de moteur d'exécution ou de navigateur;
  **présence et chemin** d'un exécutable; métadonnées système **strictement
  techniques**.
- Cela **n'autorise jamais** la lecture ni le listage de **contenu
  utilisateur**, de dossiers personnels, de documents, de secrets ou de
  **données réelles**, sous quelque forme que ce soit.
- **Aucune écriture hors du dépôt** n'est ajoutée par cette permission.
- **Les points d'arrêt réservés à Sébastien restent inchangés.**

## Reprise minimale

Lire, dans cet ordre :

1. AGENTS.md ou CLAUDE.md;
2. docs/ai/START_HERE.md;
3. docs/ai/CURRENT_STATE.md;
4. docs/ai/NEXT_ACTION.md;
5. la fiche de la tâche active ou approuvée;
6. seulement les fichiers supplémentaires qu'elle nomme.

## Tâches et Git

- États permis uniquement : PROPOSED, APPROVED, IN_PROGRESS, BLOCKED, IMPLEMENTED, VERIFIED, REJECTED, DEFERRED.
- Au plus une tâche IN_PROGRESS. Toute tâche existe dans docs/tasks avant son démarrage.
- Aucune modification sans tâche APPROVED et périmètre écrit.
- Avant une tâche : vérifier racine, branche, HEAD, remote et état Git propre. S'arrêter devant tout changement inattendu.
- Ne jamais confondre IMPLEMENTED (livrable produit) et VERIFIED (contrôle indépendant sur preuves). L'exécuteur ne s'attribue pas VERIFIED.
- Préserver les changements d'autrui et l'historique; aucun reset destructif, clean, force push ou réécriture.

## Exécution et preuves

- Rester dans les fichiers autorisés; aucune donnée utilisateur réelle ni accès implicite à un dossier.
- Tester proportionnellement au risque avec données synthétiques. Toute affirmation cite une preuve vérifiable.
- Dire explicitement non testé pour ce qui n'a pas été exécuté; rapporter les échecs tels quels.
- Avant de terminer : mettre à jour CURRENT_STATE.md, NEXT_ACTION.md, HANDOFF.md, VALIDATION.md et CHANGELOG_AI.md. Ne modifier graph/ que si la tâche l'autorise explicitement.
- NEXT_ACTION.md contient exactement une action.

## Délégation d'orchestration technique

Depuis le 2026-08-31, Sébastien délègue à un **orchestrateur technique** le
choix des suites techniques, le franchissement des **portes techniques** et
l'émission des **GO** à l'exécuteur. Sébastien conserve la **direction
produit**. La délégation est **révocable par Sébastien à tout moment** et ne
s'étend jamais aux points réservés ci-dessous.

- Un GO technique n'autorise **que ce qu'il nomme**, et seulement du travail
  écrit dans une fiche de tâche du dépôt, avec périmètre écrit.
- Un GO technique peut attribuer `VERIFIED`, à condition que l'instance qui le
  fait soit **distincte de l'exécuteur** et se prononce **sur preuves**. La
  règle « l'exécuteur ne s'attribue pas `VERIFIED` » est inchangée.
- Sous GO technique, l'écriture distante autorisée se limite au **push de
  commits vers une branche de travail déjà publiée** de ce dépôt public, **sans
  réécriture d'historique**.

## Points d'arrêt — réservés à Sébastien, sans délégation

GO explicite de **Sébastien** requis avant :

- toute **dépense**, tout achat, tout usage payant, tout engagement financier;
- toute **donnée réelle ou personnelle**, sous quelque forme que ce soit;
- toute **publication externe exceptionnelle** : fusion vers `main`, pull
  request, release, étiquette, annonce, nouveau dépôt ou nouveau distant;
- toute **opération destructive ou hors dépôt** présentant un risque réel :
  lecture, listage ou écriture hors du dépôt public, suppression, `reset`
  destructif, `clean`, `force push`, réécriture d'historique, suppression de
  branche distante;
- tout **changement important de portée produit**.

Ne jamais modifier les documents analysés.

## Rapport final minimal

Donner : résultat, branche et commits, fichiers touchés, validations et sorties utiles, non-testé/limites, état exact de la tâche, état Git final, action unique suivante et confirmation des actions distantes ou destructives. Attendre l'examen humain lorsque la tâche reste IMPLEMENTED.
