# NEXT_PROMPT — TASK-0055 corrective after ACTION-0103

**TARGET_AGENT:** CLAUDE CODE
**RECOMMENDED_MODEL:** Claude Opus 5.5
**RECOMMENDED_EFFORT:** High
**STATUS:** READY — CORRECTIVE
**BRANCH:** `build/v0.2-a39-v1-physical-identity-closure`
**CURRENT_REVIEW_HEAD:** `831ba733bd79729314366489f7f09ee78a8dbeb2`

## Session handling

If this is the **same Claude Code session** that just completed TASK-0055,
**do not /clear**. Keep the implementation context; use `/compact` only if
needed.

If this is a new session, this prompt is self-contained: sync the branch
fast-forward only and read the files below.

## Read first

1. `AGENTS.md`
2. `docs/reviews/ACTION-0103-task0055-independent-control.md`
3. `docs/decisions/DEC-0052-node-vs-physical-identity.md`
4. `docs/tasks/TASK-0055-v1-physical-identity-closure.md`
5. `src-tauri/src/map/brain_index.rs::reconstructible_digest`
6. `src-tauri/src/map/commands.rs::MapBuildReport`
7. `src-tauri/src/incremental.rs`
8. `src-tauri/src/identity.rs::pair_group`

## Corrective A — identity-derived public digest

Independent control found a direct DEC-0052 F violation:

`BrainIndex::reconstructible_digest()` includes `stable_key` and
`identity_provenance`; the resulting FNV digest is returned in
`MapBuildReport.reconstructible_digest` through `map_refresh/map_rebuild` IPC.

DEC-0052 F forbids not only the raw key/FileId/volume but also a **hashed or
encoded derivative**.

Fix minimally:

- keep `reconstructibleDigest` only if it becomes independent of all identity
  material;
- remove stable_key and identity_provenance from the digest input;
- preserve the H7 logical/reconstructible purpose using non-sensitive logical
  fields;
- do not expose another replacement identity digest;
- do not weaken F-004 identity internally.

Required discriminating tests:

1. compute public reconstructible digest;
2. change only stable_key / identity_provenance in a test Index;
3. digest must remain identical;
4. change one genuine logical reconstructible field;
5. digest must change.

Also audit repo-wide for any other **hash/encoding/derived value** of SYSTEM
identity reaching IPC, TypeScript, DOM, logs or artifacts. A grep for raw
spellings alone is insufficient.

## Corrective B — kernel verifies shared alias, not only key

The kernel currently accepts `continues=Some(id)` when id has the same
stable_key and provenance. With a shared SYSTEM key, that is not enough:
alias A and alias B have the same key.

Strengthen the kernel boundary so it independently refuses an invented
correlation.

Preserve D1:
- one stored occurrence + one observed occurrence may change path and keep id.

For a shared group:
- if the stored key has multiple occurrences **or** the batch contains multiple
  observed occurrences of that SYSTEM key, any `continues=Some(id)` must
  continue the stored occurrence at the exact same relative_path;
- otherwise refuse;
- never infer by name/order/date/size.

Add the missing falsification:
- stored A and B share one SYSTEM key;
- observed B claims `continues=id(A)`;
- the kernel must reject it.

Do not duplicate pair_group policy in producers; this is only a verification
guard at the trust boundary.

## Scope

Do **not** redesign TASK-0055.

Do not change:
- migration 6→7 unless a regression demands it;
- SHA-256 model;
- ExactDuplicateExplorer semantics;
- relation engine;
- Cloud Files policy;
- dependencies.

No TASK-0056.

## Revalidation

Run:

- targeted tests for the two fixes;
- identity/index/reconcile/scope/incremental tests;
- physical_identity_tests;
- `cargo test --lib --offline`;
- frontend targeted + relevant/full suite;
- `pnpm check`;
- `pnpm build`;
- `pnpm tauri build --debug --no-bundle`;
- TASK-0055 WebView2 replay, two processes;
- axe;
- `git diff --check`;
- public-readiness.

Regenerate `docs/performance/runs/TASK-0055-webview2.json` against the corrected
HEAD. Confirm no product code changes after the HEAD tested by the final
artifact.

## Documentation / finish

Update:

- TASK-0055 with a corrective section;
- VALIDATION;
- CURRENT_STATE;
- HANDOFF;
- CHANGELOG_AI;
- NEXT_ACTION;
- .orchestrator/RESULT.md.

Status at finish:
- TASK-0055 = IMPLEMENTED / candidate;
- F-046 = IMPLEMENTED / candidate;
- never self-VERIFIED;
- NEXT_ACTION = independent re-control;
- no TASK-0056.

Commit and push the branch, clean tree, then STOP.
