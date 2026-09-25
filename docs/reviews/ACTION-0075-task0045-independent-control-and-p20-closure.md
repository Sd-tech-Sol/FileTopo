# ACTION-0075 — Contrôle indépendant de TASK-0045 et clôture P-20

- Date : `2026-09-25`
- Statut : `CLOSED / VERIFIED`
- Tâche : `TASK-0045 — V1 Brain Identity Editor`
- Branche contrôlée : `build/v0.2-a29-v1-brain-identity-editor`
- Base d'orchestration : `8dc3c31d96444dbdeefeb606751f161d9c9cfafe`
- Commit produit contrôlé : `9e951d2`
- HEAD documentaire contrôlé : `cb443781e5df35cb12b65ebf53a739638b19972d`
- Verdicts :
  - **TASK-0045 = VERIFIED**
  - **F-033 = VERIFIED dans sa portée**
  - **P-20 = CLOSED / VERIFIED**

## A — Réutilisation du backend : acceptée

Le runtime réutilise exactement le chemin déjà existant :

`map_brain_update -> BrainCatalog::update_metadata -> validate_metadata`.

Aucune seconde commande, aucune table, aucune base, aucun fichier de préférence
n'a été ajouté.

Le backend reste autoritaire :

- nom trimé, 1..80 caractères;
- couleur `#RRGGBB`;
- icône 1..2 valeurs scalaires;
- cerveau inconnu refusé.

Les trois tests Rust ajoutés sont des gardes de la surface existante; le code
de production du catalogue n'a pas été réécrit pour satisfaire la tâche.

## B — Formulaire : accepté

`BrainIdentityEditor` expose exactement :

- Nom;
- Couleur;
- Icône;
- Enregistrer;
- Annuler.

Il ne contient aucun champ éditable de source, chemin, `sourceRef`,
`sourceLabel` ou `brainId`.

Le formulaire est lié au cerveau sur lequel il a été ouvert. Un changement de
focus pendant l'édition ne le retargete pas silencieusement.

Les contrôles sont des éléments HTML natifs avec labels; l'ouverture place le
focus sur le nom et la fermeture le rend au bouton d'ouverture.

`Escape` annule. Un formulaire inchangé n'appelle pas le backend.

## C — Validation et refus : acceptés

Le frontend reflète les bornes Rust sans inventer une politique supplémentaire.

Un refus backend :

- reste visible;
- garde le formulaire ouvert;
- ne modifie ni catalogue ni `LoadedBrain`;
- permet une correction puis un nouveau save.

La limite connue « une icône composée d'un espace est acceptée par le backend »
est réelle mais **préexistante**. TASK-0045 avait explicitement interdit de
durcir cette règle produit sans décision séparée. Elle ne bloque pas cette
clôture; le nom reste une identité non colorée visible.

## D — Publication autoritaire : acceptée

`saveBrainIdentity` :

1. attend `map_brain_update`;
2. vérifie que le `brainId` retourné est celui demandé;
3. publie le **BrainRecord retourné** dans `catalog`;
4. publie ce même record dans le cerveau chargé.

Le contrôle accepte le test où le backend retourne volontairement un nom
différent de la saisie : l'interface affiche bien la valeur **du catalogue** et
non un echo optimiste du formulaire.

## E — Effets de bord : acceptés

Une édition réussie ne déclenche pas :

- `map_open`;
- `map_view`;
- Actualiser / Reconstruire;
- `map_brain_resume_update`;
- activation de cerveau;
- journal;
- observation de source.

Deux lectures inter-cerveaux peuvent suivre :

- `map_cross_relations_open`;
- `map_cross_relations_for_node`.

Elles sont justifiées : ces DTO embarquent le nom et l'icône du cerveau et
doivent être relus après remplacement d'un `LoadedBrain`. Ce sont des lectures
du store commun, pas des lectures de la source ni de l'Index du cerveau.

## F — Course avec un chargement : acceptée

`loadBrain` relit le `BrainRecord` depuis `catalogRef.current` juste avant
de retourner le `LoadedBrain`.

Une identité sauvegardée pendant un chargement en vol ne peut donc pas être
écrasée ensuite par le vieux record capturé au début du chargement.

## G — Isolation : acceptée

Les preuves unitaires et hôte réel couvrent le cas important :

- A et C partagent la même source;
- A est édité;
- C reste bit pour bit identique;
- `brainId`, `sourceKind`, `sourceRef`, `sourceLabel`, position et cerveau
  actif restent inchangés;
- `catalog_meta`, donc le resume state, reste inchangé;
- source, Index et journal restent inchangés.

L'édition est donc bien une modification de métadonnées FileTopo, jamais une
modification du dossier analysé.

## H — Persistance / seed : acceptées

La preuve WebView2 réelle montre :

- trois cerveaux;
- A et C sur le même dossier;
- édition de A et B;
- C annulé;
- fermeture réelle du processus;
- relance réelle;
- A revient seul comme cerveau actif;
- nom, couleur et icône édités reviennent exactement;
- le seed ne remet pas les valeurs par défaut;
- les états de reprise de TASK-0044 restent exacts;
- aucun `map_brain_update` n'est émis au redémarrage.

## I — Clavier : accepté dans la portée de TASK-0045

Le formulaire utilise des contrôles natifs atteignables au clavier.

La preuve réelle couvre :

- parcours Nom -> Couleur -> Icône par Tab;
- saisie nom / icône par événements clavier;
- sauvegarde par une vraie touche Entrée envoyée au niveau OS;
- annulation par Escape dans le scénario.

Le bouton d'ouverture est un `<button>` natif sans suppression de focus ni
`tabIndex` négatif. La preuve hôte l'ouvre à la souris, mais la sémantique
HTML et les tests de focus établissent le chemin clavier attendu.

Le sélecteur natif de couleur n'est pas piloté par le harness : la valeur est
injectée via le setter de la page + événement `input`. Cette limite est
correctement déclarée et n'est pas une preuve WCAG globale.

## J — Suites et preuve

Conformes au rapport et aux artefacts contrôlés :

- Rust : **753 PASS**, 0 fail, 6 ignored;
- TypeScript : **537 PASS**;
- `pnpm check` : PASS;
- `pnpm build` : PASS;
- `cargo build --offline` : PASS;
- build Tauri debug : PASS;
- Clippy : dette historique inchangée;
- `git diff --check` : propre;
- audit public-readiness : vert.

La suite TypeScript a eu un échec transitoire non reproduit; **cinq suites
complètes suivantes** ont donné 537/537. Aucun défaut déterministe n'est
établi par cet incident.

## K — Clôture de P-20

`P-20 — Plusieurs cerveaux indépendants` demande :

1. identité de cerveau distincte de la source;
2. index / relations / état isolés;
3. bascule charge le bon cerveau;
4. filtres, vue et sélection reviennent;
5. état persistant après redémarrage sur trois cerveaux;
6. nom, couleur et icône modifiables et persistants;
7. aucune configuration obligatoire.

Les preuves indépendantes se composent ainsi :

- `TASK-0018` VERIFIED par `ACTION-0029` :
  catalogue, isolation physique, même source possible, métadonnées, actif;
- `TASK-0038` VERIFIED par `ACTION-0064` :
  état vu/non-vu brain-scoped dérivé du journal;
- `TASK-0044` VERIFIED par `ACTION-0073` :
  reprise brain-scoped de vue, sélection, filtre et panneau sur trois cerveaux
  après redémarrage réel;
- `TASK-0045` contrôlée ici :
  édition utilisateur nom/couleur/icône + persistance + isolation.

Aucun sous-critère nommé de P-20 ne reste ouvert.

## Verdict

**TASK-0045 = VERIFIED.**

**F-033 = VERIFIED dans sa portée nom/couleur/icône.**

**P-20 = CLOSED / VERIFIED.**

Cette clôture ne change pas :

- `P-19` : reste PARTIELLE;
- `F-035` : reste PROPOSED;
- `F-036` : reste PROPOSED;
- persistance d'une composition multi-cerveaux complète : hors P-20, encore
  ouverte sous P-19.
