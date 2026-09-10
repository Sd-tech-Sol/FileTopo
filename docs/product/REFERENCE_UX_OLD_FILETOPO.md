# Référence UX — ancien FileTopo topographique

Date d'audit : 2026-09-10  
Source : prototype historique fourni localement par l'utilisateur. **Les fichiers, captures, chemins et données privées de ce prototype ne sont pas versés dans Git.** Ce document ne conserve que les caractéristiques génériques nécessaires à la reconstruction de l'expérience.

## Rôle de cette référence

Cette référence décrit **l'expérience à retrouver**, pas l'architecture à réutiliser. L'ancien prototype était un hôte Windows/C# avec HTML/CSS/JS embarqué et une carte largement prédéfinie. Le FileTopo actuel reste la base technique : Tauri + Rust + SQLite + React/TypeScript, local-first, hors ligne, Index canonique et projection bornée.

## Constats mesurés sur le prototype

- L'état persistant pouvait contenir plusieurs milliers d'entrées indexées.
- La carte topographique elle-même contenait seulement **54 blocs** et **74 connexions**.
- La lisibilité venait donc d'une **projection sémantique réduite**, pas de l'affichage du corpus complet.
- À 1366×768, la carte restait volontairement plus grande que la fenêtre : les blocs demeuraient lisibles et l'utilisateur se déplaçait dans l'espace au lieu de réduire automatiquement toute la carte jusqu'à rendre le texte minuscule.

## Contrat visuel à reproduire

1. **Fond de carte clair quadrillé**, légèrement bleuté, avec profondeur visuelle discrète.
2. **Blocs de dossiers larges et lisibles**, coins arrondis, ombre légère, vrai nom du dossier en titre et métadonnée secondaire plus petite.
3. **Racine visuellement dominante**, plus grande et plus sombre que les autres blocs.
4. **Branches hiérarchiques évidentes** entre parent et enfants.
5. **Relations transversales visibles mais secondaires**; lorsqu'un bloc est sélectionné, les relations concernées deviennent fortes et le reste de la carte s'atténue.
6. **Organisation spatiale par colonnes/branches**, avec espace suffisant pour lire les noms sans chevauchement.
7. **Panneau contextuel à droite**, masquable, qui ne recouvre pas la carte.
8. **Barre d'outils en haut** avec recherche, filtres, ajuster, zoom +/−, réinitialiser et contrôle du panneau.
9. **Pan libre à la souris** et zoom sous le pointeur; la carte ne doit pas se recaler globalement après chaque navigation.
10. **Sélection et survol très visibles**.

Palette de référence du prototype, à reprendre comme direction et non comme dépendance technique :

- fond application `#f7f9fc`
- fond carte `#eef4f8`
- grille `#dbe5ec`
- encre `#17202a`
- hiérarchie / focus `#2563eb`
- relation sortante `#16a34a`
- relation entrante `#0891b2`
- relation dans les deux sens `#7c3aed`
- racine sombre proche de `#203040`

Police de référence : Segoe UI / police système Windows.

## Contrat d'interaction à retrouver

### Cœur V1

- clic : sélectionner un bloc et alimenter le panneau contextuel;
- double-clic : naviguer vers/ouvrir l'élément selon l'action produit disponible;
- pan souris/pointeur;
- molette : zoom;
- boutons zoom +/−;
- **Ajuster à l'écran** uniquement sur action explicite;
- **Réinitialiser** vers une vue lisible, pas vers un `fit` global illisible;
- navigation vers un parent/enfant/relation depuis le panneau;
- recherche d'un dossier par nom avec recentrage/focus;
- panneau droit masquable.

### Parité fonctionnelle historique à réintroduire par tranches ultérieures

- changements récents et badges ajouté/modifié/supprimé/déplacé;
- filtre « Nouveaux » et état vu/non vu;
- actualisation / watcher local;
- aperçu du contenu d'un dossier;
- ouverture dans Explorer;
- préférences liées à l'icône et au comportement de fenêtre;
- choix d'écran pour Explorer et autres fonctions Windows spécifiques, si elles restent utiles au produit générique.

Ces fonctions font partie de la **cible de parité**, mais ne doivent pas être entassées dans la première tranche visuelle si elles exigent de réintroduire du scope non vérifié.

## Différence architecturale obligatoire

L'ancien prototype connaissait les chemins absolus dans son frontend. **Interdit dans le FileTopo actuel.** Toute future action « Ouvrir dans Explorer » devra être effectuée côté Rust à partir d'une identité contrôlée (`brain_id + node_id`), après résolution dans l'Index/cataloque, sans exposer le chemin absolu au WebView.

L'ancien prototype possédait des nœuds et relations largement prédéfinis. **Interdit comme moteur générique.** Les blocs du nouveau FileTopo viennent uniquement de l'Index canonique et de la projection courante.

## Implication produit principale

Le budget technique de `DEC-0031` (**512 entités au maximum, agrégats inclus**) reste une **borne de sécurité**, pas une cible d'affichage. La vue normale doit viser **quelques dizaines de blocs significatifs**, principalement des dossiers, et utiliser la navigation/focus pour remplacer progressivement la projection.

Un gros rectangle « N enfants hors vue » n'est pas un dossier et ne doit plus concurrencer visuellement les vrais dossiers. L'existence de contenu hors projection doit être signalée de façon compacte sur le parent; l'action correspondante doit charger/remplacer la vue par de vrais noms lorsque l'utilisateur demande à explorer cette branche.

## Critère de réussite perceptuel

Un utilisateur ouvrant un cerveau réel doit reconnaître immédiatement :

- la racine;
- ses grandes branches de dossiers;
- les vrais noms;
- où il se trouve;
- comment entrer dans une branche;
- comment revenir;
- les relations visibles du bloc sélectionné.

Il ne doit pas avoir à interpréter des concepts internes tels que `aggregate`, `view budget`, `omitted direct children` ou `outside_current_projection` pour utiliser la carte.
