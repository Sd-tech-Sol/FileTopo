TASK_ID: Public-readiness cleanup before TASK-0038 (closes ACTION-0061 R1)
AGENT: CLAUDE CODE (Sonnet 5)
RESULT: DONE
BRANCH: chore/v0.2-public-readiness-cleanup
CLEANUP_COMMIT: see `git log` — commit "chore(public-readiness): remove a local absolute path from the current tree"
FINAL_HEAD: the commit that adds this file (see `git log -1` on the branch)
DATE: 2026-09-23

SUMMARY:
The current tree is again free of any real local user path, and
`scripts/audit-public-readiness.ps1 -AllowRemotes` is GREEN. Documentation and
audit tooling only: no product code, no TASK-0038, no PR/merge/tag/release, main
untouched. TASK-0037 = VERIFIED by ACTION-0061 (its code and journal model were
not modified).

PRECONDITIONS
- First attempt: `git checkout chore/...` failed (no local branch yet) and the
  chained `git merge --ff-only origin/chore/...` then fast-forwarded the
  CURRENT branch (build/v0.2-a21-v1-change-journal) locally. Nothing was pushed;
  the tree was clean; the local build branch was reset to its own origin
  (`git reset --hard origin/build/...`, target 3d9ad95, no work lost) and the
  chore branch was created tracking origin. Then: ff-only "Already up to date",
  tree clean at 1841371. Reported for transparency.
- Read: ACTION-0061, NEXT_ACTION, audit script, the flagged VALIDATION section.

FILES SANITISED
1. docs/ai/VALIDATION.md (TASK-0027 preconditions table, "Racine Git" row)
2. docs/tasks/TASK-0027-progressive-scale-architecture-realignment.md (same row,
   same value — the audit had not reached it because it stops at the first finding)
   Both: the concrete absolute Git-root path replaced by
   "racine Git locale (chemin absolu non consigné)". Branch, clean-tree,
   fetch and fast-forward rows untouched. No old value invented.
TOOLING: scripts/audit-public-readiness.ps1
- It aborted at the FIRST finding (Write-Error under ErrorActionPreference=Stop),
  so the audit had been hiding further hits. It now lists every finding before
  failing.
- Once the two doc lines were fixed it stopped on src-tauri/src/map/sandbox.rs
  (3 hits: `C:\Users\quelquun\…`) and would also flag `/Users/other/` in
  src-tauri/src/scale_spike/profile.rs. These are FICTITIOUS names in synthetic
  tests (a path is proved never to be published), not local data. Touching
  product test files was out of scope, so the audit got a short NAMED allowlist
  `$syntheticUserNames = @('quelquun','other')`; the user-directory name is now a
  regex capture. Any other user name remains a finding.
  DECISION TO REVIEW: this slightly narrows the gate; the alternative is to
  rewrite those three test constants (a product-file edit needing a Rust rerun).

AUDITS RUN
- scripts/audit-public-readiness.ps1 -AllowRemotes: RED before (VALIDATION.md,
  then sandbox.rs once the first was fixed), GREEN after: "487 fichiers
  versionnés, aucun motif sensible, aucun fichier > 5 Mio".
- Negative test: a temporary file with a real-looking Windows path and a macOS
  path was reported (both), a fictitious `quelquun` path in the same file was
  tolerated; the file was deleted (status clean of it).
- Targeted search of the current tree (git grep, fixed strings): `/Users/`,
  `\Users\`, `/home/`, `Documents and Settings`, `USERPROFILE`, `AppData`,
  the local account name, the old local folder name, the repo checkout path,
  `gmail.com`. Remaining hits classified, none is local data:
  fictitious test fixtures (quelquun, Test, someone, other), generic wording
  (`C:\Users\…` in a protocol/doc comment), scripts that read `$env:USERPROFILE`
  at run time (no value stored), `AppData` as an architecture word, and the
  provisional project folder NAME `TopographicDocumentMap` (a project name in
  decisions/tasks and graph/project_graph.yaml, not a user path — left).
- git diff --check: clean.
- Rust/TS suites NOT rerun: no product file touched (documentation + one
  PowerShell audit script).

LIMITS
- Current tree only. Git HISTORY is NOT rewritten: the old path remains in
  already-published commits (and in any fork/clone of them). No purge claimed.
- The audit checks text extensions only, three path families and a few secret
  formats; it cannot prove the absence of every personal datum.
- The audit script itself is now the arbiter for two allowlisted fictitious names.
- graph/history.jsonl and graph/current_state.yaml still not maintained since
  TASK-0009 (unchanged, outside this pass).
