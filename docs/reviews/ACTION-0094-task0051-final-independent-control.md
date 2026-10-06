# ACTION-0094 — Re-contrôle indépendant final de TASK-0051

- **Date :** 2026-10-05
- **Statut :** `CLOSED — VERIFIED`
- **Tâche :** `TASK-0051 — V1 Approved Relation Revocation / P-04 Closure`
- **Branche :** `build/v0.2-a35-v1-approved-relation-revocation`
- **HEAD produit corrective prouvé :** `1418262e4e4edf7e131bdb7d96fe9992066b1f5a`
- **HEAD documentaire contrôlé :** `50370c78a33a40b95747eb211ab5a3fcf4b12486`
- **Verdict :** `VERIFIED`

## Contrôle indépendant

La corrective ACTION-0093 ferme le seul bloqueur restant.

### Garde stale

`revoke_relation` ne contient plus de garde de fraîcheur moteur.

La garde stale de `approve_suggestion` est intacte : une suggestion core
pending périmée reste non approuvable.

Les sorties automatiques core stale restent filtrées comme non actuelles.

### Test store/commande

Le test
`a_core_approval_is_revocable_while_the_engine_is_stale` prouve :

- suggestion core créée et approuvée;
- moteur rendu STALE;
- revoke APPROVED réussit malgré STALE;
- moteur reste STALE;
- suggestion store = `pending`;
- `decided_unix_ms = NULL`;
- relation APPROVED absente;
- tentative de réapprobation stale toujours refusée.

### WebView2 réel

La preuve `staleCoreRevocation` du HEAD produit courant prouve :

- CURRENT → approbation core par touche réelle;
- nouvelle génération identique → STALE sans rerun;
- APPROVED humaine toujours visible;
- contrôle Révoquer visible;
- activation Enter fiable, sans clic programmatique;
- relation absente ensuite;
- moteur toujours STALE;
- pending stale non présentée comme actuelle;
- focus posé sur `Analyser les relations`;
- digest Index, empreinte source et store cross inchangés autour du geste;
- rerun explicite seulement ensuite;
- pending réapparaît avec `decidedUnixMs = null`;
- aucune réapprobation automatique.

### Régression

Le cas CURRENT conserve le focus vers l'approbation de la même suggestion.
Le fallback n'est utilisé que lorsque cette cible n'existe pas.

La preuve corrective est attachée à
`1418262e4e4edf7e131bdb7d96fe9992066b1f5a`; le commit suivant ne modifie que
documentation et artefact.

Aucun check GitHub Actions n'est attaché à ce commit; il n'existe donc pas de
CI distante supplémentaire à citer. Les preuves disponibles sont les tests,
builds et WebView2 enregistrés dans le repo.

## Verdict

- `TASK-0051 = VERIFIED`
- `P-04 = CLOSED / VERIFIED`
- `F-017` reste IMPLEMENTED, manque de révocation fermé
- `F-041` reste IMPLEMENTED, manque de révocation fermé
- `P-19` inchangée
- aucune TASK-0052 créée par ce contrôle.
