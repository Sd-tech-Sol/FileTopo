//! `TASK-0040` — the incremental application kernel (`DEC-0038`, `DEC-0010 U-B`).
//!
//! The kernel is proven against **the pipeline it must agree with**, not only
//! against expectations written next to it:
//!
//! * a small **world model** (a tree of items with a uid, a parent, a name and
//!   either a stable key or a `PATH_FALLBACK` identity derived from the path)
//!   is turned into a *scan-shaped* snapshot (`Snap`: nodes + identities, the
//!   exact shape `scan_tree_controlled` returns);
//! * **reference `B`** publishes that snapshot with the existing full-scan path,
//!   `Index::publish_with_identity`;
//! * **kernel `A`** receives a batch that a test-side *producer*
//!   (`derive_batch`) derives from two snapshots — the job the future `W-B`
//!   reconciler will do — and applies it through `Index::apply_update_batch`;
//! * `assert_parity` then compares everything a full scan reconstructs:
//!   canonical ids, parents, names, paths, depths, `child_count`, kinds,
//!   metadata, stable keys, `node_count`, `root_id`, `next_node_id`, and the
//!   journal events of the step.
//!
//! **Intentional differences, stated rather than masked:** the *revision* — `B`
//! advances it on every publication, `A` only when the batch changes something —
//! and the *event ids*, which are the same sequence only because both journals
//! start equal. Both are asserted explicitly, not skipped.
//!
//! Every tree is created by the test that reads it. **No personal brain, no
//! personal folder.**

use super::change_journal_tests::{all_events, in_memory};
use crate::change_journal::{self as cj, ChangeNature, StoredEvent};
use crate::domain::{NodeDto, NodeKind};
use crate::hierarchy::{self, HierarchyError};
use crate::identity::{IdentityProvenance, NodeIdentity};
use crate::incremental::{
    ApplyOutcome, BatchError, KEYED_STATEMENTS, ObservedNode, ParentRef, RootObservation,
    UpdateBatch,
};
use crate::index::Index;
use crate::node_filter::{NodeFilter, StateFilter};
use std::collections::{HashMap, HashSet};

// -- The world model -----------------------------------------------------------

#[derive(Clone, Debug)]
struct Item {
    uid: u32,
    parent: Option<u32>,
    name: String,
    kind: NodeKind,
    size: u64,
    mtime: Option<i64>,
    online_only: bool,
    /// `Some(key)` — a `SYSTEM` identity that survives a rename or a move.
    /// `None` — `PATH_FALLBACK`: the key is derived from the path, so it changes
    /// with it, which is exactly why the producer must send delete + create.
    system_key: Option<String>,
}

#[derive(Clone, Debug)]
struct World {
    items: Vec<Item>,
    next_uid: u32,
}

struct Placed {
    path: String,
    depth: u32,
    key: String,
    provenance: IdentityProvenance,
}

fn join(parent: &str, name: &str) -> String {
    if parent.is_empty() {
        name.to_string()
    } else {
        format!("{parent}/{name}")
    }
}

impl World {
    fn new() -> Self {
        Self {
            items: vec![Item {
                uid: 0,
                parent: None,
                name: "racine".into(),
                kind: NodeKind::Root,
                size: 0,
                mtime: None,
                online_only: false,
                system_key: Some("K-root".into()),
            }],
            next_uid: 1,
        }
    }

    fn add(&mut self, parent: u32, name: &str, kind: NodeKind, key: Option<&str>) -> u32 {
        let uid = self.next_uid;
        self.next_uid += 1;
        self.items.push(Item {
            uid,
            parent: Some(parent),
            name: name.to_string(),
            kind,
            size: 0,
            mtime: None,
            online_only: false,
            system_key: key.map(str::to_string),
        });
        uid
    }

    fn dir(&mut self, parent: u32, name: &str, key: &str) -> u32 {
        self.add(parent, name, NodeKind::Directory, Some(key))
    }

    fn file(&mut self, parent: u32, name: &str, key: &str, size: u64, mtime: i64) -> u32 {
        let uid = self.add(parent, name, NodeKind::File, Some(key));
        let item = self.item_mut(uid);
        item.size = size;
        item.mtime = Some(mtime);
        uid
    }

    fn fallback_file(&mut self, parent: u32, name: &str, size: u64, mtime: i64) -> u32 {
        let uid = self.add(parent, name, NodeKind::File, None);
        let item = self.item_mut(uid);
        item.size = size;
        item.mtime = Some(mtime);
        uid
    }

    fn item(&self, uid: u32) -> &Item {
        self.items.iter().find(|item| item.uid == uid).expect("uid")
    }

    fn item_mut(&mut self, uid: u32) -> &mut Item {
        self.items
            .iter_mut()
            .find(|item| item.uid == uid)
            .expect("uid")
    }

    fn children(&self, uid: u32) -> Vec<u32> {
        self.items
            .iter()
            .filter(|item| item.parent == Some(uid))
            .map(|item| item.uid)
            .collect()
    }

    fn subtree(&self, uid: u32) -> HashSet<u32> {
        let mut found = HashSet::from([uid]);
        let mut frontier = vec![uid];
        while let Some(next) = frontier.pop() {
            for child in self.children(next) {
                if found.insert(child) {
                    frontier.push(child);
                }
            }
        }
        found
    }

    fn remove_subtree(&mut self, uid: u32) {
        let gone = self.subtree(uid);
        self.items.retain(|item| !gone.contains(&item.uid));
    }

    /// Path, depth, key and provenance of every item.
    fn placed(&self) -> HashMap<u32, Placed> {
        fn place(world: &World, uid: u32, memo: &mut HashMap<u32, (String, u32)>) -> (String, u32) {
            if let Some(found) = memo.get(&uid) {
                return found.clone();
            }
            let item = world.item(uid);
            let result = match item.parent {
                None => (String::new(), 0),
                Some(parent) => {
                    let (path, depth) = place(world, parent, memo);
                    (join(&path, &item.name), depth + 1)
                }
            };
            memo.insert(uid, result.clone());
            result
        }
        let mut memo = HashMap::new();
        self.items
            .iter()
            .map(|item| {
                let (path, depth) = place(self, item.uid, &mut memo);
                let (key, provenance) = match &item.system_key {
                    Some(key) => (key.clone(), IdentityProvenance::System),
                    None => (format!("PF:{path}"), IdentityProvenance::PathFallback),
                };
                (
                    item.uid,
                    Placed {
                        path,
                        depth,
                        key,
                        provenance,
                    },
                )
            })
            .collect()
    }

    /// The items in **scan order**: the root first, then breadth-first, a
    /// parent always before its children — the order `scan_tree_controlled`
    /// emits, and the one the full-scan publication relies on.
    fn scan_order(&self) -> Vec<&Item> {
        let mut ordered = vec![self.item(0)];
        let mut cursor = 0;
        while cursor < ordered.len() {
            let uid = ordered[cursor].uid;
            ordered.extend(self.children(uid).into_iter().map(|child| self.item(child)));
            cursor += 1;
        }
        ordered
    }

    fn snap(&self) -> Snap {
        let placed = self.placed();
        let ordered = self.scan_order();
        let position: HashMap<u32, i64> = ordered
            .iter()
            .enumerate()
            .map(|(index, item)| (item.uid, index as i64 + 1))
            .collect();
        let mut counts: HashMap<u32, u32> = HashMap::new();
        for item in &self.items {
            if let Some(parent) = item.parent {
                *counts.entry(parent).or_default() += 1;
            }
        }
        let mut nodes = Vec::new();
        let mut identities = Vec::new();
        for item in ordered {
            let here = &placed[&item.uid];
            let id = position[&item.uid];
            nodes.push(NodeDto {
                id,
                parent_id: item.parent.map(|parent| position[&parent]),
                name: item.name.clone(),
                relative_path: here.path.clone(),
                kind: item.kind,
                depth: here.depth,
                size_bytes: item.size,
                modified_unix_ms: item.mtime,
                online_only: item.online_only,
                reparse_point: false,
                child_count: counts.get(&item.uid).copied().unwrap_or(0),
                seen: false,
            });
            identities.push(NodeIdentity {
                node_id: id,
                stable_key: here.key.clone(),
                provenance: here.provenance,
            });
        }
        Snap { nodes, identities }
    }
}

/// The shape `scan_tree_controlled` returns: nodes with **temporary** ids and
/// one identity per node, keyed by that same temporary id.
struct Snap {
    nodes: Vec<NodeDto>,
    identities: Vec<NodeIdentity>,
}

impl Snap {
    fn of_scan(scan: &crate::scanner::ScanResult) -> Self {
        Self {
            nodes: scan.nodes.clone(),
            identities: scan.identities.clone(),
        }
    }

    fn identity(&self, id: i64) -> &NodeIdentity {
        self.identities
            .iter()
            .find(|identity| identity.node_id == id)
            .expect("identity for every node")
    }

    fn key(&self, id: i64) -> &str {
        &self.identity(id).stable_key
    }
}

fn publish_snap(index: &mut Index, snap: &Snap) {
    index
        .publish_with_identity(
            &snap.nodes,
            &snap.identities,
            &[("built_unix_ms", "1700000000000".to_string())],
            &[],
        )
        .expect("reference publication");
}

fn canonical_of_key(index: &Index, key: &str) -> i64 {
    index
        .connection
        .query_row("SELECT id FROM nodes WHERE stable_key = ?1", [key], |row| {
            row.get(0)
        })
        .unwrap_or_else(|_| panic!("no node with key {key:?}"))
}

/// The test-side **producer**: what the reconciler will do. From two
/// scan-shaped snapshots it derives a batch against `index`, which holds the
/// *old* state. An item is an upsert when its key is new, or when anything a
/// row stores differs — which includes every descendant of a moved or renamed
/// directory, because its path changed (the complete-subtree rule).
/// A key present before and absent now is a deletion. The root is never sent.
fn derive_batch(index: &Index, old: &Snap, new: &Snap, detected_unix_ms: i64) -> UpdateBatch {
    let old_by_key: HashMap<&str, &NodeDto> = old
        .nodes
        .iter()
        .map(|node| (old.key(node.id), node))
        .collect();
    let new_keys: HashSet<&str> = new.nodes.iter().map(|node| new.key(node.id)).collect();

    let mut upserts: HashSet<i64> = HashSet::new();
    for node in &new.nodes {
        let Some(parent) = node.parent_id else {
            continue; // the root is never part of a batch
        };
        let unchanged = old_by_key.get(new.key(node.id)).is_some_and(|before| {
            let same_parent = before
                .parent_id
                .is_some_and(|old_parent| old.key(old_parent) == new.key(parent));
            same_parent
                && before.name == node.name
                && before.kind == node.kind
                && before.size_bytes == node.size_bytes
                && before.modified_unix_ms == node.modified_unix_ms
                && before.relative_path == node.relative_path
                && before.depth == node.depth
                && before.online_only == node.online_only
                && before.reparse_point == node.reparse_point
        });
        if !unchanged {
            upserts.insert(node.id);
        }
    }

    let root_of = |snap: &Snap| {
        snap.nodes
            .iter()
            .find(|node| node.parent_id.is_none())
            .map(|node| RootObservation {
                modified_unix_ms: node.modified_unix_ms,
                online_only: node.online_only,
                reparse_point: node.reparse_point,
            })
    };
    let mut batch = UpdateBatch {
        detected_unix_ms,
        // Sent whenever the root's own metadata moved; the kernel decides
        // whether that is a change.
        root: root_of(new).filter(|observed| root_of(old) != Some(*observed)),
        ..UpdateBatch::default()
    };
    for node in &new.nodes {
        if !upserts.contains(&node.id) {
            continue;
        }
        let parent_id = node.parent_id.expect("a non-root upsert has a parent");
        let parent = if upserts.contains(&parent_id) {
            ParentRef::InBatch(parent_id)
        } else {
            ParentRef::Existing(canonical_of_key(index, new.key(parent_id)))
        };
        let identity = new.identity(node.id).clone();
        batch.upserts.push(ObservedNode {
            identity,
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
    for node in &old.nodes {
        if node.parent_id.is_some() && !new_keys.contains(old.key(node.id)) {
            batch
                .deletions
                .push(canonical_of_key(index, old.key(node.id)));
        }
    }
    batch
}

// -- Observation of an Index ---------------------------------------------------

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
struct NodeRow {
    id: i64,
    parent: Option<i64>,
    name: String,
    path: String,
    kind: String,
    depth: i64,
    size: i64,
    mtime: Option<i64>,
    online_only: bool,
    reparse_point: bool,
    child_count: i64,
    key: Option<String>,
    provenance: Option<String>,
}

fn dump_nodes(index: &Index) -> Vec<NodeRow> {
    let mut statement = index
        .connection
        .prepare(
            "SELECT id, parent_id, name, relative_path, kind, depth, size_bytes,
                    modified_unix_ms, online_only, reparse_point, child_count,
                    stable_key, identity_provenance
             FROM nodes ORDER BY id",
        )
        .unwrap();
    statement
        .query_map([], |row| {
            Ok(NodeRow {
                id: row.get(0)?,
                parent: row.get(1)?,
                name: row.get(2)?,
                path: row.get(3)?,
                kind: row.get(4)?,
                depth: row.get(5)?,
                size: row.get(6)?,
                mtime: row.get(7)?,
                online_only: row.get(8)?,
                reparse_point: row.get(9)?,
                child_count: row.get(10)?,
                key: row.get(11)?,
                provenance: row.get(12)?,
            })
        })
        .unwrap()
        .collect::<Result<_, _>>()
        .unwrap()
}

fn meta(index: &Index, key: &str) -> Option<String> {
    index
        .connection
        .query_row("SELECT value FROM schema_meta WHERE key = ?1", [key], |r| {
            r.get(0)
        })
        .ok()
}

fn revision(index: &Index) -> u64 {
    index.identity().unwrap().revision
}

type EventRow = (
    i64,
    String,
    i64,
    String,
    Option<String>,
    Option<String>,
    Option<String>,
    Option<String>,
    Option<i64>,
    Option<i64>,
);

/// The events written after `after_event_id`, **without** their event id or
/// revision — the two things that legitimately differ between `A` and `B`.
fn events_after(index: &Index, after_event_id: i64) -> Vec<EventRow> {
    let mut statement = index
        .connection
        .prepare(
            "SELECT ordinal, nature, node_id, node_kind, old_name, new_name,
                    old_relative_path, new_relative_path, old_parent_id, new_parent_id
             FROM change_events WHERE event_id > ?1 ORDER BY event_id",
        )
        .unwrap();
    statement
        .query_map([after_event_id], |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
                row.get(5)?,
                row.get(6)?,
                row.get(7)?,
                row.get(8)?,
                row.get(9)?,
            ))
        })
        .unwrap()
        .collect::<Result<_, _>>()
        .unwrap()
}

fn newest_event(index: &Index) -> i64 {
    index
        .connection
        .query_row(
            "SELECT COALESCE(MAX(event_id), 0) FROM change_events",
            [],
            |row| row.get(0),
        )
        .unwrap()
}

/// Every persistent table, in a stable order, as one string: the exact-state
/// witness for "a refused or rolled-back batch changes nothing".
fn dump_everything(index: &Index) -> String {
    let watermark_and_meta: Vec<(String, String)> = {
        let mut statement = index
            .connection
            .prepare("SELECT key, value FROM schema_meta ORDER BY key")
            .unwrap();
        statement
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
            .unwrap()
            .collect::<Result<_, _>>()
            .unwrap()
    };
    let events: Vec<Vec<String>> = {
        let mut statement = index
            .connection
            .prepare(
                "SELECT event_id, detected_revision, ordinal, nature, node_id, node_kind,
                        old_name, new_name, old_relative_path, new_relative_path,
                        old_parent_id, new_parent_id, detected_unix_ms
                 FROM change_events ORDER BY event_id",
            )
            .unwrap();
        statement
            .query_map([], |row| {
                (0..13)
                    .map(|column| {
                        row.get::<_, rusqlite::types::Value>(column)
                            .map(|value| format!("{value:?}"))
                    })
                    .collect::<Result<Vec<_>, _>>()
            })
            .unwrap()
            .collect::<Result<_, _>>()
            .unwrap()
    };
    let acknowledged: Vec<i64> = {
        let mut statement = index
            .connection
            .prepare("SELECT event_id FROM seen_change_events ORDER BY event_id")
            .unwrap();
        statement
            .query_map([], |row| row.get(0))
            .unwrap()
            .collect::<Result<_, _>>()
            .unwrap()
    };
    let diagnostics: Vec<(String, String)> = {
        let mut statement = index
            .connection
            .prepare("SELECT relative_path, code FROM node_diagnostics ORDER BY relative_path")
            .unwrap();
        statement
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
            .unwrap()
            .collect::<Result<_, _>>()
            .unwrap()
    };
    format!(
        "{:?}\n{:?}\n{:?}\n{:?}\n{:?}",
        dump_nodes(index),
        watermark_and_meta,
        events,
        acknowledged,
        diagnostics
    )
}

fn total_changes(index: &Index) -> u64 {
    index.connection.total_changes()
}

/// After every applied batch: the durable counters agree with the rows, with no
/// scan of the corpus in the kernel — the *test* is allowed to recount.
fn assert_invariants(index: &Index) {
    let nodes = dump_nodes(index);
    assert_eq!(
        meta(index, "node_count").unwrap().parse::<usize>().unwrap(),
        nodes.len(),
        "node_count is exact"
    );
    assert!(
        hierarchy::child_count_mismatches(&index.connection, 10)
            .unwrap()
            .is_empty(),
        "child_count is exact for every parent"
    );
    let ids: HashSet<i64> = nodes.iter().map(|row| row.id).collect();
    let root = meta(index, "root_id").unwrap().parse::<i64>().unwrap();
    assert!(ids.contains(&root));
    let next: i64 = meta(index, "next_node_id").unwrap().parse().unwrap();
    assert!(
        ids.iter().all(|id| *id < next),
        "next_node_id is above every live id and only ever grows"
    );
    for row in &nodes {
        match row.parent {
            None => assert_eq!(row.id, root, "only the root is parentless"),
            Some(parent) => {
                assert!(ids.contains(&parent), "no orphan: {} -> {parent}", row.id)
            }
        }
    }
    // Depth and path are consistent with the parent, for every row.
    let by_id: HashMap<i64, &NodeRow> = nodes.iter().map(|row| (row.id, row)).collect();
    for row in &nodes {
        if let Some(parent) = row.parent {
            let parent_row = by_id[&parent];
            assert_eq!(row.depth, parent_row.depth + 1, "depth of {}", row.path);
            assert_eq!(
                row.path,
                join(&parent_row.path, &row.name),
                "path of {}",
                row.path
            );
        }
    }
}

fn apply(index: &mut Index, batch: &UpdateBatch) -> ApplyOutcome {
    let outcome = index.apply_update_batch(batch).expect("batch applies");
    assert_invariants(index);
    outcome
}

/// A refused batch changes **nothing**: not a row, not the journal, not the
/// revision, not one counted change.
fn assert_refused(index: &mut Index, batch: &UpdateBatch) -> BatchError {
    let before = dump_everything(index);
    let changes = total_changes(index);
    let revision_before = revision(index);
    let error = index
        .apply_update_batch(batch)
        .expect_err("the batch must be refused");
    assert_eq!(dump_everything(index), before, "a refusal writes nothing");
    assert_eq!(
        total_changes(index),
        changes,
        "not even a rolled-back write"
    );
    assert_eq!(revision(index), revision_before);
    error
}

/// One step of the parity harness: `A` applies a derived batch, `B` publishes
/// the new snapshot in full, and everything a full scan reconstructs is equal.
struct Pair {
    a: Index,
    b: Index,
    world: World,
    step: i64,
}

impl Pair {
    fn new(world: World) -> Self {
        let mut a = in_memory();
        let mut b = in_memory();
        publish_snap(&mut a, &world.snap());
        publish_snap(&mut b, &world.snap());
        let pair = Self {
            a,
            b,
            world,
            step: 0,
        };
        pair.assert_parity("baseline");
        pair
    }

    /// Applies `mutate` to the world, then advances `A` by a batch and `B` by a
    /// full publication. Returns the kernel's outcome.
    fn step(&mut self, label: &str, mutate: impl FnOnce(&mut World)) -> ApplyOutcome {
        let old = self.world.snap();
        mutate(&mut self.world);
        let new = self.world.snap();
        self.step += 1;
        let batch = derive_batch(&self.a, &old, &new, 1_700_000_000_000 + self.step);

        let a_events = newest_event(&self.a);
        let b_events = newest_event(&self.b);
        let a_revision = revision(&self.a);
        let b_revision = revision(&self.b);

        let outcome = apply(&mut self.a, &batch);
        publish_snap(&mut self.b, &new);

        // Intentional difference #1: the revision. `B` always advances; `A`
        // advances by exactly one for an effective batch and not at all for a
        // no-op.
        assert_eq!(revision(&self.b), b_revision + 1, "{label}: full publish");
        assert_eq!(
            revision(&self.a),
            a_revision + u64::from(outcome.applied),
            "{label}: one revision per effective batch"
        );

        // The events of the step are identical, in the same order.
        assert_eq!(
            events_after(&self.a, a_events),
            events_after(&self.b, b_events),
            "{label}: the journal events of the step"
        );
        self.assert_parity(label);
        outcome
    }

    fn assert_parity(&self, label: &str) {
        assert_eq!(
            dump_nodes(&self.a),
            dump_nodes(&self.b),
            "{label}: every row equals the full-scan reference"
        );
        for key in ["node_count", "root_id", "next_node_id"] {
            assert_eq!(meta(&self.a, key), meta(&self.b, key), "{label}: {key}");
        }
        assert_eq!(
            events_after(&self.a, 0),
            events_after(&self.b, 0),
            "{label}: the whole journal"
        );
        assert_invariants(&self.a);
    }
}

// -- Fixtures ------------------------------------------------------------------

/// `racine` ▸ `a/` (▸ `a/f.txt`, `a/n/` ▸ `a/n/deep.txt`), `b/`, `g.txt`.
fn small_world() -> (World, [u32; 7]) {
    let mut world = World::new();
    let a = world.dir(0, "a", "K-a");
    let f = world.file(a, "f.txt", "K-f", 10, 100);
    let n = world.dir(a, "n", "K-n");
    let deep = world.file(n, "deep.txt", "K-deep", 5, 50);
    let b = world.dir(0, "b", "K-b");
    let g = world.file(0, "g.txt", "K-g", 20, 200);
    (world, [a, f, n, deep, b, g, 0])
}

/// A wide index: `directories` directories under the root, `per` files in each.
fn wide_world(directories: u32, per: u32) -> (World, Vec<u32>) {
    let mut world = World::new();
    let mut dirs = Vec::new();
    for d in 0..directories {
        let uid = world.dir(0, &format!("d{d:03}"), &format!("K-d{d:03}"));
        dirs.push(uid);
        for f in 0..per {
            world.file(
                uid,
                &format!("f{f:03}.txt"),
                &format!("K-d{d:03}-f{f:03}"),
                u64::from(f) + 1,
                1_000 + i64::from(f),
            );
        }
    }
    (world, dirs)
}

fn events(index: &Index) -> Vec<StoredEvent> {
    all_events(index, &[])
}

fn natures(events: &[StoredEvent]) -> Vec<(ChangeNature, i64)> {
    let mut shape: Vec<_> = events.iter().map(|e| (e.nature, e.node_id)).collect();
    shape.sort();
    shape
}

// -- Application: the eighteen functional points of TASK-0040 §G --------------

#[test]
fn ten_creations_on_a_large_index_write_only_the_new_rows() {
    let (world, dirs) = wide_world(20, 50);
    let mut pair = Pair::new(world);
    let count = dump_nodes(&pair.a).len();
    assert_eq!(count, 1 + 20 + 20 * 50);
    let before = dump_nodes(&pair.a);
    let changes = total_changes(&pair.a);

    let outcome = pair.step("ten creations", |world| {
        for (n, dir) in dirs.iter().take(10).enumerate() {
            world.file(*dir, &format!("neuf{n}.txt"), &format!("K-neuf{n}"), 7, 9);
        }
    });
    assert!(outcome.applied);
    assert_eq!(outcome.created, 10);
    assert_eq!(outcome.rewritten, 0);
    assert_eq!(outcome.deleted, 0);
    assert_eq!(outcome.journal.created, 10);
    assert_eq!(outcome.journal.total, 10);

    // Exactly ten new rows and the ten parents whose `child_count` moved: no
    // other row differs from what it was.
    let after = dump_nodes(&pair.a);
    let known: HashSet<&NodeRow> = before.iter().collect();
    let differing: Vec<i64> = after
        .iter()
        .filter(|row| !known.contains(row))
        .map(|row| row.id)
        .collect();
    assert_eq!(differing.len(), 20, "10 new rows + 10 parents' child_count");
    let parents: HashSet<i64> = after
        .iter()
        .filter(|row| row.name.starts_with("neuf"))
        .map(|row| row.parent.unwrap())
        .collect();
    assert_eq!(parents.len(), 10);

    // …and SQLite agrees: 10 rows, 10 counts, 2 metadata keys, 10 events,
    // 1 revision — a handful of dozens, on an index of 1 021 nodes.
    let written = total_changes(&pair.a) - changes;
    assert!(
        written <= 40,
        "the kernel wrote {written} rows for 10 creations on {count} nodes"
    );
    assert_eq!(pair.a.identity().unwrap().revision, 2);
}

#[test]
fn ten_modifications_keep_every_id_and_journal_ten_modified_events() {
    let (world, dirs) = wide_world(4, 20);
    let mut pair = Pair::new(world);
    let ids_before: Vec<i64> = dump_nodes(&pair.a).iter().map(|row| row.id).collect();
    let outcome = pair.step("ten modifications", |world| {
        let victims: Vec<u32> = dirs
            .iter()
            .flat_map(|dir| world.children(*dir))
            .take(10)
            .collect();
        for uid in victims {
            let item = world.item_mut(uid);
            item.size += 100;
            item.mtime = Some(777);
        }
    });
    assert_eq!(
        (outcome.created, outcome.rewritten, outcome.deleted),
        (0, 10, 0)
    );
    assert_eq!(outcome.journal.modified, 10);
    assert_eq!(outcome.journal.total, 10);
    let ids_after: Vec<i64> = dump_nodes(&pair.a).iter().map(|row| row.id).collect();
    assert_eq!(
        ids_before, ids_after,
        "no id is reassigned by a modification"
    );
    assert_eq!(
        events(&pair.a)
            .iter()
            .filter(|e| e.nature == ChangeNature::Modified)
            .count(),
        10
    );
}

#[test]
fn a_system_rename_keeps_the_id_and_journals_one_renamed_event() {
    let (world, [_, f, ..]) = small_world();
    let mut pair = Pair::new(world);
    let id = canonical_of_key(&pair.a, "K-f");
    let outcome = pair.step("rename", |world| {
        world.item_mut(f).name = "renomme.txt".into()
    });
    assert_eq!(canonical_of_key(&pair.a, "K-f"), id, "the id survives");
    assert_eq!(
        (outcome.created, outcome.rewritten, outcome.deleted),
        (0, 1, 0)
    );
    assert_eq!(outcome.journal.renamed, 1);
    assert_eq!(outcome.journal.total, 1);
    let event = &events(&pair.a)[0];
    assert_eq!(event.nature, ChangeNature::Renamed);
    assert_eq!(event.node_id, id);
    assert_eq!(event.old_name.as_deref(), Some("f.txt"));
    assert_eq!(event.new_name.as_deref(), Some("renomme.txt"));
    assert_eq!(event.old_relative_path.as_deref(), Some("a/f.txt"));
    assert_eq!(event.new_relative_path.as_deref(), Some("a/renomme.txt"));
}

#[test]
fn a_system_move_keeps_the_id_and_journals_one_moved_event() {
    let (world, [_, f, _, _, b, ..]) = small_world();
    let mut pair = Pair::new(world);
    let id = canonical_of_key(&pair.a, "K-f");
    let old_parent = canonical_of_key(&pair.a, "K-a");
    let new_parent = canonical_of_key(&pair.a, "K-b");
    let outcome = pair.step("move", |world| world.item_mut(f).parent = Some(b));
    assert_eq!(canonical_of_key(&pair.a, "K-f"), id);
    assert_eq!(outcome.journal.moved, 1);
    assert_eq!(outcome.journal.total, 1);
    let event = &events(&pair.a)[0];
    assert_eq!(event.nature, ChangeNature::Moved);
    assert_eq!(event.old_parent_id, Some(old_parent));
    assert_eq!(event.new_parent_id, Some(new_parent));
    assert_eq!(event.new_relative_path.as_deref(), Some("b/f.txt"));
    // child_count: the old parent lost one, the new parent gained one.
    let count = |key: &str| {
        dump_nodes(&pair.a)
            .iter()
            .find(|row| row.key.as_deref() == Some(key))
            .unwrap()
            .child_count
    };
    assert_eq!(count("K-a"), 1, "a/ keeps n/ only");
    assert_eq!(count("K-b"), 1, "b/ gained f.txt");
}

#[test]
fn a_rename_and_a_move_in_one_batch_journal_two_events_as_task_0037_does() {
    let (world, [_, f, _, _, b, ..]) = small_world();
    let mut pair = Pair::new(world);
    let id = canonical_of_key(&pair.a, "K-f");
    let outcome = pair.step("rename + move", |world| {
        let item = world.item_mut(f);
        item.name = "autre.txt".into();
        item.parent = Some(b);
    });
    assert_eq!((outcome.journal.renamed, outcome.journal.moved), (1, 1));
    assert_eq!(outcome.journal.total, 2);
    assert_eq!(
        natures(&events(&pair.a)),
        vec![(ChangeNature::Renamed, id), (ChangeNature::Moved, id)]
    );
    // Both events describe the path before and after the *whole* batch.
    for event in events(&pair.a) {
        assert_eq!(event.old_relative_path.as_deref(), Some("a/f.txt"));
        assert_eq!(event.new_relative_path.as_deref(), Some("b/autre.txt"));
    }
}

#[test]
fn a_path_fallback_rename_is_a_delete_and_a_create_with_a_new_never_recycled_id() {
    let mut world = World::new();
    let dir = world.dir(0, "docs", "K-docs");
    let file = world.fallback_file(dir, "avant.txt", 3, 30);
    let mut pair = Pair::new(world);
    let old_id = canonical_of_key(&pair.a, "PF:docs/avant.txt");
    let next_before: i64 = meta(&pair.a, "next_node_id").unwrap().parse().unwrap();

    let outcome = pair.step("fallback rename", |world| {
        world.item_mut(file).name = "apres.txt".into()
    });
    assert_eq!((outcome.created, outcome.deleted), (1, 1));
    assert_eq!(outcome.journal.created, 1);
    assert_eq!(outcome.journal.deleted, 1);
    assert_eq!(
        outcome.journal.renamed, 0,
        "a fallback never correlates a rename"
    );
    let new_id = canonical_of_key(&pair.a, "PF:docs/apres.txt");
    assert_ne!(new_id, old_id);
    assert_eq!(
        new_id, next_before,
        "the new object takes the next counter value"
    );
    assert!(
        pair.a
            .connection
            .query_row("SELECT COUNT(*) FROM nodes WHERE id = ?1", [old_id], |r| {
                r.get::<_, i64>(0)
            })
            .unwrap()
            == 0
    );
}

#[test]
fn a_batch_may_not_pretend_a_path_fallback_key_was_renamed_or_moved() {
    let mut world = World::new();
    let dir = world.dir(0, "docs", "K-docs");
    world.fallback_file(dir, "avant.txt", 3, 30);
    let mut index = in_memory();
    publish_snap(&mut index, &world.snap());
    let parent = canonical_of_key(&index, "K-docs");
    let forged = UpdateBatch {
        upserts: vec![ObservedNode {
            identity: NodeIdentity {
                node_id: 1,
                stable_key: "PF:docs/avant.txt".into(),
                provenance: IdentityProvenance::PathFallback,
            },
            parent: ParentRef::Existing(parent),
            name: "apres.txt".into(),
            relative_path: "docs/apres.txt".into(),
            kind: NodeKind::File,
            depth: 2,
            size_bytes: 3,
            modified_unix_ms: Some(30),
            online_only: false,
            reparse_point: false,
        }],
        deletions: vec![],
        root: None,
        detected_unix_ms: 1,
    };
    assert!(matches!(
        assert_refused(&mut index, &forged),
        BatchError::FallbackCorrelation
    ));
}

#[test]
fn deleting_a_file_journals_deleted_and_the_event_outlives_the_node() {
    let (world, [_, f, ..]) = small_world();
    let mut pair = Pair::new(world);
    let id = canonical_of_key(&pair.a, "K-f");
    let outcome = pair.step("delete a file", |world| world.remove_subtree(f));
    assert_eq!(
        (outcome.created, outcome.rewritten, outcome.deleted),
        (0, 0, 1)
    );
    assert_eq!(outcome.journal.deleted, 1);
    let event = &events(&pair.a)[0];
    assert_eq!(event.nature, ChangeNature::Deleted);
    assert_eq!(event.node_id, id);
    assert!(!event.node_present, "the node is gone, the event is not");
    assert_eq!(event.old_relative_path.as_deref(), Some("a/f.txt"));
    assert_eq!(
        dump_nodes(&pair.a)
            .iter()
            .find(|row| row.key.as_deref() == Some("K-a"))
            .unwrap()
            .child_count,
        1,
        "the parent's child_count fell by one"
    );
}

#[test]
fn deleting_a_whole_subtree_needs_every_descendant_and_journals_each() {
    let (world, [a, ..]) = small_world();
    let mut pair = Pair::new(world);
    let outcome = pair.step("delete a subtree", |world| world.remove_subtree(a));
    assert_eq!(outcome.deleted, 4, "a/, f.txt, n/, deep.txt");
    assert_eq!(outcome.journal.deleted, 4);
    assert_eq!(
        meta(&pair.a, "node_count").as_deref(),
        Some("3"),
        "the root, b/ and g.txt remain"
    );
}

#[test]
fn deleting_a_directory_without_its_children_is_refused_as_an_orphan() {
    let (world, _) = small_world();
    let mut index = in_memory();
    publish_snap(&mut index, &world.snap());
    let batch = UpdateBatch {
        upserts: vec![],
        deletions: vec![canonical_of_key(&index, "K-a")],
        root: None,
        detected_unix_ms: 1,
    };
    assert!(matches!(
        assert_refused(&mut index, &batch),
        BatchError::Orphan(_)
    ));
}

#[test]
fn moving_a_subtree_repaths_every_descendant_and_journals_only_the_directory() {
    let (world, [a, _, _, _, b, ..]) = small_world();
    let mut pair = Pair::new(world);
    let outcome = pair.step("move a subtree", |world| world.item_mut(a).parent = Some(b));
    // a/, f.txt, n/, deep.txt are all rewritten (their path changed)…
    assert_eq!(outcome.rewritten, 4);
    // …but only the moved directory is an event: a descendant whose own name
    // and parent are unchanged has not moved.
    assert_eq!(outcome.journal.moved, 1);
    assert_eq!(outcome.journal.total, 1);
    let rows = dump_nodes(&pair.a);
    let path_of = |key: &str| {
        rows.iter()
            .find(|row| row.key.as_deref() == Some(key))
            .map(|row| (row.path.clone(), row.depth))
            .unwrap()
    };
    assert_eq!(path_of("K-a"), ("b/a".to_string(), 2));
    assert_eq!(path_of("K-f"), ("b/a/f.txt".to_string(), 3));
    assert_eq!(path_of("K-n"), ("b/a/n".to_string(), 3));
    assert_eq!(path_of("K-deep"), ("b/a/n/deep.txt".to_string(), 4));
}

#[test]
fn renaming_a_directory_repaths_the_descendants_and_journals_one_renamed() {
    let (world, [a, ..]) = small_world();
    let mut pair = Pair::new(world);
    let outcome = pair.step("rename a directory", |world| {
        world.item_mut(a).name = "alpha".into()
    });
    assert_eq!(outcome.rewritten, 4);
    assert_eq!(outcome.journal.renamed, 1);
    assert_eq!(outcome.journal.total, 1);
}

#[test]
fn a_moved_directory_without_all_its_descendants_is_refused_as_an_incomplete_subtree() {
    let (world, [a, _, _, _, b, ..]) = small_world();
    let mut index = in_memory();
    publish_snap(&mut index, &world.snap());
    let mut moved = world.clone();
    moved.item_mut(a).parent = Some(b);
    let mut batch = derive_batch(&index, &world.snap(), &moved.snap(), 1);
    // Leave one descendant out: its stored path would silently go stale.
    let before = batch.upserts.len();
    batch
        .upserts
        .retain(|upsert| upsert.identity.stable_key != "K-deep");
    assert_eq!(batch.upserts.len(), before - 1);
    // `a/n` is in the batch, so `deep.txt` is the child left untouched.
    assert!(matches!(
        assert_refused(&mut index, &batch),
        BatchError::IncompleteSubtree(_)
    ));
}

#[test]
fn a_mixed_batch_of_every_kind_of_change_equals_a_full_scan() {
    let (world, [_, f, n, deep, b, g, _]) = small_world();
    let mut pair = Pair::new(world);
    let outcome = pair.step("mixed", |world| {
        world.file(b, "cree.txt", "K-cree", 1, 1); // create
        world.item_mut(g).size = 99; // modify
        world.item_mut(f).name = "f2.txt".into(); // rename
        world.item_mut(n).parent = Some(b); // move a subtree…
        world.remove_subtree(deep); // …and delete one of its files
    });
    assert!(outcome.applied);
    assert_eq!(
        (
            outcome.journal.created,
            outcome.journal.modified,
            outcome.journal.renamed,
            outcome.journal.moved,
            outcome.journal.deleted
        ),
        (1, 1, 1, 1, 1),
        "one event of each of the five natures"
    );
}

#[test]
fn an_unchanged_batch_is_a_no_op_without_event_or_revision() {
    let (world, _) = small_world();
    let mut pair = Pair::new(world);
    let revision_before = revision(&pair.a);
    let changes = total_changes(&pair.a);
    let events_before = events(&pair.a).len();
    let everything = dump_everything(&pair.a);

    // The very same observation again: every row is identical.
    let snap = pair.world.snap();
    let mut batch = UpdateBatch {
        detected_unix_ms: 5,
        ..UpdateBatch::default()
    };
    for node in snap.nodes.iter().filter(|node| node.parent_id.is_some()) {
        batch.upserts.push(ObservedNode {
            identity: snap.identity(node.id).clone(),
            parent: ParentRef::Existing(canonical_of_key(
                &pair.a,
                snap.key(node.parent_id.unwrap()),
            )),
            name: node.name.clone(),
            relative_path: node.relative_path.clone(),
            kind: node.kind,
            depth: node.depth,
            size_bytes: node.size_bytes,
            modified_unix_ms: node.modified_unix_ms,
            online_only: false,
            reparse_point: false,
        });
    }
    // Existing(parent) for a parent that is itself an upsert is legal too:
    // both resolve to the same stored row.
    let outcome = pair.a.apply_update_batch(&batch).expect("no-op batch");
    assert!(!outcome.applied);
    assert_eq!(outcome.revision, revision_before);
    assert_eq!(revision(&pair.a), revision_before);
    assert_eq!(events(&pair.a).len(), events_before);
    assert_eq!(total_changes(&pair.a), changes, "a no-op writes nothing");
    assert_eq!(dump_everything(&pair.a), everything);

    // The empty batch is the same no-op, and does not even take the write lock.
    let empty = pair.a.apply_update_batch(&UpdateBatch::default()).unwrap();
    assert!(!empty.applied);
    assert_eq!(revision(&pair.a), revision_before);
}

#[test]
fn a_directory_that_only_changed_its_own_timestamp_is_effective_but_silent() {
    // The row differs, so the data changes and the revision must move with it
    // (a cursor issued before is stale, exactly as after a full publication);
    // but a directory's own mtime is not a `MODIFIED` event (TASK-0037 C).
    let (world, [a, ..]) = small_world();
    let mut pair = Pair::new(world);
    let events_before = events(&pair.a).len();
    let outcome = pair.step("directory mtime", |world| {
        world.item_mut(a).mtime = Some(4242)
    });
    assert!(outcome.applied);
    assert_eq!(outcome.rewritten, 1);
    assert_eq!(outcome.journal.total, 0);
    assert_eq!(events(&pair.a).len(), events_before);
}

#[test]
fn two_brains_are_isolated_from_each_other() {
    let directory = tempfile::tempdir().unwrap();
    let mut first = Index::open(&directory.path().join("un.sqlite3")).unwrap();
    let mut second = Index::open(&directory.path().join("deux.sqlite3")).unwrap();
    let (world, [_, f, ..]) = small_world();
    publish_snap(&mut first, &world.snap());
    publish_snap(&mut second, &world.snap());
    let untouched = dump_everything(&second);
    let second_identity = second.identity().unwrap();
    assert_ne!(first.identity().unwrap().index_id, second_identity.index_id);

    let mut renamed = world.clone();
    renamed.item_mut(f).name = "seulement-ici.txt".into();
    let batch = derive_batch(&first, &world.snap(), &renamed.snap(), 9);
    apply(&mut first, &batch);

    assert_eq!(
        dump_everything(&second),
        untouched,
        "the other brain is byte-identical"
    );
    assert_eq!(second.identity().unwrap(), second_identity);
    // A journal cursor or filter cursor of one brain is refused by the other:
    // the `index_id` is part of every cursor.
    let page = crate::change_journal::page(
        &first.connection,
        &first.identity().unwrap().index_id,
        &[],
        None,
        50,
    )
    .unwrap();
    assert_eq!(
        page.items.len(),
        1,
        "the change is in the first brain's journal"
    );
    assert!(events(&second).is_empty(), "and only there");
    assert_invariants(&second);
}

// -- Seen / unseen, filters, cursors -------------------------------------------

#[test]
fn new_events_are_unseen_and_earlier_acknowledgements_are_left_alone() {
    let (world, [_, f, _, _, b, ..]) = small_world();
    let mut pair = Pair::new(world);
    // Build some history, then acknowledge all of it.
    pair.step("history", |world| {
        world.file(b, "hier.txt", "K-hier", 1, 1);
    });
    let acknowledged = cj::mark_all_seen(&pair.a.connection).unwrap();
    assert_eq!(acknowledged.newly_seen, 1);
    let watermark = cj::seen_watermark(&pair.a.connection).unwrap();
    let old_rows: i64 = pair
        .a
        .connection
        .query_row("SELECT COUNT(*) FROM seen_change_events", [], |r| r.get(0))
        .unwrap();
    assert_eq!(cj::unseen_event_total(&pair.a.connection).unwrap(), 0);

    pair.step("after the acknowledgement", |world| {
        world.file(b, "neuf.txt", "K-neuf", 2, 2);
        world.item_mut(f).size += 1;
    });

    // Nothing acknowledged was rewritten…
    assert_eq!(cj::seen_watermark(&pair.a.connection).unwrap(), watermark);
    assert_eq!(
        pair.a
            .connection
            .query_row("SELECT COUNT(*) FROM seen_change_events", [], |r| {
                r.get::<_, i64>(0)
            })
            .unwrap(),
        old_rows
    );
    // …and the two new events are above the watermark, hence unseen.
    assert_eq!(cj::unseen_event_total(&pair.a.connection).unwrap(), 2);
    let fresh = canonical_of_key(&pair.a, "K-neuf");
    let state = cj::node_change_state(&pair.a.connection, fresh).unwrap();
    assert!(state.is_new && state.is_unseen);
    let touched = canonical_of_key(&pair.a, "K-f");
    let state = cj::node_change_state(&pair.a.connection, touched).unwrap();
    assert!(state.is_unseen && !state.is_new, "modified, not new");
    // The earlier event stays acknowledged.
    let earlier = events(&pair.a)
        .into_iter()
        .find(|e| e.new_name.as_deref() == Some("hier.txt"))
        .unwrap();
    assert!(earlier.seen);
}

#[test]
fn the_new_and_unseen_filters_see_the_committed_batch_immediately() {
    let (world, [_, f, _, _, b, ..]) = small_world();
    let mut pair = Pair::new(world);
    cj::mark_all_seen(&pair.a.connection).unwrap();
    pair.step("filters", |world| {
        world.file(b, "neuf.txt", "K-neuf", 2, 2);
        world.item_mut(f).size += 1;
    });
    let ids = |state: StateFilter| -> Vec<i64> {
        let filter = NodeFilter {
            state,
            ..NodeFilter::default()
        };
        pair.a
            .filtered_matches(&filter, 50, None)
            .unwrap()
            .rows
            .iter()
            .map(|node| node.id)
            .collect()
    };
    let fresh = canonical_of_key(&pair.a, "K-neuf");
    let modified = canonical_of_key(&pair.a, "K-f");
    assert_eq!(ids(StateFilter::New), vec![fresh]);
    let mut unseen = ids(StateFilter::Unseen);
    unseen.sort();
    let mut expected = vec![fresh, modified];
    expected.sort();
    assert_eq!(unseen, expected);
}

#[test]
fn a_cursor_issued_before_a_batch_is_stale_after_it() {
    let (world, dirs) = wide_world(1, 30);
    let mut pair = Pair::new(world);
    let parent = canonical_of_key(&pair.a, "K-d000");
    let page = pair.a.children_page(parent, 10, None).unwrap();
    let cursor = page.next_cursor.clone().expect("more than one page");
    let filter = NodeFilter::default();
    let matches = pair.a.filtered_matches(&filter, 5, None).unwrap();
    assert!(matches.rows.len() > 5);

    pair.step("a change", |world| {
        world.file(dirs[0], "nouveau.txt", "K-nouveau", 1, 1);
    });
    assert!(matches!(
        pair.a.children_page(parent, 10, Some(&cursor)),
        Err(HierarchyError::StaleCursor { .. })
    ));
    // A no-op does not stale it: the revision is the state's version.
    let fresh = pair.a.children_page(parent, 10, None).unwrap();
    let cursor = fresh.next_cursor.unwrap();
    let noop = derive_batch(&pair.a, &pair.world.snap(), &pair.world.snap(), 3);
    assert!(!pair.a.apply_update_batch(&noop).unwrap().applied);
    assert!(pair.a.children_page(parent, 10, Some(&cursor)).is_ok());
}

// -- Privacy and surface -------------------------------------------------------

#[test]
fn no_stable_key_or_absolute_path_reaches_the_journal_or_a_node_dto() {
    let (world, [_, f, ..]) = small_world();
    let mut pair = Pair::new(world);
    pair.step("a rename and a create", |world| {
        world.item_mut(f).name = "renomme.txt".into();
        world.file(0, "cree.txt", "K-cree-secret", 1, 1);
    });
    let keys: Vec<String> = dump_nodes(&pair.a)
        .into_iter()
        .filter_map(|row| row.key)
        .collect();
    assert!(keys.len() >= 5);
    // Every text column the journal stores, and the node DTOs the product would
    // serialise, are free of every stored key.
    let journal_text = format!("{:?}", events(&pair.a));
    let dto_text = serde_json::to_string(&pair.a.list_nodes(1000, 0).unwrap()).unwrap();
    for key in &keys {
        assert!(!journal_text.contains(key.as_str()), "journal leaks {key}");
        assert!(!dto_text.contains(key.as_str()), "a node DTO leaks {key}");
    }
    let raw: i64 = pair
        .a
        .connection
        .query_row(
            "SELECT COUNT(*) FROM change_events WHERE old_relative_path LIKE '%:%'
                 OR new_relative_path LIKE '%:%' OR old_relative_path LIKE '/%'
                 OR new_relative_path LIKE '/%'",
            [],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(raw, 0, "only relative paths, never an absolute one");
}

/// The kernel's own source with its comments removed: what it actually says.
fn incremental_code() -> String {
    include_str!("../incremental.rs")
        .lines()
        .filter(|line| !line.trim_start().starts_with("//"))
        .collect::<Vec<_>>()
        .join("\n")
}

#[test]
fn the_kernel_is_not_serialisable_nor_a_tauri_command_and_the_host_registers_none() {
    let code = incremental_code();
    for forbidden in ["Serialize", "Deserialize", "serde", "tauri", "#[command"] {
        assert!(
            !code.contains(forbidden),
            "the kernel must not mention {forbidden:?}"
        );
    }
    let host = include_str!("../lib.rs").replace('\r', "");
    let start = host
        .find(".invoke_handler(tauri::generate_handler![")
        .expect("the handler");
    let block = &host[start..];
    let handler = &block[..block.find("])").expect("end of the handler")];
    for forbidden in ["incremental", "update_batch", "apply_batch", "apply_update"] {
        assert!(
            !handler.contains(forbidden),
            "no command may expose the incremental kernel: {forbidden}"
        );
    }
    // `TASK-0041` wired the kernel into `map_refresh`, and only through one door:
    // `commands.rs` never names the kernel — it calls `BrainIndex::
    // refresh_incrementally`, which reconciles a full scan and applies the batch.
    // No other non-test source outside the kernel and the reconciler may call it.
    let commands = include_str!("commands.rs");
    assert!(!commands.contains("apply_update_batch"));
    assert!(!commands.contains("incremental::"));
    assert!(commands.contains("refresh_incrementally"));
    let production = |source: &str| {
        source
            .split("#[cfg(test)]")
            .next()
            .unwrap_or_default()
            .to_string()
    };
    let code_lines = |source: String| -> String {
        source
            .lines()
            .filter(|line| !line.trim_start().starts_with("//"))
            .collect::<Vec<_>>()
            .join("\n")
    };
    let brain_index = code_lines(production(include_str!("brain_index.rs")));
    assert_eq!(
        brain_index.matches("apply_update_batch").count(),
        1,
        "`BrainIndex::refresh_incrementally` is the one product call"
    );
    for (name, source) in [
        ("index.rs", include_str!("../index.rs")),
        ("projection.rs", include_str!("projection.rs")),
        (
            "filtered_projection.rs",
            include_str!("filtered_projection.rs"),
        ),
        ("../lib.rs", include_str!("../lib.rs")),
    ] {
        assert!(
            !production(source).contains("apply_update_batch("),
            "{name} must not call the kernel"
        );
    }
}

#[test]
fn the_kernel_path_never_replaces_the_corpus_reads_it_whole_or_counts_it() {
    let code = incremental_code();
    for forbidden in [
        "DELETE FROM nodes\"",
        "DELETE FROM nodes;",
        "load_previous",
        "COUNT(*)",
        "SELECT * FROM nodes",
        "FROM nodes\"",
        "FROM nodes ORDER",
        "std::fs",
        "fs::read",
        "LIKE",
        "changes()",
        "publish(",
    ] {
        assert!(
            !code.contains(forbidden),
            "the incremental path must not contain {forbidden:?}"
        );
    }
    // Every `FROM nodes` in it is keyed.
    for statement in code.match_indices("FROM nodes").map(|(at, _)| &code[at..]) {
        let head: String = statement.chars().take(60).collect();
        assert!(head.contains("WHERE"), "an unkeyed read of nodes: {head:?}");
    }
}

#[test]
fn every_statement_of_the_kernel_is_keyed_by_an_index_and_none_scans_nodes() {
    let index = in_memory();
    for (name, sql) in KEYED_STATEMENTS {
        let mut statement = index
            .connection
            .prepare(&format!("EXPLAIN QUERY PLAN {sql}"))
            .unwrap_or_else(|error| panic!("{name}: {error}"));
        let unbound = rusqlite::params_from_iter(std::iter::repeat_n(
            rusqlite::types::Null,
            statement.parameter_count(),
        ));
        let plan: Vec<String> = statement
            .query_map(unbound, |row| row.get::<_, String>(3))
            .unwrap()
            .collect::<Result<_, _>>()
            .unwrap();
        let text = plan.join(" | ");
        assert!(
            !text.contains("SCAN nodes") && !text.contains("SCAN TABLE nodes"),
            "{name} scans nodes: {text}"
        );
        assert!(
            text.contains("SEARCH"),
            "{name} does not search an index: {text}"
        );
        match name {
            "row by stable key" => assert!(text.contains("idx_nodes_stable_key"), "{text}"),
            "sibling by name" => assert!(text.contains("idx_nodes_parent"), "{text}"),
            "child ids" | "has child" => assert!(
                text.contains("idx_nodes_parent") || text.contains("idx_nodes_child_order"),
                "{name}: {text}"
            ),
            _ => {}
        }
    }
}

// -- Preflight: every refusal, and every refusal writes nothing -----------------

fn fixture() -> (Index, World, [u32; 7]) {
    let (world, uids) = small_world();
    let mut index = in_memory();
    publish_snap(&mut index, &world.snap());
    (index, world, uids)
}

fn node(
    token: i64,
    key: &str,
    parent: ParentRef,
    name: &str,
    path: &str,
    depth: u32,
    kind: NodeKind,
) -> ObservedNode {
    ObservedNode {
        identity: NodeIdentity {
            node_id: token,
            stable_key: key.into(),
            provenance: IdentityProvenance::System,
        },
        parent,
        name: name.into(),
        relative_path: path.into(),
        kind,
        depth,
        size_bytes: 1,
        modified_unix_ms: Some(1),
        online_only: false,
        reparse_point: false,
    }
}

fn batch(upserts: Vec<ObservedNode>, deletions: Vec<i64>) -> UpdateBatch {
    UpdateBatch {
        upserts,
        deletions,
        root: None,
        detected_unix_ms: 1,
    }
}

fn file_in_root(token: i64, key: &str, name: &str) -> ObservedNode {
    let root = 1;
    node(
        token,
        key,
        ParentRef::Existing(root),
        name,
        name,
        1,
        NodeKind::File,
    )
}

#[test]
fn a_duplicated_token_or_stable_key_or_deletion_is_refused_before_any_write() {
    let (mut index, ..) = fixture();
    let dup_token = batch(
        vec![
            file_in_root(1, "K-x", "x.txt"),
            file_in_root(1, "K-y", "y.txt"),
        ],
        vec![],
    );
    assert!(matches!(
        assert_refused(&mut index, &dup_token),
        BatchError::DuplicateToken(1)
    ));
    let dup_key = batch(
        vec![
            file_in_root(1, "K-x", "x.txt"),
            file_in_root(2, "K-x", "y.txt"),
        ],
        vec![],
    );
    assert!(matches!(
        assert_refused(&mut index, &dup_key),
        BatchError::IdentityCollision
    ));
    let g = canonical_of_key(&index, "K-g");
    let dup_delete = batch(vec![], vec![g, g]);
    assert!(matches!(
        assert_refused(&mut index, &dup_delete),
        BatchError::DuplicateDeletion(_)
    ));
}

#[test]
fn an_unknown_deletion_and_a_delete_plus_upsert_are_refused() {
    let (mut index, ..) = fixture();
    assert!(matches!(
        assert_refused(&mut index, &batch(vec![], vec![987_654])),
        BatchError::UnknownDeletion(987_654)
    ));
    let g = canonical_of_key(&index, "K-g");
    let both = batch(
        vec![node(
            1,
            "K-g",
            ParentRef::Existing(1),
            "g.txt",
            "g.txt",
            1,
            NodeKind::File,
        )],
        vec![g],
    );
    assert!(matches!(
        assert_refused(&mut index, &both),
        BatchError::DeleteAndUpsert(_)
    ));
}

#[test]
fn the_root_can_neither_be_deleted_reparented_nor_upserted() {
    let (mut index, ..) = fixture();
    let root = canonical_of_key(&index, "K-root");
    assert!(matches!(
        assert_refused(&mut index, &batch(vec![], vec![root])),
        BatchError::RootImmutable
    ));
    // An upsert whose key is the root's: it would move or rewrite the root.
    let a = canonical_of_key(&index, "K-a");
    let reparent = batch(
        vec![node(
            1,
            "K-root",
            ParentRef::Existing(a),
            "racine",
            "a/racine",
            2,
            NodeKind::Root,
        )],
        vec![],
    );
    assert!(matches!(
        assert_refused(&mut index, &reparent),
        BatchError::RootImmutable
    ));
    let as_directory = batch(
        vec![node(
            1,
            "K-root",
            ParentRef::Existing(a),
            "racine",
            "a/racine",
            2,
            NodeKind::Directory,
        )],
        vec![],
    );
    assert!(matches!(
        assert_refused(&mut index, &as_directory),
        BatchError::RootImmutable
    ));
    // A second root is never creatable.
    let second = batch(
        vec![node(
            1,
            "K-r2",
            ParentRef::Existing(root),
            "autre",
            "autre",
            1,
            NodeKind::Root,
        )],
        vec![],
    );
    assert!(matches!(
        assert_refused(&mut index, &second),
        BatchError::RootImmutable
    ));
}

#[test]
fn a_missing_deleted_or_non_directory_parent_is_refused() {
    let (mut index, ..) = fixture();
    let missing = batch(
        vec![node(
            1,
            "K-x",
            ParentRef::Existing(424_242),
            "x",
            "x",
            1,
            NodeKind::File,
        )],
        vec![],
    );
    assert!(matches!(
        assert_refused(&mut index, &missing),
        BatchError::ParentMissing { .. }
    ));
    let dangling = batch(
        vec![node(
            1,
            "K-x",
            ParentRef::InBatch(99),
            "x",
            "x",
            1,
            NodeKind::File,
        )],
        vec![],
    );
    assert!(matches!(
        assert_refused(&mut index, &dangling),
        BatchError::ParentMissing { .. }
    ));
    let b = canonical_of_key(&index, "K-b");
    let under_deleted = batch(
        vec![node(
            1,
            "K-x",
            ParentRef::Existing(b),
            "x",
            "b/x",
            2,
            NodeKind::File,
        )],
        vec![b],
    );
    assert!(matches!(
        assert_refused(&mut index, &under_deleted),
        BatchError::ParentDeleted(_)
    ));
    let g = canonical_of_key(&index, "K-g");
    let under_file = batch(
        vec![node(
            1,
            "K-x",
            ParentRef::Existing(g),
            "x",
            "g.txt/x",
            2,
            NodeKind::File,
        )],
        vec![],
    );
    assert!(matches!(
        assert_refused(&mut index, &under_file),
        BatchError::ParentNotDirectory { .. }
    ));
}

#[test]
fn a_cycle_is_refused_even_through_an_untouched_node() {
    let (mut index, ..) = fixture();
    // `a` moved under its own untouched descendant `a/n`: a → n → a.
    let n = canonical_of_key(&index, "K-n");
    let cycle = batch(
        vec![node(
            1,
            "K-a",
            ParentRef::Existing(n),
            "a",
            "a/n/a",
            3,
            NodeKind::Directory,
        )],
        vec![],
    );
    assert!(matches!(
        assert_refused(&mut index, &cycle),
        BatchError::Cycle(_)
    ));
    // Two nodes of the batch made each other's parent.
    let two = batch(
        vec![
            node(
                1,
                "K-p",
                ParentRef::InBatch(2),
                "p",
                "q/p",
                2,
                NodeKind::Directory,
            ),
            node(
                2,
                "K-q",
                ParentRef::InBatch(1),
                "q",
                "p/q",
                2,
                NodeKind::Directory,
            ),
        ],
        vec![],
    );
    let error = assert_refused(&mut index, &two);
    assert!(
        matches!(
            error,
            BatchError::Cycle(_) | BatchError::IncoherentPath { .. }
        ),
        "{error:?}"
    );
    // A node that is its own parent.
    let itself = batch(
        vec![node(
            1,
            "K-s",
            ParentRef::InBatch(1),
            "s",
            "s/s",
            2,
            NodeKind::Directory,
        )],
        vec![],
    );
    let error = assert_refused(&mut index, &itself);
    assert!(
        matches!(
            error,
            BatchError::Cycle(_) | BatchError::IncoherentPath { .. }
        ),
        "{error:?}"
    );
}

#[test]
fn a_path_or_depth_that_disagrees_with_the_parent_or_a_bad_name_is_refused() {
    let (mut index, ..) = fixture();
    let bad_path = batch(
        vec![node(
            1,
            "K-x",
            ParentRef::Existing(1),
            "x.txt",
            "ailleurs/x.txt",
            1,
            NodeKind::File,
        )],
        vec![],
    );
    assert!(matches!(
        assert_refused(&mut index, &bad_path),
        BatchError::IncoherentPath { .. }
    ));
    let bad_depth = batch(
        vec![node(
            1,
            "K-x",
            ParentRef::Existing(1),
            "x.txt",
            "x.txt",
            4,
            NodeKind::File,
        )],
        vec![],
    );
    assert!(matches!(
        assert_refused(&mut index, &bad_depth),
        BatchError::IncoherentPath { .. }
    ));
    for name in ["", "a/b"] {
        let invalid = batch(
            vec![node(
                1,
                "K-x",
                ParentRef::Existing(1),
                name,
                name,
                1,
                NodeKind::File,
            )],
            vec![],
        );
        assert!(matches!(
            assert_refused(&mut index, &invalid),
            BatchError::InvalidName
        ));
    }
}

#[test]
fn two_live_siblings_may_not_share_a_name() {
    let (mut index, ..) = fixture();
    let in_batch = batch(
        vec![
            file_in_root(1, "K-x", "meme.txt"),
            file_in_root(2, "K-y", "meme.txt"),
        ],
        vec![],
    );
    assert!(matches!(
        assert_refused(&mut index, &in_batch),
        BatchError::DuplicateSibling { .. }
    ));
    // Against an untouched stored sibling.
    let stored = batch(vec![file_in_root(1, "K-x", "g.txt")], vec![]);
    assert!(matches!(
        assert_refused(&mut index, &stored),
        BatchError::DuplicateSibling { .. }
    ));
}

#[test]
fn a_name_freed_in_the_same_batch_may_be_reused() {
    // Rename `g.txt` away and create another `g.txt`: the stored holder of the
    // name is itself an upsert, so the name is free by the end of the batch.
    let (world, [_, _, _, _, _, g, _]) = small_world();
    let mut pair = Pair::new(world);
    let outcome = pair.step("swap a name", |world| {
        world.item_mut(g).name = "ancien.txt".into();
        world.file(0, "g.txt", "K-g2", 1, 1);
    });
    assert_eq!(outcome.journal.renamed, 1);
    assert_eq!(outcome.journal.created, 1);
}

#[test]
fn a_provenance_change_on_a_stored_key_is_refused() {
    let (mut index, ..) = fixture();
    let mut forged = file_in_root(1, "K-g", "g.txt");
    forged.identity.provenance = IdentityProvenance::PathFallback;
    assert!(matches!(
        assert_refused(&mut index, &batch(vec![forged], vec![])),
        BatchError::ProvenanceMismatch
    ));
}

#[test]
fn an_index_with_no_durable_identity_refuses_a_batch_instead_of_guessing() {
    let (mut index, ..) = fixture();
    index
        .connection
        .execute(
            "UPDATE nodes SET stable_key = NULL, identity_provenance = NULL",
            [],
        )
        .unwrap();
    assert!(matches!(
        assert_refused(
            &mut index,
            &batch(vec![file_in_root(1, "K-x", "x.txt")], vec![])
        ),
        BatchError::IndexNotStamped
    ));
}

#[test]
fn a_child_count_that_would_go_negative_is_refused_not_clamped() {
    let (mut index, ..) = fixture();
    // Corrupt on purpose: `b/` claims no child, yet a batch will remove one.
    let f = canonical_of_key(&index, "K-f");
    index
        .connection
        .execute(
            "UPDATE nodes SET child_count = 0 WHERE stable_key = 'K-a'",
            [],
        )
        .unwrap();
    assert!(matches!(
        assert_refused(&mut index, &batch(vec![], vec![f])),
        BatchError::MetadataCorrupt(_)
    ));
}

// -- Atomicity: every failure after the first write rolls the batch back --------

/// A batch with a creation (an `INSERT`), a modification (an `UPDATE`), a
/// deletion, and a `child_count` move — several targeted writes to undo.
fn several_writes(index: &Index) -> UpdateBatch {
    let root = canonical_of_key(index, "K-root");
    let b = canonical_of_key(index, "K-b");
    let f = canonical_of_key(index, "K-f");
    let mut modified = node(
        2,
        "K-g",
        ParentRef::Existing(root),
        "g.txt",
        "g.txt",
        1,
        NodeKind::File,
    );
    modified.size_bytes = 12_345;
    batch(
        vec![
            node(
                1,
                "K-new",
                ParentRef::Existing(b),
                "neuf.txt",
                "b/neuf.txt",
                2,
                NodeKind::File,
            ),
            modified,
        ],
        vec![f],
    )
}

fn assert_rolls_back_then_succeeds(trigger: &str, drop_trigger: &str, expected: &str) {
    let (mut index, ..) = fixture();
    let batch = several_writes(&index);
    let before = dump_everything(&index);
    let revision_before = revision(&index);
    index.connection.execute_batch(trigger).unwrap();

    let error = index
        .apply_update_batch(&batch)
        .expect_err("the injected failure must surface");
    assert!(
        error.to_string().contains(expected),
        "unexpected error: {error}"
    );
    assert_eq!(dump_everything(&index), before, "exact rollback: {trigger}");
    assert_eq!(revision(&index), revision_before);

    // The failure was the trigger's, not the batch's: without it, the very
    // same batch applies.
    index.connection.execute_batch(drop_trigger).unwrap();
    let outcome = apply(&mut index, &batch);
    assert!(outcome.applied);
    assert_eq!(revision(&index), revision_before + 1);
}

#[test]
fn a_failure_after_the_inserts_rolls_the_whole_batch_back() {
    // Fires on the UPDATE, after the INSERT of `neuf.txt` already ran.
    assert_rolls_back_then_succeeds(
        "CREATE TRIGGER inject BEFORE UPDATE OF size_bytes ON nodes
         BEGIN SELECT RAISE(ABORT, 'injected-update'); END;",
        "DROP TRIGGER inject;",
        "injected-update",
    );
}

#[test]
fn a_failure_during_a_deletion_rolls_the_whole_batch_back() {
    assert_rolls_back_then_succeeds(
        "CREATE TRIGGER inject BEFORE DELETE ON nodes
         BEGIN SELECT RAISE(ABORT, 'injected-delete'); END;",
        "DROP TRIGGER inject;",
        "injected-delete",
    );
}

#[test]
fn a_failure_while_appending_the_journal_rolls_the_batch_back() {
    assert_rolls_back_then_succeeds(
        "CREATE TRIGGER inject BEFORE INSERT ON change_events
         BEGIN SELECT RAISE(ABORT, 'injected-journal'); END;",
        "DROP TRIGGER inject;",
        "injected-journal",
    );
}

#[test]
fn a_failure_on_the_very_last_write_the_revision_rolls_everything_back() {
    assert_rolls_back_then_succeeds(
        "CREATE TRIGGER inject BEFORE INSERT ON schema_meta WHEN NEW.key = 'index_revision'
         BEGIN SELECT RAISE(ABORT, 'injected-revision'); END;",
        "DROP TRIGGER inject;",
        "injected-revision",
    );
}

#[test]
fn a_constraint_failure_rolls_back_and_the_stable_key_index_is_a_real_backstop() {
    let (mut index, ..) = fixture();
    let before = dump_everything(&index);
    // The unique index is what the application-level check falls back on: two
    // rows with one key are impossible at the storage level, not only refused.
    let clash = index.connection.execute(
        "INSERT INTO nodes (id, parent_id, name, relative_path, kind, depth, size_bytes,
                online_only, reparse_point, child_count, seen, stable_key, identity_provenance)
         VALUES (900, 1, 'clash', 'clash', 'file', 1, 0, 0, 0, 0, 0, 'K-g', 'SYSTEM')",
        [],
    );
    assert!(clash.is_err(), "idx_nodes_stable_key is unique");
    assert_eq!(dump_everything(&index), before);

    // And a constraint hit *inside* the kernel's transaction (a foreign key,
    // forced by a trigger-free obstruction: the parent row vanishes between the
    // preflight and the write is impossible under IMMEDIATE, so this drives the
    // same SQLite class of failure through a CHECK the test adds).
    index
        .connection
        .execute_batch(
            "CREATE TRIGGER clash BEFORE INSERT ON nodes WHEN NEW.name = 'poison'
             BEGIN SELECT RAISE(ABORT, 'UNIQUE constraint failed: injected'); END;",
        )
        .unwrap();
    let b = canonical_of_key(&index, "K-b");
    let batch = batch(
        vec![
            node(
                1,
                "K-ok",
                ParentRef::Existing(b),
                "ok.txt",
                "b/ok.txt",
                2,
                NodeKind::File,
            ),
            node(
                2,
                "K-poison",
                ParentRef::Existing(b),
                "poison",
                "b/poison",
                2,
                NodeKind::File,
            ),
        ],
        vec![],
    );
    let error = index.apply_update_batch(&batch).expect_err("constraint");
    assert!(error.to_string().contains("constraint"), "{error}");
    assert_eq!(
        dump_everything(&index),
        before,
        "the first insert is undone too"
    );
}

// -- Concurrency ---------------------------------------------------------------

#[test]
fn the_kernel_inherits_the_existing_busy_timeout_and_does_not_change_it() {
    let directory = tempfile::tempdir().unwrap();
    let index = Index::open(&directory.path().join("brain.sqlite3")).unwrap();
    let timeout: i64 = index
        .connection
        .query_row("PRAGMA busy_timeout", [], |row| row.get(0))
        .unwrap();
    assert_eq!(timeout, 5000, "the connection's existing 5 s busy timeout");
    assert!(
        !incremental_code().contains("busy_timeout"),
        "the kernel does not set its own timeout"
    );
}

#[test]
fn a_prolonged_busy_lock_fails_cleanly_with_no_half_batch_then_the_batch_can_be_retried() {
    let directory = tempfile::tempdir().unwrap();
    let path = directory.path().join("brain.sqlite3");
    let mut index = Index::open(&path).unwrap();
    let (world, _) = small_world();
    publish_snap(&mut index, &world.snap());
    let batch = several_writes(&index);
    let before = dump_everything(&index);

    let holder = rusqlite::Connection::open(&path).unwrap();
    holder.execute_batch("BEGIN IMMEDIATE;").unwrap();
    // A short timeout stands in for the 5 s default, which
    // `the_kernel_inherits_the_existing_busy_timeout…` proves is untouched.
    index
        .connection
        .busy_timeout(std::time::Duration::from_millis(150))
        .unwrap();
    let started = std::time::Instant::now();
    let error = index
        .apply_update_batch(&batch)
        .expect_err("the lock is held");
    assert!(started.elapsed() >= std::time::Duration::from_millis(100));
    assert!(
        matches!(
            &error,
            BatchError::Sqlite(rusqlite::Error::SqliteFailure(failure, _))
                if failure.code == rusqlite::ErrorCode::DatabaseBusy
        ),
        "{error:?}"
    );
    holder.execute_batch("ROLLBACK;").unwrap();
    assert_eq!(dump_everything(&index), before, "no half batch");

    let outcome = apply(&mut index, &batch);
    assert!(outcome.applied);
}

#[test]
fn two_writers_are_serialised_by_the_immediate_transaction_and_neither_batch_is_lost() {
    let directory = tempfile::tempdir().unwrap();
    let path = directory.path().join("brain.sqlite3");
    let mut first = Index::open(&path).unwrap();
    let (world, _) = wide_world(2, 5);
    publish_snap(&mut first, &world.snap());
    let mut second = Index::open(&path).unwrap();
    let start_revision = revision(&first);
    let start_count = dump_nodes(&first).len();

    let make = |tag: &'static str| {
        let root = 1;
        batch(
            (0..25)
                .map(|n| {
                    let name = format!("{tag}{n:02}.txt");
                    node(
                        i64::from(n) + 1,
                        &format!("K-{tag}{n:02}"),
                        ParentRef::Existing(root),
                        &name,
                        &name,
                        1,
                        NodeKind::File,
                    )
                })
                .collect(),
            vec![],
        )
    };
    let (one, two) = (make("un"), make("de"));
    let handles = [
        std::thread::spawn(move || {
            let outcome = first.apply_update_batch(&one).expect("first writer");
            (first, outcome)
        }),
        std::thread::spawn(move || {
            let outcome = second.apply_update_batch(&two).expect("second writer");
            (second, outcome)
        }),
    ];
    let mut indexes = Vec::new();
    for handle in handles {
        let (index, outcome) = handle.join().unwrap();
        assert!(outcome.applied);
        assert_eq!(outcome.created, 25);
        indexes.push(index);
    }
    let last = &indexes[0];
    assert_eq!(revision(last), start_revision + 2, "one revision per batch");
    assert_eq!(dump_nodes(last).len(), start_count + 50);
    assert_invariants(last);
    let ids: HashSet<i64> = dump_nodes(last).iter().map(|row| row.id).collect();
    assert_eq!(ids.len(), start_count + 50, "no id was allocated twice");
    assert_eq!(events(last).len(), 50);
}

#[test]
fn a_reader_never_sees_a_partial_batch() {
    let directory = tempfile::tempdir().unwrap();
    let path = directory.path().join("brain.sqlite3");
    let mut writer = Index::open(&path).unwrap();
    let (world, _) = wide_world(3, 4);
    publish_snap(&mut writer, &world.snap());
    let start = dump_nodes(&writer).len();

    let stop = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
    let reader_stop = stop.clone();
    let reader_path = path.clone();
    let reader = std::thread::spawn(move || {
        let connection = rusqlite::Connection::open(&reader_path).unwrap();
        let mut snapshots = 0_u32;
        while !reader_stop.load(std::sync::atomic::Ordering::Relaxed) {
            // One read snapshot: the counters, the rows and the journal are
            // read inside a single deferred transaction.
            let transaction = connection.unchecked_transaction().unwrap();
            let revision: i64 = transaction
                .query_row(
                    "SELECT value FROM schema_meta WHERE key = 'index_revision'",
                    [],
                    |r| r.get::<_, String>(0).map(|v| v.parse().unwrap()),
                )
                .unwrap();
            let count: i64 = transaction
                .query_row("SELECT COUNT(*) FROM nodes", [], |r| r.get(0))
                .unwrap();
            let recorded: i64 = transaction
                .query_row(
                    "SELECT value FROM schema_meta WHERE key = 'node_count'",
                    [],
                    |r| r.get::<_, String>(0).map(|v| v.parse().unwrap()),
                )
                .unwrap();
            let events: i64 = transaction
                .query_row("SELECT COUNT(*) FROM change_events", [], |r| r.get(0))
                .unwrap();
            let child_total: i64 = transaction
                .query_row("SELECT COALESCE(SUM(child_count), 0) FROM nodes", [], |r| {
                    r.get(0)
                })
                .unwrap();
            transaction.finish().unwrap();
            // Revision 1 is the baseline; each later revision added 5 rows and
            // 5 events. A partial batch would break one of these equalities.
            assert_eq!(count, recorded, "rows and node_count move together");
            assert_eq!(count - 1, child_total, "every non-root row is one child");
            assert_eq!(count, start as i64 + 5 * (revision - 1));
            assert_eq!(events, 5 * (revision - 1));
            snapshots += 1;
        }
        snapshots
    });

    for round in 0..40 {
        let batch = batch(
            (0..5)
                .map(|n| {
                    let name = format!("r{round:02}-{n}.txt");
                    node(
                        i64::from(n) + 1,
                        &format!("K-r{round:02}-{n}"),
                        ParentRef::Existing(1),
                        &name,
                        &name,
                        1,
                        NodeKind::File,
                    )
                })
                .collect(),
            vec![],
        );
        writer.apply_update_batch(&batch).expect("round");
    }
    stop.store(true, std::sync::atomic::Ordering::Relaxed);
    let snapshots = reader.join().expect("the reader saw no partial batch");
    assert!(snapshots > 0);
    assert_invariants(&writer);
}

// -- Parity with a full scan ---------------------------------------------------

/// A tiny LCG-free deterministic step generator over the world model. Every
/// operation keeps the tree valid: unique sibling names, no move into one's own
/// subtree, the root untouched.
fn random_step(world: &mut World, rng: &mut crate::map::Rng, counter: &mut u32) {
    let operations = rng.range(1, 6);
    for _ in 0..operations {
        *counter += 1;
        let directories: Vec<u32> = world
            .items
            .iter()
            .filter(|item| matches!(item.kind, NodeKind::Directory | NodeKind::Root))
            .map(|item| item.uid)
            .collect();
        let movable: Vec<u32> = world
            .items
            .iter()
            .filter(|item| item.parent.is_some())
            .map(|item| item.uid)
            .collect();
        let pick = |rng: &mut crate::map::Rng, from: &[u32]| {
            from[rng.range(0, (from.len() - 1) as u32) as usize]
        };
        let fallback = rng.range(0, 3) == 0;
        match rng.range(0, 6) {
            0 | 1 => {
                let parent = pick(rng, &directories);
                let name = format!("c{counter}.txt");
                if fallback {
                    world.fallback_file(parent, &name, 1, 1);
                } else {
                    world.file(parent, &name, &format!("K-c{counter}"), 1, 1);
                }
            }
            2 => {
                let parent = pick(rng, &directories);
                world.dir(parent, &format!("dd{counter}"), &format!("K-dd{counter}"));
            }
            3 if !movable.is_empty() => {
                let uid = pick(rng, &movable);
                let item = world.item_mut(uid);
                if item.kind == NodeKind::File {
                    item.size += 3;
                    item.mtime = Some(i64::from(*counter));
                } else {
                    item.mtime = Some(i64::from(*counter));
                }
            }
            4 if !movable.is_empty() => {
                let uid = pick(rng, &movable);
                world.item_mut(uid).name = format!("r{counter}");
            }
            5 if !movable.is_empty() => {
                let uid = pick(rng, &movable);
                let inside = world.subtree(uid);
                let targets: Vec<u32> = directories
                    .iter()
                    .copied()
                    .filter(|dir| !inside.contains(dir))
                    .collect();
                if !targets.is_empty() {
                    let target = pick(rng, &targets);
                    world.item_mut(uid).parent = Some(target);
                    world.item_mut(uid).name = format!("m{counter}");
                }
            }
            _ if movable.len() > 6 => {
                let uid = pick(rng, &movable);
                world.remove_subtree(uid);
            }
            _ => {}
        }
    }
}

#[test]
fn forty_random_batches_leave_the_same_state_as_forty_full_scans() {
    for seed in [20_260_924_u64, 7, 913_377] {
        let (world, _) = wide_world(5, 6);
        let mut pair = Pair::new(world);
        let mut rng = crate::map::Rng::new(seed);
        let mut counter = 0;
        let mut applied = 0;
        for step in 0..40 {
            let outcome = pair.step(&format!("seed {seed} step {step}"), |world| {
                random_step(world, &mut rng, &mut counter)
            });
            applied += usize::from(outcome.applied);
        }
        assert!(
            applied >= 30,
            "the generator produces real batches ({applied})"
        );
        // The kernel and the full-scan path interoperate: publishing the final
        // world in full **after** forty incremental batches finds nothing to
        // journal and changes no row — every row the kernel wrote carries the
        // durable identity `publish` correlates against.
        let settled = dump_nodes(&pair.a);
        let outcome = pair
            .a
            .publish_with_identity(
                &pair.world.snap().nodes,
                &pair.world.snap().identities,
                &[("built_unix_ms", "1700000000000".to_string())],
                &[],
            )
            .expect("a full refresh after incremental batches");
        assert_eq!(
            outcome.journal.total, 0,
            "seed {seed}: nothing left to detect"
        );
        assert!(!outcome.journal.baseline_established);
        assert_eq!(
            dump_nodes(&pair.a),
            settled,
            "seed {seed}: the corpus is unchanged"
        );
        // The end state also equals a *fresh* full publication of the final
        // world: the incremental history left nothing behind.
        let mut fresh = in_memory();
        publish_snap(&mut fresh, &pair.world.snap());
        let a: Vec<_> = dump_nodes(&pair.a)
            .into_iter()
            .map(|row| {
                (
                    row.name,
                    row.path,
                    row.kind,
                    row.depth,
                    row.size,
                    row.mtime,
                    row.child_count,
                    row.key,
                )
            })
            .collect();
        let mut b: Vec<_> = dump_nodes(&fresh)
            .into_iter()
            .map(|row| {
                (
                    row.name,
                    row.path,
                    row.kind,
                    row.depth,
                    row.size,
                    row.mtime,
                    row.child_count,
                    row.key,
                )
            })
            .collect();
        let mut a_sorted = a;
        a_sorted.sort();
        b.sort();
        assert_eq!(a_sorted, b, "same tree, ids aside, as a from-scratch scan");
    }
}

#[test]
fn a_real_scanned_tree_reaches_the_same_state_by_batches_as_by_full_publications() {
    use crate::scanner::scan_tree;
    let temp = tempfile::tempdir().unwrap();
    let root = temp.path().join("racine");
    std::fs::create_dir_all(root.join("a")).unwrap();
    std::fs::create_dir_all(root.join("b")).unwrap();
    std::fs::write(root.join("a").join("f.txt"), b"synthetique").unwrap();
    std::fs::write(root.join("g.txt"), b"synthetique deux").unwrap();

    let mut a = in_memory();
    let mut b = in_memory();
    let first = Snap::of_scan(&scan_tree(&root).unwrap());
    publish_snap(&mut a, &first);
    publish_snap(&mut b, &first);
    let first_g = dump_nodes(&a)
        .into_iter()
        .find(|row| row.name == "g.txt")
        .expect("g.txt")
        .id;
    let mut previous = first;

    type Mutation = fn(&std::path::Path);
    let mutations: [(&str, Mutation); 4] = [
        ("rename and create", |root| {
            std::fs::rename(root.join("a/f.txt"), root.join("a/f2.txt")).unwrap();
            std::fs::write(root.join("b/neuf.txt"), b"nouveau").unwrap();
        }),
        ("move a file", |root| {
            std::fs::rename(root.join("g.txt"), root.join("b/g.txt")).unwrap();
        }),
        ("rename a directory with content", |root| {
            std::fs::rename(root.join("a"), root.join("alpha")).unwrap();
        }),
        ("delete and modify", |root| {
            std::fs::remove_file(root.join("b/neuf.txt")).unwrap();
            std::fs::write(root.join("b/g.txt"), b"beaucoup plus long qu'avant").unwrap();
        }),
    ];
    for (label, mutate) in mutations {
        mutate(&root);
        let next = Snap::of_scan(&scan_tree(&root).unwrap());
        let batch = derive_batch(&a, &previous, &next, 1);
        let a_events = newest_event(&a);
        let b_events = newest_event(&b);
        apply(&mut a, &batch);
        publish_snap(&mut b, &next);
        assert_eq!(dump_nodes(&a), dump_nodes(&b), "{label}: rows");
        assert_eq!(
            events_after(&a, a_events),
            events_after(&b, b_events),
            "{label}: events"
        );
        for key in ["node_count", "root_id", "next_node_id"] {
            assert_eq!(meta(&a, key), meta(&b, key), "{label}: {key}");
        }
        previous = next;
    }
    // Where the scanner obtained a real `SYSTEM` identity (Windows on NTFS),
    // the moved file kept its very first canonical id through the move and the
    // later modification; a `PATH_FALLBACK` file is honestly a new object.
    let survivors: Vec<_> = dump_nodes(&a)
        .into_iter()
        .filter(|row| row.name == "g.txt")
        .collect();
    assert_eq!(survivors.len(), 1);
    match survivors[0].provenance.as_deref() {
        Some("SYSTEM") => assert_eq!(survivors[0].id, first_g, "the id survived the move"),
        other => assert_ne!(
            survivors[0].id, first_g,
            "fallback ({other:?}) is a new object"
        ),
    }
}

// -- The root's own metadata, kind changes, diagnostics ------------------------

#[test]
fn the_roots_own_metadata_follows_a_batch_like_a_full_scan() {
    let (world, _) = small_world();
    let mut pair = Pair::new(world);

    // Its timestamp moves whenever an entry appears directly inside it: an
    // effective change (the row differs, the revision moves) but silent — a
    // directory's own timestamp is never a `MODIFIED` event.
    let outcome = pair.step("root timestamp", |world| {
        world.item_mut(0).mtime = Some(31_337)
    });
    assert!(outcome.applied);
    assert_eq!(outcome.rewritten, 1);
    assert_eq!(outcome.journal.total, 0);

    // Its availability is journaled exactly as a full scan journals it.
    let outcome = pair.step("root availability", |world| {
        world.item_mut(0).online_only = true
    });
    assert_eq!(outcome.journal.modified, 1);

    // The same observation again is a no-op.
    let same = UpdateBatch {
        root: Some(RootObservation {
            modified_unix_ms: Some(31_337),
            online_only: true,
            reparse_point: false,
        }),
        ..UpdateBatch::default()
    };
    let revision_before = revision(&pair.a);
    assert!(!pair.a.apply_update_batch(&same).unwrap().applied);
    assert_eq!(revision(&pair.a), revision_before);
}

#[test]
fn a_directory_that_becomes_a_file_must_bring_its_children_along() {
    let (world, [a, f, n, ..]) = small_world();
    let mut index = in_memory();
    publish_snap(&mut index, &world.snap());

    // Kept children under what is now a file: refused, nothing written.
    let mut as_file = world.clone();
    as_file.item_mut(a).kind = NodeKind::File;
    let refused = derive_batch(&index, &world.snap(), &as_file.snap(), 1);
    let error = assert_refused(&mut index, &refused);
    assert!(
        matches!(
            error,
            BatchError::IncompleteSubtree(_) | BatchError::ParentNotDirectory { .. }
        ),
        "{error:?}"
    );

    // With its children deleted too, it is an ordinary change, equal to a scan.
    let mut pair = Pair::new(world);
    let outcome = pair.step("directory to file", |world| {
        world.remove_subtree(f);
        world.remove_subtree(n);
        world.item_mut(a).kind = NodeKind::File;
    });
    assert_eq!(outcome.journal.deleted, 3, "f.txt, n/, deep.txt");
    assert_eq!(outcome.journal.modified, 1, "a's kind changed");

    // …and the other way round.
    let (world, [.., g, _]) = small_world();
    let mut pair = Pair::new(world);
    let outcome = pair.step("file to directory", |world| {
        world.item_mut(g).kind = NodeKind::Directory
    });
    assert_eq!(outcome.journal.modified, 1);
}

#[test]
fn a_diagnostic_keyed_by_a_path_that_no_longer_names_the_node_is_removed() {
    let (world, [_, f, ..]) = small_world();
    let mut index = in_memory();
    publish_snap(&mut index, &world.snap());
    for path in ["a/f.txt", "g.txt", "b"] {
        index
            .connection
            .execute(
                "INSERT INTO node_diagnostics(relative_path, code) VALUES (?1, 'x')",
                [path],
            )
            .unwrap();
    }
    let paths = |index: &Index| -> Vec<String> {
        let mut statement = index
            .connection
            .prepare("SELECT relative_path FROM node_diagnostics ORDER BY relative_path")
            .unwrap();
        statement
            .query_map([], |row| row.get(0))
            .unwrap()
            .collect::<Result<_, _>>()
            .unwrap()
    };
    assert_eq!(paths(&index), ["a/f.txt", "b", "g.txt"]);

    // A rename frees the old path; a deletion frees the deleted node's path.
    let mut renamed = world.clone();
    renamed.item_mut(f).name = "f2.txt".into();
    let batch = derive_batch(&index, &world.snap(), &renamed.snap(), 1);
    apply(&mut index, &batch);
    assert_eq!(paths(&index), ["b", "g.txt"]);

    let mut without_g = renamed.clone();
    let g = without_g
        .children(0)
        .into_iter()
        .find(|uid| without_g.item(*uid).name == "g.txt");
    without_g.remove_subtree(g.unwrap());
    let batch = derive_batch(&index, &renamed.snap(), &without_g.snap(), 2);
    apply(&mut index, &batch);
    assert_eq!(paths(&index), ["b"], "an untouched node's diagnostic stays");
}
