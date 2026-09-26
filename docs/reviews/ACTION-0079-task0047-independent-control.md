# ACTION-0079 — Contrôle indépendant TASK-0047 / fermeture F-036 et P-21

- **Date :** 2026-09-26
- **Statut :** `CLOSED / VERIFIED`
- **Branche contrôlée :** `build/v0.2-a31-v1-accessibility-closure`
- **HEAD contrôlé :** `5d6a88036eac0a6b23564c677021e868b91d5cb4`
- **Commit produit :** `ec22b07`
- **Base d'orchestration :** `29170ec2cc2ad20042696810981f9cb5a4583f04`

## Verdict

**TASK-0047 = VERIFIED. F-036 = VERIFIED dans sa portée.**

Par composition avec **ACTION-0077** (FR/EN), **P-21 = CLOSED / VERIFIED**.

`P-19` reste **PARTIELLE** et n'est pas fermé par cette action.

## Contrôle indépendant

Le contrôle a relu le diff depuis le HEAD d'orchestration, le code produit,
les gardes de tests et les deux artefacts WebView2. Il ne reprend pas le
RESULT comme verdict.

### 1. Frontière de changement

Le diff produit est limité au frontend et au harnais :

- `MapView.tsx`;
- `CompositionBar.tsx`;
- `MapApp.tsx` (activation du hook de restauration de focus);
- `focusRestore.ts`;
- `map.css`;
- tests/harness/artefacts;
- `axe-core@4.13.0` dev-only.

`src-tauri/src/lib.rs` et `src-tauri/Cargo.toml` ont les mêmes blobs que la
base : aucun backend Rust, aucune commande, aucune migration ou préférence
n'a été ajoutée.

### 2. Baseline et état final

Les artefacts sont cohérents et comparables :

- même matrice : **36 cellules** (9 états × FR/EN × clair/sombre);
- baseline : **16 violations axe**, **212 problèmes** enregistrés;
- final : **0 violation axe**, **0 problème**;
- les règles baseline correspondent aux causes corrigées
  (`aria-valid-attr-value`, `aria-required-children`) et les problèmes
  complémentaires couvrent contraste, focus et clavier;
- source générée identique entre le point de référence du harnais et la fin de
  session; VIEW_BUDGET reste 512.

### 3. Résultats axe `incomplete`

Le final garde 40 occurrences `incomplete`, ce qui est normal pour des cas que
le moteur ne peut pas décider seul. Elles se regroupent en **74 cibles
distinctes**.

Le contrôle a vérifié l'inventaire final :

- **74 / 74 = PASS**;
- aucun FAIL;
- chaque entrée publie le rule id, la cible, la raison axe et une preuve DOM ou
  une mesure de contraste;
- aucune règle axe n'est globalement désactivée.

Exemple : le `aria-controls` du menu est vérifié contre un élément existant de
rôle `menu`; les glyphes que axe ne classe pas comme texte sont mesurés avec
un seuil 3:1.

### 4. Clavier et focus

L'artefact final publie :

- **9 marches Tab/Shift+Tab**;
- **646 arrêts**;
- **0 problème**;
- **12 parcours fonctionnels**, **101 étapes**;
- **0 problème**;
- contraste minimal de l'indicateur de focus : **4,71:1**.

Les correctifs critiques sont présents dans le code :

- agrégat de carte devenu `treeitem`, avec Enter/Espace;
- agrégat recentré au focus via `ensureRectVisible`;
- focus rendu au tree après remplacement de projection;
- `aria-activedescendant` omis si la carte sélectionnée n'est pas dessinée;
- contour du canevas dessiné à l'intérieur de l'hôte qui clippe;
- restauration du focus après un contrôle temporairement `disabled`;
- retrait d'une pastille : focus vers une pastille restante.

### 5. Contraste, couleur et mouvement

Contrôle final publié :

- **6 420** éléments texte;
- **416** glyphes;
- **52** contrôles;
- **144** objets graphiques;
- **32** pseudo-éléments/placeholders;
- **0 échec**;
- plus faible ratio texte pertinent : **5,09:1** pour un seuil 4,5:1.

Les corrections CSS correspondent aux échecs du baseline : jetons de cartes
sombres, titre de territoire, racine claire, bordures de champs et placeholder.

Les **13 codages** inventoriés ont tous une alternative non colorée publiée
(mot, symbole, structure/ARIA, motif ou combinaison).

La sonde reduced-motion passe de 5 s / animation active à 0 s / none dans le
mode reduce, sans mouvement produit détecté.

### 6. Dépendance

`axe-core` est épinglé exactement à **4.13.0** dans les devDependencies et le
lockfile porte l'intégrité correspondante. Le package n'est pas une dépendance
runtime du produit.

La revalidation indépendante confirme le projet officiel Deque, MPL-2.0,
version 4.13.0 et 0 dépendance npm déclarée.

### 7. Confidentialité / source

- les racines sont générées par le harnais;
- aucune donnée personnelle n'est utilisée par la preuve;
- scan ciblé des nouveaux artefacts/scripts : aucun chemin utilisateur, courriel
  ou donnée privée détecté;
- le seul faux positif lexical trouvé était `forget` contenant les lettres
  « forge »; aucun mot `Forge` réel.

### 8. Preuves de l'exécuteur vs contrôle

Claude rapporte :

- TypeScript **618 PASS**;
- Rust **753 PASS**, 6 ignorés;
- check/build/Tauri debug PASS;
- Clippy 13/22 = dette historique;
- audit public PASS;
- six sabotages réels attrapés.

Aucun workflow GitHub Actions ni statut CI n'est attaché au HEAD. Ces chiffres
restent donc des **preuves de l'exécuteur**. Le verdict indépendant repose sur
le code, les gardes et les artefacts publiés, qui ont été recoupés séparément.

## Limites acceptées

Les limites documentées restent réelles :

- pas de lecteur d'écran réel;
- pas de zoom/reflow;
- quelques contrôles absents des données synthétiques non exercés par touches
  réelles;
- clavier via CDP;
- fermeture normale;
- aucune certification WCAG générale.

Elles n'invalident pas le contrat produit F-036/P-21 tel que défini par
DEC-0045.

## Décision

- `TASK-0047` : **VERIFIED**;
- `F-036` : **VERIFIED dans sa portée**;
- `P-21` : **CLOSED / VERIFIED**, par ACTION-0077 + ACTION-0079;
- `P-19` : **PARTIELLE**;
- prochaine action : auditer les écarts V1 restants et la FEATURE_MATRIX avant
  toute TASK-0048.
