//! Full-scan reconciler — `TASK-0041`, `DEC-0039` §5.
//!
//! Turns **one complete, already-successful manual scan** and the current
//! canonical Index into the **minimal** [`UpdateBatch`] that
//! [`Index::apply_update_batch`] (`TASK-0040`, option `U-B`) needs. It is the
//! producer the kernel was written for; the kernel is not modified.
//!
//! # What it is
//!
//! * A pure comparison. It reads the stored rows once, in a stream, and the scan
//!   the caller already holds. It writes nothing, creates no catalogue and keeps
//!   no second index: the answer is a batch, or nothing.
//! * Keyed **only** by stable key (`DEC-0009` I-E). A key already stored is the
//!   same object and keeps its canonical id; an unknown key is a creation; a
//!   stored key absent from the scan is a deletion. No heuristic, no similarity,
//!   no name/size/date correlation, no file content.
//! * `PATH_FALLBACK` needs no special case: its key is derived from the path, so
//!   a rename or a move changes the key and the rule above already yields a
//!   deletion plus a creation — the very thing `DEC-0009` accepts for it.
//! * Deterministic: upserts follow the scan's own order, deletions the stored id
//!   order.
//!
//! # What it is not
//!
//! It is **not** the watcher (`F-030`): it needs a complete scan and therefore
//! costs `O(corpus)`. That is `F-029`'s manual refresh, by design. The `F-031`
//! verdict is about *applying* a reconciled batch, and that stays the kernel's
//! business and cost. It is also not reachable from the WebView: nothing here is
//! `Serialize`, no stable key leaves the core, and no error message carries one.
//!
//! # What a batch contains
//!
//! Only nodes that are **new** or whose stored columns **differ**: a moved or
//! renamed directory therefore brings every descendant whose path or depth
//! changed, which is exactly the complete subtree the kernel demands. The root is
//! never an upsert; its own metadata travels as a [`RootObservation`], and only
//! when it differs from what is stored — so a scan that changed nothing yields an
//! empty batch and the refresh takes no write lock at all.

use crate::domain::{NodeDto, NodeKind};
use crate::identity::NodeIdentity;
use crate::incremental::{ObservedNode, ParentRef, RootObservation, UpdateBatch};
use crate::index::Index;
use rusqlite::OptionalExtension;
use std::collections::{HashMap, HashSet};
use thiserror::Error;

/// A refusal to reconcile. Raised **before** anything is written — the
/// reconciler never writes — so the Index is untouched. None of the messages
/// carries a stable key or an absolute path.
#[derive(Debug, Error)]
pub(crate) enum ReconcileError {
    #[error(transparent)]
    Sqlite(#[from] rusqlite::Error),
    #[error("reconcile_missing_root: the scan has no root")]
    MissingRoot,
    #[error("reconcile_multiple_roots: the scan has several roots")]
    MultipleRoots,
    #[error("reconcile_identity_collision: two scanned nodes carry the same stable key")]
    IdentityCollision,
    #[error("reconcile_not_bijective: identities must name each scanned node exactly once")]
    NotBijective,
    #[error("reconcile_dangling_parent: a scanned node names a parent that was not scanned")]
    DanglingParent,
    /// The scanned root is not the stored root. `F-032` owns the root's
    /// disappearance and replacement; the incremental refresh neither guesses
    /// nor rebuilds, and the person can still choose **Reconstruire**.
    #[error("reconcile_root_identity_changed: the scanned root is not the indexed root")]
    RootIdentityChanged,
    #[error("reconcile_unstamped_row: a stored row carries no durable identity")]
    UnstampedRow,
    #[error("reconcile_metadata_corrupt: {0}")]
    MetadataCorrupt(&'static str),
}

/// Whether the Index carries durable identities to correlate against — the
/// **same** criterion the kernel applies before it writes
/// (`BatchError::IndexNotStamped`): the root row's `stable_key` is set. Every row
/// `publish` writes is stamped, so a stamped root means a stamped file; an
/// unstamped one is a schema-3 file that was migrated but never republished.
///
/// The product asks this **once, before the scan is compared**, to choose the
/// one explicit full path a legacy Index may take (`DEC-0039` §3). It is never
/// consulted to recover from a kernel error.
pub(crate) fn is_identity_stamped(index: &Index) -> Result<bool, ReconcileError> {
    let root_id = read_root_id(index)?;
    index
        .connection
        .query_row(
            "SELECT stable_key IS NOT NULL FROM nodes WHERE id = ?1",
            [root_id],
            |row| row.get(0),
        )
        .optional()?
        .ok_or(ReconcileError::MetadataCorrupt("root row"))
}

fn read_root_id(index: &Index) -> Result<i64, ReconcileError> {
    index
        .connection
        .query_row(
            "SELECT value FROM schema_meta WHERE key = 'root_id'",
            [],
            |row| row.get::<_, String>(0),
        )
        .optional()?
        .and_then(|raw| raw.parse().ok())
        .ok_or(ReconcileError::MetadataCorrupt("root_id"))
}

/// One stored row, reduced to what the comparison needs.
struct StoredColumns {
    id: i64,
    parent_id: Option<i64>,
    name: String,
    relative_path: String,
    kind: String,
    depth: i64,
    size_bytes: i64,
    modified_unix_ms: Option<i64>,
    online_only: bool,
    reparse_point: bool,
    stable_key: Option<String>,
}

fn size_of(node: &NodeDto) -> i64 {
    i64::try_from(node.size_bytes).unwrap_or(i64::MAX)
}

/// The stored columns a batch can set — the same set the kernel's own
/// `row_differs` compares — **except the parent**, which can only be compared
/// once every canonical id is known.
fn same_columns_but_parent(stored: &StoredColumns, node: &NodeDto) -> bool {
    stored.name == node.name
        && stored.relative_path == node.relative_path
        && NodeKind::from_db(&stored.kind) == node.kind
        && stored.depth == i64::from(node.depth)
        && stored.size_bytes == size_of(node)
        && stored.modified_unix_ms == node.modified_unix_ms
        && stored.online_only == node.online_only
        && stored.reparse_point == node.reparse_point
}

/// Derives the minimal batch that takes `index` to the state `nodes` describes.
///
/// `nodes` and `identities` are exactly what `scan_tree_controlled` returned:
/// one identity per node, tied by the scanner's temporary id, which becomes the
/// batch-local token. A scan is refused, before any comparison, if it is not a
/// single-rooted bijection with distinct stable keys.
pub(crate) fn reconcile_full_scan(
    index: &Index,
    nodes: &[NodeDto],
    identities: &[NodeIdentity],
    detected_unix_ms: i64,
) -> Result<UpdateBatch, ReconcileError> {
    // -- The scan must be a well-formed, single-rooted bijection.
    let mut identity_of: HashMap<i64, &NodeIdentity> = HashMap::with_capacity(identities.len());
    let mut keys: HashSet<&str> = HashSet::with_capacity(identities.len());
    for candidate in identities {
        if !keys.insert(candidate.stable_key.as_str()) {
            return Err(ReconcileError::IdentityCollision);
        }
        if identity_of.insert(candidate.node_id, candidate).is_some() {
            return Err(ReconcileError::NotBijective);
        }
    }
    let mut position_of: HashMap<i64, usize> = HashMap::with_capacity(nodes.len());
    for (position, node) in nodes.iter().enumerate() {
        if position_of.insert(node.id, position).is_some() {
            return Err(ReconcileError::NotBijective);
        }
    }
    if position_of.len() != identity_of.len()
        || !position_of.keys().all(|id| identity_of.contains_key(id))
    {
        return Err(ReconcileError::NotBijective);
    }
    let mut roots = nodes
        .iter()
        .enumerate()
        .filter(|(_, node)| node.parent_id.is_none());
    let root_position = roots.next().ok_or(ReconcileError::MissingRoot)?.0;
    if roots.next().is_some() {
        return Err(ReconcileError::MultipleRoots);
    }
    let mut parent_position: Vec<Option<usize>> = Vec::with_capacity(nodes.len());
    for node in nodes {
        parent_position.push(match node.parent_id {
            None => None,
            Some(parent) => Some(
                *position_of
                    .get(&parent)
                    .ok_or(ReconcileError::DanglingParent)?,
            ),
        });
    }
    let by_key: HashMap<&str, usize> = nodes
        .iter()
        .enumerate()
        .map(|(position, node)| (identity_of[&node.id].stable_key.as_str(), position))
        .collect();

    // -- One streaming pass over the stored rows.
    let root_id = read_root_id(index)?;
    let mut canonical: Vec<Option<i64>> = vec![None; nodes.len()];
    let mut stored_parent: Vec<Option<i64>> = vec![None; nodes.len()];
    let mut same_columns: Vec<bool> = vec![false; nodes.len()];
    let mut deletions: Vec<i64> = Vec::new();
    let mut stored_root: Option<RootObservation> = None;
    {
        let mut statement = index.connection.prepare(
            "SELECT id, parent_id, name, relative_path, kind, depth, size_bytes,
                    modified_unix_ms, online_only, reparse_point, stable_key
               FROM nodes ORDER BY id",
        )?;
        let mut rows = statement.query([])?;
        while let Some(row) = rows.next()? {
            let stored = StoredColumns {
                id: row.get(0)?,
                parent_id: row.get(1)?,
                name: row.get(2)?,
                relative_path: row.get(3)?,
                kind: row.get(4)?,
                depth: row.get(5)?,
                size_bytes: row.get(6)?,
                modified_unix_ms: row.get(7)?,
                online_only: row.get(8)?,
                reparse_point: row.get(9)?,
                stable_key: row.get(10)?,
            };
            let key = stored
                .stable_key
                .as_deref()
                .ok_or(ReconcileError::UnstampedRow)?;
            if stored.id == root_id {
                stored_root = Some(RootObservation {
                    modified_unix_ms: stored.modified_unix_ms,
                    online_only: stored.online_only,
                    reparse_point: stored.reparse_point,
                });
            }
            match by_key.get(key) {
                Some(&position) => {
                    // The stored root must be the scanned root, and only it.
                    if (stored.id == root_id) != (position == root_position) {
                        return Err(ReconcileError::RootIdentityChanged);
                    }
                    canonical[position] = Some(stored.id);
                    stored_parent[position] = stored.parent_id;
                    same_columns[position] = same_columns_but_parent(&stored, &nodes[position]);
                }
                None => {
                    if stored.id == root_id {
                        return Err(ReconcileError::RootIdentityChanged);
                    }
                    deletions.push(stored.id);
                }
            }
        }
    }
    let stored_root = stored_root.ok_or(ReconcileError::MetadataCorrupt("root row"))?;
    if canonical[root_position] != Some(root_id) {
        return Err(ReconcileError::RootIdentityChanged);
    }

    // -- Who enters the batch: what is new, and what differs (parent included).
    let mut upserts: Vec<ObservedNode> = Vec::new();
    for (position, node) in nodes.iter().enumerate() {
        let Some(parent) = parent_position[position] else {
            continue; // the root is never an upsert
        };
        let unchanged = canonical[position].is_some()
            && same_columns[position]
            && stored_parent[position] == canonical[parent];
        if unchanged {
            continue;
        }
        upserts.push(ObservedNode {
            identity: identity_of[&node.id].clone(),
            parent: match canonical[parent] {
                Some(existing) => ParentRef::Existing(existing),
                // A parent with no stored row is itself a creation, hence an
                // upsert of this very batch.
                None => ParentRef::InBatch(nodes[parent].id),
            },
            name: node.name.clone(),
            relative_path: node.relative_path.clone(),
            kind: node.kind,
            depth: node.depth,
            size_bytes: node.size_bytes,
            modified_unix_ms: node.modified_unix_ms,
            online_only: node.online_only,
            reparse_point: node.reparse_point,
        });
    }

    let observed_root = RootObservation {
        modified_unix_ms: nodes[root_position].modified_unix_ms,
        online_only: nodes[root_position].online_only,
        reparse_point: nodes[root_position].reparse_point,
    };
    Ok(UpdateBatch {
        upserts,
        deletions,
        // Only a moved root timestamp or flag is worth a write; otherwise an
        // unchanged scan is an empty batch and takes no lock.
        root: (observed_root != stored_root).then_some(observed_root),
        detected_unix_ms,
    })
}
