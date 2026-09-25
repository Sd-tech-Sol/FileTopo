# NEXT_PROMPT — TASK-0046 — V1 Complete FR/EN Runtime

**TARGET_AGENT:** CLAUDE CODE  
**RECOMMENDED_MODEL:** Sonnet 5, high effort  
**STATUS:** READY  
**BRANCH:** `build/v0.2-a30-v1-complete-fr-en-runtime`

## /goal

Implémenter intégralement
`docs/tasks/TASK-0046-v1-complete-fr-en-runtime.md`
selon
`docs/decisions/DEC-0044-global-fr-en-runtime.md`.

Le runtime produit réel est `src/map/MapApp.tsx`.
Le vieux `src/App.tsx` n'est qu'une référence historique.

Objectif : FR/EN complet du runtime courant, avec choix explicite persistant,
sans nouveau backend de préférence et sans commencer l'audit WCAG global.

## 0 — Préconditions

1. Appliquer `AGENTS.md` et `CLAUDE.md`.
2. Basculer explicitement sur
   `build/v0.2-a30-v1-complete-fr-en-runtime`.
3. `git fetch origin`.
4. Synchroniser uniquement en fast-forward avec
   `origin/build/v0.2-a30-v1-complete-fr-en-runtime`.
5. Vérifier arbre propre.
6. Vérifier que HEAD contient :
   - `ACTION-0075`;
   - `ACTION-0076`;
   - `DEC-0044`;
   - `TASK-0046`.
7. Lire DEC-0044 et TASK-0046 en entier avant code.

STOP/BLOCKED si une précondition est fausse.

## 1 — Audit reuse-first AVANT code

Écrire d'abord dans RESULT l'inventaire des chaînes utilisateur et des surfaces :

- `src/main.tsx`;
- `src/lib/locale.ts` + tests;
- ancien `src/App.tsx` seulement comme exemple;
- `MapApp.tsx`;
- `ChangeJournalPanel.tsx`;
- `CrossRelationsPanel.tsx`;
- `ExactDuplicateExplorer.tsx`;
- `FilterPanel.tsx`;
- `MapView.tsx`;
- `NodeChangeState.tsx`;
- `RelationsPanel.tsx`;
- `ReviewQueuePanel.tsx`;
- `SourceObservationBadge.tsx`;
- `WatchStatusBadge.tsx`;
- `ContentObservationsPanel.tsx`;
- `DetailsPanel.tsx`;
- `relations.ts`;
- `filters.ts`;
- tout autre helper qui produit du texte visible/aria.

Conclusion attendue si le code courant le confirme :
`src/lib/locale.ts` est la source de vérité globale à réutiliser.

## 2 — Locale globale MapApp

Utiliser `Locale`, `resolveInitialLocale`, `storeLocale`.

Le runtime doit :

- résoudre la locale au démarrage;
- rendre avec `strings[locale]`;
- mettre `document.documentElement.lang = locale`;
- offrir un contrôle FR/EN explicite;
- appeler `storeLocale` uniquement sur choix humain;
- continuer à fonctionner si le storage refuse.

Aucune commande Tauri ne doit être émise par un changement de langue.

## 3 — Pas de second système i18n

Interdit :

- package i18n;
- backend de préférence;
- table SQLite;
- deuxième clé localStorage;
- duplication de composants FR vs EN.

Réutiliser la clé existante :
`filetopo.locale`.

## 4 — Compléter le dictionnaire principal

Le dictionnaire de `MapApp` doit avoir exactement les deux locales avec un
contrat commun typé.

Extraire/localiser tous les textes produit encore codés en dur :

- lifecycle / indexation;
- recherche;
- statuts;
- erreurs produit;
- rapports visibles;
- boutons développeur visibles;
- aria-labels;
- compteurs;
- éditeur d'identité;
- actions reveal/copy;
- labels de panneau.

Un texte de diagnostic backend brut peut rester en détail secondaire seulement
si aucune taxonomie fermée existante ne permet une traduction honnête; le
préfixe produit reste localisé.

## 5 — Localiser les panneaux enfants

Rendre locale-aware, sans déplacer leur logique métier :

- ChangeJournalPanel;
- CrossRelationsPanel;
- ExactDuplicateExplorer;
- FilterPanel;
- MapView;
- NodeChangeState;
- RelationsPanel;
- ReviewQueuePanel.

Réutiliser les composants déjà FR/EN :

- SourceObservationBadge;
- WatchStatusBadge;
- ContentObservationsPanel;
- DetailsPanel.

Passer `locale` ou des dictionnaires typés depuis MapApp.

## 6 — Helpers

Tout helper qui produit du texte visible doit devenir locale-aware :

- labels d'état/type/disponibilité des filtres;
- `describeFilter`;
- compteurs de correspondances;
- provenance/type de relation;
- descriptions relationnelles / aria;
- agrégats de carte;
- formats date/nombre si actuellement figés sur fr-CA.

Ne jamais traduire les valeurs wire ou les enums avant un invoke.

## 7 — Données utilisateur

Ne jamais traduire :

- nom d'un cerveau;
- nom d'un fichier/dossier;
- chemin relatif;
- identifiants;
- contenu.

Seulement l'interface autour.

## 8 — Contrôle automatique de complétude

Obligatoire :

- dictionnaires exhaustifs `Record<Locale, ...>` ou équivalent;
- tests FR/EN des helpers refactorés;
- test du vrai `MapApp` en FR;
- test du vrai `MapApp` en EN;
- source guard contre les anciens forçages :
  - `const t = strings.fr`;
  - `locale="fr"` dans le runtime;
  - `document.documentElement.lang = "fr"`.

Le test d'intégration doit couvrir un libellé unique de chaque grande surface,
pas seulement le toggle.

Si l'audit découvre une autre surface utilisateur française, elle entre dans
TASK-0046. Ne laisse pas une phrase visible en français dans la vue anglaise.

## 9 — Persistance

Tester :

- aucun choix + navigateur FR -> FR;
- aucun choix + navigateur non-FR -> EN;
- choix EN + système FR -> EN;
- choix FR + système EN -> FR;
- storage corrompu -> système/fallback;
- storage refusé -> session continue sans crash.

Ne pas écrire la locale au démarrage si aucun choix explicite n'est fait.

## 10 — Non-régression d'état

Une bascule de langue ne change pas :

- cerveau actif;
- catalogue;
- composition;
- sélection;
- resume state;
- Index/révision;
- journal/seen;
- relations;
- watcher;
- source.

Sur le fil Tauri : **zéro commande causée par le toggle**.

Attention aux effets React : n'ajoute pas `locale` à une dépendance qui ferait
recharger des données si un dictionnaire/local formatting suffit.

## 11 — WebView2 réel

Preuve obligatoire sur le vrai runtime :

### Processus 1
1. ouvrir l'application;
2. choisir EN par l'UI;
3. vérifier `document.documentElement.lang === "en"`;
4. vérifier des textes anglais dans chaque grande surface localisée;
5. vérifier que noms de cerveaux/nœuds sont inchangés;
6. vérifier zéro invoke causé par le changement;
7. vérifier `localStorage["filetopo.locale"] === "en"`;
8. fermer réellement.

### Processus 2
9. relancer le même profil;
10. vérifier EN **avant interaction**;
11. vérifier que le choix a survécu;
12. basculer FR par l'UI;
13. vérifier `document.lang === "fr"`;
14. vérifier les mêmes surfaces en français;
15. vérifier encore zéro invoke causé par le toggle.

Publier les valeurs logiques observées dans l'artefact.

## 12 — Ne pas casser TASK-0044

Le test de TASK-0044 qui affirme que le **resume state** n'utilise pas le
storage navigateur doit rester vrai dans son sens.

Si son nom/commentaire devient ambigu maintenant qu'une locale globale utilise
la clé déjà existante, clarifie le test sans affaiblir son assertion :

- resume state -> catalogue;
- locale -> seule clé `filetopo.locale`.

Ne déplace jamais le resume state vers localStorage.

## 13 — Validation complète

- `pnpm test`;
- `pnpm check`;
- `pnpm build`;
- `cargo test --offline`;
- `cargo build --offline`;
- Tauri debug;
- vrai WebView2 avec redémarrage;
- Clippy avec dette historique séparée;
- `git diff --check`;
- `scripts/audit-public-readiness.ps1 -AllowRemotes`.

## 14 — Documentation

À la fin :

- TASK-0046 = `IMPLEMENTED`, jamais auto-VERIFIED;
- F-035 = `IMPLEMENTED`;
- langue de P-19 = prête à contrôle indépendant;
- langue de P-21 = prête à contrôle indépendant;
- P-19 reste PARTIELLE;
- P-21 reste PARTIELLE;
- F-036 reste PROPOSED;
- mettre à jour FEATURE_MATRIX, CURRENT_STATE, HANDOFF, VALIDATION,
  CHANGELOG_AI et NEXT_ACTION.

## 15 — Gouvernance

- aucune TASK-0047;
- aucun audit WCAG global dans cette tranche;
- aucun PR/merge/tag/release;
- push uniquement sur la branche courante;
- arbre propre;
- NEXT_ACTION = contrôle indépendant de TASK-0046.
