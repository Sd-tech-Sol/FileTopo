# BASELINE_TARGETS — Objectifs mesurables de la reconstruction

- **Date :** 2026-08-31
- **Tâche :** `TASK-0011`, livrable `L5`
- **Portée couverte :** point 12 de `TASK-0011` §7.1
- **Statut :** livrable `L5`, **APPROUVÉ** — approuvé par Sébastien le 2026-08-31 (porte P2 franchie). Livrable documentaire; **rien n'a été exécuté ni mesuré : non testé physiquement**
- **Résultat :** **non testé.** Aucune mesure n'a été exécutée pendant
  `TASK-0011`.

> **Avertissement obligatoire.** Chaque chiffre de ce document est une
> **cible à falsifier**, jamais un résultat. Aucun ne peut être cité comme une
> capacité du produit. Le dossier [docs/performance](README.md) réserve les
> fichiers `PERF-XXXX` aux mesures réellement effectuées; **ce document n'en
> est pas un** et ne prétend pas l'être.

---

## 1. Pourquoi des cibles maintenant

**Fait.** [README.md](README.md) de ce dossier pose la règle : « Aucune
estimation dans ce dossier. Ce qui n'a pas été mesuré n'y figure pas. »

**Tension assumée, et comment elle est résolue.** `TASK-0011` §7.1 point 12
exige des objectifs mesurables. Ce document les fournit **en les nommant
objectifs et non mesures**, avec la mention « non testé » sur chaque ligne,
un protocole reproductible pour chacun, et aucun identifiant `PERF-XXXX`. Il
ne se substitue donc pas au registre de mesures : il définit ce que les
futures mesures devront falsifier. La règle du dossier reste intacte : aucune
estimation n'est présentée ici comme une mesure.

**Précision.** Les mesures historiques de
[phase 3](phase-3-measurements.md) et [phase 4](phase-4-mvp-measurements.md)
sont réelles mais portent sur un **pipeline en mémoire** : génération de DTO,
remplacement d'index SQLite, relecture paginée. Elles ne mesurent ni un
parcours de disque, ni une surveillance, ni un rendu. Elles ne peuvent donc
pas servir de référence aux cibles ci-dessous, qui portent sur des grandeurs
différentes.

## 2. Jeux d'essai synthétiques de référence

Aucun de ces jeux n'existe encore dans le dépôt. Les fixtures présentes
(`tests/fixtures_synthetic/`) comptent moins d'une dizaine de fichiers.

| Jeu | Éléments | Forme | Rôle |
|---|---:|---|---|
| `SYN-1K` | 1 000 | Profondeur 5, 8 enfants par dossier, extensions mêlées | Cas d'usage courant |
| `SYN-10K` | 10 000 | Profondeur 8, largeur irrégulière | Cas d'usage exigeant |
| `SYN-100K` | 100 000 | Profondeur 12, un dossier large de 5 000 enfants, noms longs, casse mêlée | Cas limite du MVP |
| `SYN-DEEP` | 5 000 | Profondeur 40 | Falsifie la disposition (F-008) |
| `SYN-WIDE` | 5 000 | 1 dossier, 5 000 enfants directs | Falsifie la disposition (F-008) |
| `SYN-HOSTILE` | 2 000 | Jonctions, liens symboliques, chemins > 260 caractères, UTF-16 difficile, permissions refusées, espaces réservés simulés | Falsifie les exclusions et les diagnostics |

**Contrainte.** Tous les jeux sont **générés de façon déterministe** et
n'empruntent aucun nom, aucune structure et aucune donnée à un corpus réel ou
à une interface privée.

## 3. Cibles

Toutes les lignes portent la mention **non testé**. Le matériel de référence
n'est pas encore défini : il devra l'être avant la première mesure, et toute
cible mesurée sur un autre matériel devra le déclarer.

### 3.1 Temps de première carte utile

**Définition.** Durée entre la confirmation de création du cerveau (E2 du
[parcours](../product/USER_JOURNEY.md)) et l'instant où les blocs de premier
**et** deuxième niveau sont placés et navigables (E4). Ce n'est **pas** la fin
de l'indexation.

| Jeu | Cible | Résultat |
|---|---:|---|
| `SYN-1K` | ≤ 1 s | **non testé** |
| `SYN-10K` | ≤ 2 s | **non testé** |
| `SYN-100K` | ≤ 4 s | **non testé** |

**Protocole.** Cerveau neuf, index absent. Horodatage applicatif posé à la
confirmation et au premier rendu des deux premiers niveaux. Cinq exécutions,
médiane retenue, écart min–max rapporté. Cache du système de fichiers vidé
entre les exécutions, ou l'absence de vidage explicitement déclarée.

### 3.2 Temps d'indexation complète

| Jeu | Cible | Résultat |
|---|---:|---|
| `SYN-1K` | ≤ 2 s | **non testé** |
| `SYN-10K` | ≤ 10 s | **non testé** |
| `SYN-100K` | ≤ 90 s | **non testé** |

**Protocole.** Du début du parcours à l'état « à jour ». Cinq exécutions,
médiane. Le nombre de diagnostics produits est rapporté avec la durée : une
indexation rapide qui échoue sur 20 % des éléments n'est pas un succès.

### 3.3 Coût d'une mise à jour incrémentale

C'est la cible qui falsifie F-031 et qui condamne le `DELETE` + réinsertion du
prototype.

| Jeu | Changements appliqués | Cible | Résultat |
|---|---:|---|---|
| `SYN-1K` | 10 | ≤ 200 ms | **0,9–1,7 ms** (médianes de 7 campagnes, noyau `TASK-0040`) — PASS |
| `SYN-10K` | 10 | ≤ 250 ms | **1,1–2,3 ms** — PASS |
| `SYN-100K` | 10 | ≤ 400 ms | **1,6–2,8 ms** — PASS |
| `SYN-100K` | 1 000 | ≤ 3 s | **178–369 ms** — PASS |

> **Portée de ces mesures (`TASK-0040`, 2026-09-24).** Elles chronomètrent
> l'**application d'un lot déjà réconcilié** par le noyau `Index::apply_update_batch`
> (`DEC-0038`), sur un index SQLite WAL sur disque, une machine, une session; pas la
> réconciliation ni la détection, qui n'existent pas encore. Sept exécutions par cas,
> aucune écartée; détail et environnement : `runs/TASK-0040-incremental-apply-*.json`.
> **Critère de rejet, ratio 100k/1k à 10 changements : 1,59 · 1,62 · 2,11 · 1,72 · 1,82
> · 1,71 · 1,67 — une campagne sur sept dépasse 2** (voir `VALIDATION.md` BT). Le critère
> n'est donc **pas établi de façon robuste**; il n'est pas non plus franchement rejeté
> (le remplacement complet existant fait ×120 à ×150 sur les mêmes tailles).

**Critère de rejet, plus important que les valeurs absolues.** À nombre de
changements égal (10), la durée sur `SYN-100K` ne doit pas dépasser
**2 fois** celle sur `SYN-1K`. C'est le facteur que
[REQUIREMENTS_BASELINE.md](../product/REQUIREMENTS_BASELINE.md) F-031 délègue
à ce document. Un facteur supérieur démontre un coût proportionnel à la taille
de l'index, donc une mise à jour non incrémentale.

**Protocole.** Index déjà « à jour ». Application d'un lot de changements
synthétiques (créations, modifications, renommages, déplacements,
suppressions, en proportions déclarées). Mesure du début de la réconciliation
au retour à « à jour ».

### 3.4 Mémoire

| Jeu | Cible (pic de l'ensemble du processus) | Résultat |
|---|---:|---|
| `SYN-1K` | ≤ 250 Mio | **non testé** |
| `SYN-10K` | ≤ 400 Mio | **non testé** |
| `SYN-100K` | ≤ 900 Mio | **non testé** |

**Protocole.** Pic observé pendant l'indexation complète puis pendant dix
minutes de navigation scriptée. Cœur natif et processus de rendu comptés
séparément **et** ensemble, car un WebView peut dominer le total.

### 3.5 Taille d'index

| Jeu | Cible (octets par élément indexé) | Résultat |
|---|---:|---|
| `SYN-1K` | ≤ 1,5 Kio/élément | **non testé** |
| `SYN-10K` | ≤ 1,2 Kio/élément | **non testé** |
| `SYN-100K` | ≤ 1,0 Kio/élément | **non testé** |

**Protocole.** Taille sur disque de tous les fichiers du cerveau, y compris
`.wal` et `.shm` après checkpoint, divisée par le nombre d'éléments. Mesurée
après une opération de compactage explicite, et **aussi** avant, les deux
valeurs étant rapportées.

**Fait.** SQLite documente une taille maximale de base d'environ 281 To et une
longueur maximale de chaîne ou BLOB de 1 000 000 000 octets par défaut
([SQLite limits](https://www.sqlite.org/limits.html), consultée le
2026-08-31). Aucune cible de ce document n'approche ces limites; elles ne sont
donc pas un facteur limitant du MVP.

### 3.6 Fluidité de navigation

| Grandeur | Cible | Résultat |
|---|---:|---|
| Images par seconde pendant un déplacement continu, `SYN-100K` | ≥ 30 ips soutenues | **non testé** |
| Latence entre un clic de sélection et l'affichage des détails | ≤ 150 ms au 95<sup>e</sup> centile | **non testé** |
| Latence d'une requête de recherche, `SYN-100K` | ≤ 500 ms au 95<sup>e</sup> centile | **non testé** |
| Blocs DOM/SVG construits et simultanément visibles | Plafond initial **proposé** de 3 000, à falsifier; voir [DEC-0008](../decisions/DEC-0008-hierarchical-rendering.md), section « Plafond initial proposé ». **Ce plafond n'est pas une capacité déclarée du produit.** | **non testé** |

**Protocole.** Trajectoire de déplacement et de zoom scriptée, identique entre
exécutions. Les images par seconde sont relevées par l'horloge de rendu du
navigateur embarqué, pas estimées.

### 3.7 Cible de robustesse, sans valeur numérique

| Situation | Critère binaire | Résultat |
|---|---|---|
| Fermeture brutale pendant l'indexation | L'index reste ouvrable; le cerveau est « incomplet »; aucune source modifiée | **non testé** |
| Racine rendue inaccessible | Index et préférences intacts; aucun événement de suppression | **non testé** |
| Perte d'événements de surveillance simulée | Réconciliation aboutit à un index égal à un scan complet de référence | **non testé** |
| Disque plein pendant une écriture | Erreur récupérable; ancien index intact | **non testé** |
| Base corrompue | Détectée par `integrity_check`; reconstruction proposée | **non testé** |

Ces critères n'ont pas de seuil chiffré : ils réussissent ou échouent.
Ils ont autant de poids que les cibles chiffrées.

## 4. Comment ces cibles seront falsifiées

1. Chaque cible devient un fichier `PERF-XXXX` de ce dossier **quand elle est
   mesurée**, avec environnement, protocole, nombre d'exécutions et limites.
2. Une cible manquée n'est pas ajustée pour être atteinte : elle est
   rapportée manquée, et la décision d'architecture correspondante est
   réexaminée.
3. Aucune cible n'est extrapolée d'un jeu à un autre.
4. Aucune valeur de ce document n'est reprise dans le `README.md` du produit
   ni dans une communication publique tant qu'elle n'est pas mesurée.

## 5. Sources officielles citées

| Source | URL | Consultée le | Sert à |
|---|---|---|---|
| SQLite — Implementation Limits | https://www.sqlite.org/limits.html | 2026-08-31 | §3.5 |
| SQLite — Write-Ahead Logging | https://www.sqlite.org/wal.html | 2026-08-31 | §3.5, fichiers `.wal` et `.shm` |

## 6. Limites

- **Non testé, intégralement.** Aucune ligne de ce document n'est un résultat.
- Le **matériel de référence n'est pas défini**. Sans lui, les valeurs
  absolues des §3.1 à §3.6 ne sont pas comparables entre exécutions. Le
  critère de rejet de §3.3, qui est un **rapport**, est le seul robuste à ce
  manque.
- Les jeux `SYN-*` n'existent pas encore; leur génération est une tâche de
  développement ultérieure.
- Les cibles supposent la chaîne technique encore `PROPOSED`
  ([DEC-0007](../decisions/DEC-0007-rebuild-tech-stack.md),
  [DEC-0008](../decisions/DEC-0008-hierarchical-rendering.md)). Un changement
  de pile ou de moteur de rendu invalide les §3.4 et §3.6.
- Les budgets de [phase-2-architecture.md](../architecture/phase-2-architecture.md)
  §8 visaient un million d'éléments; ce document vise 100 000 au MVP. **Ce
  n'est pas une contradiction résolue mais un changement d'échelle assumé**,
  soumis à l'examen de Sébastien.
