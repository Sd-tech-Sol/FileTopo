# ACTION-0085 — Audit F-014 / P-10 : légende du runtime actuel

- **Date :** 2026-09-26
- **Statut :** `CLOSED — prochaine tranche choisie`
- **Base auditée :** HEAD après ACTION-0084 / F-006 VERIFIED
- **Portée :** `F-014`, `P-10`

## Verdict

F-014 reste la prochaine lacune produit discrète. Le runtime MapApp n'a aucune
légende, alors que la carte emploie déjà plusieurs codages visuels porteurs de
sens.

La future tranche doit documenter **le runtime actuel**, pas l'ancien prototype.

## Codages réellement présents sur la carte

### Nœuds

- nature du nœud : root / directory / file / skipped, avec glyphes distincts;
- sélection courante;
- parent/enfants directs de la sélection (`related`);
- voisin de relation intra-cerveau (`linked`);
- voisin de relation inter-cerveaux (`cross-linked`);
- rôle de filtre : `match` / `context`;
- diagnostic d'accès : coin hachuré/triangulaire.

### Cerveau / territoire

- cerveau focalisé : cadre/titre de territoire accentué.

### Hiérarchie

- lien hiérarchique normal;
- lien hiérarchique touchant la sélection : trait renforcé.

### Relations intra-cerveau

- relation établie : direction portée par une flèche;
- suggestion : ligne pointillée, sans flèche, anneaux aux extrémités;
- provenance approuvée : motif de trait dédié;
- relation touchant la sélection : trait renforcé.

### Relations inter-cerveaux

- double trait/casing pour distinguer une traversée inter-cerveaux;
- relation établie : flèche terminale + chevron intermédiaire;
- suggestion : ligne pointillée + anneaux;
- provenance approuvée : motif distinct;
- relation touchant la sélection : trait renforcé.

### Agrégat

- capsule pointillée `+N … Voir la suite / See more` représentant des enfants
  réels non matérialisés.

## Réutilisation obligatoire

TASK-0047 a déjà prouvé les alternatives non colorées. La légende ne doit pas
inventer de nouveaux symboles : ses échantillons doivent utiliser les **mêmes
classes CSS / glyphes / formes** que MapView.

Préférence d'implémentation :

- composant frontend seulement;
- extraction minimale de helpers de glyphes si nécessaire;
- aucune copie manuelle de couleurs hex ou de styles;
- aucun backend/Rust;
- aucune dépendance.

## Couverture vérifiable

La tranche doit avoir une garde automatisée de couverture :

- rendre une carte riche qui exerce toutes les familles de codage;
- rendre la légende;
- identifier les clés sémantiques présentes sur la carte;
- prouver qu'elles ont chacune une entrée de légende;
- une nouvelle famille de codage non déclarée doit faire échouer le test.

Éviter un test qui compare seulement une liste écrite deux fois.

## Accessibilité / FR-EN

- légende atteignable au clavier;
- si elle est ouvrable/fermable : bouton avec `aria-expanded` / relation au
  panneau;
- ordre de focus prévisible;
- texte FR/EN complet;
- chaque item combine échantillon visuel + mots;
- ne jamais compter sur la seule couleur;
- focus visible et contrastes conformes au socle TASK-0047.

## P-19

La référence d'interface dit que la légende est configurable et que les
préférences incluent sa persistance.

Cette tranche ferme **F-014/P-10 seulement**. La persistance ouverte/fermée de
la légende reste explicitement rattachée à P-19 afin de ne pas rouvrir dans la
même tranche l'enveloppe resume v2 fraîchement stabilisée par TASK-0049.

## Choix

Prochaine tranche :

**TASK-0050 — V1 Runtime Legend / P-10 Closure**

Exécuteur : Codex. Aucun TASK-0051 avant contrôle indépendant.
