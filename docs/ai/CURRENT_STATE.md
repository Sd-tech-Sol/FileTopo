# État courant

- **Dernière mise à jour :** 2026-08-31
- **Branche active :** **`build/v0.2-p4-vertical-slice`**, créée depuis le tip
  contrôlé `73f03273101f43096bafd4ac634253a2dd3dd5a9` après le commit
  documentaire de clôture d'`ACTION-0025`
- **`spike/v0.2-budget-controller` :** porte la clôture d'`ACTION-0025`
- **`spike/v0.2-render-budget` :** `933bd0d…`, **non touchée**
- **`spike/v0.2-technical-risk-gates` :** `746f1b5…`, **non touchée**
- **`rebuild/v0.2-project-brain` :** `db8d3de0…`, **non touchée**
- **`main` :** inchangée, `91bbe90f0f99026c28cd345784d4f579a0016db2`, **non
  touchée**
- **Dernière tâche vérifiée :** `TASK-0015`, `VERIFIED` le 2026-08-31
  ([`ACTION-0025`](../reviews/ACTION-0025-independent-control.md)), **avec la
  réserve normative `X1`, corrigée**
- **Tâche livrée, NON vérifiée :** **`TASK-0016`, `IMPLEMENTED` le
  2026-08-31** — première tranche verticale de **code de production**
- **Contrôle indépendant :**
  [`ACTION-0026`](../reviews/ACTION-0026-independent-control.md) →
  **`CHANGES_REQUIRED`**, réserve bloquante **`X2`**, **corrigée**, en attente
  de **re-contrôle**
- **Tâche IN_PROGRESS :** aucune
- **Porte `P4` :** **FRANCHIE** —
  [`DEC-0016`](../decisions/DEC-0016-p4-gate-crossing-and-first-slice.md)

## Ce qui a changé, en une phrase

**FileTopo a cessé d'être un dossier de décisions : il existe, il démarre dans
un véritable hôte Tauri/WebView2, et il cartographie une arborescence de bout
en bout.** Pour la première fois du projet, des temps d'image ont été relevés
**dans le moteur de production**.

## TASK-0016 — la première tranche verticale

**La chaîne complète, en code de production durable :** fixture synthétique →
scan Rust en lecture seule → index SQLite persistant et reconstructible →
calepinage hiérarchique → carte HTML/SVG accessible dans WebView2 →
panoramique, zoom, ajuster, réinitialiser → sélection souris **et** clavier →
détails avec parent et enfants directs.

**Aucun code de spike n'a été repris.** L'application démarre désormais sur
cette tranche; **`src/App.tsx`, l'écran 0.1 alpha, est conservé intact** comme
l'audit technique qu'il est — `DEC-0015` A.

### Les onze critères gelés sont tenus

Gelés et commités **avant la première ligne de code** — commit `6edd5bd`, puis
le code en `130b670`. **Aucun critère n'a été retouché après le premier
résultat.**

| Critère | Verdict |
|---|---|
| `H1` plan = disque = index | **TENU** |
| `H2` aucune dimension nulle, aucun chevauchement | **TENU**, 0 violation |
| `H3` parent et enfants directs = index | **TENU**, 0 écart |
| `H4` souris **et** clavier, 10 000 opérations sans état hors bornes | **TENU** |
| `H5` détails = index, diagnostics **affichés** | **TENU**, 0 écart |
| `H6` empreinte source identique avant/après | **TENU**, 4/4 |
| `H7` index reconstruit équivalent, non reconstructible **énuméré** | **TENU** |
| `H8` rend dans **WebView2 `151.0.4129.107`** | **TENU** |
| `H9` 5 exécutions par fixture, publiées sans sélection | **TENU** — **aucune cible n'était fixée** |
| `H10` calepinage payé une fois, 0 appel en navigation | **TENU**, < 1 % |
| `H11` bornes déclarées d'avance et respectées | **TENU** |

### Fixtures réalisées

| Fixture | Nœuds | Plafond gelé | Profondeur |
|---|---:|---:|---:|
| `QUASI_EMPTY` | 12 | 25 | 3 |
| `DEEP` | 157 | 500 | **40** |
| `WIDE` | 2 207 | 3 000 | 3 |
| `MIXED` | 2 420 | 5 000 | 32 |

**Ces bornes sont des limites de `TASK-0016`, pas des limites produit.**

### La réserve bloquante X2, et sa correction

**Constat du contrôle indépendant.** Le runtime du produit courant
**enregistrait encore** huit commandes héritées de la 0.1 — dont
`choose_collection`, un **sélecteur de dossier réel** — et initialisait
`tauri_plugin_dialog`. **Enregistrer une commande est ce qui la rend
invocable** depuis la WebView, que l'interface propose ou non un bouton : un
sélecteur de dossier réel était donc à **un `invoke` de distance** d'une
tranche qui ne doit pas en avoir. Le défaut était né **par addition**, et le
rapport de clôture avait jugé sur ce que l'interface *appelle* plutôt que sur
ce que le runtime *expose*.

**Corrigé.** L'`invoke_handler` n'enregistre plus que les **neuf commandes
`map_*`**; le plugin de dialogue n'est plus initialisé. **Le code historique
est conservé** — aucune fonction supprimée, `src/App.tsx` et ses douze tests
intacts — et **deux tests-gardes** échouent désormais si une commande hors
tranche est réenregistrée, ce qui a été **éprouvé en réintroduisant
temporairement le défaut**.

### Mesures dans WebView2 — binaire corrigé

| Fixture | Nœuds | Image médiane | Image min–max | Sélection médiane |
|---|---:|---:|---:|---:|
| `quasi-empty` | 12 | 4,20 ms **(butée)** | 2,00 – 8,80 | 8,30 ms |
| `deep` | 157 | 4,20 ms **(butée)** | 2,20 – 8,70 | 8,40 ms |
| `wide` | 2 207 | **17,80 ms** | 4,10 – 32,10 | 38,45 ms |
| `mixed` | 2 420 | **21,35 ms** | 4,60 – 40,30 | 42,95 ms |

**Ces chiffres sont légèrement moins bons que ceux du commit `8cb752b`** —
`wide` 17,80 contre 16,70 ms, `mixed` 21,35 contre 20,20 ms. **Publiés tels
quels**, ils **remplacent** les précédents : ils portent sur le binaire
corrigé. **Aucune explication a posteriori n'est proposée** — l'écart est du
même ordre que la dispersion entre exécutions, et rien dans les mesures ne
permet de trancher.

**`4,20 ms` est butée** par la synchronisation verticale à 4,1667 ms sur cet
écran 240 Hz : la mesure dit que le rendu **tient dans une image**, pas ce
qu'il coûte. **Aucune valeur de 4,20 ms ne peut être citée comme une
performance.**

## Ce que TASK-0016 ne prouve pas

- **`R8` n'est pas levée**, et ne peut pas l'être ici : **une** machine, écran
  **240 Hz**, **binaire de développement non optimisé**, fixtures **≤ 2 420
  nœuds**. Sa levée appartient à l'**étape C**.
- **`P-21` n'est pas satisfaite** : interface **en français seulement**, aucun
  audit WCAG complet, **aucun lecteur d'écran réel**.
- **Seize exigences de parité restent entières**, dont **toutes** les relations
  transversales. Six sont satisfaites **sur ce périmètre**, `P-12` et `P-06`
  sont **partielles** et déclarées telles.
- **Trois défauts de protocole** ont été trouvés en essayant de mesurer —
  fenêtre occultée, carte de 1 × 1 pixel, remise en page pendant la course.
  Chacun aurait produit un chiffre flatteur; tous sont publiés avec ce qu'ils
  auraient produit. **Aucune mesure n'existait avant leur correction.**
- **`B0` s'est reproduit trois fois et n'est pas corrigé.** Rien n'a été
  supprimé, nettoyé ni renommé dans `src-tauri/target/` — `DEC-0013` E.

## Ce qui n'a pas changé

- **Aucun budget n'est adopté**, ni abandonné, ni validé. La borne `B-1` de
  5 000 nœuds est un **plafond déclaré** qui ne s'ajuste à rien. **Aucun
  contrôleur de spike n'est devenu du code de production** — `DEC-0015` F.
- **Aucune réserve n'est levée.** `V1` à `V4`, `W1` à `W4`, `R2` à `R9` restent
  en vigueur; `R1` reste levée depuis `ACTION-0023`.
- **Canvas 2D et WebGL restent fermés.** Le rendu est **HTML/SVG accessible**.
- **Aucune dépendance nouvelle.**
- **Aucune donnée réelle, aucun sélecteur de dossier utilisateur.** Les quatre
  fixtures sont **engendrées** à partir de graines fixes.
- **Aucun chemin local personnel dans le dépôt** : le bac à sable est **nommé**
  — `<dépôt>/.filetopo-sandbox` — et jamais épelé, artefacts compris.
- **L'inter-volume de `B3` reste NON TESTÉ**, la **question 3 de `B4` reste
  ouverte**.
- **`PROJECT_VISION.md` est inchangé.**

## La référence produit, rappel

1. **CarteTopo est la RÉFÉRENCE FONCTIONNELLE.** L'ancienne version publique de
   FileTopo est un **prototype et un audit technique**, jamais la référence
   produit.
2. **L'apparence est entièrement libre** et peut être **entièrement
   modernisée**. **Aucune copie pixel pour pixel n'est demandée.**
3. **Aucune amélioration visuelle ne supprime la parité fonctionnelle.** En cas
   de conflit, **la parité gagne**.
4. **`F-013`, `F-017`, `F-018`, `F-019` restent `MVP`.** Répartition : `MVP`
   35, `ULTÉRIEUR` 0, `DIFFÉRÉ` 4, sur 39 lignes.
5. **IA, OCR, extraction, RAG et GraphRAG restent `DIFFÉRÉ`.** `DEC-0012`
   inchangée; **aucune exigence de parité ne peut être satisfaite au moyen de
   l'une de ces couches**.

### La correction normative X1

Une **suggestion n'est pas une provenance de relation**. Une **relation
établie** a pour provenance **`déterministe`** ou **`approuvée`**, sans
troisième valeur. Une suggestion est un **objet et un état distincts** —
affichable, mais **jamais** présentée comme relation établie ni comptée dans
les relations entrantes ou sortantes. L'approbation la **transforme** en
relation `approuvée`, seule voie.

**Portée immédiate nulle :** `TASK-0016` ne contient aucune relation
transversale. `X1` contraint la tranche qui implémentera `P-04`, `P-05`, `P-07`.

## Feuille de route courante

| Étape | Objet | État |
|---|---|---|
| **A** | **Parité fonctionnelle MVP** | **EN COURS** — première tranche `TASK-0016` livrée, `IMPLEMENTED`; **seize exigences restent entières** |
| **B** | Finition visuelle moderne | PROPOSED — **ne commence pas** avant que **A** soit contrôlée |
| **C** | Validation Windows/WebView2 réelle. **`R8` ne peut être levée qu'ici** | PROPOSED |
| **D** | Empaquetage et publication — **réservé à Sébastien** | PROPOSED |

## Porte humaine

`TASK-0016` reste **`IMPLEMENTED`**. Le contrôle indépendant `ACTION-0026` a
rendu **`CHANGES_REQUIRED`** sur la réserve bloquante `X2`; **la correction a
été exécutée par l'exécuteur de la tranche**, ce qui ne la vérifie pas.

L'action unique suivante est le **RE-CONTRÔLE indépendant de `TASK-0016`**, par
une instance **distincte de son exécuteur**.

**Aucune tranche suivante ne s'ouvre avant ce re-contrôle.**
