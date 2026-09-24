TASK_ID: Public-readiness gate — final correction after ACTION-0062 (R2)
AGENT: CLAUDE CODE (Sonnet 5)
RESULT: DONE
BRANCH: chore/v0.2-public-readiness-cleanup
FINAL_HEAD: the commit that adds this file (see `git log -1` on the branch)
DATE: 2026-09-23

SUMMARY:
ACTION-0062 R2 is closed. The audit no longer tolerates the synthetic user names
globally: the exception is now contextual — file-exact and name-exact. The
current-tree sanitisation accepted by ACTION-0062 is unchanged. Only the audit
script, three documents and the durable memory changed: no product code (Rust/TS),
no TASK-0037 change, no TASK-0038, no PR/merge/tag/release, main untouched.

PRECONDITIONS
- Explicit checkout of chore/v0.2-public-readiness-cleanup, fetch, ff-only
  (aed8550 -> 4edeed6), tree clean. ACTION-0062 read in full before editing.

CHANGE (scripts/audit-public-readiness.ps1)
- Removed the global list `$syntheticUserNames = @('quelquun','other')`.
- Added `$syntheticUserNamesByFile`, a mapping repo-relative file -> exact
  fictitious names tolerated in THAT file only (case-sensitive comparison, path
  compared exactly as printed by `git ls-files`):
    src-tauri/src/map/sandbox.rs           -> quelquun
    src-tauri/src/scale_spike/profile.rs   -> other
- No other user exception exists. The Rust fixture files were not modified.

CONSEQUENCE HANDLED (three documents reworded, meaning kept)
With the exception no longer global, three documents that QUOTED the example
paths in full were now (correctly) flagged: the current NEXT_PROMPT.md,
docs/reviews/ACTION-0062-public-readiness-recontrol.md (orchestrator/independent
review text) and the previous version of this RESULT.md. Adding them to the
mapping would have contradicted "no other exception", so the quotations were
reworded to avoid reproducing a complete user path (the full path is described in words, e.g. "a macOS path whose user folder is other").
DECISION TO REVIEW: two of these are orchestrator-authored files edited by the
executor, only to break the audit pattern; no requirement or verdict text changed.

PROOFS
1. `scripts/audit-public-readiness.ps1 -AllowRemotes`: RED after the tightening
   until the three quotations above were reworded, then GREEN
   ("487 fichiers versionnés, aucun motif sensible, aucun fichier > 5 Mio" — count
   as printed by the final run).
2. Temporary negative tests, outside the two allowed files (temporary file in
   docs/, deleted afterwards): a full macOS path with user `other` -> DETECTED
   (exit 1, "chemin macOS personnel"); a full Windows path with user `quelquun`
   -> DETECTED (exit 1, "chemin Windows personnel").
3. The existing fixtures of the two allowed files do not fail the audit (the
   green run above includes them, unmodified).
4. `git diff --check`: clean.
5. No Rust/TS file modified (`git diff --stat`), so no suite rerun.

LIMITS
- The current tree only; Git history is NOT rewritten (the old absolute Git-root
  path remains in already-published commits).
- The exception is per FILE, not per line: any other user path added to those two
  files with the tolerated name would pass.
- The audit remains a pattern check (three path families, a few secret formats,
  text extensions); it cannot prove the absence of every personal datum.
- graph/history.jsonl and graph/current_state.yaml unmaintained since TASK-0009
  (unchanged).
- No TASK-0038 created by the executor.
