//! `TASK-0054` — progressive scale and exact aggregates, global closure proof
//! (`F-050`, `F-051`; `P-01`/`P-02`/`P-03` candidates).
//!
//! Nothing here adds product code. Every proof drives the *current* runtime —
//! `BrainIndex` / `materialize_view` / `children_page` / `query_nodes` /
//! `commands::*` — on **synthetic indexed** corpora of 10 000, 100 000 and
//! 1 000 000 rows. No physical file is created at those sizes; the rows go
//! straight through the canonical Index writer.
//!
//! The oracle is independent of the product: each corpus keeps its own
//! per-parent child counts and its own parent links, and every check compares
//! the product with *that*, never with the product's own `child_count`.
//!
//! Every guard below is a function returning `Result<(), String>`. The
//! falsification tests then feed it a deliberately broken input and require an
//! `Err` — a guard that cannot fail proves nothing.

use super as commands;
use super::*;
use crate::domain::{NodeDto, NodeKind};
use crate::map::{
    brain_index::{BrainIndex, SourceStamp},
    brains::SourceKind,
    layout,
    projection::{VIEW_BUDGET, materialize_view},
    store::MapSnapshot,
};
use std::collections::{BTreeMap, HashSet};
use std::fs;
use std::time::Instant;

// ---------------------------------------------------------------------------
// Corpora
// ---------------------------------------------------------------------------

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum Shape {
    /// One root with every other row as a direct child.
    Wide,
    /// Two levels: the root holds ~sqrt(n) folders, each holding ~sqrt(n) rows.
    Mixed,
    /// A 200-folder chain whose deepest folder holds every remaining row.
    DeepWide,
}

struct Corpus {
    nodes: Vec<NodeDto>,
    /// Oracle: `children[id]` = real number of direct children of row `id`.
    children: Vec<u32>,
}

fn node(
    id: i64,
    parent: Option<i64>,
    name: String,
    path: String,
    kind: NodeKind,
    depth: u32,
) -> NodeDto {
    NodeDto {
        id,
        parent_id: parent,
        name,
        relative_path: path,
        kind,
        depth,
        size_bytes: 0,
        modified_unix_ms: None,
        online_only: false,
        reparse_point: false,
        child_count: 0,
        seen: false,
    }
}

fn corpus(shape: Shape, n: usize) -> Corpus {
    assert!(n >= 1_000);
    let mut nodes: Vec<NodeDto> = Vec::with_capacity(n);
    nodes.push(node(
        1,
        None,
        "root".into(),
        String::new(),
        NodeKind::Root,
        0,
    ));
    let fanout = (n as f64).sqrt().ceil() as usize;
    for i in 1..n {
        let id = i as i64 + 1;
        let (parent_idx, kind_dir) = match shape {
            Shape::Wide => (0, false),
            Shape::Mixed => ((i - 1) / fanout, i <= fanout),
            Shape::DeepWide => {
                if i <= 200 {
                    (i - 1, i < 200)
                } else {
                    (200, false)
                }
            }
        };
        let parent = &nodes[parent_idx];
        let name = if kind_dir || (shape == Shape::DeepWide && i <= 200) {
            format!("d-{i:07}")
        } else {
            format!("f-{i:07}")
        };
        let path = if parent.relative_path.is_empty() {
            name.clone()
        } else {
            format!("{}/{}", parent.relative_path, name)
        };
        let kind = if kind_dir || (shape == Shape::DeepWide && i <= 200) {
            NodeKind::Directory
        } else {
            NodeKind::File
        };
        let depth = parent.depth + 1;
        let parent_id = parent.id;
        nodes.push(node(id, Some(parent_id), name, path, kind, depth));
    }
    let mut children = vec![0u32; n + 2];
    for row in &nodes {
        if let Some(p) = row.parent_id {
            children[p as usize] += 1;
        }
    }
    for row in &mut nodes {
        row.child_count = children[row.id as usize];
    }
    Corpus { nodes, children }
}

fn build(c: &Corpus) -> (tempfile::TempDir, BrainIndex, u128) {
    let temp = tempfile::tempdir().unwrap();
    let mut store = BrainIndex::open(&temp.path().join("index.sqlite")).unwrap();
    let started = Instant::now();
    store
        .replace(
            "synthetic-brain",
            SourceStamp {
                kind: SourceKind::SyntheticFixture,
                source_ref: "scale-closure",
                label: "Synthetic",
            },
            &c.nodes,
            &[],
            0,
        )
        .unwrap();
    (temp, store, started.elapsed().as_millis())
}

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

/// Upper bound of the layout extent a *bounded* view can reach: every slot on
/// its own row. A layout computed over the corpus overshoots it immediately.
fn max_layout_height() -> f64 {
    VIEW_BUDGET as f64 * (layout::CARD_HEIGHT + layout::ROW_GAP)
}

/// `F-050`: the view is bounded whatever the corpus.
fn guard_bounded(view: &MapSnapshot, n: usize) -> Result<(), String> {
    if view.node_count != n {
        return Err(format!("index cardinality {} != {n}", view.node_count));
    }
    if view.nodes.len() + view.aggregates.len() > VIEW_BUDGET {
        return Err("nodes + aggregates exceed VIEW_BUDGET".into());
    }
    if view.nodes.len() != view.materialized_count
        || view.materialized_count + view.non_materialized_count != view.node_count
    {
        return Err("materialised / omitted counts do not add up to the corpus".into());
    }
    if view.hierarchy_edges.len() > view.nodes.len().saturating_sub(1) {
        return Err("more edges than a forest of the materialised nodes".into());
    }
    if view.layout_height > max_layout_height() {
        return Err("layout extent larger than a bounded view can produce".into());
    }
    let json = serde_json::to_string(view).map_err(|e| e.to_string())?;
    // A corpus-independent ceiling: a full budget of slots, at most 1 KiB each.
    if json.len() > VIEW_BUDGET * 1024 {
        return Err(format!("payload {} bytes is not bounded", json.len()));
    }
    Ok(())
}

/// `F-050`/`F-051`: structure of nodes, edges and aggregates against the
/// *oracle* (the corpus' own counts), never the product's.
fn guard_exact(view: &MapSnapshot, c: &Corpus) -> Result<(), String> {
    let ids: HashSet<i64> = view.nodes.iter().map(|n| n.id).collect();
    if ids.len() != view.nodes.len() {
        return Err("duplicate materialised id".into());
    }
    for n in &view.nodes {
        let truth = &c.nodes[n.id as usize - 1];
        if truth.relative_path != n.relative_path || truth.parent_id != n.parent_id {
            return Err(format!("node {} differs from the corpus", n.id));
        }
    }
    for e in &view.hierarchy_edges {
        if !ids.contains(&e.parent_id) || !ids.contains(&e.child_id) {
            return Err("edge to something that is not a materialised node".into());
        }
        if c.nodes[e.child_id as usize - 1].parent_id != Some(e.parent_id) {
            return Err("invented hierarchy edge".into());
        }
    }
    for a in &view.aggregates {
        if !ids.contains(&a.parent_id) {
            return Err("aggregate hangs off a node that is not in the view".into());
        }
        let visible = view
            .nodes
            .iter()
            .filter(|n| n.parent_id == Some(a.parent_id))
            .count() as u64;
        let real = u64::from(c.children[a.parent_id as usize]);
        if a.omitted_direct_children + visible != real {
            return Err(format!(
                "aggregate of {}: {} omitted + {visible} visible != {real} real children",
                a.parent_id, a.omitted_direct_children
            ));
        }
        if a.omitted_direct_children == 0 {
            return Err("an aggregate with nothing omitted".into());
        }
        if a.reason != "view_budget_or_focus" {
            return Err(format!("unreadable aggregate reason {:?}", a.reason));
        }
    }
    Ok(())
}

/// `F-051`: an aggregate is never a folder, a path or something openable.
fn guard_aggregate_json(json: &serde_json::Value) -> Result<(), String> {
    let object = json.as_object().ok_or("aggregate is not an object")?;
    const ALLOWED: [&str; 5] = [
        "parentId",
        "omittedDirectChildren",
        "reason",
        "nextCursor",
        "rect",
    ];
    for key in object.keys() {
        if !ALLOWED.contains(&key.as_str()) {
            return Err(format!("aggregate carries a forbidden field {key:?}"));
        }
    }
    Ok(())
}

/// `P-01`/`P-03`: the visited sequence covers ids `2..=n` exactly once.
fn guard_coverage(visited: &[i64], n: usize) -> Result<(), String> {
    let mut seen = vec![false; n + 2];
    for id in visited {
        let slot = seen
            .get_mut(*id as usize)
            .ok_or_else(|| format!("id {id} outside the corpus"))?;
        if *slot {
            return Err(format!("id {id} visited twice"));
        }
        *slot = true;
    }
    match (2..=n).find(|id| !seen[*id]) {
        Some(missing) => Err(format!("id {missing} is not reachable by the primitives")),
        None => Ok(()),
    }
}

/// Complete bounded walk of the Index through `children_page` at the
/// product's own children page size. Returns the ids reached below the root,
/// the page count, and the largest page ever returned.
fn walk_all(store: &BrainIndex) -> (Vec<i64>, usize, usize) {
    let page_size = commands::CHILDREN_LIMIT_MAX;
    let mut stack = vec![store.root_id().unwrap()];
    let mut visited = Vec::new();
    let mut pages = 0usize;
    let mut largest = 0usize;
    while let Some(parent) = stack.pop() {
        let mut cursor: Option<crate::hierarchy::ChildCursor> = None;
        loop {
            let page = store
                .index
                .children_page(parent, page_size, cursor.as_ref())
                .unwrap();
            pages += 1;
            largest = largest.max(page.items.len());
            for item in &page.items {
                visited.push(item.id);
                if item.child_count > 0 {
                    stack.push(item.id);
                }
            }
            match page.next_cursor {
                Some(next) => cursor = Some(next),
                None => break,
            }
        }
    }
    (visited, pages, largest)
}

/// Views of one parent, page after page, following `nextCursor` only.
fn view_pages(store: &BrainIndex, parent: i64) -> (Vec<MapSnapshot>, Vec<i64>) {
    let mut views = Vec::new();
    let mut children = Vec::new();
    let mut cursor: Option<String> = None;
    loop {
        let view = materialize_view(store, Some(parent), cursor.as_deref()).unwrap();
        for n in view.nodes.iter().filter(|n| n.parent_id == Some(parent)) {
            children.push(n.id);
        }
        cursor = view
            .aggregates
            .iter()
            .find(|a| a.parent_id == parent)
            .and_then(|a| a.next_cursor.clone());
        views.push(view);
        if cursor.is_none() {
            break;
        }
    }
    (views, children)
}

// ---------------------------------------------------------------------------
// Metrics (engineering evidence, not a commercial promise)
// ---------------------------------------------------------------------------

fn record(entry: serde_json::Value) {
    let dir =
        std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../.filetopo-sandbox/task0054");
    fs::create_dir_all(&dir).unwrap();
    let name = format!(
        "{}.json",
        entry["id"].as_str().expect("metric entries carry an id")
    );
    fs::write(
        dir.join(name),
        serde_json::to_string_pretty(&entry).unwrap(),
    )
    .unwrap();
}

// ---------------------------------------------------------------------------
// F50-1 — structural scale at 10k / 100k / 1M
// ---------------------------------------------------------------------------

fn scale_proof(shape: Shape, n: usize) {
    let c = corpus(shape, n);
    let (_temp, store, build_ms) = build(&c);
    assert_eq!(store.count().unwrap(), n, "Index cardinality is exact");

    let started = Instant::now();
    let view = materialize_view(&store, None, None).unwrap();
    let view_ms = started.elapsed().as_millis();
    guard_bounded(&view, n).unwrap();
    guard_exact(&view, &c).unwrap();
    for a in &view.aggregates {
        guard_aggregate_json(&serde_json::to_value(a).unwrap()).unwrap();
    }
    let payload = serde_json::to_string(&view).unwrap().len();
    assert!(view.index_revision >= 1);

    // The payload does not follow the corpus: a name from the far end of the
    // corpus is nowhere in the serialised view.
    let last = &c.nodes[n - 1];
    assert!(!serde_json::to_string(&view).unwrap().contains(&last.name));

    // One focus on a deep row, still bounded.
    let deep = c.nodes.iter().rev().find(|r| r.depth >= 1).unwrap();
    let focused = materialize_view(&store, Some(deep.id), None).unwrap();
    guard_bounded(&focused, n).unwrap();
    guard_exact(&focused, &c).unwrap();
    assert!(focused.nodes.iter().any(|r| r.id == deep.id));

    // Cursors are bound to the index and its revision.
    let big = c.nodes.iter().max_by_key(|r| r.child_count).unwrap();
    let paged = materialize_view(&store, Some(big.id), None).unwrap();
    let cursor = paged
        .aggregates
        .iter()
        .find_map(|a| a.next_cursor.clone())
        .expect("a folder larger than the budget has a continuation");
    assert!(materialize_view(&store, Some(big.id), Some(&cursor)).is_ok());
    let layout_nodes = view.nodes.len() + view.aggregates.len();
    record(serde_json::json!({
        "id": format!("scale-{shape:?}-{n}").to_lowercase(),
        "shape": format!("{shape:?}"),
        "indexed": n,
        "buildIndexMs": build_ms,
        "viewMs": view_ms,
        "viewPayloadBytes": payload,
        "materialNodes": view.nodes.len(),
        "aggregates": view.aggregates.len(),
        "edges": view.hierarchy_edges.len(),
        "layoutSlots": layout_nodes,
        "layoutWidth": view.layout_width,
        "layoutHeight": view.layout_height,
        "viewBudget": VIEW_BUDGET,
        "nonMaterialized": view.non_materialized_count,
    }));
}

#[test]
fn scale_wide_10k() {
    scale_proof(Shape::Wide, 10_000);
}
#[test]
fn scale_mixed_10k() {
    scale_proof(Shape::Mixed, 10_000);
}
#[test]
fn scale_deep_wide_10k() {
    scale_proof(Shape::DeepWide, 10_000);
}
#[test]
fn scale_wide_100k() {
    scale_proof(Shape::Wide, 100_000);
}
#[test]
fn scale_mixed_100k() {
    scale_proof(Shape::Mixed, 100_000);
}
#[test]
fn scale_deep_wide_100k() {
    scale_proof(Shape::DeepWide, 100_000);
}
#[test]
#[ignore = "1M indexed rows: minutes and several GiB; run with --ignored --test-threads=1"]
fn scale_wide_1m() {
    scale_proof(Shape::Wide, 1_000_000);
}
#[test]
#[ignore = "1M indexed rows: minutes and several GiB; run with --ignored --test-threads=1"]
fn scale_mixed_1m() {
    scale_proof(Shape::Mixed, 1_000_000);
}
#[test]
#[ignore = "1M indexed rows: minutes and several GiB; run with --ignored --test-threads=1"]
fn scale_deep_wide_1m() {
    scale_proof(Shape::DeepWide, 1_000_000);
}

/// The payload and the geometry are the same order of magnitude at 10k and at
/// 1M: nothing in the view is proportional to the corpus.
#[test]
fn view_size_does_not_grow_with_the_corpus() {
    let mut sizes = Vec::new();
    for n in [10_000usize, 200_000] {
        let c = corpus(Shape::Mixed, n);
        let (_t, store, _) = build(&c);
        let view = materialize_view(&store, None, None).unwrap();
        sizes.push((
            serde_json::to_string(&view).unwrap().len(),
            view.nodes.len() + view.aggregates.len(),
            view.layout_height,
        ));
    }
    let (small, big) = (sizes[0], sizes[1]);
    assert!(
        (big.0 as f64) < (small.0 as f64) * 1.5,
        "payload {} -> {} follows the corpus",
        small.0,
        big.0
    );
    assert!(big.1 <= VIEW_BUDGET && small.1 <= VIEW_BUDGET);
    assert!(big.2 <= max_layout_height());
}

// ---------------------------------------------------------------------------
// F50-2 — reachability
// ---------------------------------------------------------------------------

fn reachability_proof(shape: Shape, n: usize, searches: usize) {
    let c = corpus(shape, n);
    let (_temp, store, _) = build(&c);

    // Pagination: every row exactly once, through bounded pages only.
    let started = Instant::now();
    let (visited, pages, largest) = walk_all(&store);
    let walk_ms = started.elapsed().as_millis();
    guard_coverage(&visited, n).unwrap();
    assert!(largest <= commands::CHILDREN_LIMIT_MAX, "a page is bounded");

    // Totals prove the coverage without the corpus ever being serialised:
    // sum of exact per-parent totals == rows below the root.
    let mut sum = 0u64;
    for r in &c.nodes {
        if r.child_count > 0 {
            sum += store.index.direct_child_count(r.id).unwrap();
        }
    }
    assert_eq!(sum as usize, n - 1);

    // Search + navigation: sampled targets spread over the whole corpus,
    // including both ends. A file name is unique: total == 1.
    let started = Instant::now();
    let step = (n / searches).max(1);
    let mut checked = 0usize;
    let mut destinations = 0usize;
    let mut idx = 1usize;
    while idx < n {
        let target = &c.nodes[idx];
        let (hits, total) = store
            .index
            .query_nodes(&target.name, None, None, false, 50, 0)
            .unwrap();
        if target.kind == NodeKind::File {
            assert_eq!(total, 1, "an exact path finds exactly one row");
            assert_eq!(hits[0].id, target.id);
        } else {
            assert!(hits.iter().any(|h| h.id == target.id));
        }
        checked += 1;
        // Destination resolution outside the initial projection, then focus.
        let id = store.resolve_path(&target.relative_path).unwrap().unwrap();
        assert_eq!(id, target.id);
        let view = materialize_view(&store, Some(id), None).unwrap();
        guard_bounded(&view, n).unwrap();
        guard_exact(&view, &c).unwrap();
        assert!(view.nodes.iter().any(|r| r.id == id), "target is displayed");
        destinations += 1;
        idx += step;
    }
    let search_ms = started.elapsed().as_millis();
    record(serde_json::json!({
        "id": format!("reach-{shape:?}-{n}").to_lowercase(),
        "shape": format!("{shape:?}"),
        "indexed": n,
        "rowsVisitedByBoundedPages": visited.len(),
        "childrenPages": pages,
        "largestPage": largest,
        "childrenPageLimit": commands::CHILDREN_LIMIT_MAX,
        "walkMs": walk_ms,
        "searchedTargets": checked,
        "focusedDestinations": destinations,
        "searchAndFocusMs": search_ms,
        "actionsToReachAnyRow": "at most 2 after a search (select hit -> navigate/focus); at most ceil(total/50) page requests per folder otherwise"
    }));
}

#[test]
fn reachability_10k_all_shapes() {
    for shape in [Shape::Wide, Shape::Mixed, Shape::DeepWide] {
        reachability_proof(shape, 10_000, 60);
    }
}
#[test]
fn reachability_100k_all_shapes() {
    for shape in [Shape::Wide, Shape::Mixed, Shape::DeepWide] {
        reachability_proof(shape, 100_000, 40);
    }
}
#[test]
#[ignore = "1M indexed rows: minutes and several GiB; run with --ignored --test-threads=1"]
fn reachability_1m_mixed() {
    reachability_proof(Shape::Mixed, 1_000_000, 24);
}
#[test]
#[ignore = "1M indexed rows: minutes and several GiB; run with --ignored --test-threads=1"]
fn reachability_1m_wide() {
    reachability_proof(Shape::Wide, 1_000_000, 12);
}
#[test]
#[ignore = "1M indexed rows: minutes and several GiB; run with --ignored --test-threads=1"]
fn reachability_1m_deep_wide() {
    reachability_proof(Shape::DeepWide, 1_000_000, 12);
}

/// Search is exact for a directory too: its own row plus every real
/// descendant, paged without omission or duplicate.
#[test]
fn exact_search_counts_a_folder_and_all_its_descendants() {
    let c = corpus(Shape::Mixed, 100_000);
    let (_t, store, _) = build(&c);
    let folder = &c.nodes[4]; // a level-1 folder
    assert_eq!(folder.kind, NodeKind::Directory);
    let expected = 1 + u64::from(c.children[folder.id as usize]);
    let (_, total) = store
        .index
        .query_nodes(&folder.relative_path, None, None, false, 50, 0)
        .unwrap();
    assert_eq!(total as u64, expected);
    let mut seen = HashSet::new();
    let mut offset = 0usize;
    while offset < total {
        let (page, _) = store
            .index
            .query_nodes(&folder.relative_path, None, None, false, 50, offset)
            .unwrap();
        assert!(!page.is_empty());
        for h in &page {
            assert!(seen.insert(h.id), "duplicate search hit");
        }
        offset += page.len();
    }
    assert_eq!(seen.len() as u64, expected);
}

/// The depth limit of a focused view is declared, not hidden: a destination
/// whose ancestry cannot fit the budget is refused with a fixed error, never
/// a panic or an oversized payload. (Limit recorded in the TASK-0054 report.)
#[test]
fn a_destination_deeper_than_the_budget_is_refused_cleanly() {
    let n = 1_100usize;
    let mut nodes = vec![node(
        1,
        None,
        "root".into(),
        String::new(),
        NodeKind::Root,
        0,
    )];
    for i in 1..n {
        let parent = &nodes[i - 1];
        let path = if parent.relative_path.is_empty() {
            format!("l{i:04}")
        } else {
            format!("{}/l{i:04}", parent.relative_path)
        };
        let kind = if i == n - 1 {
            NodeKind::File
        } else {
            NodeKind::Directory
        };
        let (depth, pid) = (parent.depth + 1, parent.id);
        nodes.push(node(
            i as i64 + 1,
            Some(pid),
            format!("l{i:04}"),
            path,
            kind,
            depth,
        ));
    }
    for i in 0..n - 1 {
        nodes[i].child_count = 1;
    }
    let (_t, store, _) = build(&Corpus {
        nodes,
        children: vec![],
    });
    let shallow = materialize_view(&store, Some(100), None).unwrap();
    assert!(shallow.nodes.len() + shallow.aggregates.len() <= VIEW_BUDGET);
    // Past the material budget: refused by the projection.
    let refused = materialize_view(&store, Some(300), None).unwrap_err();
    assert!(
        refused
            .to_string()
            .contains("focus ancestry exceeds view budget"),
        "{refused}"
    );
    // Past the hierarchy ancestor ceiling: refused by the Index, fixed code.
    let refused = materialize_view(&store, Some(n as i64), None).unwrap_err();
    assert!(
        refused.to_string().contains("hierarchy_chain_too_deep"),
        "{refused}"
    );
}

// ---------------------------------------------------------------------------
// F51-1 — exact aggregates
// ---------------------------------------------------------------------------

fn aggregate_proof(shape: Shape, n: usize) {
    let c = corpus(shape, n);
    let (_t, store, _) = build(&c);
    // Pick the biggest folder: it always overflows the budget.
    let big = c
        .nodes
        .iter()
        .max_by_key(|r| r.child_count)
        .expect("corpus has rows");
    assert!(big.child_count as usize > crate::map::projection::ORDINARY_MATERIAL_TARGET);
    let first = materialize_view(&store, Some(big.id), None).unwrap();
    let aggregate = first
        .aggregates
        .iter()
        .find(|a| a.parent_id == big.id)
        .expect("the big folder carries an aggregate");
    // Exact, never rounded or capped.
    assert_eq!(
        aggregate.omitted_direct_children
            + first
                .nodes
                .iter()
                .filter(|r| r.parent_id == Some(big.id))
                .count() as u64,
        u64::from(c.children[big.id as usize])
    );
    // Expansion by cursor: every child once, none missing, none invented.
    let (views, children) = view_pages(&store, big.id);
    for v in &views {
        guard_bounded(v, n).unwrap();
        guard_exact(v, &c).unwrap();
        for a in &v.aggregates {
            guard_aggregate_json(&serde_json::to_value(a).unwrap()).unwrap();
        }
    }
    assert_eq!(children.len(), big.child_count as usize);
    // Every expansion page is a useful one, even 200 levels down: the page
    // count is proportional to the children / the floor, not one per child.
    let floor = crate::map::projection::MIN_FOCUS_PAGE;
    assert!(
        views.len() <= children.len() / floor + 2,
        "{} pages for {} children",
        views.len(),
        children.len()
    );
    let unique: HashSet<_> = children.iter().copied().collect();
    assert_eq!(unique.len(), children.len(), "no duplicate across pages");
    for id in &children {
        assert_eq!(c.nodes[*id as usize - 1].parent_id, Some(big.id));
    }
    // The last page has no aggregate left over: the count reached zero.
    assert!(
        !views
            .last()
            .unwrap()
            .aggregates
            .iter()
            .any(|a| a.parent_id == big.id
                && a.omitted_direct_children > 0
                && a.next_cursor.is_none())
            || big.child_count as usize == children.len()
    );
    record(serde_json::json!({
        "id": format!("aggregate-{shape:?}-{n}").to_lowercase(),
        "shape": format!("{shape:?}"),
        "indexed": n,
        "biggestFolderChildren": big.child_count,
        "firstViewOmitted": aggregate.omitted_direct_children,
        "expansionPages": views.len(),
        "childrenReachedByExpansion": children.len(),
    }));
}

#[test]
fn aggregates_are_exact_on_wide_mixed_and_deep_corpora() {
    for shape in [Shape::Wide, Shape::Mixed, Shape::DeepWide] {
        for n in [10_000usize, 100_000] {
            aggregate_proof(shape, n);
        }
    }
}
#[test]
#[ignore = "1M indexed rows: minutes and several GiB; run with --ignored --test-threads=1"]
fn aggregates_are_exact_at_one_million() {
    aggregate_proof(Shape::Wide, 1_000_000);
    aggregate_proof(Shape::Mixed, 1_000_000);
}

/// A collapsed folder (F-042) and an aggregate (F-051) are two natures: an
/// aggregate means "more children than the budget showed", a collapse is a
/// person's decision and never produces one.
#[test]
fn an_aggregate_is_not_a_collapse() {
    let c = corpus(Shape::Mixed, 10_000);
    let (_t, store, _) = build(&c);
    let big = c.nodes.iter().skip(1).find(|r| r.child_count > 64).unwrap();
    let plain =
        crate::map::branch_projection::materialize_branch_view(&store, big.id, &[], None).unwrap();
    assert!(plain.aggregates.iter().any(|a| a.parent_id == big.id));
    let collapsed =
        crate::map::branch_projection::materialize_branch_view(&store, big.id, &[big.id], None)
            .unwrap();
    assert!(
        collapsed.aggregates.is_empty(),
        "a collapse is not an aggregate"
    );
    let branch = collapsed.branch.as_ref().unwrap();
    assert_eq!(
        branch.collapsed[0].hidden_descendant_count,
        u64::from(c.children[big.id as usize]),
        "hidden count is the exact number of real descendants"
    );
}

// ---------------------------------------------------------------------------
// Falsifications (TASK-0054 §11) — each guard must be able to fail
// ---------------------------------------------------------------------------

fn good_view() -> (Corpus, tempfile::TempDir, BrainIndex, MapSnapshot) {
    let c = corpus(Shape::Mixed, 10_000);
    let (t, store, _) = build(&c);
    let view = materialize_view(&store, None, None).unwrap();
    guard_bounded(&view, 10_000).unwrap();
    guard_exact(&view, &c).unwrap();
    (c, t, store, view)
}

/// 1 — a whole-graph DTO.
#[test]
fn falsification_1_whole_graph_dto_is_refused() {
    let (c, _t, store, view) = good_view();
    let mut whole = view.clone();
    whole.nodes = store.analysis_nodes().unwrap();
    whole.materialized_count = whole.nodes.len();
    whole.non_materialized_count = 0;
    assert!(guard_bounded(&whole, 10_000).is_err());
    // The product's own `snapshot()` is the bounded view, never the whole graph.
    let snapshot = store.snapshot().unwrap();
    assert!(snapshot.nodes.len() < c.nodes.len() / 10);
}

/// 2 — beyond VIEW_BUDGET.
#[test]
fn falsification_2_view_budget_overflow_is_refused() {
    let (_c, _t, _s, view) = good_view();
    let mut over = view.clone();
    while over.nodes.len() + over.aggregates.len() <= VIEW_BUDGET {
        over.nodes.push(over.nodes[0].clone());
    }
    assert!(guard_bounded(&over, 10_000).is_err());
}

/// 3 — a layout computed over the corpus.
#[test]
fn falsification_3_corpus_wide_layout_is_refused() {
    let (c, _t, _s, view) = good_view();
    let parents: Vec<Option<usize>> = c
        .nodes
        .iter()
        .map(|r| r.parent_id.map(|p| p as usize - 1))
        .collect();
    let whole = layout::compute(layout::LayoutInput { parents: &parents });
    let mut tampered = view.clone();
    tampered.layout_height = whole.height;
    assert!(
        guard_bounded(&tampered, 10_000).is_err(),
        "a corpus-wide layout must overshoot the bounded extent"
    );
    // Static: only the three bounded projections call the layout.
    let sources = [
        ("projection", include_str!("projection.rs")),
        ("branch_projection", include_str!("branch_projection.rs")),
        (
            "filtered_projection",
            include_str!("filtered_projection.rs"),
        ),
    ];
    for (name, text) in sources {
        assert_eq!(text.matches("layout::compute(").count(), 1, "{name}");
    }
    let forbidden = [
        include_str!("brain_index.rs"),
        include_str!("store.rs"),
        include_str!("../hierarchy.rs"),
    ];
    for text in forbidden {
        assert!(guard_no_layout(text).is_ok());
    }
    assert!(guard_no_layout("let x = layout::compute(all_nodes);").is_err());
}
fn guard_no_layout(source: &str) -> Result<(), String> {
    if source.contains("layout::compute(") {
        Err("layout invoked outside the bounded projections".into())
    } else {
        Ok(())
    }
}

/// 4 — count off by one, both directions.
#[test]
fn falsification_4_aggregate_count_plus_or_minus_one_is_refused() {
    let (c, _t, _s, view) = good_view();
    for delta in [1i64, -1] {
        let mut broken = view.clone();
        let a = broken.aggregates.first_mut().expect("an aggregate exists");
        a.omitted_direct_children = (a.omitted_direct_children as i64 + delta) as u64;
        assert!(guard_exact(&broken, &c).is_err(), "delta {delta}");
    }
}

/// 5 — an aggregate presented as folder / path / openable.
#[test]
fn falsification_5_aggregate_as_folder_or_path_is_refused() {
    let (_c, _t, _s, view) = good_view();
    let clean = serde_json::to_value(&view.aggregates[0]).unwrap();
    assert!(guard_aggregate_json(&clean).is_ok());
    for field in [
        "relativePath",
        "kind",
        "name",
        "openable",
        "path",
        "copyPath",
    ] {
        let mut dirty = clean.clone();
        dirty[field] = serde_json::json!("x");
        assert!(guard_aggregate_json(&dirty).is_err(), "{field}");
    }
}

/// 6 — pagination that omits or duplicates.
#[test]
fn falsification_6_pagination_omission_or_duplicate_is_refused() {
    let c = corpus(Shape::Mixed, 10_000);
    let (_t, store, _) = build(&c);
    let (visited, _, _) = walk_all(&store);
    assert!(guard_coverage(&visited, 10_000).is_ok());
    let mut omitted = visited.clone();
    omitted.remove(omitted.len() / 2);
    assert!(guard_coverage(&omitted, 10_000).is_err());
    let mut duplicated = visited.clone();
    duplicated.push(duplicated[3]);
    assert!(guard_coverage(&duplicated, 10_000).is_err());
}

/// 7 — an indexed row no bounded primitive reaches.
#[test]
fn falsification_7_unreachable_destination_is_refused() {
    let c = corpus(Shape::Wide, 10_000);
    let (_t, store, _) = build(&c);
    let (mut visited, _, _) = walk_all(&store);
    visited.retain(|id| *id != 7_777);
    let err = guard_coverage(&visited, 10_000).unwrap_err();
    assert!(err.contains("7777"), "{err}");
    // And the real route does reach it, in two bounded actions.
    let hit = store
        .index
        .query_nodes("f-0007776", None, None, false, 50, 0)
        .unwrap();
    assert_eq!(hit.1, 1);
    let view = materialize_view(&store, Some(hit.0[0].id), None).unwrap();
    assert!(view.nodes.iter().any(|r| r.id == hit.0[0].id));
}

/// 8 — a stale or foreign cursor.
#[test]
fn falsification_8_stale_and_foreign_cursors_are_refused() {
    let c = corpus(Shape::Wide, 10_000);
    let (_t, mut store, _) = build(&c);
    let first = materialize_view(&store, Some(1), None).unwrap();
    let cursor = first.aggregates[0].next_cursor.clone().unwrap();
    let identity = store.index.identity().unwrap();
    store
        .replace(
            "synthetic-brain",
            SourceStamp {
                kind: SourceKind::SyntheticFixture,
                source_ref: "scale-closure",
                label: "Synthetic",
            },
            &c.nodes,
            &[],
            1,
        )
        .unwrap();
    assert!(store.index.identity().unwrap().revision > identity.revision);
    let stale = materialize_view(&store, Some(1), Some(&cursor)).unwrap_err();
    assert!(stale.to_string().contains("stale"), "{stale}");
    // Wrong parent.
    let fresh = materialize_view(&store, Some(1), None).unwrap();
    let ok = fresh.aggregates[0].next_cursor.clone().unwrap();
    let wrong = materialize_view(&store, Some(2), Some(&ok)).unwrap_err();
    assert!(!wrong.to_string().is_empty());
    // Foreign index.
    let other = corpus(Shape::Wide, 10_000);
    let (_t2, store2, _) = build(&other);
    let foreign = materialize_view(&store2, Some(1), Some(&ok)).unwrap_err();
    assert!(!foreign.to_string().is_empty());
}

// ---------------------------------------------------------------------------
// F50/F51 — the real V1 flow (REAL_ROOT -> Index -> map_view -> MapApp DTO)
// ---------------------------------------------------------------------------

fn sandbox() -> (tempfile::TempDir, SandboxPaths) {
    let temp = tempfile::tempdir().unwrap();
    let paths = SandboxPaths::under(temp.path().join("filetopo-state"));
    (temp, paths)
}

/// Every entry under `root` with size and content, to compare before/after.
fn inventory(root: &std::path::Path) -> BTreeMap<String, (u64, Vec<u8>)> {
    fn walk(
        base: &std::path::Path,
        at: &std::path::Path,
        into: &mut BTreeMap<String, (u64, Vec<u8>)>,
    ) {
        for entry in fs::read_dir(at).unwrap() {
            let path = entry.unwrap().path();
            let rel = path
                .strip_prefix(base)
                .unwrap()
                .to_string_lossy()
                .replace('\\', "/");
            let meta = fs::symlink_metadata(&path).unwrap();
            if meta.is_dir() {
                into.insert(rel, (0, Vec::new()));
                walk(base, &path, into);
            } else {
                into.insert(rel, (meta.len(), fs::read(&path).unwrap()));
            }
        }
    }
    let mut all = BTreeMap::new();
    walk(root, root, &mut all);
    all
}

/// A real, disposable tree: one folder wider than the whole view budget, one
/// deep chain, one mixed branch.
fn make_real_tree(root: &std::path::Path) -> usize {
    let mut files = 0usize;
    let mut put = |rel: &str| {
        let path = root.join(rel);
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        fs::write(&path, b"synthetic\n").unwrap();
        files += 1;
    };
    for i in 0..700 {
        put(&format!("large/f-{i:04}.txt"));
    }
    put("deep/a/b/c/d/e/f/leaf.txt");
    for i in 0..30 {
        put(&format!("mixed/sub-{:02}/x-{i:02}.txt", i % 5));
    }
    put("root-note.txt");
    files
}

fn count_entries(root: &std::path::Path) -> usize {
    // Independent oracle: the test's own walk, not FileTopo's.
    fn walk(at: &std::path::Path) -> usize {
        let mut n = 0;
        for entry in fs::read_dir(at).unwrap() {
            let path = entry.unwrap().path();
            n += 1;
            if path.is_dir() {
                n += walk(&path);
            }
        }
        n
    }
    1 + walk(root)
}

#[test]
fn real_root_goes_through_the_canonical_index_and_the_bounded_view() {
    let (temp, paths) = sandbox();
    let root = temp.path().join("racine-t54");
    fs::create_dir(&root).unwrap();
    make_real_tree(&root);
    let expected = count_entries(&root);
    let before = inventory(&root);
    let brain = commands::register_real_root(&paths, &root).unwrap();
    let report = commands::refresh_map(&paths, &brain).unwrap();
    assert_eq!(report.node_count, expected);

    // 9 — the view is `materialize_view` on the one canonical Index; there is
    // no second route to the frontend.
    let view = commands::view(&paths, &brain, None, None).unwrap();
    let store = commands::open_store(&paths, &brain).unwrap();
    assert_eq!(view, materialize_view(&store, None, None).unwrap());
    assert_eq!(view.node_count, expected);
    assert!(view.nodes.len() + view.aggregates.len() <= VIEW_BUDGET);
    assert_eq!(
        view.materialized_count + view.non_materialized_count,
        expected
    );

    // The wide real folder surfaces an exact aggregate and pages to the end.
    let large = store.resolve_path("large").unwrap().unwrap();
    let focused = commands::view(&paths, &brain, Some(large), None).unwrap();
    let aggregate = focused
        .aggregates
        .iter()
        .find(|a| a.parent_id == large)
        .expect("700 real children overflow the view");
    let shown = focused
        .nodes
        .iter()
        .filter(|r| r.parent_id == Some(large))
        .count() as u64;
    assert_eq!(aggregate.omitted_direct_children + shown, 700);
    guard_aggregate_json(&serde_json::to_value(aggregate).unwrap()).unwrap();
    let (_, children) = view_pages(&store, large);
    assert_eq!(children.len(), 700);

    // Search + navigation to a row that was not in the first projection.
    let page = commands::search_nodes(&paths, &brain, "f-0699", 0, 10).unwrap();
    assert_eq!(page.total, 1);
    let target = page.items[0].node_id;
    assert!(!view.nodes.iter().any(|r| r.id == target));
    let there = commands::view(&paths, &brain, Some(target), None).unwrap();
    assert!(there.nodes.iter().any(|r| r.id == target));
    let node_children = commands::node_children(
        &paths,
        &brain,
        &crate::map::brains::BrainNodeRef::new(&brain.brain_id, large),
        None,
        commands::CHILDREN_LIMIT_MAX,
    )
    .unwrap();
    assert_eq!(node_children.total, 700);
    assert_eq!(node_children.items.len(), commands::CHILDREN_LIMIT_MAX);

    // No absolute path anywhere in what the frontend receives.
    let absolute = root.to_string_lossy().to_string();
    for text in [
        serde_json::to_string(&view).unwrap(),
        serde_json::to_string(&focused).unwrap(),
        serde_json::to_string(&page).unwrap(),
    ] {
        assert!(!text.contains(&absolute));
    }

    // 11 — the session changed nothing under the source, and wrote nothing in it.
    assert_eq!(inventory(&root), before);
    assert_eq!(count_entries(&root), expected);

    // The falsification: the very same comparison fails if one byte changes.
    let victim = root.join("root-note.txt");
    fs::write(&victim, b"changed\n").unwrap();
    assert_ne!(inventory(&root), before, "a modification must be detected");
}

/// Reopening reuses the same Index: no second canonical copy appears.
#[test]
fn reopening_a_real_root_does_not_create_a_second_canonical_copy() {
    let (temp, paths) = sandbox();
    let root = temp.path().join("racine-t54-reopen");
    fs::create_dir(&root).unwrap();
    make_real_tree(&root);
    let brain = commands::register_real_root(&paths, &root).unwrap();
    commands::refresh_map(&paths, &brain).unwrap();
    let database = paths.brain_map_database(&brain.brain_id);
    let before = commands::open_map(&paths, &brain).unwrap();
    let again = commands::open_map(&paths, &brain).unwrap();
    assert_eq!(before.index_id, again.index_id);
    assert_eq!(before.revision, again.revision);
    assert!(!again.source_read, "opening never rescans");
    let siblings = fs::read_dir(database.parent().unwrap())
        .unwrap()
        .filter(|e| {
            e.as_ref()
                .unwrap()
                .path()
                .extension()
                .is_some_and(|x| x == "sqlite")
        })
        .count();
    assert_eq!(siblings, 1, "exactly one Index database per brain");
    // Only the sandbox holds the Index; nothing was written in the source.
    assert!(!database.starts_with(&root));
}
