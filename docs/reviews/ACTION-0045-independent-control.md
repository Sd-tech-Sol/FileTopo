# ACTION-0045 — Contrôle indépendant de TASK-0028

- **Date :** 2026-09-07
- **Statut :** `CLOSED`
- **Branche contrôlée :** `build/v0.2-a12-synthetic-scale-spike`
- **Tâche :** [`TASK-0028`](../tasks/TASK-0028-synthetic-scale-feasibility-spike.md)
- **Exécuteur de TASK-0028 :** Claude Code
- **Rédacteur du présent enregistrement :** Codex
- **Autorité du verdict :** orchestrateur technique indépendant

Codex ne rend pas ce verdict et ne s'attribue pas `VERIFIED`. Il enregistre le
verdict externe déjà rendu après inspection de la branche, du diff, du
protocole gelé, du harness test-only, du rapport et des quatre artefacts de
mesure.

## 1. Verdict externe

`TASK-0028 = VERIFIED` comme **preuve de faisabilité architecturale / benchmark
synthétique**, et non comme validation de performance produit. Le critère
structurel principal — à budget fixe, la cardinalité rendable ne croît pas
proportionnellement au corpus — est **PASS au niveau du harness/core**.

`DEC-0029` reste `APPROVED`. Aucune capacité produit `F-042`, `F-050` ou
`F-051` n'est implémentée; elles restent `PROPOSED`. Aucune réserve corrective
ne bloque la livraison du spike. Aucun benchmark n'est requalifié en promesse
produit.

## 2. Identité et périmètre

| Contrôle | Verdict |
|---|---|
| Chaîne de branche | **PASS** — `976bd05` a pour parent direct le commit d'orchestration `db117fa`; le substantif est `66855a1` |
| Gel antérieur au harness | **PASS** — `ae25670`, parent direct `670704d`, précède `66855a1` |
| Isolation du harness | **PASS** — module derrière `#[cfg(test)]`; seuls ajouts hors module : `#[cfg(test)] mod scale_spike;` et `Index::connection_for_bench()` |
| Surface produit | **PASS** — aucune commande Tauri, route ou UX normale ajoutée |
| Limite historique | **PASS** — `MAX_NODES_PER_MAP = 5000` inchangé |
| États produit | **PASS** — aucun changement de `F-042`, `F-050` ou `F-051` |
| X5 et `main` | **PASS** — X5 = 36; `origin/main = 1a7d652c...`, inchangé |

## 3. Mesures acceptées dans leur portée exacte

- `SCAN-SCALE` physique 10k et 100k : mesuré, cardinalité exacte et source
  inchangée.
- `INDEX-SCALE` 1M : réellement construit et interrogé, mais **ce n'est pas un
  scan physique 1M**.
- `P-08` à 100k : vraie requête de production, pagination et exactitude
  vérifiées.
- Prototype borné : budgets 128, 256, 512 et 1024 exécutés sur 10k, 100k et 1M
  indexé; `SS9` **PASS** au niveau harness/core.
- Le layout ne reçoit que la vue bornée : **PASS**.
- WebView2 réel : exécuté mais **PARTIEL**. Chemin sans GPU puissant :
  **`NOT PROVEN`**.

À budget 1024 et focus racine, les trois tailles donnent exactement
**1 024 entités / 1 023 arêtes**. Le payload et le layout restent bornés par la
vue. Les artefacts portent `accountingExact=true`,
`aggregateInvariantBreaches=0`, et couvrent les budgets et focus prévus.

## 4. Résultats négatifs utiles

Ces constats sont des résultats attendus d'un spike de falsification, pas des
bugs de `TASK-0028` :

- `Index::replace_nodes(&[NodeDto])` impose le corpus en mémoire; environ
  335 Mio ont été observés à 1M sur ce banc;
- `Index::query_nodes` est linéaire : environ 67 ms p50 à 100k et 0,67 s p50 à
  1M, en `debug`;
- une page de 100 enfants directs coûte environ 106 ms à 1M avec l'ordre
  actuel;
- le compte récursif exact d'un agrégat coûte environ 1,34 s à 1M;
- les ancêtres restent plats, environ 43 µs, ce qui démontre qu'une requête
  réellement bornée est possible.

Ces nombres restent des **mesures d'ingénierie de ce banc**, jamais des
objectifs ou des promesses.

## 5. Réserves obligatoires

1. Le banc i9-9900K / environ 32 Gio / RTX 2070 est
   `DEVELOPMENT_BENCH_NOT_ACCEPTANCE`; la cible « machine modeste » reste non
   validée.
2. **1M physique reste non prouvé**; 1M est `INDEX-SCALE` seulement.
3. La composition index→materializer→frontend n'a pas été testée bout-en-bout.
4. `SS7` est **PARTIEL** : WebView2 réel a mesuré 12 et 157 entités, pas les
   budgets 256, 512 et 1024.
5. `SS8` est **`NOT PROVEN`** : l'application effective de `--disable-gpu`
   n'est pas confirmable honnêtement.
6. Les temps Rust sont en `debug` seulement; aucune baseline `release` n'est
   disponible.
7. Le voisinage relationnel de `SS4` n'a pas été mesuré, le store étant
   incompatible à cette couche.
8. `boundedViewCardinality.test.tsx` prouve seulement la cardinalité DOM/SVG
   sous jsdom. Son `hiddenCount` local n'est pas injecté dans `MapView` et ne
   prouve ni la sémantique `F-051` ni la composition bout-en-bout. La
   sémantique d'agrégat est testée séparément dans le harness Rust.
9. La dette préexistante de chemins locaux personnels dans d'anciens documents
   reste hors périmètre; `TASK-0028` n'en ajoute pas.

Ces limites interdisent toute affirmation de capacité produit au million,
d'acceptation sur matériel modeste ou d'implémentation de `F-050`.

## 6. Décision X5

Les quatre JSON de `TASK-0028` restent **non canoniques et non protégés** : le
banc n'est pas `TARGET_CLASS`, `SS7` est partiel, `SS8` est `NOT PROVEN` et la
composition bout-en-bout n'est pas prouvée. `PROTECTED_RUN_ARTIFACTS` et les
gardes Rust/TypeScript/PowerShell restent inchangés; aucun JSON n'est modifié,
renommé ou supprimé; X5 reste exactement à **36**.

## 7. État conservé et suite

`DEC-0029 = APPROVED`; `F-042 = PROPOSED / MVP`; `F-050` et `F-051 =
PROPOSED / MVP / P0`; `F-046 = PROPOSED`; `F-047 = DEFERRED`. Graphify reste
`NOT INTEGRATED`, Forge distinct, aucun renderer n'est choisi,
`MAX_NODES_PER_MAP = 5000` reste en vigueur, `R8` entière, `DEC-0013/F`
bloquante et X10 hors Windows non prouvée race-safe.

L'orchestrateur doit choisir la prochaine tranche de fondation d'échelle avant
le materializer produit : index et ordre de pagination des enfants, sémantique
du compte d'agrégat, recherche indexée, puis indexation/reconstruction en flux
ou par lots. Materializer, `F-042`/`F-050`/`F-051`, budget candidat et replay
ultérieur sur machine `TARGET_CLASS` viennent ensuite. Aucune `TASK-0029` ni
`DEC-0030` n'est créée ici.

## 8. Validations de fermeture

- `git diff --check` : **PASS**.
- Diff de fermeture : **8 fichiers, tous documentaires et tous autorisés**.
- Liens relatifs des huit documents de fermeture : **PASS**, 0 cible absente.
- X5 : **36** entrées, inchangé.
- Diff sous `src/`, `src-tauri/`, `scripts/` et
  `docs/performance/runs/` : **vide**.
- `origin/main` : `1a7d652ca48281c1687f6d1404c56a1404df91d8`,
  inchangé.
- `TASK-0029` / `DEC-0030` : **absentes**.
- `NEXT_ACTION.md` : **une seule action**.

Aucun nouveau benchmark, replay WebView2, test produit ou build n'a été
exécuté : cette fermeture est documentaire, conformément au GO.
