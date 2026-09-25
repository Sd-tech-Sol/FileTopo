# TASK-0044 — V1 Per-Brain Resume State

- **Date :** 2026-09-25
- **Statut :** `READY`
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
