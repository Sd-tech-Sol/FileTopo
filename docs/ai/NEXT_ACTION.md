# Prochaine action

## ACTION-0026 — RE-CONTRÔLE indépendant de TASK-0016, après correction de X2

- **Statut :** **`CHANGES_REQUIRED`**, correction exécutée, **en attente de
  re-contrôle**
- **Responsable :** une instance **distincte de l'exécuteur** de `TASK-0016` —
  orchestrateur technique, **ou Sébastien** s'il choisit de reprendre ce
  contrôle
- **Action unique :** **re-contrôler `TASK-0016` après la correction de la
  réserve bloquante `X2`**, puis décider si la tranche passe à `VERIFIED`, avec
  ou sans réserves, ou si elle est renvoyée.
- **Résultat attendu :** `TASK-0016` passe de `IMPLEMENTED` à `VERIFIED`, ou
  est renvoyée. **Par écrit**, jamais implicitement.

### Pourquoi c'est la seule action

Le premier contrôle a émis **`X2`**, bloquante : le runtime du produit courant
enregistrait encore huit commandes héritées de la 0.1 — dont un **sélecteur de
dossier réel** — et initialisait le plugin de dialogue, en contradiction avec
`TASK-0016` §12.4.

**La correction a été faite par l'exécuteur de la tranche.** Corriger son
propre livrable ne le vérifie pas : `TASK-0016` **reste `IMPLEMENTED`**, et le
re-contrôle appartient à une instance distincte.

### Ce que le re-contrôle doit regarder en priorité

1. **L'`invoke_handler` lui-même.** N'expose-t-il que les **neuf commandes
   `map_*`** ? Les huit commandes héritées, plus `health`, `demo_snapshot` et
   `scan_synthetic_fixture`, en sont-elles bien absentes ? Le plugin de
   dialogue est-il bien retiré du runtime ?
2. **Les deux tests-gardes.** `exposed_commands_stay_within_the_slice` et
   `no_exposed_command_can_open_a_folder_picker` lisent la source embarquée à
   la compilation, faute de pouvoir introspecter `generate_handler!`.
   **Est-ce une garde solide ou une astuce fragile ?** La preuve qu'ils
   échouent quand `choose_collection` est réenregistrée est-elle convaincante ?
   Le second test se bornait-il correctement pour ne pas se lire lui-même ?
3. **La conservation du code historique.** **Aucune fonction supprimée**,
   `src/App.tsx` et ses douze tests intacts, aucun historique réécrit ? Les
   annotations `#[allow(dead_code)]` expliquent-elles *pourquoi* le code est
   conservé, plutôt que de simplement taire un avertissement ?
4. **L'immuabilité des critères.** `H1` à `H11` **inchangés** ? Bornes `B-1` à
   `B-4` **non retouchées** ? Aucune optimisation de performance glissée dans
   la correction ? Aucune dépendance nouvelle ?
5. **Le `H9` moins bon, publié tel quel.** `wide` passe de 16,70 à **17,80 ms**,
   `mixed` de 20,20 à **21,35 ms**. Est-ce présenté **sans atténuation**, et
   l'**absence d'explication** est-elle assumée plutôt que comblée par une
   hypothèse commode ?
6. **La portée réelle de la garantie.** Le code du prototype **existe toujours**
   dans le binaire : la garantie est qu'il est **inatteignable**, pas qu'il a
   disparu. Est-ce suffisant à ce stade, ou faut-il davantage ?
7. **Confidentialité.** Aucun chemin local personnel dans les artefacts
   rejoués ?

### Ce que le re-contrôle ne doit pas conclure

- **Ne pas lever `R8`** : elle appartient à l'**étape C**.
- **Ne pas déclarer une exigence de parité satisfaite au-delà de ce que la
  tranche a prouvé** — six *sur ce périmètre*, deux partielles, seize non
  commencées.
- **Ne rien conclure sur le budget adaptatif** : ni employé, ni adopté, ni
  abandonné, ni validé.

### Interdit tant que ce re-contrôle n'a pas conclu

**Ne pas ouvrir la tranche suivante de l'étape A.** Ne pas commencer
l'étape **B**. Ne pas corriger `B0` ni rien supprimer dans `src-tauri/target/`.
Ne pas fusionner vers `main`, ne créer ni PR, ni release, ni étiquette, ne pas
réécrire l'historique.
