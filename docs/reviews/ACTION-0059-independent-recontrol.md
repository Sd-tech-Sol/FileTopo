# ACTION-0059 — Recontrôle indépendant de TASK-0036

- Date : 2026-09-12
- Statut : `OPEN / RECONTROL REQUIRED`
- Tâche : `TASK-0036 — V1 Stable Identity Foundation`
- Branche contrôlée : `build/v0.2-a20-v1-stable-identity`
- Livraison corrective contrôlée : `0daf342fbc61587094c1a7e59d56bf6720e20aa6`
- Base d’orchestration : `76b8f9ba54a68b73fe3c5a860d89fc3c14dbe11c`
- Exécuteur : Claude Code / Sonnet 5
- Autorité du verdict : orchestrateur ChatGPT indépendant
- Verdict : **TASK-0036 reste IMPLEMENTED; pas VERIFIED**

## Ce qui est accepté

Les corrections précédemment acquises restent valides : D1/D2/D3/R1 d’`ACTION-0057` ne régressent pas. La passe `ACTION-0058` ferme aussi correctement D5 : la détection Cloud Files intervient avant toute identité `SYSTEM`, `Placeholder` et `Ambiguous` bloquent `SYSTEM`, seul `NotCloudFile` autorise la voie `VolumeSerialNumber + FileId`; aucune nouvelle provenance n’est créée et aucune API d’hydratation/déshydratation n’est importée ou appelée. Le rejeu rapporté reste vert et les suites déclarées passent hors dette Clippy historique.

D4 est également largement corrigé : le chemin v3→v4 vérifie toujours brain/binding avant mutation, sérialise les tentatives de migration, exécute un checkpoint WAL `TRUNCATE`, crée et vérifie une copie de sûreté v3 avant le premier DDL, puis restaure cette copie si `migrate_previous_schema()` échoue. Les tests WAL-pending, checkpoint occupé et échec de copie sont pertinents.

## Défaut bloquant D6 — la copie de sûreté est supprimée avant la validation canonique v4

Le contrat `ACTION-0058` D4 exige explicitement :

1. migration transactionnelle;
2. **réouverture/validation du contrat canonique v4**;
3. si **migration ou validation** échoue, restauration de la copie v3.

Or le chemin actuel de `BrainIndex::open_existing_migrating()` fait :

```text
migrate_previous_schema() OK
remove_file(safety_copy)
finish_open_existing(connection)
```

La copie est donc détruite **avant** `finish_open_existing()`. Cette validation peut encore échouer sur le contrat canonique (`build_complete`, `projection_contract`, identité d’index, compte, racine, etc.). Dans ce cas, la fonction retourne une erreur mais laisse le fichier migré en v4, sans copie v3 disponible pour restauration.

C’est un écart direct au contrat M-B orchestré, même si le DDL SQLite lui-même a réussi et est atomique.

## Correction exigée

Conserver la copie de sûreté jusqu’à ce que **toute la validation canonique v4** ait réussi.

Le flux attendu est :

```text
checks v3 brain/binding
lock + quiesce
copy + verify v3
migrate transactionnel
finish_open_existing / validation canonique v4
  -> OK  : supprimer la copie, retourner le store v4
  -> ERR : la connexion v4 doit être fermée, restaurer la copie v3,
           supprimer la copie si restauration réussie, retourner l’erreur
```

Ne pas dupliquer la logique de `finish_open_existing()` et ne pas affaiblir ses contrôles. Une erreur de restauration doit rester visible et la copie ne doit pas être détruite si elle est encore nécessaire à une récupération manuelle.

## Preuve obligatoire

Ajouter un test produit déterministe où :

- le fichier est un v3 appartenant au bon cerveau et au bon binding, donc D1 autorise la migration;
- la migration SQL v3→v4 elle-même réussit;
- **la validation canonique après migration échoue** volontairement sur un invariant non modifié par la migration (par exemple métadonnée canonique manquante/invalide);
- après le retour d’erreur, le fichier actif est de nouveau exactement/logiquement le v3 antérieur : `user_version == 3`, données/seen/index_id/index_revision/binding conservés selon ce que la fixture avait avant la tentative;
- la copie temporaire est nettoyée après restauration réussie;
- après réparation de l’invariant de fixture, une nouvelle tentative peut migrer vers v4 avec succès.

Rejouer les tests D4 existants et D5 sans changement de portée.

## Verdict

**TASK-0036 = IMPLEMENTED / RECONTROL REQUIRED.** D5 est accepté; D4 reste bloqué uniquement sur la durée de vie de la copie M-B autour de la validation finale. Aucun `TASK-0037`, journal, watcher ou incrémental avant fermeture de D6.