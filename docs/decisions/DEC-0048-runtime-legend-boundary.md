# DEC-0048 — Frontière de la légende runtime V1

- **Date :** 2026-09-26
- **Statut :** `APPROVED`
- **Portée :** `F-014`, `P-10`
- **Prérequis :** `ACTION-0084`, `ACTION-0085`
- **Branche :** `build/v0.2-a34-v1-runtime-legend`

## Contexte

Le runtime actuel MapApp utilise déjà plusieurs codages visuels porteurs de
sens sur la carte, mais ne possède aucune légende produit.

P-10 exige que **chaque** couleur, forme ou motif porteur de sens employé sur
la carte soit expliqué, au même endroit, de façon accessible et sans dépendre
de la seule couleur.

## A — portée

Cette tranche ferme seulement :

- `F-014` — Légende;
- `P-10` — Légende.

Elle ne ferme pas `P-19`.

La persistance de l'état ouvert/fermé de la légende reste explicitement hors
portée pour ne pas rouvrir l'enveloppe resume v2 stabilisée par TASK-0049.

## B — aucune nouvelle sémantique visuelle

La légende doit expliquer **ce que MapView dessine déjà**.

Interdit :

- inventer de nouvelles couleurs;
- inventer un symbole uniquement pour la légende;
- dupliquer manuellement des valeurs CSS;
- créer un deuxième moteur de styles.

Les échantillons de légende doivent utiliser les mêmes classes CSS, formes SVG
ou helpers de glyphes que la carte.

Une petite extraction de helper visuel est autorisée si elle permet à MapView
et à la légende de partager exactement la même primitive.

## C — familles obligatoires

### Nœuds

- root;
- directory;
- file;
- skipped;
- selected;
- related (parent/enfants directs);
- linked (relation intra-cerveau);
- cross-linked (relation inter-cerveaux);
- filtre match;
- filtre context;
- diagnostic d'accès.

### Territoire

- cerveau focalisé.

### Hiérarchie

- lien hiérarchique normal;
- lien hiérarchique touchant la sélection.

### Relations intra-cerveau

- relation établie et sa direction;
- suggestion;
- provenance approuvée;
- relation touchant la sélection.

### Relations inter-cerveaux

- traversée inter-cerveaux;
- relation établie et direction;
- suggestion;
- provenance approuvée;
- relation touchant la sélection.

### Agrégat

- agrégat d'enfants non matérialisés.

Une famille peut expliquer plusieurs états dans un même item si la différence
reste visuellement et verbalement explicite.

## D — couverture par contrat, pas par double liste

La tranche doit établir un contrat de couverture testable.

Préférence :

- chaque famille sémantique rendue par MapView expose une clé stable de légende
  ou passe par un helper qui connaît cette clé;
- la légende déclare les clés qu'elle explique;
- un test de rendu riche compare les clés sémantiques réellement présentes sur
  la carte avec celles rendues par la légende.

Interdit :

- un test qui compare deux tableaux indépendants copiés à la main;
- un simple grep de CSS sans exercer le composant;
- déclarer « exhaustif » sans scénario qui matérialise chaque famille.

## E — interaction

La légende est accessible **à la demande** depuis MapApp.

Minimum :

- bouton `Légende / Legend`;
- `aria-expanded`;
- `aria-controls` ou relation équivalente;
- panneau nommé;
- fermeture par le même contrôle;
- focus clavier visible;
- pas de piège de focus;
- aucune fermeture implicite sur changement de sélection.

La persistance ouvert/fermé au redémarrage est hors tranche et doit être
signalée comme manque P-19.

## F — FR/EN

Tous les libellés et explications sont dans la mécanique locale existante.

Aucun dictionnaire parallèle hors du système TASK-0046.

Les termes doivent expliquer la sémantique en langage produit, pas les noms CSS
internes.

## G — accessibilité

Réutiliser le socle TASK-0047 :

- contraste ≥ contrat courant;
- information non color-only;
- clavier complet;
- reduced-motion inchangé;
- axe sans nouvelle violation.

Les échantillons décoratifs doivent être cachés des technologies d'assistance
si leur texte adjacent porte déjà l'explication.

## H — aucune dépendance backend

Aucun Rust, Tauri command, SQLite, catalogue, resume, watcher, journal, source
ou Index ne doit changer.

Si un changement backend paraît nécessaire, STOP/BLOCKED et documenter au lieu
de l'introduire.

## I — preuve

La preuve réelle doit montrer au moins :

- carte riche;
- légende fermée puis ouverte par clavier;
- FR puis EN;
- couverture de toutes les clés sémantiques de la carte riche;
- aucune clé carte sans entrée de légende;
- aucun item légende orphelin pour un codage absent du contrat;
- échantillons utilisant les mêmes classes/helpers que MapView;
- aucune commande Tauri déclenchée par ouvrir/fermer/changer langue de la
  légende;
- source/Index/journal/resume inchangés;
- axe final sans nouvelle violation;
- fermeture puis réouverture dans la même session seulement; persistance
  redémarrage explicitement non revendiquée.

## J — clôture

Si la tranche passe :

- TASK-0050 = IMPLEMENTED, jamais auto-VERIFIED;
- F-014 = IMPLEMENTED;
- P-10 = candidate CLOSED/VERIFIED après contrôle indépendant;
- P-19 reste PARTIELLE;
- aucune TASK-0051 avant contrôle indépendant.
