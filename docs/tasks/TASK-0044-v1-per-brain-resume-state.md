# TASK-0044 — V1 Per-Brain Resume State

- **Date :** 2026-09-25
- **Statut :** `VERIFIED` par `ACTION-0073`
- **Branche :** `build/v0.2-a28-v1-brain-resume-state`
- **Décision :** `DEC-0042`
- **Portée :** reprise brain-scoped, `P-19 / P-20` partiels, `F-002 / F-034`
- **Prérequis :** `TASK-0043` VERIFIED par `ACTION-0072`

## But

Faire en sorte qu'un cerveau retrouve **l'endroit où il a été laissé** plutôt
que seulement son identité active :

- branche/focus;
- sélection;
- pan/zoom;
- filtre;
- panneau Détails.

Le tout par cerveau, persistant, sans nouveau magasin et sans dupliquer les
vérités déjà persistantes.

## A — Audit reuse-first obligatoire

Avant le code, auditer et écrire dans RESULT :

- `BrainCatalog`, `catalog_meta`, `ACTIVE_BRAIN_KEY`,
  `DETAILS_PANEL_VISIBLE_KEY`;
- `compositionSession.ts`;
- `viewState.ts` / `clampView`;
- `useProjectionFilter.ts`, `filters.ts`;
- `map_view` / filtered projection;
- `map_brain_activate`, `map_brain_update`;
- état vu/non vu TASK-0038;
- watcher TASK-0043 et son reload frontend.

Réutiliser ces surfaces. Ne pas créer `localStorage`, une nouvelle DB, un
nouveau registre de cerveaux ou un second modèle de session.

## B — Modèle backend fermé

Créer un type versionné brain-scoped de resume state.

Champs autorisés :

- focus node id optionnel;
- selected node id optionnel;
- view optionnelle `scale/tx/ty`;
- filtre logique normalisé;
- details panel visible.

Aucun path/name/stable key/identity/cursor/projection.

DTO et JSON stocké doivent être testés par liste exacte de clés.

Taille du record bornée et triviale.

## C — Stockage catalogue

Réutiliser `catalog_meta`, clé brain-scoped.

Exigences :

- un cerveau inconnu = erreur;
- lecture absente = defaults;
- lecture corrompue/version inconnue = defaults, pas de crash;
- corruption du resume state n'empêche jamais `map_open`;
- aucun accès source;
- aucune création d'une nouvelle base;
- aucune écriture dans le dossier analysé.

## D — Compatibilité panneau historique

L'ancienne valeur globale `details_panel_visible` sert seulement de fallback
pour un cerveau sans record.

À partir de TASK-0044 :

- cacher le panneau sur cerveau A ne le cache pas sur B;
- montrer sur B ne change pas A;
- après redémarrage, chacun garde sa valeur.

Ne pas effacer la clé legacy.

## E — API runtime

Ajouter la surface minimale, brain-id only, par exemple :

- `map_brain_resume_state(brainId)`;
- `map_brain_resume_update(brainId, state)`;

ou une forme plus sûre après audit.

Aucune commande ne prend de chemin.

L'update doit normaliser/refuser les valeurs hors vocabulaire plutôt que les
stocker aveuglément.

## F — Intégration de la caméra

Réutiliser le `View` actuel.

Persister sans write storm :

- pas un write SQLite par frame de pointermove;
- latest-wins / coalescence bornée;
- une interaction terminée finit persistée;
- avant une vraie bascule de cerveau, l'état sortant est sauvé.

Au restore :

- appliquer uniquement après connaître `world + viewport`;
- passer par `clampView`;
- NaN/Infinity/hors bornes/corruption => vue d'ouverture sûre;
- un changement de taille d'écran ne rend jamais la carte perdue hors écran.

## G — Focus / sélection exacts

Persister les ids du même cerveau.

Au restore normal :

1. vérifier focus dans l'Index;
2. matérialiser la projection bornée correspondante;
3. vérifier sélection;
4. la restaurer si elle est encore valide et atteignable.

Si focus ou sélection a disparu :

- fallback déterministe vers focus/racine;
- corriger le state persistant;
- aucun id d'un autre cerveau ne peut être accepté par accident.

Test avec ids numériquement identiques dans deux cerveaux.

## H — Filtre persistant

Faire évoluer `useProjectionFilter` :

- le filtre appartient toujours au brain;
- changer de cerveau ne le détruit plus;
- les critères survivent au redémarrage;
- aucun cursor keyset n'est persisté;
- une révision watcher invalide/reconstruit la page normalement.

### Sélection au-delà de la première page

Cas obligatoire :

1. filtre avec > 1 page;
2. naviguer page 2+;
3. sélectionner un match;
4. fermer/reouvrir;
5. si ce nœud existe toujours et satisfait toujours le filtre, restaurer **ce
   même nœud** dans une page bornée reconstruite sur la révision courante.

Ne pas résoudre cela en persistant le vieux cursor.

Une primitive backend bornée pour retrouver la page/anchor d'un match est
permise si elle réutilise l'ordre/requête canonique du filtre.

Si le nœud ne correspond plus au filtre, conserver le filtre et appliquer un
fallback sélection documenté.

## I — Watcher / refresh

Le watcher peut avancer l'Index entre la sauvegarde et la reprise.

Prouver :

- changement non lié => état de vue conservé;
- sélection encore présente => conservée;
- sélection supprimée => fallback sûr;
- filtre NEW/UNSEEN relu sur l'état courant;
- watcher n'écrit jamais le resume state;
- resume state n'entre jamais dans le journal des changements.

Actualiser/Reconstruire ne doivent pas effacer silencieusement le state.

## J — Trois cerveaux

Critère central P-20 :

- A, B, C ont des vues différentes;
- sélections différentes;
- filtres différents;
- panneau visible/caché différent;
- métadonnées nom/couleur/icône différentes déjà supportées.

Basculer A→B→C→A dans la session : chaque état revient.

Fermer réellement puis relancer :

- le dernier cerveau actif revient seul;
- son état revient;
- basculer vers les deux autres restitue leur propre état;
- aucune ligne d'état n'est partagée.

## K — Persistance exacte : fermeture réelle

La preuve de restart ne doit pas faire semblant en recréant seulement des
objets Rust.

WebView2 obligatoire :

1. vrai exécutable;
2. trois cerveaux synthétiques/REAL_ROOT de preuve;
3. modifier leurs états;
4. fermer réellement la fenêtre/processus;
5. relancer le même état applicatif;
6. contrôler les trois brains.

La preuve doit enregistrer les valeurs logiques, pas seulement « le visuel
semble pareil ».

## L — Corruption / sécurité

Tests obligatoires :

- JSON resume invalide;
- version inconnue;
- nombre non fini / énorme;
- enum filtre inconnue;
- node id absent;
- node id d'un autre brain avec même valeur numérique;
- état d'un brain ne peut pas être lu/écrit via un autre id;
- payload ne contient ni source path, ni relative path, ni stable key, ni
  identité machine;
- audit public-readiness vert.

## M — Ne pas sur-déclarer P-19

À la fin, documenter explicitement :

**acquis de cette tranche :**

- active brain;
- brain metadata;
- camera/focus/selection;
- filter;
- details panel;
- seen/unseen (déjà acquis).

**encore hors portée de P-19 :**

- FR/EN persistant dans le runtime V1;
- options d'accessibilité persistantes;
- toute préférence de légende qui n'existe pas encore;
- persistance d'une composition multi-cerveaux complète.

Ne jamais déclarer `P-19 = VERIFIED` dans TASK-0044.

## N — Tests / validation

Au minimum :

### Rust

- read/write/isolation 3 brains;
- fallback legacy panel;
- corruption/version;
- validation DTO;
- node validation helper si backend ajouté;
- filtered resume anchor/page si backend ajouté;
- no source access structural guard.

### TypeScript

- state restore par brain;
- writer latest-wins / borné;
- brain switch;
- clamp camera;
- filter restore/current revision;
- stale selection fallback;
- watcher reload does not reset state.

### Full

- `cargo test --offline`;
- `pnpm test`;
- `pnpm check`;
- `pnpm build`;
- `cargo build --offline`;
- Tauri debug + WebView2 restart;
- Clippy dette historique séparée;
- `git diff --check`;
- `scripts/audit-public-readiness.ps1 -AllowRemotes`.

## O — Gouvernance

- `TASK-0044 = IMPLEMENTED`, jamais auto-`VERIFIED`;
- aucune TASK-0045;
- aucun travail FR/EN/accessibilité dans cette tranche;
- aucun PR/merge/tag/release;
- `NEXT_ACTION = contrôle indépendant de TASK-0044`;
- push uniquement sur la branche courante;
- arbre propre à la fin.

## Exécution — VERIFIED par ACTION-0073 — 2026-09-25

Branche `build/v0.2-a28-v1-brain-resume-state`, partie de `fff8732`; commit de travail `00743fb`. Détail :
[VALIDATION section CA](../ai/VALIDATION.md), `.orchestrator/RESULT.md`,
`docs/performance/runs/TASK-0044-webview2.json`.

**Livré (A à O).**

- **B/C** — `map/resume_state.rs` : état fermé de cinq clés (`focusNodeId`, `selectedNodeId`, `view`, `filter`,
  `detailsPanelVisible`), enveloppe versionnée `{version, state}` dans `catalog_meta` sous
  `brain_resume.v1.<brainId>`; lecture tolérante (JSON invalide, version inconnue, mot de filtre inconnu, nombre
  hors bornes, clé en trop, enregistrement > 2 Kio = **absent**); écriture validée côté Rust; un cerveau inconnu
  est une erreur; aucun accès à la source, aucune écriture hors `catalog_meta`; pas de bump de schéma.
- **D** — l'ancienne clé globale `details_panel_visible` n'est plus qu'un **repli** pour un cerveau sans
  enregistrement (jamais supprimée ni réécrite); le bouton n'écrit plus que l'état du cerveau au premier plan.
- **E** — `map_brain_resume_state`, `map_brain_resume_update`, `map_brain_resume_restore` : identifiant de
  cerveau seul, aucun chemin.
- **F** — `resumeState.ts` (`ResumeWriter` : dernier gagnant, une écriture en vol par cerveau, silence de 250 ms,
  plafond de 1,5 s, vidage avant une bascule et à la fermeture); caméra appliquée seulement quand la fenêtre est
  mesurée, après `clampView`, ré-appliquée **depuis la valeur d'origine** tant que la personne n'y a pas touché.
- **G** — `restore()` valide focus et sélection contre l'Index **courant du même cerveau**, corrige et stocke;
  une sélection non montrée par la branche devient la branche (même règle que sélectionner un nœud hors vue).
- **H** — `useProjectionFilter` : un filtre par cerveau, gardé quand un autre cerveau est au premier plan;
  `Index::filter_anchor` (prédicat et ordre canoniques de `filtered_matches`, deux sondes keyset) reconstruit un
  curseur **frais** pour un match hors première page; une page reprise dit « Page reprise » (son rang réel est
  inconnu) au lieu d'inventer un numéro.
- **I** — un rechargement du watcher passe par la même restauration : filtre relu, sélection gardée si elle
  existe encore, sinon repli sur la racine; aucun écrit du watcher, aucun événement du journal.
- **J/K** — trois cerveaux, deux redémarrages réels de processus, valeurs logiques comparées une à une.
- **L** — corruption, version, bornes, ids identiques entre cerveaux, état d'un autre cerveau, ancienne clé
  globale : 23 tests Rust dédiés.

**Défauts trouvés par les tests d'intégration et l'analyse, corrigés avant la preuve réelle canonique.** (1) l'ouverture d'un cerveau au premier
plan sélectionnait sa **racine** et l'écrivait par-dessus la sélection retenue; (2) le déplacement « suivre le
focus » annulait une caméra restaurée quand la sélection était hors champ; (3) la fenêtre n'est pas à sa taille
finale à la première mesure (un panneau qui s'ouvre) : un `clampView` contre cette taille déplaçait la caméra
pour de bon; (4) un match de la première page ne doit pas déplacer la page : la page canonique est gardée et
seul un match au-delà reçoit un curseur reconstruit.

**Hors de cette tranche, dit explicitement (`P-19` reste partielle).** Langue FR/EN, préférences
d'accessibilité, préférence de légende (aucune n'existe) et persistance d'une composition multi-cerveaux
complète : non traités. Une composition de plusieurs cerveaux reste session-only; la caméra d'une composition
n'est stockée pour aucun cerveau. Après **Reconstruire**, aucun rejeu WebView2 dédié n'a été ajouté dans cette tranche. Le contrôle
indépendant `ACTION-0073` a toutefois vérifié le chemin produit actuel :
`ExplicitRebuildFull -> publish_with_identity` conserve les ids des stable keys reconnues et attribue
les nouveaux objets via le compteur durable monotone `next_node_id`; un id supprimé n'est donc pas
silencieusement recyclé. La réserve est **non rejouée**, pas une faiblesse architecturale démontrée.


## Clôture indépendante — ACTION-0073

`TASK-0044` est **VERIFIED dans sa portée**. Le contrôle indépendant accepte la persistance brain-scoped de focus/sélection, caméra, filtre et panneau Détails, la reconstruction de page filtrée sans curseur persistant, l'isolation sur trois cerveaux et les deux redémarrages réels. `P-19` reste **PARTIELLE** : FR/EN, préférences d'accessibilité et composition multi-cerveaux persistante restent hors tranche.
