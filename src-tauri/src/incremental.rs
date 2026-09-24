//! Incremental application kernel — `TASK-0040`, `DEC-0038`, `DEC-0010` option
//! `U-B`.
//!
//! Applies **one already-observed, already-reconciled batch of changes** to the
//! canonical Index at a cost that follows the batch, not the corpus, with the
//! change journal and the revision written in the same transaction.
//!
//! What this module is **not**: it detects nothing (no watcher, no
//! `ReadDirectoryChangesExW`, no re-enumeration — `F-030`), and is **not
//! reachable from the WebView**: none of these types is `Serialize`, none is a
//! Tauri command, and no stable key ever leaves the privileged core.
//!
//! Its product caller, since `TASK-0041` (`DEC-0039`), is the manual **Actualiser**
//! of an Index that already carries durable identities: `crate::reconcile`
//! derives a minimal batch from the full scan the refresh has just read, and
//! `BrainIndex::refresh_incrementally` applies it here. First indexing, the
//! one-time restamp of a legacy Index and **Reconstruire** remain full
//! publications through [`Index::publish_with_identity`]. The future watcher
//! (`W-B`/`W-C`) is the other intended caller; tests and the benchmark call it
//! directly.
//!
//! # Reuse, not a second set of rules
//!
//! * **Identity.** A stable key already stored keeps its canonical id; a new
//!   one takes the next value of the durable, monotone `next_node_id` counter
//!   ([`crate::index::read_next_node_id`], the very counter `publish` uses). The
//!   `idx_nodes_stable_key` unique index is the storage-level backstop.
//! * **Journal.** The events are produced by [`change_journal::diff`] — the
//!   *same* pure function `publish` uses — over only the rows the batch
//!   touches, so the five natures, the rename+move double event, the "a
//!   descendant of a moved directory produces no event" rule and the
//!   "directory mtime is not a modification" rule are the `TASK-0037` contract
//!   verbatim, not a copy of it. They are appended by
//!   [`change_journal::append_events`] and the revision advances through
//!   [`hierarchy::advance_revision`].
//! * **Seen state.** Nothing here reads or writes `seen_change_events`, the
//!   watermark or `nodes.seen`: new events are above the watermark and are
//!   therefore unseen by `DEC-0036`'s own rule, and no earlier
//!   acknowledgement is touched.
//!
//! # Cost
//!
//! Every statement is keyed by a primary key, by `stable_key`
//! (`idx_nodes_stable_key`) or by `parent_id` (`idx_nodes_parent`). The path
//! never runs `DELETE FROM nodes` without a predicate, re-inserts the corpus,
//! loads `nodes` into memory, calls [`change_journal::load_previous`], counts
//! the table, correlates by name, size or date, or reads a file.
//! `child_count` is maintained by a **signed delta** per affected parent — an
//! exact, `O(1)` update, where a recount would cost as many rows as the parent
//! has children — and its exactness is asserted by the tests against
//! [`hierarchy::child_count_mismatches`] and against a full-scan reference.

use crate::change_journal::{self, ChangeSummary, CurrentNode, PreviousNode};
use crate::domain::NodeKind;
use crate::hierarchy::{self, MAX_ANCESTOR_CHAIN};
use crate::identity::{IdentityProvenance, NodeIdentity};
use crate::index::{Index, read_next_node_id};
use rusqlite::{OptionalExtension, Transaction, params};
use std::collections::{HashMap, HashSet};
use thiserror::Error;

/// Where an upserted node's parent is.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum ParentRef {
    /// A node already in the Index, by canonical id. It must survive the batch.
    Existing(i64),
    /// Another upsert of the same batch, by its local token.
    InBatch(i64),
}

/// One node as the observer saw it: its identity, where it sits and what it
/// looks like. **The complete state** of that node — a batch never carries a
/// partial patch — so the kernel can compare it with the stored row and write
/// only a difference.
///
/// `identity.node_id` is the batch-local **token**, the same convention as the
/// scanner's temporary ids: unique in the batch, meaningful only inside it,
/// never a canonical id. `relative_path` and `depth` are supplied by the
/// producer and **verified** against the parent, never trusted.
#[derive(Debug, Clone)]
pub(crate) struct ObservedNode {
    pub identity: NodeIdentity,
    pub parent: ParentRef,
    pub name: String,
    pub relative_path: String,
    pub kind: NodeKind,
    pub depth: u32,
    pub size_bytes: u64,
    pub modified_unix_ms: Option<i64>,
    pub online_only: bool,
    pub reparse_point: bool,
}

impl ObservedNode {
    fn token(&self) -> i64 {
        self.identity.node_id
    }
}

/// The root's own metadata, as observed. The root is otherwise immutable in a
/// batch — never created, deleted, renamed or re-parented (`F-032` owns its
/// absence) — but its timestamp moves whenever an entry is created or removed
/// directly inside it, and a full scan rewrites it every time, so a batch may
/// carry it. Identity, name, path and parent are not part of it.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) struct RootObservation {
    pub modified_unix_ms: Option<i64>,
    pub online_only: bool,
    pub reparse_point: bool,
}

/// A batch of already-reconciled changes. Internal to the privileged core:
/// no `Serialize`, no Tauri command.
///
/// * `upserts` — created or changed nodes, resolved by **stable key**. A key
///   already stored is the same object (its canonical id is kept); an unknown
///   key is a new object. A `PATH_FALLBACK` rename or move is *not* an upsert:
///   its key changes with its path, so the producer sends a deletion and a
///   creation (`DEC-0009`).
/// * `deletions` — canonical ids that no longer exist.
/// * A directory whose path or depth changes must come with **every existing
///   descendant** (as an upsert carrying the new path, or as a deletion): the
///   kernel refuses an incomplete subtree rather than leave a stale path.
/// * `root` — the root's own observed metadata, when the producer has it.
#[derive(Debug, Clone, Default)]
pub(crate) struct UpdateBatch {
    pub upserts: Vec<ObservedNode>,
    pub deletions: Vec<i64>,
    pub root: Option<RootObservation>,
    /// The instant the observer detected the batch — the journal's timestamp.
    pub detected_unix_ms: i64,
}

/// A refusal of a batch. Every variant except `Sqlite` is raised **before the
/// first write**; a `Sqlite` failure after a write rolls the whole transaction
/// back. No message carries a stable key or an absolute path.
#[derive(Debug, Error)]
pub(crate) enum BatchError {
    #[error(transparent)]
    Sqlite(#[from] rusqlite::Error),
    #[error("batch_duplicate_token: local token {0} is used twice")]
    DuplicateToken(i64),
    #[error("batch_identity_collision: two upserts carry the same stable key")]
    IdentityCollision,
    #[error("batch_duplicate_deletion: node {0} is deleted twice")]
    DuplicateDeletion(i64),
    #[error("batch_delete_and_upsert: node {0} is both deleted and upserted")]
    DeleteAndUpsert(i64),
    #[error("batch_unknown_deletion: node {0} does not exist")]
    UnknownDeletion(i64),
    #[error("batch_root_immutable: the root cannot be created, changed, moved or deleted")]
    RootImmutable,
    #[error("batch_invalid_name: a node name is empty or contains a separator")]
    InvalidName,
    #[error("batch_parent_missing: the parent of local token {token} does not exist")]
    ParentMissing { token: i64 },
    #[error("batch_parent_deleted: node {0} would survive under a deleted parent")]
    ParentDeleted(i64),
    #[error("batch_parent_not_directory: the parent of local token {token} is not a directory")]
    ParentNotDirectory { token: i64 },
    #[error("batch_cycle: node {0} would become its own ancestor")]
    Cycle(i64),
    #[error("batch_incoherent_path: local token {token} disagrees with its parent's path or depth")]
    IncoherentPath { token: i64 },
    #[error(
        "batch_duplicate_sibling: two live siblings would share the name of local token {token}"
    )]
    DuplicateSibling { token: i64 },
    #[error("batch_orphan: node {0} would survive without its deleted parent")]
    Orphan(i64),
    #[error("batch_incomplete_subtree: node {0} keeps a stale path or parent")]
    IncompleteSubtree(i64),
    #[error(
        "batch_fallback_correlation: a PATH_FALLBACK identity cannot correlate a rename or a move"
    )]
    FallbackCorrelation,
    #[error("batch_provenance_mismatch: a stored key changes provenance")]
    ProvenanceMismatch,
    #[error("batch_index_not_stamped: the index has no durable identity to correlate against")]
    IndexNotStamped,
    #[error("batch_metadata_corrupt: {0}")]
    MetadataCorrupt(&'static str),
}

/// What one call did. Diagnostic and internal — never serialised.
#[derive(Debug, Clone, Copy, Default)]
pub(crate) struct ApplyOutcome {
    /// `false` for a no-op: nothing was written, no event, no revision.
    pub applied: bool,
    /// The index revision after the call (unchanged for a no-op).
    pub revision: u64,
    pub created: usize,
    /// Existing rows whose stored columns actually changed (the root included).
    pub rewritten: usize,
    pub deleted: usize,
    pub journal: ChangeSummary,
}

/// One stored row, as far as the kernel needs it.
#[derive(Debug, Clone)]
struct StoredRow {
    id: i64,
    parent_id: Option<i64>,
    name: String,
    relative_path: String,
    kind: NodeKind,
    depth: u32,
    size_bytes: i64,
    modified_unix_ms: Option<i64>,
    online_only: bool,
    reparse_point: bool,
    child_count: i64,
    provenance: Option<String>,
}

/// The stored columns the kernel reads, in the order [`stored_row`] takes them.
macro_rules! row_columns {
    () => {
        "id, parent_id, name, relative_path, kind, depth, size_bytes, modified_unix_ms, \
         online_only, reparse_point, child_count, identity_provenance"
    };
}

// Every statement the kernel runs against `nodes`, named once. Each one is
// keyed by a primary key, by `stable_key` (`idx_nodes_stable_key`) or by
// `parent_id` (`idx_nodes_parent`), which `EXPLAIN QUERY PLAN` proves in the
// tests from these very constants rather than from a copy of them.
const SQL_ROW_BY_ID: &str = concat!("SELECT ", row_columns!(), " FROM nodes WHERE id = ?1");
const SQL_ROW_BY_KEY: &str = concat!(
    "SELECT ",
    row_columns!(),
    " FROM nodes WHERE stable_key = ?1"
);
const SQL_CHILD_IDS: &str = "SELECT id FROM nodes WHERE parent_id = ?1";
const SQL_SIBLING: &str = "SELECT id FROM nodes WHERE parent_id = ?1 AND name = ?2";
const SQL_HAS_CHILD: &str = "SELECT EXISTS(SELECT 1 FROM nodes WHERE parent_id = ?1)";
const SQL_INSERT: &str = "INSERT INTO nodes (
        id, parent_id, name, relative_path, kind, depth, size_bytes,
        modified_unix_ms, online_only, reparse_point, child_count, seen,
        stable_key, identity_provenance
     ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 0, 0, ?11, ?12)";
const SQL_UPDATE: &str = "UPDATE nodes SET parent_id = ?2, name = ?3, relative_path = ?4,
         kind = ?5, depth = ?6, size_bytes = ?7, modified_unix_ms = ?8, online_only = ?9,
         reparse_point = ?10
     WHERE id = ?1";
const SQL_UPDATE_ROOT: &str = "UPDATE nodes SET modified_unix_ms = ?2, online_only = ?3,
         reparse_point = ?4
     WHERE id = ?1";
const SQL_DELETE: &str = "DELETE FROM nodes WHERE id = ?1";
const SQL_ADJUST_CHILD_COUNT: &str =
    "UPDATE nodes SET child_count = child_count + ?2 WHERE id = ?1";
const SQL_CLEAR_DIAGNOSTIC: &str = "DELETE FROM node_diagnostics WHERE relative_path = ?1";

/// The keyed statements, by name — read by the tests that prove none of them
/// scans `nodes`. (`SQL_INSERT` has no plan worth reading.)
#[cfg(test)]
pub(crate) const KEYED_STATEMENTS: [(&str, &str); 9] = [
    ("row by id", SQL_ROW_BY_ID),
    ("row by stable key", SQL_ROW_BY_KEY),
    ("child ids", SQL_CHILD_IDS),
    ("sibling by name", SQL_SIBLING),
    ("has child", SQL_HAS_CHILD),
    ("update row", SQL_UPDATE),
    ("update root", SQL_UPDATE_ROOT),
    ("delete row", SQL_DELETE),
    ("adjust child_count", SQL_ADJUST_CHILD_COUNT),
];

fn stored_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<StoredRow> {
    let kind: String = row.get(4)?;
    let depth: i64 = row.get(5)?;
    Ok(StoredRow {
        id: row.get(0)?,
        parent_id: row.get(1)?,
        name: row.get(2)?,
        relative_path: row.get(3)?,
        kind: NodeKind::from_db(&kind),
        depth: u32::try_from(depth).unwrap_or(u32::MAX),
        size_bytes: row.get(6)?,
        modified_unix_ms: row.get(7)?,
        online_only: row.get(8)?,
        reparse_point: row.get(9)?,
        child_count: row.get(10)?,
        provenance: row.get(11)?,
    })
}

/// Reads rows one at a time by key and remembers them: a batch touches the same
/// parent many times, and each is one lookup, not one per mention.
struct Rows<'t> {
    transaction: &'t Transaction<'t>,
    by_id: HashMap<i64, Option<StoredRow>>,
}

impl<'t> Rows<'t> {
    fn new(transaction: &'t Transaction<'t>) -> Self {
        Self {
            transaction,
            by_id: HashMap::new(),
        }
    }

    fn by_id(&mut self, id: i64) -> rusqlite::Result<Option<StoredRow>> {
        if let Some(cached) = self.by_id.get(&id) {
            return Ok(cached.clone());
        }
        let row = self
            .transaction
            .query_row(SQL_ROW_BY_ID, [id], stored_row)
            .optional()?;
        self.by_id.insert(id, row.clone());
        Ok(row)
    }

    fn by_stable_key(&mut self, key: &str) -> rusqlite::Result<Option<StoredRow>> {
        let row = self
            .transaction
            .query_row(SQL_ROW_BY_KEY, [key], stored_row)
            .optional()?;
        if let Some(found) = &row {
            self.by_id.insert(found.id, row.clone());
        }
        Ok(row)
    }

    /// The direct children of `parent_id`, by the `parent_id` index. Used only
    /// for a node the batch deletes or relocates — whose children the batch
    /// must therefore already contain.
    fn child_ids(&self, parent_id: i64) -> rusqlite::Result<Vec<i64>> {
        let mut statement = self.transaction.prepare_cached(SQL_CHILD_IDS)?;
        statement
            .query_map([parent_id], |row| row.get(0))?
            .collect()
    }
}

/// An upsert, once its canonical id and its stored predecessor are known.
struct Resolved<'b> {
    node: &'b ObservedNode,
    canonical: i64,
    /// `None` for a node the batch creates.
    before: Option<StoredRow>,
    parent: i64,
}

impl Index {
    /// Applies one already-reconciled batch — `TASK-0040`, `DEC-0038` §3.
    ///
    /// One `IMMEDIATE` transaction, one revision. **Everything is checked
    /// before the first write** (shape, identity, root, parents, cycles, path
    /// coherence, siblings, orphans, subtree completeness); a refusal leaves
    /// the file byte-for-byte as it was. A batch that changes no stored
    /// column and deletes nothing is a **no-op**: no event, no revision.
    ///
    /// Otherwise, in that transaction and in that order: new rows by
    /// ascending depth (so a parent precedes its children under the foreign
    /// key), changed rows, deletions by descending depth (so the `ON DELETE
    /// CASCADE` never has a child left to remove — a guard probes it and
    /// aborts if one is), the signed `child_count` deltas, `node_count` and
    /// `next_node_id`, then the journal events and the revision. Any error
    /// after the first write rolls the whole transaction back.
    pub(crate) fn apply_update_batch(
        &mut self,
        batch: &UpdateBatch,
    ) -> Result<ApplyOutcome, BatchError> {
        validate_shape(batch)?;
        if batch.upserts.is_empty() && batch.deletions.is_empty() && batch.root.is_none() {
            return Ok(ApplyOutcome {
                revision: hierarchy::read_revision(&self.connection)?,
                ..ApplyOutcome::default()
            });
        }
        // `IMMEDIATE`: the write lock is taken before anything is read, so what
        // is checked is exactly what this same transaction then changes. A
        // second writer waits — for the connection's existing busy timeout —
        // and then fails with `SQLITE_BUSY` without a half batch.
        let transaction = self
            .connection
            .transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)?;
        let outcome = apply(&transaction, batch)?;
        if outcome.applied {
            transaction.commit()?;
        }
        Ok(outcome)
    }
}

/// The checks that need no database: what the batch says about itself.
fn validate_shape(batch: &UpdateBatch) -> Result<(), BatchError> {
    let mut tokens = HashSet::with_capacity(batch.upserts.len());
    let mut keys = HashSet::with_capacity(batch.upserts.len());
    for node in &batch.upserts {
        if node.kind == NodeKind::Root {
            return Err(BatchError::RootImmutable);
        }
        if node.name.is_empty() || node.name.contains('/') {
            return Err(BatchError::InvalidName);
        }
        if !tokens.insert(node.token()) {
            return Err(BatchError::DuplicateToken(node.token()));
        }
        if !keys.insert(node.identity.stable_key.as_str()) {
            return Err(BatchError::IdentityCollision);
        }
    }
    let mut deleted = HashSet::with_capacity(batch.deletions.len());
    for &id in &batch.deletions {
        if !deleted.insert(id) {
            return Err(BatchError::DuplicateDeletion(id));
        }
    }
    Ok(())
}

fn read_meta(transaction: &Transaction<'_>, key: &str) -> rusqlite::Result<Option<String>> {
    transaction
        .query_row(
            "SELECT value FROM schema_meta WHERE key = ?1",
            [key],
            |row| row.get(0),
        )
        .optional()
}

fn join_path(parent: &str, name: &str) -> String {
    if parent.is_empty() {
        name.to_string()
    } else {
        format!("{parent}/{name}")
    }
}

/// The whole batch, inside the caller's transaction. Returns without having
/// written anything when the batch is refused or is a no-op.
fn apply(transaction: &Transaction<'_>, batch: &UpdateBatch) -> Result<ApplyOutcome, BatchError> {
    let mut rows = Rows::new(transaction);

    // -- 0. The index must carry durable identities to correlate against.
    let root_id: i64 = read_meta(transaction, "root_id")?
        .and_then(|raw| raw.parse().ok())
        .ok_or(BatchError::MetadataCorrupt("root_id"))?;
    // Every row `publish` writes is stamped, so a stamped root means a stamped
    // file; an unstamped one is a `v3` file migrated but not yet republished,
    // and the first `Actualiser` must re-stamp it.
    let root_stamped: bool = transaction
        .query_row(
            "SELECT stable_key IS NOT NULL FROM nodes WHERE id = ?1",
            [root_id],
            |row| row.get(0),
        )
        .optional()?
        .ok_or(BatchError::MetadataCorrupt("root row"))?;
    if !root_stamped {
        return Err(BatchError::IndexNotStamped);
    }
    let root_row = rows
        .by_id(root_id)?
        .ok_or(BatchError::MetadataCorrupt("root row"))?;
    // The root's own metadata, only when it actually differs from what is stored.
    let root_change = batch.root.filter(|observed| {
        root_row.modified_unix_ms != observed.modified_unix_ms
            || root_row.online_only != observed.online_only
            || root_row.reparse_point != observed.reparse_point
    });

    // -- 1. Identity: every upsert either matches a stored key or is new.
    let mut next_id = read_next_node_id(transaction)?;
    let first_allocated = next_id;
    let mut resolved: Vec<Resolved<'_>> = Vec::with_capacity(batch.upserts.len());
    let mut token_to_canonical = HashMap::with_capacity(batch.upserts.len());
    let mut upsert_ids = HashSet::with_capacity(batch.upserts.len());
    for node in &batch.upserts {
        let before = rows.by_stable_key(&node.identity.stable_key)?;
        let canonical = match &before {
            Some(row) => {
                if row.id == root_id {
                    return Err(BatchError::RootImmutable);
                }
                if row.provenance.as_deref() != Some(node.identity.provenance.as_str()) {
                    return Err(BatchError::ProvenanceMismatch);
                }
                row.id
            }
            None => {
                let assigned = next_id;
                next_id += 1;
                assigned
            }
        };
        token_to_canonical.insert(node.token(), canonical);
        upsert_ids.insert(canonical);
        resolved.push(Resolved {
            node,
            canonical,
            before,
            parent: 0,
        });
    }
    let allocated = next_id - first_allocated;

    // -- 2. Deletions name known, non-root rows the batch does not also upsert.
    let mut deleted: HashMap<i64, StoredRow> = HashMap::with_capacity(batch.deletions.len());
    for &id in &batch.deletions {
        if id == root_id {
            return Err(BatchError::RootImmutable);
        }
        if upsert_ids.contains(&id) {
            return Err(BatchError::DeleteAndUpsert(id));
        }
        let row = rows.by_id(id)?.ok_or(BatchError::UnknownDeletion(id))?;
        deleted.insert(id, row);
    }

    // -- 3. Parents: resolvable, surviving, directories; paths and depths
    //       consistent with them; a `PATH_FALLBACK` key never a correlation.
    let by_canonical: HashMap<i64, usize> = resolved
        .iter()
        .enumerate()
        .map(|(position, entry)| (entry.canonical, position))
        .collect();
    for position in 0..resolved.len() {
        let node = resolved[position].node;
        let token = node.token();
        let parent = match node.parent {
            ParentRef::InBatch(other) => *token_to_canonical
                .get(&other)
                .ok_or(BatchError::ParentMissing { token })?,
            ParentRef::Existing(id) => id,
        };
        if deleted.contains_key(&parent) {
            return Err(BatchError::ParentDeleted(resolved[position].canonical));
        }
        // The parent's *final* kind, path and depth: the batch's own version
        // when it upserts the parent, otherwise the stored row.
        let (parent_kind, parent_path, parent_depth) = match by_canonical.get(&parent) {
            Some(&other) => {
                let entry = &resolved[other];
                (
                    entry.node.kind,
                    entry.node.relative_path.clone(),
                    entry.node.depth,
                )
            }
            None => {
                let row = rows
                    .by_id(parent)?
                    .ok_or(BatchError::ParentMissing { token })?;
                (row.kind, row.relative_path, row.depth)
            }
        };
        if !matches!(parent_kind, NodeKind::Directory | NodeKind::Root) {
            return Err(BatchError::ParentNotDirectory { token });
        }
        if node.depth != parent_depth + 1
            || node.relative_path != join_path(&parent_path, &node.name)
        {
            return Err(BatchError::IncoherentPath { token });
        }
        if let Some(before) = &resolved[position].before
            && before.provenance.as_deref() == Some(IdentityProvenance::PathFallback.as_str())
            && (before.name != node.name
                || before.parent_id != Some(parent)
                || before.relative_path != node.relative_path)
        {
            return Err(BatchError::FallbackCorrelation);
        }
        resolved[position].parent = parent;
    }
    let final_parent: HashMap<i64, i64> = resolved
        .iter()
        .map(|entry| (entry.canonical, entry.parent))
        .collect();

    // -- 4. No cycle: every upserted node reaches the root through the *final*
    //       parent links — the batch's own where it moves a node, the stored
    //       ones elsewhere.
    let mut reaches_root: HashSet<i64> = HashSet::from([root_id]);
    for entry in &resolved {
        let mut walked = vec![entry.canonical];
        let mut current = entry.parent;
        while !reaches_root.contains(&current) {
            if walked.contains(&current) || walked.len() > MAX_ANCESTOR_CHAIN {
                return Err(BatchError::Cycle(entry.canonical));
            }
            if deleted.contains_key(&current) {
                return Err(BatchError::ParentDeleted(entry.canonical));
            }
            walked.push(current);
            current = match final_parent.get(&current) {
                Some(&parent) => parent,
                None => {
                    let row = rows.by_id(current)?.ok_or(BatchError::ParentMissing {
                        token: entry.node.token(),
                    })?;
                    match row.parent_id {
                        Some(parent) => parent,
                        // A parentless row that is not the root: nothing to walk.
                        None => break,
                    }
                }
            };
        }
        reaches_root.extend(walked);
    }

    // -- 5. Siblings: no two live children of a parent share a name.
    let mut live_names: HashSet<(i64, &str)> = HashSet::with_capacity(resolved.len());
    for entry in &resolved {
        let name = entry.node.name.as_str();
        if !live_names.insert((entry.parent, name)) {
            return Err(BatchError::DuplicateSibling {
                token: entry.node.token(),
            });
        }
        let mut statement = transaction.prepare_cached(SQL_SIBLING)?;
        let holders = statement
            .query_map(params![entry.parent, name], |row| row.get::<_, i64>(0))?
            .collect::<rusqlite::Result<Vec<_>>>()?;
        for holder in holders {
            if holder != entry.canonical
                && !upsert_ids.contains(&holder)
                && !deleted.contains_key(&holder)
            {
                return Err(BatchError::DuplicateSibling {
                    token: entry.node.token(),
                });
            }
        }
    }

    // -- 6. Orphans and stale subtrees. Every child of a deleted node, and of a
    //       directory whose path, depth or directory-ness changes, must be in
    //       the batch — deleted, or upserted (moved or re-pathed).
    let touched = |id: i64| upsert_ids.contains(&id) || deleted.contains_key(&id);
    for &id in deleted.keys() {
        for child in rows.child_ids(id)? {
            if !touched(child) {
                return Err(BatchError::Orphan(child));
            }
        }
    }
    for entry in &resolved {
        let Some(before) = &entry.before else {
            continue;
        };
        if before.kind != NodeKind::Directory {
            continue;
        }
        let repathed =
            before.relative_path != entry.node.relative_path || before.depth != entry.node.depth;
        if repathed || entry.node.kind != NodeKind::Directory {
            for child in rows.child_ids(entry.canonical)? {
                if !touched(child) {
                    return Err(BatchError::IncompleteSubtree(child));
                }
            }
        }
    }

    // -- 7. What actually changes. A row identical to its stored self is not
    //       written; a batch with nothing to write and nothing to delete is a
    //       no-op that leaves the revision alone.
    let rewritten: Vec<&Resolved<'_>> = resolved
        .iter()
        .filter(|entry| {
            entry
                .before
                .as_ref()
                .is_some_and(|before| row_differs(before, entry))
        })
        .collect();
    let created: Vec<&Resolved<'_>> = resolved
        .iter()
        .filter(|entry| entry.before.is_none())
        .collect();
    let revision = hierarchy::read_revision(transaction)?;
    if created.is_empty() && rewritten.is_empty() && deleted.is_empty() && root_change.is_none() {
        return Ok(ApplyOutcome {
            revision,
            ..ApplyOutcome::default()
        });
    }

    // -- 8. `child_count`: a signed delta per affected parent, checked so that
    //       no count can go negative before anything is written.
    let mut deltas: HashMap<i64, i64> = HashMap::new();
    for row in deleted.values() {
        if let Some(parent) = row.parent_id
            && !deleted.contains_key(&parent)
        {
            *deltas.entry(parent).or_default() -= 1;
        }
    }
    for entry in &resolved {
        if let Some(before) = &entry.before
            && let Some(old_parent) = before.parent_id
            && !deleted.contains_key(&old_parent)
        {
            *deltas.entry(old_parent).or_default() -= 1;
        }
        *deltas.entry(entry.parent).or_default() += 1;
    }
    deltas.retain(|_, delta| *delta != 0);
    for (&parent, &delta) in &deltas {
        let current = match by_canonical.get(&parent) {
            Some(&position) if resolved[position].before.is_none() => 0,
            _ => {
                rows.by_id(parent)?
                    .ok_or(BatchError::MetadataCorrupt("child_count parent"))?
                    .child_count
            }
        };
        if current + delta < 0 {
            return Err(BatchError::MetadataCorrupt("child_count below zero"));
        }
    }

    // -- 9. The journal: the *same* diff `publish` uses, over the touched rows
    //       only. `previous` holds the stored state of every upserted-and-known
    //       row and of every deleted one, so the diff's "only before ⇒ DELETED"
    //       arm is exactly the deletions, and "only after ⇒ CREATED" exactly
    //       the creations.
    let mut previous: HashMap<i64, PreviousNode> = HashMap::new();
    let mut previous_paths: HashMap<i64, String> = HashMap::new();
    let stored_before = resolved
        .iter()
        .filter_map(|entry| entry.before.as_ref())
        .chain(deleted.values())
        .chain(batch.root.is_some().then_some(&root_row));
    for row in stored_before {
        previous.insert(
            row.id,
            PreviousNode {
                parent_id: row.parent_id,
                name: row.name.clone(),
                kind: row.kind,
                size_bytes: row.size_bytes,
                modified_unix_ms: row.modified_unix_ms,
                online_only: row.online_only,
                reparse_point: row.reparse_point,
            },
        );
        previous_paths.insert(row.id, row.relative_path.clone());
    }
    let root_current = batch.root.as_ref().map(|observed| CurrentNode {
        id: root_id,
        parent_id: None,
        name: &root_row.name,
        relative_path: &root_row.relative_path,
        kind: NodeKind::Root,
        size_bytes: root_row.size_bytes,
        modified_unix_ms: observed.modified_unix_ms,
        online_only: observed.online_only,
        reparse_point: observed.reparse_point,
    });
    let current: Vec<CurrentNode<'_>> = resolved
        .iter()
        .map(|entry| CurrentNode {
            id: entry.canonical,
            parent_id: Some(entry.parent),
            name: &entry.node.name,
            relative_path: &entry.node.relative_path,
            kind: entry.node.kind,
            size_bytes: size_of(entry.node),
            modified_unix_ms: entry.node.modified_unix_ms,
            online_only: entry.node.online_only,
            reparse_point: entry.node.reparse_point,
        })
        .chain(root_current)
        .collect();
    let events = change_journal::diff(&previous, &current, |id| {
        previous_paths
            .get(&id)
            .cloned()
            .ok_or(rusqlite::Error::QueryReturnedNoRows)
    })?;

    // ---- Nothing above wrote a byte. From here, any error rolls back. ----

    // -- 10a. New rows, parents first (ascending depth keeps the foreign key
    //         satisfied among the new rows themselves).
    let mut ordered_new = created.clone();
    ordered_new.sort_by_key(|entry| entry.node.depth);
    {
        let mut insert = transaction.prepare_cached(SQL_INSERT)?;
        for entry in &ordered_new {
            insert.execute(params![
                entry.canonical,
                entry.parent,
                entry.node.name,
                entry.node.relative_path,
                entry.node.kind.as_str(),
                i64::from(entry.node.depth),
                size_of(entry.node),
                entry.node.modified_unix_ms,
                entry.node.online_only,
                entry.node.reparse_point,
                entry.node.identity.stable_key,
                entry.node.identity.provenance.as_str(),
            ])?;
        }
    }

    // -- 10b. Changed rows. `child_count`, `seen`, `stable_key` and provenance
    //         are deliberately not in the statement.
    {
        let mut update = transaction.prepare_cached(SQL_UPDATE)?;
        let mut clear_diagnostic = transaction.prepare_cached(SQL_CLEAR_DIAGNOSTIC)?;
        for entry in &rewritten {
            update.execute(params![
                entry.canonical,
                entry.parent,
                entry.node.name,
                entry.node.relative_path,
                entry.node.kind.as_str(),
                i64::from(entry.node.depth),
                size_of(entry.node),
                entry.node.modified_unix_ms,
                entry.node.online_only,
                entry.node.reparse_point,
            ])?;
            // A diagnostic is keyed by the path it was raised at. A path that
            // no longer names this node must not keep describing it.
            if let Some(before) = &entry.before
                && before.relative_path != entry.node.relative_path
            {
                clear_diagnostic.execute([&before.relative_path])?;
            }
        }
        for row in deleted.values() {
            clear_diagnostic.execute([&row.relative_path])?;
        }
    }

    if let Some(observed) = root_change {
        transaction
            .prepare_cached(SQL_UPDATE_ROOT)?
            .execute(params![
                root_id,
                observed.modified_unix_ms,
                observed.online_only,
                observed.reparse_point,
            ])?;
    }

    // -- 10c. Deletions, deepest first. Step 6 proved every child of a deleted
    //         node is deleted or already moved away; the probe re-checks that
    //         against the rows as they now are, because a cascade would delete
    //         a survivor silently.
    {
        let mut ordered: Vec<&StoredRow> = deleted.values().collect();
        ordered.sort_by_key(|row| std::cmp::Reverse(row.depth));
        let mut has_child = transaction.prepare_cached(SQL_HAS_CHILD)?;
        let mut delete = transaction.prepare_cached(SQL_DELETE)?;
        for row in ordered {
            if has_child.query_row([row.id], |probe| probe.get::<_, bool>(0))? {
                return Err(BatchError::Orphan(row.id));
            }
            if delete.execute([row.id])? != 1 {
                return Err(BatchError::MetadataCorrupt("deleted row vanished"));
            }
        }
    }

    // -- 10d. `child_count` deltas, for the parents that still exist.
    {
        let mut adjust = transaction.prepare_cached(SQL_ADJUST_CHILD_COUNT)?;
        for (&parent, &delta) in &deltas {
            if !deleted.contains_key(&parent) && adjust.execute(params![parent, delta])? != 1 {
                return Err(BatchError::MetadataCorrupt("child_count parent vanished"));
            }
        }
    }

    // -- 10e. Global metadata: the count moves by the exact difference, and the
    //         id counter only when an id was actually allocated.
    let node_count: i64 = read_meta(transaction, "node_count")?
        .and_then(|raw| raw.parse().ok())
        .ok_or(BatchError::MetadataCorrupt("node_count"))?;
    let new_count = node_count + created.len() as i64 - deleted.len() as i64;
    if new_count < 1 {
        return Err(BatchError::MetadataCorrupt("node_count below one"));
    }
    transaction.execute(
        "INSERT OR REPLACE INTO schema_meta(key, value) VALUES ('node_count', ?1)",
        [new_count.to_string()],
    )?;
    if allocated > 0 {
        transaction.execute(
            "INSERT OR REPLACE INTO schema_meta(key, value) VALUES ('next_node_id', ?1)",
            [next_id.to_string()],
        )?;
    }

    // -- 10f. The events and the revision they were detected at, written with
    //         the rows: journal, corpus and revision become visible together.
    let detected_revision = revision.saturating_add(1);
    change_journal::append_events(
        transaction,
        detected_revision,
        batch.detected_unix_ms,
        &events,
    )?;
    let advanced = hierarchy::advance_revision(transaction)?;
    debug_assert_eq!(advanced, detected_revision);

    Ok(ApplyOutcome {
        applied: true,
        revision: advanced,
        created: created.len(),
        rewritten: rewritten.len() + usize::from(root_change.is_some()),
        deleted: deleted.len(),
        journal: change_journal::summarize(&events),
    })
}

fn size_of(node: &ObservedNode) -> i64 {
    i64::try_from(node.size_bytes).unwrap_or(i64::MAX)
}

/// Whether any stored column an upsert can set differs from the stored row.
fn row_differs(before: &StoredRow, entry: &Resolved<'_>) -> bool {
    let node = entry.node;
    before.parent_id != Some(entry.parent)
        || before.name != node.name
        || before.relative_path != node.relative_path
        || before.kind != node.kind
        || before.depth != node.depth
        || before.size_bytes != size_of(node)
        || before.modified_unix_ms != node.modified_unix_ms
        || before.online_only != node.online_only
        || before.reparse_point != node.reparse_point
}
