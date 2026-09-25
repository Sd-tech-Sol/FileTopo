# ACTION-0077 — Contrôle indépendant TASK-0046 / fermeture F-035

- **Date :** 2026-09-25
- **Statut :** `CLOSED / VERIFIED`
- **Branche contrôlée :** `build/v0.2-a30-v1-complete-fr-en-runtime`
- **HEAD contrôlé :** `15163a01dffcb287b2cf2bd686368612f26cb59b`
- **Commit produit :** `678c41752cf785388b9e0225250cd27b500c79eb`
- **Base d'orchestration TASK-0046 :** `52c348c3aa1cb5766b53c7cab3dc4d87c255fa9e`

## Verdict

**TASK-0046 = VERIFIED. F-035 = VERIFIED dans sa portée.**

La partie **langue** de `P-19` et de `P-21` est acquise. `P-19` et `P-21`
restent **PARTIELLES** : l'accessibilité globale `F-036` n'était pas dans
TASK-0046, et `P-19` conserve aussi ses écarts distincts (notamment composition
multi-cerveaux complète et préférences non encore couvertes).

## Contrôle indépendant

Le contrôle n'a pas repris le RESULT comme verdict. Les points suivants ont été
recoupés dans le code et les artefacts du HEAD :

1. **Réutilisation de la locale existante.** `src/lib/locale.ts` a exactement le
   même blob qu'à la base TASK-0046. `package.json` est également inchangé :
   aucun deuxième moteur i18n, paquet, backend ou stockage n'a été ajouté.
2. **Chemin runtime.** `MapApp` initialise `locale` par
   `resolveInitialLocale()`, sélectionne `strings[locale]`, et
   `chooseLocale` ne fait que `setLocale(next)` puis `storeLocale(next)`.
   `document.documentElement.lang` suit la locale dans un effet isolé.
3. **Aucun effet backend d'une bascule.** Les tests du vrai `MapApp` figent le
   nombre d'invocations avant la bascule et exigent une tranche vide après.
   Les gardes de source refusent aussi `locale` dans un effet qui invoque.
4. **Contrat bilingue typé.** `mapStrings.ts` expose
   `Record<Locale, MapStrings>`; les tests de complétude bloquent les clés
   manquantes, les forçages FR, une deuxième clé de stockage et un paquet i18n.
5. **Surfaces visibles et accessibilité de texte.** `localeRuntime.test.tsx`
   rend les grandes surfaces en FR et EN, vérifie des libellés propres à chaque
   langue, scanne le texte et les noms accessibles contre le français résiduel
   et confirme que les données utilisateur ne sont pas traduites.
6. **Persistance et reprise.** L'artefact
   `TASK-0046-webview2.json` publie un hôte `fr-CA` simulé, une vraie
   fermeture/reprise avec le même profil, EN restauré avant interaction puis
   retour FR par clic réel.
7. **État inchangé.** Autour de chaque bascule, l'artefact compare catalogue,
   resume records, révisions et comptes Index/journal/unseen, SHA-256 des deux
   racines et sélection. Les commandes produit observées pendant la bascule
   sont `[]`; le storage contient uniquement `filetopo.locale`.
8. **Frontière backend.** Aucun fichier produit Rust n'est modifié dans la
   tranche; aucune migration, table ou commande de langue n'existe.
9. **Falsification.** Les tests déclarés couvrent les retours de forçage FR,
   écriture au démarrage, effet invoquant lié à la locale, `html lang` figé,
   statut figé; la preuve réelle refuse une bascule qui appellerait
   `map_brains`.

## Preuves de l'exécuteur, distinguées du contrôle

Claude rapporte 582 tests TypeScript PASS, 753 tests Rust PASS (6 ignorés),
`pnpm check`, builds frontend/Rust/Tauri debug, `git diff --check` et audit
public verts. Aucun workflow GitHub Actions ni statut CI n'est attaché au HEAD.
L'environnement de contrôle n'a pas pu cloner GitHub pour rejouer ces suites;
ces chiffres restent donc **preuves de l'exécuteur**, tandis que le contrôle
ci-dessus est une vérification indépendante du code, des gardes de tests et de
l'artefact publié.

## Limites acceptées

- langue hôte simulée par `--lang=fr-CA`, mais réellement vue par WebView2;
- clics via CDP, fermeture normale;
- scénarios historiques `FILETOPO_AUTO_*` non rejoués;
- diagnostics backend bruts non apparus dans la preuve réelle;
- `F-036` / WCAG global explicitement hors portée.

Aucune de ces limites n'invalide le contrat de TASK-0046.

## Décision

- `TASK-0046` : **VERIFIED**;
- `F-035` : **VERIFIED dans sa portée**;
- partie langue de `P-19` : **acquise**;
- partie langue de `P-21` : **acquise**;
- `P-19` : **PARTIELLE**;
- `P-21` : **PARTIELLE**;
- `F-036` : reste ouverte et doit être auditée séparément.
