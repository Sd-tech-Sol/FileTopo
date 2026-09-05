# ACTION-0041 — Re-contrôle indépendant ciblé X11 : CLOSED, TASK-0024 VERIFIED

- **Date :** 2026-09-05
- **Objet :** enregistrement du re-contrôle indépendant ciblé `X11` de
  `TASK-0024`, dernière réserve ouverte d'`ACTION-0040`
- **Contrôleur :** **orchestrateur technique indépendant**, instance distincte
  de l'exécuteur de `TASK-0024`
- **Rédacteur :** Codex. **Ce document ENREGISTRE le verdict externe rendu par
  l'orchestrateur technique indépendant; Codex ne rend pas ce verdict, ne
  ferme pas `X11` de sa propre autorité et ne s'attribue pas `VERIFIED`.**
- **HEAD re-contrôlé avant fermeture :**
  `f78d1bf4842ced5201608f59a31747f02fce0332`
- **Commit substantif de correction `X11` :**
  `bcc10a8d0196d55dd07f1998558d4ca5e9586292`
- **`main` :** `91bbe90f0f99026c28cd345784d4f579a0016db2`, intacte
- **Contrôle précédent :** [`ACTION-0040`](ACTION-0040-independent-control.md),
  qui avait laissé `X11` ouverte et `TASK-0024` `IMPLEMENTED`

## 1. Verdict externe enregistré

| Élément | Verdict |
|---|---|
| Réserve `X11` | **`CLOSED`** |
| `ACTION-0040` | **`CLOSED`** |
| `ACTION-0041` | **`CLOSED`** |
| `TASK-0024` | **`VERIFIED`** |

Aucune réserve ne reste ouverte sur `TASK-0024`.

## 2. Motifs de clôture de X11

Enregistrés tels que rendus, factuellement :

- `source_spec()` valide la source sans appliquer le périmètre legacy;
- `legacy_fixture_spec()` limite toujours `TASK-0017` à `quasi-empty`;
- `self_check` reste limité au contrat historique;
- `open_relations` fonctionne pour tout `BrainRecord` valide et ne dérive ni
  ne sème le legacy hors `quasi-empty`;
- `node_relations` et `approve_suggestion` ne sont plus bloqués par la fixture
  legacy, tandis qu'une suggestion core périmée reste refusée;
- le panneau distingue disponibilité core et périmètre legacy, et le bouton
  **Analyser les relations** reste présent hors `quasi-empty`;
- la preuve réelle WebView2 X11 sur `brain-beta` / `deep` montre un panneau
  disponible, une vraie frappe clavier, zéro clic programmatique, un report
  `brain-beta` / `dre-v1` / `CURRENT`, aucun producteur legacy, `seeded = 0`
  et une source inchangée;
- lors de la correction, Rust **200/200**, TypeScript **215/215**, `pnpm check`,
  `pnpm build` et Tauri debug `--no-bundle` ont passé;
- DR15 pass1/pass2 ont été rejoués sur une variante fraîche et J12 réel a été
  rejoué sans affaiblir les invariants legacy;
- X5 est resté à 29 pendant la correction et `main` est restée intacte.

## 3. Scellement X5 — 29 → 32

Les trois preuves canoniques de `TASK-0024`, et elles seules, rejoignent X5 :

1. `TASK-0024-DR15-deterministic-relation-engine-webview2-pass1.json`
2. `TASK-0024-DR15-deterministic-relation-engine-webview2-pass2.json`
3. `TASK-0024-J12-intrabrain-relations-regression-webview2.json`

Les 29 noms antérieurs restent dans le même ordre. Les trois gardes canoniques
Rust, TypeScript et PowerShell portent les mêmes 32 noms dans le même ordre.

La preuve corrective `TASK-0024-X11-generic-brain-webview2.json` reste
**non canonique**, ne rejoint pas X5 et ne remplace aucune preuve gelée. Les
replays H9/K11/K12/L12/M12/N15/EC15 et les variantes `-abandon` de
`TASK-0024` restent également non protégés.

## 4. État dérivé du runtime

Le runtime écrit encore sous `TASK-0024`. Après scellement :

```text
protectedArtifactCount    = 32
protectedDestinations     = [les deux DR15 et le J12 canoniques]
owningTaskId              = TASK-0024
writesUnderItsOwnTaskOnly = false
```

Cet état est normal après `VERIFIED`. Le runtime n'est pas migré vers une
`TASK-0025`, qui n'est pas créée. `SEALED_RUNTIME_DESTINATIONS` publie
l'intersection exacte. La destination X11 reste autorisée.

## 5. Contrôles de fermeture

- `runArtifacts.test.ts` : **33/33 PASS**. Un premier lancement a rendu
  **30/33** : l'ensemble de l'intersection était exact, mais une comparaison
  utilisait l'ordre runtime (`J12`, puis DR15) plutôt que l'ordre canonique
  append-only. La dérivation a été corrigée pour suivre l'ordre X5; le rejeu
  ciblé passe **33/33**;
- tests Rust ciblés `map::commands::tests::` : **22/22 PASS**, dont refus
  effectif des trois preuves canoniques et maintien des destinations
  non canoniques hors du scellement;
- PowerShell : **32/32 refus**, **32 noms uniques**, et X11 autorisée;
- parité exacte Rust / TypeScript / PowerShell : **PASS**;
- `git diff --check` : **PASS**;
- empreintes SHA-256 des trois preuves canoniques et de X11 : inchangées.

Aucun rejeu WebView2, DR15, J12, X11, K11, K12, L12, M12, N15, H9 ou EC15.
Aucun JSON sous `docs/performance/runs/` n'est modifié.

## 6. Limites conservées

- la garantie race-safe `X10` reste prouvée sur Windows seulement;
- `DEC-0013/F` reste bloquante pour l'identité physique persistante;
- `F-044`, `F-045` et `F-046` ne sont pas implémentées par cette fermeture.

## 7. État et action suivante

`X11 = CLOSED`, `ACTION-0040 = CLOSED`, `ACTION-0041 = CLOSED`, `TASK-0024 =
VERIFIED`. L'action suivante unique est de rendre la main à l'orchestrateur
pour définir la prochaine tranche après `TASK-0024 VERIFIED`.
