# Action suivante

## Contrôle indépendant de TASK-0035

`TASK-0035 — V1 Context Panel, Direct Children & Safe Copy` est livrée sur
`build/v0.2-a19-v1-context-panel` : `IMPLEMENTED`, **pas encore
`VERIFIED`**. `TASK-0034` reste `VERIFIED` (`ACTION-0055`), inchangé.

Trois compléments MVP indépendants du moteur topographique : un panneau de
détails masquable dont la préférence survit un vrai redémarrage
(`catalog_meta`, sans nouveau store); une page dédiée, exacte et paginée
des enfants directs (`map_node_children`, réutilisant
`Index::children_page()`) qui remplace `detail.children` comme source de
la section « Enfants directs »; « Copier le chemin »
(`map_copy_node_path`), qui partage sa résolution/confinement avec
`map_reveal_node` et n'expose au WebView que succès/erreur générique.
Détail complet dans [VALIDATION section BL](VALIDATION.md).

Action unique suivante : nouveau contrôle indépendant de `TASK-0035`, par
une instance distincte de l'exécuteur, sur les preuves de cette tranche —
notamment le rejeu WebView2 à trois lancements réels avec deux
redémarrages réels du processus (préférence persistée), la pagination
exacte d'un dossier à plusieurs milliers d'enfants directs et la
comparaison du presse-papiers faite hors du processus applicatif. Aucune
`TASK-0036` avant ce contrôle.
