# NEXT_PROMPT — TASK-0053 — Workspace Preferences & Persistence / P-19

**TARGET_AGENT:** CLAUDE CODE
**RECOMMENDED_MODEL:** Claude Sonnet 5.5
**RECOMMENDED_EFFORT:** High
**STATUS:** READY
**BRANCH:** `build/v0.2-a37-v1-workspace-persistence`

## Objectif

Implémenter TASK-0053 selon DEC-0051 et rendre F-052/M-1/P-19 candidates à
un contrôle indépendant.

## Préconditions

1. Applique `AGENTS.md`.
2. Checkout branche cible, fetch + fast-forward, arbre propre.
3. Lis ACTION-0098, DEC-0051, TASK-0053.
4. Fais l'audit reuse-first avant code :
   - brains.rs catalog_meta;
   - resume_state.rs versioning/corrections;
   - resumeState.ts scheduling/flush;
   - compositionSession.ts;
   - branchFocus.ts;
   - locale.ts;
   - seen store.

## Règle de propriété

Ne crée aucune deuxième source de vérité :

- per-brain view/filter/panel/selection = resume existant;
- locale = mécanisme existant;
- seen = store existant;
- F-052 = workspace global uniquement.

## F-052

Ajoute un store global workspace dans catalog_meta :

- format fermé/versionné/borné;
- defaults sûrs;
- corrections nommées;
- aucun path/content;
- backend attache les index_id des node refs.

Expose les commandes minimales read/update/restore nécessaires.

## Workspace

Persiste la composition active uniquement :

- displayed brain ids;
- focused brain;
- global view;
- global selection.

Ne persiste pas tout l'historique CompositionSessionMemory.

## Branch focus

Persiste assez d'état pour qu'un restart pendant branch focus revienne dans le
même mode et que « Quitter le focus » restaure correctement la composition
pré-focus.

Node refs/collapsed ids liés à l'Index courant par le backend.

## Préférences

### Legend
Persist open/closed.

### Density
`comfortable | compact`.
Chrome/panels only. Map layout/rectangles/projection must remain byte/stable
semantically unchanged.

### Motion
`system | reduce`.
System keeps prefers-reduced-motion. Reduce forces no transitions/animations.
Never force motion against the OS.

## Compatibilité

- no F-052 record => current defaults;
- resume v1/v2 unchanged;
- locale unchanged;
- no destructive migration;
- malformed workspace => safe open + explicit correction.

## Writes

Reuse debounce/flush patterns. Do not write SQLite on every raw pan pointer
event. Explicit toggles/preferences must be durable before normal close.

## Proof

Implement every P19-1..P19-14 criterion and falsification from TASK-0053.

Real WebView2 multi-process mandatory:

A. configure three brains + 3-brain composition + nondefault global view /
selection + legend open + compact + reduce + branch focus/two collapses + FR +
distinct per-brain resume and seen; normal close.

B. restart and compare every value exactly; exit branch focus and prove prior
composition/view/selection restore; check computed compact/reduced styles;
change values including legend closed + EN; close.

C. restart again; then controlled rebuild of a brain carrying node refs;
restart; prove explicit corrections and no stale node-id aliasing.

Fingerprint source/Index/journal/relations/exclusions around preference-only
gestures.

## Documentation

Resolve M-1 ownership explicitly in matrix/parity once implemented, but do not
mark CLOSED/VERIFIED yourself.

## Validation

Rust/frontend full pertinent suites, pnpm check/build, Tauri debug, WebView2,
axe, diff-check, public audit.

## Fin

- TASK-0053 IMPLEMENTED/candidate;
- F-052 IMPLEMENTED/candidate;
- M-1/P-19 candidate closure only;
- F-046 unchanged;
- aucune TASK-0054;
- RESULT/NEXT_ACTION complets;
- commit+push, arbre propre.
