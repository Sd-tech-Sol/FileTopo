# NEXT_PROMPT — TASK-0047 — V1 Accessibility Closure

Tu es l'exécuteur de TASK-0047 pour FileTopo.

## Autorité

Lis d'abord, dans cet ordre :

1. `docs/decisions/DEC-0045-accessibility-closure-boundary.md`
2. `docs/tasks/TASK-0047-v1-accessibility-closure.md`
3. `docs/reviews/ACTION-0077-task0046-independent-control.md`
4. `docs/reviews/ACTION-0078-f036-accessibility-audit.md`
5. `docs/product/CARTETOPO_FUNCTIONAL_PARITY.md` — surtout P-21
6. `docs/product/FEATURE_MATRIX.md` — surtout F-036
7. `docs/ai/CURRENT_STATE.md`
8. `docs/ai/VALIDATION.md`
9. `docs/ai/HANDOFF.md`

Git et ces documents sont la source de vérité.

## Objectif unique

Implémenter **TASK-0047 — V1 Accessibility Closure** sur la branche courante,
sans ouvrir TASK-0048.

Le but n'est pas de refaire l'interface. Le runtime possède déjà plusieurs
briques accessibles. Tu dois :

- mesurer le vrai runtime;
- réutiliser ces briques;
- corriger seulement les écarts observés;
- publier une preuve locale, falsifiable et suffisamment riche pour permettre
  un contrôle indépendant.

## Frontières non négociables

- Tauri + Rust + SQLite + React/TypeScript inchangés comme architecture.
- Aucun changement de source analysée.
- Un seul Index canonique.
- VIEW_BUDGET = 512.
- Aucun whole-graph DTO.
- Aucun nouveau store/base/catalogue.
- Aucun provider/cloud/service d'accessibilité.
- Aucun MCP Axe.
- Aucun envoi de contenu, page ou capture à un tiers.
- Pas de Rust sauf nécessité démontrée impossible à corriger côté frontend.
- P-19 reste hors tranche.
- Ne crée aucune préférence d'accessibilité FileTopo pour « compléter » le
  produit artificiellement.
- F-035/TASK-0046 ne doit pas régresser.
- Aucune certification générale « WCAG compliant ».

## Reuse-first / dépendance

Avant d'installer quoi que ce soit, vérifie **axe-core@4.13.0** :

- package `axe-core`;
- repo officiel `dequelabs/axe-core`;
- version exacte;
- licence MPL-2.0;
- mainteneur/auteur cohérent Deque;
- dépendances déclarées;
- intégrité publiée.

Si ces faits ne concordent pas ou ne peuvent pas être vérifiés, STOP et écris
un RESULT BLOCKED. Ne remplace pas par un autre package.

Si validé, ajoute **seulement** :

`axe-core@4.13.0` comme devDependency exacte.

N'ajoute pas `@axe-core/playwright`, `jest-axe`, Playwright, Puppeteer ou un
MCP/service si le core + le harnais WebView2 existant suffisent.

## Méthode obligatoire

1. Fais le baseline accessibilité **avant** les corrections.
2. Injecte axe-core localement dans le vrai WebView2 Tauri.
3. Ouvre les surfaces riches requises par TASK-0047.
4. Publie violations + incomplete + contexte logique dans un artefact JSON.
5. Corrige les causes minimales.
6. Rejoue axe dans FR/EN et clair/sombre lorsque applicable.
7. Fais le parcours clavier réel complet avec événements d'entrée navigateur.
8. Vérifie focus visible, sortie sans piège, sémantique ARIA.
9. Vérifie contraste de texte et non-textuel applicable.
10. Vérifie qu'aucun sens n'est porté par la couleur seule.
11. Émule `prefers-reduced-motion: reduce` et contrôle les styles calculés.
12. Vérifie les invariants source/Index/journal/seen/resume/watcher et le
    SHA-256 de la racine générée.
13. Fais les sabotages demandés et prouve qu'ils échouent.
14. Rejoue la validation canonique sur le code final.

Un `axe.run()` vert seul n'est **pas** suffisant.

## Règles axe

- Ne désactive pas globalement une règle pour faire passer le build.
- Un résultat `incomplete` doit être revu et classé.
- Un faux positif/inapplicable doit être documenté par rule id, cible, raison et
  preuve manuelle.
- La preuve contraste autoritaire vient du vrai WebView2, pas de JSDOM.

## Preuve réelle

Crée un artefact :

`docs/performance/runs/TASK-0047-webview2.json`

Il doit au minimum contenir :

- version axe-core;
- version/moteur WebView2;
- matrice des états audités;
- violations finales (attendu : aucune non justifiée dans le scope);
- incomplete + décisions;
- parcours clavier avec focus avant/après;
- focus visible;
- contrastes mesurés/contrôlés;
- inventaire des alternatives non colorées;
- preuve reduced-motion;
- FR/EN;
- clair/sombre si servis;
- invariants d'état;
- SHA-256 source avant/après;
- erreurs console fatales;
- limites honnêtes.

Aucune donnée personnelle. Utilise seulement des fixtures/racines générées par
la preuve.

## Validation complète

Exécute tout ce que TASK-0047 §L exige. Les chiffres de tests finaux doivent
être publiés dans VALIDATION et RESULT.

S'il existe une dette Clippy historique, compare-la à une référence et ne la
mélange pas au verdict de la tranche.

## Documentation / fin de travail

Mets à jour au minimum :

- `.orchestrator/RESULT.md`;
- `docs/tasks/TASK-0047-v1-accessibility-closure.md`;
- `docs/ai/VALIDATION.md`;
- `docs/ai/CURRENT_STATE.md`;
- `docs/ai/HANDOFF.md`;
- `docs/ai/NEXT_ACTION.md`;
- `docs/ai/CHANGELOG_AI.md`;
- `docs/product/FEATURE_MATRIX.md`.

À la fin :

- TASK-0047 = IMPLEMENTED, jamais auto-VERIFIED;
- F-036 = IMPLEMENTED, jamais auto-VERIFIED;
- P-21 reste PARTIELLE jusqu'au contrôle indépendant;
- P-19 reste PARTIELLE;
- aucune TASK-0048;
- aucun PR / merge / tag / release;
- commit + push;
- arbre propre.

Dans RESULT, sépare explicitement :
1. preuves réellement exécutées;
2. contrôles/falsifications;
3. limites et éléments non testés;
4. décision attendue de l'orchestrateur.
