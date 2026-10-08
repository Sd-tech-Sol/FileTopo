# DEC-0053 — Generic relation surface, fixture-only legacy demonstrations

- **Date:** 2026-10-08
- **Status:** `APPROVED`
- **Selected by:** ACTION-0106
- **Implementation:** TASK-0057
- **Clarifies:** TASK-0024, DEC-0026, DEC-0033
- **Does not change:** the relation model, rule catalogue or provenance model

## A. Product source kinds

The core relation surface is a capability of a **brain**, not of a fixture.

It must work for:
- `SYNTHETIC_FIXTURE`;
- `REAL_ROOT`.

A source kind may affect legacy developer demonstrations, never whether the
person can read/use core relations on their own brain.

## B. Legacy synthetic perimeter

Only the frozen historical TASK-0017 demonstrations are fixture-scoped.

For `RELATIONS_FIXTURE`:
- legacy derivation/seed may run;
- frozen self-check may run.

For another synthetic fixture:
- no legacy seed;
- core relation surface remains available.

For REAL_ROOT:
- no legacy seed;
- core relation surface remains available.

`map_relations_self_check` stays an explicitly synthetic/frozen proof command
and may refuse REAL_ROOT.

## C. Generic surface

These same-brain operations are generic and must not call a helper that requires
a fixture:

- open overview;
- node relations;
- review queue;
- approve suggestion;
- reject suggestion;
- revoke approved relation.

They resolve:
- brain scope;
- canonical Index snapshot;
- brain-scoped relation store;
- rule-engine freshness.

No source file is mutated.

## D. DTO compatibility and privacy

For relation DTOs whose historical field is `fixtureId`:

- synthetic fixture => `Some(fixture id)`;
- REAL_ROOT => `None/null`.

Do not place:
- absolute source path;
- root path hash;
- Windows account;
- opaque REAL_ROOT UUID

inside `fixtureId`.

No new path-bearing DTO is needed.

## E. Engine

The deterministic relation engine remains unchanged unless a separate
falsification proves it cannot operate on REAL_ROOT.

TASK-0056 already observed that engine run/status succeeds on the same REAL_ROOT
where relation reads fail.

## F. User decisions

A core suggestion on REAL_ROOT must be actionable exactly like the same
suggestion on a synthetic brain:

- pending is not a relation;
- approve => one APPROVED relation;
- revoke => suggestion returns pending;
- reject => no relation and decision persists;
- stale engine policy remains authoritative.

## G. Invariants

- store remains outside analysed source;
- no legacy relation is seeded on REAL_ROOT;
- no endpoint is invented;
- direction/provenance are read from the store;
- cross-brain relation behavior is unchanged;
- source remains read-only.
