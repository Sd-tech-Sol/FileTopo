# NEXT_PROMPT — TASK-0052 corrective root-collapse after ACTION-0096

**TARGET_AGENT:** CLAUDE CODE
**RECOMMENDED_MODEL:** Claude Sonnet 5.5
**RECOMMENDED_EFFORT:** Medium
**STATUS:** READY
**BRANCH:** `build/v0.2-a36-v1-branch-focus-collapse`

## Objectif unique

Fermer le seul écart indépendant de TASK-0052 : le dossier root de la branche
focalisée doit être repliable comme tout autre dossier visible.

## Préconditions

1. Applique `AGENTS.md`.
2. Checkout/fetch/fast-forward, arbre propre.
3. Lis ACTION-0096, DEC-0050 §L et la corrective TASK-0052.
4. Ne refais pas l'architecture.

## Backend

Dans `branch_projection.rs` :

- retire l'exclusion `id != root`;
- un root présent dans `collapsed_ids` doit être reconnu comme replié;
- la projection résultante contient exactement le root;
- `hiddenDescendantCount = descendant_count(root)`;
- aucun aggregate dont `parentId == root` ne subsiste pendant le repli;
- les collapsed ids hors sous-arbre / fichiers / inconnus restent sans effet;
- les replis descendants existants restent inchangés.

Ajuste les tests :
- remplace le test qui dit que root ne change rien;
- ajoute root collapse exact;
- root expand = référence exacte;
- arbre profond + large;
- count ≠ child_count sur un root multi-niveaux.

## Frontend

- supprime `rootCannotCollapse`;
- `canCollapse` doit accepter le root dossier;
- sélection root → bouton Replier;
- après repli → bouton Déplier avec compte exact;
- sélection reste root;
- Enter et Space;
- focus jamais body;
- la liste des replis peut inclure le root si utile, sans dupliquer/confondre
  le bouton principal.

Aucune modification P-19.

## WebView2

Étends le vrai scénario TASK-0052 :

1. entrer dans un branch focus;
2. sélectionner le root;
3. replier par vraie touche Enter;
4. confirmer DTO/DOM = root seul;
5. confirmer hidden count = référence indépendante disque;
6. confirmer aucun aggregate du root;
7. confirmer focus/label Déplier;
8. déplier par Space;
9. comparer projection/nœuds/arêtes/agrégats à la référence pré-repli;
10. répéter au moins l'autre paire Space→Enter;
11. confirmer invariants source/Index/journal/seen/relations/resume inchangés.

## Falsification obligatoire

Réintroduire temporairement l'exclusion du root :
- test ciblé et preuve WebView2 doivent échouer.
Restaurer puis PASS.

## Validation

Rejoue ciblés + suites pertinentes, pnpm check/build, Tauri debug, WebView2,
diff-check, audit public.

## Fin

- TASK-0052 IMPLEMENTED / candidate re-control;
- jamais VERIFIED par l'exécuteur;
- P-19 PARTIELLE;
- aucune TASK-0053;
- RESULT/NEXT_ACTION à jour;
- commit+push, arbre propre.
