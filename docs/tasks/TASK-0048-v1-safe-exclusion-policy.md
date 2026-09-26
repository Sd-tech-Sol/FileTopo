# TASK-0048 — V1 Safe Exclusion Policy

- **Date :** 2026-09-26
- **Statut :** `IMPLEMENTED`
- **Branche :** `build/v0.2-a32-v1-safe-exclusion-policy`
- **Décision :** `DEC-0046`
- **Portée :** `F-005`
- **Exécuteur prévu :** Codex
- **Prérequis :** ACTION-0080

## But

Ajouter au runtime V1 une politique d'exclusions utilisateur **brain-scoped,
visible, configurable et sûre**, en réutilisant les frontières scanner/watcher
existantes.

La V1 utilise uniquement des **sous-arbres relatifs exacts**. Aucun glob.

## A — audit avant code obligatoire

Avant toute modification :

1. lire DEC-0046 et ACTION-0080;
2. tracer les chemins :
   - création initiale d'Index;
   - Actualiser;
   - Reconstruire;
   - `scan_tree_controlled`;
   - `observe_entry`;
   - W-B;
   - W-C;
   - hints watcher;
   - publication/journal;
3. vérifier comment Reconstruire traite actuellement le journal;
4. vérifier où un état versionné brain-scoped est déjà stocké dans
   `catalog_meta`;
5. écrire dans RESULT :
   - existant réutilisé;
   - manques;
   - chemin minimal choisi pour application de politique;
   - risques de cohérence politique/Index.

Ne commence pas par créer une nouvelle abstraction générique.

## B — modèle backend

Créer un type fermé/versionné de politique V1 contenant une liste canonique de
sous-arbres relatifs.

Validation backend autoritaire :

- rejet absolu/UNC/préfixe;
- rejet `..`;
- normalisation des séparateurs;
- rejet vide/racine;
- déduplication;
- résultat trié/canonique déterministe;
- limite bornée du nombre de règles et de longueur d'une règle, avec valeurs
  justifiées et testées.

Les messages publics n'exposent aucun chemin absolu.

## C — catalogue

Persister dans `catalog_meta`, brain-scoped, versionné.

Aucune table/base nouvelle.

Tester :

- A/B/C isolés;
- A et C peuvent partager le même `sourceRef` avec politiques différentes;
- redémarrage réel;
- policy corrompue ou version inconnue = résultat fermé et honnête, sans
  appliquer silencieusement une politique partielle.

## D — API Tauri minimale

Préférer :

- `map_brain_exclusions(brainId)`;
- `map_brain_exclusions_replace(brainId, rules)`;

ou des noms équivalents cohérents avec le repo.

La commande de remplacement retourne la politique **canonique réellement
persistée**, jamais les valeurs optimistes du frontend.

Pas de commande add/remove séparée sauf nécessité démontrée.

## E — scanner

Le scan complet doit recevoir la politique effective.

Pour chaque entrée :

1. construire le chemin relatif brut/canonique sans chemin absolu public;
2. décider si l'entrée appartient à un sous-arbre exclu;
3. si oui, **ne pas descendre** dans ce sous-arbre;
4. ne jamais contourner les règles reparse/symlink existantes.

Ne pas lire le contenu des fichiers exclus.

La représentation d'une exclusion dans l'Index doit suivre le plus petit
comportement compatible avec les contrats existants. Si le nœud frontière est
matérialisé comme `Skipped`, il doit être explicitement distinguable d'un
reparse; si l'exclusion est omise de l'Index, la politique visible dans l'UI
doit rester la source explicative. Ne choisis qu'une seule sémantique et prouve-la.

## F — Actualiser / Reconstruire

Tous deux utilisent la même politique.

Une politique modifiée puis appliquée ne génère **aucun faux événement de
source** dans le journal.

Ne supprime jamais l'historique du journal pour atteindre ce résultat.

Le dernier Index fiable reste ouvert si l'application échoue.

Le RESULT doit expliquer précisément le chemin choisi.

## G — watcher

- W-B et W-C utilisent la même politique;
- un hint sous une exclusion ne doit pas provoquer un scan de ce sous-arbre;
- un hint au parent d'une exclusion peut déclencher la réconciliation
  nécessaire sans descendre dans l'exclusion;
- pertes/doutes/restart continuent de passer par W-C;
- aucune nouvelle vérité dérivée du watcher.

Tester une rafale sous exclusion et une rafale mixte incluse/exclue.

## H — interface utilisateur

Ajouter une surface simple au cerveau focalisé :

- titre Exclusions / Exclusions;
- liste des sous-arbres relatifs;
- champ chemin relatif;
- Ajouter;
- Retirer;
- texte indiquant que la règle couvre le sous-arbre;
- note de sécurité : liens symboliques/reparse ne sont jamais suivis.

FR/EN via la mécanique TASK-0046 existante.

Aucun chemin absolu affiché.

Le frontend :

- ne maintient pas de deuxième store;
- recharge/publie uniquement le record backend renvoyé;
- n'applique pas durablement un optimistic state après refus;
- reste clavier/accessibilité compatible avec TASK-0047.

## I — cas limites

Couvrir au minimum :

- `cache`;
- `cache/tmp`;
- séparateurs Windows et slash;
- casse selon la sémantique réelle de la plateforme — ne pas inventer une
  comparaison case-insensitive portable;
- doublons;
- règle ancêtre + descendante;
- caractères non ASCII;
- espaces valides;
- tentative `../secret`;
- tentative absolue;
- source absente;
- cerveau inconnu;
- politique vide;
- 3 cerveaux, dont 2 sur la même source.

## J — preuve WebView2 réelle

Avec racines générées, aucune donnée personnelle :

1. cerveau A et C sur la même source; B sur une autre;
2. politiques différentes;
3. ajouter une exclusion par l'UI au clavier;
4. appliquer selon la sémantique décidée;
5. vérifier que le sous-arbre n'est plus parcouru/materialisé selon le contrat;
6. vérifier aucune modification physique source;
7. vérifier journal sans faux changements source;
8. modifier un fichier **dans** le sous-arbre exclu : watcher ne doit pas
   produire d'effet Index/journal;
9. modifier un fichier non exclu : comportement watcher normal;
10. fermer réellement, relancer, confirmer politiques A/B/C persistées et
    isolées;
11. retirer une exclusion et réappliquer; le contenu redevient indexable sans
    événement de source fabriqué par la seule modification de politique;
12. tester source absente : politique toujours lisible/modifiable, dernier
    Index fiable conservé si l'application ne peut scanner.

Publier un artefact
`docs/performance/runs/TASK-0048-webview2.json`.

## K — invariants

Autour des opérations de politique :

- SHA-256 source inchangé;
- aucun chemin absolu dans DTO/artefact/log public;
- resume state inchangé;
- identité des éléments non concernés inchangée;
- VIEW_BUDGET 512;
- aucun whole-graph DTO;
- aucun nouveau store;
- aucune régression FR/EN ou accessibilité.

## L — validations

- tests Rust ciblés policy/scanner/catalog/watcher/journal;
- tests TypeScript UI;
- `pnpm test`;
- `pnpm check`;
- `pnpm build`;
- `cargo test --offline`;
- `cargo build --offline`;
- Tauri debug;
- vrai WebView2 + restart;
- Clippy avec dette historique séparée;
- `git diff --check`;
- audit public.

## M — falsification

Au moins :

1. matcher par préfixe texte naïf (`foo` exclut `foobar`) -> test doit casser;
2. accepter `..` -> test doit casser;
3. W-B ignore la politique -> test doit casser;
4. full scan ignore la politique -> test doit casser;
5. policy A fuit vers C sur même source -> test doit casser;
6. changement de policy fabrique un DELETED/CREATED -> test doit casser;
7. frontend publie une règle refusée optimistiquement -> test doit casser.

Aucun sabotage dans le commit final.

## N — documentation finale

À la fin :

- TASK-0048 = `IMPLEMENTED`, jamais auto-VERIFIED;
- F-005 = `IMPLEMENTED`, jamais auto-VERIFIED;
- NEXT_ACTION = contrôle indépendant de TASK-0048;
- F-006, F-014, P-19 inchangés;
- aucune TASK-0049.

## O — Git

- aucun PR/merge/tag/release;
- commit + push uniquement sur cette branche;
- arbre propre;
- remplir `.orchestrator/RESULT.md`.

## Résultat d'exécution — 2026-09-26

- Politique V1 versionnée et brain-scoped dans `catalog_meta`, règles exactes
  relatives canoniques, sans glob, nouvelle table, base ou dépendance.
- Scanner complet, Actualiser, Reconstruire, W-B, W-C et watcher partagent la
  politique effective. Reparse et liens symboliques restent toujours fermés.
- L'Index porte l'estampille de la politique appliquée. Une modification de
  politique passe par un rebase atomique de l'Index sans diff de source ni
  événement de journal; en cas d'échec, la politique désirée reste lisible,
  `applicationRequired` est vrai et le dernier Index fiable reste ouvert.
- Surface MapApp FR/EN accessible, backend autoritaire, ajout clavier et retrait
  souris prouvés dans le vrai WebView2 avec trois cerveaux, redémarrage, watcher
  et source absente/restaurée.
- Preuves : `VALIDATION.md` section CI et
  `docs/performance/runs/TASK-0048-webview2.json`.
- Limites : fermeture normale seulement; NTFS/Windows pour la preuve de casse;
  aucune transaction inter-base inventée; une mutation physique strictement
  concurrente au rebase de politique ne peut pas être distinguée atomiquement
  entre catalogue et Index.
- **État : `IMPLEMENTED`, jamais auto-`VERIFIED`.** Contrôle indépendant requis.
