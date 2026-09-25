# ACTION-0076 — Audit F-035 : localisation du runtime V1

- Date : `2026-09-25`
- Statut : `CLOSED / NEXT SLICE SELECTED`
- Base : `TASK-0045 VERIFIED` par `ACTION-0075`
- Portée : `F-035`, partie langue de `P-19` et `P-21`

## 1 — Le runtime réellement lancé

`src/main.tsx` monte `src/map/MapApp.tsx`.

Le vieux `src/App.tsx` n'est plus le produit courant; il reste un artefact
historique/audit.

Par conséquent, son bilinguisme ne suffit pas à satisfaire F-035.

## 2 — Infrastructure de locale déjà présente et réutilisable

`src/lib/locale.ts` existe déjà et fournit :

- type `Locale = "fr" | "en"`;
- détection de la langue système/navigateur;
- fallback anglais;
- lecture d'un choix explicite;
- persistance sous **une seule clé namespacée** :
  `filetopo.locale`;
- tolérance à un storage indisponible/corrompu.

Les tests `src/lib/locale.test.ts` couvrent déjà la détection, le fallback,
les valeurs corrompues et la persistance.

Aucune nouvelle dépendance ni nouveau backend de préférence n'est nécessaire.

## 3 — Écart du runtime MapApp

Le runtime courant reste français :

- `const t = strings.fr`;
- `document.documentElement.lang = "fr"`;
- `SourceObservationBadge locale="fr"`;
- `WatchStatusBadge locale="fr"`;
- `DetailsPanel locale="fr"`.

Plusieurs composants ont encore des libellés utilisateurs codés directement
en français :

- `MapApp.tsx`;
- `ChangeJournalPanel.tsx`;
- `CrossRelationsPanel.tsx`;
- `ExactDuplicateExplorer.tsx`;
- `FilterPanel.tsx`;
- `MapView.tsx`;
- `NodeChangeState.tsx`;
- `RelationsPanel.tsx`;
- `ReviewQueuePanel.tsx`;
- helpers `relations.ts` et `filters.ts`.

En revanche, certaines surfaces sont déjà prêtes pour les deux langues :

- `SourceObservationBadge`;
- `WatchStatusBadge` / `WATCH_STRINGS`;
- `ContentObservationsPanel`;
- `DetailsPanel` accepte déjà une locale et des strings.

## 4 — Nature de la prochaine tranche

La prochaine tranche doit **réutiliser** `src/lib/locale.ts` et rendre
l'intégralité du runtime MapApp bilingue, sans toucher :

- au modèle de cerveau;
- à la source;
- à l'Index;
- au watcher;
- au journal;
- au resume state;
- aux relations elles-mêmes.

La langue est une préférence **globale d'interface**, pas un état de cerveau.

## 5 — Persistance

Le choix explicite FR/EN peut et doit continuer à utiliser
`filetopo.locale` dans `localStorage`, car :

- le mécanisme existe déjà;
- la valeur n'est pas sensible;
- il est indépendant des données de cerveau;
- le module sait déjà survivre à un storage refusé.

Cela ne contredit pas TASK-0044 : l'interdit de stockage navigateur portait sur
le **resume state brain-scoped**, pas sur la préférence globale de langue déjà
existante.

Aucun second mécanisme de persistance n'est justifié.

## 6 — Automatisation de la complétude

F-035 exige qu'un libellé manquant soit détecté automatiquement.

La tranche doit donc :

- donner à chaque surface localisée une interface de strings typée;
- fournir un dictionnaire exhaustif `Record<Locale, ...>` ou équivalent;
- rendre les helpers visibles locale-aware au lieu de conserver des constantes
  françaises implicites;
- ajouter un contrôle de source/test qui échoue si les anciens forçages
  `strings.fr`, `locale="fr"` ou `document.lang = "fr"` reviennent;
- tester le vrai `MapApp` en français **et** en anglais.

La traduction de commentaires ou de noms internes n'est pas exigée; les
chaînes **visibles ou annoncées aux technologies d'assistance** le sont.

## 7 — Séquence

La prochaine tranche est :

**TASK-0046 — V1 Complete FR/EN Runtime**

Elle vise :

- `F-035` complet;
- la partie **langue** de `P-19`;
- la partie **langue** de `P-21`.

Elle ne ferme pas :

- accessibilité WCAG globale `F-036`;
- `P-21` au complet;
- `P-19` au complet;
- persistance d'une composition multi-cerveaux complète.
