# ACTION-0065 — Contrôle indépendant de TASK-0039

- Date : 2026-09-23
- Statut : `CLOSED / VERIFIED`
- Tâche : `TASK-0039 — V1 Dynamic Filters`
- Branche contrôlée : `build/v0.2-a23-v1-dynamic-filters`
- Livraison contrôlée : `046862c6089ea451bac8fe0a4c709dbe3d4a2cb1`
- Exécuteur : Claude Code / Sonnet 5
- Verdict : **TASK-0039 = VERIFIED dans sa portée**

## Contrôle indépendant

Le contrôle a relu le diff depuis
`41a840fa62ec74d73f667deaec07b280a85a209f`, le rapport d’exécution,
`DEC-0037`, `node_filter.rs`, `filtered_projection.rs`, les frontières
`map_view`, le hook/panneau React, les tests Rust/TypeScript et l’artefact
WebView2.

## A — Source et exactitude des filtres : acceptées

Les filtres interrogent le **seul Index canonique**. Aucun second corpus,
aucune table dérivée et aucun whole-corpus DTO n’ont été introduits.

Les groupes sont fermés et normalisés :

- état : `ALL | NEW | UNSEEN`;
- types : `DIRECTORY | FILE | SKIPPED`;
- disponibilité : `ALL | LOCAL | ONLINE_ONLY`.

Les groupes se combinent par AND et les types par OR.

`NEW` / `UNSEEN` appellent le même prédicat d’acquittement que TASK-0038.
La requête ne lit pas `nodes.seen`; la colonne historique du shape interne est
remplacée par une constante uniquement pour satisfaire `node_from_row`.

## B — Requête bornée / total exact : acceptés

`filtered_matches` calcule dans le même snapshot de lecture :

- l’identité/révision de l’Index;
- le `COUNT(*)` exact;
- une page bornée de correspondances.

La page est keyset : `n.id > :after ORDER BY n.id LIMIT :limit`, sans
`OFFSET`. Le curseur `ftf1` est lié à l’index_id, la révision, le filtre
canonique et le dernier match. Les curseurs d’un autre index, d’une autre
révision ou d’un autre filtre sont refusés.

Le corpus synthétique 100k prouve un total indépendant, une sortie bornée et
une quantité sérialisée indépendante de la taille du corpus. Aucun seuil de
latence non décidé n’est inventé.

## C — Projection filtrée : acceptée

Quand le filtre est inactif, la voie normale appelle toujours
`projection::materialize_view`; le champ `filtered` est absent du JSON.

Quand le filtre est actif :

- les matches sont consommés par page;
- seuls leurs ancêtres nécessaires sont ajoutés comme contexte;
- les nœuds sont dédupliqués;
- les arêtes sont seulement de vrais parent/enfant entre nœuds matérialisés;
- les agrégats de la vue topographique normale ne sont pas réinterprétés comme
  résultats de filtre;
- la cible ordinaire reste petite et le hard budget existant est conservé;
- un match qui ne rentre pas avec son ancestry est reporté à la page suivante,
  jamais perdu ou partiellement matérialisé.

La racine n’est jamais un match et peut apparaître comme contexte.

### Cas d’un ancêtre qui satisfait lui-même le filtre

Accepté selon `DEC-0037` : s’il est nécessaire comme ancestry d’un match plus
ancien dans le keyset, il peut apparaître d’abord comme `Contexte`; il n’est
compté comme `Correspondance` que lorsque sa propre position de pagination est
atteinte. Cela maintient une pagination des **matches** distincte de la
matérialisation du contexte.

## D — Seen-state / curseur : accepté

Un geste TASK-0038 ne modifie pas la révision de l’Index. Pour les filtres
`NEW/UNSEEN`, l’UI repart donc explicitement de la première page et relit le
backend après un geste « vu ». C’est conforme à `DEC-0037`; aucune pseudo
« seen revision » n’a été ajoutée.

Les filtres de type/disponibilité ne sont pas relus inutilement sur un simple
geste vu.

## E — UI : acceptée

Le panneau expose les groupes requis, une réinitialisation en une action, le
compte exact renvoyé par le cœur et une pagination qui remplace la page au lieu
de l’accumuler.

`Correspondance` et `Contexte` sont indiqués en texte/symbole, pas par couleur
seule. Les deux restent sélectionnables.

Le changement de cerveau abandonne le filtre de l’ancien cerveau. Les réponses
périmées ou appartenant à un autre cerveau/filtre sont refusées.

La navigation explicite dans une branche abandonne le mode filtré avant de
charger sa propre projection. Cette limite est déclarée et ne contredit pas le
critère F-022/P-09 de cette tranche; la persistance/navigation de préférences
plus large appartient à P-19.

## F — Disponibilité / confidentialité : acceptées

`LOCAL/ONLINE_ONLY` lit uniquement `nodes.online_only`. Aucune hydratation,
lecture de contenu ou mutation Cloud Files n’est déclenchée.

Le DTO filtré n’ajoute aucun chemin absolu, stable_key, FileId ou volume. La
preuve WebView2 et l’audit public-readiness sont verts.

## G — Preuves

Rapportées et cohérentes avec le code contrôlé :

- Rust : **500 PASS**, 5 ignored, 0 failed;
- TypeScript : **412 PASS**;
- `pnpm check`, `pnpm build`, `cargo build --offline`, build Tauri debug :
  verts;
- test synthétique 100 000 nœuds;
- WebView2 réel : 151 matches sur 3 pages (63/62/26), reset, seen-state,
  changement de cerveau, 0 erreur console fatale;
- `git diff --check` propre;
- audit public-readiness vert, allowlist inchangée;
- dette Clippy historique déclarée séparément, aucun diagnostic sur les lignes
  ou fichiers créés dans cette tâche.

## Limites maintenues

Ce VERIFIED ne couvre pas :

- persistance cross-restart des filtres (P-19);
- watcher `F-030`;
- incrémental `F-031`;
- performance 1M / portable modeste;
- vrai placeholder Cloud Files;
- crash physique.

## Verdict

**TASK-0039 = VERIFIED dans sa portée.**

La prochaine tranche doit être choisie après audit de la chaîne
`F-031 -> F-029 -> F-030/F-032`; aucun watcher ne doit être ajouté avant que
l’application incrémentale et sa réconciliation soient cadrées.
