# ACTION-0066 — Contrôle indépendant de TASK-0040

- Date : 2026-09-24
- Statut : `OPEN / RECONTROL REQUIRED`
- Tâche : `TASK-0040 — V1 Incremental Update Application Kernel`
- Branche contrôlée : `build/v0.2-a24-v1-incremental-apply`
- Livraison contrôlée : `4725e4715b5f1de73c7f0f0de7ea61861793bdca`
- Exécuteur : Claude Code / Sonnet 5
- Verdict : **noyau U-B accepté fonctionnellement; TASK-0040 reste IMPLEMENTED, pas VERIFIED**
- Blocage unique : **P1 — critère de rejet F-031 non établi de façon robuste**

## A — Noyau incrémental : accepté

Le contrôle indépendant a relu `incremental.rs`, le chemin transactionnel,
les tests de parité/rollback, le banc de mesure et les artefacts.

Le noyau respecte la frontière décidée :

- API Rust interne seulement;
- aucun `Serialize`, aucune commande Tauri, aucune stable key vers le WebView;
- `map_refresh` reste volontairement sur le chemin de remplacement complet;
- aucun watcher n’est ajouté.

Le préflight s’achève avant la première mutation SQL. Les refus couvrent
identités, racine, parents, cycles, orphelins, cohérence path/depth, sous-arbre
incomplet, PATH_FALLBACK, collisions et index non estampé.

## B — Application U-B : acceptée

Le chemin incrémental :

- ne fait aucun `DELETE FROM nodes` global;
- ne réinsère pas le corpus;
- ne charge pas tout `nodes`;
- n’appelle pas `load_previous`;
- n’utilise aucune ressemblance comme identité;
- ne lit aucun contenu de fichier.

Les accès sont ciblés par id, stable_key ou parent_id. Les child_count sont
maintenus par deltas ciblés.

## C — Atomicité / journal / seen-state : acceptés

Un lot effectif utilise une transaction `IMMEDIATE` et une seule révision.

Les événements sont générés par le même `change_journal::diff` que le chemin
de publication complet, puis appendus avant l’avance de révision.

Les tests d’injection couvrent rollback après mutations SQL, journal, révision,
contraintes, concurrence de writers, reader snapshot et SQLITE_BUSY.

Les nouveaux événements restent compatibles avec la vérité vu/non-vu de
TASK-0038 sans réécriture d’acquittements historiques.

## D — Parité : acceptée

La preuve A/B entre :

- noyau incrémental; et
- publication complète de référence

est substantielle : 3 graines × 40 lots aléatoires, mélange SYSTEM /
PATH_FALLBACK, opérations de hiérarchie, plus un vrai arbre temporaire scanné
sous Windows.

Le scan complet final après les lots ne trouve plus de divergence
reconstructible. Les différences intentionnelles de révision sont déclarées.

## E — Tests généraux : acceptés

Rapportés :

- Rust : **550 PASS**, 6 ignored;
- TypeScript : **412 PASS**;
- build/checks verts;
- dette Clippy historique seulement;
- audit public-readiness vert;
- aucun changement frontend, donc absence de rejeu WebView2 justifiée.

## P1 — performance F-031 : recontrôle requis

Le seuil n’a pas été modifié :

> médiane 100k / médiane 1k, pour 10 changements, **≤ 2**.

Les cibles absolues sont très largement tenues.

Cependant une campagne standard, sans cache agrandi ni checkpoint diagnostic,
en profil test `opt-level=3`, donne :

- 1k / 10 : médiane **0,909 ms**;
- 100k / 10 : médiane **1,917 ms**;
- ratio : **2,1089 → FAIL**.

Deux répétitions ultérieures sous le même profil donnent 1,72 et 1,82.
Les profils debug donnent aussi PASS. Les variantes checkpoint/cache sont
diagnostiques et ne peuvent pas servir à effacer un échec standard.

Le contrat de TASK-0040 disait explicitement :

> « Le ratio > 2 est un échec de F-031, pas un nombre à masquer ou ajuster. »

Le contrôle indépendant ne peut donc pas transformer 2,11 en réussite par
majorité de campagnes ou en changeant le seuil après observation.

En revanche, la baseline dit « cinq exécutions minimum, médiane retenue » et
ne définit pas comment agréger plusieurs campagnes équivalentes. À des durées
de l’ordre de 1 ms, cette ambiguïté devient matériellement significative.

## Correction / preuve exigée

Faire un **recontrôle de mesure seulement**, sans optimisation du noyau dans la
même passe.

Avant la première nouvelle exécution, figer le protocole suivant :

1. profil unique : test `opt-level=3`;
2. SQLite produit du banc inchangé : WAL, synchronous NORMAL, cache par défaut;
3. aucun checkpoint/cache diagnostic;
4. **5 campagnes indépendantes**, chacune sur des DB fraîchement reconstruites;
5. **7 échantillons par cas par campagne**, aucun rejet;
6. produire aussi un artefact de synthèse qui concatène les **35 échantillons**
   1k/10 et les 35 échantillons 100k/10;
7. le verdict canonique utilise les **médianes des 35 exécutions** :
   `median(100k) / median(1k) <= 2`;
8. conserver et publier les cinq ratios de campagne comme diagnostic;
9. seuil inchangé, aucune exclusion a posteriori.

Ce protocole est une clarification de « cinq exécutions minimum, médiane
retenue » : il ne modifie ni le seuil ni le noyau.

### Règle d’arrêt

- ratio canonique <= 2 : la preuve P1 peut être proposée à nouveau au contrôle;
- ratio canonique > 2 : **STOP / BLOCKED**. Ne pas optimiser le noyau dans cette
  même passe et ne pas créer la tranche suivante.

Aucun réglage produit ne doit être ajouté pour faire passer la mesure.

## Verdict

**TASK-0040 reste IMPLEMENTED.**

Le noyau U-B est accepté fonctionnellement, mais la clôture de TASK-0040 attend
une preuve canonique F-031 conforme au seuil déjà approuvé.
