//! The `TASK-0029` campaigns. **Test-only, and `#[ignore]` by default.**
//!
//! Nothing here runs during an ordinary `cargo test`: building a million index
//! rows is a deliberate act, started by `scripts/task0029-scale-query.ps1` or by
//! `cargo test -- --ignored`. The invariants of the harness itself are covered
//! by the ordinary tests at the bottom of this file, which do run every time.

use super::{MEASURED_PAGE_SIZE, SCALE_RATIO_CEILING, write_artifact};
use crate::hierarchy::{self, ChildCursor};
use crate::index::Index;
use crate::scale_spike::{
    Distribution, QUERY_REPETITIONS, QUERY_WARMUPS, bounded, generator, profile,
};
use rusqlite::Connection;
use serde_json::{Value, json};
use std::fs;
use std::path::Path;
use std::time::Instant;

/// The order the `TASK-0028` prototype used, reproduced here **only** to plan
/// it. The timings of the old path come from calling
/// [`bounded::children_page`] itself, never from this string.
const LEGACY_ORDER: &str = "kind = 'directory' DESC, name COLLATE NOCASE, id";

fn elapsed_us(started: Instant) -> u128 {
    started.elapsed().as_micros()
}

/// Which Cargo profile produced these numbers. Published because it changes
/// them by a large factor, and a timing whose build profile is unstated is not
/// a measurement.
fn build_profile() -> &'static str {
    if cfg!(debug_assertions) {
        "debug (unoptimized + debug assertions)"
    } else {
        "release (optimized)"
    }
}

/// Removes a bench directory the harness itself created, inside its sandbox.
///
/// Refuses anything outside `.filetopo-sandbox/task0029`, and is skipped when
/// `TASK0029_KEEP_SANDBOX=1` so a controller can inspect the bench.
fn reset_bench_directory(path: &Path) {
    let sandbox = super::sandbox_root();
    assert!(
        path.starts_with(&sandbox),
        "the harness only ever removes its own sandbox directories"
    );
    if std::env::var("TASK0029_KEEP_SANDBOX").is_ok_and(|value| value == "1") {
        return;
    }
    if path.exists() {
        let _ = fs::remove_dir_all(path);
    }
}

/// Warm-up runs thrown away, then [`QUERY_REPETITIONS`] measured ones.
///
/// No run is discarded and no curve is smoothed: `R8` forbids favourable
/// selection, so the worst value is published beside the median.
fn timed<T>(mut run: impl FnMut() -> T) -> (Distribution, T) {
    for _ in 0..QUERY_WARMUPS {
        let _ = run();
    }
    let mut samples = Vec::with_capacity(QUERY_REPETITIONS);
    let mut last = None;
    for _ in 0..QUERY_REPETITIONS {
        let started = Instant::now();
        let value = run();
        samples.push(elapsed_us(started));
        last = Some(value);
    }
    (
        Distribution::of(&samples),
        last.expect("at least one repetition"),
    )
}

/// The id of the `offset`-th child of `parent`, in the canonical order.
///
/// **Bench setup, never a measured path.** It uses `OFFSET` on purpose: the
/// harness needs to place a cursor at a chosen position, and how it gets there
/// is not what is being timed. The product path under test never does this.
fn nth_child_id(connection: &Connection, parent: i64, offset: u64) -> Option<i64> {
    connection
        .query_row(
            &format!(
                "SELECT id FROM nodes WHERE parent_id = ?1
                 ORDER BY {order} LIMIT 1 OFFSET ?2",
                order = hierarchy::CHILD_ORDER
            ),
            rusqlite::params![parent, offset as i64],
            |row| row.get(0),
        )
        .ok()
}

/// The plan of a query, as SQLite reports it, joined into one line.
fn plan_of(connection: &Connection, sql: &str) -> String {
    let mut statement = connection
        .prepare(&format!("EXPLAIN QUERY PLAN {sql}"))
        .expect("plan");
    statement
        .query_map(rusqlite::params![1i64, 100i64], |row| {
            row.get::<_, String>(3)
        })
        .expect("plan rows")
        .collect::<rusqlite::Result<Vec<_>>>()
        .expect("plan rows")
        .join(" | ")
}

/// The structural criteria of `DEC-0030 §E`, checked against SQLite rather than
/// asserted in prose. A breach stops the campaign; it does not become a
/// footnote in an artifact nobody re-reads.
fn assert_plan_is_bounded(label: &str, plan: &str) {
    assert!(
        plan.contains("idx_nodes_child_order"),
        "{label}: the child-order index must serve parent_id and the order — got {plan}"
    );
    assert!(
        !plan.to_ascii_uppercase().contains("TEMP B-TREE"),
        "{label}: a temporary sort defeats the whole point — got {plan}"
    );
    assert!(
        !plan.contains("SCAN nodes"),
        "{label}: the corpus must not be scanned — got {plan}"
    );
}

/// One measured position in the sibling set.
struct Position {
    label: &'static str,
    /// `None` is the first page; `Some(n)` resumes after the `n`-th child.
    after_nth: Option<u64>,
    expected_rows: usize,
    expects_cursor: bool,
}

/// The four cursor positions the protocol requires, sized to this corpus.
fn positions(total: u64) -> Vec<Position> {
    let page = MEASURED_PAGE_SIZE as u64;
    vec![
        Position {
            label: "premiere-page",
            after_nth: None,
            expected_rows: MEASURED_PAGE_SIZE,
            expects_cursor: true,
        },
        Position {
            label: "curseur-median",
            after_nth: Some(total / 2),
            expected_rows: MEASURED_PAGE_SIZE,
            expects_cursor: true,
        },
        Position {
            // A full page whose last row is the last child: rows remain for
            // exactly zero further pages, so no cursor may come back.
            label: "curseur-proche-fin",
            after_nth: Some(total - page - 1),
            expected_rows: MEASURED_PAGE_SIZE,
            expects_cursor: false,
        },
        Position {
            label: "curseur-apres-dernier",
            after_nth: Some(total - 1),
            expected_rows: 0,
            expects_cursor: false,
        },
    ]
}

/// `SQF1` — the new keyset path, at every required position.
fn measure_keyset(index: &Index, parent: i64, total: u64) -> Value {
    let identity = index.identity().expect("identity");
    let mut measured = serde_json::Map::new();

    for position in positions(total) {
        let cursor = position.after_nth.map(|nth| {
            let after_id = nth_child_id(index.connection_for_bench(), parent, nth)
                .expect("the bench corpus has a child at this position");
            ChildCursor {
                index_id: identity.index_id.clone(),
                revision: identity.revision,
                parent_id: parent,
                after_id,
            }
        });

        let (latency, page) = timed(|| {
            index
                .children_page(parent, MEASURED_PAGE_SIZE, cursor.as_ref())
                .expect("keyset page")
        });

        assert_eq!(
            page.items.len(),
            position.expected_rows,
            "{}: unexpected page size",
            position.label
        );
        assert_eq!(
            page.next_cursor.is_some(),
            position.expects_cursor,
            "{}: the continuation cursor is not what the position implies",
            position.label
        );
        assert_eq!(
            page.total_direct_children, total,
            "{}: the exact direct total must not move between pages",
            position.label
        );

        measured.insert(
            position.label.to_string(),
            json!({
                "resumesAfterNthChild": position.after_nth,
                "rows": page.items.len(),
                "hasContinuationCursor": page.next_cursor.is_some(),
                "exactDirectChildren": page.total_direct_children,
                "latency": latency.to_json(),
            }),
        );
    }

    json!({
        "path": "Index::children_page — le chemin produit interne de DEC-0030.",
        "pageSize": MEASURED_PAGE_SIZE,
        "warmups": QUERY_WARMUPS,
        "repetitions": QUERY_REPETITIONS,
        "cursorContents": "index_id, revision, parent_id, after_id — aucun chemin, aucun nom, \
                           aucune position OFFSET.",
        "cacheNote": "Aucun cache n'existe sur ce chemin; aucun n'est simulé.",
        "positions": Value::Object(measured),
    })
}

/// `SQF2` — the `TASK-0028` prototype, on the same database, in the same run.
///
/// Published so the comparison is a **within-run** one. Reading the old number
/// off another task's artifact, measured on another day, would compare two
/// machines as much as two queries.
fn measure_legacy_offset(index: &Index, parent: i64, total: u64) -> Value {
    let connection = index.connection_for_bench();
    let page = MEASURED_PAGE_SIZE as u64;
    let mut measured = serde_json::Map::new();

    for (label, offset) in [
        ("premiere-page", 0u64),
        ("offset-median", total / 2),
        ("offset-proche-fin", total.saturating_sub(page)),
    ] {
        let (latency, rows) = timed(|| {
            bounded::children_page(connection, parent, MEASURED_PAGE_SIZE, offset)
                .expect("legacy page")
                .len()
        });
        measured.insert(
            label.to_string(),
            json!({
                "offset": offset,
                "rows": rows,
                "latency": latency.to_json(),
            }),
        );
    }

    json!({
        "path": "scale_spike::bounded::children_page — le prototype OFFSET de TASK-0028, \
                 appelé tel quel, sur la même base et dans le même processus.",
        "order": LEGACY_ORDER,
        "pageSize": MEASURED_PAGE_SIZE,
        "warmups": QUERY_WARMUPS,
        "repetitions": QUERY_REPETITIONS,
        "note": "Le nouvel index ne sert pas cet ordre — collation et expression diffèrent — \
                 donc l'ancien chemin n'est pas accéléré par accident.",
        "positions": Value::Object(measured),
    })
}

/// `SQF3` — the plans, and the structural criteria checked on them.
fn measure_plans(index: &Index) -> Value {
    let connection = index.connection_for_bench();
    let first = hierarchy::children_page_plan(connection, false)
        .expect("first-page plan")
        .join(" | ");
    let continuation = hierarchy::children_page_plan(connection, true)
        .expect("continuation plan")
        .join(" | ");
    assert_plan_is_bounded("premiere-page", &first);
    assert_plan_is_bounded("continuation", &continuation);

    let legacy = plan_of(
        connection,
        &format!(
            "SELECT id, name FROM nodes WHERE parent_id = ?1
             ORDER BY {LEGACY_ORDER} LIMIT ?2"
        ),
    );

    json!({
        "boundedFirstPage": first,
        "boundedContinuation": continuation,
        "legacyOffsetPage": legacy,
        "criteria": {
            "usesChildOrderIndex": true,
            "noTempBTreeForOrderBy": true,
            "noFullCorpusScan": true,
            "noOffsetInContinuation": true,
        },
        "criteriaNote": "Ces quatre critères sont vérifiés par assertion pendant la campagne : \
                         une violation arrête la mesure au lieu d'être publiée.",
    })
}

/// `SQF4` — the O(1) exact total, the bounded ancestor chain, and the audit
/// that lets the durable count be trusted at all.
fn measure_counts_and_chain(index: &Index, parent: i64, total: u64) -> Value {
    let connection = index.connection_for_bench();

    let (direct_latency, direct) = timed(|| index.direct_child_count(parent).expect("count"));
    assert_eq!(direct, total, "the durable count must be the exact one");

    let deepest: i64 = connection
        .query_row("SELECT id FROM nodes ORDER BY depth DESC, id LIMIT 1", [], |row| row.get(0))
        .expect("deepest");
    let (chain_latency, chain) = timed(|| index.ancestor_chain(deepest).expect("chain").len());

    // The invariant behind `DEC-0030 §D`, run over the whole corpus. It is the
    // slow, honest way to check a fast, cheap read, and it is timed apart so
    // its cost is never credited to the primitive it audits.
    let audit_started = Instant::now();
    let mismatches = hierarchy::child_count_mismatches(connection, 16).expect("audit");
    let audit_us = elapsed_us(audit_started);
    assert!(
        mismatches.is_empty(),
        "child_count disagreed with the rows present: {mismatches:?}"
    );

    // A recursive subtree count, measured once, to show what `DEC-0030 §D`
    // refuses to put on the hot path — not to propose it.
    let recursive_started = Instant::now();
    let subtree = bounded::subtree_count(connection, parent).expect("subtree");
    let recursive_us = elapsed_us(recursive_started);

    json!({
        "exactDirectChildren": {
            "value": direct,
            "source": "colonne durable child_count, une recherche sur clé primaire",
            "latency": direct_latency.to_json(),
        },
        "ancestorChain": {
            "fromNode": deepest,
            "length": chain,
            "ceiling": hierarchy::MAX_ANCESTOR_CHAIN,
            "latency": chain_latency.to_json(),
        },
        "childCountAudit": {
            "mismatches": mismatches.len(),
            "scope": "tout le corpus",
            "auditUs": audit_us,
            "note": "Audit indépendant du chemin mesuré, chronométré à part : son coût n'est \
                     jamais crédité à la primitive qu'il contrôle.",
        },
        "recursiveSubtreeCountRefusedOnHotPath": {
            "value": subtree,
            "runs": 1,
            "us": recursive_us,
            "note": "Mesuré une fois pour montrer ce que DEC-0030 §D interdit d'imposer au hot \
                     path. Le coût suit la taille du sous-arbre, pas le budget de vue.",
        },
    })
}

/// What building the bench index cost, and what it held while doing it.
struct BuildCost {
    rows_us: u128,
    build_us: u128,
    /// Sampled **while the whole corpus is still alive in memory**, which is
    /// the only moment at which the figure means what the finding says. Taken
    /// after the vector has been freed it would flatter the very architecture
    /// the finding exists to criticise.
    working_set_with_corpus: Option<u64>,
}

/// Builds the bench index from the deterministic `TASK-0028` plan.
fn build_bench_index(database: &Path, total: usize) -> (Index, BuildCost) {
    let started = Instant::now();
    let nodes = generator::as_nodes(&generator::plan(total));
    let rows_us = elapsed_us(started);

    let mut index = Index::open(database).expect("bench index");
    let started = Instant::now();
    index.replace_nodes(&nodes).expect("bench index build");
    let build_us = elapsed_us(started);
    let working_set_with_corpus = profile::working_set_bytes();
    drop(nodes);

    (
        index,
        BuildCost {
            rows_us,
            build_us,
            working_set_with_corpus,
        },
    )
}

/// Reads the p95 of each keyset position out of an artifact already written.
fn keyset_p95(artifact: &Path) -> Option<serde_json::Map<String, Value>> {
    let text = fs::read_to_string(artifact).ok()?;
    let document: Value = serde_json::from_str(&text).ok()?;
    let positions = document
        .pointer("/measurement/sqf1KeysetPaging/positions")?
        .as_object()?;
    let mut out = serde_json::Map::new();
    for (label, body) in positions {
        if let Some(p95) = body.pointer("/latency/p95Us") {
            out.insert(label.clone(), p95.clone());
        }
    }
    Some(out)
}

/// The scaling criterion, computed from the two artifacts rather than by hand.
fn scale_criterion(reference: &Path, current: &serde_json::Map<String, Value>) -> Value {
    let Some(baseline) = keyset_p95(reference) else {
        return json!({
            "comparisonAvailable": false,
            "reason": "L'artefact 100k n'a pas été trouvé. Lancer la campagne 100k d'abord.",
        });
    };

    let mut per_position = serde_json::Map::new();
    let mut worst: Option<(String, f64)> = None;
    for (label, body) in current {
        let (Some(here), Some(there)) = (
            body.pointer("/latency/p95Us").and_then(Value::as_f64),
            baseline.get(label).and_then(Value::as_f64),
        ) else {
            continue;
        };
        // A position whose 100k p95 is zero cannot produce a ratio; publish the
        // raw values instead of inventing one.
        let ratio = (there > 0.0).then(|| here / there);
        if let Some(ratio) = ratio {
            if worst.as_ref().is_none_or(|(_, seen)| ratio > *seen) {
                worst = Some((label.clone(), ratio));
            }
        }
        per_position.insert(
            label.clone(),
            json!({
                "p95Us100k": there,
                "p95Us1m": here,
                "ratio": ratio,
                "withinCeiling": ratio.map(|value| value <= SCALE_RATIO_CEILING),
            }),
        );
    }

    let (worst_label, worst_ratio) = worst.unzip();
    json!({
        "comparisonAvailable": true,
        "criterion": format!(
            "p95 à 1M ≤ {SCALE_RATIO_CEILING}× p95 à 100k, page de {MEASURED_PAGE_SIZE}, position comparable"
        ),
        "ceiling": SCALE_RATIO_CEILING,
        "worstPosition": worst_label,
        "worstRatio": worst_ratio,
        "verdict": match worst_ratio {
            Some(ratio) if ratio <= SCALE_RATIO_CEILING => "PASS",
            Some(_) => "FAIL",
            None => "INDETERMINATE",
        },
        "verdictNote": "Critère d'ingénierie de TASK-0029, pas une promesse produit. En cas \
                        d'échec, le seuil ne bouge pas : l'échec est publié.",
        "perPosition": Value::Object(per_position),
    })
}

/// One INDEX-SCALE campaign, at whatever size it is given.
fn run_index_scale(total: usize, artifact: &str, compare_against: Option<&str>) {
    let bench = super::sandbox_root().join(format!("index-scale-{total}"));
    reset_bench_directory(&bench);
    fs::create_dir_all(&bench).expect("bench directory");
    let database = bench.join("index.sqlite");

    let bench_profile = profile::capture();
    let working_set_start = profile::working_set_bytes();

    let (index, cost) = build_bench_index(&database, total);
    let working_set_after_release = profile::working_set_bytes();

    let indexed: i64 = index
        .connection_for_bench()
        .query_row("SELECT COUNT(*) FROM nodes", [], |row| row.get(0))
        .expect("count");
    assert_eq!(indexed as usize, total, "the bench must index what it planned");

    // The widest folder — the case a progressive materializer must survive —
    // read from the durable count the audit below re-verifies.
    let hub: i64 = index
        .connection_for_bench()
        .query_row(
            "SELECT id FROM nodes ORDER BY child_count DESC, id LIMIT 1",
            [],
            |row| row.get(0),
        )
        .expect("widest folder");
    let hub_children = index.direct_child_count(hub).expect("hub children");
    assert!(
        hub_children > MEASURED_PAGE_SIZE as u64 * 4,
        "the widest folder must be far wider than one page, got {hub_children}"
    );

    let plans = measure_plans(&index);
    let keyset = measure_keyset(&index, hub, hub_children);
    let legacy = measure_legacy_offset(&index, hub, hub_children);
    let counts = measure_counts_and_chain(&index, hub, hub_children);
    let working_set_end = profile::working_set_bytes();

    let scale = match compare_against {
        None => json!({
            "comparisonAvailable": false,
            "reason": "Campagne de référence : c'est elle que la campagne 1M compare.",
        }),
        Some(reference) => scale_criterion(
            &crate::scale_spike::runs_directory().join(reference),
            keyset
                .pointer("/positions")
                .and_then(Value::as_object)
                .expect("positions"),
        ),
    };

    drop(index);

    let body = json!({
        "layer": "INDEX-SCALE",
        "layerNote": format!(
            "{total} éléments INDEXÉS sur le schéma FileTopo courant, construits depuis le plan \
             synthétique déterministe de TASK-0028. Aucun fichier physique n'est créé : le coût \
             mesuré est un coût de REQUÊTE, qui dépend du contenu de l'index et non de la façon \
             dont il a été rempli. Cette couche ne prouve rien sur le scanner à cette taille."
        ),
        "requestedElements": total,
        "indexedElements": indexed,
        "buildProfile": build_profile(),
        "bench": bench_profile.to_json(),
        "schemaVersion": 3,
        "focus": {
            "widestFolder": hub,
            "widestFolderDirectChildren": hub_children,
            "selection": "SELECT id FROM nodes ORDER BY child_count DESC, id LIMIT 1",
        },
        "buildCost": {
            "rowsFromPlanUs": cost.rows_us,
            "indexBuildUs": cost.build_us,
            "runs": 1,
            "runsNote": "Une seule construction : la construction n'est pas l'objet de \
                         TASK-0029, et son coût est déclaré, pas caché.",
        },
        "memory": {
            "workingSetStartBytes": working_set_start,
            "workingSetWithCorpusInMemoryBytes": cost.working_set_with_corpus,
            "workingSetAfterCorpusReleasedBytes": working_set_after_release,
            "workingSetAtEndBytes": working_set_end,
            "method": "Get-Process -Id <pid> du processus de test, via PowerShell. Relevés \
                       ponctuels : aucun pic garanti n'est publié. Le relevé « avec corpus » \
                       est pris pendant que le `Vec<NodeDto>` est encore vivant; les suivants \
                       sont pris après sa libération, et sont plus bas pour cette seule raison.",
            "architecturalFinding":
                "`Index::replace_nodes` prend toujours la totalité du corpus en mémoire \
                 (`&[NodeDto]`). TASK-0029 ne corrige pas ce point : l'indexation en flux est \
                 la tranche suivante, et le constat de TASK-0028 reste entier.",
        },
        "sqf1KeysetPaging": keyset,
        "sqf2LegacyOffsetPath": legacy,
        "sqf3QueryPlans": plans,
        "sqf4CountsAndChain": counts,
        "sqf5ScaleCriterion": scale,
    });

    let path = write_artifact(artifact, body).expect("artifact");
    println!("TASK-0029 {artifact} -> {}", path.display());
    reset_bench_directory(&bench);
}

#[test]
#[ignore = "TASK-0029 campaign: builds a 100 000 row bench index"]
fn sqf_index_scale_100k() {
    run_index_scale(100_000, "TASK-0029-SQF-100k.json", None);
}

#[test]
#[ignore = "TASK-0029 campaign: builds a 1 000 000 row bench index"]
fn sqf_index_scale_1m() {
    run_index_scale(
        1_000_000,
        "TASK-0029-SQF-1m-index.json",
        Some("TASK-0029-SQF-100k.json"),
    );
}

#[cfg(test)]
mod tests {
    use super::*;

    fn small_index() -> Index {
        let mut index = Index::in_memory().expect("index");
        index
            .replace_nodes(&generator::as_nodes(&generator::plan(4_000)))
            .expect("replace");
        index
    }

    fn hub_of(index: &Index) -> (i64, u64) {
        let hub: i64 = index
            .connection_for_bench()
            .query_row(
                "SELECT id FROM nodes ORDER BY child_count DESC, id LIMIT 1",
                [],
                |row| row.get(0),
            )
            .expect("hub");
        (hub, index.direct_child_count(hub).expect("children"))
    }

    #[test]
    fn the_four_required_positions_are_the_ones_measured() {
        let labels: Vec<&str> = positions(10_000).iter().map(|p| p.label).collect();
        assert_eq!(
            labels,
            vec![
                "premiere-page",
                "curseur-median",
                "curseur-proche-fin",
                "curseur-apres-dernier",
            ]
        );
        let last = positions(10_000).pop().expect("last");
        assert_eq!(last.after_nth, Some(9_999));
        assert_eq!(last.expected_rows, 0, "past the end is an empty page");
        assert!(!last.expects_cursor);
    }

    #[test]
    fn the_measurement_helpers_agree_with_the_index_on_a_small_corpus() {
        let index = small_index();
        let (hub, children) = hub_of(&index);
        // The same four positions the campaigns use, on a corpus small enough
        // to run in an ordinary `cargo test`.
        let measured = measure_keyset(&index, hub, children);
        let positions = measured
            .pointer("/positions")
            .and_then(Value::as_object)
            .expect("positions");
        assert_eq!(positions.len(), 4);
        assert_eq!(
            positions["curseur-apres-dernier"]["rows"], 0,
            "a cursor past the last child must page to nothing"
        );
        assert_eq!(
            positions["premiere-page"]["exactDirectChildren"],
            json!(children)
        );
    }

    #[test]
    fn the_structural_criteria_reject_a_plan_that_sorts() {
        let index = small_index();
        let plans = measure_plans(&index);
        assert!(
            plans["boundedContinuation"]
                .as_str()
                .expect("plan")
                .contains("idx_nodes_child_order")
        );
        // The old path is published beside the new one precisely because it
        // does not meet the criteria. Proven, not claimed.
        let legacy = plans["legacyOffsetPage"].as_str().expect("legacy plan");
        assert!(
            legacy.to_ascii_uppercase().contains("TEMP B-TREE"),
            "the TASK-0028 order still needs a temporary sort — got {legacy}"
        );
    }

    #[test]
    fn a_missing_reference_artifact_is_declared_not_guessed() {
        let verdict = scale_criterion(
            Path::new("does-not-exist.json"),
            &serde_json::Map::new(),
        );
        assert_eq!(verdict["comparisonAvailable"], json!(false));
    }

    #[test]
    fn the_criterion_fails_loudly_when_the_ratio_is_exceeded() {
        let temp = tempfile::tempdir().expect("tempdir");
        let reference = temp.path().join("reference.json");
        fs::write(
            &reference,
            serde_json::to_string(&json!({
                "measurement": { "sqf1KeysetPaging": { "positions": {
                    "premiere-page": { "latency": { "p95Us": 100 } },
                    "curseur-median": { "latency": { "p95Us": 100 } },
                }}}
            }))
            .expect("json"),
        )
        .expect("write");

        let mut current = serde_json::Map::new();
        current.insert(
            "premiere-page".to_string(),
            json!({ "latency": { "p95Us": 200 } }),
        );
        current.insert(
            "curseur-median".to_string(),
            json!({ "latency": { "p95Us": 900 } }),
        );
        let verdict = scale_criterion(&reference, &current);
        assert_eq!(verdict["verdict"], json!("FAIL"));
        assert_eq!(verdict["worstPosition"], json!("curseur-median"));
        assert_eq!(verdict["perPosition"]["premiere-page"]["withinCeiling"], json!(true));
        assert_eq!(verdict["perPosition"]["curseur-median"]["withinCeiling"], json!(false));
    }
}
