# TASK-0008 — Phase 6 : revue indépendante et préparation locale à la publication

- **Statut :** `IMPLEMENTED` — livrée le 2026-08-26, non commitée, non vérifiée
- **Phase :** 6 — Publication
- **Ouverte et démarrée le :** 2026-08-26
- **Approuvée via :** GO humain spécial de phase 6, donné par le propriétaire
  le 2026-08-26
- **Exécutant :** Claude Code
- **Orchestrateur :** instance distincte, qui vérifiera puis commitera
- **Compte GitHub cible connu :** `Sd-tech-Sol`, authentification `gh` expirée

## Contexte

Le propriétaire a donné le GO humain spécial et distinct exigé par la
section 5 de `AGENTS.md` pour aborder la phase 6. Ce GO ouvre la phase, il
n'autorise **pas** l'exécuteur à agir hors du dépôt. La réauthentification
GitHub est un acte humain qui n'a pas eu lieu; toute action distante est donc
hors périmètre de cette tâche et reste réservée à l'orchestrateur.

## Objectif

Conduire une revue indépendante de niveau élevé du dépôt avant publication,
combler localement les manques publics réellement justifiés, et produire un
rapport factuel permettant à l'orchestrateur de décider de la publication.

## Périmètre autorisé

- Lecture et écriture **dans ce dépôt uniquement**.
- Exécution des tests, analyses statiques, audits et validations existants.
- Inspection complète de l'historique Git **local**.
- Ajout de fichiers publics manquants et de métadonnées GitHub utiles.

## Périmètre interdit

- Aucune connexion, authentification ou appel réseau.
- Aucun `git remote`, `git push`, `git tag` distant, branche publique,
  dépôt distant, release, publication ou téléversement.
- Aucune signature d'artefact, aucun secret, aucun achat.
- Aucun accès à un corpus utilisateur ou au corpus privé interdit; données
  synthétiques et répertoires temporaires uniquement.
- Aucun `git commit` : l'orchestrateur examine puis commite.
- Aucune nouvelle dépendance de production ou de développement.
- Aucune preuve fabriquée; tout résultat non exécuté est déclaré « non testé ».

## Livrables

1. `CODE_OF_CONDUCT.md` — code de conduite du projet.
2. `CHANGELOG.md` — journal des versions destiné au public, distinct de
   `docs/ai/CHANGELOG_AI.md`.
3. `.github/workflows/ci.yml` — vérification continue Windows reproduisant la
   chaîne locale.
4. `README.md` — paternité explicite de Sébastien Dubé, lien
   `https://github.com/Sd-tech-Sol`, statut **alpha** et limites exactes.
5. Métadonnées GitHub utiles et proportionnées, avec justification écrite de
   ce qui est délibérément **exclu**.
6. `docs/reviews/TASK-0008-independent-review.md` — rapport factuel de revue,
   incluant l'audit de l'historique Git et la recommandation sur la forme de
   publication.
7. Mise à jour de la mémoire du projet : `CURRENT_STATE.md`,
   `NEXT_ACTION.md`, `CHANGELOG_AI.md`, `VALIDATION.md`,
   `graph/current_state.yaml`, `graph/history.jsonl`, `HANDOFF.md`.

## Critères d'acceptation

1. La chaîne de vérification locale est réexécutée et son résultat est
   rapporté tel quel, succès comme échec.
2. Les fichiers YAML et JSONL du dépôt sont validés par un analyseur réel et
   le résultat est cité.
3. **Tout** l'historique Git de ce dépôt — objets atteignables et non
   atteignables — est inspecté pour secrets, chemins personnels et référence
   à un projet privé, avec méthode et résultats chiffrés.
4. Les manques publics comblés sont réels, justifiés un par un, et aucun
   ajout n'introduit de dépendance.
5. Le `README.md` énonce la paternité, le statut alpha et des limites
   vérifiables, sans promesse non tenue.
6. Le rapport distingue explicitement ce qui est **vérifié**, ce qui est
   **recommandé** et ce qui est **non testé**.
7. Aucune action externe n'a eu lieu : ni remote, ni push, ni release, ni
   publication, ni signature, ni connexion.
8. L'arbre de travail est laissé **non commité** pour examen par
   l'orchestrateur.

## Règle d'état

L'exécuteur livre au plus `IMPLEMENTED`. Le passage à `VERIFIED` appartient à
l'orchestrateur ou à l'humain, sur preuve indépendante (section 3 de
`AGENTS.md`).

## Second tour — cinq décisions du propriétaire, 2026-08-26

Le propriétaire a approuvé une **identité publique minimale** — nom
« Sébastien Dubé », copyright 2026, profil GitHub `https://github.com/Sd-tech-Sol`
— afin que le projet soit attribuable dans un portfolio professionnel. Aucun
courriel réel, nom de compte Windows, chemin local absolu, document privé ou
autre donnée personnelle ne doit être publiable.

Cinq décisions supplémentaires ont été appliquées :

1. **Anglais comme langue principale GitHub.** `README.md` entièrement anglais,
   `README.fr.md` complet et équivalent, métadonnées et modèles GitHub en
   anglais, documents publics racine traduits sans perte de contenu.
   `docs/ai/**`, `graph/**` et la checklist restent en français.
2. **Langue de l'application.** Détection de la langue système ou navigateur,
   français pour toute locale `fr`, anglais pour toutes les autres, anglais en
   repli. Bouton FR/EN conservé, choix explicite mémorisé, tests réels ajoutés.
3. **Fuite de chemins de compilation corrigée.**
   `env!("CARGO_MANIFEST_DIR")` retiré du binaire de release, fixture
   synthétique réservée au développement et résolue à l'exécution, mécanisme
   stable `--remap-path-prefix` appliqué, artefacts reconstruits et **scannés
   réellement**.
4. **Mentions nominatives opérationnelles réduites** dans les documents publics
   mutables; le nom reste où il sert la paternité, la licence, la maintenance
   et les métadonnées. `graph/history.jsonl` n'a pas été réécrit.
5. **Preuves réexécutées** et mémoire mise à jour.

## Résultat et preuves

Rapport complet : `docs/reviews/TASK-0008-independent-review.md`.
Preuves consignées : `docs/ai/VALIDATION.md`, section H.

| Critère | Résultat |
|---|---|
| 1 — Chaîne réexécutée et rapportée telle quelle | **12 étapes, 0 échec** |
| 2 — YAML et JSONL validés par un analyseur réel | 6 YAML, 3 JSON, 2 JSONC, **56 lignes JSONL, 0 invalide** (PyYAML 6.0.3) |
| 3 — Historique Git complet inspecté | **143 blobs**, objets non atteignables compris; **0 secret, 0 chemin personnel, 0 référence privée** |
| 4 — Manques comblés, justifiés, sans dépendance | 13 fichiers au premier tour, 5 décisions au second; **0 dépendance ajoutée** |
| 5 — README : paternité, statut alpha, limites | Paternité, lien du profil GitHub, encadré alpha, tableau de 9 limites, en anglais et en français |
| 6 — Vérifié / recommandé / non testé distingués | Sections 1, 1.2, 9 et 10 du rapport |
| 7 — Aucune action externe | 0 remote, 0 push, 0 release, 0 signature, 0 connexion |
| 8 — Arbre laissé non commité | `git log` inchangé à 3 commits |

### Chiffres du second tour

- Tests d'interface : **4 → 36**. Tests Rust : **11 → 13**.
- Clippy strict passe désormais en profil **debug et release**; la CI vérifie
  les deux.
- Fuite de chemins dans `filetopo.exe` : **336 occurrences → 0**, sur cinq
  motifs, deux encodages et deux artefacts.
- Nouvelles empreintes SHA-256 consignées dans `docs/releases/0.1.0-alpha.1.md`; les
  anciennes sont périmées et leurs artefacts ne doivent pas être distribués.
- Documentation : 49 fichiers `.md`, **0 lien cassé**, 4 liens externes.

### Correction d'une hypothèse fausse

`trim-paths` avait été ajouté au profil `release` en supposant sa stabilité
depuis Rust 1.81. C'était **faux** pour Cargo 1.98 : le manifeste devenait
impossible à analyser. L'option a été retirée et remplacée par
`--remap-path-prefix`, drapeau stable de rustc. Le manifeste documente
pourquoi.

### Non testé, déclaré

Workflow CI jamais exécuté sur un exécuteur GitHub; branche `-AllowRemotes` non
testée avec un remote réel; liens externes non résolus sur le réseau; aucune
inspection visuelle de l'application; charge utile NSIS non analysée après
décompression.

## Conclusion

`TASK-0008` est livrée en `IMPLEMENTED`. Conformément à la section 3
d'`AGENTS.md`, l'exécuteur ne s'attribue pas `VERIFIED`. L'orchestrateur ou
l'humain doit vérifier sur preuve indépendante, puis commiter.

## Troisième tour — transparence sur l'assistance IA, 2026-08-26

Décision approuvée par le propriétaire : divulguer publiquement l'assistance
IA, de façon professionnelle et factuelle, sans commit ni publication.

**Ajouté :** `AI_ASSISTANCE.md`, bilingue, et une section courte dans
`README.md` et `README.fr.md` qui y renvoie. Sens préservé exactement :
Sébastien Dubé détient l'idée, la vision produit, les exigences, les
priorités et toutes les décisions finales; l'orchestration a été faite avec
l'application de bureau OpenAI Codex; OpenAI Codex et Anthropic Claude Code
ont servi à l'implémentation, aux tests, aux audits, à la documentation et aux
revues; aucun outil n'est auteur, propriétaire ou mainteneur; aucune
affiliation ni approbation d'OpenAI ou Anthropic n'est impliquée;
responsabilité et maintenance finales à Sébastien Dubé. Le document renvoie
aux décisions, tâches, tests et revues versionnés, sans chaîne de pensée ni
journal privé.

**`CHANGELOG.md`** mis à jour en conséquence.

**Aucun changement de code.** Rebuild non refait : rien à reconstruire.
Ré-audits documentaires seulement :

| Étape | Résultat |
|---|---|
| `scripts/audit-public-readiness.ps1` | 118 fichiers versionnés, 0 motif sensible |
| Liens relatifs, 50 fichiers `.md` | 0 lien cassé |
| Encodage `AI_ASSISTANCE.md`, `README.md`, `README.fr.md` | UTF-8, sans BOM |

`TASK-0008` reste `IMPLEMENTED`. Aucun commit, aucun remote, aucune connexion.

## Vérification indépendante de l'orchestrateur — 2026-08-26

- Décision propriétaire confirmée : identité publique minimale et divulgation
  transparente de l'assistance IA approuvées.
- Version harmonisée à `0.1.0-alpha.1`; identifiant technique remplacé par
  `io.github.vat-faire.filetopo` avant toute publication.
- Détection de langue corrigée pour suivre la première préférence système
  valide; anglais comme repli, choix utilisateur persistant.
- 36 tests interface, 13 tests Rust, TypeScript, Vite, format Rust, Clippy
  strict debug/release, audit de dépendances et inventaires réussis.
- Release et NSIS reconstruits avec quatre préfixes remappés. Scan indépendant
  réussi sur trois artefacts, cinq motifs, ASCII et UTF-16LE : zéro fuite.
- Candidate alpha : exécutable SHA-256
  `9721613541E1430D83246DAF3087942A0BE97260C1C8E0688A6B34C2D74D92C0`;
  installateur SHA-256
  `628EAB32AFFED631041A69F96EB4610A9CD444360BFE72C40C02C20D9201DA20`.

Les critères locaux de `TASK-0008` sont satisfaits. La tâche peut passer à
`VERIFIED` après validation structurelle finale et commit local.
