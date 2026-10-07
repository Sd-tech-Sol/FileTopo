# ACTION-0096 — Contrôle indépendant de TASK-0052

- **Date :** 2026-10-06
- **Statut :** `CHANGES_REQUIRED — corrective ciblée`
- **Tâche :** `TASK-0052 — V1 Branch Focus & Collapse / F-042 Closure`
- **Branche :** `build/v0.2-a36-v1-branch-focus-collapse`
- **HEAD contrôlé :** `00f9db20ca5b09e0b466c84a5d78bc240902e32b`
- **HEAD produit prouvé :** `bdb5e91d677ec6dd0c64de2f93506cc1aa1ad17a`

## Verdict

TASK-0052 n'est pas VERIFIED. L'implémentation et la preuve sont solides dans
leur quasi-totalité, mais elles ajoutent une exception non autorisée :
**la racine du branch focus ne peut pas être repliée**.

## Ce qui est accepté

- vraie projection backend du sous-arbre, aucun masque frontend;
- zéro ancêtre/frère/autre cerveau dans le DTO focalisé;
- matérialisation bornée et agrégats honnêtes;
- `descendant_count` exact via CTE récursif + index parent;
- collapse = retrait pur de la projection de référence;
- expand = projection de référence;
- replis indépendants;
- agrégats distincts des replis;
- FR/EN, Enter/Space, focus sûr;
- composition/vue/sélection restaurées à la sortie;
- source/Index/journal/seen/relations inchangés;
- état F-042 session-only, aucun write P-19;
- restart réel confirmant la non-persistance.

L'usage du repli uniquement dans la projection de branche focalisée est accepté
pour cette tranche : la projection ordinaire actuelle n'expose qu'un niveau de
descendance. La vue de branche est précisément la vue récursive prévue par
DEC-0050.

## Bloqueur — racine focalisée non repliable

Le contrat dit :

- DEC-0050 A : « un dossier visible peut cacher/restaurer exactement ses
  descendants dans cette vue »;
- DEC-0050 D : « un dossier replié reste visible, mais aucun de ses descendants
  n'est matérialisé »;
- TASK-0052 F42-4 : « Replier un dossier visible garde le dossier mais retire
  exactement tous ses descendants rendus ».

Aucune exception n'exclut le dossier racine de la branche focalisée.

Pourtant :

- backend : `collapsed_ids` filtre explicitement `id != root`;
- frontend : `canCollapse(..., rootNodeId, ...)` rend le contrôle indisponible;
- UI : affiche explicitement `rootCannotCollapse`;
- test : `a_collapsed_id_outside_the_subtree_or_on_the_root_changes_nothing`
  fige cette exception.

Cette règle est donc une réduction de portée inventée par l'implémentation.

## Corrective

1. Autoriser le root focalisé dans `collapsed_ids`.
2. Replier le root garde **exactement le root** dans la projection.
3. `hiddenDescendantCount` du root = tous ses descendants réels.
4. Aucun aggregate ne représente le root lorsqu'il est replié.
5. La sélection reste sur le root.
6. Le bouton devient `Déplier / Expand`, clavier sûr.
7. Déplier le root redonne byte-for-byte la projection de référence aux champs
   déterministes attendus.
8. Les replis descendants déjà testés ne régressent pas.
9. Supprimer la copie/UI `rootCannotCollapse` et les tests qui consacrent
   l'exception.
10. Ajouter falsification : réintroduire l'exclusion du root doit faire échouer
    le test et WebView2.

Aucune TASK-0053.
