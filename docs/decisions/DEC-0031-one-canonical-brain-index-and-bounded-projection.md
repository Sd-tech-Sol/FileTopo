# DEC-0031 — One Canonical Brain Index and Bounded Projection Boundary

- Date : 2026-09-09
- Statut : `APPROVED` — GO technique de `.orchestrator/NEXT_PROMPT.md`.
- Exécution : [TASK-0030](../tasks/TASK-0030-v1-pipeline-convergence.md), `VERIFIED`
  le 2026-09-09 dans sa portée synthétique; implémentation contrôlée par
  [ACTION-0047](../reviews/ACTION-0047-independent-control.md).
- Encadrement : DEC-0029 et DEC-0030, sans changement de direction produit.

## A. Une seule vérité de corpus

`Index` est la source canonique unique des nœuds de chaque cerveau. Le fichier
SQLite reste dans l'espace applicatif isolé du cerveau. Aucun entretien de deux
corpus `nodes`/`map_nodes`. Les identités brain_id + node_id et index_id/révision
restent explicites. Un ancien index synthétique MapStore est déclaré incompatible
et reconstruit depuis sa source synthétique; aucune donnée relationnelle ou du
catalogue n'est supprimée. Une révision existante avance atomiquement au rebuild.

## B. Layout de vue

Pipeline : `Index -> materialize_view() -> layout(view) -> DTO borné -> MapApp`.
`layered-tree-cards-v1` est conservé. Les rectangles ne sont plus stockés pour
chaque élément du corpus. Aucun layout global préalable à la publication.
Pan/zoom/sélection consomment la géométrie de la vue; changer de projection peut
recalculer cette géométrie bornée.

## C. Projection déterministe

Budget d'ingénierie de runtime : **512 entités, agrégats inclus**, par cerveau.
Ce n'est ni un plafond de corpus ni une promesse de performance. Le focus et
ses ancêtres précèdent les enfants paginés; les places restantes peuvent être
utilisées pour les descendants afin de conserver les petites vues complètes.
Les requêtes d'enfants réutilisent les curseurs keyset et comptes directs de
TASK-0029. Les chaînes trop profondes pour la borne échouent explicitement.
Le DTO déclare total indexé, matérialisé, non matérialisé, raison de masquage,
focus, révision et budget. Aucun champ secondaire ne cache le corpus complet.

## D. Agrégat exact

Type distinct des nœuds : aucun chemin, aucune identité de dossier, aucune
relation ni suggestion. Il désigne le parent, le compte **exact d'enfants
directs absents de la vue**, la raison et une action de focus/page. Il ne
prétend jamais compter tous les descendants. La somme total moins matérialisé
déclare séparément tout le corpus hors vue, sans CTE récursive sur le hot path.
Une expansion remplace la projection, sans accumuler les pages hors budget.
Aucune arête hiérarchique n'est inventée entre éléments non présents.

## E. IPC et consommateurs

La commande de vue accepte focus et curseur optionnels et rend uniquement la
projection. L'ancien nom de snapshot peut rester comme alias **borné** pour les
scénarios existants; aucune API publique de snapshot intégral. Les détails sont
bornés et annoncent leurs enfants omis. Garde automatisée sur le chemin runtime.
Relations/doublons résolvent l'identité contre le corpus canonique, indépendamment
du focus. L'interface annonce les extrémités existantes hors vue sans coordonnées
fabriquées. Les campagnes d'analyse peuvent encore lire le corpus en mémoire :
leur optimisation n'appartient pas à cette tâche, elles ne produisent aucun
layout global et ne sérialisent pas une collection complète de nœuds vers l'UI.
Tout adaptateur transitoire sera nommé et justifié dans la fiche, sans stockage
concurrent. Préférer réutilisation et retrait du code obsolète.

## F. Confidentialité

Aucun réseau produit, compte, cloud, LLM, télémétrie ou journal automatique de
chemins réels. Sources analysées en lecture seule; index, caches, preuves et
rapports sous l'espace applicatif, jamais sous la source. Preuves publiques
exclusivement synthétiques.

## G. Portée volontaire

Aucune vraie racine utilisateur ni activation du folder picker. Pas de watcher,
streaming d'indexation, nouveau moteur graphique, FTS5 ou identité physique.
Le contrôle de la frontière read-only précède toute tranche sur donnée réelle.
Les performances ne sont pas acceptées produit par cette décision.

## État d'exécution — 2026-09-09

TASK-0030 est `VERIFIED` dans sa portée synthétique de convergence V1; cette
décision reste `APPROVED`, **implémentation contrôlée** par `ACTION-0047`, avec
les six réserves `R-T30-1` à `R-T30-6` maintenues. Le contrôle valide la
tranche, pas le contrat produit complet de `F-050`/`F-051`, qui restent
`IMPLEMENTED`. Budget effectivement appliqué :
512 entités, avec 256 places matérielles et jusqu'à un agrégat par nœud. Le store
historique est limité aux tests de migration; le conteneur temporaire `AnalysisInput` ne dérive pas `Serialize`; aucun IPC
ne renvoie sa collection de métadonnées et aucun corpus concurrent n’est stocké. Voir la fiche
TASK pour le tableau de dette et les preuves. Aucun choix produit nouveau.
