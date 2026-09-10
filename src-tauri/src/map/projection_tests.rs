use super::*;
use crate::domain::{NodeDto, NodeKind};
use crate::map::{
    brain_index::SourceStamp,
    brains::{BrainNodeRef, BrainRecord, SourceKind},
    commands, content_signals, relation_commands,
    sandbox::SandboxPaths,
};

fn flat(count: usize) -> Vec<NodeDto> {
    (0..count)
        .map(|i| NodeDto {
            id: i as i64 + 1,
            parent_id: if i == 0 { None } else { Some(1) },
            name: format!("synthetic-{i:06}"),
            relative_path: if i == 0 {
                String::new()
            } else {
                format!("synthetic-{i:06}")
            },
            kind: if i == 0 {
                NodeKind::Root
            } else {
                NodeKind::File
            },
            depth: if i == 0 { 0 } else { 1 },
            size_bytes: 0,
            modified_unix_ms: None,
            online_only: false,
            reparse_point: false,
            child_count: if i == 0 { (count - 1) as u32 } else { 0 },
            seen: false,
        })
        .collect()
}
/// A root with `dirs` directory children followed by `files` file children —
/// `child_order_rank` (`hierarchy.rs`) sorts directories first regardless of
/// this insertion order, so the corpus below deliberately mixes them to prove
/// the projection never depends on how the scanner happened to emit rows.
fn root_with_mixed_children(dirs: usize, files: usize) -> Vec<NodeDto> {
    let total = dirs + files;
    let mut nodes = vec![NodeDto {
        id: 1,
        parent_id: None,
        name: "root".into(),
        relative_path: String::new(),
        kind: NodeKind::Root,
        depth: 0,
        size_bytes: 0,
        modified_unix_ms: None,
        online_only: false,
        reparse_point: false,
        child_count: total as u32,
        seen: false,
    }];
    for i in 0..files {
        nodes.push(NodeDto {
            id: i as i64 + 2,
            parent_id: Some(1),
            name: format!("file-{i:06}"),
            relative_path: format!("file-{i:06}"),
            kind: NodeKind::File,
            depth: 1,
            size_bytes: 0,
            modified_unix_ms: None,
            online_only: false,
            reparse_point: false,
            child_count: 0,
            seen: false,
        });
    }
    for i in 0..dirs {
        nodes.push(NodeDto {
            id: (files + i) as i64 + 2,
            parent_id: Some(1),
            name: format!("dir-{i:06}"),
            relative_path: format!("dir-{i:06}"),
            kind: NodeKind::Directory,
            depth: 1,
            size_bytes: 0,
            modified_unix_ms: None,
            online_only: false,
            reparse_point: false,
            child_count: 0,
            seen: false,
        });
    }
    nodes
}

/// A single-child chain `depth` levels deep, every node a directory except the
/// deepest, which is a file — so an explicit focus on it exercises `DEC-0034`
/// B's "focus/ancestry always take priority" clause together with §7's
/// "explicitly targeted file" clause in the same fixture.
fn directory_chain(depth: usize) -> Vec<NodeDto> {
    (0..=depth)
        .map(|i| NodeDto {
            id: i as i64 + 1,
            parent_id: if i == 0 { None } else { Some(i as i64) },
            name: format!("level-{i:04}"),
            relative_path: if i == 0 {
                String::new()
            } else {
                format!("level-{i:04}")
            },
            kind: if i == 0 {
                NodeKind::Root
            } else if i == depth {
                NodeKind::File
            } else {
                NodeKind::Directory
            },
            depth: i as u32,
            size_bytes: 0,
            modified_unix_ms: None,
            online_only: false,
            reparse_point: false,
            child_count: if i == depth { 0 } else { 1 },
            seen: false,
        })
        .collect()
}

fn open_with(nodes: &[NodeDto]) -> (tempfile::TempDir, BrainIndex) {
    let temp = tempfile::tempdir().unwrap();
    let mut store = BrainIndex::open(&temp.path().join("index.sqlite")).unwrap();
    store
        .replace(
            "synthetic-brain",
            SourceStamp {
                kind: SourceKind::SyntheticFixture,
                source_ref: "scale-runtime",
                label: "Synthetic",
            },
            nodes,
            &[],
            0,
        )
        .unwrap();
    (temp, store)
}

fn check_view(store: &BrainIndex, view: &MapSnapshot) {
    assert!(view.nodes.len() + view.aggregates.len() <= VIEW_BUDGET);
    assert_eq!(
        view.materialized_count + view.non_materialized_count,
        view.node_count
    );
    assert!(view.hierarchy_edges.len() <= view.nodes.len().saturating_sub(1));
    let ids = view.nodes.iter().map(|n| n.id).collect::<HashSet<_>>();
    assert_eq!(ids.len(), view.nodes.len());
    for n in &view.nodes {
        assert_eq!(
            store.index.node(n.id).unwrap().unwrap().relative_path,
            n.relative_path
        );
        assert_eq!(n.rect.w, layout::CARD_WIDTH);
        assert!(n.rect.x.is_finite() && n.rect.y.is_finite());
    }
    for e in &view.hierarchy_edges {
        assert!(ids.contains(&e.parent_id) && ids.contains(&e.child_id));
        assert_eq!(
            store.index.node(e.child_id).unwrap().unwrap().parent_id,
            Some(e.parent_id)
        );
    }
    for a in &view.aggregates {
        let visible = view
            .nodes
            .iter()
            .filter(|n| n.parent_id == Some(a.parent_id))
            .count() as u64;
        assert_eq!(
            a.omitted_direct_children + visible,
            store.index.direct_child_count(a.parent_id).unwrap()
        );
        let json = serde_json::to_value(a).unwrap();
        assert!(json.get("relativePath").is_none() && json.get("kind").is_none());
    }
}
#[test]
fn hundred_thousand_uses_product_projection_and_visits_every_child_once() {
    let temp = tempfile::tempdir().unwrap();
    let mut store = BrainIndex::open(&temp.path().join("index.sqlite")).unwrap();
    let corpus = flat(100_000);
    store
        .replace(
            "synthetic-brain",
            SourceStamp {
                kind: SourceKind::SyntheticFixture,
                source_ref: "scale-runtime",
                label: "Synthetic",
            },
            &corpus,
            &[],
            0,
        )
        .unwrap();
    let initial = materialize_view(&store, None, None).unwrap();
    check_view(&store, &initial);
    assert_eq!(initial.node_count, 100_000);
    assert_eq!(
        initial.aggregates[0].omitted_direct_children,
        initial.non_materialized_count as u64
    );
    let payload = serde_json::to_string(&initial).unwrap();
    assert!(payload.len() < 150_000);
    let artifact = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../.filetopo-sandbox/task0030-product-view.json");
    std::fs::create_dir_all(artifact.parent().unwrap()).unwrap();
    std::fs::write(artifact, &payload).unwrap();
    assert!(!payload.contains("synthetic-099999"));
    assert_eq!(materialize_view(&store, None, None).unwrap(), initial);
    let mut cursor = None;
    let mut visited = HashSet::new();
    loop {
        let page = materialize_view(&store, Some(1), cursor.as_deref()).unwrap();
        check_view(&store, &page);
        for n in page.nodes.iter().filter(|n| n.id != 1) {
            assert!(visited.insert(n.id), "duplicate child");
        }
        cursor = page
            .aggregates
            .iter()
            .find(|a| a.parent_id == 1)
            .and_then(|a| a.next_cursor.clone());
        if cursor.is_none() {
            break;
        }
    }
    assert_eq!(visited.len(), 99_999);
    assert!((2..=100_000).all(|id| visited.contains(&id)));
    let stale = initial.aggregates[0].next_cursor.as_deref().unwrap();
    let identity = store.index.identity().unwrap();
    store
        .replace(
            "synthetic-brain",
            SourceStamp {
                kind: SourceKind::SyntheticFixture,
                source_ref: "scale-runtime",
                label: "Synthetic",
            },
            &corpus,
            &[],
            1,
        )
        .unwrap();
    assert_eq!(store.index.identity().unwrap().index_id, identity.index_id);
    assert!(store.index.identity().unwrap().revision > identity.revision);
    assert!(
        materialize_view(&store, Some(1), Some(stale))
            .unwrap_err()
            .to_string()
            .contains("stale")
    );
}
#[test]
fn two_brains_and_focus_are_independent() {
    let temp = tempfile::tempdir().unwrap();
    let mut a = BrainIndex::open(&temp.path().join("a.sqlite")).unwrap();
    let mut b = BrainIndex::open(&temp.path().join("b.sqlite")).unwrap();
    a.replace(
        "a",
        SourceStamp {
            kind: SourceKind::SyntheticFixture,
            source_ref: "scale-runtime",
            label: "a",
        },
        &flat(900),
        &[],
        0,
    )
    .unwrap();
    b.replace(
        "b",
        SourceStamp {
            kind: SourceKind::SyntheticFixture,
            source_ref: "scale-runtime",
            label: "b",
        },
        &flat(900),
        &[],
        0,
    )
    .unwrap();
    let av = a.snapshot().unwrap();
    assert_ne!(
        a.index.identity().unwrap().index_id,
        b.index.identity().unwrap().index_id
    );
    assert!(materialize_view(&b, Some(1), av.aggregates[0].next_cursor.as_deref()).is_err());
    let focused = materialize_view(&a, Some(899), None).unwrap();
    check_view(&a, &focused);
    assert!(focused.nodes.iter().any(|n| n.id == 899));
    assert_eq!(focused.nodes.len(), 2);
    assert_eq!(focused.aggregates[0].omitted_direct_children, 898);
    assert_eq!(b.snapshot().unwrap().brain_id, "b");
    let tables = a
        .index
        .connection
        .prepare("SELECT name FROM sqlite_master WHERE type='table'")
        .unwrap()
        .query_map([], |r| r.get::<_, String>(0))
        .unwrap()
        .collect::<Result<Vec<_>, _>>()
        .unwrap();
    assert!(tables.iter().any(|t| t == "nodes"));
    assert!(!tables.iter().any(|t| t == "map_nodes"));
}
#[test]
fn real_synthetic_build_above_five_thousand_is_read_only_and_has_no_layout() {
    let temp = tempfile::tempdir().unwrap();
    let paths = SandboxPaths::under(temp.path().join("sandbox"));
    let mut brain = BrainRecord::frozen_by_id("brain-alpha").unwrap();
    brain.source_ref = "scale-runtime".into();
    let built = commands::build_map(&paths, &brain, false).unwrap();
    assert_eq!(built.node_count, 6_001);
    assert_eq!(built.layout_invocations, 0);
    assert_eq!(built.layout_ms, 0.0);
    assert!(built.read_only_confirmed);
    let first = commands::snapshot(&paths, &brain).unwrap();
    let cursor = first.aggregates[0].next_cursor.as_deref();
    let next = commands::view(&paths, &brain, Some(first.root_id), cursor).unwrap();
    assert!(
        first
            .nodes
            .iter()
            .skip(1)
            .all(|n| !next.nodes.iter().any(|m| m.id == n.id))
    );
    let detail = commands::detail(
        &paths,
        &brain,
        &BrainNodeRef::new(&brain.brain_id, first.root_id),
    )
    .unwrap();
    assert_eq!(
        detail.children.len() as u64 + detail.omitted_children,
        6_000
    );
    // Off-view endpoints resolve against the corpus, not the default projection.
    relation_commands::open_relations(&paths, &brain).unwrap();
    relation_commands::node_relations(&paths, &brain, &BrainNodeRef::new(&brain.brain_id, 6_000))
        .unwrap();
    let observation = content_signals::observe_content(&paths, &brain).unwrap();
    assert_eq!(observation.indexed_file_count, 6_000);
    let before = commands::integrity(&paths, &brain).unwrap();
    assert_eq!(Some(before.fingerprint), built.fingerprint_before);
    assert!(before.filetopo_artifacts.is_empty());
    let rebuilt = commands::build_map(&paths, &brain, true).unwrap();
    assert_eq!(rebuilt.fingerprint_after, built.fingerprint_before);
    assert!(commands::view(&paths, &brain, Some(first.root_id), cursor).is_err());
}
#[test]
fn runtime_source_guard_excludes_full_snapshot_and_global_layout() {
    // Read as LF: on a CRLF checkout the split below matches nothing, silently
    // hands the whole file back and turns this guard into an assertion about
    // the test module it is supposed to exclude.
    let projection_source = include_str!("projection.rs").replace('\r', "");
    let projection = projection_source.split("#[cfg(test)]").next().unwrap();
    assert!(!projection.contains("analysis_nodes("));
    assert!(!projection.contains("all_nodes("));
    assert!(!projection.contains("list_nodes("));
    let commands_source = include_str!("commands.rs").replace('\r', "");
    let commands = commands_source
        .split("\n#[cfg(test)]\nmod tests")
        .next()
        .unwrap();
    // `fixture_summaries` is the last runtime item before the test module, so
    // the sentinel sits at the very end of the region this guard inspects
    // rather than a few lines into it.
    assert!(
        commands.contains("pub fn fixture_summaries("),
        "guard must inspect the whole runtime region"
    );
    // `TASK-0031`: three named lifecycle intents, and no boolean left anywhere
    // in the host that could hide a scan behind an opening.
    for entry in [
        "pub fn open_map(",
        "pub fn refresh_map(",
        "pub fn rebuild_map(",
    ] {
        assert!(commands.contains(entry), "missing lifecycle entry: {entry}");
    }
    let host = include_str!("../lib.rs").replace('\r', "");
    for command in [
        "async fn map_open(",
        "async fn map_refresh(",
        "async fn map_rebuild(",
    ] {
        assert!(
            host.contains(command),
            "missing lifecycle command: {command}"
        );
    }
    assert!(!host.contains("rebuild: bool"));
    assert!(!commands.contains("MapStore"));
    assert!(!commands.contains("all_nodes("));
    assert!(!commands.contains("layout::compute("));
    let dto = include_str!("store.rs");
    assert!(!dto.contains("Connection"));
    let frontend = include_str!("../../../src/map/MapApp.tsx");
    assert!(frontend.contains("invoke<MapProjection>(\"map_view\""));
    assert!(!frontend.contains("invoke<MapSnapshot>"));
}

#[test]
fn real_relations_remain_resolved_when_endpoints_leave_the_projection() {
    let temp = tempfile::tempdir().unwrap();
    let paths = SandboxPaths::under(temp.path().join("sandbox"));
    let brain = BrainRecord::frozen_by_id("brain-alpha").unwrap();
    commands::build_map(&paths, &brain, false).unwrap();
    let overview = relation_commands::open_relations(&paths, &brain).unwrap();
    let mut proved = false;
    for edge in &overview.established {
        if let (Some(source), Some(target)) = (edge.source.node_id, edge.target.node_id) {
            let view = commands::view(&paths, &brain, Some(source), None).unwrap();
            if !view.nodes.iter().any(|n| n.id == target) {
                let relations = relation_commands::node_relations(
                    &paths,
                    &brain,
                    &BrainNodeRef::new(&brain.brain_id, source),
                )
                .unwrap();
                assert!(
                    relations
                        .outgoing
                        .iter()
                        .any(|entry| entry.other.node_id == Some(target))
                );
                proved = true;
                break;
            }
        }
    }
    assert!(
        proved,
        "a real relation must be checked across the projection boundary"
    );
}

/// A root with three direct children of very different sizes: `big` (many
/// children), `mid` (a few), and one plain file — built to prove the
/// ordinary view stops at direct children regardless of how large or small
/// a branch is, rather than greedily unfolding whichever one sorts first.
fn root_with_uneven_branches(big_children: usize, mid_children: usize) -> Vec<NodeDto> {
    let total_children = 3;
    let mut nodes = vec![NodeDto {
        id: 1,
        parent_id: None,
        name: "root".into(),
        relative_path: String::new(),
        kind: NodeKind::Root,
        depth: 0,
        size_bytes: 0,
        modified_unix_ms: None,
        online_only: false,
        reparse_point: false,
        child_count: total_children,
        seen: false,
    }];
    nodes.push(NodeDto {
        id: 2,
        parent_id: Some(1),
        name: "big".into(),
        relative_path: "big".into(),
        kind: NodeKind::Directory,
        depth: 1,
        size_bytes: 0,
        modified_unix_ms: None,
        online_only: false,
        reparse_point: false,
        child_count: big_children as u32,
        seen: false,
    });
    nodes.push(NodeDto {
        id: 3,
        parent_id: Some(1),
        name: "mid".into(),
        relative_path: "mid".into(),
        kind: NodeKind::Directory,
        depth: 1,
        size_bytes: 0,
        modified_unix_ms: None,
        online_only: false,
        reparse_point: false,
        child_count: mid_children as u32,
        seen: false,
    });
    nodes.push(NodeDto {
        id: 4,
        parent_id: Some(1),
        name: "leaf.txt".into(),
        relative_path: "leaf.txt".into(),
        kind: NodeKind::File,
        depth: 1,
        size_bytes: 0,
        modified_unix_ms: None,
        online_only: false,
        reparse_point: false,
        child_count: 0,
        seen: false,
    });
    let mut next_id = 5;
    for i in 0..big_children {
        nodes.push(NodeDto {
            id: next_id,
            parent_id: Some(2),
            name: format!("big-{i:04}.txt"),
            relative_path: format!("big/big-{i:04}.txt"),
            kind: NodeKind::File,
            depth: 2,
            size_bytes: 0,
            modified_unix_ms: None,
            online_only: false,
            reparse_point: false,
            child_count: 0,
            seen: false,
        });
        next_id += 1;
    }
    for i in 0..mid_children {
        nodes.push(NodeDto {
            id: next_id,
            parent_id: Some(3),
            name: format!("mid-{i:04}.txt"),
            relative_path: format!("mid/mid-{i:04}.txt"),
            kind: NodeKind::File,
            depth: 2,
            size_bytes: 0,
            modified_unix_ms: None,
            online_only: false,
            reparse_point: false,
            child_count: 0,
            seen: false,
        });
        next_id += 1;
    }
    nodes
}

/// `TASK-0033` product acceptance (`ACTION-0050`'s live WebView2 replay) —
/// the ordinary view used to keep walking into whichever direct child sorted
/// first, paginating *its* children too; on a tree where that child had a
/// large subtree, this consumed nearly the whole 64-block target on one
/// arbitrary branch, crowding out its true siblings from the root's own
/// listing. `materialize_view` now stops at the focus's own direct children,
/// whatever their size, and descending is only ever an explicit navigation.
#[test]
fn ordinary_view_never_pulls_in_grandchildren_even_from_a_small_branch() {
    let (_temp, store) = open_with(&root_with_uneven_branches(100, 5));
    let view = materialize_view(&store, None, None).unwrap();
    check_view(&store, &view);
    // Root plus exactly its three direct children — nothing from inside
    // `big` or `mid`, regardless of `big` having vastly more descendants.
    assert_eq!(view.materialized_count, 4);
    assert!(
        view.nodes
            .iter()
            .all(|n| n.parent_id != Some(2) && n.parent_id != Some(3)),
        "no grandchild of root should ever appear in its ordinary view"
    );
    let big_agg = view.aggregates.iter().find(|a| a.parent_id == 2).unwrap();
    assert_eq!(big_agg.omitted_direct_children, 100);
    let mid_agg = view.aggregates.iter().find(|a| a.parent_id == 3).unwrap();
    assert_eq!(mid_agg.omitted_direct_children, 5);
    // Explicitly entering `big` — a real navigation, not a side effect of
    // viewing its parent — does reveal its own children.
    let inside_big = materialize_view(&store, Some(2), None).unwrap();
    check_view(&store, &inside_big);
    assert!(inside_big.nodes.iter().any(|n| n.parent_id == Some(2)));
}

/// `TASK-0033` §7 (Rust proof 2) — `DEC-0034` B's ordinary target, not the
/// `VIEW_BUDGET`/`MATERIAL_BUDGET` technical ceilings, which `check_view`
/// already covers on every call.
#[test]
fn ordinary_view_targets_at_most_sixty_four_real_blocks() {
    let (_temp, store) = open_with(&root_with_mixed_children(200, 200));
    let view = materialize_view(&store, None, None).unwrap();
    check_view(&store, &view);
    assert!(view.materialized_count <= 64, "{}", view.materialized_count);
    // The corpus has far more than 64 children, so the target is actually the
    // reason the projection stopped, not an accident of a thin tree.
    assert_eq!(view.materialized_count, 64);
    assert!(view.non_materialized_count > 0);
}

/// `TASK-0033` §7 (Rust proof 4) — `idx_nodes_child_order` already orders
/// every page directory-first (`hierarchy.rs`); this proves that ordering
/// survives all the way through `materialize_view`'s greedy fill: every
/// directory is retained before a single file crowds one out.
#[test]
fn directories_are_retained_over_files_when_the_ordinary_target_cuts_the_page() {
    let (_temp, store) = open_with(&root_with_mixed_children(50, 100));
    let view = materialize_view(&store, None, None).unwrap();
    check_view(&store, &view);
    let directories = view
        .nodes
        .iter()
        .filter(|n| n.kind == NodeKind::Directory)
        .count();
    let files = view
        .nodes
        .iter()
        .filter(|n| n.kind == NodeKind::File)
        .count();
    // All 50 directories fit before a single one of the 100 files is admitted;
    // the remaining slots (root + 50 dirs leaves 13 of the 64) go to files.
    assert_eq!(directories, 50);
    assert_eq!(files, 13);
    assert_eq!(view.materialized_count, 1 + directories + files);
    let root_aggregate = view.aggregates.iter().find(|a| a.parent_id == 1).unwrap();
    assert_eq!(root_aggregate.omitted_direct_children, 150 - 63);
}

/// `TASK-0033` §7 (Rust proofs 3 and 7) — ancestry/focus stay prioritised even
/// past the 64-block ordinary target, and an explicitly targeted file is
/// materialized with a small, bounded context rather than pulled corpus-wide.
#[test]
fn deep_ancestry_is_never_dropped_and_a_targeted_file_stays_bounded() {
    let (_temp, store) = open_with(&directory_chain(100));
    let file_id = 101; // the deepest node, a `File`, per `directory_chain`.
    let view = materialize_view(&store, Some(file_id), None).unwrap();
    check_view(&store, &view);
    // Every one of the 100 ancestor directories plus the file itself — 101
    // nodes — is present, well past the 64-block ordinary target, because
    // ancestry is never trimmed to fit it.
    assert_eq!(view.materialized_count, 101);
    assert!(view.nodes.iter().any(|n| n.id == file_id));
    for ancestor in 1..=100 {
        assert!(
            view.nodes.iter().any(|n| n.id == ancestor),
            "ancestor {ancestor} missing from a focus meant to keep its whole chain"
        );
    }
    // "Bounded context": the file has no children of its own, so nothing is
    // pulled in beyond the ancestry chain that already explains where it is.
    assert!(view.aggregates.is_empty());
    assert!(view.non_materialized_count == 0);
}
