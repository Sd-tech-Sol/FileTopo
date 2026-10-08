# ACTION-0104 — Final independent re-control of TASK-0055 / F-046

- **Date:** 2026-10-08
- **Branch:** `build/v0.2-a39-v1-physical-identity-closure`
- **Corrected code + tested runtime:** `e9c67473df2c46ce99926869a6a1f8940eba2d4d`
- **Documentation head inspected:** `3bfb1d6e1f8e2b2b02b5f5a4f60e09b360f0441d`
- **Verdict:** **PASS / VERIFIED**

## A. ACTION-0103 blocker A is closed

`BrainIndex::reconstructible_digest` no longer selects, digests or orders by
`stable_key` or `identity_provenance`.

Its bytes and ordering are now functions only of the logical fields that H7
claims are reconstructible.

Discriminating evidence:
- identity-only mutation leaves the digest unchanged;
- logical size/path mutation changes it;
- injective relabelling of every physical identity preserves sharing but leaves
  the public digest and served duplicate page byte-identical;
- real WebView2 replaces a file with byte-identical content and pinned logical
  timestamps: nodeId changes while the public digest stays equal.

No replacement identity hash is exposed.

## B. ACTION-0103 blocker B is closed

The incremental kernel now distinguishes D1 from a shared group:

- one stored SYSTEM occurrence observed once may rename/move and keep its id;
- stored multiplicity >1 or batch multiplicity >1 makes the group shared;
- a continuation inside a shared group must name the stored occurrence at the
  observed relative path;
- forged B→id(A) is refused with the existing closed
  `CorrelationMismatch(id)`;
- honest B→id(B) and D1 both remain accepted.

This guard verifies the producer at the trust boundary without replacing
`pair_group` with a second heuristic policy.

## C. Evidence and provenance

The delta from ACTION-0103 to the tested head changes only:
- `incremental.rs`;
- `brain_index.rs`;
- the two relevant Rust test modules;
- TASK-0055 WebView2 harness.

The current artifact is committed later, as expected, but declares
`headTested=e9c67473df2c46ce99926869a6a1f8940eba2d4d`.

No product code changes after the tested head.

WebView2:
- two real processes;
- hard link / byte-copy / two empty files;
- F-004 stable simple rename;
- shared alias never correlated by supposition;
- live identity-replacement digest proof;
- same semantic digest across restart;
- axe 0;
- fatal console 0;
- analysed source content fingerprint unchanged.

## D. Identity exposure review

Current public/product surfaces inspected:
- `MapBuildReport.reconstructible_digest`;
- exact duplicate member DTO;
- Tauri command layer;
- TypeScript DTOs / MapApp consumption;
- relation command use of the logical digest.

No raw physical identity or identity-derived public hash remains.

The structural reader allow-list remains a maintenance guard, not a mathematical
flow proof; this limitation stays documented.

## E. Full-suite instability

One earlier full Rust execution on the same corrected code reported
`900 passed / 1 failed`; the failing test name was not captured.
Three subsequent full executions reported `901 passed / 0 failed`.

This is not used as evidence of a specific passing test, nor explained away.
The feature-specific falsifications and three complete green repetitions support
F-046 closure.

The unresolved instability is carried into the final V1 acceptance gate:
all final full-suite runs must capture complete output, and any unexplained
failure blocks release readiness.

## F. CI distinction

No GitHub Actions workflow run or commit status is attached to the tested head.
Executor runs are inspected local evidence, not remote CI.

## Final state

- `TASK-0055 = VERIFIED`
- `F-046 = VERIFIED`
- ACTION-0103 reservations closed
- no new functional MVP gap identified
- next action: final V1 audit before any new functionality
