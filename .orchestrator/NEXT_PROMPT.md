# NEXT_PROMPT — TASK-0045 — V1 Brain Identity Editor

**TARGET_AGENT:** CLAUDE CODE  
**RECOMMENDED_MODEL:** Sonnet 5, medium effort  
**STATUS:** READY  
**BRANCH:** `build/v0.2-a29-v1-brain-identity-editor`

## /goal

Implémenter intégralement
`docs/tasks/TASK-0045-v1-brain-identity-editor.md` selon
`docs/decisions/DEC-0043-brain-identity-editor-boundary.md`.

Le but est volontairement petit : rendre **éditables dans le runtime V1** les
trois métadonnées que le catalogue sait déjà modifier et persister :

- nom;
- couleur;
- icône.

Ne pas créer un nouveau store. Ne pas commencer FR/EN. Ne pas modifier la
source.

## 0 — Préconditions

1. Appliquer `AGENTS.md` et `CLAUDE.md`.
2. Basculer explicitement sur
   `build/v0.2-a29-v1-brain-identity-editor`.
3. `git fetch origin`.
4. Synchroniser uniquement en fast-forward avec
   `origin/build/v0.2-a29-v1-brain-identity-editor`.
5. Vérifier arbre propre.
6. Vérifier que HEAD contient :
   - `ACTION-0073`;
   - `ACTION-0074`;
   - `DEC-0043`;
   - `TASK-0045`.
7. Lire DEC-0043 et TASK-0045 en entier avant code.

STOP/BLOCKED si une précondition est fausse.

## 1 — Audit reuse-first, puis code

Commence par écrire dans RESULT l'audit de :

- `BrainRecord`;
- `BrainCatalog::update_metadata`;
- `validate_metadata`;
- commande `map_brain_update`;
- `CompositionBar`;
- `MapApp`;
- rendu courant de displayName/color/icon;
- TASK-0018 K7/K9;
- TASK-0044 resume state.

Conclusion attendue si le code courant le confirme :
**le backend nécessaire existe déjà**.

Aucune seconde commande d'édition, aucune nouvelle table, aucun nouveau fichier
de préférences.

## 2 — Geste utilisateur

Ajouter une action explicite pour le cerveau focalisé, par exemple
« Personnaliser le cerveau ».

Le formulaire doit montrer exactement :

- Nom;
- Couleur;
- Icône;
- Enregistrer;
- Annuler.

Le nom du cerveau en cours d'édition doit être clair.

Aucun champ `brain_id`, source, `sourceRef`, `sourceLabel` ou path.

Le formulaire doit fonctionner au clavier avec HTML sémantique normal.

## 3 — Réutiliser le backend autoritaire

Au save :

`invoke("map_brain_update", { brainId, displayName, color, icon })`

ou la forme exacte déjà exposée.

Attendre la réponse.

Seulement après succès :

- prendre **le BrainRecord retourné**;
- remplacer ce record dans `catalog`;
- remplacer le record de ce cerveau dans `loaded`;
- laisser React propager nom/couleur/icône à CompositionBar et MapView.

Interdit :

- reconstruire le record depuis les valeurs du formulaire;
- appeler `map_open`, `map_view`, Actualiser ou Reconstruire pour une
  métadonnée;
- écrire le resume state pour ce changement;
- toucher journal/seen state.

## 4 — Validation et erreurs

Garder la validation Rust comme vérité.

Le frontend peut empêcher les cas manifestement invalides pour une meilleure
UX, mais un refus backend doit :

- être affiché;
- garder le formulaire ouvert;
- ne pas changer le catalogue;
- ne pas changer le LoadedBrain;
- ne pas fermer l'éditeur comme si le save avait réussi.

Tester les bornes réellement définies par `validate_metadata`; ne pas inventer
d'autres règles produit.

## 5 — Couleur / icône

La couleur ne doit jamais être le seul signal.

Après édition :

- nom visible;
- icône visible;
- couleur appliquée là où elle l'est déjà.

Ne transforme pas cette tranche en design system.

Un `<input type="color">` est acceptable si cohérent avec la validation
`#RRGGBB`. Pour l'icône, choisir le contrôle minimal qui respecte la borne
backend et reste utilisable au clavier.

## 6 — Isolation dure

Cas à falsifier :

- A et C partagent la même source;
- éditer A;
- C reste bit-for-bit identique pour ses métadonnées;
- source de A inchangée;
- `brain_id` inchangé;
- index/journal/seen/resume inchangés.

Le test ne doit pas seulement vérifier l'écran : inspecter aussi les appels
émis.

## 7 — Restart réel et P-20

WebView2 réel obligatoire.

Scénario minimal :

1. trois cerveaux de preuve;
2. donner un resume state distinct à chacun ou réutiliser le harness TASK-0044;
3. éditer nom/couleur/icône d'au moins un cerveau via l'UI;
4. effectuer au moins un save au clavier réel;
5. confirmer que les autres cerveaux n'ont pas changé;
6. fermer réellement le processus;
7. relancer;
8. confirmer métadonnées exactes;
9. confirmer cerveau actif + resume state toujours exacts;
10. confirmer aucune source modifiée et aucun événement de journal inventé.

Le rapport peut dire **P-20 READY FOR INDEPENDENT CLOSURE**, jamais VERIFIED.

## 8 — Régressions obligatoires

La tranche ne doit pas casser :

- TASK-0044 resume state;
- TASK-0043 watcher;
- sélection/composition multi-brain;
- relations;
- real-root privacy;
- public-readiness.

Ne modifie pas le comportement source.

## 9 — Validation

Obligatoire :

- tests Rust ciblés si nécessaire;
- tests TypeScript ciblés;
- `cargo test --offline`;
- `pnpm test`;
- `pnpm check`;
- `pnpm build`;
- `cargo build --offline`;
- Tauri debug;
- preuve WebView2 réelle avec restart;
- Clippy, dette historique séparée;
- `git diff --check`;
- `scripts/audit-public-readiness.ps1 -AllowRemotes`.

## 10 — Documentation

À la fin :

- TASK-0045 = `IMPLEMENTED`, jamais auto-`VERIFIED`;
- F-033 peut passer à `IMPLEMENTED` avec preuve, pas VERIFIED;
- P-20 = candidate à clôture indépendante seulement;
- F-035 reste `PROPOSED` : ne touche pas FR/EN;
- P-19 reste PARTIELLE;
- mettre à jour CURRENT_STATE/HANDOFF/NEXT_ACTION/VALIDATION/CHANGELOG_AI;
- `.orchestrator/RESULT.md` = rapport compact de cette exécution.

## 11 — Gouvernance

- aucune TASK-0046;
- aucun PR/merge/tag/release;
- push seulement sur la branche courante;
- arbre propre;
- NEXT_ACTION = contrôle indépendant de TASK-0045.
