# ACTION-0081 — Corrective pass TASK-0048 : isolation async du panneau Exclusions

- **Date :** 2026-09-26
- **Statut :** `OPEN — corrective pass requise`
- **Branche :** `build/v0.2-a32-v1-safe-exclusion-policy`
- **HEAD contrôlé :** `3a820179283c121db8fdbaca067da2707f0d7c75`
- **Commit produit contrôlé :** `878320129760e2a9d9b4f536afa6c186d1df3e8c`
- **Portée :** TASK-0048 / F-005, frontend seulement sauf preuve contraire

## Verdict

**TASK-0048 reste IMPLEMENTED, non VERIFIED.**

Le backend, la policy versionnée, le scan, W-B/W-C, le watcher, le rebase sans
faux événement journal et la preuve A/C au repos sont cohérents. Un défaut
d'isolation asynchrone subsiste dans `ExclusionsPanel`.

## Défaut P1 — retour stale d'un remplacement après changement de cerveau

Le composant n'est pas keyé par `brainId`.

La lecture initiale est protégée par `request.current`, mais `replace()`
ne capture ni génération ni identité courante avant son `await`.

Scénario déterministe :

1. cerveau A focalisé; policy A chargée;
2. l'utilisateur ajoute/retire une règle; `map_brain_exclusions_replace(A)`
   reste en vol;
3. le focus passe sur B; l'effet `brainId` remet `policy=null` et lance la
   lecture B;
4. la policy B arrive;
5. le vieux replace A arrive ensuite;
6. `record.brainId !== brainId` compare au **brainId capturé par l'ancien
   rendu A**, donc le garde passe;
7. `setPolicy(recordA)` republie A dans le panneau désormais rendu pour B;
8. une édition suivante sur B peut utiliser `policy.rules` de A et envoyer
   ces règles à `map_brain_exclusions_replace(B)`.

Les mêmes callbacks stale peuvent aussi :

- appeler `onApplied(A)` après le changement de focus;
- écrire une erreur de A dans le panneau B;
- exécuter `setBusy(false)` d'une ancienne opération sur une opération plus
  récente;
- laisser l'ancien `add()` vider le draft du nouveau cerveau si le retour est
  considéré comme succès.

Cela viole directement `DEC-0046 I` : isolation par `brainId`.

## Correction exigée

Corriger **sans changer l'API backend** :

- génération/ticket d'opération lié au `brainId`;
- un retour async n'a le droit de publier state/error/busy, appeler
  `onApplied` ou signaler succès au caller que s'il appartient encore au
  cerveau/génération courants;
- le changement de cerveau réinitialise proprement policy/draft/error/busy;
- un retour stale peut terminer son appel backend d'origine, mais ne doit
  produire **aucun effet frontend** sur le nouveau cerveau;
- éviter un simple garde partiel qui protège seulement `setPolicy`.

Une solution par remount `key={brainId}` n'est acceptable que si elle prouve
aussi qu'aucun callback stale externe (`onApplied`) n'agit après unmount.
La solution à ticket/génération dans le composant est préférée.

## Preuves obligatoires

Ajouter des tests déterministes avec Promises différées :

### R1 — stale replace A après passage B

- charger A;
- démarrer replace A et garder la Promise pending;
- rerender B;
- résoudre lecture B avec policy B;
- résoudre ensuite replace A;
- vérifier :
  - policy B reste affichée;
  - policy A n'apparaît pas;
  - `onApplied(A)` n'est pas appelé;
  - erreur/busy de A ne fuit pas;
  - draft B n'est pas effacé.

### R2 — édition suivante B n'hérite jamais des règles A

Après R1, ajouter une règle sur B et vérifier le payload exact envoyé :
uniquement policy B + draft B.

### R3 — stale refusal A

Même course mais replace A rejette après passage B :
aucune erreur A dans B, B reste éditable.

### R4 — opération courante conserve le comportement normal

Le replace du cerveau courant publie toujours uniquement la réponse canonique
backend et appelle `onApplied` seulement si `applicationRequired=false`.

## Validation

- tests ciblés `ExclusionsPanel.test.tsx`;
- `pnpm test`;
- `pnpm check`;
- `pnpm build`;
- rejouer le harnais WebView2 TASK-0048 final;
- `git diff --check`;
- audit public;
- aucun changement Rust attendu; si Rust change, justification obligatoire et
  validation Rust complète.

## Gouvernance

- pas de TASK-0049;
- TASK-0048 reste IMPLEMENTED jusqu'au prochain contrôle indépendant;
- F-006, F-014, P-19 inchangés;
- RESULT doit décrire uniquement ce correctif et les preuves.
