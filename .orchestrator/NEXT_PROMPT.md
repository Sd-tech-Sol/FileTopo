# NEXT_PROMPT — TASK-0033 / PRODUCT ACCEPTANCE — WebView2

**TARGET_AGENT:** CLAUDE CODE  
**STATUS:** READY  
**OWNER:** orchestrateur ChatGPT  
**MODE:** validation produit ciblée + corrections seulement si observées  
**TASK:** `TASK-0033 — V1 Progressive Topographic UX`  
**BRANCHE:** `build/v0.2-a17-v1-topographic-ux`

## /goal

Ne crée aucune nouvelle fonctionnalité. Ferme uniquement le verrou d'acceptation restant de `TASK-0033` : exécuter le rejeu produit WebView2 obligatoire sur une grande arborescence synthétique, vérifier que la nouvelle topographie est réellement lisible et navigable, et corriger seulement les défauts observés dans cette portée.

`TASK-0033` reste `IMPLEMENTED`, jamais auto-`VERIFIED`. Le verdict final appartiendra ensuite à l'orchestrateur indépendant.

---

## 0 — Préconditions / Git

1. Appliquer `AGENTS.md`, `CLAUDE.md` et les protocoles actifs.
2. Basculer explicitement sur `build/v0.2-a17-v1-topographic-ux`.
3. `git fetch origin`, puis fast-forward uniquement.
4. HEAD d'orchestration attendu au minimum : commit contenant `docs/reviews/ACTION-0050-independent-control.md` et le présent prompt. Si la branche distante a avancé, expliquer chaque commit et continuer uniquement si cohérent.
5. Arbre propre avant écriture; divergence inexpliquée => `BLOCKED`.
6. Lire avant action :
   - `docs/reviews/ACTION-0050-independent-control.md`
   - `docs/tasks/TASK-0033-v1-topographic-ux.md`
   - `docs/decisions/DEC-0034-progressive-topographic-view.md`
   - `docs/product/REFERENCE_UX_OLD_FILETOPO.md`
   - `docs/ai/NEXT_ACTION.md`
   - `.orchestrator/RESULT.md`
   - scripts de preuve WebView2 existants (`TASK-0032` et autres) avant d'en écrire un nouveau.

## 1 — Réutiliser le harnais existant

Auditer d'abord les scripts WebView2 déjà présents. Réutiliser/adapters le minimum nécessaire; ne crée pas un second framework de test UI si l'existant peut couvrir le besoin.

La preuve doit utiliser uniquement des données synthétiques générées automatiquement. Aucun cerveau personnel, aucun chemin privé dans Git, aucune dépendance réseau.

## 2 — Rejeu produit obligatoire

Construire/générer une arborescence synthétique représentative d'au moins **5 000 éléments indexés** avec assez de dossiers imbriqués et de fichiers pour exercer réellement la projection dossier-first, les agrégats et plusieurs niveaux de navigation.

Exécuter le vrai produit dans **WebView2** et contrôler au minimum :

### 1366 × 768

- première ouverture centrée sur racine/focus à une échelle lisible, sans fit exhaustif;
- vrais noms de dossiers lisibles;
- pas de superposition de cartes, toolbar ou panneau contextuel;
- la carte peut déborder et reste pannable;
- zoom molette/boutons fonctionne;
- `Ajuster à l'écran` force explicitement le fit global;
- `Réinitialiser` revient à une échelle lisible, pas à un fit exhaustif;
- une pastille `+N éléments — Voir la suite` est petite et clairement distincte d'un dossier;
- activation de la pastille produit une **nouvelle projection de vrais nœuds**, sans accumulation de la page précédente;
- navigation dans une branche garde le focus visible sans changer arbitrairement l'échelle;
- sélection d'un bloc et panneau de détails restent cohérents;
- relations existantes autour d'une sélection restent visibles et sans régression.

### 1920 × 1080

Rejouer les mêmes points essentiels et confirmer que l'interface utilise l'espace supplémentaire sans modifier le contrat de projection.

## 3 — Mesures / assertions obligatoires

La preuve doit enregistrer de façon vérifiable :

- total indexé >= 5 000;
- `materializedCount <= 64` pour les projections ordinaires testées;
- `nodes + aggregates <= 512` toujours;
- après activation d'une continuation, les vrais nœuds de la nouvelle page sont différents de ceux omis de la page précédente et aucune concaténation hors budget n'est faite;
- échelle caméra avant/après une navigation de branche : conservée sauf nécessité explicite liée aux bornes;
- `Ajuster` modifie vers le fit attendu;
- `Réinitialiser` utilise l'échelle lisible;
- aucun texte visible ne contient `view_budget_or_focus`, `outside_current_projection`, `omitted_direct_children` ou « enfants directs hors vue »;
- aucune fuite de chemin absolu dans DTO, DOM/texte visible, logs de preuve ou artefact;
- 0 erreur console fatale.

Si le harnais permet des captures, conserver au minimum une preuve synthétique pour 1366×768 et une pour 1920×1080. Aucun nom/path personnel dans les images.

## 4 — Point d'attention du contrôle indépendant

La pastille compacte conserve aujourd'hui un **créneau de layout de taille carte** pour éviter les chevauchements. Ne change pas ce choix par préférence esthétique. Observe-le dans le vrai rendu :

- s'il garde une topographie claire, laisse-le;
- s'il crée des trous/espacements qui rendent encore la carte inutilement énorme ou difficile à lire, corrige de la façon minimale dans le layout borné existant, sans créer un nouveau moteur.

Même règle pour tout autre défaut : **preuve d'abord, correction ensuite**.

## 5 — Corrections autorisées si le rejeu échoue

Uniquement dans la portée TASK-0033 :

- projection/focus/pagination bornés;
- géométrie/layout de la vue bornée;
- taille/placement de la pastille;
- caméra `readableView` / `recenterOnFocus` / reset / fit;
- CSS/SVG nécessaires à la lisibilité;
- harnais de preuve et tests associés.

Interdits : nouveau renderer, second index/store/catalogue, snapshot complet frontend, watcher/incrémental, FTS5, Explorer, nouvelle permission filesystem, cloud/réseau/LLM/MCP, GPU requis, ou nouvelle TASK.

## 6 — Régressions/tests

Après le rejeu — et après toute correction éventuelle — exécuter au minimum :

- tests Rust ciblés projection + suite Rust complète `cargo test --offline`;
- tests TypeScript ciblés puis suite complète;
- `pnpm check`;
- `pnpm build`;
- `cargo build --offline`;
- `cargo fmt --check` sur les fichiers Rust touchés;
- `cargo clippy --all-targets --offline -- -D warnings` et comparaison honnête avec la dette de 26 erreurs;
- `git diff --check`.

Aucun nouveau diagnostic attribuable à cette passe.

## 7 — Documentation

Mettre à jour uniquement ce qui est nécessaire :

- `docs/tasks/TASK-0033-v1-topographic-ux.md`;
- `docs/ai/CURRENT_STATE.md`;
- `docs/ai/HANDOFF.md`;
- `docs/ai/NEXT_ACTION.md`;
- `docs/ai/VALIDATION.md`;
- `docs/ai/CHANGELOG_AI.md`;
- `.orchestrator/RESULT.md`;
- artefacts/captures WebView2 synthétiques nécessaires.

Corriger aussi la petite incohérence documentaire signalée par `ACTION-0050` : la première ouverture utilise `readableView`, pas `fitView`.

## 8 — État final attendu

- `TASK-0033 = IMPLEMENTED`, **jamais auto-VERIFIED**;
- `DEC-0034 = APPROVED`;
- aucune `TASK-0034` précréée;
- `NEXT_ACTION = nouveau contrôle indépendant de TASK-0033`;
- commit + push uniquement sur `build/v0.2-a17-v1-topographic-ux`;
- aucun PR/merge/tag/release.

Dans `.orchestrator/RESULT.md`, fournir : HEAD/commits, harnais réutilisé ou adapté, taille de l'arbre synthétique, résultats séparés 1366×768 et 1920×1080, métriques caméra/projection, captures/artefacts créés, corrections éventuellement nécessaires et pourquoi, tests complets, état Clippy, confidentialité, `TASK_STATUS: IMPLEMENTED`, puis `NEXT: independent recontrol only`.
