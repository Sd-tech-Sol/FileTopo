//! The commands the map view calls, and the pipeline behind them.
//!
//! One pipeline, in one place: materialise the fixture, fingerprint it, scan it
//! read-only, lay it out once, persist both, and read back. Everything the
//! frozen criteria need to be checked — timings, fingerprints, engine version,
//! digests — comes out of this file rather than being reconstructed later from
//! guesswork.

use super::brains::{BrainNodeRef, BrainRecord};
use super::layout::{self, LAYOUT_ALGORITHM, LayoutInput};
use super::sandbox::{self, SandboxPaths};
use super::store::{MapSnapshot, MapStore, NON_RECONSTRUCTIBLE_KEYS, NodeDetail};
use super::{MAX_FIXTURE_DEPTH, MAX_NODES_PER_MAP, MapError, fixtures};
use crate::domain::ScanDiagnostic;
use crate::scanner::scan_tree_controlled;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::time::{Instant, SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FixtureSummary {
    pub id: String,
    pub label_fr: String,
    pub label_en: String,
    pub seed: String,
    pub max_nodes: usize,
    pub planned_nodes: usize,
    pub planned_max_depth: u32,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MapBuildReport {
    /// **Whose map was built.** The identity comes first, because everything
    /// below it is only meaningful inside one brain.
    pub brain_id: String,
    /// The synthetic source that brain reads — a developer diagnostic, never
    /// the brain's identity (`TASK-0018` §4.6).
    pub fixture_id: String,
    /// Where the index really landed, named relative to the sandbox. `K3` is
    /// checked by comparing these across brains, and a relative name keeps a
    /// personal absolute path out of the repository.
    pub index_path: String,
    pub node_count: usize,
    pub planned_nodes: usize,
    pub max_depth: u32,
    pub node_ceiling: usize,
    pub depth_ceiling: u32,
    pub rebuilt: bool,
    pub scan_ms: f64,
    pub layout_ms: f64,
    pub index_ms: f64,
    pub total_ms: f64,
    pub layout_invocations: u32,
    pub fingerprint_before: String,
    pub fingerprint_after: String,
    pub read_only_confirmed: bool,
    pub reconstructible_digest: String,
    pub non_reconstructible: Vec<String>,
    pub schema_version: i64,
    /// The algorithm persisted by the map store and read back after the build.
    pub layout_algorithm: String,
    pub diagnostics: Vec<ScanDiagnostic>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HostInfo {
    /// Shown in the interface so a reader can confirm, without trusting a
    /// claim, that the analysed root and the index live in the sandbox.
    pub sandbox_root: String,
    pub app_version: String,
    pub sqlite_version: String,
    /// The rendering engine actually in use — WebView2 on Windows. Read from
    /// the host rather than from the user agent, which `H8` requires.
    pub webview_version: String,
    pub tauri_version: String,
    pub platform: String,
    pub node_ceiling: usize,
    pub depth_ceiling: u32,
    pub card_width: f64,
    pub card_height: f64,
    pub layout_algorithm: String,
    /// Set by `FILETOPO_AUTO_VERIFY`: replays `H1` to `H7` against the real
    /// host and writes the evidence, unattended.
    pub auto_verify: bool,
    /// Set by `FILETOPO_AUTO_MEASURE`, so `H9` can be run in the real host
    /// without a hand on the mouse.
    ///
    /// The measurement drives the same state the buttons drive; the flag only
    /// decides *when* it starts. A run nobody can reproduce unattended is a run
    /// nobody can check.
    pub auto_measure: bool,
    /// Set by `FILETOPO_AUTO_RELATIONS`: replays the `J12` scenario of
    /// `TASK-0017` against the real host, unattended, and writes the evidence.
    pub auto_relations: bool,
    /// Which pass of the `K12` scenario this process is running — `0` for
    /// none, `1` for the steps before the restart, `2` for the steps after it.
    ///
    /// The **host** decides, not the page: only the process knows whether it
    /// is the one that was relaunched, and `K12` step 11 asks for a real
    /// restart rather than a simulated one.
    pub auto_brains_pass: u8,
    /// Which pass of the `L12` composed-view scenario this process is running
    /// — `0` for none, `1` for the sixteen steps before the restart, `2` for
    /// the seventeenth, which can only be observed by a process that was
    /// actually relaunched.
    ///
    /// Separate from `auto_brains_pass` on purpose: `K12` and `L12` prove
    /// different things, and a single flag would make it impossible to replay
    /// the foundation regression without also replaying the composed view.
    pub auto_composed_pass: u8,
    /// `M12` — `0` none, `1` the twenty-three steps before the real restart,
    /// `2` the five a relaunched process can observe.
    ///
    /// Kept apart from the other two because `K12`, `L12` and `M12` prove
    /// different things and must stay replayable one without the others.
    pub auto_cross_pass: u8,
    /// `N15` — `0` none, `1` the full interaction pass, `2` the persisted
    /// state observed only after a real process restart.
    pub auto_topographic_pass: u8,
    /// `EC15` — `0` none, `1` observes both brains and rebuilds Alpha,
    /// `2` proves persistence and a byte-for-byte re-read after restart.
    pub auto_content_pass: u8,
    /// `DR15` — deterministic relation engine proof, two real processes on
    /// one fresh TASK-0024 variant.
    pub auto_dre_pass: u8,
    /// Reserve `X11` — the same engine, proved generic on `brain-beta`, which
    /// reads `deep` and no legacy `TASK-0017` producer ever covered.
    ///
    /// A single pass: genericity is what it measures, not persistence.
    pub auto_generic_relations: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FixtureIntegrity {
    pub brain_id: String,
    pub fixture_id: String,
    pub fingerprint: String,
    /// Entries under the analysed root that FileTopo would have written.
    /// `I-2` and `H6` both require this to stay empty.
    pub filetopo_artifacts: Vec<String>,
    pub observed_entries: usize,
}

/// Verification the slice can run on itself, exposed so `H1` and `H3` can be
/// exercised through the same API the interface uses rather than a side door.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MapSelfCheck {
    pub brain_id: String,
    pub fixture_id: String,
    pub planned_paths: usize,
    pub observed_paths: usize,
    pub indexed_paths: usize,
    /// `H1`: the three sets agree, path by path.
    pub paths_agree: bool,
    pub missing_from_index: Vec<String>,
    pub unexpected_in_index: Vec<String>,
    /// `N3`: fixed finite cards, depth columns and no overlap.
    pub layout_violations: Vec<String>,
    /// `H3`: parent and direct children agree with an independent query.
    pub hierarchy_mismatches: Vec<String>,
    /// `H5`: every node's details are readable, diagnostics included.
    pub detail_mismatches: Vec<String>,
}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
        .min(i64::MAX as u128) as i64
}

/// Materialises the fixture, scans it, lays it out and persists the index.
///
/// `rebuild` deletes nothing on disk beyond the index file itself — the
/// analysed tree is never touched, and `H7` needs exactly that: drop the
/// index, rebuild, compare.
pub fn build_map(
    paths: &SandboxPaths,
    brain: &BrainRecord,
    rebuild: bool,
) -> Result<MapBuildReport, MapError> {
    // `brain_id` -> source, resolved **here and nowhere above**. The fixture
    // is shared: two brains may materialise and read the very same tree, and
    // it stays read-only for both.
    let spec = brain.source_fixture()?;
    let started = Instant::now();

    let plan = fixtures::materialize(&paths.fixtures, spec)?;
    let root = fixtures::fixture_root(&paths.fixtures, spec.id);
    let fingerprint_before = fixtures::fingerprint(&root)?;

    // The index is keyed by the **brain**, never by the fixture. This single
    // line is what makes `brain-alpha` and `brain-gamma` two brains rather
    // than one shared index wearing two names.
    let database = paths.brain_map_database(&brain.brain_id);
    if rebuild && database.exists() {
        remove_index_files(&database)?;
    }
    // An index built for another brain — or a version-1 index, which names no
    // brain at all — is **rebuilt**, never read. Serving it would be exactly
    // the leak `K3` forbids.
    let mut compatibility_rebuild = false;
    if database.is_file() && !rebuild {
        let existing = MapStore::open(&database)?;
        let built_for = existing.built_for_brain()?;
        let compatible = existing.is_built()?;
        drop(existing);
        if built_for.as_deref() != Some(brain.brain_id.as_str()) || !compatible {
            compatibility_rebuild = true;
            remove_index_files(&database)?;
        }
    }

    let scan_started = Instant::now();
    let scan = scan_tree_controlled(&root, || false, |_| {})
        .map_err(|error| MapError::Scan(error.to_string()))?;
    let scan_ms = elapsed_ms(scan_started);

    // `B-1`, applied before anything is written. No truncation, no sampling,
    // no level of detail: the build refuses and says so.
    if scan.nodes.len() > MAX_NODES_PER_MAP {
        return Err(MapError::NodeBudgetExceeded {
            found: scan.nodes.len(),
            ceiling: MAX_NODES_PER_MAP,
        });
    }

    let mut index_by_id = std::collections::HashMap::with_capacity(scan.nodes.len());
    for (position, node) in scan.nodes.iter().enumerate() {
        index_by_id.insert(node.id, position);
    }
    let parents = scan
        .nodes
        .iter()
        .map(|node| node.parent_id.and_then(|id| index_by_id.get(&id).copied()))
        .collect::<Vec<_>>();

    let layout_started = Instant::now();
    let laid_out = layout::compute(LayoutInput { parents: &parents });
    let layout_ms = elapsed_ms(layout_started);

    let index_started = Instant::now();
    let mut store = MapStore::open(&database)?;
    store.replace(
        &brain.brain_id,
        spec.id,
        spec.label_fr,
        &scan.nodes,
        &laid_out.rects,
        laid_out.width,
        laid_out.height,
        &scan.diagnostics,
        now_ms(),
    )?;
    let index_ms = elapsed_ms(index_started);

    let fingerprint_after = fixtures::fingerprint(&root)?;
    let max_depth = scan.nodes.iter().map(|node| node.depth).max().unwrap_or(0);

    Ok(MapBuildReport {
        brain_id: brain.brain_id.clone(),
        fixture_id: spec.id.to_string(),
        index_path: paths.relative_name(&database),
        node_count: scan.nodes.len(),
        planned_nodes: plan.node_count(),
        max_depth,
        node_ceiling: MAX_NODES_PER_MAP,
        depth_ceiling: MAX_FIXTURE_DEPTH,
        rebuilt: rebuild || compatibility_rebuild,
        scan_ms,
        layout_ms,
        index_ms,
        total_ms: elapsed_ms(started),
        layout_invocations: laid_out.invocations,
        read_only_confirmed: fingerprint_before == fingerprint_after,
        fingerprint_before,
        fingerprint_after,
        reconstructible_digest: store.reconstructible_digest()?,
        non_reconstructible: NON_RECONSTRUCTIBLE_KEYS
            .iter()
            .map(|key| (*key).to_string())
            .collect(),
        schema_version: super::store::MAP_SCHEMA_VERSION,
        layout_algorithm: store
            .meta("layout_algorithm")?
            .unwrap_or_else(|| LAYOUT_ALGORITHM.to_string()),
        diagnostics: scan.diagnostics,
    })
}

/// Removes the index database and its WAL companions, and nothing else.
///
/// Scoped deliberately narrowly: the only files this slice ever deletes are
/// ones it wrote itself, inside **one brain's** `map/`. No brain is ever
/// rebuilt by removing another brain's state — `TASK-0018` §4.4.
fn remove_index_files(database: &Path) -> Result<(), MapError> {
    for suffix in ["", "-wal", "-shm"] {
        let mut candidate = database.as_os_str().to_os_string();
        candidate.push(suffix);
        let candidate = PathBuf::from(candidate);
        if candidate.is_file() {
            std::fs::remove_file(candidate)?;
        }
    }
    Ok(())
}

fn elapsed_ms(started: Instant) -> f64 {
    started.elapsed().as_secs_f64() * 1_000.0
}

/// Opens a brain's index, and **refuses one built for another brain**.
///
/// The path already separates the brains; this check exists because a path is
/// a convention and `K3` asks for a guarantee. Should the two ever meet — a
/// copied sandbox, a future migration, a mistake in a caller — the answer is
/// a [`MapError::BrainMismatch`] rather than another brain's nodes served
/// under the active brain's name.
pub fn open_store(paths: &SandboxPaths, brain: &BrainRecord) -> Result<MapStore, MapError> {
    let database = paths.brain_map_database(&brain.brain_id);
    if !database.is_file() {
        return Err(MapError::NotBuilt(brain.brain_id.clone()));
    }
    let store = MapStore::open(&database)?;
    if !store.is_built()? {
        return Err(MapError::NotBuilt(brain.brain_id.clone()));
    }
    match store.built_for_brain()? {
        Some(found) if found == brain.brain_id => Ok(store),
        Some(found) => Err(MapError::BrainMismatch {
            expected: brain.brain_id.clone(),
            found,
        }),
        // A version-1 index names no brain at all, so it is not this one's.
        None => Err(MapError::BrainMismatch {
            expected: brain.brain_id.clone(),
            found: "index sans cerveau (schema v1)".to_string(),
        }),
    }
}

pub fn snapshot(paths: &SandboxPaths, brain: &BrainRecord) -> Result<MapSnapshot, MapError> {
    open_store(paths, brain)?.snapshot()
}

/// The details of one node **of one brain**.
///
/// The argument is a [`BrainNodeRef`] rather than a bare `node_id`, because
/// `TASK-0018` §4.1 rule 4 makes the **pair** the boundary. That is not a
/// formality: an interface that has just switched brains still holds the
/// previous brain's selection, and `12` is a valid row number in both
/// `brain-alpha` and `brain-gamma`. A bare number would resolve, quietly, in
/// the wrong brain. A reference that names its own brain cannot.
pub fn detail(
    paths: &SandboxPaths,
    brain: &BrainRecord,
    reference: &BrainNodeRef,
) -> Result<NodeDetail, MapError> {
    if !reference.belongs_to(&brain.brain_id) {
        return Err(MapError::BrainMismatch {
            expected: brain.brain_id.clone(),
            found: reference.brain_id.clone(),
        });
    }
    open_store(paths, brain)?.detail(reference.node_id)
}

pub fn integrity(paths: &SandboxPaths, brain: &BrainRecord) -> Result<FixtureIntegrity, MapError> {
    let spec = brain.source_fixture()?;
    let root = fixtures::fixture_root(&paths.fixtures, spec.id);
    let observed = fixtures::observed_paths(&root)?;
    // Anything FileTopo could have dropped in the analysed tree. The list is
    // computed from what is actually there, not from what we hoped to avoid.
    let artifacts = observed
        .iter()
        .filter(|path| {
            let lowered = path.to_lowercase();
            lowered.ends_with(".sqlite")
                || lowered.ends_with(".sqlite-wal")
                || lowered.ends_with(".sqlite-shm")
                || lowered.contains("filetopo")
        })
        .cloned()
        .collect::<Vec<_>>();
    Ok(FixtureIntegrity {
        brain_id: brain.brain_id.clone(),
        fixture_id: spec.id.to_string(),
        fingerprint: fixtures::fingerprint(&root)?,
        filetopo_artifacts: artifacts,
        observed_entries: observed.len(),
    })
}

/// Runs `H1`, `H2`, `H3` and `H5` against a built map and reports what fails.
///
/// Written to report rather than to assert: a self-check that panics tells the
/// user nothing, and a missed target has to be publishable as missed.
pub fn self_check(paths: &SandboxPaths, brain: &BrainRecord) -> Result<MapSelfCheck, MapError> {
    let spec = brain.source_fixture()?;
    let root = fixtures::fixture_root(&paths.fixtures, spec.id);

    let planned = fixtures::plan(spec).expected_paths();
    let observed = fixtures::observed_paths(&root)?;
    let store = open_store(paths, brain)?;
    let nodes = store.all_nodes()?;

    let mut indexed = nodes
        .iter()
        .filter(|node| node.parent_id.is_some())
        .map(|node| node.relative_path.clone())
        .collect::<Vec<_>>();
    indexed.sort();

    let planned_set = planned.iter().collect::<std::collections::BTreeSet<_>>();
    let indexed_set = indexed.iter().collect::<std::collections::BTreeSet<_>>();
    let missing = planned_set
        .difference(&indexed_set)
        .take(20)
        .map(|path| (*path).clone())
        .collect::<Vec<_>>();
    let unexpected = indexed_set
        .difference(&planned_set)
        .take(20)
        .map(|path| (*path).clone())
        .collect::<Vec<_>>();

    let mut layout_violations = Vec::new();
    let mut by_id = std::collections::HashMap::new();
    let mut children_of: std::collections::HashMap<i64, Vec<usize>> =
        std::collections::HashMap::new();
    let mut by_depth: std::collections::BTreeMap<u32, Vec<usize>> =
        std::collections::BTreeMap::new();
    let mut root_count = 0usize;
    for (position, node) in nodes.iter().enumerate() {
        by_id.insert(node.id, position);
        if let Some(parent) = node.parent_id {
            children_of.entry(parent).or_default().push(position);
        } else {
            root_count += 1;
        }
        by_depth.entry(node.depth).or_default().push(position);
        if !node.rect.x.is_finite()
            || !node.rect.y.is_finite()
            || !node.rect.w.is_finite()
            || !node.rect.h.is_finite()
            || node.rect.w != layout::CARD_WIDTH
            || node.rect.h != layout::CARD_HEIGHT
        {
            layout_violations.push(format!("invalid card geometry on {}", node.relative_path));
        }
        let expected_x = f64::from(node.depth) * (layout::CARD_WIDTH + layout::COLUMN_GAP);
        if node.rect.x != expected_x {
            layout_violations.push(format!("wrong depth column on {}", node.relative_path));
        }
    }
    if root_count != 1 {
        layout_violations.push(format!("expected one root, found {root_count}"));
    }
    for (parent_id, children) in &children_of {
        let Some(parent_position) = by_id.get(parent_id) else {
            layout_violations.push(format!("orphan children under id {parent_id}"));
            continue;
        };
        let parent = &nodes[*parent_position];
        for position in children {
            let child = &nodes[*position];
            if child.depth != parent.depth + 1 {
                layout_violations.push(format!(
                    "{} has wrong depth for parent {}",
                    child.relative_path, parent.relative_path
                ));
            }
            if parent.rect.x + parent.rect.w >= child.rect.x {
                layout_violations.push(format!(
                    "{} is not an independent card to the right of {}",
                    child.relative_path, parent.relative_path
                ));
            }
        }
    }
    // Different depths occupy disjoint x-columns. Within one column, sorting
    // by y means only adjacent cards can overlap, so this remains bounded and
    // never compares every pair of nodes.
    for positions in by_depth.values_mut() {
        positions.sort_by(|left, right| nodes[*left].rect.y.total_cmp(&nodes[*right].rect.y));
        for pair in positions.windows(2) {
            let left = &nodes[pair[0]];
            let right = &nodes[pair[1]];
            if left.rect.y + left.rect.h > right.rect.y {
                layout_violations.push(format!(
                    "{} overlaps {}",
                    left.relative_path, right.relative_path
                ));
            }
        }
    }

    let mut hierarchy_mismatches = Vec::new();
    let mut detail_mismatches = Vec::new();
    for node in &nodes {
        let detail = store.detail(node.id)?;
        let expected_parent = node.parent_id;
        if detail.parent.as_ref().map(|parent| parent.id) != expected_parent {
            hierarchy_mismatches.push(format!("parent mismatch on {}", node.relative_path));
        }
        let mut expected_children = children_of
            .get(&node.id)
            .map(|positions| positions.iter().map(|p| nodes[*p].id).collect::<Vec<_>>())
            .unwrap_or_default();
        expected_children.sort_unstable();
        let mut reported = detail
            .children
            .iter()
            .map(|child| child.id)
            .collect::<Vec<_>>();
        reported.sort_unstable();
        if reported != expected_children {
            hierarchy_mismatches.push(format!("children mismatch on {}", node.relative_path));
        }
        if detail.children.len() as u32 != node.child_count {
            hierarchy_mismatches.push(format!("child count mismatch on {}", node.relative_path));
        }
        if detail.node.name != node.name
            || detail.node.size_bytes != node.size_bytes
            || detail.node.modified_unix_ms != node.modified_unix_ms
            || detail.node.access_diagnostic != node.access_diagnostic
        {
            detail_mismatches.push(format!("detail mismatch on {}", node.relative_path));
        }
        if hierarchy_mismatches.len() > 20 || detail_mismatches.len() > 20 {
            break;
        }
    }

    Ok(MapSelfCheck {
        brain_id: brain.brain_id.clone(),
        fixture_id: spec.id.to_string(),
        planned_paths: planned.len(),
        observed_paths: observed.len(),
        indexed_paths: indexed.len(),
        paths_agree: planned == observed && planned == indexed,
        missing_from_index: missing,
        unexpected_in_index: unexpected,
        layout_violations,
        hierarchy_mismatches,
        detail_mismatches,
    })
}

/// Canonical evidence of tasks already `VERIFIED` — **never a destination**.
///
/// Reserve `X5` of `ACTION-0028`. This function writes by replacement, so a
/// scenario a later slice migrated but did not rename would silently destroy
/// the published proof of an earlier task. The rule is enforced here, at the
/// only door, rather than trusted to every caller: a later task's execution
/// never replaces an earlier `VERIFIED` task's evidence.
///
/// Renaming or removing one of these files is a governance act, not a
/// runtime one; nothing in the application does it.
///
/// **The list grows when a task becomes `VERIFIED`.** `TASK-0018` was
/// `IMPLEMENTED` when this gate was written and `VERIFIED` by `ACTION-0029`,
/// so its four proofs joined the list — including the regression artefact it
/// produced itself, which is now somebody else's canonical evidence.
///
/// **`TASK-0019` is `VERIFIED` since `ACTION-0031`**, so its **six** proofs
/// join in turn and the list goes from eight names to fourteen. Four of them
/// are themselves regression replays `TASK-0019` produced; being a replay does
/// not make evidence less canonical once the task that published it has been
/// controlled. `TASK-0020` therefore writes **nothing** under a `TASK-0019`
/// name: its own regressions are published under `TASK-0020-` names, and this
/// gate is what makes that a refusal rather than a convention.
///
/// **`TASK-0020` is `VERIFIED` since `ACTION-0032`**, so its **five** proofs
/// join in turn and the list goes from fourteen names to nineteen. The
/// consequence is deliberate and worth stating plainly: the scenarios still
/// compiled into this runtime spell those five names as their destination, so
/// pressing those buttons now yields a **refusal** instead of a write. That is
/// the gate working, not a regression. `TASK-0020` is finished and controlled;
/// no legitimate execution needs to write those files again, and the next
/// slice republishes its replays under **its own** task name, exactly as
/// `TASK-0020` did for `TASK-0019`.
///
/// **`TASK-0022` is `VERIFIED` since `ACTION-0036`**, so its **eight**
/// canonical proofs join the list, which grows from nineteen names to
/// twenty-seven. Its `H9` was not run, its `K12` outputs were not published as
/// `TASK-0022` evidence, and no `-abandon` variant is canonical; none of those
/// names is protected.
///
/// **`TASK-0023` is `VERIFIED` since `ACTION-0039`**, so its **two** canonical
/// proofs — the `EC15` `pass1` and `pass2` of the exact content observations,
/// run in the real WebView2 host — join the list, which grows from
/// twenty-seven names to twenty-nine. `TASK-0023` published many other
/// artefacts: the `H9`, `J12`, `K11`, `K12`, `L12`, `M12` and `N15` replays it
/// migrated, and every `-abandon` variant. **None of those is canonical
/// evidence of `TASK-0023`** and none is protected; only `EC15` carried the
/// criterion the task was controlled on.
///
/// **`TASK-0024` is `VERIFIED` since `ACTION-0041`**, so exactly its **three**
/// canonical proofs join the list: the two `DR15` passes and the `J12`
/// intra-brain regression. The list grows from twenty-nine to thirty-two.
/// The corrective `X11` proof remains noncanonical, as do the `H9`, `K11`,
/// `K12`, `L12`, `M12`, `N15`, `EC15` and `-abandon` outputs of this slice.
///
/// The consequence is again deliberate, and again worth stating plainly: the
/// runtime compiled into this checkout still spells the three `TASK-0024`
/// canonical names as destinations, so replaying those scenarios now yields a
/// **refusal**. That is the gate working. The next slice migrates destinations
/// under its own task name before it replays anything.
pub const PROTECTED_RUN_ARTIFACTS: [&str; 32] = [
    "TASK-0016-H1-H7-verification.json",
    "TASK-0016-H9-webview2.json",
    "TASK-0017-J11-isolation.json",
    "TASK-0017-J12-webview2.json",
    "TASK-0018-K11-readonly-and-isolation.json",
    "TASK-0018-K12-webview2-pass1.json",
    "TASK-0018-K12-webview2-pass2.json",
    "TASK-0018-J12-relations-regression-webview2.json",
    "TASK-0019-J12-relations-regression-webview2.json",
    "TASK-0019-K11-readonly-regression-webview2.json",
    "TASK-0019-K12-foundation-regression-webview2-pass1.json",
    "TASK-0019-K12-foundation-regression-webview2-pass2.json",
    "TASK-0019-L12-composed-view-webview2-pass1.json",
    "TASK-0019-L12-composed-view-webview2-pass2.json",
    "TASK-0020-M12-interbrain-relations-webview2-pass1.json",
    "TASK-0020-M12-interbrain-relations-webview2-pass2.json",
    "TASK-0020-J12-intrabrain-regression-webview2.json",
    "TASK-0020-L12-composed-regression-webview2-pass1.json",
    "TASK-0020-L12-composed-regression-webview2-pass2.json",
    "TASK-0022-J12-intrabrain-relations-regression-webview2.json",
    "TASK-0022-K11-readonly-isolation-regression-webview2.json",
    "TASK-0022-L12-composed-view-regression-webview2-pass1.json",
    "TASK-0022-L12-composed-view-regression-webview2-pass2.json",
    "TASK-0022-M12-interbrain-relations-regression-webview2-pass1.json",
    "TASK-0022-M12-interbrain-relations-regression-webview2-pass2.json",
    "TASK-0022-N15-topographic-node-graph-webview2-pass1.json",
    "TASK-0022-N15-topographic-node-graph-webview2-pass2.json",
    "TASK-0023-EC15-exact-content-observations-webview2-pass1.json",
    "TASK-0023-EC15-exact-content-observations-webview2-pass2.json",
    "TASK-0024-DR15-deterministic-relation-engine-webview2-pass1.json",
    "TASK-0024-DR15-deterministic-relation-engine-webview2-pass2.json",
    "TASK-0024-J12-intrabrain-relations-regression-webview2.json",
];

/// Writes a measurement artefact into `docs/performance/runs/` of this
/// checkout. Development builds only.
///
/// Confined four ways, because a command that writes files is exactly where a
/// slice could quietly step outside its repository — or over its own history:
/// the destination folder is fixed, the name may contain no separator and no
/// `..`, the name may not be one of [`PROTECTED_RUN_ARTIFACTS`], and the
/// repository is located at run time by its own markers rather than by a
/// compiled-in path.
#[cfg(debug_assertions)]
pub fn write_run_artifact(name: &str, contents: &str) -> Result<String, MapError> {
    if PROTECTED_RUN_ARTIFACTS.contains(&name) {
        return Err(MapError::ArtifactRejected(format!(
            "artefact refused, it is the canonical evidence of a VERIFIED task: {name}"
        )));
    }
    let safe = name
        .chars()
        .all(|character| character.is_ascii_alphanumeric() || matches!(character, '-' | '_' | '.'))
        && !name.contains("..")
        && !name.is_empty()
        && name.len() <= 120;
    if !safe {
        return Err(MapError::ArtifactRejected(format!(
            "artefact name refused: {name}"
        )));
    }
    let repository = sandbox::repository_root()
        .ok_or_else(|| MapError::ArtifactRejected("repository not found".into()))?;
    let directory = repository.join("docs").join("performance").join("runs");
    std::fs::create_dir_all(&directory)?;
    let target = directory.join(name);
    std::fs::write(&target, contents)?;
    Ok(target
        .strip_prefix(&repository)
        .unwrap_or(&target)
        .to_string_lossy()
        .replace('\\', "/"))
}

pub fn fixture_summaries() -> Vec<FixtureSummary> {
    fixtures::FIXTURES
        .iter()
        .map(|spec| {
            let plan = fixtures::plan(spec);
            FixtureSummary {
                id: spec.id.to_string(),
                label_fr: spec.label_fr.to_string(),
                label_en: spec.label_en.to_string(),
                seed: spec.seed.to_string(),
                max_nodes: spec.max_nodes,
                planned_nodes: plan.node_count(),
                planned_max_depth: plan.max_depth(),
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::map::brains::SourceKind;

    /// Reserve `X5`. The only door that writes a run artefact refuses to write
    /// over the canonical evidence of a task already `VERIFIED`.
    ///
    /// The refusal happens before any filesystem access, so this test writes
    /// nothing: a test that had to create the file to prove it is protected
    /// would be the very accident it guards against.
    #[test]
    fn a_verified_tasks_evidence_is_never_a_destination() {
        for name in PROTECTED_RUN_ARTIFACTS {
            let refused = write_run_artifact(name, "{}");
            assert!(
                matches!(refused, Err(MapError::ArtifactRejected(_))),
                "{name} was accepted as a destination"
            );
        }
    }

    /// The runtime destinations that are **not** canonical evidence stay
    /// writable, and still say which task they belong to.
    ///
    /// This test used to assert that *all* the `TASK-0020` destinations were
    /// free. Five of them no longer are — `ACTION-0032` made `TASK-0020`
    /// `VERIFIED` — so what remains free is exactly the set below: the
    /// abandonment variants, which are not evidence of anything, and the
    /// replays `TASK-0020` never had to publish.
    #[test]
    fn the_runtime_destinations_that_are_not_evidence_stay_writable() {
        for name in [
            "TASK-0020-J12-intrabrain-regression-webview2-abandon.json",
            "TASK-0020-L12-composed-regression-webview2-pass1-abandon.json",
            "TASK-0020-L12-composed-regression-webview2-pass2-abandon.json",
            "TASK-0020-M12-interbrain-relations-webview2-pass1-abandon.json",
            "TASK-0020-M12-interbrain-relations-webview2-pass2-abandon.json",
            "TASK-0020-K11-readonly-regression-webview2.json",
            "TASK-0020-K12-foundation-regression-webview2-pass1.json",
            "TASK-0020-K12-foundation-regression-webview2-pass2.json",
            "TASK-0020-H9-composed-runtime-regression-webview2.json",
        ] {
            assert!(
                !PROTECTED_RUN_ARTIFACTS.contains(&name),
                "{name} collides with protected evidence"
            );
            assert!(name.starts_with("TASK-0020-"), "{name} names no task");
            assert!(name.len() <= 120, "{name} is longer than the guard allows");
        }
    }

    /// Reserve `X5`, extended a third time: the **five** proofs `TASK-0020`
    /// published became untouchable the moment `ACTION-0032` made it
    /// `VERIFIED`.
    ///
    /// Two of these five are the `M12` campaign's own two passes, and three
    /// are regression replays. Stating it separately matters because this is
    /// the first extension whose names are **still spelled as destinations**
    /// by the runtime that ships in this checkout: `crossScenario`,
    /// `relationScenario` and `composedScenario` will ask for them, and this
    /// gate answers no. The refusal is the point. A slice that genuinely needs
    /// to replay one of these scenarios renames its output under its own task,
    /// which is what every previous slice did.
    #[test]
    fn task_0020s_own_evidence_became_protected_when_it_was_verified() {
        for name in [
            "TASK-0020-M12-interbrain-relations-webview2-pass1.json",
            "TASK-0020-M12-interbrain-relations-webview2-pass2.json",
            "TASK-0020-J12-intrabrain-regression-webview2.json",
            "TASK-0020-L12-composed-regression-webview2-pass1.json",
            "TASK-0020-L12-composed-regression-webview2-pass2.json",
        ] {
            assert!(
                PROTECTED_RUN_ARTIFACTS.contains(&name),
                "{name} is a VERIFIED task's evidence and is not protected"
            );
            assert!(
                matches!(
                    write_run_artifact(name, "{}"),
                    Err(MapError::ArtifactRejected(_))
                ),
                "{name} was accepted as a destination"
            );
        }
    }

    /// Reserve `X5`, extended a fourth time: exactly the eight canonical
    /// proofs of `TASK-0022` became untouchable when `ACTION-0036` made the
    /// task `VERIFIED`.
    #[test]
    fn task_0022s_eight_canonical_proofs_are_protected_after_verification() {
        for name in [
            "TASK-0022-J12-intrabrain-relations-regression-webview2.json",
            "TASK-0022-K11-readonly-isolation-regression-webview2.json",
            "TASK-0022-L12-composed-view-regression-webview2-pass1.json",
            "TASK-0022-L12-composed-view-regression-webview2-pass2.json",
            "TASK-0022-M12-interbrain-relations-regression-webview2-pass1.json",
            "TASK-0022-M12-interbrain-relations-regression-webview2-pass2.json",
            "TASK-0022-N15-topographic-node-graph-webview2-pass1.json",
            "TASK-0022-N15-topographic-node-graph-webview2-pass2.json",
        ] {
            assert!(
                PROTECTED_RUN_ARTIFACTS.contains(&name),
                "{name} is TASK-0022 canonical evidence and is not protected"
            );
            assert!(
                matches!(
                    write_run_artifact(name, "{}"),
                    Err(MapError::ArtifactRejected(_))
                ),
                "{name} was accepted as a destination"
            );
        }
    }

    /// Reserve `X5`, extended a fifth time: exactly the **two** `EC15` proofs
    /// of `TASK-0023` became untouchable when `ACTION-0039` made the task
    /// `VERIFIED`.
    ///
    /// This is the narrowest extension so far, and the narrowness is the
    /// claim. `TASK-0023` migrated seven scenarios and produced artefacts for
    /// all of them, but it was controlled on `EC15` alone — the exact content
    /// observations in the real host — so `EC15` alone is canonical. Verifying
    /// a task seals the evidence it was verified on, not everything it
    /// happened to write.
    #[test]
    fn task_0023s_two_ec15_proofs_are_protected_after_verification() {
        for name in [
            "TASK-0023-EC15-exact-content-observations-webview2-pass1.json",
            "TASK-0023-EC15-exact-content-observations-webview2-pass2.json",
        ] {
            assert!(
                PROTECTED_RUN_ARTIFACTS.contains(&name),
                "{name} is TASK-0023 canonical evidence and is not protected"
            );
            assert!(
                matches!(
                    write_run_artifact(name, "{}"),
                    Err(MapError::ArtifactRejected(_))
                ),
                "{name} was accepted as a destination"
            );
        }
    }

    /// No other `TASK-0023` destination is sealed by `ACTION-0039`.
    ///
    /// The counterpart of the test above, and the one that would actually
    /// catch an over-wide seal: the replays `TASK-0023` migrated stay writable
    /// so the next slice can still rename them under its own task, and every
    /// `-abandon` variant stays evidence of nothing.
    #[test]
    fn task_0023_noncanonical_destinations_stay_unprotected() {
        for name in [
            "TASK-0023-H9-composed-runtime-regression-webview2.json",
            "TASK-0023-H9-composed-runtime-regression-webview2-abandon.json",
            "TASK-0023-J12-intrabrain-relations-regression-webview2.json",
            "TASK-0023-J12-intrabrain-relations-regression-webview2-abandon.json",
            "TASK-0023-K11-readonly-isolation-regression-webview2.json",
            "TASK-0023-K12-foundation-regression-webview2-pass1.json",
            "TASK-0023-K12-foundation-regression-webview2-pass2.json",
            "TASK-0023-L12-composed-view-regression-webview2-pass1.json",
            "TASK-0023-L12-composed-view-regression-webview2-pass2.json",
            "TASK-0023-M12-interbrain-relations-regression-webview2-pass1.json",
            "TASK-0023-M12-interbrain-relations-regression-webview2-pass2.json",
            "TASK-0023-N15-topographic-node-graph-webview2-pass1.json",
            "TASK-0023-N15-topographic-node-graph-webview2-pass2.json",
        ] {
            assert!(
                !PROTECTED_RUN_ARTIFACTS.contains(&name),
                "{name} is noncanonical TASK-0023 output and was protected"
            );
        }
    }

    /// `ACTION-0041` seals exactly the three canonical proofs of `TASK-0024`.
    #[test]
    fn task_0024s_three_canonical_proofs_are_protected_after_verification() {
        for name in [
            "TASK-0024-DR15-deterministic-relation-engine-webview2-pass1.json",
            "TASK-0024-DR15-deterministic-relation-engine-webview2-pass2.json",
            "TASK-0024-J12-intrabrain-relations-regression-webview2.json",
        ] {
            assert!(
                PROTECTED_RUN_ARTIFACTS.contains(&name),
                "{name} is TASK-0024 canonical evidence and is not protected"
            );
            assert!(
                matches!(
                    write_run_artifact(name, "{}"),
                    Err(MapError::ArtifactRejected(_))
                ),
                "{name} was accepted as a destination"
            );
        }
    }

    /// The corrective proof and every other `TASK-0024` replay remain outside
    /// the seal; one representative noncanonical destination stays allowed.
    #[test]
    fn task_0024_noncanonical_destinations_stay_unprotected() {
        for name in [
            "TASK-0024-X11-generic-brain-webview2.json",
            "TASK-0024-H9-composed-runtime-regression-webview2.json",
            "TASK-0024-K11-readonly-isolation-regression-webview2.json",
            "TASK-0024-K12-foundation-regression-webview2-pass1.json",
            "TASK-0024-L12-composed-view-regression-webview2-pass1.json",
            "TASK-0024-M12-interbrain-relations-regression-webview2-pass1.json",
            "TASK-0024-N15-topographic-node-graph-webview2-pass1.json",
            "TASK-0024-EC15-exact-content-observations-webview2-pass1.json",
            "TASK-0024-DR15-deterministic-relation-engine-webview2-pass1-abandon.json",
        ] {
            assert!(
                !PROTECTED_RUN_ARTIFACTS.contains(&name),
                "{name} is noncanonical TASK-0024 output and was protected"
            );
        }
    }

    /// The seal grew by exactly three names, and grew only at the end.
    ///
    /// Stated as one test because the danger of an extension is not that the
    /// new names are missing — the tests above catch that — but that an edit
    /// reorders, drops or duplicates one of the twenty-nine already there.
    #[test]
    fn the_seal_is_the_unchanged_twenty_nine_followed_by_task_0024s_three() {
        assert_eq!(PROTECTED_RUN_ARTIFACTS.len(), 32);
        assert_eq!(
            &PROTECTED_RUN_ARTIFACTS[..27],
            &[
                "TASK-0016-H1-H7-verification.json",
                "TASK-0016-H9-webview2.json",
                "TASK-0017-J11-isolation.json",
                "TASK-0017-J12-webview2.json",
                "TASK-0018-K11-readonly-and-isolation.json",
                "TASK-0018-K12-webview2-pass1.json",
                "TASK-0018-K12-webview2-pass2.json",
                "TASK-0018-J12-relations-regression-webview2.json",
                "TASK-0019-J12-relations-regression-webview2.json",
                "TASK-0019-K11-readonly-regression-webview2.json",
                "TASK-0019-K12-foundation-regression-webview2-pass1.json",
                "TASK-0019-K12-foundation-regression-webview2-pass2.json",
                "TASK-0019-L12-composed-view-webview2-pass1.json",
                "TASK-0019-L12-composed-view-webview2-pass2.json",
                "TASK-0020-M12-interbrain-relations-webview2-pass1.json",
                "TASK-0020-M12-interbrain-relations-webview2-pass2.json",
                "TASK-0020-J12-intrabrain-regression-webview2.json",
                "TASK-0020-L12-composed-regression-webview2-pass1.json",
                "TASK-0020-L12-composed-regression-webview2-pass2.json",
                "TASK-0022-J12-intrabrain-relations-regression-webview2.json",
                "TASK-0022-K11-readonly-isolation-regression-webview2.json",
                "TASK-0022-L12-composed-view-regression-webview2-pass1.json",
                "TASK-0022-L12-composed-view-regression-webview2-pass2.json",
                "TASK-0022-M12-interbrain-relations-regression-webview2-pass1.json",
                "TASK-0022-M12-interbrain-relations-regression-webview2-pass2.json",
                "TASK-0022-N15-topographic-node-graph-webview2-pass1.json",
                "TASK-0022-N15-topographic-node-graph-webview2-pass2.json",
            ]
        );
        assert_eq!(
            &PROTECTED_RUN_ARTIFACTS[27..29],
            &[
                "TASK-0023-EC15-exact-content-observations-webview2-pass1.json",
                "TASK-0023-EC15-exact-content-observations-webview2-pass2.json",
            ]
        );
        assert_eq!(
            &PROTECTED_RUN_ARTIFACTS[29..],
            &[
                "TASK-0024-DR15-deterministic-relation-engine-webview2-pass1.json",
                "TASK-0024-DR15-deterministic-relation-engine-webview2-pass2.json",
                "TASK-0024-J12-intrabrain-relations-regression-webview2.json",
            ]
        );
        let mut sorted = PROTECTED_RUN_ARTIFACTS.to_vec();
        sorted.sort_unstable();
        sorted.dedup();
        assert_eq!(sorted.len(), 32, "the seal holds a duplicate name");
    }

    /// `TASK-0022` published no `H9` or `K12` proof, and an abandoned run is
    /// evidence of nothing. Verification must not widen the seal to them.
    #[test]
    fn task_0022_noncanonical_variants_stay_unprotected() {
        for name in [
            "TASK-0022-H9-composed-runtime-regression-webview2.json",
            "TASK-0022-K12-foundation-regression-webview2-pass1.json",
            "TASK-0022-K12-foundation-regression-webview2-pass2.json",
            "TASK-0022-H9-composed-runtime-regression-webview2-abandon.json",
            "TASK-0022-J12-intrabrain-relations-regression-webview2-abandon.json",
            "TASK-0022-K12-foundation-regression-webview2-pass1-abandon.json",
            "TASK-0022-K12-foundation-regression-webview2-pass2-abandon.json",
            "TASK-0022-L12-composed-view-regression-webview2-pass1-abandon.json",
            "TASK-0022-L12-composed-view-regression-webview2-pass2-abandon.json",
            "TASK-0022-M12-interbrain-relations-regression-webview2-pass1-abandon.json",
            "TASK-0022-M12-interbrain-relations-regression-webview2-pass2-abandon.json",
            "TASK-0022-N15-topographic-node-graph-webview2-pass1-abandon.json",
            "TASK-0022-N15-topographic-node-graph-webview2-pass2-abandon.json",
        ] {
            assert!(
                !PROTECTED_RUN_ARTIFACTS.contains(&name),
                "{name} is noncanonical and was protected"
            );
        }
    }

    /// Reserve `X5`, extended a second time: the six proofs `TASK-0019`
    /// published became untouchable the moment `ACTION-0031` made it
    /// `VERIFIED`.
    ///
    /// Stated separately because it is a different claim from "the new names
    /// are free": four of these six are **regression replays**, and a replay's
    /// evidence is exactly the kind a later slice would feel entitled to
    /// overwrite. It may not.
    #[test]
    fn task_0019s_own_evidence_became_protected_when_it_was_verified() {
        for name in [
            "TASK-0019-J12-relations-regression-webview2.json",
            "TASK-0019-K11-readonly-regression-webview2.json",
            "TASK-0019-K12-foundation-regression-webview2-pass1.json",
            "TASK-0019-K12-foundation-regression-webview2-pass2.json",
            "TASK-0019-L12-composed-view-webview2-pass1.json",
            "TASK-0019-L12-composed-view-webview2-pass2.json",
        ] {
            assert!(
                PROTECTED_RUN_ARTIFACTS.contains(&name),
                "{name} is a VERIFIED task's evidence and is not protected"
            );
            assert!(
                matches!(
                    write_run_artifact(name, "{}"),
                    Err(MapError::ArtifactRejected(_))
                ),
                "{name} was accepted as a destination"
            );
        }
    }

    /// The four proofs `TASK-0018` published are protected now that it is
    /// `VERIFIED` — including the one it wrote itself as a regression.
    ///
    /// Stated separately from the loop above because it is a different claim:
    /// not « the new names are free » but « the previous slice's evidence has
    /// become untouchable », which is what `ACTION-0029` changed.
    #[test]
    fn task_0018s_own_evidence_became_protected_when_it_was_verified() {
        for name in [
            "TASK-0018-K11-readonly-and-isolation.json",
            "TASK-0018-K12-webview2-pass1.json",
            "TASK-0018-K12-webview2-pass2.json",
            "TASK-0018-J12-relations-regression-webview2.json",
        ] {
            assert!(
                PROTECTED_RUN_ARTIFACTS.contains(&name),
                "{name} is a VERIFIED task's evidence and is not protected"
            );
            assert!(
                matches!(
                    write_run_artifact(name, "{}"),
                    Err(MapError::ArtifactRejected(_))
                ),
                "{name} was accepted as a destination"
            );
        }
    }

    /// A brain that reads `spec`, for the tests that still want to exercise
    /// **every** fixture rather than only the three frozen brains.
    ///
    /// Building a record by hand here is deliberate and confined to tests: the
    /// pipeline must work for any brain the catalogue could hold, and the
    /// coverage of `H1`-`H7` across all four fixtures predates brains and is
    /// not given up.
    fn brain_reading(fixture_id: &str) -> BrainRecord {
        BrainRecord {
            brain_id: format!("brain-test-{fixture_id}"),
            display_name: format!("Cerveau {fixture_id}"),
            color: "#333333".to_string(),
            icon: "*".to_string(),
            source_kind: SourceKind::SyntheticFixture,
            source_ref: fixture_id.to_string(),
            position: 1,
        }
    }

    /// Every fixture, end to end. Slower than a unit test, and the only place
    /// where `H1`, `H2`, `H3`, `H5`, `H6`, `H7` and `H11` are all exercised
    /// against the real pipeline rather than against a stub.
    #[test]
    fn every_fixture_builds_checks_out_and_leaves_its_tree_untouched() {
        let temp = tempfile::tempdir().expect("temp");
        let paths = SandboxPaths::under(temp.path().join("sandbox"));

        for spec in &fixtures::FIXTURES {
            let brain = brain_reading(spec.id);
            let report = build_map(&paths, &brain, false).expect("build");
            assert_eq!(report.brain_id, brain.brain_id);
            assert_eq!(report.fixture_id, spec.id);

            // H11 — the frozen ceilings hold.
            assert!(
                report.node_count <= spec.max_nodes,
                "{} produced {} nodes, over its ceiling of {}",
                spec.id,
                report.node_count,
                spec.max_nodes
            );
            assert!(report.node_count <= MAX_NODES_PER_MAP);
            assert!(report.max_depth <= MAX_FIXTURE_DEPTH);
            assert_eq!(report.node_count, report.planned_nodes);

            // H6 — the analysed tree is byte-identical before and after.
            assert!(report.read_only_confirmed, "{} was modified", spec.id);

            // H10 — layout runs once per tree.
            assert_eq!(report.layout_invocations, 1);

            // H1, H2, H3, H5.
            let check = self_check(&paths, &brain).expect("self check");
            assert!(
                check.paths_agree,
                "{}: plan {} / disk {} / index {}, missing {:?}, unexpected {:?}",
                spec.id,
                check.planned_paths,
                check.observed_paths,
                check.indexed_paths,
                check.missing_from_index,
                check.unexpected_in_index
            );
            assert!(
                check.layout_violations.is_empty(),
                "{}: {:?}",
                spec.id,
                check.layout_violations
            );
            assert!(
                check.hierarchy_mismatches.is_empty(),
                "{}: {:?}",
                spec.id,
                check.hierarchy_mismatches
            );
            assert!(
                check.detail_mismatches.is_empty(),
                "{}: {:?}",
                spec.id,
                check.detail_mismatches
            );

            // I-2 — nothing of FileTopo inside the analysed tree.
            let integrity = integrity(&paths, &brain).expect("integrity");
            assert!(
                integrity.filetopo_artifacts.is_empty(),
                "{}: {:?}",
                spec.id,
                integrity.filetopo_artifacts
            );
        }
    }

    /// `H7`: delete the index, rebuild, and everything reconstructible comes
    /// back identical — while the one value declared unreconstructible does not.
    #[test]
    fn deleting_the_index_and_rebuilding_produces_an_equivalent_map() {
        let temp = tempfile::tempdir().expect("temp");
        let paths = SandboxPaths::under(temp.path().join("sandbox"));

        let brain = brain_reading("wide");
        let first = build_map(&paths, &brain, false).expect("first build");
        let store = open_store(&paths, &brain).expect("store");
        let first_built_at = store.meta("built_unix_ms").expect("meta");
        drop(store);

        assert!(paths.brain_map_database(&brain.brain_id).is_file());
        std::thread::sleep(std::time::Duration::from_millis(2));
        let second = build_map(&paths, &brain, true).expect("rebuild");

        assert_eq!(first.reconstructible_digest, second.reconstructible_digest);
        assert_eq!(first.node_count, second.node_count);
        assert_eq!(
            second.non_reconstructible,
            vec!["built_unix_ms".to_string()]
        );

        let store = open_store(&paths, &brain).expect("store");
        assert_ne!(
            first_built_at,
            store.meta("built_unix_ms").expect("meta"),
            "the declared unreconstructible value must actually differ, or the \
             declaration is decoration"
        );
    }

    #[test]
    fn a_schema_two_treemap_is_detected_and_rebuilt_as_schema_three() {
        let temp = tempfile::tempdir().expect("temp");
        let paths = SandboxPaths::under(temp.path().join("sandbox"));
        let brain = brain_reading("quasi-empty");
        let first = build_map(&paths, &brain, false).expect("initial v3 build");
        let database = paths.brain_map_database(&brain.brain_id);

        let legacy = rusqlite::Connection::open(&database).expect("legacy index");
        legacy
            .execute(
                "UPDATE map_meta SET value = '2' WHERE key = 'schema_version'",
                [],
            )
            .expect("schema v2");
        legacy
            .execute(
                "UPDATE map_meta SET value = 'squarified-min-area-v1' WHERE key = 'layout_algorithm'",
                [],
            )
            .expect("old algorithm");
        legacy
            .execute("UPDATE map_nodes SET rect_w = 13, rect_h = 17", [])
            .expect("representative old rectangles");
        legacy
            .execute_batch("PRAGMA user_version=2;")
            .expect("user version 2");
        drop(legacy);

        let rebuilt = build_map(&paths, &brain, false).expect("compatibility rebuild");
        assert!(
            rebuilt.rebuilt,
            "an incompatible index must report its rebuild"
        );
        assert_eq!(rebuilt.schema_version, 3);
        assert_eq!(rebuilt.layout_algorithm, LAYOUT_ALGORITHM);
        assert_eq!(rebuilt.layout_invocations, 1);
        assert_eq!(rebuilt.fingerprint_before, first.fingerprint_before);
        assert_eq!(rebuilt.fingerprint_after, first.fingerprint_after);
        let snapshot = snapshot(&paths, &brain).expect("v3 snapshot");
        assert_eq!(snapshot.schema_version, 3);
        assert_eq!(snapshot.layout_algorithm, LAYOUT_ALGORITHM);
        assert!(snapshot.nodes.iter().all(|node| {
            node.rect.w == layout::CARD_WIDTH && node.rect.h == layout::CARD_HEIGHT
        }));
    }

    #[test]
    fn an_unknown_fixture_is_refused_by_name() {
        let temp = tempfile::tempdir().expect("temp");
        let paths = SandboxPaths::under(temp.path().to_path_buf());
        let error =
            build_map(&paths, &brain_reading("ailleurs"), false).expect_err("unknown fixture");
        assert!(matches!(error, MapError::UnknownFixture(_)));
    }

    #[test]
    fn reading_a_map_that_was_never_built_fails_instead_of_returning_an_empty_one() {
        let temp = tempfile::tempdir().expect("temp");
        let paths = SandboxPaths::under(temp.path().to_path_buf());
        let error = snapshot(&paths, &brain_reading("deep")).expect_err("not built");
        assert!(matches!(error, MapError::NotBuilt(_)));
    }

    /// `K3` and `K4`, on the real pipeline: the two brains that share
    /// `quasi-empty` build **two** indexes and read **their own**.
    ///
    /// The fixture is identical on purpose. If isolation held only because the
    /// sources differed, it would prove nothing at all.
    #[test]
    fn two_brains_on_the_same_fixture_build_two_indexes_and_read_their_own() {
        let temp = tempfile::tempdir().expect("temp");
        let paths = SandboxPaths::under(temp.path().join("sandbox"));

        let alpha = BrainRecord::frozen_by_id("brain-alpha").expect("alpha");
        let gamma = BrainRecord::frozen_by_id("brain-gamma").expect("gamma");
        assert_eq!(alpha.source_ref, gamma.source_ref, "the point of the test");

        let alpha_report = build_map(&paths, &alpha, false).expect("alpha build");
        let gamma_report = build_map(&paths, &gamma, false).expect("gamma build");

        // `K4`: both read `quasi-empty`, so both hold 12 nodes...
        assert_eq!(alpha_report.node_count, 12);
        assert_eq!(gamma_report.node_count, 12);
        // ...and `K3`: in two different files, neither naming the fixture.
        assert_ne!(alpha_report.index_path, gamma_report.index_path);
        assert_eq!(
            alpha_report.index_path,
            "brains/brain-alpha/map/index.sqlite"
        );
        assert_eq!(
            gamma_report.index_path,
            "brains/brain-gamma/map/index.sqlite"
        );
        assert!(paths.brain_map_database("brain-alpha").is_file());
        assert!(paths.brain_map_database("brain-gamma").is_file());

        // Each snapshot names its own brain, read back from its own index.
        assert_eq!(
            snapshot(&paths, &alpha).expect("alpha").brain_id,
            "brain-alpha"
        );
        assert_eq!(
            snapshot(&paths, &gamma).expect("gamma").brain_id,
            "brain-gamma"
        );
    }

    /// `K4`: the frozen counts of §4.8, from the real pipeline.
    #[test]
    fn the_three_frozen_brains_load_the_counts_task_0018_froze() {
        let temp = tempfile::tempdir().expect("temp");
        let paths = SandboxPaths::under(temp.path().join("sandbox"));

        for (brain_id, expected) in [
            ("brain-alpha", 12usize),
            ("brain-beta", 157),
            ("brain-gamma", 12),
        ] {
            let brain = BrainRecord::frozen_by_id(brain_id).expect("frozen brain");
            let report = build_map(&paths, &brain, false).expect("build");
            assert_eq!(report.node_count, expected, "{brain_id}");
            let snapshot = snapshot(&paths, &brain).expect("snapshot");
            assert_eq!(snapshot.node_count, expected, "{brain_id}");
            assert_eq!(snapshot.brain_id, brain_id);
        }
    }

    /// `K3`, as a guarantee rather than a convention.
    ///
    /// An index physically placed where another brain looks is **refused by
    /// name**, not served. The copy is what a mistake would look like, so the
    /// test performs the mistake instead of describing it.
    #[test]
    fn an_index_built_for_another_brain_is_refused_rather_than_served() {
        let temp = tempfile::tempdir().expect("temp");
        let paths = SandboxPaths::under(temp.path().join("sandbox"));

        let alpha = BrainRecord::frozen_by_id("brain-alpha").expect("alpha");
        let gamma = BrainRecord::frozen_by_id("brain-gamma").expect("gamma");
        build_map(&paths, &alpha, false).expect("alpha build");

        // Alpha's index, dropped into Gamma's place.
        let gamma_database = paths.brain_map_database(&gamma.brain_id);
        std::fs::create_dir_all(gamma_database.parent().expect("map dir")).expect("dir");
        std::fs::copy(paths.brain_map_database(&alpha.brain_id), &gamma_database).expect("copy");

        let outcome = open_store(&paths, &gamma);
        match outcome.err().expect("must refuse") {
            MapError::BrainMismatch { expected, found } => {
                assert_eq!(expected, "brain-gamma");
                assert_eq!(found, "brain-alpha");
            }
            other => panic!("expected a brain mismatch, got {other:?}"),
        }
    }

    /// `K5`: the same `node_id` exists in both brains and means two different
    /// things. Reading it in one brain never reaches the other.
    #[test]
    fn the_same_node_id_in_two_brains_resolves_only_inside_its_own() {
        let temp = tempfile::tempdir().expect("temp");
        let paths = SandboxPaths::under(temp.path().join("sandbox"));

        let alpha = BrainRecord::frozen_by_id("brain-alpha").expect("alpha");
        let beta = BrainRecord::frozen_by_id("brain-beta").expect("beta");
        build_map(&paths, &alpha, false).expect("alpha");
        build_map(&paths, &beta, false).expect("beta");

        let alpha_nodes = snapshot(&paths, &alpha).expect("alpha").nodes;
        let beta_nodes = snapshot(&paths, &beta).expect("beta").nodes;

        // A id held by both brains — `quasi-empty` has 12 nodes, `deep` 157.
        let shared_id = alpha_nodes.last().expect("a node").id;
        assert!(beta_nodes.iter().any(|node| node.id == shared_id));

        let in_alpha = detail(&paths, &alpha, &BrainNodeRef::new("brain-alpha", shared_id))
            .expect("alpha detail");
        let in_beta = detail(&paths, &beta, &BrainNodeRef::new("brain-beta", shared_id))
            .expect("beta detail");

        // The same number, carried under the other brain's name, is refused
        // rather than resolved — the stale-selection case, exactly.
        let leak = detail(&paths, &beta, &BrainNodeRef::new("brain-alpha", shared_id))
            .expect_err("K5: a reference from another brain must not resolve");
        assert!(matches!(leak, MapError::BrainMismatch { .. }), "{leak:?}");

        // Same number, two different nodes, and each one belongs to its brain.
        assert_eq!(in_alpha.node.id, in_beta.node.id);
        assert!(
            alpha_nodes
                .iter()
                .any(|node| node.relative_path == in_alpha.node.relative_path)
        );
        assert!(
            !beta_nodes
                .iter()
                .any(|node| node.relative_path == in_alpha.node.relative_path)
                || in_alpha.node.relative_path == in_beta.node.relative_path
        );

        // And an id that only `deep` can hold is unreachable from Alpha.
        let beta_only = beta_nodes.last().expect("a node").id;
        assert!(beta_only > alpha_nodes.len() as i64);
        let error = detail(&paths, &alpha, &BrainNodeRef::new("brain-alpha", beta_only))
            .expect_err("must not resolve");
        assert!(matches!(error, MapError::NodeMissing(_)));
    }

    #[test]
    fn declared_fixture_summaries_match_the_frozen_ceilings() {
        for summary in fixture_summaries() {
            assert!(
                summary.planned_nodes <= summary.max_nodes,
                "{} plans {} nodes over its ceiling of {}",
                summary.id,
                summary.planned_nodes,
                summary.max_nodes
            );
            assert!(summary.planned_max_depth <= MAX_FIXTURE_DEPTH);
            // The realised counts are a *result* of the frozen seeds, not part
            // of the freeze; printing them is how they get published.
            println!(
                "FIXTURE id={} seed={} nodes={} ceiling={} depth={}",
                summary.id,
                summary.seed,
                summary.planned_nodes,
                summary.max_nodes,
                summary.planned_max_depth
            );
        }
    }
}
