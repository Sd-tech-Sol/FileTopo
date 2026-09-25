# DEC-0044 — FR/EN is one global UI preference over the current MapApp runtime

- **Date :** 2026-09-25
- **Statut :** `APPROVED`
- **Portée :** `F-035`, partie langue de `P-19` et `P-21`
- **Prérequis :** `TASK-0045` VERIFIED par `ACTION-0075`; audit `ACTION-0076`

## Constat

Le runtime réellement lancé est `src/map/MapApp.tsx`.

Le vieux `src/App.tsx` possède déjà une infrastructure FR/EN via
`src/lib/locale.ts`, mais ce n'est plus l'écran produit.

Le runtime MapApp force actuellement le français et plusieurs composants
portent encore leurs propres chaînes françaises.

## Décision

Le runtime V1 devient intégralement FR/EN en réutilisant
`src/lib/locale.ts`.

La locale est **globale à l'interface**, pas brain-scoped.

## 1 — Source de vérité de la préférence

Réutiliser sans second mécanisme :

- `Locale = "fr" | "en"`;
- `resolveInitialLocale`;
- `storeLocale`;
- clé `filetopo.locale`.

Aucune table SQLite, aucune commande Tauri, aucun nouveau fichier de
préférences.

Le seul usage autorisé de `localStorage` pour cette décision est la clé
namespacée existante de locale.

Si le storage refuse l'écriture :

- la langue choisie s'applique quand même à la session courante;
- l'interface ne plante pas;
- la prochaine ouverture retombe sur la résolution normale.

## 2 — Choix initial

Ordre déjà défini par `locale.ts` :

1. choix explicite persistant valide;
2. langue du système/navigateur;
3. anglais par défaut.

Ne pas inventer un autre algorithme dans MapApp.

## 3 — Changement de langue

Ajouter un contrôle explicite FR/EN dans le runtime MapApp.

Exigences :

- atteignable au clavier;
- nom accessible dans les deux langues;
- changement immédiat sans rechargement;
- `document.documentElement.lang` suit la locale;
- la préférence explicite est persistée via `storeLocale`;
- aucun appel backend, aucune lecture source, aucune modification de cerveau.

## 4 — Complétude des chaînes

Toute chaîne **produit** visible ou annoncée par le runtime MapApp doit avoir
une forme française et anglaise.

Sont inclus :

- header, actions, statuts et erreurs produit;
- CompositionBar;
- éditeur d'identité;
- recherche;
- filtres;
- carte et agrégats;
- panneau Détails;
- état source / watcher;
- journal / vu-non-vu;
- relations intra et inter-cerveaux;
- file de revue;
- explorateur de doublons exacts;
- observations de contenu;
- labels, aria-labels, hints et compteurs.

Les noms de fichiers, dossiers, cerveaux et autres **données utilisateur** ne
sont jamais traduits.

Les codes techniques/identifiants non destinés à l'utilisateur ne sont pas une
chaîne de localisation.

## 5 — Architecture des dictionnaires

Chaque surface localisée doit avoir un contrat typé et exhaustif, par exemple :

`Record<Locale, SomeStrings>`.

Les composants déjà locale-aware sont réutilisés, pas dupliqués.

Les helpers qui renvoient actuellement du texte français
(`relations.ts`, `filters.ts`, agrégats, compteurs) deviennent locale-aware
ou reçoivent leurs labels; les **valeurs wire** restent strictement inchangées.

Interdit :

- dériver la logique métier du texte traduit;
- traduire un enum avant de l'envoyer au backend;
- créer deux branches de rendu produit distinctes FR et EN.

## 6 — Contrôle automatique de complétude

Une langue manquante doit casser les tests/checks.

Au minimum :

- types exhaustifs pour les dictionnaires;
- tests du vrai `MapApp` dans les deux locales;
- test/source guard contre le retour des forçages
  `const t = strings.fr`, `locale="fr"`,
  `document.documentElement.lang = "fr"`;
- couverture explicite des composants qui avaient du texte français codé en
  dur lors de `ACTION-0076`.

Les commentaires et noms internes n'ont pas à être traduits.

## 7 — Erreurs backend

La couche UI fournit un préfixe/message produit localisé.

Quand un diagnostic backend brut est déjà montré aujourd'hui et qu'aucun code
fermé n'existe pour le traduire sans inventer une nouvelle taxonomie, il peut
rester en détail secondaire après le message localisé.

Cette tranche ne réécrit pas toute la taxonomie d'erreurs Rust.

## 8 — Persistance et autres états

Changer la langue ne doit modifier :

- aucun `BrainRecord`;
- aucun resume state;
- aucun index;
- aucun journal;
- aucun seen-state;
- aucune relation;
- aucun watcher state.

Inversement, basculer de cerveau ne change pas la langue.

## 9 — Portée de clôture

Si la tranche passe :

- `F-035` est candidate à `VERIFIED`;
- la partie **langue** de `P-19` est acquise;
- la partie **langue** de `P-21` est acquise.

Mais :

- `P-19` reste partielle tant que ses autres manques existent;
- `P-21` reste partielle tant que `F-036` / WCAG global n'est pas fermé.

## 10 — Hors portée

- ajout d'une troisième langue;
- système i18n externe;
- traduction des données utilisateur;
- accessibilité WCAG complète;
- thèmes;
- persistance de composition multi-cerveaux.
