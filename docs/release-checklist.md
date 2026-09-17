# Checklist de release

Cette checklist sépare volontairement les opérations locales des actions
externes irréversibles ou coûteuses.

## A. Préparation locale — autorisée en phase 5

- [x] Arbre Git propre avant préparation; commit local final effectué à la clôture.
- [x] Verrous installés sans modification inattendue.
- [x] TypeScript, tests interface, Vite, format Rust, Clippy et tests Rust verts.
- [x] `pnpm audit --prod` sans vulnérabilité connue.
- [x] Inventaire de dépendances régénéré et avis de tiers relu.
- [x] Audit des fichiers versionnés sans secret, chemin personnel ni gros fichier.
- [x] Guides FR/EN, politique de confidentialité, sécurité et modèle de menace relus.
- [x] Exécutable et installateur reconstruits; hachages consignés dans les notes de version.
- [x] Test manuel effectué uniquement sur fixtures synthétiques.
- [x] Notes de version et limites connues exactes.

## A bis. Revue indépendante de pré-publication — `TASK-0008`, 2026-08-26

- [x] Chaîne de vérification complète réexécutée.
- [x] YAML et JSONL du dépôt validés par un analyseur réel.
- [x] Historique Git complet inspecté — 143 blobs, y compris les objets non
      atteignables — sans secret, sans chemin personnel et sans référence à un
      projet privé.
- [x] Liens relatifs et chemins cités dans la documentation vérifiés.
- [x] `CODE_OF_CONDUCT.md`, `CHANGELOG.md` public, CI Windows, `.gitattributes`
      et métadonnées GitHub ajoutés.
- [x] `README.md` énonce la paternité, le statut alpha et les limites exactes.
- [x] Documentation publique passée en **anglais**, avec `README.fr.md`
      complet et équivalent; modèles et métadonnées GitHub en anglais.
- [x] Détection de la langue système avec repli anglais, bouton FR/EN conservé
      et choix explicite mémorisé; couvert par des tests réels.
- [x] Fuite de chemins de compilation corrigée et **vérifiée sur l'artefact**.
- [x] Mentions nominatives opérationnelles réduites dans les documents publics
      mutables; le nom reste où il sert la paternité, la licence et les
      métadonnées.
- [x] **Décision du propriétaire** : appliquer la renormalisation des
      fins de ligne (`git add --renormalize .`), qui touche 11 fichiers
      historiquement en CRLF.
- [x] **Décision du propriétaire** : utiliser `0.1.0-alpha.1` dans les trois
      manifestes.

Rapport complet et preuves : `docs/reviews/TASK-0008-independent-review.md`.

## B. Signature et distribution d'un binaire — action humaine séparée

> **Recommandation de la revue `TASK-0008` : ne pas distribuer de binaire pour
> l'instant.** Publier le **code source seul** reste plus sûr et moins coûteux
> pour un projet alpha. La fuite de chemins qui rendait cette recommandation
> impérative est corrigée; les autres motifs subsistent.

Si un binaire devait être distribué, ces points sont **bloquants** :

- [ ] **STOP : obtenir une autorisation humaine explicite.**
- [x] **Retirer les chemins de compilation du binaire.** Corrigé sur deux
      fronts : `env!("CARGO_MANIFEST_DIR")` a quitté le code livré en release,
      et `scripts/build-release-clean.ps1` applique `--remap-path-prefix`.
      Cargo 1.98 ne stabilise **pas** `trim-paths`; le mécanisme retenu est
      celui de rustc, stable.
- [x] **Scanner l'artefact.** `scripts/scan-binary-for-personal-paths.ps1`
      cherche le nom de compte, le profil utilisateur, la racine du dépôt et le
      `CARGO_HOME`, en ASCII **et** en UTF-16LE, et échoue s'il trouve quoi que
      ce soit. Doit être rejoué sur tout artefact destiné à sortir de la
      machine.
- [ ] Confirmer le propriétaire du certificat et tout coût associé.
- [ ] Protéger la clé privée hors du dépôt et des journaux.
- [ ] Signer l'exécutable et l'installateur avec horodatage approuvé.
- [ ] Vérifier la signature sur une machine Windows propre.
- [ ] Recalculer et consigner les hachages après signature, puis **rejouer le
      scan** : la signature réécrit l'artefact.

## C. Publication — phase 6, GO spécial obligatoire

Le GO humain spécial a été donné par le propriétaire le **2026-08-26**. Il
ouvre la phase; il n'autorise aucun agent exécuteur à agir hors du dépôt.
Les actions ci-dessous relèvent de l'orchestrateur ou de l'humain, après
réauthentification du compte GitHub `Sd-tech-Sol`.

- [x] **GO humain spécial et distinct de phase 6 obtenu.**
- [x] Refaire la diligence sur le nom public et confirmer la destination.
- [x] Créer ou confirmer le dépôt distant et ses protections de sécurité.
- [x] Activer le **signalement privé de vulnérabilité** de GitHub, puis
      mettre à jour `SECURITY.md` avec le lien exact.
- [x] Publier le code source avec licence et avis de tiers.
- [x] Rejouer `scripts/audit-public-readiness.ps1 -AllowRemotes` après
      configuration du remote.
- [x] Vérifier que le workflow CI passe sur l'exécuteur GitHub Windows.
- [x] Créer la release **seulement** si la section B est intégralement close;
      sinon publier une release sans binaire, ou aucune release.
- [x] Vérifier publiquement les liens, notes et téléchargements : zéro actif
      joint, archives source GitHub seulement.
- [x] Documenter la procédure de retrait ou correction dans les politiques de
      sécurité et de contribution.

## D. Réglages du dépôt GitHub — à faire dans l'interface, pas dans le dépôt

Ces éléments sont des **réglages**, non des fichiers. Les inscrire ici évite
d'alourdir le dépôt de fichiers de configuration inutiles.

- [x] Description courte du dépôt, en anglais, et lien vers le README.
- [x] Sujets (*topics*) : `windows`, `tauri`, `rust`, `react`, `typescript`,
      `filesystem`, `visualization`, `offline-first`.
- [x] Licence détectée automatiquement à partir de `LICENSE`.
- [x] Désactiver le wiki non utilisé; aucun déploiement n'est configuré.
- [ ] Protection de la branche `main` : différée jusqu'à l'adoption d'un flux
      de contributions par pull request; la CI reste obligatoire par procédure.
- [x] Activer l'analyse de secrets et son blocage au *push*.
- [x] Décider **explicitement** de ne pas activer Dependabot pour l'instant —
      voir le rapport
      de revue, qui recommande de ne pas l'activer avant qu'une personne soit
      disponible pour trier ses demandes de fusion.

## E. Identité publique — périmètre approuvé

Approuvé par le propriétaire le 2026-08-26, pour rendre le projet attribuable
dans un portfolio professionnel :

- le **nom** « Sébastien Dubé »;
- le **copyright 2026**;
- le **profil GitHub** `https://github.com/Sd-tech-Sol`.

Ne doivent **jamais** être publiables : courriel réel, nom de compte Windows,
chemin local absolu, document privé, ou toute autre donnée personnelle. Les
mentions nominatives se limitent à la paternité, la licence, la maintenance et
les métadonnées; les mentions opérationnelles disent « le propriétaire ».

La section C a été exécutée sous le GO spécial de phase 6. La section B reste
non autorisée et non exécutée.
