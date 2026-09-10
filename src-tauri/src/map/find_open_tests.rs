//! `TASK-0034`: bounded local search and "Ouvrir dans l'Explorateur", on the
//! real `Index` and real `BrainIndex` files.
//!
//! Search corpora are built directly through `BrainIndex::replace`, exactly
//! as `projection_tests.rs` does, so the names under test can carry `%`,
//! `_` and a literal backslash without needing a real filesystem entry with
//! that name. Reveal's confinement tests that need a real root use a frozen
//! synthetic fixture, materialised by `build_map` — never a personal folder.

use super as commands;
use super::*;
use crate::domain::{NodeDto, NodeKind};
use crate::map::brain_index::SourceStamp;
use crate::map::brains::SourceKind as BrainSourceKind;
use std::collections::HashSet;

fn sandbox() -> (tempfile::TempDir, SandboxPaths) {
    let temp = tempfile::tempdir().unwrap();
    let paths = SandboxPaths::under(temp.path().join("sandbox"));
    (temp, paths)
}

fn search_brain(id: &str) -> BrainRecord {
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

/// Seeds a brain's map database directly at the path `open_store` expects,
/// bypassing the scanner entirely — search never needs a source, and this
/// keeps that true of the fixture too.
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

fn node(id: i64, parent: Option<i64>, name: &str, relative_path: &str, kind: NodeKind) -> NodeDto {
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
        child_count: 0,
        seen: false,
    }
}

/// A small corpus with names chosen so `%`, `_` and `\` are search targets,
/// never SQL wildcards — `TASK-0034` F.3.
fn escaping_corpus() -> Vec<NodeDto> {
    vec![
        node(1, None, "root", "", NodeKind::Root),
        node(2, Some(1), "dossier_a", "dossier_a", NodeKind::Directory),
        node(
            3,
            Some(2),
            "rapport 100%.txt",
            "dossier_a/rapport 100%.txt",
            NodeKind::File,
        ),
        node(
            4,
            Some(1),
            "chemin\\etrange.txt",
            "chemin\\etrange.txt",
            NodeKind::File,
        ),
        node(5, Some(1), "autre.txt", "autre.txt", NodeKind::File),
    ]
}

// --- A. search_nodes ---------------------------------------------------

#[test]
fn a_partial_name_or_path_match_is_found_and_the_page_is_bounded() {
    let (_temp, paths) = sandbox();
    let brain = search_brain("brain-search-a");
    seed(&paths, &brain, &escaping_corpus());

    let page = search_nodes(&paths, &brain, "rapport", 0, 50).unwrap();
    assert_eq!(page.total, 1);
    assert_eq!(page.items.len(), 1);
    assert_eq!(page.items[0].relative_path, "dossier_a/rapport 100%.txt");
    assert_eq!(page.items[0].kind, NodeKind::File);
    assert_eq!(page.items[0].brain_id, brain.brain_id);

    // A match on the relative path, not only the name.
    let by_path = search_nodes(&paths, &brain, "dossier_a/rapport", 0, 50).unwrap();
    assert_eq!(by_path.total, 1);

    // A requested limit above the product ceiling is clamped, never honoured.
    let clamped = search_nodes(&paths, &brain, "e", 0, 10_000).unwrap();
    assert_eq!(clamped.limit, SEARCH_LIMIT_MAX);
    assert!(clamped.items.len() <= SEARCH_LIMIT_MAX);
}

#[test]
fn an_empty_or_blank_query_returns_an_empty_page_never_the_corpus() {
    let (_temp, paths) = sandbox();
    let brain = search_brain("brain-search-empty");
    seed(&paths, &brain, &escaping_corpus());

    for query in ["", "   ", "\t"] {
        let page = search_nodes(&paths, &brain, query, 0, 50).unwrap();
        assert_eq!(page.total, 0, "query {query:?} must not dump the corpus");
        assert!(page.items.is_empty());
    }
}

#[test]
fn total_offset_and_limit_are_exact_across_pages() {
    let (_temp, paths) = sandbox();
    let brain = search_brain("brain-search-paging");
    let nodes = std::iter::once(node(1, None, "root", "", NodeKind::Root))
        .chain((0..30).map(|i| {
            node(
                i + 2,
                Some(1),
                &format!("hit-{i:02}.txt"),
                &format!("hit-{i:02}.txt"),
                NodeKind::File,
            )
        }))
        .collect::<Vec<_>>();
    seed(&paths, &brain, &nodes);

    let first = search_nodes(&paths, &brain, "hit-", 0, 10).unwrap();
    assert_eq!(first.total, 30);
    assert_eq!(first.offset, 0);
    assert_eq!(first.limit, 10);
    assert_eq!(first.items.len(), 10);

    let second = search_nodes(&paths, &brain, "hit-", 10, 10).unwrap();
    assert_eq!(second.total, 30);
    assert_eq!(second.offset, 10);
    let first_ids = first
        .items
        .iter()
        .map(|h| h.node_id)
        .collect::<HashSet<_>>();
    let second_ids = second
        .items
        .iter()
        .map(|h| h.node_id)
        .collect::<HashSet<_>>();
    assert!(
        first_ids.is_disjoint(&second_ids),
        "paging must not repeat a hit"
    );
}

#[test]
fn percent_underscore_and_backslash_are_search_targets_not_wildcards() {
    let (_temp, paths) = sandbox();
    let brain = search_brain("brain-search-escape");
    seed(&paths, &brain, &escaping_corpus());

    let percent = search_nodes(&paths, &brain, "100%", 0, 50).unwrap();
    assert_eq!(
        percent.total, 1,
        "% must match literally, not as a wildcard"
    );
    assert_eq!(percent.items[0].name, "rapport 100%.txt");

    let underscore = search_nodes(&paths, &brain, "dossier_a", 0, 50).unwrap();
    assert!(
        underscore.items.iter().any(|h| h.name == "dossier_a"),
        "_ must match literally"
    );
    // An injected `_` must not turn into "match any one character": searching
    // for a string that only differs by having *any* character where `_` is
    // must not also match "dossier_a".
    let wrong_char = search_nodes(&paths, &brain, "dossierXa", 0, 50).unwrap();
    assert_eq!(
        wrong_char.total, 0,
        "_ escaped must not behave as SQL's any-char wildcard"
    );

    let backslash = search_nodes(&paths, &brain, "chemin\\etrange", 0, 50).unwrap();
    assert_eq!(backslash.total, 1);
    assert_eq!(backslash.items[0].name, "chemin\\etrange.txt");
}

#[test]
fn results_are_isolated_by_brain() {
    let (_temp, paths) = sandbox();
    let alpha = search_brain("brain-search-alpha");
    let beta = search_brain("brain-search-beta");
    seed(&paths, &alpha, &escaping_corpus());
    seed(
        &paths,
        &beta,
        &[
            node(1, None, "root", "", NodeKind::Root),
            node(
                2,
                Some(1),
                "rapport-beta.txt",
                "rapport-beta.txt",
                NodeKind::File,
            ),
        ],
    );

    let in_alpha = search_nodes(&paths, &alpha, "rapport", 0, 50).unwrap();
    assert_eq!(in_alpha.total, 1);
    assert_eq!(in_alpha.items[0].brain_id, alpha.brain_id);

    let in_beta = search_nodes(&paths, &beta, "rapport", 0, 50).unwrap();
    assert_eq!(in_beta.total, 1);
    assert_eq!(in_beta.items[0].brain_id, beta.brain_id);
    assert_ne!(
        in_alpha.items[0].relative_path,
        in_beta.items[0].relative_path
    );
}

#[test]
fn search_reads_only_the_index_even_once_the_source_is_gone() {
    let (_temp, paths) = sandbox();
    let brain = search_brain("brain-search-no-source");
    seed(&paths, &brain, &escaping_corpus());

    // No fixture was ever materialised under `paths.fixtures` for this brain
    // — there is no source on disk to read at all — and the search still
    // works, because it never asks `BrainSource` for one.
    assert!(!paths.fixtures.exists());
    let page = search_nodes(&paths, &brain, "rapport", 0, 50).unwrap();
    assert_eq!(page.total, 1);
}

#[test]
fn the_search_dto_carries_no_absolute_or_source_path() {
    let (_temp, paths) = sandbox();
    let brain = search_brain("brain-search-dto");
    seed(&paths, &brain, &escaping_corpus());

    let page = search_nodes(&paths, &brain, "rapport", 0, 50).unwrap();
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
fn the_published_revision_changes_when_the_index_is_republished() {
    let (_temp, paths) = sandbox();
    let brain = search_brain("brain-search-revision");
    seed(&paths, &brain, &escaping_corpus());

    let before = search_nodes(&paths, &brain, "rapport", 0, 50).unwrap();

    // A republication — as an explicit refresh/rebuild would perform —
    // advances the revision even though the corpus contents are unchanged.
    seed(&paths, &brain, &escaping_corpus());
    let after = search_nodes(&paths, &brain, "rapport", 0, 50).unwrap();

    assert!(
        after.index_revision > before.index_revision,
        "republishing must advance the revision search reports"
    );
}

// --- C. reveal_node ------------------------------------------------------

#[test]
fn reveal_refuses_a_reference_from_another_brain() {
    let (_temp, paths) = sandbox();
    let alpha = search_brain("brain-reveal-alpha");
    let beta = search_brain("brain-reveal-beta");
    seed(&paths, &alpha, &escaping_corpus());
    seed(&paths, &beta, &escaping_corpus());

    let foreign_reference = BrainNodeRef::new(&beta.brain_id, 3);
    let error = commands::reveal_node(&paths, &alpha, &foreign_reference).expect_err("refused");
    assert!(matches!(error, MapError::BrainMismatch { .. }), "{error:?}");
}

#[test]
fn reveal_refuses_a_skipped_or_reparse_flagged_node_before_touching_disk() {
    let (_temp, paths) = sandbox();
    let brain = search_brain("brain-reveal-flags");
    let nodes = vec![
        node(1, None, "root", "", NodeKind::Root),
        node(2, Some(1), "skipped.bin", "skipped.bin", NodeKind::Skipped),
        NodeDto {
            reparse_point: true,
            ..node(3, Some(1), "lien.txt", "lien.txt", NodeKind::File)
        },
    ];
    seed(&paths, &brain, &nodes);

    for id in [2, 3] {
        let error = commands::reveal_node(&paths, &brain, &BrainNodeRef::new(&brain.brain_id, id))
            .expect_err("refused");
        assert!(
            matches!(&error, MapError::RevealRefused(code) if code == "indexed_target_not_openable"),
            "{error:?}"
        );
    }
}

#[test]
fn reveal_refuses_an_unknown_node_id() {
    let (_temp, paths) = sandbox();
    let brain = search_brain("brain-reveal-missing-id");
    seed(&paths, &brain, &escaping_corpus());

    let error = commands::reveal_node(&paths, &brain, &BrainNodeRef::new(&brain.brain_id, 9_999))
        .expect_err("refused");
    assert!(matches!(error, MapError::NodeMissing(9_999)), "{error:?}");
}

/// A real fixture, really built, then one indexed file removed from disk —
/// the "target disappeared" case, exercised against the real confinement
/// walk (real root resolution, real `fs::symlink_metadata`) without ever
/// reaching `Command::spawn`.
#[test]
fn reveal_refuses_a_target_that_disappeared_after_indexing() {
    let (_temp, paths) = sandbox();
    let brain = BrainRecord {
        brain_id: "brain-reveal-real".to_string(),
        display_name: "Cerveau réel".to_string(),
        color: "#333333".to_string(),
        icon: "*".to_string(),
        source_kind: BrainSourceKind::SyntheticFixture,
        source_ref: "quasi-empty".to_string(),
        source_label: "quasi-empty".to_string(),
        position: 1,
    };
    build_map(&paths, &brain, false).expect("build");

    let hit = search_nodes(&paths, &brain, "racine-1", 0, 5).expect("search");
    let target_id = hit.items.first().expect("a racine file exists").node_id;
    let relative_path = hit.items[0].relative_path.clone();

    let root = BrainSource::resolve(&paths, &brain)
        .expect("source")
        .root(&paths);
    std::fs::remove_file(root.join(&relative_path)).expect("remove");

    let error = commands::reveal_node(
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

#[test]
fn confinement_rejects_a_crafted_parent_directory_component() {
    let temp = tempfile::tempdir().unwrap();
    let error = confine_indexed_target(temp.path(), "../outside.txt").expect_err("refused");
    assert!(
        matches!(&error, MapError::RevealRefused(code) if code == "indexed_path_invalid"),
        "{error:?}"
    );
}

#[test]
fn confinement_accepts_a_real_nested_entry_and_refuses_a_missing_one() {
    let temp = tempfile::tempdir().unwrap();
    std::fs::create_dir(temp.path().join("dossier")).unwrap();
    std::fs::write(temp.path().join("dossier/fichier.txt"), b"synthetique").unwrap();

    let target = confine_indexed_target(temp.path(), "dossier/fichier.txt").expect("confined");
    assert_eq!(target, temp.path().join("dossier").join("fichier.txt"));

    let missing = confine_indexed_target(temp.path(), "dossier/absent.txt").expect_err("refused");
    assert!(
        matches!(&missing, MapError::RevealRefused(code) if code == "indexed_target_unavailable"),
        "{missing:?}"
    );
}

#[test]
fn the_explorer_argument_selects_a_file_and_opens_a_directory_directly() {
    let temp = tempfile::tempdir().unwrap();
    let dir = temp.path().join("dossier");
    std::fs::create_dir(&dir).unwrap();
    let file = dir.join("fichier.txt");
    std::fs::write(&file, b"synthetique").unwrap();

    assert_eq!(explorer_argument(&dir), dir.as_os_str());
    let mut expected = std::ffi::OsString::from("/select,");
    expected.push(file.as_os_str());
    assert_eq!(explorer_argument(&file), expected);
}
