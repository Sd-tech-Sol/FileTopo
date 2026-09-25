# DEC-0045 — Frontière de fermeture accessibilité du runtime V1

- **Date :** 2026-09-25
- **Statut :** `APPROVED`
- **Décideur :** orchestration FileTopo
- **Portée :** `F-036`, partie accessibilité de `P-21`
- **Prérequis :** `ACTION-0077`, `ACTION-0078`

## Contexte

Après TASK-0046, la langue de `P-21` est acquise. Le runtime `MapApp`
possède déjà des briques d'accessibilité : arbre sémantique et clavier dans
`MapView`, menu clavier dans `CompositionBar`, labels/alertes ARIA, focus
visible et réduction des animations.

Le manque n'est donc pas « ajouter l'accessibilité » au sens abstrait. Il faut
**mesurer le runtime réel, corriger les violations observées et publier une
preuve falsifiable** du contrat `F-036 / P-21`.

## Décision A — cible exacte

TASK-0047 vise le contrat produit suivant :

- fonctionnalité atteignable au clavier sans piège;
- focus visible et ordre exploitable;
- texte conforme au seuil de contraste de `P-21` (>= 4,5:1, sauf exceptions
  WCAG applicables);
- critères de contraste non textuel applicables au niveau AA;
- aucune information portée par la couleur seule;
- `prefers-reduced-motion` respecté;
- aucune violation automatisable WCAG 2.2 A/AA non justifiée dans les états
  représentatifs du vrai runtime;
- contrôle manuel/interactionnel publié pour ce qui n'est pas automatisable.

Cette décision **ne constitue pas** une certification juridique générale
« WCAG compliant ». Elle ferme le contrat produit F-036/P-21 dans la portée
mesurée.

## Décision B — réutiliser, ne pas réécrire

Les primitives existantes sont conservées. Une correction ne remplace pas un
composant accessible existant par un nouveau framework si une correction
locale suffit.

Aucun design system, aucune bibliothèque de composants, aucun moteur d'état et
aucune couche d'accessibilité propriétaire ne sont introduits par défaut.

## Décision C — axe-core local, dev-only

L'outil automatisé retenu est **`axe-core@4.13.0`**, version exacte :

- projet officiel `dequelabs/axe-core`;
- organisation Deque vérifiée et active;
- licence `MPL-2.0`;
- paquet npm `axe-core` sans dépendance npm déclarée;
- règles WCAG 2.2 disponibles;
- support navigateur Edge compatible avec le moteur WebView2.

Avant installation, l'exécuteur doit **revalider** auteur/dépôt/version/licence,
dépendances et intégrité publiée. Si ces faits ne correspondent plus, il
s'arrête et documente le blocage au lieu de substituer un paquet.

Le paquet est une **devDependency épinglée**, jamais importée par le bundle
produit. Le harnais peut charger `axe.min.js` localement dans WebView2.

## Décision D — aucun service/MCP Axe distant

Aucun plugin, MCP ou service cloud Axe n'est nécessaire. La preuve doit rester
locale et ne doit envoyer ni page, ni capture, ni contenu utilisateur à un
tiers.

## Décision E — vrai navigateur autoritaire

JSDOM peut servir à des tests sémantiques ciblés, mais **pas** de preuve
autoritaire de contraste. L'audit automatisé qui compte pour la tranche est
exécuté dans le **vrai WebView2 Tauri**.

Le harnais réel doit publier les violations, les éléments `incomplete` et les
exceptions manuelles; il est interdit de simplement écrire « axe PASS ».

## Décision F — états à couvrir

La preuve réelle couvre au minimum :

- FR et EN;
- thème clair et sombre / préférence système pertinente si les deux styles sont
  servis;
- cerveau synthétique assez riche pour ouvrir carte, filtres, recherche,
  journal, détails, relations, file de revue, doublons, composition et éditeur;
- cerveau adossé à un dossier pour les états réellement différents;
- overlays/menus/formulaires ouverts, pas seulement l'écran initial.

## Décision G — clavier

Le contrôle clavier utilise de vrais événements d'entrée du navigateur
(`Input.dispatchKeyEvent` ou équivalent), pas des appels directs aux handlers.

Il doit démontrer :

- entrée et sortie de chaque zone sans piège;
- Tab / Shift+Tab cohérents;
- activation par Enter/Space quand applicable;
- navigation du widget carte/arbre et des menus par leurs touches prévues;
- Escape ferme les surfaces prévues sans perdre le focus de manière incohérente;
- toutes les actions disponibles à la souris ont une voie clavier ou sont
  purement pointeur par nature et explicitement justifiées.

## Décision H — contraste et couleur

- axe-core dans WebView2 est la première preuve automatisée;
- les tokens/styles clés sont aussi vérifiés par calcul de contraste ou
  `getComputedStyle` sur les éléments réels;
- une couleur de cerveau choisie par l'utilisateur peut rester arbitraire si
  elle n'est **jamais la seule porteuse d'information** et qu'aucun texte
  critique n'en dépend;
- sélection, focus, NEW/UNSEEN, filtres, états source/watcher, relations,
  provenance/direction et agrégats doivent avoir une alternative textuelle,
  structurelle, symbolique ou de forme.

## Décision I — reduced motion

Le vrai WebView2 est testé avec
`prefers-reduced-motion: reduce`. Toute animation/transition non essentielle
doit être supprimée ou réduite conformément au contrat produit.

## Décision J — aucune préférence inventée

TASK-0047 **ne crée pas** une préférence d'accessibilité FileTopo juste pour
fermer P-21. Elle respecte les préférences système existantes.

La persistance d'éventuelles futures options d'accessibilité appartient à
`P-19` et reste une décision séparée.

## Décision K — invariants FileTopo

Aucun changement requis ou autorisé à :

- Index canonique;
- scanner/réconciliation/watcher;
- journal/seen;
- identité stable;
- VIEW_BUDGET;
- source;
- resume state, sauf si un correctif de focus UI prouve qu'un champ déjà
  existant doit être restauré différemment — cas à documenter avant changement;
- backend Rust, sauf nécessité démontrée par un écart d'accessibilité impossible
  à corriger dans le frontend. Par défaut : **aucun Rust**.

## Décision L — clôture

Si la tranche passe :

- `TASK-0047 = IMPLEMENTED`, jamais auto-`VERIFIED`;
- `F-036 = IMPLEMENTED`, candidate à vérification indépendante;
- partie accessibilité de `P-21` = candidate;
- `P-21` ne devient CLOSED/VERIFIED qu'après contrôle indépendant qui compose
  ACTION-0077 (langue) + TASK-0047;
- `P-19` reste PARTIELLE;
- aucune TASK-0048.
