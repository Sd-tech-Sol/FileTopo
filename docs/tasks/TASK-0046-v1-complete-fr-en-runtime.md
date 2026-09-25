# TASK-0046 — V1 Complete FR/EN Runtime

- **Date :** 2026-09-25
- **Statut :** `VERIFIED`
- **Branche :** `build/v0.2-a30-v1-complete-fr-en-runtime`
- **Décision :** `DEC-0044`
- **Portée :** `F-035`, langue de `P-19` / `P-21`
- **Prérequis :** `TASK-0045` VERIFIED par `ACTION-0075`; `ACTION-0076`

## But

Rendre le **runtime réellement lancé** (`MapApp`) intégralement utilisable en
français et en anglais, avec choix explicite persistant.

Réutiliser `src/lib/locale.ts`. Aucun nouveau backend de préférence.

## A — Audit reuse-first obligatoire

Avant le code, inventorier dans RESULT :

- `src/main.tsx`;
- `src/lib/locale.ts` + tests;
- l'ancien `src/App.tsx` seulement comme exemple d'intégration;
- dictionnaire `strings` de `MapApp`;
- `SourceObservationBadge`;
- `WatchStatusBadge` / `WATCH_STRINGS`;
- `ContentObservationsPanel`;
- `DetailsPanel`;
- toutes les surfaces françaises listées dans ACTION-0076;
- `relations.ts`, `filters.ts`, `MapView`.

Produire la liste des chaînes utilisateur restantes avant modification.

## B — Locale globale dans MapApp

Ajouter :

- `const [locale, setLocale] = useState(() => resolveInitialLocale())`;
- dictionnaire courant dérivé de `locale`;
- synchronisation de `document.documentElement.lang`;
- contrôle explicite FR/EN;
- `storeLocale` uniquement sur choix explicite.

Le changement de langue ne doit déclencher aucun invoke Tauri.

## C — Dictionnaire MapApp exhaustif

Faire évoluer le dictionnaire principal vers deux locales complètes avec type
commun.

Déplacer dans ce contrat tout texte produit actuellement codé en dur dans
`MapApp` :

- actions lifecycle;
- messages de statut;
- recherche;
- erreurs reveal/copy;
- rapports visibles;
- aria-labels;
- compteurs;
- éditeur d'identité;
- texte développeur encore visible à l'écran.

Ne pas traduire les noms/données des cerveaux ou des nœuds.

## D — Composants enfants

Rendre locale-aware, sans dupliquer la logique :

- `ChangeJournalPanel`;
- `CrossRelationsPanel`;
- `ExactDuplicateExplorer`;
- `FilterPanel`;
- `MapView`;
- `NodeChangeState`;
- `RelationsPanel`;
- `ReviewQueuePanel`.

Réutiliser tels quels quand possible :

- `SourceObservationBadge`;
- `WatchStatusBadge`;
- `ContentObservationsPanel`;
- `DetailsPanel`.

Le parent passe `locale` ou des strings typées.

## E — Helpers visibles

Localiser les helpers dont le retour arrive à l'écran ou dans un aria-label :

- provenance / type de relation;
- description de filtre;
- compteurs de correspondances;
- libellés d'agrégats;
- tout helper équivalent trouvé par audit.

Les enums et données wire restent inchangés.

## F — Complétude automatique

Ajouter des tests qui rendent impossible un dictionnaire incomplet.

Obligatoire :

1. `Record<Locale, ...>` exhaustif ou équivalent typé;
2. tests unitaires des deux langues pour chaque helper visible refactoré;
3. test du vrai `MapApp` en FR et EN;
4. source guard contre :
   - `const t = strings.fr`;
   - `locale="fr"` dans le runtime;
   - `document.documentElement.lang = "fr"`;
5. inventaire testé des surfaces de ACTION-0076.

Les tests doivent vérifier des libellés **uniques** de chaque grande surface,
pas seulement le bouton de langue.

## G — Persistance

Cas obligatoires :

- sans choix stocké + navigateur français => FR;
- sans choix stocké + navigateur non français => EN;
- choix explicite EN sur système FR => EN;
- choix explicite FR sur système EN => FR;
- valeur stockée corrompue => résolution système/fallback;
- storage qui refuse => pas de crash, choix de session utilisable.

Ne créer aucune deuxième clé de storage.

## H — Redémarrage réel WebView2

Preuve réelle obligatoire :

1. démarrer le vrai runtime;
2. choisir explicitement **EN** via le contrôle utilisateur;
3. vérifier `document.lang = en`;
4. vérifier en anglais un échantillon de **chaque grande surface localisée**;
5. confirmer noms de cerveau/nœuds inchangés;
6. confirmer aucune commande backend provoquée par le changement de langue;
7. fermer réellement;
8. relancer le même profil;
9. confirmer EN restauré avant toute interaction;
10. basculer explicitement vers FR;
11. vérifier `document.lang = fr` et les mêmes surfaces en français.

L'artefact doit publier les chaînes logiques contrôlées, pas seulement
« l'écran semble anglais ».

## I — Régression d'état

Avant/après chaque bascule FR/EN :

- même cerveau actif;
- mêmes brains records;
- même sélection;
- même resume state;
- même revision/index;
- même journal/seen;
- mêmes relations.

Aucune lecture source et aucune écriture produit autre que
`localStorage[filetopo.locale]`.

## J — Ne pas sur-déclarer

À la fin :

- `F-035 = IMPLEMENTED`, jamais auto-VERIFIED;
- `P-19` reste PARTIELLE;
- `P-21` reste PARTIELLE;
- documenter seulement « language portion ready for independent closure ».

Ne pas commencer F-036.

## K — Validation full

- `pnpm test`;
- `pnpm check`;
- `pnpm build`;
- `cargo test --offline`;
- `cargo build --offline`;
- Tauri debug + vrai WebView2;
- Clippy, dette historique séparée;
- `git diff --check`;
- `scripts/audit-public-readiness.ps1 -AllowRemotes`.

## L — Gouvernance

- TASK-0046 = `IMPLEMENTED`, jamais auto-`VERIFIED`;
- aucune TASK-0047;
- aucun travail WCAG global;
- aucun PR/merge/tag/release;
- `.orchestrator/RESULT.md` compact;
- docs de vérité réconciliées;
- `NEXT_ACTION = contrôle indépendant de TASK-0046`;
- push uniquement sur la branche courante;
- arbre propre.


## Exécution — IMPLEMENTED — 2026-09-25

- **Statut : `IMPLEMENTED`**, jamais auto-`VERIFIED`. Code `678c417` sur `build/v0.2-a30-v1-complete-fr-en-runtime`.
  Audit reuse-first, changements, preuves et limites : [VALIDATION section CC](../ai/VALIDATION.md).
- `src/lib/locale.ts` réutilisé sans modification; locale globale dans `MapApp`, contrôle Français / English, `storeLocale`
  seulement sur choix; dictionnaire de `MapApp` en `Record<Locale, MapStrings>`; panneaux et helpers localisés; aucune
  commande, aucune table, aucun fichier, aucune seconde clé, aucun paquet.
- Preuve réelle : `docs/performance/runs/TASK-0046-webview2.json` (hôte français simulé, un redémarrage réel, même profil,
  choix EN puis FR par de vrais clics, zéro commande à la bascule).
- **F-035 : `IMPLEMENTED`.** Langue de `P-19` et de `P-21` : prête pour contrôle indépendant. `P-19` / `P-21` PARTIELLES;
  `F-036` PROPOSED, non commencée.
- **Action suivante : contrôle indépendant de `TASK-0046`.**


## Contrôle indépendant — ACTION-0077 — VERIFIED — 2026-09-25

- HEAD contrôlé : `15163a01dffcb287b2cf2bd686368612f26cb59b`; code : `678c417`.
- `locale.ts` et `package.json` inchangés depuis la base; aucun second système i18n.
- Chemin runtime, zéro commande à la bascule, dictionnaires typés, persistance, données utilisateur inchangées et artefact WebView2 recoupés indépendamment.
- **TASK-0046 = VERIFIED; F-035 = VERIFIED dans sa portée.** Partie langue de P-19/P-21 acquise; P-19/P-21 restent PARTIELLES pour leurs autres critères.
- Détail : [ACTION-0077](../reviews/ACTION-0077-task0046-independent-control.md).
