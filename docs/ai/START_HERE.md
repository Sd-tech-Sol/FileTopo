# START_HERE.md — Point d'entrée pour tout agent

Lis ce fichier **en premier**, à chaque session, avant toute action.

## 1. Où tu es

Dépôt local d'un projet public original de **cartographie topographique de
dossiers et documents**. Nom de dossier provisoire.

Le code applicatif **existe** : les phases 0 à 6 sont vérifiées et FileTopo
possède un MVP Windows construit et testé (Tauri 2, Rust, React/TypeScript).
Le code source est public dans `Sd-tech-Sol/FileTopo` et la prerelease source
seulement `v0.1.0-alpha.1` est publiée. Aucun binaire n'est distribué. La phase
7 reste optionnelle et `DEFERRED`.

## 2. Ordre de lecture obligatoire

1. `AGENTS.md` (ou `CLAUDE.md`, contenu identique) — les règles.
2. `docs/ai/OPERATING_MANUAL.md` — comment travailler.
3. `docs/ai/CURRENT_STATE.md` — où en est le projet.
4. `docs/ai/NEXT_ACTION.md` — la seule action proposée.
5. `PROJECT_VISION.md` et `ROADMAP.md` — l'intention et les phases.

## 3. Les cinq règles à ne jamais enfreindre

1. **Rester dans ce dépôt.** Rien n'est lu ni écrit à l'extérieur.
2. **Lecture seule** des documents utilisateur. Jamais de modification.
3. **Une seule tâche `IN_PROGRESS`** à la fois.
4. **Preuves obligatoires.** Ce qui n'a pas été vérifié est dit « non testé ».
5. **Autorisation permanente (2026-08-25)** pour la recherche publique en
   lecture, les décisions documentées, l'architecture, le développement, les
   tests, la documentation et les commits locaux, avec **enchaînement
   autonome des tâches** quand les critères et les preuves sont satisfaits.
   **GO humain requis seulement** en cas d'ambiguïté importante, de
   secret/identifiant manquant, de dépense/achat, d'action destructive sur
   des documents utilisateur, ou d'action externe hors de l'objectif
   (publication, dépôt distant, branche publique, réseau hors lecture
   publique). Aucun portefeuille payant Anthropic n'est activé ou utilisé
   automatiquement.

## 4. Ce qui est décidé, et ce qui ne l'est pas

**Décidé et vérifié** — ne le remets pas en cause sans décision documentée :

- Nom de travail public réversible : **FileTopo** (`DEC-0001`).
- Licence : **MIT** (`DEC-0002`).
- Pile : **Tauri 2 + Rust + React/TypeScript + Vite** (`DEC-0003`).
- Index SQLite par collection (`DEC-0004`), rendu PixiJS/WebGL (`DEC-0005`).

**Non décidé** — ne le décide pas, ne le suppose pas dans tes écrits :

- L'**identité visuelle** finale.
- Les **paramètres UX définitifs** des exclusions et du niveau de détail.
- La prochaine fonction avancée éventuelle; aucune n'est actuellement ouverte.

Le nom **FileTopo** reste un nom de travail réversible : aucun domaine ni
marque n'a été réservé.

## 5. Ce qui est interdit dans ce dépôt

- Toute **donnée réelle** (fichiers, chemins, noms, contenus d'un utilisateur).
- Tout **secret** (clé, jeton, mot de passe) et tout **chemin local personnel**.
- Toute référence à un projet privé quelconque.
- Toute **nouvelle dépendance** non décidée et non inventoriée. Les
  dépendances existantes sont verrouillées dans `pnpm-lock.yaml` et
  `src-tauri/Cargo.lock`; tout ajout impose de régénérer l'inventaire et de
  corriger `THIRD_PARTY_NOTICES.md`.
- Toute **publication**, tout dépôt distant, toute release, toute signature
  et tout téléversement : ces actes sont réservés à l'orchestrateur ou à
  l'humain, jamais à un agent exécuteur.
- Tout **accès réseau au-delà de la lecture de sources publiques**. L'accès
  réseau en **lecture seule** à des sources publiques, pour une tâche de
  recherche décrite dans une fiche `docs/tasks/TASK-XXXX-*.md`, est couvert
  par l'autorisation permanente du 2026-08-25 — sans GO répété pour chaque
  tâche. Toute écriture réseau (compte, réservation, achat, dépôt distant,
  publication) reste soumise à GO humain explicite.

## 6. Avant de terminer une session

Mets à jour, dans cet ordre :
`docs/ai/CURRENT_STATE.md`, `docs/ai/NEXT_ACTION.md`,
`docs/ai/CHANGELOG_AI.md`, `graph/current_state.yaml`, `graph/history.jsonl`,
puis `docs/ai/HANDOFF.md`.
