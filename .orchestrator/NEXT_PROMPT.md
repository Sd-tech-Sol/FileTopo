# NEXT_PROMPT — TASK-0050 — V1 Runtime Legend / P-10 Closure

**TARGET_AGENT:** CODEX
**RECOMMENDED_MODEL:** GPT-5.6 Sol
**RECOMMENDED_EFFORT:** Medium
**STATUS:** READY
**BRANCH:** `build/v0.2-a34-v1-runtime-legend`

## Objectif unique

Exécute intégralement
`docs/tasks/TASK-0050-v1-runtime-legend-p10.md`
selon
`docs/decisions/DEC-0048-runtime-legend-boundary.md`.

F-014 / P-10 seulement. Aucune TASK-0051.

## 0 — préconditions

1. Applique `AGENTS.md` et les instructions Codex du repo.
2. Bascule explicitement sur
   `build/v0.2-a34-v1-runtime-legend`.
3. `git fetch origin`.
4. Synchronise seulement en fast-forward avec
   `origin/build/v0.2-a34-v1-runtime-legend`.
5. Vérifie arbre propre.
6. Lis ACTION-0084, ACTION-0085, DEC-0048, TASK-0050.
7. Vérifie que TASK-0049/F-006 sont VERIFIED.
8. Lis MapView.tsx, map.css, mapStrings.ts et TASK-0047-webview2.json
   (section nonColour).

STOP/BLOCKED si une précondition est fausse.

## 1 — audit avant code

Dresse dans RESULT la liste **réelle** des codages de la carte et leurs
primitives existantes.

Ne pars pas de l'ancien prototype.

Cherche une légende existante avant d'en créer une.

## 2 — frontend uniquement

Aucun Rust/backend attendu.

Si tu crois qu'un changement Rust/Tauri/SQLite est nécessaire, STOP/BLOCKED au
lieu de l'introduire.

Pas de nouvelle dépendance.

## 3 — légende à la demande

Ajouter un contrôle `Légende / Legend` dans MapApp :

- bouton clavier;
- aria-expanded;
- aria-controls/association panneau;
- panneau nommé;
- fermeture par le même bouton;
- pas de modal/focus trap.

État session-only pour TASK-0050.

**Ne modifie pas resume v2.** La persistance de la légende appartient à P-19.

## 4 — même langage visuel que MapView

Les échantillons utilisent les mêmes :

- classes CSS;
- glyphes;
- patterns;
- primitives SVG.

Aucune couleur/dash copiée inline.

Extraction minimale d'un helper autorisée si MapView et Legend l'utilisent tous
les deux.

## 5 — couverture exhaustive et testable

Couvre toutes les familles DEC-0048 §C :

- root/directory/file/skipped;
- selected/related/linked/cross-linked;
- filter match/context;
- diagnostic;
- focused brain;
- hierarchy normal/touching;
- intra established/suggestion/approved/touching;
- inter crossing/established/suggestion/approved/touching;
- aggregate.

Établis une **clé sémantique de couverture** issue du rendu réel, pas deux
listes manuelles copiées.

Le test doit rendre une carte riche et prouver :
`map semantic keys ⊆ legend keys`.

Un codage carte exercé sans item doit casser.

## 6 — mots produit FR/EN

Chaque exemple a un texte clair.

Aucun nom CSS interne visible.

Réutilise la mécanique locale TASK-0046.

## 7 — accessibilité

Réutilise TASK-0047 :

- non color-only;
- focus visible;
- clavier Enter/Space;
- aucun piège;
- contraste;
- axe sans nouvelle violation;
- échantillons décoratifs aria-hidden si le texte adjacent suffit.

## 8 — WebView2

Publie `docs/performance/runs/TASK-0050-webview2.json`.

Scénario riche ≥ 2 cerveaux avec relations, filtre, diagnostic et agrégat :

1. légende fermée;
2. ouverture clavier;
3. FR;
4. couverture de toutes les clés;
5. changement EN;
6. mêmes classes/computed signatures carte ↔ légende quand applicable;
7. axe fermé/ouvert;
8. traversal Tab sans piège;
9. fermeture/réouverture même session;
10. zéro commande backend causée par les gestes de légende;
11. source SHA / Index / journal / resume inchangés.

Persistance restart : **NON TESTED / P-19**, explicitement.

## 9 — falsifications

Exécute TASK-0050 §J.

Aucun sabotage final.

## 10 — validation

- ciblés TypeScript;
- pnpm test;
- pnpm check;
- pnpm build;
- Tauri debug;
- WebView2;
- axe local;
- git diff --check;
- audit public.

## 11 — gouvernance

À la fin :

- TASK-0050 = IMPLEMENTED, jamais auto-VERIFIED;
- F-014 = IMPLEMENTED;
- P-10 = IMPLEMENTED/candidate contrôle indépendant;
- P-19 reste PARTIELLE;
- aucune TASK-0051;
- NEXT_ACTION = contrôle indépendant TASK-0050;
- commit + push;
- arbre propre;
- RESULT complet.
