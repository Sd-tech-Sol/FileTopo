TASK_ID: TASK-0055 — V1 Physical Object Identity / F-046 closure
AGENT: CLAUDE CODE (Opus 5)
RESULT: IMPLEMENTED — candidate only, never self-VERIFIED
BRANCH: build/v0.2-a39-v1-physical-identity-closure
BASE: 393ac6d190295d979b58c9a03cc4712391d93335 (fast-forwarded to 7f86417)
CODE: d55c1faa7f1664a3edeb2a2b7a0b032c50f19e7f
HEAD TESTED BY THE WEBVIEW2 ARTIFACT: d0502fa1bb3bc993ec4977356e210ceb1349c9eb

1. REUSE-FIRST (written before any production change; full table: TASK-0055 §14)
- REUSE as is: GetFileInformationByHandleEx/FILE_ID_INFO, the Cloud Files
  boundary, stable_key + identity_provenance, next_node_id, the M-B envelope,
  sha256-v1, ExactDuplicateExplorer, the relation engine (untouched).
- ADAPT: the versioned migration dispatcher (one arm), publish's remap, the
  reconciler, the U-B kernel, W-B, the member DTO, observe_content's root
  resolution.
- MISSING, created: identity::pair_group (the one pairing rule) and
  index::physical_object_fact (the closed classification).
- NOT added: FILE_STANDARD_INFO.NumberOfLinks, a second store, a similarity
  engine, any dependency. Cargo.toml and Cargo.lock unchanged.

2. MIGRATION 6 -> 7 (DEC-0052 C)
- DROP INDEX then CREATE INDEX idx_nodes_stable_key, non unique, same expression
  and same partial predicate. No row rewritten, no column added.
- Version stamped last inside the step's own transaction; versioned dispatcher;
  MAP_SCHEMA_VERSION = 7.
- v7 canonical contract ("index present and not unique") joins M-B step 5, so a
  half-applied migration is restored instead of served.
- Proven on a real v6 index reduced to its exact shape: index_id and
  index_revision unchanged, source not read, safety copy settled, and the case v6
  refused (a shared SYSTEM key) publishes afterwards.
- Injected failure on the step's LAST statement, i.e. after DROP and CREATE both
  ran: user_version stays 6 and the v6 UNIQUE index is back.

3. ONE RULE, FOUR PATHS (DEC-0052 D/E)
- identity::pair_group: 1 stored + 1 observed => same id (F-004 unchanged);
  otherwise exact relative_path only; unmatched observed => fresh monotone id;
  unmatched stored => disappearance; no alias correlated by supposition.
- Full publish, manual refresh (reconcile + U-B kernel), W-B, exclusion rebase
  and Reconstruire all go through it. Audited: no path keeps the old assumption.
- The kernel no longer resolves an id from a key: the producer proves the pairing
  (ObservedNode::continues) and the kernel verifies it — row exists, carries that
  very key and provenance, never claimed twice, and a "new" occurrence may not
  land on a stored one.
- W-B completes a stable-key group's picture by one targeted re-read before
  pairing, and only when an observed occurrence has no exact match. Without it a
  brand-new hard link is indistinguishable from a rename of its target.

4. PRODUCT SURFACE (DEC-0052 F/G)
- Per SHA-256 group member: PROVEN_SHARED + brain-scoped occurrence count,
  PROVEN_SINGLE + 1, or UNKNOWN + null. One read-only handle on the brain's Index
  per page.
- FR/EN, the five DEC-0021 notions stated distinctly; "likely copy" and "similar
  name" declared NOT inferred. No probable-copy or similarity algorithm exists.
- Forbidden everywhere (IPC, TypeScript, DOM, logs, artifacts): stable_key,
  VolumeSerialNumber, FileId, any hash or encoding of them.

5. REAL WINDOWS EVIDENCE
- Fixture created by the seed BEFORE the first process, therefore before the
  content campaign's own source-fingerprint baseline: a.bin, a real hard link
  (os.link / std::fs::hard_link), a byte-for-byte copy, two distinct empty files.
- Rust 16/16 in physical_identity_tests: two occurrences / two nodeIds / one
  identity; the copy is PROVEN_SINGLE; the two empty files are one digest group,
  two objects, zero relation (relation stores compared as bytes); F-004 intact;
  the four DEC-0052 §5 examples; W-B on two topologies; rebuild + cold reopen;
  brain-scoped count.
- WebView2: two real processes over one sandbox, same semantics digest
  (22dfc466...), axe-core 4.13.0 zero violation on the explorer, zero fatal
  console error, analysed tree byte-identical after the session.
  Artifact: docs/performance/runs/TASK-0055-webview2.json.

6. THE TEN FALSIFICATIONS OF §11, ALL EFFECTIVE
1  duplicate PATH_FALLBACK accepted -> refused in publish (both modes), in the
   batch shape check, and in the kernel (OccupiedOccurrence).
2  two shared SYSTEM occurrences rejected as a collision -> accepted and proven
   on a real hard link; the old rule makes this test fail.
3  an ambiguous alias paired arbitrarily -> pair_group unit tests plus the real
   rename-of-an-alias replay; no stored occurrence is ever paired twice.
4  a byte-for-byte copy called the same physical object -> PROVEN_SINGLE, in Rust
   and in the DOM.
5  UNKNOWN becoming PROVEN_SINGLE -> PATH_FALLBACK, unstamped row and unknown
   path all answer UNKNOWN with no count; the frontend asserts the wording too.
6  a raw SYSTEM key in a DTO -> the real key and each of its two halves are
   searched in the serialised page; the DTO's field list is scanned in source.
7  a FileId/volume in the DOM, a log or an artifact -> 12 spellings checked
   against DOM, IPC payloads, app.log, app-error.log and the artifact.
8  two empty files creating a relation -> relation stores identical byte for byte.
9  a v6->v7 migration leaving half a schema -> failure after DROP+CREATE restores
   v6; a v7 stamp over a UNIQUE index, or over no index, is refused.
10 refresh/watcher reintroducing a hard-link collision -> refresh and W-B replays,
   each compared against a full scan of the tree as it then is.

7. VALIDATIONS
- cargo test --lib --offline: 894 passed, 0 failed, 13 ignored (from 862).
- Discrimination MEASURED: with the pre-TASK-0055 rule temporarily restored,
  11/16 physical_identity_tests, 5 identity::tests and 2 index::tests fail, then
  pass again after restoration.
- Frontend: 48 files, 721 passed. pnpm check PASS. pnpm build PASS.
  pnpm tauri build --debug --no-bundle PASS.
- git diff --check PASS. audit-public-readiness.ps1 -AllowRemotes PASS
  (736 files, no sensitive pattern, no personal path).
- cargo fmt: every file that was clean at the starting HEAD is formatted.
  content_signals.rs and watch_ops.rs stay unformatted at their HISTORICAL lines
  only (verified outside this slice's added blocks).
- cargo clippy --all-targets -- -D warnings: 27 diagnostics, all historical,
  none in the files this slice touched (counted per file). The one diagnostic
  this slice introduced was removed by deleting the function it named.

8. NOT TESTED / LIMITS
- No real Cloud Files provider, account or placeholder: DEC-0035 stays covered by
  its decision table and the Win32 call on an ordinary file.
- No inter-volume hard link (NTFS forbids it; writing outside the repository is a
  stop condition).
- Non-Windows fallback is UNKNOWN by construction, not exercised on this host.
- No performance measurement in this slice.
- W-B on a shared group is proven on two topologies, not on every hint shape.
- Physical crash during M-B still untested.
- No remote GitHub CI attached. Historical Clippy and fmt debt unchanged.

9. GIT
- Only build/v0.2-a39-v1-physical-identity-closure. main untouched.
- No PR, no merge, no tag, no release, no new remote, no history rewrite.
- Remote write limited to pushing commits to this already-published work branch.

NEXT (exactly one action):
- Independent control of TASK-0055 by an instance distinct from the executor, on
  evidence. TASK-0055 and F-046 stay IMPLEMENTED / candidates.
- Read first: identity::pair_group, index.rs::publish, incremental.rs's
  verification, scope.rs::reconcile_scopes (group-picture completion),
  content_signals.rs::MapResolver.
- Attack first: W-B's group-picture completion — the place where a partial
  reading could still conclude wrongly.
- No TASK-0056. ACTION-0102 §9 asks for a final V1 audit after this control.


INDEPENDENT_CONTROL_ACTION_0103:
- VERDICT: REWORK REQUIRED — NOT VERIFIED.
- Blocking leak: BrainIndex::reconstructible_digest includes stable_key and identity_provenance; MapBuildReport sends the resulting hash over Tauri IPC. DEC-0052 F forbids hashed/encoded identity derivatives.
- Defence gap: incremental kernel verifies key/provenance for continues=id but not exact-path membership when a SYSTEM group is shared.
- Existing hard-link migration/model/UI evidence otherwise accepted as coherent.
- TASK-0055/F-046 remain IMPLEMENTED candidates.
- NEXT: execute corrective .orchestrator/NEXT_PROMPT.md; no TASK-0056.
