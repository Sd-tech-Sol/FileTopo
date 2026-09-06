# FileTopo

*Read this in [English](README.md).*

**FileTopo transforme une arborescence de fichiers en carte topographique
locale.** Le projet cible Windows, fonctionne hors ligne et ne traite que les
métadonnées nécessaires : le scanner n'ouvre jamais le contenu des documents et
ne modifie jamais les dossiers analysés.

> ## Statut : alpha — jamais publié
>
> FileTopo est en version **0.1.0-alpha.1**. Aucune release n'existe, aucun
> binaire n'est distribué, aucun installateur n'est signé.
>
> Le code fonctionne et est vérifié localement sur Windows, mais il n'a été
> utilisé par **personne d'autre que son auteur**, sur des données
> **synthétiques uniquement**. Attendez-vous à des défauts, à des changements
> incompatibles et à des fonctions absentes. N'en faites pas dépendre un
> travail important.

## Auteur

FileTopo est une **création originale de Sébastien Dubé**, imaginée et dirigée
à partir de zéro. Le projet ne dérive d'aucun autre logiciel : ses seuls emprunts
sont les composants open source listés dans
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

- Auteur et mainteneur : **Sébastien Dubé** — <https://github.com/Sd-tech-Sol>
- Licence : [MIT](LICENSE) — © 2026 Sébastien Dubé
- Conception, architecture et décisions : voir [`docs/decisions/`](docs/decisions/)
  et [`PROJECT_VISION.md`](PROJECT_VISION.md)

## Ce que FileTopo fait

- Plusieurs **collections** locales indépendantes, chacune avec nom, couleur et
  icône.
- Vous choisissez un dossier par le sélecteur natif, puis l'indexation ne
  démarre que sur une action **explicite**, avec progression et annulation.
- Scan de **métadonnées seulement** : noms, chemins relatifs, type, taille,
  dates et attributs utiles.
- Carte topographique PixiJS/WebGL avec relief SVG de secours et niveau de
  détail progressif.
- Liste DOM accessible, synchronisée avec la sélection sur la carte.
- Recherche texte, filtres par type, état vu/non vu et pagination.
- Ouverture explicite et confinée d'un élément dans l'Explorateur Windows.
- Interface bilingue, français et anglais.

## Ce que FileTopo ne fait pas

Ces absences sont des **choix de conception**, pas des fonctions à venir :

- il **n'écrit rien** dans un dossier analysé — aucune création, aucun
  renommage, aucun déplacement, aucune suppression;
- il **ne lit pas** le contenu de vos documents;
- il **ne suit pas** les liens symboliques, jonctions et points de réanalyse;
- il **ne télécharge pas** les fichiers « en ligne seulement » : il les détecte
  par leurs attributs et les laisse dans le nuage;
- il n'a **aucun réseau, aucune télémétrie, aucune IA, aucun compte et aucune
  mise à jour automatique**.

## Langue

L'interface suit la langue de votre système ou de votre navigateur : toute
locale `fr` obtient le français, toute autre locale obtient l'anglais, et
l'anglais sert de repli quand la langue ne peut pas être déterminée. Le bouton
FR/EN permet de passer outre à tout moment, et votre choix explicite est
mémorisé d'une session à l'autre.

## Limites exactes de la version 0.1.0-alpha.1

| Limite | Précision |
|---|---|
| Plateforme | Windows 10 et 11 seulement. macOS et Linux ne sont ni construits ni testés. |
| Indexation | Reconstruction complète. Aucune surveillance incrémentale des changements. |
| Volume mesuré | Mesures reproductibles jusqu'à **100 000 éléments**. Le million d'éléments est un objectif d'architecture **non mesuré**. |
| Chiffrement | L'index n'est pas chiffré par l'application. Il dépend des protections du compte Windows et du disque. |
| Effacement | Aucune commande intégrée n'efface les données de l'application; cela passe par les outils du système. |
| Distribution | L'installateur local n'est **pas signé**. Windows affichera un avertissement SmartScreen. |
| Usage réel | Exercé uniquement sur fixtures synthétiques et répertoires temporaires, par une seule personne. |
| Nom | **FileTopo** est un nom de travail réversible. Aucune recherche de marque exhaustive n'a été conduite; aucun domaine ni compte n'a été réservé. |
| Accessibilité | Liste DOM accessible fournie et inspectée visuellement, mais **non auditée** par un outil ou une personne spécialisée. |

Les limites sont maintenues à jour dans [CHANGELOG.md](CHANGELOG.md).

## Sécurité et confidentialité

- Aucune permission Tauri de système de fichiers, de shell, de SQL ou de réseau
  n'est exposée à la couche web : la capacité par défaut se limite à
  `core:default`.
- Politique de sécurité de contenu restrictive, sans source distante.
- L'interface ne reçoit **jamais** le chemin absolu d'une racine analysée; les
  commandes utilisent des identifiants de collection et de nœud.
- Les index SQLite sont écrits dans le dossier de données local de
  l'application, **hors** des dossiers analysés, et sont reconstructibles.
- Les données présentes dans ce dépôt sont strictement synthétiques.

Détails : [SECURITY.md](SECURITY.md), [PRIVACY.md](PRIVACY.md) et le
[modèle de menace](docs/security/threat-model.md).

## Prérequis de développement

- Windows 10 ou 11 avec WebView2;
- Node.js 24 et pnpm 10;
- Rust stable avec la cible MSVC (vérifié avec Rust 1.98.0);
- Visual Studio Build Tools 2022, outils C++ et SDK Windows.

## Installation et vérification

```powershell
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build
```

Dans une console de développement Visual Studio où Rust est dans `PATH` :

```powershell
$env:CARGO_INCREMENTAL = "0"
cargo fmt --manifest-path src-tauri/Cargo.toml --all -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml
```

La désactivation du cache incrémental contourne un défaut de cache observé avec
Rust 1.98 sur la machine de développement; elle ne change pas le code produit.
Cette même chaîne est exécutée en intégration continue sur Windows — voir
[`.github/workflows/ci.yml`](.github/workflows/ci.yml).

### Construire une release

Utilisez le script dédié plutôt que `pnpm tauri build` directement :

```powershell
pwsh -File scripts/build-release-clean.ps1
```

Il remappe les chemins de la machine de compilation hors du binaire, puis scanne
l'artefact à la recherche de chemins personnels. Voir [SECURITY.md](SECURITY.md)
pour la raison.

## Développement local

```powershell
pnpm tauri dev
```

Le bouton **Démonstration** utilise un générateur déterministe. Le bouton
**Fixture synthétique** exécute le pipeline réel scanner → SQLite → DTO sur
`tests/fixtures_synthetic/demo`; il n'apparaît que dans les constructions de
développement. Aucun test ne doit jamais pointer vers un dossier utilisateur.

Guides d'utilisation : [français](docs/user-guide-fr.md) ·
[anglais](docs/user-guide-en.md).

## Mesures

Les mesures MVP reproductibles à 10 000 et 100 000 éléments sont consignées dans
[`docs/performance/phase-4-mvp-measurements.md`](docs/performance/phase-4-mvp-measurements.md).
Les budgets et la stratégie vers un million d'éléments — **non atteints à ce
jour** — se trouvent dans
[`docs/performance/phase-2-budgets.md`](docs/performance/phase-2-budgets.md).

## Contribuer

Lisez [CONTRIBUTING.md](CONTRIBUTING.md) et le
[code de conduite](CODE_OF_CONDUCT.md). Une règle prime sur toutes les autres :
**aucune contribution ne doit contenir de données personnelles réelles**, ni les
vôtres, ni celles d'autrui.

Les issues et demandes de fusion peuvent être rédigées en anglais ou en
français.

## Développement assisté par IA

FileTopo est un projet original de Sébastien Dubé — l'idée, la vision produit,
les exigences, les priorités, ainsi que toutes les approbations et décisions
finales, lui appartiennent. Le développement a été assisté par IA : le projet a
été orchestré avec l'application de bureau OpenAI Codex, et OpenAI Codex ainsi
qu'Anthropic Claude Code ont servi à l'implémentation, aux tests, aux audits, à
la documentation et aux revues, sous sa direction et sa relecture. Aucun outil
d'IA n'est auteur, propriétaire ou mainteneur de ce projet, et leur utilisation
n'implique aucune affiliation avec OpenAI ou Anthropic, ni aucune approbation
de leur part. La responsabilité et la maintenance finales reviennent à
Sébastien Dubé. Voir [AI_ASSISTANCE.md](AI_ASSISTANCE.md) pour la divulgation
complète, qui renvoie aux décisions, tâches, tests et revues versionnés plutôt
qu'à des notes de travail privées.

## Organisation du dépôt

La documentation publique est en anglais. Les notes de travail internes du
projet, sous [`docs/ai/`](docs/ai/), restent en français, tout comme la mémoire
de travail dans [`graph/`](graph/); elles consignent la façon dont le projet a
été construit et ne sont pas nécessaires pour utiliser FileTopo ou y
contribuer.
