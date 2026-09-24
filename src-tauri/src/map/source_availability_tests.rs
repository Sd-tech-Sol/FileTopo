//! `TASK-0042` — source availability and the stale-index contract (`DEC-0040`).
//!
//! Everything here runs against the code the product runs: a real `REAL_ROOT`
//! brain, the real scanner, the real Windows identity, `refresh_map` /
//! `rebuild_map` / `open_map` exactly as the Tauri commands call them. The
//! injections are the ones the pipeline already offers — a `cancelled` closure the
//! scanner calls while it walks, SQLite triggers, an edited catalogue row — never a
//! test-only branch in the product.
//!
//! What is proved, in one sentence: **a root that cannot be read is an observation,
//! not a deletion.** Corpus, `index_id`, revision, journal, seen state and
//! preferences stay byte-for-byte what they were, the last reliable Index keeps
//! being served after a restart, and the same folder put back synchronises without
//! a single invented event.
//!
//! Every tree is created by the test that reads it, under a `tempfile` directory.
//! **No personal brain, no personal folder.**

use super::refresh_incremental_tests::{arm_guard, dump_index_file};
use super::*;
use crate::change_journal::ChangeNature;
use crate::map::brains::BrainCatalog;
use crate::map::source_observation::{self, SourceObservation, SourceReason, SourceState};
use std::cell::Cell;
use std::fs;

fn sandbox() -> (tempfile::TempDir, SandboxPaths) {
    let temp = tempfile::tempdir().unwrap();
    let paths = SandboxPaths::under(temp.path().join("filetopo-state"));
    (temp, paths)
}

fn make_tree(root: &Path) {
    fs::create_dir_all(root.join("dossier/sous")).unwrap();
    fs::create_dir_all(root.join("vide")).unwrap();
    fs::write(root.join("stable.txt"), b"synthetique").unwrap();
    fs::write(root.join("a-modifier.txt"), b"avant").unwrap();
    fs::write(root.join("a-supprimer.txt"), b"bye").unwrap();
    fs::write(root.join("dossier/enfant.txt"), b"enfant").unwrap();
    fs::write(root.join("dossier/sous/profond.txt"), b"profond").unwrap();
}

struct Fixture {
    _temp: tempfile::TempDir,
    paths: SandboxPaths,
    root: PathBuf,
    brain: BrainRecord,
}

impl Fixture {
    fn unindexed(name: &str) -> Self {
        let (temp, paths) = sandbox();
        let root = temp.path().join(name);
        fs::create_dir_all(&root).unwrap();
        make_tree(&root);
        let brain = register_real_root(&paths, &root).expect("registered");
        Self {
            _temp: temp,
            paths,
            root,
            brain,
        }
    }

    fn indexed(name: &str) -> Self {
        let fixture = Self::unindexed(name);
        fixture.refresh();
        fixture
    }

    /// A second brain over its own tree, in the **same** sandbox and catalogue.
    fn second(&self, name: &str) -> (PathBuf, BrainRecord) {
        let root = self._temp.path().join(name);
        fs::create_dir_all(&root).unwrap();
        make_tree(&root);
        let brain = register_real_root(&self.paths, &root).expect("registered");
        (root, brain)
    }

    fn database(&self) -> PathBuf {
        self.paths.brain_map_database(&self.brain.brain_id)
    }

    fn refresh(&self) -> MapBuildReport {
        refresh_map(&self.paths, &self.brain).expect("refresh")
    }

    fn path(&self, relative: &str) -> PathBuf {
        self.root.join(relative)
    }

    /// The root, put somewhere else — the folder is *moved*, not touched.
    fn held(&self) -> PathBuf {
        self.root.with_file_name(format!(
            "{}-deplace",
            self.root.file_name().unwrap().to_string_lossy()
        ))
    }

    fn move_away(&self) {
        fs::rename(&self.root, self.held()).unwrap();
    }

    fn put_back(&self) {
        fs::rename(self.held(), &self.root).unwrap();
    }

    fn opened(&self) -> MapOpenReport {
        open_map(&self.paths, &self.brain).unwrap()
    }

    fn observation(&self) -> SourceObservation {
        self.opened().source_observation
    }

    fn revision(&self) -> u64 {
        self.opened().revision
    }

    fn events(&self) -> Vec<ChangeEvent> {
        let mut after: Option<String> = None;
        let mut collected = Vec::new();
        loop {
            let page = change_journal(&self.paths, &self.brain, &[], after.as_deref(), 50).unwrap();
            collected.extend(page.items);
            match page.next_cursor {
                Some(next) => after = Some(next),
                None => return collected,
            }
        }
    }

    fn dump(&self) -> String {
        dump_index_file(&self.database())
    }

    fn digest(&self) -> String {
        open_store(&self.paths, &self.brain)
            .unwrap()
            .reconstructible_digest()
            .unwrap()
    }

    /// Everything the catalogue holds **except** the observation records: brains,
    /// active brain, preferences, schema markers. What a source observation must
    /// never move.
    fn catalogue_without_observations(&self) -> String {
        catalogue_dump(&self.paths, false)
    }

    fn stored_observation_text(&self) -> Option<String> {
        BrainCatalog::open(&self.paths.catalog_database())
            .unwrap()
            .meta(&format!("source_observation.{}", self.brain.brain_id))
            .unwrap()
    }
}

fn catalogue_dump(paths: &SandboxPaths, with_observations: bool) -> String {
    let connection = rusqlite::Connection::open_with_flags(
        paths.catalog_database(),
        rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY,
    )
    .unwrap();
    let mut out = String::new();
    for query in [
        "SELECT key, value FROM catalog_meta ORDER BY key",
        "SELECT brain_id, display_name, color, icon, source_kind, source_ref, source_label, \
         hex(source_path), position FROM brains ORDER BY brain_id",
    ] {
        let mut statement = connection.prepare(query).unwrap();
        let columns = statement.column_count();
        let rows = statement
            .query_map([], |row| {
                let mut cells = Vec::new();
                for column in 0..columns {
                    let value: rusqlite::types::Value = row.get(column)?;
                    cells.push(format!("{value:?}"));
                }
                Ok(cells.join("|"))
            })
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        for row in rows {
            if with_observations || !row.contains("source_observation.") {
                out.push_str(&row);
                out.push('\n');
            }
        }
    }
    out
}

fn natures(events: &[ChangeEvent]) -> Vec<ChangeNature> {
    events.iter().map(|event| event.nature).collect()
}

fn deleted(events: &[ChangeEvent]) -> usize {
    events
        .iter()
        .filter(|event| event.nature == ChangeNature::Deleted)
        .count()
}

/// Creates a directory link `link -> target`. `false` when the host will not.
fn make_dir_link(link: &Path, target: &Path) -> bool {
    #[cfg(windows)]
    {
        if std::os::windows::fs::symlink_dir(target, link).is_ok() {
            return true;
        }
        // A junction needs no privilege.
        std::process::Command::new("cmd")
            .args(["/C", "mklink", "/J"])
            .arg(link)
            .arg(target)
            .output()
            .map(|output| output.status.success())
            .unwrap_or(false)
    }
    #[cfg(not(windows))]
    {
        std::os::unix::fs::symlink(target, link).is_ok()
    }
}

fn assert_only_the_observation_moved(fixture: &Fixture, before: &str, label: &str) {
    assert_eq!(
        fixture.dump(),
        before,
        "{label}: corpus, journal, revision, seen state and metadata are untouched"
    );
}

// ==========================================================================
// 1 — 2 — 3: UNKNOWN, then SYNCED, then a no-op
// ==========================================================================

#[test]
fn an_index_that_never_recorded_an_observation_answers_unknown_and_stays_usable() {
    let fixture = Fixture::indexed("racine-1");
    // A profile older than this slice: the record does not exist.
    let connection = rusqlite::Connection::open(fixture.paths.catalog_database()).unwrap();
    connection
        .execute(
            "DELETE FROM catalog_meta WHERE key LIKE 'source_observation.%'",
            [],
        )
        .unwrap();
    let observation = fixture.observation();
    assert_eq!(observation.state, SourceState::Unknown);
    assert_eq!(observation.reason, None);
    assert_eq!(observation.observed_unix_ms, None);
    assert_eq!(observation.last_successful_revision, None);
    assert!(
        observation.persisted,
        "an absent record is what the state holds"
    );
    // The Index is untouched and fully readable: the loss of this metadata never
    // invalidates it (`DEC-0040` §4).
    assert!(view(&fixture.paths, &fixture.brain, None, None).is_ok());
    assert!(fixture.opened().node_count > 0);
    // And the next successful Actualiser writes it again.
    assert_eq!(
        fixture.refresh().source_observation.state,
        SourceState::Synced
    );
}

#[test]
fn a_brain_never_indexed_has_nothing_to_serve_and_records_nothing_when_its_first_scan_fails() {
    let fixture = Fixture::unindexed("racine-1b");
    fixture.move_away();
    let error = refresh_map(&fixture.paths, &fixture.brain).expect_err("no source");
    assert!(error.to_string().starts_with("map_scan_failed"));
    assert!(
        fixture.stored_observation_text().is_none(),
        "no Index existed: 'the last reliable Index is kept' would be a sentence about nothing"
    );
    assert!(!fixture.database().exists(), "and no Index appeared");
    assert!(
        read_source_observation(&fixture.paths, &fixture.brain)
            .unwrap_err()
            .to_string()
            .starts_with("map_not_built")
    );
}

#[test]
fn a_baseline_records_synced_with_the_revision_it_produced() {
    let fixture = Fixture::unindexed("racine-2");
    let first = refresh_map(&fixture.paths, &fixture.brain).unwrap();
    assert_eq!(first.application_mode, ApplicationMode::BaselineFull);
    let observation = first.source_observation.clone();
    assert_eq!(observation.state, SourceState::Synced);
    assert_eq!(observation.reason, None);
    assert_eq!(observation.last_successful_revision, Some(first.revision));
    assert_eq!(
        observation.observed_unix_ms,
        observation.last_successful_unix_ms
    );
    assert!(observation.observed_unix_ms.unwrap() > 0);
    assert!(observation.persisted);
    // What `map_open` reads back is exactly what was written.
    assert_eq!(fixture.observation(), observation);
    assert_eq!(
        read_source_observation(&fixture.paths, &fixture.brain).unwrap(),
        observation
    );
}

#[test]
fn every_successful_mode_records_synced_and_a_noop_keeps_the_revision_and_invents_no_event() {
    let fixture = Fixture::indexed("racine-3");
    let baseline_revision = fixture.revision();
    let events = fixture.events();
    let dump = fixture.dump();

    // INCREMENTAL, no change at all: the revision does not move, no event appears.
    let noop = fixture.refresh();
    assert_eq!(noop.application_mode, ApplicationMode::Incremental);
    assert_eq!(noop.revision, baseline_revision);
    assert_eq!(noop.change_summary.total, 0);
    assert_eq!(noop.source_observation.state, SourceState::Synced);
    assert_eq!(
        noop.source_observation.last_successful_revision,
        Some(baseline_revision)
    );
    assert_eq!(fixture.events().len(), events.len());
    assert_eq!(fixture.dump(), dump, "the Index file is byte-identical");

    // INCREMENTAL, a real change.
    fs::write(fixture.path("nouveau.txt"), b"neuf").unwrap();
    let changed = fixture.refresh();
    assert_eq!(changed.application_mode, ApplicationMode::Incremental);
    assert!(changed.revision > baseline_revision);
    assert_eq!(
        changed.source_observation.last_successful_revision,
        Some(changed.revision)
    );

    // EXPLICIT_REBUILD_FULL.
    let rebuilt = rebuild_map(&fixture.paths, &fixture.brain).unwrap();
    assert_eq!(
        rebuilt.application_mode,
        ApplicationMode::ExplicitRebuildFull
    );
    assert_eq!(rebuilt.source_observation.state, SourceState::Synced);
    assert_eq!(
        rebuilt.source_observation.last_successful_revision,
        Some(rebuilt.revision)
    );
}

// ==========================================================================
// 4 — 5 — 6 — 7 — 8: UNAVAILABLE and SOURCE_CHANGED, on the real pipeline
// ==========================================================================

#[test]
fn a_root_renamed_out_of_its_path_is_unavailable_and_nothing_else_moves() {
    let fixture = Fixture::indexed("racine-4");
    let before = fixture.dump();
    let digest = fixture.digest();
    let revision = fixture.revision();
    let synced = fixture.observation();
    fixture.move_away();

    let error = refresh_map(&fixture.paths, &fixture.brain).expect_err("no source");
    assert!(
        error.to_string().starts_with("map_scan_failed"),
        "the historical error is unchanged: {error}"
    );
    // The message reaches the interface's status line: it carries a fixed word, never
    // the operating system's own text, its code, or the path.
    let text = error.to_string();
    assert!(!text.contains("os error"), "{text}");
    assert!(!text.contains("racine-4"), "{text}");
    assert!(
        !text.contains(&fixture.root.to_string_lossy().to_string()),
        "{text}"
    );

    let observation = fixture.observation();
    assert_eq!(observation.state, SourceState::Unavailable);
    assert_eq!(observation.reason, Some(SourceReason::RootNotFound));
    assert!(observation.persisted);
    assert!(observation.observed_unix_ms.unwrap() >= synced.observed_unix_ms.unwrap());
    assert_eq!(
        observation.last_successful_revision,
        Some(revision),
        "the last synchronisation is remembered, not erased"
    );
    assert_eq!(
        observation.last_successful_unix_ms,
        synced.last_successful_unix_ms
    );
    assert_only_the_observation_moved(&fixture, &before, "UNAVAILABLE");
    assert_eq!(fixture.digest(), digest);
    assert_eq!(fixture.revision(), revision);
}

#[test]
fn a_root_that_is_absent_altogether_is_unavailable_and_invents_no_deletion() {
    let fixture = Fixture::indexed("racine-5");
    let events = fixture.events();
    let before = fixture.dump();
    fs::remove_dir_all(&fixture.root).unwrap();

    refresh_map(&fixture.paths, &fixture.brain).expect_err("no source");
    let observation = fixture.observation();
    assert_eq!(observation.state, SourceState::Unavailable);
    assert_eq!(observation.reason, Some(SourceReason::RootNotFound));
    assert_eq!(deleted(&fixture.events()), deleted(&events));
    assert_eq!(fixture.events().len(), events.len());
    assert_only_the_observation_moved(&fixture, &before, "absent root");

    // **Reconstruire** on an absent root is refused just the same, and never empties
    // the Index either.
    rebuild_map(&fixture.paths, &fixture.brain).expect_err("no source");
    assert_eq!(
        fixture.observation().state,
        SourceState::Unavailable,
        "the explicit gesture is an observation too"
    );
    assert_only_the_observation_moved(&fixture, &before, "absent root, rebuild");
}

#[test]
fn a_root_that_became_a_file_is_source_changed() {
    let fixture = Fixture::indexed("racine-6");
    let before = fixture.dump();
    fixture.move_away();
    fs::write(&fixture.root, b"un fichier a la place").unwrap();

    refresh_map(&fixture.paths, &fixture.brain).expect_err("not a directory");
    let observation = fixture.observation();
    assert_eq!(observation.state, SourceState::SourceChanged);
    assert_eq!(observation.reason, Some(SourceReason::RootNotDirectory));
    assert_only_the_observation_moved(&fixture, &before, "root became a file");
}

#[test]
fn a_root_that_became_a_link_is_source_changed() {
    let fixture = Fixture::indexed("racine-7");
    let before = fixture.dump();
    fixture.move_away();
    if !make_dir_link(&fixture.root, &fixture.held()) {
        eprintln!("TASK-0042: link creation unavailable on this host; reparse root not exercised");
        fixture.put_back();
        return;
    }

    refresh_map(&fixture.paths, &fixture.brain).expect_err("a link is not a root");
    let observation = fixture.observation();
    assert_eq!(observation.state, SourceState::SourceChanged);
    // The scanner asks "is it a directory?" before "is it a reparse point?", and a
    // link is not a directory to `symlink_metadata`: which of the two closed reasons
    // names it follows that order, and both are SOURCE_CHANGED. The reparse reason
    // itself is proved on the classifier (`source_observation::tests`).
    assert!(matches!(
        observation.reason,
        Some(SourceReason::RootNotDirectory | SourceReason::RootReparsePoint)
    ));
    assert_only_the_observation_moved(&fixture, &before, "root became a link");
    fs::remove_dir(&fixture.root).unwrap();
}

/// `DEC-0040` §5 and the prompt's §8: a folder deleted and **recreated at the same
/// path** is not the same root, so it is never a silent resumption — and never a
/// mass deletion + creation either.
#[test]
fn a_root_deleted_and_recreated_at_the_same_path_is_source_changed_and_the_old_index_is_served() {
    let fixture = Fixture::indexed("racine-8");
    let before = fixture.dump();
    let events = fixture.events();
    fs::remove_dir_all(&fixture.root).unwrap();
    fs::create_dir_all(&fixture.root).unwrap();
    make_tree(&fixture.root); // the very same content, on a new folder

    let error = refresh_map(&fixture.paths, &fixture.brain).expect_err("a different root");
    assert!(
        error
            .to_string()
            .starts_with("map_refresh_reconcile_refused"),
        "the historical message is unchanged: {error}"
    );
    let observation = fixture.observation();
    assert_eq!(observation.state, SourceState::SourceChanged);
    assert_eq!(observation.reason, Some(SourceReason::RootIdentityChanged));
    assert_only_the_observation_moved(&fixture, &before, "recreated root");
    assert_eq!(fixture.events().len(), events.len(), "no mass creation");
    assert_eq!(deleted(&fixture.events()), 0, "no mass deletion");

    // **Reconstruire** stays the explicit gesture that accepts the new root.
    let rebuilt = rebuild_map(&fixture.paths, &fixture.brain).expect("explicit acceptance");
    assert_eq!(
        rebuilt.application_mode,
        ApplicationMode::ExplicitRebuildFull
    );
    assert_eq!(fixture.observation().state, SourceState::Synced);
}

// ==========================================================================
// 9 — 10: SCAN_INCOMPLETE, by mutating the source *while it is being read*
// ==========================================================================

#[test]
fn a_directory_that_disappears_during_the_scan_is_a_scan_incomplete() {
    let fixture = Fixture::indexed("racine-9");
    let before = fixture.dump();
    fs::write(fixture.path("nouveau.txt"), b"neuf").unwrap();
    let vide = fixture.path("vide");
    let calls = Cell::new(0_u32);
    let error = publish_map(&fixture.paths, &fixture.brain, Gesture::Refresh, || {
        // The scanner asks once per directory and once per entry: after the root's
        // five original entries plus the new one have been listed, `vide` is queued
        // but not yet read. The source changes under its feet.
        calls.set(calls.get() + 1);
        if calls.get() == 8 {
            fs::remove_dir(&vide).unwrap();
        }
        false
    })
    .expect_err("an incomplete scan is refused");
    assert!(
        error.to_string().contains("incomplete scan"),
        "the historical error is unchanged: {error}"
    );

    let observation = fixture.observation();
    assert_eq!(observation.state, SourceState::ScanIncomplete);
    assert_eq!(observation.reason, Some(SourceReason::ScanDiagnostics));
    assert_only_the_observation_moved(&fixture, &before, "incomplete scan");
    assert_eq!(deleted(&fixture.events()), 0);
}

#[test]
fn a_synthetic_fixture_that_drifts_during_the_scan_is_a_scan_incomplete() {
    let (_temp, paths) = sandbox();
    BrainCatalog::open(&paths.catalog_database())
        .unwrap()
        .seed_frozen()
        .unwrap();
    let brain = BrainRecord::frozen_by_id("brain-alpha").expect("alpha");
    let first = build_map(&paths, &brain, false).expect("baseline");
    assert!(first.source_observation.persisted);
    let database = paths.brain_map_database(&brain.brain_id);
    let before = dump_index_file(&database);

    // The fixture's own file, changed *between* the two fingerprints.
    fn some_file(dir: &Path) -> PathBuf {
        for entry in fs::read_dir(dir).unwrap() {
            let path = entry.unwrap().path();
            if path.is_file() {
                return path;
            }
            if path.is_dir() {
                let found = some_file(&path);
                if found.is_file() {
                    return found;
                }
            }
        }
        dir.to_path_buf()
    }
    let spec = brain.source_fixture().unwrap();
    let victim = some_file(&fixtures::fixture_root(&paths.fixtures, spec.id));
    assert!(victim.is_file());
    let original = fs::read(&victim).unwrap();
    let touched = Cell::new(false);
    let error = publish_map(&paths, &brain, Gesture::Refresh, || {
        if !touched.replace(true) {
            let mut changed = original.clone();
            changed.extend_from_slice(b" derive pendant le scan");
            fs::write(&victim, changed).unwrap();
        }
        false
    })
    .expect_err("drift is refused");
    assert!(error.to_string().contains("source changed during scan"));

    let observation = open_map(&paths, &brain).unwrap().source_observation;
    assert_eq!(observation.state, SourceState::ScanIncomplete);
    assert_eq!(observation.reason, Some(SourceReason::FingerprintDrift));
    assert_eq!(dump_index_file(&database), before, "the Index is untouched");
}

#[test]
fn a_synthetic_fixture_whose_root_vanished_is_unavailable_not_an_anonymous_io_error() {
    let (_temp, paths) = sandbox();
    BrainCatalog::open(&paths.catalog_database())
        .unwrap()
        .seed_frozen()
        .unwrap();
    let brain = BrainRecord::frozen_by_id("brain-alpha").expect("alpha");
    build_map(&paths, &brain, false).expect("baseline");
    let spec = brain.source_fixture().unwrap();
    let root = fixtures::fixture_root(&paths.fixtures, spec.id);
    fs::rename(&root, root.with_file_name("alpha-deplace")).unwrap();

    refresh_map(&paths, &brain).expect_err("no fixture");
    let observation = open_map(&paths, &brain).unwrap().source_observation;
    assert_eq!(observation.state, SourceState::Unavailable);
    assert_eq!(observation.reason, Some(SourceReason::RootNotFound));
}

// ==========================================================================
// 11 — APPLY_FAILED, with an exact rollback
// ==========================================================================

#[test]
fn a_sql_failure_while_applying_is_apply_failed_and_rolls_back_exactly() {
    let fixture = Fixture::indexed("racine-11");
    fs::write(fixture.path("nouveau.txt"), b"neuf").unwrap();
    fs::remove_file(fixture.path("a-supprimer.txt")).unwrap();
    arm_guard(&fixture.database());
    let before = fixture.dump();
    let revision = fixture.revision();
    let seen = fixture.opened();

    let connection = rusqlite::Connection::open(fixture.database()).unwrap();
    connection
        .execute_batch(
            "CREATE TRIGGER inject BEFORE INSERT ON change_events
             BEGIN SELECT RAISE(ABORT, 'injected-journal'); END;",
        )
        .unwrap();
    let error = refresh_map(&fixture.paths, &fixture.brain).expect_err("the failure surfaces");
    assert!(error.to_string().contains("injected-journal"), "{error}");

    let observation = fixture.observation();
    assert_eq!(observation.state, SourceState::ApplyFailed);
    assert_eq!(observation.reason, Some(SourceReason::StoreWriteFailed));
    assert!(
        !format!("{observation:?}").contains("injected"),
        "the SQL message never reaches the observation"
    );
    // The trigger is part of the file; drop it to compare the corpus exactly.
    connection.execute_batch("DROP TRIGGER inject;").unwrap();
    assert_only_the_observation_moved(&fixture, &before, "apply failed");
    assert_eq!(fixture.revision(), revision);
    assert_eq!(fixture.opened().index_id, seen.index_id);

    // Fixed, the same refresh applies once and returns to SYNCED.
    let report = fixture.refresh();
    assert_eq!(report.application_mode, ApplicationMode::Incremental);
    assert_eq!(report.source_observation.state, SourceState::Synced);
    assert_eq!(report.revision, revision + 1);
}

#[test]
fn a_refused_reconciliation_after_a_valid_scan_is_apply_failed() {
    let fixture = Fixture::indexed("racine-11b");
    // A stored row that lost its durable identity: the reconciler refuses, after a
    // scan that was perfectly complete.
    rusqlite::Connection::open(fixture.database())
        .unwrap()
        .execute_batch("UPDATE nodes SET stable_key = NULL WHERE name = 'stable.txt';")
        .unwrap();
    let before = fixture.dump();
    refresh_map(&fixture.paths, &fixture.brain).expect_err("refused");
    let observation = fixture.observation();
    assert_eq!(observation.state, SourceState::ApplyFailed);
    assert_eq!(observation.reason, Some(SourceReason::ReconcileRefused));
    assert_only_the_observation_moved(&fixture, &before, "reconcile refused");
}

/// The classification of an application failure is read from the **structure** of the
/// error and stays closed: three kernel-side refusals and the one source-side one.
#[test]
fn every_application_refusal_maps_to_one_closed_state() {
    let cases: [(MapError, SourceState, SourceReason); 6] = [
        (
            MapError::RefreshRootChanged,
            SourceState::SourceChanged,
            SourceReason::RootIdentityChanged,
        ),
        (
            MapError::IdentityCollision,
            SourceState::ApplyFailed,
            SourceReason::IdentityRefused,
        ),
        (
            MapError::IdentityNotBijective,
            SourceState::ApplyFailed,
            SourceReason::IdentityRefused,
        ),
        (
            MapError::RefreshReconcileRefused("reconcile_dangling_parent".into()),
            SourceState::ApplyFailed,
            SourceReason::ReconcileRefused,
        ),
        (
            MapError::RefreshIncrementalRefused("any kernel refusal".into()),
            SourceState::ApplyFailed,
            SourceReason::ApplyRefused,
        ),
        (
            MapError::Sqlite(rusqlite::Error::InvalidQuery),
            SourceState::ApplyFailed,
            SourceReason::StoreWriteFailed,
        ),
    ];
    for (error, state, reason) in cases {
        let refused = Refused::apply(error);
        let failure = refused.observed.expect("classified");
        assert_eq!((failure.state, failure.reason), (state, reason));
    }
    // An unclassified refusal — a binding mismatch, say — records nothing.
    let plain: Refused = MapError::SourceMismatch {
        brain_id: "x".into(),
    }
    .into();
    assert!(plain.observed.is_none());
}

// ==========================================================================
// 12 — a cancellation is not an observation
// ==========================================================================

#[test]
fn a_cancelled_scan_leaves_the_previous_observation_exactly_as_it_was() {
    let fixture = Fixture::indexed("racine-12");
    // Start from a non-trivial previous observation, not from SYNCED.
    fixture.move_away();
    refresh_map(&fixture.paths, &fixture.brain).expect_err("no source");
    let previous = fixture.stored_observation_text();
    assert_eq!(fixture.observation().state, SourceState::Unavailable);
    fixture.put_back();
    let before = fixture.dump();

    let error = publish_map(&fixture.paths, &fixture.brain, Gesture::Refresh, || true)
        .expect_err("cancelled");
    assert!(error.to_string().contains("scan_cancelled"));
    assert_eq!(
        fixture.stored_observation_text(),
        previous,
        "byte for byte: not even the instant moved"
    );
    assert_eq!(fixture.dump(), before);

    // A cancellation in the middle of the walk is the same.
    let calls = Cell::new(0_u32);
    publish_map(&fixture.paths, &fixture.brain, Gesture::Refresh, || {
        calls.set(calls.get() + 1);
        calls.get() > 3
    })
    .expect_err("cancelled mid-scan");
    assert_eq!(fixture.stored_observation_text(), previous);
}

// ==========================================================================
// 13 — 14 — 15 — 16 — 17: the cycle, and everything that must not move
// ==========================================================================

/// **The central proof of `F-032`.** An Index of a real tree; its root made
/// unavailable; the real `refresh_map`; and then *everything* an absence could have
/// damaged, compared: corpus, `index_id`, revision, journal, seen state, the
/// projection, the preferences. Then the very same folder is put back.
#[test]
fn an_unavailable_root_is_an_observation_never_a_batch_of_deletions() {
    let fixture = Fixture::indexed("racine-h");
    // Give every piece of state something to lose: a journal, a partly-seen journal,
    // a non-default preference and a non-default active brain.
    fs::write(fixture.path("nouveau.txt"), b"neuf").unwrap();
    fs::write(fixture.path("a-modifier.txt"), b"apres, plus long").unwrap();
    fixture.refresh();
    let first = fixture.events();
    assert!(first.len() >= 2);
    mark_change_seen(&fixture.paths, &fixture.brain, first[0].event_id).unwrap();
    {
        let mut catalog = BrainCatalog::open(&fixture.paths.catalog_database()).unwrap();
        catalog.set_details_panel_visible(false).unwrap();
        catalog.set_active(&fixture.brain.brain_id).unwrap();
    }

    let index_id = fixture.opened().index_id;
    let revision = fixture.revision();
    let dump = fixture.dump();
    let digest = fixture.digest();
    let events = fixture.events();
    let catalogue = fixture.catalogue_without_observations();
    let projection = serde_json::to_string(
        &view(&fixture.paths, &fixture.brain, None, None).expect("projection"),
    )
    .unwrap();
    let seen = serde_json::to_string(
        &change_journal(&fixture.paths, &fixture.brain, &[], None, 50).unwrap(),
    )
    .unwrap();

    // ---- the whole root becomes inaccessible ----
    fixture.move_away();
    let error = refresh_map(&fixture.paths, &fixture.brain).expect_err("no source");
    assert!(error.to_string().starts_with("map_scan_failed"));
    let unavailable = fixture.observation();
    assert_eq!(unavailable.state, SourceState::Unavailable);
    assert_eq!(unavailable.last_successful_revision, Some(revision));

    // ---- a restart: fresh objects over the same files, the source still absent ----
    let reopened = open_map(&fixture.paths, &fixture.brain).expect("opens without the source");
    assert!(!reopened.source_read);
    assert_eq!(reopened.source_observation, unavailable);

    // ---- everything else, identical ----
    assert_eq!(
        fixture.dump(),
        dump,
        "corpus, journal, revision, seen state"
    );
    assert_eq!(reopened.index_id, index_id);
    assert_eq!(reopened.revision, revision);
    assert_eq!(fixture.digest(), digest);
    assert_eq!(fixture.events().len(), events.len());
    assert_eq!(natures(&fixture.events()), natures(&events));
    assert_eq!(
        deleted(&fixture.events()),
        deleted(&events),
        "no DELETED invented"
    );
    assert_eq!(
        fixture.catalogue_without_observations(),
        catalogue,
        "preferences, active brain, brains: untouched"
    );
    assert_eq!(
        serde_json::to_string(&view(&fixture.paths, &fixture.brain, None, None).unwrap()).unwrap(),
        projection,
        "the projection is byte-identical"
    );
    assert_eq!(
        serde_json::to_string(
            &change_journal(&fixture.paths, &fixture.brain, &[], None, 50).unwrap()
        )
        .unwrap(),
        seen,
        "journal pages, with their seen flags, are identical"
    );

    // ---- the very same folder comes back ----
    fixture.put_back();
    let recovered = fixture.refresh();
    assert_eq!(recovered.application_mode, ApplicationMode::Incremental);
    assert_eq!(recovered.revision, revision, "a no-op: same revision");
    assert_eq!(recovered.change_summary.total, 0);
    assert_eq!(recovered.source_observation.state, SourceState::Synced);
    assert_eq!(recovered.source_observation.reason, None);
    assert_eq!(
        recovered.source_observation.last_successful_revision,
        Some(revision)
    );
    assert_eq!(fixture.observation(), recovered.source_observation);
    assert_eq!(
        fixture.dump(),
        dump,
        "not one invented event, not one row moved"
    );
    assert_eq!(fixture.events().len(), events.len());
    assert_eq!(fixture.opened().index_id, index_id);
}

#[test]
fn a_recovery_with_real_changes_journals_only_those_changes() {
    let fixture = Fixture::indexed("racine-14");
    let revision = fixture.revision();
    let events = fixture.events();
    fixture.move_away();
    refresh_map(&fixture.paths, &fixture.brain).expect_err("no source");
    refresh_map(&fixture.paths, &fixture.brain).expect_err("still no source");
    assert_eq!(
        fixture.events().len(),
        events.len(),
        "two refusals, no event"
    );

    fixture.put_back();
    fs::write(fixture.path("arrive.txt"), b"neuf").unwrap();
    fs::remove_file(fixture.path("a-supprimer.txt")).unwrap();
    let report = fixture.refresh();
    assert_eq!(report.application_mode, ApplicationMode::Incremental);
    assert_eq!(report.source_observation.state, SourceState::Synced);
    assert_eq!(report.revision, revision + 1);
    assert_eq!(
        (
            report.change_summary.created,
            report.change_summary.deleted,
            report.change_summary.total
        ),
        (1, 1, 2),
        "exactly what changed while the source was away, and nothing else"
    );
    let all = fixture.events();
    assert_eq!(all.len(), events.len() + 2);
    assert_eq!(deleted(&all), deleted(&events) + 1);
}

#[test]
fn the_observation_never_moves_a_preference_and_a_success_never_moves_one_either() {
    let fixture = Fixture::indexed("racine-17");
    {
        let catalog = BrainCatalog::open(&fixture.paths.catalog_database()).unwrap();
        catalog.set_details_panel_visible(false).unwrap();
    }
    let catalogue = fixture.catalogue_without_observations();
    for step in 0..3 {
        match step {
            0 => fixture.move_away(),
            1 => fixture.put_back(),
            _ => fs::write(fixture.path("x.txt"), b"x").unwrap(),
        }
        let _ = refresh_map(&fixture.paths, &fixture.brain);
        assert_eq!(
            fixture.catalogue_without_observations(),
            catalogue,
            "step {step}"
        );
    }
    let preferences = BrainCatalog::open(&fixture.paths.catalog_database())
        .unwrap()
        .ui_preferences()
        .unwrap();
    assert!(!preferences.details_panel_visible);
}

// ==========================================================================
// 18 — 19: isolation and persistence
// ==========================================================================

#[test]
fn two_brains_keep_two_separate_observations() {
    let a = Fixture::indexed("racine-18a");
    let (b_root, b) = a.second("racine-18b");
    refresh_map(&a.paths, &b).expect("b baseline");
    let b_before = open_map(&a.paths, &b).unwrap().source_observation;
    let b_dump = dump_index_file(&a.paths.brain_map_database(&b.brain_id));
    assert_eq!(b_before.state, SourceState::Synced);

    a.move_away();
    refresh_map(&a.paths, &a.brain).expect_err("a has no source");
    assert_eq!(a.observation().state, SourceState::Unavailable);
    assert_eq!(
        open_map(&a.paths, &b).unwrap().source_observation,
        b_before,
        "B never heard of A's absence"
    );
    assert_eq!(
        dump_index_file(&a.paths.brain_map_database(&b.brain_id)),
        b_dump
    );

    // And the other way round: B's failure does not touch A's.
    let a_before = a.observation();
    fs::remove_dir_all(&b_root).unwrap();
    refresh_map(&a.paths, &b).expect_err("b has no source");
    assert_eq!(
        open_map(&a.paths, &b).unwrap().source_observation.state,
        SourceState::Unavailable
    );
    assert_eq!(a.observation(), a_before);

    // One key per brain, in the one catalogue — and no new database file.
    let text = catalogue_dump(&a.paths, true);
    assert_eq!(
        text.matches("source_observation.").count(),
        2,
        "exactly one record per brain: {text}"
    );
}

#[test]
fn the_observation_survives_a_restart_and_needs_no_new_database() {
    let fixture = Fixture::indexed("racine-19");
    fixture.move_away();
    refresh_map(&fixture.paths, &fixture.brain).expect_err("no source");
    let written = fixture.observation();
    let databases_before = database_files(&fixture.paths);

    // "Restart": nothing survives but the files. Every handle is dropped and every
    // read reopens the catalogue and the Index from scratch.
    let restarted = SandboxPaths::under(fixture.paths.state_root().to_path_buf());
    let brain = BrainCatalog::open(&restarted.catalog_database())
        .unwrap()
        .require(&fixture.brain.brain_id)
        .unwrap();
    let read = open_map(&restarted, &brain).unwrap().source_observation;
    assert_eq!(read, written);
    assert!(read.persisted);
    assert_eq!(
        read_source_observation(&restarted, &brain).unwrap(),
        written
    );
    assert_eq!(database_files(&restarted), databases_before);
    assert!(
        databases_before
            .iter()
            .all(|name| name.ends_with("/catalog.sqlite") || name.ends_with("/map/index.sqlite")),
        "only the catalogue and the per-brain Index exist: {databases_before:?}"
    );
}

fn database_files(paths: &SandboxPaths) -> Vec<String> {
    fn walk(dir: &Path, into: &mut Vec<String>) {
        let Ok(entries) = fs::read_dir(dir) else {
            return;
        };
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                walk(&path, into);
            } else {
                let name = path.to_string_lossy().replace('\\', "/");
                if name.contains(".sqlite") && !name.ends_with("-wal") && !name.ends_with("-shm") {
                    into.push(name);
                }
            }
        }
    }
    let mut found = Vec::new();
    walk(paths.state_root(), &mut found);
    found.sort();
    let root = paths.state_root().to_string_lossy().replace('\\', "/");
    found
        .into_iter()
        .map(|name| name.replace(&root, ""))
        .collect()
}

// ==========================================================================
// 20 — reading never touches the source
// ==========================================================================

/// A **functional** proof: the catalogue's root blob is replaced by garbage, so any
/// attempt to resolve the root would fail loudly (`SourceUnresolved`) — and both
/// reads still answer.
#[test]
fn opening_and_reading_the_observation_never_resolve_or_stat_the_root() {
    let fixture = Fixture::indexed("racine-20");
    fixture.move_away();
    refresh_map(&fixture.paths, &fixture.brain).expect_err("no source");
    rusqlite::Connection::open(fixture.paths.catalog_database())
        .unwrap()
        .execute(
            "UPDATE brains SET source_path = X'FF00FF' WHERE brain_id = ?1",
            [&fixture.brain.brain_id],
        )
        .unwrap();
    // The control: resolving really would fail now.
    assert!(BrainSource::resolve(&fixture.paths, &fixture.brain).is_err());

    let opened = open_map(&fixture.paths, &fixture.brain).expect("open never resolves");
    assert_eq!(opened.source_observation.state, SourceState::Unavailable);
    assert!(!opened.source_read);
    assert_eq!(
        read_source_observation(&fixture.paths, &fixture.brain).unwrap(),
        opened.source_observation
    );
}

/// A structural guard, like the one `TASK-0041` keeps for the full publication: the
/// three read paths do not name anything that touches a source.
#[test]
fn the_read_paths_do_not_mention_the_source() {
    let commands = include_str!("commands.rs");
    let observation = include_str!("source_observation.rs");
    let body = |text: &str, header: &str, end: &str| -> String {
        let start = text.find(header).unwrap_or_else(|| panic!("{header}"));
        let length = text[start..].find(end).unwrap_or_else(|| panic!("{end}"));
        text[start..start + length]
            .lines()
            .filter(|line| !line.trim_start().starts_with("//"))
            .collect::<Vec<_>>()
            .join("\n")
    };
    let read_side = [
        body(commands, "pub fn open_map(", "\n}\n"),
        body(commands, "pub fn read_source_observation(", "\n}\n"),
        body(observation, "pub(super) fn read(", "\n}\n"),
        body(observation, "fn stored(", "\n}\n"),
        body(observation, "fn decode(", "\n}\n"),
    ];
    for text in &read_side {
        for forbidden in [
            "BrainSource",
            "resolve(",
            "real_root_path",
            "symlink_metadata",
            "fs::metadata",
            ".metadata(",
            "read_dir",
            "scan_tree",
            "probe_root",
            "try_exists",
            "canonicalize",
        ] {
            assert!(
                !text.contains(forbidden),
                "a read path names `{forbidden}`:\n{text}"
            );
        }
    }
}

// ==========================================================================
// 21 — nothing sensitive, ever
// ==========================================================================

#[test]
fn no_observation_carries_a_path_a_key_an_identity_or_an_os_message() {
    let fixture = Fixture::indexed("racine-21-secret");
    let root_text = fixture.root.to_string_lossy().to_string();
    let mut transcripts = Vec::new();

    let mut collect = |label: &str, fixture: &Fixture| {
        let opened = serde_json::to_string(&fixture.opened()).unwrap();
        let observation = serde_json::to_string(&fixture.observation()).unwrap();
        let stored = fixture.stored_observation_text().unwrap_or_default();
        transcripts.push((label.to_string(), opened, observation, stored));
    };
    collect("synced", &fixture);
    fixture.move_away();
    refresh_map(&fixture.paths, &fixture.brain).expect_err("gone");
    collect("unavailable", &fixture);
    fixture.put_back();
    rusqlite::Connection::open(fixture.database())
        .unwrap()
        .execute_batch("UPDATE nodes SET stable_key = NULL WHERE name = 'stable.txt';")
        .unwrap();
    refresh_map(&fixture.paths, &fixture.brain).expect_err("refused");
    collect("apply failed", &fixture);

    let stable_keys: Vec<String> = {
        let connection = rusqlite::Connection::open(fixture.database()).unwrap();
        let mut statement = connection
            .prepare("SELECT stable_key FROM nodes WHERE stable_key IS NOT NULL")
            .unwrap();
        statement
            .query_map([], |row| row.get::<_, String>(0))
            .unwrap()
            .collect::<Result<_, _>>()
            .unwrap()
    };
    assert!(!stable_keys.is_empty());

    let allowed_keys = [
        "state",
        "reason",
        "observedUnixMs",
        "lastSuccessfulRevision",
        "lastSuccessfulUnixMs",
        "persisted",
    ];
    for (label, opened, observation, stored) in &transcripts {
        for text in [opened, observation, stored] {
            assert!(!text.contains(&root_text), "{label}: the absolute path");
            assert!(
                !text.contains("racine-21-secret"),
                "{label}: the folder name"
            );
            assert!(!text.contains("filetopo-state"), "{label}: the state root");
            assert!(!text.contains("os error"), "{label}: an OS message");
            assert!(!text.contains("\\\\"), "{label}: a Windows path");
            for key in &stable_keys {
                assert!(!text.contains(key.as_str()), "{label}: a stable key");
            }
            for forbidden in [
                "fileId", "file_id", "volume", "serial", "stable", "identity",
            ] {
                assert!(
                    !text.to_lowercase().contains(&forbidden.to_lowercase()),
                    "{label}: {forbidden}"
                );
            }
        }
        let value: serde_json::Value = serde_json::from_str(observation).unwrap();
        let mut keys: Vec<&str> = value
            .as_object()
            .unwrap()
            .keys()
            .map(String::as_str)
            .collect();
        keys.sort_unstable();
        let mut expected = allowed_keys.to_vec();
        expected.sort_unstable();
        assert_eq!(keys, expected, "{label}: the exact closed shape");
    }
}

#[test]
fn every_state_and_reason_serialises_to_one_screaming_word() {
    for state in [
        SourceState::Unknown,
        SourceState::Synced,
        SourceState::Unavailable,
        SourceState::SourceChanged,
        SourceState::ScanIncomplete,
        SourceState::ApplyFailed,
    ] {
        let word = serde_json::to_string(&state).unwrap();
        assert!(
            word.trim_matches('"')
                .chars()
                .all(|c| c.is_ascii_uppercase() || c == '_'),
            "{word}"
        );
    }
    assert_eq!(
        serde_json::to_string(&SourceState::SourceChanged).unwrap(),
        "\"SOURCE_CHANGED\""
    );
    assert_eq!(
        serde_json::to_string(&SourceReason::RootMetadataUnavailable).unwrap(),
        "\"ROOT_METADATA_UNAVAILABLE\""
    );
}

// ==========================================================================
// The record itself: loss, corruption, a write that fails, a stale success
// ==========================================================================

#[test]
fn a_corrupt_or_foreign_record_reads_as_unknown_and_never_breaks_the_index() {
    let fixture = Fixture::indexed("racine-c1");
    let key = format!("source_observation.{}", fixture.brain.brain_id);
    for garbage in [
        "not json",
        "{}",
        r#"{"state":"OFFLINE","reason":null,"observedUnixMs":1,"lastSuccessfulRevision":1,"lastSuccessfulUnixMs":1,"persisted":true}"#,
        r#"{"state":"UNAVAILABLE","reason":"SCAN_DIAGNOSTICS","observedUnixMs":1,"lastSuccessfulRevision":1,"lastSuccessfulUnixMs":1,"persisted":true}"#,
    ] {
        BrainCatalog::open(&fixture.paths.catalog_database())
            .unwrap()
            .put_meta(&key, garbage)
            .unwrap();
        assert_eq!(
            fixture.observation().state,
            SourceState::Unknown,
            "{garbage}"
        );
        assert!(fixture.opened().node_count > 0);
        assert!(view(&fixture.paths, &fixture.brain, None, None).is_ok());
    }
}

#[test]
fn a_synced_record_for_another_revision_is_not_believed() {
    let fixture = Fixture::indexed("racine-c2");
    let served = fixture.revision();
    let key = format!("source_observation.{}", fixture.brain.brain_id);
    // The shape a crash between the Index commit and the record write would leave:
    // a synchronisation of an *older* revision next to a newer Index.
    let stale = format!(
        r#"{{"state":"SYNCED","reason":null,"observedUnixMs":5,"lastSuccessfulRevision":{},"lastSuccessfulUnixMs":5,"persisted":true}}"#,
        served + 7
    );
    BrainCatalog::open(&fixture.paths.catalog_database())
        .unwrap()
        .put_meta(&key, &stale)
        .unwrap();
    assert_eq!(fixture.observation().state, SourceState::Unknown);
    // A failure record is judged the same way (`ACTION-0069`, P1b): it was made while the
    // Index served its `lastSuccessfulRevision`, so next to another revision it is not
    // the current observation either. `UNKNOWN`, never `SYNCED`.
    let failed = stale.replace(
        r#""state":"SYNCED","reason":null"#,
        r#""state":"UNAVAILABLE","reason":"ROOT_NOT_FOUND""#,
    );
    BrainCatalog::open(&fixture.paths.catalog_database())
        .unwrap()
        .put_meta(&key, &failed)
        .unwrap();
    assert_eq!(fixture.observation().state, SourceState::Unknown);
    assert_eq!(
        read_source_observation(&fixture.paths, &fixture.brain)
            .unwrap()
            .state,
        SourceState::Unknown
    );
    // Whereas a failure that matches the served revision is believed as recorded…
    let matching = failed.replace(
        &format!(r#""lastSuccessfulRevision":{}"#, served + 7),
        &format!(r#""lastSuccessfulRevision":{served}"#),
    );
    BrainCatalog::open(&fixture.paths.catalog_database())
        .unwrap()
        .put_meta(&key, &matching)
        .unwrap();
    assert_eq!(fixture.observation().state, SourceState::Unavailable);
    // …and one that recorded no success at all (an Index that had none) stays valid.
    let none = matching.replace(
        &format!(r#""lastSuccessfulRevision":{served}"#),
        r#""lastSuccessfulRevision":null"#,
    );
    BrainCatalog::open(&fixture.paths.catalog_database())
        .unwrap()
        .put_meta(&key, &none)
        .unwrap();
    assert_eq!(fixture.observation().state, SourceState::Unavailable);
}

/// `ACTION-0069` P1b, through the same pipeline: a failure is recorded against R, the
/// source comes back and the Index moves to R+1, but the record of that success never
/// reaches the disk. Next to R+1, the old `UNAVAILABLE` is not the current observation.
#[test]
fn a_failure_record_left_next_to_a_newer_revision_is_not_believed() {
    let fixture = Fixture::indexed("racine-c2b");
    let baseline = fixture.revision();
    fixture.move_away();
    refresh_map(&fixture.paths, &fixture.brain).expect_err("no source");
    let unavailable = fixture.observation();
    assert_eq!(unavailable.state, SourceState::Unavailable);
    assert!(unavailable.persisted);
    assert_eq!(unavailable.last_successful_revision, Some(baseline));
    let on_disk = fixture.stored_observation_text();

    // The source returns with a real change; the observation cannot be written.
    fixture.put_back();
    fs::write(fixture.path("nouveau.txt"), b"neuf").unwrap();
    refuse_observation_writes(&fixture);
    let report = fixture.refresh();
    assert_eq!(report.revision, baseline + 1);
    // The simulated crash window: the process is gone, and with it any transient.
    source_observation::lose_transient_as_a_restart_would(&fixture.paths, &fixture.brain.brain_id);
    assert_eq!(
        fixture.stored_observation_text(),
        on_disk,
        "no new record reached the disk"
    );

    let opened = fixture.opened();
    assert_eq!(opened.revision, baseline + 1);
    assert_eq!(opened.source_observation.state, SourceState::Unknown);
    let read = read_source_observation(&fixture.paths, &fixture.brain).unwrap();
    assert_eq!(read.state, SourceState::Unknown);
    assert_eq!(read.reason, None);
}

/// Installs the two triggers that make the catalogue refuse **only** the observation
/// records — nothing else it holds.
fn refuse_observation_writes(fixture: &Fixture) {
    rusqlite::Connection::open(fixture.paths.catalog_database())
        .unwrap()
        .execute_batch(
            "CREATE TRIGGER refuse_insert BEFORE INSERT ON catalog_meta
               WHEN NEW.key LIKE 'source_observation.%'
               BEGIN SELECT RAISE(ABORT, 'no-observation-writes'); END;
             CREATE TRIGGER refuse_update BEFORE UPDATE ON catalog_meta
               WHEN NEW.key LIKE 'source_observation.%'
               BEGIN SELECT RAISE(ABORT, 'no-observation-writes'); END;",
        )
        .unwrap();
}

fn allow_observation_writes(fixture: &Fixture) {
    rusqlite::Connection::open(fixture.paths.catalog_database())
        .unwrap()
        .execute_batch("DROP TRIGGER refuse_insert; DROP TRIGGER refuse_update;")
        .unwrap();
}

/// `ACTION-0069` P1: the source is absent **and** the record of that observation
/// cannot be written. The refresh still fails for the source, nothing but the record
/// is affected, and the interface's next read shows what was really seen — not the
/// `SYNCED` that is still sitting on the disk.
#[test]
fn an_unwritable_failure_record_is_still_the_current_observation_for_the_session() {
    let fixture = Fixture::indexed("racine-p1");
    let before = fixture.dump();
    let digest = fixture.digest();
    let revision = fixture.revision();
    let events = fixture.events();
    let catalogue = fixture.catalogue_without_observations();
    let synced = fixture.observation();
    assert_eq!(synced.state, SourceState::Synced);

    fixture.move_away();
    refuse_observation_writes(&fixture);
    let error = refresh_map(&fixture.paths, &fixture.brain).expect_err("no source");
    assert!(error.to_string().starts_with("map_scan_failed"));
    assert!(!error.to_string().contains("no-observation-writes"));

    // Nothing else moved.
    assert_only_the_observation_moved(&fixture, &before, "unwritable failure record");
    assert_eq!(fixture.digest(), digest);
    assert_eq!(fixture.revision(), revision);
    assert_eq!(natures(&fixture.events()), natures(&events));
    assert_eq!(fixture.catalogue_without_observations(), catalogue);
    // The disk still holds the old SYNCED — that is exactly the trap.
    assert!(
        fixture
            .stored_observation_text()
            .unwrap()
            .contains(r#""state":"SYNCED""#)
    );

    // What the interface reads right after (the same functions Tauri calls).
    for read in [
        read_source_observation(&fixture.paths, &fixture.brain).unwrap(),
        fixture.opened().source_observation,
    ] {
        assert_eq!(read.state, SourceState::Unavailable);
        assert_eq!(read.reason, Some(SourceReason::RootNotFound));
        assert!(!read.persisted, "and it says so");
        assert_eq!(read.last_successful_revision, Some(revision));
        assert_eq!(read.last_successful_unix_ms, synced.last_successful_unix_ms);
        assert!(read.observed_unix_ms >= synced.observed_unix_ms);
        let text = serde_json::to_string(&read).unwrap();
        assert!(!text.contains("no-observation-writes"));
        assert!(!text.contains(&*fixture.root.to_string_lossy()));
    }

    // A second refusal while the write still fails keeps the last success, and still
    // holds one slot, not two.
    refresh_map(&fixture.paths, &fixture.brain).expect_err("still no source");
    let again = read_source_observation(&fixture.paths, &fixture.brain).unwrap();
    assert_eq!(again.state, SourceState::Unavailable);
    assert_eq!(again.last_successful_revision, Some(revision));
    assert!(!again.persisted);

    // The catalogue accepts writes again; the source is still absent.
    allow_observation_writes(&fixture);
    refresh_map(&fixture.paths, &fixture.brain).expect_err("still no source");
    let persisted = read_source_observation(&fixture.paths, &fixture.brain).unwrap();
    assert_eq!(persisted.state, SourceState::Unavailable);
    assert_eq!(persisted.reason, Some(SourceReason::RootNotFound));
    assert!(persisted.persisted);
    assert_eq!(persisted.last_successful_revision, Some(revision));
    // The transient is gone: a "restart" changes nothing now.
    source_observation::lose_transient_as_a_restart_would(&fixture.paths, &fixture.brain.brain_id);
    assert_eq!(
        read_source_observation(&fixture.paths, &fixture.brain).unwrap(),
        persisted
    );
    assert_only_the_observation_moved(&fixture, &before, "after the record could be written");
}

/// After a restart the process-local observation is gone by design: the disk still
/// holds an older `SYNCED` for the *same* revision, which is then all there is to
/// believe. The slot corrects the session, not a crash — this pins that limit.
#[test]
fn a_restart_loses_an_unwritten_failure_and_never_invents_one() {
    let fixture = Fixture::indexed("racine-p1-restart");
    fixture.move_away();
    refuse_observation_writes(&fixture);
    refresh_map(&fixture.paths, &fixture.brain).expect_err("no source");
    assert_eq!(fixture.observation().state, SourceState::Unavailable);
    source_observation::lose_transient_as_a_restart_would(&fixture.paths, &fixture.brain.brain_id);
    let after = fixture.observation();
    // The old record still describes the served revision, so it is what remains.
    assert_eq!(after.state, SourceState::Synced);
    assert!(after.persisted);
}

#[test]
fn a_record_that_cannot_be_written_never_turns_an_applied_index_into_a_failure() {
    let fixture = Fixture::indexed("racine-c3");
    fs::write(fixture.path("nouveau.txt"), b"neuf").unwrap();
    rusqlite::Connection::open(fixture.paths.catalog_database())
        .unwrap()
        .execute_batch(
            "CREATE TRIGGER refuse_insert BEFORE INSERT ON catalog_meta
               WHEN NEW.key LIKE 'source_observation.%'
               BEGIN SELECT RAISE(ABORT, 'no-observation-writes'); END;
             CREATE TRIGGER refuse_update BEFORE UPDATE ON catalog_meta
               WHEN NEW.key LIKE 'source_observation.%'
               BEGIN SELECT RAISE(ABORT, 'no-observation-writes'); END;",
        )
        .unwrap();
    let revision = fixture.revision();

    let report = fixture.refresh();
    assert_eq!(report.change_summary.created, 1, "the Index was applied");
    assert_eq!(report.revision, revision + 1);
    assert_eq!(report.source_observation.state, SourceState::Synced);
    assert!(
        !report.source_observation.persisted,
        "and the report says, honestly, that the record did not stick"
    );
    assert!(!format!("{:?}", report.source_observation).contains("no-observation-writes"));
    // In this process the observation that could not be written is still the one shown,
    // and it says so.
    let session = fixture.observation();
    assert_eq!(session.state, SourceState::Synced);
    assert!(!session.persisted);
    assert_eq!(session.last_successful_revision, Some(revision + 1));
    assert_eq!(fixture.revision(), revision + 1);
    // After a restart the slot is gone. What survives on disk is the *previous* record,
    // and — since its revision is no longer the served one — it is not believed.
    source_observation::lose_transient_as_a_restart_would(&fixture.paths, &fixture.brain.brain_id);
    let restarted = fixture.observation();
    assert_eq!(restarted.state, SourceState::Unknown);
    assert!(restarted.persisted);
    assert_eq!(fixture.revision(), revision + 1);
}

#[test]
fn a_catalogue_that_is_gone_answers_unknown_and_a_first_write_does_not_create_it() {
    let (temp, paths) = sandbox();
    let root = temp.path().join("racine-c4");
    fs::create_dir_all(&root).unwrap();
    make_tree(&root);
    let brain = register_real_root(&paths, &root).unwrap();
    refresh_map(&paths, &brain).unwrap();
    for suffix in ["", "-wal", "-shm"] {
        let mut name = paths.catalog_database().into_os_string();
        name.push(suffix);
        let _ = fs::remove_file(PathBuf::from(name));
    }
    let opened = open_map(&paths, &brain).expect("the Index does not need the catalogue");
    assert_eq!(opened.source_observation.state, SourceState::Unknown);
    assert!(
        !paths.catalog_database().exists(),
        "reading an observation never creates the catalogue"
    );
}

// ==========================================================================
// Frontier: nothing here is a watcher
// ==========================================================================

#[test]
fn the_pipeline_gained_no_watcher_no_polling_and_no_second_writer_of_the_index() {
    let observation = include_str!("source_observation.rs");
    for forbidden in [
        "notify::",
        "ReadDirectoryChanges",
        "std::thread::spawn",
        "tauri::async_runtime::spawn(",
        "std::thread::sleep",
        "Duration::from",
        "Index::open",
        "BrainIndex",
        "DELETE FROM nodes",
        "publish_with_identity",
        "apply_update_batch",
    ] {
        let code: String = observation
            .lines()
            .filter(|line| !line.trim_start().starts_with("//"))
            .collect::<Vec<_>>()
            .join("\n");
        assert!(
            !code.contains(forbidden),
            "source_observation.rs names `{forbidden}`"
        );
    }
}
