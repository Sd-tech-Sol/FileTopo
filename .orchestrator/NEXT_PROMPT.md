# NEXT_PROMPT — TASK-0028 / Synthetic Scale Feasibility Spike

**TARGET_AGENT:** CLAUDE  
**STATUS:** READY  
**OWNER:** orchestrateur technique  
**TASK:** `TASK-0028 — Synthetic Scale Feasibility Spike`  
**MODE:** benchmark / preuve d’architecture — aucune implémentation produit du materializer

## /goal

Falsifier la frontière de mise à l’échelle approuvée par `DEC-0029` avec un banc synthétique reproductible à **10 000 / 100 000 / 1 000 000 d’éléments indexés**, avant toute implémentation produit de `F-042`, `F-050` ou `F-051`.

Le spike doit répondre à une question précise : **l’architecture “indexer grand, matérialiser petit” est-elle techniquement plausible avec le cœur local Rust/SQLite et un rendu borné, sans faire dépendre le coût graphique de la taille totale du corpus ?**

Cette tranche peut créer du **code de benchmark/test isolé**, mais ne doit pas exposer de nouvelle commande produit, modifier l’UX normale, remplacer `MAX_NODES_PER_MAP`, implémenter le progressive materializer dans l’application, choisir un renderer final, ni changer les états produit de `F-042/F-050/F-051`.

Graphify reste `NOT INTEGRATED`. Forge reste distinct. Aucun LLM, API cloud, vector DB, RAG, extraction de contenu ou donnée réelle.

---

## 0 — synchronisation et branche

1. Appliquer les protocoles du dépôt.
2. Branche de départ attendue : `build/v0.2-a11-progressive-scale-architecture`.
3. `git fetch origin`, puis fast-forward uniquement.
4. HEAD doit être le commit d’orchestration contenant ce fichier.
5. Son parent direct doit être exactement `db655468789d5ace6853950c52232027c6b56e71`.
6. `TASK-0027 = VERIFIED`, `ACTION-0044 = CLOSED`, `DEC-0029 = APPROVED`.
7. X5 = **36** et reste inchangé pendant TASK-0028.
8. `origin/main = 1a7d652ca48281c1687f6d1404c56a1404df91d8`; ne pas merger/cherry-pick/reset main.
9. `TASK-0028` et `DEC-0030` doivent être libres.
10. Créer et publier : `build/v0.2-a12-synthetic-scale-spike`.
11. Arbre propre avant écriture.

Toute divergence : **STOP / BLOCKED**.

---

## 1 — gel documentaire AVANT le harness

Créer et committer avant tout code/harness :

- `docs/tasks/TASK-0028-synthetic-scale-feasibility-spike.md`
- `docs/performance/TASK-0028-SCALE-SPIKE-PROTOCOL.md`

Ne créer **aucune DEC-0030** : le spike mesure; l’orchestrateur décidera ensuite du budget de vue et de la tranche d’implémentation.

La fiche doit citer au minimum : `DEC-0029`, `PROGRESSIVE_SCALE_ARCHITECTURE.md §11`, `P-08`, `F-042`, `F-050`, `F-051`, `R8`, `I-1..I-3`, `DEC-0025`, `DEC-0028`, `ACTION-0044`.

Statut exécuteur final : `IMPLEMENTED`, jamais `VERIFIED`.

---

## 2 — nature du spike : deux couches distinctes

### A. Source physique synthétique

Mesurer le vrai pipeline de scan/index sur des arbres **temporaires synthétiques** :

- **10 000 éléments**;
- **100 000 éléments**.

Arbres déterministes, avec mélange de dossiers/fichiers, branches larges et profondes, noms synthétiques, fichiers vides ou minuscules. Aucun contenu réel, aucun chemin privé committé.

Avant/après chaque campagne, calculer une empreinte structurelle de la source synthétique et prouver qu’elle reste inchangée. Aucun hash de contenu FileTopo n’est requis : **ne pas lancer les campagnes SHA-256** de TASK-0023/TASK-0026.

Ne pas imposer 1 000 000 de fichiers physiques : cela mesure surtout NTFS et peut gaspiller temps/espace disque.

### B. Index synthétique à 1 000 000

Pour la couche stockage/requêtes, créer **1 000 000 d’éléments indexés** dans une base de benchmark utilisant le **schéma/les primitives FileTopo actuels** ou leur chemin de construction interne le plus fidèle.

- Cette couche doit être explicitement nommée **INDEX-SCALE**, pas SCAN-SCALE.
- Elle ne prouve pas que le scanner peut parcourir 1M de fichiers physiques.
- Elle sert à mesurer SQLite, recherche, requêtes bornées expérimentales et faisabilité du rendu borné.
- Aucun million de fichiers fixture ne doit être committé.

Si le schéma actuel ne permet pas proprement la génération sans copier de logique, créer un builder **test/benchmark only** qui réutilise les types/schema existants. Ne pas créer un second modèle produit concurrent.

---

## 3 — profil matériel gelé

Capturer automatiquement le profil du banc, sans données personnelles :

- version Windows;
- CPU/modèle et cœurs/logiques;
- RAM installée;
- GPU(s) modèle(s);
- type de disque si raisonnablement accessible;
- build Rust/Node pertinents.

**Ne jamais committer hostname, username, chemin `C:\Users\...`, identifiants de machine ou autre donnée personnelle.**

Classifier le banc :

- `TARGET_CLASS` si réellement laptop/desktop ordinaire, RAM modeste, iGPU/GPU faible;
- sinon `DEVELOPMENT_BENCH_NOT_ACCEPTANCE`.

Un PC puissant peut fournir des mesures d’ingénierie mais **ne permet pas de déclarer la cible “machine modeste” validée**.

Le harness final doit être portable pour être rejoué plus tard sur un laptop plus modeste sans réécriture du protocole.

---

## 4 — mesures obligatoires

Mesurer les neuf familles de `PROGRESSIVE_SCALE_ARCHITECTURE §11.1`, en distinguant clairement ce qui est **production actuelle**, **prototype de benchmark**, ou **non mesurable avant F-050**.

### SS1 — index / reconstruction

Pour 10k et 100k physiques :

- génération synthétique séparée du temps FileTopo;
- durée de scan/index/rebuild FileTopo;
- nombre exact d’éléments attendus vs indexés;
- source fingerprint avant/après;
- échecs/diagnostics.

Pour 1M INDEX-SCALE : mesurer le temps de construction/chargement de la base de benchmark et le nommer comme tel, jamais “scan 1M”.

### SS2 — SQLite et mémoire

À 10k/100k/1M :

- taille de DB/index;
- RSS/working set du processus pendant les phases importantes, avec méthode déclarée;
- absence d’embarquement du million d’objets dans le frontend.

### SS3 — recherche P-08

Sur 100k **obligatoire**, sur 1M **informatif** :

- requêtes déterministes hit-début / hit-milieu / hit-fin / miss;
- pagination réelle;
- exactitude des résultats;
- warm-up séparé des runs mesurés;
- rapport p50/p95/max ou distribution équivalente, méthode écrite.

Ne pas inventer de cache non existant pour embellir le résultat.

### SS4 — requêtes bornées expérimentales

Sans exposer d’API produit, prototyper dans le harness les formes nécessaires à DEC-0029 :

- enfants directs paginés;
- ancêtres;
- compte exact d’un sous-arbre/non-matérialisé;
- éventuellement voisinage relationnel seulement si le store courant permet une expérience honnête.

Ces requêtes restent **benchmark-only**. Ne pas prétendre que le query engine produit est implémenté.

### SS5 — matérialisation expérimentale bornée

Créer un **prototype de benchmark non exposé au produit** qui construit une vue à partir de l’index avec un budget configurable.

Tester au minimum plusieurs budgets raisonnables, par exemple **128 / 256 / 512 / 1024** entités de vue, sans décider lequel sera final.

Pour le **même budget**, exécuter sur 10k / 100k / 1M et enregistrer :

- temps du prototype;
- nombre de nœuds réels inclus;
- nombre d’agrégats expérimentaux;
- comptes exacts cachés;
- total d’entités/arêtes de la vue.

**Critère structurel principal : pour un budget fixe, le nombre d’entités rendables ne doit pas croître proportionnellement au corpus.**

Les agrégats du prototype doivent respecter la sémantique de `F-051` : résumé calculé exact, jamais faux dossier, jamais relation.

### SS6 — layout borné

Réutiliser `layered-tree-cards-v1` si possible, mais uniquement sur les vues expérimentales bornées.

Mesurer le layout selon les budgets, **jamais le layout du corpus 100k/1M complet**.

Aucune modification de l’algorithme de layout n’est demandée dans ce spike, sauf instrumentation test-only strictement nécessaire.

### SS7 — frontend / WebView2 borné

Faire au moins une campagne **réelle Windows/Tauri/WebView2** sur une ou plusieurs vues bornées représentatives produites par le harness, si cela peut être fait sans créer un nouveau comportement produit.

Mesurer/vérifier :

- ouverture de la vue bornée;
- pan/zoom si le runtime actuel les offre réellement; sinon déclarer honnêtement “non disponible dans ce build”;
- sélection clavier/souris selon ce qui existe réellement;
- nombre de nœuds/arêtes DOM/SVG réellement présents;
- absence d’un whole-graph payload correspondant au corpus complet.

Un petit chemin de test/dev **non accessible en utilisation normale** est permis s’il est indispensable au harness. Il doit être clairement isolé et ne pas modifier l’UX normale.

### SS8 — sans GPU puissant

Essayer une passe WebView2 avec accélération GPU désactivée / software rendering **si le mécanisme Windows/WebView2 disponible permet de le prouver proprement**.

- Si la désactivation est confirmable : mesurer la vue bornée et enregistrer le mode.
- Si elle ne peut pas être confirmée honnêtement : marquer ce sous-critère `NOT PROVEN`, ne pas simuler une preuve.
- Un run logiciel n’est **pas** équivalent à un test sur iGPU modeste; il vérifie seulement l’absence d’une dépendance dure évidente au GPU.

### SS9 — non-proportionnalité

Comparer 10k/100k/1M à budget identique.

PASS structurel seulement si :

- la cardinalité de la vue reste bornée par le budget;
- aucun whole-graph JSON n’est sérialisé;
- les comptes d’agrégats restent exacts;
- tout élément non rendu reste représenté par un compte/chemin d’atteignabilité dans le prototype;
- aucune relation ou hiérarchie n’est inventée.

Ce PASS ne signifie **pas** que F-050/F-051 sont implémentées dans le produit.

---

## 5 — répétitions et méthode

Les mesures doivent être suffisamment répétées pour éviter un chiffre accidentel :

- séparer cold/warm lorsque pertinent;
- requêtes courtes : warm-up puis plusieurs répétitions, avec p50/p95/max;
- opérations lourdes : au moins deux runs lorsque raisonnable; si 1M ne peut être répété sans coût excessif, déclarer le nombre exact de runs;
- utiliser une horloge haute résolution;
- journaliser erreurs/timeout/OOM plutôt que les masquer.

Ne pas fixer de seuil marketing a posteriori. Cette tranche **mesure et falsifie**, elle ne fabrique pas un “PASS” en déplaçant la cible.

---

## 6 — R8 et publication des chiffres

`R8` reste entière.

Les chiffres de cette tranche sont des **mesures d’ingénierie non canoniques**, pas des promesses de performance produit.

- Ils peuvent vivre uniquement dans des artefacts de preuve `TASK-0028` clairement marqués `ENGINEERING_MEASUREMENT / NOT A PRODUCT CLAIM / NONCANONICAL UNTIL INDEPENDENT CONTROL`.
- Ne recopier aucun chiffre de benchmark dans README, PROJECT_VISION, page publique, release note, marketing ou promesse utilisateur.
- Le rapport durable doit rappeler que le profil matériel peut ne pas être la classe d’acceptation et que 1M physique n’est pas prouvé.
- Aucune conclusion “supporte 1M” ou “fluide à 100k” sans le qualificatif exact de ce qui a réellement été mesuré.

---

## 7 — artefacts attendus

Créer au minimum :

- `docs/performance/TASK-0028-SCALE-SPIKE-REPORT.md`
- `docs/performance/runs/TASK-0028-SS-10k.json`
- `docs/performance/runs/TASK-0028-SS-100k.json`
- `docs/performance/runs/TASK-0028-SS-1m-index.json`
- `docs/performance/runs/TASK-0028-SS-bounded-view-webview2.json` si SS7 est exécuté.

Les JSON doivent être synthétiques/sanitized : aucun username, hostname, chemin privé, contenu réel.

Ils sont **non canoniques et non protégés pendant l’exécution**. Ne pas étendre X5; le contrôle indépendant décidera plus tard si certains deviennent canoniques.

Si un artefact WebView2 ne peut pas être produit honnêtement, ne pas fabriquer le fichier comme PASS : enregistrer le manque dans le rapport et RESULT.

---

## 8 — contraintes de code

Préférer un harness isolé : `tools/scale-spike/`, tests/bench helpers ou équivalent.

- Aucun nouveau comportement accessible dans l’app normale.
- Aucun remplacement de `MAX_NODES_PER_MAP`.
- Aucun changement d’état de F-042/F-050/F-051.
- Aucun nouveau renderer.
- Aucune nouvelle dépendance externe sauf nécessité démontrée; préférer std + dépendances déjà présentes.
- Aucun hash de contenu massif.
- Aucun watcher, permission/team, IA, extraction, Graphify.
- Source synthétique read-only pendant mesure.

Si un petit changement sous `src/` ou `src-tauri/` est indispensable pour rendre une primitive testable, il doit être **strictement test/dev-only**, inaccessible au produit normal, couvert par tests, et justifié dans TASK-0028. Toute modification de comportement normal = hors périmètre / STOP.

---

## 9 — critères de sortie

TASK-0028 peut finir `IMPLEMENTED` si :

1. protocole gelé avant harness;
2. 10k et 100k physiques réellement mesurés ou un blocage réel documenté;
3. 1M INDEX-SCALE réellement construit et interrogé, ou échec/limite reproductible documenté;
4. P-08 100k exact/paginé mesuré;
5. prototype borné testé aux trois tailles;
6. non-proportionnalité de cardinalité évaluée;
7. SQLite/mémoire/layout mesurés honnêtement;
8. SS7/SS8 exécutés quand possible, sinon `NOT PROVEN` explicite;
9. aucun whole-graph payload 100k/1M envoyé au frontend;
10. aucune source modifiée;
11. aucun état produit F-042/F-050/F-051 changé;
12. X5 reste 36;
13. main inchangé;
14. aucune DEC-0030 ni TASK-0029 créée;
15. RESULT rend la main à l’orchestrateur pour contrôle indépendant et décision du materializer.

Un résultat négatif du spike n’est pas un échec de l’agent : **un FAIL technique honnête est une donnée valide**. `RESULT: DONE` signifie que le spike a été exécuté conformément au protocole, pas que toutes les hypothèses ont réussi.

---

## 10 — validations

Selon les fichiers réellement touchés :

- tests unitaires du harness;
- tests Rust pertinents;
- tests TS si frontend test-only touché;
- `pnpm check`;
- `pnpm build` si le frontend/build est touché;
- Tauri debug `--no-bundle` si nécessaire à SS7;
- campagnes synthétiques 10k/100k/1M;
- `git diff --check`.

Ne pas rejouer les anciennes campagnes EC15/DR15/SR15/ED15 sauf nécessité directe et explicitement justifiée; elles ne sont pas le sujet.

---

## 11 — documentation finale

Mettre à jour :

- `docs/tasks/TASK-0028-synthetic-scale-feasibility-spike.md` → `IMPLEMENTED`, jamais VERIFIED;
- `docs/performance/TASK-0028-SCALE-SPIKE-PROTOCOL.md`;
- `docs/performance/TASK-0028-SCALE-SPIKE-REPORT.md`;
- `docs/ai/CURRENT_STATE.md`;
- `docs/ai/NEXT_ACTION.md`;
- `docs/ai/HANDOFF.md`;
- `docs/ai/VALIDATION.md`;
- `docs/ai/CHANGELOG_AI.md`;
- `.orchestrator/RESULT.md`.

Ne pas modifier `DEC-0029` pour transformer une hypothèse en preuve. Ne pas créer DEC-0030.

`NEXT_ACTION.md` demande uniquement le **contrôle indépendant de TASK-0028**.

---

## 12 — RESULT.md

Écrire :

```text
TASK_ID: TASK-0028 — Synthetic Scale Feasibility Spike
AGENT: CLAUDE
RESULT: DONE | BLOCKED | FAILED
BRANCH: build/v0.2-a12-synthetic-scale-spike
FINAL_HEAD: <commit substantif>

SUMMARY:
-

SCALE_LEVELS:
- 10k physical: measured / blocked
- 100k physical: measured / blocked
- 1m index-scale: measured / blocked

STRUCTURAL_VERDICT:
- bounded-cardinality: PASS/FAIL/NOT_PROVEN
- whole-graph-to-frontend: ABSENT/PRESENT/NOT_PROVEN
- exact-aggregate-counts: PASS/FAIL/NOT_PROVEN
- modest-GPU-path: PASS/FAIL/NOT_PROVEN

VALIDATIONS:
-

IMPORTANT_FILES:
-

COMMIT:
PUSHED: yes/no

LIMITS_OR_BLOCKERS:
-

NEXT_ORCHESTRATOR_DECISION:
- independent control of TASK-0028; then decide materializer/query-engine implementation and candidate view budget
```

---

## 13 — Git final

Commit/push uniquement sur `build/v0.2-a12-synthetic-scale-spike`.

Interdits : merge, PR, release, tag, main, force push, réécriture d’historique, données réelles, création de DEC-0030/TASK-0029, implementation produit F-042/F-050/F-051, modification X5.
