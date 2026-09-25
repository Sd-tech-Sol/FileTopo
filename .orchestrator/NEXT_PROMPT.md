# NEXT_PROMPT — TASK-0044 — V1 Per-Brain Resume State

**TARGET_AGENT:** CLAUDE CODE  
**RECOMMENDED_MODEL:** Sonnet 5, high effort  
**STATUS:** READY  
**BRANCH:** `build/v0.2-a28-v1-brain-resume-state`

## /goal

Implémenter intégralement
`docs/tasks/TASK-0044-v1-per-brain-resume-state.md` selon
`docs/decisions/DEC-0042-per-brain-resume-state.md`.

Le but est étroit : **un cerveau retrouve son état propre après une bascule et
un vrai redémarrage**, sans nouveau magasin et sans dupliquer les vérités déjà
persistées.

Ne pas ouvrir TASK-0045. Ne pas ajouter FR/EN ou une couche accessibilité ici.

## 0 — Préconditions

1. Appliquer `AGENTS.md` et `CLAUDE.md`.
2. Basculer explicitement sur
   `build/v0.2-a28-v1-brain-resume-state`.
3. `git fetch origin`.
4. Synchroniser uniquement en fast-forward avec
   `origin/build/v0.2-a28-v1-brain-resume-state`.
5. Vérifier arbre propre.
6. Vérifier que HEAD contient :
   - `ACTION-0072`;
   - `DEC-0042`;
   - `TASK-0044`.
7. Lire DEC-0042 et TASK-0044 en entier avant le premier changement.

STOP/BLOCKED si le dépôt contredit les préconditions.

## 1 — Audit reuse-first avant code

Écrire d'abord dans RESULT ce qui existe déjà et ce qui doit réellement
changer :

- active brain persistant;
- metadata brain nom/couleur/icône;
- ancien `details_panel_visible`;
- `CompositionSessionMemory`;
- `View` / `clampView`;
- `useProjectionFilter`;
- `map_view` normal et filtré;
- seen/unseen;
- watcher reload.

Le correctif doit **étendre** ces mécanismes, pas en créer des concurrents.

Interdits :

- `localStorage` / `sessionStorage`;
- nouvelle SQLite;
- second brain registry;
- second filter engine;
- stockage d'une projection ou d'une page complète;
- stockage d'un cursor keyset;
- stockage d'un path / name / stable key / FileId.

## 2 — Record versionné et brain-scoped

Réutiliser le catalogue.

Le record persistant doit être petit, fermé et versionné. Il contient seulement
les données autorisées par DEC-0042.

La lecture doit être tolérante :

- absent/corrompu/version inconnue => defaults sûrs;
- aucune lecture source;
- aucun échec de `map_open`.

La mise à jour doit être validée côté Rust, même si TypeScript normalise déjà.

## 3 — Panneau Détails devient réellement par cerveau

Ne pas supprimer l'ancienne clé globale.

Elle sert uniquement de fallback à un brain sans resume record.

Après qu'un cerveau possède son propre état :

- A caché, B visible doit rester A caché / B visible;
- restart identique.

Mettre à jour les types/commentaires qui disent encore « global » : ne pas
laisser une documentation fausse.

## 4 — Caméra sans write storm

Conserver l'arithmétique `viewState.ts`.

Exigences :

- restore seulement quand world + viewport sont connus;
- `clampView` obligatoire;
- finite only;
- changement de viewport après restart = état valide;
- pas de write SQLite par frame.

Construire une stratégie latest-wins/coalescée testable. Une interaction
terminée doit finir persistée, et une bascule de cerveau doit sauvegarder
l'état sortant avant de changer de focus.

Ne pas inventer une promesse de crash-consistency. La preuve porte sur une
fermeture normale réelle.

## 5 — Focus / sélection

Le backend doit valider un id sauvegardé contre **ce brain** et l'Index courant.

Normal view :

- focus encore valide => projection focus correspondante;
- sélection encore valide => sélection restaurée;
- disparu => fallback root/focus + correction persistée.

Tester le piège : A et B ont tous deux `nodeId = 12`; l'état de A ne peut
jamais sélectionner B:12.

## 6 — Filtre et sélection au-delà de page 1

Le filtre logique survit. Le cursor non.

Cas de rejet obligatoire :

- filtre > une page;
- page 2 ou plus;
- sélectionner un match;
- restart;
- révision identique OU avancée par watcher;
- si le match existe et satisfait toujours le filtre, **le même nœud doit être
  restauré** dans une page bornée calculée depuis l'Index courant.

Ne triche pas en sauvegardant le cursor ancien.

Si l'API courante ne sait pas retrouver une page contenant un match, ajouter
la primitive backend **minimale et bornée**, en réutilisant l'ordre canonique de
`filtered_matches`.

Pas de scan frontend du corpus.

## 7 — Watcher

TASK-0043 est acquis : ne le réécris pas.

Prouver seulement l'intégration :

- watcher avance revision;
- resume state reste;
- filtre est relu sur nouvelle revision;
- sélection existante survit;
- sélection supprimée retombe proprement;
- aucun événement du journal pour un changement de resume state.

## 8 — Trois cerveaux et vrai restart

C'est la preuve centrale.

A / B / C doivent avoir des états volontairement différents :

- focus/sélection;
- camera;
- filter;
- panel.

Dans la même session : A→B→C→A restaure chaque état.

Puis :

1. dernier brain actif connu;
2. fermer **le vrai processus**;
3. relancer le même state root;
4. le dernier brain revient seul avec son état;
5. visiter les deux autres;
6. chacun retrouve son état propre.

Le harnais doit comparer les **valeurs logiques exactes**.

## 9 — Corruption

Avant de dire DONE, couvrir au minimum :

- JSON invalide;
- version future;
- enum filter inconnue;
- nombres NaN/Infinity/hors borne;
- ids absents;
- ids numériquement identiques entre brains;
- state d'un autre brain;
- ancienne clé globale panneau.

Aucun de ces cas ne doit empêcher l'ouverture.

## 10 — Ce que TASK-0044 ne ferme pas

Les docs finales doivent dire explicitement que `P-19` reste partielle :

- langue FR/EN V1 non traitée;
- préférences accessibilité non traitées;
- composition multi-brain persistante non traitée;
- aucune préférence de légende inventée.

Ne monte pas ces fonctions par déduction.

## 11 — Validation

Obligatoire :

- tests Rust ciblés + full `cargo test --offline`;
- tests TS ciblés + full `pnpm test`;
- `pnpm check`;
- `pnpm build`;
- `cargo build --offline`;
- Tauri debug;
- WebView2 réel avec **vrai restart** et 3 brains;
- Clippy, dette historique séparée;
- `git diff --check`;
- `scripts/audit-public-readiness.ps1 -AllowRemotes`.

Si une preuve trouve un défaut produit, corrige le produit puis rejoue la preuve
sur le binaire final; ne publie pas un artefact contradictoire comme preuve
canonique.

## 12 — Gouvernance

À la fin :

- TASK-0044 = `IMPLEMENTED`, jamais auto-`VERIFIED`;
- aucune TASK-0045;
- aucun PR/merge/tag/release;
- `.orchestrator/RESULT.md` = rapport compact de cette exécution;
- mettre à jour CURRENT_STATE/HANDOFF/NEXT_ACTION/VALIDATION/CHANGELOG_AI;
- FEATURE_MATRIX honnête, sans déclarer P-19 complète;
- NEXT_ACTION = contrôle indépendant de TASK-0044;
- push uniquement sur cette branche;
- arbre propre.
