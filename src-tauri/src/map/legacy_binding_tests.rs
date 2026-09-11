//! `TASK-0032` corrective pass, defect B — an index written before `DEC-0033`
//! can still be republished, and nothing else can slip through with it.
//!
//! `DEC-0033` D promises that a pre-contract index is refused **at opening**
//! and republished by an **explicit refresh**. The first delivery kept only
//! half of that promise: `publish_map` ran the same check as `map_open`, so a
//! legacy file was refused on every path and stranded for good. This module is
//! the proof that the second half now holds — and that it holds narrowly.
//!
//! Every tree here is a synthetic fixture materialised under a `tempfile`
//! sandbox. **No personal data, no real root of anybody's.**

use super::*;
use crate::map::brain_index::IndexBinding;
use crate::map::brains::SourceKind;

/// Every metadata key a `TASK-0031` index carried — verbatim.
///
/// The first nine are what `BrainIndex::replace` wrote, read off
/// `05fc371:src-tauri/src/map/brain_index.rs`. The last three are written by
/// the `Index` layer underneath it and are just as much part of the file.
///
/// Written down rather than assumed, because the legacy path recognises a file
/// by what it *lacks*, and a test that invented a shape would be proving the
/// compatibility of something that never shipped.
const TASK0031_META_KEYS: [&str; 12] = [
    // BrainIndex::replace
    "brain_id",
    "fixture_id",
    "label",
    "node_count",
    "root_id",
    "built_unix_ms",
    "layout_algorithm",
    "build_complete",
    "projection_contract",
    // Index, underneath it
    "index_id",
    "index_revision",
    "schema_version",
];

fn setup() -> (tempfile::TempDir, SandboxPaths, BrainRecord) {
    let temp = tempfile::tempdir().unwrap();
    let paths = SandboxPaths::under(temp.path().join("sandbox"));
    let brain = BrainRecord::frozen_by_id("brain-alpha").unwrap();
    (temp, paths, brain)
}

/// Every metadata key an index currently holds, sorted.
fn meta_keys(paths: &SandboxPaths, brain: &BrainRecord) -> Vec<String> {
    let connection = rusqlite::Connection::open(paths.brain_map_database(&brain.brain_id)).unwrap();
    let mut statement = connection
        .prepare("SELECT key FROM schema_meta ORDER BY key")
        .unwrap();
    statement
        .query_map([], |row| row.get::<_, String>(0))
        .unwrap()
        .collect::<Result<Vec<_>, _>>()
        .unwrap()
}

/// Builds a real index, then strips it back to the exact `TASK-0031` shape.
///
/// Deliberately not hand-written SQL: what has to be proved is that a file the
/// **previous version of this program actually produced** can be republished,
/// and the closest thing to one is a current file with the two keys
/// `DEC-0033` added removed again. The assertion below then pins that the
/// result really is the historical shape, so the test cannot drift into
/// proving compatibility with a file nobody ever had.
fn legacy_index(paths: &SandboxPaths, brain: &BrainRecord) {
    prepare_synthetic_source(paths, brain).unwrap();
    refresh_map(paths, brain).unwrap();
    let connection = rusqlite::Connection::open(paths.brain_map_database(&brain.brain_id)).unwrap();
    connection
        .execute(
            // `source_kind`/`source_ref` are `DEC-0033`; `next_node_id` is
            // `TASK-0036` — both postdate `TASK-0031`, so a file simulating
            // that era carries neither. A republish of an already-existing
            // file goes through `BrainIndex::open_existing`, which never
            // re-migrates — so this also exercises `read_next_node_id`'s own
            // bootstrap, the fallback that covers exactly this path.
            "DELETE FROM schema_meta WHERE key IN ('source_kind', 'source_ref', 'next_node_id')",
            [],
        )
        .unwrap();
    drop(connection);

    let mut expected = TASK0031_META_KEYS.map(str::to_string).to_vec();
    expected.sort();
    assert_eq!(
        meta_keys(paths, brain),
        expected,
        "the stripped index must be exactly the TASK-0031 shape"
    );
}

/// The identity and corpus of an index, as a value that can be compared.
fn snapshot_of(paths: &SandboxPaths, brain: &BrainRecord) -> (String, u64, Vec<u8>) {
    let database = paths.brain_map_database(&brain.brain_id);
    let store = BrainIndex::open_existing(&database, false).unwrap();
    let identity = store.index.identity().unwrap();
    drop(store);
    (
        identity.index_id,
        identity.revision,
        std::fs::read(&database).unwrap(),
    )
}

/// Proofs 1 to 5: refused at opening, republished by an explicit refresh, with
/// the identity kept and the binding gained.
#[test]
fn b1_a_legacy_index_is_refused_by_open_and_republished_by_an_explicit_refresh() {
    let (_temp, paths, brain) = setup();
    legacy_index(&paths, &brain);

    let before = snapshot_of(&paths, &brain);
    {
        let store =
            BrainIndex::open_existing(&paths.brain_map_database(&brain.brain_id), false).unwrap();
        assert_eq!(
            store.binding().unwrap(),
            IndexBinding::Legacy {
                fixture_id: Some("quasi-empty".into())
            }
        );
    }

    // 2 — opening refuses, explicitly, and changes nothing.
    let error = open_map(&paths, &brain).expect_err("a legacy index must not be served");
    assert!(
        error.to_string().starts_with("map_source_mismatch"),
        "unexpected motif: {error}"
    );
    assert!(view(&paths, &brain, None, None).is_err());
    assert_eq!(
        snapshot_of(&paths, &brain),
        before,
        "a refusal must not touch the file"
    );

    // 3 — an explicit refresh succeeds.
    let report = refresh_map(&paths, &brain).expect("an explicit refresh republishes it");

    // 4 — identity kept, revision advanced by one, binding acquired.
    let after = snapshot_of(&paths, &brain);
    assert_eq!(after.0, before.0, "index_id must survive the republication");
    assert_eq!(after.1, before.1 + 1, "revision advances exactly once");
    assert_eq!(report.index_id, before.0);
    assert!(report.index_reused, "the file was reused, not recreated");
    {
        let store =
            BrainIndex::open_existing(&paths.brain_map_database(&brain.brain_id), false).unwrap();
        assert_eq!(
            store.binding().unwrap(),
            IndexBinding::Bound {
                kind: SourceKind::SyntheticFixture,
                source_ref: "quasi-empty".into(),
            }
        );
    }

    // 5 — and it opens from then on, without reading the source.
    let opened = open_map(&paths, &brain).expect("republished, so openable");
    assert!(!opened.source_read);
    assert_eq!(opened.index_id, before.0);
    assert_eq!(opened.revision, before.1 + 1);
    assert!(view(&paths, &brain, None, None).is_ok());
}

/// Proof 6: a refresh that fails before publication leaves the legacy index
/// exactly as it was — still refused, still there, still republishable later.
#[test]
fn b2_a_failed_refresh_leaves_the_legacy_index_untouched() {
    let (_temp, paths, brain) = setup();
    legacy_index(&paths, &brain);
    let before = snapshot_of(&paths, &brain);

    // The source removed under a guard that puts it back whatever happens.
    let root = fixtures::fixture_root(&paths.fixtures, "quasi-empty");
    let held = paths.fixtures.join("legacy-held-source");
    assert!(!held.exists());
    std::fs::rename(&root, &held).unwrap();
    struct Restore(PathBuf, PathBuf);
    impl Drop for Restore {
        fn drop(&mut self) {
            std::fs::rename(&self.1, &self.0).expect("restore the synthetic source");
        }
    }
    let _restore = Restore(root.clone(), held);

    assert!(
        refresh_map(&paths, &brain).is_err(),
        "no source, no publication"
    );
    assert_eq!(
        snapshot_of(&paths, &brain),
        before,
        "a failed publication must leave the old index byte-identical"
    );
    // And it is still refused by opening, because it still has no binding.
    assert!(
        open_map(&paths, &brain)
            .expect_err("still legacy")
            .to_string()
            .starts_with("map_source_mismatch")
    );
}

/// Proof 7: the legacy path is **never** open to a `REAL_ROOT`.
///
/// No real root existed before `DEC-0033`, so an unbound index under one is
/// not old — it is wrong, and accepting it would be exactly the silent
/// substitution the contract forbids.
#[test]
fn b3_a_legacy_index_under_a_real_root_is_refused_without_scanning_or_mutating() {
    let (temp, paths, _) = setup();
    let source = temp.path().join("racine-legacy");
    std::fs::create_dir(&source).unwrap();
    std::fs::write(source.join("fichier.txt"), b"synthetique").unwrap();
    let brain = register_real_root(&paths, &source).unwrap();
    refresh_map(&paths, &brain).unwrap();

    // Strip the binding, as an attacker or a bad migration would.
    let database = paths.brain_map_database(&brain.brain_id);
    let connection = rusqlite::Connection::open(&database).unwrap();
    connection
        .execute(
            "DELETE FROM schema_meta WHERE key IN ('source_kind', 'source_ref')",
            [],
        )
        .unwrap();
    drop(connection);
    let before = snapshot_of(&paths, &brain);
    let source_before = std::fs::read(source.join("fichier.txt")).unwrap();

    for outcome in [
        open_map(&paths, &brain).map(|_| ()),
        refresh_map(&paths, &brain).map(|_| ()),
        rebuild_map(&paths, &brain).map(|_| ()),
    ] {
        let error = outcome.expect_err("a REAL_ROOT never takes the legacy path");
        assert!(
            error.to_string().starts_with("map_source_mismatch"),
            "unexpected motif: {error}"
        );
    }
    assert_eq!(snapshot_of(&paths, &brain), before, "nothing was mutated");
    assert_eq!(
        std::fs::read(source.join("fichier.txt")).unwrap(),
        source_before,
        "and the source was never read for it"
    );
}

/// Proofs 8 and 9: a binding that disagrees is refused, on **either** key, and
/// a legacy index naming another fixture is not recognised at all.
#[test]
fn b4_every_disagreeing_binding_is_refused_before_the_source_is_read() {
    let (_temp, paths, brain) = setup();
    prepare_synthetic_source(&paths, &brain).unwrap();
    refresh_map(&paths, &brain).unwrap();
    let before = snapshot_of(&paths, &brain);

    // 9 — a different handle, the case the first delivery already caught.
    let other_handle = BrainRecord {
        source_ref: "deep".into(),
        ..brain.clone()
    };
    // 8 — the **same** handle under a different kind. `source_ref` alone would
    // have accepted this: two different things can share a name, and only the
    // pair says which one an index holds.
    let other_kind = BrainRecord {
        source_kind: SourceKind::RealRoot,
        ..brain.clone()
    };
    for impostor in [&other_handle, &other_kind] {
        for outcome in [
            open_map(&paths, impostor).map(|_| ()),
            refresh_map(&paths, impostor).map(|_| ()),
            rebuild_map(&paths, impostor).map(|_| ()),
        ] {
            let error = outcome.expect_err("a disagreeing binding must be refused");
            assert!(
                error.to_string().starts_with("map_source_mismatch"),
                "unexpected motif: {error}"
            );
        }
    }
    assert_eq!(snapshot_of(&paths, &brain), before);

    // A legacy index naming another fixture has nothing to be recognised by.
    legacy_index(&paths, &brain);
    let legacy_before = snapshot_of(&paths, &brain);
    let elsewhere = BrainRecord {
        source_ref: "deep".into(),
        source_label: "deep".into(),
        ..brain.clone()
    };
    assert!(
        refresh_map(&paths, &elsewhere)
            .expect_err("fixture_id disagrees")
            .to_string()
            .starts_with("map_source_mismatch")
    );
    assert_eq!(snapshot_of(&paths, &brain), legacy_before);

    // Half a binding was never written by any version of this program.
    let connection = rusqlite::Connection::open(paths.brain_map_database(&brain.brain_id)).unwrap();
    connection
        .execute(
            "INSERT INTO schema_meta (key, value) VALUES ('source_ref', 'quasi-empty')",
            [],
        )
        .unwrap();
    drop(connection);
    let half_bound = snapshot_of(&paths, &brain);
    for outcome in [
        open_map(&paths, &brain).map(|_| ()),
        refresh_map(&paths, &brain).map(|_| ()),
    ] {
        assert!(
            outcome
                .expect_err("half a binding is trusted by nobody")
                .to_string()
                .starts_with("map_source_mismatch")
        );
    }
    assert_eq!(snapshot_of(&paths, &brain), half_bound);
}

/// A rebuild republishes a legacy index just as a refresh does — the decision
/// names both as explicit intentions, and neither is a back door.
#[test]
fn b5_rebuild_republishes_a_legacy_index_the_same_way() {
    let (_temp, paths, brain) = setup();
    legacy_index(&paths, &brain);
    let before = snapshot_of(&paths, &brain);

    let report = rebuild_map(&paths, &brain).expect("an explicit rebuild republishes it too");
    assert_eq!(report.index_id, before.0);
    assert_eq!(report.revision, before.1 + 1);
    assert!(report.rebuilt);
    assert!(open_map(&paths, &brain).is_ok());
}
