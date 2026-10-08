# NEXT_PROMPT — TASK-0056 — Final V1 Parity Acceptance / Stage A Closure

**TARGET_AGENT:** CLAUDE CODE
**RECOMMENDED_MODEL:** Claude Opus 5.5
**RECOMMENDED_EFFORT:** High
**STATUS:** READY
**BRANCH:** `build/v0.2-a40-v1-final-parity-acceptance`
**BASE:** `446a4e4922f46bf4cdd71dd1aff65f08b5318b9d`

## Session

**Fais /clear avant cette tâche.**

C'est une nouvelle phase d'acceptance, indépendante de l'implémentation
TASK-0055. Tout le contexte est versionné.

Synchronise la branche en fast-forward seulement, arbre propre.

Lis intégralement :

1. `AGENTS.md`;
2. `docs/reviews/ACTION-0105-final-v1-audit-after-action0104.md`;
3. `docs/tasks/TASK-0056-v1-final-parity-acceptance.md`;
4. `docs/product/CARTETOPO_FUNCTIONAL_PARITY.md`;
5. `docs/product/REQUIREMENTS_BASELINE.md`;
6. `docs/product/FEATURE_MATRIX.md`;
7. `ROADMAP.md`;
8. `docs/release-checklist.md`;
9. ACTION-0104 et les ACTION de clôture citées par la parité.

## Mission

Faire une **acceptance**, pas du développement.

**Aucun fichier de code produit ne peut être modifié.**

Si un critère ne passe pas, STOP/BLOCKED. Ne le répare pas.

## 1. Reuse-first

Commence par un tableau des harness/preuves existants et réutilise-les.
Cherche les scenario runners déjà présents avant d'écrire un nouveau grand
script.

La valeur de TASK-0056 est :
- la composition des preuves;
- le vrai gate P-22;
- la régression globale capturée;
pas une réimplémentation des scénarios historiques.

## 2. Matrice P-01..P-22

Construis la matrice exacte demandée par TASK-0056 §3.

Pour P-05..P-18, pars des tâches/actions VERIFIED, puis vérifie chaque
sous-critère du texte courant. Une fonction « IMPLEMENTED » ne suffit jamais.

Ne marque aucune P CLOSED toi-même.

## 3. P-22

Construis une campagne Tauri/WebView2 réelle sur source synthétique temporaire.

Prends l'empreinte externe complète **avant** la fenêtre P-22, puis exerce
P-01..P-21 par de vrais gestes/runtime et reprends exactement la même empreinte
après.

La couverture P-01..P-21 doit être machine-lisible : une ligne par P, avec la
preuve/observation de cette campagne et, lorsque le critère lourd vient d'une
campagne historique, la référence canonique correspondante.

Inclure l'indisponibilité temporaire et retour sans suppression massive.

Aucun chemin personnel dans l'artefact.

## 4. Le flake TASK-0055 devient un gate

Exécute **3 fois consécutivement** :

`cargo test --lib --offline`

au même HEAD, avec sortie capturée.

Pour chaque run, publie dans l'artefact :
- exit code;
- counts;
- failed test names;
- hash du log;
- durée.

Si un run échoue : STOP/BLOCKED jusqu'à diagnostic exact. Pas de « probablement
flake ».

Ne committe pas des logs gigantesques; garde les logs de travail hors repo et
publie un résumé déterministe + hash + extraits d'échec s'il y en a.

## 5. Autres validations

- frontend complet;
- pnpm check;
- pnpm build;
- Tauri debug;
- axe sur campagne finale;
- git diff --check;
- audit public readiness.

Si une CI distante existe, distingue-la des runs locaux. N'en invente pas.

## 6. Diff purity

Avant le commit final, prouve que depuis la base de TASK-0056 aucun fichier de
production n'a changé.

Si un fichier produit a changé, TASK-0056 est invalide : STOP.

## 7. Gouvernance

PASS :
- TASK-0056 IMPLEMENTED / candidate;
- P-05..P-18/P-22 candidates;
- Stage A candidate CLOSED;
- aucune TASK-0057;
- NEXT_ACTION contrôle indépendant ChatGPT.

FAIL :
- TASK-0056 BLOCKED;
- Stage A EN COURS;
- rapport exact;
- aucune correction produit.

Ne commence ni B, ni C, ni D.
