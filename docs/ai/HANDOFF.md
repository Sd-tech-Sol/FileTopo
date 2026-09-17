# HANDOFF.md — Passation

**Date :** 2026-09-17
**De :** OpenAI Codex, livraison distante autorisée de `TASK-0010`
**Vers :** propriétaire pour revue de la PR et GO de merge

## État livré

- Branche locale : `audit/public-release`, basée sur `main` au commit
  `1a7d652ca48281c1687f6d1404c56a1404df91d8`.
- `TASK-0010` : `IMPLEMENTED`, non `VERIFIED`.
- GO final reçu pour un commit unique, le push de la branche et l'ouverture
  d'une PR vers `main`; aucun merge autorisé.
- Aucune réécriture historique, suppression de référence, modification de tag
  ou d'ancienne branche.

## Changements préparés

- Les URL, le compte et le chemin de dépôt courants utilisent `Sd-tech-Sol`.
- L'identifiant Tauri est `io.github.sd-tech-sol.filetopo`.
- Tauri inclut l'identifiant dans `app_data_dir()` : les index de
  développement antérieurs ne sont pas retrouvés automatiquement. Aucune
  migration implicite n'est ajoutée; les index restent reconstructibles et les
  dossiers analysés ne sont jamais modifiés.
- `graph/history.jsonl` conserve deux mentions historiques conformément à sa
  règle d'ajout seul.
- Aucun exemple de profil Windows à normaliser n'existait dans le contenu de
  `main`.

## Preuves réussies

- `pnpm check`;
- `pnpm test` : 36/36;
- `pnpm build`;
- `cargo fmt --check`;
- `cargo clippy --all-targets -- -D warnings`;
- `cargo test` : 13/13;
- `pnpm tauri build --debug --no-bundle`;
- audit public : 121 fichiers, 0 motif sensible, 0 fichier supérieur à 5 Mio.
- liens Markdown relatifs : 52 fichiers, 58 liens vérifiés, 0 cassé.

Le warning local `linker_messages` contient le chemin du clone dans la sortie
MSVC. Il était déjà connu et documenté; aucun journal de build ne doit être
publié.

## Action suivante unique

`ACTION-0016` : le propriétaire examine la PR. Attendre un nouveau GO explicite
avant tout merge dans `main`.

## Règles à ne pas relâcher

- Ne versionner aucun secret, chemin personnel ou donnée réelle.
- Tests exclusivement synthétiques ou temporaires.
- Aucun `git-filter-repo`, force-push ou changement de visibilité.
- Ne modifier aucune ancienne branche ni aucun tag.
- Tout artefact destiné à sortir de la machine passe
  `scripts/scan-binary-for-personal-paths.ps1`, y compris après signature, qui
  réécrit le fichier.
- Ne pas coller un journal de construction brut dans une issue publique : il
  contient le chemin de compilation, contrairement à l'artefact.
- Le nom du propriétaire reste pour la paternité, la licence, la maintenance et
  les métadonnées; les mentions opérationnelles disent « le propriétaire ».
- Un seul exécuteur modifie le dépôt à la fois.
