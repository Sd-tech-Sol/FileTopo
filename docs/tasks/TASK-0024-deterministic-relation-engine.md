# TASK-0024 — Deterministic Relation Engine v1

- **Date :** 2026-09-05
- **Branche :** `build/v0.2-a8-deterministic-relation-engine`
- **Base contrôlée :** `0608cbc1396c5bfc28e0cd666bc25eddf80345bb`
- **Statut courant :** `VERIFIED` — contrôle indépendant `ACTION-0041`
- **Transitions :** `PROPOSED → APPROVED → IN_PROGRESS → IMPLEMENTED → VERIFIED`;
  démarrage par GO technique explicite, vérification par `ACTION-0041`
- **Agent d'exécution :** Codex
- **Décision :** [`DEC-0026`](../decisions/DEC-0026-deterministic-rule-runtime.md)
- **Implémente :** `F-043`, sans implémenter `F-044`, `F-045` ni `F-046`

## 1. Objectif unique

Construire le premier moteur générique réel de règles déterministes et de
suggestions explicables de FileTopo, sans LLM, à partir des faits fiables déjà
disponibles. La tranche maintient trois niveaux distincts : fait observé,
relation déterministe vraie produite par une règle nommée/versionnée, et
suggestion explicable qui exige une décision humaine.

Le moteur porte le nom canonique `dre-v1`, s'exécute pour un seul `brain_id`,
ne lit aucune donnée réelle et ne crée aucune relation inter-cerveaux.

## 2. Préconditions contrôlées

Avant ce gel : dépôt public FileTopo, branche source
`build/v0.2-a7-exact-content-observations`, HEAD `0608cbc`, parent direct
`44b6482`, upstream aligné, arbre propre, `main` à `91bbe90f`, `TASK-0023 =
VERIFIED`, `ACTION-0039`, `X9` et `X10 = CLOSED`, aucune tâche en cours ou en
attente de contrôle, X5 à exactement 29 noms uniques. `TASK-0024` et
`DEC-0026` étaient libres. La branche cible a été créée directement depuis le
commit d'orchestration.

## 3. Périmètre écrit

Dans le périmètre :

- catalogue statique de deux règles `core.*` exactement;
- moteur Rust distinct `dre-v1`, intra-cerveau;
- consommation de la carte courante et de la génération `content_signals`
  courante quand elle existe;
- snapshot d'entrée, statut `CURRENT`/`STALE`, reconciliation des seules
  sorties appartenant au nouveau moteur;
- migration versionnée du store intra-relations sans perte des lignes legacy,
  approuvées ni des contraintes `X3`;
- API explicite d'exécution et de statut;
- action UI accessible « Analyser les relations » / « Analyze relations »;
- explications FR/EN et signaux structurés sans contenu ni score;
- approbation par le flux historique, persistance et idempotence;
- tests synthétiques spécialisés hors des quatre fixtures gelées;
- migration de toutes les destinations runtime `TASK-0023-*` vers
  `TASK-0024-*` avant tout rejeu;
- preuves réelles DR15 pass1/pass2 et régression J12 sous `TASK-0024`.

Hors périmètre : rejet ou mémoire de rejet, file globale de révision, « Plus
tard », éditeur/seuil/pack métier, automatisation inter-cerveaux, identité
physique persistante, extraction/OCR/RAG/vector DB/embedding/GraphRAG/IA/LLM,
permissions, watcher, données réelles, sélecteur de dossier, performance H9,
publication, merge ou modification de `main`.

## 4. Catalogue gelé

Le catalogue `dre-v1` contient exactement :

1. `core.identical-content/v1`, sortie `DETERMINISTIC_RELATION`, type
   `content-identical`, symétrique. Elle affirme uniquement que deux
   occurrences non vides ont eu le même digest `sha256-v1` dans la génération
   utilisée par le run. Pour un groupe trié de N occurrences, le premier
   endpoint est l'ancre et exactement N-1 arêtes sont produites. Un groupe de
   fichiers vides ne produit aucune arête.
2. `core.numbered-sibling-revision-candidate/v1`, sortie `SUGGESTION`, type
   proposé `revision`, non symétrique. Deux fichiers réguliers, dans le même
   dossier direct, de même extension et de stems identiques sauf un entier
   final consécutif `n → n+1`, produisent une suggestion seulement.

Chaque règle fixe `rule_id`, version, sortie, type, symétrie, proposition
affirmée, signaux requis et explications FR/EN. Aucun score, confiance,
probabilité ou seuil numérique n'existe en v1. Les règles historiques
`homonymes/v1` et `suites-numerotees/v1` restent historiques et séparées.

## 5. Snapshot, store et reconciliation gelés

Chaque run enregistre au minimum `brain_id`, digest reconstructible de la carte,
`content_generation_id` nullable, `dre-v1`, date et `run_id`. L'état est
`CURRENT` seulement si les digests/générations d'entrée correspondent à l'état
courant; sinon les sorties `core.*` ne sont pas présentées comme actuelles et
l'UI demande d'actualiser. Aucune lecture ou campagne SHA-256 n'est lancée à
l'ouverture du panneau.

Les productions du moteur portent structurellement le producteur
`core-rule-engine`, la règle et sa version. La reconciliation ne touche que ces
productions : jamais les relations/suggestions historiques, une relation
`APPROVED`, une suggestion déjà approuvée ni le store inter-cerveaux. Une
suggestion stable dérive sa clé de règle/version + cerveau + endpoints + type.
Une relation établie concurrente supprime la suggestion et incrémente le report.

## 6. API, report et UI gelés

Une commande explicite exécute le moteur pour un cerveau et une seconde lit son
statut. Le report expose au minimum `brainId`, `engineVersion`, `runId`,
`mapDigest`, `contentGenerationId`, règles évaluées/sautées avec motif, nombres
de relations/suggestions, groupes vides sautés, collisions supprimées,
suggestions approuvées préservées, lecture seule confirmée et `inputState`.

L'UI ajoute l'action accessible bilingue, affiche dernier run et fraîcheur.
Une relation déterministe sélectionnée montre règle/version, digest/génération
et le sens exact. Une suggestion montre source, cible, type, règle/version,
pourquoi et signaux. Elle reste distincte visuellement/textuellement d'une
relation. Le bouton historique d'approbation produit exactement une relation
`APPROVED`.

## 7. Critères immuables DR1 à DR15

### DR1 — Rule catalog

Deux règles `core.*` exactement en v1, chacune avec id/version/output/type/sens/signaux/FR/EN/symétrie.

### DR2 — Deterministic truth

`core.identical-content/v1` produit uniquement des relations vraies `content-identical`, provenance `DETERMINISTIC`.

### DR3 — No pair explosion

Groupe de N contenus identiques non vides → N-1 arêtes canoniques, déterministes.

### DR4 — Empty files

Groupe de fichiers vides → zéro arête `content-identical` du moteur.

### DR5 — Suggestion boundary

`core.numbered-sibling-revision-candidate/v1` produit uniquement des suggestions, jamais une relation automatique.

### DR6 — Explainability

Chaque relation/suggestion `core.*` expose règle/version et une explication FR/EN; suggestion expose signaux structurés; aucun score.

### DR7 — Idempotence

Deux runs sans changement → mêmes sorties logiques, aucune duplication.

### DR8 — Approval preservation

Une suggestion `core.*` approuvée via le flux existant reste `APPROVED`; rerun ne recrée pas pending et ne change pas sa provenance.

### DR9 — Freshness

Changement de map/content generation invalide l'état `CURRENT`; les anciennes sorties core ne sont pas présentées comme actuelles. Rerun réconcilie correctement.

### DR10 — Brain isolation

Aucun état/résultat automatique ne traverse Alpha/Gamma; aucune relation interbrain créée.

### DR11 — Rebuild

Rebuild de map sans changement logique : endpoint resolution et sorties du moteur restent cohérentes après rerun; relations approuvées intactes.

### DR12 — Legacy regression

J12 historique passe sous `TASK-0024`; anciennes règles synthétiques/relations approuvées gardent leurs invariants.

### DR13 — Read-only / no AI

Aucune source modifiée; aucune donnée réelle; aucune IA, réseau, API, embedding, extraction, OCR, RAG ou vector DB.

### DR14 — Governance/X5

29 preuves X5 inchangées; runtime migré `TASK-0024`; main intacte; aucune preuve protégée réécrite.

### DR15 — Vrai Tauri / WebView2

Sur un fresh variant `task0024-dr15-<timestamp>-<suffix>`, deux vrais processus
Tauri/WebView2 successifs utilisent le même variant. Pass1 construit Alpha,
exécute une campagne de contenu, constate le moteur non exécuté/stale, lance
« Analyser les relations » par interaction réelle sans repli programmatique,
obtient un report `CURRENT`, une relation `content-identical` non vide et une
suggestion `revision`, vérifie leurs explications/signaux sans score, approuve
une suggestion en `APPROVED`, rejoue le moteur sans duplication, conserve les
sources et le store cross-brain, X5=29 puis ferme réellement le processus.
Pass2 retrouve l'approbation, le dernier run `CURRENT`, aucune pending
équivalente, rejoue et confirme les ensembles déterministes/approuvés/pending,
l'isolation, la lecture seule, X5=29 puis ferme réellement le processus.

Les preuves canoniques nouvelles sont exactement :

- `TASK-0024-DR15-deterministic-relation-engine-webview2-pass1.json`;
- `TASK-0024-DR15-deterministic-relation-engine-webview2-pass2.json`;
- et la régression requise `TASK-0024-J12-intrabrain-relations-regression-webview2.json`.

## 8. Validation obligatoire

Suite Rust complète, suite TypeScript complète, `pnpm check`, `pnpm build`,
Tauri debug `--no-bundle`, DR1–DR14, DR15 pass1/pass2 et J12 TASK-0024.
`CARGO_INCREMENTAL=0` est autorisé si B0 revient, sans `cargo clean` ni
suppression de `target`.

Les 29 preuves X5 doivent rester byte-for-byte inchangées. Aucune preuve
`TASK-0024` n'entre dans X5 avant vérification indépendante.

## 9. Résultat attendu

Si et seulement si tous les critères passent : `TASK-0024 = IMPLEMENTED`,
`DEC-0026 = IMPLEMENTED — contrôle indépendant requis`, `F-043 = IMPLEMENTED`.
L'exécuteur ne s'attribue jamais `VERIFIED`. `F-044`, `F-045` et `F-046`
restent `PROPOSED`; `DEC-0013/F` reste bloquante. L'action suivante unique est
le contrôle indépendant de `TASK-0024`.

## 10. Clôture d'exécution — 2026-09-05

Les critères gelés `DR1` à `DR15` passent. Le moteur `dre-v1`, son store
versionné, ses deux règles `core.*`, l'API explicite, la fraîcheur et l'UI sont
implémentés. Les suites complètes passent : Rust **197/197**, TypeScript
**213/213**, `pnpm check`, `pnpm build` et Tauri debug `--no-bundle`.

`DR15` passe dans deux vrais processus Tauri/WebView2 `152.0.4191.62` sur une
même variante fraîche : activation clavier et approbation fiables, zéro clic
programmatique, exactement deux arêtes pour trois contenus identiques, fichiers
vides ignorés, suggestion `revision` sans score, persistance et idempotence.
Le replay réel J12 passe sous `TASK-0024`. Les 29 preuves X5 sont inchangées,
les destinations runtime protégées sont vides, et `main` reste `91bbe90f`.

État final de l'exécuteur : **`IMPLEMENTED`**, jamais `VERIFIED`. Le prochain
acte est un contrôle indépendant de `TASK-0024`.

## 11. Correction ciblée X11 — 2026-09-05

Contrôle indépendant enregistré :
[`ACTION-0040`](../reviews/ACTION-0040-independent-control.md).
`ACTION-0040 = CHANGES_REQUIRED`, réserve `X11 = OPEN`, `TASK-0024` reste
`IMPLEMENTED`. **Claude ne ferme pas `X11` et ne s'attribue pas `VERIFIED`.**

### Défaut corrigé

Le moteur `dre-v1` était générique côté backend, mais la couche héritée de
`TASK-0017` gardait un verrou `RELATIONS_FIXTURE = quasi-empty` sur
`open_relations`, `node_relations` et `approve_suggestion`. `brain-beta` lit
`deep` : `map_relations_open` était refusé, `LoadedBrain.relations` restait
`null`, `RelationsPanel` retournait avant le bouton **Analyser les relations**,
et `analyzeRelations()` ne pouvait pas terminer son rafraîchissement.

### Correction

Périmètre legacy et périmètre core sont **découplés**, sans élargir le legacy :

- `legacy_fixture_spec()` isole la fixture historique; `source_spec()` valide
  la source de n'importe quel cerveau; `ensure_in_scope()` subsiste pour le
  seul `self_check`;
- `open_relations` ne dérive et ne sème **que** dans le périmètre legacy;
- `node_relations` et `approve_suggestion` ne sont plus filtrés par la fixture;
  le refus d'approbation d'une suggestion core **périmée** est inchangé;
- `self_check` reste limité à `quasi-empty` — `J12` n'est pas affaibli;
- DTO `inScope` → `legacyInScope`; `RelationsPanel` reçoit `available` et
  `legacyInScope` et n'est plus mort hors `quasi-empty`.

`homonymes/v1`, `suites-numerotees/v1`, les seeds `TASK-0017` et le self-check
`J1`–`J5`/`J10` restent strictement limités à `quasi-empty`. `derive()` legacy
n'est **jamais** lancé sur `wide`, `deep` ou `mixed`.

### Preuves

- **Corrective, non canonique :**
  `docs/performance/runs/TASK-0024-X11-generic-brain-webview2.json`. Elle ne
  rejoint pas `X5` et ne remplace aucune des trois preuves canoniques gelées.
- **Rejeux réécrits :** les deux `TASK-0024-DR15-*` sur une variante fraîche, et
  `TASK-0024-J12-intrabrain-relations-regression-webview2.json`.
- **Non rejoués :** `K11`, `K12`, `L12`, `M12`, `N15`, `H9` — aucune dépendance
  directe constatée.

### Validation

Rust **200/200**, TypeScript **215/215**, `pnpm check`, `pnpm build`, Tauri
debug `--no-bundle`, X11 WebView2 sur Bêta, DR15 pass1/pass2 frais, J12 réel.
`X5` reste exactement **29** preuves inchangées, `protectedDestinations = []`,
`writesUnderItsOwnTaskOnly = true`, propriétaire `TASK-0024`. `main` reste
`91bbe90f`.

État après correction : `TASK-0024 = IMPLEMENTED`, `F-043 = IMPLEMENTED`,
`ACTION-0040 = CHANGES_REQUIRED`, `X11 = OPEN`. Action suivante unique :
re-contrôle indépendant ciblé `X11` / `TASK-0024`.

## 12. Clôture indépendante et scellement X5 — 2026-09-05

Le verdict externe enregistré dans
[`ACTION-0041`](../reviews/ACTION-0041-independent-recontrol.md) ferme la
dernière réserve : `X11 = CLOSED`, `ACTION-0040 = CLOSED`, `ACTION-0041 =
CLOSED`, `TASK-0024 = VERIFIED`. Codex enregistre ce verdict; il ne se
l'attribue pas.

Les trois preuves canoniques — DR15 pass1, DR15 pass2 et la régression J12 —
rejoignent X5, qui passe de 29 à 32. Les 29 noms antérieurs gardent leur ordre
et les gardes Rust, TypeScript et PowerShell restent en parité exacte. La
preuve corrective X11 reste non canonique et non protégée.

Le runtime courant écrit toujours sous `TASK-0024`; son intersection avec X5
est exactement les trois preuves canoniques. Ainsi
`protectedArtifactCount = 32`, `protectedDestinations = exact3`,
`owningTaskId = TASK-0024` et `writesUnderItsOwnTaskOnly = false`, état normal
après vérification. Aucune `TASK-0025` n'est créée.

Cette fermeture ne rejoue aucune preuve et ne modifie aucun code produit ni
JSON de preuve. `F-043` conserve le statut produit `IMPLEMENTED`, désormais
vérifié par `TASK-0024`; `F-044`, `F-045` et `F-046` restent `PROPOSED`, et
`DEC-0013/F` demeure bloquante.
