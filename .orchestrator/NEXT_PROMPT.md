# NEXT_PROMPT — TASK-0050 corrective finale — 23 clés runtime + diagnostic invariant

**TARGET_AGENT:** CLAUDE CODE
**RECOMMENDED_MODEL:** Claude Sonnet 5
**RECOMMENDED_EFFORT:** Medium
**STATUS:** READY
**BRANCH:** `build/v0.2-a34-v1-runtime-legend`

## Objectif unique

Terminer TASK-0050 selon ACTION-0087 et l'amendement DEC-0048 §K.

Aucune TASK-0051. Aucun changement Rust/backend.

## 0 — préconditions

1. Applique `AGENTS.md` et les instructions Claude Code du repo.
2. Bascule sur `build/v0.2-a34-v1-runtime-legend`.
3. `git fetch origin`, fast-forward seulement.
4. Vérifie arbre propre.
5. Lis ACTION-0086, ACTION-0087, DEC-0048 §K, TASK-0050 §§O-P.
6. Vérifie que le correctif cross-linked du commit
   `fa429db6f2324269bfddd21b78be6b1f5eed9785` est présent.

STOP/BLOCKED si une précondition est fausse.

## 1 — frontière ferme

Ne modifie PAS :

- Rust/backend/SQLite/Tauri commands;
- resume v2;
- P-19;
- dépendances.

`node-diagnostic` reste dans la légende et le contrat 24/24, mais il est
explicitement non atteignable dans WebView2 réel tant que
`commands.rs:745-749` refuse les diagnostics de scan.

Ne cherche plus à contourner cet invariant.

## 2 — rendre reproductible la preuve réelle 23/23

Transforme la séquence de gestes produit découverte dans la passe précédente
en harnais reproductible `scripts/task0050-webview2.mjs` / scripts associés.

Aucune injection de faux DOM.

Le harnais doit exercer réellement l'union des 23 clés atteignables :

- root/directory/file/skipped;
- selected/related/linked/cross-linked;
- filter match/context;
- focused brain;
- hierarchy normal/touching;
- intra established/suggestion/approved/touching;
- inter crossing/established/suggestion/approved/touching;
- aggregate.

La jonction NTFS réelle utilisée pour `node-skipped` est acceptable si elle
reste confinée au sandbox de test et est nettoyée proprement.

## 3 — couverture sans double liste manuelle

Lis les 24 clés de légende depuis le rendu réel.

Déclare une seule exception explicite : `node-diagnostic`.

Dérive :
`expectedReachable = legendKeys - {node-diagnostic}`.

Assert strictement :

- `legendKeys.length === 24`;
- `observedRealMapKeys === expectedReachable`;
- donc 23/23 atteignables observées;
- aucune autre exception.

Une clé atteignable manquante doit faire échouer WebView2.

## 4 — preuve séparée node-diagnostic

Ne simule pas un backend impossible.

Conserve/renforce le test déterministe de MapView qui rend
`accessDiagnostic != null` et vérifie :

- émission de `node-diagnostic`;
- entrée correspondante dans la légende;
- primitive/classe réelle partagée;
- texte FR/EN.

Dans l'artefact, ajoute :

- key: `node-diagnostic`;
- realWebViewStatus:
  `NOT_APPLICABLE_WHILE_SCAN_DIAGNOSTICS_ARE_REJECTED`;
- backendInvariant:
  `src-tauri/src/map/commands.rs:745-749`;
- deterministicCoverage: PASS.

Si l'invariant backend n'est plus vrai, STOP : l'exception n'est plus valide.

## 5 — computed signatures réellement assertées

Pour chacune des 23 clés réellement observées :

- retrouver l'élément carte porteur de la clé;
- retrouver l'échantillon de légende;
- prouver le partage des classes/primitives pertinentes;
- comparer et **asserter** les propriétés CSS porteuses de sens
  (stroke width, dasharray, opacity, fill opacity, font weight, etc. selon la
  famille), y compris les descendants stylés par une règle du parent.

Ne te contente pas de `sharedClasses.length > 0` ou d'enregistrer les valeurs.
Une divergence doit faire échouer le harnais.

Compare les signatures visuelles, pas les coordonnées de layout.

## 6 — interaction/accessibilité/passivité

Rejoue en WebView2 réel :

- légende fermée puis ouverte;
- Enter / Space;
- FR puis EN;
- Tab sans piège;
- axe fermé/ouvert sans nouvelle violation;
- zéro commande backend causée par les gestes de légende;
- source / Index / journal / resume inchangés;
- fermeture/réouverture même session.

Restart reste NON TESTED / P-19.

## 7 — artefact

Remplace `docs/performance/runs/TASK-0050-webview2.json`.

Il doit montrer :

- legend keys = 24/24;
- reachable expected = 23;
- reachable observed = 23/23;
- exempt = seulement `node-diagnostic`;
- statut exact de l'exception et invariant backend;
- computed-signature assertions PASS pour les 23;
- clavier / axe / passivité;
- P-19 NON TESTED.

## 8 — falsifications

Au minimum :

1. retirer une clé atteignable du scénario -> WebView2 échoue;
2. ajouter une deuxième exception -> échoue;
3. faire diverger une propriété visuelle porteuse de sens -> échoue;
4. supprimer la couverture déterministe node-diagnostic -> ciblé échoue;
5. remettre « double contour / double outline » -> ciblé échoue.

Restaure tout sabotage.

## 9 — validation

- ciblés TASK-0050;
- `pnpm test`;
- `pnpm check`;
- `pnpm build`;
- Tauri debug;
- WebView2 réel;
- axe;
- `git diff --check`;
- audit public selon convention repo.

## 10 — gouvernance

À la fin :

- TASK-0050 = IMPLEMENTED / candidate contrôle indépendant;
- F-014 / P-10 = IMPLEMENTED / candidate;
- jamais auto-VERIFIED;
- P-19 reste PARTIELLE;
- aucune TASK-0051;
- NEXT_ACTION = contrôle indépendant TASK-0050;
- RESULT complet;
- commit + push;
- arbre propre.
