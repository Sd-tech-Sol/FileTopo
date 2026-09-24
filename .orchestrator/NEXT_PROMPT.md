# NEXT_PROMPT — TASK-0040 — F-031 canonical measurement recontrol after ACTION-0066

**TARGET_AGENT:** CLAUDE CODE  
**RECOMMENDED_MODEL:** Sonnet 5, medium effort  
**STATUS:** READY  
**BRANCH:** `build/v0.2-a24-v1-incremental-apply`

## /goal

Fermer uniquement le blocage **P1** de
`docs/reviews/ACTION-0066-task0040-independent-recontrol.md`.

Le noyau U-B de TASK-0040 est accepté fonctionnellement. Cette passe ne doit
**pas** optimiser ou modifier le noyau produit. Elle doit seulement produire
une mesure canonique F-031 robuste sous un protocole figé avant exécution.

Ne pas créer TASK-0041. Ne pas construire watcher/F-030/F-032. Ne pas brancher
`map_refresh`.

## 0 — Préconditions

1. Appliquer `AGENTS.md` et `CLAUDE.md`.
2. Basculer explicitement sur
   `build/v0.2-a24-v1-incremental-apply`.
3. `git fetch origin`.
4. Synchroniser en fast-forward seulement.
5. Vérifier arbre propre.
6. Vérifier que HEAD contient `ACTION-0066`.
7. Lire ACTION-0066 en entier **avant** de lancer une nouvelle mesure.

Si une précondition ne tient pas : STOP/BLOCKED.

## 1 — Interdiction de tuning produit

Dans cette passe :

- ne modifier **aucune** logique de `incremental.rs`;
- ne modifier aucun réglage produit SQLite;
- ne changer aucun seuil;
- ne supprimer aucun artefact FAIL existant;
- ne choisir aucun résultat a posteriori;
- ne faire aucun benchmark checkpoint/cache pour le verdict canonique.

Une modification strictement nécessaire du **harnais de benchmark** ou de son
script est autorisée uniquement pour automatiser le protocole ci-dessous et
doit être clairement séparée du noyau.

## 2 — Protocole canonique figé

Configuration unique :

- profil test avec `opt-level=3`;
- SQLite WAL;
- `synchronous=NORMAL`;
- cache SQLite par défaut;
- aucun checkpoint explicite;
- aucune variable diagnostique `TASK0040_CHECKPOINT` /
  `TASK0040_CACHE_KIB`.

Exécuter **5 campagnes indépendantes**.

Chaque campagne :

- reconstruit des DB fraîches;
- exécute les mêmes 4 cas :
  - 1k / 10 changements;
  - 10k / 10;
  - 100k / 10;
  - 100k / 1000;
- **7 échantillons par cas**;
- aucun échantillon rejeté;
- produit son artefact JSON propre, par exemple
  `TASK-0040-incremental-apply-canonical-01.json` … `05.json`.

Ne pas arrêter tôt si les premières campagnes passent ou échouent.

## 3 — Synthèse canonique

Créer un artefact de synthèse dédié, par exemple :

`docs/performance/runs/TASK-0040-incremental-apply-canonical-summary.json`

Il doit contenir :

- les 5 artefacts sources;
- les **35 samples bruts** de 1k/10;
- les 35 samples bruts de 10k/10;
- les 35 samples bruts de 100k/10;
- les 35 samples bruts de 100k/1000;
- médiane/min/max de chaque ensemble de 35;
- les 5 ratios individuels de campagne;
- le ratio canonique :
  `median(35 samples 100k/10) / median(35 samples 1k/10)`;
- plafond = 2.0;
- verdict PASS/FAIL;
- cibles absolues §3.3 PASS/FAIL sur les médianes canoniques;
- environnement complet et confirmation que la configuration est identique
  pour les 5 campagnes;
- zéro échantillon écarté.

La médiane doit être calculée sur les exécutions brutes, **pas** comme médiane
des médianes.

## 4 — Règle d’arrêt

### Si ratio canonique <= 2

- ne touche toujours pas au noyau;
- documenter P1 comme candidat à fermeture;
- TASK-0040 reste `IMPLEMENTED` : seul l’orchestrateur pourra la déclarer
  VERIFIED;
- NEXT_ACTION = contrôle indépendant de la nouvelle preuve.

### Si ratio canonique > 2

- **STOP / BLOCKED**;
- ne pas optimiser;
- ne pas changer le benchmark;
- ne pas exécuter de variantes de cache/checkpoint;
- documenter l’échec tel quel;
- NEXT_ACTION = arbitrage orchestrateur sur F-031.

## 5 — Contrôles de non-régression

Comme le noyau produit ne doit pas changer :

- vérifier par diff qu’aucune ligne de `incremental.rs` n’est modifiée;
- si seul le harnais/docs changent, tests ciblés du benchmark + compilation
  suffisants;
- rejouer `git diff --check`;
- rejouer `scripts/audit-public-readiness.ps1 -AllowRemotes`;
- ne pas élargir l’allowlist.

Pas de WebView2.

## 6 — Mémoire durable

Mettre à jour :

- `.orchestrator/RESULT.md`;
- `docs/ai/VALIDATION.md`;
- `docs/ai/CURRENT_STATE.md`;
- `docs/ai/HANDOFF.md`;
- `docs/ai/NEXT_ACTION.md`;
- `docs/ai/CHANGELOG_AI.md`;
- `BASELINE_TARGETS §3.3` uniquement pour ajouter la nouvelle mesure
  canonique sans effacer les anciennes campagnes ni changer le seuil.

## 7 — Gouvernance

- aucune TASK-0041;
- aucun watcher;
- aucun changement fonctionnel produit;
- aucun PR/merge/tag/release;
- push uniquement sur la branche actuelle;
- arbre propre à la fin.
