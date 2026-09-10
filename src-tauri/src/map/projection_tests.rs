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
