# ACTION-0043 — Contrôle indépendant de TASK-0026 : CLOSED, TASK-0026 VERIFIED

- **Date :** 2026-09-06
- **Objet :** enregistrement du contrôle indépendant de `TASK-0026` et
  scellement de ses deux preuves canoniques `ED15`
- **Contrôleur :** **orchestrateur technique indépendant**, instance distincte
  de l'exécuteur de `TASK-0026`
- **Exécuteur de TASK-0026 :** Codex
- **Rédacteur :** Claude Code. **Ce document ENREGISTRE le verdict externe
  rendu par l'orchestrateur technique indépendant.** Claude Code n'est pas
  l'exécuteur de `TASK-0026`, ne rend pas ce verdict et ne s'attribue pas
  `VERIFIED`; Codex ne se l'est pas attribué non plus. Claude Code n'intervient
  ici que comme rédacteur de l'enregistrement, de l'hygiène documentaire `X5`
  et du scellement.
- **HEAD re-contrôlé avant verdict :**
  `b7c94d45dab52a70faa4220a131830c11c54bc19`
- **Commit substantif/preuve final de l'exécuteur :**
  `b40e1ceb568acad77982738c6634fd810d4d7662`
- **Gel documentaire antérieur au code :**
  `7202e8005d61b25f3171eef65dad64c9c0603080`
- **`main` :** `91bbe90f0f99026c28cd345784d4f579a0016db2` localement, hors de
  cette branche et non touchée par cette tranche. Voir §8 pour l'écart observé
  sur `origin/main`.

## 1. Verdict externe enregistré

| Élément | Verdict |
|---|---|
| `ED1` à `ED15` | **`PASS`** |
| `ACTION-0043` | **`CLOSED`** |
| `TASK-0026` | **`VERIFIED`** |
| `DEC-0028` | implémentation validée par `TASK-0026 / ACTION-0043` |
| Réserve fonctionnelle bloquante | aucune |
| Réserve corrective ouverte | aucune |

`F-046` reste **`PROPOSED`** : l'exploration exacte à l'échelle est désormais
vérifiée, mais l'identité physique persistante reste absente. `DEC-0013/F`
demeure bloquante pour cette identité physique. La garantie race-safe `X10`
hors Windows reste non prouvée.

Aucune identité physique, aucun `FileId`, aucun cache digest taille + mtime,
aucune IA, aucun RAG, aucune vector DB, aucune extraction de contenu et aucune
donnée réelle n'entrent dans cette tranche.

## 2. Historique contrôlé

| Étape | Commit |
|---|---|
| Base d'orchestration initiale | `a6918130202dc164684ed37c969efc90efd8b159` |
| Gel documentaire avant code | `7202e8005d61b25f3171eef65dad64c9c0603080` |
| Migration runtime sous `TASK-0026` avant les replays | `9e775024c4889260d668677ed8bca93d812641a1` |
| Backend borné | `7517a592b4c9b7e533a1d22131e5e42ddb71cc73` |
| UI explorateur | `7efbdabc51a79bb71694784fdfb074d17671bc22` |
| Reprise finale orchestrée depuis | `c92fe90d013f889d7cfb6154c3c9ace4dac728ce` |
| Handoff final de l'exécuteur | `b7c94d45dab52a70faa4220a131830c11c54bc19` |

L'ordre des preuves est celui-ci : le gel documentaire précède le code, la
migration des destinations sous `TASK-0026` précède tout replay, `ED15` final
est rejoué **après** le dernier durcissement du harnais de frappes réelles,
puis `EC15`, `DR15` et `SR15` sont rejoués sous noms `TASK-0026`.

## 3. Points fonctionnels contrôlés

Enregistrés tels que rendus par l'orchestrateur technique indépendant :

- le store de contenu est ouvert en **lecture seule** pour les requêtes
  d'exploration; une lecture sur store absent retourne l'indisponibilité et
  **ne crée pas** `content.sqlite`;
- la source est la **génération courante**, filtrée explicitement par
  `generation_id`;
- seules les observations `HASHED`, en `sha256-v1`, au digest valide —
  longueur 64, minuscules, hexadécimal strict — participent;
- une incohérence de taille pour un même digest est **rejetée**; la taille
  n'établit jamais le groupe, elle ordonne seulement;
- les groupes viennent d'une agrégation SQLite avec `LIMIT/OFFSET`, limite
  maximale **100** (`MAX_EXACT_DUPLICATE_PAGE_LIMIT`);
- les membres viennent d'une **requête séparée** SQLite,
  `ORDER BY relative_path ASC LIMIT/OFFSET`, même limite maximale 100;
- l'ordre des groupes est `size_bytes DESC, hash_hex ASC`;
- le groupe vide est visible comme **fait exact**, sans relation, sans
  suggestion et sans gain garanti;
- l'interface utilise des boutons natifs, affiche le digest complet, la date et
  la génération, pagine groupes et membres, et signale honnêtement un membre
  non résolu;
- le texte canonique est « **Contenu binaire identique observé** », assorti de
  la limite disant que cela ne prouve **ni** le même fichier physique **ni**
  une copie;
- l'isolation par `brain_id` est stricte;
- la consultation ne mute aucun store relationnel, intra ni inter;
- **aucune identité physique persistante** n'est ajoutée.

## 4. ED15 final contrôlé

Les **deux** preuves propres à la nouvelle capacité sont :

1. `TASK-0026-ED15-exact-duplicate-explorer-webview2-pass1.json`
2. `TASK-0026-ED15-exact-duplicate-explorer-webview2-pass2.json`

### Pass 1 — final, capturé après les correctifs du harnais

- vrai hôte Windows/WebView2 `152.0.4191.66`, Tauri `2.11.5`,
  SQLite `3.53.2`;
- variante synthétique **fraîche**;
- **1 200** fichiers, **1 200** `HASHED`, **1 200** ouvertures pour hachage et
  **1 200** digests calculés, `unreadable`/`unstable`/`unsupported` à zéro;
- **125** groupes, **373** occurrences groupées, **1** groupe vide;
- pagination groupes sur plusieurs pages — `50 / 50 / 25` — et limite backend
  ramenée à 100 lorsqu'une limite supérieure est demandée;
- groupe de **125** membres, donc supérieur à 100, et pagination membres
  `50 / 50 / 25`;
- activation clavier fiable : `keydownIsTrusted = true`,
  `activationIsTrusted = true`, `programmaticClickCalls = 0` et
  `programmaticClickDispatches = 0`;
- seconde campagne **explicite inchangée** : les 1 200 fichiers sont réellement
  rouverts et rehachés, `indexedFileCount = hashedCount = 1200`;
- empreinte de source identique avant et après,
  `sha256-tree-v1:91072ea9…a19c`, `sourceStable = true`;
- stores relationnels inchangés; Beta et Gamma non fusionnés;
- avant scellement : `protectedArtifactCount = 34`,
  `protectedDestinations = []`, `owningTaskId = TASK-0026`,
  `writesUnderItsOwnTaskOnly = true`;
- `noSizeMtimeCache = true`;
- digest affiché sur **64** caractères, texte de frontière conforme.

### Pass 2 — final

- vrai **nouveau processus** sur la même variante;
- vrai **rebuild** de la carte, `readOnlyConfirmed = true`, empreinte de carte
  identique avant et après;
- **125** groupes et **373** occurrences persistés avant toute nouvelle
  campagne;
- ordre de pages stable au rechargement et sur pages répétées;
- membres devenus **non résolus** après rebuild signalés, **sans effacement**;
- groupe vide persistant, **125** membres;
- vraies activations clavier, zéro clic programmatique;
- stores relationnels inchangés;
- la nouvelle campagne lit encore les **1 200** fichiers, même empreinte de
  source, `sourceUnchanged = true`.

## 5. Régressions contrôlées, non canoniques

Les six replays suivants sont verts et utiles au contrôle, mais **ne
rejoignent pas `X5`** et ne sont pas protégés :

- `TASK-0026-EC15-exact-content-observations-webview2-pass1.json`
- `TASK-0026-EC15-exact-content-observations-webview2-pass2.json`
- `TASK-0026-DR15-deterministic-relation-engine-webview2-pass1.json`
- `TASK-0026-DR15-deterministic-relation-engine-webview2-pass2.json`
- `TASK-0026-SR15-suggestion-review-memory-webview2-pass1.json`
- `TASK-0026-SR15-suggestion-review-memory-webview2-pass2.json`

`DR15` conserve notamment `dre-v1`, **deux** relations `content-identical` pour
trois contenus non vides identiques, le **skip du groupe vide**, une
approbation persistée et idempotente, et une source en lecture seule. `SR15`
conserve la mémoire `approved` / `rejected` après un vrai redémarrage et un
rerun.

## 6. Validations rapportées, cohérentes avec les artefacts

| Validation | Résultat |
|---|---|
| Rust exact duplicate | **3/3** |
| Moteur de règles | **14/14** |
| Suite Rust | **227/227** |
| TypeScript ciblé | **42/42** |
| Suite TypeScript | **241/241** |
| `pnpm check` | **PASS** |
| `pnpm build` | **PASS** |
| Tauri debug `--no-bundle` | **PASS** |
| `git diff --check` | **PASS** |
| `X5` avant scellement | **34/34** historiques refusés, aucune destination `TASK-0026` protégée |

## 7. Scellement X5 — 34 → 36

Exactement deux preuves rejoignent `X5`, dans cet ordre, **après** les 34 noms
historiques conservés bit-pour-bit et dans le même ordre :

1. `TASK-0026-ED15-exact-duplicate-explorer-webview2-pass1.json`
2. `TASK-0026-ED15-exact-duplicate-explorer-webview2-pass2.json`

Aucun `EC15`, `DR15` ni `SR15` de `TASK-0026` n'est ajouté. Les gardes Rust,
TypeScript et PowerShell portent les mêmes 36 noms dans le même ordre. Aucun
JSON de preuve n'est modifié, renommé, supprimé ni régénéré.

Après scellement :

```text
protectedArtifactCount      = 36
SEALED_RUNTIME_DESTINATIONS = [ED15 pass1, ED15 pass2]
protectedDestinations       = [ED15 pass1, ED15 pass2]
owningTaskId                = TASK-0026
writesUnderItsOwnTaskOnly   = false
```

`writesUnderItsOwnTaskOnly = false` est l'**état attendu** d'un runtime dont
les preuves propres viennent d'être scellées : le champ rapporte l'état réel du
checkout, il n'est pas un indicateur de santé à garder vert. Rejouer `ED15`
depuis ce checkout donne désormais un **refus**, ce qui est la porte qui
fonctionne. Le runtime n'est migré vers aucune `TASK-0027`, qui n'est pas
créée.

### Hygiène documentaire accompagnant le scellement

Le contrôle a relevé un **écart documentaire non fonctionnel** : des
commentaires `X5` de `src-tauri/src/map/commands.rs` et de
`src/map/runArtifacts.ts` décrivaient encore l'état post-`ACTION-0042`, comme si
le runtime courant écrivait des destinations `TASK-0025` protégées. C'était faux
pour ce checkout : les destinations avaient déjà toutes été migrées sous
`TASK-0026`. Ces commentaires sont corrigés ici pour dire l'état réel après
scellement. **Aucune API, aucun algorithme, aucune règle, aucun scénario et
aucun comportement produit ne changent** pour cette correction.

### Défaut découvert pendant le scellement, et réparé

Le typage a refusé le scellement, et à juste titre. Quatre scénarios d'écriture
— `dreScenario.ts`, `exactDuplicateScenario.ts`, `genericRelationScenario.ts`
et `reviewScenario.ts` — vérifiaient **avant d'écrire** :

```ts
requireFact(PROTECTED_RUN_ARTIFACTS.length === 34, "X5 n'est plus exactement 34");
requireFact(ownership.protectedDestinations.length === 0, "destination runtime protégée");
requireFact(ownership.writesUnderItsOwnTaskOnly, "runtime hors TASK-0026");
```

Les trois conditions ne sont vraies **qu'entre deux scellements**. Portées à
36, elles deviennent fausses toutes les trois, et les quatre scénarios
auraient avorté — y compris les six replays `EC15`, `DR15`, `SR15` et le
correctif `X11` que `ACTION-0043` doit précisément **laisser rejouables**.

C'est exactement le défaut de la réserve `X8`, sous forme numérique : un compte
recopié dans une source d'écriture pourrit au scellement suivant. La condition
qui, elle, ne pourrit pas est celle qui porte sur **le nom que le scénario
s'apprête à écrire** :

```ts
const destination = dr15Artifact(deps.pass);
requireFact(ownership.owningTaskId === "TASK-0026", "propriétaire runtime inattendu");
requireFact(
  !(PROTECTED_RUN_ARTIFACTS as readonly string[]).includes(destination),
  `destination protégée par X5: ${destination}`,
);
```

Un scénario refuse alors **exactement** quand sa propre destination est une
preuve canonique. `ED15` refuse, les six replays passent, et un scellement
futur change qui refuse sans que personne n'édite un nombre. Deux tests `X5`
nouveaux tiennent la réparation : aucune source d'écriture ne compare
`PROTECTED_RUN_ARTIFACTS.length` à un littéral, et les quatre scénarios qui
contrôlent avant d'écrire contrôlent bien par le nom.

Le compte reste **rapporté** dans chaque preuve, dérivé de la liste — c'est un
fait à enregistrer, jamais une précondition d'écriture.

## 8. Écart observé, hors périmètre de cette tranche

`main` **locale** est restée `91bbe90f0f99026c28cd345784d4f579a0016db2`, comme
attendu. `origin/main` porte en revanche un commit supplémentaire,
`1a7d652ca48281c1687f6d1404c56a1404df91d8` — « docs: update canonical GitHub
identity », signé **Sébastien Dubé**, daté du 2026-09-06 18:16 −0400.

Ce commit est **antérieur et extérieur** à cette fermeture, n'appartient pas à
`build/v0.2-a10-exact-duplicate-explorer` et n'est pas le fait d'un agent :
c'est une action du propriétaire du dépôt. Il est enregistré ici par exactitude,
sans être touché. `ACTION-0043` ne publie rien vers `main`.

## 9. Contrôles de fermeture

| Contrôle | Résultat |
|---|---|
| `runArtifacts.test.ts` | **44/44 PASS** |
| Tests Rust ciblés `map::commands::tests::` | **26/26 PASS**, 203 filtrés |
| Suite Rust complète | **229/229 PASS** |
| Suite TypeScript complète | **246/246 PASS** |
| `pnpm check` — `tsc --noEmit` | **PASS** |
| Garde PowerShell | **36 refus**, **36 noms uniques**, six replays `TASK-0026` toujours autorisés |
| Parité Rust / TypeScript / PowerShell | **PASS** — 36 noms identiques, même ordre |
| `git diff --check` | **PASS** |
| Chemins sous `docs/performance/runs/` modifiés | **aucun** |

La suite Rust passe de 227 à **229** et la suite TypeScript de 241 à **246** :
les tests ajoutés sont ceux qui démontrent le scellement et tiennent la
réparation décrite en §7. Aucun test existant n'a été supprimé ni affaibli.

Les deux suites complètes et `pnpm check` ont été exécutés parce que la
réparation du §7 touche quatre scénarios d'écriture, ce que les seules gardes
`X5` n'auraient pas couvert. **Aucun replay WebView2**, aucune campagne `ED15`,
`EC15`, `DR15` ni `SR15` n'est rejoué, et aucun build Tauri n'est refait.

**Non testé :** le refus effectif d'une écriture `ED15` par le harnais réel en
hôte WebView2 n'est pas rejoué; il est démontré par les tests Rust et
TypeScript de la garde, qui exercent le refus avant tout accès disque, et non
par une campagne.

## 10. État et action suivante

`ACTION-0043 = CLOSED`, `TASK-0026 = VERIFIED`, `ED1–ED15 = PASS`, sans réserve
fonctionnelle corrective ouverte. L'action suivante unique est de rendre la
main à l'orchestrateur pour définir la prochaine tranche après
`TASK-0026 VERIFIED`. Ni `TASK-0027` ni `DEC-0029` ne sont créées.
