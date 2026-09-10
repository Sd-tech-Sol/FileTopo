//! TASK-0031 L1-L9: real scanner, SQLite and bounded product projection.
use super::*;

fn setup() -> (tempfile::TempDir, SandboxPaths, BrainRecord) {
    let temp = tempfile::tempdir().unwrap();
    let paths = SandboxPaths::under(temp.path().join("sandbox"));
    let brain = BrainRecord::frozen_by_id("brain-alpha").unwrap();
    (temp, paths, brain)
}

struct UnavailableSource {
    original: PathBuf,
    held: PathBuf,
}
impl UnavailableSource {
    fn hold(paths: &SandboxPaths, brain: &BrainRecord) -> Self {
        let original = fixtures::fixture_root(&paths.fixtures, brain.source_fixture().unwrap().id);
        let held = paths.fixtures.join("task0031-held-source");
        let boundary = paths.fixtures.canonicalize().unwrap();
        assert!(original.canonicalize().unwrap().starts_with(&boundary));
        assert_eq!(held.parent().unwrap().canonicalize().unwrap(), boundary);
        assert!(!held.exists());
        std::fs::rename(&original, &held).unwrap();
        Self { original, held }
    }
}
impl Drop for UnavailableSource {
    fn drop(&mut self) {
        std::fs::rename(&self.held, &self.original).expect("restore synthetic source");
    }
}

fn state(paths: &SandboxPaths, brain: &BrainRecord) -> (MapOpenReport, String, serde_json::Value) {
    let report = open_map(paths, brain).unwrap();
    let digest = open_store(paths, brain)
        .unwrap()
        .reconstructible_digest()
        .unwrap();
    let projection = view(paths, brain, None, None).unwrap();
    assert!(projection.nodes.len() + projection.aggregates.len() <= 512);
    (report, digest, serde_json::to_value(projection).unwrap())
}

#[test]
fn l1_l4_l5_open_without_source_and_failed_publications_preserve_last_good() {
    let (_temp, paths, brain) = setup();
    prepare_synthetic_source(&paths, &brain).unwrap();
    refresh_map(&paths, &brain).unwrap();
    let before = state(&paths, &brain);
    {
        let _restore = UnavailableSource::hold(&paths, &brain);
        assert_eq!(state(&paths, &brain), before);
        assert!(!before.0.source_read);
        assert_eq!(before.0.freshness, "UNKNOWN");
        assert!(refresh_map(&paths, &brain).is_err());
        assert_eq!(state(&paths, &brain), before);
        assert!(rebuild_map(&paths, &brain).is_err());
        assert_eq!(state(&paths, &brain), before);
        assert!(!fixtures::fixture_root(&paths.fixtures, "quasi-empty").exists());
        let node = view(&paths, &brain, None, None).unwrap().root_id;
        assert!(detail(&paths, &brain, &BrainNodeRef::new(&brain.brain_id, node)).is_ok());
    }
    assert!(fixtures::fixture_root(&paths.fixtures, "quasi-empty").is_dir());
}

#[test]
fn l2_missing_index_open_creates_neither_source_nor_partial_index() {
    let (_temp, paths, brain) = setup();
    assert!(matches!(
        open_map(&paths, &brain),
        Err(MapError::NotBuilt(_))
    ));
    assert!(!paths.fixtures.exists());
    assert!(!paths.brains.exists());
    assert!(refresh_map(&paths, &brain).is_err());
    assert!(!paths.fixtures.exists());
    assert!(!paths.brains.exists());
}

#[test]
fn l3_l5_l7_l8_l9_explicit_publications_are_read_only_bounded_and_isolated() {
    let (_temp, paths, brain) = setup();
    let gamma = BrainRecord::frozen_by_id("brain-gamma").unwrap();
    prepare_synthetic_source(&paths, &brain).unwrap();
    let first = refresh_map(&paths, &brain).unwrap();
    refresh_map(&paths, &gamma).unwrap();
    let gamma_before = state(&paths, &gamma);
    assert_ne!(first.index_id, gamma_before.0.index_id);
    assert_ne!(
        paths.brain_map_database(&brain.brain_id),
        paths.brain_map_database(&gamma.brain_id)
    );
    let root = fixtures::fixture_root(&paths.fixtures, "quasi-empty");
    // The test, not FileTopo, changes only its synthetic source.
    std::fs::write(root.join("task0031-added.txt"), "synthetic new file").unwrap();
    let fingerprint = fixtures::fingerprint(&root).unwrap();
    let refreshed = refresh_map(&paths, &brain).unwrap();
    assert_eq!(refreshed.state, "REFRESHED");
    assert_eq!(refreshed.index_id, first.index_id);
    assert_eq!(refreshed.revision, first.revision + 1);
    assert_eq!(refreshed.node_count, first.node_count + 1);
    assert_eq!(refreshed.fingerprint_before, Some(fingerprint.clone()));
    assert_eq!(refreshed.fingerprint_after, Some(fingerprint.clone()));
    assert_eq!(refreshed.layout_invocations, 0);
    assert!(
        view(&paths, &brain, None, None)
            .unwrap()
            .nodes
            .iter()
            .any(|n| n.name == "task0031-added.txt")
    );
    assert_eq!(state(&paths, &gamma), gamma_before);
    let rebuilt = rebuild_map(&paths, &brain).unwrap();
    assert_eq!(rebuilt.state, "REBUILT");
    assert_eq!(rebuilt.index_id, first.index_id);
    assert_eq!(rebuilt.revision, refreshed.revision + 1);
    assert_eq!(
        rebuilt.reconstructible_digest,
        refreshed.reconstructible_digest
    );
    assert_eq!(rebuilt.fingerprint_before, Some(fingerprint.clone()));
    assert_eq!(rebuilt.fingerprint_after, Some(fingerprint.clone()));
    assert_eq!(fixtures::fingerprint(&root).unwrap(), fingerprint);
    assert_eq!(state(&paths, &gamma), gamma_before);
    state(&paths, &brain);
    assert!(!paths.catalog_database().exists());
    assert!(!paths.brain_relations_database(&brain.brain_id).exists());
    assert!(
        !paths
            .brain_content_signals_database(&brain.brain_id)
            .exists()
    );
}

#[test]
fn l4_l5_cancel_and_sql_failure_roll_back_corpus_metadata_and_revision() {
    let (_temp, paths, brain) = setup();
    prepare_synthetic_source(&paths, &brain).unwrap();
    refresh_map(&paths, &brain).unwrap();
    let before = state(&paths, &brain);
    assert!(publish_map(&paths, &brain, "REFRESHED", || true).is_err());
    assert_eq!(state(&paths, &brain), before);
    let database = paths.brain_map_database(&brain.brain_id);
    let connection = rusqlite::Connection::open(&database).unwrap();
    // Real SQLite abort after DELETE and partial INSERT, not a mocked return value.
    connection.execute_batch("CREATE TRIGGER task0031_fail BEFORE INSERT ON nodes WHEN NEW.id = 3 BEGIN SELECT RAISE(ABORT, 'task0031-injected-index-failure'); END;").unwrap();
    for operation in [refresh_map, rebuild_map] {
        assert!(matches!(
            operation(&paths, &brain),
            Err(MapError::Sqlite(_))
        ));
        assert_eq!(state(&paths, &brain), before);
    }
    connection
        .execute_batch("DROP TRIGGER task0031_fail;")
        .unwrap();
    let mut store = BrainIndex::open_existing(&database, true).unwrap();
    // Validation failure before any publication must also keep the last good state.
    assert!(
        store
            .replace(
                &brain.brain_id,
                super::super::brain_index::SourceStamp {
                    kind: brain.source_kind,
                    source_ref: &brain.source_ref,
                    label: "synthetic",
                },
                &[],
                &[],
                0,
            )
            .is_err()
    );
    drop(store);
    assert_eq!(state(&paths, &brain), before);
    rebuild_map(&paths, &brain).unwrap();
    assert_eq!(
        open_map(&paths, &brain).unwrap().revision,
        before.0.revision + 1
    );
}

#[test]
fn incompatible_future_schema_and_foreign_brain_are_never_repaired_silently() {
    let (_temp, paths, brain) = setup();
    prepare_synthetic_source(&paths, &brain).unwrap();
    refresh_map(&paths, &brain).unwrap();
    let database = paths.brain_map_database(&brain.brain_id);
    let connection = rusqlite::Connection::open(&database).unwrap();
    connection
        .execute_batch("PRAGMA user_version=999;")
        .unwrap();
    drop(connection);
    let bytes = std::fs::read(&database).unwrap();
    for result in [
        open_map(&paths, &brain).map(|_| ()),
        refresh_map(&paths, &brain).map(|_| ()),
        rebuild_map(&paths, &brain).map(|_| ()),
    ] {
        assert!(matches!(result, Err(MapError::IndexIncompatible(_))));
    }
    assert_eq!(std::fs::read(&database).unwrap(), bytes);
    let connection = rusqlite::Connection::open(&database).unwrap();
    connection.execute_batch("PRAGMA user_version=3; UPDATE schema_meta SET value='brain-gamma' WHERE key='brain_id';").unwrap();
    drop(connection);
    let bytes = std::fs::read(&database).unwrap();
    assert!(matches!(
        open_map(&paths, &brain),
        Err(MapError::BrainMismatch { .. })
    ));
    assert!(matches!(
        refresh_map(&paths, &brain),
        Err(MapError::BrainMismatch { .. })
    ));
    assert!(matches!(
        rebuild_map(&paths, &brain),
        Err(MapError::BrainMismatch { .. })
    ));
    assert_eq!(std::fs::read(&database).unwrap(), bytes);
}
