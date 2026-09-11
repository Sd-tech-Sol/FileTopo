//! `TASK-0036` — `DEC-0009` I-E on the real production pipeline: a real
//! `REAL_ROOT` brain, the real scanner, the real Windows `SYSTEM` identity
//! where the platform provides it, through `refresh_map`/`rebuild_map`
//! exactly as the product calls them.
//!
//! Every tree here is created by the test that reads it, under a
//! `tempfile` directory, and destroyed with it — the same convention
//! `real_root_tests.rs` established. **No personal brain, no personal
//! folder, no data that outlives the process.**

use super as commands;
use super::*;
use std::fs;

fn sandbox() -> (tempfile::TempDir, SandboxPaths) {
    let temp = tempfile::tempdir().unwrap();
    let paths = SandboxPaths::under(temp.path().join("filetopo-state"));
    (temp, paths)
}

fn register(paths: &SandboxPaths, root: &Path) -> BrainRecord {
    commands::register_real_root(paths, root).expect("registered")
}

/// The canonical `nodes.id` behind a relative path, read straight from the
/// Index — the same primitive `BrainIndex::resolve_path` already offers to
/// production code (`map_resolve_node`).
fn id_of(paths: &SandboxPaths, brain: &BrainRecord, relative_path: &str) -> i64 {
    let store = open_store(paths, brain).expect("open store");
    store
        .resolve_path(relative_path)
        .expect("resolve")
        .unwrap_or_else(|| panic!("no node at {relative_path:?}"))
}

#[test]
fn renaming_a_real_file_between_two_refreshes_keeps_the_same_node_id_and_seen_state() {
    let (temp, paths) = sandbox();
    let root = temp.path().join("racine");
    fs::create_dir_all(&root).unwrap();
    fs::write(root.join("avant.txt"), b"synthetique").unwrap();

    let brain = register(&paths, &root);
    refresh_map(&paths, &brain).expect("first refresh");
    let id_before = id_of(&paths, &brain, "avant.txt");

    {
        let store = BrainIndex::open_existing(&paths.brain_map_database(&brain.brain_id), true)
            .expect("writable store");
        assert!(store.index.mark_seen(id_before).expect("mark seen"));
    }

    fs::rename(root.join("avant.txt"), root.join("apres.txt")).unwrap();
    refresh_map(&paths, &brain).expect("second refresh");

    let id_after = id_of(&paths, &brain, "apres.txt");
    assert_eq!(
        id_after, id_before,
        "a same-volume rename must keep the same nodeId on real Windows"
    );
    assert!(
        !store_has_path(&paths, &brain, "avant.txt"),
        "the old path must no longer resolve"
    );

    // `seen` is internal-only — `MapNode`/`NodeDetail` never expose it — so
    // it is read straight off the `Index`, the same primitive `Index::node`
    // the historical `mark_node_seen` path already used.
    let store = open_store(&paths, &brain).expect("reopen");
    let node = store.index.node(id_after).expect("node").expect("present");
    assert!(
        node.seen,
        "seen must survive a real Windows rename, carried by the matched canonical id"
    );
}

#[test]
fn moving_a_real_file_into_a_subfolder_keeps_the_same_id_and_updates_the_parent() {
    let (temp, paths) = sandbox();
    let root = temp.path().join("racine");
    fs::create_dir_all(root.join("destination")).unwrap();
    fs::write(root.join("depart.txt"), b"synthetique").unwrap();

    let brain = register(&paths, &root);
    refresh_map(&paths, &brain).expect("first refresh");
    let file_id_before = id_of(&paths, &brain, "depart.txt");
    let folder_id = id_of(&paths, &brain, "destination");

    fs::rename(root.join("depart.txt"), root.join("destination/depart.txt")).unwrap();
    refresh_map(&paths, &brain).expect("second refresh");

    let file_id_after = id_of(&paths, &brain, "destination/depart.txt");
    assert_eq!(file_id_after, file_id_before);

    let store = open_store(&paths, &brain).expect("reopen");
    let moved = store.detail(file_id_after).expect("detail");
    assert_eq!(
        moved.node.parent_id,
        Some(folder_id),
        "the moved file's parent_id must point at the destination folder's own canonical id"
    );
}

#[test]
fn moving_a_directory_with_a_child_keeps_both_ids_and_parent_child_consistency() {
    let (temp, paths) = sandbox();
    let root = temp.path().join("racine");
    fs::create_dir_all(root.join("dossier")).unwrap();
    fs::create_dir_all(root.join("ailleurs")).unwrap();
    fs::write(root.join("dossier/enfant.txt"), b"synthetique").unwrap();

    let brain = register(&paths, &root);
    refresh_map(&paths, &brain).expect("first refresh");
    let folder_id_before = id_of(&paths, &brain, "dossier");
    let child_id_before = id_of(&paths, &brain, "dossier/enfant.txt");
    let ailleurs_id = id_of(&paths, &brain, "ailleurs");

    fs::rename(root.join("dossier"), root.join("ailleurs/dossier")).unwrap();
    refresh_map(&paths, &brain).expect("second refresh");

    let folder_id_after = id_of(&paths, &brain, "ailleurs/dossier");
    let child_id_after = id_of(&paths, &brain, "ailleurs/dossier/enfant.txt");
    assert_eq!(folder_id_after, folder_id_before);
    assert_eq!(child_id_after, child_id_before);

    let store = open_store(&paths, &brain).expect("reopen");
    let folder_detail = store.detail(folder_id_after).expect("folder detail");
    assert_eq!(folder_detail.node.parent_id, Some(ailleurs_id));
    let child_detail = store.detail(child_id_after).expect("child detail");
    assert_eq!(child_detail.node.parent_id, Some(folder_id_after));
}

#[test]
fn a_new_file_after_deleting_another_never_recycles_its_id() {
    let (temp, paths) = sandbox();
    let root = temp.path().join("racine");
    fs::create_dir_all(&root).unwrap();
    fs::write(root.join("a.txt"), b"synthetique").unwrap();

    let brain = register(&paths, &root);
    refresh_map(&paths, &brain).expect("first refresh");
    let deleted_id = id_of(&paths, &brain, "a.txt");

    fs::remove_file(root.join("a.txt")).unwrap();
    fs::write(root.join("b.txt"), b"different-synthetique").unwrap();
    refresh_map(&paths, &brain).expect("second refresh");

    let created_id = id_of(&paths, &brain, "b.txt");
    assert_ne!(
        created_id, deleted_id,
        "a deleted object's id must never be recycled"
    );
}

#[test]
fn two_brains_reading_the_same_real_root_never_share_an_id_or_state() {
    let (temp, paths) = sandbox();
    let root = temp.path().join("racine-partagee");
    fs::create_dir_all(&root).unwrap();
    fs::write(root.join("commun.txt"), b"synthetique").unwrap();

    let alpha = commands::register_real_root(&paths, &root).expect("alpha registered");
    // A second, independent brain over the SAME folder — `DEC-0033` D: no
    // `UNIQUE` constraint on the source path, so two catalogue rows can
    // legitimately name the same root.
    let mut catalog = crate::map::brains::BrainCatalog::open(&paths.catalog_database()).unwrap();
    let beta = catalog.register_real_root(&root).expect("beta registered");

    refresh_map(&paths, &alpha).expect("alpha refresh");
    refresh_map(&paths, &beta).expect("beta refresh");

    let alpha_id = id_of(&paths, &alpha, "commun.txt");
    let beta_id = id_of(&paths, &beta, "commun.txt");

    {
        let store = BrainIndex::open_existing(&paths.brain_map_database(&alpha.brain_id), true)
            .expect("writable alpha store");
        assert!(store.index.mark_seen(alpha_id).expect("mark seen"));
    }

    let beta_store = open_store(&paths, &beta).expect("beta store");
    let beta_node = beta_store
        .index
        .node(beta_id)
        .expect("node")
        .expect("present");
    assert!(
        !beta_node.seen,
        "marking a node seen in one brain must never affect the other, even over the same folder"
    );
}

#[test]
fn rebuilding_an_unchanged_real_tree_keeps_every_node_id() {
    let (temp, paths) = sandbox();
    let root = temp.path().join("racine");
    fs::create_dir_all(root.join("dossier")).unwrap();
    fs::write(root.join("dossier/fichier.txt"), b"synthetique").unwrap();
    fs::write(root.join("racine.txt"), b"synthetique").unwrap();

    let brain = register(&paths, &root);
    refresh_map(&paths, &brain).expect("first build");
    let before: std::collections::BTreeMap<String, i64> = {
        let store = open_store(&paths, &brain).expect("store");
        store
            .analysis_nodes()
            .expect("nodes")
            .into_iter()
            .map(|node| (node.relative_path, node.id))
            .collect()
    };

    rebuild_map(&paths, &brain).expect("rebuild");
    let after: std::collections::BTreeMap<String, i64> = {
        let store = open_store(&paths, &brain).expect("store");
        store
            .analysis_nodes()
            .expect("nodes")
            .into_iter()
            .map(|node| (node.relative_path, node.id))
            .collect()
    };

    assert_eq!(
        before, after,
        "an unchanged tree must keep every canonical id across a rebuild"
    );
}

#[test]
fn no_stable_key_or_absolute_path_ever_appears_in_a_serialized_dto() {
    let (temp, paths) = sandbox();
    let root = temp.path().join("racine-confidentielle");
    fs::create_dir_all(root.join("dossier")).unwrap();
    fs::write(root.join("dossier/fichier.txt"), b"synthetique").unwrap();

    let brain = register(&paths, &root);
    refresh_map(&paths, &brain).expect("refresh");

    let store = open_store(&paths, &brain).expect("store");
    let file_id = store.resolve_path("dossier/fichier.txt").unwrap().unwrap();
    let snapshot = store.snapshot().expect("snapshot");
    let detail = store.detail(file_id).expect("detail");
    drop(store);

    let payloads = [
        serde_json::to_string(&snapshot).expect("snapshot json"),
        serde_json::to_string(&detail).expect("detail json"),
    ];
    let absolute = root.to_string_lossy().into_owned();
    for payload in payloads {
        assert!(
            !payload.contains("SYS1:"),
            "a Windows SYSTEM stable key leaked: {payload}"
        );
        assert!(
            !payload.contains("PFv1:"),
            "a PATH_FALLBACK stable key leaked: {payload}"
        );
        assert!(
            !payload.to_lowercase().contains("stablekey")
                && !payload.to_lowercase().contains("stable_key"),
            "an internal field name leaked: {payload}"
        );
        assert!(
            !payload.to_lowercase().contains("provenance"),
            "an internal field name leaked: {payload}"
        );
        assert!(
            !payload.contains(&absolute),
            "the absolute source path leaked: {payload}"
        );
    }
}

fn store_has_path(paths: &SandboxPaths, brain: &BrainRecord, relative_path: &str) -> bool {
    open_store(paths, brain)
        .expect("store")
        .resolve_path(relative_path)
        .expect("resolve")
        .is_some()
}
