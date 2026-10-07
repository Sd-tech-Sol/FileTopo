# DEC-0051 — P-19 workspace persistence architecture

- **Date :** 2026-10-06
- **Statut :** `APPROVED`
- **Décision issue de :** ACTION-0098
- **Implémentation prévue :** TASK-0053

## A — Deux couches persistantes, une seule vérité par valeur

### Resume par cerveau — existant

Reste propriétaire de :

- focus de projection ordinaire;
- sélection par cerveau;
- caméra par cerveau;
- filtre;
- panneau Détails.

Aucun de ces champs n'est recopié dans F-052 comme préférence par cerveau.

### Workspace global — nouveau F-052

Propriétaire de :

- composition affichée;
- cerveau focalisé dans la composition;
- caméra globale de cette composition;
- sélection globale de cette composition;
- légende ouverte/fermée;
- densité;
- préférence de mouvement;
- branch focus/collapsed ids si le produit est fermé pendant ce mode.

## B — Langue et vu/non-vu ne migrent pas

- FR/EN reste dans son mécanisme vérifié `filetopo.locale`.
- vu/non-vu reste dans son store brain-scoped vérifié.

TASK-0053 les **rejoue** dans la preuve P-19 mais ne crée pas une deuxième
source de vérité.

## C — F-052 : modèle fermé

Le workspace global versionné contient au minimum :

- `displayedBrainIds: string[]`;
- `focusedBrainId: string`;
- `view: {scale,tx,ty}`;
- `selected: BrainNodeRef | null`;
- `legendOpen: boolean`;
- `density: comfortable | compact`;
- `motion: system | reduce`;
- `branchFocus: null | {brainId, rootNodeId, collapsedIds, savedView, savedSelected}`.

Le backend peut enrichir l'enveloppe stockée avec des `index_id` internes
non exposés au DTO public, comme resume-state le fait déjà.

Aucun chemin, nom de fichier, contenu, source absolue ou hash de document dans
cet enregistrement.

## D — Composition persistée

P-19 exige de retrouver **le workspace courant**, pas tout l'historique des
compositions visitées.

Après redémarrage :

- mêmes cerveaux affichés, dans le même ordre canonique;
- même cerveau focalisé;
- même caméra globale;
- même sélection si encore valide.

`compositionSession.ts` peut rester la mémoire runtime de plusieurs
compositions; F-052 persiste seulement celle qui était active à la fermeture.

## E — Validation et corrections

Une restauration ne devine jamais.

Corrections nommées obligatoires :

- brain disparu;
- focused brain disparu;
- sélection invalide;
- génération Index changée;
- branch root invalide;
- collapsed id invalide/hors sous-arbre;
- record corrompu/version inconnue.

Si la composition persistée devient invalide :

- conserver tous les cerveaux encore valides dans l'ordre catalogue;
- assurer au moins un cerveau affiché;
- choisir le cerveau actif/catalogue uniquement avec correction déclarée.

Les références de nœud sont liées à l'`index_id` courant par le backend.

## F — Branch focus après restart

Si valide :

- redémarrer directement dans le même branch focus;
- même root;
- même collapsed ids;
- même caméra de branch view;
- même sélection;
- le bouton « Quitter le focus » doit restaurer la composition/caméra/sélection
  qui existaient avant l'entrée en focus.

Si l'Index du cerveau a changé, le branch focus est abandonné avec correction
explicite; jamais remappé par simple entier.

## G — Légende

`legendOpen` devient globale et persistante.

Le contenu/contrat de légende TASK-0050 ne change pas.

## H — Densité

`comfortable | compact`, globale.

Elle modifie uniquement le chrome UI/panneaux via attribut/classe/CSS variables.
Elle ne change pas :

- layout topographique;
- coordonnées;
- budget de projection;
- sémantique de la carte.

## I — Mouvement/accessibilité

`system | reduce`.

- `system` continue de respecter `prefers-reduced-motion`;
- `reduce` force animations/transitions à zéro;
- aucun choix ne peut forcer des animations si l'OS demande reduced motion.

## J — Stockage

Réutiliser `catalog_meta`.

- nouvelle clé versionnée;
- taille maximale bornée;
- écriture transactionnelle;
- format fermé `deny_unknown_fields`;
- aucun nouveau fichier/DB;
- corruption n'empêche pas l'ouverture : fallback sûr + correction visible.

## K — Écriture

Réutiliser le pattern de debounce/flush du resume quand pertinent.

Les changements explicites (légende, densité, mouvement, composition,
branch collapse/focus) doivent atteindre le store avant fermeture normale.

Le pan/zoom ne doit pas provoquer une écriture SQLite par événement brut.

## L — Compatibilité

- aucun record F-052 => defaults actuels;
- resume v1/v2 reste lisible;
- locale existante reste lisible;
- aucune migration destructive.

## M — P-19 et M-1

Une fois TASK-0053 VERIFIED :

- F-052 = VERIFIED;
- M-1 = CLOSED;
- P-19 = CLOSED / VERIFIED par composition des preuves existantes + TASK-0053.


## N — Application de la décision — ACTION-0099 — 2026-10-07

Le contrôle indépendant `ACTION-0099` confirme les conditions de la section M :
`F-052 = VERIFIED`, `M-1 = CLOSED`, `P-19 = CLOSED / VERIFIED`.
Les limites de preuve déclarées restent documentées et ne changent pas l'architecture approuvée.