//! `TASK-0043` E — `W-B`, the targeted reconciliation, proven on the code the watcher
//! runs (`watch_ops::apply_scopes` → `crate::scope` → `Index::apply_update_batch`).
//!
//! **The reference is always a full scan.** After every mutation, the Index that
//! received only a scope's batch must equal the Index a brand-new brain builds from the
//! same tree in a second, independent sandbox: same paths, same kinds, sizes, dates,
//! depths, `child_count`, and — because the tree is on a real Windows volume — the same
//! stable keys and provenances. A twin fixture that took a manual **Actualiser** instead
//! is compared for the **journal**, which is where `CREATED`/`MOVED`/`RENAMED` live.
//!
//! **The proof that `W-B` never replaces the corpus is a guard that fails**, the same one
//! `TASK-0041` uses: a trigger refuses to insert any row whose id already exists, so a
//! full publication cannot pass.
//!
//! Every tree is built by the test that reads it, under a `tempfile` directory, from
//! synthetic names. **No personal folder, no real data.**

use super::refresh_incremental_tests::{arm_guard, dump_index_file};
use super::{open_map, open_store, refresh_map, register_real_root};
use crate::map::Rng;
use crate::map::brains::BrainRecord;
use crate::map::sandbox::SandboxPaths;
use crate::map::watch_ops::{self, Escalation, ScopedFailure};
use crate::scope::ScopeRequest;
use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};

pub(crate) type Dump = BTreeMap<String, String>;

/// One row per node, keyed by relative path, everything but the canonical id — an id is
/// a property of the Index, not of the tree, and a fresh brain allocates its own.
pub(crate) fn dump_rows(paths: &SandboxPaths, brain: &BrainRecord, with_keys: bool) -> Dump {
    let store = open_store(paths, brain).expect("open");
    let mut statement = store
        .index
        .connection
        .prepare(
            "SELECT n.relative_path, n.kind, n.depth, n.size_bytes, n.modified_unix_ms,
                    n.online_only, n.reparse_point, n.child_count, n.stable_key,
                    n.identity_provenance, p.relative_path
               FROM nodes n LEFT JOIN nodes p ON p.id = n.parent_id
              ORDER BY n.relative_path",
        )
        .unwrap();
    statement
        .query_map([], |row| {
            let path: String = row.get(0)?;
            let key: Option<String> = row.get(8)?;
            let provenance: Option<String> = row.get(9)?;
            let cells = format!(
                "kind={} depth={} size={} mtime={:?} online={} reparse={} children={} parent={:?}{}",
                row.get::<_, String>(1)?,
                row.get::<_, i64>(2)?,
                row.get::<_, i64>(3)?,
                row.get::<_, Option<i64>>(4)?,
                row.get::<_, bool>(5)?,
                row.get::<_, bool>(6)?,
                row.get::<_, i64>(7)?,
                row.get::<_, Option<String>>(10)?,
                if with_keys {
                    format!(" key={key:?} prov={provenance:?}")
                } else {
                    String::new()
                }
            );
            Ok((path, cells))
        })
        .unwrap()
        .collect::<Result<_, _>>()
        .unwrap()
}

/// The journal as a sorted multiset of `(nature, kind, old path, new path)` — ids,
/// revisions and dates are the Index's own and are not part of "what changed".
pub(crate) fn journal_of(paths: &SandboxPaths, brain: &BrainRecord) -> Vec<String> {
    let store = open_store(paths, brain).expect("open");
    let mut statement = store
        .index
        .connection
        .prepare(
            "SELECT nature, node_kind, old_relative_path, new_relative_path FROM change_events",
        )
        .unwrap();
    let mut rows: Vec<String> = statement
        .query_map([], |row| {
            Ok(format!(
                "{} {} {:?} -> {:?}",
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, Option<String>>(2)?,
                row.get::<_, Option<String>>(3)?
            ))
        })
        .unwrap()
        .collect::<Result<_, _>>()
        .unwrap();
    rows.sort();
    rows
}

/// The full-scan reference for a tree: a **new** brain over the same root, in a
/// **second sandbox**, indexed from nothing.
pub(crate) fn reference_rows(root: &Path, with_keys: bool) -> Dump {
    let temp = tempfile::tempdir().unwrap();
    let paths = SandboxPaths::under(temp.path().join("filetopo-reference"));
    let brain = register_real_root(&paths, root).expect("reference brain");
    refresh_map(&paths, &brain).expect("reference baseline");
    dump_rows(&paths, &brain, with_keys)
}

/// A readable difference between two dumps, or `None` when they are equal.
pub(crate) fn diff(left: &Dump, right: &Dump) -> Option<String> {
    if left == right {
        return None;
    }
    let mut out = String::new();
    for (path, row) in left {
        match right.get(path) {
            None => out.push_str(&format!("only in index: {path} [{row}]\n")),
            Some(other) if other != row => {
                out.push_str(&format!(
                    "differs: {path}\n  index: {row}\n  scan:  {other}\n"
                ));
            }
            Some(_) => {}
        }
    }
    for (path, row) in right {
        if !left.contains_key(path) {
            out.push_str(&format!("only in scan: {path} [{row}]\n"));
        }
    }
    Some(out)
}

pub(crate) struct Fx {
    pub _temp: tempfile::TempDir,
    pub paths: SandboxPaths,
    pub root: PathBuf,
    pub brain: BrainRecord,
}

pub(crate) fn make_tree(root: &Path) {
    // A large, unrelated branch...
    for group in 0..10 {
        let dir = root.join("big").join(format!("g{group}"));
        fs::create_dir_all(&dir).unwrap();
        for file in 0..30 {
            fs::write(dir.join(format!("f{file}.txt")), b"grand").unwrap();
        }
    }
    // ...and a small one, deep.
    fs::create_dir_all(root.join("small/deep")).unwrap();
    fs::write(root.join("small/deep/leaf.txt"), b"feuille").unwrap();
    fs::write(root.join("small/deep/other.txt"), b"autre").unwrap();
    fs::write(root.join("small/side.txt"), b"cote").unwrap();
    fs::create_dir_all(root.join("alpha/sub")).unwrap();
    fs::write(root.join("alpha/a1.txt"), b"a1").unwrap();
    fs::write(root.join("alpha/sub/x.txt"), b"x").unwrap();
    fs::create_dir_all(root.join("beta")).unwrap();
    fs::write(root.join("top.txt"), b"haut").unwrap();
}

impl Fx {
    pub(crate) fn new(name: &str) -> Self {
        let temp = tempfile::tempdir().unwrap();
        let paths = SandboxPaths::under(temp.path().join("filetopo-state"));
        let root = temp.path().join(name);
        fs::create_dir_all(&root).unwrap();
        make_tree(&root);
        let brain = register_real_root(&paths, &root).expect("registered");
        refresh_map(&paths, &brain).expect("baseline");
        Self {
            _temp: temp,
            paths,
            root,
            brain,
        }
    }

    pub(crate) fn path(&self, relative: &str) -> PathBuf {
        self.root.join(relative)
    }

    pub(crate) fn database(&self) -> PathBuf {
        self.paths.brain_map_database(&self.brain.brain_id)
    }

    pub(crate) fn revision(&self) -> u64 {
        open_map(&self.paths, &self.brain).unwrap().revision
    }

    pub(crate) fn id(&self, relative: &str) -> i64 {
        open_store(&self.paths, &self.brain)
            .unwrap()
            .resolve_path(relative)
            .unwrap()
            .unwrap_or_else(|| panic!("no node at {relative:?}"))
    }

    pub(crate) fn has(&self, relative: &str) -> bool {
        open_store(&self.paths, &self.brain)
            .unwrap()
            .resolve_path(relative)
            .unwrap()
            .is_some()
    }

    pub(crate) fn rows(&self) -> Dump {
        dump_rows(&self.paths, &self.brain, true)
    }

    /// `W-B` on these candidate directories, with the product's bound.
    pub(crate) fn scoped(
        &self,
        candidates: &[&str],
    ) -> Result<watch_ops::ScopedApplied, ScopedFailure> {
        self.scoped_bounded(candidates, 20_000)
    }

    pub(crate) fn scoped_bounded(
        &self,
        candidates: &[&str],
        max_nodes: usize,
    ) -> Result<watch_ops::ScopedApplied, ScopedFailure> {
        let requests: Vec<ScopeRequest> = candidates
            .iter()
            .map(|c| ScopeRequest::List((*c).to_string()))
            .collect();
        self.requested(&requests, max_nodes)
    }

    /// `W-B` on explicit requests: directories to re-list, entries to observe alone.
    pub(crate) fn requested(
        &self,
        requests: &[ScopeRequest],
        max_nodes: usize,
    ) -> Result<watch_ops::ScopedApplied, ScopedFailure> {
        watch_ops::apply_scopes(&self.paths, &self.brain, requests, max_nodes, &|| false)
    }

    /// The Index equals a full scan of the tree as it is now.
    pub(crate) fn assert_parity(&self, label: &str) {
        if let Some(difference) = diff(&self.rows(), &reference_rows(&self.root, true)) {
            panic!("{label}: the Index differs from a full scan\n{difference}");
        }
        let store = open_store(&self.paths, &self.brain).unwrap();
        assert!(
            crate::hierarchy::child_count_mismatches(&store.index.connection, 10)
                .unwrap()
                .is_empty(),
            "{label}: child_count is exact"
        );
    }

    pub(crate) fn arm_guard(&self) {
        arm_guard(&self.database());
    }

    pub(crate) fn journal(&self) -> Vec<String> {
        journal_of(&self.paths, &self.brain)
    }

    /// Leaves the Index as a schema-3 file: migrated but never stamped with durable
    /// identities — what only the person's **Actualiser** may repair.
    pub(crate) fn downgrade_to_v3(&self) {
        super::stable_identity_tests::downgrade_to_schema_v3(&self.database());
    }

    pub(crate) fn dump_file(&self) -> String {
        dump_index_file(&self.database())
    }
}

// ==========================================================================
// What a scope reads — and what it does not
// ==========================================================================

/// The whole point of `W-B` over a full scan: a change deep in a small branch does not
/// enumerate the large unrelated branch next to it.
#[test]
fn a_deep_change_does_not_enumerate_the_large_sibling() {
    let fx = Fx::new("racine-sibling");
    fs::write(
        fx.path("small/deep/leaf.txt"),
        b"feuille modifiee, plus longue",
    )
    .unwrap();
    let total = fx.rows().len();
    assert!(
        total > 300,
        "the tree has a large unrelated branch: {total}"
    );

    let applied = fx.scoped(&["small/deep"]).expect("targeted");
    // Exactly one directory was opened: the scope itself.
    assert_eq!(applied.listed, 1, "only `small/deep` is listed");
    // The scope directory and its two entries: never the 300+ files of `big`.
    assert_eq!(applied.counts.observed, 3, "{:?}", applied.counts);
    assert!(applied.applied, "the modified size is a real change");
    assert_eq!(
        applied.counts.upserts, 1,
        "only the modified file is rewritten"
    );
    assert_eq!(applied.counts.deletions, 0);
    fx.assert_parity("deep modification");
}

#[test]
fn a_sibling_directory_that_is_where_the_index_has_it_is_not_entered() {
    let fx = Fx::new("racine-not-entered");
    // A change directly in `alpha`: its child directory `alpha/sub` is unchanged and
    // exactly where the Index has it, so it must not be opened.
    fs::write(fx.path("alpha/a2.txt"), b"neuf").unwrap();
    let applied = fx.scoped(&["alpha"]).expect("targeted");
    assert_eq!(applied.listed, 1, "`alpha/sub` was not entered");
    assert_eq!(
        applied.counts.upserts, 2,
        "the new file and the scope's own date"
    );
    fx.assert_parity("new file beside an unchanged directory");
}

#[test]
fn a_new_directory_is_entered_and_its_whole_subtree_is_created() {
    let fx = Fx::new("racine-new-tree");
    fs::create_dir_all(fx.path("alpha/nouveau/profond")).unwrap();
    fs::write(fx.path("alpha/nouveau/n.txt"), b"n").unwrap();
    fs::write(fx.path("alpha/nouveau/profond/p.txt"), b"p").unwrap();
    fx.arm_guard();
    // The hints of a real creation name every level; they collapse onto one scope
    // because the deeper ones are not (yet) safe directories of the Index.
    let applied = fx
        .scoped(&["alpha", "alpha/nouveau", "alpha/nouveau/profond"])
        .expect("targeted");
    assert_eq!(
        applied.counts.scopes, 1,
        "three hints, one scope: {:?}",
        applied.counts
    );
    fx.assert_parity("a created subtree");
    assert_eq!(
        fx.journal()
            .iter()
            .filter(|line| line.starts_with("CREATED"))
            .count(),
        4,
        "{:#?}",
        fx.journal()
    );
}

// ==========================================================================
// Parity with a full scan, and with a manual Actualiser
// ==========================================================================

#[test]
fn creating_modifying_and_deleting_files_through_scopes_equals_a_full_scan() {
    let fx = Fx::new("racine-basics");
    fx.arm_guard();
    let before = fx.revision();

    fs::write(fx.path("alpha/cree.txt"), b"cree").unwrap();
    fs::write(fx.path("alpha/a1.txt"), b"a1 plus long").unwrap();
    fs::remove_file(fx.path("alpha/sub/x.txt")).unwrap();
    let applied = fx.scoped(&["alpha", "alpha/sub"]).expect("targeted");

    assert!(applied.applied);
    assert_eq!(applied.revision, before + 1, "one batch, one revision");
    fx.assert_parity("create + modify + delete");
    let journal = fx.journal();
    let count = |nature: &str| journal.iter().filter(|l| l.starts_with(nature)).count();
    // Baseline established no events; these are the only ones.
    assert_eq!(count("CREATED"), 1, "{journal:#?}");
    assert_eq!(count("MODIFIED"), 1, "{journal:#?}");
    assert_eq!(count("DELETED"), 1, "{journal:#?}");
}

#[test]
fn a_scope_with_nothing_to_report_is_a_no_op_with_no_event_and_no_revision() {
    let fx = Fx::new("racine-noop");
    let before = fx.revision();
    let journal_before = fx.journal();
    let applied = fx.scoped(&["small/deep"]).expect("targeted");
    assert!(!applied.applied);
    assert_eq!(applied.revision, before);
    assert_eq!(fx.revision(), before);
    assert_eq!(fx.journal(), journal_before);
    fx.assert_parity("no-op");
}

/// A dump without dates or keys: two twin trees created at different instants differ
/// in both, and neither is what "the same change" means.
fn coarse(paths: &SandboxPaths, brain: &BrainRecord) -> Dump {
    dump_rows(paths, brain, false)
        .into_iter()
        .map(|(path, row)| {
            let kept: Vec<&str> = row
                .split(' ')
                .filter(|cell| !cell.starts_with("mtime="))
                .collect();
            (path, kept.join(" "))
        })
        .collect()
}

#[test]
fn a_rename_and_a_move_keep_their_ids_and_journal_exactly_as_an_actualiser_would() {
    // Twin trees: one reconciled by scopes, one by the manual Actualiser.
    let scoped = Fx::new("racine-twin-a");
    let manual = Fx::new("racine-twin-b");
    for fx in [&scoped, &manual] {
        fs::rename(fx.path("alpha/a1.txt"), fx.path("alpha/a1-renomme.txt")).unwrap();
        fs::rename(fx.path("small/side.txt"), fx.path("alpha/side.txt")).unwrap();
        // Renamed **and** moved.
        fs::rename(
            fx.path("small/deep/other.txt"),
            fx.path("beta/autre-deplace-renomme.txt"),
        )
        .unwrap();
    }
    let ids = ["alpha/a1.txt", "small/side.txt", "small/deep/other.txt"].map(|p| scoped.id(p));
    scoped.arm_guard();
    // The hints of those operations: old and new names, hence these parents.
    scoped
        .scoped(&["alpha", "small", "small/deep", "beta"])
        .expect("targeted");
    refresh_map(&manual.paths, &manual.brain).expect("manual");

    assert_eq!(
        [
            scoped.id("alpha/a1-renomme.txt"),
            scoped.id("alpha/side.txt"),
            scoped.id("beta/autre-deplace-renomme.txt")
        ],
        ids,
        "the canonical ids survive a rename and a move"
    );
    assert_eq!(scoped.journal(), manual.journal());
    let journal = scoped.journal();
    assert!(
        journal.iter().any(|l| l.starts_with("RENAMED")),
        "{journal:#?}"
    );
    assert!(
        journal.iter().any(|l| l.starts_with("MOVED")),
        "{journal:#?}"
    );
    assert!(
        !journal.iter().any(|l| l.starts_with("DELETED")),
        "{journal:#?}"
    );
    assert_eq!(
        diff(
            &coarse(&scoped.paths, &scoped.brain),
            &coarse(&manual.paths, &manual.brain)
        ),
        None
    );
    scoped.assert_parity("twin, scoped side");
}

#[test]
fn a_rename_inside_one_scope_is_a_rename_and_not_a_delete_plus_a_create() {
    let fx = Fx::new("racine-rename");
    let id = fx.id("alpha/a1.txt");
    fs::rename(fx.path("alpha/a1.txt"), fx.path("alpha/a1-bis.txt")).unwrap();
    fx.arm_guard();
    fx.scoped(&["alpha"]).expect("targeted");
    assert_eq!(fx.id("alpha/a1-bis.txt"), id, "same object, same id");
    assert!(!fx.has("alpha/a1.txt"));
    let journal = fx.journal();
    assert!(
        journal.iter().any(|line| line.starts_with("RENAMED")),
        "{journal:#?}"
    );
    assert!(!journal.iter().any(|line| line.starts_with("DELETED")));
    assert!(!journal.iter().any(|line| line.starts_with("CREATED")));
    fx.assert_parity("rename");
}

/// A move between two directories: two scopes, one batch, and the moved object keeps
/// its id — it is neither deleted in one scope nor created in the other.
#[test]
fn a_move_between_two_scopes_is_one_atomic_batch_and_keeps_the_id() {
    let fx = Fx::new("racine-cross");
    let id = fx.id("alpha/sub/x.txt");
    let before = fx.revision();
    fs::rename(fx.path("alpha/sub/x.txt"), fx.path("small/deep/x.txt")).unwrap();
    fx.arm_guard();
    let applied = fx.scoped(&["alpha/sub", "small/deep"]).expect("targeted");
    assert_eq!(applied.counts.scopes, 2);
    assert_eq!(applied.revision, before + 1, "two scopes, one atomic batch");
    assert_eq!(fx.id("small/deep/x.txt"), id);
    let journal = fx.journal();
    assert!(
        journal.iter().any(|l| l.starts_with("MOVED")),
        "{journal:#?}"
    );
    assert!(!journal.iter().any(|l| l.starts_with("DELETED")));
    fx.assert_parity("move between scopes");
}

#[test]
fn a_directory_renamed_and_a_directory_moved_bring_every_descendant_along() {
    let fx = Fx::new("racine-dirs");
    let ids: Vec<i64> = ["alpha/sub", "alpha/sub/x.txt"]
        .iter()
        .map(|p| fx.id(p))
        .collect();
    // Renamed in place...
    fs::rename(fx.path("alpha/sub"), fx.path("alpha/sub-renomme")).unwrap();
    fx.arm_guard();
    fx.scoped(&["alpha"]).expect("rename");
    assert_eq!(fx.id("alpha/sub-renomme"), ids[0]);
    assert_eq!(fx.id("alpha/sub-renomme/x.txt"), ids[1]);
    assert!(!fx.has("alpha/sub/x.txt"), "no stale path survives");
    fx.assert_parity("directory rename");

    // ...then moved to another directory.
    fs::rename(fx.path("alpha/sub-renomme"), fx.path("small/sub-renomme")).unwrap();
    fx.scoped(&["alpha", "small"]).expect("move");
    assert_eq!(fx.id("small/sub-renomme"), ids[0]);
    assert_eq!(fx.id("small/sub-renomme/x.txt"), ids[1]);
    fx.assert_parity("directory move");
}

#[test]
fn several_disjoint_scopes_are_merged_into_one_atomic_batch() {
    let fx = Fx::new("racine-disjoint");
    let before = fx.revision();
    fs::write(fx.path("alpha/one.txt"), b"1").unwrap();
    fs::write(fx.path("small/two.txt"), b"2").unwrap();
    fs::write(fx.path("beta/three.txt"), b"3").unwrap();
    fs::remove_file(fx.path("small/deep/other.txt")).unwrap();
    let applied = fx
        .scoped(&["alpha", "small", "beta", "small/deep"])
        .expect("targeted");
    assert_eq!(applied.counts.scopes, 4);
    assert_eq!(applied.revision, before + 1, "one revision for four scopes");
    fx.assert_parity("disjoint scopes");
}

// ==========================================================================
// An entry observed alone
// ==========================================================================

#[test]
fn an_entry_that_only_moved_is_observed_alone_without_listing_anything() {
    let fx = Fx::new("racine-point");
    let before = fx.revision();
    // A top-level file modified: its parent is the root, and nothing about the root's list
    // of entries is in doubt.
    fs::write(fx.path("top.txt"), b"haut, modifie et plus long").unwrap();
    let applied = fx
        .requested(&[ScopeRequest::Point("top.txt".into())], 20_000)
        .expect("a point");
    assert_eq!(applied.listed, 0, "nothing was listed");
    assert_eq!(applied.counts.observed, 1);
    assert_eq!(applied.counts.upserts, 1);
    assert_eq!(applied.revision, before + 1);
    fx.assert_parity("a modified top-level file");

    // A directory observed alone: its own row moves, its entries are not read.
    fs::write(fx.path("alpha/pas-encore-lu.txt"), b"x").unwrap();
    let applied = fx
        .requested(&[ScopeRequest::Point("alpha".into())], 20_000)
        .expect("a point on a directory");
    assert_eq!(applied.listed, 0);
    assert!(!fx.has("alpha/pas-encore-lu.txt"), "a point never lists");
    // The listing it did not do is a separate request, and completes the picture.
    fx.scoped(&["alpha"]).expect("list");
    assert!(fx.has("alpha/pas-encore-lu.txt"));
    fx.assert_parity("a directory observed alone, then listed");
}

#[test]
fn an_entry_that_is_no_longer_where_the_index_has_it_becomes_a_question_about_its_parent() {
    let fx = Fx::new("racine-point-vanished");
    fs::remove_file(fx.path("alpha/a1.txt")).unwrap();
    // "Only this entry moved" is false: it is gone. The point rises to the directory that
    // lists it, and that directory is re-listed.
    let applied = fx
        .requested(&[ScopeRequest::Point("alpha/a1.txt".into())], 20_000)
        .expect("rises");
    assert_eq!(applied.listed, 1);
    assert!(!fx.has("alpha/a1.txt"));
    fx.assert_parity("a point that vanished");

    // A top-level entry that vanished has the root as its parent: a full verification.
    fs::remove_file(fx.path("top.txt")).unwrap();
    assert_eq!(
        fx.requested(&[ScopeRequest::Point("top.txt".into())], 20_000)
            .expect_err("root"),
        ScopedFailure::Escalate(Escalation::RootScope)
    );
}

// ==========================================================================
// When the scope is not safe
// ==========================================================================

#[test]
fn a_removed_directory_rises_to_the_nearest_existing_parent() {
    let fx = Fx::new("racine-removed");
    fs::remove_dir_all(fx.path("small/deep")).unwrap();
    // The hints of the removal name entries *inside* the vanished directory.
    let applied = fx
        .scoped(&["small/deep", "small/deep/deeper"])
        .expect("targeted");
    assert_eq!(applied.counts.scopes, 1, "both rise to `small`");
    assert_eq!(applied.listed, 1);
    assert!(!fx.has("small/deep"));
    assert!(!fx.has("small/deep/leaf.txt"), "its subtree went with it");
    let journal = fx.journal();
    assert_eq!(
        journal.iter().filter(|l| l.starts_with("DELETED")).count(),
        3,
        "the directory and its two files: {journal:#?}"
    );
    fx.assert_parity("removed directory");
}

#[test]
fn a_hint_whose_parent_is_the_root_is_a_root_scope_and_is_refused() {
    let fx = Fx::new("racine-root-scope");
    fs::write(fx.path("neuf-au-sommet.txt"), b"x").unwrap();
    let before = fx.dump_file();
    assert_eq!(
        fx.scoped(&[""]).expect_err("root scope"),
        ScopedFailure::Escalate(Escalation::RootScope)
    );
    // A directory the Index does not know rises all the way to the root, too.
    assert_eq!(
        fx.scoped(&["inconnu/jamais/vu"])
            .expect_err("rises to the root"),
        ScopedFailure::Escalate(Escalation::RootScope)
    );
    assert_eq!(fx.dump_file(), before, "a refused scope writes nothing");
}

#[test]
fn a_scope_larger_than_the_bound_is_refused_and_writes_nothing() {
    let fx = Fx::new("racine-too-large");
    fs::create_dir_all(fx.path("alpha/enorme")).unwrap();
    for index in 0..40 {
        fs::write(fx.path(&format!("alpha/enorme/f{index}.txt")), b"z").unwrap();
    }
    let before = fx.dump_file();
    assert_eq!(
        fx.scoped_bounded(&["alpha"], 10).expect_err("too large"),
        ScopedFailure::Escalate(Escalation::TooLarge)
    );
    assert_eq!(fx.dump_file(), before);
    // With room, the same scope is fine.
    fx.scoped(&["alpha"]).expect("within the bound");
    fx.assert_parity("after a refused, then an accepted scope");
}

#[test]
fn a_replaced_scope_directory_is_not_trusted_and_rises() {
    let fx = Fx::new("racine-replaced-dir");
    // `alpha/sub` is replaced by a different directory of the same name: its identity
    // is no longer the stored one, so it is not a safe scope and the hint rises.
    fs::remove_dir_all(fx.path("alpha/sub")).unwrap();
    fs::create_dir(fx.path("alpha/sub")).unwrap();
    fs::write(fx.path("alpha/sub/y.txt"), b"y").unwrap();
    let applied = fx.scoped(&["alpha/sub"]).expect("rises to `alpha`");
    assert_eq!(applied.counts.scopes, 1);
    assert!(fx.has("alpha/sub/y.txt"));
    assert!(!fx.has("alpha/sub/x.txt"));
    fx.assert_parity("a replaced directory");
}

#[test]
fn an_index_that_is_not_stamped_is_left_to_the_manual_actualiser() {
    let fx = Fx::new("racine-legacy");
    super::stable_identity_tests::downgrade_to_schema_v3(&fx.database());
    let before = fx.dump_file();
    fs::write(fx.path("alpha/nouveau.txt"), b"x").unwrap();
    assert_eq!(
        fx.scoped(&["alpha"]).expect_err("not stamped"),
        ScopedFailure::NeedsManualRefresh
    );
    assert_eq!(
        fx.dump_file(),
        before,
        "the watcher never migrates or restamps"
    );
}

#[test]
fn a_missing_root_is_left_to_the_full_verification_and_deletes_nothing() {
    let fx = Fx::new("racine-absente");
    let moved = fx._temp.path().join("racine-deplacee");
    fs::rename(&fx.root, &moved).unwrap();
    let before = fx.dump_file();
    assert_eq!(
        fx.scoped(&["small/deep"]).expect_err("root missing"),
        ScopedFailure::Escalate(Escalation::RootUnreadable)
    );
    assert_eq!(fx.dump_file(), before);
    fs::rename(&moved, &fx.root).unwrap();
}

// ==========================================================================
// PATH_FALLBACK: a junction is a reparse point, keyed by its path
// ==========================================================================

#[cfg(windows)]
#[test]
fn a_path_fallback_rename_through_a_scope_is_a_deletion_and_a_creation() {
    let fx = Fx::new("racine-junction");
    let target = fx._temp.path().join("cible-hors-racine");
    fs::create_dir_all(&target).unwrap();
    let status = std::process::Command::new("cmd")
        .args(["/C", "mklink", "/J"])
        // Backslashes only: `cmd` reads a `/` as an option.
        .arg(fx.root.join("alpha").join("lien-avant"))
        .arg(&target)
        .output()
        .expect("cmd mklink");
    assert!(status.status.success(), "mklink /J failed: {status:?}");
    refresh_map(&fx.paths, &fx.brain).expect("index the junction");
    let old_id = fx.id("alpha/lien-avant");

    fs::rename(fx.path("alpha/lien-avant"), fx.path("alpha/lien-apres")).unwrap();
    fx.arm_guard();
    fx.scoped(&["alpha"]).expect("targeted");

    assert_ne!(
        fx.id("alpha/lien-apres"),
        old_id,
        "a raw-path node cannot follow a rename"
    );
    assert!(!fx.has("alpha/lien-avant"));
    let all = fx.journal();
    assert!(all.iter().any(|l| l.starts_with("DELETED")), "{all:#?}");
    assert!(all.iter().any(|l| l.starts_with("CREATED")), "{all:#?}");
    assert!(!all.iter().any(|l| l.starts_with("RENAMED")), "{all:#?}");
    fx.assert_parity("path-fallback rename");
}

// ==========================================================================
// Randomised: many rounds, always equal to a full scan
// ==========================================================================

/// Applies one random mutation to the tree and returns the directories a real watcher's
/// hints would name — the parent of every entry that was created, removed or moved, old
/// name and new name alike.
fn mutate(root: &Path, rng: &mut Rng, counter: &mut u32) -> Vec<String> {
    fn all_dirs(root: &Path, current: &Path, out: &mut Vec<String>) {
        let Ok(read) = fs::read_dir(current) else {
            return;
        };
        for entry in read.flatten() {
            if entry.file_type().map(|t| t.is_dir()).unwrap_or(false) {
                let relative = entry
                    .path()
                    .strip_prefix(root)
                    .unwrap()
                    .to_string_lossy()
                    .replace('\\', "/");
                out.push(relative);
                all_dirs(root, &entry.path(), out);
            }
        }
    }
    fn all_files(root: &Path, current: &Path, out: &mut Vec<String>) {
        let Ok(read) = fs::read_dir(current) else {
            return;
        };
        for entry in read.flatten() {
            let relative = entry
                .path()
                .strip_prefix(root)
                .unwrap()
                .to_string_lossy()
                .replace('\\', "/");
            match entry.file_type() {
                Ok(t) if t.is_dir() => all_files(root, &entry.path(), out),
                Ok(_) => out.push(relative),
                Err(_) => {}
            }
        }
    }
    let mut dirs = Vec::new();
    all_dirs(root, root, &mut dirs);
    dirs.retain(|dir| dir.contains('/')); // never a top-level directory: those are root scopes
    dirs.sort();
    let mut files = Vec::new();
    all_files(root, root, &mut files);
    files.retain(|file| file.contains('/'));
    files.sort();
    let parent = |path: &str| path.rsplit_once('/').map_or("", |(p, _)| p).to_string();
    *counter += 1;
    let n = *counter;
    let pick = |rng: &mut Rng, list: &[String]| -> Option<String> {
        if list.is_empty() {
            None
        } else {
            Some(list[rng.range(0, list.len() as u32 - 1) as usize].clone())
        }
    };
    match rng.range(0, 7) {
        0 => {
            let Some(dir) = pick(rng, &dirs) else {
                return vec![];
            };
            fs::write(root.join(format!("{dir}/n{n}.txt")), format!("neuf {n}")).unwrap();
            vec![dir]
        }
        1 => {
            let Some(file) = pick(rng, &files) else {
                return vec![];
            };
            fs::write(
                root.join(&file),
                format!("modifie {n} {}", "x".repeat(n as usize)),
            )
            .unwrap();
            vec![parent(&file)]
        }
        2 => {
            let Some(file) = pick(rng, &files) else {
                return vec![];
            };
            fs::remove_file(root.join(&file)).unwrap();
            vec![parent(&file)]
        }
        3 => {
            let Some(file) = pick(rng, &files) else {
                return vec![];
            };
            let new = format!("{}/r{n}.txt", parent(&file));
            fs::rename(root.join(&file), root.join(&new)).unwrap();
            vec![parent(&file)]
        }
        4 => {
            let (Some(file), Some(dir)) = (pick(rng, &files), pick(rng, &dirs)) else {
                return vec![];
            };
            let new = format!("{dir}/m{n}.txt");
            fs::rename(root.join(&file), root.join(&new)).unwrap();
            vec![parent(&file), dir]
        }
        5 => {
            let Some(dir) = pick(rng, &dirs) else {
                return vec![];
            };
            let new = format!("{dir}/d{n}");
            fs::create_dir_all(root.join(&new).join("inner")).unwrap();
            fs::write(root.join(&new).join("inner/i.txt"), b"i").unwrap();
            vec![dir, new.clone(), format!("{new}/inner")]
        }
        6 => {
            // Rename or move a directory (never into itself).
            let (Some(from), Some(into)) = (pick(rng, &dirs), pick(rng, &dirs)) else {
                return vec![];
            };
            if into == from || into.starts_with(&format!("{from}/")) {
                return vec![];
            }
            let new = format!("{into}/mv{n}");
            fs::rename(root.join(&from), root.join(&new)).unwrap();
            vec![parent(&from), into, from]
        }
        _ => {
            let Some(dir) = pick(rng, &dirs) else {
                return vec![];
            };
            // Never remove a top-level branch wholesale; remove a nested directory.
            fs::remove_dir_all(root.join(&dir)).unwrap();
            vec![parent(&dir), dir]
        }
    }
}

#[test]
fn many_random_rounds_of_scopes_always_equal_a_full_scan() {
    for seed in [20_260_924_u64, 7, 4242] {
        let fx = Fx::new(&format!("racine-alea-{seed}"));
        fx.arm_guard();
        let mut rng = Rng::new(seed);
        let mut counter = 0u32;
        let (mut targeted, mut escalated) = (0u32, 0u32);
        for round in 0..30 {
            let mut hinted: Vec<String> = Vec::new();
            for _ in 0..rng.range(1, 3) {
                hinted.extend(mutate(&fx.root, &mut rng, &mut counter));
            }
            hinted.sort();
            hinted.dedup();
            let candidates: Vec<&str> = hinted.iter().map(String::as_str).collect();
            match fx.scoped(&candidates) {
                Ok(_) => targeted += 1,
                Err(ScopedFailure::Escalate(_)) => {
                    // What the watcher does: a full verification, never a guess.
                    escalated += 1;
                    fx.arm_guard();
                    refresh_map(&fx.paths, &fx.brain).expect("full verification");
                }
                Err(other) => panic!("seed {seed} round {round}: {other:?}"),
            }
            fx.assert_parity(&format!("seed {seed} round {round}"));
        }
        assert!(
            targeted > escalated,
            "seed {seed}: {targeted} targeted, {escalated} escalated"
        );
    }
}
