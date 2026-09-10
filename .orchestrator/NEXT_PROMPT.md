# NEXT_PROMPT — TASK-0032 / CORRECTIVE PASS — REAL_ROOT Privacy + Legacy Index Compatibility

**TARGET_AGENT:** CLAUDE CODE  
**STATUS:** READY  
**OWNER:** orchestrateur technique indépendant  
**MODE:** correction ciblée de TASK-0032 — ne créer aucune nouvelle TASK/DEC  
**TASK:** `TASK-0032 — V1 REAL_ROOT — Controlled Local Folder Onboarding`  
**BRANCHE:** `build/v0.2-a16-v1-real-root`

## /goal

Le contrôle indépendant de TASK-0032 a trouvé **deux défauts bloquants**. Corriger uniquement ces défauts, leurs tests et leur documentation. Ne pas élargir la V1, ne pas utiliser de donnée personnelle et ne pas créer TASK-0033/DEC-0034.

TASK-0032 reste `IMPLEMENTED`, **pas VERIFIED**, jusqu'au prochain contrôle indépendant.

---

## 0 — Préconditions et Git

1. Appliquer `AGENTS.md`, `CLAUDE.md` et les protocoles actifs.
2. `git fetch origin`, puis fast-forward uniquement.
3. Branche attendue : `build/v0.2-a16-v1-real-root`.
4. HEAD distant attendu au départ : `efec2ea94e7e0cb73c064ed92baaccc5ac8a1f2c`.
5. Le point de départ orchestration de TASK-0032 reste `05fc37137f6a6983b020d993e838176341ef3fc4`; gel `c3507bf`, code `7302291`, preuve `f00fb55`, docs `2ce3a17`, RESULT-pin `efec2ea`.
6. `origin/main` doit rester `1a7d652ca48281c1687f6d1404c56a1404df91d8`.
7. X5 = 36 et doit rester inchangé.
8. Arbre propre avant écriture. Toute divergence inexpliquée : STOP/BLOCKED.

Aucune nouvelle branche nécessaire : corriger TASK-0032 sur sa branche actuelle et pousser uniquement celle-ci.

---

## 1 — DÉFAUT BLOQUANT A : `dialog:allow-open` viole la frontière de confidentialité

### Constat indépendant

`src-tauri/capabilities/default.json` accorde actuellement `dialog:allow-open` au WebView. Or cette permission Tauri **active la commande frontend `open` du plugin dialog**. Le code officiel du plugin accepte un `default_path: Option<PathBuf>` et retourne le ou les chemins choisis au frontend.

Cela contredit directement `DEC-0033 A/B` :

- le WebView ne doit jamais pouvoir nommer un emplacement disque;
- le chemin absolu ne doit jamais traverser l'IPC vers le WebView;
- le seul geste autorisé doit être notre commande Rust `map_brain_choose_real_root()`, sans argument, qui ouvre elle-même le dialogue natif et garde le chemin côté Rust.

### Correction obligatoire

1. **Retirer `dialog:allow-open` de la capability du WebView.**
2. Garder `tauri_plugin_dialog::init()` si nécessaire pour l'API Rust `app.dialog()`.
3. Ne donner aucune permission `dialog:default`, `dialog:allow-save`, `fs:*`, `shell:*` ou autre surface filesystem au WebView.
4. Garder `map_brain_choose_real_root()` comme seule porte produit d'ajout d'une racine : aucun argument de chemin.
5. Corriger `DEC-0033 H/I`, TASK-0032 et les docs qui affirment actuellement que `dialog:allow-open` est souhaitable. La règle correcte est : **plugin initialisé côté Rust, commande frontend du plugin non autorisée**.

### Preuves obligatoires A

- Test structurel : capability sans `dialog:allow-open`, `dialog:default`, `dialog:allow-save`, `fs:` et `shell:`.
- Test structurel : `map_brain_choose_real_root` est enregistré et ne prend aucun chemin/root/folder/directory/Path/PathBuf venant du WebView; `choose_collection` reste non enregistré.
- **Preuve runtime WebView2 si réalisable sans donnée personnelle :** un `invoke` direct de la commande frontend du plugin dialog (`plugin:dialog|open` ou nom réellement utilisé par la version installée) doit être refusé par la capability. Cette preuve ne doit pas ouvrir de dialogue ni inclure de chemin réel. Si l'invocation exacte diffère, l'établir depuis les sources installées/officielles et documenter le résultat.
- Le custom command Rust doit toujours compiler et rester enregistré.

---

## 2 — DÉFAUT BLOQUANT B : un index pré-DEC-0033 ne peut pas être republié comme la décision le promet

### Constat indépendant

Avant TASK-0032, `BrainIndex::replace` écrivait notamment `brain_id`, `fixture_id`, `label`, `node_count`, etc., **mais pas `source_ref` ni `source_kind`**.

Le nouveau `open_store()` refuse correctement un index sans `source_ref`. Cependant `publish_map()` fait actuellement, pour tout fichier existant :

`if reused { open_store(paths, brain)?; }`

Donc **Refresh et Rebuild sont eux aussi refusés avant le scan** sur un ancien index non bindé. Cela contredit `DEC-0033 D`, qui dit qu'un ancien index est refusé à l'ouverture mais qu'une actualisation explicite peut le republier avec le nouveau binding.

### Contrat corrigé obligatoire

#### Open

- Un index sans binding `source_kind + source_ref` reste refusé par `map_open` avec `map_source_mismatch` (ou erreur équivalente explicite).
- Aucun scan automatique, aucune suppression.

#### Refresh/Rebuild d'un index déjà bindé

- Vérifier **brain_id + source_kind + source_ref**, pas seulement `source_ref`.
- Toute divergence est refusée **avant lecture de source**, sans suppression.

#### Refresh/Rebuild d'un index legacy non bindé

Il faut un chemin de compatibilité étroit et prouvable, sans affaiblir REAL_ROOT :

- seuls les cerveaux `SYNTHETIC_FIXTURE` peuvent être reconnus comme index legacy pré-DEC-0033, puisqu'aucun `REAL_ROOT` n'existait avant cette décision;
- exiger un schéma canonique compatible, le bon `brain_id`, l'absence de `source_ref/source_kind` **et** `fixture_id == brain.source_ref`;
- alors seulement une action explicite Refresh/Rebuild peut scanner la fixture connue et republier transactionnellement le même index avec `source_kind` + `source_ref` modernes;
- conserver `index_id`; avancer `revision` uniquement lors de la publication réussie;
- si scan/publication échoue, l'ancien index reste byte/logiquement intact et toujours refusé par Open tant qu'il n'a pas été republié;
- **ne jamais appliquer cette voie legacy à un REAL_ROOT**;
- ne jamais supprimer l'ancien fichier pour “réparer”.

Si l'architecture permet une stratégie encore plus étroite et plus sûre, elle est acceptable, mais elle doit satisfaire exactement la compatibilité ci-dessus.

### Source binding complet

L'index écrit déjà `source_kind` et `source_ref`. `open_store` et la validation de publication doivent vérifier **les deux**. Un `source_ref` égal avec `source_kind` différent doit être refusé.

### Preuves obligatoires B

Ajouter un test construit avec **la vraie forme de métadonnées de l'index TASK-0031** :

1. index legacy valide avec `brain_id`, `fixture_id`, projection contract, identity/revision, mais sans `source_kind/source_ref`;
2. `map_open` refuse explicitement et ne modifie rien;
3. Refresh explicite sur le cerveau synthétique correspondant réussit;
4. `index_id` conservé, `revision +1`, `source_kind/source_ref` ajoutés;
5. `map_open` fonctionne ensuite sans lire la source;
6. un échec de refresh avant publication conserve l'ancien index;
7. un legacy non bindé présenté comme `REAL_ROOT` est refusé sans scan et sans mutation;
8. `source_ref` identique + `source_kind` différent est refusé;
9. binding `source_ref` différent est refusé comme aujourd'hui.

Ne pas affaiblir RR1-RR10 existants.

---

## 3 — Confidentialité / portée inchangée

- **Aucun cerveau personnel.** Utiliser uniquement des tempdirs/arbres générés par tests.
- Aucun chemin absolu dans Git, docs, logs ou artefacts.
- Aucun réseau, cloud, LLM, MCP, Graphify ou télémétrie.
- Aucun watcher/incrémental, aucun FTS, aucun redesign, aucun changement de renderer.
- Aucun nouveau scanner, index canonique, catalogue ou store.
- Ne pas modifier `main`, ne pas créer PR/merge/tag/release.
- Ne pas sceller de nouveaux artefacts X5.

---

## 4 — Validation

Exécuter au minimum :

- tests Rust ciblés privacy/capability/source-binding/legacy upgrade;
- suite Rust complète `cargo test --offline`;
- tests TypeScript ciblés puis `pnpm test` complet;
- `pnpm check`;
- `pnpm build`;
- `cargo build --offline`;
- `cargo fmt --check` sur les fichiers touchés et rapport honnête de la dette globale;
- `cargo clippy --all-targets --offline -- -D warnings`; la dette historique peut rester, mais aucun nouveau diagnostic de cette correction;
- `git diff --check`.

Rejouer WebView2 pour la frontière de permission frontend et pour le cycle REAL_ROOT synthétique si possible. Toute preuve reste **non canonique** jusqu'au contrôle indépendant.

---

## 5 — Documentation finale

Mettre à jour uniquement ce qui est nécessaire :

- `docs/tasks/TASK-0032-v1-real-root.md`;
- `docs/decisions/DEC-0033-real-root-privacy-and-source-binding.md`;
- `docs/ai/CURRENT_STATE.md`;
- `docs/ai/NEXT_ACTION.md`;
- `docs/ai/HANDOFF.md`;
- `docs/ai/VALIDATION.md`;
- `docs/ai/CHANGELOG_AI.md`;
- `docs/product/FEATURE_MATRIX.md` seulement si un état factuel doit être corrigé;
- `.orchestrator/RESULT.md`;
- artefact TASK-0032 correctif seulement si nécessaire.

À la fin :

- `TASK-0032 = IMPLEMENTED`, jamais auto-VERIFIED;
- `DEC-0033 = APPROVED`, corrigée pour refléter la vraie frontière de permission;
- `NEXT_ACTION` = **contrôle indépendant de TASK-0032 uniquement**;
- aucune TASK-0033/DEC-0034 précréée.

---

## 6 — RESULT.md

Rapporter clairement :

- HEAD/branche;
- commits de correction;
- correction A et preuve que le WebView ne peut plus appeler directement le picker plugin;
- correction B et preuve de migration explicite d'un index legacy synthétique sans perte d'identité;
- vérification `source_kind + source_ref`;
- suites exécutées et résultats;
- limites restantes;
- X5 = 36;
- main inchangée;
- `TASK_STATUS: IMPLEMENTED`;
- `DECISION_STATUS: APPROVED`;
- `NEXT: independent control only`.

Commit et push uniquement sur `build/v0.2-a16-v1-real-root`.