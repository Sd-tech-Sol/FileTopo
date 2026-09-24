//! `TASK-0041` — the manual **Actualiser** through the incremental kernel
//! (`DEC-0039`).
//!
//! Two layers, both against the code the product runs:
//!
//! * **The reconciler** (`crate::reconcile`) is proven on synthetic scan-shaped
//!   worlds against the **reference it must agree with** — the existing full
//!   publication, `Index::publish_with_identity`: after every randomised round of
//!   creations, edits, deletions, renames and moves (`SYSTEM` and
//!   `PATH_FALLBACK`, files and directories), the Index that received only the
//!   reconciled batch equals the Index that was replaced wholesale — same
//!   canonical ids, same rows, same `child_count`, same journal.
//! * **The product path** — a real `REAL_ROOT` brain, the real scanner and the
//!   real Windows identity, through `refresh_map` / `rebuild_map` exactly as the
//!   Tauri commands call them. That is where `applicationMode`, the summary, the
//!   filters, the seen state, rollback and the "never a full replacement" proof
//!   are established.
//!
//! **The proof that a stamped refresh never replaces the corpus is a guard that
//! fails, not a text search:** a SQLite trigger refuses to insert any row whose id
//! already exists. A full publication deletes and re-inserts every row, so it
//! cannot pass; the kernel only ever inserts *new* ids. A control test shows the
//! guard really stops **Reconstruire** and a direct `publish_with_identity`.
//!
//! Every tree is created by the test that reads it, under a `tempfile`
//! directory. **No personal brain, no personal folder.**

use super::change_journal_tests::all_events;
use super::seen_state_tests::downgrade_to_schema_v5;
use super::stable_identity_tests::downgrade_to_schema_v3;
use super::*;
use crate::change_journal::{ChangeNature, StoredEvent};
use crate::domain::{NodeDto, NodeKind};
use crate::identity::{IdentityProvenance, NodeIdentity, path_fallback_key};
use crate::incremental::BatchError;
use crate::index::Index;
use crate::map::Rng;
use crate::node_filter::{AvailabilityFilter, NodeFilter, StateFilter};
use crate::reconcile::{ReconcileError, is_identity_stamped, reconcile_full_scan};
use std::collections::{BTreeSet, HashMap, HashSet};
use std::fs;

// ==========================================================================
// The reconciler, on synthetic worlds
// ==========================================================================

#[derive(Clone, Debug)]
struct Item {
    uid: u32,
    parent: Option<u32>,
    name: String,
    kind: NodeKind,
    size: u64,
    mtime: Option<i64>,
    /// `true` — a `SYSTEM` identity that survives a rename or a move. `false` —
    /// `PATH_FALLBACK`, whose key is derived from the path.
    system: bool,
}

#[derive(Clone, Debug)]
struct World {
    items: Vec<Item>,
    next_uid: u32,
}

const BUILT: i64 = 1_700_000_000_123;

impl World {
    fn new() -> Self {
        Self {
            items: vec![Item {
                uid: 0,
                parent: None,
                name: "racine".into(),
                kind: NodeKind::Root,
                size: 0,
                mtime: Some(1),
                system: true,
            }],
            next_uid: 1,
        }
    }

    fn add(&mut self, parent: u32, name: &str, kind: NodeKind, size: u64, system: bool) -> u32 {
        let uid = self.next_uid;
        self.next_uid += 1;
        self.items.push(Item {
            uid,
            parent: Some(parent),
            name: name.into(),
            kind,
            size,
            mtime: Some(10 + i64::from(uid)),
            system,
        });
        uid
    }

    fn dir(&mut self, parent: u32, name: &str, system: bool) -> u32 {
        self.add(parent, name, NodeKind::Directory, 0, system)
    }

    fn file(&mut self, parent: u32, name: &str, size: u64, system: bool) -> u32 {
        self.add(parent, name, NodeKind::File, size, system)
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

    fn path(&self, uid: u32) -> String {
        let item = self.item(uid);
        match item.parent {
            None => String::new(),
            Some(parent) => {
                let parent_path = self.path(parent);
                if parent_path.is_empty() {
                    item.name.clone()
                } else {
                    format!("{parent_path}/{}", item.name)
                }
            }
        }
    }

    fn children(&self, uid: u32) -> Vec<u32> {
        let mut children: Vec<&Item> = self
            .items
            .iter()
            .filter(|item| item.parent == Some(uid))
            .collect();
        children.sort_by(|a, b| a.name.cmp(&b.name));
        children.into_iter().map(|item| item.uid).collect()
    }

    fn subtree(&self, uid: u32) -> HashSet<u32> {
        let mut found = HashSet::from([uid]);
        let mut frontier = vec![uid];
        while let Some(current) = frontier.pop() {
            for child in self.children(current) {
                if found.insert(child) {
                    frontier.push(child);
                }
            }
        }
        found
    }

    fn remove_subtree(&mut self, uid: u32) {
        let doomed = self.subtree(uid);
        self.items.retain(|item| !doomed.contains(&item.uid));
    }

    /// The scan-shaped output the product's scanner would produce: nodes and
    /// identities in breadth-first order, tied by a temporary id.
    fn scan(&self) -> (Vec<NodeDto>, Vec<NodeIdentity>) {
        let mut nodes = Vec::new();
        let mut identities = Vec::new();
        let mut temporary: HashMap<u32, i64> = HashMap::new();
        let mut queue = std::collections::VecDeque::from([0_u32]);
        while let Some(uid) = queue.pop_front() {
            let item = self.item(uid);
            let id = nodes.len() as i64 + 1;
            temporary.insert(uid, id);
            let path = self.path(uid);
            let depth = if path.is_empty() {
                0
            } else {
                path.split('/').count() as u32
            };
            let children = self.children(uid);
            nodes.push(NodeDto {
                id,
                parent_id: item.parent.map(|parent| temporary[&parent]),
                name: item.name.clone(),
                relative_path: path.clone(),
                kind: item.kind,
                depth,
                size_bytes: item.size,
                modified_unix_ms: item.mtime,
                online_only: false,
                reparse_point: false,
                child_count: children.len() as u32,
                seen: false,
            });
            identities.push(if item.system {
                NodeIdentity {
                    node_id: id,
                    stable_key: format!("K-{uid}"),
                    provenance: IdentityProvenance::System,
                }
            } else {
                NodeIdentity {
                    node_id: id,
                    stable_key: path_fallback_key(std::path::Path::new(&path), item.kind),
                    provenance: IdentityProvenance::PathFallback,
                }
            });
            queue.extend(children);
        }
        (nodes, identities)
    }
}

fn a_world() -> World {
    let mut world = World::new();
    let dossier = world.dir(0, "dossier", true);
    world.file(dossier, "enfant.txt", 5, true);
    let sous = world.dir(dossier, "sous", false);
    world.file(sous, "profond.txt", 7, false);
    world.file(0, "stable.txt", 11, true);
    world.file(0, "repli.txt", 13, false);
    world.dir(0, "vide", true);
    world
}

fn publish_full(index: &mut Index, world: &World) {
    let (nodes, identities) = world.scan();
    index
        .publish_with_identity(
            &nodes,
            &identities,
            &[("built_unix_ms", BUILT.to_string())],
            &[],
        )
        .expect("reference publication");
}

/// The reconciled batch, applied by the kernel — what `refresh_incrementally`
/// does, minus the file.
fn apply_reconciled(index: &mut Index, world: &World) -> crate::incremental::ApplyOutcome {
    let (nodes, identities) = world.scan();
    let batch = reconcile_full_scan(index, &nodes, &identities, BUILT).expect("reconciles");
    index.apply_update_batch(&batch).expect("applies")
}

fn node_dump(index: &Index) -> Vec<String> {
    let mut statement = index
        .connection
        .prepare(
            "SELECT id, parent_id, name, relative_path, kind, depth, size_bytes,
                    modified_unix_ms, online_only, reparse_point, child_count, seen,
                    stable_key, identity_provenance
               FROM nodes ORDER BY id",
        )
        .unwrap();
    statement
        .query_map([], |row| {
            let mut cells = Vec::new();
            for column in 0..14 {
                let value: rusqlite::types::Value = row.get(column)?;
                cells.push(format!("{value:?}"));
            }
            Ok(cells.join("|"))
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

/// The journal without the two fields that legitimately differ between the two
/// paths: the event id sequence and the revision a publication stamps (a full
/// publication advances it every time, the kernel only when something changed).
fn journal_shape(index: &Index) -> Vec<String> {
    all_events(index, &[])
        .into_iter()
        .map(|event: StoredEvent| {
            format!(
                "{:?}|{}|{:?}|{:?}|{:?}|{:?}|{:?}|{:?}|{}|{}",
                event.nature,
                event.node_id,
                event.old_name,
                event.new_name,
                event.old_relative_path,
                event.new_relative_path,
                event.old_parent_id,
                event.new_parent_id,
                event.ordinal,
                event.detected_unix_ms
            )
        })
        .collect()
}

fn assert_exact(index: &Index, label: &str) {
    assert!(
        crate::hierarchy::child_count_mismatches(&index.connection, 10)
            .unwrap()
            .is_empty(),
        "{label}: child_count is exact for every parent"
    );
    let rows: i64 = index
        .connection
        .query_row("SELECT COUNT(*) FROM nodes", [], |r| r.get(0))
        .unwrap();
    assert_eq!(
        meta(index, "node_count").unwrap().parse::<i64>().unwrap(),
        rows,
        "{label}: node_count is exact"
    );
}

fn assert_parity(incremental: &Index, full: &Index, label: &str) {
    assert_eq!(
        node_dump(incremental),
        node_dump(full),
        "{label}: the incrementally reconciled Index equals the fully published one"
    );
    for key in ["node_count", "root_id", "next_node_id"] {
        assert_eq!(meta(incremental, key), meta(full, key), "{label}: {key}");
    }
    assert_eq!(
        journal_shape(incremental),
        journal_shape(full),
        "{label}: same journal"
    );
    assert_exact(incremental, label);
}

/// A pair `(A, B)` in the same baseline state: `A` will only ever receive
/// reconciled batches, `B` is replaced wholesale by every scan.
struct Pair {
    a: Index,
    b: Index,
    world: World,
}

impl Pair {
    fn new(world: World) -> Self {
        let mut a = Index::in_memory().unwrap();
        let mut b = Index::in_memory().unwrap();
        publish_full(&mut a, &world);
        publish_full(&mut b, &world);
        Self { a, b, world }
    }

    fn step(
        &mut self,
        label: &str,
        mutate: impl FnOnce(&mut World),
    ) -> crate::incremental::ApplyOutcome {
        mutate(&mut self.world);
        let outcome = apply_reconciled(&mut self.a, &self.world);
        publish_full(&mut self.b, &self.world);
        assert_parity(&self.a, &self.b, label);
        outcome
    }
}

fn natures(index: &Index) -> Vec<ChangeNature> {
    all_events(index, &[])
        .into_iter()
        .map(|event| event.nature)
        .collect()
}

#[test]
fn an_unchanged_scan_reconciles_to_an_empty_batch_and_writes_nothing() {
    let world = a_world();
    let mut index = Index::in_memory().unwrap();
    publish_full(&mut index, &world);
    let revision = index.identity().unwrap().revision;
    let before = node_dump(&index);

    let (nodes, identities) = world.scan();
    let batch = reconcile_full_scan(&index, &nodes, &identities, BUILT).unwrap();
    assert!(batch.upserts.is_empty(), "no node is re-sent");
    assert!(batch.deletions.is_empty());
    assert!(
        batch.root.is_none(),
        "an unchanged root is not even observed"
    );

    let outcome = index.apply_update_batch(&batch).unwrap();
    assert!(!outcome.applied);
    assert_eq!(index.identity().unwrap().revision, revision);
    assert_eq!(node_dump(&index), before);
    assert!(all_events(&index, &[]).is_empty());
}

#[test]
fn the_batch_holds_only_what_is_new_or_changed() {
    let mut world = a_world();
    let mut index = Index::in_memory().unwrap();
    publish_full(&mut index, &world);

    // One edit, one creation, one deletion among a dozen untouched nodes.
    let stable = world
        .items
        .iter()
        .find(|item| item.name == "stable.txt")
        .unwrap()
        .uid;
    world.item_mut(stable).size = 999;
    world.file(0, "nouveau.txt", 3, true);
    let repli = world
        .items
        .iter()
        .find(|item| item.name == "repli.txt")
        .unwrap()
        .uid;
    world.remove_subtree(repli);

    let (nodes, identities) = world.scan();
    let batch = reconcile_full_scan(&index, &nodes, &identities, BUILT).unwrap();
    let names: BTreeSet<&str> = batch.upserts.iter().map(|n| n.name.as_str()).collect();
    assert_eq!(names, BTreeSet::from(["stable.txt", "nouveau.txt"]));
    assert_eq!(batch.deletions.len(), 1);
    assert_eq!(
        batch.deletions[0],
        index
            .connection
            .query_row(
                "SELECT id FROM nodes WHERE relative_path = 'repli.txt'",
                [],
                |r| r.get::<_, i64>(0)
            )
            .unwrap()
    );
}

#[test]
fn a_renamed_directory_brings_exactly_its_descendants_and_no_one_else() {
    let mut world = a_world();
    let mut index = Index::in_memory().unwrap();
    publish_full(&mut index, &world);
    let dossier = world
        .items
        .iter()
        .find(|i| i.name == "dossier")
        .unwrap()
        .uid;
    world.item_mut(dossier).name = "renomme".into();

    let (nodes, identities) = world.scan();
    let batch = reconcile_full_scan(&index, &nodes, &identities, BUILT).unwrap();
    let names: BTreeSet<&str> = batch.upserts.iter().map(|n| n.name.as_str()).collect();
    // The SYSTEM directory and its SYSTEM child are re-pathed; the PATH_FALLBACK
    // descendants change key with their path, so they are creations and their old
    // rows deletions. `stable.txt`, `repli.txt` and `vide` are not touched.
    assert_eq!(
        names,
        BTreeSet::from(["renomme", "enfant.txt", "sous", "profond.txt"])
    );
    assert_eq!(
        batch.deletions.len(),
        2,
        "the two fallback rows of the old path"
    );
}

#[test]
fn the_reconciliation_is_deterministic() {
    let mut world = a_world();
    let mut index = Index::in_memory().unwrap();
    publish_full(&mut index, &world);
    world.file(0, "z.txt", 1, true);
    world.file(0, "a.txt", 1, false);
    let (nodes, identities) = world.scan();
    let first = format!(
        "{:?}",
        reconcile_full_scan(&index, &nodes, &identities, BUILT).unwrap()
    );
    for _ in 0..5 {
        let again = format!(
            "{:?}",
            reconcile_full_scan(&index, &nodes, &identities, BUILT).unwrap()
        );
        assert_eq!(first, again);
    }
}

#[test]
fn a_path_fallback_rename_is_a_deletion_and_a_creation_with_a_never_recycled_id() {
    let mut pair = Pair::new(a_world());
    let repli = pair
        .world
        .items
        .iter()
        .find(|i| i.name == "repli.txt")
        .unwrap()
        .uid;
    let old_id: i64 = pair
        .a
        .connection
        .query_row(
            "SELECT id FROM nodes WHERE relative_path = 'repli.txt'",
            [],
            |r| r.get(0),
        )
        .unwrap();
    let ceiling: i64 = meta(&pair.a, "next_node_id").unwrap().parse().unwrap();

    pair.step("fallback rename", |world| {
        world.item_mut(repli).name = "autre.txt".into();
    });
    assert_eq!(
        natures(&pair.a),
        vec![ChangeNature::Created, ChangeNature::Deleted]
    );
    let new_id: i64 = pair
        .a
        .connection
        .query_row(
            "SELECT id FROM nodes WHERE relative_path = 'autre.txt'",
            [],
            |r| r.get(0),
        )
        .unwrap();
    assert_ne!(new_id, old_id);
    assert!(
        new_id >= ceiling,
        "a new id comes from the monotone counter"
    );
    let gone: i64 = pair
        .a
        .connection
        .query_row("SELECT COUNT(*) FROM nodes WHERE id = ?1", [old_id], |r| {
            r.get(0)
        })
        .unwrap();
    assert_eq!(gone, 0);
}

#[test]
fn a_system_rename_move_and_rename_plus_move_keep_the_id_and_journal_by_contract() {
    let mut pair = Pair::new(a_world());
    let stable = pair
        .world
        .items
        .iter()
        .find(|i| i.name == "stable.txt")
        .unwrap()
        .uid;
    let id: i64 = pair
        .a
        .connection
        .query_row(
            "SELECT id FROM nodes WHERE relative_path = 'stable.txt'",
            [],
            |r| r.get(0),
        )
        .unwrap();

    pair.step("rename", |world| {
        world.item_mut(stable).name = "renomme.txt".into()
    });
    assert_eq!(natures(&pair.a), vec![ChangeNature::Renamed]);

    let vide = pair
        .world
        .items
        .iter()
        .find(|i| i.name == "vide")
        .unwrap()
        .uid;
    pair.step("move", |world| world.item_mut(stable).parent = Some(vide));
    assert_eq!(natures(&pair.a)[0], ChangeNature::Moved);

    pair.step("rename and move", |world| {
        let item = world.item_mut(stable);
        item.parent = Some(0);
        item.name = "final.txt".into();
    });
    let latest: Vec<ChangeNature> = natures(&pair.a).into_iter().take(2).collect();
    assert!(latest.contains(&ChangeNature::Renamed) && latest.contains(&ChangeNature::Moved));

    let same: i64 = pair
        .a
        .connection
        .query_row(
            "SELECT id FROM nodes WHERE relative_path = 'final.txt'",
            [],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(
        same, id,
        "the SYSTEM identity kept its canonical id throughout"
    );
}

#[test]
fn a_moved_directory_carries_its_whole_subtree_and_journals_only_itself() {
    let mut pair = Pair::new(a_world());
    let dossier = pair
        .world
        .items
        .iter()
        .find(|i| i.name == "dossier")
        .unwrap()
        .uid;
    let vide = pair
        .world
        .items
        .iter()
        .find(|i| i.name == "vide")
        .unwrap()
        .uid;
    pair.step("directory move", |world| {
        world.item_mut(dossier).parent = Some(vide)
    });
    // The directory itself and the fallback descendants (which change key with
    // their path); SYSTEM descendants add no event of their own.
    let moved = natures(&pair.a)
        .into_iter()
        .filter(|nature| *nature == ChangeNature::Moved)
        .count();
    assert_eq!(moved, 1);
}

#[test]
fn a_scan_that_is_not_a_well_formed_single_rooted_bijection_is_refused_before_any_write() {
    let world = a_world();
    let mut index = Index::in_memory().unwrap();
    publish_full(&mut index, &world);
    let before = node_dump(&index);
    let revision = index.identity().unwrap().revision;
    let (nodes, identities) = world.scan();

    // Two nodes, one stable key.
    let mut clash = identities.clone();
    clash[2].stable_key = clash[1].stable_key.clone();
    assert!(matches!(
        reconcile_full_scan(&index, &nodes, &clash, BUILT),
        Err(ReconcileError::IdentityCollision)
    ));
    // An identity missing.
    assert!(matches!(
        reconcile_full_scan(&index, &nodes, &identities[1..], BUILT),
        Err(ReconcileError::NotBijective)
    ));
    // An identity for a node the scan does not hold.
    let mut stray = identities.clone();
    stray[3].node_id = 9_999;
    assert!(matches!(
        reconcile_full_scan(&index, &nodes, &stray, BUILT),
        Err(ReconcileError::NotBijective)
    ));
    // Two roots, then none.
    let mut two_roots = nodes.clone();
    two_roots[1].parent_id = None;
    assert!(matches!(
        reconcile_full_scan(&index, &two_roots, &identities, BUILT),
        Err(ReconcileError::MultipleRoots)
    ));
    let mut no_root = nodes.clone();
    no_root[0].parent_id = Some(2);
    assert!(matches!(
        reconcile_full_scan(&index, &no_root, &identities, BUILT),
        Err(ReconcileError::MissingRoot)
    ));
    // A parent that was never scanned.
    let mut dangling = nodes.clone();
    dangling[3].parent_id = Some(9_999);
    assert!(matches!(
        reconcile_full_scan(&index, &dangling, &identities, BUILT),
        Err(ReconcileError::DanglingParent)
    ));

    assert_eq!(node_dump(&index), before);
    assert_eq!(index.identity().unwrap().revision, revision);
}

#[test]
fn a_scan_whose_root_is_not_the_indexed_root_is_refused_and_never_guessed() {
    let world = a_world();
    let mut index = Index::in_memory().unwrap();
    publish_full(&mut index, &world);
    let before = node_dump(&index);

    let (nodes, mut identities) = world.scan();
    identities[0].stable_key = "K-another-root".into();
    let refused = reconcile_full_scan(&index, &nodes, &identities, BUILT).expect_err("refused");
    assert!(matches!(refused, ReconcileError::RootIdentityChanged));
    assert!(
        !refused.to_string().contains("K-another-root"),
        "no key in a message"
    );

    // The stored root's key claimed by a non-root scanned node is refused too.
    let (nodes, mut identities) = world.scan();
    identities[3].stable_key = identities[0].stable_key.clone();
    identities[0].stable_key = "K-elsewhere".into();
    assert!(matches!(
        reconcile_full_scan(&index, &nodes, &identities, BUILT),
        Err(ReconcileError::RootIdentityChanged)
    ));
    assert_eq!(node_dump(&index), before);
}

#[test]
fn the_stamped_predicate_agrees_with_the_kernels_own_refusal() {
    let world = a_world();
    let mut stamped = Index::in_memory().unwrap();
    publish_full(&mut stamped, &world);
    assert!(is_identity_stamped(&stamped).unwrap());

    let mut unstamped = Index::in_memory().unwrap();
    publish_full(&mut unstamped, &world);
    unstamped
        .connection
        .execute_batch("UPDATE nodes SET stable_key = NULL, identity_provenance = NULL;")
        .unwrap();
    assert!(!is_identity_stamped(&unstamped).unwrap());

    // The kernel refuses exactly the Index the predicate calls unstamped, before
    // any write — one truth, seen from both sides.
    let batch = crate::incremental::UpdateBatch {
        root: Some(crate::incremental::RootObservation {
            modified_unix_ms: Some(1),
            online_only: false,
            reparse_point: false,
        }),
        ..Default::default()
    };
    assert!(matches!(
        unstamped.apply_update_batch(&batch),
        Err(BatchError::IndexNotStamped)
    ));
    assert!(stamped.apply_update_batch(&batch).is_ok());
}

/// Deterministic randomised rounds: after each one the reconciled Index is the
/// fully published Index. Six seeds × forty rounds × one to three operations,
/// every kind of change, both identity provenances, files and directories.
#[test]
fn randomised_rounds_of_every_change_equal_a_full_publication_each_time() {
    for seed in 1..=6_u64 {
        let mut rng = Rng::new(0x41_0000 + seed);
        let mut pair = Pair::new(a_world());
        let mut counter = 0_u32;
        let mut effective = 0;
        for round in 0..40 {
            let operations = rng.range(1, 3);
            let label = format!("seed {seed} round {round}");
            let outcome = pair.step(&label, |world| {
                for _ in 0..operations {
                    mutate(world, &mut rng, &mut counter);
                }
            });
            if outcome.applied {
                effective += 1;
            }
        }
        assert!(
            effective > 20,
            "seed {seed}: the rounds must actually change things"
        );
    }
}

fn pick(rng: &mut Rng, uids: &[u32]) -> Option<u32> {
    if uids.is_empty() {
        None
    } else {
        Some(uids[rng.range(0, uids.len() as u32 - 1) as usize])
    }
}

fn mutate(world: &mut World, rng: &mut Rng, counter: &mut u32) {
    let directories: Vec<u32> = world
        .items
        .iter()
        .filter(|i| matches!(i.kind, NodeKind::Directory | NodeKind::Root))
        .map(|i| i.uid)
        .collect();
    let non_root: Vec<u32> = world
        .items
        .iter()
        .filter(|i| i.parent.is_some())
        .map(|i| i.uid)
        .collect();
    let files: Vec<u32> = world
        .items
        .iter()
        .filter(|i| i.kind == NodeKind::File)
        .map(|i| i.uid)
        .collect();
    *counter += 1;
    let fresh = format!("n{counter}");
    match rng.range(0, 8) {
        0 | 1 => {
            let parent = pick(rng, &directories).unwrap();
            let system = rng.range(0, 1) == 0;
            if rng.range(0, 2) == 0 {
                world.dir(parent, &fresh, system);
            } else {
                world.file(parent, &fresh, u64::from(rng.range(0, 90)), system);
            }
        }
        2 => {
            if let Some(uid) = pick(rng, &files) {
                let item = world.item_mut(uid);
                item.size += 1 + u64::from(rng.range(0, 9));
                item.mtime = item.mtime.map(|m| m + 5);
            }
        }
        3 => {
            if let Some(uid) = pick(rng, &non_root) {
                world.remove_subtree(uid);
            }
        }
        4 => {
            if let Some(uid) = pick(rng, &non_root) {
                world.item_mut(uid).name = fresh;
            }
        }
        5 => {
            if let Some(uid) = pick(rng, &non_root) {
                let inside = world.subtree(uid);
                let targets: Vec<u32> = directories
                    .iter()
                    .copied()
                    .filter(|d| !inside.contains(d))
                    .collect();
                if let Some(target) = pick(rng, &targets) {
                    let item = world.item_mut(uid);
                    item.parent = Some(target);
                    item.name = fresh;
                }
            }
        }
        6 => {
            if let Some(uid) = pick(rng, &directories) {
                let item = world.item_mut(uid);
                item.mtime = item.mtime.map(|m| m + 3);
            }
        }
        _ => {
            let item = world.item_mut(0);
            item.mtime = item.mtime.map(|m| m + 1);
        }
    }
}

// ==========================================================================
// The product path: a real REAL_ROOT brain
// ==========================================================================

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
    /// A registered brain over a small synthetic tree, **not yet indexed**.
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

    /// The same, with its baseline built by the first refresh.
    fn indexed(name: &str) -> Self {
        let fixture = Self::unindexed(name);
        let first = refresh_map(&fixture.paths, &fixture.brain).expect("baseline");
        assert_eq!(first.application_mode, ApplicationMode::BaselineFull);
        fixture
    }

    fn database(&self) -> PathBuf {
        self.paths.brain_map_database(&self.brain.brain_id)
    }

    fn refresh(&self) -> MapBuildReport {
        refresh_map(&self.paths, &self.brain).expect("refresh")
    }

    fn id(&self, relative: &str) -> i64 {
        open_store(&self.paths, &self.brain)
            .unwrap()
            .resolve_path(relative)
            .unwrap()
            .unwrap_or_else(|| panic!("no node at {relative:?}"))
    }

    fn has(&self, relative: &str) -> bool {
        open_store(&self.paths, &self.brain)
            .unwrap()
            .resolve_path(relative)
            .unwrap()
            .is_some()
    }

    fn path(&self, relative: &str) -> PathBuf {
        self.root.join(relative)
    }

    fn revision(&self) -> u64 {
        open_map(&self.paths, &self.brain).unwrap().revision
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

    /// Everything a refresh may not touch when it fails, as one string.
    fn arm_full_publication_guard(&self) {
        arm_guard(&self.database());
    }

    fn refresh_guarded(&self) -> MapBuildReport {
        self.arm_full_publication_guard();
        self.refresh()
    }
}

/// Every table the Index owns, every column, in a stable order.
pub(super) fn dump_index_file(database: &Path) -> String {
    let connection =
        rusqlite::Connection::open_with_flags(database, rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY)
            .unwrap();
    let mut out = String::new();
    for table in [
        "nodes",
        "schema_meta",
        "change_events",
        "seen_change_events",
        "node_diagnostics",
    ] {
        let mut statement = match connection.prepare(&format!("SELECT * FROM {table} ORDER BY 1")) {
            Ok(statement) => statement,
            Err(_) => {
                out.push_str(&format!("[{table}: absent]\n"));
                continue;
            }
        };
        let columns = statement.column_count();
        let rows: Vec<String> = statement
            .query_map([], |row| {
                let mut cells = Vec::new();
                for column in 0..columns {
                    let value: rusqlite::types::Value = row.get(column)?;
                    cells.push(format!("{value:?}"));
                }
                Ok(cells.join("|"))
            })
            .unwrap()
            .collect::<Result<_, _>>()
            .unwrap();
        out.push_str(&format!("[{table}]\n{}\n", rows.join("\n")));
    }
    out
}

/// The structural guard: no row whose id already exists may be inserted. A full
/// publication deletes and re-inserts every row and cannot pass it; the kernel
/// inserts only ids it has just allocated.
pub(super) fn arm_guard(database: &Path) {
    rusqlite::Connection::open(database)
        .unwrap()
        .execute_batch(
            "CREATE TABLE IF NOT EXISTS full_publication_guard (id INTEGER PRIMARY KEY);
             INSERT OR IGNORE INTO full_publication_guard SELECT id FROM nodes;
             CREATE TRIGGER IF NOT EXISTS full_publication_forbidden BEFORE INSERT ON nodes
               WHEN EXISTS (SELECT 1 FROM full_publication_guard WHERE id = NEW.id)
               BEGIN SELECT RAISE(ABORT, 'full-publication-forbidden'); END;",
        )
        .unwrap();
}

fn natures_of(events: &[ChangeEvent]) -> Vec<ChangeNature> {
    events.iter().map(|event| event.nature).collect()
}

fn count_of(events: &[ChangeEvent], nature: ChangeNature) -> usize {
    events.iter().filter(|event| event.nature == nature).count()
}

/// After an incremental refresh, replace the Index wholesale with **Reconstruire**
/// and require that nothing observable changes: the incremental result *is* what
/// a full publication of the same tree produces (same ids, rows, counts,
/// journal). Leaves the brain on the rebuilt Index.
fn assert_incremental_equals_full(fixture: &Fixture, label: &str) {
    let store = open_store(&fixture.paths, &fixture.brain).unwrap();
    assert!(
        crate::hierarchy::child_count_mismatches(&store.index.connection, 10)
            .unwrap()
            .is_empty(),
        "{label}: child_count is exact"
    );
    let digest = store.reconstructible_digest().unwrap();
    drop(store);
    let table = |name: &str| -> String {
        dump_index_file(&fixture.database())
            .split("\n[")
            .find(|section| section.trim_start_matches('[').starts_with(name))
            .unwrap_or_default()
            .to_string()
    };
    let (nodes, events, seen) = (
        table("nodes]"),
        table("change_events]"),
        table("seen_change_events]"),
    );
    let counters = |fixture: &Fixture| {
        let store = open_store(&fixture.paths, &fixture.brain).unwrap();
        ["node_count", "root_id", "next_node_id"].map(|key| store.meta(key).unwrap())
    };
    let counters_before = counters(fixture);

    // **Reconstruire** is exactly what the guard forbids, so it is lifted for the
    // one explicit full replacement this comparison needs.
    rusqlite::Connection::open(fixture.database())
        .unwrap()
        .execute_batch("DROP TRIGGER IF EXISTS full_publication_forbidden;")
        .unwrap();
    let rebuilt = rebuild_map(&fixture.paths, &fixture.brain).expect("rebuild");
    assert_eq!(
        rebuilt.application_mode,
        ApplicationMode::ExplicitRebuildFull
    );
    assert_eq!(
        rebuilt.change_summary.total, 0,
        "{label}: the tree did not move"
    );
    assert_eq!(rebuilt.reconstructible_digest, digest, "{label}: digest");
    assert_eq!(
        table("nodes]"),
        nodes,
        "{label}: rows equal a full publication"
    );
    assert_eq!(table("change_events]"), events, "{label}: journal");
    assert_eq!(table("seen_change_events]"), seen, "{label}: seen state");
    assert_eq!(counters(fixture), counters_before, "{label}: counters");
}

// -- 1, 2, 19 — the mode, at every step --------------------------------------

#[test]
fn a_new_brains_first_refresh_is_a_full_baseline_and_invents_no_event() {
    let fixture = Fixture::unindexed("racine-1");
    let first = refresh_map(&fixture.paths, &fixture.brain).unwrap();
    assert_eq!(first.application_mode, ApplicationMode::BaselineFull);
    assert_eq!(first.state, "REFRESHED");
    assert!(!first.index_reused);
    assert!(first.change_summary.baseline_established);
    assert_eq!(first.change_summary.total, 0);
    assert!(fixture.events().is_empty());
}

#[test]
fn a_second_unchanged_refresh_is_incremental_a_no_op_and_keeps_the_revision() {
    let fixture = Fixture::indexed("racine-2");
    let before = fixture.dump();
    let revision = fixture.revision();
    let projection = view(&fixture.paths, &fixture.brain, None, None).unwrap();

    let second = fixture.refresh_guarded();
    assert_eq!(second.application_mode, ApplicationMode::Incremental);
    assert!(second.index_reused);
    assert!(!second.change_summary.baseline_established);
    assert_eq!(second.change_summary.total, 0);
    assert_eq!(second.revision, revision, "no artificial revision");
    assert_eq!(fixture.dump(), before, "not one row, event or key changed");
    assert_eq!(
        view(&fixture.paths, &fixture.brain, None, None).unwrap(),
        projection
    );
    assert!(fixture.events().is_empty(), "no false mass creation");
}

#[test]
fn rebuild_stays_an_explicit_full_replacement() {
    let fixture = Fixture::indexed("racine-19");
    let revision = fixture.revision();
    let rebuilt = rebuild_map(&fixture.paths, &fixture.brain).unwrap();
    assert_eq!(
        rebuilt.application_mode,
        ApplicationMode::ExplicitRebuildFull
    );
    assert_eq!(rebuilt.state, "REBUILT");
    assert!(rebuilt.rebuilt);
    assert_eq!(
        rebuilt.revision,
        revision + 1,
        "a full publication always advances"
    );
    // With no Index at all, **Reconstruire** has nothing to rebuild: it lays the
    // baseline, and says so.
    let empty = Fixture::unindexed("racine-19b");
    let baseline = rebuild_map(&empty.paths, &empty.brain).unwrap();
    assert_eq!(baseline.application_mode, ApplicationMode::BaselineFull);
}

#[test]
fn the_application_mode_serialises_as_a_closed_word_and_carries_nothing_else() {
    for (mode, word) in [
        (ApplicationMode::BaselineFull, "BASELINE_FULL"),
        (ApplicationMode::Incremental, "INCREMENTAL"),
        (
            ApplicationMode::IdentityRestampFull,
            "IDENTITY_RESTAMP_FULL",
        ),
        (
            ApplicationMode::ExplicitRebuildFull,
            "EXPLICIT_REBUILD_FULL",
        ),
    ] {
        assert_eq!(serde_json::to_string(&mode).unwrap(), format!("\"{word}\""));
    }
    let fixture = Fixture::indexed("racine-mode");
    let report = serde_json::to_value(fixture.refresh()).unwrap();
    assert_eq!(report["applicationMode"], "INCREMENTAL");
}

// -- 3..12 — what a refresh reports, and what it leaves ------------------------

#[test]
fn a_created_file_is_journalled_created_and_the_result_equals_a_full_publication() {
    let fixture = Fixture::indexed("racine-3");
    fs::write(fixture.path("nouveau.txt"), b"neuf").unwrap();
    let report = fixture.refresh_guarded();
    assert_eq!(report.application_mode, ApplicationMode::Incremental);
    assert_eq!(
        (report.change_summary.created, report.change_summary.total),
        (1, 1)
    );
    let events = fixture.events();
    assert_eq!(natures_of(&events), vec![ChangeNature::Created]);
    assert_eq!(events[0].node_id, fixture.id("nouveau.txt"));
    assert_eq!(events[0].new_relative_path.as_deref(), Some("nouveau.txt"));
    assert_incremental_equals_full(&fixture, "create");
}

#[test]
fn a_modified_file_is_journalled_modified_and_keeps_its_id() {
    let fixture = Fixture::indexed("racine-4");
    let id = fixture.id("a-modifier.txt");
    fs::write(fixture.path("a-modifier.txt"), b"apres, plus long").unwrap();
    let report = fixture.refresh_guarded();
    assert_eq!(report.application_mode, ApplicationMode::Incremental);
    assert_eq!(
        (report.change_summary.modified, report.change_summary.total),
        (1, 1)
    );
    assert_eq!(fixture.id("a-modifier.txt"), id);
    assert_eq!(natures_of(&fixture.events()), vec![ChangeNature::Modified]);
    assert_incremental_equals_full(&fixture, "modify");
}

#[test]
fn a_system_rename_keeps_the_id_and_journals_one_renamed_event() {
    let fixture = Fixture::indexed("racine-5");
    let id = fixture.id("stable.txt");
    fs::rename(fixture.path("stable.txt"), fixture.path("renomme.txt")).unwrap();
    let report = fixture.refresh_guarded();
    assert_eq!(report.application_mode, ApplicationMode::Incremental);
    assert_eq!(
        (report.change_summary.renamed, report.change_summary.total),
        (1, 1)
    );
    assert_eq!(
        fixture.id("renomme.txt"),
        id,
        "same nodeId on a same-volume rename"
    );
    assert!(!fixture.has("stable.txt"));
    assert_incremental_equals_full(&fixture, "rename");
}

#[test]
fn a_system_move_keeps_the_id_and_journals_one_moved_event() {
    let fixture = Fixture::indexed("racine-6");
    let id = fixture.id("stable.txt");
    fs::rename(fixture.path("stable.txt"), fixture.path("vide/stable.txt")).unwrap();
    let report = fixture.refresh_guarded();
    assert_eq!(
        (report.change_summary.moved, report.change_summary.total),
        (1, 1)
    );
    assert_eq!(fixture.id("vide/stable.txt"), id);
    let store = open_store(&fixture.paths, &fixture.brain).unwrap();
    assert_eq!(
        store.detail(id).unwrap().node.parent_id,
        Some(fixture.id("vide"))
    );
    drop(store);
    assert_incremental_equals_full(&fixture, "move");
}

#[test]
fn a_rename_and_a_move_of_one_file_journal_two_events() {
    let fixture = Fixture::indexed("racine-7");
    let id = fixture.id("stable.txt");
    fs::rename(fixture.path("stable.txt"), fixture.path("vide/autre.txt")).unwrap();
    let report = fixture.refresh_guarded();
    assert_eq!(
        (
            report.change_summary.renamed,
            report.change_summary.moved,
            report.change_summary.total
        ),
        (1, 1, 2)
    );
    assert_eq!(fixture.id("vide/autre.txt"), id);
    assert_incremental_equals_full(&fixture, "rename+move");
}

/// The real `PATH_FALLBACK` case, on the real product path. A directory junction
/// is a reparse point: the scanner gives it the raw-path identity, so renaming it
/// changes its key and the reconciler must send a deletion plus a creation — never
/// a rename — while the refresh stays incremental and passes the guard.
#[cfg(windows)]
#[test]
fn a_real_path_fallback_rename_is_incremental_and_a_deletion_plus_a_creation() {
    let (temp, paths) = sandbox();
    let root = temp.path().join("racine-jonction");
    let target = temp.path().join("cible-hors-racine");
    fs::create_dir_all(&root).unwrap();
    fs::create_dir_all(&target).unwrap();
    make_tree(&root);
    let status = std::process::Command::new("cmd")
        .args(["/C", "mklink", "/J"])
        .arg(root.join("lien-avant"))
        .arg(&target)
        .output()
        .expect("cmd mklink");
    assert!(status.status.success(), "mklink /J failed: {status:?}");
    let fixture = Fixture {
        _temp: temp,
        paths: paths.clone(),
        root: root.clone(),
        brain: register_real_root(&paths, &root).unwrap(),
    };
    refresh_map(&fixture.paths, &fixture.brain).unwrap();
    let old_id = fixture.id("lien-avant");

    fs::rename(root.join("lien-avant"), root.join("lien-apres")).unwrap();
    let report = fixture.refresh_guarded();
    assert_eq!(report.application_mode, ApplicationMode::Incremental);
    let summary = report.change_summary;
    assert_eq!(
        (
            summary.created,
            summary.deleted,
            summary.renamed,
            summary.moved,
            summary.total
        ),
        (1, 1, 0, 0, 2),
        "a raw-path node cannot follow a rename: {summary:?}"
    );
    assert_ne!(
        fixture.id("lien-apres"),
        old_id,
        "a new id, never a recycled one"
    );
    assert!(!fixture.has("lien-avant"));
    assert_incremental_equals_full(&fixture, "path-fallback rename");
}

#[test]
fn a_created_then_a_deleted_subtree_are_journalled_node_by_node() {
    let fixture = Fixture::indexed("racine-9");
    fs::create_dir_all(fixture.path("neuf/x")).unwrap();
    fs::write(fixture.path("neuf/x/y.txt"), b"y").unwrap();
    fs::write(fixture.path("neuf/z.txt"), b"z").unwrap();
    let created = fixture.refresh_guarded();
    assert_eq!(created.application_mode, ApplicationMode::Incremental);
    assert_eq!(
        (created.change_summary.created, created.change_summary.total),
        (4, 4)
    );
    assert_incremental_equals_full(&fixture, "subtree created");

    let ids: Vec<i64> = [
        "dossier",
        "dossier/enfant.txt",
        "dossier/sous",
        "dossier/sous/profond.txt",
    ]
    .iter()
    .map(|p| fixture.id(p))
    .collect();
    fs::remove_dir_all(fixture.path("dossier")).unwrap();
    let deleted = fixture.refresh_guarded();
    assert_eq!(deleted.application_mode, ApplicationMode::Incremental);
    assert_eq!(
        (deleted.change_summary.deleted, deleted.change_summary.total),
        (4, 4)
    );
    let events = fixture.events();
    for id in &ids {
        let event = events
            .iter()
            .find(|e| e.node_id == *id && e.nature == ChangeNature::Deleted)
            .expect("a deletion event per node");
        assert!(!event.node_present, "an id is never recycled");
    }
    assert_incremental_equals_full(&fixture, "subtree deleted");
}

#[test]
fn a_renamed_then_a_moved_directory_keep_every_descendant_coherent() {
    let fixture = Fixture::indexed("racine-10");
    let ids: Vec<(String, i64)> = [
        "dossier",
        "dossier/enfant.txt",
        "dossier/sous",
        "dossier/sous/profond.txt",
    ]
    .iter()
    .map(|p| (p.to_string(), fixture.id(p)))
    .collect();

    fs::rename(fixture.path("dossier"), fixture.path("renomme")).unwrap();
    let renamed = fixture.refresh_guarded();
    assert_eq!(renamed.application_mode, ApplicationMode::Incremental);
    assert_eq!(
        (renamed.change_summary.renamed, renamed.change_summary.total),
        (1, 1),
        "only the directory is an event; its descendants are re-pathed silently"
    );
    for (old, id) in &ids {
        let now = old.replacen("dossier", "renomme", 1);
        assert_eq!(fixture.id(&now), *id, "{old} kept its id");
    }
    assert_incremental_equals_full(&fixture, "directory rename");

    fs::rename(fixture.path("renomme"), fixture.path("vide/renomme")).unwrap();
    let moved = fixture.refresh_guarded();
    assert_eq!(
        (moved.change_summary.moved, moved.change_summary.total),
        (1, 1)
    );
    for (old, id) in &ids {
        let now = old.replacen("dossier", "vide/renomme", 1);
        assert_eq!(fixture.id(&now), *id);
    }
    let store = open_store(&fixture.paths, &fixture.brain).unwrap();
    assert_eq!(
        store.detail(fixture.id("vide/renomme")).unwrap().node.depth,
        2
    );
    assert_eq!(
        store
            .detail(fixture.id("vide/renomme/sous/profond.txt"))
            .unwrap()
            .node
            .depth,
        4
    );
    drop(store);
    assert_incremental_equals_full(&fixture, "directory move");
}

#[test]
fn a_mixed_batch_has_exact_counters_and_equals_a_full_publication() {
    let fixture = Fixture::indexed("racine-11");
    fs::write(fixture.path("nouveau.txt"), b"neuf").unwrap();
    fs::write(fixture.path("a-modifier.txt"), b"apres, plus long").unwrap();
    fs::remove_file(fixture.path("a-supprimer.txt")).unwrap();
    fs::rename(fixture.path("stable.txt"), fixture.path("renomme.txt")).unwrap();
    fs::rename(
        fixture.path("dossier/enfant.txt"),
        fixture.path("vide/enfant.txt"),
    )
    .unwrap();

    let report = fixture.refresh_guarded();
    assert_eq!(report.application_mode, ApplicationMode::Incremental);
    let summary = report.change_summary;
    assert_eq!(
        (
            summary.created,
            summary.modified,
            summary.deleted,
            summary.renamed,
            summary.moved,
            summary.total
        ),
        (1, 1, 1, 1, 1, 5)
    );
    let events = fixture.events();
    assert_eq!(count_of(&events, ChangeNature::Created), 1);
    assert_incremental_equals_full(&fixture, "mixed");
}

/// `DEC-0039` §6, stated rather than masked. A folder's own timestamp moves when
/// an entry is created and removed inside it, and it *is* a stored column, so the
/// refresh is effective and the revision advances; but the change journal does
/// not count a directory's date as a modification (`TASK-0037`), so the summary
/// stays at zero. Both facts are on purpose, and both are asserted.
#[test]
fn a_folders_own_timestamp_advances_the_revision_but_journals_nothing() {
    let fixture = Fixture::indexed("racine-horodatage");
    let revision = fixture.revision();
    let before = fixture.dump();
    fs::write(fixture.path("vide/passager.txt"), b"x").unwrap();
    fs::remove_file(fixture.path("vide/passager.txt")).unwrap();

    let report = fixture.refresh_guarded();
    assert_eq!(report.application_mode, ApplicationMode::Incremental);
    assert_eq!(
        report.change_summary.total, 0,
        "no event: a folder's date is not a change"
    );
    assert_eq!(
        report.revision,
        revision + 1,
        "but a stored column moved, so the refresh was effective"
    );
    assert_ne!(fixture.dump(), before);
    assert!(fixture.events().is_empty());
    // The next unchanged refresh is a true no-op again.
    let quiet = fixture.refresh_guarded();
    assert_eq!(quiet.revision, revision + 1);
    assert_eq!(quiet.change_summary.total, 0);
}

#[test]
fn child_count_stays_exact_through_a_run_of_incremental_refreshes() {
    let fixture = Fixture::indexed("racine-12");
    let exact = |label: &str| {
        let store = open_store(&fixture.paths, &fixture.brain).unwrap();
        assert!(
            crate::hierarchy::child_count_mismatches(&store.index.connection, 10)
                .unwrap()
                .is_empty(),
            "{label}"
        );
        assert_eq!(
            store.count().unwrap() as i64,
            store
                .index
                .connection
                .query_row("SELECT COUNT(*) FROM nodes", [], |r| r.get::<_, i64>(0))
                .unwrap(),
            "{label}: node_count"
        );
    };
    fs::write(fixture.path("dossier/sous/a.txt"), b"a").unwrap();
    fs::write(fixture.path("dossier/sous/b.txt"), b"b").unwrap();
    fixture.refresh_guarded();
    exact("two children added");
    fs::remove_file(fixture.path("dossier/sous/profond.txt")).unwrap();
    fs::rename(
        fixture.path("dossier/sous/a.txt"),
        fixture.path("vide/a.txt"),
    )
    .unwrap();
    fixture.refresh_guarded();
    exact("one removed, one moved out");
    fs::remove_dir_all(fixture.path("dossier/sous")).unwrap();
    fixture.refresh_guarded();
    exact("a directory removed");
}

// -- 13..17 — journal, seen state, filters, cursors ---------------------------

fn filter_matches(fixture: &Fixture, state: StateFilter) -> BTreeSet<String> {
    let filter = NodeFilter {
        state,
        kinds: vec![],
        availability: AvailabilityFilter::All,
    };
    let snapshot =
        view_with_filter(&fixture.paths, &fixture.brain, None, None, Some(&filter)).unwrap();
    let projection = snapshot.filtered.expect("an active filter");
    assert!(
        projection.filter_next_cursor.is_none(),
        "one page is enough here"
    );
    let store = open_store(&fixture.paths, &fixture.brain).unwrap();
    let by_id: HashMap<i64, String> = store
        .analysis_nodes()
        .unwrap()
        .into_iter()
        .map(|n| (n.id, n.relative_path))
        .collect();
    assert_eq!(
        projection.filtered_total as usize,
        projection.filter_match_ids.len()
    );
    projection
        .filter_match_ids
        .iter()
        .map(|id| by_id[id].clone())
        .collect()
}

#[test]
fn new_and_unseen_filters_and_the_seen_state_follow_the_refresh_exactly() {
    let fixture = Fixture::indexed("racine-13");
    assert!(filter_matches(&fixture, StateFilter::New).is_empty());

    fs::write(fixture.path("nouveau.txt"), b"neuf").unwrap();
    fs::write(fixture.path("a-modifier.txt"), b"apres, plus long").unwrap();
    fixture.refresh_guarded();
    assert_eq!(
        filter_matches(&fixture, StateFilter::New),
        BTreeSet::from(["nouveau.txt".to_string()])
    );
    assert_eq!(
        filter_matches(&fixture, StateFilter::Unseen),
        BTreeSet::from(["nouveau.txt".to_string(), "a-modifier.txt".to_string()])
    );
    let earlier = fixture.events();
    assert_eq!(earlier.len(), 2);
    assert!(earlier.iter().all(|e| !e.seen));

    // The person acknowledges everything…
    mark_all_changes_seen(&fixture.paths, &fixture.brain).unwrap();
    assert!(filter_matches(&fixture, StateFilter::Unseen).is_empty());

    // …then the tree moves again: only the new events are unseen, the earlier
    // journal is intact and still acknowledged.
    fs::write(fixture.path("a-modifier.txt"), b"encore un changement").unwrap();
    fs::remove_file(fixture.path("a-supprimer.txt")).unwrap();
    fixture.refresh_guarded();
    assert!(
        filter_matches(&fixture, StateFilter::New).is_empty(),
        "an acknowledged creation is no longer new"
    );
    assert_eq!(
        filter_matches(&fixture, StateFilter::Unseen),
        BTreeSet::from(["a-modifier.txt".to_string()]),
        "a deleted node is not selectable"
    );
    let now = fixture.events();
    assert_eq!(now.len(), 4);
    for old in &earlier {
        let kept = now
            .iter()
            .find(|e| e.event_id == old.event_id)
            .expect("kept");
        assert_eq!(kept.nature, old.nature);
        assert_eq!(kept.node_id, old.node_id);
        assert!(kept.seen, "an earlier acknowledgement is left alone");
    }
    assert_eq!(now.iter().filter(|e| !e.seen).count(), 2);
    assert_incremental_equals_full(&fixture, "seen state");
}

#[test]
fn a_no_op_keeps_the_revision_and_every_revision_bound_cursor_and_a_change_stales_them() {
    let fixture = Fixture::indexed("racine-16");
    let root = BrainNodeRef::new(
        &fixture.brain.brain_id,
        open_store(&fixture.paths, &fixture.brain)
            .unwrap()
            .root_id()
            .unwrap(),
    );
    let page = node_children(&fixture.paths, &fixture.brain, &root, None, 1).unwrap();
    let cursor = page
        .next_cursor
        .expect("several children under a page of one");
    let revision = page.index_revision;

    let noop = fixture.refresh_guarded();
    assert_eq!(noop.revision, revision);
    node_children(&fixture.paths, &fixture.brain, &root, Some(&cursor), 1)
        .expect("a no-op leaves the cursor valid");

    fs::write(fixture.path("nouveau.txt"), b"neuf").unwrap();
    let changed = fixture.refresh_guarded();
    assert_eq!(changed.revision, revision + 1, "exactly one new revision");
    assert!(
        node_children(&fixture.paths, &fixture.brain, &root, Some(&cursor), 1).is_err(),
        "an effective refresh invalidates the revision-bound cursor"
    );
}

// -- 18 — legacy Indexes ----------------------------------------------------------

#[test]
fn a_v3_index_is_restamped_in_full_once_then_refreshes_incrementally() {
    let fixture = Fixture::indexed("racine-18a");
    downgrade_to_schema_v3(&fixture.database());
    open_map(&fixture.paths, &fixture.brain).expect("the product migrates v3");

    let restamp = fixture.refresh();
    assert_eq!(
        restamp.application_mode,
        ApplicationMode::IdentityRestampFull
    );
    assert!(restamp.change_summary.baseline_established);
    assert!(
        is_identity_stamped(&open_store(&fixture.paths, &fixture.brain).unwrap().index).unwrap()
    );

    fs::write(fixture.path("nouveau.txt"), b"neuf").unwrap();
    let next = fixture.refresh_guarded();
    assert_eq!(next.application_mode, ApplicationMode::Incremental);
    assert_eq!(next.change_summary.created, 1);
    assert_incremental_equals_full(&fixture, "after restamp");
}

#[test]
fn a_v5_index_migrates_to_v6_and_refreshes_incrementally_with_its_history() {
    let fixture = Fixture::indexed("racine-18b");
    fs::write(fixture.path("nouveau.txt"), b"neuf").unwrap();
    fixture.refresh();
    let history = fixture.events();
    assert_eq!(history.len(), 1);
    downgrade_to_schema_v5(&fixture.database());

    fs::write(fixture.path("a-modifier.txt"), b"apres, plus long").unwrap();
    let report = fixture.refresh();
    assert_eq!(
        report.application_mode,
        ApplicationMode::Incremental,
        "a v5 file is already stamped: no restamp is needed"
    );
    let now = fixture.events();
    assert_eq!(now.len(), 2);
    assert!(now.iter().any(|e| e.event_id == history[0].event_id));
}

#[test]
fn a_current_index_whose_rows_lost_their_stamps_is_restamped_like_a_v3_one() {
    let fixture = Fixture::indexed("racine-18c");
    rusqlite::Connection::open(fixture.database())
        .unwrap()
        .execute_batch("UPDATE nodes SET stable_key = NULL, identity_provenance = NULL;")
        .unwrap();
    let restamp = fixture.refresh();
    assert_eq!(
        restamp.application_mode,
        ApplicationMode::IdentityRestampFull
    );
    assert_eq!(
        fixture.refresh().application_mode,
        ApplicationMode::Incremental
    );
}

#[test]
fn the_restamp_can_never_be_reached_from_a_stamped_and_bound_index() {
    let fixture = Fixture::indexed("racine-18d");
    for round in 0..3 {
        fs::write(fixture.path(&format!("f{round}.txt")), b"x").unwrap();
        let report = fixture.refresh_guarded();
        assert_eq!(report.application_mode, ApplicationMode::Incremental);
    }
}

// -- 20..22 — safety: nothing is half written and nothing falls back ---------------

#[test]
fn a_cancelled_scan_writes_nothing() {
    let fixture = Fixture::indexed("racine-21a");
    fs::write(fixture.path("nouveau.txt"), b"neuf").unwrap();
    let before = fixture.dump();
    let error = publish_map(&fixture.paths, &fixture.brain, Gesture::Refresh, || true)
        .expect_err("cancelled");
    assert!(error.to_string().contains("scan_cancelled"));
    assert_eq!(fixture.dump(), before);
}

#[test]
fn a_source_that_is_gone_writes_nothing_and_a_return_refreshes_incrementally() {
    let fixture = Fixture::indexed("racine-21b");
    let before = fixture.dump();
    let held = fixture.root.with_file_name("racine-21b-held");
    fs::rename(&fixture.root, &held).unwrap();
    let error = refresh_map(&fixture.paths, &fixture.brain).expect_err("no source");
    assert!(error.to_string().starts_with("map_scan_failed"));
    assert_eq!(fixture.dump(), before);
    fs::rename(&held, &fixture.root).unwrap();
    assert_eq!(
        fixture.refresh_guarded().application_mode,
        ApplicationMode::Incremental
    );
}

#[test]
fn an_error_after_the_scan_and_before_the_apply_leaves_the_old_index() {
    let fixture = Fixture::indexed("racine-21c");
    // The stored root stops being the root the scan reads: the reconciler refuses,
    // *after* a successful scan and *before* the kernel is called.
    rusqlite::Connection::open(fixture.database())
        .unwrap()
        .execute_batch(
            "UPDATE nodes SET stable_key = 'K-tampered'
              WHERE id = (SELECT value FROM schema_meta WHERE key = 'root_id');",
        )
        .unwrap();
    fs::write(fixture.path("nouveau.txt"), b"neuf").unwrap();
    let before = fixture.dump();

    let error = refresh_map(&fixture.paths, &fixture.brain).expect_err("refused");
    assert!(
        error
            .to_string()
            .starts_with("map_refresh_reconcile_refused"),
        "{error}"
    );
    assert!(!error.to_string().contains("K-tampered"));
    assert_eq!(
        fixture.dump(),
        before,
        "corpus, journal, revision: untouched"
    );
    assert!(!fixture.has("nouveau.txt"));
}

#[test]
fn an_injected_sql_failure_during_the_apply_rolls_everything_back_and_never_rebuilds() {
    for (trigger, expected) in [
        (
            "CREATE TRIGGER inject BEFORE INSERT ON nodes WHEN NEW.name = 'nouveau.txt'
             BEGIN SELECT RAISE(ABORT, 'injected-insert'); END;",
            "injected-insert",
        ),
        (
            "CREATE TRIGGER inject BEFORE UPDATE OF size_bytes ON nodes
             BEGIN SELECT RAISE(ABORT, 'injected-update'); END;",
            "injected-update",
        ),
        (
            "CREATE TRIGGER inject BEFORE DELETE ON nodes
             BEGIN SELECT RAISE(ABORT, 'injected-delete'); END;",
            "injected-delete",
        ),
        (
            "CREATE TRIGGER inject BEFORE INSERT ON change_events
             BEGIN SELECT RAISE(ABORT, 'injected-journal'); END;",
            "injected-journal",
        ),
        (
            "CREATE TRIGGER inject BEFORE INSERT ON schema_meta WHEN NEW.key = 'index_revision'
             BEGIN SELECT RAISE(ABORT, 'injected-revision'); END;",
            "injected-revision",
        ),
    ] {
        let fixture = Fixture::indexed("racine-22");
        let index_id = open_map(&fixture.paths, &fixture.brain).unwrap().index_id;
        fs::write(fixture.path("nouveau.txt"), b"neuf").unwrap();
        fs::write(fixture.path("a-modifier.txt"), b"apres, plus long").unwrap();
        fs::remove_file(fixture.path("a-supprimer.txt")).unwrap();
        fixture.arm_full_publication_guard();
        let before = fixture.dump();
        let revision = fixture.revision();

        let connection = rusqlite::Connection::open(fixture.database()).unwrap();
        connection.execute_batch(trigger).unwrap();
        let error = refresh_map(&fixture.paths, &fixture.brain).expect_err("the failure surfaces");
        assert!(error.to_string().contains(expected), "{expected}: {error}");
        assert!(
            !error.to_string().contains("full-publication-forbidden"),
            "{expected}: no full publication was even attempted"
        );
        assert_eq!(fixture.dump(), before, "{expected}: exact rollback");
        assert_eq!(fixture.revision(), revision);
        assert_eq!(
            open_map(&fixture.paths, &fixture.brain).unwrap().index_id,
            index_id
        );

        // The failure was the trigger's: without it the very same refresh applies,
        // once, incrementally, with the exact summary.
        connection.execute_batch("DROP TRIGGER inject;").unwrap();
        let report = refresh_map(&fixture.paths, &fixture.brain).expect("now it applies");
        assert_eq!(report.application_mode, ApplicationMode::Incremental);
        assert_eq!(
            report.revision,
            revision + 1,
            "{expected}: one revision, no more"
        );
        assert_eq!(
            (
                report.change_summary.created,
                report.change_summary.modified,
                report.change_summary.deleted,
                report.change_summary.total
            ),
            (1, 1, 1, 3)
        );
    }
}

// -- G — the proof that a stamped refresh never goes through the full path --------

#[test]
fn the_guard_really_stops_a_full_publication() {
    let fixture = Fixture::indexed("racine-g1");
    fixture.arm_full_publication_guard();
    let before = fixture.dump();

    // **Reconstruire** deletes and re-inserts every row: it cannot pass the guard.
    let error = rebuild_map(&fixture.paths, &fixture.brain).expect_err("blocked");
    assert!(
        error.to_string().contains("full-publication-forbidden"),
        "{error}"
    );
    assert_eq!(fixture.dump(), before);

    // And neither can a direct call of the full publication primitive.
    let (nodes, identities) = {
        let scan = crate::scanner::scan_tree(&fixture.root).unwrap();
        (scan.nodes, scan.identities)
    };
    let mut store = BrainIndex::open_existing(&fixture.database(), true).unwrap();
    let direct = store.index.publish_with_identity(
        &nodes,
        &identities,
        &[("built_unix_ms", "1".into())],
        &[],
    );
    assert!(direct.is_err());
    drop(store);
    assert_eq!(fixture.dump(), before);
}

#[test]
fn a_stamped_refresh_passes_the_guard_that_a_full_publication_cannot() {
    let fixture = Fixture::indexed("racine-g2");
    for round in 0..4 {
        match round {
            0 => fs::write(fixture.path("nouveau.txt"), b"neuf").unwrap(),
            1 => fs::write(fixture.path("a-modifier.txt"), b"apres, plus long").unwrap(),
            2 => fs::remove_file(fixture.path("a-supprimer.txt")).unwrap(),
            _ => fs::rename(fixture.path("stable.txt"), fixture.path("vide/stable.txt")).unwrap(),
        }
        let report = fixture.refresh_guarded();
        assert_eq!(
            report.application_mode,
            ApplicationMode::Incremental,
            "round {round}"
        );
        assert_eq!(report.change_summary.total, 1, "round {round}");
    }
}

/// A complement, never the proof: the incremental arm of the product names the
/// kernel's entry point and none of the full-publication ones.
#[test]
fn the_incremental_entry_point_does_not_mention_a_full_publication() {
    let source = include_str!("brain_index.rs").replace('\r', "");
    let start = source
        .find("pub fn refresh_incrementally")
        .expect("the entry point");
    let body = &source[start
        ..source[start..]
            .find("\n    }\n")
            .map(|e| start + e)
            .unwrap()];
    for forbidden in [
        "publish",
        "replace_with_identity",
        "replace_nodes",
        "DELETE FROM nodes",
    ] {
        assert!(
            !body.contains(forbidden),
            "refresh_incrementally mentions {forbidden}"
        );
    }
    assert!(body.contains("apply_update_batch") && body.contains("reconcile_full_scan"));

    let commands = include_str!("commands.rs").replace('\r', "");
    let arm = commands
        .split("ApplicationMode::Incremental => {")
        .nth(1)
        .and_then(|rest| rest.split("ApplicationMode::BaselineFull").next())
        .expect("the incremental arm");
    assert!(arm.contains("refresh_incrementally") && !arm.contains("replace_with_identity"));
}

// -- 23, 24 — isolation and leakage ---------------------------------------------------

#[test]
fn two_brains_refresh_in_isolation() {
    let (temp, paths) = sandbox();
    let root_a = temp.path().join("racine-a");
    let root_b = temp.path().join("racine-b");
    for root in [&root_a, &root_b] {
        fs::create_dir_all(root).unwrap();
        make_tree(root);
    }
    let a = register_real_root(&paths, &root_a).unwrap();
    let b = register_real_root(&paths, &root_b).unwrap();
    refresh_map(&paths, &a).unwrap();
    refresh_map(&paths, &b).unwrap();
    let b_before = dump_index_file(&paths.brain_map_database(&b.brain_id));
    let b_revision = open_map(&paths, &b).unwrap().revision;

    fs::write(root_a.join("nouveau.txt"), b"neuf").unwrap();
    let report = refresh_map(&paths, &a).unwrap();
    assert_eq!(report.application_mode, ApplicationMode::Incremental);
    assert_eq!(report.change_summary.created, 1);

    assert_eq!(
        dump_index_file(&paths.brain_map_database(&b.brain_id)),
        b_before
    );
    assert_eq!(open_map(&paths, &b).unwrap().revision, b_revision);
    let journal_b = change_journal(&paths, &b, &[], None, 50).unwrap();
    assert_eq!(journal_b.total, 0, "brain B never saw brain A's event");

    // B's own refresh is unaffected and equally incremental.
    fs::write(root_b.join("autre.txt"), b"autre").unwrap();
    let report_b = refresh_map(&paths, &b).unwrap();
    assert_eq!(report_b.application_mode, ApplicationMode::Incremental);
    assert_eq!(report_b.change_summary.created, 1);
    assert_eq!(change_journal(&paths, &a, &[], None, 50).unwrap().total, 1);
}

#[test]
fn nothing_absolute_no_stable_key_and_no_file_identity_reaches_a_report_or_a_page() {
    let fixture = Fixture::indexed("racine-24");
    fs::write(fixture.path("nouveau.txt"), b"neuf").unwrap();
    fs::rename(fixture.path("stable.txt"), fixture.path("vide/stable.txt")).unwrap();
    let report = fixture.refresh_guarded();

    let mut surface = serde_json::to_string(&report).unwrap();
    surface.push_str(&serde_json::to_string(&fixture.events()).unwrap());
    surface.push_str(
        &serde_json::to_string(&view(&fixture.paths, &fixture.brain, None, None).unwrap()).unwrap(),
    );
    let filter = NodeFilter {
        state: StateFilter::Unseen,
        kinds: vec![],
        availability: AvailabilityFilter::All,
    };
    surface.push_str(
        &serde_json::to_string(
            &view_with_filter(&fixture.paths, &fixture.brain, None, None, Some(&filter)).unwrap(),
        )
        .unwrap(),
    );

    let root = fixture.root.to_string_lossy().to_string();
    for needle in [
        root.as_str(),
        &root.replace('\\', "\\\\"),
        &root.replace('\\', "/"),
        "SYS1:",
        "PFv1:",
    ] {
        assert!(!surface.contains(needle), "the surface leaks {needle:?}");
    }
    let connection = rusqlite::Connection::open(fixture.database()).unwrap();
    let mut statement = connection.prepare("SELECT stable_key FROM nodes").unwrap();
    for key in statement
        .query_map([], |r| r.get::<_, String>(0))
        .unwrap()
        .map(Result::unwrap)
    {
        assert!(!surface.contains(&key), "a stable key leaks");
    }
}

// -- Metadata --------------------------------------------------------------------------

#[test]
fn an_incremental_refresh_leaves_the_brain_metadata_and_diagnostics_as_a_publication_wrote_them() {
    let fixture = Fixture::indexed("racine-meta");
    let read = |key: &str| {
        open_store(&fixture.paths, &fixture.brain)
            .unwrap()
            .meta(key)
            .unwrap()
    };
    let keys = [
        "brain_id",
        "source_kind",
        "source_ref",
        "fixture_id",
        "label",
        "layout_algorithm",
        "build_complete",
        "projection_contract",
        "built_unix_ms",
    ];
    let before: Vec<Option<String>> = keys.iter().map(|k| read(k)).collect();

    fs::write(fixture.path("nouveau.txt"), b"neuf").unwrap();
    let report = fixture.refresh_guarded();
    assert_eq!(report.application_mode, ApplicationMode::Incremental);
    let after: Vec<Option<String>> = keys.iter().map(|k| read(k)).collect();
    assert_eq!(before, after, "the kernel does not rewrite brain metadata");
    assert_eq!(report.layout_algorithm, read("layout_algorithm").unwrap());
    assert_eq!(read("build_complete").as_deref(), Some("1"));
    assert_eq!(read("projection_contract").as_deref(), Some("DEC-0031"));
    // A product-published Index never carries a diagnostic: an incomplete scan is
    // refused before publication, so there is none to go stale.
    assert!(report.diagnostics.is_empty());
    let store = open_store(&fixture.paths, &fixture.brain).unwrap();
    let diagnostics: i64 = store
        .index
        .connection
        .query_row("SELECT COUNT(*) FROM node_diagnostics", [], |r| r.get(0))
        .unwrap();
    assert_eq!(diagnostics, 0);
}

#[test]
fn a_source_is_never_modified_by_any_refresh() {
    let fixture = Fixture::indexed("racine-ro");
    let inventory = |root: &Path| -> Vec<(String, u64)> {
        let mut found = Vec::new();
        let mut stack = vec![root.to_path_buf()];
        while let Some(dir) = stack.pop() {
            for entry in fs::read_dir(&dir).unwrap() {
                let entry = entry.unwrap();
                let meta = entry.metadata().unwrap();
                found.push((
                    entry
                        .path()
                        .strip_prefix(root)
                        .unwrap()
                        .to_string_lossy()
                        .to_string(),
                    meta.len(),
                ));
                if meta.is_dir() {
                    stack.push(entry.path());
                }
            }
        }
        found.sort();
        found
    };
    fs::write(fixture.path("nouveau.txt"), b"neuf").unwrap();
    let before = inventory(&fixture.root);
    fixture.refresh_guarded();
    fixture.refresh_guarded();
    assert_eq!(inventory(&fixture.root), before);
}
