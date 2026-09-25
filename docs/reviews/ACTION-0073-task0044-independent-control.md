# ACTION-0073 — Contrôle indépendant de TASK-0044

- Date : `2026-09-25`
- Statut : `CLOSED / VERIFIED`
- Tâche : `TASK-0044 — V1 Per-Brain Resume State`
- Branche contrôlée : `build/v0.2-a28-v1-brain-resume-state`
- Base d'orchestration : `fff8732c2a67e9d811a3648336dd71706b066442`
- Livraison contrôlée : `00743fb10c44e16f4f542143d6d74b337f68afd4`
- HEAD documentaire contrôlé : `ab468fd51e2b702e9191394927f74d1a05cc3b8a`
- Verdict : **TASK-0044 = VERIFIED dans sa portée**

## A — Stockage brain-scoped : accepté

Le resume state réutilise le catalogue existant :

- clé `brain_resume.v1.<brainId>` dans `catalog_meta`;
- aucune nouvelle base, aucun `localStorage` / `sessionStorage`;
- enveloppe versionnée;
- cinq champs d'état fermés :
  `focusNodeId`, `selectedNodeId`, `view`, `filter`,
  `detailsPanelVisible`;
- aucun path, nom, stable key, FileId, curseur ou projection persisté;
- aucun bump de schéma SQL nécessaire.

La lecture d'un record absent, corrompu ou d'une version inconnue retombe sur
les defaults et ne touche ni la source ni l'Index.

L'écriture est revalidée côté Rust : ids bornés, caméra finie et bornée,
filtre normalisé.

## B — Isolation de cerveau : acceptée

Chaque opération de reprise est brain-scoped.

Le contrôle accepte les preuves où :

- trois cerveaux ont des états volontairement différents;
- le même `nodeId` numérique existe dans plusieurs cerveaux;
- l'état d'un cerveau ne sélectionne jamais le nœud de l'autre;
- A → B → C → A restitue sélection, caméra, filtre et panneau propres;
- après redémarrage réel, le dernier cerveau actif revient seul;
- les deux autres récupèrent ensuite chacun leur état.

La persistance déjà existante de nom/couleur/icône et de vu/non-vu n'est pas
dupliquée.

## C — Panneau Détails : migration acceptée

La clé historique globale `details_panel_visible` est conservée seulement
comme fallback pour un cerveau sans resume state.

Dès qu'un cerveau possède son record :

- sa valeur est propre à ce cerveau;
- une valeur opposée sur un autre cerveau n'est pas écrasée;
- elle survit au redémarrage.

La clé historique n'est ni supprimée ni réécrite comme migration destructive.

## D — Caméra : acceptée

La caméra réutilise `View` / `clampView`.

La reprise :

- attend un world et un viewport mesurés;
- refuse les nombres non finis / hors bornes;
- applique `clampView`;
- re-clampe si le viewport se stabilise après le premier layout;
- n'écrit pas SQLite à chaque frame.

`ResumeWriter` fournit :

- latest-wins;
- une seule écriture en vol par cerveau;
- debounce 250 ms;
- plafond 1,5 s;
- flush explicite avant les transitions gérées par `applyComposition`.

Le shutdown normal reste un mécanisme best-effort côté page; aucune promesse
de crash-consistency n'est faite ni acceptée dans cette tranche.

## E — Focus / sélection : acceptés

Le backend revalide les ids sauvegardés contre l'Index courant **du même
cerveau**.

Sans filtre :

- focus valide conservé;
- sélection valide conservée;
- une sélection hors projection devient le focus, via la projection bornée;
- id absent → fallback et correction persistée.

Avec filtre :

- le filtre reste autoritaire;
- sélection qui ne correspond plus → fallback explicite;
- sélection supprimée → fallback explicite.

## F — Filtre hors première page : accepté

Aucun curseur keyset n'est persisté.

`Index::filter_anchor` réutilise :

- le prédicat canonique du filtre;
- l'ordre canonique `ORDER BY id`;
- une vérification exacte du match;
- le match immédiatement précédent comme ancre.

Le curseur reconstruit porte l'`index_id`, la révision et la forme canonique
du filtre.

La reprise garde la page canonique si le match est déjà sur la première page;
sinon elle reconstruit une page bornée qui commence sur le même match.

Une révision concurrente qui rend le curseur frais immédiatement périmé est
rejouée une fois; un échec persistant retombe sur le chemin de lecture sûr.

## G — Watcher / révision : accepté

Le watcher ne persiste pas le resume state.

Un reload :

- relit l'état contre l'Index courant;
- conserve une sélection encore valide;
- corrige une sélection supprimée;
- relit les filtres NEW/UNSEEN sur la révision courante;
- ne crée aucun événement de journal pour une préférence de reprise.

Le resume state reste séparé du corpus, du journal et du
`PUBLICATION_LOCK`.

## H — Preuve WebView2 : acceptée dans sa portée

L'artefact
`docs/performance/runs/TASK-0044-webview2.json` est explicitement présenté
comme **NONCANONICAL_ENGINEERING_EVIDENCE**, ce qui est honnête.

Il établit néanmoins la preuve d'intégration exigée par TASK-0044 :

- vrai Tauri / WebView2;
- trois racines générées par la preuve;
- aucune donnée personnelle;
- deux fermetures / relances réelles du processus;
- valeurs logiques contrôlées dans le catalogue et à l'écran;
- sélection hors première page restaurée;
- même id numérique dans plusieurs cerveaux;
- 60 crans de molette → une écriture;
- suppression hors ligne → fallback sans id stale;
- zéro erreur fatale.

La preuve a également été falsifiée avec une clé de reprise partagée, et le
harness échoue dans ce cas.

## I — Suites rapportées

Cohérentes avec le diff et les fichiers de validation :

- Rust : **750 PASS**, 0 fail, 6 ignored;
- TypeScript : **521 PASS**;
- `pnpm check` : PASS;
- `pnpm build` : PASS;
- `cargo build --offline` : PASS;
- build Tauri debug : PASS;
- Clippy : dette historique inchangée (13 / 22);
- `git diff --check` : propre;
- audit public-readiness : vert.

## J — Réserve `Reconstruire` : reclassée

Le rapport d'exécution indique :

> après Reconstruire, un ancien id pourrait être attribué à un autre nœud.

Le contrôle du chemin produit actuel ne confirme pas cette réserve.

`Gesture::Rebuild` utilise `ExplicitRebuildFull` puis
`replace_with_identity -> publish_with_identity`.

Dans ce pipeline :

- une stable key connue récupère son id canonique antérieur;
- un objet neuf reçoit `next_node_id`;
- `next_node_id` est durable et monotone;
- un id supprimé n'est pas remis dans le pool.

Donc, sur le chemin produit actuel, `Reconstruire` ne réattribue pas
silencieusement un ancien id supprimé à un autre objet.

Ce cas n'a pas reçu une preuve WebView2 dédiée dans TASK-0044; il reste donc
**non rejoué**, mais pas une faiblesse architecturale démontrée.

## K — Limites maintenues

Ce VERIFIED ne prétend pas couvrir :

- crash brutal dans la fenêtre de debounce;
- persistance d'une composition multi-cerveaux complète;
- FR/EN persistant dans le runtime V1;
- préférences d'accessibilité;
- une préférence de légende inexistante;
- souris/tactile physiques;
- autre environnement que le poste NTFS de développement pour la preuve hôte.

Une sélection de contexte dans une page filtrée retombe sur une cible valide
lors d'une reprise; ce comportement est documenté et le filtre reste
autoritaire.

## Verdict

**TASK-0044 = VERIFIED dans sa portée.**

La reprise brain-scoped est maintenant une capacité V1 contrôlée :
focus/sélection, caméra, filtre et panneau Détails survivent aux bascules et au
redémarrage sans créer un second magasin ni exposer de données de source.

`P-19` reste explicitement **PARTIELLE**.
