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

// -- `ACTION-0057` D1: the v3 canonical index the product actually upgrades --

/// Reduces a real, product-built **v4** canonical index (however it was
/// produced — `refresh_map`, `rebuild_map`, does not matter) to exactly the
/// **v3** shape `TASK-0029` shipped: the two `TASK-0036` columns and their
/// unique index removed, `next_node_id` forgotten, `schema_version` and
/// `PRAGMA user_version` rolled back to `3`. Every other row and every other
/// piece of metadata — `brain_id`, `source_kind`, `source_ref`,
/// `build_complete`, `projection_contract`, `root_id`, `node_count`,
/// `index_id`, `index_revision`, every node and its `seen` flag — is left
/// exactly as the real product wrote it, because it is real product output,
/// never hand-written SQL pretending to be a schema this program never
/// produced.
fn downgrade_to_schema_v3(database: &Path) {
    let connection = rusqlite::Connection::open(database).expect("open for downgrade");
    connection
        .execute_batch(
            "DROP INDEX IF EXISTS idx_nodes_stable_key;
             ALTER TABLE nodes DROP COLUMN identity_provenance;
             ALTER TABLE nodes DROP COLUMN stable_key;
             DELETE FROM schema_meta WHERE key = 'next_node_id';
             UPDATE schema_meta SET value = '3' WHERE key = 'schema_version';
             PRAGMA user_version = 3;",
        )
        .expect("downgrade to the v3 shape");
}

fn raw_schema_version(database: &Path) -> i64 {
    rusqlite::Connection::open(database)
        .expect("open for version probe")
        .query_row("PRAGMA user_version", [], |row| row.get(0))
        .expect("version")
}

fn raw_bytes(database: &Path) -> Vec<u8> {
    fs::read(database).expect("read database bytes")
}

/// The `ACTION-0058` D4 / `DEC-0013` B safety-copy path — the exact naming
/// convention `brain_index::migration_safety_copy_path` uses internally,
/// duplicated here rather than exposed as `pub(crate)`: a test that reaches
/// into an internal helper is a test that breaks the moment the internal
/// naming changes for an unrelated reason. Recomputing it independently
/// means a real behavioural drift is what makes these tests fail, not a
/// rename.
fn safety_copy_path(database: &Path) -> PathBuf {
    let mut name = database.file_name().unwrap().to_os_string();
    name.push(".v3-safety-copy");
    database.with_file_name(name)
}

/// The logical content that must survive a quiesce (which can rewrite the
/// file's bytes by merging `-wal` pages into `main.db` even when nothing
/// else about the index changes) — used where an assertion needs "nothing
/// meaningful changed" rather than "not a single byte changed".
fn logical_snapshot(database: &Path) -> (i64, Vec<(i64, String, bool)>) {
    let connection = rusqlite::Connection::open(database).expect("open for snapshot");
    let version: i64 = connection
        .query_row("PRAGMA user_version", [], |row| row.get(0))
        .expect("version");
    let mut statement = connection
        .prepare("SELECT id, relative_path, seen FROM nodes ORDER BY id")
        .expect("prepare");
    let rows = statement
        .query_map([], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get::<_, bool>(2)?))
        })
        .expect("query")
        .collect::<Result<Vec<_>, _>>()
        .expect("rows");
    (version, rows)
}

/// The D1 product-pipeline proof `ACTION-0057` demands in full: a v3
/// canonical `REAL_ROOT` index, built by the real pipeline and reduced to
/// exactly the previous schema, becomes usable again through an ordinary
/// `map_open` — with the migration reaching neither the filesystem source
/// nor the brain's identity/binding, `index_id`/`index_revision` unchanged by
/// the migration itself, every node and `seen` intact, a cursor issued
/// before the downgrade still valid immediately after migration (the
/// revision has not moved), and a genuine republish afterwards advancing the
/// revision normally and invalidating that same cursor.
#[test]
fn a_real_v3_index_upgrades_through_map_open_without_reading_the_source() {
    let (temp, paths) = sandbox();
    let root = temp.path().join("racine-v3");
    fs::create_dir_all(&root).unwrap();
    fs::write(root.join("avant.txt"), b"synthetique").unwrap();
    fs::write(root.join("second.txt"), b"synthetique-2").unwrap();

    let brain = register(&paths, &root);
    refresh_map(&paths, &brain).expect("first refresh builds a real v4 index");
    let file_id = id_of(&paths, &brain, "avant.txt");
    {
        let store = BrainIndex::open_existing(&paths.brain_map_database(&brain.brain_id), true)
            .expect("writable store");
        assert!(store.index.mark_seen(file_id).expect("mark seen"));
    }

    let database = paths.brain_map_database(&brain.brain_id);
    let (index_id_before, revision_before, root_id) = {
        let store = BrainIndex::open_existing(&database, false).expect("read v4 state");
        let identity = store.index.identity().expect("identity");
        (
            identity.index_id,
            identity.revision,
            store.root_id().unwrap(),
        )
    };
    // A cursor issued against the real v4 index, before the downgrade — used
    // below to prove migration alone (revision unchanged) does not
    // invalidate it, and that only a genuine republication does.
    let cursor_before_downgrade = {
        let store = BrainIndex::open_existing(&database, false).expect("read for cursor");
        store
            .index
            .children_page(root_id, 1, None)
            .expect("first page")
            .next_cursor
            .expect("two children under one page of size one must yield a cursor")
    };

    downgrade_to_schema_v3(&database);
    assert_eq!(
        raw_schema_version(&database),
        3,
        "the fixture must really be v3"
    );

    // The product-path migration, triggered by an ordinary open — never a
    // rebuild, never a manual repair.
    let report = open_map(&paths, &brain).expect("map_open migrates a compatible v3 index");
    assert!(
        !report.source_read,
        "DEC-0032 A: map_open must never read the source, migration included"
    );
    assert_eq!(
        report.index_id, index_id_before,
        "the migration must not change index_id"
    );
    assert_eq!(
        report.revision, revision_before,
        "the migration alone must not advance the revision"
    );
    assert_eq!(report.schema_version, crate::map::store::MAP_SCHEMA_VERSION);
    assert_eq!(
        raw_schema_version(&database),
        crate::map::store::MAP_SCHEMA_VERSION
    );
    assert!(
        !safety_copy_path(&database).exists(),
        "ACTION-0058 D4: a successful migration must not leave its transient \
         safety copy behind — one bounded copy per attempt, never accumulated"
    );

    // Data and `seen` survived the migration.
    let store = open_store(&paths, &brain).expect("open after migration");
    assert_eq!(store.count().unwrap(), 3, "root + two files");
    let node = store.index.node(file_id).unwrap().unwrap();
    assert!(node.seen, "seen must survive the schema migration");
    drop(store);

    // The cursor issued before the downgrade is still valid immediately
    // after migration: the revision it was bound to has not moved.
    {
        let store = open_store(&paths, &brain).expect("open for cursor replay");
        store
            .index
            .children_page(root_id, 1, Some(&cursor_before_downgrade))
            .expect("a cursor from before an untouched-revision migration must still resolve");
    }

    // A genuine republish afterwards works normally: it advances the
    // revision by exactly one, and only now is the old cursor stale.
    fs::write(root.join("troisieme.txt"), b"synthetique-3").unwrap();
    let refreshed = refresh_map(&paths, &brain).expect("republish after migration");
    assert_eq!(
        refreshed.revision,
        revision_before + 1,
        "a real republication advances the revision exactly once"
    );
    let stale = open_store(&paths, &brain)
        .expect("store")
        .index
        .children_page(root_id, 1, Some(&cursor_before_downgrade));
    assert!(
        stale.is_err(),
        "the pre-downgrade cursor must become stale only once the revision actually moves"
    );
}

/// Refusal 1 — a v3 index whose internal `brain_id` disagrees with the file's
/// own catalogue slot is refused without migrating, without touching the
/// source, and without deleting anything. Built the same way
/// `commands::tests::an_index_built_for_another_brain_is_refused_rather_than_served`
/// proves the v4 case: a real index copied into a different brain's file
/// path, not a hand-edited `brain_id`.
#[test]
fn a_v3_index_naming_another_brain_is_refused_without_migrating() {
    let (temp, paths) = sandbox();
    let root_a = temp.path().join("racine-v3-a");
    fs::create_dir_all(&root_a).unwrap();
    fs::write(root_a.join("fichier.txt"), b"synthetique").unwrap();
    let brain_a = register(&paths, &root_a);
    refresh_map(&paths, &brain_a).expect("refresh a");
    let database_a = paths.brain_map_database(&brain_a.brain_id);
    downgrade_to_schema_v3(&database_a);

    let root_b = temp.path().join("racine-v3-b");
    fs::create_dir_all(&root_b).unwrap();
    fs::write(root_b.join("autre.txt"), b"synthetique-b").unwrap();
    let brain_b = register(&paths, &root_b);

    // Brain A's v3 index, dropped into Brain B's place — the file's own
    // `brain_id` metadata still names A.
    let database_b = paths.brain_map_database(&brain_b.brain_id);
    std::fs::create_dir_all(database_b.parent().expect("map dir")).unwrap();
    std::fs::copy(&database_a, &database_b).unwrap();
    let before = raw_bytes(&database_b);

    for outcome in [
        open_map(&paths, &brain_b).map(|_| ()),
        refresh_map(&paths, &brain_b).map(|_| ()),
        rebuild_map(&paths, &brain_b).map(|_| ()),
    ] {
        let error = outcome.expect_err("a brain_id mismatch on a v3 file must be refused");
        assert!(
            matches!(error, MapError::BrainMismatch { .. }),
            "expected a brain mismatch, got {error:?}"
        );
    }
    assert_eq!(
        raw_bytes(&database_b),
        before,
        "a refused brain_id must never trigger a migration write"
    );
    assert_eq!(raw_schema_version(&database_b), 3);
    assert!(
        !safety_copy_path(&database_b).exists(),
        "ACTION-0058 D4: a refusal before the binding check must never create a safety copy"
    );
}

/// Refusal 2 — a v3 index whose source binding disagrees with the catalogue
/// is refused without migrating, exactly as the current-schema legacy case
/// already is.
#[test]
fn a_v3_index_with_a_disagreeing_binding_is_refused_without_migrating() {
    let (temp, paths) = sandbox();
    let root = temp.path().join("racine-v3-mismatch");
    fs::create_dir_all(&root).unwrap();
    fs::write(root.join("fichier.txt"), b"synthetique").unwrap();

    let brain = register(&paths, &root);
    refresh_map(&paths, &brain).expect("refresh");
    let database = paths.brain_map_database(&brain.brain_id);
    downgrade_to_schema_v3(&database);
    let before = raw_bytes(&database);

    let other_source = BrainRecord {
        source_ref: uuid::Uuid::new_v4().to_string(),
        ..brain.clone()
    };
    for outcome in [
        open_map(&paths, &other_source).map(|_| ()),
        refresh_map(&paths, &other_source).map(|_| ()),
    ] {
        outcome.expect_err("a disagreeing source binding on a v3 file must be refused");
    }
    assert_eq!(
        raw_bytes(&database),
        before,
        "a refused binding must never trigger a migration write"
    );
    assert_eq!(raw_schema_version(&database), 3);
    assert!(
        !safety_copy_path(&database).exists(),
        "ACTION-0058 D4: a refusal before the binding check must never create a safety copy"
    );
}

/// Refusal 3 — a schema newer than this build knows is refused, never
/// migrated backward and never guessed at, whether or not the brain/binding
/// would otherwise have matched.
#[test]
fn a_future_schema_is_refused_and_never_migrated_backward() {
    let (temp, paths) = sandbox();
    let root = temp.path().join("racine-futur");
    fs::create_dir_all(&root).unwrap();
    fs::write(root.join("fichier.txt"), b"synthetique").unwrap();

    let brain = register(&paths, &root);
    refresh_map(&paths, &brain).expect("refresh");
    let database = paths.brain_map_database(&brain.brain_id);
    {
        let connection = rusqlite::Connection::open(&database).unwrap();
        connection
            .execute_batch("PRAGMA user_version = 5;")
            .unwrap();
    }
    let before = raw_bytes(&database);

    for outcome in [
        open_map(&paths, &brain).map(|_| ()),
        refresh_map(&paths, &brain).map(|_| ()),
        rebuild_map(&paths, &brain).map(|_| ()),
    ] {
        let error = outcome.expect_err("an unknown future schema must be refused");
        assert!(
            error.to_string().starts_with("map_index_incompatible"),
            "unexpected motif: {error}"
        );
    }
    assert_eq!(
        raw_bytes(&database),
        before,
        "a refused future schema must never be touched, let alone migrated backward"
    );
    assert_eq!(raw_schema_version(&database), 5);
    assert!(
        !safety_copy_path(&database).exists(),
        "ACTION-0058 D4: a future/unknown schema must never create a safety copy"
    );
}

// -- `ACTION-0058` D4 / `DEC-0013` B — `M-B`: quiesce, safety copy, restore --

/// The D4 proof `ACTION-0058` demands in full, in one coherent scenario: a
/// **real** committed write sitting only in the `-wal` file (never
/// checkpointed into `main.db`) is present when migration starts; the
/// migration itself is made to fail **after** the safety copy was taken and
/// migration had begun (the same real schema-object obstruction D2 already
/// uses: a `TABLE` named `idx_nodes_stable_key`); the failure restores the
/// **entire** v3 index — including the write that lived only in `-wal` a
/// moment before, proving the quiesce genuinely folded it into the copy —
/// and, the obstruction removed, a retry succeeds cleanly.
#[test]
fn d4_a_wal_pending_write_is_captured_and_restored_on_injected_migration_failure() {
    let (temp, paths) = sandbox();
    let root = temp.path().join("racine-v3-wal");
    fs::create_dir_all(&root).unwrap();
    fs::write(root.join("avant.txt"), b"synthetique").unwrap();

    let brain = register(&paths, &root);
    refresh_map(&paths, &brain).expect("first refresh builds a real v4 index");
    let database = paths.brain_map_database(&brain.brain_id);
    downgrade_to_schema_v3(&database);

    // Obstruct the exact schema object the migration will try to create —
    // both `ALTER TABLE`s inside the transaction will still succeed first,
    // so this is a failure genuinely after mutation has begun, not merely
    // a refusal before anything happened. Done on a short-lived connection,
    // closed immediately, so it never holds the file open.
    {
        let obstruction = rusqlite::Connection::open(&database).expect("obstruct");
        obstruction
            .execute_batch("CREATE TABLE idx_nodes_stable_key (blocker INTEGER);")
            .expect("obstruction");
    }

    // A write left committed ONLY in `-wal`: this connection is kept open
    // (never closed, never dropped) for the rest of the setup, which is
    // exactly what stops SQLite's own "last connection closes" checkpoint
    // from folding it into `main.db` before the migration flow runs.
    let raw_writer = rusqlite::Connection::open(&database).expect("raw writer");
    raw_writer
        .execute_batch("PRAGMA journal_mode=WAL;")
        .expect("wal mode");
    raw_writer
        .execute(
            "UPDATE nodes SET seen = 1 WHERE relative_path = 'avant.txt'",
            [],
        )
        .expect("wal-pending write");
    let wal_path = {
        let mut p = database.as_os_str().to_os_string();
        p.push("-wal");
        PathBuf::from(p)
    };
    assert!(
        fs::metadata(&wal_path).map(|m| m.len()).unwrap_or(0) > 0,
        "the setup is only meaningful if the write really is WAL-pending, not yet in main.db"
    );

    let error = open_map(&paths, &brain).expect_err("the obstructed migration must fail");
    assert!(
        matches!(error, MapError::Sqlite(_)),
        "expected the real SQL collision to surface, got {error:?}"
    );

    // Full restoration: schema back to v3, and — the point of this test —
    // the write that lived only in `-wal` survived, because quiescing
    // before the safety copy folded it in.
    assert_eq!(
        raw_schema_version(&database),
        3,
        "a failed migration must leave user_version at 3"
    );
    assert!(
        !safety_copy_path(&database).exists(),
        "the transient safety copy must not survive a settled restoration"
    );
    let (_, rows) = logical_snapshot(&database);
    let avant = rows
        .iter()
        .find(|(_, path, _)| path == "avant.txt")
        .expect("avant.txt row");
    assert!(
        avant.2,
        "seen must survive the restoration — proof the WAL-pending write was \
         captured by the safety copy before the migration ever touched the schema"
    );

    drop(raw_writer);

    // The obstruction removed, a retry on the very same (now restored) file
    // succeeds cleanly.
    {
        let unblock = rusqlite::Connection::open(&database).expect("unblock");
        unblock
            .execute_batch("DROP TABLE idx_nodes_stable_key;")
            .expect("remove obstruction");
    }
    let report = open_map(&paths, &brain).expect("migration now succeeds");
    assert_eq!(report.schema_version, crate::map::store::MAP_SCHEMA_VERSION);
    let store = open_store(&paths, &brain).expect("open after retry");
    let node_id = store.resolve_path("avant.txt").unwrap().unwrap();
    assert!(
        store.index.node(node_id).unwrap().unwrap().seen,
        "seen must still be true after the successful retry"
    );
}

/// A checkpoint that cannot fully complete — a concurrent connection holding
/// an open read transaction, blocking `TRUNCATE` — refuses the migration
/// before any safety copy is taken and before a single schema-altering
/// statement runs. `ACTION-0058`: "busy/quiescence impossible ⇒ refus sans
/// migration et sans backup trompeur".
#[test]
fn d4_a_busy_checkpoint_refuses_without_migrating_or_copying() {
    let (temp, paths) = sandbox();
    let root = temp.path().join("racine-v3-busy");
    fs::create_dir_all(&root).unwrap();
    fs::write(root.join("fichier.txt"), b"synthetique").unwrap();

    let brain = register(&paths, &root);
    refresh_map(&paths, &brain).expect("refresh");
    let database = paths.brain_map_database(&brain.brain_id);
    downgrade_to_schema_v3(&database);
    // A reader's snapshot only holds a `TRUNCATE` checkpoint back if there is
    // something for it to hold back: the read transaction has to start
    // BEFORE a write lands frames in `-wal` that the reader's snapshot still
    // needs. An empty WAL checkpoints trivially regardless of readers.
    let reader = rusqlite::Connection::open(&database).expect("reader");
    reader
        .execute_batch("PRAGMA journal_mode=WAL; BEGIN; SELECT COUNT(*) FROM nodes;")
        .expect("open read transaction before any pending write exists");
    {
        let writer = rusqlite::Connection::open(&database).expect("writer");
        writer
            .execute_batch("PRAGMA journal_mode=WAL;")
            .expect("wal mode");
        writer
            .execute(
                "UPDATE nodes SET seen = 1 WHERE relative_path = 'fichier.txt'",
                [],
            )
            .expect("a write the reader's older snapshot still needs");
    }
    let before = logical_snapshot(&database);

    let error = open_map(&paths, &brain).expect_err("a busy checkpoint must refuse the migration");
    assert!(
        matches!(&error, MapError::MigrationUnavailable(reason) if reason.contains("quiesce_busy")),
        "expected a quiesce_busy refusal, got {error:?}"
    );
    assert!(
        error.to_string().starts_with("map_migration_unavailable"),
        "unexpected motif: {error}"
    );

    reader.execute_batch("ROLLBACK;").ok();
    drop(reader);

    assert_eq!(
        logical_snapshot(&database),
        before,
        "a refused busy checkpoint must not change any row or the schema version"
    );
    assert!(
        !safety_copy_path(&database).exists(),
        "a busy checkpoint must never reach the safety-copy step"
    );
}

/// The safety copy's destination is blocked by a real filesystem obstacle (a
/// directory sitting exactly where the copy would go) — `fs::copy` fails,
/// and the migration is refused before a single schema-altering statement
/// runs. The quiesce itself may still have merged `-wal` into `main.db`
/// (harmless — same logical content), so this test compares logical state,
/// not raw bytes.
#[test]
fn d4_a_failed_safety_copy_refuses_without_migrating() {
    let (temp, paths) = sandbox();
    let root = temp.path().join("racine-v3-copyfail");
    fs::create_dir_all(&root).unwrap();
    fs::write(root.join("fichier.txt"), b"synthetique").unwrap();

    let brain = register(&paths, &root);
    refresh_map(&paths, &brain).expect("refresh");
    let database = paths.brain_map_database(&brain.brain_id);
    downgrade_to_schema_v3(&database);
    let before = logical_snapshot(&database);

    // A directory where the safety copy must land: `fs::copy` cannot
    // overwrite a directory with a file.
    fs::create_dir(safety_copy_path(&database)).expect("obstruct the copy destination");

    let error =
        open_map(&paths, &brain).expect_err("a failed safety copy must refuse the migration");
    assert!(
        matches!(&error, MapError::MigrationUnavailable(reason) if reason.contains("safety copy failed")),
        "expected a safety-copy refusal, got {error:?}"
    );

    assert_eq!(
        logical_snapshot(&database),
        before,
        "a refused safety copy must not change any row or the schema version"
    );
}

/// `ACTION-0059` D6 — the safety copy must survive past a successful SQL
/// migration: `BrainIndex::finish_open_existing`'s own canonical-contract
/// validation can still refuse a file the DDL alone already turned into a
/// structurally valid v4 schema. This test corrupts `build_complete` — a
/// canonical metadata key `migrate_previous_schema` never writes or reads —
/// so the `v3 → v4` DDL genuinely succeeds and only the validation step
/// afterwards fails, proving the fix restores the v3 file in full rather
/// than leaving a migrated-but-rejected v4 file with no safety copy left to
/// recover from. This is exactly the scenario the previous delivery
/// (`0daf342f`) got wrong: it deleted the safety copy immediately after
/// `migrate_previous_schema()` succeeded, before this later validation ran.
#[test]
fn d6_a_post_migration_validation_failure_restores_the_v3_index_in_full() {
    let (temp, paths) = sandbox();
    let root = temp.path().join("racine-v3-validation");
    fs::create_dir_all(&root).unwrap();
    fs::write(root.join("avant.txt"), b"synthetique").unwrap();

    let brain = register(&paths, &root);
    refresh_map(&paths, &brain).expect("first refresh builds a real v4 index");
    let database = paths.brain_map_database(&brain.brain_id);
    let file_id = id_of(&paths, &brain, "avant.txt");
    {
        let store = BrainIndex::open_existing(&database, true).expect("writable store");
        assert!(store.index.mark_seen(file_id).expect("mark seen"));
    }

    let (index_id_before, revision_before) = {
        let store = BrainIndex::open_existing(&database, false).expect("read v4 state");
        let identity = store.index.identity().expect("identity");
        (identity.index_id, identity.revision)
    };

    downgrade_to_schema_v3(&database);
    // Corrupt a canonical invariant the migration never touches:
    // `build_complete` is checked by `BrainIndex::is_built()`, part of
    // `finish_open_existing`'s validation, never written or read by
    // `migrate_previous_schema` itself.
    {
        let connection = rusqlite::Connection::open(&database).unwrap();
        connection
            .execute(
                "UPDATE schema_meta SET value = 'no' WHERE key = 'build_complete'",
                [],
            )
            .unwrap();
    }
    let before = logical_snapshot(&database);

    let error = open_map(&paths, &brain).expect_err(
        "the SQL migration must succeed but the canonical validation must still refuse",
    );
    assert!(
        error.to_string().starts_with("map_index_incompatible"),
        "unexpected motif: {error}"
    );

    // Full restoration: the file is exactly the v3 it was, corrupted
    // invariant included — restoring undoes this attempt, it does not
    // repair the fixture.
    assert_eq!(
        raw_schema_version(&database),
        3,
        "a post-migration validation failure must still restore v3"
    );
    assert_eq!(
        logical_snapshot(&database),
        before,
        "every node and seen flag must survive the restoration unchanged"
    );
    {
        let restored = rusqlite::Connection::open(&database).unwrap();
        let restored_index_id: String = restored
            .query_row(
                "SELECT value FROM schema_meta WHERE key = 'index_id'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        let restored_revision: u64 = restored
            .query_row(
                "SELECT value FROM schema_meta WHERE key = 'index_revision'",
                [],
                |row| row.get::<_, String>(0),
            )
            .unwrap()
            .parse()
            .unwrap();
        assert_eq!(restored_index_id, index_id_before, "index_id must survive");
        assert_eq!(restored_revision, revision_before, "revision must not move");
        let source_kind: String = restored
            .query_row(
                "SELECT value FROM schema_meta WHERE key = 'source_kind'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        let source_ref: String = restored
            .query_row(
                "SELECT value FROM schema_meta WHERE key = 'source_ref'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(source_kind, "REAL_ROOT", "the binding must survive intact");
        assert_eq!(
            source_ref, brain.source_ref,
            "the binding must survive intact"
        );
    }
    assert!(
        !safety_copy_path(&database).exists(),
        "the transient safety copy must be cleaned up after a successful restoration"
    );

    // Repair the fixture's invariant, exactly as a real recovery would fix
    // whatever made validation fail, and retry.
    {
        let connection = rusqlite::Connection::open(&database).unwrap();
        connection
            .execute(
                "UPDATE schema_meta SET value = '1' WHERE key = 'build_complete'",
                [],
            )
            .unwrap();
    }
    let report = open_map(&paths, &brain).expect("a repaired retry must migrate to v4 cleanly");
    assert_eq!(report.schema_version, crate::map::store::MAP_SCHEMA_VERSION);
    assert_eq!(report.index_id, index_id_before);
    assert_eq!(report.revision, revision_before);
    assert!(
        !safety_copy_path(&database).exists(),
        "a successful migration must not leave its safety copy behind"
    );
}
