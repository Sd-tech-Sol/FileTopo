# TASK-0045 — V1 Brain Identity Editor

- **Date :** 2026-09-25
- **Statut :** `READY`
- **Branche :** `build/v0.2-a29-v1-brain-identity-editor`
- **Décision :** `DEC-0043`
- **Portée :** `F-033`, fermeture candidate de `P-20`
- **Prérequis :** `TASK-0044` VERIFIED par `ACTION-0073`; `ACTION-0074`

## But

Exposer dans le runtime V1 le chemin d'édition déjà existant pour le cerveau
actif :

- nom;
- couleur;
- icône.

Aucun nouveau stockage, aucune modification de source.

## A — Audit reuse-first

Avant code, lire et rapporter :

- `BrainRecord`;
- `BrainCatalog::update_metadata`;
- `validate_metadata`;
- `map_brain_update`;
- `CompositionBar`;
- `MapApp`;
- la façon dont nom/couleur/icône sont actuellement rendus;
- K7/K9 de TASK-0018;
- resume state TASK-0044.

Réutiliser le chemin existant. Toute nouvelle commande backend équivalente est
un échec de conception.

## B — Formulaire utilisateur

Ajouter une action clairement nommée pour le cerveau focalisé.

Champs :

1. Nom;
2. Couleur;
3. Icône.

Actions :

- Enregistrer;
- Annuler.

Exigences :

- valeurs initiales = catalogue courant;
- formulaire associé explicitement au cerveau édité;
- pas de source, chemin, sourceRef ou brainId éditable;
- labels accessibles;
- clavier standard;
- pas de dépendance nouvelle.

## C — Validation

Frontend :

- validation légère cohérente pour feedback;
- jamais plus permissive que nécessaire;
- message compréhensible.

Backend :

- reste la vérité;
- son refus ne doit jamais être remplacé par un état React optimiste durable.

Un save en erreur conserve les anciennes valeurs dans toutes les surfaces.

## D — Propagation atomique côté interface

Après succès de `map_brain_update` :

- utiliser le `BrainRecord` retourné;
- mettre à jour le catalogue;
- mettre à jour le `record` de toute instance chargée de ce cerveau;
- CompositionBar, carte/territoire et toute surface d'identité doivent se
  mettre à jour sans `map_open`, `map_view`, Actualiser ou Reconstruire.

Ne jamais reconstruire une identité à partir des champs soumis : la réponse
backend est autoritaire.

## E — Isolation

Cas obligatoire :

- deux cerveaux peuvent partager la même source;
- modifier A;
- B conserve strictement ses nom/couleur/icône;
- index, journal, seen-state et resume state de A et B restent inchangés.

Un `brainId` inconnu est refusé.

## F — Seed / restart

Prouver sur un vrai redémarrage :

1. modifier le cerveau actif via l'UI réelle;
2. fermer normalement;
3. relancer;
4. nom/couleur/icône modifiés reviennent;
5. le seed ne rétablit pas les defaults;
6. le resume state du cerveau revient toujours;
7. les autres cerveaux sont inchangés.

## G — P-20 intégré

La preuve finale doit exercer trois cerveaux et combiner les acquis sans les
recoder :

- cerveau actif/persistance catalogue;
- isolation index/relation;
- état de reprise TASK-0044;
- modification metadata via UI TASK-0045.

Le rapport peut dire :

`P-20 : READY FOR INDEPENDENT CLOSURE`

mais jamais `VERIFIED`.

## H — Accessibilité locale

Le formulaire doit fonctionner entièrement au clavier :

- ouverture;
- parcours des champs;
- Enregistrer;
- Annuler.

Le nom et l'icône doivent rester visibles avec la couleur.

Pas d'audit WCAG global dans cette tâche.

## I — Tests obligatoires

### Rust

Réutiliser les tests K7 existants et ajouter seulement ce qui manque si la
surface actuelle n'est pas suffisamment gardée.

### TypeScript

Au minimum :

- ouverture sur le bon brain;
- valeurs initiales;
- save succès;
- propagation dans catalogue/loaded/composition;
- annulation;
- refus backend;
- isolation A/B avec même source;
- aucun refresh/rebuild/map_view déclenché par save;
- resume state non modifié.

### WebView2 réel

Preuve compacte :

- trois cerveaux;
- au moins deux partagent la même source de preuve;
- édition par interactions UI;
- au moins une édition complétée au clavier;
- identité visible sans couleur seule;
- fermeture + redémarrage réel;
- métadonnées exactes restaurées;
- état TASK-0044 inchangé;
- aucune modification de source;
- aucun événement de journal inventé.

## J — Validation full

- `cargo test --offline`;
- `pnpm test`;
- `pnpm check`;
- `pnpm build`;
- `cargo build --offline`;
- Tauri debug + WebView2 réel;
- Clippy avec dette historique séparée;
- `git diff --check`;
- `scripts/audit-public-readiness.ps1 -AllowRemotes`.

## K — Gouvernance

- TASK-0045 = `IMPLEMENTED`, jamais auto-`VERIFIED`;
- aucune TASK-0046;
- ne pas commencer FR/EN;
- aucun PR/merge/tag/release;
- `.orchestrator/RESULT.md` rapport compact;
- docs de vérité réconciliées;
- `NEXT_ACTION = contrôle indépendant de TASK-0045`;
- push uniquement sur la branche courante;
- arbre propre.
