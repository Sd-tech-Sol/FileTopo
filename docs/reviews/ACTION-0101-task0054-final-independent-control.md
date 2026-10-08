# ACTION-0101 — Final independent control of TASK-0054 / F-050 / F-051

- **Date:** 2026-10-07
- **Branch:** `build/v0.2-a38-v1-scale-closure`
- **Product commit:** `fd3f6067c47a50bccff4713bda04f7f89bc8af85`
- **Harness/artifact head:** `42a06a1add90b9b7286fd8b9b7170c76d4ceac23`
- **Documentation head inspected:** `84d3f431ca0396b312e73b31503d90128292668a`
- **Verdict:** **PASS / VERIFIED**

## Independent findings

1. Product delta is intentionally small: `MIN_FOCUS_PAGE=16` in the bounded materializer plus test visibility in commands; everything else is proof/harness.
2. No product file changes after the product commit. The five commits to the artifact head alter only the WebView2 harness.
3. The Rust artifact is bound to the artifact head and records 30/30 scale-closure tests passing, including 10k/100k/1M wide/mixed/deep-wide corpora, reachability, exact aggregates, REAL_ROOT, stale cursors and discriminating falsifications.
4. The scale oracle is independent of the product's own child counts and parent links.
5. The frontend keeps aggregates distinct from nodes/folders and exposes exact FR/EN counts plus keyboard/click activation.
6. WebView2 runs the same REAL_ROOT scenario twice. Normal mode reports hardware GPU composition and a false disabled verdict; GPU-disabled mode reports `--disable-gpu`, software-disabled composition and a true disabled verdict. Semantic digests are identical.
7. DEC-0034 fixes the product renderer as React/TypeScript SVG and forbids a mandatory Canvas/WebGL/Pixi renderer, so the product does not depend functionally on WebGL.
8. Source hashes are unchanged and no whole-graph command appears on the wire during the proof.

## Limits reviewed

### Last aggregate page

On the final page, the exact aggregate counts children omitted from that current page. With no continuation cursor, another activation cycles to the first page.

This is accepted as **non-blocking** for F-051:
- the count is exact;
- every child is covered exactly once across the forward walk;
- no child is invented or lost;
- activation still yields real Index nodes;
- DEC-0034 requires an exact compact omission indicator and an explicit navigation action, not a terminal-page label contract.

The wording can be improved later without reopening F-051.

### Deep focus

A focus whose ancestry reaches the material budget is refused explicitly instead of exceeding the view budget. This is outside the current acceptance fixtures. Bounded children pagination covers the entire indexed corpus and search/navigation is proven on the contractual scale fixtures.

No unlimited-depth claim is added.

### Search cost / target hardware

Backend search remains proportional to the corpus and the development workstation is stronger than the target class. Neither is hidden.

F-050 closes the **bounded rendering/materialization architecture** and functional independence from hardware GPU acceleration, not a latency/FPS SLA.

## Evidence composition for parity

- TASK-0022 / ACTION-0036: four tree forms, hierarchy correctness, parent/children, labels, mouse and keyboard.
- TASK-0047 / ACTION-0079: keyboard, focus, non-colour alternatives, aggregate accessibility.
- TASK-0030 / ACTION-0047: canonical Index and bounded materialization pipeline.
- TASK-0054 / ACTION-0101: scale amendments, exact aggregates, exhaustive bounded pagination, REAL_ROOT and GPU-disabled runtime.

Therefore:
- `P-01 = CLOSED / VERIFIED`
- `P-02 = CLOSED / VERIFIED`
- `P-03 = CLOSED / VERIFIED`

## CI distinction

No GitHub Actions workflow run or commit status is attached to the controlled product or documentation commits. Executor test counts are accepted as inspected local evidence, not misrepresented as remote CI.

## Final state

- `TASK-0054 = VERIFIED`
- `F-050 = VERIFIED`
- `F-051 = VERIFIED`
- `P-01/P-02/P-03 = CLOSED / VERIFIED`
- `F-046` unchanged
- no `TASK-0055` created by this control

Next step: fresh V1 audit.
