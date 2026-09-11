# NEXT_PROMPT — TASK-0036 — V1 Stable Identity Foundation

**TARGET_AGENT:** CLAUDE CODE  
**RECOMMENDED_MODEL:** Sonnet 5, high effort  
**STATUS:** READY  
**OWNER:** orchestrateur ChatGPT  
**TASK:** `TASK-0036 — V1 Stable Identity Foundation`  
**BRANCHE:** `build/v0.2-a20-v1-stable-identity`

## /goal

Implémenter intégralement `docs/tasks/TASK-0036-v1-stable-identity.md`. `TASK-0035` est `VERIFIED` par `ACTION-0056`. Cette tranche productionnalise la stratégie d'identité **I-E déjà approuvée par DEC-0009** et déjà éprouvée par le spike B3 : identité Windows prouvée quand disponible, empreinte déterministe/versionnée du chemin relatif + type sinon, jamais d'heuristique comme identité.

Le but est de préserver le même `nodes.id` pour le même objet lors d'un renommage/déplacement intra-volume prouvé, afin de préparer le futur journal/incrémental. **Ne pas implémenter watcher, journal ni mise à jour incrémentale dans cette tâche.** Finir `IMPLEMENTED`, jamais auto-`VERIFIED`.

## 0 — Préconditions et audit de réutilisation

1. Appliquer `AGENTS.md` et `CLAUDE.md`.
2. Basculer explicitement sur `build/v0.2-a20-v1-stable-identity`, `git fetch origin`, fast-forward uniquement, arbre propre.
3. HEAD doit contenir `ACTION-0056` et `TASK-0036`.
4. Lire `DEC-0009`, `DEC-0010`, `DEC-0011`, `DEC-0030/31/33/34`, `TASK-0012` B3, `PERF-0003`, `spikes/b3-windows-identity/{Cargo.toml,LICENCE.md,src/main.rs}`, puis scanner/domain/index/hierarchy/BrainIndex/commands.
5. Auditer avant de coder. Réutiliser le B3; ne pas refaire la recherche Windows.

## 1 — Contrat à construire

- `nodes.id` reste l'identité FileTopo monotone, locale à un cerveau.
- chaque nœud indexé porte une clé stable interne + provenance `SYSTEM` ou `PATH_FALLBACK`;
- aucune clé stable/VolumeSerialNumber/FileId/empreinte n'est sérialisée vers React, loguée ou mise dans un artefact;
- Windows REAL_ROOT : adapter le B3 `GetFileInformationByHandleEx(FileIdInfo)` sur Rust stable; si dépendance requise, préférer `windows-sys = 0.61.2` épinglé/ciblé Windows avec features minimales et licence déjà vérifiée par B3;
- fallback : hash versionné du chemin relatif brut + type, déterministe, sans taille/mtime/heuristique;
- reparse/skipped/cloud : ne jamais ouvrir dangereusement ni hydrater pour obtenir une identité; appliquer I-E honnêtement.

## 2 — Même Index, migration sûre

Faire évoluer le **BrainIndex canonique** uniquement. Aucun registry/store parallèle.

- schéma versionné et migration transactionnelle depuis le schéma courant;
- persister clé stable/provenance de façon interne;
- préserver `index_id`; une republication avance toujours `index_revision` atomiquement;
- prévoir un compteur/mécanisme monotone empêchant la réutilisation silencieuse d'un ID supprimé;
- collision de clé stable => refus explicite, index précédent toujours crédible/ouvrable;
- si une migration sûre exige d'enfreindre DEC-0011 ou de faire confiance silencieusement à un ancien index, `BLOCKED` au lieu d'improviser.

## 3 — Remap des IDs à la publication

Le scanner peut conserver ses IDs temporaires. Avant publication :

- même clé stable existante => reprendre le même ID canonique;
- nouveau nœud => ID neuf;
- remapper tous les `parent_id` vers les IDs canoniques;
- rename/move intra-volume `SYSTEM` => même ID, nouveau chemin/nom/parent;
- rename/move `PATH_FALLBACK` => nouvelle clé/nouvel ID, conformément à I-E;
- aucune heuristique ne rapproche automatiquement deux clés différentes.

La conservation actuelle de `seen` par chemin doit être adaptée : pour une identité reconnue, `seen` suit le même nœud; le fallback renommé ne récupère pas automatiquement l'ancien état.

## 4 — Compatibilité obligatoire

Ne pas modifier fonctionnellement : projection progressive, recherche TASK-0034, pagination/copie TASK-0035, relations, Explorer, capacités WebView. `BrainNodeRef` reste `brainId + nodeId` et la seule identité frontend. Aucune permission frontend nouvelle.

## 5 — Preuves obligatoires

Exécuter toutes les preuves de `TASK-0036`, notamment :

- migration depuis le schéma précédent;
- fallback déterministe/versionné;
- Windows SYSTEM pour fichier + dossier;
- fichier renommé puis déplacé intra-volume : même clé SYSTEM et même nodeId après refresh;
- dossier déplacé avec enfant : hiérarchie/parent IDs cohérents;
- `seen` survit au rename/move SYSTEM;
- nouvel objet => ID neuf; pas de recyclage silencieux;
- deux cerveaux sur même source restent isolés;
- collision artificielle => publication refusée sans perdre l'index précédent;
- ancien cursor refusé après nouvelle revision;
- aucune clé stable dans les DTO exposés.

## 6 — WebView2 Windows réel

Réutiliser le harnais existant avec un REAL_ROOT **entièrement synthétique**. Le script de preuve peut renommer/déplacer ses propres fichiers entre deux actions `Actualiser` du produit.

Prouver : nodeId identique après rename puis move intra-volume quand SYSTEM est disponible; chemin relatif/parent actualisés; recherche/détails/enfants/projection/Explorer-Copie sans régression; aucune fuite de chemin absolu ou de clé stable; 0 erreur console fatale. L'artefact conserve seulement booléens, IDs synthétiques et provenance générale, jamais clé stable brute ni chemin absolu.

## 7 — Validation / sortie

- Rust ciblé + `cargo test --offline`;
- TypeScript complet pour non-régression;
- `pnpm check`, `pnpm build`, `cargo build --offline`, `cargo fmt --check`, Clippy strict avec comparaison de la dette existante, `git diff --check`;
- nouvelle dépendance uniquement si justifiée par B3 et présente au lock.

Mettre à jour `docs/tasks/TASK-0036-v1-stable-identity.md`, `docs/ai/CURRENT_STATE.md`, `HANDOFF.md`, `NEXT_ACTION.md`, `VALIDATION.md`, `CHANGELOG_AI.md`, `FEATURE_MATRIX.md` pour F-004, et `.orchestrator/RESULT.md`.

À la fin :

- `TASK-0036 = IMPLEMENTED`, jamais auto-`VERIFIED`;
- aucune TASK-0037;
- `NEXT_ACTION = contrôle indépendant de TASK-0036`;
- commit + push uniquement sur `build/v0.2-a20-v1-stable-identity`;
- aucun PR/merge/tag/release;
- `RESULT.md` doit détailler HEAD/commits, réutilisation B3, migration, modèle/provenance, remap IDs, preuves rename/move/seen, WebView2, tests, confidentialité et limites.
