# ACTION-0082 — Contrôle indépendant final de TASK-0048

- Date : 2026-09-26
- Statut : `CLOSED`
- Tâche : `TASK-0048 — V1 Safe Exclusion Policy`
- Branche : `build/v0.2-a32-v1-safe-exclusion-policy`
- HEAD contrôlé : `fb8a7a610440973575991d61b97ccc057a97bb9f`
- Commit correctif : `00b1017fbdd263b0f0950aacb80315fe3480cd1f`
- Verdict : `VERIFIED` dans la portée F-005

## Verdict

**PASS. TASK-0048 et F-005 sont VERIFIED dans leur portée V1.**

ACTION-0081 avait accepté le backend/scanner/watcher/journal mais refusé
VERIFIED à cause d'une course frontend A→B dans
`ExclusionsPanel.replace()`. La corrective ferme précisément ce défaut.

## Contrôle indépendant de la corrective

Le composant porte maintenant une génération brain-scoped :

- la génération est remplacée dès qu'un nouveau `brainId` est rendu;
- une mutation capture la génération courante avant son `await`;
- un retour stale renvoie `false` avant tout `setPolicy`;
- une erreur stale n'écrit pas `setError`;
- le `finally` stale ne touche pas `busy`;
- `onApplied` n'est appelé que pour la génération courante;
- la génération est recontrôlée après `onApplied` avant de rendre le succès à
  `add/remove`, donc un ancien add ne vide pas le draft du nouveau cerveau.

## Tests R1–R4 inspectés

1. R1 : succès A après rerender B — B reste affiché, draft B conservé, aucun
   `onApplied(A)`, aucun état busy/error A.
2. R2 : l'édition suivante B envoie exactement les règles B + le draft B.
3. R3 : rejet A après passage B — aucune erreur A dans B.
4. R4 : une mutation courante publie la réponse canonique backend et appelle
   `onApplied` normalement.

Le diff correctif ne touche aucun fichier Rust/backend, manifeste ou artefact
de données.

## Preuves exécuteur conservées comme telles

Codex rapporte : ciblé 7 PASS; frontend 625 PASS; check/build/Tauri debug PASS;
WebView2 TASK-0048 PASS phases 1/2 sur une campagne fraîche; diff check et audit
public PASS.

Il n'existe aucun check GitHub Actions/status attaché au HEAD contrôlé. Le
contrôle indépendant n'a pas réexécuté ces commandes; il a vérifié le diff, les
gardes et les scénarios déterministes.

## Conclusion

- `TASK-0048 = VERIFIED`
- `F-005 = VERIFIED dans sa portée`
- `ACTION-0081 = CLOSED`
- prochaine lacune P0 auditée séparément : F-006.
