# HANDOFF — passage de relais

- **Dernière mise à jour :** 2026-08-31
- **Branche active :** `build/v0.2-p4-vertical-slice`
- **Dernière tâche vérifiée :** `TASK-0015`, **`VERIFIED`** le 2026-08-31
  ([`ACTION-0025`](../reviews/ACTION-0025-independent-control.md)), avec la
  réserve normative **`X1`, corrigée**
- **Tâche livrée, NON vérifiée :** **`TASK-0016`, `IMPLEMENTED`** le
  2026-08-31 — première tranche verticale de **code de production**
- **Contrôle indépendant :**
  [`ACTION-0026`](../reviews/ACTION-0026-independent-control.md) →
  **`CHANGES_REQUIRED`**, réserve **`X2`** corrigée, **re-contrôle attendu**
- **Tâche IN_PROGRESS :** aucune
- **Porte `P4` :** **FRANCHIE** —
  [`DEC-0016`](../decisions/DEC-0016-p4-gate-crossing-and-first-slice.md)

## Où en est le projet

`ACTION-0025` a **clos** `TASK-0015` — contrôle accepté, `VERIFIED`, réserve
normative `X1` corrigée dans le même geste — et **franchi la porte `P4`**.

`TASK-0016` a ensuite produit **la première ligne de code de production du
projet**, et la chaîne complète existe : fixture synthétique → scan en lecture
seule → index SQLite persistant → calepinage → carte HTML/SVG accessible **dans
un véritable hôte Tauri/WebView2** → navigation → sélection → détails.

**Les onze critères gelés sont tenus**, et pour la première fois du projet des
temps d'image ont été relevés **dans le moteur de production**.

`ACTION-0026` a **contrôlé** cette tranche et rendu **`CHANGES_REQUIRED`** :
la réserve bloquante **`X2`** a établi que le runtime enregistrait encore huit
commandes héritées de la 0.1, dont un **sélecteur de dossier réel**. La
correction est faite — le gestionnaire n'expose plus que les neuf commandes de
la tranche — et **deux tests-gardes** empêchent la régression.

**Rien n'est vérifié.** La correction vient de l'exécuteur de la tranche;
`TASK-0016` **reste `IMPLEMENTED`** et attend le **re-contrôle indépendant**.

## Ce qu'il faut savoir en douze lignes

1. **CarteTopo est la RÉFÉRENCE FONCTIONNELLE.** L'ancienne version publique de
   FileTopo est un **prototype et un audit technique**. « L'ancienne version ne
   le faisait pas » **n'est pas un argument recevable**.
2. **L'apparence est entièrement libre** et peut être **entièrement
   modernisée**; **aucune amélioration visuelle ne supprime la parité**. En cas
   de conflit, **la parité gagne**.
3. **Le contrat exigible est
   [`CARTETOPO_FUNCTIONAL_PARITY.md`](../product/CARTETOPO_FUNCTIONAL_PARITY.md)** :
   22 exigences, 3 invariants. **Six sont satisfaites sur le seul périmètre de
   la première tranche, deux sont partielles, seize ne sont pas commencées.**
4. **Correction `X1` :** une **suggestion n'est pas une provenance de
   relation**. Une relation établie a pour provenance **`déterministe`** ou
   **`approuvée`**, sans troisième valeur; une suggestion est un **objet et un
   état distincts**, affichable mais **jamais** comptée comme relation.
5. **`TASK-0016` est `IMPLEMENTED`, jamais auto-déclarée `VERIFIED`.**
6. **Les critères ont été gelés AVANT le code** — commit `6edd5bd`, code en
   `130b670`. **Aucun n'a été retouché après le premier résultat.**
7. **`H9` n'imposait aucune cible d'images par seconde.** Il n'y a **ni cible
   atteinte, ni cible manquée** à annoncer.
8. **`4,20 ms` est une butée**, pas une mesure : synchronisation verticale à
   4,1667 ms sur un écran 240 Hz. **Jamais citable comme performance.** Seuls
   `wide` (**17,80 ms**) et `mixed` (**21,35 ms**) sont au-dessus de la butée —
   valeurs du **binaire corrigé**, légèrement moins bonnes que celles de
   `8cb752b` et publiées telles quelles.
9. **`R8` n'est pas levée** et ne peut l'être qu'à l'**étape C** : une machine,
   un **binaire de développement**, des fixtures **≤ 2 420 nœuds**.
10. **Aucun budget adaptatif** n'est employé, adopté, abandonné ni validé. La
    borne `B-1` de 5 000 nœuds est un **plafond déclaré**, qui ne s'ajuste à
    rien. Réserve `W2` : **aucune stabilité n'est prouvée**.
11. **`B0` s'est reproduit trois fois et n'est pas corrigé.** **Ne rien
    supprimer** dans `src-tauri/target/` — `DEC-0013` E. Employer
    `CARGO_INCREMENTAL=0`.
12. **Aucune donnée réelle, aucun sélecteur de dossier, aucun chemin local
    personnel dans le dépôt** — artefacts de mesure compris.

## Comment faire tourner la tranche

    pnpm install
    CARGO_INCREMENTAL=0 pnpm tauri dev

Les quatre fixtures sont **engendrées** au premier clic, dans
`.filetopo-sandbox/` — ignoré par Git, reproductible depuis les graines fixes
`20260831001` à `20260831004`.

Deux modes non surveillés, **développement seulement** :

    CARGO_INCREMENTAL=0 FILETOPO_AUTO_VERIFY=1 pnpm tauri dev   # rejoue H1-H7, H10, H11
    CARGO_INCREMENTAL=0 FILETOPO_AUTO_MEASURE=1 pnpm tauri dev  # rejoue H9

Chacun écrit son artefact sous `docs/performance/runs/`.

**Si une course reste muette :** la fenêtre doit rester visible. Chromium
suspend `requestAnimationFrame` pour une fenêtre occultée; la course échoue
alors explicitement au bout de 8 s au lieu d'attendre indéfiniment.

## Gouvernance en vigueur

Les **GO techniques** viennent de l'**orchestrateur technique**, sous
délégation de Sébastien. **Restent réservés à Sébastien**, sans délégation :
dépense, **donnée réelle ou personnelle**, publication externe exceptionnelle
(fusion vers `main`, PR, release, étiquette, nouveau distant), opération
destructive ou hors dépôt, **changement important de portée produit**.

## État Git

| Référence | SHA |
|---|---|
| `main` locale et distante | `91bbe90f0f99026c28cd345784d4f579a0016db2` — **non touchée** |
| `rebuild/v0.2-project-brain` | `db8d3de0b20e7efbfe463a17c218cc14face39a8` — **non touchée** |
| `spike/v0.2-technical-risk-gates` | `746f1b5f93c9d7085516c0e56473a95dc2c2d178` — **non touchée** |
| `spike/v0.2-render-budget` | `933bd0d5e7e05e4e7fe233c5fc6b9320a194264d` — **non touchée** |
| `spike/v0.2-budget-controller` | porte la clôture d'`ACTION-0025` |
| `build/v0.2-p4-vertical-slice` | branche de `TASK-0016`, voir `git rev-parse HEAD` |

Aucune fusion, aucune PR, aucune release, aucune étiquette, aucun `force push`,
aucune réécriture d'historique, aucune suppression de branche.

## Points ouverts

| # | Point | Ce qui est demandé |
|---|---|---|
| 1 | **`TASK-0016` est `IMPLEMENTED`**, `X2` corrigée | **RE-CONTRÔLE** d'`ACTION-0026`, par une instance **distincte de l'exécuteur** : corriger son propre livrable ne le vérifie pas |
| 1 bis | **La surface runtime doit rester celle de la tranche** | Les deux tests-gardes échouent si une commande hors tranche est réenregistrée. **Ne pas les contourner** |
| 2 | **Seize exigences de parité non commencées** | Chaque tranche suivante exige sa **propre fiche**, ses **critères gelés** et son **GO**. Les relations transversales portent la correction `X1` |
| 3 | **`P-12` et `P-06` sont partielles** | Masquage du panneau, survie au redémarrage, relations transversales et atténuation liée à `F-017` restent à faire |
| 4 | **`P-08` exige 100 000 nœuds** | La borne de 5 000 est une **limite de `TASK-0016`**, pas une limite produit |
| 5 | **Manque `M-1`** — persistance des préférences | À résoudre **avant** la tranche qui implémente réellement `P-19` — `DEC-0016` D |
| 6 | **`R8`** | En vigueur. **Levée seulement à l'étape C** |
| 7 | **Réserves `V1`–`V4`, `W1`–`W4`, `R2`–`R9`** | Toutes en vigueur; `R1` levée depuis `ACTION-0023` |
| 8 | **`B0`, `B3` inter-volume, `B4` question 3** | Inchangés. Le cache fautif est **conservé**; la question 3 se ferme **avant** l'identité persistante et l'état vu/non vu |
| 9 | **`P-21`** | Interface **en français seulement**; bilinguisme intégral et audit WCAG restent à faire |

## Prochaine action unique

**`ACTION-0026`** — contrôle indépendant de `TASK-0016`. Détail dans
[NEXT_ACTION.md](NEXT_ACTION.md).

## Commandes sûres

    git rev-parse --show-toplevel
    git branch --show-current
    git rev-parse HEAD
    git status --short
    git log --oneline 73f0327..HEAD
    git show 6edd5bd --stat    # le gel des critères, AVANT tout code
    git show 130b670 --stat    # le premier code de production

    CARGO_INCREMENTAL=0 cargo test --manifest-path src-tauri/Cargo.toml --lib
    pnpm test

## Message court pour Claude Code

Lis seulement CLAUDE.md, docs/ai/START_HERE.md, docs/ai/CURRENT_STATE.md et
docs/ai/NEXT_ACTION.md. `TASK-0012` à `TASK-0015` sont **closes et
`VERIFIED`**; **`TASK-0016` est `IMPLEMENTED` et attend un contrôle
indépendant**.

**La porte `P4` est franchie**, mais elle n'autorisait que `TASK-0016`. **Une
tranche suivante exige sa propre fiche, ses critères gelés d'avance et son
GO.** Ne t'attribue pas `VERIFIED`.

**N'ouvre pas Canvas 2D ni WebGL.** **Ne reprends aucun contrôleur de budget de
spike.** **Ne corrige pas `B0` et ne supprime rien** dans `src-tauri/target/`.
**Ne cite jamais 4,20 ms comme une performance** — c'est une butée de
synchronisation verticale. **Ne lève pas `R8`.** Ne fusionne rien, ne crée ni
PR, ni release, ni étiquette.
