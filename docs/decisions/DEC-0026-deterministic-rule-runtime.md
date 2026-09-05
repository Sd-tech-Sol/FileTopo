# DEC-0026 — Runtime du moteur déterministe de règles

- **Date :** 2026-09-05
- **Statut :** `IMPLEMENTED` — contrôle indépendant requis
- **Phase :** étape A — première implémentation de `F-043`
- **Décideur :** orchestrateur technique, par le GO explicite de `.orchestrator/NEXT_PROMPT.md`
- **Rédacteur :** Codex, agent d'exécution
- **Implémentée par :** [`TASK-0024`](../tasks/TASK-0024-deterministic-relation-engine.md)
- **replaced_by :** —

## Contexte

`DEC-0021` définit une architecture à trois niveaux mais aucun producteur réel.
`TASK-0023`, désormais `VERIFIED`, fournit des observations exactes
`sha256-v1` par cerveau. Cette décision fixe le premier runtime générique qui
transforme certains faits en relations vraies et d'autres en suggestions, sans
confondre les deux et sans LLM.

## Décision

### A — Trois niveaux inchangés

- `OBSERVED_FACT` est un fait lu ou démontré et n'est pas une relation.
- `DETERMINISTIC_RELATION` est une proposition vraie produite par une règle
  nommée, versionnée et explicable.
- `SUGGESTION` décrit des signaux insuffisants pour affirmer; c'est un objet et
  un état distincts.

Une relation établie reste exclusivement `DETERMINISTIC` ou `APPROVED`.
Aucune troisième provenance n'existe.

### B — Contrat minimal des règles

Chaque règle réelle possède un `rule_id` stable et générique, une `version`,
un `output_kind`, un `relation_type`, une symétrie explicite, la définition de
ce qu'elle affirme, ses signaux requis et des explications FR/EN. Un score ou
un seuil ne remplace jamais cette définition.

Le moteur s'appelle `dre-v1`, reste local, hors ligne et sans nouvelle
dépendance, réseau, API ou IA.

### C — Catalogue v1 fermé

Le catalogue contient exactement deux règles :

1. `core.identical-content/v1` produit une relation déterministe symétrique
   `content-identical`. Elle affirme seulement que deux occurrences de contenu
   non vide ont le même digest `sha256-v1` dans la génération utilisée par le
   run. Les endpoints triés forment une étoile canonique de N-1 arêtes autour
   du premier. Les groupes vides produisent zéro arête. Elle n'affirme jamais
   objet physique, copie, original, version, référence ni relation métier.
2. `core.numbered-sibling-revision-candidate/v1` produit seulement une
   suggestion `revision` pour deux fichiers réguliers de même parent direct et
   extension dont les stems diffèrent seulement par des entiers finaux
   consécutifs `n → n+1`. L'explication bilingue énonce ces faits; aucun score
   n'est calculé.

`homonymes/v1` et `suites-numerotees/v1` sont des producteurs synthétiques
historiques. Ils restent séparés du catalogue, de l'identité et du chemin
d'exécution `core.*`.

### D — Snapshot et fraîcheur

Un run enregistre `brain_id`, digest reconstructible de la carte,
`content_generation_id` nullable, version `dre-v1`, date et `run_id`. Le store
compare ce snapshot aux entrées courantes pour rendre `CURRENT` ou `STALE`.

Quand carte ou génération de contenu change, les anciennes sorties `core.*`
ne sont plus exposées comme actuelles avant rerun. Les relations humaines
`APPROVED` et les relations déterministes historiques ne sont ni supprimées ni
masquées par cette fraîcheur. Ouvrir le panneau ne lit aucun fichier et ne
lance aucun hash.

### E — Propriété structurelle et reconciliation

Le schéma identifie structurellement le producteur `core-rule-engine` ainsi que
règle/version. La reconciliation remplace seulement les sorties appartenant à
ce producteur. Elle ne touche jamais aux lignes legacy, aux relations
`APPROVED`, aux suggestions déjà approuvées ni au store inter-cerveaux.

Une suggestion conserve clé stable, règle/version, type, endpoints,
explications FR/EN, signaux structurés minimaux, état et timestamps. La clé
dérive du contrat logique et jamais d'un timestamp ou row id. Aucun contenu de
fichier n'entre dans les signaux.

Deux runs inchangés produisent les mêmes sorties logiques sans croissance ni
duplication. Une suggestion approuvée reste approuvée et sa relation unique
reste `APPROVED`. Une relation établie de même endpoints/type empêche une
suggestion concurrente et la suppression est comptée dans le report.

### F — API et report

Une commande explicite exécute le moteur pour un seul cerveau; une lecture de
statut n'a aucun effet de bord. Le report contient au minimum cerveau, version,
run, digest de carte, génération de contenu nullable, règles évaluées et
sautées avec motif, comptes de sorties, groupes vides sautés, collisions,
approbations préservées, lecture seule confirmée et état d'entrée.

Sans génération de contenu, `core.identical-content/v1` est sautée avec motif
explicite et ne lance aucune campagne; la règle de noms reste évaluée.

### G — Interface

Le panneau existant ajoute une action accessible bilingue qui exécute seulement
`dre-v1`, affiche résumé et fraîcheur. Relations et suggestions montrent
règle/version et explication; les suggestions montrent aussi leurs faits
structurés et restent distinctes des relations. L'approbation historique crée
une relation `APPROVED`, jamais `DETERMINISTIC`, `AI` ou `SUGGESTED`.

### H — Isolation et lecture seule

Le moteur est intra-cerveau. Runs, stores, endpoints et suggestions sont
namespacés par `brain_id`; aucune sortie inter-cerveaux automatique n'est
créée. Le store cross-brain est intact. Toutes les sources sont en lecture
seule et tout état reste dans l'espace applicatif.

## Conséquences

- `F-043` peut devenir `IMPLEMENTED` après satisfaction de DR1–DR15, sans
  auto-attribution `VERIFIED`.
- `F-044` reste `PROPOSED` : aucune file de révision complète.
- `F-045` reste `PROPOSED` : aucune mémoire de rejet.
- `F-046` reste `PROPOSED` : `content-identical` ne remplace pas l'identité
  physique, toujours bloquée par `DEC-0013/F`.
- Le store intra-relations peut migrer de façon testée, sans perte de legacy,
  d'approbations ni de `X3`.
- Les quatre fixtures historiques et les 29 preuves X5 sont intouchables.

## Alternatives rejetées

- Réutiliser automatiquement les règles historiques : leur sens et leur rôle
  de preuve ne sont pas le catalogue générique.
- Déduire toutes les paires identiques : explosion quadratique sans gain de
  vérité; l'étoile N-1 conserve des arêtes individuellement vraies.
- Relier les fichiers vides : crée un faux réseau logique.
- Transformer les noms numérotés en relation : les signaux ne prouvent pas une
  révision.
- Déterminer la fraîcheur en relisant silencieusement la source : viole le
  contrat explicite de campagne.
- Identifier les lignes du moteur par préfixe de nom : fragile face aux lignes
  historiques; la propriété est structurelle.
- Ajouter un score, une provenance ou une identité physique : hors contrat.

## Preuves d'implémentation

Les critères immuables `DR1` à `DR15` de `TASK-0024` ont été exécutés. Suites
Rust **197/197** et TypeScript **213/213**, check/build, Tauri debug, DR15
WebView2 en deux processus et J12 réel passent. Les preuves canoniques sont
les deux JSON `TASK-0024-DR15-*` et le JSON `TASK-0024-J12-*`. Cette décision
est `IMPLEMENTED`; seul un contrôle indépendant peut la rendre `VERIFIED`.

## Résultat — correction X11, 2026-09-05

**La décision gelée ci-dessus n'est pas réécrite.** Cette section enregistre
seulement ce que la correction `X11` a changé dans son implémentation.

Le contrôle indépendant [`ACTION-0040`](../reviews/ACTION-0040-independent-control.md)
a relevé que le runtime générique restait inatteignable hors de la fixture
historique : la couche `TASK-0017` filtrait `open_relations`, `node_relations`
et `approve_suggestion` sur `RELATIONS_FIXTURE = quasi-empty`, si bien que
`brain-beta` ne pouvait ni ouvrir le panneau, ni lancer l'analyse depuis
l'interface, ni approuver une suggestion core.

La correction sépare le **périmètre legacy** du **périmètre core** : la
dérivation et les seeds `TASK-0017` restent confinés à `quasi-empty`, tandis
que le catalogue `core.*`, sa fraîcheur, ses lectures et son approbation
s'appliquent à tout cerveau valide. Rien du catalogue gelé, du schéma de store,
de la reconciliation ni du contrat de campagne n'est modifié.

Preuve corrective, non canonique :
`docs/performance/runs/TASK-0024-X11-generic-brain-webview2.json`. Elle
n'entre pas dans `X5`. Suites Rust **200/200** et TypeScript **215/215**,
check/build, Tauri debug, DR15 pass1/pass2 réécrites et J12 réel passent.

La décision reste `IMPLEMENTED`; `X11` reste **`OPEN`**; seul un re-contrôle
indépendant peut la rendre `VERIFIED`.
