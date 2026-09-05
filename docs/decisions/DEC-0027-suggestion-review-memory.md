# DEC-0027 — File de révision des suggestions et mémoire des décisions humaines

- **Date :** 2026-09-05
- **Statut :** `IMPLEMENTED` — contrôle indépendant requis
- **Phase :** étape A — première implémentation de `F-044` et `F-045`
- **Décideur :** orchestrateur technique, par le GO explicite de `.orchestrator/NEXT_PROMPT.md`
- **Rédacteur :** Claude Code, agent d'exécution
- **Implémentée par :** [`TASK-0025`](../tasks/TASK-0025-suggestion-review-memory.md)
- **replaced_by :** —

## Contexte

[`DEC-0021`](DEC-0021-deterministic-relation-engine.md) définit l'architecture
à trois niveaux et réserve explicitement la file de révision et la mémoire des
décisions humaines à une tranche ultérieure.
[`TASK-0024`](../tasks/TASK-0024-deterministic-relation-engine.md), désormais
`VERIFIED` par [`ACTION-0041`](../reviews/ACTION-0041-independent-recontrol.md),
livre le moteur `dre-v1` : il produit des suggestions explicables, et
l'approbation existe déjà par le chemin `APPROVED` vérifié.

Il manque exactement deux choses, proposées comme tranche #3 par
[`TASK-0021 §6`](../tasks/TASK-0021-product-realignment.md) :

- **`F-044`** — une file de révision qui permette de traiter rapidement les
  suggestions d'un cerveau;
- **`F-045`** — une mémoire des décisions humaines, pour qu'un rejet ne soit
  pas reproposé indéfiniment par un rerun inchangé du moteur.

Sans mémoire du rejet, la seule décision qu'un humain puisse rendre est
« oui »; « non » se réduit à ne rien faire, et le moteur repropose la même
suggestion à chaque run. C'est le défaut que cette décision corrige.

## Décision

### A — Frontière sémantique inchangée

Rien de cette tranche ne déplace la frontière posée par `DEC-0009`,
`DEC-0012`, `DEC-0021` et `DEC-0026` :

1. une suggestion **n'est jamais** une relation établie;
2. une relation établie reste exclusivement `DETERMINISTIC` ou `APPROVED`;
   aucune troisième provenance n'existe;
3. aucun état ni provenance `AI`, `SUGGESTED` ou `REJECTED_RELATION` n'est
   introduit — un rejet est un état **de la suggestion**, jamais une relation;
4. un rejet ne crée aucune relation et ne modifie aucune source;
5. aucune suggestion n'est auto-approuvée;
6. aucune règle déterministe existante ne change de sens;
7. aucune relation inter-cerveaux n'est inventée;
8. aucune donnée réelle n'entre dans le produit ni dans les preuves.

### B — Trois états persistants, exactement

Le store intra-relations connaît exactement trois états de suggestion :

    pending | approved | rejected

**Aucun état `deferred` n'est persisté.** `DEC-0021` demande de n'introduire
un report durable que si le besoin en est démontré, et il ne l'est pas : une
suggestion qu'on laisse de côté est simplement une suggestion encore en
attente. Le bouton « Plus tard » de la file est donc un déplacement de curseur
local, pas une décision.

### C — Le rejet est une décision auditable

Une suggestion décidée conserve, dans sa propre ligne, de quoi rendre la
décision relisible sans reconstruire le run qui l'a produite :
`suggestion_key`, `rule_name`/`rule_version` quand ils existent, `source_key`,
`target_key`, `relation_type`, la décision, `decided_unix_ms`, le producteur,
et l'explication et les signaux déjà présents.

Un champ nullable `decision_reconsider_cause` est ajouté pour pouvoir
documenter plus tard une cause de réévaluation. **Aucune politique automatique
de réévaluation n'est décidée aujourd'hui** : le champ existe pour que la
question reste enregistrable, conformément à `DEC-0021`, et il reste `NULL`.

### D — La mémoire vit dans la reconciliation, pas dans le moteur

Le moteur `dre-v1` reste sans mémoire : il évalue des règles sur une carte et
produit des sorties. C'est la **reconciliation** du store qui décide de ce
qu'elle fait d'une identité déjà décidée :

- une suggestion core `approved` reste préservée, comme aujourd'hui;
- une suggestion core `rejected` **reste `rejected`** et n'est jamais recréée
  `pending`;
- un rejet reste stocké même si le run courant ne repropose pas cette
  suggestion, sans quoi la mémoire disparaîtrait au premier run où le signal
  s'absente et réapparaîtrait comme neuve au suivant;
- une suggestion encore `pending` est reconciliée normalement;
- aucune décision d'un autre cerveau ne compte : la mémoire est par cerveau,
  parce que l'espace d'identité d'une `suggestion_key` est le cerveau.

L'identité de la mémoire est la `suggestion_key` déjà produite par
`TASK-0024` — règle, version, cerveau, extrémités et type. Elle **n'est pas
modifiée** par cette tranche : en changer la formule invaliderait toute
décision déjà persistée.

### E — La file de révision est générique et bornée

La file est une lecture par cerveau, valable pour n'importe quel
`BrainRecord` valide, jamais réservée à la fixture legacy. Elle est paginée,
avec une limite maximale explicite, et son compteur ne mélange jamais les
suggestions décidées avec celles en attente.

### F — Ce que cette tranche n'est pas

Elle n'ajoute ni refonte graphique, ni thème, ni design-system, ni
`F-046`, ni extraction de contenu, ni recherche sémantique, ni embedding,
vector DB, RAG, GraphRAG, LLM ou BYOK, ni permissions, ni watcher, ni donnée
réelle. Le polish visuel du graphe reste reporté à une passe ultérieure.

## Conséquences

- Le schéma du store intra-relations passe de `v3` à `v4` par migration
  versionnée, sans perte des lignes legacy, des suggestions ni des relations
  déjà `APPROVED`, et sans relâcher les contraintes `X3`.
- Une décision humaine survit à un redémarrage réel du processus et à une
  reconstruction de l'index de carte, parce que le store de relations n'est pas
  reconstructible et vit hors de l'index.
- Un rerun inchangé du moteur devient réellement idempotent du point de vue de
  l'utilisateur : il ne lui repropose pas ce qu'il a déjà refusé.
- `F-044` et `F-045` passent à `IMPLEMENTED — contrôle indépendant requis`.
  `F-043` reste vérifiée par `TASK-0024`. `F-046` reste `PROPOSED`, et
  `DEC-0013/F` demeure bloquante pour l'identité physique persistante.

## Alternatives écartées

- **Persister un état `deferred`.** Écarté : `DEC-0021` demande une preuve du
  besoin, et « Plus tard » n'a aucune sémantique durable qu'un `pending` ne
  porte déjà.
- **Supprimer la ligne d'une suggestion rejetée.** Écarté : la mémoire du rejet
  *est* la ligne. La supprimer ferait réapparaître la suggestion au run suivant.
- **Marquer le rejet par une relation de provenance `REJECTED`.** Écarté : cela
  créerait une troisième provenance et violerait `A.2`.
- **Recalculer une nouvelle `suggestion_key` plus riche.** Écarté : gratuit ici,
  et destructeur pour les décisions déjà persistées par `TASK-0024`.
