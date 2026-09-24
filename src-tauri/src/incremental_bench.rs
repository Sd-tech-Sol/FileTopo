//! `TASK-0040` H — the `F-031` measurement of the **real** kernel.
//!
//! **Test-only, and `#[ignore]` by default** for the full campaign: it builds a
//! 100 000-row index on disk. A small non-ignored smoke test runs the same code
//! at 1 000 nodes, so the generator's batches are proven valid on every
//! `cargo test`.
//!
//! What is timed is [`Index::apply_update_batch`] and nothing else — the
//! function the product will call, on an on-disk WAL index like the product's,
//! not a stand-in. What is *not* timed: building the fixture, building each
//! batch, and the post-run invariant checks.
//!
//! The corpus is a deterministic 10-ary tree (`n` nodes, every node with
//! children a directory, every other node a file). A batch mixes, in fixed
//! proportions, creations (30 %), modifications (30 %), renames (10 %), moves
//! (10 %) and deletions (20 %) of **leaf files**, each victim used once across
//! every run of the campaign, so no batch can depend on another.
//!
//! No run is discarded and no run is selected: every sample is published next
//! to the median. The `100k / 1k` ratio is a criterion (`BASELINE_TARGETS
//! §3.3`); if it exceeds 2 the artifact says `FAIL` and nothing is adjusted.

use crate::domain::{NodeDto, NodeKind};
use crate::hierarchy;
use crate::identity::{IdentityProvenance, NodeIdentity};
use crate::incremental::{ObservedNode, ParentRef, UpdateBatch};
use crate::index::Index;
use std::path::PathBuf;
use std::time::Instant;

/// Measured executions per case. Every one is kept.
const RUNS: usize = 7;

/// `BASELINE_TARGETS §3.3` — the absolute targets, in milliseconds. Reported as
/// PASS/FAIL on the machine that measured them, never generalised.
const TARGET_1K_10_MS: f64 = 200.0;
const TARGET_10K_10_MS: f64 = 250.0;
const TARGET_100K_10_MS: f64 = 400.0;
const TARGET_100K_1000_MS: f64 = 3_000.0;

/// `BASELINE_TARGETS §3.3` — the rejection criterion: at 10 changes, the
/// median at 100k must not exceed twice the median at 1k.
const RATIO_CEILING: f64 = 2.0;

struct Fixture {
    nodes: Vec<NodeDto>,
    identities: Vec<NodeIdentity>,
    /// Canonical ids (`position + 1`) of the leaf files, in id order.
    files: Vec<usize>,
    /// Canonical ids of the directories (root excluded), in id order.
    directories: Vec<usize>,
}

fn key(id: usize) -> String {
    format!("K-{id}")
}

/// The deterministic corpus of `count` nodes.
fn fixture(count: usize) -> Fixture {
    assert!(count >= 2);
    // Node `k` (1 = root) has parent `(k - 2) / 10 + 1`; node `p` has children
    // exactly when `10 * (p - 1) + 2 <= count`.
    let has_children = |p: usize| 10 * (p - 1) + 2 <= count;
    let mut nodes: Vec<NodeDto> = Vec::with_capacity(count);
    let mut identities = Vec::with_capacity(count);
    let mut files = Vec::new();
    let mut directories = Vec::new();
    for k in 1..=count {
        let (parent, name, path, depth, kind) = if k == 1 {
            (None, "racine".to_string(), String::new(), 0, NodeKind::Root)
        } else {
            let parent = (k - 2) / 10 + 1;
            let above = &nodes[parent - 1];
            let dir = has_children(k);
            let name = if dir {
                format!("d{k}")
            } else {
                format!("f{k}.txt")
            };
            let path = if above.relative_path.is_empty() {
                name.clone()
            } else {
                format!("{}/{name}", above.relative_path)
            };
            let kind = if dir {
                NodeKind::Directory
            } else {
                NodeKind::File
            };
            if dir {
                directories.push(k);
            } else {
                files.push(k);
            }
            (Some(parent as i64), name, path, above.depth + 1, kind)
        };
        let is_file = kind == NodeKind::File;
        nodes.push(NodeDto {
            id: k as i64,
            parent_id: parent,
            name,
            relative_path: path,
            kind,
            depth,
            size_bytes: if is_file { (k % 1_000) as u64 } else { 0 },
            modified_unix_ms: is_file.then_some(1_000_000 + k as i64),
            online_only: false,
            reparse_point: false,
            child_count: 0,
            seen: false,
        });
        identities.push(NodeIdentity {
            node_id: k as i64,
            stable_key: key(k),
            provenance: IdentityProvenance::System,
        });
    }
    for k in 2..=count {
        let parent = (k - 2) / 10 + 1;
        nodes[parent - 1].child_count += 1;
    }
    Fixture {
        nodes,
        identities,
        files,
        directories,
    }
}

fn build_index(path: &std::path::Path, fixture: &Fixture) -> Index {
    let mut index = Index::open(path).expect("open the bench index");
    index
        .publish_with_identity(
            &fixture.nodes,
            &fixture.identities,
            &[("built_unix_ms", "1700000000000".to_string())],
            &[],
        )
        .expect("publish the corpus");
    index
}

/// A step coprime with `len`, so `i * step mod len` visits distinct positions
/// for `i < len` — the victims are spread across the corpus, not adjacent.
fn coprime_step(len: usize) -> usize {
    fn gcd(a: usize, b: usize) -> usize {
        if b == 0 { a } else { gcd(b, a % b) }
    }
    let mut step = 7_919 % len.max(1);
    while step == 0 || gcd(step, len) != 1 {
        step += 1;
    }
    step
}

/// How a batch of `changes` is split: creations, modifications, renames, moves,
/// deletions. The parts always add up to `changes`.
fn mix(changes: usize) -> [usize; 5] {
    let created = changes * 3 / 10;
    let modified = changes * 3 / 10;
    let renamed = changes / 10;
    let moved = changes / 10;
    let deleted = changes - created - modified - renamed - moved;
    [created, modified, renamed, moved, deleted]
}

/// One batch of `changes` mixed changes. `first_victim` is the number of leaf
/// files already consumed by earlier batches of the campaign.
fn build_batch(fixture: &Fixture, run: usize, changes: usize, first_victim: usize) -> UpdateBatch {
    let [creations, modifications, renames, moves, deletions] = mix(changes);
    let file_step = coprime_step(fixture.files.len());
    let dir_step = coprime_step(fixture.directories.len());
    let mut victim = first_victim;
    let mut next_file = || {
        let id = fixture.files[victim * file_step % fixture.files.len()];
        victim += 1;
        id
    };
    let mut token = 0_i64;
    let mut batch = UpdateBatch {
        detected_unix_ms: 1_700_000_000_000 + run as i64,
        ..UpdateBatch::default()
    };
    let mut upsert = |batch: &mut UpdateBatch,
                      identity_key: String,
                      parent: usize,
                      name: String,
                      size: u64,
                      mtime: i64| {
        token += 1;
        let above = &fixture.nodes[parent - 1];
        let path = if above.relative_path.is_empty() {
            name.clone()
        } else {
            format!("{}/{name}", above.relative_path)
        };
        batch.upserts.push(ObservedNode {
            identity: NodeIdentity {
                node_id: token,
                stable_key: identity_key,
                provenance: IdentityProvenance::System,
            },
            parent: ParentRef::Existing(parent as i64),
            name,
            relative_path: path,
            kind: NodeKind::File,
            depth: above.depth + 1,
            size_bytes: size,
            modified_unix_ms: Some(mtime),
            online_only: false,
            reparse_point: false,
        });
    };

    for n in 0..creations {
        let parent = fixture.directories[(run * 977 + n) * dir_step % fixture.directories.len()];
        upsert(
            &mut batch,
            format!("K-new-{run}-{n}"),
            parent,
            format!("new-{run}-{n}.txt"),
            7,
            2_000_000 + n as i64,
        );
    }
    for _ in 0..modifications {
        let id = next_file();
        let node = &fixture.nodes[id - 1];
        upsert(
            &mut batch,
            key(id),
            node.parent_id.expect("a file has a parent") as usize,
            node.name.clone(),
            node.size_bytes + 1,
            node.modified_unix_ms.unwrap_or(0) + 1,
        );
    }
    for n in 0..renames {
        let id = next_file();
        let node = &fixture.nodes[id - 1];
        upsert(
            &mut batch,
            key(id),
            node.parent_id.expect("a file has a parent") as usize,
            format!("ren-{run}-{n}.txt"),
            node.size_bytes,
            node.modified_unix_ms.unwrap_or(0),
        );
    }
    for n in 0..moves {
        let id = next_file();
        let node = &fixture.nodes[id - 1];
        let current = node.parent_id.expect("a file has a parent") as usize;
        let mut target =
            fixture.directories[(run * 613 + n) * dir_step % fixture.directories.len()];
        if target == current {
            target =
                fixture.directories[((run * 613 + n) * dir_step + 1) % fixture.directories.len()];
        }
        upsert(
            &mut batch,
            key(id),
            target,
            node.name.clone(),
            node.size_bytes,
            node.modified_unix_ms.unwrap_or(0),
        );
    }
    for _ in 0..deletions {
        batch.deletions.push(next_file() as i64);
    }
    batch
}

#[derive(Debug)]
struct CaseResult {
    corpus: usize,
    changes: usize,
    samples_us: Vec<u128>,
    /// Rows SQLite reports having written, per run (`sqlite3_total_changes`).
    written_rows: Vec<u64>,
}

impl CaseResult {
    fn sorted(&self) -> Vec<u128> {
        let mut sorted = self.samples_us.clone();
        sorted.sort_unstable();
        sorted
    }
    fn median_us(&self) -> u128 {
        self.sorted()[self.samples_us.len() / 2]
    }
    fn min_us(&self) -> u128 {
        self.sorted()[0]
    }
    fn max_us(&self) -> u128 {
        *self.sorted().last().expect("at least one run")
    }
    fn median_ms(&self) -> f64 {
        self.median_us() as f64 / 1_000.0
    }
}

/// Runs `runs` batches of `changes` against `index`, timing **only** the
/// kernel call. `first_victim` advances so no leaf file is reused.
fn run_case(
    index: &mut Index,
    fixture: &Fixture,
    changes: usize,
    runs: usize,
    first_victim: &mut usize,
    first_run: usize,
) -> CaseResult {
    let mut samples_us = Vec::with_capacity(runs);
    let mut written_rows = Vec::with_capacity(runs);
    for run in 0..runs {
        let batch = build_batch(fixture, first_run + run, changes, *first_victim);
        *first_victim += mix(changes)[1] + mix(changes)[2] + mix(changes)[3] + mix(changes)[4];
        let before = index.connection.total_changes();
        let started = Instant::now();
        let outcome = index.apply_update_batch(&batch).expect("the batch applies");
        let elapsed = started.elapsed().as_micros();
        assert!(outcome.applied, "the measured batch must do real work");
        assert_eq!(
            outcome.journal.total as usize, changes,
            "one journal event per change: the kernel did all of the work it was timed for"
        );
        samples_us.push(elapsed);
        written_rows.push(index.connection.total_changes() - before);
    }
    CaseResult {
        corpus: fixture.nodes.len(),
        changes,
        samples_us,
        written_rows,
    }
}

/// After a campaign, outside any timing: the counters agree with the rows and
/// every parent's `child_count` is exact.
fn verify_invariants(index: &Index, expected_events: usize) -> serde_json::Value {
    let rows: i64 = index
        .connection
        .query_row("SELECT COUNT(*) FROM nodes", [], |row| row.get(0))
        .unwrap();
    let recorded: i64 = index
        .connection
        .query_row(
            "SELECT CAST(value AS INTEGER) FROM schema_meta WHERE key = 'node_count'",
            [],
            |row| row.get(0),
        )
        .unwrap();
    let mismatches = hierarchy::child_count_mismatches(&index.connection, 10).unwrap();
    let events: i64 = index
        .connection
        .query_row("SELECT COUNT(*) FROM change_events", [], |row| row.get(0))
        .unwrap();
    assert_eq!(rows, recorded, "node_count stays exact");
    assert!(mismatches.is_empty(), "child_count stays exact");
    assert_eq!(
        events as usize, expected_events,
        "one event per applied change"
    );
    serde_json::json!({
        "nodeCountExact": rows == recorded,
        "childCountMismatches": mismatches.len(),
        "journalEvents": events,
        "expectedJournalEvents": expected_events,
    })
}

/// A full republication of the *unchanged* corpus through the existing path —
/// the cost the kernel replaces. Context only: it is not a target.
fn full_replacement_reference_ms(index: &mut Index, fixture: &Fixture, runs: usize) -> Vec<f64> {
    (0..runs)
        .map(|_| {
            // The stored corpus has moved on; publishing the base snapshot is
            // still one full `DELETE FROM nodes` + reinsertion of `n` rows.
            let started = Instant::now();
            index
                .publish_with_identity(
                    &fixture.nodes,
                    &fixture.identities,
                    &[("built_unix_ms", "1700000000000".to_string())],
                    &[],
                )
                .expect("full republication");
            started.elapsed().as_micros() as f64 / 1_000.0
        })
        .collect()
}

fn case_json(result: &CaseResult, target_ms: f64) -> serde_json::Value {
    let median_ms = result.median_ms();
    let mut written = result.written_rows.clone();
    written.sort_unstable();
    serde_json::json!({
        "corpusNodes": result.corpus,
        "changes": result.changes,
        "mix": {
            "created": mix(result.changes)[0],
            "modified": mix(result.changes)[1],
            "renamed": mix(result.changes)[2],
            "moved": mix(result.changes)[3],
            "deleted": mix(result.changes)[4],
        },
        "runs": result.samples_us.len(),
        "samplesUs": result.samples_us,
        "medianUs": result.median_us(),
        "minUs": result.min_us(),
        "maxUs": result.max_us(),
        "medianMs": median_ms,
        "sqliteRowsWrittenPerRun": result.written_rows,
        "sqliteRowsWrittenMedian": written[written.len() / 2],
        "targetMs": target_ms,
        "medianMeetsTarget": median_ms <= target_ms,
        "maxMeetsTarget": (result.max_us() as f64 / 1_000.0) <= target_ms,
        "verdictAbsoluteTarget": if median_ms <= target_ms { "PASS" } else { "FAIL" },
    })
}

/// Declared measurement conditions beyond the defaults, from the environment:
/// `TASK0040_CHECKPOINT=1` truncates the WAL after building each corpus (so
/// the measured batches do not read pages that still live in the fixture's
/// WAL); `TASK0040_CACHE_KIB=<n>` sets SQLite's page cache. Both are recorded
/// in the artifact; **neither is a product setting**.
fn apply_conditions(index: &Index) {
    if std::env::var("TASK0040_CHECKPOINT").is_ok_and(|value| value == "1") {
        index
            .connection
            .execute_batch("PRAGMA wal_checkpoint(TRUNCATE);")
            .expect("checkpoint after building the fixture");
    }
    if let Ok(kib) = std::env::var("TASK0040_CACHE_KIB") {
        let kib: u64 = kib.parse().expect("TASK0040_CACHE_KIB is a number");
        index
            .connection
            .execute_batch(&format!("PRAGMA cache_size=-{kib};"))
            .expect("set the page cache");
    }
}

fn conditions() -> serde_json::Value {
    serde_json::json!({
        "checkpointAfterBuild": std::env::var("TASK0040_CHECKPOINT").is_ok_and(|v| v == "1"),
        "pageCacheKiB": std::env::var("TASK0040_CACHE_KIB").ok().unwrap_or_else(|| "sqlite default (2000)".to_string()),
    })
}

fn environment() -> serde_json::Value {
    let rustc = std::process::Command::new("rustc")
        .arg("--version")
        .output()
        .ok()
        .and_then(|output| String::from_utf8(output.stdout).ok())
        .map(|text| text.trim().to_string());
    serde_json::json!({
        "os": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
        "cpu": std::env::var("PROCESSOR_IDENTIFIER").ok(),
        "logicalProcessors": std::thread::available_parallelism().map(|n| n.get()).ok(),
        "rustc": rustc,
        "sqlite": rusqlite::version(),
        "buildProfile": if cfg!(debug_assertions) { "test (debug_assertions on)" } else { "release" },
        "profileOverride": std::env::var("CARGO_PROFILE_DEV_OPT_LEVEL").ok().map(|level| format!("opt-level={level}")),
        "storage": "on-disk SQLite in the repository sandbox (ignored by Git)",
        "journalMode": "WAL",
        "synchronous": "NORMAL",
        "foreignKeys": "ON",
        "conditions": conditions(),
        "runsPerCase": RUNS,
        "discardedRuns": 0,
        "note": "One machine, one session. Not a laptop-modest acceptance run; the absolute \
                 targets are reported for this machine only.",
    })
}

fn sandbox() -> PathBuf {
    let manifest =
        std::env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR is set by cargo test");
    PathBuf::from(manifest)
        .parent()
        .expect("repository root is the parent of src-tauri")
        .join(".filetopo-sandbox")
        .join("task0040")
}

/// Writes the artifact under `docs/performance/runs`, refusing anything that
/// is not `TASK-0040-*.json`, any sealed name, and any personal identifier.
fn write_artifact(name: &str, body: serde_json::Value) -> std::io::Result<PathBuf> {
    assert!(
        !crate::map::commands::PROTECTED_RUN_ARTIFACTS.contains(&name),
        "TASK-0040 never writes a sealed artifact: {name}"
    );
    assert!(
        name.starts_with("TASK-0040-") && name.ends_with(".json"),
        "this bench only writes its own artifacts: {name}"
    );
    let document = serde_json::json!({
        "task": "TASK-0040",
        "title": "V1 Incremental Update Application Kernel — F-031 measurement",
        "status": crate::scale_spike::MEASUREMENT_BANNER,
        "decision": "DEC-0038",
        "criterion": "docs/performance/BASELINE_TARGETS.md §3.3",
        "notAProductClaim":
            "Mesures d'ingénierie du noyau d'application (lot déjà réconcilié) sur corpus \
             synthétique. Ni détection de changements ni watcher : la latence de bout en bout \
             d'une mise à jour disque n'est pas mesurée ici.",
        "measurement": body,
    });
    let serialised = serde_json::to_string_pretty(&document)
        .map_err(|error| std::io::Error::other(error.to_string()))?;
    crate::scale_spike::report::assert_clean(&serialised);
    let directory = crate::scale_spike::runs_directory();
    std::fs::create_dir_all(&directory)?;
    let path = directory.join(name);
    std::fs::write(&path, serialised.as_bytes())?;
    Ok(path)
}

fn tag() -> String {
    std::env::var("TASK0040_PROFILE_TAG").unwrap_or_else(|_| "dev".to_string())
}

#[test]
#[ignore = "TASK-0040 campaign: builds 1k, 10k and 100k node indexes on disk"]
fn f031_incremental_apply_scaling() {
    let root = sandbox();
    std::fs::create_dir_all(&root).unwrap();

    let mut cases = Vec::new();
    let mut references = Vec::new();
    let mut invariants = Vec::new();
    let mut ten_change_medians: Vec<(usize, f64)> = Vec::new();

    for (corpus, campaign) in [
        (1_000_usize, vec![10_usize]),
        (10_000, vec![10]),
        (100_000, vec![10, 1_000]),
    ] {
        let fixture = fixture(corpus);
        let path = root.join(format!("corpus-{corpus}.sqlite3"));
        for suffix in ["", "-wal", "-shm"] {
            let _ = std::fs::remove_file(format!("{}{suffix}", path.display()));
        }
        let mut index = build_index(&path, &fixture);
        apply_conditions(&index);
        let mut consumed = 0;
        let mut run_counter = 0;
        let mut expected_events = 0;
        for changes in campaign {
            let result = run_case(
                &mut index,
                &fixture,
                changes,
                RUNS,
                &mut consumed,
                run_counter,
            );
            run_counter += RUNS;
            expected_events += changes * RUNS;
            let target = match (corpus, changes) {
                (1_000, 10) => TARGET_1K_10_MS,
                (10_000, 10) => TARGET_10K_10_MS,
                (100_000, 10) => TARGET_100K_10_MS,
                _ => TARGET_100K_1000_MS,
            };
            println!(
                "F031 corpus={corpus} changes={changes} median_ms={:.3} min_ms={:.3} max_ms={:.3} rows_written_median={}",
                result.median_ms(),
                result.min_us() as f64 / 1_000.0,
                result.max_us() as f64 / 1_000.0,
                {
                    let mut written = result.written_rows.clone();
                    written.sort_unstable();
                    written[written.len() / 2]
                },
            );
            if changes == 10 {
                ten_change_medians.push((corpus, result.median_us() as f64));
            }
            cases.push(case_json(&result, target));
        }
        invariants.push(serde_json::json!({
            "corpusNodes": corpus,
            "afterCampaign": verify_invariants(&index, expected_events),
        }));
        let reference = full_replacement_reference_ms(&mut index, &fixture, 3);
        println!("F031 corpus={corpus} full_replacement_reference_ms={reference:?}");
        references.push(serde_json::json!({
            "corpusNodes": corpus,
            "runs": reference.len(),
            "samplesMs": reference,
            "note": "Existing full-replacement publication of the unchanged corpus, for context. Not a target.",
        }));
        drop(index);
        if std::env::var("TASK0040_KEEP_SANDBOX").map_or(true, |value| value != "1") {
            for suffix in ["", "-wal", "-shm"] {
                let _ = std::fs::remove_file(format!("{}{suffix}", path.display()));
            }
        }
    }

    let median_at = |corpus: usize| {
        ten_change_medians
            .iter()
            .find(|(size, _)| *size == corpus)
            .map(|(_, median)| *median)
            .expect("a 10-change case per corpus")
    };
    let ratio = median_at(100_000) / median_at(1_000);
    let verdict = if ratio <= RATIO_CEILING {
        "PASS"
    } else {
        "FAIL"
    };
    println!(
        "F031 ratio_100k_over_1k_at_10_changes={ratio:.3} ceiling={RATIO_CEILING} verdict={verdict}"
    );

    let body = serde_json::json!({
        "environment": environment(),
        "cases": cases,
        "rejectionCriterion": {
            "text": "à 10 changements, la médiane sur 100k ne dépasse pas 2× la médiane sur 1k (BASELINE_TARGETS §3.3)",
            "median1kUs": median_at(1_000),
            "median10kUs": median_at(10_000),
            "median100kUs": median_at(100_000),
            "ratio100kOver1k": ratio,
            "ceiling": RATIO_CEILING,
            "verdict": verdict,
            "f031Satisfied": ratio <= RATIO_CEILING,
        },
        "invariantsAfterCampaign": invariants,
        "fullReplacementReference": references,
    });
    let path = write_artifact(&format!("TASK-0040-incremental-apply-{}.json", tag()), body)
        .expect("write the artifact");
    println!(
        "F031 artifact written: {}",
        path.file_name().unwrap().to_string_lossy()
    );
}

/// The generator's batches are valid and do the work they claim, at a size
/// small enough to run on every `cargo test`.
#[test]
fn the_bench_generator_produces_valid_batches_that_the_kernel_applies() {
    let fixture = fixture(1_000);
    assert_eq!(fixture.nodes.len(), 1_000);
    assert!(fixture.files.len() > 800 && !fixture.directories.is_empty());
    let directory = tempfile::tempdir().unwrap();
    let mut index = build_index(&directory.path().join("bench.sqlite3"), &fixture);
    // The canonical id of every node is its position: the generator's own
    // assumption about the counter, checked rather than trusted.
    let id: i64 = index
        .connection
        .query_row("SELECT id FROM nodes WHERE stable_key = 'K-777'", [], |r| {
            r.get(0)
        })
        .unwrap();
    assert_eq!(id, 777);

    let mut consumed = 0;
    let first = run_case(&mut index, &fixture, 10, 3, &mut consumed, 0);
    let second = run_case(&mut index, &fixture, 100, 2, &mut consumed, 3);
    assert_eq!(first.samples_us.len(), 3);
    assert_eq!(second.samples_us.len(), 2);
    assert_eq!(mix(10), [3, 3, 1, 1, 2]);
    assert_eq!(mix(1_000), [300, 300, 100, 100, 200]);
    assert_eq!(mix(7).iter().sum::<usize>(), 7);
    let report = verify_invariants(&index, 10 * 3 + 100 * 2);
    assert_eq!(report["childCountMismatches"], 0);
}
