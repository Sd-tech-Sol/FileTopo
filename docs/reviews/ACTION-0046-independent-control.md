# ACTION-0046 — Contrôle indépendant de TASK-0029

- **Date :** 2026-09-09
- **Statut :** `CLOSED`
- **Tâche contrôlée :**
  [`TASK-0029`](../tasks/TASK-0029-scale-query-foundation.md) —
  `VERIFIED`
- **Exécuteur de TASK-0029 :** Claude Code
- **Rédacteur de l'enregistrement :** Codex
- **Autorité du verdict :** orchestrateur technique indépendant
- **Branche :** `build/v0.2-a13-scale-query-foundation`

## Verdict enregistré

L'orchestrateur technique indépendant a rendu le verdict suivant :

> **TASK-0029 = VERIFIED — PASS dans sa portée exacte de fondation Rust/SQLite
> et mesure d'ingénierie non produit.**

Codex ne rend pas ce verdict et ne s'attribue pas `VERIFIED`. Cette fiche
enregistre uniquement le verdict externe, conformément à `AGENTS.md`.

## Portée acceptée

Le contrôle indépendant accepte `TASK-0029` parce que :

1. la lecture des enfants directs est désormais bornée et index-driven;
2. l'ordre fonctionnel reste dossiers d'abord, `name COLLATE NOCASE`, puis
   `id`;
3. la continuation utilise un curseur keyset, pas `OFFSET`;
4. le curseur est lié à l'index, à sa révision et au parent, et refuse les
   curseurs périmés, étrangers ou d'un autre parent;
5. `idx_nodes_child_order` sert le filtre et l'ordre;
6. le plan mesuré n'utilise aucun `USE TEMP B-TREE FOR ORDER BY`, aucun scan
   complet du corpus et aucun `OFFSET` sur la continuation;
7. le compte exact d'enfants directs utilise `child_count`, audité à zéro
   désaccord dans les campagnes;
8. la migration `user_version 2 -> 3` est testée sans perte de nœuds, de
   métadonnées ou d'état `seen`;
9. la campagne d'ingénierie respecte le critère `p95(1M) <= 5 × p95(100k)`,
   avec un pire ratio déclaré de `2.30`;
10. aucune UI, commande Tauri, IPC, materializer, renderer, dépendance produit
    ni `MAX_NODES_PER_MAP` n'a été modifié par `TASK-0029`.

## Limites maintenues

Ces résultats ne sont pas une promesse produit :

- le benchmark reste `DEVELOPMENT_BENCH_NOT_ACCEPTANCE`;
- les timings Rust sont en `debug`;
- 1M signifie `INDEX-SCALE`, pas un million de fichiers physiques;
- le corpus synthétique a une forme limitée;
- aucun test bout-en-bout index -> vue -> frontend n'a été exécuté;
- `Index::replace_nodes` tient encore le corpus en mémoire, avec environ
  189 Mo déclarés à 1M;
- la recherche `P-08` reste linéaire et inchangée;
- aucun résultat de machine modeste ou `TARGET_CLASS` n'est établi;
- aucune capacité produit `F-042`, `F-050` ou `F-051` n'est implémentée par
  cette tâche.

`TASK-0029` vérifie une fondation de requête. Elle ne vérifie ni la V1, ni le
million d'éléments comme capacité commerciale.

## Artefacts et X5

Les deux JSON `TASK-0029` restent non canoniques et non protégés :

- [`TASK-0029-SQF-100k.json`](../performance/runs/TASK-0029-SQF-100k.json)
- [`TASK-0029-SQF-1m-index.json`](../performance/runs/TASK-0029-SQF-1m-index.json)

Ils ne sont pas ajoutés à `X5`. Les quatre JSON `TASK-0028` restent inchangés.
`X5` reste exactement à **36**.

## État produit après contrôle

- `TASK-0029 = VERIFIED`
- `ACTION-0046 = CLOSED`
- `DEC-0030 = APPROVED`, implémentation contrôlée
- `F-042 = PROPOSED / MVP`
- `F-050 = PROPOSED / MVP / P0`
- `F-051 = PROPOSED / MVP / P0`
- `F-046 = PROPOSED`
- `F-047 = DEFERRED`
- `MAX_NODES_PER_MAP = 5000`
- Graphify `NOT INTEGRATED`
- aucun nouveau renderer
- `X5 = 36`
- `origin/main = 1a7d652ca48281c1687f6d1404c56a1404df91d8`, inchangé

L'action unique suivante revient à l'orchestrateur : ouvrir la prochaine
tranche V1 de convergence du pipeline réel.
