# TASK-0010 — Corriger l'identité publique dans le contenu courant

- **Statut :** `IMPLEMENTED`
- **Ouverte le :** 2026-09-16
- **Livrée le :** 2026-09-17
- **Branche locale :** `audit/public-release`
- **Autorisation humaine :** correction du contenu courant de `main`, puis GO
  final du 2026-09-17 pour un commit, le push de la branche
  `audit/public-release` et l'ouverture d'une PR sans merge

## Objectif

Remplacer dans l'état courant du dépôt les références publiques obsolètes par
`Sd-tech-Sol`, vérifier le nouvel identifiant Tauri et documenter son impact
possible sur les données locales.

## Périmètre autorisé

- corriger les noms de compte, chemins de dépôt et URL GitHub courants;
- remplacer l'ancien identifiant Tauri par `io.github.sd-tech-sol.filetopo` si
  la configuration et les validations Tauri l'acceptent;
- normaliser tout exemple synthétique de profil Windows vers le compte fictif
  `ExampleUser` s'il en existe dans le contenu courant;
- mettre à jour la documentation et la mémoire durable concernées;
- exécuter les tests et contrôles pertinents;
- présenter le diff avant tout commit ou push.

## Interdictions

- aucune réécriture historique et aucun `git-filter-repo`;
- aucun force-push, aucune publication de `main` et aucune autre action
  distante que le push de `audit/public-release` et l'ouverture de sa PR;
- aucune modification d'une autre branche, d'un tag ou d'une visibilité;
- aucune suppression de référence;
- aucune donnée personnelle réelle dans les remplacements ou les tests.

## Fichiers visés

- fichiers courants contenant l'ancien compte ou l'ancien identifiant Tauri;
- documentation de sécurité, publication, validation et état courant;
- fichiers de mémoire exigés par `AGENTS.md`.

## Validations requises

1. Recherche exhaustive de l'ancien identifiant dans le working tree suivi.
2. Validation de la configuration Tauri et compilation pertinente.
3. Tests TypeScript et Rust applicables.
4. Vérification qu'aucune donnée personnelle n'est introduite.
5. Diff complet présenté au propriétaire.

## Critères d'acceptation

- aucune occurrence involontaire de l'ancien identifiant dans le contenu
  courant;
- toutes les URL GitHub courantes pointent vers `Sd-tech-Sol`;
- l'identifiant Tauri retenu passe les validations exécutées;
- l'impact de cet identifiant sur les données locales est documenté;
- aucun commit ni push avant le GO final du propriétaire.

## Rapport d'implémentation

### Identité publique

- Les références courantes au compte, au dépôt, à la release et au canal privé
  de sécurité pointent vers `Sd-tech-Sol`.
- L'identifiant Tauri est `io.github.sd-tech-sol.filetopo`.
- Deux lignes de `graph/history.jsonl` conservent volontairement le login
  historique : ce fichier est en ajout seul selon `AGENTS.md` et
  `docs/ai/OPERATING_MANUAL.md`.
- Aucun exemple de profil Windows à normaliser n'existait dans le contenu de
  `main`; les exemples signalés pendant l'audit appartiennent à d'anciennes
  branches non modifiées.

### Impact de l'identifiant Tauri

La [configuration Tauri](https://v2.tauri.app/reference/config/#identifier)
indique que l'identifiant sert notamment au bundle et au chemin des données
WebView. L'API officielle de
[`PathResolver::app_data_dir`](https://docs.rs/tauri/latest/tauri/path/struct.PathResolver.html#method.app_data_dir)
résout le chemin sous `data_dir/${bundle_identifier}`.

FileTopo ouvre `registry.sqlite` et les index de collections depuis
`app.path().app_data_dir()`. Le nouvel identifiant crée donc un nouvel
emplacement logique : les index de développement créés avec l'identifiant
antérieur ne sont pas importés automatiquement. Aucune migration implicite n'a
été ajoutée. Les index sont reconstructibles et les dossiers analysés restent
inchangés.

### Preuves exécutées

- `pnpm install --frozen-lockfile` : réussi.
- `pnpm check` : réussi.
- `pnpm test` : 36 tests réussis, 0 échec.
- `pnpm build` : réussi.
- `cargo fmt --manifest-path src-tauri/Cargo.toml --all -- --check` : réussi.
- `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings` : réussi.
- `cargo test --manifest-path src-tauri/Cargo.toml` : 13 tests réussis,
  0 échec.
- `pnpm tauri build --debug --no-bundle` : réussi; configuration acceptée et
  exécutable de développement construit.
- `scripts/audit-public-readiness.ps1 -AllowRemotes` : 121 fichiers,
  0 motif sensible, 0 fichier supérieur à 5 Mio.
- Liens Markdown relatifs : 52 fichiers, 58 liens vérifiés, 0 lien cassé.

Le warning `linker_messages` observé contient uniquement le chemin du clone
dans la sortie locale du linker. Il est déjà documenté dans `SECURITY.md`; ce
journal n'est pas destiné à être publié.

### État de livraison

La tâche est `IMPLEMENTED`, non `VERIFIED`. Le propriétaire a examiné le diff
et donné le GO final le 2026-09-17 pour un commit unique, le push de la branche
`audit/public-release` et l'ouverture d'une PR vers `main`. Le merge reste
interdit sans un nouveau GO humain. Aucune réécriture historique n'est prévue.
