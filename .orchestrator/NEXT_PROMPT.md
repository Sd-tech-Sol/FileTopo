# NEXT_PROMPT — Public-readiness cleanup before TASK-0038

**TARGET_AGENT:** CLAUDE CODE  
**RECOMMENDED_MODEL:** Sonnet 5, medium effort  
**STATUS:** READY  
**OWNER:** orchestrateur ChatGPT  
**BRANCHE:** `chore/v0.2-public-readiness-cleanup`

## /goal

Fermer uniquement la porte de confidentialité héritée relevée par
`ACTION-0061` après la vérification de `TASK-0037`.

`TASK-0037` est déjà **VERIFIED**. Ne modifier ni son code ni son modèle de
journal. Ne créer aucune `TASK-0038` dans cette passe.

Le tree courant doit redevenir conforme à la règle publique : **aucun chemin
local utilisateur réel / donnée locale personnelle dans les fichiers
versionnés courants**.

## 0 — Préconditions

1. Appliquer `AGENTS.md` et `CLAUDE.md`.
2. Basculer explicitement sur `chore/v0.2-public-readiness-cleanup`.
3. `git fetch origin`, synchronisation fast-forward seulement.
4. Arbre propre avant toute modification.
5. Lire :
   - `docs/reviews/ACTION-0061-independent-control.md`;
   - `docs/ai/NEXT_ACTION.md`;
   - `scripts/audit-public-readiness.ps1`;
   - la section historique de `docs/ai/VALIDATION.md` signalée par l’audit.
6. Ne pas modifier `main`, ne pas fermer de PR, ne pas faire de merge/tag/release.

## 1 — Nettoyage courant, pas réécriture historique

Le contrôle actuel signale au minimum un ancien **chemin Git local absolu**
dans la section TASK-0027 de `docs/ai/VALIDATION.md`.

Corriger le **tree courant** seulement :

- remplacer la valeur concrète par une formulation générique qui conserve le
  sens de la preuve, par exemple `racine Git locale` ou une valeur synthétique
  non personnelle;
- ne pas supprimer le fait historique (branche, HEAD, état propre, etc.);
- ne pas inventer une ancienne valeur de remplacement précise;
- ne pas réécrire l’historique Git;
- ne pas prétendre que les anciens commits déjà publiés ont été purgés.

## 2 — Audit élargi mais borné

Après la première correction, rechercher dans le tree courant les formes de
chemins utilisateurs absolus qui contreviennent aux règles du dépôt, notamment
les familles Windows/macOS/Linux usuelles, **en excluant les fixtures
explicitement synthétiques**.

Le but est de fermer les occurrences réelles, pas de faire un remplacement
aveugle de chaînes techniques légitimes.

Pour chaque correspondance supplémentaire :

- déterminer si c’est une vraie donnée locale ou une fixture/documentation
  générique;
- ne modifier que les vraies données locales;
- préserver la valeur documentaire de la preuve.

## 3 — Preuve obligatoire

Exécuter au minimum :

- `scripts/audit-public-readiness.ps1 -AllowRemotes` → **PASS**;
- `git diff --check` → propre;
- une recherche ciblée supplémentaire sur les chemins utilisateurs absolus →
  aucune donnée locale réelle restante dans le tree courant.

Comme cette passe est documentaire seulement, ne rejoue pas les suites Rust/TS
complètes sauf si un fichier produit est touché — ce qui serait en soi un écart
à cette portée.

## 4 — Mémoire durable

Mettre à jour uniquement ce qui est nécessaire pour rendre la reprise claire :

- `.orchestrator/RESULT.md`;
- `docs/ai/CURRENT_STATE.md`;
- `docs/ai/HANDOFF.md`;
- `docs/ai/NEXT_ACTION.md`;
- `docs/ai/CHANGELOG_AI.md`.

Consigner explicitement :

- `TASK-0037 = VERIFIED` par `ACTION-0061`;
- l’audit public-readiness est revenu au vert;
- le nettoyage concerne le tree courant et **ne constitue pas une réécriture
  de l’historique Git**;
- la prochaine action devient alors l’audit/orchestration de la tranche V1
  suivante — sans précréer `TASK-0038` toi-même.

## 5 — Sortie attendue

- aucune modification fonctionnelle;
- aucun chemin utilisateur absolu réel dans le tree courant;
- audit public-readiness vert;
- commit + push uniquement sur `chore/v0.2-public-readiness-cleanup`;
- arbre propre;
- aucun PR/merge/tag/release;
- aucun `TASK-0038` créé.

À la fin, `.orchestrator/RESULT.md` doit donner le HEAD final, les fichiers
assainis, les audits exécutés et les limites.
