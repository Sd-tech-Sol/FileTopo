# NEXT_PROMPT — Correctif final de la porte public-readiness après ACTION-0062

**TARGET_AGENT:** CLAUDE CODE  
**RECOMMENDED_MODEL:** Sonnet 5, low effort  
**STATUS:** READY  
**BRANCHE:** `chore/v0.2-public-readiness-cleanup`

## /goal

Fermer uniquement **R2** de
`docs/reviews/ACTION-0062-public-readiness-recontrol.md`.

Le nettoyage du tree courant est accepté. Le seul problème restant est que
`scripts/audit-public-readiness.ps1` tolère globalement les noms d’utilisateur
synthétiques `quelquun` et `other`, ce qui affaiblit inutilement l’audit.

Ne toucher ni au code produit ni à TASK-0037. Ne créer aucune TASK-0038.

## Préconditions

1. Appliquer `AGENTS.md` et `CLAUDE.md`.
2. Basculer explicitement sur `chore/v0.2-public-readiness-cleanup`.
3. `git fetch origin`, fast-forward seulement.
4. Arbre propre.
5. Lire `ACTION-0062` en entier avant modification.

## Correction unique

Dans `scripts/audit-public-readiness.ps1`, remplacer l’allowlist globale par
une exception **contextuelle**.

Contrat minimal :

- `src-tauri/src/map/sandbox.rs` peut tolérer le nom synthétique
  `quelquun`;
- `src-tauri/src/scale_spike/profile.rs` peut tolérer le nom synthétique
  `other`;
- ces noms doivent rester **bloqués partout ailleurs**;
- aucune autre exception utilisateur ne doit être ajoutée;
- ne pas modifier les fichiers Rust de fixtures dans cette passe.

Une structure du genre mapping
`repo-relative-file -> allowed synthetic usernames` est acceptable si la
comparaison est exacte et lisible.

## Preuves obligatoires

1. `scripts/audit-public-readiness.ps1 -AllowRemotes` → PASS.
2. Test négatif temporaire hors des deux fichiers autorisés :
   - un chemin macOS complet dont le dossier utilisateur est `other` doit être détecté;
   - un chemin Windows complet dont le dossier utilisateur est `quelquun` doit être détecté.
3. Les fixtures existantes des deux fichiers autorisés ne doivent pas faire
   échouer l’audit.
4. `git diff --check` → propre.
5. Aucun fichier produit, Rust/TS, n’est modifié.

## Mémoire durable

Mettre à jour uniquement :

- `.orchestrator/RESULT.md`;
- `docs/ai/NEXT_ACTION.md`;
- au besoin une courte note dans `CHANGELOG_AI.md`.

Consigner que :

- ACTION-0062 R2 est fermée;
- le tree courant reste assaini;
- l’audit reste strict pour `other` / `quelquun` hors des fixtures nommées;
- l’historique Git n’a pas été réécrit;
- aucune TASK-0038 n’est créée par l’exécuteur.

## Sortie

Commit + push uniquement sur
`chore/v0.2-public-readiness-cleanup`, arbre propre, aucun PR/merge/tag/release.
