# Action suivante

## Contrôle indépendant de TASK-0046

`TASK-0046 — V1 Complete FR/EN Runtime` est **IMPLEMENTED** (code `678c417`) sur
`build/v0.2-a30-v1-complete-fr-en-runtime`, jamais auto-`VERIFIED`.

Action unique : contrôler **indépendamment, sur preuves**, `TASK-0046` — `DEC-0044`,
[VALIDATION section CC](VALIDATION.md), `.orchestrator/RESULT.md`,
`docs/performance/runs/TASK-0046-webview2.json`, `src/map/mapStrings.ts`, `chooseLocale` dans `MapApp.tsx`,
`localeCompleteness.test.tsx` et `localeRuntime.test.tsx` — puis décider de `VERIFIED` pour `TASK-0046` / `F-035` et de
l'acquisition de la **partie langue** de `P-19` et de `P-21`.

Points à regarder en priorité : la locale est écrite **seulement** sur un choix explicite, sous l'unique clé
`filetopo.locale`; la bascule n'envoie **aucune** commande et ne déplace aucun état (catalogue, reprise, Index, journal,
source, sélection); aucun forçage `strings.fr` / `locale="fr"` / `lang = "fr"` ne subsiste; le balayage du français
résiduel de la vue anglaise (texte et noms accessibles) est probant; l'anglais revient **avant toute interaction** après
une fermeture réelle; les données utilisateur ne sont jamais traduites; les limites : hôte simulé par `--lang`, scénarios
historiques supposant une locale française, panneaux « indisponible » des cerveaux adossés à un dossier.

`P-19` et `P-21` restent **PARTIELLES**; `F-036` (accessibilité WCAG globale) reste `PROPOSED`. Aucune TASK-0047 avant ce contrôle.
