//! `W-B` — targeted re-enumeration and reconciliation of **scopes** —
//! `TASK-0043` E, `DEC-0041` §3, `DEC-0010` option `W-B`.
//!
//! A watcher hint says *where to look*. This module looks there — and only there —
//! and turns what it sees into the **same** [`UpdateBatch`] a full scan would have
//! produced for that area, for [`Index::apply_update_batch`] (`TASK-0040`, `U-B`) to
//! apply. It is the second producer of that batch beside [`crate::reconcile`], and it
//! shares its rules rather than copying them:
//!
//! * **Classification and identity** — [`crate::scanner::observe_entry`], the very
//!   function the full scan calls: the same kind, the same `SYSTEM` /
//!   `PATH_FALLBACK` identity, the same Cloud Files boundary, reparse points never
//!   followed, no content ever read.
//! * **Correlation** — stable key only (`DEC-0009` I-E). No name, size or date
//!   heuristic.
//! * **Events** — none are produced here. The kernel derives the journal from the
//!   batch with the same diff a full publication uses.
//!
//! # What a scope is
//!
//! **One directory and its direct entries**, not its whole subtree. Reading a scope
//! lists the directory, observes each entry, and *descends* only into a child
//! directory that is **new** or **not where the Index has it** (a creation, a move, a
//! rename): those subtrees must be observed to be applied (a directory that changes
//! place must arrive with every descendant, or the kernel refuses it). A child
//! directory that is exactly where the Index already has it is *not entered*, so a
//! large unrelated sibling is never enumerated — the whole point of `W-B` over a full
//! scan.
//!
//! That is the smallest honest reading of `DEC-0041` §3. An operating-system event
//! names the entry that changed, so the directory that lists it is the one whose
//! entries may differ; an entry that changed *inside* a deeper directory has its own
//! hint, and therefore its own scope. When the hints cannot be trusted to name
//! everything, the answer is not to enumerate a wider tree — it is a **full
//! verification** (`W-C`), decided by the caller.
//!
//! # When a scope is refused (and the caller does a full verification instead)
//!
//! [`ScopeRefusal`] — a scope that resolves to the **root**; a directory that could
//! not be listed; more entries than the bound; a batch the reconciler or the kernel
//! refuses. None of them is an error the person sees: each is a reason to verify in
//! full, and the reconciliation that follows is exactly the manual **Actualiser**.
//!
//! # Nothing here writes a source, a catalogue or a preference
//!
//! The scan reads metadata. [`reconcile_scopes`] only reads the Index. Only the
//! caller applies the batch.

use crate::domain::{NodeKind, ScanDiagnostic};
use crate::identity::NodeIdentity;
use crate::incremental::{ObservedNode, ParentRef, UpdateBatch};
use crate::index::Index;
use crate::map::exclusion_policy::ExclusionPolicy;
use crate::scanner::{display_relative, observe_entry};
use rusqlite::OptionalExtension;
use std::collections::{BTreeSet, HashMap, HashSet, VecDeque};
use std::fs;
use std::path::{Path, PathBuf};

/// Why a targeted reconciliation gave up. Every variant sends the caller to a
/// **full verification**; none is shown as an error.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum ScopeRefusal {
    /// A hint resolved to the root: there is no smaller safe scope, so the root's
    /// direct entries and its own metadata are a full verification's business.
    RootScope,
    /// A scope directory could not be listed, or an entry's metadata could not be
    /// read: the observation is incomplete, and a full scan would say so too.
    Incomplete,
    /// More entries than [`ScopeLimits::max_nodes`]: a full scan is cheaper.
    TooLarge,
    /// The scan was cancelled (the watcher is stopping).
    Cancelled,
    /// The observed state is not a single coherent picture (a stable key seen twice
    /// at different places, a key the Index holds as the root).
    Incoherent,
    /// The Index has no durable identities to correlate against.
    NotStamped,
    /// The Index could not be read.
    Store,
}

/// The bounds of one targeted reconciliation.
#[derive(Debug, Clone, Copy)]
pub(crate) struct ScopeLimits {
    pub max_nodes: usize,
}

/// What a burst asks a targeted reconciliation to look at.
///
/// * [`ScopeRequest::List`] — the directory's **own entries** may differ (an entry inside it
///   appeared, disappeared or was renamed): it is observed and re-listed.
/// * [`ScopeRequest::Point`] — only **one entry itself** moved (its attributes or date): it is
///   re-observed alone, with no listing. This is what keeps a modification of a top-level
///   entry — whose *parent* is the root — from becoming a full verification: nothing about
///   the root's list of entries is in doubt, only the entry.
///
/// Neither says what happened; both say where to look.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub(crate) enum ScopeRequest {
    List(String),
    Point(String),
}

/// A directory that is safe to re-list: it exists in the Index **and** on disk, it
/// is a real directory (not a reparse point), and it is the *same* object (its
/// identity is the stored one).
#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct ResolvedScope {
    pub path: String,
}

/// The requests of a burst, resolved to what is safe to read.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub(crate) struct ResolvedScopes {
    /// Directories to observe and re-list, shallow first.
    pub lists: Vec<ResolvedScope>,
    /// Entries to observe alone.
    pub points: Vec<String>,
}

impl ResolvedScopes {
    pub(crate) fn len(&self) -> usize {
        self.lists.len() + self.points.len()
    }
}

/// One entry as the scope scan observed it.
#[derive(Debug, Clone)]
pub(crate) struct ScopedNode {
    pub relative_path: String,
    pub name: String,
    pub kind: NodeKind,
    pub depth: u32,
    pub size_bytes: u64,
    pub modified_unix_ms: Option<i64>,
    pub online_only: bool,
    pub reparse_point: bool,
    pub identity: NodeIdentity,
}

/// What reading the scopes produced.
#[derive(Debug, Default)]
pub(crate) struct ScopeScan {
    pub nodes: Vec<ScopedNode>,
    /// Every directory whose **direct entries** were listed: the scope directories
    /// and the new or moved directories entered from them. A directory absent from
    /// this list was never opened — the proof that a large sibling was not walked.
    pub listed: Vec<String>,
    pub diagnostics: Vec<ScanDiagnostic>,
}

/// What a batch derivation counted, for a proof and never for the interface.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub(crate) struct ScopeCounts {
    pub scopes: usize,
    pub listed_directories: usize,
    pub observed: usize,
    pub upserts: usize,
    pub deletions: usize,
}

fn absolute_of(root: &Path, relative: &str) -> PathBuf {
    let mut path = root.to_path_buf();
    for component in relative.split('/').filter(|part| !part.is_empty()) {
        path.push(component);
    }
    path
}

fn depth_of(relative: &str) -> u32 {
    relative.split('/').filter(|part| !part.is_empty()).count() as u32
}

fn name_of(relative: &str) -> &str {
    relative.rsplit('/').next().unwrap_or(relative)
}

fn parent_path(relative: &str) -> &str {
    relative.rsplit_once('/').map_or("", |(parent, _)| parent)
}

/// One stored row, as far as a scope needs it.
#[derive(Debug, Clone)]
struct Stored {
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

const STORED_COLUMNS: &str = "id, parent_id, name, relative_path, kind, depth, size_bytes, \
     modified_unix_ms, online_only, reparse_point, stable_key";

fn stored_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Stored> {
    Ok(Stored {
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
    })
}

fn stored_by_path(index: &Index, path: &str) -> rusqlite::Result<Option<Stored>> {
    index
        .connection
        .query_row(
            &format!("SELECT {STORED_COLUMNS} FROM nodes WHERE relative_path = ?1"),
            [path],
            stored_from_row,
        )
        .optional()
}

fn stored_by_key(index: &Index, key: &str) -> rusqlite::Result<Option<Stored>> {
    index
        .connection
        .query_row(
            &format!("SELECT {STORED_COLUMNS} FROM nodes WHERE stable_key = ?1"),
            [key],
            stored_from_row,
        )
        .optional()
}

fn root_id(index: &Index) -> Result<i64, ScopeRefusal> {
    index
        .connection
        .query_row(
            "SELECT value FROM schema_meta WHERE key = 'root_id'",
            [],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|_| ScopeRefusal::Store)?
        .and_then(|raw| raw.parse().ok())
        .ok_or(ScopeRefusal::Store)
}

/// Whether `directory` (relative, non-empty) is a safe scope: the Index holds it as a
/// directory, the disk holds a real directory at that path, and the object on disk is
/// the object the Index describes.
fn is_safe_scope(index: &Index, root: &Path, directory: &str) -> Result<bool, ScopeRefusal> {
    let Some(stored) = stored_by_path(index, directory).map_err(|_| ScopeRefusal::Store)? else {
        return Ok(false);
    };
    if stored.kind != NodeKind::Directory.as_str() {
        return Ok(false);
    }
    let absolute = absolute_of(root, directory);
    let Ok(metadata) = fs::symlink_metadata(&absolute) else {
        return Ok(false);
    };
    let observed = observe_entry(&absolute, Path::new(directory), &metadata);
    // The same object, by the same rule as everywhere else: the stable key.
    Ok(observed.kind == NodeKind::Directory
        && stored.stable_key.as_deref() == Some(observed.stable_key.as_str()))
}

/// Whether `path` is safe to **observe alone**: the Index has an entry at that path, the disk
/// has an entry at that path, and it is the same object (same stable key). If any of those is
/// false the entry appeared, disappeared or was replaced — a question about the directory that
/// lists it, not about the entry.
fn is_safe_point(index: &Index, root: &Path, path: &str) -> Result<bool, ScopeRefusal> {
    let Some(stored) = stored_by_path(index, path).map_err(|_| ScopeRefusal::Store)? else {
        return Ok(false);
    };
    let absolute = absolute_of(root, path);
    let Ok(metadata) = fs::symlink_metadata(&absolute) else {
        return Ok(false);
    };
    let observed = observe_entry(&absolute, Path::new(path), &metadata);
    Ok(stored.kind == observed.kind.as_str()
        && stored.stable_key.as_deref() == Some(observed.stable_key.as_str()))
}

/// Resolves what a burst asks for to **safe scopes**.
///
/// A [`ScopeRequest::List`] names the directory that lists a changed entry. If it is not
/// safe — the entry is inside a directory that was just removed, moved, replaced or never
/// indexed — the scope **rises to the nearest safe ancestor** (`DEC-0041` §3: "une disparition
/// remonte au parent existant"). A request that rises to the root has no smaller safe scope
/// and is refused as [`ScopeRefusal::RootScope`]. Distinct requests that rise to the same
/// ancestor become one scope: that is how many hints inside a newly created tree collapse
/// into a single re-listing.
///
/// A [`ScopeRequest::Point`] is kept when the entry is where the Index has it and is the same
/// object; otherwise the entry *is* a membership question, and it becomes a request for its
/// parent directory — which, for a top-level entry, is the root and a full verification.
pub(crate) fn resolve_scopes(
    index: &Index,
    root: &Path,
    requests: &[ScopeRequest],
) -> Result<ResolvedScopes, ScopeRefusal> {
    let mut lists: BTreeSet<String> = BTreeSet::new();
    let mut points: BTreeSet<String> = BTreeSet::new();
    let mut rise = |start: &str| -> Result<(), ScopeRefusal> {
        let mut directory = start;
        loop {
            if directory.is_empty() {
                return Err(ScopeRefusal::RootScope);
            }
            if is_safe_scope(index, root, directory)? {
                lists.insert(directory.to_string());
                return Ok(());
            }
            directory = parent_path(directory);
        }
    };
    for request in requests {
        match request {
            ScopeRequest::List(directory) => rise(directory)?,
            ScopeRequest::Point(path) => {
                if is_safe_point(index, root, path)? {
                    points.insert(path.clone());
                } else {
                    rise(parent_path(path))?;
                }
            }
        }
    }
    let mut lists: Vec<ResolvedScope> = lists
        .into_iter()
        .map(|path| ResolvedScope { path })
        .collect();
    // Shallow first, so a directory a scope enters is already known when a deeper
    // scope inside it comes up.
    lists.sort_by(|a, b| {
        depth_of(&a.path)
            .cmp(&depth_of(&b.path))
            .then_with(|| a.path.cmp(&b.path))
    });
    Ok(ResolvedScopes {
        lists,
        points: points.into_iter().collect(),
    })
}

/// Whether a child directory must be **entered**: it is unknown to the Index, or the
/// Index has it somewhere else (or as something else). A directory exactly where the
/// Index has it is left alone.
fn must_enter(index: &Index, key: &str, path: &str) -> Result<bool, ScopeRefusal> {
    Ok(
        match stored_by_key(index, key).map_err(|_| ScopeRefusal::Store)? {
            None => true,
            Some(stored) => {
                stored.relative_path != path || stored.kind != NodeKind::Directory.as_str()
            }
        },
    )
}

/// Reads the scopes: each scope directory itself, its direct entries, and the new or
/// moved directories among them, entered recursively.
pub(crate) fn scan_scopes(
    index: &Index,
    root: &Path,
    scopes: &ResolvedScopes,
    policy: &ExclusionPolicy,
    limits: ScopeLimits,
    is_cancelled: &dyn Fn() -> bool,
) -> Result<ScopeScan, ScopeRefusal> {
    let mut scan = ScopeScan::default();
    let mut seen_paths: HashSet<String> = HashSet::new();
    let mut listed: HashSet<String> = HashSet::new();

    for scope in &scopes.lists {
        // A directory an earlier scope already entered is fully observed.
        if listed.contains(&scope.path) {
            continue;
        }
        let absolute = absolute_of(root, &scope.path);
        let metadata = fs::symlink_metadata(&absolute).map_err(|_| ScopeRefusal::Incomplete)?;
        let observed = observe_entry(&absolute, Path::new(&scope.path), &metadata);
        // The scope directory was safe a moment ago; if it no longer is what it was,
        // the picture is not stable and a full verification will settle it.
        if observed.kind != NodeKind::Directory {
            return Err(ScopeRefusal::Incomplete);
        }
        if seen_paths.insert(scope.path.clone()) {
            scan.nodes.push(scoped(&scope.path, &observed));
        }

        let mut queue: VecDeque<String> = VecDeque::from([scope.path.clone()]);
        while let Some(directory) = queue.pop_front() {
            if !listed.insert(directory.clone()) {
                continue;
            }
            if is_cancelled() {
                return Err(ScopeRefusal::Cancelled);
            }
            scan.listed.push(directory.clone());
            let absolute_directory = absolute_of(root, &directory);
            let Ok(read_dir) = fs::read_dir(&absolute_directory) else {
                scan.diagnostics.push(ScanDiagnostic {
                    code: "directory_unreadable".to_string(),
                    relative_path: directory.clone(),
                });
                return Err(ScopeRefusal::Incomplete);
            };
            let mut entries = read_dir.filter_map(Result::ok).collect::<Vec<_>>();
            entries.sort_by_key(|entry| entry.file_name());
            for entry in entries {
                if is_cancelled() {
                    return Err(ScopeRefusal::Cancelled);
                }
                let file_name = entry.file_name();
                let relative = Path::new(&directory).join(&file_name);
                let relative_text = display_relative(&relative);
                // Decide from the parent listing before metadata is read. An
                // excluded entry is neither materialised nor descended into.
                if policy.excludes_text(&relative_text) {
                    continue;
                }
                let entry_path = entry.path();
                let Ok(child_metadata) = fs::symlink_metadata(&entry_path) else {
                    scan.diagnostics.push(ScanDiagnostic {
                        code: "metadata_unreadable".to_string(),
                        relative_path: relative_text,
                    });
                    return Err(ScopeRefusal::Incomplete);
                };
                let child = observe_entry(&entry_path, &relative, &child_metadata);
                if scan.nodes.len() >= limits.max_nodes {
                    return Err(ScopeRefusal::TooLarge);
                }
                let enter = child.kind == NodeKind::Directory
                    && must_enter(index, &child.stable_key, &relative_text)?;
                if seen_paths.insert(relative_text.clone()) {
                    scan.nodes.push(scoped(&relative_text, &child));
                }
                if enter {
                    queue.push_back(relative_text);
                }
            }
        }
    }
    // Entries observed alone: no listing, so nothing is entered and nothing is deleted from
    // their subtree — only their own row can move.
    for path in &scopes.points {
        if policy.excludes_text(path) {
            continue;
        }
        if seen_paths.contains(path) {
            continue;
        }
        if is_cancelled() {
            return Err(ScopeRefusal::Cancelled);
        }
        let absolute = absolute_of(root, path);
        let metadata = fs::symlink_metadata(&absolute).map_err(|_| ScopeRefusal::Incomplete)?;
        let observed = observe_entry(&absolute, Path::new(path), &metadata);
        if scan.nodes.len() >= limits.max_nodes {
            return Err(ScopeRefusal::TooLarge);
        }
        seen_paths.insert(path.clone());
        scan.nodes.push(scoped(path, &observed));
    }
    Ok(scan)
}

fn scoped(path: &str, observed: &crate::scanner::ObservedEntry) -> ScopedNode {
    ScopedNode {
        relative_path: path.to_string(),
        name: name_of(path).to_string(),
        kind: observed.kind,
        depth: depth_of(path),
        size_bytes: observed.size_bytes,
        modified_unix_ms: observed.modified_unix_ms,
        online_only: observed.online_only,
        reparse_point: observed.reparse_point,
        identity: NodeIdentity {
            node_id: 0,
            stable_key: observed.stable_key.clone(),
            provenance: observed.provenance,
        },
    }
}

/// Whether an observed entry and its stored row agree on every column a batch can
/// set, **the parent aside** (compared once every canonical id is known).
fn same_columns_but_parent(stored: &Stored, node: &ScopedNode) -> bool {
    stored.name == node.name
        && stored.relative_path == node.relative_path
        && NodeKind::from_db(&stored.kind) == node.kind
        && stored.depth == i64::from(node.depth)
        && stored.size_bytes == i64::try_from(node.size_bytes).unwrap_or(i64::MAX)
        && stored.modified_unix_ms == node.modified_unix_ms
        && stored.online_only == node.online_only
        && stored.reparse_point == node.reparse_point
}

/// Derives the **minimal** batch that takes the Index to what the scopes observed.
///
/// * an entry whose key is stored keeps its canonical id and enters the batch only if a
///   column (or its parent) differs;
/// * an entry whose key is unknown is a creation;
/// * a stored **direct child of a listed directory** whose key was not observed anywhere
///   is a deletion — with its whole stored subtree, except any descendant that was
///   observed elsewhere by its key (it moved, and its own upsert says where);
/// * a `PATH_FALLBACK` rename is a deletion plus a creation, with no special case: its
///   key is the path.
///
/// Only the scopes' own stored subtrees are compared. Everything outside them is not
/// read, so it cannot be deleted by accident.
pub(crate) fn reconcile_scopes(
    index: &Index,
    scan: &ScopeScan,
    detected_unix_ms: i64,
) -> Result<(UpdateBatch, ScopeCounts), ScopeRefusal> {
    let root = root_id(index)?;
    let store = |error: rusqlite::Error| {
        let _ = error;
        ScopeRefusal::Store
    };

    // -- One picture: every stable key once, every path once.
    let mut by_key: HashMap<&str, usize> = HashMap::with_capacity(scan.nodes.len());
    let mut by_path: HashMap<&str, usize> = HashMap::with_capacity(scan.nodes.len());
    for (position, node) in scan.nodes.iter().enumerate() {
        if by_key
            .insert(node.identity.stable_key.as_str(), position)
            .is_some()
            || by_path
                .insert(node.relative_path.as_str(), position)
                .is_some()
        {
            return Err(ScopeRefusal::Incoherent);
        }
    }

    // -- Stored counterpart of every observed entry, by stable key.
    let mut stored: Vec<Option<Stored>> = Vec::with_capacity(scan.nodes.len());
    for node in &scan.nodes {
        let row = stored_by_key(index, &node.identity.stable_key).map_err(store)?;
        if row.as_ref().is_some_and(|found| found.id == root) {
            return Err(ScopeRefusal::Incoherent);
        }
        stored.push(row);
    }

    // -- Deletions: stored children of a listed directory that nobody observed.
    let mut deletions: Vec<i64> = Vec::new();
    let mut deleted: HashSet<i64> = HashSet::new();
    let mut pending: Vec<i64> = Vec::new();
    for directory in &scan.listed {
        let Some(&position) = by_path.get(directory.as_str()) else {
            continue;
        };
        let Some(row) = &stored[position] else {
            continue; // a new directory: nothing stored under it
        };
        for child in stored_children(index, row.id).map_err(store)? {
            let key = child.1.ok_or(ScopeRefusal::NotStamped)?;
            if !by_key.contains_key(key.as_str()) && deleted.insert(child.0) {
                deletions.push(child.0);
                pending.push(child.0);
            }
        }
    }
    while let Some(id) = pending.pop() {
        for child in stored_children(index, id).map_err(store)? {
            let key = child.1.ok_or(ScopeRefusal::NotStamped)?;
            // Observed elsewhere: it moved, and its own upsert carries its new place.
            if by_key.contains_key(key.as_str()) {
                continue;
            }
            if deleted.insert(child.0) {
                deletions.push(child.0);
                pending.push(child.0);
            }
        }
    }
    deletions.sort_unstable();

    // -- Upserts: what is new, and what differs (the parent included).
    let canonical = |position: usize| stored[position].as_ref().map(|row| row.id);
    let mut upserts: Vec<ObservedNode> = Vec::new();
    for (position, node) in scan.nodes.iter().enumerate() {
        let parent_text = parent_path(&node.relative_path);
        // The parent is another observed entry of this scan, or — for a scope's own
        // top directory — the row the Index already has above it.
        let (parent, parent_canonical): (ParentRef, Option<i64>) = match by_path.get(parent_text) {
            Some(&parent_position) => match canonical(parent_position) {
                Some(existing) => (ParentRef::Existing(existing), Some(existing)),
                // A parent the Index does not have is itself a creation, hence an
                // upsert of this very batch: its token is its position.
                None => (ParentRef::InBatch(parent_position as i64 + 1), None),
            },
            None => {
                let top = stored[position].as_ref().ok_or(ScopeRefusal::Incoherent)?;
                let above = top.parent_id.ok_or(ScopeRefusal::Incoherent)?;
                (ParentRef::Existing(above), Some(above))
            }
        };
        let unchanged = match &stored[position] {
            Some(row) => {
                same_columns_but_parent(row, node)
                    && parent_canonical.is_some()
                    && row.parent_id == parent_canonical
            }
            None => false,
        };
        if unchanged {
            continue;
        }
        upserts.push(ObservedNode {
            identity: NodeIdentity {
                node_id: position as i64 + 1,
                stable_key: node.identity.stable_key.clone(),
                provenance: node.identity.provenance,
            },
            parent,
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

    let counts = ScopeCounts {
        scopes: 0,
        listed_directories: scan.listed.len(),
        observed: scan.nodes.len(),
        upserts: upserts.len(),
        deletions: deletions.len(),
    };
    Ok((
        UpdateBatch {
            upserts,
            deletions,
            // A scope never contains the root: its own metadata is a full
            // verification's business.
            root: None,
            detected_unix_ms,
        },
        counts,
    ))
}

/// A row's direct children, as `(id, stable_key)`.
fn stored_children(index: &Index, parent_id: i64) -> rusqlite::Result<Vec<(i64, Option<String>)>> {
    let mut statement = index
        .connection
        .prepare_cached("SELECT id, stable_key FROM nodes WHERE parent_id = ?1")?;
    statement
        .query_map([parent_id], |row| Ok((row.get(0)?, row.get(1)?)))?
        .collect()
}
