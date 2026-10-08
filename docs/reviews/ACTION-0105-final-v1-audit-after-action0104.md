# ACTION-0105 — Audit V1 final après ACTION-0104

- **Date :** 2026-10-08
- **Statut :** `CLOSED — final acceptance selected`
- **Base auditée :** `446a4e4922f46bf4cdd71dd1aff65f08b5318b9d`
- **Branche suivante :** `build/v0.2-a40-v1-final-parity-acceptance`

## 1. État fonctionnel

Après ACTION-0104 :

- `TASK-0055 = VERIFIED`;
- `F-046 = VERIFIED`;
- `F-050/F-051/F-052 = VERIFIED`;
- `P-01/P-02/P-03/P-04/P-19/P-20/P-21` possèdent déjà une clôture formelle;
- aucun nouveau gap fonctionnel MVP nommé n'a été trouvé.

Les fonctions `DIFFÉRÉ` et `ULTÉRIEUR` restent hors étape A :
F-021, F-037, F-038, F-039, F-047, F-048, F-049 selon leur classification
courante. Elles ne doivent pas être remontées par inertie.

## 2. Ce qui reste réellement ouvert

Le `ROADMAP` exige pour la sortie de l'étape A :

- les 22 exigences `P-01..P-22` satisfaites et prouvées;
- les invariants `I-1..I-3` tenus;
- contrôle indépendant.

Or le contrat de parité ne contient pas encore de clôture consolidée pour
`P-05..P-18`, bien que leurs fonctions propriétaires aient déjà des tâches
VERIFIED.

Surtout, `P-22` n'a **aucune clôture formelle**. C'est un invariant bloquant :
une session complète qui exerce P-01..P-21 ne doit modifier ni contenu, ni noms,
ni structure, ni horodatages de l'arborescence analysée, et aucun fichier
FileTopo ne doit apparaître dans la source.

## 3. Instabilité de suite transférée au gate final

TASK-0055 a eu :

- une exécution complète Rust `900 PASS / 1 FAIL` dont le nom de test n'a pas
  été capturé;
- puis trois exécutions complètes `901 PASS / 0 FAIL` au même code.

ACTION-0104 accepte F-046, mais ne transforme pas ce signal en « rien ».

La final acceptance doit exécuter des suites complètes avec sortie **capturée**.
Tout échec non expliqué/reproduit bloque la fermeture de l'étape A.

## 4. Décision

Créer :

**TASK-0056 — V1 Final Parity Acceptance / Stage A Closure**

Ce n'est **pas** une nouvelle fonctionnalité.

Portée :
1. matrice de preuve P-01..P-22;
2. clôture formelle candidate de P-05..P-18 par composition de preuves déjà
   VERIFIED, sans réécriture;
3. campagne finale P-22 dans un vrai Tauri/WebView2, source synthétique;
4. régression globale capturée;
5. audit invariants I-1..I-3;
6. réconciliation documentaire des statuts périmés;
7. décision candidate « Stage A CLOSED » ou `BLOCKED`.

## 5. Règle d'arrêt

TASK-0056 est une **acceptance pure**.

Elle peut modifier :
- harness/scripts de preuve;
- artefacts de preuve;
- documentation/orchestration.

Elle ne doit modifier **aucun code produit**.

Si une exigence nécessite un changement de produit :
- STOP;
- `TASK-0056 = BLOCKED`;
- documenter le gap exact;
- aucune corrective opportuniste;
- aucun passage à l'étape B.

## 6. P-22 — interprétation stricte

La campagne P-22 doit utiliser une ou plusieurs racines temporaires synthétiques
créées par le harness, jamais une racine personnelle.

Avant la session, calculer une empreinte **externe au produit** portant au
minimum sur :
- chemins relatifs;
- type;
- contenu;
- taille;
- horodatages de fichier et dossier dans la portée contractuelle;
- structure.

Après tous les gestes FileTopo de la campagne, l'empreinte doit être identique.

Les manipulations nécessaires pour préparer un scénario (créations de fixture,
journal seed, hard links, etc.) se font **avant** le baseline P-22.

Pour l'indisponibilité temporaire, le harness peut rendre la racine
temporairement inaccessible puis la restaurer, mais l'état final mesuré doit être
identique au baseline.

## 7. Exercer P-01..P-21 dans la campagne P-22

P-22 vérifie l'immutabilité pendant que les capacités sont exercées; il ne
remplace pas leurs preuves spécialisées historiques.

La campagne doit avoir une table de couverture explicite `P-01..P-21` avec
au moins un vrai geste/runtime par exigence :
- topographie/hiérarchie/navigation;
- relations, suggestions et direction;
- sélection/accentuation;
- recherche/filtre/légende;
- pan/zoom/fit/reset;
- panneau détails/enfants;
- copie chemin et ouverture Explorateur sur fixture;
- journal, vu/non-vu, actualiser, surveillance/incrémental;
- persistance/redémarrage;
- multi-cerveaux;
- FR/EN + clavier/accessibilité.

Les critères lourds déjà VERIFIED (100k/1M, 10k événements, contrastes complets,
etc.) restent composés depuis leurs artefacts; ne pas les reproduire
artificiellement dans une seule session si cela n'ajoute aucune information à
P-22.

## 8. P-05..P-18

Construire une matrice pour chaque P :
- texte exact du critère;
- fonctions propriétaires;
- tâches/actions indépendantes qui le couvrent;
- artefacts/tests précis;
- éventuelle limite;
- verdict `SATISFIED` ou `GAP`.

Ne jamais fermer une P seulement parce que sa fonction est IMPLEMENTED.

Si un sous-critère nommé n'a aucune preuve indépendante, `GAP`.

## 9. Invariants I-1..I-3

I-1 / I-2 sont directement attaqués par P-22.

I-3 doit être relu contre le contrat courant et prouvé depuis les frontières
backend/IPC existantes; aucun élargissement de permissions ou nouvelle source
de vérité ne doit être introduit par TASK-0056.

## 10. Étapes B/C/D

Cette tâche ne commence pas B, C ou D.

- **B** : finition visuelle moderne, décision ultérieure après fermeture A;
- **C** : validation Windows/WebView2 globale, à réévaluer car beaucoup de
  preuves réelles existent déjà, mais la fermeture de C appartient à un audit
  séparé;
- **D** : empaquetage/publication. Signature, merge main, tag, release et annonce
  restent des points d'arrêt humains.

La checklist de release contient encore des opérations de signature nécessitant
une autorisation/propriétaire de certificat : hors TASK-0056.

## 11. Sortie attendue

Si tout passe :
- TASK-0056 = IMPLEMENTED / candidate;
- P-05..P-18 et P-22 = candidates à fermeture indépendante;
- ROADMAP Stage A = candidate CLOSED, jamais auto-CLOSED;
- aucune TASK-0057;
- retour à ChatGPT pour contrôle final de l'étape A.

Si un point échoue :
- TASK-0056 = BLOCKED;
- Stage A reste EN COURS;
- rapport exact, sans correction produit.
