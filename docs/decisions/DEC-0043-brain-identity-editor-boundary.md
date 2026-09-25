# DEC-0043 — Editing a brain changes FileTopo identity metadata, never its source

- **Date :** 2026-09-25
- **Statut :** `APPROVED`
- **Portée :** `F-033`, dernier écart utilisateur nommé de `P-20`
- **Prérequis :** `TASK-0044` VERIFIED par `ACTION-0073`; audit `ACTION-0074`

## Constat

Le catalogue sait déjà modifier et persister :

- `display_name`;
- `color`;
- `icon`.

Le chemin autoritaire existe déjà :

`map_brain_update -> BrainCatalog::update_metadata -> validate_metadata`.

Le runtime `MapApp` affiche ces champs mais ne permet pas à l'utilisateur de
les modifier.

## Décision

TASK-0045 ajoute **seulement l'éditeur utilisateur** de l'identité visuelle du
cerveau.

Aucun nouveau modèle et aucun nouveau stockage.

## 1. Frontière sémantique

Modifier l'identité visuelle d'un cerveau signifie uniquement :

- changer son nom d'affichage;
- changer sa couleur;
- changer son icône.

Cela ne signifie jamais :

- renommer, déplacer ou réécrire le dossier source;
- changer `source_kind`, `source_ref`, `source_label` ou `source_path`;
- changer `brain_id`;
- reconstruire ou actualiser l'Index;
- toucher le journal, l'état vu/non-vu ou le resume state;
- créer, modifier ou réévaluer une relation.

Le cerveau reste le **même cerveau** avant et après.

## 2. Backend autoritaire

Réutiliser `map_brain_update` et `BrainCatalog::update_metadata`.

Ne pas créer une seconde commande d'édition.

La validation backend reste autoritaire :

- nom trimé, non vide, maximum existant;
- couleur `#RRGGBB`;
- icône selon la borne existante;
- cerveau inconnu refusé.

Une validation frontend peut améliorer l'UX, mais ne remplace jamais le
contrôle Rust.

## 3. UX minimale

Le cerveau actif/focalisé doit offrir une action explicite
**Personnaliser le cerveau**.

Le contrôle peut être un petit panneau/modal/formulaire intégré à
`CompositionBar` ou à son voisin immédiat, à condition de ne pas créer une
seconde notion de cerveau actif.

Le formulaire contient exactement :

- Nom;
- Couleur;
- Icône;
- Enregistrer;
- Annuler.

Aucun champ source.

L'ouverture remplit les valeurs du catalogue courant.

`Annuler` ne change rien.

`Enregistrer` attend la réponse backend avant de publier la nouvelle identité
dans l'interface.

Une erreur garde les anciennes valeurs autoritaires et reste lisible.

## 4. Propagation

Après un save accepté, mettre à jour les instances React existantes du même
`BrainRecord` :

- catalogue;
- cerveau chargé;
- CompositionBar;
- étiquette du territoire/carte;
- surfaces qui lisent nom/icône/couleur.

Ne pas recharger l'Index pour propager une métadonnée.

Un autre cerveau, même s'il partage exactement la même source, ne change pas.

## 5. Couleur et accessibilité

La couleur reste une aide visuelle, jamais l'identité unique.

Le nom et l'icône restent présents comme alternatives non colorées.

L'éditeur doit être atteignable au clavier avec labels explicites et ordre de
focus normal.

Cette tranche **ne prétend pas fermer F-036 / WCAG 2.2 AA**.

## 6. Persistance et reprise

Le catalogue est déjà persistant.

Après fermeture et redémarrage réels :

- les nouvelles métadonnées sont toujours présentes;
- le cerveau actif est le même;
- le resume state TASK-0044 est intact;
- aucune métadonnée par défaut du seed n'écrase le choix humain.

## 7. Critère P-20

La preuve de TASK-0045 doit combiner, sans réimplémenter :

- isolation déjà acquise de TASK-0018;
- reprise par cerveau de TASK-0044;
- modification utilisateur nom/couleur/icône de cette tranche.

Si la preuve passe, TASK-0045 peut écrire que `P-20` est **candidate à la
clôture indépendante**, jamais se l'attribuer VERIFIED elle-même.

## 8. Hors portée

- suppression d'un cerveau;
- réordonnancement;
- changement de source;
- FR/EN;
- accessibilité complète;
- persistance d'une composition multi-cerveaux;
- nouvelle palette complexe, thème ou système d'icônes.
