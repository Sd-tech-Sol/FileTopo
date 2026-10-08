# ACTION-0103 — Independent control of TASK-0055 / F-046

- **Date:** 2026-10-08
- **Branch:** `build/v0.2-a39-v1-physical-identity-closure`
- **Product commit inspected:** `d55c1faa7f1664a3edeb2a2b7a0b032c50f19e7f`
- **Artifact head inspected:** `d0502fa1bb3bc993ec4977356e210ceb1349c9eb`
- **Documentation head inspected:** `831ba733bd79729314366489f7f09ee78a8dbeb2`
- **Verdict:** **REWORK REQUIRED — not VERIFIED**

## What independently passes

The central DEC-0052 model is implemented coherently:

- SYSTEM keys may be shared by multiple node occurrences;
- PATH_FALLBACK remains unshareable;
- `identity::pair_group` preserves the 1↔1 F-004 case and uses exact path only for shared groups;
- full publish and full-scan reconcile use that rule;
- scoped watcher reconciliation completes a partial group picture before pairing;
- schema 6→7 removes only stable-key uniqueness and validates the v7 index shape;
- the exact-duplicate UI exposes only `PROVEN_SHARED / PROVEN_SINGLE / UNKNOWN` plus a brain-scoped count;
- no product code changed after `d55c1faa…`; the two commits to the artifact head change only the TASK-0055 WebView2 harness;
- no GitHub Actions workflow/status is attached to the controlled commits.

The executor evidence for real hard links, byte-identical copy, empty files, migration rollback and the two-process WebView2 scenario is internally consistent.

## Blocking finding A — machine-identity-derived digest crosses IPC

DEC-0052 F explicitly forbids the WebView from receiving:

- `stable_key`;
- `VolumeSerialNumber`;
- `FileId`;
- **a hashed/encoded version of these values**;
- a derived machine identifier.

But `BrainIndex::reconstructible_digest()` currently selects:

- `n.stable_key`;
- `n.identity_provenance`;

pushes both into the digest bytes, then returns `fnv1a64:…`.

That value is assigned to `MapBuildReport.reconstructible_digest`.
`map_refresh` and `map_rebuild` return `MapBuildReport` through Tauri IPC,
and TypeScript declares `reconstructibleDigest: string`.

Therefore a **derived hash influenced by the Windows physical identity crosses IPC**.

The TASK-0055 leak tests missed this because they search for the raw key and
recognisable spellings; a digest does not contain those strings.

This is a direct DEC-0052 F violation and blocks F-046 verification.

## Required correction A

Keep the historical H7 logical/reconstructible proof, but make its public digest
**independent of physical identity**.

Preferred minimal correction:

- remove `stable_key` and `identity_provenance` from the input to
  `reconstructible_digest`;
- document that the public digest covers reconstructible logical/source-derived
  fields only and intentionally excludes all identity material;
- retain the existing stable-identity proofs separately; do not weaken F-004;
- add a discriminating test:
  - same logical rows, stable_key/provenance changed => public reconstructible
    digest unchanged;
  - a genuine logical reconstructible field changed => digest changes.

Audit repo-wide for any other hash/encoding of SYSTEM identity that reaches IPC,
TypeScript, DOM, logs or artifacts. Do not rely on substring scans alone.

## Finding B — kernel does not fully verify a shared-group alias correlation

The incremental kernel currently validates a producer-provided
`continues = Some(id)` by checking:

- row exists;
- same stable key;
- same provenance;
- no id continued twice.

For a shared SYSTEM key, two different aliases satisfy those checks.
The kernel does **not** independently enforce the DEC-0052 D2 rule that a shared
group continuation must be the occurrence at the exact same relative path.

All current product producers inspected use `pair_group` correctly, so this is
not evidence of a current wrong product result. It is nevertheless a gap in the
claimed defence-in-depth contract: RESULT says the kernel “verifies the
pairing”, and the incremental kernel is meant to refuse a bad producer rather
than trust one.

## Required correction B

At the kernel boundary, refuse a forged continuation to another alias of the
same SYSTEM object whenever the group is shared.

The check must preserve D1:

- stored 1 + observed 1 SYSTEM rename/move remains allowed;
- once the stored group is shared **or** the batch's observed group is shared,
  a continued occurrence must match the stored occurrence at the exact
  relative path;
- no heuristic matching.

Add a test that would currently pass incorrectly:
two stored aliases with the same SYSTEM key; an observed alias at path B claims
`continues=id(A)`; kernel must refuse it.

Use the smallest existing/new error variant that keeps diagnostics closed and
non-sensitive.

## Revalidation

After both corrections:

- targeted Rust identity/index/reconcile/scope/incremental tests;
- `physical_identity_tests`;
- full `cargo test --lib --offline`;
- targeted frontend tests + full relevant frontend suite;
- `pnpm check`;
- `pnpm build`;
- Tauri debug build;
- TASK-0055 WebView2 two-process replay;
- axe state;
- `git diff --check`;
- public-readiness;
- regenerate the TASK-0055 artifact tied to the corrected HEAD;
- rerun leak audit including **derived/hash influence**, not only raw strings.

Historical Clippy/fmt debt may remain declared if unchanged.

## Status

- `TASK-0055 = IMPLEMENTED / CORRECTIVE REQUIRED`
- `F-046 = IMPLEMENTED / candidate, NOT VERIFIED`
- no TASK-0056
- main untouched

Next action: execute the TASK-0055 corrective, then return to independent control.
