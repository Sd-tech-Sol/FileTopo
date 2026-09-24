//! `TASK-0038` — the journal-derived seen/unseen state (`DEC-0036`).
//!
//! Two levels, like the journal tests they build on:
//!
//! * **Index level** — synthetic, controlled identities fed straight to
//!   `Index::publish_with_identity`, so the semantics (`new`, `unseen`, the three
//!   gestures) are proven on every platform without depending on the
//!   filesystem;
//! * **Product level** — real `REAL_ROOT` brains, the real scanner, the real
//!   `M-B` migration, and the command functions the Tauri layer wraps.
//!
//! Every tree is created by the test that reads it, under a `tempfile`
//! directory. **No personal brain, no personal folder.**

use super::change_journal_tests::{
    Spec, all_events, base, built_real_index, canonical, id_of, in_memory, journal, many_files,
    publish, raw_schema_version, register, safety_copy_path, sandbox, spec,
};
use super::*;
use crate::change_journal::{
    self as cj, ChangeNature, JournalCursor, JournalError, NodeChangeState,
};
use crate::domain::NodeKind;
use crate::index::Index;
use std::fs;

// -- Index level ---------------------------------------------------------------

fn state(index: &Index, id: i64) -> NodeChangeState {
    cj::node_change_state(&index.connection, id).expect("node state")
}

fn watermark(index: &Index) -> i64 {
    cj::seen_watermark(&index.connection).expect("watermark")
}

fn acknowledged_rows(index: &Index) -> Vec<i64> {
    let mut statement = index
        .connection
        .prepare("SELECT event_id FROM seen_change_events ORDER BY event_id")
        .unwrap();
    statement
        .query_map([], |row| row.get(0))
        .unwrap()
        .collect::<rusqlite::Result<Vec<i64>>>()
        .unwrap()
}

fn unseen_total(index: &Index) -> u64 {
    cj::unseen_event_total(&index.connection).unwrap()
}

/// `base()` plus one new file.
fn with_new(name: &'static str, id: i64, key: &'static str) -> Vec<Spec> {
    let mut next = base();
    next.push(spec(id, Some(1), name, name, NodeKind::File, key).size(5));
    next
}

#[test]
fn a_fresh_v6_file_starts_with_a_zero_watermark_an_empty_ack_table_and_a_canonical_seen_state() {
    let index = in_memory();
    assert_eq!(watermark(&index), 0);
    assert!(acknowledged_rows(&index).is_empty());
    assert!(cj::validate_seen_schema(&index.connection).unwrap());
    assert_eq!(unseen_total(&index), 0);
}

#[test]
fn the_first_event_after_the_baseline_is_unseen() {
    let mut index = in_memory();
    publish(&mut index, &base()).unwrap();
    // The baseline publication journals nothing, so nothing can be unseen.
    assert_eq!(unseen_total(&index), 0);

    publish(&mut index, &with_new("neuf.txt", 6, "K-new")).unwrap();
    let events = all_events(&index, &[]);
    assert_eq!(events.len(), 1);
    assert!(!events[0].seen, "the first post-v6 event is unseen");
    assert_eq!(unseen_total(&index), 1);
}

#[test]
fn a_created_node_is_new_and_unseen_until_its_creation_is_acknowledged() {
    let mut index = in_memory();
    publish(&mut index, &base()).unwrap();
    publish(&mut index, &with_new("neuf.txt", 6, "K-new")).unwrap();
    let id = canonical(&index, "neuf.txt");

    let before = state(&index, id);
    assert!(before.is_new && before.is_unseen);
    assert_eq!(before.unseen_change_count, 1);

    // A node that existed at the baseline has no event at all: seen, not new.
    let old = state(&index, canonical(&index, "g.txt"));
    assert_eq!(
        (old.is_new, old.is_unseen, old.unseen_change_count),
        (false, false, 0)
    );

    let created = all_events(&index, &[ChangeNature::Created])[0].event_id;
    let marked = cj::mark_event_seen(&index.connection, created).unwrap();
    assert!(!marked.already_seen);
    let after = state(&index, id);
    assert!(
        !after.is_new && !after.is_unseen,
        "acknowledging the CREATED event makes the node neither new nor unseen"
    );
}

#[test]
fn a_modification_after_an_acknowledged_creation_is_unseen_but_not_new() {
    let mut index = in_memory();
    publish(&mut index, &base()).unwrap();
    let mut next = with_new("neuf.txt", 6, "K-new");
    publish(&mut index, &next).unwrap();
    let id = canonical(&index, "neuf.txt");
    let created = all_events(&index, &[ChangeNature::Created])[0].event_id;
    cj::mark_event_seen(&index.connection, created).unwrap();

    // The file grows: a MODIFIED event on the same node.
    let last = next.len() - 1;
    next[last] = spec(6, Some(1), "neuf.txt", "neuf.txt", NodeKind::File, "K-new").size(99);
    publish(&mut index, &next).unwrap();

    let s = state(&index, id);
    assert!(s.is_unseen, "a later MODIFIED is unseen");
    assert!(!s.is_new, "…but the creation was acknowledged: not new");
    assert_eq!(s.unseen_change_count, 1);
}

#[test]
fn marking_a_change_is_idempotent_and_writes_one_row_at_most() {
    let mut index = in_memory();
    publish(&mut index, &base()).unwrap();
    publish(&mut index, &with_new("neuf.txt", 6, "K-new")).unwrap();
    let event = all_events(&index, &[])[0].event_id;

    assert!(
        !cj::mark_event_seen(&index.connection, event)
            .unwrap()
            .already_seen
    );
    assert!(
        cj::mark_event_seen(&index.connection, event)
            .unwrap()
            .already_seen,
        "the second gesture is a no-op"
    );
    assert_eq!(acknowledged_rows(&index), vec![event]);
    assert_eq!(unseen_total(&index), 0);
}

#[test]
fn marking_an_element_acknowledges_only_that_element() {
    let mut index = in_memory();
    publish(&mut index, &base()).unwrap();
    let mut next = with_new("un.txt", 6, "K-un");
    next.push(spec(7, Some(1), "deux.txt", "deux.txt", NodeKind::File, "K-deux").size(5));
    publish(&mut index, &next).unwrap();
    let (un, deux) = (canonical(&index, "un.txt"), canonical(&index, "deux.txt"));

    let newly = cj::mark_node_seen(&index.connection, un).unwrap();
    assert_eq!(newly, 1);
    let s_un = state(&index, un);
    assert!(!s_un.is_new && !s_un.is_unseen);
    let s_deux = state(&index, deux);
    assert!(
        s_deux.is_new && s_deux.is_unseen,
        "another node is untouched"
    );
    assert_eq!(unseen_total(&index), 1);

    // Idempotent: nothing left to acknowledge for that node.
    assert_eq!(cj::mark_node_seen(&index.connection, un).unwrap(), 0);
}

#[test]
fn a_change_of_an_element_detected_after_it_was_marked_seen_stays_unseen() {
    let mut index = in_memory();
    publish(&mut index, &base()).unwrap();
    let mut next = with_new("un.txt", 6, "K-un");
    publish(&mut index, &next).unwrap();
    let id = canonical(&index, "un.txt");
    cj::mark_node_seen(&index.connection, id).unwrap();
    assert!(!state(&index, id).is_unseen);

    let last = next.len() - 1;
    next[last] = spec(6, Some(1), "un.txt", "un.txt", NodeKind::File, "K-un").size(77);
    publish(&mut index, &next).unwrap();
    let s = state(&index, id);
    assert!(
        s.is_unseen && !s.is_new,
        "the future event is unseen: {s:?}"
    );
    assert_eq!(s.unseen_change_count, 1);
}

#[test]
fn mark_all_acknowledges_everything_that_exists_at_its_commit_and_advances_the_watermark() {
    let mut index = in_memory();
    publish(&mut index, &base()).unwrap();
    let mut next = with_new("a1.txt", 6, "K-a1");
    next.push(spec(7, Some(1), "a2.txt", "a2.txt", NodeKind::File, "K-a2").size(5));
    publish(&mut index, &next).unwrap();
    // One event acknowledged individually first: the new watermark absorbs it.
    let one = all_events(&index, &[])[0].event_id;
    cj::mark_event_seen(&index.connection, one).unwrap();
    assert_eq!(acknowledged_rows(&index), vec![one]);
    let newest = all_events(&index, &[])
        .iter()
        .map(|e| e.event_id)
        .max()
        .unwrap();

    let outcome = cj::mark_all_seen(&index.connection).unwrap();
    assert_eq!(outcome.seen_through_event_id, newest);
    assert_eq!(outcome.newly_seen, 1, "one was already acknowledged");
    assert_eq!(watermark(&index), newest);
    assert!(
        acknowledged_rows(&index).is_empty(),
        "explicit acknowledgements the watermark makes redundant are removed"
    );
    assert_eq!(unseen_total(&index), 0);
    assert!(all_events(&index, &[]).iter().all(|e| e.seen));
    for name in ["a1.txt", "a2.txt"] {
        let s = state(&index, canonical(&index, name));
        assert!(!s.is_new && !s.is_unseen);
    }

    // Idempotent and monotone: a second call moves nothing.
    let again = cj::mark_all_seen(&index.connection).unwrap();
    assert_eq!((again.seen_through_event_id, again.newly_seen), (newest, 0));
}

#[test]
fn an_event_published_after_mark_all_committed_stays_unseen() {
    let mut index = in_memory();
    publish(&mut index, &base()).unwrap();
    let mut next = with_new("avant.txt", 6, "K-avant");
    publish(&mut index, &next).unwrap();
    let before = cj::mark_all_seen(&index.connection).unwrap();

    next.push(
        spec(
            7,
            Some(1),
            "apres.txt",
            "apres.txt",
            NodeKind::File,
            "K-apres",
        )
        .size(5),
    );
    publish(&mut index, &next).unwrap();
    let events = all_events(&index, &[]);
    let after = events
        .iter()
        .find(|e| e.new_name.as_deref() == Some("apres.txt"))
        .unwrap();
    assert!(after.event_id > before.seen_through_event_id);
    assert!(!after.seen, "an event detected after the mark is unseen");
    let s = state(&index, canonical(&index, "apres.txt"));
    assert!(s.is_new && s.is_unseen);
    assert_eq!(unseen_total(&index), 1);
    assert!(
        events
            .iter()
            .filter(|e| e.event_id <= before.seen_through_event_id)
            .all(|e| e.seen)
    );
}

#[test]
fn mark_all_waits_for_a_writer_then_covers_what_that_writer_committed_and_nothing_after() {
    // A writer holds the write lock and has an event pending. Mark-all, on a
    // second connection, cannot take its own write lock until the writer
    // commits — so the event is committed BEFORE mark-all's own commit and is
    // therefore seen. An event committed after mark-all is above the watermark.
    let directory = tempfile::tempdir().unwrap();
    let path = directory.path().join("brain.sqlite3");
    let mut writer = Index::open(&path).unwrap();
    publish(&mut writer, &base()).unwrap();
    publish(&mut writer, &with_new("un.txt", 6, "K-un")).unwrap();

    writer
        .connection
        .execute_batch(
            "BEGIN IMMEDIATE;
             INSERT INTO change_events (detected_revision, ordinal, nature, node_id,
                 node_kind, new_name, new_relative_path, detected_unix_ms)
             VALUES (99, 0, 'CREATED', 777, 'file', 'pendant', 'pendant', 1);",
        )
        .unwrap();
    let pending: i64 = writer
        .connection
        .query_row("SELECT last_insert_rowid()", [], |row| row.get(0))
        .unwrap();

    let marker = rusqlite::Connection::open(&path).unwrap();
    marker
        .busy_timeout(std::time::Duration::from_secs(20))
        .unwrap();
    marker.execute_batch("PRAGMA foreign_keys=ON;").unwrap();
    let handle = std::thread::spawn(move || cj::mark_all_seen(&marker).unwrap());
    std::thread::sleep(std::time::Duration::from_millis(300));
    assert!(
        !handle.is_finished(),
        "mark-all must wait for the writer's lock, not read around it"
    );
    writer.connection.execute_batch("COMMIT;").unwrap();
    let outcome = handle.join().unwrap();

    assert_eq!(
        outcome.seen_through_event_id, pending,
        "the event the writer committed first is inside the mark"
    );
    assert_eq!(
        outcome.newly_seen, 2,
        "the CREATED of un.txt and the pending one"
    );
    assert_eq!(unseen_total(&writer), 0);

    // After the commit of the mark: a new publication is above the watermark.
    let mut next = with_new("un.txt", 6, "K-un");
    next.push(spec(7, Some(1), "deux.txt", "deux.txt", NodeKind::File, "K-deux").size(5));
    publish(&mut writer, &next).unwrap();
    assert_eq!(unseen_total(&writer), 1);
    assert_eq!(watermark(&writer), pending);
}

#[test]
fn a_deleted_event_can_be_acknowledged_but_its_node_is_not_selectable() {
    let mut index = in_memory();
    publish(&mut index, &base()).unwrap();
    let gone = canonical(&index, "g.txt");
    let without: Vec<Spec> = base()
        .into_iter()
        .enumerate()
        .filter(|(n, _)| *n != 4)
        .map(|(_, s)| s)
        .collect();
    publish(&mut index, &without).unwrap();
    let deleted = all_events(&index, &[ChangeNature::Deleted]);
    assert_eq!(deleted.len(), 1);
    assert!(!deleted[0].node_present);
    assert!(!deleted[0].seen);

    // As a node: refused, on both element operations.
    assert!(matches!(
        cj::node_change_state(&index.connection, gone),
        Err(JournalError::NodeMissing(id)) if id == gone
    ));
    assert!(matches!(
        cj::mark_node_seen(&index.connection, gone),
        Err(JournalError::NodeMissing(id)) if id == gone
    ));
    assert_eq!(unseen_total(&index), 1, "the refusal wrote nothing");

    // As a change: acknowledgeable.
    cj::mark_event_seen(&index.connection, deleted[0].event_id).unwrap();
    assert!(all_events(&index, &[ChangeNature::Deleted])[0].seen);
    assert_eq!(unseen_total(&index), 0);
}

#[test]
fn an_unknown_event_or_node_is_refused_clearly_and_nothing_is_written() {
    let mut index = in_memory();
    publish(&mut index, &base()).unwrap();
    publish(&mut index, &with_new("neuf.txt", 6, "K-neuf")).unwrap();

    let error = cj::mark_event_seen(&index.connection, 9_999).expect_err("unknown event");
    assert!(matches!(error, JournalError::EventMissing(9_999)));
    assert_eq!(error.to_string(), "journal_event_missing: 9999");
    let error = cj::mark_node_seen(&index.connection, 9_999).expect_err("unknown node");
    assert!(matches!(error, JournalError::NodeMissing(9_999)));
    assert_eq!(error.to_string(), "map_node_missing: 9999");
    assert!(matches!(
        cj::node_change_state(&index.connection, 9_999),
        Err(JournalError::NodeMissing(9_999))
    ));
    assert_eq!((watermark(&index), acknowledged_rows(&index)), (0, vec![]));

    // The storage itself refuses an acknowledgement of a phantom event.
    let phantom = index.connection.execute(
        "INSERT INTO seen_change_events(event_id) VALUES (424242)",
        [],
    );
    assert!(phantom.is_err(), "the foreign key must refuse a phantom");
}

#[test]
fn a_system_rename_keeps_the_node_id_and_makes_the_node_unseen_but_not_new() {
    let mut index = in_memory();
    publish(&mut index, &base()).unwrap();
    let id = canonical(&index, "a/f.txt");
    let mut next = base();
    next[3] = spec(4, Some(2), "h.txt", "a/h.txt", NodeKind::File, "K-f")
        .size(10)
        .mtime(100);
    publish(&mut index, &next).unwrap();

    assert_eq!(canonical(&index, "a/h.txt"), id, "same nodeId after rename");
    let s = state(&index, id);
    assert!(s.is_unseen && !s.is_new, "{s:?}");
    assert_eq!(s.unseen_change_count, 1);
}

#[test]
fn a_node_whose_identity_changes_is_a_new_node_and_the_old_delete_stays_independent() {
    // The `PATH_FALLBACK` shape at index level: the key changes, so the old
    // node is DELETED and a different node is CREATED (`DEC-0009`).
    let mut index = in_memory();
    publish(&mut index, &base()).unwrap();
    let old = canonical(&index, "g.txt");
    let mut next = base();
    next[4] = spec(9, Some(1), "g2.txt", "g2.txt", NodeKind::File, "K-g-autre")
        .size(20)
        .mtime(200);
    publish(&mut index, &next).unwrap();
    let new = canonical(&index, "g2.txt");
    assert_ne!(new, old);

    let s = state(&index, new);
    assert!(s.is_new && s.is_unseen);
    let deleted = all_events(&index, &[ChangeNature::Deleted]);
    assert_eq!(deleted[0].node_id, old);
    assert!(!deleted[0].seen);
    // Independent: acknowledging the delete leaves the new node new.
    cj::mark_event_seen(&index.connection, deleted[0].event_id).unwrap();
    assert!(state(&index, new).is_new);
    // …and the other way round.
    cj::mark_node_seen(&index.connection, new).unwrap();
    assert!(!state(&index, new).is_new);
}

#[test]
fn the_legacy_nodes_seen_column_is_never_the_truth() {
    let mut index = in_memory();
    publish(&mut index, &base()).unwrap();
    publish(&mut index, &with_new("neuf.txt", 6, "K-neuf")).unwrap();
    let id = canonical(&index, "neuf.txt");
    let flag = |index: &Index| -> i64 {
        index
            .connection
            .query_row("SELECT seen FROM nodes WHERE id = ?1", [id], |r| r.get(0))
            .unwrap()
    };

    // The prototype flag set to "seen": the journal still says new + unseen.
    index.mark_seen(id).unwrap();
    assert_eq!(flag(&index), 1);
    let s = state(&index, id);
    assert!(s.is_new && s.is_unseen, "nodes.seen must not decide: {s:?}");

    // Acknowledged through the journal, with the prototype flag forced to
    // "unseen": the journal still says seen.
    cj::mark_node_seen(&index.connection, id).unwrap();
    index
        .connection
        .execute("UPDATE nodes SET seen = 0 WHERE id = ?1", [id])
        .unwrap();
    let s = state(&index, id);
    assert!(
        !s.is_new && !s.is_unseen,
        "nodes.seen = 0 must not resurrect it: {s:?}"
    );

    // And the new gestures never write the legacy column.
    let mut other = with_new("neuf.txt", 6, "K-neuf");
    other.push(
        spec(
            7,
            Some(1),
            "autre.txt",
            "autre.txt",
            NodeKind::File,
            "K-autre",
        )
        .size(1),
    );
    publish(&mut index, &other).unwrap();
    let other_id = canonical(&index, "autre.txt");
    cj::mark_node_seen(&index.connection, other_id).unwrap();
    cj::mark_all_seen(&index.connection).unwrap();
    let column: i64 = index
        .connection
        .query_row("SELECT seen FROM nodes WHERE id = ?1", [other_id], |r| {
            r.get(0)
        })
        .unwrap();
    assert_eq!(column, 0, "the gestures leave nodes.seen alone");
}

#[test]
fn marking_never_changes_an_event_a_cursor_or_the_order_of_the_journal() {
    let mut index = in_memory();
    publish(&mut index, &base()).unwrap();
    let mut batch = base();
    batch.extend(many_files(130, 100, "lot"));
    publish(&mut index, &batch).unwrap();
    let index_id = index.identity().unwrap().index_id;

    let events_of = |index: &Index| {
        all_events(index, &[])
            .into_iter()
            .map(|e| {
                (
                    e.event_id,
                    e.detected_revision,
                    e.ordinal,
                    e.nature,
                    e.node_id,
                    e.new_relative_path,
                )
            })
            .collect::<Vec<_>>()
    };
    let before = events_of(&index);
    assert_eq!(before.len(), 130);
    let first = cj::page(&index.connection, &index_id, &[], None, 50).unwrap();
    let cursor = first.next_cursor.clone().expect("more pages");
    let resumed_before = cj::page(&index.connection, &index_id, &[], Some(&cursor), 50).unwrap();

    // Every gesture, in turn.
    cj::mark_event_seen(&index.connection, first.items[3].event_id).unwrap();
    cj::mark_node_seen(&index.connection, first.items[7].node_id).unwrap();
    cj::mark_all_seen(&index.connection).unwrap();

    assert_eq!(
        events_of(&index),
        before,
        "no event created, removed, altered or reordered"
    );
    assert_eq!(
        cj::page(&index.connection, &index_id, &[], Some(&cursor), 50)
            .expect("the cursor issued before the mark is still valid")
            .items
            .iter()
            .map(|e| e.event_id)
            .collect::<Vec<_>>(),
        resumed_before
            .items
            .iter()
            .map(|e| e.event_id)
            .collect::<Vec<_>>()
    );
    assert!(JournalCursor::decode(&cursor.encode()).is_ok());
    let row_count: i64 = index
        .connection
        .query_row("SELECT COUNT(*) FROM change_events", [], |r| r.get(0))
        .unwrap();
    assert_eq!(row_count, 130);
}

#[test]
fn the_page_flags_and_the_unseen_total_describe_the_same_snapshot_and_ignore_the_filter() {
    let mut index = in_memory();
    publish(&mut index, &base()).unwrap();
    let mut next = with_new("un.txt", 6, "K-un");
    publish(&mut index, &next).unwrap();
    let last = next.len() - 1;
    next[last] = spec(6, Some(1), "un.txt", "un.txt", NodeKind::File, "K-un").size(50);
    publish(&mut index, &next).unwrap();
    let index_id = index.identity().unwrap().index_id;

    let all = cj::page(&index.connection, &index_id, &[], None, 50).unwrap();
    assert_eq!((all.total, all.unseen_total), (2, 2));
    let created_only = cj::page(
        &index.connection,
        &index_id,
        &[ChangeNature::Created],
        None,
        50,
    )
    .unwrap();
    assert_eq!(created_only.total, 1);
    assert_eq!(
        created_only.unseen_total, 2,
        "the unseen count is what « Tout marquer vu » would affect, not the filter's"
    );
    cj::mark_event_seen(&index.connection, created_only.items[0].event_id).unwrap();
    let after = cj::page(&index.connection, &index_id, &[], None, 50).unwrap();
    assert_eq!(after.unseen_total, 1);
    assert_eq!(
        after
            .items
            .iter()
            .map(|e| (e.nature, e.seen))
            .collect::<Vec<_>>(),
        vec![
            (ChangeNature::Modified, false),
            (ChangeNature::Created, true)
        ]
    );
}

#[test]
fn a_watermark_beyond_the_journal_or_a_missing_one_is_not_a_canonical_seen_state() {
    let mut index = in_memory();
    publish(&mut index, &base()).unwrap();
    publish(&mut index, &with_new("neuf.txt", 6, "K-neuf")).unwrap();
    assert!(cj::validate_seen_schema(&index.connection).unwrap());

    index
        .connection
        .execute(
            "UPDATE schema_meta SET value = '999' WHERE key = 'seen_through_event_id'",
            [],
        )
        .unwrap();
    assert!(
        !cj::validate_seen_schema(&index.connection).unwrap(),
        "a watermark past the newest event would hide every future event"
    );
    index
        .connection
        .execute(
            "UPDATE schema_meta SET value = 'x' WHERE key = 'seen_through_event_id'",
            [],
        )
        .unwrap();
    assert!(!cj::validate_seen_schema(&index.connection).unwrap());
    index
        .connection
        .execute(
            "DELETE FROM schema_meta WHERE key = 'seen_through_event_id'",
            [],
        )
        .unwrap();
    assert!(!cj::validate_seen_schema(&index.connection).unwrap());
}

// -- Product level -------------------------------------------------------------

fn reference(brain: &BrainRecord, node_id: i64) -> BrainNodeRef {
    BrainNodeRef::new(&brain.brain_id, node_id)
}

fn node_state(paths: &SandboxPaths, brain: &BrainRecord, node_id: i64) -> NodeChangeStateDto {
    node_change_state(paths, brain, &reference(brain, node_id)).expect("node change state")
}

fn watermark_on_disk(database: &Path) -> Option<String> {
    rusqlite::Connection::open(database)
        .unwrap()
        .query_row(
            "SELECT value FROM schema_meta WHERE key = 'seen_through_event_id'",
            [],
            |row| row.get(0),
        )
        .ok()
}

fn has_object(database: &Path, name: &str) -> bool {
    let count: i64 = rusqlite::Connection::open(database)
        .unwrap()
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE name = ?1",
            [name],
            |row| row.get(0),
        )
        .unwrap();
    count > 0
}

/// Reduces a real, product-built **v6** index to exactly the **v5** shape
/// `TASK-0037` shipped: the journal stays, the seen state disappears, the
/// version is stamped `5`. Every event, node, binding, `index_id` and revision
/// stays exactly as the real pipeline wrote it.
fn downgrade_to_schema_v5(database: &Path) {
    rusqlite::Connection::open(database)
        .expect("open for downgrade")
        .execute_batch(
            "DROP TABLE seen_change_events;
             DROP INDEX idx_change_events_node;
             DELETE FROM schema_meta WHERE key = 'seen_through_event_id';
             UPDATE schema_meta SET value = '5' WHERE key = 'schema_version';
             PRAGMA user_version = 5;",
        )
        .expect("downgrade to the v5 shape");
}

/// A real brain with journal history: a baseline, then three changes.
fn brain_with_history(
    name: &str,
) -> (
    tempfile::TempDir,
    SandboxPaths,
    PathBuf,
    BrainRecord,
    PathBuf,
) {
    let (temp, paths, root, brain, database) = built_real_index(name);
    fs::write(root.join("un.txt"), b"1").unwrap();
    fs::write(root.join("deux.txt"), b"22").unwrap();
    refresh_map(&paths, &brain).unwrap();
    fs::write(root.join("avant.txt"), b"synthetique, modifie").unwrap();
    refresh_map(&paths, &brain).unwrap();
    assert_eq!(journal(&paths, &brain, &[]).len(), 3);
    (temp, paths, root, brain, database)
}

#[test]
fn a_real_v5_index_with_history_migrates_to_v6_baselined_history_kept_and_nothing_unseen() {
    let (_temp, paths, root, brain, database) = brain_with_history("racine-v5-historique");
    let events_before = journal(&paths, &brain, &[]);
    let newest = events_before.iter().map(|e| e.event_id).max().unwrap();
    let (index_id, revision) = {
        let store = BrainIndex::open_existing(&database, false).unwrap();
        let identity = store.index.identity().unwrap();
        (identity.index_id, identity.revision)
    };
    let un = id_of(&paths, &brain, "un.txt");
    downgrade_to_schema_v5(&database);
    assert_eq!(
        raw_schema_version(&database),
        5,
        "the fixture must really be v5"
    );
    assert_eq!(watermark_on_disk(&database), None);

    let report = open_map(&paths, &brain).expect("map_open migrates a compatible v5 index");
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
    assert_eq!(raw_schema_version(&database), 6);
    assert!(
        !safety_copy_path(&database).exists(),
        "the copy is deleted only after the validation succeeded"
    );

    // Baseline: the watermark sits at the newest existing event.
    assert_eq!(watermark_on_disk(&database), Some(newest.to_string()));
    let events_after = journal(&paths, &brain, &[]);
    assert_eq!(
        events_after.len(),
        events_before.len(),
        "the history is kept whole"
    );
    assert!(
        events_after.iter().all(|e| e.seen),
        "…and consultable, but not suddenly 'unseen'"
    );
    let page = change_journal(&paths, &brain, &[], None, 50).unwrap();
    assert_eq!(page.unseen_total, 0);
    let s = node_state(&paths, &brain, un);
    assert!(!s.is_new && !s.is_unseen, "no false backlog: {s:?}");

    // Same events, same order, same everything but the new flag.
    let strip = |events: &[ChangeEvent]| {
        events
            .iter()
            .map(|e| (e.event_id, e.nature, e.node_id, e.new_relative_path.clone()))
            .collect::<Vec<_>>()
    };
    assert_eq!(strip(&events_after), strip(&events_before));

    // Tracking starts now: the next detected change is unseen.
    fs::write(root.join("suivant.txt"), b"neuf").unwrap();
    refresh_map(&paths, &brain).unwrap();
    let page = change_journal(&paths, &brain, &[], None, 50).unwrap();
    assert_eq!(page.unseen_total, 1);
    assert!(!page.items[0].seen && page.items[0].nature == ChangeNature::Created);
    assert!(page.items[1..].iter().all(|e| e.seen));
    let id = id_of(&paths, &brain, "suivant.txt");
    let s = node_state(&paths, &brain, id);
    assert!(s.is_new && s.is_unseen);
}

#[test]
fn a_real_v5_index_with_an_empty_journal_baselines_at_zero() {
    let (_temp, paths, _root, brain, database) = built_real_index("racine-v5-vide");
    assert!(journal(&paths, &brain, &[]).is_empty());
    downgrade_to_schema_v5(&database);
    open_map(&paths, &brain).expect("migrates");
    assert_eq!(watermark_on_disk(&database), Some("0".to_string()));
    assert_eq!(raw_schema_version(&database), 6);
}

#[test]
fn a_v5_to_v6_migration_that_fails_midway_restores_the_v5_file_in_full() {
    let (_temp, paths, _root, brain, database) = brain_with_history("racine-v5-echec");
    let events_before = journal(&paths, &brain, &[]);
    downgrade_to_schema_v5(&database);
    // Obstruct an object the step creates AFTER its table: the table is created
    // inside the transaction and the failure rolls it back — a failure genuinely
    // after mutation began.
    rusqlite::Connection::open(&database)
        .unwrap()
        .execute_batch("CREATE TABLE idx_change_events_node (blocker INTEGER);")
        .unwrap();

    let error = open_map(&paths, &brain).expect_err("the obstructed migration must fail");
    assert!(matches!(error, MapError::Sqlite(_)), "{error:?}");
    assert_eq!(raw_schema_version(&database), 5, "user_version stays 5");
    assert!(
        !safety_copy_path(&database).exists(),
        "the transient copy is settled"
    );
    assert!(
        !has_object(&database, "seen_change_events"),
        "no half-migrated table"
    );
    assert_eq!(
        watermark_on_disk(&database),
        None,
        "no half-written watermark"
    );
    // The v5 journal is intact.
    let intact: i64 = rusqlite::Connection::open(&database)
        .unwrap()
        .query_row("SELECT COUNT(*) FROM change_events", [], |row| row.get(0))
        .unwrap();
    assert_eq!(intact as usize, events_before.len());

    // Obstruction removed: the very same file migrates cleanly.
    rusqlite::Connection::open(&database)
        .unwrap()
        .execute_batch("DROP TABLE idx_change_events_node;")
        .unwrap();
    open_map(&paths, &brain).expect("a retry migrates");
    assert_eq!(raw_schema_version(&database), 6);
    assert_eq!(journal(&paths, &brain, &[]).len(), events_before.len());
}

#[test]
fn a_v5_to_v6_migration_whose_canonical_validation_fails_is_restored_too() {
    let (_temp, paths, _root, brain, database) = brain_with_history("racine-v5-validation");
    downgrade_to_schema_v5(&database);
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
    assert_eq!(raw_schema_version(&database), 5, "the v5 file is restored");
    assert!(!safety_copy_path(&database).exists());
    assert!(!has_object(&database, "seen_change_events"));
    assert_eq!(watermark_on_disk(&database), None);

    rusqlite::Connection::open(&database)
        .unwrap()
        .execute(
            "UPDATE schema_meta SET value = '1' WHERE key = 'build_complete'",
            [],
        )
        .unwrap();
    open_map(&paths, &brain).expect("repaired retry migrates");
    assert_eq!(raw_schema_version(&database), 6);
}

#[test]
fn a_v6_file_without_its_seen_state_fails_the_canonical_validation() {
    let (_temp, paths, _root, brain, database) = built_real_index("racine-v6-sans-etat");
    rusqlite::Connection::open(&database)
        .unwrap()
        .execute_batch("DELETE FROM schema_meta WHERE key = 'seen_through_event_id';")
        .unwrap();
    let error = open_map(&paths, &brain).expect_err("a v6 file with no watermark is not canonical");
    assert!(
        error.to_string().starts_with("map_index_incompatible"),
        "{error}"
    );
}

#[test]
fn the_product_gestures_persist_across_a_cold_reopening_of_the_index() {
    let (_temp, paths, root, brain, database) = built_real_index("racine-persistance");
    fs::write(root.join("a.txt"), b"1").unwrap();
    fs::write(root.join("b.txt"), b"2").unwrap();
    refresh_map(&paths, &brain).unwrap();
    let events = journal(&paths, &brain, &[]);
    assert_eq!(events.len(), 2);
    assert!(events.iter().all(|e| !e.seen));

    let first = events
        .iter()
        .find(|e| e.new_relative_path.as_deref() == Some("a.txt"))
        .unwrap();
    let marked = mark_change_seen(&paths, &brain, first.event_id).unwrap();
    assert!(!marked.already_seen);
    assert!(
        mark_change_seen(&paths, &brain, first.event_id)
            .unwrap()
            .already_seen
    );

    // Cold: nothing of the previous handles survives.
    {
        let cold = BrainIndex::open_existing(&database, false).expect("cold open");
        let identity = cold.index.identity().unwrap();
        let page = cj::page(&cold.index.connection, &identity.index_id, &[], None, 50).unwrap();
        let flags: Vec<(i64, bool)> = page.items.iter().map(|e| (e.event_id, e.seen)).collect();
        assert!(flags.contains(&(first.event_id, true)));
        assert_eq!(page.unseen_total, 1);
    }
    let after_event = journal(&paths, &brain, &[]);
    assert_eq!(after_event.iter().filter(|e| e.seen).count(), 1);

    let all = mark_all_changes_seen(&paths, &brain).unwrap();
    assert_eq!(all.newly_seen_count, 1);
    assert_eq!(
        all.seen_through_event_id,
        events.iter().map(|e| e.event_id).max().unwrap()
    );
    let after_all = journal(&paths, &brain, &[]);
    assert!(after_all.iter().all(|e| e.seen));
    assert_eq!(
        change_journal(&paths, &brain, &[], None, 50)
            .unwrap()
            .unseen_total,
        0
    );
    // The journal cursor state itself is unchanged by any of it.
    assert_eq!(
        after_all.iter().map(|e| e.event_id).collect::<Vec<_>>(),
        events.iter().map(|e| e.event_id).collect::<Vec<_>>()
    );
}

#[test]
fn the_three_gestures_through_the_product_boundary_follow_dec_0036() {
    let (_temp, paths, root, brain, _database) = built_real_index("racine-gestes");
    fs::write(root.join("neuf.txt"), b"1").unwrap();
    refresh_map(&paths, &brain).unwrap();
    let id = id_of(&paths, &brain, "neuf.txt");

    // Reading and selecting never mark anything seen.
    for _ in 0..3 {
        let s = node_state(&paths, &brain, id);
        assert!(s.is_new && s.is_unseen);
        let _ = detail(&paths, &brain, &reference(&brain, id)).unwrap();
        let _ = change_journal(&paths, &brain, &[], None, 50).unwrap();
    }
    assert_eq!(
        change_journal(&paths, &brain, &[], None, 50)
            .unwrap()
            .unseen_total,
        1
    );

    // Element gesture.
    let marked = mark_node_seen(&paths, &brain, &reference(&brain, id)).unwrap();
    assert_eq!((marked.node_id, marked.newly_seen_count), (id, 1));
    let s = node_state(&paths, &brain, id);
    assert!(!s.is_new && !s.is_unseen);

    // A later change of the element is unseen, not new.
    fs::write(root.join("neuf.txt"), b"contenu plus long").unwrap();
    refresh_map(&paths, &brain).unwrap();
    let s = node_state(&paths, &brain, id);
    assert!(s.is_unseen && !s.is_new);

    // Change gesture on that MODIFIED event.
    let modified = journal(&paths, &brain, &[ChangeNature::Modified]);
    assert_eq!(modified.len(), 1);
    assert!(!modified[0].seen);
    mark_change_seen(&paths, &brain, modified[0].event_id).unwrap();
    assert!(!node_state(&paths, &brain, id).is_unseen);

    // Refusals.
    assert_eq!(
        mark_change_seen(&paths, &brain, 987_654)
            .unwrap_err()
            .to_string(),
        "journal_event_missing: 987654"
    );
    assert_eq!(
        mark_node_seen(&paths, &brain, &reference(&brain, 987_654))
            .unwrap_err()
            .to_string(),
        "map_node_missing: 987654"
    );
}

#[test]
fn a_deleted_real_file_leaves_an_acknowledgeable_event_and_no_selectable_node() {
    let (_temp, paths, root, brain, _database) = built_real_index("racine-suppression");
    let id = id_of(&paths, &brain, "avant.txt");
    fs::remove_file(root.join("avant.txt")).unwrap();
    refresh_map(&paths, &brain).unwrap();

    assert!(node_change_state(&paths, &brain, &reference(&brain, id)).is_err());
    assert!(mark_node_seen(&paths, &brain, &reference(&brain, id)).is_err());
    let deleted = journal(&paths, &brain, &[ChangeNature::Deleted]);
    assert_eq!(deleted.len(), 1);
    assert!(!deleted[0].node_present && !deleted[0].seen);
    mark_change_seen(&paths, &brain, deleted[0].event_id).unwrap();
    assert!(journal(&paths, &brain, &[ChangeNature::Deleted])[0].seen);
}

#[test]
fn a_real_rename_keeps_the_node_id_and_the_node_is_unseen_but_not_new() {
    let (_temp, paths, root, brain, _database) = built_real_index("racine-renommage");
    let id = id_of(&paths, &brain, "avant.txt");
    fs::rename(root.join("avant.txt"), root.join("apres.txt")).unwrap();
    refresh_map(&paths, &brain).unwrap();
    assert_eq!(id_of(&paths, &brain, "apres.txt"), id);
    let s = node_state(&paths, &brain, id);
    assert!(s.is_unseen && !s.is_new, "{s:?}");
}

/// The real `PATH_FALLBACK` shape on Windows: a directory junction is a
/// reparse point, so the scanner gives it the raw-path identity and renaming it
/// changes its identity by design (`DEC-0009`): the new node is new and unseen,
/// and the old node's `DELETED` stays an independent event.
#[cfg(windows)]
#[test]
fn a_renamed_raw_path_node_is_new_and_unseen_and_the_old_delete_is_independent() {
    let (temp, paths) = sandbox();
    let root = temp.path().join("racine-junction-vu");
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

    fs::rename(root.join("lien-avant"), root.join("lien-apres")).unwrap();
    refresh_map(&paths, &brain).unwrap();
    let new_id = id_of(&paths, &brain, "lien-apres");
    assert_ne!(new_id, old_id);

    let s = node_state(&paths, &brain, new_id);
    assert!(s.is_new && s.is_unseen);
    assert!(node_change_state(&paths, &brain, &reference(&brain, old_id)).is_err());
    let deleted = journal(&paths, &brain, &[ChangeNature::Deleted]);
    assert_eq!(deleted.len(), 1);
    assert_eq!(deleted[0].node_id, old_id);
    assert!(!deleted[0].seen);
    mark_change_seen(&paths, &brain, deleted[0].event_id).unwrap();
    assert!(
        node_state(&paths, &brain, new_id).is_new,
        "acknowledging the old delete does not acknowledge the new node"
    );
}

#[test]
fn two_brains_share_no_seen_state_even_when_their_ids_coincide() {
    let (temp, paths) = sandbox();
    let root = temp.path().join("racine-partagee-vu");
    fs::create_dir_all(&root).unwrap();
    fs::write(root.join("base.txt"), b"x").unwrap();
    let one = register(&paths, &root);
    let two = register(&paths, &root);
    refresh_map(&paths, &one).unwrap();
    refresh_map(&paths, &two).unwrap();
    fs::write(root.join("commun.txt"), b"1").unwrap();
    refresh_map(&paths, &one).unwrap();
    refresh_map(&paths, &two).unwrap();

    let one_events = journal(&paths, &one, &[]);
    let two_events = journal(&paths, &two, &[]);
    assert_eq!(one_events.len(), 1);
    assert_eq!(two_events.len(), 1);
    // The numbers coincide: only the brain tells the two events apart.
    assert_eq!(one_events[0].event_id, two_events[0].event_id);
    let node = id_of(&paths, &one, "commun.txt");
    assert_eq!(node, id_of(&paths, &two, "commun.txt"));

    mark_change_seen(&paths, &one, one_events[0].event_id).unwrap();
    assert!(journal(&paths, &one, &[])[0].seen);
    assert!(
        !journal(&paths, &two, &[])[0].seen,
        "marking in one brain must not touch the other"
    );
    assert!(node_state(&paths, &two, node).is_new);
    assert!(!node_state(&paths, &one, node).is_new);

    // Mark all and mark node, likewise.
    fs::write(root.join("autre.txt"), b"2").unwrap();
    refresh_map(&paths, &one).unwrap();
    refresh_map(&paths, &two).unwrap();
    mark_all_changes_seen(&paths, &one).unwrap();
    assert_eq!(
        change_journal(&paths, &one, &[], None, 50)
            .unwrap()
            .unseen_total,
        0
    );
    assert_eq!(
        change_journal(&paths, &two, &[], None, 50)
            .unwrap()
            .unseen_total,
        2
    );
    let autre = id_of(&paths, &two, "autre.txt");
    mark_node_seen(&paths, &two, &reference(&two, autre)).unwrap();
    assert_eq!(
        change_journal(&paths, &two, &[], None, 50)
            .unwrap()
            .unseen_total,
        1
    );
    assert_eq!(
        change_journal(&paths, &one, &[], None, 50)
            .unwrap()
            .unseen_total,
        0
    );

    // A reference that names the other brain is refused before any write.
    let error = mark_node_seen(&paths, &two, &reference(&one, node)).unwrap_err();
    assert!(
        error.to_string().starts_with("map_brain_mismatch"),
        "{error}"
    );
    let error = node_change_state(&paths, &two, &reference(&one, node)).unwrap_err();
    assert!(
        error.to_string().starts_with("map_brain_mismatch"),
        "{error}"
    );
}

#[test]
fn the_seen_dtos_expose_no_path_no_key_and_no_identity() {
    let (temp, paths) = sandbox();
    let root = temp.path().join("racine-serialisation-vu");
    fs::create_dir_all(root.join("sous")).unwrap();
    fs::write(root.join("sous/x.txt"), b"1").unwrap();
    let brain = register(&paths, &root);
    refresh_map(&paths, &brain).unwrap();
    fs::write(root.join("sous/y.txt"), b"2").unwrap();
    fs::remove_file(root.join("sous/x.txt")).unwrap();
    refresh_map(&paths, &brain).unwrap();
    let y = id_of(&paths, &brain, "sous/y.txt");
    let events = journal(&paths, &brain, &[]);

    let json = [
        serde_json::to_string(&change_journal(&paths, &brain, &[], None, 50).unwrap()).unwrap(),
        serde_json::to_string(&node_state(&paths, &brain, y)).unwrap(),
        serde_json::to_string(&mark_change_seen(&paths, &brain, events[0].event_id).unwrap())
            .unwrap(),
        serde_json::to_string(&mark_node_seen(&paths, &brain, &reference(&brain, y)).unwrap())
            .unwrap(),
        serde_json::to_string(&mark_all_changes_seen(&paths, &brain).unwrap()).unwrap(),
    ]
    .join("\n");
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

    // The exact shape of each new DTO: names, counters and booleans.
    let keys = |value: serde_json::Value| {
        let mut keys: Vec<_> = value.as_object().unwrap().keys().cloned().collect();
        keys.sort();
        keys
    };
    assert_eq!(
        keys(serde_json::to_value(node_state(&paths, &brain, y)).unwrap()),
        [
            "brainId",
            "isNew",
            "isUnseen",
            "nodeId",
            "unseenChangeCount"
        ]
    );
    assert_eq!(
        keys(
            serde_json::to_value(mark_change_seen(&paths, &brain, events[0].event_id).unwrap())
                .unwrap()
        ),
        ["alreadySeen", "brainId", "eventId"]
    );
    assert_eq!(
        keys(
            serde_json::to_value(mark_node_seen(&paths, &brain, &reference(&brain, y)).unwrap())
                .unwrap()
        ),
        ["brainId", "newlySeenCount", "nodeId"]
    );
    assert_eq!(
        keys(serde_json::to_value(mark_all_changes_seen(&paths, &brain).unwrap()).unwrap()),
        ["brainId", "newlySeenCount", "seenThroughEventId"]
    );
    let page =
        serde_json::to_value(change_journal(&paths, &brain, &[], None, 50).unwrap()).unwrap();
    assert!(page["items"][0].get("seen").is_some());
    assert!(page.get("unseenTotal").is_some());
}
