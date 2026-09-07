# ACTION-0044 — Contrôle indépendant documentaire de TASK-0027

- **Date :** 2026-09-06
- **Statut :** `CLOSED`
- **Tâche contrôlée :**
  [`TASK-0027`](../tasks/TASK-0027-progressive-scale-architecture-realignment.md)
- **Nature :** contrôle documentaire uniquement; aucune implémentation produit,
  aucun benchmark et aucune preuve runtime
- **Verdict :** rendu par l'orchestrateur technique indépendant
- **Exécuteur de TASK-0027 :** Claude Code
- **Rédacteur du présent enregistrement :** Codex

## 1. Séparation des rôles

L'orchestrateur technique indépendant a rendu le verdict après inspection de
la branche, du diff, des trois nouveaux documents et des documents produit
amendés. Claude Code était l'exécuteur de `TASK-0027`. Codex ne rend pas ce
verdict : il en rédige seulement l'enregistrement.

Ni Claude Code ni Codex ne s'auto-attribuent `VERIFIED`. Le passage de
`TASK-0027` à `VERIFIED` provient exclusivement du verdict externe consigné
ici.

## 2. Périmètre et identité contrôlés

| Élément | Constat indépendant |
|---|---|
| Branche livrée | `build/v0.2-a11-progressive-scale-architecture` |
| Base d'orchestration | `b5809424bfa5c34f956dbe76c0b96777b84dc5fa` |
| Commit substantif | `beef152f2474b04b1f8147434947165bc4eba8c6` |
| HEAD terminal de l'exécuteur | `b35e9813b121fdfdde1e35bc5249d1fb7cf8fb68` |
| Diff base → livraison | 15 fichiers seulement, tous documentaires ou d'orchestration |
| Code, runtime et preuves | aucun changement sous `src/`, `src-tauri/`, `scripts/`, `graph/` ou `docs/performance/runs/` |
| État avant contrôle | `TASK-0027 = IMPLEMENTED`, contrôle indépendant requis |

## 3. Verdict enregistré

| Contrôle | Verdict |
|---|---|
| Cohérence architecture / vision / roadmap / parité / matrice | **PASS** |
| Frontière « indexe grand, matérialise petit » | **PASS** |
| Quatre plans distincts et chaîne de matérialisation progressive | **PASS** |
| Promotion de `F-042` et ajouts de `F-050` / `F-051` | **PASS** |
| Matrice `F-001` à `F-051`, sans trou ni doublon | **PASS** |
| Amendement `P-SCALE-R1`, formulations d'origine conservées, 22 exigences | **PASS** |
| Graphify `NOT INTEGRATED` et Forge distinct | **PASS** |
| Aucun renderer final choisi, aucune dépendance à un GPU puissant ou à WebGL | **PASS** |
| Hachage lourd réservé à une campagne explicite ou d'arrière-plan | **PASS** |
| 10k / 100k / 1M explicitement non mesurés | **PASS** |
| Absence de changement code, runtime ou preuve | **PASS** |
| `X5 = 36`, inchangé | **PASS** |
| `origin/main = 1a7d652ca48281c1687f6d1404c56a1404df91d8`, non touché | **PASS** |

La frontière contrôlée distingue le corpus, le graphe logique, la vue
matérialisée et le rendu. `1 élément indexé = 1 entité accessible`, et non
`1 élément simultanément rendu`. `MAX_NODES_PER_MAP = 5000` est correctement
requalifié en limite de tranche historique sans modification du code.

La chaîne documentaire est cohérente : source en lecture seule → index complet
local → graphe logique → query engine borné → progressive materializer →
sous-graphe et agrégats → layout de la vue → renderer borné.

`F-042` reste **`PROPOSED`**, avec classification **`MVP`**. `F-050` et
`F-051` restent **`PROPOSED`**, avec classification **`MVP / P0`**. Leur
architecture et leur priorité sont approuvées; aucune de ces capacités n'est
implémentée par `TASK-0027`. `F-051` reste la contrepartie de véracité de
`F-050`. `F-046` reste `PROPOSED` et `F-047` reste `DEFERRED`.

Graphify reste explicitement **`NOT INTEGRATED`** : aucune dépendance, aucun
runtime, aucun adaptateur et aucune roadmap d'intégration. Forge reste un
projet entièrement distinct. React Flow, ELK, Sigma, Cytoscape et Pixi restent
des candidats futurs à benchmarker; aucun renderer final n'est choisi.

## 4. Résultat

- `ACTION-0044 = CLOSED`;
- `TASK-0027 = VERIFIED`;
- `DEC-0029` reste `APPROVED` comme décision produit et architecture, sa
  cohérence documentaire étant maintenant contrôlée indépendamment;
- aucune réserve corrective bloquante n'est ouverte.

Ce verdict ne transforme aucune cible d'architecture en résultat de
performance. Les niveaux 10k / 100k / 1M demeurent des cibles futures non
mesurées. Le progressive materializer, le budget de vue, le LOD et les
agrégats restent non implémentés.

## 5. Limites et dette non bloquante

- Aucun test produit, build Tauri, benchmark ou replay WebView2 n'est exécuté :
  le contrôle est documentaire uniquement.
- La réserve `R8` demeure entière.
- L'identité physique persistante de `F-046` demeure bloquée par
  `DEC-0013/F`.
- La garantie `X10` race-safe hors Windows reste non prouvée.
- `docs/decisions/README.md` n'indexait déjà pas `DEC-0024` à `DEC-0028`.
  Cette dette documentaire préexistante est signalée sans correction partielle
  dans la présente fermeture.
- Aucune `TASK-0028` ni `DEC-0030` n'est créée.
