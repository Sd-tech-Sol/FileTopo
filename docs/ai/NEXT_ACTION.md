# Action suivante

## TASK-0046 — V1 Complete FR/EN Runtime

`TASK-0045` est **VERIFIED** par
[`ACTION-0075`](../reviews/ACTION-0075-task0045-independent-control-and-p20-closure.md).

`P-20` est **CLOSED / VERIFIED**.

L'audit
[`ACTION-0076`](../reviews/ACTION-0076-f035-runtime-localization-audit.md)
confirme le prochain écart V1 :

- le runtime réellement lancé est `src/map/MapApp.tsx`;
- `src/lib/locale.ts` existe déjà et doit être réutilisé;
- MapApp force encore le français;
- plusieurs panneaux/helpers portent des chaînes françaises codées en dur.

La prochaine tranche est
[`TASK-0046 — V1 Complete FR/EN Runtime`](../tasks/TASK-0046-v1-complete-fr-en-runtime.md),
encadrée par
[`DEC-0044`](../decisions/DEC-0044-global-fr-en-runtime.md).

Action unique : exécuter `.orchestrator/NEXT_PROMPT.md` sur
`build/v0.2-a30-v1-complete-fr-en-runtime`.

Cette tranche vise F-035 et les portions langue de P-19 / P-21.
Elle ne ferme pas P-19 ni P-21 et ne commence pas F-036.
