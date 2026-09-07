TASK_ID: TASK-0027
AGENT: CLAUDE
RESULT: DONE
BRANCH: build/v0.2-a11-progressive-scale-architecture
FINAL_HEAD: beef152

SUMMARY:
- Tranche DOCUMENTAIRE / architecture uniquement. Aucune implémentation produit : rien sous src/, src-tauri/, scripts/, graph/ ni docs/performance/runs/. Aucun JSON de preuve touché. MAX_NODES_PER_MAP reste à 5_000 dans le code.
- DEC-0029 créée, statut APPROVED — enregistrée, jamais prouvée comme performance. Neuf points A à I. Énoncé gelé : FileTopo indexe grand, matérialise petit, et ne rend que le contexte utile. Corpus, graphe logique, vue matérialisée et rendu sont quatre plans distincts; 1 élément indexé = 1 entité accessible, pas 1 carte simultanément rendue. MAX_NODES_PER_MAP = 5000 requalifié en limite de tranche historique, pas en limite produit de corpus, destiné à être remplacé par un budget de vue.
- docs/architecture/PROGRESSIVE_SCALE_ARCHITECTURE.md créé : chaîne cible index complet -> graphe logique -> query engine borné -> progressive materializer -> sous-graphe et agrégats -> layout de cette vue seulement -> renderer borné. Le frontend ne reçoit jamais un whole-graph JSON.
- Parité amendée sans perte : amendement normatif P-SCALE-R1 sur P-01, P-02 et P-03, formulations d'origine CONSERVÉES ET VISIBLES sous les nouvelles, à la manière de P02-R1. Les trois amendements AJOUTENT des obligations de véracité — atteignabilité de tout élément indexé, déclaration de tout repli ou agrégat avec compte exact, pagination qui ne perd aucun enfant réel. Le contrat reste à 22 exigences. P-08 (recherche sur 100 000 nœuds) entière et devenue pilier du scale spike.
- Matrice 49 -> 51. Ajouts : F-050 matérialisation progressive et vue bornée (MVP, P0), F-051 agrégats et méta-nœuds exacts (MVP, P0). Une seule reclassification, et elle MONTE : F-042 ULTÉRIEUR -> MVP, motif écrit (repli/dépli/focus deviennent la primitive qui détermine le contenu de la vue). Répartition MVP 44 / ULTÉRIEUR 2 / DIFFÉRÉ 5, F-001 à F-051 sans trou ni doublon. F-047 reste DIFFÉRÉ; F-043/F-044/F-045 restent implémentées et vérifiées; F-046 reste PROPOSED.
- Arbitrage écrit de F-051 en P0 et non P1 : F-050 cache nécessairement des éléments réels; sans F-051 la vue devrait soit les taire (violation de P-02 amendée) soit renoncer à matérialiser (annulation de F-050). Les deux se livrent ensemble ou pas du tout.
- Frontières produit gelées : Graphify NOT INTEGRATED (aucune dépendance, aucun runtime, aucun adaptateur, aucun graph.json global, aucun dashboard, aucun pipeline LLM obligatoire; seuls des enseignements conservés). Forge reste un projet entièrement distinct. Aucun renderer final choisi — React Flow, ELK, Sigma, Cytoscape, Pixi restent candidats à benchmarker. Le fonctionnement de base ne peut dépendre ni d'un GPU puissant ni de WebGL.
- Roadmap complétée sans réordonnancement : séquence PROPOSED après TASK-0027 (scale spike 10k/100k/1M, materializer + budget de vue + F-042 + agrégats, recherche/filtres/watchers, permissions/équipe, finition visuelle en étape B). AUCUNE de ces tâches n'est créée. Tranche design explicitement prévue, aucun design ni renderer choisi.
- DÉFAUT TROUVÉ ET CORRIGÉ : la ligne F-008 de FEATURE_MATRIX.md portait encore, en colonne Écart, le constat courant « F-042 reste ultérieure », devenu faux avec la promotion. Corrigé par note datée, constat d'époque conservé, jamais réécrit en silence.

VALIDATIONS:
- Préconditions : parent de b580942 = ffa9504 conforme; X5 = 36 compté dans src/map/runArtifacts.ts; TASK-0027 et DEC-0029 inexistantes; origin/main = 1a7d652c; arbre propre; fast-forward = Already up to date.
- Liens relatifs des 14 documents créés ou amendés : 0 lien cassé, contrôlé mécaniquement.
- Identifiants F : 51 lignes dans FEATURE_MATRIX.md et 51 dans REQUIREMENTS_BASELINE.md, F-001 à F-051, aucun trou, aucun doublon, contrôlé mécaniquement.
- F-042 classée MVP de façon identique dans FEATURE_MATRIX.md, REQUIREMENTS_BASELINE.md et DEC-0029; valeur d'origine ULTÉRIEUR conservée en note, non concurrente.
- Aucune occurrence de Graphify comme dépendance ou roadmap d'intégration : NOT INTEGRATED partout.
- Aucun chiffre 10k/100k/1M présenté comme mesuré : tous déclarés cibles de validation futures.
- Aucun changement sous src/, src-tauri/, scripts/, graph/, docs/performance/runs/ : contrôlé sur git status.
- X5 après écriture : 36, inchangé. MAX_NODES_PER_MAP : 5_000, inchangé.
- origin/main : 1a7d652c, non touché, non mergé, non cherry-piqué.
- git diff --check : PASS.

IMPORTANT_FILES:
- docs/tasks/TASK-0027-progressive-scale-architecture-realignment.md (créé)
- docs/decisions/DEC-0029-progressive-materialization-and-scale-boundary.md (créé)
- docs/architecture/PROGRESSIVE_SCALE_ARCHITECTURE.md (créé)
- docs/product/CARTETOPO_FUNCTIONAL_PARITY.md (amendement P-SCALE-R1 sur P-01/P-02/P-03, P-08 pilier)
- docs/product/FEATURE_MATRIX.md, docs/product/REQUIREMENTS_BASELINE.md (49 -> 51, F-042 promue)
- PROJECT_VISION.md, ROADMAP.md, docs/architecture/ARCHITECTURE_BASELINE.md (amendements par renvoi)
- docs/ai/CURRENT_STATE.md, NEXT_ACTION.md, HANDOFF.md, VALIDATION.md (section AS), CHANGELOG_AI.md

COMMIT: beef152 docs(task-0027): record progressive scale architecture realignment
PUSHED: yes

LIMITS_OR_BLOCKERS:
- performance 10k/100k/1M not yet measured
- materializer/LOD/meta-nodes not yet implemented
- Graphify not integrated by product decision
- F-046 physical identity remains blocked by DEC-0013/F
- Aucune suite de tests rejouée, aucun build Tauri, aucun pnpm build, aucun replay WebView2 : la tâche ne touche aucun code, aucune régression d'exécution n'est possible ni contrôlée.
- Cohérence documentaire établie par relecture, pas par un vérificateur automatisé de contenu; seuls liens et identifiants F ont été contrôlés mécaniquement.
- Écart préexistant signalé, hors périmètre : docs/decisions/README.md n'indexe pas DEC-0024 à DEC-0028; DEC-0029 n'y a donc pas été ajoutée non plus, pour ne pas créer une liste à moitié tenue. À trancher par l'orchestrateur.
- R8 entière, X10 hors Windows non prouvée race-safe, X5 inchangé à 36.
- Aucune TASK-0028 créée. Aucune fusion, PR, release, étiquette, publication vers main, force push ni réécriture d'historique.

NEXT_ORCHESTRATOR_DECISION:
- independent control of TASK-0027, then scale spike
