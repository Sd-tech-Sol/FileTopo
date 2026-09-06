# HANDOFF.md — Passation

**Date :** 2026-08-26
**De :** orchestrateur, clôture de `TASK-0009`
**Vers :** prochaine session de maintenance

## État livré

- `TASK-0001` à `TASK-0009` : `VERIFIED`.
- Phases 0 à 6 : `VERIFIED`; phase 7 : `DEFERRED`.
- Dépôt public : `https://github.com/Sd-tech-Sol/FileTopo`.
- Prerelease source seulement : `v0.1.0-alpha.1`, zéro actif joint.
- CI Windows finale verte; signalement privé, analyse de secrets et blocage au
  push actifs. Aucun binaire n'est distribué.

## Ce qui a changé depuis la dernière passation

- Documentation publique en **anglais**, avec `README.fr.md` complet et
  équivalent. `docs/ai/**`, `graph/**`, `AGENTS.md`, `CLAUDE.md` et la
  checklist restent en français.
- L'application détecte la langue système : français pour une locale `fr`,
  anglais sinon, anglais en repli. Le bouton FR/EN est conservé et le choix
  explicite est mémorisé sous la clé `filetopo.locale`.
- La **fuite de chemins de compilation est corrigée** et vérifiée sur
  l'artefact : 336 occurrences → 0. Les empreintes SHA-256 de
  `docs/releases/0.1.0-alpha.1.md` sont vérifiées; les empreintes antérieures
  sont périmées et leurs artefacts ne doivent pas être distribués.
- Deux scripts ajoutés : `scripts/build-release-clean.ps1` et
  `scripts/scan-binary-for-personal-paths.ps1`.
- Tests : 4 → **36** côté interface, 11 → **13** côté Rust.

## Ce qui attend l'orchestrateur

Rien d'immédiat. Observer l'alpha et n'ouvrir une tâche de phase 7 qu'à partir
d'un besoin concret, avec critères et preuves documentés.

## Ce qui attend l'humain

- Rien pour la publication source terminée.
- Une autorisation séparée resterait nécessaire pour toute signature, dépense
  ou distribution de binaire.

## Règles à ne pas relâcher

- Ne versionner aucun secret, chemin personnel ou donnée réelle.
- Tests exclusivement synthétiques ou temporaires.
- Le GO de phase 6 **ouvre la phase**; il n'autorise aucun agent exécuteur à
  agir hors du dépôt.
- Tout artefact destiné à sortir de la machine passe
  `scripts/scan-binary-for-personal-paths.ps1`, y compris après signature, qui
  réécrit le fichier.
- Ne pas coller un journal de construction brut dans une issue publique : il
  contient le chemin de compilation, contrairement à l'artefact.
- Le nom du propriétaire reste pour la paternité, la licence, la maintenance et
  les métadonnées; les mentions opérationnelles disent « le propriétaire ».
- Un seul exécuteur modifie le dépôt à la fois.
