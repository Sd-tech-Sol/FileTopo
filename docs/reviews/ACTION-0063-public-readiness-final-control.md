# ACTION-0063 — Clôture indépendante de la porte public-readiness

- Date : 2026-09-23
- Statut : `CLOSED / VERIFIED`
- Branche contrôlée : `chore/v0.2-public-readiness-cleanup`
- Livraison finale contrôlée : `797440aba0d3f3a98e52a3e954cc8c432e50c708`
- Contexte : `TASK-0037 = VERIFIED` par `ACTION-0061`
- Verdict : **porte public-readiness fermée sur le tree courant**

## Contrôle

Le correctif de `ACTION-0062 R2` est accepté.

L’exception synthétique n’est plus globale. Elle est maintenant liée à la paire
**fichier exact + nom exact** :

- `src-tauri/src/map/sandbox.rs` → `quelquun`;
- `src-tauri/src/scale_spike/profile.rs` → `other`.

Le contrôle indépendant a relu les deux fichiers Rust : ces valeurs sont bien
des fixtures synthétiques de tests de confinement/sanitisation, jamais des
données locales réelles. Un même nom n’est pas toléré dans un autre fichier.

L’audit utilise les chemins relatifs fournis par `git ls-files` et une
comparaison exacte; les tests négatifs rapportés par l’exécuteur démontrent
qu’un chemin utilisateur complet portant `other` ou `quelquun` dans un
fichier temporaire hors allowlist reste refusé.

## Acquis de la passe précédente maintenus

- les deux occurrences du vrai chemin Git local historique ont été retirées du
  **tree courant**;
- leur remplacement conserve la valeur documentaire sans inventer une ancienne
  valeur;
- l’historique Git publié n’est pas réécrit ni présenté comme purgé;
- aucun code produit Rust/TypeScript n’a été modifié;
- `scripts/audit-public-readiness.ps1 -AllowRemotes` est rapporté **vert**;
- `git diff --check` est rapporté propre.

## Limite honnête

L’allowlist reste **par fichier**, pas par ligne. C’est accepté ici parce que les
deux fichiers sont précisément des fichiers de tests contenant volontairement
des chemins synthétiques; tout autre nom utilisateur y serait encore refusé.
Toute extension future de cette allowlist devra être contrôlée explicitement.

L’audit est un garde textuel, pas une preuve mathématique d’absence de toute
donnée personnelle. Le verdict porte sur le contrat actuel du dépôt.

## Verdict

**ACTION-0062 R2 = CLOSED. Porte public-readiness = VERTE sur le tree courant.**

La reconstruction V1 peut reprendre. La prochaine tranche doit être choisie
après audit des fonctions restantes; l’exécuteur ne décide pas seul de
`TASK-0038`.
