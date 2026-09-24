TASK_ID: TASK-0040 — F-031 canonical measurement recontrol (ACTION-0066 P1)
AGENT: CLAUDE
RESULT: DONE
BRANCH: build/v0.2-a24-v1-incremental-apply
BASE: e54c046

SUMMARY:
- TASK-0040 stays IMPLEMENTED (never self-VERIFIED). Measurement-only pass: no line of the kernel
  (`incremental.rs`), the Rust bench harness, the SQLite settings or the threshold changed
  (`git diff -- src-tauri` empty).
- Frozen protocol (ACTION-0066): opt-level=3 test profile, WAL, synchronous=NORMAL, default cache, no
  checkpoint, no TASK0040_CHECKPOINT / TASK0040_CACHE_KIB; 5 independent campaigns on fresh DBs, 4 cases
  (1k/10, 10k/10, 100k/10, 100k/1000), 7 samples per case, none discarded, no early stop.
- Canonical medians over the 35 raw samples per case (not a median of medians):
  1k/10 = 0.964 ms; 10k/10 = 1.330 ms; 100k/10 = 1.478 ms; 100k/1000 = 260.332 ms. Absolute §3.3 targets:
  PASS x4.
- CANONICAL RATIO = 1478 / 964 = 1.5332 <= 2.0 -> PASS. Per-campaign ratios (diagnostic):
  1.451, 1.436, 1.588, 1.537, 1.558. Environment identical across the 5 campaigns; 0 samples discarded.
  The earlier 2.11 campaign stays published, untouched.
- P1 is a candidate for closure. Only the orchestrator may declare VERIFIED.

VALIDATIONS:
- `git diff -- src-tauri`: empty before commit (no Rust change)
- `cargo test --offline --lib the_bench_generator_produces_valid_batches`: 1 PASS
- `git diff --check`: clean
- `scripts/audit-public-readiness.ps1 -AllowRemotes`: green (re-run after commit, allowlist not widened)
- NOT tested: full Rust/TS suites (no code changed); WebView2 (no frontend change)

IMPORTANT_FILES:
- scripts/task0040-f031-canonical.ps1 (new; automation only, `-SummaryOnly` recomputes the summary)
- docs/performance/runs/TASK-0040-incremental-apply-canonical-{01..05,summary}.json
- docs/performance/BASELINE_TARGETS.md §3.3 (canonical measurement added; old campaigns and threshold intact)
- docs/ai/{VALIDATION (BU),CURRENT_STATE,HANDOFF,NEXT_ACTION,CHANGELOG_AI}.md

NEXT_ACTION: independent control of the canonical F-031 evidence.
No TASK-0041, watcher, PR, merge, tag or release. Push only to the current branch.
