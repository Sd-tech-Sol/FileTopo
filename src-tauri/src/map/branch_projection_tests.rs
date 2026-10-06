//! `TASK-0052` — branch focus and collapse (`DEC-0050`, `F42-1` … `F42-9`, `F42-11`).
//!
//! Every tree below is synthetic. The reference counts come from a plain
//! in-memory walk of the same node list, **never** from the code under test
//! and never from `child_count`.

use super::*;
use crate::domain::{NodeDto, NodeKind};
use crate::map::{brain_index::SourceStamp, brains::SourceKind, projection::materialize_view};

struct Tree {
    nodes: Vec<NodeDto>,
}

impl Tree {
    fn new() -> Self {
        Self {
            nodes: vec![node(1, None, "root", "", NodeKind::Root, 0)],
        }
    }

    fn add(&mut self, parent: i64, name: &str, kind: NodeKind) -> i64 {
        let id = self.nodes.len() as i64 + 1;
        let parent_node = self.nodes.iter().find(|n| n.id == parent).unwrap();
        let path = if parent_node.relative_path.is_empty() {
            name.to_string()
        } else {
            format!("{}/{name}", parent_node.relative_path)
        };
        let depth = parent_node.depth + 1;
        self.nodes.push(node(id, Some(parent), name, &path, kind, depth));
        id
    }

    fn dir(&mut self, parent: i64, name: &str) -> i64 {
        self.add(parent, name, NodeKind::Directory)
    }

    fn file(&mut self, parent: i64, name: &str) -> i64 {
        self.add(parent, name, NodeKind::File)
    }

    fn finish(mut self) -> Vec<NodeDto> {
        let counts: HashMap<i64, u32> = self.nodes.iter().fold(HashMap::new(), |mut acc, n| {
            if let Some(p) = n.parent_id {
                *acc.entry(p).or_default() += 1;
            }
            acc
        });
        for n in &mut self.nodes {
            n.child_count = counts.get(&n.id).copied().unwrap_or(0);
        }
        self.nodes
    }
}

fn node(id: i64, parent: Option<i64>, name: &str, path: &str, kind: NodeKind, depth: u32) -> NodeDto {
    NodeDto {
        id,
        parent_id: parent,
        name: name.into(),
        relative_path: path.into(),
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

fn open_with(nodes: &[NodeDto]) -> (tempfile::TempDir, BrainIndex) {
    let temp = tempfile::tempdir().unwrap();
    let mut store = BrainIndex::open(&temp.path().join("index.sqlite")).unwrap();
    store
        .replace(
            "synthetic-brain",
            SourceStamp {
                kind: SourceKind::SyntheticFixture,
                source_ref: "branch-focus",
                label: "Synthetic",
            },
            nodes,
            &[],
            0,
        )
        .unwrap();
    (temp, store)
}

/// Independent reference: every strict descendant of `id` in the plain list.
fn reference_descendants(nodes: &[NodeDto], id: i64) -> HashSet<i64> {
    let mut out = HashSet::new();
    let mut frontier = vec![id];
    while let Some(parent) = frontier.pop() {
        for n in nodes.iter().filter(|n| n.parent_id == Some(parent)) {
            out.insert(n.id);
            frontier.push(n.id);
        }
    }
    out
}

struct Ids {
    a: i64,
    a1: i64,
    a1a: i64,
    b: i64,
    b1: i64,
    chain_top: i64,
    leaf: i64,
}

/// root ─ a ─ a1 ─ a1a ─ 3 files          (deep, with a `child_count` trap:
///      │   │                              `a` has 2 children, 8 descendants)
///      │   └ a1 also holds a file
///      │ └ a-note.txt
///      ├ b ─ b1 ─ 2 files
///      ├ chain ─ c1 ─ c2 ─ c3 ─ c4      (one child per level, 4 descendants)
///      └ top.txt
fn rich() -> (Vec<NodeDto>, Ids) {
    let mut t = Tree::new();
    let a = t.dir(1, "a");
    let a1 = t.dir(a, "a1");
    let a1a = t.dir(a1, "a1a");
    for name in ["x1.txt", "x2.txt", "x3.txt"] {
        t.file(a1a, name);
    }
    t.file(a1, "a1-note.txt");
    t.file(a, "a-note.txt");
    let b = t.dir(1, "b");
    let b1 = t.dir(b, "b1");
    t.file(b1, "y1.txt");
    t.file(b1, "y2.txt");
    let chain_top = t.dir(1, "chain");
    let c1 = t.dir(chain_top, "c1");
    let c2 = t.dir(c1, "c2");
    let c3 = t.dir(c2, "c3");
    let leaf = t.file(c3, "c4.txt");
    t.file(1, "top.txt");
    (
        t.finish(),
        Ids {
            a,
            a1,
            a1a,
            b,
            b1,
            chain_top,
            leaf,
        },
    )
}

fn id_set(view: &MapSnapshot) -> HashSet<i64> {
    view.nodes.iter().map(|n| n.id).collect()
}

fn branch(store: &BrainIndex, root: i64, collapsed: &[i64]) -> MapSnapshot {
    materialize_branch_view(store, root, collapsed, None).unwrap()
}

// ---------------------------------------------------------------- the count

#[test]
fn descendant_count_is_exact_against_an_independent_reference() {
    let (nodes, ids) = rich();
    let (_temp, store) = open_with(&nodes);
    for n in &nodes {
        assert_eq!(
            store.index.descendant_count(n.id).unwrap(),
            reference_descendants(&nodes, n.id).len() as u64,
            "node {} ({})",
            n.id,
            n.relative_path
        );
    }
    // Leaf, simple folder, deep tree.
    assert_eq!(store.index.descendant_count(ids.leaf).unwrap(), 0);
    assert_eq!(store.index.descendant_count(ids.b1).unwrap(), 2);
    assert_eq!(store.index.descendant_count(ids.a).unwrap(), 7);
    assert_eq!(store.index.descendant_count(ids.chain_top).unwrap(), 4);
}

/// The trap `child_count` would fall into: a folder with ONE child that holds a
/// deep chain.
#[test]
fn descendant_count_is_not_child_count() {
    let (nodes, ids) = rich();
    let (_temp, store) = open_with(&nodes);
    let chain = nodes.iter().find(|n| n.id == ids.chain_top).unwrap();
    assert_eq!(chain.child_count, 1);
    assert_eq!(store.index.descendant_count(ids.chain_top).unwrap(), 4);
    let view = branch(&store, 1, &[ids.chain_top]);
    let folder = view
        .branch
        .as_ref()
        .unwrap()
        .collapsed
        .iter()
        .find(|c| c.node_id == ids.chain_top)
        .unwrap();
    assert_eq!(folder.hidden_descendant_count, 4);
}

#[test]
fn descendant_count_on_a_wide_tree_and_an_unknown_node() {
    let mut t = Tree::new();
    let wide = t.dir(1, "wide");
    for i in 0..700 {
        t.file(wide, &format!("f-{i:04}.txt"));
    }
    let nodes = t.finish();
    let (_temp, store) = open_with(&nodes);
    assert_eq!(store.index.descendant_count(wide).unwrap(), 700);
    assert_eq!(store.index.descendant_count(1).unwrap(), 701);
    assert!(store.index.descendant_count(9_999).is_err(), "unknown node is refused");
}

#[test]
fn descendant_count_plan_is_index_driven_and_sorts_nothing() {
    let (nodes, _) = rich();
    let (_temp, store) = open_with(&nodes);
    let plan = crate::hierarchy::descendant_count_plan(store.index.connection_for_bench()).unwrap();
    eprintln!("descendant_count plan: {plan:#?}");
    let text = plan.join(" | ");
    assert!(text.contains("USING INDEX") || text.contains("USING COVERING INDEX"), "{text}");
    assert!(!text.contains("USE TEMP B-TREE"), "no sort: {text}");
    assert!(!text.contains("SCAN nodes") && !text.contains("SCAN child"), "no full scan: {text}");
}

// -------------------------------------------------------- branch projection

/// `F42-1`.
#[test]
fn a_branch_view_holds_the_focused_folder_and_its_subtree_only() {
    let (nodes, ids) = rich();
    let (_temp, store) = open_with(&nodes);
    let view = branch(&store, ids.a, &[]);
    let expected: HashSet<i64> = reference_descendants(&nodes, ids.a)
        .into_iter()
        .chain([ids.a])
        .collect();
    assert_eq!(id_set(&view), expected, "exactly the subtree, nothing more, nothing less");
    for outside in [1, ids.b, ids.b1, ids.chain_top] {
        assert!(!id_set(&view).contains(&outside), "{outside} is outside the subtree");
    }
    assert_eq!(view.focus_id, ids.a);
    assert_eq!(view.branch.as_ref().unwrap().root_node_id, ids.a);
    assert!(view.branch.as_ref().unwrap().collapsed.is_empty());
    // Every edge is a real edge inside the subtree, and the focused folder has none above it.
    for e in &view.hierarchy_edges {
        assert!(expected.contains(&e.parent_id) && expected.contains(&e.child_id));
    }
    assert!(view.hierarchy_edges.iter().all(|e| e.child_id != ids.a));
    assert_eq!(view.hierarchy_edges.len(), view.nodes.len() - 1);
    // The DTO carries nothing about a node outside the subtree.
    let json = serde_json::to_string(&view).unwrap();
    assert!(!json.contains("top.txt") && !json.contains("\"b1\"") && !json.contains("y1.txt"));
    assert_eq!(view.node_count, nodes.len(), "the whole-brain count is a number, not a list");
}

#[test]
fn only_branch_projections_carry_the_branch_field() {
    let (nodes, ids) = rich();
    let (_temp, store) = open_with(&nodes);
    let ordinary = serde_json::to_value(materialize_view(&store, None, None).unwrap()).unwrap();
    assert!(ordinary.get("branch").is_none(), "the ordinary DTO is unchanged");
    let focused = serde_json::to_value(branch(&store, ids.a, &[])).unwrap();
    assert_eq!(focused["branch"]["rootNodeId"], ids.a);
}

#[test]
fn a_file_or_an_unknown_node_cannot_be_focused() {
    let (nodes, ids) = rich();
    let (_temp, store) = open_with(&nodes);
    assert!(materialize_branch_view(&store, ids.leaf, &[], None).is_err());
    assert!(materialize_branch_view(&store, 9_999, &[], None).is_err());
}

/// `F42-4`, `F42-5`: the folder stays, every rendered descendant goes, the
/// count is the exact number of real descendants.
#[test]
fn collapsing_keeps_the_folder_and_removes_exactly_its_descendants() {
    let (nodes, ids) = rich();
    let (_temp, store) = open_with(&nodes);
    let reference = branch(&store, 1, &[]);
    let collapsed = branch(&store, 1, &[ids.a]);
    let hidden = reference_descendants(&nodes, ids.a);
    let mut expected = id_set(&reference);
    for id in &hidden {
        expected.remove(id);
    }
    assert_eq!(id_set(&collapsed), expected);
    assert!(id_set(&collapsed).contains(&ids.a), "the folder itself stays");
    let entry = &collapsed.branch.as_ref().unwrap().collapsed;
    assert_eq!(entry.len(), 1);
    assert_eq!(entry[0].node_id, ids.a);
    assert_eq!(entry[0].hidden_descendant_count, hidden.len() as u64);
    // Not a single node of another branch moved in or out.
    for id in reference_descendants(&nodes, ids.b).into_iter().chain([ids.b]) {
        assert_eq!(id_set(&collapsed).contains(&id), id_set(&reference).contains(&id));
    }
    // A collapsed folder is not an aggregate (`F42-9`).
    assert!(collapsed.aggregates.iter().all(|a| a.parent_id != ids.a));
}

/// A collapse deep inside the branch: the count covers every level below it.
#[test]
fn a_deep_collapse_counts_every_level() {
    let (nodes, ids) = rich();
    let (_temp, store) = open_with(&nodes);
    let view = branch(&store, ids.a, &[ids.a1]);
    let entry = &view.branch.as_ref().unwrap().collapsed[0];
    assert_eq!(entry.node_id, ids.a1);
    assert_eq!(entry.hidden_descendant_count, 5, "a1a, three files, a1-note");
    assert!(!id_set(&view).contains(&ids.a1a));
    assert!(id_set(&view).contains(&ids.a1));
}

/// `F42-6`: expanding returns exactly to the reference projection.
#[test]
fn expanding_restores_the_reference_projection_exactly() {
    let (nodes, ids) = rich();
    let (_temp, store) = open_with(&nodes);
    let reference = branch(&store, ids.a, &[]);
    let collapsed = branch(&store, ids.a, &[ids.a1]);
    assert_ne!(reference.nodes, collapsed.nodes);
    let expanded = branch(&store, ids.a, &[]);
    assert_eq!(expanded, reference, "same focus, budget and pagination ⇒ same projection");
}

/// `F42-7`: independent folders.
#[test]
fn two_collapses_are_independent() {
    let (nodes, ids) = rich();
    let (_temp, store) = open_with(&nodes);
    let both = branch(&store, 1, &[ids.a, ids.b]);
    let only_a = branch(&store, 1, &[ids.a]);
    let only_b = branch(&store, 1, &[ids.b]);
    let reference = branch(&store, 1, &[]);
    let removed = |view: &MapSnapshot| -> HashSet<i64> {
        id_set(&reference).difference(&id_set(view)).copied().collect()
    };
    assert_eq!(removed(&only_a), reference_descendants(&nodes, ids.a));
    assert_eq!(removed(&only_b), reference_descendants(&nodes, ids.b));
    assert_eq!(
        removed(&both),
        removed(&only_a).union(&removed(&only_b)).copied().collect::<HashSet<_>>()
    );
    let counts: Vec<(i64, u64)> = both
        .branch
        .as_ref()
        .unwrap()
        .collapsed
        .iter()
        .map(|c| (c.node_id, c.hidden_descendant_count))
        .collect();
    assert_eq!(
        counts,
        vec![
            (ids.a, reference_descendants(&nodes, ids.a).len() as u64),
            (ids.b, reference_descendants(&nodes, ids.b).len() as u64)
        ]
    );
}

#[test]
fn a_collapsed_id_outside_the_subtree_or_on_the_root_changes_nothing() {
    let (nodes, ids) = rich();
    let (_temp, store) = open_with(&nodes);
    let reference = branch(&store, ids.a, &[]);
    // `b` is outside the focused subtree; the root itself cannot be collapsed;
    // a file and an unknown id are not folders of this view.
    let noisy = branch(&store, ids.a, &[ids.b, ids.a, ids.leaf, 9_999]);
    assert_eq!(noisy, reference);
}

/// `F42-8`, `F42-9`: bounded, honest, and aggregates stay aggregates.
#[test]
fn a_wide_branch_stays_bounded_and_paginates_without_loss() {
    let mut t = Tree::new();
    let wide = t.dir(1, "wide");
    let sub = t.dir(wide, "sub");
    t.file(sub, "deep.txt");
    for i in 0..300 {
        t.file(wide, &format!("f-{i:04}.txt"));
    }
    let nodes = t.finish();
    let (_temp, store) = open_with(&nodes);
    let first = branch(&store, wide, &[]);
    assert!(first.nodes.len() <= ORDINARY_MATERIAL_TARGET);
    assert!(first.nodes.len() + first.aggregates.len() <= VIEW_BUDGET);
    assert_eq!(first.view_budget, 512);
    let aggregate = first.aggregates.iter().find(|a| a.parent_id == wide).unwrap();
    assert_eq!(
        aggregate.omitted_direct_children + first.nodes.iter().filter(|n| n.parent_id == Some(wide)).count() as u64,
        301,
        "no silent loss of a child"
    );
    // Following the cursor visits every direct child exactly once.
    let mut seen: HashSet<i64> = first.nodes.iter().filter(|n| n.parent_id == Some(wide)).map(|n| n.id).collect();
    let mut cursor = aggregate.next_cursor.clone();
    while let Some(token) = cursor {
        let page = materialize_branch_view(&store, wide, &[], Some(&token)).unwrap();
        for n in page.nodes.iter().filter(|n| n.parent_id == Some(wide)) {
            assert!(seen.insert(n.id), "duplicate child");
        }
        cursor = page
            .aggregates
            .iter()
            .find(|a| a.parent_id == wide)
            .and_then(|a| a.next_cursor.clone());
    }
    assert_eq!(seen.len(), 301);
    // Collapsing the wide folder leaves a folder and a count, no aggregate.
    let collapsed = branch(&store, 1, &[wide]);
    assert!(collapsed.aggregates.iter().all(|a| a.parent_id != wide));
    assert_eq!(collapsed.branch.as_ref().unwrap().collapsed[0].hidden_descendant_count, 302);
}

#[test]
fn the_branch_projection_is_deterministic_and_read_only() {
    let (nodes, ids) = rich();
    let (_temp, store) = open_with(&nodes);
    let digest = store.reconstructible_digest().unwrap();
    let revision = store.index.identity().unwrap().revision;
    let first = branch(&store, ids.a, &[ids.a1]);
    for _ in 0..3 {
        assert_eq!(branch(&store, ids.a, &[ids.a1]), first);
    }
    assert_eq!(store.reconstructible_digest().unwrap(), digest, "the Index is untouched");
    assert_eq!(store.index.identity().unwrap().revision, revision);
}

/// The cost is proportional to the subtree and it is paid only for a folder the
/// person collapsed: a hundred thousand descendants are counted in well under a
/// second even on a debug build, and the answer stays exact. The timing is
/// printed for the validation record; the assertion is a generous ceiling.
#[test]
fn counting_a_hundred_thousand_descendants_is_exact_and_fast() {
    let mut nodes = vec![node(1, None, "root", "", NodeKind::Root, 0)];
    for dir in 0..10 {
        let dir_id = nodes.len() as i64 + 1;
        nodes.push(node(dir_id, Some(1), &format!("d{dir:02}"), &format!("d{dir:02}"), NodeKind::Directory, 1));
        for file in 0..10_000 {
            let id = nodes.len() as i64 + 1;
            nodes.push(node(
                id,
                Some(dir_id),
                &format!("f{file:05}.txt"),
                &format!("d{dir:02}/f{file:05}.txt"),
                NodeKind::File,
                2,
            ));
        }
    }
    let counts: HashMap<i64, u32> = nodes.iter().fold(HashMap::new(), |mut acc, n| {
        if let Some(p) = n.parent_id {
            *acc.entry(p).or_default() += 1;
        }
        acc
    });
    for n in &mut nodes {
        n.child_count = counts.get(&n.id).copied().unwrap_or(0);
    }
    let (_temp, store) = open_with(&nodes);
    let started = std::time::Instant::now();
    let whole = store.index.descendant_count(1).unwrap();
    let whole_ms = started.elapsed().as_millis();
    let started = std::time::Instant::now();
    let one = store.index.descendant_count(2).unwrap();
    let one_ms = started.elapsed().as_millis();
    eprintln!("descendant_count: 100011-node tree {whole_ms} ms, 10000-descendant folder {one_ms} ms");
    assert_eq!(whole, 100_010);
    assert_eq!(one, 10_000);
    assert!(whole_ms < 3_000, "counted in {whole_ms} ms");
    // The collapsed view sends a count and a few cards, never the descendants.
    let view = branch(&store, 1, &[2]);
    let payload = serde_json::to_string(&view).unwrap();
    assert!(payload.len() < 150_000, "payload {} bytes", payload.len());
    assert!(!payload.contains("f09999.txt"));
}
