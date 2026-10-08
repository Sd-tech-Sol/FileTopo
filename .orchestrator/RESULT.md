TASK_ID: TASK-0055 — corrective after ACTION-0103 (F-046)
AGENT: CLAUDE CODE (Opus 5)
RESULT: IMPLEMENTED — candidate only, never self-VERIFIED
BRANCH: build/v0.2-a39-v1-physical-identity-closure
REVIEWED HEAD (ACTION-0103): 831ba733bd79729314366489f7f09ee78a8dbeb2
CODE AND ARTIFACT HEAD: e9c67473df2c46ce99926869a6a1f8940eba2d4d
NO PRODUCT CODE AFTER THAT HEAD — only documents.

1. CORRECTIVE A — the public digest no longer derives from machine identity
- `BrainIndex::reconstructible_digest` selected `n.stable_key` and
  `n.identity_provenance`, pushed both into its bytes, and the `fnv1a64:` result
  crossed Tauri IPC as `MapBuildReport.reconstructible_digest`. DEC-0052 F
  forbids the raw key, the VolumeSerialNumber, the FileId AND any hash or
  encoding of them, so a public value was a function of the Windows physical
  identity of the analysed files.
- Both columns leave the digest input AND the ORDER BY, where they were
  tie-breakers. Rows are now ordered by EVERY digested field, so the digest is a
  function of the multiset of logical rows alone — deterministic without
  borrowing an identity to break a tie.
- H7 is kept on logical, source-derived fields only: path, parentage by the
  parent's relative path, name, kind, depth, size, timestamp, the two
  placeholder flags, the child count, the access diagnostic.
- No replacement identity digest is published. F-004 is untouched: no identity
  path reads this function.

2. WHY THE OLD AUDITS COULD NOT SEE IT, AND WHAT REPLACES THEM
- The TASK-0055 leak tests search the serialised payload for the key and
  recognisable spellings. A digest contains none of them. The three new tests are
  INFLUENCE tests, not substring tests.
- The required discriminating test: the digest does not move when only
  stable_key / identity_provenance change (including to NULL), and does move when
  a genuine reconstructible field changes (a size, then a path).
- The generalised leak audit: relabel every physical identity INJECTIVELY, which
  preserves the sharing structure and therefore the closed DEC-0052 G
  classification, and require every published byte to be identical. Any value
  derived by hash, encoding or ordering moves there although no forbidden string
  ever appears.
- The structural, repo-wide half: which production files may read identity
  material at all is pinned to the privileged core (identity, index, incremental,
  reconcile, scope, scanner, plus change_journal for an `IS NULL` and watch_ops
  for a closed-answer comparison). A new reader anywhere else fails, and
  brain_index.rs is explicitly forbidden from becoming one again.
- Live, in the real app: one file is replaced by a byte-identical one with both
  mtimes — its own and its directory's — SET to the same instant in both states.
  Windows gives the new file its own FileId, so the physical identity really
  changes (the new nodeId proves it) and reconstructibleDigest must not move.

3. CORRECTIVE B — the kernel refuses a forged alias correlation (DEC-0052 D2)
- The kernel accepted `continues = Some(id)` once the row existed, carried the
  same key and provenance, and was not claimed twice. With a shared SYSTEM key
  those checks prove nothing: alias A and alias B carry the same key.
- Once the group is SHARED, a continuation must be the stored occurrence at the
  OBSERVED relative path. Shared means several stored occurrences of that key OR
  a batch observing it more than once — the second half matters because a
  brand-new hard link is the second observation of a key the Index still holds
  once, and is otherwise indistinguishable from a rename of its target.
- DEC-0052 D1 preserved exactly: one stored occurrence observed once may change
  path and keep its id, which is F-004.
- No heuristic: nothing inferred from a name, an order, a date or a size. A
  verification boundary, not a second copy of pair_group's policy. It reuses the
  existing keyed COUNT and the existing CorrelationMismatch variant, whose
  diagnostic stays closed (one id, no path, no key).
- All product producers already used pair_group correctly, so this was a hole in
  the defence, not a wrong result in the field — stated plainly.

4. DISCRIMINATION, MEASURED IN BOTH DIRECTIONS
- Corrective A: with the two columns put back, the three new Rust tests fail AND
  the real WebView2 run fails the live assertion after rebuilding the app.
- Corrective B: with the guard removed, the two refusals fail and the two
  acceptances still pass — so the guard is not a blanket "paths must match".

5. SCOPE RESPECTED
- Unchanged: migration 6→7, the SHA-256 model, ExactDuplicateExplorer semantics,
  the relation engine, the Cloud Files policy, Cargo.toml and Cargo.lock.
- Four source files touched: incremental.rs, map/brain_index.rs,
  map/incremental_apply_tests.rs, map/physical_identity_tests.rs, plus the
  TASK-0055 WebView2 harness. No TASK-0056.

6. VALIDATIONS
- cargo test --lib --offline: 901 passed, 0 failed, 13 ignored (from 894).
- Frontend: 48 files, 721 passed. pnpm check PASS. pnpm build PASS.
  pnpm tauri build --debug --no-bundle PASS. git diff --check PASS.
- WebView2: two real processes over one sandbox, same semantics digest
  (22dfc466...), axe-core 4.13.0 zero violation on the explorer, zero fatal
  console error, analysed tree byte-identical after the session.
  Artifact regenerated: docs/performance/runs/TASK-0055-webview2.json,
  headTested e9c6747...
- cargo clippy --all-targets -- -D warnings: 26 diagnostics, all historical,
  NONE in the four files this corrective touched (counted per file).
- cargo fmt: the four touched files are formatted. `cargo fmt -- <files>`
  reformats the whole crate, so every file outside this corrective was restored;
  the historical fmt debt is unchanged.

7. NOT TESTED / LIMITS
- Carried over: no real Cloud Files provider; no inter-volume hard link (NTFS
  forbids it, and writing outside the repository is a stop condition); the
  non-Windows fallback is UNKNOWN by construction and not exercised here; a
  physical crash during M-B is still untested; W-B on a shared group is proven on
  two topologies only; no remote CI; no performance measurement.
- NEW, stated plainly: the structural identity audit is a pinned list of files,
  not a flow proof. It catches a new READER; it would not catch a derived value
  that one of the eight privileged files published itself. The two influence
  tests cover the two public surfaces that exist today — the build report and the
  duplicate page — not every future one.

8. GIT
- Only build/v0.2-a39-v1-physical-identity-closure. main untouched.
- Commits: c646609 (fix A), ae67bee (fix B), e0b827e and e9c6747 (harness),
  then one documentation commit.
- No PR, no merge, no tag, no release, no new remote, no history rewrite.
- Remote write limited to pushing commits to this already-published work branch.

NEXT (exactly one action):
- A NEW independent control of TASK-0055 by an instance distinct from the
  executor, on evidence. TASK-0055 and F-046 stay IMPLEMENTED / candidates.
- Read first: TASK-0055 §17, VALIDATION §DM, then physical_identity_tests.rs's
  three identity audits, incremental.rs's shared-group guard,
  brain_index.rs::reconstructible_digest.
- Attack first: the pinned list of the structural audit — it catches a new
  reader, not a derivative published by a privileged file; then W-B's
  group-picture completion, still proven on two topologies only.
- No TASK-0056. ACTION-0102 §9 asks for a final V1 audit after this control.
