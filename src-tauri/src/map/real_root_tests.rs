//! `TASK-0032` `RR1`-`RR8`: the real-root contract, on real folders.
//!
//! Every tree in this file is created by the test that reads it, in a
//! `tempfile` directory, and destroyed with it. **No personal brain, no
//! personal folder, no data that outlives the process** — `DEC-0033` and the
//! stop point `AGENTS.md` reserves to Sébastien.
//!
//! The scanner and SQLite are the real ones; nothing here is a stub.

use super::*;
// This module is compiled inside `commands`, so `super` *is* the command
// surface. Naming it keeps the call sites readable as what they are: the
// product's own doors, not test-only shortcuts.
use super as commands;
use crate::map::brains::{self, BrainCatalog, BrainCatalogView, SourceKind};
use crate::map::source::validate_real_root;
use std::collections::BTreeMap;
use std::fs;

/// A sandbox and a catalogue, laid out as production lays them out.
fn sandbox() -> (tempfile::TempDir, SandboxPaths) {
    let temp = tempfile::tempdir().unwrap();
    // The state root is a *sibling* of the trees the tests register, never
    // their ancestor: `DEC-0033` G would refuse those, which `RR8` proves.
    let paths = SandboxPaths::under(temp.path().join("filetopo-state"));
    (temp, paths)
}

/// A small real tree: Unicode names, more than one level, files with content.
///
/// Deliberately not a fixture: `RR4` has to show the pipeline working on a
/// folder that no frozen plan describes.
fn make_tree(root: &Path) {
    fs::create_dir_all(root.join("Dossier accentué/sous-dossier")).unwrap();
    fs::create_dir_all(root.join("漢字フォルダ")).unwrap();
    fs::write(root.join("racine.txt"), b"contenu synthetique racine").unwrap();
    fs::write(
        root.join("Dossier accentué/note éàü.md"),
        b"# note synthetique",
    )
    .unwrap();
    fs::write(
        root.join("Dossier accentué/sous-dossier/profond.txt"),
        b"profondeur deux",
    )
    .unwrap();
    fs::write(root.join("漢字フォルダ/文書.txt"), b"unicode").unwrap();
}

/// Registers a tree the way the product does, minus the native dialogue.
///
/// `commands::register_real_root` is exactly what the picker command calls once
/// the person has chosen: validation, canonicalisation, one catalogue row. The
/// only thing not exercised here is the dialogue itself, which is a Windows GUI
/// and whose automation `TASK-0032` §6 explicitly does not require.
fn register(paths: &SandboxPaths, root: &Path) -> BrainRecord {
    commands::register_real_root(paths, root).expect("registered")
}

fn reload(paths: &SandboxPaths, brain_id: &str) -> BrainRecord {
    BrainCatalog::open(&paths.catalog_database())
        .unwrap()
        .require(brain_id)
        .unwrap()
}

/// Every entry under `root`, with what a read-only scan must not change.
///
/// `atime` is deliberately absent: reading a file *is* allowed to move it, and
/// `TASK-0032` §6 rules it out as normative. Size and content are the load
/// bearing part; `mtime` is compared separately and only where the filesystem
/// reports it.
fn inventory(root: &Path) -> BTreeMap<String, (u64, Option<u64>, Vec<u8>)> {
    fn walk(base: &Path, at: &Path, into: &mut BTreeMap<String, (u64, Option<u64>, Vec<u8>)>) {
        let mut entries = fs::read_dir(at)
            .unwrap()
            .map(|entry| entry.unwrap())
            .collect::<Vec<_>>();
        entries.sort_by_key(std::fs::DirEntry::file_name);
        for entry in entries {
            let path = entry.path();
            let relative = path
                .strip_prefix(base)
                .unwrap()
                .to_string_lossy()
                .replace('\\', "/");
            let metadata = fs::symlink_metadata(&path).unwrap();
            let modified = metadata
                .modified()
                .ok()
                .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|since| since.as_secs());
            if metadata.is_dir() {
                into.insert(relative, (0, modified, Vec::new()));
                walk(base, &path, into);
            } else {
                into.insert(
                    relative,
                    (metadata.len(), modified, fs::read(&path).unwrap()),
                );
            }
        }
    }
    let mut all = BTreeMap::new();
    walk(root, root, &mut all);
    all
}

// ---------------------------------------------------------------------------
// RR1 — catalogue migration
// ---------------------------------------------------------------------------

/// Writes a schema-1 catalogue, byte for byte as `TASK-0018` shipped it.
///
/// Hand-written rather than produced by an old binary, because the old binary
/// is gone; what has to survive the migration is this **shape**, and stating it
/// here is what makes the test fail if the migration silently assumes another.
fn schema_one_catalogue(path: &Path) {
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    let connection = rusqlite::Connection::open(path).unwrap();
    connection
        .execute_batch(
            "CREATE TABLE brains (
                 brain_id TEXT PRIMARY KEY CHECK(length(brain_id) > 0),
                 display_name TEXT NOT NULL CHECK(length(trim(display_name)) > 0),
                 color TEXT NOT NULL CHECK(length(color) = 7 AND substr(color, 1, 1) = '#'),
                 icon TEXT NOT NULL CHECK(length(icon) > 0),
                 source_kind TEXT NOT NULL CHECK(source_kind IN ('SYNTHETIC_FIXTURE')),
                 source_ref TEXT NOT NULL CHECK(length(source_ref) > 0),
                 position INTEGER NOT NULL
             );
             CREATE TABLE catalog_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
             INSERT INTO brains VALUES
                 ('brain-alpha', 'Alpha renommé', '#123456', '★', 'SYNTHETIC_FIXTURE', 'quasi-empty', 1),
                 ('brain-beta',  'Cerveau Bêta',  '#4A4FA8', '■', 'SYNTHETIC_FIXTURE', 'deep', 2),
                 ('brain-gamma', 'Cerveau Gamma', '#9A5A18', '◆', 'SYNTHETIC_FIXTURE', 'quasi-empty', 3);
             INSERT INTO catalog_meta VALUES ('active_brain_id', 'brain-gamma');
             INSERT INTO catalog_meta VALUES ('schema_version', '1');
             PRAGMA user_version=1;",
        )
        .unwrap();
}

#[test]
fn rr1_migrating_a_schema_one_catalogue_preserves_every_brain_and_the_active_one() {
    let (_temp, paths) = sandbox();
    let database = paths.catalog_database();
    schema_one_catalogue(&database);

    let before = {
        let connection = rusqlite::Connection::open(&database).unwrap();
        let mut statement = connection
            .prepare("SELECT brain_id, display_name, color, icon, source_ref, position FROM brains ORDER BY position")
            .unwrap();
        statement
            .query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, String>(3)?,
                    row.get::<_, String>(4)?,
                    row.get::<_, i64>(5)?,
                ))
            })
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap()
    };
    assert_eq!(before.len(), 3);

    {
        let mut catalog = BrainCatalog::open(&database).expect("migrated open");
        // The seed still creates nothing: the three brains are already there.
        assert_eq!(catalog.seed_frozen().unwrap(), 0);

        let after = catalog.list().unwrap();
        assert_eq!(after.len(), 3, "no brain gained or lost by the migration");
        for ((id, name, color, icon, source, position), record) in before.iter().zip(after.iter()) {
            assert_eq!(&record.brain_id, id);
            assert_eq!(&record.display_name, name, "a rename must survive");
            assert_eq!(&record.color, color);
            assert_eq!(&record.icon, icon);
            assert_eq!(&record.source_ref, source);
            assert_eq!(record.position, *position);
            assert_eq!(record.source_kind, SourceKind::SyntheticFixture);
            // Schema 1 had no label; the migration derives it from the handle
            // rather than leaving a `NOT NULL` column empty.
            assert_eq!(&record.source_label, source);
        }
        assert_eq!(
            catalog.active().unwrap().brain_id,
            "brain-gamma",
            "the active brain is non-reconstructible state and must survive"
        );
    }

    let version = || -> i64 {
        rusqlite::Connection::open(&database)
            .unwrap()
            .query_row("PRAGMA user_version", [], |row| row.get(0))
            .unwrap()
    };
    assert_eq!(version(), brains::CATALOG_SCHEMA_VERSION);

    // Idempotent: a second open migrates nothing and changes nothing.
    let snapshot = BrainCatalog::open(&database).unwrap().list().unwrap();
    let mut again = BrainCatalog::open(&database).unwrap();
    assert_eq!(again.seed_frozen().unwrap(), 0);
    assert_eq!(again.list().unwrap(), snapshot);
    assert_eq!(again.active().unwrap().brain_id, "brain-gamma");
    assert_eq!(version(), brains::CATALOG_SCHEMA_VERSION);
}

/// A migration that fails must leave schema 1 exactly as it was — the property
/// that makes `RR1` safe to run on a catalogue somebody cares about.
///
/// Forced by a table named `brains_next` already sitting in the way, so the
/// migration's very first statement fails inside its transaction.
#[test]
fn rr1_a_failed_migration_loses_nothing() {
    let (_temp, paths) = sandbox();
    let database = paths.catalog_database();
    schema_one_catalogue(&database);
    rusqlite::Connection::open(&database)
        .unwrap()
        .execute_batch("CREATE TABLE brains_next (blocked INTEGER);")
        .unwrap();

    assert!(
        BrainCatalog::open(&database).is_err(),
        "the migration must refuse rather than half-apply"
    );

    let connection = rusqlite::Connection::open(&database).unwrap();
    assert_eq!(
        connection
            .query_row("PRAGMA user_version", [], |row| row.get::<_, i64>(0))
            .unwrap(),
        1,
        "a rolled back migration leaves the old version in place"
    );
    assert_eq!(
        connection
            .query_row(
                "SELECT display_name FROM brains WHERE brain_id = 'brain-alpha'",
                [],
                |row| row.get::<_, String>(0)
            )
            .unwrap(),
        "Alpha renommé"
    );
    assert_eq!(
        connection
            .query_row(
                "SELECT value FROM catalog_meta WHERE key = 'active_brain_id'",
                [],
                |row| row.get::<_, String>(0)
            )
            .unwrap(),
        "brain-gamma"
    );
}

// ---------------------------------------------------------------------------
// RR2 — registering scans nothing
// ---------------------------------------------------------------------------

#[test]
fn rr2_registering_a_real_root_creates_a_brain_and_scans_nothing() {
    let (temp, paths) = sandbox();
    let root = temp.path().join("racine-rr2");
    fs::create_dir(&root).unwrap();
    make_tree(&root);
    let before = inventory(&root);

    let brain = register(&paths, &root);

    assert_eq!(brain.source_kind, SourceKind::RealRoot);
    assert!(brain.brain_id.starts_with("real-"));
    assert_eq!(brain.source_label, "racine-rr2");
    assert_eq!(reload(&paths, &brain.brain_id), brain);

    // The source is untouched, byte for byte.
    assert_eq!(inventory(&root), before);

    // No index exists, and opening says so rather than making one.
    assert!(!paths.brain_map_database(&brain.brain_id).exists());
    let error = commands::open_map(&paths, &brain).expect_err("not built");
    assert!(
        error.to_string().starts_with("map_not_built"),
        "unexpected motif: {error}"
    );
    assert!(!paths.brain_map_database(&brain.brain_id).exists());
    assert_eq!(inventory(&root), before, "opening must not scan either");

    // The three frozen brains are still there beside it.
    let catalog = BrainCatalog::open(&paths.catalog_database()).unwrap();
    let all = catalog.list().unwrap();
    assert_eq!(all.len(), 4);
    assert_eq!(
        all.iter().filter(|b| b.is_real_root()).count(),
        1,
        "registering one root creates exactly one brain"
    );
}

/// Cancelling the picker is the caller returning `None` before any of this
/// runs. What has to be true is that **nothing else** on the path can create a
/// partial brain, so the observable state is compared across a refusal.
#[test]
fn rr2_a_refused_root_leaves_no_brain_no_index_and_no_partial_state() {
    let (temp, paths) = sandbox();
    // Seed the catalogue first, so the comparison is about the refusal alone.
    BrainCatalog::open(&paths.catalog_database())
        .unwrap()
        .seed_frozen()
        .unwrap();
    let before = BrainCatalog::open(&paths.catalog_database())
        .unwrap()
        .list()
        .unwrap();

    let file = temp.path().join("pas-un-dossier.txt");
    fs::write(&file, b"synthetique").unwrap();
    let error = commands::register_real_root(&paths, &file).expect_err("a file is not a root");
    assert!(error.to_string().starts_with("map_root_rejected"));

    let absent = temp.path().join("jamais");
    assert!(commands::register_real_root(&paths, &absent).is_err());
    assert!(!absent.exists(), "a refusal must never create the folder");

    assert_eq!(
        BrainCatalog::open(&paths.catalog_database())
            .unwrap()
            .list()
            .unwrap(),
        before
    );
    assert!(!paths.brains.join("real").exists());
}

/// A reparse point as the root is refused where the platform can make one.
///
/// Creating a Windows directory symlink needs Developer Mode or elevation, so a
/// failure to create it **skips** rather than passes: a test that silently
/// proves nothing is worse than one that says it could not run.
#[test]
fn rr2_a_symlink_or_reparse_point_root_is_refused_where_the_platform_allows_one() {
    let (temp, paths) = sandbox();
    let target = temp.path().join("cible");
    fs::create_dir(&target).unwrap();
    let link = temp.path().join("lien");

    #[cfg(windows)]
    let created = std::os::windows::fs::symlink_dir(&target, &link).is_ok();
    #[cfg(not(windows))]
    let created = std::os::unix::fs::symlink(&target, &link).is_ok();

    if !created {
        eprintln!("RR2: symlink creation unavailable on this host; refusal not exercised");
        return;
    }
    let error = commands::register_real_root(&paths, &link).expect_err("a link is not a root");
    assert!(
        error.to_string().contains("lien") || error.to_string().contains("point d'analyse"),
        "unexpected motif: {error}"
    );
    // And the target is still perfectly registrable — the refusal is about the
    // link, not about the directory behind it.
    assert!(commands::register_real_root(&paths, &target).is_ok());
}

// ---------------------------------------------------------------------------
// RR3 — the absolute path never leaves the catalogue
// ---------------------------------------------------------------------------

/// The sentinel string itself is never written to an artefact — only the
/// verdict is. `TASK-0032` §6 is explicit about that, and it is why this test
/// asserts on a boolean rather than printing what it found.
#[test]
fn rr3_no_dto_or_report_ever_carries_the_absolute_path() {
    let (temp, paths) = sandbox();
    let sentinel = format!(
        "FILETOPO_PRIVATE_SENTINEL_{}",
        uuid::Uuid::new_v4().simple()
    );
    let root = temp.path().join(&sentinel);
    fs::create_dir(&root).unwrap();
    make_tree(&root);

    let brain = register(&paths, &root);
    let absolute = fs::canonicalize(&root)
        .unwrap()
        .to_string_lossy()
        .into_owned();
    assert!(
        absolute.contains(&sentinel) && absolute.len() > sentinel.len(),
        "the sentinel must really be part of a longer absolute path"
    );

    let build = commands::refresh_map(&paths, &brain).unwrap();
    let open = commands::open_map(&paths, &brain).unwrap();
    let projection = commands::view(&paths, &brain, None, None).unwrap();
    let catalog_view = {
        let mut catalog = BrainCatalog::open(&paths.catalog_database()).unwrap();
        let active = catalog.active().unwrap();
        BrainCatalogView {
            brains: catalog.list().unwrap(),
            active_brain_id: active.brain_id,
            schema_version: brains::CATALOG_SCHEMA_VERSION,
            catalog_path: paths.relative_name(&paths.catalog_database()),
            seeded: 0,
        }
    };

    // Every DTO this slice can hand to the WebView, serialized exactly as the
    // IPC would serialize it.
    let payloads = [
        serde_json::to_string(&brain).unwrap(),
        serde_json::to_string(&catalog_view).unwrap(),
        serde_json::to_string(&build).unwrap(),
        serde_json::to_string(&open).unwrap(),
        serde_json::to_string(&projection).unwrap(),
        serde_json::to_string(
            &commands::detail(
                &paths,
                &brain,
                &BrainNodeRef::new(&brain.brain_id, projection.root_id),
            )
            .unwrap(),
        )
        .unwrap(),
    ];
    let mut absolute_path_leak = false;
    for payload in &payloads {
        if payload.contains(&absolute) || payload.contains(&absolute.replace('\\', "\\\\")) {
            absolute_path_leak = true;
        }
    }
    assert!(
        !absolute_path_leak,
        "a DTO carried the absolute source path"
    );

    // The refusals are messages too, and a message reaches logs and screens.
    let refusals = [
        commands::register_real_root(&paths, &root.join("Dossier accentué/note éàü.md"))
            .expect_err("a file is not a root")
            .to_string(),
        commands::register_real_root(&paths, &temp.path().join("absent"))
            .expect_err("absent")
            .to_string(),
    ];
    for refusal in &refusals {
        assert!(!refusal.contains(&sentinel), "a refusal named the path");
    }

    // And the one place it *is* allowed to be: the local catalogue.
    let stored = BrainCatalog::open(&paths.catalog_database())
        .unwrap()
        .real_root_path(&brain.brain_id)
        .unwrap()
        .expect("the catalogue keeps the path");
    assert_eq!(stored, fs::canonicalize(&root).unwrap());

    // The index is a file that could be copied between machines; it must carry
    // the opaque binding and not the path.
    let index_bytes = fs::read(paths.brain_map_database(&brain.brain_id)).unwrap();
    let needle = absolute.as_bytes();
    assert!(
        !index_bytes
            .windows(needle.len())
            .any(|window| window == needle),
        "the index database contains the absolute path"
    );
}

// ---------------------------------------------------------------------------
// RR4 — the first real indexing
// ---------------------------------------------------------------------------

#[test]
fn rr4_an_explicit_refresh_indexes_a_real_tree_and_renders_a_bounded_projection() {
    let (temp, paths) = sandbox();
    let root = temp.path().join("racine-rr4");
    fs::create_dir(&root).unwrap();
    make_tree(&root);
    let before = inventory(&root);
    let brain = register(&paths, &root);

    let report = commands::refresh_map(&paths, &brain).unwrap();
    assert_eq!(report.state, "REFRESHED");
    assert_eq!(report.source_kind, SourceKind::RealRoot);
    assert_eq!(report.source_ref, brain.source_ref);
    assert_eq!(report.source_label, "racine-rr4");
    assert!(report.source_read);
    assert!(!report.index_reused, "the first refresh creates the index");
    assert_eq!(report.revision, 1);
    assert!(report.max_depth >= 2, "the tree is deeper than one level");
    // The root, three sub-directories and four files.
    assert_eq!(report.node_count, 8);
    assert!(report.diagnostics.is_empty());

    // `DEC-0033` F, said rather than pretended.
    assert_eq!(report.fingerprint_before, None);
    assert_eq!(report.fingerprint_after, None);
    assert!(!report.read_only_confirmed);
    assert_eq!(report.planned_nodes, 0, "a real tree has no frozen plan");

    // The bounded projection, unchanged — `DEC-0031`.
    let projection = commands::view(&paths, &brain, None, None).unwrap();
    assert_eq!(projection.brain_id, brain.brain_id);
    assert!(projection.nodes.len() + projection.aggregates.len() <= 512);
    assert_eq!(projection.node_count, 8);

    // Relative path resolution and details work on a real tree.
    let reference = BrainNodeRef::new(
        &brain.brain_id,
        commands::open_store(&paths, &brain)
            .unwrap()
            .resolve_path("Dossier accentué/sous-dossier")
            .unwrap()
            .expect("the Unicode path resolves"),
    );
    let detail = commands::detail(&paths, &brain, &reference).unwrap();
    assert_eq!(detail.node.name, "sous-dossier");
    assert_eq!(detail.children.len(), 1);
    assert_eq!(detail.children[0].name, "profond.txt");

    // Brain isolation: the index lives under this brain's own namespace, and
    // nothing FileTopo wrote landed in the source.
    assert!(
        paths
            .brain_map_database(&brain.brain_id)
            .starts_with(paths.brain_root(&brain.brain_id))
    );
    assert_eq!(inventory(&root), before, "the source is untouched");
    assert!(
        !paths
            .brain_map_database(&brain.brain_id)
            .starts_with(fs::canonicalize(&root).unwrap()),
        "no FileTopo state under the analysed root"
    );
}

// ---------------------------------------------------------------------------
// RR5 — opening offline
// ---------------------------------------------------------------------------

/// Moves a real root aside and puts it back whatever the test does.
struct SourceMovedAway {
    original: PathBuf,
    held: PathBuf,
}
impl SourceMovedAway {
    fn hold(root: &Path) -> Self {
        let held = root.with_file_name("racine-deplacee-rr5");
        assert!(!held.exists());
        fs::rename(root, &held).unwrap();
        Self {
            original: root.to_path_buf(),
            held,
        }
    }
}
impl Drop for SourceMovedAway {
    fn drop(&mut self) {
        fs::rename(&self.held, &self.original).expect("restore the test source");
    }
}

#[test]
fn rr5_a_real_root_opens_from_its_index_with_the_source_gone() {
    let (temp, paths) = sandbox();
    let root = temp.path().join("racine-rr5");
    fs::create_dir(&root).unwrap();
    make_tree(&root);
    let brain = register(&paths, &root);
    commands::refresh_map(&paths, &brain).unwrap();

    let before_open = commands::open_map(&paths, &brain).unwrap();
    let before_view = commands::view(&paths, &brain, None, None).unwrap();
    let index_bytes = fs::read(paths.brain_map_database(&brain.brain_id)).unwrap();

    {
        let _restore = SourceMovedAway::hold(&root);
        assert!(!root.exists(), "the source really is gone");

        // Opening reads the index and nothing else — `DEC-0032` A.
        let open = commands::open_map(&paths, &brain).unwrap();
        assert_eq!(open, before_open);
        assert!(!open.source_read);
        assert_eq!(open.revision, before_open.revision);
        assert_eq!(
            commands::view(&paths, &brain, None, None).unwrap(),
            before_view
        );

        // Refresh and rebuild need the source, say so, and change nothing.
        let refresh = commands::refresh_map(&paths, &brain).expect_err("no source");
        assert!(refresh.to_string().starts_with("map_scan_failed"));
        let rebuild = commands::rebuild_map(&paths, &brain).expect_err("no source");
        assert!(rebuild.to_string().starts_with("map_scan_failed"));

        assert_eq!(commands::open_map(&paths, &brain).unwrap(), before_open);
        assert_eq!(
            commands::view(&paths, &brain, None, None).unwrap(),
            before_view
        );
    }

    assert!(root.exists(), "the guard restored the source");
    assert_eq!(
        fs::read(paths.brain_map_database(&brain.brain_id)).unwrap(),
        index_bytes,
        "a failed refresh must not have touched the index"
    );
    // And with the source back, refreshing works again and advances only the
    // revision.
    let after = commands::refresh_map(&paths, &brain).unwrap();
    assert_eq!(after.index_id, before_open.index_id);
    assert_eq!(after.revision, before_open.revision + 1);
}

// ---------------------------------------------------------------------------
// RR6 — read-only
// ---------------------------------------------------------------------------

#[test]
fn rr6_refreshing_and_rebuilding_a_real_root_change_nothing_under_it() {
    let (temp, paths) = sandbox();
    let root = temp.path().join("racine-rr6");
    fs::create_dir(&root).unwrap();
    make_tree(&root);
    let brain = register(&paths, &root);

    let before = inventory(&root);
    assert!(!before.is_empty());

    commands::refresh_map(&paths, &brain).unwrap();
    let after_refresh = inventory(&root);
    commands::rebuild_map(&paths, &brain).unwrap();
    let after_rebuild = inventory(&root);

    // Same relative paths, same sizes, same bytes, same mtimes — one comparison,
    // because the inventory carries all four.
    assert_eq!(after_refresh, before, "refresh changed the source");
    assert_eq!(after_rebuild, before, "rebuild changed the source");

    // Nothing added, nothing removed — stated separately so a failure says
    // which of the two happened.
    let names = |map: &BTreeMap<String, (u64, Option<u64>, Vec<u8>)>| {
        map.keys().cloned().collect::<Vec<_>>()
    };
    assert_eq!(names(&after_rebuild), names(&before));
    assert!(
        !after_rebuild
            .keys()
            .any(|name| name.to_lowercase().contains("filetopo")
                || name.to_lowercase().ends_with(".sqlite")),
        "FileTopo left an artefact under the analysed root"
    );
}

// ---------------------------------------------------------------------------
// RR7 — two brains, one folder
// ---------------------------------------------------------------------------

#[test]
fn rr7_two_brains_on_the_same_real_root_stay_completely_independent() {
    let (temp, paths) = sandbox();
    let root = temp.path().join("racine-rr7");
    fs::create_dir(&root).unwrap();
    make_tree(&root);

    let first = register(&paths, &root);
    let second = register(&paths, &root);

    assert_ne!(first.brain_id, second.brain_id, "two identities");
    assert_ne!(
        first.source_ref, second.source_ref,
        "two bindings, even on one folder"
    );
    assert_eq!(
        BrainCatalog::open(&paths.catalog_database())
            .unwrap()
            .real_root_path(&first.brain_id)
            .unwrap(),
        BrainCatalog::open(&paths.catalog_database())
            .unwrap()
            .real_root_path(&second.brain_id)
            .unwrap(),
        "and they really do read the same folder"
    );

    let first_build = commands::refresh_map(&paths, &first).unwrap();
    let second_build = commands::refresh_map(&paths, &second).unwrap();
    assert_ne!(first_build.index_id, second_build.index_id);
    assert_ne!(
        paths.brain_map_database(&first.brain_id),
        paths.brain_map_database(&second.brain_id)
    );

    let second_before = commands::open_map(&paths, &second).unwrap();
    commands::rebuild_map(&paths, &first).unwrap();
    let first_after = commands::open_map(&paths, &first).unwrap();
    let second_after = commands::open_map(&paths, &second).unwrap();

    assert_eq!(first_after.revision, 2, "only the rebuilt one moved");
    assert_eq!(second_after, second_before);
    assert_eq!(second_after.index_id, second_build.index_id);

    // Neither record carries a path to the interface.
    for record in [&first, &second] {
        let json = serde_json::to_string(record).unwrap();
        assert!(!json.contains("racine-rr7") || record.source_label == "racine-rr7");
        assert!(!json.to_lowercase().contains("temp"));
    }
}

/// `DEC-0033` D — an index whose binding no longer matches is refused, never
/// served under the current brain's name.
#[test]
fn rr7_an_index_built_from_another_binding_is_refused_and_kept() {
    let (temp, paths) = sandbox();
    let root = temp.path().join("racine-binding");
    fs::create_dir(&root).unwrap();
    make_tree(&root);
    let brain = register(&paths, &root);
    commands::refresh_map(&paths, &brain).unwrap();

    let database = paths.brain_map_database(&brain.brain_id);
    let bytes_before = fs::read(&database).unwrap();

    // The same brain, bound to a different source. This is exactly the shape a
    // silent substitution would take.
    let impostor = BrainRecord {
        source_ref: uuid::Uuid::new_v4().to_string(),
        ..brain.clone()
    };
    let error = commands::open_map(&paths, &impostor).expect_err("mismatch");
    assert!(
        error.to_string().starts_with("map_source_mismatch"),
        "unexpected motif: {error}"
    );
    assert_eq!(
        fs::read(&database).unwrap(),
        bytes_before,
        "a refusal must never delete the index"
    );
    // And the real brain still opens.
    assert!(commands::open_map(&paths, &brain).is_ok());
}

// ---------------------------------------------------------------------------
// RR8 — containment
// ---------------------------------------------------------------------------

#[test]
fn rr8_a_root_that_would_swallow_the_filetopo_state_space_is_refused() {
    let (temp, paths) = sandbox();
    // Make the state space real, index and all.
    let inner = temp.path().join("racine-rr8");
    fs::create_dir(&inner).unwrap();
    make_tree(&inner);
    let brain = register(&paths, &inner);
    commands::refresh_map(&paths, &brain).unwrap();
    assert!(paths.brain_map_database(&brain.brain_id).is_file());

    // The parent of both the state space and the tree: scanning it would walk
    // the index itself.
    let error = commands::register_real_root(&paths, temp.path()).expect_err("containment");
    assert!(error.to_string().contains("scannerait"), "motif: {error}");

    // The state space itself, and a directory inside it.
    assert!(commands::register_real_root(&paths, paths.state_root()).is_err());
    assert!(commands::register_real_root(&paths, &paths.brains).is_err());
    assert!(
        commands::register_real_root(&paths, &paths.brain_root(&brain.brain_id)).is_err(),
        "a brain's own storage is not a corpus"
    );

    // Only the four brains that were legitimately created exist.
    assert_eq!(
        BrainCatalog::open(&paths.catalog_database())
            .unwrap()
            .list()
            .unwrap()
            .len(),
        4
    );

    // Directly, on the validator, with the sandbox that production resolves.
    assert!(validate_real_root(&inner, paths.state_root()).is_ok());
}
