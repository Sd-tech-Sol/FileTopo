TASK_ID: TASK-0043 — V1 Automatic Watcher & Reconciliation
AGENT: CLAUDE (Sonnet 5)
RESULT: DONE — TASK-0043 = IMPLEMENTED (never self-VERIFIED)
BRANCH: build/v0.2-a27-v1-watcher-reconciliation
BASE: 5b752be (fast-forward from origin; tree was clean; HEAD contains ACTION-0070, DEC-0041, TASK-0043)
COMMITS: d9e45ac (backend), ba879bb (interface), the UI observation fix, the docs/proof commit (branch HEAD)

PRINCIPLE KEPT: OS event = hint, never truth. ReadDirectoryChangesExW -> bounded hints -> W-B/W-C ->
apply_update_batch. The OS action is dropped at the parser; the journal comes from a re-enumeration.

REUSE-FIRST AUDIT (written before code):
- windows-sys 0.61.2, features ALREADY enabled (Foundation, Storage_FileSystem, System_IO) expose
  ReadDirectoryChangesExW, ReadDirectoryNotifyInformation, OVERLAPPED, GetOverlappedResultEx, CancelIoEx,
  ERROR_NOTIFY_ENUM_DIR: NO crate, NO feature added, no `notify`. (Read from the cached crate sources: a
  targeted read of tooling metadata, outside the repository, nothing else.)
- Cancel of a blocking call: 100 ms wait slices, then CancelIoEx AND await completion before freeing the
  buffer / closing the handle. Proven by the OS itself (exclusive open refused while the reader lives).
- PUBLICATION_LOCK reused (now pub(super)): Actualiser, Reconstruire, W-B, W-C, root-guard writes share it.
- scanner / reconcile_full_scan / apply_update_batch reused; scanner::observe_entry is the ONE
  classification for the full scan and W-B. incremental.rs NOT modified (F-031 threshold untouched).
- SourceObservation machine consumed unchanged. Tauri: managed state, one closed event, one read command.
- Old prototype IndexJobs/collections NOT reactivated.

WHAT WAS BUILT: src-tauri/src/watch/ (types, queue, parser, backend, native, coalesce, worker, manager),
src-tauri/src/scope.rs (W-B), src-tauri/src/map/watch_ops.rs; lib.rs wiring (map_watch_status,
map-watch-status event, hook after Actualiser/Reconstruire, clean shutdown); UI WatchStatusBadge,
watchStatus.ts, in-place reload on a new revision.

DECISIONS FOR THE INDEPENDENT CONTROL (also DEC-0041 section 13):
1. A scope is ONE DIRECTORY + its direct entries, entering only NEW or MOVED child directories — not the
   whole subtree of DEC-0041 section 3. Reads less, same honesty (each changed entry has its own hint;
   otherwise W-C). "An ancestor covers its descendant" is realised at apply time: hints whose directory is
   not (yet) safe rise to the same ancestor and become one scope.
2. A hint carries ONE CLOSED BIT: membership of the entry in its directory may have changed (added, removed,
   both halves of a rename) vs only the entry itself moved (modified). It cannot become a journal nature.
   Without it every "directory modified" notification of a top-level directory would be a full scan (found
   by the first real-OS test). Top-level ADD/REMOVE/RENAME keep the root as scope = W-C, as specified.
3. Root-level scope = W-C exactly as TASK-0043 section E says.
4. W-B never promotes a failure observation; it re-records SYNCED at the new revision only if it was SYNCED.
5. NEEDS_MANUAL_REFRESH: an Index without durable identities/binding, or at an older schema, is never
   written or migrated by the watcher (only the person's Actualiser restamps).
6. Guard identity: only SYSTEM vs SYSTEM mismatch is SOURCE_CHANGED; an uncomparable identity is no evidence.
7. A root refused by a W-C (SOURCE_CHANGED) is not re-scanned in a loop (growing wait) until Reconstruire.
8. Development-only env overrides (FILETOPO_WATCH_GUARD_MS, _COALESCE_MS, _CALM_MS, _PERIODIC_MS,
   _FORCE_PERIODIC) exist under debug_assertions only; a release build ignores them.

TESTS / VALIDATIONS:
- cargo test --offline: 719 PASS, 0 FAIL, 6 ignored (629 before + 90).
- pnpm test: 471 PASS (439 + 32); pnpm check, pnpm build, cargo build --offline, pnpm tauri build --debug
  --no-bundle: PASS.
- cargo clippy: lib 13 / lib-test 22 = historical debt, unchanged; none in created files.
- git diff --check clean; scripts/audit-public-readiness.ps1 -AllowRemotes: see final report line below.
- 10 000 external operations, real NTFS, real reader, product engine, Index == full scan:
  targeted path (3 isolated runs): mutate ~2.1 s, converge 0.94-0.95 s, queue max 1 270-1 325, 12-13 W-B,
  0 escalation, 1 W-C (initial), 22 100 signals / ~15 700 coalesced, 0 loss.
  overflow path (queue 64): queue max 64, 4 losses, 6 W-C, converge 1.35 s, equally exact.
  Under the load of the full suite the numbers degrade (up to 3 W-C, ~4.3 s): assertions are on exactness.
- Rejection tests: burst 10 000 OK; forced loss injected into the product engine OK; interruption (stop,
  mutate, relaunch, Index captured INSIDE the notifier at the WATCHING announcement == full scan) OK; whole
  root moved away (scripted AND native handle): DEGRADED, zero DELETED, Index/journal intact, return = W-C
  then SYNCED OK.
- Real WebView2 (two real launches, real close between, source changed while closed; run twice, concordant):
  docs/performance/runs/TASK-0043-webview2.json — one click (baseline) then everything without a click;
  watcher starts by itself; 1 380-operation burst converges (~1.5 s); root moved away/back; second brain
  isolated; relaunch: Index == disk (5 376 nodes) at the first stable state, second brain caught up; 19+4
  backend events recorded from the page, closed envelope only; 0 fatal console errors, 0 leak.
- The real replay FOUND a UI defect (source badge stuck UNAVAILABLE after the root returned with an
  unchanged revision); fixed, regression test added, replay rerun.

NOT TESTED / LIMITS: network share, FAT, cloud-synced folder, USN; PERIODIC fallback in the host (Rust only:
an "unsupported" backend); product cadences (5 s / 30 s) not waited for in the host; two processes on one
brain; hard process crash; relaunch replay races the page load (see artefact limits); one dev machine.

GOVERNANCE: TASK-0043 = IMPLEMENTED; no TASK-0044; no USN; no PR / merge / tag / release; graph/ untouched;
push only to the task branch; NEXT_ACTION = independent control of TASK-0043.
