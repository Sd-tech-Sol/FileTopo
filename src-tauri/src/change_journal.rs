//! Change journal — `TASK-0037`, `DEC-0009` I-E over `DEC-0010` U-B's
//! future direction.
//!
//! A **persistent, per-brain, append-only** record of what an explicit
//! Actualiser/Reconstruire *detected* between two canonical corpora. It lives
//! in the brain's one canonical SQLite file (`change_events`, schema v5) and is
//! written in the **same transaction** as the corpus and the revision it
//! describes — see `crate::index::Index::publish`.
//!
//! Three honesty rules this module enforces rather than describes:
//!
//! * **five natures, no sixth** — [`ChangeNature`];
//! * **no invented chronology** — a full re-scan only knows *that* two
//!   snapshots differ, never in which order the filesystem operations
//!   happened. Events of one publication share a `detected_revision` and carry
//!   a deterministic `ordinal` defined by [`diff`]; that order is the order of
//!   *journal publication*, nothing more, and the timestamp is the instant
//!   FileTopo *detected* the difference;
//! * **no identity material** — an event carries canonical `nodes.id`s, names
//!   and **relative** paths. No absolute path, stable key, `FileId`, volume
//!   serial or content ever enters this table or a DTO built from it.
//!
//! The diff itself is a **pure function of two canonical corpora** (already
//! remapped to durable ids by `TASK-0036`); there is no similarity matching
//! and no heuristic. A `PATH_FALLBACK` node that was renamed or moved has, by
//! `DEC-0009`'s own declared limitation, a new identity — it is honestly a
//! `DELETED` plus a `CREATED`.

use crate::domain::NodeKind;
use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use thiserror::Error;

/// Server-side ceiling on one journal page. The same spirit as
/// `SEARCH_LIMIT_MAX` / `CHILDREN_LIMIT_MAX`.
pub const JOURNAL_PAGE_MAX: usize = 50;

/// Cursor token prefix — versioned, like `hierarchy`'s `ftc1`.
const CURSOR_TAG: &str = "fjc1";

/// The columns `change_events` must carry for a v5 file to be canonical, in
/// the order [`validate_schema`] checks them.
const REQUIRED_COLUMNS: [&str; 13] = [
    "event_id",
    "detected_revision",
    "ordinal",
    "nature",
    "node_id",
    "node_kind",
    "old_name",
    "new_name",
    "old_relative_path",
    "new_relative_path",
    "old_parent_id",
    "new_parent_id",
    "detected_unix_ms",
];

/// The whole DDL of the journal — one definition, used by both the fresh-file
/// path (`Index::initialize`) and the `4 → 5` migration step.
///
/// * `event_id` is `AUTOINCREMENT`: monotone within the brain and **never
///   reused**, even after a row were removed.
/// * No foreign key to `nodes`: a `DELETED` event must outlive its node, and
///   `nodes` is wholly replaced by every publication.
/// * `UNIQUE(detected_revision, ordinal)` makes the deterministic order a
///   storage guarantee, not a convention.
pub(crate) const JOURNAL_DDL: &str = "
    CREATE TABLE change_events (
        event_id INTEGER PRIMARY KEY AUTOINCREMENT,
        detected_revision INTEGER NOT NULL,
        ordinal INTEGER NOT NULL,
        nature TEXT NOT NULL CHECK (nature IN
            ('CREATED', 'MODIFIED', 'RENAMED', 'MOVED', 'DELETED')),
        node_id INTEGER NOT NULL,
        node_kind TEXT NOT NULL,
        old_name TEXT,
        new_name TEXT,
        old_relative_path TEXT,
        new_relative_path TEXT,
        old_parent_id INTEGER,
        new_parent_id INTEGER,
        detected_unix_ms INTEGER NOT NULL
    );
    CREATE INDEX idx_change_events_nature ON change_events(nature, event_id);
    CREATE UNIQUE INDEX idx_change_events_revision_ordinal
        ON change_events(detected_revision, ordinal);
";

/// The whole DDL of the seen/unseen state — `TASK-0038`, `DEC-0036`. One
/// definition, used by the fresh-file path and the `5 → 6` migration step.
///
/// * `seen_change_events` holds the events acknowledged **individually above**
///   the watermark; an event at or below `schema_meta['seen_through_event_id']`
///   needs no row here.
/// * The foreign key makes an acknowledgement of an event that does not exist
///   impossible at the storage level, not only in the command.
/// * `idx_change_events_node` keeps the per-node questions ("is this node new,
///   is it unseen") bounded by that node's own history rather than by the
///   whole journal.
///
/// `change_events` itself is never altered: marking something seen writes
/// **only** here and in the watermark.
pub(crate) const SEEN_STATE_DDL: &str = "
    CREATE TABLE seen_change_events (
        event_id INTEGER PRIMARY KEY
            REFERENCES change_events(event_id) ON DELETE CASCADE
    );
    CREATE INDEX idx_change_events_node ON change_events(node_id, event_id);
";

/// The `schema_meta` key of the monotone watermark: every event whose
/// `event_id` is at or below it is seen.
pub(crate) const SEEN_WATERMARK_KEY: &str = "seen_through_event_id";

/// The five natures of `P-16`, and no other. Serialised in the same
/// `SCREAMING_SNAKE_CASE` the table stores.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ChangeNature {
    Created,
    Modified,
    Renamed,
    Moved,
    Deleted,
}

impl ChangeNature {
    pub const ALL: [Self; 5] = [
        Self::Created,
        Self::Modified,
        Self::Renamed,
        Self::Moved,
        Self::Deleted,
    ];

    pub fn as_str(self) -> &'static str {
        match self {
            Self::Created => "CREATED",
            Self::Modified => "MODIFIED",
            Self::Renamed => "RENAMED",
            Self::Moved => "MOVED",
            Self::Deleted => "DELETED",
        }
    }

    pub fn parse(value: &str) -> Option<Self> {
        Self::ALL
            .into_iter()
            .find(|nature| nature.as_str() == value)
    }

    /// The tie-break of the deterministic journal order for two events about
    /// the **same** node in the same publication. It expresses nothing about
    /// which filesystem operation really happened first.
    fn rank(self) -> u8 {
        match self {
            Self::Created => 0,
            Self::Renamed => 1,
            Self::Moved => 2,
            Self::Modified => 3,
            Self::Deleted => 4,
        }
    }
}

/// Exact counters by nature — the bounded summary an Actualiser/Reconstruire
/// report carries in place of the event list (`P-18`'s manual criterion).
///
/// `baseline_established` is `true` when this publication only *established
/// the reference state* (first build of a brain, or an index whose previous
/// rows carried no durable identity to compare against): every counter is then
/// zero **by construction**, not because nothing changed.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChangeSummary {
    pub baseline_established: bool,
    pub created: u64,
    pub modified: u64,
    pub renamed: u64,
    pub moved: u64,
    pub deleted: u64,
    pub total: u64,
}

impl ChangeSummary {
    fn of(events: &[PendingEvent]) -> Self {
        let mut summary = Self::default();
        for event in events {
            match event.nature {
                ChangeNature::Created => summary.created += 1,
                ChangeNature::Modified => summary.modified += 1,
                ChangeNature::Renamed => summary.renamed += 1,
                ChangeNature::Moved => summary.moved += 1,
                ChangeNature::Deleted => summary.deleted += 1,
            }
            summary.total += 1;
        }
        summary
    }
}

/// What one publication did to the journal — carried back to the build report.
pub type JournalOutcome = ChangeSummary;

/// The fields of a node **before** the publication, as far as the diff needs
/// them. The relative path is deliberately absent: it is fetched only for the
/// few nodes that actually produce an event, so a 1 000 000-node corpus is not
/// held in memory a second time.
#[derive(Debug, Clone, PartialEq)]
pub(crate) struct PreviousNode {
    pub parent_id: Option<i64>,
    pub name: String,
    pub kind: NodeKind,
    pub size_bytes: i64,
    pub modified_unix_ms: Option<i64>,
    pub online_only: bool,
    pub reparse_point: bool,
}

/// The fields of a node **after** the publication, already remapped to its
/// canonical id and canonical parent id.
#[derive(Debug, Clone, PartialEq)]
pub(crate) struct CurrentNode<'a> {
    pub id: i64,
    pub parent_id: Option<i64>,
    pub name: &'a str,
    pub relative_path: &'a str,
    pub kind: NodeKind,
    pub size_bytes: i64,
    pub modified_unix_ms: Option<i64>,
    pub online_only: bool,
    pub reparse_point: bool,
}

/// One event the diff decided on, before it is given an `event_id`.
#[derive(Debug, Clone, PartialEq)]
pub(crate) struct PendingEvent {
    pub nature: ChangeNature,
    pub node_id: i64,
    pub node_kind: NodeKind,
    pub old_name: Option<String>,
    pub new_name: Option<String>,
    pub old_relative_path: Option<String>,
    pub new_relative_path: Option<String>,
    pub old_parent_id: Option<i64>,
    pub new_parent_id: Option<i64>,
}

/// Loads the corpus a publication is about to replace, **or `None` when there
/// is nothing comparable** — the baseline rule of `TASK-0037` D:
///
/// * an empty `nodes` table is a brain's first build;
/// * a row whose `stable_key` is still `NULL` was published before
///   `TASK-0036` (a `v3` file migrated but not yet republished): its `id` is
///   not a durable identity, so diffing on it would report **every** node as
///   deleted and re-created. That single republication re-stamps identity and
///   establishes the reference; from the next one on, the journal compares.
pub(crate) fn load_previous(
    connection: &Connection,
) -> rusqlite::Result<Option<HashMap<i64, PreviousNode>>> {
    let mut statement = connection.prepare(
        "SELECT id, parent_id, name, kind, size_bytes, modified_unix_ms,
                online_only, reparse_point, stable_key IS NULL
         FROM nodes",
    )?;
    let mut rows = statement.query([])?;
    let mut previous = HashMap::new();
    while let Some(row) = rows.next()? {
        let unstamped: bool = row.get(8)?;
        if unstamped {
            return Ok(None);
        }
        let kind: String = row.get(3)?;
        previous.insert(
            row.get::<_, i64>(0)?,
            PreviousNode {
                parent_id: row.get(1)?,
                name: row.get(2)?,
                kind: NodeKind::from_db(&kind),
                size_bytes: row.get(4)?,
                modified_unix_ms: row.get(5)?,
                online_only: row.get(6)?,
                reparse_point: row.get(7)?,
            },
        );
    }
    Ok(if previous.is_empty() {
        None
    } else {
        Some(previous)
    })
}

/// The relative path a node had in the corpus about to be replaced. Called only
/// for nodes that produce an event.
pub(crate) fn previous_relative_path(
    connection: &Connection,
    node_id: i64,
) -> rusqlite::Result<String> {
    connection.query_row(
        "SELECT relative_path FROM nodes WHERE id = ?1",
        [node_id],
        |row| row.get(0),
    )
}

/// Whether the metadata FileTopo indexed for a node changed in a way that is
/// **not** a structural echo — `TASK-0037` C, "modification observable".
///
/// The frozen list, for a node present on both sides:
///
/// * `size_bytes`, `online_only`, `reparse_point`, `kind` — always;
/// * `modified_unix_ms` — for a **file or skipped entry** only.
///
/// A directory's own modification time is deliberately **not** compared: the
/// filesystem rewrites it whenever an entry is created, deleted or renamed
/// directly inside it, so it would flag every parent of every structural change
/// as `MODIFIED` — a second event for a fact the journal already states. This
/// is a declared limit: an edit of a directory's own timestamp alone is not
/// journaled.
///
/// Never compared: `child_count`, `depth`, `relative_path` (derived from the
/// structure), `seen` (a person's state, not the filesystem's), and — always —
/// file content, which is never read.
fn observable_metadata_changed(previous: &PreviousNode, current: &CurrentNode<'_>) -> bool {
    if previous.kind != current.kind
        || previous.size_bytes != current.size_bytes
        || previous.online_only != current.online_only
        || previous.reparse_point != current.reparse_point
    {
        return true;
    }
    matches!(current.kind, NodeKind::File | NodeKind::Skipped)
        && previous.modified_unix_ms != current.modified_unix_ms
}

/// The pure diff of two canonical corpora — `TASK-0037` C.
///
/// * an id only in `current` ⇒ `CREATED`; only in `previous` ⇒ `DELETED`;
/// * the same id, `name` changed ⇒ `RENAMED`; `parent_id` changed ⇒ `MOVED`;
///   **both** ⇒ both events, each carrying the path *before* and *after the
///   whole publication* — never an intermediate path, because the order of
///   the two operations is unknowable from two snapshots;
/// * a descendant whose own `name` and `parent_id` are unchanged produces no
///   structural event when an ancestor moved: the movement belongs to the
///   node whose parent or name really changed;
/// * the same id, observable metadata changed ⇒ `MODIFIED`
///   ([`observable_metadata_changed`]).
///
/// The result is sorted by `(node_id, nature rank)` — a deterministic order
/// that is **only** the order of publication into the journal.
pub(crate) fn diff<F>(
    previous: &HashMap<i64, PreviousNode>,
    current: &[CurrentNode<'_>],
    mut previous_path: F,
) -> rusqlite::Result<Vec<PendingEvent>>
where
    F: FnMut(i64) -> rusqlite::Result<String>,
{
    let mut events = Vec::new();
    let mut current_ids = HashSet::<i64>::with_capacity(current.len());
    for node in current {
        current_ids.insert(node.id);
        let Some(before) = previous.get(&node.id) else {
            events.push(PendingEvent {
                nature: ChangeNature::Created,
                node_id: node.id,
                node_kind: node.kind,
                old_name: None,
                new_name: Some(node.name.to_string()),
                old_relative_path: None,
                new_relative_path: Some(node.relative_path.to_string()),
                old_parent_id: None,
                new_parent_id: node.parent_id,
            });
            continue;
        };
        let renamed = before.name != node.name;
        let moved = before.parent_id != node.parent_id;
        if renamed || moved {
            let old_path = previous_path(node.id)?;
            if renamed {
                events.push(PendingEvent {
                    nature: ChangeNature::Renamed,
                    node_id: node.id,
                    node_kind: node.kind,
                    old_name: Some(before.name.clone()),
                    new_name: Some(node.name.to_string()),
                    old_relative_path: Some(old_path.clone()),
                    new_relative_path: Some(node.relative_path.to_string()),
                    old_parent_id: None,
                    new_parent_id: None,
                });
            }
            if moved {
                events.push(PendingEvent {
                    nature: ChangeNature::Moved,
                    node_id: node.id,
                    node_kind: node.kind,
                    old_name: None,
                    new_name: None,
                    old_relative_path: Some(old_path),
                    new_relative_path: Some(node.relative_path.to_string()),
                    old_parent_id: before.parent_id,
                    new_parent_id: node.parent_id,
                });
            }
        }
        if observable_metadata_changed(before, node) {
            events.push(PendingEvent {
                nature: ChangeNature::Modified,
                node_id: node.id,
                node_kind: node.kind,
                old_name: None,
                new_name: None,
                old_relative_path: None,
                new_relative_path: Some(node.relative_path.to_string()),
                old_parent_id: None,
                new_parent_id: None,
            });
        }
    }
    for (&id, before) in previous {
        if current_ids.contains(&id) {
            continue;
        }
        events.push(PendingEvent {
            nature: ChangeNature::Deleted,
            node_id: id,
            node_kind: before.kind,
            old_name: Some(before.name.clone()),
            new_name: None,
            old_relative_path: Some(previous_path(id)?),
            new_relative_path: None,
            old_parent_id: before.parent_id,
            new_parent_id: None,
        });
    }
    events.sort_by_key(|event| (event.node_id, event.nature.rank()));
    Ok(events)
}

/// Appends one publication's events. Called **inside** the publication's own
/// transaction: a failure here fails the publication, and a failure of the
/// publication after this call removes these rows with it.
pub(crate) fn append_events(
    connection: &Connection,
    detected_revision: u64,
    detected_unix_ms: i64,
    events: &[PendingEvent],
) -> rusqlite::Result<()> {
    if events.is_empty() {
        return Ok(());
    }
    let mut statement = connection.prepare(
        "INSERT INTO change_events (
            detected_revision, ordinal, nature, node_id, node_kind,
            old_name, new_name, old_relative_path, new_relative_path,
            old_parent_id, new_parent_id, detected_unix_ms
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
    )?;
    for (ordinal, event) in events.iter().enumerate() {
        statement.execute(params![
            i64::try_from(detected_revision).unwrap_or(i64::MAX),
            i64::try_from(ordinal).unwrap_or(i64::MAX),
            event.nature.as_str(),
            event.node_id,
            event.node_kind.as_str(),
            event.old_name,
            event.new_name,
            event.old_relative_path,
            event.new_relative_path,
            event.old_parent_id,
            event.new_parent_id,
            detected_unix_ms,
        ])?;
    }
    Ok(())
}

/// The counters of a batch, computed once by the publisher.
pub(crate) fn summarize(events: &[PendingEvent]) -> ChangeSummary {
    ChangeSummary::of(events)
}

/// Whether `change_events` exists with every column a v5 file must carry —
/// part of the canonical validation of the new schema (`M-B` step 5).
pub(crate) fn validate_schema(connection: &Connection) -> rusqlite::Result<bool> {
    let mut present = 0;
    let mut statement = connection
        .prepare("SELECT COUNT(*) FROM pragma_table_info('change_events') WHERE name = ?1")?;
    for column in REQUIRED_COLUMNS {
        let found: i64 = statement.query_row([column], |row| row.get(0))?;
        present += found;
    }
    Ok(present == REQUIRED_COLUMNS.len() as i64)
}

/// Whether the v6 seen state is canonical — `TASK-0038`, part of the same
/// `M-B` step 5 validation as [`validate_schema`]:
///
/// * `seen_change_events` exists with its `event_id` column;
/// * the watermark is present, a non-negative integer, and **not beyond the
///   newest event** — a watermark past the journal would silently mark every
///   *future* event as already seen.
pub(crate) fn validate_seen_schema(connection: &Connection) -> rusqlite::Result<bool> {
    let has_column: i64 = connection.query_row(
        "SELECT COUNT(*) FROM pragma_table_info('seen_change_events') WHERE name = 'event_id'",
        [],
        |row| row.get(0),
    )?;
    if has_column != 1 {
        return Ok(false);
    }
    let Ok(watermark) = seen_watermark(connection) else {
        return Ok(false);
    };
    let newest: i64 = connection.query_row(
        "SELECT COALESCE(MAX(event_id), 0) FROM change_events",
        [],
        |row| row.get(0),
    )?;
    Ok(watermark <= newest)
}

// -- Seen / unseen state — `TASK-0038`, `DEC-0036` ---------------------------
//
// The truth is `change_events` (append-only) plus the acknowledgement state
// kept beside it. `nodes.seen`, inherited from the 0.1 prototype, is neither
// read nor written here: it describes a node, not a change, cannot represent a
// deleted node, and predates the journal.

/// The event predicate every seen/unseen query shares, over an alias `e`:
/// "not acknowledged". `watermark_param` names the bound watermark parameter.
pub(crate) fn unseen_predicate(watermark_param: &str) -> String {
    format!(
        "(e.event_id > {watermark_param} \
          AND NOT EXISTS (SELECT 1 FROM seen_change_events s WHERE s.event_id = e.event_id))"
    )
}

/// The brain's watermark: every event at or below it is seen. Monotone.
pub(crate) fn seen_watermark(connection: &Connection) -> rusqlite::Result<i64> {
    let raw: String = connection.query_row(
        "SELECT value FROM schema_meta WHERE key = ?1",
        [SEEN_WATERMARK_KEY],
        |row| row.get(0),
    )?;
    raw.parse::<i64>()
        .ok()
        .filter(|value| *value >= 0)
        .ok_or(rusqlite::Error::InvalidQuery)
}

/// Exact count of events not yet acknowledged, over the **whole** journal.
pub(crate) fn unseen_event_total(connection: &Connection) -> rusqlite::Result<u64> {
    let watermark = seen_watermark(connection)?;
    let count: i64 = connection.query_row(
        &format!(
            "SELECT COUNT(*) FROM change_events e WHERE {}",
            unseen_predicate("?1")
        ),
        [watermark],
        |row| row.get(0),
    )?;
    Ok(count.max(0) as u64)
}

/// What [`mark_event_seen`] did.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct MarkEventOutcome {
    /// `true` when the event was already seen: nothing was written.
    pub already_seen: bool,
}

/// What [`mark_all_seen`] did.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct MarkAllOutcome {
    /// The watermark after the call: the newest `event_id` that existed at the
    /// instant this transaction committed.
    pub seen_through_event_id: i64,
    /// Exact number of events that were unseen and now are not.
    pub newly_seen: u64,
}

/// The derived state of one **currently present** node.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct NodeChangeState {
    /// At least one `CREATED` event of this node is unseen.
    pub is_new: bool,
    /// At least one event of this node — of any nature — is unseen.
    pub is_unseen: bool,
    /// Exact number of this node's unseen events.
    pub unseen_change_count: u64,
}

fn immediate(connection: &Connection) -> rusqlite::Result<rusqlite::Transaction<'_>> {
    // `IMMEDIATE`: the write lock is taken before anything is read, so a
    // concurrent publication (itself `IMMEDIATE`) is serialised strictly
    // before or after this call, never interleaved with it.
    rusqlite::Transaction::new_unchecked(connection, rusqlite::TransactionBehavior::Immediate)
}

/// **Marks one change seen.** An event that does not exist in this brain's
/// journal is refused; an already-seen one is a no-op.
pub(crate) fn mark_event_seen(
    connection: &Connection,
    event_id: i64,
) -> Result<MarkEventOutcome, JournalError> {
    let transaction = immediate(connection)?;
    let exists: bool = transaction.query_row(
        "SELECT EXISTS(SELECT 1 FROM change_events WHERE event_id = ?1)",
        [event_id],
        |row| row.get(0),
    )?;
    if !exists {
        return Err(JournalError::EventMissing(event_id));
    }
    let watermark = seen_watermark(&transaction)?;
    let acknowledged: bool = transaction.query_row(
        "SELECT EXISTS(SELECT 1 FROM seen_change_events WHERE event_id = ?1)",
        [event_id],
        |row| row.get(0),
    )?;
    let already_seen = event_id <= watermark || acknowledged;
    if !already_seen {
        transaction.execute(
            "INSERT INTO seen_change_events(event_id) VALUES (?1)",
            [event_id],
        )?;
    }
    transaction.commit()?;
    Ok(MarkEventOutcome { already_seen })
}

/// **Marks one element seen**: acknowledges every event of `node_id` that is
/// unseen *right now*. The node must be present in the Index; nothing about any
/// other node changes, and a change of this node detected later stays unseen.
/// Returns the exact number of events newly acknowledged.
pub(crate) fn mark_node_seen(connection: &Connection, node_id: i64) -> Result<u64, JournalError> {
    let transaction = immediate(connection)?;
    let present: bool = transaction.query_row(
        "SELECT EXISTS(SELECT 1 FROM nodes WHERE id = ?1)",
        [node_id],
        |row| row.get(0),
    )?;
    if !present {
        return Err(JournalError::NodeMissing(node_id));
    }
    let watermark = seen_watermark(&transaction)?;
    let newly = transaction.execute(
        "INSERT OR IGNORE INTO seen_change_events(event_id)
         SELECT event_id FROM change_events WHERE node_id = ?1 AND event_id > ?2",
        params![node_id, watermark],
    )?;
    transaction.commit()?;
    Ok(newly as u64)
}

/// **Marks everything seen**: the watermark advances, in one transaction, to
/// the newest `event_id` that exists when the transaction holds the write lock.
/// An event published afterwards has a higher id and stays unseen; one already
/// present becomes seen. The explicit acknowledgements the new watermark makes
/// redundant are removed. `change_events` is not touched.
pub(crate) fn mark_all_seen(connection: &Connection) -> Result<MarkAllOutcome, JournalError> {
    let transaction = immediate(connection)?;
    let watermark = seen_watermark(&transaction)?;
    let newest: i64 = transaction.query_row(
        "SELECT COALESCE(MAX(event_id), 0) FROM change_events",
        [],
        |row| row.get(0),
    )?;
    let newly: i64 = transaction.query_row(
        &format!(
            "SELECT COUNT(*) FROM change_events e WHERE {}",
            unseen_predicate("?1")
        ),
        [watermark],
        |row| row.get(0),
    )?;
    // Monotone: never moves backwards, whatever the journal holds.
    let advanced = watermark.max(newest);
    transaction.execute(
        "UPDATE schema_meta SET value = ?1 WHERE key = ?2",
        params![advanced.to_string(), SEEN_WATERMARK_KEY],
    )?;
    transaction.execute(
        "DELETE FROM seen_change_events WHERE event_id <= ?1",
        [advanced],
    )?;
    transaction.commit()?;
    Ok(MarkAllOutcome {
        seen_through_event_id: advanced,
        newly_seen: newly.max(0) as u64,
    })
}

/// The derived new/unseen state of a node that is **present in the Index now**.
/// A node that is gone is not an element anyone can select: refused, while its
/// events stay readable (and markable) as changes.
pub(crate) fn node_change_state(
    connection: &Connection,
    node_id: i64,
) -> Result<NodeChangeState, JournalError> {
    let snapshot = connection.unchecked_transaction()?;
    let present: bool = snapshot.query_row(
        "SELECT EXISTS(SELECT 1 FROM nodes WHERE id = ?1)",
        [node_id],
        |row| row.get(0),
    )?;
    if !present {
        return Err(JournalError::NodeMissing(node_id));
    }
    let watermark = seen_watermark(&snapshot)?;
    let (unseen, created): (i64, i64) = snapshot.query_row(
        &format!(
            "SELECT COUNT(*), COALESCE(SUM(e.nature = 'CREATED'), 0)
             FROM change_events e WHERE e.node_id = ?2 AND {}",
            unseen_predicate("?1")
        ),
        params![watermark, node_id],
        |row| Ok((row.get(0)?, row.get(1)?)),
    )?;
    snapshot.commit()?;
    Ok(NodeChangeState {
        is_new: created > 0,
        is_unseen: unseen > 0,
        unseen_change_count: unseen.max(0) as u64,
    })
}

// -- Consultation ----------------------------------------------------------

/// A refusal from the journal's read side.
#[derive(Debug, Error)]
pub enum JournalError {
    #[error("journal_sqlite_failed: {0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error("journal_cursor_malformed")]
    MalformedCursor,
    /// The cursor was issued by another index. Refused, never reinterpreted.
    #[error("journal_cursor_foreign: the cursor belongs to another index")]
    ForeignCursor,
    /// `TASK-0038` — an acknowledgement named an event this brain's journal
    /// does not hold. Refused, never created.
    #[error("journal_event_missing: {0}")]
    EventMissing(i64),
    /// `TASK-0038` — an element operation named a node that is not in the
    /// Index now. Same wording as `MapError::NodeMissing`.
    #[error("map_node_missing: {0}")]
    NodeMissing(i64),
}

/// Where a journal page resumes.
///
/// **Identifiers only**: the index it belongs to and the last `event_id`
/// already served. It is deliberately *not* tied to the index revision — the
/// journal is append-only, so a new Actualiser adds events *above* every
/// cursor and cannot invalidate a walk through older history.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct JournalCursor {
    pub index_id: String,
    pub after_event_id: i64,
}

impl JournalCursor {
    pub fn encode(&self) -> String {
        format!("{CURSOR_TAG}.{}.{}", self.index_id, self.after_event_id)
    }

    pub fn decode(token: &str) -> Result<Self, JournalError> {
        let mut parts = token.split('.');
        if parts.next() != Some(CURSOR_TAG) {
            return Err(JournalError::MalformedCursor);
        }
        let index_id = parts.next().ok_or(JournalError::MalformedCursor)?;
        let after = parts
            .next()
            .ok_or(JournalError::MalformedCursor)?
            .parse::<i64>()
            .map_err(|_| JournalError::MalformedCursor)?;
        if index_id.is_empty() || after < 1 || parts.next().is_some() {
            return Err(JournalError::MalformedCursor);
        }
        Ok(Self {
            index_id: index_id.to_string(),
            after_event_id: after,
        })
    }
}

/// One stored event, as read back. No absolute path, no stable key.
#[derive(Debug, Clone, PartialEq)]
pub struct StoredEvent {
    pub event_id: i64,
    pub detected_revision: u64,
    pub ordinal: u64,
    pub nature: ChangeNature,
    pub node_id: i64,
    pub node_kind: NodeKind,
    pub old_name: Option<String>,
    pub new_name: Option<String>,
    pub old_relative_path: Option<String>,
    pub new_relative_path: Option<String>,
    pub old_parent_id: Option<i64>,
    pub new_parent_id: Option<i64>,
    pub detected_unix_ms: i64,
    /// Whether a node with this id exists **now**. Node ids are never
    /// recycled, so `false` means the node is gone for good.
    pub node_present: bool,
    /// `TASK-0038` — whether the event is acknowledged: at or below the
    /// brain's watermark, or individually marked above it.
    pub seen: bool,
}

/// One bounded page of the journal.
#[derive(Debug, Clone, PartialEq)]
pub struct JournalPage {
    pub items: Vec<StoredEvent>,
    /// Exact count of events matching the filter — a `COUNT(*)`, never an
    /// estimate.
    pub total: u64,
    /// `TASK-0038` — exact count of **unseen** events over the whole journal,
    /// deliberately *not* narrowed by the nature filter: « Tout marquer vu » is
    /// not filtered either, so this is the number that gesture would affect.
    pub unseen_total: u64,
    /// `Some` **only** when older matching events remain.
    pub next_cursor: Option<JournalCursor>,
    pub limit: usize,
}

/// One page of the journal, newest event first.
///
/// `natures` empty means "every nature". The cursor, when given, must belong
/// to `index_id`; it resumes *strictly older* than the last served event, so
/// no event can be duplicated or skipped between pages whatever is appended in
/// the meantime. `total` and the page are read in one read transaction, so
/// they describe the same snapshot.
pub fn page(
    connection: &Connection,
    index_id: &str,
    natures: &[ChangeNature],
    after: Option<&JournalCursor>,
    limit: usize,
) -> Result<JournalPage, JournalError> {
    if let Some(cursor) = after
        && cursor.index_id != index_id
    {
        return Err(JournalError::ForeignCursor);
    }
    let limit = limit.clamp(1, JOURNAL_PAGE_MAX);
    // Built from the closed enum's own constants, never from caller text.
    let mut distinct: Vec<ChangeNature> = natures.to_vec();
    distinct.sort();
    distinct.dedup();
    let filter = if distinct.is_empty() {
        "1 = 1".to_string()
    } else {
        let list = distinct
            .iter()
            .map(|nature| format!("'{}'", nature.as_str()))
            .collect::<Vec<_>>()
            .join(", ");
        format!("e.nature IN ({list})")
    };

    let snapshot = connection.unchecked_transaction()?;
    // Read inside the page's own snapshot, so the flags, the total and the
    // unseen count all describe the same instant.
    let watermark = seen_watermark(&snapshot)?;
    let unseen_total = unseen_event_total(&snapshot)?;
    let total: i64 = snapshot.query_row(
        &format!("SELECT COUNT(*) FROM change_events e WHERE {filter}"),
        [],
        |row| row.get(0),
    )?;
    let mut statement = snapshot.prepare(&format!(
        "SELECT e.event_id, e.detected_revision, e.ordinal, e.nature, e.node_id,
                e.node_kind, e.old_name, e.new_name, e.old_relative_path,
                e.new_relative_path, e.old_parent_id, e.new_parent_id,
                e.detected_unix_ms,
                EXISTS(SELECT 1 FROM nodes n WHERE n.id = e.node_id),
                (e.event_id <= ?3
                 OR EXISTS(SELECT 1 FROM seen_change_events s WHERE s.event_id = e.event_id))
         FROM change_events e
         WHERE e.event_id < ?1 AND {filter}
         ORDER BY e.event_id DESC
         LIMIT ?2"
    ))?;
    let resume_before = after.map_or(i64::MAX, |cursor| cursor.after_event_id);
    let mut rows = statement.query(params![resume_before, (limit + 1) as i64, watermark])?;
    let mut items = Vec::with_capacity(limit + 1);
    while let Some(row) = rows.next()? {
        let nature: String = row.get(3)?;
        let kind: String = row.get(5)?;
        items.push(StoredEvent {
            event_id: row.get(0)?,
            detected_revision: row.get::<_, i64>(1)?.max(0) as u64,
            ordinal: row.get::<_, i64>(2)?.max(0) as u64,
            // The table's CHECK constraint makes an unknown nature
            // impossible; a foreign file that broke it is refused loudly
            // rather than mapped to a sixth nature.
            nature: ChangeNature::parse(&nature).ok_or(rusqlite::Error::InvalidQuery)?,
            node_id: row.get(4)?,
            node_kind: NodeKind::from_db(&kind),
            old_name: row.get(6)?,
            new_name: row.get(7)?,
            old_relative_path: row.get(8)?,
            new_relative_path: row.get(9)?,
            old_parent_id: row.get(10)?,
            new_parent_id: row.get(11)?,
            detected_unix_ms: row.get(12)?,
            node_present: row.get(13)?,
            seen: row.get(14)?,
        });
    }
    drop(rows);
    drop(statement);
    snapshot.commit()?;

    let has_more = items.len() > limit;
    items.truncate(limit);
    let next_cursor = if has_more {
        items.last().map(|last| JournalCursor {
            index_id: index_id.to_string(),
            after_event_id: last.event_id,
        })
    } else {
        None
    };
    Ok(JournalPage {
        items,
        total: total.max(0) as u64,
        unseen_total,
        next_cursor,
        limit,
    })
}
