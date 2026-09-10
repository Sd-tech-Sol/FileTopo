# DEC-0032 — Persistent Brain Lifecycle Contract

- Date : 2026-09-10
- Statut : `APPROVED` — GO technique NEXT_PROMPT exécuté par Sébastien.
- Exécution : [TASK-0031](../tasks/TASK-0031-v1-brain-lifecycle.md).

## A. Open

map_open ouvre seulement un index canonique existant, compatible et construit
pour brain_id. Aucune matérialisation, lecture, empreinte ni exploration de source;
aucune migration, publication ou suppression. index_id et revision inchangés.
map_view et détails fonctionnent immédiatement. NotBuilt si absent; incompatibilité
ou cerveau étranger refusés explicitement, sans rebuild automatique.

## B. Refresh

map_refresh scanne explicitement une source synthétique déjà préparée, en lecture
seule. Scan et contrôles réussissent AVANT publication. L'identité compatible
est conservée, la révision avance dans la transaction du nouveau corpus.
Erreur/annulation avant publication ou échec transactionnel : ancien index intact.
Pas de watcher/incrémental, F-027/F-030/F-031 hors portée.

## C. Rebuild

map_rebuild est une intention distincte. Pour un index compatible, la primitive
transactionnelle remplace toutes les données dérivées en conservant index_id et
avançant revision. Aucun effacement préalable; rollback sur échec SQL.
Catalogue, relations, décisions humaines, content-signals et source intacts.
Schéma incompatible, ancien MapStore ou mauvais brain : refus explicite pour les
trois opérations. Cette tranche ne migre ni ne remplace un fichier incompatible;
une migration future nécessitera son contrat de staging. Aucun second index canonique.

## D. API et préparation synthétique

Trois commandes nommées sans booléen rebuild. Un rapport d'ouverture expose
état OPENED_EXISTING, brain_id, index_id, revision, compte, schéma, sourceRead=false,
indexReused=true et fraîcheur UNKNOWN; aucune mesure de scan inventée.
Refresh/rebuild peuvent conserver MapBuildReport enrichi de faits lifecycle réels.
La préparation de source synthétique est une commande séparée explicitement appelée
par un geste ou un scénario de preuve; jamais un effet de open/refresh/rebuild.

## E. Source indisponible

Open ne sonde pas la disponibilité. L'UI indique « dernier index enregistré;
source non vérifiée ». Un refresh/rebuild échoué indique l'échec et maintient la
consultation possible. Aucun timestamp de fraîcheur actuelle inventé. Une source
absente ne vide pas l'index et n'est pas recréée silencieusement.

## F. Frontière inchangée

Index -> map_view bornée (512 entités) -> layout de vue -> MapApp.
Source synthétique seule, état applicatif hors source. Aucun REAL_ROOT, dossier
personnel, picker, réseau, nouveau renderer, nouvelle base ou portée produit.
