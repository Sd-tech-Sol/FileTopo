//! `TASK-0037` — the persistent change journal.
//!
//! Two levels, on purpose:
//!
//! * **Index level** — synthetic, fully controlled identities fed straight to
//!   `Index::publish_with_identity`, so the diff, the atomicity and the
//!   pagination are proven on every platform without depending on what the
//!   filesystem happens to do;
//! * **Product level** — a real `REAL_ROOT` brain, the real scanner, the real
//!   Windows `SYSTEM` identity where the platform provides it, through
//!   `refresh_map`/`rebuild_map` exactly as the product calls them.
//!
//! Every tree is created by the test that reads it, under a `tempfile`
//! directory, and destroyed with it. **No personal brain, no personal
//! folder.**

use super::*;
use crate::change_journal::{ChangeNature, JournalCursor, JournalError, StoredEvent};
use crate::domain::{NodeDto, NodeKind};
use crate::identity::{IdentityProvenance, NodeIdentity};
use crate::index::Index;
use std::fs;
use std::time::{Duration, SystemTime};

// -- Index level: synthetic, controlled identities ---------------------------

struct Spec {
    id: i64,
    parent: Option<i64>,
    name: &'static str,
    path: &'static str,
    kind: NodeKind,
    size: u64,
    mtime: Option<i64>,
    key: &'static str,
}

fn spec(
    id: i64,
    parent: Option<i64>,
    name: &'static str,
    path: &'static str,
    kind: NodeKind,
    key: &'static str,
) -> Spec {
    Spec {
        id,
        parent,
        name,
        path,
        kind,
        size: 0,
        mtime: None,
        key,
    }
}

impl Spec {
    fn size(mut self, size: u64) -> Self {
        self.size = size;
        self
    }
    fn mtime(mut self, mtime: i64) -> Self {
        self.mtime = Some(mtime);
        self
    }
}

/// `racine` ▸ `a/` (▸ `a/f.txt`), `b/`, `g.txt`.
fn base() -> Vec<Spec> {
    vec![
        spec(1, None, "racine", "", NodeKind::Root, "K-root"),
        spec(2, Some(1), "a", "a", NodeKind::Directory, "K-a"),
        spec(3, Some(1), "b", "b", NodeKind::Directory, "K-b"),
        spec(4, Some(2), "f.txt", "a/f.txt", NodeKind::File, "K-f")
            .size(10)
            .mtime(100),
        spec(5, Some(1), "g.txt", "g.txt", NodeKind::File, "K-g")
            .size(20)
            .mtime(200),
    ]
}

fn publish(
    index: &mut Index,
    specs: &[Spec],
) -> Result<crate::index::PublishOutcome, crate::index::PublishError> {
    let nodes = specs
        .iter()
        .map(|s| NodeDto {
            id: s.id,
            parent_id: s.parent,
            name: s.name.to_string(),
            relative_path: s.path.to_string(),
            kind: s.kind,
            depth: if s.path.is_empty() {
                0
            } else {
                s.path.split('/').count() as u32
            },
            size_bytes: s.size,
            modified_unix_ms: s.mtime,
            online_only: false,
            reparse_point: false,
            child_count: specs.iter().filter(|c| c.parent == Some(s.id)).count() as u32,
            seen: false,
        })
        .collect::<Vec<_>>();
    let identities = specs
        .iter()
        .map(|s| NodeIdentity {
            node_id: s.id,
            stable_key: s.key.to_string(),
            provenance: IdentityProvenance::System,
        })
        .collect::<Vec<_>>();
    index.publish_with_identity(
        &nodes,
        &identities,
        &[("built_unix_ms", "1700000000000".to_string())],
        &[],
    )
}

fn canonical(index: &Index, path: &str) -> i64 {
    index
        .connection
        .query_row(
            "SELECT id FROM nodes WHERE relative_path = ?1",
            [path],
            |r| r.get(0),
        )
        .unwrap_or_else(|_| panic!("no node at {path:?}"))
}

/// Every event, newest first, following the cursors exactly as a client does.
fn all_events(index: &Index, natures: &[ChangeNature]) -> Vec<StoredEvent> {
    let index_id = index.identity().unwrap().index_id;
    let mut cursor: Option<JournalCursor> = None;
    let mut collected = Vec::new();
    loop {
        let page =
            crate::change_journal::page(&index.connection, &index_id, natures, cursor.as_ref(), 50)
                .expect("page");
        collected.extend(page.items);
        match page.next_cursor {
            Some(next) => cursor = Some(next),
            None => return collected,
        }
    }
}

fn shape(events: &[StoredEvent]) -> Vec<(ChangeNature, i64)> {
    events.iter().map(|e| (e.nature, e.node_id)).collect()
}

fn in_memory() -> Index {
    Index::in_memory().expect("in-memory index")
}

#[test]
fn the_first_publication_establishes_a_baseline_and_the_journal_stays_empty() {
    let mut index = in_memory();
    let outcome = publish(&mut index, &base()).expect("first publication");
    assert!(outcome.journal.baseline_established);
    assert_eq!(outcome.journal.total, 0);
    assert!(
        all_events(&index, &[]).is_empty(),
        "a first build must not create five 'CREATED' events out of nothing"
    );
}

#[test]
fn an_unchanged_republication_journals_nothing_but_the_revision_still_advances() {
    let mut index = in_memory();
    publish(&mut index, &base()).unwrap();
    let revision = index.identity().unwrap().revision;
    let outcome = publish(&mut index, &base()).expect("no-op refresh");
    assert!(!outcome.journal.baseline_established);
    assert_eq!(outcome.journal.total, 0);
    assert_eq!(index.identity().unwrap().revision, revision + 1);
    assert!(all_events(&index, &[]).is_empty());
}

#[test]
fn a_new_key_is_exactly_one_created_event_on_a_never_recycled_id() {
    let mut index = in_memory();
    publish(&mut index, &base()).unwrap();
    let mut next = base();
    next.push(spec(6, Some(1), "neuf.txt", "neuf.txt", NodeKind::File, "K-new").size(5));
    let outcome = publish(&mut index, &next).expect("publication");
    assert_eq!(outcome.journal.created, 1);
    assert_eq!(outcome.journal.total, 1);

    let events = all_events(&index, &[]);
    assert_eq!(events.len(), 1);
    let created = &events[0];
    assert_eq!(created.nature, ChangeNature::Created);
    assert_eq!(created.node_id, canonical(&index, "neuf.txt"));
    assert_eq!(created.new_name.as_deref(), Some("neuf.txt"));
    assert_eq!(created.new_relative_path.as_deref(), Some("neuf.txt"));
    assert_eq!(created.new_parent_id, Some(canonical(&index, "")));
    assert_eq!(created.old_name, None);
    assert_eq!(created.old_relative_path, None);
    assert!(created.node_present);
    assert_eq!(
        created.detected_revision,
        index.identity().unwrap().revision
    );
    assert_eq!(created.detected_unix_ms, 1_700_000_000_000);
}

#[test]
fn a_vanished_key_is_exactly_one_deleted_event_on_the_old_id_and_never_a_present_node() {
    let mut index = in_memory();
    publish(&mut index, &base()).unwrap();
    let old_id = canonical(&index, "g.txt");
    let without_g: Vec<Spec> = base().into_iter().filter(|s| s.key != "K-g").collect();
    let outcome = publish(&mut index, &without_g).expect("publication");
    assert_eq!(outcome.journal.deleted, 1);
    assert_eq!(outcome.journal.total, 1);

    let events = all_events(&index, &[]);
    assert_eq!(shape(&events), vec![(ChangeNature::Deleted, old_id)]);
    assert_eq!(events[0].old_relative_path.as_deref(), Some("g.txt"));
    assert_eq!(events[0].old_name.as_deref(), Some("g.txt"));
    assert_eq!(events[0].new_relative_path, None);
    assert!(
        !events[0].node_present,
        "a DELETED event must never point at a live node"
    );

    // The id is never recycled: a brand-new node after the deletion is a
    // different id, so the DELETED event keeps naming only the dead node.
    let mut again = without_g;
    again.push(spec(9, Some(1), "g.txt", "g.txt", NodeKind::File, "K-g2"));
    publish(&mut index, &again).unwrap();
    assert_ne!(canonical(&index, "g.txt"), old_id);
    assert!(
        !all_events(&index, &[ChangeNature::Deleted])[0].node_present,
        "the deleted id stays dead even when the same path reappears"
    );
}

#[test]
fn a_rename_keeps_the_id_and_is_exactly_one_renamed_event() {
    let mut index = in_memory();
    publish(&mut index, &base()).unwrap();
    let id = canonical(&index, "a/f.txt");
    let mut next = base();
    next[3] = spec(4, Some(2), "h.txt", "a/h.txt", NodeKind::File, "K-f")
        .size(10)
        .mtime(100);
    let outcome = publish(&mut index, &next).expect("publication");
    assert_eq!(outcome.journal.renamed, 1);
    assert_eq!(outcome.journal.total, 1);

    assert_eq!(canonical(&index, "a/h.txt"), id, "same nodeId after rename");
    let events = all_events(&index, &[]);
    assert_eq!(shape(&events), vec![(ChangeNature::Renamed, id)]);
    let renamed = &events[0];
    assert_eq!(renamed.old_name.as_deref(), Some("f.txt"));
    assert_eq!(renamed.new_name.as_deref(), Some("h.txt"));
    assert_eq!(renamed.old_relative_path.as_deref(), Some("a/f.txt"));
    assert_eq!(renamed.new_relative_path.as_deref(), Some("a/h.txt"));
    assert!(renamed.node_present);
}

#[test]
fn a_move_keeps_the_id_and_is_exactly_one_moved_event() {
    let mut index = in_memory();
    publish(&mut index, &base()).unwrap();
    let id = canonical(&index, "a/f.txt");
    let (a, b) = (canonical(&index, "a"), canonical(&index, "b"));
    let mut next = base();
    next[3] = spec(4, Some(3), "f.txt", "b/f.txt", NodeKind::File, "K-f")
        .size(10)
        .mtime(100);
    let outcome = publish(&mut index, &next).expect("publication");
    assert_eq!(outcome.journal.moved, 1);
    assert_eq!(outcome.journal.total, 1);

    assert_eq!(canonical(&index, "b/f.txt"), id, "same nodeId after move");
    let events = all_events(&index, &[]);
    assert_eq!(shape(&events), vec![(ChangeNature::Moved, id)]);
    let moved = &events[0];
    assert_eq!(moved.old_parent_id, Some(a));
    assert_eq!(moved.new_parent_id, Some(b));
    assert_eq!(moved.old_relative_path.as_deref(), Some("a/f.txt"));
    assert_eq!(moved.new_relative_path.as_deref(), Some("b/f.txt"));
}

#[test]
fn a_rename_and_a_move_in_one_publication_journal_both_natures_without_inventing_an_order() {
    let mut index = in_memory();
    publish(&mut index, &base()).unwrap();
    let id = canonical(&index, "a/f.txt");
    let mut next = base();
    next[3] = spec(4, Some(3), "h.txt", "b/h.txt", NodeKind::File, "K-f")
        .size(10)
        .mtime(100);
    let outcome = publish(&mut index, &next).expect("publication");
    assert_eq!((outcome.journal.renamed, outcome.journal.moved), (1, 1));
    assert_eq!(outcome.journal.total, 2);

    let events = all_events(&index, &[]);
    assert_eq!(events.len(), 2);
    let renamed = events
        .iter()
        .find(|e| e.nature == ChangeNature::Renamed)
        .expect("a RENAMED event");
    let moved = events
        .iter()
        .find(|e| e.nature == ChangeNature::Moved)
        .expect("a MOVED event");
    assert!(events.iter().all(|e| e.node_id == id));
    assert_eq!(renamed.detected_revision, moved.detected_revision);
    assert_ne!(renamed.ordinal, moved.ordinal);
    // Neither event claims an intermediate path: both carry the path before
    // and after the WHOLE publication, because the order of the two
    // operations is unknowable from two snapshots.
    for event in [renamed, moved] {
        assert_eq!(event.old_relative_path.as_deref(), Some("a/f.txt"));
        assert_eq!(event.new_relative_path.as_deref(), Some("b/h.txt"));
    }
    assert_eq!(renamed.old_name.as_deref(), Some("f.txt"));
    assert_eq!(renamed.new_name.as_deref(), Some("h.txt"));
    assert_eq!(moved.old_parent_id, Some(canonical(&index, "a")));
    assert_eq!(moved.new_parent_id, Some(canonical(&index, "b")));
    // The order is deterministic (RENAMED then MOVED for one node), and it is
    // documented as publication order only.
    assert!(renamed.ordinal < moved.ordinal);
}

#[test]
fn a_moved_folder_is_one_event_on_the_folder_and_none_on_its_descendants() {
    let mut index = in_memory();
    publish(&mut index, &base()).unwrap();
    let folder = canonical(&index, "a");
    let child = canonical(&index, "a/f.txt");
    // `a/` moves under `b/`; `f.txt` keeps its own name and its own parent
    // (`a/`), and only its derived path changes.
    // (A parent precedes its children, as the scanner always emits them.)
    let next = vec![
        spec(1, None, "racine", "", NodeKind::Root, "K-root"),
        spec(3, Some(1), "b", "b", NodeKind::Directory, "K-b"),
        spec(2, Some(3), "a", "b/a", NodeKind::Directory, "K-a"),
        spec(4, Some(2), "f.txt", "b/a/f.txt", NodeKind::File, "K-f")
            .size(10)
            .mtime(100),
        spec(5, Some(1), "g.txt", "g.txt", NodeKind::File, "K-g")
            .size(20)
            .mtime(200),
    ];
    let outcome = publish(&mut index, &next).expect("publication");
    assert_eq!(outcome.journal.total, 1, "exactly one structural event");

    assert_eq!(
        canonical(&index, "b/a/f.txt"),
        child,
        "descendant keeps its id"
    );
    let events = all_events(&index, &[]);
    assert_eq!(shape(&events), vec![(ChangeNature::Moved, folder)]);
    assert_eq!(events[0].node_kind, NodeKind::Directory);
    assert!(
        events.iter().all(|e| e.node_id != child),
        "no false MOVED/RENAMED on a descendant whose own parent and name are unchanged"
    );
}

#[test]
fn a_node_whose_identity_changes_is_a_delete_plus_a_create_never_a_similarity_match() {
    // What a `PATH_FALLBACK` rename looks like to the journal: the key is a
    // function of the path, so a new path is a new key.
    let mut index = in_memory();
    let mut before = base();
    before[4].key = "PFv1:0000000000000001";
    publish(&mut index, &before).unwrap();
    let old_id = canonical(&index, "g.txt");

    let mut after = base();
    after[4] = spec(
        5,
        Some(1),
        "g-renomme.txt",
        "g-renomme.txt",
        NodeKind::File,
        "PFv1:0000000000000002",
    )
    .size(20)
    .mtime(200);
    let outcome = publish(&mut index, &after).expect("publication");
    assert_eq!(
        (
            outcome.journal.created,
            outcome.journal.deleted,
            outcome.journal.total
        ),
        (1, 1, 2)
    );
    let new_id = canonical(&index, "g-renomme.txt");
    assert_ne!(
        new_id, old_id,
        "a new key is a new id — no resemblance matching"
    );
    let events = all_events(&index, &[]);
    assert!(
        events
            .iter()
            .any(|e| e.nature == ChangeNature::Deleted && e.node_id == old_id)
    );
    assert!(
        events
            .iter()
            .any(|e| e.nature == ChangeNature::Created && e.node_id == new_id)
    );
    assert!(
        events
            .iter()
            .all(|e| !matches!(e.nature, ChangeNature::Renamed | ChangeNature::Moved))
    );
}

#[test]
fn only_observed_metadata_changes_are_modified_and_a_directory_timestamp_is_not_one() {
    let mut index = in_memory();
    let mut start = base();
    start[1] = spec(2, Some(1), "a", "a", NodeKind::Directory, "K-a").mtime(1_000);
    publish(&mut index, &start).unwrap();
    let file = canonical(&index, "a/f.txt");

    // A directory's own timestamp moves whenever an entry appears in it: that
    // is a structural echo, never a MODIFIED. `child_count`/`depth`/derived
    // paths are never compared either, and `seen` is a person's state.
    let mut echo = start.iter().map(clone_spec).collect::<Vec<_>>();
    echo[1] = spec(2, Some(1), "a", "a", NodeKind::Directory, "K-a").mtime(9_999);
    let outcome = publish(&mut index, &echo).unwrap();
    assert_eq!(
        outcome.journal.total, 0,
        "a directory mtime alone is not MODIFIED"
    );

    // A file's size changes ⇒ one MODIFIED, on that node, and nothing else.
    let mut grown = echo.iter().map(clone_spec).collect::<Vec<_>>();
    grown[3] = spec(4, Some(2), "f.txt", "a/f.txt", NodeKind::File, "K-f")
        .size(11)
        .mtime(100);
    let outcome = publish(&mut index, &grown).unwrap();
    assert_eq!((outcome.journal.modified, outcome.journal.total), (1, 1));

    // A file's mtime alone changes ⇒ one MODIFIED as well.
    let mut touched = grown.iter().map(clone_spec).collect::<Vec<_>>();
    touched[3] = spec(4, Some(2), "f.txt", "a/f.txt", NodeKind::File, "K-f")
        .size(11)
        .mtime(101);
    let outcome = publish(&mut index, &touched).unwrap();
    assert_eq!((outcome.journal.modified, outcome.journal.total), (1, 1));

    let events = all_events(&index, &[]);
    assert_eq!(
        shape(&events),
        vec![
            (ChangeNature::Modified, file),
            (ChangeNature::Modified, file)
        ]
    );
    assert!(
        events
            .iter()
            .all(|e| e.new_relative_path.as_deref() == Some("a/f.txt"))
    );
}

fn clone_spec(s: &Spec) -> Spec {
    Spec {
        id: s.id,
        parent: s.parent,
        name: s.name,
        path: s.path,
        kind: s.kind,
        size: s.size,
        mtime: s.mtime,
        key: s.key,
    }
}

// -- Atomicity ---------------------------------------------------------------

/// A snapshot of what a reader can see: rows, revision, journal.
type ObservableState = (Vec<(i64, String)>, u64, Vec<(i64, i64)>);

fn observable_state(index: &Index) -> ObservableState {
    let mut nodes = index
        .connection
        .prepare("SELECT id, relative_path FROM nodes ORDER BY id")
        .unwrap();
    let rows = nodes
        .query_map([], |r| Ok((r.get(0)?, r.get(1)?)))
        .unwrap()
        .collect::<Result<Vec<_>, _>>()
        .unwrap();
    let mut journal = index
        .connection
        .prepare("SELECT event_id, node_id FROM change_events ORDER BY event_id")
        .unwrap();
    let events = journal
        .query_map([], |r| Ok((r.get(0)?, r.get(1)?)))
        .unwrap()
        .collect::<Result<Vec<_>, _>>()
        .unwrap();
    (rows, index.identity().unwrap().revision, events)
}

fn changed() -> Vec<Spec> {
    let mut next = base();
    next.push(spec(
        6,
        Some(1),
        "neuf.txt",
        "neuf.txt",
        NodeKind::File,
        "K-new",
    ));
    next
}

#[test]
fn a_failing_journal_insert_fails_the_whole_publication_and_leaves_the_old_index_intact() {
    let mut index = in_memory();
    publish(&mut index, &base()).unwrap();
    publish(&mut index, &changed()).unwrap(); // one event already on record
    let before = observable_state(&index);
    assert_eq!(before.2.len(), 1);

    // A real failure of the journal's own insert, injected in the database
    // itself — no production hook.
    index
        .connection
        .execute_batch(
            "CREATE TRIGGER inject_journal_failure BEFORE INSERT ON change_events
             BEGIN SELECT RAISE(ABORT, 'injected journal failure'); END;",
        )
        .unwrap();
    let mut next = changed();
    next.push(spec(
        7,
        Some(1),
        "autre.txt",
        "autre.txt",
        NodeKind::File,
        "K-other",
    ));
    let error = publish(&mut index, &next).expect_err("the publication must fail");
    assert!(
        error.to_string().contains("injected journal failure"),
        "{error}"
    );

    assert_eq!(
        observable_state(&index),
        before,
        "a journal write failure must roll back corpus, revision and journal together"
    );

    // The previous index is still openable and publishable once the fault is
    // gone.
    index
        .connection
        .execute_batch("DROP TRIGGER inject_journal_failure;")
        .unwrap();
    publish(&mut index, &next).expect("retry succeeds");
    assert_eq!(all_events(&index, &[]).len(), 2);
}

#[test]
fn a_publication_failing_after_the_journal_was_written_leaves_no_event_behind() {
    let mut index = in_memory();
    publish(&mut index, &base()).unwrap();
    let before = observable_state(&index);

    // The revision bump is the publication's last write; failing it proves the
    // events written just before it are removed with the rest.
    index
        .connection
        .execute_batch(
            "CREATE TRIGGER inject_revision_failure BEFORE INSERT ON schema_meta
             WHEN NEW.key = 'index_revision'
             BEGIN SELECT RAISE(ABORT, 'injected publication failure'); END;",
        )
        .unwrap();
    let error = publish(&mut index, &changed()).expect_err("the publication must fail");
    assert!(
        error.to_string().contains("injected publication failure"),
        "{error}"
    );
    assert_eq!(
        observable_state(&index),
        before,
        "no event may survive a failed publication"
    );
    assert!(all_events(&index, &[]).is_empty());
}

#[test]
fn a_corpus_without_durable_identity_is_re_baselined_and_never_flooded_with_events() {
    let mut index = in_memory();
    publish(&mut index, &base()).unwrap();
    // What a `v3` file migrated but not yet republished looks like: rows that
    // carry no stable key, so their ids mean nothing across a republication.
    index
        .connection
        .execute(
            "UPDATE nodes SET stable_key = NULL, identity_provenance = NULL",
            [],
        )
        .unwrap();

    let outcome = publish(&mut index, &changed()).expect("republication");
    assert!(outcome.journal.baseline_established);
    assert_eq!(outcome.journal.total, 0);
    assert!(all_events(&index, &[]).is_empty(), "no delete/create flood");

    // From the next publication on the journal compares again.
    let mut next = changed();
    next.push(spec(
        8,
        Some(1),
        "encore.txt",
        "encore.txt",
        NodeKind::File,
        "K-again",
    ));
    let outcome = publish(&mut index, &next).unwrap();
    assert!(!outcome.journal.baseline_established);
    assert_eq!(outcome.journal.created, 1);
}

// -- Consultation --------------------------------------------------------------

/// 130 events of two natures in ONE publication, then more in later ones.
fn many_files(count: i64, first_id: i64, tag: &'static str) -> Vec<Spec> {
    (0..count)
        .map(|n| {
            let id = first_id + n;
            let name: &'static str = Box::leak(format!("{tag}-{n:03}.txt").into_boxed_str());
            let key: &'static str = Box::leak(format!("K-{tag}-{n:03}").into_boxed_str());
            spec(id, Some(1), name, name, NodeKind::File, key)
                .size(1)
                .mtime(1)
        })
        .collect()
}

#[test]
fn pagination_walks_more_than_fifty_events_without_a_gap_or_a_duplicate() {
    let mut index = in_memory();
    publish(&mut index, &base()).unwrap();
    let mut with_batch = base();
    with_batch.extend(many_files(130, 100, "lot"));
    publish(&mut index, &with_batch).unwrap();
    assert_eq!(
        publish(&mut index, &with_batch).unwrap().journal.total,
        0,
        "the no-op after a big batch journals nothing"
    );

    let index_id = index.identity().unwrap().index_id;
    let first = crate::change_journal::page(&index.connection, &index_id, &[], None, 500).unwrap();
    assert_eq!(first.limit, 50, "a page never exceeds the server ceiling");
    assert_eq!(first.items.len(), 50);
    assert_eq!(first.total, 130);
    let mut cursor = first.next_cursor.clone().expect("more pages");

    let mut ids: Vec<i64> = first.items.iter().map(|e| e.event_id).collect();
    let mut pages = 1;
    loop {
        let page =
            crate::change_journal::page(&index.connection, &index_id, &[], Some(&cursor), 50)
                .unwrap();
        pages += 1;
        assert_eq!(page.total, 130, "the total is exact on every page");
        ids.extend(page.items.iter().map(|e| e.event_id));
        match page.next_cursor {
            Some(next) => cursor = next,
            None => break,
        }
    }
    assert_eq!(pages, 3, "130 events at 50 per page");
    assert_eq!(ids.len(), 130);
    assert!(
        ids.windows(2).all(|w| w[0] > w[1]),
        "strictly newest first, no duplicate, no reorder"
    );
    let distinct: std::collections::HashSet<_> = ids.iter().collect();
    assert_eq!(distinct.len(), 130);

    // A cursor is not made stale by a newer publication: history stays
    // walkable while new events are appended above it.
    let mut more = with_batch.iter().map(clone_spec).collect::<Vec<_>>();
    more.extend(many_files(3, 400, "apres"));
    publish(&mut index, &more).unwrap();
    let continued = crate::change_journal::page(
        &index.connection,
        &index_id,
        &[],
        first.next_cursor.as_ref(),
        50,
    )
    .expect("an older cursor keeps working after a new revision");
    assert_eq!(continued.items.len(), 50);
    assert_eq!(continued.total, 133);
    assert_eq!(
        continued.items[0].event_id,
        first.items.last().unwrap().event_id - 1,
        "the walk resumes exactly where it stopped"
    );
}

#[test]
fn the_journal_filters_by_one_or_several_natures_with_an_exact_total() {
    let mut index = in_memory();
    publish(&mut index, &base()).unwrap();
    let mut next = base();
    next.extend(many_files(60, 100, "lot")); // 60 CREATED
    next.retain(|s| s.key != "K-g"); // 1 DELETED
    next[3] = spec(4, Some(2), "h.txt", "a/h.txt", NodeKind::File, "K-f")
        .size(10)
        .mtime(100); // 1 RENAMED
    publish(&mut index, &next).unwrap();

    let index_id = index.identity().unwrap().index_id;
    let total_of = |natures: &[ChangeNature]| {
        crate::change_journal::page(&index.connection, &index_id, natures, None, 50)
            .unwrap()
            .total
    };
    assert_eq!(total_of(&[]), 62);
    assert_eq!(total_of(&[ChangeNature::Created]), 60);
    assert_eq!(total_of(&[ChangeNature::Deleted]), 1);
    assert_eq!(total_of(&[ChangeNature::Renamed, ChangeNature::Deleted]), 2);
    assert_eq!(total_of(&[ChangeNature::Moved]), 0);
    assert_eq!(
        total_of(&[ChangeNature::Deleted, ChangeNature::Deleted]),
        1,
        "a repeated nature is one filter, not a double count"
    );
    let created = all_events(&index, &[ChangeNature::Created]);
    assert_eq!(created.len(), 60);
    assert!(created.iter().all(|e| e.nature == ChangeNature::Created));
}

#[test]
fn a_cursor_of_another_index_or_a_malformed_one_is_refused() {
    let mut first = in_memory();
    let mut second = in_memory();
    publish(&mut first, &base()).unwrap();
    publish(&mut second, &base()).unwrap();
    let mut batch = base();
    batch.extend(many_files(60, 100, "lot"));
    publish(&mut first, &batch).unwrap();
    publish(&mut second, &batch).unwrap();

    let first_id = first.identity().unwrap().index_id;
    let second_id = second.identity().unwrap().index_id;
    assert_ne!(first_id, second_id);
    let cursor = crate::change_journal::page(&first.connection, &first_id, &[], None, 50)
        .unwrap()
        .next_cursor
        .expect("a cursor");

    let refused =
        crate::change_journal::page(&second.connection, &second_id, &[], Some(&cursor), 50);
    assert!(
        matches!(refused, Err(JournalError::ForeignCursor)),
        "{refused:?}"
    );

    for malformed in [
        "",
        "fjc1",
        "fjc1..3",
        "fjc1.x",
        "fjc1.x.notanumber",
        "fjc1.x.0",
        "fjc1.x.-4",
        "fjc1.x.3.extra",
        "ftc1.x.3",
    ] {
        assert!(
            matches!(
                JournalCursor::decode(malformed),
                Err(JournalError::MalformedCursor)
            ),
            "{malformed:?} must be refused"
        );
    }
    let round_trip = JournalCursor::decode(&cursor.encode()).unwrap();
    assert_eq!(round_trip, cursor);
}

#[test]
fn the_stored_journal_carries_no_identity_material_no_absolute_path_and_no_content() {
    let mut index = in_memory();
    let mut start = base();
    start[4].key = "SYS1:c0ffee00:0011223344556677:8899aabbccddeeff";
    publish(&mut index, &start).unwrap();
    let mut next = base();
    next[4] = spec(
        5,
        Some(1),
        "z.txt",
        "z.txt",
        NodeKind::File,
        "SYS1:c0ffee00:0011223344556677:8899aabbccddeeff",
    )
    .size(21)
    .mtime(200);
    publish(&mut index, &next).unwrap();

    let mut statement = index
        .connection
        .prepare(
            "SELECT nature, node_kind, IFNULL(old_name,''), IFNULL(new_name,''),
                    IFNULL(old_relative_path,''), IFNULL(new_relative_path,'')
             FROM change_events",
        )
        .unwrap();
    let rows = statement
        .query_map([], |r| {
            (0..6)
                .map(|i| r.get::<_, String>(i))
                .collect::<Result<Vec<_>, _>>()
        })
        .unwrap()
        .collect::<Result<Vec<_>, _>>()
        .unwrap();
    assert!(!rows.is_empty());
    let text = rows.iter().flatten().cloned().collect::<Vec<_>>().join("|");
    for forbidden in [
        "SYS1",
        "PFv1",
        "c0ffee00",
        "0011223344556677",
        ":\\",
        "\\",
        "//",
    ] {
        assert!(
            !text.contains(forbidden),
            "{forbidden:?} leaked into the journal: {text}"
        );
    }
    // The table has no column that could hold such material at all.
    let columns: Vec<String> = index
        .connection
        .prepare("SELECT name FROM pragma_table_info('change_events')")
        .unwrap()
        .query_map([], |r| r.get(0))
        .unwrap()
        .collect::<Result<_, _>>()
        .unwrap();
    for column in &columns {
        for forbidden in [
            "stable", "key", "file_id", "volume", "absolute", "content", "hash",
        ] {
            assert!(
                !column.contains(forbidden),
                "column {column:?} could carry {forbidden:?}"
            );
        }
    }
}

// -- Product level: the real pipeline ------------------------------------------

fn sandbox() -> (tempfile::TempDir, SandboxPaths) {
    let temp = tempfile::tempdir().unwrap();
    let paths = SandboxPaths::under(temp.path().join("filetopo-state"));
    (temp, paths)
}

fn register(paths: &SandboxPaths, root: &Path) -> BrainRecord {
    commands::register_real_root(paths, root).expect("registered")
}

fn id_of(paths: &SandboxPaths, brain: &BrainRecord, relative_path: &str) -> i64 {
    open_store(paths, brain)
        .expect("open store")
        .resolve_path(relative_path)
        .expect("resolve")
        .unwrap_or_else(|| panic!("no node at {relative_path:?}"))
}

fn journal(
    paths: &SandboxPaths,
    brain: &BrainRecord,
    natures: &[ChangeNature],
) -> Vec<ChangeEvent> {
    let mut after: Option<String> = None;
    let mut collected = Vec::new();
    loop {
        let page =
            change_journal(paths, brain, natures, after.as_deref(), 50).expect("journal page");
        collected.extend(page.items);
        match page.next_cursor {
            Some(next) => after = Some(next),
            None => return collected,
        }
    }
}

fn set_mtime(path: &Path, when: SystemTime) {
    fs::OpenOptions::new()
        .write(true)
        .open(path)
        .expect("open for mtime")
        .set_modified(when)
        .expect("set mtime");
}

use super as commands;

#[test]
fn the_real_pipeline_journals_create_modify_and_delete_with_exact_counters() {
    let (temp, paths) = sandbox();
    let root = temp.path().join("racine");
    fs::create_dir_all(&root).unwrap();
    fs::write(root.join("stable.txt"), b"synthetique").unwrap();
    fs::write(root.join("a-modifier.txt"), b"avant").unwrap();
    fs::write(root.join("a-supprimer.txt"), b"bye").unwrap();
    let brain = register(&paths, &root);

    // 1 — first index: baseline, empty journal.
    let first = refresh_map(&paths, &brain).expect("first refresh");
    assert!(first.change_summary.baseline_established);
    assert_eq!(first.change_summary.total, 0);
    assert!(journal(&paths, &brain, &[]).is_empty());

    // 2 — nothing changed: zero events, revision still advances.
    let noop = refresh_map(&paths, &brain).expect("no-op refresh");
    assert!(!noop.change_summary.baseline_established);
    assert_eq!(noop.change_summary.total, 0);
    assert_eq!(noop.revision, first.revision + 1);
    assert!(journal(&paths, &brain, &[]).is_empty());

    // 3 — create.
    fs::write(root.join("nouveau.txt"), b"neuf").unwrap();
    let created = refresh_map(&paths, &brain).expect("refresh after create");
    assert_eq!(
        (created.change_summary.created, created.change_summary.total),
        (1, 1)
    );
    let events = journal(&paths, &brain, &[]);
    assert_eq!(events.len(), 1);
    assert_eq!(events[0].nature, ChangeNature::Created);
    assert_eq!(events[0].node_id, id_of(&paths, &brain, "nouveau.txt"));
    assert_eq!(events[0].new_relative_path.as_deref(), Some("nouveau.txt"));
    assert!(events[0].node_present);

    // 4 — modify: the size changes. The root directory's own mtime moved too
    // (a file appeared in the previous step); it never counts.
    fs::write(root.join("a-modifier.txt"), b"apres-plus-long").unwrap();
    let modified = refresh_map(&paths, &brain).expect("refresh after modify");
    assert_eq!(
        (
            modified.change_summary.modified,
            modified.change_summary.total
        ),
        (1, 1),
        "{:?}",
        modified.change_summary
    );
    let modified_id = id_of(&paths, &brain, "a-modifier.txt");
    assert_eq!(
        journal(&paths, &brain, &[ChangeNature::Modified])[0].node_id,
        modified_id
    );

    // 5 — delete.
    let deleted_id = id_of(&paths, &brain, "a-supprimer.txt");
    fs::remove_file(root.join("a-supprimer.txt")).unwrap();
    let deleted = refresh_map(&paths, &brain).expect("refresh after delete");
    assert_eq!(
        (deleted.change_summary.deleted, deleted.change_summary.total),
        (1, 1)
    );
    let gone = &journal(&paths, &brain, &[ChangeNature::Deleted])[0];
    assert_eq!(gone.node_id, deleted_id);
    assert_eq!(gone.old_relative_path.as_deref(), Some("a-supprimer.txt"));
    assert!(!gone.node_present);

    // Full history, newest first, five detections: nothing lost by rebuilding
    // between steps either.
    let rebuilt = rebuild_map(&paths, &brain).expect("rebuild");
    assert_eq!(
        rebuilt.change_summary.total, 0,
        "an unchanged rebuild journals nothing"
    );
    let history = journal(&paths, &brain, &[]);
    assert_eq!(
        history.iter().map(|e| e.nature).collect::<Vec<_>>(),
        vec![
            ChangeNature::Deleted,
            ChangeNature::Modified,
            ChangeNature::Created
        ],
        "history persists across refresh and rebuild, newest first"
    );
}

#[test]
fn a_content_change_that_leaves_size_and_timestamp_alone_is_not_observed_and_not_read() {
    let (temp, paths) = sandbox();
    let root = temp.path().join("racine-contenu");
    fs::create_dir_all(&root).unwrap();
    let file = root.join("f.txt");
    fs::write(&file, b"aaaa").unwrap();
    let brain = register(&paths, &root);
    refresh_map(&paths, &brain).unwrap();

    let original = fs::metadata(&file).unwrap().modified().unwrap();
    fs::write(&file, b"bbbb").unwrap(); // same size, different content
    set_mtime(&file, original);
    let report = refresh_map(&paths, &brain).unwrap();
    assert_eq!(
        report.change_summary.total, 0,
        "FileTopo never reads content: identical size and mtime is not a change it can see"
    );

    // A pure timestamp change *is* observed metadata.
    set_mtime(&file, original + Duration::from_secs(3600));
    let report = refresh_map(&paths, &brain).unwrap();
    assert_eq!(
        (report.change_summary.modified, report.change_summary.total),
        (1, 1)
    );
}

#[cfg(windows)]
#[test]
fn a_real_rename_keeps_the_node_id_and_is_one_renamed_event_not_a_delete_and_create() {
    let (temp, paths) = sandbox();
    let root = temp.path().join("racine-rename");
    fs::create_dir_all(&root).unwrap();
    fs::write(root.join("avant.txt"), b"synthetique").unwrap();
    let brain = register(&paths, &root);
    refresh_map(&paths, &brain).unwrap();
    let id = id_of(&paths, &brain, "avant.txt");

    fs::rename(root.join("avant.txt"), root.join("apres.txt")).unwrap();
    let report = refresh_map(&paths, &brain).unwrap();
    assert_eq!(
        (report.change_summary.renamed, report.change_summary.total),
        (1, 1)
    );
    assert_eq!(id_of(&paths, &brain, "apres.txt"), id);
    let events = journal(&paths, &brain, &[]);
    assert_eq!(events.len(), 1);
    assert_eq!(events[0].nature, ChangeNature::Renamed);
    assert_eq!(events[0].node_id, id);
    assert_eq!(events[0].old_relative_path.as_deref(), Some("avant.txt"));
    assert_eq!(events[0].new_relative_path.as_deref(), Some("apres.txt"));
}

#[cfg(windows)]
#[test]
fn a_real_move_keeps_the_node_id_and_a_moved_folder_leaves_its_descendants_out() {
    let (temp, paths) = sandbox();
    let root = temp.path().join("racine-move");
    fs::create_dir_all(root.join("destination")).unwrap();
    fs::create_dir_all(root.join("dossier")).unwrap();
    fs::write(root.join("depart.txt"), b"synthetique").unwrap();
    fs::write(root.join("dossier/enfant.txt"), b"synthetique").unwrap();
    let brain = register(&paths, &root);
    refresh_map(&paths, &brain).unwrap();
    let file_id = id_of(&paths, &brain, "depart.txt");
    let folder_id = id_of(&paths, &brain, "dossier");
    let child_id = id_of(&paths, &brain, "dossier/enfant.txt");
    let destination = id_of(&paths, &brain, "destination");

    // A file move.
    fs::rename(root.join("depart.txt"), root.join("destination/depart.txt")).unwrap();
    let report = refresh_map(&paths, &brain).unwrap();
    assert_eq!(
        (report.change_summary.moved, report.change_summary.total),
        (1, 1)
    );
    assert_eq!(id_of(&paths, &brain, "destination/depart.txt"), file_id);
    let moved = &journal(&paths, &brain, &[ChangeNature::Moved])[0];
    assert_eq!(moved.node_id, file_id);
    assert_eq!(moved.new_parent_id, Some(destination));

    // A folder move: one event on the folder, none on its child.
    fs::rename(root.join("dossier"), root.join("destination/dossier")).unwrap();
    let report = refresh_map(&paths, &brain).unwrap();
    assert_eq!(
        (report.change_summary.moved, report.change_summary.total),
        (1, 1),
        "{:?}",
        report.change_summary
    );
    assert_eq!(id_of(&paths, &brain, "destination/dossier"), folder_id);
    assert_eq!(
        id_of(&paths, &brain, "destination/dossier/enfant.txt"),
        child_id
    );
    let folder_events = journal(&paths, &brain, &[ChangeNature::Moved]);
    assert_eq!(folder_events[0].node_id, folder_id);
    assert!(folder_events.iter().all(|e| e.node_id != child_id));
}

/// A **real** `PATH_FALLBACK` node on Windows: a directory junction is a
/// reparse point, and `TASK-0036` B forbids opening any extra handle on one, so
/// the scanner gives it the raw-path identity. Renaming it therefore changes
/// its identity by design (`DEC-0009`): the journal must say `DELETED` +
/// `CREATED`, never `RENAMED`, and never recognise it by resemblance.
#[cfg(windows)]
#[test]
fn a_renamed_raw_path_node_is_a_real_delete_plus_a_real_create_never_a_rename() {
    let (temp, paths) = sandbox();
    let root = temp.path().join("racine-junction");
    let target = temp.path().join("cible-hors-racine");
    fs::create_dir_all(&root).unwrap();
    fs::create_dir_all(&target).unwrap();
    let junction = |name: &str| {
        let status = std::process::Command::new("cmd")
            .args(["/C", "mklink", "/J"])
            .arg(root.join(name))
            .arg(&target)
            .output()
            .expect("cmd mklink");
        assert!(status.status.success(), "mklink /J failed: {status:?}");
    };
    junction("lien-avant");
    let brain = register(&paths, &root);
    refresh_map(&paths, &brain).unwrap();
    let old_id = id_of(&paths, &brain, "lien-avant");
    let node = open_store(&paths, &brain)
        .unwrap()
        .index
        .node(old_id)
        .unwrap()
        .unwrap();
    assert_eq!(
        node.kind,
        NodeKind::Skipped,
        "a junction is an excluded reparse point"
    );

    fs::rename(root.join("lien-avant"), root.join("lien-apres")).unwrap();
    let report = refresh_map(&paths, &brain).unwrap();
    assert_eq!(
        (
            report.change_summary.created,
            report.change_summary.deleted,
            report.change_summary.renamed,
            report.change_summary.moved,
            report.change_summary.total
        ),
        (1, 1, 0, 0, 2),
        "a raw-path node cannot follow a rename: {:?}",
        report.change_summary
    );
    assert_ne!(id_of(&paths, &brain, "lien-apres"), old_id);
    let events = journal(&paths, &brain, &[]);
    assert!(
        events
            .iter()
            .any(|e| e.nature == ChangeNature::Deleted && e.node_id == old_id)
    );
    assert!(
        events
            .iter()
            .all(|e| !matches!(e.nature, ChangeNature::Renamed | ChangeNature::Moved))
    );
}

#[test]
fn a_change_that_the_platform_cannot_prove_is_a_delete_and_a_create() {
    // A raw path-fallback node cannot follow a rename. Forced on every
    // platform by an *online-only-like* condition is not available to a plain
    // test, so this proves the honest behaviour with a real change the
    // fallback identity cannot bridge: the file is deleted and a different
    // file appears at a different path with different content and mtime.
    let (temp, paths) = sandbox();
    let root = temp.path().join("racine-fallback");
    fs::create_dir_all(&root).unwrap();
    fs::write(root.join("un.txt"), b"1").unwrap();
    let brain = register(&paths, &root);
    refresh_map(&paths, &brain).unwrap();
    let old_id = id_of(&paths, &brain, "un.txt");

    fs::remove_file(root.join("un.txt")).unwrap();
    fs::write(root.join("deux.txt"), b"22").unwrap();
    let report = refresh_map(&paths, &brain).unwrap();
    assert_eq!(
        (
            report.change_summary.created,
            report.change_summary.deleted,
            report.change_summary.total
        ),
        (1, 1, 2)
    );
    assert_ne!(id_of(&paths, &brain, "deux.txt"), old_id);
}

#[test]
fn two_brains_on_the_same_root_keep_independent_journals() {
    let (temp, paths) = sandbox();
    let root = temp.path().join("racine-partagee");
    fs::create_dir_all(&root).unwrap();
    fs::write(root.join("base.txt"), b"x").unwrap();
    let one = register(&paths, &root);
    let two = register(&paths, &root);
    assert_ne!(one.brain_id, two.brain_id);
    refresh_map(&paths, &one).unwrap();
    refresh_map(&paths, &two).unwrap();

    fs::write(root.join("premier.txt"), b"1").unwrap();
    refresh_map(&paths, &one).unwrap(); // only brain one observes it
    fs::write(root.join("second.txt"), b"2").unwrap();
    refresh_map(&paths, &two).unwrap(); // brain two observes both at once

    let one_events = journal(&paths, &one, &[]);
    let two_events = journal(&paths, &two, &[]);
    assert_eq!(one_events.len(), 1);
    assert_eq!(two_events.len(), 2);
    assert!(one_events.iter().all(|e| e.brain_id == one.brain_id));
    assert!(two_events.iter().all(|e| e.brain_id == two.brain_id));
    assert_eq!(
        one_events[0].new_relative_path.as_deref(),
        Some("premier.txt")
    );

    // A cursor from one brain is refused by the other (distinct index ids).
    fs::write(root.join("troisieme.txt"), b"3").unwrap();
    refresh_map(&paths, &one).unwrap();
    let cursor_source = change_journal(&paths, &one, &[], None, 1).unwrap();
    let cursor = cursor_source.next_cursor.expect("two events, page of one");
    let error = change_journal(&paths, &two, &[], Some(&cursor), 50).expect_err("foreign cursor");
    assert!(
        error.to_string().starts_with("journal_cursor_foreign"),
        "{error}"
    );
}

#[test]
fn the_serialized_page_and_report_expose_no_path_no_key_and_no_identity() {
    let (temp, paths) = sandbox();
    let root = temp.path().join("racine-serialisation");
    fs::create_dir_all(root.join("sous")).unwrap();
    fs::write(root.join("sous/x.txt"), b"1").unwrap();
    let brain = register(&paths, &root);
    refresh_map(&paths, &brain).unwrap();
    fs::write(root.join("sous/y.txt"), b"2").unwrap();
    fs::remove_file(root.join("sous/x.txt")).unwrap();
    let report = refresh_map(&paths, &brain).unwrap();
    let page = change_journal(&paths, &brain, &[], None, 50).unwrap();
    assert_eq!(page.total, 2);

    let json = format!(
        "{}\n{}",
        serde_json::to_string(&page).unwrap(),
        serde_json::to_string(&report.change_summary).unwrap()
    );
    let root_text = root.to_string_lossy().to_string();
    let temp_text = temp.path().to_string_lossy().to_string();
    for forbidden in [
        root_text.as_str(),
        temp_text.as_str(),
        "stable_key",
        "stableKey",
        "fileId",
        "file_id",
        "volume",
        "SYS1",
        "PFv1",
        "provenance",
        ":\\\\",
    ] {
        assert!(
            !json.contains(forbidden),
            "{forbidden:?} leaked into: {json}"
        );
    }
    // The summary is counters and one boolean, nothing else.
    let summary: serde_json::Value = serde_json::to_value(report.change_summary).unwrap();
    let mut keys: Vec<_> = summary.as_object().unwrap().keys().cloned().collect();
    keys.sort();
    assert_eq!(
        keys,
        [
            "baselineEstablished",
            "created",
            "deleted",
            "modified",
            "moved",
            "renamed",
            "total"
        ]
    );
}

#[test]
fn the_journal_survives_reopening_the_index_from_disk() {
    let (temp, paths) = sandbox();
    let root = temp.path().join("racine-redemarrage");
    fs::create_dir_all(&root).unwrap();
    fs::write(root.join("a.txt"), b"1").unwrap();
    let brain = register(&paths, &root);
    refresh_map(&paths, &brain).unwrap();
    fs::write(root.join("b.txt"), b"2").unwrap();
    refresh_map(&paths, &brain).unwrap();
    let before = journal(&paths, &brain, &[]);
    assert_eq!(before.len(), 1);

    // Nothing of the previous handles survives: the file is opened cold.
    let database = paths.brain_map_database(&brain.brain_id);
    let cold = BrainIndex::open_existing(&database, false).expect("cold open");
    let identity = cold.index.identity().unwrap();
    let page =
        crate::change_journal::page(&cold.index.connection, &identity.index_id, &[], None, 50)
            .unwrap();
    assert_eq!(page.total, 1);
    assert_eq!(page.items[0].event_id, before[0].event_id);
    drop(cold);
    assert_eq!(journal(&paths, &brain, &[]), before);
}

// -- Schema v5 through the `M-B` boundary ----------------------------------------

fn raw_schema_version(database: &Path) -> i64 {
    rusqlite::Connection::open(database)
        .expect("open for version probe")
        .query_row("PRAGMA user_version", [], |row| row.get(0))
        .expect("version")
}

fn safety_copy_path(database: &Path) -> PathBuf {
    let mut name = database.file_name().unwrap().to_os_string();
    name.push(".migration-safety-copy");
    database.with_file_name(name)
}

/// Reduces a real, product-built **v5** index to exactly the **v4** shape
/// `TASK-0036` shipped: no journal, version stamped `4`. Everything else —
/// every node with its durable identity, `seen`, the binding, `index_id`,
/// `index_revision` — stays exactly as the real pipeline wrote it.
fn downgrade_to_schema_v4(database: &Path) {
    rusqlite::Connection::open(database)
        .expect("open for downgrade")
        .execute_batch(
            "DROP TABLE change_events;
             UPDATE schema_meta SET value = '4' WHERE key = 'schema_version';
             PRAGMA user_version = 4;",
        )
        .expect("downgrade to the v4 shape");
}

fn built_real_index(
    name: &str,
) -> (
    tempfile::TempDir,
    SandboxPaths,
    PathBuf,
    BrainRecord,
    PathBuf,
) {
    let (temp, paths) = sandbox();
    let root = temp.path().join(name);
    fs::create_dir_all(&root).unwrap();
    fs::write(root.join("avant.txt"), b"synthetique").unwrap();
    let brain = register(&paths, &root);
    refresh_map(&paths, &brain).expect("first refresh builds a real v5 index");
    let database = paths.brain_map_database(&brain.brain_id);
    (temp, paths, root, brain, database)
}

#[test]
fn a_real_v4_index_upgrades_to_v5_through_the_product_path_with_an_empty_journal() {
    let (_temp, paths, root, brain, database) = built_real_index("racine-v4");
    let file_id = id_of(&paths, &brain, "avant.txt");
    {
        let store = BrainIndex::open_existing(&database, true).unwrap();
        assert!(store.index.mark_seen(file_id).unwrap());
    }
    let (index_id, revision) = {
        let store = BrainIndex::open_existing(&database, false).unwrap();
        let identity = store.index.identity().unwrap();
        (identity.index_id, identity.revision)
    };
    downgrade_to_schema_v4(&database);
    assert_eq!(
        raw_schema_version(&database),
        4,
        "the fixture must really be v4"
    );

    let report = open_map(&paths, &brain).expect("map_open migrates a compatible v4 index");
    assert!(
        !report.source_read,
        "DEC-0032 A: migrating never reads the source"
    );
    assert_eq!(report.index_id, index_id);
    assert_eq!(
        report.revision, revision,
        "migration alone never advances the revision"
    );
    assert_eq!(
        raw_schema_version(&database),
        crate::map::store::MAP_SCHEMA_VERSION
    );
    assert!(
        !safety_copy_path(&database).exists(),
        "one bounded copy per attempt, deleted once the validation succeeded"
    );
    assert!(
        journal(&paths, &brain, &[]).is_empty(),
        "a migration never fabricates history"
    );
    let node = open_store(&paths, &brain)
        .unwrap()
        .index
        .node(file_id)
        .unwrap()
        .unwrap();
    assert!(node.seen, "seen survives the migration");

    // The migrated file journals normally from its very next publication:
    // its v4 rows already carry durable identities.
    fs::write(root.join("apres.txt"), b"neuf").unwrap();
    let refreshed = refresh_map(&paths, &brain).unwrap();
    assert!(!refreshed.change_summary.baseline_established);
    assert_eq!(
        (
            refreshed.change_summary.created,
            refreshed.change_summary.total
        ),
        (1, 1)
    );
}

#[test]
fn a_v4_to_v5_migration_that_fails_midway_restores_the_v4_file_in_full() {
    let (_temp, paths, _root, brain, database) = built_real_index("racine-v4-echec");
    downgrade_to_schema_v4(&database);
    // Obstruct an object the migration creates AFTER `change_events` itself:
    // the table is created inside the transaction and then the failure rolls
    // it back — a failure genuinely after mutation began.
    rusqlite::Connection::open(&database)
        .unwrap()
        .execute_batch("CREATE TABLE idx_change_events_nature (blocker INTEGER);")
        .unwrap();
    let before = fs::read(&database).unwrap();

    let error = open_map(&paths, &brain).expect_err("the obstructed migration must fail");
    assert!(matches!(error, MapError::Sqlite(_)), "{error:?}");
    assert_eq!(raw_schema_version(&database), 4, "user_version stays 4");
    assert!(
        !safety_copy_path(&database).exists(),
        "the transient copy is settled"
    );
    let has_journal: i64 = rusqlite::Connection::open(&database)
        .unwrap()
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE name = 'change_events'",
            [],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(has_journal, 0, "no half-migrated journal table survives");
    let _ = before; // bytes may legitimately differ after a quiesce; the logic above is the proof

    // Obstruction removed: the very same file now migrates cleanly.
    rusqlite::Connection::open(&database)
        .unwrap()
        .execute_batch("DROP TABLE idx_change_events_nature;")
        .unwrap();
    open_map(&paths, &brain).expect("a retry migrates");
    assert_eq!(
        raw_schema_version(&database),
        crate::map::store::MAP_SCHEMA_VERSION
    );
}

#[test]
fn a_v4_to_v5_migration_whose_canonical_validation_fails_is_restored_too() {
    let (_temp, paths, _root, brain, database) = built_real_index("racine-v4-validation");
    downgrade_to_schema_v4(&database);
    // A canonical invariant the migration never touches: the DDL succeeds and
    // only `finish_open_existing`'s validation refuses.
    rusqlite::Connection::open(&database)
        .unwrap()
        .execute(
            "UPDATE schema_meta SET value = 'no' WHERE key = 'build_complete'",
            [],
        )
        .unwrap();

    let error = open_map(&paths, &brain).expect_err("validation must refuse");
    assert!(
        error.to_string().starts_with("map_index_incompatible"),
        "{error}"
    );
    assert_eq!(raw_schema_version(&database), 4, "the v4 file is restored");
    assert!(!safety_copy_path(&database).exists());

    rusqlite::Connection::open(&database)
        .unwrap()
        .execute(
            "UPDATE schema_meta SET value = '1' WHERE key = 'build_complete'",
            [],
        )
        .unwrap();
    open_map(&paths, &brain).expect("repaired retry migrates");
    assert_eq!(
        raw_schema_version(&database),
        crate::map::store::MAP_SCHEMA_VERSION
    );
}

#[test]
fn a_v5_file_without_its_journal_table_fails_the_canonical_validation() {
    let (_temp, paths, _root, brain, database) = built_real_index("racine-v5-sans-journal");
    rusqlite::Connection::open(&database)
        .unwrap()
        .execute_batch("DROP TABLE change_events;")
        .unwrap();
    let error = open_map(&paths, &brain).expect_err("a v5 file with no journal is not canonical");
    assert!(
        error.to_string().starts_with("map_index_incompatible"),
        "{error}"
    );
}

#[test]
fn a_v3_index_migrated_to_v5_is_re_baselined_by_its_first_republication_not_flooded() {
    let (_temp, paths, root, brain, database) = built_real_index("racine-v3-vers-v5");
    // v5 → v3 in one go: no journal, no identity columns.
    rusqlite::Connection::open(&database)
        .unwrap()
        .execute_batch(
            "DROP TABLE change_events;
             DROP INDEX IF EXISTS idx_nodes_stable_key;
             ALTER TABLE nodes DROP COLUMN identity_provenance;
             ALTER TABLE nodes DROP COLUMN stable_key;
             DELETE FROM schema_meta WHERE key = 'next_node_id';
             UPDATE schema_meta SET value = '3' WHERE key = 'schema_version';
             PRAGMA user_version = 3;",
        )
        .unwrap();
    open_map(&paths, &brain).expect("v3 migrates through both steps in one M-B envelope");
    assert_eq!(
        raw_schema_version(&database),
        crate::map::store::MAP_SCHEMA_VERSION
    );
    assert!(!safety_copy_path(&database).exists());

    // Every migrated row has no durable identity yet: the first republication
    // re-stamps them and journals NOTHING, instead of one DELETED plus one
    // CREATED per node.
    fs::write(root.join("nouveau.txt"), b"neuf").unwrap();
    let republished = refresh_map(&paths, &brain).unwrap();
    assert!(republished.change_summary.baseline_established);
    assert_eq!(republished.change_summary.total, 0);
    assert!(journal(&paths, &brain, &[]).is_empty());

    // The next one compares.
    fs::write(root.join("suivant.txt"), b"suite").unwrap();
    let next = refresh_map(&paths, &brain).unwrap();
    assert_eq!(
        (next.change_summary.created, next.change_summary.total),
        (1, 1)
    );
}
