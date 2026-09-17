# NEXT_ACTION.md — Prochaine action

**Dernière mise à jour :** 2026-09-17

Ce fichier contient **exactement une** action.

---

## ACTION-0016 — Revue humaine de la PR d'identité publique

- **Tâche visée :** `TASK-0010`
- **Statut :** `PROPOSED`
- **Exécutant :** propriétaire puis orchestrateur après un nouveau GO
- **Phase :** maintenance de la publication source

### Objet

Examiner la PR de `audit/public-release` vers `main`, les preuves de test et
l'impact documenté du nouvel identifiant Tauri. Décider ensuite si le merge est
autorisé.

### Point de départ vérifié le 2026-09-17

`TASK-0010` est `IMPLEMENTED`, non `VERIFIED`. Les contrôles TypeScript, Vitest,
Vite, Rust, audit public et build Tauri sans bundle sont réussis. Le GO final
du 2026-09-17 couvre un commit, le push de `audit/public-release` et l'ouverture
d'une PR, mais pas son merge.

### Interdit dans cette action

Merge sans nouveau GO humain; réécriture historique; `git-filter-repo`;
force-push; modification d'une ancienne branche, d'un tag ou d'une visibilité.

### Suite attendue

Présenter la PR et attendre la décision humaine. Sans nouveau GO, laisser la PR
ouverte et ne pas modifier `main`.
