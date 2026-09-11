//! `TASK-0035`: exact, paginated direct children (`map_node_children`) and
//! "Copier le chemin" (`copy_target_path`), on the real `Index` and real
//! `BrainIndex` files.
//!
//! Children pagination is seeded directly through `BrainIndex::replace`,
//! exactly as `find_open_tests.rs` does for search: it never needs a real
//! filesystem entry, since paging reads only the Index. Copy needs a real
//! confined target on disk — same synthetic-fixture root convention
//! `find_open_tests.rs` uses for reveal's real-filesystem cases, never a
//! personal folder.

use super as commands;
use super::*;
use crate::domain::{NodeDto, NodeKind};
use crate::hierarchy::ChildCursor;
use crate::map::brain_index::SourceStamp;
use crate::map::brains::SourceKind as BrainSourceKind;
use crate::map::source::BrainSource;
use std::collections::HashSet;

fn sandbox() -> (tempfile::TempDir, SandboxPaths) {
    let temp = tempfile::tempdir().unwrap();
    let paths = SandboxPaths::under(temp.path().join("sandbox"));
    (temp, paths)
}

fn test_brain(id: &str) -> BrainRecord {
    BrainRecord {
        brain_id: id.to_string(),
        display_name: format!("Cerveau {id}"),
        color: "#333333".to_string(),
        icon: "*".to_string(),
        source_kind: BrainSourceKind::SyntheticFixture,
        source_ref: "quasi-empty".to_string(),
        source_label: "quasi-empty".to_string(),
        position: 1,
    }
}

fn seed(paths: &SandboxPaths, brain: &BrainRecord, nodes: &[NodeDto]) {
    let mut store = BrainIndex::open(&paths.brain_map_database(&brain.brain_id)).unwrap();
    store
        .replace(
            &brain.brain_id,
            SourceStamp {
                kind: brain.source_kind,
                source_ref: &brain.source_ref,
                label: &brain.source_label,
            },
            nodes,
            &[],
            0,
        )
        .unwrap();
}

fn node(
    id: i64,
    parent: Option<i64>,
    name: &str,
    relative_path: &str,
    kind: NodeKind,
    child_count: u32,
) -> NodeDto {
    NodeDto {
        id,
        parent_id: parent,
        name: name.to_string(),
        relative_path: relative_path.to_string(),
        kind,
        depth: if parent.is_none() { 0 } else { 1 },
        size_bytes: 0,
        modified_unix_ms: None,
        online_only: false,
        reparse_point: false,
        child_count,
        seen: false,
    }
}

/// A root with `count` direct file children plus one directory child, so
/// dossier-first order is actually exercised — never flat luck. The
/// directory itself holds one grandchild (`GRANDCHILD_ID`), so a page of
/// the **root's** children has something real to prove never leaks in.
const GRANDCHILD_ID: i64 = 999;

fn wide_corpus(count: usize) -> Vec<NodeDto> {
    let mut nodes = vec![node(1, None, "root", "", NodeKind::Root, count as u32 + 1)];
    nodes.push(node(
        2,
        Some(1),
        "un-dossier",
        "un-dossier",
        NodeKind::Directory,
        1,
    ));
    nodes.push(node(
        GRANDCHILD_ID,
        Some(2),
        "petit-enfant.txt",
        "un-dossier/petit-enfant.txt",
        NodeKind::File,
        0,
    ));
    for i in 0..count {
        let name = format!("fichier-{i:04}.txt");
        nodes.push(node(
            (100 + i) as i64,
            Some(1),
            &name,
            &name,
            NodeKind::File,
            0,
        ));
    }
    nodes
}

// --- B. map_node_children --------------------------------------------------

#[test]
fn children_page_is_bounded_to_the_product_ceiling_by_default() {
    let (_temp, paths) = sandbox();
    let brain = test_brain("brain-children-wide");
    seed(&paths, &brain, &wide_corpus(120));

    let page = commands::node_children(
        &paths,
        &brain,
        &BrainNodeRef::new(&brain.brain_id, 1),
        None,
        200, // asks for more than CHILDREN_LIMIT_MAX
    )
    .expect("page");

    assert_eq!(page.limit, CHILDREN_LIMIT_MAX);
    assert_eq!(page.items.len(), CHILDREN_LIMIT_MAX);
    assert_eq!(
        page.total, 121,
        "121 direct children: 1 directory + 120 files"
    );
    assert!(page.next_cursor.is_some(), "more than one page remains");
}

#[test]
fn children_page_orders_directories_before_files() {
    let (_temp, paths) = sandbox();
    let brain = test_brain("brain-children-order");
    seed(&paths, &brain, &wide_corpus(5));

    let page = commands::node_children(
        &paths,
        &brain,
        &BrainNodeRef::new(&brain.brain_id, 1),
        None,
        50,
    )
    .expect("page");

    assert_eq!(page.items[0].name, "un-dossier");
    assert_eq!(page.items[0].kind, NodeKind::Directory);
    for item in &page.items[1..] {
        assert_eq!(item.kind, NodeKind::File);
    }
}

#[test]
fn children_pages_cover_the_full_set_without_duplication_loss_or_a_grandchild() {
    let (_temp, paths) = sandbox();
    let brain = test_brain("brain-children-full-cover");
    seed(&paths, &brain, &wide_corpus(130));

    let mut seen = HashSet::new();
    let mut after: Option<String> = None;
    let mut pages = 0;
    loop {
        let page = commands::node_children(
            &paths,
            &brain,
            &BrainNodeRef::new(&brain.brain_id, 1),
            after.as_deref(),
            50,
        )
        .expect("page");
        assert!(page.items.len() <= CHILDREN_LIMIT_MAX);
        for item in &page.items {
            assert!(
                seen.insert(item.node_id),
                "node {} paged twice",
                item.node_id
            );
            assert_ne!(
                item.node_id, GRANDCHILD_ID,
                "a grandchild of the root must never appear in the root's own children page"
            );
        }
        pages += 1;
        assert!(pages <= 10, "must terminate — runaway pagination");
        match page.next_cursor {
            Some(cursor) => after = Some(cursor),
            None => break,
        }
    }
    // 1 directory + 130 files = 131 direct children, none of which is a
    // grandchild and none seen twice or dropped.
    assert_eq!(seen.len(), 131);
}

#[test]
fn children_page_reports_the_exact_total_from_the_durable_column() {
    let (_temp, paths) = sandbox();
    let brain = test_brain("brain-children-total");
    seed(&paths, &brain, &wide_corpus(3));

    let page = commands::node_children(
        &paths,
        &brain,
        &BrainNodeRef::new(&brain.brain_id, 1),
        None,
        50,
    )
    .expect("page");
    assert_eq!(page.total, 4);
    assert_eq!(page.items.len(), 4);
    assert!(
        page.next_cursor.is_none(),
        "a page that holds everything has no cursor"
    );
}

#[test]
fn children_page_refuses_a_reference_from_another_brain() {
    let (_temp, paths) = sandbox();
    let alpha = test_brain("brain-children-alpha");
    let beta = test_brain("brain-children-beta");
    seed(&paths, &alpha, &wide_corpus(2));
    seed(&paths, &beta, &wide_corpus(2));

    let foreign = BrainNodeRef::new(&beta.brain_id, 1);
    let error = commands::node_children(&paths, &alpha, &foreign, None, 50).expect_err("refused");
    assert!(matches!(error, MapError::BrainMismatch { .. }), "{error:?}");
}

#[test]
fn children_page_refuses_a_cursor_naming_another_index() {
    let (_temp, paths) = sandbox();
    let brain = test_brain("brain-children-foreign-cursor");
    seed(&paths, &brain, &wide_corpus(2));

    let foreign_cursor = ChildCursor {
        index_id: "not-this-index".to_string(),
        revision: 0,
        parent_id: 1,
        after_id: 100,
    }
    .encode();

    let error = commands::node_children(
        &paths,
        &brain,
        &BrainNodeRef::new(&brain.brain_id, 1),
        Some(&foreign_cursor),
        50,
    )
    .expect_err("refused");
    assert!(
        matches!(
            error,
            MapError::Hierarchy(crate::hierarchy::HierarchyError::ForeignCursor)
        ),
        "{error:?}"
    );
}

#[test]
fn children_page_refuses_a_stale_revision_cursor_after_a_republish() {
    let (_temp, paths) = sandbox();
    let brain = test_brain("brain-children-stale");
    seed(&paths, &brain, &wide_corpus(60));

    let first = commands::node_children(
        &paths,
        &brain,
        &BrainNodeRef::new(&brain.brain_id, 1),
        None,
        50,
    )
    .expect("page");
    let stale_cursor = first.next_cursor.expect("more than one page");

    // A republish (refresh/rebuild) advances the revision under the cursor.
    seed(&paths, &brain, &wide_corpus(60));

    let error = commands::node_children(
        &paths,
        &brain,
        &BrainNodeRef::new(&brain.brain_id, 1),
        Some(&stale_cursor),
        50,
    )
    .expect_err("refused");
    assert!(
        matches!(
            error,
            MapError::Hierarchy(crate::hierarchy::HierarchyError::StaleCursor { .. })
        ),
        "{error:?}"
    );
}

#[test]
fn children_page_refuses_a_cursor_from_a_different_parent() {
    let (_temp, paths) = sandbox();
    let brain = test_brain("brain-children-wrong-parent");
    // A root with two direct children, one of them a second directory — so a
    // cursor can legitimately exist under a parent other than the root.
    let nodes = vec![
        node(1, None, "root", "", NodeKind::Root, 2),
        node(
            2,
            Some(1),
            "un-dossier",
            "un-dossier",
            NodeKind::Directory,
            0,
        ),
        node(
            3,
            Some(1),
            "autre-dossier",
            "autre-dossier",
            NodeKind::Directory,
            0,
        ),
    ];
    seed(&paths, &brain, &nodes);

    let store =
        BrainIndex::open_existing(&paths.brain_map_database(&brain.brain_id), false).expect("open");
    let identity = store.index.identity().expect("identity");

    // A cursor honestly naming this index and revision, but under the root
    // (`parent_id: 1`) — asked instead against the other directory (`3`).
    let cursor_under_root = ChildCursor {
        index_id: identity.index_id,
        revision: identity.revision,
        parent_id: 1,
        after_id: 2,
    }
    .encode();

    let error = commands::node_children(
        &paths,
        &brain,
        &BrainNodeRef::new(&brain.brain_id, 3),
        Some(&cursor_under_root),
        50,
    )
    .expect_err("refused");
    assert!(
        matches!(
            error,
            MapError::Hierarchy(crate::hierarchy::HierarchyError::ParentMismatch { .. })
        ),
        "{error:?}"
    );
}

#[test]
fn the_children_dto_carries_no_absolute_or_source_path() {
    let (_temp, paths) = sandbox();
    let brain = test_brain("brain-children-dto");
    seed(&paths, &brain, &wide_corpus(3));

    let page = commands::node_children(
        &paths,
        &brain,
        &BrainNodeRef::new(&brain.brain_id, 1),
        None,
        50,
    )
    .expect("page");
    let json = serde_json::to_value(&page).unwrap();
    let text = json.to_string();
    assert!(!text.contains(paths.fixtures.to_string_lossy().as_ref()));
    assert!(json.get("absolutePath").is_none());
    assert!(json.get("rootPath").is_none());
    assert!(json.get("sourcePath").is_none());
    assert!(json.get("folderPath").is_none());
    for item in json["items"].as_array().unwrap() {
        assert!(item.get("relativePath").is_some());
        assert!(item.get("absolutePath").is_none());
    }
}

#[test]
fn children_reads_only_the_index_even_once_the_source_is_gone() {
    let (_temp, paths) = sandbox();
    let brain = test_brain("brain-children-no-source");
    seed(&paths, &brain, &wide_corpus(3));

    assert!(!paths.fixtures.exists());
    let page = commands::node_children(
        &paths,
        &brain,
        &BrainNodeRef::new(&brain.brain_id, 1),
        None,
        50,
    )
    .expect("page");
    assert_eq!(page.total, 4);
}

// --- C. copy_target_path ----------------------------------------------------

#[test]
fn copy_refuses_a_reference_from_another_brain() {
    let (_temp, paths) = sandbox();
    let alpha = test_brain("brain-copy-alpha");
    let beta = test_brain("brain-copy-beta");
    seed(&paths, &alpha, &wide_corpus(2));
    seed(&paths, &beta, &wide_corpus(2));

    let foreign = BrainNodeRef::new(&beta.brain_id, 1);
    let error = commands::copy_target_path(&paths, &alpha, &foreign).expect_err("refused");
    assert!(matches!(error, MapError::BrainMismatch { .. }), "{error:?}");
}

#[test]
fn copy_refuses_a_skipped_or_reparse_flagged_node_before_touching_disk() {
    let (_temp, paths) = sandbox();
    let brain = test_brain("brain-copy-flags");
    let nodes = vec![
        node(1, None, "root", "", NodeKind::Root, 2),
        node(
            2,
            Some(1),
            "skipped.bin",
            "skipped.bin",
            NodeKind::Skipped,
            0,
        ),
        NodeDto {
            reparse_point: true,
            ..node(3, Some(1), "lien.txt", "lien.txt", NodeKind::File, 0)
        },
    ];
    seed(&paths, &brain, &nodes);

    for id in [2, 3] {
        let error =
            commands::copy_target_path(&paths, &brain, &BrainNodeRef::new(&brain.brain_id, id))
                .expect_err("refused");
        assert!(
            matches!(&error, MapError::RevealRefused(code) if code == "indexed_target_not_openable"),
            "{error:?}"
        );
    }
}

#[test]
fn copy_refuses_an_unknown_node_id() {
    let (_temp, paths) = sandbox();
    let brain = test_brain("brain-copy-missing-id");
    seed(&paths, &brain, &wide_corpus(2));

    let error =
        commands::copy_target_path(&paths, &brain, &BrainNodeRef::new(&brain.brain_id, 9_999))
            .expect_err("refused");
    assert!(matches!(error, MapError::NodeMissing(9_999)), "{error:?}");
}

#[test]
fn copy_refuses_a_target_that_disappeared_after_indexing() {
    let (_temp, paths) = sandbox();
    let brain = test_brain("brain-copy-disappeared");
    build_map(&paths, &brain, false).expect("build");

    let hit = commands::search_nodes(&paths, &brain, "racine-1", 0, 5).expect("search");
    let target_id = hit.items.first().expect("a racine file exists").node_id;
    let relative_path = hit.items[0].relative_path.clone();

    let root = BrainSource::resolve(&paths, &brain)
        .expect("source")
        .root(&paths);
    std::fs::remove_file(root.join(&relative_path)).expect("remove");

    let error = commands::copy_target_path(
        &paths,
        &brain,
        &BrainNodeRef::new(&brain.brain_id, target_id),
    )
    .expect_err("refused");
    assert!(
        matches!(&error, MapError::RevealRefused(code) if code == "indexed_target_unavailable"),
        "{error:?}"
    );
}

/// `TASK-0035` C's own requirement: exact for Unicode names and long names.
/// The root is resolved exactly as `reveal_node` would (a real synthetic
/// fixture's deterministic root), but the files under it and the index rows
/// naming them are written directly by this test — full control over the
/// exotic names, no dependency on what the frozen "quasi-empty" plan itself
/// happens to contain.
#[test]
fn copy_returns_the_exact_path_for_unicode_and_long_names() {
    let (_temp, paths) = sandbox();
    let brain = test_brain("brain-copy-unicode");
    let root = BrainSource::resolve(&paths, &brain)
        .expect("source")
        .root(&paths);
    std::fs::create_dir_all(&root).expect("materialise root");

    // A name with a surrogate-pair emoji and accented characters — the same
    // class of astral codepoint `searchCoordinator.ts` (`TASK-0034`) had to
    // handle without splitting it in two.
    let unicode_name = "café-日本語-📁.txt";
    std::fs::write(root.join(unicode_name), b"synthetique").expect("write unicode file");

    // A name long enough to be meaningfully "long" without risking Windows's
    // MAX_PATH under a temp sandbox prefix — the same caution TASK-0033's
    // WebView2 harness documents for deep synthetic trees.
    let long_name = format!("{}.txt", "a".repeat(120));
    std::fs::write(root.join(&long_name), b"synthetique").expect("write long-named file");

    let nodes = vec![
        node(1, None, "root", "", NodeKind::Root, 2),
        node(2, Some(1), unicode_name, unicode_name, NodeKind::File, 0),
        node(3, Some(1), &long_name, &long_name, NodeKind::File, 0),
    ];
    seed(&paths, &brain, &nodes);

    let unicode_copy =
        commands::copy_target_path(&paths, &brain, &BrainNodeRef::new(&brain.brain_id, 2))
            .expect("copy");
    assert_eq!(unicode_copy, root.join(unicode_name).to_str().unwrap());

    let long_copy =
        commands::copy_target_path(&paths, &brain, &BrainNodeRef::new(&brain.brain_id, 3))
            .expect("copy");
    assert_eq!(long_copy, root.join(&long_name).to_str().unwrap());
}

#[test]
fn copy_shares_reveals_confinement_walk_rather_than_a_parallel_one() {
    let temp = tempfile::tempdir().unwrap();
    std::fs::create_dir(temp.path().join("dossier")).unwrap();
    std::fs::write(temp.path().join("dossier/fichier.txt"), b"synthetique").unwrap();

    // `confine_indexed_target` is the primitive both `reveal_node` and
    // `copy_target_path` share through `resolve_confined_target` — proven
    // directly here exactly as `find_open_tests.rs` proves it for reveal.
    let confined = confine_indexed_target(temp.path(), "dossier/fichier.txt").expect("confined");
    assert_eq!(confined, temp.path().join("dossier").join("fichier.txt"));

    let missing = confine_indexed_target(temp.path(), "dossier/absent.txt").expect_err("refused");
    assert!(
        matches!(&missing, MapError::RevealRefused(code) if code == "indexed_target_unavailable"),
        "{missing:?}"
    );
}
