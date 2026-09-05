# ACTION-0040 — Contrôle indépendant de TASK-0024 : CHANGES_REQUIRED, réserve X11

- **Date :** 2026-09-05
- **Objet :** enregistrement du contrôle indépendant de `TASK-0024`, moteur
  déterministe de relations `dre-v1`
- **Contrôleur :** **orchestrateur technique indépendant**, instance distincte
  de l'exécuteur de `TASK-0024`
- **Rédacteur :** Claude Code. **Ce document ENREGISTRE un verdict externe rendu
  par l'orchestrateur technique; Claude ne rend pas ce verdict, n'ouvre ni ne
  ferme `X11` de sa propre autorité et ne s'attribue pas `VERIFIED`.**
- **HEAD contrôlé, avant correction :**
  `2e4c9842c4492d28cc4de54ccdec5d049f1b7e22`
- **Commit substantif initial de `TASK-0024` :**
  `6a4a5432b90c65ce02e94e8977e0f4dabc5ac0a6`
- **`main` :** `91bbe90f0f99026c28cd345784d4f579a0016db2`, intacte
- **Contrôle précédent :** [`ACTION-0039`](ACTION-0039-independent-recontrol.md),
  qui avait clos `X9`, `X10` et rendu `TASK-0023` **`VERIFIED`**

## 1. Verdict externe enregistré

| Élément | Verdict |
|---|---|
| `TASK-0024` | **`IMPLEMENTED`** — jamais `VERIFIED` |
| `ACTION-0040` | **`CHANGES_REQUIRED`** |
| Réserve `X11` | **`OPEN`** |

## 2. Réserve X11, telle que rendue

> `dre-v1` est générique côté backend, mais l'interface et les lectures
> intra-relations restent bloquées par `ensure_in_scope()` /
> `RELATIONS_FIXTURE = quasi-empty`. `brain-beta` (`deep`) ne peut donc pas
> ouvrir le panneau générique, exécuter normalement l'analyse depuis
> l'interface, consulter ses sorties core ou approuver une suggestion core.

Le défaut est un défaut **d'intégration**, non de moteur : le catalogue de
règles `core.*` ne connaît aucune fixture, mais la couche héritée de
`TASK-0017` refusait tout cerveau qui ne lisait pas `quasi-empty`, et le refus
remontait jusqu'au panneau.

## 3. Correction appliquée sous ce contrôle

Périmètre : **découpler le périmètre legacy `TASK-0017` du périmètre du moteur
core**, sans jamais élargir le legacy.

- `relation_commands.rs` sépare deux questions que `ensure_in_scope()`
  confondait : `source_spec()` valide la **source** de n'importe quel cerveau,
  `legacy_fixture_spec()` répond `Some` pour la seule fixture historique.
- `open_relations` ne rejoue `derive()` et ne sème les suggestions gelées **que**
  dans le périmètre legacy. Hors de lui, aucune dérivation, aucun seed : le
  store est lu tel qu'il est.
- `node_relations` et `approve_suggestion` ne sont plus filtrés par la fixture.
  Le refus d'approbation d'une suggestion core **périmée** est inchangé.
- `self_check` **reste** limité à `quasi-empty` : il vérifie le contrat gelé
  `TASK-0017`, et `J12` n'est pas affaibli.
- DTO : `inScope` devient `legacyInScope`, ce que le champ dit réellement.
- `RelationsPanel` ne rend plus un panneau mort hors `quasi-empty`. Une note
  explique que les relations de démonstration `TASK-0017` ne s'appliquent pas;
  elle ne masque ni le bouton **Analyser les relations**, ni l'état `dre-v1`,
  ni les relations core, ni les suggestions core, ni leur approbation.

**Frontière préservée.** `homonymes/v1`, `suites-numerotees/v1`, les seeds
`TASK-0017` et le self-check `J1`–`J5`/`J10` restent strictement limités à
`quasi-empty`. Le plafond quadratique de `homonymes` reste une raison valide de
ne jamais lancer la dérivation historique sur `wide`, `deep` ou `mixed`.

## 4. Preuves de la correction

| Preuve | Nature | Résultat |
|---|---|---|
| `TASK-0024-X11-generic-brain-webview2.json` | **corrective, non canonique** | écrite |
| `TASK-0024-DR15-…-pass1.json` / `-pass2.json` | rejeu DR15, variante fraîche | réussies |
| `TASK-0024-J12-intrabrain-relations-regression-webview2.json` | rejeu J12 réel | réussi |

La preuve `X11` **ne rejoint pas `X5`** et **ne remplace aucune** des trois
preuves canoniques gelées de `TASK-0024`. Elle le déclare dans son propre
contenu (`canonical: false`, `joinsX5: false`, `doesNotReplace`).

Faits mesurés sur `brain-beta` (`deep`, 157 nœuds), WebView2 `152.0.4191.62` :

- panneau présent, `panelSaysOutOfScope = false`, note legacy affichée;
- bouton **Analyser les relations** présent et activable;
- `keydownIsTrusted = true`, `activationIsTrusted = true`,
  `programmaticClickCalls = 0`, `programmaticClickDispatches = 0`;
- report `brainId = brain-beta`, `engineVersion = dre-v1`,
  `inputState = CURRENT`, `runId = dre1-39c7076203470f8d`;
- avant run : `inputState = NOT_RUN`, aucun producteur, `seeded = 0`;
- après run : `map_relations_open` réussit, `producers = ["core-rule-engine"]`
  seulement, `seeded = 0`, 39 suggestions core, 0 relation déterministe —
  `core.identical-content` est **sautée**, motif `SKIPPED_MISSING_SIGNAL`, ce
  qui est un résultat valide;
- `map_relations_for_node` réussit sur un nœud de Bêta;
- empreinte de la source identique avant/après, `sourceReadOnlyConfirmed`;
- `protectedArtifactCount = 29`, `protectedDestinations = []`,
  `writesUnderItsOwnTaskOnly = true`, `owningTaskId = TASK-0024`;
- processus réellement fermé par le harnais.

`J12` réel après correction : 12 relations établies, 8 déterministes, 4
approuvées, 4 suggestions en attente, `countsAgree`, `replayStable`,
`allRejected`, aucun inverse inventé, aucun endpoint non résolu — les
invariants legacy d'Alpha sont **strictement identiques**.

## 5. Ce que ce document ne fait pas

- Il **ne ferme pas** `X11`. La réserve reste **`OPEN`** jusqu'à un
  re-contrôle indépendant ciblé.
- Il **n'attribue pas** `VERIFIED` à `TASK-0024`, qui reste `IMPLEMENTED`.
- Il n'ouvre aucune réserve nouvelle et ne crée aucune `TASK-0025`.

## 6. Limites conservées

- `DEC-0013/F` demeure bloquante pour l'identité physique persistante.
- La garantie race-safe `X10` reste prouvée **sur Windows** seulement; le repli
  non-Windows n'est pas revendiqué race-safe.
- Aucune règle core n'est garantie de produire une sortie sur une source
  donnée : sur `deep`, `core.identical-content` est sautée faute de signal de
  contenu, et **zéro sortie est un résultat valide**.

## 7. Clôture indépendante ultérieure

Le re-contrôle indépendant ciblé enregistré dans
[`ACTION-0041`](ACTION-0041-independent-recontrol.md) ferme `X11` et cette
action : `X11 = CLOSED`, `ACTION-0040 = CLOSED`, `ACTION-0041 = CLOSED`,
`TASK-0024 = VERIFIED`. Ce verdict est externe et n'est pas auto-attribué par
Codex.
