# Revue indépendante de pré-publication — `TASK-0008`

- **Date :** 2026-08-26
- **Exécutant :** Claude Code
- **Orchestrateur :** instance distincte, qui vérifiera puis commitera
- **Cadre :** GO humain spécial de phase 6, donné par le propriétaire le
  2026-08-26
- **Statut livré :** `IMPLEMENTED` — l'exécuteur ne s'attribue jamais
  `VERIFIED` (section 3 d'`AGENTS.md`)

La tâche s'est déroulée en **trois tours**. Le premier a produit la revue et
comblé les manques publics. Le second, ouvert par cinq décisions du
propriétaire, a traité la langue, la détection de locale, la fuite de chemins
de compilation et les mentions nominatives. Le troisième a ajouté une
divulgation publique de l'assistance IA. Ce document couvre les trois.

## 0. Portée et limites

**Fait :** lecture et écriture dans ce dépôt uniquement, exécution de la chaîne
de vérification, validation des formats, inspection complète de l'historique
Git local, ajout et correction de fichiers, construction et analyse réelle des
artefacts.

**Non fait, volontairement :** aucune connexion, aucune authentification,
aucun appel réseau, aucun `git remote`, aucun `git push`, aucune branche
publique, aucun dépôt distant, aucune release, aucune signature, aucun
téléversement, aucun achat, aucune nouvelle dépendance, aucun accès à un
corpus utilisateur ou privé, et **aucun `git commit`**.

L'arbre de travail est laissé **non commité** pour examen par l'orchestrateur.

---

## 1. Chaîne de vérification — état final

Réexécutée après **toutes** les modifications, sur Windows 11, Node 24.13.1,
pnpm 10.31.0, Rust 1.98.0.

| Étape | Commande | Code de sortie |
|---|---|---:|
| Dépendances verrouillées | `pnpm install --frozen-lockfile` | 0 |
| TypeScript | `pnpm check` | 0 |
| Tests d'interface | `pnpm test` — **36 tests réussis** | 0 |
| Frontend | `pnpm build` | 0 |
| Vulnérabilités | `pnpm audit --prod` — *No known vulnerabilities found* | 0 |
| Format Rust | `cargo fmt --all -- --check` | 0 |
| Clippy strict, debug | `cargo clippy --all-targets -- -D warnings` | 0 |
| Clippy strict, release | `cargo clippy --release -- -D warnings` | 0 |
| Tests Rust | `cargo test` — **13 tests réussis** | 0 |
| Inventaire | `scripts/dependency-inventory.ps1` — 456 paquets Rust, 0 licence absente | 0 |
| Audit de publiabilité | `scripts/audit-public-readiness.ps1` | 0 |
| Analyse des artefacts | `scripts/scan-binary-for-personal-paths.ps1` | 0 |

**Zéro échec sur douze étapes.** Les tests sont passés de 4 à **36** côté
interface et de 11 à **13** côté Rust. `pnpm-lock.yaml` n'a pas été modifié.

### 1.1 Deux garde-fous mis à l'épreuve sur des cas réels

- Une première version de ce rapport citait des exemples de chemins personnels
  sous forme anonymisée. `audit-public-readiness.ps1` **a échoué** dessus, avec
  le message `docs/reviews/TASK-0008-independent-review.md: chemin Windows
  personnel`. Les exemples ont été reformulés en prose.
- `scan-binary-for-personal-paths.ps1` **a échoué** sur le binaire d'avant
  correction, puis a réussi sur celui d'après. Le détail est en section 5.

Les deux scripts ont donc été vérifiés sur un cas positif **et** un cas
négatif, et non seulement sur un dépôt déjà propre.

### 1.2 Non testé dans cette tâche

- **Le workflow CI n'a jamais été exécuté sur un exécuteur GitHub**, faute
  d'accès réseau autorisé. Sa syntaxe YAML est validée, sa logique ne l'est
  pas.
- **La branche `-AllowRemotes` du script d'audit n'a pas été testée avec un
  remote réel** : créer un remote est interdit, et créer un dépôt de test hors
  du dossier violerait la section 1 d'`AGENTS.md`. Seul le chemin « aucun
  remote » a été exécuté, dans les deux modes.
- **Les quatre liens externes du dépôt n'ont pas été résolus** sur le réseau.
- **Aucune inspection visuelle de l'application** n'a été refaite. La détection
  de langue est couverte par des tests automatisés sous jsdom, pas par une
  observation dans l'application Tauri réelle.
- La charge utile NSIS **décompressée** n'a pas été analysée séparément; voir
  la nuance en section 5.3.

---

## 2. Validation des formats

| Format | Fichiers | Outil | Résultat |
|---|---|---|---|
| YAML | `graph/current_state.yaml`, `graph/project_graph.yaml`, `.github/workflows/ci.yml`, 3 modèles d'issues | PyYAML 6.0.3 (`safe_load`) | 6/6 analysés |
| JSON strict | `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/capabilities/default.json` | `json` (Python 3.11) | 3/3 |
| JSONC | `tsconfig.json`, `tsconfig.node.json` | analyse après retrait des commentaires | 2/2 — commentaires normaux pour TypeScript |
| JSONL | `graph/history.jsonl` | ligne par ligne | **56 lignes, 0 invalide**, saut de ligne final présent |
| Encodage | 43 fichiers ajoutés ou modifiés | décodage UTF-8 strict | 43/43 UTF-8, **aucune BOM** |
| Liens | 49 fichiers `.md` | résolution sur le disque | **0 lien relatif cassé** |

Liens externes du dépôt, au nombre de quatre et tous délibérés :
`https://github.com/Sd-tech-Sol`, `https://keepachangelog.com/en/1.1.0/`,
`https://semver.org/`, `https://www.contributor-covenant.org`.

PyYAML est un module de l'interpréteur Python déjà présent sur la machine.
**Aucune dépendance n'a été ajoutée au dépôt.**

---

## 3. Audit de l'historique Git — dépôt complet

### 3.1 Méthode

L'audit ne s'est pas limité aux fichiers présents dans `HEAD`. La totalité des
objets de la base — **143 blobs**, obtenus par
`git cat-file --batch-check --batch-all-objects`, ce qui inclut les objets
**non atteignables** — a été extraite et analysée motif par motif.

Motifs recherchés : chemins Windows/macOS/Linux personnels, clés privées PEM,
clés AWS, jetons GitHub, clés OpenAI et Anthropic, jetons Slack, `ssh-rsa`,
en-têtes `Bearer`, adresses de messagerie grand public, le nom de compte de la
machine de développement et le nom du dossier de développement.

### 3.2 Résultats

| Contrôle | Résultat |
|---|---|
| Commits | 3 |
| Branches | 1 (`main`) — aucune branche distante |
| Étiquettes | 0 |
| Dépôts distants | **0** |
| Remisages (`git stash`) | 0 |
| Blobs analysés | **143** |
| Secrets, jetons ou clés | **0** |
| Chemins personnels absolus | **0** |
| Adresses de messagerie personnelles | **0** |
| Blobs non atteignables | 5 — tous identifiés |

**Identité d'auteur des trois commits :** `Sébastien Dubé
<filetopo@local.invalid>`. L'adresse est un domaine réservé et non routable :
aucune adresse personnelle n'est exposée dans l'historique.

**Les 5 blobs non atteignables** ont été lus intégralement. Ce sont des
versions antérieures de `docs/architecture/phase-2-architecture.md`,
`docs/performance/phase-2-budgets.md`,
`docs/performance/phase-3-measurements.md`,
`docs/performance/phase-4-mvp-measurements.md` et `src-tauri/Cargo.toml`.
Aucun ne contient de donnée sensible.

### 3.3 Référence à un projet privé

**Aucune.** Les occurrences de « projet privé » et « corpus privé » dans le
dépôt sont **les règles qui l'interdisent** et les constats de conformité.

Les occurrences de « GraphRAG Workbench » renvoient au dépôt **public**
`ChristopherLyon/graphrag-workbench`, analysé comme solution comparable dans le
rapport de recherche de phase 1. Ce n'est pas un projet privé.

### 3.4 Fixtures et données

`git status` sur `tests/` est vide : les fixtures synthétiques n'ont pas été
modifiées. Aucun dossier utilisateur n'a été lu, listé ou scanné.

---

## 4. Manques publics comblés — premier tour

Chaque ajout est justifié. **Aucun n'introduit de dépendance.**

| Fichier | Justification |
|---|---|
| `CODE_OF_CONDUCT.md` | Absent. Attendu de tout dépôt public accueillant des contributions. Comporte une section propre au projet sur les données d'autrui. |
| `CHANGELOG.md` | Absent. `docs/ai/CHANGELOG_AI.md` est un journal d'agents, illisible pour un public. |
| `.github/workflows/ci.yml` | Absent. La chaîne de vérification n'existait que dans la documentation. |
| `README.md` | Réécrit : paternité, lien du profil GitHub, statut **alpha** en tête, tableau de limites exactes. |
| `.gitattributes` | Absent. 11 fichiers étaient en CRLF et 91 en LF, sans normalisation. |
| `.github/ISSUE_TEMPLATE/` + `PULL_REQUEST_TEMPLATE.md` | Absents. Les modèles imposent la règle « aucune donnée personnelle réelle » au moment exact où quelqu'un s'apprête à coller une capture d'écran. |
| `SECURITY.md` | Le canal prévu est nommé, et l'absence actuelle de canal est déclarée sans la maquiller. |
| `scripts/audit-public-readiness.ps1` | L'assertion « aucun remote » devenait un échec permanent après publication et empêchait toute exécution en CI. Elle reste **stricte par défaut** et ne se relâche qu'avec `-AllowRemotes`. |
| `package.json` | Ajout de `description`, `license`, `author`, `packageManager`. `private: true` **conservé** : il empêche une publication npm accidentelle. |
| `docs/ai/START_HERE.md` | Le fichier affirmait encore « Aucun code applicatif n'existe », listait le nom, la licence et la pile comme non décidés, et interdisait « toute dépendance ». Trois affirmations devenues fausses. |
| `docs/release-checklist.md` | Étendu : revue, points bloquants pour un binaire, réglages GitHub, périmètre d'identité publique. |
| `ROADMAP.md` | La phase 6 était annoncée `DEFERRED` alors que le GO a été donné. |

### 4.1 Métadonnées GitHub délibérément **exclues**

| Écarté | Motif |
|---|---|
| `.github/dependabot.yml` | Ouvrirait des demandes de fusion automatiques sur un dépôt maintenu par une personne seule, avec deux verrous stricts et un avis de tiers à régénérer à chaque changement. Inscrit dans la checklist. |
| `CODEOWNERS` | Un seul auteur; le fichier n'apporterait rien. |
| `FUNDING.yml` | Aucun financement sollicité. |
| Robots de fermeture d'issues, *release-drafter*, *labeler* | Aucune activité à automatiser. |
| Workflows macOS et Linux | Le projet ne construit ni ne teste ces plateformes. Un travail CI vert y serait un mensonge. |
| Construction NSIS en CI | Longue, et produirait un artefact non signé qu'il ne faut pas distribuer. |
| Description et sujets du dépôt | Ce sont des **réglages**, pas des fichiers. Section D de la checklist. |

---

## 5. Fuite de chemins de compilation — corrigée et vérifiée

C'était le constat central du premier tour. Il est traité.

### 5.1 Ce qui fuyait

Le `filetopo.exe` construit le 2026-08-26 par `pnpm tauri build` contenait,
mesuré par `scripts/scan-binary-for-personal-paths.ps1` :

| Motif recherché | Occurrences ASCII |
|---|---:|
| Nom de compte Windows | 336 |
| Profil utilisateur | 336 |
| Racine du dépôt | 1 |
| Nom du dossier du dépôt | 1 |
| `CARGO_HOME` | 335 |

Deux causes distinctes :

1. **Métadonnées de panique et chemins sources des dépendances Cargo**, que
   rustc intègre par défaut.
2. **`env!("CARGO_MANIFEST_DIR")`** dans `scan_synthetic_fixture`, que le
   compilateur remplace textuellement par le chemin absolu du dépôt.

### 5.2 Ce qui a été appliqué

**`trim-paths` a été essayé et rejeté sur preuve.** Ajouté au profil `release`
de `src-tauri/Cargo.toml`, il rend le manifeste **impossible à analyser** :

> `feature 'trim-paths' is required` — `The package requires the Cargo feature
> called 'trim-paths', but that feature is not stabilized in this version of
> Cargo (1.98.0)`

L'option a donc été retirée, et le manifeste porte un commentaire expliquant
pourquoi elle est absente. Le mécanisme retenu est **stable** :

1. **`--remap-path-prefix`**, drapeau stable de rustc, appliqué par
   `scripts/build-release-clean.ps1`. Le script calcule les préfixes à
   l'exécution — `CARGO_HOME`, `.rustup`, racine du dépôt — et les remappe vers
   `/cargo`, `/rustup` et `/filetopo`. **Aucun chemin machine n'est écrit dans
   le dépôt.**
2. **`env!("CARGO_MANIFEST_DIR")` retiré du code livré.** La fixture synthétique
   est désormais résolue **à l'exécution**, relativement au répertoire courant,
   et sa fonction est compilée sous `#[cfg(debug_assertions)]`. Une
   construction release ne contient plus ni la logique ni le chemin. Le
   remappage seul n'aurait pas suffi : la macro est une expansion textuelle.
3. **Le bouton disparaît proprement.** `health` expose
   `syntheticFixtureAvailable`, et l'interface masque le bouton quand la
   construction ne l'offre pas, au lieu d'afficher un bouton qui échoue.

### 5.3 Résultat mesuré

Après reconstruction par `scripts/build-release-clean.ps1` :

> `Aucune fuite détectée : 2 artefact(s) scanné(s), 5 motif(s) recherché(s) en
> ASCII et UTF-16LE.`

**336 occurrences → 0**, sur les deux artefacts, pour les cinq motifs, dans les
deux encodages.

Empreintes SHA-256 des artefacts propres reconstruits le 2026-08-26 :

- `filetopo.exe`, 11 195 904 octets :
  `71BEA4EFC76AAB8C66FBCF315BD903981450851FAED67972E45AE5BD712CB7B6`;
- `FileTopo_0.1.0_x64-setup.exe`, 2 927 778 octets :
  `BF71FF7EA6CA4DF178CF1F459E4891A422D047B5BA23A7E2D0826CF748124A72`.

Les empreintes consignées en phase 5 sont **périmées** : elles désignent des
artefacts qui contenaient les chemins et qui ne doivent pas être distribués.

**Nuances honnêtes :**

- La charge utile NSIS est **compressée**. Le scan porte sur le fichier tel
  quel; il n'a pas été décompressé. L'exécutable qu'il embarque est cependant
  celui qui a été scanné séparément avec 0 occurrence.
- Le **journal de construction**, lui, contient toujours le chemin : l'éditeur
  de liens MSVC imprime son propre message, que rustc remonte en avertissement
  `linker_messages`. C'est dans la sortie console, **pas dans l'artefact**.
  `SECURITY.md` avertit de ne pas coller un journal de build brut dans une
  issue publique.
- Trois avertissements de code mort sont apparus en release une fois la fixture
  compilée hors du binaire. Ils sont traités, et la CI exécute désormais
  **Clippy strict en profil release** pour empêcher la réapparition de cette
  classe d'écart.

---

## 6. Anglais comme langue principale

Le dépôt visant un portfolio professionnel, la documentation publique est
passée en anglais, avec un équivalent français complet du README.

| Fichier | État |
|---|---|
| `README.md` | Anglais, avec lien croisé vers la version française |
| `README.fr.md` | Français, complet et équivalent, lien croisé vers l'anglais |
| `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `PRIVACY.md`, `CHANGELOG.md`, `THIRD_PARTY_NOTICES.md`, `ROADMAP.md`, `PROJECT_VISION.md` | Anglais |
| `.github/**`, `.gitattributes`, `index.html` | Anglais |
| `docs/user-guide-en.md` / `docs/user-guide-fr.md` | Inchangés, déjà bilingues |
| `docs/ai/**`, `graph/**`, `AGENTS.md`, `CLAUDE.md`, `docs/release-checklist.md` | **Français**, comme autorisé : documents de travail internes |

`PROJECT_VISION.md` posait une difficulté : c'est un document d'intention
antérieur au code, dont plusieurs points « non décidés » sont depuis tranchés.
Il n'a **pas** été réécrit après coup. Les points concernés portent une note
datée *« decided since »*, ce qui préserve la valeur d'archive du document sans
laisser d'affirmation fausse.

Le `README.md` indique explicitement que `docs/ai/` et `graph/` sont en
français et ne sont pas nécessaires pour utiliser le projet ou y contribuer.

---

## 7. Langue de l'application

`src/lib/locale.ts` implémente la règle demandée, dans cet ordre :

1. un **choix explicite** mémorisé l'emporte toujours et survit au redémarrage;
2. sinon la **langue système ou navigateur** décide : toute locale `fr` donne
   le français, toute autre donne l'anglais;
3. **l'anglais est le repli** quand rien ne peut être déterminé.

Le bouton FR/EN est conservé; il porte désormais un `aria-label` explicite et
écrit le choix. `document.documentElement.lang` suit la langue, ce qui compte
pour les technologies d'assistance.

La persistance utilise **une seule clé**, `filetopo.locale`, documentée dans
`PRIVACY.md`. Toute lecture ou écriture de stockage est protégée : un
navigateur qui refuse `localStorage` ne fait pas planter l'interface.

**Tests réels ajoutés : 32.** `src/lib/locale.test.ts` en compte 24 et
`src/App.test.tsx` passe de 4 à 12. Ils couvrent notamment :

- `fr`, `fr-CA`, `fr-FR`, `fr-BE`, `fr-CH`, `FR-ca`, `fr_CA` et les espaces
  superflus donnent tous le français;
- `en-FR` reste **anglais** : seule la sous-étiquette primaire compte, pas la
  région;
- `af-ZA`, `fy-NL` et `frr` ne sont **pas** confondus avec le français;
- l'ordre de préférence de `navigator.languages` est respecté;
- une valeur stockée corrompue est ignorée au profit de la langue système;
- un stockage qui lève une exception est absorbé;
- un choix explicite survit à un démontage et remontage du composant, dans les
  deux sens, et l'emporte sur la langue système opposée.

---

## 8. Réduction des mentions nominatives

Les mentions opérationnelles du type « GO donné par <nom> » ont été remplacées
par « le propriétaire » dans huit fichiers publics mutables. Le nom demeure là
où il sert, conformément au périmètre approuvé :

| Emplacement | Rôle |
|---|---|
| `README.md`, `README.fr.md` | Paternité, licence, profil GitHub |
| `LICENSE` | Copyright 2026 |
| `package.json`, `src-tauri/Cargo.toml`, `graph/project_graph.yaml` | Métadonnées d'auteur |
| `docs/ai/VALIDATION.md`, ce rapport | Constat factuel de l'identité d'auteur des commits |

`graph/history.jsonl` n'a **pas** été réécrit, conformément à l'instruction :
l'historique reste tel qu'il a été consigné.

Aucun courriel réel, nom de compte Windows, chemin local absolu ou document
privé n'est publiable. L'adresse d'auteur des commits est
`filetopo@local.invalid`, un domaine non routable.

---

## 9. Recommandation — publier la source, sans binaire

**Recommandation maintenue : publier le code source seul, sans release binaire
et sans artefact signé.** Le motif le plus grave a disparu, les autres non.

Ce qui a changé : la fuite de chemins est corrigée et **vérifiée sur
l'artefact**. Distribuer un binaire n'exposerait plus le compte ni
l'arborescence de l'auteur.

Ce qui subsiste :

1. **Un binaire non signé nuit à qui le télécharge.** Windows affiche un
   avertissement SmartScreen. Un projet qui promet de ne pas toucher aux
   documents des gens ne gagne rien à leur apprendre à ignorer un avertissement
   de sécurité.
2. **La signature est une dépense et une responsabilité durable** : certificat,
   renouvellement, protection de la clé privée. Toute dépense exige un GO
   humain distinct.
3. **Le statut alpha ne justifie pas la distribution.** Le logiciel n'a été
   utilisé par personne d'autre que son auteur, sur des données synthétiques.
   Le public visé d'une alpha sait construire depuis la source.
4. **La CI Windows rend la construction reproductible pour autrui**, ce qui
   couvre le besoin réel sans distribuer quoi que ce soit.

**Réversible :** publier un binaire signé reste possible plus tard, une fois la
section B de la checklist close. L'inverse ne l'est pas.

---

## 10. Points laissés à la décision du propriétaire

1. **Renormalisation des fins de ligne.** `.gitattributes` est ajouté mais
   `git add --renormalize .` **n'a pas été exécuté** : il produirait une
   différence d'espacement sur 11 fichiers.
2. **Numéro de version.** `package.json`, `Cargo.toml` et `tauri.conf.json`
   annoncent `0.1.0`, alors que le README annonce un statut alpha. Passer à
   `0.1.0-alpha` serait plus exact mais renommerait les artefacts et
   invaliderait les empreintes ci-dessus. **Non modifié.**
3. **Nom public.** `FileTopo` reste un nom de travail réversible. Les limites
   USPTO et WIPO signalées en phase 1 **ne sont toujours pas levées**.
4. **Canal de signalement de sécurité.** Inexistant tant que le dépôt n'est pas
   créé.
5. **Accessibilité.** La liste DOM a été inspectée visuellement, jamais auditée
   par un outil ni par une personne spécialisée.
6. **Forme de la publication**, au vu de la section 9.

---

## 10 bis. Troisième tour — transparence sur l'assistance IA

Le propriétaire a approuvé une divulgation publique, professionnelle et
factuelle de l'assistance IA. `AI_ASSISTANCE.md` (bilingue) et une section
courte dans `README.md`/`README.fr.md` renvoyant vers ce document ont été
ajoutés, avec le sens exact demandé : Sébastien Dubé détient l'idée, la vision
produit, les exigences, les priorités et toutes les décisions finales;
l'orchestration a été faite avec l'application de bureau OpenAI Codex; OpenAI
Codex et Anthropic Claude Code ont servi à l'implémentation, aux tests, aux
audits, à la documentation et aux revues; aucun outil n'est auteur,
propriétaire ou mainteneur; leur usage n'implique aucune affiliation ni
approbation d'OpenAI ou d'Anthropic; responsabilité et maintenance finales à
Sébastien Dubé. Le document renvoie aux décisions, tâches, tests et revues
versionnés — aucune chaîne de pensée ni journal privé publié.

Aucun changement de code : pas de reconstruction refaite. Ré-audits
documentaires seulement — `scripts/audit-public-readiness.ps1` (118 fichiers,
0 motif sensible) et vérification des liens relatifs sur 50 fichiers `.md`
(0 cassé).

## 11. Conclusion

Les huit critères d'acceptation de `TASK-0008` sont traités, et les cinq
décisions du second tour sont appliquées.

La chaîne de vérification est verte sur **douze étapes**, avec 36 tests
d'interface et 13 tests Rust. Les formats sont validés par des analyseurs
réels. L'historique Git complet — objets non atteignables compris — ne contient
ni secret, ni chemin personnel, ni référence à un projet privé. La fuite de
chemins de compilation est corrigée et **mesurée à zéro sur les artefacts
reconstruits**.

Le dépôt est, de l'avis de cette revue, **publiable sous forme de code
source**. La distribution d'un binaire reste déconseillée pour les motifs de la
section 9, qui ne sont plus des défauts techniques mais des choix de prudence.

`TASK-0008` est livrée en `IMPLEMENTED`. Le passage à `VERIFIED` appartient à
l'orchestrateur ou à l'humain, sur preuve indépendante. Aucun commit n'a été
effectué.
