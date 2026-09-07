//! The campaigns themselves. **Test-only, and `#[ignore]` by default.**
//!
//! Nothing here runs during an ordinary `cargo test`: building a hundred
//! thousand files and a million index rows is a deliberate act, started by
//! `scripts/task0028-scale-spike.ps1` or by `cargo test -- --ignored`.
//!
//! The invariants of the harness itself are covered by the ordinary tests in
//! [`super::bounded`], [`super::census`], [`super::generator`],
//! [`super::profile`] and [`super::report`], which do run every time.

use super::{Distribution, QUERY_REPETITIONS, QUERY_WARMUPS, VIEW_BUDGETS, bounded, census,
            generator, profile, report};
use crate::index::Index;
use crate::map::layout;
use crate::scanner;
use serde_json::{Value, json};
use std::fs;
use std::path::Path;
use std::time::Instant;

/// Search patterns of `SS3`, deterministic and derived from the generator's own
/// naming, never from anything observed.
const SEARCH_PATTERNS: [(&str, &str); 4] = [
    ("hit-debut", "h-000"),
    ("hit-milieu", "f-00"),
    ("hit-fin", "leaf-23"),
    ("miss", "zzz-aucun-resultat-zzz"),
];

fn elapsed_us(started: Instant) -> u128 {
    started.elapsed().as_micros()
}

/// Which Cargo profile produced these numbers.
///
/// Published because it changes them by a large factor, and a timing whose
/// build profile is unstated is not a measurement.
fn build_profile() -> &'static str {
    if cfg!(debug_assertions) {
        "debug (unoptimized + debug assertions)"
    } else {
        "release (optimized)"
    }
}

/// Removes a bench directory the harness itself created, inside the sandbox.
///
/// Refuses anything outside `.filetopo-sandbox/task0028`, and is skipped
/// entirely when `TASK0028_KEEP_SANDBOX=1`, so a controller can inspect the
/// bench before it disappears.
fn reset_bench_directory(path: &Path) {
    let sandbox = super::sandbox_root();
    assert!(
        path.starts_with(&sandbox),
        "the harness only ever removes its own sandbox directories"
    );
    if std::env::var("TASK0028_KEEP_SANDBOX").is_ok_and(|value| value == "1") {
        return;
    }
    if path.exists() {
        let _ = fs::remove_dir_all(path);
    }
}

/// `SS3` — the production search path, `P-08`, with a separate warm-up.
fn measure_search(index: &Index, expected_hits: bool) -> Value {
    let mut per_pattern = serde_json::Map::new();
    for (label, needle) in SEARCH_PATTERNS {
        for _ in 0..QUERY_WARMUPS {
            let _ = index.query_nodes(needle, None, None, false, 100, 0);
        }
        let mut samples = Vec::with_capacity(QUERY_REPETITIONS);
        let mut total = 0usize;
        let mut first_page = 0usize;
        for _ in 0..QUERY_REPETITIONS {
            let started = Instant::now();
            let (page, found) = index
                .query_nodes(needle, None, None, false, 100, 0)
                .expect("P-08 query");
            samples.push(elapsed_us(started));
            total = found;
            first_page = page.len();
        }

        // Real pagination: the second page must exist, not overlap, and the
        // total must not move between pages.
        let (page_one, total_one) = index
            .query_nodes(needle, None, None, false, 100, 0)
            .expect("page 1");
        let (page_two, total_two) = index
            .query_nodes(needle, None, None, false, 100, 100)
            .expect("page 2");
        let overlap = page_one
            .iter()
            .filter(|left| page_two.iter().any(|right| right.id == left.id))
            .count();

        per_pattern.insert(
            label.to_string(),
            json!({
                "needle": needle,
                "exactTotal": total,
                "firstPageSize": first_page,
                "secondPageSize": page_two.len(),
                "pageOverlap": overlap,
                "totalStableAcrossPages": total_one == total_two,
                "latency": Distribution::of(&samples).to_json(),
            }),
        );
        if expected_hits && label != "miss" {
            assert!(total > 0, "pattern {label} must match the synthetic corpus");
        }
        assert_eq!(overlap, 0, "pattern {label}: pages overlapped");
    }
    json!({
        "method": "Index::query_nodes — le chemin de recherche de production, non un prototype.",
        "warmups": QUERY_WARMUPS,
        "repetitions": QUERY_REPETITIONS,
        "cacheNote": "Aucun cache n'existe sur ce chemin; aucun n'est simulé.",
        "patterns": Value::Object(per_pattern),
    })
}

/// `SS4` — bounded query prototypes, timed against the same index.
fn measure_bounded_queries(index: &Index, focus: i64, widest: i64) -> Value {
    let connection = index.connection_for_bench();
    let timed = |label: &str, mut run: Box<dyn FnMut() -> u64 + '_>| {
        for _ in 0..QUERY_WARMUPS {
            let _ = run();
        }
        let mut samples = Vec::with_capacity(QUERY_REPETITIONS);
        let mut last = 0u64;
        for _ in 0..QUERY_REPETITIONS {
            let started = Instant::now();
            last = run();
            samples.push(elapsed_us(started));
        }
        (label.to_string(), last, Distribution::of(&samples).to_json())
    };

    let (_, children_total, children_latency) = timed(
        "childrenPage",
        Box::new(|| {
            bounded::children_page(connection, widest, 100, 0)
                .expect("children page")
                .len() as u64
        }),
    );
    let (_, ancestor_total, ancestor_latency) = timed(
        "ancestors",
        Box::new(|| bounded::ancestors(connection, focus).expect("ancestors").len() as u64),
    );
    let (_, direct_total, direct_latency) = timed(
        "directChildCount",
        Box::new(|| bounded::direct_child_count(connection, widest).expect("count")),
    );

    // The subtree count is the expensive one, and is measured with fewer runs:
    // at a million rows it walks the whole subtree.
    let mut subtree_samples = Vec::new();
    let mut subtree_total = 0u64;
    for _ in 0..3 {
        let started = Instant::now();
        subtree_total = bounded::subtree_count(connection, widest).expect("subtree count");
        subtree_samples.push(elapsed_us(started));
    }

    json!({
        "note": "Prototypes de banc. Le query engine borné n'est PAS implémenté dans le produit.",
        "childrenPage": {
            "pageSize": children_total,
            "deterministicOrder": "kind = 'directory' DESC, name COLLATE NOCASE, id",
            "latency": children_latency,
        },
        "ancestors": { "chainLength": ancestor_total, "latency": ancestor_latency },
        "directChildCountExact": { "value": direct_total, "latency": direct_latency },
        "subtreeCountExact": {
            "value": subtree_total,
            "latency": Distribution::of(&subtree_samples).to_json(),
            "note": "Récursif : le coût suit la taille du sous-arbre, pas le budget de vue.",
        },
        "relationalNeighbourhood": {
            "measured": false,
            "reason": "Le store d'index (`nodes`) ne porte aucune relation. Les relations vivent \
                       dans le store de cerveau, hors de cette couche. Rien n'est simulé.",
        },
    })
}

/// `SS5` + `SS6` — bounded materialization and the layout of the bounded view.
fn measure_bounded_views(index: &Index, census: &census::Census) -> Value {
    let connection = index.connection_for_bench();
    let root = census.root().expect("root");
    let widest = census.widest_node().expect("widest");
    let mut runs = Vec::new();

    for (focus_label, focus) in [("root", root), ("widest-folder", widest)] {
        for budget in VIEW_BUDGETS {
            // Cheap variant: exact direct-children counts only.
            let started = Instant::now();
            let cheap = bounded::materialize(connection, focus, budget, false).expect("view");
            let cheap_us = elapsed_us(started);

            // Exact variant: additionally the exact element total behind each
            // aggregate, which costs a recursive walk.
            let started = Instant::now();
            let exact = bounded::materialize(connection, focus, budget, true).expect("view");
            let exact_us = elapsed_us(started);

            let breaches = bounded::aggregate_breaches(&exact);
            assert!(
                breaches.is_empty(),
                "F-051 breached at focus {focus_label}, budget {budget}: {breaches:?}"
            );
            let (covered, expected) = bounded::coverage(&exact, census);

            // SS6 — layout of the bounded view only. The corpus is never laid
            // out, at any size.
            let mut slot_of = std::collections::HashMap::new();
            for (slot, _) in exact.entities.iter().enumerate() {
                slot_of.insert(slot, None::<usize>);
            }
            for edge in &exact.edges {
                slot_of.insert(edge.to, Some(edge.from));
            }
            let parents = (0..exact.entities.len())
                .map(|slot| slot_of.get(&slot).copied().flatten())
                .collect::<Vec<_>>();
            let started = Instant::now();
            let laid_out = layout::compute(layout::LayoutInput { parents: &parents });
            let layout_us = elapsed_us(started);

            runs.push(json!({
                "focus": focus_label,
                "budget": budget,
                "entities": exact.entities.len(),
                "realNodes": exact.real_node_count(),
                "aggregates": exact.aggregate_count(),
                "edges": exact.edges.len(),
                "hiddenDirectChildrenExact": exact.hidden_direct_total(),
                "unexpandedDirectories": exact.unexpanded_directories().len(),
                "elementsAccountedFor": covered,
                "elementsInFocusSubtree": expected,
                "accountingExact": covered == expected,
                "aggregateInvariantBreaches": breaches.len(),
                "payloadBytes": exact.payload_bytes(),
                "materializeDirectCountsUs": cheap_us,
                "materializeExactSubtreeCountsUs": exact_us,
                "cheapAndExactAgreeOnCardinality":
                    cheap.entities.len() == exact.entities.len(),
                "layout": {
                    "algorithm": layout::LAYOUT_ALGORITHM,
                    "computeUs": layout_us,
                    "rects": laid_out.rects.len(),
                    "invocations": laid_out.invocations,
                    "worldWidth": laid_out.width,
                    "worldHeight": laid_out.height,
                },
            }));
        }
    }

    json!({
        "note": "Prototype de banc non exposé au produit. Aucun budget n'est décidé final.",
        "budgetsTested": VIEW_BUDGETS,
        "runs": runs,
    })
}

/// `SS2` — database footprint on disk, journals included.
fn database_bytes(path: &Path) -> Value {
    let size = |suffix: &str| -> u64 {
        let mut candidate = path.as_os_str().to_os_string();
        candidate.push(suffix);
        fs::metadata(Path::new(&candidate))
            .map(|meta| meta.len())
            .unwrap_or_default()
    };
    json!({
        "databaseBytes": size(""),
        "walBytes": size("-wal"),
        "shmBytes": size("-shm"),
    })
}

/// `SCAN-SCALE` — the real pipeline on a real synthetic tree.
fn run_scan_scale(total: usize, artifact: &str) {
    let bench = super::sandbox_root().join(format!("scan-{total}"));
    reset_bench_directory(&bench);
    fs::create_dir_all(&bench).expect("bench directory");
    // `I-2`: the index sits beside the analysed root, never inside it.
    let source = bench.join("source");
    let database = bench.join("index.sqlite");

    let profile = profile::capture();

    let started = Instant::now();
    let plan = generator::plan(total);
    let plan_us = elapsed_us(started);

    let started = Instant::now();
    let (directories, files) = generator::materialize(&source, &plan).expect("materialize");
    let generation_us = elapsed_us(started);

    let (fingerprint_before, counted_before) = generator::fingerprint(&source).expect("before");

    // --- SS1: the production scan, cold ------------------------------------
    let started = Instant::now();
    let scan = scanner::scan_tree_controlled(&source, || false, |_| {}).expect("scan");
    let scan_cold_us = elapsed_us(started);

    let started = Instant::now();
    let warm = scanner::scan_tree_controlled(&source, || false, |_| {}).expect("scan warm");
    let scan_warm_us = elapsed_us(started);
    assert_eq!(scan.nodes.len(), warm.nodes.len(), "two scans must agree");

    let mut index = Index::open(&database).expect("index");
    let started = Instant::now();
    index.replace_nodes(&scan.nodes).expect("index build");
    let index_us = elapsed_us(started);

    let started = Instant::now();
    index.replace_nodes(&scan.nodes).expect("index rebuild");
    let rebuild_us = elapsed_us(started);

    let working_set_after_index = profile::working_set_bytes();

    let (fingerprint_after, counted_after) = generator::fingerprint(&source).expect("after");
    assert_eq!(
        fingerprint_before, fingerprint_after,
        "I-1 breached: the measurement changed the source"
    );

    // --- SS3 / SS4 / SS5 / SS6 ---------------------------------------------
    let search = measure_search(&index, true);
    let census = census::Census::read(index.connection_for_bench()).expect("census");
    let widest = census.widest_node().expect("widest");
    let root = census.root().expect("root");
    let bounded_queries = measure_bounded_queries(&index, widest, widest);
    let views = measure_bounded_views(&index, &census);
    let working_set_end = profile::working_set_bytes();
    let working_set_max = [working_set_after_index, working_set_end]
        .into_iter()
        .flatten()
        .max();

    drop(index);
    let footprint = database_bytes(&database);

    let body = json!({
        "layer": "SCAN-SCALE",
        "layerNote": "Arborescence physique réellement parcourue par le scanner de production.",
        "requestedElements": total,
        "buildProfile": build_profile(),
        "bench": profile.to_json(),
        "ss1IndexAndRebuild": {
            "planUs": plan_us,
            "syntheticGenerationUs": generation_us,
            "syntheticGenerationNote":
                "Chronométrée à part : ce temps n'appartient pas à FileTopo.",
            "directoriesCreated": directories,
            "filesCreated": files,
            "expectedElements": plan.len(),
            "scannedElements": scan.nodes.len(),
            "indexedElements": index_count(&database),
            "countsMatch": plan.len() == scan.nodes.len(),
            "scanColdUs": scan_cold_us,
            "scanWarmUs": scan_warm_us,
            "indexBuildUs": index_us,
            "indexRebuildUs": rebuild_us,
            "scanDiagnostics": scan.diagnostics.len(),
            "scanDiagnosticCodes": scan
                .diagnostics
                .iter()
                .map(|diagnostic| diagnostic.code.clone())
                .collect::<Vec<_>>(),
        },
        "ss1SourceIntegrity": {
            "method": "Empreinte structurelle FNV-1a sur chemin|type|taille. Aucun octet de \
                       contenu n'est lu; aucune campagne SHA-256 n'est lancée.",
            "entriesBefore": counted_before,
            "entriesAfter": counted_after,
            "fingerprintBefore": format!("{fingerprint_before:016x}"),
            "fingerprintAfter": format!("{fingerprint_after:016x}"),
            "sourceUnchanged": fingerprint_before == fingerprint_after,
        },
        "ss2StorageAndMemory": {
            "database": footprint,
            "workingSetAfterIndexBytes": working_set_after_index,
            "workingSetAtEndBytes": working_set_end,
            "workingSetMaxObservedBytes": working_set_max,
            "method": "Get-Process -Id <pid> du processus de test, via PowerShell. Aucune \
                       dépendance nouvelle. Les relevés sont ponctuels : le maximum publié est \
                       le plus grand des échantillons pris, PAS un pic garanti du processus.",
            "wholeCorpusSerialisedToFrontend": false,
        },
        "ss3SearchP08": search,
        "ss4BoundedQueries": bounded_queries,
        "ss5And6BoundedViews": views,
        "focusNodes": { "root": root, "widestFolder": widest,
                        "widestFolderDirectChildren": census.direct_children_of(widest) },
    });

    let path = report::write_artifact(artifact, body).expect("artifact");
    println!("TASK-0028 {artifact} -> {}", path.display());
    reset_bench_directory(&bench);
}

fn index_count(database: &Path) -> i64 {
    let connection = rusqlite::Connection::open(database).expect("reopen");
    connection
        .query_row("SELECT COUNT(*) FROM nodes", [], |row| row.get(0))
        .expect("count")
}

#[test]
#[ignore = "TASK-0028 campaign: creates 10 000 physical entries"]
fn ss_scan_scale_10k() {
    run_scan_scale(10_000, "TASK-0028-SS-10k.json");
}

#[test]
#[ignore = "TASK-0028 campaign: creates 100 000 physical entries"]
fn ss_scan_scale_100k() {
    run_scan_scale(100_000, "TASK-0028-SS-100k.json");
}

#[test]
#[ignore = "TASK-0028 campaign: builds a 1 000 000 row bench index"]
fn ss_index_scale_1m() {
    const TOTAL: usize = 1_000_000;
    let bench = super::sandbox_root().join("index-scale-1m");
    reset_bench_directory(&bench);
    fs::create_dir_all(&bench).expect("bench directory");
    let database = bench.join("index.sqlite");

    let profile = profile::capture();
    let working_set_start = profile::working_set_bytes();

    let started = Instant::now();
    let plan = generator::plan(TOTAL);
    let plan_us = elapsed_us(started);

    let started = Instant::now();
    let nodes = generator::as_nodes(&plan);
    let rows_us = elapsed_us(started);
    let working_set_with_rows = profile::working_set_bytes();

    let mut index = Index::open(&database).expect("index");
    let started = Instant::now();
    index.replace_nodes(&nodes).expect("bench index build");
    let build_us = elapsed_us(started);
    let working_set_after_build = profile::working_set_bytes();

    // The whole corpus in memory is what the *current* `replace_nodes`
    // signature demands. Recorded as an architectural finding, not hidden.
    drop(nodes);
    drop(plan);
    drop(index);

    let started = Instant::now();
    let index = Index::open(&database).expect("reopen");
    let load_us = elapsed_us(started);
    let indexed: i64 = index
        .connection_for_bench()
        .query_row("SELECT COUNT(*) FROM nodes", [], |row| row.get(0))
        .expect("count");

    let search = measure_search(&index, true);

    let started = Instant::now();
    let census = census::Census::read(index.connection_for_bench()).expect("census");
    let census_us = elapsed_us(started);
    let widest = census.widest_node().expect("widest");
    let root = census.root().expect("root");

    let bounded_queries = measure_bounded_queries(&index, widest, widest);
    let views = measure_bounded_views(&index, &census);
    let working_set_end = profile::working_set_bytes();
    let working_set_max = [
        working_set_start,
        working_set_with_rows,
        working_set_after_build,
        working_set_end,
    ]
    .into_iter()
    .flatten()
    .max();

    drop(index);
    let footprint = database_bytes(&database);

    let body = json!({
        "layer": "INDEX-SCALE",
        "layerNote": "1 000 000 d'éléments INDEXÉS sur le schéma FileTopo courant. Ceci n'est \
                      PAS un « scan 1M » : aucun million de fichiers physiques n'a été créé ni \
                      parcouru, et cette couche ne prouve rien sur le scanner à cette taille.",
        "requestedElements": TOTAL,
        "buildProfile": build_profile(),
        "bench": profile.to_json(),
        "ss1IndexAndRebuild": {
            "planUs": plan_us,
            "rowsFromPlanUs": rows_us,
            "benchIndexBuildUs": build_us,
            "benchIndexReopenUs": load_us,
            "expectedElements": TOTAL,
            "indexedElements": indexed,
            "countsMatch": indexed as usize == TOTAL,
            "runs": 1,
            "runsNote": "Une seule construction : reconstruire un million de lignes coûte trop \
                         cher pour être répété ici. Le nombre exact d'exécutions est déclaré.",
        },
        "ss2StorageAndMemory": {
            "database": footprint,
            "workingSetStartBytes": working_set_start,
            "workingSetWithCorpusInMemoryBytes": working_set_with_rows,
            "workingSetAfterBuildBytes": working_set_after_build,
            "workingSetAtEndBytes": working_set_end,
            "workingSetMaxObservedBytes": working_set_max,
            "workingSetNote": "Le relevé de fin est plus bas que celui de construction parce que le corpus en mémoire a été libéré entre les deux. Les relevés sont ponctuels : le maximum publié est le plus grand des échantillons pris, PAS un pic garanti du processus.",
            "method": "Get-Process -Id <pid> du processus de test, via PowerShell.",
            "architecturalFinding":
                "`Index::replace_nodes` prend la totalité du corpus en mémoire (`&[NodeDto]`). \
                 À un million d'éléments cela domine l'empreinte du processus. C'est une \
                 contrainte de la tranche d'implémentation du materializer, pas un résultat \
                 de performance.",
            "wholeCorpusSerialisedToFrontend": false,
        },
        "ss3SearchP08": search,
        "ss3Note": "Informatif à 1M — la parité P-08 est exigée à 100 000.",
        "ss4BoundedQueries": bounded_queries,
        "ss5And6BoundedViews": views,
        "censusReadUs": census_us,
        "censusNote": "Auditeur indépendant du materializer, chronométré à part : son coût ne \
                       lui est jamais crédité.",
        "focusNodes": { "root": root, "widestFolder": widest,
                        "widestFolderDirectChildren": census.direct_children_of(widest) },
    });

    let path = report::write_artifact("TASK-0028-SS-1m-index.json", body).expect("artifact");
    println!("TASK-0028 INDEX-SCALE -> {}", path.display());
    reset_bench_directory(&bench);
}
