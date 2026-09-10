# ACTION-0047 — Contrôle indépendant de TASK-0030

- **Date :** 2026-09-09
- **Statut :** `CLOSED`
- **Tâche contrôlée :**
  [`TASK-0030`](../tasks/TASK-0030-v1-pipeline-convergence.md) —
  `VERIFIED` dans sa portée synthétique de convergence V1
- **Exécuteur de TASK-0030 :** Codex
- **Rédacteur de l'enregistrement :** Claude Code
- **Autorité du verdict :** orchestrateur technique indépendant
- **Branche :** `build/v0.2-a14-v1-pipeline-convergence`
- **Décision encadrante :**
  [`DEC-0031`](../decisions/DEC-0031-one-canonical-brain-index-and-bounded-projection.md)
  — `APPROVED`, implémentation contrôlée

## Verdict enregistré

L'orchestrateur technique indépendant a rendu le verdict suivant, après
inspection de la livraison sur la branche de travail :

> **TASK-0030 = VERIFIED — PASS dans sa portée exacte de convergence V1
> synthétique : un seul index canonique par cerveau, projection runtime bornée,
> layout de la vue seulement, et MapApp alimenté par cette projection.**

Claude Code ne rend pas ce verdict et ne s'attribue pas `VERIFIED`. Cette fiche
enregistre uniquement le contrôle externe, conformément à `AGENTS.md`.

**Ce verdict ne signifie pas** que FileTopo V1 est terminée, ni que `F-050` et
`F-051` sont entièrement `VERIFIED` dans leur contrat produit global. Le
contrôle valide **la tranche**, pas la fonction commerciale finale.

## Points PASS du contrôle externe

1. **Chaîne Git correcte.** Le gel documentaire TASK-0030 + DEC-0031
   `0255bd10717e11e460ab5a405aa07f9e516fa535` précède le code, et descend
   directement du commit d'orchestration
   `896e2c39b955688e6a740427691be62255436a04`. Le commit substantif
   `ab1d7e2386dd0cf5b935377c867c89617e4e3e56` en est l'enfant direct. La
   branche ne diverge pas.
2. **Un seul corpus canonique runtime.** `crate::index::Index` et sa table
   `nodes` sont la vérité de corpus par cerveau. `map::store` est réduit à des
   DTO — `MapNode`, `MapSnapshot`, `NodeDetail`; l'ancien `MapStore`/`map_nodes`
   ne subsiste que comme `legacy_store`, déclaré `#[cfg(test)]` dans
   `src-tauri/src/map/mod.rs`, pour la migration et la régression.
3. **Build sans layout global.** `map::commands::build_map` scanne la source
   synthétique en lecture seule, publie l'Index canonique, puis ne calcule
   aucun layout de corpus — le rapport de build déclare `layout_ms = 0.0`,
   `layout_invocations = 0` et `node_ceiling = 0`. `MAX_NODES_PER_MAP = 5000`
   n'est plus une limite runtime et reste seulement sous `#[cfg(test)]`.
4. **Projection produit bornée réelle.** La chaîne est
   `map_view -> materialize_view() -> layered-tree-cards-v1 -> DTO -> MapApp`.
   `VIEW_BUDGET = 512` et `MATERIAL_BUDGET = VIEW_BUDGET / 2 = 256` : au plus
   256 nœuds matériels, avec une place d'agrégat réservée par nœud, de sorte que
   nœuds + agrégats restent inférieurs ou égaux à 512.
5. **Agrégats exacts et distincts.** `ViewAggregate` porte le parent, le nombre
   exact d'enfants directs absents de la vue, la raison de regroupement et un
   curseur éventuel. Aucun chemin, faux dossier, arête, relation ni suggestion
   n'est inventé.
6. **Layout seulement sur la projection.** Les rectangles sont calculés dans
   `materialize_view`, après la sélection bornée des entités. Aucun rectangle
   n'est persisté pour le corpus runtime.
7. **100k sur le cœur produit.** Le test produit crée un Index de 100 000
   nœuds, appelle le vrai materializer, sérialise un DTO borné, vérifie que les
   99 999 enfants sont atteignables par pagination sans doublon ni omission, et
   refuse un curseur périmé après avancée de révision.
8. **Passage physique au-delà de 5000.** Le scénario synthétique réel à 6001
   nœuds passe par scan -> Index canonique -> projection, confirme l'empreinte
   source inchangée et invalide le curseur après rebuild.
9. **WebView2 réel.** La preuve non canonique rapporte 6001 nœuds indexés vers
   256 matérialisés et 1 agrégat, navigation progressive, pan/zoom/sélection,
   24 keydowns de confiance et aucune erreur console fatale.
10. **Relations et contenu hors projection.** Une extrémité relationnelle hors
    vue reste résolue contre l'Index canonique, et l'interface le déclare au
    lieu d'inventer des coordonnées. Les consommateurs d'analyse ne créent
    aucun second stockage canonique.
11. **Aucune nouvelle dépendance ni changement de pile.** Aucun renderer,
    manifeste de paquet, cloud, LLM, MCP ni réseau produit n'a changé.
12. **Données exclusivement synthétiques.** Aucun sélecteur de dossier réel
    n'est exposé; aucun cerveau réel n'a été lu.
13. **Validations de l'exécuteur, enregistrées comme telles.** Rust
    **290 PASS / 0 FAIL / 5 ignorés**, TypeScript **264 PASS / 0 FAIL**,
    `pnpm check`, `pnpm build`, `cargo build --offline`, garde de source runtime
    et `git diff --check` PASS. Ce sont des **preuves d'exécuteur**, pas une
    réexécution indépendante : `ACTION-0047` ne relance ni les suites lourdes,
    ni les bancs, ni le rejeu WebView2.

## Réserves maintenues — non bloquantes

Aucune de ces réserves n'est effacée ni transformée en promesse.

### `R-T30-1` — Clippy strict non vert

`cargo clippy --all-targets --offline -- -D warnings` est rapporté en échec :
13 erreurs `lib` et 22 erreurs `lib test`. L'exécuteur a classé ces diagnostics
comme dette préexistante à partir de 24 extraits retrouvés au baseline
`896e2c3`, **mais le contrôle indépendant n'a pas réexécuté le baseline
Clippy**. La V1 publiable devra présenter une chaîne CI/release propre, ou une
décision écrite sur chaque exception. `TASK-0030` n'est pas bloquée par ce
point : aucun nouveau diagnostic propre à la convergence n'a été démontré.

### `R-T30-2` — ouvrir n'est pas encore réutiliser l'index existant

`map_open` et `build_map` rescanent et republient encore le corpus au
chargement, même lorsque l'index est compatible; `rebuild = false` ne signifie
pas encore « ouvrir l'index persistant sans rescan ». **Avant d'exposer une
vraie racine utilisateur**, la V1 doit distinguer explicitement :

- l'ouverture ou la reprise d'un index valide existant;
- l'actualisation explicite et la réconciliation;
- la reconstruction forcée.

Sans cette distinction, un cerveau réel serait rescané inutilement à chaque
chargement, et les révisions et curseurs seraient invalidés sans nécessité.

### `R-T30-3` — certaines analyses restent en mémoire corpus

`AnalysisInput` et `analysis_nodes()`, ainsi que certaines opérations d'analyse
et de digest, peuvent encore matérialiser les métadonnées du corpus complet en
mémoire. Cela ne traverse pas le DTO de carte et ne recrée pas `map_nodes` : la
frontière de rendu reste correcte. La dette de mémoire et d'indexation doit
néanmoins être traitée avant la validation V1 sur de très gros cerveaux.

### `R-T30-4` — performances produit non encore acceptées

- WebView2 physique : 6001 nœuds synthétiques, pas 100 000 physiques;
- 100k : cœur produit Rust et jsdom, pas une acceptance Windows complète;
- aucune validation sur portable `TARGET_CLASS`;
- aucune preuve en mode GPU désactivé;
- aucun 1M physique;
- `R8` reste ouverte.

### `R-T30-5` — périmètre produit encore synthétique

`SourceKind` et `MapApp` restent synthétiques, et le sélecteur de dossier réel
reste volontairement non exposé. Ce contrôle autorise **la prochaine tranche de
préparation au vrai cerveau**, pas l'utilisation silencieuse de données
personnelles.

### `R-T30-6` — dette test-only historique

`legacy_store.rs` conserve une copie importante de l'ancien store pour les tests
et les migrations. C'est acceptable pour `TASK-0030`, mais avant publication ce
code devra être réduit ou supprimé s'il n'est plus nécessaire, plutôt que
maintenu comme second pseudo-moteur par simple inertie.

## Artefacts et X5

Les trois JSON `TASK-0030` restent **non canoniques**, non protégés et
inchangés :

- [`TASK-0030-materialized-view-100k.json`](../performance/runs/TASK-0030-materialized-view-100k.json)
- [`TASK-0030-webview2.json`](../performance/runs/TASK-0030-webview2.json)
- [`TASK-0030-validation.json`](../performance/runs/TASK-0030-validation.json)

Ils ne sont ni régénérés, ni modifiés, ni renommés, ni supprimés, ni ajoutés à
`X5`. Les 36 noms protégés existants restent inchangés, bit pour bit.

## État produit après contrôle

- `TASK-0030 = VERIFIED`, dans sa portée synthétique de convergence
- `ACTION-0047 = CLOSED`
- `DEC-0031 = APPROVED`, implémentation contrôlée
- `TASK-0029 = VERIFIED` et `ACTION-0046 = CLOSED`, inchangés
- `F-050 = IMPLEMENTED` — **pas `VERIFIED` globalement**
- `F-051 = IMPLEMENTED` — **pas `VERIFIED` globalement**
- `F-042 = PROPOSED / MVP`
- `F-046 = PROPOSED`
- `F-047 = DEFERRED`
- Graphify `NOT INTEGRATED`; aucun nouveau renderer
- `X5 = 36`
- `origin/main = 1a7d652ca48281c1687f6d1404c56a1404df91d8`, inchangé

`F-050` et `F-051` ne passent pas à `VERIFIED` parce que leur contrat produit
complet exige davantage que cette tranche synthétique : acceptance d'échelle et
de rendu, puis intégration au vrai flux V1.

Aucune `TASK-0031`, aucune `DEC-0032`, aucune branche suivante, aucune PR,
fusion, étiquette ni release n'est créée par cette fermeture. L'action unique
suivante revient à l'orchestrateur.
