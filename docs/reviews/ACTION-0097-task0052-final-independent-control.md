# ACTION-0097 — Re-contrôle indépendant final de TASK-0052

- **Date :** 2026-10-06
- **Statut :** `CLOSED — VERIFIED`
- **Tâche :** `TASK-0052 — V1 Branch Focus & Collapse / F-042 Closure`
- **Branche :** `build/v0.2-a36-v1-branch-focus-collapse`
- **HEAD produit corrective prouvé :** `cfba445bdaabc0d74a3bd6b7551fd6398e5b179d`
- **HEAD documentaire contrôlé :** `4044795ee16be86aadd83e79cada23d53e90fcaf`
- **Verdict :** `VERIFIED`

## Contrôle indépendant

La corrective ACTION-0096 ferme le seul écart restant.

### Root repliable

Backend :

- l'exclusion `id != root` a disparu;
- le root focalisé est accepté si son kind est `directory` ou `root`;
- repli root => projection contenant exactement le root;
- `hiddenDescendantCount = descendant_count(root)`;
- aucun aggregate ni arête ne subsiste;
- dépli => projection de référence exacte.

Frontend :

- `canCollapse` accepte le root;
- `rootCannotCollapse` a disparu;
- le contrôle principal passe Replier ↔ Déplier;
- Enter et Space sont exercés;
- le focus reste sur `branch-toggle`, jamais sur `body`.

### Preuve WebView2

Le run réel sur
`cfba445bdaabc0d74a3bd6b7551fd6398e5b179d` prouve deux cycles :

- Enter → Space;
- Space → Enter.

Dans les deux :

- DOM = root seul pendant le repli;
- DTO = root seul;
- compte = 26, recompté indépendamment depuis le disque;
- 0 edge;
- 0 aggregate;
- sélection reste sur le root;
- expand redonne nœuds, arêtes, agrégats et DTO de référence;
- source/Index/journal/seen/relations/resume inchangés.

### Régression générale F-042

Le contrôle ACTION-0096 avait déjà accepté :

- focus de branche strict, aucun nœud extérieur;
- matérialisation bornée;
- compte exact par CTE récursif index-driven;
- replis descendants et replis multiples;
- distinction collapse / aggregate;
- FR/EN, clavier, axe et focus;
- restauration composition/vue/sélection;
- aucun write P-19;
- restart réel confirmant l'état session-only.

La corrective root ne touche pas cette architecture.

### Falsification

Réintroduire l'exclusion du root fait échouer les tests ciblés et la preuve
WebView2. Restaurer donne PASS.

### CI

Aucun check GitHub Actions ni workflow distant n'est attaché au HEAD testé.
La preuve disponible est celle enregistrée dans le repo : suites Rust/frontend,
builds, Tauri debug et WebView2 réel.

## Verdict

- `TASK-0052 = VERIFIED`
- `F-042 = CLOSED / VERIFIED`
- `P-19` reste `PARTIELLE`
- `F-046` inchangée
- aucune TASK-0053 créée par ce contrôle.
