# NEXT_PROMPT — TASK-0055 — Physical Object Identity / F-046 Closure

**TARGET_AGENT:** CLAUDE CODE
**RECOMMENDED_MODEL:** Claude Opus 5.5
**RECOMMENDED_EFFORT:** High
**STATUS:** READY
**BRANCH:** `build/v0.2-a39-v1-physical-identity-closure`
**BASE_ORCHESTRATION:** `393ac6d190295d979b58c9a03cc4712391d93335`

## Démarrage

Fais un fetch puis synchronise la branche **fast-forward seulement**.
L'arbre doit être propre.

Lis intégralement :

1. `AGENTS.md`;
2. `docs/reviews/ACTION-0102-v1-gap-audit-after-action0101.md`;
3. `docs/decisions/DEC-0052-node-vs-physical-identity.md`;
4. `docs/tasks/TASK-0055-v1-physical-identity-closure.md`;
5. TASK-0036 / ACTION-0060;
6. DEC-0009, DEC-0013, DEC-0035;
7. TASK-0023 / ACTION-0039;
8. TASK-0026 / ACTION-0043.

**Fais `/clear` avant cette tâche.** Tout le contexte obligatoire est
versionné et cette tranche touche une sémantique d'identité/migration : ne
réutilise pas un contexte Claude précédent partiel.

## Mission

Fermer le seul gap fonctionnel F-046 sans ajouter de nouveau moteur.

Le point central :

> `nodes.id` = occurrence unique dans l'arborescence.
> Une `stable_key` SYSTEM = objet physique Windows et peut être partagée par
> plusieurs occurrences (hard links).

Le code actuel refuse cette situation. Corrige-la conformément à DEC-0052.

## Reuse-first

Avant code, écris le tableau EXISTE / ADAPTER / MANQUANT dans le rapport.

Réutilise :
- GetFileInformationByHandleEx / FILE_ID_INFO existant;
- stable_key/provenance existants;
- M-B migrations;
- SHA-256 existant;
- ExactDuplicateExplorer;
- relation engine existant.

**N'ajoute pas FILE_STANDARD_INFO / NumberOfLinks si la clé SYSTEM existante
suffit.** N'ajoute pas de dépendance Windows.

## Migration

Schéma 6→7, minimal :
- enlever l'unicité SQL de stable_key;
- recréer l'index non unique;
- aucune nouvelle colonne par défaut;
- M-B + rollback + validation.

## Remap

Implémente les groupes SYSTEM exactement selon DEC-0052 :
- 1↔1 conserve le comportement historique;
- multiple = exact relative_path d'abord;
- aucun appariement ambigu;
- nouveaux ids monotones;
- PATH_FALLBACK dupliqué toujours refusé.

Audit obligatoire de full publish + incremental + watcher + rebase + rebuild.

## Classification produit

ExactDuplicateExplorer doit recevoir seulement :
- PROVEN_SHARED + count;
- PROVEN_SINGLE + count 1;
- UNKNOWN.

Brain-scoped.

**Interdit** : stable_key, VolumeSerialNumber, FileId ou dérivé/hash de ces
valeurs dans IPC, TypeScript, DOM, logs ou artefacts.

Affiche clairement que :
- objet physique = preuve OS;
- contenu identique = SHA-256;
- copie probable = non inférée;
- nom similaire = non inféré;
- relation logique = indépendante.

Aucun algorithme de copie/similarité.

## Preuve Windows

Utilise `std::fs::hard_link` si possible.

Fixture temporaire :
- A;
- B hard link de A;
- C copie byte-for-byte;
- deux fichiers vides distincts.

Prouve la séparation des concepts, le refresh/redémarrage, la stabilité F-004,
l'absence de relation automatique et l'absence de fuite de clé.

Le baseline de fingerprint source commence **après** création de la fixture.

## Falsifications

Les 10 falsifications de TASK-0055 §11 doivent être effectives et
discriminantes. Pas de tableau théorique.

## Validation

Exécute intégralement TASK-0055 §12.

Si le changement de modèle révèle qu'un flux incrémental/watcher ne peut pas
être rendu cohérent sans élargir fortement la portée, STOP et documente
`BLOCKED` au lieu de bricoler une deuxième règle.

## Fin

- TASK-0055 / F-046 = IMPLEMENTED / candidates, jamais VERIFIED;
- aucune TASK-0056;
- RESULT/VALIDATION/CURRENT_STATE/HANDOFF/NEXT_ACTION à jour;
- artefacts publics sans donnée machine;
- commit/push;
- git status propre;
- STOP.

Le prochain verdict appartient à ChatGPT.
