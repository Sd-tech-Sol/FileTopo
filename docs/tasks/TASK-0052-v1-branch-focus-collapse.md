# TASK-0052 — V1 Branch Focus & Collapse / F-042 Closure

- **Date :** 2026-10-06
- **Statut :** `IMPLEMENTED` — corrective ACTION-0096 livrée, candidate à re-contrôle indépendant
- **Branche :** `build/v0.2-a36-v1-branch-focus-collapse`
- **Décision :** `DEC-0050`
- **Portée :** `F-042`, régressions `F-050/F-051`, préparation `P-19`
- **Exécuteur prévu :** Claude Code

## Objectif

Livrer les gestes MVP de navigation progressive :

- focaliser une branche;
- quitter le focus;
- replier un dossier;
- déplier un dossier;

avec vue bornée, compte exact des descendants masqués, clavier réel et aucune
mutation des données.

## Reuse-first obligatoire

Avant code, inventorier et réutiliser :

- `projection.rs::materialize_view`;
- `hierarchy::children_page` et ordre canonique;
- VIEW_BUDGET / ordinary target;
- `MapApp.changeProjection`;
- `compositionSession.ts`;
- `MapView` / agrégats / focus clavier;
- `resumeState` seulement comme frontière à ne pas modifier.

## Critères F42-1 à F42-12

| ID | Critère |
|---|---|
| F42-1 | Focus d'un dossier affiche uniquement ce dossier et des nœuds de son sous-arbre; aucun ancêtre/frère/autre cerveau. |
| F42-2 | Le mode focalisé est annoncé en FR/EN avec chemin et bouton de sortie. |
| F42-3 | Quitter le focus restaure exactement la composition/vue/sélection session précédente. |
| F42-4 | Replier un dossier visible garde le dossier mais retire exactement tous ses descendants rendus. |
| F42-5 | Le dossier replié expose un `hiddenDescendantCount` exact de tous ses descendants réels. |
| F42-6 | Déplier restaure déterministement la vue antérieure à état/budget/pagination identiques. |
| F42-7 | Plusieurs dossiers repliés restent indépendants; replier A ne modifie pas B. |
| F42-8 | VIEW_BUDGET et projection bornée restent respectés; aucun whole-graph DTO. |
| F42-9 | Les agrégats de budget/pagination restent distincts des états repliés. |
| F42-10 | Souris + clavier; Enter/Space; focus sûr lorsqu'un sous-arbre disparaît. |
| F42-11 | Source/Index/journal/seen/relations inchangés par tous les gestes. |
| F42-12 | État session-only explicitement prouvé; aucun write P-19 dans cette tranche. |

## Backend

Implémenter la surface minimale nécessaire.

Préférence d'architecture :

- une projection de branche explicite plutôt qu'un masque frontend;
- réutilisation des pages d'enfants;
- calcul exact de descendants côté Index.

Si une nouvelle primitive de count est ajoutée, tests obligatoires :

- feuille = 0;
- dossier simple;
- arbre profond;
- arbre large;
- nœud inconnu;
- exactitude contre comptage de référence synthétique;
- plan SQLite documenté;
- aucune collection de descendants renvoyée.

Ne pas ajouter une colonne persistante de subtree count sans STOP/décision.

## Frontend

État session-only :

- branch focus actif : brainId + rootNodeId;
- collapsed ids par brain/focus.

UI minimale FR/EN :

- `Focaliser la branche / Focus branch`;
- `Replier / Collapse`;
- `Déplier / Expand`;
- `Quitter le focus / Exit branch focus`;
- libellé avec compte exact masqué.

Ne pas confondre `Déplier` avec « Voir la suite » d'un agrégat.

## Filtre et composition

- entrer en branch focus depuis une vue filtrée quitte le filtre par le chemin
  de navigation existant et le dit;
- le focus de branche devient temporairement mono-cerveau;
- quitter restaure la composition précédente exacte en session.

## Preuve WebView2 réelle

Sur une fixture synthétique riche + une branche profonde :

1. composition multi-cerveaux initiale;
2. sélectionner un dossier et focaliser la branche au clavier;
3. prouver zéro node extérieur;
4. replier un dossier contenant plusieurs niveaux;
5. comparer `hiddenDescendantCount` à une requête indépendante de référence;
6. prouver descendants absents et autres nœuds de branche inchangés;
7. déplier et comparer la projection à l'état avant repli;
8. replier deux dossiers indépendants;
9. quitter le focus et retrouver composition/vue/sélection initiales;
10. refaire Enter et Space;
11. axe / focus / non-couleur;
12. redémarrer l'app et prouver explicitement que cet état n'est PAS restauré
    dans cette tranche (P-19 suivante).

## Falsifications

Au minimum :

1. utiliser `child_count` comme compte de descendants -> test profond échoue;
2. laisser un ancêtre/frère dans branch focus -> gate échoue;
3. masquer côté CSS sans changer projection -> gate DTO échoue;
4. collapse A retire un nœud hors sous-arbre -> échec;
5. expand ne restaure pas la projection de référence -> échec;
6. aggregate présenté comme collapsed -> échec;
7. write resume-state pendant ces gestes -> échec.

## Validation

- tests Rust ciblés + suite complète pertinente;
- tests frontend;
- `pnpm check`, `pnpm build`;
- Tauri debug;
- WebView2 réel;
- `git diff --check`;
- audit public.

## Gouvernance

À la fin :

- TASK-0052 = IMPLEMENTED / candidate contrôle indépendant;
- F-042 = candidate fermeture, jamais auto-VERIFIED;
- F-050/F-051 restent dans leur statut courant sauf preuve spécifique;
- P-19 reste PARTIELLE et devient la prochaine candidate logique;
- F-046 inchangée;
- aucune TASK-0053;
- RESULT complet, commit+push, arbre propre.

## Livraison

Code `bdb5e91d677ec6dd0c64de2f93506cc1aa1ad17a`; preuves : `docs/performance/runs/TASK-0052-webview2.json` et
`docs/ai/VALIDATION.md` section `DF`. F42-1 à F42-12 couverts; sept
falsifications effectives. **Jamais `VERIFIED` par l'exécuteur.**


## Corrective ACTION-0096 — root focalisé repliable

Le contrôle indépendant accepte F42-1..F42-12 sauf une réduction de portée :
le root de la branche focalisée est actuellement exclu du repli.

À corriger :

- backend : accepter root dans collapsed ids;
- projection repliée = root seulement;
- compte = tous les descendants réels;
- aucun aggregate du root pendant repli;
- UI : Replier/Déplier disponible sur le root;
- suppression de `rootCannotCollapse`;
- dépli = référence;
- preuve WebView2 Enter + Space et falsification de l'ancienne exclusion.

Le repli limité à la **vue de branche focalisée** reste accepté dans TASK-0052.
Aucune TASK-0053.

### Livraison de la corrective ACTION-0096

Code `cfba445bdaabc0d74a3bd6b7551fd6398e5b179d`; preuve `docs/performance/runs/TASK-0052-webview2.json`
(`rootCollapse`, HEAD testé `cfba445bdaabc0d74a3bd6b7551fd6398e5b179d`) et `docs/ai/VALIDATION.md` section `DH`.

- Backend : exclusion `id != root` retirée; le root (kind `directory` ou `root`)
  replié = root seul, compte exact, aucun agrégat, aucune arête.
- UI : `rootCannotCollapse` supprimé; `canCollapse(node, alreadyCollapsed)`.
- Tests Rust : root collapse exact (4 racines), compte ≠ `child_count`, root +
  descendant repliés, expand = référence; tests frontend Enter/Space + focus.
- WebView2 : root replié Enter→Space puis Space→Enter, projection = root seul,
  compte = disque (26), dépli = référence, invariants inchangés.
- Falsification : exclusion réintroduite ⇒ 3 tests Rust et la preuve WebView2
  échouent (« timeout: root collapsed »); restaurée ⇒ PASS.

**Jamais `VERIFIED` par l'exécuteur.** P-19 reste PARTIELLE. Aucune TASK-0053.
