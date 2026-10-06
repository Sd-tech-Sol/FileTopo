# NEXT_PROMPT — TASK-0052 — V1 Branch Focus & Collapse / F-042

**TARGET_AGENT:** CLAUDE CODE
**RECOMMENDED_MODEL:** Claude Sonnet 5.5
**RECOMMENDED_EFFORT:** High
**STATUS:** READY
**BRANCH:** `build/v0.2-a36-v1-branch-focus-collapse`

## Objectif

Implémenter intégralement TASK-0052 selon DEC-0050.

## Préconditions

1. Applique `AGENTS.md`.
2. Checkout la branche cible, fetch + fast-forward seulement.
3. Arbre propre.
4. Lis ACTION-0095, DEC-0050, TASK-0052.
5. Audit reuse-first avant code :
   `projection.rs`, `hierarchy.rs::children_page`, `MapApp.changeProjection`,
   `compositionSession.ts`, `MapView`, agrégats, focus clavier.

## Frontière

- pas de whole-graph DTO;
- pas de masque CSS présenté comme une projection;
- pas de nouvelle DB;
- pas de colonne persistante subtree count sans STOP;
- pas de persistance P-19 dans cette tranche;
- pas de F-046;
- aucune TASK-0053.

## Implémentation

Construis la plus petite extension du materializer qui satisfait DEC-0050 :

- branch focus strict : aucun nœud extérieur au sous-arbre;
- remplissage descendant borné et déterministe;
- collapsed ids respectés;
- exact `hiddenDescendantCount`;
- expand inverse propre;
- UI FR/EN et clavier;
- sortie du branch focus restaure la session précédente.

Réutilise les agrégats pour budget/pagination, mais **ne les confonds jamais**
avec l'état collapsed.

Si le compte exact de descendants exige une primitive Index, implémente une
requête exacte, testée et index-driven; ne sérialise jamais les descendants.

## Preuves

Suis tous les critères F42-1..F42-12 et les falsifications de TASK-0052.

WebView2 réel obligatoire, avec :

- multi-brain → branch focus mono-brain;
- zéro nœud extérieur;
- collapse profond + compte indépendant exact;
- expand = projection de référence;
- deux collapses indépendants;
- exit = composition/vue/sélection restaurées;
- Enter + Space;
- axe/focus/non-couleur;
- source/Index/journal/seen/relations inchangés;
- restart montrant explicitement que l'état F-042 reste session-only.

## Validation

Rust/frontend complets pertinents, pnpm check/build, Tauri debug, WebView2,
diff-check, audit public.

## Fin

- TASK-0052 IMPLEMENTED / candidate contrôle indépendant;
- F-042 candidate, jamais VERIFIED par l'exécuteur;
- P-19 reste PARTIELLE;
- aucune TASK-0053;
- NEXT_ACTION = contrôle indépendant TASK-0052;
- RESULT complet;
- commit + push, arbre propre.
