# NEXT_PROMPT — ACTION-0081 corrective pass TASK-0048

**TARGET_AGENT:** CODEX
**RECOMMENDED_MODEL:** GPT-5.6 Sol
**RECOMMENDED_EFFORT:** Medium
**BRANCH:** `build/v0.2-a32-v1-safe-exclusion-policy`

Tu corriges **un seul défaut** trouvé par le contrôle indépendant de TASK-0048.

## Préconditions

1. Bascule explicitement sur
   `build/v0.2-a32-v1-safe-exclusion-policy`.
2. `git fetch origin`.
3. Synchronise en fast-forward avec
   `origin/build/v0.2-a32-v1-safe-exclusion-policy`.
4. Vérifie arbre propre.
5. Lis intégralement :
   - `docs/reviews/ACTION-0081-task0048-async-brain-isolation-corrective.md`;
   - `docs/tasks/TASK-0048-v1-safe-exclusion-policy.md`;
   - `src/map/ExclusionsPanel.tsx`;
   - `src/map/ExclusionsPanel.test.tsx`.

## Défaut à corriger

Un `map_brain_exclusions_replace` démarré sur A peut se résoudre après que
le composant affiche B. Le vieux callback peut alors publier policy/error/busy
de A dans B, appeler `onApplied(A)` et faire qu'une édition suivante de B
réutilise les règles A.

La lecture initiale possède un ticket; les mutations n'en ont pas.

## Correction

Implémente une génération/ticket brain-scoped robuste.

Après un changement de `brainId`, tout retour async d'une ancienne
génération doit être **sans effet frontend** :

- pas de `setPolicy`;
- pas de `setError`;
- pas de `setBusy`;
- pas de `onApplied`;
- pas de succès retourné au vieux `add/remove` qui pourrait vider/refocaliser
  le nouveau draft.

Le backend A peut finir son opération A : ne tente pas d'annuler ou de
compenser le backend.

Le cerveau B doit charger et fonctionner indépendamment.

## Tests obligatoires

Utilise des Promises différées et couvre exactement R1–R4 de ACTION-0081 :

- stale succès A après rerender B;
- édition B suivante avec payload B uniquement;
- stale rejet A après rerender B;
- comportement normal du replace courant.

Les tests doivent échouer sur le code actuel.

## Frontières

- **aucun changement Rust attendu**;
- aucune modification de policy backend, scanner, watcher, journal, SQLite ou
  artefact de données;
- aucun nouveau package;
- pas de refactor opportuniste;
- aucune TASK-0049.

## Validation

1. tests ciblés ExclusionsPanel;
2. `pnpm test`;
3. `pnpm check`;
4. `pnpm build`;
5. rejoue `scripts/task0048-webview2.ps1` sur le produit final;
6. `git diff --check`;
7. audit public.

Si le harnais WebView2 échoue pour une raison indépendante du correctif, ne
masque rien : documente précisément.

## Fin

- commit + push sur la branche courante;
- arbre propre;
- TASK-0048 reste `IMPLEMENTED`, jamais auto-VERIFIED;
- NEXT_ACTION = nouveau contrôle indépendant TASK-0048;
- aucune TASK-0049;
- mets `.orchestrator/RESULT.md` à jour avec :
  - cause;
  - correction;
  - tests R1–R4;
  - validations;
  - HEAD final.
