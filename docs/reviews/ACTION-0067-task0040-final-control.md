# ACTION-0067 — Clôture indépendante de TASK-0040

- Date : 2026-09-24
- Statut : `CLOSED / VERIFIED`
- Tâche : `TASK-0040 — V1 Incremental Update Application Kernel`
- Branche contrôlée : `build/v0.2-a24-v1-incremental-apply`
- Livraison finale contrôlée : `367f7317c9f583943d335eec2d608d6a27a59ed2`
- Contrôle précédent : `ACTION-0066`
- Verdict : **TASK-0040 = VERIFIED dans sa portée**

## A — Noyau fonctionnel

Les conclusions d'`ACTION-0066` sont maintenues :

- API Rust interne uniquement;
- aucune commande Tauri ou sérialisation;
- aucune stable key vers le WebView;
- préflight avant première écriture;
- mutations ciblées seulement;
- transaction `IMMEDIATE`, une révision par lot effectif;
- journal généré avec la même logique que le chemin de publication complet;
- rollback intégral sur erreur;
- parité avec publication complète de référence;
- `map_refresh` et le watcher restent hors portée.

Le noyau U-B est donc accepté.

## B — Recontrôle canonique F-031

Le blocage P1 d'`ACTION-0066` est fermé.

Le contrôle indépendant a relu les cinq artefacts sources et a recalculé les
statistiques **sans utiliser le fichier de synthèse comme autorité**.

Protocole effectivement observé :

- profil test `opt-level=3`;
- WAL;
- `synchronous=NORMAL`;
- cache SQLite par défaut;
- aucun checkpoint diagnostique;
- aucune variable de cache diagnostique;
- 5 campagnes indépendantes;
- DB reconstruites par le banc à chaque campagne;
- 7 échantillons par cas et par campagne;
- 0 échantillon rejeté;
- même environnement dans les cinq artefacts.

### Recalcul indépendant des 35 mesures brutes

| Cas | n | médiane | min | max |
|---|---:|---:|---:|---:|
| 1k / 10 | 35 | 964 µs | 844 | 1326 |
| 10k / 10 | 35 | 1330 µs | 1081 | 2027 |
| 100k / 10 | 35 | 1478 µs | 1339 | 2846 |
| 100k / 1000 | 35 | 260332 µs | 248004 | 323236 |

Ratio canonique recalculé :

`1478 / 964 = 1,533195...`

Plafond approuvé : `2.0`.

**Verdict F-031 canonique : PASS.**

Les cinq ratios individuels recalculés sont également sous 2 :
1,4513 ; 1,4363 ; 1,5879 ; 1,5370 ; 1,5576.

La campagne antérieure à 2,11 reste publiée et n'a pas été supprimée ou
réinterprétée. Le nouveau verdict vient d'un protocole figé avant exécution,
pas d'un tri a posteriori.

## C — Seuil et noyau inchangés

Le diff de la passe de recontrôle ne touche aucun fichier Rust/TypeScript,
aucun réglage SQLite produit et aucune logique du noyau.

Le seuil `<= 2` reste inchangé dans `BASELINE_TARGETS §3.3`.

Le nouveau script automatise seulement le protocole canonique et calcule la
synthèse sur les 35 échantillons bruts, jamais une médiane de médianes.

## D — Cibles absolues

Les quatre cibles absolues §3.3 passent avec une marge importante sur la
machine mesurée :

- 1k / 10 : 0,964 ms <= 200 ms;
- 10k / 10 : 1,330 ms <= 250 ms;
- 100k / 10 : 1,478 ms <= 400 ms;
- 100k / 1000 : 260,332 ms <= 3000 ms.

Ces chiffres restent des mesures d'ingénierie d'une machine/session et ne sont
pas extrapolés à un portable modeste.

## E — Limites maintenues

Ce VERIFIED porte sur le **noyau d'application d'un lot déjà réconcilié**.

Il ne prouve pas encore :

- détection de changements disque;
- production réelle du lot;
- réconciliation W-B/W-C;
- watcher F-030;
- indisponibilité F-032;
- latence end-to-end d'une actualisation;
- performance portable modeste;
- 1 million de nœuds.

## Verdict

**TASK-0040 = VERIFIED dans sa portée.**

La prochaine tranche peut désormais brancher U-B dans un chemin produit de
réconciliation/actualisation avant toute surveillance automatique.
