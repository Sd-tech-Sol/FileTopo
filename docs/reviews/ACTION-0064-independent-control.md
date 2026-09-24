# ACTION-0064 — Contrôle indépendant de TASK-0038

- Date : 2026-09-23
- Statut : `CLOSED / VERIFIED`
- Tâche : `TASK-0038 — V1 Journal-derived Seen/Unseen State`
- Branche contrôlée : `build/v0.2-a22-v1-seen-state`
- Livraison contrôlée : `f875752d69b34db3a5743b532d5453b503e40f6f`
- Exécuteur : Claude Code / Sonnet 5
- Verdict : **TASK-0038 = VERIFIED dans sa portée**

## Contrôle indépendant

Le contrôle a relu le diff depuis `e5d7289ba14c56e0e0b53e22bf8f287b8d842cc1`,
le rapport d’exécution, `DEC-0036`, la migration v6, les fonctions de marquage,
les commandes Tauri, les deux surfaces React, les tests Rust/TypeScript et
l’artefact WebView2.

## A — Source de vérité : acceptée

La nouvelle fonction ne lit ni n’écrit `nodes.seen`. Ce champ, ainsi que les
anciennes commandes prototype, restent historiques et non exposés.

La vérité V1 est bien :

`change_events append-only + seen_through_event_id + seen_change_events`.

Les règles implémentées correspondent à `DEC-0036` :

- événement vu : sous le watermark ou acquitté explicitement;
- nœud courant non vu : au moins un événement non vu;
- nœud courant nouveau : au moins un `CREATED` non vu;
- changement futur après acquittement : non vu de nouveau.

Le test qui force `nodes.seen` dans des états contradictoires sans changer les
résultats dérivés ferme explicitement le risque de double vérité.

## B — Migration v5 → v6 / M-B : acceptée

Le saut 5→6 est un bras supplémentaire du dispatcher existant. Il ajoute la
table d’acquittement, l’index par nœud et le watermark dans une transaction
versionnée, puis la validation canonique v6 est exécutée avant suppression de la
copie M-B.

La baseline au `MAX(event_id)` d’un v5 existant est acceptée : le produit ne
peut pas savoir lesquels des anciens événements ont réellement été lus avant
l’existence de la fonction. L’historique reste consultable, mais le suivi
vu/non-vu commence à v6 sans fabriquer un backlog.

Les tests couvrent échec de migration et échec de validation après migration,
avec restauration v5 et retry.

## C — Trois gestes : acceptés

### Marquer un changement vu

- cerveau explicite + event_id;
- event absent refusé;
- idempotent;
- écrit uniquement dans l’état d’acquittement.

### Marquer un élément vu

- `BrainNodeRef` obligatoire;
- nœud courant obligatoire;
- acquitte les événements non vus du nœud à l’instant de la transaction;
- un événement ultérieur du même nœud reste non vu.

### Tout marquer vu

- transaction `IMMEDIATE`;
- avance le watermark au max du journal sous le verrou d’écriture;
- supprime les acquittements devenus redondants;
- n’affecte pas un événement publié après ce commit.

Le test avec une seconde connexion tenant réellement le verrou est une preuve
appropriée de l’ordre concurrent.

## D — Lecture / curseur : acceptés

Le journal reste append-only et son curseur `fjc1` ne dépend toujours pas de la
révision. Marquer vu ne change ni event_id, ni ordre, ni cardinalité, donc un
curseur préexistant reste valide.

`unseenTotal` est volontairement global au cerveau plutôt que filtré par
nature. Ce choix est **accepté** : le bouton « Tout marquer vu » agit lui aussi
sur tout le cerveau, donc ce compteur décrit exactement la portée de cette
mutation. Le `total` historique reste, lui, filtré comme avant.

## E — UI : acceptée

- badges textuels/symboliques `Nouveau`, `Non vu`, `Vu`;
- aucune mutation au simple affichage ou à la sélection;
- marquage explicite du changement ou du nœud;
- « Tout marquer vu » a un premier geste sans mutation, un bouton de
  confirmation et un bouton Annuler sans appel backend;
- les surfaces relisent le backend après mutation;
- changement de cerveau/nœud invalide les réponses en vol et ne transporte pas
  l’état précédent.

## F — Isolation et confidentialité : acceptées

Les commandes nouvelles n’acceptent aucun chemin, stable_key, FileId ou volume
serial. Les tests à ids coïncidents entre deux cerveaux prouvent l’isolation
logique, et le WebView2 rejoue deux cerveaux séparés.

L’audit public-readiness est rapporté vert sans élargissement d’exception.

## G — Preuves

Rapportées et cohérentes avec le code contrôlé :

- Rust : **474 PASS**, 5 ignored, 0 failed;
- TypeScript : **376 PASS**;
- `pnpm check`, `pnpm build`, `cargo build --offline`,
  build Tauri debug : verts;
- WebView2 réel : deux lancements, un redémarrage réel, deux cerveaux,
  persistance des drapeaux, mark-all confirmé, changement post-mark-all non vu,
  0 erreur console fatale;
- aucun nouveau diagnostic Clippy dans les fichiers touchés; dette historique
  déclarée séparément;
- `git diff --check` propre.

## Limites maintenues

Ce VERIFIED ne livre pas :

- les filtres de carte `F-022`;
- watcher `F-030`;
- incrémental `F-031`;
- rétention du journal;
- test 100k événements;
- crash physique pendant migration;
- fixture Cloud Files réelle.

## Verdict

**TASK-0038 = VERIFIED dans sa portée.**

La prochaine tranche peut maintenant consommer cette source de vérité pour
`F-022`; elle ne doit pas recréer un état « nouveau/non vu » parallèle.
