# ACTION-0062 — Recontrôle de la porte public-readiness après TASK-0037

- Date : 2026-09-23
- Statut : `OPEN / RECONTROL REQUIRED`
- Branche : `chore/v0.2-public-readiness-cleanup`
- Livraison contrôlée : `aed8550d96c9ab0a519edd3c67ee25014f3ace94`
- Contexte : `TASK-0037 = VERIFIED` par `ACTION-0061`
- Verdict : **nettoyage documentaire correct, mais porte public-readiness pas encore fermée**

## Acquis acceptés

Le contrôle indépendant confirme :

- le chemin Git local absolu historique a bien été retiré du **tree courant** dans les deux documents où il apparaissait;
- le remplacement par « racine Git locale (chemin absolu non consigné) » conserve le sens documentaire sans inventer de valeur;
- aucune réécriture d’historique Git n’est revendiquée;
- aucun code produit de FileTopo n’a été modifié par cette passe;
- les occurrences de chemins Windows dont le dossier utilisateur est `quelquun` dans `src-tauri/src/map/sandbox.rs` sont des fixtures synthétiques de tests qui prouvent précisément qu’un chemin absolu ne sort pas du sandbox;
- l’occurrence de chemins dont le dossier utilisateur est `other` (macOS et lecteur `D:`) dans `src-tauri/src/scale_spike/profile.rs` est également une fixture synthétique de sanitisation, pas une donnée locale.

## R2 — exception d’audit trop large

La correction a ajouté :

`$syntheticUserNames = @('quelquun', 'other')`

et ignore ensuite **toute** correspondance de chemin utilisateur dont le nom capturé est l’un de ces deux noms, quel que soit le fichier.

Cela rend l’audit plus permissif au niveau global. Exemple : un futur vrai chemin macOS dont le dossier utilisateur vaut `other`, ajouté dans un document quelconque serait accepté silencieusement uniquement parce que son segment utilisateur vaut `other`.

Ce n’est pas nécessaire pour autoriser les fixtures connues.

## Correction exigée

Resserrer l’exception pour qu’elle soit contextuelle et minimale. Options acceptables :

1. allowlist **par chemin de fichier exact + nom synthétique exact**; ou
2. règle encore plus étroite limitée aux lignes/fixtures clairement synthétiques concernées.

Au minimum :

- `src-tauri/src/map/sandbox.rs` peut tolérer `quelquun`;
- `src-tauri/src/scale_spike/profile.rs` peut tolérer `other`;
- ces noms ne doivent **pas** être tolérés ailleurs dans le dépôt;
- un test négatif doit prouver qu’un fichier temporaire quelconque contenant un chemin macOS complet d'utilisateur `other` ou Windows complet d'utilisateur `quelquun` est encore signalé;
- les fixtures synthétiques existantes doivent rester tolérées;
- `audit-public-readiness.ps1 -AllowRemotes` doit rester vert;
- `git diff --check` doit rester propre.

Aucune suite Rust/TS complète n’est nécessaire si seul le script PowerShell/documentation change. Aucun code produit ne doit être modifié pour fermer R2.

## Verdict

La confidentialité du tree courant est vraisemblablement correcte, mais **la porte d’audit elle-même ne doit pas être affaiblie globalement pour la rendre verte**.

Aucune `TASK-0038` avant fermeture de R2.
